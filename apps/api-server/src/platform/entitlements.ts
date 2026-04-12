import type { LocalServiceEntitlement } from './serviceEntitlements';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export type TrainingEntitlement =
  | 'TRAINING_DISABLED'
  | 'CERTIFICATION_PREP'
  | 'COMMERCIAL_READINESS'
  | 'ORGANIZATION_READINESS';

export type TrainingCatalogMode =
  | 'NONE'
  | 'CERTIFICATION_CORE'
  | 'INDIVIDUAL_ALL_ACCESS'
  | 'ORGANIZATION_ALL_ACCESS';

export type TrainingAddOnId =
  | 'ADDON_COMMERCIAL_CORE'
  | 'ADDON_REAL_ESTATE_MEDIA'
  | 'ADDON_AGRICULTURE_FIELD'
  | 'ADDON_INSPECTION_READINESS'
  | 'ADDON_SURVEY_MAPPING'
  | 'ADDON_MUNICIPAL_PROGRAM'
  | 'ADDON_MUNICIPAL_FIELD'
  | 'ADDON_PUBLIC_SAFETY_UAS'
  | 'ADDON_PUBLIC_SAFETY_COMMAND'
  | 'ADDON_DEVELOPER_PLATFORM';

export interface TrainingEntitlementDefinition {
  id: TrainingEntitlement;
  name: string;
  summary: string;
  audience: 'individual' | 'team' | 'organization';
  available_subscription_tiers: Array<'BASIC' | 'PRO' | 'ENTERPRISE' | 'GOVERNMENT'>;
}

export interface TrainingAddOnDefinition {
  id: TrainingAddOnId;
  name: string;
  summary: string;
  audience: 'individual' | 'team' | 'organization';
  available_subscription_tiers: Array<'BASIC' | 'PRO' | 'ENTERPRISE' | 'GOVERNMENT'>;
  price_monthly_cents: number;
  price_annual_cents: number;
}

export interface TrainingEntitlementsResponse {
  generated_at: string;
  tenant_id: string;
  subscription_tier: 'BASIC' | 'PRO' | 'ENTERPRISE' | 'GOVERNMENT';
  service_entitlement: LocalServiceEntitlement;
  current_training_entitlement: TrainingEntitlement;
  catalog_mode: TrainingCatalogMode;
  purchased_training_addon_ids: TrainingAddOnId[];
  available_training_entitlements: TrainingEntitlementDefinition[];
  available_training_addons: TrainingAddOnDefinition[];
}

interface EntitlementTenantView {
  id: string;
  subscription_tier: 'BASIC' | 'PRO' | 'ENTERPRISE' | 'GOVERNMENT';
  service_entitlement: LocalServiceEntitlement;
}

const TRAINING_ENTITLEMENTS: TrainingEntitlementDefinition[] = [
  {
    id: 'TRAINING_DISABLED',
    name: 'Training Disabled',
    summary: 'No dedicated onboarding, readiness, or governance training entitlement is active for this tenant.',
    audience: 'individual',
    available_subscription_tiers: ['BASIC', 'PRO', 'ENTERPRISE', 'GOVERNMENT']
  },
  {
    id: 'CERTIFICATION_PREP',
    name: 'Foundation Readiness',
    summary: 'Identity foundations, policy readiness, and introductory operational posture.',
    audience: 'individual',
    available_subscription_tiers: ['BASIC', 'PRO', 'ENTERPRISE', 'GOVERNMENT']
  },
  {
    id: 'COMMERCIAL_READINESS',
    name: 'Professional Readiness',
    summary: 'Full self-service learner library for advanced operators, including specialization curricula and continuing education.',
    audience: 'team',
    available_subscription_tiers: ['PRO', 'ENTERPRISE', 'GOVERNMENT']
  },
  {
    id: 'ORGANIZATION_READINESS',
    name: 'Organization Readiness',
    summary: 'Training administration, readiness policy, and organization-level qualification management.',
    audience: 'organization',
    available_subscription_tiers: ['ENTERPRISE', 'GOVERNMENT']
  }
];

