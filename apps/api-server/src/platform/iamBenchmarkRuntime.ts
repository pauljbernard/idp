import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { LocalIamAuthenticationRuntimeStore } from './iamAuthenticationRuntime';
import { LocalIamDeploymentRuntimeStore } from './iamDeploymentRuntime';
import { LocalIamFederationRuntimeStore } from './iamFederationRuntime';
import {
  createPersistedAsyncIamStateRepository,
  createPersistedIamStateRepository,
  type IamAsyncStateRepository,
  type IamStateRepository,
} from './iamStateRepository';
import { LocalIamOperationsRuntimeStore } from './iamOperationsRuntime';
import { LocalIamProtocolRuntimeStore } from './iamProtocolRuntime';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

const IAM_BENCHMARK_RUNTIME_FILE = 'iam-benchmark-runtime-state.json';
const SYNTHETIC_BENCHMARK_EVIDENCE_SUMMARY = 'Synthetic modeled benchmark derived from runtime summaries instead of measured load against production-like infrastructure.';
const deferredPersistenceContext = new AsyncLocalStorage<{ dirty: boolean }>();

export type IamBenchmarkStatus = 'PASS' | 'WARN' | 'FAIL';
export type IamBenchmarkEvidenceMode = 'SYNTHETIC_MODELED' | 'MEASURED_RUNTIME';

export interface IamBenchmarkSuiteRecord {
  id: string;
  name: string;
  category: 'ADMIN' | 'BROWSER' | 'TOKEN' | 'FEDERATION' | 'RECOVERY' | 'STANDALONE';
  summary: string;
  target: string;
  evidence_mode: IamBenchmarkEvidenceMode;
  evidence_summary: string;
  market_claim_ready: boolean;
}

export interface IamBenchmarkMetricRecord {
  id: string;
  name: string;
  unit: 'ms' | 'percent' | 'seconds' | 'count';
  value: number;
  target: string;
  status: IamBenchmarkStatus;
}

export interface IamBenchmarkRunRecord {
  id: string;
  suite_id: string;
  suite_name: string;
  executed_at: string;
  executed_by_user_id: string;
  overall_status: IamBenchmarkStatus;
  metrics: IamBenchmarkMetricRecord[];
  observations: string[];
  count: number;
  evidence_mode: IamBenchmarkEvidenceMode;
  evidence_summary: string;
  market_claim_ready: boolean;
}

interface IamBenchmarkRuntimeState {
  runs: IamBenchmarkRunRecord[];
  benchmark_run_idempotency_keys: Array<{
    idempotency_key: string;
    executed_by_user_id: string;
    suite_id: string;
    benchmark_run_id: string;
    recorded_at: string;
  }>;
}

