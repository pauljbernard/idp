import { mkdtempSync, rmSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('browser session to federation link propagation', () => {
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

  it('brokered logout terminates linked federation session records', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-federation-session-index-logout-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamFoundationStore } = await import('../src/platform/iamFoundation')
    const { LocalIamFederationRuntimeStore } = await import('../src/platform/iamFederationRuntime')
    const { LocalIamAuthenticationRuntimeStore } = await import('../src/platform/iamAuthenticationRuntime')
    const { LocalIamFederationSessionIndexStore } = await import('../src/platform/iamFederationSessionIndex')

    await LocalIamFoundationStore.createUserAsync(IAM_SYSTEM_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      username: 'broker.logout.user',
      email: 'broker.logout.user@idp.local',
      first_name: 'Broker',
      last_name: 'Logout',
      status: 'ACTIVE',
      required_actions: [],
    })

    await LocalIamFederationRuntimeStore.createIdentityProviderAsync(IAM_SYSTEM_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      alias: 'broker-logout-provider',
      name: 'Broker Logout Provider',
      protocol: 'OIDC',
      link_policy: 'EMAIL_MATCH',
      external_identities: [
        {
          subject: 'broker-logout-subject',
          username: 'broker.logout.user',
          email: 'broker.logout.user@idp.local',
          first_name: 'Broker',
          last_name: 'Logout',
          group_names: [],
          role_names: [],
        },
      ],
    })

    const brokeredLogin = await LocalIamFederationRuntimeStore.brokerLoginAsync(
      IAM_DEFAULT_REALM_ID,
      'broker-logout-provider',
      {
        external_username_or_email: 'broker.logout.user@idp.local',
      },
    )

    expect(brokeredLogin.next_step).toBe('AUTHENTICATED')
    expect(brokeredLogin.session_id).toBeTruthy()

    const federationIndexBeforeLogout = LocalIamFederationSessionIndexStore.exportState() as any
    expect(federationIndexBeforeLogout.browser_federated_session_links).toHaveLength(1)
    expect(federationIndexBeforeLogout.browser_federated_session_links[0].terminated_at).toBeNull()
    expect(federationIndexBeforeLogout.browser_federated_session_links[0].provider_alias).toBe('broker-logout-provider')

    await LocalIamAuthenticationRuntimeStore.logoutAsync(IAM_DEFAULT_REALM_ID, brokeredLogin.session_id!)

    const federationIndexAfterLogout = LocalIamFederationSessionIndexStore.exportState() as any
    expect(federationIndexAfterLogout.browser_federated_session_links[0].terminated_at).toBeTruthy()
  }, 20000)

  it('records federation session links when broker login completes after required actions', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-federation-session-index-required-actions-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamFoundationStore } = await import('../src/platform/iamFoundation')
    const { LocalIamFederationRuntimeStore } = await import('../src/platform/iamFederationRuntime')
    const { LocalIamAuthenticationRuntimeStore } = await import('../src/platform/iamAuthenticationRuntime')
    const { LocalIamFederationSessionIndexStore } = await import('../src/platform/iamFederationSessionIndex')

    await LocalIamFoundationStore.createUserAsync(IAM_SYSTEM_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      username: 'broker.required.user',
      email: 'broker.required.user@idp.local',
      first_name: 'Broker',
      last_name: 'Required',
      status: 'ACTIVE',
      required_actions: ['UPDATE_PROFILE'],
    })

    await LocalIamFederationRuntimeStore.createIdentityProviderAsync(IAM_SYSTEM_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      alias: 'broker-required-provider',
      name: 'Broker Required Provider',
      protocol: 'OIDC',
      link_policy: 'EMAIL_MATCH',
      external_identities: [
        {
          subject: 'broker-required-subject',
          username: 'broker.required.user',
          email: 'broker.required.user@idp.local',
          first_name: 'Broker',
          last_name: 'Required',
          group_names: [],
          role_names: [],
        },
      ],
    })

    const brokeredLogin = await LocalIamFederationRuntimeStore.brokerLoginAsync(
      IAM_DEFAULT_REALM_ID,
      'broker-required-provider',
      {
        external_username_or_email: 'broker.required.user@idp.local',
      },
    )

    expect(brokeredLogin.next_step).toBe('REQUIRED_ACTIONS')
    expect(brokeredLogin.session_id).toBeNull()
    expect(brokeredLogin.login_transaction_id).toBeTruthy()

    const federationIndexBeforeCompletion = LocalIamFederationSessionIndexStore.exportState() as any
    expect(federationIndexBeforeCompletion.browser_federated_session_links).toHaveLength(0)

    const completedLogin = await LocalIamAuthenticationRuntimeStore.completeRequiredActionsAsync(
      IAM_DEFAULT_REALM_ID,
      {
        login_transaction_id: brokeredLogin.login_transaction_id!,
        first_name: 'Broker',
        last_name: 'Required',
        email: 'broker.required.user@idp.local',
      },
    )

    expect(completedLogin.next_step).toBe('AUTHENTICATED')
    expect(completedLogin.session_id).toBeTruthy()

    const federationIndexAfterCompletion = LocalIamFederationSessionIndexStore.exportState() as any
    expect(federationIndexAfterCompletion.browser_federated_session_links).toHaveLength(1)
    expect(federationIndexAfterCompletion.browser_federated_session_links[0].terminated_at).toBeNull()
    expect(federationIndexAfterCompletion.browser_federated_session_links[0].provider_alias).toBe('broker-required-provider')
    expect(federationIndexAfterCompletion.browser_federated_session_links[0].external_subject).toBe('broker-required-subject')
  }, 20000)

  it('disabling an identity provider revokes linked broker sessions and session-owned tokens', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-federation-session-index-disable-provider-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamFoundationStore } = await import('../src/platform/iamFoundation')
    const { LocalIamFederationRuntimeStore } = await import('../src/platform/iamFederationRuntime')
    const { LocalIamAuthenticationRuntimeStore } = await import('../src/platform/iamAuthenticationRuntime')
    const { LocalIamFederationSessionIndexStore } = await import('../src/platform/iamFederationSessionIndex')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')

    const user = await LocalIamFoundationStore.createUserAsync(IAM_SYSTEM_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      username: 'broker.disable.user',
      email: 'broker.disable.user@idp.local',
      first_name: 'Broker',
      last_name: 'Disable',
      status: 'ACTIVE',
      required_actions: [],
    })

    const provider = await LocalIamFederationRuntimeStore.createIdentityProviderAsync(IAM_SYSTEM_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      alias: 'broker-disable-provider',
      name: 'Broker Disable Provider',
      protocol: 'OIDC',
      link_policy: 'EMAIL_MATCH',
      external_identities: [
        {
          subject: 'broker-disable-subject',
          username: 'broker.disable.user',
          email: 'broker.disable.user@idp.local',
          first_name: 'Broker',
          last_name: 'Disable',
          group_names: [],
          role_names: [],
        },
      ],
    })

    const brokeredLogin = await LocalIamFederationRuntimeStore.brokerLoginAsync(
      IAM_DEFAULT_REALM_ID,
      'broker-disable-provider',
      {
        external_username_or_email: 'broker.disable.user@idp.local',
      },
    )

    expect(brokeredLogin.next_step).toBe('AUTHENTICATED')
    expect(brokeredLogin.session_id).toBeTruthy()

    const subjectTokens = await LocalIamProtocolRuntimeStore.issueSubjectTokensAsync({
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'admin-console-demo',
      subject_kind: 'USER',
      subject_id: user.id,
      requested_scope_names: ['openid', 'profile'],
      base_url: 'https://idp.local',
      grant_type: 'authorization_code',
      include_refresh_token: false,
      browser_session_id: brokeredLogin.session_id!,
    })

    const issuedToken = LocalIamProtocolRuntimeStore.resolveIssuedTokenForValue(
      IAM_DEFAULT_REALM_ID,
      subjectTokens.access_token,
    )

    await LocalIamFederationRuntimeStore.updateIdentityProviderAsync(
      IAM_SYSTEM_USER_ID,
      provider.id,
      {
        status: 'DISABLED',
      },
    )

    const activeSessions = LocalIamAuthenticationRuntimeStore.listAccountSessionsByUser(
      IAM_DEFAULT_REALM_ID,
      user.id,
    )
    const tokenCounts = LocalIamProtocolRuntimeStore.countTokensForSubject(
      IAM_DEFAULT_REALM_ID,
      'USER',
      user.id,
    )
    const federationIndexState = LocalIamFederationSessionIndexStore.exportState() as any
    const protocolState = LocalIamProtocolRuntimeStore.exportState() as any

    expect(activeSessions.count).toBe(0)
    expect(tokenCounts.active_count).toBe(0)
    expect(
      federationIndexState.browser_federated_session_links.find((candidate: any) => candidate.provider_id === provider.id)?.terminated_at,
    ).toBeTruthy()
    expect(
      protocolState.issued_tokens.find((candidate: any) => candidate.id === issuedToken.id)?.status,
    ).toBe('REVOKED')
  }, 20000)

  it('disables a provider under runtime flags without relying on federation index records', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-federation-runtime-flags-disable-provider-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'
    process.env.IDP_DDB_RUNTIME_DUAL_WRITE = 'true'

    const { IAM_DEFAULT_REALM_ID, IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamFoundationStore } = await import('../src/platform/iamFoundation')
    const { LocalIamFederationRuntimeStore } = await import('../src/platform/iamFederationRuntime')
    const { LocalIamAuthenticationRuntimeStore } = await import('../src/platform/iamAuthenticationRuntime')
    const { LocalIamFederationSessionIndexStore } = await import('../src/platform/iamFederationSessionIndex')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')

    const user = await LocalIamFoundationStore.createUserAsync(IAM_SYSTEM_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      username: 'broker.runtime.flag.user',
      email: 'broker.runtime.flag.user@idp.local',
      first_name: 'Broker',
      last_name: 'RuntimeFlag',
      status: 'ACTIVE',
      required_actions: [],
    })

    const provider = await LocalIamFederationRuntimeStore.createIdentityProviderAsync(IAM_SYSTEM_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      alias: 'broker-runtime-flag-provider',
      name: 'Broker Runtime Flag Provider',
      protocol: 'OIDC',
      link_policy: 'EMAIL_MATCH',
      external_identities: [
        {
          subject: 'broker-runtime-flag-subject',
          username: 'broker.runtime.flag.user',
          email: 'broker.runtime.flag.user@idp.local',
          first_name: 'Broker',
          last_name: 'RuntimeFlag',
          group_names: [],
          role_names: [],
        },
      ],
    })

    const brokeredLogin = await LocalIamFederationRuntimeStore.brokerLoginAsync(
      IAM_DEFAULT_REALM_ID,
      'broker-runtime-flag-provider',
      {
        external_username_or_email: 'broker.runtime.flag.user@idp.local',
      },
    )

    expect(brokeredLogin.next_step).toBe('AUTHENTICATED')
    expect(brokeredLogin.session_id).toBeTruthy()

    const subjectTokens = await LocalIamProtocolRuntimeStore.issueSubjectTokensAsync({
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'admin-console-demo',
      subject_kind: 'USER',
      subject_id: user.id,
      requested_scope_names: ['openid', 'profile'],
      base_url: 'https://idp.local',
      grant_type: 'authorization_code',
      include_refresh_token: false,
      browser_session_id: brokeredLogin.session_id!,
    })

    const issuedToken = LocalIamProtocolRuntimeStore.resolveIssuedTokenForValue(
      IAM_DEFAULT_REALM_ID,
      subjectTokens.access_token,
    )

    const federationIndexBeforeDisable = LocalIamFederationSessionIndexStore.exportState() as any
    const authenticationStateBeforeDisable = LocalIamAuthenticationRuntimeStore.exportState() as any

    expect(federationIndexBeforeDisable.browser_federated_session_links).toHaveLength(0)
    expect(authenticationStateBeforeDisable.account_sessions[0].federated_login_context?.provider_id).toBe(provider.id)

    await LocalIamFederationRuntimeStore.updateIdentityProviderAsync(
      IAM_SYSTEM_USER_ID,
      provider.id,
      {
        status: 'DISABLED',
      },
    )

    const activeSessions = LocalIamAuthenticationRuntimeStore.listAccountSessionsByUser(
      IAM_DEFAULT_REALM_ID,
      user.id,
    )
    const federationIndexAfterDisable = LocalIamFederationSessionIndexStore.exportState() as any
    const protocolState = LocalIamProtocolRuntimeStore.exportState() as any

    expect(activeSessions.count).toBe(0)
    expect(federationIndexAfterDisable.browser_federated_session_links).toHaveLength(0)
    expect(
      protocolState.issued_tokens.find((candidate: any) => candidate.id === issuedToken.id)?.status,
    ).toBe('REVOKED')
  }, 20000)

  it('accepts trusted runtime broker assertions for explicitly configured providers', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-federation-trusted-broker-assertion-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamFederationRuntimeStore } = await import('../src/platform/iamFederationRuntime')
    const { LocalIamFederationSessionIndexStore } = await import('../src/platform/iamFederationSessionIndex')

    await LocalIamFederationRuntimeStore.createIdentityProviderAsync(IAM_SYSTEM_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      alias: 'trusted-runtime-broker',
      name: 'Trusted Runtime Broker',
      protocol: 'OIDC',
      link_policy: 'AUTO_CREATE',
      profile_source_mode: 'TRUSTED_ASSERTION',
      trust_store_id: 'trust-store-institutional-oidc',
      mapping_profile_id: 'mapping-profile-institutional-oidc',
      issuer_url: 'https://login.partner.example/realms/workforce',
      trusted_email_domains: ['partner.example'],
    })

    const brokeredLogin = await LocalIamFederationRuntimeStore.brokerLoginAsync(
      IAM_DEFAULT_REALM_ID,
      'trusted-runtime-broker',
      {
        external_username_or_email: 'ignored-when-runtime-asserted',
        scope: ['openid', 'profile', 'email'],
        external_identity: {
          subject: 'placeholder-subject',
          username: 'placeholder-user',
          email: 'placeholder@partner.example',
          first_name: 'Placeholder',
          last_name: 'Placeholder',
          issuer_url: 'https://login.partner.example/realms/workforce',
          group_names: ['partner-operators'],
          role_names: ['operator'],
          raw_attributes: {
            sub: 'partner-workforce-0001',
            email: 'avery.operator@partner.example',
            preferred_username: 'avery.operator',
            given_name: 'Avery',
            family_name: 'Operator',
          },
          scopes: ['openid', 'profile', 'email'],
        },
      },
    )

    expect(brokeredLogin.next_step).toBe('AUTHENTICATED')
    expect(brokeredLogin.session_id).toBeTruthy()
    expect(brokeredLogin.user.email).toBe('avery.operator@partner.example')

    const linkedIdentities = LocalIamFederationRuntimeStore.listLinkedIdentities({
      realm_id: IAM_DEFAULT_REALM_ID,
      source_type: 'BROKER',
    })
    expect(
      linkedIdentities.linked_identities.find((record) => record.provider_alias === 'trusted-runtime-broker')?.external_subject,
    ).toBe('partner-workforce-0001')

    const federationIndexState = LocalIamFederationSessionIndexStore.exportState() as any
    expect(
      federationIndexState.browser_federated_session_links.find((candidate: any) => candidate.provider_alias === 'trusted-runtime-broker'),
    ).toBeTruthy()
  }, 20000)

  it('rejects trusted runtime broker assertions from disallowed email domains', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-federation-trusted-broker-domain-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamFederationRuntimeStore } = await import('../src/platform/iamFederationRuntime')

    await LocalIamFederationRuntimeStore.createIdentityProviderAsync(IAM_SYSTEM_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      alias: 'trusted-runtime-broker-restricted',
      name: 'Trusted Runtime Broker Restricted',
      protocol: 'OIDC',
      link_policy: 'AUTO_CREATE',
      profile_source_mode: 'TRUSTED_ASSERTION',
      trust_store_id: 'trust-store-institutional-oidc',
      mapping_profile_id: 'mapping-profile-institutional-oidc',
      issuer_url: 'https://login.partner.example/realms/workforce',
      trusted_email_domains: ['partner.example'],
    })

    await expect(
      LocalIamFederationRuntimeStore.brokerLoginAsync(
        IAM_DEFAULT_REALM_ID,
        'trusted-runtime-broker-restricted',
        {
          external_username_or_email: 'ignored-when-runtime-asserted',
          external_identity: {
            subject: 'partner-workforce-0002',
            username: 'malory.operator',
            email: 'malory.operator@evil.example',
            first_name: 'Malory',
            last_name: 'Operator',
            issuer_url: 'https://login.partner.example/realms/workforce',
            scopes: ['openid', 'profile', 'email'],
          },
        },
      ),
    ).rejects.toThrow('Trusted asserted external identity email domain is not allowed for provider trusted-runtime-broker-restricted')
  }, 20000)

  it('rejects trusted OIDC broker assertions that claim scopes outside provider policy', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-federation-trusted-broker-scope-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamFederationRuntimeStore } = await import('../src/platform/iamFederationRuntime')

    await LocalIamFederationRuntimeStore.createIdentityProviderAsync(IAM_SYSTEM_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      alias: 'trusted-runtime-broker-scope',
      name: 'Trusted Runtime Broker Scope',
      protocol: 'OIDC',
      link_policy: 'AUTO_CREATE',
      profile_source_mode: 'TRUSTED_ASSERTION',
      trust_store_id: 'trust-store-institutional-oidc',
      mapping_profile_id: 'mapping-profile-institutional-oidc',
      issuer_url: 'https://login.partner.example/realms/workforce',
      allowed_scopes: ['openid', 'profile', 'email'],
      trusted_email_domains: ['partner.example'],
    })

    await expect(
      LocalIamFederationRuntimeStore.brokerLoginAsync(
        IAM_DEFAULT_REALM_ID,
        'trusted-runtime-broker-scope',
        {
          external_username_or_email: 'ignored',
          scope: ['openid', 'profile'],
          external_identity: {
            subject: 'placeholder-subject',
            username: 'placeholder-user',
            email: 'placeholder@partner.example',
            first_name: 'Placeholder',
            last_name: 'Placeholder',
            issuer_url: 'https://login.partner.example/realms/workforce',
            raw_attributes: {
              sub: 'partner-workforce-0010',
              email: 'scope.user@partner.example',
              preferred_username: 'scope.user',
              given_name: 'Scope',
              family_name: 'User',
            },
            scopes: ['openid', 'profile', 'admin'],
          },
        },
      ),
    ).rejects.toThrow('Trusted OIDC assertion includes scope outside provider policy: admin')
  }, 20000)

  it('accepts trusted SAML broker assertions with NameID and SAML attributes', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-federation-trusted-saml-broker-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamFederationRuntimeStore } = await import('../src/platform/iamFederationRuntime')

    await LocalIamFederationRuntimeStore.createIdentityProviderAsync(IAM_SYSTEM_USER_ID, {
      realm_id: 'realm-partner-embedded-validation',
      alias: 'trusted-runtime-saml-broker',
      name: 'Trusted Runtime SAML Broker',
      protocol: 'SAML',
      link_policy: 'AUTO_CREATE',
      profile_source_mode: 'TRUSTED_ASSERTION',
      trust_store_id: 'trust-store-institutional-saml',
      mapping_profile_id: 'mapping-profile-institutional-saml',
      issuer_url: 'https://sso.institution.local/saml',
      trusted_email_domains: ['partner.example'],
    })

    const brokeredLogin = await LocalIamFederationRuntimeStore.brokerLoginAsync(
      'realm-partner-embedded-validation',
      'trusted-runtime-saml-broker',
      {
        external_username_or_email: 'ignored',
        external_identity: {
          subject: 'placeholder-subject',
          username: 'placeholder-user',
          email: 'placeholder@partner.example',
          first_name: 'Placeholder',
          last_name: 'Placeholder',
          issuer_url: 'https://sso.institution.local/saml',
          saml_assertion: {
            name_id: 'saml-partner-0001',
            attributes: {
              mail: 'saml.partner@partner.example',
              givenName: 'Saml',
              sn: 'Partner',
            },
          },
        },
      },
    )

    expect(brokeredLogin.next_step).toBe('AUTHENTICATED')
    expect(brokeredLogin.user.email).toBe('saml.partner@partner.example')

    const linkedIdentities = LocalIamFederationRuntimeStore.listLinkedIdentities({
      realm_id: 'realm-partner-embedded-validation',
      source_type: 'BROKER',
    })
    expect(
      linkedIdentities.linked_identities.find((record) => record.provider_alias === 'trusted-runtime-saml-broker')?.external_subject,
    ).toBe('saml-partner-0001')
  }, 20000)

  it('rejects trusted SAML broker assertions without NameID', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-federation-trusted-saml-nameid-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamFederationRuntimeStore } = await import('../src/platform/iamFederationRuntime')

    await LocalIamFederationRuntimeStore.createIdentityProviderAsync(IAM_SYSTEM_USER_ID, {
      realm_id: 'realm-partner-embedded-validation',
      alias: 'trusted-runtime-saml-broker-nameid',
      name: 'Trusted Runtime SAML Broker NameID',
      protocol: 'SAML',
      link_policy: 'AUTO_CREATE',
      profile_source_mode: 'TRUSTED_ASSERTION',
      trust_store_id: 'trust-store-institutional-saml',
      mapping_profile_id: 'mapping-profile-institutional-saml',
      issuer_url: 'https://sso.institution.local/saml',
      trusted_email_domains: ['partner.example'],
    })

    await expect(
      LocalIamFederationRuntimeStore.brokerLoginAsync(
        'realm-partner-embedded-validation',
        'trusted-runtime-saml-broker-nameid',
        {
          external_username_or_email: 'ignored',
          external_identity: {
            subject: 'placeholder-subject',
            username: 'placeholder-user',
            email: 'placeholder@partner.example',
            first_name: 'Placeholder',
            last_name: 'Placeholder',
            issuer_url: 'https://sso.institution.local/saml',
            saml_assertion: {
              attributes: {
                mail: 'saml.partner@partner.example',
              },
            },
          },
        },
      ),
    ).rejects.toThrow('Trusted SAML assertions must include NameID')
  }, 20000)

  it('accepts trusted runtime federation sync assertions for explicitly configured providers', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-federation-trusted-sync-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamFederationRuntimeStore } = await import('../src/platform/iamFederationRuntime')
    const { LocalIamFoundationStore } = await import('../src/platform/iamFoundation')

    const provider = await LocalIamFederationRuntimeStore.createUserFederationProviderAsync(IAM_SYSTEM_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      name: 'Trusted Runtime LDAP',
      kind: 'LDAP',
      import_strategy: 'IMPORT',
      source_mode: 'TRUSTED_ASSERTION',
      trust_store_id: 'trust-store-institutional-oidc',
      mapping_profile_id: 'mapping-profile-institutional-oidc',
      issuer_url: 'ldaps://directory.partner.example/ou=People,dc=partner,dc=example',
      trusted_email_domains: ['partner.example'],
    })

    const syncJob = await LocalIamFederationRuntimeStore.runUserFederationSyncAsync(
      IAM_SYSTEM_USER_ID,
      provider.id,
      {
        external_identities: [
          {
            subject: 'placeholder-subject',
            username: 'placeholder-user',
            email: 'placeholder@partner.example',
            first_name: 'Placeholder',
            last_name: 'Placeholder',
            issuer_url: 'ldaps://directory.partner.example/ou=People,dc=partner,dc=example',
            group_names: ['ops'],
            role_names: ['member'],
            raw_attributes: {
              sub: 'ldap-partner-0001',
              email: 'taylor.directory@partner.example',
              preferred_username: 'taylor.directory',
              given_name: 'Taylor',
              family_name: 'Directory',
            },
          },
        ],
      },
    )

    expect(syncJob.status).toBe('COMPLETED')
    expect(syncJob.imported_count).toBe(1)

    const importedUser = LocalIamFoundationStore.listUsers({ realm_id: IAM_DEFAULT_REALM_ID }).users.find(
      (candidate) => candidate.email === 'taylor.directory@partner.example',
    )
    expect(importedUser).toBeTruthy()

    const linkedIdentities = LocalIamFederationRuntimeStore.listLinkedIdentities({
      realm_id: IAM_DEFAULT_REALM_ID,
      source_type: 'FEDERATION',
    })
    expect(
      linkedIdentities.linked_identities.find((record) => record.provider_id === provider.id)?.external_subject,
    ).toBe('ldap-partner-0001')
  }, 20000)

  it('rejects trusted runtime federation sync assertions from the wrong issuer', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-federation-trusted-sync-issuer-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamFederationRuntimeStore } = await import('../src/platform/iamFederationRuntime')

    const provider = await LocalIamFederationRuntimeStore.createUserFederationProviderAsync(IAM_SYSTEM_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      name: 'Trusted Runtime SCIM',
      kind: 'SCIM',
      import_strategy: 'IMPORT',
      source_mode: 'TRUSTED_ASSERTION',
      trust_store_id: 'trust-store-institutional-oidc',
      mapping_profile_id: 'mapping-profile-institutional-oidc',
      issuer_url: 'https://directory.partner.example/scim/v2',
      trusted_email_domains: ['partner.example'],
    })

    await expect(
      LocalIamFederationRuntimeStore.runUserFederationSyncAsync(IAM_SYSTEM_USER_ID, provider.id, {
        external_identities: [
          {
            subject: 'scim-partner-0002',
            username: 'jamie.directory',
            email: 'jamie.directory@partner.example',
            first_name: 'Jamie',
            last_name: 'Directory',
            issuer_url: 'https://directory.evil.example/scim/v2',
          },
        ],
      }),
    ).rejects.toThrow('Trusted asserted federation identity issuer does not match the configured provider')
  }, 20000)

  it('rejects trusted assertion identity providers without governance bindings', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-federation-trusted-broker-governance-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamFederationRuntimeStore } = await import('../src/platform/iamFederationRuntime')

    await expect(
      LocalIamFederationRuntimeStore.createIdentityProviderAsync(IAM_SYSTEM_USER_ID, {
        realm_id: IAM_DEFAULT_REALM_ID,
        alias: 'trusted-runtime-broker-missing-governance',
        name: 'Trusted Runtime Broker Missing Governance',
        protocol: 'OIDC',
        link_policy: 'AUTO_CREATE',
        profile_source_mode: 'TRUSTED_ASSERTION',
        issuer_url: 'https://login.partner.example/realms/workforce',
        trusted_email_domains: ['partner.example'],
      }),
    ).rejects.toThrow('Trusted assertion identity providers require both trust_store_id and mapping_profile_id')
  }, 20000)

  it('rejects trusted broker assertions when required mapped attributes are missing', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-federation-trusted-broker-mapping-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamFederationRuntimeStore } = await import('../src/platform/iamFederationRuntime')

    await LocalIamFederationRuntimeStore.createIdentityProviderAsync(IAM_SYSTEM_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      alias: 'trusted-runtime-broker-mapped-required',
      name: 'Trusted Runtime Broker Mapped Required',
      protocol: 'OIDC',
      link_policy: 'AUTO_CREATE',
      profile_source_mode: 'TRUSTED_ASSERTION',
      trust_store_id: 'trust-store-institutional-oidc',
      mapping_profile_id: 'mapping-profile-institutional-oidc',
      issuer_url: 'https://login.partner.example/realms/workforce',
      trusted_email_domains: ['partner.example'],
    })

    await expect(
      LocalIamFederationRuntimeStore.brokerLoginAsync(
        IAM_DEFAULT_REALM_ID,
        'trusted-runtime-broker-mapped-required',
        {
          external_username_or_email: 'ignored',
          external_identity: {
            subject: 'placeholder-subject',
            username: 'placeholder-user',
            email: '',
            first_name: '',
            last_name: '',
            issuer_url: 'https://login.partner.example/realms/workforce',
            raw_attributes: {
              sub: 'partner-workforce-0009',
            },
          },
        },
      ),
    ).rejects.toThrow('Trusted assertion is missing required mapped source attribute: email')
  }, 20000)

  it('rejects trusted assertion user federation providers with mismatched governance protocol binding', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-federation-trusted-sync-governance-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamFederationRuntimeStore } = await import('../src/platform/iamFederationRuntime')

    await expect(
      LocalIamFederationRuntimeStore.createUserFederationProviderAsync(IAM_SYSTEM_USER_ID, {
        realm_id: IAM_DEFAULT_REALM_ID,
        name: 'Trusted Runtime LDAP Bad Governance',
        kind: 'LDAP',
        import_strategy: 'IMPORT',
        source_mode: 'TRUSTED_ASSERTION',
        trust_store_id: 'trust-store-institutional-oidc',
        mapping_profile_id: 'mapping-profile-institutional-saml',
        issuer_url: 'ldaps://directory.partner.example/ou=People,dc=partner,dc=example',
        trusted_email_domains: ['partner.example'],
      }),
    ).rejects.toThrow('Federation governance bindings must belong to the same realm as the user federation provider')
  }, 20000)
})