const TRAINING_ADDONS: TrainingAddOnDefinition[] = [
  {
    id: 'ADDON_COMMERCIAL_CORE',
    name: 'Operations Core Bundle',
    summary: 'Adds advanced operational readiness beyond foundation onboarding.',
    audience: 'individual',
    available_subscription_tiers: ['BASIC'],
    price_monthly_cents: 2900,
    price_annual_cents: 29000
  },
  {
    id: 'ADDON_REAL_ESTATE_MEDIA',
    name: 'Client Delivery Bundle',
    summary: 'Adds client-delivery discipline, evidence packaging, and presentation training.',
    audience: 'individual',
    available_subscription_tiers: ['BASIC'],
    price_monthly_cents: 2400,
    price_annual_cents: 24000
  },
  {
    id: 'ADDON_AGRICULTURE_FIELD',
    name: 'Field Operations Bundle',
    summary: 'Adds field planning, observation discipline, and structured delivery training.',
    audience: 'individual',
    available_subscription_tiers: ['BASIC'],
    price_monthly_cents: 2600,
    price_annual_cents: 26000
  },
  {
    id: 'ADDON_INSPECTION_READINESS',
    name: 'Inspection Readiness Bundle',
    summary: 'Adds inspection execution, findings discipline, and deliverable readiness training.',
    audience: 'individual',
    available_subscription_tiers: ['BASIC'],
    price_monthly_cents: 2600,
    price_annual_cents: 26000
  },
  {
    id: 'ADDON_SURVEY_MAPPING',
    name: 'Mapping and Data Exchange Bundle',
    summary: 'Adds data-capture quality, mapping workflow, and downstream handoff training.',
    audience: 'individual',
    available_subscription_tiers: ['BASIC'],
    price_monthly_cents: 2600,
    price_annual_cents: 26000
  },
  {
    id: 'ADDON_MUNICIPAL_PROGRAM',
    name: 'Public Program Bundle',
    summary: 'Adds public-sector governance and program fundamentals training.',
    audience: 'individual',
    available_subscription_tiers: ['BASIC'],
    price_monthly_cents: 3100,
    price_annual_cents: 31000
  },
  {
    id: 'ADDON_MUNICIPAL_FIELD',
    name: 'Service Delivery Bundle',
    summary: 'Adds service-request execution and structured field handoff training.',
    audience: 'individual',
    available_subscription_tiers: ['BASIC'],
    price_monthly_cents: 3300,
    price_annual_cents: 33000
  },
  {
    id: 'ADDON_PUBLIC_SAFETY_UAS',
    name: 'Operational Readiness Bundle',
    summary: 'Adds incident-linked operations readiness and response training.',
    audience: 'individual',
    available_subscription_tiers: ['BASIC'],
    price_monthly_cents: 3600,
    price_annual_cents: 36000
  },
  {
    id: 'ADDON_PUBLIC_SAFETY_COMMAND',
    name: 'Command Coordination Bundle',
    summary: 'Adds advanced coordination workflows and incident closeout training.',
    audience: 'individual',
    available_subscription_tiers: ['BASIC'],
    price_monthly_cents: 3900,
    price_annual_cents: 39000
  },
  {
    id: 'ADDON_DEVELOPER_PLATFORM',
    name: 'Developer Platform Bundle',
    summary: 'Adds developer onboarding for API, adapters, and platform integration.',
    audience: 'individual',
    available_subscription_tiers: ['BASIC'],
    price_monthly_cents: 2200,
    price_annual_cents: 22000
  }
];

function nowIso(): string {
  return new Date().toISOString();
}

export function listTrainingEntitlementDefinitions(): TrainingEntitlementDefinition[] {
  return TRAINING_ENTITLEMENTS.map((entitlement) => clone(entitlement));
}

export function listTrainingAddOnDefinitions(): TrainingAddOnDefinition[] {
  return TRAINING_ADDONS.map((addon) => clone(addon));
}

export function listAvailableTrainingEntitlements(
  tenant: EntitlementTenantView
): TrainingEntitlementDefinition[] {
  return TRAINING_ENTITLEMENTS
    .filter((entitlement) => entitlement.available_subscription_tiers.includes(tenant.subscription_tier))
    .map((entitlement) => clone(entitlement));
}

