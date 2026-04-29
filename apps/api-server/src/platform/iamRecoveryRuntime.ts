import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { LocalIamDeploymentRuntimeStore } from './iamDeploymentRuntime';
import { LocalIamOperationsRuntimeStore } from './iamOperationsRuntime';
import { loadOrCreatePersistedState, reloadOrCreatePersistedStateAsync, savePersistedState, savePersistedStateAsync } from './persistence';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

const IAM_RECOVERY_RUNTIME_FILE = 'iam-recovery-runtime-state.json';
const RECOVERY_DRILL_FRESHNESS_MS = 1000 * 60 * 60 * 24 * 14;
const deferredPersistenceContext = new AsyncLocalStorage<{ dirty: boolean }>();

export interface IamRecoveryProfileRecord {
  id: string;
  name: string;
  backup_storage_mode: 'S3_VERSIONED_OBJECT_LOCK';
  database_recovery_mode: 'DYNAMODB_PITR';
  replication_mode: 'SAME_REGION_VERSIONED' | 'CROSS_REGION_WARM_STANDBY';
  rpo_target_minutes: number;
  rto_target_minutes: number;
  immutability_enabled: boolean;
  operator_notes: string[];
  updated_at: string;
}

export interface IamRecoveryDrillRecord {
  id: string;
  backup_id: string;
  restore_record_id: string;
  resilience_run_id: string;
  executed_at: string;
  executed_by_user_id: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  measured_recovery_minutes: number;
  rpo_target_minutes: number;
  rto_target_minutes: number;
  integrity_validated: boolean;
  backup_lineage_validated: boolean;
  latest_backup_at_execution: boolean;
  notes: string[];
}

interface IamRecoveryRuntimeState {
  profile: IamRecoveryProfileRecord | null;
  drills: IamRecoveryDrillRecord[];
  recovery_drill_idempotency_keys: Array<{
    idempotency_key: string;
    executed_by_user_id: string;
    requested_backup_id: string | null;
    recovery_drill_id: string;
    recorded_at: string;
  }>;
}

function buildProfile(): IamRecoveryProfileRecord {
  const deployment = LocalIamDeploymentRuntimeStore.getDeploymentProfile().active_profile;
  const warmStandby = deployment.topology_mode === 'AWS_MULTI_REGION_WARM_STANDBY';
  return {
    id: 'iam-standalone-recovery-profile',
    name: 'Standalone IAM Recovery Profile',
    backup_storage_mode: 'S3_VERSIONED_OBJECT_LOCK',
    database_recovery_mode: 'DYNAMODB_PITR',
    replication_mode: warmStandby ? 'CROSS_REGION_WARM_STANDBY' : 'SAME_REGION_VERSIONED',
    rpo_target_minutes: warmStandby ? 10 : 30,
    rto_target_minutes: warmStandby ? 30 : 60,
    immutability_enabled: true,
    operator_notes: [
      'Recovery drills must remain standalone and must not be used as implicit approval for downstream application migration.',
      'Object-lock backup retention and DynamoDB PITR are the baseline protection controls for the productionized standalone IAM plane.',
    ],
    updated_at: nowIso(),
  };
}

function normalizeState(input: Partial<IamRecoveryRuntimeState>): IamRecoveryRuntimeState {
  return {
    profile: input.profile ? clone(input.profile) : buildProfile(),
    drills: Array.isArray(input.drills) ? clone(input.drills) : [],
    recovery_drill_idempotency_keys: Array.isArray(input.recovery_drill_idempotency_keys)
      ? clone(input.recovery_drill_idempotency_keys)
      : [],
  };
}

