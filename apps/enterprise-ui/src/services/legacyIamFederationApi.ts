import { api } from './iamHttpClient'

// Internal IAM federation/theme/notification slab extracted from the legacy IAM client.
export interface LegacyIamFederationApi {
  listIamIdentityProviders: (...args: any[]) => Promise<any>
  createIamIdentityProvider: (...args: any[]) => Promise<any>
  updateIamIdentityProvider: (...args: any[]) => Promise<any>
  listIamUserFederationProviders: (...args: any[]) => Promise<any>
  createIamUserFederationProvider: (...args: any[]) => Promise<any>
  updateIamUserFederationProvider: (...args: any[]) => Promise<any>
  syncIamUserFederationProvider: (...args: any[]) => Promise<any>
  listIamFederationSyncJobs: (...args: any[]) => Promise<any>
  listIamLinkedIdentities: (...args: any[]) => Promise<any>
  listIamFederationEvents: (...args: any[]) => Promise<any>
  updateIamRealmTheme: (...args: any[]) => Promise<any>
  updateIamRealmLocalization: (...args: any[]) => Promise<any>
  listIamNotificationTemplates: (...args: any[]) => Promise<any>
  updateIamNotificationTemplate: (...args: any[]) => Promise<any>
  previewIamNotificationTemplate: (...args: any[]) => Promise<any>
  sendIamTestNotification: (...args: any[]) => Promise<any>
  listIamNotificationDeliveries: (...args: any[]) => Promise<any>
}

export const legacyIamFederationApi: LegacyIamFederationApi = {
    async listIamIdentityProviders(filters) {
        const response = await api.get('/iam/identity-providers', {
            params: {
                realm_id: filters?.realmId,
                protocol: filters?.protocol,
            },
        });
        return response.data;
    },
    async createIamIdentityProvider(request) {
        const response = await api.post('/iam/identity-providers', request);
        return response.data;
    },
    async updateIamIdentityProvider(providerId, request) {
        const response = await api.put(`/iam/identity-providers/${providerId}`, request);
        return response.data;
    },
    async listIamUserFederationProviders(filters) {
        const response = await api.get('/iam/user-federation/providers', {
            params: {
                realm_id: filters?.realmId,
                kind: filters?.kind,
            },
        });
        return response.data;
    },
    async createIamUserFederationProvider(request) {
        const response = await api.post('/iam/user-federation/providers', request);
        return response.data;
    },
    async updateIamUserFederationProvider(providerId, request) {
        const response = await api.put(`/iam/user-federation/providers/${providerId}`, request);
        return response.data;
    },
    async syncIamUserFederationProvider(providerId) {
        const response = await api.post(`/iam/user-federation/providers/${providerId}/sync`);
        return response.data;
    },
    async listIamFederationSyncJobs(filters) {
        const response = await api.get('/iam/user-federation/sync-jobs', {
            params: {
                realm_id: filters?.realmId,
                provider_id: filters?.providerId,
            },
        });
        return response.data;
    },
    async listIamLinkedIdentities(filters) {
        const response = await api.get('/iam/broker-links', {
            params: {
                realm_id: filters?.realmId,
                source_type: filters?.sourceType,
            },
        });
        return response.data;
    },
    async listIamFederationEvents(filters) {
        const response = await api.get('/iam/federation/events', {
            params: {
                realm_id: filters?.realmId,
                provider_id: filters?.providerId,
            },
        });
        return response.data;
    },
    async updateIamRealmTheme(realmId, request) {
        const response = await api.put(`/iam/realms/${realmId}/theme`, request);
        return response.data;
    },
    async updateIamRealmLocalization(realmId, request) {
        const response = await api.put(`/iam/realms/${realmId}/localization`, request);
        return response.data;
    },
    async listIamNotificationTemplates(realmId) {
        const response = await api.get(`/iam/realms/${realmId}/notification-templates`);
        return response.data;
    },
    async updateIamNotificationTemplate(realmId, templateId, request) {
        const response = await api.put(`/iam/realms/${realmId}/notification-templates/${templateId}`, request);
        return response.data;
    },
    async previewIamNotificationTemplate(realmId, templateId, variables) {
        const response = await api.post(`/iam/realms/${realmId}/notification-templates/${templateId}/preview`, {
            variables,
        });
        return response.data;
    },
    async sendIamTestNotification(realmId, request) {
        const response = await api.post(`/iam/realms/${realmId}/notifications/test`, request);
        return response.data;
    },
    async listIamNotificationDeliveries(realmId, filters) {
        const response = await api.get(`/iam/realms/${realmId}/notification-deliveries`, {
            params: {
                template_key: filters?.templateKey,
            },
        });
        return response.data;
    },
}
