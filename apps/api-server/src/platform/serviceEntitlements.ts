export type LegacyLocalServiceEntitlement = 'FAA_DISABLED' | 'FAA_ENABLED';
export type LocalServiceEntitlement = 'INTEGRATION_DISABLED' | 'INTEGRATION_ENABLED';
export type LocalServiceEntitlementInput = LocalServiceEntitlement | LegacyLocalServiceEntitlement;

export const DEFAULT_SERVICE_ENTITLEMENT: LocalServiceEntitlement = 'INTEGRATION_DISABLED';
export const ENABLED_SERVICE_ENTITLEMENT: LocalServiceEntitlement = 'INTEGRATION_ENABLED';

export function normalizeServiceEntitlementValue(
  value: LocalServiceEntitlementInput | undefined | null,
  fallback: LocalServiceEntitlement = DEFAULT_SERVICE_ENTITLEMENT,
): LocalServiceEntitlement {
  if (value === 'INTEGRATION_ENABLED' || value === 'FAA_ENABLED') {
    return 'INTEGRATION_ENABLED';
  }

  if (value === 'INTEGRATION_DISABLED' || value === 'FAA_DISABLED') {
    return 'INTEGRATION_DISABLED';
  }

  return fallback;
}

export function isServiceEntitlementEnabled(
  value: LocalServiceEntitlementInput | undefined | null,
): boolean {
  return normalizeServiceEntitlementValue(value) === ENABLED_SERVICE_ENTITLEMENT;
}

export function normalizeServiceEntitlementValues(
  values: Array<LocalServiceEntitlementInput> | undefined | null,
): LocalServiceEntitlement[] {
  return Array.from(
    new Set((values ?? []).map((value) => normalizeServiceEntitlementValue(value))),
  );
}
