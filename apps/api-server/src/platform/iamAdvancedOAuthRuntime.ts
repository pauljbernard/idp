import { AsyncLocalStorage } from 'async_hooks';
import { createHash, randomBytes, randomInt, randomUUID } from 'crypto';
import { LocalIamAuthenticationRuntimeStore } from './iamAuthenticationRuntime';
import { type CreateIamAuthorizationRequestInput, LocalIamAuthorizationRuntimeStore } from './iamAuthorizationRuntime';
import { LocalIamFoundationStore } from './iamFoundation';
import {
  loadOrCreatePersistedState,
  readPersistedStateSnapshot,
  reloadOrCreatePersistedStateAsync,
  savePersistedState,
  savePersistedStateAsync,
} from './persistence';
import {
  type CreateIamClientRequest,
  type IamClientAccessType,
  type IamClientProtocol,
  type IamClientRecord,
  type IamResolvedIssuedTokenRecord,
  type IamTokenEndpointResponse,
  LocalIamProtocolRuntimeStore,
} from './iamProtocolRuntime';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

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

function encodeBase64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function hashToken(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function randomToken(prefix: string): string {
  return `${prefix}_${encodeBase64Url(randomBytes(24))}`;
}

function randomCode(length: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let value = '';
  for (let index = 0; index < length; index += 1) {
    value += alphabet[randomInt(alphabet.length)];
  }
  return value;
}

function normalizeOptionalString(value?: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function parseList(value?: string | null): string[] {
  return Array.from(new Set((value ?? '').split(/\s+/).map((item) => item.trim()).filter(Boolean)));
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

const LEGACY_IAM_ADVANCED_OAUTH_RUNTIME_FILE = 'iam-advanced-oauth-runtime-state.json';
const IAM_ADVANCED_OAUTH_DIRECTORY_FILE = 'iam-advanced-oauth-directory-state.json';
const IAM_ADVANCED_OAUTH_TRANSIENT_FILE = 'iam-advanced-oauth-transient-state.json';
const PUSHED_AUTHORIZATION_REQUEST_TTL_MS = 1000 * 60 * 5;
const DEVICE_AUTHORIZATION_TTL_MS = 1000 * 60 * 10;
const BACKCHANNEL_AUTHENTICATION_TTL_MS = 1000 * 60 * 10;
const BACKCHANNEL_AUTHENTICATION_INTERVAL_SECONDS = 5;

export type IamClientPolicyStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED';
export type IamInitialAccessTokenStatus = 'ACTIVE' | 'CONSUMED' | 'EXPIRED' | 'REVOKED';
export type IamRegistrationAccessTokenStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';
export type IamPushedAuthorizationRequestStatus = 'ACTIVE' | 'CONSUMED' | 'EXPIRED';
export type IamDeviceAuthorizationStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'CONSUMED' | 'EXPIRED';
export type IamBackchannelAuthenticationStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'CONSUMED' | 'EXPIRED';
export type IamTokenExchangeStatus = 'ISSUED' | 'DENIED' | 'REVOKED' | 'EXPIRED';

export interface IamClientPolicyRecord {
  id: string;
  realm_id: string;
  name: string;
  description: string;
  status: IamClientPolicyStatus;
  synthetic: boolean;
  allow_dynamic_registration: boolean;
  allow_device_authorization: boolean;
  allow_token_exchange: boolean;
  allow_pushed_authorization_requests: boolean;
  require_par_for_public_clients: boolean;
  require_pkce_for_public_clients: boolean;
  allow_wildcard_redirect_uris: boolean;
  allowed_protocols: IamClientProtocol[];
  allowed_access_types: IamClientAccessType[];
  default_scope_ids: string[];
  assigned_client_ids: string[];
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

interface StoredIamInitialAccessToken {
  id: string;
  realm_id: string;
  policy_id: string;
  label: string;
  token_hash: string;
  status: IamInitialAccessTokenStatus;
  remaining_uses: number | null;
  expires_at: string | null;
  created_at: string;
  created_by_user_id: string;
}

export interface IamInitialAccessTokenRecord {
  id: string;
  realm_id: string;
  policy_id: string;
  label: string;
  status: IamInitialAccessTokenStatus;
  remaining_uses: number | null;
  expires_at: string | null;
  created_at: string;
  created_by_user_id: string;
}

export interface IamInitialAccessTokenIssueResponse {
  token: IamInitialAccessTokenRecord;
  issued_token: string;
}

interface StoredIamRegistrationAccessToken {
  id: string;
  realm_id: string;
  client_id: string;
  token_hash: string;
  status: IamRegistrationAccessTokenStatus;
  expires_at: string | null;
  created_at: string;
  created_by_user_id: string;
}

export interface IamPushedAuthorizationRequestRecord {
  id: string;
  request_uri: string;
  realm_id: string;
  client_id: string;
  redirect_uri: string;
  scope: string | null;
  requested_purpose: string | null;
  state: string | null;
  nonce: string | null;
  prompt: string | null;
  code_challenge_method: 'plain' | 'S256' | null;
  status: IamPushedAuthorizationRequestStatus;
  expires_at: string;
  created_at: string;
}

interface StoredIamPushedAuthorizationRequest extends IamPushedAuthorizationRequestRecord {
  response_type: string | null;
  response_mode: string | null;
  code_challenge: string | null;
}

export interface IamPushedAuthorizationRequestResponse {
  request_uri: string;
  expires_in: number;
  request: IamPushedAuthorizationRequestRecord;
}

export interface IamDeviceAuthorizationRecord {
  id: string;
  realm_id: string;
  client_id: string;
  device_code: string;
  user_code: string;
  scope: string;
  verification_uri: string;
  verification_uri_complete: string;
  interval: number;
  expires_at: string;
  status: IamDeviceAuthorizationStatus;
  user_id: string | null;
  approved_at: string | null;
  denied_at: string | null;
  consumed_at: string | null;
  created_at: string;
}

export interface IamDeviceAuthorizationResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
  request: IamDeviceAuthorizationRecord;
}

interface StoredIamDeviceAuthorization extends IamDeviceAuthorizationRecord {
  scope_names: string[];
  session_id: string | null;
  last_polled_at: string | null;
  poll_count: number;
}

export interface IamBackchannelAuthenticationRecord {
  id: string;
  realm_id: string;
  client_id: string;
  auth_req_id: string;
  scope: string;
  requested_purpose: string | null;
  login_hint: string;
  binding_message: string | null;
  expires_at: string;
  status: IamBackchannelAuthenticationStatus;
  user_id: string | null;
  approved_at: string | null;
  denied_at: string | null;
  consumed_at: string | null;
  created_at: string;
}

interface StoredIamBackchannelAuthentication extends IamBackchannelAuthenticationRecord {
  scope_names: string[];
  target_user_id: string | null;
  session_id: string | null;
  last_polled_at: string | null;
  poll_count: number;
}

export interface IamBackchannelAuthenticationResponse {
  auth_req_id: string;
  expires_in: number;
  interval: number;
  request: IamBackchannelAuthenticationRecord;
}

export interface IamTokenExchangeRecord {
  id: string;
  realm_id: string;
  requesting_client_id: string;
  audience_client_id: string;
  subject_kind: IamResolvedIssuedTokenRecord['subject_kind'];
  subject_id: string;
  subject_token_id: string;
  exchanged_token_id: string | null;
  requested_scope_names: string[];
  status: IamTokenExchangeStatus;
  created_at: string;
}

export interface IamDynamicClientRegistrationRequest {
  client_name: string;
  client_id?: string;
  redirect_uris?: string[];
  grant_types?: string[];
  token_endpoint_auth_method?: 'none' | 'client_secret_basic' | 'client_secret_post';
  response_types?: string[];
  scope?: string | null;
  client_uri?: string | null;
  policy_id?: string | null;
}

export interface IamDynamicClientRegistrationResponse {
  client: IamClientRecord;
  client_secret: string | null;
  registration_access_token: string;
  registration_client_uri: string;
  token_endpoint_auth_method: 'none' | 'client_secret_basic' | 'client_secret_post';
  grant_types: string[];
  assigned_policy_ids: string[];
}

export interface IamClientPoliciesResponse {
  generated_at: string;
  client_policies: IamClientPolicyRecord[];
  count: number;
  offset?: number;
  limit?: number;
  has_more?: boolean;
}

export interface IamInitialAccessTokensResponse {
  generated_at: string;
  tokens: IamInitialAccessTokenRecord[];
  count: number;
  offset?: number;
  limit?: number;
  has_more?: boolean;
}

export interface IamPushedAuthorizationRequestsResponse {
  generated_at: string;
  requests: IamPushedAuthorizationRequestRecord[];
  count: number;
  offset?: number;
  limit?: number;
  has_more?: boolean;
}

export interface IamDeviceAuthorizationsResponse {
  generated_at: string;
  device_authorizations: IamDeviceAuthorizationRecord[];
  count: number;
  offset?: number;
  limit?: number;
  has_more?: boolean;
}

export interface IamTokenExchangesResponse {
  generated_at: string;
  token_exchanges: IamTokenExchangeRecord[];
  count: number;
  offset?: number;
  limit?: number;
  has_more?: boolean;
}

export interface IamBackchannelAuthenticationsResponse {
  generated_at: string;
  backchannel_authentication_requests: IamBackchannelAuthenticationRecord[];
  count: number;
}

export interface CreateIamClientPolicyRequest {
  realm_id: string;
  name: string;
  description?: string;
  status?: IamClientPolicyStatus;
  allow_dynamic_registration?: boolean;
  allow_device_authorization?: boolean;
  allow_token_exchange?: boolean;
  allow_pushed_authorization_requests?: boolean;
  require_par_for_public_clients?: boolean;
  require_pkce_for_public_clients?: boolean;
  allow_wildcard_redirect_uris?: boolean;
  allowed_protocols?: IamClientProtocol[];
  allowed_access_types?: IamClientAccessType[];
  default_scope_ids?: string[];
  assigned_client_ids?: string[];
}

export interface UpdateIamClientPolicyRequest {
  name?: string;
  description?: string;
  status?: IamClientPolicyStatus;
  allow_dynamic_registration?: boolean;
  allow_device_authorization?: boolean;
  allow_token_exchange?: boolean;
  allow_pushed_authorization_requests?: boolean;
  require_par_for_public_clients?: boolean;
  require_pkce_for_public_clients?: boolean;
  allow_wildcard_redirect_uris?: boolean;
  allowed_protocols?: IamClientProtocol[];
  allowed_access_types?: IamClientAccessType[];
  default_scope_ids?: string[];
  assigned_client_ids?: string[];
}

export interface CreateIamInitialAccessTokenRequest {
  realm_id: string;
  policy_id: string;
  label: string;
  max_uses?: number | null;
  expires_in_hours?: number | null;
}

interface IamAdvancedOAuthRuntimeState {
  client_policies: IamClientPolicyRecord[];
  initial_access_tokens: StoredIamInitialAccessToken[];
  registration_access_tokens: StoredIamRegistrationAccessToken[];
  pushed_authorization_requests: StoredIamPushedAuthorizationRequest[];
  device_authorizations: StoredIamDeviceAuthorization[];
  backchannel_authentication_requests: StoredIamBackchannelAuthentication[];
  token_exchanges: IamTokenExchangeRecord[];
}

interface IamAdvancedOAuthDirectoryState {
  client_policies: IamClientPolicyRecord[];
  initial_access_tokens: StoredIamInitialAccessToken[];
  registration_access_tokens: StoredIamRegistrationAccessToken[];
}

interface IamAdvancedOAuthTransientState {
  pushed_authorization_requests: StoredIamPushedAuthorizationRequest[];
  device_authorizations: StoredIamDeviceAuthorization[];
  backchannel_authentication_requests: StoredIamBackchannelAuthentication[];
  token_exchanges: IamTokenExchangeRecord[];
}

export interface IamAdvancedOAuthSummary {
  client_policy_count: number;
  initial_access_token_count: number;
  active_initial_access_token_count: number;
  pushed_authorization_request_count: number;
  active_pushed_authorization_request_count: number;
  device_authorization_count: number;
  active_device_authorization_count: number;
  backchannel_authentication_count: number;
  active_backchannel_authentication_count: number;
  token_exchange_count: number;
}

export interface IamAdvancedOAuthTransientStateMaintenanceResult {
  expired_initial_access_token_count: number;
  expired_registration_access_token_count: number;
  expired_pushed_authorization_request_count: number;
  expired_device_authorization_count: number;
  expired_backchannel_authentication_request_count: number;
  terminated_token_exchange_count: number;
  revoked_exchanged_token_count: number;
  total_mutated_count: number;
}

function normalizeState(input: Partial<IamAdvancedOAuthRuntimeState>): IamAdvancedOAuthRuntimeState {
  return {
    client_policies: Array.isArray(input.client_policies) ? input.client_policies : [],
    initial_access_tokens: Array.isArray(input.initial_access_tokens) ? input.initial_access_tokens : [],
    registration_access_tokens: Array.isArray(input.registration_access_tokens) ? input.registration_access_tokens : [],
    pushed_authorization_requests: Array.isArray(input.pushed_authorization_requests) ? input.pushed_authorization_requests : [],
    device_authorizations: Array.isArray(input.device_authorizations) ? input.device_authorizations : [],
    backchannel_authentication_requests: Array.isArray(input.backchannel_authentication_requests)
      ? input.backchannel_authentication_requests
      : [],
    token_exchanges: Array.isArray(input.token_exchanges) ? input.token_exchanges : [],
  };
}

function combineState(
  directoryState: IamAdvancedOAuthDirectoryState,
  transientState: IamAdvancedOAuthTransientState,
): IamAdvancedOAuthRuntimeState {
  return {
    client_policies: clone(directoryState.client_policies),
    initial_access_tokens: clone(directoryState.initial_access_tokens),
    registration_access_tokens: clone(directoryState.registration_access_tokens),
    pushed_authorization_requests: clone(transientState.pushed_authorization_requests),
    device_authorizations: clone(transientState.device_authorizations),
    backchannel_authentication_requests: clone(transientState.backchannel_authentication_requests),
    token_exchanges: clone(transientState.token_exchanges),
  };
}

function splitDirectoryState(input: IamAdvancedOAuthRuntimeState): IamAdvancedOAuthDirectoryState {
  return {
    client_policies: clone(input.client_policies),
    initial_access_tokens: clone(input.initial_access_tokens),
    registration_access_tokens: clone(input.registration_access_tokens),
  };
}

function splitTransientState(input: IamAdvancedOAuthRuntimeState): IamAdvancedOAuthTransientState {
  return {
    pushed_authorization_requests: clone(input.pushed_authorization_requests),
    device_authorizations: clone(input.device_authorizations),
    backchannel_authentication_requests: clone(input.backchannel_authentication_requests),
    token_exchanges: clone(input.token_exchanges),
  };
}

function normalizeDirectoryState(input: Partial<IamAdvancedOAuthDirectoryState>): IamAdvancedOAuthDirectoryState {
  return splitDirectoryState(normalizeState(input as Partial<IamAdvancedOAuthRuntimeState>));
}

function normalizeTransientState(input: Partial<IamAdvancedOAuthTransientState>): IamAdvancedOAuthTransientState {
  return splitTransientState(normalizeState(input as Partial<IamAdvancedOAuthRuntimeState>));
}

function readLegacyAdvancedOAuthStateSnapshot(): IamAdvancedOAuthRuntimeState {
  return normalizeState(
    readPersistedStateSnapshot<Partial<IamAdvancedOAuthRuntimeState>>(LEGACY_IAM_ADVANCED_OAUTH_RUNTIME_FILE) ?? {},
  );
}

let state = combineState(
  normalizeDirectoryState(
    loadOrCreatePersistedState<Partial<IamAdvancedOAuthDirectoryState>>(
      IAM_ADVANCED_OAUTH_DIRECTORY_FILE,
      () => normalizeDirectoryState(readLegacyAdvancedOAuthStateSnapshot()),
    ),
  ),
  normalizeTransientState(
    loadOrCreatePersistedState<Partial<IamAdvancedOAuthTransientState>>(
      IAM_ADVANCED_OAUTH_TRANSIENT_FILE,
      () => normalizeTransientState(readLegacyAdvancedOAuthStateSnapshot()),
    ),
  ),
);
const deferredPersistenceContext = new AsyncLocalStorage<{ dirty: boolean }>();

async function loadStateAsync(): Promise<IamAdvancedOAuthRuntimeState> {
  const [directoryState, transientState] = await Promise.all([
    reloadOrCreatePersistedStateAsync<Partial<IamAdvancedOAuthDirectoryState>>(
      IAM_ADVANCED_OAUTH_DIRECTORY_FILE,
      () => normalizeDirectoryState(readLegacyAdvancedOAuthStateSnapshot()),
    ),
    reloadOrCreatePersistedStateAsync<Partial<IamAdvancedOAuthTransientState>>(
      IAM_ADVANCED_OAUTH_TRANSIENT_FILE,
      () => normalizeTransientState(readLegacyAdvancedOAuthStateSnapshot()),
    ),
  ]);
  return combineState(
    normalizeDirectoryState(directoryState),
    normalizeTransientState(transientState),
  );
}

function syncInMemoryState(nextState: IamAdvancedOAuthRuntimeState): void {
  state.client_policies = clone(nextState.client_policies);
  state.initial_access_tokens = clone(nextState.initial_access_tokens);
  state.registration_access_tokens = clone(nextState.registration_access_tokens);
  state.pushed_authorization_requests = clone(nextState.pushed_authorization_requests);
  state.device_authorizations = clone(nextState.device_authorizations);
  state.backchannel_authentication_requests = clone(nextState.backchannel_authentication_requests);
  state.token_exchanges = clone(nextState.token_exchanges);
}

function persistStateSyncOnly() {
  const deferredPersistence = deferredPersistenceContext.getStore();
  if (deferredPersistence) {
    deferredPersistence.dirty = true;
    return;
  }
  savePersistedState(IAM_ADVANCED_OAUTH_DIRECTORY_FILE, splitDirectoryState(state));
  savePersistedState(IAM_ADVANCED_OAUTH_TRANSIENT_FILE, splitTransientState(state));
}

async function persistStateAsync(): Promise<void> {
  await savePersistedStateAsync(IAM_ADVANCED_OAUTH_DIRECTORY_FILE, splitDirectoryState(state));
  await savePersistedStateAsync(IAM_ADVANCED_OAUTH_TRANSIENT_FILE, splitTransientState(state));
}

async function runWithDeferredPersistence<T>(operation: () => T | Promise<T>): Promise<T> {
  const existingContext = deferredPersistenceContext.getStore();
  if (existingContext) {
    return operation();
  }

  syncInMemoryState(await loadStateAsync());
  return deferredPersistenceContext.run({ dirty: false }, async () => {
    try {
      const result = await operation();
      if (deferredPersistenceContext.getStore()?.dirty) {
        await persistStateAsync();
      }
      return result;
    } catch (error) {
      if (deferredPersistenceContext.getStore()?.dirty) {
        await persistStateAsync();
      }
      throw error;
    }
  });
}

function toPublicInitialAccessToken(record: StoredIamInitialAccessToken): IamInitialAccessTokenRecord {
  return {
    id: record.id,
    realm_id: record.realm_id,
    policy_id: record.policy_id,
    label: record.label,
    status: record.status,
    remaining_uses: record.remaining_uses,
    expires_at: record.expires_at,
    created_at: record.created_at,
    created_by_user_id: record.created_by_user_id,
  };
}

function nextClientId(name: string): string {
  return slugify(name) || `client-${randomUUID().slice(0, 8)}`;
}

function assertRealmExists(realmId: string) {
  return LocalIamFoundationStore.getRealm(realmId);
}

function ensureRealmSeeds() {
  const now = nowIso();
  const existingPolicyKeys = new Set(state.client_policies.map((policy) => `${policy.realm_id}:${policy.name}`));
  for (const realm of LocalIamFoundationStore.listRealms().realms) {
    const key = `${realm.id}:default-browser-client-policy`;
    if (existingPolicyKeys.has(key)) {
      continue;
    }
    state.client_policies.push({
      id: `iam-client-policy-${realm.id}-default-browser-client-policy`,
      realm_id: realm.id,
      name: 'default-browser-client-policy',
      description: 'Default Phase B policy enabling standards-based browser and machine OAuth features for this realm.',
      status: 'ACTIVE',
      synthetic: true,
      allow_dynamic_registration: true,
      allow_device_authorization: true,
      allow_token_exchange: true,
      allow_pushed_authorization_requests: true,
      require_par_for_public_clients: false,
      require_pkce_for_public_clients: true,
      allow_wildcard_redirect_uris: true,
      allowed_protocols: ['OIDC'],
      allowed_access_types: ['PUBLIC', 'CONFIDENTIAL'],
      default_scope_ids: [],
      assigned_client_ids: [],
      created_at: now,
      updated_at: now,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    });
  }
  persistStateSyncOnly();
}

function expireState(): IamAdvancedOAuthTransientStateMaintenanceResult {
  const currentTime = Date.now();
  let expiredInitialAccessTokenCount = 0;
  let expiredRegistrationAccessTokenCount = 0;
  let expiredPushedAuthorizationRequestCount = 0;
  let expiredDeviceAuthorizationCount = 0;
  let expiredBackchannelAuthenticationRequestCount = 0;
  let terminatedTokenExchangeCount = 0;
  let revokedExchangedTokenCount = 0;

  for (const token of state.initial_access_tokens) {
    if (token.status === 'ACTIVE' && token.expires_at && Date.parse(token.expires_at) <= currentTime) {
      token.status = 'EXPIRED';
      expiredInitialAccessTokenCount += 1;
    }
  }

  for (const token of state.registration_access_tokens) {
    if (token.status === 'ACTIVE' && token.expires_at && Date.parse(token.expires_at) <= currentTime) {
      token.status = 'EXPIRED';
      expiredRegistrationAccessTokenCount += 1;
    }
  }

  for (const request of state.pushed_authorization_requests) {
    if (request.status === 'ACTIVE' && Date.parse(request.expires_at) <= currentTime) {
      request.status = 'EXPIRED';
      expiredPushedAuthorizationRequestCount += 1;
    }
  }

  for (const deviceAuthorization of state.device_authorizations) {
    if (
      (deviceAuthorization.status === 'PENDING' || deviceAuthorization.status === 'APPROVED')
      && Date.parse(deviceAuthorization.expires_at) <= currentTime
    ) {
      deviceAuthorization.status = 'EXPIRED';
      expiredDeviceAuthorizationCount += 1;
      continue;
    }
    if (
      deviceAuthorization.status === 'APPROVED'
      && deviceAuthorization.session_id
      && !LocalIamAuthenticationRuntimeStore.isAccountSessionActiveForRuntime(
        deviceAuthorization.realm_id,
        deviceAuthorization.session_id,
      )
    ) {
      deviceAuthorization.status = 'EXPIRED';
      expiredDeviceAuthorizationCount += 1;
    }
  }

  for (const request of state.backchannel_authentication_requests) {
    if (
      (request.status === 'PENDING' || request.status === 'APPROVED')
      && Date.parse(request.expires_at) <= currentTime
    ) {
      request.status = 'EXPIRED';
      expiredBackchannelAuthenticationRequestCount += 1;
      continue;
    }
    if (
      request.status === 'APPROVED'
      && request.session_id
      && !LocalIamAuthenticationRuntimeStore.isAccountSessionActiveForRuntime(
        request.realm_id,
        request.session_id,
      )
    ) {
      request.status = 'EXPIRED';
      expiredBackchannelAuthenticationRequestCount += 1;
    }
  }

  for (const tokenExchange of state.token_exchanges) {
    if (tokenExchange.status !== 'ISSUED') {
      continue;
    }
    const subjectToken = LocalIamProtocolRuntimeStore.resolveIssuedTokenByIdForRuntime(
      tokenExchange.realm_id,
      tokenExchange.subject_token_id,
    );
    if (!subjectToken || subjectToken.status !== 'ACTIVE') {
      const terminated = terminateDerivedTokenExchangesForSubjectTokenSyncOnly(
        tokenExchange.realm_id,
        tokenExchange.subject_token_id,
        subjectToken?.status === 'EXPIRED' ? 'EXPIRED' : 'REVOKED',
      );
      terminatedTokenExchangeCount += terminated.terminated_token_exchange_count;
      revokedExchangedTokenCount += terminated.revoked_exchanged_token_count;
      continue;
    }
    if (!tokenExchange.exchanged_token_id) {
      continue;
    }
    const exchangedToken = LocalIamProtocolRuntimeStore.resolveIssuedTokenByIdForRuntime(
      tokenExchange.realm_id,
      tokenExchange.exchanged_token_id,
    );
    if (!exchangedToken || exchangedToken.status === 'ACTIVE') {
      continue;
    }
    tokenExchange.status = exchangedToken.status === 'EXPIRED' ? 'EXPIRED' : 'REVOKED';
    terminatedTokenExchangeCount += 1;
  }

  const totalMutatedCount =
    expiredInitialAccessTokenCount
    + expiredRegistrationAccessTokenCount
    + expiredPushedAuthorizationRequestCount
    + expiredDeviceAuthorizationCount
    + expiredBackchannelAuthenticationRequestCount
    + terminatedTokenExchangeCount
    + revokedExchangedTokenCount;

  if (totalMutatedCount > 0) {
    persistStateSyncOnly();
  }

  return {
    expired_initial_access_token_count: expiredInitialAccessTokenCount,
    expired_registration_access_token_count: expiredRegistrationAccessTokenCount,
    expired_pushed_authorization_request_count: expiredPushedAuthorizationRequestCount,
    expired_device_authorization_count: expiredDeviceAuthorizationCount,
    expired_backchannel_authentication_request_count: expiredBackchannelAuthenticationRequestCount,
    terminated_token_exchange_count: terminatedTokenExchangeCount,
    revoked_exchanged_token_count: revokedExchangedTokenCount,
    total_mutated_count: totalMutatedCount,
  };
}

function terminateDerivedTokenExchangesForSubjectTokenSyncOnly(
  realmId: string,
  subjectTokenId: string,
  terminalStatus: Extract<IamTokenExchangeStatus, 'REVOKED' | 'EXPIRED'>,
): { terminated_token_exchange_count: number; revoked_exchanged_token_count: number } {
  ensureRealmSeeds();
  const queue = [subjectTokenId];
  const visitedSubjectTokenIds = new Set<string>();
  let terminatedTokenExchangeCount = 0;
  let revokedExchangedTokenCount = 0;

  while (queue.length > 0) {
    const currentSubjectTokenId = queue.shift();
    if (!currentSubjectTokenId || visitedSubjectTokenIds.has(currentSubjectTokenId)) {
      continue;
    }
    visitedSubjectTokenIds.add(currentSubjectTokenId);

    for (const tokenExchange of state.token_exchanges) {
      if (
        tokenExchange.realm_id !== realmId
        || tokenExchange.subject_token_id !== currentSubjectTokenId
        || tokenExchange.status !== 'ISSUED'
      ) {
        continue;
      }
      if (tokenExchange.exchanged_token_id) {
        const exchangedToken = LocalIamProtocolRuntimeStore.resolveIssuedTokenByIdForRuntime(
          realmId,
          tokenExchange.exchanged_token_id,
        );
        if (exchangedToken?.status === 'ACTIVE') {
          const revoked = LocalIamProtocolRuntimeStore.revokeIssuedTokenByIdSyncOnly(
            realmId,
            tokenExchange.exchanged_token_id,
          );
          if (revoked.revoked) {
            revokedExchangedTokenCount += 1;
          }
        }
        queue.push(tokenExchange.exchanged_token_id);
      }
      tokenExchange.status = terminalStatus;
      terminatedTokenExchangeCount += 1;
    }
  }

  if (terminatedTokenExchangeCount > 0) {
    persistStateSyncOnly();
  }

  return {
    terminated_token_exchange_count: terminatedTokenExchangeCount,
    revoked_exchanged_token_count: revokedExchangedTokenCount,
  };
}

function assertPolicyExists(policyId: string): IamClientPolicyRecord {
  ensureRealmSeeds();
  const policy = state.client_policies.find((candidate) => candidate.id === policyId);
  if (!policy) {
    throw new Error(`Unknown client policy: ${policyId}`);
  }
  return policy;
}

function listScopeIdsByName(realmId: string, scopeNames: string[]): string[] {
  if (scopeNames.length === 0) {
    return [];
  }
  const scopeByName = new Map(
    LocalIamProtocolRuntimeStore.listClientScopes({ realm_id: realmId, protocol: 'OIDC' }).client_scopes
      .map((scope) => [scope.name, scope.id]),
  );
  return Array.from(new Set(scopeNames.map((name) => {
    const scopeId = scopeByName.get(name);
    if (!scopeId) {
      throw new Error(`Unknown client scope in realm ${realmId}: ${name}`);
    }
    return scopeId;
  })));
}

function getEffectivePoliciesForClient(realmId: string, clientId: string): IamClientPolicyRecord[] {
  ensureRealmSeeds();
  const activePolicies = state.client_policies.filter(
    (policy) => policy.realm_id === realmId && policy.status === 'ACTIVE',
  );
  const assigned = activePolicies.filter((policy) => policy.assigned_client_ids.includes(clientId));
  if (assigned.length > 0) {
    return clone(assigned);
  }
  const fallbackPolicies = activePolicies.filter((policy) => policy.synthetic && policy.assigned_client_ids.length === 0);
  return clone(fallbackPolicies);
}

function assertClientActionAllowed(
  client: IamClientRecord,
  action: 'PAR' | 'DEVICE_AUTHORIZATION' | 'BACKCHANNEL_AUTHENTICATION' | 'TOKEN_EXCHANGE',
): IamClientPolicyRecord[] {
  const policies = getEffectivePoliciesForClient(client.realm_id, client.id);
  if (policies.length === 0) {
    throw new Error(`No active client policy is assigned to ${client.client_id}`);
  }
  const allowed = policies.some((policy) => {
    if (!policy.allowed_protocols.includes(client.protocol)) {
      return false;
    }
    if (!policy.allowed_access_types.includes(client.access_type)) {
      return false;
    }
    if (action === 'PAR') {
      return policy.allow_pushed_authorization_requests;
    }
    if (action === 'DEVICE_AUTHORIZATION') {
      return policy.allow_device_authorization;
    }
    if (action === 'BACKCHANNEL_AUTHENTICATION') {
      return policy.allow_device_authorization;
    }
    return policy.allow_token_exchange;
  });
  if (!allowed) {
    throw new Error(`Client policy does not permit ${action.toLowerCase().replace(/_/g, ' ')} for ${client.client_id}`);
  }
  return policies;
}

function resolveBackchannelLoginHintUser(realmId: string, loginHint: string): { id: string } {
  const normalized = loginHint.trim().toLowerCase();
  const user = LocalIamFoundationStore
    .listUsers({ realm_id: realmId })
    .users
    .find((candidate) => {
      if (candidate.status !== 'ACTIVE') {
        return false;
      }
      return [
        candidate.id,
        candidate.username,
        candidate.email,
      ].some((value) => value.trim().toLowerCase() === normalized);
    });
  if (!user) {
    throw new Error('Unknown or inactive login_hint subject');
  }
  return { id: user.id };
}

function assertDynamicRegistrationAllowed(policy: IamClientPolicyRecord, accessType: IamClientAccessType, redirectUris: string[]) {
  if (!policy.allow_dynamic_registration) {
    throw new Error('Client policy does not permit dynamic registration');
  }
  if (!policy.allowed_protocols.includes('OIDC')) {
    throw new Error('Client policy does not allow OIDC clients');
  }
  if (!policy.allowed_access_types.includes(accessType)) {
    throw new Error('Client policy does not allow the requested client access type');
  }
  if (!policy.allow_wildcard_redirect_uris && redirectUris.some((uri) => uri.includes('*'))) {
    throw new Error('Client policy does not permit wildcard redirect URIs');
  }
}

function consumeInitialAccessToken(realmId: string, authorizationHeader: string | null): StoredIamInitialAccessToken {
  expireState();
  const bearer = authorizationHeader?.trim().startsWith('Bearer ') ? authorizationHeader.trim().slice('Bearer '.length) : null;
  if (!bearer) {
    throw new Error('Missing initial access token');
  }
  const tokenHash = hashToken(bearer);
  const record = state.initial_access_tokens.find(
    (candidate) =>
      candidate.realm_id === realmId
      && candidate.token_hash === tokenHash
      && candidate.status === 'ACTIVE',
  );
  if (!record) {
    throw new Error('Invalid initial access token');
  }
  if (record.remaining_uses !== null) {
    record.remaining_uses = Math.max(record.remaining_uses - 1, 0);
    if (record.remaining_uses === 0) {
      record.status = 'CONSUMED';
    }
  }
  persistStateSyncOnly();
  return record;
}

function resolveRegistrationAccessToken(
  realmId: string,
  clientId: string,
  authorizationHeader: string | null,
): StoredIamRegistrationAccessToken {
  expireState();
  const bearer = authorizationHeader?.trim().startsWith('Bearer ') ? authorizationHeader.trim().slice('Bearer '.length) : null;
  if (!bearer) {
    throw new Error('Missing registration access token');
  }
  const tokenHash = hashToken(bearer);
  const record = state.registration_access_tokens.find(
    (candidate) =>
      candidate.realm_id === realmId
      && candidate.client_id === clientId
      && candidate.token_hash === tokenHash
      && candidate.status === 'ACTIVE',
  );
  if (!record) {
    throw new Error('Invalid registration access token');
  }
  return record;
}

function issueRegistrationAccessToken(client: IamClientRecord, actorUserId: string): { record: StoredIamRegistrationAccessToken; token: string } {
  const token = randomToken('reg');
  const record: StoredIamRegistrationAccessToken = {
    id: `iam-registration-token-${randomUUID()}`,
    realm_id: client.realm_id,
    client_id: client.id,
    token_hash: hashToken(token),
    status: 'ACTIVE',
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    created_at: nowIso(),
    created_by_user_id: actorUserId,
  };
  state.registration_access_tokens = state.registration_access_tokens.filter(
    (candidate) => !(candidate.realm_id === client.realm_id && candidate.client_id === client.id && candidate.status === 'ACTIVE'),
  );
  state.registration_access_tokens.push(record);
  persistStateSyncOnly();
  return { record, token };
}

function buildDynamicRegistrationResponse(
  client: IamClientRecord,
  clientSecret: string | null,
  registrationAccessToken: string,
  registrationBaseUrl: string,
  assignedPolicyIds: string[],
): IamDynamicClientRegistrationResponse {
  const grantTypes: string[] = [];
  if (client.standard_flow_enabled) {
    grantTypes.push('authorization_code');
  }
  if (client.direct_access_grants_enabled) {
    grantTypes.push('password');
  }
  if (client.service_account_enabled) {
    grantTypes.push('client_credentials');
  }
  grantTypes.push('refresh_token');
  return {
    client,
    client_secret: clientSecret,
    registration_access_token: registrationAccessToken,
    registration_client_uri: `${registrationBaseUrl.replace(/\/+$/, '')}/${client.id}`,
    token_endpoint_auth_method: client.access_type === 'PUBLIC' ? 'none' : 'client_secret_basic',
    grant_types: grantTypes,
    assigned_policy_ids: assignedPolicyIds,
  };
}

function createClientFromDynamicRegistration(
  actorUserId: string,
  realmId: string,
  policy: IamClientPolicyRecord,
  input: IamDynamicClientRegistrationRequest,
): { client: IamClientRecord; clientSecret: string | null } {
  const accessType: IamClientAccessType = input.token_endpoint_auth_method === 'none' ? 'PUBLIC' : 'CONFIDENTIAL';
  const redirectUris = Array.from(new Set((input.redirect_uris ?? []).map((value) => value.trim()).filter(Boolean)));
  assertDynamicRegistrationAllowed(policy, accessType, redirectUris);
  const grantTypes = new Set((input.grant_types ?? ['authorization_code']).map((grantType) => grantType.trim()).filter(Boolean));
  const scopeNames = parseList(input.scope);
  const request: CreateIamClientRequest = {
    realm_id: realmId,
    client_id: normalizeOptionalString(input.client_id) ?? nextClientId(input.client_name),
    name: input.client_name.trim(),
    summary: normalizeOptionalString(input.client_uri) ?? 'Dynamically registered OIDC client.',
    protocol: 'OIDC',
    access_type: accessType,
    status: 'ACTIVE',
    redirect_uris: redirectUris,
    base_url: redirectUris[0] ?? null,
    root_url: redirectUris[0] ?? null,
    default_scope_ids: [
      ...policy.default_scope_ids,
      ...listScopeIdsByName(realmId, scopeNames),
    ],
    optional_scope_ids: [],
    direct_protocol_mapper_ids: [],
    standard_flow_enabled: grantTypes.has('authorization_code'),
    direct_access_grants_enabled: grantTypes.has('password'),
    service_account_enabled: grantTypes.has('client_credentials'),
  };
  const created = LocalIamProtocolRuntimeStore.createClientSyncOnly(actorUserId, request);
  return {
    client: created.client,
    clientSecret: created.issued_client_secret,
  };
}

async function createClientFromDynamicRegistrationAsync(
  actorUserId: string,
  realmId: string,
  policy: IamClientPolicyRecord,
  input: IamDynamicClientRegistrationRequest,
): Promise<{ client: IamClientRecord; clientSecret: string | null }> {
  const accessType: IamClientAccessType = input.token_endpoint_auth_method === 'none' ? 'PUBLIC' : 'CONFIDENTIAL';
  const redirectUris = Array.from(new Set((input.redirect_uris ?? []).map((value) => value.trim()).filter(Boolean)));
  assertDynamicRegistrationAllowed(policy, accessType, redirectUris);
  const grantTypes = new Set((input.grant_types ?? ['authorization_code']).map((grantType) => grantType.trim()).filter(Boolean));
  const scopeNames = parseList(input.scope);
  const request: CreateIamClientRequest = {
    realm_id: realmId,
    client_id: normalizeOptionalString(input.client_id) ?? nextClientId(input.client_name),
    name: input.client_name.trim(),
    summary: normalizeOptionalString(input.client_uri) ?? 'Dynamically registered OIDC client.',
    protocol: 'OIDC',
    access_type: accessType,
    status: 'ACTIVE',
    redirect_uris: redirectUris,
    base_url: redirectUris[0] ?? null,
    root_url: redirectUris[0] ?? null,
    default_scope_ids: [
      ...policy.default_scope_ids,
      ...listScopeIdsByName(realmId, scopeNames),
    ],
    optional_scope_ids: [],
    direct_protocol_mapper_ids: [],
    standard_flow_enabled: grantTypes.has('authorization_code'),
    direct_access_grants_enabled: grantTypes.has('password'),
    service_account_enabled: grantTypes.has('client_credentials'),
  };
  const created = await LocalIamProtocolRuntimeStore.createClientAsync(actorUserId, request);
  return {
    client: created.client,
    clientSecret: created.issued_client_secret,
  };
}

function createClientPolicyRecord(actorUserId: string, input: CreateIamClientPolicyRequest): IamClientPolicyRecord {
  ensureRealmSeeds();
  assertRealmExists(input.realm_id);
  const name = input.name.trim();
  if (!name) {
    throw new Error('Missing required field: name');
  }
  if (state.client_policies.some((policy) => policy.realm_id === input.realm_id && policy.name === name)) {
    throw new Error(`Client policy already exists in realm ${input.realm_id}: ${name}`);
  }
  const record: IamClientPolicyRecord = {
    id: `iam-client-policy-${randomUUID()}`,
    realm_id: input.realm_id,
    name,
    description: input.description?.trim() ?? '',
    status: input.status ?? 'ACTIVE',
    synthetic: false,
    allow_dynamic_registration: input.allow_dynamic_registration ?? false,
    allow_device_authorization: input.allow_device_authorization ?? false,
    allow_token_exchange: input.allow_token_exchange ?? false,
    allow_pushed_authorization_requests: input.allow_pushed_authorization_requests ?? false,
    require_par_for_public_clients: input.require_par_for_public_clients ?? false,
    require_pkce_for_public_clients: input.require_pkce_for_public_clients ?? true,
    allow_wildcard_redirect_uris: input.allow_wildcard_redirect_uris ?? false,
    allowed_protocols: Array.from(new Set(input.allowed_protocols ?? ['OIDC'])),
    allowed_access_types: Array.from(new Set(input.allowed_access_types ?? ['PUBLIC', 'CONFIDENTIAL'])),
    default_scope_ids: Array.from(new Set(input.default_scope_ids ?? [])),
    assigned_client_ids: Array.from(new Set(input.assigned_client_ids ?? [])),
    created_at: nowIso(),
    updated_at: nowIso(),
    created_by_user_id: actorUserId,
    updated_by_user_id: actorUserId,
  };
  state.client_policies.push(record);
  persistStateSyncOnly();
  return clone(record);
}

function updateClientPolicyRecord(
  actorUserId: string,
  policyId: string,
  input: UpdateIamClientPolicyRequest,
): IamClientPolicyRecord {
  ensureRealmSeeds();
  const policy = assertPolicyExists(policyId);
  if (input.name !== undefined) {
    const nextName = input.name.trim();
    if (!nextName) {
      throw new Error('Client policy name cannot be empty');
    }
    policy.name = nextName;
  }
  if (input.description !== undefined) {
    policy.description = input.description.trim();
  }
  if (input.status) {
    policy.status = input.status;
  }
  if (typeof input.allow_dynamic_registration === 'boolean') {
    policy.allow_dynamic_registration = input.allow_dynamic_registration;
  }
  if (typeof input.allow_device_authorization === 'boolean') {
    policy.allow_device_authorization = input.allow_device_authorization;
  }
  if (typeof input.allow_token_exchange === 'boolean') {
    policy.allow_token_exchange = input.allow_token_exchange;
  }
  if (typeof input.allow_pushed_authorization_requests === 'boolean') {
    policy.allow_pushed_authorization_requests = input.allow_pushed_authorization_requests;
  }
  if (typeof input.require_par_for_public_clients === 'boolean') {
    policy.require_par_for_public_clients = input.require_par_for_public_clients;
  }
  if (typeof input.require_pkce_for_public_clients === 'boolean') {
    policy.require_pkce_for_public_clients = input.require_pkce_for_public_clients;
  }
  if (typeof input.allow_wildcard_redirect_uris === 'boolean') {
    policy.allow_wildcard_redirect_uris = input.allow_wildcard_redirect_uris;
  }
  if (input.allowed_protocols) {
    policy.allowed_protocols = Array.from(new Set(input.allowed_protocols));
  }
  if (input.allowed_access_types) {
    policy.allowed_access_types = Array.from(new Set(input.allowed_access_types));
  }
  if (input.default_scope_ids) {
    policy.default_scope_ids = Array.from(new Set(input.default_scope_ids));
  }
  if (input.assigned_client_ids) {
    policy.assigned_client_ids = Array.from(new Set(input.assigned_client_ids));
  }
  policy.updated_at = nowIso();
  policy.updated_by_user_id = actorUserId;
  persistStateSyncOnly();
  return clone(policy);
}

function issueInitialAccessTokenRecord(
  actorUserId: string,
  input: CreateIamInitialAccessTokenRequest,
): IamInitialAccessTokenIssueResponse {
  ensureRealmSeeds();
  assertRealmExists(input.realm_id);
  const policy = assertPolicyExists(input.policy_id);
  if (policy.realm_id !== input.realm_id) {
    throw new Error('Initial access token policy must belong to the same realm');
  }
  const rawToken = randomToken('iat');
  const expiresAt = input.expires_in_hours
    ? new Date(Date.now() + input.expires_in_hours * 60 * 60 * 1000).toISOString()
    : null;
  const record: StoredIamInitialAccessToken = {
    id: `iam-initial-access-token-${randomUUID()}`,
    realm_id: input.realm_id,
    policy_id: input.policy_id,
    label: input.label.trim(),
    token_hash: hashToken(rawToken),
    status: 'ACTIVE',
    remaining_uses: input.max_uses ?? null,
    expires_at: expiresAt,
    created_at: nowIso(),
    created_by_user_id: actorUserId,
  };
  state.initial_access_tokens.push(record);
  persistStateSyncOnly();
  return {
    token: toPublicInitialAccessToken(record),
    issued_token: rawToken,
  };
}

async function registerDynamicClientRecordAsync(
  realmId: string,
  authorizationHeader: string | null,
  input: IamDynamicClientRegistrationRequest,
  registrationBaseUrl: string,
): Promise<IamDynamicClientRegistrationResponse> {
  ensureRealmSeeds();
  assertRealmExists(realmId);
  if (!input.client_name?.trim()) {
    throw new Error('Missing required field: client_name');
  }
  const initialAccessToken = consumeInitialAccessToken(realmId, authorizationHeader);
  const policy = assertPolicyExists(normalizeOptionalString(input.policy_id) ?? initialAccessToken.policy_id);
  if (policy.realm_id !== realmId) {
    throw new Error('Selected client policy does not belong to this realm');
  }
  const grantTypes = Array.from(new Set((input.grant_types ?? ['authorization_code']).map((grantType) => grantType.trim()).filter(Boolean)));
  assertSupportedGrantTypes(grantTypes);
  const created = await createClientFromDynamicRegistrationAsync(
    `iam-dynamic-registration:${initialAccessToken.id}`,
    realmId,
    policy,
    input,
  );
  if (!policy.assigned_client_ids.includes(created.client.id)) {
    policy.assigned_client_ids = Array.from(new Set([...policy.assigned_client_ids, created.client.id]));
    policy.updated_at = nowIso();
    policy.updated_by_user_id = `iam-dynamic-registration:${initialAccessToken.id}`;
  }
  const registrationToken = issueRegistrationAccessToken(created.client, `iam-dynamic-registration:${initialAccessToken.id}`);
  return buildDynamicRegistrationResponse(
    created.client,
    created.clientSecret,
    registrationToken.token,
    registrationBaseUrl,
    [policy.id],
  );
}

async function updateDynamicClientRegistrationRecordAsync(
  realmId: string,
  clientRecordId: string,
  authorizationHeader: string | null,
  input: IamDynamicClientRegistrationRequest,
  registrationBaseUrl: string,
): Promise<IamDynamicClientRegistrationResponse> {
  resolveRegistrationAccessToken(realmId, clientRecordId, authorizationHeader);
  const clients = LocalIamProtocolRuntimeStore.listClients({ realm_id: realmId }).clients;
  const client = clients.find((candidate) => candidate.id === clientRecordId);
  if (!client) {
    throw new Error('Unknown dynamic registration client');
  }
  const effectivePolicies = getEffectivePoliciesForClient(realmId, client.id);
  if (effectivePolicies.length === 0) {
    throw new Error(`No active client policy is assigned to ${client.client_id}`);
  }
  for (const policy of effectivePolicies) {
    if (!policy.allow_wildcard_redirect_uris && (input.redirect_uris ?? []).some((uri) => uri.includes('*'))) {
      throw new Error('Assigned client policy does not permit wildcard redirect URIs');
    }
  }
  const updated = await LocalIamProtocolRuntimeStore.updateClientAsync(client.id, client.id, {
    name: input.client_name?.trim() || client.name,
    summary: normalizeOptionalString(input.client_uri) ?? client.summary,
    redirect_uris: input.redirect_uris ? Array.from(new Set(input.redirect_uris.map((uri) => uri.trim()).filter(Boolean))) : client.redirect_uris,
    base_url: input.redirect_uris?.[0] ?? client.base_url,
    root_url: input.redirect_uris?.[0] ?? client.root_url,
    default_scope_ids: input.scope ? listScopeIdsByName(realmId, parseList(input.scope)) : client.default_scope_ids,
    standard_flow_enabled: input.grant_types ? input.grant_types.includes('authorization_code') : client.standard_flow_enabled,
    direct_access_grants_enabled: input.grant_types ? input.grant_types.includes('password') : client.direct_access_grants_enabled,
    service_account_enabled: input.grant_types ? input.grant_types.includes('client_credentials') : client.service_account_enabled,
  });
  return buildDynamicRegistrationResponse(
    updated,
    null,
    parseBearerToken(authorizationHeader) ?? '',
    registrationBaseUrl,
    effectivePolicies.map((policy) => policy.id),
  );
}

async function archiveDynamicClientRegistrationRecordAsync(
  realmId: string,
  clientRecordId: string,
  authorizationHeader: string | null,
): Promise<{ archived: boolean; client_id: string }> {
  resolveRegistrationAccessToken(realmId, clientRecordId, authorizationHeader);
  const clients = LocalIamProtocolRuntimeStore.listClients({ realm_id: realmId }).clients;
  const client = clients.find((candidate) => candidate.id === clientRecordId);
  if (!client) {
    throw new Error('Unknown dynamic registration client');
  }
  await LocalIamProtocolRuntimeStore.updateClientAsync(client.id, client.id, {
    status: 'ARCHIVED',
  });
  state.registration_access_tokens
    .filter((record) => record.realm_id === realmId && record.client_id === clientRecordId && record.status === 'ACTIVE')
    .forEach((record) => {
      record.status = 'REVOKED';
    });
  return {
    archived: true,
    client_id: client.client_id,
  };
}

function parseBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) {
    return null;
  }
  const value = authorizationHeader.trim();
  return value.startsWith('Bearer ') ? value.slice('Bearer '.length) : null;
}

function assertSupportedGrantTypes(grantTypes: string[]) {
  const supported = new Set([
    'authorization_code',
    'password',
    'client_credentials',
    'refresh_token',
  ]);
  for (const grantType of grantTypes) {
    if (!supported.has(grantType)) {
      throw new Error(`Unsupported grant_type for dynamic registration: ${grantType}`);
    }
  }
}

export const LocalIamAdvancedOAuthRuntimeStore = {
  getSummary(): IamAdvancedOAuthSummary {
    ensureRealmSeeds();
    expireState();
    return {
      client_policy_count: state.client_policies.length,
      initial_access_token_count: state.initial_access_tokens.length,
      active_initial_access_token_count: state.initial_access_tokens.filter((token) => token.status === 'ACTIVE').length,
      pushed_authorization_request_count: state.pushed_authorization_requests.length,
      active_pushed_authorization_request_count: state.pushed_authorization_requests.filter((request) => request.status === 'ACTIVE').length,
      device_authorization_count: state.device_authorizations.length,
      active_device_authorization_count: state.device_authorizations.filter((request) => request.status === 'PENDING' || request.status === 'APPROVED').length,
      backchannel_authentication_count: state.backchannel_authentication_requests.length,
      active_backchannel_authentication_count: state.backchannel_authentication_requests.filter(
        (request) => request.status === 'PENDING' || request.status === 'APPROVED',
      ).length,
      token_exchange_count: state.token_exchanges.length,
    };
  },

  listClientPolicies(filters?: { realm_id?: string | null }, pagination?: IamListPagination): IamClientPoliciesResponse {
    ensureRealmSeeds();
    const policies = filters?.realm_id
      ? state.client_policies.filter((policy) => policy.realm_id === filters.realm_id)
      : state.client_policies;
    const pagedPolicies = paginateList(policies, pagination);
    return {
      generated_at: nowIso(),
      client_policies: clone(pagedPolicies.data),
      count: pagedPolicies.count,
      offset: pagedPolicies.offset,
      limit: pagedPolicies.limit,
      has_more: pagedPolicies.has_more,
    };
  },

  async createClientPolicyAsync(
    actorUserId: string,
    input: CreateIamClientPolicyRequest,
  ): Promise<IamClientPolicyRecord> {
    return runWithDeferredPersistence(() => createClientPolicyRecord(actorUserId, input));
  },

  async updateClientPolicyAsync(
    actorUserId: string,
    policyId: string,
    input: UpdateIamClientPolicyRequest,
  ): Promise<IamClientPolicyRecord> {
    return runWithDeferredPersistence(() => updateClientPolicyRecord(actorUserId, policyId, input));
  },

  listInitialAccessTokens(filters?: { realm_id?: string | null }, pagination?: IamListPagination): IamInitialAccessTokensResponse {
    ensureRealmSeeds();
    expireState();
    const tokens = filters?.realm_id
      ? state.initial_access_tokens.filter((token) => token.realm_id === filters.realm_id)
      : state.initial_access_tokens;
    const pagedTokens = paginateList(tokens, pagination);
    return {
      generated_at: nowIso(),
      tokens: pagedTokens.data.map(toPublicInitialAccessToken),
      count: pagedTokens.count,
      offset: pagedTokens.offset,
      limit: pagedTokens.limit,
      has_more: pagedTokens.has_more,
    };
  },

  async issueInitialAccessTokenAsync(
    actorUserId: string,
    input: CreateIamInitialAccessTokenRequest,
  ): Promise<IamInitialAccessTokenIssueResponse> {
    return runWithDeferredPersistence(() => issueInitialAccessTokenRecord(actorUserId, input));
  },

  async registerDynamicClientAsync(
    realmId: string,
    authorizationHeader: string | null,
    input: IamDynamicClientRegistrationRequest,
    registrationBaseUrl: string,
  ): Promise<IamDynamicClientRegistrationResponse> {
    return runWithDeferredPersistence(() => registerDynamicClientRecordAsync(
      realmId,
      authorizationHeader,
      input,
      registrationBaseUrl,
    ));
  },

  getDynamicClientRegistration(
    realmId: string,
    clientRecordId: string,
    authorizationHeader: string | null,
    registrationBaseUrl: string,
  ): IamDynamicClientRegistrationResponse {
    resolveRegistrationAccessToken(realmId, clientRecordId, authorizationHeader);
    const clients = LocalIamProtocolRuntimeStore.listClients({ realm_id: realmId }).clients;
    const client = clients.find((candidate) => candidate.id === clientRecordId);
    if (!client) {
      throw new Error('Unknown dynamic registration client');
    }
    const assignedPolicies = getEffectivePoliciesForClient(realmId, client.id).map((policy) => policy.id);
    return buildDynamicRegistrationResponse(
      client,
      null,
      parseBearerToken(authorizationHeader) ?? '',
      registrationBaseUrl,
      assignedPolicies,
    );
  },

  async updateDynamicClientRegistrationAsync(
    realmId: string,
    clientRecordId: string,
    authorizationHeader: string | null,
    input: IamDynamicClientRegistrationRequest,
    registrationBaseUrl: string,
  ): Promise<IamDynamicClientRegistrationResponse> {
    return runWithDeferredPersistence(() => updateDynamicClientRegistrationRecordAsync(
      realmId,
      clientRecordId,
      authorizationHeader,
      input,
      registrationBaseUrl,
    ));
  },

  async archiveDynamicClientRegistrationAsync(
    realmId: string,
    clientRecordId: string,
    authorizationHeader: string | null,
  ): Promise<{ archived: boolean; client_id: string }> {
    return runWithDeferredPersistence(() => archiveDynamicClientRegistrationRecordAsync(
      realmId,
      clientRecordId,
      authorizationHeader,
    ));
  },

  createPushedAuthorizationRequest(
    realmId: string,
    payload: Record<string, unknown>,
    authorizationHeader: string | null,
  ): IamPushedAuthorizationRequestResponse {
    ensureRealmSeeds();
    expireState();
    const client = LocalIamProtocolRuntimeStore.resolveAuthenticatedClient(realmId, payload, authorizationHeader);
    assertClientActionAllowed(client, 'PAR');
    const redirectUri = typeof payload.redirect_uri === 'string' ? payload.redirect_uri.trim() : '';
    if (!redirectUri) {
      throw new Error('Missing required field: redirect_uri');
    }
    const requestUri = `urn:ietf:params:oauth:request_uri:${randomUUID()}`;
    const record: StoredIamPushedAuthorizationRequest = {
      id: `iam-par-${randomUUID()}`,
      request_uri: requestUri,
      realm_id: realmId,
      client_id: client.client_id,
      redirect_uri: redirectUri,
      response_type: normalizeOptionalString(payload.response_type as string | undefined),
      response_mode: normalizeOptionalString(payload.response_mode as string | undefined),
      scope: normalizeOptionalString(payload.scope as string | undefined),
      requested_purpose: normalizeOptionalString(payload.requested_purpose as string | undefined),
      state: normalizeOptionalString(payload.state as string | undefined),
      nonce: normalizeOptionalString(payload.nonce as string | undefined),
      prompt: normalizeOptionalString(payload.prompt as string | undefined),
      code_challenge: normalizeOptionalString(payload.code_challenge as string | undefined),
      code_challenge_method: normalizeOptionalString(payload.code_challenge_method as string | undefined) as 'plain' | 'S256' | null,
      status: 'ACTIVE',
      expires_at: new Date(Date.now() + PUSHED_AUTHORIZATION_REQUEST_TTL_MS).toISOString(),
      created_at: nowIso(),
    };
    state.pushed_authorization_requests.unshift(record);
    persistStateSyncOnly();
    return {
      request_uri: record.request_uri,
      expires_in: Math.floor(PUSHED_AUTHORIZATION_REQUEST_TTL_MS / 1000),
      request: clone(record),
    };
  },

  async createPushedAuthorizationRequestAsync(
    realmId: string,
    payload: Record<string, unknown>,
    authorizationHeader: string | null,
  ): Promise<IamPushedAuthorizationRequestResponse> {
    return runWithDeferredPersistence(() => this.createPushedAuthorizationRequest(realmId, payload, authorizationHeader));
  },

  resolvePushedAuthorizationRequest(realmId: string, requestUri: string): CreateIamAuthorizationRequestInput {
    ensureRealmSeeds();
    expireState();
    const record = state.pushed_authorization_requests.find(
      (candidate) => candidate.realm_id === realmId && candidate.request_uri === requestUri,
    );
    if (!record || record.status !== 'ACTIVE') {
      throw new Error('Unknown or inactive pushed authorization request');
    }
    record.status = 'CONSUMED';
    persistStateSyncOnly();
    return {
      client_id: record.client_id,
      redirect_uri: record.redirect_uri,
      response_type: record.response_type,
      response_mode: record.response_mode,
      scope: record.scope,
      requested_purpose: record.requested_purpose,
      state: record.state,
      nonce: record.nonce,
      prompt: record.prompt,
      code_challenge: record.code_challenge,
      code_challenge_method: record.code_challenge_method,
    };
  },

  async resolvePushedAuthorizationRequestAsync(
    realmId: string,
    requestUri: string,
  ): Promise<CreateIamAuthorizationRequestInput> {
    return runWithDeferredPersistence(() => this.resolvePushedAuthorizationRequest(realmId, requestUri));
  },

  listPushedAuthorizationRequests(
    filters?: { realm_id?: string | null; client_id?: string | null },
    pagination?: IamListPagination,
  ): IamPushedAuthorizationRequestsResponse {
    ensureRealmSeeds();
    expireState();
    let requests = state.pushed_authorization_requests;
    if (filters?.realm_id) {
      requests = requests.filter((request) => request.realm_id === filters.realm_id);
    }
    if (filters?.client_id) {
      requests = requests.filter((request) => request.client_id === filters.client_id);
    }
    const pagedRequests = paginateList(requests, pagination);
    return {
      generated_at: nowIso(),
      requests: clone(pagedRequests.data),
      count: pagedRequests.count,
      offset: pagedRequests.offset,
      limit: pagedRequests.limit,
      has_more: pagedRequests.has_more,
    };
  },

  createDeviceAuthorization(
    realmId: string,
    payload: Record<string, unknown>,
    authorizationHeader: string | null,
    uiBaseUrl: string,
  ): IamDeviceAuthorizationResponse {
    ensureRealmSeeds();
    expireState();
    const client = LocalIamProtocolRuntimeStore.resolveAuthenticatedClient(realmId, payload, authorizationHeader);
    assertClientActionAllowed(client, 'DEVICE_AUTHORIZATION');
    const scopeNames = parseList(typeof payload.scope === 'string' ? payload.scope : null);
    const userCode = `${randomCode(4)}-${randomCode(4)}`;
    const verificationUri = `${uiBaseUrl.replace(/\/+$/, '')}/iam/login?realm=${encodeURIComponent(realmId)}&flow=device`;
    const record: StoredIamDeviceAuthorization = {
      id: `iam-device-authorization-${randomUUID()}`,
      realm_id: realmId,
      client_id: client.client_id,
      device_code: randomToken('device'),
      user_code: userCode,
      scope: scopeNames.join(' '),
      scope_names: scopeNames,
      verification_uri: verificationUri,
      verification_uri_complete: `${verificationUri}&device_user_code=${encodeURIComponent(userCode)}`,
      interval: 5,
      expires_at: new Date(Date.now() + DEVICE_AUTHORIZATION_TTL_MS).toISOString(),
      status: 'PENDING',
      user_id: null,
      approved_at: null,
      denied_at: null,
      consumed_at: null,
      created_at: nowIso(),
      session_id: null,
      last_polled_at: null,
      poll_count: 0,
    };
    state.device_authorizations.unshift(record);
    persistStateSyncOnly();
    return {
      device_code: record.device_code,
      user_code: record.user_code,
      verification_uri: record.verification_uri,
      verification_uri_complete: record.verification_uri_complete,
      expires_in: Math.floor(DEVICE_AUTHORIZATION_TTL_MS / 1000),
      interval: record.interval,
      request: clone(record),
    };
  },

  async createDeviceAuthorizationAsync(
    realmId: string,
    payload: Record<string, unknown>,
    authorizationHeader: string | null,
    uiBaseUrl: string,
  ): Promise<IamDeviceAuthorizationResponse> {
    return runWithDeferredPersistence(() => this.createDeviceAuthorization(realmId, payload, authorizationHeader, uiBaseUrl));
  },

  createBackchannelAuthenticationRequest(
    realmId: string,
    payload: Record<string, unknown>,
    authorizationHeader: string | null,
  ): IamBackchannelAuthenticationResponse {
    ensureRealmSeeds();
    expireState();
    const client = LocalIamProtocolRuntimeStore.resolveAuthenticatedClient(realmId, payload, authorizationHeader);
    if (client.access_type === 'PUBLIC') {
      throw new Error('Backchannel authentication requires a confidential client');
    }
    assertClientActionAllowed(client, 'BACKCHANNEL_AUTHENTICATION');
    const loginHint = normalizeOptionalString(payload.login_hint as string | undefined);
    if (!loginHint) {
      throw new Error('Missing required field: login_hint');
    }
    const resolvedUser = resolveBackchannelLoginHintUser(realmId, loginHint);
    const scopeNames = parseList(typeof payload.scope === 'string' ? payload.scope : null);
    if (!scopeNames.includes('openid')) {
      scopeNames.unshift('openid');
    }
    const requestedExpiry = Number(payload.requested_expiry);
    const maxExpirySeconds = Math.floor(BACKCHANNEL_AUTHENTICATION_TTL_MS / 1000);
    const expiresInSeconds = Number.isFinite(requestedExpiry)
      ? Math.min(Math.max(Math.floor(requestedExpiry), 60), maxExpirySeconds)
      : maxExpirySeconds;
    const now = nowIso();
    const allowAutoApproval = process.env.NODE_ENV !== 'production' && payload.auto_approve === true;
    const record: StoredIamBackchannelAuthentication = {
      id: `iam-backchannel-auth-${randomUUID()}`,
      realm_id: realmId,
      client_id: client.client_id,
      auth_req_id: randomToken('authreq'),
      scope: scopeNames.join(' '),
      scope_names: scopeNames,
      requested_purpose: normalizeOptionalString(payload.requested_purpose as string | undefined),
      login_hint: loginHint,
      binding_message: normalizeOptionalString(payload.binding_message as string | undefined),
      expires_at: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
      status: allowAutoApproval ? 'APPROVED' : 'PENDING',
      target_user_id: resolvedUser.id,
      user_id: allowAutoApproval ? resolvedUser.id : null,
      approved_at: allowAutoApproval ? now : null,
      denied_at: null,
      consumed_at: null,
      created_at: now,
      session_id: null,
      last_polled_at: null,
      poll_count: 0,
    };
    state.backchannel_authentication_requests.unshift(record);
    persistStateSyncOnly();
    return {
      auth_req_id: record.auth_req_id,
      expires_in: expiresInSeconds,
      interval: BACKCHANNEL_AUTHENTICATION_INTERVAL_SECONDS,
      request: clone(record),
    };
  },

  async createBackchannelAuthenticationRequestAsync(
    realmId: string,
    payload: Record<string, unknown>,
    authorizationHeader: string | null,
  ): Promise<IamBackchannelAuthenticationResponse> {
    return runWithDeferredPersistence(() => this.createBackchannelAuthenticationRequest(realmId, payload, authorizationHeader));
  },

  verifyBackchannelAuthentication(
    realmId: string,
    sessionId: string,
    input: {
      auth_req_id: string;
      approve: boolean;
    },
  ): IamBackchannelAuthenticationRecord {
    ensureRealmSeeds();
    expireState();
    const session = LocalIamAuthenticationRuntimeStore.resolveAccountSession(realmId, sessionId);
    const authRequest = state.backchannel_authentication_requests.find(
      (candidate) =>
        candidate.realm_id === realmId
        && candidate.auth_req_id === input.auth_req_id.trim()
        && candidate.status === 'PENDING',
    );
    if (!authRequest) {
      throw new Error('Unknown pending backchannel authentication request');
    }
    const targetUserId = authRequest.target_user_id
      ?? resolveBackchannelLoginHintUser(realmId, authRequest.login_hint).id;
    if (session.user.id !== targetUserId) {
      throw new Error('Backchannel authentication approval must be completed by the requested user');
    }
    authRequest.target_user_id = targetUserId;
    authRequest.user_id = session.user.id;
    authRequest.session_id = session.session.session_id;
    if (input.approve) {
      authRequest.status = 'APPROVED';
      authRequest.approved_at = nowIso();
    } else {
      authRequest.status = 'DENIED';
      authRequest.denied_at = nowIso();
    }
    persistStateSyncOnly();
    return clone(authRequest);
  },

  async verifyBackchannelAuthenticationAsync(
    realmId: string,
    sessionId: string,
    input: {
      auth_req_id: string;
      approve: boolean;
    },
  ): Promise<IamBackchannelAuthenticationRecord> {
    return runWithDeferredPersistence(() => this.verifyBackchannelAuthentication(realmId, sessionId, input));
  },

  verifyDeviceAuthorization(
    realmId: string,
    sessionId: string,
    input: {
      user_code: string;
      approve: boolean;
    },
  ): IamDeviceAuthorizationRecord {
    ensureRealmSeeds();
    expireState();
    const session = LocalIamAuthenticationRuntimeStore.resolveAccountSession(realmId, sessionId);
    const deviceAuthorization = state.device_authorizations.find(
      (candidate) =>
        candidate.realm_id === realmId
        && candidate.user_code === input.user_code.trim().toUpperCase()
        && candidate.status === 'PENDING',
    );
    if (!deviceAuthorization) {
      throw new Error('Unknown pending device authorization');
    }
    deviceAuthorization.user_id = session.user.id;
    deviceAuthorization.session_id = session.session.session_id;
    if (input.approve) {
      deviceAuthorization.status = 'APPROVED';
      deviceAuthorization.approved_at = nowIso();
    } else {
      deviceAuthorization.status = 'DENIED';
      deviceAuthorization.denied_at = nowIso();
    }
    persistStateSyncOnly();
    return clone(deviceAuthorization);
  },

  async verifyDeviceAuthorizationAsync(
    realmId: string,
    sessionId: string,
    input: {
      user_code: string;
      approve: boolean;
    },
  ): Promise<IamDeviceAuthorizationRecord> {
    return runWithDeferredPersistence(() => this.verifyDeviceAuthorization(realmId, sessionId, input));
  },

  exchangeDeviceAuthorizationCodeSyncOnly(
    realmId: string,
    payload: Record<string, unknown>,
    authorizationHeader: string | null,
    baseUrl: string,
  ): IamTokenEndpointResponse {
    ensureRealmSeeds();
    expireState();
    const client = LocalIamProtocolRuntimeStore.resolveAuthenticatedClient(realmId, payload, authorizationHeader);
    assertClientActionAllowed(client, 'DEVICE_AUTHORIZATION');
    const deviceCode = typeof payload.device_code === 'string' ? payload.device_code.trim() : '';
    if (!deviceCode) {
      throw new Error('Missing device_code');
    }
    const record = state.device_authorizations.find(
      (candidate) =>
        candidate.realm_id === realmId
        && candidate.client_id === client.client_id
        && candidate.device_code === deviceCode,
    );
    if (!record) {
      throw new Error('Invalid device_code');
    }
    record.last_polled_at = nowIso();
    record.poll_count += 1;
    if (record.status === 'PENDING') {
      persistStateSyncOnly();
      throw new Error('authorization_pending');
    }
    if (record.status === 'DENIED') {
      throw new Error('access_denied');
    }
    if (record.status === 'CONSUMED') {
      throw new Error('invalid_grant');
    }
    if (record.status === 'EXPIRED') {
      throw new Error('expired_token');
    }
    if (
      record.status === 'APPROVED'
      && record.session_id
      && !LocalIamAuthenticationRuntimeStore.isAccountSessionActiveForRuntime(realmId, record.session_id)
    ) {
      record.status = 'EXPIRED';
      persistStateSyncOnly();
      throw new Error('expired_token');
    }
    if (!record.user_id) {
      throw new Error('Device authorization is missing an approved user');
    }
    const response = LocalIamProtocolRuntimeStore.issueSubjectTokensSyncOnly({
      realm_id: realmId,
      client_id: client.client_id,
      subject_kind: 'USER',
      subject_id: record.user_id,
      browser_session_id: record.session_id,
      requested_scope_names: record.scope_names,
      base_url: baseUrl,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      include_refresh_token: true,
    });
    record.status = 'CONSUMED';
    record.consumed_at = nowIso();
    persistStateSyncOnly();
    return response;
  },

  async exchangeDeviceAuthorizationCodeAsync(
    realmId: string,
    payload: Record<string, unknown>,
    authorizationHeader: string | null,
    baseUrl: string,
  ): Promise<IamTokenEndpointResponse> {
    return runWithDeferredPersistence(async () => {
      ensureRealmSeeds();
      expireState();
      const client = LocalIamProtocolRuntimeStore.resolveAuthenticatedClient(realmId, payload, authorizationHeader);
      assertClientActionAllowed(client, 'DEVICE_AUTHORIZATION');
      const deviceCode = typeof payload.device_code === 'string' ? payload.device_code.trim() : '';
      if (!deviceCode) {
        throw new Error('Missing device_code');
      }
      const record = state.device_authorizations.find(
        (candidate) =>
          candidate.realm_id === realmId
          && candidate.client_id === client.client_id
          && candidate.device_code === deviceCode,
      );
      if (!record) {
        throw new Error('Invalid device_code');
      }
      record.last_polled_at = nowIso();
      record.poll_count += 1;
      if (record.status === 'PENDING') {
        throw new Error('authorization_pending');
      }
      if (record.status === 'DENIED') {
        throw new Error('access_denied');
      }
      if (record.status === 'CONSUMED') {
        throw new Error('invalid_grant');
      }
      if (record.status === 'EXPIRED') {
        throw new Error('expired_token');
      }
      if (
        record.status === 'APPROVED'
        && record.session_id
        && !LocalIamAuthenticationRuntimeStore.isAccountSessionActiveForRuntime(realmId, record.session_id)
      ) {
        record.status = 'EXPIRED';
        throw new Error('expired_token');
      }
      if (!record.user_id) {
        throw new Error('Device authorization is missing an approved user');
      }
      const response = await LocalIamProtocolRuntimeStore.issueSubjectTokensAsync({
        realm_id: realmId,
        client_id: client.client_id,
        subject_kind: 'USER',
        subject_id: record.user_id,
        browser_session_id: record.session_id,
        requested_scope_names: record.scope_names,
        base_url: baseUrl,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        include_refresh_token: true,
      });
      record.status = 'CONSUMED';
      record.consumed_at = nowIso();
      return response;
    });
  },

  exchangeBackchannelAuthenticationTokenSyncOnly(
    realmId: string,
    payload: Record<string, unknown>,
    authorizationHeader: string | null,
    baseUrl: string,
  ): IamTokenEndpointResponse {
    ensureRealmSeeds();
    expireState();
    const client = LocalIamProtocolRuntimeStore.resolveAuthenticatedClient(realmId, payload, authorizationHeader);
    if (client.access_type === 'PUBLIC') {
      throw new Error('Backchannel authentication requires a confidential client');
    }
    assertClientActionAllowed(client, 'BACKCHANNEL_AUTHENTICATION');
    const authReqId = normalizeOptionalString(payload.auth_req_id as string | undefined);
    if (!authReqId) {
      throw new Error('Missing auth_req_id');
    }
    const record = state.backchannel_authentication_requests.find(
      (candidate) =>
        candidate.realm_id === realmId
        && candidate.client_id === client.client_id
        && candidate.auth_req_id === authReqId,
    );
    if (!record) {
      throw new Error('invalid_grant');
    }
    record.last_polled_at = nowIso();
    record.poll_count += 1;
    if (record.status === 'PENDING') {
      persistStateSyncOnly();
      throw new Error('authorization_pending');
    }
    if (record.status === 'DENIED') {
      throw new Error('access_denied');
    }
    if (record.status === 'CONSUMED') {
      throw new Error('invalid_grant');
    }
    if (record.status === 'EXPIRED') {
      throw new Error('expired_token');
    }
    if (
      record.status === 'APPROVED'
      && record.session_id
      && !LocalIamAuthenticationRuntimeStore.isAccountSessionActiveForRuntime(realmId, record.session_id)
    ) {
      record.status = 'EXPIRED';
      persistStateSyncOnly();
      throw new Error('expired_token');
    }
    if (!record.user_id) {
      throw new Error('Backchannel authentication is missing an approved user');
    }
    const response = LocalIamProtocolRuntimeStore.issueSubjectTokensSyncOnly({
      realm_id: realmId,
      client_id: client.client_id,
      subject_kind: 'USER',
      subject_id: record.user_id,
      browser_session_id: record.session_id,
      requested_scope_names: record.scope_names,
      base_url: baseUrl,
      grant_type: 'urn:openid:params:grant-type:ciba',
      include_refresh_token: true,
    });
    record.status = 'CONSUMED';
    record.consumed_at = nowIso();
    persistStateSyncOnly();
    return response;
  },

  async exchangeBackchannelAuthenticationTokenAsync(
    realmId: string,
    payload: Record<string, unknown>,
    authorizationHeader: string | null,
    baseUrl: string,
  ): Promise<IamTokenEndpointResponse> {
    return runWithDeferredPersistence(async () => {
      ensureRealmSeeds();
      expireState();
      const client = LocalIamProtocolRuntimeStore.resolveAuthenticatedClient(realmId, payload, authorizationHeader);
      if (client.access_type === 'PUBLIC') {
        throw new Error('Backchannel authentication requires a confidential client');
      }
      assertClientActionAllowed(client, 'BACKCHANNEL_AUTHENTICATION');
      const authReqId = normalizeOptionalString(payload.auth_req_id as string | undefined);
      if (!authReqId) {
        throw new Error('Missing auth_req_id');
      }
      const record = state.backchannel_authentication_requests.find(
        (candidate) =>
          candidate.realm_id === realmId
          && candidate.client_id === client.client_id
          && candidate.auth_req_id === authReqId,
      );
      if (!record) {
        throw new Error('invalid_grant');
      }
      record.last_polled_at = nowIso();
      record.poll_count += 1;
      if (record.status === 'PENDING') {
        throw new Error('authorization_pending');
      }
      if (record.status === 'DENIED') {
        throw new Error('access_denied');
      }
      if (record.status === 'CONSUMED') {
        throw new Error('invalid_grant');
      }
      if (record.status === 'EXPIRED') {
        throw new Error('expired_token');
      }
      if (
        record.status === 'APPROVED'
        && record.session_id
        && !LocalIamAuthenticationRuntimeStore.isAccountSessionActiveForRuntime(realmId, record.session_id)
      ) {
        record.status = 'EXPIRED';
        throw new Error('expired_token');
      }
      if (!record.user_id) {
        throw new Error('Backchannel authentication is missing an approved user');
      }
      const response = await LocalIamProtocolRuntimeStore.issueSubjectTokensAsync({
        realm_id: realmId,
        client_id: client.client_id,
        subject_kind: 'USER',
        subject_id: record.user_id,
        browser_session_id: record.session_id,
        requested_scope_names: record.scope_names,
        base_url: baseUrl,
        grant_type: 'urn:openid:params:grant-type:ciba',
        include_refresh_token: true,
      });
      record.status = 'CONSUMED';
      record.consumed_at = nowIso();
      return response;
    });
  },

  listDeviceAuthorizations(
    filters?: { realm_id?: string | null; client_id?: string | null },
    pagination?: IamListPagination,
  ): IamDeviceAuthorizationsResponse {
    ensureRealmSeeds();
    expireState();
    let records = state.device_authorizations;
    if (filters?.realm_id) {
      records = records.filter((record) => record.realm_id === filters.realm_id);
    }
    if (filters?.client_id) {
      records = records.filter((record) => record.client_id === filters.client_id);
    }
    const pagedRecords = paginateList(records, pagination);
    return {
      generated_at: nowIso(),
      device_authorizations: clone(pagedRecords.data),
      count: pagedRecords.count,
      offset: pagedRecords.offset,
      limit: pagedRecords.limit,
      has_more: pagedRecords.has_more,
    };
  },

  listBackchannelAuthentications(
    filters?: { realm_id?: string | null; client_id?: string | null },
  ): IamBackchannelAuthenticationsResponse {
    ensureRealmSeeds();
    expireState();
    let records = state.backchannel_authentication_requests;
    if (filters?.realm_id) {
      records = records.filter((record) => record.realm_id === filters.realm_id);
    }
    if (filters?.client_id) {
      records = records.filter((record) => record.client_id === filters.client_id);
    }
    return {
      generated_at: nowIso(),
      backchannel_authentication_requests: clone(records),
      count: records.length,
    };
  },

  exchangeTokenSyncOnly(
    realmId: string,
    payload: Record<string, unknown>,
    authorizationHeader: string | null,
    baseUrl: string,
  ): IamTokenEndpointResponse {
    ensureRealmSeeds();
    expireState();
    const requestingClient = LocalIamProtocolRuntimeStore.resolveAuthenticatedClient(realmId, payload, authorizationHeader);
    assertClientActionAllowed(requestingClient, 'TOKEN_EXCHANGE');
    const subjectToken = typeof payload.subject_token === 'string' ? payload.subject_token.trim() : '';
    if (!subjectToken) {
      throw new Error('Missing subject_token');
    }
    const requestedAudience = normalizeOptionalString(payload.audience as string | undefined) ?? requestingClient.client_id;
    const audienceClient = LocalIamProtocolRuntimeStore.getClientByIdentifier(realmId, requestedAudience);
    const subjectRecord = LocalIamProtocolRuntimeStore.resolveIssuedTokenForValue(realmId, subjectToken);
    if (subjectRecord.token_use !== 'access_token') {
      throw new Error('subject_token must be an access token');
    }
    if (subjectRecord.status !== 'ACTIVE') {
      throw new Error('subject_token is not active');
    }
    const scopeNames = parseList(typeof payload.scope === 'string' ? payload.scope : subjectRecord.scope);
    const response = LocalIamProtocolRuntimeStore.issueSubjectTokensSyncOnly({
      realm_id: realmId,
      client_id: audienceClient.client_id,
      subject_kind: subjectRecord.subject_kind,
      subject_id: subjectRecord.subject_id,
      browser_session_id: subjectRecord.browser_session_id,
      requested_scope_names: scopeNames,
      base_url: baseUrl,
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      include_refresh_token: false,
    });
    const issuedToken = LocalIamProtocolRuntimeStore.resolveIssuedTokenForValue(realmId, response.access_token);
    state.token_exchanges.unshift({
      id: `iam-token-exchange-${randomUUID()}`,
      realm_id: realmId,
      requesting_client_id: requestingClient.client_id,
      audience_client_id: audienceClient.client_id,
      subject_kind: subjectRecord.subject_kind,
      subject_id: subjectRecord.subject_id,
      subject_token_id: subjectRecord.id,
      exchanged_token_id: issuedToken.id,
      requested_scope_names: scopeNames,
      status: 'ISSUED',
      created_at: nowIso(),
    });
    persistStateSyncOnly();
    return response;
  },

  async exchangeTokenAsync(
    realmId: string,
    payload: Record<string, unknown>,
    authorizationHeader: string | null,
    baseUrl: string,
  ): Promise<IamTokenEndpointResponse> {
    return runWithDeferredPersistence(async () => {
      ensureRealmSeeds();
      expireState();
      const requestingClient = LocalIamProtocolRuntimeStore.resolveAuthenticatedClient(realmId, payload, authorizationHeader);
      assertClientActionAllowed(requestingClient, 'TOKEN_EXCHANGE');
      const subjectToken = typeof payload.subject_token === 'string' ? payload.subject_token.trim() : '';
      if (!subjectToken) {
        throw new Error('Missing subject_token');
      }
      const requestedAudience = normalizeOptionalString(payload.audience as string | undefined) ?? requestingClient.client_id;
      const audienceClient = LocalIamProtocolRuntimeStore.getClientByIdentifier(realmId, requestedAudience);
      const subjectRecord = LocalIamProtocolRuntimeStore.resolveIssuedTokenForValue(realmId, subjectToken);
      if (subjectRecord.token_use !== 'access_token') {
        throw new Error('subject_token must be an access token');
      }
      if (subjectRecord.status !== 'ACTIVE') {
        throw new Error('subject_token is not active');
      }
      const scopeNames = parseList(typeof payload.scope === 'string' ? payload.scope : subjectRecord.scope);
      const response = await LocalIamProtocolRuntimeStore.issueSubjectTokensAsync({
        realm_id: realmId,
        client_id: audienceClient.client_id,
        subject_kind: subjectRecord.subject_kind,
        subject_id: subjectRecord.subject_id,
        browser_session_id: subjectRecord.browser_session_id,
        requested_scope_names: scopeNames,
        base_url: baseUrl,
        grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
        include_refresh_token: false,
      });
      const issuedToken = LocalIamProtocolRuntimeStore.resolveIssuedTokenForValue(realmId, response.access_token);
      state.token_exchanges.unshift({
        id: `iam-token-exchange-${randomUUID()}`,
        realm_id: realmId,
        requesting_client_id: requestingClient.client_id,
        audience_client_id: audienceClient.client_id,
        subject_kind: subjectRecord.subject_kind,
        subject_id: subjectRecord.subject_id,
        subject_token_id: subjectRecord.id,
        exchanged_token_id: issuedToken.id,
        requested_scope_names: scopeNames,
        status: 'ISSUED',
        created_at: nowIso(),
      });
      return response;
    });
  },

  listTokenExchanges(
    filters?: { realm_id?: string | null; client_id?: string | null },
    pagination?: IamListPagination,
  ): IamTokenExchangesResponse {
    ensureRealmSeeds();
    let records = state.token_exchanges;
    if (filters?.realm_id) {
      records = records.filter((record) => record.realm_id === filters.realm_id);
    }
    if (filters?.client_id) {
      records = records.filter(
        (record) => record.requesting_client_id === filters.client_id || record.audience_client_id === filters.client_id,
      );
    }
    const pagedRecords = paginateList(records, pagination);
    return {
      generated_at: nowIso(),
      token_exchanges: clone(pagedRecords.data),
      count: pagedRecords.count,
      offset: pagedRecords.offset,
      limit: pagedRecords.limit,
      has_more: pagedRecords.has_more,
    };
  },

  async terminateDerivedTokenExchangesForSubjectTokenAsync(
    realmId: string,
    subjectTokenId: string,
    terminalStatus: Extract<IamTokenExchangeStatus, 'REVOKED' | 'EXPIRED'>,
  ): Promise<{ terminated_token_exchange_count: number; revoked_exchanged_token_count: number }> {
    return runWithDeferredPersistence(async () => {
      ensureRealmSeeds();
      const queue = [subjectTokenId];
      const visitedSubjectTokenIds = new Set<string>();
      let terminatedTokenExchangeCount = 0;
      let revokedExchangedTokenCount = 0;

      while (queue.length > 0) {
        const currentSubjectTokenId = queue.shift();
        if (!currentSubjectTokenId || visitedSubjectTokenIds.has(currentSubjectTokenId)) {
          continue;
        }
        visitedSubjectTokenIds.add(currentSubjectTokenId);

        for (const tokenExchange of state.token_exchanges) {
          if (
            tokenExchange.realm_id !== realmId
            || tokenExchange.subject_token_id !== currentSubjectTokenId
            || tokenExchange.status !== 'ISSUED'
          ) {
            continue;
          }
          if (tokenExchange.exchanged_token_id) {
            const exchangedToken = LocalIamProtocolRuntimeStore.resolveIssuedTokenByIdForRuntime(
              realmId,
              tokenExchange.exchanged_token_id,
            );
            if (exchangedToken?.status === 'ACTIVE') {
              const revoked = await LocalIamProtocolRuntimeStore.revokeIssuedTokenByIdAsync(
                realmId,
                tokenExchange.exchanged_token_id,
              );
              if (revoked.revoked) {
                revokedExchangedTokenCount += 1;
              }
            }
            queue.push(tokenExchange.exchanged_token_id);
          }
          tokenExchange.status = terminalStatus;
          terminatedTokenExchangeCount += 1;
        }
      }

      if (terminatedTokenExchangeCount > 0) {
        persistStateSyncOnly();
      }

      return {
        terminated_token_exchange_count: terminatedTokenExchangeCount,
        revoked_exchanged_token_count: revokedExchangedTokenCount,
      };
    });
  },

  runTransientStateMaintenance(): IamAdvancedOAuthTransientStateMaintenanceResult {
    ensureRealmSeeds();
    return expireState();
  },

  async runTransientStateMaintenanceAsync(): Promise<IamAdvancedOAuthTransientStateMaintenanceResult> {
    return runWithDeferredPersistence(() => this.runTransientStateMaintenance());
  },

  exportState(): Record<string, unknown> {
    ensureRealmSeeds();
    expireState();
    return clone(state) as unknown as Record<string, unknown>;
  },

  importState(input: Record<string, unknown>) {
    state = normalizeState(input as Partial<IamAdvancedOAuthRuntimeState>);
    ensureRealmSeeds();
    expireState();
  },
};
