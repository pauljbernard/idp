import { createHash, randomUUID, randomBytes, scryptSync } from 'crypto';
import { LocalControlPlaneStore } from './controlPlane';
import {
  getDefaultLocalUserId,
  getLocalUser,
  getLocalUserByEmail,
  findLocalUserByExternalIdentity,
  getLocalTenant,
  normalizeHeaderValue,
  type LocalDeploymentProfile
} from './tenants';
import { LocalSecretStore, type SecretKeySource, type SecretStoreSummary } from './secretStore';
import { loadOrCreatePersistedState, savePersistedState } from './persistence';
import { IAM_SYSTEM_USER_ID, normalizeIamIdentifier, rewriteIamIdentifiers } from './iamIdentifiers';
import { LEGACY_COMPAT_ENV, readCompatibilityEnv } from './legacyEnvironment';

export const LOCAL_SESSION_HEADER = 'x-session-id';
export const LOCAL_IDENTITY_PROVIDER_HEADER = 'x-identity-provider';
export const LOCAL_AUTHENTICATED_AT_HEADER = 'x-authenticated-at';
export const LOCAL_ASSURANCE_LEVEL_HEADER = 'x-assurance-level';

export type IdentityProviderMode = 'LOCAL_DIRECTORY' | 'CONTROL_PLANE_BRIDGE';
export type SessionAssuranceLevel = 'STANDARD' | 'MFA' | 'HARDENED' | 'GOVERNMENT';
export type IdentityAuthEntrypoint = 'email_password' | 'oidc_authorization_code_pkce' | 'provider_token_exchange' | 'trusted_header_gateway';
export type IdentitySessionTransport = 'header_session' | 'bearer_session';
export type IdentityDirectorySource = 'local_directory' | 'external_identity_sync';
export type IdentitySsoStatus = 'local_ready' | 'provider_connected' | 'provider_sync_required' | 'not_configured';
export type IdentityMfaStatus = 'local_secret_store' | 'provider_managed';
export type IdentityProvisioningStatus = 'local_directory' | 'external_identity_sync' | 'sync_required';

interface StoredUserSecurityState {
  user_id: string;
  password_reference_id: string | null;
  password_last_rotated_at: string | null;
  local_password_disabled_at?: string | null;
  totp_reference_id: string | null;
  backup_codes_reference_id: string | null;
  two_factor_enrolled_at: string | null;
  two_factor_disabled_at: string | null;
}

interface StoredSessionState {
  session_id: string;
  user_id: string;
  default_tenant_id: string | null;
  authenticated_at: string;
  issued_at: string;
  last_seen_at: string;
  expires_at: string;
  revoked_at: string | null;
  assurance_level: SessionAssuranceLevel;
  provider_id?: string;
  provider_display_name?: string;
  provider_mode?: IdentityProviderMode;
  auth_entrypoint?: IdentityAuthEntrypoint;
  session_transport?: IdentitySessionTransport;
  directory_source?: IdentityDirectorySource;
  identity_source?: 'local_credentials' | 'control_plane_provider' | 'trusted_request_headers';
  trusted_header_keys?: string[];
  provider_deployment?: 'local' | 'aws_native' | 'commercial' | 'open_source';
  external_user_id?: string | null;
  provider_session_id?: string | null;
}

interface IdentityControlPlaneState {
  users_by_id: Record<string, StoredUserSecurityState>;
  sessions_by_id?: Record<string, StoredSessionState>;
}

export interface IdentitySessionContext {
  provider_id: string;
  provider_display_name: string;
  provider_mode: IdentityProviderMode;
  session_id: string;
  user_id: string;
  tenant_id: string | null;
  tenant_selection_source: 'header' | 'default';
  authenticated_at: string;
  assurance_level: SessionAssuranceLevel;
  session_transport: IdentitySessionTransport;
  auth_entrypoint: IdentityAuthEntrypoint;
  identity_source: 'local_credentials' | 'control_plane_provider' | 'trusted_request_headers';
  directory_source: IdentityDirectorySource;
  provider_deployment: 'local' | 'aws_native' | 'commercial' | 'open_source';
  external_user_id: string | null;
  provider_session_id: string | null;
  trusted_header_keys: string[];
}

export interface IdentityProviderSummary {
  provider_id: string;
  provider_display_name: string;
  provider_mode: IdentityProviderMode;
  auth_entrypoint: IdentityAuthEntrypoint;
  session_transport: IdentitySessionTransport;
  directory_source: IdentityDirectorySource;
  sso_status: IdentitySsoStatus;
  mfa_status: IdentityMfaStatus;
  provisioning_status: IdentityProvisioningStatus;
  secret_store_provider: SecretStoreSummary['provider'];
  secret_store_key_source: SecretKeySource;
  production_gap: string;
}

