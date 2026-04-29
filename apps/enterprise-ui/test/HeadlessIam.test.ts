import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HeadlessIam } from '../src/pages/HeadlessIam'

const mocks = vi.hoisted(() => ({
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockGetIamSummary: vi.fn(),
  mockListIamRealms: vi.fn(),
  mockListIamRealmTemplates: vi.fn(),
  mockListIamRealmBindings: vi.fn(),
  mockListIamUsers: vi.fn(),
  mockListIamGroups: vi.fn(),
  mockListIamRoles: vi.fn(),
  mockListIamDelegatedAdmins: vi.fn(),
  mockListIamRealmExports: vi.fn(),
  mockListIamClients: vi.fn(),
  mockListIamClientScopes: vi.fn(),
  mockListIamProtocolMappers: vi.fn(),
  mockListIamAuthFlows: vi.fn(),
  mockListIamAuthExecutions: vi.fn(),
  mockListIamAuthFlowBindings: vi.fn(),
  mockListIamAdminPermissions: vi.fn(),
  mockListIamAdminPolicies: vi.fn(),
  mockListIamAdminEvaluations: vi.fn(),
  mockListIamResourceServers: vi.fn(),
  mockListIamProtectedScopes: vi.fn(),
  mockListIamProtectedResources: vi.fn(),
  mockListIamAuthorizationPolicies: vi.fn(),
  mockListIamAuthorizationPermissions: vi.fn(),
  mockListIamProviderInterfaces: vi.fn(),
  mockListIamExtensions: vi.fn(),
  mockListIamExtensionProviders: vi.fn(),
  mockListIamExtensionBindings: vi.fn(),
  mockListIamIdentityProviders: vi.fn(),
  mockListIamUserFederationProviders: vi.fn(),
  mockListIamFederationSyncJobs: vi.fn(),
  mockListIamOrganizations: vi.fn(),
  mockListIamOrganizationMemberships: vi.fn(),
  mockListIamOrganizationInvitations: vi.fn(),
  mockExportIamRealm: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({
  toast: {
    error: mocks.mockToastError,
    success: mocks.mockToastSuccess,
  },
}))

vi.mock('../src/services/standaloneApi', () => ({
  idpApi: {
    getIamSummary: mocks.mockGetIamSummary,
    listIamRealms: mocks.mockListIamRealms,
    listIamRealmTemplates: mocks.mockListIamRealmTemplates,
    listIamRealmBindings: mocks.mockListIamRealmBindings,
    listIamUsers: mocks.mockListIamUsers,
    listIamGroups: mocks.mockListIamGroups,
    listIamRoles: mocks.mockListIamRoles,
    listIamDelegatedAdmins: mocks.mockListIamDelegatedAdmins,
    listIamRealmExports: mocks.mockListIamRealmExports,
    listIamClients: mocks.mockListIamClients,
    listIamClientScopes: mocks.mockListIamClientScopes,
    listIamProtocolMappers: mocks.mockListIamProtocolMappers,
    listIamAuthFlows: mocks.mockListIamAuthFlows,
    listIamAuthExecutions: mocks.mockListIamAuthExecutions,
    listIamAuthFlowBindings: mocks.mockListIamAuthFlowBindings,
    listIamAdminPermissions: mocks.mockListIamAdminPermissions,
    listIamAdminPolicies: mocks.mockListIamAdminPolicies,
    listIamAdminEvaluations: mocks.mockListIamAdminEvaluations,
    listIamResourceServers: mocks.mockListIamResourceServers,
    listIamProtectedScopes: mocks.mockListIamProtectedScopes,
    listIamProtectedResources: mocks.mockListIamProtectedResources,
    listIamAuthorizationPolicies: mocks.mockListIamAuthorizationPolicies,
    listIamAuthorizationPermissions: mocks.mockListIamAuthorizationPermissions,
    listIamProviderInterfaces: mocks.mockListIamProviderInterfaces,
    listIamExtensions: mocks.mockListIamExtensions,
    listIamExtensionProviders: mocks.mockListIamExtensionProviders,
    listIamExtensionBindings: mocks.mockListIamExtensionBindings,
    listIamIdentityProviders: mocks.mockListIamIdentityProviders,
    listIamUserFederationProviders: mocks.mockListIamUserFederationProviders,
    listIamFederationSyncJobs: mocks.mockListIamFederationSyncJobs,
    listIamOrganizations: mocks.mockListIamOrganizations,
    listIamOrganizationMemberships: mocks.mockListIamOrganizationMemberships,
    listIamOrganizationInvitations: mocks.mockListIamOrganizationInvitations,
    exportIamRealm: mocks.mockExportIamRealm,
  },
}))

function configureSuccessfulLoad() {
  mocks.mockGetIamSummary.mockResolvedValue({
    generated_at: '2026-04-27T00:00:00.000Z',
  })
  mocks.mockListIamRealms.mockResolvedValue({
    realms: [
      {
        id: 'realm-idp-default',
        name: 'Default Realm',
        summary: 'Primary validation realm',
        scope_kind: 'PLATFORM',
        status: 'ACTIVE',
        supported_protocols: ['OIDC', 'SAML'],
      },
    ],
  })
  mocks.mockListIamRealmTemplates.mockResolvedValue({ realm_templates: [] })
  mocks.mockListIamRealmBindings.mockResolvedValue({ realm_bindings: [] })
  mocks.mockListIamUsers.mockResolvedValue({ users: [] })
  mocks.mockListIamGroups.mockResolvedValue({ groups: [] })
  mocks.mockListIamRoles.mockResolvedValue({ roles: [] })
  mocks.mockListIamDelegatedAdmins.mockResolvedValue({ delegated_admins: [] })
  mocks.mockListIamRealmExports.mockResolvedValue({
    realm_exports: [
      {
        id: 'export-1',
        realm_id: 'realm-idp-default',
        realm_name: 'Default Realm',
        status: 'COMPLETED',
        exported_at: '2026-04-27T00:00:00.000Z',
        object_key: 'exports/realm-idp-default/export-1.json',
        summary: {
          user_count: 1,
          group_count: 0,
          role_count: 2,
        },
      },
    ],
  })
  mocks.mockListIamClients.mockResolvedValue({ clients: [] })
  mocks.mockListIamClientScopes.mockResolvedValue({ client_scopes: [] })
  mocks.mockListIamProtocolMappers.mockResolvedValue({ protocol_mappers: [] })
  mocks.mockListIamAuthFlows.mockResolvedValue({ flows: [] })
  mocks.mockListIamAuthExecutions.mockResolvedValue({ executions: [] })
  mocks.mockListIamAuthFlowBindings.mockResolvedValue({ realm_bindings: [], client_bindings: [] })
  mocks.mockListIamAdminPermissions.mockResolvedValue({ permissions: [] })
  mocks.mockListIamAdminPolicies.mockResolvedValue({ policies: [] })
  mocks.mockListIamAdminEvaluations.mockResolvedValue({ evaluations: [] })
  mocks.mockListIamResourceServers.mockResolvedValue({ resource_servers: [] })
  mocks.mockListIamProtectedScopes.mockResolvedValue({ scopes: [] })
  mocks.mockListIamProtectedResources.mockResolvedValue({ resources: [] })
  mocks.mockListIamAuthorizationPolicies.mockResolvedValue({ policies: [] })
  mocks.mockListIamAuthorizationPermissions.mockResolvedValue({ permissions: [] })
  mocks.mockListIamProviderInterfaces.mockResolvedValue({ interfaces: [] })
  mocks.mockListIamExtensions.mockResolvedValue({ extensions: [] })
  mocks.mockListIamExtensionProviders.mockResolvedValue({ providers: [] })
  mocks.mockListIamExtensionBindings.mockResolvedValue({ bindings: [] })
  mocks.mockListIamIdentityProviders.mockResolvedValue({ identity_providers: [] })
  mocks.mockListIamUserFederationProviders.mockResolvedValue({ user_federation_providers: [] })
  mocks.mockListIamFederationSyncJobs.mockResolvedValue({ sync_jobs: [] })
  mocks.mockListIamOrganizations.mockResolvedValue({
    organizations: [
      {
        id: 'org-1',
        realm_id: 'realm-idp-default',
        name: 'Northwind Guild',
        summary: 'Primary partner organization',
        kind: 'ENTERPRISE',
        status: 'ACTIVE',
        domain_hint: 'northwind.example',
        updated_at: '2026-04-27T00:00:00.000Z',
      },
    ],
  })
  mocks.mockListIamOrganizationMemberships.mockResolvedValue({
    memberships: [
      {
        id: 'membership-1',
        organization_id: 'org-1',
        organization_name: 'Northwind Guild',
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
        created_at: '2026-04-27T00:00:00.000Z',
      },
    ],
  })
  mocks.mockListIamIdentityProviders.mockResolvedValue({
    identity_providers: [
      {
        id: 'idp-1',
        realm_id: 'realm-idp-default',
        name: 'Acme SSO',
        alias: 'acme-sso',
        protocol: 'OIDC',
        status: 'ACTIVE',
        login_mode: 'OPTIONAL',
        updated_at: '2026-04-27T00:00:00.000Z',
      },
    ],
  })
  mocks.mockListIamUserFederationProviders.mockResolvedValue({
    user_federation_providers: [
      {
        id: 'ufp-1',
        realm_id: 'realm-idp-default',
        name: 'HR Directory',
        connection_label: 'ldap://hr.example',
        kind: 'LDAP',
        status: 'ACTIVE',
        import_strategy: 'LINK_ON_LOGIN',
        updated_at: '2026-04-27T00:00:00.000Z',
      },
    ],
  })
  mocks.mockListIamFederationSyncJobs.mockResolvedValue({
    sync_jobs: [
      {
        id: 'sync-1',
        realm_id: 'realm-idp-default',
        provider_name: 'HR Directory',
        provider_id: 'ufp-1',
        status: 'COMPLETED',
        started_at: '2026-04-27T00:00:00.000Z',
        imported_count: 4,
        linked_count: 2,
        updated_count: 1,
      },
    ],
  })
}

describe('HeadlessIam', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configureSuccessfulLoad()
  })

  it('loads the admin workspace and shows the scoped realm export surface', async () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/iam?tab=realms&entity=exports&mode=list'] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: '/iam',
            element: React.createElement(HeadlessIam),
          }),
        ),
      ),
    )

    expect(await screen.findByText('Global Realm Context')).toBeInTheDocument()
    expect(screen.getAllByText('Default Realm').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Realm Exports').length).toBeGreaterThan(0)
    expect(screen.getByText('1 users · 0 groups · 2 roles')).toBeInTheDocument()
    expect(mocks.mockListIamOrganizations).toHaveBeenCalledWith({ realmId: undefined })
  })

  it('exports the selected realm from the exports view', async () => {
    mocks.mockExportIamRealm.mockResolvedValue(undefined)

    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/iam?tab=realms&entity=exports&mode=list'] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: '/iam',
            element: React.createElement(HeadlessIam),
          }),
        ),
      ),
    )

    expect(await screen.findByRole('button', { name: 'Export Selected Realm' })).toBeInTheDocument()

    await userEvent.click(screen.getAllByRole('button', { name: 'Export Selected Realm' })[0])

    await waitFor(() => {
      expect(mocks.mockExportIamRealm).toHaveBeenCalledWith('realm-idp-default')
    })
    expect(mocks.mockToastSuccess).toHaveBeenCalledWith('Realm export created')
  })

  it('renders organization registry entities and switches between membership and invitation views', async () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/iam?tab=organizations&entity=memberships&mode=list'] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: '/iam',
            element: React.createElement(HeadlessIam),
          }),
        ),
      ),
    )

    expect(await screen.findByText('Organization Registry')).toBeInTheDocument()
    expect(screen.getAllByText('Northwind Guild').length).toBeGreaterThan(0)
    expect(screen.getByPlaceholderText('Search memberships')).toBeInTheDocument()

    const entitySelect = screen.getAllByRole('combobox').find((element) =>
      Boolean(element.querySelector('option[value="invitations"]')),
    )
    expect(entitySelect).toBeDefined()
    await userEvent.selectOptions(entitySelect, 'invitations')

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search invitations')).toBeInTheDocument()
    })
  })

  it('renders federation registry entities across providers and sync jobs', async () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/iam?tab=federation&entity=user-federation&mode=list'] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: '/iam',
            element: React.createElement(HeadlessIam),
          }),
        ),
      ),
    )

    expect(await screen.findByText('Federation Registry')).toBeInTheDocument()
    expect(screen.getByText('HR Directory')).toBeInTheDocument()
    expect(screen.getByText('ldap://hr.example')).toBeInTheDocument()

    const entitySelect = screen.getAllByRole('combobox').find((element) =>
      Boolean(element.querySelector('option[value="sync-jobs"]')),
    )
    expect(entitySelect).toBeDefined()
    await userEvent.selectOptions(entitySelect, 'sync-jobs')

    await waitFor(() => {
      expect(screen.getByText('4 / 2 / 1')).toBeInTheDocument()
    })
    expect(screen.getByText('COMPLETED')).toBeInTheDocument()
  })
})
