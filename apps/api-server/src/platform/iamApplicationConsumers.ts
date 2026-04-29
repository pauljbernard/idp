import {
  LocalIamFoundationStore,
  type IamApplicationAuthBindingDescriptor,
  type IamApplicationMembershipProjectionStrategy,
  type IamApplicationProjectionPolicyDescriptor,
  type IamConsumerContractDescriptor,
  type IamRealmBindingRecord,
} from './iamFoundation';
import {
  LocalIamProtocolRuntimeStore,
  type IamClientRecord,
  type IamClientScopeRecord,
} from './iamProtocolRuntime';
import {
  buildTenantContext,
  getLocalTenant,
  getLocalUser,
  type TenantContextResponse,
} from './tenants';

function nowIso(): string {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function assertApplicationBinding(bindingId: string): IamRealmBindingRecord {
  const binding = LocalIamFoundationStore.getRealmBinding(bindingId);
  if (binding.binding_target_kind !== 'APPLICATION') {
    throw new Error(`Binding ${bindingId} is not an application binding`);
  }
  return binding;
}

function assertUserTenantContext(userId: string, preferredTenantId?: string | null): TenantContextResponse {
  const context = buildTenantContext(userId, preferredTenantId);
  if (!context) {
    throw new Error(`Unable to resolve tenant context for user ${userId}`);
  }
  return context;
}

function resolvePrincipalTenantIds(user: NonNullable<ReturnType<typeof getLocalUser>>): string[] {
  const membershipTenantIds = user.memberships.map((membership) => membership.tenant_id);
  const candidateTenantIds = membershipTenantIds.length > 0 ? membershipTenantIds : user.tenant_ids;
  return Array.from(new Set(candidateTenantIds)).filter((tenantId) => {
    const tenant = getLocalTenant(tenantId);
    return Boolean(tenant && tenant.status === 'ACTIVE');
  });
}

function resolvePrincipalDefaultTenantId(
  user: NonNullable<ReturnType<typeof getLocalUser>>,
  tenantIds: string[],
): string {
  if (tenantIds.includes(user.default_tenant_id)) {
    return user.default_tenant_id;
  }
  return tenantIds[0] ?? user.default_tenant_id ?? '';
}

export type IamApplicationContractKind =
  | 'auth_bootstrap'
  | 'identity_bootstrap'
  | 'account_self_service'
  | 'projection_policy'
  | 'principal_context'
  | 'tenant_context'
  | 'identity_access_facts';

export interface IamApplicationContractEnvelope {
  kind: IamApplicationContractKind;
  version: string | null;
  binding_id: string;
  binding_target_id: string;
  application_id: string | null;
  application_name: string | null;
  informative_authorization_plane: IamConsumerContractDescriptor['informative_authorization_plane'] | null;
  enforcement_plane: IamConsumerContractDescriptor['enforcement_plane'] | null;
  enforcement_owner: string | null;
}

export interface IamApplicationContractProvenance {
  source_system: 'IDP';
  source_realm_id: string;
  source_binding_id: string;
  source_binding_target_id: string;
  source_contract_version: string | null;
  external_policy_sources: string[];
  projection_policy_id: string | null;
}

export interface IamApplicationContractCorrelation {
  request_header: 'X-Correlation-ID';
  response_field: 'correlation_id';
  external_handoff_header: 'X-External-Handoff-ID';
}

export interface IamApplicationContractManifestEntry {
  kind: IamApplicationContractKind;
  version: string | null;
  delivery_status: IamConsumerContractDescriptor['principal_context_delivery'] | null;
  route_path: string;
  auth_mode: 'public' | 'bearer_or_account_session' | 'account_session' | 'mixed';
  supported_query_parameters: string[];
  tenant_selection: 'none' | 'optional';
  summary: string;
}

export interface IamApplicationContractManifestResponse {
  generated_at: string;
  binding_id: string;
  binding_target_id: string;
  binding_target_name: string;
  application_id: string | null;
  application_name: string | null;
  current_contract_version: string | null;
  informative_authorization_plane: IamConsumerContractDescriptor['informative_authorization_plane'] | null;
  enforcement_plane: IamConsumerContractDescriptor['enforcement_plane'] | null;
  enforcement_owner: string | null;
  provenance: IamApplicationContractProvenance;
  correlation: IamApplicationContractCorrelation;
  contracts: IamApplicationContractManifestEntry[];
}

export interface IamApplicationTenantSummary {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  account_type: string;
  organization_kind: string | null;
  domain: string | null;
  subscription_tier: string;
  deployment_profile: string;
  assurance_mode: string;
  feature_ids: string[];
  feature_aliases: string[];
}

export interface IamApplicationMembershipSummary {
  tenant_id: string;
  role_id: string;
  role_alias_id: string | null;
  role_label: string;
  permission_ids: string[];
  permission_aliases: string[];
  accessible_surface_ids: string[];
  accessible_surface_aliases: string[];
}

export interface IamApplicationPrincipalSummary {
  id: string;
  email: string;
  communication_email: string;
  username: string;
  login_identifier: string;
  name: string;
  role: string;
  auth_source: string | null;
  provider_id: string | null;
  provider_label: string | null;
  provider_deployment: string | null;
  external_user_id: string | null;
  default_tenant_id: string;
  tenant_ids: string[];
}

export interface IamApplicationProjectionSummary {
  policy_id: string | null;
  summary: string | null;
  membership_projection_strategy: IamApplicationMembershipProjectionStrategy | null;
  sources: string[];
  selection_source: TenantContextResponse['selection_source'] | null;
}

export interface IamApplicationAuthBootstrapClientSummary {
  client_id: string;
  name: string;
  protocol: IamClientRecord['protocol'];
  access_type: IamClientRecord['access_type'];
  redirect_uris: string[];
  base_url: string | null;
  root_url: string | null;
}

export interface IamApplicationAuthBootstrapResponse {
  generated_at: string;
  contract: IamApplicationContractEnvelope;
  provenance: IamApplicationContractProvenance;
  correlation: IamApplicationContractCorrelation;
  binding_target_name: string;
  realm_id: string;
  realm_name: string;
  client: IamApplicationAuthBootstrapClientSummary;
  auth_binding: IamApplicationAuthBindingDescriptor;
  requested_scope_names: string[];
  optional_scope_names: string[];
  pkce_required: boolean;
  public_catalog_path: string;
  broker_catalog_path: string;
  oidc: null | {
    discovery_path: string;
    authorization_endpoint_path: string;
    token_endpoint_path: string;
    userinfo_endpoint_path: string;
    jwks_path: string;
    username_password_login_path: string;
    passkey_begin_path: string;
    passkey_complete_path: string;
    required_actions_path: string;
    consent_path: string;
    mfa_path: string;
    broker_login_path_template: string;
  };
  saml: null | {
    metadata_path: string;
    login_path: string;
    logout_path: string;
  };
  consumer_contract: IamConsumerContractDescriptor | null;
}

export interface IamApplicationIdentityBootstrapOperation {
  method: 'GET' | 'POST' | 'PUT';
  path: string;
  auth_mode: 'public' | 'account_session';
  summary: string;
}

export interface IamApplicationIdentityBootstrapResponse {
  generated_at: string;
  contract: IamApplicationContractEnvelope;
  provenance: IamApplicationContractProvenance;
  correlation: IamApplicationContractCorrelation;
  binding_target_name: string;
  realm_id: string;
  realm_name: string;
  delivery_status: IamConsumerContractDescriptor['identity_bootstrap_delivery'] | null;
  orchestration_model: 'external_handoff';
  public_registration_supported: boolean;
  handoff: {
    request_correlation_header: 'X-Correlation-ID';
    response_correlation_field: 'correlation_id';
    external_handoff_header: 'X-External-Handoff-ID';
  };
  operations: {
    public_registration?: IamApplicationIdentityBootstrapOperation;
    required_actions_complete: IamApplicationIdentityBootstrapOperation;
    password_reset_request: IamApplicationIdentityBootstrapOperation;
    password_reset_confirm: IamApplicationIdentityBootstrapOperation;
    email_verification_request: IamApplicationIdentityBootstrapOperation;
    email_verification_confirm: IamApplicationIdentityBootstrapOperation;
    organization_invitation_accept: IamApplicationIdentityBootstrapOperation;
  };
  consumer_contract: IamConsumerContractDescriptor | null;
}

export interface IamApplicationAccountSelfServiceResponse {
  generated_at: string;
  contract: IamApplicationContractEnvelope;
  provenance: IamApplicationContractProvenance;
  correlation: IamApplicationContractCorrelation;
  binding_target_name: string;
  realm_id: string;
  realm_name: string;
  delivery_status: IamConsumerContractDescriptor['account_self_service_delivery'] | null;
  required_session_header: 'X-IAM-Session-ID';
  capabilities: Array<'profile' | 'security' | 'passkeys' | 'password' | 'mfa' | 'sessions'>;
  session: {
    resolve_path: string;
  };
  profile: {
    read_path: string;
    update_path: string;
  };
  security: {
    overview_path: string;
  };
  passkeys: {
    register_begin_path: string;
    register_complete_path: string;
    credentials_path: string;
    revoke_path_template: string;
  };
  password: {
    change_path: string;
  };
  mfa: {
    enroll_path: string;
    verify_path: string;
    disable_path: string;
  };
  sessions: {
    list_path: string;
    revoke_path_template: string;
    revoke_others_path: string;
  };
  consumer_contract: IamConsumerContractDescriptor | null;
}

export interface IamApplicationProjectionPolicyResponse {
  generated_at: string;
  contract: IamApplicationContractEnvelope;
  provenance: IamApplicationContractProvenance;
  correlation: IamApplicationContractCorrelation;
  binding_target_name: string;
  realm_id: string;
  projection_policy: IamApplicationProjectionPolicyDescriptor;
  consumer_contract: IamConsumerContractDescriptor | null;
}

export interface IamApplicationCapabilityRecord {
  module_code: string;
  display_name: string;
  description: string;
  category: string;
  is_system: boolean;
}

export interface IamApplicationCapabilityCatalogResponse {
  generated_at: string;
  binding_id: string;
  binding_target_id: string;
  binding_target_name: string;
  application_id: string | null;
  application_name: string | null;
  realm_id: string;
  capabilities: IamApplicationCapabilityRecord[];
  count: number;
}

function resolveContractVersion(
  binding: IamRealmBindingRecord,
  requestedContractVersion?: string | null,
): string | null {
  const configuredVersion = binding.consumer_contract?.contract_version ?? null;
  const requestedVersion = normalizeOptionalText(requestedContractVersion);
  if (requestedVersion && configuredVersion && requestedVersion !== configuredVersion) {
    throw new Error(
      `Binding ${binding.id} exposes contract version ${configuredVersion}, not ${requestedVersion}`,
    );
  }

  return requestedVersion ?? configuredVersion;
}

function buildContractEnvelope(
  kind: IamApplicationContractKind,
  binding: IamRealmBindingRecord,
  requestedContractVersion?: string | null,
): IamApplicationContractEnvelope {
  return {
    kind,
    version: resolveContractVersion(binding, requestedContractVersion),
    binding_id: binding.id,
    binding_target_id: binding.binding_target_id,
    application_id: binding.consumer_contract?.application_id ?? null,
    application_name: binding.consumer_contract?.application_name ?? null,
    informative_authorization_plane: binding.consumer_contract?.informative_authorization_plane ?? null,
    enforcement_plane: binding.consumer_contract?.enforcement_plane ?? null,
    enforcement_owner: binding.consumer_contract?.enforcement_owner ?? null,
  };
}

const CREW_APPLICATION_CAPABILITY_CATALOG: IamApplicationCapabilityRecord[] = [
  { module_code: 'cap.workouts', display_name: 'Workout Management', description: 'Exercise library, workout builder, load tracking', category: 'training', is_system: true },
  { module_code: 'cap.progression', display_name: 'Program Templates & Periodization', description: 'Program templates, periodization models, training blocks', category: 'training', is_system: true },
  { module_code: 'cap.strength_vbt', display_name: 'Velocity-Based Training', description: 'VBT metrics, force-velocity profiling', category: 'training', is_system: true },
  { module_code: 'cap.endurance', display_name: 'Endurance Training', description: 'Running/cycling workouts, heart rate zones, VO2 max', category: 'training', is_system: true },
  { module_code: 'cap.skill_training', display_name: 'Skill Development', description: 'Sport-specific skills, technical drills, skill progression tracking', category: 'training', is_system: true },
  { module_code: 'cap.readiness', display_name: 'Daily Readiness', description: 'Wellness surveys, soreness tracking, mood, sleep quality', category: 'monitoring', is_system: true },
  { module_code: 'cap.field_load', display_name: 'GPS & Field Sports Tracking', description: 'GPS tracking, field load monitoring, session RPE', category: 'monitoring', is_system: true },
  { module_code: 'cap.wearables', display_name: 'Wearable Integration', description: 'HRV, sleep tracking, recovery metrics from wearables', category: 'monitoring', is_system: true },
  { module_code: 'cap.analytics', display_name: 'Analytics & Dashboards', description: 'Performance dashboards, data visualization, trend analysis', category: 'monitoring', is_system: true },
  { module_code: 'cap.rehab', display_name: 'Rehabilitation & Injury Management', description: 'Injury tracking, rehab protocols, return-to-play tracking', category: 'health', is_system: true },
  { module_code: 'cap.medical', display_name: 'Medical Notes (PHI/PII)', description: 'Protected health information, medical records', category: 'health', is_system: true },
  { module_code: 'cap.safety', display_name: 'Risk Management', description: 'Concussion protocols, baseline testing, injury risk assessment', category: 'health', is_system: true },
  { module_code: 'cap.video', display_name: 'Video Analysis', description: 'Video upload, tagging, frame-by-frame analysis, annotations', category: 'content', is_system: true },
  { module_code: 'cap.messaging', display_name: 'Communication', description: '1:1 messaging, team messaging, notifications', category: 'engagement', is_system: true },
  { module_code: 'cap.community', display_name: 'Social Features', description: 'Team feed, leaderboards, achievements, social sharing', category: 'engagement', is_system: true },
  { module_code: 'cap.content_library', display_name: 'Content Management', description: 'Educational content, resources, document library', category: 'content', is_system: true },
  { module_code: 'cap.nutrition', display_name: 'Nutrition Tracking', description: 'Meal logging, macro tracking, nutrition plans', category: 'lifestyle', is_system: true },
  { module_code: 'cap.lifestyle', display_name: 'Lifestyle Tracking', description: 'Hydration, stress, general wellness', category: 'lifestyle', is_system: true },
  { module_code: 'cap.progress', display_name: 'Progress Tracking', description: 'Goal setting, achievements, personal records', category: 'engagement', is_system: true },
  { module_code: 'cap.admin_org', display_name: 'Organization Management', description: 'Tenant management, user management, permissions', category: 'administration', is_system: true },
  { module_code: 'cap.identity', display_name: 'Identity & Access Management', description: 'Authentication, SSO, MFA, session management', category: 'administration', is_system: true },
  { module_code: 'cap.subscription', display_name: 'Subscription Management', description: 'Plans, billing, payments, subscription lifecycle', category: 'administration', is_system: true },
  { module_code: 'cap.product_catalog', display_name: 'Product & Services', description: 'Service offerings, pricing, packages', category: 'commerce', is_system: true },
  { module_code: 'cap.orders', display_name: 'Order Placement', description: 'Purchase products, place orders, manage subscriptions', category: 'commerce', is_system: true },
  { module_code: 'cap.scheduling', display_name: 'Appointment Scheduling', description: 'Calendar, booking, availability management', category: 'operations', is_system: true },
  { module_code: 'cap.integration', display_name: 'Third-Party Integrations', description: 'API integrations, webhooks, data sync', category: 'operations', is_system: true },
  { module_code: 'cap.data_access', display_name: 'Data Export & Audit', description: 'Data export, audit logs, compliance reporting', category: 'administration', is_system: true },
  { module_code: 'cap.cms', display_name: 'Content Management System', description: 'CMS content types, entries, media management', category: 'content', is_system: true },
  { module_code: 'cap.onboarding', display_name: 'User Onboarding', description: 'Onboarding workflows, guided setup, welcome flows', category: 'engagement', is_system: true },
  { module_code: 'cap.admin_users', display_name: 'User Administration', description: 'Administrative user lifecycle, access, and account management', category: 'administration', is_system: true },
  { module_code: 'cap.admin_billing', display_name: 'Billing Administration', description: 'Billing, subscriptions, invoicing, and financial administration', category: 'administration', is_system: true },
  { module_code: 'cap.admin_roles', display_name: 'RBAC Administration', description: 'Role, group, and permission administration', category: 'administration', is_system: true },
  { module_code: 'cap.admin_compliance', display_name: 'Compliance Administration', description: 'Compliance, privacy, audit, and retention administration', category: 'administration', is_system: true },
  { module_code: 'cap.admin_platform', display_name: 'Platform Administration', description: 'Platform configuration, tenant application settings, and operational controls', category: 'administration', is_system: true },
  { module_code: 'cap.password_reset', display_name: 'Password Reset', description: 'Administrative password reset and credential recovery actions', category: 'administration', is_system: true },
  { module_code: 'cap.reporting', display_name: 'Reporting', description: 'Operational, financial, and administrative reporting surfaces', category: 'monitoring', is_system: true },
];

const CREW_OPERATOR_CAPABILITIES = [
  'cap.analytics',
  'cap.cms',
  'cap.content_library',
  'cap.messaging',
  'cap.onboarding',
  'cap.progress',
  'cap.progression',
  'cap.reporting',
  'cap.scheduling',
  'cap.video',
  'cap.workouts',
];

function buildApplicationCapabilityCatalog(binding: IamRealmBindingRecord): IamApplicationCapabilityRecord[] {
  switch (binding.consumer_contract?.application_id) {
    case 'crew':
      return clone(CREW_APPLICATION_CAPABILITY_CATALOG);
    default:
      return [];
  }
}

function resolveCrewApplicationCapabilities(input: {
  roleNames: string[];
  permissionAliases: string[];
  membershipRoleAliases: string[];
}): string[] {
  const catalog = CREW_APPLICATION_CAPABILITY_CATALOG.map((record) => record.module_code);
  const markers = new Set([
    ...input.roleNames,
    ...input.permissionAliases,
    ...input.membershipRoleAliases,
  ].map((value) => value.trim().toLowerCase()));

  if (['realm-admin', 'application-admin', 'tenant_admin', 'platform_administrator'].some((value) => markers.has(value))) {
    return catalog;
  }

  if (['tenant-operator', 'tenant_operator', 'operator'].some((value) => markers.has(value))) {
    return [...CREW_OPERATOR_CAPABILITIES];
  }

  if (['tenant-viewer', 'tenant_viewer', 'viewer', 'auditor'].some((value) => markers.has(value))) {
    return ['cap.analytics', 'cap.content_library', 'cap.progress', 'cap.reporting'];
  }

  return [];
}

function resolveApplicationCapabilities(binding: IamRealmBindingRecord, input: {
  roleNames: string[];
  permissionAliases: string[];
  membershipRoleAliases: string[];
}): string[] {
  switch (binding.consumer_contract?.application_id) {
    case 'crew':
      return resolveCrewApplicationCapabilities(input);
    default:
      return [];
  }
}

function buildManifestRoutePath(bindingId: string, kind: IamApplicationContractKind): string {
  switch (kind) {
    case 'auth_bootstrap':
      return `/api/v1/iam/application-bindings/${bindingId}/auth-bootstrap`;
    case 'identity_bootstrap':
      return `/api/v1/iam/application-bindings/${bindingId}/identity-bootstrap`;
    case 'account_self_service':
      return `/api/v1/iam/application-bindings/${bindingId}/account-self-service`;
    case 'projection_policy':
      return `/api/v1/iam/application-bindings/${bindingId}/projection-policy`;
    case 'principal_context':
      return `/api/v1/iam/application-bindings/${bindingId}/principal-context`;
    case 'tenant_context':
      return `/api/v1/iam/application-bindings/${bindingId}/tenant-context`;
    case 'identity_access_facts':
      return `/api/v1/iam/application-bindings/${bindingId}/identity-access-facts`;
    default:
      return `/api/v1/iam/application-bindings/${bindingId}`;
  }
}

function buildManifestEntry(
  binding: IamRealmBindingRecord,
  kind: IamApplicationContractKind,
  version: string | null,
): IamApplicationContractManifestEntry {
  switch (kind) {
    case 'auth_bootstrap':
      return {
        kind,
        version,
        delivery_status: null,
        route_path: buildManifestRoutePath(binding.id, kind),
        auth_mode: 'public',
        supported_query_parameters: ['contract_version'],
        tenant_selection: 'none',
        summary: 'Resolves public auth bootstrap posture for the application binding, including client, protocol, and supported sign-in modes.',
      };
    case 'identity_bootstrap':
      return {
        kind,
        version,
        delivery_status: binding.consumer_contract?.identity_bootstrap_delivery ?? null,
        route_path: buildManifestRoutePath(binding.id, kind),
        auth_mode: 'mixed',
        supported_query_parameters: ['contract_version'],
        tenant_selection: 'none',
        summary: 'Resolves identity-owned bootstrap, activation, verification, recovery, and invitation-acceptance handoff routes for the application binding.',
      };
    case 'account_self_service':
      return {
        kind,
        version,
        delivery_status: binding.consumer_contract?.account_self_service_delivery ?? null,
        route_path: buildManifestRoutePath(binding.id, kind),
        auth_mode: 'account_session',
        supported_query_parameters: ['contract_version'],
        tenant_selection: 'none',
        summary: 'Resolves account self-service capabilities and route posture for profile, security, passkeys, password, MFA, and session management.',
      };
    case 'projection_policy':
      return {
        kind,
        version,
        delivery_status: binding.consumer_contract?.identity_access_facts_delivery ?? null,
        route_path: buildManifestRoutePath(binding.id, kind),
        auth_mode: 'bearer_or_account_session',
        supported_query_parameters: ['contract_version'],
        tenant_selection: 'none',
        summary: 'Resolves the projection policy and provenance model used to publish binding-scoped identity access facts.',
      };
    case 'principal_context':
      return {
        kind,
        version,
        delivery_status: binding.consumer_contract?.principal_context_delivery ?? null,
        route_path: buildManifestRoutePath(binding.id, kind),
        auth_mode: 'bearer_or_account_session',
        supported_query_parameters: ['contract_version'],
        tenant_selection: 'none',
        summary: 'Resolves the authenticated principal summary for the application binding.',
      };
    case 'tenant_context':
      return {
        kind,
        version,
        delivery_status: binding.consumer_contract?.tenant_context_delivery ?? null,
        route_path: buildManifestRoutePath(binding.id, kind),
        auth_mode: 'bearer_or_account_session',
        supported_query_parameters: ['tenant_id', 'contract_version'],
        tenant_selection: 'optional',
        summary: 'Resolves selected-tenant context and available tenant summaries for the authenticated principal.',
      };
    case 'identity_access_facts':
      return {
        kind,
        version,
        delivery_status: binding.consumer_contract?.identity_access_facts_delivery ?? null,
        route_path: buildManifestRoutePath(binding.id, kind),
        auth_mode: 'bearer_or_account_session',
        supported_query_parameters: ['tenant_id', 'contract_version'],
        tenant_selection: 'optional',
        summary: 'Resolves identity-side roles, permissions, and accessible surface facts for the authenticated principal.',
      };
    default:
      return {
        kind,
        version,
        delivery_status: null,
        route_path: buildManifestRoutePath(binding.id, kind),
        auth_mode: 'bearer_or_account_session',
        supported_query_parameters: ['contract_version'],
        tenant_selection: 'none',
        summary: 'Application binding contract.',
      };
  }
}

function buildContractProvenance(binding: IamRealmBindingRecord): IamApplicationContractProvenance {
  return {
    source_system: 'IDP',
    source_realm_id: binding.realm_id,
    source_binding_id: binding.id,
    source_binding_target_id: binding.binding_target_id,
    source_contract_version: binding.consumer_contract?.contract_version ?? null,
    external_policy_sources: [...(binding.consumer_contract?.external_policy_sources ?? [])],
    projection_policy_id: binding.projection_policy?.policy_id ?? null,
  };
}

function buildContractCorrelation(): IamApplicationContractCorrelation {
  return {
    request_header: 'X-Correlation-ID',
    response_field: 'correlation_id',
    external_handoff_header: 'X-External-Handoff-ID',
  };
}

function shapeTenant(
  tenant: NonNullable<TenantContextResponse['selected_tenant']>,
): IamApplicationTenantSummary {
  return {
    id: tenant.id,
    name: tenant.name,
    status: tenant.status,
    account_type: tenant.account_type,
    organization_kind: tenant.organization_kind ?? null,
    domain: tenant.domain ?? null,
    subscription_tier: tenant.subscription_tier,
    deployment_profile: tenant.deployment_profile,
    assurance_mode: tenant.assurance_mode,
    feature_ids: [...tenant.features],
    feature_aliases: [...(tenant.feature_aliases ?? tenant.features)],
  };
}

function shapeMembership(
  membership: NonNullable<TenantContextResponse['current_membership']>,
): IamApplicationMembershipSummary {
  return {
    tenant_id: membership.tenant_id,
    role_id: membership.role_id,
    role_alias_id: membership.role_alias_id ?? null,
    role_label: membership.role_label,
    permission_ids: [...membership.permissions],
    permission_aliases: [...(membership.permission_aliases ?? membership.permissions)],
    accessible_surface_ids: [...membership.accessible_surface_ids],
    accessible_surface_aliases: [...(membership.accessible_surface_aliases ?? membership.accessible_surface_ids)],
  };
}

function resolveProtocolClient(binding: IamRealmBindingRecord): IamClientRecord {
  const clientId = binding.auth_binding?.client_id?.trim();
  if (!clientId) {
    throw new Error(`Binding ${binding.id} does not publish auth bootstrap metadata`);
  }

  const client = LocalIamProtocolRuntimeStore
    .listClients({ realm_id: binding.realm_id })
    .clients
    .find((candidate) => candidate.client_id === clientId);
  if (!client) {
    throw new Error(`Binding ${binding.id} references unknown IAM client ${clientId}`);
  }
  return client;
}

function resolveClientScopeNames(
  realmId: string,
  scopeIds: string[],
): IamClientScopeRecord['name'][] {
  const scopesById = new Map(
    LocalIamProtocolRuntimeStore
      .listClientScopes({ realm_id: realmId })
      .client_scopes
      .map((scope) => [scope.id, scope] as const),
  );
  return scopeIds
    .map((scopeId) => scopesById.get(scopeId)?.name ?? null)
    .filter((scopeName): scopeName is string => Boolean(scopeName));
}

function buildProjectionSummary(
  binding: IamRealmBindingRecord,
  selectionSource: TenantContextResponse['selection_source'] | null = null,
): IamApplicationProjectionSummary {
  return {
    policy_id: binding.projection_policy?.policy_id ?? null,
    summary: binding.projection_policy?.summary ?? null,
    membership_projection_strategy: binding.projection_policy?.membership_projection_strategy ?? null,
    sources: [...(binding.projection_policy?.projection_sources ?? [])],
    selection_source: selectionSource,
  };
}


function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(
    values
      .map((value) => normalizeOptionalText(value))
      .filter((value): value is string => Boolean(value)),
  ));
}

