import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CLIENT_CONTEXT_EVENT, idpApi, } from '../services/standaloneApi';
const PlatformCapabilitiesContext = createContext(undefined);
export function PlatformCapabilitiesProvider({ children }) {
    const query = useQuery({
        queryKey: ['platform-capabilities'],
        queryFn: () => idpApi.getPlatformCapabilities(),
        staleTime: 5 * 60 * 1000,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
    const { refetch } = query;
    const surfaceMap = useMemo(() => new Map((query.data?.surfaces ?? []).map((surface) => [surface.id, surface])), [query.data]);
    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }
        const refresh = (event) => {
            if (event instanceof CustomEvent) {
                const reason = typeof event.detail?.reason === 'string' ? event.detail.reason : null;
                if (reason && reason !== 'tenant' && reason !== 'user') {
                    return;
                }
            }
            void refetch();
        };
        const handleStorage = (event) => {
            if (event.key && event.key !== 'idp.activeTenantId' && event.key !== 'idp.activeUserId') {
                return;
            }
            void refetch();
        };
        window.addEventListener(CLIENT_CONTEXT_EVENT, refresh);
        window.addEventListener('storage', handleStorage);
        return () => {
            window.removeEventListener(CLIENT_CONTEXT_EVENT, refresh);
            window.removeEventListener('storage', handleStorage);
        };
    }, [refetch]);
    const getSurface = (surfaceId) => surfaceMap.get(surfaceId) ?? null;
    const refreshCatalog = async () => {
        await refetch();
    };
    return (_jsx(PlatformCapabilitiesContext.Provider, { value: {
            catalog: query.data || null,
            isLoading: query.isLoading,
            isError: query.isError,
            getSurface,
            refreshCatalog,
        }, children: children }));
}
export function usePlatformCapabilities() {
    const context = useContext(PlatformCapabilitiesContext);
    if (!context) {
        throw new Error('usePlatformCapabilities must be used within a PlatformCapabilitiesProvider');
    }
    return context;
}
