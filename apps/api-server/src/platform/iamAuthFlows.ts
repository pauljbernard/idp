import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import {
  createPersistedAsyncIamStateRepository,
  createPersistedIamStateRepository,
  type IamAsyncStateRepository,
  type IamStateRepository,
} from './iamStateRepository';
import { LocalIamFoundationStore } from './iamFoundation';
import { LocalIamProtocolRuntimeStore, type IamClientProtocol, type IamClientRecord } from './iamProtocolRuntime';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
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

const IAM_AUTH_FLOWS_FILE = 'iam-auth-flows-state.json';

export type IamAuthFlowKind = 'BROWSER' | 'DIRECT_GRANT' | 'ACCOUNT_CONSOLE' | 'SUBFLOW';
export type IamAuthFlowStatus = 'ACTIVE' | 'ARCHIVED';
export type IamAuthExecutionKind = 'AUTHENTICATOR' | 'SUBFLOW';
export type IamAuthExecutionRequirement = 'REQUIRED' | 'ALTERNATIVE' | 'CONDITIONAL' | 'DISABLED';
export type IamAuthenticatorKind =
  | 'USERNAME_PASSWORD'
  | 'PASSKEY_WEBAUTHN'
  | 'REQUIRED_ACTIONS'
  | 'CONSENT'
  | 'TOTP_MFA'
  | 'ALLOW';
export type IamFlowConditionKind =
  | 'ALWAYS'
  | 'USER_HAS_REQUIRED_ACTIONS'
  | 'USER_HAS_PASSKEY_ENABLED'
  | 'CONSENT_REQUIRED'
  | 'USER_HAS_MFA_ENABLED'
  | 'CLIENT_PROTOCOL_IS_OIDC'
  | 'CLIENT_PROTOCOL_IS_SAML';

