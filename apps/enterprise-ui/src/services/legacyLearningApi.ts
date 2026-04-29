import { api } from './iamHttpClient'
import type {
  AssignReadinessActionRemediationRequest,
  AssignTrainingCohortResponse,
  ApproveReadinessActionRequest,
  CourseStudioDraft,
  CourseStudioDraftListResponse,
  CreateAssessmentSessionRequest,
  CreateCourseStudioDraftRequest,
  CreateInstructorCourseRunRequest,
  CreateTrainingCohortRequest,
  CreateTrainingEnrollmentRequest,
  CreateTrainingInstructorRunAssignmentRequest,
  CreateTrainingInstructorRunAssignmentResponse,
  CreateTrainingInstructorRunAttendanceRequest,
  CreateTrainingInstructorRunSessionRequest,
  CreateTrainingInstructorRunSessionResponse,
  DispatchReadinessActionNotificationRequest,
  EnrollReadinessActionRequest,
  GradeTrainingInstructorRunAttemptRequest,
  GradeTrainingInstructorRunAttemptResponse,
  ImportQualificationsRequest,
  InstructorCourseRun,
  InstructorCourseRunListResponse,
  LaunchInstructorCourseRunResponse,
  PracticeExamCatalogResponse,
  PublishCourseStudioDraftResponse,
  QualificationListResponse,
  ReadinessActionApprovalResponse,
  ReadinessActionDispatchResponse,
  ReadinessActionEnrollmentResponse,
  ReadinessActionRemediationResponse,
  ReadinessActionRenewalResponse,
  ReadinessActionsResponse,
  ReadinessDecisionListResponse,
  ReadinessEvaluationRequest,
  ReadinessEvaluationResponse,
  ReadinessRequirementsResponse,
  ReadinessRuleListResponse,
  ReadinessStatusResponse,
  RecordTrainingAssessmentAttemptRequest,
  RecordTrainingCompletionRequest,
  RecordTrainingInstructorRunAttendanceResponse,
  RenewReadinessActionRequest,
  RequestReadinessActionApprovalRequest,
  SubmitAssessmentSessionRequest,
  TrainingAdminOverviewResponse,
  TrainingAssessmentAttempt,
  TrainingAssessmentCatalogResponse,
  TrainingAssessmentDetailResponse,
  TrainingAssessmentSessionResponse,
  TrainingAssessmentSessionResultResponse,
  TrainingCatalogResponse,
  TrainingCohort,
  TrainingCohortListResponse,
  TrainingCourseCurriculumResponse,
  TrainingCourseId,
  TrainingEnrollment,
  TrainingEnrollmentListResponse,
  TrainingInstructorRunRuntimeDetailResponse,
  TrainingPathwayListResponse,
  TrainingTranscriptResponse,
  UpdateCourseStudioDraftRequest,
  UpdateInstructorCourseRunRequest,
  UpdateTrainingCohortRequest,
  UpdateTrainingInstructorRunAssignmentRequest,
  UpdateTrainingInstructorRunAssignmentResponse,
  UpdateTrainingInstructorRunGradingQueueRequest,
  UpdateTrainingInstructorRunGradingQueueResponse,
  UpdateTrainingInstructorRunSessionRequest,
  UpdateTrainingInstructorRunSessionResponse,
} from './legacyLearningTypes'

