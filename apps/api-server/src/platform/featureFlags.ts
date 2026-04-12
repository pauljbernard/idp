import { loadOrCreatePersistedState, savePersistedState } from './persistence';

export type FeatureFlagCategory = 'integration' | 'product';
export type FeatureFlagScope = 'global' | 'tenant' | 'hybrid';
export type FeatureFlagValueType = 'boolean' | 'variant';
export type ConnectorServiceMode = 'disabled' | 'simulated' | 'real';
export type FaaServiceMode = ConnectorServiceMode;

export interface FeatureFlagDefinition {
  key: string;
  name: string;
  description: string;
  category: FeatureFlagCategory;
  scope: FeatureFlagScope;
  value_type: FeatureFlagValueType;
  default_value: boolean | string;
  options?: string[];
  impacts: string[];
}

export interface StoredFeatureFlagValue {
  value: boolean | string;
  updated_at: string;
  updated_by: string;
}

export interface ResolvedFeatureFlag extends FeatureFlagDefinition {
  value: boolean | string;
  source: 'default' | 'global_override' | 'tenant_override';
  updated_at: string | null;
  updated_by: string | null;
}

export interface FeatureFlagCatalogResponse {
  generated_at: string;
  definitions: FeatureFlagDefinition[];
  count: number;
}

export interface FeatureFlagListResponse {
  generated_at: string;
  tenant_id: string | null;
  flags: ResolvedFeatureFlag[];
  count: number;
}

export interface UpdateFeatureFlagRequest {
  value: boolean | string;
}

interface FeatureFlagState {
  global: Record<string, StoredFeatureFlagValue>;
  by_tenant: Record<string, Record<string, StoredFeatureFlagValue>>;
}

const FEATURE_FLAG_STATE_FILE = 'feature-flags-state.json';
const LEGACY_FLAG_KEY_ALIASES: Record<string, string> = {
  'faa.laanc.mode': 'integration.authorization_connector.mode',
  'faa.b4ufly.mode': 'integration.public_guidance_connector.mode',
};

