import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IamAuthorizationServicesPanel } from '../src/components/iam/IamAuthorizationServicesPanel'

const mocks = vi.hoisted(() => ({
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockListIamClients: vi.fn(),
  mockListIamResourceServers: vi.fn(),
  mockListIamProtectedScopes: vi.fn(),
  mockListIamProtectedResources: vi.fn(),
  mockListIamAuthorizationPolicies: vi.fn(),
  mockListIamAuthorizationPermissions: vi.fn(),
  mockListIamAuthorizationEvaluations: vi.fn(),
  mockListIamPermissionTickets: vi.fn(),
  mockCreateIamResourceServer: vi.fn(),
  mockEvaluateIamAuthorization: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({
  toast: {
    error: mocks.mockToastError,
    success: mocks.mockToastSuccess,
  },
}))

vi.mock('../src/services/standaloneApi', () => ({
  idpApi: {
    listIamClients: mocks.mockListIamClients,
    listIamResourceServers: mocks.mockListIamResourceServers,
    listIamProtectedScopes: mocks.mockListIamProtectedScopes,
    listIamProtectedResources: mocks.mockListIamProtectedResources,
    listIamAuthorizationPolicies: mocks.mockListIamAuthorizationPolicies,
    listIamAuthorizationPermissions: mocks.mockListIamAuthorizationPermissions,
    listIamAuthorizationEvaluations: mocks.mockListIamAuthorizationEvaluations,
    listIamPermissionTickets: mocks.mockListIamPermissionTickets,
    createIamResourceServer: mocks.mockCreateIamResourceServer,
    evaluateIamAuthorization: mocks.mockEvaluateIamAuthorization,
  },
}))

function configureLoad() {
  mocks.mockListIamClients.mockResolvedValue({
    clients: [
      {
        id: 'client-1',
        client_id: 'northwind-api',
        name: 'Northwind API',
      },
    ],
  })
  mocks.mockListIamResourceServers.mockResolvedValue({
    resource_servers: [
      {
        id: 'rs-1',
        client_id: 'northwind-api',
        name: 'Northwind Resource Server',
        summary: 'Protects internal APIs',
        status: 'ACTIVE',
        enforcement_mode: 'ENFORCING',
        decision_strategy: 'AFFIRMATIVE',
      },
    ],
  })
  mocks.mockListIamProtectedScopes.mockResolvedValue({
    scopes: [
      {
        id: 'scope-1',
        resource_server_id: 'rs-1',
        name: 'invoice:read',
        summary: 'Read invoices',
        status: 'ACTIVE',
      },
    ],
  })
  mocks.mockListIamProtectedResources.mockResolvedValue({
    resources: [
      {
        id: 'resource-1',
        resource_server_id: 'rs-1',
        name: 'Invoice API',
        summary: 'Invoice endpoint',
        uri: '/api/invoices',
        type_label: 'rest',
        status: 'ACTIVE',
        owner_user_ids: ['user-1'],
        scope_ids: ['scope-1'],
      },
    ],
  })
  mocks.mockListIamAuthorizationPolicies.mockResolvedValue({
    policies: [
      {
        id: 'policy-1',
        resource_server_id: 'rs-1',
        name: 'Finance Admins',
        summary: 'Finance admin access',
        kind: 'ROLE',
        status: 'ACTIVE',
        principal_user_ids: [],
        principal_group_ids: [],
        principal_role_ids: ['role-1'],
        principal_client_ids: [],
      },
    ],
  })
  mocks.mockListIamAuthorizationPermissions.mockResolvedValue({
    permissions: [
      {
        id: 'permission-1',
        resource_server_id: 'rs-1',
        name: 'Invoice Read Permission',
        summary: 'Invoice readers',
        status: 'ACTIVE',
        resource_ids: ['resource-1'],
        scope_ids: ['scope-1'],
        policy_ids: ['policy-1'],
        decision_strategy: 'AFFIRMATIVE',
      },
    ],
  })
  mocks.mockListIamAuthorizationEvaluations.mockResolvedValue({
    evaluations: [
      {
        id: 'evaluation-1',
        resource_server_id: 'rs-1',
        subject_kind: 'USER',
        subject_id: 'user-1',
        requester_client_id: 'northwind-api',
        resource_id: 'resource-1',
        requested_scope_names: ['invoice:read'],
        granted_scope_names: ['invoice:read'],
        allowed: true,
        reason: 'Role policy matched',
        evaluated_at: '2026-04-27T12:00:00.000Z',
      },
    ],
  })
  mocks.mockListIamPermissionTickets.mockResolvedValue({
    permission_tickets: [
      {
        id: 'ticket-1',
        resource_id: 'resource-1',
        resource_name: 'Invoice API',
        resource_server_id: 'rs-1',
        requester_username: 'jane',
        requested_scope_names: ['invoice:read'],
        granted_scope_names: ['invoice:read'],
        reason: 'Awaiting approval',
        status: 'PENDING',
      },
    ],
  })
}

describe('IamAuthorizationServicesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configureLoad()
    mocks.mockCreateIamResourceServer.mockResolvedValue({
      resource_server: { id: 'rs-2' },
    })
    mocks.mockEvaluateIamAuthorization.mockResolvedValue({
      allowed: true,
      evaluation: {
        id: 'evaluation-2',
        resource_server_id: 'rs-1',
        subject_kind: 'USER',
        subject_id: 'user-1',
        requester_client_id: 'northwind-api',
        resource_id: 'resource-1',
        requested_scope_names: ['invoice:read'],
        granted_scope_names: ['invoice:read'],
        allowed: true,
        reason: 'Role policy matched',
        evaluated_at: '2026-04-27T13:00:00.000Z',
      },
    })
  })

  it('loads authorization data and creates a resource server', async () => {
    render(React.createElement(IamAuthorizationServicesPanel, {
      selectedRealmId: 'realm-idp-default',
      canManage: true,
      users: [{ id: 'user-1', realm_id: 'realm-idp-default', username: 'jane', email: 'jane@example.test' }],
      groups: [],
      roles: [{ id: 'role-1', realm_id: 'realm-idp-default', name: 'finance-admin' }],
    }))

    expect(await screen.findByRole('heading', { name: 'Resource Servers' })).toBeInTheDocument()
    expect(screen.getAllByText('Northwind Resource Server').length).toBeGreaterThan(0)
    expect(screen.getByText('Invoice API')).toBeInTheDocument()

    const createHeading = screen.getByRole('heading', { name: 'Create Resource Server' })
    const createCard = createHeading.closest('section')
    expect(createCard).not.toBeNull()
    const resourceServerForm = within(createCard as HTMLElement)

    await userEvent.type(resourceServerForm.getByLabelText('Name'), 'Reporting API')
    await userEvent.type(resourceServerForm.getByLabelText('Summary'), 'Protects reporting endpoints')
    await userEvent.click(resourceServerForm.getByRole('button', { name: 'Create Resource Server' }))

    await waitFor(() => {
      expect(mocks.mockCreateIamResourceServer).toHaveBeenCalledWith({
        realm_id: 'realm-idp-default',
        client_id: 'northwind-api',
        name: 'Reporting API',
        summary: 'Protects reporting endpoints',
        status: 'ACTIVE',
        enforcement_mode: 'ENFORCING',
        decision_strategy: 'AFFIRMATIVE',
      })
    })
    expect(mocks.mockToastSuccess).toHaveBeenCalledWith('Resource server created.')
  })

  it('evaluates an authorization request and shows the decision', async () => {
    render(React.createElement(IamAuthorizationServicesPanel, {
      selectedRealmId: 'realm-idp-default',
      canManage: true,
      users: [{ id: 'user-1', realm_id: 'realm-idp-default', username: 'jane', email: 'jane@example.test' }],
      groups: [],
      roles: [{ id: 'role-1', realm_id: 'realm-idp-default', name: 'finance-admin' }],
    }))

    expect(await screen.findByText('Authorization Scope')).toBeInTheDocument()

    const evaluationHeading = screen.getByRole('heading', { name: 'Evaluation' })
    const evaluationCard = evaluationHeading.closest('section')
    expect(evaluationCard).not.toBeNull()
    const evaluation = within(evaluationCard as HTMLElement)

    await userEvent.selectOptions(evaluation.getByLabelText('User Subject'), 'user-1')
    await userEvent.selectOptions(evaluation.getByLabelText('Requester Client'), 'northwind-api')
    await userEvent.selectOptions(evaluation.getByLabelText('Resource'), 'resource-1')
    await userEvent.selectOptions(evaluation.getByLabelText('Requested Scopes'), 'invoice:read')
    await userEvent.click(evaluation.getByRole('button', { name: 'Run Evaluation' }))

    await waitFor(() => {
      expect(mocks.mockEvaluateIamAuthorization).toHaveBeenCalledWith({
        realm_id: 'realm-idp-default',
        resource_server_id: 'rs-1',
        subject_kind: 'USER',
        subject_id: 'user-1',
        requester_client_id: 'northwind-api',
        resource_id: 'resource-1',
        requested_scope_names: ['invoice:read'],
      })
    })
    expect(mocks.mockToastSuccess).toHaveBeenCalledWith('Authorization granted.')
    expect(await screen.findByText('Granted')).toBeInTheDocument()
    expect(screen.getByText('Role policy matched')).toBeInTheDocument()
  })
})
