import { describe, expect, it, vi } from 'vitest'

const mockApiGet = vi.fn()

vi.mock('../src/services/iamHttpClient', () => ({
  api: {
    get: mockApiGet,
  },
}))

describe('IamApplicationContractClient', () => {
  it('loads a binding manifest and resolves the matching contract request', async () => {
    mockApiGet.mockReset()
    mockApiGet.mockResolvedValueOnce({
      data: {
        generated_at: '2026-04-05T00:00:00.000Z',
        binding_id: 'binding-application-crew-web',
        binding_target_id: 'crew-web',
        binding_target_name: 'Crew Application',
        application_id: 'crew',
        application_name: 'Crew',
        current_contract_version: '2026-04-05',
        informative_authorization_plane: 'INFORMATIVE',
        enforcement_plane: 'ENFORCEMENT',
        enforcement_owner: 'crew',
        contracts: [
          {
            kind: 'principal_context',
            version: '2026-04-05',
            delivery_status: 'PLANNED',
            route_path: '/api/v1/iam/application-bindings/binding-application-crew-web/principal-context',
            auth_mode: 'bearer_or_account_session',
            supported_query_parameters: ['contract_version'],
            tenant_selection: 'none',
            summary: 'Resolves the authenticated principal summary for the application binding.',
          },
          {
            kind: 'tenant_context',
            version: '2026-04-05',
            delivery_status: 'PLANNED',
            route_path: '/api/v1/iam/application-bindings/binding-application-crew-web/tenant-context',
            auth_mode: 'bearer_or_account_session',
            supported_query_parameters: ['tenant_id', 'contract_version'],
            tenant_selection: 'optional',
            summary: 'Resolves selected-tenant context.',
          },
        ],
      },
    })

    const { IamApplicationContractClient } = await import('../src/services/iamApplicationContractClient')

    const resolved = await IamApplicationContractClient.resolveContractRequest({
      bindingId: 'binding-application-crew-web',
      kind: 'tenant_context',
      tenantId: 'tenant-123',
      contractVersion: '2026-04-05',
    })

    expect(mockApiGet).toHaveBeenCalledWith(
      '/iam/application-bindings/binding-application-crew-web/contracts',
      { params: { contract_version: '2026-04-05' } },
    )
    expect(resolved.url).toBe('/api/v1/iam/application-bindings/binding-application-crew-web/tenant-context')
    expect(resolved.params).toEqual({
      tenant_id: 'tenant-123',
      contract_version: '2026-04-05',
    })
    expect(resolved.manifestVersion).toBe('2026-04-05')
  })

  it('fetches a contract payload through the resolved manifest route', async () => {
    mockApiGet.mockReset()
    mockApiGet
      .mockResolvedValueOnce({
        data: {
          generated_at: '2026-04-05T00:00:00.000Z',
          binding_id: 'binding-application-crew-web',
          binding_target_id: 'crew-web',
          binding_target_name: 'Crew Application',
          application_id: 'crew',
          application_name: 'Crew',
          current_contract_version: '2026-04-05',
          informative_authorization_plane: 'INFORMATIVE',
          enforcement_plane: 'ENFORCEMENT',
          enforcement_owner: 'crew',
          contracts: [
            {
              kind: 'identity_access_facts',
              version: '2026-04-05',
              delivery_status: 'PLANNED',
              route_path: '/api/v1/iam/application-bindings/binding-application-crew-web/identity-access-facts',
              auth_mode: 'bearer_or_account_session',
              supported_query_parameters: ['tenant_id', 'contract_version'],
              tenant_selection: 'optional',
              summary: 'Resolves identity access facts.',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          contract: {
            kind: 'identity_access_facts',
            version: '2026-04-05',
          },
          memberships: [],
        },
      })

    const { IamApplicationContractClient } = await import('../src/services/iamApplicationContractClient')

    const payload = await IamApplicationContractClient.fetchContract<{
      contract: { kind: string; version: string }
      memberships: unknown[]
    }>({
      bindingId: 'binding-application-crew-web',
      kind: 'identity_access_facts',
      tenantId: 'tenant-abc',
      contractVersion: '2026-04-05',
    })

    expect(mockApiGet).toHaveBeenNthCalledWith(
      2,
      '/api/v1/iam/application-bindings/binding-application-crew-web/identity-access-facts',
      {
        params: {
          tenant_id: 'tenant-abc',
          contract_version: '2026-04-05',
        },
      },
    )
    expect(payload.contract.kind).toBe('identity_access_facts')
    expect(payload.contract.version).toBe('2026-04-05')
  })
})
