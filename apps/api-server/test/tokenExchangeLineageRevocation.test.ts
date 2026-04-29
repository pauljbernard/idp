import { mkdtempSync, rmSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('token exchange lineage revocation', () => {
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

  it('revokes derived exchanged-token descendants when an access token is explicitly revoked', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-token-exchange-lineage-revoke-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamAdvancedOAuthRuntimeStore } = await import('../src/platform/iamAdvancedOAuthRuntime')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')

    const subjectTokens = await LocalIamProtocolRuntimeStore.issueSubjectTokensAsync({
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'admin-console-demo',
      subject_kind: 'USER',
      subject_id: IAM_SUPER_ADMIN_USER_ID,
      requested_scope_names: ['openid', 'profile'],
      base_url: 'https://idp.local',
      grant_type: 'authorization_code',
      include_refresh_token: false,
    })
    const childTokens = await LocalIamProtocolRuntimeStore.issueSubjectTokensAsync({
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'cms-admin-demo',
      subject_kind: 'USER',
      subject_id: IAM_SUPER_ADMIN_USER_ID,
      requested_scope_names: ['openid', 'profile'],
      base_url: 'https://idp.local',
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      include_refresh_token: false,
    })
    const grandchildTokens = await LocalIamProtocolRuntimeStore.issueSubjectTokensAsync({
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'developer-portal-demo',
      subject_kind: 'USER',
      subject_id: IAM_SUPER_ADMIN_USER_ID,
      requested_scope_names: ['openid'],
      base_url: 'https://idp.local',
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      include_refresh_token: false,
    })

    const subjectRecord = LocalIamProtocolRuntimeStore.resolveIssuedTokenForValue(IAM_DEFAULT_REALM_ID, subjectTokens.access_token)
    const childRecord = LocalIamProtocolRuntimeStore.resolveIssuedTokenForValue(IAM_DEFAULT_REALM_ID, childTokens.access_token)
    const grandchildRecord = LocalIamProtocolRuntimeStore.resolveIssuedTokenForValue(IAM_DEFAULT_REALM_ID, grandchildTokens.access_token)

    LocalIamAdvancedOAuthRuntimeStore.importState({
      token_exchanges: [
        {
          id: 'iam-token-exchange-child',
          realm_id: IAM_DEFAULT_REALM_ID,
          requesting_client_id: 'cms-admin-demo',
          audience_client_id: 'cms-admin-demo',
          subject_kind: 'USER',
          subject_id: IAM_SUPER_ADMIN_USER_ID,
          subject_token_id: subjectRecord.id,
          exchanged_token_id: childRecord.id,
          requested_scope_names: ['openid', 'profile'],
          status: 'ISSUED',
          created_at: new Date().toISOString(),
        },
        {
          id: 'iam-token-exchange-grandchild',
          realm_id: IAM_DEFAULT_REALM_ID,
          requesting_client_id: 'developer-portal-demo',
          audience_client_id: 'developer-portal-demo',
          subject_kind: 'USER',
          subject_id: IAM_SUPER_ADMIN_USER_ID,
          subject_token_id: childRecord.id,
          exchanged_token_id: grandchildRecord.id,
          requested_scope_names: ['openid'],
          status: 'ISSUED',
          created_at: new Date().toISOString(),
        },
      ],
    } as any)

    const revocation = await LocalIamProtocolRuntimeStore.revokeTokenAsync(
      IAM_DEFAULT_REALM_ID,
      {
        client_id: 'cms-admin-demo',
        client_secret: 'StandaloneIAM!cms-admin-demo!Secret2026',
        token: subjectTokens.access_token,
      },
      null,
    )

    const protocolState = LocalIamProtocolRuntimeStore.exportState() as any
    const advancedOauthState = LocalIamAdvancedOAuthRuntimeStore.exportState() as any

    expect(revocation.revoked).toBe(true)
    expect(protocolState.issued_tokens.find((candidate: any) => candidate.id === subjectRecord.id)?.status).toBe('REVOKED')
    expect(protocolState.issued_tokens.find((candidate: any) => candidate.id === childRecord.id)?.status).toBe('REVOKED')
    expect(protocolState.issued_tokens.find((candidate: any) => candidate.id === grandchildRecord.id)?.status).toBe('REVOKED')
    expect(advancedOauthState.token_exchanges.find((candidate: any) => candidate.id === 'iam-token-exchange-child')?.status).toBe('REVOKED')
    expect(advancedOauthState.token_exchanges.find((candidate: any) => candidate.id === 'iam-token-exchange-grandchild')?.status).toBe('REVOKED')
  }, 20000)

  it('expires token-exchange lineage during maintenance when the subject token has already expired', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-token-exchange-lineage-maintenance-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamAdvancedOAuthRuntimeStore } = await import('../src/platform/iamAdvancedOAuthRuntime')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')

    const subjectTokens = await LocalIamProtocolRuntimeStore.issueSubjectTokensAsync({
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'admin-console-demo',
      subject_kind: 'USER',
      subject_id: IAM_SUPER_ADMIN_USER_ID,
      requested_scope_names: ['openid', 'profile'],
      base_url: 'https://idp.local',
      grant_type: 'authorization_code',
      include_refresh_token: false,
    })
    const childTokens = await LocalIamProtocolRuntimeStore.issueSubjectTokensAsync({
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'cms-admin-demo',
      subject_kind: 'USER',
      subject_id: IAM_SUPER_ADMIN_USER_ID,
      requested_scope_names: ['openid', 'profile'],
      base_url: 'https://idp.local',
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      include_refresh_token: false,
    })
    const grandchildTokens = await LocalIamProtocolRuntimeStore.issueSubjectTokensAsync({
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'developer-portal-demo',
      subject_kind: 'USER',
      subject_id: IAM_SUPER_ADMIN_USER_ID,
      requested_scope_names: ['openid'],
      base_url: 'https://idp.local',
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      include_refresh_token: false,
    })

    const subjectRecord = LocalIamProtocolRuntimeStore.resolveIssuedTokenForValue(IAM_DEFAULT_REALM_ID, subjectTokens.access_token)
    const childRecord = LocalIamProtocolRuntimeStore.resolveIssuedTokenForValue(IAM_DEFAULT_REALM_ID, childTokens.access_token)
    const grandchildRecord = LocalIamProtocolRuntimeStore.resolveIssuedTokenForValue(IAM_DEFAULT_REALM_ID, grandchildTokens.access_token)

    const protocolState = LocalIamProtocolRuntimeStore.exportState() as any
    const subjectProtocolRecord = protocolState.issued_tokens.find((candidate: any) => candidate.id === subjectRecord.id)
    subjectProtocolRecord.expires_at = new Date(Date.now() - (60 * 60 * 1000)).toISOString()
    subjectProtocolRecord.refresh_expires_at = null
    LocalIamProtocolRuntimeStore.importState(protocolState)

    LocalIamAdvancedOAuthRuntimeStore.importState({
      token_exchanges: [
        {
          id: 'iam-token-exchange-expired-child',
          realm_id: IAM_DEFAULT_REALM_ID,
          requesting_client_id: 'cms-admin-demo',
          audience_client_id: 'cms-admin-demo',
          subject_kind: 'USER',
          subject_id: IAM_SUPER_ADMIN_USER_ID,
          subject_token_id: subjectRecord.id,
          exchanged_token_id: childRecord.id,
          requested_scope_names: ['openid', 'profile'],
          status: 'ISSUED',
          created_at: new Date().toISOString(),
        },
        {
          id: 'iam-token-exchange-expired-grandchild',
          realm_id: IAM_DEFAULT_REALM_ID,
          requesting_client_id: 'developer-portal-demo',
          audience_client_id: 'developer-portal-demo',
          subject_kind: 'USER',
          subject_id: IAM_SUPER_ADMIN_USER_ID,
          subject_token_id: childRecord.id,
          exchanged_token_id: grandchildRecord.id,
          requested_scope_names: ['openid'],
          status: 'ISSUED',
          created_at: new Date().toISOString(),
        },
      ],
    } as any)

    const protocolMaintenance = LocalIamProtocolRuntimeStore.runTransientStateMaintenance()
    const advancedOauthMaintenance = LocalIamAdvancedOAuthRuntimeStore.runTransientStateMaintenance()
    const finalProtocolState = LocalIamProtocolRuntimeStore.exportState() as any
    const finalAdvancedOauthState = LocalIamAdvancedOAuthRuntimeStore.exportState() as any

    expect(protocolMaintenance.expired_issued_token_count).toBe(1)
    expect(advancedOauthMaintenance.terminated_token_exchange_count).toBe(2)
    expect(advancedOauthMaintenance.revoked_exchanged_token_count).toBe(2)
    expect(finalProtocolState.issued_tokens.find((candidate: any) => candidate.id === subjectRecord.id)?.status).toBe('EXPIRED')
    expect(finalProtocolState.issued_tokens.find((candidate: any) => candidate.id === childRecord.id)?.status).toBe('REVOKED')
    expect(finalProtocolState.issued_tokens.find((candidate: any) => candidate.id === grandchildRecord.id)?.status).toBe('REVOKED')
    expect(finalAdvancedOauthState.token_exchanges.find((candidate: any) => candidate.id === 'iam-token-exchange-expired-child')?.status).toBe('EXPIRED')
    expect(finalAdvancedOauthState.token_exchanges.find((candidate: any) => candidate.id === 'iam-token-exchange-expired-grandchild')?.status).toBe('EXPIRED')
  }, 20000)

  it('terminates token-exchange lineage during subject-wide token revocation', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-token-exchange-subject-revoke-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamAdvancedOAuthRuntimeStore } = await import('../src/platform/iamAdvancedOAuthRuntime')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')

    const subjectTokens = await LocalIamProtocolRuntimeStore.issueSubjectTokensAsync({
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'admin-console-demo',
      subject_kind: 'USER',
      subject_id: IAM_SUPER_ADMIN_USER_ID,
      requested_scope_names: ['openid', 'profile'],
      base_url: 'https://idp.local',
      grant_type: 'authorization_code',
      include_refresh_token: false,
    })
    const childTokens = await LocalIamProtocolRuntimeStore.issueSubjectTokensAsync({
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'cms-admin-demo',
      subject_kind: 'USER',
      subject_id: IAM_SUPER_ADMIN_USER_ID,
      requested_scope_names: ['openid', 'profile'],
      base_url: 'https://idp.local',
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      include_refresh_token: false,
    })
    const grandchildTokens = await LocalIamProtocolRuntimeStore.issueSubjectTokensAsync({
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'developer-portal-demo',
      subject_kind: 'USER',
      subject_id: IAM_SUPER_ADMIN_USER_ID,
      requested_scope_names: ['openid'],
      base_url: 'https://idp.local',
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      include_refresh_token: false,
    })

    const subjectRecord = LocalIamProtocolRuntimeStore.resolveIssuedTokenForValue(IAM_DEFAULT_REALM_ID, subjectTokens.access_token)
    const childRecord = LocalIamProtocolRuntimeStore.resolveIssuedTokenForValue(IAM_DEFAULT_REALM_ID, childTokens.access_token)
    const grandchildRecord = LocalIamProtocolRuntimeStore.resolveIssuedTokenForValue(IAM_DEFAULT_REALM_ID, grandchildTokens.access_token)

    LocalIamAdvancedOAuthRuntimeStore.importState({
      token_exchanges: [
        {
          id: 'iam-token-exchange-subject-child',
          realm_id: IAM_DEFAULT_REALM_ID,
          requesting_client_id: 'cms-admin-demo',
          audience_client_id: 'cms-admin-demo',
          subject_kind: 'USER',
          subject_id: IAM_SUPER_ADMIN_USER_ID,
          subject_token_id: subjectRecord.id,
          exchanged_token_id: childRecord.id,
          requested_scope_names: ['openid', 'profile'],
          status: 'ISSUED',
          created_at: new Date().toISOString(),
        },
        {
          id: 'iam-token-exchange-subject-grandchild',
          realm_id: IAM_DEFAULT_REALM_ID,
          requesting_client_id: 'developer-portal-demo',
          audience_client_id: 'developer-portal-demo',
          subject_kind: 'USER',
          subject_id: IAM_SUPER_ADMIN_USER_ID,
          subject_token_id: childRecord.id,
          exchanged_token_id: grandchildRecord.id,
          requested_scope_names: ['openid'],
          status: 'ISSUED',
          created_at: new Date().toISOString(),
        },
      ],
    } as any)

    const revocation = await LocalIamProtocolRuntimeStore.revokeTokensForSubjectAsync(
      IAM_DEFAULT_REALM_ID,
      'USER',
      IAM_SUPER_ADMIN_USER_ID,
    )

    const protocolState = LocalIamProtocolRuntimeStore.exportState() as any
    const advancedOauthState = LocalIamAdvancedOAuthRuntimeStore.exportState() as any

    expect(revocation.revoked_count).toBe(3)
    expect(protocolState.issued_tokens.find((candidate: any) => candidate.id === subjectRecord.id)?.status).toBe('REVOKED')
    expect(protocolState.issued_tokens.find((candidate: any) => candidate.id === childRecord.id)?.status).toBe('REVOKED')
    expect(protocolState.issued_tokens.find((candidate: any) => candidate.id === grandchildRecord.id)?.status).toBe('REVOKED')
    expect(advancedOauthState.token_exchanges.find((candidate: any) => candidate.id === 'iam-token-exchange-subject-child')?.status).toBe('REVOKED')
    expect(advancedOauthState.token_exchanges.find((candidate: any) => candidate.id === 'iam-token-exchange-subject-grandchild')?.status).toBe('REVOKED')
  }, 20000)

  it('terminates token-exchange lineage during browser-session token revocation', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-token-exchange-browser-session-revoke-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamAdvancedOAuthRuntimeStore } = await import('../src/platform/iamAdvancedOAuthRuntime')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')

    const subjectTokens = await LocalIamProtocolRuntimeStore.issueSubjectTokensAsync({
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'admin-console-demo',
      subject_kind: 'USER',
      subject_id: IAM_SUPER_ADMIN_USER_ID,
      requested_scope_names: ['openid', 'profile'],
      base_url: 'https://idp.local',
      grant_type: 'authorization_code',
      include_refresh_token: false,
      browser_session_id: 'session-lineage-1',
    })
    const childTokens = await LocalIamProtocolRuntimeStore.issueSubjectTokensAsync({
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'cms-admin-demo',
      subject_kind: 'USER',
      subject_id: IAM_SUPER_ADMIN_USER_ID,
      requested_scope_names: ['openid', 'profile'],
      base_url: 'https://idp.local',
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      include_refresh_token: false,
      browser_session_id: 'session-lineage-1',
    })
    const grandchildTokens = await LocalIamProtocolRuntimeStore.issueSubjectTokensAsync({
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'developer-portal-demo',
      subject_kind: 'USER',
      subject_id: IAM_SUPER_ADMIN_USER_ID,
      requested_scope_names: ['openid'],
      base_url: 'https://idp.local',
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      include_refresh_token: false,
      browser_session_id: 'session-lineage-1',
    })

    const subjectRecord = LocalIamProtocolRuntimeStore.resolveIssuedTokenForValue(IAM_DEFAULT_REALM_ID, subjectTokens.access_token)
    const childRecord = LocalIamProtocolRuntimeStore.resolveIssuedTokenForValue(IAM_DEFAULT_REALM_ID, childTokens.access_token)
    const grandchildRecord = LocalIamProtocolRuntimeStore.resolveIssuedTokenForValue(IAM_DEFAULT_REALM_ID, grandchildTokens.access_token)

    LocalIamAdvancedOAuthRuntimeStore.importState({
      token_exchanges: [
        {
          id: 'iam-token-exchange-session-child',
          realm_id: IAM_DEFAULT_REALM_ID,
          requesting_client_id: 'cms-admin-demo',
          audience_client_id: 'cms-admin-demo',
          subject_kind: 'USER',
          subject_id: IAM_SUPER_ADMIN_USER_ID,
          subject_token_id: subjectRecord.id,
          exchanged_token_id: childRecord.id,
          requested_scope_names: ['openid', 'profile'],
          status: 'ISSUED',
          created_at: new Date().toISOString(),
        },
        {
          id: 'iam-token-exchange-session-grandchild',
          realm_id: IAM_DEFAULT_REALM_ID,
          requesting_client_id: 'developer-portal-demo',
          audience_client_id: 'developer-portal-demo',
          subject_kind: 'USER',
          subject_id: IAM_SUPER_ADMIN_USER_ID,
          subject_token_id: childRecord.id,
          exchanged_token_id: grandchildRecord.id,
          requested_scope_names: ['openid'],
          status: 'ISSUED',
          created_at: new Date().toISOString(),
        },
      ],
    } as any)

    const revocation = await LocalIamProtocolRuntimeStore.revokeTokensForBrowserSessionAsync(
      IAM_DEFAULT_REALM_ID,
      'session-lineage-1',
    )

    const protocolState = LocalIamProtocolRuntimeStore.exportState() as any
    const advancedOauthState = LocalIamAdvancedOAuthRuntimeStore.exportState() as any

    expect(revocation.revoked_count).toBe(3)
    expect(protocolState.issued_tokens.find((candidate: any) => candidate.id === subjectRecord.id)?.status).toBe('REVOKED')
    expect(protocolState.issued_tokens.find((candidate: any) => candidate.id === childRecord.id)?.status).toBe('REVOKED')
    expect(protocolState.issued_tokens.find((candidate: any) => candidate.id === grandchildRecord.id)?.status).toBe('REVOKED')
    expect(advancedOauthState.token_exchanges.find((candidate: any) => candidate.id === 'iam-token-exchange-session-child')?.status).toBe('REVOKED')
    expect(advancedOauthState.token_exchanges.find((candidate: any) => candidate.id === 'iam-token-exchange-session-grandchild')?.status).toBe('REVOKED')
  }, 20000)
})
