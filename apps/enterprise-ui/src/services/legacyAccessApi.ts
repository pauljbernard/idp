import { api, publicApi } from './iamHttpClient'

// Internal public/auth/bootstrap compatibility slab extracted from the legacy client surface.
function syncIamConfigAliases(config: any) {
  return config
}

export interface LegacyAccessApi {
  getApiDocs: (...args: any[]) => Promise<any>
  getPublicAwarenessSummary: (...args: any[]) => Promise<any>
  evaluatePublicAwareness: (...args: any[]) => Promise<any>
  searchPlanningLocations: (...args: any[]) => Promise<any>
  getPlanningContext: (...args: any[]) => Promise<any>
  listPublicAwarenessChecks: (...args: any[]) => Promise<any>
  listAccountPlans: (...args: any[]) => Promise<any>
  registerAccount: (...args: any[]) => Promise<any>
  login: (...args: any[]) => Promise<any>
  providerLogin: (...args: any[]) => Promise<any>
  getIamConfig: (...args: any[]) => Promise<any>
  createIamAuthorizationRequest: (...args: any[]) => Promise<any>
  getPublicTeamInvitation: (...args: any[]) => Promise<any>
  getAuthSession: (...args: any[]) => Promise<any>
  selectAuthTenant: (...args: any[]) => Promise<any>
  logout: (...args: any[]) => Promise<any>
  getTenantContext: (...args: any[]) => Promise<any>
  getSegmentCatalog: (...args: any[]) => Promise<any>
  getSolutionPackCatalog: (...args: any[]) => Promise<any>
  getTrainingEntitlements: (...args: any[]) => Promise<any>
  getOperatingProfile: (...args: any[]) => Promise<any>
  updateOperatingProfile: (...args: any[]) => Promise<any>
  updateSolutionPackAssignments: (...args: any[]) => Promise<any>
  listClients: (...args: any[]) => Promise<any>
  getClient: (...args: any[]) => Promise<any>
  createClient: (...args: any[]) => Promise<any>
  updateClient: (...args: any[]) => Promise<any>
}

export const legacyAccessApi: LegacyAccessApi = {
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
}
