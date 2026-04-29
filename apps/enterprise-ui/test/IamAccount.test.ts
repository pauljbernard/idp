import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { IamAccount } from '../src/pages/IamAccount'

const mocks = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockClearIamSession: vi.fn(),
  mockGetCurrentIamRealmId: vi.fn(),
  mockGetCurrentIamSessionId: vi.fn(),
  mockGetIamAccountSession: vi.fn(),
  mockGetIamAccountProfile: vi.fn(),
  mockGetIamAccountSecurity: vi.fn(),
  mockListIamAccountSessions: vi.fn(),
  mockListIamAccountConsents: vi.fn(),
  mockListIamAccountDelegatedRelationships: vi.fn(),
  mockListIamAccountDelegatedConsents: vi.fn(),
  mockListIamAccountDelegatedConsentRequests: vi.fn(),
  mockListIamAccountLinkedIdentities: vi.fn(),
  mockListIamAccountOrganizations: vi.fn(),
  mockListIamAccountWebAuthnCredentials: vi.fn(),
  mockGetIamRealmExperience: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({
  toast: {
    error: mocks.mockToastError,
    success: mocks.mockToastSuccess,
    dismiss: vi.fn(),
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
  idpApi: {
    getIamAccountSession: mocks.mockGetIamAccountSession,
    getIamAccountProfile: mocks.mockGetIamAccountProfile,
    getIamAccountSecurity: mocks.mockGetIamAccountSecurity,
    listIamAccountSessions: mocks.mockListIamAccountSessions,
    listIamAccountConsents: mocks.mockListIamAccountConsents,
    listIamAccountDelegatedRelationships: mocks.mockListIamAccountDelegatedRelationships,
    listIamAccountDelegatedConsents: mocks.mockListIamAccountDelegatedConsents,
    listIamAccountDelegatedConsentRequests: mocks.mockListIamAccountDelegatedConsentRequests,
    listIamAccountLinkedIdentities: mocks.mockListIamAccountLinkedIdentities,
    listIamAccountOrganizations: mocks.mockListIamAccountOrganizations,
    listIamAccountWebAuthnCredentials: mocks.mockListIamAccountWebAuthnCredentials,
    getIamRealmExperience: mocks.mockGetIamRealmExperience,
  },
}))

vi.mock('../src/utils/iamPasskeys', () => ({
  createIamSoftwarePasskey: vi.fn(),
  getIamLocalPasskeyDeviceLabels: vi.fn(() => []),
  removeIamLocalPasskey: vi.fn(),
}))

function queueAccountLoad() {
  mocks.mockGetIamAccountSession.mockResolvedValueOnce({
    session: {
      assurance_level: 'PASSWORD',
    },
    user: {
      id: 'user-1',
    },
  })
  mocks.mockGetIamAccountProfile.mockResolvedValueOnce({
    user: {
      first_name: 'Platform',
      last_name: 'Admin',
      email: 'platform.admin@iam.local',
    },
    profile_schema: {
      attributes: [],
    },
    profile_attributes: {},
  })
  mocks.mockGetIamAccountSecurity.mockResolvedValueOnce({
    email_verified_at: '2026-04-20T00:00:00.000Z',
    mfa_enabled: false,
    passwordless_ready: false,
    passkey_count: 0,
  })
  mocks.mockListIamAccountSessions.mockResolvedValueOnce({
    sessions: [
      {
        session_id: 'session-1',
        client_name: 'Account console',
        is_current: true,
        status: 'ACTIVE',
        assurance_level: 'PASSWORD',
        authenticated_at: '2026-04-20T00:00:00.000Z',
      },
    ],
  })
  mocks.mockListIamAccountConsents.mockResolvedValueOnce({ consents: [] })
  mocks.mockListIamAccountDelegatedRelationships.mockResolvedValueOnce({ delegated_relationships: [] })
  mocks.mockListIamAccountDelegatedConsents.mockResolvedValueOnce({ delegated_consents: [] })
  mocks.mockListIamAccountDelegatedConsentRequests.mockResolvedValueOnce({ delegated_consent_requests: [] })
  mocks.mockListIamAccountLinkedIdentities.mockResolvedValueOnce({ linked_identities: [] })
  mocks.mockListIamAccountOrganizations.mockResolvedValueOnce({ organizations: [] })
  mocks.mockListIamAccountWebAuthnCredentials.mockResolvedValueOnce({ credentials: [] })
  mocks.mockGetIamRealmExperience.mockResolvedValueOnce({
    theme: {
      account_title: 'Account Console',
      account_subtitle: 'Manage access',
      support_email: 'support@example.test',
    },
    localization: {
      default_locale: 'en-US',
      translations: {
        'en-US': {},
      },
    },
  })
}

describe('IamAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to the login page when no current IAM session exists', async () => {
    mocks.mockGetCurrentIamRealmId.mockReturnValue(null)
    mocks.mockGetCurrentIamSessionId.mockReturnValue(null)

    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(IamAccount),
      ),
    )

    await waitFor(() => {
      expect(mocks.mockNavigate).toHaveBeenCalledWith('/iam/login')
    })
  })

  it('loads account data for the current realm session', async () => {
    mocks.mockGetCurrentIamRealmId.mockReturnValue('realm-idp-default')
    mocks.mockGetCurrentIamSessionId.mockReturnValue('session-1')
    queueAccountLoad()

    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(IamAccount),
      ),
    )

    expect(await screen.findByText('Sessions')).toBeInTheDocument()
    expect(screen.getByText('Organizations')).toBeInTheDocument()
    expect(screen.getByText('No organization memberships or pending invitations are attached to this account yet.')).toBeInTheDocument()
    expect(mocks.mockGetIamAccountSession).toHaveBeenCalledWith('realm-idp-default', 'session-1')
    expect(mocks.mockListIamAccountSessions).toHaveBeenCalledWith('realm-idp-default', 'session-1')
  })
})
