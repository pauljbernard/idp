import { loadOrCreatePersistedState, savePersistedState } from './persistence';
import {
  buildTrainingEntitlementsResponse,
  getDefaultTrainingEntitlement,
  getTrainingCatalogMode,
  normalizeTrainingAddOnIds,
  normalizeTrainingEntitlement,
  type TrainingAddOnDefinition,
  type TrainingAddOnId,
  type TrainingCatalogMode,
  type TrainingEntitlement,
  type TrainingEntitlementsResponse
} from './entitlements';
import {
  getSegmentCatalog,
  getSegmentDefinition,
  inferDefaultSegmentId,
  type SegmentCatalogResponse,
  type SegmentDefinition,
  type SegmentId
} from './segments';
import {
  getSolutionPackCatalog,
  getSolutionPackDefinition,
  inferDefaultPackIdsForSegment,
  listSolutionPacksForSegment,
  type SolutionPackCatalogResponse,
  type SolutionPackDefinition,
  type SolutionPackId
} from './solutionPacks';
import { isServiceEntitlementEnabled, type LocalServiceEntitlement } from './serviceEntitlements';
import { hasStandaloneFeature } from './tenantAliases';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

export interface OperatingProfileTenantView {
  id: string;
  name: string;
  account_type: 'INDIVIDUAL' | 'ORGANIZATION';
  organization_kind?: 'GROUP' | 'COMPANY' | 'PUBLIC_SECTOR' | 'RESEARCH';
  subscription_tier: 'BASIC' | 'PRO' | 'ENTERPRISE' | 'GOVERNMENT';
  service_entitlement: LocalServiceEntitlement;
  deployment_profile: 'SHARED_SAAS' | 'US_ENTERPRISE' | 'GOVERNMENT_SENSITIVE';
  assurance_mode: 'STANDARD' | 'HARDENED' | 'GOVERNMENT';
  features: string[];
  status: 'ACTIVE' | 'INACTIVE';
}

export interface OperatingProfileMembershipView {
  tenant_id: string;
  role_id: string;
  role_label: string;
  permissions: string[];
  accessible_surface_ids: string[];
}

export interface OperatingProfileRecord {
  tenant_id: string;
  segment_id: SegmentId;
  training_entitlement: TrainingEntitlement;
  training_catalog_mode: TrainingCatalogMode;
  training_addon_ids: TrainingAddOnId[];
  assigned_pack_ids: SolutionPackId[];
  primary_pack_id: SolutionPackId | null;
  updated_at: string;
  updated_by: string;
}

export interface OperatingProfileResponse {
  generated_at: string;
  tenant_id: string;
  tenant_name: string;
  current: OperatingProfileRecord;
  segment: SegmentDefinition;
  available_segments: SegmentDefinition[];
  assigned_packs: SolutionPackDefinition[];
  available_packs: SolutionPackDefinition[];
  available_training_entitlements: TrainingEntitlementsResponse['available_training_entitlements'];
  available_training_addons: TrainingAddOnDefinition[];
  resolved_docs_route: string;
  resolved_onboarding_route: string;
  runtime_posture: {
    integration_enabled: boolean;
    service_entitlement_enabled: boolean;
    training_enabled: boolean;
    command_center_enabled: boolean;
    public_program_enabled: boolean;
    public_sector_ops_enabled?: boolean;
    developer_portal_enabled: boolean;
  };
  warnings: string[];
}

export interface UpdateOperatingProfileRequest {
  segment_id?: SegmentId;
  training_entitlement?: TrainingEntitlement;
  training_addon_ids?: TrainingAddOnId[];
}

export interface UpdateSolutionPackAssignmentsRequest {
  pack_ids: SolutionPackId[];
  primary_pack_id?: SolutionPackId | null;
}

export interface SolutionPackAssignmentsResponse {
  generated_at: string;
  tenant_id: string;
  segment_id: SegmentId;
  assigned_pack_ids: SolutionPackId[];
  primary_pack_id: SolutionPackId | null;
  assigned_packs: SolutionPackDefinition[];
  available_packs: SolutionPackDefinition[];
}

