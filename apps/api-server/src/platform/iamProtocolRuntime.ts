import { AsyncLocalStorage } from 'async_hooks';
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
  randomUUID,
  scryptSync,
  sign,
  timingSafeEqual,
  verify,
} from 'crypto';
import { existsSync } from 'fs';
import {
  getPersistedStatePath,
  readPersistedStateSnapshot,
} from './persistence';
import {
  createPersistedAsyncIamStateRepository,
  createPersistedIamStateRepository,
  createProjectedAsyncIamStateRepository,
  createProjectedIamStateRepository,
  type IamAsyncStateRepository,
  type IamStateRepository,
} from './iamStateRepository';
import { createDynamoDocumentClient } from './dynamo/ddbClient';
import { resolveRuntimeTableName } from './dynamo/runtimeTables';
import { getRuntimeRepositoryMode } from './dynamo/runtimeRepositoryMode';
import { DynamoDbTokenRepository } from './dynamo/repositories/dynamoDbTokenRepository';
import { DualRunAsyncIssuedTokenStoreAdapter } from './dynamo/runtimeAdapters/dualRunAsyncIssuedTokenStoreAdapter';
import { DynamoAsyncIssuedTokenStoreAdapter } from './dynamo/runtimeAdapters/dynamoAsyncIssuedTokenStoreAdapter';
import { LegacyAsyncIssuedTokenStoreAdapter } from './dynamo/runtimeAdapters/legacyAsyncIssuedTokenStoreAdapter';
import { NoopAsyncIssuedTokenStoreAdapter } from './dynamo/runtimeAdapters/noopAsyncRuntimeAdapters';
import { LocalIamSessionIndexStore } from './iamSessionIndex';
import { LocalIamTokenOwnershipIndexStore } from './iamTokenOwnershipIndex';
import { LocalIamFoundationStore, type IamGroupRecord, type IamRoleRecord, type IamUserRecord } from './iamFoundation';
import { LocalIamUserProfileStore, type IamUserProfileAttributeGovernance } from './iamUserProfiles';
import { LocalSecretStore } from './secretStore';
import {
  resolveFederatedClaimOverrideForUser,
  type IamFederationClaimReleaseTarget,
} from './iamFederationClaimGovernance';
import {
  listCompatibilityIamCredentialEnvEntries,
  readCompatibilityBootstrapPassword,
  readCompatibilitySyntheticClientSecret,
} from './legacyEnvironment';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const deferredPersistenceContext = new AsyncLocalStorage<{ dirty: boolean }>();
const signingPrivateKeyCache = new Map<string, ReturnType<typeof createPrivateKey>>();
const signingPublicKeyCache = new Map<string, ReturnType<typeof createPublicKey>>();

function nowIso(): string {
  return new Date().toISOString();
}

interface IamListPagination {
  limit?: number | null;
  offset?: number | null;
}

interface IamListPaginationResult<T> {
  data: T[];
  limit: number;
  offset: number;
  count: number;
  has_more: boolean;
}

const DEFAULT_LIST_LIMIT = 200;
const MAX_LIST_LIMIT = 1000;

function normalizeListPagination(input: IamListPagination | undefined): { limit: number; offset: number } {
  const limit = Math.max(1, Math.min(
    Number.parseInt(String(input?.limit ?? `${DEFAULT_LIST_LIMIT}`), 10) || DEFAULT_LIST_LIMIT,
    MAX_LIST_LIMIT,
  ));
  const offset = Math.max(0, Number.parseInt(String(input?.offset ?? '0'), 10) || 0);
  return { limit, offset };
}

function paginateList<T>(items: T[], pagination?: IamListPagination): IamListPaginationResult<T> {
  if (pagination === undefined) {
    return {
      limit: items.length,
      offset: 0,
      data: items,
      count: items.length,
      has_more: false,
    };
  }

  const { limit, offset } = normalizeListPagination(pagination);
  const start = Math.min(offset, items.length);
  const end = Math.min(start + limit, items.length);
  return {
    limit,
    offset,
    data: items.slice(start, end),
    count: items.length,
    has_more: end < items.length,
  };
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

function nextUniqueId(label: string, existingIds: Set<string>, fallbackPrefix: string): string {
  const base = slugify(label) || `${fallbackPrefix}-${randomUUID().slice(0, 8)}`;
  if (!existingIds.has(base)) {
    return base;
  }

  let suffix = 2;
  while (existingIds.has(`${base}-${suffix}`)) {
    suffix += 1;
  }

  return `${base}-${suffix}`;
}

function envKeyToken(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const IAM_SECRET_HASH_VERSION = 'scrypt-v1';
const IAM_SECRET_HASH_KEY_LENGTH = 64;
const syntheticSecretHashVerificationCache = new Map<string, string>();

function hashSecret(value: string): string {
  const salt = randomBytes(16);
  const derivedKey = scryptSync(value, salt, IAM_SECRET_HASH_KEY_LENGTH);
  return `${IAM_SECRET_HASH_VERSION}$${salt.toString('base64url')}$${derivedKey.toString('base64url')}`;
}

function verifyLegacySha256Secret(storedHash: string, suppliedValue: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(storedHash)) {
    return false;
  }
  const suppliedHash = createHash('sha256').update(suppliedValue).digest('hex');
  return timingSafeEqual(Buffer.from(storedHash.toLowerCase(), 'utf8'), Buffer.from(suppliedHash, 'utf8'));
}

function verifySecretHash(storedHash: string, suppliedValue: string): { valid: boolean; legacy: boolean } {
  const [version, saltEncoded, digestEncoded] = storedHash.split('$');
  if (
    version === IAM_SECRET_HASH_VERSION
    && typeof saltEncoded === 'string'
    && saltEncoded.length > 0
    && typeof digestEncoded === 'string'
    && digestEncoded.length > 0
  ) {
    try {
      const salt = Buffer.from(saltEncoded, 'base64url');
      const expectedDigest = Buffer.from(digestEncoded, 'base64url');
      const suppliedDigest = scryptSync(suppliedValue, salt, expectedDigest.length);
      return {
        valid: timingSafeEqual(expectedDigest, suppliedDigest),
        legacy: false,
      };
    } catch {
      return { valid: false, legacy: false };
    }
  }

  return {
    valid: verifyLegacySha256Secret(storedHash, suppliedValue),
    legacy: true,
  };
}

function hashTokenFingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function encodeBase64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeBase64Url(input: string): Buffer {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, 'base64');
}

