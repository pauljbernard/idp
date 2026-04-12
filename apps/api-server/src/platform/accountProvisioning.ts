import { LocalIdentityControlPlane } from './identity';
import { loadOrCreatePersistedState, savePersistedState } from './persistence';
import {
  getDefaultTrainingEntitlement,
  getTrainingCatalogMode,
  listAvailableTrainingAddOns,
  normalizeTrainingAddOnIds,
  sumTrainingAddOnAmount,
  type TrainingAddOnDefinition,
  type TrainingAddOnId,
  type TrainingCatalogMode,
  type TrainingEntitlement
} from './entitlements';
import { LocalOperatingProfileStore } from './operatingProfile';
import {
  DEFAULT_SERVICE_ENTITLEMENT,
  ENABLED_SERVICE_ENTITLEMENT,
  normalizeServiceEntitlementValue,
  normalizeServiceEntitlementValues,
  type LocalServiceEntitlement,
  type LocalServiceEntitlementInput,
} from './serviceEntitlements';
import { LocalSettingsStore } from './settings';
import { toStandaloneFeatureIds, toStandaloneManagedRole, type StandaloneManagedRole, type StandaloneManagedRoleInput } from './tenantAliases';
import {
  countLocalUsersForTenant,
  deleteRegisteredLocalAccount,
  getLocalResolvedMembership,
  getLocalTenant,
  getLocalUser,
  registerLocalAccount,
  updateLocalTenantMembershipPermissions,
  updateLocalTenant,
  type LocalAccountType,
  type LocalDeploymentProfile,
  type LocalPermission,
  type LocalRoleId,
  type LocalSubscriptionTier,
  type LocalTenant
} from './tenants';

export type BillingCycle = 'monthly' | 'annual';
export type BillingStatus = 'trialing' | 'active' | 'past_due';
export type OrganizationKind = 'GROUP' | 'COMPANY';
export type CompanySizeBand = 'solo' | '2-10' | '11-50' | '51-200' | '201+';

export interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface BillingPaymentMethodInput {
  cardholder_name: string;
  card_number: string;
  expiry_month: number;
  expiry_year: number;
  postal_code: string;
}

export interface BillingPaymentMethod {
  brand: 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown';
  last4: string;
  expiry_month: number;
  expiry_year: number;
  postal_code: string;
  cardholder_name: string;
  token_reference: string;
  added_at: string;
}

export interface BillingInvoice {
  id: string;
  issued_at: string;
  status: 'paid' | 'open';
  description: string;
  amount_cents: number;
  currency: 'USD';
}

export interface AccountPlan {
  id: 'INDIVIDUAL_BASIC' | 'INDIVIDUAL_PRO' | 'ENTERPRISE';
  name: string;
  account_type: LocalAccountType;
  organization_kind?: OrganizationKind;
  subscription_tier: LocalSubscriptionTier;
  deployment_profile: LocalDeploymentProfile;
  assurance_mode: LocalTenant['assurance_mode'];
  price_monthly_cents: number;
  price_annual_cents: number;
  included_seats: number;
  max_users: number;
  max_aircraft: number;
  max_managed_assets?: number;
  default_service_entitlement: LocalServiceEntitlement;
  available_service_entitlements: LocalServiceEntitlement[];
  included_training_entitlement: TrainingEntitlement;
  training_catalog_mode: TrainingCatalogMode;
  available_training_addon_ids: TrainingAddOnId[];
  features: string[];
  training_summary: string;
  summary: string;
}

export interface BillingProfile {
  tenant_id: string;
  account_type: LocalAccountType;
  organization_kind?: OrganizationKind;
  organization_name: string;
  subscription_tier: LocalSubscriptionTier;
  service_entitlement: LocalServiceEntitlement;
  plan_id: AccountPlan['id'];
  plan_name: string;
  training_entitlement: TrainingEntitlement;
  training_catalog_mode: TrainingCatalogMode;
  purchased_training_addon_ids: TrainingAddOnId[];
  billing_cycle: BillingCycle;
  status: BillingStatus;
  billing_email: string;
  billing_contact_name: string;
  tax_id?: string;
  seats_included: number;
  seats_in_use: number;
  max_aircraft: number;
  max_managed_assets?: number;
  currency: 'USD';
  amount_cents: number;
  training_addon_amount_cents: number;
  address: BillingAddress;
  payment_method: BillingPaymentMethod | null;
  invoices: BillingInvoice[];
  created_at: string;
  updated_at: string;
}

