import { loadOrCreatePersistedState, savePersistedState } from './persistence';
import { LocalFeatureFlagStore } from './featureFlags';
import { LocalOperatingProfileStore, type OperatingProfileResponse } from './operatingProfile';
import { LocalControlPlaneStore } from './controlPlane';
import { LocalCmsAccessStore } from './cmsAccessRuntime';
import { IAM_SYSTEM_USER_ID, normalizeIamIdentifier, rewriteIamIdentifiers } from './iamIdentifiers';
import {
  DEFAULT_SERVICE_ENTITLEMENT,
  ENABLED_SERVICE_ENTITLEMENT,
  isServiceEntitlementEnabled,
  normalizeServiceEntitlementValue,
  type LocalServiceEntitlement,
  type LocalServiceEntitlementInput,
} from './serviceEntitlements';
import {
  toLegacyPermissionId,
  toLegacySurfaceId,
  toStandaloneFeatureId,
  toStandaloneFeatureIds,
  isStandaloneOperatorRoleId,
  toStandaloneManagedRole,
  toStandalonePermissionIds,
  toStandaloneRoleId,
  toStandaloneSurfaceIds,
  type StandaloneManagedRole,
  type StandaloneManagedRoleInput,
} from './tenantAliases';

export const LOCAL_USER_HEADER = 'x-user-id';
export const LOCAL_TENANT_HEADER = 'x-tenant-id';
export const DEFAULT_LOCAL_USER_ID = 'tenant-admin';

export type LocalAccountType = 'INDIVIDUAL' | 'ORGANIZATION';
export type LocalSubscriptionTier = 'BASIC' | 'PRO' | 'ENTERPRISE' | 'GOVERNMENT';
export type LocalDeploymentProfile = 'SHARED_SAAS' | 'US_ENTERPRISE' | 'GOVERNMENT_SENSITIVE';
export type LocalAssuranceMode = 'STANDARD' | 'HARDENED' | 'GOVERNMENT';
export type LocalFaaService = 'laanc' | 'b4ufly';
export type LocalGlobalRoleId = 'super_administrator';
export type LocalRoleId =
  | 'enterprise_admin'
  | 'government_program_admin'
  | 'service_operations_operator'
  | 'research_planner'
  | 'tenant_owner'
  | 'tenant_admin'
  | 'tenant_operator'
  | 'tenant_specialist'
  | 'tenant_viewer';
export type LocalRoleIdInput = LocalRoleId;
export type LocalPermission =
  | 'dashboard.read'
  | 'constitutional_ai.read'
  | 'training.read'
  | 'training.manage'
  | 'missions.read'
  | 'missions.write'
  | 'authorization.read'
  | 'authorization.write'
  | 'checklists.read'
  | 'checklists.write'
  | 'fleet.read'
  | 'fleet.write'
  | 'partners.read'
  | 'developer_portal.read'
  | 'integrations.read'
  | 'developer_portal.manage'
  | 'integrations.manage'
  | 'municipal_ops.read'
  | 'municipal_ops.manage'
  | 'command_center.read'
  | 'live_operations.read'
  | 'live_operations.manage'
  | 'analytics.read'
  | 'compliance.read'
  | 'compliance.manage'
  | 'billing.read'
  | 'billing.manage'
  | 'settings.read'
  | 'settings.manage'
  | 'diagnostics.read';
export type LocalGlobalPermission =
  | 'cms.read'
  | 'cms.manage'
  | 'iam.read'
  | 'iam.manage'
  | 'commerce.read'
  | 'commerce.manage'
  | 'lms.read'
  | 'lms.manage'
  | 'workforce.read'
  | 'workforce.manage'
  | 'scheduling.read'
  | 'scheduling.manage'
  | 'communications.read'
  | 'communications.manage';
export type LocalManagedMembershipRole = StandaloneManagedRole;
export type LocalManagedMembershipRoleInput = StandaloneManagedRoleInput;
export type LocalProviderDeployment = 'local' | 'aws_native' | 'commercial' | 'open_source';
export type LocalIdentitySource = 'local_directory' | 'external_identity';

interface SurfaceAccessRule {
  permissions: LocalPermission[];
  required_features?: string[];
  required_faa_services?: LocalFaaService[];
  allowed_profiles?: LocalDeploymentProfile[];
}

interface StoredTenantMembership {
  tenant_id: string;
  role_id: LocalRoleIdInput;
  role_label: string;
  permissions: LocalPermission[];
}

export interface LocalTenantMembership extends Omit<StoredTenantMembership, 'role_id'> {
  role_id: LocalRoleId;
  role_alias_id?: string;
  permission_aliases?: string[];
  accessible_surface_ids: string[];
  accessible_surface_aliases?: string[];
}

export interface LocalTenant {
  id: string;
  name: string;
  account_type: LocalAccountType;
  organization_kind?: 'GROUP' | 'COMPANY' | 'PUBLIC_SECTOR' | 'RESEARCH';
  domain?: string;
  owner_user_id?: string;
  subscription_tier: LocalSubscriptionTier;
  deployment_profile: LocalDeploymentProfile;
  assurance_mode: LocalAssuranceMode;
  service_entitlement: LocalServiceEntitlement;
  features: string[];
  feature_aliases?: string[];
  max_users: number;
  max_aircraft: number;
  max_managed_assets?: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface LocalUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenant_ids: string[];
  default_tenant_id: string;
  memberships: StoredTenantMembership[];
  global_role_ids?: LocalGlobalRoleId[];
  global_permissions?: LocalGlobalPermission[];
  auth_source?: LocalIdentitySource;
  provider_id?: string;
  provider_label?: string;
  provider_deployment?: LocalProviderDeployment;
  external_user_id?: string;
}

export interface TenantContextUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenant_ids: string[];
  default_tenant_id: string;
  memberships: LocalTenantMembership[];
  global_role_ids: LocalGlobalRoleId[];
  global_permissions: LocalGlobalPermission[];
  global_accessible_surface_ids: string[];
  global_accessible_surface_aliases?: string[];
}

export interface TenantContextResponse {
  current_user: TenantContextUser;
  current_membership: LocalTenantMembership | null;
  selected_tenant: LocalTenant | null;
  available_tenants: LocalTenant[];
  operating_profile: OperatingProfileResponse | null;
  selection_source: 'requested' | 'default' | 'fallback';
  warnings: string[];
}

interface PermissionRequirement {
  any_of?: LocalPermission[];
  all_of?: LocalPermission[];
  required_features?: string[];
  required_faa_services?: LocalFaaService[];
  allowed_profiles?: LocalDeploymentProfile[];
}

interface TenantDirectoryState {
  tenants: LocalTenant[];
  users: LocalUser[];
}

export interface RegisterLocalAccountInput {
  account_type: LocalAccountType;
  organization_kind?: LocalTenant['organization_kind'];
  tenant_name: string;
  domain?: string;
  subscription_tier: LocalSubscriptionTier;
  deployment_profile: LocalDeploymentProfile;
  assurance_mode: LocalAssuranceMode;
  service_entitlement?: LocalServiceEntitlementInput;
  features: string[];
  max_users: number;
  max_aircraft: number;
  max_managed_assets?: number;
  owner: {
    first_name: string;
    last_name: string;
    email: string;
    role_id?: LocalRoleIdInput;
    role_label?: string;
    permissions?: LocalPermission[];
  };
}

export interface RegisterLocalAccountResult {
  tenant: LocalTenant;
  user: LocalUser;
  membership: StoredTenantMembership;
}

export interface UpsertExternalIdentityUserInput {
  tenantId: string;
  email: string;
  externalUserId: string;
  providerId: string;
  providerLabel: string;
  providerDeployment: LocalProviderDeployment;
  role: LocalManagedMembershipRoleInput;
  firstName?: string;
  lastName?: string;
}

export interface SyncExternalIdentityMembershipInput {
  tenantId: string;
  role: LocalManagedMembershipRoleInput;
  roleId?: LocalRoleIdInput;
  roleLabel?: string;
  permissions?: LocalPermission[];
}

export interface SyncLocalUserFromExternalIdentityInput {
  email: string;
  externalUserId: string;
  providerId: string;
  providerLabel: string;
  providerDeployment: LocalProviderDeployment;
  firstName?: string;
  lastName?: string;
  memberships?: SyncExternalIdentityMembershipInput[];
  defaultTenantId?: string | null;
  globalRoleIds?: LocalGlobalRoleId[];
  globalPermissions?: LocalGlobalPermission[];
  authoritativeMemberships?: boolean;
}

const LOCAL_DIRECTORY_STATE_FILE = 'local-directory-state.json';

function mapRoleAliasId(roleId: LocalRoleIdInput): string {
  return toStandaloneRoleId(roleId);
}

