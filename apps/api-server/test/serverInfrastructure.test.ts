import { describe, expect, it } from 'vitest'
import {
  normalizeHeaderValue,
  resolveCanonicalApiBaseUrl,
  resolveCanonicalUiBaseUrl,
  resolveClientIp,
  resolveTrustProxySetting,
} from '../src/serverInfrastructure'

describe('serverInfrastructure', () => {
  it('uses configured canonical API and UI base URLs when present', () => {
    const apiBaseUrl = resolveCanonicalApiBaseUrl('0.0.0.0', 4000, 'https://identity.example.com/')
    const uiBaseUrl = resolveCanonicalUiBaseUrl(apiBaseUrl, 4000, 'https://console.example.com/')

    expect(apiBaseUrl).toBe('https://identity.example.com')
    expect(uiBaseUrl).toBe('https://console.example.com')
  })

  it('falls back to stable local defaults without request headers', () => {
    const apiBaseUrl = resolveCanonicalApiBaseUrl('0.0.0.0', 4000)
    const uiBaseUrl = resolveCanonicalUiBaseUrl(apiBaseUrl, 4000)

    expect(apiBaseUrl).toBe('http://localhost:4000')
    expect(uiBaseUrl).toBe('http://localhost:3004')
  })

  it('keeps the configured listen host when it is not a wildcard local bind', () => {
    expect(resolveCanonicalApiBaseUrl('identity.internal', 4000)).toBe('http://identity.internal:4000')
  })

  it('rejects invalid or non-http configured base URLs', () => {
    expect(() => resolveCanonicalApiBaseUrl('0.0.0.0', 4000, 'not-a-url')).toThrow(
      'IDP_API_BASE_URL must be a valid absolute http(s) URL.',
    )
    expect(() => resolveCanonicalApiBaseUrl('0.0.0.0', 4000, 'ftp://identity.example.com')).toThrow(
      'IDP_API_BASE_URL must use the http or https scheme.',
    )
  })

  it('parses trust proxy settings explicitly instead of enabling them by default', () => {
    expect(resolveTrustProxySetting(undefined)).toBe(false)
    expect(resolveTrustProxySetting('true')).toBe(true)
    expect(resolveTrustProxySetting('2')).toBe(2)
    expect(resolveTrustProxySetting('loopback')).toBe('loopback')
  })

  it('prefers the socket address when proxy trust is disabled', () => {
    const clientIp = resolveClientIp(
      {
        ip: '198.51.100.24',
        socket: {
          remoteAddress: '127.0.0.1',
        },
      },
      false,
    )

    expect(clientIp).toBe('127.0.0.1')
  })

  it('uses the forwarded client IP only when proxy trust is enabled', () => {
    const clientIp = resolveClientIp(
      {
        ip: '198.51.100.24',
        socket: {
          remoteAddress: '127.0.0.1',
        },
      },
      true,
    )

    expect(clientIp).toBe('198.51.100.24')
  })

  it('normalizes only non-empty string header values', () => {
    expect(normalizeHeaderValue('  value  ')).toBe('value')
    expect(normalizeHeaderValue('   ')).toBeNull()
    expect(normalizeHeaderValue(['value'])).toBeNull()
  })
})
