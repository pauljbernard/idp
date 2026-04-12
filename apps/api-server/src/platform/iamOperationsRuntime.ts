import { AsyncLocalStorage } from 'async_hooks';
import { createHash, randomUUID } from 'crypto';
import {
  LocalIamAdvancedOAuthRuntimeStore,
  type IamAdvancedOAuthTransientStateMaintenanceResult,
} from './iamAdvancedOAuthRuntime';
import { loadOrCreatePersistedState, reloadOrCreatePersistedStateAsync, savePersistedState, savePersistedStateAsync } from './persistence';
import {
  LocalIamAuthenticationRuntimeStore,
  type IamAuthenticationTransientStateMaintenanceResult,
} from './iamAuthenticationRuntime';
import { LocalIamAuthFlowStore } from './iamAuthFlows';
import {
  LocalIamAuthorizationRuntimeStore,
  type IamAuthorizationTransientStateMaintenanceResult,
} from './iamAuthorizationRuntime';
import {
  LocalIamAuthorizationServicesStore,
  type IamAuthorizationServicesTransientStateMaintenanceResult,
} from './iamAuthorizationServices';
import { LocalIamExperienceRuntimeStore } from './iamExperienceRuntime';
import { LocalIamFederationRuntimeStore } from './iamFederationRuntime';
import { LocalIamFederationSessionIndexStore } from './iamFederationSessionIndex';
import {
  LocalIamFoundationStore,
  type IamFoundationTransientStateMaintenanceResult,
} from './iamFoundation';
import {
  LocalIamOrganizationStore,
  type IamOrganizationsTransientStateMaintenanceResult,
} from './iamOrganizations';
import {
  LocalIamProtocolRuntimeStore,
  type IamProtocolTransientStateMaintenanceResult,
} from './iamProtocolRuntime';
import { LocalIamRecoveryRuntimeStore } from './iamRecoveryRuntime';
import { LocalIamSessionIndexStore } from './iamSessionIndex';
import { LocalSecretStore } from './secretStore';
import { LocalIamTokenOwnershipIndexStore } from './iamTokenOwnershipIndex';
import { LocalIamSecurityAuditStore } from './iamSecurityAudit';
import { LocalIamUserProfileStore } from './iamUserProfiles';
import {
  LocalIamWebAuthnStore,
  type IamWebAuthnTransientStateMaintenanceResult,
} from './iamWebAuthn';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

function hashSnapshot(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function isFreshEnough(timestamp: string | null | undefined, maxAgeMs: number): boolean {
  if (!timestamp) {
    return false;
  }

  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) {
    return false;
  }

  return (Date.now() - parsed) <= maxAgeMs;
}

const IAM_OPERATIONS_RUNTIME_FILE = 'iam-operations-runtime-state.json';
const VALIDATION_BASE_URL = 'http://localhost:3000/api/v1/iam/realms';
const TRANSIENT_STATE_MAINTENANCE_LEASE_MS = 1000 * 60 * 5;
const SIGNING_KEY_ROTATION_LEASE_MS = 1000 * 60 * 5;
const RESTORE_EXECUTION_LEASE_MS = 1000 * 60 * 10;
const RESILIENCE_RUN_LEASE_MS = 1000 * 60 * 5;
const READINESS_BACKUP_FRESHNESS_MS = 1000 * 60 * 60 * 24 * 7;
const READINESS_RESTORE_FRESHNESS_MS = 1000 * 60 * 60 * 24 * 14;
const READINESS_KEY_ROTATION_FRESHNESS_MS = 1000 * 60 * 60 * 24 * 30;
const deferredPersistenceContext = new AsyncLocalStorage<{ dirty: boolean }>();
const MODELED_OPERATIONS_EVIDENCE_SUMMARY = 'Operations status derived from internal runtime state and validation-environment artifacts, not external production-grade or market-parity proof.';
const RECORDED_OPERATIONS_EVIDENCE_SUMMARY = 'Recorded validation-environment operation useful for internal readiness tracking, not external production-grade or market-parity proof.';

export type IamOperationsHealth = 'HEALTHY' | 'DEGRADED' | 'FAILED';
export type IamBackupStatus = 'READY';
export type IamRestoreMode = 'DRY_RUN' | 'EXECUTE';
export type IamRestoreStatus = 'VALIDATED' | 'APPLIED';
export type IamResilienceStatus = 'PASS' | 'WARN' | 'FAIL';
export type IamReadinessDecision = 'APPROVED' | 'BLOCKED';
export type IamOperationsEvidenceMode = 'MODELED_RUNTIME_STATE' | 'RECORDED_VALIDATION_OPERATION';

interface IamOperationsSnapshot {
  foundation: Record<string, unknown>;
  auth_flows: Record<string, unknown>;
  protocol: Record<string, unknown>;
  authentication: Record<string, unknown>;
  session_index: Record<string, unknown>;
  token_ownership_index: Record<string, unknown>;
  federation_session_index: Record<string, unknown>;
  webauthn: Record<string, unknown>;
  authorization: Record<string, unknown>;
  authorization_services: Record<string, unknown>;
  advanced_oauth: Record<string, unknown>;
  federation: Record<string, unknown>;
  experience: Record<string, unknown>;
  user_profiles: unknown;
  organizations: unknown;
  security_audit: Record<string, unknown>;
}

interface StoredIamBackupArtifactRecord {
  id: string;
  label: string;
  status: IamBackupStatus;
  checksum_sha256: string;
  object_key: string;
  created_at: string;
  created_by_user_id: string;
  summary: {
    realm_count: number;
    user_count: number;
    client_count: number;
    active_session_count: number;
    active_signing_key_count: number;
  };
  snapshot: IamOperationsSnapshot;
}

export interface IamBackupArtifactRecord {
  id: string;
  label: string;
  status: IamBackupStatus;
  checksum_sha256: string;
  object_key: string;
  created_at: string;
  created_by_user_id: string;
  summary: {
    realm_count: number;
    user_count: number;
    client_count: number;
    active_session_count: number;
    active_signing_key_count: number;
  };
}

export interface IamRestoreRecord {
  id: string;
  backup_id: string;
  mode: IamRestoreMode;
  status: IamRestoreStatus;
  created_at: string;
  created_by_user_id: string;
  summary: {
    realm_count: number;
    user_count: number;
    client_count: number;
    active_session_count: number;
  };
  checksum_sha256: string;
}

export interface IamRestoreActiveRun {
  id: string;
  started_at: string;
  lease_expires_at: string;
  started_by_user_id: string;
  backup_id: string;
  mode: IamRestoreMode;
}

export interface IamRestoresResponse {
  generated_at: string;
  active_run: IamRestoreActiveRun | null;
  restores: IamRestoreRecord[];
  count: number;
}

export interface IamSigningKeyRotationRecord {
  id: string;
  realm_id: string | null;
  retired_key_ids: string[];
  activated_key_id: string;
  created_at: string;
  created_by_user_id: string;
}

export interface IamSigningKeyRotationActiveRun {
  id: string;
  started_at: string;
  lease_expires_at: string;
  started_by_user_id: string;
  realm_id: string | null;
}

export interface IamSigningKeyRotationsResponse {
  generated_at: string;
  active_run: IamSigningKeyRotationActiveRun | null;
  rotations: IamSigningKeyRotationRecord[];
  count: number;
}

export interface IamResilienceCheck {
  id: string;
  name: string;
  status: IamResilienceStatus;
  summary: string;
  evidence_mode: IamOperationsEvidenceMode;
  evidence_summary: string;
}

export interface IamResilienceRunRecord {
  id: string;
  executed_at: string;
  executed_by_user_id: string;
  overall_status: IamResilienceStatus;
  checks: IamResilienceCheck[];
  count: number;
  evidence_mode: IamOperationsEvidenceMode;
  evidence_summary: string;
  market_claim_ready: boolean;
}

export interface IamResilienceActiveRun {
  id: string;
  started_at: string;
  lease_expires_at: string;
  started_by_user_id: string;
}

export interface IamResilienceRunsResponse {
  generated_at: string;
  active_run: IamResilienceActiveRun | null;
  runs: IamResilienceRunRecord[];
  count: number;
}

export interface IamRunbookRecord {
  id: string;
  title: string;
  summary: string;
}

export interface IamSloDefinition {
  id: string;
  name: string;
  target: string;
  summary: string;
}

export interface IamReadinessCheck {
  id: string;
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  summary: string;
  evidence_mode: IamOperationsEvidenceMode;
  evidence_summary: string;
}

export interface IamReadinessReviewRecord {
  id: string;
  created_at: string;
  created_by_user_id: string;
  decision: IamReadinessDecision;
  notes: string[];
  checks: IamReadinessCheck[];
  count: number;
  evidence_mode: IamOperationsEvidenceMode;
  evidence_summary: string;
  market_claim_ready: boolean;
}

export interface IamTransientStateMaintenanceRunRecord {
  id: string;
  executed_at: string;
  executed_by_user_id: string;
  foundation: IamFoundationTransientStateMaintenanceResult;
  organizations: IamOrganizationsTransientStateMaintenanceResult;
  authentication: IamAuthenticationTransientStateMaintenanceResult;
  authorization: IamAuthorizationTransientStateMaintenanceResult;
  authorization_services: IamAuthorizationServicesTransientStateMaintenanceResult;
  advanced_oauth: IamAdvancedOAuthTransientStateMaintenanceResult;
  protocol: IamProtocolTransientStateMaintenanceResult;
  webauthn: IamWebAuthnTransientStateMaintenanceResult;
  total_mutated_count: number;
}

export interface IamTransientStateMaintenanceActiveRun {
  id: string;
  started_at: string;
  lease_expires_at: string;
  started_by_user_id: string;
}

