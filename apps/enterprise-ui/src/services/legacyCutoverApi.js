import { api } from './iamHttpClient';
export const legacyCutoverApi = {
    async getTrainingLmsMigrationStatus() {
        const response = await api.get('/training/admin/migration-status');
        return response.data;
    },
    async executeTrainingLmsCutoverAction(payload) {
        const response = await api.post('/training/admin/cutover-actions', payload);
        return response.data;
    },
    async getTrainingCmsMigrationStatus() {
        const response = await api.get('/training/admin/cms-migration-status');
        return response.data;
    },
    async executeTrainingCmsCutoverAction(payload) {
        const response = await api.post('/training/admin/cms-cutover-actions', payload);
        return response.data;
    },
    async getLmsIamMigrationStatus() {
        const response = await api.get('/lms/admin/iam-migration-status');
        return response.data;
    },
    async executeLmsIamCutoverAction(payload) {
        const response = await api.post('/lms/admin/iam-cutover-actions', payload);
        return response.data;
    },
    async getLmsCommerceMigrationStatus() {
        const response = await api.get('/lms/admin/commerce-migration-status');
        return response.data;
    },
    async executeLmsCommerceCutoverAction(payload) {
        const response = await api.post('/lms/admin/commerce-cutover-actions', payload);
        return response.data;
    },
    async getWorkforceIamMigrationStatus() {
        const response = await api.get('/workforce/admin/iam-migration-status');
        return response.data;
    },
    async executeWorkforceIamCutoverAction(payload) {
        const response = await api.post('/workforce/admin/iam-cutover-actions', payload);
        return response.data;
    },
    async getWorkforceReadinessMigrationStatus() {
        const response = await api.get('/workforce/admin/readiness-migration-status');
        return response.data;
    },
    async executeWorkforceReadinessCutoverAction(payload) {
        const response = await api.post('/workforce/admin/readiness-cutover-actions', payload);
        return response.data;
    },
    async getSchedulingWorkforceMigrationStatus() {
        const response = await api.get('/scheduling/admin/workforce-migration-status');
        return response.data;
    },
    async executeSchedulingWorkforceCutoverAction(payload) {
        const response = await api.post('/scheduling/admin/workforce-cutover-actions', payload);
        return response.data;
    },
    async getCommunicationsCmsMigrationStatus() {
        const response = await api.get('/communications/admin/cms-migration-status');
        return response.data;
    },
    async executeCommunicationsCmsCutoverAction(payload) {
        const response = await api.post('/communications/admin/cms-cutover-actions', payload);
        return response.data;
    },
    async getCommunicationsIamMigrationStatus() {
        const response = await api.get('/communications/admin/iam-migration-status');
        return response.data;
    },
    async executeCommunicationsIamCutoverAction(payload) {
        const response = await api.post('/communications/admin/iam-cutover-actions', payload);
        return response.data;
    },
};