interface OperatingProfileState {
  by_tenant: Record<string, OperatingProfileRecord>;
}

const OPERATING_PROFILE_STATE_FILE = 'operating-profile-state.json';

const state = loadOrCreatePersistedState<OperatingProfileState>(OPERATING_PROFILE_STATE_FILE, () => ({
  by_tenant: {}
}));

function persistState(): void {
  savePersistedState(OPERATING_PROFILE_STATE_FILE, state);
}

function isCompatiblePack(segmentId: SegmentId, packId: SolutionPackId): boolean {
  const definition = getSolutionPackDefinition(packId);
  return Boolean(definition && definition.target_segments.includes(segmentId));
}

function normalizePackIds(segmentId: SegmentId, packIds: SolutionPackId[]): SolutionPackId[] {
  const normalized = Array.from(new Set(packIds.filter((packId) => isCompatiblePack(segmentId, packId))));
  if (normalized.length > 0) {
    return normalized;
  }
  return inferDefaultPackIdsForSegment(segmentId);
}

function resolvePrimaryPackId(segmentId: SegmentId, packIds: SolutionPackId[], requested: SolutionPackId | null): SolutionPackId | null {
  if (requested && packIds.includes(requested) && isCompatiblePack(segmentId, requested)) {
    return requested;
  }
  return packIds[0] ?? null;
}

function resolveDocsRoute(primaryPackId: SolutionPackId | null, segment: SegmentDefinition): string {
  if (primaryPackId) {
    const pack = getSolutionPackDefinition(primaryPackId);
    if (pack) {
      return pack.default_docs_route;
    }
  }
  return segment.docs_entry_route;
}

function resolveOnboardingRoute(primaryPackId: SolutionPackId | null, segment: SegmentDefinition): string {
  if (primaryPackId) {
    const pack = getSolutionPackDefinition(primaryPackId);
    if (pack) {
      return pack.onboarding_route;
    }
  }
  return segment.onboarding_route;
}

function buildSeedRecord(tenant: OperatingProfileTenantView): OperatingProfileRecord {
  const segmentId = inferDefaultSegmentId(tenant);
  const assignedPackIds = inferDefaultPackIdsForSegment(segmentId);
  const trainingEntitlement = getDefaultTrainingEntitlement(tenant);
  return {
    tenant_id: tenant.id,
    segment_id: segmentId,
    training_entitlement: trainingEntitlement,
    training_catalog_mode: getTrainingCatalogMode(tenant, trainingEntitlement),
    training_addon_ids: [],
    assigned_pack_ids: assignedPackIds,
    primary_pack_id: assignedPackIds[0] ?? null,
    updated_at: nowIso(),
    updated_by: tenant.id
  };
}

