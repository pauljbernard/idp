import { api } from './iamHttpClient'
import type {
  CreateWorkforceActivationEventRequest,
  CreateWorkforceAdoptionPlanRequest,
  CreateWorkforceApplicationRequest,
  CreateWorkforceApprovalRequest,
  CreateWorkforceAssignmentExceptionRequest,
  CreateWorkforceAssignmentRequest,
  CreateWorkforceBackupRequest,
  CreateWorkforceBenchmarkCheckRequest,
  CreateWorkforceCandidateRequest,
  CreateWorkforceCoachingActionRequest,
  CreateWorkforceCoachingParityRequest,
  CreateWorkforceCoachingProfileRequest,
  CreateWorkforceCoachingRelationshipRequest,
  CreateWorkforceCoachingSessionRequest,
  CreateWorkforceCommerceBindingRequest,
  CreateWorkforceCustomerRequestRequest,
  CreateWorkforceDevelopmentPlanRequest,
  CreateWorkforceDiagnosticsRequest,
  CreateWorkforceDispatchRequest,
  CreateWorkforceEngagementRequest,
  CreateWorkforceExportArtifactRequest,
  CreateWorkforceFormalReviewRequest,
  CreateWorkforceIamBindingRequest,
  CreateWorkforceImportValidationRequest,
  CreateWorkforceInternalMobilityRequest,
  CreateWorkforceInterviewRequest,
  CreateWorkforceLmsReadinessBindingRequest,
  CreateWorkforceMilestoneRequest,
  CreateWorkforceOfferRequest,
  CreateWorkforcePostingChannelRequest,
  CreateWorkforcePostingRequest,
  CreateWorkforceProviderCompanyRequest,
  CreateWorkforceProviderMatchRequest,
  CreateWorkforceProviderPersonRequest,
  CreateWorkforceProviderQualificationRequest,
  CreateWorkforceRequisitionRequest,
  CreateWorkforceResilienceCheckRequest,
  CreateWorkforceRestoreDrillRequest,
  CreateWorkforceSkillReferenceRequest,
  CreateWorkforceSowRequest,
  CreateWorkforceTalentPoolRequest,
  CreateWorkforceTimesheetRequest,
  UpdateWorkforceActivationEventRequest,
  UpdateWorkforceApplicationRequest,
  UpdateWorkforceApprovalRequest,
  UpdateWorkforceAssignmentExceptionRequest,
  UpdateWorkforceAssignmentRequest,
  UpdateWorkforceBackupRequest,
  UpdateWorkforceBenchmarkCheckRequest,
  UpdateWorkforceCandidateRequest,
  UpdateWorkforceCoachingActionRequest,
  UpdateWorkforceCoachingParityRequest,
  UpdateWorkforceCoachingProfileRequest,
  UpdateWorkforceCoachingRelationshipRequest,
  UpdateWorkforceCoachingSessionRequest,
  UpdateWorkforceCommerceBindingRequest,
  UpdateWorkforceCustomerRequestRequest,
  UpdateWorkforceDevelopmentPlanRequest,
  UpdateWorkforceDiagnosticsRequest,
  UpdateWorkforceDispatchRequest,
  UpdateWorkforceEngagementRequest,
  UpdateWorkforceExportArtifactRequest,
  UpdateWorkforceIamBindingRequest,
  UpdateWorkforceImportValidationRequest,
  UpdateWorkforceInternalMobilityRequest,
  UpdateWorkforceInterviewRequest,
  UpdateWorkforceLmsReadinessBindingRequest,
  UpdateWorkforceMilestoneRequest,
  UpdateWorkforceOfferRequest,
  UpdateWorkforcePostingChannelRequest,
  UpdateWorkforcePostingRequest,
  UpdateWorkforceProviderCompanyRequest,
  UpdateWorkforceProviderMatchRequest,
  UpdateWorkforceProviderPersonRequest,
  UpdateWorkforceProviderQualificationRequest,
  UpdateWorkforceRequisitionRequest,
  UpdateWorkforceResilienceCheckRequest,
  UpdateWorkforceRestoreDrillRequest,
  UpdateWorkforceSkillReferenceRequest,
  UpdateWorkforceSowRequest,
  UpdateWorkforceTalentPoolRequest,
  UpdateWorkforceTimesheetRequest,
  WorkforceActivationBindingKind,
  WorkforceActivationEventRecord,
  WorkforceActivationEventStatus,
  WorkforceActivationEventsResponse,
  WorkforceAdoptionPlanRecord,
  WorkforceAdoptionPlansResponse,
  WorkforceApplicationRecord,
  WorkforceApplicationStatus,
  WorkforceApplicationsResponse,
  WorkforceApprovalRecord,
  WorkforceApprovalStatus,
  WorkforceApprovalsResponse,
  WorkforceAssignmentExceptionRecord,
  WorkforceAssignmentExceptionStatus,
  WorkforceAssignmentExceptionsResponse,
  WorkforceAssignmentRecord,
  WorkforceAssignmentStatus,
  WorkforceAssignmentsResponse,
  WorkforceBackupRecord,
  WorkforceBackupStatus,
  WorkforceBackupsResponse,
  WorkforceBenchmarkCheckRecord,
  WorkforceBenchmarkCheckStatus,
  WorkforceBenchmarkChecksResponse,
  WorkforceCandidateRecord,
  WorkforceCandidateSource,
  WorkforceCandidateStatus,
  WorkforceCandidatesResponse,
  WorkforceCoachingActionRecord,
  WorkforceCoachingActionStatus,
  WorkforceCoachingActionsResponse,
  WorkforceCoachingParityRecord,
  WorkforceCoachingParityResponse,
  WorkforceCoachingParityStatus,
  WorkforceCoachingProfileRecord,
  WorkforceCoachingProfileStatus,
  WorkforceCoachingProfilesResponse,
  WorkforceCoachingRelationshipRecord,
  WorkforceCoachingRelationshipStatus,
  WorkforceCoachingRelationshipsResponse,
  WorkforceCoachingSessionRecord,
  WorkforceCoachingSessionStatus,
  WorkforceCoachingSessionsResponse,
  WorkforceCoachingSubjectKind,
  WorkforceCommerceBindingRecord,
  WorkforceCommerceBindingsResponse,
  WorkforceCustomerRequestRecord,
  WorkforceCustomerRequestStatus,
  WorkforceCustomerRequestsResponse,
  WorkforceDevelopmentPlanRecord,
  WorkforceDevelopmentPlanStatus,
  WorkforceDevelopmentPlansResponse,
  WorkforceDiagnosticsRecord,
  WorkforceDiagnosticsResponse,
  WorkforceDiagnosticsStatus,
  WorkforceDifferentiationResponse,
  WorkforceDispatchRecord,
  WorkforceDispatchResponse,
  WorkforceDispatchStatus,
  WorkforceEmploymentType,
  WorkforceEngagementRecord,
  WorkforceEngagementStatus,
  WorkforceEngagementsResponse,
  WorkforceExportArtifactRecord,
  WorkforceExportArtifactStatus,
  WorkforceExportArtifactsResponse,
  WorkforceFormalReviewRecord,
  WorkforceFormalReviewsResponse,
  WorkforceIamBindingRecord,
  WorkforceIamBindingsResponse,
  WorkforceImportValidationRecord,
  WorkforceImportValidationStatus,
  WorkforceImportValidationsResponse,
  WorkforceInternalMobilityRecord,
  WorkforceInternalMobilityResponse,
  WorkforceInternalMobilityStatus,
  WorkforceInteropBindingStatus,
  WorkforceInteroperabilityResponse,
  WorkforceInterviewMode,
  WorkforceInterviewRecord,
  WorkforceInterviewStatus,
  WorkforceInterviewsResponse,
  WorkforceLmsReadinessBindingRecord,
  WorkforceLmsReadinessBindingsResponse,
  WorkforceMilestoneRecord,
  WorkforceMilestoneStatus,
  WorkforceMilestonesResponse,
  WorkforceOfferRecord,
  WorkforceOfferStatus,
  WorkforceOffersResponse,
  WorkforcePostingChannelRecord,
  WorkforcePostingChannelStatus,
  WorkforcePostingChannelType,
  WorkforcePostingChannelsResponse,
  WorkforcePostingRecord,
  WorkforcePostingStatus,
  WorkforcePostingsResponse,
  WorkforceProviderCompaniesResponse,
  WorkforceProviderCompanyRecord,
  WorkforceProviderCompanyStatus,
  WorkforceProviderMatchRecord,
  WorkforceProviderMatchStatus,
  WorkforceProviderMatchesResponse,
  WorkforceProviderPeopleResponse,
  WorkforceProviderPersonRecord,
  WorkforceProviderPersonStatus,
  WorkforceProviderQualificationRecord,
  WorkforceProviderQualificationStatus,
  WorkforceProviderQualificationType,
  WorkforceProviderQualificationsResponse,
  WorkforceRequisitionRecord,
  WorkforceRequisitionStatus,
  WorkforceRequisitionsResponse,
  WorkforceResilienceCheckRecord,
  WorkforceResilienceCheckStatus,
  WorkforceResilienceChecksResponse,
  WorkforceRestoreDrillRecord,
  WorkforceRestoreDrillsResponse,
  WorkforceRestoreStatus,
  WorkforceReviewSummaryResponse,
  WorkforceSkillReferenceKind,
  WorkforceSkillReferenceRecord,
  WorkforceSkillReferenceSourceSystem,
  WorkforceSkillReferenceStatus,
  WorkforceSkillReferencesResponse,
  WorkforceSowRecord,
  WorkforceSowStatus,
  WorkforceSowsResponse,
  WorkforceStandardsMatrixResponse,
  WorkforceSummaryResponse,
  WorkforceTalentPoolRecord,
  WorkforceTalentPoolStatus,
  WorkforceTalentPoolsResponse,
  WorkforceTimesheetRecord,
  WorkforceTimesheetStatus,
  WorkforceTimesheetsResponse,
  WorkforceValidationDomainsResponse,
} from './legacyWorkforceTypes'

