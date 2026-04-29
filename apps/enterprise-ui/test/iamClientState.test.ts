import { describe, expect, it, vi } from 'vitest'
import {
  CLIENT_CONTEXT_EVENT,
  clearAuthenticatedSession,
  clearIamBearerToken,
  clearIamSession,
  getActiveTenantId,
  getCurrentIamAccessToken,
  getCurrentIamAuthClientId,
  getCurrentIamAuthRealmId,
  getCurrentIamRefreshToken,
  getCurrentIamRealmId,
  getCurrentIamSessionId,
  getCurrentSessionId,
  getCurrentUserId,
  resetCurrentSessionId,
  setActiveTenantId,
  setClientContextState,
  setCurrentIamAccessToken,
  setCurrentIamAuthClientId,
  setCurrentIamAuthRealmId,
  setCurrentIamRefreshToken,
  setCurrentIamRealmId,
  setCurrentIamSessionId,
  setCurrentSessionId,
  setCurrentUserId,
  shouldRefreshIamBrowserAccessToken,
} from '../src/services/iamClientState.ts'

function buildJwt(expirySeconds: number) {
  const header = window.btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
  const payload = window.btoa(JSON.stringify({ exp: expirySeconds }))
  return `${header}.${payload}.signature`
}

describe('iamClientState', () => {
  it('stores client context and emits a change event', () => {
    const handler = vi.fn()
    window.addEventListener(CLIENT_CONTEXT_EVENT, handler as EventListener)

    setClientContextState(
      {
        tenantId: 'northstar-holdings',
        userId: 'user-1',
        sessionId: 'session-1',
      },
      'session',
    )

    expect(getActiveTenantId()).toBe('northstar-holdings')
    expect(getCurrentUserId()).toBe('user-1')
    expect(getCurrentSessionId()).toBe('session-1')
    expect(handler).toHaveBeenCalledTimes(1)
    expect((handler.mock.calls[0]?.[0] as CustomEvent).detail).toMatchObject({
      reason: 'session',
      tenantId: 'northstar-holdings',
      userId: 'user-1',
      sessionId: 'session-1',
    })

    window.removeEventListener(CLIENT_CONTEXT_EVENT, handler as EventListener)
  })

  it('clears authenticated session and IAM browser auth state together', () => {
    setClientContextState(
      {
        tenantId: 'northstar-holdings',
        userId: 'user-1',
        sessionId: 'session-1',
      },
      'session',
    )
    setCurrentIamRealmId('realm-idp-default')
    setCurrentIamSessionId('iam-session-1')
    setCurrentIamAuthRealmId('realm-idp-default')
    setCurrentIamAuthClientId('admin-console-demo')
    setCurrentIamAccessToken('access-token')
    setCurrentIamRefreshToken('refresh-token')

    clearAuthenticatedSession()

    expect(getActiveTenantId()).toBeNull()
    expect(getCurrentUserId()).toBeNull()
    expect(getCurrentSessionId()).toBeNull()
    expect(getCurrentIamRealmId()).toBeNull()
    expect(getCurrentIamSessionId()).toBeNull()
    expect(getCurrentIamAuthRealmId()).toBeNull()
    expect(getCurrentIamAuthClientId()).toBeNull()
    expect(getCurrentIamAccessToken()).toBeNull()
    expect(getCurrentIamRefreshToken()).toBeNull()
  })

  it('refreshes browser access tokens only when they are near expiry or invalid', () => {
    const farFutureToken = buildJwt(Math.floor((Date.now() + (5 * 60 * 1000)) / 1000))
    const staleToken = buildJwt(Math.floor((Date.now() + 15_000) / 1000))

    expect(shouldRefreshIamBrowserAccessToken(farFutureToken)).toBe(false)
    expect(shouldRefreshIamBrowserAccessToken(staleToken)).toBe(true)
    expect(shouldRefreshIamBrowserAccessToken('not-a-jwt')).toBe(true)
  })

  it('does not emit duplicate events when values do not change', () => {
    const handler = vi.fn()
    window.addEventListener(CLIENT_CONTEXT_EVENT, handler as EventListener)

    setActiveTenantId('northstar-holdings')
    setActiveTenantId('northstar-holdings')
    setCurrentUserId('user-1')
    setCurrentUserId('user-1')
    setCurrentSessionId('session-1')
    setCurrentSessionId('session-1')

    expect(handler).toHaveBeenCalledTimes(3)
    resetCurrentSessionId()
    expect(getCurrentSessionId()).toBeNull()
    expect(handler).toHaveBeenCalledTimes(4)

    window.removeEventListener(CLIENT_CONTEXT_EVENT, handler as EventListener)
  })

  it('manages IAM realm, session, and bearer token storage independently', () => {
    setCurrentIamRealmId('realm-idp-default')
    setCurrentIamSessionId('iam-session-1')
    setCurrentIamAccessToken('access-token')

    expect(getCurrentIamRealmId()).toBe('realm-idp-default')
    expect(getCurrentIamSessionId()).toBe('iam-session-1')
    expect(getCurrentIamAccessToken()).toBe('access-token')

    clearIamBearerToken()
    expect(getCurrentIamAccessToken()).toBeNull()

    clearIamSession()
    expect(getCurrentIamRealmId()).toBeNull()
    expect(getCurrentIamSessionId()).toBeNull()
  })

  it('gracefully no-ops when browser storage is unavailable for IAM-specific setters', () => {
    const originalLocalStorage = window.localStorage

    try {
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        configurable: true,
      })

      expect(() => {
        setCurrentIamRealmId('realm-idp-default')
        setCurrentIamSessionId('session-1')
        setCurrentIamAuthRealmId('realm-idp-default')
        setCurrentIamAuthClientId('admin-console-demo')
      }).not.toThrow()
    } finally {
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        configurable: true,
      })
    }
  })

  it('returns safe defaults when window is unavailable', () => {
    const originalWindow = globalThis.window
    const token = buildJwt(Math.floor(Date.now() / 1000) + 600)

    try {
      Object.defineProperty(globalThis, 'window', {
        value: undefined,
        configurable: true,
      })

      expect(getActiveTenantId()).toBeNull()
      expect(() => setClientContextState({ tenantId: 'northstar-holdings' }, 'tenant')).not.toThrow()
      expect(shouldRefreshIamBrowserAccessToken(token)).toBe(true)
    } finally {
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        configurable: true,
      })
    }
  })
})
