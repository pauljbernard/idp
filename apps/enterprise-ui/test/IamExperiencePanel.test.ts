import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IamExperiencePanel } from '../src/components/iam/IamExperiencePanel'

const mocks = vi.hoisted(() => ({
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockGetIamRealmExperience: vi.fn(),
  mockListIamNotificationTemplates: vi.fn(),
  mockListIamNotificationDeliveries: vi.fn(),
  mockListIamRealmAttributes: vi.fn(),
  mockUpdateIamRealmTheme: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({
  toast: {
    error: mocks.mockToastError,
    success: mocks.mockToastSuccess,
  },
}))

vi.mock('../src/services/standaloneApi', () => ({
  idpApi: {
    getIamRealmExperience: mocks.mockGetIamRealmExperience,
    listIamNotificationTemplates: mocks.mockListIamNotificationTemplates,
    listIamNotificationDeliveries: mocks.mockListIamNotificationDeliveries,
    listIamRealmAttributes: mocks.mockListIamRealmAttributes,
    updateIamRealmTheme: mocks.mockUpdateIamRealmTheme,
  },
}))

function configureLoad() {
  mocks.mockGetIamRealmExperience.mockResolvedValue({
    realm: {
      id: 'realm-idp-default',
      name: 'Default Realm',
    },
    theme: {
      preset: 'PLATFORM_DEFAULT',
      brand_name: 'Initial Brand',
      logo_label: 'IAM',
      support_email: 'support@iam.local',
      support_url: 'https://support.example.test',
      docs_url: 'https://docs.example.test',
      primary_color: '#0f172a',
      accent_color: '#2563eb',
      surface_tint: '#e2e8f0',
      login_title: 'Welcome',
      login_subtitle: 'Sign in',
      account_title: 'Account',
      account_subtitle: 'Manage account',
      admin_title: 'Admin',
      admin_subtitle: 'Manage realm',
      footer_note: 'Footer',
    },
    localization: {
      default_locale: 'en-US',
      supported_locales: ['en-US', 'es-US'],
      mode: 'REALM_DEFAULT',
      translations: {
        'en-US': {
          login_headline: 'Welcome',
          account_headline: 'Account',
          admin_headline: 'Admin',
        },
      },
    },
  })
  mocks.mockListIamNotificationTemplates.mockResolvedValue({
    notification_templates: [
      {
        id: 'template-1',
        key: 'PASSWORD_RESET',
        name: 'Password Reset',
        subject_template: 'Subject',
        body_template: 'Body',
        cta_label: 'Reset',
      },
    ],
  })
  mocks.mockListIamNotificationDeliveries.mockResolvedValue({
    notification_deliveries: [
      {
        id: 'delivery-1',
        sent_at: '2026-04-27T00:00:00.000Z',
        template_key: 'PASSWORD_RESET',
        recipient_email: 'ops@iam.local',
      },
    ],
  })
  mocks.mockListIamRealmAttributes.mockResolvedValue({
    attributes: [
      {
        id: 'attribute-1',
        realm_id: 'realm-idp-default',
        key: 'login.signup_url',
        value: 'https://signup.example.test',
        updated_at: '2026-04-27T00:00:00.000Z',
        updated_by_user_id: 'user-1',
      },
    ],
  })
}

describe('IamExperiencePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configureLoad()
    mocks.mockUpdateIamRealmTheme.mockResolvedValue(undefined)
  })

  it('loads realm experience and saves updated theme fields', async () => {
    render(React.createElement(IamExperiencePanel, {
      selectedRealmId: 'realm-idp-default',
      canManage: true,
    }))

    expect(await screen.findByText('Realm Experience')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Initial Brand')).toBeInTheDocument()

    const brandInput = screen.getByDisplayValue('Initial Brand')
    await userEvent.clear(brandInput)
    await userEvent.type(brandInput, 'Updated Brand')
    await userEvent.click(screen.getByRole('button', { name: 'Save Theme' }))

    await waitFor(() => {
      expect(mocks.mockUpdateIamRealmTheme).toHaveBeenCalledWith('realm-idp-default', expect.objectContaining({
        brand_name: 'Updated Brand',
        support_email: 'support@iam.local',
      }))
    })
    expect(mocks.mockToastSuccess).toHaveBeenCalledWith('IAM realm theme updated')
  })
})