const surfaceAccessRules: Record<string, SurfaceAccessRule> = {
  dashboard: {
    permissions: ['dashboard.read']
  },
  missions: {
    permissions: ['missions.read'],
    required_features: ['workflow_planning']
  },
  'mission-detail': {
    permissions: ['missions.read'],
    required_features: ['workflow_planning']
  },
  'mission-planning': {
    permissions: ['missions.write'],
    required_features: ['workflow_planning']
  },
  authorization: {
    permissions: ['authorization.read'],
    required_faa_services: ['laanc']
  },
  training: {
    permissions: ['training.read']
  },
  'solution-packs': {
    permissions: ['dashboard.read']
  },
  clients: {
    permissions: ['missions.read'],
    required_features: ['workflow_planning']
  },
  projects: {
    permissions: ['missions.read'],
    required_features: ['workflow_planning']
  },
  deliverables: {
    permissions: ['missions.read'],
    required_features: ['workflow_planning']
  },
  checklists: {
    permissions: ['checklists.read'],
    required_features: ['checklists']
  },
  fleet: {
    permissions: ['fleet.read'],
    required_features: ['managed_resources']
  },
  'aircraft-detail': {
    permissions: ['fleet.read'],
    required_features: ['managed_resources']
  },
  partners: {
    permissions: ['partners.read'],
    required_features: ['partners']
  },
  'developer-portal': {
    permissions: ['developer_portal.read'],
    required_features: ['developer_portal']
  },
  integrations: {
    permissions: ['integrations.read'],
    required_features: ['integrations']
  },
  'municipal-operations': {
    permissions: ['municipal_ops.read'],
    required_features: ['public_programs']
  },
  'command-surface': {
    permissions: ['command_center.read'],
    required_features: ['command_center']
  },
  analytics: {
    permissions: ['analytics.read'],
    required_features: ['analytics']
  },
  'analytics-reporting-admin': {
    permissions: ['analytics.read'],
    required_features: ['analytics']
  },
  configuration: {
    permissions: ['settings.read']
  },
  compliance: {
    permissions: ['compliance.read'],
    required_features: ['compliance']
  },
  settings: {
    permissions: ['settings.read']
  },
  'test-page': {
    permissions: ['diagnostics.read']
  }
};

const localTenants: LocalTenant[] = [
  {
    id: '6db41674-f92a-4d7d-8dbf-c4ca6b5b72bc',
    name: 'Crew Demo Tenant',
    account_type: 'ORGANIZATION',
    organization_kind: 'COMPANY',
    domain: 'crew.demo',
    owner_user_id: 'tenant-admin',
    subscription_tier: 'ENTERPRISE',
    deployment_profile: 'US_ENTERPRISE',
    assurance_mode: 'HARDENED',
    service_entitlement: 'INTEGRATION_ENABLED',
    features: [
      'constitutional_ai',
      'workflow_planning',
      'checklists',
      'managed_resources',
      'partners',
      'developer_portal',
      'integrations',
      'analytics',
      'compliance',
      'command_center'
    ],
    max_users: 100,
    max_aircraft: 50,
    status: 'ACTIVE'
  },
  {
    id: 'workflow-ops-lab',
    name: 'Workflow Operations Lab',
    account_type: 'ORGANIZATION',
    organization_kind: 'COMPANY',
    domain: 'workflow.lab',
    owner_user_id: 'tenant-admin',
    subscription_tier: 'ENTERPRISE',
    deployment_profile: 'US_ENTERPRISE',
    assurance_mode: 'HARDENED',
    service_entitlement: 'INTEGRATION_ENABLED',
    features: [
      'workflow_planning',
      'checklists',
      'integrations',
      'analytics',
      'compliance',
      'command_center'
    ],
    max_users: 75,
    max_aircraft: 15,
    status: 'ACTIVE'
  },
  {
    id: 'northstar-holdings',
    name: 'Northstar Holdings',
    account_type: 'ORGANIZATION',
    organization_kind: 'COMPANY',
    domain: 'northstar.example',
    owner_user_id: 'tenant-admin',
    subscription_tier: 'ENTERPRISE',
    deployment_profile: 'US_ENTERPRISE',
    assurance_mode: 'HARDENED',
    service_entitlement: 'INTEGRATION_ENABLED',
    features: [
      'constitutional_ai',
      'workflow_planning',
      'checklists',
      'managed_resources',
      'partners',
      'developer_portal',
      'integrations',
      'analytics',
      'compliance',
      'command_center'
    ],
    max_users: 100,
    max_aircraft: 50,
    status: 'ACTIVE'
  },
  {
    id: 'civic-services',
    name: 'Civic Services Office',
    account_type: 'ORGANIZATION',
    organization_kind: 'PUBLIC_SECTOR',
    domain: 'civic.example',
    owner_user_id: 'tenant-admin',
    subscription_tier: 'GOVERNMENT',
    deployment_profile: 'GOVERNMENT_SENSITIVE',
    assurance_mode: 'GOVERNMENT',
    service_entitlement: 'INTEGRATION_ENABLED',
    features: [
      'workflow_planning',
      'checklists',
      'managed_resources',
      'public_programs',
      'integrations',
      'analytics',
      'compliance',
      'command_center'
    ],
    max_users: 250,
    max_aircraft: 120,
    status: 'ACTIVE'
  },
  {
    id: 'innovation-lab',
    name: 'Innovation Lab',
    account_type: 'ORGANIZATION',
    organization_kind: 'RESEARCH',
    domain: 'innovation.example',
    owner_user_id: 'research-lead',
    subscription_tier: 'ENTERPRISE',
    deployment_profile: 'SHARED_SAAS',
    assurance_mode: 'STANDARD',
    service_entitlement: 'INTEGRATION_ENABLED',
    features: [
      'constitutional_ai',
      'workflow_planning',
      'checklists',
      'managed_resources',
      'analytics'
    ],
    max_users: 25,
    max_aircraft: 10,
    status: 'ACTIVE'
  }
];

const localUsers: LocalUser[] = [
  {
    id: 'idp-super-admin',
    name: 'Standalone Platform Admin',
    email: 'admin@idp.local',
    role: 'Super Administrator',
    tenant_ids: [],
    default_tenant_id: '',
    global_role_ids: ['super_administrator'],
    global_permissions: ['cms.read', 'cms.manage', 'iam.read', 'iam.manage', 'commerce.read', 'commerce.manage', 'lms.read', 'lms.manage', 'workforce.read', 'workforce.manage', 'scheduling.read', 'scheduling.manage', 'communications.read', 'communications.manage'],
    auth_source: 'local_directory',
    provider_id: 'LOCAL_DIRECTORY',
    provider_label: 'Local Directory',
    provider_deployment: 'local',
    memberships: []
  },
  {
    id: 'tenant-admin',
    name: 'Alex Morgan',
    email: 'alex.morgan@northstar.example',
    role: 'Tenant Portfolio Administrator',
    tenant_ids: ['northstar-holdings', 'civic-services'],
    default_tenant_id: 'northstar-holdings',
    auth_source: 'local_directory',
    provider_id: 'LOCAL_DIRECTORY',
    provider_label: 'Local Directory',
    provider_deployment: 'local',
    memberships: [
      {
        tenant_id: 'northstar-holdings',
        role_id: 'enterprise_admin',
        role_label: 'Tenant Portfolio Administrator',
        permissions: [
          'dashboard.read',
          'constitutional_ai.read',
          'training.read',
          'training.manage',
          'missions.read',
          'missions.write',
          'authorization.read',
          'authorization.write',
          'checklists.read',
          'checklists.write',
          'fleet.read',
          'fleet.write',
          'partners.read',
          'developer_portal.read',
          'integrations.read',
          'developer_portal.manage',
          'integrations.manage',
          'municipal_ops.read',
          'municipal_ops.manage',
          'command_center.read',
          'live_operations.read',
          'live_operations.manage',
          'analytics.read',
          'compliance.read',
          'compliance.manage',
          'billing.read',
          'billing.manage',
          'settings.read',
          'settings.manage',
          'diagnostics.read'
        ]
      },
      {
        tenant_id: 'civic-services',
        role_id: 'government_program_admin',
        role_label: 'Public Service Administrator',
        permissions: [
          'dashboard.read',
          'missions.read',
          'missions.write',
          'training.read',
          'training.manage',
          'authorization.read',
          'authorization.write',
          'checklists.read',
          'checklists.write',
          'fleet.read',
          'fleet.write',
          'developer_portal.read',
          'integrations.read',
          'integrations.manage',
          'municipal_ops.read',
          'municipal_ops.manage',
          'command_center.read',
          'live_operations.read',
          'live_operations.manage',
          'analytics.read',
          'compliance.read',
          'compliance.manage',
          'billing.read',
          'billing.manage',
          'settings.read',
          'settings.manage'
        ]
      }
    ]
  },
  {
    id: 'service-operator',
    name: 'Jordan Lee',
    email: 'jordan.lee@civic.example',
    role: 'Service Operations Operator',
    tenant_ids: ['civic-services'],
    default_tenant_id: 'civic-services',
    auth_source: 'local_directory',
    provider_id: 'LOCAL_DIRECTORY',
    provider_label: 'Local Directory',
    provider_deployment: 'local',
    memberships: [
      {
        tenant_id: 'civic-services',
        role_id: 'service_operations_operator',
        role_label: 'Service Operations Operator',
        permissions: [
          'dashboard.read',
          'missions.read',
          'missions.write',
          'training.read',
          'authorization.read',
          'authorization.write',
          'checklists.read',
          'checklists.write',
          'fleet.read',
          'developer_portal.read',
          'integrations.read',
          'municipal_ops.read',
          'municipal_ops.manage',
          'command_center.read',
          'live_operations.read',
          'live_operations.manage',
          'analytics.read',
          'compliance.read',
          'compliance.manage',
          'settings.read'
        ]
      }
    ]
  },
  {
    id: 'research-lead',
    name: 'Samir Patel',
    email: 'samir.patel@innovation.example',
    role: 'Research Program Lead',
    tenant_ids: ['innovation-lab'],
    default_tenant_id: 'innovation-lab',
    auth_source: 'local_directory',
    provider_id: 'LOCAL_DIRECTORY',
    provider_label: 'Local Directory',
    provider_deployment: 'local',
    memberships: [
      {
        tenant_id: 'innovation-lab',
        role_id: 'research_planner',
        role_label: 'Research Program Lead',
        permissions: [
          'dashboard.read',
          'constitutional_ai.read',
          'training.read',
          'training.manage',
          'missions.read',
          'missions.write',
          'authorization.read',
          'authorization.write',
          'checklists.read',
          'checklists.write',
          'fleet.read',
          'analytics.read',
          'billing.read',
          'billing.manage',
          'settings.read',
          'settings.manage'
        ]
      }
    ]
  }
];