function deriveRealmRoleNames(roleIds: string[]): string[] {
  return uniqueStrings(roleIds.map((roleId) => {
    try {
      return LocalIamFoundationStore.getRoleById(roleId).name;
    } catch {
      return null;
    }
  }));
}

function deriveRealmGroupNames(groupIds: string[]): string[] {
  return uniqueStrings(groupIds.map((groupId) => {
    try {
      return LocalIamFoundationStore.getGroupById(groupId).name;
    } catch {
      return null;
    }
  }));
}

function buildRealmUserDisplayName(firstName: string, lastName: string, fallback: string): string {
  const displayName = `${firstName} ${lastName}`.trim();
  return displayName || fallback;
}

function assertRealmUserMatchesBinding(binding: IamRealmBindingRecord, userId: string) {
  const realmUser = LocalIamFoundationStore.getUserById(userId);
  if (realmUser.realm_id !== binding.realm_id) {
    throw new Error(`User ${userId} is not assigned to realm ${binding.realm_id}`);
  }
  return realmUser;
}

function buildExternalPrincipalSummary(
  binding: IamRealmBindingRecord,
  userId: string,
): IamApplicationPrincipalSummary {
  const realmUser = assertRealmUserMatchesBinding(binding, userId);
  const roleNames = deriveRealmRoleNames(realmUser.role_ids);
  return {
    id: realmUser.id,
    email: realmUser.email,
    communication_email: realmUser.email,
    username: realmUser.username,
    login_identifier: realmUser.username,
    name: buildRealmUserDisplayName(realmUser.first_name, realmUser.last_name, realmUser.username),
    role: roleNames[0] ?? realmUser.username,
    auth_source: 'external_identity',
    provider_id: binding.realm_id,
    provider_label: binding.realm_name,
    provider_deployment: 'local',
    external_user_id: realmUser.id,
    default_tenant_id: '',
    tenant_ids: [],
  } satisfies IamApplicationPrincipalSummary;
}

