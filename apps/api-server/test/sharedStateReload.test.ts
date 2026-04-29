import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

function rewriteEnvelopeState<T>(filePath: string, mutate: (state: T) => void) {
  const envelope = JSON.parse(readFileSync(filePath, 'utf8')) as {
    version: number
    saved_at: string
    state: T
  }
  mutate(envelope.state)
  envelope.saved_at = new Date().toISOString()
  writeFileSync(filePath, JSON.stringify(envelope), 'utf8')
}

describe('shared state reload on route-facing async mutations', () => {
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

  it('protocol async client creation preserves an externally written client record', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-protocol-shared-state-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const persistence = await import('../src/platform/persistence')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')
    const { IAM_DEFAULT_REALM_ID, IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')

    await LocalIamProtocolRuntimeStore.createClientAsync(IAM_SYSTEM_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'shared-state-base-client',
      name: 'Shared State Base Client',
      access_type: 'PUBLIC',
      redirect_uris: ['https://example.com/base/callback'],
    })

    const protocolStatePath = persistence.getPersistedStatePath('iam-protocol-directory-state.json')
    rewriteEnvelopeState<any>(protocolStatePath, (runtimeState) => {
      const template = runtimeState.clients.find((candidate: any) => candidate.client_id === 'shared-state-base-client')
      runtimeState.clients.push({
        ...template,
        id: 'iam-client-external-shared-state',
        client_id: 'external-shared-state-client',
        name: 'External Shared State Client',
        summary: 'Injected directly into persisted protocol state.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by_user_id: IAM_SYSTEM_USER_ID,
        updated_by_user_id: IAM_SYSTEM_USER_ID,
      })
    })

    await LocalIamProtocolRuntimeStore.createClientAsync(IAM_SYSTEM_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'shared-state-final-client',
      name: 'Shared State Final Client',
      access_type: 'PUBLIC',
      redirect_uris: ['https://example.com/final/callback'],
    })

    const finalProtocolEnvelope = JSON.parse(readFileSync(protocolStatePath, 'utf8')) as {
      state: { clients: Array<{ client_id: string }> }
    }
    const finalClientIds = finalProtocolEnvelope.state.clients.map((client) => client.client_id)

    expect(finalClientIds).toContain('external-shared-state-client')
    expect(finalClientIds).toContain('shared-state-final-client')
  }, 20000)

  it('protocol multi-step async flow preserves an externally written peer client during secret rotation', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-protocol-multistep-shared-state-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const persistence = await import('../src/platform/persistence')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')
    const { IAM_DEFAULT_REALM_ID, IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')

    const createdClient = await LocalIamProtocolRuntimeStore.createClientAsync(IAM_SYSTEM_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'shared-state-confidential-client',
      name: 'Shared State Confidential Client',
      access_type: 'CONFIDENTIAL',
      redirect_uris: ['https://example.com/confidential/callback'],
    })

    const protocolStatePath = persistence.getPersistedStatePath('iam-protocol-directory-state.json')
    rewriteEnvelopeState<any>(protocolStatePath, (runtimeState) => {
      const template = runtimeState.clients.find((candidate: any) => candidate.id === createdClient.client.id)
      runtimeState.clients.push({
        ...template,
        id: 'iam-client-peer-shared-state',
        client_id: 'peer-shared-state-client',
        name: 'Peer Shared State Client',
        summary: 'Injected directly into persisted protocol state before secret rotation.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by_user_id: IAM_SYSTEM_USER_ID,
        updated_by_user_id: IAM_SYSTEM_USER_ID,
      })
    })

    const rotated = await LocalIamProtocolRuntimeStore.rotateClientSecretAsync(
      IAM_SYSTEM_USER_ID,
      createdClient.client.id,
    )

    const finalProtocolEnvelope = JSON.parse(readFileSync(protocolStatePath, 'utf8')) as {
      state: {
        clients: Array<{ id: string; client_id: string; updated_at: string; secret_preview: string | null }>
      }
    }
    const peerClient = finalProtocolEnvelope.state.clients.find((client) => client.id === 'iam-client-peer-shared-state')
    const rotatedClient = finalProtocolEnvelope.state.clients.find((client) => client.id === createdClient.client.id)

    expect(peerClient).toBeTruthy()
    expect(peerClient?.client_id).toBe('peer-shared-state-client')
    expect(rotatedClient).toBeTruthy()
    expect(rotatedClient?.secret_preview).toBe(rotated.client.secret_preview)
  }, 20000)

  it('advanced oauth async dynamic registration preserves an externally written registration token record', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-advanced-oauth-shared-state-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const persistence = await import('../src/platform/persistence')
    const { LocalIamAdvancedOAuthRuntimeStore } = await import('../src/platform/iamAdvancedOAuthRuntime')
    const { IAM_DEFAULT_REALM_ID, IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')

    const policy = await LocalIamAdvancedOAuthRuntimeStore.createClientPolicyAsync(IAM_SYSTEM_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      name: 'Shared State Dynamic Registration Policy',
      allow_dynamic_registration: true,
    })
    const initialAccessToken = await LocalIamAdvancedOAuthRuntimeStore.issueInitialAccessTokenAsync(IAM_SYSTEM_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      policy_id: policy.id,
      label: 'shared-state-registration-token',
    })

    const advancedOauthStatePath = persistence.getPersistedStatePath('iam-advanced-oauth-directory-state.json')
    rewriteEnvelopeState<any>(advancedOauthStatePath, (runtimeState) => {
      runtimeState.registration_access_tokens.push({
        id: 'iam-registration-token-peer-shared-state',
        realm_id: IAM_DEFAULT_REALM_ID,
        client_id: 'peer-shared-state-client',
        token_hash: 'peer-shared-state-token-hash',
        status: 'ACTIVE',
        expires_at: null,
        created_at: new Date().toISOString(),
        created_by_user_id: IAM_SYSTEM_USER_ID,
      })
    })

    const registration = await LocalIamAdvancedOAuthRuntimeStore.registerDynamicClientAsync(
      IAM_DEFAULT_REALM_ID,
      `Bearer ${initialAccessToken.issued_token}`,
      {
        client_name: 'Shared State Dynamic Client',
        client_id: 'shared-state-dynamic-client',
        redirect_uris: ['https://example.com/dynamic/callback'],
        grant_types: ['authorization_code'],
        token_endpoint_auth_method: 'none',
      },
      'https://example.com/register',
    )

    const finalAdvancedOauthEnvelope = JSON.parse(readFileSync(advancedOauthStatePath, 'utf8')) as {
      state: {
        registration_access_tokens: Array<{ id: string; client_id: string }>
      }
    }
    const registrationTokenIds = finalAdvancedOauthEnvelope.state.registration_access_tokens.map((token) => token.id)
    const registrationClientIds = finalAdvancedOauthEnvelope.state.registration_access_tokens.map((token) => token.client_id)

    expect(registration.client.client_id).toBe('shared-state-dynamic-client')
    expect(registrationTokenIds).toContain('iam-registration-token-peer-shared-state')
    expect(registrationClientIds).toContain(registration.client.id)
  }, 20000)

  it('authentication async mutation preserves an externally written account session', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-auth-shared-state-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const persistence = await import('../src/platform/persistence')
    const { LocalIamAuthenticationRuntimeStore } = await import('../src/platform/iamAuthenticationRuntime')
    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID } = await import('../src/platform/iamIdentifiers')

    const initialLogin = await LocalIamAuthenticationRuntimeStore.loginResolvedUserAsync(
      IAM_DEFAULT_REALM_ID,
      IAM_SUPER_ADMIN_USER_ID,
      {
        skip_mfa: true,
        credential_authenticator: 'USERNAME_PASSWORD',
      },
    )

    expect(initialLogin.session_id).toBeTruthy()
    const currentStoredSessionId = initialLogin.session_id!.split('.')[0]

    const authenticationStatePath = persistence.getPersistedStatePath('iam-authentication-transient-state.json')
    rewriteEnvelopeState<any>(authenticationStatePath, (runtimeState) => {
      const template = runtimeState.account_sessions.find((candidate: any) => candidate.id === currentStoredSessionId)
      runtimeState.account_sessions.push({
        ...template,
        id: 'iam-session-external-shared-state',
        last_seen_at: new Date().toISOString(),
        issued_at: new Date().toISOString(),
        authenticated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + (60 * 60 * 1000)).toISOString(),
        session_proof_hash: null,
      })
    })

    const passwordReset = await LocalIamAuthenticationRuntimeStore.requestPasswordResetAsync(
      IAM_DEFAULT_REALM_ID,
      {
        username_or_email: 'admin@idp.local',
      },
    )

    const finalAuthenticationEnvelope = JSON.parse(readFileSync(authenticationStatePath, 'utf8')) as {
      state: {
        account_sessions: Array<{ id: string }>
        password_reset_tickets: Array<{ id: string }>
      }
    }
    const finalSessionIds = finalAuthenticationEnvelope.state.account_sessions.map((session) => session.id)
    const finalPasswordResetTicketIds = finalAuthenticationEnvelope.state.password_reset_tickets.map((ticket) => ticket.id)

    expect(finalSessionIds).toContain('iam-session-external-shared-state')
    expect(finalPasswordResetTicketIds).toContain(passwordReset.ticket_id)
  }, 20000)

  it('authentication multi-step async flow revokes an externally written peer session', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-auth-multistep-shared-state-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const persistence = await import('../src/platform/persistence')
    const { LocalIamAuthenticationRuntimeStore } = await import('../src/platform/iamAuthenticationRuntime')
    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID } = await import('../src/platform/iamIdentifiers')

    const initialLogin = await LocalIamAuthenticationRuntimeStore.loginResolvedUserAsync(
      IAM_DEFAULT_REALM_ID,
      IAM_SUPER_ADMIN_USER_ID,
      {
        skip_mfa: true,
        credential_authenticator: 'USERNAME_PASSWORD',
      },
    )

    expect(initialLogin.session_id).toBeTruthy()
    const currentStoredSessionId = initialLogin.session_id!.split('.')[0]

    const authenticationStatePath = persistence.getPersistedStatePath('iam-authentication-transient-state.json')
    rewriteEnvelopeState<any>(authenticationStatePath, (runtimeState) => {
      const template = runtimeState.account_sessions.find((candidate: any) => candidate.id === currentStoredSessionId)
      runtimeState.account_sessions.push({
        ...template,
        id: 'iam-session-peer-shared-state',
        revoked_at: null,
        last_seen_at: new Date().toISOString(),
        issued_at: new Date().toISOString(),
        authenticated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + (60 * 60 * 1000)).toISOString(),
        session_proof_hash: null,
      })
    })

    const revokeResult = await LocalIamAuthenticationRuntimeStore.revokeOtherAccountSessionsAsync(
      IAM_DEFAULT_REALM_ID,
      initialLogin.session_id!,
    )

    expect(revokeResult.revoked_count).toBeGreaterThanOrEqual(1)

    const finalAuthenticationEnvelope = JSON.parse(readFileSync(authenticationStatePath, 'utf8')) as {
      state: {
        account_sessions: Array<{ id: string; revoked_at: string | null }>
      }
    }
    const externalSession = finalAuthenticationEnvelope.state.account_sessions.find(
      (session) => session.id === 'iam-session-peer-shared-state',
    )

    expect(externalSession).toBeTruthy()
    expect(externalSession?.revoked_at).not.toBeNull()
  }, 20000)

  it('federation async broker login preserves an externally written linked identity record', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-federation-shared-state-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const persistence = await import('../src/platform/persistence')
    const { LocalIamFederationRuntimeStore } = await import('../src/platform/iamFederationRuntime')
    const { IAM_DEFAULT_REALM_ID, IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')

    await LocalIamFederationRuntimeStore.createIdentityProviderAsync(IAM_SYSTEM_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      alias: 'shared-state-broker',
      name: 'Shared State Broker',
      link_policy: 'AUTO_CREATE',
      external_identities: [
        {
          subject: 'external-subject-shared-state',
          username: 'shared.broker.user',
          email: 'shared.broker.user@example.com',
          first_name: 'Shared',
          last_name: 'Broker',
          group_names: [],
          role_names: [],
        },
      ],
    })

    const federationStatePath = persistence.getPersistedStatePath('iam-federation-runtime-state.json')
    rewriteEnvelopeState<any>(federationStatePath, (runtimeState) => {
      runtimeState.linked_identities.push({
        id: 'iam-linked-identity-peer-shared-state',
        realm_id: IAM_DEFAULT_REALM_ID,
        user_id: 'peer-shared-state-user',
        source_type: 'BROKER',
        provider_id: 'peer-shared-state-provider',
        provider_name: 'Peer Shared State Provider',
        provider_alias: 'peer-shared-state-provider',
        provider_kind: 'OIDC',
        external_subject: 'peer-shared-state-subject',
        external_username: 'peer.shared.state',
        external_email: 'peer.shared.state@example.com',
        linked_at: new Date().toISOString(),
        imported_at: null,
        last_authenticated_at: null,
        synthetic: true,
      })
    })

    const brokeredLogin = await LocalIamFederationRuntimeStore.brokerLoginAsync(
      IAM_DEFAULT_REALM_ID,
      'shared-state-broker',
      {
        external_username_or_email: 'shared.broker.user@example.com',
      },
    )

    const finalFederationEnvelope = JSON.parse(readFileSync(federationStatePath, 'utf8')) as {
      state: {
        linked_identities: Array<{ id: string }>
      }
    }
    const finalLinkedIdentityIds = finalFederationEnvelope.state.linked_identities.map((record) => record.id)

    expect(brokeredLogin.session_id).toBeTruthy()
    expect(finalLinkedIdentityIds).toContain('iam-linked-identity-peer-shared-state')
  }, 20000)
})
