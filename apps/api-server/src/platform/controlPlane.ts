import { loadOrCreatePersistedState, savePersistedState } from './persistence';
import { LocalSecretStore } from './secretStore';
import { parseStandaloneManagedRole, type StandaloneManagedRole, type StandaloneManagedRoleInput } from './tenantAliases';
import {
  getLocalTenant,
  removeExternalIdentityUser,
  upsertExternalIdentityUser
} from './tenants';

export type ControlPlaneDomain = 'identity' | 'billing' | 'organization';
export type ControlPlaneMode = 'local' | 'hybrid' | 'external';
export type ControlPlaneStatus = 'connected' | 'not_configured' | 'needs_attention' | 'sync_required';
export type ProviderDeployment = 'local' | 'aws_native' | 'commercial' | 'open_source';
export type TeamMemberRole = StandaloneManagedRole;
type TeamMemberRoleInput = StandaloneManagedRoleInput;
export type TeamMemberStatus = 'active' | 'inactive' | 'suspended';

export interface ControlPlaneConfigurationField {
  id: string;
  label: string;
  type: 'text' | 'password' | 'boolean' | 'number' | 'select';
  required: boolean;
  secret?: boolean;
  placeholder?: string;
  options?: string[];
  help_text?: string;
}

export interface ControlPlaneProviderDefinition {
  id: string;
  domain: ControlPlaneDomain;
  label: string;
  vendor: string;
  deployment: ProviderDeployment;
  summary: string;
  capabilities: string[];
  configuration_fields: ControlPlaneConfigurationField[];
}

export interface ControlPlaneSecretFieldReference {
  field_id: string;
  reference_id: string;
  preview: string;
  last_rotated_at: string;
}

export interface TenantControlPlaneDomainConfiguration {
  tenant_id: string;
  domain: ControlPlaneDomain;
  mode: ControlPlaneMode;
  status: ControlPlaneStatus;
  provider_id: string;
  provider_label: string;
  vendor: string;
  deployment: ProviderDeployment;
  sync_enabled: boolean;
  last_sync_at: string | null;
  external_reference_id: string | null;
  notes: string | null;
  configuration: Record<string, string | number | boolean>;
  secret_fields: ControlPlaneSecretFieldReference[];
  capabilities: string[];
}

export interface TenantControlPlaneConfiguration {
  generated_at: string;
  tenant_id: string;
  identity: TenantControlPlaneDomainConfiguration;
  billing: TenantControlPlaneDomainConfiguration;
  organization: TenantControlPlaneDomainConfiguration;
}

export interface ControlPlaneCatalogResponse {
  generated_at: string;
  providers: ControlPlaneProviderDefinition[];
  count: number;
}

export interface ExternalIdentityMember {
  id: string;
  tenant_id: string;
  external_user_id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  lastLogin: string;
  invitedAt?: string;
  invitedBy?: string;
  managementScope: 'external_identity';
  provider_id: string;
  provider_label: string;
  provider_deployment: ProviderDeployment;
  source_groups: string[];
  last_sync_at: string;
}

export interface ExternalIdentityMemberListResponse {
  members: ExternalIdentityMember[];
  count: number;
}

interface StoredDomainConfiguration {
  mode: ControlPlaneMode;
  provider_id: string;
  sync_enabled: boolean;
  last_sync_at: string | null;
  external_reference_id: string | null;
  notes: string | null;
  configuration: Record<string, string | number | boolean>;
  secret_reference_ids: Record<string, string>;
}

interface ControlPlaneState {
  configurations_by_tenant: Record<string, Partial<Record<ControlPlaneDomain, StoredDomainConfiguration>>>;
  external_identity_members_by_tenant: Record<string, ExternalIdentityMember[]>;
}

interface UpdateControlPlaneConfigurationInput {
  mode?: ControlPlaneMode;
  provider_id?: string;
  sync_enabled?: boolean;
  external_reference_id?: string | null;
  notes?: string | null;
  configuration?: Record<string, unknown>;
}

interface SyncIdentityMembersInput {
  members?: Array<{
    external_user_id?: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role?: TeamMemberRoleInput;
    status?: TeamMemberStatus;
    lastLogin?: string;
    source_groups?: string[];
  }>;
}

interface UpdateExternalIdentityMemberInput {
  role?: TeamMemberRoleInput;
  status?: TeamMemberStatus;
}