function resolvePrincipalLoginFields(
  binding: IamRealmBindingRecord,
  user: ReturnType<typeof getLocalUser>,
): {
  username: string | null;
  login_identifier: string | null;
  communication_email: string | null;
} {
  if (!user) {
    return {
      username: null,
      login_identifier: null,
      communication_email: null,
    };
  }

  if (user.auth_source === 'external_identity' && user.external_user_id) {
    try {
      const realmUser = LocalIamFoundationStore.getUserById(user.external_user_id);
      const username = normalizeOptionalText(realmUser.username);
      return {
        username,
        login_identifier: username,
        communication_email: normalizeOptionalText(realmUser.email) ?? normalizeOptionalText(user.email),
      };
    } catch {
      // Fall through to the projected local user record if the linked realm user is unavailable.
    }
  }

  const exactEmail = normalizeOptionalText(user.email);
  if (exactEmail) {
    const realmMatches = LocalIamFoundationStore.listUsers(
      {
        realm_id: binding.realm_id,
        search: exactEmail,
      },
      {
        limit: 200,
        offset: 0,
      },
    ).users.filter((candidate) => candidate.email.trim().toLowerCase() === exactEmail.toLowerCase());
    if (realmMatches.length === 1) {
      const username = normalizeOptionalText(realmMatches[0].username);
      return {
        username,
        login_identifier: username,
        communication_email: normalizeOptionalText(realmMatches[0].email) ?? exactEmail,
      };
    }
  }

  return {
    username: null,
    login_identifier: null,
    communication_email: normalizeOptionalText(user.email),
  };
}

