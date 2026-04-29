import { mkdtempSync, rmSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('supported profile hardening', () => {
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

  it('rejects software-backed WebAuthn registrations outside the bounded supported profile', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-supported-passkey-profile-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamWebAuthnStore } = await import('../src/platform/iamWebAuthn')

    const registration = await LocalIamWebAuthnStore.beginRegistrationAsync(IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID)

    await expect(
      LocalIamWebAuthnStore.completeRegistrationAsync(IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID, {
        challenge_id: registration.challenge_id,
        credential_id: 'credential-software-backed',
        device_label: 'Software Passkey',
        public_key_jwk: { kty: 'EC', crv: 'P-256', x: 'abc', y: 'def' },
        algorithm: 'ES256',
        transports: ['SOFTWARE'],
        rp_id: registration.rp_id,
        origin: registration.supported_origins[0],
        proof_signature: 'placeholder-signature',
      }),
    ).rejects.toThrow('Software-backed passkey transports are not supported in the current bounded profile')

    expect(LocalIamWebAuthnStore.deriveRpProfile('https://identity.example.com:9443')).toEqual({
      rp_id: 'identity.example.com',
      rp_name: 'Standalone Identity Platform',
      supported_origins: ['https://identity.example.com:9443'],
    })

    expect(registration.authenticator_attachment).toBe('PLATFORM')
    expect(registration.user_verification).toBe('REQUIRED')
    expect(registration.resident_key).toBe('REQUIRED')
    expect(registration.attestation).toBe('NONE')
  })

  it('rejects WebAuthn completion when rp_id or origin do not match the issued challenge', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-webauthn-rp-binding-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamWebAuthnStore } = await import('../src/platform/iamWebAuthn')

    const registration = await LocalIamWebAuthnStore.beginRegistrationAsync(
      IAM_DEFAULT_REALM_ID,
      IAM_SUPER_ADMIN_USER_ID,
      LocalIamWebAuthnStore.deriveRpProfile('https://identity.example.com'),
    )

    await expect(
      LocalIamWebAuthnStore.completeRegistrationAsync(IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID, {
        challenge_id: registration.challenge_id,
        credential_id: 'credential-rp-mismatch',
        device_label: 'Bound Device',
        public_key_jwk: { kty: 'EC', crv: 'P-256', x: 'abc', y: 'def' },
        algorithm: 'ES256',
        transports: ['INTERNAL'],
        rp_id: 'wrong.example.com',
        origin: registration.supported_origins[0],
        proof_signature: 'placeholder-signature',
      }),
    ).rejects.toThrow('Passkey ceremony rp_id does not match the issued challenge')

    await expect(
      LocalIamWebAuthnStore.completeRegistrationAsync(IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID, {
        challenge_id: registration.challenge_id,
        credential_id: 'credential-origin-mismatch',
        device_label: 'Bound Device',
        public_key_jwk: { kty: 'EC', crv: 'P-256', x: 'abc', y: 'def' },
        algorithm: 'ES256',
        transports: ['INTERNAL'],
        rp_id: registration.rp_id,
        origin: 'https://evil.example.com',
        proof_signature: 'placeholder-signature',
      }),
    ).rejects.toThrow('Passkey ceremony origin is not allowed for the issued challenge')
  })

  it('rejects unsupported passkey attachment and user-verification posture outside the bounded profile', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-webauthn-bounded-profile-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamWebAuthnStore } = await import('../src/platform/iamWebAuthn')

    const registration = await LocalIamWebAuthnStore.beginRegistrationAsync(IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID)

    await expect(
      LocalIamWebAuthnStore.completeRegistrationAsync(IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID, {
        challenge_id: registration.challenge_id,
        credential_id: 'credential-cross-platform',
        device_label: 'Roaming Key',
        public_key_jwk: { kty: 'EC', crv: 'P-256', x: 'abc', y: 'def' },
        algorithm: 'ES256',
        transports: ['USB'],
        authenticator_attachment: 'CROSS_PLATFORM',
        user_verification: 'PREFERRED',
        rp_id: registration.rp_id,
        origin: registration.supported_origins[0],
        proof_signature: 'placeholder-signature',
      }),
    ).rejects.toThrow('Unsupported passkey authenticator attachment: CROSS_PLATFORM')
  })

  it('rejects wildcard ACS redirect profiles for SAML clients', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-supported-saml-profile-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')

    const state = LocalIamProtocolRuntimeStore.exportState() as {
      clients: Array<{ client_id: string; protocol: string; redirect_uris: string[] }>
    }
    const samlClient = state.clients.find((candidate) => candidate.client_id === 'saml-test-service-provider')
    expect(samlClient).toBeTruthy()
    samlClient!.redirect_uris = ['https://sp.example.local/*']
    LocalIamProtocolRuntimeStore.importState(state as unknown as Record<string, unknown>)

    expect(() =>
      LocalIamProtocolRuntimeStore.getSamlMetadata(
        IAM_DEFAULT_REALM_ID,
        'saml-test-service-provider',
        'https://idp.local',
      ),
    ).toThrow('Wildcard ACS redirect URIs are not supported for SAML clients')
  })

  it('publishes only supported SAML bindings and rejects unsupported request bindings', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-supported-saml-bindings-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')

    const metadata = LocalIamProtocolRuntimeStore.getSamlMetadata(
      IAM_DEFAULT_REALM_ID,
      'saml-test-service-provider',
      'https://idp.local',
    )

    expect(metadata.supported_request_bindings).toEqual(['REDIRECT'])
    expect(metadata.supported_response_bindings).toEqual(['POST'])
    expect(typeof metadata.signing_key_id).toBe('string')
    expect(metadata.signing_key_id.length).toBeGreaterThan(0)
    expect(metadata.metadata_xml).toContain('requestBinding="REDIRECT"')
    expect(metadata.metadata_xml).toContain('responseBinding="POST"')
    expect(metadata.metadata_xml).toContain('exactAcsMatchRequired="true"')
    expect(metadata.metadata_xml).toContain('<KeyDescriptor use="signing">')
    expect(metadata.metadata_xml).toContain(`<ds:KeyName>${metadata.signing_key_id}</ds:KeyName>`)
    expect(metadata.metadata_xml).not.toContain('Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://idp.local/realms/realm-idp-default/protocol/saml/auth?client_id=saml-test-service-provider"')

    expect(() =>
      LocalIamProtocolRuntimeStore.createSamlAuthRedirectSyncOnly(
        IAM_DEFAULT_REALM_ID,
        {
          client_id: 'saml-test-service-provider',
          binding: 'POST',
        },
        'https://console.idp.local',
        'https://idp.local',
      ),
    ).toThrow('Unsupported SAML request binding for the current profile: POST')

    expect(() =>
      LocalIamProtocolRuntimeStore.createSamlAuthRedirectSyncOnly(
        IAM_DEFAULT_REALM_ID,
        {
          client_id: 'saml-test-service-provider',
          binding: 'REDIRECT',
        },
        'https://console.idp.local',
        'https://idp.local',
      ),
    ).toThrow('SAML request_id is required for the current supported profile')

    const unsupportedPassiveRequest = Buffer.from(
      '<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="sp-request-passive-1" Version="2.0" IssueInstant="2026-04-11T00:00:00.000Z" IsPassive="true" ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" AssertionConsumerServiceURL="https://sp.example.local/acs"><samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="false"/></samlp:AuthnRequest>',
      'utf8',
    ).toString('base64')

    expect(() =>
      LocalIamProtocolRuntimeStore.createSamlAuthRedirectSyncOnly(
        IAM_DEFAULT_REALM_ID,
        {
          client_id: 'saml-test-service-provider',
          binding: 'REDIRECT',
          request_xml: unsupportedPassiveRequest,
        },
        'https://console.idp.local',
        'https://idp.local',
      ),
    ).toThrow('Passive SAML authentication requests are not supported for the current profile')

    const unsupportedAuthnContextRequest = Buffer.from(
      '<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="sp-request-authncontext-1" Version="2.0" IssueInstant="2026-04-11T00:00:00.000Z" ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" AssertionConsumerServiceURL="https://sp.example.local/acs"><samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="false"/><samlp:RequestedAuthnContext Comparison="exact"><saml:AuthnContextClassRef xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">urn:oasis:names:tc:SAML:2.0:ac:classes:TimeSyncToken</saml:AuthnContextClassRef></samlp:RequestedAuthnContext></samlp:AuthnRequest>',
      'utf8',
    ).toString('base64')

    expect(() =>
      LocalIamProtocolRuntimeStore.createSamlAuthRedirectSyncOnly(
        IAM_DEFAULT_REALM_ID,
        {
          client_id: 'saml-test-service-provider',
          binding: 'REDIRECT',
          request_xml: unsupportedAuthnContextRequest,
        },
        'https://console.idp.local',
        'https://idp.local',
      ),
    ).toThrow('Unsupported RequestedAuthnContext class for the current profile')
  })

  it('issues signed SAML login and logout envelopes tied to the active signing key', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-supported-saml-signing-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')

    const metadata = LocalIamProtocolRuntimeStore.getSamlMetadata(
      IAM_DEFAULT_REALM_ID,
      'saml-test-service-provider',
      'https://idp.local',
    )

    const login = LocalIamProtocolRuntimeStore.performSamlLogin(
      IAM_DEFAULT_REALM_ID,
      {
        client_id: 'saml-test-service-provider',
        username: 'alex.morgan@northstar.example',
        password: 'StandaloneIAM!TenantAdmin2026',
      },
      'https://idp.local',
    )
    const decodedLoginResponse = Buffer.from(login.saml_response, 'base64').toString('utf8')

    expect(decodedLoginResponse).toContain('<ds:Signature')
    expect(decodedLoginResponse).toContain(`<ds:KeyName>${metadata.signing_key_id}</ds:KeyName>`)
    expect(decodedLoginResponse).toContain('<ds:SignatureValue>')
    expect(decodedLoginResponse).toContain('<ds:Reference URI="#_')
    expect(decodedLoginResponse).toContain('Algorithm="urn:idp:standalone:xml-normalize:v1"')
    expect(decodedLoginResponse).toContain('<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>')
    expect(decodedLoginResponse).toContain('<ds:DigestValue>')
    expect(decodedLoginResponse).toContain('<saml:Audience>saml-test-service-provider</saml:Audience>')
    expect(decodedLoginResponse).toContain('Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"')
    expect(decodedLoginResponse).toContain('<saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef>')
    expect(decodedLoginResponse).toContain('SessionNotOnOrAfter=')
    expect(LocalIamProtocolRuntimeStore.verifySamlSignatureEnvelope(decodedLoginResponse)).toEqual({
      valid: true,
      signing_key_id: metadata.signing_key_id,
      reference_count: 2,
    })

    const logout = LocalIamProtocolRuntimeStore.logoutSamlSession(
      IAM_DEFAULT_REALM_ID,
      {
        client_id: 'saml-test-service-provider',
        session_index: login.session_index,
        request_id: 'logout-request-1',
      },
      'https://idp.local',
    )
    const decodedLogoutResponse = Buffer.from(logout.saml_logout_response, 'base64').toString('utf8')

    expect(decodedLogoutResponse).toContain('<ds:Signature')
    expect(decodedLogoutResponse).toContain(`<ds:KeyName>${metadata.signing_key_id}</ds:KeyName>`)
    expect(decodedLogoutResponse).toContain('<ds:SignatureValue>')
    expect(decodedLogoutResponse).toContain('<ds:Reference URI="#_')
    expect(decodedLogoutResponse).toContain('<ds:DigestValue>')
    expect(LocalIamProtocolRuntimeStore.verifySamlSignatureEnvelope(decodedLogoutResponse)).toEqual({
      valid: true,
      signing_key_id: metadata.signing_key_id,
      reference_count: 1,
    })

    const tamperedLoginResponse = decodedLoginResponse.replace(
      '<saml:Audience>saml-test-service-provider</saml:Audience>',
      '<saml:Audience>tampered-service-provider</saml:Audience>',
    )
    expect(LocalIamProtocolRuntimeStore.verifySamlSignatureEnvelope(tamperedLoginResponse)).toEqual({
      valid: false,
      signing_key_id: metadata.signing_key_id,
      reference_count: 2,
    })
  })

  it('supports a bounded IdP-initiated SAML request path through initiation and login handoff', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-supported-saml-idp-init-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')

    const initiation = LocalIamProtocolRuntimeStore.createSamlIdpInitiatedRedirectSyncOnly(
      IAM_DEFAULT_REALM_ID,
      {
        client_id: 'saml-test-service-provider',
        relay_state: 'idp-init-relay-1',
      },
      'https://console.idp.local',
      'https://idp.local',
    )

    expect(initiation.saml_request_id).toContain('iam-saml-request-')
    expect(initiation.redirect_url).toContain('/iam/login')
    expect(initiation.request.initiation_mode).toBe('IDP_INITIATED')
    expect(initiation.request.request_id).toBeNull()
    expect(initiation.request.acs_url).toBe('https://sp.example.local/acs')

    const login = LocalIamProtocolRuntimeStore.performSamlLogin(
      IAM_DEFAULT_REALM_ID,
      {
        client_id: 'saml-test-service-provider',
        username: 'alex.morgan@northstar.example',
        password: 'StandaloneIAM!TenantAdmin2026',
        saml_request_id: initiation.saml_request_id,
      },
      'https://idp.local',
    )

    const decodedLoginResponse = Buffer.from(login.saml_response, 'base64').toString('utf8')
    expect(login.saml_request_id).toBe(initiation.saml_request_id)
    expect(login.relay_state).toBe('idp-init-relay-1')
    expect(decodedLoginResponse).toContain('Destination="https://sp.example.local/acs"')
    expect(decodedLoginResponse).toContain('InResponseTo="')

    const requestDetail = LocalIamProtocolRuntimeStore.getSamlAuthRequest(
      IAM_DEFAULT_REALM_ID,
      initiation.saml_request_id,
    )
    expect(requestDetail.request.status).toBe('COMPLETED')
  })

  it('rejects unsupported uncorrelated SAML logout requests', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-supported-saml-logout-correlation-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')

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
  })
})
