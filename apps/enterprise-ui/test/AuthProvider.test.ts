import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from '../src/providers/AuthProvider'

const mocks = vi.hoisted(() => ({
  mockClearAuthenticatedSession: vi.fn(),
  mockGetAuthSession: vi.fn(),
  mockGetCurrentIamAccessToken: vi.fn(),
  mockGetCurrentIamAuthClientId: vi.fn(),
  mockGetCurrentIamAuthRealmId: vi.fn(),
  mockGetCurrentIamRefreshToken: vi.fn(),
  mockGetCurrentSessionId: vi.fn(),
  mockIssueIamToken: vi.fn(),
  mockLogin: vi.fn(),
  mockLogout: vi.fn(),
  mockRevokeIamToken: vi.fn(),
  mockSetClientContextState: vi.fn(),
  mockSetCurrentIamAccessToken: vi.fn(),
  mockSetCurrentIamAuthClientId: vi.fn(),
  mockSetCurrentIamAuthRealmId: vi.fn(),
  mockSetCurrentIamRefreshToken: vi.fn(),
}))

vi.mock('../src/services/standaloneApi', () => ({
  clearAuthenticatedSession: mocks.mockClearAuthenticatedSession,
  getCurrentIamAccessToken: mocks.mockGetCurrentIamAccessToken,
  getCurrentIamAuthClientId: mocks.mockGetCurrentIamAuthClientId,
  getCurrentIamAuthRealmId: mocks.mockGetCurrentIamAuthRealmId,
  getCurrentIamRefreshToken: mocks.mockGetCurrentIamRefreshToken,
  getCurrentSessionId: mocks.mockGetCurrentSessionId,
  idpApi: {
    getAuthSession: mocks.mockGetAuthSession,
    issueIamToken: mocks.mockIssueIamToken,
    login: mocks.mockLogin,
    logout: mocks.mockLogout,
    revokeIamToken: mocks.mockRevokeIamToken,
  },
  setClientContextState: mocks.mockSetClientContextState,
  setCurrentIamAccessToken: mocks.mockSetCurrentIamAccessToken,
  setCurrentIamAuthClientId: mocks.mockSetCurrentIamAuthClientId,
  setCurrentIamAuthRealmId: mocks.mockSetCurrentIamAuthRealmId,
  setCurrentIamRefreshToken: mocks.mockSetCurrentIamRefreshToken,
}))

function TestConsumer() {
  const auth = useAuth()

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      'div',
      { 'data-testid': 'auth-state' },
      auth.isLoading ? 'loading' : auth.isAuthenticated ? 'authenticated' : 'anonymous',
    ),
    React.createElement(
      'button',
      {
        onClick: () => void auth.login({
          username: 'user@example.test',
          password: 'Password!2026',
        }),
      },
      'login',
    ),
  )
}

function buildAuthResponse() {
  return {
    authenticated: true,
    auth: {
      user_id: 'user-1',
      session_id: 'session-1',
      tenant_id: 'tenant-1',
    },
    identity: {
      session: {
        session_transport: 'cookie_session',
      },
    },
    selected_tenant: {
      id: 'tenant-1',
      name: 'Tenant One',
    },
    available_tenants: [],
    current_user: {
      id: 'user-1',
    },
    current_membership: null,
    operating_profile: null,
    cms_access: null,
  }
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockGetCurrentSessionId.mockReturnValue(null)
    mocks.mockGetCurrentIamAccessToken.mockReturnValue(null)
    mocks.mockGetCurrentIamAuthClientId.mockReturnValue(null)
    mocks.mockGetCurrentIamAuthRealmId.mockReturnValue(null)
    mocks.mockGetCurrentIamRefreshToken.mockReturnValue(null)
  })

  it('does not bootstrap a server session when no local session markers are present', async () => {
    render(React.createElement(AuthProvider, null, React.createElement(TestConsumer)))

    await waitFor(() => {
      expect(screen.getByTestId('auth-state')).toHaveTextContent('anonymous')
    })

    expect(mocks.mockGetAuthSession).not.toHaveBeenCalled()
    expect(mocks.mockSetClientContextState).not.toHaveBeenCalled()
  })

  it('bootstraps an authenticated session and supports login mutations', async () => {
    mocks.mockGetCurrentSessionId.mockReturnValue('session-1')
    mocks.mockGetAuthSession.mockResolvedValueOnce(buildAuthResponse())
    mocks.mockLogin.mockResolvedValueOnce(buildAuthResponse())

    render(React.createElement(AuthProvider, null, React.createElement(TestConsumer)))

    await waitFor(() => {
      expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated')
    })

    expect(mocks.mockGetAuthSession).toHaveBeenCalledTimes(1)
    expect(mocks.mockSetClientContextState).toHaveBeenCalledWith({
      userId: 'user-1',
      sessionId: 'session-1',
      tenantId: 'tenant-1',
    }, 'tenant')

    await userEvent.click(screen.getByRole('button', { name: 'login' }))

    await waitFor(() => {
      expect(mocks.mockLogin).toHaveBeenCalledWith({
        username: 'user@example.test',
        password: 'Password!2026',
      })
    })
  })
})
