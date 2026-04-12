import { api } from './iamHttpClient';
export const legacyProjectApi = {
    async listProjects(params = {}) {
        const response = await api.get('/projects', { params });
        return response.data;
    },
    async getProject(projectId) {
        const response = await api.get(`/projects/${projectId}`);
        return response.data;
    },
    async createProject(payload) {
        const response = await api.post('/projects', payload);
        return response.data;
    },
    async updateProject(projectId, payload) {
        const response = await api.put(`/projects/${projectId}`, payload);
        return response.data;
    },
    async linkMissionToProject(projectId, missionId) {
        const response = await api.post(`/projects/${projectId}/missions/${missionId}/link`);
        return response.data;
    },
};