function syncWorkforceCoachingParityAliases(
  record: WorkforceCoachingParityRecord,
): WorkforceCoachingParityRecord {
  return record
}

function syncWorkforceCoachingParityResponseAliases(
  response: WorkforceCoachingParityResponse,
): WorkforceCoachingParityResponse {
  return {
    ...response,
    parity_mappings: response.parity_mappings.map((record) => syncWorkforceCoachingParityAliases(record)),
  }
}

function normalizeWorkforceCoachingParityRequest<
  T extends CreateWorkforceCoachingParityRequest | UpdateWorkforceCoachingParityRequest,
>(request: T): T {
  return request
}

export const legacyWorkforceApi = {
  async getWorkforceSummary(): Promise<WorkforceSummaryResponse> {
    const response = await api.get('/workforce/summary')
    return response.data
  },

  async getWorkforceReviewSummary(): Promise<WorkforceReviewSummaryResponse> {
    const response = await api.get('/workforce/review/summary')
    return response.data
  },

  async getWorkforceStandardsMatrix(): Promise<WorkforceStandardsMatrixResponse> {
    const response = await api.get('/workforce/review/standards-matrix')
    return response.data
  },

  async getWorkforceInteroperabilityReview(): Promise<WorkforceInteroperabilityResponse> {
    const response = await api.get('/workforce/review/interoperability')
    return response.data
  },

  async getWorkforceDifferentiationReview(): Promise<WorkforceDifferentiationResponse> {
    const response = await api.get('/workforce/review/differentiation')
    return response.data
  },

  async listWorkforceFormalReviews(): Promise<WorkforceFormalReviewsResponse> {
    const response = await api.get('/workforce/review/formal')
    return response.data
  },

  async createWorkforceFormalReview(
    request?: CreateWorkforceFormalReviewRequest,
  ): Promise<WorkforceFormalReviewRecord> {
    const response = await api.post('/workforce/review/formal', request ?? {})
    return response.data
  },

  async listWorkforceAdoptionPlans(): Promise<WorkforceAdoptionPlansResponse> {
    const response = await api.get('/workforce/review/adoption-plans')
    return response.data
  },

  async createWorkforceAdoptionPlan(
    request?: CreateWorkforceAdoptionPlanRequest,
  ): Promise<WorkforceAdoptionPlanRecord> {
    const response = await api.post('/workforce/review/adoption-plans', request ?? {})
    return response.data
  },

  async listWorkforceValidationDomains(): Promise<WorkforceValidationDomainsResponse> {
    const response = await api.get('/workforce/validation-domains')
    return response.data
  },

  async listWorkforceRequisitions(filters?: {
    status?: WorkforceRequisitionStatus
    employmentType?: WorkforceEmploymentType
    validationDomainId?: string
  }): Promise<WorkforceRequisitionsResponse> {
    const response = await api.get('/workforce/requisitions', {
      params: {
        status: filters?.status,
        employment_type: filters?.employmentType,
        validation_domain_id: filters?.validationDomainId,
      },
    })
    return response.data
  },

  async createWorkforceRequisition(request: CreateWorkforceRequisitionRequest): Promise<WorkforceRequisitionRecord> {
    const response = await api.post('/workforce/requisitions', request)
    return response.data
  },

  async updateWorkforceRequisition(
    requisitionId: string,
    request: UpdateWorkforceRequisitionRequest,
  ): Promise<WorkforceRequisitionRecord> {
    const response = await api.put(`/workforce/requisitions/${requisitionId}`, request)
    return response.data
  },

  async listWorkforceApprovals(filters?: {
    requisitionId?: string
    status?: WorkforceApprovalStatus
  }): Promise<WorkforceApprovalsResponse> {
    const response = await api.get('/workforce/approvals', {
      params: {
        requisition_id: filters?.requisitionId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createWorkforceApproval(request: CreateWorkforceApprovalRequest): Promise<WorkforceApprovalRecord> {
    const response = await api.post('/workforce/approvals', request)
    return response.data
  },

  async updateWorkforceApproval(
    approvalId: string,
    request: UpdateWorkforceApprovalRequest,
  ): Promise<WorkforceApprovalRecord> {
    const response = await api.put(`/workforce/approvals/${approvalId}`, request)
    return response.data
  },

  async listWorkforcePostings(filters?: {
    requisitionId?: string
    status?: WorkforcePostingStatus
  }): Promise<WorkforcePostingsResponse> {
    const response = await api.get('/workforce/postings', {
      params: {
        requisition_id: filters?.requisitionId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createWorkforcePosting(request: CreateWorkforcePostingRequest): Promise<WorkforcePostingRecord> {
    const response = await api.post('/workforce/postings', request)
    return response.data
  },

  async updateWorkforcePosting(
    postingId: string,
    request: UpdateWorkforcePostingRequest,
  ): Promise<WorkforcePostingRecord> {
    const response = await api.put(`/workforce/postings/${postingId}`, request)
    return response.data
  },

  async listWorkforcePostingChannels(filters?: {
    postingId?: string
    status?: WorkforcePostingChannelStatus
    channelType?: WorkforcePostingChannelType
  }): Promise<WorkforcePostingChannelsResponse> {
    const response = await api.get('/workforce/posting-channels', {
      params: {
        posting_id: filters?.postingId,
        status: filters?.status,
        channel_type: filters?.channelType,
      },
    })
    return response.data
  },

  async createWorkforcePostingChannel(
    request: CreateWorkforcePostingChannelRequest,
  ): Promise<WorkforcePostingChannelRecord> {
    const response = await api.post('/workforce/posting-channels', request)
    return response.data
  },

  async updateWorkforcePostingChannel(
    postingChannelId: string,
    request: UpdateWorkforcePostingChannelRequest,
  ): Promise<WorkforcePostingChannelRecord> {
    const response = await api.put(`/workforce/posting-channels/${postingChannelId}`, request)
    return response.data
  },

  async listWorkforceCandidates(filters?: {
    status?: WorkforceCandidateStatus
    source?: WorkforceCandidateSource
  }): Promise<WorkforceCandidatesResponse> {
    const response = await api.get('/workforce/candidates', {
      params: {
        status: filters?.status,
        source: filters?.source,
      },
    })
    return response.data
  },

  async createWorkforceCandidate(request: CreateWorkforceCandidateRequest): Promise<WorkforceCandidateRecord> {
    const response = await api.post('/workforce/candidates', request)
    return response.data
  },

  async updateWorkforceCandidate(
    candidateId: string,
    request: UpdateWorkforceCandidateRequest,
  ): Promise<WorkforceCandidateRecord> {
    const response = await api.put(`/workforce/candidates/${candidateId}`, request)
    return response.data
  },

  async listWorkforceApplications(filters?: {
    candidateId?: string
    requisitionId?: string
    status?: WorkforceApplicationStatus
  }): Promise<WorkforceApplicationsResponse> {
    const response = await api.get('/workforce/applications', {
      params: {
        candidate_id: filters?.candidateId,
        requisition_id: filters?.requisitionId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createWorkforceApplication(request: CreateWorkforceApplicationRequest): Promise<WorkforceApplicationRecord> {
    const response = await api.post('/workforce/applications', request)
    return response.data
  },

  async updateWorkforceApplication(
    applicationId: string,
    request: UpdateWorkforceApplicationRequest,
  ): Promise<WorkforceApplicationRecord> {
    const response = await api.put(`/workforce/applications/${applicationId}`, request)
    return response.data
  },

  async listWorkforceInterviews(filters?: {
    applicationId?: string
    status?: WorkforceInterviewStatus
    mode?: WorkforceInterviewMode
  }): Promise<WorkforceInterviewsResponse> {
    const response = await api.get('/workforce/interviews', {
      params: {
        application_id: filters?.applicationId,
        status: filters?.status,
        mode: filters?.mode,
      },
    })
    return response.data
  },

  async createWorkforceInterview(request: CreateWorkforceInterviewRequest): Promise<WorkforceInterviewRecord> {
    const response = await api.post('/workforce/interviews', request)
    return response.data
  },

  async updateWorkforceInterview(
    interviewId: string,
    request: UpdateWorkforceInterviewRequest,
  ): Promise<WorkforceInterviewRecord> {
    const response = await api.put(`/workforce/interviews/${interviewId}`, request)
    return response.data
  },

  async listWorkforceOffers(filters?: {
    applicationId?: string
    status?: WorkforceOfferStatus
  }): Promise<WorkforceOffersResponse> {
    const response = await api.get('/workforce/offers', {
      params: {
        application_id: filters?.applicationId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createWorkforceOffer(request: CreateWorkforceOfferRequest): Promise<WorkforceOfferRecord> {
    const response = await api.post('/workforce/offers', request)
    return response.data
  },

  async updateWorkforceOffer(
    offerId: string,
    request: UpdateWorkforceOfferRequest,
  ): Promise<WorkforceOfferRecord> {
    const response = await api.put(`/workforce/offers/${offerId}`, request)
    return response.data
  },

  async listWorkforceInternalMobility(filters?: {
    employeeUserId?: string
    targetRequisitionId?: string
    status?: WorkforceInternalMobilityStatus
  }): Promise<WorkforceInternalMobilityResponse> {
    const response = await api.get('/workforce/internal-mobility', {
      params: {
        employee_user_id: filters?.employeeUserId,
        target_requisition_id: filters?.targetRequisitionId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createWorkforceInternalMobility(
    request: CreateWorkforceInternalMobilityRequest,
  ): Promise<WorkforceInternalMobilityRecord> {
    const response = await api.post('/workforce/internal-mobility', request)
    return response.data
  },

  async updateWorkforceInternalMobility(
    internalMobilityCaseId: string,
    request: UpdateWorkforceInternalMobilityRequest,
  ): Promise<WorkforceInternalMobilityRecord> {
    const response = await api.put(`/workforce/internal-mobility/${internalMobilityCaseId}`, request)
    return response.data
  },

  async listWorkforceTalentPools(filters?: {
    ownerUserId?: string
    status?: WorkforceTalentPoolStatus
  }): Promise<WorkforceTalentPoolsResponse> {
    const response = await api.get('/workforce/talent-pools', {
      params: {
        owner_user_id: filters?.ownerUserId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createWorkforceTalentPool(request: CreateWorkforceTalentPoolRequest): Promise<WorkforceTalentPoolRecord> {
    const response = await api.post('/workforce/talent-pools', request)
    return response.data
  },

  async updateWorkforceTalentPool(
    talentPoolId: string,
    request: UpdateWorkforceTalentPoolRequest,
  ): Promise<WorkforceTalentPoolRecord> {
    const response = await api.put(`/workforce/talent-pools/${talentPoolId}`, request)
    return response.data
  },

  async listWorkforceProviderCompanies(filters?: {
    status?: WorkforceProviderCompanyStatus
  }): Promise<WorkforceProviderCompaniesResponse> {
    const response = await api.get('/workforce/provider-companies', {
      params: {
        status: filters?.status,
      },
    })
    return response.data
  },

  async createWorkforceProviderCompany(
    request: CreateWorkforceProviderCompanyRequest,
  ): Promise<WorkforceProviderCompanyRecord> {
    const response = await api.post('/workforce/provider-companies', request)
    return response.data
  },

  async updateWorkforceProviderCompany(
    providerCompanyId: string,
    request: UpdateWorkforceProviderCompanyRequest,
  ): Promise<WorkforceProviderCompanyRecord> {
    const response = await api.put(`/workforce/provider-companies/${providerCompanyId}`, request)
    return response.data
  },

  async listWorkforceProviderPeople(filters?: {
    providerCompanyId?: string
    status?: WorkforceProviderPersonStatus
  }): Promise<WorkforceProviderPeopleResponse> {
    const response = await api.get('/workforce/provider-people', {
      params: {
        provider_company_id: filters?.providerCompanyId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createWorkforceProviderPerson(
    request: CreateWorkforceProviderPersonRequest,
  ): Promise<WorkforceProviderPersonRecord> {
    const response = await api.post('/workforce/provider-people', request)
    return response.data
  },

  async updateWorkforceProviderPerson(
    providerPersonId: string,
    request: UpdateWorkforceProviderPersonRequest,
  ): Promise<WorkforceProviderPersonRecord> {
    const response = await api.put(`/workforce/provider-people/${providerPersonId}`, request)
    return response.data
  },

  async listWorkforceProviderQualifications(filters?: {
    providerCompanyId?: string
    providerPersonId?: string
    qualificationType?: WorkforceProviderQualificationType
    status?: WorkforceProviderQualificationStatus
  }): Promise<WorkforceProviderQualificationsResponse> {
    const response = await api.get('/workforce/provider-qualifications', {
      params: {
        provider_company_id: filters?.providerCompanyId,
        provider_person_id: filters?.providerPersonId,
        qualification_type: filters?.qualificationType,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createWorkforceProviderQualification(
    request: CreateWorkforceProviderQualificationRequest,
  ): Promise<WorkforceProviderQualificationRecord> {
    const response = await api.post('/workforce/provider-qualifications', request)
    return response.data
  },

  async updateWorkforceProviderQualification(
    providerQualificationId: string,
    request: UpdateWorkforceProviderQualificationRequest,
  ): Promise<WorkforceProviderQualificationRecord> {
    const response = await api.put(`/workforce/provider-qualifications/${providerQualificationId}`, request)
    return response.data
  },

  async listWorkforceEngagements(filters?: {
    providerCompanyId?: string
    status?: WorkforceEngagementStatus
  }): Promise<WorkforceEngagementsResponse> {
    const response = await api.get('/workforce/engagements', {
      params: {
        provider_company_id: filters?.providerCompanyId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createWorkforceEngagement(request: CreateWorkforceEngagementRequest): Promise<WorkforceEngagementRecord> {
    const response = await api.post('/workforce/engagements', request)
    return response.data
  },

  async updateWorkforceEngagement(
    engagementId: string,
    request: UpdateWorkforceEngagementRequest,
  ): Promise<WorkforceEngagementRecord> {
    const response = await api.put(`/workforce/engagements/${engagementId}`, request)
    return response.data
  },

  async listWorkforceSows(filters?: {
    engagementId?: string
    status?: WorkforceSowStatus
  }): Promise<WorkforceSowsResponse> {
    const response = await api.get('/workforce/sows', {
      params: {
        engagement_id: filters?.engagementId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createWorkforceSow(request: CreateWorkforceSowRequest): Promise<WorkforceSowRecord> {
    const response = await api.post('/workforce/sows', request)
    return response.data
  },

  async updateWorkforceSow(
    sowId: string,
    request: UpdateWorkforceSowRequest,
  ): Promise<WorkforceSowRecord> {
    const response = await api.put(`/workforce/sows/${sowId}`, request)
    return response.data
  },

  async listWorkforceAssignments(filters?: {
    engagementId?: string
    providerPersonId?: string
    status?: WorkforceAssignmentStatus
  }): Promise<WorkforceAssignmentsResponse> {
    const response = await api.get('/workforce/assignments', {
      params: {
        engagement_id: filters?.engagementId,
        provider_person_id: filters?.providerPersonId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createWorkforceAssignment(request: CreateWorkforceAssignmentRequest): Promise<WorkforceAssignmentRecord> {
    const response = await api.post('/workforce/assignments', request)
    return response.data
  },

  async updateWorkforceAssignment(
    assignmentId: string,
    request: UpdateWorkforceAssignmentRequest,
  ): Promise<WorkforceAssignmentRecord> {
    const response = await api.put(`/workforce/assignments/${assignmentId}`, request)
    return response.data
  },

  async listWorkforceMilestones(filters?: {
    engagementId?: string
    sowId?: string
    status?: WorkforceMilestoneStatus
  }): Promise<WorkforceMilestonesResponse> {
    const response = await api.get('/workforce/milestones', {
      params: {
        engagement_id: filters?.engagementId,
        sow_id: filters?.sowId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createWorkforceMilestone(request: CreateWorkforceMilestoneRequest): Promise<WorkforceMilestoneRecord> {
    const response = await api.post('/workforce/milestones', request)
    return response.data
  },

  async updateWorkforceMilestone(
    milestoneId: string,
    request: UpdateWorkforceMilestoneRequest,
  ): Promise<WorkforceMilestoneRecord> {
    const response = await api.put(`/workforce/milestones/${milestoneId}`, request)
    return response.data
  },

  async listWorkforceTimesheets(filters?: {
    assignmentId?: string
    status?: WorkforceTimesheetStatus
  }): Promise<WorkforceTimesheetsResponse> {
    const response = await api.get('/workforce/timesheets', {
      params: {
        assignment_id: filters?.assignmentId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createWorkforceTimesheet(request: CreateWorkforceTimesheetRequest): Promise<WorkforceTimesheetRecord> {
    const response = await api.post('/workforce/timesheets', request)
    return response.data
  },

  async updateWorkforceTimesheet(
    timesheetId: string,
    request: UpdateWorkforceTimesheetRequest,
  ): Promise<WorkforceTimesheetRecord> {
    const response = await api.put(`/workforce/timesheets/${timesheetId}`, request)
    return response.data
  },

  async listWorkforceCustomerRequests(filters?: {
    customerAccountName?: string
    status?: WorkforceCustomerRequestStatus
    linkedEngagementId?: string
  }): Promise<WorkforceCustomerRequestsResponse> {
    const response = await api.get('/workforce/customer-requests', {
      params: {
        customer_account_name: filters?.customerAccountName,
        status: filters?.status,
        linked_engagement_id: filters?.linkedEngagementId,
      },
    })
    return response.data
  },

  async createWorkforceCustomerRequest(
    request: CreateWorkforceCustomerRequestRequest,
  ): Promise<WorkforceCustomerRequestRecord> {
    const response = await api.post('/workforce/customer-requests', request)
    return response.data
  },

  async updateWorkforceCustomerRequest(
    customerRequestId: string,
    request: UpdateWorkforceCustomerRequestRequest,
  ): Promise<WorkforceCustomerRequestRecord> {
    const response = await api.put(`/workforce/customer-requests/${customerRequestId}`, request)
    return response.data
  },

  async listWorkforceProviderMatches(filters?: {
    customerRequestId?: string
    providerCompanyId?: string
    status?: WorkforceProviderMatchStatus
  }): Promise<WorkforceProviderMatchesResponse> {
    const response = await api.get('/workforce/provider-matches', {
      params: {
        customer_request_id: filters?.customerRequestId,
        provider_company_id: filters?.providerCompanyId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createWorkforceProviderMatch(request: CreateWorkforceProviderMatchRequest): Promise<WorkforceProviderMatchRecord> {
    const response = await api.post('/workforce/provider-matches', request)
    return response.data
  },

  async updateWorkforceProviderMatch(
    providerMatchId: string,
    request: UpdateWorkforceProviderMatchRequest,
  ): Promise<WorkforceProviderMatchRecord> {
    const response = await api.put(`/workforce/provider-matches/${providerMatchId}`, request)
    return response.data
  },

  async listWorkforceDispatch(filters?: {
    customerRequestId?: string
    providerMatchId?: string
    status?: WorkforceDispatchStatus
  }): Promise<WorkforceDispatchResponse> {
    const response = await api.get('/workforce/dispatch', {
      params: {
        customer_request_id: filters?.customerRequestId,
        provider_match_id: filters?.providerMatchId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createWorkforceDispatch(request: CreateWorkforceDispatchRequest): Promise<WorkforceDispatchRecord> {
    const response = await api.post('/workforce/dispatch', request)
    return response.data
  },

  async updateWorkforceDispatch(
    dispatchId: string,
    request: UpdateWorkforceDispatchRequest,
  ): Promise<WorkforceDispatchRecord> {
    const response = await api.put(`/workforce/dispatch/${dispatchId}`, request)
    return response.data
  },

  async listWorkforceAssignmentExceptions(filters?: {
    assignmentId?: string
    dispatchId?: string
    status?: WorkforceAssignmentExceptionStatus
  }): Promise<WorkforceAssignmentExceptionsResponse> {
    const response = await api.get('/workforce/assignment-exceptions', {
      params: {
        assignment_id: filters?.assignmentId,
        dispatch_id: filters?.dispatchId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createWorkforceAssignmentException(
    request: CreateWorkforceAssignmentExceptionRequest,
  ): Promise<WorkforceAssignmentExceptionRecord> {
    const response = await api.post('/workforce/assignment-exceptions', request)
    return response.data
  },

  async updateWorkforceAssignmentException(
    assignmentExceptionId: string,
    request: UpdateWorkforceAssignmentExceptionRequest,
  ): Promise<WorkforceAssignmentExceptionRecord> {
    const response = await api.put(`/workforce/assignment-exceptions/${assignmentExceptionId}`, request)
    return response.data
  },

  async listWorkforceCoachingProfiles(filters?: {
    subjectKind?: WorkforceCoachingSubjectKind
    status?: WorkforceCoachingProfileStatus
    candidateId?: string
    providerPersonId?: string
  }): Promise<WorkforceCoachingProfilesResponse> {
    const response = await api.get('/workforce/coaching-profiles', {
      params: {
        subject_kind: filters?.subjectKind,
        status: filters?.status,
        candidate_id: filters?.candidateId,
        provider_person_id: filters?.providerPersonId,
      },
    })
    return response.data
  },

  async createWorkforceCoachingProfile(
    request: CreateWorkforceCoachingProfileRequest,
  ): Promise<WorkforceCoachingProfileRecord> {
    const response = await api.post('/workforce/coaching-profiles', request)
    return response.data
  },

  async updateWorkforceCoachingProfile(
    coachingProfileId: string,
    request: UpdateWorkforceCoachingProfileRequest,
  ): Promise<WorkforceCoachingProfileRecord> {
    const response = await api.put(`/workforce/coaching-profiles/${coachingProfileId}`, request)
    return response.data
  },

  async listWorkforceCoachingRelationships(filters?: {
    coachingProfileId?: string
    coachUserId?: string
    status?: WorkforceCoachingRelationshipStatus
  }): Promise<WorkforceCoachingRelationshipsResponse> {
    const response = await api.get('/workforce/coaching-relationships', {
      params: {
        coaching_profile_id: filters?.coachingProfileId,
        coach_user_id: filters?.coachUserId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createWorkforceCoachingRelationship(
    request: CreateWorkforceCoachingRelationshipRequest,
  ): Promise<WorkforceCoachingRelationshipRecord> {
    const response = await api.post('/workforce/coaching-relationships', request)
    return response.data
  },

  async updateWorkforceCoachingRelationship(
    coachingRelationshipId: string,
    request: UpdateWorkforceCoachingRelationshipRequest,
  ): Promise<WorkforceCoachingRelationshipRecord> {
    const response = await api.put(`/workforce/coaching-relationships/${coachingRelationshipId}`, request)
    return response.data
  },

  async listWorkforceDevelopmentPlans(filters?: {
    coachingProfileId?: string
    status?: WorkforceDevelopmentPlanStatus
  }): Promise<WorkforceDevelopmentPlansResponse> {
    const response = await api.get('/workforce/development-plans', {
      params: {
        coaching_profile_id: filters?.coachingProfileId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createWorkforceDevelopmentPlan(
    request: CreateWorkforceDevelopmentPlanRequest,
  ): Promise<WorkforceDevelopmentPlanRecord> {
    const response = await api.post('/workforce/development-plans', request)
    return response.data
  },

  async updateWorkforceDevelopmentPlan(
    developmentPlanId: string,
    request: UpdateWorkforceDevelopmentPlanRequest,
  ): Promise<WorkforceDevelopmentPlanRecord> {
    const response = await api.put(`/workforce/development-plans/${developmentPlanId}`, request)
    return response.data
  },

  async listWorkforceCoachingSessions(filters?: {
    coachingRelationshipId?: string
    developmentPlanId?: string
    status?: WorkforceCoachingSessionStatus
  }): Promise<WorkforceCoachingSessionsResponse> {
    const response = await api.get('/workforce/coaching-sessions', {
      params: {
        coaching_relationship_id: filters?.coachingRelationshipId,
        development_plan_id: filters?.developmentPlanId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createWorkforceCoachingSession(
    request: CreateWorkforceCoachingSessionRequest,
  ): Promise<WorkforceCoachingSessionRecord> {
    const response = await api.post('/workforce/coaching-sessions', request)
    return response.data
  },

  async updateWorkforceCoachingSession(
    coachingSessionId: string,
    request: UpdateWorkforceCoachingSessionRequest,
  ): Promise<WorkforceCoachingSessionRecord> {
    const response = await api.put(`/workforce/coaching-sessions/${coachingSessionId}`, request)
    return response.data
  },

  async listWorkforceCoachingActions(filters?: {
    coachingProfileId?: string
    developmentPlanId?: string
    status?: WorkforceCoachingActionStatus
  }): Promise<WorkforceCoachingActionsResponse> {
    const response = await api.get('/workforce/coaching-actions', {
      params: {
        coaching_profile_id: filters?.coachingProfileId,
        development_plan_id: filters?.developmentPlanId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createWorkforceCoachingAction(
    request: CreateWorkforceCoachingActionRequest,
  ): Promise<WorkforceCoachingActionRecord> {
    const response = await api.post('/workforce/coaching-actions', request)
    return response.data
  },

  async updateWorkforceCoachingAction(
    coachingActionId: string,
    request: UpdateWorkforceCoachingActionRequest,
  ): Promise<WorkforceCoachingActionRecord> {
    const response = await api.put(`/workforce/coaching-actions/${coachingActionId}`, request)
    return response.data
  },

  async listWorkforceCoachingParity(filters?: {
    parityArea?: string
    parityStatus?: WorkforceCoachingParityStatus
  }): Promise<WorkforceCoachingParityResponse> {
    const response = await api.get('/workforce/coaching-parity', {
      params: {
        parity_area: filters?.parityArea,
        parity_status: filters?.parityStatus,
      },
    })
    return syncWorkforceCoachingParityResponseAliases(response.data)
  },

  async createWorkforceCoachingParity(
    request: CreateWorkforceCoachingParityRequest,
  ): Promise<WorkforceCoachingParityRecord> {
    const response = await api.post(
      '/workforce/coaching-parity',
      normalizeWorkforceCoachingParityRequest(request),
    )
    return syncWorkforceCoachingParityAliases(response.data)
  },

  async updateWorkforceCoachingParity(
    coachingParityMappingId: string,
    request: UpdateWorkforceCoachingParityRequest,
  ): Promise<WorkforceCoachingParityRecord> {
    const response = await api.put(
      `/workforce/coaching-parity/${coachingParityMappingId}`,
      normalizeWorkforceCoachingParityRequest(request),
    )
    return syncWorkforceCoachingParityAliases(response.data)
  },

  async listWorkforceIamBindings(filters?: {
    status?: WorkforceInteropBindingStatus
    realmId?: string
  }): Promise<WorkforceIamBindingsResponse> {
    const response = await api.get('/iam/external-identity-bindings', {
      params: {
        consumer_application: 'workforce',
        status: filters?.status,
        realm_id: filters?.realmId,
      },
    })
    return response.data
  },

  async createWorkforceIamBinding(request: CreateWorkforceIamBindingRequest): Promise<WorkforceIamBindingRecord> {
    const response = await api.post('/iam/external-identity-bindings', {
      ...request,
      consumer_application: 'workforce',
    })
    return response.data
  },

  async updateWorkforceIamBinding(
    iamBindingId: string,
    request: UpdateWorkforceIamBindingRequest,
  ): Promise<WorkforceIamBindingRecord> {
    const response = await api.put(`/iam/external-identity-bindings/${iamBindingId}`, {
      ...request,
      consumer_application: 'workforce',
    })
    return response.data
  },

  async listWorkforceCommerceBindings(filters?: {
    status?: WorkforceInteropBindingStatus
    commerceAccountId?: string
  }): Promise<WorkforceCommerceBindingsResponse> {
    const response = await api.get('/workforce/commerce-bindings', {
      params: {
        status: filters?.status,
        commerce_account_id: filters?.commerceAccountId,
      },
    })
    return response.data
  },

  async createWorkforceCommerceBinding(
    request: CreateWorkforceCommerceBindingRequest,
  ): Promise<WorkforceCommerceBindingRecord> {
    const response = await api.post('/workforce/commerce-bindings', request)
    return response.data
  },

  async updateWorkforceCommerceBinding(
    commerceBindingId: string,
    request: UpdateWorkforceCommerceBindingRequest,
  ): Promise<WorkforceCommerceBindingRecord> {
    const response = await api.put(`/workforce/commerce-bindings/${commerceBindingId}`, request)
    return response.data
  },

  async listWorkforceLmsReadinessBindings(filters?: {
    status?: WorkforceInteropBindingStatus
    lmsPortalId?: string
    readinessRuleId?: string
  }): Promise<WorkforceLmsReadinessBindingsResponse> {
    const response = await api.get('/workforce/lms-readiness-bindings', {
      params: {
        status: filters?.status,
        lms_portal_id: filters?.lmsPortalId,
        readiness_rule_id: filters?.readinessRuleId,
      },
    })
    return response.data
  },

  async createWorkforceLmsReadinessBinding(
    request: CreateWorkforceLmsReadinessBindingRequest,
  ): Promise<WorkforceLmsReadinessBindingRecord> {
    const response = await api.post('/workforce/lms-readiness-bindings', request)
    return response.data
  },

  async updateWorkforceLmsReadinessBinding(
    lmsReadinessBindingId: string,
    request: UpdateWorkforceLmsReadinessBindingRequest,
  ): Promise<WorkforceLmsReadinessBindingRecord> {
    const response = await api.put(`/workforce/lms-readiness-bindings/${lmsReadinessBindingId}`, request)
    return response.data
  },

  async listWorkforceSkillReferences(filters?: {
    referenceKind?: WorkforceSkillReferenceKind
    sourceSystem?: WorkforceSkillReferenceSourceSystem
    status?: WorkforceSkillReferenceStatus
  }): Promise<WorkforceSkillReferencesResponse> {
    const response = await api.get('/workforce/skill-references', {
      params: {
        reference_kind: filters?.referenceKind,
        source_system: filters?.sourceSystem,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createWorkforceSkillReference(
    request: CreateWorkforceSkillReferenceRequest,
  ): Promise<WorkforceSkillReferenceRecord> {
    const response = await api.post('/workforce/skill-references', request)
    return response.data
  },

  async updateWorkforceSkillReference(
    skillReferenceId: string,
    request: UpdateWorkforceSkillReferenceRequest,
  ): Promise<WorkforceSkillReferenceRecord> {
    const response = await api.put(`/workforce/skill-references/${skillReferenceId}`, request)
    return response.data
  },

  async listWorkforceActivationEvents(filters?: {
    sourceBindingKind?: WorkforceActivationBindingKind
    sourceBindingId?: string
    status?: WorkforceActivationEventStatus
  }): Promise<WorkforceActivationEventsResponse> {
    const response = await api.get('/workforce/activation-events', {
      params: {
        source_binding_kind: filters?.sourceBindingKind,
        source_binding_id: filters?.sourceBindingId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createWorkforceActivationEvent(
    request: CreateWorkforceActivationEventRequest,
  ): Promise<WorkforceActivationEventRecord> {
    const response = await api.post('/workforce/activation-events', request)
    return response.data
  },

  async updateWorkforceActivationEvent(
    activationEventId: string,
    request: UpdateWorkforceActivationEventRequest,
  ): Promise<WorkforceActivationEventRecord> {
    const response = await api.put(`/workforce/activation-events/${activationEventId}`, request)
    return response.data
  },

  async listWorkforceBackups(filters?: {
    status?: WorkforceBackupStatus
    backupScope?: string
  }): Promise<WorkforceBackupsResponse> {
    const response = await api.get('/workforce/backups', {
      params: {
        status: filters?.status,
        backup_scope: filters?.backupScope,
      },
    })
    return response.data
  },

  async createWorkforceBackup(
    request: CreateWorkforceBackupRequest,
  ): Promise<WorkforceBackupRecord> {
    const response = await api.post('/workforce/backups', request)
    return response.data
  },

  async updateWorkforceBackup(
    backupId: string,
    request: UpdateWorkforceBackupRequest,
  ): Promise<WorkforceBackupRecord> {
    const response = await api.put(`/workforce/backups/${backupId}`, request)
    return response.data
  },

  async listWorkforceRestoreDrills(filters?: {
    status?: WorkforceRestoreStatus
    backupId?: string
  }): Promise<WorkforceRestoreDrillsResponse> {
    const response = await api.get('/workforce/restores', {
      params: {
        status: filters?.status,
        backup_id: filters?.backupId,
      },
    })
    return response.data
  },

  async createWorkforceRestoreDrill(
    request: CreateWorkforceRestoreDrillRequest,
  ): Promise<WorkforceRestoreDrillRecord> {
    const response = await api.post('/workforce/restores', request)
    return response.data
  },

  async updateWorkforceRestoreDrill(
    restoreDrillId: string,
    request: UpdateWorkforceRestoreDrillRequest,
  ): Promise<WorkforceRestoreDrillRecord> {
    const response = await api.put(`/workforce/restores/${restoreDrillId}`, request)
    return response.data
  },

  async listWorkforceExportArtifacts(filters?: {
    status?: WorkforceExportArtifactStatus
    format?: string
  }): Promise<WorkforceExportArtifactsResponse> {
    const response = await api.get('/workforce/exports', {
      params: {
        status: filters?.status,
        format: filters?.format,
      },
    })
    return response.data
  },

  async createWorkforceExportArtifact(
    request: CreateWorkforceExportArtifactRequest,
  ): Promise<WorkforceExportArtifactRecord> {
    const response = await api.post('/workforce/exports', request)
    return response.data
  },

  async updateWorkforceExportArtifact(
    exportArtifactId: string,
    request: UpdateWorkforceExportArtifactRequest,
  ): Promise<WorkforceExportArtifactRecord> {
    const response = await api.put(`/workforce/exports/${exportArtifactId}`, request)
    return response.data
  },

  async listWorkforceImportValidations(filters?: {
    status?: WorkforceImportValidationStatus
    artifactReference?: string
  }): Promise<WorkforceImportValidationsResponse> {
    const response = await api.get('/workforce/import-validations', {
      params: {
        status: filters?.status,
        artifact_reference: filters?.artifactReference,
      },
    })
    return response.data
  },

  async createWorkforceImportValidation(
    request: CreateWorkforceImportValidationRequest,
  ): Promise<WorkforceImportValidationRecord> {
    const response = await api.post('/workforce/import-validations', request)
    return response.data
  },

  async updateWorkforceImportValidation(
    importValidationId: string,
    request: UpdateWorkforceImportValidationRequest,
  ): Promise<WorkforceImportValidationRecord> {
    const response = await api.put(`/workforce/import-validations/${importValidationId}`, request)
    return response.data
  },

  async listWorkforceResilienceChecks(filters?: {
    status?: WorkforceResilienceCheckStatus
    checkName?: string
  }): Promise<WorkforceResilienceChecksResponse> {
    const response = await api.get('/workforce/resilience-checks', {
      params: {
        status: filters?.status,
        check_name: filters?.checkName,
      },
    })
    return response.data
  },

  async createWorkforceResilienceCheck(
    request: CreateWorkforceResilienceCheckRequest,
  ): Promise<WorkforceResilienceCheckRecord> {
    const response = await api.post('/workforce/resilience-checks', request)
    return response.data
  },

  async updateWorkforceResilienceCheck(
    resilienceCheckId: string,
    request: UpdateWorkforceResilienceCheckRequest,
  ): Promise<WorkforceResilienceCheckRecord> {
    const response = await api.put(`/workforce/resilience-checks/${resilienceCheckId}`, request)
    return response.data
  },

  async listWorkforceBenchmarkChecks(filters?: {
    status?: WorkforceBenchmarkCheckStatus
    benchmarkName?: string
  }): Promise<WorkforceBenchmarkChecksResponse> {
    const response = await api.get('/workforce/benchmarks', {
      params: {
        status: filters?.status,
        benchmark_name: filters?.benchmarkName,
      },
    })
    return response.data
  },

  async createWorkforceBenchmarkCheck(
    request: CreateWorkforceBenchmarkCheckRequest,
  ): Promise<WorkforceBenchmarkCheckRecord> {
    const response = await api.post('/workforce/benchmarks', request)
    return response.data
  },

  async updateWorkforceBenchmarkCheck(
    benchmarkCheckId: string,
    request: UpdateWorkforceBenchmarkCheckRequest,
  ): Promise<WorkforceBenchmarkCheckRecord> {
    const response = await api.put(`/workforce/benchmarks/${benchmarkCheckId}`, request)
    return response.data
  },

  async listWorkforceDiagnostics(filters?: {
    status?: WorkforceDiagnosticsStatus
    diagnosticName?: string
  }): Promise<WorkforceDiagnosticsResponse> {
    const response = await api.get('/workforce/diagnostics', {
      params: {
        status: filters?.status,
        diagnostic_name: filters?.diagnosticName,
      },
    })
    return response.data
  },

  async createWorkforceDiagnosticsRecord(
    request: CreateWorkforceDiagnosticsRequest,
  ): Promise<WorkforceDiagnosticsRecord> {
    const response = await api.post('/workforce/diagnostics', request)
    return response.data
  },

  async updateWorkforceDiagnosticsRecord(
    diagnosticsRecordId: string,
    request: UpdateWorkforceDiagnosticsRequest,
  ): Promise<WorkforceDiagnosticsRecord> {
    const response = await api.put(`/workforce/diagnostics/${diagnosticsRecordId}`, request)
    return response.data
  },
}
