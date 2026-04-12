import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { IamExperiencePanel } from '../src/components/iam/IamExperiencePanel'

const mockToastError = vi.fn()
const mockToastSuccess = vi.fn()

const mockGetIamRealmExperience = vi.fn()
const mockListIamNotificationTemplates = vi.fn()
const mockListIamNotificationDeliveries = vi.fn()
const mockListIamRealmAttributes = vi.fn()
const mockCreateIamRealmAttribute = vi.fn()
const mockUpdateIamRealmAttribute = vi.fn()
const mockDeleteIamRealmAttribute = vi.fn()

vi.mock('react-hot-toast', () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}))

vi.mock('../src/services/standaloneApi', () => ({
  idpApi: {
    getIamRealmExperience: mockGetIamRealmExperience,
    listIamNotificationTemplates: mockListIamNotificationTemplates,
    listIamNotificationDeliveries: mockListIamNotificationDeliveries,
    listIamRealmAttributes: mockListIamRealmAttributes,
    createIamRealmAttribute: mockCreateIamRealmAttribute,
    updateIamRealmAttribute: mockUpdateIamRealmAttribute,
    deleteIamRealmAttribute: mockDeleteIamRealmAttribute,
  },
}))

function buildExperience() {
  return {
    generated_at: '2026-04-10T00:00:00.000Z',
    realm: {
      id: 'realm-crew-validation',
      name: 'Crew Validation',
      summary: 'Crew realm',
    },
    public_links: {
      signup_url: 'https://crew.example.test/register',
    },
    theme: {
      realm_id: 'realm-crew-validation',
      realm_name: 'Crew Validation',
      preset: 'PLATFORM_DEFAULT',
      brand_name: 'Crew Validation',
      logo_label: 'CR',
      support_email: 'support@crew.example.test',
      support_url: null,
      docs_url: null,
      primary_color: '#0f172a',
      accent_color: '#2563eb',
      surface_tint: '#e2e8f0',
      login_title: 'Access Crew Validation',
      login_subtitle: 'Sign in',
      account_title: 'Crew account',
      account_subtitle: 'Manage account',
      admin_title: 'Crew admin console',
      admin_subtitle: 'Manage realm',
      footer_note: 'Footer',
      updated_at: '2026-04-10T00:00:00.000Z',
      updated_by_user_id: 'idp-super-admin',
    },
    localization: {
      realm_id: 'realm-crew-validation',
      default_locale: 'en-US',
      supported_locales: ['en-US'],
      mode: 'REALM_DEFAULT',
      translations: {
        'en-US': {
          login_headline: 'Sign in',
          account_headline: 'Account',
          admin_headline: 'Admin',
        },
      },
      updated_at: '2026-04-10T00:00:00.000Z',
      updated_by_user_id: 'idp-super-admin',
    },
  }
}

function queueLoad(attributes: Array<{ id: string; realm_id: string; key: string; value: string; updated_at: string; updated_by_user_id: string }>) {
  mockGetIamRealmExperience.mockResolvedValueOnce(buildExperience())
  mockListIamNotificationTemplates.mockResolvedValueOnce({
    generated_at: '2026-04-10T00:00:00.000Z',
    notification_templates: [],
    count: 0,
  })
  mockListIamNotificationDeliveries.mockResolvedValueOnce({
    generated_at: '2026-04-10T00:00:00.000Z',
    notification_deliveries: [],
    count: 0,
  })
  mockListIamRealmAttributes.mockResolvedValueOnce({
    generated_at: '2026-04-10T00:00:00.000Z',
    realm_id: 'realm-crew-validation',
    attributes,
    count: attributes.length,
  })
}

