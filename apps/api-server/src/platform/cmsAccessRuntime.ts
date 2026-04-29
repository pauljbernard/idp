import { randomUUID } from 'crypto';
import { loadOrCreatePersistedState, savePersistedState } from './persistence';

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
    .slice(0, 48);
}

export type CmsAccessPermission =
  | 'spaces.read'
  | 'spaces.write'
  | 'schemas.read'
  | 'schemas.write'
  | 'entries.read'
  | 'entries.write'
  | 'media.read'
  | 'media.write'
  | 'workflow.read'
  | 'workflow.write'
  | 'delivery.read'
  | 'delivery.write'
  | 'localization.read'
  | 'localization.write'
  | 'blueprints.read'
  | 'blueprints.write'
  | 'experience.read'
  | 'experience.write'
  | 'operations.read'
  | 'operations.write'
  | 'tokens.manage';

export type CmsRoleStatus = 'ACTIVE' | 'ARCHIVED';
export type CmsRoleScope = 'GLOBAL' | 'SPACE_SCOPED';
export type CmsAssignmentStatus = 'ACTIVE' | 'INACTIVE';
export type CmsPrincipalType = 'USER' | 'GROUP' | 'SERVICE' | 'EXTERNAL_IDENTITY';
export type CmsApiTokenStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';
export type CmsRouteAccessScope = 'SPACE_AWARE' | 'GLOBAL_PLANE';

