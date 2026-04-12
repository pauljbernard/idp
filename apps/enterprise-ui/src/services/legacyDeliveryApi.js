import { api } from './iamHttpClient';
export const legacyDeliveryApi = {
    async updateProjectArtifactStatus(projectId, artifactId, payload) {
        const response = await api.post(`/projects/${projectId}/artifacts/${artifactId}/status`, payload);
        return response.data;
    },
    async listWorkflowAssets(params = {}) {
        const response = await api.get('/workflow-assets', { params });
        return response.data;
    },
    async createWorkflowAsset(payload) {
        const response = await api.post('/workflow-assets', payload);
        return response.data;
    },
    async updateWorkflowAsset(assetId, payload) {
        const response = await api.put(`/workflow-assets/${assetId}`, payload);
        return response.data;
    },
    async listDeliverables(params = {}) {
        const response = await api.get('/deliverables', { params });
        return response.data;
    },
    async getDeliverable(deliverableId) {
        const response = await api.get(`/deliverables/${deliverableId}`);
        return response.data;
    },
    async createDeliverable(payload) {
        const response = await api.post('/deliverables', payload);
        return response.data;
    },
    async publishDeliverable(deliverableId) {
        const response = await api.post(`/deliverables/${deliverableId}/publish`);
        return response.data;
    },
    async listDeliverableTemplates() {
        const response = await api.get('/deliverable-templates');
        return response.data;
    },
    async listProjectDeliverableTemplates(projectId) {
        const response = await api.get(`/projects/${projectId}/deliverable-templates`);
        return response.data;
    },
};