const BENCHMARK_SUITES: IamBenchmarkSuiteRecord[] = [
  {
    id: 'iam-benchmark-admin-reads',
    name: 'Admin Read Paths',
    category: 'ADMIN',
    summary: 'Measures realm, user, client, and security read responsiveness for operator workflows.',
    target: 'p95 < 500ms',
    evidence_mode: 'SYNTHETIC_MODELED',
    evidence_summary: SYNTHETIC_BENCHMARK_EVIDENCE_SUMMARY,
    market_claim_ready: false,
  },
  {
    id: 'iam-benchmark-oidc-browser',
    name: 'OIDC Browser Flows',
    category: 'BROWSER',
    summary: 'Measures authorization-code plus PKCE browser roundtrip posture for standalone login journeys.',
    target: 'full browser roundtrip < 1200ms',
    evidence_mode: 'SYNTHETIC_MODELED',
    evidence_summary: SYNTHETIC_BENCHMARK_EVIDENCE_SUMMARY,
    market_claim_ready: false,
  },
  {
    id: 'iam-benchmark-token-runtime',
    name: 'Token Runtime',
    category: 'TOKEN',
    summary: 'Measures token issuance, introspection, and revocation paths for the standalone protocol runtime.',
    target: 'token issue p95 < 250ms',
    evidence_mode: 'SYNTHETIC_MODELED',
    evidence_summary: SYNTHETIC_BENCHMARK_EVIDENCE_SUMMARY,
    market_claim_ready: false,
  },
  {
    id: 'iam-benchmark-federation',
    name: 'Federation Sync',
    category: 'FEDERATION',
    summary: 'Measures broker and federation sync posture for standalone external identity imports.',
    target: 'validation batch < 5s',
    evidence_mode: 'SYNTHETIC_MODELED',
    evidence_summary: SYNTHETIC_BENCHMARK_EVIDENCE_SUMMARY,
    market_claim_ready: false,
  },
  {
    id: 'iam-benchmark-recovery',
    name: 'Recovery Readiness',
    category: 'RECOVERY',
    summary: 'Measures backup/recovery evidence generation and recovery drill posture for standalone operations.',
    target: 'recovery rehearsal < 60s',
    evidence_mode: 'SYNTHETIC_MODELED',
    evidence_summary: SYNTHETIC_BENCHMARK_EVIDENCE_SUMMARY,
    market_claim_ready: false,
  },
  {
    id: 'iam-benchmark-standalone-full',
    name: 'Standalone Full Validation',
    category: 'STANDALONE',
    summary: 'Aggregates the critical control-path metrics used for standalone product validation.',
    target: 'all critical metrics pass',
    evidence_mode: 'SYNTHETIC_MODELED',
    evidence_summary: SYNTHETIC_BENCHMARK_EVIDENCE_SUMMARY,
    market_claim_ready: false,
  },
];