export interface CreateExternalIdentityMemberInput {
  external_user_id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: TeamMemberRoleInput;
  status?: TeamMemberStatus;
  lastLogin?: string;
  invitedAt?: string;
  invitedBy?: string;
  provider_id: string;
  provider_label: string;
  provider_deployment: ProviderDeployment;
  source_groups?: string[];
}

const CONTROL_PLANE_STATE_FILE = 'control-plane-state.json';

const PROVIDERS: ControlPlaneProviderDefinition[] = [
  {
    id: 'LOCAL_DIRECTORY',
    domain: 'identity',
    label: 'Local Directory',
    vendor: 'IDP',
    deployment: 'local',
    summary: 'Standalone local user and tenant registry embedded directly in the standalone IDP control plane.',
    capabilities: ['local-auth', 'tenant-registry', 'offline-standalone'],
    configuration_fields: []
  },
  {
    id: 'AWS_COGNITO',
    domain: 'identity',
    label: 'AWS Cognito',
    vendor: 'Amazon Web Services',
    deployment: 'aws_native',
    summary: 'User pool and hosted-auth integration for AWS-native user management and OIDC flows.',
    capabilities: ['oidc', 'mfa', 'user-pools', 'hosted-ui'],
    configuration_fields: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'user_pool_id', label: 'User Pool ID', type: 'text', required: true, placeholder: 'us-east-1_example' },
      { id: 'app_client_id', label: 'App Client ID', type: 'text', required: true },
      { id: 'app_client_secret', label: 'App Client Secret', type: 'password', required: false, secret: true },
      { id: 'hosted_domain', label: 'Hosted UI Domain', type: 'text', required: false, placeholder: 'idp.auth.us-east-1.amazoncognito.com' }
    ]
  },
  {
    id: 'AWS_IAM_IDENTITY_CENTER',
    domain: 'identity',
    label: 'AWS IAM Identity Center',
    vendor: 'Amazon Web Services',
    deployment: 'aws_native',
    summary: 'AWS workforce identity integration with SCIM-style directory provisioning and SSO.',
    capabilities: ['sso', 'scim', 'directory-sync', 'aws-native'],
    configuration_fields: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'identity_store_id', label: 'Identity Store ID', type: 'text', required: true },
      { id: 'instance_arn', label: 'Instance ARN', type: 'text', required: true },
      { id: 'scim_endpoint', label: 'SCIM Endpoint', type: 'text', required: false },
      { id: 'access_token', label: 'Access Token', type: 'password', required: true, secret: true }
    ]
  },
  {
    id: 'KEYCLOAK',
    domain: 'identity',
    label: 'Keycloak',
    vendor: 'Keycloak',
    deployment: 'open_source',
    summary: 'Open-source identity and access management with OIDC, SAML, and admin API sync.',
    capabilities: ['oidc', 'saml', 'realm-sync', 'open-source'],
    configuration_fields: [
      { id: 'base_url', label: 'Base URL', type: 'text', required: true, placeholder: 'https://keycloak.example.com' },
      { id: 'realm', label: 'Realm', type: 'text', required: true },
      { id: 'client_id', label: 'Client ID', type: 'text', required: true },
      { id: 'client_secret', label: 'Client Secret', type: 'password', required: true, secret: true }
    ]
  },
  {
    id: 'AUTHENTIK',
    domain: 'identity',
    label: 'Authentik',
    vendor: 'Authentik',
    deployment: 'open_source',
    summary: 'Open-source SSO and directory automation with provider-managed application mappings.',
    capabilities: ['oidc', 'saml', 'directory-sync', 'open-source'],
    configuration_fields: [
      { id: 'base_url', label: 'Base URL', type: 'text', required: true, placeholder: 'https://auth.example.com' },
      { id: 'application_slug', label: 'Application Slug', type: 'text', required: true },
      { id: 'token', label: 'Service Token', type: 'password', required: true, secret: true }
    ]
  },
  {
    id: 'LOCAL_BILLING',
    domain: 'billing',
    label: 'Local Billing Ledger',
    vendor: 'IDP',
    deployment: 'local',
    summary: 'Standalone local billing ledger for self-contained environments and private deployments.',
    capabilities: ['local-invoices', 'plan-catalog', 'offline-standalone'],
    configuration_fields: []
  },
  {
    id: 'STRIPE',
    domain: 'billing',
    label: 'Stripe Billing',
    vendor: 'Stripe',
    deployment: 'commercial',
    summary: 'Commercial billing integration for subscriptions, payment methods, and invoice sync.',
    capabilities: ['subscriptions', 'invoices', 'payment-methods', 'webhooks'],
    configuration_fields: [
      { id: 'account_id', label: 'Stripe Account ID', type: 'text', required: false, placeholder: 'acct_123' },
      { id: 'publishable_key', label: 'Publishable Key', type: 'text', required: true, placeholder: 'pk_live_...' },
      { id: 'secret_key', label: 'Secret Key', type: 'password', required: true, secret: true, placeholder: 'sk_live_...' },
      { id: 'webhook_secret', label: 'Webhook Secret', type: 'password', required: false, secret: true }
    ]
  },
  {
    id: 'AWS_MARKETPLACE',
    domain: 'billing',
    label: 'AWS Marketplace',
    vendor: 'Amazon Web Services',
    deployment: 'aws_native',
    summary: 'AWS-native procurement and entitlement alignment for marketplace-style billing.',
    capabilities: ['marketplace-entitlements', 'aws-native', 'account-linking'],
    configuration_fields: [
      { id: 'product_code', label: 'Product Code', type: 'text', required: true },
      { id: 'aws_account_id', label: 'AWS Account ID', type: 'text', required: true },
      { id: 'entitlement_mode', label: 'Entitlement Mode', type: 'select', required: true, options: ['contract', 'consumption'] }
    ]
  },
  {
    id: 'KILL_BILL',
    domain: 'billing',
    label: 'Kill Bill',
    vendor: 'Kill Bill',
    deployment: 'open_source',
    summary: 'Open-source subscription and invoice management for self-hosted billing control planes.',
    capabilities: ['subscriptions', 'invoices', 'self-hosted', 'open-source'],
    configuration_fields: [
      { id: 'api_url', label: 'API URL', type: 'text', required: true, placeholder: 'https://billing.example.com' },
      { id: 'tenant_key', label: 'Tenant Key', type: 'text', required: true },
      { id: 'tenant_secret', label: 'Tenant Secret', type: 'password', required: true, secret: true }
    ]
  },
  {
    id: 'LOCAL_ORGANIZATION',
    domain: 'organization',
    label: 'Local Organization Registry',
    vendor: 'IDP',
    deployment: 'local',
    summary: 'Standalone organization, ownership, and seat-governance registry embedded in the standalone IDP.',
    capabilities: ['local-org', 'seat-governance', 'offline-standalone'],
    configuration_fields: []
  },
  {
    id: 'AWS_ORGANIZATIONS',
    domain: 'organization',
    label: 'AWS Organizations',
    vendor: 'Amazon Web Services',
    deployment: 'aws_native',
    summary: 'AWS-native account hierarchy and org metadata mapping for enterprise tenants.',
    capabilities: ['aws-native', 'account-hierarchy', 'org-metadata'],
    configuration_fields: [
      { id: 'management_account_id', label: 'Management Account ID', type: 'text', required: true },
      { id: 'organization_id', label: 'Organization ID', type: 'text', required: true, placeholder: 'o-xxxxxxxxxx' },
      { id: 'role_arn', label: 'Assume Role ARN', type: 'text', required: false }
    ]
  },
  {
    id: 'HUBSPOT',
    domain: 'organization',
    label: 'HubSpot',
    vendor: 'HubSpot',
    deployment: 'commercial',
    summary: 'Commercial CRM integration for organization records, contacts, and account lifecycle sync.',
    capabilities: ['crm', 'contacts', 'account-lifecycle'],
    configuration_fields: [
      { id: 'portal_id', label: 'Portal ID', type: 'text', required: true },
      { id: 'private_app_token', label: 'Private App Token', type: 'password', required: true, secret: true }
    ]
  },
  {
    id: 'ERP_NEXT',
    domain: 'organization',
    label: 'ERPNext',
    vendor: 'Frappe',
    deployment: 'open_source',
    summary: 'Open-source ERP and account registry integration for self-hosted organization sync.',
    capabilities: ['crm', 'erp', 'open-source', 'account-master'],
    configuration_fields: [
      { id: 'base_url', label: 'Base URL', type: 'text', required: true, placeholder: 'https://erp.example.com' },
      { id: 'api_key', label: 'API Key', type: 'password', required: true, secret: true },
      { id: 'api_secret', label: 'API Secret', type: 'password', required: true, secret: true }
    ]
  }
];

