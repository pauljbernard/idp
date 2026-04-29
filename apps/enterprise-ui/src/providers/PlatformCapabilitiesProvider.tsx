import React, { createContext, useContext, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CLIENT_CONTEXT_EVENT,
  idpApi,
  type PlatformCapabilitiesResponse,
  type PresentationCapability,
} from '../services/standaloneApi'

interface PlatformCapabilitiesContextType {
  catalog: PlatformCapabilitiesResponse | null
  isLoading: boolean
  isError: boolean
  getSurface: (surfaceId: string) => PresentationCapability | null
  refreshCatalog: () => Promise<void>
}

const PlatformCapabilitiesContext = createContext<PlatformCapabilitiesContextType | undefined>(undefined)

export function PlatformCapabilitiesProvider({ children }: { children: React.ReactNode }) {
  const query = useQuery({
    queryKey: ['platform-capabilities'],
    queryFn: () => idpApi.getPlatformCapabilities(),
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
  const { refetch } = query
  const surfaceMap = useMemo(
    () => new Map((query.data?.surfaces ?? []).map((surface) => [surface.id, surface])),
    [query.data],
  )

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const refresh = (event?: Event) => {
      if (event instanceof CustomEvent) {
        const reason = typeof event.detail?.reason === 'string' ? event.detail.reason : null
        if (reason && reason !== 'tenant' && reason !== 'user') {
          return
        }
      }
      void refetch()
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== 'idp.activeTenantId' && event.key !== 'idp.activeUserId') {
        return
      }
      void refetch()
    }

    window.addEventListener(CLIENT_CONTEXT_EVENT, refresh as EventListener)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener(CLIENT_CONTEXT_EVENT, refresh as EventListener)
      window.removeEventListener('storage', handleStorage)
    }
  }, [refetch])

  const getSurface = (surfaceId: string) => surfaceMap.get(surfaceId) ?? null

  const refreshCatalog = async () => {
    await refetch()
  }

  return (
    <PlatformCapabilitiesContext.Provider
      value={{
        catalog: query.data || null,
        isLoading: query.isLoading,
        isError: query.isError,
        getSurface,
        refreshCatalog,
      }}
    >
      {children}
    </PlatformCapabilitiesContext.Provider>
  )
}

export function usePlatformCapabilities() {
  const context = useContext(PlatformCapabilitiesContext)
  if (!context) {
    throw new Error('usePlatformCapabilities must be used within a PlatformCapabilitiesProvider')
  }
  return context
}
