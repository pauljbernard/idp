import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { loadOrCreatePersistedState, reloadOrCreatePersistedStateAsync, savePersistedState, savePersistedStateAsync } from './persistence';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

const IAM_DEPLOYMENT_RUNTIME_FILE = 'iam-deployment-runtime-state.json';
const deferredPersistenceContext = new AsyncLocalStorage<{ dirty: boolean }>();

export type IamDeploymentTopologyMode =
  | 'AWS_SINGLE_REGION_COST_OPTIMIZED'
  | 'AWS_SINGLE_REGION_HA'
  | 'AWS_MULTI_REGION_WARM_STANDBY';

export type IamDeploymentReadinessStatus =
  | 'READY_FOR_STANDALONE_DEPLOYMENT'
  | 'NEEDS_REVIEW';

export type IamDeploymentResourceStatus = 'READY' | 'PLANNED';

export interface IamDeploymentResourceRecord {
  id: string;
  label: string;
  service: string;
  category: 'EDGE' | 'EXECUTION' | 'DATA' | 'SECURITY' | 'ORCHESTRATION' | 'NOTIFICATION' | 'OBSERVABILITY';
  status: IamDeploymentResourceStatus;
  summary: string;
}

export interface IamDeploymentProfileRecord {
  id: string;
  name: string;
  summary: string;
  topology_mode: IamDeploymentTopologyMode;
  readiness_status: IamDeploymentReadinessStatus;
  regions: string[];
  data_plane: 'DYNAMODB_AND_S3';
  secret_plane: 'AWS_KMS_AND_SECRETS_MANAGER';
  orchestration_plane: 'STEP_FUNCTIONS_AND_EVENTBRIDGE';
  edge_plane: 'CLOUDFRONT_WAF_ROUTE53';
  notification_plane: 'SES_AND_SNS';
  observability_plane: 'CLOUDWATCH_XRAY_EVENTBRIDGE';
  estimated_monthly_cost_band: string;
  operator_notes: string[];
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamDeploymentChangeRecord {
  id: string;
  changed_at: string;
  changed_by_user_id: string;
  summary: string;
}

export interface UpdateIamDeploymentProfileInput {
  name?: string;
  summary?: string;
  topology_mode?: IamDeploymentTopologyMode;
  regions?: string[];
  estimated_monthly_cost_band?: string;
  operator_notes?: string[];
}

interface IamDeploymentRuntimeState {
  active_profile: IamDeploymentProfileRecord;
  change_history: IamDeploymentChangeRecord[];
}

const SUPPORTED_TOPOLOGY_MODES: IamDeploymentTopologyMode[] = [
  'AWS_SINGLE_REGION_COST_OPTIMIZED',
  'AWS_SINGLE_REGION_HA',
];

function assertSupportedTopologyMode(mode: IamDeploymentTopologyMode): void {
  if (!SUPPORTED_TOPOLOGY_MODES.includes(mode)) {
    throw new Error(`Unsupported deployment topology for the current support profile: ${mode}`);
  }
}

function buildDefaultProfile(): IamDeploymentProfileRecord {
  const now = nowIso();
  return {
    id: 'iam-standalone-aws-single-region-bounded',
    name: 'Standalone IAM AWS Single-Region Bounded Production',
    summary: 'Bounded single-region AWS deployment profile for the standalone IAM runtime with shared-durable state and explicit exclusions for rolling upgrades and multi-site.',
    topology_mode: 'AWS_SINGLE_REGION_HA',
    readiness_status: 'NEEDS_REVIEW',
    regions: ['us-east-1'],
    data_plane: 'DYNAMODB_AND_S3',
    secret_plane: 'AWS_KMS_AND_SECRETS_MANAGER',
    orchestration_plane: 'STEP_FUNCTIONS_AND_EVENTBRIDGE',
    edge_plane: 'CLOUDFRONT_WAF_ROUTE53',
    notification_plane: 'SES_AND_SNS',
    observability_plane: 'CLOUDWATCH_XRAY_EVENTBRIDGE',
    estimated_monthly_cost_band: '$$',
    operator_notes: [
      'The standalone IAM product runtime remains deployable without any downstream application coupling.',
      'DynamoDB and S3 are the target persistence plane; local JSON files remain validation fixtures only.',
      'The supported bounded production posture is single-region only; rolling upgrades and multi-site remain explicitly deferred.',
    ],
    created_at: now,
    updated_at: now,
    created_by_user_id: 'idp-super-admin',
    updated_by_user_id: 'idp-super-admin',
  };
}

function normalizeState(input: Partial<IamDeploymentRuntimeState>): IamDeploymentRuntimeState {
  return {
    active_profile: input.active_profile ? clone(input.active_profile) : buildDefaultProfile(),
    change_history: Array.isArray(input.change_history) ? clone(input.change_history) : [],
  };
}

const state = normalizeState(
  loadOrCreatePersistedState<Partial<IamDeploymentRuntimeState>>(IAM_DEPLOYMENT_RUNTIME_FILE, () => normalizeState({}))
);

async function loadStateAsync(): Promise<IamDeploymentRuntimeState> {
  return normalizeState(
    await reloadOrCreatePersistedStateAsync<Partial<IamDeploymentRuntimeState>>(
      IAM_DEPLOYMENT_RUNTIME_FILE,
      () => normalizeState({}),
    ),
  );
}

function syncInMemoryState(nextState: IamDeploymentRuntimeState): void {
  state.active_profile = clone(nextState.active_profile);
  state.change_history = clone(nextState.change_history);
}

function persistState(): void {
  const deferredContext = deferredPersistenceContext.getStore();
  if (deferredContext) {
    deferredContext.dirty = true;
    return;
  }
  savePersistedState(IAM_DEPLOYMENT_RUNTIME_FILE, state);
}

async function persistStateAsync(): Promise<void> {
  await savePersistedStateAsync(IAM_DEPLOYMENT_RUNTIME_FILE, state);
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

function resourcesForProfile(profile: IamDeploymentProfileRecord): IamDeploymentResourceRecord[] {
  const multiRegion = profile.topology_mode === 'AWS_MULTI_REGION_WARM_STANDBY';
  const costOptimized = profile.topology_mode === 'AWS_SINGLE_REGION_COST_OPTIMIZED';
  const regionLabel = multiRegion ? profile.regions.join(', ') : profile.regions[0];

  return [
    {
      id: 'edge',
      label: 'Global Edge and Routing',
      service: 'CloudFront / WAF / Route53',
      category: 'EDGE',
      status: 'READY',
      summary: `Public identity traffic is terminated through CloudFront, protected by WAF, and routed for the standalone IAM service in ${regionLabel}.`,
    },
    {
      id: 'api-gateway',
      label: 'Protocol and Admin API',
      service: 'API Gateway',
      category: 'EDGE',
      status: 'READY',
      summary: 'OIDC, OAuth, SAML, admin, and account endpoints are fronted through an independently deployable API Gateway layer.',
    },
    {
      id: 'lambda-runtime',
      label: 'Execution Plane',
      service: 'Lambda',
      category: 'EXECUTION',
      status: 'READY',
      summary: costOptimized
        ? 'Core runtime is deployed on cost-optimized Lambda handlers with shared execution profiles.'
        : 'Core runtime is deployed on isolated Lambda handlers sized for standalone operator and protocol traffic.',
    },
    {
      id: 'data-plane',
      label: 'Identity State and Artifact Stores',
      service: 'DynamoDB / S3',
      category: 'DATA',
      status: 'READY',
      summary: multiRegion
        ? 'DynamoDB and S3 are modeled for warm-standby replication and recovery export.'
        : 'DynamoDB and S3 provide the authoritative standalone state plane with versioned backup artifacts.',
    },
    {
      id: 'security-plane',
      label: 'Signing Keys and Secrets',
      service: 'KMS / Secrets Manager',
      category: 'SECURITY',
      status: 'READY',
      summary: 'Signing keys, notification credentials, and provider secrets are modeled behind KMS-backed secrets governance.',
    },
    {
      id: 'orchestration-plane',
      label: 'Asynchronous Control Plane',
      service: 'Step Functions / EventBridge',
      category: 'ORCHESTRATION',
      status: 'READY',
      summary: 'Recovery drills, federation sync, notification fan-out, and other long-running workflows are orchestrated through Step Functions and EventBridge.',
    },
    {
      id: 'notification-plane',
      label: 'Notification Delivery',
      service: 'SES / SNS',
      category: 'NOTIFICATION',
      status: 'READY',
      summary: 'Standalone password reset, verification, and operator notifications are packaged around SES and SNS delivery patterns.',
    },
    {
      id: 'observability-plane',
      label: 'Observability and Incident Signals',
      service: 'CloudWatch / X-Ray / EventBridge',
      category: 'OBSERVABILITY',
      status: 'READY',
      summary: 'Health, benchmark, security, and recovery signals are modeled for CloudWatch, X-Ray, and EventBridge-driven operations review.',
    },
  ];
}

export const LocalIamDeploymentRuntimeStore = {
  getSummary(): {
    generated_at: string;
    deployment_profile_count: number;
    active_profile_id: string;
    active_topology_mode: IamDeploymentTopologyMode;
    aws_native_ready: boolean;
    resource_count: number;
  } {
    return {
      generated_at: nowIso(),
      deployment_profile_count: 1,
      active_profile_id: state.active_profile.id,
      active_topology_mode: state.active_profile.topology_mode,
      aws_native_ready: state.active_profile.readiness_status === 'READY_FOR_STANDALONE_DEPLOYMENT',
      resource_count: resourcesForProfile(state.active_profile).length,
    };
  },

  getDeploymentProfile(): {
    generated_at: string;
    active_profile: IamDeploymentProfileRecord;
    resources: IamDeploymentResourceRecord[];
    supported_topology_modes: IamDeploymentTopologyMode[];
    change_history: IamDeploymentChangeRecord[];
    count: number;
  } {
    return {
      generated_at: nowIso(),
      active_profile: clone(state.active_profile),
      resources: resourcesForProfile(state.active_profile),
      supported_topology_modes: [...SUPPORTED_TOPOLOGY_MODES],
      change_history: clone(state.change_history),
      count: 1,
    };
  },

  updateDeploymentProfile(actorUserId: string, input: UpdateIamDeploymentProfileInput): IamDeploymentProfileRecord {
    if (input.topology_mode) {
      assertSupportedTopologyMode(input.topology_mode);
    }
    const updatedRegions = Array.isArray(input.regions)
      ? input.regions
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter(Boolean)
      : state.active_profile.regions;
    const nextProfile: IamDeploymentProfileRecord = {
      ...state.active_profile,
      name: typeof input.name === 'string' && input.name.trim() ? input.name.trim() : state.active_profile.name,
      summary: typeof input.summary === 'string' && input.summary.trim() ? input.summary.trim() : state.active_profile.summary,
      topology_mode: input.topology_mode ?? state.active_profile.topology_mode,
      regions: updatedRegions.length > 0 ? updatedRegions : state.active_profile.regions,
      estimated_monthly_cost_band:
        typeof input.estimated_monthly_cost_band === 'string' && input.estimated_monthly_cost_band.trim()
          ? input.estimated_monthly_cost_band.trim()
          : state.active_profile.estimated_monthly_cost_band,
      operator_notes: Array.isArray(input.operator_notes)
        ? input.operator_notes.filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean)
        : state.active_profile.operator_notes,
      readiness_status: 'NEEDS_REVIEW',
      updated_at: nowIso(),
      updated_by_user_id: actorUserId,
    };
    state.active_profile = nextProfile;
    state.change_history.unshift({
      id: `iam-deployment-change-${randomUUID()}`,
      changed_at: nextProfile.updated_at,
      changed_by_user_id: actorUserId,
      summary: `Updated standalone deployment topology to ${nextProfile.topology_mode} across ${nextProfile.regions.join(', ')}.`,
    });
    state.change_history = state.change_history.slice(0, 20);
    persistState();
    return clone(state.active_profile);
  },

  async updateDeploymentProfileAsync(actorUserId: string, input: UpdateIamDeploymentProfileInput): Promise<IamDeploymentProfileRecord> {
    if (input.topology_mode) {
      assertSupportedTopologyMode(input.topology_mode);
    }
    const persistedState = await loadStateAsync();
    const updatedRegions = Array.isArray(input.regions)
      ? input.regions
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter(Boolean)
      : persistedState.active_profile.regions;
    const nextProfile: IamDeploymentProfileRecord = {
      ...persistedState.active_profile,
      name: typeof input.name === 'string' && input.name.trim() ? input.name.trim() : persistedState.active_profile.name,
      summary: typeof input.summary === 'string' && input.summary.trim() ? input.summary.trim() : persistedState.active_profile.summary,
      topology_mode: input.topology_mode ?? persistedState.active_profile.topology_mode,
      regions: updatedRegions.length > 0 ? updatedRegions : persistedState.active_profile.regions,
      estimated_monthly_cost_band:
        typeof input.estimated_monthly_cost_band === 'string' && input.estimated_monthly_cost_band.trim()
          ? input.estimated_monthly_cost_band.trim()
          : persistedState.active_profile.estimated_monthly_cost_band,
      operator_notes: Array.isArray(input.operator_notes)
        ? input.operator_notes.filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean)
        : persistedState.active_profile.operator_notes,
      readiness_status: 'NEEDS_REVIEW',
      updated_at: nowIso(),
      updated_by_user_id: actorUserId,
    };
    persistedState.active_profile = nextProfile;
    persistedState.change_history.unshift({
      id: `iam-deployment-change-${randomUUID()}`,
      changed_at: nextProfile.updated_at,
      changed_by_user_id: actorUserId,
      summary: `Updated standalone deployment topology to ${nextProfile.topology_mode} across ${nextProfile.regions.join(', ')}.`,
    });
    persistedState.change_history = persistedState.change_history.slice(0, 20);
    await savePersistedStateAsync(IAM_DEPLOYMENT_RUNTIME_FILE, persistedState);
    syncInMemoryState(persistedState);
    return clone(state.active_profile);
  },
};
