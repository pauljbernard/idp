import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { LocalIamDeploymentRuntimeStore } from './iamDeploymentRuntime';
import { loadOrCreatePersistedState, reloadOrCreatePersistedStateAsync, savePersistedState, savePersistedStateAsync } from './persistence';
import { IAM_SYSTEM_USER_ID, rewriteIamIdentifiers } from './iamIdentifiers';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

const IAM_STANDALONE_BOOTSTRAP_FILE = 'iam-standalone-bootstrap-state.json';
const deferredPersistenceContext = new AsyncLocalStorage<{ dirty: boolean }>();

export interface IamBootstrapEnvironmentVariable {
  key: string;
  required: boolean;
  summary: string;
}

export interface IamBootstrapArtifactRecord {
  path: string;
  summary: string;
}

export interface IamBootstrapPackageRecord {
  id: string;
  version_label: string;
  summary: string;
  generated_at: string;
  generated_by_user_id: string;
  topology_mode: string;
  environment_variables: IamBootstrapEnvironmentVariable[];
  artifacts: IamBootstrapArtifactRecord[];
  aws_service_dependencies: string[];
  bootstrap_steps: string[];
  validation_steps: string[];
}

interface IamStandaloneBootstrapState {
  packages: IamBootstrapPackageRecord[];
  bootstrap_package_idempotency_keys: Array<{
    idempotency_key: string;
    generated_by_user_id: string;
    bootstrap_package_id: string;
    recorded_at: string;
  }>;
}

function normalizeState(input: Partial<IamStandaloneBootstrapState>): IamStandaloneBootstrapState {
  input = rewriteIamIdentifiers(input);
  return {
    packages: Array.isArray(input.packages) ? clone(input.packages) : [],
    bootstrap_package_idempotency_keys: Array.isArray(input.bootstrap_package_idempotency_keys)
      ? clone(input.bootstrap_package_idempotency_keys)
      : [],
  };
}