export const legacyLearningApi = {
  async getTrainingCatalog(): Promise<TrainingCatalogResponse> {
    const response = await api.get('/training/catalog')
    return response.data
  },

  async getTrainingPathways(): Promise<TrainingPathwayListResponse> {
    const response = await api.get('/training/pathways')
    return response.data
  },

  async listTrainingEnrollments(userId?: string): Promise<TrainingEnrollmentListResponse> {
    const response = await api.get('/training/enrollments', {
      params: userId ? { user_id: userId } : undefined,
    })
    return response.data
  },

  async getTrainingAdminOverview(): Promise<TrainingAdminOverviewResponse> {
    const response = await api.get('/training/admin/overview')
    return response.data
  },

  async listTrainingCohorts(): Promise<TrainingCohortListResponse> {
    const response = await api.get('/training/admin/cohorts')
    return response.data
  },

  async listCourseStudioDrafts(): Promise<CourseStudioDraftListResponse> {
    const response = await api.get('/training/admin/course-studio')
    return response.data
  },

  async createCourseStudioDraft(
    request: CreateCourseStudioDraftRequest,
  ): Promise<CourseStudioDraft> {
    const response = await api.post('/training/admin/course-studio', request)
    return response.data
  },

  async updateCourseStudioDraft(
    draftId: string,
    request: UpdateCourseStudioDraftRequest,
  ): Promise<CourseStudioDraft> {
    const response = await api.put(`/training/admin/course-studio/${draftId}`, request)
    return response.data
  },

  async publishCourseStudioDraft(
    draftId: string,
  ): Promise<PublishCourseStudioDraftResponse> {
    const response = await api.post(`/training/admin/course-studio/${draftId}/publish`)
    return response.data
  },

  async listInstructorCourseRuns(): Promise<InstructorCourseRunListResponse> {
    const response = await api.get('/training/admin/instructor-runs')
    return response.data
  },

  async getTrainingInstructorRunRuntime(
    runId: string,
  ): Promise<TrainingInstructorRunRuntimeDetailResponse> {
    const response = await api.get(`/training/admin/instructor-runs/${runId}/runtime`)
    return response.data
  },

  async recordTrainingInstructorRunAttendance(
    runId: string,
    sessionId: string,
    request: CreateTrainingInstructorRunAttendanceRequest,
  ): Promise<RecordTrainingInstructorRunAttendanceResponse> {
    const response = await api.post(`/training/admin/instructor-runs/${runId}/sessions/${sessionId}/attendance`, request)
    return response.data
  },

  async createTrainingInstructorRunSession(
    runId: string,
    request: CreateTrainingInstructorRunSessionRequest,
  ): Promise<CreateTrainingInstructorRunSessionResponse> {
    const response = await api.post(`/training/admin/instructor-runs/${runId}/sessions`, request)
    return response.data
  },

  async updateTrainingInstructorRunSession(
    runId: string,
    sessionId: string,
    request: UpdateTrainingInstructorRunSessionRequest,
  ): Promise<UpdateTrainingInstructorRunSessionResponse> {
    const response = await api.put(`/training/admin/instructor-runs/${runId}/sessions/${sessionId}`, request)
    return response.data
  },

  async createTrainingInstructorRunAssignment(
    runId: string,
    request: CreateTrainingInstructorRunAssignmentRequest,
  ): Promise<CreateTrainingInstructorRunAssignmentResponse> {
    const response = await api.post(`/training/admin/instructor-runs/${runId}/assignments`, request)
    return response.data
  },

  async updateTrainingInstructorRunAssignment(
    runId: string,
    assignmentId: string,
    request: UpdateTrainingInstructorRunAssignmentRequest,
  ): Promise<UpdateTrainingInstructorRunAssignmentResponse> {
    const response = await api.put(`/training/admin/instructor-runs/${runId}/assignments/${assignmentId}`, request)
    return response.data
  },

  async updateTrainingInstructorRunGradingQueue(
    runId: string,
    queueId: string,
    request: UpdateTrainingInstructorRunGradingQueueRequest,
  ): Promise<UpdateTrainingInstructorRunGradingQueueResponse> {
    const response = await api.put(`/training/admin/instructor-runs/${runId}/grading-queue/${queueId}`, request)
    return response.data
  },

  async gradeTrainingInstructorRunAttempt(
    runId: string,
    attemptId: string,
    request: GradeTrainingInstructorRunAttemptRequest,
  ): Promise<GradeTrainingInstructorRunAttemptResponse> {
    const response = await api.post(`/training/admin/instructor-runs/${runId}/attempts/${attemptId}/grade`, request)
    return response.data
  },

  async createInstructorCourseRun(
    request: CreateInstructorCourseRunRequest,
  ): Promise<InstructorCourseRun> {
    const response = await api.post('/training/admin/instructor-runs', request)
    return response.data
  },

  async updateInstructorCourseRun(
    runId: string,
    request: UpdateInstructorCourseRunRequest,
  ): Promise<InstructorCourseRun> {
    const response = await api.put(`/training/admin/instructor-runs/${runId}`, request)
    return response.data
  },

  async launchInstructorCourseRun(
    runId: string,
  ): Promise<LaunchInstructorCourseRunResponse> {
    const response = await api.post(`/training/admin/instructor-runs/${runId}/launch`)
    return response.data
  },

  async createTrainingCohort(
    request: CreateTrainingCohortRequest,
  ): Promise<TrainingCohort> {
    const response = await api.post('/training/admin/cohorts', request)
    return response.data
  },

  async updateTrainingCohort(
    cohortId: string,
    request: UpdateTrainingCohortRequest,
  ): Promise<TrainingCohort> {
    const response = await api.put(`/training/admin/cohorts/${cohortId}`, request)
    return response.data
  },

  async assignTrainingCohort(cohortId: string): Promise<AssignTrainingCohortResponse> {
    const response = await api.post(`/training/admin/cohorts/${cohortId}/assign`)
    return response.data
  },

  async createTrainingEnrollment(
    request: CreateTrainingEnrollmentRequest,
  ): Promise<TrainingEnrollment> {
    const response = await api.post('/training/enrollments', request)
    return response.data
  },

  async recordTrainingCompletion(
    request: RecordTrainingCompletionRequest,
  ): Promise<TrainingEnrollment> {
    const response = await api.post('/training/completions', request)
    return response.data
  },

  async getTrainingCourseCurriculum(
    courseId: TrainingCourseId,
  ): Promise<TrainingCourseCurriculumResponse> {
    const response = await api.get(`/training/courses/${courseId}`)
    return response.data
  },

  async completeTrainingLesson(
    courseId: TrainingCourseId,
    lessonId: string,
  ): Promise<TrainingCourseCurriculumResponse> {
    const response = await api.post(`/training/courses/${courseId}/lessons/${lessonId}/complete`)
    return response.data
  },

  async listTrainingAssessments(): Promise<TrainingAssessmentCatalogResponse> {
    const response = await api.get('/training/assessments')
    return response.data
  },

  async getTrainingAssessmentDetail(
    assessmentId: string,
  ): Promise<TrainingAssessmentDetailResponse> {
    const response = await api.get(`/training/assessments/${assessmentId}`)
    return response.data
  },

  async listPracticeExams(): Promise<PracticeExamCatalogResponse> {
    const response = await api.get('/training/practice-exams')
    return response.data
  },

  async createTrainingAssessmentSession(
    assessmentId: string,
    request: CreateAssessmentSessionRequest = {},
  ): Promise<TrainingAssessmentSessionResponse> {
    const response = await api.post(`/training/assessments/${assessmentId}/sessions`, request)
    return response.data
  },

  async recordTrainingAssessmentAttempt(
    request: RecordTrainingAssessmentAttemptRequest,
  ): Promise<TrainingAssessmentAttempt> {
    const response = await api.post('/training/practice-exams/attempts', request)
    return response.data
  },

  async submitTrainingAssessmentSession(
    sessionId: string,
    request: SubmitAssessmentSessionRequest,
  ): Promise<TrainingAssessmentSessionResultResponse> {
    const response = await api.post(`/training/assessment-sessions/${sessionId}/submit`, request)
    return response.data
  },

  async getTrainingTranscript(userId?: string): Promise<TrainingTranscriptResponse> {
    const response = await api.get('/training/transcript', {
      params: userId ? { user_id: userId } : undefined,
    })
    return response.data
  },

  async getReadinessRequirements(userId?: string): Promise<ReadinessRequirementsResponse> {
    const response = await api.get('/readiness/requirements', {
      params: userId ? { user_id: userId } : undefined,
    })
    return response.data
  },

  async getReadinessStatus(userId?: string): Promise<ReadinessStatusResponse> {
    const response = await api.get('/readiness/status', {
      params: userId ? { user_id: userId } : undefined,
    })
    return response.data
  },

  async getReadinessActions(userId?: string): Promise<ReadinessActionsResponse> {
    const response = await api.get('/readiness/actions', {
      params: userId ? { user_id: userId } : undefined,
    })
    return response.data
  },

  async getReadinessDecisions(userId?: string): Promise<ReadinessDecisionListResponse> {
    const response = await api.get('/readiness/decisions', {
      params: userId ? { user_id: userId } : undefined,
    })
    return response.data
  },

  async enrollReadinessAction(
    actionId: string,
    request: EnrollReadinessActionRequest = {},
  ): Promise<ReadinessActionEnrollmentResponse> {
    const response = await api.post(`/readiness/actions/${encodeURIComponent(actionId)}/enroll`, request)
    return response.data
  },

  async assignReadinessRemediation(
    actionId: string,
    request: AssignReadinessActionRemediationRequest = {},
  ): Promise<ReadinessActionRemediationResponse> {
    const response = await api.post(`/readiness/actions/${encodeURIComponent(actionId)}/remediation`, request)
    return response.data
  },

  async dispatchReadinessActionNotification(
    actionId: string,
    request: DispatchReadinessActionNotificationRequest = {},
  ): Promise<ReadinessActionDispatchResponse> {
    const response = await api.post(`/readiness/actions/${encodeURIComponent(actionId)}/dispatch`, request)
    return response.data
  },

  async requestReadinessActionApproval(
    actionId: string,
    request: RequestReadinessActionApprovalRequest = {},
  ): Promise<ReadinessActionApprovalResponse> {
    const response = await api.post(`/readiness/actions/${encodeURIComponent(actionId)}/request-approval`, request)
    return response.data
  },

  async approveReadinessAction(
    actionId: string,
    request: ApproveReadinessActionRequest = {},
  ): Promise<ReadinessActionApprovalResponse> {
    const response = await api.post(`/readiness/actions/${encodeURIComponent(actionId)}/approve`, request)
    return response.data
  },

  async renewReadinessAction(
    actionId: string,
    request: RenewReadinessActionRequest = {},
  ): Promise<ReadinessActionRenewalResponse> {
    const response = await api.post(`/readiness/actions/${encodeURIComponent(actionId)}/renew`, request)
    return response.data
  },

  async evaluateReadiness(
    request: ReadinessEvaluationRequest = {},
  ): Promise<ReadinessEvaluationResponse> {
    const response = await api.post('/readiness/evaluate', request)
    return response.data
  },

  async getReadinessRules(): Promise<ReadinessRuleListResponse> {
    const response = await api.get('/readiness/rules')
    return response.data
  },

  async listQualifications(userId?: string): Promise<QualificationListResponse> {
    const response = await api.get('/qualifications', {
      params: userId ? { user_id: userId } : undefined,
    })
    return response.data
  },

  async importQualifications(
    request: ImportQualificationsRequest,
  ): Promise<QualificationListResponse> {
    const response = await api.post('/qualifications/import', request)
    return response.data
  },
}
