import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import {
  createPersistedAsyncIamStateRepository,
  createPersistedIamStateRepository,
  type IamAsyncStateRepository,
  type IamStateRepository,
} from './iamStateRepository';
import { LocalIamFoundationStore, type IamDelegatedAdminRecord, type IamGroupRecord, type IamRoleRecord, type IamUserRecord } from './iamFoundation';
import { LocalIamProtocolRuntimeStore, type IamClientRecord } from './iamProtocolRuntime';

const IAM_ADMIN_AUTHORIZATION_FILE = 'iam-admin-authorization-state.json';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

function nextId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

function unique(values: string[] | undefined): string[] {
  return Array.from(new Set((values ?? []).map((value) => value.trim()).filter(Boolean)));
}

function intersects(left: string[], right: string[]): boolean {
  if (left.length === 0 || right.length === 0) {
    return false;
  }
  const rightSet = new Set(right);
  return left.some((value) => rightSet.has(value));
}

export type IamAdminPermissionDomain =
  | 'USERS'
  | 'GROUPS'
  | 'ROLES'
  | 'CLIENTS';

export type IamAdminPermissionAction =
  | 'READ'
  | 'MANAGE'
  | 'IMPERSONATE';

export type IamAdminPermissionScopeKind =
  | 'REALM'
  | 'SCOPED';

export type IamAdminPolicyPrincipalKind =
  | 'USER'
  | 'GROUP'
  | 'ROLE';

export type IamAdminPolicyStatus =
  | 'ACTIVE'
  | 'DISABLED';