export interface CmsRoleRecord {
  id: string;
  name: string;
  summary: string;
  status: CmsRoleStatus;
  system_role: boolean;
  scope: CmsRoleScope;
  permission_ids: CmsAccessPermission[];
  allowed_space_ids: string[];
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface CmsRoleAssignmentRecord {
  id: string;
  role_id: string;
  principal_type: CmsPrincipalType;
  principal_id: string;
  principal_label: string;
  status: CmsAssignmentStatus;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

interface StoredCmsApiTokenRecord {
  id: string;
  name: string;
  summary: string;
  status: CmsApiTokenStatus;
  token_prefix: string;
  token_secret: string;
  permission_ids: CmsAccessPermission[];
  allowed_space_ids: string[];
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface CmsApiTokenRecord extends Omit<StoredCmsApiTokenRecord, 'token_secret'> {}

export interface CmsAccessSummaryResponse {
  generated_at: string;
  role_count: number;
  active_role_count: number;
  role_assignment_count: number;
  api_token_count: number;
  active_api_token_count: number;
  permission_catalog: CmsAccessPermission[];
}

export interface CmsRolesResponse {
  generated_at: string;
  roles: CmsRoleRecord[];
  count: number;
}

export interface CmsRoleAssignmentsResponse {
  generated_at: string;
  assignments: CmsRoleAssignmentRecord[];
  count: number;
}

export interface CmsApiTokensResponse {
  generated_at: string;
  tokens: CmsApiTokenRecord[];
  count: number;
}

export interface CreateCmsRoleRequest {
  name: string;
  summary?: string;
  scope?: CmsRoleScope;
  permission_ids?: CmsAccessPermission[];
  allowed_space_ids?: string[];
}

export interface UpdateCmsRoleRequest {
  name?: string;
  summary?: string;
  status?: CmsRoleStatus;
  scope?: CmsRoleScope;
  permission_ids?: CmsAccessPermission[];
  allowed_space_ids?: string[];
}

export interface CreateCmsRoleAssignmentRequest {
  role_id: string;
  principal_type: CmsPrincipalType;
  principal_id: string;
  principal_label: string;
}

export interface UpdateCmsRoleAssignmentRequest {
  principal_label?: string;
  status?: CmsAssignmentStatus;
}

export interface CreateCmsApiTokenRequest {
  name: string;
  summary?: string;
  permission_ids?: CmsAccessPermission[];
  allowed_space_ids?: string[];
  expires_at?: string | null;
}

export interface UpdateCmsApiTokenRequest {
  name?: string;
  summary?: string;
  status?: CmsApiTokenStatus;
  permission_ids?: CmsAccessPermission[];
  allowed_space_ids?: string[];
  expires_at?: string | null;
}

export interface CmsApiTokenCreateResponse {
  generated_at: string;
  token: CmsApiTokenRecord;
  issued_secret: string;
}

export interface CmsApiTokenAuthorizationRequest {
  method: string;
  path: string;
  target_space_ids?: string[] | null;
}

export interface CmsApiTokenAuthorizationResult {
  allowed: boolean;
  reason: string | null;
  token: CmsApiTokenRecord | null;
  actor_user_id: string | null;
  required_permissions: CmsAccessPermission[];
  effective_permissions: CmsAccessPermission[];
  allowed_space_ids: string[];
  has_unrestricted_space_access: boolean;
}

export interface CmsPrincipalContext {
  principal_type: CmsPrincipalType;
  principal_id: string;
}

export interface CmsPrincipalAccessSummary {
  can_access_surface: boolean;
  effective_permissions: CmsAccessPermission[];
  matched_role_ids: string[];
  matched_assignment_ids: string[];
  allowed_space_ids: string[];
  has_unrestricted_space_access: boolean;
}

export interface CmsPrincipalAuthorizationRequest {
  method: string;
  path: string;
  principal_contexts: CmsPrincipalContext[];
  target_space_ids?: string[] | null;
}

export interface CmsPrincipalAuthorizationResult extends CmsPrincipalAccessSummary {
  allowed: boolean;
  reason: string | null;
  required_permissions: CmsAccessPermission[];
}

export interface CmsRoutePermissionDescriptor {
  required_permissions: CmsAccessPermission[];
  access_scope: CmsRouteAccessScope;
}

interface CmsAccessStateV1 {
  roles: CmsRoleRecord[];
  assignments: CmsRoleAssignmentRecord[];
  api_tokens: StoredCmsApiTokenRecord[];
}

const CMS_ACCESS_STATE_FILE = 'cms-access-state.json';

export const CMS_ACCESS_PERMISSION_CATALOG: CmsAccessPermission[] = [
  'spaces.read',
  'spaces.write',
  'schemas.read',
  'schemas.write',
  'entries.read',
  'entries.write',
  'media.read',
  'media.write',
  'workflow.read',
  'workflow.write',
  'delivery.read',
  'delivery.write',
  'localization.read',
  'localization.write',
  'blueprints.read',
  'blueprints.write',
  'experience.read',
  'experience.write',
  'operations.read',
  'operations.write',
  'tokens.manage',
];

const DEFAULT_ROLE_SEEDS: Array<Pick<CmsRoleRecord, 'id' | 'name' | 'summary' | 'scope' | 'permission_ids'>> = [
  {
    id: 'cms-role-super-admin',
    name: 'CMS Super Administrator',
    summary: 'Owns every standalone CMS plane including access, authoring, delivery, and operations.',
    scope: 'GLOBAL',
    permission_ids: [...CMS_ACCESS_PERMISSION_CATALOG],
  },
  {
    id: 'cms-role-author',
    name: 'Content Author',
    summary: 'Authors spaces, schemas, entries, media, and visual experiences.',
    scope: 'SPACE_SCOPED',
    permission_ids: ['spaces.read', 'schemas.read', 'entries.read', 'entries.write', 'media.read', 'media.write', 'experience.read', 'experience.write', 'delivery.read'],
  },
  {
    id: 'cms-role-reviewer',
    name: 'Content Reviewer',
    summary: 'Reviews draft content, workflow state, and release posture.',
    scope: 'SPACE_SCOPED',
    permission_ids: ['entries.read', 'workflow.read', 'workflow.write', 'delivery.read', 'localization.read'],
  },
  {
    id: 'cms-role-publisher',
    name: 'Publisher',
    summary: 'Approves releases and drives operations promotion.',
    scope: 'GLOBAL',
    permission_ids: ['entries.read', 'workflow.read', 'workflow.write', 'delivery.read', 'delivery.write', 'operations.read', 'operations.write', 'blueprints.read'],
  },
  {
    id: 'cms-role-instructional-designer',
    name: 'Instructional Designer',
    summary: 'Shapes curricular content, localization, and media-heavy authored experiences.',
    scope: 'SPACE_SCOPED',
    permission_ids: ['entries.read', 'entries.write', 'media.read', 'media.write', 'localization.read', 'localization.write', 'experience.read', 'experience.write'],
  },
  {
    id: 'cms-role-assessment-reviewer',
    name: 'Assessment Reviewer',
    summary: 'Reviews governed assessments, item banks, and learner-safe release posture.',
    scope: 'SPACE_SCOPED',
    permission_ids: ['entries.read', 'workflow.read', 'workflow.write', 'delivery.read'],
  },
  {
    id: 'cms-role-certification-reviewer',
    name: 'Certification Reviewer',
    summary: 'Approves regulated instructional and certification-ready content before release packaging.',
    scope: 'GLOBAL',
    permission_ids: ['entries.read', 'workflow.read', 'workflow.write', 'delivery.read', 'delivery.write'],
  },
];

const state = loadOrCreatePersistedState<CmsAccessStateV1>(CMS_ACCESS_STATE_FILE, () => ({
  roles: [],
  assignments: [],
  api_tokens: [],
}));

function persistState(): void {
  savePersistedState(CMS_ACCESS_STATE_FILE, state);
}

function normalizeState(): void {
  const timestamp = nowIso();
  const existingIds = new Set(state.roles.map((role) => role.id));
  for (const seed of DEFAULT_ROLE_SEEDS) {
    if (existingIds.has(seed.id)) {
      continue;
    }
    state.roles.push({
      id: seed.id,
      name: seed.name,
      summary: seed.summary,
      status: 'ACTIVE',
      system_role: true,
      scope: seed.scope,
      permission_ids: [...seed.permission_ids],
      allowed_space_ids: [],
      created_at: timestamp,
      updated_at: timestamp,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    });
  }
  persistState();
}

normalizeState();

function maskToken(record: StoredCmsApiTokenRecord): CmsApiTokenRecord {
  const { token_secret, ...rest } = record;
  return clone(rest);
}

function getRole(roleId: string): CmsRoleRecord {
  const role = state.roles.find((candidate) => candidate.id === roleId);
  if (!role) {
    throw new Error(`Unknown CMS role: ${roleId}`);
  }
  return role;
}

function getAssignment(assignmentId: string): CmsRoleAssignmentRecord {
  const assignment = state.assignments.find((candidate) => candidate.id === assignmentId);
  if (!assignment) {
    throw new Error(`Unknown CMS role assignment: ${assignmentId}`);
  }
  return assignment;
}

function getToken(tokenId: string): StoredCmsApiTokenRecord {
  const token = state.api_tokens.find((candidate) => candidate.id === tokenId);
  if (!token) {
    throw new Error(`Unknown CMS API token: ${tokenId}`);
  }
  return token;
}

function uniquePermissions(permissionIds: CmsAccessPermission[] | undefined): CmsAccessPermission[] {
  return Array.from(new Set((permissionIds ?? []).filter((permissionId) => CMS_ACCESS_PERMISSION_CATALOG.includes(permissionId))));
}

function normalizeSpaceIds(spaceIds?: string[] | null): string[] {
  return Array.from(new Set((spaceIds ?? []).map((spaceId) => spaceId?.trim()).filter(Boolean) as string[]));
}

function intersectSpaceIds(current: Set<string> | null, next: string[]): Set<string> {
  if (current === null) {
    return new Set(next);
  }
  const nextSet = new Set(next);
  return new Set(Array.from(current).filter((spaceId) => nextSet.has(spaceId)));
}

function describeRoute(method: string, path: string): CmsRoutePermissionDescriptor | null {
  const normalizedMethod = method.toUpperCase();
  const isRead = normalizedMethod === 'GET';

  if (/^\/access(?:\/.*)?$/.test(path)) {
    return {
      required_permissions: ['tokens.manage'],
      access_scope: 'GLOBAL_PLANE',
    };
  }
  if (/^\/spaces(?:\/.*)?$/.test(path)) {
    return {
      required_permissions: [isRead ? 'spaces.read' : 'spaces.write'],
      access_scope: 'SPACE_AWARE',
    };
  }
  if (/^\/schemas(?:\/.*)?$/.test(path)) {
    return {
      required_permissions: [isRead ? 'schemas.read' : 'schemas.write'],
      access_scope: 'SPACE_AWARE',
    };
  }
  if (/^\/entries(?:\/.*)?$/.test(path)) {
    return {
      required_permissions: [isRead ? 'entries.read' : 'entries.write'],
      access_scope: 'SPACE_AWARE',
    };
  }
  if (/^\/media(?:\/.*)?$/.test(path)) {
    return {
      required_permissions: [isRead ? 'media.read' : 'media.write'],
      access_scope: 'GLOBAL_PLANE',
    };
  }
  if (/^\/workflows(?:\/.*)?$/.test(path) || /^\/releases(?:\/.*)?$/.test(path) || /^\/preview(?:\/.*)?$/.test(path)) {
    return {
      required_permissions: [isRead ? 'workflow.read' : 'workflow.write'],
      access_scope: 'SPACE_AWARE',
    };
  }
  if (/^\/delivery(?:\/.*)?$/.test(path) || /^\/query$/.test(path) || /^\/graphql(?:\/.*)?$/.test(path)) {
    return {
      required_permissions: [isRead ? 'delivery.read' : 'delivery.write'],
      access_scope: 'SPACE_AWARE',
    };
  }
  if (/^\/localization(?:\/.*)?$/.test(path)) {
    return {
      required_permissions: [isRead ? 'localization.read' : 'localization.write'],
      access_scope: 'SPACE_AWARE',
    };
  }
  if (/^\/blueprints(?:\/.*)?$/.test(path)) {
    return {
      required_permissions: [isRead ? 'blueprints.read' : 'blueprints.write'],
      access_scope: 'GLOBAL_PLANE',
    };
  }
  if (/^\/extensions(?:\/.*)?$/.test(path)) {
    return {
      required_permissions: [isRead ? 'blueprints.read' : 'blueprints.write'],
      access_scope: 'GLOBAL_PLANE',
    };
  }
  if (/^\/academics(?:\/.*)?$/.test(path)) {
    return {
      required_permissions: [isRead ? 'schemas.read' : 'schemas.write'],
      access_scope: 'GLOBAL_PLANE',
    };
  }
  if (/^\/curriculum(?:\/.*)?$/.test(path)) {
    return {
      required_permissions: [isRead ? 'entries.read' : 'entries.write'],
      access_scope: 'SPACE_AWARE',
    };
  }
  if (/^\/assessments(?:\/.*)?$/.test(path)) {
    return {
      required_permissions: [isRead ? 'entries.read' : 'entries.write'],
      access_scope: 'SPACE_AWARE',
    };
  }
  if (/^\/instructional-workflows(?:\/.*)?$/.test(path)) {
    return {
      required_permissions: [isRead ? 'workflow.read' : 'workflow.write'],
      access_scope: 'SPACE_AWARE',
    };
  }
  if (/^\/visual-authoring(?:\/.*)?$/.test(path) || /^\/experience-bindings(?:\/.*)?$/.test(path)) {
    return {
      required_permissions: [isRead ? 'experience.read' : 'experience.write'],
      access_scope: 'SPACE_AWARE',
    };
  }
  if (/^\/author-assistance(?:\/.*)?$/.test(path)) {
    return {
      required_permissions: ['experience.read'],
      access_scope: 'SPACE_AWARE',
    };
  }
  if (/^\/personalization(?:\/.*)?$/.test(path)) {
    return {
      required_permissions: [isRead ? 'experience.read' : 'experience.write'],
      access_scope: 'SPACE_AWARE',
    };
  }
  if (/^\/operations(?:\/.*)?$/.test(path)) {
    return {
      required_permissions: [isRead ? 'operations.read' : 'operations.write'],
      access_scope: 'GLOBAL_PLANE',
    };
  }
  if (/^\/summary$/.test(path)) {
    return {
      required_permissions: ['delivery.read'],
      access_scope: 'GLOBAL_PLANE',
    };
  }
  if (/^\/tenant-bindings(?:\/.*)?$/.test(path)) {
    return {
      required_permissions: [isRead ? 'spaces.read' : 'spaces.write'],
      access_scope: 'GLOBAL_PLANE',
    };
  }
  if (/^\/review(?:\/.*)?$/.test(path) || /^\/validation-domains(?:\/.*)?$/.test(path)) {
    return {
      required_permissions: ['delivery.read'],
      access_scope: 'GLOBAL_PLANE',
    };
  }
  return null;
}

function resolveAssignments(principalContexts: CmsPrincipalContext[]): CmsRoleAssignmentRecord[] {
  const principalIndex = new Map<CmsPrincipalType, Set<string>>();
  for (const principal of principalContexts) {
    const principalId = principal.principal_id.trim();
    if (!principalId) {
      continue;
    }
    if (!principalIndex.has(principal.principal_type)) {
      principalIndex.set(principal.principal_type, new Set());
    }
    principalIndex.get(principal.principal_type)!.add(principalId);
  }

  if (principalIndex.size === 0) {
    return [];
  }

  return state.assignments.filter((assignment) => (
    assignment.status === 'ACTIVE'
    && principalIndex.get(assignment.principal_type)?.has(assignment.principal_id)
  ));
}

function resolveRoles(assignments: CmsRoleAssignmentRecord[]): CmsRoleRecord[] {
  const roleIds = new Set(assignments.map((assignment) => assignment.role_id));
  return state.roles.filter((role) => role.status === 'ACTIVE' && roleIds.has(role.id));
}

function buildPrincipalAccessSummary(principalContexts: CmsPrincipalContext[]): CmsPrincipalAccessSummary {
  const assignments = resolveAssignments(principalContexts);
  const roles = resolveRoles(assignments);
  const effectivePermissions = Array.from(new Set(roles.flatMap((role) => role.permission_ids)));
  const allowedSpaceIds = Array.from(new Set(
    roles
      .filter((role) => role.allowed_space_ids.length > 0)
      .flatMap((role) => role.allowed_space_ids)
  ));

  return {
    can_access_surface: effectivePermissions.length > 0,
    effective_permissions: effectivePermissions,
    matched_role_ids: roles.map((role) => role.id),
    matched_assignment_ids: assignments.map((assignment) => assignment.id),
    allowed_space_ids: allowedSpaceIds,
    has_unrestricted_space_access: roles.some((role) => role.scope === 'GLOBAL' || role.allowed_space_ids.length === 0),
  };
}

export const LocalCmsAccessStore = {
  getSummary(): CmsAccessSummaryResponse {
    return {
      generated_at: nowIso(),
      role_count: state.roles.length,
      active_role_count: state.roles.filter((role) => role.status === 'ACTIVE').length,
      role_assignment_count: state.assignments.length,
      api_token_count: state.api_tokens.length,
      active_api_token_count: state.api_tokens.filter((token) => token.status === 'ACTIVE').length,
      permission_catalog: [...CMS_ACCESS_PERMISSION_CATALOG],
    };
  },

  getPermissionCatalog(): CmsAccessPermission[] {
    return [...CMS_ACCESS_PERMISSION_CATALOG];
  },

  describeRoute(method: string, path: string): CmsRoutePermissionDescriptor | null {
    return describeRoute(method, path);
  },

  summarizePrincipalAccess(principalContexts: CmsPrincipalContext[]): CmsPrincipalAccessSummary {
    return buildPrincipalAccessSummary(principalContexts);
  },

  hasUserAccess(userId: string): boolean {
    return buildPrincipalAccessSummary([{ principal_type: 'USER', principal_id: userId }]).can_access_surface;
  },

  listRoles(): CmsRolesResponse {
    return {
      generated_at: nowIso(),
      roles: state.roles.map((role) => clone(role)),
      count: state.roles.length,
    };
  },

  createRole(actorUserId: string, input: CreateCmsRoleRequest): CmsRoleRecord {
    const timestamp = nowIso();
    const role: CmsRoleRecord = {
      id: `cms-role-${slugify(input.name) || randomUUID().slice(0, 8)}`,
      name: input.name.trim() || 'Untitled CMS Role',
      summary: input.summary?.trim() || 'Custom standalone CMS role',
      status: 'ACTIVE',
      system_role: false,
      scope: input.scope ?? 'GLOBAL',
      permission_ids: uniquePermissions(input.permission_ids),
      allowed_space_ids: Array.from(new Set((input.allowed_space_ids ?? []).filter(Boolean))),
      created_at: timestamp,
      updated_at: timestamp,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    };
    state.roles.push(role);
    persistState();
    return clone(role);
  },

  updateRole(actorUserId: string, roleId: string, input: UpdateCmsRoleRequest): CmsRoleRecord {
    const role = getRole(roleId);
    role.name = input.name?.trim() || role.name;
    role.summary = input.summary?.trim() || role.summary;
    role.status = input.status ?? role.status;
    role.scope = input.scope ?? role.scope;
    if (input.permission_ids) {
      role.permission_ids = uniquePermissions(input.permission_ids);
    }
    if (input.allowed_space_ids) {
      role.allowed_space_ids = Array.from(new Set(input.allowed_space_ids.filter(Boolean)));
    }
    role.updated_at = nowIso();
    role.updated_by_user_id = actorUserId;
    persistState();
    return clone(role);
  },

  listAssignments(): CmsRoleAssignmentsResponse {
    return {
      generated_at: nowIso(),
      assignments: state.assignments.map((assignment) => clone(assignment)),
      count: state.assignments.length,
    };
  },

  createAssignment(actorUserId: string, input: CreateCmsRoleAssignmentRequest): CmsRoleAssignmentRecord {
    getRole(input.role_id);
    const timestamp = nowIso();
    const assignment: CmsRoleAssignmentRecord = {
      id: `cms-assignment-${randomUUID().slice(0, 8)}`,
      role_id: input.role_id,
      principal_type: input.principal_type,
      principal_id: input.principal_id.trim(),
      principal_label: input.principal_label.trim() || input.principal_id.trim(),
      status: 'ACTIVE',
      created_at: timestamp,
      updated_at: timestamp,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    };
    state.assignments.push(assignment);
    persistState();
    return clone(assignment);
  },

  updateAssignment(actorUserId: string, assignmentId: string, input: UpdateCmsRoleAssignmentRequest): CmsRoleAssignmentRecord {
    const assignment = getAssignment(assignmentId);
    if (typeof input.principal_label === 'string' && input.principal_label.trim()) {
      assignment.principal_label = input.principal_label.trim();
    }
    assignment.status = input.status ?? assignment.status;
    assignment.updated_at = nowIso();
    assignment.updated_by_user_id = actorUserId;
    persistState();
    return clone(assignment);
  },

  listApiTokens(): CmsApiTokensResponse {
    return {
      generated_at: nowIso(),
      tokens: state.api_tokens.map((token) => maskToken(token)),
      count: state.api_tokens.length,
    };
  },

  createApiToken(actorUserId: string, input: CreateCmsApiTokenRequest): CmsApiTokenCreateResponse {
    const timestamp = nowIso();
    const issuedSecret = `cms_${randomUUID()}_${randomUUID().slice(0, 8)}`;
    const token: StoredCmsApiTokenRecord = {
      id: `cms-token-${slugify(input.name) || randomUUID().slice(0, 8)}`,
      name: input.name.trim() || 'Untitled CMS API Token',
      summary: input.summary?.trim() || 'Standalone CMS API token',
      status: 'ACTIVE',
      token_prefix: issuedSecret.slice(0, 18),
      token_secret: issuedSecret,
      permission_ids: uniquePermissions(input.permission_ids),
      allowed_space_ids: Array.from(new Set((input.allowed_space_ids ?? []).filter(Boolean))),
      expires_at: input.expires_at ?? null,
      last_used_at: null,
      created_at: timestamp,
      updated_at: timestamp,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    };
    state.api_tokens.push(token);
    persistState();
    return {
      generated_at: nowIso(),
      token: maskToken(token),
      issued_secret: issuedSecret,
    };
  },

  updateApiToken(actorUserId: string, tokenId: string, input: UpdateCmsApiTokenRequest): CmsApiTokenRecord {
    const token = getToken(tokenId);
    token.name = input.name?.trim() || token.name;
    token.summary = input.summary?.trim() || token.summary;
    token.status = input.status ?? token.status;
    if (input.permission_ids) {
      token.permission_ids = uniquePermissions(input.permission_ids);
    }
    if (input.allowed_space_ids) {
      token.allowed_space_ids = Array.from(new Set(input.allowed_space_ids.filter(Boolean)));
    }
    if (input.expires_at !== undefined) {
      token.expires_at = input.expires_at;
    }
    token.updated_at = nowIso();
    token.updated_by_user_id = actorUserId;
    persistState();
    return maskToken(token);
  },

  authorizePrincipal(request: CmsPrincipalAuthorizationRequest): CmsPrincipalAuthorizationResult {
    const descriptor = describeRoute(request.method, request.path);
    if (!descriptor) {
      return {
        allowed: false,
        reason: 'CMS principal authorization does not support this route family',
        required_permissions: [],
        ...buildPrincipalAccessSummary(request.principal_contexts),
      };
    }

    const assignments = resolveAssignments(request.principal_contexts);
    const roles = resolveRoles(assignments);
    const summary = buildPrincipalAccessSummary(request.principal_contexts);
    const targetSpaceIds = normalizeSpaceIds(request.target_space_ids);
    let effectiveAllowedSpaces: Set<string> | null = null;
    let hasUnrestrictedSpaceAccess = true;

    for (const permissionId of descriptor.required_permissions) {
      const matchingRoles = roles.filter((role) => role.permission_ids.includes(permissionId));
      if (matchingRoles.length === 0) {
        return {
          allowed: false,
          reason: `CMS principal is missing permission ${permissionId}`,
          required_permissions: descriptor.required_permissions,
          ...summary,
        };
      }

      const unrestricted = matchingRoles.some((role) => role.scope === 'GLOBAL' || role.allowed_space_ids.length === 0);
      const explicitSpaceIds = Array.from(new Set(
        matchingRoles
          .filter((role) => role.allowed_space_ids.length > 0)
          .flatMap((role) => role.allowed_space_ids)
      ));

      if (descriptor.access_scope === 'GLOBAL_PLANE' && !unrestricted) {
        return {
          allowed: false,
          reason: `CMS route family ${request.path} requires unrestricted ${permissionId} access`,
          required_permissions: descriptor.required_permissions,
          ...summary,
        };
      }

      if (!unrestricted && targetSpaceIds.length > 0 && !targetSpaceIds.every((spaceId) => explicitSpaceIds.includes(spaceId))) {
        return {
          allowed: false,
          reason: `CMS principal is not allowed to access the requested CMS spaces for ${permissionId}`,
          required_permissions: descriptor.required_permissions,
          ...summary,
        };
      }

      if (!unrestricted) {
        hasUnrestrictedSpaceAccess = false;
        effectiveAllowedSpaces = intersectSpaceIds(effectiveAllowedSpaces, explicitSpaceIds);
      }
    }

    return {
      allowed: true,
      reason: null,
      required_permissions: descriptor.required_permissions,
      can_access_surface: summary.can_access_surface,
      effective_permissions: summary.effective_permissions,
      matched_role_ids: summary.matched_role_ids,
      matched_assignment_ids: summary.matched_assignment_ids,
      allowed_space_ids: hasUnrestrictedSpaceAccess ? [] : Array.from(effectiveAllowedSpaces ?? new Set<string>()),
      has_unrestricted_space_access: hasUnrestrictedSpaceAccess,
    };
  },

  authorizeApiToken(rawToken: string | null, request: CmsApiTokenAuthorizationRequest): CmsApiTokenAuthorizationResult {
    if (!rawToken) {
      return {
        allowed: false,
        reason: 'Missing CMS API token',
        token: null,
        actor_user_id: null,
        required_permissions: [],
        effective_permissions: [],
        allowed_space_ids: [],
        has_unrestricted_space_access: false,
      };
    }

    const token = state.api_tokens.find((candidate) => candidate.token_secret === rawToken);
    if (!token) {
      return {
        allowed: false,
        reason: 'Unknown CMS API token',
        token: null,
        actor_user_id: null,
        required_permissions: [],
        effective_permissions: [],
        allowed_space_ids: [],
        has_unrestricted_space_access: false,
      };
    }

    if (token.status !== 'ACTIVE') {
      return {
        allowed: false,
        reason: `CMS API token ${token.id} is not active`,
        token: maskToken(token),
        actor_user_id: null,
        required_permissions: [],
        effective_permissions: [...token.permission_ids],
        allowed_space_ids: [...token.allowed_space_ids],
        has_unrestricted_space_access: token.allowed_space_ids.length === 0,
      };
    }

    if (token.expires_at && new Date(token.expires_at).getTime() <= Date.now()) {
      token.status = 'EXPIRED';
      token.updated_at = nowIso();
      persistState();
      return {
        allowed: false,
        reason: `CMS API token ${token.id} is expired`,
        token: maskToken(token),
        actor_user_id: null,
        required_permissions: [],
        effective_permissions: [...token.permission_ids],
        allowed_space_ids: [...token.allowed_space_ids],
        has_unrestricted_space_access: token.allowed_space_ids.length === 0,
      };
    }

    const descriptor = describeRoute(request.method, request.path);
    if (!descriptor) {
      return {
        allowed: false,
        reason: 'CMS API token cannot authorize this route family',
        token: maskToken(token),
        actor_user_id: null,
        required_permissions: [],
        effective_permissions: [...token.permission_ids],
        allowed_space_ids: [...token.allowed_space_ids],
        has_unrestricted_space_access: token.allowed_space_ids.length === 0,
      };
    }

    const tokenPermissions = new Set(token.permission_ids);
    const hasAccess = descriptor.required_permissions.every((permissionId) => tokenPermissions.has(permissionId));
    if (!hasAccess) {
      return {
        allowed: false,
        reason: `CMS API token ${token.id} is missing permission ${descriptor.required_permissions.join(', ')}`,
        token: maskToken(token),
        actor_user_id: null,
        required_permissions: descriptor.required_permissions,
        effective_permissions: [...token.permission_ids],
        allowed_space_ids: [...token.allowed_space_ids],
        has_unrestricted_space_access: token.allowed_space_ids.length === 0,
      };
    }

    const targetSpaceIds = normalizeSpaceIds(request.target_space_ids);
    const hasUnrestrictedSpaceAccess = token.allowed_space_ids.length === 0;
    if (descriptor.access_scope === 'GLOBAL_PLANE' && !hasUnrestrictedSpaceAccess) {
      return {
        allowed: false,
        reason: `CMS API token ${token.id} requires unrestricted scope for ${request.path}`,
        token: maskToken(token),
        actor_user_id: null,
        required_permissions: descriptor.required_permissions,
        effective_permissions: [...token.permission_ids],
        allowed_space_ids: [...token.allowed_space_ids],
        has_unrestricted_space_access: false,
      };
    }

    if (!hasUnrestrictedSpaceAccess && targetSpaceIds.length > 0 && !targetSpaceIds.every((spaceId) => token.allowed_space_ids.includes(spaceId))) {
      return {
        allowed: false,
        reason: `CMS API token ${token.id} is not allowed to access the requested CMS spaces`,
        token: maskToken(token),
        actor_user_id: null,
        required_permissions: descriptor.required_permissions,
        effective_permissions: [...token.permission_ids],
        allowed_space_ids: [...token.allowed_space_ids],
        has_unrestricted_space_access: false,
      };
    }

    token.last_used_at = nowIso();
    persistState();
    return {
      allowed: true,
      reason: null,
      token: maskToken(token),
      actor_user_id: `cms-token:${token.id}`,
      required_permissions: descriptor.required_permissions,
      effective_permissions: [...token.permission_ids],
      allowed_space_ids: [...token.allowed_space_ids],
      has_unrestricted_space_access: hasUnrestrictedSpaceAccess,
    };
  },
};
