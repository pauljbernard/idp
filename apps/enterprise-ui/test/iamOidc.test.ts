import { describe, expect, it } from 'vitest'
import {
  IAM_CALLBACK_PATH,
  IAM_SCOPE,
  buildIamAuthorizationUrl,
  buildLoginEntryUrl,
  clearPendingIamLogin,
  createPendingIamLogin,
  getIamCallbackUrl,
  readPendingIamLogin,
  storePendingIamLogin,
} from '../src/utils/iamOidc.ts'

describe('iamOidc', () => {
  it('builds login entry urls from normalized optional query values', () => {
    expect(
      buildLoginEntryUrl({
        nextRoute: ' /iam/account ',
        loginHint: ' admin@idp.local ',
        flowContext: ' invite_activation ',
      }),
    ).toContain('/login?next=%2Fiam%2Faccount&login_hint=admin%40idp.local&flow_context=invite_activation')

    expect(buildLoginEntryUrl()).toContain('/login')
  })

  it('persists pending IAM login state in session storage', async () => {
    const pending = await createPendingIamLogin(
      {
        realmId: 'realm-idp-default',
        clientId: 'admin-console-demo',
      },
      '/iam/account',
      {
        loginHint: 'admin@idp.local',
        flowContext: 'account_activation',
      },
    )

    expect(pending.codeChallengeMethod).toBe('S256')
    expect(pending.redirectUri).toBe(getIamCallbackUrl())
    expect(pending.nextRoute).toBe('/iam/account')
    expect(pending.loginHint).toBe('admin@idp.local')
    expect(pending.flowContext).toBe('account_activation')

    storePendingIamLogin(pending)
    expect(readPendingIamLogin()).toEqual(pending)

    const authorizationUrl = new URL(buildIamAuthorizationUrl(pending))
    expect(authorizationUrl.pathname).toBe(`/api/v1/iam/realms/${pending.realmId}/protocol/openid-connect/auth`)
    expect(authorizationUrl.searchParams.get('client_id')).toBe('admin-console-demo')
    expect(authorizationUrl.searchParams.get('scope')).toBe(IAM_SCOPE)
    expect(authorizationUrl.searchParams.get('redirect_uri')).toBe(getIamCallbackUrl())
    expect(authorizationUrl.searchParams.get('code_challenge_method')).toBe('S256')

    clearPendingIamLogin()
    expect(readPendingIamLogin()).toBeNull()
  })

  it('exports the standalone callback path', () => {
    expect(IAM_CALLBACK_PATH).toBe('/login/callback')
  })

  it('returns null for malformed stored login state and omits optional auth parameters when absent', () => {
    window.sessionStorage.setItem('idp.pendingIamLogin', '{not-json')
    expect(readPendingIamLogin()).toBeNull()

    const url = new URL(buildIamAuthorizationUrl({
      realmId: 'realm-idp-default',
      clientId: 'admin-console-demo',
      state: 'state',
      nonce: 'nonce',
      codeVerifier: 'verifier',
      codeChallenge: 'challenge',
      codeChallengeMethod: 'S256',
      redirectUri: getIamCallbackUrl(),
      nextRoute: null,
      loginHint: null,
      flowContext: null,
      createdAt: new Date().toISOString(),
    }))

    expect(url.searchParams.has('login_hint')).toBe(false)
    expect(url.searchParams.has('flow_context')).toBe(false)
  })

  it('falls back to plain PKCE when subtle crypto is unavailable', async () => {
    const originalCrypto = window.crypto
    try {
      Object.defineProperty(window, 'crypto', {
        value: {
          getRandomValues: (bytes: Uint8Array) => {
            bytes.fill(7)
            return bytes
          },
        },
        configurable: true,
      })

      const pending = await createPendingIamLogin({
        realmId: 'realm-idp-default',
        clientId: 'admin-console-demo',
      })

      expect(pending.codeChallengeMethod).toBe('plain')
      expect(pending.codeChallenge).toBe(pending.codeVerifier)
    } finally {
      Object.defineProperty(window, 'crypto', {
        value: originalCrypto,
        configurable: true,
      })
    }
  })

  it('no-ops when session storage is unavailable and errors when secure randomness is unavailable', async () => {
    const originalSessionStorage = window.sessionStorage
    const originalCrypto = window.crypto

    try {
      Object.defineProperty(window, 'sessionStorage', {
        value: undefined,
        configurable: true,
      })

      expect(() => storePendingIamLogin({
        realmId: 'realm-idp-default',
        clientId: 'admin-console-demo',
        state: 'state',
        nonce: 'nonce',
        codeVerifier: 'verifier',
        codeChallenge: 'challenge',
        codeChallengeMethod: 'S256',
        redirectUri: getIamCallbackUrl(),
        nextRoute: null,
        loginHint: null,
        flowContext: null,
        createdAt: new Date().toISOString(),
      })).not.toThrow()
      expect(readPendingIamLogin()).toBeNull()
      expect(() => clearPendingIamLogin()).not.toThrow()

      Object.defineProperty(window, 'crypto', {
        value: {},
        configurable: true,
      })

      await expect(createPendingIamLogin({
        realmId: 'realm-idp-default',
        clientId: 'admin-console-demo',
      })).rejects.toThrow('Browser crypto API is unavailable. Standalone IAM login requires secure random support.')
    } finally {
      Object.defineProperty(window, 'sessionStorage', {
        value: originalSessionStorage,
        configurable: true,
      })
      Object.defineProperty(window, 'crypto', {
        value: originalCrypto,
        configurable: true,
      })
    }
  })

  it('builds a relative login entry url when window is unavailable', () => {
    const originalWindow = globalThis.window

    try {
      Object.defineProperty(globalThis, 'window', {
        value: undefined,
        configurable: true,
      })

      expect(buildLoginEntryUrl({
        nextRoute: '/iam/account',
        loginHint: 'admin@idp.local',
      })).toBe('/login?next=%2Fiam%2Faccount&login_hint=admin%40idp.local')
    } finally {
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        configurable: true,
      })
    }
  })
})
