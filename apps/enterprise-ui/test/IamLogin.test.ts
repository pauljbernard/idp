import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { IamLogin } from '../src/pages/IamLogin'

const mocks = vi.hoisted(() => ({
  mockDismiss: vi.fn(),
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockNavigate: vi.fn(),
  mockClearIamSession: vi.fn(),
  mockGetCurrentIamRealmId: vi.fn(),
  mockGetCurrentIamSessionId: vi.fn(),
  mockSetCurrentIamRealmId: vi.fn(),
  mockSetCurrentIamSessionId: vi.fn(),
  mockGetIamPublicCatalog: vi.fn(),
  mockGetIamRealmExperience: vi.fn(),
  mockListIamRealmBrokers: vi.fn(),
  mockLoginIamBrowser: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({
  toast: {
    dismiss: mocks.mockDismiss,
    error: mocks.mockToastError,
    success: mocks.mockToastSuccess,
  },
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => mocks.mockNavigate,
  }
})

vi.mock('../src/services/standaloneApi', () => ({
  clearIamSession: mocks.mockClearIamSession,
  getCurrentIamRealmId: mocks.mockGetCurrentIamRealmId,
  getCurrentIamSessionId: mocks.mockGetCurrentIamSessionId,
  setCurrentIamRealmId: mocks.mockSetCurrentIamRealmId,
  setCurrentIamSessionId: mocks.mockSetCurrentIamSessionId,
  idpApi: {
    getIamPublicCatalog: mocks.mockGetIamPublicCatalog,
    getIamRealmExperience: mocks.mockGetIamRealmExperience,
    listIamRealmBrokers: mocks.mockListIamRealmBrokers,
    loginIamBrowser: mocks.mockLoginIamBrowser,
  },
}))

function buildCatalog() {
  return {
    realms: [
      {
        id: 'realm-idp-default',
        name: 'Default Realm',
        clients: [
          {
            id: 'client-1',
            client_id: 'account-console',
            name: 'Account Console',
            protocol: 'OIDC',
          },
        ],
      },
    ],
  }
}

function buildExperience() {
  return {
    realm: {
      id: 'realm-idp-default',
      name: 'Default Realm',
    },
    public_links: {
      signup_url: 'https://example.test/signup',
    },
    theme: {
      brand_name: 'Standalone IAM',
      login_title: 'Access the identity plane',
      login_subtitle: 'Sign in to continue',
      surface_tint: '#cbd5e1',
      accent_color: '#0284c7',
      primary_color: '#0f172a',
      logo_label: 'SI',
      support_email: 'support@example.test',
    },
    localization: {
      default_locale: 'en-US',
      translations: {
        'en-US': {},
      },
    },
  }
}

describe('IamLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockGetCurrentIamRealmId.mockReturnValue(null)
    mocks.mockGetCurrentIamSessionId.mockReturnValue(null)
    mocks.mockGetIamPublicCatalog.mockResolvedValue(buildCatalog())
    mocks.mockListIamRealmBrokers.mockResolvedValue({ brokers: [] })
    mocks.mockGetIamRealmExperience.mockResolvedValue(buildExperience())
  })

  it('loads the catalog and completes a successful browser login flow', async () => {
    mocks.mockLoginIamBrowser.mockResolvedValueOnce({
      next_step: 'AUTHENTICATED',
      realm_id: 'realm-idp-default',
      session_id: 'session-123',
    })

    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(IamLogin),
      ),
    )

    expect(await screen.findByText('Access the identity plane')).toBeInTheDocument()

    await userEvent.type(screen.getByPlaceholderText('platform.admin'), 'platform.admin')
    await userEvent.type(screen.getByPlaceholderText('Enter password'), 'StandaloneIAM!PlatformAdmin2026')
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(mocks.mockLoginIamBrowser).toHaveBeenCalledWith('realm-idp-default', {
        username: 'platform.admin',
        password: 'StandaloneIAM!PlatformAdmin2026',
        client_id: 'account-console',
      })
    })
    expect(mocks.mockSetCurrentIamRealmId).toHaveBeenCalledWith('realm-idp-default')
    expect(mocks.mockSetCurrentIamSessionId).toHaveBeenCalledWith('session-123')
    expect(mocks.mockToastSuccess).toHaveBeenCalledWith('IAM account session established')
    expect(mocks.mockNavigate).toHaveBeenCalledWith('/iam/account', { replace: true })
  })
})