function buildExternalIdentityAccessFacts(
  binding: IamRealmBindingRecord,
  userId: string,
): Pick<
  IamApplicationIdentityAccessFactsResponse,
  | 'user_id'
  | 'global_role_ids'
  | 'global_permissions'
  | 'global_accessible_surface_ids'
  | 'global_accessible_surface_aliases'
  | 'application_capabilities'
  | 'application_capability_aliases'
  | 'memberships'
  | 'current_membership'
  | 'selected_tenant'
  | 'projection'
> {
  const realmUser = assertRealmUserMatchesBinding(binding, userId);
  const roleNames = deriveRealmRoleNames(realmUser.role_ids);
  const groupNames = deriveRealmGroupNames(realmUser.group_ids);
  const globalPermissionAliases = uniqueStrings([
    ...roleNames,
    ...groupNames,
  ]);

  const applicationCapabilities = resolveApplicationCapabilities(binding, {
    roleNames,
    permissionAliases: globalPermissionAliases,
    membershipRoleAliases: [],
  });

  return {
    user_id: realmUser.id,
    global_role_ids: [...realmUser.role_ids],
    global_permissions: globalPermissionAliases,
    global_accessible_surface_ids: [],
    global_accessible_surface_aliases: [],
    application_capabilities: applicationCapabilities,
    application_capability_aliases: [...applicationCapabilities],
    memberships: [],
    current_membership: null,
    selected_tenant: null,
    projection: buildProjectionSummary(binding, null),
  };
}

