import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IamOrganizationsPanel } from '../src/components/iam/IamOrganizationsPanel'

const mocks = vi.hoisted(() => ({
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockListIamUserProfileSchemas: vi.fn(),
  mockListIamOrganizations: vi.fn(),
  mockListIamOrganizationMemberships: vi.fn(),
  mockListIamOrganizationInvitations: vi.fn(),
  mockListIamUsers: vi.fn(),
  mockListIamIdentityProviders: vi.fn(),
  mockCreateIamOrganizationInvitation: vi.fn(),
  mockRevokeIamOrganizationInvitation: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({
  toast: {
    error: mocks.mockToastError,
    success: mocks.mockToastSuccess,
  },
}))

vi.mock('../src/services/standaloneApi', () => ({
  idpApi: {
    listIamUserProfileSchemas: mocks.mockListIamUserProfileSchemas,
    listIamOrganizations: mocks.mockListIamOrganizations,
    listIamOrganizationMemberships: mocks.mockListIamOrganizationMemberships,
    listIamOrganizationInvitations: mocks.mockListIamOrganizationInvitations,
    listIamUsers: mocks.mockListIamUsers,
    listIamIdentityProviders: mocks.mockListIamIdentityProviders,
    createIamOrganizationInvitation: mocks.mockCreateIamOrganizationInvitation,
    revokeIamOrganizationInvitation: mocks.mockRevokeIamOrganizationInvitation,
  },
}))

function configureLoad() {
  mocks.mockListIamUserProfileSchemas.mockResolvedValue({
    schemas: [
      {
        id: 'schema-1',
        display_name: 'Organization Profile',
        summary: 'Schema summary',
        status: 'ACTIVE',
        attributes: [
          {
            id: 'attr-1',
            key: 'department',
            label: 'Department',
            type: 'STRING',
            required: false,
            multivalued: false,
            allowed_values: [],
            regex_pattern: null,
            placeholder: null,
            help_text: null,
            view_scopes: ['SELF', 'ADMIN'],
            edit_scopes: ['SELF', 'ADMIN'],
            order_index: 10,
          },
        ],
      },
    ],
  })
  mocks.mockListIamOrganizations.mockResolvedValue({
    organizations: [
      {
        id: 'org-1',
        name: 'Northwind Guild',
        summary: 'Primary partner org',
        kind: 'COMPANY',
        status: 'ACTIVE',
        domain_hint: 'northwind.example',
        linked_identity_provider_aliases: ['acme-sso'],
      },
    ],
  })
  mocks.mockListIamOrganizationMemberships.mockResolvedValue({
    memberships: [
      {
        id: 'membership-1',
        organization_id: 'org-1',
        organization_name: 'Northwind Guild',
        user_id: 'user-1',
        username: 'admin',
        email: 'admin@northwind.example',
        role: 'OWNER',
        status: 'ACTIVE',
      },
    ],
  })
  mocks.mockListIamOrganizationInvitations.mockResolvedValue({
    invitations: [
      {
        id: 'invite-1',
        organization_id: 'org-1',
        organization_name: 'Northwind Guild',
        email: 'invitee@northwind.example',
        role: 'MEMBER',
        status: 'PENDING',
        linked_identity_provider_aliases: ['acme-sso'],
      },
    ],
  })
  mocks.mockListIamUsers.mockResolvedValue({
    users: [
      {
        id: 'user-1',
        username: 'admin',
        email: 'admin@northwind.example',
      },
    ],
  })
  mocks.mockListIamIdentityProviders.mockResolvedValue({
    identity_providers: [
      {
        id: 'broker-1',
        alias: 'acme-sso',
      },
    ],
  })
}

describe('IamOrganizationsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configureLoad()
    mocks.mockRevokeIamOrganizationInvitation.mockResolvedValue(undefined)
  })

  it('loads organizations data and revokes a pending invitation', async () => {
    render(React.createElement(IamOrganizationsPanel, {
      selectedRealmId: 'realm-idp-default',
      canManage: true,
      selectedOrganizationId: '',
      onSelectedOrganizationChange: vi.fn(),
    }))

    expect(await screen.findByText('Profile Schema')).toBeInTheDocument()
    expect(screen.getAllByText('Northwind Guild').length).toBeGreaterThan(0)
    expect(screen.getByText('invitee@northwind.example')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Revoke invitation' }))

    await waitFor(() => {
      expect(mocks.mockRevokeIamOrganizationInvitation).toHaveBeenCalledWith('invite-1')
    })
    expect(mocks.mockToastSuccess).toHaveBeenCalledWith('IAM organization invitation revoked')
  })
})
