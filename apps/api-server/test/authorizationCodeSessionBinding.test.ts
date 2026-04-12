import { mkdtempSync, rmSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('authorization code session binding', () => {
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

  it('expires a session-bound authorization code during maintenance after browser-session logout', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-authz-code-maintenance-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID, IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamAuthenticationRuntimeStore } = await import('../src/platform/iamAuthenticationRuntime')
    const { LocalIamAuthorizationRuntimeStore } = await import('../src/platform/iamAuthorizationRuntime')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')

    const now = new Date().toISOString()
    const future = new Date(Date.now() + (60 * 60 * 1000)).toISOString()

    await LocalIamProtocolRuntimeStore.createClientAsync(IAM_SYSTEM_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'authorization-code-binding-client',
      name: 'Authorization Code Binding Client',
      access_type: 'PUBLIC',
      redirect_uris: ['https://example.com/callback'],
      standard_flow_enabled: true,
    })

    LocalIamAuthenticationRuntimeStore.importState({
      account_sessions: [
        {
          id: 'iam-session-authz-binding',
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

    LocalIamAuthorizationRuntimeStore.importState({
      authorization_codes: [
        {
          id: 'iam-auth-code-binding',
          authorization_request_id: 'iam-auth-request-binding',
          realm_id: IAM_DEFAULT_REALM_ID,
          client_id: 'authorization-code-binding-client',
          user_id: IAM_SUPER_ADMIN_USER_ID,
          session_id: 'iam-session-authz-binding',
          redirect_uri: 'https://example.com/callback',
          code: 'binding-code',
          requested_scope_names: ['openid'],
          requested_purpose: null,
          state: null,
          nonce: null,
          code_challenge: 'binding-verifier',
          code_challenge_method: 'plain',
          issued_at: now,
          expires_at: future,
          consumed_at: null,
          status: 'ACTIVE',
        },
      ],
    } as any)

    await LocalIamAuthenticationRuntimeStore.logoutAsync(IAM_DEFAULT_REALM_ID, 'iam-session-authz-binding')

    const maintenance = LocalIamAuthorizationRuntimeStore.runTransientStateMaintenance()
    const authorizationState = LocalIamAuthorizationRuntimeStore.exportState() as any

    expect(maintenance.expired_authorization_code_count).toBe(1)
    expect(authorizationState.authorization_codes[0].status).toBe('EXPIRED')
  }, 20000)

  it('rejects token exchange for an authorization code bound to a revoked browser session', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-authz-code-exchange-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID, IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamAuthenticationRuntimeStore } = await import('../src/platform/iamAuthenticationRuntime')
    const { LocalIamAuthorizationRuntimeStore } = await import('../src/platform/iamAuthorizationRuntime')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')

    const now = new Date().toISOString()
    const future = new Date(Date.now() + (60 * 60 * 1000)).toISOString()

    await LocalIamProtocolRuntimeStore.createClientAsync(IAM_SYSTEM_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'authorization-code-exchange-client',
      name: 'Authorization Code Exchange Client',
      access_type: 'PUBLIC',
      redirect_uris: ['https://example.com/callback'],
      standard_flow_enabled: true,
    })

    LocalIamAuthenticationRuntimeStore.importState({
      account_sessions: [
        {
          id: 'iam-session-authz-exchange',
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

    LocalIamAuthorizationRuntimeStore.importState({
      authorization_codes: [
        {
          id: 'iam-auth-code-exchange',
          authorization_request_id: 'iam-auth-request-exchange',
          realm_id: IAM_DEFAULT_REALM_ID,
          client_id: 'authorization-code-exchange-client',
          user_id: IAM_SUPER_ADMIN_USER_ID,
          session_id: 'iam-session-authz-exchange',
          redirect_uri: 'https://example.com/callback',
          code: 'exchange-code',
          requested_scope_names: ['openid'],
          requested_purpose: null,
          state: null,
          nonce: null,
          code_challenge: 'exchange-verifier',
          code_challenge_method: 'plain',
          issued_at: now,
          expires_at: future,
          consumed_at: null,
          status: 'ACTIVE',
        },
      ],
    } as any)

    await LocalIamAuthenticationRuntimeStore.logoutAsync(IAM_DEFAULT_REALM_ID, 'iam-session-authz-exchange')

    await expect(
      LocalIamAuthorizationRuntimeStore.exchangeAuthorizationCodeAsync(
        IAM_DEFAULT_REALM_ID,
        {
          grant_type: 'authorization_code',
          client_id: 'authorization-code-exchange-client',
          code: 'exchange-code',
          redirect_uri: 'https://example.com/callback',
          code_verifier: 'exchange-verifier',
        },
        null,
        'https://idp.local',
      ),
    ).rejects.toThrow('Invalid authorization code')

    const authorizationState = LocalIamAuthorizationRuntimeStore.exportState() as any
    expect(authorizationState.authorization_codes[0].status).toBe('EXPIRED')
  }, 20000)
})
