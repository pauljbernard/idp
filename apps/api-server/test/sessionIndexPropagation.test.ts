import { mkdtempSync, rmSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('browser session to SAML session propagation', () => {
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

  it('logoutAsync terminates linked SAML sessions and index records', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-session-index-logout-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamAuthenticationRuntimeStore } = await import('../src/platform/iamAuthenticationRuntime')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')
    const { LocalIamSessionIndexStore } = await import('../src/platform/iamSessionIndex')
    const { LocalIamTokenOwnershipIndexStore } = await import('../src/platform/iamTokenOwnershipIndex')

    const now = new Date().toISOString()
    const future = new Date(Date.now() + (60 * 60 * 1000)).toISOString()

    LocalIamAuthenticationRuntimeStore.importState({
      account_sessions: [
        {
          id: 'iam-session-browser-primary',
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

    LocalIamProtocolRuntimeStore.importState({
      issued_tokens: [
        {
          id: 'iam-token-browser-primary',
          realm_id: IAM_DEFAULT_REALM_ID,
          client_id: 'oidc-client-primary',
          subject_kind: 'USER',
          subject_id: IAM_SUPER_ADMIN_USER_ID,
          browser_session_id: 'iam-session-browser-primary',
          grant_type: 'authorization_code',
          scope: 'openid profile',
          scope_ids: [],
          issued_at: now,
          expires_at: future,
          refresh_expires_at: future,
          status: 'ACTIVE',
          revoked_at: null,
          requested_purpose: null,
          access_token_hash: 'access-hash-primary',
          refresh_token_hash: 'refresh-hash-primary',
          claims: {},
          id_token_claims: {},
          userinfo_claims: {},
          client_scope_names: ['openid', 'profile'],
        },
      ],
      saml_sessions: [
        {
          id: 'iam-saml-session-linked-primary',
          realm_id: IAM_DEFAULT_REALM_ID,
          client_id: 'saml-client-linked-primary',
          user_id: IAM_SUPER_ADMIN_USER_ID,
          browser_session_id: 'iam-session-browser-primary',
          session_index: 'saml-session-linked-primary',
          relay_state: null,
          acs_url: 'https://example.com/saml/acs',
          created_at: now,
          last_seen_at: now,
          terminated_at: null,
          status: 'ACTIVE',
        },
      ],
    } as any)

    LocalIamSessionIndexStore.importState({
      browser_saml_session_links: [
        {
          id: 'iam-browser-saml-link-primary',
          realm_id: IAM_DEFAULT_REALM_ID,
          user_id: IAM_SUPER_ADMIN_USER_ID,
          client_id: 'saml-client-linked-primary',
          browser_session_reference: 'iam-session-browser-primary',
          browser_session_id: 'iam-session-browser-primary',
          saml_session_id: 'iam-saml-session-linked-primary',
          saml_session_index: 'saml-session-linked-primary',
          created_at: now,
          terminated_at: null,
        },
      ],
    } as any)

    LocalIamTokenOwnershipIndexStore.importState({
      browser_session_token_links: [
        {
          id: 'iam-browser-token-link-primary',
          realm_id: IAM_DEFAULT_REALM_ID,
          browser_session_reference: 'iam-session-browser-primary',
          browser_session_id: 'iam-session-browser-primary',
          token_id: 'iam-token-browser-primary',
          client_id: 'oidc-client-primary',
          subject_kind: 'USER',
          subject_id: IAM_SUPER_ADMIN_USER_ID,
          created_at: now,
          terminated_at: null,
        },
      ],
    } as any)

    const logout = await LocalIamAuthenticationRuntimeStore.logoutAsync(
      IAM_DEFAULT_REALM_ID,
      'iam-session-browser-primary',
    )

    const authenticationState = LocalIamAuthenticationRuntimeStore.exportState() as any
    const protocolState = LocalIamProtocolRuntimeStore.exportState() as any
    const sessionIndexState = LocalIamSessionIndexStore.exportState() as any
    const tokenOwnershipIndexState = LocalIamTokenOwnershipIndexStore.exportState() as any

    expect(logout.revoked).toBe(true)
    expect(authenticationState.account_sessions[0].revoked_at).toBeTruthy()
    expect(protocolState.issued_tokens[0].status).toBe('REVOKED')
    expect(protocolState.issued_tokens[0].revoked_at).toBeTruthy()
    expect(protocolState.saml_sessions[0].status).toBe('TERMINATED')
    expect(protocolState.saml_sessions[0].terminated_at).toBeTruthy()
    expect(sessionIndexState.browser_saml_session_links[0].terminated_at).toBeTruthy()
    expect(tokenOwnershipIndexState.browser_session_token_links[0].terminated_at).toBeTruthy()
  }, 20000)

  it('revokeOtherAccountSessionsAsync terminates only peer-linked SAML sessions', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-session-index-peer-revoke-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamAuthenticationRuntimeStore } = await import('../src/platform/iamAuthenticationRuntime')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')
    const { LocalIamSessionIndexStore } = await import('../src/platform/iamSessionIndex')
    const { LocalIamTokenOwnershipIndexStore } = await import('../src/platform/iamTokenOwnershipIndex')

    const now = new Date().toISOString()
    const future = new Date(Date.now() + (60 * 60 * 1000)).toISOString()

    LocalIamAuthenticationRuntimeStore.importState({
      account_sessions: [
        {
          id: 'iam-session-browser-current',
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
        {
          id: 'iam-session-browser-peer',
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

    LocalIamProtocolRuntimeStore.importState({
      issued_tokens: [
        {
          id: 'iam-token-current',
          realm_id: IAM_DEFAULT_REALM_ID,
          client_id: 'oidc-client-current',
          subject_kind: 'USER',
          subject_id: IAM_SUPER_ADMIN_USER_ID,
          browser_session_id: 'iam-session-browser-current',
          grant_type: 'authorization_code',
          scope: 'openid',
          scope_ids: [],
          issued_at: now,
          expires_at: future,
          refresh_expires_at: future,
          status: 'ACTIVE',
          revoked_at: null,
          requested_purpose: null,
          access_token_hash: 'access-hash-current',
          refresh_token_hash: 'refresh-hash-current',
          claims: {},
          id_token_claims: {},
          userinfo_claims: {},
          client_scope_names: ['openid'],
        },
        {
          id: 'iam-token-peer',
          realm_id: IAM_DEFAULT_REALM_ID,
          client_id: 'oidc-client-peer',
          subject_kind: 'USER',
          subject_id: IAM_SUPER_ADMIN_USER_ID,
          browser_session_id: 'iam-session-browser-peer',
          grant_type: 'authorization_code',
          scope: 'openid',
          scope_ids: [],
          issued_at: now,
          expires_at: future,
          refresh_expires_at: future,
          status: 'ACTIVE',
          revoked_at: null,
          requested_purpose: null,
          access_token_hash: 'access-hash-peer',
          refresh_token_hash: 'refresh-hash-peer',
          claims: {},
          id_token_claims: {},
          userinfo_claims: {},
          client_scope_names: ['openid'],
        },
      ],
      saml_sessions: [
        {
          id: 'iam-saml-session-current',
          realm_id: IAM_DEFAULT_REALM_ID,
          client_id: 'saml-client-current',
          user_id: IAM_SUPER_ADMIN_USER_ID,
          browser_session_id: 'iam-session-browser-current',
          session_index: 'saml-session-current',
          relay_state: null,
          acs_url: 'https://example.com/saml/current',
          created_at: now,
          last_seen_at: now,
          terminated_at: null,
          status: 'ACTIVE',
        },
        {
          id: 'iam-saml-session-peer',
          realm_id: IAM_DEFAULT_REALM_ID,
          client_id: 'saml-client-peer',
          user_id: IAM_SUPER_ADMIN_USER_ID,
          browser_session_id: 'iam-session-browser-peer',
          session_index: 'saml-session-peer',
          relay_state: null,
          acs_url: 'https://example.com/saml/peer',
          created_at: now,
          last_seen_at: now,
          terminated_at: null,
          status: 'ACTIVE',
        },
      ],
    } as any)

    LocalIamSessionIndexStore.importState({
      browser_saml_session_links: [
        {
          id: 'iam-browser-saml-link-current',
          realm_id: IAM_DEFAULT_REALM_ID,
          user_id: IAM_SUPER_ADMIN_USER_ID,
          client_id: 'saml-client-current',
          browser_session_reference: 'iam-session-browser-current',
          browser_session_id: 'iam-session-browser-current',
          saml_session_id: 'iam-saml-session-current',
          saml_session_index: 'saml-session-current',
          created_at: now,
          terminated_at: null,
        },
        {
          id: 'iam-browser-saml-link-peer',
          realm_id: IAM_DEFAULT_REALM_ID,
          user_id: IAM_SUPER_ADMIN_USER_ID,
          client_id: 'saml-client-peer',
          browser_session_reference: 'iam-session-browser-peer',
          browser_session_id: 'iam-session-browser-peer',
          saml_session_id: 'iam-saml-session-peer',
          saml_session_index: 'saml-session-peer',
          created_at: now,
          terminated_at: null,
        },
      ],
    } as any)

    LocalIamTokenOwnershipIndexStore.importState({
      browser_session_token_links: [
        {
          id: 'iam-browser-token-link-current',
          realm_id: IAM_DEFAULT_REALM_ID,
          browser_session_reference: 'iam-session-browser-current',
          browser_session_id: 'iam-session-browser-current',
          token_id: 'iam-token-current',
          client_id: 'oidc-client-current',
          subject_kind: 'USER',
          subject_id: IAM_SUPER_ADMIN_USER_ID,
          created_at: now,
          terminated_at: null,
        },
        {
          id: 'iam-browser-token-link-peer',
          realm_id: IAM_DEFAULT_REALM_ID,
          browser_session_reference: 'iam-session-browser-peer',
          browser_session_id: 'iam-session-browser-peer',
          token_id: 'iam-token-peer',
          client_id: 'oidc-client-peer',
          subject_kind: 'USER',
          subject_id: IAM_SUPER_ADMIN_USER_ID,
          created_at: now,
          terminated_at: null,
        },
      ],
    } as any)

    const revocation = await LocalIamAuthenticationRuntimeStore.revokeOtherAccountSessionsAsync(
      IAM_DEFAULT_REALM_ID,
      'iam-session-browser-current',
    )

    const authenticationState = LocalIamAuthenticationRuntimeStore.exportState() as any
    const protocolState = LocalIamProtocolRuntimeStore.exportState() as any
    const sessionIndexState = LocalIamSessionIndexStore.exportState() as any
    const tokenOwnershipIndexState = LocalIamTokenOwnershipIndexStore.exportState() as any

    const currentSession = authenticationState.account_sessions.find((session: any) => session.id === 'iam-session-browser-current')
    const peerSession = authenticationState.account_sessions.find((session: any) => session.id === 'iam-session-browser-peer')
    const currentToken = protocolState.issued_tokens.find((token: any) => token.id === 'iam-token-current')
    const peerToken = protocolState.issued_tokens.find((token: any) => token.id === 'iam-token-peer')
    const currentSamlSession = protocolState.saml_sessions.find((session: any) => session.id === 'iam-saml-session-current')
    const peerSamlSession = protocolState.saml_sessions.find((session: any) => session.id === 'iam-saml-session-peer')
    const currentLink = sessionIndexState.browser_saml_session_links.find((link: any) => link.id === 'iam-browser-saml-link-current')
    const peerLink = sessionIndexState.browser_saml_session_links.find((link: any) => link.id === 'iam-browser-saml-link-peer')
    const currentTokenLink = tokenOwnershipIndexState.browser_session_token_links.find((link: any) => link.id === 'iam-browser-token-link-current')
    const peerTokenLink = tokenOwnershipIndexState.browser_session_token_links.find((link: any) => link.id === 'iam-browser-token-link-peer')

    expect(revocation.revoked_count).toBe(1)
    expect(currentSession.revoked_at).toBeNull()
    expect(peerSession.revoked_at).toBeTruthy()
    expect(currentToken.status).toBe('ACTIVE')
    expect(currentToken.revoked_at).toBeNull()
    expect(peerToken.status).toBe('REVOKED')
    expect(peerToken.revoked_at).toBeTruthy()
    expect(currentSamlSession.status).toBe('ACTIVE')
    expect(peerSamlSession.status).toBe('TERMINATED')
    expect(currentLink.terminated_at).toBeNull()
    expect(peerLink.terminated_at).toBeTruthy()
    expect(currentTokenLink.terminated_at).toBeNull()
    expect(peerTokenLink.terminated_at).toBeTruthy()
  }, 20000)

  it('logoutAsync terminates linked SAML sessions under runtime flags without relying on session or token indexes', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-session-index-runtime-flags-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'
    process.env.IDP_DDB_RUNTIME_DUAL_WRITE = 'true'

    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamAuthenticationRuntimeStore } = await import('../src/platform/iamAuthenticationRuntime')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')
    const { LocalIamSessionIndexStore } = await import('../src/platform/iamSessionIndex')
    const { LocalIamTokenOwnershipIndexStore } = await import('../src/platform/iamTokenOwnershipIndex')

    const now = new Date().toISOString()
    const future = new Date(Date.now() + (60 * 60 * 1000)).toISOString()

    LocalIamAuthenticationRuntimeStore.importState({
      account_sessions: [
        {
          id: 'iam-session-browser-flagged',
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
          federated_login_context: null,
          synthetic: true,
        },
      ],
    } as any)

    LocalIamProtocolRuntimeStore.importState({
      issued_tokens: [
        {
          id: 'iam-token-browser-flagged',
          realm_id: IAM_DEFAULT_REALM_ID,
          client_id: 'oidc-client-flagged',
          subject_kind: 'USER',
          subject_id: IAM_SUPER_ADMIN_USER_ID,
          browser_session_id: 'iam-session-browser-flagged',
          grant_type: 'authorization_code',
          scope: 'openid profile',
          scope_ids: [],
          issued_at: now,
          expires_at: future,
          refresh_expires_at: future,
          status: 'ACTIVE',
          revoked_at: null,
          requested_purpose: null,
          access_token_hash: 'access-hash-flagged',
          refresh_token_hash: 'refresh-hash-flagged',
          claims: {},
          id_token_claims: {},
          userinfo_claims: {},
          client_scope_names: ['openid', 'profile'],
        },
      ],
      saml_sessions: [
        {
          id: 'iam-saml-session-flagged',
          realm_id: IAM_DEFAULT_REALM_ID,
          client_id: 'saml-client-flagged',
          user_id: IAM_SUPER_ADMIN_USER_ID,
          browser_session_id: 'iam-session-browser-flagged',
          session_index: 'saml-session-flagged',
          relay_state: null,
          acs_url: 'https://example.com/saml/flagged',
          created_at: now,
          last_seen_at: now,
          terminated_at: null,
          status: 'ACTIVE',
        },
      ],
    } as any)

    LocalIamSessionIndexStore.importState({
      browser_saml_session_links: [],
    } as any)

    LocalIamTokenOwnershipIndexStore.importState({
      browser_session_token_links: [],
    } as any)

    const logout = await LocalIamAuthenticationRuntimeStore.logoutAsync(
      IAM_DEFAULT_REALM_ID,
      'iam-session-browser-flagged',
    )

    const authenticationState = LocalIamAuthenticationRuntimeStore.exportState() as any
    const protocolState = LocalIamProtocolRuntimeStore.exportState() as any
    const sessionIndexState = LocalIamSessionIndexStore.exportState() as any
    const tokenOwnershipIndexState = LocalIamTokenOwnershipIndexStore.exportState() as any

    expect(logout.revoked).toBe(true)
    expect(authenticationState.account_sessions[0].revoked_at).toBeTruthy()
    expect(protocolState.issued_tokens[0].status).toBe('REVOKED')
    expect(protocolState.issued_tokens[0].revoked_at).toBeTruthy()
    expect(protocolState.saml_sessions[0].status).toBe('TERMINATED')
    expect(protocolState.saml_sessions[0].terminated_at).toBeTruthy()
    expect(sessionIndexState.browser_saml_session_links).toHaveLength(0)
    expect(tokenOwnershipIndexState.browser_session_token_links).toHaveLength(0)
  }, 20000)
})