export function listAvailableTrainingAddOns(
  tenant: EntitlementTenantView
): TrainingAddOnDefinition[] {
  return TRAINING_ADDONS
    .filter((addon) => addon.available_subscription_tiers.includes(tenant.subscription_tier))
    .map((addon) => clone(addon));
}

export function getDefaultTrainingEntitlement(
  tenant: Pick<EntitlementTenantView, 'subscription_tier'>
): TrainingEntitlement {
  switch (tenant.subscription_tier) {
    case 'BASIC':
      return 'CERTIFICATION_PREP';
    case 'PRO':
      return 'COMMERCIAL_READINESS';
    case 'ENTERPRISE':
    case 'GOVERNMENT':
      return 'ORGANIZATION_READINESS';
    default:
      return 'TRAINING_DISABLED';
  }
}

export function getTrainingCatalogMode(
  tenant: Pick<EntitlementTenantView, 'subscription_tier'>,
  trainingEntitlement: TrainingEntitlement
): TrainingCatalogMode {
  if (trainingEntitlement === 'TRAINING_DISABLED') {
    return 'NONE';
  }

  if (tenant.subscription_tier === 'ENTERPRISE' || tenant.subscription_tier === 'GOVERNMENT') {
    return 'ORGANIZATION_ALL_ACCESS';
  }

  if (tenant.subscription_tier === 'PRO') {
    return 'INDIVIDUAL_ALL_ACCESS';
  }

  return 'CERTIFICATION_CORE';
}

export function normalizeTrainingEntitlement(
  tenant: EntitlementTenantView,
  requested: unknown,
  fallback?: TrainingEntitlement
): TrainingEntitlement {
  const allowedEntitlements = new Set(listAvailableTrainingEntitlements(tenant).map((entitlement) => entitlement.id));
  const defaultEntitlement = fallback ?? getDefaultTrainingEntitlement(tenant);

  if (typeof requested === 'string' && allowedEntitlements.has(requested as TrainingEntitlement)) {
    return requested as TrainingEntitlement;
  }

  if (allowedEntitlements.has(defaultEntitlement)) {
    return defaultEntitlement;
  }

  return 'TRAINING_DISABLED';
}

export function normalizeTrainingAddOnIds(
  tenant: EntitlementTenantView,
  requested: unknown
): TrainingAddOnId[] {
  if (!Array.isArray(requested)) {
    return [];
  }

  const allowedAddOnIds = new Set(listAvailableTrainingAddOns(tenant).map((addon) => addon.id));
  return Array.from(
    new Set(
      requested.filter((addonId): addonId is TrainingAddOnId => (
        typeof addonId === 'string' && allowedAddOnIds.has(addonId as TrainingAddOnId)
      ))
    )
  );
}

export function sumTrainingAddOnAmount(
  addOnIds: TrainingAddOnId[],
  billingCycle: 'monthly' | 'annual'
): number {
  const selectedAddOns = new Set(addOnIds);
  return TRAINING_ADDONS.reduce((total, addon) => {
    if (!selectedAddOns.has(addon.id)) {
      return total;
    }

    return total + (billingCycle === 'annual' ? addon.price_annual_cents : addon.price_monthly_cents);
  }, 0);
}

export function buildTrainingEntitlementsResponse(
  tenant: EntitlementTenantView,
  currentTrainingEntitlement: TrainingEntitlement,
  purchasedTrainingAddOnIds: TrainingAddOnId[] = []
): TrainingEntitlementsResponse {
  return {
    generated_at: nowIso(),
    tenant_id: tenant.id,
    subscription_tier: tenant.subscription_tier,
    service_entitlement: tenant.service_entitlement,
    current_training_entitlement: currentTrainingEntitlement,
    catalog_mode: getTrainingCatalogMode(tenant, currentTrainingEntitlement),
    purchased_training_addon_ids: normalizeTrainingAddOnIds(tenant, purchasedTrainingAddOnIds),
    available_training_entitlements: listAvailableTrainingEntitlements(tenant),
    available_training_addons: listAvailableTrainingAddOns(tenant)
  };
}
