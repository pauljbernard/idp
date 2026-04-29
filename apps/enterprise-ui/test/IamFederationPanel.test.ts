import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IamFederationPanel } from '../src/components/iam/IamFederationPanel'

const mocks = vi.hoisted(() => ({
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockListIamIdentityProviders: vi.fn(),
  mockListIamUserFederationProviders: vi.fn(),
  mockListIamLinkedIdentities: vi.fn(),
  mockListIamFederationSyncJobs: vi.fn(),
  mockListIamFederationEvents: vi.fn(),
  mockListIamRoles: vi.fn(),
  mockListIamGroups: vi.fn(),
  mockSyncIamUserFederationProvider: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({
  toast: {
    error: mocks.mockToastError,
    success: mocks.mockToastSuccess,
  },
}))

vi.mock('../src/services/standaloneApi', () => ({
  idpApi: {
    listIamIdentityProviders: mocks.mockListIamIdentityProviders,
    listIamUserFederationProviders: mocks.mockListIamUserFederationProviders,
    listIamLinkedIdentities: mocks.mockListIamLinkedIdentities,
    listIamFederationSyncJobs: mocks.mockListIamFederationSyncJobs,
    listIamFederationEvents: mocks.mockListIamFederationEvents,
    listIamRoles: mocks.mockListIamRoles,
    listIamGroups: mocks.mockListIamGroups,
    syncIamUserFederationProvider: mocks.mockSyncIamUserFederationProvider,
  },
}))

function configureLoad() {
  mocks.mockListIamIdentityProviders.mockResolvedValue({
    identity_providers: [
      {
        id: 'broker-1',
        alias: 'acme-sso',
        name: 'Acme SSO',
        summary: 'Primary broker',
        protocol: 'OIDC',
        status: 'ACTIVE',
        login_mode: 'OPTIONAL',
        link_policy: 'AUTO_CREATE',
        issuer_url: 'https://issuer.example.test',
        allowed_scopes: ['openid', 'profile'],
        default_role_ids: [],
        default_group_ids: [],
        external_identities: [{ id: 'ext-1' }],
      },
    ],
  })
  mocks.mockListIamUserFederationProviders.mockResolvedValue({
    user_federation_providers: [
      {
        id: 'provider-1',
        name: 'HR Directory',
        summary: 'LDAP source',
        kind: 'LDAP',
        status: 'ACTIVE',
        import_strategy: 'IMPORT',
        connection_label: 'ldap://hr.example',
        default_role_ids: [],
        default_group_ids: [],
        external_identities: [{ id: 'ext-1' }, { id: 'ext-2' }],
      },
    ],
  })
  mocks.mockListIamLinkedIdentities.mockResolvedValue({
    linked_identities: [
      {
        id: 'linked-1',
        external_username: 'jane',
        external_email: 'jane@example.test',
        source_type: 'BROKER',
        provider_name: 'Acme SSO',
        linked_at: '2026-04-27T00:00:00.000Z',
      },
    ],
  })
  mocks.mockListIamFederationSyncJobs.mockResolvedValue({
    sync_jobs: [
      {
        id: 'job-1',
        provider_name: 'HR Directory',
        status: 'COMPLETED',
        imported_count: 4,
        linked_count: 2,
        updated_count: 1,
      },
    ],
  })
  mocks.mockListIamFederationEvents.mockResolvedValue({
    events: [{ id: 'event-1', kind: 'BROKER_LOGIN', summary: 'User logged in' }],
  })
  mocks.mockListIamRoles.mockResolvedValue({ roles: [] })
  mocks.mockListIamGroups.mockResolvedValue({ groups: [] })
}

describe('IamFederationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configureLoad()
    mocks.mockSyncIamUserFederationProvider.mockResolvedValue({ imported_count: 4 })
  })

  it('loads federation data and runs a provider sync', async () => {
    render(React.createElement(IamFederationPanel, {
      selectedRealmId: 'realm-idp-default',
      canManage: true,
    }))

    expect(await screen.findByText('Federation and Brokering')).toBeInTheDocument()
    expect(screen.getAllByText('HR Directory').length).toBeGreaterThan(0)

    await userEvent.click(screen.getByRole('button', { name: 'Run Sync' }))

    await waitFor(() => {
      expect(mocks.mockSyncIamUserFederationProvider).toHaveBeenCalledWith('provider-1')
    })
    expect(mocks.mockToastSuccess).toHaveBeenCalledWith('Federation sync completed: 4 imported')
  })
})