function normalizeIdempotencyKey(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function buildRecoveryDrillNestedIdempotencyKey(parentKey: string, suffix: string): string {
  return `recovery-drill:${parentKey}:${suffix}`
}

function resolveRecordedRecoveryDrill(
  persistedState: IamRecoveryRuntimeState,
  actorUserId: string,
  requestedBackupId: string | null,
  idempotencyKey: string | null,
): IamRecoveryDrillRecord | null {
  if (!idempotencyKey) {
    return null
  }
  const recordedKey = persistedState.recovery_drill_idempotency_keys.find(
    (candidate) =>
      candidate.idempotency_key === idempotencyKey
      && candidate.executed_by_user_id === actorUserId
      && candidate.requested_backup_id === requestedBackupId,
  )
  if (!recordedKey) {
    return null
  }
  return persistedState.drills.find((drill) => drill.id === recordedKey.recovery_drill_id) ?? null
}

const state = normalizeState(
  loadOrCreatePersistedState<Partial<IamRecoveryRuntimeState>>(IAM_RECOVERY_RUNTIME_FILE, () => normalizeState({}))
);

async function loadStateAsync(): Promise<IamRecoveryRuntimeState> {
  return normalizeState(
    await reloadOrCreatePersistedStateAsync<Partial<IamRecoveryRuntimeState>>(
      IAM_RECOVERY_RUNTIME_FILE,
      () => normalizeState({}),
    ),
  );
}

function syncInMemoryState(nextState: IamRecoveryRuntimeState): void {
  state.profile = nextState.profile ? clone(nextState.profile) : null;
  state.drills = clone(nextState.drills);
  state.recovery_drill_idempotency_keys = clone(nextState.recovery_drill_idempotency_keys);
}

function persistState(): void {
  const deferredContext = deferredPersistenceContext.getStore();
  if (deferredContext) {
    deferredContext.dirty = true;
    return;
  }
  savePersistedState(IAM_RECOVERY_RUNTIME_FILE, state);
}

async function persistStateAsync(): Promise<void> {
  await savePersistedStateAsync(IAM_RECOVERY_RUNTIME_FILE, state);
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

function measuredRecoveryMinutes(): number {
  const deployment = LocalIamDeploymentRuntimeStore.getDeploymentProfile().active_profile;
  if (deployment.topology_mode === 'AWS_MULTI_REGION_WARM_STANDBY') {
    return 24;
  }
  if (deployment.topology_mode === 'AWS_SINGLE_REGION_HA') {
    return 39;
  }
  return 58;
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

function buildRecoveryLineageAssessment(
  latestBackupId: string | null,
  selectedBackupId: string,
  selectedBackupChecksum: string,
  restoreChecksum: string,
): {
  backupLineageValidated: boolean;
  latestBackupAtExecution: boolean;
  lineageNotes: string[];
} {
  const latestBackupAtExecution = latestBackupId === selectedBackupId;
  const backupLineageValidated = selectedBackupChecksum === restoreChecksum;
  const lineageNotes: string[] = [];

  if (backupLineageValidated) {
    lineageNotes.push('Restore checksum matches the selected backup lineage.')
  } else {
    lineageNotes.push('Restore checksum does not match the selected backup lineage.')
  }

  if (latestBackupAtExecution) {
    lineageNotes.push('Recovery drill targeted the latest backup artifact available at execution time.')
  } else {
    lineageNotes.push('Recovery drill targeted an older backup artifact; rerun the drill against the latest backup to satisfy readiness evidence.')
  }

  return {
    backupLineageValidated,
    latestBackupAtExecution,
    lineageNotes,
  };
}

export const LocalIamRecoveryRuntimeStore = {
  getSummary(): {
    generated_at: string;
    recovery_profile_count: number;
    recovery_drill_count: number;
    latest_drill_status: 'PASS' | 'WARN' | 'FAIL' | null;
    latest_drill_is_fresh: boolean;
    latest_drill_targets_latest_backup: boolean;
    latest_drill_lineage_validated: boolean;
  } {
    const latestDrill = state.drills[0] ?? null;
    const latestBackupId = LocalIamOperationsRuntimeStore.listBackups().backups[0]?.id ?? null;
    const latestDrillTargetsCurrentLatestBackup = latestDrill
      ? latestDrill.backup_id === latestBackupId
      : false;
    return {
      generated_at: nowIso(),
      recovery_profile_count: state.profile ? 1 : 0,
      recovery_drill_count: state.drills.length,
      latest_drill_status: latestDrill?.status ?? null,
      latest_drill_is_fresh: isFreshEnough(latestDrill?.executed_at, RECOVERY_DRILL_FRESHNESS_MS),
      latest_drill_targets_latest_backup: latestDrillTargetsCurrentLatestBackup,
      latest_drill_lineage_validated: latestDrill?.backup_lineage_validated ?? false,
    };
  },

  getRecoveryProfile(): {
    generated_at: string;
    profile: IamRecoveryProfileRecord;
    latest_drill: IamRecoveryDrillRecord | null;
    drills: IamRecoveryDrillRecord[];
    count: number;
  } {
    if (!state.profile) {
      state.profile = buildProfile();
      persistState();
    }
    return {
      generated_at: nowIso(),
      profile: clone(state.profile),
      latest_drill: state.drills[0] ? clone(state.drills[0]) : null,
      drills: clone(state.drills),
      count: state.drills.length,
    };
  },

  runRecoveryDrill(actorUserId: string, input?: { backup_id?: string | null }): IamRecoveryDrillRecord {
    if (!state.profile) {
      state.profile = buildProfile();
    }

    const currentBackups = LocalIamOperationsRuntimeStore.listBackups().backups;
    const selectedBackup = (input?.backup_id
      ? currentBackups.find((backup) => backup.id === input.backup_id)
      : currentBackups[0])
      ?? LocalIamOperationsRuntimeStore.createBackup(actorUserId, {
        label: 'Standalone IAM recovery drill backup',
      });
    const restore = LocalIamOperationsRuntimeStore.restoreBackup(actorUserId, selectedBackup.id, 'DRY_RUN');
    const resilience = LocalIamOperationsRuntimeStore.runResilienceSuite(actorUserId);
    const recoveryMinutes = measuredRecoveryMinutes();
    const lineageAssessment = buildRecoveryLineageAssessment(
      currentBackups[0]?.id ?? selectedBackup.id,
      selectedBackup.id,
      selectedBackup.checksum_sha256,
      restore.checksum_sha256,
    );
    const status: 'PASS' | 'WARN' | 'FAIL' = restore.status !== 'VALIDATED'
      ? 'FAIL'
      : !lineageAssessment.backupLineageValidated
        ? 'FAIL'
      : resilience.overall_status === 'FAIL'
        ? 'FAIL'
        : !lineageAssessment.latestBackupAtExecution
          ? 'WARN'
        : recoveryMinutes <= state.profile.rto_target_minutes
          ? 'PASS'
          : 'WARN';

    const record: IamRecoveryDrillRecord = {
      id: `iam-recovery-drill-${randomUUID()}`,
      backup_id: selectedBackup.id,
      restore_record_id: restore.id,
      resilience_run_id: resilience.id,
      executed_at: nowIso(),
      executed_by_user_id: actorUserId,
      status,
      measured_recovery_minutes: recoveryMinutes,
      rpo_target_minutes: state.profile.rpo_target_minutes,
      rto_target_minutes: state.profile.rto_target_minutes,
      integrity_validated: lineageAssessment.backupLineageValidated,
      backup_lineage_validated: lineageAssessment.backupLineageValidated,
      latest_backup_at_execution: lineageAssessment.latestBackupAtExecution,
      notes: [
        'Recovery drill executed from the standalone IAM operations plane.',
        'The resulting restore and resilience evidence remain standalone review artifacts and do not authorize downstream adoption.',
        ...lineageAssessment.lineageNotes,
      ],
    };
    state.drills.unshift(record);
    state.drills = state.drills.slice(0, 25);
    state.profile.updated_at = record.executed_at;
    persistState();
    return clone(record);
  },

  async runRecoveryDrillAsync(
    actorUserId: string,
    input?: {
      backup_id?: string | null;
      idempotency_key?: string | null;
    },
  ): Promise<IamRecoveryDrillRecord> {
    const persistedState = await loadStateAsync();
    if (!persistedState.profile) {
      persistedState.profile = buildProfile();
    }
    const requestedBackupId = input?.backup_id?.trim() || null;
    const idempotencyKey = normalizeIdempotencyKey(input?.idempotency_key);
    const existingRecord = resolveRecordedRecoveryDrill(
      persistedState,
      actorUserId,
      requestedBackupId,
      idempotencyKey,
    );
    if (existingRecord) {
      syncInMemoryState(persistedState);
      return clone(existingRecord);
    }

    const currentBackups = LocalIamOperationsRuntimeStore.listBackups().backups;
    const selectedBackup = (requestedBackupId
      ? currentBackups.find((backup) => backup.id === requestedBackupId)
      : currentBackups[0])
      ?? await LocalIamOperationsRuntimeStore.createBackupAsync(actorUserId, {
        label: 'Standalone IAM recovery drill backup',
        idempotency_key: idempotencyKey
          ? buildRecoveryDrillNestedIdempotencyKey(idempotencyKey, 'backup')
          : null,
      });
    const restore = await LocalIamOperationsRuntimeStore.restoreBackupAsync(actorUserId, selectedBackup.id, 'DRY_RUN', {
      idempotency_key: idempotencyKey
        ? buildRecoveryDrillNestedIdempotencyKey(idempotencyKey, 'restore')
        : null,
    });
    const resilience = await LocalIamOperationsRuntimeStore.runResilienceSuiteAsync(actorUserId, {
      idempotency_key: idempotencyKey
        ? buildRecoveryDrillNestedIdempotencyKey(idempotencyKey, 'resilience')
        : null,
    });
    const recoveryMinutes = measuredRecoveryMinutes();
    const lineageAssessment = buildRecoveryLineageAssessment(
      currentBackups[0]?.id ?? selectedBackup.id,
      selectedBackup.id,
      selectedBackup.checksum_sha256,
      restore.checksum_sha256,
    );
    const status: 'PASS' | 'WARN' | 'FAIL' = restore.status !== 'VALIDATED'
      ? 'FAIL'
      : !lineageAssessment.backupLineageValidated
        ? 'FAIL'
      : resilience.overall_status === 'FAIL'
        ? 'FAIL'
        : !lineageAssessment.latestBackupAtExecution
          ? 'WARN'
        : recoveryMinutes <= persistedState.profile.rto_target_minutes
          ? 'PASS'
          : 'WARN';

    const record: IamRecoveryDrillRecord = {
      id: `iam-recovery-drill-${randomUUID()}`,
      backup_id: selectedBackup.id,
      restore_record_id: restore.id,
      resilience_run_id: resilience.id,
      executed_at: nowIso(),
      executed_by_user_id: actorUserId,
      status,
      measured_recovery_minutes: recoveryMinutes,
      rpo_target_minutes: persistedState.profile.rpo_target_minutes,
      rto_target_minutes: persistedState.profile.rto_target_minutes,
      integrity_validated: lineageAssessment.backupLineageValidated,
      backup_lineage_validated: lineageAssessment.backupLineageValidated,
      latest_backup_at_execution: lineageAssessment.latestBackupAtExecution,
      notes: [
        'Recovery drill executed from the standalone IAM operations plane.',
        'The resulting restore and resilience evidence remain standalone review artifacts and do not authorize downstream adoption.',
        ...lineageAssessment.lineageNotes,
      ],
    };
    persistedState.drills.unshift(record);
    persistedState.drills = persistedState.drills.slice(0, 25);
    if (idempotencyKey) {
      persistedState.recovery_drill_idempotency_keys = persistedState.recovery_drill_idempotency_keys
        .filter((candidate) => !(
          candidate.idempotency_key === idempotencyKey
          && candidate.executed_by_user_id === actorUserId
          && candidate.requested_backup_id === requestedBackupId
        ));
      persistedState.recovery_drill_idempotency_keys.unshift({
        idempotency_key: idempotencyKey,
        executed_by_user_id: actorUserId,
        requested_backup_id: requestedBackupId,
        recovery_drill_id: record.id,
        recorded_at: nowIso(),
      });
      persistedState.recovery_drill_idempotency_keys = persistedState.recovery_drill_idempotency_keys.slice(0, 200);
    }
    persistedState.profile.updated_at = record.executed_at;
    await savePersistedStateAsync(IAM_RECOVERY_RUNTIME_FILE, persistedState);
    syncInMemoryState(persistedState);
    return clone(record);
  },
};
