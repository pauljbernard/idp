import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import {
  readPersistedStateSnapshot,
} from './persistence';
import {
  createPersistedAsyncIamStateRepository,
  createPersistedIamStateRepository,
  type IamAsyncStateRepository,
  type IamStateRepository,
} from './iamStateRepository';
import {
  LocalIamFoundationStore,
  type IamDelegatedConsentRecord,
  type IamDelegatedRelationshipRecord,
  type IamGroupRecord,
  type IamRoleRecord,
  type IamUserRecord,
} from './iamFoundation';
import { LocalIamProtocolRuntimeStore, type IamClientRecord, type IamResolvedIssuedTokenRecord, type IamSubjectKind, type IamTokenEndpointResponse } from './iamProtocolRuntime';

const LEGACY_IAM_AUTHORIZATION_SERVICES_FILE = 'iam-authorization-services-state.json';
const IAM_AUTHORIZATION_SERVICES_DIRECTORY_FILE = 'iam-authorization-services-directory-state.json';
const IAM_AUTHORIZATION_SERVICES_PERMISSION_TICKETS_FILE = 'iam-authorization-services-permission-tickets-state.json';
const PERMISSION_TICKET_TTL_MS = 1000 * 60 * 10;

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

function isActiveDelegatedRelationship(relationship: IamDelegatedRelationshipRecord): boolean {
  if (relationship.status !== 'ACTIVE') {
    return false;
  }

  const now = Date.now();
  if (relationship.start_at) {
    const startAt = Date.parse(relationship.start_at);
    if (!Number.isNaN(startAt) && startAt > now) {
      return false;
    }
  }
  if (relationship.end_at) {
    const endAt = Date.parse(relationship.end_at);
    if (!Number.isNaN(endAt) && endAt <= now) {
      return false;
    }
  }

  return true;
}

function parseScopeNames(input: string[] | string | null | undefined): string[] {
  if (Array.isArray(input)) {
    return unique(input);
  }
  if (typeof input !== 'string') {
    return [];
  }
  return unique(input.split(/\s+/));
}

function parsePurposeName(input: string | null | undefined): string | null {
  if (typeof input !== 'string') {
    return null;
  }
  const normalized = input.trim();
  return normalized || null;
}

function readResourcePurposes(resource: IamProtectedResourceRecord): string[] {
  return unique([
    ...(resource.attributes.allowed_purpose ?? []),
    ...(resource.attributes.allowed_purposes ?? []),
  ]);
}

function resourceAllowsRequestedPurpose(resource: IamProtectedResourceRecord, requestedPurpose: string | null): boolean {
  const allowedPurposes = readResourcePurposes(resource);
  if (allowedPurposes.length === 0) {
    return true;
  }
  return requestedPurpose !== null && allowedPurposes.includes(requestedPurpose);
}

function isActiveDelegatedConsent(consent: IamDelegatedConsentRecord): boolean {
  if (consent.status !== 'ACTIVE' || consent.revoked_at) {
    return false;
  }
  if (consent.expires_at && Date.parse(consent.expires_at) <= Date.now()) {
    return false;
  }
  return true;
}

function delegatedConsentAllowsRequest(
  consent: IamDelegatedConsentRecord,
  relationship: IamDelegatedRelationshipRecord,
  scopeName: string,
  requestedPurpose: string | null,
): boolean {
  if (!isActiveDelegatedConsent(consent)) {
    return false;
  }
  if (consent.relationship_id !== relationship.id) {
    return false;
  }
  if (consent.principal_user_id !== relationship.principal_user_id || consent.delegate_user_id !== relationship.delegate_user_id) {
    return false;
  }
  if (!consent.scope_names.includes(scopeName)) {
    return false;
  }
  const consentPurposes = unique(consent.purpose_names);
  if (consentPurposes.length === 0) {
    return requestedPurpose !== null || unique(relationship.allowed_purposes ?? []).length === 0;
  }
  return requestedPurpose !== null && consentPurposes.includes(requestedPurpose);
}

function delegatedRelationshipAllowsRequestedPurpose(
  relationship: IamDelegatedRelationshipRecord,
  requestedPurpose: string | null,
): boolean {
  const allowedPurposes = unique(relationship.allowed_purposes ?? []);
  if (allowedPurposes.length > 0 && (requestedPurpose === null || !allowedPurposes.includes(requestedPurpose))) {
    return false;
  }
  return true;
}

export type IamAuthzResourceServerStatus = 'ACTIVE' | 'ARCHIVED';
export type IamAuthzScopeStatus = 'ACTIVE' | 'DISABLED';
export type IamAuthzResourceStatus = 'ACTIVE' | 'DISABLED';
export type IamAuthzPolicyStatus = 'ACTIVE' | 'DISABLED';
export type IamAuthzPermissionStatus = 'ACTIVE' | 'DISABLED';
export type IamAuthzEnforcementMode = 'ENFORCING' | 'PERMISSIVE' | 'DISABLED';
export type IamAuthzDecisionStrategy = 'AFFIRMATIVE' | 'UNANIMOUS';
export type IamAuthzPolicyKind = 'ANY' | 'USER' | 'GROUP' | 'ROLE' | 'CLIENT' | 'OWNER';
export type IamPermissionTicketStatus = 'GRANTED' | 'DENIED' | 'EXCHANGED' | 'EXPIRED';

