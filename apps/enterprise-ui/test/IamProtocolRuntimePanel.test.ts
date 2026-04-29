import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IamProtocolRuntimePanel } from '../src/components/iam/IamProtocolRuntimePanel'

const mocks = vi.hoisted(() => ({
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockListIamClients: vi.fn(),
  mockListIamClientScopes: vi.fn(),
  mockListIamProtocolMappers: vi.fn(),
  mockListIamServiceAccounts: vi.fn(),
  mockListIamIssuedTokens: vi.fn(),
  mockListIamSamlSessions: vi.fn(),
  mockGetIamOidcDiscovery: vi.fn(),
  mockRotateIamClientSecret: vi.fn(),
  mockIssueIamToken: vi.fn(),
  mockIntrospectIamToken: vi.fn(),
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
    listIamClientScopes: mocks.mockListIamClientScopes,
    listIamProtocolMappers: mocks.mockListIamProtocolMappers,
    listIamServiceAccounts: mocks.mockListIamServiceAccounts,
    listIamIssuedTokens: mocks.mockListIamIssuedTokens,
    listIamSamlSessions: mocks.mockListIamSamlSessions,
    getIamOidcDiscovery: mocks.mockGetIamOidcDiscovery,
    rotateIamClientSecret: mocks.mockRotateIamClientSecret,
    issueIamToken: mocks.mockIssueIamToken,
    introspectIamToken: mocks.mockIntrospectIamToken,
  },
}))

function configureLoad() {
  mocks.mockListIamClients.mockResolvedValue({
    clients: [
      {
        id: 'client-1',
        client_id: 'northwind-web',
        name: 'Northwind Web',
        summary: 'Web client',
        protocol: 'OIDC',
        access_type: 'CONFIDENTIAL',
        redirect_uris: ['https://app.example.test/callback'],
        base_url: 'https://app.example.test',
        root_url: 'https://app.example.test',
        default_scope_ids: ['scope-1'],
        optional_scope_ids: [],
        direct_protocol_mapper_ids: ['mapper-1'],
        standard_flow_enabled: true,
        direct_access_grants_enabled: true,
        service_account_enabled: false,
      },
      {
        id: 'client-2',
        client_id: 'northwind-saml',
        name: 'Northwind SAML',
        summary: 'SAML app',
        protocol: 'SAML',
        access_type: 'CONFIDENTIAL',
        redirect_uris: [],
        base_url: null,
        root_url: null,
        default_scope_ids: [],
        optional_scope_ids: [],
        direct_protocol_mapper_ids: [],
        standard_flow_enabled: false,
        direct_access_grants_enabled: false,
        service_account_enabled: false,
      },
    ],
  })
  mocks.mockListIamClientScopes.mockResolvedValue({
    client_scopes: [
      {
        id: 'scope-1',
        name: 'profile',
        description: 'Profile scope',
        protocol: 'OIDC',
        assignment_type: 'DEFAULT',
        status: 'ACTIVE',
        protocol_mapper_ids: ['mapper-1'],
        assigned_client_ids: ['client-1'],
      },
    ],
  })
  mocks.mockListIamProtocolMappers.mockResolvedValue({
    protocol_mappers: [
      {
        id: 'mapper-1',
        name: 'username',
        protocol: 'OIDC',
        target_kind: 'CLIENT_SCOPE',
        target_id: 'scope-1',
        source_kind: 'USERNAME',
        claim_name: 'preferred_username',
        user_property: null,
        static_value: null,
        multivalued: false,
        include_in_access_token: true,
        include_in_id_token: true,
        include_in_userinfo: true,
        status: 'ACTIVE',
      },
    ],
  })
  mocks.mockListIamServiceAccounts.mockResolvedValue({
    service_accounts: [
      {
        id: 'service-account-1',
        username: 'service-account-northwind-web',
        client_id: 'northwind-web',
        role_ids: ['role-1'],
        status: 'ACTIVE',
      },
    ],
  })
  mocks.mockListIamIssuedTokens.mockResolvedValue({
    issued_tokens: [
      {
        id: 'token-1',
        client_id: 'northwind-web',
        grant_type: 'client_credentials',
        subject_kind: 'SERVICE_ACCOUNT',
        status: 'ACTIVE',
        expires_at: '2026-04-27T14:00:00.000Z',
      },
    ],
  })
  mocks.mockListIamSamlSessions.mockResolvedValue({
    sessions: [
      {
        id: 'saml-session-1',
        client_id: 'northwind-saml',
        username: 'jane',
        created_at: '2026-04-27T12:00:00.000Z',
      },
    ],
  })
  mocks.mockGetIamOidcDiscovery.mockResolvedValue({
    issuer: 'https://issuer.example.test/realms/northwind',
  })
}

describe('IamProtocolRuntimePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configureLoad()
    mocks.mockRotateIamClientSecret.mockResolvedValue({
      issued_client_secret: 'secret-rotated',
    })
    mocks.mockIssueIamToken.mockResolvedValue({
      access_token: 'access-token-1',
      refresh_token: 'refresh-token-1',
      token_type: 'Bearer',
      expires_in: 300,
      scope: 'openid profile email roles',
    })
    mocks.mockIntrospectIamToken.mockResolvedValue({
      active: true,
      client_id: 'northwind-web',
      scope: 'openid profile email roles',
      username: 'service-account-northwind-web',
    })
  })

  it('loads protocol runtime data and rotates a confidential client secret', async () => {
    render(React.createElement(IamProtocolRuntimePanel, {
      selectedRealmId: 'realm-idp-default',
      canManage: true,
    }))

    expect(await screen.findByText('Clients, Scopes, Mappers, and Standards Runtime')).toBeInTheDocument()
    expect(screen.getByText('Issuer: https://issuer.example.test/realms/northwind')).toBeInTheDocument()

    await userEvent.click(screen.getAllByRole('button', { name: 'Rotate Secret' })[0])

    await waitFor(() => {
      expect(mocks.mockRotateIamClientSecret).toHaveBeenCalledWith('client-1')
    })
    expect(mocks.mockToastSuccess).toHaveBeenCalledWith('Client secret rotated')
    expect(await screen.findByText('secret-rotated')).toBeInTheDocument()
  })

  it('issues a token, introspects it, and shows the result', async () => {
    render(React.createElement(IamProtocolRuntimePanel, {
      selectedRealmId: 'realm-idp-default',
      canManage: true,
    }))

    expect(await screen.findByText('Protocol Validation')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Issue and Introspect Token' }))

    await waitFor(() => {
      expect(mocks.mockIssueIamToken).toHaveBeenCalledWith(
        'realm-idp-default',
        {
          grant_type: 'client_credentials',
          scope: 'openid profile email roles',
          client_id: 'northwind-web',
        },
        undefined,
      )
    })
    await waitFor(() => {
      expect(mocks.mockIntrospectIamToken).toHaveBeenCalledWith(
        'realm-idp-default',
        {
          token: 'access-token-1',
          client_id: 'northwind-web',
          client_secret: '',
        },
        undefined,
      )
    })
    expect(mocks.mockToastSuccess).toHaveBeenCalledWith('Protocol validation token issued')
    expect(await screen.findByText(/"active": true/)).toBeInTheDocument()
  })
})