export interface IamTransientStateMaintenanceRunsResponse {
  generated_at: string;
  active_run: IamTransientStateMaintenanceActiveRun | null;
  runs: IamTransientStateMaintenanceRunRecord[];
  count: number;
}

interface IamOperationsRuntimeState {
  backups: StoredIamBackupArtifactRecord[];
  backup_idempotency_keys: Array<{
    idempotency_key: string;
    created_by_user_id: string;
    backup_id: string;
    recorded_at: string;
  }>;
  restores: IamRestoreRecord[];
  restore_idempotency_keys: Array<{
    idempotency_key: string;
    created_by_user_id: string;
    backup_id: string;
    mode: IamRestoreMode;
    restore_id: string;
    recorded_at: string;
  }>;
  key_rotations: IamSigningKeyRotationRecord[];
  signing_key_rotation_idempotency_keys: Array<{
    idempotency_key: string;
    created_by_user_id: string;
    realm_id: string | null;
    rotation_id: string;
    recorded_at: string;
  }>;
  resilience_runs: IamResilienceRunRecord[];
  resilience_run_idempotency_keys: Array<{
    idempotency_key: string;
    executed_by_user_id: string;
    run_id: string;
    recorded_at: string;
  }>;
  readiness_reviews: IamReadinessReviewRecord[];
  readiness_review_idempotency_keys: Array<{
    idempotency_key: string;
    created_by_user_id: string;
    review_id: string;
    recorded_at: string;
  }>;
  transient_state_maintenance_runs: IamTransientStateMaintenanceRunRecord[];
  transient_state_maintenance_idempotency_keys: Array<{
    idempotency_key: string;
    executed_by_user_id: string;
    run_id: string;
    recorded_at: string;
  }>;
  active_resilience_run: IamResilienceActiveRun | null;
  active_restore_run: IamRestoreActiveRun | null;
  active_signing_key_rotation_run: IamSigningKeyRotationActiveRun | null;
  active_transient_state_maintenance_run: IamTransientStateMaintenanceActiveRun | null;
}

const RUNBOOKS: IamRunbookRecord[] = [
  {
    id: 'iam-runbook-backup-restore',
    title: 'Backup and Restore',
    summary: 'Create a fresh subsystem backup before validation changes, rehearse restore in dry-run mode, then execute restore only with an immediately preceding backup artifact.',
  },
  {
    id: 'iam-runbook-key-rotation',
    title: 'Signing Key Rotation',
    summary: 'Rotate the global or realm-scoped signing key, confirm the new key is active, and retain previous verification keys long enough for token rollover validation.',
  },
  {
    id: 'iam-runbook-agentic-validation',
    title: 'Agentic Validation Guardrails',
    summary: 'Interactive agentic work must stay inside standalone validation realms, use review artifacts, and avoid binding the subsystem to downstream application runtime before formal approval.',
  },
];

const SLO_DEFINITIONS: IamSloDefinition[] = [
  {
    id: 'iam-slo-admin-read',
    name: 'Administrative Read APIs',
    target: 'p95 < 500ms',
    summary: 'Realm, user, group, client, and operations read paths should remain fast enough for a usable operator console.',
  },
  {
    id: 'iam-slo-token-runtime',
    name: 'Token Runtime Availability',
    target: '99.9% success in validation environment',
    summary: 'Discovery, JWKS, token issue, introspection, and revocation must stay available during standalone validation runs.',
  },
  {
    id: 'iam-slo-recovery',
    name: 'Operational Recovery',
    target: 'Restore rehearsal completed before adoption review',
    summary: 'The subsystem must prove that a recent backup can be validated and restored before any downstream migration is approved.',
  },
];

function normalizeState(input: Partial<IamOperationsRuntimeState>): IamOperationsRuntimeState {
  return {
    backups: Array.isArray(input.backups) ? input.backups : [],
    backup_idempotency_keys: Array.isArray(input.backup_idempotency_keys)
      ? input.backup_idempotency_keys
      : [],
    restores: Array.isArray(input.restores) ? input.restores : [],
    restore_idempotency_keys: Array.isArray(input.restore_idempotency_keys)
      ? input.restore_idempotency_keys
      : [],
    key_rotations: Array.isArray(input.key_rotations) ? input.key_rotations : [],
    signing_key_rotation_idempotency_keys: Array.isArray(input.signing_key_rotation_idempotency_keys)
      ? input.signing_key_rotation_idempotency_keys
      : [],
    resilience_runs: Array.isArray(input.resilience_runs)
      ? input.resilience_runs.map((run) => ({
        ...clone(run),
        checks: Array.isArray(run.checks)
          ? run.checks.map((check) => ({
            ...clone(check),
            evidence_mode: 'MODELED_RUNTIME_STATE',
            evidence_summary: MODELED_OPERATIONS_EVIDENCE_SUMMARY,
          }))
          : [],
        evidence_mode: 'RECORDED_VALIDATION_OPERATION',
        evidence_summary: RECORDED_OPERATIONS_EVIDENCE_SUMMARY,
        market_claim_ready: false,
      }))
      : [],
    resilience_run_idempotency_keys: Array.isArray(input.resilience_run_idempotency_keys)
      ? input.resilience_run_idempotency_keys
      : [],
    readiness_reviews: Array.isArray(input.readiness_reviews)
      ? input.readiness_reviews.map((review) => ({
        ...clone(review),
        checks: Array.isArray(review.checks)
          ? review.checks.map((check) => ({
            ...clone(check),
            evidence_mode: 'MODELED_RUNTIME_STATE',
            evidence_summary: MODELED_OPERATIONS_EVIDENCE_SUMMARY,
          }))
          : [],
        evidence_mode: 'RECORDED_VALIDATION_OPERATION',
        evidence_summary: RECORDED_OPERATIONS_EVIDENCE_SUMMARY,
        market_claim_ready: false,
      }))
      : [],
    readiness_review_idempotency_keys: Array.isArray(input.readiness_review_idempotency_keys)
      ? input.readiness_review_idempotency_keys
      : [],
    transient_state_maintenance_runs: Array.isArray(input.transient_state_maintenance_runs)
      ? input.transient_state_maintenance_runs
      : [],
    transient_state_maintenance_idempotency_keys: Array.isArray(input.transient_state_maintenance_idempotency_keys)
      ? input.transient_state_maintenance_idempotency_keys
      : [],
    active_resilience_run: input.active_resilience_run ?? null,
    active_restore_run: input.active_restore_run ?? null,
    active_signing_key_rotation_run: input.active_signing_key_rotation_run ?? null,
    active_transient_state_maintenance_run: input.active_transient_state_maintenance_run ?? null,
  };
}

const state = normalizeState(loadOrCreatePersistedState<Partial<IamOperationsRuntimeState>>(IAM_OPERATIONS_RUNTIME_FILE, () => normalizeState({})));

async function loadStateAsync(): Promise<IamOperationsRuntimeState> {
  return normalizeState(
    await reloadOrCreatePersistedStateAsync<Partial<IamOperationsRuntimeState>>(
      IAM_OPERATIONS_RUNTIME_FILE,
      () => normalizeState({}),
    ),
  );
}

function syncInMemoryState(nextState: IamOperationsRuntimeState): void {
  state.backups = clone(nextState.backups);
  state.backup_idempotency_keys = clone(nextState.backup_idempotency_keys);
  state.restores = clone(nextState.restores);
  state.restore_idempotency_keys = clone(nextState.restore_idempotency_keys);
  state.key_rotations = clone(nextState.key_rotations);
  state.signing_key_rotation_idempotency_keys = clone(nextState.signing_key_rotation_idempotency_keys);
  state.resilience_runs = clone(nextState.resilience_runs);
  state.resilience_run_idempotency_keys = clone(nextState.resilience_run_idempotency_keys);
  state.readiness_reviews = clone(nextState.readiness_reviews);
  state.readiness_review_idempotency_keys = clone(nextState.readiness_review_idempotency_keys);
  state.transient_state_maintenance_runs = clone(nextState.transient_state_maintenance_runs);
  state.transient_state_maintenance_idempotency_keys = clone(nextState.transient_state_maintenance_idempotency_keys);
  state.active_resilience_run = clone(nextState.active_resilience_run);
  state.active_restore_run = clone(nextState.active_restore_run);
  state.active_signing_key_rotation_run = clone(nextState.active_signing_key_rotation_run);
  state.active_transient_state_maintenance_run = clone(nextState.active_transient_state_maintenance_run);
}

function persistState(): void {
  const deferredContext = deferredPersistenceContext.getStore();
  if (deferredContext) {
    deferredContext.dirty = true;
    return;
  }
  savePersistedState(IAM_OPERATIONS_RUNTIME_FILE, state);
}

function isTransientMaintenanceLeaseActive(
  lease: IamTransientStateMaintenanceActiveRun | null | undefined,
): lease is IamTransientStateMaintenanceActiveRun {
  return Boolean(lease && Date.parse(lease.lease_expires_at) > Date.now());
}

function isResilienceLeaseActive(
  lease: IamResilienceActiveRun | null | undefined,
): lease is IamResilienceActiveRun {
  return Boolean(lease && Date.parse(lease.lease_expires_at) > Date.now());
}

function isRestoreLeaseActive(
  lease: IamRestoreActiveRun | null | undefined,
): lease is IamRestoreActiveRun {
  return Boolean(lease && Date.parse(lease.lease_expires_at) > Date.now());
}

function isSigningKeyRotationLeaseActive(
  lease: IamSigningKeyRotationActiveRun | null | undefined,
): lease is IamSigningKeyRotationActiveRun {
  return Boolean(lease && Date.parse(lease.lease_expires_at) > Date.now());
}

