import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('authorization services permission ticket store separation', () => {
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

  it('migrates legacy combined authorization services state into split directory and permission ticket stores', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-authz-services-store-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID } = await import('../src/platform/iamIdentifiers')
    const persistence = await import('../src/platform/persistence')

    const now = new Date().toISOString()
    const legacyPath = persistence.getPersistedStatePath('iam-authorization-services-state.json')
    mkdirSync(path.dirname(legacyPath), { recursive: true })
    writeFileSync(
      legacyPath,
      JSON.stringify({
        version: 1,
        saved_at: now,
        state: {
          resource_servers: [
            {
              id: 'legacy-resource-server',
              realm_id: IAM_DEFAULT_REALM_ID,
              client_id: 'legacy-client',
              client_record_id: 'legacy-client-record',
              name: 'Legacy Resource Server',
              summary: 'Legacy server summary',
              status: 'ACTIVE',
              enforcement_mode: 'ENFORCING',
              decision_strategy: 'AFFIRMATIVE',
              created_at: now,
              updated_at: now,
              created_by_user_id: IAM_SUPER_ADMIN_USER_ID,
              updated_by_user_id: IAM_SUPER_ADMIN_USER_ID,
            },
          ],
          scopes: [],
          resources: [],
          policies: [],
          permissions: [],
          evaluations: [],
          permission_tickets: [
            {
              id: 'legacy-permission-ticket',
              realm_id: IAM_DEFAULT_REALM_ID,
              resource_server_id: 'legacy-resource-server',
              resource_server_client_id: 'legacy-client',
              requester_client_id: null,
              subject_kind: 'USER',
              subject_id: IAM_SUPER_ADMIN_USER_ID,
              resource_id: 'legacy-resource',
              requested_scope_names: ['view'],
              granted_scope_names: ['view'],
              status: 'GRANTED',
              reason: 'legacy ticket',
              created_at: now,
              expires_at: new Date(Date.now() + 60_000).toISOString(),
              exchanged_at: null,
              evaluation_id: null,
              rpt_token_id: null,
            },
          ],
        },
      }, null, 2),
      'utf8',
    )

    const { LocalIamAuthorizationServicesStore } = await import('../src/platform/iamAuthorizationServices')

    const directoryPath = persistence.getPersistedStatePath('iam-authorization-services-directory-state.json')
    const ticketsPath = persistence.getPersistedStatePath('iam-authorization-services-permission-tickets-state.json')

    expect(existsSync(directoryPath)).toBe(true)
    expect(existsSync(ticketsPath)).toBe(true)

    const directoryEnvelope = JSON.parse(readFileSync(directoryPath, 'utf8')) as { state: Record<string, unknown> }
    const ticketsEnvelope = JSON.parse(readFileSync(ticketsPath, 'utf8')) as {
      state: { permission_tickets: Array<{ id: string }> }
    }

    expect(directoryEnvelope.state.resource_servers).toHaveLength(1)
    expect(directoryEnvelope.state).not.toHaveProperty('permission_tickets')
    expect(ticketsEnvelope.state.permission_tickets.some((record) => record.id === 'legacy-permission-ticket')).toBe(true)

    const exported = LocalIamAuthorizationServicesStore.exportState() as any
    expect(exported.resource_servers.some((record: any) => record.id === 'legacy-resource-server')).toBe(true)
    expect(exported.permission_tickets.some((record: any) => record.id === 'legacy-permission-ticket')).toBe(true)
  })
})