const state = loadOrCreatePersistedState<ControlPlaneState>(CONTROL_PLANE_STATE_FILE, () => ({
  configurations_by_tenant: {},
  external_identity_members_by_tenant: {}
}));

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

function persistState(): void {
  savePersistedState(CONTROL_PLANE_STATE_FILE, state);
}

function normalizeControlPlaneState(): void {
  let didMutate = false;

  Object.values(state.external_identity_members_by_tenant).forEach((members) => {
    members.forEach((member) => {
      const normalizedRole = assertTeamRole(member.role);
      if (member.role !== normalizedRole) {
        member.role = normalizedRole;
        didMutate = true;
      }
    });
  });

  if (didMutate) {
    persistState();
  }
}

function normalizeTenantId(tenantId: string): string {
  const normalized = tenantId.trim();
  if (normalized.length === 0) {
    throw new Error('Missing required field: tenantId');
  }

  return normalized;
}

normalizeControlPlaneState();

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeRequiredString(value: unknown, fieldName: string): string {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    throw new Error(`Missing required field: ${fieldName}`);
  }

  return normalized;
}

function findProvider(providerId: string, expectedDomain?: ControlPlaneDomain): ControlPlaneProviderDefinition {
  const provider = PROVIDERS.find((candidate) => candidate.id === providerId);
  if (!provider) {
    throw new Error(`Unsupported control-plane provider: ${providerId}`);
  }

  if (expectedDomain && provider.domain !== expectedDomain) {
    throw new Error(`Provider ${providerId} does not support the ${expectedDomain} control-plane domain`);
  }

  return provider;
}

