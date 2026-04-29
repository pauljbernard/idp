import { api } from './iamHttpClient'
import type {
  CreateDeliverableRequest,
  CreateWorkflowAssetRequest,
  DeliverableListParams,
  DeliverableListResponse,
  DeliverableRecord,
  DeliverableTemplateCatalogResponse,
  ProjectDeliverableTemplateResponse,
  ProjectRecord,
  UpdateProjectArtifactStatusRequest,
  UpdateWorkflowAssetRequest,
  WorkflowAssetListParams,
  WorkflowAssetListResponse,
  WorkflowAssetRecord,
} from './legacyDeliveryTypes'

export const legacyDeliveryApi = {
  async updateProjectArtifactStatus(
    projectId: string,
    artifactId: string,
    payload: UpdateProjectArtifactStatusRequest,
  ): Promise<ProjectRecord> {
    const response = await api.post(`/projects/${projectId}/artifacts/${artifactId}/status`, payload)
    return response.data
  },

  async listWorkflowAssets(params: WorkflowAssetListParams = {}): Promise<WorkflowAssetListResponse> {
    const response = await api.get('/workflow-assets', { params })
    return response.data
  },

  async createWorkflowAsset(payload: CreateWorkflowAssetRequest): Promise<WorkflowAssetRecord> {
    const response = await api.post('/workflow-assets', payload)
    return response.data
  },

  async updateWorkflowAsset(assetId: string, payload: UpdateWorkflowAssetRequest): Promise<WorkflowAssetRecord> {
    const response = await api.put(`/workflow-assets/${assetId}`, payload)
    return response.data
  },

  async listDeliverables(params: DeliverableListParams = {}): Promise<DeliverableListResponse> {
    const response = await api.get('/deliverables', { params })
    return response.data
  },

  async getDeliverable(deliverableId: string): Promise<DeliverableRecord> {
    const response = await api.get(`/deliverables/${deliverableId}`)
    return response.data
  },

  async createDeliverable(payload: CreateDeliverableRequest): Promise<DeliverableRecord> {
    const response = await api.post('/deliverables', payload)
    return response.data
  },

  async publishDeliverable(deliverableId: string): Promise<DeliverableRecord> {
    const response = await api.post(`/deliverables/${deliverableId}/publish`)
    return response.data
  },

  async listDeliverableTemplates(): Promise<DeliverableTemplateCatalogResponse> {
    const response = await api.get('/deliverable-templates')
    return response.data
  },

  async listProjectDeliverableTemplates(projectId: string): Promise<ProjectDeliverableTemplateResponse> {
    const response = await api.get(`/projects/${projectId}/deliverable-templates`)
    return response.data
  },
}