interface StoredIamAuthFlow {
  id: string;
  realm_id: string;
  name: string;
  description: string;
  kind: IamAuthFlowKind;
  status: IamAuthFlowStatus;
  synthetic: boolean;
  top_level: boolean;
  built_in: boolean;
  execution_ids: string[];
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamAuthFlowRecord {
  id: string;
  realm_id: string;
  name: string;
  description: string;
  kind: IamAuthFlowKind;
  status: IamAuthFlowStatus;
  synthetic: boolean;
  top_level: boolean;
  built_in: boolean;
  execution_ids: string[];
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

interface StoredIamAuthExecution {
  id: string;
  realm_id: string;
  flow_id: string;
  display_name: string;
  execution_kind: IamAuthExecutionKind;
  authenticator_kind: IamAuthenticatorKind | null;
  subflow_id: string | null;
  requirement: IamAuthExecutionRequirement;
  condition_kind: IamFlowConditionKind;
  priority: number;
  synthetic: boolean;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamAuthExecutionRecord {
  id: string;
  realm_id: string;
  flow_id: string;
  display_name: string;
  execution_kind: IamAuthExecutionKind;
  authenticator_kind: IamAuthenticatorKind | null;
  subflow_id: string | null;
  requirement: IamAuthExecutionRequirement;
  condition_kind: IamFlowConditionKind;
  priority: number;
  synthetic: boolean;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

interface StoredIamRealmAuthFlowBinding {
  realm_id: string;
  browser_flow_id: string;
  direct_grant_flow_id: string;
  account_console_flow_id: string;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamRealmAuthFlowBindingRecord {
  realm_id: string;
  browser_flow_id: string;
  direct_grant_flow_id: string;
  account_console_flow_id: string;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

interface StoredIamClientAuthFlowBinding {
  id: string;
  realm_id: string;
  client_id: string;
  browser_flow_id: string | null;
  direct_grant_flow_id: string | null;
  account_console_flow_id: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamClientAuthFlowBindingRecord {
  id: string;
  realm_id: string;
  client_id: string;
  browser_flow_id: string | null;
  direct_grant_flow_id: string | null;
  account_console_flow_id: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

interface IamAuthFlowsState {
  flows: StoredIamAuthFlow[];
  executions: StoredIamAuthExecution[];
  realm_bindings: StoredIamRealmAuthFlowBinding[];
  client_bindings: StoredIamClientAuthFlowBinding[];
}

interface IamAuthFlowsRepository extends IamStateRepository<IamAuthFlowsState> {}
interface IamAsyncAuthFlowsRepository extends IamAsyncStateRepository<IamAuthFlowsState> {}

export interface IamAuthFlowsSummary {
  flow_count: number;
  execution_count: number;
  realm_auth_flow_binding_count: number;
  client_auth_flow_binding_count: number;
}

export interface IamAuthFlowsResponse {
  generated_at: string;
  flows: IamAuthFlowRecord[];
  count: number;
}

export interface IamAuthExecutionsResponse {
  generated_at: string;
  executions: IamAuthExecutionRecord[];
  count: number;
}

export interface IamAuthFlowBindingsResponse {
  generated_at: string;
  realm_bindings: IamRealmAuthFlowBindingRecord[];
  client_bindings: IamClientAuthFlowBindingRecord[];
  count: number;
}

export interface CreateIamAuthFlowRequest {
  realm_id: string;
  name: string;
  description?: string;
  kind: IamAuthFlowKind;
  status?: IamAuthFlowStatus;
  top_level?: boolean;
}

export interface UpdateIamAuthFlowRequest {
  name?: string;
  description?: string;
  status?: IamAuthFlowStatus;
}

export interface CreateIamAuthExecutionRequest {
  realm_id: string;
  flow_id: string;
  display_name: string;
  execution_kind: IamAuthExecutionKind;
  authenticator_kind?: IamAuthenticatorKind | null;
  subflow_id?: string | null;
  requirement?: IamAuthExecutionRequirement;
  condition_kind?: IamFlowConditionKind;
  priority?: number;
}

export interface UpdateIamAuthExecutionRequest {
  display_name?: string;
  authenticator_kind?: IamAuthenticatorKind | null;
  subflow_id?: string | null;
  requirement?: IamAuthExecutionRequirement;
  condition_kind?: IamFlowConditionKind;
  priority?: number;
}

export interface UpdateIamRealmAuthFlowBindingsRequest {
  browser_flow_id?: string;
  direct_grant_flow_id?: string;
  account_console_flow_id?: string;
}

export interface UpdateIamClientAuthFlowBindingsRequest {
  browser_flow_id?: string | null;
  direct_grant_flow_id?: string | null;
  account_console_flow_id?: string | null;
}

export interface EvaluateIamAuthFlowInput {
  realm_id: string;
  client_id?: string | null;
  flow_kind: Exclude<IamAuthFlowKind, 'SUBFLOW'>;
  flow_id?: string | null;
  credential_satisfied: boolean;
  satisfied_authenticator_kinds?: IamAuthenticatorKind[];
  mfa_satisfied: boolean;
  passkey_enabled?: boolean;
  required_actions: string[];
  pending_scope_consent: string[];
}

export interface IamAuthFlowDecision {
  flow_id: string;
  next_step: 'REQUIRED_ACTIONS' | 'CONSENT_REQUIRED' | 'MFA_REQUIRED' | 'AUTHENTICATED';
  pending_execution_id: string | null;
  pending_execution_label: string | null;
  matched_execution_ids: string[];
  pending_required_actions: string[];
  pending_scope_consent: string[];
  pending_mfa: boolean;
}

function normalizeState(input: Partial<IamAuthFlowsState>): IamAuthFlowsState {
  return {
    flows: Array.isArray(input.flows) ? input.flows : [],
    executions: Array.isArray(input.executions) ? input.executions : [],
    realm_bindings: Array.isArray(input.realm_bindings) ? input.realm_bindings : [],
    client_bindings: Array.isArray(input.client_bindings) ? input.client_bindings : [],
  };
}

const authFlowsRepository: IamAuthFlowsRepository = createPersistedIamStateRepository<
  Partial<IamAuthFlowsState>,
  IamAuthFlowsState
>({
  fileName: IAM_AUTH_FLOWS_FILE,
  seedFactory: () => normalizeState({}),
  normalize: normalizeState,
});

const authFlowsAsyncRepository: IamAsyncAuthFlowsRepository = createPersistedAsyncIamStateRepository<
  Partial<IamAuthFlowsState>,
  IamAuthFlowsState
>({
  fileName: IAM_AUTH_FLOWS_FILE,
  seedFactory: () => normalizeState({}),
  normalize: normalizeState,
});

const state = authFlowsRepository.load();
const deferredPersistenceContext = new AsyncLocalStorage<{ dirty: boolean }>();

async function loadStateAsync(): Promise<IamAuthFlowsState> {
  return await authFlowsAsyncRepository.load();
}

function syncInMemoryState(nextState: IamAuthFlowsState): void {
  state.flows = clone(nextState.flows);
  state.executions = clone(nextState.executions);
  state.realm_bindings = clone(nextState.realm_bindings);
  state.client_bindings = clone(nextState.client_bindings);
}

function persistStateSyncOnly(): void {
  const deferredPersistence = deferredPersistenceContext.getStore();
  if (deferredPersistence) {
    deferredPersistence.dirty = true;
    return;
  }
  authFlowsRepository.save(state);
}

async function persistStateAsync(): Promise<void> {
  await authFlowsAsyncRepository.save(state);
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

function toPublicFlow(flow: StoredIamAuthFlow): IamAuthFlowRecord {
  return clone(flow);
}

function toPublicExecution(execution: StoredIamAuthExecution): IamAuthExecutionRecord {
  return clone(execution);
}

function toPublicRealmBinding(binding: StoredIamRealmAuthFlowBinding): IamRealmAuthFlowBindingRecord {
  return clone(binding);
}

function toPublicClientBinding(binding: StoredIamClientAuthFlowBinding): IamClientAuthFlowBindingRecord {
  return clone(binding);
}

function assertFlowExists(flowId: string): StoredIamAuthFlow {
  const flow = state.flows.find((candidate) => candidate.id === flowId);
  if (!flow) {
    throw new Error(`Unknown IAM auth flow: ${flowId}`);
  }
  return flow;
}

function assertExecutionExists(executionId: string): StoredIamAuthExecution {
  const execution = state.executions.find((candidate) => candidate.id === executionId);
  if (!execution) {
    throw new Error(`Unknown IAM auth execution: ${executionId}`);
  }
  return execution;
}

function ensureUniqueFlowName(realmId: string, name: string, excludeId?: string): void {
  const normalized = name.trim().toLowerCase();
  if (!normalized) {
    throw new Error('Flow name is required');
  }
  const existing = state.flows.find(
    (candidate) => candidate.realm_id === realmId && candidate.name.trim().toLowerCase() === normalized && candidate.id !== excludeId,
  );
  if (existing) {
    throw new Error(`IAM auth flow already exists: ${name}`);
  }
}

function assertRealmExists(realmId: string): void {
  const realm = LocalIamFoundationStore.listRealms().realms.find((candidate) => candidate.id === realmId);
  if (!realm) {
    throw new Error(`Unknown IAM realm: ${realmId}`);
  }
}

function assertClientExists(clientId: string): IamClientRecord {
  const client = LocalIamProtocolRuntimeStore.listClients().clients.find((candidate) => candidate.id === clientId);
  if (!client) {
    throw new Error(`Unknown IAM client: ${clientId}`);
  }
  return client;
}

function matchesCondition(conditionKind: IamFlowConditionKind, context: {
  protocol: IamClientProtocol | null;
  required_actions: string[];
  pending_scope_consent: string[];
  mfa_enabled: boolean;
  passkey_enabled: boolean;
}): boolean {
  switch (conditionKind) {
    case 'ALWAYS':
      return true;
    case 'USER_HAS_REQUIRED_ACTIONS':
      return context.required_actions.length > 0;
    case 'USER_HAS_PASSKEY_ENABLED':
      return context.passkey_enabled;
    case 'CONSENT_REQUIRED':
      return context.pending_scope_consent.length > 0;
    case 'USER_HAS_MFA_ENABLED':
      return context.mfa_enabled;
    case 'CLIENT_PROTOCOL_IS_OIDC':
      return context.protocol === 'OIDC';
    case 'CLIENT_PROTOCOL_IS_SAML':
      return context.protocol === 'SAML';
    default:
      return true;
  }
}

function validateFlowBinding(flowId: string, realmId: string, expectedKind: Exclude<IamAuthFlowKind, 'SUBFLOW'>): void {
  const flow = assertFlowExists(flowId);
  if (flow.realm_id !== realmId) {
    throw new Error('Flow binding must belong to the selected realm');
  }
  if (flow.kind !== expectedKind || !flow.top_level) {
    throw new Error(`Flow binding requires a top-level ${expectedKind} flow`);
  }
  if (flow.status !== 'ACTIVE') {
    throw new Error('Flow binding must target an active flow');
  }
}

function seedFlow(
  flowId: string,
  input: Omit<StoredIamAuthFlow, 'id' | 'execution_ids' | 'created_at' | 'updated_at'>,
): StoredIamAuthFlow {
  const existing = state.flows.find((candidate) => candidate.id === flowId);
  if (existing) {
    return existing;
  }
  const record: StoredIamAuthFlow = {
    id: flowId,
    execution_ids: [],
    created_at: nowIso(),
    updated_at: nowIso(),
    ...input,
  };
  state.flows.push(record);
  return record;
}

function seedExecution(
  executionId: string,
  input: Omit<StoredIamAuthExecution, 'id' | 'created_at' | 'updated_at'>,
): StoredIamAuthExecution {
  const existing = state.executions.find((candidate) => candidate.id === executionId);
  if (existing) {
    let changed = false;
    if (existing.display_name !== input.display_name) {
      existing.display_name = input.display_name;
      changed = true;
    }
    if (existing.execution_kind !== input.execution_kind) {
      existing.execution_kind = input.execution_kind;
      changed = true;
    }
    if (existing.authenticator_kind !== input.authenticator_kind) {
      existing.authenticator_kind = input.authenticator_kind;
      changed = true;
    }
    if (existing.subflow_id !== input.subflow_id) {
      existing.subflow_id = input.subflow_id;
      changed = true;
    }
    if (existing.requirement !== input.requirement) {
      existing.requirement = input.requirement;
      changed = true;
    }
    if (existing.condition_kind !== input.condition_kind) {
      existing.condition_kind = input.condition_kind;
      changed = true;
    }
    if (existing.priority !== input.priority) {
      existing.priority = input.priority;
      changed = true;
    }
    if (changed) {
      existing.updated_at = nowIso();
      existing.updated_by_user_id = input.updated_by_user_id;
    }
    return existing;
  }
  const record: StoredIamAuthExecution = {
    id: executionId,
    created_at: nowIso(),
    updated_at: nowIso(),
    ...input,
  };
  state.executions.push(record);
  const flow = assertFlowExists(record.flow_id);
  flow.execution_ids = Array.from(new Set([...flow.execution_ids, record.id]));
  flow.updated_at = nowIso();
  return record;
}

function ensureRealmFlowSeeds(): void {
  const realms = LocalIamFoundationStore.listRealms().realms;
  let changed = false;

  for (const realm of realms) {
    const actorUserId = 'idp-super-admin';

    const browserFlow = seedFlow(`${realm.id}-browser-flow`, {
      realm_id: realm.id,
      name: `${realm.name} Browser Flow`,
      description: 'Top-level browser authentication flow with post-credential subflow orchestration.',
      kind: 'BROWSER',
      status: 'ACTIVE',
      synthetic: true,
      top_level: true,
      built_in: true,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    });
    const browserPostCredentialFlow = seedFlow(`${realm.id}-browser-post-credential-flow`, {
      realm_id: realm.id,
      name: `${realm.name} Browser Post-Credential`,
      description: 'Required actions, consent, and MFA checks after successful browser credential validation.',
      kind: 'SUBFLOW',
      status: 'ACTIVE',
      synthetic: true,
      top_level: false,
      built_in: true,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    });
    const directGrantFlow = seedFlow(`${realm.id}-direct-grant-flow`, {
      realm_id: realm.id,
      name: `${realm.name} Direct Grant Flow`,
      description: 'Credential-driven direct grant flow for standalone validation.',
      kind: 'DIRECT_GRANT',
      status: 'ACTIVE',
      synthetic: true,
      top_level: true,
      built_in: true,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    });
    const accountConsoleFlow = seedFlow(`${realm.id}-account-console-flow`, {
      realm_id: realm.id,
      name: `${realm.name} Account Console Flow`,
      description: 'Session-backed account-console flow for self-service posture checks.',
      kind: 'ACCOUNT_CONSOLE',
      status: 'ACTIVE',
      synthetic: true,
      top_level: true,
      built_in: true,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    });

    seedExecution(`${browserFlow.id}-passkey`, {
      realm_id: realm.id,
      flow_id: browserFlow.id,
      display_name: 'Passkey',
      execution_kind: 'AUTHENTICATOR',
      authenticator_kind: 'PASSKEY_WEBAUTHN',
      subflow_id: null,
      requirement: 'ALTERNATIVE',
      condition_kind: 'USER_HAS_PASSKEY_ENABLED',
      priority: 5,
      synthetic: true,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    });
    seedExecution(`${browserFlow.id}-username-password`, {
      realm_id: realm.id,
      flow_id: browserFlow.id,
      display_name: 'Username and Password',
      execution_kind: 'AUTHENTICATOR',
      authenticator_kind: 'USERNAME_PASSWORD',
      subflow_id: null,
      requirement: 'ALTERNATIVE',
      condition_kind: 'ALWAYS',
      priority: 10,
      synthetic: true,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    });
    seedExecution(`${browserFlow.id}-post-credential`, {
      realm_id: realm.id,
      flow_id: browserFlow.id,
      display_name: 'Post-Credential Checks',
      execution_kind: 'SUBFLOW',
      authenticator_kind: null,
      subflow_id: browserPostCredentialFlow.id,
      requirement: 'REQUIRED',
      condition_kind: 'ALWAYS',
      priority: 20,
      synthetic: true,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    });

    seedExecution(`${browserPostCredentialFlow.id}-required-actions`, {
      realm_id: realm.id,
      flow_id: browserPostCredentialFlow.id,
      display_name: 'Required Actions',
      execution_kind: 'AUTHENTICATOR',
      authenticator_kind: 'REQUIRED_ACTIONS',
      subflow_id: null,
      requirement: 'CONDITIONAL',
      condition_kind: 'USER_HAS_REQUIRED_ACTIONS',
      priority: 10,
      synthetic: true,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    });
    seedExecution(`${browserPostCredentialFlow.id}-consent`, {
      realm_id: realm.id,
      flow_id: browserPostCredentialFlow.id,
      display_name: 'Client Consent',
      execution_kind: 'AUTHENTICATOR',
      authenticator_kind: 'CONSENT',
      subflow_id: null,
      requirement: 'CONDITIONAL',
      condition_kind: 'CONSENT_REQUIRED',
      priority: 20,
      synthetic: true,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    });
    seedExecution(`${browserPostCredentialFlow.id}-mfa`, {
      realm_id: realm.id,
      flow_id: browserPostCredentialFlow.id,
      display_name: 'TOTP MFA',
      execution_kind: 'AUTHENTICATOR',
      authenticator_kind: 'TOTP_MFA',
      subflow_id: null,
      requirement: 'CONDITIONAL',
      condition_kind: 'USER_HAS_MFA_ENABLED',
      priority: 30,
      synthetic: true,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    });
    seedExecution(`${browserPostCredentialFlow.id}-allow`, {
      realm_id: realm.id,
      flow_id: browserPostCredentialFlow.id,
      display_name: 'Allow Session Issue',
      execution_kind: 'AUTHENTICATOR',
      authenticator_kind: 'ALLOW',
      subflow_id: null,
      requirement: 'REQUIRED',
      condition_kind: 'ALWAYS',
      priority: 40,
      synthetic: true,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    });

    seedExecution(`${directGrantFlow.id}-username-password`, {
      realm_id: realm.id,
      flow_id: directGrantFlow.id,
      display_name: 'Username and Password',
      execution_kind: 'AUTHENTICATOR',
      authenticator_kind: 'USERNAME_PASSWORD',
      subflow_id: null,
      requirement: 'REQUIRED',
      condition_kind: 'ALWAYS',
      priority: 10,
      synthetic: true,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    });
    seedExecution(`${directGrantFlow.id}-required-actions`, {
      realm_id: realm.id,
      flow_id: directGrantFlow.id,
      display_name: 'Required Actions',
      execution_kind: 'AUTHENTICATOR',
      authenticator_kind: 'REQUIRED_ACTIONS',
      subflow_id: null,
      requirement: 'CONDITIONAL',
      condition_kind: 'USER_HAS_REQUIRED_ACTIONS',
      priority: 20,
      synthetic: true,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    });
    seedExecution(`${directGrantFlow.id}-mfa`, {
      realm_id: realm.id,
      flow_id: directGrantFlow.id,
      display_name: 'TOTP MFA',
      execution_kind: 'AUTHENTICATOR',
      authenticator_kind: 'TOTP_MFA',
      subflow_id: null,
      requirement: 'CONDITIONAL',
      condition_kind: 'USER_HAS_MFA_ENABLED',
      priority: 30,
      synthetic: true,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    });
    seedExecution(`${directGrantFlow.id}-allow`, {
      realm_id: realm.id,
      flow_id: directGrantFlow.id,
      display_name: 'Allow Token Issue',
      execution_kind: 'AUTHENTICATOR',
      authenticator_kind: 'ALLOW',
      subflow_id: null,
      requirement: 'REQUIRED',
      condition_kind: 'ALWAYS',
      priority: 40,
      synthetic: true,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    });

    seedExecution(`${accountConsoleFlow.id}-required-actions`, {
      realm_id: realm.id,
      flow_id: accountConsoleFlow.id,
      display_name: 'Required Actions',
      execution_kind: 'AUTHENTICATOR',
      authenticator_kind: 'REQUIRED_ACTIONS',
      subflow_id: null,
      requirement: 'CONDITIONAL',
      condition_kind: 'USER_HAS_REQUIRED_ACTIONS',
      priority: 10,
      synthetic: true,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    });
    seedExecution(`${accountConsoleFlow.id}-allow`, {
      realm_id: realm.id,
      flow_id: accountConsoleFlow.id,
      display_name: 'Allow Account Console Access',
      execution_kind: 'AUTHENTICATOR',
      authenticator_kind: 'ALLOW',
      subflow_id: null,
      requirement: 'REQUIRED',
      condition_kind: 'ALWAYS',
      priority: 20,
      synthetic: true,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    });

    const binding = state.realm_bindings.find((candidate) => candidate.realm_id === realm.id);
    if (!binding) {
      state.realm_bindings.push({
        realm_id: realm.id,
        browser_flow_id: browserFlow.id,
        direct_grant_flow_id: directGrantFlow.id,
        account_console_flow_id: accountConsoleFlow.id,
        created_at: nowIso(),
        updated_at: nowIso(),
        created_by_user_id: actorUserId,
        updated_by_user_id: actorUserId,
      });
      changed = true;
    }
  }

  if (changed) {
    persistStateSyncOnly();
  } else {
    persistStateSyncOnly();
  }
}

function evaluateFlowExecutions(
  flow: StoredIamAuthFlow,
  rootFlowId: string,
  context: EvaluateIamAuthFlowInput & { protocol: IamClientProtocol | null; mfa_enabled: boolean; passkey_enabled: boolean },
  matchedExecutionIds: string[],
): IamAuthFlowDecision {
  const executions = state.executions
    .filter((candidate) => candidate.flow_id === flow.id)
    .sort((left, right) => left.priority - right.priority || left.display_name.localeCompare(right.display_name));

  const buildAuthenticatedDecision = (): IamAuthFlowDecision => ({
    flow_id: rootFlowId,
    next_step: 'AUTHENTICATED',
    pending_execution_id: null,
    pending_execution_label: null,
    matched_execution_ids: [...matchedExecutionIds],
    pending_required_actions: [],
    pending_scope_consent: [],
    pending_mfa: false,
  });

  const isAuthenticatorSatisfied = (authenticatorKind: IamAuthenticatorKind | null): boolean => {
    if (!authenticatorKind) {
      return true;
    }
    if (context.satisfied_authenticator_kinds && context.satisfied_authenticator_kinds.length > 0) {
      return context.satisfied_authenticator_kinds.includes(authenticatorKind);
    }
    if (authenticatorKind === 'USERNAME_PASSWORD' || authenticatorKind === 'PASSKEY_WEBAUTHN') {
      return context.credential_satisfied;
    }
    return false;
  };

  const evaluateExecution = (execution: StoredIamAuthExecution): {
    status: 'SATISFIED' | 'UNSATISFIED' | 'PENDING';
    decision: IamAuthFlowDecision | null;
  } => {
    matchedExecutionIds.push(execution.id);
    if (execution.execution_kind === 'SUBFLOW') {
      if (!execution.subflow_id) {
        throw new Error(`IAM auth execution ${execution.id} is missing subflow_id`);
      }
      const subflow = assertFlowExists(execution.subflow_id);
      const subflowDecision = evaluateFlowExecutions(subflow, rootFlowId, context, matchedExecutionIds);
      return subflowDecision.next_step === 'AUTHENTICATED'
        ? { status: 'SATISFIED', decision: null }
        : { status: 'PENDING', decision: subflowDecision };
    }

    switch (execution.authenticator_kind) {
      case 'USERNAME_PASSWORD':
      case 'PASSKEY_WEBAUTHN':
        return isAuthenticatorSatisfied(execution.authenticator_kind)
          ? { status: 'SATISFIED', decision: null }
          : { status: 'UNSATISFIED', decision: null };
      case 'REQUIRED_ACTIONS':
        if (context.required_actions.length > 0) {
          return {
            status: 'PENDING',
            decision: {
              flow_id: rootFlowId,
              next_step: 'REQUIRED_ACTIONS',
              pending_execution_id: execution.id,
              pending_execution_label: execution.display_name,
              matched_execution_ids: [...matchedExecutionIds],
              pending_required_actions: [...context.required_actions],
              pending_scope_consent: [],
              pending_mfa: false,
            },
          };
        }
        return { status: 'SATISFIED', decision: null };
      case 'CONSENT':
        if (context.pending_scope_consent.length > 0) {
          return {
            status: 'PENDING',
            decision: {
              flow_id: rootFlowId,
              next_step: 'CONSENT_REQUIRED',
              pending_execution_id: execution.id,
              pending_execution_label: execution.display_name,
              matched_execution_ids: [...matchedExecutionIds],
              pending_required_actions: [],
              pending_scope_consent: [...context.pending_scope_consent],
              pending_mfa: false,
            },
          };
        }
        return { status: 'SATISFIED', decision: null };
      case 'TOTP_MFA':
        if (context.mfa_enabled && !context.mfa_satisfied) {
          return {
            status: 'PENDING',
            decision: {
              flow_id: rootFlowId,
              next_step: 'MFA_REQUIRED',
              pending_execution_id: execution.id,
              pending_execution_label: execution.display_name,
              matched_execution_ids: [...matchedExecutionIds],
              pending_required_actions: [],
              pending_scope_consent: [],
              pending_mfa: true,
            },
          };
        }
        return { status: 'SATISFIED', decision: null };
      case 'ALLOW':
      case null:
      default:
        return { status: 'SATISFIED', decision: null };
    }
  };

  for (let index = 0; index < executions.length; index += 1) {
    const execution = executions[index];
    if (execution.requirement === 'DISABLED') {
      continue;
    }
    if (!matchesCondition(execution.condition_kind, context)) {
      continue;
    }

    if (execution.requirement === 'ALTERNATIVE') {
      const alternativeGroup: StoredIamAuthExecution[] = [execution];
      while (index + 1 < executions.length) {
        const nextExecution = executions[index + 1];
        if (nextExecution.requirement !== 'ALTERNATIVE') {
          break;
        }
        index += 1;
        if (!matchesCondition(nextExecution.condition_kind, context)) {
          continue;
        }
        alternativeGroup.push(nextExecution);
      }

      let satisfied = false;
      let pendingDecision: IamAuthFlowDecision | null = null;
      for (const candidate of alternativeGroup) {
        const beforeMatchCount = matchedExecutionIds.length;
        const evaluation = evaluateExecution(candidate);
        if (evaluation.status === 'SATISFIED') {
          satisfied = true;
          break;
        }
        if (evaluation.status === 'PENDING' && evaluation.decision) {
          pendingDecision = evaluation.decision;
          break;
        }
        matchedExecutionIds.splice(beforeMatchCount);
      }
      if (!satisfied && pendingDecision) {
        return pendingDecision;
      }
      if (!satisfied && !pendingDecision) {
        throw new Error(`Configured browser flow ${flow.name} rejected the supplied primary authenticator.`);
      }
      continue;
    }

    const evaluation = evaluateExecution(execution);
    if (evaluation.status === 'PENDING' && evaluation.decision) {
      return evaluation.decision;
    }
    if (evaluation.status === 'UNSATISFIED') {
      throw new Error(`Configured browser flow ${flow.name} requires ${execution.display_name}.`);
    }
  }

  return buildAuthenticatedDecision();
}

export const LocalIamAuthFlowStore = {
  getSummary(): IamAuthFlowsSummary {
    ensureRealmFlowSeeds();
    return {
      flow_count: state.flows.length,
      execution_count: state.executions.length,
      realm_auth_flow_binding_count: state.realm_bindings.length,
      client_auth_flow_binding_count: state.client_bindings.length,
    };
  },

  listFlows(filters?: { realm_id?: string | null; kind?: IamAuthFlowKind | null }): IamAuthFlowsResponse {
    ensureRealmFlowSeeds();
    let flows = [...state.flows];
    if (filters?.realm_id) {
      flows = flows.filter((candidate) => candidate.realm_id === filters.realm_id);
    }
    if (filters?.kind) {
      flows = flows.filter((candidate) => candidate.kind === filters.kind);
    }
    flows.sort((left, right) => left.name.localeCompare(right.name));
    return {
      generated_at: nowIso(),
      flows: flows.map(toPublicFlow),
      count: flows.length,
    };
  },

  createFlow(actorUserId: string, input: CreateIamAuthFlowRequest): IamAuthFlowRecord {
    ensureRealmFlowSeeds();
    assertRealmExists(input.realm_id);
    const name = input.name?.trim();
    if (!name) {
      throw new Error('Flow name is required');
    }
    ensureUniqueFlowName(input.realm_id, name);
    const record: StoredIamAuthFlow = {
      id: nextUniqueId(`${input.realm_id}-${name}`, new Set(state.flows.map((flow) => flow.id)), 'iam-auth-flow'),
      realm_id: input.realm_id,
      name,
      description: input.description?.trim() || '',
      kind: input.kind,
      status: input.status ?? 'ACTIVE',
      synthetic: false,
      top_level: input.kind === 'SUBFLOW' ? false : input.top_level ?? true,
      built_in: false,
      execution_ids: [],
      created_at: nowIso(),
      updated_at: nowIso(),
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    };
    if (record.kind === 'SUBFLOW') {
      record.top_level = false;
    }
    state.flows.push(record);
    persistStateSyncOnly();
    return toPublicFlow(record);
  },

  async createFlowAsync(
    actorUserId: string,
    input: CreateIamAuthFlowRequest,
  ): Promise<IamAuthFlowRecord> {
    return runWithDeferredPersistence(() => this.createFlow(actorUserId, input));
  },

  updateFlow(actorUserId: string, flowId: string, input: UpdateIamAuthFlowRequest): IamAuthFlowRecord {
    ensureRealmFlowSeeds();
    const flow = assertFlowExists(flowId);
    if (input.name !== undefined) {
      const nextName = input.name.trim();
      if (!nextName) {
        throw new Error('Flow name is required');
      }
      ensureUniqueFlowName(flow.realm_id, nextName, flow.id);
      flow.name = nextName;
    }
    if (input.description !== undefined) {
      flow.description = input.description.trim();
    }
    if (input.status) {
      flow.status = input.status;
    }
    flow.updated_at = nowIso();
    flow.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return toPublicFlow(flow);
  },

  async updateFlowAsync(
    actorUserId: string,
    flowId: string,
    input: UpdateIamAuthFlowRequest,
  ): Promise<IamAuthFlowRecord> {
    return runWithDeferredPersistence(() => this.updateFlow(actorUserId, flowId, input));
  },

  listExecutions(filters?: { flow_id?: string | null }): IamAuthExecutionsResponse {
    ensureRealmFlowSeeds();
    let executions = [...state.executions];
    if (filters?.flow_id) {
      executions = executions.filter((candidate) => candidate.flow_id === filters.flow_id);
    }
    executions.sort((left, right) => left.priority - right.priority || left.display_name.localeCompare(right.display_name));
    return {
      generated_at: nowIso(),
      executions: executions.map(toPublicExecution),
      count: executions.length,
    };
  },

  createExecution(actorUserId: string, input: CreateIamAuthExecutionRequest): IamAuthExecutionRecord {
    ensureRealmFlowSeeds();
    assertRealmExists(input.realm_id);
    const flow = assertFlowExists(input.flow_id);
    if (flow.realm_id !== input.realm_id) {
      throw new Error('Execution flow must belong to the selected realm');
    }
    const displayName = input.display_name?.trim();
    if (!displayName) {
      throw new Error('Execution display_name is required');
    }
    if (input.execution_kind === 'AUTHENTICATOR' && !input.authenticator_kind) {
      throw new Error('Authenticator executions require authenticator_kind');
    }
    if (input.execution_kind === 'SUBFLOW') {
      if (!input.subflow_id) {
        throw new Error('Subflow executions require subflow_id');
      }
      const subflow = assertFlowExists(input.subflow_id);
      if (subflow.realm_id !== input.realm_id || subflow.kind !== 'SUBFLOW') {
        throw new Error('Subflow execution must reference a subflow in the same realm');
      }
    }
    const record: StoredIamAuthExecution = {
      id: nextUniqueId(`${flow.id}-${displayName}`, new Set(state.executions.map((execution) => execution.id)), 'iam-auth-execution'),
      realm_id: input.realm_id,
      flow_id: flow.id,
      display_name: displayName,
      execution_kind: input.execution_kind,
      authenticator_kind: input.execution_kind === 'AUTHENTICATOR' ? input.authenticator_kind ?? null : null,
      subflow_id: input.execution_kind === 'SUBFLOW' ? input.subflow_id ?? null : null,
      requirement: input.requirement ?? 'REQUIRED',
      condition_kind: input.condition_kind ?? 'ALWAYS',
      priority: Number.isFinite(input.priority) ? Number(input.priority) : (state.executions.filter((candidate) => candidate.flow_id === flow.id).length + 1) * 10,
      synthetic: false,
      created_at: nowIso(),
      updated_at: nowIso(),
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    };
    state.executions.push(record);
    flow.execution_ids = Array.from(new Set([...flow.execution_ids, record.id]));
    flow.updated_at = nowIso();
    flow.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return toPublicExecution(record);
  },

  async createExecutionAsync(
    actorUserId: string,
    input: CreateIamAuthExecutionRequest,
  ): Promise<IamAuthExecutionRecord> {
    return runWithDeferredPersistence(() => this.createExecution(actorUserId, input));
  },

  updateExecution(actorUserId: string, executionId: string, input: UpdateIamAuthExecutionRequest): IamAuthExecutionRecord {
    ensureRealmFlowSeeds();
    const execution = assertExecutionExists(executionId);
    if (input.display_name !== undefined) {
      const nextDisplayName = input.display_name.trim();
      if (!nextDisplayName) {
        throw new Error('Execution display_name is required');
      }
      execution.display_name = nextDisplayName;
    }
    if (input.requirement) {
      execution.requirement = input.requirement;
    }
    if (input.condition_kind) {
      execution.condition_kind = input.condition_kind;
    }
    if (input.priority !== undefined) {
      execution.priority = Number(input.priority);
    }
    if (execution.execution_kind === 'AUTHENTICATOR' && input.authenticator_kind !== undefined) {
      execution.authenticator_kind = input.authenticator_kind;
    }
    if (execution.execution_kind === 'SUBFLOW' && input.subflow_id !== undefined) {
      if (!input.subflow_id) {
        throw new Error('Subflow execution requires subflow_id');
      }
      const subflow = assertFlowExists(input.subflow_id);
      if (subflow.realm_id !== execution.realm_id || subflow.kind !== 'SUBFLOW') {
        throw new Error('Subflow execution must reference a subflow in the same realm');
      }
      execution.subflow_id = input.subflow_id;
    }
    execution.updated_at = nowIso();
    execution.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return toPublicExecution(execution);
  },

  async updateExecutionAsync(
    actorUserId: string,
    executionId: string,
    input: UpdateIamAuthExecutionRequest,
  ): Promise<IamAuthExecutionRecord> {
    return runWithDeferredPersistence(() => this.updateExecution(actorUserId, executionId, input));
  },

  listBindings(filters?: { realm_id?: string | null; client_id?: string | null }): IamAuthFlowBindingsResponse {
    ensureRealmFlowSeeds();
    let realmBindings = [...state.realm_bindings];
    let clientBindings = [...state.client_bindings];
    if (filters?.realm_id) {
      realmBindings = realmBindings.filter((candidate) => candidate.realm_id === filters.realm_id);
      clientBindings = clientBindings.filter((candidate) => candidate.realm_id === filters.realm_id);
    }
    if (filters?.client_id) {
      clientBindings = clientBindings.filter((candidate) => candidate.client_id === filters.client_id);
    }
    return {
      generated_at: nowIso(),
      realm_bindings: realmBindings.map(toPublicRealmBinding),
      client_bindings: clientBindings.map(toPublicClientBinding),
      count: realmBindings.length + clientBindings.length,
    };
  },

  updateRealmBindings(actorUserId: string, realmId: string, input: UpdateIamRealmAuthFlowBindingsRequest): IamRealmAuthFlowBindingRecord {
    ensureRealmFlowSeeds();
    assertRealmExists(realmId);
    const binding = state.realm_bindings.find((candidate) => candidate.realm_id === realmId);
    if (!binding) {
      throw new Error(`Missing IAM auth-flow binding for realm ${realmId}`);
    }
    if (input.browser_flow_id) {
      validateFlowBinding(input.browser_flow_id, realmId, 'BROWSER');
      binding.browser_flow_id = input.browser_flow_id;
    }
    if (input.direct_grant_flow_id) {
      validateFlowBinding(input.direct_grant_flow_id, realmId, 'DIRECT_GRANT');
      binding.direct_grant_flow_id = input.direct_grant_flow_id;
    }
    if (input.account_console_flow_id) {
      validateFlowBinding(input.account_console_flow_id, realmId, 'ACCOUNT_CONSOLE');
      binding.account_console_flow_id = input.account_console_flow_id;
    }
    binding.updated_at = nowIso();
    binding.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return toPublicRealmBinding(binding);
  },

  async updateRealmBindingsAsync(
    actorUserId: string,
    realmId: string,
    input: UpdateIamRealmAuthFlowBindingsRequest,
  ): Promise<IamRealmAuthFlowBindingRecord> {
    return runWithDeferredPersistence(() => this.updateRealmBindings(actorUserId, realmId, input));
  },

  updateClientBindings(actorUserId: string, clientId: string, input: UpdateIamClientAuthFlowBindingsRequest): IamClientAuthFlowBindingRecord {
    ensureRealmFlowSeeds();
    const client = assertClientExists(clientId);
    let binding = state.client_bindings.find((candidate) => candidate.client_id === client.id);
    if (!binding) {
      binding = {
        id: nextUniqueId(`${client.realm_id}-${client.client_id}-binding`, new Set(state.client_bindings.map((candidate) => candidate.id)), 'iam-client-auth-binding'),
        realm_id: client.realm_id,
        client_id: client.id,
        browser_flow_id: null,
        direct_grant_flow_id: null,
        account_console_flow_id: null,
        created_at: nowIso(),
        updated_at: nowIso(),
        created_by_user_id: actorUserId,
        updated_by_user_id: actorUserId,
      };
      state.client_bindings.push(binding);
    }

    if (input.browser_flow_id !== undefined) {
      if (input.browser_flow_id) {
        validateFlowBinding(input.browser_flow_id, client.realm_id, 'BROWSER');
      }
      binding.browser_flow_id = input.browser_flow_id ?? null;
    }
    if (input.direct_grant_flow_id !== undefined) {
      if (input.direct_grant_flow_id) {
        validateFlowBinding(input.direct_grant_flow_id, client.realm_id, 'DIRECT_GRANT');
      }
      binding.direct_grant_flow_id = input.direct_grant_flow_id ?? null;
    }
    if (input.account_console_flow_id !== undefined) {
      if (input.account_console_flow_id) {
        validateFlowBinding(input.account_console_flow_id, client.realm_id, 'ACCOUNT_CONSOLE');
      }
      binding.account_console_flow_id = input.account_console_flow_id ?? null;
    }
    binding.updated_at = nowIso();
    binding.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return toPublicClientBinding(binding);
  },

  async updateClientBindingsAsync(
    actorUserId: string,
    clientId: string,
    input: UpdateIamClientAuthFlowBindingsRequest,
  ): Promise<IamClientAuthFlowBindingRecord> {
    return runWithDeferredPersistence(() => this.updateClientBindings(actorUserId, clientId, input));
  },

  resolveBoundFlowId(realmId: string, clientId: string | null | undefined, flowKind: Exclude<IamAuthFlowKind, 'SUBFLOW'>): string {
    ensureRealmFlowSeeds();
    if (clientId) {
      const clientBinding = state.client_bindings.find((candidate) => candidate.client_id === clientId);
      if (clientBinding) {
        if (flowKind === 'BROWSER' && clientBinding.browser_flow_id) {
          return clientBinding.browser_flow_id;
        }
        if (flowKind === 'DIRECT_GRANT' && clientBinding.direct_grant_flow_id) {
          return clientBinding.direct_grant_flow_id;
        }
        if (flowKind === 'ACCOUNT_CONSOLE' && clientBinding.account_console_flow_id) {
          return clientBinding.account_console_flow_id;
        }
      }
    }
    const realmBinding = state.realm_bindings.find((candidate) => candidate.realm_id === realmId);
    if (!realmBinding) {
      throw new Error(`Missing IAM auth-flow binding for realm ${realmId}`);
    }
    if (flowKind === 'BROWSER') {
      return realmBinding.browser_flow_id;
    }
    if (flowKind === 'DIRECT_GRANT') {
      return realmBinding.direct_grant_flow_id;
    }
    return realmBinding.account_console_flow_id;
  },

  evaluateFlow(input: EvaluateIamAuthFlowInput): IamAuthFlowDecision {
    return this.evaluateLoginFlow({
      ...input,
      mfa_enabled: false,
      passkey_enabled: input.passkey_enabled ?? false,
    });
  },

  evaluateLoginFlow(input: EvaluateIamAuthFlowInput & { mfa_enabled: boolean }): IamAuthFlowDecision {
    ensureRealmFlowSeeds();
    const client = input.client_id ? assertClientExists(input.client_id) : null;
    const flowId = input.flow_id ?? this.resolveBoundFlowId(input.realm_id, input.client_id ?? null, input.flow_kind);
    const flow = assertFlowExists(flowId);
    if (flow.realm_id !== input.realm_id) {
      throw new Error('Flow evaluation must occur within the selected realm');
    }
    return evaluateFlowExecutions(flow, flow.id, {
      ...input,
      protocol: client?.protocol ?? null,
      mfa_enabled: input.mfa_enabled,
      passkey_enabled: input.passkey_enabled ?? false,
    }, []);
  },

  exportState(): Record<string, unknown> {
    ensureRealmFlowSeeds();
    return clone(state) as unknown as Record<string, unknown>;
  },

  importState(input: Record<string, unknown>): void {
    const nextState = normalizeState(input as Partial<IamAuthFlowsState>);
    state.flows = nextState.flows;
    state.executions = nextState.executions;
    state.realm_bindings = nextState.realm_bindings;
    state.client_bindings = nextState.client_bindings;
    ensureRealmFlowSeeds();
    persistStateSyncOnly();
  },
};
