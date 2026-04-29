import { api } from './iamHttpClient';
import { legacyIamFederationApi } from './legacyIamFederationApi';
import { legacyIamManagementApi } from './legacyIamManagementApi';
import { legacyIamPublicApi } from './legacyIamPublicApi';
export const legacyIamApi = {
    async getIamExtensionSummary() {
        const response = await api.get('/iam/extensions/summary');
        return response.data;
    },
    async listIamProviderInterfaces() {
        const response = await api.get('/iam/extension-interfaces');
        return response.data;
    },
    async listIamRealms(filters) {
        const response = await api.get('/iam/realms', {
            params: {
                scope_kind: filters?.scopeKind,
                binding_target_kind: filters?.bindingTargetKind,
                binding_target_id: filters?.bindingTargetId,
            },
        });
        return response.data;
    },
    async listIamRealmAttributes(realmId) {
        const response = await api.get(`/iam/realms/${realmId}/attributes`);
        return response.data;
    },
    async listIamRealmTemplates() {
        const response = await api.get('/iam/realm-templates');
        return response.data;
    },
    async listIamRealmBindings(filters) {
        const response = await api.get('/iam/realm-bindings', {
            params: {
                binding_target_kind: filters?.bindingTargetKind,
            },
        });
        return response.data;
    },
    async listIamValidationDomains() {
        const response = await api.get('/iam/validation-domains');
        return response.data;
    },
    async createIamRealm(request) {
        const response = await api.post('/iam/realms', request);
        return response.data;
    },
    async createIamRealmAttribute(realmId, request) {
        const response = await api.post(`/iam/realms/${realmId}/attributes`, request);
        return response.data;
    },
    async updateIamRealm(realmId, request) {
        const response = await api.put(`/iam/realms/${realmId}`, request);
        return response.data;
    },
    async updateIamRealmAttribute(realmId, attributeKey, request) {
        const response = await api.put(`/iam/realms/${realmId}/attributes/${encodeURIComponent(attributeKey)}`, request);
        return response.data;
    },
    async deleteIamRealmAttribute(realmId, attributeKey) {
        const response = await api.delete(`/iam/realms/${realmId}/attributes/${encodeURIComponent(attributeKey)}`);
        return response.data;
    },
    async updateIamRealmBinding(bindingId, request) {
        const response = await api.put(`/iam/realm-bindings/${bindingId}`, request);
        return response.data;
    },
    async listIamAuthFlows(filters) {
        const response = await api.get('/iam/auth-flows', {
            params: {
                realm_id: filters?.realmId,
                kind: filters?.kind,
            },
        });
        return response.data;
    },
    async createIamAuthFlow(request) {
        const response = await api.post('/iam/auth-flows', request);
        return response.data;
    },
    async updateIamAuthFlow(flowId, request) {
        const response = await api.put(`/iam/auth-flows/${flowId}`, request);
        return response.data;
    },
    async listIamAuthExecutions(filters) {
        const response = await api.get('/iam/auth-executions', {
            params: {
                flow_id: filters?.flowId,
            },
        });
        return response.data;
    },
    async createIamAuthExecution(request) {
        const response = await api.post('/iam/auth-executions', request);
        return response.data;
    },
    async updateIamAuthExecution(executionId, request) {
        const response = await api.put(`/iam/auth-executions/${executionId}`, request);
        return response.data;
    },
    async listIamAuthFlowBindings(filters) {
        const response = await api.get('/iam/auth-flow-bindings', {
            params: {
                realm_id: filters?.realmId,
                client_id: filters?.clientId,
            },
        });
        return response.data;
    },
    async updateIamRealmAuthFlowBindings(realmId, request) {
        const response = await api.put(`/iam/realms/${realmId}/auth-flow-bindings`, request);
        return response.data;
    },
    async updateIamClientAuthFlowBindings(clientId, request) {
        const response = await api.put(`/iam/clients/${clientId}/auth-flow-bindings`, request);
        return response.data;
    },
    async listIamUsers(filters) {
        const response = await api.get('/iam/users', {
            params: {
                realm_id: filters?.realmId,
                search: filters?.search,
            },
        });
        return response.data;
    },
    async createIamUser(request) {
        const response = await api.post('/iam/users', request);
        return response.data;
    },
    async updateIamUser(userId, request) {
        const response = await api.put(`/iam/users/${userId}`, request);
        return response.data;
    },
    async listIamUserProfileSchemas(filters) {
        const response = await api.get('/iam/profile-schemas', {
            params: {
                realm_id: filters?.realmId,
            },
        });
        return response.data;
    },
    async updateIamUserProfileSchema(realmId, request) {
        const response = await api.put(`/iam/realms/${realmId}/profile-schema`, request);
        return response.data;
    },
    async getIamUserProfile(userId) {
        const response = await api.get(`/iam/users/${userId}/profile`);
        return response.data;
    },
    async updateIamUserProfile(userId, request) {
        const response = await api.put(`/iam/users/${userId}/profile`, request);
        return response.data;
    },
    ...legacyIamManagementApi,
    ...legacyIamPublicApi,
    ...legacyIamFederationApi,
};