export interface IamAdminPermissionRecord {
  id: string;
  realm_id: string;
  name: string;
  summary: string;
  domain: IamAdminPermissionDomain;
  actions: IamAdminPermissionAction[];
  scope_kind: IamAdminPermissionScopeKind;
  managed_user_ids: string[];
  managed_group_ids: string[];
  managed_role_ids: string[];
  managed_client_ids: string[];
  synthetic: boolean;
  source_delegated_admin_id: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamAdminPolicyRecord {
  id: string;
  realm_id: string;
  name: string;
  summary: string;
  principal_kind: IamAdminPolicyPrincipalKind;
  principal_id: string;
  principal_label: string;
  permission_ids: string[];
  status: IamAdminPolicyStatus;
  synthetic: boolean;
  source_delegated_admin_id: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamAdminEvaluationRecord {
  id: string;
  realm_id: string;
  actor_user_id: string;
  actor_username: string;
  actor_group_ids: string[];
  actor_role_ids: string[];
  domain: IamAdminPermissionDomain;
  action: IamAdminPermissionAction;
  target_resource_id: string | null;
  target_resource_label: string | null;
  allowed: boolean;
  reason: string;
  route: string;
  method: string;
  created_at: string;
}

interface IamAdminAuthorizationState {
  permissions: IamAdminPermissionRecord[];
  policies: IamAdminPolicyRecord[];
  evaluations: IamAdminEvaluationRecord[];
}

interface IamAdminAuthorizationRepository extends IamStateRepository<IamAdminAuthorizationState> {}
interface IamAsyncAdminAuthorizationRepository extends IamAsyncStateRepository<IamAdminAuthorizationState> {}

export interface IamAdminAuthorizationSummary {
  permission_count: number;
  policy_count: number;
  evaluation_count: number;
}

export interface IamAdminPermissionsResponse {
  generated_at: string;
  permissions: IamAdminPermissionRecord[];
  count: number;
}

export interface IamAdminPoliciesResponse {
  generated_at: string;
  policies: IamAdminPolicyRecord[];
  count: number;
}

export interface IamAdminEvaluationsResponse {
  generated_at: string;
  evaluations: IamAdminEvaluationRecord[];
  count: number;
}

export interface CreateIamAdminPermissionRequest {
  realm_id: string;
  name: string;
  summary: string;
  domain: IamAdminPermissionDomain;
  actions: IamAdminPermissionAction[];
  scope_kind?: IamAdminPermissionScopeKind;
  managed_user_ids?: string[];
  managed_group_ids?: string[];
  managed_role_ids?: string[];
  managed_client_ids?: string[];
}

export interface UpdateIamAdminPermissionRequest {
  name?: string;
  summary?: string;
  actions?: IamAdminPermissionAction[];
  scope_kind?: IamAdminPermissionScopeKind;
  managed_user_ids?: string[];
  managed_group_ids?: string[];
  managed_role_ids?: string[];
  managed_client_ids?: string[];
}

export interface CreateIamAdminPolicyRequest {
  realm_id: string;
  name: string;
  summary: string;
  principal_kind: IamAdminPolicyPrincipalKind;
  principal_id: string;
  principal_label: string;
  permission_ids: string[];
  status?: IamAdminPolicyStatus;
}

export interface UpdateIamAdminPolicyRequest {
  name?: string;
  summary?: string;
  principal_label?: string;
  permission_ids?: string[];
  status?: IamAdminPolicyStatus;
}

type EvaluationInput = {
  realm_id: string;
  actor_user_id: string;
  domain: IamAdminPermissionDomain;
  action: IamAdminPermissionAction;
  target_resource_id?: string | null;
  target_user?: IamUserRecord | null;
  target_group?: IamGroupRecord | null;
  target_role?: IamRoleRecord | null;
  target_client?: IamClientRecord | null;
  route: string;
  method: string;
};

const adminAuthorizationRepository: IamAdminAuthorizationRepository = createPersistedIamStateRepository<
  IamAdminAuthorizationState,
  IamAdminAuthorizationState
>({
  fileName: IAM_ADMIN_AUTHORIZATION_FILE,
  seedFactory: () => ({
    permissions: [],
    policies: [],
    evaluations: [],
  }),
  normalize: (input) => ({
    permissions: Array.isArray(input.permissions) ? clone(input.permissions) : [],
    policies: Array.isArray(input.policies) ? clone(input.policies) : [],
    evaluations: Array.isArray(input.evaluations) ? clone(input.evaluations) : [],
  }),
});

const adminAuthorizationAsyncRepository: IamAsyncAdminAuthorizationRepository = createPersistedAsyncIamStateRepository<
  IamAdminAuthorizationState,
  IamAdminAuthorizationState
>({
  fileName: IAM_ADMIN_AUTHORIZATION_FILE,
  seedFactory: () => ({
    permissions: [],
    policies: [],
    evaluations: [],
  }),
  normalize: (input) => ({
    permissions: Array.isArray(input.permissions) ? clone(input.permissions) : [],
    policies: Array.isArray(input.policies) ? clone(input.policies) : [],
    evaluations: Array.isArray(input.evaluations) ? clone(input.evaluations) : [],
  }),
});

const state = adminAuthorizationRepository.load();
const deferredPersistenceContext = new AsyncLocalStorage<{ dirty: boolean }>();

async function loadStateAsync(): Promise<IamAdminAuthorizationState> {
  return await adminAuthorizationAsyncRepository.load();
}

function syncInMemoryState(nextState: IamAdminAuthorizationState): void {
  state.permissions = clone(nextState.permissions);
  state.policies = clone(nextState.policies);
  state.evaluations = clone(nextState.evaluations);
}

function persistStateSyncOnly(): void {
  const deferredPersistence = deferredPersistenceContext.getStore();
  if (deferredPersistence) {
    deferredPersistence.dirty = true;
    return;
  }
  adminAuthorizationRepository.save(state);
}

async function persistStateAsync(): Promise<void> {
  await adminAuthorizationAsyncRepository.save(state);
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

function validatePermissionRealmAssociations(realmId: string, input: {
  managed_user_ids?: string[];
  managed_group_ids?: string[];
  managed_role_ids?: string[];
  managed_client_ids?: string[];
}): void {
  for (const userId of unique(input.managed_user_ids)) {
    const user = LocalIamFoundationStore.getUserById(userId);
    if (user.realm_id !== realmId) {
      throw new Error(`IAM admin permission user ${userId} does not belong to realm ${realmId}`);
    }
  }
  for (const groupId of unique(input.managed_group_ids)) {
    const group = LocalIamFoundationStore.getGroupById(groupId);
    if (group.realm_id !== realmId) {
      throw new Error(`IAM admin permission group ${groupId} does not belong to realm ${realmId}`);
    }
  }
  for (const roleId of unique(input.managed_role_ids)) {
    const role = LocalIamFoundationStore.getRoleById(roleId);
    if (role.realm_id !== realmId) {
      throw new Error(`IAM admin permission role ${roleId} does not belong to realm ${realmId}`);
    }
  }
  for (const clientId of unique(input.managed_client_ids)) {
    const client = LocalIamProtocolRuntimeStore.getClientById(clientId);
    if (client.realm_id !== realmId) {
      throw new Error(`IAM admin permission client ${clientId} does not belong to realm ${realmId}`);
    }
  }
}

function normalizePermissionInput(
  realmId: string,
  input: {
    name?: string;
    summary?: string;
    actions?: IamAdminPermissionAction[];
    scope_kind?: IamAdminPermissionScopeKind;
    managed_user_ids?: string[];
    managed_group_ids?: string[];
    managed_role_ids?: string[];
    managed_client_ids?: string[];
  },
): {
  name?: string;
  summary?: string;
  actions?: IamAdminPermissionAction[];
  scope_kind?: IamAdminPermissionScopeKind;
  managed_user_ids?: string[];
  managed_group_ids?: string[];
  managed_role_ids?: string[];
  managed_client_ids?: string[];
} {
  validatePermissionRealmAssociations(realmId, input);
  return {
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.summary !== undefined ? { summary: input.summary.trim() } : {}),
    ...(input.actions ? { actions: Array.from(new Set(input.actions)) } : {}),
    ...(input.scope_kind ? { scope_kind: input.scope_kind } : {}),
    ...(input.managed_user_ids ? { managed_user_ids: unique(input.managed_user_ids) } : {}),
    ...(input.managed_group_ids ? { managed_group_ids: unique(input.managed_group_ids) } : {}),
    ...(input.managed_role_ids ? { managed_role_ids: unique(input.managed_role_ids) } : {}),
    ...(input.managed_client_ids ? { managed_client_ids: unique(input.managed_client_ids) } : {}),
  };
}

function assertPermission(permissionId: string): IamAdminPermissionRecord {
  const permission = state.permissions.find((candidate) => candidate.id === permissionId);
  if (!permission) {
    throw new Error(`Unknown IAM admin permission: ${permissionId}`);
  }
  return permission;
}

function assertPolicy(policyId: string): IamAdminPolicyRecord {
  const policy = state.policies.find((candidate) => candidate.id === policyId);
  if (!policy) {
    throw new Error(`Unknown IAM admin policy: ${policyId}`);
  }
  return policy;
}

function validatePolicyPrincipal(realmId: string, principalKind: IamAdminPolicyPrincipalKind, principalId: string): void {
  if (principalKind === 'USER') {
    const user = LocalIamFoundationStore.getUserById(principalId);
    if (user.realm_id !== realmId) {
      throw new Error(`IAM admin policy user ${principalId} does not belong to realm ${realmId}`);
    }
    return;
  }
  if (principalKind === 'GROUP') {
    const group = LocalIamFoundationStore.getGroupById(principalId);
    if (group.realm_id !== realmId) {
      throw new Error(`IAM admin policy group ${principalId} does not belong to realm ${realmId}`);
    }
    return;
  }
  const role = LocalIamFoundationStore.getRoleById(principalId);
  if (role.realm_id !== realmId) {
    throw new Error(`IAM admin policy role ${principalId} does not belong to realm ${realmId}`);
  }
}

function validatePermissionReferences(realmId: string, permissionIds: string[]): void {
  for (const permissionId of unique(permissionIds)) {
    const permission = assertPermission(permissionId);
    if (permission.realm_id !== realmId) {
      throw new Error(`IAM admin permission ${permissionId} does not belong to realm ${realmId}`);
    }
  }
}

function permissionMatchesUser(permission: IamAdminPermissionRecord, targetUser: IamUserRecord | null): boolean {
  if (permission.scope_kind === 'REALM') {
    return true;
  }
  if (!targetUser) {
    return true;
  }
  return (
    permission.managed_user_ids.includes(targetUser.id) ||
    intersects(permission.managed_group_ids, targetUser.group_ids) ||
    intersects(permission.managed_role_ids, targetUser.role_ids)
  );
}

function permissionMatchesGroup(permission: IamAdminPermissionRecord, targetGroup: IamGroupRecord | null): boolean {
  if (permission.scope_kind === 'REALM') {
    return true;
  }
  if (!targetGroup) {
    return true;
  }
  return permission.managed_group_ids.includes(targetGroup.id);
}

function permissionMatchesRole(permission: IamAdminPermissionRecord, targetRole: IamRoleRecord | null): boolean {
  if (permission.scope_kind === 'REALM') {
    return true;
  }
  if (!targetRole) {
    return true;
  }
  return permission.managed_role_ids.includes(targetRole.id);
}

function permissionMatchesClient(permission: IamAdminPermissionRecord, targetClient: IamClientRecord | null): boolean {
  if (permission.scope_kind === 'REALM') {
    return true;
  }
  if (!targetClient) {
    return true;
  }
  return (
    permission.managed_client_ids.includes(targetClient.id) ||
    permission.managed_client_ids.includes(targetClient.client_id)
  );
}

function permissionMatchesTarget(
  permission: IamAdminPermissionRecord,
  input: EvaluationInput,
): boolean {
  switch (input.domain) {
    case 'USERS':
      return permissionMatchesUser(permission, input.target_user ?? null);
    case 'GROUPS':
      return permissionMatchesGroup(permission, input.target_group ?? null);
    case 'ROLES':
      return permissionMatchesRole(permission, input.target_role ?? null);
    case 'CLIENTS':
      return permissionMatchesClient(permission, input.target_client ?? null);
  }
}

function deriveSyntheticRecordsFromDelegatedAdmin(
  assignment: IamDelegatedAdminRecord,
): { permissions: IamAdminPermissionRecord[]; policies: IamAdminPolicyRecord[] } {
  const createdAt = assignment.created_at;
  const permissionSpecs: Array<{
    domain: IamAdminPermissionDomain;
    name: string;
    summary: string;
    actions: IamAdminPermissionAction[];
    managed_group_ids?: string[];
    managed_role_ids?: string[];
    managed_client_ids?: string[];
  }> = [];

  if (assignment.managed_group_ids.length > 0 || assignment.managed_role_ids.length > 0) {
    permissionSpecs.push({
      domain: 'USERS',
      name: `${assignment.principal_label} User Administration`,
      summary: 'Synthetic permission derived from delegated admin assignments for managed users.',
      actions: ['READ', 'MANAGE', 'IMPERSONATE'],
      managed_group_ids: assignment.managed_group_ids,
      managed_role_ids: assignment.managed_role_ids,
    });
  }
  if (assignment.managed_group_ids.length > 0) {
    permissionSpecs.push({
      domain: 'GROUPS',
      name: `${assignment.principal_label} Group Administration`,
      summary: 'Synthetic permission derived from delegated admin assignments for managed groups.',
      actions: ['READ', 'MANAGE'],
      managed_group_ids: assignment.managed_group_ids,
    });
  }
  if (assignment.managed_role_ids.length > 0) {
    permissionSpecs.push({
      domain: 'ROLES',
      name: `${assignment.principal_label} Role Administration`,
      summary: 'Synthetic permission derived from delegated admin assignments for managed roles.',
      actions: ['READ', 'MANAGE'],
      managed_role_ids: assignment.managed_role_ids,
    });
  }
  if (assignment.managed_client_ids.length > 0) {
    permissionSpecs.push({
      domain: 'CLIENTS',
      name: `${assignment.principal_label} Client Administration`,
      summary: 'Synthetic permission derived from delegated admin assignments for managed clients.',
      actions: ['READ', 'MANAGE'],
      managed_client_ids: assignment.managed_client_ids,
    });
  }

  const permissions = permissionSpecs.map((spec) => ({
    id: `iam-admin-permission-${assignment.id}-${spec.domain.toLowerCase()}`,
    realm_id: assignment.realm_id,
    name: spec.name,
    summary: spec.summary,
    domain: spec.domain,
    actions: spec.actions,
    scope_kind: 'SCOPED' as const,
    managed_user_ids: [],
    managed_group_ids: unique(spec.managed_group_ids),
    managed_role_ids: unique(spec.managed_role_ids),
    managed_client_ids: unique(spec.managed_client_ids),
    synthetic: true,
    source_delegated_admin_id: assignment.id,
    created_at: createdAt,
    updated_at: assignment.updated_at,
    created_by_user_id: assignment.created_by_user_id,
    updated_by_user_id: assignment.updated_by_user_id,
  }));

  const policies = permissions.map((permission) => ({
    id: `iam-admin-policy-${assignment.id}-${permission.domain.toLowerCase()}`,
    realm_id: assignment.realm_id,
    name: `${assignment.principal_label} ${permission.domain} Policy`,
    summary: 'Synthetic admin policy derived from delegated admin assignments.',
    principal_kind: (assignment.principal_kind === 'USER' ? 'USER' : 'GROUP') as IamAdminPolicyPrincipalKind,
    principal_id: assignment.principal_id,
    principal_label: assignment.principal_label,
    permission_ids: [permission.id],
    status: assignment.status === 'ACTIVE' ? 'ACTIVE' as const : 'DISABLED' as const,
    synthetic: true,
    source_delegated_admin_id: assignment.id,
    created_at: createdAt,
    updated_at: assignment.updated_at,
    created_by_user_id: assignment.created_by_user_id,
    updated_by_user_id: assignment.updated_by_user_id,
  }));

  return { permissions, policies };
}

function synchronizeSyntheticAuthorizations(): void {
  const delegatedAdmins = LocalIamFoundationStore.listDelegatedAdmins().delegated_admins;
  const manualPermissions = state.permissions.filter((permission) => !permission.synthetic);
  const manualPolicies = state.policies.filter((policy) => !policy.synthetic);
  const syntheticPermissions: IamAdminPermissionRecord[] = [];
  const syntheticPolicies: IamAdminPolicyRecord[] = [];

  for (const assignment of delegatedAdmins) {
    const derived = deriveSyntheticRecordsFromDelegatedAdmin(assignment);
    syntheticPermissions.push(...derived.permissions);
    syntheticPolicies.push(...derived.policies);
  }

  state.permissions = [...manualPermissions, ...syntheticPermissions];
  state.policies = [...manualPolicies, ...syntheticPolicies];
  persistStateSyncOnly();
}

function resolveActorPermissions(realmId: string, actorUserId: string): IamAdminPermissionRecord[] {
  synchronizeSyntheticAuthorizations();
  const actor = LocalIamFoundationStore.getUserById(actorUserId);
  if (actor.realm_id !== realmId) {
    throw new Error(`IAM admin actor ${actorUserId} does not belong to realm ${realmId}`);
  }
  const applicablePolicies = state.policies.filter((policy) => {
    if (policy.realm_id !== realmId || policy.status !== 'ACTIVE') {
      return false;
    }
    switch (policy.principal_kind) {
      case 'USER':
        return policy.principal_id === actor.id;
      case 'GROUP':
        return actor.group_ids.includes(policy.principal_id);
      case 'ROLE':
        return actor.role_ids.includes(policy.principal_id);
    }
  });
  const permissionIds = Array.from(new Set(applicablePolicies.flatMap((policy) => policy.permission_ids)));
  return permissionIds.map(assertPermission).filter((permission) => permission.realm_id === realmId);
}

function recordEvaluation(
  input: EvaluationInput,
  actor: IamUserRecord,
  allowed: boolean,
  reason: string,
): IamAdminEvaluationRecord {
  const record: IamAdminEvaluationRecord = {
    id: nextId('iam-admin-eval'),
    realm_id: input.realm_id,
    actor_user_id: actor.id,
    actor_username: actor.username,
    actor_group_ids: [...actor.group_ids],
    actor_role_ids: [...actor.role_ids],
    domain: input.domain,
    action: input.action,
    target_resource_id: input.target_resource_id ?? null,
    target_resource_label:
      input.target_user?.username ??
      input.target_group?.name ??
      input.target_role?.name ??
      input.target_client?.client_id ??
      null,
    allowed,
    reason,
    route: input.route,
    method: input.method,
    created_at: nowIso(),
  };
  state.evaluations.unshift(record);
  state.evaluations.splice(250, state.evaluations.length);
  persistStateSyncOnly();
  return clone(record);
}

export const LocalIamAdminAuthorizationStore = {
  getSummary(): IamAdminAuthorizationSummary {
    synchronizeSyntheticAuthorizations();
    return {
      permission_count: state.permissions.length,
      policy_count: state.policies.length,
      evaluation_count: state.evaluations.length,
    };
  },

  listPermissions(filters?: {
    realm_id?: string | null;
    domain?: IamAdminPermissionDomain | null;
  }): IamAdminPermissionsResponse {
    synchronizeSyntheticAuthorizations();
    let permissions = [...state.permissions];
    if (filters?.realm_id) {
      permissions = permissions.filter((permission) => permission.realm_id === filters.realm_id);
    }
    if (filters?.domain) {
      permissions = permissions.filter((permission) => permission.domain === filters.domain);
    }
    return {
      generated_at: nowIso(),
      permissions: clone(permissions),
      count: permissions.length,
    };
  },

  createPermission(actorUserId: string, input: CreateIamAdminPermissionRequest): IamAdminPermissionRecord {
    LocalIamFoundationStore.getRealm(input.realm_id);
    const normalized = normalizePermissionInput(input.realm_id, input);
    if (!normalized.name || !normalized.summary || !normalized.actions || normalized.actions.length === 0) {
      throw new Error('IAM admin permission requires name, summary, and at least one action');
    }
    const createdAt = nowIso();
    const record: IamAdminPermissionRecord = {
      id: nextId('iam-admin-permission'),
      realm_id: input.realm_id,
      name: normalized.name,
      summary: normalized.summary,
      domain: input.domain,
      actions: normalized.actions,
      scope_kind: normalized.scope_kind ?? 'REALM',
      managed_user_ids: normalized.managed_user_ids ?? [],
      managed_group_ids: normalized.managed_group_ids ?? [],
      managed_role_ids: normalized.managed_role_ids ?? [],
      managed_client_ids: normalized.managed_client_ids ?? [],
      synthetic: false,
      source_delegated_admin_id: null,
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    };
    state.permissions.push(record);
    persistStateSyncOnly();
    return clone(record);
  },

  async createPermissionAsync(
    actorUserId: string,
    input: CreateIamAdminPermissionRequest,
  ): Promise<IamAdminPermissionRecord> {
    return runWithDeferredPersistence(() => this.createPermission(actorUserId, input));
  },

  updatePermission(actorUserId: string, permissionId: string, input: UpdateIamAdminPermissionRequest): IamAdminPermissionRecord {
    const permission = assertPermission(permissionId);
    if (permission.synthetic) {
      throw new Error('Synthetic IAM admin permissions derived from delegated admin cannot be edited directly');
    }
    const normalized = normalizePermissionInput(permission.realm_id, input);
    if (normalized.name !== undefined) {
      if (!normalized.name) {
        throw new Error('IAM admin permission name cannot be empty');
      }
      permission.name = normalized.name;
    }
    if (normalized.summary !== undefined) {
      if (!normalized.summary) {
        throw new Error('IAM admin permission summary cannot be empty');
      }
      permission.summary = normalized.summary;
    }
    if (normalized.actions) {
      permission.actions = normalized.actions;
    }
    if (normalized.scope_kind) {
      permission.scope_kind = normalized.scope_kind;
    }
    if (normalized.managed_user_ids) {
      permission.managed_user_ids = normalized.managed_user_ids;
    }
    if (normalized.managed_group_ids) {
      permission.managed_group_ids = normalized.managed_group_ids;
    }
    if (normalized.managed_role_ids) {
      permission.managed_role_ids = normalized.managed_role_ids;
    }
    if (normalized.managed_client_ids) {
      permission.managed_client_ids = normalized.managed_client_ids;
    }
    permission.updated_at = nowIso();
    permission.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return clone(permission);
  },

  async updatePermissionAsync(
    actorUserId: string,
    permissionId: string,
    input: UpdateIamAdminPermissionRequest,
  ): Promise<IamAdminPermissionRecord> {
    return runWithDeferredPersistence(() => this.updatePermission(actorUserId, permissionId, input));
  },

  listPolicies(filters?: {
    realm_id?: string | null;
    principal_id?: string | null;
  }): IamAdminPoliciesResponse {
    synchronizeSyntheticAuthorizations();
    let policies = [...state.policies];
    if (filters?.realm_id) {
      policies = policies.filter((policy) => policy.realm_id === filters.realm_id);
    }
    if (filters?.principal_id) {
      policies = policies.filter((policy) => policy.principal_id === filters.principal_id);
    }
    return {
      generated_at: nowIso(),
      policies: clone(policies),
      count: policies.length,
    };
  },

  createPolicy(actorUserId: string, input: CreateIamAdminPolicyRequest): IamAdminPolicyRecord {
    LocalIamFoundationStore.getRealm(input.realm_id);
    validatePolicyPrincipal(input.realm_id, input.principal_kind, input.principal_id);
    validatePermissionReferences(input.realm_id, input.permission_ids);
    const name = input.name.trim();
    const summary = input.summary.trim();
    const principalLabel = input.principal_label.trim();
    if (!name || !summary || !principalLabel) {
      throw new Error('IAM admin policy requires name, summary, and principal_label');
    }
    const createdAt = nowIso();
    const record: IamAdminPolicyRecord = {
      id: nextId('iam-admin-policy'),
      realm_id: input.realm_id,
      name,
      summary,
      principal_kind: input.principal_kind,
      principal_id: input.principal_id,
      principal_label: principalLabel,
      permission_ids: unique(input.permission_ids),
      status: input.status ?? 'ACTIVE',
      synthetic: false,
      source_delegated_admin_id: null,
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    };
    state.policies.push(record);
    persistStateSyncOnly();
    return clone(record);
  },

  async createPolicyAsync(
    actorUserId: string,
    input: CreateIamAdminPolicyRequest,
  ): Promise<IamAdminPolicyRecord> {
    return runWithDeferredPersistence(() => this.createPolicy(actorUserId, input));
  },

  updatePolicy(actorUserId: string, policyId: string, input: UpdateIamAdminPolicyRequest): IamAdminPolicyRecord {
    const policy = assertPolicy(policyId);
    if (policy.synthetic) {
      throw new Error('Synthetic IAM admin policies derived from delegated admin cannot be edited directly');
    }
    if (input.name !== undefined) {
      const next = input.name.trim();
      if (!next) {
        throw new Error('IAM admin policy name cannot be empty');
      }
      policy.name = next;
    }
    if (input.summary !== undefined) {
      const next = input.summary.trim();
      if (!next) {
        throw new Error('IAM admin policy summary cannot be empty');
      }
      policy.summary = next;
    }
    if (input.principal_label !== undefined) {
      const next = input.principal_label.trim();
      if (!next) {
        throw new Error('IAM admin policy principal_label cannot be empty');
      }
      policy.principal_label = next;
    }
    if (input.permission_ids) {
      validatePermissionReferences(policy.realm_id, input.permission_ids);
      policy.permission_ids = unique(input.permission_ids);
    }
    if (input.status) {
      policy.status = input.status;
    }
    policy.updated_at = nowIso();
    policy.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return clone(policy);
  },

  async updatePolicyAsync(
    actorUserId: string,
    policyId: string,
    input: UpdateIamAdminPolicyRequest,
  ): Promise<IamAdminPolicyRecord> {
    return runWithDeferredPersistence(() => this.updatePolicy(actorUserId, policyId, input));
  },

  listEvaluations(filters?: {
    realm_id?: string | null;
    actor_user_id?: string | null;
    allowed?: boolean | null;
  }): IamAdminEvaluationsResponse {
    let evaluations = [...state.evaluations];
    if (filters?.realm_id) {
      evaluations = evaluations.filter((evaluation) => evaluation.realm_id === filters.realm_id);
    }
    if (filters?.actor_user_id) {
      evaluations = evaluations.filter((evaluation) => evaluation.actor_user_id === filters.actor_user_id);
    }
    if (filters?.allowed !== undefined && filters.allowed !== null) {
      evaluations = evaluations.filter((evaluation) => evaluation.allowed === filters.allowed);
    }
    return {
      generated_at: nowIso(),
      evaluations: clone(evaluations),
      count: evaluations.length,
    };
  },

  evaluate(input: EvaluationInput): { allowed: boolean; reason: string; permissions: IamAdminPermissionRecord[]; evaluation: IamAdminEvaluationRecord } {
    const actor = LocalIamFoundationStore.getUserById(input.actor_user_id);
    if (actor.realm_id !== input.realm_id) {
      throw new Error(`IAM admin actor ${input.actor_user_id} does not belong to realm ${input.realm_id}`);
    }
    const permissions = resolveActorPermissions(input.realm_id, actor.id).filter((permission) =>
      permission.domain === input.domain && permission.actions.includes(input.action),
    );
    if (permissions.length === 0) {
      return {
        allowed: false,
        reason: 'No active IAM admin policy grants the requested domain and action',
        permissions,
        evaluation: recordEvaluation(input, actor, false, 'No active IAM admin policy grants the requested domain and action'),
      };
    }
    const matchingPermission = permissions.find((permission) => permissionMatchesTarget(permission, input));
    if (!matchingPermission) {
      return {
        allowed: false,
        reason: 'IAM admin policies exist for the requested domain, but not for the targeted resource scope',
        permissions,
        evaluation: recordEvaluation(input, actor, false, 'IAM admin policies exist for the requested domain, but not for the targeted resource scope'),
      };
    }
    return {
      allowed: true,
      reason: matchingPermission.scope_kind === 'REALM'
        ? 'Realm-scoped IAM admin permission matched the request'
        : 'Scoped IAM admin permission matched the targeted resource',
      permissions,
      evaluation: recordEvaluation(
        input,
        actor,
        true,
        matchingPermission.scope_kind === 'REALM'
          ? 'Realm-scoped IAM admin permission matched the request'
          : 'Scoped IAM admin permission matched the targeted resource',
      ),
    };
  },

  filterUsersForActor(realmId: string, actorUserId: string, users: IamUserRecord[]): IamUserRecord[] {
    const permissions = resolveActorPermissions(realmId, actorUserId).filter((permission) =>
      permission.domain === 'USERS' && permission.actions.includes('READ'),
    );
    if (permissions.some((permission) => permission.scope_kind === 'REALM')) {
      return users;
    }
    return users.filter((user) => permissions.some((permission) => permissionMatchesUser(permission, user)));
  },

  filterGroupsForActor(realmId: string, actorUserId: string, groups: IamGroupRecord[]): IamGroupRecord[] {
    const permissions = resolveActorPermissions(realmId, actorUserId).filter((permission) =>
      permission.domain === 'GROUPS' && permission.actions.includes('READ'),
    );
    if (permissions.some((permission) => permission.scope_kind === 'REALM')) {
      return groups;
    }
    return groups.filter((group) => permissions.some((permission) => permissionMatchesGroup(permission, group)));
  },

  filterRolesForActor(realmId: string, actorUserId: string, roles: IamRoleRecord[]): IamRoleRecord[] {
    const permissions = resolveActorPermissions(realmId, actorUserId).filter((permission) =>
      permission.domain === 'ROLES' && permission.actions.includes('READ'),
    );
    if (permissions.some((permission) => permission.scope_kind === 'REALM')) {
      return roles;
    }
    return roles.filter((role) => permissions.some((permission) => permissionMatchesRole(permission, role)));
  },

  filterClientsForActor(realmId: string, actorUserId: string, clients: IamClientRecord[]): IamClientRecord[] {
    const permissions = resolveActorPermissions(realmId, actorUserId).filter((permission) =>
      permission.domain === 'CLIENTS' && permission.actions.includes('READ'),
    );
    if (permissions.some((permission) => permission.scope_kind === 'REALM')) {
      return clients;
    }
    return clients.filter((client) => permissions.some((permission) => permissionMatchesClient(permission, client)));
  },
};
