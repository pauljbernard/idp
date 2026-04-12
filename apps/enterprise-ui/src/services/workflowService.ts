import { MissionService, missionService } from './missionService'
import type {
  Mission,
  MissionAttachment,
  MissionGeometry,
  MissionLocation,
  MissionNote,
  MissionSearchFilters,
  MissionSortOptions,
  MissionTemplate,
} from './missionService'

export type WorkflowLocation = MissionLocation
export type WorkflowGeometry = MissionGeometry
export type WorkflowTemplate = MissionTemplate
export type Workflow = Mission
export type WorkflowNote = MissionNote
export type WorkflowAttachment = MissionAttachment
export type WorkflowSearchFilters = MissionSearchFilters
export type WorkflowSortOptions = MissionSortOptions
export interface WorkflowSearchResponse {
  workflows: Workflow[]
  total: number
  missions?: Workflow[]
}

export class WorkflowService {
  constructor(private readonly missionRuntime: MissionService = missionService) {}

  async createWorkflow(
    workflowData: Omit<Workflow, 'id' | 'created_at' | 'updated_at' | 'notes' | 'attachments'>,
  ): Promise<Workflow> {
    return this.missionRuntime.createMission(workflowData)
  }

  async createWorkflowFromTemplate(
    templateId: string,
    overrides: Partial<Omit<Workflow, 'id' | 'template_id' | 'created_at' | 'updated_at'>>,
  ): Promise<Workflow> {
    return this.missionRuntime.createMissionFromTemplate(templateId, overrides)
  }

  async updateWorkflow(workflowId: string, updates: Partial<Workflow>): Promise<Workflow> {
    return this.missionRuntime.updateMission(workflowId, updates)
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    return this.missionRuntime.deleteMission(workflowId)
  }

  async getWorkflow(workflowId: string): Promise<Workflow | null> {
    return this.missionRuntime.getMission(workflowId)
  }

  async searchWorkflows(
    filters?: WorkflowSearchFilters,
    sort?: WorkflowSortOptions,
    limit?: number,
    offset?: number,
  ): Promise<WorkflowSearchResponse> {
    const result = await this.missionRuntime.searchMissions(filters, sort, limit, offset)
    return {
      workflows: result.missions,
      total: result.total,
      missions: result.missions,
    }
  }

  async getUpcomingWorkflows(limit: number = 10): Promise<Workflow[]> {
    return this.missionRuntime.getUpcomingMissions(limit)
  }

  async addWorkflowNote(
    workflowId: string,
    note: Omit<WorkflowNote, 'id' | 'mission_id' | 'created_at'>,
  ): Promise<WorkflowNote> {
    return this.missionRuntime.addMissionNote(workflowId, note)
  }

  async shareWorkflow(workflowId: string, userIds: string[]): Promise<void> {
    return this.missionRuntime.shareMission(workflowId, userIds)
  }

  async duplicateWorkflow(workflowId: string, overrides?: Partial<Workflow>): Promise<Workflow> {
    return this.missionRuntime.duplicateMission(workflowId, overrides)
  }

  async getWorkflowTemplates(category?: string): Promise<WorkflowTemplate[]> {
    return this.missionRuntime.getTemplates(category)
  }

  async createWorkflowTemplate(
    templateData: Omit<WorkflowTemplate, 'id' | 'created_at' | 'usage_count'>,
  ): Promise<WorkflowTemplate> {
    return this.missionRuntime.createTemplate(templateData)
  }

  subscribe(callback: (workflows: Workflow[]) => void): () => void {
    return this.missionRuntime.subscribe(callback)
  }

  async getWorkflowStatistics(): Promise<Awaited<ReturnType<MissionService['getMissionStatistics']>>> {
    return this.missionRuntime.getMissionStatistics()
  }
}

export const workflowService = new WorkflowService()