export interface SecuritySessionSummary {
  session_id: string;
  user_id: string;
  tenant_id: string | null;
  authenticated_at: string;
  issued_at: string;
  last_seen_at: string;
  expires_at: string;
  assurance_level: SessionAssuranceLevel;
  provider_id: string;
  provider_display_name: string;
  provider_mode: IdentityProviderMode;
  provider_deployment: 'local' | 'aws_native' | 'commercial' | 'open_source';
  session_transport: IdentitySessionTransport;
  auth_entrypoint: IdentityAuthEntrypoint;
  identity_source: 'local_credentials' | 'control_plane_provider' | 'trusted_request_headers';
  directory_source: IdentityDirectorySource;
  external_user_id: string | null;
  provider_session_id: string | null;
}

export interface ProviderBridgeAssertionClaims {
  tenant_id: string;
  provider_id: string;
  email: string;
  external_user_id: string;
  assurance_level: SessionAssuranceLevel;
  iat: string;
  exp: string;
}

interface SessionCreationOptions {
  providerId?: string;
  providerDisplayName?: string;
  providerMode?: IdentityProviderMode;
  authEntrypoint?: IdentityAuthEntrypoint;
  sessionTransport?: IdentitySessionTransport;
  directorySource?: IdentityDirectorySource;
  identitySource?: 'local_credentials' | 'control_plane_provider' | 'trusted_request_headers';
  trustedHeaderKeys?: string[];
  providerDeployment?: 'local' | 'aws_native' | 'commercial' | 'open_source';
  externalUserId?: string | null;
  providerSessionId?: string | null;
  assuranceLevel?: SessionAssuranceLevel;
}

export interface UserSecurityControlState {
  user_id: string;
  password_managed: boolean;
  password_reference_id: string | null;
  password_last_rotated_at: string | null;
  two_factor_enrolled: boolean;
  totp_reference_id: string | null;
  backup_codes_reference_id: string | null;
  two_factor_enrolled_at: string | null;
  two_factor_disabled_at: string | null;
}

export interface SecurityControlPlaneSummary {
  generated_at: string;
  provider: IdentityProviderSummary;
  session: IdentitySessionContext;
  secret_store: SecretStoreSummary;
  user_security: UserSecurityControlState;
}

interface EnableTwoFactorResult {
  qrCode: string;
  backupCodes: string[];
  enrolledAt: string;
}

const IDENTITY_CONTROL_PLANE_STATE_FILE = 'identity-control-plane-state.json';
const DEFAULT_IDENTITY_PROVIDER_ID = 'idp-local-gateway';
const DEFAULT_IDENTITY_PROVIDER_NAME = 'Local Directory';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const PROVIDER_ASSERTION_TTL_MS = 1000 * 60 * 5;
const DEFAULT_PROVIDER_ASSERTION_SECRET = 'idp-dev-provider-bridge-secret';
const SEEDED_LOCAL_PASSWORDS: Record<string, string> = {
  [IAM_SYSTEM_USER_ID]: 'StandaloneIAM!SuperAdmin2026',
  'tenant-admin': 'StandaloneIAM!TenantAdmin2026',
  'service-operator': 'StandaloneIAM!ServiceOperator2026',
  'research-lead': 'StandaloneIAM!ResearchLead2026'
};

const identityState = rewriteIamIdentifiers(loadOrCreatePersistedState<IdentityControlPlaneState>(IDENTITY_CONTROL_PLANE_STATE_FILE, () => ({
  users_by_id: {},
  sessions_by_id: {}
})));

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function getProviderAssertionSecret(): string {
  return readCompatibilityEnv(LEGACY_COMPAT_ENV.identityBridgeSecret)
    || DEFAULT_PROVIDER_ASSERTION_SECRET;
}

function signProviderAssertionPayload(payload: string): string {
  return createHash('sha256').update(`${getProviderAssertionSecret()}:${payload}`).digest('hex');
}

function persistIdentityState(): void {
  savePersistedState(IDENTITY_CONTROL_PLANE_STATE_FILE, identityState);
}

if (!identityState.sessions_by_id) {
  identityState.sessions_by_id = {};
  persistIdentityState();
}

function shouldResetSeededLocalPasswords(): boolean {
  return process.env.NODE_ENV !== 'production';
}

function derivePasswordHash(userId: string, password: string): string {
  const salt = createHash('sha256').update(`idp:${normalizeIamIdentifier(userId)}:password`).digest('hex').slice(0, 16);
  const hash = scryptSync(password, salt, 32).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  return output;
}

function generateTotpSecret(): string {
  return base32Encode(randomBytes(12));
}

function generateBackupCodes(count: number = 8): string[] {
  return Array.from({ length: count }, () => {
    const code = randomBytes(5).toString('hex').slice(0, 8).toUpperCase();
    return `${code.slice(0, 4)}-${code.slice(4, 8)}`;
  });
}