function normalizeIdempotencyKey(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function resolveRecordedBootstrapPackage(
  persistedState: IamStandaloneBootstrapState,
  actorUserId: string,
  idempotencyKey: string | null,
): IamBootstrapPackageRecord | null {
  if (!idempotencyKey) {
    return null;
  }
  const recordedKey = persistedState.bootstrap_package_idempotency_keys.find(
    (candidate) => candidate.idempotency_key === idempotencyKey && candidate.generated_by_user_id === actorUserId,
  );
  if (!recordedKey) {
    return null;
  }
  return persistedState.packages.find((pkg) => pkg.id === recordedKey.bootstrap_package_id) ?? null;
}

const state = normalizeState(
  loadOrCreatePersistedState<Partial<IamStandaloneBootstrapState>>(IAM_STANDALONE_BOOTSTRAP_FILE, () => normalizeState({}))
);

async function loadStateAsync(): Promise<IamStandaloneBootstrapState> {
  return normalizeState(
    await reloadOrCreatePersistedStateAsync<Partial<IamStandaloneBootstrapState>>(
      IAM_STANDALONE_BOOTSTRAP_FILE,
      () => normalizeState({}),
    ),
  );
}

function syncInMemoryState(nextState: IamStandaloneBootstrapState): void {
  state.packages = clone(nextState.packages);
  state.bootstrap_package_idempotency_keys = clone(nextState.bootstrap_package_idempotency_keys);
}

function persistState(): void {
  const deferredContext = deferredPersistenceContext.getStore();
  if (deferredContext) {
    deferredContext.dirty = true;
    return;
  }
  savePersistedState(IAM_STANDALONE_BOOTSTRAP_FILE, state);
}

async function persistStateAsync(): Promise<void> {
  await savePersistedStateAsync(IAM_STANDALONE_BOOTSTRAP_FILE, state);
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

function nextVersionLabel(): string {
  return `bootstrap-${String(state.packages.length + 1).padStart(3, '0')}`;
}

function buildPackage(actorUserId: string): IamBootstrapPackageRecord {
  const deployment = LocalIamDeploymentRuntimeStore.getDeploymentProfile();
  const services = Array.from(new Set(deployment.resources.map((resource) => resource.service))).sort();
  return {
    id: `iam-bootstrap-${randomUUID()}`,
    version_label: nextVersionLabel(),
    summary: `Standalone IAM bootstrap package for ${deployment.active_profile.topology_mode} deployment.`,
    generated_at: nowIso(),
    generated_by_user_id: actorUserId,
    topology_mode: deployment.active_profile.topology_mode,
    environment_variables: [
      { key: 'IAM_REALM_TABLE_NAME', required: true, summary: 'DynamoDB table for realm, subject, RBAC, and protocol state.' },
      { key: 'IAM_ARTIFACT_BUCKET', required: true, summary: 'S3 bucket for backup, export, benchmark, and recovery artifacts.' },
      { key: 'IDP_PLATFORM_STATE_DYNAMODB_TABLE', required: true, summary: 'DynamoDB table for persisted standalone platform state envelopes.' },
      { key: 'IDP_PLATFORM_DURABLE_S3_BUCKET', required: true, summary: 'S3 bucket for durable standalone artifacts addressed through the persistence adapter.' },
      { key: 'IDP_RATE_LIMIT_DYNAMODB_TABLE', required: true, summary: 'DynamoDB table for distributed API and authentication throttling state.' },
      { key: 'IAM_KMS_KEY_ARN', required: true, summary: 'KMS key for signing material and secret-envelope protection.' },
      { key: 'IAM_SECRETS_PREFIX', required: true, summary: 'Secrets Manager prefix for standalone provider credentials and notification secrets.' },
      { key: 'IAM_EVENT_BUS_NAME', required: true, summary: 'EventBridge bus for federation, recovery, notification, and audit event fan-out.' },
      { key: 'IAM_BOOTSTRAP_ADMIN_EMAIL', required: true, summary: 'Global super-administrator email used for the standalone product bootstrap.' },
    ],
    artifacts: [
      { path: 'deploy/iam-standalone/api-gateway.yml', summary: 'API Gateway and Lambda ingress package.' },
      { path: 'deploy/iam-standalone/data-plane.yml', summary: 'DynamoDB, S3, KMS, and Secrets Manager provisioning package.' },
      { path: 'deploy/iam-standalone/orchestration.yml', summary: 'Step Functions and EventBridge orchestration package.' },
      { path: 'deploy/iam-standalone/edge-notifications.yml', summary: 'CloudFront, WAF, Route53, SES, and SNS package.' },
      { path: 'deploy/iam-standalone/bootstrap.env.example', summary: 'Operator-facing environment bootstrap example.' },
    ],
    aws_service_dependencies: services,
    bootstrap_steps: [
      'Provision DynamoDB, S3, KMS, Secrets Manager, EventBridge, Step Functions, and API Gateway resources for the standalone IAM environment.',
      'Deploy the standalone IAM execution plane as Lambda handlers behind API Gateway and attach CloudFront and WAF at the edge.',
      'Load the bootstrap super-administrator record and seed standalone validation realms without binding any downstream application.',
      'Generate and publish the initial signing-key set and confirm JWKS reachability through the standalone public endpoint.',
    ],
    validation_steps: [
      'Run OIDC discovery, JWKS, authorization-code plus PKCE, and token validation checks against the standalone deployment.',
      'Run SAML metadata, SP-initiated login, and logout lifecycle validation against a standalone realm.',
      'Run backup creation, dry-run restore, benchmark suite, and recovery drill validation before marking the environment adoption-ready.',
    ],
  };
}

export const LocalIamStandaloneBootstrapStore = {
  getSummary(): {
    generated_at: string;
    bootstrap_package_count: number;
    latest_package_id: string | null;
  } {
    return {
      generated_at: nowIso(),
      bootstrap_package_count: state.packages.length,
      latest_package_id: state.packages[0]?.id ?? null,
    };
  },

  getBootstrapPackage(): {
    generated_at: string;
    latest_package: IamBootstrapPackageRecord;
    packages: IamBootstrapPackageRecord[];
    count: number;
  } {
    if (!state.packages[0]) {
      state.packages.unshift(buildPackage(IAM_SYSTEM_USER_ID));
      persistState();
    }
    return {
      generated_at: nowIso(),
      latest_package: clone(state.packages[0]),
      packages: clone(state.packages),
      count: state.packages.length,
    };
  },

  regenerateBootstrapPackage(actorUserId: string): IamBootstrapPackageRecord {
    const record = buildPackage(actorUserId);
    state.packages.unshift(record);
    state.packages = state.packages.slice(0, 20);
    persistState();
    return clone(record);
  },

  async regenerateBootstrapPackageAsync(
    actorUserId: string,
    input?: {
      idempotency_key?: string | null;
    },
  ): Promise<IamBootstrapPackageRecord> {
    const persistedState = await loadStateAsync();
    const idempotencyKey = normalizeIdempotencyKey(input?.idempotency_key);
    const existingRecord = resolveRecordedBootstrapPackage(persistedState, actorUserId, idempotencyKey);
    if (existingRecord) {
      syncInMemoryState(persistedState);
      return clone(existingRecord);
    }
    const currentPackageCount = state.packages.length;
    state.packages = clone(persistedState.packages);
    const record = buildPackage(actorUserId);
    state.packages = persistedState.packages.slice(0, currentPackageCount);
    persistedState.packages.unshift(record);
    persistedState.packages = persistedState.packages.slice(0, 20);
    if (idempotencyKey) {
      persistedState.bootstrap_package_idempotency_keys = persistedState.bootstrap_package_idempotency_keys
        .filter((candidate) => !(
          candidate.idempotency_key === idempotencyKey
          && candidate.generated_by_user_id === actorUserId
        ));
      persistedState.bootstrap_package_idempotency_keys.unshift({
        idempotency_key: idempotencyKey,
        generated_by_user_id: actorUserId,
        bootstrap_package_id: record.id,
        recorded_at: nowIso(),
      });
      persistedState.bootstrap_package_idempotency_keys = persistedState.bootstrap_package_idempotency_keys.slice(0, 200);
    }
    await savePersistedStateAsync(IAM_STANDALONE_BOOTSTRAP_FILE, persistedState);
    syncInMemoryState(persistedState);
    return clone(record);
  },
};