function matchesRegisteredRedirectUri(registeredUri: string, redirectUri: string): boolean {
  const normalizedRegistered = registeredUri.trim();
  const normalizedRedirect = redirectUri.trim();
  if (!normalizedRegistered || !normalizedRedirect) {
    return false;
  }
  if (!normalizedRegistered.includes('*')) {
    return normalizedRegistered === normalizedRedirect;
  }
  const escaped = normalizedRegistered
    .split('*')
    .map((segment) => segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${escaped}$`).test(normalizedRedirect);
}

export type IamClientProtocol = 'OIDC' | 'SAML';
export type IamClientAccessType = 'PUBLIC' | 'CONFIDENTIAL' | 'BEARER_ONLY';
export type IamClientStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED';
export type IamClientScopeStatus = 'ACTIVE' | 'ARCHIVED';
export type IamMapperStatus = 'ACTIVE' | 'DISABLED';
export type IamMapperSourceKind =
  | 'USER_PROPERTY'
  | 'USERNAME'
  | 'SUBJECT_ID'
  | 'REALM_ROLE_NAMES'
  | 'GROUP_NAMES'
  | 'STATIC_VALUE'
  | 'CLIENT_ID'
  | 'SERVICE_ACCOUNT';
export type IamTokenGrantType =
  | 'authorization_code'
  | 'client_credentials'
  | 'password'
  | 'refresh_token'
  | 'urn:ietf:params:oauth:grant-type:device_code'
  | 'urn:openid:params:grant-type:ciba'
  | 'urn:ietf:params:oauth:grant-type:uma-ticket'
  | 'urn:ietf:params:oauth:grant-type:token-exchange';
export type IamSubjectKind = 'USER' | 'SERVICE_ACCOUNT';
export type IamTokenStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';
export type IamScopeAssignmentType = 'DEFAULT' | 'OPTIONAL';
export type IamKeyStatus = 'ACTIVE' | 'RETIRED';
export type IamSamlBinding = 'POST' | 'REDIRECT';
export type IamSamlAuthRequestStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
export type IamSamlSessionStatus = 'ACTIVE' | 'TERMINATED' | 'EXPIRED';
type IamClaimReleaseTarget = 'ACCESS_TOKEN' | 'ID_TOKEN' | 'USERINFO' | 'PROTOCOL';

const LEGACY_IAM_PROTOCOL_RUNTIME_FILE = 'iam-protocol-runtime-state.json';
const IAM_PROTOCOL_DIRECTORY_FILE = 'iam-protocol-directory-state.json';
const IAM_PROTOCOL_TRANSIENT_FILE = 'iam-protocol-transient-state.json';
const BUILTIN_USER_PROPERTY_GOVERNANCE: Record<string, IamUserProfileAttributeGovernance> = {
  email: {
    privacy_classification: 'INTERNAL',
    release_purposes: ['profile', 'directory', 'operations', 'education_support', 'administration'],
    consent_required: false,
    minimization_posture: 'STANDARD',
  },
  first_name: {
    privacy_classification: 'INTERNAL',
    release_purposes: ['profile', 'directory', 'operations', 'education_support', 'administration'],
    consent_required: false,
    minimization_posture: 'STANDARD',
  },
  last_name: {
    privacy_classification: 'INTERNAL',
    release_purposes: ['profile', 'directory', 'operations', 'education_support', 'administration'],
    consent_required: false,
    minimization_posture: 'STANDARD',
  },
};

interface StoredIamClient {
  id: string;
  realm_id: string;
  client_id: string;
  name: string;
  summary: string;
  protocol: IamClientProtocol;
  access_type: IamClientAccessType;
  status: IamClientStatus;
  synthetic: boolean;
  redirect_uris: string[];
  base_url: string | null;
  root_url: string | null;
  default_scope_ids: string[];
  optional_scope_ids: string[];
  direct_protocol_mapper_ids: string[];
  standard_flow_enabled: boolean;
  direct_access_grants_enabled: boolean;
  service_account_enabled: boolean;
  secret_hash: string | null;
  secret_preview: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamClientRecord {
  id: string;
  realm_id: string;
  client_id: string;
  name: string;
  summary: string;
  protocol: IamClientProtocol;
  access_type: IamClientAccessType;
  status: IamClientStatus;
  synthetic: boolean;
  redirect_uris: string[];
  base_url: string | null;
  root_url: string | null;
  default_scope_ids: string[];
  optional_scope_ids: string[];
  direct_protocol_mapper_ids: string[];
  standard_flow_enabled: boolean;
  direct_access_grants_enabled: boolean;
  service_account_enabled: boolean;
  secret_preview: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamClientSecretResponse {
  client: IamClientRecord;
  issued_client_secret: string | null;
}

export interface IamClientScopeRecord {
  id: string;
  realm_id: string;
  name: string;
  description: string;
  protocol: IamClientProtocol;
  assignment_type: IamScopeAssignmentType;
  status: IamClientScopeStatus;
  synthetic: boolean;
  protocol_mapper_ids: string[];
  assigned_client_ids: string[];
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamProtocolMapperRecord {
  id: string;
  realm_id: string;
  name: string;
  protocol: IamClientProtocol;
  target_kind: 'CLIENT' | 'CLIENT_SCOPE';
  target_id: string;
  source_kind: IamMapperSourceKind;
  claim_name: string;
  user_property: string | null;
  static_value: string | null;
  multivalued: boolean;
  include_in_access_token: boolean;
  include_in_id_token: boolean;
  include_in_userinfo: boolean;
  status: IamMapperStatus;
  synthetic: boolean;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamServiceAccountRecord {
  id: string;
  realm_id: string;
  client_id: string;
  username: string;
  role_ids: string[];
  status: 'ACTIVE' | 'DISABLED';
  synthetic: boolean;
  created_at: string;
  updated_at: string;
}

interface StoredIamUserCredential {
  user_id: string;
  realm_id: string;
  password_hash: string;
  synthetic: boolean;
  updated_at: string;
}

interface StoredIamSigningKey {
  id: string;
  realm_id: string | null;
  key_id: string;
  algorithm: 'RS256';
  private_key_reference_id: string | null;
  private_key_pem?: string;
  public_key_pem: string;
  created_at: string;
  status: IamKeyStatus;
}

export interface IamSigningKeyRecord {
  id: string;
  realm_id: string | null;
  key_id: string;
  algorithm: 'RS256';
  created_at: string;
  status: IamKeyStatus;
}

export interface RotateIamSigningKeyResponse {
  retired_key_ids: string[];
  active_key: IamSigningKeyRecord;
}

export interface IamIssuedTokenRecord {
  id: string;
  realm_id: string;
  client_id: string;
  subject_kind: IamSubjectKind;
  subject_id: string;
  browser_session_id: string | null;
  grant_type: IamTokenGrantType;
  scope: string;
  scope_ids: string[];
  issued_at: string;
  expires_at: string;
  refresh_expires_at: string | null;
  status: IamTokenStatus;
  revoked_at: string | null;
  requested_purpose: string | null;
}

export interface StoredIamIssuedToken extends IamIssuedTokenRecord {
  access_token_hash: string;
  refresh_token_hash: string | null;
  claims: Record<string, unknown>;
  id_token_claims: Record<string, unknown>;
  userinfo_claims: Record<string, unknown>;
  client_scope_names: string[];
}

interface IamProtocolRuntimeState {
  clients: StoredIamClient[];
  client_scopes: IamClientScopeRecord[];
  protocol_mappers: IamProtocolMapperRecord[];
  service_accounts: IamServiceAccountRecord[];
  user_credentials: StoredIamUserCredential[];
  issued_tokens: StoredIamIssuedToken[];
  signing_keys: StoredIamSigningKey[];
  saml_auth_requests: StoredIamSamlAuthRequest[];
  saml_sessions: StoredIamSamlSession[];
}

interface IamProtocolDirectoryState {
  clients: StoredIamClient[];
  client_scopes: IamClientScopeRecord[];
  protocol_mappers: IamProtocolMapperRecord[];
  service_accounts: IamServiceAccountRecord[];
  user_credentials: StoredIamUserCredential[];
  signing_keys: StoredIamSigningKey[];
}

interface IamProtocolTransientState {
  issued_tokens: StoredIamIssuedToken[];
  saml_auth_requests: StoredIamSamlAuthRequest[];
  saml_sessions: StoredIamSamlSession[];
}

interface IamProtocolDirectoryRepository extends IamStateRepository<IamProtocolDirectoryState> {}
interface IamAsyncProtocolDirectoryRepository extends IamAsyncStateRepository<IamProtocolDirectoryState> {}
interface IamProtocolTransientRepository extends IamStateRepository<IamProtocolTransientState> {}
interface IamAsyncProtocolTransientRepository extends IamAsyncStateRepository<IamProtocolTransientState> {}

export interface IamClientsResponse {
  generated_at: string;
  clients: IamClientRecord[];
  count: number;
  offset?: number;
  limit?: number;
  has_more?: boolean;
}

export interface IamClientScopesResponse {
  generated_at: string;
  client_scopes: IamClientScopeRecord[];
  count: number;
  offset?: number;
  limit?: number;
  has_more?: boolean;
}

export interface IamProtocolMappersResponse {
  generated_at: string;
  protocol_mappers: IamProtocolMapperRecord[];
  count: number;
  offset?: number;
  limit?: number;
  has_more?: boolean;
}

export interface IamServiceAccountsResponse {
  generated_at: string;
  service_accounts: IamServiceAccountRecord[];
  count: number;
  offset?: number;
  limit?: number;
  has_more?: boolean;
}

export interface IamIssuedTokensResponse {
  generated_at: string;
  issued_tokens: IamIssuedTokenRecord[];
  count: number;
  offset?: number;
  limit?: number;
  has_more?: boolean;
}

export interface CreateIamClientRequest {
  realm_id: string;
  client_id: string;
  name: string;
  summary?: string;
  protocol?: IamClientProtocol;
  access_type?: IamClientAccessType;
  status?: IamClientStatus;
  redirect_uris?: string[];
  base_url?: string | null;
  root_url?: string | null;
  default_scope_ids?: string[];
  optional_scope_ids?: string[];
  direct_protocol_mapper_ids?: string[];
  standard_flow_enabled?: boolean;
  direct_access_grants_enabled?: boolean;
  service_account_enabled?: boolean;
}

export interface UpdateIamClientRequest {
  name?: string;
  summary?: string;
  status?: IamClientStatus;
  redirect_uris?: string[];
  base_url?: string | null;
  root_url?: string | null;
  default_scope_ids?: string[];
  optional_scope_ids?: string[];
  direct_protocol_mapper_ids?: string[];
  standard_flow_enabled?: boolean;
  direct_access_grants_enabled?: boolean;
  service_account_enabled?: boolean;
}

export interface UpdateIamServiceAccountRequest {
  role_ids?: string[];
  status?: 'ACTIVE' | 'DISABLED';
}

export interface CreateIamClientScopeRequest {
  realm_id: string;
  name: string;
  description?: string;
  protocol?: IamClientProtocol;
  assignment_type?: IamScopeAssignmentType;
  status?: IamClientScopeStatus;
  protocol_mapper_ids?: string[];
  assigned_client_ids?: string[];
}

export interface UpdateIamClientScopeRequest {
  description?: string;
  status?: IamClientScopeStatus;
  protocol_mapper_ids?: string[];
  assigned_client_ids?: string[];
}

export interface CreateIamProtocolMapperRequest {
  realm_id: string;
  name: string;
  protocol?: IamClientProtocol;
  target_kind: 'CLIENT' | 'CLIENT_SCOPE';
  target_id: string;
  source_kind: IamMapperSourceKind;
  claim_name: string;
  user_property?: string | null;
  static_value?: string | null;
  multivalued?: boolean;
  include_in_access_token?: boolean;
  include_in_id_token?: boolean;
  include_in_userinfo?: boolean;
  status?: IamMapperStatus;
}

export interface UpdateIamProtocolMapperRequest {
  name?: string;
  claim_name?: string;
  user_property?: string | null;
  static_value?: string | null;
  multivalued?: boolean;
  include_in_access_token?: boolean;
  include_in_id_token?: boolean;
  include_in_userinfo?: boolean;
  status?: IamMapperStatus;
}

export interface RotateIamClientSecretResponse {
  client: IamClientRecord;
  issued_client_secret: string;
}

export interface IamProtocolSummary {
  client_count: number;
  client_scope_count: number;
  protocol_mapper_count: number;
  service_account_count: number;
  issued_token_count: number;
  active_signing_key_count: number;
  saml_auth_request_count: number;
  active_saml_auth_request_count: number;
  saml_session_count: number;
  active_saml_session_count: number;
}

export interface IamProtocolTransientStateMaintenanceResult {
  expired_issued_token_count: number;
  expired_saml_auth_request_count: number;
  pruned_issued_token_count: number;
  total_mutated_count: number;
}

const ISSUED_TOKEN_RETENTION_MS = 1000 * 60 * 60;

function parseOptionalTimestamp(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function shouldRetainIssuedToken(record: StoredIamIssuedToken, now: number): boolean {
  if (record.status === 'ACTIVE') {
    return true;
  }

  const retentionAnchor = Math.max(
    parseOptionalTimestamp(record.refresh_expires_at) ?? 0,
    parseOptionalTimestamp(record.expires_at) ?? 0,
    parseOptionalTimestamp(record.revoked_at) ?? 0,
    parseOptionalTimestamp(record.issued_at) ?? 0,
  );
  return retentionAnchor === 0 || retentionAnchor + ISSUED_TOKEN_RETENTION_MS > now;
}

export interface IamOidcDiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  revocation_endpoint: string;
  introspection_endpoint: string;
  jwks_uri: string;
  registration_endpoint?: string;
  device_authorization_endpoint?: string;
  backchannel_authentication_endpoint?: string;
  pushed_authorization_request_endpoint?: string;
  grant_types_supported: IamTokenGrantType[];
  response_types_supported: string[];
  code_challenge_methods_supported: Array<'S256'>;
  subject_types_supported: Array<'public'>;
  id_token_signing_alg_values_supported: Array<'RS256'>;
  scopes_supported: string[];
  token_endpoint_auth_methods_supported: Array<'client_secret_basic' | 'client_secret_post' | 'none'>;
}

export interface IamJwksResponse {
  keys: Array<{
    kid: string;
    kty: 'RSA';
    alg: 'RS256';
    use: 'sig';
    n: string;
    e: string;
  }>;
}

export interface IamTokenEndpointResponse {
  access_token: string;
  expires_in: number;
  token_type: 'Bearer';
  scope: string;
  refresh_token?: string;
  refresh_expires_in?: number;
  id_token?: string;
}

export interface IamTokenIntrospectionResponse {
  active: boolean;
  client_id?: string;
  username?: string;
  sub?: string;
  scope?: string;
  requested_purpose?: string | null;
  token_type?: 'Bearer';
  exp?: number;
  iat?: number;
  aud?: string | string[];
  iss?: string;
  realm_id?: string;
}

export interface IamResolvedBearerAccessToken {
  token_id: string;
  realm_id: string;
  client_id: string;
  subject_kind: IamSubjectKind;
  subject_id: string;
  scope: string;
  scope_names: string[];
  realm_roles: string[];
  groups: string[];
  claims: Record<string, unknown>;
  expires_at: string;
  issued_at: string;
}

export interface IamUserInfoResponse {
  sub: string;
  preferred_username?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  [key: string]: unknown;
}

export interface IamResolvedIssuedTokenRecord extends IamIssuedTokenRecord {
  token_use: 'access_token' | 'refresh_token';
}

export interface IamSamlMetadataResponse {
  realm_id: string;
  client_id: string;
  entity_id: string;
  acs_url: string;
  login_service_url: string;
  logout_service_url: string;
  signing_key_id: string;
  supported_request_bindings: IamSamlBinding[];
  supported_response_bindings: IamSamlBinding[];
  metadata_xml: string;
}

export interface IamSamlLoginResponse {
  realm_id: string;
  client_id: string;
  relay_state: string | null;
  saml_request_id?: string | null;
  session_index: string;
  acs_url: string;
  saml_response: string;
  attributes: Record<string, unknown>;
}

type IamSamlRequestInitiationMode = 'SP_INITIATED' | 'IDP_INITIATED';

interface StoredIamSamlAuthRequest {
  id: string;
  realm_id: string;
  client_id: string;
  client_name: string;
  acs_url: string;
  relay_state: string | null;
  request_binding: IamSamlBinding;
  request_id: string | null;
  request_xml: string | null;
  initiation_mode: IamSamlRequestInitiationMode;
  force_authn: boolean;
  created_at: string;
  expires_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  status: IamSamlAuthRequestStatus;
}

interface StoredIamSamlSession {
  id: string;
  realm_id: string;
  client_id: string;
  user_id: string;
  browser_session_id: string;
  session_index: string;
  relay_state: string | null;
  acs_url: string;
  created_at: string;
  last_seen_at: string;
  terminated_at: string | null;
  status: IamSamlSessionStatus;
}

export interface IamSamlAuthRequestRecord {
  id: string;
  realm_id: string;
  client_id: string;
  client_name: string;
  acs_url: string;
  relay_state: string | null;
  request_binding: IamSamlBinding;
  request_id: string | null;
  initiation_mode: IamSamlRequestInitiationMode;
  force_authn: boolean;
  created_at: string;
  expires_at: string;
  status: IamSamlAuthRequestStatus;
}

export interface IamSamlAuthRequestDetailResponse {
  request: IamSamlAuthRequestRecord;
  can_auto_continue: boolean;
}

export interface CreateIamSamlAuthRequestInput {
  client_id: string;
  acs_url?: string | null;
  relay_state?: string | null;
  binding?: IamSamlBinding | null;
  request_id?: string | null;
  request_xml?: string | null;
  force_authn?: boolean | null;
}

export interface IamSamlAuthRedirectResponse {
  saml_request_id: string;
  redirect_url: string;
  request: IamSamlAuthRequestRecord;
}

export interface CreateIamSamlIdpInitiatedRequestInput {
  client_id: string;
  acs_url?: string | null;
  relay_state?: string | null;
  force_authn?: boolean | null;
}

export interface IamSamlContinuationResponse {
  status: 'AUTHORIZED' | 'ERROR' | 'INTERACTION_REQUIRED';
  request: IamSamlAuthRequestRecord;
  session?: IamSamlSessionRecord;
  acs_url?: string;
  relay_state?: string | null;
  session_index?: string;
  saml_response?: string;
  attributes?: Record<string, unknown>;
  error?: string;
  error_description?: string;
  login_response?: {
    realm_id: string;
    next_step: string;
    login_transaction_id: string | null;
    session_id: string | null;
    user: Record<string, unknown>;
    client: Record<string, unknown> | null;
    pending_required_actions: string[];
    pending_scope_consent: string[];
    pending_mfa: boolean;
    post_login_destination: string;
  };
}

export interface IamSamlSessionRecord {
  id: string;
  realm_id: string;
  client_id: string;
  user_id: string;
  browser_session_id: string;
  session_index: string;
  relay_state: string | null;
  acs_url: string;
  created_at: string;
  last_seen_at: string;
  terminated_at: string | null;
  status: IamSamlSessionStatus;
}

export interface IamSamlSessionsResponse {
  generated_at: string;
  sessions: IamSamlSessionRecord[];
  count: number;
  offset?: number;
  limit?: number;
  has_more?: boolean;
}

export interface IamSamlLogoutResponse {
  realm_id: string;
  client_id: string;
  relay_state: string | null;
  session_index: string;
  logout_destination: string;
  saml_logout_response: string;
  terminated_at: string | null;
  browser_session_id: string;
  browser_session_revoked: boolean;
}

export interface IamSamlBrowserSessionTerminationResult {
  browser_session_reference: string;
  terminated_session_count: number;
  terminated_link_count: number;
}

const seedState = createSeedState();
interface IamProtocolRuntimeStateRepository extends IamStateRepository<IamProtocolRuntimeState> {}
interface IamAsyncProtocolRuntimeStateRepository extends IamAsyncStateRepository<IamProtocolRuntimeState> {}
interface IamAsyncIssuedTokenRepository extends IamAsyncStateRepository<StoredIamIssuedToken[]> {}
interface IamAsyncSigningKeyRepository extends IamAsyncStateRepository<StoredIamSigningKey[]> {}
interface IamClientRepository extends IamStateRepository<StoredIamClient[]> {}
interface IamClientScopeRepository extends IamStateRepository<IamClientScopeRecord[]> {}
interface IamProtocolMapperRepository extends IamStateRepository<IamProtocolMapperRecord[]> {}
interface IamServiceAccountRepository extends IamStateRepository<IamServiceAccountRecord[]> {}
interface IamUserCredentialRepository extends IamStateRepository<StoredIamUserCredential[]> {}
interface IamIssuedTokenRepository extends IamStateRepository<StoredIamIssuedToken[]> {}
interface IamSigningKeyRepository extends IamStateRepository<StoredIamSigningKey[]> {}
interface IamSamlAuthRequestRepository extends IamStateRepository<StoredIamSamlAuthRequest[]> {}
interface IamSamlSessionRepository extends IamStateRepository<StoredIamSamlSession[]> {}
type IamRuntimeRepositoryAdapterStatus = 'LEGACY_ONLY' | 'DYNAMO_V2_ACTIVE' | 'NOOP_FALLBACK';

interface IamProtocolRuntimeRepositoryStatus {
  mode: {
    dual_write: boolean;
    read_v2: boolean;
    parity_sample_rate: number;
  };
  issued_tokens: IamRuntimeRepositoryAdapterStatus;
}

let state: IamProtocolRuntimeState = createEmptyState();
const runtimeRepositoryMode = getRuntimeRepositoryMode();
const useRuntimeRepositoryPath = runtimeRepositoryMode.dualWrite || runtimeRepositoryMode.readV2;
let issuedTokenRuntimeRepositoryStatus: IamRuntimeRepositoryAdapterStatus = useRuntimeRepositoryPath ? 'NOOP_FALLBACK' : 'LEGACY_ONLY';
const protocolRuntimeStateRepository: IamProtocolRuntimeStateRepository = {
  load(): IamProtocolRuntimeState {
    return state;
  },
  save(nextState: IamProtocolRuntimeState): void {
    syncInMemoryState(nextState);
    persistStateSnapshotSync(state);
  },
};
const protocolAsyncRuntimeStateRepository: IamAsyncProtocolRuntimeStateRepository = {
  async load(): Promise<IamProtocolRuntimeState> {
    return loadStateAsync();
  },
  async save(nextState: IamProtocolRuntimeState): Promise<void> {
    syncInMemoryState(nextState);
    await persistStateSnapshotAsync(state);
  },
};

const clientRepository: IamClientRepository = createProjectedIamStateRepository({
  parentRepository: protocolRuntimeStateRepository,
  select: (runtimeState) => runtimeState.clients,
  assign: (runtimeState, nextState) => {
    runtimeState.clients = nextState;
  },
});
const clientScopeRepository: IamClientScopeRepository = createProjectedIamStateRepository({
  parentRepository: protocolRuntimeStateRepository,
  select: (runtimeState) => runtimeState.client_scopes,
  assign: (runtimeState, nextState) => {
    runtimeState.client_scopes = nextState;
  },
});
const protocolMapperRepository: IamProtocolMapperRepository = createProjectedIamStateRepository({
  parentRepository: protocolRuntimeStateRepository,
  select: (runtimeState) => runtimeState.protocol_mappers,
  assign: (runtimeState, nextState) => {
    runtimeState.protocol_mappers = nextState;
  },
});
const serviceAccountRepository: IamServiceAccountRepository = createProjectedIamStateRepository({
  parentRepository: protocolRuntimeStateRepository,
  select: (runtimeState) => runtimeState.service_accounts,
  assign: (runtimeState, nextState) => {
    runtimeState.service_accounts = nextState;
  },
});
const userCredentialRepository: IamUserCredentialRepository = createProjectedIamStateRepository({
  parentRepository: protocolRuntimeStateRepository,
  select: (runtimeState) => runtimeState.user_credentials,
  assign: (runtimeState, nextState) => {
    runtimeState.user_credentials = nextState;
  },
});
const issuedTokenRepository: IamIssuedTokenRepository = createProjectedIamStateRepository({
  parentRepository: protocolRuntimeStateRepository,
  select: (runtimeState) => runtimeState.issued_tokens,
  assign: (runtimeState, nextState) => {
    runtimeState.issued_tokens = nextState;
  },
});
const issuedTokenAsyncRepository: IamAsyncIssuedTokenRepository = createProjectedAsyncIamStateRepository({
  parentRepository: protocolAsyncRuntimeStateRepository,
  select: (runtimeState) => runtimeState.issued_tokens,
  assign: (runtimeState, nextState) => {
    runtimeState.issued_tokens = nextState;
  },
});
const signingKeyRepository: IamSigningKeyRepository = createProjectedIamStateRepository({
  parentRepository: protocolRuntimeStateRepository,
  select: (runtimeState) => runtimeState.signing_keys,
  assign: (runtimeState, nextState) => {
    runtimeState.signing_keys = nextState;
  },
});
const signingKeyAsyncRepository: IamAsyncSigningKeyRepository = createProjectedAsyncIamStateRepository({
  parentRepository: protocolAsyncRuntimeStateRepository,
  select: (runtimeState) => runtimeState.signing_keys,
  assign: (runtimeState, nextState) => {
    runtimeState.signing_keys = nextState;
  },
});
const samlAuthRequestRepository: IamSamlAuthRequestRepository = createProjectedIamStateRepository({
  parentRepository: protocolRuntimeStateRepository,
  select: (runtimeState) => runtimeState.saml_auth_requests,
  assign: (runtimeState, nextState) => {
    runtimeState.saml_auth_requests = nextState;
  },
});
const samlSessionRepository: IamSamlSessionRepository = createProjectedIamStateRepository({
  parentRepository: protocolRuntimeStateRepository,
  select: (runtimeState) => runtimeState.saml_sessions,
  assign: (runtimeState, nextState) => {
    runtimeState.saml_sessions = nextState;
  },
});
const issuedTokenById = new Map<string, StoredIamIssuedToken>();
const issuedTokenByAccessHash = new Map<string, StoredIamIssuedToken>();
const issuedTokenByRefreshHash = new Map<string, StoredIamIssuedToken>();
let lastRealmSeedSignature: string | null = null;
const issuedTokenAsyncStore = (() => {
  const legacy = new LegacyAsyncIssuedTokenStoreAdapter({
    load: async () => clone(await issuedTokenAsyncRepository.load()),
    save: async (nextState) => {
      await issuedTokenAsyncRepository.save(clone(nextState));
      rebuildIssuedTokenIndexes();
    },
  });

  if (!useRuntimeRepositoryPath) {
    issuedTokenRuntimeRepositoryStatus = 'LEGACY_ONLY';
    return legacy;
  }

  try {
    const v2 = new DynamoAsyncIssuedTokenStoreAdapter(
      new DynamoDbTokenRepository(createDynamoDocumentClient(), resolveRuntimeTableName()),
    );
    issuedTokenRuntimeRepositoryStatus = 'DYNAMO_V2_ACTIVE';
    return new DualRunAsyncIssuedTokenStoreAdapter(legacy, v2, runtimeRepositoryMode);
  } catch {
    issuedTokenRuntimeRepositoryStatus = 'NOOP_FALLBACK';
    return new DualRunAsyncIssuedTokenStoreAdapter(legacy, new NoopAsyncIssuedTokenStoreAdapter(), runtimeRepositoryMode);
  }
})();

function syncInMemoryState(nextState: IamProtocolRuntimeState): void {
  state.clients = clone(nextState.clients);
  state.client_scopes = clone(nextState.client_scopes);
  state.protocol_mappers = clone(nextState.protocol_mappers);
  state.service_accounts = clone(nextState.service_accounts);
  state.user_credentials = clone(nextState.user_credentials);
  state.issued_tokens = clone(nextState.issued_tokens);
  state.signing_keys = clone(nextState.signing_keys);
  state.saml_auth_requests = clone(nextState.saml_auth_requests);
  state.saml_sessions = clone(nextState.saml_sessions);
  rebuildIssuedTokenIndexes();
}

function issuedTokenIndexKey(realmId: string, tokenHash: string): string {
  return `${realmId}:${tokenHash}`;
}

function issuedTokenIdIndexKey(realmId: string, tokenId: string): string {
  return `${realmId}:${tokenId}`;
}

function rebuildIssuedTokenIndexes(): void {
  issuedTokenById.clear();
  issuedTokenByAccessHash.clear();
  issuedTokenByRefreshHash.clear();
  for (const record of issuedTokenRepository.load()) {
    issuedTokenById.set(issuedTokenIdIndexKey(record.realm_id, record.id), record);
    issuedTokenByAccessHash.set(issuedTokenIndexKey(record.realm_id, record.access_token_hash), record);
    if (record.refresh_token_hash) {
      issuedTokenByRefreshHash.set(issuedTokenIndexKey(record.realm_id, record.refresh_token_hash), record);
    }
  }
}

async function recordIssuedTokenBrowserSessionOwnershipAsync(realmId: string, accessToken: string): Promise<void> {
  if (useRuntimeRepositoryPath) {
    return;
  }
  const tokenHash = hashTokenFingerprint(accessToken);
  const record = issuedTokenByAccessHash.get(issuedTokenIndexKey(realmId, tokenHash)) ?? null;
  if (!record || !record.browser_session_id) {
    return;
  }
  await LocalIamTokenOwnershipIndexStore.recordBrowserSessionIssuedTokenLinkAsync({
    realm_id: record.realm_id,
    browser_session_reference: record.browser_session_id,
    token_id: record.id,
    client_id: record.client_id,
    subject_kind: record.subject_kind,
    subject_id: record.subject_id,
  });
}

function scheduleIssuedTokenBrowserSessionOwnershipSync(realmId: string, accessToken: string): void {
  void recordIssuedTokenBrowserSessionOwnershipAsync(realmId, accessToken).catch((error) => {
    console.error('[iamProtocolRuntime] failed to record browser-session token ownership', {
      realm_id: realmId,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}

async function syncIssuedTokenForAccessTokenAsync(realmId: string, accessToken: string): Promise<void> {
  if (!useRuntimeRepositoryPath) {
    return;
  }
  const tokenHash = hashTokenFingerprint(accessToken);
  const record = issuedTokenByAccessHash.get(issuedTokenIndexKey(realmId, tokenHash)) ?? null;
  if (!record) {
    return;
  }
  await issuedTokenAsyncStore.put(record);
}

function toResolvedIssuedTokenRecord(
  record: StoredIamIssuedToken,
  tokenUse: 'access_token' | 'refresh_token',
): IamResolvedIssuedTokenRecord {
  return {
    id: record.id,
    realm_id: record.realm_id,
    client_id: record.client_id,
    subject_kind: record.subject_kind,
    subject_id: record.subject_id,
    browser_session_id: record.browser_session_id,
    grant_type: record.grant_type,
    scope: record.scope,
    scope_ids: clone(record.scope_ids),
    issued_at: record.issued_at,
    expires_at: record.expires_at,
    refresh_expires_at: record.refresh_expires_at,
    status: record.status,
    revoked_at: record.revoked_at,
    requested_purpose: record.requested_purpose,
    token_use: tokenUse,
  };
}

async function resolveIssuedTokenForValueAsync(
  realmId: string,
  rawToken: string,
): Promise<IamResolvedIssuedTokenRecord> {
  const tokenHash = hashTokenFingerprint(rawToken);
  const accessRecord = await issuedTokenAsyncStore.getByAccessHash(realmId, tokenHash);
  if (accessRecord) {
    return toResolvedIssuedTokenRecord(accessRecord, 'access_token');
  }

  const refreshRecord = await issuedTokenAsyncStore.getByRefreshHash(realmId, tokenHash);
  if (refreshRecord) {
    return toResolvedIssuedTokenRecord(refreshRecord, 'refresh_token');
  }

  throw new Error('Unknown issued token');
}

async function revokeIssuedTokensByIdAsync(
  realmId: string,
  tokenIds: string[],
  options?: {
    browserSessionId?: string | null;
    subjectKind?: IamSubjectKind;
    subjectId?: string;
  },
): Promise<{ revoked_count: number; revoked_at: string | null; revoked_access_token_ids: Set<string> }> {
  const revokedAccessTokenIds = new Set<string>();
  let revokedCount = 0;
  let revokedAt: string | null = null;

  for (const tokenId of tokenIds) {
    const record = await issuedTokenAsyncStore.getById(realmId, tokenId);
    if (!record || record.status !== 'ACTIVE') {
      continue;
    }
    if (options?.browserSessionId && record.browser_session_id !== options.browserSessionId) {
      if (!useRuntimeRepositoryPath && record.browser_session_id) {
        LocalIamTokenOwnershipIndexStore.markTokenLinkTerminated(realmId, record.id);
      }
      continue;
    }
    if (options?.subjectKind && record.subject_kind !== options.subjectKind) {
      continue;
    }
    if (options?.subjectId && record.subject_id !== options.subjectId) {
      continue;
    }
    revokeTokenRecordAndCollectAccessTokenId(record, revokedAccessTokenIds);
    await issuedTokenAsyncStore.put(record);
    revokedCount += 1;
    revokedAt = record.revoked_at;
  }

  return {
    revoked_count: revokedCount,
    revoked_at: revokedAt,
    revoked_access_token_ids: revokedAccessTokenIds,
  };
}

function migrateLegacySigningKeySecretReferences(): void {
  let changed = false;
  for (const key of signingKeyRepository.load()) {
    if (key.private_key_reference_id) {
      continue;
    }
    const legacyPrivateKeyPem = typeof key.private_key_pem === 'string' ? key.private_key_pem : null;
    if (!legacyPrivateKeyPem) {
      continue;
    }
    const secretReference = LocalSecretStore.upsertOpaqueSecret({
      subjectType: 'iam_signing_key',
      subjectId: key.id,
      kind: 'integration_credential',
      label: `IAM signing key ${key.key_id}`,
      value: legacyPrivateKeyPem,
      createdByUserId: 'idp-super-admin',
      preview: `iam_signing_key_${key.key_id.slice(-6)}_****`,
    });
    key.private_key_reference_id = secretReference.id;
    delete key.private_key_pem;
    changed = true;
  }
  if (changed) {
    persistStateSyncOnly();
  }
}

function persistStateSyncOnly() {
  const context = deferredPersistenceContext.getStore();
  if (context) {
    context.dirty = true;
    return;
  }
  protocolRuntimeStateRepository.save(state);
}

async function persistStateAsync(): Promise<void> {
  await persistStateSnapshotAsync(state);
}

async function runWithDeferredPersistence<T>(operation: () => T | Promise<T>): Promise<T> {
  const existingContext = deferredPersistenceContext.getStore();
  if (existingContext) {
    return operation();
  }

  syncInMemoryState(await loadStateAsync());
  return deferredPersistenceContext.run({ dirty: false }, async () => {
    const context = deferredPersistenceContext.getStore()!;
    try {
      const result = await operation();
      if (context.dirty) {
        await persistStateAsync();
      }
      return result;
    } catch (error) {
      if (context.dirty) {
        await persistStateAsync();
      }
      throw error;
    }
  });
}

function normalizeState(input: Partial<IamProtocolRuntimeState>): IamProtocolRuntimeState {
  return {
    clients: Array.isArray(input.clients) ? input.clients : seedState.clients,
    client_scopes: Array.isArray(input.client_scopes) ? input.client_scopes : seedState.client_scopes,
    protocol_mappers: Array.isArray(input.protocol_mappers) ? input.protocol_mappers : seedState.protocol_mappers,
    service_accounts: Array.isArray(input.service_accounts) ? input.service_accounts : seedState.service_accounts,
    user_credentials: Array.isArray(input.user_credentials) ? input.user_credentials : seedState.user_credentials,
    issued_tokens: Array.isArray(input.issued_tokens)
      ? input.issued_tokens.reduce<StoredIamIssuedToken[]>((records, candidateRecord) => {
        const legacyRecord = candidateRecord as StoredIamIssuedToken & {
          access_token?: string;
          refresh_token?: string | null;
          access_token_claims?: Record<string, unknown>;
        };
        const {
          access_token: legacyAccessToken,
          refresh_token: legacyRefreshToken,
          ...record
        } = legacyRecord;
        const accessTokenClaims = clone(
          legacyRecord.claims
          ?? legacyRecord.access_token_claims
          ?? {},
        );
        const accessTokenHash = typeof legacyRecord.access_token_hash === 'string' && legacyRecord.access_token_hash.length > 0
          ? legacyRecord.access_token_hash
          : (typeof legacyAccessToken === 'string' && legacyAccessToken.length > 0
            ? hashTokenFingerprint(legacyAccessToken)
            : null);
        if (!accessTokenHash) {
          return records;
        }
        records.push({
          ...record,
          browser_session_id: normalizeBrowserSessionReference((record as StoredIamIssuedToken).browser_session_id),
          access_token_hash: accessTokenHash,
          refresh_token_hash: typeof legacyRecord.refresh_token_hash === 'string' && legacyRecord.refresh_token_hash.length > 0
            ? legacyRecord.refresh_token_hash
            : (typeof legacyRefreshToken === 'string' && legacyRefreshToken.length > 0
              ? hashTokenFingerprint(legacyRefreshToken)
              : null),
          claims: accessTokenClaims,
          id_token_claims: clone((record as StoredIamIssuedToken).id_token_claims ?? accessTokenClaims),
          userinfo_claims: clone((record as StoredIamIssuedToken).userinfo_claims ?? {}),
          requested_purpose: typeof record.requested_purpose === 'string' && record.requested_purpose.trim()
            ? record.requested_purpose.trim()
            : null,
        });
        return records;
      }, [])
      : [],
    signing_keys: Array.isArray(input.signing_keys)
      ? input.signing_keys.map((key) => ({
        ...key,
        private_key_reference_id:
          typeof key.private_key_reference_id === 'string' && key.private_key_reference_id.trim().length > 0
            ? key.private_key_reference_id
            : null,
      }))
      : seedState.signing_keys,
    saml_auth_requests: Array.isArray(input.saml_auth_requests) ? input.saml_auth_requests : [],
    saml_sessions: Array.isArray(input.saml_sessions) ? input.saml_sessions : [],
  };
}

function createEmptyState(): IamProtocolRuntimeState {
  return normalizeState(clone(seedState));
}

function splitDirectoryState(input: IamProtocolRuntimeState): IamProtocolDirectoryState {
  return {
    clients: clone(input.clients),
    client_scopes: clone(input.client_scopes),
    protocol_mappers: clone(input.protocol_mappers),
    service_accounts: clone(input.service_accounts),
    user_credentials: clone(input.user_credentials),
    signing_keys: clone(input.signing_keys),
  };
}

function splitTransientState(input: IamProtocolRuntimeState): IamProtocolTransientState {
  return {
    issued_tokens: clone(input.issued_tokens),
    saml_auth_requests: clone(input.saml_auth_requests),
    saml_sessions: clone(input.saml_sessions),
  };
}

function combineState(
  directoryState: IamProtocolDirectoryState,
  transientState: IamProtocolTransientState,
): IamProtocolRuntimeState {
  return normalizeState({
    ...directoryState,
    ...transientState,
  });
}

function normalizeDirectoryState(input: Partial<IamProtocolDirectoryState>): IamProtocolDirectoryState {
  return splitDirectoryState(normalizeState(input as Partial<IamProtocolRuntimeState>));
}

function normalizeTransientState(input: Partial<IamProtocolTransientState>): IamProtocolTransientState {
  return splitTransientState(normalizeState(input as Partial<IamProtocolRuntimeState>));
}

function readLegacyProtocolStateSnapshot(): IamProtocolRuntimeState {
  return normalizeState(
    readPersistedStateSnapshot<Partial<IamProtocolRuntimeState>>(LEGACY_IAM_PROTOCOL_RUNTIME_FILE) ?? {},
  );
}

function shouldSeedProtocolFromLegacy(): boolean {
  return !existsSync(getPersistedStatePath(IAM_PROTOCOL_DIRECTORY_FILE))
    || !existsSync(getPersistedStatePath(IAM_PROTOCOL_TRANSIENT_FILE));
}

function getProtocolSeedState(): IamProtocolRuntimeState {
  return shouldSeedProtocolFromLegacy() ? readLegacyProtocolStateSnapshot() : createEmptyState();
}

function protocolDirectorySeedFactory(): IamProtocolDirectoryState {
  return splitDirectoryState(getProtocolSeedState());
}

function protocolTransientSeedFactory(): IamProtocolTransientState {
  return splitTransientState(getProtocolSeedState());
}

const protocolDirectoryRepository: IamProtocolDirectoryRepository = createPersistedIamStateRepository<
  Partial<IamProtocolDirectoryState>,
  IamProtocolDirectoryState
>({
  fileName: IAM_PROTOCOL_DIRECTORY_FILE,
  seedFactory: protocolDirectorySeedFactory,
  normalize: normalizeDirectoryState,
});

const protocolDirectoryAsyncRepository: IamAsyncProtocolDirectoryRepository = createPersistedAsyncIamStateRepository<
  Partial<IamProtocolDirectoryState>,
  IamProtocolDirectoryState
>({
  fileName: IAM_PROTOCOL_DIRECTORY_FILE,
  seedFactory: protocolDirectorySeedFactory,
  normalize: normalizeDirectoryState,
});

const protocolTransientRepository: IamProtocolTransientRepository = createPersistedIamStateRepository<
  Partial<IamProtocolTransientState>,
  IamProtocolTransientState
>({
  fileName: IAM_PROTOCOL_TRANSIENT_FILE,
  seedFactory: protocolTransientSeedFactory,
  normalize: normalizeTransientState,
});

const protocolTransientAsyncRepository: IamAsyncProtocolTransientRepository = createPersistedAsyncIamStateRepository<
  Partial<IamProtocolTransientState>,
  IamProtocolTransientState
>({
  fileName: IAM_PROTOCOL_TRANSIENT_FILE,
  seedFactory: protocolTransientSeedFactory,
  normalize: normalizeTransientState,
});

function loadStateSync(): IamProtocolRuntimeState {
  const directoryState = protocolDirectoryRepository.load();
  const transientState = protocolTransientRepository.load();
  return combineState(directoryState, transientState);
}

async function loadStateAsync(): Promise<IamProtocolRuntimeState> {
  const [directoryState, transientState] = await Promise.all([
    protocolDirectoryAsyncRepository.load(),
    protocolTransientAsyncRepository.load(),
  ]);
  return combineState(directoryState, transientState);
}

function persistStateSnapshotSync(nextState: IamProtocolRuntimeState): void {
  protocolDirectoryRepository.save(splitDirectoryState(nextState));
  protocolTransientRepository.save(splitTransientState(nextState));
}

async function persistStateSnapshotAsync(nextState: IamProtocolRuntimeState): Promise<void> {
  await Promise.all([
    protocolDirectoryAsyncRepository.save(splitDirectoryState(nextState)),
    protocolTransientAsyncRepository.save(splitTransientState(nextState)),
  ]);
}
state = loadStateSync();
syncInMemoryState(state);
migrateLegacySigningKeySecretReferences();
ensureRealmSeeds();

function createSeedState(): IamProtocolRuntimeState {
  const now = nowIso();
  const realms = LocalIamFoundationStore.listRealms().realms;
  const roles = LocalIamFoundationStore.listRoles().roles;
  const users = LocalIamFoundationStore.listUsers().users;
  const signingKey = generateSigningKey(null);

  const state: IamProtocolRuntimeState = {
    clients: [],
    client_scopes: [],
    protocol_mappers: [],
    service_accounts: [],
    user_credentials: [],
    issued_tokens: [],
    signing_keys: [signingKey],
    saml_auth_requests: [],
    saml_sessions: [],
  };

  realms.forEach((realm) => {
    seedRealmRuntime(state, realm, roles, users, now);
  });

  return state;
}

function buildCompatibilityCredentialEnvSignature(): string {
  const hash = createHash('sha256');
  const envEntries = listCompatibilityIamCredentialEnvEntries();
  envEntries
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .forEach(([key, value]) => {
      hash.update(`env:${key}|${value ?? ''}`);
    });
  return hash.digest('base64url');
}

function ensureRealmSeeds() {
  const seedSignature = `${LocalIamFoundationStore.getStateRevision()}:${buildCompatibilityCredentialEnvSignature()}`;
  const runtimeState = protocolRuntimeStateRepository.load();
  const signingKeys = signingKeyRepository.load();

  if (signingKeys.filter((key) => key.status === 'ACTIVE').length === 0) {
    signingKeys.push(generateSigningKey(null));
  }

  if (lastRealmSeedSignature === seedSignature) {
    return;
  }

  const now = nowIso();
  const realms = LocalIamFoundationStore.listRealms().realms;
  const roles = LocalIamFoundationStore.listRoles().roles;
  const users = LocalIamFoundationStore.listUsers().users;
  realms.forEach((realm) => {
    seedRealmRuntime(runtimeState, realm, roles, users, now);
  });
  users
    .filter((user) => user.synthetic)
    .forEach((user) => {
      ensureUserCredentialRecord(user, { synthetic: true });
    });
  lastRealmSeedSignature = seedSignature;
}

function generateSigningKey(realmId: string | null): StoredIamSigningKey {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  const keyRecordId = `iam-key-${randomUUID()}`;
  const keyId = `kid-${randomUUID().slice(0, 12)}`;
  const secretReference = LocalSecretStore.upsertOpaqueSecret({
    subjectType: 'iam_signing_key',
    subjectId: keyRecordId,
    kind: 'integration_credential',
    label: `IAM signing key ${keyId}`,
    value: privateKey,
    createdByUserId: 'idp-super-admin',
    preview: `iam_signing_key_${keyId.slice(-6)}_****`,
  });

  return {
    id: keyRecordId,
    realm_id: realmId,
    key_id: keyId,
    algorithm: 'RS256',
    private_key_reference_id: secretReference.id,
    public_key_pem: publicKey,
    created_at: nowIso(),
    status: 'ACTIVE',
  };
}

function seedRealmRuntime(
  runtime: IamProtocolRuntimeState,
  realm: { id: string; name: string },
  allRoles: IamRoleRecord[],
  allUsers: IamUserRecord[],
  createdAt: string,
) {
  const existingScopeNames = new Set(runtime.client_scopes.filter((scope) => scope.realm_id === realm.id).map((scope) => scope.name));
  const existingClientIds = new Set(runtime.clients.filter((client) => client.realm_id === realm.id).map((client) => client.client_id));
  const existingMapperKeys = new Set(runtime.protocol_mappers.filter((mapper) => mapper.realm_id === realm.id).map((mapper) => `${mapper.target_kind}:${mapper.target_id}:${mapper.name}`));
  const existingCredentials = new Set(runtime.user_credentials.filter((credential) => credential.realm_id === realm.id).map((credential) => credential.user_id));

  const scopeIds = {
    openid: ensureClientScope(runtime, realm.id, {
      name: 'openid',
      description: 'OpenID Connect baseline scope.',
      protocol: 'OIDC',
      assignment_type: 'DEFAULT',
      status: 'ACTIVE',
      synthetic: true,
    }, existingScopeNames, createdAt),
    profile: ensureClientScope(runtime, realm.id, {
      name: 'profile',
      description: 'Profile attributes for user-facing OIDC and SAML applications.',
      protocol: 'OIDC',
      assignment_type: 'DEFAULT',
      status: 'ACTIVE',
      synthetic: true,
    }, existingScopeNames, createdAt),
    email: ensureClientScope(runtime, realm.id, {
      name: 'email',
      description: 'Email address claims for user-facing applications.',
      protocol: 'OIDC',
      assignment_type: 'DEFAULT',
      status: 'ACTIVE',
      synthetic: true,
    }, existingScopeNames, createdAt),
    roles: ensureClientScope(runtime, realm.id, {
      name: 'roles',
      description: 'Realm role claims for downstream authorization checks.',
      protocol: 'OIDC',
      assignment_type: 'DEFAULT',
      status: 'ACTIVE',
      synthetic: true,
    }, existingScopeNames, createdAt),
    groups: ensureClientScope(runtime, realm.id, {
      name: 'groups',
      description: 'Realm group claims for downstream authorization checks.',
      protocol: 'OIDC',
      assignment_type: 'OPTIONAL',
      status: 'ACTIVE',
      synthetic: true,
    }, existingScopeNames, createdAt),
    educationProfile: ensureClientScope(runtime, realm.id, {
      name: 'education_profile',
      description: 'Education-readiness validation scope for profile-backed attribute release controls.',
      protocol: 'OIDC',
      assignment_type: 'OPTIONAL',
      status: 'ACTIVE',
      synthetic: true,
    }, existingScopeNames, createdAt),
  };

  const samlScopeId = ensureClientScope(runtime, realm.id, {
    name: 'saml-profile',
    description: 'SAML profile attributes for synthetic service-provider validation.',
    protocol: 'SAML',
    assignment_type: 'DEFAULT',
    status: 'ACTIVE',
    synthetic: true,
  }, existingScopeNames, createdAt);

  const profileScopeMapperIds = [
    ensureMapper(runtime, realm.id, {
      name: 'preferred_username',
      protocol: 'OIDC',
      target_kind: 'CLIENT_SCOPE',
      target_id: scopeIds.profile,
      source_kind: 'USERNAME',
      claim_name: 'preferred_username',
      user_property: null,
      static_value: null,
      multivalued: false,
      include_in_access_token: true,
      include_in_id_token: true,
      include_in_userinfo: true,
      status: 'ACTIVE',
      synthetic: true,
    }, existingMapperKeys, createdAt),
    ensureMapper(runtime, realm.id, {
      name: 'given_name',
      protocol: 'OIDC',
      target_kind: 'CLIENT_SCOPE',
      target_id: scopeIds.profile,
      source_kind: 'USER_PROPERTY',
      claim_name: 'given_name',
      user_property: 'first_name',
      static_value: null,
      multivalued: false,
      include_in_access_token: true,
      include_in_id_token: true,
      include_in_userinfo: true,
      status: 'ACTIVE',
      synthetic: true,
    }, existingMapperKeys, createdAt),
    ensureMapper(runtime, realm.id, {
      name: 'family_name',
      protocol: 'OIDC',
      target_kind: 'CLIENT_SCOPE',
      target_id: scopeIds.profile,
      source_kind: 'USER_PROPERTY',
      claim_name: 'family_name',
      user_property: 'last_name',
      static_value: null,
      multivalued: false,
      include_in_access_token: true,
      include_in_id_token: true,
      include_in_userinfo: true,
      status: 'ACTIVE',
      synthetic: true,
    }, existingMapperKeys, createdAt),
  ];

  const emailScopeMapperIds = [
    ensureMapper(runtime, realm.id, {
      name: 'email',
      protocol: 'OIDC',
      target_kind: 'CLIENT_SCOPE',
      target_id: scopeIds.email,
      source_kind: 'USER_PROPERTY',
      claim_name: 'email',
      user_property: 'email',
      static_value: null,
      multivalued: false,
      include_in_access_token: true,
      include_in_id_token: true,
      include_in_userinfo: true,
      status: 'ACTIVE',
      synthetic: true,
    }, existingMapperKeys, createdAt),
    ensureMapper(runtime, realm.id, {
      name: 'email_verified',
      protocol: 'OIDC',
      target_kind: 'CLIENT_SCOPE',
      target_id: scopeIds.email,
      source_kind: 'STATIC_VALUE',
      claim_name: 'email_verified',
      user_property: null,
      static_value: 'true',
      multivalued: false,
      include_in_access_token: true,
      include_in_id_token: true,
      include_in_userinfo: true,
      status: 'ACTIVE',
      synthetic: true,
    }, existingMapperKeys, createdAt),
  ];

  const educationProfileScopeMapperIds = [
    ensureMapper(runtime, realm.id, {
      name: 'job_title',
      protocol: 'OIDC',
      target_kind: 'CLIENT_SCOPE',
      target_id: scopeIds.educationProfile,
      source_kind: 'USER_PROPERTY',
      claim_name: 'job_title',
      user_property: 'job_title',
      static_value: null,
      multivalued: false,
      include_in_access_token: true,
      include_in_id_token: true,
      include_in_userinfo: true,
      status: 'ACTIVE',
      synthetic: true,
    }, existingMapperKeys, createdAt),
    ensureMapper(runtime, realm.id, {
      name: 'phone_number',
      protocol: 'OIDC',
      target_kind: 'CLIENT_SCOPE',
      target_id: scopeIds.educationProfile,
      source_kind: 'USER_PROPERTY',
      claim_name: 'phone_number',
      user_property: 'phone_number',
      static_value: null,
      multivalued: false,
      include_in_access_token: true,
      include_in_id_token: true,
      include_in_userinfo: true,
      status: 'ACTIVE',
      synthetic: true,
    }, existingMapperKeys, createdAt),
  ];

  const rolesScopeMapperIds = [
    ensureMapper(runtime, realm.id, {
      name: 'realm_roles',
      protocol: 'OIDC',
      target_kind: 'CLIENT_SCOPE',
      target_id: scopeIds.roles,
      source_kind: 'REALM_ROLE_NAMES',
      claim_name: 'realm_roles',
      user_property: null,
      static_value: null,
      multivalued: true,
      include_in_access_token: true,
      include_in_id_token: true,
      include_in_userinfo: false,
      status: 'ACTIVE',
      synthetic: true,
    }, existingMapperKeys, createdAt),
  ];

  const groupsScopeMapperIds = [
    ensureMapper(runtime, realm.id, {
      name: 'groups',
      protocol: 'OIDC',
      target_kind: 'CLIENT_SCOPE',
      target_id: scopeIds.groups,
      source_kind: 'GROUP_NAMES',
      claim_name: 'groups',
      user_property: null,
      static_value: null,
      multivalued: true,
      include_in_access_token: true,
      include_in_id_token: true,
      include_in_userinfo: false,
      status: 'ACTIVE',
      synthetic: true,
    }, existingMapperKeys, createdAt),
  ];

  const samlMapperIds = [
    ensureMapper(runtime, realm.id, {
      name: 'nameid',
      protocol: 'SAML',
      target_kind: 'CLIENT_SCOPE',
      target_id: samlScopeId,
      source_kind: 'USER_PROPERTY',
      claim_name: 'NameID',
      user_property: 'email',
      static_value: null,
      multivalued: false,
      include_in_access_token: false,
      include_in_id_token: false,
      include_in_userinfo: false,
      status: 'ACTIVE',
      synthetic: true,
    }, existingMapperKeys, createdAt),
    ensureMapper(runtime, realm.id, {
      name: 'roles',
      protocol: 'SAML',
      target_kind: 'CLIENT_SCOPE',
      target_id: samlScopeId,
      source_kind: 'REALM_ROLE_NAMES',
      claim_name: 'roles',
      user_property: null,
      static_value: null,
      multivalued: true,
      include_in_access_token: false,
      include_in_id_token: false,
      include_in_userinfo: false,
      status: 'ACTIVE',
      synthetic: true,
    }, existingMapperKeys, createdAt),
  ];

  assignMapperIds(runtime, scopeIds.profile, profileScopeMapperIds);
  assignMapperIds(runtime, scopeIds.email, emailScopeMapperIds);
  assignMapperIds(runtime, scopeIds.educationProfile, educationProfileScopeMapperIds);
  assignMapperIds(runtime, scopeIds.roles, rolesScopeMapperIds);
  assignMapperIds(runtime, scopeIds.groups, groupsScopeMapperIds);
  assignMapperIds(runtime, samlScopeId, samlMapperIds);

  const isFlightosRealm = realm.id === 'realm-flightos-default';
  const defaultClientIds = [
    {
      client_id: 'admin-console-demo',
      name: isFlightosRealm ? 'FlightOS Application' : 'Admin Console Demo',
      summary: isFlightosRealm
        ? 'FlightOS browser client used for shared identity bootstrap and activation handoff validation.'
        : 'Primary admin web client used for standalone realm and token validation.',
      protocol: 'OIDC' as const,
      access_type: 'PUBLIC' as const,
      standard_flow_enabled: true,
      direct_access_grants_enabled: true,
      service_account_enabled: false,
      redirect_uris: isFlightosRealm
        ? [
          'http://localhost:3001/*',
          'http://127.0.0.1:3001/*',
          'http://[::1]:3001/*',
          'http://flightos.local:3001/*',
          'http://flightos.local/*',
          'https://flightos.local:3001/*',
          'https://flightos.local/*',
        ]
        : [
          'http://localhost:3004/*',
          'http://127.0.0.1:3004/*',
          'http://[::1]:3004/*',
          'http://idp.local:3004/*',
          'http://idp.local/*',
          'https://idp.local:3004/*',
          'https://idp.local/*',
        ],
      base_url: isFlightosRealm ? 'http://localhost:3001' : 'http://localhost:3004',
      root_url: isFlightosRealm ? 'http://localhost:3001' : 'http://localhost:3004',
      default_scope_ids: [scopeIds.openid, scopeIds.profile, scopeIds.email, scopeIds.roles],
      optional_scope_ids: [scopeIds.groups, scopeIds.educationProfile],
    },
    {
      client_id: 'cms-admin-demo',
      name: 'CMS Admin Demo',
      summary: 'Standalone CMS client used to prove downstream adoption can consume IAM via standards contracts.',
      protocol: 'OIDC' as const,
      access_type: 'PUBLIC' as const,
      standard_flow_enabled: true,
      direct_access_grants_enabled: true,
      service_account_enabled: false,
      redirect_uris: [
        'http://localhost:4321/*',
        'http://127.0.0.1:4321/*',
      ],
      base_url: 'http://localhost:4321',
      root_url: 'http://localhost:4321',
      default_scope_ids: [scopeIds.openid, scopeIds.profile, scopeIds.email, scopeIds.roles],
      optional_scope_ids: [scopeIds.groups],
    },
    {
      client_id: 'training-portal-demo',
      name: 'Training Portal Demo',
      summary: 'Synthetic learner-facing OIDC application for training validation.',
      protocol: 'OIDC' as const,
      access_type: 'PUBLIC' as const,
      standard_flow_enabled: true,
      direct_access_grants_enabled: true,
      service_account_enabled: false,
      redirect_uris: ['http://localhost:3004/training/*', 'http://127.0.0.1:3004/training/*'],
      base_url: 'http://localhost:3004/training',
      root_url: 'http://localhost:3004/training',
      default_scope_ids: [scopeIds.openid, scopeIds.profile, scopeIds.email, scopeIds.roles],
      optional_scope_ids: [scopeIds.groups],
    },
    {
      client_id: 'developer-portal-demo',
      name: 'Developer Portal Demo',
      summary: 'Developer-facing OIDC application for client governance and service-account validation.',
      protocol: 'OIDC' as const,
      access_type: 'CONFIDENTIAL' as const,
      standard_flow_enabled: true,
      direct_access_grants_enabled: false,
      service_account_enabled: false,
      redirect_uris: ['http://localhost:3004/developer-portal/*', 'http://127.0.0.1:3004/developer-portal/*'],
      base_url: 'http://localhost:3004/developer-portal',
      root_url: 'http://localhost:3004/developer-portal',
      default_scope_ids: [scopeIds.openid, scopeIds.profile, scopeIds.email, scopeIds.roles],
      optional_scope_ids: [scopeIds.groups],
    },
    {
      client_id: 'crew-web-demo',
      name: 'Crew Web Demo',
      summary: 'Crew browser application using the shared IDP for tenant-aware sign-in and authorization-code PKCE handoff.',
      protocol: 'OIDC' as const,
      access_type: 'PUBLIC' as const,
      standard_flow_enabled: true,
      direct_access_grants_enabled: true,
      service_account_enabled: false,
      redirect_uris: [
        'http://localhost:3000/*',
        'http://127.0.0.1:3000/*',
      ],
      base_url: 'http://localhost:3000',
      root_url: 'http://localhost:3000',
      default_scope_ids: [scopeIds.openid, scopeIds.profile, scopeIds.email, scopeIds.roles],
      optional_scope_ids: [scopeIds.groups],
    },
    {
      client_id: 'commercial-web-demo',
      name: 'Commercial Web Demo',
      summary: 'Commercial browser application using the shared IDP for standalone tenant-aware sign-in and authorization-code PKCE handoff.',
      protocol: 'OIDC' as const,
      access_type: 'PUBLIC' as const,
      standard_flow_enabled: true,
      direct_access_grants_enabled: true,
      service_account_enabled: false,
      redirect_uris: [
        'http://localhost:4312/*',
        'http://127.0.0.1:4312/*',
      ],
      base_url: 'http://localhost:4312',
      root_url: 'http://localhost:4312',
      default_scope_ids: [scopeIds.openid, scopeIds.profile, scopeIds.email, scopeIds.roles],
      optional_scope_ids: [scopeIds.groups],
    },
    {
      client_id: 'rgp-web-demo',
      name: 'RGP Web Demo',
      summary: 'Request Governance Platform browser application using the shared IDP for standalone tenant-aware sign-in and authorization-code PKCE handoff.',
      protocol: 'OIDC' as const,
      access_type: 'PUBLIC' as const,
      standard_flow_enabled: true,
      direct_access_grants_enabled: true,
      service_account_enabled: false,
      redirect_uris: [
        'http://localhost:4331/*',
        'http://127.0.0.1:4331/*',
      ],
      base_url: 'http://localhost:4331',
      root_url: 'http://localhost:4331',
      default_scope_ids: [scopeIds.openid, scopeIds.profile, scopeIds.email, scopeIds.roles],
      optional_scope_ids: [scopeIds.groups],
    },
    {
      client_id: 'cms-rgp-service-demo',
      name: 'CMS RGP Service Demo',
      summary: 'Confidential OAuth client proving SaaS CMS service-to-service access into Request Governance Platform APIs.',
      protocol: 'OIDC' as const,
      access_type: 'CONFIDENTIAL' as const,
      standard_flow_enabled: false,
      direct_access_grants_enabled: false,
      service_account_enabled: true,
      redirect_uris: [],
      base_url: null,
      root_url: null,
      default_scope_ids: [scopeIds.roles],
      optional_scope_ids: [],
    },
    {
      client_id: 'rgp-api-demo',
      name: 'RGP API Demo',
      summary: 'Confidential OAuth client proving machine-to-machine authorization for Request Governance Platform integrations.',
      protocol: 'OIDC' as const,
      access_type: 'CONFIDENTIAL' as const,
      standard_flow_enabled: false,
      direct_access_grants_enabled: false,
      service_account_enabled: true,
      redirect_uris: [],
      base_url: null,
      root_url: null,
      default_scope_ids: [scopeIds.roles],
      optional_scope_ids: [],
    },
    {
      client_id: 'machine-api-demo',
      name: 'Machine API Demo',
      summary: 'Confidential OAuth client proving client-credentials and service-account flows.',
      protocol: 'OIDC' as const,
      access_type: 'CONFIDENTIAL' as const,
      standard_flow_enabled: false,
      direct_access_grants_enabled: false,
      service_account_enabled: true,
      redirect_uris: [],
      base_url: null,
      root_url: null,
      default_scope_ids: [scopeIds.roles],
      optional_scope_ids: [],
    },
    {
      client_id: 'saml-test-service-provider',
      name: 'SAML Test Service Provider',
      summary: 'Synthetic SAML service provider used for standalone federation and SP validation.',
      protocol: 'SAML' as const,
      access_type: 'CONFIDENTIAL' as const,
      standard_flow_enabled: false,
      direct_access_grants_enabled: true,
      service_account_enabled: false,
      redirect_uris: ['https://sp.example.local/acs'],
      base_url: 'https://sp.example.local',
      root_url: 'https://sp.example.local',
      default_scope_ids: [samlScopeId],
      optional_scope_ids: [],
    },
  ];

  defaultClientIds.forEach((clientSeed) => {
    const secret = clientSeed.access_type === 'CONFIDENTIAL' ? `StandaloneIAM!${clientSeed.client_id}!Secret2026` : null;
    const existingClient = runtime.clients.find((client) => (
      client.realm_id === realm.id &&
      client.client_id === clientSeed.client_id
    ));

    if (!existingClientIds.has(clientSeed.client_id)) {
      runtime.clients.push({
        id: nextUniqueId(`${realm.id}-${clientSeed.client_id}`, new Set(runtime.clients.map((client) => client.id)), 'iam-client'),
        realm_id: realm.id,
        client_id: clientSeed.client_id,
        name: clientSeed.name,
        summary: clientSeed.summary,
        protocol: clientSeed.protocol,
        access_type: clientSeed.access_type,
        status: 'ACTIVE',
        synthetic: true,
        redirect_uris: clientSeed.redirect_uris,
        base_url: clientSeed.base_url,
        root_url: clientSeed.root_url,
        default_scope_ids: clientSeed.default_scope_ids,
        optional_scope_ids: clientSeed.optional_scope_ids,
        direct_protocol_mapper_ids: [],
        standard_flow_enabled: clientSeed.standard_flow_enabled,
        direct_access_grants_enabled: clientSeed.direct_access_grants_enabled,
        service_account_enabled: clientSeed.service_account_enabled,
        secret_hash: secret ? hashSecret(secret) : null,
        secret_preview: secret ? `${secret.slice(0, 8)}…${secret.slice(-4)}` : null,
        created_at: createdAt,
        updated_at: createdAt,
        created_by_user_id: 'idp-super-admin',
        updated_by_user_id: 'idp-super-admin',
      });
      return;
    }

    if (!existingClient || !existingClient.synthetic) {
      return;
    }

    existingClient.name = clientSeed.name;
    existingClient.summary = clientSeed.summary;
    existingClient.protocol = clientSeed.protocol;
    existingClient.access_type = clientSeed.access_type;
    existingClient.redirect_uris = [...clientSeed.redirect_uris];
    existingClient.base_url = clientSeed.base_url;
    existingClient.root_url = clientSeed.root_url;
    existingClient.default_scope_ids = [...clientSeed.default_scope_ids];
    existingClient.optional_scope_ids = [...clientSeed.optional_scope_ids];
    existingClient.standard_flow_enabled = clientSeed.standard_flow_enabled;
    existingClient.direct_access_grants_enabled = clientSeed.direct_access_grants_enabled;
    existingClient.service_account_enabled = clientSeed.service_account_enabled;
    if (!secret) {
      existingClient.secret_hash = null;
      existingClient.secret_preview = null;
    } else {
      const secretPreview = `${secret.slice(0, 8)}…${secret.slice(-4)}`;
      if (!existingClient.secret_hash || !verifySecretHash(existingClient.secret_hash, secret).valid) {
        existingClient.secret_hash = hashSecret(secret);
      }
      existingClient.secret_preview = secretPreview;
    }
    existingClient.updated_at = createdAt;
    existingClient.updated_by_user_id = 'idp-super-admin';
  });

  runtime.clients
    .filter((client) => client.realm_id === realm.id)
    .forEach((client) => {
      synchronizeSyntheticClientSecret(client);
    });

  const realmUsers = allUsers.filter((user) => user.realm_id === realm.id);
  realmUsers.forEach((user) => {
    if (existingCredentials.has(user.id)) {
      return;
    }

    runtime.user_credentials.push({
      user_id: user.id,
      realm_id: realm.id,
      password_hash: hashSecret(defaultPasswordForUser(user)),
      synthetic: true,
      updated_at: createdAt,
    });
  });

  runtime.clients
    .filter((client) => client.realm_id === realm.id && client.service_account_enabled)
    .forEach((client) => {
      ensureServiceAccount(runtime, client, allRoles, createdAt);
    });
}

function defaultPasswordForUser(user: IamUserRecord): string {
  const userEnvToken = envKeyToken(user.username || user.email || user.id);
  const configuredPassword = readCompatibilityBootstrapPassword(userEnvToken);
  if (configuredPassword) {
    return configuredPassword;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `Missing bootstrap IAM password for ${user.username || user.email}. Set IDP_IAM_BOOTSTRAP_PASSWORD_${userEnvToken}.`,
    );
  }

  switch (user.email) {
    case 'admin@idp.local':
      return 'StandaloneIAM!SuperAdmin2026';
    case 'admin@flightos.local':
      return 'FlightOS!SuperAdmin2026';
    case 'sarah.chen@democorp.com':
      return 'FlightOS!DemoAdmin2026';
    case 'miguel.alvarez@cityops.gov':
      return 'FlightOS!CityDispatch2026';
    case 'alex.morgan@northstar.example':
      return 'StandaloneIAM!TenantAdmin2026';
    case 'jordan.lee@civic.example':
      return 'StandaloneIAM!ServiceOperator2026';
    case 'samir.patel@innovation.example':
      return 'StandaloneIAM!ResearchLead2026';
    default:
      break;
  }

  switch (user.username) {
    case 'platform.admin':
      return 'StandaloneIAM!PlatformAdmin2026';
    case 'developer.admin':
      return 'StandaloneIAM!DeveloperAdmin2026';
    case 'developer.operator':
      return 'StandaloneIAM!DeveloperOperator2026';
    case 'cms.admin':
      return 'StandaloneIAM!CmsAdmin2026';
    case 'cms.editor':
      return 'StandaloneIAM!CmsEditor2026';
    case 'partner.admin':
      return 'StandaloneIAM!PartnerAdmin2026';
    case 'partner.embedded':
      return 'StandaloneIAM!PartnerEmbedded2026';
    case 'training.instructor':
      return 'StandaloneIAM!Instructor2026';
    case 'training.learner':
      return 'StandaloneIAM!Learner2026';
    default:
      return `StandaloneIAM!${slugify(user.username || user.email || user.id)}!2026`;
  }
}

function ensureUserCredentialRecord(
  user: IamUserRecord,
  options?: {
    password?: string;
    synthetic?: boolean;
  },
): StoredIamUserCredential {
  const credentials = userCredentialRepository.load();
  const existing = credentials.find((candidate) => candidate.realm_id === user.realm_id && candidate.user_id === user.id);
  if (existing) {
    const nextPassword = options?.password ?? (existing.synthetic ? defaultPasswordForUser(user) : null);
    const shouldRotateSyntheticCredential = Boolean(
      nextPassword
      && existing.synthetic
      && !verifySecretHash(existing.password_hash, nextPassword).valid,
    );

    if (options?.password || shouldRotateSyntheticCredential) {
      existing.password_hash = hashSecret(nextPassword!);
      existing.synthetic = options?.synthetic ?? existing.synthetic;
      existing.updated_at = nowIso();
      persistStateSyncOnly();
    }
    return existing;
  }

  const record: StoredIamUserCredential = {
    user_id: user.id,
    realm_id: user.realm_id,
    password_hash: hashSecret(options?.password ?? defaultPasswordForUser(user)),
    synthetic: options?.synthetic ?? user.synthetic,
    updated_at: nowIso(),
  };
  credentials.push(record);
  persistStateSyncOnly();
  return record;
}

function defaultSecretForSyntheticClient(client: StoredIamClient): string | null {
  if (!client.synthetic || client.access_type !== 'CONFIDENTIAL') {
    return null;
  }
  const clientEnvToken = envKeyToken(client.client_id);
  const configuredSecret = readCompatibilitySyntheticClientSecret(clientEnvToken);
  if (configuredSecret) {
    return configuredSecret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `Missing synthetic IAM client secret for ${client.client_id}. Set IDP_IAM_SYNTHETIC_CLIENT_SECRET_${clientEnvToken}.`,
    );
  }
  return `StandaloneIAM!${client.client_id}!Secret2026`;
}

function synchronizeSyntheticClientSecret(client: StoredIamClient) {
  const cacheKey = `${client.realm_id}:${client.id}`;
  const secret = defaultSecretForSyntheticClient(client);
  if (!secret) {
    syntheticSecretHashVerificationCache.delete(cacheKey);
    return;
  }

  const nextPreview = `${secret.slice(0, 8)}…${secret.slice(-4)}`;
  const secretFingerprint = createHash('sha256').update(secret).digest('base64url');
  if (
    syntheticSecretHashVerificationCache.get(cacheKey) === secretFingerprint
    && client.secret_hash
    && client.secret_preview === nextPreview
  ) {
    return;
  }

  const secretMatches = client.secret_hash ? verifySecretHash(client.secret_hash, secret).valid : false;
  if (secretMatches && client.secret_preview === nextPreview) {
    syntheticSecretHashVerificationCache.set(cacheKey, secretFingerprint);
    return;
  }

  client.secret_hash = hashSecret(secret);
  client.secret_preview = nextPreview;
  client.updated_at = nowIso();
  persistStateSyncOnly();
  syntheticSecretHashVerificationCache.set(cacheKey, secretFingerprint);
}

function resolveClientScopedRoleIds(
  allRoles: IamRoleRecord[],
  realmId: string,
  clientId: string,
  roleNames: string[],
) {
  const normalizedRoleNames = new Set(roleNames.map((roleName) => roleName.trim().toLowerCase()).filter(Boolean));
  return allRoles
    .filter((role) =>
      role.realm_id === realmId &&
      role.client_id === clientId &&
      normalizedRoleNames.has(role.name.trim().toLowerCase()),
    )
    .map((role) => role.id);
}

function defaultRoleIdsForServiceAccount(
  realmId: string,
  clientId: string,
  allRoles: IamRoleRecord[],
) {
  if (realmId === 'realm-idp-default' && clientId === 'machine-api-demo') {
    return resolveClientScopedRoleIds(allRoles, realmId, clientId, ['service-account-admin']);
  }

  if (realmId === 'realm-developer-validation' && clientId === 'machine-api-demo') {
    return resolveClientScopedRoleIds(allRoles, realmId, clientId, ['service-account-operator']);
  }

  if (realmId === 'realm-rgp-validation' && clientId === 'rgp-api-demo') {
    return resolveClientScopedRoleIds(allRoles, realmId, clientId, ['workflow-service-admin']);
  }

  if (realmId === 'realm-rgp-validation' && clientId === 'cms-rgp-service-demo') {
    return resolveClientScopedRoleIds(allRoles, realmId, 'rgp-api-demo', ['workflow-service-writer', 'workflow-service-reader']);
  }

  return [];
}

function ensureClientScope(
  runtime: IamProtocolRuntimeState,
  realmId: string,
  seed: Omit<IamClientScopeRecord, 'id' | 'realm_id' | 'protocol_mapper_ids' | 'assigned_client_ids' | 'created_at' | 'updated_at' | 'created_by_user_id' | 'updated_by_user_id'>,
  existingScopeNames: Set<string>,
  createdAt: string,
): string {
  const existing = runtime.client_scopes.find((scope) => scope.realm_id === realmId && scope.name === seed.name);
  if (existing) {
    return existing.id;
  }

  const id = nextUniqueId(`${realmId}-${seed.name}`, new Set(runtime.client_scopes.map((scope) => scope.id)), 'iam-scope');
  existingScopeNames.add(seed.name);
  runtime.client_scopes.push({
    id,
    realm_id: realmId,
    name: seed.name,
    description: seed.description,
    protocol: seed.protocol,
    assignment_type: seed.assignment_type,
    status: seed.status,
    synthetic: seed.synthetic,
    protocol_mapper_ids: [],
    assigned_client_ids: [],
    created_at: createdAt,
    updated_at: createdAt,
    created_by_user_id: 'idp-super-admin',
    updated_by_user_id: 'idp-super-admin',
  });
  return id;
}

function ensureMapper(
  runtime: IamProtocolRuntimeState,
  realmId: string,
  seed: Omit<IamProtocolMapperRecord, 'id' | 'realm_id' | 'created_at' | 'updated_at' | 'created_by_user_id' | 'updated_by_user_id'>,
  existingMapperKeys: Set<string>,
  createdAt: string,
): string {
  const key = `${seed.target_kind}:${seed.target_id}:${seed.name}`;
  const existing = runtime.protocol_mappers.find((mapper) => mapper.realm_id === realmId && mapper.target_kind === seed.target_kind && mapper.target_id === seed.target_id && mapper.name === seed.name);
  if (existing) {
    if (existing.synthetic) {
      existing.protocol = seed.protocol;
      existing.source_kind = seed.source_kind;
      existing.claim_name = seed.claim_name;
      existing.user_property = seed.user_property;
      existing.static_value = seed.static_value;
      existing.multivalued = seed.multivalued;
      existing.include_in_access_token = seed.include_in_access_token;
      existing.include_in_id_token = seed.include_in_id_token;
      existing.include_in_userinfo = seed.include_in_userinfo;
      existing.status = seed.status;
      existing.updated_at = createdAt;
      existing.updated_by_user_id = 'idp-super-admin';
    }
    return existing.id;
  }

  const id = nextUniqueId(`${realmId}-${seed.name}`, new Set(runtime.protocol_mappers.map((mapper) => mapper.id)), 'iam-mapper');
  existingMapperKeys.add(key);
  runtime.protocol_mappers.push({
    id,
    realm_id: realmId,
    name: seed.name,
    protocol: seed.protocol,
    target_kind: seed.target_kind,
    target_id: seed.target_id,
    source_kind: seed.source_kind,
    claim_name: seed.claim_name,
    user_property: seed.user_property,
    static_value: seed.static_value,
    multivalued: seed.multivalued,
    include_in_access_token: seed.include_in_access_token,
    include_in_id_token: seed.include_in_id_token,
    include_in_userinfo: seed.include_in_userinfo,
    status: seed.status,
    synthetic: seed.synthetic,
    created_at: createdAt,
    updated_at: createdAt,
    created_by_user_id: 'idp-super-admin',
    updated_by_user_id: 'idp-super-admin',
  });
  return id;
}

function assignMapperIds(runtime: IamProtocolRuntimeState, scopeId: string, mapperIds: string[]) {
  const scope = runtime.client_scopes.find((candidate) => candidate.id === scopeId);
  if (!scope) {
    return;
  }
  scope.protocol_mapper_ids = Array.from(new Set([...(scope.protocol_mapper_ids ?? []), ...mapperIds]));
}

function ensureServiceAccount(
  runtime: IamProtocolRuntimeState,
  client: StoredIamClient,
  allRoles: IamRoleRecord[],
  createdAt: string,
) {
  const defaultRoleIds = defaultRoleIdsForServiceAccount(client.realm_id, client.client_id, allRoles);
  const existing = runtime.service_accounts.find((account) => account.client_id === client.client_id && account.realm_id === client.realm_id);
  if (existing) {
    if (existing.role_ids.length === 0 && defaultRoleIds.length > 0) {
      existing.role_ids = Array.from(new Set(defaultRoleIds));
      existing.updated_at = nowIso();
      persistStateSyncOnly();
    }
    return existing;
  }

  const serviceAccountRoles = allRoles
    .filter((role) => role.realm_id === client.realm_id && role.client_id === client.client_id)
    .map((role) => role.id);

  const account: IamServiceAccountRecord = {
    id: nextUniqueId(`${client.realm_id}-${client.client_id}-service-account`, new Set(runtime.service_accounts.map((record) => record.id)), 'iam-service-account'),
    realm_id: client.realm_id,
    client_id: client.client_id,
    username: `service-account-${client.client_id}`,
    role_ids: Array.from(new Set(defaultRoleIds.length > 0 ? defaultRoleIds : serviceAccountRoles)),
    status: 'ACTIVE',
    synthetic: true,
    created_at: createdAt,
    updated_at: createdAt,
  };
  runtime.service_accounts.push(account);
  return account;
}

function toPublicClient(client: StoredIamClient): IamClientRecord {
  return {
    id: client.id,
    realm_id: client.realm_id,
    client_id: client.client_id,
    name: client.name,
    summary: client.summary,
    protocol: client.protocol,
    access_type: client.access_type,
    status: client.status,
    synthetic: client.synthetic,
    redirect_uris: clone(client.redirect_uris),
    base_url: client.base_url,
    root_url: client.root_url,
    default_scope_ids: clone(client.default_scope_ids),
    optional_scope_ids: clone(client.optional_scope_ids),
    direct_protocol_mapper_ids: clone(client.direct_protocol_mapper_ids),
    standard_flow_enabled: client.standard_flow_enabled,
    direct_access_grants_enabled: client.direct_access_grants_enabled,
    service_account_enabled: client.service_account_enabled,
    secret_preview: client.secret_preview,
    created_at: client.created_at,
    updated_at: client.updated_at,
    created_by_user_id: client.created_by_user_id,
    updated_by_user_id: client.updated_by_user_id,
  };
}

function listRolesForRealm(realmId: string): IamRoleRecord[] {
  return LocalIamFoundationStore.listRoles({ realm_id: realmId }).roles;
}

function listGroupsForRealm(realmId: string): IamGroupRecord[] {
  return LocalIamFoundationStore.listGroups({ realm_id: realmId }).groups;
}

function listUsersForRealm(realmId: string): IamUserRecord[] {
  return LocalIamFoundationStore.listUsers({ realm_id: realmId }).users;
}

function assertRealmExists(realmId: string) {
  return LocalIamFoundationStore.getRealm(realmId);
}

function assertClientExists(clientId: string): StoredIamClient {
  const client = clientRepository.load().find((candidate) => candidate.id === clientId || candidate.client_id === clientId);
  if (!client) {
    throw new Error(`Unknown IAM client: ${clientId}`);
  }
  return client;
}

function assertRealmClientExists(realmId: string, clientId: string): StoredIamClient {
  const client = clientRepository.load().find(
    (candidate) => candidate.realm_id === realmId && (candidate.id === clientId || candidate.client_id === clientId),
  );
  if (!client) {
    throw new Error(`Unknown IAM client in realm ${realmId}: ${clientId}`);
  }
  return client;
}

function assertClientScopeExists(scopeId: string): IamClientScopeRecord {
  const scope = clientScopeRepository.load().find((candidate) => candidate.id === scopeId);
  if (!scope) {
    throw new Error(`Unknown IAM client scope: ${scopeId}`);
  }
  return scope;
}

function assertMapperExists(mapperId: string): IamProtocolMapperRecord {
  const mapper = protocolMapperRepository.load().find((candidate) => candidate.id === mapperId);
  if (!mapper) {
    throw new Error(`Unknown IAM protocol mapper: ${mapperId}`);
  }
  return mapper;
}

function assertServiceAccountExists(id: string): IamServiceAccountRecord {
  const account = serviceAccountRepository.load().find((candidate) => candidate.id === id);
  if (!account) {
    throw new Error(`Unknown IAM service account: ${id}`);
  }
  return account;
}

function ensureRealmScopedClientIds(realmId: string, clientIds: string[]) {
  clientIds.forEach((clientId) => {
    const client = assertClientExists(clientId);
    if (client.realm_id !== realmId) {
      throw new Error(`Client ${client.client_id} does not belong to realm ${realmId}`);
    }
  });
}

function ensureRealmScopedScopeIds(realmId: string, scopeIds: string[]) {
  scopeIds.forEach((scopeId) => {
    const scope = assertClientScopeExists(scopeId);
    if (scope.realm_id !== realmId) {
      throw new Error(`Scope ${scope.name} does not belong to realm ${realmId}`);
    }
  });
}

function ensureRealmScopedMapperIds(realmId: string, mapperIds: string[]) {
  mapperIds.forEach((mapperId) => {
    const mapper = assertMapperExists(mapperId);
    if (mapper.realm_id !== realmId) {
      throw new Error(`Mapper ${mapper.name} does not belong to realm ${realmId}`);
    }
  });
}

function ensureUniqueClientId(realmId: string, clientId: string, excludeId?: string) {
  if (clientRepository.load().some((client) => client.realm_id === realmId && client.client_id === clientId && client.id !== excludeId)) {
    throw new Error(`Client identifier already exists in realm ${realmId}: ${clientId}`);
  }
}

function ensureUniqueScopeName(realmId: string, name: string, excludeId?: string) {
  if (clientScopeRepository.load().some((scope) => scope.realm_id === realmId && scope.name === name && scope.id !== excludeId)) {
    throw new Error(`Client scope already exists in realm ${realmId}: ${name}`);
  }
}

function ensureUniqueMapperName(realmId: string, targetKind: 'CLIENT' | 'CLIENT_SCOPE', targetId: string, name: string, excludeId?: string) {
  if (
    protocolMapperRepository.load().some(
      (mapper) =>
        mapper.realm_id === realmId &&
        mapper.target_kind === targetKind &&
        mapper.target_id === targetId &&
        mapper.name === name &&
        mapper.id !== excludeId,
    )
  ) {
    throw new Error(`Protocol mapper already exists on target ${targetId}: ${name}`);
  }
}

function issueClientSecret(clientId: string): string {
  return `StandaloneIAM!${slugify(clientId) || 'client'}!${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function parseAuthorizationBasicHeader(value?: string | null): { clientId: string; clientSecret: string } | null {
  if (!value || !value.startsWith('Basic ')) {
    return null;
  }
  try {
    const [clientId, clientSecret] = Buffer.from(value.slice(6), 'base64').toString('utf8').split(':');
    if (!clientId || !clientSecret) {
      return null;
    }
    return { clientId, clientSecret };
  } catch {
    return null;
  }
}

function getActiveSigningKey(realmId: string | null): StoredIamSigningKey {
  const signingKeys = signingKeyRepository.load();
  const activeKey = signingKeys.find((key) => key.status === 'ACTIVE' && key.realm_id === realmId)
    ?? signingKeys.find((key) => key.status === 'ACTIVE' && key.realm_id === null)
    ?? (() => {
      const key = generateSigningKey(realmId);
      signingKeys.push(key);
      persistStateSyncOnly();
      return key;
    })();

  try {
    resolveSigningKeyPrivatePem(activeKey);
    return activeKey;
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      const detail = error instanceof Error && error.message.trim().length > 0
        ? error.message.trim()
        : 'Unknown secret-store decryption failure';
      throw new Error(`Active signing key ${activeKey.key_id} is unreadable. Manual rotation is required. ${detail}`);
    }

    // Local standalone environments may carry state encrypted with older development-only key material.
    activeKey.status = 'RETIRED';
    const replacementKey = generateSigningKey(activeKey.realm_id);
    signingKeys.unshift(replacementKey);
    persistStateSyncOnly();
    return replacementKey;
  }
}

function resolveSigningKeyPrivatePem(signingKey: StoredIamSigningKey): string {
  if (signingKey.private_key_reference_id) {
    const resolved = LocalSecretStore.getSecretValue(signingKey.private_key_reference_id);
    if (!resolved) {
      throw new Error(`Signing key private material is unavailable for key ${signingKey.key_id}`);
    }
    return resolved;
  }
  if (typeof signingKey.private_key_pem === 'string' && signingKey.private_key_pem.trim().length > 0) {
    const secretReference = LocalSecretStore.upsertOpaqueSecret({
      subjectType: 'iam_signing_key',
      subjectId: signingKey.id,
      kind: 'integration_credential',
      label: `IAM signing key ${signingKey.key_id}`,
      value: signingKey.private_key_pem,
      createdByUserId: 'idp-super-admin',
      preview: `iam_signing_key_${signingKey.key_id.slice(-6)}_****`,
    });
    signingKey.private_key_reference_id = secretReference.id;
    delete signingKey.private_key_pem;
    persistStateSyncOnly();
    return LocalSecretStore.getSecretValue(secretReference.id) as string;
  }
  throw new Error(`Signing key private material is unavailable for key ${signingKey.key_id}`);
}

function resolveSigningKeyPrivateObject(signingKey: StoredIamSigningKey) {
  const cacheKey = signingKey.key_id;
  const cachedKey = signingPrivateKeyCache.get(cacheKey);
  if (cachedKey) {
    return cachedKey;
  }

  const privateKeyObject = createPrivateKey(resolveSigningKeyPrivatePem(signingKey));
  signingPrivateKeyCache.set(cacheKey, privateKeyObject);
  return privateKeyObject;
}

function resolveSigningKeyPublicObject(signingKey: StoredIamSigningKey) {
  const cacheKey = signingKey.key_id;
  const cachedKey = signingPublicKeyCache.get(cacheKey);
  if (cachedKey) {
    return cachedKey;
  }

  const publicKeyObject = createPublicKey(signingKey.public_key_pem);
  signingPublicKeyCache.set(cacheKey, publicKeyObject);
  return publicKeyObject;
}

function buildJwt(payload: Record<string, unknown>, signingKey: StoredIamSigningKey): string {
  const header = {
    alg: signingKey.algorithm,
    typ: 'JWT',
    kid: signingKey.key_id,
  };
  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = sign('RSA-SHA256', Buffer.from(signingInput), resolveSigningKeyPrivateObject(signingKey));
  return `${signingInput}.${encodeBase64Url(signature)}`;
}

function decodeJwt(token: string): { header: Record<string, unknown>; payload: Record<string, unknown>; validSignature: boolean } | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = JSON.parse(decodeBase64Url(encodedHeader).toString('utf8')) as Record<string, unknown>;
    const payload = JSON.parse(decodeBase64Url(encodedPayload).toString('utf8')) as Record<string, unknown>;
    const keyId = typeof header.kid === 'string' ? header.kid : null;
    const key = signingKeyRepository.load().find((candidate) => candidate.key_id === keyId);
    const validSignature = key
      ? verify('RSA-SHA256', Buffer.from(`${encodedHeader}.${encodedPayload}`), resolveSigningKeyPublicObject(key), decodeBase64Url(encodedSignature))
      : false;
    return { header, payload, validSignature };
  } catch {
    return null;
  }
}