function shouldSeedTwoFactor(userId: string): boolean {
  return userId === 'tenant-admin' || userId === 'service-operator';
}

function ensureUserSecurityState(userId: string): StoredUserSecurityState {
  const normalizedUserId = userId.trim() || getDefaultLocalUserId();
  let userState = identityState.users_by_id[normalizedUserId];

  if (!userState) {
    userState = {
      user_id: normalizedUserId,
      password_reference_id: null,
      password_last_rotated_at: null,
      local_password_disabled_at: null,
      totp_reference_id: null,
      backup_codes_reference_id: null,
      two_factor_enrolled_at: null,
      two_factor_disabled_at: null
    };
    identityState.users_by_id[normalizedUserId] = userState;
  }

  let changed = false;
  if (userState.local_password_disabled_at === undefined) {
    userState.local_password_disabled_at = null;
    changed = true;
  }

  const localUser = getLocalUser(normalizedUserId);
  const localPasswordEligible = (
    !userState.local_password_disabled_at &&
    localUser?.auth_source !== 'external_identity'
  );
  const defaultPassword = SEEDED_LOCAL_PASSWORDS[normalizedUserId] ?? `StandaloneIAM!${normalizedUserId.replace(/[^a-z0-9]/gi, '')}2026`;

  if (!userState.password_reference_id && localPasswordEligible) {
    const passwordReference = LocalSecretStore.upsertOpaqueSecret({
      subjectType: 'identity_user',
      subjectId: normalizedUserId,
      kind: 'password_hash',
      label: `${normalizedUserId} password hash`,
      value: derivePasswordHash(normalizedUserId, defaultPassword),
      createdByUserId: 'system-bootstrap',
      preview: `password_hash_${normalizedUserId}`
    });
    userState.password_reference_id = passwordReference.id;
    userState.password_last_rotated_at = passwordReference.last_rotated_at;
    changed = true;
  }

  if (shouldSeedTwoFactor(normalizedUserId) && !userState.totp_reference_id) {
    const enrolledAt = nowIso();
    const totpSecret = generateTotpSecret();
    const backupCodes = generateBackupCodes();

    const totpReference = LocalSecretStore.upsertOpaqueSecret({
      subjectType: 'identity_user',
      subjectId: normalizedUserId,
      kind: 'totp_seed',
      label: `${normalizedUserId} TOTP seed`,
      value: totpSecret,
      createdByUserId: 'system-bootstrap',
      preview: `totp_seed_${normalizedUserId}`
    });
    const backupReference = LocalSecretStore.upsertOpaqueSecret({
      subjectType: 'identity_user',
      subjectId: normalizedUserId,
      kind: 'backup_code_bundle',
      label: `${normalizedUserId} backup code bundle`,
      value: JSON.stringify(backupCodes),
      createdByUserId: 'system-bootstrap',
      preview: `backup_codes_${normalizedUserId}`
    });

    userState.totp_reference_id = totpReference.id;
    userState.backup_codes_reference_id = backupReference.id;
    userState.two_factor_enrolled_at = enrolledAt;
    userState.two_factor_disabled_at = null;
    changed = true;
  }

  if (changed) {
    persistIdentityState();
  }

  return userState;
}

function synchronizeSeededLocalPasswords(): void {
  if (!shouldResetSeededLocalPasswords()) {
    return;
  }

  let changed = false;

  for (const [userId, password] of Object.entries(SEEDED_LOCAL_PASSWORDS)) {
    const userState = ensureUserSecurityState(userId);
    const localUser = getLocalUser(userId);
    if (userState.local_password_disabled_at || localUser?.auth_source === 'external_identity') {
      continue;
    }
    const expectedHash = derivePasswordHash(userId, password);
    const currentHash = userState.password_reference_id
      ? LocalSecretStore.getSecretValue(userState.password_reference_id)
      : null;

    if (currentHash === expectedHash) {
      continue;
    }

    const reference = LocalSecretStore.upsertOpaqueSecret({
      subjectType: 'identity_user',
      subjectId: userId,
      kind: 'password_hash',
      label: `${userId} password hash`,
      value: expectedHash,
      createdByUserId: 'system-bootstrap',
      preview: `password_hash_${userId}`
    });

    userState.password_reference_id = reference.id;
    userState.password_last_rotated_at = reference.last_rotated_at;
    changed = true;
  }

  if (changed) {
    persistIdentityState();
  }
}

synchronizeSeededLocalPasswords();

function mapUserSecurityState(userState: StoredUserSecurityState): UserSecurityControlState {
  return {
    user_id: userState.user_id,
    password_managed: Boolean(userState.password_reference_id),
    password_reference_id: userState.password_reference_id,
    password_last_rotated_at: userState.password_last_rotated_at,
    two_factor_enrolled: Boolean(userState.totp_reference_id && !userState.two_factor_disabled_at),
    totp_reference_id: userState.totp_reference_id,
    backup_codes_reference_id: userState.backup_codes_reference_id,
    two_factor_enrolled_at: userState.two_factor_enrolled_at,
    two_factor_disabled_at: userState.two_factor_disabled_at
  };
}

