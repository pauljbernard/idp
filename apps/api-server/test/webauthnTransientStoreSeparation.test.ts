import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('webauthn transient store separation', () => {
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

  it('migrates legacy combined webauthn state into split credential and transient stores', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-webauthn-store-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID } = await import('../src/platform/iamIdentifiers')
    const persistence = await import('../src/platform/persistence')

    const now = new Date().toISOString()
    const legacyPath = persistence.getPersistedStatePath('iam-webauthn-state.json')
    mkdirSync(path.dirname(legacyPath), { recursive: true })
    writeFileSync(
      legacyPath,
      JSON.stringify({
        version: 1,
        saved_at: now,
        state: {
          credentials: [
            {
              id: 'legacy-credential',
              realm_id: IAM_DEFAULT_REALM_ID,
              user_id: IAM_SUPER_ADMIN_USER_ID,
              credential_id: 'credential-id',
              device_label: 'Legacy Passkey',
              public_key_jwk: { kty: 'EC', crv: 'P-256', x: 'abc', y: 'def' },
              algorithm: 'ES256',
              transports: ['INTERNAL'],
              created_at: now,
              last_used_at: null,
              disabled_at: null,
              sign_count: 0,
              synthetic: true,
            },
          ],
          registration_challenges: [
            {
              id: 'legacy-registration-challenge',
              realm_id: IAM_DEFAULT_REALM_ID,
              user_id: IAM_SUPER_ADMIN_USER_ID,
              challenge: 'register-challenge',
              created_at: now,
              expires_at: new Date(Date.now() + 60_000).toISOString(),
              consumed_at: null,
            },
          ],
          authentication_challenges: [
            {
              id: 'legacy-authentication-challenge',
              realm_id: IAM_DEFAULT_REALM_ID,
              user_id: IAM_SUPER_ADMIN_USER_ID,
              username_or_email: 'admin@idp.local',
              client_id: null,
              requested_scope_names: ['openid'],
              challenge: 'authenticate-challenge',
              allowed_credential_ids: ['credential-id'],
              created_at: now,
              expires_at: new Date(Date.now() + 60_000).toISOString(),
              consumed_at: null,
            },
          ],
        },
      }, null, 2),
      'utf8',
    )

    const { LocalIamWebAuthnStore } = await import('../src/platform/iamWebAuthn')

    const credentialsPath = persistence.getPersistedStatePath('iam-webauthn-credentials-state.json')
    const transientPath = persistence.getPersistedStatePath('iam-webauthn-transient-state.json')

    expect(existsSync(credentialsPath)).toBe(true)
    expect(existsSync(transientPath)).toBe(true)

    const credentialsEnvelope = JSON.parse(readFileSync(credentialsPath, 'utf8')) as { state: { credentials: unknown[] } }
    const transientEnvelope = JSON.parse(readFileSync(transientPath, 'utf8')) as {
      state: { registration_challenges: unknown[]; authentication_challenges: unknown[] }
    }

    expect(credentialsEnvelope.state.credentials).toHaveLength(1)
    expect(transientEnvelope.state.registration_challenges).toHaveLength(1)
    expect(transientEnvelope.state.authentication_challenges).toHaveLength(1)

    const exported = LocalIamWebAuthnStore.exportState() as any
    expect(exported.credentials).toHaveLength(1)
    expect(exported.registration_challenges).toHaveLength(1)
    expect(exported.authentication_challenges).toHaveLength(1)
  })
})
