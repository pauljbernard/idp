import { api } from './iamHttpClient';
export const legacyAdapterApi = {
    async getAdapterRegistry() {
        const response = await api.get('/adapters');
        return response.data;
    },
    async getAdapterCatalog() {
        const response = await api.get('/adapters/catalog');
        return response.data;
    },
    async getAdapterHealth() {
        const response = await api.get('/adapters/health');
        return response.data;
    },
    async getAdapter(adapterId) {
        const response = await api.get(`/adapters/${encodeURIComponent(adapterId)}`);
        return response.data;
    },
    async updateAdapterBinding(adapterId, updates) {
        const response = await api.put(`/adapters/${encodeURIComponent(adapterId)}/binding`, updates);
        return response.data;
    },
    async verifyAdapter(adapterId) {
        const response = await api.post(`/adapters/${encodeURIComponent(adapterId)}/verify`);
        return response.data;
    },
    async syncAdapter(adapterId) {
        const response = await api.post(`/adapters/${encodeURIComponent(adapterId)}/sync`);
        return response.data;
    },
};