function resolveAssuranceLevel(userId: string, tenantId: string | null, explicitLevel?: string | null): SessionAssuranceLevel {
  const normalizedExplicit = explicitLevel?.trim().toUpperCase();
  if (
    normalizedExplicit === 'STANDARD' ||
    normalizedExplicit === 'MFA' ||
    normalizedExplicit === 'HARDENED' ||
    normalizedExplicit === 'GOVERNMENT'
  ) {
    return normalizedExplicit;
  }

  const tenant = tenantId ? getLocalTenant(tenantId) : null;
  if (tenant?.assurance_mode === 'GOVERNMENT') {
    return 'GOVERNMENT';
  }

  if (tenant?.assurance_mode === 'HARDENED') {
    return 'HARDENED';
  }

  return mapUserSecurityState(ensureUserSecurityState(userId)).two_factor_enrolled ? 'MFA' : 'STANDARD';
}

function readHeaderValue(headers: Record<string, unknown>, headerName: string): string | null {
  return normalizeHeaderValue(headers[headerName] as string | string[] | undefined);
}

function plusMilliseconds(isoTimestamp: string, milliseconds: number): string {
  return new Date(Date.parse(isoTimestamp) + milliseconds).toISOString();
}

function mapStoredSession(
  session: StoredSessionState,
  tenantId: string | null,
  selectionSource: IdentitySessionContext['tenant_selection_source']
): IdentitySessionContext {
  return {
    provider_id: session.provider_id ?? DEFAULT_IDENTITY_PROVIDER_ID,
    provider_display_name: session.provider_display_name ?? DEFAULT_IDENTITY_PROVIDER_NAME,
    provider_mode: session.provider_mode ?? 'LOCAL_DIRECTORY',
    session_id: session.session_id,
    user_id: session.user_id,
    tenant_id: tenantId,
    tenant_selection_source: selectionSource,
    authenticated_at: session.authenticated_at,
    assurance_level: session.assurance_level,
    session_transport: session.session_transport ?? 'header_session',
    auth_entrypoint: session.auth_entrypoint ?? 'email_password',
    identity_source: session.identity_source ?? 'local_credentials',
    directory_source: session.directory_source ?? 'local_directory',
    provider_deployment: session.provider_deployment ?? 'local',
    external_user_id: session.external_user_id ?? null,
    provider_session_id: session.provider_session_id ?? null,
    trusted_header_keys: session.trusted_header_keys ?? []
  };
}

function listActiveSessionsForUser(userId: string): StoredSessionState[] {
  const now = Date.now();
  return Object.values(identityState.sessions_by_id ?? {}).filter((session) => {
    if (session.user_id !== userId) {
      return false;
    }

    if (session.revoked_at) {
      return false;
    }

    const expiresAt = Date.parse(session.expires_at);
    return Number.isFinite(expiresAt) && expiresAt > now;
  });
}

function listActiveSessions(tenantId?: string | null): StoredSessionState[] {
  const now = Date.now();
  return Object.values(identityState.sessions_by_id ?? {}).filter((session) => {
    if (session.revoked_at) {
      return false;
    }

    const expiresAt = Date.parse(session.expires_at);
    if (!Number.isFinite(expiresAt) || expiresAt <= now) {
      return false;
    }

    if (tenantId && session.default_tenant_id !== tenantId) {
      return false;
    }

    return true;
  });
}