function ensureRecord(tenant: OperatingProfileTenantView): OperatingProfileRecord {
  const existing = state.by_tenant[tenant.id];
  if (!existing) {
    const seeded = buildSeedRecord(tenant);
    state.by_tenant[tenant.id] = seeded;
    persistState();
    return seeded;
  }

  let updated = false;
  let segmentId = existing.segment_id;
  const warnings: string[] = [];

  if (!getSegmentDefinition(segmentId)) {
    segmentId = inferDefaultSegmentId(tenant);
    updated = true;
  }

  let trainingEntitlement = normalizeTrainingEntitlement(tenant, existing.training_entitlement);
  if (trainingEntitlement !== existing.training_entitlement) {
    existing.training_entitlement = trainingEntitlement;
    updated = true;
  }

  const normalizedTrainingAddOnIds = normalizeTrainingAddOnIds(tenant, existing.training_addon_ids ?? []);
  if (!Array.isArray(existing.training_addon_ids) || JSON.stringify(normalizedTrainingAddOnIds) !== JSON.stringify(existing.training_addon_ids)) {
    existing.training_addon_ids = normalizedTrainingAddOnIds;
    updated = true;
  }

  const nextCatalogMode = getTrainingCatalogMode(tenant, existing.training_entitlement);
  if (nextCatalogMode !== existing.training_catalog_mode) {
    existing.training_catalog_mode = nextCatalogMode;
    updated = true;
  }

  const normalizedPackIds = normalizePackIds(segmentId, existing.assigned_pack_ids);
  if (JSON.stringify(normalizedPackIds) !== JSON.stringify(existing.assigned_pack_ids)) {
    existing.assigned_pack_ids = normalizedPackIds;
    updated = true;
    warnings.push('Pack assignments were reconciled to the selected segment posture.');
  }

  const primaryPackId = resolvePrimaryPackId(segmentId, existing.assigned_pack_ids, existing.primary_pack_id);
  if (primaryPackId !== existing.primary_pack_id) {
    existing.primary_pack_id = primaryPackId;
    updated = true;
  }

  if (segmentId !== existing.segment_id) {
    existing.segment_id = segmentId;
    updated = true;
  }

  if (updated) {
    existing.updated_at = nowIso();
    persistState();
  }

  return clone(existing);
}

function buildResponse(
  tenant: OperatingProfileTenantView,
  membership: OperatingProfileMembershipView | null
): OperatingProfileResponse {
  const record = ensureRecord(tenant);
  const segment = getSegmentDefinition(record.segment_id);
  if (!segment) {
    throw new Error(`Unknown segment: ${record.segment_id}`);
  }

  const assignedPacks = record.assigned_pack_ids
    .map((packId) => getSolutionPackDefinition(packId))
    .filter((pack): pack is SolutionPackDefinition => Boolean(pack))
    .map((pack) => clone(pack));
  const availablePacks = listSolutionPacksForSegment(record.segment_id);
  const resolvedDocsRoute = resolveDocsRoute(record.primary_pack_id, segment);
  const resolvedOnboardingRoute = resolveOnboardingRoute(record.primary_pack_id, segment);
  const trainingEntitlements = buildTrainingEntitlementsResponse(
    tenant,
    record.training_entitlement,
    record.training_addon_ids
  );
  const warnings: string[] = [];

  if (membership && !membership.accessible_surface_ids.includes('configuration')) {
    warnings.push('The current operator cannot manage configuration even though the tenant operating profile is visible.');
  }

  if (record.training_entitlement === 'TRAINING_DISABLED') {
    warnings.push('Training entitlement is disabled. Pack-linked training and readiness workflows remain unavailable until enabled.');
  }

  return {
    generated_at: nowIso(),
    tenant_id: tenant.id,
    tenant_name: tenant.name,
    current: record,
    segment: clone(segment),
    available_segments: getSegmentCatalog().segments,
    assigned_packs: assignedPacks,
    available_packs: availablePacks,
    available_training_entitlements: trainingEntitlements.available_training_entitlements,
    available_training_addons: trainingEntitlements.available_training_addons,
    resolved_docs_route: resolvedDocsRoute,
    resolved_onboarding_route: resolvedOnboardingRoute,
    runtime_posture: {
      integration_enabled: isServiceEntitlementEnabled(tenant.service_entitlement),
      service_entitlement_enabled: isServiceEntitlementEnabled(tenant.service_entitlement),
      training_enabled: record.training_entitlement !== 'TRAINING_DISABLED',
      command_center_enabled: tenant.features.includes('command_center'),
      public_sector_ops_enabled: hasStandaloneFeature(tenant.features, 'public_programs'),
      public_program_enabled: hasStandaloneFeature(tenant.features, 'public_programs'),
      developer_portal_enabled: tenant.features.includes('developer_portal')
    },
    warnings
  };
}

export class LocalOperatingProfileStore {
  static getOperatingProfile(
    tenant: OperatingProfileTenantView,
    membership: OperatingProfileMembershipView | null
  ): OperatingProfileResponse {
    return buildResponse(tenant, membership);
  }

