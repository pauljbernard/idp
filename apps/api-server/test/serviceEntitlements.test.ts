import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SERVICE_ENTITLEMENT,
  ENABLED_SERVICE_ENTITLEMENT,
  isServiceEntitlementEnabled,
  normalizeServiceEntitlementValue,
  normalizeServiceEntitlementValues,
} from '../src/platform/serviceEntitlements'

describe('serviceEntitlements', () => {
  it('normalizes standalone and legacy entitlement values', () => {
    expect(normalizeServiceEntitlementValue('INTEGRATION_ENABLED')).toBe(ENABLED_SERVICE_ENTITLEMENT)
    expect(normalizeServiceEntitlementValue('FAA_ENABLED')).toBe(ENABLED_SERVICE_ENTITLEMENT)
    expect(normalizeServiceEntitlementValue('INTEGRATION_DISABLED')).toBe(DEFAULT_SERVICE_ENTITLEMENT)
    expect(normalizeServiceEntitlementValue('FAA_DISABLED')).toBe(DEFAULT_SERVICE_ENTITLEMENT)
  })

  it('falls back to the supplied default when the value is unknown', () => {
    expect(
      normalizeServiceEntitlementValue(undefined, ENABLED_SERVICE_ENTITLEMENT),
    ).toBe(ENABLED_SERVICE_ENTITLEMENT)
    expect(
      normalizeServiceEntitlementValue(null, DEFAULT_SERVICE_ENTITLEMENT),
    ).toBe(DEFAULT_SERVICE_ENTITLEMENT)
  })

  it('reports whether the entitlement is enabled', () => {
    expect(isServiceEntitlementEnabled('INTEGRATION_ENABLED')).toBe(true)
    expect(isServiceEntitlementEnabled('FAA_ENABLED')).toBe(true)
    expect(isServiceEntitlementEnabled('INTEGRATION_DISABLED')).toBe(false)
    expect(isServiceEntitlementEnabled(undefined)).toBe(false)
  })

  it('deduplicates normalized entitlement collections', () => {
    expect(
      normalizeServiceEntitlementValues([
        'FAA_ENABLED',
        'INTEGRATION_ENABLED',
        'FAA_DISABLED',
        'INTEGRATION_DISABLED',
      ]),
    ).toEqual(['INTEGRATION_ENABLED', 'INTEGRATION_DISABLED'])
  })
})