const directoryState = rewriteIamIdentifiers(loadOrCreatePersistedState<TenantDirectoryState>(LOCAL_DIRECTORY_STATE_FILE, () => ({
  tenants: [],
  users: []
})));

const individualProSignals = new Set(['constitutional_ai', 'analytics', 'compliance']);

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowToken(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function buildDisplayName(firstName: string, lastName: string, fallbackEmail: string): string {
  const combinedName = `${firstName.trim()} ${lastName.trim()}`.trim();
  return combinedName || fallbackEmail;
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const [firstName = 'Identity', ...rest] = fullName.trim().split(/\s+/);
  return {
    firstName,
    lastName: rest.join(' ') || 'User'
  };
}

function splitEmailName(email: string): { firstName: string; lastName: string } {
  const localPart = email.split('@')[0] ?? 'identity.user';
  const normalized = localPart
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return splitName(normalized || 'Identity User');
}

function normalizeDomain(domain?: string | null): string | undefined {
  if (!domain) {
    return undefined;
  }

  return domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}

function normalizeTenantFeatures(features: string[]): string[] {
  return toStandaloneFeatureIds(features.filter((feature) => feature !== 'authorization'));
}

function syncTenantAliases(tenant: LocalTenant): LocalTenant {
  const legacyTenant = tenant as LocalTenant & { faa_entitlement?: LocalServiceEntitlementInput };
  const canonicalEntitlement = normalizeServiceEntitlementValue(
    tenant.service_entitlement ?? legacyTenant.faa_entitlement,
    DEFAULT_SERVICE_ENTITLEMENT,
  );
  tenant.service_entitlement = canonicalEntitlement;
  delete legacyTenant.faa_entitlement;

  tenant.features = normalizeTenantFeatures(tenant.features);
  tenant.feature_aliases = [...tenant.features];

  const canonicalManagedAssets = tenant.max_managed_assets ?? tenant.max_aircraft;
  tenant.max_aircraft = canonicalManagedAssets;
  tenant.max_managed_assets = canonicalManagedAssets;

  return tenant;
}

function cloneTenant(tenant: LocalTenant): LocalTenant {
  return syncTenantAliases(clone(tenant));
}

function persistDirectoryState(): void {
  savePersistedState(LOCAL_DIRECTORY_STATE_FILE, directoryState);
}

function inferSubscriptionTier(tenant: LocalTenant): LocalSubscriptionTier {
  if (tenant.subscription_tier === 'GOVERNMENT' || tenant.organization_kind === 'PUBLIC_SECTOR') {
    return 'GOVERNMENT';
  }

  if (tenant.account_type === 'ORGANIZATION') {
    return 'ENTERPRISE';
  }

  const hasCommercialSignals = tenant.features.some((feature) => individualProSignals.has(feature));
  if (hasCommercialSignals || (tenant.max_managed_assets ?? tenant.max_aircraft) > 3) {
    return 'PRO';
  }

  return 'BASIC';
}

function inferServiceEntitlement(
  tenant: Pick<LocalTenant, 'service_entitlement' | 'features'> & { faa_entitlement?: LocalServiceEntitlementInput },
): LocalServiceEntitlement {
  if (isServiceEntitlementEnabled(tenant.service_entitlement ?? tenant.faa_entitlement)) {
    return ENABLED_SERVICE_ENTITLEMENT;
  }

  return tenant.features.includes('authorization') ? ENABLED_SERVICE_ENTITLEMENT : DEFAULT_SERVICE_ENTITLEMENT;
}

function migrateDirectoryState(): void {
  let didMutate = false;

  directoryState.tenants.forEach((tenant) => {
    const originalServiceEntitlement = tenant.service_entitlement;
    const originalMaxManagedAssets = tenant.max_managed_assets;
    const nextTier = inferSubscriptionTier(tenant);
    if (tenant.subscription_tier !== nextTier) {
      tenant.subscription_tier = nextTier;
      didMutate = true;
    }

    const nextServiceEntitlement = inferServiceEntitlement(tenant);
    if (tenant.service_entitlement !== nextServiceEntitlement) {
      tenant.service_entitlement = nextServiceEntitlement;
      didMutate = true;
    }

    if ('faa_entitlement' in tenant) {
      delete (tenant as LocalTenant & { faa_entitlement?: LocalServiceEntitlementInput }).faa_entitlement;
      didMutate = true;
    }

    const nextManagedAssets = tenant.max_managed_assets ?? tenant.max_aircraft;
    if (tenant.max_aircraft !== nextManagedAssets) {
      tenant.max_aircraft = nextManagedAssets;
      didMutate = true;
    }

    if (tenant.max_managed_assets !== nextManagedAssets) {
      tenant.max_managed_assets = nextManagedAssets;
      didMutate = true;
    }

    const normalizedFeatures = normalizeTenantFeatures(tenant.features);
    if (normalizedFeatures.length !== tenant.features.length) {
      tenant.features = normalizedFeatures;
      didMutate = true;
    }

    if (originalServiceEntitlement !== tenant.service_entitlement || originalMaxManagedAssets !== tenant.max_managed_assets) {
      didMutate = true;
    }
  });

  directoryState.users.forEach((user) => {
    if (!user.auth_source) {
      user.auth_source = 'local_directory';
      didMutate = true;
    }

    if (!user.provider_id && user.auth_source === 'local_directory') {
      user.provider_id = 'LOCAL_DIRECTORY';
      user.provider_label = 'Local Directory';
      user.provider_deployment = 'local';
      didMutate = true;
    }

    if (!Array.isArray(user.global_role_ids)) {
      user.global_role_ids = [];
      didMutate = true;
    }

    if (!Array.isArray(user.global_permissions)) {
      user.global_permissions = [];
      didMutate = true;
    }

    if (user.id === IAM_SYSTEM_USER_ID) {
      const expectedPermissions: LocalGlobalPermission[] = ['cms.read', 'cms.manage', 'iam.read', 'iam.manage', 'commerce.read', 'commerce.manage', 'lms.read', 'lms.manage', 'workforce.read', 'workforce.manage', 'scheduling.read', 'scheduling.manage', 'communications.read', 'communications.manage'];
      const nextPermissions = Array.from(new Set([...(user.global_permissions ?? []), ...expectedPermissions]));
      if (nextPermissions.length !== (user.global_permissions ?? []).length) {
        user.global_permissions = nextPermissions;
        didMutate = true;
      }

      const nextRoles = Array.from(new Set<LocalGlobalRoleId>([...(user.global_role_ids ?? []), 'super_administrator']));
      if (nextRoles.length !== (user.global_role_ids ?? []).length) {
        user.global_role_ids = nextRoles;
        didMutate = true;
      }
    }

    user.memberships.forEach((membership) => {
      const normalizedRoleId = toStandaloneRoleId(membership.role_id) as LocalRoleId;
      if (membership.role_id !== normalizedRoleId) {
        membership.role_id = normalizedRoleId;
        didMutate = true;
      }

      const normalizedPermissions = Array.from(new Set([
        ...membership.permissions,
        ...(membership.permissions.includes('developer_portal.manage') ? ['developer_portal.read' as const] : []),
        ...(membership.permissions.includes('integrations.manage') ? ['integrations.read' as const] : []),
        ...(membership.permissions.includes('municipal_ops.manage') ? ['municipal_ops.read' as const] : []),
        ...(normalizedRoleId === 'tenant_operator' ? ['developer_portal.read' as const] : []),
        ...(normalizedRoleId === 'tenant_operator' ? ['municipal_ops.read' as const] : []),
        ...(normalizedRoleId === 'tenant_operator' ? ['command_center.read' as const] : []),
        ...(normalizedRoleId === 'tenant_operator' ? ['live_operations.read' as const] : []),
        ...(normalizedRoleId === 'tenant_viewer' ? ['municipal_ops.read' as const] : []),
        ...(normalizedRoleId === 'tenant_viewer' ? ['fleet.read' as const] : []),
        ...(normalizedRoleId === 'tenant_viewer' ? ['command_center.read' as const] : []),
        ...(normalizedRoleId === 'tenant_viewer' ? ['live_operations.read' as const] : []),
        ...(normalizedRoleId === 'service_operations_operator' ? ['integrations.read' as const] : []),
      ]));

      if (normalizedPermissions.length !== membership.permissions.length) {
        membership.permissions = normalizedPermissions;
        didMutate = true;
      }
    });
  });

  if (didMutate) {
    persistDirectoryState();
  }
}

migrateDirectoryState();

function getAllTenants(): LocalTenant[] {
  return Array.from(new Map([...localTenants, ...directoryState.tenants].map((tenant) => [tenant.id, syncTenantAliases(tenant)])).values());
}

function getAllUsers(): LocalUser[] {
  return Array.from(new Map([...localUsers, ...directoryState.users].map((user) => [user.id, user])).values());
}

function upsertDirectoryUser(user: LocalUser): void {
  const existingIndex = directoryState.users.findIndex((candidate) => candidate.id === user.id);
  if (existingIndex >= 0) {
    const existingUser = directoryState.users[existingIndex];
    if (JSON.stringify(existingUser) === JSON.stringify(user)) {
      return;
    }

    directoryState.users[existingIndex] = user;
    persistDirectoryState();
    return;
  }

  directoryState.users.push(user);
  persistDirectoryState();
}

function buildGenericPermissions(roleId: LocalRoleIdInput): LocalPermission[] {
  const normalizedRoleId = toStandaloneRoleId(roleId) as LocalRoleId;

  switch (normalizedRoleId) {
    case 'enterprise_admin':
      return [
        'dashboard.read',
        'constitutional_ai.read',
        'training.read',
        'training.manage',
        'missions.read',
        'missions.write',
        'authorization.read',
        'authorization.write',
        'checklists.read',
        'checklists.write',
        'fleet.read',
        'fleet.write',
        'partners.read',
        'developer_portal.read',
        'integrations.read',
        'developer_portal.manage',
        'integrations.manage',
        'municipal_ops.read',
        'municipal_ops.manage',
        'command_center.read',
        'live_operations.read',
        'live_operations.manage',
        'analytics.read',
        'compliance.read',
        'compliance.manage',
        'billing.read',
        'billing.manage',
        'settings.read',
        'settings.manage',
        'diagnostics.read'
      ];
    case 'government_program_admin':
      return [
        'dashboard.read',
        'missions.read',
        'missions.write',
        'training.read',
        'training.manage',
        'authorization.read',
        'authorization.write',
        'checklists.read',
        'checklists.write',
        'fleet.read',
        'fleet.write',
        'developer_portal.read',
        'integrations.read',
        'integrations.manage',
        'municipal_ops.read',
        'municipal_ops.manage',
        'command_center.read',
        'live_operations.read',
        'live_operations.manage',
        'analytics.read',
        'compliance.read',
        'compliance.manage',
        'billing.read',
        'billing.manage',
        'settings.read',
        'settings.manage'
      ];
    case 'service_operations_operator':
      return [
        'dashboard.read',
        'missions.read',
        'missions.write',
        'training.read',
        'authorization.read',
        'authorization.write',
        'checklists.read',
        'checklists.write',
        'fleet.read',
        'developer_portal.read',
        'integrations.read',
        'municipal_ops.read',
        'municipal_ops.manage',
        'command_center.read',
        'live_operations.read',
        'live_operations.manage',
        'analytics.read',
        'compliance.read',
        'compliance.manage',
        'settings.read'
      ];
    case 'research_planner':
      return [
        'dashboard.read',
        'constitutional_ai.read',
        'training.read',
        'training.manage',
        'missions.read',
        'missions.write',
        'authorization.read',
        'authorization.write',
        'checklists.read',
        'checklists.write',
        'fleet.read',
        'analytics.read',
        'billing.read',
        'billing.manage',
        'settings.read',
        'settings.manage'
      ];
    case 'tenant_owner':
    case 'tenant_admin':
      return [
        'dashboard.read',
        'constitutional_ai.read',
        'training.read',
        'training.manage',
        'missions.read',
        'missions.write',
        'authorization.read',
        'authorization.write',
        'checklists.read',
        'checklists.write',
        'fleet.read',
        'fleet.write',
        'partners.read',
        'developer_portal.read',
        'integrations.read',
        'developer_portal.manage',
        'integrations.manage',
        'municipal_ops.read',
        'municipal_ops.manage',
        'command_center.read',
        'live_operations.read',
        'live_operations.manage',
        'analytics.read',
        'compliance.read',
        'compliance.manage',
        'billing.read',
        normalizedRoleId === 'tenant_owner' ? 'billing.manage' : 'billing.read',
        'settings.read',
        'settings.manage',
        'diagnostics.read'
      ];
    case 'tenant_operator':
      return [
        'dashboard.read',
        'training.read',
        'missions.read',
        'missions.write',
        'authorization.read',
        'authorization.write',
        'checklists.read',
        'checklists.write',
        'fleet.read',
        'developer_portal.read',
        'municipal_ops.read',
        'command_center.read',
        'live_operations.read',
        'analytics.read',
        'compliance.read',
        'settings.read'
      ];
    case 'tenant_specialist':
      return [
        'dashboard.read',
        'training.read',
        'missions.read',
        'missions.write',
        'authorization.read',
        'authorization.write',
        'checklists.read',
        'checklists.write',
        'analytics.read',
        'settings.read'
      ];
    case 'tenant_viewer':
      return [
        'dashboard.read',
        'training.read',
        'missions.read',
        'authorization.read',
        'checklists.read',
        'fleet.read',
        'municipal_ops.read',
        'command_center.read',
        'live_operations.read',
        'analytics.read',
        'settings.read'
      ];
    default:
      return [];
  }
}

function roleTemplateForManagedRole(role: LocalManagedMembershipRoleInput, tenant?: LocalTenant | null): {
  roleId: LocalRoleId;
  roleLabel: string;
  permissions: LocalPermission[];
} {
  const normalizedRole = toStandaloneManagedRole(role);

  if (normalizedRole === 'admin') {
    if (tenant?.account_type === 'INDIVIDUAL') {
      return {
        roleId: 'tenant_owner',
        roleLabel: 'Individual Account Owner',
        permissions: buildGenericPermissions('tenant_owner')
      };
    }

    if (tenant?.organization_kind === 'PUBLIC_SECTOR' || tenant?.subscription_tier === 'GOVERNMENT') {
      return {
        roleId: 'government_program_admin',
        roleLabel: 'Public Service Administrator',
        permissions: buildGenericPermissions('government_program_admin')
      };
    }

    if (tenant?.organization_kind === 'RESEARCH') {
      return {
        roleId: 'research_planner',
        roleLabel: 'Research Program Lead',
        permissions: buildGenericPermissions('research_planner')
      };
    }

    return {
      roleId: 'enterprise_admin',
      roleLabel: 'Tenant Portfolio Administrator',
      permissions: buildGenericPermissions('enterprise_admin')
    };
  }

  if (tenant?.organization_kind === 'PUBLIC_SECTOR' && normalizedRole !== 'viewer') {
    return {
      roleId: 'service_operations_operator',
      roleLabel: 'Service Operations Operator',
      permissions: buildGenericPermissions('service_operations_operator')
    };
  }

  if (tenant?.organization_kind === 'RESEARCH' && normalizedRole !== 'viewer') {
    return {
      roleId: 'research_planner',
      roleLabel: 'Research Program Lead',
      permissions: buildGenericPermissions('research_planner')
    };
  }

  switch (normalizedRole) {
    case 'operator':
      return {
        roleId: 'tenant_operator',
        roleLabel: 'Tenant Operator',
        permissions: buildGenericPermissions('tenant_operator')
      };
    case 'specialist':
      return {
        roleId: 'tenant_specialist',
        roleLabel: 'Tenant Specialist',
        permissions: buildGenericPermissions('tenant_specialist')
      };
    case 'viewer':
    default:
      return {
        roleId: 'tenant_viewer',
        roleLabel: 'Tenant Viewer',
        permissions: buildGenericPermissions('tenant_viewer')
      };
  }
}

function nextTenantId(baseName: string): string {
  const baseSlug = slugify(baseName) || 'tenant';
  const candidates = new Set(getAllTenants().map((tenant) => tenant.id));
  if (!candidates.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  while (candidates.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseSlug}-${suffix}`;
}

function nextUserId(email: string): string {
  const baseSlug = slugify(email.split('@')[0] ?? 'user') || 'user';
  const candidates = new Set(getAllUsers().map((user) => user.id));
  const initialCandidate = `acct-${baseSlug}`;
  if (!candidates.has(initialCandidate)) {
    return initialCandidate;
  }

  let suffix = 2;
  while (candidates.has(`${initialCandidate}-${suffix}`)) {
    suffix += 1;
  }

  return `${initialCandidate}-${suffix}`;
}

function nextExternalUserId(email: string, providerId: string): string {
  const baseSlug = slugify(`${providerId}-${email.split('@')[0] ?? 'external'}`) || 'external-user';
  const candidates = new Set(getAllUsers().map((user) => user.id));
  const initialCandidate = `ext-${baseSlug}`;
  if (!candidates.has(initialCandidate)) {
    return initialCandidate;
  }

  let suffix = 2;
  while (candidates.has(`${initialCandidate}-${suffix}`)) {
    suffix += 1;
  }

  return `${initialCandidate}-${suffix}`;
}

export function normalizeHeaderValue(value: string | string[] | undefined): string | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] : value;
}

function hasRequiredFeatures(tenant: LocalTenant, requiredFeatures: string[] = []): boolean {
  const availableFeatures = new Set(tenant.features.map((feature) => toStandaloneFeatureId(feature)));
  return requiredFeatures.every((feature) => availableFeatures.has(toStandaloneFeatureId(feature)));
}

function hasRequiredFaaServices(tenant: LocalTenant, requiredFaaServices: LocalFaaService[] = []): boolean {
  if (requiredFaaServices.length === 0) {
    return true;
  }

  return isServiceEntitlementEnabled(tenant.service_entitlement);
}

function hasAllowedProfile(tenant: LocalTenant, allowedProfiles?: LocalDeploymentProfile[]): boolean {
  if (!allowedProfiles || allowedProfiles.length === 0) {
    return true;
  }

  return allowedProfiles.includes(tenant.deployment_profile);
}

function hasEnabledSurfaceFlag(surfaceId: string, tenantId: string): boolean {
  return LocalFeatureFlagStore.isSurfaceEnabled(surfaceId, tenantId);
}

function findStoredMembership(user: LocalUser, tenantId: string): StoredTenantMembership | null {
  return user.memberships.find((membership) => membership.tenant_id === tenantId) ?? null;
}

function buildProviderManagedMembership(user: LocalUser, tenantId: string): StoredTenantMembership | null {
  if (user.auth_source !== 'external_identity' || !user.provider_id || !user.external_user_id) {
    return null;
  }

  const externalMember = LocalControlPlaneStore
    .listExternalIdentityMembers(tenantId)
    .members
    .find((member) => (
      member.provider_id === user.provider_id &&
      member.external_user_id === user.external_user_id
    ));

  if (!externalMember || externalMember.status !== 'active') {
    return null;
  }

  const tenant = getLocalTenant(tenantId);
  if (!tenant) {
    return null;
  }

  const template = roleTemplateForManagedRole(externalMember.role, tenant);
  return {
    tenant_id: tenantId,
    role_id: template.roleId,
    role_label: template.roleLabel,
    permissions: template.permissions,
  };
}

function getActiveStoredTenantIds(user: LocalUser): string[] {
  const storedMembershipTenantIds = user.memberships.map((membership) => membership.tenant_id);
  const candidateTenantIds = storedMembershipTenantIds.length > 0 ? storedMembershipTenantIds : user.tenant_ids;
  return Array.from(new Set(candidateTenantIds)).filter((tenantId) => {
    const tenant = getLocalTenant(tenantId);
    return Boolean(tenant && tenant.status === 'ACTIVE');
  });
}

function getExplicitProviderTenantIds(user: LocalUser): string[] {
  if (user.auth_source !== 'external_identity' || !user.provider_id || !user.external_user_id) {
    return [];
  }

  return getAllTenants()
    .filter((tenant) => tenant.status === 'ACTIVE')
    .filter((tenant) => LocalControlPlaneStore
      .listExternalIdentityMembers(tenant.id)
      .members
      .some((member) => (
        member.provider_id === user.provider_id &&
        member.external_user_id === user.external_user_id &&
        member.status === 'active'
      )))
    .map((tenant) => tenant.id);
}

function buildResolvedMembership(user: LocalUser, tenantId: string): LocalTenantMembership | null {
  const tenant = getLocalTenant(tenantId);
  const membership = findStoredMembership(user, tenantId) ?? buildProviderManagedMembership(user, tenantId);
  if (!tenant || !membership) {
    return null;
  }

  const normalizedRoleId = toStandaloneRoleId(membership.role_id) as LocalRoleId;

  const accessibleSurfaceIds = Object.entries(surfaceAccessRules)
    .filter(([, rule]) => hasRequiredFeatures(tenant, rule.required_features))
    .filter(([, rule]) => hasRequiredFaaServices(tenant, rule.required_faa_services))
    .filter(([, rule]) => hasAllowedProfile(tenant, rule.allowed_profiles))
    .filter(([surfaceId]) => hasEnabledSurfaceFlag(surfaceId, tenantId))
    .filter(([, rule]) => rule.permissions.every((permission) => membership.permissions.includes(permission)))
    .map(([surfaceId]) => surfaceId);

  return {
    ...membership,
    role_id: normalizedRoleId,
    role_alias_id: mapRoleAliasId(normalizedRoleId),
    permission_aliases: toStandalonePermissionIds(membership.permissions),
    accessible_surface_ids: accessibleSurfaceIds,
    accessible_surface_aliases: toStandaloneSurfaceIds(accessibleSurfaceIds)
  };
}

function resolveEffectiveTenantIdsForUser(user: LocalUser): string[] {
  const storedTenantIds = getActiveStoredTenantIds(user);
  if (storedTenantIds.length > 0) {
    return storedTenantIds;
  }

  const explicitProviderTenantIds = getExplicitProviderTenantIds(user);
  if (explicitProviderTenantIds.length > 0) {
    return explicitProviderTenantIds;
  }

  return [];
}

function buildGlobalAccessibleSurfaceIds(user: LocalUser): string[] {
  const permissions = new Set(user.global_permissions ?? []);
  const surfaceIds: string[] = [];

  if (permissions.has('cms.read') || permissions.has('cms.manage') || LocalCmsAccessStore.hasUserAccess(user.id)) {
    surfaceIds.push('cms');
  }

  if (permissions.has('iam.read') || permissions.has('iam.manage')) {
    surfaceIds.push('iam');
  }

  if (permissions.has('commerce.read') || permissions.has('commerce.manage')) {
    surfaceIds.push('commerce');
  }

  if (permissions.has('lms.read') || permissions.has('lms.manage')) {
    surfaceIds.push('lms');
  }

  if (permissions.has('workforce.read') || permissions.has('workforce.manage')) {
    surfaceIds.push('workforce');
  }

  if (permissions.has('scheduling.read') || permissions.has('scheduling.manage')) {
    surfaceIds.push('scheduling');
  }

  if (permissions.has('communications.read') || permissions.has('communications.manage')) {
    surfaceIds.push('communications');
  }

  return surfaceIds;
}

function buildResolvedUser(user: LocalUser): TenantContextUser {
  const effectiveTenantIds = resolveEffectiveTenantIdsForUser(user);
  const effectiveDefaultTenantId = effectiveTenantIds.includes(user.default_tenant_id)
    ? user.default_tenant_id
    : effectiveTenantIds[0] ?? user.default_tenant_id;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    tenant_ids: effectiveTenantIds,
    default_tenant_id: effectiveDefaultTenantId,
    global_role_ids: [...(user.global_role_ids ?? [])],
    global_permissions: [...(user.global_permissions ?? [])],
    global_accessible_surface_ids: buildGlobalAccessibleSurfaceIds(user),
    global_accessible_surface_aliases: toStandaloneSurfaceIds(buildGlobalAccessibleSurfaceIds(user)),
    memberships: effectiveTenantIds
      .map((tenantId) => buildResolvedMembership(user, tenantId))
      .filter((membership): membership is LocalTenantMembership => Boolean(membership))
  };
}

export function getDefaultLocalUserId(): string {
  return DEFAULT_LOCAL_USER_ID;
}

export function getLocalUser(userId: string): LocalUser | null {
  const normalizedUserId = normalizeIamIdentifier(userId);
  return getAllUsers().find((user) => (
    user.id === normalizedUserId
    || (
      user.auth_source === 'external_identity'
      && user.external_user_id === normalizedUserId
    )
  )) ?? null;
}

export function getLocalUserByEmail(email: string): LocalUser | null {
  const normalizedEmail = normalizeEmail(email);
  return getAllUsers().find((user) => normalizeEmail(user.email) === normalizedEmail) ?? null;
}

export function getSeedLocalUserByEmail(email: string): LocalUser | null {
  const normalizedEmail = normalizeEmail(email);
  const seedUser = localUsers.find((user) => normalizeEmail(user.email) === normalizedEmail) ?? null;
  return seedUser ? clone(seedUser) : null;
}

export function listLocalUsersForTenant(tenantId: string): LocalUser[] {
  return getAllUsers().filter((user) => resolveEffectiveTenantIdsForUser(user).includes(tenantId));
}

export function getLocalTenant(tenantId: string): LocalTenant | null {
  const normalizedTenantId = normalizeIamIdentifier(tenantId);
  const tenant = getAllTenants().find((candidate) => candidate.id === normalizedTenantId) ?? null;
  return tenant ? cloneTenant(tenant) : null;
}

export function getLocalServiceEntitlement(tenantId: string): LocalServiceEntitlement {
  return getLocalTenant(tenantId)?.service_entitlement ?? DEFAULT_SERVICE_ENTITLEMENT;
}

export function listLocalTenants(): LocalTenant[] {
  return getAllTenants()
    .filter((tenant) => tenant.status === 'ACTIVE')
    .map((tenant) => cloneTenant(tenant));
}

export function listLocalTenantsForUser(userId: string): LocalTenant[] {
  const user = getLocalUser(userId);
  if (!user) {
    return [];
  }

  return resolveEffectiveTenantIdsForUser(user)
    .map((tenantId) => getLocalTenant(tenantId))
    .filter((tenant): tenant is LocalTenant => Boolean(tenant && tenant.status === 'ACTIVE'));
}

export function countLocalUsersForTenant(tenantId: string): number {
  return listLocalUsersForTenant(tenantId).length;
}

export function registerLocalAccount(input: RegisterLocalAccountInput): RegisterLocalAccountResult {
  const normalizedEmail = normalizeEmail(input.owner.email);
  const normalizedDomain = normalizeDomain(input.domain);
  const tenantName = input.tenant_name.trim();

  if (!tenantName) {
    throw new Error('Missing required field: tenant_name');
  }

  if (!normalizedEmail) {
    throw new Error('Missing required field: owner.email');
  }

  if (getAllUsers().some((user) => normalizeEmail(user.email) === normalizedEmail)) {
    throw new Error(`An account already exists for ${normalizedEmail}`);
  }

  if (normalizedDomain && getAllTenants().some((tenant) => normalizeDomain(tenant.domain) === normalizedDomain)) {
    throw new Error(`An organization with domain ${normalizedDomain} already exists`);
  }

  const roleId = (input.owner.role_id ? toStandaloneRoleId(input.owner.role_id) : 'tenant_owner') as LocalRoleId;
  const roleLabel = input.owner.role_label ?? (input.account_type === 'INDIVIDUAL' ? 'Individual Account Owner' : 'Organization Owner');
  const permissions = Array.from(new Set(input.owner.permissions ?? buildGenericPermissions(roleId)));
  const tenantId = nextTenantId(tenantName);
  const userId = nextUserId(normalizedEmail);
  const membership: StoredTenantMembership = {
    tenant_id: tenantId,
    role_id: roleId,
    role_label: roleLabel,
    permissions
  };

  const tenant: LocalTenant = {
    id: tenantId,
    name: tenantName,
    account_type: input.account_type,
    organization_kind: input.organization_kind,
    domain: normalizedDomain,
    owner_user_id: userId,
    subscription_tier: input.subscription_tier,
    deployment_profile: input.deployment_profile,
    assurance_mode: input.assurance_mode,
    service_entitlement: normalizeServiceEntitlementValue(input.service_entitlement, DEFAULT_SERVICE_ENTITLEMENT),
    features: normalizeTenantFeatures(input.features),
    max_users: input.max_users,
    max_aircraft: input.max_managed_assets ?? input.max_aircraft,
    max_managed_assets: input.max_managed_assets ?? input.max_aircraft,
    status: 'ACTIVE'
  };

  const displayName = `${input.owner.first_name.trim()} ${input.owner.last_name.trim()}`.trim() || normalizedEmail;
  const user: LocalUser = {
    id: userId,
    name: displayName,
    email: normalizedEmail,
    role: roleLabel,
    tenant_ids: [tenantId],
    default_tenant_id: tenantId,
    auth_source: 'local_directory',
    provider_id: 'LOCAL_DIRECTORY',
    provider_label: 'Local Directory',
    provider_deployment: 'local',
    memberships: [membership]
  };

  directoryState.tenants.push(tenant);
  directoryState.users.push(user);
  persistDirectoryState();

  return {
    tenant: cloneTenant(tenant),
    user: clone(user),
    membership: clone(membership)
  };
}

export function deleteRegisteredLocalAccount(tenantId: string, userId: string): void {
  const nextTenants = directoryState.tenants.filter((tenant) => tenant.id !== tenantId);
  const nextUsers = directoryState.users.filter((user) => user.id !== userId);

  if (nextTenants.length === directoryState.tenants.length && nextUsers.length === directoryState.users.length) {
    return;
  }

  directoryState.tenants = nextTenants;
  directoryState.users = nextUsers;
  persistDirectoryState();
}

export function findLocalUserByExternalIdentity(
  tenantId: string,
  providerId: string,
  externalUserId: string,
): LocalUser | null {
  return getAllUsers().find((user) => (
    resolveEffectiveTenantIdsForUser(user).includes(tenantId) &&
    user.provider_id === providerId &&
    user.external_user_id === externalUserId
  )) ?? null;
}

function findLocalUserByProviderIdentity(providerId: string, externalUserId: string): LocalUser | null {
  return getAllUsers().find((user) => (
    user.provider_id === providerId &&
    user.external_user_id === externalUserId
  )) ?? null;
}

export function upsertExternalIdentityUser(input: UpsertExternalIdentityUserInput): LocalUser {
  const tenant = getLocalTenant(input.tenantId);
  if (!tenant) {
    throw new Error(`Unknown tenant: ${input.tenantId}`);
  }

  const normalizedEmail = normalizeEmail(input.email);
  const emailName = splitEmailName(normalizedEmail);
  const firstName = input.firstName?.trim() || emailName.firstName;
  const lastName = input.lastName?.trim() || emailName.lastName;
  const displayName = buildDisplayName(firstName, lastName, normalizedEmail);
  const roleTemplate = roleTemplateForManagedRole(input.role, tenant);

  const existingUser =
    findLocalUserByExternalIdentity(input.tenantId, input.providerId, input.externalUserId) ??
    getLocalUserByEmail(normalizedEmail);

  if (!existingUser) {
    const nextUser: LocalUser = {
      id: nextExternalUserId(normalizedEmail, input.providerId),
      name: displayName,
      email: normalizedEmail,
      role: roleTemplate.roleLabel,
      tenant_ids: [input.tenantId],
      default_tenant_id: input.tenantId,
      auth_source: 'external_identity',
      provider_id: input.providerId,
      provider_label: input.providerLabel,
      provider_deployment: input.providerDeployment,
      external_user_id: input.externalUserId,
      memberships: [
        {
          tenant_id: input.tenantId,
          role_id: roleTemplate.roleId,
          role_label: roleTemplate.roleLabel,
          permissions: [...roleTemplate.permissions]
        }
      ]
    };

    upsertDirectoryUser(nextUser);
    return clone(nextUser);
  }

  const existingMembership = findStoredMembership(existingUser, input.tenantId);
  const nextMemberships = existingMembership
    ? existingUser.memberships.map((candidate) => (
        candidate.tenant_id === input.tenantId
          ? {
              ...candidate,
              role_id: roleTemplate.roleId,
              role_label: roleTemplate.roleLabel,
              permissions: [...roleTemplate.permissions]
            }
          : candidate
      ))
    : [
        ...existingUser.memberships,
        {
          tenant_id: input.tenantId,
          role_id: roleTemplate.roleId,
          role_label: roleTemplate.roleLabel,
          permissions: [...roleTemplate.permissions]
        }
      ];

  const nextTenantIds = existingUser.tenant_ids.includes(input.tenantId)
    ? [...existingUser.tenant_ids]
    : [...existingUser.tenant_ids, input.tenantId];

  const nextUser: LocalUser = {
    ...existingUser,
    name: displayName,
    email: normalizedEmail,
    role: existingUser.auth_source === 'local_directory' ? existingUser.role : roleTemplate.roleLabel,
    tenant_ids: nextTenantIds,
    default_tenant_id: existingUser.default_tenant_id || input.tenantId,
    auth_source: existingUser.auth_source ?? 'external_identity',
    provider_id: existingUser.auth_source === 'local_directory' ? existingUser.provider_id : input.providerId,
    provider_label: existingUser.auth_source === 'local_directory' ? existingUser.provider_label : input.providerLabel,
    provider_deployment: existingUser.auth_source === 'local_directory'
      ? existingUser.provider_deployment
      : input.providerDeployment,
    external_user_id: existingUser.auth_source === 'local_directory'
      ? existingUser.external_user_id
      : input.externalUserId,
    memberships: nextMemberships
  };

  upsertDirectoryUser(nextUser);
  return clone(nextUser);
}

export function syncLocalUserFromExternalIdentity(input: SyncLocalUserFromExternalIdentityInput): LocalUser {
  const normalizedEmail = normalizeEmail(input.email);
  const emailName = splitEmailName(normalizedEmail);
  const firstName = input.firstName?.trim() || emailName.firstName;
  const lastName = input.lastName?.trim() || emailName.lastName;
  const displayName = buildDisplayName(firstName, lastName, normalizedEmail);

  const requestedMemberships = (input.memberships ?? [])
    .filter((membership) => Boolean(getLocalTenant(membership.tenantId)))
    .map((membership) => {
      const membershipTenant = getLocalTenant(membership.tenantId);
      const roleTemplate = membership.roleId && membership.roleLabel && membership.permissions
        ? {
            roleId: toStandaloneRoleId(membership.roleId) as LocalRoleId,
            roleLabel: membership.roleLabel,
            permissions: membership.permissions,
          }
        : roleTemplateForManagedRole(membership.role, membershipTenant);
      return {
        tenant_id: membership.tenantId,
        role_id: roleTemplate.roleId,
        role_label: roleTemplate.roleLabel,
        permissions: [...roleTemplate.permissions]
      };
    });

  const existingUser =
    findLocalUserByProviderIdentity(input.providerId, input.externalUserId) ??
    getLocalUserByEmail(normalizedEmail);

  if (!existingUser) {
    const nextTenantIds = Array.from(new Set(requestedMemberships.map((membership) => membership.tenant_id)));
    const requestedDefaultTenantId = input.defaultTenantId?.trim() || '';
    const defaultTenantId = nextTenantIds.includes(requestedDefaultTenantId)
      ? requestedDefaultTenantId
      : nextTenantIds[0] ?? '';

    const nextUser: LocalUser = {
      id: nextExternalUserId(normalizedEmail, input.providerId),
      name: displayName,
      email: normalizedEmail,
      role: requestedMemberships[0]?.role_label ?? 'External Identity User',
      tenant_ids: nextTenantIds,
      default_tenant_id: defaultTenantId,
      auth_source: 'external_identity',
      provider_id: input.providerId,
      provider_label: input.providerLabel,
      provider_deployment: input.providerDeployment,
      external_user_id: input.externalUserId,
      global_role_ids: Array.from(new Set(input.globalRoleIds ?? [])),
      global_permissions: Array.from(new Set(input.globalPermissions ?? [])),
      memberships: requestedMemberships
    };

    upsertDirectoryUser(nextUser);
    return clone(nextUser);
  }

  const nextMemberships = input.authoritativeMemberships
    ? [...requestedMemberships]
    : [...existingUser.memberships];
  if (!input.authoritativeMemberships) {
    requestedMemberships.forEach((membership) => {
      const existingMembershipIndex = nextMemberships.findIndex((candidate) => candidate.tenant_id === membership.tenant_id);
      if (existingMembershipIndex >= 0) {
        nextMemberships[existingMembershipIndex] = membership;
        return;
      }
      nextMemberships.push(membership);
    });
  }

  const nextTenantIds = Array.from(new Set(nextMemberships.map((membership) => membership.tenant_id)));
  const requestedDefaultTenantId = input.defaultTenantId?.trim() || '';
  const defaultTenantId = nextTenantIds.includes(requestedDefaultTenantId)
    ? requestedDefaultTenantId
    : nextTenantIds.includes(existingUser.default_tenant_id)
      ? existingUser.default_tenant_id
      : nextTenantIds[0] ?? '';

  const nextUser: LocalUser = {
    ...existingUser,
    name: displayName,
    email: normalizedEmail,
    role: nextMemberships[0]?.role_label ?? existingUser.role,
    tenant_ids: nextTenantIds,
    default_tenant_id: defaultTenantId,
    auth_source: 'external_identity',
    provider_id: input.providerId,
    provider_label: input.providerLabel,
    provider_deployment: input.providerDeployment,
    external_user_id: input.externalUserId,
    global_role_ids: Array.from(new Set(input.globalRoleIds ?? existingUser.global_role_ids ?? [])),
    global_permissions: Array.from(new Set(input.globalPermissions ?? existingUser.global_permissions ?? [])),
    memberships: nextMemberships
  };

  upsertDirectoryUser(nextUser);
  return clone(nextUser);
}

function seedCmsAdminTenantProjection(): void {
  const cmsTenantIds = new Set([
    '6db41674-f92a-4d7d-8dbf-c4ca6b5b72bc',
    'northstar-holdings',
    'civic-services',
    'innovation-lab',
  ]);
  syncLocalUserFromExternalIdentity({
    email: 'cms.admin@iam.local',
    externalUserId: 'iam-user-cms-admin',
    providerId: 'IAM_REALM',
    providerLabel: 'IAM Realm',
    providerDeployment: 'local',
    firstName: 'Casey',
    lastName: 'Administrator',
    memberships: localTenants.filter((tenant) => cmsTenantIds.has(tenant.id)).map((tenant) => ({
      tenantId: tenant.id,
      role: 'admin',
    })),
    defaultTenantId: '6db41674-f92a-4d7d-8dbf-c4ca6b5b72bc',
    authoritativeMemberships: false,
  });
}

function seedRgpAdminTenantProjection(): void {
  const rgpTenantIds = new Set([
    'workflow-ops-lab',
    '6db41674-f92a-4d7d-8dbf-c4ca6b5b72bc',
  ]);
  syncLocalUserFromExternalIdentity({
    email: 'rgp.admin@iam.local',
    externalUserId: 'iam-user-rgp-admin',
    providerId: 'IAM_REALM',
    providerLabel: 'IAM Realm',
    providerDeployment: 'local',
    firstName: 'Riley',
    lastName: 'Governance',
    memberships: localTenants.filter((tenant) => rgpTenantIds.has(tenant.id)).map((tenant) => ({
      tenantId: tenant.id,
      role: 'admin',
    })),
    defaultTenantId: 'workflow-ops-lab',
    authoritativeMemberships: false,
  });
}

seedCmsAdminTenantProjection();
seedRgpAdminTenantProjection();

export function updateLocalTenant(tenantId: string, updates: Partial<LocalTenant>): LocalTenant {
  const existingTenant = getLocalTenant(tenantId);
  if (!existingTenant) {
    throw new Error(`Unknown tenant: ${tenantId}`);
  }

  const normalizedDomain = updates.domain !== undefined ? normalizeDomain(updates.domain) : existingTenant.domain;
  if (
    normalizedDomain &&
    getAllTenants().some((tenant) => tenant.id !== tenantId && normalizeDomain(tenant.domain) === normalizedDomain)
  ) {
    throw new Error(`An organization with domain ${normalizedDomain} already exists`);
  }

  const nextTenant: LocalTenant = {
    ...existingTenant,
    ...updates,
    domain: normalizedDomain,
    service_entitlement: normalizeServiceEntitlementValue(
      updates.service_entitlement ?? existingTenant.service_entitlement,
      existingTenant.service_entitlement,
    ),
    features: updates.features ? normalizeTenantFeatures(updates.features) : existingTenant.features
  };

  nextTenant.max_aircraft = updates.max_managed_assets ?? updates.max_aircraft ?? existingTenant.max_aircraft;
  nextTenant.max_managed_assets = updates.max_managed_assets ?? updates.max_aircraft ?? existingTenant.max_managed_assets;
  syncTenantAliases(nextTenant);

  const dynamicTenantIndex = directoryState.tenants.findIndex((tenant) => tenant.id === tenantId);
  if (dynamicTenantIndex >= 0) {
    directoryState.tenants[dynamicTenantIndex] = nextTenant;
  } else {
    directoryState.tenants.push(nextTenant);
  }

  persistDirectoryState();
  return cloneTenant(nextTenant);
}

export function updateLocalTenantMembershipPermissions(
  tenantId: string,
  userId: string,
  permissions: LocalPermission[],
): LocalUser {
  const existingUser = getLocalUser(userId);
  if (!existingUser) {
    throw new Error(`Unable to resolve tenant member ${userId} for ${tenantId}`);
  }

  const membership = findStoredMembership(existingUser, tenantId);
  if (!membership) {
    throw new Error(`User ${userId} does not belong to tenant ${tenantId}`);
  }

  const nextMemberships = existingUser.memberships.map((candidate) => (
    candidate.tenant_id === tenantId
      ? {
          ...candidate,
          permissions: Array.from(new Set(permissions))
        }
      : candidate
  ));

  const nextUser: LocalUser = {
    ...existingUser,
    memberships: nextMemberships
  };

  upsertDirectoryUser(nextUser);
  return clone(nextUser);
}

export function updateLocalTenantUserRole(
  tenantId: string,
  userId: string,
  role: LocalManagedMembershipRoleInput
): LocalUser {
  const tenant = getLocalTenant(tenantId);
  const existingUser = getLocalUser(userId);
  if (!tenant || !existingUser) {
    throw new Error(`Unable to resolve tenant member ${userId} for ${tenantId}`);
  }

  if (tenant.owner_user_id === userId) {
    throw new Error('Tenant owner role must be managed through the organization account configuration');
  }

  const membership = findStoredMembership(existingUser, tenantId);
  if (!membership) {
    throw new Error(`User ${userId} does not belong to tenant ${tenantId}`);
  }

  const template = roleTemplateForManagedRole(role, tenant);
  const nextMemberships = existingUser.memberships.map((candidate) => (
    candidate.tenant_id === tenantId
      ? {
          ...candidate,
          role_id: template.roleId,
          role_label: template.roleLabel,
          permissions: [...template.permissions]
        }
      : candidate
  ));

  const nextUser: LocalUser = {
    ...existingUser,
    role: template.roleLabel,
    memberships: nextMemberships
  };

  upsertDirectoryUser(nextUser);
  return clone(nextUser);
}

export function removeLocalTenantUser(tenantId: string, userId: string): void {
  const tenant = getLocalTenant(tenantId);
  const existingUser = getLocalUser(userId);
  if (!tenant || !existingUser) {
    throw new Error(`Unable to resolve tenant member ${userId} for ${tenantId}`);
  }

  if (tenant.owner_user_id === userId) {
    throw new Error('Tenant owner cannot be removed from the tenant registry through settings');
  }

  const nextMemberships = existingUser.memberships.filter((membership) => membership.tenant_id !== tenantId);
  if (nextMemberships.length === existingUser.memberships.length) {
    throw new Error(`User ${userId} does not belong to tenant ${tenantId}`);
  }

  const nextTenantIds = existingUser.tenant_ids.filter((candidate) => candidate !== tenantId);
  const nextUser: LocalUser = {
    ...existingUser,
    memberships: nextMemberships,
    tenant_ids: nextTenantIds,
    default_tenant_id: nextTenantIds[0] ?? ''
  };

  if (nextTenantIds.length === 0) {
    const dynamicUserIndex = directoryState.users.findIndex((candidate) => candidate.id === userId);
    if (dynamicUserIndex >= 0) {
      directoryState.users.splice(dynamicUserIndex, 1);
      persistDirectoryState();
      return;
    }
  }

  upsertDirectoryUser(nextUser);
}

export function removeExternalIdentityUser(
  tenantId: string,
  providerId: string,
  externalUserId: string,
): void {
  const user = findLocalUserByExternalIdentity(tenantId, providerId, externalUserId);
  if (!user || user.auth_source !== 'external_identity') {
    return;
  }

  removeLocalTenantUser(tenantId, user.id);
}

export function getLocalResolvedMembership(userId: string, tenantId: string): LocalTenantMembership | null {
  const user = getLocalUser(userId);
  if (!user) {
    return null;
  }

  return buildResolvedMembership(user, tenantId);
}

export function listAccessibleSurfaceIds(userId: string, tenantId: string): string[] {
  return getLocalResolvedMembership(userId, tenantId)?.accessible_surface_ids ?? [];
}

export function hasLocalGlobalPermission(userId: string, permission: LocalGlobalPermission): boolean {
  const user = getLocalUser(userId);
  if (!user) {
    return false;
  }

  return (user.global_permissions ?? []).includes(permission);
}

export function validateLocalGlobalPermissionAccess(
  userId: string,
  requirement: {
    any_of?: LocalGlobalPermission[];
    all_of?: LocalGlobalPermission[];
  }
): {
  allowed: boolean;
  reason?: string;
} {
  const user = getLocalUser(userId);
  if (!user) {
    return {
      allowed: false,
      reason: `Unknown user: ${userId}`
    };
  }

  const permissions = new Set(user.global_permissions ?? []);
  if (requirement.all_of && !requirement.all_of.every((permission) => permissions.has(permission))) {
    return {
      allowed: false,
      reason: `User ${userId} does not have the required global permissions`
    };
  }

  if (requirement.any_of && !requirement.any_of.some((permission) => permissions.has(permission))) {
    return {
      allowed: false,
      reason: `User ${userId} does not have any of the required global permissions`
    };
  }

  return { allowed: true };
}

export function validateLocalTenantAccess(userId: string, tenantId: string): {
  allowed: boolean;
  reason?: string;
} {
  const user = getLocalUser(userId);
  if (!user) {
    return {
      allowed: false,
      reason: `Unknown user: ${userId}`
    };
  }

  const tenant = getLocalTenant(tenantId);
  if (!tenant) {
    return {
      allowed: false,
      reason: `Unknown tenant: ${tenantId}`
    };
  }

  if (tenant.status !== 'ACTIVE') {
    return {
      allowed: false,
      reason: `Tenant is not active: ${tenantId}`
    };
  }

  if (!buildResolvedMembership(user, tenantId)) {
    return {
      allowed: false,
      reason: `User ${userId} is not assigned to tenant ${tenantId}`
    };
  }

  return { allowed: true };
}

export function validateLocalPermissionAccess(
  userId: string,
  tenantId: string,
  requirement: PermissionRequirement
): {
  allowed: boolean;
  reason?: string;
} {
  const tenancy = validateLocalTenantAccess(userId, tenantId);
  if (!tenancy.allowed) {
    return tenancy;
  }

  const user = getLocalUser(userId);
  const tenant = getLocalTenant(tenantId);
  const membership = user ? buildResolvedMembership(user, tenantId) : null;

  if (!user || !tenant || !membership) {
    return {
      allowed: false,
      reason: 'Unable to resolve tenant membership for permission evaluation'
    };
  }

  if (!hasRequiredFeatures(tenant, requirement.required_features)) {
    return {
      allowed: false,
      reason: `Tenant ${tenantId} does not have the required feature set enabled`
    };
  }

  if (!hasRequiredFaaServices(tenant, requirement.required_faa_services)) {
    return {
      allowed: false,
      reason: `Tenant ${tenantId} does not include the required service entitlement`
    };
  }

  if (!hasAllowedProfile(tenant, requirement.allowed_profiles)) {
    return {
      allowed: false,
      reason: `Tenant ${tenantId} is not running an allowed deployment profile for this capability`
    };
  }

  if (requirement.all_of && !requirement.all_of.every((permission) => membership.permissions.includes(permission))) {
    const requiredPermissions = requirement.all_of.map((permission) => toLegacyPermissionId(permission));
    if (!requiredPermissions.every((permission) => membership.permissions.includes(permission as LocalPermission))) {
      return {
        allowed: false,
        reason: `Role ${membership.role_label} does not satisfy all required permissions`
      };
    }
  }

  if (requirement.any_of && !requirement.any_of.some((permission) => membership.permissions.includes(permission))) {
    const requiredPermissions = requirement.any_of.map((permission) => toLegacyPermissionId(permission));
    if (!requiredPermissions.some((permission) => membership.permissions.includes(permission as LocalPermission))) {
      return {
        allowed: false,
        reason: `Role ${membership.role_label} does not have permission for this action`
      };
    }
  }

  return { allowed: true };
}

export function validateLocalSurfaceAccess(userId: string, tenantId: string, surfaceId: string): {
  allowed: boolean;
  reason?: string;
} {
  const normalizedSurfaceId = toLegacySurfaceId(surfaceId);
  const rule = surfaceAccessRules[normalizedSurfaceId];
  if (!rule) {
    return { allowed: true };
  }

  if (!hasEnabledSurfaceFlag(normalizedSurfaceId, tenantId)) {
    return {
      allowed: false,
      reason: `Surface ${surfaceId} is disabled by feature flag for tenant ${tenantId}`
    };
  }

  return validateLocalPermissionAccess(userId, tenantId, {
    all_of: rule.permissions,
    required_features: rule.required_features,
    required_faa_services: rule.required_faa_services,
    allowed_profiles: rule.allowed_profiles
  });
}

export function buildTenantContext(userId: string, preferredTenantId?: string | null): TenantContextResponse | null {
  const user = getLocalUser(userId);
  if (!user) {
    return null;
  }

  const availableTenants = listLocalTenantsForUser(userId);
  const warnings: string[] = [];
  let selectionSource: TenantContextResponse['selection_source'] = 'default';

  const selectedTenant =
    availableTenants.find((tenant) => tenant.id === preferredTenantId) ??
    availableTenants.find((tenant) => tenant.id === user.default_tenant_id) ??
    availableTenants[0] ??
    null;

  if (preferredTenantId) {
    if (selectedTenant?.id === preferredTenantId) {
      selectionSource = 'requested';
    } else {
      selectionSource = 'fallback';
      warnings.push(`Requested tenant ${preferredTenantId} is unavailable for user ${userId}; defaulting to an accessible tenant.`);
    }
  }

  const resolvedUser = buildResolvedUser(user);
  const currentMembership =
    selectedTenant
      ? resolvedUser.memberships.find((membership) => membership.tenant_id === selectedTenant.id) ?? null
      : null;

  return {
    current_user: resolvedUser,
    current_membership: currentMembership,
    selected_tenant: selectedTenant,
    available_tenants: availableTenants.map((tenant) => cloneTenant(tenant)),
    operating_profile:
      selectedTenant
        ? LocalOperatingProfileStore.getOperatingProfile(selectedTenant, currentMembership)
        : null,
    selection_source: selectionSource,
    warnings
  };
}