function assertRestoreLeaseNotActive(
  persistedState: IamOperationsRuntimeState,
  operationName: string,
): void {
  const currentLease = persistedState.active_restore_run;
  if (!isRestoreLeaseActive(currentLease)) {
    return;
  }
  syncInMemoryState(persistedState);
  throw new Error(`IAM ${operationName} is blocked while restore is already in progress: ${currentLease.id}`);
}

function isPersistenceConflict(error: unknown): boolean {
  return error instanceof Error && (
    error.message.includes('Refusing to overwrite newer persisted state')
    || error.message.includes('version drift')
  );
}

function normalizeIdempotencyKey(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function resolveRecordedResilienceRun(
  persistedState: IamOperationsRuntimeState,
  actorUserId: string,
  idempotencyKey: string | null,
): IamResilienceRunRecord | null {
  if (!idempotencyKey) {
    return null;
  }
  const recordedKey = persistedState.resilience_run_idempotency_keys.find(
    (candidate) =>
      candidate.idempotency_key === idempotencyKey
      && candidate.executed_by_user_id === actorUserId,
  );
  if (!recordedKey) {
    return null;
  }
  return persistedState.resilience_runs.find((run) => run.id === recordedKey.run_id) ?? null;
}

function resolveRecordedBackup(
  persistedState: IamOperationsRuntimeState,
  actorUserId: string,
  idempotencyKey: string | null,
): IamBackupArtifactRecord | null {
  if (!idempotencyKey) {
    return null;
  }
  const recordedKey = persistedState.backup_idempotency_keys.find(
    (candidate) =>
      candidate.idempotency_key === idempotencyKey
      && candidate.created_by_user_id === actorUserId,
  );
  if (!recordedKey) {
    return null;
  }
  const record = persistedState.backups.find((backup) => backup.id === recordedKey.backup_id);
  return record ? toPublicBackup(record) : null;
}

function resolveRecordedSigningKeyRotation(
  persistedState: IamOperationsRuntimeState,
  actorUserId: string,
  realmId: string | null,
  idempotencyKey: string | null,
): IamSigningKeyRotationRecord | null {
  if (!idempotencyKey) {
    return null;
  }
  const recordedKey = persistedState.signing_key_rotation_idempotency_keys.find(
    (candidate) =>
      candidate.idempotency_key === idempotencyKey
      && candidate.created_by_user_id === actorUserId
      && candidate.realm_id === realmId,
  );
  if (!recordedKey) {
    return null;
  }
  return persistedState.key_rotations.find((rotation) => rotation.id === recordedKey.rotation_id) ?? null;
}

function resolveRecordedRestore(
  persistedState: IamOperationsRuntimeState,
  actorUserId: string,
  backupId: string,
  mode: IamRestoreMode,
  idempotencyKey: string | null,
): IamRestoreRecord | null {
  if (!idempotencyKey) {
    return null;
  }
  const recordedKey = persistedState.restore_idempotency_keys.find(
    (candidate) =>
      candidate.idempotency_key === idempotencyKey
      && candidate.created_by_user_id === actorUserId
      && candidate.backup_id === backupId
      && candidate.mode === mode,
  );
  if (!recordedKey) {
    return null;
  }
  return persistedState.restores.find((restore) => restore.id === recordedKey.restore_id) ?? null;
}

function resolveRecordedTransientStateMaintenanceRun(
  persistedState: IamOperationsRuntimeState,
  actorUserId: string,
  idempotencyKey: string | null,
): IamTransientStateMaintenanceRunRecord | null {
  if (!idempotencyKey) {
    return null;
  }
  const recordedKey = persistedState.transient_state_maintenance_idempotency_keys.find(
    (candidate) =>
      candidate.idempotency_key === idempotencyKey
      && candidate.executed_by_user_id === actorUserId,
  );
  if (!recordedKey) {
    return null;
  }
  return persistedState.transient_state_maintenance_runs.find((run) => run.id === recordedKey.run_id) ?? null;
}

function resolveRecordedReadinessReview(
  persistedState: IamOperationsRuntimeState,
  actorUserId: string,
  idempotencyKey: string | null,
): IamReadinessReviewRecord | null {
  if (!idempotencyKey) {
    return null;
  }
  const recordedKey = persistedState.readiness_review_idempotency_keys.find(
    (candidate) =>
      candidate.idempotency_key === idempotencyKey
      && candidate.created_by_user_id === actorUserId,
  );
  if (!recordedKey) {
    return null;
  }
  return persistedState.readiness_reviews.find((review) => review.id === recordedKey.review_id) ?? null;
}

async function acquireTransientStateMaintenanceLeaseAsync(
  actorUserId: string,
): Promise<IamTransientStateMaintenanceActiveRun> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const persistedState = await loadStateAsync();
    assertRestoreLeaseNotActive(persistedState, 'transient state maintenance');
    const currentLease = persistedState.active_transient_state_maintenance_run;
    if (isTransientMaintenanceLeaseActive(currentLease)) {
      syncInMemoryState(persistedState);
      throw new Error(`IAM transient state maintenance is already in progress: ${currentLease.id}`);
    }

    const now = Date.now();
    const lease: IamTransientStateMaintenanceActiveRun = {
      id: `iam-transient-maintenance-active-${randomUUID()}`,
      started_at: new Date(now).toISOString(),
      lease_expires_at: new Date(now + TRANSIENT_STATE_MAINTENANCE_LEASE_MS).toISOString(),
      started_by_user_id: actorUserId,
    };
    persistedState.active_transient_state_maintenance_run = lease;

    try {
      await savePersistedStateAsync(IAM_OPERATIONS_RUNTIME_FILE, persistedState);
      syncInMemoryState(persistedState);
      return lease;
    } catch (error) {
      if (!isPersistenceConflict(error) || attempt === 2) {
        throw error;
      }
    }
  }

  throw new Error('Unable to acquire IAM transient state maintenance lease');
}

async function acquireResilienceLeaseAsync(
  actorUserId: string,
): Promise<IamResilienceActiveRun> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const persistedState = await loadStateAsync();
    assertRestoreLeaseNotActive(persistedState, 'resilience run');
    const currentLease = persistedState.active_resilience_run;
    if (isResilienceLeaseActive(currentLease)) {
      syncInMemoryState(persistedState);
      throw new Error(`IAM resilience run is already in progress: ${currentLease.id}`);
    }

    const now = Date.now();
    const lease: IamResilienceActiveRun = {
      id: `iam-resilience-active-${randomUUID()}`,
      started_at: new Date(now).toISOString(),
      lease_expires_at: new Date(now + RESILIENCE_RUN_LEASE_MS).toISOString(),
      started_by_user_id: actorUserId,
    };
    persistedState.active_resilience_run = lease;

    try {
      await savePersistedStateAsync(IAM_OPERATIONS_RUNTIME_FILE, persistedState);
      syncInMemoryState(persistedState);
      return lease;
    } catch (error) {
      if (!isPersistenceConflict(error) || attempt === 2) {
        throw error;
      }
    }
  }

  throw new Error('Unable to acquire IAM resilience lease');
}

async function acquireSigningKeyRotationLeaseAsync(
  actorUserId: string,
  realmId: string | null,
): Promise<IamSigningKeyRotationActiveRun> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const persistedState = await loadStateAsync();
    assertRestoreLeaseNotActive(persistedState, 'signing key rotation');
    const currentLease = persistedState.active_signing_key_rotation_run;
    if (isSigningKeyRotationLeaseActive(currentLease)) {
      syncInMemoryState(persistedState);
      throw new Error(`IAM signing key rotation is already in progress: ${currentLease.id}`);
    }

    const now = Date.now();
    const lease: IamSigningKeyRotationActiveRun = {
      id: `iam-key-rotation-active-${randomUUID()}`,
      started_at: new Date(now).toISOString(),
      lease_expires_at: new Date(now + SIGNING_KEY_ROTATION_LEASE_MS).toISOString(),
      started_by_user_id: actorUserId,
      realm_id: realmId,
    };
    persistedState.active_signing_key_rotation_run = lease;

    try {
      await savePersistedStateAsync(IAM_OPERATIONS_RUNTIME_FILE, persistedState);
      syncInMemoryState(persistedState);
      return lease;
    } catch (error) {
      if (!isPersistenceConflict(error) || attempt === 2) {
        throw error;
      }
    }
  }

  throw new Error('Unable to acquire IAM signing key rotation lease');
}

async function acquireRestoreLeaseAsync(
  actorUserId: string,
  backupId: string,
  mode: IamRestoreMode,
): Promise<IamRestoreActiveRun> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const persistedState = await loadStateAsync();
    const currentLease = persistedState.active_restore_run;
    if (isRestoreLeaseActive(currentLease)) {
      syncInMemoryState(persistedState);
      throw new Error(`IAM restore is already in progress: ${currentLease.id}`);
    }

    const now = Date.now();
    const lease: IamRestoreActiveRun = {
      id: `iam-restore-active-${randomUUID()}`,
      started_at: new Date(now).toISOString(),
      lease_expires_at: new Date(now + RESTORE_EXECUTION_LEASE_MS).toISOString(),
      started_by_user_id: actorUserId,
      backup_id: backupId,
      mode,
    };
    persistedState.active_restore_run = lease;

    try {
      await savePersistedStateAsync(IAM_OPERATIONS_RUNTIME_FILE, persistedState);
      syncInMemoryState(persistedState);
      return lease;
    } catch (error) {
      if (!isPersistenceConflict(error) || attempt === 2) {
        throw error;
      }
    }
  }

  throw new Error('Unable to acquire IAM restore lease');
}

