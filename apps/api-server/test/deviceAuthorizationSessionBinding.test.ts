import { mkdtempSync, rmSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('device authorization session binding', () => {
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

  it('expires an approved device authorization during maintenance after browser-session logout', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-device-auth-maintenance-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamAuthenticationRuntimeStore } = await import('../src/platform/iamAuthenticationRuntime')
    const { LocalIamAdvancedOAuthRuntimeStore } = await import('../src/platform/iamAdvancedOAuthRuntime')

    const now = new Date().toISOString()
    const future = new Date(Date.now() + (60 * 60 * 1000)).toISOString()

    LocalIamAuthenticationRuntimeStore.importState({
      account_sessions: [
        {
          id: 'iam-session-device-auth-maintenance',
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

    LocalIamAdvancedOAuthRuntimeStore.importState({
      device_authorizations: [
        {
          id: 'iam-device-authorization-maintenance',
          realm_id: IAM_DEFAULT_REALM_ID,
          client_id: 'device-client-maintenance',
          device_code: 'device-code-maintenance',
          user_code: 'USER-CODE-MAINT',
          scope: 'openid',
          scope_names: ['openid'],
          verification_uri: 'https://example.com/verify',
          verification_uri_complete: 'https://example.com/verify?user_code=USER-CODE-MAINT',
          interval: 5,
          expires_at: future,
          status: 'APPROVED',
          user_id: IAM_SUPER_ADMIN_USER_ID,
          approved_at: now,
          denied_at: null,
          consumed_at: null,
          created_at: now,
          session_id: 'iam-session-device-auth-maintenance',
          last_polled_at: null,
          poll_count: 0,
        },
      ],
    } as any)

    await LocalIamAuthenticationRuntimeStore.logoutAsync(IAM_DEFAULT_REALM_ID, 'iam-session-device-auth-maintenance')

    const maintenance = LocalIamAdvancedOAuthRuntimeStore.runTransientStateMaintenance()
    const advancedOauthState = LocalIamAdvancedOAuthRuntimeStore.exportState() as any

    expect(maintenance.expired_device_authorization_count).toBe(1)
    expect(advancedOauthState.device_authorizations[0].status).toBe('EXPIRED')
  }, 20000)

  it('rejects token exchange for an approved device authorization bound to a revoked browser session', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-device-auth-exchange-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID, IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamAuthenticationRuntimeStore } = await import('../src/platform/iamAuthenticationRuntime')
    const { LocalIamAdvancedOAuthRuntimeStore } = await import('../src/platform/iamAdvancedOAuthRuntime')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')

    const now = new Date().toISOString()
    const future = new Date(Date.now() + (60 * 60 * 1000)).toISOString()

    await LocalIamProtocolRuntimeStore.createClientAsync(IAM_SYSTEM_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'device-auth-exchange-client',
      name: 'Device Auth Exchange Client',
      access_type: 'PUBLIC',
      redirect_uris: ['https://example.com/callback'],
    })

    LocalIamAuthenticationRuntimeStore.importState({
      account_sessions: [
        {
          id: 'iam-session-device-auth-exchange',
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

    LocalIamAdvancedOAuthRuntimeStore.importState({
      device_authorizations: [
        {
          id: 'iam-device-authorization-exchange',
          realm_id: IAM_DEFAULT_REALM_ID,
          client_id: 'device-auth-exchange-client',
          device_code: 'device-code-exchange',
          user_code: 'USER-CODE-EXCHANGE',
          scope: 'openid',
          scope_names: ['openid'],
          verification_uri: 'https://example.com/verify',
          verification_uri_complete: 'https://example.com/verify?user_code=USER-CODE-EXCHANGE',
          interval: 5,
          expires_at: future,
          status: 'APPROVED',
          user_id: IAM_SUPER_ADMIN_USER_ID,
          approved_at: now,
          denied_at: null,
          consumed_at: null,
          created_at: now,
          session_id: 'iam-session-device-auth-exchange',
          last_polled_at: null,
          poll_count: 0,
        },
      ],
    } as any)

    await LocalIamAuthenticationRuntimeStore.logoutAsync(IAM_DEFAULT_REALM_ID, 'iam-session-device-auth-exchange')

    await expect(
      LocalIamAdvancedOAuthRuntimeStore.exchangeDeviceAuthorizationCodeAsync(
        IAM_DEFAULT_REALM_ID,
        {
          client_id: 'device-auth-exchange-client',
          device_code: 'device-code-exchange',
        },
        null,
        'https://idp.local',
      ),
    ).rejects.toThrow('expired_token')

    const advancedOauthState = LocalIamAdvancedOAuthRuntimeStore.exportState() as any
    expect(advancedOauthState.device_authorizations[0].status).toBe('EXPIRED')
  }, 20000)
})
