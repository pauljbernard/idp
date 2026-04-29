import { mkdtempSync, rmSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('application consumer runtime', () => {
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

  it('resolves principal, tenant, and identity access fact contracts for an application binding', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-application-consumer-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { getDefaultLocalUserId } = await import('../src/platform/tenants')
    const { LocalIamApplicationConsumerStore } = await import('../src/platform/iamApplicationConsumers')

    const userId = getDefaultLocalUserId()
    const principal = LocalIamApplicationConsumerStore.getPrincipalContext('binding-application-crew-web', userId)
    const tenant = LocalIamApplicationConsumerStore.getTenantContext('binding-application-crew-web', userId)
    const accessFacts = LocalIamApplicationConsumerStore.getIdentityAccessFacts('binding-application-crew-web', userId)

    expect(principal.contract.binding_target_id).toBe('crew-web')
    expect(principal.contract.kind).toBe('principal_context')
    expect(principal.contract.version).toBe('2026-04-05')
    expect(principal.provenance).toMatchObject({
      source_system: 'IDP',
      source_binding_id: 'binding-application-crew-web',
      source_realm_id: 'realm-crew-validation',
      projection_policy_id: 'projection-policy-crew-default',
    })
    expect(principal.correlation).toMatchObject({
      request_header: 'X-Correlation-ID',
      response_field: 'correlation_id',
      external_handoff_header: 'X-External-Handoff-ID',
    })
    expect(principal.user.id).toBe(userId)
    expect(principal.user).toHaveProperty('username')
    expect(principal.user).toHaveProperty('login_identifier')
    expect(principal.user.communication_email).toBe(principal.user.email)
    expect(principal.consumer_contract?.application_id).toBe('crew')

    expect(tenant.user_id).toBe(userId)
    expect(tenant.contract.kind).toBe('tenant_context')
    expect(tenant.contract.version).toBe('2026-04-05')
    expect(Array.isArray(tenant.available_tenants)).toBe(true)
    expect(tenant.available_tenants.length).toBeGreaterThan(0)
    expect(tenant.available_tenants[0]).toHaveProperty('feature_ids')
    expect(tenant.available_tenants[0]).toHaveProperty('feature_aliases')
    expect(tenant.available_tenants[0]).not.toHaveProperty('max_users')
    expect(['requested', 'default', 'fallback']).toContain(tenant.selection_source)
    expect(tenant.projection).toMatchObject({
      policy_id: 'projection-policy-crew-default',
      membership_projection_strategy: 'EXPLICIT_MEMBERSHIP_ONLY',
    })

    expect(accessFacts.user_id).toBe(userId)
    expect(accessFacts.contract.kind).toBe('identity_access_facts')
    expect(accessFacts.contract.version).toBe('2026-04-05')
    expect(Array.isArray(accessFacts.memberships)).toBe(true)
    expect(accessFacts.memberships[0]).toHaveProperty('permission_ids')
    expect(accessFacts.memberships[0]).toHaveProperty('permission_aliases')
    expect(accessFacts.memberships[0]).toHaveProperty('accessible_surface_aliases')
    expect(accessFacts).toHaveProperty('global_accessible_surface_aliases')
    expect(accessFacts.contract_delivery.identity_bootstrap).toBe('PLANNED')
    expect(accessFacts.contract_delivery.principal_context).toBe('PLANNED')
    expect(accessFacts.contract_delivery.identity_access_facts).toBe('PLANNED')
    expect(accessFacts.contract_delivery.account_self_service).toBe('PLANNED')
    expect(accessFacts.projection).toMatchObject({
      policy_id: 'projection-policy-crew-default',
      membership_projection_strategy: 'EXPLICIT_MEMBERSHIP_ONLY',
    })
  })


  it('resolves Crew contracts for a realm-authenticated principal without a mirrored local-directory user', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-application-consumer-realm-user-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { LocalIamApplicationConsumerStore } = await import('../src/platform/iamApplicationConsumers')

    const principal = LocalIamApplicationConsumerStore.getPrincipalContext('binding-application-crew-web', 'iam-user-crew-admin')
    const tenant = LocalIamApplicationConsumerStore.getTenantContext('binding-application-crew-web', 'iam-user-crew-admin', '6db41674-f92a-4d7d-8dbf-c4ca6b5b72bc')
    const accessFacts = LocalIamApplicationConsumerStore.getIdentityAccessFacts('binding-application-crew-web', 'iam-user-crew-admin', '6db41674-f92a-4d7d-8dbf-c4ca6b5b72bc')

    expect(principal.user.email).toBe('crew.admin@iam.local')
    expect(principal.user.username).toBe('crew.admin')
    expect(principal.user.login_identifier).toBe('crew.admin')
    expect(principal.user.communication_email).toBe('crew.admin@iam.local')
    expect(principal.user.id).toBe('iam-user-crew-admin')
    expect(principal.user.role).toBe('realm-admin')
    expect(principal.user.auth_source).toBe('external_identity')
    expect(principal.user.provider_id).toBe('realm-crew-validation')
    expect(principal.user.default_tenant_id).toBe('')
    expect(principal.user.tenant_ids).toEqual([])

    expect(tenant.user_id).toBe('iam-user-crew-admin')
    expect(tenant.selected_tenant).toBeNull()
    expect(tenant.available_tenants).toEqual([])
    expect(tenant.current_membership).toBeNull()
    expect(tenant.warnings).toEqual([
      'Authenticated IAM realm user has not been projected into an application tenant context.',
    ])

    expect(accessFacts.user_id).toBe('iam-user-crew-admin')
    expect(accessFacts.global_role_ids).toContain('role-crew-realm-admin')
    expect(accessFacts.global_permissions).toContain('realm-admin')
    expect(accessFacts.memberships).toEqual([])
    expect(accessFacts.current_membership).toBeNull()
    expect(accessFacts.selected_tenant).toBeNull()
  })

  it('publishes a binding-scoped contract manifest for discovery', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-application-consumer-manifest-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { LocalIamApplicationConsumerStore } = await import('../src/platform/iamApplicationConsumers')

    const manifest = LocalIamApplicationConsumerStore.getContractManifest('binding-application-crew-web')

    expect(manifest.binding_target_id).toBe('crew-web')
    expect(manifest.current_contract_version).toBe('2026-04-05')
    expect(manifest.provenance).toMatchObject({
      source_system: 'IDP',
      source_binding_id: 'binding-application-crew-web',
      source_contract_version: '2026-04-05',
      projection_policy_id: 'projection-policy-crew-default',
    })
    expect(manifest.provenance.external_policy_sources).toContain('commercial_entitlements')
    expect(manifest.correlation).toMatchObject({
      request_header: 'X-Correlation-ID',
      response_field: 'correlation_id',
      external_handoff_header: 'X-External-Handoff-ID',
    })
    expect(manifest.contracts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'identity_bootstrap',
        version: '2026-04-05',
        delivery_status: 'PLANNED',
        route_path: '/api/v1/iam/application-bindings/binding-application-crew-web/identity-bootstrap',
        auth_mode: 'mixed',
        supported_query_parameters: ['contract_version'],
        tenant_selection: 'none',
      }),
      expect.objectContaining({
        kind: 'account_self_service',
        version: '2026-04-05',
        delivery_status: 'PLANNED',
        route_path: '/api/v1/iam/application-bindings/binding-application-crew-web/account-self-service',
        auth_mode: 'account_session',
        supported_query_parameters: ['contract_version'],
        tenant_selection: 'none',
      }),
      expect.objectContaining({
        kind: 'projection_policy',
        version: '2026-04-05',
        delivery_status: 'PLANNED',
        route_path: '/api/v1/iam/application-bindings/binding-application-crew-web/projection-policy',
        auth_mode: 'bearer_or_account_session',
        supported_query_parameters: ['contract_version'],
        tenant_selection: 'none',
      }),
      expect.objectContaining({
        kind: 'principal_context',
        version: '2026-04-05',
        delivery_status: 'PLANNED',
        route_path: '/api/v1/iam/application-bindings/binding-application-crew-web/principal-context',
        auth_mode: 'bearer_or_account_session',
        supported_query_parameters: ['contract_version'],
        tenant_selection: 'none',
      }),
      expect.objectContaining({
        kind: 'tenant_context',
        version: '2026-04-05',
        delivery_status: 'PLANNED',
        route_path: '/api/v1/iam/application-bindings/binding-application-crew-web/tenant-context',
        auth_mode: 'bearer_or_account_session',
        supported_query_parameters: ['tenant_id', 'contract_version'],
        tenant_selection: 'optional',
      }),
      expect.objectContaining({
        kind: 'identity_access_facts',
        version: '2026-04-05',
        delivery_status: 'PLANNED',
        route_path: '/api/v1/iam/application-bindings/binding-application-crew-web/identity-access-facts',
        auth_mode: 'bearer_or_account_session',
        supported_query_parameters: ['tenant_id', 'contract_version'],
        tenant_selection: 'optional',
      }),
    ]))
  })

  it('publishes a binding-scoped identity bootstrap contract for activation and recovery discovery', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-application-identity-bootstrap-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { LocalIamApplicationConsumerStore } = await import('../src/platform/iamApplicationConsumers')

    const bootstrap = LocalIamApplicationConsumerStore.getIdentityBootstrap('binding-application-crew-web')

    expect(bootstrap.contract.kind).toBe('identity_bootstrap')
    expect(bootstrap.contract.version).toBe('2026-04-05')
    expect(bootstrap.delivery_status).toBe('PLANNED')
    expect(bootstrap.orchestration_model).toBe('external_handoff')
    expect(bootstrap.public_registration_supported).toBe(false)
    expect(bootstrap.provenance).toMatchObject({
      source_system: 'IDP',
      source_binding_id: 'binding-application-crew-web',
      source_realm_id: 'realm-crew-validation',
      projection_policy_id: 'projection-policy-crew-default',
    })
    expect(bootstrap.correlation).toMatchObject({
      request_header: 'X-Correlation-ID',
      response_field: 'correlation_id',
      external_handoff_header: 'X-External-Handoff-ID',
    })
    expect(bootstrap.handoff).toEqual({
      request_correlation_header: 'X-Correlation-ID',
      response_correlation_field: 'correlation_id',
      external_handoff_header: 'X-External-Handoff-ID',
    })
    expect(bootstrap.operations.required_actions_complete).toMatchObject({
      method: 'POST',
      path: '/api/v1/iam/realms/realm-crew-validation/login/required-actions',
      auth_mode: 'public',
    })
    expect(bootstrap.operations.password_reset_request).toMatchObject({
      method: 'POST',
      path: '/api/v1/iam/realms/realm-crew-validation/password-reset/request',
      auth_mode: 'public',
    })
    expect(bootstrap.operations.password_reset_confirm).toMatchObject({
      method: 'POST',
      path: '/api/v1/iam/realms/realm-crew-validation/password-reset/confirm',
      auth_mode: 'public',
    })
    expect(bootstrap.operations.email_verification_request).toMatchObject({
      method: 'POST',
      path: '/api/v1/iam/realms/realm-crew-validation/email-verification/request',
      auth_mode: 'public',
    })
    expect(bootstrap.operations.email_verification_confirm).toMatchObject({
      method: 'POST',
      path: '/api/v1/iam/realms/realm-crew-validation/email-verification/confirm',
      auth_mode: 'public',
    })
    expect(bootstrap.operations.organization_invitation_accept).toMatchObject({
      method: 'POST',
      path: '/api/v1/iam/realms/realm-crew-validation/account/organization-invitations/:invitationId/accept',
      auth_mode: 'account_session',
    })
  })

  it('publishes public registration discovery for FlightOS application bindings', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-flightos-identity-bootstrap-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { LocalIamApplicationConsumerStore } = await import('../src/platform/iamApplicationConsumers')

    const bootstrap = LocalIamApplicationConsumerStore.getIdentityBootstrap('binding-application-flightos-web')

    expect(bootstrap.contract.kind).toBe('identity_bootstrap')
    expect(bootstrap.public_registration_supported).toBe(true)
    expect(bootstrap.operations.public_registration).toMatchObject({
      method: 'POST',
      path: '/api/v1/iam/application-bindings/account-registration',
      auth_mode: 'public',
    })
  })

  it('publishes a binding-scoped account self-service contract for account-managed bindings', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-application-account-self-service-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { LocalIamApplicationConsumerStore } = await import('../src/platform/iamApplicationConsumers')

    const selfService = LocalIamApplicationConsumerStore.getAccountSelfService('binding-application-crew-web')

    expect(selfService.contract.kind).toBe('account_self_service')
    expect(selfService.contract.version).toBe('2026-04-05')
    expect(selfService.delivery_status).toBe('PLANNED')
    expect(selfService.provenance.source_binding_id).toBe('binding-application-crew-web')
    expect(selfService.correlation.response_field).toBe('correlation_id')
    expect(selfService.required_session_header).toBe('X-IAM-Session-ID')
    expect(selfService.capabilities).toEqual(['profile', 'security', 'passkeys', 'password', 'mfa', 'sessions'])
    expect(selfService.profile).toMatchObject({
      read_path: '/api/v1/iam/realms/realm-crew-validation/account/profile',
      update_path: '/api/v1/iam/realms/realm-crew-validation/account/profile',
    })
    expect(selfService.passkeys).toMatchObject({
      register_begin_path: '/api/v1/iam/realms/realm-crew-validation/account/webauthn/register/begin',
      credentials_path: '/api/v1/iam/realms/realm-crew-validation/account/webauthn/credentials',
      revoke_path_template: '/api/v1/iam/realms/realm-crew-validation/account/webauthn/credentials/:credentialId/revoke',
    })
    expect(selfService.password.change_path).toBe('/api/v1/iam/realms/realm-crew-validation/account/password')
    expect(selfService.mfa).toMatchObject({
      enroll_path: '/api/v1/iam/realms/realm-crew-validation/account/mfa/enroll',
      verify_path: '/api/v1/iam/realms/realm-crew-validation/account/mfa/verify',
      disable_path: '/api/v1/iam/realms/realm-crew-validation/account/mfa/disable',
    })
    expect(selfService.sessions).toMatchObject({
      list_path: '/api/v1/iam/realms/realm-crew-validation/account/sessions',
      revoke_path_template: '/api/v1/iam/realms/realm-crew-validation/account/sessions/:sessionId/revoke',
      revoke_others_path: '/api/v1/iam/realms/realm-crew-validation/account/sessions/revoke-others',
    })
  })

  it('publishes projection policy contracts for bindings that declare projection metadata', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-application-projection-policy-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { LocalIamApplicationConsumerStore } = await import('../src/platform/iamApplicationConsumers')

    const projectionPolicy = LocalIamApplicationConsumerStore.getProjectionPolicy('binding-application-crew-web')

    expect(projectionPolicy.contract.kind).toBe('projection_policy')
    expect(projectionPolicy.provenance.projection_policy_id).toBe('projection-policy-crew-default')
    expect(projectionPolicy.correlation.request_header).toBe('X-Correlation-ID')
    expect(projectionPolicy.projection_policy).toMatchObject({
      policy_id: 'projection-policy-crew-default',
      membership_projection_strategy: 'EXPLICIT_MEMBERSHIP_ONLY',
      projection_sources: ['explicit_identity_membership', 'claim_match', 'external_business_policy'],
    })
    expect(projectionPolicy.projection_policy.managed_role_mappings).toEqual(expect.arrayContaining([
      expect.objectContaining({ managed_role_id: 'tenant_admin' }),
      expect.objectContaining({ managed_role_id: 'tenant_operator' }),
      expect.objectContaining({ managed_role_id: 'tenant_viewer' }),
    ]))
  })

  it('publishes a public auth bootstrap contract for bindings with auth metadata', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-application-auth-bootstrap-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { LocalIamApplicationConsumerStore } = await import('../src/platform/iamApplicationConsumers')

    const bootstrap = LocalIamApplicationConsumerStore.getAuthBootstrap('binding-application-idp-admin-console')
    const manifest = LocalIamApplicationConsumerStore.getContractManifest('binding-application-idp-admin-console')

    expect(bootstrap.contract.kind).toBe('auth_bootstrap')
    expect(bootstrap.client.client_id).toBe('admin-console-demo')
    expect(bootstrap.auth_binding.preferred_authentication_mode).toBe('browser_authorization_code_pkce')
    expect(bootstrap.requested_scope_names).toEqual(expect.arrayContaining(['openid', 'profile', 'email', 'roles']))
    expect(bootstrap.oidc).toMatchObject({
      authorization_endpoint_path: '/api/v1/iam/realms/realm-idp-default/protocol/openid-connect/auth',
      token_endpoint_path: '/api/v1/iam/realms/realm-idp-default/protocol/openid-connect/token',
      username_password_login_path: '/api/v1/iam/realms/realm-idp-default/login',
    })
    expect(bootstrap.saml).toBeNull()
    expect(bootstrap.pkce_required).toBe(true)

    expect(manifest.contracts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'auth_bootstrap',
        route_path: '/api/v1/iam/application-bindings/binding-application-idp-admin-console/auth-bootstrap',
        auth_mode: 'public',
        supported_query_parameters: ['contract_version'],
        tenant_selection: 'none',
      }),
    ]))
  })

  it('rejects tenant-space bindings for application consumer runtime contracts', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-application-consumer-invalid-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { getDefaultLocalUserId } = await import('../src/platform/tenants')
    const { LocalIamApplicationConsumerStore } = await import('../src/platform/iamApplicationConsumers')

    expect(() =>
      LocalIamApplicationConsumerStore.getPrincipalContext(
        'binding-tenant-space-northstar-ops',
        getDefaultLocalUserId(),
      ),
    ).toThrow(/not an application binding/i)
  })

  it('rejects a requested contract version that does not match the binding contract', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-application-consumer-version-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { getDefaultLocalUserId } = await import('../src/platform/tenants')
    const { LocalIamApplicationConsumerStore } = await import('../src/platform/iamApplicationConsumers')

    expect(() =>
      LocalIamApplicationConsumerStore.getPrincipalContext(
        'binding-application-crew-web',
        getDefaultLocalUserId(),
        '2099-01-01',
      ),
    ).toThrow(/exposes contract version/i)
  })

  it('publishes auth bootstrap for Crew application bindings that externalize login through IDP', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-application-auth-bootstrap-crew-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { LocalIamApplicationConsumerStore } = await import('../src/platform/iamApplicationConsumers')

    const bootstrap = LocalIamApplicationConsumerStore.getAuthBootstrap('binding-application-crew-web')
    const manifest = LocalIamApplicationConsumerStore.getContractManifest('binding-application-crew-web')

    expect(bootstrap.contract.kind).toBe('auth_bootstrap')
    expect(bootstrap.realm_id).toBe('realm-crew-validation')
    expect(bootstrap.client.client_id).toBe('crew-web-demo')
    expect(bootstrap.client.access_type).toBe('PUBLIC')
    expect(bootstrap.auth_binding.preferred_authentication_mode).toBe('browser_authorization_code_pkce')
    expect(bootstrap.pkce_required).toBe(true)
    expect(bootstrap.client.redirect_uris).toEqual(expect.arrayContaining(['http://localhost:3000/*']))
    expect(bootstrap.oidc).toMatchObject({
      authorization_endpoint_path: '/api/v1/iam/realms/realm-crew-validation/protocol/openid-connect/auth',
      token_endpoint_path: '/api/v1/iam/realms/realm-crew-validation/protocol/openid-connect/token',
      username_password_login_path: '/api/v1/iam/realms/realm-crew-validation/login',
    })

    expect(manifest.contracts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'auth_bootstrap',
        route_path: '/api/v1/iam/application-bindings/binding-application-crew-web/auth-bootstrap',
        auth_mode: 'public',
        supported_query_parameters: ['contract_version'],
        tenant_selection: 'none',
      }),
    ]))
  })

  it('keeps admin, Crew, SaaS CMS, and Commercial in distinct application realms', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-application-realm-separation-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { LocalIamApplicationConsumerStore } = await import('../src/platform/iamApplicationConsumers')

    const adminBootstrap = LocalIamApplicationConsumerStore.getAuthBootstrap('binding-application-idp-admin-console')
    const crewBootstrap = LocalIamApplicationConsumerStore.getAuthBootstrap('binding-application-crew-web')
    const cmsBootstrap = LocalIamApplicationConsumerStore.getAuthBootstrap('binding-application-idp-cms')
    const commercialBootstrap = LocalIamApplicationConsumerStore.getAuthBootstrap('binding-application-commercial-web')

    expect(adminBootstrap.realm_id).toBe('realm-idp-default')
    expect(crewBootstrap.realm_id).toBe('realm-crew-validation')
    expect(cmsBootstrap.realm_id).toBe('realm-cms-validation')
    expect(commercialBootstrap.realm_id).toBe('realm-commercial-validation')
    expect(cmsBootstrap.client.client_id).toBe('cms-admin-demo')
    expect(cmsBootstrap.client.access_type).toBe('PUBLIC')
    expect(cmsBootstrap.auth_binding.preferred_authentication_mode).toBe('browser_authorization_code_pkce')
    expect(cmsBootstrap.pkce_required).toBe(true)
    expect(commercialBootstrap.client.client_id).toBe('commercial-web-demo')
  })

  it('rejects projection policy lookup when a binding does not publish projection metadata', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-application-projection-policy-missing-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { LocalIamApplicationConsumerStore } = await import('../src/platform/iamApplicationConsumers')

    expect(() =>
      LocalIamApplicationConsumerStore.getProjectionPolicy('binding-application-idp-admin-console'),
    ).toThrow(/does not publish projection policy metadata/i)
  })
})
