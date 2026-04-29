import { mkdtempSync, rmSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

async function loginWithConsent(
  realmId: string,
  username: string,
  password: string,
) {
  const { LocalIamAuthenticationRuntimeStore } = await import('../src/platform/iamAuthenticationRuntime')

  const login = await LocalIamAuthenticationRuntimeStore.loginAsync(realmId, {
    username,
    password,
    client_id: 'admin-console-demo',
    scope: ['openid', 'profile', 'email', 'roles', 'groups'],
  })

  if (login.next_step === 'CONSENT_REQUIRED') {
    return await LocalIamAuthenticationRuntimeStore.grantConsentAsync(realmId, {
      login_transaction_id: login.login_transaction_id!,
      approve: true,
    })
  }

  return login
}

describe('protocol runtime scenarios', () => {
  let stateRoot: string | null = null

  afterEach(() => {
    delete process.env.IDP_PLATFORM_STATE_ROOT
    delete process.env.IDP_PLATFORM_DURABLE_ROOT
    delete process.env.IDP_PLATFORM_PERSISTENCE_BACKEND
    delete process.env.IDP_DDB_RUNTIME_DUAL_WRITE
    delete process.env.IDP_DDB_RUNTIME_READ_V2
    vi.resetModules()
    if (stateRoot) {
      rmSync(stateRoot, { recursive: true, force: true })
      stateRoot = null
    }
  })

  it('issues, resolves, introspects, and revokes browser-session tokens through the runtime path', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-protocol-runtime-scenarios-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'
    process.env.IDP_DDB_RUNTIME_DUAL_WRITE = 'true'

    const { IAM_DEFAULT_REALM_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')

    const login = await loginWithConsent(
      IAM_DEFAULT_REALM_ID,
      'admin@idp.local',
      'StandaloneIAM!SuperAdmin2026',
    )

    expect(login.next_step).toBe('AUTHENTICATED')
    expect(login.session_id).toBeTruthy()

    const tokenSet = await LocalIamProtocolRuntimeStore.issueSubjectTokensAsync({
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'admin-console-demo',
      subject_kind: 'USER',
      subject_id: login.user.id,
      requested_scope_names: ['openid', 'profile', 'email'],
      base_url: 'https://idp.local',
      grant_type: 'authorization_code',
      include_refresh_token: true,
      browser_session_id: login.session_id,
    })

    expect(tokenSet.access_token).toBeTruthy()
    expect(tokenSet.refresh_token).toBeTruthy()

    const resolved = await LocalIamProtocolRuntimeStore.resolveBearerAccessTokenAsync(tokenSet.access_token)
    expect(resolved.realm_id).toBe(IAM_DEFAULT_REALM_ID)
    expect(resolved.subject_id).toBe(login.user.id)
    expect(resolved.scope_names).toContain('openid')

    const introspectionBeforeRevoke = await LocalIamProtocolRuntimeStore.introspectTokenAsync(
      IAM_DEFAULT_REALM_ID,
      {
        token: tokenSet.access_token,
        client_id: 'admin-console-demo',
      },
      null,
    )
    expect(introspectionBeforeRevoke.active).toBe(true)

    const userInfo = await LocalIamProtocolRuntimeStore.getUserInfoAsync(
      IAM_DEFAULT_REALM_ID,
      tokenSet.access_token,
    )
    expect(userInfo.sub).toBeTruthy()

    const countsBeforeRevoke = LocalIamProtocolRuntimeStore.countTokensForSubject(
      IAM_DEFAULT_REALM_ID,
      'USER',
      login.user.id,
    )
    expect(countsBeforeRevoke.active_count).toBeGreaterThanOrEqual(1)

    const revoked = await LocalIamProtocolRuntimeStore.revokeTokensForBrowserSessionAsync(
      IAM_DEFAULT_REALM_ID,
      login.session_id!,
    )
    expect(revoked.revoked_count).toBeGreaterThanOrEqual(1)

    const introspectionAfterRevoke = await LocalIamProtocolRuntimeStore.introspectTokenAsync(
      IAM_DEFAULT_REALM_ID,
      {
        token: tokenSet.access_token,
        client_id: 'admin-console-demo',
      },
      null,
    )
    expect(introspectionAfterRevoke.active).toBe(false)

    await expect(
      LocalIamProtocolRuntimeStore.resolveBearerAccessTokenAsync(tokenSet.access_token),
    ).rejects.toThrow('Invalid bearer token')

    await expect(
      LocalIamProtocolRuntimeStore.getUserInfoAsync(IAM_DEFAULT_REALM_ID, tokenSet.access_token),
    ).rejects.toThrow('Invalid bearer token')

    const countsAfterRevoke = LocalIamProtocolRuntimeStore.countTokensForSubject(
      IAM_DEFAULT_REALM_ID,
      'USER',
      login.user.id,
    )
    expect(countsAfterRevoke.total_count).toBeGreaterThanOrEqual(countsBeforeRevoke.total_count)
    expect(countsAfterRevoke.active_count).toBe(0)
  }, 20000)
})
