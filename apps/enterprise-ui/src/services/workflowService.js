import { missionService } from './missionService';
export class WorkflowService {
    constructor(missionRuntime = missionService) {
        Object.defineProperty(this, "missionRuntime", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: missionRuntime
        });
    }
    async createWorkflow(workflowData) {
        return this.missionRuntime.createMission(workflowData);
    }
    async createWorkflowFromTemplate(templateId, overrides) {
        return this.missionRuntime.createMissionFromTemplate(templateId, overrides);
    }
    async updateWorkflow(workflowId, updates) {
        return this.missionRuntime.updateMission(workflowId, updates);
    }
    async deleteWorkflow(workflowId) {
        return this.missionRuntime.deleteMission(workflowId);
    }
    async getWorkflow(workflowId) {
        return this.missionRuntime.getMission(workflowId);
    }
    async searchWorkflows(filters, sort, limit, offset) {
        const result = await this.missionRuntime.searchMissions(filters, sort, limit, offset);
        return {
            workflows: result.missions,
            total: result.total,
            missions: result.missions,
        };
    }
    async getUpcomingWorkflows(limit = 10) {
        return this.missionRuntime.getUpcomingMissions(limit);
    }
    async addWorkflowNote(workflowId, note) {
        return this.missionRuntime.addMissionNote(workflowId, note);
    }
    async shareWorkflow(workflowId, userIds) {
        return this.missionRuntime.shareMission(workflowId, userIds);
    }
    async duplicateWorkflow(workflowId, overrides) {
        return this.missionRuntime.duplicateMission(workflowId, overrides);
    }
    async getWorkflowTemplates(category) {
        return this.missionRuntime.getTemplates(category);
    }
    async createWorkflowTemplate(templateData) {
        return this.missionRuntime.createTemplate(templateData);
    }
    subscribe(callback) {
        return this.missionRuntime.subscribe(callback);
    }
    async getWorkflowStatistics() {
        return this.missionRuntime.getMissionStatistics();
    }
}
export const workflowService = new WorkflowService();
