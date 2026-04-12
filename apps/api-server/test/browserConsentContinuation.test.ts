import { mkdtempSync, rmSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('browser consent continuation', () => {
  let stateRoot: string | null = null

  afterEach(() => {
    delete process.env.IDP_PLATFORM_STATE_ROOT
    delete process.env.IDP_PLATFORM_DURABLE_ROOT
    delete process.env.IDP_PLATFORM_PERSISTENCE_BACKEND
    vi.resetModules()
    if (stateRoot) {
      rmSync(stateRoot, { recursive: true, force: true })
      stateRoot = null
    }
  })

  it('authenticates after granting consent for an OIDC authorization request', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-browser-consent-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')
    const { LocalIamAuthorizationRuntimeStore } = await import('../src/platform/iamAuthorizationRuntime')
    const { LocalIamAuthenticationRuntimeStore } = await import('../src/platform/iamAuthenticationRuntime')

    await LocalIamProtocolRuntimeStore.createClientAsync(IAM_SYSTEM_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'browser-consent-client',
      name: 'Browser Consent Client',
      access_type: 'PUBLIC',
      redirect_uris: ['http://127.0.0.1:3004/login/callback'],
      standard_flow_enabled: true,
    })

    const authorization = await LocalIamAuthorizationRuntimeStore.createAuthorizationRedirectAsync(
      IAM_DEFAULT_REALM_ID,
      {
        client_id: 'browser-consent-client',
        redirect_uri: 'http://127.0.0.1:3004/login/callback',
        response_type: 'code',
        scope: 'openid profile email roles',
        state: 'browser-consent-state',
        nonce: 'browser-consent-nonce',
        code_challenge: 'browser-consent-verifier',
        code_challenge_method: 'plain',
      },
      'http://127.0.0.1:3004',
    )

    const login = await LocalIamAuthenticationRuntimeStore.loginAsync(IAM_DEFAULT_REALM_ID, {
      username: 'admin@idp.local',
      password: 'StandaloneIAM!SuperAdmin2026',
      client_id: 'browser-consent-client',
      scope: ['openid', 'profile', 'email', 'roles'],
    })

    expect(login.next_step).toBe('CONSENT_REQUIRED')
    expect(login.login_transaction_id).toBeTruthy()
    expect(login.pending_scope_consent).toEqual(['email', 'openid', 'profile', 'roles'])

    const consent = await LocalIamAuthenticationRuntimeStore.grantConsentAsync(IAM_DEFAULT_REALM_ID, {
      login_transaction_id: login.login_transaction_id!,
      approve: true,
    })

    expect(consent.next_step).toBe('AUTHENTICATED')
    expect(consent.session_id).toBeTruthy()
    expect(consent.pending_scope_consent).toEqual([])

    const continuation = await LocalIamAuthorizationRuntimeStore.continueAuthorizationRequestAsync(
      IAM_DEFAULT_REALM_ID,
      authorization.authorization_request_id,
      consent.session_id!,
    )

    expect(continuation.status).toBe('AUTHORIZED')
    expect(continuation.redirect_url).toContain('http://127.0.0.1:3004/login/callback?code=')
    expect(continuation.redirect_url).toContain('state=browser-consent-state')
  }, 20000)
})