export interface IamResourceServerRecord {
  id: string;
  realm_id: string;
  client_id: string;
  client_record_id: string;
  name: string;
  summary: string;
  status: IamAuthzResourceServerStatus;
  enforcement_mode: IamAuthzEnforcementMode;
  decision_strategy: IamAuthzDecisionStrategy;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamProtectedScopeRecord {
  id: string;
  realm_id: string;
  resource_server_id: string;
  name: string;
  summary: string;
  status: IamAuthzScopeStatus;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamProtectedResourceRecord {
  id: string;
  realm_id: string;
  resource_server_id: string;
  name: string;
  summary: string;
  uri: string | null;
  type_label: string | null;
  status: IamAuthzResourceStatus;
  owner_user_ids: string[];
  scope_ids: string[];
  attributes: Record<string, string[]>;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamAuthorizationPolicyRecord {
  id: string;
  realm_id: string;
  resource_server_id: string;
  name: string;
  summary: string;
  kind: IamAuthzPolicyKind;
  status: IamAuthzPolicyStatus;
  principal_user_ids: string[];
  principal_group_ids: string[];
  principal_role_ids: string[];
  principal_client_ids: string[];
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamAuthorizationPermissionRecord {
  id: string;
  realm_id: string;
  resource_server_id: string;
  name: string;
  summary: string;
  status: IamAuthzPermissionStatus;
  resource_ids: string[];
  scope_ids: string[];
  policy_ids: string[];
  decision_strategy: IamAuthzDecisionStrategy;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamAuthorizationEvaluationRecord {
  id: string;
  realm_id: string;
  resource_server_id: string;
  requester_client_id: string | null;
  subject_kind: IamSubjectKind;
  subject_id: string;
  resource_id: string;
  requested_purpose: string | null;
  requested_scope_names: string[];
  granted_scope_names: string[];
  allowed: boolean;
  reason: string;
  matched_policy_ids: string[];
  matched_permission_ids: string[];
  created_at: string;
}

export interface IamPermissionTicketRecord {
  id: string;
  realm_id: string;
  resource_server_id: string;
  resource_server_client_id: string;
  requester_client_id: string | null;
  subject_kind: IamSubjectKind;
  subject_id: string;
  resource_id: string;
  requested_scope_names: string[];
  granted_scope_names: string[];
  status: IamPermissionTicketStatus;
  reason: string;
  created_at: string;
  expires_at: string;
  exchanged_at: string | null;
  evaluation_id: string | null;
  rpt_token_id: string | null;
}

interface IamAuthorizationServicesState {
  resource_servers: IamResourceServerRecord[];
  scopes: IamProtectedScopeRecord[];
  resources: IamProtectedResourceRecord[];
  policies: IamAuthorizationPolicyRecord[];
  permissions: IamAuthorizationPermissionRecord[];
  evaluations: IamAuthorizationEvaluationRecord[];
  permission_tickets: IamPermissionTicketRecord[];
}

interface IamAuthorizationServicesDirectoryState {
  resource_servers: IamResourceServerRecord[];
  scopes: IamProtectedScopeRecord[];
  resources: IamProtectedResourceRecord[];
  policies: IamAuthorizationPolicyRecord[];
  permissions: IamAuthorizationPermissionRecord[];
  evaluations: IamAuthorizationEvaluationRecord[];
}

interface IamAuthorizationServicesPermissionTicketsState {
  permission_tickets: IamPermissionTicketRecord[];
}

interface IamAuthorizationServicesDirectoryRepository extends IamStateRepository<IamAuthorizationServicesDirectoryState> {}
interface IamAsyncAuthorizationServicesDirectoryRepository extends IamAsyncStateRepository<IamAuthorizationServicesDirectoryState> {}
interface IamAuthorizationServicesPermissionTicketsRepository extends IamStateRepository<IamAuthorizationServicesPermissionTicketsState> {}
interface IamAsyncAuthorizationServicesPermissionTicketsRepository extends IamAsyncStateRepository<IamAuthorizationServicesPermissionTicketsState> {}

export interface IamAuthorizationServicesSummary {
  resource_server_count: number;
  protected_scope_count: number;
  protected_resource_count: number;
  authorization_policy_count: number;
  authorization_permission_count: number;
  authorization_evaluation_count: number;
  permission_ticket_count: number;
  active_permission_ticket_count: number;
}

export interface IamAuthorizationServicesTransientStateMaintenanceResult {
  expired_permission_ticket_count: number;
  total_mutated_count: number;
}

export interface IamResourceServersResponse {
  generated_at: string;
  resource_servers: IamResourceServerRecord[];
  count: number;
}

export interface IamProtectedScopesResponse {
  generated_at: string;
  scopes: IamProtectedScopeRecord[];
  count: number;
}

export interface IamProtectedResourcesResponse {
  generated_at: string;
  resources: IamProtectedResourceRecord[];
  count: number;
}

export interface IamAuthorizationPoliciesResponse {
  generated_at: string;
  policies: IamAuthorizationPolicyRecord[];
  count: number;
}

export interface IamAuthorizationPermissionsResponse {
  generated_at: string;
  permissions: IamAuthorizationPermissionRecord[];
  count: number;
}

export interface IamAuthorizationEvaluationsResponse {
  generated_at: string;
  evaluations: IamAuthorizationEvaluationRecord[];
  count: number;
}

export interface IamPermissionTicketsResponse {
  generated_at: string;
  permission_tickets: IamPermissionTicketRecord[];
  count: number;
}

export interface CreateIamResourceServerRequest {
  realm_id: string;
  client_id: string;
  name: string;
  summary: string;
  status?: IamAuthzResourceServerStatus;
  enforcement_mode?: IamAuthzEnforcementMode;
  decision_strategy?: IamAuthzDecisionStrategy;
}

export interface UpdateIamResourceServerRequest {
  name?: string;
  summary?: string;
  status?: IamAuthzResourceServerStatus;
  enforcement_mode?: IamAuthzEnforcementMode;
  decision_strategy?: IamAuthzDecisionStrategy;
}

export interface CreateIamProtectedScopeRequest {
  realm_id: string;
  resource_server_id: string;
  name: string;
  summary: string;
  status?: IamAuthzScopeStatus;
}

export interface UpdateIamProtectedScopeRequest {
  name?: string;
  summary?: string;
  status?: IamAuthzScopeStatus;
}

export interface CreateIamProtectedResourceRequest {
  realm_id: string;
  resource_server_id: string;
  name: string;
  summary: string;
  uri?: string | null;
  type_label?: string | null;
  status?: IamAuthzResourceStatus;
  owner_user_ids?: string[];
  scope_ids?: string[];
  attributes?: Record<string, string[]>;
}

export interface UpdateIamProtectedResourceRequest {
  name?: string;
  summary?: string;
  uri?: string | null;
  type_label?: string | null;
  status?: IamAuthzResourceStatus;
  owner_user_ids?: string[];
  scope_ids?: string[];
  attributes?: Record<string, string[]>;
}

export interface CreateIamAuthorizationPolicyRequest {
  realm_id: string;
  resource_server_id: string;
  name: string;
  summary: string;
  kind: IamAuthzPolicyKind;
  status?: IamAuthzPolicyStatus;
  principal_user_ids?: string[];
  principal_group_ids?: string[];
  principal_role_ids?: string[];
  principal_client_ids?: string[];
}

export interface UpdateIamAuthorizationPolicyRequest {
  name?: string;
  summary?: string;
  status?: IamAuthzPolicyStatus;
  principal_user_ids?: string[];
  principal_group_ids?: string[];
  principal_role_ids?: string[];
  principal_client_ids?: string[];
}

export interface CreateIamAuthorizationPermissionRequest {
  realm_id: string;
  resource_server_id: string;
  name: string;
  summary: string;
  status?: IamAuthzPermissionStatus;
  resource_ids: string[];
  scope_ids: string[];
  policy_ids: string[];
  decision_strategy?: IamAuthzDecisionStrategy;
}

export interface UpdateIamAuthorizationPermissionRequest {
  name?: string;
  summary?: string;
  status?: IamAuthzPermissionStatus;
  resource_ids?: string[];
  scope_ids?: string[];
  policy_ids?: string[];
  decision_strategy?: IamAuthzDecisionStrategy;
}

export interface EvaluateIamAuthorizationRequest {
  realm_id: string;
  resource_server_id: string;
  subject_kind: IamSubjectKind;
  subject_id: string;
  requester_client_id?: string | null;
  resource_id: string;
  requested_purpose?: string | null;
  requested_scope_names: string[] | string;
}

export interface IamAuthorizationEvaluationResponse {
  realm_id: string;
  resource_server_id: string;
  subject_kind: IamSubjectKind;
  subject_id: string;
  requester_client_id: string | null;
  resource_id: string;
  requested_purpose: string | null;
  requested_scope_names: string[];
  granted_scope_names: string[];
  allowed: boolean;
  reason: string;
  matched_policy_ids: string[];
  matched_permission_ids: string[];
  evaluation: IamAuthorizationEvaluationRecord;
}

export interface CreateIamPermissionTicketRequest {
  resource_server_client_id?: string | null;
  resource_id: string;
  scope_names: string[] | string;
  subject_token: string;
}

export interface IamPermissionTicketResponse extends IamPermissionTicketRecord {
  resource_name: string;
}

interface StoredRptAuthorization {
  permissions: Array<{
    resource_id: string;
    resource_name: string;
    scopes: string[];
  }>;
  resource_server_id: string;
  resource_server_client_id: string;
  permission_ticket_id: string;
}

function createEmptyState(): IamAuthorizationServicesState {
  return {
    resource_servers: [],
    scopes: [],
    resources: [],
    policies: [],
    permissions: [],
    evaluations: [],
    permission_tickets: [],
  };
}

function combineState(
  directoryState: IamAuthorizationServicesDirectoryState,
  permissionTicketsState: IamAuthorizationServicesPermissionTicketsState,
): IamAuthorizationServicesState {
  return {
    resource_servers: clone(directoryState.resource_servers),
    scopes: clone(directoryState.scopes),
    resources: clone(directoryState.resources),
    policies: clone(directoryState.policies),
    permissions: clone(directoryState.permissions),
    evaluations: clone(directoryState.evaluations),
    permission_tickets: clone(permissionTicketsState.permission_tickets),
  };
}

function splitDirectoryState(input: IamAuthorizationServicesState): IamAuthorizationServicesDirectoryState {
  return {
    resource_servers: clone(input.resource_servers),
    scopes: clone(input.scopes),
    resources: clone(input.resources),
    policies: clone(input.policies),
    permissions: clone(input.permissions),
    evaluations: clone(input.evaluations),
  };
}

function splitPermissionTicketsState(
  input: IamAuthorizationServicesState,
): IamAuthorizationServicesPermissionTicketsState {
  return {
    permission_tickets: clone(input.permission_tickets),
  };
}

function normalizeDirectoryState(
  input: Partial<IamAuthorizationServicesDirectoryState>,
): IamAuthorizationServicesDirectoryState {
  const combined = createEmptyState();
  if (Array.isArray(input.resource_servers)) combined.resource_servers = clone(input.resource_servers);
  if (Array.isArray(input.scopes)) combined.scopes = clone(input.scopes);
  if (Array.isArray(input.resources)) combined.resources = clone(input.resources);
  if (Array.isArray(input.policies)) combined.policies = clone(input.policies);
  if (Array.isArray(input.permissions)) combined.permissions = clone(input.permissions);
  if (Array.isArray(input.evaluations)) combined.evaluations = clone(input.evaluations);
  return splitDirectoryState(combined);
}

function normalizePermissionTicketsState(
  input: Partial<IamAuthorizationServicesPermissionTicketsState>,
): IamAuthorizationServicesPermissionTicketsState {
  return {
    permission_tickets: Array.isArray(input.permission_tickets) ? clone(input.permission_tickets) : [],
  };
}

function readLegacyAuthorizationServicesStateSnapshot(): IamAuthorizationServicesState {
  const input = readPersistedStateSnapshot<Partial<IamAuthorizationServicesState>>(
    LEGACY_IAM_AUTHORIZATION_SERVICES_FILE,
  ) ?? {};
  return {
    resource_servers: Array.isArray(input.resource_servers) ? clone(input.resource_servers) : [],
    scopes: Array.isArray(input.scopes) ? clone(input.scopes) : [],
    resources: Array.isArray(input.resources) ? clone(input.resources) : [],
    policies: Array.isArray(input.policies) ? clone(input.policies) : [],
    permissions: Array.isArray(input.permissions) ? clone(input.permissions) : [],
    evaluations: Array.isArray(input.evaluations) ? clone(input.evaluations) : [],
    permission_tickets: Array.isArray(input.permission_tickets) ? clone(input.permission_tickets) : [],
  };
}

const authorizationServicesDirectoryRepository: IamAuthorizationServicesDirectoryRepository = createPersistedIamStateRepository<
  Partial<IamAuthorizationServicesDirectoryState>,
  IamAuthorizationServicesDirectoryState
>({
  fileName: IAM_AUTHORIZATION_SERVICES_DIRECTORY_FILE,
  seedFactory: () => normalizeDirectoryState(readLegacyAuthorizationServicesStateSnapshot()),
  normalize: normalizeDirectoryState,
});

const authorizationServicesDirectoryAsyncRepository: IamAsyncAuthorizationServicesDirectoryRepository = createPersistedAsyncIamStateRepository<
  Partial<IamAuthorizationServicesDirectoryState>,
  IamAuthorizationServicesDirectoryState
>({
  fileName: IAM_AUTHORIZATION_SERVICES_DIRECTORY_FILE,
  seedFactory: () => normalizeDirectoryState(readLegacyAuthorizationServicesStateSnapshot()),
  normalize: normalizeDirectoryState,
});

const authorizationServicesPermissionTicketsRepository: IamAuthorizationServicesPermissionTicketsRepository = createPersistedIamStateRepository<
  Partial<IamAuthorizationServicesPermissionTicketsState>,
  IamAuthorizationServicesPermissionTicketsState
>({
  fileName: IAM_AUTHORIZATION_SERVICES_PERMISSION_TICKETS_FILE,
  seedFactory: () => normalizePermissionTicketsState(readLegacyAuthorizationServicesStateSnapshot()),
  normalize: normalizePermissionTicketsState,
});

const authorizationServicesPermissionTicketsAsyncRepository: IamAsyncAuthorizationServicesPermissionTicketsRepository = createPersistedAsyncIamStateRepository<
  Partial<IamAuthorizationServicesPermissionTicketsState>,
  IamAuthorizationServicesPermissionTicketsState
>({
  fileName: IAM_AUTHORIZATION_SERVICES_PERMISSION_TICKETS_FILE,
  seedFactory: () => normalizePermissionTicketsState(readLegacyAuthorizationServicesStateSnapshot()),
  normalize: normalizePermissionTicketsState,
});

const state = combineState(
  authorizationServicesDirectoryRepository.load(),
  authorizationServicesPermissionTicketsRepository.load(),
);
const deferredPersistenceContext = new AsyncLocalStorage<{ dirty: boolean }>();

async function loadStateAsync(): Promise<IamAuthorizationServicesState> {
  const [directoryState, permissionTicketsState] = await Promise.all([
    authorizationServicesDirectoryAsyncRepository.load(),
    authorizationServicesPermissionTicketsAsyncRepository.load(),
  ]);
  return combineState(directoryState, permissionTicketsState);
}

function syncInMemoryState(nextState: IamAuthorizationServicesState): void {
  state.resource_servers = clone(nextState.resource_servers);
  state.scopes = clone(nextState.scopes);
  state.resources = clone(nextState.resources);
  state.policies = clone(nextState.policies);
  state.permissions = clone(nextState.permissions);
  state.evaluations = clone(nextState.evaluations);
  state.permission_tickets = clone(nextState.permission_tickets);
}

function persistStateSyncOnly(): void {
  const deferredPersistence = deferredPersistenceContext.getStore();
  if (deferredPersistence) {
    deferredPersistence.dirty = true;
    return;
  }
  authorizationServicesDirectoryRepository.save(splitDirectoryState(state));
  authorizationServicesPermissionTicketsRepository.save(splitPermissionTicketsState(state));
}

async function persistStateAsync(): Promise<void> {
  await authorizationServicesDirectoryAsyncRepository.save(splitDirectoryState(state));
  await authorizationServicesPermissionTicketsAsyncRepository.save(splitPermissionTicketsState(state));
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

function assertResourceServer(resourceServerId: string): IamResourceServerRecord {
  const record = state.resource_servers.find((candidate) => candidate.id === resourceServerId);
  if (!record) {
    throw new Error(`Unknown IAM resource server: ${resourceServerId}`);
  }
  return record;
}

function assertScope(scopeId: string): IamProtectedScopeRecord {
  const record = state.scopes.find((candidate) => candidate.id === scopeId);
  if (!record) {
    throw new Error(`Unknown IAM protected scope: ${scopeId}`);
  }
  return record;
}

function assertResource(resourceId: string): IamProtectedResourceRecord {
  const record = state.resources.find((candidate) => candidate.id === resourceId);
  if (!record) {
    throw new Error(`Unknown IAM protected resource: ${resourceId}`);
  }
  return record;
}

function assertPolicy(policyId: string): IamAuthorizationPolicyRecord {
  const record = state.policies.find((candidate) => candidate.id === policyId);
  if (!record) {
    throw new Error(`Unknown IAM authorization policy: ${policyId}`);
  }
  return record;
}

function assertPermission(permissionId: string): IamAuthorizationPermissionRecord {
  const record = state.permissions.find((candidate) => candidate.id === permissionId);
  if (!record) {
    throw new Error(`Unknown IAM authorization permission: ${permissionId}`);
  }
  return record;
}

function assertPermissionTicket(ticketId: string): IamPermissionTicketRecord {
  const record = state.permission_tickets.find((candidate) => candidate.id === ticketId);
  if (!record) {
    throw new Error(`Unknown IAM permission ticket: ${ticketId}`);
  }
  return record;
}

function validateRealmClient(realmId: string, clientIdentifier: string): IamClientRecord {
  const client = LocalIamProtocolRuntimeStore.listClients({ realm_id: realmId }).clients.find(
    (candidate) => candidate.id === clientIdentifier || candidate.client_id === clientIdentifier,
  );
  if (!client) {
    throw new Error(`IAM client ${clientIdentifier} does not belong to realm ${realmId}`);
  }
  return client;
}

function validateRealmUsers(realmId: string, userIds: string[]): void {
  userIds.forEach((userId) => {
    const user = LocalIamFoundationStore.getUserById(userId);
    if (user.realm_id !== realmId) {
      throw new Error(`IAM user ${userId} does not belong to realm ${realmId}`);
    }
  });
}

function validateRealmGroups(realmId: string, groupIds: string[]): void {
  groupIds.forEach((groupId) => {
    const group = LocalIamFoundationStore.getGroupById(groupId);
    if (group.realm_id !== realmId) {
      throw new Error(`IAM group ${groupId} does not belong to realm ${realmId}`);
    }
  });
}

function validateRealmRoles(realmId: string, roleIds: string[]): void {
  roleIds.forEach((roleId) => {
    const role = LocalIamFoundationStore.getRoleById(roleId);
    if (role.realm_id !== realmId) {
      throw new Error(`IAM role ${roleId} does not belong to realm ${realmId}`);
    }
  });
}

function validateResourceServerAssociations(realmId: string, resourceServerId: string, input: {
  scope_ids?: string[];
  resource_ids?: string[];
  policy_ids?: string[];
}): void {
  const resourceServer = assertResourceServer(resourceServerId);
  if (resourceServer.realm_id !== realmId) {
    throw new Error(`IAM resource server ${resourceServerId} does not belong to realm ${realmId}`);
  }
  unique(input.scope_ids).forEach((scopeId) => {
    const scope = assertScope(scopeId);
    if (scope.realm_id !== realmId || scope.resource_server_id !== resourceServerId) {
      throw new Error(`IAM protected scope ${scopeId} does not belong to resource server ${resourceServerId}`);
    }
  });
  unique(input.resource_ids).forEach((resourceId) => {
    const resource = assertResource(resourceId);
    if (resource.realm_id !== realmId || resource.resource_server_id !== resourceServerId) {
      throw new Error(`IAM protected resource ${resourceId} does not belong to resource server ${resourceServerId}`);
    }
  });
  unique(input.policy_ids).forEach((policyId) => {
    const policy = assertPolicy(policyId);
    if (policy.realm_id !== realmId || policy.resource_server_id !== resourceServerId) {
      throw new Error(`IAM authorization policy ${policyId} does not belong to resource server ${resourceServerId}`);
    }
  });
}

function cleanupExpiredPermissionTickets(): number {
  let changed = false;
  let expiredPermissionTicketCount = 0;
  for (const ticket of state.permission_tickets) {
    if (ticket.status !== 'EXCHANGED' && Date.parse(ticket.expires_at) <= Date.now()) {
      ticket.status = 'EXPIRED';
      changed = true;
      expiredPermissionTicketCount += 1;
    }
  }
  if (changed) {
    persistStateSyncOnly();
  }
  return expiredPermissionTicketCount;
}

function matchDelegatedRelationshipPolicy(
  policy: IamAuthorizationPolicyRecord,
  resource: IamProtectedResourceRecord,
  scopeName: string,
  requestedPurpose: string | null,
  subjectKind: IamSubjectKind,
  subjectId: string,
): string | null {
  if (subjectKind !== 'USER') {
    return null;
  }

  const delegatedRelationships = LocalIamFoundationStore.listDelegatedRelationships({ realm_id: resource.realm_id }).delegated_relationships;
  for (const relationship of delegatedRelationships) {
    if (!isActiveDelegatedRelationship(relationship)) {
      continue;
    }
    if (relationship.delegate_user_id !== subjectId) {
      continue;
    }
    if (!relationship.allowed_scopes.includes(scopeName)) {
      continue;
    }
    if (!delegatedRelationshipAllowsRequestedPurpose(relationship, requestedPurpose)) {
      continue;
    }
    if (relationship.consent_required) {
      const delegatedConsents = LocalIamFoundationStore.listDelegatedConsents({
        realm_id: relationship.realm_id,
        relationship_id: relationship.id,
        principal_user_id: relationship.principal_user_id,
        delegate_user_id: relationship.delegate_user_id,
        status: 'ACTIVE',
      }).delegated_consents;
      if (!delegatedConsents.some((consent) => delegatedConsentAllowsRequest(consent, relationship, scopeName, requestedPurpose))) {
        continue;
      }
    }

    if (policy.kind === 'USER' && policy.principal_user_ids.includes(relationship.principal_user_id)) {
      return relationship.id;
    }

    if (policy.kind === 'OWNER' && resource.owner_user_ids.includes(relationship.principal_user_id)) {
      return relationship.id;
    }
  }

  return null;
}

function matchPolicy(
  policy: IamAuthorizationPolicyRecord,
  resource: IamProtectedResourceRecord,
  scopeName: string,
  requestedPurpose: string | null,
  requesterClientId: string | null,
  subjectKind: IamSubjectKind,
  subjectId: string,
): { matched: boolean; delegated_relationship_id: string | null } {
  if (policy.status !== 'ACTIVE') {
    return { matched: false, delegated_relationship_id: null };
  }
  if (policy.kind === 'ANY') {
    return { matched: true, delegated_relationship_id: null };
  }
  if (policy.kind === 'CLIENT') {
    return {
      matched: requesterClientId ? policy.principal_client_ids.includes(requesterClientId) : false,
      delegated_relationship_id: null,
    };
  }
  if (policy.kind === 'OWNER') {
    if (subjectKind === 'USER' && resource.owner_user_ids.includes(subjectId)) {
      return { matched: true, delegated_relationship_id: null };
    }
    const delegatedRelationshipId = matchDelegatedRelationshipPolicy(policy, resource, scopeName, requestedPurpose, subjectKind, subjectId);
    return {
      matched: delegatedRelationshipId !== null,
      delegated_relationship_id: delegatedRelationshipId,
    };
  }
  if (subjectKind !== 'USER') {
    return { matched: false, delegated_relationship_id: null };
  }
  const user = LocalIamFoundationStore.getUserById(subjectId);
  switch (policy.kind) {
    case 'USER':
      if (policy.principal_user_ids.includes(user.id)) {
        return { matched: true, delegated_relationship_id: null };
      }
      break;
    case 'GROUP':
      return {
        matched: intersects(policy.principal_group_ids, user.group_ids),
        delegated_relationship_id: null,
      };
    case 'ROLE':
      return {
        matched: intersects(policy.principal_role_ids, user.role_ids),
        delegated_relationship_id: null,
      };
    default:
      return { matched: false, delegated_relationship_id: null };
  }

  const delegatedRelationshipId = matchDelegatedRelationshipPolicy(policy, resource, scopeName, requestedPurpose, subjectKind, subjectId);
  return {
    matched: delegatedRelationshipId !== null,
    delegated_relationship_id: delegatedRelationshipId,
  };
}

function evaluatePermissionGrant(
  permission: IamAuthorizationPermissionRecord,
  resource: IamProtectedResourceRecord,
  scopeName: string,
  requestedPurpose: string | null,
  requesterClientId: string | null,
  subjectKind: IamSubjectKind,
  subjectId: string,
): { matched: boolean; matchedPolicyIds: string[]; delegatedRelationshipIds: string[] } {
  if (!resourceAllowsRequestedPurpose(resource, requestedPurpose)) {
    return { matched: false, matchedPolicyIds: [], delegatedRelationshipIds: [] };
  }
  const policies = permission.policy_ids.map(assertPolicy).filter((policy) => policy.status === 'ACTIVE');
  if (policies.length === 0) {
    return { matched: false, matchedPolicyIds: [], delegatedRelationshipIds: [] };
  }
  const policyMatches = policies.map((policy) => ({
    policy,
    result: matchPolicy(policy, resource, scopeName, requestedPurpose, requesterClientId, subjectKind, subjectId),
  }));
  const matchedPolicyIds = policyMatches
    .filter(({ result }) => result.matched)
    .map(({ policy }) => policy.id);
  const delegatedRelationshipIds = policyMatches
    .filter(({ result }) => result.matched && result.delegated_relationship_id !== null)
    .map(({ result }) => result.delegated_relationship_id as string);
  if (permission.decision_strategy === 'UNANIMOUS') {
    return {
      matched: matchedPolicyIds.length === policies.length,
      matchedPolicyIds,
      delegatedRelationshipIds,
    };
  }
  return {
    matched: matchedPolicyIds.length > 0,
    matchedPolicyIds,
    delegatedRelationshipIds,
  };
}

function ensureSeedData(): void {
  const hasTrainingSeed = state.resource_servers.some((record) => record.id === 'authz-rs-training-demo');
  const hasEducationSeed = state.resource_servers.some((record) => record.id === 'authz-rs-education-demo');
  if (
    hasTrainingSeed
    && hasEducationSeed
  ) {
    cleanupExpiredPermissionTickets();
    return;
  }

  const realmId = 'realm-training-validation';
  const client = validateRealmClient(realmId, 'training-portal-demo');
  const actorUserId = 'idp-super-admin';
  const createdAt = nowIso();

  const resourceServer: IamResourceServerRecord = {
    id: 'authz-rs-training-demo',
    realm_id: realmId,
    client_id: client.client_id,
    client_record_id: client.id,
    name: 'Training Demo Resource Server',
    summary: 'Seeded standalone authorization-services resource server for the training validation realm.',
    status: 'ACTIVE',
    enforcement_mode: 'ENFORCING',
    decision_strategy: 'AFFIRMATIVE',
    created_at: createdAt,
    updated_at: createdAt,
    created_by_user_id: actorUserId,
    updated_by_user_id: actorUserId,
  };

  const scopes: IamProtectedScopeRecord[] = [
    {
      id: 'authz-scope-course-read',
      realm_id: realmId,
      resource_server_id: resourceServer.id,
      name: 'course.read',
      summary: 'Read access to training course resources.',
      status: 'ACTIVE',
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    },
    {
      id: 'authz-scope-course-manage',
      realm_id: realmId,
      resource_server_id: resourceServer.id,
      name: 'course.manage',
      summary: 'Manage access to training course resources.',
      status: 'ACTIVE',
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    },
    {
      id: 'authz-scope-cohort-manage',
      realm_id: realmId,
      resource_server_id: resourceServer.id,
      name: 'cohort.manage',
      summary: 'Manage access to training cohort resources.',
      status: 'ACTIVE',
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    },
  ];

  const resources: IamProtectedResourceRecord[] = [
    {
      id: 'authz-resource-course-library',
      realm_id: realmId,
      resource_server_id: resourceServer.id,
      name: 'Course Library',
      summary: 'Learner-facing training course catalog and content library.',
      uri: '/training/courses',
      type_label: 'TRAINING_LIBRARY',
      status: 'ACTIVE',
      owner_user_ids: ['iam-user-training-instructor'],
      scope_ids: ['authz-scope-course-read', 'authz-scope-course-manage'],
      attributes: {
        segment: ['training'],
        pack: ['training_foundations'],
      },
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    },
    {
      id: 'authz-resource-training-cohorts',
      realm_id: realmId,
      resource_server_id: resourceServer.id,
      name: 'Training Cohorts',
      summary: 'Instructor-facing cohort administration resources.',
      uri: '/training/admin/cohorts',
      type_label: 'TRAINING_ADMIN',
      status: 'ACTIVE',
      owner_user_ids: ['iam-user-training-instructor'],
      scope_ids: ['authz-scope-cohort-manage'],
      attributes: {
        segment: ['training'],
        audience: ['instructors'],
      },
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    },
  ];

  const policies: IamAuthorizationPolicyRecord[] = [
    {
      id: 'authz-policy-training-learners',
      realm_id: realmId,
      resource_server_id: resourceServer.id,
      name: 'Training Learners',
      summary: 'Role-based access for training learners.',
      kind: 'ROLE',
      status: 'ACTIVE',
      principal_user_ids: [],
      principal_group_ids: [],
      principal_role_ids: ['role-training-learner'],
      principal_client_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    },
    {
      id: 'authz-policy-training-instructors',
      realm_id: realmId,
      resource_server_id: resourceServer.id,
      name: 'Training Instructors',
      summary: 'Role-based access for training instructors.',
      kind: 'ROLE',
      status: 'ACTIVE',
      principal_user_ids: [],
      principal_group_ids: [],
      principal_role_ids: ['role-training-instructor'],
      principal_client_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    },
  ];

  const permissions: IamAuthorizationPermissionRecord[] = [
    {
      id: 'authz-permission-course-read',
      realm_id: realmId,
      resource_server_id: resourceServer.id,
      name: 'Course Library Read',
      summary: 'Allows learners and instructors to read course-library resources.',
      status: 'ACTIVE',
      resource_ids: ['authz-resource-course-library'],
      scope_ids: ['authz-scope-course-read'],
      policy_ids: ['authz-policy-training-learners', 'authz-policy-training-instructors'],
      decision_strategy: 'AFFIRMATIVE',
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    },
    {
      id: 'authz-permission-course-manage',
      realm_id: realmId,
      resource_server_id: resourceServer.id,
      name: 'Course Library Manage',
      summary: 'Allows instructors to manage course-library resources.',
      status: 'ACTIVE',
      resource_ids: ['authz-resource-course-library'],
      scope_ids: ['authz-scope-course-manage'],
      policy_ids: ['authz-policy-training-instructors'],
      decision_strategy: 'AFFIRMATIVE',
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    },
    {
      id: 'authz-permission-cohort-manage',
      realm_id: realmId,
      resource_server_id: resourceServer.id,
      name: 'Training Cohorts Manage',
      summary: 'Allows instructors to manage cohort resources.',
      status: 'ACTIVE',
      resource_ids: ['authz-resource-training-cohorts'],
      scope_ids: ['authz-scope-cohort-manage'],
      policy_ids: ['authz-policy-training-instructors'],
      decision_strategy: 'AFFIRMATIVE',
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    },
  ];

  const educationRealmId = 'realm-education-validation';
  const educationClient = validateRealmClient(educationRealmId, 'training-portal-demo');
  const educationResourceServer: IamResourceServerRecord = {
    id: 'authz-rs-education-demo',
    realm_id: educationRealmId,
    client_id: educationClient.client_id,
    client_record_id: educationClient.id,
    name: 'Education Demo Resource Server',
    summary: 'Seeded standalone authorization-services resource server for education delegation and privacy validation.',
    status: 'ACTIVE',
    enforcement_mode: 'ENFORCING',
    decision_strategy: 'AFFIRMATIVE',
    created_at: createdAt,
    updated_at: createdAt,
    created_by_user_id: actorUserId,
    updated_by_user_id: actorUserId,
  };

  const educationScopes: IamProtectedScopeRecord[] = [
    {
      id: 'authz-scope-education-profile-read',
      realm_id: educationRealmId,
      resource_server_id: educationResourceServer.id,
      name: 'profile.read',
      summary: 'Read access to education profile resources.',
      status: 'ACTIVE',
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    },
    {
      id: 'authz-scope-education-profile-manage',
      realm_id: educationRealmId,
      resource_server_id: educationResourceServer.id,
      name: 'profile.manage',
      summary: 'Manage access to education profile resources.',
      status: 'ACTIVE',
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    },
    {
      id: 'authz-scope-education-admin-read',
      realm_id: educationRealmId,
      resource_server_id: educationResourceServer.id,
      name: 'admin.read',
      summary: 'Read access to education administration resources.',
      status: 'ACTIVE',
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    },
  ];

  const educationResources: IamProtectedResourceRecord[] = [
    {
      id: 'authz-resource-education-learner-profile',
      realm_id: educationRealmId,
      resource_server_id: educationResourceServer.id,
      name: 'Learner Profile Workspace',
      summary: 'Protected learner profile workspace for guardian-delegation validation.',
      uri: '/education/profile',
      type_label: 'EDUCATION_PROFILE',
      status: 'ACTIVE',
      owner_user_ids: ['iam-user-education-learner'],
      scope_ids: ['authz-scope-education-profile-read', 'authz-scope-education-profile-manage'],
      attributes: {
        segment: ['education'],
        allowed_purposes: ['education_support'],
      },
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    },
    {
      id: 'authz-resource-education-admin-workspace',
      realm_id: educationRealmId,
      resource_server_id: educationResourceServer.id,
      name: 'Education Administration Workspace',
      summary: 'Protected education administration workspace for authorized-proxy validation.',
      uri: '/education/admin',
      type_label: 'EDUCATION_ADMIN',
      status: 'ACTIVE',
      owner_user_ids: ['iam-user-education-instructor'],
      scope_ids: ['authz-scope-education-admin-read'],
      attributes: {
        segment: ['education'],
        allowed_purposes: ['administration'],
      },
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    },
  ];

  const educationPolicies: IamAuthorizationPolicyRecord[] = [
    {
      id: 'authz-policy-education-profile-owner',
      realm_id: educationRealmId,
      resource_server_id: educationResourceServer.id,
      name: 'Education Profile Owner',
      summary: 'Owner-based access for learner profile resources.',
      kind: 'OWNER',
      status: 'ACTIVE',
      principal_user_ids: [],
      principal_group_ids: [],
      principal_role_ids: [],
      principal_client_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    },
    {
      id: 'authz-policy-education-admin-owner',
      realm_id: educationRealmId,
      resource_server_id: educationResourceServer.id,
      name: 'Education Admin Owner',
      summary: 'Owner-based access for protected education admin resources.',
      kind: 'OWNER',
      status: 'ACTIVE',
      principal_user_ids: [],
      principal_group_ids: [],
      principal_role_ids: [],
      principal_client_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    },
  ];

  const educationPermissions: IamAuthorizationPermissionRecord[] = [
    {
      id: 'authz-permission-education-profile-read',
      realm_id: educationRealmId,
      resource_server_id: educationResourceServer.id,
      name: 'Education Profile Read',
      summary: 'Allows learners and consented guardians to read learner profile resources.',
      status: 'ACTIVE',
      resource_ids: ['authz-resource-education-learner-profile'],
      scope_ids: ['authz-scope-education-profile-read'],
      policy_ids: ['authz-policy-education-profile-owner'],
      decision_strategy: 'AFFIRMATIVE',
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    },
    {
      id: 'authz-permission-education-profile-manage',
      realm_id: educationRealmId,
      resource_server_id: educationResourceServer.id,
      name: 'Education Profile Manage',
      summary: 'Allows learners to manage learner profile resources and denies guardian elevation without explicit consent.',
      status: 'ACTIVE',
      resource_ids: ['authz-resource-education-learner-profile'],
      scope_ids: ['authz-scope-education-profile-manage'],
      policy_ids: ['authz-policy-education-profile-owner'],
      decision_strategy: 'AFFIRMATIVE',
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    },
    {
      id: 'authz-permission-education-admin-read',
      realm_id: educationRealmId,
      resource_server_id: educationResourceServer.id,
      name: 'Education Admin Read',
      summary: 'Allows owners and authorized proxies to read protected education administration resources.',
      status: 'ACTIVE',
      resource_ids: ['authz-resource-education-admin-workspace'],
      scope_ids: ['authz-scope-education-admin-read'],
      policy_ids: ['authz-policy-education-admin-owner'],
      decision_strategy: 'AFFIRMATIVE',
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    },
  ];

  if (!hasTrainingSeed) {
    state.resource_servers.push(resourceServer);
    state.scopes.push(...scopes);
    state.resources.push(...resources);
    state.policies.push(...policies);
    state.permissions.push(...permissions);
  }
  if (!hasEducationSeed) {
    state.resource_servers.push(educationResourceServer);
    state.scopes.push(...educationScopes);
    state.resources.push(...educationResources);
    state.policies.push(...educationPolicies);
    state.permissions.push(...educationPermissions);
  }
  persistStateSyncOnly();
  cleanupExpiredPermissionTickets();
}

function recordEvaluation(
  realmId: string,
  resourceServerId: string,
  requesterClientId: string | null,
  subjectKind: IamSubjectKind,
  subjectId: string,
  resourceId: string,
  requestedPurpose: string | null,
  requestedScopeNames: string[],
  grantedScopeNames: string[],
  allowed: boolean,
  reason: string,
  matchedPolicyIds: string[],
  matchedPermissionIds: string[],
): IamAuthorizationEvaluationRecord {
  const record: IamAuthorizationEvaluationRecord = {
    id: nextId('iam-authz-eval'),
    realm_id: realmId,
    resource_server_id: resourceServerId,
    requester_client_id: requesterClientId,
    subject_kind: subjectKind,
    subject_id: subjectId,
    resource_id: resourceId,
    requested_purpose: requestedPurpose,
    requested_scope_names: [...requestedScopeNames],
    granted_scope_names: [...grantedScopeNames],
    allowed,
    reason,
    matched_policy_ids: [...matchedPolicyIds],
    matched_permission_ids: [...matchedPermissionIds],
    created_at: nowIso(),
  };
  state.evaluations.unshift(record);
  state.evaluations.splice(500, state.evaluations.length);
  persistStateSyncOnly();
  return clone(record);
}

export const LocalIamAuthorizationServicesStore = {
  getSummary(): IamAuthorizationServicesSummary {
    ensureSeedData();
    cleanupExpiredPermissionTickets();
    return {
      resource_server_count: state.resource_servers.length,
      protected_scope_count: state.scopes.length,
      protected_resource_count: state.resources.length,
      authorization_policy_count: state.policies.length,
      authorization_permission_count: state.permissions.length,
      authorization_evaluation_count: state.evaluations.length,
      permission_ticket_count: state.permission_tickets.length,
      active_permission_ticket_count: state.permission_tickets.filter((ticket) => ticket.status === 'GRANTED').length,
    };
  },

  runTransientStateMaintenance(): IamAuthorizationServicesTransientStateMaintenanceResult {
    ensureSeedData();
    const expiredPermissionTicketCount = cleanupExpiredPermissionTickets();
    return {
      expired_permission_ticket_count: expiredPermissionTicketCount,
      total_mutated_count: expiredPermissionTicketCount,
    };
  },

  async runTransientStateMaintenanceAsync(): Promise<IamAuthorizationServicesTransientStateMaintenanceResult> {
    return runWithDeferredPersistence(() => this.runTransientStateMaintenance());
  },

  listResourceServers(filters?: {
    realm_id?: string | null;
  }): IamResourceServersResponse {
    ensureSeedData();
    let resourceServers = [...state.resource_servers];
    if (filters?.realm_id) {
      resourceServers = resourceServers.filter((record) => record.realm_id === filters.realm_id);
    }
    return {
      generated_at: nowIso(),
      resource_servers: clone(resourceServers),
      count: resourceServers.length,
    };
  },

  createResourceServer(actorUserId: string, input: CreateIamResourceServerRequest): IamResourceServerRecord {
    ensureSeedData();
    LocalIamFoundationStore.getRealm(input.realm_id);
    const client = validateRealmClient(input.realm_id, input.client_id);
    if (state.resource_servers.some((record) => record.realm_id === input.realm_id && record.client_id === client.client_id)) {
      throw new Error(`IAM resource server already exists for client ${client.client_id}`);
    }
    const createdAt = nowIso();
    const record: IamResourceServerRecord = {
      id: nextId('iam-authz-rs'),
      realm_id: input.realm_id,
      client_id: client.client_id,
      client_record_id: client.id,
      name: input.name.trim(),
      summary: input.summary.trim(),
      status: input.status ?? 'ACTIVE',
      enforcement_mode: input.enforcement_mode ?? 'ENFORCING',
      decision_strategy: input.decision_strategy ?? 'AFFIRMATIVE',
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    };
    state.resource_servers.push(record);
    persistStateSyncOnly();
    return clone(record);
  },

  async createResourceServerAsync(
    actorUserId: string,
    input: CreateIamResourceServerRequest,
  ): Promise<IamResourceServerRecord> {
    return runWithDeferredPersistence(() => this.createResourceServer(actorUserId, input));
  },

  updateResourceServer(actorUserId: string, resourceServerId: string, input: UpdateIamResourceServerRequest): IamResourceServerRecord {
    ensureSeedData();
    const record = assertResourceServer(resourceServerId);
    if (input.name !== undefined) {
      record.name = input.name.trim();
    }
    if (input.summary !== undefined) {
      record.summary = input.summary.trim();
    }
    if (input.status) {
      record.status = input.status;
    }
    if (input.enforcement_mode) {
      record.enforcement_mode = input.enforcement_mode;
    }
    if (input.decision_strategy) {
      record.decision_strategy = input.decision_strategy;
    }
    record.updated_at = nowIso();
    record.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return clone(record);
  },

  async updateResourceServerAsync(
    actorUserId: string,
    resourceServerId: string,
    input: UpdateIamResourceServerRequest,
  ): Promise<IamResourceServerRecord> {
    return runWithDeferredPersistence(() => this.updateResourceServer(actorUserId, resourceServerId, input));
  },

  listScopes(filters?: {
    realm_id?: string | null;
    resource_server_id?: string | null;
  }): IamProtectedScopesResponse {
    ensureSeedData();
    let scopes = [...state.scopes];
    if (filters?.realm_id) {
      scopes = scopes.filter((record) => record.realm_id === filters.realm_id);
    }
    if (filters?.resource_server_id) {
      scopes = scopes.filter((record) => record.resource_server_id === filters.resource_server_id);
    }
    return {
      generated_at: nowIso(),
      scopes: clone(scopes),
      count: scopes.length,
    };
  },

  createScope(actorUserId: string, input: CreateIamProtectedScopeRequest): IamProtectedScopeRecord {
    ensureSeedData();
    validateResourceServerAssociations(input.realm_id, input.resource_server_id, {});
    const createdAt = nowIso();
    const record: IamProtectedScopeRecord = {
      id: nextId('iam-authz-scope'),
      realm_id: input.realm_id,
      resource_server_id: input.resource_server_id,
      name: input.name.trim(),
      summary: input.summary.trim(),
      status: input.status ?? 'ACTIVE',
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    };
    state.scopes.push(record);
    persistStateSyncOnly();
    return clone(record);
  },

  async createScopeAsync(
    actorUserId: string,
    input: CreateIamProtectedScopeRequest,
  ): Promise<IamProtectedScopeRecord> {
    return runWithDeferredPersistence(() => this.createScope(actorUserId, input));
  },

  updateScope(actorUserId: string, scopeId: string, input: UpdateIamProtectedScopeRequest): IamProtectedScopeRecord {
    ensureSeedData();
    const record = assertScope(scopeId);
    if (input.name !== undefined) {
      record.name = input.name.trim();
    }
    if (input.summary !== undefined) {
      record.summary = input.summary.trim();
    }
    if (input.status) {
      record.status = input.status;
    }
    record.updated_at = nowIso();
    record.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return clone(record);
  },

  async updateScopeAsync(
    actorUserId: string,
    scopeId: string,
    input: UpdateIamProtectedScopeRequest,
  ): Promise<IamProtectedScopeRecord> {
    return runWithDeferredPersistence(() => this.updateScope(actorUserId, scopeId, input));
  },

  listResources(filters?: {
    realm_id?: string | null;
    resource_server_id?: string | null;
  }): IamProtectedResourcesResponse {
    ensureSeedData();
    let resources = [...state.resources];
    if (filters?.realm_id) {
      resources = resources.filter((record) => record.realm_id === filters.realm_id);
    }
    if (filters?.resource_server_id) {
      resources = resources.filter((record) => record.resource_server_id === filters.resource_server_id);
    }
    return {
      generated_at: nowIso(),
      resources: clone(resources),
      count: resources.length,
    };
  },

  createResource(actorUserId: string, input: CreateIamProtectedResourceRequest): IamProtectedResourceRecord {
    ensureSeedData();
    validateResourceServerAssociations(input.realm_id, input.resource_server_id, {
      scope_ids: input.scope_ids,
    });
    validateRealmUsers(input.realm_id, unique(input.owner_user_ids));
    const createdAt = nowIso();
    const record: IamProtectedResourceRecord = {
      id: nextId('iam-authz-resource'),
      realm_id: input.realm_id,
      resource_server_id: input.resource_server_id,
      name: input.name.trim(),
      summary: input.summary.trim(),
      uri: input.uri?.trim() || null,
      type_label: input.type_label?.trim() || null,
      status: input.status ?? 'ACTIVE',
      owner_user_ids: unique(input.owner_user_ids),
      scope_ids: unique(input.scope_ids),
      attributes: Object.fromEntries(
        Object.entries(input.attributes ?? {}).map(([key, values]) => [key, unique(values)]),
      ),
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    };
    state.resources.push(record);
    persistStateSyncOnly();
    return clone(record);
  },

  async createResourceAsync(
    actorUserId: string,
    input: CreateIamProtectedResourceRequest,
  ): Promise<IamProtectedResourceRecord> {
    return runWithDeferredPersistence(() => this.createResource(actorUserId, input));
  },

  updateResource(actorUserId: string, resourceId: string, input: UpdateIamProtectedResourceRequest): IamProtectedResourceRecord {
    ensureSeedData();
    const record = assertResource(resourceId);
    if (input.scope_ids) {
      validateResourceServerAssociations(record.realm_id, record.resource_server_id, {
        scope_ids: input.scope_ids,
      });
    }
    if (input.owner_user_ids) {
      validateRealmUsers(record.realm_id, unique(input.owner_user_ids));
    }
    if (input.name !== undefined) {
      record.name = input.name.trim();
    }
    if (input.summary !== undefined) {
      record.summary = input.summary.trim();
    }
    if (input.uri !== undefined) {
      record.uri = input.uri?.trim() || null;
    }
    if (input.type_label !== undefined) {
      record.type_label = input.type_label?.trim() || null;
    }
    if (input.status) {
      record.status = input.status;
    }
    if (input.owner_user_ids) {
      record.owner_user_ids = unique(input.owner_user_ids);
    }
    if (input.scope_ids) {
      record.scope_ids = unique(input.scope_ids);
    }
    if (input.attributes) {
      record.attributes = Object.fromEntries(
        Object.entries(input.attributes).map(([key, values]) => [key, unique(values)]),
      );
    }
    record.updated_at = nowIso();
    record.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return clone(record);
  },

  async updateResourceAsync(
    actorUserId: string,
    resourceId: string,
    input: UpdateIamProtectedResourceRequest,
  ): Promise<IamProtectedResourceRecord> {
    return runWithDeferredPersistence(() => this.updateResource(actorUserId, resourceId, input));
  },

  listPolicies(filters?: {
    realm_id?: string | null;
    resource_server_id?: string | null;
  }): IamAuthorizationPoliciesResponse {
    ensureSeedData();
    let policies = [...state.policies];
    if (filters?.realm_id) {
      policies = policies.filter((record) => record.realm_id === filters.realm_id);
    }
    if (filters?.resource_server_id) {
      policies = policies.filter((record) => record.resource_server_id === filters.resource_server_id);
    }
    return {
      generated_at: nowIso(),
      policies: clone(policies),
      count: policies.length,
    };
  },

  createPolicy(actorUserId: string, input: CreateIamAuthorizationPolicyRequest): IamAuthorizationPolicyRecord {
    ensureSeedData();
    validateResourceServerAssociations(input.realm_id, input.resource_server_id, {});
    validateRealmUsers(input.realm_id, unique(input.principal_user_ids));
    validateRealmGroups(input.realm_id, unique(input.principal_group_ids));
    validateRealmRoles(input.realm_id, unique(input.principal_role_ids));
    unique(input.principal_client_ids).forEach((clientId) => {
      validateRealmClient(input.realm_id, clientId);
    });
    const createdAt = nowIso();
    const record: IamAuthorizationPolicyRecord = {
      id: nextId('iam-authz-policy'),
      realm_id: input.realm_id,
      resource_server_id: input.resource_server_id,
      name: input.name.trim(),
      summary: input.summary.trim(),
      kind: input.kind,
      status: input.status ?? 'ACTIVE',
      principal_user_ids: unique(input.principal_user_ids),
      principal_group_ids: unique(input.principal_group_ids),
      principal_role_ids: unique(input.principal_role_ids),
      principal_client_ids: unique(input.principal_client_ids),
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
    input: CreateIamAuthorizationPolicyRequest,
  ): Promise<IamAuthorizationPolicyRecord> {
    return runWithDeferredPersistence(() => this.createPolicy(actorUserId, input));
  },

  updatePolicy(actorUserId: string, policyId: string, input: UpdateIamAuthorizationPolicyRequest): IamAuthorizationPolicyRecord {
    ensureSeedData();
    const record = assertPolicy(policyId);
    if (input.principal_user_ids) {
      validateRealmUsers(record.realm_id, unique(input.principal_user_ids));
    }
    if (input.principal_group_ids) {
      validateRealmGroups(record.realm_id, unique(input.principal_group_ids));
    }
    if (input.principal_role_ids) {
      validateRealmRoles(record.realm_id, unique(input.principal_role_ids));
    }
    if (input.principal_client_ids) {
      unique(input.principal_client_ids).forEach((clientId) => {
        validateRealmClient(record.realm_id, clientId);
      });
    }
    if (input.name !== undefined) {
      record.name = input.name.trim();
    }
    if (input.summary !== undefined) {
      record.summary = input.summary.trim();
    }
    if (input.status) {
      record.status = input.status;
    }
    if (input.principal_user_ids) {
      record.principal_user_ids = unique(input.principal_user_ids);
    }
    if (input.principal_group_ids) {
      record.principal_group_ids = unique(input.principal_group_ids);
    }
    if (input.principal_role_ids) {
      record.principal_role_ids = unique(input.principal_role_ids);
    }
    if (input.principal_client_ids) {
      record.principal_client_ids = unique(input.principal_client_ids);
    }
    record.updated_at = nowIso();
    record.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return clone(record);
  },

  async updatePolicyAsync(
    actorUserId: string,
    policyId: string,
    input: UpdateIamAuthorizationPolicyRequest,
  ): Promise<IamAuthorizationPolicyRecord> {
    return runWithDeferredPersistence(() => this.updatePolicy(actorUserId, policyId, input));
  },

  listPermissions(filters?: {
    realm_id?: string | null;
    resource_server_id?: string | null;
  }): IamAuthorizationPermissionsResponse {
    ensureSeedData();
    let permissions = [...state.permissions];
    if (filters?.realm_id) {
      permissions = permissions.filter((record) => record.realm_id === filters.realm_id);
    }
    if (filters?.resource_server_id) {
      permissions = permissions.filter((record) => record.resource_server_id === filters.resource_server_id);
    }
    return {
      generated_at: nowIso(),
      permissions: clone(permissions),
      count: permissions.length,
    };
  },

  createPermission(actorUserId: string, input: CreateIamAuthorizationPermissionRequest): IamAuthorizationPermissionRecord {
    ensureSeedData();
    validateResourceServerAssociations(input.realm_id, input.resource_server_id, {
      resource_ids: input.resource_ids,
      scope_ids: input.scope_ids,
      policy_ids: input.policy_ids,
    });
    const createdAt = nowIso();
    const record: IamAuthorizationPermissionRecord = {
      id: nextId('iam-authz-permission'),
      realm_id: input.realm_id,
      resource_server_id: input.resource_server_id,
      name: input.name.trim(),
      summary: input.summary.trim(),
      status: input.status ?? 'ACTIVE',
      resource_ids: unique(input.resource_ids),
      scope_ids: unique(input.scope_ids),
      policy_ids: unique(input.policy_ids),
      decision_strategy: input.decision_strategy ?? 'AFFIRMATIVE',
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
    input: CreateIamAuthorizationPermissionRequest,
  ): Promise<IamAuthorizationPermissionRecord> {
    return runWithDeferredPersistence(() => this.createPermission(actorUserId, input));
  },

  updatePermission(actorUserId: string, permissionId: string, input: UpdateIamAuthorizationPermissionRequest): IamAuthorizationPermissionRecord {
    ensureSeedData();
    const record = assertPermission(permissionId);
    validateResourceServerAssociations(record.realm_id, record.resource_server_id, {
      resource_ids: input.resource_ids ?? record.resource_ids,
      scope_ids: input.scope_ids ?? record.scope_ids,
      policy_ids: input.policy_ids ?? record.policy_ids,
    });
    if (input.name !== undefined) {
      record.name = input.name.trim();
    }
    if (input.summary !== undefined) {
      record.summary = input.summary.trim();
    }
    if (input.status) {
      record.status = input.status;
    }
    if (input.resource_ids) {
      record.resource_ids = unique(input.resource_ids);
    }
    if (input.scope_ids) {
      record.scope_ids = unique(input.scope_ids);
    }
    if (input.policy_ids) {
      record.policy_ids = unique(input.policy_ids);
    }
    if (input.decision_strategy) {
      record.decision_strategy = input.decision_strategy;
    }
    record.updated_at = nowIso();
    record.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return clone(record);
  },

  async updatePermissionAsync(
    actorUserId: string,
    permissionId: string,
    input: UpdateIamAuthorizationPermissionRequest,
  ): Promise<IamAuthorizationPermissionRecord> {
    return runWithDeferredPersistence(() => this.updatePermission(actorUserId, permissionId, input));
  },

  evaluate(input: EvaluateIamAuthorizationRequest): IamAuthorizationEvaluationResponse {
    ensureSeedData();
    const resourceServer = assertResourceServer(input.resource_server_id);
    if (resourceServer.realm_id !== input.realm_id) {
      throw new Error(`IAM resource server ${input.resource_server_id} does not belong to realm ${input.realm_id}`);
    }
    const resource = assertResource(input.resource_id);
    if (resource.realm_id !== input.realm_id || resource.resource_server_id !== input.resource_server_id) {
      throw new Error(`IAM protected resource ${input.resource_id} does not belong to resource server ${input.resource_server_id}`);
    }
    const requestedScopeNames = parseScopeNames(input.requested_scope_names);
    const requestedPurpose = parsePurposeName(input.requested_purpose);
    const requestedScopes = requestedScopeNames.map((scopeName) => {
      const scope = state.scopes.find(
        (candidate) =>
          candidate.realm_id === input.realm_id
          && candidate.resource_server_id === input.resource_server_id
          && candidate.name === scopeName,
      );
      if (!scope) {
        throw new Error(`Unknown IAM protected scope: ${scopeName}`);
      }
      return scope;
    });

    const grantedScopeNames: string[] = [];
    const matchedPolicyIds = new Set<string>();
    const matchedPermissionIds = new Set<string>();
    const delegatedRelationshipIds = new Set<string>();

    for (const scope of requestedScopes) {
      const candidatePermissions = state.permissions.filter(
        (permission) =>
          permission.realm_id === input.realm_id
          && permission.resource_server_id === input.resource_server_id
          && permission.status === 'ACTIVE'
          && permission.resource_ids.includes(resource.id)
          && permission.scope_ids.includes(scope.id),
      );
      const matchingPermission = candidatePermissions.find((permission) => {
        const result = evaluatePermissionGrant(
          permission,
          resource,
          scope.name,
          requestedPurpose,
          input.requester_client_id?.trim() || null,
          input.subject_kind,
          input.subject_id,
        );
        if (!result.matched) {
          return false;
        }
        result.matchedPolicyIds.forEach((policyId) => matchedPolicyIds.add(policyId));
        result.delegatedRelationshipIds.forEach((relationshipId) => delegatedRelationshipIds.add(relationshipId));
        matchedPermissionIds.add(permission.id);
        return true;
      });
      if (matchingPermission) {
        grantedScopeNames.push(scope.name);
      }
    }

    const allowed = grantedScopeNames.length === requestedScopeNames.length;
    const evaluation = recordEvaluation(
      input.realm_id,
      input.resource_server_id,
      input.requester_client_id?.trim() || null,
      input.subject_kind,
      input.subject_id,
      resource.id,
      requestedPurpose,
      requestedScopeNames,
      grantedScopeNames,
      allowed,
      allowed
        ? `Authorization services granted ${grantedScopeNames.join(', ')} on ${resource.name}${requestedPurpose ? ` for purpose ${requestedPurpose}` : ''}${delegatedRelationshipIds.size > 0 ? ' via delegated relationship context.' : '.'}`
        : `Authorization services denied one or more scopes for ${resource.name}${requestedPurpose ? ` for purpose ${requestedPurpose}` : ''}.`,
      Array.from(matchedPolicyIds),
      Array.from(matchedPermissionIds),
    );

    return {
      realm_id: input.realm_id,
      resource_server_id: input.resource_server_id,
      subject_kind: input.subject_kind,
      subject_id: input.subject_id,
      requester_client_id: input.requester_client_id?.trim() || null,
      resource_id: resource.id,
      requested_purpose: requestedPurpose,
      requested_scope_names: requestedScopeNames,
      granted_scope_names: grantedScopeNames,
      allowed,
      reason: evaluation.reason,
      matched_policy_ids: evaluation.matched_policy_ids,
      matched_permission_ids: evaluation.matched_permission_ids,
      evaluation,
    };
  },

  listEvaluations(filters?: {
    realm_id?: string | null;
    resource_server_id?: string | null;
  }): IamAuthorizationEvaluationsResponse {
    ensureSeedData();
    let evaluations = [...state.evaluations];
    if (filters?.realm_id) {
      evaluations = evaluations.filter((record) => record.realm_id === filters.realm_id);
    }
    if (filters?.resource_server_id) {
      evaluations = evaluations.filter((record) => record.resource_server_id === filters.resource_server_id);
    }
    return {
      generated_at: nowIso(),
      evaluations: clone(evaluations),
      count: evaluations.length,
    };
  },

  listPermissionTickets(filters?: {
    realm_id?: string | null;
    resource_server_id?: string | null;
  }): IamPermissionTicketsResponse {
    ensureSeedData();
    cleanupExpiredPermissionTickets();
    let tickets = [...state.permission_tickets];
    if (filters?.realm_id) {
      tickets = tickets.filter((record) => record.realm_id === filters.realm_id);
    }
    if (filters?.resource_server_id) {
      tickets = tickets.filter((record) => record.resource_server_id === filters.resource_server_id);
    }
    return {
      generated_at: nowIso(),
      permission_tickets: clone(tickets),
      count: tickets.length,
    };
  },

  createPermissionTicket(
    realmId: string,
    payload: Record<string, unknown>,
    authorizationHeader: string | null,
  ): IamPermissionTicketResponse {
    ensureSeedData();
    cleanupExpiredPermissionTickets();
    const authenticatedClient = LocalIamProtocolRuntimeStore.resolveAuthenticatedClient(realmId, payload, authorizationHeader);
    const resourceServerClientId = typeof payload.resource_server_client_id === 'string'
      ? payload.resource_server_client_id.trim()
      : authenticatedClient.client_id;
    if (authenticatedClient.client_id !== resourceServerClientId) {
      throw new Error('Authenticated client does not match resource server client');
    }
    const resourceServer = state.resource_servers.find(
      (record) => record.realm_id === realmId && record.client_id === resourceServerClientId && record.status === 'ACTIVE',
    );
    if (!resourceServer) {
      throw new Error(`Unknown IAM resource server for client ${resourceServerClientId}`);
    }
    const subjectToken = typeof payload.subject_token === 'string' ? payload.subject_token.trim() : '';
    if (!subjectToken) {
      throw new Error('subject_token is required');
    }
    const resolvedToken = LocalIamProtocolRuntimeStore.resolveIssuedTokenForValue(realmId, subjectToken) as IamResolvedIssuedTokenRecord;
    if (resolvedToken.token_use !== 'access_token' || resolvedToken.status !== 'ACTIVE') {
      throw new Error('subject_token must be an active access token');
    }
    const evaluation = this.evaluate({
      realm_id: realmId,
      resource_server_id: resourceServer.id,
      subject_kind: resolvedToken.subject_kind,
      subject_id: resolvedToken.subject_id,
      requester_client_id: resolvedToken.client_id,
      resource_id: typeof payload.resource_id === 'string' ? payload.resource_id.trim() : '',
      requested_scope_names: payload.scope_names as string[] | string,
    });
    const createdAt = nowIso();
    const ticket: IamPermissionTicketRecord = {
      id: nextId('iam-permission-ticket'),
      realm_id: realmId,
      resource_server_id: resourceServer.id,
      resource_server_client_id: resourceServer.client_id,
      requester_client_id: resolvedToken.client_id,
      subject_kind: resolvedToken.subject_kind,
      subject_id: resolvedToken.subject_id,
      resource_id: evaluation.resource_id,
      requested_scope_names: [...evaluation.requested_scope_names],
      granted_scope_names: [...evaluation.granted_scope_names],
      status: evaluation.allowed ? 'GRANTED' : 'DENIED',
      reason: evaluation.reason,
      created_at: createdAt,
      expires_at: new Date(Date.now() + PERMISSION_TICKET_TTL_MS).toISOString(),
      exchanged_at: null,
      evaluation_id: evaluation.evaluation.id,
      rpt_token_id: null,
    };
    state.permission_tickets.unshift(ticket);
    state.permission_tickets.splice(500, state.permission_tickets.length);
    persistStateSyncOnly();
    const resource = assertResource(ticket.resource_id);
    return {
      ...clone(ticket),
      resource_name: resource.name,
    };
  },

  async createPermissionTicketAsync(
    realmId: string,
    payload: Record<string, unknown>,
    authorizationHeader: string | null,
  ): Promise<IamPermissionTicketResponse> {
    return runWithDeferredPersistence(() => this.createPermissionTicket(realmId, payload, authorizationHeader));
  },

  exchangePermissionTicketSyncOnly(
    realmId: string,
    payload: Record<string, unknown>,
    authorizationHeader: string | null,
    baseUrl: string,
  ): IamTokenEndpointResponse & {
    permission_ticket_id: string;
    authorization: StoredRptAuthorization;
  } {
    ensureSeedData();
    cleanupExpiredPermissionTickets();
    const authenticatedClient = LocalIamProtocolRuntimeStore.resolveAuthenticatedClient(realmId, payload, authorizationHeader);
    const ticketId = typeof payload.ticket === 'string' ? payload.ticket.trim() : '';
    if (!ticketId) {
      throw new Error('ticket is required');
    }
    const ticket = assertPermissionTicket(ticketId);
    if (ticket.realm_id !== realmId) {
      throw new Error(`IAM permission ticket ${ticketId} does not belong to realm ${realmId}`);
    }
    if (ticket.resource_server_client_id !== authenticatedClient.client_id) {
      throw new Error('Authenticated client does not match the ticket resource server');
    }
    if (ticket.status === 'EXPIRED') {
      throw new Error('Permission ticket has expired');
    }
    if (ticket.status === 'DENIED') {
      throw new Error('Permission ticket was denied');
    }
    if (ticket.status === 'EXCHANGED') {
      throw new Error('Permission ticket has already been exchanged');
    }
    const resource = assertResource(ticket.resource_id);
    const authorization: StoredRptAuthorization = {
      permissions: [
        {
          resource_id: resource.id,
          resource_name: resource.name,
          scopes: [...ticket.granted_scope_names],
        },
      ],
      resource_server_id: ticket.resource_server_id,
      resource_server_client_id: ticket.resource_server_client_id,
      permission_ticket_id: ticket.id,
    };
    const response = LocalIamProtocolRuntimeStore.issueSubjectTokensSyncOnly({
      realm_id: realmId,
      client_id: authenticatedClient.client_id,
      subject_kind: ticket.subject_kind,
      subject_id: ticket.subject_id,
      requested_scope_names: [],
      additional_scope_names: ticket.granted_scope_names,
      additional_claims: {
        authorization,
      },
      base_url: baseUrl,
      grant_type: 'urn:ietf:params:oauth:grant-type:uma-ticket',
      include_refresh_token: false,
    });
    const resolvedRpt = LocalIamProtocolRuntimeStore.resolveIssuedTokenForValue(realmId, response.access_token);
    ticket.status = 'EXCHANGED';
    ticket.exchanged_at = nowIso();
    ticket.rpt_token_id = resolvedRpt.id;
    persistStateSyncOnly();
    return {
      ...response,
      permission_ticket_id: ticket.id,
      authorization,
    };
  },

  async exchangePermissionTicketAsync(
    realmId: string,
    payload: Record<string, unknown>,
    authorizationHeader: string | null,
    baseUrl: string,
  ): Promise<IamTokenEndpointResponse & {
    permission_ticket_id: string;
    authorization: StoredRptAuthorization;
  }> {
    return runWithDeferredPersistence(async () => {
      ensureSeedData();
      cleanupExpiredPermissionTickets();
      const authenticatedClient = LocalIamProtocolRuntimeStore.resolveAuthenticatedClient(realmId, payload, authorizationHeader);
      const ticketId = typeof payload.ticket === 'string' ? payload.ticket.trim() : '';
      if (!ticketId) {
        throw new Error('ticket is required');
      }
      const ticket = assertPermissionTicket(ticketId);
      if (ticket.realm_id !== realmId) {
        throw new Error(`IAM permission ticket ${ticketId} does not belong to realm ${realmId}`);
      }
      if (ticket.resource_server_client_id !== authenticatedClient.client_id) {
        throw new Error('Authenticated client does not match the ticket resource server');
      }
      if (ticket.status === 'EXPIRED') {
        throw new Error('Permission ticket has expired');
      }
      if (ticket.status === 'DENIED') {
        throw new Error('Permission ticket was denied');
      }
      if (ticket.status === 'EXCHANGED') {
        throw new Error('Permission ticket has already been exchanged');
      }
      const resource = assertResource(ticket.resource_id);
      const authorization: StoredRptAuthorization = {
        permissions: [
          {
            resource_id: resource.id,
            resource_name: resource.name,
            scopes: [...ticket.granted_scope_names],
          },
        ],
        resource_server_id: ticket.resource_server_id,
        resource_server_client_id: ticket.resource_server_client_id,
        permission_ticket_id: ticket.id,
      };
      const response = await LocalIamProtocolRuntimeStore.issueSubjectTokensAsync({
        realm_id: realmId,
        client_id: authenticatedClient.client_id,
        subject_kind: ticket.subject_kind,
        subject_id: ticket.subject_id,
        requested_scope_names: [],
        additional_scope_names: ticket.granted_scope_names,
        additional_claims: {
          authorization,
        },
        base_url: baseUrl,
        grant_type: 'urn:ietf:params:oauth:grant-type:uma-ticket',
        include_refresh_token: false,
      });
      const resolvedRpt = LocalIamProtocolRuntimeStore.resolveIssuedTokenForValue(realmId, response.access_token);
      ticket.status = 'EXCHANGED';
      ticket.exchanged_at = nowIso();
      ticket.rpt_token_id = resolvedRpt.id;
      return {
        ...response,
        permission_ticket_id: ticket.id,
        authorization,
      };
    });
  },

  exportState(): Record<string, unknown> {
    return clone(state) as unknown as Record<string, unknown>;
  },

  importState(input: Record<string, unknown>): void {
    const importedState = input as unknown as Partial<IamAuthorizationServicesState>;
    const nextState = {
      resource_servers: Array.isArray(importedState.resource_servers)
        ? clone(importedState.resource_servers)
        : [],
      scopes: Array.isArray(importedState.scopes)
        ? clone(importedState.scopes)
        : [],
      resources: Array.isArray(importedState.resources)
        ? clone(importedState.resources)
        : [],
      policies: Array.isArray(importedState.policies)
        ? clone(importedState.policies)
        : [],
      permissions: Array.isArray(importedState.permissions)
        ? clone(importedState.permissions)
        : [],
      evaluations: Array.isArray(importedState.evaluations)
        ? clone(importedState.evaluations)
        : [],
      permission_tickets: Array.isArray(importedState.permission_tickets)
        ? clone(importedState.permission_tickets)
        : [],
    };
    authorizationServicesDirectoryRepository.save(splitDirectoryState(nextState));
    authorizationServicesPermissionTicketsRepository.save(splitPermissionTicketsState(nextState));
    syncInMemoryState(nextState);
  },
};