export interface IamApplicationPrincipalContextResponse {
  generated_at: string;
  contract: IamApplicationContractEnvelope;
  provenance: IamApplicationContractProvenance;
  correlation: IamApplicationContractCorrelation;
  binding_target_name: string;
  realm_id: string;
  user: IamApplicationPrincipalSummary;
  consumer_contract: IamConsumerContractDescriptor | null;
}

export interface IamApplicationTenantContextContractResponse {
  generated_at: string;
  contract: IamApplicationContractEnvelope;
  provenance: IamApplicationContractProvenance;
  correlation: IamApplicationContractCorrelation;
  user_id: string;
  selection_source: TenantContextResponse['selection_source'];
  warnings: string[];
  selected_tenant: IamApplicationTenantSummary | null;
  available_tenants: IamApplicationTenantSummary[];
  current_membership: IamApplicationMembershipSummary | null;
  projection: IamApplicationProjectionSummary;
}

export interface IamApplicationIdentityAccessFactsResponse {
  generated_at: string;
  contract: IamApplicationContractEnvelope;
  provenance: IamApplicationContractProvenance;
  correlation: IamApplicationContractCorrelation;
  user_id: string;
  global_role_ids: string[];
  global_permissions: string[];
  global_accessible_surface_ids: string[];
  global_accessible_surface_aliases: string[];
  application_capabilities: string[];
  application_capability_aliases: string[];
  memberships: IamApplicationMembershipSummary[];
  current_membership: IamApplicationMembershipSummary | null;
  selected_tenant: IamApplicationTenantSummary | null;
  projection: IamApplicationProjectionSummary;
  contract_delivery: {
    identity_bootstrap: IamConsumerContractDescriptor['identity_bootstrap_delivery'] | null;
    principal_context: IamConsumerContractDescriptor['principal_context_delivery'] | null;
    tenant_context: IamConsumerContractDescriptor['tenant_context_delivery'] | null;
    identity_access_facts: IamConsumerContractDescriptor['identity_access_facts_delivery'] | null;
    account_self_service: IamConsumerContractDescriptor['account_self_service_delivery'] | null;
  };
}