  static updateOperatingProfile(
    tenant: OperatingProfileTenantView,
    membership: OperatingProfileMembershipView | null,
    actorUserId: string,
    updates: UpdateOperatingProfileRequest
  ): OperatingProfileResponse {
    const record = ensureRecord(tenant);
    const nextSegmentId = updates.segment_id ?? record.segment_id;
    const segmentDefinition = getSegmentDefinition(nextSegmentId);
    if (!segmentDefinition) {
      throw new Error(`Unknown segment: ${nextSegmentId}`);
    }

    record.segment_id = nextSegmentId;
    record.training_entitlement = normalizeTrainingEntitlement(
      tenant,
      updates.training_entitlement ?? record.training_entitlement,
      record.training_entitlement
    );
    record.training_addon_ids = normalizeTrainingAddOnIds(
      tenant,
      updates.training_addon_ids ?? record.training_addon_ids
    );
    record.training_catalog_mode = getTrainingCatalogMode(tenant, record.training_entitlement);
    record.assigned_pack_ids = normalizePackIds(record.segment_id, record.assigned_pack_ids);
    record.primary_pack_id = resolvePrimaryPackId(record.segment_id, record.assigned_pack_ids, record.primary_pack_id);
    record.updated_at = nowIso();
    record.updated_by = actorUserId;
    state.by_tenant[tenant.id] = record;
    persistState();

    return buildResponse(tenant, membership);
  }

  static updateSolutionPackAssignments(
    tenant: OperatingProfileTenantView,
    actorUserId: string,
    updates: UpdateSolutionPackAssignmentsRequest
  ): SolutionPackAssignmentsResponse {
    const record = ensureRecord(tenant);
    record.assigned_pack_ids = normalizePackIds(record.segment_id, updates.pack_ids ?? []);
    record.primary_pack_id = resolvePrimaryPackId(
      record.segment_id,
      record.assigned_pack_ids,
      updates.primary_pack_id ?? record.primary_pack_id
    );
    record.updated_at = nowIso();
    record.updated_by = actorUserId;
    state.by_tenant[tenant.id] = record;
    persistState();

    return {
      generated_at: nowIso(),
      tenant_id: tenant.id,
      segment_id: record.segment_id,
      assigned_pack_ids: [...record.assigned_pack_ids],
      primary_pack_id: record.primary_pack_id,
      assigned_packs: record.assigned_pack_ids
        .map((packId) => getSolutionPackDefinition(packId))
        .filter((pack): pack is SolutionPackDefinition => Boolean(pack))
        .map((pack) => clone(pack)),
      available_packs: listSolutionPacksForSegment(record.segment_id)
    };
  }

  static getEntitlements(tenant: OperatingProfileTenantView): TrainingEntitlementsResponse {
    const record = ensureRecord(tenant);
    return buildTrainingEntitlementsResponse(tenant, record.training_entitlement, record.training_addon_ids);
  }

  static getSegmentCatalog(): SegmentCatalogResponse {
    return getSegmentCatalog();
  }

  static getSolutionPackCatalog(
    tenant: OperatingProfileTenantView
  ): SolutionPackCatalogResponse & Pick<SolutionPackAssignmentsResponse, 'tenant_id' | 'segment_id' | 'assigned_pack_ids' | 'primary_pack_id' | 'assigned_packs' | 'available_packs'> {
    const record = ensureRecord(tenant);
    return {
      ...getSolutionPackCatalog(),
      tenant_id: tenant.id,
      segment_id: record.segment_id,
      assigned_pack_ids: [...record.assigned_pack_ids],
      primary_pack_id: record.primary_pack_id,
      assigned_packs: record.assigned_pack_ids
        .map((packId) => getSolutionPackDefinition(packId))
        .filter((pack): pack is SolutionPackDefinition => Boolean(pack))
        .map((pack) => clone(pack)),
      available_packs: listSolutionPacksForSegment(record.segment_id)
    };
  }
}
