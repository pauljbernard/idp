import { AsyncLocalStorage } from 'async_hooks';
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import { existsSync } from 'fs';
import {
  getPersistedStatePath,
  reloadOrCreatePersistedStateAsync,
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
import { getRuntimeRepositoryMode } from './dynamo/runtimeRepositoryMode';
import { resolveRuntimeTableName } from './dynamo/runtimeTables';
import { DynamoDbAuthenticationActivityRepository } from './dynamo/repositories/dynamoDbAuthenticationActivityRepository';
import { DynamoDbLoginTransactionRepository } from './dynamo/repositories/dynamoDbLoginTransactionRepository';
import { DynamoDbSessionRepository } from './dynamo/repositories/dynamoDbSessionRepository';
import { DynamoDbTicketRepository } from './dynamo/repositories/dynamoDbTicketRepository';
import { DualRunAsyncLoginTransactionStoreAdapter } from './dynamo/runtimeAdapters/dualRunAsyncLoginTransactionStoreAdapter';
import { DualRunAsyncSessionStoreAdapter } from './dynamo/runtimeAdapters/dualRunAsyncSessionStoreAdapter';
import { DualRunAsyncTicketStoreAdapter } from './dynamo/runtimeAdapters/dualRunAsyncTicketStoreAdapter';
import { DynamoAsyncLoginTransactionStoreAdapter } from './dynamo/runtimeAdapters/dynamoAsyncLoginTransactionStoreAdapter';
import { DynamoAsyncSessionStoreAdapter } from './dynamo/runtimeAdapters/dynamoAsyncSessionStoreAdapter';
import { DynamoAsyncTicketStoreAdapter } from './dynamo/runtimeAdapters/dynamoAsyncTicketStoreAdapter';
import { LegacyAsyncLoginTransactionStoreAdapter } from './dynamo/runtimeAdapters/legacyAsyncLoginTransactionStoreAdapter';
import { LegacyAsyncSessionStoreAdapter } from './dynamo/runtimeAdapters/legacyAsyncSessionStoreAdapter';
import { LegacyAsyncTicketStoreAdapter } from './dynamo/runtimeAdapters/legacyAsyncTicketStoreAdapter';
import { LegacyLoginTransactionStoreAdapter } from './dynamo/runtimeAdapters/legacyLoginTransactionStoreAdapter';
import { LegacySessionStoreAdapter } from './dynamo/runtimeAdapters/legacySessionStoreAdapter';
import { LegacyTicketStoreAdapter } from './dynamo/runtimeAdapters/legacyTicketStoreAdapter';
import { NoopAsyncLoginTransactionStoreAdapter, NoopAsyncSessionStoreAdapter, NoopAsyncTicketStoreAdapter } from './dynamo/runtimeAdapters/noopAsyncRuntimeAdapters';
import {
  LocalIamFoundationStore,
  type IamDelegatedConsentRecord,
  type IamDelegatedConsentRequestRecord,
  type IamDelegatedConsentRequestStatus,
  type IamDelegatedConsentStatus,
  type IamDelegatedRelationshipRecord,
  type IamDelegatedRelationshipStatus,
  type IamUserRecord,
} from './iamFoundation';
import {
  LocalIamProtocolRuntimeStore,
  type IamClientProtocol,
  type IamClientRecord,
  type IamSubjectKind,
} from './iamProtocolRuntime';
import { LocalIamAuthFlowStore, type IamAuthenticatorKind } from './iamAuthFlows';
import { LocalIamFederationSessionIndexStore } from './iamFederationSessionIndex';
import { LocalSecretStore } from './secretStore';
import { LocalIamWebAuthnStore } from './iamWebAuthn';
import {
  LocalIamUserProfileStore,
  type IamUserProfileAttributeValue,
  type IamUserProfileRecord,
  type IamUserProfileSchemaRecord,
} from './iamUserProfiles';
import { LEGACY_COMPAT_ENV, readCompatibilityBooleanEnv } from './legacyEnvironment';

export const IAM_SESSION_HEADER = 'x-iam-session-id';

type IamLoginNextStep = 'AUTHENTICATED' | 'REQUIRED_ACTIONS' | 'CONSENT_REQUIRED' | 'MFA_REQUIRED';
type IamAccountAssuranceLevel = 'PASSWORD' | 'MFA' | 'PASSKEY';
type IamSessionStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';
type IamLoginTransactionStatus = 'PENDING_REQUIRED_ACTIONS' | 'PENDING_CONSENT' | 'PENDING_MFA' | 'COMPLETE' | 'CANCELLED' | 'EXPIRED';
type IamTicketStatus = 'PENDING' | 'CONSUMED' | 'EXPIRED';

const LEGACY_IAM_AUTHENTICATION_RUNTIME_FILE = 'iam-authentication-runtime-state.json';
const IAM_AUTHENTICATION_DIRECTORY_FILE = 'iam-authentication-directory-state.json';
const IAM_AUTHENTICATION_ACTIVITY_FILE = 'iam-authentication-activity-state.json';
const IAM_AUTHENTICATION_TRANSIENT_FILE = 'iam-authentication-transient-state.json';
const LOGIN_TRANSACTION_TTL_MS = 1000 * 60 * 15;
const ACCOUNT_SESSION_TTL_MS = 1000 * 60 * 60 * 8;
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 15;
const EMAIL_VERIFICATION_TTL_MS = 1000 * 60 * 30;
const PENDING_MFA_TTL_MS = 1000 * 60 * 10;
const LOGIN_FAILURE_WINDOW_MS = 1000 * 60 * 15;
const LOGIN_LOCKOUT_DURATION_MS = 1000 * 60 * 15;
const LOGIN_LOCKOUT_THRESHOLD = 5;
const SESSION_PROOF_DELIMITER = '.';
type DeferredPersistenceContextState = {
  dirty_all: boolean;
  dirty_directory: boolean;
  dirty_activity: boolean;
  dirty_transient: boolean;
};

const deferredPersistenceContext = new AsyncLocalStorage<DeferredPersistenceContextState>();
const accountSecurityStateCache = new Map<string, StoredIamAccountSecurityState>();
const userLockoutStateCache = new Map<string, StoredIamUserLockoutState>();

export interface StoredIamAccountSecurityState {
  realm_id: string;
  user_id: string;
  email_verified_at: string | null;
  last_login_at: string | null;
  last_password_updated_at: string | null;
  last_mfa_authenticated_at: string | null;
  last_passkey_authenticated_at: string | null;
}

interface StoredIamMfaState {
  realm_id: string;
  user_id: string;
  totp_reference_id: string;
  backup_codes_reference_id: string;
  enrolled_at: string;
  disabled_at: string | null;
}

export interface IamFederatedLoginContextInput {
  source_type: 'BROKER' | 'FEDERATION';
  linked_identity_id: string;
  provider_id: string;
  provider_name: string;
  provider_alias: string | null;
  provider_kind: string;
  external_subject: string;
}

export interface StoredPendingIamMfaEnrollment {
  id: string;
  realm_id: string;
  user_id: string;
  secret: string;
  backup_codes: string[];
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
}

export interface StoredIamAccountSession {
  id: string;
  realm_id: string;
  user_id: string;
  client_id: string | null;
  client_identifier: string | null;
  client_name: string | null;
  client_protocol: IamClientProtocol | null;
  scope_names: string[];
  assurance_level: IamAccountAssuranceLevel;
  authenticated_at: string;
  issued_at: string;
  last_seen_at: string;
  expires_at: string;
  revoked_at: string | null;
  session_proof_hash: string | null;
  federated_login_context: IamFederatedLoginContextInput | null;
  synthetic: boolean;
}

interface StoredIamConsentRecord {
  id: string;
  realm_id: string;
  user_id: string;
  client_id: string;
  client_identifier: string;
  client_name: string;
  scope_names: string[];
  granted_at: string;
  revoked_at: string | null;
}

export interface StoredIamLoginTransaction {
  id: string;
  realm_id: string;
  user_id: string;
  flow_id: string | null;
  client_id: string | null;
  client_identifier: string | null;
  client_name: string | null;
  client_protocol: IamClientProtocol | null;
  requested_scope_names: string[];
  pending_required_actions: string[];
  pending_scope_consent: string[];
  pending_mfa: boolean;
  federated_login_context: IamFederatedLoginContextInput | null;
  created_at: string;
  expires_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  status: IamLoginTransactionStatus;
}

export interface StoredIamPasswordResetTicket {
  id: string;
  realm_id: string;
  user_id: string;
  code_hash: string;
  code_preview: string | null;
  issued_at: string;
  expires_at: string;
  status: IamTicketStatus;
  consumed_at: string | null;
}

export interface StoredIamEmailVerificationTicket {
  id: string;
  realm_id: string;
  user_id: string;
  code_hash: string;
  code_preview: string | null;
  issued_at: string;
  expires_at: string;
  status: IamTicketStatus;
  consumed_at: string | null;
}

export type IamLoginAttemptOutcome = 'SUCCESS' | 'FAILED_CREDENTIALS' | 'FAILED_MFA' | 'FAILED_PASSKEY' | 'LOCKED';

export interface StoredIamLoginAttempt {
  id: string;
  realm_id: string;
  user_id: string | null;
  username_or_email: string;
  client_identifier: string | null;
  outcome: IamLoginAttemptOutcome;
  summary: string;
  occurred_at: string;
}

export interface StoredIamUserLockoutState {
  realm_id: string;
  user_id: string;
  failed_attempt_count: number;
  last_failed_at: string | null;
  lockout_until: string | null;
  locked_at: string | null;
}

interface IamAuthenticationRuntimeState {
  account_security_states: StoredIamAccountSecurityState[];
  mfa_states: StoredIamMfaState[];
  pending_mfa_enrollments: StoredPendingIamMfaEnrollment[];
  account_sessions: StoredIamAccountSession[];
  consent_records: StoredIamConsentRecord[];
  login_transactions: StoredIamLoginTransaction[];
  password_reset_tickets: StoredIamPasswordResetTicket[];
  email_verification_tickets: StoredIamEmailVerificationTicket[];
  login_attempts: StoredIamLoginAttempt[];
  user_lockout_states: StoredIamUserLockoutState[];
}

interface IamAuthenticationDirectoryState {
  mfa_states: StoredIamMfaState[];
  consent_records: StoredIamConsentRecord[];
}

interface IamAuthenticationActivityState {
  account_security_states: StoredIamAccountSecurityState[];
  login_attempts: StoredIamLoginAttempt[];
  user_lockout_states: StoredIamUserLockoutState[];
}

interface IamAuthenticationTransientState {
  pending_mfa_enrollments: StoredPendingIamMfaEnrollment[];
  account_sessions: StoredIamAccountSession[];
  login_transactions: StoredIamLoginTransaction[];
  password_reset_tickets: StoredIamPasswordResetTicket[];
  email_verification_tickets: StoredIamEmailVerificationTicket[];
}

export interface IamPublicRealmCatalogClient {
  id: string;
  client_id: string;
  name: string;
  protocol: IamClientProtocol;
  base_url: string | null;
  root_url: string | null;
}

export interface IamPublicRealmCatalogRealm {
  id: string;
  name: string;
  summary: string;
  supported_protocols: Array<'OIDC' | 'OAUTH2' | 'SAML'>;
  clients: IamPublicRealmCatalogClient[];
}

export interface IamPublicRealmCatalogResponse {
  generated_at: string;
  realms: IamPublicRealmCatalogRealm[];
  count: number;
}

export interface IamAuthenticationSummary {
  browser_session_count: number;
  active_browser_session_count: number;
  consent_record_count: number;
  active_consent_record_count: number;
  login_transaction_count: number;
  active_login_transaction_count: number;
  mfa_enrollment_count: number;
  active_mfa_enrollment_count: number;
  password_reset_ticket_count: number;
  email_verification_ticket_count: number;
  failed_login_attempt_count: number;
  active_lockout_count: number;
}

export interface IamAuthenticationTransientStateMaintenanceResult {
  expired_session_count: number;
  expired_login_transaction_count: number;
  expired_password_reset_ticket_count: number;
  expired_email_verification_ticket_count: number;
  expired_pending_mfa_enrollment_count: number;
  total_mutated_count: number;
}

export interface IamLoginFlowUser {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface IamLoginFlowClient {
  id: string;
  client_id: string;
  name: string;
  protocol: IamClientProtocol;
}

export interface IamLoginResponse {
  realm_id: string;
  next_step: IamLoginNextStep;
  login_transaction_id: string | null;
  session_id: string | null;
  user: IamLoginFlowUser;
  client: IamLoginFlowClient | null;
  pending_required_actions: string[];
  pending_scope_consent: string[];
  pending_mfa: boolean;
  post_login_destination: string;
}

export interface RequestIamLoginInput {
  username: string;
  password: string;
  client_id?: string | null;
  scope?: string[] | null;
}

export interface RequestResolvedIamLoginInput {
  client_id?: string | null;
  scope?: string[] | null;
  skip_mfa?: boolean;
  strong_auth?: boolean;
  assurance_level?: IamAccountAssuranceLevel;
  credential_authenticator?: Extract<IamAuthenticatorKind, 'USERNAME_PASSWORD' | 'PASSKEY_WEBAUTHN'>;
  federated_login_context?: IamFederatedLoginContextInput | null;
}

export interface CompleteIamRequiredActionsInput {
  login_transaction_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  new_password?: string;
}

export interface CompleteIamConsentInput {
  login_transaction_id: string;
  approve: boolean;
}

export interface CompleteIamMfaInput {
  login_transaction_id: string;
  code: string;
}

export interface IamPasswordResetTicketResponse {
  ticket_id: string;
  realm_id: string;
  user_id: string;
  delivery_mode: 'LOCAL_VALIDATION_PREVIEW' | 'OUT_OF_BAND';
  code_preview: string | null;
  expires_at: string;
}

export interface RequestIamPasswordResetInput {
  username_or_email: string;
}

export interface ConfirmIamPasswordResetInput {
  ticket_id: string;
  code: string;
  new_password: string;
}

export interface IamEmailVerificationTicketResponse {
  ticket_id: string;
  realm_id: string;
  user_id: string;
  delivery_mode: 'LOCAL_VALIDATION_PREVIEW' | 'OUT_OF_BAND';
  code_preview: string | null;
  expires_at: string;
}

export interface RequestIamEmailVerificationInput {
  username_or_email: string;
}

export interface ConfirmIamEmailVerificationInput {
  ticket_id: string;
  code: string;
}

export interface IamAccountSessionSummary {
  session_id: string;
  realm_id: string;
  user_id: string;
  client_id: string | null;
  client_identifier: string | null;
  client_name: string | null;
  client_protocol: IamClientProtocol | null;
  scope_names: string[];
  assurance_level: IamAccountAssuranceLevel;
  authenticated_at: string;
  issued_at: string;
  last_seen_at: string;
  expires_at: string;
  status: IamSessionStatus;
  is_current: boolean;
}

export interface IamAccountSessionContextResponse {
  realm_id: string;
  session: IamAccountSessionSummary;
  user: IamLoginFlowUser;
  email_verified_at: string | null;
  pending_required_actions: string[];
  mfa_enabled: boolean;
}

export interface IamAccountProfileResponse {
  realm_id: string;
  user: IamLoginFlowUser;
  email_verified_at: string | null;
  pending_required_actions: string[];
  profile_schema: IamUserProfileSchemaRecord;
  profile_attributes: Record<string, IamUserProfileAttributeValue>;
}

export interface UpdateIamAccountProfileInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  attributes?: Record<string, IamUserProfileAttributeValue>;
}

export interface IamAccountSecurityResponse {
  realm_id: string;
  user_id: string;
  email_verified_at: string | null;
  pending_required_actions: string[];
  mfa_enabled: boolean;
  passkey_count: number;
  passwordless_ready: boolean;
  totp_reference_id: string | null;
  backup_codes_reference_id: string | null;
  last_login_at: string | null;
  last_password_updated_at: string | null;
  last_mfa_authenticated_at: string | null;
  last_passkey_authenticated_at: string | null;
  failed_login_attempt_count: number;
  last_failed_login_at: string | null;
  lockout_until: string | null;
}

export interface ChangeIamAccountPasswordInput {
  current_password: string;
  new_password: string;
}

export interface BeginIamMfaEnrollmentResponse {
  enrollment_id: string;
  realm_id: string;
  user_id: string;
  otpauth_uri: string;
  shared_secret: string;
  backup_codes: string[];
  expires_at: string;
}

export interface VerifyIamMfaEnrollmentInput {
  enrollment_id: string;
  code: string;
}

export interface DisableIamMfaInput {
  code: string;
}

export interface IamAccountConsentRecord {
  id: string;
  realm_id: string;
  user_id: string;
  client_id: string;
  client_identifier: string;
  client_name: string;
  scope_names: string[];
  granted_at: string;
  revoked_at: string | null;
}

export interface IamAccountConsentsResponse {
  generated_at: string;
  consents: IamAccountConsentRecord[];
  count: number;
}

export type IamAccountDelegatedParty = 'PRINCIPAL' | 'DELEGATE';

export interface IamAccountDelegatedRelationshipRecord extends IamDelegatedRelationshipRecord {
  current_party: IamAccountDelegatedParty;
  counterpart_user: IamLoginFlowUser;
  can_manage_consents: boolean;
}

export interface IamAccountDelegatedRelationshipsResponse {
  generated_at: string;
  delegated_relationships: IamAccountDelegatedRelationshipRecord[];
  count: number;
}

export interface IamAccountDelegatedConsentRecord extends IamDelegatedConsentRecord {
  current_party: IamAccountDelegatedParty;
  counterpart_user: IamLoginFlowUser;
  can_manage: boolean;
  relationship_kind: IamDelegatedRelationshipRecord['relationship_kind'];
  relationship_status: IamDelegatedRelationshipStatus;
}

export interface IamAccountDelegatedConsentsResponse {
  generated_at: string;
  delegated_consents: IamAccountDelegatedConsentRecord[];
  count: number;
}

export interface CreateIamAccountDelegatedConsentInput {
  relationship_id: string;
  scope_names: string[];
  purpose_names?: string[];
  expires_at?: string | null;
  notes?: string[];
}

export interface RevokeIamAccountDelegatedConsentInput {
  notes?: string[];
}

export interface IamAccountDelegatedConsentRequestRecord extends IamDelegatedConsentRequestRecord {
  current_party: IamAccountDelegatedParty;
  counterpart_user: IamLoginFlowUser;
  can_approve: boolean;
  can_deny: boolean;
  can_cancel: boolean;
  relationship_kind: IamDelegatedRelationshipRecord['relationship_kind'];
  relationship_status: IamDelegatedRelationshipStatus;
}

export interface IamAccountDelegatedConsentRequestsResponse {
  generated_at: string;
  delegated_consent_requests: IamAccountDelegatedConsentRequestRecord[];
  count: number;
}

export interface CreateIamAccountDelegatedConsentRequestInput {
  relationship_id: string;
  requested_scope_names: string[];
  requested_purpose_names?: string[];
  expires_at?: string | null;
  request_notes?: string[];
}

export interface ApproveIamAccountDelegatedConsentRequestInput {
  expires_at?: string | null;
  decision_notes?: string[];
  consent_notes?: string[];
}

export interface DenyIamAccountDelegatedConsentRequestInput {
  decision_notes?: string[];
}

export interface CancelIamAccountDelegatedConsentRequestInput {
  decision_notes?: string[];
}

export interface IamAccountDelegatedConsentDecisionResponse {
  request: IamAccountDelegatedConsentRequestRecord;
  delegated_consent: IamAccountDelegatedConsentRecord | null;
}

export interface IamUserLoginHistoryRecord {
  id: string;
  realm_id: string;
  user_id: string | null;
  username_or_email: string;
  client_identifier: string | null;
  outcome: IamLoginAttemptOutcome;
  summary: string;
  occurred_at: string;
}

export interface IamUserLoginHistoryResponse {
  generated_at: string;
  realm_id: string;
  user_id: string;
  login_attempts: IamUserLoginHistoryRecord[];
  count: number;
}

export interface IamUserSecuritySummaryResponse {
  generated_at: string;
  realm_id: string;
  user: IamLoginFlowUser;
  status: IamUserRecord['status'];
  mfa_enabled: boolean;
  passkey_count: number;
  passwordless_ready: boolean;
  email_verified_at: string | null;
  last_login_at: string | null;
  last_password_updated_at: string | null;
  last_mfa_authenticated_at: string | null;
  last_passkey_authenticated_at: string | null;
  failed_login_attempt_count: number;
  last_failed_login_at: string | null;
  lockout_until: string | null;
  active_session_count: number;
  active_token_count: number;
}

export interface AdminResetIamUserPasswordInput {
  new_password?: string;
  force_update_on_login?: boolean;
  revoke_existing_sessions?: boolean;
  clear_lockout?: boolean;
}

export interface IamAdminPasswordResetResponse {
  realm_id: string;
  user_id: string;
  password_updated_at: string;
  issued_temporary_password: string | null;
  requires_update_password: boolean;
  revoked_session_count: number;
  revoked_token_count: number;
  lockout_cleared: boolean;
}

export interface IamAdminRevokeUserSessionsResponse {
  realm_id: string;
  user_id: string;
  revoked_session_count: number;
  revoked_token_count: number;
  revoked_at: string | null;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

function accountSecurityStateCacheKey(realmId: string, userId: string): string {
  return `${realmId}:${userId}`;
}

function userLockoutStateCacheKey(realmId: string, userId: string): string {
  return `${realmId}:${userId}`;
}

const logLoginTimings = (process.env.IDP_LOG_LOGIN_TIMINGS ?? '').trim().toLowerCase() === 'true';

function durationMs(start: bigint): number {
  return Number((process.hrtime.bigint() - start) / BigInt(1_000_000));
}

function emitLoginTiming(label: string, details: Record<string, unknown>): void {
  if (!logLoginTimings) {
    return;
  }
  console.log(`[idp-login-timing] ${JSON.stringify({ label, ...details })}`);
}

const DEFERRED_PERSISTENCE_RETRIES = 8;
const DEFERRED_PERSISTENCE_RETRY_BACKOFF_MS = 20;

function isDeferredPersistenceConflict(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Refusing to overwrite newer persisted state')
    || message.includes('Conditional write failed for dynamodb://');
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function hashCode(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function hashSessionProof(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function isSessionProofRequired(): boolean {
  const configured = readCompatibilityBooleanEnv(LEGACY_COMPAT_ENV.iamRequireSessionProof);
  if (configured !== undefined) {
    return configured;
  }
  return process.env.NODE_ENV === 'production';
}

function parseSessionToken(rawValue: string): { session_id: string; session_proof: string | null } {
  const value = rawValue.trim();
  const delimiterIndex = value.indexOf(SESSION_PROOF_DELIMITER);
  if (delimiterIndex <= 0) {
    return {
      session_id: value,
      session_proof: null,
    };
  }
  return {
    session_id: value.slice(0, delimiterIndex),
    session_proof: value.slice(delimiterIndex + 1) || null,
  };
}

function buildSessionToken(sessionId: string, sessionProof: string): string {
  return `${sessionId}${SESSION_PROOF_DELIMITER}${sessionProof}`;
}

function isLocalValidationPreviewEnabled(): boolean {
  const configured = readCompatibilityBooleanEnv(LEGACY_COMPAT_ENV.iamEnableRecoveryCodePreview);
  if (configured !== undefined) {
    return configured;
  }
  return process.env.NODE_ENV !== 'production';
}

function normalizeCode(value: string): string {
  return value.trim().replace(/[^a-z0-9]/gi, '').toUpperCase();
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

function base32Decode(value: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const normalized = value.trim().replace(/=+$/g, '').toUpperCase();
  let bits = 0;
  let current = 0;
  const bytes: number[] = [];

  for (const character of normalized) {
    const index = alphabet.indexOf(character);
    if (index === -1) {
      continue;
    }
    current = (current << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((current >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function generateTotpSecret(): string {
  return base32Encode(randomBytes(12));
}

function generateBackupCodes(count: number = 8): string[] {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(4).toString('hex').slice(0, 8).toUpperCase();
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
  });
}

function generateNumericCode(length: number = 6): string {
  const upperBound = 10 ** length;
  const numeric = randomBytes(4).readUInt32BE(0) % upperBound;
  return String(numeric).padStart(length, '0');
}

function generateTotpCode(secret: string, timestampMs: number): string {
  const counter = Math.floor(timestampMs / 30000);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter), 0);
  const digest = createHmac('sha1', base32Decode(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, '0');
}

function verifyTotpCode(secret: string, code: string): boolean {
  const normalized = normalizeCode(code);
  const now = Date.now();
  return [-1, 0, 1].some((windowOffset) => generateTotpCode(secret, now + windowOffset * 30000) === normalized);
}

function normalizeState(input: Partial<IamAuthenticationRuntimeState>): IamAuthenticationRuntimeState {
  return {
    account_security_states: Array.isArray(input.account_security_states)
      ? input.account_security_states.map((record) => ({
        ...record,
        last_passkey_authenticated_at: record.last_passkey_authenticated_at ?? null,
      }))
      : [],
    mfa_states: Array.isArray(input.mfa_states) ? input.mfa_states : [],
    pending_mfa_enrollments: Array.isArray(input.pending_mfa_enrollments) ? input.pending_mfa_enrollments : [],
    account_sessions: Array.isArray(input.account_sessions)
      ? input.account_sessions.map((record) => ({
        ...record,
        session_proof_hash:
          typeof record.session_proof_hash === 'string' && record.session_proof_hash.trim().length > 0
            ? record.session_proof_hash
            : null,
      }))
      : [],
    consent_records: Array.isArray(input.consent_records) ? input.consent_records : [],
    login_transactions: Array.isArray(input.login_transactions) ? input.login_transactions : [],
    password_reset_tickets: Array.isArray(input.password_reset_tickets) ? input.password_reset_tickets : [],
    email_verification_tickets: Array.isArray(input.email_verification_tickets) ? input.email_verification_tickets : [],
    login_attempts: Array.isArray(input.login_attempts) ? input.login_attempts : [],
    user_lockout_states: Array.isArray(input.user_lockout_states) ? input.user_lockout_states : [],
  };
}

function createEmptyState(): IamAuthenticationRuntimeState {
  return normalizeState({});
}

function splitDirectoryState(state: IamAuthenticationRuntimeState): IamAuthenticationDirectoryState {
  return {
    mfa_states: clone(state.mfa_states),
    consent_records: clone(state.consent_records),
  };
}

function splitActivityState(state: IamAuthenticationRuntimeState): IamAuthenticationActivityState {
  return {
    account_security_states: clone(state.account_security_states),
    login_attempts: clone(state.login_attempts),
    user_lockout_states: clone(state.user_lockout_states),
  };
}

function splitTransientState(state: IamAuthenticationRuntimeState): IamAuthenticationTransientState {
  return {
    pending_mfa_enrollments: clone(state.pending_mfa_enrollments),
    account_sessions: clone(state.account_sessions),
    login_transactions: clone(state.login_transactions),
    password_reset_tickets: clone(state.password_reset_tickets),
    email_verification_tickets: clone(state.email_verification_tickets),
  };
}

function combineState(
  directoryState: IamAuthenticationDirectoryState,
  activityState: IamAuthenticationActivityState,
  transientState: IamAuthenticationTransientState,
): IamAuthenticationRuntimeState {
  return normalizeState({
    ...directoryState,
    ...activityState,
    ...transientState,
  });
}

function normalizeDirectoryState(input: Partial<IamAuthenticationDirectoryState>): IamAuthenticationDirectoryState {
  return splitDirectoryState(normalizeState(input as Partial<IamAuthenticationRuntimeState>));
}

function normalizeActivityState(input: Partial<IamAuthenticationActivityState>): IamAuthenticationActivityState {
  return splitActivityState(normalizeState(input as Partial<IamAuthenticationRuntimeState>));
}

function normalizeTransientState(input: Partial<IamAuthenticationTransientState>): IamAuthenticationTransientState {
  return splitTransientState(normalizeState(input as Partial<IamAuthenticationRuntimeState>));
}

function readLegacyAuthenticationStateSnapshot(): IamAuthenticationRuntimeState {
  return normalizeState(
    readPersistedStateSnapshot<Partial<IamAuthenticationRuntimeState>>(LEGACY_IAM_AUTHENTICATION_RUNTIME_FILE) ?? {},
  );
}

function shouldSeedAuthenticationFromLegacy(): boolean {
  return !existsSync(getPersistedStatePath(IAM_AUTHENTICATION_DIRECTORY_FILE))
    || !existsSync(getPersistedStatePath(IAM_AUTHENTICATION_ACTIVITY_FILE))
    || !existsSync(getPersistedStatePath(IAM_AUTHENTICATION_TRANSIENT_FILE));
}

function getAuthenticationSeedState(): IamAuthenticationRuntimeState {
  return shouldSeedAuthenticationFromLegacy() ? readLegacyAuthenticationStateSnapshot() : createEmptyState();
}

function authenticationDirectorySeedFactory(): IamAuthenticationDirectoryState {
  return splitDirectoryState(getAuthenticationSeedState());
}

function authenticationActivitySeedFactory(): IamAuthenticationActivityState {
  return splitActivityState(getAuthenticationSeedState());
}

function authenticationTransientSeedFactory(): IamAuthenticationTransientState {
  return splitTransientState(getAuthenticationSeedState());
}

interface IamAuthenticationRuntimeStateRepository extends IamStateRepository<IamAuthenticationRuntimeState> {}
interface IamAuthenticationAsyncRuntimeStateRepository extends IamAsyncStateRepository<IamAuthenticationRuntimeState> {}
interface IamAuthenticationDirectoryRepository extends IamStateRepository<IamAuthenticationDirectoryState> {}
interface IamAsyncAuthenticationDirectoryRepository extends IamAsyncStateRepository<IamAuthenticationDirectoryState> {}
interface IamAuthenticationActivityRepository extends IamStateRepository<IamAuthenticationActivityState> {}
interface IamAsyncAuthenticationActivityRepository extends IamAsyncStateRepository<IamAuthenticationActivityState> {}
interface IamAuthenticationTransientRepository extends IamStateRepository<IamAuthenticationTransientState> {}
interface IamAsyncAuthenticationTransientRepository extends IamAsyncStateRepository<IamAuthenticationTransientState> {}
interface IamAccountSessionRepository extends IamStateRepository<StoredIamAccountSession[]> {}
interface IamAsyncAccountSessionRepository extends IamAsyncStateRepository<StoredIamAccountSession[]> {}
interface IamConsentRecordRepository extends IamStateRepository<StoredIamConsentRecord[]> {}
interface IamLoginTransactionRepository extends IamStateRepository<StoredIamLoginTransaction[]> {}
interface IamAsyncLoginTransactionRepository extends IamAsyncStateRepository<StoredIamLoginTransaction[]> {}
interface IamAccountSecurityStateRepository extends IamStateRepository<StoredIamAccountSecurityState[]> {}
interface IamMfaStateRepository extends IamStateRepository<StoredIamMfaState[]> {}
interface IamLoginAttemptRepository extends IamStateRepository<StoredIamLoginAttempt[]> {}
interface IamUserLockoutStateRepository extends IamStateRepository<StoredIamUserLockoutState[]> {}
interface IamPendingMfaEnrollmentRepository extends IamStateRepository<StoredPendingIamMfaEnrollment[]> {}
interface IamPasswordResetTicketRepository extends IamStateRepository<StoredIamPasswordResetTicket[]> {}
interface IamEmailVerificationTicketRepository extends IamStateRepository<StoredIamEmailVerificationTicket[]> {}
type IamRuntimeRepositoryAdapterStatus = 'LEGACY_ONLY' | 'DYNAMO_V2_ACTIVE' | 'NOOP_FALLBACK';

interface IamAuthenticationRuntimeRepositoryStatus {
  mode: {
    dual_write: boolean;
    read_v2: boolean;
    parity_sample_rate: number;
  };
  sessions: IamRuntimeRepositoryAdapterStatus;
  tickets: IamRuntimeRepositoryAdapterStatus;
  login_transactions: IamRuntimeRepositoryAdapterStatus;
}

const authenticationDirectoryRepository: IamAuthenticationDirectoryRepository = createPersistedIamStateRepository<
  Partial<IamAuthenticationDirectoryState>,
  IamAuthenticationDirectoryState
>({
  fileName: IAM_AUTHENTICATION_DIRECTORY_FILE,
  seedFactory: authenticationDirectorySeedFactory,
  normalize: normalizeDirectoryState,
});

const authenticationDirectoryAsyncRepository: IamAsyncAuthenticationDirectoryRepository = createPersistedAsyncIamStateRepository<
  Partial<IamAuthenticationDirectoryState>,
  IamAuthenticationDirectoryState
>({
  fileName: IAM_AUTHENTICATION_DIRECTORY_FILE,
  seedFactory: authenticationDirectorySeedFactory,
  normalize: normalizeDirectoryState,
});

const authenticationTransientRepository: IamAuthenticationTransientRepository = createPersistedIamStateRepository<
  Partial<IamAuthenticationTransientState>,
  IamAuthenticationTransientState
>({
  fileName: IAM_AUTHENTICATION_TRANSIENT_FILE,
  seedFactory: authenticationTransientSeedFactory,
  normalize: normalizeTransientState,
});

const authenticationActivityRepository: IamAuthenticationActivityRepository = createPersistedIamStateRepository<
  Partial<IamAuthenticationActivityState>,
  IamAuthenticationActivityState
>({
  fileName: IAM_AUTHENTICATION_ACTIVITY_FILE,
  seedFactory: authenticationActivitySeedFactory,
  normalize: normalizeActivityState,
});

const authenticationActivityAsyncRepository: IamAsyncAuthenticationActivityRepository = createPersistedAsyncIamStateRepository<
  Partial<IamAuthenticationActivityState>,
  IamAuthenticationActivityState
>({
  fileName: IAM_AUTHENTICATION_ACTIVITY_FILE,
  seedFactory: authenticationActivitySeedFactory,
  normalize: normalizeActivityState,
});

const authenticationTransientAsyncRepository: IamAsyncAuthenticationTransientRepository = createPersistedAsyncIamStateRepository<
  Partial<IamAuthenticationTransientState>,
  IamAuthenticationTransientState
>({
  fileName: IAM_AUTHENTICATION_TRANSIENT_FILE,
  seedFactory: authenticationTransientSeedFactory,
  normalize: normalizeTransientState,
});

function loadStateSync(): IamAuthenticationRuntimeState {
  const directoryState = authenticationDirectoryRepository.load();
  const activityState = authenticationActivityRepository.load();
  const transientState = authenticationTransientRepository.load();
  return combineState(directoryState, activityState, transientState);
}

async function loadStateAsync(): Promise<IamAuthenticationRuntimeState> {
  const [directoryState, activityState, transientState] = await Promise.all([
    reloadOrCreatePersistedStateAsync<Partial<IamAuthenticationDirectoryState>>(
      IAM_AUTHENTICATION_DIRECTORY_FILE,
      authenticationDirectorySeedFactory,
    ),
    reloadOrCreatePersistedStateAsync<Partial<IamAuthenticationActivityState>>(
      IAM_AUTHENTICATION_ACTIVITY_FILE,
      authenticationActivitySeedFactory,
    ),
    reloadOrCreatePersistedStateAsync<Partial<IamAuthenticationTransientState>>(
      IAM_AUTHENTICATION_TRANSIENT_FILE,
      authenticationTransientSeedFactory,
    ),
  ]);
  return combineState(
    normalizeDirectoryState(directoryState),
    normalizeActivityState(activityState),
    normalizeTransientState(transientState),
  );
}

function persistStateSnapshotSync(nextState: IamAuthenticationRuntimeState): void {
  authenticationDirectoryRepository.save(splitDirectoryState(nextState));
  authenticationActivityRepository.save(splitActivityState(nextState));
  authenticationTransientRepository.save(splitTransientState(nextState));
}

async function persistStateSnapshotAsync(
  nextState: IamAuthenticationRuntimeState,
  context?: DeferredPersistenceContextState,
): Promise<void> {
  const saveAll = !context || context.dirty_all;
  const writes: Promise<void>[] = [];

  if (saveAll || context.dirty_directory) {
    writes.push(authenticationDirectoryAsyncRepository.save(splitDirectoryState(nextState)));
  }
  if (saveAll || context.dirty_activity) {
    writes.push(authenticationActivityAsyncRepository.save(splitActivityState(nextState)));
  }
  if (saveAll || context.dirty_transient) {
    writes.push(authenticationTransientAsyncRepository.save(splitTransientState(nextState)));
  }

  await Promise.all(writes);
}

const state = loadStateSync();
const authenticationRuntimeStateRepository: IamAuthenticationRuntimeStateRepository = {
  load(): IamAuthenticationRuntimeState {
    return state;
  },
  save(nextState: IamAuthenticationRuntimeState): void {
    syncInMemoryState(nextState);
    const context = deferredPersistenceContext.getStore();
    if (context) {
      markAllSlicesDirty();
      return;
    }
    persistStateSnapshotSync(state);
  },
};
const authenticationAsyncRuntimeStateRepository: IamAuthenticationAsyncRuntimeStateRepository = {
  async load(): Promise<IamAuthenticationRuntimeState> {
    return loadStateAsync();
  },
  async save(nextState: IamAuthenticationRuntimeState): Promise<void> {
    syncInMemoryState(nextState);
    await persistStateSnapshotAsync(state);
  },
};
const accountSessionRepository: IamAccountSessionRepository = createProjectedIamStateRepository({
  parentRepository: authenticationRuntimeStateRepository,
  select: (runtimeState) => runtimeState.account_sessions,
  assign: (runtimeState, nextState) => {
    runtimeState.account_sessions = nextState;
  },
});
const accountSessionAsyncRepository: IamAsyncAccountSessionRepository = createProjectedAsyncIamStateRepository({
  parentRepository: authenticationAsyncRuntimeStateRepository,
  select: (runtimeState) => runtimeState.account_sessions,
  assign: (runtimeState, nextState) => {
    runtimeState.account_sessions = nextState;
  },
});
const consentRecordRepository: IamConsentRecordRepository = createProjectedIamStateRepository({
  parentRepository: authenticationRuntimeStateRepository,
  select: (runtimeState) => runtimeState.consent_records,
  assign: (runtimeState, nextState) => {
    runtimeState.consent_records = nextState;
  },
});
const loginTransactionRepository: IamLoginTransactionRepository = createProjectedIamStateRepository({
  parentRepository: authenticationRuntimeStateRepository,
  select: (runtimeState) => runtimeState.login_transactions,
  assign: (runtimeState, nextState) => {
    runtimeState.login_transactions = nextState;
  },
});
const loginTransactionAsyncRepository: IamAsyncLoginTransactionRepository = createProjectedAsyncIamStateRepository({
  parentRepository: authenticationAsyncRuntimeStateRepository,
  select: (runtimeState) => runtimeState.login_transactions,
  assign: (runtimeState, nextState) => {
    runtimeState.login_transactions = nextState;
  },
});
const accountSecurityStateRepository: IamAccountSecurityStateRepository = createProjectedIamStateRepository({
  parentRepository: authenticationRuntimeStateRepository,
  select: (runtimeState) => runtimeState.account_security_states,
  assign: (runtimeState, nextState) => {
    runtimeState.account_security_states = nextState;
  },
});
const mfaStateRepository: IamMfaStateRepository = createProjectedIamStateRepository({
  parentRepository: authenticationRuntimeStateRepository,
  select: (runtimeState) => runtimeState.mfa_states,
  assign: (runtimeState, nextState) => {
    runtimeState.mfa_states = nextState;
  },
});
const loginAttemptRepository: IamLoginAttemptRepository = createProjectedIamStateRepository({
  parentRepository: authenticationRuntimeStateRepository,
  select: (runtimeState) => runtimeState.login_attempts,
  assign: (runtimeState, nextState) => {
    runtimeState.login_attempts = nextState;
  },
});
const userLockoutStateRepository: IamUserLockoutStateRepository = createProjectedIamStateRepository({
  parentRepository: authenticationRuntimeStateRepository,
  select: (runtimeState) => runtimeState.user_lockout_states,
  assign: (runtimeState, nextState) => {
    runtimeState.user_lockout_states = nextState;
  },
});
const pendingMfaEnrollmentRepository: IamPendingMfaEnrollmentRepository = createProjectedIamStateRepository({
  parentRepository: authenticationRuntimeStateRepository,
  select: (runtimeState) => runtimeState.pending_mfa_enrollments,
  assign: (runtimeState, nextState) => {
    runtimeState.pending_mfa_enrollments = nextState;
  },
});
const passwordResetTicketRepository: IamPasswordResetTicketRepository = createProjectedIamStateRepository({
  parentRepository: authenticationRuntimeStateRepository,
  select: (runtimeState) => runtimeState.password_reset_tickets,
  assign: (runtimeState, nextState) => {
    runtimeState.password_reset_tickets = nextState;
  },
});
const emailVerificationTicketRepository: IamEmailVerificationTicketRepository = createProjectedIamStateRepository({
  parentRepository: authenticationRuntimeStateRepository,
  select: (runtimeState) => runtimeState.email_verification_tickets,
  assign: (runtimeState, nextState) => {
    runtimeState.email_verification_tickets = nextState;
  },
});
const accountSessionByRealmAndId = new Map<string, StoredIamAccountSession>();
const runtimeRepositoryMode = getRuntimeRepositoryMode();
const useRuntimeRepositoryPath = runtimeRepositoryMode.dualWrite || runtimeRepositoryMode.readV2;
let sessionRuntimeRepositoryStatus: IamRuntimeRepositoryAdapterStatus = useRuntimeRepositoryPath ? 'NOOP_FALLBACK' : 'LEGACY_ONLY';
let ticketRuntimeRepositoryStatus: IamRuntimeRepositoryAdapterStatus = useRuntimeRepositoryPath ? 'NOOP_FALLBACK' : 'LEGACY_ONLY';
let loginTransactionRuntimeRepositoryStatus: IamRuntimeRepositoryAdapterStatus = useRuntimeRepositoryPath ? 'NOOP_FALLBACK' : 'LEGACY_ONLY';
const authenticationActivityRuntimeRepository = (() => {
  if (!useRuntimeRepositoryPath) {
    return null;
  }

  try {
    return new DynamoDbAuthenticationActivityRepository(createDynamoDocumentClient(), resolveRuntimeTableName());
  } catch {
    return null;
  }
})();
const sessionStore = new LegacySessionStoreAdapter({
  list: () => accountSessionRepository.load(),
  getById: (realmId: string, sessionId: string) =>
    accountSessionByRealmAndId.get(accountSessionIndexKey(realmId, sessionId)) ?? null,
  index: (session: StoredIamAccountSession) => {
    accountSessionByRealmAndId.set(accountSessionIndexKey(session.realm_id, session.id), session);
  },
});
const ticketStore = new LegacyTicketStoreAdapter({
  passwordResetTickets: () => passwordResetTicketRepository.load(),
  emailVerificationTickets: () => emailVerificationTicketRepository.load(),
  pendingMfaEnrollments: () => pendingMfaEnrollmentRepository.load(),
  savePendingMfaEnrollments: (nextState) => pendingMfaEnrollmentRepository.save(nextState),
});
const loginTransactionStore = new LegacyLoginTransactionStoreAdapter({
  list: () => loginTransactionRepository.load(),
  save: (nextState) => loginTransactionRepository.save(nextState),
});
const sessionAsyncStore = (() => {
  const legacy = new LegacyAsyncSessionStoreAdapter({
    load: async () => clone(await accountSessionAsyncRepository.load()),
    save: async (nextState) => {
      await accountSessionAsyncRepository.save(clone(nextState));
      rebuildAccountSessionIndex();
    },
  });

  if (!useRuntimeRepositoryPath) {
    sessionRuntimeRepositoryStatus = 'LEGACY_ONLY';
    return legacy;
  }

  try {
    const v2 = new DynamoAsyncSessionStoreAdapter(
      new DynamoDbSessionRepository(createDynamoDocumentClient(), resolveRuntimeTableName()),
    );
    sessionRuntimeRepositoryStatus = 'DYNAMO_V2_ACTIVE';
    return new DualRunAsyncSessionStoreAdapter(legacy, v2, runtimeRepositoryMode);
  } catch {
    sessionRuntimeRepositoryStatus = 'NOOP_FALLBACK';
    return new DualRunAsyncSessionStoreAdapter(legacy, new NoopAsyncSessionStoreAdapter(), runtimeRepositoryMode);
  }
})();
const ticketAsyncStore = (() => {
  const legacy = new LegacyAsyncTicketStoreAdapter({
    loadPasswordResetTickets: async () => clone(await passwordResetTicketRepository.load()),
    savePasswordResetTickets: async (nextState) => passwordResetTicketRepository.save(clone(nextState)),
    loadEmailVerificationTickets: async () => clone(await emailVerificationTicketRepository.load()),
    saveEmailVerificationTickets: async (nextState) => emailVerificationTicketRepository.save(clone(nextState)),
    loadPendingMfaEnrollments: async () => clone(await pendingMfaEnrollmentRepository.load()),
    savePendingMfaEnrollments: async (nextState) => pendingMfaEnrollmentRepository.save(clone(nextState)),
  });

  if (!useRuntimeRepositoryPath) {
    ticketRuntimeRepositoryStatus = 'LEGACY_ONLY';
    return legacy;
  }

  try {
    const v2 = new DynamoAsyncTicketStoreAdapter(
      new DynamoDbTicketRepository(createDynamoDocumentClient(), resolveRuntimeTableName()),
    );
    ticketRuntimeRepositoryStatus = 'DYNAMO_V2_ACTIVE';
    return new DualRunAsyncTicketStoreAdapter(legacy, v2, runtimeRepositoryMode);
  } catch {
    ticketRuntimeRepositoryStatus = 'NOOP_FALLBACK';
    return new DualRunAsyncTicketStoreAdapter(legacy, new NoopAsyncTicketStoreAdapter(), runtimeRepositoryMode);
  }
})();
const loginTransactionAsyncStore = (() => {
  const legacy = new LegacyAsyncLoginTransactionStoreAdapter({
    load: async () => clone(await loginTransactionAsyncRepository.load()),
    save: async (nextState) => loginTransactionAsyncRepository.save(clone(nextState)),
  });

  if (!useRuntimeRepositoryPath) {
    loginTransactionRuntimeRepositoryStatus = 'LEGACY_ONLY';
    return legacy;
  }

  try {
    const v2 = new DynamoAsyncLoginTransactionStoreAdapter(
      new DynamoDbLoginTransactionRepository(createDynamoDocumentClient(), resolveRuntimeTableName()),
    );
    loginTransactionRuntimeRepositoryStatus = 'DYNAMO_V2_ACTIVE';
    return new DualRunAsyncLoginTransactionStoreAdapter(legacy, v2, runtimeRepositoryMode);
  } catch {
    loginTransactionRuntimeRepositoryStatus = 'NOOP_FALLBACK';
    return new DualRunAsyncLoginTransactionStoreAdapter(legacy, new NoopAsyncLoginTransactionStoreAdapter(), runtimeRepositoryMode);
  }
})();

function syncInMemoryState(nextState: IamAuthenticationRuntimeState): void {
  state.account_security_states = clone(nextState.account_security_states);
  state.mfa_states = clone(nextState.mfa_states);
  state.pending_mfa_enrollments = clone(nextState.pending_mfa_enrollments);
  state.account_sessions = clone(nextState.account_sessions);
  state.consent_records = clone(nextState.consent_records);
  state.login_transactions = clone(nextState.login_transactions);
  state.password_reset_tickets = clone(nextState.password_reset_tickets);
  state.email_verification_tickets = clone(nextState.email_verification_tickets);
  state.login_attempts = clone(nextState.login_attempts);
  state.user_lockout_states = clone(nextState.user_lockout_states);
  rebuildAccountSessionIndex();
}

function buildDefaultSecurityState(user: IamUserRecord): StoredIamAccountSecurityState {
  return {
    realm_id: user.realm_id,
    user_id: user.id,
    email_verified_at: user.required_actions.includes('VERIFY_EMAIL') ? null : user.created_at,
    last_login_at: null,
    last_password_updated_at: user.created_at,
    last_mfa_authenticated_at: null,
    last_passkey_authenticated_at: null,
  };
}

function buildDefaultLockoutState(realmId: string, userId: string): StoredIamUserLockoutState {
  return {
    realm_id: realmId,
    user_id: userId,
    failed_attempt_count: 0,
    last_failed_at: null,
    lockout_until: null,
    locked_at: null,
  };
}

async function getSecurityStateAsync(user: IamUserRecord): Promise<StoredIamAccountSecurityState> {
  if (!useRuntimeRepositoryPath || !authenticationActivityRuntimeRepository) {
    return getSecurityState(user);
  }
  const cacheKey = accountSecurityStateCacheKey(user.realm_id, user.id);
  const cached = accountSecurityStateCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const record = (await authenticationActivityRuntimeRepository.getAccountSecurityState(user.realm_id, user.id))
    ?? buildDefaultSecurityState(user);
  accountSecurityStateCache.set(cacheKey, record);
  return record;
}

async function saveSecurityStateAsync(record: StoredIamAccountSecurityState): Promise<void> {
  if (!useRuntimeRepositoryPath || !authenticationActivityRuntimeRepository) {
    persistActivityStateSyncOnly();
    return;
  }
  accountSecurityStateCache.set(accountSecurityStateCacheKey(record.realm_id, record.user_id), record);
  await authenticationActivityRuntimeRepository.putAccountSecurityState(record);
}

async function getLockoutStateAsync(realmId: string, userId: string): Promise<StoredIamUserLockoutState> {
  if (!useRuntimeRepositoryPath || !authenticationActivityRuntimeRepository) {
    return getLockoutState(realmId, userId);
  }

  const cacheKey = userLockoutStateCacheKey(realmId, userId);
  const cached = userLockoutStateCache.get(cacheKey);
  if (cached) {
    if (cached.lockout_until && Date.parse(cached.lockout_until) <= Date.now()) {
      cached.failed_attempt_count = 0;
      cached.last_failed_at = null;
      cached.lockout_until = null;
      cached.locked_at = null;
      await authenticationActivityRuntimeRepository.putUserLockoutState(cached);
    }
    return cached;
  }

  const record = (await authenticationActivityRuntimeRepository.getUserLockoutState(realmId, userId))
    ?? buildDefaultLockoutState(realmId, userId);
  if (record.lockout_until && Date.parse(record.lockout_until) <= Date.now()) {
    record.failed_attempt_count = 0;
    record.last_failed_at = null;
    record.lockout_until = null;
    record.locked_at = null;
    await authenticationActivityRuntimeRepository.putUserLockoutState(record);
  }
  userLockoutStateCache.set(cacheKey, record);
  return record;
}

async function saveLockoutStateAsync(record: StoredIamUserLockoutState): Promise<void> {
  if (!useRuntimeRepositoryPath || !authenticationActivityRuntimeRepository) {
    persistActivityStateSyncOnly();
    return;
  }
  userLockoutStateCache.set(userLockoutStateCacheKey(record.realm_id, record.user_id), record);
  await authenticationActivityRuntimeRepository.putUserLockoutState(record);
}

async function recordLoginAttemptAsync(input: {
  realmId: string;
  userId: string | null;
  usernameOrEmail: string;
  clientIdentifier: string | null;
  outcome: IamLoginAttemptOutcome;
  summary: string;
}): Promise<StoredIamLoginAttempt> {
  if (!useRuntimeRepositoryPath || !authenticationActivityRuntimeRepository) {
    return recordLoginAttempt(input);
  }

  const record: StoredIamLoginAttempt = {
    id: `iam-login-attempt-${randomUUID()}`,
    realm_id: input.realmId,
    user_id: input.userId,
    username_or_email: input.usernameOrEmail.trim(),
    client_identifier: input.clientIdentifier,
    outcome: input.outcome,
    summary: input.summary,
    occurred_at: nowIso(),
  };
  await authenticationActivityRuntimeRepository.putLoginAttempt(record);
  return record;
}

async function clearUserLockoutStateAsync(realmId: string, userId: string): Promise<{ cleared: boolean }> {
  if (!useRuntimeRepositoryPath || !authenticationActivityRuntimeRepository) {
    return clearUserLockoutState(realmId, userId);
  }

  const lockout = await getLockoutStateAsync(realmId, userId);
  const hadState = Boolean(lockout.failed_attempt_count || lockout.last_failed_at || lockout.lockout_until || lockout.locked_at);
  if (!hadState) {
    return { cleared: false };
  }
  lockout.failed_attempt_count = 0;
  lockout.last_failed_at = null;
  lockout.lockout_until = null;
  lockout.locked_at = null;
  await saveLockoutStateAsync(lockout);
  return { cleared: hadState };
}

async function registerFailedLoginAsync(user: IamUserRecord): Promise<StoredIamUserLockoutState> {
  if (!useRuntimeRepositoryPath || !authenticationActivityRuntimeRepository) {
    return registerFailedLogin(user);
  }

  const lockout = await getLockoutStateAsync(user.realm_id, user.id);
  if (!lockout.last_failed_at || (Date.now() - Date.parse(lockout.last_failed_at)) > LOGIN_FAILURE_WINDOW_MS) {
    lockout.failed_attempt_count = 0;
  }
  lockout.failed_attempt_count += 1;
  lockout.last_failed_at = nowIso();
  if (lockout.failed_attempt_count >= LOGIN_LOCKOUT_THRESHOLD) {
    lockout.locked_at = nowIso();
    lockout.lockout_until = new Date(Date.now() + LOGIN_LOCKOUT_DURATION_MS).toISOString();
  }
  await saveLockoutStateAsync(lockout);
  return lockout;
}

async function assertUserNotLockedAsync(user: IamUserRecord): Promise<void> {
  if (!useRuntimeRepositoryPath || !authenticationActivityRuntimeRepository) {
    assertUserNotLocked(user);
    return;
  }

  const lockout = await getLockoutStateAsync(user.realm_id, user.id);
  if (lockout.lockout_until && Date.parse(lockout.lockout_until) > Date.now()) {
    await recordLoginAttemptAsync({
      realmId: user.realm_id,
      userId: user.id,
      usernameOrEmail: user.username,
      clientIdentifier: null,
      outcome: 'LOCKED',
      summary: `Blocked login while account lockout is active until ${lockout.lockout_until}.`,
    });
    throw new Error(`Account is temporarily locked until ${lockout.lockout_until}`);
  }
}

async function getOutstandingRequiredActionsAsync(user: IamUserRecord): Promise<string[]> {
  const security = await getSecurityStateAsync(user);
  return user.required_actions.filter((action) => {
    if (action === 'VERIFY_EMAIL') {
      return !security.email_verified_at;
    }
    return true;
  });
}

function accountSessionIndexKey(realmId: string, sessionId: string): string {
  return `${realmId}:${sessionId}`;
}

function rebuildAccountSessionIndex(): void {
  accountSessionByRealmAndId.clear();
  for (const session of accountSessionRepository.load()) {
    accountSessionByRealmAndId.set(accountSessionIndexKey(session.realm_id, session.id), session);
  }
}
rebuildAccountSessionIndex();

function markAllSlicesDirty(): void {
  const context = deferredPersistenceContext.getStore();
  if (!context) {
    return;
  }
  context.dirty_all = true;
  context.dirty_directory = true;
  context.dirty_activity = true;
  context.dirty_transient = true;
}

function markDirectorySliceDirty(): void {
  const context = deferredPersistenceContext.getStore();
  if (!context) {
    return;
  }
  context.dirty_directory = true;
}

function markActivitySliceDirty(): void {
  const context = deferredPersistenceContext.getStore();
  if (!context) {
    return;
  }
  context.dirty_activity = true;
}

function markTransientSliceDirty(): void {
  const context = deferredPersistenceContext.getStore();
  if (!context) {
    return;
  }
  context.dirty_transient = true;
}

function persistStateSyncOnly(): void {
  const context = deferredPersistenceContext.getStore();
  if (context) {
    markAllSlicesDirty();
    return;
  }
  authenticationRuntimeStateRepository.save(state);
}

function persistActivityStateSyncOnly(): void {
  const context = deferredPersistenceContext.getStore();
  if (context) {
    markActivitySliceDirty();
    return;
  }
  authenticationActivityRepository.save(splitActivityState(state));
}

function persistDirectoryStateSyncOnly(): void {
  const context = deferredPersistenceContext.getStore();
  if (context) {
    markDirectorySliceDirty();
    return;
  }
  authenticationDirectoryRepository.save(splitDirectoryState(state));
}

function persistTransientStateSyncOnly(): void {
  const context = deferredPersistenceContext.getStore();
  if (context) {
    markTransientSliceDirty();
    return;
  }
  authenticationTransientRepository.save(splitTransientState(state));
}

async function persistStateAsync(context?: DeferredPersistenceContextState): Promise<void> {
  await persistStateSnapshotAsync(state, context);
}

async function runWithDeferredPersistence<T>(operation: () => T | Promise<T>): Promise<T> {
  const existingContext = deferredPersistenceContext.getStore();
  if (existingContext) {
    return operation();
  }

  const run = async (): Promise<T> => {
    let lastError: unknown = null;

    for (let attempt = 0; attempt < DEFERRED_PERSISTENCE_RETRIES; attempt += 1) {
      syncInMemoryState(await loadStateAsync());

      try {
        return await deferredPersistenceContext.run({
          dirty_all: false,
          dirty_directory: false,
          dirty_activity: false,
          dirty_transient: false,
        }, async () => {
          const context = deferredPersistenceContext.getStore()!;
          try {
            const result = await operation();
            if (context.dirty_all || context.dirty_directory || context.dirty_activity || context.dirty_transient) {
              await persistStateAsync(context);
            }
            return result;
          } catch (error) {
            if (context.dirty_all || context.dirty_directory || context.dirty_activity || context.dirty_transient) {
              await persistStateAsync(context);
            }
            throw error;
          }
        });
      } catch (error) {
        lastError = error;
        if (!isDeferredPersistenceConflict(error)) {
          throw error;
        }
        await sleep(DEFERRED_PERSISTENCE_RETRY_BACKOFF_MS * (attempt + 1));
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  };

  return run();
}

function listRealmUsers(realmId: string): IamUserRecord[] {
  return LocalIamFoundationStore.listUsers({ realm_id: realmId }).users;
}

function getRealmUserById(realmId: string, userId: string): IamUserRecord {
  const user = listRealmUsers(realmId).find((candidate) => candidate.id === userId);
  if (!user) {
    throw new Error(`Unknown IAM user in realm ${realmId}: ${userId}`);
  }
  return user;
}

function findRealmUserByIdentifier(realmId: string, identifier: string): IamUserRecord | null {
  const normalized = identifier.trim().toLowerCase();
  return listRealmUsers(realmId).find((candidate) =>
    candidate.username.toLowerCase() === normalized || candidate.email.toLowerCase() === normalized,
  ) ?? null;
}

function getRealmUserByIdentifier(realmId: string, identifier: string): IamUserRecord {
  const user = findRealmUserByIdentifier(realmId, identifier);
  if (!user) {
    throw new Error('Unknown IAM user');
  }
  return user;
}

function getClientByPublicIdentifier(realmId: string, clientIdentifier: string | null | undefined): IamClientRecord | null {
  if (!clientIdentifier) {
    return null;
  }
  const client = LocalIamProtocolRuntimeStore.listClients({ realm_id: realmId }).clients.find(
    (candidate) => candidate.client_id === clientIdentifier && candidate.status === 'ACTIVE',
  );
  if (!client) {
    throw new Error(`Unknown IAM client in realm ${realmId}: ${clientIdentifier}`);
  }
  return client;
}

function getSecurityState(user: IamUserRecord): StoredIamAccountSecurityState {
  const securityStates = accountSecurityStateRepository.load();
  let record = securityStates.find((candidate) => candidate.realm_id === user.realm_id && candidate.user_id === user.id);
  if (!record) {
    record = {
      realm_id: user.realm_id,
      user_id: user.id,
      email_verified_at: user.required_actions.includes('VERIFY_EMAIL') ? null : user.created_at,
      last_login_at: null,
      last_password_updated_at: user.created_at,
      last_mfa_authenticated_at: null,
      last_passkey_authenticated_at: null,
    };
    securityStates.push(record);
    persistActivityStateSyncOnly();
  }
  return record;
}

function getLockoutState(realmId: string, userId: string): StoredIamUserLockoutState {
  const lockoutStates = userLockoutStateRepository.load();
  let record = lockoutStates.find(
    (candidate) => candidate.realm_id === realmId && candidate.user_id === userId,
  );
  if (!record) {
    record = {
      realm_id: realmId,
      user_id: userId,
      failed_attempt_count: 0,
      last_failed_at: null,
      lockout_until: null,
      locked_at: null,
    };
    lockoutStates.push(record);
    persistActivityStateSyncOnly();
  }
  if (record.lockout_until && Date.parse(record.lockout_until) <= Date.now()) {
    record.failed_attempt_count = 0;
    record.last_failed_at = null;
    record.lockout_until = null;
    record.locked_at = null;
    persistActivityStateSyncOnly();
  }
  return record;
}

function recordLoginAttempt(input: {
  realmId: string;
  userId: string | null;
  usernameOrEmail: string;
  clientIdentifier: string | null;
  outcome: IamLoginAttemptOutcome;
  summary: string;
}): StoredIamLoginAttempt {
  const record: StoredIamLoginAttempt = {
    id: `iam-login-attempt-${randomUUID()}`,
    realm_id: input.realmId,
    user_id: input.userId,
    username_or_email: input.usernameOrEmail.trim(),
    client_identifier: input.clientIdentifier,
    outcome: input.outcome,
    summary: input.summary,
    occurred_at: nowIso(),
  };
  const loginAttempts = loginAttemptRepository.load();
  loginAttempts.unshift(record);
  if (loginAttempts.length > 2500) {
    loginAttempts.length = 2500;
  }
  persistActivityStateSyncOnly();
  return record;
}

function clearUserLockoutState(realmId: string, userId: string): { cleared: boolean } {
  const lockout = getLockoutState(realmId, userId);
  const hadState = Boolean(lockout.failed_attempt_count || lockout.last_failed_at || lockout.lockout_until || lockout.locked_at);
  if (!hadState) {
    return { cleared: false };
  }
  lockout.failed_attempt_count = 0;
  lockout.last_failed_at = null;
  lockout.lockout_until = null;
  lockout.locked_at = null;
  persistActivityStateSyncOnly();
  return { cleared: hadState };
}

function registerFailedLogin(user: IamUserRecord): StoredIamUserLockoutState {
  const lockout = getLockoutState(user.realm_id, user.id);
  if (!lockout.last_failed_at || (Date.now() - Date.parse(lockout.last_failed_at)) > LOGIN_FAILURE_WINDOW_MS) {
    lockout.failed_attempt_count = 0;
  }
  lockout.failed_attempt_count += 1;
  lockout.last_failed_at = nowIso();
  if (lockout.failed_attempt_count >= LOGIN_LOCKOUT_THRESHOLD) {
    lockout.locked_at = nowIso();
    lockout.lockout_until = new Date(Date.now() + LOGIN_LOCKOUT_DURATION_MS).toISOString();
  }
  persistActivityStateSyncOnly();
  return lockout;
}

function assertUserNotLocked(user: IamUserRecord): void {
  const lockout = getLockoutState(user.realm_id, user.id);
  if (lockout.lockout_until && Date.parse(lockout.lockout_until) > Date.now()) {
    recordLoginAttempt({
      realmId: user.realm_id,
      userId: user.id,
      usernameOrEmail: user.username,
      clientIdentifier: null,
      outcome: 'LOCKED',
      summary: `Blocked login while account lockout is active until ${lockout.lockout_until}.`,
    });
    throw new Error(`Account is temporarily locked until ${lockout.lockout_until}`);
  }
}

function getMfaState(realmId: string, userId: string): StoredIamMfaState | null {
  return mfaStateRepository.load().find(
    (candidate) => candidate.realm_id === realmId && candidate.user_id === userId && !candidate.disabled_at,
  ) ?? null;
}

function getOutstandingRequiredActions(user: IamUserRecord): string[] {
  const security = getSecurityState(user);
  return user.required_actions.filter((action) => {
    if (action === 'VERIFY_EMAIL') {
      return !security.email_verified_at;
    }
    return true;
  });
}

function sessionStatus(session: StoredIamAccountSession): IamSessionStatus {
  if (session.revoked_at) {
    return 'REVOKED';
  }
  if (Date.parse(session.expires_at) <= Date.now()) {
    return 'EXPIRED';
  }
  return 'ACTIVE';
}

function summarizeUser(user: IamUserRecord): IamLoginFlowUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
  };
}

function summarizeClient(client: IamClientRecord | null): IamLoginFlowClient | null {
  if (!client) {
    return null;
  }
  return {
    id: client.id,
    client_id: client.client_id,
    name: client.name,
    protocol: client.protocol,
  };
}

function summarizeSession(session: StoredIamAccountSession, currentSessionId: string | null): IamAccountSessionSummary {
  return {
    session_id: session.id,
    realm_id: session.realm_id,
    user_id: session.user_id,
    client_id: session.client_id,
    client_identifier: session.client_identifier,
    client_name: session.client_name,
    client_protocol: session.client_protocol,
    scope_names: [...session.scope_names],
    assurance_level: session.assurance_level,
    authenticated_at: session.authenticated_at,
    issued_at: session.issued_at,
    last_seen_at: session.last_seen_at,
    expires_at: session.expires_at,
    status: sessionStatus(session),
    is_current: currentSessionId === session.id,
  };
}

function getDelegatedRelationshipForRealm(realmId: string, relationshipId: string): IamDelegatedRelationshipRecord {
  const relationship = LocalIamFoundationStore
    .listDelegatedRelationships({ realm_id: realmId })
    .delegated_relationships
    .find((candidate) => candidate.id === relationshipId);
  if (!relationship) {
    throw new Error('Unknown delegated relationship');
  }
  return relationship;
}

function getDelegatedConsentForRealm(realmId: string, consentId: string): IamDelegatedConsentRecord {
  const consent = LocalIamFoundationStore
    .listDelegatedConsents({ realm_id: realmId })
    .delegated_consents
    .find((candidate) => candidate.id === consentId);
  if (!consent) {
    throw new Error('Unknown delegated consent');
  }
  return consent;
}

function getDelegatedConsentRequestForRealm(realmId: string, requestId: string): IamDelegatedConsentRequestRecord {
  const request = LocalIamFoundationStore
    .listDelegatedConsentRequests({ realm_id: realmId })
    .delegated_consent_requests
    .find((candidate) => candidate.id === requestId);
  if (!request) {
    throw new Error('Unknown delegated consent request');
  }
  return request;
}

function summarizeAccountDelegatedRelationship(
  currentUserId: string,
  relationship: IamDelegatedRelationshipRecord,
): IamAccountDelegatedRelationshipRecord {
  const currentParty: IamAccountDelegatedParty = relationship.principal_user_id === currentUserId ? 'PRINCIPAL' : 'DELEGATE';
  const counterpartUserId = currentParty === 'PRINCIPAL' ? relationship.delegate_user_id : relationship.principal_user_id;
  const counterpartUser = getRealmUserById(relationship.realm_id, counterpartUserId);
  return {
    ...clone(relationship),
    current_party: currentParty,
    counterpart_user: summarizeUser(counterpartUser),
    can_manage_consents: currentParty === 'PRINCIPAL',
  };
}

function summarizeAccountDelegatedConsent(
  currentUserId: string,
  consent: IamDelegatedConsentRecord,
): IamAccountDelegatedConsentRecord {
  const relationship = getDelegatedRelationshipForRealm(consent.realm_id, consent.relationship_id);
  const currentParty: IamAccountDelegatedParty = consent.principal_user_id === currentUserId ? 'PRINCIPAL' : 'DELEGATE';
  const counterpartUserId = currentParty === 'PRINCIPAL' ? consent.delegate_user_id : consent.principal_user_id;
  const counterpartUser = getRealmUserById(consent.realm_id, counterpartUserId);
  return {
    ...clone(consent),
    current_party: currentParty,
    counterpart_user: summarizeUser(counterpartUser),
    can_manage: currentParty === 'PRINCIPAL',
    relationship_kind: relationship.relationship_kind,
    relationship_status: relationship.status,
  };
}

function summarizeAccountDelegatedConsentRequest(
  currentUserId: string,
  request: IamDelegatedConsentRequestRecord,
): IamAccountDelegatedConsentRequestRecord {
  const relationship = getDelegatedRelationshipForRealm(request.realm_id, request.relationship_id);
  const currentParty: IamAccountDelegatedParty = request.principal_user_id === currentUserId ? 'PRINCIPAL' : 'DELEGATE';
  const counterpartUserId = currentParty === 'PRINCIPAL' ? request.delegate_user_id : request.principal_user_id;
  const counterpartUser = getRealmUserById(request.realm_id, counterpartUserId);
  return {
    ...clone(request),
    current_party: currentParty,
    counterpart_user: summarizeUser(counterpartUser),
    can_approve: currentParty === 'PRINCIPAL' && request.status === 'PENDING',
    can_deny: currentParty === 'PRINCIPAL' && request.status === 'PENDING',
    can_cancel: currentParty === 'DELEGATE' && request.status === 'PENDING',
    relationship_kind: relationship.relationship_kind,
    relationship_status: relationship.status,
  };
}

function buildAccountProfileResponse(realmId: string, userId: string): IamAccountProfileResponse {
  const user = getRealmUserById(realmId, userId);
  const security = getSecurityState(user);
  const profile = LocalIamUserProfileStore.getUserProfile(realmId, user.id, 'SELF');
  return {
    realm_id: realmId,
    user: summarizeUser(user),
    email_verified_at: security.email_verified_at,
    pending_required_actions: getOutstandingRequiredActions(user),
    profile_schema: profile.schema,
    profile_attributes: profile.attributes,
  };
}

function buildAccountSecurityResponse(realmId: string, userId: string): IamAccountSecurityResponse {
  revokeExpiredSessions();
  const user = getRealmUserById(realmId, userId);
  const security = getSecurityState(user);
  const mfaState = getMfaState(realmId, user.id);
  const lockout = getLockoutState(realmId, user.id);
  const passkeyCount = LocalIamWebAuthnStore.getActiveCredentialCount(realmId, user.id);
  return {
    realm_id: realmId,
    user_id: user.id,
    email_verified_at: security.email_verified_at,
    pending_required_actions: getOutstandingRequiredActions(user),
    mfa_enabled: Boolean(mfaState),
    passkey_count: passkeyCount,
    passwordless_ready: passkeyCount > 0,
    totp_reference_id: mfaState?.totp_reference_id ?? null,
    backup_codes_reference_id: mfaState?.backup_codes_reference_id ?? null,
    last_login_at: security.last_login_at,
    last_password_updated_at: security.last_password_updated_at,
    last_mfa_authenticated_at: security.last_mfa_authenticated_at,
    last_passkey_authenticated_at: security.last_passkey_authenticated_at,
    failed_login_attempt_count: lockout.failed_attempt_count,
    last_failed_login_at: lockout.last_failed_at,
    lockout_until: lockout.lockout_until,
  };
}

function getPostLoginDestination(client: IamClientRecord | null): string {
  return client?.base_url || client?.root_url || '/iam/account';
}

function upsertConsent(user: IamUserRecord, client: IamClientRecord, scopeNames: string[]): StoredIamConsentRecord {
  const normalizedScopes = Array.from(new Set(scopeNames.map((scope) => scope.trim()).filter(Boolean))).sort();
  const consentRecords = consentRecordRepository.load();
  const existing = consentRecords.find(
    (candidate) =>
      candidate.realm_id === user.realm_id
      && candidate.user_id === user.id
      && candidate.client_id === client.id
      && !candidate.revoked_at,
  );
  if (existing) {
    existing.scope_names = Array.from(new Set([...existing.scope_names, ...normalizedScopes])).sort();
    existing.granted_at = nowIso();
    persistStateSyncOnly();
    return existing;
  }

  const record: StoredIamConsentRecord = {
    id: `iam-consent-${randomUUID()}`,
    realm_id: user.realm_id,
    user_id: user.id,
    client_id: client.id,
    client_identifier: client.client_id,
    client_name: client.name,
    scope_names: normalizedScopes,
    granted_at: nowIso(),
    revoked_at: null,
  };
  consentRecords.push(record);
  consentRecordRepository.save(consentRecords);
  return record;
}

function findActiveConsent(user: IamUserRecord, client: IamClientRecord): StoredIamConsentRecord | null {
  return consentRecordRepository.load().find(
    (candidate) =>
      candidate.realm_id === user.realm_id
      && candidate.user_id === user.id
      && candidate.client_id === client.id
      && !candidate.revoked_at,
  ) ?? null;
}

function determinePendingConsentScopes(user: IamUserRecord, client: IamClientRecord | null, requestedScopeNames: string[]): string[] {
  if (!client || requestedScopeNames.length === 0) {
    return [];
  }
  const existing = findActiveConsent(user, client);
  const grantedScopes = new Set(existing?.scope_names ?? []);
  return requestedScopeNames.filter((scope) => !grantedScopes.has(scope)).sort();
}

function assertLoginTransaction(realmId: string, transactionId: string): StoredIamLoginTransaction {
  const transaction = loginTransactionStore.getById(realmId, transactionId);
  if (!transaction) {
    throw new Error('Unknown login transaction');
  }
  if (transaction.cancelled_at) {
    throw new Error('Login transaction was cancelled');
  }
  if (transaction.completed_at) {
    throw new Error('Login transaction already completed');
  }
  if (Date.parse(transaction.expires_at) <= Date.now()) {
    transaction.status = 'EXPIRED';
    persistStateSyncOnly();
    throw new Error('Login transaction expired');
  }
  return transaction;
}

async function assertLoginTransactionAsync(realmId: string, transactionId: string): Promise<StoredIamLoginTransaction> {
  const transaction = await loginTransactionAsyncStore.getById(realmId, transactionId);
  if (!transaction) {
    throw new Error('Unknown login transaction');
  }
  if (transaction.cancelled_at) {
    throw new Error('Login transaction was cancelled');
  }
  if (transaction.completed_at) {
    throw new Error('Login transaction already completed');
  }
  if (Date.parse(transaction.expires_at) <= Date.now()) {
    transaction.status = 'EXPIRED';
    await loginTransactionAsyncStore.put(transaction);
    throw new Error('Login transaction expired');
  }
  return transaction;
}

function revokeExpiredSessions(persistOnChange: boolean = true): number {
  let expiredSessionCount = 0;
  for (const session of accountSessionRepository.load()) {
    if (!session.revoked_at && Date.parse(session.expires_at) <= Date.now()) {
      session.revoked_at = session.expires_at;
      expiredSessionCount += 1;
    }
  }
  if (expiredSessionCount > 0 && persistOnChange) {
    persistStateSyncOnly();
  }
  return expiredSessionCount;
}

function expireLoginTransactions(persistOnChange: boolean = true): number {
  const now = Date.now();
  let expiredLoginTransactionCount = 0;
  for (const transaction of loginTransactionRepository.load()) {
    if (!transaction.completed_at && !transaction.cancelled_at && transaction.status !== 'EXPIRED' && Date.parse(transaction.expires_at) <= now) {
      transaction.status = 'EXPIRED';
      expiredLoginTransactionCount += 1;
    }
  }
  if (expiredLoginTransactionCount > 0 && persistOnChange) {
    persistStateSyncOnly();
  }
  return expiredLoginTransactionCount;
}

function expirePasswordResetTickets(persistOnChange: boolean = true): number {
  const now = Date.now();
  let expiredPasswordResetTicketCount = 0;
  for (const ticket of passwordResetTicketRepository.load()) {
    if (ticket.status === 'PENDING' && !ticket.consumed_at && Date.parse(ticket.expires_at) <= now) {
      ticket.status = 'EXPIRED';
      expiredPasswordResetTicketCount += 1;
    }
  }
  if (expiredPasswordResetTicketCount > 0 && persistOnChange) {
    persistStateSyncOnly();
  }
  return expiredPasswordResetTicketCount;
}

function expireEmailVerificationTickets(persistOnChange: boolean = true): number {
  const now = Date.now();
  let expiredEmailVerificationTicketCount = 0;
  for (const ticket of emailVerificationTicketRepository.load()) {
    if (ticket.status === 'PENDING' && !ticket.consumed_at && Date.parse(ticket.expires_at) <= now) {
      ticket.status = 'EXPIRED';
      expiredEmailVerificationTicketCount += 1;
    }
  }
  if (expiredEmailVerificationTicketCount > 0 && persistOnChange) {
    persistStateSyncOnly();
  }
  return expiredEmailVerificationTicketCount;
}

function expirePendingMfaEnrollments(persistOnChange: boolean = true): number {
  const now = Date.now();
  let expiredPendingMfaEnrollmentCount = 0;
  for (const enrollment of pendingMfaEnrollmentRepository.load()) {
    if (!enrollment.consumed_at && Date.parse(enrollment.expires_at) <= now) {
      enrollment.consumed_at = enrollment.expires_at;
      expiredPendingMfaEnrollmentCount += 1;
    }
  }
  if (expiredPendingMfaEnrollmentCount > 0 && persistOnChange) {
    persistStateSyncOnly();
  }
  return expiredPendingMfaEnrollmentCount;
}

function runTransientStateMaintenanceSyncOnly(): IamAuthenticationTransientStateMaintenanceResult {
  const expiredSessionCount = revokeExpiredSessions(false);
  const expiredLoginTransactionCount = expireLoginTransactions(false);
  const expiredPasswordResetTicketCount = expirePasswordResetTickets(false);
  const expiredEmailVerificationTicketCount = expireEmailVerificationTickets(false);
  const expiredPendingMfaEnrollmentCount = expirePendingMfaEnrollments(false);
  const totalMutatedCount =
    expiredSessionCount
    + expiredLoginTransactionCount
    + expiredPasswordResetTicketCount
    + expiredEmailVerificationTicketCount
    + expiredPendingMfaEnrollmentCount;

  if (totalMutatedCount > 0) {
    persistStateSyncOnly();
  }

  return {
    expired_session_count: expiredSessionCount,
    expired_login_transaction_count: expiredLoginTransactionCount,
    expired_password_reset_ticket_count: expiredPasswordResetTicketCount,
    expired_email_verification_ticket_count: expiredEmailVerificationTicketCount,
    expired_pending_mfa_enrollment_count: expiredPendingMfaEnrollmentCount,
    total_mutated_count: totalMutatedCount,
  };
}

function createSession(
  user: IamUserRecord,
  client: IamClientRecord | null,
  scopeNames: string[],
  assuranceLevel: IamAccountAssuranceLevel,
  options?: {
    federated_login_context?: IamFederatedLoginContextInput | null;
  },
): { session: StoredIamAccountSession; session_token: string } {
  const authenticatedAt = nowIso();
  const sessionProof = randomBytes(24).toString('base64url');
  const session: StoredIamAccountSession = {
    id: `iam-session-${randomUUID()}`,
    realm_id: user.realm_id,
    user_id: user.id,
    client_id: client?.id ?? null,
    client_identifier: client?.client_id ?? null,
    client_name: client?.name ?? null,
    client_protocol: client?.protocol ?? null,
    scope_names: [...scopeNames],
    assurance_level: assuranceLevel,
    authenticated_at: authenticatedAt,
    issued_at: authenticatedAt,
    last_seen_at: authenticatedAt,
    expires_at: new Date(Date.now() + ACCOUNT_SESSION_TTL_MS).toISOString(),
    revoked_at: null,
    session_proof_hash: hashSessionProof(sessionProof),
    federated_login_context: options?.federated_login_context ?? null,
    synthetic: true,
  };
  sessionStore.append(session);
  const security = getSecurityState(user);
  security.last_login_at = authenticatedAt;
  if (assuranceLevel === 'MFA') {
    security.last_mfa_authenticated_at = authenticatedAt;
  }
  if (assuranceLevel === 'PASSKEY') {
    security.last_passkey_authenticated_at = authenticatedAt;
  }
  persistActivityStateSyncOnly();
  return {
    session,
    session_token: buildSessionToken(session.id, sessionProof),
  };
}

async function createSessionAsync(
  user: IamUserRecord,
  client: IamClientRecord | null,
  scopeNames: string[],
  assuranceLevel: IamAccountAssuranceLevel,
  options?: {
    federated_login_context?: IamFederatedLoginContextInput | null;
  },
): Promise<{ session: StoredIamAccountSession; session_token: string }> {
  const authenticatedAt = nowIso();
  const sessionProof = randomBytes(24).toString('base64url');
  const session: StoredIamAccountSession = {
    id: `iam-session-${randomUUID()}`,
    realm_id: user.realm_id,
    user_id: user.id,
    client_id: client?.id ?? null,
    client_identifier: client?.client_id ?? null,
    client_name: client?.name ?? null,
    client_protocol: client?.protocol ?? null,
    scope_names: [...scopeNames],
    assurance_level: assuranceLevel,
    authenticated_at: authenticatedAt,
    issued_at: authenticatedAt,
    last_seen_at: authenticatedAt,
    expires_at: new Date(Date.now() + ACCOUNT_SESSION_TTL_MS).toISOString(),
    revoked_at: null,
    session_proof_hash: hashSessionProof(sessionProof),
    federated_login_context: options?.federated_login_context ?? null,
    synthetic: true,
  };
  await Promise.all([
    sessionAsyncStore.put(session),
    (async () => {
      const security = await getSecurityStateAsync(user);
      security.last_login_at = authenticatedAt;
      if (assuranceLevel === 'MFA') {
        security.last_mfa_authenticated_at = authenticatedAt;
      }
      if (assuranceLevel === 'PASSKEY') {
        security.last_passkey_authenticated_at = authenticatedAt;
      }
      await saveSecurityStateAsync(security);
    })(),
  ]);
  return {
    session,
    session_token: buildSessionToken(session.id, sessionProof),
  };
}

function revokeSessionsForUser(realmId: string, userId: string, exceptSessionId?: string | null): { revoked_count: number; revoked_at: string | null } {
  const result = revokeSessionsForUserDetailed(realmId, userId, exceptSessionId);
  return {
    revoked_count: result.revoked_count,
    revoked_at: result.revoked_at,
  };
}

function revokeSessionsForUserDetailed(
  realmId: string,
  userId: string,
  exceptSessionId?: string | null,
): { revoked_count: number; revoked_at: string | null; revoked_session_ids: string[] } {
  let revokedCount = 0;
  let revokedAt: string | null = null;
  const revokedSessionIds: string[] = [];
  for (const session of accountSessionRepository.load()) {
    if (
      session.realm_id !== realmId
      || session.user_id !== userId
      || session.revoked_at
      || (exceptSessionId && session.id === exceptSessionId)
    ) {
      continue;
    }
    session.revoked_at = nowIso();
    revokedCount += 1;
    revokedAt = session.revoked_at;
    revokedSessionIds.push(session.id);
  }
  if (revokedCount > 0) {
    persistStateSyncOnly();
  }
  return {
    revoked_count: revokedCount,
    revoked_at: revokedAt,
    revoked_session_ids: revokedSessionIds,
  };
}

async function terminateLinkedSamlSessionsForBrowserSessionsAsync(
  realmId: string,
  browserSessionReferences: Array<string | null | undefined>,
): Promise<void> {
  const uniqueReferences = Array.from(new Set(
    browserSessionReferences
      .map((reference) => reference?.trim() ?? '')
      .filter((reference) => reference.length > 0),
  ));

  for (const browserSessionReference of uniqueReferences) {
    await LocalIamProtocolRuntimeStore.terminateSamlSessionsForBrowserSessionAsync(realmId, browserSessionReference);
  }
}

async function terminateFederatedSessionLinksForBrowserSessionsAsync(
  realmId: string,
  browserSessionReferences: Array<string | null | undefined>,
): Promise<void> {
  if (useRuntimeRepositoryPath) {
    return;
  }
  const uniqueReferences = Array.from(new Set(
    browserSessionReferences
      .map((reference) => reference?.trim() ?? '')
      .filter((reference) => reference.length > 0),
  ));

  for (const browserSessionReference of uniqueReferences) {
    await LocalIamFederationSessionIndexStore.terminateBrowserFederatedSessionLinksForBrowserSessionAsync(
      realmId,
      browserSessionReference,
    );
  }
}

async function revokeIssuedTokensForBrowserSessionsAsync(
  realmId: string,
  browserSessionReferences: Array<string | null | undefined>,
): Promise<void> {
  const uniqueReferences = Array.from(new Set(
    browserSessionReferences
      .map((reference) => reference?.trim() ?? '')
      .filter((reference) => reference.length > 0),
  ));

  for (const browserSessionReference of uniqueReferences) {
    await LocalIamProtocolRuntimeStore.revokeTokensForBrowserSessionAsync(realmId, browserSessionReference);
  }
}

function resolveAccountSessionWithActivityOption(
  realmId: string,
  sessionId: string,
  touch: boolean,
  requireActive: boolean,
): StoredIamAccountSession {
  revokeExpiredSessions();
  const parsedSessionToken = parseSessionToken(sessionId);
  const session = sessionStore.getById(realmId, parsedSessionToken.session_id);
  if (!session) {
    throw new Error('Unknown account session');
  }
  if (isSessionProofRequired()) {
    if (!session.session_proof_hash) {
      throw new Error('Account session binding is unavailable. Please sign in again.');
    }
    if (!parsedSessionToken.session_proof) {
      throw new Error('Missing account session proof');
    }
    const expectedHashBuffer = Buffer.from(session.session_proof_hash, 'utf8');
    const actualHashBuffer = Buffer.from(hashSessionProof(parsedSessionToken.session_proof), 'utf8');
    if (
      expectedHashBuffer.length !== actualHashBuffer.length
      || !timingSafeEqual(expectedHashBuffer, actualHashBuffer)
    ) {
      throw new Error('Invalid account session proof');
    }
  }
  if (requireActive && sessionStatus(session) !== 'ACTIVE') {
    throw new Error('Account session is no longer active');
  }
  if (touch) {
    session.last_seen_at = nowIso();
    persistStateSyncOnly();
  }
  return session;
}

function resolveAccountSession(realmId: string, sessionId: string, touch: boolean): StoredIamAccountSession {
  return resolveAccountSessionWithActivityOption(realmId, sessionId, touch, true);
}

async function resolveAccountSessionAsyncWithActivityOption(
  realmId: string,
  sessionId: string,
  touch: boolean,
  requireActive: boolean,
): Promise<StoredIamAccountSession> {
  if (!useRuntimeRepositoryPath) {
    return resolveAccountSessionWithActivityOption(realmId, sessionId, touch, requireActive);
  }

  const parsedSessionToken = parseSessionToken(sessionId);
  const session = await sessionAsyncStore.getById(realmId, parsedSessionToken.session_id);
  if (!session) {
    throw new Error('Unknown account session');
  }
  if (isSessionProofRequired()) {
    if (!session.session_proof_hash) {
      throw new Error('Account session binding is unavailable. Please sign in again.');
    }
    if (!parsedSessionToken.session_proof) {
      throw new Error('Missing account session proof');
    }
    const expectedHashBuffer = Buffer.from(session.session_proof_hash, 'utf8');
    const actualHashBuffer = Buffer.from(hashSessionProof(parsedSessionToken.session_proof), 'utf8');
    if (
      expectedHashBuffer.length !== actualHashBuffer.length
      || !timingSafeEqual(expectedHashBuffer, actualHashBuffer)
    ) {
      throw new Error('Invalid account session proof');
    }
  }
  if (requireActive && !session.revoked_at && Date.parse(session.expires_at) <= Date.now()) {
    session.revoked_at = session.expires_at;
    await sessionAsyncStore.put(session);
    throw new Error('Account session is no longer active');
  }
  if (requireActive && sessionStatus(session) !== 'ACTIVE') {
    throw new Error('Account session is no longer active');
  }
  if (touch) {
    session.last_seen_at = nowIso();
    await sessionAsyncStore.put(session);
  }
  return session;
}

async function resolveAccountSessionAsync(
  realmId: string,
  sessionId: string,
  touch: boolean,
): Promise<StoredIamAccountSession> {
  return resolveAccountSessionAsyncWithActivityOption(realmId, sessionId, touch, true);
}

async function syncSessionsAsync(sessions: StoredIamAccountSession[]): Promise<void> {
  if (!useRuntimeRepositoryPath) {
    return;
  }
  for (const session of sessions) {
    await sessionAsyncStore.put(session);
  }
}

function isAccountSessionActiveForRuntime(realmId: string, sessionId: string): boolean {
  revokeExpiredSessions();
  const parsedSessionToken = parseSessionToken(sessionId);
  const session = sessionStore.getById(realmId, parsedSessionToken.session_id);
  if (!session) {
    return false;
  }
  return sessionStatus(session) === 'ACTIVE';
}

function createLoginTransaction(
  user: IamUserRecord,
  client: IamClientRecord | null,
  requestedScopeNames: string[],
  options?: {
    federated_login_context?: IamFederatedLoginContextInput | null;
  },
): StoredIamLoginTransaction {
  const transaction: StoredIamLoginTransaction = {
    id: `iam-login-${randomUUID()}`,
    realm_id: user.realm_id,
    user_id: user.id,
    flow_id: LocalIamAuthFlowStore.resolveBoundFlowId(user.realm_id, client?.id ?? null, 'BROWSER'),
    client_id: client?.id ?? null,
    client_identifier: client?.client_id ?? null,
    client_name: client?.name ?? null,
    client_protocol: client?.protocol ?? null,
    requested_scope_names: requestedScopeNames,
    pending_required_actions: [],
    pending_scope_consent: [],
    pending_mfa: false,
    federated_login_context: options?.federated_login_context ?? null,
    created_at: nowIso(),
    expires_at: new Date(Date.now() + LOGIN_TRANSACTION_TTL_MS).toISOString(),
    completed_at: null,
    cancelled_at: null,
    status: 'PENDING_REQUIRED_ACTIONS',
  };
  loginTransactionStore.append(transaction);
  return assertLoginTransaction(user.realm_id, transaction.id);
}

async function createLoginTransactionAsync(
  user: IamUserRecord,
  client: IamClientRecord | null,
  requestedScopeNames: string[],
  options?: {
    federated_login_context?: IamFederatedLoginContextInput | null;
  },
): Promise<StoredIamLoginTransaction> {
  const transaction: StoredIamLoginTransaction = {
    id: `iam-login-${randomUUID()}`,
    realm_id: user.realm_id,
    user_id: user.id,
    flow_id: await LocalIamAuthFlowStore.resolveBoundFlowIdAsync(user.realm_id, client?.id ?? null, 'BROWSER'),
    client_id: client?.id ?? null,
    client_identifier: client?.client_id ?? null,
    client_name: client?.name ?? null,
    client_protocol: client?.protocol ?? null,
    requested_scope_names: requestedScopeNames,
    pending_required_actions: [],
    pending_scope_consent: [],
    pending_mfa: false,
    federated_login_context: options?.federated_login_context ?? null,
    created_at: nowIso(),
    expires_at: new Date(Date.now() + LOGIN_TRANSACTION_TTL_MS).toISOString(),
    completed_at: null,
    cancelled_at: null,
    status: 'PENDING_REQUIRED_ACTIONS',
  };
  return transaction;
}

function recordFederatedLoginSessionLink(
  realmId: string,
  userId: string,
  browserSessionReference: string,
  federatedLoginContext: IamFederatedLoginContextInput | null | undefined,
): void {
  if (!federatedLoginContext) {
    return;
  }
  LocalIamFederationSessionIndexStore.recordBrowserFederatedSessionLink({
    realm_id: realmId,
    user_id: userId,
    browser_session_reference: browserSessionReference,
    source_type: federatedLoginContext.source_type,
    linked_identity_id: federatedLoginContext.linked_identity_id,
    provider_id: federatedLoginContext.provider_id,
    provider_name: federatedLoginContext.provider_name,
    provider_alias: federatedLoginContext.provider_alias,
    provider_kind: federatedLoginContext.provider_kind,
    external_subject: federatedLoginContext.external_subject,
  });
}

async function recordFederatedLoginSessionLinkAsync(
  realmId: string,
  userId: string,
  browserSessionReference: string,
  federatedLoginContext: IamFederatedLoginContextInput | null | undefined,
): Promise<void> {
  if (useRuntimeRepositoryPath) {
    return;
  }
  if (!federatedLoginContext) {
    return;
  }
  await LocalIamFederationSessionIndexStore.recordBrowserFederatedSessionLinkAsync({
    realm_id: realmId,
    user_id: userId,
    browser_session_reference: browserSessionReference,
    source_type: federatedLoginContext.source_type,
    linked_identity_id: federatedLoginContext.linked_identity_id,
    provider_id: federatedLoginContext.provider_id,
    provider_name: federatedLoginContext.provider_name,
    provider_alias: federatedLoginContext.provider_alias,
    provider_kind: federatedLoginContext.provider_kind,
    external_subject: federatedLoginContext.external_subject,
  });
}

function completeLoginState(
  transaction: StoredIamLoginTransaction,
  options?: {
    skip_mfa?: boolean;
    strong_auth?: boolean;
    assurance_level?: IamAccountAssuranceLevel;
    credential_authenticator?: Extract<IamAuthenticatorKind, 'USERNAME_PASSWORD' | 'PASSKEY_WEBAUTHN'>;
    passkey_enabled?: boolean;
  },
): { session: StoredIamAccountSession | null; response: IamLoginResponse } {
  const user = getRealmUserById(transaction.realm_id, transaction.user_id);
  const client = transaction.client_identifier ? getClientByPublicIdentifier(transaction.realm_id, transaction.client_identifier) : null;
  const requiredActions = getOutstandingRequiredActions(user);
  const pendingConsent = determinePendingConsentScopes(user, client, transaction.requested_scope_names);
  const activeMfa = options?.skip_mfa ? null : getMfaState(user.realm_id, user.id);
  const credentialAuthenticator = options?.credential_authenticator ?? 'USERNAME_PASSWORD';
  const passkeyEnabled = options?.passkey_enabled ?? LocalIamWebAuthnStore.getActiveCredentialCount(user.realm_id, user.id) > 0;
  const flowDecision = LocalIamAuthFlowStore.evaluateLoginFlow({
    realm_id: user.realm_id,
    client_id: client?.id ?? null,
    flow_kind: 'BROWSER',
    flow_id: transaction.flow_id,
    credential_satisfied: true,
    satisfied_authenticator_kinds: [credentialAuthenticator],
    mfa_satisfied: options?.strong_auth ?? false,
    mfa_enabled: Boolean(activeMfa),
    passkey_enabled: passkeyEnabled,
    required_actions: requiredActions,
    pending_scope_consent: pendingConsent,
  });

  transaction.flow_id = flowDecision.flow_id;
  transaction.pending_required_actions = flowDecision.pending_required_actions;
  transaction.pending_scope_consent = flowDecision.pending_scope_consent;
  transaction.pending_mfa = flowDecision.pending_mfa;

  if (flowDecision.next_step !== 'AUTHENTICATED') {
    transaction.status = flowDecision.next_step === 'REQUIRED_ACTIONS'
      ? 'PENDING_REQUIRED_ACTIONS'
      : flowDecision.next_step === 'CONSENT_REQUIRED'
        ? 'PENDING_CONSENT'
        : 'PENDING_MFA';
    persistStateSyncOnly();
    return {
      session: null,
      response: {
        realm_id: user.realm_id,
        next_step: flowDecision.next_step,
        login_transaction_id: transaction.id,
        session_id: null,
        user: summarizeUser(user),
        client: summarizeClient(client),
        pending_required_actions: flowDecision.pending_required_actions,
        pending_scope_consent: flowDecision.pending_scope_consent,
        pending_mfa: flowDecision.pending_mfa,
        post_login_destination: getPostLoginDestination(client),
      },
    };
  }

  const createdSession = createSession(
    user,
    client,
    transaction.requested_scope_names,
    options?.assurance_level ?? 'PASSWORD',
    {
      federated_login_context: transaction.federated_login_context,
    },
  );
  const session = createdSession.session;
  recordFederatedLoginSessionLink(
    user.realm_id,
    user.id,
    createdSession.session_token,
    transaction.federated_login_context,
  );
  transaction.status = 'COMPLETE';
  transaction.completed_at = nowIso();
  persistStateSyncOnly();
  return {
    session,
    response: {
      realm_id: user.realm_id,
      next_step: 'AUTHENTICATED',
      login_transaction_id: transaction.id,
      session_id: createdSession.session_token,
      user: summarizeUser(user),
      client: summarizeClient(client),
      pending_required_actions: [],
      pending_scope_consent: [],
      pending_mfa: false,
      post_login_destination: getPostLoginDestination(client),
    },
  };
}

async function completeLoginStateAsync(
  transaction: StoredIamLoginTransaction,
  options?: {
    skip_mfa?: boolean;
    strong_auth?: boolean;
    assurance_level?: IamAccountAssuranceLevel;
    credential_authenticator?: Extract<IamAuthenticatorKind, 'USERNAME_PASSWORD' | 'PASSKEY_WEBAUTHN'>;
    passkey_enabled?: boolean;
  },
): Promise<{ session: StoredIamAccountSession | null; response: IamLoginResponse }> {
  const user = getRealmUserById(transaction.realm_id, transaction.user_id);
  const client = transaction.client_identifier ? getClientByPublicIdentifier(transaction.realm_id, transaction.client_identifier) : null;
  const requiredActions = await getOutstandingRequiredActionsAsync(user);
  const pendingConsent = determinePendingConsentScopes(user, client, transaction.requested_scope_names);
  const activeMfa = options?.skip_mfa ? null : getMfaState(user.realm_id, user.id);
  const credentialAuthenticator = options?.credential_authenticator ?? 'USERNAME_PASSWORD';
  const passkeyEnabled = options?.passkey_enabled ?? LocalIamWebAuthnStore.getActiveCredentialCount(user.realm_id, user.id) > 0;
  const flowDecision = LocalIamAuthFlowStore.evaluateLoginFlow({
    realm_id: user.realm_id,
    client_id: client?.id ?? null,
    flow_kind: 'BROWSER',
    flow_id: transaction.flow_id,
    credential_satisfied: true,
    satisfied_authenticator_kinds: [credentialAuthenticator],
    mfa_satisfied: options?.strong_auth ?? false,
    mfa_enabled: Boolean(activeMfa),
    passkey_enabled: passkeyEnabled,
    required_actions: requiredActions,
    pending_scope_consent: pendingConsent,
  });

  transaction.flow_id = flowDecision.flow_id;
  transaction.pending_required_actions = flowDecision.pending_required_actions;
  transaction.pending_scope_consent = flowDecision.pending_scope_consent;
  transaction.pending_mfa = flowDecision.pending_mfa;

  if (flowDecision.next_step !== 'AUTHENTICATED') {
    transaction.status = flowDecision.next_step === 'REQUIRED_ACTIONS'
      ? 'PENDING_REQUIRED_ACTIONS'
      : flowDecision.next_step === 'CONSENT_REQUIRED'
        ? 'PENDING_CONSENT'
        : 'PENDING_MFA';
    await loginTransactionAsyncStore.put(transaction);
    return {
      session: null,
      response: {
        realm_id: user.realm_id,
        next_step: flowDecision.next_step,
        login_transaction_id: transaction.id,
        session_id: null,
        user: summarizeUser(user),
        client: summarizeClient(client),
        pending_required_actions: flowDecision.pending_required_actions,
        pending_scope_consent: flowDecision.pending_scope_consent,
        pending_mfa: flowDecision.pending_mfa,
        post_login_destination: getPostLoginDestination(client),
      },
    };
  }

  const createdSession = await createSessionAsync(
    user,
    client,
    transaction.requested_scope_names,
    options?.assurance_level ?? 'PASSWORD',
    {
      federated_login_context: transaction.federated_login_context,
    },
  );
  const session = createdSession.session;
  transaction.status = 'COMPLETE';
  transaction.completed_at = nowIso();
  await Promise.all([
    recordFederatedLoginSessionLinkAsync(
      user.realm_id,
      user.id,
      createdSession.session_token,
      transaction.federated_login_context,
    ),
  ]);
  return {
    session,
    response: {
      realm_id: user.realm_id,
      next_step: 'AUTHENTICATED',
      login_transaction_id: transaction.id,
      session_id: createdSession.session_token,
      user: summarizeUser(user),
      client: summarizeClient(client),
      pending_required_actions: [],
      pending_scope_consent: [],
      pending_mfa: false,
      post_login_destination: getPostLoginDestination(client),
    },
  };
}

function consumeBackupCode(mfaState: StoredIamMfaState, code: string): boolean {
  const backupValue = LocalSecretStore.getSecretValue(mfaState.backup_codes_reference_id);
  if (!backupValue) {
    return false;
  }
  const normalized = normalizeCode(code);
  const parsed = JSON.parse(backupValue) as string[];
  const nextCodes = parsed.filter((candidate) => normalizeCode(candidate) !== normalized);
  if (nextCodes.length === parsed.length) {
    return false;
  }
  LocalSecretStore.upsertOpaqueSecret({
    subjectType: 'iam_user',
    subjectId: `${mfaState.realm_id}:${mfaState.user_id}`,
    kind: 'backup_code_bundle',
    label: `${mfaState.user_id} backup code bundle`,
    value: JSON.stringify(nextCodes),
    createdByUserId: mfaState.user_id,
    preview: `backup_codes_${mfaState.user_id}`,
  });
  return true;
}

function verifyActiveMfaCode(mfaState: StoredIamMfaState, code: string): boolean {
  const totpSecret = LocalSecretStore.getSecretValue(mfaState.totp_reference_id);
  if (totpSecret && verifyTotpCode(totpSecret, code)) {
    return true;
  }
  return consumeBackupCode(mfaState, code);
}

export const LocalIamAuthenticationRuntimeStore = {
  getSummary(): IamAuthenticationSummary {
    runTransientStateMaintenanceSyncOnly();
    const accountSessions = accountSessionRepository.load();
    const consentRecords = consentRecordRepository.load();
    const loginTransactions = loginTransactionRepository.load();
    const activeBrowserSessions = accountSessions.filter((session) => sessionStatus(session) === 'ACTIVE').length;
    const activeConsentRecords = consentRecords.filter((record) => !record.revoked_at).length;
    const activeTransactions = loginTransactions.filter(
      (transaction) => !transaction.completed_at && !transaction.cancelled_at && Date.parse(transaction.expires_at) > Date.now(),
    ).length;
    const mfaStates = mfaStateRepository.load();
    const loginAttempts = loginAttemptRepository.load();
    const lockoutStates = userLockoutStateRepository.load();
    const activeMfaEnrollments = mfaStates.filter((record) => !record.disabled_at).length;
    return {
      browser_session_count: accountSessions.length,
      active_browser_session_count: activeBrowserSessions,
      consent_record_count: consentRecords.length,
      active_consent_record_count: activeConsentRecords,
      login_transaction_count: loginTransactions.length,
      active_login_transaction_count: activeTransactions,
      mfa_enrollment_count: mfaStates.length,
      active_mfa_enrollment_count: activeMfaEnrollments,
      password_reset_ticket_count: passwordResetTicketRepository.load().length,
      email_verification_ticket_count: emailVerificationTicketRepository.load().length,
      failed_login_attempt_count: loginAttempts.filter((record) => record.outcome !== 'SUCCESS').length,
      active_lockout_count: lockoutStates.filter(
        (record) => record.lockout_until && Date.parse(record.lockout_until) > Date.now(),
      ).length,
    };
  },

  getRuntimeRepositoryStatus(): IamAuthenticationRuntimeRepositoryStatus {
    return {
      mode: {
        dual_write: runtimeRepositoryMode.dualWrite,
        read_v2: runtimeRepositoryMode.readV2,
        parity_sample_rate: runtimeRepositoryMode.paritySampleRate,
      },
      sessions: sessionRuntimeRepositoryStatus,
      tickets: ticketRuntimeRepositoryStatus,
      login_transactions: loginTransactionRuntimeRepositoryStatus,
    };
  },

  async loadAccountSessionsStateAsync(): Promise<StoredIamAccountSession[]> {
    return clone(await accountSessionAsyncRepository.load());
  },

  async saveAccountSessionsStateAsync(nextState: StoredIamAccountSession[]): Promise<void> {
    await accountSessionAsyncRepository.save(clone(nextState));
    rebuildAccountSessionIndex();
  },

  async loadLoginTransactionsStateAsync(): Promise<StoredIamLoginTransaction[]> {
    return clone(await loginTransactionAsyncRepository.load());
  },

  async saveLoginTransactionsStateAsync(nextState: StoredIamLoginTransaction[]): Promise<void> {
    await loginTransactionAsyncRepository.save(clone(nextState));
  },

  runTransientStateMaintenance(): IamAuthenticationTransientStateMaintenanceResult {
    return runTransientStateMaintenanceSyncOnly();
  },

  async runTransientStateMaintenanceAsync(): Promise<IamAuthenticationTransientStateMaintenanceResult> {
    return runWithDeferredPersistence(() => this.runTransientStateMaintenance());
  },

  getPublicCatalog(): IamPublicRealmCatalogResponse {
    const realms = LocalIamFoundationStore.listRealms().realms
      .filter((realm) => realm.status !== 'ARCHIVED')
      .map((realm) => {
        const clients = LocalIamProtocolRuntimeStore.listClients({ realm_id: realm.id }).clients
          .filter((client) => client.status === 'ACTIVE' && (client.standard_flow_enabled || client.protocol === 'SAML'))
          .map((client) => ({
            id: client.id,
            client_id: client.client_id,
            name: client.name,
            protocol: client.protocol,
            base_url: client.base_url,
            root_url: client.root_url,
          }));
        return {
          id: realm.id,
          name: realm.name,
          summary: realm.summary,
          supported_protocols: realm.supported_protocols,
          clients,
        };
      });
    return {
      generated_at: nowIso(),
      realms,
      count: realms.length,
    };
  },

  login(realmId: string, input: RequestIamLoginInput): IamLoginResponse {
    const loginStartedAt = process.hrtime.bigint();
    const stepTimings: Record<string, number> = {};
    let outcome = 'UNKNOWN';
    const candidateUser = findRealmUserByIdentifier(realmId, input.username);
    stepTimings.user_lookup_ms = durationMs(loginStartedAt);
    if (candidateUser) {
      const lockoutStartedAt = process.hrtime.bigint();
      assertUserNotLocked(candidateUser);
      stepTimings.lockout_check_ms = durationMs(lockoutStartedAt);
    }
    let user: IamUserRecord;
    try {
      const credentialStartedAt = process.hrtime.bigint();
      user = LocalIamProtocolRuntimeStore.validateUserCredentials(realmId, input.username, input.password);
      stepTimings.credential_validation_ms = durationMs(credentialStartedAt);
    } catch (_error) {
      if (candidateUser) {
        const failedAttemptStartedAt = process.hrtime.bigint();
        const lockout = registerFailedLogin(candidateUser);
        recordLoginAttempt({
          realmId,
          userId: candidateUser.id,
          usernameOrEmail: input.username,
          clientIdentifier: input.client_id?.trim() || null,
          outcome: lockout.lockout_until && Date.parse(lockout.lockout_until) > Date.now() ? 'LOCKED' : 'FAILED_CREDENTIALS',
          summary: lockout.lockout_until && Date.parse(lockout.lockout_until) > Date.now()
            ? `Repeated failed credential checks triggered lockout until ${lockout.lockout_until}.`
            : 'Credential validation failed for browser login.',
        });
        if (lockout.lockout_until && Date.parse(lockout.lockout_until) > Date.now()) {
          outcome = 'LOCKED';
          emitLoginTiming('browser_login_core', {
            realm_id: realmId,
            username: input.username,
            outcome,
            total_core_ms: durationMs(loginStartedAt),
            steps: {
              ...stepTimings,
              failed_attempt_record_ms: durationMs(failedAttemptStartedAt),
            },
          });
          throw new Error(`Account is temporarily locked until ${lockout.lockout_until}`);
        }
        stepTimings.failed_attempt_record_ms = durationMs(failedAttemptStartedAt);
      } else {
        const failedAttemptStartedAt = process.hrtime.bigint();
        recordLoginAttempt({
          realmId,
          userId: null,
          usernameOrEmail: input.username,
          clientIdentifier: input.client_id?.trim() || null,
          outcome: 'FAILED_CREDENTIALS',
          summary: 'Credential validation failed for an unknown user identifier.',
        });
        stepTimings.failed_attempt_record_ms = durationMs(failedAttemptStartedAt);
      }
      outcome = 'FAILED_CREDENTIALS';
      emitLoginTiming('browser_login_core', {
        realm_id: realmId,
        username: input.username,
        outcome,
        total_core_ms: durationMs(loginStartedAt),
        steps: stepTimings,
      });
      throw new Error('Invalid username or password');
    }
    if (user.status !== 'ACTIVE') {
      outcome = 'INACTIVE';
      emitLoginTiming('browser_login_core', {
        realm_id: realmId,
        username: input.username,
        outcome,
        total_core_ms: durationMs(loginStartedAt),
        steps: stepTimings,
      });
      throw new Error('User is not active');
    }
    const securityStateStartedAt = process.hrtime.bigint();
    clearUserLockoutState(realmId, user.id);
    recordLoginAttempt({
      realmId,
      userId: user.id,
      usernameOrEmail: input.username,
      clientIdentifier: input.client_id?.trim() || null,
      outcome: 'SUCCESS',
      summary: 'Browser login credential validation succeeded.',
    });
    stepTimings.security_state_ms = durationMs(securityStateStartedAt);
    const clientLookupStartedAt = process.hrtime.bigint();
    const client = getClientByPublicIdentifier(realmId, input.client_id);
    stepTimings.client_lookup_ms = durationMs(clientLookupStartedAt);
    const requestedScopeNames = Array.from(new Set((input.scope ?? []).map((scope) => scope.trim()).filter(Boolean))).sort();
    const createTransactionStartedAt = process.hrtime.bigint();
    const transaction = createLoginTransaction(user, client, requestedScopeNames);
    stepTimings.create_transaction_ms = durationMs(createTransactionStartedAt);
    const completeStateStartedAt = process.hrtime.bigint();
    const response = completeLoginState(transaction).response;
    stepTimings.complete_state_ms = durationMs(completeStateStartedAt);
    outcome = response.next_step;
    emitLoginTiming('browser_login_core', {
      realm_id: realmId,
      username: input.username,
      outcome,
      total_core_ms: durationMs(loginStartedAt),
      steps: stepTimings,
    });
    return response;
  },

  async loginAsync(realmId: string, input: RequestIamLoginInput): Promise<IamLoginResponse> {
    if (!(runtimeRepositoryMode.dualWrite || runtimeRepositoryMode.readV2)) {
      return runWithDeferredPersistence(() => this.login(realmId, input));
    }

    return runWithDeferredPersistence(async () => {
      const loginStartedAt = process.hrtime.bigint();
      const stepTimings: Record<string, number> = {};
      let outcome = 'UNKNOWN';
      const candidateUser = findRealmUserByIdentifier(realmId, input.username);
      stepTimings.user_lookup_ms = durationMs(loginStartedAt);

      if (candidateUser) {
        const lockoutStartedAt = process.hrtime.bigint();
        await assertUserNotLockedAsync(candidateUser);
        stepTimings.lockout_check_ms = durationMs(lockoutStartedAt);
      }

      let user: IamUserRecord;
      try {
        const credentialStartedAt = process.hrtime.bigint();
        user = await LocalIamProtocolRuntimeStore.validateUserCredentialsAsync(realmId, input.username, input.password);
        stepTimings.credential_validation_ms = durationMs(credentialStartedAt);
      } catch (_error) {
        if (candidateUser) {
          const failedAttemptStartedAt = process.hrtime.bigint();
          const lockout = await registerFailedLoginAsync(candidateUser);
          await recordLoginAttemptAsync({
            realmId,
            userId: candidateUser.id,
            usernameOrEmail: input.username,
            clientIdentifier: input.client_id?.trim() || null,
            outcome: lockout.lockout_until && Date.parse(lockout.lockout_until) > Date.now() ? 'LOCKED' : 'FAILED_CREDENTIALS',
            summary: lockout.lockout_until && Date.parse(lockout.lockout_until) > Date.now()
              ? `Repeated failed credential checks triggered lockout until ${lockout.lockout_until}.`
              : 'Credential validation failed for browser login.',
          });
          if (lockout.lockout_until && Date.parse(lockout.lockout_until) > Date.now()) {
            outcome = 'LOCKED';
            emitLoginTiming('browser_login_core', {
              realm_id: realmId,
              username: input.username,
              outcome,
              total_core_ms: durationMs(loginStartedAt),
              steps: {
                ...stepTimings,
                failed_attempt_record_ms: durationMs(failedAttemptStartedAt),
              },
            });
            throw new Error(`Account is temporarily locked until ${lockout.lockout_until}`);
          }
          stepTimings.failed_attempt_record_ms = durationMs(failedAttemptStartedAt);
        } else {
          const failedAttemptStartedAt = process.hrtime.bigint();
          await recordLoginAttemptAsync({
            realmId,
            userId: null,
            usernameOrEmail: input.username,
            clientIdentifier: input.client_id?.trim() || null,
            outcome: 'FAILED_CREDENTIALS',
            summary: 'Credential validation failed for an unknown user identifier.',
          });
          stepTimings.failed_attempt_record_ms = durationMs(failedAttemptStartedAt);
        }
        outcome = 'FAILED_CREDENTIALS';
        emitLoginTiming('browser_login_core', {
          realm_id: realmId,
          username: input.username,
          outcome,
          total_core_ms: durationMs(loginStartedAt),
          steps: stepTimings,
        });
        throw new Error('Invalid username or password');
      }

      if (user.status !== 'ACTIVE') {
        outcome = 'INACTIVE';
        emitLoginTiming('browser_login_core', {
          realm_id: realmId,
          username: input.username,
          outcome,
          total_core_ms: durationMs(loginStartedAt),
          steps: stepTimings,
        });
        throw new Error('User is not active');
      }

      const securityStateStartedAt = process.hrtime.bigint();
      await Promise.all([
        clearUserLockoutStateAsync(realmId, user.id),
        recordLoginAttemptAsync({
          realmId,
          userId: user.id,
          usernameOrEmail: input.username,
          clientIdentifier: input.client_id?.trim() || null,
          outcome: 'SUCCESS',
          summary: 'Browser login credential validation succeeded.',
        }),
      ]);
      stepTimings.security_state_ms = durationMs(securityStateStartedAt);

      const clientLookupStartedAt = process.hrtime.bigint();
      const client = getClientByPublicIdentifier(realmId, input.client_id);
      stepTimings.client_lookup_ms = durationMs(clientLookupStartedAt);
      const requestedScopeNames = Array.from(new Set((input.scope ?? []).map((scope) => scope.trim()).filter(Boolean))).sort();

      const createTransactionStartedAt = process.hrtime.bigint();
      const transaction = await createLoginTransactionAsync(user, client, requestedScopeNames);
      stepTimings.create_transaction_ms = durationMs(createTransactionStartedAt);

      const completeStateStartedAt = process.hrtime.bigint();
      const response = (await completeLoginStateAsync(transaction)).response;
      stepTimings.complete_state_ms = durationMs(completeStateStartedAt);
      outcome = response.next_step;

      emitLoginTiming('browser_login_core', {
        realm_id: realmId,
        username: input.username,
        outcome,
        total_core_ms: durationMs(loginStartedAt),
        steps: stepTimings,
      });
      return response;
    });
  },

  loginResolvedUser(realmId: string, userId: string, input: RequestResolvedIamLoginInput): IamLoginResponse {
    const user = getRealmUserById(realmId, userId);
    if (user.status !== 'ACTIVE') {
      throw new Error('User is not active');
    }
    const client = getClientByPublicIdentifier(realmId, input.client_id);
    const requestedScopeNames = Array.from(new Set((input.scope ?? []).map((scope) => scope.trim()).filter(Boolean))).sort();
    const transaction = createLoginTransaction(user, client, requestedScopeNames, {
      federated_login_context: input.federated_login_context ?? null,
    });
    return completeLoginState(transaction, {
      skip_mfa: input.skip_mfa,
      strong_auth: input.strong_auth,
      assurance_level: input.assurance_level,
      credential_authenticator: input.credential_authenticator,
      passkey_enabled: input.credential_authenticator === 'PASSKEY_WEBAUTHN'
        ? true
        : LocalIamWebAuthnStore.getActiveCredentialCount(realmId, user.id) > 0,
      }).response;
  },

  async loginResolvedUserAsync(
    realmId: string,
    userId: string,
    input: RequestResolvedIamLoginInput,
  ): Promise<IamLoginResponse> {
    if (!(runtimeRepositoryMode.dualWrite || runtimeRepositoryMode.readV2)) {
      return runWithDeferredPersistence(() => this.loginResolvedUser(realmId, userId, input));
    }

    return runWithDeferredPersistence(async () => {
      const user = getRealmUserById(realmId, userId);
      if (user.status !== 'ACTIVE') {
        throw new Error('User is not active');
      }
      const client = getClientByPublicIdentifier(realmId, input.client_id);
      const requestedScopeNames = Array.from(new Set((input.scope ?? []).map((scope) => scope.trim()).filter(Boolean))).sort();
      const transaction = await createLoginTransactionAsync(user, client, requestedScopeNames, {
        federated_login_context: input.federated_login_context ?? null,
      });
      return (await completeLoginStateAsync(transaction, {
        skip_mfa: input.skip_mfa,
        strong_auth: input.strong_auth,
        assurance_level: input.assurance_level,
        credential_authenticator: input.credential_authenticator,
        passkey_enabled: input.credential_authenticator === 'PASSKEY_WEBAUTHN'
          ? true
          : LocalIamWebAuthnStore.getActiveCredentialCount(realmId, user.id) > 0,
      })).response;
    });
  },

  impersonateUser(
    realmId: string,
    actorUserId: string,
    targetUserId: string,
    input?: {
      client_id?: string | null;
      scope?: string[] | null;
    },
  ): IamLoginResponse {
    const targetUser = getRealmUserById(realmId, targetUserId);
    if (targetUser.status !== 'ACTIVE') {
      throw new Error('Target user is not active');
    }
    recordLoginAttempt({
      realmId,
      userId: targetUser.id,
      usernameOrEmail: targetUser.username,
      clientIdentifier: input?.client_id?.trim() || null,
      outcome: 'SUCCESS',
      summary: `Administrative impersonation login was issued by ${actorUserId}.`,
    });
    return this.loginResolvedUser(realmId, targetUserId, {
      client_id: input?.client_id,
      scope: input?.scope,
      skip_mfa: true,
      strong_auth: true,
      assurance_level: 'PASSWORD',
      credential_authenticator: 'USERNAME_PASSWORD',
    });
  },

  async impersonateUserAsync(
    realmId: string,
    actorUserId: string,
    targetUserId: string,
    input?: {
      client_id?: string | null;
      scope?: string[] | null;
    },
  ): Promise<IamLoginResponse> {
    if (!(runtimeRepositoryMode.dualWrite || runtimeRepositoryMode.readV2)) {
      return runWithDeferredPersistence(() => this.impersonateUser(realmId, actorUserId, targetUserId, input));
    }

    return runWithDeferredPersistence(async () => {
      const targetUser = getRealmUserById(realmId, targetUserId);
      if (targetUser.status !== 'ACTIVE') {
        throw new Error('Target user is not active');
      }
      recordLoginAttempt({
        realmId,
        userId: targetUser.id,
        usernameOrEmail: targetUser.username,
        clientIdentifier: input?.client_id?.trim() || null,
        outcome: 'SUCCESS',
        summary: `Administrative impersonation login was issued by ${actorUserId}.`,
      });
      const client = getClientByPublicIdentifier(realmId, input?.client_id);
      const requestedScopeNames = Array.from(new Set((input?.scope ?? []).map((scope) => scope.trim()).filter(Boolean))).sort();
      const transaction = await createLoginTransactionAsync(targetUser, client, requestedScopeNames);
      return (await completeLoginStateAsync(transaction, {
        skip_mfa: true,
        strong_auth: true,
        assurance_level: 'PASSWORD',
        credential_authenticator: 'USERNAME_PASSWORD',
        passkey_enabled: LocalIamWebAuthnStore.getActiveCredentialCount(realmId, targetUser.id) > 0,
      })).response;
    });
  },

  completePasskeyLogin(
    realmId: string,
    userId: string,
    input: {
      client_id?: string | null;
      scope?: string[] | null;
    },
  ): IamLoginResponse {
    const user = getRealmUserById(realmId, userId);
    assertUserNotLocked(user);
    clearUserLockoutState(realmId, user.id);
    recordLoginAttempt({
      realmId,
      userId: user.id,
      usernameOrEmail: user.username,
      clientIdentifier: input.client_id?.trim() || null,
      outcome: 'SUCCESS',
      summary: 'Browser passkey challenge verification succeeded.',
    });
    return this.loginResolvedUser(realmId, userId, {
      client_id: input.client_id,
      scope: input.scope,
      skip_mfa: true,
      strong_auth: true,
      assurance_level: 'PASSKEY',
      credential_authenticator: 'PASSKEY_WEBAUTHN',
    });
  },

  async completePasskeyLoginAsync(
    realmId: string,
    userId: string,
    input: {
      client_id?: string | null;
      scope?: string[] | null;
    },
  ): Promise<IamLoginResponse> {
    if (!(runtimeRepositoryMode.dualWrite || runtimeRepositoryMode.readV2)) {
      return runWithDeferredPersistence(() => this.completePasskeyLogin(realmId, userId, input));
    }

    return runWithDeferredPersistence(async () => {
      const user = getRealmUserById(realmId, userId);
      assertUserNotLocked(user);
      clearUserLockoutState(realmId, user.id);
      recordLoginAttempt({
        realmId,
        userId: user.id,
        usernameOrEmail: user.username,
        clientIdentifier: input.client_id?.trim() || null,
        outcome: 'SUCCESS',
        summary: 'Browser passkey challenge verification succeeded.',
      });
      const client = getClientByPublicIdentifier(realmId, input.client_id);
      const requestedScopeNames = Array.from(new Set((input.scope ?? []).map((scope) => scope.trim()).filter(Boolean))).sort();
      const transaction = await createLoginTransactionAsync(user, client, requestedScopeNames);
      return (await completeLoginStateAsync(transaction, {
        skip_mfa: true,
        strong_auth: true,
        assurance_level: 'PASSKEY',
        credential_authenticator: 'PASSKEY_WEBAUTHN',
        passkey_enabled: true,
      })).response;
    });
  },

  recordFailedPasskeyLogin(
    realmId: string,
    userId: string,
    input: {
      username_or_email: string;
      client_id?: string | null;
      summary?: string;
    },
  ): { lockout_until: string | null } {
    const user = getRealmUserById(realmId, userId);
    const lockout = registerFailedLogin(user);
    recordLoginAttempt({
      realmId,
      userId: user.id,
      usernameOrEmail: input.username_or_email,
      clientIdentifier: input.client_id?.trim() || null,
      outcome: lockout.lockout_until && Date.parse(lockout.lockout_until) > Date.now() ? 'LOCKED' : 'FAILED_PASSKEY',
      summary: input.summary ?? (
        lockout.lockout_until && Date.parse(lockout.lockout_until) > Date.now()
          ? `Repeated passkey verification failures triggered lockout until ${lockout.lockout_until}.`
          : 'Passkey verification failed during browser login.'
      ),
    });
    return {
      lockout_until: lockout.lockout_until,
    };
  },

  async recordFailedPasskeyLoginAsync(
    realmId: string,
    userId: string,
    input: {
      username_or_email: string;
      client_id?: string | null;
      summary?: string;
    },
  ): Promise<{ lockout_until: string | null }> {
    return runWithDeferredPersistence(() => this.recordFailedPasskeyLogin(realmId, userId, input));
  },

  evaluateSessionInteraction(
    realmId: string,
    sessionId: string,
    input: RequestResolvedIamLoginInput,
  ): IamLoginResponse {
    const session = resolveAccountSession(realmId, sessionId, true);
    const user = getRealmUserById(realmId, session.user_id);
    if (user.status !== 'ACTIVE') {
      throw new Error('User is not active');
    }
    const client = getClientByPublicIdentifier(realmId, input.client_id);
    const requestedScopeNames = Array.from(new Set((input.scope ?? []).map((scope) => scope.trim()).filter(Boolean))).sort();
    const requiredActions = getOutstandingRequiredActions(user);
    const pendingConsent = determinePendingConsentScopes(user, client, requestedScopeNames);
    const flowDecision = LocalIamAuthFlowStore.evaluateLoginFlow({
      realm_id: realmId,
      client_id: client.id,
      flow_kind: 'BROWSER',
      credential_satisfied: true,
      satisfied_authenticator_kinds: ['USERNAME_PASSWORD', 'PASSKEY_WEBAUTHN'],
      mfa_satisfied: true,
      mfa_enabled: Boolean(getMfaState(realmId, user.id)),
      passkey_enabled: LocalIamWebAuthnStore.getActiveCredentialCount(realmId, user.id) > 0,
      required_actions: requiredActions,
      pending_scope_consent: pendingConsent,
    });
    return {
      realm_id: realmId,
      next_step: flowDecision.next_step === 'MFA_REQUIRED' ? 'AUTHENTICATED' : flowDecision.next_step,
      login_transaction_id: null,
      session_id: flowDecision.next_step === 'AUTHENTICATED' ? sessionId : null,
      user: summarizeUser(user),
      client: summarizeClient(client),
      pending_required_actions: flowDecision.pending_required_actions,
      pending_scope_consent: flowDecision.pending_scope_consent,
      pending_mfa: false,
      post_login_destination: getPostLoginDestination(client),
    };
  },

  completeRequiredActionsSyncOnly(realmId: string, input: CompleteIamRequiredActionsInput): IamLoginResponse {
    const transaction = assertLoginTransaction(realmId, input.login_transaction_id);
    const user = getRealmUserById(realmId, transaction.user_id);
    const outstanding = getOutstandingRequiredActions(user);
    const nextActions = [...user.required_actions];

    if (outstanding.includes('UPDATE_PROFILE')) {
      if (!input.first_name?.trim() || !input.last_name?.trim() || !input.email?.trim()) {
        throw new Error('UPDATE_PROFILE requires first_name, last_name, and email');
      }
      LocalIamFoundationStore.updateUser(user.id, user.id, {
        first_name: input.first_name,
        last_name: input.last_name,
        email: input.email,
      });
      const actionIndex = nextActions.indexOf('UPDATE_PROFILE');
      if (actionIndex >= 0) {
        nextActions.splice(actionIndex, 1);
      }
    }

    if (outstanding.includes('UPDATE_PASSWORD')) {
      if (!input.new_password?.trim()) {
        throw new Error('UPDATE_PASSWORD requires new_password');
      }
      LocalIamProtocolRuntimeStore.setUserPasswordSyncOnly(realmId, user.id, input.new_password.trim());
      const security = getSecurityState(user);
      security.last_password_updated_at = nowIso();
      const actionIndex = nextActions.indexOf('UPDATE_PASSWORD');
      if (actionIndex >= 0) {
        nextActions.splice(actionIndex, 1);
      }
    }

    if (outstanding.includes('VERIFY_EMAIL')) {
      const security = getSecurityState(user);
      if (!security.email_verified_at) {
        throw new Error('VERIFY_EMAIL must be completed before continuing');
      }
      const actionIndex = nextActions.indexOf('VERIFY_EMAIL');
      if (actionIndex >= 0) {
        nextActions.splice(actionIndex, 1);
      }
    }

    LocalIamFoundationStore.updateUser(user.id, user.id, {
      required_actions: nextActions,
    });

    return completeLoginState(transaction).response;
  },

  async completeRequiredActionsAsync(
    realmId: string,
    input: CompleteIamRequiredActionsInput,
  ): Promise<IamLoginResponse> {
    return runWithDeferredPersistence(async () => {
      const transaction = runtimeRepositoryMode.dualWrite || runtimeRepositoryMode.readV2
        ? await assertLoginTransactionAsync(realmId, input.login_transaction_id)
        : assertLoginTransaction(realmId, input.login_transaction_id);
      const user = getRealmUserById(realmId, transaction.user_id);
      const outstanding = getOutstandingRequiredActions(user);
      const nextActions = [...user.required_actions];

      if (outstanding.includes('UPDATE_PROFILE')) {
        if (!input.first_name?.trim() || !input.last_name?.trim() || !input.email?.trim()) {
          throw new Error('UPDATE_PROFILE requires first_name, last_name, and email');
        }
        await LocalIamFoundationStore.updateUserAsync(user.id, user.id, {
          first_name: input.first_name,
          last_name: input.last_name,
          email: input.email,
        });
        const actionIndex = nextActions.indexOf('UPDATE_PROFILE');
        if (actionIndex >= 0) {
          nextActions.splice(actionIndex, 1);
        }
      }

      if (outstanding.includes('UPDATE_PASSWORD')) {
        if (!input.new_password?.trim()) {
          throw new Error('UPDATE_PASSWORD requires new_password');
        }
        await LocalIamProtocolRuntimeStore.setUserPasswordAsync(realmId, user.id, input.new_password.trim());
        const security = getSecurityState(user);
        security.last_password_updated_at = nowIso();
        const actionIndex = nextActions.indexOf('UPDATE_PASSWORD');
        if (actionIndex >= 0) {
          nextActions.splice(actionIndex, 1);
        }
      }

      if (outstanding.includes('VERIFY_EMAIL')) {
        const security = getSecurityState(user);
        if (!security.email_verified_at) {
          throw new Error('VERIFY_EMAIL must be completed before continuing');
        }
        const actionIndex = nextActions.indexOf('VERIFY_EMAIL');
        if (actionIndex >= 0) {
          nextActions.splice(actionIndex, 1);
        }
      }

      await LocalIamFoundationStore.updateUserAsync(user.id, user.id, {
        required_actions: nextActions,
      });

      if (runtimeRepositoryMode.dualWrite || runtimeRepositoryMode.readV2) {
        return (await completeLoginStateAsync(transaction)).response;
      }
      return completeLoginState(transaction).response;
    });
  },

  grantConsent(realmId: string, input: CompleteIamConsentInput): IamLoginResponse {
    const transaction = assertLoginTransaction(realmId, input.login_transaction_id);
    if (!input.approve) {
      transaction.cancelled_at = nowIso();
      transaction.status = 'CANCELLED';
      persistStateSyncOnly();
      throw new Error('User denied consent');
    }
    const user = getRealmUserById(realmId, transaction.user_id);
    const client = transaction.client_identifier ? getClientByPublicIdentifier(realmId, transaction.client_identifier) : null;
    if (!client) {
      throw new Error('Consent requires a target client');
    }
    upsertConsent(user, client, transaction.pending_scope_consent);
    transaction.pending_scope_consent = [];
    return completeLoginState(transaction).response;
  },

  async grantConsentAsync(realmId: string, input: CompleteIamConsentInput): Promise<IamLoginResponse> {
    if (!(runtimeRepositoryMode.dualWrite || runtimeRepositoryMode.readV2)) {
      return runWithDeferredPersistence(() => this.grantConsent(realmId, input));
    }

    return runWithDeferredPersistence(async () => {
      const transaction = await assertLoginTransactionAsync(realmId, input.login_transaction_id);
      if (!input.approve) {
        transaction.cancelled_at = nowIso();
        transaction.status = 'CANCELLED';
        await loginTransactionAsyncStore.put(transaction);
        throw new Error('User denied consent');
      }
      const user = getRealmUserById(realmId, transaction.user_id);
      const client = transaction.client_identifier ? getClientByPublicIdentifier(realmId, transaction.client_identifier) : null;
      if (!client) {
        throw new Error('Consent requires a target client');
      }
      upsertConsent(user, client, transaction.pending_scope_consent);
      transaction.pending_scope_consent = [];
      return (await completeLoginStateAsync(transaction)).response;
    });
  },

  verifyLoginMfa(realmId: string, input: CompleteIamMfaInput): IamLoginResponse {
    const transaction = assertLoginTransaction(realmId, input.login_transaction_id);
    const user = getRealmUserById(realmId, transaction.user_id);
    const client = transaction.client_identifier ? getClientByPublicIdentifier(realmId, transaction.client_identifier) : null;
    const mfaState = getMfaState(realmId, user.id);
    if (!mfaState) {
      throw new Error('MFA is not enabled for this user');
    }
    if (!verifyActiveMfaCode(mfaState, input.code)) {
      const lockout = registerFailedLogin(user);
      recordLoginAttempt({
        realmId,
        userId: user.id,
        usernameOrEmail: user.username,
        clientIdentifier: client?.client_id ?? null,
        outcome: lockout.lockout_until && Date.parse(lockout.lockout_until) > Date.now() ? 'LOCKED' : 'FAILED_MFA',
        summary: lockout.lockout_until && Date.parse(lockout.lockout_until) > Date.now()
          ? `Repeated MFA verification failures triggered lockout until ${lockout.lockout_until}.`
          : 'MFA verification failed during browser login.',
      });
      if (lockout.lockout_until && Date.parse(lockout.lockout_until) > Date.now()) {
        throw new Error(`Account is temporarily locked until ${lockout.lockout_until}`);
      }
      throw new Error('Invalid MFA code');
    }
    clearUserLockoutState(realmId, user.id);
    const security = getSecurityState(user);
    security.last_mfa_authenticated_at = nowIso();
    const createdSession = createSession(user, client, transaction.requested_scope_names, 'MFA', {
      federated_login_context: transaction.federated_login_context,
    });
    const session = createdSession.session;
    recordFederatedLoginSessionLink(
      user.realm_id,
      user.id,
      createdSession.session_token,
      transaction.federated_login_context,
    );
    transaction.pending_mfa = false;
    transaction.status = 'COMPLETE';
    transaction.completed_at = nowIso();
    persistStateSyncOnly();
    return {
      realm_id: realmId,
      next_step: 'AUTHENTICATED',
      login_transaction_id: transaction.id,
      session_id: createdSession.session_token,
      user: summarizeUser(user),
      client: summarizeClient(client),
      pending_required_actions: [],
      pending_scope_consent: [],
      pending_mfa: false,
      post_login_destination: getPostLoginDestination(client),
    };
  },

  async verifyLoginMfaAsync(realmId: string, input: CompleteIamMfaInput): Promise<IamLoginResponse> {
    if (!(runtimeRepositoryMode.dualWrite || runtimeRepositoryMode.readV2)) {
      return runWithDeferredPersistence(() => this.verifyLoginMfa(realmId, input));
    }

    return runWithDeferredPersistence(async () => {
      const transaction = await assertLoginTransactionAsync(realmId, input.login_transaction_id);
      const user = getRealmUserById(realmId, transaction.user_id);
      const client = transaction.client_identifier ? getClientByPublicIdentifier(realmId, transaction.client_identifier) : null;
      const mfaState = getMfaState(realmId, user.id);
      if (!mfaState) {
        throw new Error('MFA is not enabled for this user');
      }
      if (!verifyActiveMfaCode(mfaState, input.code)) {
        const lockout = registerFailedLogin(user);
        recordLoginAttempt({
          realmId,
          userId: user.id,
          usernameOrEmail: user.username,
          clientIdentifier: client?.client_id ?? null,
          outcome: lockout.lockout_until && Date.parse(lockout.lockout_until) > Date.now() ? 'LOCKED' : 'FAILED_MFA',
          summary: lockout.lockout_until && Date.parse(lockout.lockout_until) > Date.now()
            ? `Repeated MFA verification failures triggered lockout until ${lockout.lockout_until}.`
            : 'MFA verification failed during browser login.',
        });
        if (lockout.lockout_until && Date.parse(lockout.lockout_until) > Date.now()) {
          throw new Error(`Account is temporarily locked until ${lockout.lockout_until}`);
        }
        throw new Error('Invalid MFA code');
      }
      clearUserLockoutState(realmId, user.id);
      const security = getSecurityState(user);
      security.last_mfa_authenticated_at = nowIso();
      const createdSession = await createSessionAsync(user, client, transaction.requested_scope_names, 'MFA', {
        federated_login_context: transaction.federated_login_context,
      });
      recordFederatedLoginSessionLink(
        user.realm_id,
        user.id,
        createdSession.session_token,
        transaction.federated_login_context,
      );
      transaction.pending_mfa = false;
      transaction.status = 'COMPLETE';
      transaction.completed_at = nowIso();
      await loginTransactionAsyncStore.put(transaction);
      return {
        realm_id: realmId,
        next_step: 'AUTHENTICATED',
        login_transaction_id: transaction.id,
        session_id: createdSession.session_token,
        user: summarizeUser(user),
        client: summarizeClient(client),
        pending_required_actions: [],
        pending_scope_consent: [],
        pending_mfa: false,
        post_login_destination: getPostLoginDestination(client),
      };
    });
  },

  requestPasswordReset(realmId: string, input: RequestIamPasswordResetInput): IamPasswordResetTicketResponse {
    const user = findRealmUserByIdentifier(realmId, input.username_or_email);
    if (!user) {
      return {
        ticket_id: `iam-password-reset-${randomUUID()}`,
        realm_id: realmId,
        user_id: 'unknown-user',
        delivery_mode: 'OUT_OF_BAND',
        code_preview: null,
        expires_at: new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString(),
      };
    }
    const code = generateNumericCode();
    const includePreview = isLocalValidationPreviewEnabled();
    const ticket: StoredIamPasswordResetTicket = {
      id: `iam-password-reset-${randomUUID()}`,
      realm_id: realmId,
      user_id: user.id,
      code_hash: hashCode(code),
      code_preview: includePreview ? code : null,
      issued_at: nowIso(),
      expires_at: new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString(),
      status: 'PENDING',
      consumed_at: null,
    };
    ticketStore.addPasswordResetTicket(ticket);
    persistStateSyncOnly();
    return {
      ticket_id: ticket.id,
      realm_id: realmId,
      user_id: user.id,
      delivery_mode: ticket.code_preview ? 'LOCAL_VALIDATION_PREVIEW' : 'OUT_OF_BAND',
      code_preview: ticket.code_preview,
      expires_at: ticket.expires_at,
    };
  },

  async requestPasswordResetAsync(
    realmId: string,
    input: RequestIamPasswordResetInput,
  ): Promise<IamPasswordResetTicketResponse> {
    if (!(runtimeRepositoryMode.dualWrite || runtimeRepositoryMode.readV2)) {
      return runWithDeferredPersistence(() => this.requestPasswordReset(realmId, input));
    }

    return runWithDeferredPersistence(async () => {
      const user = findRealmUserByIdentifier(realmId, input.username_or_email);
      if (!user) {
        return {
          ticket_id: `iam-password-reset-${randomUUID()}`,
          realm_id: realmId,
          user_id: 'unknown-user',
          delivery_mode: 'OUT_OF_BAND',
          code_preview: null,
          expires_at: new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString(),
        };
      }
      const code = generateNumericCode();
      const includePreview = isLocalValidationPreviewEnabled();
      const ticket: StoredIamPasswordResetTicket = {
        id: `iam-password-reset-${randomUUID()}`,
        realm_id: realmId,
        user_id: user.id,
        code_hash: hashCode(code),
        code_preview: includePreview ? code : null,
        issued_at: nowIso(),
        expires_at: new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString(),
        status: 'PENDING',
        consumed_at: null,
      };
      await ticketAsyncStore.addPasswordResetTicket(ticket);
      return {
        ticket_id: ticket.id,
        realm_id: realmId,
        user_id: user.id,
        delivery_mode: ticket.code_preview ? 'LOCAL_VALIDATION_PREVIEW' : 'OUT_OF_BAND',
        code_preview: ticket.code_preview,
        expires_at: ticket.expires_at,
      };
    });
  },

  confirmPasswordResetSyncOnly(realmId: string, input: ConfirmIamPasswordResetInput): { realm_id: string; user_id: string; password_updated_at: string } {
    const ticket = ticketStore.getPasswordResetTicket(realmId, input.ticket_id);
    if (!ticket) {
      throw new Error('Unknown password reset ticket');
    }
    if (ticket.status !== 'PENDING' || ticket.consumed_at || Date.parse(ticket.expires_at) <= Date.now()) {
      ticket.status = 'EXPIRED';
      persistStateSyncOnly();
      throw new Error('Password reset ticket is not active');
    }
    if (ticket.code_hash !== hashCode(normalizeCode(input.code))) {
      throw new Error('Invalid password reset code');
    }
    LocalIamProtocolRuntimeStore.setUserPasswordSyncOnly(realmId, ticket.user_id, input.new_password.trim());
    const user = getRealmUserById(realmId, ticket.user_id);
    const nextActions = user.required_actions.filter((action) => action !== 'UPDATE_PASSWORD');
    LocalIamFoundationStore.updateUser(user.id, user.id, { required_actions: nextActions });
    const security = getSecurityState(user);
    security.last_password_updated_at = nowIso();
    clearUserLockoutState(realmId, user.id);
    ticket.status = 'CONSUMED';
    ticket.consumed_at = nowIso();
    persistStateSyncOnly();
    return {
      realm_id: realmId,
      user_id: user.id,
      password_updated_at: security.last_password_updated_at!,
    };
  },

  async confirmPasswordResetAsync(
    realmId: string,
    input: ConfirmIamPasswordResetInput,
  ): Promise<{ realm_id: string; user_id: string; password_updated_at: string }> {
    if (!(runtimeRepositoryMode.dualWrite || runtimeRepositoryMode.readV2)) {
      return runWithDeferredPersistence(() => this.confirmPasswordResetSyncOnly(realmId, input));
    }

    return runWithDeferredPersistence(async () => {
      const ticket = await ticketAsyncStore.getPasswordResetTicket(realmId, input.ticket_id);
      if (!ticket) {
        throw new Error('Unknown password reset ticket');
      }
      if (ticket.status !== 'PENDING' || ticket.consumed_at || Date.parse(ticket.expires_at) <= Date.now()) {
        ticket.status = 'EXPIRED';
        await ticketAsyncStore.putPasswordResetTicket(ticket);
        throw new Error('Password reset ticket is not active');
      }
      if (ticket.code_hash !== hashCode(normalizeCode(input.code))) {
        throw new Error('Invalid password reset code');
      }
      await LocalIamProtocolRuntimeStore.setUserPasswordAsync(realmId, ticket.user_id, input.new_password.trim());
      const user = getRealmUserById(realmId, ticket.user_id);
      const nextActions = user.required_actions.filter((action) => action !== 'UPDATE_PASSWORD');
      await LocalIamFoundationStore.updateUserAsync(user.id, user.id, { required_actions: nextActions });
      const security = getSecurityState(user);
      security.last_password_updated_at = nowIso();
      clearUserLockoutState(realmId, user.id);
      ticket.status = 'CONSUMED';
      ticket.consumed_at = nowIso();
      await ticketAsyncStore.putPasswordResetTicket(ticket);
      return {
        realm_id: realmId,
        user_id: user.id,
        password_updated_at: security.last_password_updated_at!,
      };
    });
  },

  requestEmailVerification(realmId: string, input: RequestIamEmailVerificationInput): IamEmailVerificationTicketResponse {
    const user = findRealmUserByIdentifier(realmId, input.username_or_email);
    if (!user) {
      return {
        ticket_id: `iam-email-verify-${randomUUID()}`,
        realm_id: realmId,
        user_id: 'unknown-user',
        delivery_mode: 'OUT_OF_BAND',
        code_preview: null,
        expires_at: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS).toISOString(),
      };
    }
    const code = generateNumericCode();
    const includePreview = isLocalValidationPreviewEnabled();
    const ticket: StoredIamEmailVerificationTicket = {
      id: `iam-email-verify-${randomUUID()}`,
      realm_id: realmId,
      user_id: user.id,
      code_hash: hashCode(code),
      code_preview: includePreview ? code : null,
      issued_at: nowIso(),
      expires_at: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS).toISOString(),
      status: 'PENDING',
      consumed_at: null,
    };
    ticketStore.addEmailVerificationTicket(ticket);
    persistStateSyncOnly();
    return {
      ticket_id: ticket.id,
      realm_id: realmId,
      user_id: user.id,
      delivery_mode: ticket.code_preview ? 'LOCAL_VALIDATION_PREVIEW' : 'OUT_OF_BAND',
      code_preview: ticket.code_preview,
      expires_at: ticket.expires_at,
    };
  },

  async requestEmailVerificationAsync(
    realmId: string,
    input: RequestIamEmailVerificationInput,
  ): Promise<IamEmailVerificationTicketResponse> {
    if (!(runtimeRepositoryMode.dualWrite || runtimeRepositoryMode.readV2)) {
      return runWithDeferredPersistence(() => this.requestEmailVerification(realmId, input));
    }

    return runWithDeferredPersistence(async () => {
      const user = findRealmUserByIdentifier(realmId, input.username_or_email);
      if (!user) {
        return {
          ticket_id: `iam-email-verify-${randomUUID()}`,
          realm_id: realmId,
          user_id: 'unknown-user',
          delivery_mode: 'OUT_OF_BAND',
          code_preview: null,
          expires_at: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS).toISOString(),
        };
      }
      const code = generateNumericCode();
      const includePreview = isLocalValidationPreviewEnabled();
      const ticket: StoredIamEmailVerificationTicket = {
        id: `iam-email-verify-${randomUUID()}`,
        realm_id: realmId,
        user_id: user.id,
        code_hash: hashCode(code),
        code_preview: includePreview ? code : null,
        issued_at: nowIso(),
        expires_at: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS).toISOString(),
        status: 'PENDING',
        consumed_at: null,
      };
      await ticketAsyncStore.addEmailVerificationTicket(ticket);
      return {
        ticket_id: ticket.id,
        realm_id: realmId,
        user_id: user.id,
        delivery_mode: ticket.code_preview ? 'LOCAL_VALIDATION_PREVIEW' : 'OUT_OF_BAND',
        code_preview: ticket.code_preview,
        expires_at: ticket.expires_at,
      };
    });
  },

  confirmEmailVerification(realmId: string, input: ConfirmIamEmailVerificationInput): { realm_id: string; user_id: string; email_verified_at: string } {
    const ticket = ticketStore.getEmailVerificationTicket(realmId, input.ticket_id);
    if (!ticket) {
      throw new Error('Unknown email verification ticket');
    }
    if (ticket.status !== 'PENDING' || ticket.consumed_at || Date.parse(ticket.expires_at) <= Date.now()) {
      ticket.status = 'EXPIRED';
      persistStateSyncOnly();
      throw new Error('Email verification ticket is not active');
    }
    if (ticket.code_hash !== hashCode(normalizeCode(input.code))) {
      throw new Error('Invalid email verification code');
    }
    const user = getRealmUserById(realmId, ticket.user_id);
    const security = getSecurityState(user);
    security.email_verified_at = nowIso();
    const nextActions = user.required_actions.filter((action) => action !== 'VERIFY_EMAIL');
    LocalIamFoundationStore.updateUser(user.id, user.id, {
      required_actions: nextActions,
    });
    ticket.status = 'CONSUMED';
    ticket.consumed_at = nowIso();
    persistStateSyncOnly();
    return {
      realm_id: realmId,
      user_id: user.id,
      email_verified_at: security.email_verified_at,
    };
  },

  async confirmEmailVerificationAsync(
    realmId: string,
    input: ConfirmIamEmailVerificationInput,
  ): Promise<{ realm_id: string; user_id: string; email_verified_at: string }> {
    if (!(runtimeRepositoryMode.dualWrite || runtimeRepositoryMode.readV2)) {
      return runWithDeferredPersistence(() => this.confirmEmailVerification(realmId, input));
    }

    return runWithDeferredPersistence(async () => {
      const ticket = await ticketAsyncStore.getEmailVerificationTicket(realmId, input.ticket_id);
      if (!ticket) {
        throw new Error('Unknown email verification ticket');
      }
      if (ticket.status !== 'PENDING' || ticket.consumed_at || Date.parse(ticket.expires_at) <= Date.now()) {
        ticket.status = 'EXPIRED';
        await ticketAsyncStore.putEmailVerificationTicket(ticket);
        throw new Error('Email verification ticket is not active');
      }
      if (ticket.code_hash !== hashCode(normalizeCode(input.code))) {
        throw new Error('Invalid email verification code');
      }
      const user = getRealmUserById(realmId, ticket.user_id);
      const security = getSecurityState(user);
      security.email_verified_at = nowIso();
      const nextActions = user.required_actions.filter((action) => action !== 'VERIFY_EMAIL');
      await LocalIamFoundationStore.updateUserAsync(user.id, user.id, {
        required_actions: nextActions,
      });
      ticket.status = 'CONSUMED';
      ticket.consumed_at = nowIso();
      await ticketAsyncStore.putEmailVerificationTicket(ticket);
      return {
        realm_id: realmId,
        user_id: user.id,
        email_verified_at: security.email_verified_at,
      };
    });
  },

  logout(realmId: string, sessionId: string): { revoked: boolean; revoked_at: string | null } {
    const session = resolveAccountSessionWithActivityOption(realmId, sessionId, false, false);
    if (!session.revoked_at) {
      session.revoked_at = nowIso();
    }
    persistStateSyncOnly();
    return {
      revoked: true,
      revoked_at: session.revoked_at,
    };
  },

  async logoutAsync(realmId: string, sessionId: string): Promise<{ revoked: boolean; revoked_at: string | null }> {
    if (!(runtimeRepositoryMode.dualWrite || runtimeRepositoryMode.readV2)) {
      return runWithDeferredPersistence(async () => {
        const result = this.logout(realmId, sessionId);
        await revokeIssuedTokensForBrowserSessionsAsync(realmId, [sessionId]);
        await terminateLinkedSamlSessionsForBrowserSessionsAsync(realmId, [sessionId]);
        await terminateFederatedSessionLinksForBrowserSessionsAsync(realmId, [sessionId]);
        return result;
      });
    }

    return runWithDeferredPersistence(async () => {
      const session = await resolveAccountSessionAsyncWithActivityOption(realmId, sessionId, false, false);
      if (!session.revoked_at) {
        session.revoked_at = nowIso();
      }
      await sessionAsyncStore.put(session);
      await revokeIssuedTokensForBrowserSessionsAsync(realmId, [sessionId]);
      await terminateLinkedSamlSessionsForBrowserSessionsAsync(realmId, [sessionId]);
      await terminateFederatedSessionLinksForBrowserSessionsAsync(realmId, [sessionId]);
      return {
        revoked: true,
        revoked_at: session.revoked_at,
      };
    });
  },

  resolveAccountSession(realmId: string, sessionId: string): IamAccountSessionContextResponse {
    const session = resolveAccountSession(realmId, sessionId, true);
    const user = getRealmUserById(realmId, session.user_id);
    const security = getSecurityState(user);
    return {
      realm_id: realmId,
      session: summarizeSession(session, session.id),
      user: summarizeUser(user),
      email_verified_at: security.email_verified_at,
      pending_required_actions: getOutstandingRequiredActions(user),
      mfa_enabled: Boolean(getMfaState(realmId, user.id)),
    };
  },

  async resolveAccountSessionAsync(realmId: string, sessionId: string): Promise<IamAccountSessionContextResponse> {
    if (!(runtimeRepositoryMode.dualWrite || runtimeRepositoryMode.readV2)) {
      return this.resolveAccountSession(realmId, sessionId);
    }

    const session = await resolveAccountSessionAsync(realmId, sessionId, true);
    const user = getRealmUserById(realmId, session.user_id);
    const security = getSecurityState(user);
    return {
      realm_id: realmId,
      session: summarizeSession(session, session.id),
      user: summarizeUser(user),
      email_verified_at: security.email_verified_at,
      pending_required_actions: getOutstandingRequiredActions(user),
      mfa_enabled: Boolean(getMfaState(realmId, user.id)),
    };
  },

  isAccountSessionActiveForRuntime(realmId: string, sessionId: string): boolean {
    return isAccountSessionActiveForRuntime(realmId, sessionId);
  },

  getAccountProfile(realmId: string, sessionId: string): IamAccountProfileResponse {
    const session = resolveAccountSession(realmId, sessionId, true);
    return buildAccountProfileResponse(realmId, session.user_id);
  },

  getAccountProfileByUser(realmId: string, userId: string): IamAccountProfileResponse {
    return buildAccountProfileResponse(realmId, userId);
  },

  updateAccountProfile(realmId: string, sessionId: string, input: UpdateIamAccountProfileInput): IamAccountProfileResponse {
    const session = resolveAccountSession(realmId, sessionId, true);
    return this.updateAccountProfileByUser(realmId, session.user_id, input);
  },

  async updateAccountProfileAsync(
    realmId: string,
    sessionId: string,
    input: UpdateIamAccountProfileInput,
  ): Promise<IamAccountProfileResponse> {
    return runWithDeferredPersistence(async () => {
      const session = await resolveAccountSessionAsync(realmId, sessionId, true);
      const user = getRealmUserById(realmId, session.user_id);
      const previousEmail = user.email;
      await LocalIamFoundationStore.updateUserAsync(user.id, user.id, {
        first_name: input.first_name ?? user.first_name,
        last_name: input.last_name ?? user.last_name,
        email: input.email ?? user.email,
      });
      const updatedUser = getRealmUserById(realmId, user.id);
      const security = getSecurityState(updatedUser);
      if (input.email && input.email.trim().toLowerCase() !== previousEmail.toLowerCase()) {
        security.email_verified_at = null;
        const nextActions = Array.from(new Set([...updatedUser.required_actions, 'VERIFY_EMAIL']));
        await LocalIamFoundationStore.updateUserAsync(updatedUser.id, updatedUser.id, {
          required_actions: nextActions,
        });
      }
      if (input.attributes) {
        await LocalIamUserProfileStore.updateUserProfileAsync(updatedUser.id, realmId, updatedUser.id, {
          attributes: input.attributes,
        }, 'SELF');
      }
      persistStateSyncOnly();
      return this.getAccountProfileByUser(realmId, updatedUser.id);
    });
  },

  updateAccountProfileByUser(realmId: string, userId: string, input: UpdateIamAccountProfileInput): IamAccountProfileResponse {
    const user = getRealmUserById(realmId, userId);
    const previousEmail = user.email;
    LocalIamFoundationStore.updateUser(user.id, user.id, {
      first_name: input.first_name ?? user.first_name,
      last_name: input.last_name ?? user.last_name,
      email: input.email ?? user.email,
    });
    const updatedUser = getRealmUserById(realmId, user.id);
    const security = getSecurityState(updatedUser);
    if (input.email && input.email.trim().toLowerCase() !== previousEmail.toLowerCase()) {
      security.email_verified_at = null;
      const nextActions = Array.from(new Set([...updatedUser.required_actions, 'VERIFY_EMAIL']));
      LocalIamFoundationStore.updateUser(updatedUser.id, updatedUser.id, {
        required_actions: nextActions,
      });
    }
    if (input.attributes) {
      LocalIamUserProfileStore.updateUserProfile(updatedUser.id, realmId, updatedUser.id, {
        attributes: input.attributes,
      }, 'SELF');
    }
    persistStateSyncOnly();
    return this.getAccountProfileByUser(realmId, updatedUser.id);
  },

  getAccountSecurity(realmId: string, sessionId: string): IamAccountSecurityResponse {
    const session = resolveAccountSession(realmId, sessionId, true);
    return buildAccountSecurityResponse(realmId, session.user_id);
  },

  getAccountSecurityByUser(realmId: string, userId: string): IamAccountSecurityResponse {
    return buildAccountSecurityResponse(realmId, userId);
  },

  changePassword(realmId: string, sessionId: string, input: ChangeIamAccountPasswordInput): { password_updated_at: string } {
    const session = resolveAccountSession(realmId, sessionId, true);
    return this.changePasswordByUserSyncOnly(realmId, session.user_id, input);
  },

  async changePasswordAsync(
    realmId: string,
    sessionId: string,
    input: ChangeIamAccountPasswordInput,
  ): Promise<{ password_updated_at: string }> {
    return runWithDeferredPersistence(async () => {
      const session = await resolveAccountSessionAsync(realmId, sessionId, true);
      const user = getRealmUserById(realmId, session.user_id);
      const validated = LocalIamProtocolRuntimeStore.validateUserCredentials(realmId, user.username, input.current_password);
      if (validated.id !== user.id) {
        throw new Error('Current password is invalid');
      }
      await LocalIamProtocolRuntimeStore.setUserPasswordAsync(realmId, user.id, input.new_password.trim());
      const security = getSecurityState(user);
      security.last_password_updated_at = nowIso();
      const nextActions = user.required_actions.filter((action) => action !== 'UPDATE_PASSWORD');
      await LocalIamFoundationStore.updateUserAsync(user.id, user.id, {
        required_actions: nextActions,
      });
      clearUserLockoutState(realmId, user.id);
      persistStateSyncOnly();
      return {
        password_updated_at: security.last_password_updated_at,
      };
    });
  },

  changePasswordByUserSyncOnly(realmId: string, userId: string, input: ChangeIamAccountPasswordInput): { password_updated_at: string } {
    const user = getRealmUserById(realmId, userId);
    const validated = LocalIamProtocolRuntimeStore.validateUserCredentials(realmId, user.username, input.current_password);
    if (validated.id !== user.id) {
      throw new Error('Current password is invalid');
    }
    LocalIamProtocolRuntimeStore.setUserPasswordSyncOnly(realmId, user.id, input.new_password.trim());
    const security = getSecurityState(user);
    security.last_password_updated_at = nowIso();
    const nextActions = user.required_actions.filter((action) => action !== 'UPDATE_PASSWORD');
    LocalIamFoundationStore.updateUser(user.id, user.id, {
      required_actions: nextActions,
    });
    clearUserLockoutState(realmId, user.id);
    persistStateSyncOnly();
    return {
      password_updated_at: security.last_password_updated_at,
    };
  },

  beginMfaEnrollment(realmId: string, sessionId: string): BeginIamMfaEnrollmentResponse {
    const session = resolveAccountSession(realmId, sessionId, true);
    return this.beginMfaEnrollmentByUser(realmId, session.user_id);
  },

  async beginMfaEnrollmentAsync(realmId: string, sessionId: string): Promise<BeginIamMfaEnrollmentResponse> {
    if (!(runtimeRepositoryMode.dualWrite || runtimeRepositoryMode.readV2)) {
      return runWithDeferredPersistence(() => this.beginMfaEnrollment(realmId, sessionId));
    }

    return runWithDeferredPersistence(async () => {
      const session = await resolveAccountSessionAsync(realmId, sessionId, true);
      const user = getRealmUserById(realmId, session.user_id);
      if (getMfaState(realmId, user.id)) {
        throw new Error('MFA is already enabled for this user');
      }
      const pending: StoredPendingIamMfaEnrollment = {
        id: `iam-mfa-enrollment-${randomUUID()}`,
        realm_id: realmId,
        user_id: user.id,
        secret: generateTotpSecret(),
        backup_codes: generateBackupCodes(),
        created_at: nowIso(),
        expires_at: new Date(Date.now() + PENDING_MFA_TTL_MS).toISOString(),
        consumed_at: null,
      };
      await ticketAsyncStore.replacePendingMfaEnrollmentForUser(realmId, user.id, pending);
      return {
        enrollment_id: pending.id,
        realm_id: realmId,
        user_id: user.id,
        otpauth_uri: `otpauth://totp/Standalone-IAM:${encodeURIComponent(user.email)}?secret=${pending.secret}&issuer=Standalone-IAM`,
        shared_secret: pending.secret,
        backup_codes: [...pending.backup_codes],
        expires_at: pending.expires_at,
      };
    });
  },

  beginMfaEnrollmentByUser(realmId: string, userId: string): BeginIamMfaEnrollmentResponse {
    const user = getRealmUserById(realmId, userId);
    if (getMfaState(realmId, user.id)) {
      throw new Error('MFA is already enabled for this user');
    }
    const pending: StoredPendingIamMfaEnrollment = {
      id: `iam-mfa-enrollment-${randomUUID()}`,
      realm_id: realmId,
      user_id: user.id,
      secret: generateTotpSecret(),
      backup_codes: generateBackupCodes(),
      created_at: nowIso(),
      expires_at: new Date(Date.now() + PENDING_MFA_TTL_MS).toISOString(),
      consumed_at: null,
    };
    ticketStore.replacePendingMfaEnrollmentForUser(realmId, user.id, pending);
    persistStateSyncOnly();
    return {
      enrollment_id: pending.id,
      realm_id: realmId,
      user_id: user.id,
      otpauth_uri: `otpauth://totp/Standalone-IAM:${encodeURIComponent(user.email)}?secret=${pending.secret}&issuer=Standalone-IAM`,
      shared_secret: pending.secret,
      backup_codes: [...pending.backup_codes],
      expires_at: pending.expires_at,
    };
  },

  verifyMfaEnrollment(realmId: string, sessionId: string, input: VerifyIamMfaEnrollmentInput): IamAccountSecurityResponse {
    const session = resolveAccountSession(realmId, sessionId, true);
    return this.verifyMfaEnrollmentByUser(realmId, session.user_id, input);
  },

  async verifyMfaEnrollmentAsync(
    realmId: string,
    sessionId: string,
    input: VerifyIamMfaEnrollmentInput,
  ): Promise<IamAccountSecurityResponse> {
    if (!(runtimeRepositoryMode.dualWrite || runtimeRepositoryMode.readV2)) {
      return runWithDeferredPersistence(() => this.verifyMfaEnrollment(realmId, sessionId, input));
    }

    return runWithDeferredPersistence(async () => {
      const session = await resolveAccountSessionAsync(realmId, sessionId, true);
      const user = getRealmUserById(realmId, session.user_id);
      const pending = await ticketAsyncStore.getPendingMfaEnrollment(realmId, user.id, input.enrollment_id);
      if (!pending || pending.consumed_at || Date.parse(pending.expires_at) <= Date.now()) {
        throw new Error('Pending MFA enrollment is not active');
      }
      if (!verifyTotpCode(pending.secret, input.code)) {
        throw new Error('Invalid MFA verification code');
      }
      const totpReference = LocalSecretStore.upsertOpaqueSecret({
        subjectType: 'iam_user',
        subjectId: `${realmId}:${user.id}`,
        kind: 'totp_seed',
        label: `${user.id} TOTP seed`,
        value: pending.secret,
        createdByUserId: user.id,
        preview: `totp_seed_${user.id}`,
      });
      const backupReference = LocalSecretStore.upsertOpaqueSecret({
        subjectType: 'iam_user',
        subjectId: `${realmId}:${user.id}`,
        kind: 'backup_code_bundle',
        label: `${user.id} backup code bundle`,
        value: JSON.stringify(pending.backup_codes),
        createdByUserId: user.id,
        preview: `backup_codes_${user.id}`,
      });
      const mfaStates = mfaStateRepository.load().filter(
        (candidate) => !(candidate.realm_id === realmId && candidate.user_id === user.id),
      );
      mfaStates.push({
        realm_id: realmId,
        user_id: user.id,
        totp_reference_id: totpReference.id,
        backup_codes_reference_id: backupReference.id,
        enrolled_at: nowIso(),
        disabled_at: null,
      });
      mfaStateRepository.save(mfaStates);
      pending.consumed_at = nowIso();
      await ticketAsyncStore.putPendingMfaEnrollment(pending);
      return this.getAccountSecurityByUser(realmId, user.id);
    });
  },

  verifyMfaEnrollmentByUser(realmId: string, userId: string, input: VerifyIamMfaEnrollmentInput): IamAccountSecurityResponse {
    const user = getRealmUserById(realmId, userId);
    const pending = ticketStore.getPendingMfaEnrollment(realmId, user.id, input.enrollment_id);
    if (!pending || pending.consumed_at || Date.parse(pending.expires_at) <= Date.now()) {
      throw new Error('Pending MFA enrollment is not active');
    }
    if (!verifyTotpCode(pending.secret, input.code)) {
      throw new Error('Invalid MFA verification code');
    }
    const totpReference = LocalSecretStore.upsertOpaqueSecret({
      subjectType: 'iam_user',
      subjectId: `${realmId}:${user.id}`,
      kind: 'totp_seed',
      label: `${user.id} TOTP seed`,
      value: pending.secret,
      createdByUserId: user.id,
      preview: `totp_seed_${user.id}`,
    });
    const backupReference = LocalSecretStore.upsertOpaqueSecret({
      subjectType: 'iam_user',
      subjectId: `${realmId}:${user.id}`,
      kind: 'backup_code_bundle',
      label: `${user.id} backup code bundle`,
      value: JSON.stringify(pending.backup_codes),
      createdByUserId: user.id,
      preview: `backup_codes_${user.id}`,
    });
    const mfaStates = mfaStateRepository.load().filter(
      (candidate) => !(candidate.realm_id === realmId && candidate.user_id === user.id),
    );
    mfaStates.push({
      realm_id: realmId,
      user_id: user.id,
      totp_reference_id: totpReference.id,
      backup_codes_reference_id: backupReference.id,
      enrolled_at: nowIso(),
      disabled_at: null,
    });
    mfaStateRepository.save(mfaStates);
    pending.consumed_at = nowIso();
    persistStateSyncOnly();
    return this.getAccountSecurityByUser(realmId, user.id);
  },

  disableMfa(realmId: string, sessionId: string, input: DisableIamMfaInput): IamAccountSecurityResponse {
    const session = resolveAccountSession(realmId, sessionId, true);
    return this.disableMfaByUser(realmId, session.user_id, input);
  },

  async disableMfaAsync(
    realmId: string,
    sessionId: string,
    input: DisableIamMfaInput,
  ): Promise<IamAccountSecurityResponse> {
    if (!(runtimeRepositoryMode.dualWrite || runtimeRepositoryMode.readV2)) {
      return runWithDeferredPersistence(() => this.disableMfa(realmId, sessionId, input));
    }

    return runWithDeferredPersistence(async () => {
      const session = await resolveAccountSessionAsync(realmId, sessionId, true);
      return this.disableMfaByUser(realmId, session.user_id, input);
    });
  },

  disableMfaByUser(realmId: string, userId: string, input: DisableIamMfaInput): IamAccountSecurityResponse {
    const user = getRealmUserById(realmId, userId);
    const mfaState = getMfaState(realmId, user.id);
    if (!mfaState) {
      throw new Error('MFA is not enabled for this user');
    }
    if (!verifyActiveMfaCode(mfaState, input.code)) {
      throw new Error('Invalid MFA verification code');
    }
    mfaState.disabled_at = nowIso();
    LocalSecretStore.disableSecret(mfaState.totp_reference_id);
    LocalSecretStore.disableSecret(mfaState.backup_codes_reference_id);
    persistStateSyncOnly();
    return this.getAccountSecurityByUser(realmId, user.id);
  },

  listAccountSessions(realmId: string, sessionId: string): { generated_at: string; sessions: IamAccountSessionSummary[]; count: number } {
    const current = resolveAccountSession(realmId, sessionId, true);
    const sessions = sessionStore.listByUser(realmId, current.user_id)
      .map((candidate) => summarizeSession(candidate, current.id));
    return {
      generated_at: nowIso(),
      sessions,
      count: sessions.length,
    };
  },

  async listAccountSessionsAsync(
    realmId: string,
    sessionId: string,
  ): Promise<{ generated_at: string; sessions: IamAccountSessionSummary[]; count: number }> {
    if (!(runtimeRepositoryMode.dualWrite || runtimeRepositoryMode.readV2)) {
      return this.listAccountSessions(realmId, sessionId);
    }

    const current = await resolveAccountSessionAsync(realmId, sessionId, true);
    const sessions = (await sessionAsyncStore.listByUser(realmId, current.user_id))
      .map((candidate) => summarizeSession(candidate, current.id));
    return {
      generated_at: nowIso(),
      sessions,
      count: sessions.length,
    };
  },

  listAccountSessionsByUser(realmId: string, userId: string): { generated_at: string; sessions: IamAccountSessionSummary[]; count: number } {
    revokeExpiredSessions();
    getRealmUserById(realmId, userId);
    const sessions = sessionStore.listByUser(realmId, userId)
      .map((candidate) => summarizeSession(candidate, null));
    return {
      generated_at: nowIso(),
      sessions,
      count: sessions.length,
    };
  },

  listActiveFederatedBrowserSessionReferencesByProvider(
    realmId: string,
    providerId: string,
  ): string[] {
    revokeExpiredSessions();
    return Array.from(new Set(
      accountSessionRepository.load()
        .filter(
          (session) =>
            session.realm_id === realmId
            && !session.revoked_at
            && session.federated_login_context?.provider_id === providerId,
        )
        .map((session) => session.id),
    ));
  },

  async listActiveFederatedBrowserSessionReferencesByProviderAsync(
    realmId: string,
    providerId: string,
  ): Promise<string[]> {
    return this.listActiveFederatedBrowserSessionReferencesByProvider(realmId, providerId);
  },

  revokeAccountSession(realmId: string, sessionId: string, targetSessionId: string): { revoked: boolean; revoked_at: string | null } {
    const current = resolveAccountSession(realmId, sessionId, true);
    const targetSessionToken = parseSessionToken(targetSessionId);
    const target = sessionStore.getById(realmId, targetSessionToken.session_id);
    if (!target) {
      throw new Error('Unknown account session');
    }
    if (target.user_id !== current.user_id) {
      throw new Error('Unknown account session');
    }
    target.revoked_at = nowIso();
    persistStateSyncOnly();
    return {
      revoked: true,
      revoked_at: target.revoked_at,
    };
  },

  async revokeAccountSessionAsync(
    realmId: string,
    sessionId: string,
    targetSessionId: string,
  ): Promise<{ revoked: boolean; revoked_at: string | null }> {
    if (!(runtimeRepositoryMode.dualWrite || runtimeRepositoryMode.readV2)) {
      return runWithDeferredPersistence(async () => {
        const result = this.revokeAccountSession(realmId, sessionId, targetSessionId);
        await revokeIssuedTokensForBrowserSessionsAsync(realmId, [targetSessionId]);
        await terminateLinkedSamlSessionsForBrowserSessionsAsync(realmId, [targetSessionId]);
        await terminateFederatedSessionLinksForBrowserSessionsAsync(realmId, [targetSessionId]);
        return result;
      });
    }

    return runWithDeferredPersistence(async () => {
      const current = await resolveAccountSessionAsync(realmId, sessionId, true);
      const targetSessionToken = parseSessionToken(targetSessionId);
      const target = await sessionAsyncStore.getById(realmId, targetSessionToken.session_id);
      if (!target) {
        throw new Error('Unknown account session');
      }
      if (target.user_id !== current.user_id) {
        throw new Error('Unknown account session');
      }
      target.revoked_at = nowIso();
      await sessionAsyncStore.put(target);
      await revokeIssuedTokensForBrowserSessionsAsync(realmId, [targetSessionId]);
      await terminateLinkedSamlSessionsForBrowserSessionsAsync(realmId, [targetSessionId]);
      await terminateFederatedSessionLinksForBrowserSessionsAsync(realmId, [targetSessionId]);
      return {
        revoked: true,
        revoked_at: target.revoked_at,
      };
    });
  },

  revokeAccountSessionByUser(realmId: string, userId: string, targetSessionId: string): { revoked: boolean; revoked_at: string | null } {
    getRealmUserById(realmId, userId);
    const targetSessionToken = parseSessionToken(targetSessionId);
    const target = sessionStore.getById(realmId, targetSessionToken.session_id);
    if (!target) {
      throw new Error('Unknown account session');
    }
    if (target.user_id !== userId) {
      throw new Error('Unknown account session');
    }
    target.revoked_at = nowIso();
    persistStateSyncOnly();
    return {
      revoked: true,
      revoked_at: target.revoked_at,
    };
  },

  async revokeAccountSessionsByReferenceAsync(
    realmId: string,
    sessionReferences: Array<string | null | undefined>,
  ): Promise<{ revoked_session_count: number; revoked_token_count: number; revoked_at: string | null }> {
    return runWithDeferredPersistence(async () => {
      const uniqueReferences = Array.from(new Set(
        sessionReferences
          .map((reference) => reference?.trim() ?? '')
          .filter((reference) => reference.length > 0),
      ));

      let revokedSessionCount = 0
      let revokedTokenCount = 0
      let revokedAt: string | null = null
      const revokedSessionIds: string[] = []

      for (const sessionReference of uniqueReferences) {
        const parsedSessionToken = parseSessionToken(sessionReference)
        const target = sessionStore.getById(realmId, parsedSessionToken.session_id)
        if (!target || target.revoked_at) {
          continue
        }
        target.revoked_at = nowIso()
        revokedSessionCount += 1
        revokedAt = target.revoked_at
        revokedSessionIds.push(target.id)
      }

      if (revokedSessionCount > 0) {
        persistStateSyncOnly()
        await syncSessionsAsync(revokedSessionIds.map((sessionId) => accountSessionByRealmAndId.get(accountSessionIndexKey(realmId, sessionId))).filter(Boolean) as StoredIamAccountSession[])
      }

      if (revokedSessionIds.length > 0) {
        for (const browserSessionReference of revokedSessionIds) {
          const revokedTokens = await LocalIamProtocolRuntimeStore.revokeTokensForBrowserSessionAsync(
            realmId,
            browserSessionReference,
          )
          revokedTokenCount += revokedTokens.revoked_count
          revokedAt = revokedAt ?? revokedTokens.revoked_at
        }
        await terminateLinkedSamlSessionsForBrowserSessionsAsync(realmId, revokedSessionIds)
        await terminateFederatedSessionLinksForBrowserSessionsAsync(realmId, revokedSessionIds)
      }

      return {
        revoked_session_count: revokedSessionCount,
        revoked_token_count: revokedTokenCount,
        revoked_at: revokedAt,
      }
    })
  },

  revokeOtherAccountSessions(realmId: string, sessionId: string): { revoked_count: number; current_session_id: string } {
    const current = resolveAccountSession(realmId, sessionId, true);
    let revokedCount = 0;
    for (const candidate of accountSessionRepository.load()) {
      if (candidate.realm_id !== realmId || candidate.user_id !== current.user_id || candidate.id === current.id || candidate.revoked_at) {
        continue;
      }
      candidate.revoked_at = nowIso();
      revokedCount += 1;
    }
    persistStateSyncOnly();
    return {
      revoked_count: revokedCount,
      current_session_id: current.id,
    };
  },

  async revokeOtherAccountSessionsAsync(
    realmId: string,
    sessionId: string,
  ): Promise<{ revoked_count: number; current_session_id: string }> {
    return runWithDeferredPersistence(async () => {
      const current = await resolveAccountSessionAsync(realmId, sessionId, true);
      const revokedSessions = revokeSessionsForUserDetailed(realmId, current.user_id, current.id);
      await syncSessionsAsync([
        current,
        ...revokedSessions.revoked_session_ids
          .map((revokedSessionId) => accountSessionByRealmAndId.get(accountSessionIndexKey(realmId, revokedSessionId)))
          .filter(Boolean) as StoredIamAccountSession[],
      ]);
      await revokeIssuedTokensForBrowserSessionsAsync(realmId, revokedSessions.revoked_session_ids);
      await terminateLinkedSamlSessionsForBrowserSessionsAsync(realmId, revokedSessions.revoked_session_ids);
      await terminateFederatedSessionLinksForBrowserSessionsAsync(realmId, revokedSessions.revoked_session_ids);
      return {
        revoked_count: revokedSessions.revoked_count,
        current_session_id: current.id,
      };
    });
  },

  revokeOtherAccountSessionsByUser(realmId: string, userId: string): { revoked_count: number; current_session_id: string | null } {
    getRealmUserById(realmId, userId);
    const result = revokeSessionsForUser(realmId, userId);
    return {
      revoked_count: result.revoked_count,
      current_session_id: null,
    };
  },

  listAccountConsents(realmId: string, sessionId: string): IamAccountConsentsResponse {
    const current = resolveAccountSession(realmId, sessionId, true);
    const consents = consentRecordRepository.load()
      .filter((candidate) => candidate.realm_id === realmId && candidate.user_id === current.user_id)
      .sort((leftItem, rightItem) => rightItem.granted_at.localeCompare(leftItem.granted_at))
      .map((candidate) => clone(candidate));
    return {
      generated_at: nowIso(),
      consents,
      count: consents.length,
    };
  },

  listAccountDelegatedRelationships(
    realmId: string,
    sessionId: string,
    filters?: {
      status?: IamDelegatedRelationshipStatus | null;
    },
  ): IamAccountDelegatedRelationshipsResponse {
    const current = resolveAccountSession(realmId, sessionId, true);
    let relationships = LocalIamFoundationStore
      .listDelegatedRelationships({ realm_id: realmId })
      .delegated_relationships
      .filter((candidate) => candidate.principal_user_id === current.user_id || candidate.delegate_user_id === current.user_id);
    if (filters?.status) {
      relationships = relationships.filter((candidate) => candidate.status === filters.status);
    }
    const summarized = relationships
      .map((candidate) => summarizeAccountDelegatedRelationship(current.user_id, candidate))
      .sort((leftItem, rightItem) => leftItem.id.localeCompare(rightItem.id));
    return {
      generated_at: nowIso(),
      delegated_relationships: summarized,
      count: summarized.length,
    };
  },

  listAccountDelegatedConsents(
    realmId: string,
    sessionId: string,
    filters?: {
      relationship_id?: string | null;
      status?: IamDelegatedConsentStatus | null;
    },
  ): IamAccountDelegatedConsentsResponse {
    const current = resolveAccountSession(realmId, sessionId, true);
    const delegatedConsents = LocalIamFoundationStore
      .listDelegatedConsents({
        realm_id: realmId,
        relationship_id: filters?.relationship_id ?? null,
        status: filters?.status ?? null,
      })
      .delegated_consents
      .filter((candidate) => candidate.principal_user_id === current.user_id || candidate.delegate_user_id === current.user_id)
      .sort((leftItem, rightItem) => rightItem.granted_at.localeCompare(leftItem.granted_at))
      .map((candidate) => summarizeAccountDelegatedConsent(current.user_id, candidate));
    return {
      generated_at: nowIso(),
      delegated_consents: delegatedConsents,
      count: delegatedConsents.length,
    };
  },

  listAccountDelegatedConsentRequests(
    realmId: string,
    sessionId: string,
    filters?: {
      relationship_id?: string | null;
      status?: IamDelegatedConsentRequestStatus | null;
    },
  ): IamAccountDelegatedConsentRequestsResponse {
    const current = resolveAccountSession(realmId, sessionId, true);
    const delegatedConsentRequests = LocalIamFoundationStore
      .listDelegatedConsentRequests({
        realm_id: realmId,
        relationship_id: filters?.relationship_id ?? null,
        status: filters?.status ?? null,
      })
      .delegated_consent_requests
      .filter((candidate) => candidate.principal_user_id === current.user_id || candidate.delegate_user_id === current.user_id)
      .sort((leftItem, rightItem) => rightItem.requested_at.localeCompare(leftItem.requested_at))
      .map((candidate) => summarizeAccountDelegatedConsentRequest(current.user_id, candidate));
    return {
      generated_at: nowIso(),
      delegated_consent_requests: delegatedConsentRequests,
      count: delegatedConsentRequests.length,
    };
  },

  grantAccountDelegatedConsent(
    realmId: string,
    sessionId: string,
    input: CreateIamAccountDelegatedConsentInput,
  ): IamAccountDelegatedConsentRecord {
    const current = resolveAccountSession(realmId, sessionId, true);
    const relationship = getDelegatedRelationshipForRealm(realmId, input.relationship_id);
    if (relationship.principal_user_id !== current.user_id) {
      throw new Error('Only the delegated-relationship principal can grant delegated consent');
    }
    if (relationship.status !== 'ACTIVE') {
      throw new Error('Delegated consent can only be granted for active delegated relationships');
    }
    const consent = LocalIamFoundationStore.createDelegatedConsent(current.user_id, {
      realm_id: realmId,
      relationship_id: input.relationship_id,
      scope_names: input.scope_names,
      purpose_names: input.purpose_names,
      expires_at: input.expires_at,
      notes: input.notes,
    });
    return summarizeAccountDelegatedConsent(current.user_id, consent);
  },

  async grantAccountDelegatedConsentAsync(
    realmId: string,
    sessionId: string,
    input: CreateIamAccountDelegatedConsentInput,
  ): Promise<IamAccountDelegatedConsentRecord> {
    return runWithDeferredPersistence(async () => {
      const current = await resolveAccountSessionAsync(realmId, sessionId, true);
      const relationship = getDelegatedRelationshipForRealm(realmId, input.relationship_id);
      if (relationship.principal_user_id !== current.user_id) {
        throw new Error('Only the delegated-relationship principal can grant delegated consent');
      }
      if (relationship.status !== 'ACTIVE') {
        throw new Error('Delegated consent can only be granted for active delegated relationships');
      }
      const consent = await LocalIamFoundationStore.createDelegatedConsentAsync(current.user_id, {
        realm_id: realmId,
        relationship_id: input.relationship_id,
        scope_names: input.scope_names,
        purpose_names: input.purpose_names,
        expires_at: input.expires_at,
        notes: input.notes,
      });
      return summarizeAccountDelegatedConsent(current.user_id, consent);
    });
  },

  revokeAccountDelegatedConsent(
    realmId: string,
    sessionId: string,
    consentId: string,
    input: RevokeIamAccountDelegatedConsentInput,
  ): IamAccountDelegatedConsentRecord {
    const current = resolveAccountSession(realmId, sessionId, true);
    const consent = getDelegatedConsentForRealm(realmId, consentId);
    if (consent.principal_user_id !== current.user_id) {
      throw new Error('Only the delegated-relationship principal can revoke delegated consent');
    }
    const updated = LocalIamFoundationStore.updateDelegatedConsent(current.user_id, consentId, {
      status: 'REVOKED',
      notes: input.notes,
    });
    return summarizeAccountDelegatedConsent(current.user_id, updated);
  },

  async revokeAccountDelegatedConsentAsync(
    realmId: string,
    sessionId: string,
    consentId: string,
    input: RevokeIamAccountDelegatedConsentInput,
  ): Promise<IamAccountDelegatedConsentRecord> {
    return runWithDeferredPersistence(async () => {
      const current = await resolveAccountSessionAsync(realmId, sessionId, true);
      const consent = getDelegatedConsentForRealm(realmId, consentId);
      if (consent.principal_user_id !== current.user_id) {
        throw new Error('Only the delegated-relationship principal can revoke delegated consent');
      }
      const updated = await LocalIamFoundationStore.updateDelegatedConsentAsync(current.user_id, consentId, {
        status: 'REVOKED',
        notes: input.notes,
      });
      return summarizeAccountDelegatedConsent(current.user_id, updated);
    });
  },

  requestAccountDelegatedConsent(
    realmId: string,
    sessionId: string,
    input: CreateIamAccountDelegatedConsentRequestInput,
  ): IamAccountDelegatedConsentRequestRecord {
    const current = resolveAccountSession(realmId, sessionId, true);
    const relationship = getDelegatedRelationshipForRealm(realmId, input.relationship_id);
    if (relationship.delegate_user_id !== current.user_id) {
      throw new Error('Only the delegated-relationship delegate can request delegated consent');
    }
    if (relationship.status !== 'ACTIVE') {
      throw new Error('Delegated consent requests can only be created for active delegated relationships');
    }
    const request = LocalIamFoundationStore.createDelegatedConsentRequest(current.user_id, {
      realm_id: realmId,
      relationship_id: input.relationship_id,
      requested_scope_names: input.requested_scope_names,
      requested_purpose_names: input.requested_purpose_names,
      expires_at: input.expires_at,
      request_notes: input.request_notes,
    });
    return summarizeAccountDelegatedConsentRequest(current.user_id, request);
  },

  async requestAccountDelegatedConsentAsync(
    realmId: string,
    sessionId: string,
    input: CreateIamAccountDelegatedConsentRequestInput,
  ): Promise<IamAccountDelegatedConsentRequestRecord> {
    return runWithDeferredPersistence(async () => {
      const current = await resolveAccountSessionAsync(realmId, sessionId, true);
      const relationship = getDelegatedRelationshipForRealm(realmId, input.relationship_id);
      if (relationship.delegate_user_id !== current.user_id) {
        throw new Error('Only the delegated-relationship delegate can request delegated consent');
      }
      if (relationship.status !== 'ACTIVE') {
        throw new Error('Delegated consent requests can only be created for active delegated relationships');
      }
      const request = await LocalIamFoundationStore.createDelegatedConsentRequestAsync(current.user_id, {
        realm_id: realmId,
        relationship_id: input.relationship_id,
        requested_scope_names: input.requested_scope_names,
        requested_purpose_names: input.requested_purpose_names,
        expires_at: input.expires_at,
        request_notes: input.request_notes,
      });
      return summarizeAccountDelegatedConsentRequest(current.user_id, request);
    });
  },

  approveAccountDelegatedConsentRequest(
    realmId: string,
    sessionId: string,
    requestId: string,
    input: ApproveIamAccountDelegatedConsentRequestInput,
  ): IamAccountDelegatedConsentDecisionResponse {
    const current = resolveAccountSession(realmId, sessionId, true);
    const request = getDelegatedConsentRequestForRealm(realmId, requestId);
    if (request.principal_user_id !== current.user_id) {
      throw new Error('Only the delegated-relationship principal can approve delegated consent requests');
    }
    if (request.status !== 'PENDING') {
      throw new Error('Only pending delegated consent requests can be approved');
    }
    const consent = LocalIamFoundationStore.createDelegatedConsent(current.user_id, {
      realm_id: realmId,
      relationship_id: request.relationship_id,
      scope_names: request.requested_scope_names,
      purpose_names: request.requested_purpose_names,
      expires_at: input.expires_at ?? request.expires_at,
      notes: input.consent_notes,
    });
    const updatedRequest = LocalIamFoundationStore.updateDelegatedConsentRequest(current.user_id, requestId, {
      status: 'APPROVED',
      delegated_consent_id: consent.id,
      decision_notes: input.decision_notes,
    });
    return {
      request: summarizeAccountDelegatedConsentRequest(current.user_id, updatedRequest),
      delegated_consent: summarizeAccountDelegatedConsent(current.user_id, consent),
    };
  },

  async approveAccountDelegatedConsentRequestAsync(
    realmId: string,
    sessionId: string,
    requestId: string,
    input: ApproveIamAccountDelegatedConsentRequestInput,
  ): Promise<IamAccountDelegatedConsentDecisionResponse> {
    return runWithDeferredPersistence(async () => {
      const current = await resolveAccountSessionAsync(realmId, sessionId, true);
      const request = getDelegatedConsentRequestForRealm(realmId, requestId);
      if (request.principal_user_id !== current.user_id) {
        throw new Error('Only the delegated-relationship principal can approve delegated consent requests');
      }
      if (request.status !== 'PENDING') {
        throw new Error('Only pending delegated consent requests can be approved');
      }
      const consent = await LocalIamFoundationStore.createDelegatedConsentAsync(current.user_id, {
        realm_id: realmId,
        relationship_id: request.relationship_id,
        scope_names: request.requested_scope_names,
        purpose_names: request.requested_purpose_names,
        expires_at: input.expires_at ?? request.expires_at,
        notes: input.consent_notes,
      });
      const updatedRequest = await LocalIamFoundationStore.updateDelegatedConsentRequestAsync(current.user_id, requestId, {
        status: 'APPROVED',
        delegated_consent_id: consent.id,
        decision_notes: input.decision_notes,
      });
      return {
        request: summarizeAccountDelegatedConsentRequest(current.user_id, updatedRequest),
        delegated_consent: summarizeAccountDelegatedConsent(current.user_id, consent),
      };
    });
  },

  denyAccountDelegatedConsentRequest(
    realmId: string,
    sessionId: string,
    requestId: string,
    input: DenyIamAccountDelegatedConsentRequestInput,
  ): IamAccountDelegatedConsentDecisionResponse {
    const current = resolveAccountSession(realmId, sessionId, true);
    const request = getDelegatedConsentRequestForRealm(realmId, requestId);
    if (request.principal_user_id !== current.user_id) {
      throw new Error('Only the delegated-relationship principal can deny delegated consent requests');
    }
    if (request.status !== 'PENDING') {
      throw new Error('Only pending delegated consent requests can be denied');
    }
    const updatedRequest = LocalIamFoundationStore.updateDelegatedConsentRequest(current.user_id, requestId, {
      status: 'DENIED',
      decision_notes: input.decision_notes,
    });
    return {
      request: summarizeAccountDelegatedConsentRequest(current.user_id, updatedRequest),
      delegated_consent: null,
    };
  },

  async denyAccountDelegatedConsentRequestAsync(
    realmId: string,
    sessionId: string,
    requestId: string,
    input: DenyIamAccountDelegatedConsentRequestInput,
  ): Promise<IamAccountDelegatedConsentDecisionResponse> {
    return runWithDeferredPersistence(async () => {
      const current = await resolveAccountSessionAsync(realmId, sessionId, true);
      const request = getDelegatedConsentRequestForRealm(realmId, requestId);
      if (request.principal_user_id !== current.user_id) {
        throw new Error('Only the delegated-relationship principal can deny delegated consent requests');
      }
      if (request.status !== 'PENDING') {
        throw new Error('Only pending delegated consent requests can be denied');
      }
      const updatedRequest = await LocalIamFoundationStore.updateDelegatedConsentRequestAsync(current.user_id, requestId, {
        status: 'DENIED',
        decision_notes: input.decision_notes,
      });
      return {
        request: summarizeAccountDelegatedConsentRequest(current.user_id, updatedRequest),
        delegated_consent: null,
      };
    });
  },

  cancelAccountDelegatedConsentRequest(
    realmId: string,
    sessionId: string,
    requestId: string,
    input: CancelIamAccountDelegatedConsentRequestInput,
  ): IamAccountDelegatedConsentDecisionResponse {
    const current = resolveAccountSession(realmId, sessionId, true);
    const request = getDelegatedConsentRequestForRealm(realmId, requestId);
    if (request.delegate_user_id !== current.user_id || request.requested_by_user_id !== current.user_id) {
      throw new Error('Only the delegated-relationship delegate can cancel delegated consent requests they created');
    }
    if (request.status !== 'PENDING') {
      throw new Error('Only pending delegated consent requests can be cancelled');
    }
    const updatedRequest = LocalIamFoundationStore.updateDelegatedConsentRequest(current.user_id, requestId, {
      status: 'CANCELLED',
      decision_notes: input.decision_notes,
    });
    return {
      request: summarizeAccountDelegatedConsentRequest(current.user_id, updatedRequest),
      delegated_consent: null,
    };
  },

  async cancelAccountDelegatedConsentRequestAsync(
    realmId: string,
    sessionId: string,
    requestId: string,
    input: CancelIamAccountDelegatedConsentRequestInput,
  ): Promise<IamAccountDelegatedConsentDecisionResponse> {
    return runWithDeferredPersistence(async () => {
      const current = await resolveAccountSessionAsync(realmId, sessionId, true);
      const request = getDelegatedConsentRequestForRealm(realmId, requestId);
      if (request.delegate_user_id !== current.user_id || request.requested_by_user_id !== current.user_id) {
        throw new Error('Only the delegated-relationship delegate can cancel delegated consent requests they created');
      }
      if (request.status !== 'PENDING') {
        throw new Error('Only pending delegated consent requests can be cancelled');
      }
      const updatedRequest = await LocalIamFoundationStore.updateDelegatedConsentRequestAsync(current.user_id, requestId, {
        status: 'CANCELLED',
        decision_notes: input.decision_notes,
      });
      return {
        request: summarizeAccountDelegatedConsentRequest(current.user_id, updatedRequest),
        delegated_consent: null,
      };
    });
  },

  getUserSecuritySummary(realmId: string, userId: string): IamUserSecuritySummaryResponse {
    revokeExpiredSessions();
    const user = getRealmUserById(realmId, userId);
    const security = getSecurityState(user);
    const lockout = getLockoutState(realmId, user.id);
    const passkeyCount = LocalIamWebAuthnStore.getActiveCredentialCount(realmId, user.id);
    const activeSessionCount = sessionStore.listByUser(realmId, user.id)
      .filter((session) => sessionStatus(session) === 'ACTIVE').length;
    const activeTokenCount = LocalIamProtocolRuntimeStore.countTokensForSubject(realmId, 'USER' as IamSubjectKind, user.id).active_count;
    return {
      generated_at: nowIso(),
      realm_id: realmId,
      user: summarizeUser(user),
      status: user.status,
      mfa_enabled: Boolean(getMfaState(realmId, user.id)),
      passkey_count: passkeyCount,
      passwordless_ready: passkeyCount > 0,
      email_verified_at: security.email_verified_at,
      last_login_at: security.last_login_at,
      last_password_updated_at: security.last_password_updated_at,
      last_mfa_authenticated_at: security.last_mfa_authenticated_at,
      last_passkey_authenticated_at: security.last_passkey_authenticated_at,
      failed_login_attempt_count: lockout.failed_attempt_count,
      last_failed_login_at: lockout.last_failed_at,
      lockout_until: lockout.lockout_until,
      active_session_count: activeSessionCount,
      active_token_count: activeTokenCount,
    };
  },

  listUserLoginHistory(realmId: string, userId: string, limit: number = 50): IamUserLoginHistoryResponse {
    getRealmUserById(realmId, userId);
    const loginAttempts = loginAttemptRepository.load()
      .filter((record) => record.realm_id === realmId && record.user_id === userId)
      .sort((left, right) => right.occurred_at.localeCompare(left.occurred_at))
      .slice(0, Math.max(1, Math.min(limit, 200)))
      .map((record) => clone(record));
    return {
      generated_at: nowIso(),
      realm_id: realmId,
      user_id: userId,
      login_attempts: loginAttempts,
      count: loginAttempts.length,
    };
  },

  adminResetUserPasswordSyncOnly(
    realmId: string,
    userId: string,
    input: AdminResetIamUserPasswordInput,
  ): IamAdminPasswordResetResponse {
    const user = getRealmUserById(realmId, userId);
    const issuedTemporaryPassword = input.new_password?.trim() || randomBytes(9).toString('base64url');
    LocalIamProtocolRuntimeStore.setUserPasswordSyncOnly(realmId, user.id, issuedTemporaryPassword);
    const security = getSecurityState(user);
    security.last_password_updated_at = nowIso();
    const requiresUpdatePassword = input.force_update_on_login ?? true;
    const nextActions = requiresUpdatePassword
      ? Array.from(new Set([...user.required_actions, 'UPDATE_PASSWORD']))
      : user.required_actions.filter((action) => action !== 'UPDATE_PASSWORD');
    LocalIamFoundationStore.updateUser(user.id, user.id, {
      required_actions: nextActions,
    });
    const revokedSessions = input.revoke_existing_sessions
      ? revokeSessionsForUser(realmId, user.id)
      : { revoked_count: 0, revoked_at: null };
    const revokedTokens = input.revoke_existing_sessions
      ? LocalIamProtocolRuntimeStore.revokeTokensForSubjectSyncOnly(realmId, 'USER' as IamSubjectKind, user.id)
      : { revoked_count: 0, revoked_at: null };
    const lockoutCleared = input.clear_lockout ? clearUserLockoutState(realmId, user.id).cleared : false;
    persistStateSyncOnly();
    return {
      realm_id: realmId,
      user_id: user.id,
      password_updated_at: security.last_password_updated_at!,
      issued_temporary_password: input.new_password?.trim() ? null : issuedTemporaryPassword,
      requires_update_password: requiresUpdatePassword,
      revoked_session_count: revokedSessions.revoked_count,
      revoked_token_count: revokedTokens.revoked_count,
      lockout_cleared: lockoutCleared,
    };
  },

  async adminResetUserPasswordAsync(
    realmId: string,
    userId: string,
    input: AdminResetIamUserPasswordInput,
  ): Promise<IamAdminPasswordResetResponse> {
    return runWithDeferredPersistence(async () => {
      const user = getRealmUserById(realmId, userId);
      const issuedTemporaryPassword = input.new_password?.trim() || randomBytes(9).toString('base64url');
      await LocalIamProtocolRuntimeStore.setUserPasswordAsync(realmId, user.id, issuedTemporaryPassword);
      const security = getSecurityState(user);
      security.last_password_updated_at = nowIso();
      const requiresUpdatePassword = input.force_update_on_login ?? true;
      const nextActions = requiresUpdatePassword
        ? Array.from(new Set([...user.required_actions, 'UPDATE_PASSWORD']))
        : user.required_actions.filter((action) => action !== 'UPDATE_PASSWORD');
      await LocalIamFoundationStore.updateUserAsync(user.id, user.id, {
        required_actions: nextActions,
      });
      const revokedSessions = input.revoke_existing_sessions
        ? revokeSessionsForUserDetailed(realmId, user.id)
        : { revoked_count: 0, revoked_at: null, revoked_session_ids: [] };
      const revokedTokens = input.revoke_existing_sessions
        ? await LocalIamProtocolRuntimeStore.revokeTokensForSubjectAsync(realmId, 'USER' as IamSubjectKind, user.id)
        : { revoked_count: 0, revoked_at: null };
      if (input.revoke_existing_sessions) {
        await syncSessionsAsync(
          revokedSessions.revoked_session_ids
            .map((revokedSessionId) => accountSessionByRealmAndId.get(accountSessionIndexKey(realmId, revokedSessionId)))
            .filter(Boolean) as StoredIamAccountSession[],
        );
        await terminateLinkedSamlSessionsForBrowserSessionsAsync(realmId, revokedSessions.revoked_session_ids);
        await terminateFederatedSessionLinksForBrowserSessionsAsync(realmId, revokedSessions.revoked_session_ids);
      }
      const lockoutCleared = input.clear_lockout ? clearUserLockoutState(realmId, user.id).cleared : false;
      persistStateSyncOnly();
      return {
        realm_id: realmId,
        user_id: user.id,
        password_updated_at: security.last_password_updated_at!,
        issued_temporary_password: input.new_password?.trim() ? null : issuedTemporaryPassword,
        requires_update_password: requiresUpdatePassword,
        revoked_session_count: revokedSessions.revoked_count,
        revoked_token_count: revokedTokens.revoked_count,
        lockout_cleared: lockoutCleared,
      };
    });
  },

  adminRevokeUserSessionsSyncOnly(realmId: string, userId: string, input?: { revoke_tokens?: boolean }): IamAdminRevokeUserSessionsResponse {
    getRealmUserById(realmId, userId);
    const revokedSessions = revokeSessionsForUser(realmId, userId);
    const revokedTokens = input?.revoke_tokens === false
      ? { revoked_count: 0, revoked_at: null }
      : LocalIamProtocolRuntimeStore.revokeTokensForSubjectSyncOnly(realmId, 'USER' as IamSubjectKind, userId);
    return {
      realm_id: realmId,
      user_id: userId,
      revoked_session_count: revokedSessions.revoked_count,
      revoked_token_count: revokedTokens.revoked_count,
      revoked_at: revokedSessions.revoked_at ?? revokedTokens.revoked_at,
    };
  },

  async adminRevokeUserSessionsAsync(
    realmId: string,
    userId: string,
    input?: { revoke_tokens?: boolean },
  ): Promise<IamAdminRevokeUserSessionsResponse> {
    return runWithDeferredPersistence(async () => {
      getRealmUserById(realmId, userId);
      const revokedSessions = revokeSessionsForUserDetailed(realmId, userId);
      await syncSessionsAsync(
        revokedSessions.revoked_session_ids
          .map((revokedSessionId) => accountSessionByRealmAndId.get(accountSessionIndexKey(realmId, revokedSessionId)))
          .filter(Boolean) as StoredIamAccountSession[],
      );
      const revokedTokens = input?.revoke_tokens === false
        ? { revoked_count: 0, revoked_at: null }
        : await LocalIamProtocolRuntimeStore.revokeTokensForSubjectAsync(realmId, 'USER' as IamSubjectKind, userId);
      await terminateLinkedSamlSessionsForBrowserSessionsAsync(realmId, revokedSessions.revoked_session_ids);
      await terminateFederatedSessionLinksForBrowserSessionsAsync(realmId, revokedSessions.revoked_session_ids);
      return {
        realm_id: realmId,
        user_id: userId,
        revoked_session_count: revokedSessions.revoked_count,
        revoked_token_count: revokedTokens.revoked_count,
        revoked_at: revokedSessions.revoked_at ?? revokedTokens.revoked_at,
      };
    });
  },

  adminClearUserLockout(realmId: string, userId: string): IamUserSecuritySummaryResponse {
    getRealmUserById(realmId, userId);
    clearUserLockoutState(realmId, userId);
    return this.getUserSecuritySummary(realmId, userId);
  },

  async adminClearUserLockoutAsync(realmId: string, userId: string): Promise<IamUserSecuritySummaryResponse> {
    return runWithDeferredPersistence(() => this.adminClearUserLockout(realmId, userId));
  },

  exportState(): Record<string, unknown> {
    revokeExpiredSessions();
    return clone(state) as unknown as Record<string, unknown>;
  },

  importState(input: Record<string, unknown>): void {
    const nextState = normalizeState(input as Partial<IamAuthenticationRuntimeState>);
    syncInMemoryState(nextState);
    rebuildAccountSessionIndex();
    revokeExpiredSessions();
    persistStateSyncOnly();
  },
};