function parseStringArrayClaim(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(
    value
      .filter((candidate) => typeof candidate === 'string')
      .map((candidate) => candidate.trim())
      .filter(Boolean),
  ));
}

function resolveEffectiveRoleNames(realmId: string, roleIds: string[]): string[] {
  const rolesById = new Map(listRolesForRealm(realmId).map((role) => [role.id, role]));
  const resolved = new Set<string>();
  const visiting = new Set<string>();

  const visit = (roleId: string) => {
    if (visiting.has(roleId)) {
      return;
    }
    visiting.add(roleId);
    const role = rolesById.get(roleId);
    if (!role) {
      return;
    }
    resolved.add(role.name);
    if (role.kind === 'COMPOSITE_ROLE') {
      role.composite_role_ids.forEach(visit);
    }
    visiting.delete(roleId);
  };

  roleIds.forEach(visit);
  return Array.from(resolved).sort();
}

function buildPrincipalContext(subjectKind: IamSubjectKind, realmId: string, subjectId: string) {
  if (subjectKind === 'USER') {
    const user = listUsersForRealm(realmId).find((candidate) => candidate.id === subjectId);
    if (!user) {
      throw new Error(`Unknown user subject: ${subjectId}`);
    }
    if (user.status !== 'ACTIVE') {
      throw new Error(`User subject is not active: ${subjectId}`);
    }

    const groups = listGroupsForRealm(realmId).filter((group) => user.group_ids.includes(group.id));
    const roleIds = new Set<string>(user.role_ids);
    groups.forEach((group) => group.role_ids.forEach((roleId) => roleIds.add(roleId)));

    return {
      sub: user.id,
      username: user.username,
      user,
      groups,
      role_names: resolveEffectiveRoleNames(realmId, Array.from(roleIds)),
      group_names: groups.map((group) => group.name).sort(),
      service_account: null as IamServiceAccountRecord | null,
    };
  }

  const serviceAccount = serviceAccountRepository.load().find((candidate) => candidate.id === subjectId);
  if (!serviceAccount) {
    throw new Error(`Unknown service-account subject: ${subjectId}`);
  }
  if (serviceAccount.status !== 'ACTIVE') {
    throw new Error(`Service-account subject is not active: ${subjectId}`);
  }

  return {
    sub: serviceAccount.id,
    username: serviceAccount.username,
    user: null as IamUserRecord | null,
    groups: [] as IamGroupRecord[],
    role_names: resolveEffectiveRoleNames(realmId, serviceAccount.role_ids),
    group_names: [] as string[],
    service_account: serviceAccount,
  };
}