export class LocalIamApplicationConsumerStore {
  static getContractManifest(
    bindingId: string,
    requestedContractVersion?: string | null,
  ): IamApplicationContractManifestResponse {
    const binding = assertApplicationBinding(bindingId);
    const version = resolveContractVersion(binding, requestedContractVersion);

    return {
      generated_at: nowIso(),
      binding_id: binding.id,
      binding_target_id: binding.binding_target_id,
      binding_target_name: binding.binding_target_name,
      application_id: binding.consumer_contract?.application_id ?? null,
      application_name: binding.consumer_contract?.application_name ?? null,
      current_contract_version: version,
      informative_authorization_plane: binding.consumer_contract?.informative_authorization_plane ?? null,
      enforcement_plane: binding.consumer_contract?.enforcement_plane ?? null,
      enforcement_owner: binding.consumer_contract?.enforcement_owner ?? null,
      provenance: buildContractProvenance(binding),
      correlation: buildContractCorrelation(),
      contracts: [
        ...(binding.auth_binding ? [buildManifestEntry(binding, 'auth_bootstrap', version)] : []),
        ...(binding.consumer_contract ? [buildManifestEntry(binding, 'identity_bootstrap', version)] : []),
        ...(binding.consumer_contract ? [buildManifestEntry(binding, 'account_self_service', version)] : []),
        ...(binding.projection_policy ? [buildManifestEntry(binding, 'projection_policy', version)] : []),
        buildManifestEntry(binding, 'principal_context', version),
        buildManifestEntry(binding, 'tenant_context', version),
        buildManifestEntry(binding, 'identity_access_facts', version),
      ],
    };
  }

  static getAuthBootstrap(
    bindingId: string,
    requestedContractVersion?: string | null,
  ): IamApplicationAuthBootstrapResponse {
    const binding = assertApplicationBinding(bindingId);
    const authBinding = binding.auth_binding ? clone(binding.auth_binding) : null;
    if (!authBinding) {
      throw new Error(`Binding ${binding.id} does not publish auth bootstrap metadata`);
    }

    const client = resolveProtocolClient(binding);
    const requestedScopeNames = resolveClientScopeNames(binding.realm_id, client.default_scope_ids);
    const optionalScopeNames = resolveClientScopeNames(binding.realm_id, client.optional_scope_ids);

    return {
      generated_at: nowIso(),
      contract: buildContractEnvelope('auth_bootstrap', binding, requestedContractVersion),
      provenance: buildContractProvenance(binding),
      correlation: buildContractCorrelation(),
      binding_target_name: binding.binding_target_name,
      realm_id: binding.realm_id,
      realm_name: binding.realm_name,
      client: {
        client_id: client.client_id,
        name: client.name,
        protocol: client.protocol,
        access_type: client.access_type,
        redirect_uris: [...client.redirect_uris],
        base_url: client.base_url,
        root_url: client.root_url,
      },
      auth_binding: authBinding,
      requested_scope_names: requestedScopeNames,
      optional_scope_names: optionalScopeNames,
      pkce_required: authBinding.preferred_authentication_mode === 'browser_authorization_code_pkce',
      public_catalog_path: '/api/v1/iam/public/catalog',
      broker_catalog_path: `/api/v1/iam/realms/${encodeURIComponent(binding.realm_id)}/brokers`,
      oidc: client.protocol === 'OIDC'
        ? {
            discovery_path: `/api/v1/iam/realms/${encodeURIComponent(binding.realm_id)}/.well-known/openid-configuration`,
            authorization_endpoint_path: `/api/v1/iam/realms/${encodeURIComponent(binding.realm_id)}/protocol/openid-connect/auth`,
            token_endpoint_path: `/api/v1/iam/realms/${encodeURIComponent(binding.realm_id)}/protocol/openid-connect/token`,
            userinfo_endpoint_path: `/api/v1/iam/realms/${encodeURIComponent(binding.realm_id)}/protocol/openid-connect/userinfo`,
            jwks_path: `/api/v1/iam/realms/${encodeURIComponent(binding.realm_id)}/protocol/openid-connect/certs`,
            username_password_login_path: `/api/v1/iam/realms/${encodeURIComponent(binding.realm_id)}/login`,
            passkey_begin_path: `/api/v1/iam/realms/${encodeURIComponent(binding.realm_id)}/login/passkey/begin`,
            passkey_complete_path: `/api/v1/iam/realms/${encodeURIComponent(binding.realm_id)}/login/passkey/complete`,
            required_actions_path: `/api/v1/iam/realms/${encodeURIComponent(binding.realm_id)}/login/required-actions`,
            consent_path: `/api/v1/iam/realms/${encodeURIComponent(binding.realm_id)}/login/consent`,
            mfa_path: `/api/v1/iam/realms/${encodeURIComponent(binding.realm_id)}/login/mfa`,
            broker_login_path_template: `/api/v1/iam/realms/${encodeURIComponent(binding.realm_id)}/brokers/:providerAlias/login`,
          }
        : null,
      saml: client.protocol === 'SAML'
        ? {
            metadata_path: `/api/v1/iam/realms/${encodeURIComponent(binding.realm_id)}/protocol/saml/metadata`,
            login_path: `/api/v1/iam/realms/${encodeURIComponent(binding.realm_id)}/protocol/saml/login`,
            logout_path: `/api/v1/iam/realms/${encodeURIComponent(binding.realm_id)}/protocol/saml/logout`,
          }
        : null,
      consumer_contract: binding.consumer_contract ? clone(binding.consumer_contract) : null,
    };
  }