function buildProviderSummary(
  secretStoreSummary: SecretStoreSummary,
  tenantId: string | null,
  session?: IdentitySessionContext | null,
): IdentityProviderSummary {
  if (session?.provider_mode === 'CONTROL_PLANE_BRIDGE') {
    return {
      provider_id: session.provider_id,
      provider_display_name: session.provider_display_name,
      provider_mode: 'CONTROL_PLANE_BRIDGE',
      auth_entrypoint: session.auth_entrypoint,
      session_transport: session.session_transport,
      directory_source: session.directory_source,
      sso_status: 'provider_connected',
      mfa_status: 'provider_managed',
      provisioning_status: session.directory_source === 'external_identity_sync' ? 'external_identity_sync' : 'sync_required',
      secret_store_provider: secretStoreSummary.provider,
      secret_store_key_source: secretStoreSummary.key_source,
      production_gap: `${session.provider_display_name} is currently bridged into the standalone application session during IAM adoption.`
    };
  }

  if (!tenantId) {
    return {
      provider_id: DEFAULT_IDENTITY_PROVIDER_ID,
      provider_display_name: DEFAULT_IDENTITY_PROVIDER_NAME,
      provider_mode: 'LOCAL_DIRECTORY',
      auth_entrypoint: session?.auth_entrypoint ?? 'email_password',
      session_transport: session?.session_transport ?? 'header_session',
      directory_source: session?.directory_source ?? 'local_directory',
      sso_status: 'local_ready',
      mfa_status: 'local_secret_store',
      provisioning_status: 'local_directory',
      secret_store_provider: secretStoreSummary.provider,
      secret_store_key_source: secretStoreSummary.key_source,
      production_gap: 'Standalone local identity mode is active for this context.'
    };
  }

  const identityConfiguration = LocalControlPlaneStore.getTenantConfiguration(tenantId).identity;
  if (identityConfiguration.provider_id === 'LOCAL_DIRECTORY') {
    return {
      provider_id: 'LOCAL_DIRECTORY',
      provider_display_name: 'Local Directory',
      provider_mode: 'LOCAL_DIRECTORY',
      auth_entrypoint: session?.auth_entrypoint ?? 'email_password',
      session_transport: session?.session_transport ?? 'header_session',
      directory_source: 'local_directory',
      sso_status: 'local_ready',
      mfa_status: 'local_secret_store',
      provisioning_status: 'local_directory',
      secret_store_provider: secretStoreSummary.provider,
      secret_store_key_source: secretStoreSummary.key_source,
      production_gap: 'Standalone local identity mode is active for this tenant.'
    };
  }

  return {
    provider_id: identityConfiguration.provider_id,
    provider_display_name: identityConfiguration.provider_label,
    provider_mode: 'CONTROL_PLANE_BRIDGE',
    auth_entrypoint: session?.auth_entrypoint ?? 'provider_token_exchange',
    session_transport: session?.session_transport ?? 'bearer_session',
    directory_source: 'external_identity_sync',
    sso_status:
      identityConfiguration.status === 'connected'
        ? 'provider_connected'
        : identityConfiguration.status === 'sync_required'
          ? 'provider_sync_required'
          : 'not_configured',
    mfa_status: 'provider_managed',
    provisioning_status:
      identityConfiguration.status === 'sync_required' ? 'sync_required' : 'external_identity_sync',
    secret_store_provider: secretStoreSummary.provider,
    secret_store_key_source: secretStoreSummary.key_source,
    production_gap:
      identityConfiguration.status === 'connected'
        ? `${identityConfiguration.provider_label} is configured through the tenant identity control plane.`
        : `Identity provider ${identityConfiguration.provider_label} still requires configuration or sync before external sign-in can be used.`
  };
}

export class LocalIdentityControlPlane {
  static verifyPassword(userId: string, password: string): boolean {
    const userState = ensureUserSecurityState(userId);
    const localUser = getLocalUser(userId);
    if (userState.local_password_disabled_at || localUser?.auth_source === 'external_identity' || !userState.password_reference_id) {
      return false;
    }

    const storedHash = LocalSecretStore.getSecretValue(userState.password_reference_id);
    if (!storedHash) {
      return false;
    }

    return storedHash === derivePasswordHash(userId, password);
  }

  static getUserSecurityState(userId: string): UserSecurityControlState {
    return mapUserSecurityState(clone(ensureUserSecurityState(userId)));
  }

  static rotatePassword(userId: string, newPassword: string): UserSecurityControlState {
    const userState = ensureUserSecurityState(userId);
    const reference = LocalSecretStore.upsertOpaqueSecret({
      subjectType: 'identity_user',
      subjectId: userId,
      kind: 'password_hash',
      label: `${userId} password hash`,
      value: derivePasswordHash(userId, newPassword),
      createdByUserId: userId,
      preview: `password_hash_${userId}`
    });

    userState.password_reference_id = reference.id;
    userState.password_last_rotated_at = reference.last_rotated_at;
    userState.local_password_disabled_at = null;
    persistIdentityState();
    return mapUserSecurityState(clone(userState));
  }

  static disableLocalPassword(userId: string): UserSecurityControlState {
    const userState = ensureUserSecurityState(userId);
    userState.password_reference_id = null;
    userState.password_last_rotated_at = null;
    userState.local_password_disabled_at = nowIso();
    persistIdentityState();
    return mapUserSecurityState(clone(userState));
  }

  static deleteUserSecurityState(userId: string): void {
    let didMutate = false;

    if (identityState.users_by_id[userId]) {
      delete identityState.users_by_id[userId];
      didMutate = true;
    }

    Object.entries(identityState.sessions_by_id ?? {}).forEach(([sessionId, session]) => {
      if (session.user_id === userId) {
        delete identityState.sessions_by_id![sessionId];
        didMutate = true;
      }
    });

    if (didMutate) {
      persistIdentityState();
    }
  }