async function finalizeTransientStateMaintenanceRunAsync(
  leaseId: string,
  record: IamTransientStateMaintenanceRunRecord | null,
  options?: {
    idempotency_key?: string | null;
  },
): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const persistedState = await loadStateAsync();
    const currentLease = persistedState.active_transient_state_maintenance_run;
    if (currentLease?.id !== leaseId) {
      if (!currentLease) {
        return;
      }
      throw new Error(`IAM transient state maintenance lease changed before completion: ${leaseId}`);
    }

    persistedState.active_transient_state_maintenance_run = null;
    if (record) {
      persistedState.transient_state_maintenance_runs.unshift(record);
      persistedState.transient_state_maintenance_runs = persistedState.transient_state_maintenance_runs.slice(0, 50);
      const idempotencyKey = normalizeIdempotencyKey(options?.idempotency_key);
      if (idempotencyKey) {
        persistedState.transient_state_maintenance_idempotency_keys = persistedState.transient_state_maintenance_idempotency_keys
          .filter((candidate) => !(
            candidate.idempotency_key === idempotencyKey
            && candidate.executed_by_user_id === record.executed_by_user_id
          ));
        persistedState.transient_state_maintenance_idempotency_keys.unshift({
          idempotency_key: idempotencyKey,
          executed_by_user_id: record.executed_by_user_id,
          run_id: record.id,
          recorded_at: nowIso(),
        });
        persistedState.transient_state_maintenance_idempotency_keys = persistedState.transient_state_maintenance_idempotency_keys.slice(0, 200);
      }
    }

    try {
      await savePersistedStateAsync(IAM_OPERATIONS_RUNTIME_FILE, persistedState);
      syncInMemoryState(persistedState);
      return;
    } catch (error) {
      if (!isPersistenceConflict(error) || attempt === 2) {
        throw error;
      }
    }
  }
}

async function finalizeSigningKeyRotationAsync(
  leaseId: string,
  record: IamSigningKeyRotationRecord | null,
  options?: {
    idempotency_key?: string | null;
  },
): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const persistedState = await loadStateAsync();
    const currentLease = persistedState.active_signing_key_rotation_run;
    if (currentLease?.id !== leaseId) {
      if (!currentLease) {
        return;
      }
      throw new Error(`IAM signing key rotation lease changed before completion: ${leaseId}`);
    }

    persistedState.active_signing_key_rotation_run = null;
    if (record) {
      persistedState.key_rotations.unshift(record);
      persistedState.key_rotations = persistedState.key_rotations.slice(0, 50);
      const idempotencyKey = normalizeIdempotencyKey(options?.idempotency_key);
      if (idempotencyKey) {
        persistedState.signing_key_rotation_idempotency_keys = persistedState.signing_key_rotation_idempotency_keys
          .filter((candidate) => !(
            candidate.idempotency_key === idempotencyKey
            && candidate.created_by_user_id === record.created_by_user_id
            && candidate.realm_id === record.realm_id
          ));
        persistedState.signing_key_rotation_idempotency_keys.unshift({
          idempotency_key: idempotencyKey,
          created_by_user_id: record.created_by_user_id,
          realm_id: record.realm_id,
          rotation_id: record.id,
          recorded_at: nowIso(),
        });
        persistedState.signing_key_rotation_idempotency_keys = persistedState.signing_key_rotation_idempotency_keys.slice(0, 200);
      }
    }

    try {
      await savePersistedStateAsync(IAM_OPERATIONS_RUNTIME_FILE, persistedState);
      syncInMemoryState(persistedState);
      return;
    } catch (error) {
      if (!isPersistenceConflict(error) || attempt === 2) {
        throw error;
      }
    }
  }
}

async function finalizeResilienceRunAsync(
  leaseId: string,
  record: IamResilienceRunRecord | null,
  options?: {
    idempotency_key?: string | null;
  },
): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const persistedState = await loadStateAsync();
    const currentLease = persistedState.active_resilience_run;
    if (currentLease?.id !== leaseId) {
      if (!currentLease) {
        return;
      }
      throw new Error(`IAM resilience lease changed before completion: ${leaseId}`);
    }

    persistedState.active_resilience_run = null;
    if (record) {
      persistedState.resilience_runs.unshift(record);
      persistedState.resilience_runs = persistedState.resilience_runs.slice(0, 50);
      const idempotencyKey = normalizeIdempotencyKey(options?.idempotency_key);
      if (idempotencyKey) {
        persistedState.resilience_run_idempotency_keys = persistedState.resilience_run_idempotency_keys
          .filter((candidate) => !(
            candidate.idempotency_key === idempotencyKey
            && candidate.executed_by_user_id === record.executed_by_user_id
          ));
        persistedState.resilience_run_idempotency_keys.unshift({
          idempotency_key: idempotencyKey,
          executed_by_user_id: record.executed_by_user_id,
          run_id: record.id,
          recorded_at: nowIso(),
        });
        persistedState.resilience_run_idempotency_keys = persistedState.resilience_run_idempotency_keys.slice(0, 200);
      }
    }

    try {
      await savePersistedStateAsync(IAM_OPERATIONS_RUNTIME_FILE, persistedState);
      syncInMemoryState(persistedState);
      return;
    } catch (error) {
      if (!isPersistenceConflict(error) || attempt === 2) {
        throw error;
      }
    }
  }
}

async function finalizeRestoreAsync(
  leaseId: string,
  record: IamRestoreRecord | null,
  options?: {
    idempotency_key?: string | null;
  },
): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const persistedState = await loadStateAsync();
    const currentLease = persistedState.active_restore_run;
    if (currentLease?.id !== leaseId) {
      if (!currentLease) {
        return;
      }
      throw new Error(`IAM restore lease changed before completion: ${leaseId}`);
    }

    persistedState.active_restore_run = null;
    if (record) {
      persistedState.restores.unshift(record);
      persistedState.restores = persistedState.restores.slice(0, 50);
      const idempotencyKey = normalizeIdempotencyKey(options?.idempotency_key);
      if (idempotencyKey) {
        persistedState.restore_idempotency_keys = persistedState.restore_idempotency_keys
          .filter((candidate) => !(
            candidate.idempotency_key === idempotencyKey
            && candidate.created_by_user_id === record.created_by_user_id
            && candidate.backup_id === record.backup_id
            && candidate.mode === record.mode
          ));
        persistedState.restore_idempotency_keys.unshift({
          idempotency_key: idempotencyKey,
          created_by_user_id: record.created_by_user_id,
          backup_id: record.backup_id,
          mode: record.mode,
          restore_id: record.id,
          recorded_at: nowIso(),
        });
        persistedState.restore_idempotency_keys = persistedState.restore_idempotency_keys.slice(0, 200);
      }
    }

    try {
      await savePersistedStateAsync(IAM_OPERATIONS_RUNTIME_FILE, persistedState);
      syncInMemoryState(persistedState);
      return;
    } catch (error) {
      if (!isPersistenceConflict(error) || attempt === 2) {
        throw error;
      }
    }
  }
}

async function persistStateAsync(): Promise<void> {
  await savePersistedStateAsync(IAM_OPERATIONS_RUNTIME_FILE, state);
}