function normalizeState(input: Partial<IamBenchmarkRuntimeState>): IamBenchmarkRuntimeState {
  return {
    runs: Array.isArray(input.runs)
      ? input.runs.map((record) => ({
        ...clone(record),
        evidence_mode: 'SYNTHETIC_MODELED',
        evidence_summary: SYNTHETIC_BENCHMARK_EVIDENCE_SUMMARY,
        market_claim_ready: false,
      }))
      : [],
    benchmark_run_idempotency_keys: Array.isArray(input.benchmark_run_idempotency_keys)
      ? clone(input.benchmark_run_idempotency_keys)
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

function resolveRecordedBenchmarkRun(
  persistedState: IamBenchmarkRuntimeState,
  actorUserId: string,
  suiteId: string,
  idempotencyKey: string | null,
): IamBenchmarkRunRecord | null {
  if (!idempotencyKey) {
    return null
  }
  const recordedKey = persistedState.benchmark_run_idempotency_keys.find(
    (candidate) =>
      candidate.idempotency_key === idempotencyKey
      && candidate.executed_by_user_id === actorUserId
      && candidate.suite_id === suiteId,
  )
  if (!recordedKey) {
    return null
  }
  return persistedState.runs.find((run) => run.id === recordedKey.benchmark_run_id) ?? null
}

interface IamBenchmarkRuntimeStateRepository extends IamStateRepository<IamBenchmarkRuntimeState> {}
interface IamAsyncBenchmarkRuntimeStateRepository extends IamAsyncStateRepository<IamBenchmarkRuntimeState> {}

const benchmarkRuntimeStateRepository: IamBenchmarkRuntimeStateRepository = createPersistedIamStateRepository<
  Partial<IamBenchmarkRuntimeState>,
  IamBenchmarkRuntimeState
>({
  fileName: IAM_BENCHMARK_RUNTIME_FILE,
  seedFactory: () => normalizeState({}),
  normalize: normalizeState,
});

const benchmarkRuntimeStateAsyncRepository: IamAsyncBenchmarkRuntimeStateRepository = createPersistedAsyncIamStateRepository<
  Partial<IamBenchmarkRuntimeState>,
  IamBenchmarkRuntimeState
>({
  fileName: IAM_BENCHMARK_RUNTIME_FILE,
  seedFactory: () => normalizeState({}),
  normalize: normalizeState,
});

const state = benchmarkRuntimeStateRepository.load();

function syncInMemoryState(nextState: IamBenchmarkRuntimeState): void {
  state.runs = clone(nextState.runs);
  state.benchmark_run_idempotency_keys = clone(nextState.benchmark_run_idempotency_keys);
}

function persistState(): void {
  const deferredContext = deferredPersistenceContext.getStore();
  if (deferredContext) {
    deferredContext.dirty = true;
    return;
  }
  benchmarkRuntimeStateRepository.save(state);
}

async function persistStateAsync(): Promise<void> {
  await benchmarkRuntimeStateAsyncRepository.save(state);
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

function evaluateMetric(name: string, unit: IamBenchmarkMetricRecord['unit'], value: number, passThreshold: number, warnThreshold: number, comparator: 'LTE' | 'GTE', target: string): IamBenchmarkMetricRecord {
  const status: IamBenchmarkStatus = comparator === 'LTE'
    ? value <= passThreshold
      ? 'PASS'
      : value <= warnThreshold
        ? 'WARN'
        : 'FAIL'
    : value >= passThreshold
      ? 'PASS'
      : value >= warnThreshold
        ? 'WARN'
        : 'FAIL';
  return {
    id: `iam-benchmark-metric-${randomUUID()}`,
    name,
    unit,
    value,
    target,
    status,
  };
}

function metricsForSuite(suiteId: string): IamBenchmarkMetricRecord[] {
  const deploymentSummary = LocalIamDeploymentRuntimeStore.getSummary();
  const protocolSummary = LocalIamProtocolRuntimeStore.getSummary();
  const authSummary = LocalIamAuthenticationRuntimeStore.getSummary();
  const federationSummary = LocalIamFederationRuntimeStore.getSummary();
  const operationsSummary = LocalIamOperationsRuntimeStore.getSummary();

  const topologyAdjustment = deploymentSummary.active_topology_mode === 'AWS_MULTI_REGION_WARM_STANDBY'
    ? 80
    : deploymentSummary.active_topology_mode === 'AWS_SINGLE_REGION_COST_OPTIMIZED'
      ? 140
      : 100;

  if (suiteId === 'iam-benchmark-admin-reads') {
    return [
      evaluateMetric('Realm read p95', 'ms', 220 + topologyAdjustment / 10, 500, 650, 'LTE', 'p95 < 500ms'),
      evaluateMetric('User read p95', 'ms', 240 + topologyAdjustment / 10, 500, 650, 'LTE', 'p95 < 500ms'),
      evaluateMetric('Admin console success rate', 'percent', protocolSummary.client_count > 0 ? 99.96 : 97.1, 99.9, 99.5, 'GTE', '>= 99.9%'),
    ];
  }

  if (suiteId === 'iam-benchmark-oidc-browser') {
    return [
      evaluateMetric('Authorization redirect roundtrip', 'ms', 760 + topologyAdjustment, 1200, 1500, 'LTE', '< 1200ms'),
      evaluateMetric('PKCE exchange p95', 'ms', 190 + topologyAdjustment / 8, 350, 500, 'LTE', '< 350ms'),
      evaluateMetric('Browser login success rate', 'percent', authSummary.browser_session_count > 0 ? 99.8 : 98.7, 99.5, 98.8, 'GTE', '>= 99.5%'),
    ];
  }

  if (suiteId === 'iam-benchmark-token-runtime') {
    return [
      evaluateMetric('Token issuance p95', 'ms', 150 + topologyAdjustment / 10, 250, 350, 'LTE', '< 250ms'),
      evaluateMetric('Introspection p95', 'ms', 95 + topologyAdjustment / 12, 180, 250, 'LTE', '< 180ms'),
      evaluateMetric('Revocation success rate', 'percent', operationsSummary.key_rotation_count > 0 ? 100 : 99.2, 99.8, 99.0, 'GTE', '>= 99.8%'),
    ];
  }

  if (suiteId === 'iam-benchmark-federation') {
    return [
      evaluateMetric('Federation batch', 'seconds', federationSummary.user_federation_provider_count > 0 ? 2.8 : 4.6, 5, 7, 'LTE', '< 5s'),
      evaluateMetric('Broker login continuation', 'ms', 480 + topologyAdjustment / 6, 900, 1200, 'LTE', '< 900ms'),
      evaluateMetric('Sync success rate', 'percent', federationSummary.sync_job_count > 0 ? 99.7 : 98.9, 99.5, 98.5, 'GTE', '>= 99.5%'),
    ];
  }

  if (suiteId === 'iam-benchmark-recovery') {
    return [
      evaluateMetric('Backup artifact generation', 'seconds', operationsSummary.backup_count > 0 ? 7.5 : 18.2, 20, 35, 'LTE', '< 20s'),
      evaluateMetric('Restore rehearsal', 'seconds', operationsSummary.restore_count > 0 ? 10.4 : 28.0, 30, 45, 'LTE', '< 30s'),
      evaluateMetric('Recovery evidence completeness', 'percent', operationsSummary.readiness_review_count > 0 ? 100 : 96.5, 99.9, 98.0, 'GTE', '>= 99.9%'),
    ];
  }

  return [
    evaluateMetric('Admin read posture', 'ms', 240 + topologyAdjustment / 10, 500, 650, 'LTE', '< 500ms'),
    evaluateMetric('OIDC browser posture', 'ms', 840 + topologyAdjustment, 1200, 1500, 'LTE', '< 1200ms'),
    evaluateMetric('Token runtime posture', 'ms', 170 + topologyAdjustment / 10, 250, 350, 'LTE', '< 250ms'),
    evaluateMetric('Federation posture', 'seconds', federationSummary.user_federation_provider_count > 0 ? 3.1 : 4.8, 5, 7, 'LTE', '< 5s'),
    evaluateMetric('Recovery evidence posture', 'seconds', operationsSummary.restore_count > 0 ? 12 : 26, 30, 45, 'LTE', '< 30s'),
  ];
}

export const LocalIamBenchmarkRuntimeStore = {
  getSummary(): {
    generated_at: string;
    benchmark_suite_count: number;
    benchmark_run_count: number;
    latest_benchmark_status: IamBenchmarkStatus | null;
    evidence_mode: IamBenchmarkEvidenceMode;
    market_claim_ready: boolean;
    evidence_summary: string;
  } {
    return {
      generated_at: nowIso(),
      benchmark_suite_count: BENCHMARK_SUITES.length,
      benchmark_run_count: state.runs.length,
      latest_benchmark_status: state.runs[0]?.overall_status ?? null,
      evidence_mode: 'SYNTHETIC_MODELED',
      market_claim_ready: false,
      evidence_summary: SYNTHETIC_BENCHMARK_EVIDENCE_SUMMARY,
    };
  },

  getCatalog(): {
    generated_at: string;
    suites: IamBenchmarkSuiteRecord[];
    runs: IamBenchmarkRunRecord[];
    count: number;
    evidence_mode: IamBenchmarkEvidenceMode;
    market_claim_ready: boolean;
    evidence_summary: string;
  } {
    return {
      generated_at: nowIso(),
      suites: clone(BENCHMARK_SUITES),
      runs: clone(state.runs),
      count: BENCHMARK_SUITES.length,
      evidence_mode: 'SYNTHETIC_MODELED',
      market_claim_ready: false,
      evidence_summary: SYNTHETIC_BENCHMARK_EVIDENCE_SUMMARY,
    };
  },

  runSuite(actorUserId: string, suiteId?: string | null): IamBenchmarkRunRecord {
    const resolvedSuite = BENCHMARK_SUITES.find((suite) => suite.id === suiteId) ?? BENCHMARK_SUITES.find((suite) => suite.id === 'iam-benchmark-standalone-full');
    if (!resolvedSuite) {
      throw new Error('No IAM benchmark suites are configured.');
    }

    const metrics = metricsForSuite(resolvedSuite.id);
    const overallStatus: IamBenchmarkStatus = metrics.some((metric) => metric.status === 'FAIL')
      ? 'FAIL'
      : metrics.some((metric) => metric.status === 'WARN')
        ? 'WARN'
        : 'PASS';
    const record: IamBenchmarkRunRecord = {
      id: `iam-benchmark-run-${randomUUID()}`,
      suite_id: resolvedSuite.id,
      suite_name: resolvedSuite.name,
      executed_at: nowIso(),
      executed_by_user_id: actorUserId,
      overall_status: overallStatus,
      metrics,
      observations: [
        'Synthetic modeled benchmark only; this run is not measured load evidence and must not be used for market or production parity claims.',
        'Benchmark values are retained as internal standalone validation artifacts, not downstream application telemetry.',
        'Benchmark targets are aligned to the standalone full-IDP readiness bar rather than the current inherited runtime profile.',
      ],
      count: metrics.length,
      evidence_mode: 'SYNTHETIC_MODELED',
      evidence_summary: SYNTHETIC_BENCHMARK_EVIDENCE_SUMMARY,
      market_claim_ready: false,
    };
    state.runs.unshift(record);
    state.runs = state.runs.slice(0, 50);
    persistState();
    return clone(record);
  },

  async runSuiteAsync(
    actorUserId: string,
    suiteId?: string | null,
    input?: {
      idempotency_key?: string | null;
    },
  ): Promise<IamBenchmarkRunRecord> {
    const persistedState = await benchmarkRuntimeStateAsyncRepository.load();
    const resolvedSuite = BENCHMARK_SUITES.find((suite) => suite.id === suiteId) ?? BENCHMARK_SUITES.find((suite) => suite.id === 'iam-benchmark-standalone-full');
    if (!resolvedSuite) {
      throw new Error('No IAM benchmark suites are configured.');
    }
    const idempotencyKey = normalizeIdempotencyKey(input?.idempotency_key);
    const existingRecord = resolveRecordedBenchmarkRun(
      persistedState,
      actorUserId,
      resolvedSuite.id,
      idempotencyKey,
    );
    if (existingRecord) {
      syncInMemoryState(persistedState);
      return clone(existingRecord);
    }

    const metrics = metricsForSuite(resolvedSuite.id);
    const overallStatus: IamBenchmarkStatus = metrics.some((metric) => metric.status === 'FAIL')
      ? 'FAIL'
      : metrics.some((metric) => metric.status === 'WARN')
        ? 'WARN'
        : 'PASS';
    const record: IamBenchmarkRunRecord = {
      id: `iam-benchmark-run-${randomUUID()}`,
      suite_id: resolvedSuite.id,
      suite_name: resolvedSuite.name,
      executed_at: nowIso(),
      executed_by_user_id: actorUserId,
      overall_status: overallStatus,
      metrics,
      observations: [
        'Synthetic modeled benchmark only; this run is not measured load evidence and must not be used for market or production parity claims.',
        'Benchmark values are retained as internal standalone validation artifacts, not downstream application telemetry.',
        'Benchmark targets are aligned to the standalone full-IDP readiness bar rather than the current inherited runtime profile.',
      ],
      count: metrics.length,
      evidence_mode: 'SYNTHETIC_MODELED',
      evidence_summary: SYNTHETIC_BENCHMARK_EVIDENCE_SUMMARY,
      market_claim_ready: false,
    };
    persistedState.runs.unshift(record);
    persistedState.runs = persistedState.runs.slice(0, 50);
    if (idempotencyKey) {
      persistedState.benchmark_run_idempotency_keys = persistedState.benchmark_run_idempotency_keys
        .filter((candidate) => !(
          candidate.idempotency_key === idempotencyKey
          && candidate.executed_by_user_id === actorUserId
          && candidate.suite_id === resolvedSuite.id
        ));
      persistedState.benchmark_run_idempotency_keys.unshift({
        idempotency_key: idempotencyKey,
        executed_by_user_id: actorUserId,
        suite_id: resolvedSuite.id,
        benchmark_run_id: record.id,
        recorded_at: nowIso(),
      });
      persistedState.benchmark_run_idempotency_keys = persistedState.benchmark_run_idempotency_keys.slice(0, 200);
    }
    await benchmarkRuntimeStateAsyncRepository.save(persistedState);
    syncInMemoryState(persistedState);
    return clone(record);
  },
};
