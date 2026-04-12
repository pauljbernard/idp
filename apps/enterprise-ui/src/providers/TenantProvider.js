import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { idpApi, setClientContextState } from '../services/standaloneApi';
import { useAuth } from './AuthProvider';
const TenantContext = createContext(undefined);
let tenantContextBootstrapPromise = null;
function buildTenantState(response) {
    return {
        currentTenant: response.selected_tenant,
        availableTenants: response.available_tenants,
        currentUser: response.current_user,
        currentMembership: response.current_membership,
        operatingProfile: response.operating_profile,
        cmsAccess: response.cms_access ?? null
    };
}
function resolveGlobalSurfaceAccess(user, surfaceId) {
    return (user?.global_accessible_surface_ids.includes(surfaceId) ||
        user?.global_accessible_surface_aliases?.includes(surfaceId)) ?? false;
}
function resolveGlobalPermission(user, permission) {
    return user?.global_permissions.includes(permission) ?? false;
}
function applyTenantState(response, setters, reason = 'tenant') {
    const nextState = buildTenantState(response);
    setters.setCurrentTenantState(nextState.currentTenant);
    setters.setAvailableTenants(nextState.availableTenants);
    setters.setCurrentUser(nextState.currentUser);
    setters.setCurrentMembership(nextState.currentMembership);
    setters.setOperatingProfile(nextState.operatingProfile);
    setters.setCmsAccess(nextState.cmsAccess);
    setters.setError(null);
    setClientContextState({
        userId: response.current_user.id,
        tenantId: nextState.currentTenant?.id ?? null,
    }, reason);
}
async function fetchTenantContextSingleFlight() {
    if (tenantContextBootstrapPromise) {
        return tenantContextBootstrapPromise;
    }
    tenantContextBootstrapPromise = idpApi.getTenantContext()
        .finally(() => {
        tenantContextBootstrapPromise = null;
    });
    return tenantContextBootstrapPromise;
}
export function TenantProvider({ children }) {
    const { authState } = useAuth();
    const [currentTenant, setCurrentTenantState] = useState(null);
    const [availableTenants, setAvailableTenants] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [currentMembership, setCurrentMembership] = useState(null);
    const [operatingProfile, setOperatingProfile] = useState(null);
    const [cmsAccess, setCmsAccess] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const refreshContext = useCallback(async () => {
        try {
            setIsLoading(true);
            const tenantContext = await fetchTenantContextSingleFlight();
            applyTenantState(tenantContext, {
                setCurrentTenantState,
                setAvailableTenants,
                setCurrentUser,
                setCurrentMembership,
                setOperatingProfile,
                setCmsAccess,
                setError,
            });
        }
        catch (loadError) {
            console.error('Failed to load tenant context:', loadError);
            setError('Failed to load tenant context');
            throw loadError;
        }
        finally {
            setIsLoading(false);
        }
    }, []);
    useEffect(() => {
        if (authState?.authenticated) {
            applyTenantState(authState, {
                setCurrentTenantState,
                setAvailableTenants,
                setCurrentUser,
                setCurrentMembership,
                setOperatingProfile,
                setCmsAccess,
                setError,
            });
            setIsLoading(false);
            return;
        }
        void refreshContext();
    }, [authState, refreshContext]);
    const setCurrentTenant = (tenant) => {
        void (async () => {
            try {
                setIsLoading(true);
                setError(null);
                const response = await idpApi.selectAuthTenant({ tenant_id: tenant.id });
                applyTenantState(response, {
                    setCurrentTenantState,
                    setAvailableTenants,
                    setCurrentUser,
                    setCurrentMembership,
                    setOperatingProfile,
                    setCmsAccess,
                    setError,
                });
            }
            catch (loadError) {
                console.error('Failed to switch tenant context:', loadError);
                setError('Failed to switch tenant context');
            }
            finally {
                setIsLoading(false);
            }
        })();
    };
    const hasUnrestrictedCmsAccess = resolveGlobalPermission(currentUser, 'cms.manage') ||
        resolveGlobalPermission(currentUser, 'cms.read') ||
        (cmsAccess?.has_unrestricted_space_access ?? false);
    const hasCmsPermission = (permission) => {
        if (resolveGlobalPermission(currentUser, 'cms.manage')) {
            return true;
        }
        if (resolveGlobalPermission(currentUser, 'cms.read') && permission.endsWith('.read')) {
            return true;
        }
        return cmsAccess?.effective_permissions.includes(permission) ?? false;
    };
    const canAccessSurface = (surfaceId) => (surfaceId === 'cms' && (cmsAccess?.can_access_surface ?? false)) ||
        (currentMembership?.accessible_surface_ids.includes(surfaceId) ?? false) ||
        (currentMembership?.accessible_surface_aliases?.includes(surfaceId) ?? false) ||
        resolveGlobalSurfaceAccess(currentUser, surfaceId);
    const hasPermission = (permission) => (currentMembership?.permissions.includes(permission) ?? false) ||
        (currentMembership?.permission_aliases?.includes(permission) ?? false) ||
        resolveGlobalPermission(currentUser, permission);
    return (_jsx(TenantContext.Provider, { value: {
            currentTenant,
            availableTenants,
            currentUser,
            currentMembership,
            operatingProfile,
            cmsAccess,
            setCurrentTenant,
            refreshContext,
            canAccessSurface,
            hasPermission,
            hasCmsPermission,
            hasUnrestrictedCmsAccess,
            isLoading,
            error
        }, children: children }));
}
export function useTenant() {
    const context = useContext(TenantContext);
    if (context === undefined) {
        throw new Error('useTenant must be used within a TenantProvider');
    }
    return context;
}