describe('IamExperiencePanel realm attributes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads realm attributes from the IDP API and creates a new attribute', async () => {
    queueLoad([])
    queueLoad([
      {
        id: 'realm-crew-validation:login.signup_url',
        realm_id: 'realm-crew-validation',
        key: 'login.signup_url',
        value: 'https://crew.example.test/register',
        updated_at: '2026-04-10T00:00:00.000Z',
        updated_by_user_id: 'idp-super-admin',
      },
    ])
    mockCreateIamRealmAttribute.mockResolvedValueOnce({
      id: 'realm-crew-validation:login.signup_url',
      realm_id: 'realm-crew-validation',
      key: 'login.signup_url',
      value: 'https://crew.example.test/register',
      updated_at: '2026-04-10T00:00:00.000Z',
      updated_by_user_id: 'idp-super-admin',
    })

    render(React.createElement(IamExperiencePanel, {
      selectedRealmId: 'realm-crew-validation',
      canManage: true,
    }))

    expect(await screen.findByText('Realm Attributes')).toBeInTheDocument()
    expect(mockListIamRealmAttributes).toHaveBeenCalledWith('realm-crew-validation')
    expect(screen.getByText('No realm attributes configured.')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Key'), 'login.signup_url')
    await userEvent.type(screen.getByLabelText('Value'), 'https://crew.example.test/register')
    await userEvent.click(screen.getByRole('button', { name: 'Create Attribute' }))

    await waitFor(() => {
      expect(mockCreateIamRealmAttribute).toHaveBeenCalledWith('realm-crew-validation', {
        key: 'login.signup_url',
        value: 'https://crew.example.test/register',
      })
    })
    expect(await screen.findByText('login.signup_url')).toBeInTheDocument()
    expect(mockToastSuccess).toHaveBeenCalledWith('Realm attribute created')
  })

  it('edits and deletes an existing realm attribute through the IDP API surface', async () => {
    queueLoad([
      {
        id: 'realm-crew-validation:login.signup_url',
        realm_id: 'realm-crew-validation',
        key: 'login.signup_url',
        value: 'https://crew.example.test/register',
        updated_at: '2026-04-10T00:00:00.000Z',
        updated_by_user_id: 'idp-super-admin',
      },
    ])
    queueLoad([
      {
        id: 'realm-crew-validation:login.signup_url',
        realm_id: 'realm-crew-validation',
        key: 'login.signup_url',
        value: 'https://crew.example.test/self-service/register',
        updated_at: '2026-04-10T00:00:00.000Z',
        updated_by_user_id: 'idp-super-admin',
      },
    ])
    queueLoad([])
    mockUpdateIamRealmAttribute.mockResolvedValueOnce({
      id: 'realm-crew-validation:login.signup_url',
      realm_id: 'realm-crew-validation',
      key: 'login.signup_url',
      value: 'https://crew.example.test/self-service/register',
      updated_at: '2026-04-10T00:00:00.000Z',
      updated_by_user_id: 'idp-super-admin',
    })
    mockDeleteIamRealmAttribute.mockResolvedValueOnce(undefined)

    render(React.createElement(IamExperiencePanel, {
      selectedRealmId: 'realm-crew-validation',
      canManage: true,
    }))

    expect(await screen.findByText('login.signup_url')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    const valueField = screen.getByLabelText('Value')
    await userEvent.clear(valueField)
    await userEvent.type(valueField, 'https://crew.example.test/self-service/register')
    await userEvent.click(screen.getByRole('button', { name: 'Update Attribute' }))

    await waitFor(() => {
      expect(mockUpdateIamRealmAttribute).toHaveBeenCalledWith(
        'realm-crew-validation',
        'login.signup_url',
        {
          key: 'login.signup_url',
          value: 'https://crew.example.test/self-service/register',
        },
      )
    })
    expect(await screen.findByText('https://crew.example.test/self-service/register')).toBeInTheDocument()
    expect(mockToastSuccess).toHaveBeenCalledWith('Realm attribute updated')

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(mockDeleteIamRealmAttribute).toHaveBeenCalledWith('realm-crew-validation', 'login.signup_url')
    })
    expect(await screen.findByText('No realm attributes configured.')).toBeInTheDocument()
    expect(mockToastSuccess).toHaveBeenCalledWith('Realm attribute deleted')
  })
})