  static enableTwoFactor(userId: string, email: string): EnableTwoFactorResult {
    const userState = ensureUserSecurityState(userId);
    const totpSecret = generateTotpSecret();
    const backupCodes = generateBackupCodes();
    const enrolledAt = nowIso();

    const totpReference = LocalSecretStore.upsertOpaqueSecret({
      subjectType: 'identity_user',
      subjectId: userId,
      kind: 'totp_seed',
      label: `${userId} TOTP seed`,
      value: totpSecret,
      createdByUserId: userId,
      preview: `totp_seed_${userId}`
    });
    const backupCodesReference = LocalSecretStore.upsertOpaqueSecret({
      subjectType: 'identity_user',
      subjectId: userId,
      kind: 'backup_code_bundle',
      label: `${userId} backup code bundle`,
      value: JSON.stringify(backupCodes),
      createdByUserId: userId,
      preview: `backup_codes_${userId}`
    });

    userState.totp_reference_id = totpReference.id;
    userState.backup_codes_reference_id = backupCodesReference.id;
    userState.two_factor_enrolled_at = enrolledAt;
    userState.two_factor_disabled_at = null;
    persistIdentityState();

    return {
      qrCode: `otpauth://totp/IDP:${encodeURIComponent(email)}?secret=${totpSecret}&issuer=IDP`,
      backupCodes,
      enrolledAt
    };
  }

  static disableTwoFactor(userId: string): UserSecurityControlState {
    const userState = ensureUserSecurityState(userId);
    userState.two_factor_disabled_at = nowIso();
    persistIdentityState();
    return mapUserSecurityState(clone(userState));
  }

  static issueProviderBridgeAssertion(input: {
    tenantId: string;
    providerId: string;
    email: string;
    externalUserId: string;
    assuranceLevel?: SessionAssuranceLevel;
  }): string {
    const issuedAt = nowIso();
    const payload: ProviderBridgeAssertionClaims = {
      tenant_id: input.tenantId,
      provider_id: input.providerId,
      email: input.email.trim().toLowerCase(),
      external_user_id: input.externalUserId,
      assurance_level: input.assuranceLevel ?? 'STANDARD',
      iat: issuedAt,
      exp: plusMilliseconds(issuedAt, PROVIDER_ASSERTION_TTL_MS)
    };

    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signature = signProviderAssertionPayload(encodedPayload);
    return `${encodedPayload}.${signature}`;
  }

  static verifyProviderBridgeAssertion(
    assertion: string,
    expectedTenantId: string,
    expectedProviderId: string,
  ): ProviderBridgeAssertionClaims {
    const [encodedPayload, signature] = assertion.split('.');
    if (!encodedPayload || !signature) {
      throw new Error('Invalid provider bridge assertion format');
    }

    const expectedSignature = signProviderAssertionPayload(encodedPayload);
    if (expectedSignature !== signature) {
      throw new Error('Invalid provider bridge assertion signature');
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as ProviderBridgeAssertionClaims;
    if (payload.tenant_id !== expectedTenantId) {
      throw new Error('Provider bridge assertion tenant does not match the requested tenant');
    }

    if (payload.provider_id !== expectedProviderId) {
      throw new Error('Provider bridge assertion provider does not match the configured provider');
    }

    if (Date.parse(payload.exp) <= Date.now()) {
      throw new Error('Provider bridge assertion has expired');
    }

    return payload;
  }

  static resolveProviderLogin(input: {
    tenantId: string;
    providerId: string;
    assertion: string;
  }): { userId: string; externalUserId: string; assuranceLevel: SessionAssuranceLevel } {
    const claims = this.verifyProviderBridgeAssertion(input.assertion, input.tenantId, input.providerId);
    const externalMember = LocalControlPlaneStore.listExternalIdentityMembers(input.tenantId).members.find((member) => (
      member.provider_id === claims.provider_id &&
      member.external_user_id === claims.external_user_id
    ));

    if (!externalMember) {
      throw new Error('Provider-backed identity is not present in the tenant roster');
    }

    if (externalMember.status !== 'active') {
      throw new Error(`Provider-backed identity is ${externalMember.status} and cannot sign in`);
    }

    const localUser =
      findLocalUserByExternalIdentity(input.tenantId, claims.provider_id, claims.external_user_id) ??
      getLocalUserByEmail(claims.email);
    if (!localUser) {
      throw new Error('Provider-backed identity is not provisioned as a tenant principal');
    }

    return {
      userId: localUser.id,
      externalUserId: claims.external_user_id,
      assuranceLevel: claims.assurance_level
    };
  }

  static createSession(
    userId: string,
    defaultTenantId: string | null,
    options: SessionCreationOptions = {},
  ): IdentitySessionContext {
    ensureUserSecurityState(userId);

    const issuedAt = nowIso();
    const session: StoredSessionState = {
      session_id: `local-session-${randomUUID()}`,
      user_id: userId,
      default_tenant_id: defaultTenantId?.trim() || null,
      authenticated_at: issuedAt,
      issued_at: issuedAt,
      last_seen_at: issuedAt,
      expires_at: plusMilliseconds(issuedAt, SESSION_TTL_MS),
      revoked_at: null,
      assurance_level: options.assuranceLevel ?? resolveAssuranceLevel(userId, defaultTenantId ?? null),
      provider_id: options.providerId ?? DEFAULT_IDENTITY_PROVIDER_ID,
      provider_display_name: options.providerDisplayName ?? DEFAULT_IDENTITY_PROVIDER_NAME,
      provider_mode: options.providerMode ?? 'LOCAL_DIRECTORY',
      auth_entrypoint: options.authEntrypoint ?? 'email_password',
      session_transport: options.sessionTransport ?? 'header_session',
      directory_source: options.directorySource ?? 'local_directory',
      identity_source: options.identitySource ?? 'local_credentials',
      trusted_header_keys: options.trustedHeaderKeys ?? [],
      provider_deployment: options.providerDeployment ?? 'local',
      external_user_id: options.externalUserId ?? null,
      provider_session_id: options.providerSessionId ?? null
    };

    identityState.sessions_by_id![session.session_id] = session;
    persistIdentityState();
    return mapStoredSession(session, session.default_tenant_id, 'default');
  }

  static updateSessionDefaultTenant(
    sessionId: string,
    userId: string,
    defaultTenantId: string | null,
  ): IdentitySessionContext | null {
    const session = identityState.sessions_by_id?.[sessionId];
    if (!session || session.revoked_at || session.user_id !== userId) {
      return null;
    }

    const expiresAt = Date.parse(session.expires_at);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      session.revoked_at = nowIso();
      persistIdentityState();
      return null;
    }

    session.default_tenant_id = defaultTenantId?.trim() || null;
    session.last_seen_at = nowIso();
    session.assurance_level = resolveAssuranceLevel(session.user_id, session.default_tenant_id ?? null);
    persistIdentityState();
    return mapStoredSession(session, session.default_tenant_id, 'default');
  }