function applyMapperValue(
  mapper: IamProtocolMapperRecord,
  client: StoredIamClient,
  principal: ReturnType<typeof buildPrincipalContext>,
) {
  switch (mapper.source_kind) {
    case 'USER_PROPERTY':
      if (!principal.user || !mapper.user_property) {
        return null;
      }
      if ((principal.user as unknown as Record<string, unknown>)[mapper.user_property] !== undefined) {
        return (principal.user as unknown as Record<string, unknown>)[mapper.user_property] ?? null;
      }
      try {
        const profile = LocalIamUserProfileStore.getUserProfile(client.realm_id, principal.user.id, 'ADMIN');
        return profile.attributes[mapper.user_property] ?? null;
      } catch {
        return null;
      }
    case 'USERNAME':
      return principal.username;
    case 'SUBJECT_ID':
      return principal.sub;
    case 'REALM_ROLE_NAMES':
      return mapper.multivalued ? principal.role_names : principal.role_names.join(' ');
    case 'GROUP_NAMES':
      return mapper.multivalued ? principal.group_names : principal.group_names.join(' ');
    case 'STATIC_VALUE':
      if (mapper.multivalued) {
        return mapper.static_value ? mapper.static_value.split(',').map((value) => value.trim()).filter(Boolean) : [];
      }
      if (mapper.static_value === 'true') {
        return true;
      }
      if (mapper.static_value === 'false') {
        return false;
      }
      return mapper.static_value;
    case 'CLIENT_ID':
      return client.client_id;
    case 'SERVICE_ACCOUNT':
      return Boolean(principal.service_account);
    default:
      return null;
  }
}

function resolveClientScopes(client: StoredIamClient, requestedScopeNames: string[]): IamClientScopeRecord[] {
  const defaultScopes = client.default_scope_ids.map(assertClientScopeExists);
  const optionalScopes = client.optional_scope_ids.map(assertClientScopeExists);
  const requested = optionalScopes.filter((scope) => requestedScopeNames.includes(scope.name));
  return [...defaultScopes, ...requested];
}

function normalizeRequestedPurpose(value?: string | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized || null;
}

function resolveUserPropertyGovernance(
  realmId: string,
  propertyKey: string,
): IamUserProfileAttributeGovernance | null {
  const schema = LocalIamUserProfileStore.listSchemas({ realm_id: realmId }).schemas.find(
    (candidate) => candidate.realm_id === realmId,
  );
  const attribute = schema?.attributes.find((candidate) => candidate.key === propertyKey);
  if (attribute) {
    return {
      privacy_classification: attribute.privacy_classification,
      release_purposes: clone(attribute.release_purposes),
      consent_required: attribute.consent_required,
      minimization_posture: attribute.minimization_posture,
    };
  }
  return BUILTIN_USER_PROPERTY_GOVERNANCE[propertyKey] ?? null;
}

function shouldIncludeMapperInTarget(
  mapper: IamProtocolMapperRecord,
  target: IamClaimReleaseTarget,
  protocol: IamClientProtocol,
): boolean {
  if (protocol !== 'OIDC' || target === 'PROTOCOL') {
    return true;
  }
  if (target === 'ACCESS_TOKEN') {
    return mapper.include_in_access_token;
  }
  if (target === 'ID_TOKEN') {
    return mapper.include_in_id_token;
  }
  return mapper.include_in_userinfo;
}

function shouldReleaseUserPropertyClaim(
  realmId: string,
  mapper: IamProtocolMapperRecord,
  requestedPurpose?: string | null,
): boolean {
  if (mapper.source_kind !== 'USER_PROPERTY' || !mapper.user_property) {
    return true;
  }

  const attribute = resolveUserPropertyGovernance(realmId, mapper.user_property);
  if (!attribute) {
    return true;
  }

  if (attribute.consent_required) {
    return false;
  }

  const normalizedPurpose = normalizeRequestedPurpose(requestedPurpose);
  if (
    normalizedPurpose
    && attribute.release_purposes.length > 0
    && !attribute.release_purposes.includes(normalizedPurpose)
  ) {
    return false;
  }

  if (attribute.minimization_posture === 'STRICT') {
    return false;
  }

  return true;
}

function resolveClaimContext(
  client: StoredIamClient,
  subjectKind: IamSubjectKind,
  subjectId: string,
  requestedScopeNames: string[],
) {
  const principal = buildPrincipalContext(subjectKind, client.realm_id, subjectId);
  const scopes = resolveClientScopes(client, requestedScopeNames);
  const scopeNames = Array.from(new Set(scopes.map((scope) => scope.name)));
  const mapperIds = Array.from(
    new Set([
      ...client.direct_protocol_mapper_ids,
      ...scopes.flatMap((scope) => scope.protocol_mapper_ids),
    ]),
  );
  const mappers = mapperIds
    .map(assertMapperExists)
    .filter((mapper) => mapper.protocol === client.protocol && mapper.status === 'ACTIVE');
  return {
    principal,
    scopes,
    scopeNames,
    mappers,
  };
}

function buildMapperClaimsForTarget(
  client: StoredIamClient,
  principal: ReturnType<typeof buildPrincipalContext>,
  mappers: IamProtocolMapperRecord[],
  target: IamClaimReleaseTarget,
  requestedPurpose?: string | null,
): Record<string, unknown> {
  const claims: Record<string, unknown> = {};
  mappers.forEach((mapper) => {
    if (!shouldIncludeMapperInTarget(mapper, target, client.protocol)) {
      return;
    }
    if (principal.user) {
      const federationOverride = resolveFederatedClaimOverrideForUser({
        realm_id: client.realm_id,
        user_id: principal.user.id,
        target_claim: mapper.claim_name,
        target: target as IamFederationClaimReleaseTarget,
        requested_purpose: requestedPurpose,
      });
      if (federationOverride?.matched) {
        const value = federationOverride.released ? federationOverride.value : null;
        if (value !== null && value !== undefined && (!(Array.isArray(value)) || value.length > 0)) {
          claims[mapper.claim_name] = Array.isArray(value) ? clone(value) : value;
        }
        return;
      }
    }
    if (!shouldReleaseUserPropertyClaim(client.realm_id, mapper, requestedPurpose)) {
      return;
    }
    const value = applyMapperValue(mapper, client, principal);
    if (value !== null && value !== undefined && (!(Array.isArray(value)) || value.length > 0)) {
      claims[mapper.claim_name] = value;
    }
  });
  return claims;
}

function buildClaimsForClient(
  client: StoredIamClient,
  subjectKind: IamSubjectKind,
  subjectId: string,
  requestedScopeNames: string[],
  issuer: string,
  ttlSeconds: number,
  requestedPurpose?: string | null,
) {
  const { principal, scopes, scopeNames, mappers } = resolveClaimContext(client, subjectKind, subjectId, requestedScopeNames);
  const now = Math.floor(Date.now() / 1000);
  const accessTokenClaims: Record<string, unknown> = {
    iss: issuer,
    sub: principal.sub,
    aud: client.client_id,
    azp: client.client_id,
    typ: 'Bearer',
    iat: now,
    exp: now + ttlSeconds,
    scope: scopeNames.join(' '),
    realm_id: client.realm_id,
  };
  const idTokenClaims: Record<string, unknown> = {
    iss: issuer,
    sub: principal.sub,
    aud: client.client_id,
    azp: client.client_id,
    iat: now,
    exp: now + ttlSeconds,
    scope: scopeNames.join(' '),
    realm_id: client.realm_id,
  };
  const userinfoClaims: Record<string, unknown> = {
    sub: principal.sub,
  };

  if (client.protocol === 'OIDC') {
    Object.assign(
      accessTokenClaims,
      buildMapperClaimsForTarget(client, principal, mappers, 'ACCESS_TOKEN', requestedPurpose),
    );
    Object.assign(
      idTokenClaims,
      buildMapperClaimsForTarget(client, principal, mappers, 'ID_TOKEN', requestedPurpose),
    );
    Object.assign(
      userinfoClaims,
      buildMapperClaimsForTarget(client, principal, mappers, 'USERINFO', requestedPurpose),
    );
  } else {
    Object.assign(
      accessTokenClaims,
      buildMapperClaimsForTarget(client, principal, mappers, 'PROTOCOL', requestedPurpose),
    );
  }

  return {
    accessTokenClaims,
    idTokenClaims,
    userinfoClaims,
    scopeIds: scopes.map((scope) => scope.id),
    scopeNames,
    principal,
  };
}

function rebuildUserInfoClaimsForRecord(record: StoredIamIssuedToken): IamUserInfoResponse {
  const client = clientRepository.load().find(
    (candidate) => candidate.realm_id === record.realm_id && candidate.client_id === record.client_id,
  );
  if (!client) {
    return { sub: record.subject_id };
  }
  const { principal, mappers } = resolveClaimContext(
    client,
    record.subject_kind,
    record.subject_id,
    record.client_scope_names,
  );
  return {
    sub: principal.sub,
    ...buildMapperClaimsForTarget(
      client,
      principal,
      mappers,
      'USERINFO',
      record.requested_purpose,
    ),
  };
}

function validateClientSecret(client: StoredIamClient, suppliedSecret?: string | null): boolean {
  if (client.access_type === 'PUBLIC') {
    return true;
  }
  if (!client.secret_hash || !suppliedSecret) {
    return false;
  }
  const verification = verifySecretHash(client.secret_hash, suppliedSecret);
  if (verification.valid && verification.legacy) {
    client.secret_hash = hashSecret(suppliedSecret);
    client.updated_at = nowIso();
    persistStateSyncOnly();
  }
  return verification.valid;
}

function validateUserPassword(realmId: string, username: string, password: string): IamUserRecord {
  const user = listUsersForRealm(realmId).find((candidate) => candidate.username === username || candidate.email === username);
  if (!user) {
    throw new Error('Invalid user credentials');
  }
  const credential = userCredentialRepository.load().find((candidate) => candidate.realm_id === realmId && candidate.user_id === user.id);
  if (!credential) {
    throw new Error('Invalid user credentials');
  }
  const verification = verifySecretHash(credential.password_hash, password);
  if (!verification.valid) {
    throw new Error('Invalid user credentials');
  }
  if (verification.legacy) {
    credential.password_hash = hashSecret(password);
    credential.updated_at = nowIso();
    persistStateSyncOnly();
  }
  return user;
}