function defaultProviderId(domain: ControlPlaneDomain): string {
  switch (domain) {
    case 'identity':
      return 'LOCAL_DIRECTORY';
    case 'billing':
      return 'LOCAL_BILLING';
    case 'organization':
      return 'LOCAL_ORGANIZATION';
    default:
      return 'LOCAL_DIRECTORY';
  }
}

function defaultStoredConfiguration(domain: ControlPlaneDomain): StoredDomainConfiguration {
  return {
    mode: 'local',
    provider_id: defaultProviderId(domain),
    sync_enabled: domain === 'identity',
    last_sync_at: null,
    external_reference_id: null,
    notes: null,
    configuration: {},
    secret_reference_ids: {}
  };
}

function ensureTenantConfigurations(tenantId: string): Record<ControlPlaneDomain, StoredDomainConfiguration> {
  const normalizedTenantId = normalizeTenantId(tenantId);
  const tenant = getLocalTenant(normalizedTenantId);
  if (!tenant) {
    throw new Error(`Unknown tenant: ${normalizedTenantId}`);
  }

  const existing = state.configurations_by_tenant[normalizedTenantId] ?? {};
  const nextConfiguration: Record<ControlPlaneDomain, StoredDomainConfiguration> = {
    identity: clone(existing.identity ?? defaultStoredConfiguration('identity')),
    billing: clone(existing.billing ?? defaultStoredConfiguration('billing')),
    organization: clone(existing.organization ?? defaultStoredConfiguration('organization'))
  };

  state.configurations_by_tenant[normalizedTenantId] = nextConfiguration;
  persistState();
  return nextConfiguration;
}

function ensureExternalMembers(tenantId: string): ExternalIdentityMember[] {
  const normalizedTenantId = normalizeTenantId(tenantId);
  if (!state.external_identity_members_by_tenant[normalizedTenantId]) {
    state.external_identity_members_by_tenant[normalizedTenantId] = [];
    persistState();
  }

  return state.external_identity_members_by_tenant[normalizedTenantId];
}

function readSecretFieldReferences(
  tenantId: string,
  domain: ControlPlaneDomain,
  providerId: string,
  storedConfiguration: StoredDomainConfiguration,
  provider: ControlPlaneProviderDefinition
): ControlPlaneSecretFieldReference[] {
  return provider.configuration_fields
    .filter((field) => field.secret)
    .map((field) => {
      const secretReferenceId = storedConfiguration.secret_reference_ids[field.id];
      if (!secretReferenceId) {
        return null;
      }

      const reference = LocalSecretStore.getSecretReference(secretReferenceId);
      if (!reference) {
        return null;
      }

      return {
        field_id: field.id,
        reference_id: reference.id,
        preview: reference.preview,
        last_rotated_at: reference.last_rotated_at
      };
    })
    .filter((reference): reference is ControlPlaneSecretFieldReference => Boolean(reference));
}

