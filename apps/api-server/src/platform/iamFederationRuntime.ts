import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import {
  createPersistedAsyncIamStateRepository,
  createPersistedIamStateRepository,
  type IamAsyncStateRepository,
  type IamStateRepository,
} from './iamStateRepository';
import {
  LocalIamFoundationStore,
  type IamGroupRecord,
  type IamIdentityPrivacyClassification,
  type IamIdentityPrivacyPolicyRecord,
  type IamRoleRecord,
  type IamUserRecord,
} from './iamFoundation';
import { LocalIamAuthenticationRuntimeStore, type IamLoginResponse } from './iamAuthenticationRuntime';
import { getRuntimeRepositoryMode } from './dynamo/runtimeRepositoryMode';
import { previewFederationClaimRelease as evaluateFederationClaimPreview } from './iamFederationClaimGovernance';
import { LocalIamFederationSessionIndexStore } from './iamFederationSessionIndex';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

const runtimeRepositoryMode = getRuntimeRepositoryMode();
const useRuntimeSessionPath = runtimeRepositoryMode.dualWrite || runtimeRepositoryMode.readV2;

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

export type IamIdentityProviderProtocol = 'OIDC' | 'SAML';
export type IamIdentityProviderStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED';
export type IamIdentityProviderLinkPolicy = 'EMAIL_MATCH' | 'AUTO_CREATE' | 'MANUAL';
export type IamIdentityProviderLoginMode = 'BROKER_ONLY' | 'OPTIONAL';
export type IamIdentityProviderSyncMode = 'LOGIN_ONLY' | 'IMPORT';
export type IamIdentityProviderProfileSourceMode = 'SEEDED_ONLY' | 'TRUSTED_ASSERTION';

export type IamUserFederationProviderKind = 'LDAP' | 'SCIM' | 'AWS_IDENTITY_CENTER' | 'COGNITO_USER_POOL';
export type IamUserFederationProviderStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED';
export type IamUserFederationImportStrategy = 'IMPORT' | 'READ_ONLY';
export type IamUserFederationProviderSourceMode = 'SEEDED_ONLY' | 'TRUSTED_ASSERTION';

export type IamFederationTrustStoreStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED';
export type IamFederationMappingProfileStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED';
export type IamFederationClaimPreviewTarget = 'ACCESS_TOKEN' | 'ID_TOKEN' | 'USERINFO';

export type IamLinkedIdentitySourceType = 'BROKER' | 'FEDERATION';
export type IamFederationSyncJobStatus = 'COMPLETED' | 'FAILED';
export type IamFederationEventKind =
  | 'BROKER_LINK_CREATED'
  | 'BROKER_USER_CREATED'
  | 'BROKER_LOGIN_COMPLETED'
  | 'BROKER_SESSIONS_TERMINATED'
  | 'FEDERATION_USER_IMPORTED'
  | 'FEDERATION_USER_LINKED'
  | 'FEDERATION_SYNC_COMPLETED';

const IAM_FEDERATION_RUNTIME_FILE = 'iam-federation-runtime-state.json';

export interface IamExternalIdentityProfile {
  subject: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  group_names: string[];
  role_names: string[];
}