function parseRequestedScopeNames(rawScope?: string | null): string[] {
  return Array.from(new Set((rawScope ?? '').split(/\s+/).map((value) => value.trim()).filter(Boolean)));
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeBrowserSessionReference(browserSessionReference: string | null | undefined): string | null {
  const normalized = typeof browserSessionReference === 'string' ? browserSessionReference.trim() : '';
  if (!normalized) {
    return null;
  }
  const delimiterIndex = normalized.indexOf('.');
  return delimiterIndex >= 0 ? normalized.slice(0, delimiterIndex) : normalized;
}

function determineClientAuth(
  realmId: string,
  payload: Record<string, unknown>,
  authorizationHeader?: string | null,
): StoredIamClient {
  const basicAuth = parseAuthorizationBasicHeader(authorizationHeader);
  const bodyClientId = typeof payload.client_id === 'string' ? payload.client_id : null;
  const bodyClientSecret = typeof payload.client_secret === 'string' ? payload.client_secret : null;
  const requestedClientId = basicAuth?.clientId ?? bodyClientId;
  if (!requestedClientId) {
    throw new Error('Missing client credentials');
  }

  const client = clientRepository.load().find((candidate) => candidate.realm_id === realmId && candidate.client_id === requestedClientId);
  if (!client) {
    throw new Error(`Unknown client in realm ${realmId}: ${requestedClientId}`);
  }
  const suppliedSecret = basicAuth?.clientSecret ?? bodyClientSecret;
  if (!validateClientSecret(client, suppliedSecret)) {
    throw new Error('Invalid client credentials');
  }
  if (client.status !== 'ACTIVE') {
    throw new Error('Client is not active');
  }
  return client;
}

function issueTokensForPrincipal(
  client: StoredIamClient,
  subjectKind: IamSubjectKind,
  subjectId: string,
  requestedScopeNames: string[],
  issuer: string,
  grantType: IamTokenGrantType,
  options?: {
    nonce?: string | null;
    include_refresh_token?: boolean;
    additional_claims?: Record<string, unknown>;
    additional_scope_names?: string[];
    requested_purpose?: string | null;
    browser_session_id?: string | null;
  },
): IamTokenEndpointResponse {
  const signingKey = getActiveSigningKey(null);
  const accessTtlSeconds = 60 * 15;
  const refreshTtlSeconds = 60 * 60 * 12;
  const requestedPurpose = normalizeRequestedPurpose(options?.requested_purpose);
  const {
    accessTokenClaims,
    idTokenClaims,
    userinfoClaims,
    scopeIds,
    scopeNames,
    principal,
  } = buildClaimsForClient(client, subjectKind, subjectId, requestedScopeNames, issuer, accessTtlSeconds, requestedPurpose);
  const additionalScopeNames = uniqueStrings(options?.additional_scope_names ?? []);
  const effectiveScopeNames = Array.from(new Set([...scopeNames, ...additionalScopeNames]));
  const tokenId = `iam-token-${randomUUID()}`;
  accessTokenClaims.jti = tokenId;
  accessTokenClaims.scope = effectiveScopeNames.join(' ');
  if (options?.additional_claims) {
    Object.assign(accessTokenClaims, options.additional_claims);
  }
  const accessToken = buildJwt(accessTokenClaims, signingKey);

  const wantsOpenId = subjectKind === 'USER' && effectiveScopeNames.includes('openid') && client.protocol === 'OIDC';
  const issuesRefreshToken = options?.include_refresh_token ?? (grantType !== 'client_credentials');
  let refreshToken: string | null = null;
  if (issuesRefreshToken) {
    const refreshTokenId = `iam-refresh-${randomUUID()}`;
    const refreshClaims = {
      iss: issuer,
      sub: principal.sub,
      aud: client.client_id,
      azp: client.client_id,
      typ: 'Refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + refreshTtlSeconds,
      jti: refreshTokenId,
      realm_id: client.realm_id,
    };
    refreshToken = buildJwt(refreshClaims, signingKey);
  }

  const record: StoredIamIssuedToken = {
    id: tokenId,
    realm_id: client.realm_id,
    client_id: client.client_id,
    subject_kind: subjectKind,
    subject_id: subjectId,
    browser_session_id: normalizeBrowserSessionReference(options?.browser_session_id),
    grant_type: grantType,
    scope: effectiveScopeNames.join(' '),
    scope_ids: scopeIds,
    issued_at: nowIso(),
    expires_at: new Date(Date.now() + accessTtlSeconds * 1000).toISOString(),
    refresh_expires_at: issuesRefreshToken ? new Date(Date.now() + refreshTtlSeconds * 1000).toISOString() : null,
    status: 'ACTIVE',
    revoked_at: null,
    requested_purpose: requestedPurpose,
    access_token_hash: hashTokenFingerprint(accessToken),
    refresh_token_hash: refreshToken ? hashTokenFingerprint(refreshToken) : null,
    claims: accessTokenClaims,
    id_token_claims: idTokenClaims,
    userinfo_claims: userinfoClaims,
    client_scope_names: effectiveScopeNames,
  };
  const issuedTokens = issuedTokenRepository.load();
  issuedTokens.unshift(record);
  issuedTokenRepository.save(issuedTokens);
  issuedTokenById.set(issuedTokenIdIndexKey(record.realm_id, record.id), record);
  issuedTokenByAccessHash.set(issuedTokenIndexKey(record.realm_id, record.access_token_hash), record);
  if (record.refresh_token_hash) {
    issuedTokenByRefreshHash.set(issuedTokenIndexKey(record.realm_id, record.refresh_token_hash), record);
  }
  if (record.browser_session_id && !deferredPersistenceContext.getStore()) {
    LocalIamTokenOwnershipIndexStore.recordBrowserSessionIssuedTokenLink({
      realm_id: record.realm_id,
      browser_session_reference: record.browser_session_id,
      token_id: record.id,
      client_id: record.client_id,
      subject_kind: record.subject_kind,
      subject_id: record.subject_id,
    });
  }

  const response: IamTokenEndpointResponse = {
    access_token: accessToken,
    expires_in: accessTtlSeconds,
    token_type: 'Bearer',
    scope: effectiveScopeNames.join(' '),
  };
  if (issuesRefreshToken && refreshToken) {
    response.refresh_token = refreshToken;
    response.refresh_expires_in = refreshTtlSeconds;
  }

  if (wantsOpenId) {
    response.id_token = buildJwt({
      ...idTokenClaims,
      typ: 'ID',
      ...(options?.nonce ? { nonce: options.nonce } : {}),
    }, signingKey);
  }

  return response;
}

function revokeTokenRecord(record: StoredIamIssuedToken) {
  record.status = 'REVOKED';
  record.revoked_at = nowIso();
  if (record.browser_session_id) {
    LocalIamTokenOwnershipIndexStore.markTokenLinkTerminated(record.realm_id, record.id);
  }
}

function revokeTokenRecordAndCollectAccessTokenId(
  record: StoredIamIssuedToken,
  revokedAccessTokenIds: Set<string>,
): void {
  revokeTokenRecord(record);
  if (record.access_token_hash) {
    revokedAccessTokenIds.add(record.id);
  }
}

function resolveIssuedTokenRecordById(realmId: string, tokenId: string): StoredIamIssuedToken | null {
  return issuedTokenById.get(issuedTokenIdIndexKey(realmId, tokenId)) ?? null;
}

function currentIssuer(baseUrl: string, realmId: string): string {
  return `${baseUrl.replace(/\/$/, '')}/api/v1/iam/realms/${realmId}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseOptionalXmlAttribute(xml: string | null, attributeName: string): string | null {
  if (!xml) {
    return null;
  }
  const match = xml.match(new RegExp(`${attributeName}="([^"]+)"`));
  return match?.[1]?.trim() || null;
}

function parseOptionalXmlElementAttribute(
  xml: string | null,
  elementName: string,
  attributeName: string,
): string | null {
  if (!xml) {
    return null;
  }
  const elementMatch = xml.match(new RegExp(`<([A-Za-z0-9_]+:)?${elementName}\\b([^>]*)>`, 'i'));
  if (!elementMatch) {
    return null;
  }
  const attributeMatch = elementMatch[2]?.match(new RegExp(`${attributeName}="([^"]+)"`, 'i'));
  return attributeMatch?.[1]?.trim() || null;
}

function parseXmlElementTextValues(xml: string | null, elementName: string): string[] {
  if (!xml) {
    return [];
  }
  const pattern = new RegExp(`<([A-Za-z0-9_]+:)?${elementName}\\b[^>]*>([^<]+)</([A-Za-z0-9_]+:)?${elementName}>`, 'gi');
  const values: string[] = [];
  let match: RegExpExecArray | null = pattern.exec(xml);
  while (match) {
    const value = match[2]?.trim();
    if (value) {
      values.push(value);
    }
    match = pattern.exec(xml);
  }
  return values;
}

function decodeOptionalSamlRequestXml(rawValue?: string | null): string | null {
  const normalized = rawValue?.trim();
  if (!normalized) {
    return null;
  }
  try {
    return Buffer.from(normalized, 'base64').toString('utf8');
  } catch {
    return normalized;
  }
}

function samlAcsUrlForClient(client: StoredIamClient, issuer: string): string {
  return client.redirect_uris[0]?.trim()
    || client.base_url?.trim()
    || `${issuer}/protocol/saml/acs/${client.client_id}`;
}

function assertSupportedSamlServiceProviderProfile(client: StoredIamClient): void {
  const registeredRedirects = client.redirect_uris
    .map((uri) => uri.trim())
    .filter(Boolean);
  if (registeredRedirects.length === 0) {
    throw new Error('SAML client must declare at least one exact ACS redirect URI');
  }
  if (registeredRedirects.some((uri) => uri.includes('*'))) {
    throw new Error('Wildcard ACS redirect URIs are not supported for SAML clients');
  }
}

function resolveSupportedSamlRedirectUri(client: StoredIamClient, requestedUrl?: string | null): string | null {
  const normalizedRequested = requestedUrl?.trim();
  if (!normalizedRequested) {
    return null;
  }
  return client.redirect_uris
    .map((registeredUri) => registeredUri.trim())
    .find((registeredUri) => registeredUri === normalizedRequested) ?? null;
}

function samlLoginServiceUrl(issuer: string, clientId: string): string {
  return `${issuer}/protocol/saml/auth?client_id=${encodeURIComponent(clientId)}`;
}

function samlLogoutServiceUrl(issuer: string, clientId: string): string {
  return `${issuer}/protocol/saml/logout?client_id=${encodeURIComponent(clientId)}`;
}

function samlLogoutDestinationForClient(client: StoredIamClient): string {
  assertSupportedSamlServiceProviderProfile(client);
  return client.root_url?.trim()
    || client.base_url?.trim()
    || client.redirect_uris[0]?.trim()
    || client.client_id;
}

function supportedSamlRequestBindings(): IamSamlBinding[] {
  return ['REDIRECT'];
}

function supportedSamlResponseBindings(): IamSamlBinding[] {
  return ['POST'];
}

function assertSupportedSamlRequestId(requestId: string | null): string {
  const normalizedRequestId = requestId?.trim() || '';
  if (!normalizedRequestId) {
    throw new Error('SAML request_id is required for the current supported profile');
  }
  if (normalizedRequestId.length > 256) {
    throw new Error('SAML request_id exceeds the supported profile length limit');
  }
  return normalizedRequestId;
}

function assertSupportedSamlRequestProfile(
  client: StoredIamClient,
  requestXml: string | null,
  issuer: string,
): void {
  if (!requestXml) {
    return;
  }

  const requestedDestination = parseOptionalXmlAttribute(requestXml, 'Destination');
  if (requestedDestination && requestedDestination !== samlLoginServiceUrl(issuer, client.client_id)) {
    throw new Error('Unsupported SAML request destination for the current profile');
  }

  const protocolBinding = parseOptionalXmlAttribute(requestXml, 'ProtocolBinding');
  if (
    protocolBinding
    && protocolBinding !== 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST'
  ) {
    throw new Error(`Unsupported SAML response binding for the current profile: ${protocolBinding}`);
  }

  const isPassive = parseOptionalXmlAttribute(requestXml, 'IsPassive');
  if (isPassive === 'true') {
    throw new Error('Passive SAML authentication requests are not supported for the current profile');
  }

  const nameIdFormat = parseOptionalXmlElementAttribute(requestXml, 'NameIDPolicy', 'Format');
  if (
    nameIdFormat
    && nameIdFormat !== 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'
    && nameIdFormat !== 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified'
  ) {
    throw new Error(`Unsupported SAML NameIDPolicy format for the current profile: ${nameIdFormat}`);
  }

  const allowCreate = parseOptionalXmlElementAttribute(requestXml, 'NameIDPolicy', 'AllowCreate');
  if (allowCreate === 'true') {
    throw new Error('SAML NameIDPolicy AllowCreate=true is not supported for the current profile');
  }

  const requestedAuthnContextComparison = parseOptionalXmlElementAttribute(requestXml, 'RequestedAuthnContext', 'Comparison');
  if (
    requestedAuthnContextComparison
    && requestedAuthnContextComparison !== 'exact'
  ) {
    throw new Error(`Unsupported RequestedAuthnContext comparison for the current profile: ${requestedAuthnContextComparison}`);
  }

  const authnContextClassRefs = parseXmlElementTextValues(requestXml, 'AuthnContextClassRef');
  if (
    authnContextClassRefs.some(
      (value) => value !== 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
    )
  ) {
    throw new Error('Unsupported RequestedAuthnContext class for the current profile');
  }
}

function toPublicSamlAuthRequest(record: StoredIamSamlAuthRequest): IamSamlAuthRequestRecord {
  return {
    id: record.id,
    realm_id: record.realm_id,
    client_id: record.client_id,
    client_name: record.client_name,
    acs_url: record.acs_url,
    relay_state: record.relay_state,
    request_binding: record.request_binding,
    request_id: record.request_id,
    initiation_mode: record.initiation_mode,
    force_authn: record.force_authn,
    created_at: record.created_at,
    expires_at: record.expires_at,
    status: record.status,
  };
}

function buildSamlSessionAndResponse(input: {
  realm_id: string;
  client: StoredIamClient;
  user_id: string;
  browser_session_id: string;
  relay_state: string | null;
  acs_url: string;
  request_id: string | null;
  request_record_id?: string | null;
  base_url: string;
}): {
  session: StoredIamSamlSession;
  response: string;
  attributes: Record<string, unknown>;
} {
  const issuer = currentIssuer(input.base_url, input.realm_id);
  const signingKey = getActiveSigningKey(null);
  const { accessTokenClaims, principal } = buildClaimsForClient(
    input.client,
    'USER',
    input.user_id,
    ['saml-profile'],
    issuer,
    60 * 15,
  );
  const sessionIndex = `saml-session-${randomUUID()}`;
  const session: StoredIamSamlSession = {
    id: `iam-saml-session-${randomUUID()}`,
    realm_id: input.realm_id,
    client_id: input.client.client_id,
    user_id: input.user_id,
    browser_session_id: input.browser_session_id,
    session_index: sessionIndex,
    relay_state: input.relay_state,
    acs_url: input.acs_url,
    created_at: nowIso(),
    last_seen_at: nowIso(),
    terminated_at: null,
    status: 'ACTIVE',
  };
  const samlResponse = Buffer.from(buildSamlResponseXml({
    issuer,
    audience: input.client.client_id,
    acsUrl: input.acs_url,
    username: principal.username,
    sessionIndex,
    requestId: input.request_id ?? input.request_record_id ?? null,
    claims: accessTokenClaims,
    signingKey,
  })).toString('base64');
  return {
    session,
    response: samlResponse,
    attributes: accessTokenClaims,
  };
}

function toPublicSamlSession(record: StoredIamSamlSession): IamSamlSessionRecord {
  return clone(record);
}

function expireIssuedTokens(): number {
  const now = Date.now();
  let expiredIssuedTokenCount = 0;

  for (const record of issuedTokenRepository.load()) {
    if (record.status !== 'ACTIVE') {
      continue;
    }
    const accessExpired = Date.parse(record.expires_at) <= now;
    const refreshExpired = record.refresh_expires_at ? Date.parse(record.refresh_expires_at) <= now : false;
    if (!accessExpired && !refreshExpired) {
      continue;
    }
    record.status = 'EXPIRED';
    record.revoked_at = null;
    if (record.browser_session_id) {
      LocalIamTokenOwnershipIndexStore.markTokenLinkTerminated(record.realm_id, record.id);
    }
    expiredIssuedTokenCount += 1;
  }

  return expiredIssuedTokenCount;
}

function pruneIssuedTokens(): number {
  const now = Date.now();
  const originalCount = state.issued_tokens.length;
  state.issued_tokens = state.issued_tokens.filter((record) => shouldRetainIssuedToken(record, now));
  const prunedCount = originalCount - state.issued_tokens.length;
  if (prunedCount > 0) {
    rebuildIssuedTokenIndexes();
  }
  return prunedCount;
}

function expireSamlState(): number {
  const now = Date.now();
  let expiredSamlAuthRequestCount = 0;

  for (const request of samlAuthRequestRepository.load()) {
    if (request.status === 'PENDING' && Date.parse(request.expires_at) <= now) {
      request.status = 'EXPIRED';
      expiredSamlAuthRequestCount += 1;
    }
  }

  if (expiredSamlAuthRequestCount > 0) {
    persistStateSyncOnly();
  }

  return expiredSamlAuthRequestCount;
}

function assertActiveSamlRequest(realmId: string, requestId: string): StoredIamSamlAuthRequest {
  expireSamlState();
  const request = samlAuthRequestRepository.load().find(
    (candidate) => candidate.id === requestId && candidate.realm_id === realmId,
  );
  if (!request) {
    throw new Error('Unknown SAML authentication request');
  }
  if (request.status !== 'PENDING') {
    throw new Error('SAML authentication request is no longer active');
  }
  if (Date.parse(request.expires_at) <= Date.now()) {
    request.status = 'EXPIRED';
    persistStateSyncOnly();
    throw new Error('SAML authentication request has expired');
  }
  return request;
}

function assertSamlRequestExists(realmId: string, requestId: string): StoredIamSamlAuthRequest {
  expireSamlState();
  const request = samlAuthRequestRepository.load().find(
    (candidate) => candidate.id === requestId && candidate.realm_id === realmId,
  );
  if (!request) {
    throw new Error('Unknown SAML authentication request');
  }
  return request;
}

function resolveRequestedSamlAcsUrl(client: StoredIamClient, requestedAcsUrl?: string | null, issuer?: string): string {
  assertSupportedSamlServiceProviderProfile(client);
  const exactRequestedMatch = resolveSupportedSamlRedirectUri(client, requestedAcsUrl);
  if (requestedAcsUrl?.trim()) {
    if (!exactRequestedMatch) {
      throw new Error('ACS URL must exactly match a registered SAML client redirect URI');
    }
    return exactRequestedMatch;
  }
  return samlAcsUrlForClient(client, issuer ?? client.root_url ?? client.base_url ?? client.client_id);
}

function buildSamlAttributeXml(claims: Record<string, unknown>): string {
  return Object.entries(claims)
    .filter(([key]) => !['iss', 'sub', 'aud', 'azp', 'typ', 'iat', 'exp', 'scope', 'realm_id', 'jti', 'nonce'].includes(key))
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `<saml:Attribute Name="${escapeXml(key)}">${value.map((item) => `<saml:AttributeValue>${escapeXml(String(item))}</saml:AttributeValue>`).join('')}</saml:Attribute>`;
      }
      return `<saml:Attribute Name="${escapeXml(key)}"><saml:AttributeValue>${escapeXml(String(value))}</saml:AttributeValue></saml:Attribute>`;
    })
    .join('');
}

function buildSamlSigningKeyDescriptorXml(signingKey: StoredIamSigningKey): string {
  const jwk = resolveSigningKeyPublicObject(signingKey).export({ format: 'jwk' }) as JsonWebKey;
  const modulus = typeof jwk.n === 'string' ? jwk.n : '';
  const exponent = typeof jwk.e === 'string' ? jwk.e : '';
  return `<KeyDescriptor use="signing"><ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#"><ds:KeyName>${escapeXml(signingKey.key_id)}</ds:KeyName><ds:KeyValue><ds:RSAKeyValue><ds:Modulus>${escapeXml(modulus)}</ds:Modulus><ds:Exponent>${escapeXml(exponent)}</ds:Exponent></ds:RSAKeyValue></ds:KeyValue></ds:KeyInfo></KeyDescriptor>`;
}

function normalizeXmlForDigest(xml: string): string {
  return xml
    .trim()
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .replace(/\r\n/g, '\n');
}

function buildXmlSha256Digest(xml: string): string {
  return createHash('sha256').update(normalizeXmlForDigest(xml), 'utf8').digest('base64');
}

function normalizeReferencedXmlSegmentForDigest(xml: string): string {
  const withoutSignature = xml.replace(/<ds:Signature\b[\s\S]*?<\/ds:Signature>/, '');
  if (
    withoutSignature.startsWith('<samlp:Response')
    || withoutSignature.startsWith('<samlp:LogoutResponse')
  ) {
    return `<?xml version="1.0" encoding="UTF-8"?>${withoutSignature}`;
  }
  return withoutSignature;
}

function buildSignedInfoXml(references: Array<{ uri: string; digest_value: string }>): string {
  const referenceXml = references
    .map((reference) => `<ds:Reference URI="${escapeXml(reference.uri)}"><ds:Transforms><ds:Transform Algorithm="urn:idp:standalone:xml-normalize:v1"/></ds:Transforms><ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><ds:DigestValue>${escapeXml(reference.digest_value)}</ds:DigestValue></ds:Reference>`)
    .join('');
  return `<ds:SignedInfo><ds:CanonicalizationMethod Algorithm="urn:idp:standalone:xml-normalize:v1"/><ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>${referenceXml}</ds:SignedInfo>`;
}

function buildSamlSignatureXml(
  signingKey: StoredIamSigningKey,
  references: Array<{ uri: string; digest_value: string }>,
): string {
  const signedInfoXml = buildSignedInfoXml(references);
  const signatureValue = sign('RSA-SHA256', Buffer.from(signedInfoXml, 'utf8'), resolveSigningKeyPrivateObject(signingKey))
    .toString('base64');
  return `<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${signedInfoXml}<ds:SignatureValue>${escapeXml(signatureValue)}</ds:SignatureValue><ds:KeyInfo><ds:KeyName>${escapeXml(signingKey.key_id)}</ds:KeyName></ds:KeyInfo></ds:Signature>`;
}

function buildSamlResponseXml(input: {
  issuer: string;
  audience: string;
  acsUrl: string;
  username: string;
  sessionIndex: string;
  requestId: string | null;
  claims: Record<string, unknown>;
  signingKey: StoredIamSigningKey;
}): string {
  const now = nowIso();
  const notOnOrAfter = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const inResponseTo = input.requestId ? ` InResponseTo="${escapeXml(input.requestId)}"` : '';
  const attributeXml = buildSamlAttributeXml(input.claims);
  const responseId = `_${randomUUID()}`;
  const assertionId = `_${randomUUID()}`;
  const nameIdValue = typeof input.claims.NameID === 'string' && input.claims.NameID.trim().length > 0
    ? input.claims.NameID.trim()
    : input.username;
  const nameIdFormat = nameIdValue.includes('@')
    ? 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'
    : 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified';
  const assertionXml = `<saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="${assertionId}" IssueInstant="${now}" Version="2.0"><saml:Issuer>${escapeXml(input.issuer)}</saml:Issuer><saml:Subject><saml:NameID Format="${escapeXml(nameIdFormat)}">${escapeXml(nameIdValue)}</saml:NameID><saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer"><saml:SubjectConfirmationData Recipient="${escapeXml(input.acsUrl)}" NotOnOrAfter="${notOnOrAfter}"${inResponseTo}/></saml:SubjectConfirmation></saml:Subject><saml:Conditions NotBefore="${now}" NotOnOrAfter="${notOnOrAfter}"><saml:AudienceRestriction><saml:Audience>${escapeXml(input.audience)}</saml:Audience></saml:AudienceRestriction></saml:Conditions><saml:AuthnStatement SessionIndex="${escapeXml(input.sessionIndex)}" SessionNotOnOrAfter="${notOnOrAfter}" AuthnInstant="${now}"><saml:AuthnContext><saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef></saml:AuthnContext></saml:AuthnStatement><saml:AttributeStatement>${attributeXml}</saml:AttributeStatement></saml:Assertion>`;
  const responseWithoutSignature = `<?xml version="1.0" encoding="UTF-8"?><samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="${responseId}" Version="2.0" IssueInstant="${now}" Destination="${escapeXml(input.acsUrl)}"${inResponseTo}><saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${escapeXml(input.issuer)}</saml:Issuer><samlp:Status><samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/></samlp:Status>${assertionXml}</samlp:Response>`;
  const signatureXml = buildSamlSignatureXml(input.signingKey, [
    { uri: `#${responseId}`, digest_value: buildXmlSha256Digest(responseWithoutSignature) },
    { uri: `#${assertionId}`, digest_value: buildXmlSha256Digest(assertionXml) },
  ]);
  return responseWithoutSignature.replace('<samlp:Status>', `${signatureXml}<samlp:Status>`);
}

function buildSamlLogoutResponseXml(input: {
  issuer: string;
  destination: string;
  relayState: string | null;
  requestId: string | null;
  sessionIndex: string;
  signingKey: StoredIamSigningKey;
}): string {
  const logoutResponseId = `_${randomUUID()}`;
  const inResponseTo = input.requestId ? ` InResponseTo="${escapeXml(input.requestId)}"` : '';
  const responseWithoutSignature = `<?xml version="1.0" encoding="UTF-8"?><samlp:LogoutResponse xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="${logoutResponseId}" Version="2.0" IssueInstant="${nowIso()}" Destination="${escapeXml(input.destination)}"${inResponseTo}><saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${escapeXml(input.issuer)}</saml:Issuer><samlp:Status><samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/></samlp:Status><samlp:Extensions><idp:SessionIndex xmlns:idp="https://idp.local/iam">${escapeXml(input.sessionIndex)}</idp:SessionIndex>${input.relayState ? `<idp:RelayState xmlns:idp="https://idp.local/iam">${escapeXml(input.relayState)}</idp:RelayState>` : ''}</samlp:Extensions></samlp:LogoutResponse>`;
  const signatureXml = buildSamlSignatureXml(input.signingKey, [
    { uri: `#${logoutResponseId}`, digest_value: buildXmlSha256Digest(responseWithoutSignature) },
  ]);
  return responseWithoutSignature.replace('<samlp:Status>', `${signatureXml}<samlp:Status>`);
}

function extractXmlSegment(xml: string, startTag: string, endTag: string): string | null {
  const startIndex = xml.indexOf(startTag);
  if (startIndex < 0) {
    return null;
  }
  const endIndex = xml.indexOf(endTag, startIndex);
  if (endIndex < 0) {
    return null;
  }
  return xml.slice(startIndex, endIndex + endTag.length);
}

function extractXmlAttribute(xml: string, attributeName: string): string | null {
  const match = xml.match(new RegExp(`${attributeName}="([^"]+)"`));
  return match?.[1] ?? null;
}

function verifySignedInfoReferences(
  xml: string,
  signedInfoXml: string,
): boolean {
  const references = Array.from(
    signedInfoXml.matchAll(/<ds:Reference URI="(#_[^"]+)">[\s\S]*?<ds:DigestValue>([^<]+)<\/ds:DigestValue><\/ds:Reference>/g),
  ).map((match) => ({
    uri: match[1] ?? '',
    digestValue: match[2] ?? '',
  }));
  if (references.length === 0) {
    return false;
  }
  for (const reference of references) {
    const targetId = reference.uri.replace(/^#/, '');
    const targetTagMatch = xml.match(new RegExp(`<([a-zA-Z0-9:_-]+)[^>]*\\bID="${targetId}"[^>]*>`));
    if (!targetTagMatch) {
      return false;
    }
    const tagName = targetTagMatch[1]!;
    const segment = extractXmlSegment(xml, targetTagMatch[0], `</${tagName}>`);
    if (!segment) {
      return false;
    }
    if (buildXmlSha256Digest(normalizeReferencedXmlSegmentForDigest(segment)) !== reference.digestValue) {
      return false;
    }
  }
  return true;
}

