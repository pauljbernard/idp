import { api } from './iamHttpClient'
import type {
  CommunicationsCmsCutoverActionRequest,
  CommunicationsCmsCutoverActionResponse,
  CommunicationsCmsMigrationStatusResponse,
  CommunicationsIamCutoverActionRequest,
  CommunicationsIamCutoverActionResponse,
  CommunicationsIamMigrationStatusResponse,
  LmsCommerceCutoverActionRequest,
  LmsCommerceCutoverActionResponse,
  LmsCommerceMigrationStatusResponse,
  LmsIamCutoverActionRequest,
  LmsIamCutoverActionResponse,
  LmsIamMigrationStatusResponse,
  SchedulingWorkforceCutoverActionRequest,
  SchedulingWorkforceCutoverActionResponse,
  SchedulingWorkforceMigrationStatusResponse,
  TrainingCmsCutoverActionRequest,
  TrainingCmsCutoverActionResponse,
  TrainingCmsMigrationStatusResponse,
  TrainingLmsCutoverActionRequest,
  TrainingLmsCutoverActionResponse,
  TrainingLmsMigrationStatusResponse,
  WorkforceIamCutoverActionRequest,
  WorkforceIamCutoverActionResponse,
  WorkforceIamMigrationStatusResponse,
  WorkforceReadinessCutoverActionRequest,
  WorkforceReadinessCutoverActionResponse,
  WorkforceReadinessMigrationStatusResponse,
} from './legacyCutoverTypes'

export const legacyCutoverApi = {
  async getTrainingLmsMigrationStatus(): Promise<TrainingLmsMigrationStatusResponse> {
    const response = await api.get('/training/admin/migration-status')
    return response.data
  },

  async executeTrainingLmsCutoverAction(
    payload: TrainingLmsCutoverActionRequest,
  ): Promise<TrainingLmsCutoverActionResponse> {
    const response = await api.post('/training/admin/cutover-actions', payload)
    return response.data
  },

  async getTrainingCmsMigrationStatus(): Promise<TrainingCmsMigrationStatusResponse> {
    const response = await api.get('/training/admin/cms-migration-status')
    return response.data
  },

  async executeTrainingCmsCutoverAction(
    payload: TrainingCmsCutoverActionRequest,
  ): Promise<TrainingCmsCutoverActionResponse> {
    const response = await api.post('/training/admin/cms-cutover-actions', payload)
    return response.data
  },

  async getLmsIamMigrationStatus(): Promise<LmsIamMigrationStatusResponse> {
    const response = await api.get('/lms/admin/iam-migration-status')
    return response.data
  },

  async executeLmsIamCutoverAction(
    payload: LmsIamCutoverActionRequest,
  ): Promise<LmsIamCutoverActionResponse> {
    const response = await api.post('/lms/admin/iam-cutover-actions', payload)
    return response.data
  },

  async getLmsCommerceMigrationStatus(): Promise<LmsCommerceMigrationStatusResponse> {
    const response = await api.get('/lms/admin/commerce-migration-status')
    return response.data
  },

  async executeLmsCommerceCutoverAction(
    payload: LmsCommerceCutoverActionRequest,
  ): Promise<LmsCommerceCutoverActionResponse> {
    const response = await api.post('/lms/admin/commerce-cutover-actions', payload)
    return response.data
  },

  async getWorkforceIamMigrationStatus(): Promise<WorkforceIamMigrationStatusResponse> {
    const response = await api.get('/workforce/admin/iam-migration-status')
    return response.data
  },

  async executeWorkforceIamCutoverAction(
    payload: WorkforceIamCutoverActionRequest,
  ): Promise<WorkforceIamCutoverActionResponse> {
    const response = await api.post('/workforce/admin/iam-cutover-actions', payload)
    return response.data
  },

  async getWorkforceReadinessMigrationStatus(): Promise<WorkforceReadinessMigrationStatusResponse> {
    const response = await api.get('/workforce/admin/readiness-migration-status')
    return response.data
  },

  async executeWorkforceReadinessCutoverAction(
    payload: WorkforceReadinessCutoverActionRequest,
  ): Promise<WorkforceReadinessCutoverActionResponse> {
    const response = await api.post('/workforce/admin/readiness-cutover-actions', payload)
    return response.data
  },

  async getSchedulingWorkforceMigrationStatus(): Promise<SchedulingWorkforceMigrationStatusResponse> {
    const response = await api.get('/scheduling/admin/workforce-migration-status')
    return response.data
  },

  async executeSchedulingWorkforceCutoverAction(
    payload: SchedulingWorkforceCutoverActionRequest,
  ): Promise<SchedulingWorkforceCutoverActionResponse> {
    const response = await api.post('/scheduling/admin/workforce-cutover-actions', payload)
    return response.data
  },

  async getCommunicationsCmsMigrationStatus(): Promise<CommunicationsCmsMigrationStatusResponse> {
    const response = await api.get('/communications/admin/cms-migration-status')
    return response.data
  },

  async executeCommunicationsCmsCutoverAction(
    payload: CommunicationsCmsCutoverActionRequest,
  ): Promise<CommunicationsCmsCutoverActionResponse> {
    const response = await api.post('/communications/admin/cms-cutover-actions', payload)
    return response.data
  },

  async getCommunicationsIamMigrationStatus(): Promise<CommunicationsIamMigrationStatusResponse> {
    const response = await api.get('/communications/admin/iam-migration-status')
    return response.data
  },

  async executeCommunicationsIamCutoverAction(
    payload: CommunicationsIamCutoverActionRequest,
  ): Promise<CommunicationsIamCutoverActionResponse> {
    const response = await api.post('/communications/admin/iam-cutover-actions', payload)
    return response.data
  },
}
