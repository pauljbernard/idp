import { api } from './iamHttpClient';
export const legacyLmsApi = {
    async getLmsSummary() {
        const response = await api.get('/lms/summary');
        return response.data;
    },
    async getLmsOperationsSummary() {
        const response = await api.get('/lms/operations/summary');
        return response.data;
    },
    async getLmsOperationsDiagnostics() {
        const response = await api.get('/lms/operations/diagnostics');
        return response.data;
    },
    async getLmsOperationsHealth() {
        const response = await api.get('/lms/operations/health');
        return response.data;
    },
    async listLmsRunbooks() {
        const response = await api.get('/lms/operations/runbooks');
        return response.data;
    },
    async listLmsBackups() {
        const response = await api.get('/lms/operations/backups');
        return response.data;
    },
    async createLmsBackup(request) {
        const response = await api.post('/lms/operations/backups', request ?? {});
        return response.data;
    },
    async listLmsRestores() {
        const response = await api.get('/lms/operations/restores');
        return response.data;
    },
    async createLmsRestore(request) {
        const response = await api.post('/lms/operations/restores', request);
        return response.data;
    },
    async listLmsExportArtifacts() {
        const response = await api.get('/lms/operations/exports');
        return response.data;
    },
    async createLmsExportArtifact(request) {
        const response = await api.post('/lms/operations/exports', request ?? {});
        return response.data;
    },
    async listLmsImportValidations() {
        const response = await api.get('/lms/operations/import-validations');
        return response.data;
    },
    async createLmsImportValidation(request) {
        const response = await api.post('/lms/operations/import-validations', request);
        return response.data;
    },
    async listLmsBenchmarkRuns() {
        const response = await api.get('/lms/operations/benchmarks');
        return response.data;
    },
    async runLmsBenchmarks() {
        const response = await api.post('/lms/operations/benchmarks', {});
        return response.data;
    },
    async listLmsResilienceRuns() {
        const response = await api.get('/lms/operations/resilience');
        return response.data;
    },
    async runLmsResilience() {
        const response = await api.post('/lms/operations/resilience', {});
        return response.data;
    },
    async listLmsReadinessReviews() {
        const response = await api.get('/lms/operations/readiness-review');
        return response.data;
    },
    async createLmsReadinessReview(request) {
        const response = await api.post('/lms/operations/readiness-review', request ?? {});
        return response.data;
    },
    async getLmsReviewSummary() {
        const response = await api.get('/lms/review/summary');
        return response.data;
    },
    async getLmsStandardsMatrix() {
        const response = await api.get('/lms/review/standards-matrix');
        return response.data;
    },
    async getLmsInteroperabilityReview() {
        const response = await api.get('/lms/review/interoperability');
        return response.data;
    },
    async getLmsDifferentiationReview() {
        const response = await api.get('/lms/review/differentiation');
        return response.data;
    },
    async listLmsFormalReviews() {
        const response = await api.get('/lms/review/formal');
        return response.data;
    },
    async createLmsFormalReview(request) {
        const response = await api.post('/lms/review/formal', request ?? {});
        return response.data;
    },
    async listLmsValidationDomains() {
        const response = await api.get('/lms/validation-domains');
        return response.data;
    },
    async listLmsPortals(filters) {
        const response = await api.get('/lms/portals', {
            params: {
                delivery_mode: filters?.deliveryMode,
                status: filters?.status,
                validation_domain_id: filters?.validationDomainId,
            },
        });
        return response.data;
    },
    async createLmsPortal(request) {
        const response = await api.post('/lms/portals', request);
        return response.data;
    },
    async updateLmsPortal(portalId, request) {
        const response = await api.put(`/lms/portals/${portalId}`, request);
        return response.data;
    },
    async listLmsCatalogs(filters) {
        const response = await api.get('/lms/catalogs', {
            params: {
                portal_id: filters?.portalId,
                status: filters?.status,
                visibility: filters?.visibility,
            },
        });
        return response.data;
    },
    async createLmsCatalog(request) {
        const response = await api.post('/lms/catalogs', request);
        return response.data;
    },
    async updateLmsCatalog(catalogId, request) {
        const response = await api.put(`/lms/catalogs/${catalogId}`, request);
        return response.data;
    },
    async listLmsPrograms(filters) {
        const response = await api.get('/lms/programs', {
            params: {
                portal_id: filters?.portalId,
                catalog_id: filters?.catalogId,
                status: filters?.status,
                delivery_model: filters?.deliveryModel,
            },
        });
        return response.data;
    },
    async createLmsProgram(request) {
        const response = await api.post('/lms/programs', request);
        return response.data;
    },
    async updateLmsProgram(programId, request) {
        const response = await api.put(`/lms/programs/${programId}`, request);
        return response.data;
    },
    async listLmsPathways(filters) {
        const response = await api.get('/lms/pathways', {
            params: {
                portal_id: filters?.portalId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsPathway(request) {
        const response = await api.post('/lms/pathways', request);
        return response.data;
    },
    async updateLmsPathway(pathwayId, request) {
        const response = await api.put(`/lms/pathways/${pathwayId}`, request);
        return response.data;
    },
    async listLmsCertifications(filters) {
        const response = await api.get('/lms/certifications', {
            params: {
                portal_id: filters?.portalId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsCertification(request) {
        const response = await api.post('/lms/certifications', request);
        return response.data;
    },
    async updateLmsCertification(certificationId, request) {
        const response = await api.put(`/lms/certifications/${certificationId}`, request);
        return response.data;
    },
    async listLmsEmbeddedBindings(filters) {
        const response = await api.get('/lms/embedded-bindings', {
            params: {
                portal_id: filters?.portalId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsEmbeddedBinding(request) {
        const response = await api.post('/lms/embedded-bindings', request);
        return response.data;
    },
    async updateLmsEmbeddedBinding(bindingId, request) {
        const response = await api.put(`/lms/embedded-bindings/${bindingId}`, request);
        return response.data;
    },
    async listLmsCmsBindings(filters) {
        const response = await api.get('/lms/cms-bindings', {
            params: {
                portal_id: filters?.portalId,
                catalog_id: filters?.catalogId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsCmsBinding(request) {
        const response = await api.post('/lms/cms-bindings', request);
        return response.data;
    },
    async updateLmsCmsBinding(bindingId, request) {
        const response = await api.put(`/lms/cms-bindings/${bindingId}`, request);
        return response.data;
    },
    async listLmsLessonPackageBindings(filters) {
        const response = await api.get('/lms/lesson-package-bindings', {
            params: {
                portal_id: filters?.portalId,
                program_id: filters?.programId,
                cms_binding_id: filters?.cmsBindingId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsLessonPackageBinding(request) {
        const response = await api.post('/lms/lesson-package-bindings', request);
        return response.data;
    },
    async updateLmsLessonPackageBinding(lessonPackageBindingId, request) {
        const response = await api.put(`/lms/lesson-package-bindings/${lessonPackageBindingId}`, request);
        return response.data;
    },
    async listLmsAssessmentPackageBindings(filters) {
        const response = await api.get('/lms/assessment-package-bindings', {
            params: {
                portal_id: filters?.portalId,
                program_id: filters?.programId,
                assignment_id: filters?.assignmentId,
                cms_binding_id: filters?.cmsBindingId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsAssessmentPackageBinding(request) {
        const response = await api.post('/lms/assessment-package-bindings', request);
        return response.data;
    },
    async updateLmsAssessmentPackageBinding(assessmentPackageBindingId, request) {
        const response = await api.put(`/lms/assessment-package-bindings/${assessmentPackageBindingId}`, request);
        return response.data;
    },
    async listLmsRemediationBindings(filters) {
        const response = await api.get('/lms/remediation-bindings', {
            params: {
                portal_id: filters?.portalId,
                program_id: filters?.programId,
                cms_binding_id: filters?.cmsBindingId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsRemediationBinding(request) {
        const response = await api.post('/lms/remediation-bindings', request);
        return response.data;
    },
    async updateLmsRemediationBinding(remediationBindingId, request) {
        const response = await api.put(`/lms/remediation-bindings/${remediationBindingId}`, request);
        return response.data;
    },
    async listLmsContentManifests(filters) {
        const response = await api.get('/lms/content-manifests', {
            params: {
                portal_id: filters?.portalId,
                program_id: filters?.programId,
                enrollment_id: filters?.enrollmentId,
                learner_principal_id: filters?.learnerPrincipalId,
            },
        });
        return response.data;
    },
    async resolveLmsContentManifest(request) {
        const response = await api.post('/lms/content-manifests/resolve', request);
        return response.data;
    },
    async listLmsScormPackages(filters) {
        const response = await api.get('/lms/scorm-packages', {
            params: {
                portal_id: filters?.portalId,
                program_id: filters?.programId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsScormPackage(request) {
        const response = await api.post('/lms/scorm-packages', request);
        return response.data;
    },
    async updateLmsScormPackage(scormPackageId, request) {
        const response = await api.put(`/lms/scorm-packages/${scormPackageId}`, request);
        return response.data;
    },
    async listLmsScormRegistrations(filters) {
        const response = await api.get('/lms/scorm-registrations', {
            params: {
                portal_id: filters?.portalId,
                program_id: filters?.programId,
                enrollment_id: filters?.enrollmentId,
                scorm_package_id: filters?.scormPackageId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsScormRegistration(request) {
        const response = await api.post('/lms/scorm-registrations', request);
        return response.data;
    },
    async updateLmsScormRegistration(scormRegistrationId, request) {
        const response = await api.put(`/lms/scorm-registrations/${scormRegistrationId}`, request);
        return response.data;
    },
    async listLmsXapiProviders(filters) {
        const response = await api.get('/lms/xapi-providers', {
            params: {
                portal_id: filters?.portalId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsXapiProvider(request) {
        const response = await api.post('/lms/xapi-providers', request);
        return response.data;
    },
    async updateLmsXapiProvider(providerId, request) {
        const response = await api.put(`/lms/xapi-providers/${providerId}`, request);
        return response.data;
    },
    async listLmsXapiStatements(filters) {
        const response = await api.get('/lms/xapi-statements', {
            params: {
                portal_id: filters?.portalId,
                provider_id: filters?.providerId,
                program_id: filters?.programId,
                enrollment_id: filters?.enrollmentId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async ingestLmsXapiStatement(request) {
        const response = await api.post('/lms/xapi-statements', request);
        return response.data;
    },
    async listLmsCmi5Packages(filters) {
        const response = await api.get('/lms/cmi5-packages', {
            params: {
                portal_id: filters?.portalId,
                program_id: filters?.programId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsCmi5Package(request) {
        const response = await api.post('/lms/cmi5-packages', request);
        return response.data;
    },
    async updateLmsCmi5Package(cmi5PackageId, request) {
        const response = await api.put(`/lms/cmi5-packages/${cmi5PackageId}`, request);
        return response.data;
    },
    async listLmsCmi5Registrations(filters) {
        const response = await api.get('/lms/cmi5-registrations', {
            params: {
                portal_id: filters?.portalId,
                program_id: filters?.programId,
                enrollment_id: filters?.enrollmentId,
                cmi5_package_id: filters?.cmi5PackageId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsCmi5Registration(request) {
        const response = await api.post('/lms/cmi5-registrations', request);
        return response.data;
    },
    async updateLmsCmi5Registration(cmi5RegistrationId, request) {
        const response = await api.put(`/lms/cmi5-registrations/${cmi5RegistrationId}`, request);
        return response.data;
    },
    async listLmsLtiTools(filters) {
        const response = await api.get('/lms/lti-tools', {
            params: {
                portal_id: filters?.portalId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsLtiTool(request) {
        const response = await api.post('/lms/lti-tools', request);
        return response.data;
    },
    async updateLmsLtiTool(toolId, request) {
        const response = await api.put(`/lms/lti-tools/${toolId}`, request);
        return response.data;
    },
    async listLmsLtiDeployments(filters) {
        const response = await api.get('/lms/lti-deployments', {
            params: {
                portal_id: filters?.portalId,
                tool_id: filters?.toolId,
                program_id: filters?.programId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsLtiDeployment(request) {
        const response = await api.post('/lms/lti-deployments', request);
        return response.data;
    },
    async updateLmsLtiDeployment(deploymentId, request) {
        const response = await api.put(`/lms/lti-deployments/${deploymentId}`, request);
        return response.data;
    },
    async listLmsLtiLaunches(filters) {
        const response = await api.get('/lms/lti-launches', {
            params: {
                portal_id: filters?.portalId,
                deployment_id: filters?.deploymentId,
                enrollment_id: filters?.enrollmentId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsLtiLaunch(request) {
        const response = await api.post('/lms/lti-launches', request);
        return response.data;
    },
    async updateLmsLtiLaunch(launchId, request) {
        const response = await api.put(`/lms/lti-launches/${launchId}`, request);
        return response.data;
    },
    async listLmsRosterExports(filters) {
        const response = await api.get('/lms/roster-exports', {
            params: {
                portal_id: filters?.portalId,
                course_run_id: filters?.courseRunId,
                target_kind: filters?.targetKind,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsRosterExport(request) {
        const response = await api.post('/lms/roster-exports', request);
        return response.data;
    },
    async updateLmsRosterExport(rosterExportId, request) {
        const response = await api.put(`/lms/roster-exports/${rosterExportId}`, request);
        return response.data;
    },
    async listLmsDiscussionThreads(filters) {
        const response = await api.get('/lms/discussion-threads', {
            params: {
                portal_id: filters?.portalId,
                program_id: filters?.programId,
                course_run_id: filters?.courseRunId,
                assignment_id: filters?.assignmentId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsDiscussionThread(request) {
        const response = await api.post('/lms/discussion-threads', request);
        return response.data;
    },
    async updateLmsDiscussionThread(threadId, request) {
        const response = await api.put(`/lms/discussion-threads/${threadId}`, request);
        return response.data;
    },
    async listLmsDiscussionPosts(filters) {
        const response = await api.get('/lms/discussion-posts', {
            params: {
                thread_id: filters?.threadId,
                portal_id: filters?.portalId,
            },
        });
        return response.data;
    },
    async createLmsDiscussionPost(request) {
        const response = await api.post('/lms/discussion-posts', request);
        return response.data;
    },
    async updateLmsDiscussionPost(postId, request) {
        const response = await api.put(`/lms/discussion-posts/${postId}`, request);
        return response.data;
    },
    async listLmsNotificationCampaigns(filters) {
        const response = await api.get('/lms/notification-campaigns', {
            params: {
                portal_id: filters?.portalId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsNotificationCampaign(request) {
        const response = await api.post('/lms/notification-campaigns', request);
        return response.data;
    },
    async updateLmsNotificationCampaign(campaignId, request) {
        const response = await api.put(`/lms/notification-campaigns/${campaignId}`, request);
        return response.data;
    },
    async listLmsLearnerRisk(filters) {
        const response = await api.get('/lms/analytics/learner-risk', {
            params: {
                portal_id: filters?.portalId,
                program_id: filters?.programId,
                risk_level: filters?.riskLevel,
            },
        });
        return response.data;
    },
    async listLmsInstructorConsole(filters) {
        const response = await api.get('/lms/analytics/instructor-console', {
            params: {
                portal_id: filters?.portalId,
                instructor_principal_id: filters?.instructorPrincipalId,
            },
        });
        return response.data;
    },
    async listLmsManagerConsole(filters) {
        const response = await api.get('/lms/analytics/manager-console', {
            params: {
                portal_id: filters?.portalId,
                manager_principal_id: filters?.managerPrincipalId,
            },
        });
        return response.data;
    },
    async listLmsAutomationRules(filters) {
        const response = await api.get('/lms/automation-rules', {
            params: {
                portal_id: filters?.portalId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsAutomationRule(request) {
        const response = await api.post('/lms/automation-rules', request);
        return response.data;
    },
    async updateLmsAutomationRule(ruleId, request) {
        const response = await api.put(`/lms/automation-rules/${ruleId}`, request);
        return response.data;
    },
    async listLmsAutomationRuns(filters) {
        const response = await api.get('/lms/automation-runs', {
            params: {
                portal_id: filters?.portalId,
                rule_id: filters?.ruleId,
            },
        });
        return response.data;
    },
    async runLmsAutomationRule(ruleId) {
        const response = await api.post(`/lms/automation-rules/${ruleId}/run`);
        return response.data;
    },
    async listLmsIdentityBindings(filters) {
        const response = await api.get('/iam/external-identity-bindings', {
            params: {
                consumer_application: 'lms',
                portal_id: filters?.portalId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsIdentityBinding(request) {
        const response = await api.post('/iam/external-identity-bindings', {
            ...request,
            consumer_application: 'lms',
        });
        return response.data;
    },
    async updateLmsIdentityBinding(bindingId, request) {
        const response = await api.put(`/iam/external-identity-bindings/${bindingId}`, {
            ...request,
            consumer_application: 'lms',
        });
        return response.data;
    },
    async listLmsCommerceBindings(filters) {
        const response = await api.get('/lms/commerce-bindings', {
            params: {
                portal_id: filters?.portalId,
                catalog_id: filters?.catalogId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsCommerceBinding(request) {
        const response = await api.post('/lms/commerce-bindings', request);
        return response.data;
    },
    async updateLmsCommerceBinding(bindingId, request) {
        const response = await api.put(`/lms/commerce-bindings/${bindingId}`, request);
        return response.data;
    },
    async listLmsConsumerBindings(filters) {
        const response = await api.get('/lms/consumer-bindings', {
            params: {
                portal_id: filters?.portalId,
                consumer_application_id: filters?.consumerApplicationId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsConsumerBinding(request) {
        const response = await api.post('/lms/consumer-bindings', request);
        return response.data;
    },
    async updateLmsConsumerBinding(bindingId, request) {
        const response = await api.put(`/lms/consumer-bindings/${bindingId}`, request);
        return response.data;
    },
    async listLmsCommerceActivations(filters) {
        const response = await api.get('/lms/commerce-activations', {
            params: {
                portal_id: filters?.portalId,
                consumer_binding_id: filters?.consumerBindingId,
                learner_principal_id: filters?.learnerPrincipalId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsCommerceActivation(request) {
        const response = await api.post('/lms/commerce-activations', request);
        return response.data;
    },
    async updateLmsCommerceActivation(activationId, request) {
        const response = await api.put(`/lms/commerce-activations/${activationId}`, request);
        return response.data;
    },
    async listLmsAccessResolutions(filters) {
        const response = await api.get('/lms/access-resolutions', {
            params: {
                portal_id: filters?.portalId,
                learner_principal_id: filters?.learnerPrincipalId,
                consumer_binding_id: filters?.consumerBindingId,
            },
        });
        return response.data;
    },
    async resolveLmsAccess(request) {
        const response = await api.post('/lms/access-resolutions/resolve', request);
        return response.data;
    },
    async listLmsEnrollments(filters) {
        const response = await api.get('/lms/enrollments', {
            params: {
                portal_id: filters?.portalId,
                program_id: filters?.programId,
                cohort_id: filters?.cohortId,
                learner_principal_id: filters?.learnerPrincipalId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsEnrollment(request) {
        const response = await api.post('/lms/enrollments', request);
        return response.data;
    },
    async updateLmsEnrollment(enrollmentId, request) {
        const response = await api.put(`/lms/enrollments/${enrollmentId}`, request);
        return response.data;
    },
    async listLmsCohorts(filters) {
        const response = await api.get('/lms/cohorts', {
            params: {
                portal_id: filters?.portalId,
                program_id: filters?.programId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsCohort(request) {
        const response = await api.post('/lms/cohorts', request);
        return response.data;
    },
    async updateLmsCohort(cohortId, request) {
        const response = await api.put(`/lms/cohorts/${cohortId}`, request);
        return response.data;
    },
    async listLmsCourseRuns(filters) {
        const response = await api.get('/lms/course-runs', {
            params: {
                portal_id: filters?.portalId,
                program_id: filters?.programId,
                cohort_id: filters?.cohortId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsCourseRun(request) {
        const response = await api.post('/lms/course-runs', request);
        return response.data;
    },
    async updateLmsCourseRun(courseRunId, request) {
        const response = await api.put(`/lms/course-runs/${courseRunId}`, request);
        return response.data;
    },
    async launchLmsCourseRun(courseRunId) {
        const response = await api.post(`/lms/course-runs/${courseRunId}/launch`, {});
        return response.data;
    },
    async listLmsSessions(filters) {
        const response = await api.get('/lms/sessions', {
            params: {
                portal_id: filters?.portalId,
                course_run_id: filters?.courseRunId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsSession(request) {
        const response = await api.post('/lms/sessions', request);
        return response.data;
    },
    async updateLmsSession(sessionId, request) {
        const response = await api.put(`/lms/sessions/${sessionId}`, request);
        return response.data;
    },
    async listLmsAttendance(filters) {
        const response = await api.get('/lms/attendance', {
            params: {
                portal_id: filters?.portalId,
                course_run_id: filters?.courseRunId,
                session_id: filters?.sessionId,
                enrollment_id: filters?.enrollmentId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsAttendance(request) {
        const response = await api.post('/lms/attendance', request);
        return response.data;
    },
    async updateLmsAttendance(attendanceId, request) {
        const response = await api.put(`/lms/attendance/${attendanceId}`, request);
        return response.data;
    },
    async listLmsAssignments(filters) {
        const response = await api.get('/lms/assignments', {
            params: {
                portal_id: filters?.portalId,
                program_id: filters?.programId,
                course_run_id: filters?.courseRunId,
                status: filters?.status,
                assignment_type: filters?.assignmentType,
            },
        });
        return response.data;
    },
    async createLmsAssignment(request) {
        const response = await api.post('/lms/assignments', request);
        return response.data;
    },
    async updateLmsAssignment(assignmentId, request) {
        const response = await api.put(`/lms/assignments/${assignmentId}`, request);
        return response.data;
    },
    async listLmsAttempts(filters) {
        const response = await api.get('/lms/attempts', {
            params: {
                portal_id: filters?.portalId,
                program_id: filters?.programId,
                assignment_id: filters?.assignmentId,
                enrollment_id: filters?.enrollmentId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsAttempt(request) {
        const response = await api.post('/lms/attempts', request);
        return response.data;
    },
    async submitLmsAttempt(attemptId, request) {
        const response = await api.post(`/lms/attempts/${attemptId}/submit`, request);
        return response.data;
    },
    async gradeLmsAttempt(attemptId, request) {
        const response = await api.post(`/lms/attempts/${attemptId}/grade`, request);
        return response.data;
    },
    async listLmsGradingQueue(filters) {
        const response = await api.get('/lms/grading-queue', {
            params: {
                portal_id: filters?.portalId,
                program_id: filters?.programId,
                status: filters?.status,
                grader_principal_id: filters?.graderPrincipalId,
            },
        });
        return response.data;
    },
    async updateLmsGradingQueue(queueId, request) {
        const response = await api.put(`/lms/grading-queue/${queueId}`, request);
        return response.data;
    },
    async listLmsRubrics(filters) {
        const response = await api.get('/lms/rubrics', {
            params: {
                portal_id: filters?.portalId,
                program_id: filters?.programId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsRubric(request) {
        const response = await api.post('/lms/rubrics', request);
        return response.data;
    },
    async updateLmsRubric(rubricId, request) {
        const response = await api.put(`/lms/rubrics/${rubricId}`, request);
        return response.data;
    },
    async listLmsGradebook(filters) {
        const response = await api.get('/lms/gradebook', {
            params: {
                portal_id: filters?.portalId,
                program_id: filters?.programId,
                enrollment_id: filters?.enrollmentId,
                pass_state: filters?.passState,
            },
        });
        return response.data;
    },
    async listLmsCompetencyFrameworks(filters) {
        const response = await api.get('/lms/competency-frameworks', {
            params: {
                portal_id: filters?.portalId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsCompetencyFramework(request) {
        const response = await api.post('/lms/competency-frameworks', request);
        return response.data;
    },
    async updateLmsCompetencyFramework(frameworkId, request) {
        const response = await api.put(`/lms/competency-frameworks/${frameworkId}`, request);
        return response.data;
    },
    async listLmsCompetencies(filters) {
        const response = await api.get('/lms/competencies', {
            params: {
                portal_id: filters?.portalId,
                framework_id: filters?.frameworkId,
                program_id: filters?.programId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsCompetency(request) {
        const response = await api.post('/lms/competencies', request);
        return response.data;
    },
    async updateLmsCompetency(competencyId, request) {
        const response = await api.put(`/lms/competencies/${competencyId}`, request);
        return response.data;
    },
    async listLmsCompetencyAwards(filters) {
        const response = await api.get('/lms/competency-awards', {
            params: {
                portal_id: filters?.portalId,
                program_id: filters?.programId,
                competency_id: filters?.competencyId,
                learner_principal_id: filters?.learnerPrincipalId,
            },
        });
        return response.data;
    },
    async createLmsCompetencyAward(request) {
        const response = await api.post('/lms/competency-awards', request);
        return response.data;
    },
    async listLmsBadges(filters) {
        const response = await api.get('/lms/badges', {
            params: {
                portal_id: filters?.portalId,
                certification_id: filters?.certificationId,
                learner_principal_id: filters?.learnerPrincipalId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsBadgeAward(request) {
        const response = await api.post('/lms/badges', request);
        return response.data;
    },
    async updateLmsBadgeAward(badgeAwardId, request) {
        const response = await api.put(`/lms/badges/${badgeAwardId}`, request);
        return response.data;
    },
    async listLmsCertificates(filters) {
        const response = await api.get('/lms/certificates', {
            params: {
                portal_id: filters?.portalId,
                certification_id: filters?.certificationId,
                learner_principal_id: filters?.learnerPrincipalId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async issueLmsCertificate(request) {
        const response = await api.post('/lms/certificates', request);
        return response.data;
    },
    async updateLmsCertificate(certificateId, request) {
        const response = await api.put(`/lms/certificates/${certificateId}`, request);
        return response.data;
    },
    async listLmsTranscripts(filters) {
        const response = await api.get('/lms/transcripts', {
            params: {
                portal_id: filters?.portalId,
                learner_principal_id: filters?.learnerPrincipalId,
            },
        });
        return response.data;
    },
    async listLmsRecertification(filters) {
        const response = await api.get('/lms/recertification', {
            params: {
                portal_id: filters?.portalId,
                certification_id: filters?.certificationId,
                learner_principal_id: filters?.learnerPrincipalId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createLmsRecertification(request) {
        const response = await api.post('/lms/recertification', request);
        return response.data;
    },
    async updateLmsRecertification(recertificationRecordId, request) {
        const response = await api.put(`/lms/recertification/${recertificationRecordId}`, request);
        return response.data;
    },
};