const FLAG_DEFINITIONS: FeatureFlagDefinition[] = [
  {
    key: 'integration.authorization_connector.mode',
    name: 'Authorization Connector Mode',
    description:
      'Controls whether the external authorization connector is disabled, routed through the local simulation backend, or routed through the live connector backend.',
    category: 'integration',
    scope: 'hybrid',
    value_type: 'variant',
    default_value: 'simulated',
    options: ['disabled', 'simulated', 'real'],
    impacts: ['/authorization', '/api/v1/authorization/*', '/api/v1/integration/laanc-result']
  },
  {
    key: 'integration.public_guidance_connector.mode',
    name: 'Public Guidance Connector Mode',
    description:
      'Controls whether the anonymous public-guidance capability is disabled, routed through the local simulation backend, or routed through the live connector backend.',
    category: 'integration',
    scope: 'global',
    value_type: 'variant',
    default_value: 'simulated',
    options: ['disabled', 'simulated', 'real'],
    impacts: ['/fly', '/api/v1/public-awareness/*']
  },
  {
    key: 'product.crm.clients_adapter_enabled',
    name: 'CRM Clients Adapter',
    description:
      'Routes legacy /api/v1/clients operations through the CRM subsystem adapter instead of the legacy local client store.',
    category: 'product',
    scope: 'hybrid',
    value_type: 'boolean',
    default_value: false,
    impacts: ['/clients', '/api/v1/clients', '/api/v1/clients/*']
  },
  {
    key: 'product.crm.clients_dual_read_enabled',
    name: 'CRM Clients Dual Read',
    description:
      'Runs dual-read parity checks between legacy client responses and CRM adapter responses for /api/v1/clients list operations.',
    category: 'product',
    scope: 'hybrid',
    value_type: 'boolean',
    default_value: false,
    impacts: ['/clients', '/api/v1/clients']
  },
  {
    key: 'product.training.lms_sdk_enabled',
    name: 'Training LMS SDK Bridge',
    description:
      'Enables SDK-governed training-to-LMS bridge telemetry and rollout controls for /api/v1/training routes.',
    category: 'product',
    scope: 'hybrid',
    value_type: 'boolean',
    default_value: false,
    impacts: ['/training', '/api/v1/training', '/api/v1/training/*']
  },
  {
    key: 'product.training.lms_sdk_http_fallback_enabled',
    name: 'Training LMS SDK HTTP Fallback',
    description:
      'Marks training-to-LMS bridge traffic as HTTP fallback mode for migration drills and rollback validation.',
    category: 'product',
    scope: 'hybrid',
    value_type: 'boolean',
    default_value: false,
    impacts: ['/training', '/api/v1/training', '/api/v1/training/*']
  },
  {
    key: 'product.training.cms_sdk_enabled',
    name: 'Training CMS SDK Bridge',
    description:
      'Enables SDK-governed training-to-CMS content bridge resolution for training catalog and pathway surfaces.',
    category: 'product',
    scope: 'hybrid',
    value_type: 'boolean',
    default_value: false,
    impacts: ['/training', '/api/v1/training/catalog', '/api/v1/training/pathways']
  },
  {
    key: 'product.lms.iam_sdk_enabled',
    name: 'LMS IAM SDK Bridge',
    description:
      'Enables SDK-governed LMS-to-IAM bridge telemetry and rollout controls for generic external identity-binding routes.',
    category: 'product',
    scope: 'hybrid',
    value_type: 'boolean',
    default_value: false,
    impacts: ['/lms', '/api/v1/iam/external-identity-bindings', '/api/v1/iam/external-identity-bindings/*']
  },
  {
    key: 'product.lms.iam_sdk_http_fallback_enabled',
    name: 'LMS IAM SDK HTTP Fallback',
    description:
      'Marks LMS-to-IAM bridge traffic as HTTP fallback mode for generic external identity-binding migration drills and rollback validation.',
    category: 'product',
    scope: 'hybrid',
    value_type: 'boolean',
    default_value: false,
    impacts: ['/lms', '/api/v1/iam/external-identity-bindings', '/api/v1/iam/external-identity-bindings/*']
  },
  {
    key: 'product.lms.commerce_sdk_enabled',
    name: 'LMS Commerce SDK Bridge',
    description:
      'Enables SDK-governed LMS-to-Commerce bridge telemetry and rollout controls for commerce binding routes.',
    category: 'product',
    scope: 'hybrid',
    value_type: 'boolean',
    default_value: false,
    impacts: ['/lms', '/api/v1/lms/commerce-bindings', '/api/v1/lms/commerce-bindings/*', '/api/v1/lms/commerce-activations', '/api/v1/lms/commerce-activations/*']
  },
  {
    key: 'product.workforce.iam_sdk_enabled',
    name: 'Workforce IAM SDK Bridge',
    description:
      'Enables SDK-governed Workforce-to-IAM bridge telemetry and rollout controls for generic external identity-binding routes.',
    category: 'product',
    scope: 'hybrid',
    value_type: 'boolean',
    default_value: false,
    impacts: ['/workforce', '/api/v1/iam/external-identity-bindings', '/api/v1/iam/external-identity-bindings/*']
  },
  {
    key: 'product.workforce.iam_sdk_http_fallback_enabled',
    name: 'Workforce IAM SDK HTTP Fallback',
    description:
      'Marks Workforce-to-IAM bridge traffic as HTTP fallback mode for generic external identity-binding migration drills and rollback validation.',
    category: 'product',
    scope: 'hybrid',
    value_type: 'boolean',
    default_value: false,
    impacts: ['/workforce', '/api/v1/iam/external-identity-bindings', '/api/v1/iam/external-identity-bindings/*']
  },
  {
    key: 'product.workforce.readiness_sdk_enabled',
    name: 'Workforce LMS/Readiness SDK Bridge',
    description:
      'Enables SDK-governed Workforce LMS/readiness bridge telemetry and rollout controls for workforce readiness-binding routes.',
    category: 'product',
    scope: 'hybrid',
    value_type: 'boolean',
    default_value: false,
    impacts: ['/workforce', '/api/v1/workforce/lms-readiness-bindings', '/api/v1/workforce/lms-readiness-bindings/*']
  },
  {
    key: 'product.scheduling.workforce_sdk_enabled',
    name: 'Scheduling Workforce SDK Bridge',
    description:
      'Enables SDK-governed Scheduling-to-Workforce bridge telemetry and rollout controls for scheduling workforce-binding routes.',
    category: 'product',
    scope: 'hybrid',
    value_type: 'boolean',
    default_value: false,
    impacts: ['/scheduling', '/api/v1/scheduling/workforce-bindings', '/api/v1/scheduling/workforce-bindings/*']
  },
  {
    key: 'product.communications.cms_sdk_enabled',
    name: 'Communications CMS SDK Bridge',
    description:
      'Enables SDK-governed Communications-to-CMS bridge telemetry and rollout controls for communications template-binding routes.',
    category: 'product',
    scope: 'hybrid',
    value_type: 'boolean',
    default_value: false,
    impacts: ['/communications', '/api/v1/communications/template-bindings', '/api/v1/communications/template-bindings/*']
  },
  {
    key: 'product.communications.iam_sdk_enabled',
    name: 'Communications IAM SDK Bridge',
    description:
      'Enables SDK-governed Communications-to-IAM bridge telemetry and rollout controls for communications audience-resolution routes.',
    category: 'product',
    scope: 'hybrid',
    value_type: 'boolean',
    default_value: false,
    impacts: ['/communications', '/api/v1/communications/audience-resolutions', '/api/v1/communications/audience-resolutions/*']
  }
];