export interface IamIdentityProviderRecord {
  id: string;
  realm_id: string;
  alias: string;
  name: string;
  summary: string;
  protocol: IamIdentityProviderProtocol;
  status: IamIdentityProviderStatus;
  login_mode: IamIdentityProviderLoginMode;
  link_policy: IamIdentityProviderLinkPolicy;
  sync_mode: IamIdentityProviderSyncMode;
  profile_source_mode: IamIdentityProviderProfileSourceMode;
  trust_store_id: string | null;
  mapping_profile_id: string | null;
  issuer_url: string | null;
  allowed_scopes: string[];
  trusted_email_domains: string[];
  default_role_ids: string[];
  default_group_ids: string[];
  synthetic: boolean;
  external_identities: IamExternalIdentityProfile[];
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamUserFederationProviderRecord {
  id: string;
  realm_id: string;
  name: string;
  summary: string;
  kind: IamUserFederationProviderKind;
  status: IamUserFederationProviderStatus;
  import_strategy: IamUserFederationImportStrategy;
  source_mode: IamUserFederationProviderSourceMode;
  trust_store_id: string | null;
  mapping_profile_id: string | null;
  connection_label: string;
  issuer_url: string | null;
  trusted_email_domains: string[];
  default_role_ids: string[];
  default_group_ids: string[];
  synthetic: boolean;
  external_identities: IamExternalIdentityProfile[];
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamFederationTrustStoreRecord {
  id: string;
  realm_id: string;
  name: string;
  summary: string;
  status: IamFederationTrustStoreStatus;
  supported_protocols: IamIdentityProviderProtocol[];
  issuer_url: string | null;
  metadata_url: string | null;
  certificate_labels: string[];
  synthetic: boolean;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamFederationClaimMappingRecord {
  source_attribute: string;
  target_claim: string;
  include_in_userinfo: boolean;
  required: boolean;
}

export interface IamFederationMappingProfileRecord {
  id: string;
  realm_id: string;
  trust_store_id: string;
  name: string;
  summary: string;
  status: IamFederationMappingProfileStatus;
  protocol: IamIdentityProviderProtocol;
  link_policy: IamIdentityProviderLinkPolicy;
  attribute_release_policy_ids: string[];
  claim_mappings: IamFederationClaimMappingRecord[];
  synthetic: boolean;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamLinkedIdentityRecord {
  id: string;
  realm_id: string;
  user_id: string;
  source_type: IamLinkedIdentitySourceType;
  provider_id: string;
  provider_name: string;
  provider_alias: string | null;
  provider_kind: string;
  external_subject: string;
  external_username: string;
  external_email: string;
  linked_at: string;
  imported_at: string | null;
  last_authenticated_at: string | null;
  synthetic: boolean;
}

export interface IamFederationSyncJobRecord {
  id: string;
  realm_id: string;
  provider_id: string;
  provider_name: string;
  status: IamFederationSyncJobStatus;
  started_at: string;
  completed_at: string;
  imported_count: number;
  linked_count: number;
  updated_count: number;
  error_message: string | null;
  created_by_user_id: string;
}

export interface IamFederationEventRecord {
  id: string;
  realm_id: string;
  kind: IamFederationEventKind;
  provider_id: string;
  provider_name: string;
  user_id: string | null;
  linked_identity_id: string | null;
  occurred_at: string;
  summary: string;
  metadata: Record<string, unknown>;
}

interface IamFederationRuntimeState {
  identity_providers: IamIdentityProviderRecord[];
  user_federation_providers: IamUserFederationProviderRecord[];
  federation_trust_stores: IamFederationTrustStoreRecord[];
  federation_mapping_profiles: IamFederationMappingProfileRecord[];
  linked_identities: IamLinkedIdentityRecord[];
  sync_jobs: IamFederationSyncJobRecord[];
  events: IamFederationEventRecord[];
}

interface IamFederationRuntimeRepository extends IamStateRepository<IamFederationRuntimeState> {}
interface IamAsyncFederationRuntimeRepository extends IamAsyncStateRepository<IamFederationRuntimeState> {}

export interface IamFederationSummary {
  identity_provider_count: number;
  active_identity_provider_count: number;
  user_federation_provider_count: number;
  active_user_federation_provider_count: number;
  federation_trust_store_count: number;
  active_federation_trust_store_count: number;
  federation_mapping_profile_count: number;
  active_federation_mapping_profile_count: number;
  linked_identity_count: number;
  sync_job_count: number;
  federation_event_count: number;
}

export interface IamIdentityProvidersResponse {
  generated_at: string;
  identity_providers: IamIdentityProviderRecord[];
  count: number;
}

export interface IamUserFederationProvidersResponse {
  generated_at: string;
  user_federation_providers: IamUserFederationProviderRecord[];
  count: number;
}

export interface IamFederationTrustStoresResponse {
  generated_at: string;
  federation_trust_stores: IamFederationTrustStoreRecord[];
  count: number;
}

export interface IamFederationMappingProfilesResponse {
  generated_at: string;
  federation_mapping_profiles: IamFederationMappingProfileRecord[];
  count: number;
}

export interface IamLinkedIdentitiesResponse {
  generated_at: string;
  linked_identities: IamLinkedIdentityRecord[];
  count: number;
}

export interface IamFederationSyncJobsResponse {
  generated_at: string;
  sync_jobs: IamFederationSyncJobRecord[];
  count: number;
}

export interface IamFederationEventsResponse {
  generated_at: string;
  events: IamFederationEventRecord[];
  count: number;
}

export interface PreviewIamFederationClaimReleaseRequest {
  realm_id: string;
  provider_alias: string;
  mapping_profile_id: string;
  external_username_or_email: string;
  target?: IamFederationClaimPreviewTarget;
  requested_purpose?: string | null;
  consent_granted?: boolean;
}

export interface IamFederationClaimPreviewReleasedClaim {
  source_attribute: string;
  target_claim: string;
  value: string | string[];
}

export interface IamFederationClaimPreviewSuppressedClaim {
  source_attribute: string;
  target_claim: string;
  reason: 'MISSING_REQUIRED_SOURCE_ATTRIBUTE' | 'USERINFO_EXCLUDED' | 'CONSENT_REQUIRED' | 'PURPOSE_NOT_ALLOWED';
}

export interface IamFederationClaimPreviewResponse {
  generated_at: string;
  realm_id: string;
  provider_id: string;
  provider_alias: string;
  provider_protocol: IamIdentityProviderProtocol;
  mapping_profile_id: string;
  trust_store_id: string;
  external_subject: string;
  requested_purpose: string | null;
  consent_granted: boolean;
  target: IamFederationClaimPreviewTarget;
  resolved_release_policy_ids: string[];
  released_claims: IamFederationClaimPreviewReleasedClaim[];
  suppressed_claims: IamFederationClaimPreviewSuppressedClaim[];
}

interface ResolvedFederationAttributeReleasePolicy {
  id: string;
  classification: IamIdentityPrivacyClassification;
  consent_required: boolean;
  attribute_release_tags: string[];
}

export interface IamPublicBrokerRecord {
  id: string;
  alias: string;
  name: string;
  summary: string;
  protocol: IamIdentityProviderProtocol;
  login_mode: IamIdentityProviderLoginMode;
}

export interface IamRealmBrokersResponse {
  generated_at: string;
  realm_id: string;
  brokers: IamPublicBrokerRecord[];
  count: number;
}

export interface CreateIamIdentityProviderRequest {
  realm_id: string;
  alias: string;
  name: string;
  summary?: string;
  protocol?: IamIdentityProviderProtocol;
  status?: IamIdentityProviderStatus;
  login_mode?: IamIdentityProviderLoginMode;
  link_policy?: IamIdentityProviderLinkPolicy;
  sync_mode?: IamIdentityProviderSyncMode;
  profile_source_mode?: IamIdentityProviderProfileSourceMode;
  trust_store_id?: string | null;
  mapping_profile_id?: string | null;
  issuer_url?: string | null;
  allowed_scopes?: string[];
  trusted_email_domains?: string[];
  default_role_ids?: string[];
  default_group_ids?: string[];
  external_identities?: IamExternalIdentityProfile[];
}

export interface UpdateIamIdentityProviderRequest {
  alias?: string;
  name?: string;
  summary?: string;
  status?: IamIdentityProviderStatus;
  login_mode?: IamIdentityProviderLoginMode;
  link_policy?: IamIdentityProviderLinkPolicy;
  sync_mode?: IamIdentityProviderSyncMode;
  profile_source_mode?: IamIdentityProviderProfileSourceMode;
  trust_store_id?: string | null;
  mapping_profile_id?: string | null;
  issuer_url?: string | null;
  allowed_scopes?: string[];
  trusted_email_domains?: string[];
  default_role_ids?: string[];
  default_group_ids?: string[];
  external_identities?: IamExternalIdentityProfile[];
}

export interface CreateIamUserFederationProviderRequest {
  realm_id: string;
  name: string;
  summary?: string;
  kind?: IamUserFederationProviderKind;
  status?: IamUserFederationProviderStatus;
  import_strategy?: IamUserFederationImportStrategy;
  source_mode?: IamUserFederationProviderSourceMode;
  trust_store_id?: string | null;
  mapping_profile_id?: string | null;
  connection_label?: string;
  issuer_url?: string | null;
  trusted_email_domains?: string[];
  default_role_ids?: string[];
  default_group_ids?: string[];
  external_identities?: IamExternalIdentityProfile[];
}

export interface UpdateIamUserFederationProviderRequest {
  name?: string;
  summary?: string;
  status?: IamUserFederationProviderStatus;
  import_strategy?: IamUserFederationImportStrategy;
  source_mode?: IamUserFederationProviderSourceMode;
  trust_store_id?: string | null;
  mapping_profile_id?: string | null;
  connection_label?: string;
  issuer_url?: string | null;
  trusted_email_domains?: string[];
  default_role_ids?: string[];
  default_group_ids?: string[];
  external_identities?: IamExternalIdentityProfile[];
}

export interface RunIamUserFederationSyncRequest {
  external_identities?: Array<{
    subject: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    group_names?: string[];
    role_names?: string[];
    issuer_url?: string | null;
    raw_attributes?: Record<string, string | string[]>;
    scopes?: string[];
    saml_assertion?: {
      name_id?: string | null;
      attributes?: Record<string, string | string[]>;
    };
  }>;
}

export interface IamBrokerLoginInput {
  external_username_or_email: string;
  client_id?: string | null;
  scope?: string[] | null;
  external_identity?: {
    subject: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    group_names?: string[];
    role_names?: string[];
    issuer_url?: string | null;
    raw_attributes?: Record<string, string | string[]>;
    scopes?: string[];
    saml_assertion?: {
      name_id?: string | null;
      attributes?: Record<string, string | string[]>;
    };
  } | null;
}

const deferredPersistenceContext = new AsyncLocalStorage<{ dirty: boolean }>();

function normalizeExternalProfiles(input: IamExternalIdentityProfile[] | undefined): IamExternalIdentityProfile[] {
  return (input ?? []).map((profile) => ({
    subject: profile.subject.trim(),
    username: profile.username.trim(),
    email: profile.email.trim(),
    first_name: profile.first_name.trim(),
    last_name: profile.last_name.trim(),
    group_names: Array.from(new Set((profile.group_names ?? []).map((value) => value.trim()).filter(Boolean))),
    role_names: Array.from(new Set((profile.role_names ?? []).map((value) => value.trim()).filter(Boolean))),
  }));
}

function normalizeTrustedEmailDomains(input: string[] | undefined): string[] {
  return Array.from(
    new Set(
      (input ?? [])
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
        .map((value) => value.replace(/^@+/, '')),
    ),
  );
}

function normalizeClaimedScopes(input: string[] | undefined): string[] {
  return Array.from(new Set((input ?? []).map((value) => value.trim()).filter(Boolean))).sort();
}

function normalizeAssertedExternalIdentity(
  input: IamBrokerLoginInput['external_identity'],
): IamExternalIdentityProfile | null {
  if (!input) {
    return null;
  }

  const subject = input.subject?.trim();
  const username = input.username?.trim();
  const email = input.email?.trim();
  const firstName = input.first_name?.trim();
  const lastName = input.last_name?.trim();
  if (!subject || !username || !email || !firstName || !lastName) {
    throw new Error('Trusted asserted external identity is missing required fields');
  }

  return {
    subject,
    username,
    email,
    first_name: firstName,
    last_name: lastName,
    group_names: Array.from(new Set((input.group_names ?? []).map((value) => value.trim()).filter(Boolean))),
    role_names: Array.from(new Set((input.role_names ?? []).map((value) => value.trim()).filter(Boolean))),
  };
}

function resolveAssertedSourceAttribute(
  input: {
    subject: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    group_names?: string[];
    role_names?: string[];
    raw_attributes?: Record<string, string | string[]>;
    saml_assertion?: {
      name_id?: string | null;
      attributes?: Record<string, string | string[]>;
    };
  },
  sourceAttribute: string,
): string | string[] | null {
  const normalized = sourceAttribute.trim();
  if (normalized === 'NameID' && input.saml_assertion?.name_id?.trim()) {
    return input.saml_assertion.name_id.trim();
  }
  if (input.saml_assertion?.attributes && Object.prototype.hasOwnProperty.call(input.saml_assertion.attributes, normalized)) {
    return input.saml_assertion.attributes[normalized] ?? null;
  }
  if (input.raw_attributes && Object.prototype.hasOwnProperty.call(input.raw_attributes, normalized)) {
    return input.raw_attributes[normalized] ?? null;
  }
  switch (normalized) {
    case 'sub':
    case 'subject':
    case 'NameID':
      return input.subject;
    case 'preferred_username':
    case 'username':
    case 'uid':
    case 'eduPersonPrincipalName':
      return input.username;
    case 'email':
    case 'mail':
    case 'emailAddress':
      return input.email;
    case 'given_name':
    case 'givenName':
    case 'first_name':
      return input.first_name;
    case 'family_name':
    case 'sn':
    case 'surname':
    case 'last_name':
      return input.last_name;
    case 'groups':
    case 'group_names':
    case 'memberOf':
      return [...(input.group_names ?? [])];
    case 'roles':
    case 'role_names':
    case 'realm_roles':
      return [...(input.role_names ?? [])];
    default:
      return null;
  }
}

function projectTrustedAssertionThroughMappingProfile(
  mappingProfile: IamFederationMappingProfileRecord,
  input: {
    subject: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    group_names?: string[];
    role_names?: string[];
    raw_attributes?: Record<string, string | string[]>;
    saml_assertion?: {
      name_id?: string | null;
      attributes?: Record<string, string | string[]>;
    };
  },
): IamExternalIdentityProfile {
  const mappedValues = new Map<string, string | string[]>();

  for (const mapping of mappingProfile.claim_mappings) {
    const value = resolveAssertedSourceAttribute(input, mapping.source_attribute);
    const missing =
      value === null
      || (typeof value === 'string' && value.trim().length === 0)
      || (Array.isArray(value) && value.length === 0);
    if (missing) {
      if (mapping.required) {
        throw new Error(`Trusted assertion is missing required mapped source attribute: ${mapping.source_attribute}`);
      }
      continue;
    }
    mappedValues.set(mapping.target_claim, value);
  }

  const externalSubject = mappedValues.get('external_subject');
  const email = mappedValues.get('email');
  const firstName = mappedValues.get('first_name') ?? mappedValues.get('given_name');
  const lastName = mappedValues.get('last_name') ?? mappedValues.get('family_name');
  const username = mappedValues.get('preferred_username') ?? mappedValues.get('username');
  const groups = mappedValues.get('groups') ?? mappedValues.get('group_names');
  const roles = mappedValues.get('realm_roles') ?? mappedValues.get('roles') ?? mappedValues.get('role_names');

  if (typeof externalSubject !== 'string' || externalSubject.trim().length === 0) {
    throw new Error('Trusted assertion mapping profile did not produce external_subject');
  }
  if (typeof email !== 'string' || email.trim().length === 0) {
    throw new Error('Trusted assertion mapping profile did not produce email');
  }

  const derivedUsername =
    typeof username === 'string' && username.trim().length > 0
      ? username.trim()
      : email.split('@')[0]?.trim() || input.username.trim();

  return {
    subject: externalSubject.trim(),
    username: derivedUsername,
    email: email.trim(),
    first_name: typeof firstName === 'string' && firstName.trim().length > 0 ? firstName.trim() : input.first_name.trim(),
    last_name: typeof lastName === 'string' && lastName.trim().length > 0 ? lastName.trim() : input.last_name.trim(),
    group_names: Array.isArray(groups) ? groups.map((value) => String(value).trim()).filter(Boolean) : [...(input.group_names ?? [])],
    role_names: Array.isArray(roles) ? roles.map((value) => String(value).trim()).filter(Boolean) : [...(input.role_names ?? [])],
  };
}

function normalizeAssertedExternalIdentityBatch(
  input: RunIamUserFederationSyncRequest['external_identities'] | undefined,
): IamExternalIdentityProfile[] {
  return (input ?? []).map((profile) =>
    normalizeAssertedExternalIdentity({
      subject: profile.subject,
      username: profile.username,
      email: profile.email,
      first_name: profile.first_name,
      last_name: profile.last_name,
      group_names: profile.group_names,
      role_names: profile.role_names,
      issuer_url: profile.issuer_url,
    })!,
  );
}

function assertTrustedBrokeredExternalIdentity(
  provider: IamIdentityProviderRecord,
  assertedIssuerUrl: string | null | undefined,
  assertedInput: NonNullable<IamBrokerLoginInput['external_identity']>,
  requestedScopes: string[],
): IamExternalIdentityProfile {
  if (provider.profile_source_mode !== 'TRUSTED_ASSERTION') {
    throw new Error('Identity provider does not permit trusted runtime assertions');
  }

  const governance = validateTrustedIdentityProviderGovernanceBinding(
    provider.realm_id,
    provider.protocol,
    provider.trust_store_id,
    provider.mapping_profile_id,
  );

  if (provider.protocol === 'SAML' && !assertedInput.saml_assertion) {
    throw new Error('Trusted SAML assertions must include saml_assertion payload');
  }

  const profile = projectTrustedAssertionThroughMappingProfile(governance.mappingProfile, assertedInput);

  if (provider.issuer_url) {
    const normalizedIssuer = assertedIssuerUrl?.trim() ?? '';
    if (!normalizedIssuer) {
      throw new Error('Trusted asserted external identity is missing issuer_url');
    }
    if (normalizedIssuer !== provider.issuer_url) {
      throw new Error('Trusted asserted external identity issuer does not match the configured identity provider');
    }
  }

  const emailDomain = profile.email.split('@')[1]?.trim().toLowerCase() ?? '';
  if (!emailDomain) {
    throw new Error('Trusted asserted external identity email must include a domain');
  }
  if (provider.trusted_email_domains.length > 0 && !provider.trusted_email_domains.includes(emailDomain)) {
    throw new Error(`Trusted asserted external identity email domain is not allowed for provider ${provider.alias}`);
  }

  if (provider.protocol === 'OIDC') {
    const claimedScopes = normalizeClaimedScopes(assertedInput.scopes);
    if (claimedScopes.length === 0) {
      throw new Error('Trusted OIDC assertions must declare granted scopes');
    }
    if (provider.allowed_scopes.length > 0) {
      const unsupportedClaimedScope = claimedScopes.find((scope) => !provider.allowed_scopes.includes(scope));
      if (unsupportedClaimedScope) {
        throw new Error(`Trusted OIDC assertion includes scope outside provider policy: ${unsupportedClaimedScope}`);
      }
    }
    const missingRequestedScope = requestedScopes.find((scope) => !claimedScopes.includes(scope));
    if (missingRequestedScope) {
      throw new Error(`Trusted OIDC assertion is missing requested scope: ${missingRequestedScope}`);
    }
  }

  if (provider.protocol === 'SAML') {
    const nameId = assertedInput.saml_assertion?.name_id?.trim() ?? '';
    if (!nameId) {
      throw new Error('Trusted SAML assertions must include NameID');
    }
  }

  return profile;
}

function assertTrustedFederationExternalIdentity(
  provider: IamUserFederationProviderRecord,
  assertedIssuerUrl: string | null | undefined,
  assertedInput: NonNullable<RunIamUserFederationSyncRequest['external_identities']>[number],
): IamExternalIdentityProfile {
  if (provider.source_mode !== 'TRUSTED_ASSERTION') {
    throw new Error('User federation provider does not permit trusted runtime assertions');
  }

  const governance = validateTrustedUserFederationGovernanceBinding(
    provider.realm_id,
    provider.trust_store_id,
    provider.mapping_profile_id,
  );

  const profile = projectTrustedAssertionThroughMappingProfile(governance.mappingProfile, assertedInput);

  if (provider.issuer_url) {
    const normalizedIssuer = assertedIssuerUrl?.trim() ?? '';
    if (!normalizedIssuer) {
      throw new Error('Trusted asserted federation identity is missing issuer_url');
    }
    if (normalizedIssuer !== provider.issuer_url) {
      throw new Error('Trusted asserted federation identity issuer does not match the configured provider');
    }
  }

  const emailDomain = profile.email.split('@')[1]?.trim().toLowerCase() ?? '';
  if (!emailDomain) {
    throw new Error('Trusted asserted federation identity email must include a domain');
  }
  if (provider.trusted_email_domains.length > 0 && !provider.trusted_email_domains.includes(emailDomain)) {
    throw new Error(`Trusted asserted federation identity email domain is not allowed for provider ${provider.name}`);
  }

  return profile;
}

const LEGACY_FEDERATION_ATTRIBUTE_RELEASE_POLICIES: Record<string, ResolvedFederationAttributeReleasePolicy> = {
  'release-basic-identity': {
    id: 'release-basic-identity',
    classification: 'PUBLIC',
    consent_required: false,
    attribute_release_tags: ['directory', 'display'],
  },
  'release-directory-attributes': {
    id: 'release-directory-attributes',
    classification: 'INTERNAL',
    consent_required: false,
    attribute_release_tags: ['directory', 'organization', 'membership'],
  },
};

const CLASSIFICATION_ALLOWED_PURPOSES: Record<IamIdentityPrivacyClassification, string[]> = {
  PUBLIC: [],
  INTERNAL: [],
  CONFIDENTIAL: ['profile', 'directory', 'operations', 'education_support', 'administration'],
  RESTRICTED: ['operations', 'education_support', 'administration'],
  PROTECTED: ['education_support', 'protected_record_access', 'administration'],
};

function mergeSeededRecords<T extends { id: string; synthetic?: boolean }>(input: T[] | undefined, seeded: T[]): T[] {
  if (!Array.isArray(input)) {
    return seeded;
  }
  const seededById = new Map(seeded.map((record) => [record.id, record]));
  const merged = input.map((record) => {
    const replacement = seededById.get(record.id);
    if (replacement && record.synthetic) {
      return replacement;
    }
    return record;
  });
  const mergedIds = new Set(merged.map((record) => record.id));
  seeded.forEach((record) => {
    if (!mergedIds.has(record.id)) {
      merged.push(record);
    }
  });
  return merged;
}

function normalizeIdentityProviderRecords(
  input: IamIdentityProviderRecord[] | undefined,
  seeded: IamIdentityProviderRecord[],
): IamIdentityProviderRecord[] {
  return mergeSeededRecords(input, seeded).map((provider) => ({
    ...provider,
    profile_source_mode: provider.profile_source_mode ?? 'SEEDED_ONLY',
    trust_store_id: provider.trust_store_id ?? null,
    mapping_profile_id: provider.mapping_profile_id ?? null,
    trusted_email_domains: normalizeTrustedEmailDomains(provider.trusted_email_domains),
  }));
}

function normalizeUserFederationProviderRecords(
  input: IamUserFederationProviderRecord[] | undefined,
  seeded: IamUserFederationProviderRecord[],
): IamUserFederationProviderRecord[] {
  return mergeSeededRecords(input, seeded).map((provider) => ({
    ...provider,
    source_mode: provider.source_mode ?? 'SEEDED_ONLY',
    trust_store_id: provider.trust_store_id ?? null,
    mapping_profile_id: provider.mapping_profile_id ?? null,
    issuer_url: provider.issuer_url ?? null,
    trusted_email_domains: normalizeTrustedEmailDomains(provider.trusted_email_domains),
  }));
}

function normalizeRequestedPurpose(value?: string | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized || null;
}

function normalizeClaimTag(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function resolveExternalProfileAttribute(profile: IamExternalIdentityProfile, sourceAttribute: string): string | string[] | null {
  switch (sourceAttribute.trim()) {
    case 'sub':
    case 'subject':
    case 'NameID':
      return profile.subject;
    case 'preferred_username':
    case 'username':
    case 'uid':
    case 'eduPersonPrincipalName':
      return profile.username;
    case 'email':
    case 'mail':
    case 'emailAddress':
      return profile.email;
    case 'given_name':
    case 'givenName':
    case 'first_name':
      return profile.first_name;
    case 'family_name':
    case 'sn':
    case 'surname':
    case 'last_name':
      return profile.last_name;
    case 'groups':
    case 'group_names':
    case 'memberOf':
      return clone(profile.group_names);
    case 'roles':
    case 'role_names':
      return clone(profile.role_names);
    default:
      return null;
  }
}

function resolveClaimReleaseTags(sourceAttribute: string, targetClaim: string): string[] {
  const keys = [sourceAttribute, targetClaim].map(normalizeClaimTag);
  const tags = new Set<string>();
  keys.forEach((key) => {
    if (['sub', 'subject', 'nameid', 'external_subject', 'preferred_username', 'username', 'uid', 'edupersonprincipalname', 'first_name', 'last_name', 'given_name', 'family_name', 'givenname', 'sn', 'surname'].includes(key)) {
      tags.add('directory');
      tags.add('display');
    }
    if (['email', 'mail', 'emailaddress'].includes(key)) {
      tags.add('directory');
      tags.add('contact');
    }
    if (['groups', 'group_names', 'memberof', 'roles', 'role_names', 'realm_roles'].includes(key)) {
      tags.add('organization');
      tags.add('membership');
    }
    if (['guardian', 'delegate', 'relationship', 'relationship_kind'].includes(key)) {
      tags.add('relationship');
      tags.add('delegate');
    }
    if (['portable_identity', 'student_id', 'learner_id', 'minor'].includes(key)) {
      tags.add('protected-record');
      tags.add('minor');
    }
  });
  return Array.from(tags);
}

function resolveFederationAttributeReleasePolicies(
  realmId: string,
  policyIds: string[],
): ResolvedFederationAttributeReleasePolicy[] {
  const policies = LocalIamFoundationStore.listIdentityPrivacyPolicies({ realm_id: realmId }).identity_privacy_policies;
  const policyById = new Map(policies.map((policy) => [policy.id, policy]));
  return policyIds.flatMap((policyId) => {
    const canonical = policyById.get(policyId);
    if (canonical) {
      return [{
        id: canonical.id,
        classification: canonical.classification,
        consent_required: canonical.consent_required,
        attribute_release_tags: clone(canonical.attribute_release_tags),
      }];
    }
    const legacy = LEGACY_FEDERATION_ATTRIBUTE_RELEASE_POLICIES[policyId];
    return legacy ? [clone(legacy)] : [];
  });
}

function resolvePoliciesForClaim(
  policies: ResolvedFederationAttributeReleasePolicy[],
  sourceAttribute: string,
  targetClaim: string,
): ResolvedFederationAttributeReleasePolicy[] {
  if (policies.length === 0) {
    return [];
  }
  const claimTags = resolveClaimReleaseTags(sourceAttribute, targetClaim);
  const matched = policies.filter((policy) => policy.attribute_release_tags.some((tag) => claimTags.includes(tag)));
  return matched.length > 0 ? matched : policies;
}

function compareClassificationStrictness(left: IamIdentityPrivacyClassification, right: IamIdentityPrivacyClassification): number {
  const weights: Record<IamIdentityPrivacyClassification, number> = {
    PUBLIC: 0,
    INTERNAL: 1,
    CONFIDENTIAL: 2,
    RESTRICTED: 3,
    PROTECTED: 4,
  };
  return weights[left] - weights[right];
}

function resolveClaimSuppressionReason(input: {
  matchedPolicies: ResolvedFederationAttributeReleasePolicy[];
  requestedPurpose: string | null;
  consentGranted: boolean;
}): IamFederationClaimPreviewSuppressedClaim['reason'] | null {
  const { matchedPolicies, requestedPurpose, consentGranted } = input;
  if (matchedPolicies.length === 0) {
    return null;
  }
  if (matchedPolicies.some((policy) => policy.consent_required) && !consentGranted) {
    return 'CONSENT_REQUIRED';
  }
  if (!requestedPurpose) {
    return null;
  }
  const strictestPolicy = matchedPolicies.reduce((current, candidate) => (
    compareClassificationStrictness(candidate.classification, current.classification) > 0 ? candidate : current
  ));
  const allowedPurposes = CLASSIFICATION_ALLOWED_PURPOSES[strictestPolicy.classification];
  if (allowedPurposes.length > 0 && !allowedPurposes.includes(requestedPurpose)) {
    return 'PURPOSE_NOT_ALLOWED';
  }
  return null;
}

function createSeedState(): IamFederationRuntimeState {
  const createdAt = nowIso();
  return {
    identity_providers: [
      {
        id: 'idp-flight-school-oidc',
        realm_id: 'realm-training-validation',
        alias: 'flight-school-oidc',
        name: 'Flight School OIDC',
        summary: 'Synthetic external OIDC identity provider used to validate broker-first learner login and auto-link behavior.',
        protocol: 'OIDC',
        status: 'ACTIVE',
        login_mode: 'OPTIONAL',
        link_policy: 'AUTO_CREATE',
        sync_mode: 'LOGIN_ONLY',
        profile_source_mode: 'SEEDED_ONLY',
        trust_store_id: null,
        mapping_profile_id: null,
        issuer_url: 'https://id.flight-school.local/oidc',
        allowed_scopes: ['openid', 'profile', 'email'],
        trusted_email_domains: [],
        default_role_ids: ['role-training-learner'],
        default_group_ids: ['group-training-learners'],
        synthetic: true,
        external_identities: [
          {
            subject: 'ext-oidc-training-learner',
            username: 'training.learner',
            email: 'training.learner@iam.local',
            first_name: 'Jordan',
            last_name: 'Learner',
            group_names: ['training-learners'],
            role_names: ['learner'],
          },
          {
            subject: 'ext-oidc-casey-specialist',
            username: 'casey.specialist',
            email: 'casey.specialist@iam.local',
            first_name: 'Casey',
            last_name: 'Morgan',
            group_names: ['training-learners'],
            role_names: ['learner'],
          },
        ],
        created_at: createdAt,
        updated_at: createdAt,
        created_by_user_id: 'idp-super-admin',
        updated_by_user_id: 'idp-super-admin',
      },
      {
        id: 'idp-partner-command-saml',
        realm_id: 'realm-partner-embedded-validation',
        alias: 'partner-command-saml',
        name: 'Partner Command SAML',
        summary: 'Synthetic external SAML provider used to validate embedded partner brokering and first-login provisioning.',
        protocol: 'SAML',
        status: 'ACTIVE',
        login_mode: 'BROKER_ONLY',
        link_policy: 'AUTO_CREATE',
        sync_mode: 'LOGIN_ONLY',
        profile_source_mode: 'SEEDED_ONLY',
        trust_store_id: null,
        mapping_profile_id: null,
        issuer_url: 'https://sso.partner-command.local/saml',
        allowed_scopes: [],
        trusted_email_domains: [],
        default_role_ids: ['role-partner-embedded-user'],
        default_group_ids: [],
        synthetic: true,
        external_identities: [
          {
            subject: 'ext-saml-partner-operator',
            username: 'partner.operator',
            email: 'partner.operator@partner-command.local',
            first_name: 'Morgan',
            last_name: 'Operator',
            group_names: [],
            role_names: ['embedded-user'],
          },
        ],
        created_at: createdAt,
        updated_at: createdAt,
        created_by_user_id: 'idp-super-admin',
        updated_by_user_id: 'idp-super-admin',
      },
      {
        id: 'idp-education-district-oidc',
        realm_id: 'realm-education-validation',
        alias: 'north-county-oidc',
        name: 'North County District OIDC',
        summary: 'Synthetic district OIDC provider used to validate education-specific federation packaging and governed claim release preview.',
        protocol: 'OIDC',
        status: 'ACTIVE',
        login_mode: 'OPTIONAL',
        link_policy: 'AUTO_CREATE',
        sync_mode: 'LOGIN_ONLY',
        profile_source_mode: 'SEEDED_ONLY',
        trust_store_id: null,
        mapping_profile_id: null,
        issuer_url: 'https://id.north-county-edu.example/realms/district',
        allowed_scopes: ['openid', 'profile', 'email', 'groups', 'roles'],
        trusted_email_domains: [],
        default_role_ids: ['role-education-guardian'],
        default_group_ids: [],
        synthetic: true,
        external_identities: [
          {
            subject: 'ext-oidc-education-guardian',
            username: 'guardian.portal',
            email: 'guardian.portal@north-county-edu.example',
            first_name: 'Morgan',
            last_name: 'Guardian',
            group_names: ['family-guardians'],
            role_names: ['guardian'],
          },
          {
            subject: 'ext-oidc-education-admin',
            username: 'district.admin',
            email: 'district.admin@north-county-edu.example',
            first_name: 'Evelyn',
            last_name: 'Administrator',
            group_names: ['district-admins'],
            role_names: ['realm-admin'],
          },
        ],
        created_at: createdAt,
        updated_at: createdAt,
        created_by_user_id: 'idp-super-admin',
        updated_by_user_id: 'idp-super-admin',
      },
    ],
    user_federation_providers: [
      {
        id: 'federation-training-ldap',
        realm_id: 'realm-training-validation',
        name: 'Training LDAP Directory',
        summary: 'Synthetic LDAP federation provider used to validate on-demand directory import and user linking.',
        kind: 'LDAP',
        status: 'ACTIVE',
        import_strategy: 'IMPORT',
        source_mode: 'SEEDED_ONLY',
        trust_store_id: null,
        mapping_profile_id: null,
        connection_label: 'ldap://training.directory.local/ou=People,dc=idp,dc=local',
        issuer_url: null,
        trusted_email_domains: [],
        default_role_ids: ['role-training-learner'],
        default_group_ids: ['group-training-learners'],
        synthetic: true,
        external_identities: [
          {
            subject: 'ldap-training-aviator-one',
            username: 'aviator.one',
            email: 'aviator.one@directory.local',
            first_name: 'Aviator',
            last_name: 'One',
            group_names: ['training-learners'],
            role_names: ['learner'],
          },
          {
            subject: 'ldap-training-aviator-two',
            username: 'aviator.two',
            email: 'aviator.two@directory.local',
            first_name: 'Aviator',
            last_name: 'Two',
            group_names: ['training-learners'],
            role_names: ['learner'],
          },
        ],
        created_at: createdAt,
        updated_at: createdAt,
        created_by_user_id: 'idp-super-admin',
        updated_by_user_id: 'idp-super-admin',
      },
      {
        id: 'federation-default-scim',
        realm_id: 'realm-idp-default',
        name: 'Default SCIM Workforce Directory',
        summary: 'Synthetic SCIM federation provider used to validate workforce import and cross-application directory sync.',
        kind: 'SCIM',
        status: 'ACTIVE',
        import_strategy: 'IMPORT',
        source_mode: 'SEEDED_ONLY',
        trust_store_id: null,
        mapping_profile_id: null,
        connection_label: 'https://directory.iam.local/scim/v2',
        issuer_url: null,
        trusted_email_domains: [],
        default_role_ids: ['role-default-member'],
        default_group_ids: [],
        synthetic: true,
        external_identities: [
          {
            subject: 'scim-default-ops-auditor',
            username: 'ops.auditor',
            email: 'ops.auditor@directory.local',
            first_name: 'Ops',
            last_name: 'Auditor',
            group_names: [],
            role_names: ['member'],
          },
        ],
        created_at: createdAt,
        updated_at: createdAt,
        created_by_user_id: 'idp-super-admin',
        updated_by_user_id: 'idp-super-admin',
      },
    ],
    federation_trust_stores: [
      {
        id: 'trust-store-institutional-oidc',
        realm_id: 'realm-idp-default',
        name: 'Institutional OIDC Trust Store',
        summary: 'Synthetic institutional OIDC trust store used to validate federation packaging, metadata handling, and certificate rollout.',
        status: 'ACTIVE',
        supported_protocols: ['OIDC'],
        issuer_url: 'https://idp.institution.local/realms/main',
        metadata_url: 'https://idp.institution.local/.well-known/openid-configuration',
        certificate_labels: ['institution-root-ca', 'institution-signing-cert'],
        synthetic: true,
        created_at: createdAt,
        updated_at: createdAt,
        created_by_user_id: 'idp-super-admin',
        updated_by_user_id: 'idp-super-admin',
      },
      {
        id: 'trust-store-institutional-saml',
        realm_id: 'realm-partner-embedded-validation',
        name: 'Institutional SAML Trust Store',
        summary: 'Synthetic institutional SAML trust store used to validate federation packaging and assertion verification.',
        status: 'ACTIVE',
        supported_protocols: ['SAML'],
        issuer_url: 'https://sso.institution.local/saml',
        metadata_url: 'https://sso.institution.local/federationmetadata.xml',
        certificate_labels: ['institution-saml-signing-cert', 'institution-saml-encryption-cert'],
        synthetic: true,
        created_at: createdAt,
        updated_at: createdAt,
        created_by_user_id: 'idp-super-admin',
        updated_by_user_id: 'idp-super-admin',
      },
      {
        id: 'trust-store-education-district-oidc',
        realm_id: 'realm-education-validation',
        name: 'North County District OIDC Trust Store',
        summary: 'Synthetic education trust store used to validate institutional OIDC metadata, certificate posture, and protected-record claim-release previews.',
        status: 'ACTIVE',
        supported_protocols: ['OIDC'],
        issuer_url: 'https://id.north-county-edu.example/realms/district',
        metadata_url: 'https://id.north-county-edu.example/realms/district/.well-known/openid-configuration',
        certificate_labels: ['north-county-root-ca', 'north-county-signing-cert'],
        synthetic: true,
        created_at: createdAt,
        updated_at: createdAt,
        created_by_user_id: 'idp-super-admin',
        updated_by_user_id: 'idp-super-admin',
      },
    ],
    federation_mapping_profiles: [
      {
        id: 'mapping-profile-institutional-oidc',
        realm_id: 'realm-idp-default',
        trust_store_id: 'trust-store-institutional-oidc',
        name: 'Institutional OIDC Mapping Profile',
        summary: 'Synthetic institutional OIDC mapping profile used to validate claim-to-attribute packaging and default link policy.',
        status: 'ACTIVE',
        protocol: 'OIDC',
        link_policy: 'AUTO_CREATE',
        attribute_release_policy_ids: ['release-basic-identity', 'release-directory-attributes'],
        claim_mappings: [
          {
            source_attribute: 'sub',
            target_claim: 'external_subject',
            include_in_userinfo: true,
            required: true,
          },
          {
            source_attribute: 'email',
            target_claim: 'email',
            include_in_userinfo: true,
            required: true,
          },
          {
            source_attribute: 'given_name',
            target_claim: 'first_name',
            include_in_userinfo: true,
            required: false,
          },
          {
            source_attribute: 'family_name',
            target_claim: 'last_name',
            include_in_userinfo: true,
            required: false,
          },
        ],
        synthetic: true,
        created_at: createdAt,
        updated_at: createdAt,
        created_by_user_id: 'idp-super-admin',
        updated_by_user_id: 'idp-super-admin',
      },
      {
        id: 'mapping-profile-institutional-saml',
        realm_id: 'realm-partner-embedded-validation',
        trust_store_id: 'trust-store-institutional-saml',
        name: 'Institutional SAML Mapping Profile',
        summary: 'Synthetic institutional SAML mapping profile used to validate assertion-to-claim packaging and manual linking.',
        status: 'ACTIVE',
        protocol: 'SAML',
        link_policy: 'EMAIL_MATCH',
        attribute_release_policy_ids: ['release-basic-identity'],
        claim_mappings: [
          {
            source_attribute: 'NameID',
            target_claim: 'external_subject',
            include_in_userinfo: true,
            required: true,
          },
          {
            source_attribute: 'mail',
            target_claim: 'email',
            include_in_userinfo: true,
            required: true,
          },
          {
            source_attribute: 'givenName',
            target_claim: 'first_name',
            include_in_userinfo: true,
            required: false,
          },
          {
            source_attribute: 'sn',
            target_claim: 'last_name',
            include_in_userinfo: true,
            required: false,
          },
        ],
        synthetic: true,
        created_at: createdAt,
        updated_at: createdAt,
        created_by_user_id: 'idp-super-admin',
        updated_by_user_id: 'idp-super-admin',
      },
      {
        id: 'mapping-profile-education-district-oidc',
        realm_id: 'realm-education-validation',
        trust_store_id: 'trust-store-education-district-oidc',
        name: 'North County District OIDC Mapping Profile',
        summary: 'Synthetic education mapping profile used to preview privacy-aware release of institutional directory, contact, and role claims.',
        status: 'ACTIVE',
        protocol: 'OIDC',
        link_policy: 'AUTO_CREATE',
        attribute_release_policy_ids: ['privacy-policy-public', 'privacy-policy-internal', 'privacy-policy-confidential'],
        claim_mappings: [
          {
            source_attribute: 'sub',
            target_claim: 'external_subject',
            include_in_userinfo: true,
            required: true,
          },
          {
            source_attribute: 'preferred_username',
            target_claim: 'preferred_username',
            include_in_userinfo: true,
            required: true,
          },
          {
            source_attribute: 'email',
            target_claim: 'email',
            include_in_userinfo: true,
            required: true,
          },
          {
            source_attribute: 'given_name',
            target_claim: 'given_name',
            include_in_userinfo: true,
            required: false,
          },
          {
            source_attribute: 'family_name',
            target_claim: 'family_name',
            include_in_userinfo: true,
            required: false,
          },
          {
            source_attribute: 'groups',
            target_claim: 'groups',
            include_in_userinfo: false,
            required: false,
          },
          {
            source_attribute: 'roles',
            target_claim: 'realm_roles',
            include_in_userinfo: false,
            required: false,
          },
        ],
        synthetic: true,
        created_at: createdAt,
        updated_at: createdAt,
        created_by_user_id: 'idp-super-admin',
        updated_by_user_id: 'idp-super-admin',
      },
    ],
    linked_identities: [],
    sync_jobs: [],
    events: [],
  };
}

function normalizeState(input: Partial<IamFederationRuntimeState>): IamFederationRuntimeState {
  const seed = createSeedState();
  return {
    identity_providers: normalizeIdentityProviderRecords(input.identity_providers, seed.identity_providers),
    user_federation_providers: normalizeUserFederationProviderRecords(input.user_federation_providers, seed.user_federation_providers),
    federation_trust_stores: mergeSeededRecords(input.federation_trust_stores, seed.federation_trust_stores),
    federation_mapping_profiles: mergeSeededRecords(input.federation_mapping_profiles, seed.federation_mapping_profiles),
    linked_identities: Array.isArray(input.linked_identities) ? input.linked_identities : seed.linked_identities,
    sync_jobs: Array.isArray(input.sync_jobs) ? input.sync_jobs : seed.sync_jobs,
    events: Array.isArray(input.events) ? input.events : seed.events,
  };
}

const federationRuntimeRepository: IamFederationRuntimeRepository = createPersistedIamStateRepository<
  Partial<IamFederationRuntimeState>,
  IamFederationRuntimeState
>({
  fileName: IAM_FEDERATION_RUNTIME_FILE,
  seedFactory: createSeedState,
  normalize: normalizeState,
});

const federationRuntimeAsyncRepository: IamAsyncFederationRuntimeRepository = createPersistedAsyncIamStateRepository<
  Partial<IamFederationRuntimeState>,
  IamFederationRuntimeState
>({
  fileName: IAM_FEDERATION_RUNTIME_FILE,
  seedFactory: createSeedState,
  normalize: normalizeState,
});

const state = federationRuntimeRepository.load();
persistStateSyncOnly();

async function loadStateAsync(): Promise<IamFederationRuntimeState> {
  return await federationRuntimeAsyncRepository.load();
}

function syncInMemoryState(nextState: IamFederationRuntimeState): void {
  state.identity_providers = clone(nextState.identity_providers);
  state.user_federation_providers = clone(nextState.user_federation_providers);
  state.federation_trust_stores = clone(nextState.federation_trust_stores);
  state.federation_mapping_profiles = clone(nextState.federation_mapping_profiles);
  state.linked_identities = clone(nextState.linked_identities);
  state.sync_jobs = clone(nextState.sync_jobs);
  state.events = clone(nextState.events);
}

function persistStateSyncOnly(): void {
  const deferredPersistence = deferredPersistenceContext.getStore();
  if (deferredPersistence) {
    deferredPersistence.dirty = true;
    return;
  }
  federationRuntimeRepository.save(state);
}

async function persistStateAsync(): Promise<void> {
  await federationRuntimeAsyncRepository.save(state);
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

function assertRealmExists(realmId: string): void {
  LocalIamFoundationStore.getRealm(realmId);
}

function assertIdentityProviderExists(providerId: string): IamIdentityProviderRecord {
  const provider = state.identity_providers.find((candidate) => candidate.id === providerId);
  if (!provider) {
    throw new Error(`Unknown identity provider: ${providerId}`);
  }
  return provider;
}

function assertUserFederationProviderExists(providerId: string): IamUserFederationProviderRecord {
  const provider = state.user_federation_providers.find((candidate) => candidate.id === providerId);
  if (!provider) {
    throw new Error(`Unknown user federation provider: ${providerId}`);
  }
  return provider;
}

function assertFederationTrustStoreExists(trustStoreId: string): IamFederationTrustStoreRecord {
  const trustStore = state.federation_trust_stores.find((candidate) => candidate.id === trustStoreId);
  if (!trustStore) {
    throw new Error(`Unknown federation trust store: ${trustStoreId}`);
  }
  return trustStore;
}

function assertFederationMappingProfileExists(mappingProfileId: string): IamFederationMappingProfileRecord {
  const mappingProfile = state.federation_mapping_profiles.find((candidate) => candidate.id === mappingProfileId);
  if (!mappingProfile) {
    throw new Error(`Unknown federation mapping profile: ${mappingProfileId}`);
  }
  return mappingProfile;
}

function validateTrustedIdentityProviderGovernanceBinding(
  realmId: string,
  protocol: IamIdentityProviderProtocol,
  trustStoreId: string | null,
  mappingProfileId: string | null,
): { trustStore: IamFederationTrustStoreRecord; mappingProfile: IamFederationMappingProfileRecord } {
  if (!trustStoreId || !mappingProfileId) {
    throw new Error('Trusted assertion identity providers require both trust_store_id and mapping_profile_id');
  }

  const trustStore = assertFederationTrustStoreExists(trustStoreId);
  const mappingProfile = assertFederationMappingProfileExists(mappingProfileId);
  if (trustStore.realm_id !== realmId || mappingProfile.realm_id !== realmId) {
    throw new Error('Federation governance bindings must belong to the same realm as the identity provider');
  }
  if (trustStore.status !== 'ACTIVE' || mappingProfile.status !== 'ACTIVE') {
    throw new Error('Trusted assertion identity providers require active federation governance bindings');
  }
  if (!trustStore.supported_protocols.includes(protocol)) {
    throw new Error(`Federation trust store ${trustStore.id} does not support protocol ${protocol}`);
  }
  if (mappingProfile.protocol !== protocol) {
    throw new Error(`Federation mapping profile ${mappingProfile.id} does not support protocol ${protocol}`);
  }
  if (mappingProfile.trust_store_id !== trustStore.id) {
    throw new Error('Federation mapping profile is not bound to the configured trust store');
  }
  return { trustStore, mappingProfile };
}

function validateTrustedUserFederationGovernanceBinding(
  realmId: string,
  trustStoreId: string | null,
  mappingProfileId: string | null,
): { trustStore: IamFederationTrustStoreRecord; mappingProfile: IamFederationMappingProfileRecord } {
  if (!trustStoreId || !mappingProfileId) {
    throw new Error('Trusted assertion user federation providers require both trust_store_id and mapping_profile_id');
  }

  const trustStore = assertFederationTrustStoreExists(trustStoreId);
  const mappingProfile = assertFederationMappingProfileExists(mappingProfileId);
  if (trustStore.realm_id !== realmId || mappingProfile.realm_id !== realmId) {
    throw new Error('Federation governance bindings must belong to the same realm as the user federation provider');
  }
  if (trustStore.status !== 'ACTIVE' || mappingProfile.status !== 'ACTIVE') {
    throw new Error('Trusted assertion user federation providers require active federation governance bindings');
  }
  if (mappingProfile.trust_store_id !== trustStore.id) {
    throw new Error('Federation mapping profile is not bound to the configured trust store');
  }
  return { trustStore, mappingProfile };
}

function findIdentityProviderByAlias(realmId: string, providerAlias: string): IamIdentityProviderRecord | null {
  const normalized = providerAlias.trim().toLowerCase();
  return state.identity_providers.find(
    (candidate) => candidate.realm_id === realmId && candidate.alias.trim().toLowerCase() === normalized,
  ) ?? null;
}

function findExternalProfileForProvider(
  provider: IamIdentityProviderRecord,
  externalUsernameOrEmail: string,
): IamExternalIdentityProfile | null {
  const normalized = externalUsernameOrEmail.trim().toLowerCase();
  return provider.external_identities.find(
    (profile) => profile.username.trim().toLowerCase() === normalized || profile.email.trim().toLowerCase() === normalized,
  ) ?? null;
}

function listRealmUsers(realmId: string): IamUserRecord[] {
  return LocalIamFoundationStore.listUsers({ realm_id: realmId }).users;
}

function listRealmGroups(realmId: string): IamGroupRecord[] {
  return LocalIamFoundationStore.listGroups({ realm_id: realmId }).groups;
}

function listRealmRoles(realmId: string): IamRoleRecord[] {
  return LocalIamFoundationStore.listRoles({ realm_id: realmId }).roles;
}

function findUserByEmail(realmId: string, email: string): IamUserRecord | null {
  const normalized = email.trim().toLowerCase();
  return listRealmUsers(realmId).find((user) => user.email.trim().toLowerCase() === normalized) ?? null;
}

function findUserById(realmId: string, userId: string): IamUserRecord {
  const user = listRealmUsers(realmId).find((candidate) => candidate.id === userId);
  if (!user) {
    throw new Error(`Unknown IAM user in realm ${realmId}: ${userId}`);
  }
  return user;
}

function validateRoleIdsForRealm(realmId: string, roleIds: string[]): string[] {
  const realmRoleIds = new Set(listRealmRoles(realmId).map((role) => role.id));
  roleIds.forEach((roleId) => {
    if (!realmRoleIds.has(roleId)) {
      throw new Error(`Role ${roleId} does not belong to realm ${realmId}`);
    }
  });
  return Array.from(new Set(roleIds));
}

function validateGroupIdsForRealm(realmId: string, groupIds: string[]): string[] {
  const realmGroupIds = new Set(listRealmGroups(realmId).map((group) => group.id));
  groupIds.forEach((groupId) => {
    if (!realmGroupIds.has(groupId)) {
      throw new Error(`Group ${groupId} does not belong to realm ${realmId}`);
    }
  });
  return Array.from(new Set(groupIds));
}

function ensureProviderAliasUnique(realmId: string, alias: string, excludedProviderId?: string): void {
  const normalized = alias.trim().toLowerCase();
  const conflict = state.identity_providers.find(
    (provider) => provider.realm_id === realmId && provider.id !== excludedProviderId && provider.alias.trim().toLowerCase() === normalized,
  );
  if (conflict) {
    throw new Error(`Identity provider alias "${alias}" already exists in realm ${realmId}`);
  }
}

function uniqueUsernameForRealm(realmId: string, baseUsername: string): string {
  const existing = new Set(listRealmUsers(realmId).map((user) => user.username.trim().toLowerCase()));
  const normalizedBase = slugify(baseUsername).replace(/-/g, '.') || `federated.${randomUUID().slice(0, 8)}`;
  if (!existing.has(normalizedBase.toLowerCase())) {
    return normalizedBase;
  }
  let suffix = 2;
  while (existing.has(`${normalizedBase}.${suffix}`.toLowerCase())) {
    suffix += 1;
  }
  return `${normalizedBase}.${suffix}`;
}

function createEvent(event: Omit<IamFederationEventRecord, 'id' | 'occurred_at'>): IamFederationEventRecord {
  const record: IamFederationEventRecord = {
    id: `iam-federation-event-${randomUUID()}`,
    occurred_at: nowIso(),
    ...event,
  };
  state.events.push(record);
  persistStateSyncOnly();
  return record;
}

function findLinkedIdentity(sourceType: IamLinkedIdentitySourceType, providerId: string, externalSubject: string): IamLinkedIdentityRecord | null {
  return state.linked_identities.find(
    (candidate) =>
      candidate.source_type === sourceType
      && candidate.provider_id === providerId
      && candidate.external_subject === externalSubject,
  ) ?? null;
}

function linkUserIdentity(
  sourceType: IamLinkedIdentitySourceType,
  providerId: string,
  providerName: string,
  providerAlias: string | null,
  providerKind: string,
  realmId: string,
  userId: string,
  externalProfile: IamExternalIdentityProfile,
  importedAt?: string | null,
): IamLinkedIdentityRecord {
  const existing = findLinkedIdentity(sourceType, providerId, externalProfile.subject);
  if (existing) {
    existing.user_id = userId;
    existing.external_username = externalProfile.username;
    existing.external_email = externalProfile.email;
    existing.imported_at = importedAt ?? existing.imported_at;
    persistStateSyncOnly();
    return existing;
  }

  const record: IamLinkedIdentityRecord = {
    id: `iam-linked-identity-${randomUUID()}`,
    realm_id: realmId,
    user_id: userId,
    source_type: sourceType,
    provider_id: providerId,
    provider_name: providerName,
    provider_alias: providerAlias,
    provider_kind: providerKind,
    external_subject: externalProfile.subject,
    external_username: externalProfile.username,
    external_email: externalProfile.email,
    linked_at: nowIso(),
    imported_at: importedAt ?? null,
    last_authenticated_at: null,
    synthetic: true,
  };
  state.linked_identities.push(record);
  persistStateSyncOnly();
  return record;
}

function updateUserFromExternalProfile(actorUserId: string, user: IamUserRecord, profile: IamExternalIdentityProfile): IamUserRecord {
  return LocalIamFoundationStore.updateUser(actorUserId, user.id, {
    first_name: profile.first_name,
    last_name: profile.last_name,
    email: profile.email,
  });
}

async function updateUserFromExternalProfileAsync(
  actorUserId: string,
  user: IamUserRecord,
  profile: IamExternalIdentityProfile,
): Promise<IamUserRecord> {
  return LocalIamFoundationStore.updateUserAsync(actorUserId, user.id, {
    first_name: profile.first_name,
    last_name: profile.last_name,
    email: profile.email,
  });
}

function createLocalUserFromExternalProfile(
  actorUserId: string,
  realmId: string,
  profile: IamExternalIdentityProfile,
  roleIds: string[],
  groupIds: string[],
): IamUserRecord {
  return LocalIamFoundationStore.createUser(actorUserId, {
    realm_id: realmId,
    username: uniqueUsernameForRealm(realmId, profile.username),
    email: profile.email,
    first_name: profile.first_name,
    last_name: profile.last_name,
    status: 'ACTIVE',
    required_actions: [],
    role_ids: roleIds,
    group_ids: groupIds,
  });
}

async function createLocalUserFromExternalProfileAsync(
  actorUserId: string,
  realmId: string,
  profile: IamExternalIdentityProfile,
  roleIds: string[],
  groupIds: string[],
): Promise<IamUserRecord> {
  return LocalIamFoundationStore.createUserAsync(actorUserId, {
    realm_id: realmId,
    username: uniqueUsernameForRealm(realmId, profile.username),
    email: profile.email,
    first_name: profile.first_name,
    last_name: profile.last_name,
    status: 'ACTIVE',
    required_actions: [],
    role_ids: roleIds,
    group_ids: groupIds,
  });
}

function createIdentityProviderRecord(
  actorUserId: string,
  input: CreateIamIdentityProviderRequest,
): IamIdentityProviderRecord {
  assertRealmExists(input.realm_id);
  const alias = input.alias?.trim();
  const name = input.name?.trim();
  if (!alias || !name) {
    throw new Error('Missing required identity-provider fields');
  }
  ensureProviderAliasUnique(input.realm_id, alias);
  const roleIds = validateRoleIdsForRealm(input.realm_id, input.default_role_ids ?? []);
  const groupIds = validateGroupIdsForRealm(input.realm_id, input.default_group_ids ?? []);
  if (input.profile_source_mode === 'TRUSTED_ASSERTION') {
    validateTrustedIdentityProviderGovernanceBinding(
      input.realm_id,
      input.protocol ?? 'OIDC',
      input.trust_store_id ?? null,
      input.mapping_profile_id ?? null,
    );
  }
  const record: IamIdentityProviderRecord = {
    id: nextUniqueId(name, new Set(state.identity_providers.map((provider) => provider.id)), 'iam-idp'),
    realm_id: input.realm_id,
    alias,
    name,
    summary: input.summary?.trim() || '',
    protocol: input.protocol ?? 'OIDC',
    status: input.status ?? 'ACTIVE',
    login_mode: input.login_mode ?? 'OPTIONAL',
    link_policy: input.link_policy ?? 'AUTO_CREATE',
    sync_mode: input.sync_mode ?? 'LOGIN_ONLY',
    profile_source_mode: input.profile_source_mode ?? 'SEEDED_ONLY',
    trust_store_id: input.trust_store_id?.trim() || null,
    mapping_profile_id: input.mapping_profile_id?.trim() || null,
    issuer_url: input.issuer_url?.trim() || null,
    allowed_scopes: Array.from(new Set((input.allowed_scopes ?? []).map((scope) => scope.trim()).filter(Boolean))),
    trusted_email_domains: normalizeTrustedEmailDomains(input.trusted_email_domains),
    default_role_ids: roleIds,
    default_group_ids: groupIds,
    synthetic: false,
    external_identities: normalizeExternalProfiles(input.external_identities),
    created_at: nowIso(),
    updated_at: nowIso(),
    created_by_user_id: actorUserId,
    updated_by_user_id: actorUserId,
  };
  state.identity_providers.push(record);
  persistStateSyncOnly();
  return clone(record);
}

function updateIdentityProviderRecord(
  actorUserId: string,
  providerId: string,
  input: UpdateIamIdentityProviderRequest,
): IamIdentityProviderRecord {
  const provider = assertIdentityProviderExists(providerId);
  if (input.alias !== undefined) {
    const alias = input.alias.trim();
    if (!alias) {
      throw new Error('Identity provider alias cannot be empty');
    }
    ensureProviderAliasUnique(provider.realm_id, alias, provider.id);
    provider.alias = alias;
  }
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      throw new Error('Identity provider name cannot be empty');
    }
    provider.name = name;
  }
  if (input.summary !== undefined) {
    provider.summary = input.summary.trim();
  }
  if (input.status) {
    provider.status = input.status;
  }
  if (input.login_mode) {
    provider.login_mode = input.login_mode;
  }
  if (input.link_policy) {
    provider.link_policy = input.link_policy;
  }
  if (input.sync_mode) {
    provider.sync_mode = input.sync_mode;
  }
  if (input.profile_source_mode) {
    provider.profile_source_mode = input.profile_source_mode;
  }
  if (input.trust_store_id !== undefined) {
    provider.trust_store_id = input.trust_store_id?.trim() || null;
  }
  if (input.mapping_profile_id !== undefined) {
    provider.mapping_profile_id = input.mapping_profile_id?.trim() || null;
  }
  if (input.issuer_url !== undefined) {
    provider.issuer_url = input.issuer_url?.trim() || null;
  }
  if (input.allowed_scopes) {
    provider.allowed_scopes = Array.from(new Set(input.allowed_scopes.map((scope) => scope.trim()).filter(Boolean)));
  }
  if (input.trusted_email_domains) {
    provider.trusted_email_domains = normalizeTrustedEmailDomains(input.trusted_email_domains);
  }
  if (input.default_role_ids) {
    provider.default_role_ids = validateRoleIdsForRealm(provider.realm_id, input.default_role_ids);
  }
  if (input.default_group_ids) {
    provider.default_group_ids = validateGroupIdsForRealm(provider.realm_id, input.default_group_ids);
  }
  if (input.external_identities) {
    provider.external_identities = normalizeExternalProfiles(input.external_identities);
  }
  if (provider.profile_source_mode === 'TRUSTED_ASSERTION') {
    validateTrustedIdentityProviderGovernanceBinding(
      provider.realm_id,
      provider.protocol,
      provider.trust_store_id,
      provider.mapping_profile_id,
    );
  }
  provider.updated_at = nowIso();
  provider.updated_by_user_id = actorUserId;
  persistStateSyncOnly();
  return clone(provider);
}

async function brokerLoginRecordAsync(
  realmId: string,
  providerAlias: string,
  input: IamBrokerLoginInput,
): Promise<IamLoginResponse> {
  assertRealmExists(realmId);
  const provider = state.identity_providers.find(
    (candidate) =>
      candidate.realm_id === realmId
      && candidate.alias === providerAlias
      && candidate.status === 'ACTIVE',
  );
  if (!provider) {
    throw new Error('Unknown identity provider');
  }

  const externalProfile = input.external_identity
    ? assertTrustedBrokeredExternalIdentity(
        provider,
        input.external_identity.issuer_url,
        input.external_identity,
        Array.from(new Set((input.scope ?? []).map((scope) => scope.trim()).filter(Boolean))).sort(),
      )
    : resolveExternalProfile(provider.external_identities, input.external_username_or_email);
  let linkedIdentity = findLinkedIdentity('BROKER', provider.id, externalProfile.subject);
  let user: IamUserRecord | null = linkedIdentity ? findUserById(realmId, linkedIdentity.user_id) : null;

  if (!user) {
    const matchingUser = findUserByEmail(realmId, externalProfile.email);
    if (matchingUser && provider.link_policy !== 'MANUAL') {
      user = matchingUser;
    } else if (provider.link_policy === 'AUTO_CREATE') {
      user = await createLocalUserFromExternalProfileAsync(
        'idp-super-admin',
        realmId,
        externalProfile,
        provider.default_role_ids,
        provider.default_group_ids,
      );
      createEvent({
        realm_id: realmId,
        kind: 'BROKER_USER_CREATED',
        provider_id: provider.id,
        provider_name: provider.name,
        user_id: user.id,
        linked_identity_id: null,
        summary: `Provisioned ${user.username} from broker ${provider.alias}.`,
        metadata: {
          provider_alias: provider.alias,
          external_subject: externalProfile.subject,
          external_username: externalProfile.username,
        },
      });
    } else {
      throw new Error('Broker login requires a linked local account');
    }

    linkedIdentity = linkUserIdentity(
      'BROKER',
      provider.id,
      provider.name,
      provider.alias,
      provider.protocol,
      realmId,
      user.id,
      externalProfile,
    );
    createEvent({
      realm_id: realmId,
      kind: 'BROKER_LINK_CREATED',
      provider_id: provider.id,
      provider_name: provider.name,
      user_id: user.id,
      linked_identity_id: linkedIdentity.id,
      summary: `Linked ${user.username} to broker ${provider.alias}.`,
      metadata: {
        provider_alias: provider.alias,
        external_subject: externalProfile.subject,
        external_email: externalProfile.email,
      },
    });
  }

  const response = await LocalIamAuthenticationRuntimeStore.loginResolvedUserAsync(realmId, user.id, {
    client_id: input.client_id ?? undefined,
    scope: input.scope ?? undefined,
    federated_login_context: linkedIdentity
      ? {
        source_type: linkedIdentity.source_type,
        linked_identity_id: linkedIdentity.id,
        provider_id: linkedIdentity.provider_id,
        provider_name: linkedIdentity.provider_name,
        provider_alias: linkedIdentity.provider_alias,
        provider_kind: linkedIdentity.provider_kind,
        external_subject: linkedIdentity.external_subject,
      }
      : null,
  });

  if (linkedIdentity) {
    linkedIdentity.last_authenticated_at = nowIso();
  }

  createEvent({
    realm_id: realmId,
    kind: 'BROKER_LOGIN_COMPLETED',
    provider_id: provider.id,
    provider_name: provider.name,
    user_id: user.id,
    linked_identity_id: linkedIdentity?.id ?? null,
    summary: `Completed brokered login for ${user.username} through ${provider.alias}.`,
    metadata: {
      next_step: response.next_step,
      client_id: response.client?.client_id ?? null,
      session_id: response.session_id,
    },
  });

  return response;
}

function createUserFederationProviderRecord(
  actorUserId: string,
  input: CreateIamUserFederationProviderRequest,
): IamUserFederationProviderRecord {
  assertRealmExists(input.realm_id);
  const name = input.name?.trim();
  if (!name) {
    throw new Error('Missing required field: name');
  }
  const roleIds = validateRoleIdsForRealm(input.realm_id, input.default_role_ids ?? []);
  const groupIds = validateGroupIdsForRealm(input.realm_id, input.default_group_ids ?? []);
  if (input.source_mode === 'TRUSTED_ASSERTION') {
    validateTrustedUserFederationGovernanceBinding(
      input.realm_id,
      input.trust_store_id ?? null,
      input.mapping_profile_id ?? null,
    );
  }
  const record: IamUserFederationProviderRecord = {
    id: nextUniqueId(name, new Set(state.user_federation_providers.map((provider) => provider.id)), 'iam-federation'),
    realm_id: input.realm_id,
    name,
    summary: input.summary?.trim() || '',
    kind: input.kind ?? 'LDAP',
    status: input.status ?? 'ACTIVE',
    import_strategy: input.import_strategy ?? 'IMPORT',
    source_mode: input.source_mode ?? 'SEEDED_ONLY',
    trust_store_id: input.trust_store_id?.trim() || null,
    mapping_profile_id: input.mapping_profile_id?.trim() || null,
    connection_label: input.connection_label?.trim() || '',
    issuer_url: input.issuer_url?.trim() || null,
    trusted_email_domains: normalizeTrustedEmailDomains(input.trusted_email_domains),
    default_role_ids: roleIds,
    default_group_ids: groupIds,
    synthetic: false,
    external_identities: normalizeExternalProfiles(input.external_identities),
    created_at: nowIso(),
    updated_at: nowIso(),
    created_by_user_id: actorUserId,
    updated_by_user_id: actorUserId,
  };
  state.user_federation_providers.push(record);
  persistStateSyncOnly();
  return clone(record);
}

function updateUserFederationProviderRecord(
  actorUserId: string,
  providerId: string,
  input: UpdateIamUserFederationProviderRequest,
): IamUserFederationProviderRecord {
  const provider = assertUserFederationProviderExists(providerId);
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      throw new Error('Provider name cannot be empty');
    }
    provider.name = name;
  }
  if (input.summary !== undefined) {
    provider.summary = input.summary.trim();
  }
  if (input.status) {
    provider.status = input.status;
  }
  if (input.import_strategy) {
    provider.import_strategy = input.import_strategy;
  }
  if (input.source_mode) {
    provider.source_mode = input.source_mode;
  }
  if (input.trust_store_id !== undefined) {
    provider.trust_store_id = input.trust_store_id?.trim() || null;
  }
  if (input.mapping_profile_id !== undefined) {
    provider.mapping_profile_id = input.mapping_profile_id?.trim() || null;
  }
  if (input.connection_label !== undefined) {
    provider.connection_label = input.connection_label.trim();
  }
  if (input.issuer_url !== undefined) {
    provider.issuer_url = input.issuer_url?.trim() || null;
  }
  if (input.trusted_email_domains) {
    provider.trusted_email_domains = normalizeTrustedEmailDomains(input.trusted_email_domains);
  }
  if (input.default_role_ids) {
    provider.default_role_ids = validateRoleIdsForRealm(provider.realm_id, input.default_role_ids);
  }
  if (input.default_group_ids) {
    provider.default_group_ids = validateGroupIdsForRealm(provider.realm_id, input.default_group_ids);
  }
  if (input.external_identities) {
    provider.external_identities = normalizeExternalProfiles(input.external_identities);
  }
  if (provider.source_mode === 'TRUSTED_ASSERTION') {
    validateTrustedUserFederationGovernanceBinding(
      provider.realm_id,
      provider.trust_store_id,
      provider.mapping_profile_id,
    );
  }
  provider.updated_at = nowIso();
  provider.updated_by_user_id = actorUserId;
  persistStateSyncOnly();
  return clone(provider);
}

async function runUserFederationSyncRecordAsync(
  actorUserId: string,
  providerId: string,
  input?: RunIamUserFederationSyncRequest,
): Promise<IamFederationSyncJobRecord> {
  const provider = assertUserFederationProviderExists(providerId);
  if (provider.status !== 'ACTIVE') {
    throw new Error('User federation provider is not active');
  }

  const job: IamFederationSyncJobRecord = {
    id: `iam-federation-sync-${randomUUID()}`,
    realm_id: provider.realm_id,
    provider_id: provider.id,
    provider_name: provider.name,
    status: 'COMPLETED',
    started_at: nowIso(),
    completed_at: nowIso(),
    imported_count: 0,
    linked_count: 0,
    updated_count: 0,
    error_message: null,
    created_by_user_id: actorUserId,
  };

  try {
    const syncProfiles = (input?.external_identities?.length ?? 0) > 0
      ? input!.external_identities!.map((assertedProfile) =>
          assertTrustedFederationExternalIdentity(
            provider,
            assertedProfile.issuer_url,
            assertedProfile,
          ),
        )
      : provider.external_identities;

    for (const externalProfile of syncProfiles) {
      let linkedIdentity = findLinkedIdentity('FEDERATION', provider.id, externalProfile.subject);
      let user: IamUserRecord | null = linkedIdentity ? findUserById(provider.realm_id, linkedIdentity.user_id) : null;
      if (!user) {
        user = findUserByEmail(provider.realm_id, externalProfile.email);
      }

      if (!user) {
        user = await createLocalUserFromExternalProfileAsync(
          actorUserId,
          provider.realm_id,
          externalProfile,
          provider.default_role_ids,
          provider.default_group_ids,
        );
        job.imported_count += 1;
        createEvent({
          realm_id: provider.realm_id,
          kind: 'FEDERATION_USER_IMPORTED',
          provider_id: provider.id,
          provider_name: provider.name,
          user_id: user.id,
          linked_identity_id: null,
          summary: `Imported ${user.username} from ${provider.name}.`,
          metadata: {
            provider_kind: provider.kind,
            external_subject: externalProfile.subject,
            external_username: externalProfile.username,
          },
        });
      } else if (provider.import_strategy === 'IMPORT') {
        await updateUserFromExternalProfileAsync(actorUserId, user, externalProfile);
        job.updated_count += 1;
      }

      linkedIdentity = linkUserIdentity(
        'FEDERATION',
        provider.id,
        provider.name,
        null,
        provider.kind,
        provider.realm_id,
        user.id,
        externalProfile,
        nowIso(),
      );
      job.linked_count += 1;
      createEvent({
        realm_id: provider.realm_id,
        kind: 'FEDERATION_USER_LINKED',
        provider_id: provider.id,
        provider_name: provider.name,
        user_id: user.id,
        linked_identity_id: linkedIdentity.id,
        summary: `Linked ${user.username} to ${provider.name}.`,
        metadata: {
          provider_kind: provider.kind,
          external_subject: externalProfile.subject,
        },
      });
    }
    job.completed_at = nowIso();
  } catch (error) {
    job.status = 'FAILED';
    job.completed_at = nowIso();
    job.error_message = error instanceof Error ? error.message : 'Federation sync failed';
    state.sync_jobs.push(job);
    persistStateSyncOnly();
    throw error;
  }

  state.sync_jobs.push(job);
  createEvent({
    realm_id: provider.realm_id,
    kind: 'FEDERATION_SYNC_COMPLETED',
    provider_id: provider.id,
    provider_name: provider.name,
    user_id: null,
    linked_identity_id: null,
    summary: `Completed sync for ${provider.name}.`,
    metadata: {
      imported_count: job.imported_count,
      linked_count: job.linked_count,
      updated_count: job.updated_count,
      provider_kind: provider.kind,
    },
  });
  return clone(job);
}

async function terminateBrokeredSessionsForProviderAsync(
  actorUserId: string,
  provider: IamIdentityProviderRecord,
): Promise<void> {
  const activeLinks = useRuntimeSessionPath
    ? []
    : await LocalIamFederationSessionIndexStore.listActiveBrowserFederatedSessionLinksForProviderAsync(
        provider.realm_id,
        provider.id,
      );
  const browserSessionReferences = useRuntimeSessionPath
    ? await LocalIamAuthenticationRuntimeStore.listActiveFederatedBrowserSessionReferencesByProviderAsync(
        provider.realm_id,
        provider.id,
      )
    : Array.from(
        new Set(activeLinks.map((link) => link.browser_session_reference).filter((reference) => reference.trim().length > 0)),
      );
  if (browserSessionReferences.length === 0) {
    return;
  }

  const termination = await LocalIamAuthenticationRuntimeStore.revokeAccountSessionsByReferenceAsync(
    provider.realm_id,
    browserSessionReferences,
  );
  const danglingLinks = useRuntimeSessionPath
    ? { terminated_link_count: 0, terminated_at: null }
    : await LocalIamFederationSessionIndexStore.terminateBrowserFederatedSessionLinksForProviderAsync(
        provider.realm_id,
        provider.id,
      );

  createEvent({
    realm_id: provider.realm_id,
    kind: 'BROKER_SESSIONS_TERMINATED',
    provider_id: provider.id,
    provider_name: provider.name,
    user_id: null,
    linked_identity_id: null,
    summary: `Revoked brokered sessions for disabled provider ${provider.alias}.`,
    metadata: {
      provider_alias: provider.alias,
      provider_status: provider.status,
      terminated_browser_session_count: termination.revoked_session_count,
      revoked_token_count: termination.revoked_token_count,
      terminated_link_count: danglingLinks.terminated_link_count,
      initiated_by_user_id: actorUserId,
    },
  });
}

function resolveExternalProfile(profiles: IamExternalIdentityProfile[], identifier: string): IamExternalIdentityProfile {
  const normalized = identifier.trim().toLowerCase();
  const profile = profiles.find(
    (candidate) =>
      candidate.username.trim().toLowerCase() === normalized
      || candidate.email.trim().toLowerCase() === normalized,
  );
  if (!profile) {
    throw new Error('Unknown external identity');
  }
  return profile;
}

export const LocalIamFederationRuntimeStore = {
  getSummary(): IamFederationSummary {
    return {
      identity_provider_count: state.identity_providers.length,
      active_identity_provider_count: state.identity_providers.filter((provider) => provider.status === 'ACTIVE').length,
      user_federation_provider_count: state.user_federation_providers.length,
      active_user_federation_provider_count: state.user_federation_providers.filter((provider) => provider.status === 'ACTIVE').length,
      federation_trust_store_count: state.federation_trust_stores.length,
      active_federation_trust_store_count: state.federation_trust_stores.filter((trustStore) => trustStore.status === 'ACTIVE').length,
      federation_mapping_profile_count: state.federation_mapping_profiles.length,
      active_federation_mapping_profile_count: state.federation_mapping_profiles.filter((profile) => profile.status === 'ACTIVE').length,
      linked_identity_count: state.linked_identities.length,
      sync_job_count: state.sync_jobs.length,
      federation_event_count: state.events.length,
    };
  },

  listIdentityProviders(filters?: {
    realm_id?: string | null;
    protocol?: IamIdentityProviderProtocol | null;
  }): IamIdentityProvidersResponse {
    let providers = [...state.identity_providers];
    if (filters?.realm_id) {
      providers = providers.filter((provider) => provider.realm_id === filters.realm_id);
    }
    if (filters?.protocol) {
      providers = providers.filter((provider) => provider.protocol === filters.protocol);
    }
    return {
      generated_at: nowIso(),
      identity_providers: clone(providers),
      count: providers.length,
    };
  },

  async createIdentityProviderAsync(
    actorUserId: string,
    input: CreateIamIdentityProviderRequest,
  ): Promise<IamIdentityProviderRecord> {
    return runWithDeferredPersistence(() => createIdentityProviderRecord(actorUserId, input));
  },

  async updateIdentityProviderAsync(
    actorUserId: string,
    providerId: string,
    input: UpdateIamIdentityProviderRequest,
  ): Promise<IamIdentityProviderRecord> {
    const previous = clone(assertIdentityProviderExists(providerId));
    const updated = await runWithDeferredPersistence(() => updateIdentityProviderRecord(actorUserId, providerId, input));
    if (previous.status === 'ACTIVE' && updated.status !== 'ACTIVE') {
      await terminateBrokeredSessionsForProviderAsync(actorUserId, updated);
    }
    return updated;
  },

  listRealmBrokers(realmId: string): IamRealmBrokersResponse {
    assertRealmExists(realmId);
    const brokers = state.identity_providers
      .filter((provider) => provider.realm_id === realmId && provider.status === 'ACTIVE')
      .map((provider) => ({
        id: provider.id,
        alias: provider.alias,
        name: provider.name,
        summary: provider.summary,
        protocol: provider.protocol,
        login_mode: provider.login_mode,
      }));
    return {
      generated_at: nowIso(),
      realm_id: realmId,
      brokers,
      count: brokers.length,
    };
  },

  async brokerLoginAsync(
    realmId: string,
    providerAlias: string,
    input: IamBrokerLoginInput,
  ): Promise<IamLoginResponse> {
    return runWithDeferredPersistence(() => brokerLoginRecordAsync(realmId, providerAlias, input));
  },

  listUserFederationProviders(filters?: {
    realm_id?: string | null;
    kind?: IamUserFederationProviderKind | null;
  }): IamUserFederationProvidersResponse {
    let providers = [...state.user_federation_providers];
    if (filters?.realm_id) {
      providers = providers.filter((provider) => provider.realm_id === filters.realm_id);
    }
    if (filters?.kind) {
      providers = providers.filter((provider) => provider.kind === filters.kind);
    }
    return {
      generated_at: nowIso(),
      user_federation_providers: clone(providers),
      count: providers.length,
    };
  },

  listFederationTrustStores(filters?: {
    realm_id?: string | null;
    protocol?: IamIdentityProviderProtocol | null;
    status?: IamFederationTrustStoreStatus | null;
  }): IamFederationTrustStoresResponse {
    let trustStores = [...state.federation_trust_stores];
    if (filters?.realm_id) {
      trustStores = trustStores.filter((trustStore) => trustStore.realm_id === filters.realm_id);
    }
    if (filters?.protocol) {
      trustStores = trustStores.filter((trustStore) => trustStore.supported_protocols.includes(filters.protocol as IamIdentityProviderProtocol));
    }
    if (filters?.status) {
      trustStores = trustStores.filter((trustStore) => trustStore.status === filters.status);
    }
    return {
      generated_at: nowIso(),
      federation_trust_stores: clone(trustStores),
      count: trustStores.length,
    };
  },

  listFederationMappingProfiles(filters?: {
    realm_id?: string | null;
    trust_store_id?: string | null;
    protocol?: IamIdentityProviderProtocol | null;
    status?: IamFederationMappingProfileStatus | null;
  }): IamFederationMappingProfilesResponse {
    let mappingProfiles = [...state.federation_mapping_profiles];
    if (filters?.realm_id) {
      mappingProfiles = mappingProfiles.filter((profile) => profile.realm_id === filters.realm_id);
    }
    if (filters?.trust_store_id) {
      mappingProfiles = mappingProfiles.filter((profile) => profile.trust_store_id === filters.trust_store_id);
    }
    if (filters?.protocol) {
      mappingProfiles = mappingProfiles.filter((profile) => profile.protocol === filters.protocol);
    }
    if (filters?.status) {
      mappingProfiles = mappingProfiles.filter((profile) => profile.status === filters.status);
    }
    return {
      generated_at: nowIso(),
      federation_mapping_profiles: clone(mappingProfiles),
      count: mappingProfiles.length,
    };
  },

  previewFederationClaimRelease(input: PreviewIamFederationClaimReleaseRequest): IamFederationClaimPreviewResponse {
    assertRealmExists(input.realm_id);
    const evaluation = evaluateFederationClaimPreview({
      realm_id: input.realm_id,
      provider_alias: input.provider_alias,
      mapping_profile_id: input.mapping_profile_id,
      external_username_or_email: input.external_username_or_email,
      target: input.target,
      requested_purpose: input.requested_purpose,
      consent_granted: input.consent_granted,
    });
    return {
      generated_at: nowIso(),
      ...evaluation,
    };
  },

  async createUserFederationProviderAsync(
    actorUserId: string,
    input: CreateIamUserFederationProviderRequest,
  ): Promise<IamUserFederationProviderRecord> {
    return runWithDeferredPersistence(() => createUserFederationProviderRecord(actorUserId, input));
  },

  async updateUserFederationProviderAsync(
    actorUserId: string,
    providerId: string,
    input: UpdateIamUserFederationProviderRequest,
  ): Promise<IamUserFederationProviderRecord> {
    return runWithDeferredPersistence(() => updateUserFederationProviderRecord(actorUserId, providerId, input));
  },

  async runUserFederationSyncAsync(
    actorUserId: string,
    providerId: string,
    input?: RunIamUserFederationSyncRequest,
  ): Promise<IamFederationSyncJobRecord> {
    return runWithDeferredPersistence(() => runUserFederationSyncRecordAsync(actorUserId, providerId, input));
  },

  listLinkedIdentities(filters?: {
    realm_id?: string | null;
    user_id?: string | null;
    source_type?: IamLinkedIdentitySourceType | null;
  }): IamLinkedIdentitiesResponse {
    let linkedIdentities = [...state.linked_identities];
    if (filters?.realm_id) {
      linkedIdentities = linkedIdentities.filter((record) => record.realm_id === filters.realm_id);
    }
    if (filters?.user_id) {
      linkedIdentities = linkedIdentities.filter((record) => record.user_id === filters.user_id);
    }
    if (filters?.source_type) {
      linkedIdentities = linkedIdentities.filter((record) => record.source_type === filters.source_type);
    }
    return {
      generated_at: nowIso(),
      linked_identities: clone(linkedIdentities),
      count: linkedIdentities.length,
    };
  },

  listFederationSyncJobs(filters?: {
    realm_id?: string | null;
    provider_id?: string | null;
  }): IamFederationSyncJobsResponse {
    let syncJobs = [...state.sync_jobs];
    if (filters?.realm_id) {
      syncJobs = syncJobs.filter((job) => job.realm_id === filters.realm_id);
    }
    if (filters?.provider_id) {
      syncJobs = syncJobs.filter((job) => job.provider_id === filters.provider_id);
    }
    return {
      generated_at: nowIso(),
      sync_jobs: clone(syncJobs).sort((leftItem, rightItem) => rightItem.started_at.localeCompare(leftItem.started_at)),
      count: syncJobs.length,
    };
  },

  listFederationEvents(filters?: {
    realm_id?: string | null;
    provider_id?: string | null;
  }): IamFederationEventsResponse {
    let events = [...state.events];
    if (filters?.realm_id) {
      events = events.filter((event) => event.realm_id === filters.realm_id);
    }
    if (filters?.provider_id) {
      events = events.filter((event) => event.provider_id === filters.provider_id);
    }
    events.sort((leftItem, rightItem) => rightItem.occurred_at.localeCompare(leftItem.occurred_at));
    return {
      generated_at: nowIso(),
      events: clone(events),
      count: events.length,
    };
  },

  exportState(): Record<string, unknown> {
    return clone(state) as unknown as Record<string, unknown>;
  },

  importState(input: Record<string, unknown>): void {
    const nextState = normalizeState(input as Partial<IamFederationRuntimeState>);
    state.identity_providers = nextState.identity_providers;
    state.user_federation_providers = nextState.user_federation_providers;
    state.federation_trust_stores = nextState.federation_trust_stores;
    state.federation_mapping_profiles = nextState.federation_mapping_profiles;
    state.linked_identities = nextState.linked_identities;
    state.sync_jobs = nextState.sync_jobs;
    state.events = nextState.events;
    persistStateSyncOnly();
  },
};
