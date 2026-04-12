import { api } from './iamHttpClient';
function syncWorkforceCoachingParityAliases(record) {
    return record;
}
function syncWorkforceCoachingParityResponseAliases(response) {
    return {
        ...response,
        parity_mappings: response.parity_mappings.map((record) => syncWorkforceCoachingParityAliases(record)),
    };
}
function normalizeWorkforceCoachingParityRequest(request) {
    return request;
}
export const legacyWorkforceApi = {
    async getWorkforceSummary() {
        const response = await api.get('/workforce/summary');
        return response.data;
    },
    async getWorkforceReviewSummary() {
        const response = await api.get('/workforce/review/summary');
        return response.data;
    },
    async getWorkforceStandardsMatrix() {
        const response = await api.get('/workforce/review/standards-matrix');
        return response.data;
    },
    async getWorkforceInteroperabilityReview() {
        const response = await api.get('/workforce/review/interoperability');
        return response.data;
    },
    async getWorkforceDifferentiationReview() {
        const response = await api.get('/workforce/review/differentiation');
        return response.data;
    },
    async listWorkforceFormalReviews() {
        const response = await api.get('/workforce/review/formal');
        return response.data;
    },
    async createWorkforceFormalReview(request) {
        const response = await api.post('/workforce/review/formal', request ?? {});
        return response.data;
    },
    async listWorkforceAdoptionPlans() {
        const response = await api.get('/workforce/review/adoption-plans');
        return response.data;
    },
    async createWorkforceAdoptionPlan(request) {
        const response = await api.post('/workforce/review/adoption-plans', request ?? {});
        return response.data;
    },
    async listWorkforceValidationDomains() {
        const response = await api.get('/workforce/validation-domains');
        return response.data;
    },
    async listWorkforceRequisitions(filters) {
        const response = await api.get('/workforce/requisitions', {
            params: {
                status: filters?.status,
                employment_type: filters?.employmentType,
                validation_domain_id: filters?.validationDomainId,
            },
        });
        return response.data;
    },
    async createWorkforceRequisition(request) {
        const response = await api.post('/workforce/requisitions', request);
        return response.data;
    },
    async updateWorkforceRequisition(requisitionId, request) {
        const response = await api.put(`/workforce/requisitions/${requisitionId}`, request);
        return response.data;
    },
    async listWorkforceApprovals(filters) {
        const response = await api.get('/workforce/approvals', {
            params: {
                requisition_id: filters?.requisitionId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createWorkforceApproval(request) {
        const response = await api.post('/workforce/approvals', request);
        return response.data;
    },
    async updateWorkforceApproval(approvalId, request) {
        const response = await api.put(`/workforce/approvals/${approvalId}`, request);
        return response.data;
    },
    async listWorkforcePostings(filters) {
        const response = await api.get('/workforce/postings', {
            params: {
                requisition_id: filters?.requisitionId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createWorkforcePosting(request) {
        const response = await api.post('/workforce/postings', request);
        return response.data;
    },
    async updateWorkforcePosting(postingId, request) {
        const response = await api.put(`/workforce/postings/${postingId}`, request);
        return response.data;
    },
    async listWorkforcePostingChannels(filters) {
        const response = await api.get('/workforce/posting-channels', {
            params: {
                posting_id: filters?.postingId,
                status: filters?.status,
                channel_type: filters?.channelType,
            },
        });
        return response.data;
    },
    async createWorkforcePostingChannel(request) {
        const response = await api.post('/workforce/posting-channels', request);
        return response.data;
    },
    async updateWorkforcePostingChannel(postingChannelId, request) {
        const response = await api.put(`/workforce/posting-channels/${postingChannelId}`, request);
        return response.data;
    },
    async listWorkforceCandidates(filters) {
        const response = await api.get('/workforce/candidates', {
            params: {
                status: filters?.status,
                source: filters?.source,
            },
        });
        return response.data;
    },
    async createWorkforceCandidate(request) {
        const response = await api.post('/workforce/candidates', request);
        return response.data;
    },
    async updateWorkforceCandidate(candidateId, request) {
        const response = await api.put(`/workforce/candidates/${candidateId}`, request);
        return response.data;
    },
    async listWorkforceApplications(filters) {
        const response = await api.get('/workforce/applications', {
            params: {
                candidate_id: filters?.candidateId,
                requisition_id: filters?.requisitionId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createWorkforceApplication(request) {
        const response = await api.post('/workforce/applications', request);
        return response.data;
    },
    async updateWorkforceApplication(applicationId, request) {
        const response = await api.put(`/workforce/applications/${applicationId}`, request);
        return response.data;
    },
    async listWorkforceInterviews(filters) {
        const response = await api.get('/workforce/interviews', {
            params: {
                application_id: filters?.applicationId,
                status: filters?.status,
                mode: filters?.mode,
            },
        });
        return response.data;
    },
    async createWorkforceInterview(request) {
        const response = await api.post('/workforce/interviews', request);
        return response.data;
    },
    async updateWorkforceInterview(interviewId, request) {
        const response = await api.put(`/workforce/interviews/${interviewId}`, request);
        return response.data;
    },
    async listWorkforceOffers(filters) {
        const response = await api.get('/workforce/offers', {
            params: {
                application_id: filters?.applicationId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createWorkforceOffer(request) {
        const response = await api.post('/workforce/offers', request);
        return response.data;
    },
    async updateWorkforceOffer(offerId, request) {
        const response = await api.put(`/workforce/offers/${offerId}`, request);
        return response.data;
    },
    async listWorkforceInternalMobility(filters) {
        const response = await api.get('/workforce/internal-mobility', {
            params: {
                employee_user_id: filters?.employeeUserId,
                target_requisition_id: filters?.targetRequisitionId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createWorkforceInternalMobility(request) {
        const response = await api.post('/workforce/internal-mobility', request);
        return response.data;
    },
    async updateWorkforceInternalMobility(internalMobilityCaseId, request) {
        const response = await api.put(`/workforce/internal-mobility/${internalMobilityCaseId}`, request);
        return response.data;
    },
    async listWorkforceTalentPools(filters) {
        const response = await api.get('/workforce/talent-pools', {
            params: {
                owner_user_id: filters?.ownerUserId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createWorkforceTalentPool(request) {
        const response = await api.post('/workforce/talent-pools', request);
        return response.data;
    },
    async updateWorkforceTalentPool(talentPoolId, request) {
        const response = await api.put(`/workforce/talent-pools/${talentPoolId}`, request);
        return response.data;
    },
    async listWorkforceProviderCompanies(filters) {
        const response = await api.get('/workforce/provider-companies', {
            params: {
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createWorkforceProviderCompany(request) {
        const response = await api.post('/workforce/provider-companies', request);
        return response.data;
    },
    async updateWorkforceProviderCompany(providerCompanyId, request) {
        const response = await api.put(`/workforce/provider-companies/${providerCompanyId}`, request);
        return response.data;
    },
    async listWorkforceProviderPeople(filters) {
        const response = await api.get('/workforce/provider-people', {
            params: {
                provider_company_id: filters?.providerCompanyId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createWorkforceProviderPerson(request) {
        const response = await api.post('/workforce/provider-people', request);
        return response.data;
    },
    async updateWorkforceProviderPerson(providerPersonId, request) {
        const response = await api.put(`/workforce/provider-people/${providerPersonId}`, request);
        return response.data;
    },
    async listWorkforceProviderQualifications(filters) {
        const response = await api.get('/workforce/provider-qualifications', {
            params: {
                provider_company_id: filters?.providerCompanyId,
                provider_person_id: filters?.providerPersonId,
                qualification_type: filters?.qualificationType,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createWorkforceProviderQualification(request) {
        const response = await api.post('/workforce/provider-qualifications', request);
        return response.data;
    },
    async updateWorkforceProviderQualification(providerQualificationId, request) {
        const response = await api.put(`/workforce/provider-qualifications/${providerQualificationId}`, request);
        return response.data;
    },
    async listWorkforceEngagements(filters) {
        const response = await api.get('/workforce/engagements', {
            params: {
                provider_company_id: filters?.providerCompanyId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createWorkforceEngagement(request) {
        const response = await api.post('/workforce/engagements', request);
        return response.data;
    },
    async updateWorkforceEngagement(engagementId, request) {
        const response = await api.put(`/workforce/engagements/${engagementId}`, request);
        return response.data;
    },
    async listWorkforceSows(filters) {
        const response = await api.get('/workforce/sows', {
            params: {
                engagement_id: filters?.engagementId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createWorkforceSow(request) {
        const response = await api.post('/workforce/sows', request);
        return response.data;
    },
    async updateWorkforceSow(sowId, request) {
        const response = await api.put(`/workforce/sows/${sowId}`, request);
        return response.data;
    },
    async listWorkforceAssignments(filters) {
        const response = await api.get('/workforce/assignments', {
            params: {
                engagement_id: filters?.engagementId,
                provider_person_id: filters?.providerPersonId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createWorkforceAssignment(request) {
        const response = await api.post('/workforce/assignments', request);
        return response.data;
    },
    async updateWorkforceAssignment(assignmentId, request) {
        const response = await api.put(`/workforce/assignments/${assignmentId}`, request);
        return response.data;
    },
    async listWorkforceMilestones(filters) {
        const response = await api.get('/workforce/milestones', {
            params: {
                engagement_id: filters?.engagementId,
                sow_id: filters?.sowId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createWorkforceMilestone(request) {
        const response = await api.post('/workforce/milestones', request);
        return response.data;
    },
    async updateWorkforceMilestone(milestoneId, request) {
        const response = await api.put(`/workforce/milestones/${milestoneId}`, request);
        return response.data;
    },
    async listWorkforceTimesheets(filters) {
        const response = await api.get('/workforce/timesheets', {
            params: {
                assignment_id: filters?.assignmentId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createWorkforceTimesheet(request) {
        const response = await api.post('/workforce/timesheets', request);
        return response.data;
    },
    async updateWorkforceTimesheet(timesheetId, request) {
        const response = await api.put(`/workforce/timesheets/${timesheetId}`, request);
        return response.data;
    },
    async listWorkforceCustomerRequests(filters) {
        const response = await api.get('/workforce/customer-requests', {
            params: {
                customer_account_name: filters?.customerAccountName,
                status: filters?.status,
                linked_engagement_id: filters?.linkedEngagementId,
            },
        });
        return response.data;
    },
    async createWorkforceCustomerRequest(request) {
        const response = await api.post('/workforce/customer-requests', request);
        return response.data;
    },
    async updateWorkforceCustomerRequest(customerRequestId, request) {
        const response = await api.put(`/workforce/customer-requests/${customerRequestId}`, request);
        return response.data;
    },
    async listWorkforceProviderMatches(filters) {
        const response = await api.get('/workforce/provider-matches', {
            params: {
                customer_request_id: filters?.customerRequestId,
                provider_company_id: filters?.providerCompanyId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createWorkforceProviderMatch(request) {
        const response = await api.post('/workforce/provider-matches', request);
        return response.data;
    },
    async updateWorkforceProviderMatch(providerMatchId, request) {
        const response = await api.put(`/workforce/provider-matches/${providerMatchId}`, request);
        return response.data;
    },
    async listWorkforceDispatch(filters) {
        const response = await api.get('/workforce/dispatch', {
            params: {
                customer_request_id: filters?.customerRequestId,
                provider_match_id: filters?.providerMatchId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createWorkforceDispatch(request) {
        const response = await api.post('/workforce/dispatch', request);
        return response.data;
    },
    async updateWorkforceDispatch(dispatchId, request) {
        const response = await api.put(`/workforce/dispatch/${dispatchId}`, request);
        return response.data;
    },
    async listWorkforceAssignmentExceptions(filters) {
        const response = await api.get('/workforce/assignment-exceptions', {
            params: {
                assignment_id: filters?.assignmentId,
                dispatch_id: filters?.dispatchId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createWorkforceAssignmentException(request) {
        const response = await api.post('/workforce/assignment-exceptions', request);
        return response.data;
    },
    async updateWorkforceAssignmentException(assignmentExceptionId, request) {
        const response = await api.put(`/workforce/assignment-exceptions/${assignmentExceptionId}`, request);
        return response.data;
    },
    async listWorkforceCoachingProfiles(filters) {
        const response = await api.get('/workforce/coaching-profiles', {
            params: {
                subject_kind: filters?.subjectKind,
                status: filters?.status,
                candidate_id: filters?.candidateId,
                provider_person_id: filters?.providerPersonId,
            },
        });
        return response.data;
    },
    async createWorkforceCoachingProfile(request) {
        const response = await api.post('/workforce/coaching-profiles', request);
        return response.data;
    },
    async updateWorkforceCoachingProfile(coachingProfileId, request) {
        const response = await api.put(`/workforce/coaching-profiles/${coachingProfileId}`, request);
        return response.data;
    },
    async listWorkforceCoachingRelationships(filters) {
        const response = await api.get('/workforce/coaching-relationships', {
            params: {
                coaching_profile_id: filters?.coachingProfileId,
                coach_user_id: filters?.coachUserId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createWorkforceCoachingRelationship(request) {
        const response = await api.post('/workforce/coaching-relationships', request);
        return response.data;
    },
    async updateWorkforceCoachingRelationship(coachingRelationshipId, request) {
        const response = await api.put(`/workforce/coaching-relationships/${coachingRelationshipId}`, request);
        return response.data;
    },
    async listWorkforceDevelopmentPlans(filters) {
        const response = await api.get('/workforce/development-plans', {
            params: {
                coaching_profile_id: filters?.coachingProfileId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createWorkforceDevelopmentPlan(request) {
        const response = await api.post('/workforce/development-plans', request);
        return response.data;
    },
    async updateWorkforceDevelopmentPlan(developmentPlanId, request) {
        const response = await api.put(`/workforce/development-plans/${developmentPlanId}`, request);
        return response.data;
    },
    async listWorkforceCoachingSessions(filters) {
        const response = await api.get('/workforce/coaching-sessions', {
            params: {
                coaching_relationship_id: filters?.coachingRelationshipId,
                development_plan_id: filters?.developmentPlanId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createWorkforceCoachingSession(request) {
        const response = await api.post('/workforce/coaching-sessions', request);
        return response.data;
    },
    async updateWorkforceCoachingSession(coachingSessionId, request) {
        const response = await api.put(`/workforce/coaching-sessions/${coachingSessionId}`, request);
        return response.data;
    },
    async listWorkforceCoachingActions(filters) {
        const response = await api.get('/workforce/coaching-actions', {
            params: {
                coaching_profile_id: filters?.coachingProfileId,
                development_plan_id: filters?.developmentPlanId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createWorkforceCoachingAction(request) {
        const response = await api.post('/workforce/coaching-actions', request);
        return response.data;
    },
    async updateWorkforceCoachingAction(coachingActionId, request) {
        const response = await api.put(`/workforce/coaching-actions/${coachingActionId}`, request);
        return response.data;
    },
    async listWorkforceCoachingParity(filters) {
        const response = await api.get('/workforce/coaching-parity', {
            params: {
                parity_area: filters?.parityArea,
                parity_status: filters?.parityStatus,
            },
        });
        return syncWorkforceCoachingParityResponseAliases(response.data);
    },
    async createWorkforceCoachingParity(request) {
        const response = await api.post('/workforce/coaching-parity', normalizeWorkforceCoachingParityRequest(request));
        return syncWorkforceCoachingParityAliases(response.data);
    },
    async updateWorkforceCoachingParity(coachingParityMappingId, request) {
        const response = await api.put(`/workforce/coaching-parity/${coachingParityMappingId}`, normalizeWorkforceCoachingParityRequest(request));
        return syncWorkforceCoachingParityAliases(response.data);
    },
    async listWorkforceIamBindings(filters) {
        const response = await api.get('/iam/external-identity-bindings', {
            params: {
                consumer_application: 'workforce',
                status: filters?.status,
                realm_id: filters?.realmId,
            },
        });
        return response.data;
    },
    async createWorkforceIamBinding(request) {
        const response = await api.post('/iam/external-identity-bindings', {
            ...request,
            consumer_application: 'workforce',
        });
        return response.data;
    },
    async updateWorkforceIamBinding(iamBindingId, request) {
        const response = await api.put(`/iam/external-identity-bindings/${iamBindingId}`, {
            ...request,
            consumer_application: 'workforce',
        });
        return response.data;
    },
    async listWorkforceCommerceBindings(filters) {
        const response = await api.get('/workforce/commerce-bindings', {
            params: {
                status: filters?.status,
                commerce_account_id: filters?.commerceAccountId,
            },
        });
        return response.data;
    },
    async createWorkforceCommerceBinding(request) {
        const response = await api.post('/workforce/commerce-bindings', request);
        return response.data;
    },
    async updateWorkforceCommerceBinding(commerceBindingId, request) {
        const response = await api.put(`/workforce/commerce-bindings/${commerceBindingId}`, request);
        return response.data;
    },
    async listWorkforceLmsReadinessBindings(filters) {
        const response = await api.get('/workforce/lms-readiness-bindings', {
            params: {
                status: filters?.status,
                lms_portal_id: filters?.lmsPortalId,
                readiness_rule_id: filters?.readinessRuleId,
            },
        });
        return response.data;
    },
    async createWorkforceLmsReadinessBinding(request) {
        const response = await api.post('/workforce/lms-readiness-bindings', request);
        return response.data;
    },
    async updateWorkforceLmsReadinessBinding(lmsReadinessBindingId, request) {
        const response = await api.put(`/workforce/lms-readiness-bindings/${lmsReadinessBindingId}`, request);
        return response.data;
    },
    async listWorkforceSkillReferences(filters) {
        const response = await api.get('/workforce/skill-references', {
            params: {
                reference_kind: filters?.referenceKind,
                source_system: filters?.sourceSystem,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createWorkforceSkillReference(request) {
        const response = await api.post('/workforce/skill-references', request);
        return response.data;
    },
    async updateWorkforceSkillReference(skillReferenceId, request) {
        const response = await api.put(`/workforce/skill-references/${skillReferenceId}`, request);
        return response.data;
    },
    async listWorkforceActivationEvents(filters) {
        const response = await api.get('/workforce/activation-events', {
            params: {
                source_binding_kind: filters?.sourceBindingKind,
                source_binding_id: filters?.sourceBindingId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createWorkforceActivationEvent(request) {
        const response = await api.post('/workforce/activation-events', request);
        return response.data;
    },
    async updateWorkforceActivationEvent(activationEventId, request) {
        const response = await api.put(`/workforce/activation-events/${activationEventId}`, request);
        return response.data;
    },
    async listWorkforceBackups(filters) {
        const response = await api.get('/workforce/backups', {
            params: {
                status: filters?.status,
                backup_scope: filters?.backupScope,
            },
        });
        return response.data;
    },
    async createWorkforceBackup(request) {
        const response = await api.post('/workforce/backups', request);
        return response.data;
    },
    async updateWorkforceBackup(backupId, request) {
        const response = await api.put(`/workforce/backups/${backupId}`, request);
        return response.data;
    },
    async listWorkforceRestoreDrills(filters) {
        const response = await api.get('/workforce/restores', {
            params: {
                status: filters?.status,
                backup_id: filters?.backupId,
            },
        });
        return response.data;
    },
    async createWorkforceRestoreDrill(request) {
        const response = await api.post('/workforce/restores', request);
        return response.data;
    },
    async updateWorkforceRestoreDrill(restoreDrillId, request) {
        const response = await api.put(`/workforce/restores/${restoreDrillId}`, request);
        return response.data;
    },
    async listWorkforceExportArtifacts(filters) {
        const response = await api.get('/workforce/exports', {
            params: {
                status: filters?.status,
                format: filters?.format,
            },
        });
        return response.data;
    },
    async createWorkforceExportArtifact(request) {
        const response = await api.post('/workforce/exports', request);
        return response.data;
    },
    async updateWorkforceExportArtifact(exportArtifactId, request) {
        const response = await api.put(`/workforce/exports/${exportArtifactId}`, request);
        return response.data;
    },
    async listWorkforceImportValidations(filters) {
        const response = await api.get('/workforce/import-validations', {
            params: {
                status: filters?.status,
                artifact_reference: filters?.artifactReference,
            },
        });
        return response.data;
    },
    async createWorkforceImportValidation(request) {
        const response = await api.post('/workforce/import-validations', request);
        return response.data;
    },
    async updateWorkforceImportValidation(importValidationId, request) {
        const response = await api.put(`/workforce/import-validations/${importValidationId}`, request);
        return response.data;
    },
    async listWorkforceResilienceChecks(filters) {
        const response = await api.get('/workforce/resilience-checks', {
            params: {
                status: filters?.status,
                check_name: filters?.checkName,
            },
        });
        return response.data;
    },
    async createWorkforceResilienceCheck(request) {
        const response = await api.post('/workforce/resilience-checks', request);
        return response.data;
    },
    async updateWorkforceResilienceCheck(resilienceCheckId, request) {
        const response = await api.put(`/workforce/resilience-checks/${resilienceCheckId}`, request);
        return response.data;
    },
    async listWorkforceBenchmarkChecks(filters) {
        const response = await api.get('/workforce/benchmarks', {
            params: {
                status: filters?.status,
                benchmark_name: filters?.benchmarkName,
            },
        });
        return response.data;
    },
    async createWorkforceBenchmarkCheck(request) {
        const response = await api.post('/workforce/benchmarks', request);
        return response.data;
    },
    async updateWorkforceBenchmarkCheck(benchmarkCheckId, request) {
        const response = await api.put(`/workforce/benchmarks/${benchmarkCheckId}`, request);
        return response.data;
    },
    async listWorkforceDiagnostics(filters) {
        const response = await api.get('/workforce/diagnostics', {
            params: {
                status: filters?.status,
                diagnostic_name: filters?.diagnosticName,
            },
        });
        return response.data;
    },
    async createWorkforceDiagnosticsRecord(request) {
        const response = await api.post('/workforce/diagnostics', request);
        return response.data;
    },
    async updateWorkforceDiagnosticsRecord(diagnosticsRecordId, request) {
        const response = await api.put(`/workforce/diagnostics/${diagnosticsRecordId}`, request);
        return response.data;
    },
};