function computeConfigurationStatus(
  domain: ControlPlaneDomain,
  provider: ControlPlaneProviderDefinition,
  storedConfiguration: StoredDomainConfiguration
): ControlPlaneStatus {
  if (provider.deployment === 'local') {
    return 'connected';
  }

  const missingRequiredField = provider.configuration_fields.some((field) => {
    if (!field.required) {
      return false;
    }

    if (field.secret) {
      return !storedConfiguration.secret_reference_ids[field.id];
    }

    return storedConfiguration.configuration[field.id] === undefined || storedConfiguration.configuration[field.id] === '';
  });

  if (missingRequiredField) {
    return 'not_configured';
  }

  if (domain === 'identity' && storedConfiguration.sync_enabled && !storedConfiguration.last_sync_at) {
    return 'sync_required';
  }

  return 'connected';
}

function buildDomainConfiguration(
  tenantId: string,
  domain: ControlPlaneDomain,
  storedConfiguration: StoredDomainConfiguration
): TenantControlPlaneDomainConfiguration {
  const provider = findProvider(storedConfiguration.provider_id, domain);

  return {
    tenant_id: tenantId,
    domain,
    mode: storedConfiguration.mode,
    status: computeConfigurationStatus(domain, provider, storedConfiguration),
    provider_id: provider.id,
    provider_label: provider.label,
    vendor: provider.vendor,
    deployment: provider.deployment,
    sync_enabled: storedConfiguration.sync_enabled,
    last_sync_at: storedConfiguration.last_sync_at,
    external_reference_id: storedConfiguration.external_reference_id,
    notes: storedConfiguration.notes,
    configuration: clone(storedConfiguration.configuration),
    secret_fields: readSecretFieldReferences(tenantId, domain, provider.id, storedConfiguration, provider),
    capabilities: [...provider.capabilities]
  };
}

