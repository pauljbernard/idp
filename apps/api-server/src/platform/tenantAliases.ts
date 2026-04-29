export type TenantAliasMap = Record<string, string>;

function reverseAliasMap(aliases: TenantAliasMap): TenantAliasMap {
  return Object.fromEntries(
    Object.entries(aliases).map(([legacyId, standaloneId]) => [standaloneId, legacyId])
  );
}

function mapAliasId(value: string, aliases: TenantAliasMap): string {
  return aliases[value] ?? value;
}

export function mapAliasIds(values: string[], aliases: TenantAliasMap): string[] {
  return Array.from(new Set(values.map((value) => mapAliasId(value, aliases))));
}

export const STANDALONE_FEATURE_ID_BY_LEGACY: TenantAliasMap = {
  mission_planning: 'workflow_planning',
  fleet_management: 'managed_resources',
  public_sector_ops: 'public_programs',
};

export const LEGACY_FEATURE_ID_BY_STANDALONE = reverseAliasMap(STANDALONE_FEATURE_ID_BY_LEGACY);

export const STANDALONE_PERMISSION_ID_BY_LEGACY: TenantAliasMap = {
  'missions.read': 'workflows.read',
  'missions.write': 'workflows.write',
  'fleet.read': 'resources.read',
  'fleet.write': 'resources.write',
  'municipal_ops.read': 'public_programs.read',
  'municipal_ops.manage': 'public_programs.manage',
};

export const LEGACY_PERMISSION_ID_BY_STANDALONE = reverseAliasMap(STANDALONE_PERMISSION_ID_BY_LEGACY);

export const STANDALONE_SURFACE_ID_BY_LEGACY: TenantAliasMap = {
  missions: 'workflows',
  'mission-detail': 'workflow-detail',
  'mission-planning': 'workflow-planning',
  fleet: 'resources',
  'aircraft-detail': 'resource-detail',
  'municipal-operations': 'public-programs',
  'command-surface': 'operations-center',
};

export const LEGACY_SURFACE_ID_BY_STANDALONE = reverseAliasMap(STANDALONE_SURFACE_ID_BY_LEGACY);

export type StandaloneManagedRole = 'admin' | 'operator' | 'specialist' | 'viewer';
export type StandaloneManagedRoleInput = StandaloneManagedRole;
const OPERATOR_ROLE_IDS = new Set<string>([
  'service_operations_operator',
  'tenant_operator',
]);
const SPECIALIST_ROLE_IDS = new Set<string>([
  'research_planner',
  'tenant_specialist',
]);

export function toStandaloneFeatureId(featureId: string): string {
  return mapAliasId(featureId, STANDALONE_FEATURE_ID_BY_LEGACY);
}

export function toStandaloneFeatureIds(featureIds: string[]): string[] {
  return mapAliasIds(featureIds, STANDALONE_FEATURE_ID_BY_LEGACY);
}

export function hasStandaloneFeature(featureIds: string[], requiredFeatureId: string): boolean {
  const normalizedRequiredFeatureId = toStandaloneFeatureId(requiredFeatureId);
  return featureIds.some((featureId) => toStandaloneFeatureId(featureId) === normalizedRequiredFeatureId);
}

export function toLegacyPermissionId(permissionId: string): string {
  return mapAliasId(permissionId, LEGACY_PERMISSION_ID_BY_STANDALONE);
}

export function toStandalonePermissionIds(permissionIds: string[]): string[] {
  return mapAliasIds(permissionIds, STANDALONE_PERMISSION_ID_BY_LEGACY);
}

export function toLegacySurfaceId(surfaceId: string): string {
  return mapAliasId(surfaceId, LEGACY_SURFACE_ID_BY_STANDALONE);
}

export function toStandaloneSurfaceIds(surfaceIds: string[]): string[] {
  return mapAliasIds(surfaceIds, STANDALONE_SURFACE_ID_BY_LEGACY);
}

export function toStandaloneRoleId(roleId: string): string {
  return roleId;
}

export function toStandaloneManagedRole(role: StandaloneManagedRoleInput): StandaloneManagedRole {
  return role;
}

export function parseStandaloneManagedRole(role: unknown): StandaloneManagedRole | null {
  if (
    role === 'admin' ||
    role === 'operator' ||
    role === 'specialist' ||
    role === 'viewer'
  ) {
    return role;
  }

  if (role === 'pilot') {
    return 'specialist';
  }

  return null;
}

export function isStandaloneOperatorRoleId(roleId: string | undefined | null): boolean {
  return Boolean(roleId && OPERATOR_ROLE_IDS.has(roleId));
}

export function isStandaloneSpecialistRoleId(roleId: string | undefined | null): boolean {
  return Boolean(roleId && SPECIALIST_ROLE_IDS.has(roleId));
}
