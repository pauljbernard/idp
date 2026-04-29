import { api, publicApi } from './iamHttpClient';
// Internal public/auth/bootstrap compatibility slab extracted from the legacy client surface.
function syncIamConfigAliases(config) {
    return config;
}
export const legacyAccessApi = {
    async getApiDocs() {
        const response = await publicApi.get('/docs/index.json');
        return response.data;
    },
    async getPublicAwarenessSummary() {
        const response = await publicApi.get('/public-awareness/summary');
        return response.data;
    },
    async evaluatePublicAwareness(request) {
        const response = await publicApi.post('/public-awareness/check', request);
        return response.data;
    },
    async searchPlanningLocations(query, limit = 8) {
        const response = await api.get('/planning/search', { params: { q: query, limit } });
        return response.data;
    },
    async getPlanningContext(request) {
        const response = await api.get('/planning/context', { params: request });
        return response.data;
    },
    async listPublicAwarenessChecks(limit = 6) {
        const response = await publicApi.get('/public-awareness/recent', { params: { limit } });
        return response.data;
    },
    async listAccountPlans() {
        const response = await publicApi.get('/account/plans');
        return response.data;
    },
    async registerAccount(request) {
        const response = await publicApi.post('/account/register', request);
        return response.data;
    },
    async login(request) {
        const response = await publicApi.post('/auth/login', request);
        return response.data;
    },
    async providerLogin(request) {
        const response = await publicApi.post('/auth/provider-login', request);
        return response.data;
    },
    async getIamConfig() {
        const response = await publicApi.get('/auth/iam/config');
        return syncIamConfigAliases(response.data);
    },
    async createIamAuthorizationRequest(request) {
        const response = await publicApi.post('/auth/iam/authorization-request', request);
        return response.data;
    },
    async getPublicTeamInvitation(invitationToken) {
        const response = await publicApi.get(`/team/invitations/${encodeURIComponent(invitationToken)}/public`);
        return response.data;
    },
    async getAuthSession() {
        const response = await api.get('/auth/session');
        return response.data;
    },
    async selectAuthTenant(request) {
        const response = await api.post('/auth/session/tenant', request);
        return response.data;
    },
    async logout() {
        await api.post('/auth/logout');
    },
    async getTenantContext() {
        const response = await api.get('/tenant-context');
        return response.data;
    },
    async getSegmentCatalog() {
        const response = await api.get('/segments');
        return response.data;
    },
    async getSolutionPackCatalog() {
        const response = await api.get('/solution-packs');
        return response.data;
    },
    async getTrainingEntitlements() {
        const response = await api.get('/entitlements');
        return response.data;
    },
    async getOperatingProfile() {
        const response = await api.get('/operating-profile');
        return response.data;
    },
    async updateOperatingProfile(updates) {
        const response = await api.put('/operating-profile', updates);
        return response.data;
    },
    async updateSolutionPackAssignments(updates) {
        const response = await api.put('/solution-packs/assignments', updates);
        return response.data;
    },
    async listClients(params = {}) {
        const response = await api.get('/clients', { params });
        return response.data;
    },
    async getClient(clientId) {
        const response = await api.get(`/clients/${clientId}`);
        return response.data;
    },
    async createClient(payload) {
        const response = await api.post('/clients', payload);
        return response.data;
    },
    async updateClient(clientId, payload) {
        const response = await api.put(`/clients/${clientId}`, payload);
        return response.data;
    },
};