  static listSecuritySessionsForUser(userId: string): SecuritySessionSummary[] {
    return listActiveSessionsForUser(userId)
      .sort((left, right) => Date.parse(right.last_seen_at) - Date.parse(left.last_seen_at))
      .map((session) => ({
        session_id: session.session_id,
        user_id: session.user_id,
        tenant_id: session.default_tenant_id,
        authenticated_at: session.authenticated_at,
        issued_at: session.issued_at,
        last_seen_at: session.last_seen_at,
        expires_at: session.expires_at,
        assurance_level: session.assurance_level,
        provider_id: session.provider_id ?? DEFAULT_IDENTITY_PROVIDER_ID,
        provider_display_name: session.provider_display_name ?? DEFAULT_IDENTITY_PROVIDER_NAME,
        provider_mode: session.provider_mode ?? 'LOCAL_DIRECTORY',
        provider_deployment: session.provider_deployment ?? 'local',
        session_transport: session.session_transport ?? 'header_session',
        auth_entrypoint: session.auth_entrypoint ?? 'email_password',
        identity_source: session.identity_source ?? 'local_credentials',
        directory_source: session.directory_source ?? 'local_directory',
        external_user_id: session.external_user_id ?? null,
        provider_session_id: session.provider_session_id ?? null
      }));
  }

  static revokeSession(sessionId: string, userId?: string | null): boolean {
    const session = identityState.sessions_by_id?.[sessionId];
    if (!session) {
      return false;
    }

    if (userId && session.user_id !== userId) {
      return false;
    }

    if (!session.revoked_at) {
      session.revoked_at = nowIso();
      persistIdentityState();
    }

    return true;
  }

  static revokeUserSessions(userId: string): number {
    let revoked = 0;

    listActiveSessionsForUser(userId).forEach((session) => {
      if (!session.revoked_at) {
        session.revoked_at = nowIso();
        revoked += 1;
      }
    });

    if (revoked > 0) {
      persistIdentityState();
    }

    return revoked;
  }

  static revokeOtherUserSessions(userId: string, currentSessionId: string): number {
    let revoked = 0;

    listActiveSessionsForUser(userId).forEach((session) => {
      if (session.session_id !== currentSessionId && !session.revoked_at) {
        session.revoked_at = nowIso();
        revoked += 1;
      }
    });

    if (revoked > 0) {
      persistIdentityState();
    }

    return revoked;
  }

  static countActiveSessions(tenantId?: string | null): number {
    return listActiveSessions(tenantId).length;
  }