function normalizePrimitiveConfigurationValue(value: unknown): string | number | boolean {
  if (typeof value === 'boolean' || typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  throw new Error('Unsupported configuration value type');
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

function assertTeamRole(role: unknown): TeamMemberRole {
  const normalizedRole = parseStandaloneManagedRole(role);
  if (normalizedRole) {
    return normalizedRole;
  }

  throw new Error('Unsupported team member role');
}

function assertTeamStatus(status: unknown): TeamMemberStatus {
  if (status === 'active' || status === 'inactive' || status === 'suspended') {
    return status;
  }

  throw new Error('Unsupported team member status');
}

function buildSeededExternalMembers(tenantId: string, provider: ControlPlaneProviderDefinition): ExternalIdentityMember[] {
  const seededEmails = provider.id === 'AWS_COGNITO'
    ? ['aws.operator@northstar.example', 'aws.viewer@northstar.example']
    : provider.id === 'AWS_IAM_IDENTITY_CENTER'
      ? ['identity.admin@northstar.example', 'identity.viewer@northstar.example']
      : provider.id === 'KEYCLOAK'
        ? ['keycloak.ops@northstar.example', 'keycloak.viewer@northstar.example']
        : provider.id === 'AUTHENTIK'
          ? ['authentik.admin@northstar.example', 'authentik.viewer@northstar.example']
          : ['external.admin@northstar.example'];

  return seededEmails.map((email, index) => {
    const name = splitEmailName(email);
    const roleCycle: TeamMemberRole[] = ['admin', 'operator', 'specialist', 'viewer'];
    const role = roleCycle[index % roleCycle.length];
    const timestamp = nowIso();
    return {
      id: `external-${provider.id.toLowerCase()}-${index + 1}`,
      tenant_id: tenantId,
      external_user_id: `${provider.id.toLowerCase()}-user-${index + 1}`,
      email,
      firstName: name.firstName,
      lastName: name.lastName,
      role,
      status: 'active',
      lastLogin: timestamp,
      managementScope: 'external_identity',
      provider_id: provider.id,
      provider_label: provider.label,
      provider_deployment: provider.deployment,
      source_groups: role === 'admin' ? ['idp-admins'] : ['idp-operators'],
      last_sync_at: timestamp
    };
  });
}

function mapImportedExternalMember(
  tenantId: string,
  provider: ControlPlaneProviderDefinition,
  candidate: SyncIdentityMembersInput['members'][number],
  index: number
): ExternalIdentityMember {
  const email = normalizeRequiredString(candidate?.email, `members[${index}].email`).toLowerCase();
  const name = splitName(
    `${normalizeOptionalString(candidate?.firstName) ?? ''} ${normalizeOptionalString(candidate?.lastName) ?? ''}`.trim() ||
      splitEmailName(email).firstName
  );
  const lastName = normalizeOptionalString(candidate?.lastName) ?? name.lastName;

  return {
    id: `external-${provider.id.toLowerCase()}-${Date.now().toString(36)}-${index}`,
    tenant_id: tenantId,
    external_user_id: normalizeOptionalString(candidate?.external_user_id) ?? `${provider.id.toLowerCase()}-${index + 1}`,
    email,
    firstName: normalizeOptionalString(candidate?.firstName) ?? name.firstName,
    lastName,
    role: candidate?.role ? assertTeamRole(candidate.role) : 'viewer',
    status: candidate?.status ? assertTeamStatus(candidate.status) : 'active',
    lastLogin: normalizeOptionalString(candidate?.lastLogin) ?? '',
    managementScope: 'external_identity',
    provider_id: provider.id,
    provider_label: provider.label,
    provider_deployment: provider.deployment,
    source_groups: Array.isArray(candidate?.source_groups)
      ? candidate!.source_groups.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : [],
    last_sync_at: nowIso()
  };
}

export class LocalControlPlaneStore {
  static listProviders(domain?: ControlPlaneDomain): ControlPlaneCatalogResponse {
    const providers = domain ? PROVIDERS.filter((provider) => provider.domain === domain) : PROVIDERS;
    return {
      generated_at: nowIso(),
      providers: providers.map((provider) => clone(provider)),
      count: providers.length
    };
  }

  static getTenantConfiguration(tenantId: string): TenantControlPlaneConfiguration {
    const normalizedTenantId = normalizeTenantId(tenantId);
    const configurations = ensureTenantConfigurations(normalizedTenantId);

    return {
      generated_at: nowIso(),
      tenant_id: normalizedTenantId,
      identity: buildDomainConfiguration(normalizedTenantId, 'identity', configurations.identity),
      billing: buildDomainConfiguration(normalizedTenantId, 'billing', configurations.billing),
      organization: buildDomainConfiguration(normalizedTenantId, 'organization', configurations.organization)
    };
  }

  static updateDomainConfiguration(
    tenantId: string,
    domain: ControlPlaneDomain,
    actorUserId: string,
    updates: UpdateControlPlaneConfigurationInput
  ): TenantControlPlaneDomainConfiguration {
    const normalizedTenantId = normalizeTenantId(tenantId);
    const configurations = ensureTenantConfigurations(normalizedTenantId);
    const existing = configurations[domain];
    const nextProviderId = normalizeOptionalString(updates.provider_id) ?? existing.provider_id;
    const provider = findProvider(nextProviderId, domain);

    const nextConfiguration: StoredDomainConfiguration = {
      ...existing,
      mode: updates.mode ?? existing.mode,
      provider_id: provider.id,
      sync_enabled: typeof updates.sync_enabled === 'boolean' ? updates.sync_enabled : existing.sync_enabled,
      external_reference_id: updates.external_reference_id !== undefined
        ? normalizeOptionalString(updates.external_reference_id)
        : existing.external_reference_id,
      notes: updates.notes !== undefined ? normalizeOptionalString(updates.notes) : existing.notes,
      configuration: {},
      secret_reference_ids: {}
    };

    const previousProvider = findProvider(existing.provider_id, domain);
    const carriedPlainFieldIds = new Set(
      previousProvider.configuration_fields.filter((field) => !field.secret).map((field) => field.id)
    );
    const carriedSecretFieldIds = new Set(
      previousProvider.configuration_fields.filter((field) => field.secret).map((field) => field.id)
    );

    provider.configuration_fields.forEach((field) => {
      const incomingValue = updates.configuration ? updates.configuration[field.id] : undefined;

      if (field.secret) {
        if (typeof incomingValue === 'string' && incomingValue.trim().length > 0) {
          const reference = LocalSecretStore.upsertOpaqueSecret({
            tenantId: normalizedTenantId,
            subjectType: `control_plane_${domain}`,
            subjectId: `${normalizedTenantId}:${provider.id}:${field.id}`,
            kind: 'integration_credential',
            label: `${provider.label} ${field.label}`,
            value: incomingValue.trim(),
            createdByUserId: actorUserId,
            preview: `${provider.id.toLowerCase()}_${field.id}`
          });
          nextConfiguration.secret_reference_ids[field.id] = reference.id;
          return;
        }

        if (provider.id === existing.provider_id && existing.secret_reference_ids[field.id]) {
          nextConfiguration.secret_reference_ids[field.id] = existing.secret_reference_ids[field.id];
          return;
        }

        if (carriedSecretFieldIds.has(field.id) && existing.secret_reference_ids[field.id]) {
          nextConfiguration.secret_reference_ids[field.id] = existing.secret_reference_ids[field.id];
        }
        return;
      }

      if (incomingValue !== undefined) {
        nextConfiguration.configuration[field.id] = normalizePrimitiveConfigurationValue(incomingValue);
        return;
      }

      if (provider.id === existing.provider_id && existing.configuration[field.id] !== undefined) {
        nextConfiguration.configuration[field.id] = existing.configuration[field.id];
        return;
      }

      if (carriedPlainFieldIds.has(field.id) && existing.configuration[field.id] !== undefined) {
        nextConfiguration.configuration[field.id] = existing.configuration[field.id];
      }
    });

    if (provider.deployment === 'local') {
      nextConfiguration.mode = 'local';
      nextConfiguration.sync_enabled = domain === 'identity';
      nextConfiguration.last_sync_at = nowIso();
    }

    configurations[domain] = nextConfiguration;
    persistState();
    return buildDomainConfiguration(normalizedTenantId, domain, nextConfiguration);
  }

  static listExternalIdentityMembers(tenantId: string): ExternalIdentityMemberListResponse {
    const normalizedTenantId = normalizeTenantId(tenantId);
    const members = ensureExternalMembers(normalizedTenantId)
      .slice()
      .sort((leftItem, rightItem) => `${leftItem.firstName} ${leftItem.lastName}`.localeCompare(`${rightItem.firstName} ${rightItem.lastName}`))
      .map((member) => clone(member));

    return {
      members,
      count: members.length
    };
  }

  static syncIdentityMembers(
    tenantId: string,
    actorUserId: string,
    input: SyncIdentityMembersInput
  ): ExternalIdentityMemberListResponse {
    const normalizedTenantId = normalizeTenantId(tenantId);
    const configurations = ensureTenantConfigurations(normalizedTenantId);
    const identityConfiguration = configurations.identity;
    const provider = findProvider(identityConfiguration.provider_id, 'identity');

    if (provider.deployment === 'local') {
      const existingMembers = ensureExternalMembers(normalizedTenantId);
      existingMembers.forEach((member) => {
        removeExternalIdentityUser(normalizedTenantId, member.provider_id, member.external_user_id);
      });
      state.external_identity_members_by_tenant[normalizedTenantId] = [];
      identityConfiguration.last_sync_at = nowIso();
      persistState();
      return this.listExternalIdentityMembers(normalizedTenantId);
    }

    const previousMembers = ensureExternalMembers(normalizedTenantId);
    const previousMemberKeys = new Set(
      previousMembers.map((member) => `${member.provider_id}:${member.external_user_id}`)
    );

    const members = Array.isArray(input.members) && input.members.length > 0
      ? input.members.map((member, index) => mapImportedExternalMember(normalizedTenantId, provider, member, index))
      : buildSeededExternalMembers(normalizedTenantId, provider);

    state.external_identity_members_by_tenant[normalizedTenantId] = members;
    identityConfiguration.last_sync_at = nowIso();
    identityConfiguration.notes = identityConfiguration.notes ?? `Last synced by ${actorUserId}`;

    const nextMemberKeys = new Set<string>();
    members.forEach((member) => {
      nextMemberKeys.add(`${member.provider_id}:${member.external_user_id}`);
      upsertExternalIdentityUser({
        tenantId: normalizedTenantId,
        email: member.email,
        externalUserId: member.external_user_id,
        providerId: member.provider_id,
        providerLabel: member.provider_label,
        providerDeployment: member.provider_deployment,
        role: member.role,
        firstName: member.firstName,
        lastName: member.lastName
      });
    });

    previousMembers.forEach((member) => {
      const memberKey = `${member.provider_id}:${member.external_user_id}`;
      if (!previousMemberKeys.has(memberKey)) {
        return;
      }

      if (!nextMemberKeys.has(memberKey)) {
        removeExternalIdentityUser(normalizedTenantId, member.provider_id, member.external_user_id);
      }
    });

    persistState();
    return this.listExternalIdentityMembers(normalizedTenantId);
  }

  static updateExternalIdentityMember(
    tenantId: string,
    memberId: string,
    updates: UpdateExternalIdentityMemberInput
  ): ExternalIdentityMember {
    const members = ensureExternalMembers(tenantId);
    const member = members.find((candidate) => candidate.id === memberId);
    if (!member) {
      throw new Error(`External identity member not found: ${memberId}`);
    }

    if (updates.role !== undefined) {
      member.role = assertTeamRole(updates.role);
    }

    if (updates.status !== undefined) {
      member.status = assertTeamStatus(updates.status);
    }

    member.last_sync_at = nowIso();
    upsertExternalIdentityUser({
      tenantId,
      email: member.email,
      externalUserId: member.external_user_id,
      providerId: member.provider_id,
      providerLabel: member.provider_label,
      providerDeployment: member.provider_deployment,
      role: member.role,
      firstName: member.firstName,
      lastName: member.lastName
    });
    persistState();
    return clone(member);
  }

  static createExternalIdentityMember(
    tenantId: string,
    input: CreateExternalIdentityMemberInput
  ): ExternalIdentityMember {
    const normalizedTenantId = normalizeTenantId(tenantId);
    const tenant = getLocalTenant(normalizedTenantId);
    if (!tenant) {
      throw new Error(`Unknown tenant: ${tenantId}`);
    }

    const members = ensureExternalMembers(normalizedTenantId);
    const email = normalizeRequiredString(input.email, 'email').toLowerCase();
    if (members.some((candidate) => candidate.email.toLowerCase() === email)) {
      throw new Error(`External identity member already exists for ${email}`);
    }
    if (members.some((candidate) => candidate.provider_id === input.provider_id && candidate.external_user_id === input.external_user_id)) {
      throw new Error(`External identity member already exists for provider user ${input.external_user_id}`);
    }

    const name = splitName(
      `${normalizeOptionalString(input.firstName) ?? ''} ${normalizeOptionalString(input.lastName) ?? ''}`.trim() ||
        splitEmailName(email).firstName
    );
    const lastName = normalizeOptionalString(input.lastName) ?? name.lastName;
    const timestamp = nowIso();
    const member: ExternalIdentityMember = {
      id: `external-${input.provider_id.toLowerCase()}-${Date.now().toString(36)}-${members.length + 1}`,
      tenant_id: normalizedTenantId,
      external_user_id: normalizeRequiredString(input.external_user_id, 'external_user_id'),
      email,
      firstName: normalizeOptionalString(input.firstName) ?? name.firstName,
      lastName,
      role: assertTeamRole(input.role),
      status: input.status ? assertTeamStatus(input.status) : 'active',
      lastLogin: normalizeOptionalString(input.lastLogin) ?? '',
      invitedAt: normalizeOptionalString(input.invitedAt) ?? timestamp,
      invitedBy: normalizeOptionalString(input.invitedBy) ?? undefined,
      managementScope: 'external_identity',
      provider_id: normalizeRequiredString(input.provider_id, 'provider_id'),
      provider_label: normalizeRequiredString(input.provider_label, 'provider_label'),
      provider_deployment: input.provider_deployment,
      source_groups: Array.isArray(input.source_groups)
        ? input.source_groups.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        : [],
      last_sync_at: timestamp
    };

    members.push(member);
    upsertExternalIdentityUser({
      tenantId: normalizedTenantId,
      email: member.email,
      externalUserId: member.external_user_id,
      providerId: member.provider_id,
      providerLabel: member.provider_label,
      providerDeployment: member.provider_deployment,
      role: member.role,
      firstName: member.firstName,
      lastName: member.lastName
    });
    persistState();
    return clone(member);
  }

  static removeExternalIdentityMember(tenantId: string, memberId: string): void {
    const normalizedTenantId = normalizeTenantId(tenantId);
    const members = ensureExternalMembers(normalizedTenantId);
    const removedMember = members.find((candidate) => candidate.id === memberId);
    const nextMembers = members.filter((candidate) => candidate.id !== memberId);
    if (nextMembers.length === members.length) {
      throw new Error(`External identity member not found: ${memberId}`);
    }

    state.external_identity_members_by_tenant[normalizedTenantId] = nextMembers;
    if (removedMember) {
      removeExternalIdentityUser(normalizedTenantId, removedMember.provider_id, removedMember.external_user_id);
    }
    persistState();
  }
}
