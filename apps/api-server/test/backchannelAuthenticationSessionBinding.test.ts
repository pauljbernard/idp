import { mkdtempSync, rmSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('backchannel authentication session binding', () => {
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

  it('expires an approved backchannel authentication request during maintenance after browser-session logout', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-backchannel-auth-maintenance-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID, IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamAuthenticationRuntimeStore } = await import('../src/platform/iamAuthenticationRuntime')
    const { LocalIamAdvancedOAuthRuntimeStore } = await import('../src/platform/iamAdvancedOAuthRuntime')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')

    const now = new Date().toISOString()
    const future = new Date(Date.now() + (60 * 60 * 1000)).toISOString()

    const createdClient = await LocalIamProtocolRuntimeStore.createClientAsync(IAM_SYSTEM_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'ciba-maintenance-client',
      name: 'CIBA Maintenance Client',
      access_type: 'CONFIDENTIAL',
      redirect_uris: ['https://example.com/callback'],
    })

    LocalIamAuthenticationRuntimeStore.importState({
      account_sessions: [
        {
          id: 'iam-session-ciba-maintenance',
          realm_id: IAM_DEFAULT_REALM_ID,
          user_id: IAM_SUPER_ADMIN_USER_ID,
          client_id: null,
          client_identifier: null,
          client_name: null,
          client_protocol: null,
          scope_names: [],
          assurance_level: 'PASSWORD',
          authenticated_at: now,
          issued_at: now,
          last_seen_at: now,
          expires_at: future,
          revoked_at: null,
          session_proof_hash: null,
          synthetic: true,
        },
      ],
    } as any)

    const backchannelAuth = await LocalIamAdvancedOAuthRuntimeStore.createBackchannelAuthenticationRequestAsync(
      IAM_DEFAULT_REALM_ID,
      {
        client_id: createdClient.client.client_id,
        client_secret: createdClient.issued_client_secret,
        login_hint: 'admin@idp.local',
        scope: 'openid profile',
      },
      null,
    )

    await LocalIamAdvancedOAuthRuntimeStore.verifyBackchannelAuthenticationAsync(
      IAM_DEFAULT_REALM_ID,
      'iam-session-ciba-maintenance',
      {
        auth_req_id: backchannelAuth.auth_req_id,
        approve: true,
      },
    )

    await LocalIamAuthenticationRuntimeStore.logoutAsync(IAM_DEFAULT_REALM_ID, 'iam-session-ciba-maintenance')

    const maintenance = LocalIamAdvancedOAuthRuntimeStore.runTransientStateMaintenance()
    const advancedOauthState = LocalIamAdvancedOAuthRuntimeStore.exportState() as any
    const storedRequest = advancedOauthState.backchannel_authentication_requests.find(
      (candidate: any) => candidate.auth_req_id === backchannelAuth.auth_req_id,
    )

    expect(maintenance.expired_backchannel_authentication_request_count).toBe(1)
    expect(storedRequest?.session_id).toBe('iam-session-ciba-maintenance')
    expect(storedRequest?.status).toBe('EXPIRED')
  }, 20000)

  it('rejects token exchange for an approved backchannel authentication request bound to a revoked browser session', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-backchannel-auth-exchange-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID, IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamAuthenticationRuntimeStore } = await import('../src/platform/iamAuthenticationRuntime')
    const { LocalIamAdvancedOAuthRuntimeStore } = await import('../src/platform/iamAdvancedOAuthRuntime')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')

    const now = new Date().toISOString()
    const future = new Date(Date.now() + (60 * 60 * 1000)).toISOString()

    const createdClient = await LocalIamProtocolRuntimeStore.createClientAsync(IAM_SYSTEM_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'ciba-exchange-client',
      name: 'CIBA Exchange Client',
      access_type: 'CONFIDENTIAL',
      redirect_uris: ['https://example.com/callback'],
    })

    LocalIamAuthenticationRuntimeStore.importState({
      account_sessions: [
        {
          id: 'iam-session-ciba-exchange',
          realm_id: IAM_DEFAULT_REALM_ID,
          user_id: IAM_SUPER_ADMIN_USER_ID,
          client_id: null,
          client_identifier: null,
          client_name: null,
          client_protocol: null,
          scope_names: [],
          assurance_level: 'PASSWORD',
          authenticated_at: now,
          issued_at: now,
          last_seen_at: now,
          expires_at: future,
          revoked_at: null,
          session_proof_hash: null,
          synthetic: true,
        },
      ],
    } as any)

    const backchannelAuth = await LocalIamAdvancedOAuthRuntimeStore.createBackchannelAuthenticationRequestAsync(
      IAM_DEFAULT_REALM_ID,
      {
        client_id: createdClient.client.client_id,
        client_secret: createdClient.issued_client_secret,
        login_hint: 'admin@idp.local',
        scope: 'openid profile',
      },
      null,
    )

    await LocalIamAdvancedOAuthRuntimeStore.verifyBackchannelAuthenticationAsync(
      IAM_DEFAULT_REALM_ID,
      'iam-session-ciba-exchange',
      {
        auth_req_id: backchannelAuth.auth_req_id,
        approve: true,
      },
    )

    await LocalIamAuthenticationRuntimeStore.logoutAsync(IAM_DEFAULT_REALM_ID, 'iam-session-ciba-exchange')

    await expect(
      LocalIamAdvancedOAuthRuntimeStore.exchangeBackchannelAuthenticationTokenAsync(
        IAM_DEFAULT_REALM_ID,
        {
          client_id: createdClient.client.client_id,
          client_secret: createdClient.issued_client_secret,
          auth_req_id: backchannelAuth.auth_req_id,
        },
        null,
        'https://idp.local',
      ),
    ).rejects.toThrow('expired_token')

    const advancedOauthState = LocalIamAdvancedOAuthRuntimeStore.exportState() as any
    const storedRequest = advancedOauthState.backchannel_authentication_requests.find(
      (candidate: any) => candidate.auth_req_id === backchannelAuth.auth_req_id,
    )

    expect(storedRequest?.session_id).toBe('iam-session-ciba-exchange')
    expect(storedRequest?.status).toBe('EXPIRED')
  }, 20000)
})
