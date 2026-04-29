import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TenantProvider, useTenant } from '../src/providers/TenantProvider'

const mocks = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockGetTenantContext: vi.fn(),
  mockSelectAuthTenant: vi.fn(),
  mockSetClientContextState: vi.fn(),
}))

vi.mock('../src/providers/AuthProvider', () => ({
  useAuth: () => mocks.mockUseAuth(),
}))

vi.mock('../src/services/standaloneApi', () => ({
  idpApi: {
    getTenantContext: mocks.mockGetTenantContext,
    selectAuthTenant: mocks.mockSelectAuthTenant,
  },
  setClientContextState: mocks.mockSetClientContextState,
}))

function TenantConsumer() {
  const tenant = useTenant()
  const secondaryTenant = tenant.availableTenants[1]

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      'div',
      { 'data-testid': 'tenant-state' },
      tenant.isLoading ? 'loading' : tenant.currentTenant?.name ?? 'none',
    ),
    React.createElement(
      'div',
      { 'data-testid': 'surface-check' },
      tenant.canAccessSurface('iam') ? 'surface-yes' : 'surface-no',
    ),
    React.createElement(
      'button',
      {
        disabled: !secondaryTenant,
        onClick: () => {
          if (secondaryTenant) {
            tenant.setCurrentTenant(secondaryTenant)
          }
        },
      },
      'switch',
    ),
  )
}

function buildTenantResponse(selectedTenantId = 'tenant-1', selectedTenantName = 'Tenant One') {
  return {
    authenticated: true,
    selected_tenant: {
      id: selectedTenantId,
      name: selectedTenantName,
    },
    available_tenants: [
      {
        id: 'tenant-1',
        name: 'Tenant One',
      },
      {
        id: 'tenant-2',
        name: 'Tenant Two',
      },
    ],
    current_user: {
      id: 'user-1',
      global_permissions: [],
      global_accessible_surface_ids: [],
      global_accessible_surface_aliases: [],
    },
    current_membership: {
      permissions: ['iam.read'],
      permission_aliases: [],
      accessible_surface_ids: ['iam'],
      accessible_surface_aliases: [],
    },
    operating_profile: null,
    cms_access: null,
  }
}

describe('TenantProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hydrates from authenticated auth state without an extra tenant fetch', async () => {
    mocks.mockUseAuth.mockReturnValue({
      authState: buildTenantResponse(),
    })

    render(React.createElement(TenantProvider, null, React.createElement(TenantConsumer)))

    await waitFor(() => {
      expect(screen.getByTestId('tenant-state')).toHaveTextContent('Tenant One')
    })

    expect(mocks.mockGetTenantContext).not.toHaveBeenCalled()
    expect(screen.getByTestId('surface-check')).toHaveTextContent('surface-yes')
    expect(mocks.mockSetClientContextState).toHaveBeenCalledWith({
      userId: 'user-1',
      tenantId: 'tenant-1',
    }, 'tenant')
  })

  it('can switch the current tenant through the API surface', async () => {
    mocks.mockUseAuth.mockReturnValue({
      authState: buildTenantResponse(),
    })
    mocks.mockSelectAuthTenant.mockResolvedValueOnce(buildTenantResponse('tenant-2', 'Tenant Two'))

    render(React.createElement(TenantProvider, null, React.createElement(TenantConsumer)))

    await waitFor(() => {
      expect(screen.getByTestId('tenant-state')).toHaveTextContent('Tenant One')
    })

    await userEvent.click(screen.getByRole('button', { name: 'switch' }))

    await waitFor(() => {
      expect(mocks.mockSelectAuthTenant).toHaveBeenCalledWith({ tenant_id: 'tenant-2' })
    })
    await waitFor(() => {
      expect(screen.getByTestId('tenant-state')).toHaveTextContent('Tenant Two')
    })
  })
})