async function runWithDeferredPersistence<T>(operation: () => T | Promise<T>): Promise<T> {
  return await deferredPersistenceContext.run({ dirty: false }, async () => {
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

function collectSnapshot(): { snapshot: IamOperationsSnapshot; summary: IamBackupArtifactRecord['summary'] } {
  const foundationSummary = LocalIamFoundationStore.getSummary();
  const protocolSummary = LocalIamProtocolRuntimeStore.getSummary();
  const authenticationSummary = LocalIamAuthenticationRuntimeStore.getSummary();

  return {
    snapshot: {
      foundation: LocalIamFoundationStore.exportState(),
      auth_flows: LocalIamAuthFlowStore.exportState(),
      protocol: LocalIamProtocolRuntimeStore.exportState(),
      authentication: LocalIamAuthenticationRuntimeStore.exportState(),
      session_index: LocalIamSessionIndexStore.exportState(),
      token_ownership_index: LocalIamTokenOwnershipIndexStore.exportState(),
      federation_session_index: LocalIamFederationSessionIndexStore.exportState(),
      webauthn: LocalIamWebAuthnStore.exportState(),
      authorization: LocalIamAuthorizationRuntimeStore.exportState(),
      authorization_services: LocalIamAuthorizationServicesStore.exportState(),
      advanced_oauth: LocalIamAdvancedOAuthRuntimeStore.exportState(),
      federation: LocalIamFederationRuntimeStore.exportState(),
      experience: LocalIamExperienceRuntimeStore.exportState(),
      user_profiles: LocalIamUserProfileStore.exportState(),
      organizations: LocalIamOrganizationStore.exportState(),
      security_audit: LocalIamSecurityAuditStore.exportState(),
    },
    summary: {
      realm_count: foundationSummary.realm_count,
      user_count: foundationSummary.user_count,
      client_count: protocolSummary.client_count,
      active_session_count: authenticationSummary.active_browser_session_count,
      active_signing_key_count: protocolSummary.active_signing_key_count,
    },
  };
}

function toPublicBackup(record: StoredIamBackupArtifactRecord): IamBackupArtifactRecord {
  return {
    id: record.id,
    label: record.label,
    status: record.status,
    checksum_sha256: record.checksum_sha256,
    object_key: record.object_key,
    created_at: record.created_at,
    created_by_user_id: record.created_by_user_id,
    summary: clone(record.summary),
  };
}

function evaluateReadinessChecks(operationsState: IamOperationsRuntimeState = state): IamReadinessCheck[] {
  const foundationSummary = LocalIamFoundationStore.getSummary();
  const protocolSummary = LocalIamProtocolRuntimeStore.getSummary();
  const authSummary = LocalIamAuthenticationRuntimeStore.getSummary();
  const federationSummary = LocalIamFederationRuntimeStore.getSummary();
  const experienceSummary = LocalIamExperienceRuntimeStore.getSummary();
  const auditSummary = LocalIamSecurityAuditStore.getSummary();
  const recoverySummary = LocalIamRecoveryRuntimeStore.getSummary();
  const secretStoreSummary = LocalSecretStore.getSummary();
  const latestResilienceRun = operationsState.resilience_runs[0] ?? null;
  const latestBackup = operationsState.backups[0] ?? null;
  const latestRestore = operationsState.restores[0] ?? null;
  const latestRotation = operationsState.key_rotations[0] ?? null;
  const latestBackupFresh = isFreshEnough(latestBackup?.created_at, READINESS_BACKUP_FRESHNESS_MS);
  const latestRestoreFresh = isFreshEnough(latestRestore?.created_at, READINESS_RESTORE_FRESHNESS_MS);
  const latestRotationFresh = isFreshEnough(latestRotation?.created_at, READINESS_KEY_ROTATION_FRESHNESS_MS);
  const restoreMatchesLatestBackup = Boolean(
    latestBackup
    && latestRestore
    && latestRestore.backup_id === latestBackup.id
    && latestRestore.checksum_sha256 === latestBackup.checksum_sha256,
  );
  const restoreIsDryRunRehearsal = latestRestore?.mode === 'DRY_RUN' && latestRestore?.status === 'VALIDATED';

  return [
    {
      id: 'standalone-plane',
      name: 'Standalone subsystem boundary',
      status: foundationSummary.scope_model === 'STANDALONE_MULTI_REALM_WITH_CONSUMER_BINDINGS' ? 'PASS' : 'FAIL',
      summary: foundationSummary.scope_model === 'STANDALONE_MULTI_REALM_WITH_CONSUMER_BINDINGS'
        ? 'The IAM plane remains standalone and unbound from any downstream application runtime.'
        : 'The subsystem boundary no longer reflects standalone multi-realm operation.',
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_OPERATIONS_EVIDENCE_SUMMARY,
    },
    {
      id: 'backup-artifact',
      name: 'Backup artifact availability',
      status: latestBackup
        ? latestBackupFresh ? 'PASS' : 'WARN'
        : 'WARN',
      summary: latestBackup
        ? latestBackupFresh
          ? `Latest backup ${latestBackup.id} is current and captures ${latestBackup.summary.realm_count} realms and ${latestBackup.summary.user_count} users.`
          : `Latest backup ${latestBackup.id} exists but is older than the seven-day readiness freshness window.`
        : 'No standalone IAM backup artifact has been created yet.',
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_OPERATIONS_EVIDENCE_SUMMARY,
    },
    {
      id: 'restore-evidence',
      name: 'Restore evidence',
      status: latestRestore
        ? latestRestoreFresh ? 'PASS' : 'WARN'
        : 'WARN',
      summary: latestRestore
        ? latestRestoreFresh
          ? `${latestRestore.mode} restore evidence exists within the fourteen-day rehearsal window for backup ${latestRestore.backup_id}.`
          : `Latest restore evidence for backup ${latestRestore.backup_id} is older than the fourteen-day rehearsal window.`
        : 'No restore rehearsal or restore execution evidence exists yet.',
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_OPERATIONS_EVIDENCE_SUMMARY,
    },
    {
      id: 'restore-rehearsal-lineage',
      name: 'Restore rehearsal lineage',
      status: latestRestore && latestBackup
        ? (restoreIsDryRunRehearsal && restoreMatchesLatestBackup ? 'PASS' : 'WARN')
        : 'WARN',
      summary: !latestRestore
        ? 'No restore rehearsal exists yet to validate current backup lineage.'
        : !latestBackup
          ? 'No current backup artifact exists to validate restore lineage against.'
          : !restoreIsDryRunRehearsal
            ? `Latest restore evidence ${latestRestore.id} is ${latestRestore.mode} / ${latestRestore.status}; readiness expects a dry-run validated rehearsal of the current backup artifact.`
            : !restoreMatchesLatestBackup
              ? `Latest restore evidence ${latestRestore.id} does not match current backup ${latestBackup.id}; a fresh dry-run rehearsal is required for the latest backup lineage.`
              : `Latest restore evidence ${latestRestore.id} is a validated dry-run rehearsal for current backup ${latestBackup.id}.`,
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_OPERATIONS_EVIDENCE_SUMMARY,
    },
    {
      id: 'signing-key-rotation',
      name: 'Signing-key rotation',
      status: latestRotation && protocolSummary.active_signing_key_count > 0
        ? latestRotationFresh ? 'PASS' : 'WARN'
        : 'WARN',
      summary: latestRotation
        ? latestRotationFresh
          ? `Latest signing-key rotation activated ${latestRotation.activated_key_id} within the thirty-day readiness window.`
          : `Latest signing-key rotation activated ${latestRotation.activated_key_id}, but the evidence is older than the thirty-day readiness window.`
        : 'No signing-key rotation evidence exists yet.',
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_OPERATIONS_EVIDENCE_SUMMARY,
    },
    {
      id: 'secret-store-key-source',
      name: 'Secret-store key source hardening',
      status: secretStoreSummary.key_source === 'ENV_CONFIGURED' ? 'PASS' : 'FAIL',
      summary: secretStoreSummary.key_source === 'ENV_CONFIGURED'
        ? `Secret storage is encrypted with an environment-configured key across ${secretStoreSummary.active_secret_count} active managed secrets.`
        : 'Secret storage is still using development fallback key material; readiness is blocked until an environment-configured encryption key is in use.',
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_OPERATIONS_EVIDENCE_SUMMARY,
    },
    {
      id: 'recovery-drill-lineage',
      name: 'Recovery drill lineage and freshness',
      status: !recoverySummary.latest_drill_status
        ? 'WARN'
        : recoverySummary.latest_drill_lineage_validated
          && recoverySummary.latest_drill_targets_latest_backup
          && recoverySummary.latest_drill_is_fresh
          ? 'PASS'
          : 'WARN',
      summary: !recoverySummary.latest_drill_status
        ? 'No recovery drill has been recorded yet for current backup lineage readiness.'
        : !recoverySummary.latest_drill_lineage_validated
          ? 'Latest recovery drill did not validate backup lineage successfully.'
          : !recoverySummary.latest_drill_targets_latest_backup
            ? 'Latest recovery drill did not target the latest backup artifact at execution time.'
            : !recoverySummary.latest_drill_is_fresh
              ? 'Latest recovery drill evidence is older than the fourteen-day recovery freshness window.'
              : 'Latest recovery drill validated current backup lineage within the fourteen-day recovery freshness window.',
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_OPERATIONS_EVIDENCE_SUMMARY,
    },
    {
      id: 'security-ledger',
      name: 'Security audit and lockout controls',
      status: auditSummary.request_count > 0 && authSummary.failed_login_attempt_count >= 0 ? 'PASS' : 'WARN',
      summary: `${auditSummary.request_count} audited IAM requests, ${auditSummary.failure_count} audited failures, and ${authSummary.active_lockout_count} active lockouts are currently tracked.`,
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_OPERATIONS_EVIDENCE_SUMMARY,
    },
    {
      id: 'protocol-runtime',
      name: 'Protocol runtime coverage',
      status: protocolSummary.client_count > 0 && protocolSummary.active_signing_key_count > 0 ? 'PASS' : 'FAIL',
      summary: `${protocolSummary.client_count} clients, ${protocolSummary.service_account_count} service accounts, and ${protocolSummary.active_signing_key_count} active signing keys are present.`,
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_OPERATIONS_EVIDENCE_SUMMARY,
    },
    {
      id: 'browser-runtime',
      name: 'Browser authentication runtime',
      status: authSummary.browser_session_count >= 0 && authSummary.mfa_enrollment_count >= 0 ? 'PASS' : 'FAIL',
      summary: `${authSummary.browser_session_count} sessions and ${authSummary.mfa_enrollment_count} MFA enrollments are tracked.`,
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_OPERATIONS_EVIDENCE_SUMMARY,
    },
    {
      id: 'federation-runtime',
      name: 'Federation and brokering runtime',
      status: federationSummary.identity_provider_count > 0 && federationSummary.user_federation_provider_count > 0 ? 'PASS' : 'WARN',
      summary: `${federationSummary.identity_provider_count} identity providers and ${federationSummary.user_federation_provider_count} federation providers are configured.`,
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_OPERATIONS_EVIDENCE_SUMMARY,
    },
    {
      id: 'experience-runtime',
      name: 'Experience and notification runtime',
      status: experienceSummary.realm_theme_count >= 0 && experienceSummary.notification_template_count >= 0 ? 'PASS' : 'PASS',
      summary: `${experienceSummary.realm_theme_count} themes and ${experienceSummary.notification_template_count} notification templates are available.`,
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_OPERATIONS_EVIDENCE_SUMMARY,
    },
    {
      id: 'resilience-run',
      name: 'Resilience run evidence',
      status: latestResilienceRun?.overall_status === 'PASS' ? 'PASS' : latestResilienceRun ? 'WARN' : 'WARN',
      summary: latestResilienceRun
        ? `Latest resilience run ${latestResilienceRun.id} finished with ${latestResilienceRun.overall_status}.`
        : 'No resilience suite has been run yet.',
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_OPERATIONS_EVIDENCE_SUMMARY,
    },
    {
      id: 'runbooks-and-slos',
      name: 'Runbooks and SLOs',
      status: RUNBOOKS.length > 0 && SLO_DEFINITIONS.length > 0 ? 'PASS' : 'FAIL',
      summary: `${RUNBOOKS.length} runbooks and ${SLO_DEFINITIONS.length} SLO definitions are attached to the standalone subsystem.`,
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_OPERATIONS_EVIDENCE_SUMMARY,
    },
  ];
}

function buildResilienceChecks(operationsState: IamOperationsRuntimeState = state): IamResilienceCheck[] {
  const targetRealm = LocalIamFoundationStore.listRealms().realms.find((realm) => realm.id === 'realm-training-validation')
    ?? LocalIamFoundationStore.listRealms().realms[0];
  const protocolSummary = LocalIamProtocolRuntimeStore.getSummary();
  const authCatalog = LocalIamAuthenticationRuntimeStore.getPublicCatalog();
  const auditSummary = LocalIamSecurityAuditStore.getSummary();
  const foundationSummary = LocalIamFoundationStore.getSummary();
  const resilienceChecks: IamResilienceCheck[] = [];

  if (targetRealm) {
    const discovery = LocalIamProtocolRuntimeStore.getOidcDiscoveryDocument(targetRealm.id, `${VALIDATION_BASE_URL}/${targetRealm.id}`);
    const jwks = LocalIamProtocolRuntimeStore.getJwks();
    resilienceChecks.push({
      id: 'oidc-discovery',
      name: 'OIDC discovery and JWKS',
      status: discovery.issuer.length > 0 && jwks.keys.length > 0 ? 'PASS' : 'FAIL',
      summary: `${targetRealm.name} exposes discovery and ${jwks.keys.length} published verification keys.`,
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_OPERATIONS_EVIDENCE_SUMMARY,
    });
  }

  resilienceChecks.push({
    id: 'public-catalog',
    name: 'Public realm catalog',
    status: authCatalog.count > 0 ? 'PASS' : 'FAIL',
    summary: `${authCatalog.count} public realms are discoverable for standalone validation clients.`,
    evidence_mode: 'MODELED_RUNTIME_STATE',
    evidence_summary: MODELED_OPERATIONS_EVIDENCE_SUMMARY,
  });

  resilienceChecks.push({
    id: 'audit-ledger',
    name: 'Security audit ledger',
    status: auditSummary.request_count > 0 ? 'PASS' : 'WARN',
    summary: `${auditSummary.request_count} IAM requests and ${auditSummary.failure_count} failures are retained in the request audit ledger.`,
    evidence_mode: 'MODELED_RUNTIME_STATE',
    evidence_summary: MODELED_OPERATIONS_EVIDENCE_SUMMARY,
  });

  resilienceChecks.push({
    id: 'backup-artifact',
    name: 'Backup artifact presence',
    status: operationsState.backups.length > 0 ? 'PASS' : 'WARN',
    summary: operationsState.backups.length > 0
      ? `${operationsState.backups.length} backup artifacts are available for recovery rehearsal.`
      : 'No backup artifact exists yet for recovery rehearsal.',
    evidence_mode: 'MODELED_RUNTIME_STATE',
    evidence_summary: MODELED_OPERATIONS_EVIDENCE_SUMMARY,
  });

  resilienceChecks.push({
    id: 'subsystem-scale',
    name: 'Validation scale posture',
    status: foundationSummary.realm_count > 0 && protocolSummary.client_count > 0 ? 'PASS' : 'FAIL',
    summary: `${foundationSummary.realm_count} realms, ${foundationSummary.user_count} users, and ${protocolSummary.client_count} clients are populated for validation.`,
    evidence_mode: 'MODELED_RUNTIME_STATE',
    evidence_summary: MODELED_OPERATIONS_EVIDENCE_SUMMARY,
  });

  return resilienceChecks;
}

export const LocalIamOperationsRuntimeStore = {
  getSummary(): {
    generated_at: string;
    health: IamOperationsHealth;
    backup_count: number;
    restore_count: number;
    key_rotation_count: number;
    resilience_run_count: number;
    readiness_review_count: number;
    latest_readiness_decision: IamReadinessDecision | null;
  } {
    const latestReview = state.readiness_reviews[0] ?? null;
    const health: IamOperationsHealth = latestReview?.decision === 'APPROVED'
      ? 'HEALTHY'
      : state.resilience_runs[0]?.overall_status === 'FAIL'
        ? 'FAILED'
        : 'DEGRADED';

    return {
      generated_at: nowIso(),
      health,
      backup_count: state.backups.length,
      restore_count: state.restores.length,
      key_rotation_count: state.key_rotations.length,
      resilience_run_count: state.resilience_runs.length,
      readiness_review_count: state.readiness_reviews.length,
      latest_readiness_decision: latestReview?.decision ?? null,
    };
  },

  getDiagnostics(): {
    generated_at: string;
    health: IamOperationsHealth;
    subsystem_scope_model: string;
    counts: Record<string, number>;
    runbooks: IamRunbookRecord[];
    slo_definitions: IamSloDefinition[];
  } {
    const foundationSummary = LocalIamFoundationStore.getSummary();
    const protocolSummary = LocalIamProtocolRuntimeStore.getSummary();
    const authSummary = LocalIamAuthenticationRuntimeStore.getSummary();
    const federationSummary = LocalIamFederationRuntimeStore.getSummary();
    const experienceSummary = LocalIamExperienceRuntimeStore.getSummary();
    const auditSummary = LocalIamSecurityAuditStore.getSummary();
    const operationsSummary = this.getSummary();

    return {
      generated_at: nowIso(),
      health: operationsSummary.health,
      subsystem_scope_model: foundationSummary.scope_model,
      counts: {
        realms: foundationSummary.realm_count,
        users: foundationSummary.user_count,
        clients: protocolSummary.client_count,
        active_signing_keys: protocolSummary.active_signing_key_count,
        active_sessions: authSummary.active_browser_session_count,
        federation_providers: federationSummary.active_user_federation_provider_count,
        notification_templates: experienceSummary.notification_template_count,
        audited_requests: auditSummary.request_count,
      },
      runbooks: clone(RUNBOOKS),
      slo_definitions: clone(SLO_DEFINITIONS),
    };
  },

  listBackups(): { generated_at: string; backups: IamBackupArtifactRecord[]; count: number } {
    return {
      generated_at: nowIso(),
      backups: state.backups.map(toPublicBackup),
      count: state.backups.length,
    };
  },

  createBackup(actorUserId: string, input?: { label?: string | null }): IamBackupArtifactRecord {
    const { snapshot, summary } = collectSnapshot();
    const backupId = `iam-backup-${randomUUID()}`;
    const label = input?.label?.trim() || `Standalone IAM backup ${new Date().toLocaleString()}`;
    const record: StoredIamBackupArtifactRecord = {
      id: backupId,
      label,
      status: 'READY',
      checksum_sha256: hashSnapshot(snapshot),
      object_key: `iam/operations/backups/${backupId}.json`,
      created_at: nowIso(),
      created_by_user_id: actorUserId,
      summary,
      snapshot,
    };
    state.backups.unshift(record);
    state.backups = state.backups.slice(0, 50);
    persistState();
    return toPublicBackup(record);
  },

  async createBackupAsync(
    actorUserId: string,
    input?: {
      label?: string | null;
      idempotency_key?: string | null;
    },
  ): Promise<IamBackupArtifactRecord> {
    const idempotencyKey = normalizeIdempotencyKey(input?.idempotency_key);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const persistedState = await loadStateAsync();
      assertRestoreLeaseNotActive(persistedState, 'backup');
      const existingRecord = resolveRecordedBackup(persistedState, actorUserId, idempotencyKey);
      if (existingRecord) {
        syncInMemoryState(persistedState);
        return clone(existingRecord);
      }

      const { snapshot, summary } = collectSnapshot();
      const backupId = `iam-backup-${randomUUID()}`;
      const label = input?.label?.trim() || `Standalone IAM backup ${new Date().toLocaleString()}`;
      const record: StoredIamBackupArtifactRecord = {
        id: backupId,
        label,
        status: 'READY',
        checksum_sha256: hashSnapshot(snapshot),
        object_key: `iam/operations/backups/${backupId}.json`,
        created_at: nowIso(),
        created_by_user_id: actorUserId,
        summary,
        snapshot,
      };
      persistedState.backups.unshift(record);
      persistedState.backups = persistedState.backups.slice(0, 50);
      if (idempotencyKey) {
        persistedState.backup_idempotency_keys = persistedState.backup_idempotency_keys
          .filter((candidate) => !(
            candidate.idempotency_key === idempotencyKey
            && candidate.created_by_user_id === actorUserId
          ));
        persistedState.backup_idempotency_keys.unshift({
          idempotency_key: idempotencyKey,
          created_by_user_id: actorUserId,
          backup_id: record.id,
          recorded_at: nowIso(),
        });
        persistedState.backup_idempotency_keys = persistedState.backup_idempotency_keys.slice(0, 200);
      }
      try {
        await savePersistedStateAsync(IAM_OPERATIONS_RUNTIME_FILE, persistedState);
        syncInMemoryState(persistedState);
        return toPublicBackup(record);
      } catch (error) {
        if (!isPersistenceConflict(error) || attempt === 2) {
          throw error;
        }
      }
    }

    throw new Error('Unable to create IAM backup');
  },

  listRestores(): IamRestoresResponse {
    return {
      generated_at: nowIso(),
      active_run: isRestoreLeaseActive(state.active_restore_run)
        ? clone(state.active_restore_run)
        : null,
      restores: clone(state.restores),
      count: state.restores.length,
    };
  },

  restoreBackup(actorUserId: string, backupId: string, mode: IamRestoreMode): IamRestoreRecord {
    const backup = state.backups.find((record) => record.id === backupId);
    if (!backup) {
      throw new Error(`Unknown IAM backup artifact: ${backupId}`);
    }

    if (mode === 'EXECUTE') {
      LocalIamFoundationStore.importState(backup.snapshot.foundation);
      LocalIamAuthFlowStore.importState(backup.snapshot.auth_flows ?? {});
      LocalIamProtocolRuntimeStore.importState(backup.snapshot.protocol);
      LocalIamAuthenticationRuntimeStore.importState(backup.snapshot.authentication);
      LocalIamSessionIndexStore.importState(backup.snapshot.session_index ?? {});
      LocalIamTokenOwnershipIndexStore.importState(backup.snapshot.token_ownership_index ?? {});
      LocalIamFederationSessionIndexStore.importState(backup.snapshot.federation_session_index ?? {});
      LocalIamWebAuthnStore.importState(backup.snapshot.webauthn ?? {});
      LocalIamAuthorizationRuntimeStore.importState(backup.snapshot.authorization ?? {});
      LocalIamAuthorizationServicesStore.importState(backup.snapshot.authorization_services ?? {});
      LocalIamAdvancedOAuthRuntimeStore.importState(backup.snapshot.advanced_oauth ?? {});
      LocalIamFederationRuntimeStore.importState(backup.snapshot.federation);
      LocalIamExperienceRuntimeStore.importState(backup.snapshot.experience);
      LocalIamUserProfileStore.importState(backup.snapshot.user_profiles ?? {});
      LocalIamOrganizationStore.importState(backup.snapshot.organizations ?? {});
      LocalIamSecurityAuditStore.importState(backup.snapshot.security_audit);
    }

    const record: IamRestoreRecord = {
      id: `iam-restore-${randomUUID()}`,
      backup_id: backup.id,
      mode,
      status: mode === 'EXECUTE' ? 'APPLIED' : 'VALIDATED',
      created_at: nowIso(),
      created_by_user_id: actorUserId,
      summary: clone(backup.summary),
      checksum_sha256: backup.checksum_sha256,
    };
    state.restores.unshift(record);
    state.restores = state.restores.slice(0, 50);
    persistState();
    return clone(record);
  },

  async restoreBackupAsync(
    actorUserId: string,
    backupId: string,
    mode: IamRestoreMode,
    input?: {
      idempotency_key?: string | null;
    },
  ): Promise<IamRestoreRecord> {
    const persistedState = await loadStateAsync();
    const backup = persistedState.backups.find((record) => record.id === backupId);
    if (!backup) {
      throw new Error(`Unknown IAM backup artifact: ${backupId}`);
    }
    const idempotencyKey = normalizeIdempotencyKey(input?.idempotency_key);
    const existingRecord = resolveRecordedRestore(persistedState, actorUserId, backup.id, mode, idempotencyKey);
    if (existingRecord) {
      syncInMemoryState(persistedState);
      return clone(existingRecord);
    }

    if (mode !== 'EXECUTE') {
      const record: IamRestoreRecord = {
        id: `iam-restore-${randomUUID()}`,
        backup_id: backup.id,
        mode,
        status: 'VALIDATED',
        created_at: nowIso(),
        created_by_user_id: actorUserId,
        summary: clone(backup.summary),
        checksum_sha256: backup.checksum_sha256,
      };
      persistedState.restores.unshift(record);
      persistedState.restores = persistedState.restores.slice(0, 50);
      if (idempotencyKey) {
        persistedState.restore_idempotency_keys = persistedState.restore_idempotency_keys
          .filter((candidate) => !(
            candidate.idempotency_key === idempotencyKey
            && candidate.created_by_user_id === actorUserId
            && candidate.backup_id === backup.id
            && candidate.mode === mode
          ));
        persistedState.restore_idempotency_keys.unshift({
          idempotency_key: idempotencyKey,
          created_by_user_id: actorUserId,
          backup_id: backup.id,
          mode,
          restore_id: record.id,
          recorded_at: nowIso(),
        });
        persistedState.restore_idempotency_keys = persistedState.restore_idempotency_keys.slice(0, 200);
      }
      await savePersistedStateAsync(IAM_OPERATIONS_RUNTIME_FILE, persistedState);
      syncInMemoryState(persistedState);
      return clone(record);
    }

    const lease = await acquireRestoreLeaseAsync(actorUserId, backup.id, mode);
    try {
      LocalIamFoundationStore.importState(backup.snapshot.foundation);
      LocalIamAuthFlowStore.importState(backup.snapshot.auth_flows ?? {});
      LocalIamProtocolRuntimeStore.importState(backup.snapshot.protocol);
      LocalIamAuthenticationRuntimeStore.importState(backup.snapshot.authentication);
      LocalIamSessionIndexStore.importState(backup.snapshot.session_index ?? {});
      LocalIamTokenOwnershipIndexStore.importState(backup.snapshot.token_ownership_index ?? {});
      LocalIamFederationSessionIndexStore.importState(backup.snapshot.federation_session_index ?? {});
      LocalIamWebAuthnStore.importState(backup.snapshot.webauthn ?? {});
      LocalIamAuthorizationRuntimeStore.importState(backup.snapshot.authorization ?? {});
      LocalIamAuthorizationServicesStore.importState(backup.snapshot.authorization_services ?? {});
      LocalIamAdvancedOAuthRuntimeStore.importState(backup.snapshot.advanced_oauth ?? {});
      LocalIamFederationRuntimeStore.importState(backup.snapshot.federation);
      LocalIamExperienceRuntimeStore.importState(backup.snapshot.experience);
      LocalIamUserProfileStore.importState(backup.snapshot.user_profiles ?? {});
      LocalIamOrganizationStore.importState(backup.snapshot.organizations ?? {});
      LocalIamSecurityAuditStore.importState(backup.snapshot.security_audit);

      const record: IamRestoreRecord = {
        id: `iam-restore-${randomUUID()}`,
        backup_id: backup.id,
        mode,
        status: 'APPLIED',
        created_at: nowIso(),
        created_by_user_id: actorUserId,
        summary: clone(backup.summary),
        checksum_sha256: backup.checksum_sha256,
      };
      await finalizeRestoreAsync(lease.id, record, {
        idempotency_key: idempotencyKey,
      });
      return clone(record);
    } catch (error) {
      await finalizeRestoreAsync(lease.id, null);
      throw error;
    }
  },

  listSigningKeyRotations(): IamSigningKeyRotationsResponse {
    return {
      generated_at: nowIso(),
      active_run: isSigningKeyRotationLeaseActive(state.active_signing_key_rotation_run)
        ? clone(state.active_signing_key_rotation_run)
        : null,
      rotations: clone(state.key_rotations),
      count: state.key_rotations.length,
    };
  },

  rotateSigningKeySyncOnly(actorUserId: string, realmId: string | null): IamSigningKeyRotationRecord {
    const rotation = LocalIamProtocolRuntimeStore.rotateSigningKeySyncOnly(actorUserId, realmId);
    const record: IamSigningKeyRotationRecord = {
      id: `iam-key-rotation-${randomUUID()}`,
      realm_id: realmId,
      retired_key_ids: rotation.retired_key_ids,
      activated_key_id: rotation.active_key.id,
      created_at: nowIso(),
      created_by_user_id: actorUserId,
    };
    state.key_rotations.unshift(record);
    state.key_rotations = state.key_rotations.slice(0, 50);
    persistState();
    return clone(record);
  },

  async rotateSigningKeyAsync(
    actorUserId: string,
    realmId: string | null,
    input?: {
      idempotency_key?: string | null;
    },
  ): Promise<IamSigningKeyRotationRecord> {
    const idempotencyKey = normalizeIdempotencyKey(input?.idempotency_key);
    const existingRecord = resolveRecordedSigningKeyRotation(await loadStateAsync(), actorUserId, realmId, idempotencyKey);
    if (existingRecord) {
      const latestState = await loadStateAsync();
      syncInMemoryState(latestState);
      return clone(existingRecord);
    }
    const lease = await acquireSigningKeyRotationLeaseAsync(actorUserId, realmId);
    const rotation = await LocalIamProtocolRuntimeStore.rotateSigningKeyAsync(actorUserId, realmId);
    const record: IamSigningKeyRotationRecord = {
      id: `iam-key-rotation-${randomUUID()}`,
      realm_id: realmId,
      retired_key_ids: rotation.retired_key_ids,
      activated_key_id: rotation.active_key.id,
      created_at: nowIso(),
      created_by_user_id: actorUserId,
    };
    try {
      await finalizeSigningKeyRotationAsync(lease.id, record, {
        idempotency_key: idempotencyKey,
      });
    } catch (error) {
      await finalizeSigningKeyRotationAsync(lease.id, null);
      throw error;
    }
    return clone(record);
  },

  listResilienceRuns(): IamResilienceRunsResponse {
    return {
      generated_at: nowIso(),
      active_run: isResilienceLeaseActive(state.active_resilience_run)
        ? clone(state.active_resilience_run)
        : null,
      runs: clone(state.resilience_runs),
      count: state.resilience_runs.length,
    };
  },

  listTransientStateMaintenanceRuns(): IamTransientStateMaintenanceRunsResponse {
    return {
      generated_at: nowIso(),
      active_run: isTransientMaintenanceLeaseActive(state.active_transient_state_maintenance_run)
        ? clone(state.active_transient_state_maintenance_run)
        : null,
      runs: clone(state.transient_state_maintenance_runs),
      count: state.transient_state_maintenance_runs.length,
    };
  },

  async runTransientStateMaintenanceAsync(
    actorUserId: string,
    input?: {
      idempotency_key?: string | null;
    },
  ): Promise<IamTransientStateMaintenanceRunRecord> {
    const idempotencyKey = normalizeIdempotencyKey(input?.idempotency_key);
    const existingRecord = resolveRecordedTransientStateMaintenanceRun(await loadStateAsync(), actorUserId, idempotencyKey);
    if (existingRecord) {
      const latestState = await loadStateAsync();
      syncInMemoryState(latestState);
      return clone(existingRecord);
    }
    const lease = await acquireTransientStateMaintenanceLeaseAsync(actorUserId);
    const foundation = await LocalIamFoundationStore.runTransientStateMaintenanceAsync();
    const organizations = await LocalIamOrganizationStore.runTransientStateMaintenanceAsync();
    const authentication = await LocalIamAuthenticationRuntimeStore.runTransientStateMaintenanceAsync();
    const authorization = await LocalIamAuthorizationRuntimeStore.runTransientStateMaintenanceAsync();
    const authorizationServices = await LocalIamAuthorizationServicesStore.runTransientStateMaintenanceAsync();
    const advancedOauth = await LocalIamAdvancedOAuthRuntimeStore.runTransientStateMaintenanceAsync();
    const protocol = await LocalIamProtocolRuntimeStore.runTransientStateMaintenanceAsync();
    const webauthn = await LocalIamWebAuthnStore.runTransientStateMaintenanceAsync();
    const record: IamTransientStateMaintenanceRunRecord = {
      id: `iam-transient-maintenance-${randomUUID()}`,
      executed_at: nowIso(),
      executed_by_user_id: actorUserId,
      foundation,
      organizations,
      authentication,
      authorization,
      authorization_services: authorizationServices,
      advanced_oauth: advancedOauth,
      protocol,
      webauthn,
      total_mutated_count:
        foundation.total_mutated_count
        + organizations.total_mutated_count
        + authentication.total_mutated_count
        + authorization.total_mutated_count
        + authorizationServices.total_mutated_count
        + advancedOauth.total_mutated_count
        + protocol.total_mutated_count
        + webauthn.total_mutated_count,
    };
    try {
      await finalizeTransientStateMaintenanceRunAsync(lease.id, record, {
        idempotency_key: idempotencyKey,
      });
    } catch (error) {
      await finalizeTransientStateMaintenanceRunAsync(lease.id, null);
      throw error;
    }
    return clone(record);
  },

  runResilienceSuite(actorUserId: string): IamResilienceRunRecord {
    const checks = buildResilienceChecks();
    const overallStatus: IamResilienceStatus = checks.some((check) => check.status === 'FAIL')
      ? 'FAIL'
      : checks.some((check) => check.status === 'WARN')
        ? 'WARN'
        : 'PASS';
    const record: IamResilienceRunRecord = {
      id: `iam-resilience-${randomUUID()}`,
      executed_at: nowIso(),
      executed_by_user_id: actorUserId,
      overall_status: overallStatus,
      checks,
      count: checks.length,
      evidence_mode: 'RECORDED_VALIDATION_OPERATION',
      evidence_summary: RECORDED_OPERATIONS_EVIDENCE_SUMMARY,
      market_claim_ready: false,
    };
    state.resilience_runs.unshift(record);
    state.resilience_runs = state.resilience_runs.slice(0, 50);
    persistState();
    return clone(record);
  },

  async runResilienceSuiteAsync(
    actorUserId: string,
    input?: {
      idempotency_key?: string | null;
    },
  ): Promise<IamResilienceRunRecord> {
    const idempotencyKey = normalizeIdempotencyKey(input?.idempotency_key);
    const existingRecord = resolveRecordedResilienceRun(await loadStateAsync(), actorUserId, idempotencyKey);
    if (existingRecord) {
      const latestState = await loadStateAsync();
      syncInMemoryState(latestState);
      return clone(existingRecord);
    }
    const lease = await acquireResilienceLeaseAsync(actorUserId);
    const persistedState = await loadStateAsync();
    const checks = buildResilienceChecks(persistedState);
    const overallStatus: IamResilienceStatus = checks.some((check) => check.status === 'FAIL')
      ? 'FAIL'
      : checks.some((check) => check.status === 'WARN')
        ? 'WARN'
        : 'PASS';
    const record: IamResilienceRunRecord = {
      id: `iam-resilience-${randomUUID()}`,
      executed_at: nowIso(),
      executed_by_user_id: actorUserId,
      overall_status: overallStatus,
      checks,
      count: checks.length,
      evidence_mode: 'RECORDED_VALIDATION_OPERATION',
      evidence_summary: RECORDED_OPERATIONS_EVIDENCE_SUMMARY,
      market_claim_ready: false,
    };
    try {
      await finalizeResilienceRunAsync(lease.id, record, {
        idempotency_key: idempotencyKey,
      });
    } catch (error) {
      await finalizeResilienceRunAsync(lease.id, null);
      throw error;
    }
    return clone(record);
  },

  getReadinessReview(): {
    generated_at: string;
    checks: IamReadinessCheck[];
    latest_review: IamReadinessReviewRecord | null;
    evidence_mode: IamOperationsEvidenceMode;
    evidence_summary: string;
    market_claim_ready: boolean;
    runbooks: IamRunbookRecord[];
    slo_definitions: IamSloDefinition[];
    agentic_development_notes: string[];
    claim_boundary_notes: string[];
    count: number;
  } {
    const checks = evaluateReadinessChecks();
    return {
      generated_at: nowIso(),
      checks,
      latest_review: state.readiness_reviews[0] ? clone(state.readiness_reviews[0]) : null,
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_OPERATIONS_EVIDENCE_SUMMARY,
      market_claim_ready: false,
      runbooks: clone(RUNBOOKS),
      slo_definitions: clone(SLO_DEFINITIONS),
      agentic_development_notes: [
        'Keep validation inside standalone realms and standalone users. Do not point downstream application runtime sessions at this subsystem until adoption review is explicitly approved.',
        'Agentic testing should create a backup before destructive operations, run restore in dry-run mode first, and retain review evidence after each validation pass.',
        'Use signing-key rotation, resilience runs, and readiness reviews as explicit evidence artifacts rather than assuming code completion equals operational readiness.',
      ],
      claim_boundary_notes: [
        'This readiness workspace is based on internal runtime state and recorded validation operations.',
        'Pass and warn states here do not, by themselves, prove production-grade support or external market parity.',
        'Use the formal status and support matrices for governed support and maturity claims.',
      ],
      count: checks.length,
    };
  },

  recordReadinessReview(actorUserId: string, input?: { notes?: string[] | null }): IamReadinessReviewRecord {
    const checks = evaluateReadinessChecks();
    const decision: IamReadinessDecision = checks.every((check) => check.status === 'PASS') ? 'APPROVED' : 'BLOCKED';
    const record: IamReadinessReviewRecord = {
      id: `iam-readiness-review-${randomUUID()}`,
      created_at: nowIso(),
      created_by_user_id: actorUserId,
      decision,
      notes: input?.notes?.map((note) => note.trim()).filter(Boolean) ?? [],
      checks,
      count: checks.length,
      evidence_mode: 'RECORDED_VALIDATION_OPERATION',
      evidence_summary: RECORDED_OPERATIONS_EVIDENCE_SUMMARY,
      market_claim_ready: false,
    };
    state.readiness_reviews.unshift(record);
    state.readiness_reviews = state.readiness_reviews.slice(0, 50);
    persistState();
    return clone(record);
  },

  async recordReadinessReviewAsync(
    actorUserId: string,
    input?: {
      notes?: string[] | null;
      idempotency_key?: string | null;
    },
  ): Promise<IamReadinessReviewRecord> {
    const persistedState = await loadStateAsync();
    const idempotencyKey = normalizeIdempotencyKey(input?.idempotency_key);
    const existingRecord = resolveRecordedReadinessReview(persistedState, actorUserId, idempotencyKey);
    if (existingRecord) {
      syncInMemoryState(persistedState);
      return clone(existingRecord);
    }
    const checks = evaluateReadinessChecks(persistedState);
    const decision: IamReadinessDecision = checks.every((check) => check.status === 'PASS') ? 'APPROVED' : 'BLOCKED';
    const record: IamReadinessReviewRecord = {
      id: `iam-readiness-review-${randomUUID()}`,
      created_at: nowIso(),
      created_by_user_id: actorUserId,
      decision,
      notes: input?.notes?.map((note) => note.trim()).filter(Boolean) ?? [],
      checks,
      count: checks.length,
      evidence_mode: 'RECORDED_VALIDATION_OPERATION',
      evidence_summary: RECORDED_OPERATIONS_EVIDENCE_SUMMARY,
      market_claim_ready: false,
    };
    persistedState.readiness_reviews.unshift(record);
    persistedState.readiness_reviews = persistedState.readiness_reviews.slice(0, 50);
    if (idempotencyKey) {
      persistedState.readiness_review_idempotency_keys = persistedState.readiness_review_idempotency_keys
        .filter((candidate) => !(
          candidate.idempotency_key === idempotencyKey
          && candidate.created_by_user_id === actorUserId
        ));
      persistedState.readiness_review_idempotency_keys.unshift({
        idempotency_key: idempotencyKey,
        created_by_user_id: actorUserId,
        review_id: record.id,
        recorded_at: nowIso(),
      });
      persistedState.readiness_review_idempotency_keys = persistedState.readiness_review_idempotency_keys.slice(0, 200);
    }
    await savePersistedStateAsync(IAM_OPERATIONS_RUNTIME_FILE, persistedState);
    syncInMemoryState(persistedState);
    return clone(record);
  },
};
