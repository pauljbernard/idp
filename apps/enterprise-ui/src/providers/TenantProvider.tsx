import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  idpApi,
  setClientContextState,
  type AuthBootstrapResponse,
  type CmsAccessPermission,
  type CmsTenantAccessSummary,
  type OperatingProfileResponse,
  type TenantContextMembership,
  type TenantContextResponse,
  type TenantContextTenant,
  type TenantContextUser
} from '../services/standaloneApi';
import { useAuth } from './AuthProvider';

type Tenant = TenantContextTenant;
type TenantUser = TenantContextUser;
type TenantMembership = TenantContextMembership;
type CmsAccess = CmsTenantAccessSummary;

interface TenantContextType {
  currentTenant: Tenant | null;
  availableTenants: Tenant[];
  currentUser: TenantUser | null;
  currentMembership: TenantMembership | null;
  operatingProfile: OperatingProfileResponse | null;
  cmsAccess: CmsAccess | null;
  setCurrentTenant: (tenant: Tenant) => void;
  refreshContext: () => Promise<void>;
  canAccessSurface: (surfaceId: string) => boolean;
  hasPermission: (permission: string) => boolean;
  hasCmsPermission: (permission: CmsAccessPermission) => boolean;
  hasUnrestrictedCmsAccess: boolean;
  isLoading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);
let tenantContextBootstrapPromise: Promise<TenantContextResponse> | null = null

function buildTenantState(response: TenantContextResponse | AuthBootstrapResponse) {
  return {
    currentTenant: response.selected_tenant,
    availableTenants: response.available_tenants,
    currentUser: response.current_user,
    currentMembership: response.current_membership,
    operatingProfile: response.operating_profile,
    cmsAccess: response.cms_access ?? null
  };
}

function resolveGlobalSurfaceAccess(user: TenantUser | null, surfaceId: string): boolean {
  return (
    user?.global_accessible_surface_ids.includes(surfaceId) ||
    user?.global_accessible_surface_aliases?.includes(surfaceId)
  ) ?? false
}

function resolveGlobalPermission(user: TenantUser | null, permission: string): boolean {
  return user?.global_permissions.includes(
    permission as
      | 'cms.read'
      | 'cms.manage'
      | 'iam.read'
      | 'iam.manage'
      | 'commerce.read'
      | 'commerce.manage'
      | 'lms.read'
      | 'lms.manage'
      | 'workforce.read'
      | 'workforce.manage'
      | 'scheduling.read'
      | 'scheduling.manage'
      | 'communications.read'
      | 'communications.manage'
  ) ?? false
}

function applyTenantState(
  response: TenantContextResponse | AuthBootstrapResponse,
  setters: {
    setCurrentTenantState: React.Dispatch<React.SetStateAction<Tenant | null>>
    setAvailableTenants: React.Dispatch<React.SetStateAction<Tenant[]>>
    setCurrentUser: React.Dispatch<React.SetStateAction<TenantUser | null>>
    setCurrentMembership: React.Dispatch<React.SetStateAction<TenantMembership | null>>
    setOperatingProfile: React.Dispatch<React.SetStateAction<OperatingProfileResponse | null>>
    setCmsAccess: React.Dispatch<React.SetStateAction<CmsAccess | null>>
    setError: React.Dispatch<React.SetStateAction<string | null>>
  },
  reason: 'tenant' | 'user' = 'tenant',
) {
  const nextState = buildTenantState(response)
  setters.setCurrentTenantState(nextState.currentTenant)
  setters.setAvailableTenants(nextState.availableTenants)
  setters.setCurrentUser(nextState.currentUser)
  setters.setCurrentMembership(nextState.currentMembership)
  setters.setOperatingProfile(nextState.operatingProfile)
  setters.setCmsAccess(nextState.cmsAccess)
  setters.setError(null)
  setClientContextState({
    userId: response.current_user.id,
    tenantId: nextState.currentTenant?.id ?? null,
  }, reason)
}

async function fetchTenantContextSingleFlight() {
  if (tenantContextBootstrapPromise) {
    return tenantContextBootstrapPromise
  }

  tenantContextBootstrapPromise = idpApi.getTenantContext()
    .finally(() => {
      tenantContextBootstrapPromise = null
    })

  return tenantContextBootstrapPromise
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { authState } = useAuth();
  const [currentTenant, setCurrentTenantState] = useState<Tenant | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [currentUser, setCurrentUser] = useState<TenantUser | null>(null);
  const [currentMembership, setCurrentMembership] = useState<TenantMembership | null>(null);
  const [operatingProfile, setOperatingProfile] = useState<OperatingProfileResponse | null>(null);
  const [cmsAccess, setCmsAccess] = useState<CmsAccess | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (loadError) {
      console.error('Failed to load tenant context:', loadError);
      setError('Failed to load tenant context');
      throw loadError;
    } finally {
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

  const setCurrentTenant = (tenant: Tenant) => {
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
      } catch (loadError) {
        console.error('Failed to switch tenant context:', loadError);
        setError('Failed to switch tenant context');
      } finally {
        setIsLoading(false);
      }
    })();
  };

  const hasUnrestrictedCmsAccess =
    resolveGlobalPermission(currentUser, 'cms.manage') ||
    resolveGlobalPermission(currentUser, 'cms.read') ||
    (cmsAccess?.has_unrestricted_space_access ?? false);

  const hasCmsPermission = (permission: CmsAccessPermission) => {
    if (resolveGlobalPermission(currentUser, 'cms.manage')) {
      return true
    }

    if (resolveGlobalPermission(currentUser, 'cms.read') && permission.endsWith('.read')) {
      return true
    }

    return cmsAccess?.effective_permissions.includes(permission) ?? false
  }

  const canAccessSurface = (surfaceId: string) =>
    (surfaceId === 'cms' && (cmsAccess?.can_access_surface ?? false)) ||
    (currentMembership?.accessible_surface_ids.includes(surfaceId) ?? false) ||
    (currentMembership?.accessible_surface_aliases?.includes(surfaceId) ?? false) ||
    resolveGlobalSurfaceAccess(currentUser, surfaceId);

  const hasPermission = (permission: string) =>
    (currentMembership?.permissions.includes(permission) ?? false) ||
    (currentMembership?.permission_aliases?.includes(permission) ?? false) ||
    resolveGlobalPermission(currentUser, permission);

  return (
    <TenantContext.Provider value={{
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
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
