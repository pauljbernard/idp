import { api } from './iamHttpClient'
import type {
  CreateProjectRequest,
  ProjectListParams,
  ProjectListResponse,
  ProjectRecord,
  UpdateProjectRequest,
} from './legacyProjectTypes'

export const legacyProjectApi = {
  async listProjects(params: ProjectListParams = {}): Promise<ProjectListResponse> {
    const response = await api.get('/projects', { params })
    return response.data
  },

  async getProject(projectId: string): Promise<ProjectRecord> {
    const response = await api.get(`/projects/${projectId}`)
    return response.data
  },

  async createProject(payload: CreateProjectRequest): Promise<ProjectRecord> {
    const response = await api.post('/projects', payload)
    return response.data
  },

  async updateProject(projectId: string, payload: UpdateProjectRequest): Promise<ProjectRecord> {
    const response = await api.put(`/projects/${projectId}`, payload)
    return response.data
  },

  async linkMissionToProject(projectId: string, missionId: string): Promise<ProjectRecord> {
    const response = await api.post(`/projects/${projectId}/missions/${missionId}/link`)
    return response.data
  },
}
