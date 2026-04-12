import { api } from './iamHttpClient'
import type {
  AdminAuditLogResponse,
  BillingProfile,
  BillingProfileUpdateRequest,
  ControlPlaneCatalogResponse,
  ControlPlaneDomain,
  DeploymentProfileConfigurationResponse,
  ExternalIdentityMemberListResponse,
  FaaAdapterRuntimeMode,
  FaaIntegrationCatalogResponse,
  FaaIntegrationConfigurationResponse,
  FaaIntegrationService,
  FaaIntegrationVerificationResult,
  FaaServiceBindingConfiguration,
  FeatureFlagListResponse,
  IdpApplicationIdentityConfigurationResponse,
  IntegrationAdapterCatalogResponse,
  IntegrationAdapterConfigurationResponse,
  IntegrationAdapterRuntimeMode,
  IntegrationAdapterService,
  IntegrationServiceBindingConfiguration,
  IntegrationVerificationResult,
  OrganizationProfile,
  ResolvedFeatureFlag,
  SecurityControlPlaneSummary,
  SecuritySessionListResponse,
  SyncExternalIdentityMembersRequest,
  TenantControlPlaneConfiguration,
  TenantControlPlaneDomainConfiguration,
  UpdateControlPlaneDomainRequest,
  UpdateDeploymentProfileConfigurationRequest,
  UpdateFaaBindingRequest,
  UpdateIdpApplicationIdentityConfigurationRequest,
  UpdateIntegrationBindingRequest,
} from './legacyAdminTypes'

export const legacyAdminApi = {
  async getSecurityContext(): Promise<SecurityControlPlaneSummary> {
    const response = await api.get('/security/context')
    return response.data
  },

  async listSecuritySessions(): Promise<SecuritySessionListResponse> {
    const response = await api.get('/security/sessions')
    return response.data
  },

  async revokeSecuritySession(sessionId: string): Promise<void> {
    await api.post(`/security/sessions/${sessionId}/revoke`)
  },

  async revokeOtherSecuritySessions(): Promise<{ revoked_count: number; current_session_id: string | null }> {
    const response = await api.post('/security/sessions/revoke-others')
    return response.data
  },

  async getControlPlaneCatalog(domain?: ControlPlaneDomain): Promise<ControlPlaneCatalogResponse> {
    const response = await api.get('/control-plane/catalog', {
      params: domain ? { domain } : undefined,
    })
    return response.data
  },

  async getControlPlaneConfiguration(): Promise<TenantControlPlaneConfiguration> {
    const response = await api.get('/control-plane/config')
    return response.data
  },

  async updateControlPlaneDomain(
    domain: ControlPlaneDomain,
    updates: UpdateControlPlaneDomainRequest,
  ): Promise<TenantControlPlaneDomainConfiguration> {
    const response = await api.put(`/control-plane/${domain}`, updates)
    return response.data
  },

  async listExternalIdentityMembers(): Promise<ExternalIdentityMemberListResponse> {
    const response = await api.get('/control-plane/identity/members')
    return response.data
  },

  async syncExternalIdentityMembers(
    request: SyncExternalIdentityMembersRequest = {},
  ): Promise<ExternalIdentityMemberListResponse> {
    const response = await api.post('/control-plane/identity/sync', request)
    return response.data
  },

  async listFeatureFlags(): Promise<FeatureFlagListResponse> {
    const response = await api.get('/feature-flags')
    return response.data
  },

  async updateFeatureFlag(key: string, value: boolean | string): Promise<ResolvedFeatureFlag> {
    const response = await api.put(`/feature-flags/${encodeURIComponent(key)}`, { value })
    return response.data
  },

  async getFaaIntegrationCatalog(service?: FaaIntegrationService): Promise<FaaIntegrationCatalogResponse> {
    const response = await api.get('/faa-integration/catalog', {
      params: service ? { service } : undefined,
    })
    return response.data
  },

  async getIntegrationAdapterCatalog(
    service?: IntegrationAdapterService,
  ): Promise<IntegrationAdapterCatalogResponse> {
    return this.getFaaIntegrationCatalog(service)
  },

  async getFaaIntegrationConfiguration(): Promise<FaaIntegrationConfigurationResponse> {
    const response = await api.get('/faa-integration/config')
    return response.data
  },

  async getIntegrationAdapterConfiguration(): Promise<IntegrationAdapterConfigurationResponse> {
    return this.getFaaIntegrationConfiguration()
  },

  async getDeploymentProfileConfiguration(): Promise<DeploymentProfileConfigurationResponse> {
    const response = await api.get('/configuration/deployment-profile')
    return response.data
  },

  async getApplicationIdentityConfiguration(): Promise<IdpApplicationIdentityConfigurationResponse> {
    const response = await api.get('/configuration/application-identity')
    return response.data
  },

  async updateDeploymentProfileConfiguration(
    updates: UpdateDeploymentProfileConfigurationRequest,
  ): Promise<DeploymentProfileConfigurationResponse> {
    const response = await api.put('/configuration/deployment-profile', updates)
    return response.data
  },

  async updateApplicationIdentityConfiguration(
    updates: UpdateIdpApplicationIdentityConfigurationRequest,
  ): Promise<IdpApplicationIdentityConfigurationResponse> {
    const response = await api.put('/configuration/application-identity', updates)
    return response.data
  },

  async updateFaaIntegrationBinding(
    service: FaaIntegrationService,
    runtimeMode: FaaAdapterRuntimeMode,
    updates: UpdateFaaBindingRequest,
  ): Promise<FaaServiceBindingConfiguration> {
    const response = await api.put(`/faa-integration/${service}/${runtimeMode}`, updates)
    return response.data
  },

  async updateIntegrationBinding(
    service: IntegrationAdapterService,
    runtimeMode: IntegrationAdapterRuntimeMode,
    updates: UpdateIntegrationBindingRequest,
  ): Promise<IntegrationServiceBindingConfiguration> {
    return this.updateFaaIntegrationBinding(service, runtimeMode, updates)
  },

  async verifyFaaIntegration(
    service: FaaIntegrationService,
    runtimeMode?: FaaAdapterRuntimeMode,
  ): Promise<FaaIntegrationVerificationResult> {
    const response = await api.post(`/faa-integration/${service}/verify`, {
      runtime_mode: runtimeMode,
    })
    return response.data
  },

  async verifyIntegrationBinding(
    service: IntegrationAdapterService,
    runtimeMode?: IntegrationAdapterRuntimeMode,
  ): Promise<IntegrationVerificationResult> {
    return this.verifyFaaIntegration(service, runtimeMode)
  },

  async listAdminAuditEvents(limit = 20): Promise<AdminAuditLogResponse> {
    const response = await api.get('/security/admin-audit', { params: { limit } })
    return response.data
  },

  async getOrganizationProfile(): Promise<OrganizationProfile> {
    const response = await api.get('/account/organization')
    return response.data
  },

  async updateOrganizationProfile(updates: Partial<OrganizationProfile>): Promise<OrganizationProfile> {
    const response = await api.put('/account/organization', updates)
    return response.data
  },

  async getBillingProfile(): Promise<BillingProfile> {
    const response = await api.get('/billing/profile')
    return response.data
  },

  async updateBillingProfile(updates: BillingProfileUpdateRequest): Promise<BillingProfile> {
    const response = await api.put('/billing/profile', updates)
    return response.data
  },
}