const state = loadOrCreatePersistedState<FeatureFlagState>(FEATURE_FLAG_STATE_FILE, () => ({
  global: {},
  by_tenant: {}
}));

function migrateState(): void {
  let changed = false;

  Object.entries(LEGACY_FLAG_KEY_ALIASES).forEach(([legacyKey, canonicalKey]) => {
    if (state.global[legacyKey] && !state.global[canonicalKey]) {
      state.global[canonicalKey] = state.global[legacyKey];
      changed = true;
    }
    if (state.global[legacyKey]) {
      delete state.global[legacyKey];
      changed = true;
    }

    Object.values(state.by_tenant).forEach((tenantFlags) => {
      if (tenantFlags[legacyKey] && !tenantFlags[canonicalKey]) {
        tenantFlags[canonicalKey] = tenantFlags[legacyKey];
        changed = true;
      }
      if (tenantFlags[legacyKey]) {
        delete tenantFlags[legacyKey];
        changed = true;
      }
    });
  });

  if (changed) {
    savePersistedState(FEATURE_FLAG_STATE_FILE, state);
  }
}

migrateState();

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeTenantId(tenantId?: string | null): string | null {
  if (typeof tenantId !== 'string') {
    return null;
  }

  const normalized = tenantId.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeFlagKey(key: string): string {
  return LEGACY_FLAG_KEY_ALIASES[key] ?? key;
}

function getLegacyKeysForCanonicalKey(canonicalKey: string): string[] {
  return Object.entries(LEGACY_FLAG_KEY_ALIASES)
    .filter(([, nextKey]) => nextKey === canonicalKey)
    .map(([legacyKey]) => legacyKey);
}

function getDefinition(key: string): FeatureFlagDefinition {
  const definition = FLAG_DEFINITIONS.find((candidate) => candidate.key === normalizeFlagKey(key));
  if (!definition) {
    throw new Error(`Unsupported feature flag: ${key}`);
  }

  return definition;
}

function validateFlagValue(definition: FeatureFlagDefinition, value: boolean | string): boolean | string {
  if (definition.value_type === 'boolean') {
    if (typeof value !== 'boolean') {
      throw new Error(`Feature flag ${definition.key} expects a boolean value`);
    }

    return value;
  }

  if (typeof value !== 'string') {
    throw new Error(`Feature flag ${definition.key} expects a string variant value`);
  }

  if (!definition.options?.includes(value)) {
    throw new Error(`Feature flag ${definition.key} must be one of: ${definition.options?.join(', ')}`);
  }

  return value;
}

function persistState(): void {
  savePersistedState(FEATURE_FLAG_STATE_FILE, state);
}

function resolveStoredValue(
  definition: FeatureFlagDefinition,
  tenantId?: string | null
): {
  value: boolean | string;
  source: ResolvedFeatureFlag['source'];
  updated_at: string | null;
  updated_by: string | null;
} {
  const normalizedTenantId = definition.scope === 'global' ? null : normalizeTenantId(tenantId);
  const tenantOverrides = normalizedTenantId ? state.by_tenant[normalizedTenantId] ?? {} : {};
  const candidateKeys = [definition.key, ...getLegacyKeysForCanonicalKey(definition.key)];
  const tenantValue = candidateKeys.map((key) => tenantOverrides[key]).find(Boolean);
  if (tenantValue) {
    return {
      value: tenantValue.value,
      source: 'tenant_override',
      updated_at: tenantValue.updated_at,
      updated_by: tenantValue.updated_by
    };
  }

  const globalValue = candidateKeys.map((key) => state.global[key]).find(Boolean);
  if (globalValue) {
    return {
      value: globalValue.value,
      source: 'global_override',
      updated_at: globalValue.updated_at,
      updated_by: globalValue.updated_by
    };
  }

  return {
    value: definition.default_value,
    source: 'default',
    updated_at: null,
    updated_by: null
  };
}

function resolveSurfaceFlagKey(surfaceId: string): string | null {
  if (surfaceId === 'authorization') {
    return 'integration.authorization_connector.mode';
  }

  if (surfaceId === 'anonymous-public-awareness') {
    return 'integration.public_guidance_connector.mode';
  }

  return null;
}

export class LocalFeatureFlagStore {
  static listDefinitions(): FeatureFlagCatalogResponse {
    return {
      generated_at: nowIso(),
      definitions: clone(FLAG_DEFINITIONS),
      count: FLAG_DEFINITIONS.length
    };
  }

  static listResolvedFlags(tenantId?: string | null): FeatureFlagListResponse {
    const normalizedTenantId = normalizeTenantId(tenantId);
    const flags = FLAG_DEFINITIONS.map((definition) => {
      const resolved = resolveStoredValue(definition, normalizedTenantId);
      return {
        ...clone(definition),
        value: resolved.value,
        source: resolved.source,
        updated_at: resolved.updated_at,
        updated_by: resolved.updated_by
      } satisfies ResolvedFeatureFlag;
    });

    return {
      generated_at: nowIso(),
      tenant_id: normalizedTenantId,
      flags,
      count: flags.length
    };
  }

  static getResolvedFlag(key: string, tenantId?: string | null): ResolvedFeatureFlag {
    const definition = getDefinition(key);
    const resolved = resolveStoredValue(definition, tenantId);
    return {
      ...clone(definition),
      value: resolved.value,
      source: resolved.source,
      updated_at: resolved.updated_at,
      updated_by: resolved.updated_by
    };
  }

  static updateFlag(
    key: string,
    value: boolean | string,
    actorUserId: string,
    tenantId?: string | null
  ): ResolvedFeatureFlag {
    const definition = getDefinition(key);
    const normalizedValue = validateFlagValue(definition, value);
    const storedValue: StoredFeatureFlagValue = {
      value: normalizedValue,
      updated_at: nowIso(),
      updated_by: actorUserId
    };
    const normalizedTenantId = definition.scope === 'global' ? null : normalizeTenantId(tenantId);

    if (normalizedTenantId) {
      state.by_tenant[normalizedTenantId] = state.by_tenant[normalizedTenantId] ?? {};
      state.by_tenant[normalizedTenantId][definition.key] = storedValue;
      getLegacyKeysForCanonicalKey(definition.key).forEach((legacyKey) => {
        delete state.by_tenant[normalizedTenantId][legacyKey];
      });
    } else {
      state.global[definition.key] = storedValue;
      getLegacyKeysForCanonicalKey(definition.key).forEach((legacyKey) => {
        delete state.global[legacyKey];
      });
    }

    persistState();
    return this.getResolvedFlag(definition.key, normalizedTenantId);
  }

  static getFaaMode(service: 'laanc' | 'b4ufly', tenantId?: string | null): FaaServiceMode {
    const key = service === 'laanc'
      ? 'integration.authorization_connector.mode'
      : 'integration.public_guidance_connector.mode';
    const value = this.getResolvedFlag(key, tenantId).value;
    return value === 'disabled' || value === 'real' ? value : 'simulated';
  }

  static isSurfaceEnabled(surfaceId: string, tenantId?: string | null): boolean {
    const flagKey = resolveSurfaceFlagKey(surfaceId);
    if (!flagKey) {
      return true;
    }

    const resolved = this.getResolvedFlag(flagKey, tenantId).value;
    return resolved !== 'disabled';
  }
}