  static getIdentityBootstrap(
    bindingId: string,
    requestedContractVersion?: string | null,
  ): IamApplicationIdentityBootstrapResponse {
    const binding = assertApplicationBinding(bindingId);
    const realmPath = `/api/v1/iam/realms/${encodeURIComponent(binding.realm_id)}`;

    return {
      generated_at: nowIso(),
      contract: buildContractEnvelope('identity_bootstrap', binding, requestedContractVersion),
      provenance: buildContractProvenance(binding),
      correlation: buildContractCorrelation(),
      binding_target_name: binding.binding_target_name,
      realm_id: binding.realm_id,
      realm_name: binding.realm_name,
      delivery_status: binding.consumer_contract?.identity_bootstrap_delivery ?? null,
      orchestration_model: 'external_handoff',
      public_registration_supported: binding.consumer_contract?.application_id === 'flightos',
      handoff: {
        request_correlation_header: 'X-Correlation-ID',
        response_correlation_field: 'correlation_id',
        external_handoff_header: 'X-External-Handoff-ID',
      },
      operations: {
        ...(binding.consumer_contract?.application_id === 'flightos'
          ? {
              public_authorization_request: {
                method: 'POST' as const,
                path: '/api/v1/iam/application-bindings/authorization-request',
                auth_mode: 'public' as const,
                summary: 'Creates an application-owned browser authorization request through the shared IDP using realm_id and client_id resolution.',
              },
              public_registration: {
                method: 'POST' as const,
                path: '/api/v1/iam/application-bindings/account-registration',
                auth_mode: 'public' as const,
                summary: 'Creates an application-owned account registration through the shared IDP using realm_id and client_id resolution.',
              },
            }
          : {}),
        required_actions_complete: {
          method: 'POST',
          path: `${realmPath}/login/required-actions`,
          auth_mode: 'public',
          summary: 'Completes identity-owned required actions for an existing login transaction.',
        },
        password_reset_request: {
          method: 'POST',
          path: `${realmPath}/password-reset/request`,
          auth_mode: 'public',
          summary: 'Starts an identity-owned password reset challenge for an existing principal.',
        },
        password_reset_confirm: {
          method: 'POST',
          path: `${realmPath}/password-reset/confirm`,
          auth_mode: 'public',
          summary: 'Confirms an issued password reset challenge and sets the next password.',
        },
        email_verification_request: {
          method: 'POST',
          path: `${realmPath}/email-verification/request`,
          auth_mode: 'public',
          summary: 'Starts an identity-owned email verification challenge for an existing principal.',
        },
        email_verification_confirm: {
          method: 'POST',
          path: `${realmPath}/email-verification/confirm`,
          auth_mode: 'public',
          summary: 'Confirms an issued email verification challenge.',
        },
        organization_invitation_accept: {
          method: 'POST',
          path: `${realmPath}/account/organization-invitations/:invitationId/accept`,
          auth_mode: 'account_session',
          summary: 'Accepts an IDP-owned organization invitation within an authenticated account session.',
        },
      },
      consumer_contract: binding.consumer_contract ? clone(binding.consumer_contract) : null,
    };
  }

  static getAccountSelfService(
    bindingId: string,
    requestedContractVersion?: string | null,
  ): IamApplicationAccountSelfServiceResponse {
    const binding = assertApplicationBinding(bindingId);
    const accountRootPath = `/api/v1/iam/realms/${encodeURIComponent(binding.realm_id)}/account`;

    return {
      generated_at: nowIso(),
      contract: buildContractEnvelope('account_self_service', binding, requestedContractVersion),
      provenance: buildContractProvenance(binding),
      correlation: buildContractCorrelation(),
      binding_target_name: binding.binding_target_name,
      realm_id: binding.realm_id,
      realm_name: binding.realm_name,
      delivery_status: binding.consumer_contract?.account_self_service_delivery ?? null,
      required_session_header: 'X-IAM-Session-ID',
      capabilities: ['profile', 'security', 'passkeys', 'password', 'mfa', 'sessions'],
      session: {
        resolve_path: `${accountRootPath}/session`,
      },
      profile: {
        read_path: `${accountRootPath}/profile`,
        update_path: `${accountRootPath}/profile`,
      },
      security: {
        overview_path: `${accountRootPath}/security`,
      },
      passkeys: {
        register_begin_path: `${accountRootPath}/webauthn/register/begin`,
        register_complete_path: `${accountRootPath}/webauthn/register/complete`,
        credentials_path: `${accountRootPath}/webauthn/credentials`,
        revoke_path_template: `${accountRootPath}/webauthn/credentials/:credentialId/revoke`,
      },
      password: {
        change_path: `${accountRootPath}/password`,
      },
      mfa: {
        enroll_path: `${accountRootPath}/mfa/enroll`,
        verify_path: `${accountRootPath}/mfa/verify`,
        disable_path: `${accountRootPath}/mfa/disable`,
      },
      sessions: {
        list_path: `${accountRootPath}/sessions`,
        revoke_path_template: `${accountRootPath}/sessions/:sessionId/revoke`,
        revoke_others_path: `${accountRootPath}/sessions/revoke-others`,
      },
      consumer_contract: binding.consumer_contract ? clone(binding.consumer_contract) : null,
    };
  }

  static getProjectionPolicy(
    bindingId: string,
    requestedContractVersion?: string | null,
  ): IamApplicationProjectionPolicyResponse {
    const binding = assertApplicationBinding(bindingId);
    const projectionPolicy = binding.projection_policy ? clone(binding.projection_policy) : null;
    if (!projectionPolicy) {
      throw new Error(`Binding ${binding.id} does not publish projection policy metadata`);
    }

    return {
      generated_at: nowIso(),
      contract: buildContractEnvelope('projection_policy', binding, requestedContractVersion),
      provenance: buildContractProvenance(binding),
      correlation: buildContractCorrelation(),
      binding_target_name: binding.binding_target_name,
      realm_id: binding.realm_id,
      projection_policy: projectionPolicy,
      consumer_contract: binding.consumer_contract ? clone(binding.consumer_contract) : null,
    };
  }