  static resolveAuthenticatedSession(
    headers: Record<string, unknown>,
    requestedUserId?: string | null,
    requestedTenantId?: string | null
  ): IdentitySessionContext | null {
    const sessionId = readHeaderValue(headers, LOCAL_SESSION_HEADER);
    if (!sessionId) {
      return null;
    }

    const session = identityState.sessions_by_id?.[sessionId];
    if (!session || session.revoked_at) {
      return null;
    }

    if (requestedUserId && session.user_id !== requestedUserId.trim()) {
      return null;
    }

    const now = Date.now();
    const expiresAt = Date.parse(session.expires_at);
    if (!Number.isFinite(expiresAt) || expiresAt <= now) {
      session.revoked_at = nowIso();
      persistIdentityState();
      return null;
    }

    session.last_seen_at = nowIso();
    persistIdentityState();

    const normalizedRequestedTenant = requestedTenantId?.trim() || null;
    const effectiveTenantId = normalizedRequestedTenant ?? session.default_tenant_id ?? null;
    const selectionSource: IdentitySessionContext['tenant_selection_source'] = normalizedRequestedTenant ? 'header' : 'default';
    return mapStoredSession(session, effectiveTenantId, selectionSource);
  }

  static getSecurityContextForSession(
    headers: Record<string, unknown>,
    requestedUserId?: string | null,
    requestedTenantId?: string | null
  ): SecurityControlPlaneSummary | null {
    const session = this.resolveAuthenticatedSession(headers, requestedUserId, requestedTenantId);
    if (!session) {
      return null;
    }

    const secretStoreSummary = LocalSecretStore.getSummary();
    return {
      generated_at: nowIso(),
      provider: buildProviderSummary(secretStoreSummary, session.tenant_id, session),
      session,
      secret_store: secretStoreSummary,
      user_security: this.getUserSecurityState(session.user_id)
    };
  }

  static getSecurityContextForIdentitySession(session: IdentitySessionContext): SecurityControlPlaneSummary {
    const secretStoreSummary = LocalSecretStore.getSummary();
    return {
      generated_at: nowIso(),
      provider: buildProviderSummary(secretStoreSummary, session.tenant_id, session),
      session,
      secret_store: secretStoreSummary,
      user_security: this.getUserSecurityState(session.user_id)
    };
  }

  static resolveSession(headers: Record<string, unknown>, userId: string, tenantId: string | null): IdentitySessionContext {
    const normalizedUserId = userId.trim() || getDefaultLocalUserId();
    const normalizedTenantId = tenantId?.trim() || null;
    const trustedProviderId = readHeaderValue(headers, LOCAL_IDENTITY_PROVIDER_HEADER) ?? DEFAULT_IDENTITY_PROVIDER_ID;
    const sessionId =
      readHeaderValue(headers, LOCAL_SESSION_HEADER) ??
      `local-session-${createHash('sha256').update(`${normalizedUserId}:${normalizedTenantId ?? 'none'}`).digest('hex').slice(0, 16)}`;
    const authenticatedAt = readHeaderValue(headers, LOCAL_AUTHENTICATED_AT_HEADER) ?? nowIso();

    return {
      provider_id: trustedProviderId,
      provider_display_name: DEFAULT_IDENTITY_PROVIDER_NAME,
      provider_mode: 'LOCAL_DIRECTORY',
      session_id: sessionId,
      user_id: normalizedUserId,
      tenant_id: normalizedTenantId,
      tenant_selection_source: normalizedTenantId ? 'header' : 'default',
      authenticated_at: authenticatedAt,
      assurance_level: resolveAssuranceLevel(
        normalizedUserId,
        normalizedTenantId,
        readHeaderValue(headers, LOCAL_ASSURANCE_LEVEL_HEADER)
      ),
      session_transport: 'header_session',
      auth_entrypoint: 'trusted_header_gateway',
      directory_source: 'local_directory',
      provider_deployment: 'local',
      external_user_id: null,
      provider_session_id: null,
      identity_source: 'trusted_request_headers',
      trusted_header_keys: [
        LOCAL_IDENTITY_PROVIDER_HEADER,
        LOCAL_SESSION_HEADER,
        LOCAL_AUTHENTICATED_AT_HEADER,
        LOCAL_ASSURANCE_LEVEL_HEADER
      ]
    };
  }

  static getSecurityContext(headers: Record<string, unknown>, userId: string, tenantId: string | null): SecurityControlPlaneSummary {
    const secretStoreSummary = LocalSecretStore.getSummary();
    const session = this.resolveSession(headers, userId, tenantId);
    return {
      generated_at: nowIso(),
      provider: buildProviderSummary(secretStoreSummary, session.tenant_id, session),
      session,
      secret_store: secretStoreSummary,
      user_security: this.getUserSecurityState(userId)
    };
  }

  static newSessionId(): string {
    return `local-session-${randomUUID()}`;
  }

  static getAllowedProfilesForProvider(): LocalDeploymentProfile[] {
    return ['SHARED_SAAS', 'US_ENTERPRISE', 'GOVERNMENT_SENSITIVE'];
  }
}