export interface OrganizationProfile {
  tenant_id: string;
  account_type: LocalAccountType;
  organization_kind?: OrganizationKind;
  legal_name: string;
  display_name: string;
  domain?: string;
  company_size: CompanySizeBand;
  owner_user_id: string;
  owner_name: string;
  owner_email: string;
  seat_limit: number;
  active_user_count: number;
  role_templates: Array<{
    id: StandaloneManagedRole;
    role_alias?: StandaloneManagedRole;
    label: string;
    description: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface AccountRegistrationRequest {
  account_type: LocalAccountType;
  organization_kind?: OrganizationKind;
  organization_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  password: string;
  plan_id: AccountPlan['id'];
  service_entitlement?: LocalServiceEntitlementInput;
  billing_cycle: BillingCycle;
  billing_email: string;
  billing_contact_name: string;
  company_size?: CompanySizeBand;
  tax_id?: string;
  domain?: string;
  address: BillingAddress;
  payment_method: BillingPaymentMethodInput;
}

export interface AccountRegistrationResult {
  registration_id: string;
  tenant: LocalTenant;
  current_membership: NonNullable<ReturnType<typeof getLocalResolvedMembership>>;
  user: {
    id: string;
    name: string;
    email: string;
  };
  billing_profile: BillingProfile;
  organization_profile: OrganizationProfile;
  identity: {
    user_id: string;
    tenant_id: string;
    session_id: string | null;
    next_route: string;
  };
}

interface RegisterAccountOptions {
  create_bootstrap_session?: boolean;
}

interface RegistrationRecord {
  id: string;
  tenant_id: string;
  user_id: string;
  email: string;
  account_type: LocalAccountType;
  plan_id: AccountPlan['id'];
  created_at: string;
}

interface AccountProvisioningState {
  billing_by_tenant: Record<string, BillingProfile>;
  organization_by_tenant: Record<string, OrganizationProfile>;
  registrations_by_id: Record<string, RegistrationRecord>;
}

const ACCOUNT_PROVISIONING_STATE_FILE = 'account-provisioning-state.json';
const commercialIndividualSignals = new Set(['constitutional_ai', 'analytics', 'compliance']);
const legacyPlanIdMap = {
  GROUP_TEAM: 'ENTERPRISE',
  COMPANY_ENTERPRISE: 'ENTERPRISE'
} as const;

const ACCOUNT_PLANS: AccountPlan[] = [
  {
    id: 'INDIVIDUAL_BASIC',
    name: 'Individual Basic',
    account_type: 'INDIVIDUAL',
    subscription_tier: 'BASIC',
    deployment_profile: 'SHARED_SAAS',
    assurance_mode: 'STANDARD',
    price_monthly_cents: 1900,
    price_annual_cents: 19000,
    included_seats: 1,
    max_users: 1,
    max_aircraft: 1,
    max_managed_assets: 1,
    default_service_entitlement: 'INTEGRATION_DISABLED',
    available_service_entitlements: ['INTEGRATION_DISABLED'],
    included_training_entitlement: 'CERTIFICATION_PREP',
    training_catalog_mode: 'CERTIFICATION_CORE',
    available_training_addon_ids: listAvailableTrainingAddOns({ id: 'INDIVIDUAL_BASIC', subscription_tier: 'BASIC', service_entitlement: 'INTEGRATION_DISABLED' }).map((addon) => addon.id),
    features: ['workflow_planning', 'checklists', 'managed_resources'],
    training_summary: 'Includes identity foundations, policy readiness, and core onboarding content. Additional specialization learning is available as paid add-on bundles.',
    summary: 'Starter individual plan with essential planning, checklists, and managed-resource tracking.'
  },
  {
    id: 'INDIVIDUAL_PRO',
    name: 'Individual Pro',
    account_type: 'INDIVIDUAL',
    subscription_tier: 'PRO',
    deployment_profile: 'SHARED_SAAS',
    assurance_mode: 'STANDARD',
    price_monthly_cents: 8900,
    price_annual_cents: 89000,
    included_seats: 1,
    max_users: 1,
    max_aircraft: 10,
    max_managed_assets: 10,
    default_service_entitlement: 'INTEGRATION_DISABLED',
    available_service_entitlements: ['INTEGRATION_DISABLED', 'INTEGRATION_ENABLED'],
    included_training_entitlement: 'COMMERCIAL_READINESS',
    training_catalog_mode: 'INDIVIDUAL_ALL_ACCESS',
    available_training_addon_ids: [],
    features: ['constitutional_ai', 'workflow_planning', 'checklists', 'managed_resources', 'analytics', 'compliance'],
    training_summary: 'Includes full self-service access to governance, readiness, and specialization learning for an individual practitioner.',
    summary: 'Professional individual plan with advanced administration, analytics, compliance, and optional external authorization and guidance services.'
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    account_type: 'ORGANIZATION',
    subscription_tier: 'ENTERPRISE',
    deployment_profile: 'US_ENTERPRISE',
    assurance_mode: 'HARDENED',
    price_monthly_cents: 59900,
    price_annual_cents: 599000,
    included_seats: 50,
    max_users: 100,
    max_aircraft: 50,
    max_managed_assets: 50,
    default_service_entitlement: 'INTEGRATION_DISABLED',
    available_service_entitlements: ['INTEGRATION_DISABLED', 'INTEGRATION_ENABLED'],
    included_training_entitlement: 'ORGANIZATION_READINESS',
    training_catalog_mode: 'ORGANIZATION_ALL_ACCESS',
    available_training_addon_ids: [],
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
    training_summary: 'Includes full learner access plus organization-level training administration, governance, and team enablement.',
    summary: 'Organization plan with multi-user administration, integrations, compliance, and operational oversight, with optional external authorization and guidance services.'
  }
];

const accountProvisioningState = loadOrCreatePersistedState<AccountProvisioningState>(ACCOUNT_PROVISIONING_STATE_FILE, () => ({
  billing_by_tenant: {},
  organization_by_tenant: {},
  registrations_by_id: {}
}));

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

function persistState(): void {
  savePersistedState(ACCOUNT_PROVISIONING_STATE_FILE, accountProvisioningState);
}

function generateIdentifier(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required field: ${fieldName}`);
  }

  return value.trim();
}

function normalizeAddress(address: BillingAddress): BillingAddress {
  return {
    line1: requireNonEmptyString(address.line1, 'address.line1'),
    line2: typeof address.line2 === 'string' && address.line2.trim().length > 0 ? address.line2.trim() : undefined,
    city: requireNonEmptyString(address.city, 'address.city'),
    state: requireNonEmptyString(address.state, 'address.state'),
    postal_code: requireNonEmptyString(address.postal_code, 'address.postal_code'),
    country: requireNonEmptyString(address.country, 'address.country').toUpperCase()
  };
}

function detectCardBrand(cardNumber: string): BillingPaymentMethod['brand'] {
  if (/^4\d{12}(\d{3})?(\d{3})?$/.test(cardNumber)) {
    return 'visa';
  }

  if (/^(5[1-5]\d{14}|2(2[2-9]\d{12}|[3-6]\d{13}|7[01]\d{12}|720\d{12}))$/.test(cardNumber)) {
    return 'mastercard';
  }

  if (/^3[47]\d{13}$/.test(cardNumber)) {
    return 'amex';
  }

  if (/^6(?:011|5\d{2})\d{12}$/.test(cardNumber)) {
    return 'discover';
  }

  return 'unknown';
}

function normalizePaymentMethod(paymentMethod: BillingPaymentMethodInput): BillingPaymentMethod {
  const cardNumber = requireNonEmptyString(paymentMethod.card_number, 'payment_method.card_number').replace(/\s+/g, '');
  if (cardNumber.length < 12) {
    throw new Error('payment_method.card_number must contain at least 12 digits');
  }

  const expiryMonth = Number(paymentMethod.expiry_month);
  const expiryYear = Number(paymentMethod.expiry_year);
  if (!Number.isFinite(expiryMonth) || expiryMonth < 1 || expiryMonth > 12) {
    throw new Error('payment_method.expiry_month must be between 1 and 12');
  }

  if (!Number.isFinite(expiryYear) || expiryYear < new Date().getFullYear()) {
    throw new Error('payment_method.expiry_year must be current or future year');
  }

  return {
    brand: detectCardBrand(cardNumber),
    last4: cardNumber.slice(-4),
    expiry_month: expiryMonth,
    expiry_year: expiryYear,
    postal_code: requireNonEmptyString(paymentMethod.postal_code, 'payment_method.postal_code'),
    cardholder_name: requireNonEmptyString(paymentMethod.cardholder_name, 'payment_method.cardholder_name'),
    token_reference: `pm_${generateIdentifier('token')}`,
    added_at: nowIso()
  };
}

function roleTemplates() {
  return [
    {
      id: 'admin' as const,
      role_alias: 'admin' as const,
      label: 'Administrator',
      description: 'Manage billing, users, roles, platform settings, and workflow governance.'
    },
    {
      id: 'operator' as const,
      role_alias: 'operator' as const,
      label: 'Operator',
      description: 'Coordinate requests, lifecycle actions, and day-to-day operations.'
    },
    {
      id: 'specialist' as const,
      role_alias: 'specialist' as const,
      label: 'Specialist',
      description: 'Execute assigned workflows, work through checklists, and review delegated approvals.'
    },
    {
      id: 'viewer' as const,
      role_alias: 'viewer' as const,
      label: 'Viewer',
      description: 'Read dashboards, reports, and workflow status without changing operational state.'
    }
  ];
}

function syncOrganizationRoleTemplates(profile: OrganizationProfile): OrganizationProfile {
  profile.role_templates = profile.role_templates.map((template) => ({
    ...template,
    id: toStandaloneManagedRole(template.id as StandaloneManagedRoleInput) as StandaloneManagedRole,
    role_alias: toStandaloneManagedRole(template.id as StandaloneManagedRoleInput) as StandaloneManagedRole
  }));
  return profile;
}

function normalizeServiceEntitlement(
  requestedEntitlement: LocalServiceEntitlementInput | undefined,
  plan: AccountPlan
): LocalServiceEntitlement {
  const nextEntitlement = normalizeServiceEntitlementValue(
    requestedEntitlement ?? plan.default_service_entitlement,
    plan.default_service_entitlement,
  );
  if (!plan.available_service_entitlements.includes(nextEntitlement)) {
    throw new Error(`${plan.name} does not support service entitlement ${nextEntitlement}`);
  }

  return nextEntitlement;
}

function syncPlanAliases(plan: AccountPlan): AccountPlan {
  const legacyPlan = plan as AccountPlan & {
    default_faa_entitlement?: LocalServiceEntitlementInput;
    available_faa_entitlements?: LocalServiceEntitlementInput[];
  };
  plan.max_managed_assets = plan.max_aircraft;
  const canonicalEntitlement = normalizeServiceEntitlementValue(
    plan.default_service_entitlement ?? legacyPlan.default_faa_entitlement,
    DEFAULT_SERVICE_ENTITLEMENT,
  );
  plan.default_service_entitlement = canonicalEntitlement;
  delete legacyPlan.default_faa_entitlement;
  const availableEntitlements = normalizeServiceEntitlementValues(
    plan.available_service_entitlements ?? legacyPlan.available_faa_entitlements ?? [DEFAULT_SERVICE_ENTITLEMENT],
  );
  plan.available_service_entitlements = availableEntitlements;
  delete legacyPlan.available_faa_entitlements;
  plan.features = toStandaloneFeatureIds(plan.features);
  return plan;
}

function syncBillingProfileAliases(profile: BillingProfile): BillingProfile {
  const legacyProfile = profile as BillingProfile & { faa_entitlement?: LocalServiceEntitlementInput };
  const canonicalEntitlement = normalizeServiceEntitlementValue(
    profile.service_entitlement ?? legacyProfile.faa_entitlement,
    DEFAULT_SERVICE_ENTITLEMENT,
  );
  profile.service_entitlement = canonicalEntitlement;
  delete legacyProfile.faa_entitlement;
  profile.max_managed_assets = profile.max_aircraft;
  return profile;
}

function syncTenantOwnerPermissions(
  tenantId: string,
  ownerUserId: string | undefined,
  plan: AccountPlan,
  serviceEntitlement: LocalServiceEntitlement,
  trainingEntitlement: TrainingEntitlement = plan.included_training_entitlement
): void {
  if (!ownerUserId) {
    return;
  }

  updateLocalTenantMembershipPermissions(
    tenantId,
    ownerUserId,
    buildOwnerPermissions(plan, serviceEntitlement, trainingEntitlement)
  );
}

function isCommercialIndividualTenant(tenant: LocalTenant): boolean {
  return tenant.subscription_tier === 'PRO' || tenant.features.some((feature) => commercialIndividualSignals.has(feature));
}

function resolveSeedPlanIdForTenant(tenant: LocalTenant): AccountPlan['id'] {
  if (tenant.account_type === 'INDIVIDUAL') {
    return isCommercialIndividualTenant(tenant) ? 'INDIVIDUAL_PRO' : 'INDIVIDUAL_BASIC';
  }

  return 'ENTERPRISE';
}

function normalizePlanId(
  planId: AccountPlan['id'] | keyof typeof legacyPlanIdMap | string | undefined,
  tenant?: LocalTenant | null,
  accountType?: LocalAccountType
): AccountPlan['id'] {
  if (planId === 'INDIVIDUAL_BASIC' || planId === 'INDIVIDUAL_PRO' || planId === 'ENTERPRISE') {
    if (planId === 'INDIVIDUAL_BASIC' && tenant?.account_type === 'INDIVIDUAL' && isCommercialIndividualTenant(tenant)) {
      return 'INDIVIDUAL_PRO';
    }

    return planId;
  }

  if (planId && planId in legacyPlanIdMap) {
    return legacyPlanIdMap[planId as keyof typeof legacyPlanIdMap];
  }

  if (tenant) {
    return resolveSeedPlanIdForTenant(tenant);
  }

  return accountType === 'ORGANIZATION' ? 'ENTERPRISE' : 'INDIVIDUAL_BASIC';
}

function resolvePlan(planId: AccountPlan['id'] | keyof typeof legacyPlanIdMap | string | undefined): AccountPlan {
  const normalizedPlanId = normalizePlanId(planId);
  const plan = ACCOUNT_PLANS.find((candidate) => candidate.id === normalizedPlanId);
  if (!plan) {
    throw new Error(`Unknown plan: ${planId}`);
  }

  return plan;
}

function buildOwnerPermissions(
  plan: AccountPlan,
  serviceEntitlement: LocalServiceEntitlement,
  trainingEntitlement: TrainingEntitlement = plan.included_training_entitlement
): LocalPermission[] {
  const permissions = new Set<LocalPermission>([
    'dashboard.read',
    'missions.read',
    'missions.write',
    'checklists.read',
    'checklists.write',
    'billing.read',
    'billing.manage',
    'settings.read',
    'settings.manage',
    'diagnostics.read'
  ]);

  if (trainingEntitlement !== 'TRAINING_DISABLED') {
    permissions.add('training.read');
  }

  if (trainingEntitlement === 'ORGANIZATION_READINESS') {
    permissions.add('training.manage');
  }

  if (serviceEntitlement === ENABLED_SERVICE_ENTITLEMENT) {
    permissions.add('authorization.read');
    permissions.add('authorization.write');
  }

  if (plan.features.includes('constitutional_ai')) {
    permissions.add('constitutional_ai.read');
  }

  if (plan.features.includes('managed_resources')) {
    permissions.add('fleet.read');
    permissions.add('fleet.write');
  }

  if (plan.features.includes('analytics')) {
    permissions.add('analytics.read');
  }

  if (plan.features.includes('compliance')) {
    permissions.add('compliance.read');
    permissions.add('compliance.manage');
  }

  if (plan.features.includes('partners')) {
    permissions.add('partners.read');
  }

  if (plan.features.includes('developer_portal')) {
    permissions.add('developer_portal.read');
    permissions.add('developer_portal.manage');
  }

  if (plan.features.includes('integrations')) {
    permissions.add('integrations.read');
    permissions.add('integrations.manage');
  }

  if (plan.features.includes('command_center')) {
    permissions.add('command_center.read');
    permissions.add('live_operations.read');
    permissions.add('live_operations.manage');
  }

  if (plan.features.includes('public_programs')) {
    permissions.add('municipal_ops.read');
    permissions.add('municipal_ops.manage');
  }

  return Array.from(permissions);
}

function migrateProvisioningState(): void {
  let didMutate = false;

  Object.values(accountProvisioningState.billing_by_tenant).forEach((billingProfile) => {
    const tenant = getLocalTenant(billingProfile.tenant_id);
    const nextPlan = resolvePlan(normalizePlanId(billingProfile.plan_id, tenant, billingProfile.account_type));
    const nextAccountType = tenant?.account_type ?? billingProfile.account_type;
    const nextOrganizationKind = nextAccountType === 'ORGANIZATION'
      ? (tenant?.organization_kind as OrganizationKind | undefined) ?? billingProfile.organization_kind
      : undefined;
    const nextSubscriptionTier = tenant?.subscription_tier ?? nextPlan.subscription_tier;
    const nextTrainingEntitlement = tenant ? resolveTrainingAccessSnapshot(tenant).training_entitlement : getDefaultTrainingEntitlement({ subscription_tier: nextSubscriptionTier });
    const nextTrainingCatalogMode = tenant
      ? resolveTrainingAccessSnapshot(tenant).training_catalog_mode
      : getTrainingCatalogMode({ subscription_tier: nextSubscriptionTier }, nextTrainingEntitlement);
    const nextTrainingAddOnIds = tenant ? resolveTrainingAccessSnapshot(tenant).purchased_training_addon_ids : [];
    const nextTrainingAddOnAmount = buildTrainingAddOnAmount(nextTrainingAddOnIds, billingProfile.billing_cycle);
    const nextAmount = buildBillingCycleAmount(nextPlan, billingProfile.billing_cycle) + nextTrainingAddOnAmount;
    const nextMaxAircraft = tenant?.max_aircraft ?? nextPlan.max_aircraft;

    if (
      billingProfile.plan_id !== nextPlan.id ||
      billingProfile.plan_name !== nextPlan.name ||
      billingProfile.account_type !== nextAccountType ||
      billingProfile.organization_kind !== nextOrganizationKind ||
      billingProfile.subscription_tier !== nextSubscriptionTier ||
      billingProfile.service_entitlement !== (tenant?.service_entitlement ?? billingProfile.service_entitlement) ||
      billingProfile.training_entitlement !== nextTrainingEntitlement ||
      billingProfile.training_catalog_mode !== nextTrainingCatalogMode ||
      JSON.stringify(billingProfile.purchased_training_addon_ids ?? []) !== JSON.stringify(nextTrainingAddOnIds) ||
      billingProfile.training_addon_amount_cents !== nextTrainingAddOnAmount ||
      billingProfile.amount_cents !== nextAmount ||
      billingProfile.seats_included !== nextPlan.included_seats ||
      billingProfile.max_aircraft !== nextMaxAircraft
    ) {
      billingProfile.plan_id = nextPlan.id;
      billingProfile.plan_name = nextPlan.name;
      billingProfile.account_type = nextAccountType;
      billingProfile.organization_kind = nextOrganizationKind;
      billingProfile.subscription_tier = nextSubscriptionTier;
      billingProfile.service_entitlement = tenant?.service_entitlement ?? billingProfile.service_entitlement;
      billingProfile.training_entitlement = nextTrainingEntitlement;
      billingProfile.training_catalog_mode = nextTrainingCatalogMode;
      billingProfile.purchased_training_addon_ids = nextTrainingAddOnIds;
      billingProfile.training_addon_amount_cents = nextTrainingAddOnAmount;
      billingProfile.amount_cents = nextAmount;
      billingProfile.seats_included = nextPlan.included_seats;
      billingProfile.max_aircraft = nextMaxAircraft;
      syncTenantOwnerPermissions(
        billingProfile.tenant_id,
        tenant?.owner_user_id,
        nextPlan,
        tenant?.service_entitlement ?? billingProfile.service_entitlement,
        nextTrainingEntitlement
      );
      didMutate = true;
    }
  });

  Object.values(accountProvisioningState.organization_by_tenant).forEach((organizationProfile) => {
    const originalTemplates = JSON.stringify(organizationProfile.role_templates);
    syncOrganizationRoleTemplates(organizationProfile);
    if (originalTemplates !== JSON.stringify(organizationProfile.role_templates)) {
      didMutate = true;
    }

    const tenant = getLocalTenant(organizationProfile.tenant_id);
    if (!tenant) {
      return;
    }

    const nextOrganizationKind = tenant.account_type === 'ORGANIZATION'
      ? (tenant.organization_kind as OrganizationKind | undefined) ?? organizationProfile.organization_kind
      : undefined;

    if (
      organizationProfile.account_type !== tenant.account_type ||
      organizationProfile.organization_kind !== nextOrganizationKind ||
      organizationProfile.seat_limit !== tenant.max_users ||
      organizationProfile.active_user_count !== countLocalUsersForTenant(organizationProfile.tenant_id)
    ) {
      organizationProfile.account_type = tenant.account_type;
      organizationProfile.organization_kind = nextOrganizationKind;
      organizationProfile.seat_limit = tenant.max_users;
      organizationProfile.active_user_count = countLocalUsersForTenant(organizationProfile.tenant_id);
      didMutate = true;
    }
  });

  Object.values(accountProvisioningState.registrations_by_id).forEach((registrationRecord) => {
    const tenant = getLocalTenant(registrationRecord.tenant_id);
    const nextPlanId = normalizePlanId(registrationRecord.plan_id, tenant, registrationRecord.account_type);
    if (registrationRecord.plan_id !== nextPlanId) {
      registrationRecord.plan_id = nextPlanId;
      didMutate = true;
    }
  });

  if (didMutate) {
    persistState();
  }
}

function resolveSeedPlanForTenant(tenant: LocalTenant): AccountPlan {
  return resolvePlan(resolveSeedPlanIdForTenant(tenant));
}

function buildBillingCycleAmount(plan: AccountPlan, billingCycle: BillingCycle): number {
  return billingCycle === 'annual' ? plan.price_annual_cents : plan.price_monthly_cents;
}

function buildTrainingAddOnAmount(
  addOnIds: TrainingAddOnId[],
  billingCycle: BillingCycle
): number {
  return sumTrainingAddOnAmount(addOnIds, billingCycle);
}

function resolveOrganizationKind(
  accountType: LocalAccountType,
  requestedOrganizationKind?: OrganizationKind,
  fallbackOrganizationKind?: OrganizationKind
): OrganizationKind | undefined {
  if (accountType !== 'ORGANIZATION') {
    return undefined;
  }

  return requestedOrganizationKind ?? fallbackOrganizationKind ?? 'COMPANY';
}

migrateProvisioningState();

function companySizeFromTenant(tenant: LocalTenant): CompanySizeBand {
  if (tenant.max_users <= 1) {
    return 'solo';
  }

  if (tenant.max_users <= 10) {
    return '2-10';
  }

  if (tenant.max_users <= 50) {
    return '11-50';
  }

  if (tenant.max_users <= 200) {
    return '51-200';
  }

  return '201+';
}

function buildSeedOrganizationProfile(tenant: LocalTenant): OrganizationProfile {
  const owner = tenant.owner_user_id ? getLocalUser(tenant.owner_user_id) : null;
  return {
    tenant_id: tenant.id,
    account_type: tenant.account_type,
    organization_kind: (tenant.organization_kind as OrganizationKind | undefined) ?? (tenant.account_type === 'INDIVIDUAL' ? undefined : 'COMPANY'),
    legal_name: tenant.name,
    display_name: tenant.name,
    domain: tenant.domain,
    company_size: companySizeFromTenant(tenant),
    owner_user_id: owner?.id ?? tenant.owner_user_id ?? 'unknown-owner',
    owner_name: owner?.name ?? 'Unknown Owner',
    owner_email: owner?.email ?? 'unassigned@idp.local',
    seat_limit: tenant.max_users,
    active_user_count: countLocalUsersForTenant(tenant.id),
    role_templates: roleTemplates(),
    created_at: nowIso(),
    updated_at: nowIso()
  };
}

function resolveTrainingAccessSnapshot(tenant: LocalTenant): Pick<BillingProfile, 'training_entitlement' | 'training_catalog_mode' | 'purchased_training_addon_ids'> {
  const operatingProfile = LocalOperatingProfileStore.getOperatingProfile(tenant, null);
  return {
    training_entitlement: operatingProfile.current.training_entitlement,
    training_catalog_mode: operatingProfile.current.training_catalog_mode,
    purchased_training_addon_ids: [...(operatingProfile.current.training_addon_ids ?? [])]
  };
}

function buildSeedBillingProfile(tenant: LocalTenant): BillingProfile {
  const plan = resolveSeedPlanForTenant(tenant);
  const organization = ensureOrganizationProfile(tenant.id);
  const trainingAccess = resolveTrainingAccessSnapshot(tenant);
  const trainingAddOnAmount = buildTrainingAddOnAmount(trainingAccess.purchased_training_addon_ids, 'monthly');
  return {
    tenant_id: tenant.id,
    account_type: tenant.account_type,
    organization_kind: organization.organization_kind,
    organization_name: organization.display_name,
    subscription_tier: tenant.subscription_tier,
    service_entitlement: tenant.service_entitlement,
    plan_id: plan.id,
    plan_name: plan.name,
    training_entitlement: trainingAccess.training_entitlement,
    training_catalog_mode: trainingAccess.training_catalog_mode,
    purchased_training_addon_ids: trainingAccess.purchased_training_addon_ids,
    billing_cycle: 'monthly',
    status: 'active',
    billing_email: organization.owner_email,
    billing_contact_name: organization.owner_name,
    tax_id: tenant.organization_kind === 'PUBLIC_SECTOR' ? 'GOV-EXEMPT' : undefined,
    seats_included: plan.included_seats,
    seats_in_use: countLocalUsersForTenant(tenant.id),
    max_aircraft: tenant.max_aircraft,
    max_managed_assets: tenant.max_aircraft,
    currency: 'USD',
    amount_cents: buildBillingCycleAmount(plan, 'monthly') + trainingAddOnAmount,
    training_addon_amount_cents: trainingAddOnAmount,
    address: {
      line1: '100 Identity Operations Way',
      city: 'New York',
      state: 'NY',
      postal_code: '10001',
      country: 'US'
    },
    payment_method: tenant.subscription_tier === 'GOVERNMENT'
      ? null
      : {
          brand: 'visa',
          last4: '4242',
          expiry_month: 12,
          expiry_year: new Date().getFullYear() + 2,
          postal_code: '10001',
          cardholder_name: organization.owner_name,
          token_reference: `pm_seed_${tenant.id}`,
          added_at: nowIso()
        },
    invoices: [
      {
        id: generateIdentifier('invoice'),
        issued_at: nowIso(),
        status: 'paid',
        description: `${plan.name} monthly subscription`,
        amount_cents: plan.price_monthly_cents,
        currency: 'USD'
      }
    ],
    created_at: nowIso(),
    updated_at: nowIso()
  };
}

function ensureOrganizationProfile(tenantId: string): OrganizationProfile {
  if (!accountProvisioningState.organization_by_tenant[tenantId]) {
    const tenant = getLocalTenant(tenantId);
    if (!tenant) {
      throw new Error(`Unknown tenant: ${tenantId}`);
    }

    accountProvisioningState.organization_by_tenant[tenantId] = buildSeedOrganizationProfile(tenant);
    persistState();
  }

  const organization = accountProvisioningState.organization_by_tenant[tenantId];
  syncOrganizationRoleTemplates(organization);
  organization.active_user_count = countLocalUsersForTenant(tenantId);
  organization.seat_limit = getLocalTenant(tenantId)?.max_users ?? organization.seat_limit;
  return organization;
}

function ensureBillingProfile(tenantId: string): BillingProfile {
  if (!accountProvisioningState.billing_by_tenant[tenantId]) {
    const tenant = getLocalTenant(tenantId);
    if (!tenant) {
      throw new Error(`Unknown tenant: ${tenantId}`);
    }

    accountProvisioningState.billing_by_tenant[tenantId] = buildSeedBillingProfile(tenant);
    persistState();
  }

  const profile = accountProvisioningState.billing_by_tenant[tenantId];
  const tenant = getLocalTenant(tenantId);
  const normalizedPlan = resolvePlan(normalizePlanId(profile.plan_id, tenant, profile.account_type));
  const trainingAccess = tenant
    ? resolveTrainingAccessSnapshot(tenant)
    : {
        training_entitlement: profile.training_entitlement,
        training_catalog_mode: profile.training_catalog_mode,
        purchased_training_addon_ids: profile.purchased_training_addon_ids ?? []
      };
  const trainingAddOnAmount = buildTrainingAddOnAmount(trainingAccess.purchased_training_addon_ids, profile.billing_cycle);

  profile.plan_id = normalizedPlan.id;
  profile.plan_name = normalizedPlan.name;
  profile.seats_included = normalizedPlan.included_seats;
  profile.training_entitlement = trainingAccess.training_entitlement;
  profile.training_catalog_mode = trainingAccess.training_catalog_mode;
  profile.purchased_training_addon_ids = trainingAccess.purchased_training_addon_ids;
  profile.training_addon_amount_cents = trainingAddOnAmount;
  profile.amount_cents = buildBillingCycleAmount(normalizedPlan, profile.billing_cycle) + trainingAddOnAmount;
  profile.subscription_tier = tenant?.subscription_tier ?? profile.subscription_tier;
  profile.service_entitlement = tenant?.service_entitlement ?? profile.service_entitlement;
  profile.max_aircraft = tenant?.max_aircraft ?? profile.max_aircraft;
  syncBillingProfileAliases(profile);
  profile.seats_in_use = countLocalUsersForTenant(tenantId);
  profile.updated_at = nowIso();
  return profile;
}

function applyPlanToTenant(
  tenantId: string,
  plan: AccountPlan,
  requestedServiceEntitlement?: LocalServiceEntitlement
): LocalTenant {
  const existingTenant = getLocalTenant(tenantId);
  if (!existingTenant) {
    throw new Error(`Unknown tenant: ${tenantId}`);
  }

  const nextServiceEntitlement = requestedServiceEntitlement
    ? normalizeServiceEntitlement(requestedServiceEntitlement, plan)
    : (
      plan.available_service_entitlements.includes(existingTenant.service_entitlement)
        ? existingTenant.service_entitlement
        : plan.default_service_entitlement
    );

  const nextTenant = updateLocalTenant(tenantId, {
    account_type: plan.account_type,
    organization_kind: resolveOrganizationKind(plan.account_type, plan.organization_kind, existingTenant.organization_kind as OrganizationKind | undefined),
    subscription_tier: plan.subscription_tier,
    deployment_profile: plan.deployment_profile,
    assurance_mode: plan.assurance_mode,
    service_entitlement: nextServiceEntitlement,
    features: plan.features,
    max_users: plan.max_users,
    max_aircraft: plan.max_aircraft
  });

  syncTenantOwnerPermissions(tenantId, nextTenant.owner_user_id, plan, nextServiceEntitlement);
  return nextTenant;
}

export class LocalAccountProvisioningStore {
  static listPlans(): AccountPlan[] {
    return ACCOUNT_PLANS.map((plan) => syncPlanAliases(clone(plan)));
  }

  static registerAccount(request: AccountRegistrationRequest, options: RegisterAccountOptions = {}): AccountRegistrationResult {
    const plan = resolvePlan(request.plan_id);
    const serviceEntitlement = normalizeServiceEntitlement(request.service_entitlement, plan);
    const organizationKind = resolveOrganizationKind(request.account_type, request.organization_kind, plan.organization_kind);
    const firstName = requireNonEmptyString(request.first_name, 'first_name');
    const lastName = requireNonEmptyString(request.last_name, 'last_name');
    const billingEmail = normalizeEmail(requireNonEmptyString(request.billing_email, 'billing_email'));
    const organizationName = requireNonEmptyString(request.organization_name, 'organization_name');
    const password = requireNonEmptyString(request.password, 'password');

    if (password.length < 12) {
      throw new Error('password must be at least 12 characters');
    }

    if (request.account_type !== plan.account_type) {
      throw new Error(`Plan ${plan.id} does not support account type ${request.account_type}`);
    }

    const registration = registerLocalAccount({
      account_type: request.account_type,
      organization_kind: organizationKind,
      tenant_name: organizationName,
      domain: request.domain,
      subscription_tier: plan.subscription_tier,
      deployment_profile: plan.deployment_profile,
      assurance_mode: plan.assurance_mode,
      service_entitlement: serviceEntitlement,
      features: plan.features,
      max_users: plan.max_users,
      max_aircraft: plan.max_aircraft,
      owner: {
        first_name: firstName,
        last_name: lastName,
        email: request.email,
        role_id: 'tenant_owner',
        role_label: request.account_type === 'INDIVIDUAL' ? 'Individual Account Administrator' : 'Organization Administrator',
        permissions: buildOwnerPermissions(plan, serviceEntitlement, plan.included_training_entitlement) as LocalPermission[]
      }
    });

    LocalIdentityControlPlane.rotatePassword(registration.user.id, password);
    LocalSettingsStore.updateProfile(registration.user.id, {
      email: normalizeEmail(request.email),
      firstName,
      lastName,
      phone: typeof request.phone === 'string' && request.phone.trim().length > 0 ? request.phone.trim() : undefined,
      department: request.account_type === 'INDIVIDUAL' ? 'Independent Practitioner' : 'Identity Operations'
    });

    const normalizedAddress = normalizeAddress(request.address);
    const paymentMethod = normalizePaymentMethod(request.payment_method);
    const trainingAccess = resolveTrainingAccessSnapshot(registration.tenant);
    const billingProfile: BillingProfile = {
      tenant_id: registration.tenant.id,
      account_type: request.account_type,
      organization_kind: organizationKind,
      organization_name: organizationName,
      subscription_tier: plan.subscription_tier,
      service_entitlement: serviceEntitlement,
      plan_id: plan.id,
      plan_name: plan.name,
      training_entitlement: trainingAccess.training_entitlement,
      training_catalog_mode: trainingAccess.training_catalog_mode,
      purchased_training_addon_ids: trainingAccess.purchased_training_addon_ids,
      billing_cycle: request.billing_cycle,
      status: 'active',
      billing_email: billingEmail,
      billing_contact_name: requireNonEmptyString(request.billing_contact_name, 'billing_contact_name'),
      tax_id: typeof request.tax_id === 'string' && request.tax_id.trim().length > 0 ? request.tax_id.trim() : undefined,
      seats_included: plan.included_seats,
      seats_in_use: 1,
      max_aircraft: plan.max_aircraft,
      max_managed_assets: plan.max_aircraft,
      currency: 'USD',
      amount_cents: buildBillingCycleAmount(plan, request.billing_cycle),
      training_addon_amount_cents: 0,
      address: normalizedAddress,
      payment_method: paymentMethod,
      invoices: [
        {
          id: generateIdentifier('invoice'),
          issued_at: nowIso(),
          status: 'paid',
          description: `${plan.name} ${request.billing_cycle} subscription`,
          amount_cents: buildBillingCycleAmount(plan, request.billing_cycle),
          currency: 'USD'
        }
      ],
      created_at: nowIso(),
      updated_at: nowIso()
    };

    const organizationProfile: OrganizationProfile = {
      tenant_id: registration.tenant.id,
      account_type: request.account_type,
      organization_kind: organizationKind,
      legal_name: organizationName,
      display_name: organizationName,
      domain: registration.tenant.domain,
      company_size: request.company_size ?? (request.account_type === 'INDIVIDUAL' ? 'solo' : '2-10'),
      owner_user_id: registration.user.id,
      owner_name: registration.user.name,
      owner_email: registration.user.email,
      seat_limit: plan.max_users,
      active_user_count: 1,
      role_templates: roleTemplates(),
      created_at: nowIso(),
      updated_at: nowIso()
    };

    accountProvisioningState.billing_by_tenant[registration.tenant.id] = billingProfile;
    accountProvisioningState.organization_by_tenant[registration.tenant.id] = organizationProfile;
    const registrationId = generateIdentifier('registration');
    accountProvisioningState.registrations_by_id[registrationId] = {
      id: registrationId,
      tenant_id: registration.tenant.id,
      user_id: registration.user.id,
      email: registration.user.email,
      account_type: request.account_type,
      plan_id: plan.id,
      created_at: nowIso()
    };
    persistState();

    const resolvedMembership = getLocalResolvedMembership(registration.user.id, registration.tenant.id);
    if (!resolvedMembership) {
      throw new Error('Failed to resolve tenant membership for the registered account');
    }

    const session = options.create_bootstrap_session === false
      ? null
      : LocalIdentityControlPlane.createSession(registration.user.id, registration.tenant.id);

    return {
      registration_id: registrationId,
      tenant: clone(getLocalTenant(registration.tenant.id) ?? registration.tenant),
      current_membership: clone(resolvedMembership),
      user: {
        id: registration.user.id,
        name: registration.user.name,
        email: registration.user.email
      },
      billing_profile: clone(syncBillingProfileAliases(billingProfile)),
      organization_profile: clone(organizationProfile),
      identity: {
        user_id: registration.user.id,
        tenant_id: registration.tenant.id,
        session_id: session?.session_id ?? null,
        next_route: '/dashboard'
      }
    };
  }

  static rollbackRegistration(registrationId: string): void {
    const registration = accountProvisioningState.registrations_by_id[registrationId];
    if (!registration) {
      return;
    }

    delete accountProvisioningState.billing_by_tenant[registration.tenant_id];
    delete accountProvisioningState.organization_by_tenant[registration.tenant_id];
    delete accountProvisioningState.registrations_by_id[registrationId];
    persistState();

    LocalSettingsStore.deleteUserProfile(registration.user_id);
    LocalIdentityControlPlane.deleteUserSecurityState(registration.user_id);
    deleteRegisteredLocalAccount(registration.tenant_id, registration.user_id);
  }

  static getBillingProfile(tenantId: string): BillingProfile {
    return clone(syncBillingProfileAliases(ensureBillingProfile(tenantId)));
  }

  static updateBillingProfile(tenantId: string, actorUserId: string, updates: Partial<BillingProfile>): BillingProfile {
    const billingProfile = ensureBillingProfile(tenantId);
    const currentTenant = getLocalTenant(tenantId);
    if (!currentTenant) {
      throw new Error(`Unknown tenant: ${tenantId}`);
    }

    if (currentTenant.subscription_tier === 'GOVERNMENT' && updates.plan_id) {
      throw new Error('Plan changes for government tenants are managed outside the public billing catalog');
    }

    const nextPlan = updates.plan_id
      ? resolvePlan(normalizePlanId(updates.plan_id, currentTenant, billingProfile.account_type))
      : resolvePlan(normalizePlanId(billingProfile.plan_id, currentTenant, billingProfile.account_type));
    const nextServiceEntitlement = normalizeServiceEntitlement(
      updates.service_entitlement ?? billingProfile.service_entitlement,
      nextPlan
    );
    const billingCycle = updates.billing_cycle ?? billingProfile.billing_cycle;

    let tenantForTrainingAccess = currentTenant;

    if (updates.plan_id || nextServiceEntitlement !== currentTenant.service_entitlement) {
      if (nextPlan.account_type !== currentTenant.account_type) {
        throw new Error('Plan changes must stay within the current account type');
      }

      const nextTenant = applyPlanToTenant(tenantId, nextPlan, nextServiceEntitlement);
      tenantForTrainingAccess = nextTenant;
      billingProfile.subscription_tier = nextTenant.subscription_tier;
      billingProfile.service_entitlement = nextTenant.service_entitlement;
      billingProfile.max_aircraft = nextTenant.max_aircraft;
      billingProfile.seats_included = nextPlan.included_seats;
      billingProfile.account_type = nextTenant.account_type;
      billingProfile.organization_kind = nextTenant.account_type === 'ORGANIZATION'
        ? (nextTenant.organization_kind as OrganizationKind | undefined) ?? billingProfile.organization_kind
        : undefined;

      const organizationProfile = ensureOrganizationProfile(tenantId);
      organizationProfile.account_type = nextTenant.account_type;
      organizationProfile.organization_kind = nextTenant.account_type === 'ORGANIZATION'
        ? (nextTenant.organization_kind as OrganizationKind | undefined) ?? organizationProfile.organization_kind
        : undefined;
      organizationProfile.seat_limit = nextTenant.max_users;
      organizationProfile.updated_at = nowIso();
      accountProvisioningState.organization_by_tenant[tenantId] = organizationProfile;
    }

    billingProfile.service_entitlement = nextServiceEntitlement;

    const requestedTrainingEntitlement = updates.training_entitlement
      ?? (updates.plan_id ? nextPlan.included_training_entitlement : billingProfile.training_entitlement);
    const requestedTrainingAddOnIds = updates.purchased_training_addon_ids
      ?? billingProfile.purchased_training_addon_ids;
    const operatingProfile = LocalOperatingProfileStore.updateOperatingProfile(
      tenantForTrainingAccess,
      null,
      actorUserId,
      {
        training_entitlement: requestedTrainingEntitlement,
        training_addon_ids: normalizeTrainingAddOnIds(tenantForTrainingAccess, requestedTrainingAddOnIds)
      }
    );
    syncTenantOwnerPermissions(
      tenantId,
      tenantForTrainingAccess.owner_user_id,
      nextPlan,
      nextServiceEntitlement,
      operatingProfile.current.training_entitlement
    );

    if (updates.organization_name !== undefined) {
      billingProfile.organization_name = requireNonEmptyString(updates.organization_name, 'organization_name');
    }

    if (updates.billing_email !== undefined) {
      billingProfile.billing_email = normalizeEmail(requireNonEmptyString(updates.billing_email, 'billing_email'));
    }

    if (updates.billing_contact_name !== undefined) {
      billingProfile.billing_contact_name = requireNonEmptyString(updates.billing_contact_name, 'billing_contact_name');
    }

    if (updates.tax_id !== undefined) {
      billingProfile.tax_id = typeof updates.tax_id === 'string' && updates.tax_id.trim().length > 0
        ? updates.tax_id.trim()
        : undefined;
    }

    if (updates.address) {
      billingProfile.address = normalizeAddress(updates.address);
    }

    if ((updates as { payment_method?: BillingPaymentMethodInput | BillingPaymentMethod }).payment_method) {
      const paymentMethod = (updates as { payment_method: BillingPaymentMethodInput | BillingPaymentMethod }).payment_method;
      billingProfile.payment_method = 'token_reference' in paymentMethod ? paymentMethod : normalizePaymentMethod(paymentMethod);
    }

    billingProfile.plan_id = nextPlan.id;
    billingProfile.plan_name = nextPlan.name;
    billingProfile.training_entitlement = operatingProfile.current.training_entitlement;
    billingProfile.training_catalog_mode = operatingProfile.current.training_catalog_mode;
    billingProfile.purchased_training_addon_ids = [...operatingProfile.current.training_addon_ids];
    billingProfile.billing_cycle = billingCycle;
    billingProfile.training_addon_amount_cents = buildTrainingAddOnAmount(
      billingProfile.purchased_training_addon_ids,
      billingCycle
    );
    billingProfile.amount_cents = buildBillingCycleAmount(nextPlan, billingCycle) + billingProfile.training_addon_amount_cents;
    billingProfile.status = updates.status ?? billingProfile.status;
    syncBillingProfileAliases(billingProfile);
    billingProfile.updated_at = nowIso();
    billingProfile.seats_in_use = countLocalUsersForTenant(tenantId);
    accountProvisioningState.billing_by_tenant[tenantId] = billingProfile;
    persistState();
    return clone(syncBillingProfileAliases(billingProfile));
  }

  static getOrganizationProfile(tenantId: string): OrganizationProfile {
    return clone(ensureOrganizationProfile(tenantId));
  }

  static updateOrganizationProfile(tenantId: string, updates: Partial<OrganizationProfile>): OrganizationProfile {
    const organizationProfile = ensureOrganizationProfile(tenantId);
    const tenant = getLocalTenant(tenantId);
    if (!tenant) {
      throw new Error(`Unknown tenant: ${tenantId}`);
    }

    if (updates.legal_name !== undefined) {
      organizationProfile.legal_name = requireNonEmptyString(updates.legal_name, 'legal_name');
    }

    if (updates.display_name !== undefined) {
      organizationProfile.display_name = requireNonEmptyString(updates.display_name, 'display_name');
    }

    if (updates.domain !== undefined) {
      organizationProfile.domain = typeof updates.domain === 'string' && updates.domain.trim().length > 0 ? updates.domain.trim() : undefined;
    }

    if (updates.company_size !== undefined) {
      organizationProfile.company_size = updates.company_size;
    }

    organizationProfile.updated_at = nowIso();
    organizationProfile.active_user_count = countLocalUsersForTenant(tenantId);
    accountProvisioningState.organization_by_tenant[tenantId] = organizationProfile;

    updateLocalTenant(tenantId, {
      name: organizationProfile.display_name,
      domain: organizationProfile.domain
    });

    const billingProfile = ensureBillingProfile(tenantId);
    billingProfile.organization_name = organizationProfile.display_name;
    billingProfile.updated_at = nowIso();
    accountProvisioningState.billing_by_tenant[tenantId] = billingProfile;

    persistState();
    return clone(organizationProfile);
  }
}
