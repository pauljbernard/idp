import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('protocol runtime store separation', () => {
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

  it('migrates legacy combined protocol state into split directory and transient stores', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-protocol-store-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const persistence = await import('../src/platform/persistence')

    const now = new Date().toISOString()
    const future = new Date(Date.now() + 60_000).toISOString()
    const legacyPath = persistence.getPersistedStatePath('iam-protocol-runtime-state.json')
    mkdirSync(path.dirname(legacyPath), { recursive: true })
    writeFileSync(
      legacyPath,
      JSON.stringify({
        version: 1,
        saved_at: now,
        state: {
          clients: [
            {
              id: 'legacy-client-record',
              realm_id: IAM_DEFAULT_REALM_ID,
              client_id: 'legacy-client',
              name: 'Legacy Client',
              summary: 'Legacy protocol client',
              protocol: 'OIDC',
              access_type: 'PUBLIC',
              status: 'ACTIVE',
              synthetic: false,
              redirect_uris: ['https://example.com/callback'],
              base_url: null,
              root_url: null,
              default_scope_ids: [],
              optional_scope_ids: [],
              direct_protocol_mapper_ids: [],
              standard_flow_enabled: true,
              direct_access_grants_enabled: false,
              service_account_enabled: false,
              secret_hash: null,
              secret_preview: null,
              created_at: now,
              updated_at: now,
              created_by_user_id: IAM_SYSTEM_USER_ID,
              updated_by_user_id: IAM_SYSTEM_USER_ID,
            },
          ],
          client_scopes: [],
          protocol_mappers: [],
          service_accounts: [
            {
              id: 'legacy-service-account',
              realm_id: IAM_DEFAULT_REALM_ID,
              client_id: 'legacy-client-record',
              username: 'service-account-legacy-client',
              role_ids: [],
              status: 'ACTIVE',
              synthetic: false,
              created_at: now,
              updated_at: now,
            },
          ],
          user_credentials: [
            {
              user_id: IAM_SYSTEM_USER_ID,
              realm_id: IAM_DEFAULT_REALM_ID,
              password_hash: 'hash',
              synthetic: false,
              updated_at: now,
            },
          ],
          signing_keys: [
            {
              id: 'legacy-signing-key',
              realm_id: null,
              key_id: 'legacy-key-id',
              algorithm: 'RS256',
              private_key_reference_id: null,
              public_key_pem: '-----BEGIN PUBLIC KEY-----\\nlegacy\\n-----END PUBLIC KEY-----',
              created_at: now,
              status: 'ACTIVE',
            },
          ],
          issued_tokens: [
            {
              id: 'legacy-issued-token',
              realm_id: IAM_DEFAULT_REALM_ID,
              client_id: 'legacy-client-record',
              subject_kind: 'USER',
              subject_id: IAM_SYSTEM_USER_ID,
              browser_session_id: null,
              grant_type: 'authorization_code',
              scope: 'openid',
              scope_ids: [],
              issued_at: now,
              expires_at: future,
              refresh_expires_at: null,
              status: 'ACTIVE',
              revoked_at: null,
              requested_purpose: null,
              access_token_hash: 'legacy-access-token-hash',
              refresh_token_hash: null,
              claims: {},
              id_token_claims: {},
              userinfo_claims: {},
              client_scope_names: [],
            },
          ],
          saml_auth_requests: [
            {
              id: 'legacy-saml-auth-request',
              realm_id: IAM_DEFAULT_REALM_ID,
              client_id: 'legacy-client-record',
              client_name: 'Legacy Client',
              acs_url: 'https://example.com/saml/acs',
              relay_state: null,
              request_binding: 'POST',
              request_id: 'legacy-request-id',
              request_xml: '<AuthnRequest/>',
              force_authn: false,
              created_at: now,
              expires_at: future,
              completed_at: null,
              cancelled_at: null,
              status: 'PENDING',
            },
          ],
          saml_sessions: [
            {
              id: 'legacy-saml-session',
              realm_id: IAM_DEFAULT_REALM_ID,
              client_id: 'legacy-client-record',
              user_id: IAM_SYSTEM_USER_ID,
              browser_session_id: 'legacy-browser-session',
              session_index: 'legacy-session-index',
              relay_state: null,
              acs_url: 'https://example.com/saml/acs',
              created_at: now,
              last_seen_at: now,
              terminated_at: null,
              status: 'ACTIVE',
            },
          ],
        },
      }, null, 2),
      'utf8',
    )

    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')

    const directoryPath = persistence.getPersistedStatePath('iam-protocol-directory-state.json')
    const transientPath = persistence.getPersistedStatePath('iam-protocol-transient-state.json')

    expect(existsSync(directoryPath)).toBe(true)
    expect(existsSync(transientPath)).toBe(true)

    const directoryEnvelope = JSON.parse(readFileSync(directoryPath, 'utf8')) as { state: Record<string, unknown> }
    const transientEnvelope = JSON.parse(readFileSync(transientPath, 'utf8')) as { state: Record<string, unknown> }

    expect(directoryEnvelope.state.clients).toHaveLength(1)
    expect(directoryEnvelope.state.service_accounts).toHaveLength(1)
    expect(directoryEnvelope.state.user_credentials).toHaveLength(1)
    expect(directoryEnvelope.state.signing_keys).toHaveLength(1)
    expect(directoryEnvelope.state).not.toHaveProperty('issued_tokens')

    expect(transientEnvelope.state.issued_tokens).toHaveLength(1)
    expect(transientEnvelope.state.saml_auth_requests).toHaveLength(1)
    expect(transientEnvelope.state.saml_sessions).toHaveLength(1)
    expect(transientEnvelope.state).not.toHaveProperty('clients')

    const exported = LocalIamProtocolRuntimeStore.exportState() as any
    expect(exported.clients.some((record: any) => record.client_id === 'legacy-client')).toBe(true)
    expect(exported.issued_tokens.some((record: any) => record.id === 'legacy-issued-token')).toBe(true)
    expect(exported.saml_sessions.some((record: any) => record.id === 'legacy-saml-session')).toBe(true)
  }, 20000)

  it('resolves async token read paths under runtime flags', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-protocol-runtime-flags-read-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'
    process.env.IDP_DDB_RUNTIME_DUAL_WRITE = 'true'

    const {
      IAM_DEFAULT_REALM_ID,
      IAM_SUPER_ADMIN_USER_ID,
    } = await import('../src/platform/iamIdentifiers')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')

    const tokens = await LocalIamProtocolRuntimeStore.issueSubjectTokensAsync({
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'admin-console-demo',
      subject_kind: 'USER',
      subject_id: IAM_SUPER_ADMIN_USER_ID,
      requested_scope_names: ['openid', 'profile', 'email'],
      base_url: 'https://idp.local',
      grant_type: 'authorization_code',
      include_refresh_token: true,
    })

    const resolved = await LocalIamProtocolRuntimeStore.resolveBearerAccessTokenAsync(tokens.access_token)
    const introspection = await LocalIamProtocolRuntimeStore.introspectTokenAsync(
      IAM_DEFAULT_REALM_ID,
      {
        token: tokens.access_token,
        client_id: 'admin-console-demo',
      },
      null,
    )
    const userinfo = await LocalIamProtocolRuntimeStore.getUserInfoAsync(
      IAM_DEFAULT_REALM_ID,
      tokens.access_token,
    )

    expect(resolved.realm_id).toBe(IAM_DEFAULT_REALM_ID)
    expect(resolved.subject_id).toBe(IAM_SUPER_ADMIN_USER_ID)
    expect(resolved.scope_names).toContain('openid')
    expect(introspection.active).toBe(true)
    expect(introspection.realm_id).toBe(IAM_DEFAULT_REALM_ID)
    expect(userinfo.sub).toBeTruthy()
  }, 20000)

  it('does not rebuild realm seeds on repeated client reads when foundation state is unchanged', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-protocol-seed-cache-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { LocalIamFoundationStore } = await import('../src/platform/iamFoundation')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')

    const listRealmsSpy = vi.spyOn(LocalIamFoundationStore, 'listRealms')
    const listRolesSpy = vi.spyOn(LocalIamFoundationStore, 'listRoles')
    const listUsersSpy = vi.spyOn(LocalIamFoundationStore, 'listUsers')

    LocalIamFoundationStore.updateUser('idp-super-admin', 'iam-user-crew-admin', {
      first_name: 'Crew Warm',
    })
    LocalIamProtocolRuntimeStore.getClientByIdentifier('realm-crew-validation', 'crew-web-demo')

    const listRealmsAfterFirstRead = listRealmsSpy.mock.calls.length
    const listRolesAfterFirstRead = listRolesSpy.mock.calls.length
    const listUsersAfterFirstRead = listUsersSpy.mock.calls.length

    expect(listRealmsAfterFirstRead).toBeGreaterThan(0)
    expect(listRolesAfterFirstRead).toBeGreaterThan(0)
    expect(listUsersAfterFirstRead).toBeGreaterThan(0)

    LocalIamProtocolRuntimeStore.getClientByIdentifier('realm-crew-validation', 'crew-web-demo')

    expect(listRealmsSpy.mock.calls.length).toBe(listRealmsAfterFirstRead)
    expect(listRolesSpy.mock.calls.length).toBe(listRolesAfterFirstRead)
    expect(listUsersSpy.mock.calls.length).toBe(listUsersAfterFirstRead)

    LocalIamFoundationStore.updateUser('idp-super-admin', 'iam-user-crew-admin', {
      first_name: 'Crew Hot',
    })

    LocalIamProtocolRuntimeStore.getClientByIdentifier('realm-crew-validation', 'crew-web-demo')

    expect(listRealmsSpy.mock.calls.length).toBeGreaterThan(listRealmsAfterFirstRead)
    expect(listRolesSpy.mock.calls.length).toBeGreaterThan(listRolesAfterFirstRead)
    expect(listUsersSpy.mock.calls.length).toBeGreaterThan(listUsersAfterFirstRead)
  }, 20000)
})
