import { mkdtempSync, rmSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('browser session token ownership index', () => {
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

  it('expires ownership links when session-owned tokens expire during maintenance', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-token-ownership-maintenance-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')
    const { LocalIamTokenOwnershipIndexStore } = await import('../src/platform/iamTokenOwnershipIndex')

    const now = new Date().toISOString()
    const past = new Date(Date.now() - (60 * 60 * 1000)).toISOString()

    LocalIamProtocolRuntimeStore.importState({
      issued_tokens: [
        {
          id: 'iam-token-expired-indexed',
          realm_id: IAM_DEFAULT_REALM_ID,
          client_id: 'oidc-client-expired-indexed',
          subject_kind: 'USER',
          subject_id: IAM_SUPER_ADMIN_USER_ID,
          browser_session_id: 'iam-session-expired-indexed',
          grant_type: 'authorization_code',
          scope: 'openid profile',
          scope_ids: [],
          issued_at: now,
          expires_at: past,
          refresh_expires_at: past,
          status: 'ACTIVE',
          revoked_at: null,
          requested_purpose: null,
          access_token_hash: 'access-hash-expired-indexed',
          refresh_token_hash: 'refresh-hash-expired-indexed',
          claims: {},
          id_token_claims: {},
          userinfo_claims: {},
          client_scope_names: ['openid', 'profile'],
        },
      ],
    } as any)

    LocalIamTokenOwnershipIndexStore.importState({
      browser_session_token_links: [
        {
          id: 'iam-browser-token-link-expired-indexed',
          realm_id: IAM_DEFAULT_REALM_ID,
          browser_session_reference: 'iam-session-expired-indexed',
          browser_session_id: 'iam-session-expired-indexed',
          token_id: 'iam-token-expired-indexed',
          client_id: 'oidc-client-expired-indexed',
          subject_kind: 'USER',
          subject_id: IAM_SUPER_ADMIN_USER_ID,
          created_at: now,
          terminated_at: null,
        },
      ],
    } as any)

    const maintenance = LocalIamProtocolRuntimeStore.runTransientStateMaintenance()
    const protocolState = LocalIamProtocolRuntimeStore.exportState() as any
    const tokenOwnershipIndexState = LocalIamTokenOwnershipIndexStore.exportState() as any

    expect(maintenance.expired_issued_token_count).toBe(1)
    expect(protocolState.issued_tokens[0].status).toBe('EXPIRED')
    expect(tokenOwnershipIndexState.browser_session_token_links[0].terminated_at).toBeTruthy()
  }, 20000)

  it('terminates stale ownership links when browser-session revocation cannot resolve the token anymore', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-token-ownership-stale-link-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')
    const { LocalIamTokenOwnershipIndexStore } = await import('../src/platform/iamTokenOwnershipIndex')

    const now = new Date().toISOString()

    LocalIamProtocolRuntimeStore.importState({
      issued_tokens: [],
    } as any)

    LocalIamTokenOwnershipIndexStore.importState({
      browser_session_token_links: [
        {
          id: 'iam-browser-token-link-stale',
          realm_id: IAM_DEFAULT_REALM_ID,
          browser_session_reference: 'iam-session-stale-token-owner',
          browser_session_id: 'iam-session-stale-token-owner',
          token_id: 'iam-token-missing',
          client_id: 'oidc-client-stale',
          subject_kind: 'USER',
          subject_id: IAM_SUPER_ADMIN_USER_ID,
          created_at: now,
          terminated_at: null,
        },
      ],
    } as any)

    const revocation = await LocalIamProtocolRuntimeStore.revokeTokensForBrowserSessionAsync(
      IAM_DEFAULT_REALM_ID,
      'iam-session-stale-token-owner',
    )
    const tokenOwnershipIndexState = LocalIamTokenOwnershipIndexStore.exportState() as any

    expect(revocation.revoked_count).toBe(0)
    expect(tokenOwnershipIndexState.browser_session_token_links[0].terminated_at).toBeTruthy()
  }, 20000)

  it('revokes browser-session tokens under runtime flags without relying on ownership index records', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-token-ownership-runtime-flags-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'
    process.env.IDP_DDB_RUNTIME_DUAL_WRITE = 'true'

    const { IAM_DEFAULT_REALM_ID, IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')
    const { LocalIamTokenOwnershipIndexStore } = await import('../src/platform/iamTokenOwnershipIndex')

    const now = new Date().toISOString()
    const future = new Date(Date.now() + (60 * 60 * 1000)).toISOString()

    LocalIamProtocolRuntimeStore.importState({
      issued_tokens: [
        {
          id: 'iam-token-runtime-flagged',
          realm_id: IAM_DEFAULT_REALM_ID,
          client_id: 'oidc-client-runtime-flagged',
          subject_kind: 'USER',
          subject_id: IAM_SYSTEM_USER_ID,
          browser_session_id: 'iam-session-runtime-flagged',
          grant_type: 'authorization_code',
          scope: 'openid profile',
          scope_ids: [],
          issued_at: now,
          expires_at: future,
          refresh_expires_at: future,
          status: 'ACTIVE',
          revoked_at: null,
          requested_purpose: null,
          access_token_hash: 'access-hash-runtime-flagged',
          refresh_token_hash: 'refresh-hash-runtime-flagged',
          claims: {},
          id_token_claims: {},
          userinfo_claims: {},
          client_scope_names: ['openid', 'profile'],
        },
      ],
    } as any)

    LocalIamTokenOwnershipIndexStore.importState({
      browser_session_token_links: [],
    } as any)

    const revocation = await LocalIamProtocolRuntimeStore.revokeTokensForBrowserSessionAsync(
      IAM_DEFAULT_REALM_ID,
      'iam-session-runtime-flagged',
    )
    const protocolState = LocalIamProtocolRuntimeStore.exportState() as any
    const tokenOwnershipIndexState = LocalIamTokenOwnershipIndexStore.exportState() as any

    expect(revocation.revoked_count).toBe(1)
    expect(protocolState.issued_tokens[0].status).toBe('REVOKED')
    expect(protocolState.issued_tokens[0].revoked_at).toBeTruthy()
    expect(tokenOwnershipIndexState.browser_session_token_links).toHaveLength(0)
  }, 20000)
})