  static getPrincipalContext(
    bindingId: string,
    userId: string,
    requestedContractVersion?: string | null,
  ): IamApplicationPrincipalContextResponse {
    const binding = assertApplicationBinding(bindingId);
    const user = getLocalUser(userId);
    const principalLoginFields = resolvePrincipalLoginFields(binding, user);
    const tenantIds = user ? resolvePrincipalTenantIds(user) : [];
    const defaultTenantId = user ? resolvePrincipalDefaultTenantId(user, tenantIds) : '';

    return {
      generated_at: nowIso(),
      contract: buildContractEnvelope('principal_context', binding, requestedContractVersion),
      provenance: buildContractProvenance(binding),
      correlation: buildContractCorrelation(),
      binding_target_name: binding.binding_target_name,
      realm_id: binding.realm_id,
      user: user
        ? {
            id: user.id,
            email: user.email,
            communication_email: principalLoginFields.communication_email ?? user.email,
            username: principalLoginFields.username ?? '',
            login_identifier: principalLoginFields.login_identifier ?? principalLoginFields.username ?? '',
            name: user.name,
            role: user.role,
            auth_source: user.auth_source ?? null,
            provider_id: user.provider_id ?? null,
            provider_label: user.provider_label ?? null,
            provider_deployment: user.provider_deployment ?? null,
            external_user_id: user.external_user_id ?? null,
            default_tenant_id: defaultTenantId,
            tenant_ids: [...tenantIds],
          } satisfies IamApplicationPrincipalSummary
        : buildExternalPrincipalSummary(binding, userId),
      consumer_contract: binding.consumer_contract ? clone(binding.consumer_contract) : null,
    };
  }

  static getTenantContext(
    bindingId: string,
    userId: string,
    preferredTenantId?: string | null,
    requestedContractVersion?: string | null,
  ): IamApplicationTenantContextContractResponse {
    const binding = assertApplicationBinding(bindingId);
    const user = getLocalUser(userId);
    const tenantContext = user ? assertUserTenantContext(userId, preferredTenantId) : null;

    if (!tenantContext) {
      assertRealmUserMatchesBinding(binding, userId);
      return {
        generated_at: nowIso(),
        contract: buildContractEnvelope('tenant_context', binding, requestedContractVersion),
        provenance: buildContractProvenance(binding),
        correlation: buildContractCorrelation(),
        user_id: userId,
        selection_source: 'default',
        warnings: ['Authenticated IAM realm user has not been projected into an application tenant context.'],
        selected_tenant: null,
        available_tenants: [],
        current_membership: null,
        projection: buildProjectionSummary(binding, null),
      };
    }

    return {
      generated_at: nowIso(),
      contract: buildContractEnvelope('tenant_context', binding, requestedContractVersion),
      provenance: buildContractProvenance(binding),
      correlation: buildContractCorrelation(),
      user_id: tenantContext.current_user.id,
      selection_source: tenantContext.selection_source,
      warnings: [...tenantContext.warnings],
      selected_tenant: tenantContext.selected_tenant ? shapeTenant(tenantContext.selected_tenant) : null,
      available_tenants: tenantContext.available_tenants.map((tenant) => shapeTenant(tenant)),
      current_membership: tenantContext.current_membership ? shapeMembership(tenantContext.current_membership) : null,
      projection: buildProjectionSummary(binding, tenantContext.selection_source),
    };
  }

  static getCapabilityCatalog(
    bindingId: string,
  ): IamApplicationCapabilityCatalogResponse {
    const binding = assertApplicationBinding(bindingId);
    const capabilities = buildApplicationCapabilityCatalog(binding);

    return {
      generated_at: nowIso(),
      binding_id: binding.id,
      binding_target_id: binding.binding_target_id,
      binding_target_name: binding.binding_target_name,
      application_id: binding.consumer_contract?.application_id ?? null,
      application_name: binding.consumer_contract?.application_name ?? null,
      realm_id: binding.realm_id,
      capabilities,
      count: capabilities.length,
    };
  }

  static getIdentityAccessFacts(
    bindingId: string,
    userId: string,
    preferredTenantId?: string | null,
    requestedContractVersion?: string | null,
  ): IamApplicationIdentityAccessFactsResponse {
    const binding = assertApplicationBinding(bindingId);
    const user = getLocalUser(userId);
    const tenantContext = user ? assertUserTenantContext(userId, preferredTenantId) : null;
    const selectedTenant = tenantContext?.selected_tenant
      ? getLocalTenant(tenantContext.selected_tenant.id)
      : null;

    return {
      generated_at: nowIso(),
      contract: buildContractEnvelope('identity_access_facts', binding, requestedContractVersion),
      provenance: buildContractProvenance(binding),
      correlation: buildContractCorrelation(),
      ...(tenantContext
        ? {
            user_id: tenantContext.current_user.id,
            global_role_ids: [...tenantContext.current_user.global_role_ids],
            global_permissions: [...tenantContext.current_user.global_permissions],
            global_accessible_surface_ids: [...tenantContext.current_user.global_accessible_surface_ids],
            global_accessible_surface_aliases: [...(tenantContext.current_user.global_accessible_surface_aliases ?? tenantContext.current_user.global_accessible_surface_ids)],
            application_capabilities: resolveApplicationCapabilities(binding, {
              roleNames: tenantContext.current_user.global_permissions,
              permissionAliases: tenantContext.current_user.global_permissions,
              membershipRoleAliases: tenantContext.current_user.memberships.flatMap((membership) => [membership.role_alias_id ?? membership.role_id, membership.role_label]),
            }),
            application_capability_aliases: resolveApplicationCapabilities(binding, {
              roleNames: tenantContext.current_user.global_permissions,
              permissionAliases: tenantContext.current_user.global_permissions,
              membershipRoleAliases: tenantContext.current_user.memberships.flatMap((membership) => [membership.role_alias_id ?? membership.role_id, membership.role_label]),
            }),
            memberships: tenantContext.current_user.memberships.map((membership) => shapeMembership(membership)),
            current_membership: tenantContext.current_membership ? shapeMembership(tenantContext.current_membership) : null,
            selected_tenant: selectedTenant ? shapeTenant(selectedTenant) : null,
            projection: buildProjectionSummary(binding, tenantContext.selection_source),
          }
        : buildExternalIdentityAccessFacts(binding, userId)),
      contract_delivery: {
        identity_bootstrap: binding.consumer_contract?.identity_bootstrap_delivery ?? null,
        principal_context: binding.consumer_contract?.principal_context_delivery ?? null,
        tenant_context: binding.consumer_contract?.tenant_context_delivery ?? null,
        identity_access_facts: binding.consumer_contract?.identity_access_facts_delivery ?? null,
        account_self_service: binding.consumer_contract?.account_self_service_delivery ?? null,
      },
    };
  }
}
