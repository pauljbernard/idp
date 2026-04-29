import { mkdtempSync, rmSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('bounded SAML supported profile contract', () => {
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

  it('publishes one explicit bounded SP contract and keeps runtime metadata aligned to it', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-saml-supported-profile-contract-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID } = await import('../src/platform/iamIdentifiers')
    const {
      BOUNDED_SUPPORTED_SAML_SP_PROFILE,
      LocalIamSamlSupportMatrixRuntimeStore,
    } = await import('../src/platform/iamSamlSupportMatrixRuntime')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')

    const supportMatrix = LocalIamSamlSupportMatrixRuntimeStore.getSupportMatrix()
    const metadata = LocalIamProtocolRuntimeStore.getSamlMetadata(
      IAM_DEFAULT_REALM_ID,
      'saml-test-service-provider',
      'https://idp.local',
    )

    expect(supportMatrix.overall_support_decision).toBe('IMPLEMENTED_NOT_SUPPORTED')
    expect(supportMatrix.supported_profile_definition).toEqual(BOUNDED_SUPPORTED_SAML_SP_PROFILE)
    expect(supportMatrix.supported_profile_definition).toMatchObject({
      profile_id: 'saml-sp-bounded-redirect-post-v1',
      request_bindings: ['REDIRECT'],
      response_bindings: ['POST'],
      exact_acs_match_required: true,
      wildcard_acs_allowed: false,
      request_id_required: true,
      max_request_id_length: 256,
      idp_initiated_supported: true,
      sp_initiated_supported: true,
      passive_requests_supported: false,
      allow_create_supported: false,
      signed_login_responses: true,
      signed_logout_responses: true,
    })
    expect(supportMatrix.supported_profile_definition.supported_nameid_formats).toEqual([
      'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
    ])
    expect(supportMatrix.supported_profile_definition.supported_requested_authn_context_comparisons).toEqual(['exact'])
    expect(supportMatrix.supported_profile_definition.supported_requested_authn_context_class_refs).toEqual([
      'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
    ])
    expect(
      supportMatrix.rows.find((row) => row.id === 'saml-supported-sp-profile-definition'),
    ).toMatchObject({
      current_maturity: 'IMPLEMENTED',
      evidence_class: 'INTERNAL_RUNTIME',
    })

    expect(metadata.supported_request_bindings).toEqual(BOUNDED_SUPPORTED_SAML_SP_PROFILE.request_bindings)
    expect(metadata.supported_response_bindings).toEqual(BOUNDED_SUPPORTED_SAML_SP_PROFILE.response_bindings)
    expect(metadata.metadata_xml).toContain(
      `requestBinding="${BOUNDED_SUPPORTED_SAML_SP_PROFILE.request_bindings[0]}"`,
    )
    expect(metadata.metadata_xml).toContain(
      `responseBinding="${BOUNDED_SUPPORTED_SAML_SP_PROFILE.response_bindings[0]}"`,
    )
    expect(metadata.metadata_xml).toContain(
      `exactAcsMatchRequired="${String(BOUNDED_SUPPORTED_SAML_SP_PROFILE.exact_acs_match_required)}"`,
    )
  }, 20_000)

  it('enforces request-shape and logout correlation rules from the bounded contract', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-saml-supported-profile-shape-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID } = await import('../src/platform/iamIdentifiers')
    const { BOUNDED_SUPPORTED_SAML_SP_PROFILE } = await import('../src/platform/iamSamlSupportMatrixRuntime')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')

    const unsupportedPassiveRequest = Buffer.from(
      '<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="sp-request-passive-contract" Version="2.0" IssueInstant="2026-04-11T00:00:00.000Z" IsPassive="true" ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" AssertionConsumerServiceURL="https://sp.example.local/acs"><samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="false"/></samlp:AuthnRequest>',
      'utf8',
    ).toString('base64')

    expect(BOUNDED_SUPPORTED_SAML_SP_PROFILE.passive_requests_supported).toBe(false)
    expect(BOUNDED_SUPPORTED_SAML_SP_PROFILE.request_id_required).toBe(true)
    expect(BOUNDED_SUPPORTED_SAML_SP_PROFILE.allow_create_supported).toBe(false)

    expect(() =>
      LocalIamProtocolRuntimeStore.createSamlAuthRedirectSyncOnly(
        IAM_DEFAULT_REALM_ID,
        {
          client_id: 'saml-test-service-provider',
          binding: BOUNDED_SUPPORTED_SAML_SP_PROFILE.request_bindings[0],
          request_xml: unsupportedPassiveRequest,
        },
        'https://console.idp.local',
        'https://idp.local',
      ),
    ).toThrow('Passive SAML authentication requests are not supported for the current profile')

    const login = LocalIamProtocolRuntimeStore.performSamlLogin(
      IAM_DEFAULT_REALM_ID,
      {
        client_id: 'saml-test-service-provider',
        username: 'alex.morgan@northstar.example',
        password: 'StandaloneIAM!TenantAdmin2026',
      },
      'https://idp.local',
    )

    expect(() =>
      LocalIamProtocolRuntimeStore.logoutSamlSession(
        IAM_DEFAULT_REALM_ID,
        {
          client_id: 'saml-test-service-provider',
          session_index: login.session_index,
        },
        'https://idp.local',
      ),
    ).toThrow('SAML request_id is required for the current supported profile')
  }, 20_000)

  it('keeps the live-local bounded SAML client available after async protocol reload paths', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-saml-live-local-client-seeding-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')

    expect(() =>
      LocalIamProtocolRuntimeStore.getSamlMetadata(
        IAM_DEFAULT_REALM_ID,
        'saml-test-service-provider-live-local',
        'https://idp.local',
      ),
    ).not.toThrow()

    await LocalIamProtocolRuntimeStore.performSamlLoginAsync(
      IAM_DEFAULT_REALM_ID,
      {
        client_id: 'saml-test-service-provider',
        username: 'alex.morgan@northstar.example',
        password: 'StandaloneIAM!TenantAdmin2026',
      },
      'https://idp.local',
    )

    expect(() =>
      LocalIamProtocolRuntimeStore.getSamlMetadata(
        IAM_DEFAULT_REALM_ID,
        'saml-test-service-provider-live-local',
        'https://idp.local',
      ),
    ).not.toThrow()
  }, 20_000)
})
