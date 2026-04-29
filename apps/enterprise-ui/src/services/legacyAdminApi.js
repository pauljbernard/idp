import { api } from './iamHttpClient';
export const legacyAdminApi = {
    async getSecurityContext() {
        const response = await api.get('/security/context');
        return response.data;
    },
    async listSecuritySessions() {
        const response = await api.get('/security/sessions');
        return response.data;
    },
    async revokeSecuritySession(sessionId) {
        await api.post(`/security/sessions/${sessionId}/revoke`);
    },
    async revokeOtherSecuritySessions() {
        const response = await api.post('/security/sessions/revoke-others');
        return response.data;
    },
    async getControlPlaneCatalog(domain) {
        const response = await api.get('/control-plane/catalog', {
            params: domain ? { domain } : undefined,
        });
        return response.data;
    },
    async getControlPlaneConfiguration() {
        const response = await api.get('/control-plane/config');
        return response.data;
    },
    async updateControlPlaneDomain(domain, updates) {
        const response = await api.put(`/control-plane/${domain}`, updates);
        return response.data;
    },
    async listExternalIdentityMembers() {
        const response = await api.get('/control-plane/identity/members');
        return response.data;
    },
    async syncExternalIdentityMembers(request = {}) {
        const response = await api.post('/control-plane/identity/sync', request);
        return response.data;
    },
    async listFeatureFlags() {
        const response = await api.get('/feature-flags');
        return response.data;
    },
    async updateFeatureFlag(key, value) {
        const response = await api.put(`/feature-flags/${encodeURIComponent(key)}`, { value });
        return response.data;
    },
    async getFaaIntegrationCatalog(service) {
        const response = await api.get('/faa-integration/catalog', {
            params: service ? { service } : undefined,
        });
        return response.data;
    },
    async getIntegrationAdapterCatalog(service) {
        return this.getFaaIntegrationCatalog(service);
    },
    async getFaaIntegrationConfiguration() {
        const response = await api.get('/faa-integration/config');
        return response.data;
    },
    async getIntegrationAdapterConfiguration() {
        return this.getFaaIntegrationConfiguration();
    },
    async getDeploymentProfileConfiguration() {
        const response = await api.get('/configuration/deployment-profile');
        return response.data;
    },
    async getApplicationIdentityConfiguration() {
        const response = await api.get('/configuration/application-identity');
        return response.data;
    },
    async updateDeploymentProfileConfiguration(updates) {
        const response = await api.put('/configuration/deployment-profile', updates);
        return response.data;
    },
    async updateApplicationIdentityConfiguration(updates) {
        const response = await api.put('/configuration/application-identity', updates);
        return response.data;
    },
    async updateFaaIntegrationBinding(service, runtimeMode, updates) {
        const response = await api.put(`/faa-integration/${service}/${runtimeMode}`, updates);
        return response.data;
    },
    async updateIntegrationBinding(service, runtimeMode, updates) {
        return this.updateFaaIntegrationBinding(service, runtimeMode, updates);
    },
    async verifyFaaIntegration(service, runtimeMode) {
        const response = await api.post(`/faa-integration/${service}/verify`, {
            runtime_mode: runtimeMode,
        });
        return response.data;
    },
    async verifyIntegrationBinding(service, runtimeMode) {
        return this.verifyFaaIntegration(service, runtimeMode);
    },
    async listAdminAuditEvents(limit = 20) {
        const response = await api.get('/security/admin-audit', { params: { limit } });
        return response.data;
    },
    async getOrganizationProfile() {
        const response = await api.get('/account/organization');
        return response.data;
    },
    async updateOrganizationProfile(updates) {
        const response = await api.put('/account/organization', updates);
        return response.data;
    },
    async getBillingProfile() {
        const response = await api.get('/billing/profile');
        return response.data;
    },
    async updateBillingProfile(updates) {
        const response = await api.put('/billing/profile', updates);
        return response.data;
    },
};