function verifySamlSignatureEnvelopeXml(xml: string): {
  valid: boolean;
  signing_key_id: string | null;
  reference_count: number;
} {
  const signatureXml = extractXmlSegment(xml, '<ds:Signature', '</ds:Signature>');
  if (!signatureXml) {
    return {
      valid: false,
      signing_key_id: null,
      reference_count: 0,
    };
  }
  const signedInfoXml = extractXmlSegment(signatureXml, '<ds:SignedInfo>', '</ds:SignedInfo>');
  const signatureValue = extractXmlSegment(signatureXml, '<ds:SignatureValue>', '</ds:SignatureValue>')
    ?.replace('<ds:SignatureValue>', '')
    .replace('</ds:SignatureValue>', '')
    .trim() ?? null;
  const signingKeyId = extractXmlSegment(signatureXml, '<ds:KeyName>', '</ds:KeyName>')
    ?.replace('<ds:KeyName>', '')
    .replace('</ds:KeyName>', '')
    .trim() ?? null;
  const referenceCount = Array.from(signatureXml.matchAll(/<ds:Reference URI="/g)).length;
  if (!signedInfoXml || !signatureValue || !signingKeyId) {
    return {
      valid: false,
      signing_key_id: signingKeyId,
      reference_count: referenceCount,
    };
  }
  const signingKey = signingKeyRepository.load().find((candidate) => candidate.key_id === signingKeyId) ?? null;
  if (!signingKey) {
    return {
      valid: false,
      signing_key_id: signingKeyId,
      reference_count: referenceCount,
    };
  }
  const signatureMatches = verify(
    'RSA-SHA256',
    Buffer.from(signedInfoXml, 'utf8'),
    resolveSigningKeyPublicObject(signingKey),
    Buffer.from(signatureValue, 'base64'),
  );
  const digestMatches = verifySignedInfoReferences(xml, signedInfoXml);
  return {
    valid: signatureMatches && digestMatches,
    signing_key_id: signingKeyId,
    reference_count: referenceCount,
  };
}

export const LocalIamProtocolRuntimeStore = {
  getSummary(): IamProtocolSummary {
    ensureRealmSeeds();
    expireSamlState();
    const issuedTokens = issuedTokenRepository.load();
    const samlAuthRequests = samlAuthRequestRepository.load();
    const samlSessions = samlSessionRepository.load();
    return {
      client_count: clientRepository.load().length,
      client_scope_count: clientScopeRepository.load().length,
      protocol_mapper_count: protocolMapperRepository.load().length,
      service_account_count: serviceAccountRepository.load().length,
      issued_token_count: issuedTokens.length,
      active_signing_key_count: signingKeyRepository.load().filter((key) => key.status === 'ACTIVE').length,
      saml_auth_request_count: samlAuthRequests.length,
      active_saml_auth_request_count: samlAuthRequests.filter((request) => request.status === 'PENDING').length,
      saml_session_count: samlSessions.length,
      active_saml_session_count: samlSessions.filter((session) => session.status === 'ACTIVE').length,
    };
  },

  getRuntimeRepositoryStatus(): IamProtocolRuntimeRepositoryStatus {
    return {
      mode: {
        dual_write: runtimeRepositoryMode.dualWrite,
        read_v2: runtimeRepositoryMode.readV2,
        parity_sample_rate: runtimeRepositoryMode.paritySampleRate,
      },
      issued_tokens: issuedTokenRuntimeRepositoryStatus,
    };
  },

  async loadIssuedTokensStateAsync(): Promise<StoredIamIssuedToken[]> {
    return clone(await issuedTokenAsyncRepository.load());
  },

  async saveIssuedTokensStateAsync(nextState: StoredIamIssuedToken[]): Promise<void> {
    await issuedTokenAsyncRepository.save(clone(nextState));
    rebuildIssuedTokenIndexes();
  },

  async loadSigningKeysStateAsync(): Promise<StoredIamSigningKey[]> {
    return clone(await signingKeyAsyncRepository.load());
  },

  async saveSigningKeysStateAsync(nextState: StoredIamSigningKey[]): Promise<void> {
    await signingKeyAsyncRepository.save(clone(nextState));
  },

  runTransientStateMaintenance(): IamProtocolTransientStateMaintenanceResult {
    ensureRealmSeeds();
    const expiredIssuedTokenCount = expireIssuedTokens();
    const expiredSamlAuthRequestCount = expireSamlState();
    const prunedIssuedTokenCount = pruneIssuedTokens();
    if (expiredIssuedTokenCount > 0 || expiredSamlAuthRequestCount > 0 || prunedIssuedTokenCount > 0) {
      persistStateSyncOnly();
    }
    return {
      expired_issued_token_count: expiredIssuedTokenCount,
      expired_saml_auth_request_count: expiredSamlAuthRequestCount,
      pruned_issued_token_count: prunedIssuedTokenCount,
      total_mutated_count: expiredIssuedTokenCount + expiredSamlAuthRequestCount + prunedIssuedTokenCount,
    };
  },

  async runTransientStateMaintenanceAsync(): Promise<IamProtocolTransientStateMaintenanceResult> {
    return runWithDeferredPersistence(() => this.runTransientStateMaintenance());
  },

  ensureUserCredentialSyncOnly(user: IamUserRecord): {
    user_id: string;
    realm_id: string;
    updated_at: string;
    bootstrap_password: string;
  } {
    ensureRealmSeeds();
    const credential = ensureUserCredentialRecord(user);
    return {
      user_id: user.id,
      realm_id: user.realm_id,
      updated_at: credential.updated_at,
      bootstrap_password: defaultPasswordForUser(user),
    };
  },

  async ensureUserCredentialAsync(user: IamUserRecord): Promise<{
    user_id: string;
    realm_id: string;
    updated_at: string;
    bootstrap_password: string;
  }> {
    return runWithDeferredPersistence(() => this.ensureUserCredentialSyncOnly(user));
  },

  validateUserCredentials(realmId: string, username: string, password: string): IamUserRecord {
    ensureRealmSeeds();
    return clone(validateUserPassword(realmId, username, password));
  },

  setUserPasswordSyncOnly(realmId: string, userId: string, password: string): {
    user_id: string;
    realm_id: string;
    updated_at: string;
  } {
    ensureRealmSeeds();
    const user = listUsersForRealm(realmId).find((candidate) => candidate.id === userId);
    if (!user) {
      throw new Error(`Unknown user in realm ${realmId}: ${userId}`);
    }
    const credential = ensureUserCredentialRecord(user, {
      password,
      synthetic: false,
    });
    return {
      user_id: user.id,
      realm_id: user.realm_id,
      updated_at: credential.updated_at,
    };
  },

  async setUserPasswordAsync(realmId: string, userId: string, password: string): Promise<{
    user_id: string;
    realm_id: string;
    updated_at: string;
  }> {
    return runWithDeferredPersistence(() => this.setUserPasswordSyncOnly(realmId, userId, password));
  },

  listClients(
    filters?: { realm_id?: string | null; protocol?: IamClientProtocol | null },
    pagination?: IamListPagination,
  ): IamClientsResponse {
    ensureRealmSeeds();
    let clients = [...clientRepository.load()];
    if (filters?.realm_id) {
      clients = clients.filter((client) => client.realm_id === filters.realm_id);
    }
    if (filters?.protocol) {
      clients = clients.filter((client) => client.protocol === filters.protocol);
    }
    const pagedClients = paginateList(clients, pagination);
    return {
      generated_at: nowIso(),
      clients: pagedClients.data.map(toPublicClient),
      count: pagedClients.count,
      offset: pagedClients.offset,
      limit: pagedClients.limit,
      has_more: pagedClients.has_more,
    };
  },

  getClientById(clientId: string): IamClientRecord {
    ensureRealmSeeds();
    return toPublicClient(assertClientExists(clientId));
  },

  createClientSyncOnly(actorUserId: string, input: CreateIamClientRequest): IamClientSecretResponse {
    ensureRealmSeeds();
    assertRealmExists(input.realm_id);
    const clientId = input.client_id?.trim();
    const name = input.name?.trim();
    if (!clientId || !name) {
      throw new Error('Missing required client fields');
    }
    ensureUniqueClientId(input.realm_id, clientId);
    ensureRealmScopedScopeIds(input.realm_id, input.default_scope_ids ?? []);
    ensureRealmScopedScopeIds(input.realm_id, input.optional_scope_ids ?? []);
    ensureRealmScopedMapperIds(input.realm_id, input.direct_protocol_mapper_ids ?? []);
    const accessType = input.access_type ?? 'CONFIDENTIAL';
    const issuedSecret = accessType === 'CONFIDENTIAL' ? issueClientSecret(clientId) : null;
    const clients = clientRepository.load();
    const record: StoredIamClient = {
      id: nextUniqueId(`${input.realm_id}-${clientId}`, new Set(clients.map((client) => client.id)), 'iam-client'),
      realm_id: input.realm_id,
      client_id: clientId,
      name,
      summary: input.summary?.trim() || '',
      protocol: input.protocol ?? 'OIDC',
      access_type: accessType,
      status: input.status ?? 'ACTIVE',
      synthetic: false,
      redirect_uris: Array.from(new Set((input.redirect_uris ?? []).map((value) => value.trim()).filter(Boolean))),
      base_url: input.base_url?.trim() || null,
      root_url: input.root_url?.trim() || null,
      default_scope_ids: Array.from(new Set(input.default_scope_ids ?? [])),
      optional_scope_ids: Array.from(new Set(input.optional_scope_ids ?? [])),
      direct_protocol_mapper_ids: Array.from(new Set(input.direct_protocol_mapper_ids ?? [])),
      standard_flow_enabled: input.standard_flow_enabled ?? true,
      direct_access_grants_enabled: input.direct_access_grants_enabled ?? false,
      service_account_enabled: input.service_account_enabled ?? false,
      secret_hash: issuedSecret ? hashSecret(issuedSecret) : null,
      secret_preview: issuedSecret ? `${issuedSecret.slice(0, 8)}…${issuedSecret.slice(-4)}` : null,
      created_at: nowIso(),
      updated_at: nowIso(),
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    };
    clients.push(record);
    clientScopeRepository.load()
      .filter((scope) => [...record.default_scope_ids, ...record.optional_scope_ids].includes(scope.id))
      .forEach((scope) => {
        scope.assigned_client_ids = Array.from(new Set([...scope.assigned_client_ids, record.id]));
      });
    if (record.service_account_enabled) {
      ensureServiceAccount(protocolRuntimeStateRepository.load(), record, listRolesForRealm(record.realm_id), nowIso());
    }
    persistStateSyncOnly();
    return { client: toPublicClient(record), issued_client_secret: issuedSecret };
  },

  async createClientAsync(actorUserId: string, input: CreateIamClientRequest): Promise<IamClientSecretResponse> {
    return runWithDeferredPersistence(() => this.createClientSyncOnly(actorUserId, input));
  },

  updateClient(actorUserId: string, clientId: string, input: UpdateIamClientRequest): IamClientRecord {
    ensureRealmSeeds();
    const client = assertClientExists(clientId);
    if (input.name !== undefined) {
      const nextName = input.name.trim();
      if (!nextName) {
        throw new Error('Client name cannot be empty');
      }
      client.name = nextName;
    }
    if (input.summary !== undefined) {
      client.summary = input.summary.trim();
    }
    if (input.status) {
      client.status = input.status;
    }
    if (input.redirect_uris) {
      client.redirect_uris = Array.from(new Set(input.redirect_uris.map((value) => value.trim()).filter(Boolean)));
    }
    if (input.base_url !== undefined) {
      client.base_url = input.base_url?.trim() || null;
    }
    if (input.root_url !== undefined) {
      client.root_url = input.root_url?.trim() || null;
    }
    if (input.default_scope_ids) {
      ensureRealmScopedScopeIds(client.realm_id, input.default_scope_ids);
      client.default_scope_ids = Array.from(new Set(input.default_scope_ids));
    }
    if (input.optional_scope_ids) {
      ensureRealmScopedScopeIds(client.realm_id, input.optional_scope_ids);
      client.optional_scope_ids = Array.from(new Set(input.optional_scope_ids));
    }
    if (input.direct_protocol_mapper_ids) {
      ensureRealmScopedMapperIds(client.realm_id, input.direct_protocol_mapper_ids);
      client.direct_protocol_mapper_ids = Array.from(new Set(input.direct_protocol_mapper_ids));
    }
    if (typeof input.standard_flow_enabled === 'boolean') {
      client.standard_flow_enabled = input.standard_flow_enabled;
    }
    if (typeof input.direct_access_grants_enabled === 'boolean') {
      client.direct_access_grants_enabled = input.direct_access_grants_enabled;
    }
    if (typeof input.service_account_enabled === 'boolean') {
      client.service_account_enabled = input.service_account_enabled;
      if (client.service_account_enabled) {
        ensureServiceAccount(protocolRuntimeStateRepository.load(), client, listRolesForRealm(client.realm_id), nowIso());
      }
    }
    client.updated_at = nowIso();
    client.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return toPublicClient(client);
  },

  async updateClientAsync(actorUserId: string, clientId: string, input: UpdateIamClientRequest): Promise<IamClientRecord> {
    return runWithDeferredPersistence(() => this.updateClient(actorUserId, clientId, input));
  },

  rotateClientSecret(actorUserId: string, clientId: string): RotateIamClientSecretResponse {
    ensureRealmSeeds();
    const client = assertClientExists(clientId);
    if (client.access_type !== 'CONFIDENTIAL') {
      throw new Error('Only confidential clients can rotate secrets');
    }
    const secret = issueClientSecret(client.client_id);
    client.secret_hash = hashSecret(secret);
    client.secret_preview = `${secret.slice(0, 8)}…${secret.slice(-4)}`;
    client.updated_at = nowIso();
    client.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return {
      client: toPublicClient(client),
      issued_client_secret: secret,
    };
  },

  async rotateClientSecretAsync(actorUserId: string, clientId: string): Promise<RotateIamClientSecretResponse> {
    return runWithDeferredPersistence(() => this.rotateClientSecret(actorUserId, clientId));
  },

  listClientScopes(
    filters?: { realm_id?: string | null; protocol?: IamClientProtocol | null },
    pagination?: IamListPagination,
  ): IamClientScopesResponse {
    ensureRealmSeeds();
    let scopes = [...clientScopeRepository.load()];
    if (filters?.realm_id) {
      scopes = scopes.filter((scope) => scope.realm_id === filters.realm_id);
    }
    if (filters?.protocol) {
      scopes = scopes.filter((scope) => scope.protocol === filters.protocol);
    }
    const pagedScopes = paginateList(scopes, pagination);
    return {
      generated_at: nowIso(),
      client_scopes: clone(pagedScopes.data),
      count: pagedScopes.count,
      offset: pagedScopes.offset,
      limit: pagedScopes.limit,
      has_more: pagedScopes.has_more,
    };
  },

  createClientScope(actorUserId: string, input: CreateIamClientScopeRequest): IamClientScopeRecord {
    ensureRealmSeeds();
    assertRealmExists(input.realm_id);
    const name = input.name?.trim();
    if (!name) {
      throw new Error('Missing required field: name');
    }
    ensureUniqueScopeName(input.realm_id, name);
    ensureRealmScopedMapperIds(input.realm_id, input.protocol_mapper_ids ?? []);
    ensureRealmScopedClientIds(input.realm_id, input.assigned_client_ids ?? []);
    const scopes = clientScopeRepository.load();
    const record: IamClientScopeRecord = {
      id: nextUniqueId(`${input.realm_id}-${name}`, new Set(scopes.map((scope) => scope.id)), 'iam-scope'),
      realm_id: input.realm_id,
      name,
      description: input.description?.trim() || '',
      protocol: input.protocol ?? 'OIDC',
      assignment_type: input.assignment_type ?? 'DEFAULT',
      status: input.status ?? 'ACTIVE',
      synthetic: false,
      protocol_mapper_ids: Array.from(new Set(input.protocol_mapper_ids ?? [])),
      assigned_client_ids: Array.from(new Set(input.assigned_client_ids ?? [])),
      created_at: nowIso(),
      updated_at: nowIso(),
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    };
    scopes.push(record);
    persistStateSyncOnly();
    return clone(record);
  },

  async createClientScopeAsync(actorUserId: string, input: CreateIamClientScopeRequest): Promise<IamClientScopeRecord> {
    return runWithDeferredPersistence(() => this.createClientScope(actorUserId, input));
  },

  updateClientScope(actorUserId: string, scopeId: string, input: UpdateIamClientScopeRequest): IamClientScopeRecord {
    ensureRealmSeeds();
    const scope = assertClientScopeExists(scopeId);
    if (input.description !== undefined) {
      scope.description = input.description.trim();
    }
    if (input.status) {
      scope.status = input.status;
    }
    if (input.protocol_mapper_ids) {
      ensureRealmScopedMapperIds(scope.realm_id, input.protocol_mapper_ids);
      scope.protocol_mapper_ids = Array.from(new Set(input.protocol_mapper_ids));
    }
    if (input.assigned_client_ids) {
      ensureRealmScopedClientIds(scope.realm_id, input.assigned_client_ids);
      scope.assigned_client_ids = Array.from(new Set(input.assigned_client_ids));
    }
    scope.updated_at = nowIso();
    scope.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return clone(scope);
  },

  async updateClientScopeAsync(
    actorUserId: string,
    scopeId: string,
    input: UpdateIamClientScopeRequest,
  ): Promise<IamClientScopeRecord> {
    return runWithDeferredPersistence(() => this.updateClientScope(actorUserId, scopeId, input));
  },

  listProtocolMappers(filters?: {
    realm_id?: string | null;
    target_kind?: 'CLIENT' | 'CLIENT_SCOPE' | null;
    target_id?: string | null;
    protocol?: IamClientProtocol | null;
  }, pagination?: IamListPagination): IamProtocolMappersResponse {
    ensureRealmSeeds();
    let mappers = [...protocolMapperRepository.load()];
    if (filters?.realm_id) {
      mappers = mappers.filter((mapper) => mapper.realm_id === filters.realm_id);
    }
    if (filters?.target_kind) {
      mappers = mappers.filter((mapper) => mapper.target_kind === filters.target_kind);
    }
    if (filters?.target_id) {
      mappers = mappers.filter((mapper) => mapper.target_id === filters.target_id);
    }
    if (filters?.protocol) {
      mappers = mappers.filter((mapper) => mapper.protocol === filters.protocol);
    }
    const pagedMappers = paginateList(mappers, pagination);
    return {
      generated_at: nowIso(),
      protocol_mappers: clone(pagedMappers.data),
      count: pagedMappers.count,
      offset: pagedMappers.offset,
      limit: pagedMappers.limit,
      has_more: pagedMappers.has_more,
    };
  },

  createProtocolMapper(actorUserId: string, input: CreateIamProtocolMapperRequest): IamProtocolMapperRecord {
    ensureRealmSeeds();
    assertRealmExists(input.realm_id);
    const name = input.name?.trim();
    const claimName = input.claim_name?.trim();
    if (!name || !claimName) {
      throw new Error('Missing required mapper fields');
    }
    if (input.target_kind === 'CLIENT') {
      const client = assertClientExists(input.target_id);
      if (client.realm_id !== input.realm_id) {
        throw new Error('Target client must belong to the selected realm');
      }
    } else {
      const scope = assertClientScopeExists(input.target_id);
      if (scope.realm_id !== input.realm_id) {
        throw new Error('Target scope must belong to the selected realm');
      }
    }
    ensureUniqueMapperName(input.realm_id, input.target_kind, input.target_id, name);
    const mappers = protocolMapperRepository.load();
    const record: IamProtocolMapperRecord = {
      id: nextUniqueId(`${input.realm_id}-${name}`, new Set(mappers.map((mapper) => mapper.id)), 'iam-mapper'),
      realm_id: input.realm_id,
      name,
      protocol: input.protocol ?? 'OIDC',
      target_kind: input.target_kind,
      target_id: input.target_id,
      source_kind: input.source_kind,
      claim_name: claimName,
      user_property: input.user_property?.trim() || null,
      static_value: input.static_value?.trim() || null,
      multivalued: Boolean(input.multivalued),
      include_in_access_token: input.include_in_access_token ?? true,
      include_in_id_token: input.include_in_id_token ?? true,
      include_in_userinfo: input.include_in_userinfo ?? false,
      status: input.status ?? 'ACTIVE',
      synthetic: false,
      created_at: nowIso(),
      updated_at: nowIso(),
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    };
    mappers.push(record);
    if (record.target_kind === 'CLIENT_SCOPE') {
      const scope = assertClientScopeExists(record.target_id);
      scope.protocol_mapper_ids = Array.from(new Set([...scope.protocol_mapper_ids, record.id]));
    } else {
      const client = assertClientExists(record.target_id);
      client.direct_protocol_mapper_ids = Array.from(new Set([...client.direct_protocol_mapper_ids, record.id]));
    }
    persistStateSyncOnly();
    return clone(record);
  },

  async createProtocolMapperAsync(
    actorUserId: string,
    input: CreateIamProtocolMapperRequest,
  ): Promise<IamProtocolMapperRecord> {
    return runWithDeferredPersistence(() => this.createProtocolMapper(actorUserId, input));
  },

  updateProtocolMapper(actorUserId: string, mapperId: string, input: UpdateIamProtocolMapperRequest): IamProtocolMapperRecord {
    ensureRealmSeeds();
    const mapper = assertMapperExists(mapperId);
    if (input.name !== undefined) {
      const nextName = input.name.trim();
      if (!nextName) {
        throw new Error('Mapper name cannot be empty');
      }
      ensureUniqueMapperName(mapper.realm_id, mapper.target_kind, mapper.target_id, nextName, mapper.id);
      mapper.name = nextName;
    }
    if (input.claim_name !== undefined) {
      const nextClaimName = input.claim_name.trim();
      if (!nextClaimName) {
        throw new Error('Claim name cannot be empty');
      }
      mapper.claim_name = nextClaimName;
    }
    if (input.user_property !== undefined) {
      mapper.user_property = input.user_property?.trim() || null;
    }
    if (input.static_value !== undefined) {
      mapper.static_value = input.static_value?.trim() || null;
    }
    if (typeof input.multivalued === 'boolean') {
      mapper.multivalued = input.multivalued;
    }
    if (typeof input.include_in_access_token === 'boolean') {
      mapper.include_in_access_token = input.include_in_access_token;
    }
    if (typeof input.include_in_id_token === 'boolean') {
      mapper.include_in_id_token = input.include_in_id_token;
    }
    if (typeof input.include_in_userinfo === 'boolean') {
      mapper.include_in_userinfo = input.include_in_userinfo;
    }
    if (input.status) {
      mapper.status = input.status;
    }
    mapper.updated_at = nowIso();
    mapper.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return clone(mapper);
  },

  async updateProtocolMapperAsync(
    actorUserId: string,
    mapperId: string,
    input: UpdateIamProtocolMapperRequest,
  ): Promise<IamProtocolMapperRecord> {
    return runWithDeferredPersistence(() => this.updateProtocolMapper(actorUserId, mapperId, input));
  },

  listServiceAccounts(filters?: { realm_id?: string | null }, pagination?: IamListPagination): IamServiceAccountsResponse {
    ensureRealmSeeds();
    let accounts = [...serviceAccountRepository.load()];
    if (filters?.realm_id) {
      accounts = accounts.filter((account) => account.realm_id === filters.realm_id);
    }
    const pagedAccounts = paginateList(accounts, pagination);
    return {
      generated_at: nowIso(),
      service_accounts: clone(pagedAccounts.data),
      count: pagedAccounts.count,
      offset: pagedAccounts.offset,
      limit: pagedAccounts.limit,
      has_more: pagedAccounts.has_more,
    };
  },

  updateServiceAccount(_actorUserId: string, serviceAccountId: string, input: UpdateIamServiceAccountRequest): IamServiceAccountRecord {
    ensureRealmSeeds();
    const account = serviceAccountRepository.load().find((candidate) => candidate.id === serviceAccountId);
    if (!account) {
      throw new Error(`Unknown IAM service account: ${serviceAccountId}`);
    }

    if (input.role_ids) {
      const uniqueRoleIds = Array.from(new Set(input.role_ids.map((roleId) => roleId.trim()).filter(Boolean)));
      uniqueRoleIds.forEach((roleId) => {
        const role = LocalIamFoundationStore.getRoleById(roleId);
        if (role.realm_id !== account.realm_id) {
          throw new Error(`Role ${roleId} does not belong to realm ${account.realm_id}`);
        }
      });
      account.role_ids = uniqueRoleIds;
    }

    if (input.status) {
      account.status = input.status;
    }

    account.updated_at = nowIso();
    persistStateSyncOnly();
    return clone(account);
  },

  async updateServiceAccountAsync(
    actorUserId: string,
    serviceAccountId: string,
    input: UpdateIamServiceAccountRequest,
  ): Promise<IamServiceAccountRecord> {
    return runWithDeferredPersistence(() => this.updateServiceAccount(actorUserId, serviceAccountId, input));
  },

  listIssuedTokens(
    filters?: { realm_id?: string | null; client_id?: string | null },
    pagination?: IamListPagination,
  ): IamIssuedTokensResponse {
    ensureRealmSeeds();
    let tokens = [...issuedTokenRepository.load()];
    if (filters?.realm_id) {
      tokens = tokens.filter((token) => token.realm_id === filters.realm_id);
    }
    if (filters?.client_id) {
      tokens = tokens.filter((token) => token.client_id === filters.client_id);
    }
    const pagedTokens = paginateList(tokens, pagination);
    return {
      generated_at: nowIso(),
      issued_tokens: clone(pagedTokens.data.map(({
        access_token_hash: _accessTokenHash,
        refresh_token_hash: _refreshTokenHash,
        claims: _claims,
        id_token_claims: _idTokenClaims,
        userinfo_claims: _userinfoClaims,
        client_scope_names: _scopeNames,
        ...record
      }) => record)),
      count: pagedTokens.count,
      offset: pagedTokens.offset,
      limit: pagedTokens.limit,
      has_more: pagedTokens.has_more,
    };
  },

  getOidcDiscoveryDocument(realmId: string, baseUrl: string): IamOidcDiscoveryDocument {
    assertRealmExists(realmId);
    const issuer = currentIssuer(baseUrl, realmId);
    const scopeNames = clientScopeRepository.load().filter((scope) => scope.realm_id === realmId && scope.protocol === 'OIDC').map((scope) => scope.name);
    return {
      issuer,
      authorization_endpoint: `${issuer}/protocol/openid-connect/auth`,
      token_endpoint: `${issuer}/protocol/openid-connect/token`,
      userinfo_endpoint: `${issuer}/protocol/openid-connect/userinfo`,
      revocation_endpoint: `${issuer}/protocol/openid-connect/revoke`,
      introspection_endpoint: `${issuer}/protocol/openid-connect/token/introspect`,
      jwks_uri: `${issuer}/protocol/openid-connect/certs`,
      registration_endpoint: `${issuer}/clients-registrations/openid-connect`,
      device_authorization_endpoint: `${issuer}/protocol/openid-connect/auth/device`,
      backchannel_authentication_endpoint: `${issuer}/protocol/openid-connect/ext/ciba/auth`,
      pushed_authorization_request_endpoint: `${issuer}/protocol/openid-connect/ext/par/request`,
      grant_types_supported: [
        'authorization_code',
        'client_credentials',
        'password',
        'refresh_token',
        'urn:ietf:params:oauth:grant-type:device_code',
        'urn:openid:params:grant-type:ciba',
        'urn:ietf:params:oauth:grant-type:uma-ticket',
        'urn:ietf:params:oauth:grant-type:token-exchange',
      ],
      response_types_supported: ['code'],
      code_challenge_methods_supported: ['S256'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      scopes_supported: Array.from(new Set(scopeNames)).sort(),
      token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post', 'none'],
    };
  },

  getJwks(): IamJwksResponse {
    ensureRealmSeeds();
    return {
      keys: signingKeyRepository.load()
        .filter((key) => key.status === 'ACTIVE' || key.status === 'RETIRED')
        .map((key) => {
          const jwk = createPublicKey(key.public_key_pem).export({ format: 'jwk' }) as JsonWebKey;
          return {
            kid: key.key_id,
            kty: 'RSA',
            alg: 'RS256',
            use: 'sig',
            n: jwk.n!,
            e: jwk.e!,
          };
        }),
    };
  },

  issueTokenFromPayload(
    realmId: string,
    payload: Record<string, unknown>,
    authorizationHeader: string | null,
    baseUrl: string,
  ): IamTokenEndpointResponse {
    ensureRealmSeeds();
    assertRealmExists(realmId);
    const grantType = typeof payload.grant_type === 'string' ? payload.grant_type : null;
    if (!grantType || !['client_credentials', 'password', 'refresh_token'].includes(grantType)) {
      throw new Error('Unsupported grant_type');
    }
    const client = determineClientAuth(realmId, payload, authorizationHeader);
    const issuer = currentIssuer(baseUrl, realmId);

    if (grantType === 'client_credentials') {
      if (!client.service_account_enabled) {
        throw new Error('Client does not have service account enabled');
      }
      const serviceAccount = serviceAccountRepository.load().find((account) => account.realm_id === realmId && account.client_id === client.client_id);
      if (!serviceAccount || serviceAccount.status !== 'ACTIVE') {
        throw new Error('Service account is not active');
      }
      return issueTokensForPrincipal(
        client,
        'SERVICE_ACCOUNT',
        serviceAccount.id,
        parseRequestedScopeNames(payload.scope as string | undefined),
        issuer,
        'client_credentials',
        {
          requested_purpose: normalizeRequestedPurpose(payload.requested_purpose as string | undefined),
        },
      );
    }

    if (grantType === 'password') {
      if (!client.direct_access_grants_enabled) {
        throw new Error('Client does not allow direct access grants');
      }
      const username = typeof payload.username === 'string' ? payload.username : '';
      const password = typeof payload.password === 'string' ? payload.password : '';
      const user = validateUserPassword(realmId, username, password);
      return issueTokensForPrincipal(
        client,
        'USER',
        user.id,
        parseRequestedScopeNames(payload.scope as string | undefined),
        issuer,
        'password',
        {
          requested_purpose: normalizeRequestedPurpose(payload.requested_purpose as string | undefined),
        },
      );
    }

    const refreshToken = typeof payload.refresh_token === 'string' ? payload.refresh_token : null;
    if (!refreshToken) {
      throw new Error('Missing refresh_token');
    }
    const refreshTokenHash = hashTokenFingerprint(refreshToken);
    const existing = issuedTokenByRefreshHash.get(issuedTokenIndexKey(realmId, refreshTokenHash));
    if (!existing || existing.status === 'REVOKED') {
      throw new Error('Invalid refresh token');
    }
    if (existing.client_id !== client.client_id) {
      throw new Error('Invalid refresh token');
    }
    if (existing.refresh_expires_at && Date.parse(existing.refresh_expires_at) <= Date.now()) {
      existing.status = 'EXPIRED';
      existing.revoked_at = null;
      persistStateSyncOnly();
      throw new Error('Refresh token has expired');
    }
    return issueTokensForPrincipal(client, existing.subject_kind, existing.subject_id, existing.client_scope_names, issuer, 'refresh_token', {
      requested_purpose: existing.requested_purpose,
      browser_session_id: existing.browser_session_id,
    });
  },

  async issueTokenFromPayloadAsync(
    realmId: string,
    payload: Record<string, unknown>,
    authorizationHeader: string | null,
    baseUrl: string,
  ): Promise<IamTokenEndpointResponse> {
    const grantType = typeof payload.grant_type === 'string' ? payload.grant_type : null;
    const response = !useRuntimeRepositoryPath || grantType !== 'refresh_token'
      ? await runWithDeferredPersistence(() => this.issueTokenFromPayload(realmId, payload, authorizationHeader, baseUrl))
      : await runWithDeferredPersistence(async () => {
          ensureRealmSeeds();
          assertRealmExists(realmId);
          const client = determineClientAuth(realmId, payload, authorizationHeader);
          const issuer = currentIssuer(baseUrl, realmId);
          const refreshToken = typeof payload.refresh_token === 'string' ? payload.refresh_token : null;
          if (!refreshToken) {
            throw new Error('Missing refresh_token');
          }
          const refreshTokenHash = hashTokenFingerprint(refreshToken);
          const existing = await issuedTokenAsyncStore.getByRefreshHash(realmId, refreshTokenHash);
          if (!existing || existing.status === 'REVOKED') {
            throw new Error('Invalid refresh token');
          }
          if (existing.client_id !== client.client_id) {
            throw new Error('Invalid refresh token');
          }
          if (existing.refresh_expires_at && Date.parse(existing.refresh_expires_at) <= Date.now()) {
            existing.status = 'EXPIRED';
            existing.revoked_at = null;
            await issuedTokenAsyncStore.put(existing);
            throw new Error('Refresh token has expired');
          }
          return issueTokensForPrincipal(
            client,
            existing.subject_kind,
            existing.subject_id,
            existing.client_scope_names,
            issuer,
            'refresh_token',
            {
              requested_purpose: existing.requested_purpose,
              browser_session_id: existing.browser_session_id,
            },
          );
        });
    await syncIssuedTokenForAccessTokenAsync(realmId, response.access_token);
    scheduleIssuedTokenBrowserSessionOwnershipSync(realmId, response.access_token);
    return response;
  },

  introspectToken(
    realmId: string,
    payload: Record<string, unknown>,
    authorizationHeader: string | null,
  ): IamTokenIntrospectionResponse {
    ensureRealmSeeds();
    determineClientAuth(realmId, payload, authorizationHeader);
    const rawToken = typeof payload.token === 'string' ? payload.token : null;
    if (!rawToken) {
      throw new Error('Missing token');
    }
    const tokenHash = hashTokenFingerprint(rawToken);
    const decoded = decodeJwt(rawToken);
    const record = issuedTokenByAccessHash.get(issuedTokenIndexKey(realmId, tokenHash))
      ?? issuedTokenByRefreshHash.get(issuedTokenIndexKey(realmId, tokenHash));
    if (!decoded || !decoded.validSignature || !record || record.status === 'REVOKED') {
      return { active: false };
    }
    const now = Math.floor(Date.now() / 1000);
    const exp = typeof decoded.payload.exp === 'number' ? decoded.payload.exp : now - 1;
    if (exp <= now) {
      const isRefreshToken = record.refresh_token_hash === tokenHash;
      const refreshExpired = record.refresh_expires_at ? Date.parse(record.refresh_expires_at) <= Date.now() : true;
      if (isRefreshToken || refreshExpired) {
        record.status = 'EXPIRED';
        record.revoked_at = null;
        persistStateSyncOnly();
      }
      return { active: false };
    }
    return {
      active: true,
      client_id: record.client_id,
      username: buildPrincipalContext(record.subject_kind, record.realm_id, record.subject_id).username,
      sub: typeof decoded.payload.sub === 'string' ? decoded.payload.sub : undefined,
      scope: record.scope,
      requested_purpose: record.requested_purpose,
      token_type: 'Bearer',
      exp,
      iat: typeof decoded.payload.iat === 'number' ? decoded.payload.iat : undefined,
      aud: typeof decoded.payload.aud === 'string' || Array.isArray(decoded.payload.aud) ? decoded.payload.aud as string | string[] : undefined,
      iss: typeof decoded.payload.iss === 'string' ? decoded.payload.iss : undefined,
      realm_id: record.realm_id,
    };
  },

  async introspectTokenAsync(
    realmId: string,
    payload: Record<string, unknown>,
    authorizationHeader: string | null,
  ): Promise<IamTokenIntrospectionResponse> {
    if (!useRuntimeRepositoryPath) {
      return runWithDeferredPersistence(() => this.introspectToken(realmId, payload, authorizationHeader));
    }
    return runWithDeferredPersistence(async () => {
      ensureRealmSeeds();
      determineClientAuth(realmId, payload, authorizationHeader);
      const rawToken = typeof payload.token === 'string' ? payload.token : null;
      if (!rawToken) {
        throw new Error('Missing token');
      }
      const tokenHash = hashTokenFingerprint(rawToken);
      const decoded = decodeJwt(rawToken);
      const accessRecord = await issuedTokenAsyncStore.getByAccessHash(realmId, tokenHash);
      const record = accessRecord ?? await issuedTokenAsyncStore.getByRefreshHash(realmId, tokenHash);
      if (!decoded || !decoded.validSignature || !record || record.status === 'REVOKED') {
        return { active: false };
      }
      const now = Math.floor(Date.now() / 1000);
      const exp = typeof decoded.payload.exp === 'number' ? decoded.payload.exp : now - 1;
      if (exp <= now) {
        const isRefreshToken = !accessRecord;
        const refreshExpired = record.refresh_expires_at ? Date.parse(record.refresh_expires_at) <= Date.now() : true;
        if (isRefreshToken || refreshExpired) {
          record.status = 'EXPIRED';
          record.revoked_at = null;
          await issuedTokenAsyncStore.put(record);
        }
        return { active: false };
      }
      return {
        active: true,
        client_id: record.client_id,
        username: buildPrincipalContext(record.subject_kind, record.realm_id, record.subject_id).username,
        sub: typeof decoded.payload.sub === 'string' ? decoded.payload.sub : undefined,
        scope: record.scope,
        requested_purpose: record.requested_purpose,
        token_type: 'Bearer',
        exp,
        iat: typeof decoded.payload.iat === 'number' ? decoded.payload.iat : undefined,
        aud: typeof decoded.payload.aud === 'string' || Array.isArray(decoded.payload.aud)
          ? decoded.payload.aud as string | string[]
          : undefined,
        iss: typeof decoded.payload.iss === 'string' ? decoded.payload.iss : undefined,
        realm_id: record.realm_id,
      };
    });
  },

  resolveBearerAccessToken(bearerToken: string): IamResolvedBearerAccessToken {
    ensureRealmSeeds();
    const normalizedToken = bearerToken.trim();
    if (!normalizedToken) {
      throw new Error('Missing bearer token');
    }

    const decoded = decodeJwt(normalizedToken);
    if (!decoded || !decoded.validSignature) {
      throw new Error('Invalid bearer token');
    }

    const tokenHash = hashTokenFingerprint(normalizedToken);
    const decodedRealmId = typeof decoded.payload.realm_id === 'string' ? decoded.payload.realm_id : null;
    const record = decodedRealmId
      ? issuedTokenByAccessHash.get(issuedTokenIndexKey(decodedRealmId, tokenHash)) ?? null
      : issuedTokenRepository.load().find((candidate) => candidate.access_token_hash === tokenHash) ?? null;
    if (!record || record.status !== 'ACTIVE') {
      throw new Error('Invalid bearer token');
    }

    const now = Math.floor(Date.now() / 1000);
    const exp = typeof decoded.payload.exp === 'number' ? decoded.payload.exp : now - 1;
    if (exp <= now) {
      record.status = 'EXPIRED';
      record.revoked_at = null;
      persistStateSyncOnly();
      throw new Error('Bearer token expired');
    }

    buildPrincipalContext(record.subject_kind, record.realm_id, record.subject_id);

    return {
      token_id: record.id,
      realm_id: record.realm_id,
      client_id: record.client_id,
      subject_kind: record.subject_kind,
      subject_id: record.subject_id,
      scope: record.scope,
      scope_names: parseRequestedScopeNames(record.scope),
      realm_roles: parseStringArrayClaim(record.claims.realm_roles),
      groups: parseStringArrayClaim(record.claims.groups),
      claims: clone(record.claims),
      expires_at: record.expires_at,
      issued_at: record.issued_at,
    };
  },

  async resolveBearerAccessTokenAsync(bearerToken: string): Promise<IamResolvedBearerAccessToken> {
    if (!useRuntimeRepositoryPath) {
      return this.resolveBearerAccessToken(bearerToken);
    }
    return runWithDeferredPersistence(async () => {
      ensureRealmSeeds();
      const normalizedToken = bearerToken.trim();
      if (!normalizedToken) {
        throw new Error('Missing bearer token');
      }

      const decoded = decodeJwt(normalizedToken);
      if (!decoded || !decoded.validSignature) {
        throw new Error('Invalid bearer token');
      }

      const tokenHash = hashTokenFingerprint(normalizedToken);
      const decodedRealmId = typeof decoded.payload.realm_id === 'string' ? decoded.payload.realm_id : null;
      if (!decodedRealmId) {
        return this.resolveBearerAccessToken(normalizedToken);
      }
      const record = await issuedTokenAsyncStore.getByAccessHash(decodedRealmId, tokenHash);
      if (!record || record.status !== 'ACTIVE') {
        throw new Error('Invalid bearer token');
      }

      const now = Math.floor(Date.now() / 1000);
      const exp = typeof decoded.payload.exp === 'number' ? decoded.payload.exp : now - 1;
      if (exp <= now) {
        record.status = 'EXPIRED';
        record.revoked_at = null;
        await issuedTokenAsyncStore.put(record);
        throw new Error('Bearer token expired');
      }

      buildPrincipalContext(record.subject_kind, record.realm_id, record.subject_id);

      return {
        token_id: record.id,
        realm_id: record.realm_id,
        client_id: record.client_id,
        subject_kind: record.subject_kind,
        subject_id: record.subject_id,
        scope: record.scope,
        scope_names: parseRequestedScopeNames(record.scope),
        realm_roles: parseStringArrayClaim(record.claims.realm_roles),
        groups: parseStringArrayClaim(record.claims.groups),
        claims: clone(record.claims),
        expires_at: record.expires_at,
        issued_at: record.issued_at,
      };
    });
  },

  revokeToken(realmId: string, payload: Record<string, unknown>, authorizationHeader: string | null) {
    ensureRealmSeeds();
    determineClientAuth(realmId, payload, authorizationHeader);
    const rawToken = typeof payload.token === 'string' ? payload.token : null;
    if (!rawToken) {
      throw new Error('Missing token');
    }
    const tokenHash = hashTokenFingerprint(rawToken);
    const record = issuedTokenByAccessHash.get(issuedTokenIndexKey(realmId, tokenHash))
      ?? issuedTokenByRefreshHash.get(issuedTokenIndexKey(realmId, tokenHash));
    if (record) {
      revokeTokenRecord(record);
      persistStateSyncOnly();
    }
    return {
      revoked: Boolean(record),
      revoked_at: record?.revoked_at ?? null,
    };
  },

  async revokeTokenAsync(
    realmId: string,
    payload: Record<string, unknown>,
    authorizationHeader: string | null,
  ): Promise<{ revoked: boolean; revoked_at: string | null }> {
    const rawToken = typeof payload.token === 'string' ? payload.token.trim() : '';
    let resolvedToken: IamResolvedIssuedTokenRecord | null = null;
    if (rawToken && !useRuntimeRepositoryPath) {
      try {
        resolvedToken = this.resolveIssuedTokenForValue(realmId, rawToken);
      } catch {
        resolvedToken = null;
      }
    }
    const result = !useRuntimeRepositoryPath
      ? await runWithDeferredPersistence(() => this.revokeToken(realmId, payload, authorizationHeader))
      : await runWithDeferredPersistence(async () => {
          ensureRealmSeeds();
          determineClientAuth(realmId, payload, authorizationHeader);
          if (!rawToken) {
            throw new Error('Missing token');
          }
          if (!resolvedToken) {
            try {
              resolvedToken = await resolveIssuedTokenForValueAsync(realmId, rawToken);
            } catch {
              resolvedToken = null;
            }
          }
          if (!resolvedToken) {
            return {
              revoked: false,
              revoked_at: null,
            };
          }
          const record = await issuedTokenAsyncStore.getById(realmId, resolvedToken.id);
          if (!record || record.status !== 'ACTIVE') {
            return {
              revoked: false,
              revoked_at: record?.revoked_at ?? null,
            };
          }
          revokeTokenRecord(record);
          await issuedTokenAsyncStore.put(record);
          return {
            revoked: true,
            revoked_at: record.revoked_at,
          };
        });
    if (result.revoked && resolvedToken?.token_use === 'access_token') {
      const { LocalIamAdvancedOAuthRuntimeStore } = await import('./iamAdvancedOAuthRuntime');
      await LocalIamAdvancedOAuthRuntimeStore.terminateDerivedTokenExchangesForSubjectTokenAsync(
        realmId,
        resolvedToken.id,
        'REVOKED',
      );
    }
    return result;
  },

  revokeIssuedTokenByIdSyncOnly(
    realmId: string,
    tokenId: string,
  ): { revoked: boolean; revoked_at: string | null } {
    ensureRealmSeeds();
    const record = resolveIssuedTokenRecordById(realmId, tokenId);
    if (!record || record.status !== 'ACTIVE') {
      return {
        revoked: false,
        revoked_at: record?.revoked_at ?? null,
      };
    }
    revokeTokenRecord(record);
    persistStateSyncOnly();
    return {
      revoked: true,
      revoked_at: record.revoked_at,
    };
  },

  async revokeIssuedTokenByIdAsync(
    realmId: string,
    tokenId: string,
  ): Promise<{ revoked: boolean; revoked_at: string | null }> {
    const result = !useRuntimeRepositoryPath
      ? await runWithDeferredPersistence(() => this.revokeIssuedTokenByIdSyncOnly(realmId, tokenId))
      : await runWithDeferredPersistence(async () => {
          ensureRealmSeeds();
          const record = await issuedTokenAsyncStore.getById(realmId, tokenId);
          if (!record || record.status !== 'ACTIVE') {
            return {
              revoked: false,
              revoked_at: record?.revoked_at ?? null,
            };
          }
          revokeTokenRecord(record);
          await issuedTokenAsyncStore.put(record);
          return {
            revoked: true,
            revoked_at: record.revoked_at,
          };
        });
    const record = result.revoked
      ? this.resolveIssuedTokenByIdForRuntime(realmId, tokenId)
      : null;
    if (result.revoked && record?.token_use === 'access_token') {
      const { LocalIamAdvancedOAuthRuntimeStore } = await import('./iamAdvancedOAuthRuntime');
      await LocalIamAdvancedOAuthRuntimeStore.terminateDerivedTokenExchangesForSubjectTokenAsync(
        realmId,
        tokenId,
        'REVOKED',
      );
    }
    return result;
  },

  revokeTokensForSubjectSyncOnly(
    realmId: string,
    subjectKind: IamSubjectKind,
    subjectId: string,
  ): { revoked_count: number; revoked_at: string | null } {
    ensureRealmSeeds();
    let revokedCount = 0;
    let revokedAt: string | null = null;
    for (const record of issuedTokenRepository.load()) {
      if (
        record.realm_id !== realmId
        || record.subject_kind !== subjectKind
        || record.subject_id !== subjectId
        || record.status !== 'ACTIVE'
      ) {
        continue;
      }
      revokeTokenRecord(record);
      revokedCount += 1;
      revokedAt = record.revoked_at;
    }
    if (revokedCount > 0) {
      persistStateSyncOnly();
    }
    return {
      revoked_count: revokedCount,
      revoked_at: revokedAt,
    };
  },

  async revokeTokensForSubjectAsync(
    realmId: string,
    subjectKind: IamSubjectKind,
    subjectId: string,
  ): Promise<{ revoked_count: number; revoked_at: string | null }> {
    let revokedAccessTokenIds = new Set<string>();
    const result = !useRuntimeRepositoryPath
      ? await runWithDeferredPersistence(() => {
          ensureRealmSeeds();
          let revokedCount = 0;
          let revokedAt: string | null = null;
          for (const record of issuedTokenRepository.load()) {
            if (
              record.realm_id !== realmId
              || record.subject_kind !== subjectKind
              || record.subject_id !== subjectId
              || record.status !== 'ACTIVE'
            ) {
              continue;
            }
            revokeTokenRecordAndCollectAccessTokenId(record, revokedAccessTokenIds);
            revokedCount += 1;
            revokedAt = record.revoked_at;
          }
          if (revokedCount > 0) {
            persistStateSyncOnly();
          }
          return {
            revoked_count: revokedCount,
            revoked_at: revokedAt,
          };
        })
      : await runWithDeferredPersistence(async () => {
          ensureRealmSeeds();
          const tokenIds = await issuedTokenAsyncStore.listActiveIdsBySubject(realmId, subjectKind, subjectId);
          const revoked = await revokeIssuedTokensByIdAsync(realmId, tokenIds, {
            subjectKind,
            subjectId,
          });
          revokedAccessTokenIds = revoked.revoked_access_token_ids;
          return {
            revoked_count: revoked.revoked_count,
            revoked_at: revoked.revoked_at,
          };
        });
    if (revokedAccessTokenIds.size > 0) {
      const { LocalIamAdvancedOAuthRuntimeStore } = await import('./iamAdvancedOAuthRuntime');
      for (const accessTokenId of revokedAccessTokenIds) {
        await LocalIamAdvancedOAuthRuntimeStore.terminateDerivedTokenExchangesForSubjectTokenAsync(
          realmId,
          accessTokenId,
          'REVOKED',
        );
      }
    }
    return result;
  },

  countTokensForSubject(
    realmId: string,
    subjectKind: IamSubjectKind,
    subjectId: string,
  ): { total_count: number; active_count: number } {
    ensureRealmSeeds();
    const matching = issuedTokenRepository.load().filter(
      (record) =>
        record.realm_id === realmId
        && record.subject_kind === subjectKind
        && record.subject_id === subjectId,
    );
    return {
      total_count: matching.length,
      active_count: matching.filter((record) => record.status === 'ACTIVE').length,
    };
  },

  getUserInfo(realmId: string, bearerToken: string): IamUserInfoResponse {
    ensureRealmSeeds();
    const bearerTokenHash = hashTokenFingerprint(bearerToken);
    const record = issuedTokenByAccessHash.get(issuedTokenIndexKey(realmId, bearerTokenHash));
    if (!record || record.status !== 'ACTIVE') {
      throw new Error('Invalid bearer token');
    }
    const principal = buildPrincipalContext(record.subject_kind, record.realm_id, record.subject_id);
    return Object.keys(record.userinfo_claims).length > 0
      ? {
        sub: principal.sub,
        ...record.userinfo_claims,
      }
      : rebuildUserInfoClaimsForRecord(record);
  },

  async getUserInfoAsync(realmId: string, bearerToken: string): Promise<IamUserInfoResponse> {
    if (!useRuntimeRepositoryPath) {
      return this.getUserInfo(realmId, bearerToken);
    }
    return runWithDeferredPersistence(async () => {
      ensureRealmSeeds();
      const bearerTokenHash = hashTokenFingerprint(bearerToken);
      const record = await issuedTokenAsyncStore.getByAccessHash(realmId, bearerTokenHash);
      if (!record || record.status !== 'ACTIVE') {
        throw new Error('Invalid bearer token');
      }
      const principal = buildPrincipalContext(record.subject_kind, record.realm_id, record.subject_id);
      return Object.keys(record.userinfo_claims).length > 0
        ? {
          sub: principal.sub,
          ...record.userinfo_claims,
        }
        : rebuildUserInfoClaimsForRecord(record);
    });
  },

  getClientByIdentifier(realmId: string, clientIdentifier: string): IamClientRecord {
    ensureRealmSeeds();
    const client = clientRepository.load().find(
      (candidate) => candidate.realm_id === realmId && candidate.client_id === clientIdentifier,
    );
    if (!client) {
      throw new Error(`Unknown client in realm ${realmId}: ${clientIdentifier}`);
    }
    if (client.status !== 'ACTIVE') {
      throw new Error('Client is not active');
    }
    return toPublicClient(client);
  },

  resolveAuthenticatedClient(
    realmId: string,
    payload: Record<string, unknown>,
    authorizationHeader: string | null,
  ): IamClientRecord {
    ensureRealmSeeds();
    return toPublicClient(determineClientAuth(realmId, payload, authorizationHeader));
  },

  resolveIssuedTokenForValue(
    realmId: string,
    rawToken: string,
  ): IamResolvedIssuedTokenRecord {
    ensureRealmSeeds();
    const tokenHash = hashTokenFingerprint(rawToken);
    const record = issuedTokenByAccessHash.get(issuedTokenIndexKey(realmId, tokenHash))
      ?? issuedTokenByRefreshHash.get(issuedTokenIndexKey(realmId, tokenHash));
    if (!record) {
      throw new Error('Unknown issued token');
    }
    return toResolvedIssuedTokenRecord(
      record,
      record.access_token_hash === tokenHash ? 'access_token' : 'refresh_token',
    );
  },

  resolveIssuedTokenByIdForRuntime(
    realmId: string,
    tokenId: string,
  ): IamResolvedIssuedTokenRecord | null {
    ensureRealmSeeds();
    const record = resolveIssuedTokenRecordById(realmId, tokenId);
    if (!record) {
      return null;
    }
    return {
      id: record.id,
      realm_id: record.realm_id,
      client_id: record.client_id,
      subject_kind: record.subject_kind,
      subject_id: record.subject_id,
      browser_session_id: record.browser_session_id,
      grant_type: record.grant_type,
      scope: record.scope,
      scope_ids: clone(record.scope_ids),
      issued_at: record.issued_at,
      expires_at: record.expires_at,
      refresh_expires_at: record.refresh_expires_at,
      status: record.status,
      revoked_at: record.revoked_at,
      requested_purpose: record.requested_purpose,
      token_use: 'access_token',
    };
  },

  issueSubjectTokensSyncOnly(input: {
    realm_id: string;
    client_id: string;
    subject_kind: IamSubjectKind;
    subject_id: string;
    requested_scope_names: string[];
    additional_scope_names?: string[];
    additional_claims?: Record<string, unknown>;
    requested_purpose?: string | null;
    base_url: string;
    grant_type: IamTokenGrantType;
    include_refresh_token?: boolean;
    nonce?: string | null;
    browser_session_id?: string | null;
  }): IamTokenEndpointResponse {
    ensureRealmSeeds();
    const client = clientRepository.load().find(
      (candidate) => candidate.realm_id === input.realm_id && candidate.client_id === input.client_id,
    );
    if (!client) {
      throw new Error(`Unknown client in realm ${input.realm_id}: ${input.client_id}`);
    }
    if (client.status !== 'ACTIVE') {
      throw new Error('Client is not active');
    }
    const issuer = currentIssuer(input.base_url, input.realm_id);
    return issueTokensForPrincipal(
      client,
      input.subject_kind,
      input.subject_id,
      input.requested_scope_names,
      issuer,
      input.grant_type,
      {
        include_refresh_token: input.include_refresh_token,
        nonce: input.nonce,
        additional_claims: input.additional_claims,
        additional_scope_names: input.additional_scope_names,
        requested_purpose: input.requested_purpose,
        browser_session_id: input.browser_session_id,
      },
    );
  },

  async issueSubjectTokensAsync(input: {
    realm_id: string;
    client_id: string;
    subject_kind: IamSubjectKind;
    subject_id: string;
    requested_scope_names: string[];
    additional_scope_names?: string[];
    additional_claims?: Record<string, unknown>;
    requested_purpose?: string | null;
    base_url: string;
    grant_type: IamTokenGrantType;
    include_refresh_token?: boolean;
    nonce?: string | null;
    browser_session_id?: string | null;
  }): Promise<IamTokenEndpointResponse> {
    const response = await runWithDeferredPersistence(() => this.issueSubjectTokensSyncOnly(input));
    await syncIssuedTokenForAccessTokenAsync(input.realm_id, response.access_token);
    scheduleIssuedTokenBrowserSessionOwnershipSync(input.realm_id, response.access_token);
    return response;
  },

  issueAuthorizationCodeTokens(input: {
    realm_id: string;
    client_id: string;
    user_id: string;
    requested_scope_names: string[];
    requested_purpose?: string | null;
    base_url: string;
    nonce?: string | null;
    browser_session_id?: string | null;
  }): IamTokenEndpointResponse {
    ensureRealmSeeds();
    const client = clientRepository.load().find(
      (candidate) => candidate.realm_id === input.realm_id && candidate.client_id === input.client_id,
    );
    if (!client) {
      throw new Error(`Unknown client in realm ${input.realm_id}: ${input.client_id}`);
    }
    if (client.status !== 'ACTIVE') {
      throw new Error('Client is not active');
    }
    const issuer = currentIssuer(input.base_url, input.realm_id);
    return issueTokensForPrincipal(
      client,
      'USER',
      input.user_id,
      input.requested_scope_names,
      issuer,
      'authorization_code',
      {
        nonce: input.nonce,
        requested_purpose: input.requested_purpose,
        browser_session_id: input.browser_session_id,
      },
    );
  },

  async issueAuthorizationCodeTokensAsync(input: {
    realm_id: string;
    client_id: string;
    user_id: string;
    requested_scope_names: string[];
    requested_purpose?: string | null;
    base_url: string;
    nonce?: string | null;
    browser_session_id?: string | null;
  }): Promise<IamTokenEndpointResponse> {
    const response = await runWithDeferredPersistence(() => this.issueAuthorizationCodeTokens(input));
    await syncIssuedTokenForAccessTokenAsync(input.realm_id, response.access_token);
    scheduleIssuedTokenBrowserSessionOwnershipSync(input.realm_id, response.access_token);
    return response;
  },

  revokeTokensForBrowserSessionSyncOnly(
    realmId: string,
    browserSessionReference: string,
  ): { revoked_count: number; revoked_at: string | null } {
    ensureRealmSeeds();
    const browserSessionId = normalizeBrowserSessionReference(browserSessionReference);
    if (!browserSessionId) {
      return {
        revoked_count: 0,
        revoked_at: null,
      };
    }
    const activeLinks = LocalIamTokenOwnershipIndexStore.listActiveTokenLinksForBrowserSession(realmId, browserSessionReference);
    let revokedCount = 0;
    let revokedAt: string | null = null;
    if (activeLinks.length === 0) {
      for (const record of issuedTokenRepository.load()) {
        if (
          record.realm_id !== realmId
          || record.browser_session_id !== browserSessionId
          || record.status !== 'ACTIVE'
        ) {
          continue;
        }
        revokeTokenRecord(record);
        revokedCount += 1;
        revokedAt = record.revoked_at;
      }
      if (revokedCount > 0) {
        persistStateSyncOnly();
      }
      return {
        revoked_count: revokedCount,
        revoked_at: revokedAt,
      };
    }
    for (const link of activeLinks) {
      const record = issuedTokenById.get(issuedTokenIdIndexKey(realmId, link.token_id)) ?? null;
      if (!record) {
        LocalIamTokenOwnershipIndexStore.markTokenLinkTerminated(realmId, link.token_id);
        continue;
      }
      if (record.browser_session_id !== browserSessionId || record.status !== 'ACTIVE') {
        LocalIamTokenOwnershipIndexStore.markTokenLinkTerminated(realmId, record.id);
        continue;
      }
      revokeTokenRecord(record);
      revokedCount += 1;
      revokedAt = record.revoked_at;
    }
    if (revokedCount > 0) {
      persistStateSyncOnly();
    }
    return {
      revoked_count: revokedCount,
      revoked_at: revokedAt,
    };
  },

  async revokeTokensForBrowserSessionAsync(
    realmId: string,
    browserSessionReference: string,
  ): Promise<{ revoked_count: number; revoked_at: string | null }> {
    let revokedAccessTokenIds = new Set<string>();
    const result = !useRuntimeRepositoryPath
      ? await runWithDeferredPersistence(() => {
          ensureRealmSeeds();
          const browserSessionId = normalizeBrowserSessionReference(browserSessionReference);
          if (!browserSessionId) {
            return {
              revoked_count: 0,
              revoked_at: null,
            };
          }
          const activeLinks = LocalIamTokenOwnershipIndexStore.listActiveTokenLinksForBrowserSession(realmId, browserSessionReference);
          let revokedCount = 0;
          let revokedAt: string | null = null;
          if (activeLinks.length === 0) {
            for (const record of issuedTokenRepository.load()) {
              if (
                record.realm_id !== realmId
                || record.browser_session_id !== browserSessionId
                || record.status !== 'ACTIVE'
              ) {
                continue;
              }
              revokeTokenRecordAndCollectAccessTokenId(record, revokedAccessTokenIds);
              revokedCount += 1;
              revokedAt = record.revoked_at;
            }
            if (revokedCount > 0) {
              persistStateSyncOnly();
            }
            return {
              revoked_count: revokedCount,
              revoked_at: revokedAt,
            };
          }
          for (const link of activeLinks) {
            const record = issuedTokenById.get(issuedTokenIdIndexKey(realmId, link.token_id)) ?? null;
            if (!record) {
              LocalIamTokenOwnershipIndexStore.markTokenLinkTerminated(realmId, link.token_id);
              continue;
            }
            if (record.browser_session_id !== browserSessionId || record.status !== 'ACTIVE') {
              LocalIamTokenOwnershipIndexStore.markTokenLinkTerminated(realmId, record.id);
              continue;
            }
            revokeTokenRecordAndCollectAccessTokenId(record, revokedAccessTokenIds);
            revokedCount += 1;
            revokedAt = record.revoked_at;
          }
          if (revokedCount > 0) {
            persistStateSyncOnly();
          }
          return {
            revoked_count: revokedCount,
            revoked_at: revokedAt,
          };
        })
      : await runWithDeferredPersistence(async () => {
          ensureRealmSeeds();
          const browserSessionId = normalizeBrowserSessionReference(browserSessionReference);
          if (!browserSessionId) {
            return {
              revoked_count: 0,
              revoked_at: null,
            };
          }
          const tokenIds = await issuedTokenAsyncStore.listActiveIdsByBrowserSession(realmId, browserSessionId);
          const revoked = await revokeIssuedTokensByIdAsync(realmId, tokenIds, {
            browserSessionId,
          });
          revokedAccessTokenIds = revoked.revoked_access_token_ids;
          return {
            revoked_count: revoked.revoked_count,
            revoked_at: revoked.revoked_at,
          };
        });
    if (revokedAccessTokenIds.size > 0) {
      const { LocalIamAdvancedOAuthRuntimeStore } = await import('./iamAdvancedOAuthRuntime');
      for (const accessTokenId of revokedAccessTokenIds) {
        await LocalIamAdvancedOAuthRuntimeStore.terminateDerivedTokenExchangesForSubjectTokenAsync(
          realmId,
          accessTokenId,
          'REVOKED',
        );
      }
    }
    return result;
  },

  getSamlMetadata(realmId: string, clientIdentifier: string, baseUrl: string): IamSamlMetadataResponse {
    ensureRealmSeeds();
    const client = assertRealmClientExists(realmId, clientIdentifier);
    if (client.protocol !== 'SAML') {
      throw new Error('Unknown SAML service provider');
    }
    assertSupportedSamlServiceProviderProfile(client);
    const issuer = currentIssuer(baseUrl, realmId);
    const signingKey = getActiveSigningKey(null);
    const acsUrl = resolveRequestedSamlAcsUrl(client, null, issuer);
    const loginServiceUrl = samlLoginServiceUrl(issuer, client.client_id);
    const logoutServiceUrl = samlLogoutServiceUrl(issuer, client.client_id);
    const metadataXml = `<?xml version="1.0" encoding="UTF-8"?><EntityDescriptor entityID="${escapeXml(issuer)}" xmlns="urn:oasis:names:tc:SAML:2.0:metadata"><IDPSSODescriptor WantAuthnRequestsSigned="false" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">${buildSamlSigningKeyDescriptorXml(signingKey)}<SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="${escapeXml(loginServiceUrl)}"/><SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="${escapeXml(logoutServiceUrl)}"/></IDPSSODescriptor><Extensions xmlns:idp="https://idp.local/iam"><idp:ServiceProvider clientId="${escapeXml(client.client_id)}" assertionConsumerService="${escapeXml(acsUrl)}" requestBinding="REDIRECT" responseBinding="POST" exactAcsMatchRequired="true" signingKeyId="${escapeXml(signingKey.key_id)}"/></Extensions></EntityDescriptor>`;
    return {
      realm_id: realmId,
      client_id: client.client_id,
      entity_id: issuer,
      acs_url: acsUrl,
      login_service_url: loginServiceUrl,
      logout_service_url: logoutServiceUrl,
      signing_key_id: signingKey.key_id,
      supported_request_bindings: supportedSamlRequestBindings(),
      supported_response_bindings: supportedSamlResponseBindings(),
      metadata_xml: metadataXml,
    };
  },

  createSamlAuthRedirectSyncOnly(
    realmId: string,
    input: CreateIamSamlAuthRequestInput,
    uiBaseUrl: string,
    baseUrl: string,
  ): IamSamlAuthRedirectResponse {
    ensureRealmSeeds();
    expireSamlState();
    const client = assertRealmClientExists(realmId, input.client_id);
    if (client.protocol !== 'SAML') {
      throw new Error('Unknown SAML service provider');
    }
    if (client.status !== 'ACTIVE') {
      throw new Error('SAML client is not active');
    }
    assertSupportedSamlServiceProviderProfile(client);
    const issuer = currentIssuer(baseUrl, realmId);
    const requestXml = decodeOptionalSamlRequestXml(input.request_xml);
    assertSupportedSamlRequestProfile(client, requestXml, issuer);
    const requestBinding = input.binding ?? 'REDIRECT';
    if (!supportedSamlRequestBindings().includes(requestBinding)) {
      throw new Error(`Unsupported SAML request binding for the current profile: ${requestBinding}`);
    }
    const forceAuthnFromXml = parseOptionalXmlAttribute(requestXml, 'ForceAuthn') === 'true';
    const requestId = assertSupportedSamlRequestId(input.request_id?.trim() || parseOptionalXmlAttribute(requestXml, 'ID'));
    const acsFromXml = parseOptionalXmlAttribute(requestXml, 'AssertionConsumerServiceURL');
    const request: StoredIamSamlAuthRequest = {
      id: `iam-saml-request-${randomUUID()}`,
      realm_id: realmId,
      client_id: client.client_id,
      client_name: client.name,
      acs_url: resolveRequestedSamlAcsUrl(client, input.acs_url ?? acsFromXml, issuer),
      relay_state: input.relay_state?.trim() || null,
      request_binding: requestBinding,
      request_id: requestId,
      request_xml: requestXml,
      initiation_mode: 'SP_INITIATED',
      force_authn: Boolean(input.force_authn) || forceAuthnFromXml,
      created_at: nowIso(),
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      completed_at: null,
      cancelled_at: null,
      status: 'PENDING',
    };
    const samlAuthRequests = samlAuthRequestRepository.load();
    samlAuthRequests.unshift(request);
    persistStateSyncOnly();
    return {
      saml_request_id: request.id,
      redirect_url: `${uiBaseUrl.replace(/\/+$/, '')}/iam/login?realm=${encodeURIComponent(realmId)}&client_id=${encodeURIComponent(client.client_id)}&saml_request_id=${encodeURIComponent(request.id)}`,
      request: toPublicSamlAuthRequest(request),
    };
  },

  createSamlIdpInitiatedRedirectSyncOnly(
    realmId: string,
    input: CreateIamSamlIdpInitiatedRequestInput,
    uiBaseUrl: string,
    baseUrl: string,
  ): IamSamlAuthRedirectResponse {
    ensureRealmSeeds();
    expireSamlState();
    const client = assertRealmClientExists(realmId, input.client_id);
    if (client.protocol !== 'SAML') {
      throw new Error('Unknown SAML service provider');
    }
    if (client.status !== 'ACTIVE') {
      throw new Error('SAML client is not active');
    }
    assertSupportedSamlServiceProviderProfile(client);
    const issuer = currentIssuer(baseUrl, realmId);
    const request: StoredIamSamlAuthRequest = {
      id: `iam-saml-request-${randomUUID()}`,
      realm_id: realmId,
      client_id: client.client_id,
      client_name: client.name,
      acs_url: resolveRequestedSamlAcsUrl(client, input.acs_url, issuer),
      relay_state: input.relay_state?.trim() || null,
      request_binding: 'REDIRECT',
      request_id: null,
      request_xml: null,
      initiation_mode: 'IDP_INITIATED',
      force_authn: Boolean(input.force_authn),
      created_at: nowIso(),
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      completed_at: null,
      cancelled_at: null,
      status: 'PENDING',
    };
    const samlAuthRequests = samlAuthRequestRepository.load();
    samlAuthRequests.unshift(request);
    persistStateSyncOnly();
    return {
      saml_request_id: request.id,
      redirect_url: `${uiBaseUrl.replace(/\/+$/, '')}/iam/login?realm=${encodeURIComponent(realmId)}&client_id=${encodeURIComponent(client.client_id)}&saml_request_id=${encodeURIComponent(request.id)}`,
      request: toPublicSamlAuthRequest(request),
    };
  },

  async createSamlIdpInitiatedRedirectAsync(
    realmId: string,
    input: CreateIamSamlIdpInitiatedRequestInput,
    uiBaseUrl: string,
    baseUrl: string,
  ): Promise<IamSamlAuthRedirectResponse> {
    return runWithDeferredPersistence(() => this.createSamlIdpInitiatedRedirectSyncOnly(realmId, input, uiBaseUrl, baseUrl));
  },

  async createSamlAuthRedirectAsync(
    realmId: string,
    input: CreateIamSamlAuthRequestInput,
    uiBaseUrl: string,
    baseUrl: string,
  ): Promise<IamSamlAuthRedirectResponse> {
    return runWithDeferredPersistence(() => this.createSamlAuthRedirectSyncOnly(realmId, input, uiBaseUrl, baseUrl));
  },

  getSamlAuthRequest(realmId: string, requestId: string): IamSamlAuthRequestDetailResponse {
    const request = assertSamlRequestExists(realmId, requestId);
    return {
      request: toPublicSamlAuthRequest(request),
      can_auto_continue: request.status === 'PENDING' && !request.force_authn,
    };
  },

  continueSamlAuthRequest(
    realmId: string,
    requestId: string,
    input: {
      user_id: string;
      browser_session_id: string;
    },
    baseUrl: string,
  ): IamSamlContinuationResponse {
    ensureRealmSeeds();
    const request = assertActiveSamlRequest(realmId, requestId);
    const client = assertRealmClientExists(realmId, request.client_id);
    if (client.protocol !== 'SAML') {
      throw new Error('Unknown SAML service provider');
    }
    const issued = buildSamlSessionAndResponse({
      realm_id: realmId,
      client,
      user_id: input.user_id,
      browser_session_id: input.browser_session_id,
      relay_state: request.relay_state,
      acs_url: request.acs_url,
      request_id: request.request_id,
      request_record_id: request.id,
      base_url: baseUrl,
    });
    samlSessionRepository.load().unshift(issued.session);
    request.status = 'COMPLETED';
    request.completed_at = nowIso();
    persistStateSyncOnly();
    return {
      status: 'AUTHORIZED',
      request: toPublicSamlAuthRequest(request),
      session: toPublicSamlSession(issued.session),
      acs_url: request.acs_url,
      relay_state: request.relay_state,
      session_index: issued.session.session_index,
      saml_response: issued.response,
      attributes: issued.attributes,
    };
  },

  async continueSamlAuthRequestAsync(
    realmId: string,
    requestId: string,
    input: {
      user_id: string;
      browser_session_id: string;
    },
    baseUrl: string,
  ): Promise<IamSamlContinuationResponse> {
    const continuation = await runWithDeferredPersistence(() => this.continueSamlAuthRequest(realmId, requestId, input, baseUrl));
    if (continuation.session && !useRuntimeRepositoryPath) {
      await LocalIamSessionIndexStore.recordBrowserSamlSessionLinkAsync({
        realm_id: realmId,
        user_id: continuation.session.user_id,
        client_id: continuation.session.client_id,
        browser_session_reference: input.browser_session_id,
        saml_session_id: continuation.session.id,
        saml_session_index: continuation.session.session_index,
      });
    }
    return continuation;
  },

  performSamlLogin(
    realmId: string,
    input: {
      client_id: string;
      username: string;
      password: string;
      relay_state?: string | null;
      saml_request_id?: string | null;
    },
    baseUrl: string,
  ): IamSamlLoginResponse {
    ensureRealmSeeds();
    const client = assertRealmClientExists(realmId, input.client_id);
    if (client.protocol !== 'SAML') {
      throw new Error('Unknown SAML service provider');
    }
    assertSupportedSamlServiceProviderProfile(client);
    const user = validateUserPassword(realmId, input.username, input.password);
    const normalizedSamlRequestId = input.saml_request_id?.trim() || null;
    const samlRequest = normalizedSamlRequestId ? assertActiveSamlRequest(realmId, normalizedSamlRequestId) : null;
    if (samlRequest && samlRequest.client_id !== client.client_id) {
      throw new Error('SAML request does not belong to the requested client');
    }
    const relayState = samlRequest?.relay_state ?? (input.relay_state?.trim() || null);
    const acsUrl = samlRequest?.acs_url ?? resolveRequestedSamlAcsUrl(client, null, currentIssuer(baseUrl, realmId));
    const issued = buildSamlSessionAndResponse({
      realm_id: realmId,
      client,
      user_id: user.id,
      browser_session_id: `synthetic-saml-browser-session-${randomUUID()}`,
      relay_state: relayState,
      acs_url: acsUrl,
      request_id: samlRequest?.request_id ?? null,
      request_record_id: samlRequest?.id ?? null,
      base_url: baseUrl,
    });
    samlSessionRepository.load().unshift(issued.session);
    if (samlRequest) {
      samlRequest.status = 'COMPLETED';
      samlRequest.completed_at = nowIso();
    }
    persistStateSyncOnly();
    return {
      realm_id: realmId,
      client_id: client.client_id,
      relay_state: relayState,
      saml_request_id: samlRequest?.id ?? null,
      session_index: issued.session.session_index,
      acs_url: acsUrl,
      saml_response: issued.response,
      attributes: issued.attributes,
    };
  },

  async performSamlLoginAsync(
    realmId: string,
    input: {
      client_id: string;
      username: string;
      password: string;
      relay_state?: string | null;
      saml_request_id?: string | null;
    },
    baseUrl: string,
  ): Promise<IamSamlLoginResponse> {
    return runWithDeferredPersistence(() => this.performSamlLogin(realmId, input, baseUrl));
  },

  listSamlSessions(
    filters?: { realm_id?: string | null; client_id?: string | null; status?: IamSamlSessionStatus | null },
    pagination?: IamListPagination,
  ): IamSamlSessionsResponse {
    ensureRealmSeeds();
    expireSamlState();
    let sessions = samlSessionRepository.load();
    if (filters?.realm_id) {
      sessions = sessions.filter((session) => session.realm_id === filters.realm_id);
    }
    if (filters?.client_id) {
      sessions = sessions.filter((session) => session.client_id === filters.client_id);
    }
    if (filters?.status) {
      sessions = sessions.filter((session) => session.status === filters.status);
    }
    const pagedSessions = paginateList(sessions, pagination);
    return {
      generated_at: nowIso(),
      sessions: clone(pagedSessions.data.map(toPublicSamlSession)),
      count: pagedSessions.count,
      offset: pagedSessions.offset,
      limit: pagedSessions.limit,
      has_more: pagedSessions.has_more,
    };
  },

  logoutSamlSession(
    realmId: string,
    input: {
      client_id: string;
      session_index: string;
      relay_state?: string | null;
      request_id?: string | null;
    },
    baseUrl: string,
  ): IamSamlLogoutResponse {
    ensureRealmSeeds();
    const session = samlSessionRepository.load().find(
      (candidate) =>
        candidate.realm_id === realmId &&
        candidate.client_id === input.client_id &&
        candidate.session_index === input.session_index,
    );
    if (!session) {
      throw new Error('Unknown SAML session');
    }
    const client = assertRealmClientExists(realmId, input.client_id);
    if (client.protocol !== 'SAML') {
      throw new Error('Unknown SAML service provider');
    }
    assertSupportedSamlServiceProviderProfile(client);
    const requestId = assertSupportedSamlRequestId(input.request_id);
    session.status = 'TERMINATED';
    session.terminated_at = nowIso();
    session.last_seen_at = nowIso();
    persistStateSyncOnly();
    const issuer = currentIssuer(baseUrl, realmId);
    const signingKey = getActiveSigningKey(null);
    const logoutDestination = samlLogoutDestinationForClient(client);
    return {
      realm_id: realmId,
      client_id: client.client_id,
      relay_state: input.relay_state?.trim() || session.relay_state,
      session_index: session.session_index,
      logout_destination: logoutDestination,
      saml_logout_response: Buffer.from(buildSamlLogoutResponseXml({
        issuer,
        destination: logoutDestination,
        relayState: input.relay_state?.trim() || session.relay_state,
        requestId,
        sessionIndex: session.session_index,
        signingKey,
      })).toString('base64'),
      terminated_at: session.terminated_at,
      browser_session_id: session.browser_session_id,
      browser_session_revoked: false,
    };
  },

  async logoutSamlSessionAsync(
    realmId: string,
    input: {
      client_id: string;
      session_index: string;
      relay_state?: string | null;
      request_id?: string | null;
    },
    baseUrl: string,
  ): Promise<IamSamlLogoutResponse> {
    const logoutResponse = await runWithDeferredPersistence(() => this.logoutSamlSession(realmId, input, baseUrl));
    const terminatedSession = !useRuntimeRepositoryPath
      ? samlSessionRepository.load().find(
          (candidate) =>
            candidate.realm_id === realmId
            && candidate.client_id === input.client_id
            && candidate.session_index === input.session_index,
        )
      : null;
    if (terminatedSession && !useRuntimeRepositoryPath) {
      await LocalIamSessionIndexStore.markSamlSessionTerminatedAsync(realmId, terminatedSession.id);
    }
    return logoutResponse;
  },

  async terminateSamlSessionsForBrowserSessionAsync(
    realmId: string,
    browserSessionReference: string,
  ): Promise<IamSamlBrowserSessionTerminationResult> {
    if (useRuntimeRepositoryPath) {
      return runWithDeferredPersistence(async () => {
        const browserSessionId = normalizeBrowserSessionReference(browserSessionReference);
        if (!browserSessionId) {
          return {
            browser_session_reference: browserSessionReference,
            terminated_session_count: 0,
            terminated_link_count: 0,
          };
        }
        let terminatedSessionCount = 0;
        const terminatedAt = nowIso();
        for (const session of samlSessionRepository.load()) {
          if (
            session.realm_id !== realmId
            || session.browser_session_id !== browserSessionId
            || session.status !== 'ACTIVE'
          ) {
            continue;
          }
          session.status = 'TERMINATED';
          session.terminated_at = terminatedAt;
          session.last_seen_at = terminatedAt;
          terminatedSessionCount += 1;
        }
        if (terminatedSessionCount > 0) {
          persistStateSyncOnly();
        }
        return {
          browser_session_reference: browserSessionReference,
          terminated_session_count: terminatedSessionCount,
          terminated_link_count: 0,
        };
      });
    }

    const activeLinks = await LocalIamSessionIndexStore.listActiveBrowserSamlSessionLinksForBrowserSessionAsync(
      realmId,
      browserSessionReference,
    );
    if (activeLinks.length === 0) {
      return {
        browser_session_reference: browserSessionReference,
        terminated_session_count: 0,
        terminated_link_count: 0,
      };
    }

    return runWithDeferredPersistence(async () => {
      let terminatedSessionCount = 0;
      let terminatedLinkCount = 0;
      const terminatedAt = nowIso();
      const sessionsById = new Map(
        samlSessionRepository.load().map((session) => [session.id, session] as const),
      );

      for (const link of activeLinks) {
        const session = sessionsById.get(link.saml_session_id) ?? null;
        if (session && session.realm_id === realmId && session.status === 'ACTIVE') {
          session.status = 'TERMINATED';
          session.terminated_at = terminatedAt;
          session.last_seen_at = terminatedAt;
          terminatedSessionCount += 1;
        }
      }

      if (terminatedSessionCount > 0) {
        persistStateSyncOnly();
      }

      for (const link of activeLinks) {
        const termination = await LocalIamSessionIndexStore.markSamlSessionTerminatedAsync(realmId, link.saml_session_id);
        if (termination.terminated) {
          terminatedLinkCount += 1;
        }
      }

      return {
        browser_session_reference: browserSessionReference,
        terminated_session_count: terminatedSessionCount,
        terminated_link_count: terminatedLinkCount,
      };
    });
  },

  listSigningKeys(filters?: { realm_id?: string | null }): { generated_at: string; signing_keys: IamSigningKeyRecord[]; count: number } {
    ensureRealmSeeds();
    const signingKeysState = signingKeyRepository.load();
    const signingKeys = filters?.realm_id !== undefined
      ? signingKeysState.filter((key) => key.realm_id === filters.realm_id)
      : signingKeysState;
    return {
      generated_at: nowIso(),
      signing_keys: clone(signingKeys.map((key) => ({
        id: key.id,
        realm_id: key.realm_id,
        key_id: key.key_id,
        algorithm: key.algorithm,
        created_at: key.created_at,
        status: key.status,
      }))),
      count: signingKeys.length,
    };
  },

  rotateSigningKeySyncOnly(_actorUserId: string, realmId: string | null): RotateIamSigningKeyResponse {
    ensureRealmSeeds();
    if (realmId) {
      assertRealmExists(realmId);
    }
    const signingKeys = signingKeyRepository.load();
    const retiredKeyIds = signingKeys
      .filter((key) => key.realm_id === realmId && key.status === 'ACTIVE')
      .map((key) => {
        key.status = 'RETIRED';
        return key.id;
      });
    const nextKey = generateSigningKey(realmId);
    signingKeys.unshift(nextKey);
    persistStateSyncOnly();
    return {
      retired_key_ids: retiredKeyIds,
      active_key: {
        id: nextKey.id,
        realm_id: nextKey.realm_id,
        key_id: nextKey.key_id,
        algorithm: nextKey.algorithm,
        created_at: nextKey.created_at,
        status: nextKey.status,
      },
    };
  },

  async rotateSigningKeyAsync(actorUserId: string, realmId: string | null): Promise<RotateIamSigningKeyResponse> {
    return runWithDeferredPersistence(() => this.rotateSigningKeySyncOnly(actorUserId, realmId));
  },

  verifySamlSignatureEnvelope(xml: string): {
    valid: boolean;
    signing_key_id: string | null;
    reference_count: number;
  } {
    ensureRealmSeeds();
    return verifySamlSignatureEnvelopeXml(xml);
  },

  exportState(): Record<string, unknown> {
    ensureRealmSeeds();
    migrateLegacySigningKeySecretReferences();
    return clone(state) as unknown as Record<string, unknown>;
  },

  importState(input: Record<string, unknown>): void {
    const nextState = normalizeState(input as Partial<IamProtocolRuntimeState>);
    syncInMemoryState(nextState);
    ensureRealmSeeds();
    rebuildIssuedTokenIndexes();
    migrateLegacySigningKeySecretReferences();
    persistStateSyncOnly();
  },
};
