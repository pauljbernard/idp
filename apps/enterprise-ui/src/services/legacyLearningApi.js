import { api } from './iamHttpClient';
export const legacyLearningApi = {
    async getTrainingCatalog() {
        const response = await api.get('/training/catalog');
        return response.data;
    },
    async getTrainingPathways() {
        const response = await api.get('/training/pathways');
        return response.data;
    },
    async listTrainingEnrollments(userId) {
        const response = await api.get('/training/enrollments', {
            params: userId ? { user_id: userId } : undefined,
        });
        return response.data;
    },
    async getTrainingAdminOverview() {
        const response = await api.get('/training/admin/overview');
        return response.data;
    },
    async listTrainingCohorts() {
        const response = await api.get('/training/admin/cohorts');
        return response.data;
    },
    async listCourseStudioDrafts() {
        const response = await api.get('/training/admin/course-studio');
        return response.data;
    },
    async createCourseStudioDraft(request) {
        const response = await api.post('/training/admin/course-studio', request);
        return response.data;
    },
    async updateCourseStudioDraft(draftId, request) {
        const response = await api.put(`/training/admin/course-studio/${draftId}`, request);
        return response.data;
    },
    async publishCourseStudioDraft(draftId) {
        const response = await api.post(`/training/admin/course-studio/${draftId}/publish`);
        return response.data;
    },
    async listInstructorCourseRuns() {
        const response = await api.get('/training/admin/instructor-runs');
        return response.data;
    },
    async getTrainingInstructorRunRuntime(runId) {
        const response = await api.get(`/training/admin/instructor-runs/${runId}/runtime`);
        return response.data;
    },
    async recordTrainingInstructorRunAttendance(runId, sessionId, request) {
        const response = await api.post(`/training/admin/instructor-runs/${runId}/sessions/${sessionId}/attendance`, request);
        return response.data;
    },
    async createTrainingInstructorRunSession(runId, request) {
        const response = await api.post(`/training/admin/instructor-runs/${runId}/sessions`, request);
        return response.data;
    },
    async updateTrainingInstructorRunSession(runId, sessionId, request) {
        const response = await api.put(`/training/admin/instructor-runs/${runId}/sessions/${sessionId}`, request);
        return response.data;
    },
    async createTrainingInstructorRunAssignment(runId, request) {
        const response = await api.post(`/training/admin/instructor-runs/${runId}/assignments`, request);
        return response.data;
    },
    async updateTrainingInstructorRunAssignment(runId, assignmentId, request) {
        const response = await api.put(`/training/admin/instructor-runs/${runId}/assignments/${assignmentId}`, request);
        return response.data;
    },
    async updateTrainingInstructorRunGradingQueue(runId, queueId, request) {
        const response = await api.put(`/training/admin/instructor-runs/${runId}/grading-queue/${queueId}`, request);
        return response.data;
    },
    async gradeTrainingInstructorRunAttempt(runId, attemptId, request) {
        const response = await api.post(`/training/admin/instructor-runs/${runId}/attempts/${attemptId}/grade`, request);
        return response.data;
    },
    async createInstructorCourseRun(request) {
        const response = await api.post('/training/admin/instructor-runs', request);
        return response.data;
    },
    async updateInstructorCourseRun(runId, request) {
        const response = await api.put(`/training/admin/instructor-runs/${runId}`, request);
        return response.data;
    },
    async launchInstructorCourseRun(runId) {
        const response = await api.post(`/training/admin/instructor-runs/${runId}/launch`);
        return response.data;
    },
    async createTrainingCohort(request) {
        const response = await api.post('/training/admin/cohorts', request);
        return response.data;
    },
    async updateTrainingCohort(cohortId, request) {
        const response = await api.put(`/training/admin/cohorts/${cohortId}`, request);
        return response.data;
    },
    async assignTrainingCohort(cohortId) {
        const response = await api.post(`/training/admin/cohorts/${cohortId}/assign`);
        return response.data;
    },
    async createTrainingEnrollment(request) {
        const response = await api.post('/training/enrollments', request);
        return response.data;
    },
    async recordTrainingCompletion(request) {
        const response = await api.post('/training/completions', request);
        return response.data;
    },
    async getTrainingCourseCurriculum(courseId) {
        const response = await api.get(`/training/courses/${courseId}`);
        return response.data;
    },
    async completeTrainingLesson(courseId, lessonId) {
        const response = await api.post(`/training/courses/${courseId}/lessons/${lessonId}/complete`);
        return response.data;
    },
    async listTrainingAssessments() {
        const response = await api.get('/training/assessments');
        return response.data;
    },
    async getTrainingAssessmentDetail(assessmentId) {
        const response = await api.get(`/training/assessments/${assessmentId}`);
        return response.data;
    },
    async listPracticeExams() {
        const response = await api.get('/training/practice-exams');
        return response.data;
    },
    async createTrainingAssessmentSession(assessmentId, request = {}) {
        const response = await api.post(`/training/assessments/${assessmentId}/sessions`, request);
        return response.data;
    },
    async recordTrainingAssessmentAttempt(request) {
        const response = await api.post('/training/practice-exams/attempts', request);
        return response.data;
    },
    async submitTrainingAssessmentSession(sessionId, request) {
        const response = await api.post(`/training/assessment-sessions/${sessionId}/submit`, request);
        return response.data;
    },
    async getTrainingTranscript(userId) {
        const response = await api.get('/training/transcript', {
            params: userId ? { user_id: userId } : undefined,
        });
        return response.data;
    },
    async getReadinessRequirements(userId) {
        const response = await api.get('/readiness/requirements', {
            params: userId ? { user_id: userId } : undefined,
        });
        return response.data;
    },
    async getReadinessStatus(userId) {
        const response = await api.get('/readiness/status', {
            params: userId ? { user_id: userId } : undefined,
        });
        return response.data;
    },
    async getReadinessActions(userId) {
        const response = await api.get('/readiness/actions', {
            params: userId ? { user_id: userId } : undefined,
        });
        return response.data;
    },
    async getReadinessDecisions(userId) {
        const response = await api.get('/readiness/decisions', {
            params: userId ? { user_id: userId } : undefined,
        });
        return response.data;
    },
    async enrollReadinessAction(actionId, request = {}) {
        const response = await api.post(`/readiness/actions/${encodeURIComponent(actionId)}/enroll`, request);
        return response.data;
    },
    async assignReadinessRemediation(actionId, request = {}) {
        const response = await api.post(`/readiness/actions/${encodeURIComponent(actionId)}/remediation`, request);
        return response.data;
    },
    async dispatchReadinessActionNotification(actionId, request = {}) {
        const response = await api.post(`/readiness/actions/${encodeURIComponent(actionId)}/dispatch`, request);
        return response.data;
    },
    async requestReadinessActionApproval(actionId, request = {}) {
        const response = await api.post(`/readiness/actions/${encodeURIComponent(actionId)}/request-approval`, request);
        return response.data;
    },
    async approveReadinessAction(actionId, request = {}) {
        const response = await api.post(`/readiness/actions/${encodeURIComponent(actionId)}/approve`, request);
        return response.data;
    },
    async renewReadinessAction(actionId, request = {}) {
        const response = await api.post(`/readiness/actions/${encodeURIComponent(actionId)}/renew`, request);
        return response.data;
    },
    async evaluateReadiness(request = {}) {
        const response = await api.post('/readiness/evaluate', request);
        return response.data;
    },
    async getReadinessRules() {
        const response = await api.get('/readiness/rules');
        return response.data;
    },
    async listQualifications(userId) {
        const response = await api.get('/qualifications', {
            params: userId ? { user_id: userId } : undefined,
        });
        return response.data;
    },
    async importQualifications(request) {
        const response = await api.post('/qualifications/import', request);
        return response.data;
    },
};
