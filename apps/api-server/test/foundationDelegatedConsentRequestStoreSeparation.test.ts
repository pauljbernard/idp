import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('foundation delegated consent request store separation', () => {
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

  it('migrates legacy combined foundation state into split directory and delegated consent request stores', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-foundation-store-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID, IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const persistence = await import('../src/platform/persistence')

    const now = new Date().toISOString()
    const legacyPath = persistence.getPersistedStatePath('iam-foundation-state.json')
    mkdirSync(path.dirname(legacyPath), { recursive: true })
    writeFileSync(
      legacyPath,
      JSON.stringify({
        version: 1,
        saved_at: now,
        state: {
          delegated_consent_requests: [
            {
              id: 'legacy-delegated-consent-request',
              realm_id: IAM_DEFAULT_REALM_ID,
              relationship_id: 'legacy-relationship',
              principal_user_id: IAM_SUPER_ADMIN_USER_ID,
              delegate_user_id: IAM_SYSTEM_USER_ID,
              requested_by_user_id: IAM_SYSTEM_USER_ID,
              status: 'PENDING',
              requested_scope_names: ['profile.read'],
              requested_purpose_names: ['care.coordination'],
              requested_at: now,
              expires_at: new Date(Date.now() + 60_000).toISOString(),
              responded_at: null,
              decided_by_user_id: null,
              delegated_consent_id: null,
              request_notes: ['legacy request'],
              decision_notes: [],
              synthetic: false,
            },
          ],
        },
      }, null, 2),
      'utf8',
    )

    const { LocalIamFoundationStore } = await import('../src/platform/iamFoundation')

    const directoryPath = persistence.getPersistedStatePath('iam-foundation-directory-state.json')
    const requestsPath = persistence.getPersistedStatePath('iam-foundation-delegated-consent-requests-state.json')

    expect(existsSync(directoryPath)).toBe(true)
    expect(existsSync(requestsPath)).toBe(true)

    const directoryEnvelope = JSON.parse(readFileSync(directoryPath, 'utf8')) as { state: Record<string, unknown> }
    const requestsEnvelope = JSON.parse(readFileSync(requestsPath, 'utf8')) as {
      state: { delegated_consent_requests: Array<{ id: string }> }
    }

    expect(directoryEnvelope.state).not.toHaveProperty('delegated_consent_requests')
    expect(requestsEnvelope.state.delegated_consent_requests.some((record) => record.id === 'legacy-delegated-consent-request')).toBe(true)

    const exported = LocalIamFoundationStore.exportState() as any
    expect(exported.delegated_consent_requests.some((record: any) => record.id === 'legacy-delegated-consent-request')).toBe(true)
  })
})
