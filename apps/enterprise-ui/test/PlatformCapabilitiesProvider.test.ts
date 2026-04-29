import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PlatformCapabilitiesProvider,
  usePlatformCapabilities,
} from '../src/providers/PlatformCapabilitiesProvider'

const mocks = vi.hoisted(() => ({
  mockGetPlatformCapabilities: vi.fn(),
}))

vi.mock('../src/services/standaloneApi', () => ({
  CLIENT_CONTEXT_EVENT: 'idp:client-context-changed',
  idpApi: {
    getPlatformCapabilities: mocks.mockGetPlatformCapabilities,
  },
}))

function buildCatalog(label = 'Primary Surface') {
  return {
    surfaces: [
      {
        id: 'iam',
        label,
      },
    ],
  }
}

function CapabilitiesConsumer() {
  const capabilities = usePlatformCapabilities()
  const surface = capabilities.getSurface('iam')

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      'div',
      { 'data-testid': 'catalog-state' },
      capabilities.isLoading ? 'loading' : surface?.label ?? 'missing',
    ),
    React.createElement(
      'div',
      { 'data-testid': 'error-state' },
      capabilities.isError ? 'error' : 'ok',
    ),
    React.createElement(
      'button',
      {
        onClick: () => void capabilities.refreshCatalog(),
      },
      'refresh',
    ),
  )
}

function renderProvider() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        PlatformCapabilitiesProvider,
        null,
        React.createElement(CapabilitiesConsumer),
      ),
    ),
  )
}

describe('PlatformCapabilitiesProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads the capabilities catalog and supports explicit refreshes', async () => {
    mocks.mockGetPlatformCapabilities
      .mockResolvedValueOnce(buildCatalog('Initial Surface'))
      .mockResolvedValueOnce(buildCatalog('Refreshed Surface'))

    renderProvider()

    await waitFor(() => {
      expect(screen.getByTestId('catalog-state')).toHaveTextContent('Initial Surface')
    })

    await userEvent.click(screen.getByRole('button', { name: 'refresh' }))

    await waitFor(() => {
      expect(screen.getByTestId('catalog-state')).toHaveTextContent('Refreshed Surface')
    })

    expect(mocks.mockGetPlatformCapabilities).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('error-state')).toHaveTextContent('ok')
  })

  it('refetches for tenant and storage context changes but ignores unrelated reasons', async () => {
    mocks.mockGetPlatformCapabilities
      .mockResolvedValue(buildCatalog('Stable Surface'))

    renderProvider()

    await waitFor(() => {
      expect(screen.getByTestId('catalog-state')).toHaveTextContent('Stable Surface')
    })

    expect(mocks.mockGetPlatformCapabilities).toHaveBeenCalledTimes(1)

    window.dispatchEvent(new CustomEvent('idp:client-context-changed', {
      detail: {
        reason: 'session',
      },
    }))

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mocks.mockGetPlatformCapabilities).toHaveBeenCalledTimes(1)

    window.dispatchEvent(new CustomEvent('idp:client-context-changed', {
      detail: {
        reason: 'tenant',
      },
    }))

    await waitFor(() => {
      expect(mocks.mockGetPlatformCapabilities).toHaveBeenCalledTimes(2)
    })

    window.dispatchEvent(new StorageEvent('storage', {
      key: 'idp.activeTenantId',
      newValue: 'tenant-2',
    }))

    await waitFor(() => {
      expect(mocks.mockGetPlatformCapabilities).toHaveBeenCalledTimes(3)
    })

    window.dispatchEvent(new StorageEvent('storage', {
      key: 'something-else',
      newValue: 'ignored',
    }))

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mocks.mockGetPlatformCapabilities).toHaveBeenCalledTimes(3)
  })
})
