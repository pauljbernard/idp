import { api } from './iamHttpClient'
import type {
  CreateLmsAssessmentPackageBindingRequest,
  CreateLmsAssignmentRequest,
  CreateLmsAttemptRequest,
  CreateLmsAttendanceRequest,
  CreateLmsAutomationRuleRequest,
  CreateLmsBackupRequest,
  CreateLmsBadgeAwardRequest,
  CreateLmsCatalogRequest,
  CreateLmsCertificationRequest,
  CreateLmsCmi5PackageRequest,
  CreateLmsCmi5RegistrationRequest,
  CreateLmsCmsBindingRequest,
  CreateLmsCohortRequest,
  CreateLmsCommerceActivationRequest,
  CreateLmsCommerceBindingRequest,
  CreateLmsCompetencyAwardRequest,
  CreateLmsCompetencyFrameworkRequest,
  CreateLmsCompetencyRequest,
  CreateLmsConsumerBindingRequest,
  CreateLmsCourseRunRequest,
  CreateLmsDiscussionPostRequest,
  CreateLmsDiscussionThreadRequest,
  CreateLmsEmbeddedBindingRequest,
  CreateLmsEnrollmentRequest,
  CreateLmsExportArtifactRequest,
  CreateLmsFormalReviewRequest,
  CreateLmsIdentityBindingRequest,
  CreateLmsImportValidationRequest,
  CreateLmsLessonPackageBindingRequest,
  CreateLmsLtiDeploymentRequest,
  CreateLmsLtiLaunchRequest,
  CreateLmsLtiToolRequest,
  CreateLmsNotificationCampaignRequest,
  CreateLmsPathwayRequest,
  CreateLmsPortalRequest,
  CreateLmsProgramRequest,
  CreateLmsReadinessReviewRequest,
  CreateLmsRecertificationRequest,
  CreateLmsRemediationBindingRequest,
  CreateLmsRestoreRequest,
  CreateLmsRosterExportRequest,
  CreateLmsRubricRequest,
  CreateLmsScormPackageRequest,
  CreateLmsScormRegistrationRequest,
  CreateLmsSessionRequest,
  CreateLmsXapiProviderRequest,
  GradeLmsAttemptRequest,
  IngestLmsXapiStatementRequest,
  IssueLmsCertificateRequest,
  LaunchLmsCourseRunResponse,
  LmsAccessResolutionsResponse,
  LmsAssessmentPackageBindingRecord,
  LmsAssessmentPackageBindingsResponse,
  LmsAssignmentRecord,
  LmsAssignmentStatus,
  LmsAssignmentType,
  LmsAssignmentsResponse,
  LmsAttemptRecord,
  LmsAttemptStatus,
  LmsAttemptsResponse,
  LmsAttendanceRecord,
  LmsAttendanceResponse,
  LmsAttendanceStatus,
  LmsAutomationRuleRecord,
  LmsAutomationRuleStatus,
  LmsAutomationRulesResponse,
  LmsAutomationRunRecord,
  LmsAutomationRunsResponse,
  LmsBackupArtifactRecord,
  LmsBackupsResponse,
  LmsBadgeAwardRecord,
  LmsBadgeAwardStatus,
  LmsBadgesResponse,
  LmsBenchmarkRunRecord,
  LmsBenchmarksResponse,
  LmsCatalogRecord,
  LmsCatalogStatus,
  LmsCatalogVisibility,
  LmsCatalogsResponse,
  LmsCertificateRecord,
  LmsCertificateStatus,
  LmsCertificatesResponse,
  LmsCertificationRecord,
  LmsCertificationStatus,
  LmsCertificationsResponse,
  LmsCmi5PackageRecord,
  LmsCmi5PackageStatus,
  LmsCmi5PackagesResponse,
  LmsCmi5RegistrationRecord,
  LmsCmi5RegistrationStatus,
  LmsCmi5RegistrationsResponse,
  LmsCmsBindingRecord,
  LmsCmsBindingStatus,
  LmsCmsBindingsResponse,
  LmsCohortRecord,
  LmsCohortStatus,
  LmsCohortsResponse,
  LmsCommerceActivationRecord,
  LmsCommerceActivationStatus,
  LmsCommerceActivationsResponse,
  LmsCommerceBindingRecord,
  LmsCommerceBindingStatus,
  LmsCommerceBindingsResponse,
  LmsCompetenciesResponse,
  LmsCompetencyAwardRecord,
  LmsCompetencyAwardsResponse,
  LmsCompetencyFrameworkRecord,
  LmsCompetencyFrameworkStatus,
  LmsCompetencyFrameworksResponse,
  LmsCompetencyRecord,
  LmsCompetencyStatus,
  LmsConsumerBindingRecord,
  LmsConsumerBindingStatus,
  LmsConsumerBindingsResponse,
  LmsContentManifestRecord,
  LmsContentManifestsResponse,
  LmsCourseRunRecord,
  LmsCourseRunStatus,
  LmsCourseRunsResponse,
  LmsDeliveryMode,
  LmsDifferentiationResponse,
  LmsDiscussionPostRecord,
  LmsDiscussionPostsResponse,
  LmsDiscussionThreadRecord,
  LmsDiscussionThreadStatus,
  LmsDiscussionThreadsResponse,
  LmsEmbeddedBindingRecord,
  LmsEmbeddedBindingStatus,
  LmsEmbeddedBindingsResponse,
  LmsEnrollmentRecord,
  LmsEnrollmentStatus,
  LmsEnrollmentsResponse,
  LmsExportArtifactRecord,
  LmsExportArtifactsResponse,
  LmsFormalReviewRecord,
  LmsFormalReviewsResponse,
  LmsGradebookPassState,
  LmsGradebookResponse,
  LmsGradingQueueRecord,
  LmsGradingQueueResponse,
  LmsGradingQueueStatus,
  LmsIdentityBindingRecord,
  LmsIdentityBindingStatus,
  LmsIdentityBindingsResponse,
  LmsImportValidationRecord,
  LmsImportValidationsResponse,
  LmsInstructorConsoleResponse,
  LmsInteroperabilityResponse,
  LmsLearnerRiskLevel,
  LmsLearnerRiskResponse,
  LmsLessonPackageBindingRecord,
  LmsLessonPackageBindingsResponse,
  LmsLtiDeploymentRecord,
  LmsLtiDeploymentStatus,
  LmsLtiDeploymentsResponse,
  LmsLtiLaunchRecord,
  LmsLtiLaunchStatus,
  LmsLtiLaunchesResponse,
  LmsLtiToolRecord,
  LmsLtiToolStatus,
  LmsLtiToolsResponse,
  LmsManagerConsoleResponse,
  LmsNotificationCampaignRecord,
  LmsNotificationCampaignStatus,
  LmsNotificationCampaignsResponse,
  LmsOperationsDiagnosticsResponse,
  LmsOperationsHealthResponse,
  LmsOperationsSummaryResponse,
  LmsPathwayRecord,
  LmsPathwayStatus,
  LmsPathwaysResponse,
  LmsPortalRecord,
  LmsPortalStatus,
  LmsPortalsResponse,
  LmsProgramDeliveryModel,
  LmsProgramRecord,
  LmsProgramStatus,
  LmsProgramsResponse,
  LmsReadinessReviewRecord,
  LmsReadinessReviewsResponse,
  LmsRecertificationRecord,
  LmsRecertificationResponse,
  LmsRecertificationStatus,
  LmsRemediationBindingRecord,
  LmsRemediationBindingsResponse,
  LmsResilienceRunRecord,
  LmsResilienceRunsResponse,
  LmsRestoreRecord,
  LmsRestoresResponse,
  LmsReviewSummaryResponse,
  LmsRosterExportRecord,
  LmsRosterExportStatus,
  LmsRosterExportTargetKind,
  LmsRosterExportsResponse,
  LmsRubricRecord,
  LmsRubricStatus,
  LmsRubricsResponse,
  LmsRunbooksResponse,
  LmsScormPackageRecord,
  LmsScormPackageStatus,
  LmsScormPackagesResponse,
  LmsScormRegistrationRecord,
  LmsScormRegistrationStatus,
  LmsScormRegistrationsResponse,
  LmsSessionRecord,
  LmsSessionStatus,
  LmsSessionsResponse,
  LmsStandardsMatrixResponse,
  LmsSummaryResponse,
  LmsTranscriptsResponse,
  LmsValidationDomainsResponse,
  LmsXapiProviderRecord,
  LmsXapiProviderStatus,
  LmsXapiProvidersResponse,
  LmsXapiStatementRecord,
  LmsXapiStatementStatus,
  LmsXapiStatementsResponse,
  ResolveLmsAccessRequest,
  ResolveLmsContentManifestRequest,
  SubmitLmsAttemptRequest,
  UpdateLmsAssessmentPackageBindingRequest,
  UpdateLmsAssignmentRequest,
  UpdateLmsAttendanceRequest,
  UpdateLmsAutomationRuleRequest,
  UpdateLmsBadgeAwardRequest,
  UpdateLmsCatalogRequest,
  UpdateLmsCertificateRequest,
  UpdateLmsCertificationRequest,
  UpdateLmsCmi5PackageRequest,
  UpdateLmsCmi5RegistrationRequest,
  UpdateLmsCmsBindingRequest,
  UpdateLmsCohortRequest,
  UpdateLmsCommerceActivationRequest,
  UpdateLmsCommerceBindingRequest,
  UpdateLmsCompetencyFrameworkRequest,
  UpdateLmsCompetencyRequest,
  UpdateLmsConsumerBindingRequest,
  UpdateLmsCourseRunRequest,
  UpdateLmsDiscussionPostRequest,
  UpdateLmsDiscussionThreadRequest,
  UpdateLmsEmbeddedBindingRequest,
  UpdateLmsEnrollmentRequest,
  UpdateLmsGradingQueueRequest,
  UpdateLmsIdentityBindingRequest,
  UpdateLmsLessonPackageBindingRequest,
  UpdateLmsLtiDeploymentRequest,
  UpdateLmsLtiLaunchRequest,
  UpdateLmsLtiToolRequest,
  UpdateLmsNotificationCampaignRequest,
  UpdateLmsPathwayRequest,
  UpdateLmsPortalRequest,
  UpdateLmsProgramRequest,
  UpdateLmsRecertificationRequest,
  UpdateLmsRemediationBindingRequest,
  UpdateLmsRosterExportRequest,
  UpdateLmsRubricRequest,
  UpdateLmsScormPackageRequest,
  UpdateLmsScormRegistrationRequest,
  UpdateLmsSessionRequest,
  UpdateLmsXapiProviderRequest,
} from './legacyLmsTypes'

export const legacyLmsApi = {
  async getLmsSummary(): Promise<LmsSummaryResponse> {
    const response = await api.get('/lms/summary')
    return response.data
  },

  async getLmsOperationsSummary(): Promise<LmsOperationsSummaryResponse> {
    const response = await api.get('/lms/operations/summary')
    return response.data
  },

  async getLmsOperationsDiagnostics(): Promise<LmsOperationsDiagnosticsResponse> {
    const response = await api.get('/lms/operations/diagnostics')
    return response.data
  },

  async getLmsOperationsHealth(): Promise<LmsOperationsHealthResponse> {
    const response = await api.get('/lms/operations/health')
    return response.data
  },

  async listLmsRunbooks(): Promise<LmsRunbooksResponse> {
    const response = await api.get('/lms/operations/runbooks')
    return response.data
  },

  async listLmsBackups(): Promise<LmsBackupsResponse> {
    const response = await api.get('/lms/operations/backups')
    return response.data
  },

  async createLmsBackup(request?: CreateLmsBackupRequest): Promise<LmsBackupArtifactRecord> {
    const response = await api.post('/lms/operations/backups', request ?? {})
    return response.data
  },

  async listLmsRestores(): Promise<LmsRestoresResponse> {
    const response = await api.get('/lms/operations/restores')
    return response.data
  },

  async createLmsRestore(request: CreateLmsRestoreRequest): Promise<LmsRestoreRecord> {
    const response = await api.post('/lms/operations/restores', request)
    return response.data
  },

  async listLmsExportArtifacts(): Promise<LmsExportArtifactsResponse> {
    const response = await api.get('/lms/operations/exports')
    return response.data
  },

  async createLmsExportArtifact(request?: CreateLmsExportArtifactRequest): Promise<LmsExportArtifactRecord> {
    const response = await api.post('/lms/operations/exports', request ?? {})
    return response.data
  },

  async listLmsImportValidations(): Promise<LmsImportValidationsResponse> {
    const response = await api.get('/lms/operations/import-validations')
    return response.data
  },

  async createLmsImportValidation(
    request: CreateLmsImportValidationRequest
  ): Promise<LmsImportValidationRecord> {
    const response = await api.post('/lms/operations/import-validations', request)
    return response.data
  },

  async listLmsBenchmarkRuns(): Promise<LmsBenchmarksResponse> {
    const response = await api.get('/lms/operations/benchmarks')
    return response.data
  },

  async runLmsBenchmarks(): Promise<LmsBenchmarkRunRecord> {
    const response = await api.post('/lms/operations/benchmarks', {})
    return response.data
  },

  async listLmsResilienceRuns(): Promise<LmsResilienceRunsResponse> {
    const response = await api.get('/lms/operations/resilience')
    return response.data
  },

  async runLmsResilience(): Promise<LmsResilienceRunRecord> {
    const response = await api.post('/lms/operations/resilience', {})
    return response.data
  },

  async listLmsReadinessReviews(): Promise<LmsReadinessReviewsResponse> {
    const response = await api.get('/lms/operations/readiness-review')
    return response.data
  },

  async createLmsReadinessReview(
    request?: CreateLmsReadinessReviewRequest
  ): Promise<LmsReadinessReviewRecord> {
    const response = await api.post('/lms/operations/readiness-review', request ?? {})
    return response.data
  },

  async getLmsReviewSummary(): Promise<LmsReviewSummaryResponse> {
    const response = await api.get('/lms/review/summary')
    return response.data
  },

  async getLmsStandardsMatrix(): Promise<LmsStandardsMatrixResponse> {
    const response = await api.get('/lms/review/standards-matrix')
    return response.data
  },

  async getLmsInteroperabilityReview(): Promise<LmsInteroperabilityResponse> {
    const response = await api.get('/lms/review/interoperability')
    return response.data
  },

  async getLmsDifferentiationReview(): Promise<LmsDifferentiationResponse> {
    const response = await api.get('/lms/review/differentiation')
    return response.data
  },

  async listLmsFormalReviews(): Promise<LmsFormalReviewsResponse> {
    const response = await api.get('/lms/review/formal')
    return response.data
  },

  async createLmsFormalReview(
    request?: CreateLmsFormalReviewRequest
  ): Promise<LmsFormalReviewRecord> {
    const response = await api.post('/lms/review/formal', request ?? {})
    return response.data
  },

  async listLmsValidationDomains(): Promise<LmsValidationDomainsResponse> {
    const response = await api.get('/lms/validation-domains')
    return response.data
  },

  async listLmsPortals(filters?: {
    deliveryMode?: LmsDeliveryMode
    status?: LmsPortalStatus
    validationDomainId?: string
  }): Promise<LmsPortalsResponse> {
    const response = await api.get('/lms/portals', {
      params: {
        delivery_mode: filters?.deliveryMode,
        status: filters?.status,
        validation_domain_id: filters?.validationDomainId,
      },
    })
    return response.data
  },

  async createLmsPortal(request: CreateLmsPortalRequest): Promise<LmsPortalRecord> {
    const response = await api.post('/lms/portals', request)
    return response.data
  },

  async updateLmsPortal(portalId: string, request: UpdateLmsPortalRequest): Promise<LmsPortalRecord> {
    const response = await api.put(`/lms/portals/${portalId}`, request)
    return response.data
  },

  async listLmsCatalogs(filters?: {
    portalId?: string
    status?: LmsCatalogStatus
    visibility?: LmsCatalogVisibility
  }): Promise<LmsCatalogsResponse> {
    const response = await api.get('/lms/catalogs', {
      params: {
        portal_id: filters?.portalId,
        status: filters?.status,
        visibility: filters?.visibility,
      },
    })
    return response.data
  },

  async createLmsCatalog(request: CreateLmsCatalogRequest): Promise<LmsCatalogRecord> {
    const response = await api.post('/lms/catalogs', request)
    return response.data
  },

  async updateLmsCatalog(catalogId: string, request: UpdateLmsCatalogRequest): Promise<LmsCatalogRecord> {
    const response = await api.put(`/lms/catalogs/${catalogId}`, request)
    return response.data
  },

  async listLmsPrograms(filters?: {
    portalId?: string
    catalogId?: string
    status?: LmsProgramStatus
    deliveryModel?: LmsProgramDeliveryModel
  }): Promise<LmsProgramsResponse> {
    const response = await api.get('/lms/programs', {
      params: {
        portal_id: filters?.portalId,
        catalog_id: filters?.catalogId,
        status: filters?.status,
        delivery_model: filters?.deliveryModel,
      },
    })
    return response.data
  },

  async createLmsProgram(request: CreateLmsProgramRequest): Promise<LmsProgramRecord> {
    const response = await api.post('/lms/programs', request)
    return response.data
  },

  async updateLmsProgram(programId: string, request: UpdateLmsProgramRequest): Promise<LmsProgramRecord> {
    const response = await api.put(`/lms/programs/${programId}`, request)
    return response.data
  },

  async listLmsPathways(filters?: {
    portalId?: string
    status?: LmsPathwayStatus
  }): Promise<LmsPathwaysResponse> {
    const response = await api.get('/lms/pathways', {
      params: {
        portal_id: filters?.portalId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsPathway(request: CreateLmsPathwayRequest): Promise<LmsPathwayRecord> {
    const response = await api.post('/lms/pathways', request)
    return response.data
  },

  async updateLmsPathway(pathwayId: string, request: UpdateLmsPathwayRequest): Promise<LmsPathwayRecord> {
    const response = await api.put(`/lms/pathways/${pathwayId}`, request)
    return response.data
  },

  async listLmsCertifications(filters?: {
    portalId?: string
    status?: LmsCertificationStatus
  }): Promise<LmsCertificationsResponse> {
    const response = await api.get('/lms/certifications', {
      params: {
        portal_id: filters?.portalId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsCertification(request: CreateLmsCertificationRequest): Promise<LmsCertificationRecord> {
    const response = await api.post('/lms/certifications', request)
    return response.data
  },

  async updateLmsCertification(
    certificationId: string,
    request: UpdateLmsCertificationRequest
  ): Promise<LmsCertificationRecord> {
    const response = await api.put(`/lms/certifications/${certificationId}`, request)
    return response.data
  },

  async listLmsEmbeddedBindings(filters?: {
    portalId?: string
    status?: LmsEmbeddedBindingStatus
  }): Promise<LmsEmbeddedBindingsResponse> {
    const response = await api.get('/lms/embedded-bindings', {
      params: {
        portal_id: filters?.portalId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsEmbeddedBinding(request: CreateLmsEmbeddedBindingRequest): Promise<LmsEmbeddedBindingRecord> {
    const response = await api.post('/lms/embedded-bindings', request)
    return response.data
  },

  async updateLmsEmbeddedBinding(
    bindingId: string,
    request: UpdateLmsEmbeddedBindingRequest
  ): Promise<LmsEmbeddedBindingRecord> {
    const response = await api.put(`/lms/embedded-bindings/${bindingId}`, request)
    return response.data
  },

  async listLmsCmsBindings(filters?: {
    portalId?: string
    catalogId?: string
    status?: LmsCmsBindingStatus
  }): Promise<LmsCmsBindingsResponse> {
    const response = await api.get('/lms/cms-bindings', {
      params: {
        portal_id: filters?.portalId,
        catalog_id: filters?.catalogId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsCmsBinding(request: CreateLmsCmsBindingRequest): Promise<LmsCmsBindingRecord> {
    const response = await api.post('/lms/cms-bindings', request)
    return response.data
  },

  async updateLmsCmsBinding(bindingId: string, request: UpdateLmsCmsBindingRequest): Promise<LmsCmsBindingRecord> {
    const response = await api.put(`/lms/cms-bindings/${bindingId}`, request)
    return response.data
  },

  async listLmsLessonPackageBindings(filters?: {
    portalId?: string
    programId?: string
    cmsBindingId?: string
    status?: LmsCmsBindingStatus
  }): Promise<LmsLessonPackageBindingsResponse> {
    const response = await api.get('/lms/lesson-package-bindings', {
      params: {
        portal_id: filters?.portalId,
        program_id: filters?.programId,
        cms_binding_id: filters?.cmsBindingId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsLessonPackageBinding(request: CreateLmsLessonPackageBindingRequest): Promise<LmsLessonPackageBindingRecord> {
    const response = await api.post('/lms/lesson-package-bindings', request)
    return response.data
  },

  async updateLmsLessonPackageBinding(
    lessonPackageBindingId: string,
    request: UpdateLmsLessonPackageBindingRequest
  ): Promise<LmsLessonPackageBindingRecord> {
    const response = await api.put(`/lms/lesson-package-bindings/${lessonPackageBindingId}`, request)
    return response.data
  },

  async listLmsAssessmentPackageBindings(filters?: {
    portalId?: string
    programId?: string
    assignmentId?: string
    cmsBindingId?: string
    status?: LmsCmsBindingStatus
  }): Promise<LmsAssessmentPackageBindingsResponse> {
    const response = await api.get('/lms/assessment-package-bindings', {
      params: {
        portal_id: filters?.portalId,
        program_id: filters?.programId,
        assignment_id: filters?.assignmentId,
        cms_binding_id: filters?.cmsBindingId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsAssessmentPackageBinding(
    request: CreateLmsAssessmentPackageBindingRequest
  ): Promise<LmsAssessmentPackageBindingRecord> {
    const response = await api.post('/lms/assessment-package-bindings', request)
    return response.data
  },

  async updateLmsAssessmentPackageBinding(
    assessmentPackageBindingId: string,
    request: UpdateLmsAssessmentPackageBindingRequest
  ): Promise<LmsAssessmentPackageBindingRecord> {
    const response = await api.put(`/lms/assessment-package-bindings/${assessmentPackageBindingId}`, request)
    return response.data
  },

  async listLmsRemediationBindings(filters?: {
    portalId?: string
    programId?: string
    cmsBindingId?: string
    status?: LmsCmsBindingStatus
  }): Promise<LmsRemediationBindingsResponse> {
    const response = await api.get('/lms/remediation-bindings', {
      params: {
        portal_id: filters?.portalId,
        program_id: filters?.programId,
        cms_binding_id: filters?.cmsBindingId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsRemediationBinding(request: CreateLmsRemediationBindingRequest): Promise<LmsRemediationBindingRecord> {
    const response = await api.post('/lms/remediation-bindings', request)
    return response.data
  },

  async updateLmsRemediationBinding(
    remediationBindingId: string,
    request: UpdateLmsRemediationBindingRequest
  ): Promise<LmsRemediationBindingRecord> {
    const response = await api.put(`/lms/remediation-bindings/${remediationBindingId}`, request)
    return response.data
  },

  async listLmsContentManifests(filters?: {
    portalId?: string
    programId?: string
    enrollmentId?: string
    learnerPrincipalId?: string
  }): Promise<LmsContentManifestsResponse> {
    const response = await api.get('/lms/content-manifests', {
      params: {
        portal_id: filters?.portalId,
        program_id: filters?.programId,
        enrollment_id: filters?.enrollmentId,
        learner_principal_id: filters?.learnerPrincipalId,
      },
    })
    return response.data
  },

  async resolveLmsContentManifest(request: ResolveLmsContentManifestRequest): Promise<LmsContentManifestRecord> {
    const response = await api.post('/lms/content-manifests/resolve', request)
    return response.data
  },

  async listLmsScormPackages(filters?: {
    portalId?: string
    programId?: string
    status?: LmsScormPackageStatus
  }): Promise<LmsScormPackagesResponse> {
    const response = await api.get('/lms/scorm-packages', {
      params: {
        portal_id: filters?.portalId,
        program_id: filters?.programId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsScormPackage(request: CreateLmsScormPackageRequest): Promise<LmsScormPackageRecord> {
    const response = await api.post('/lms/scorm-packages', request)
    return response.data
  },

  async updateLmsScormPackage(scormPackageId: string, request: UpdateLmsScormPackageRequest): Promise<LmsScormPackageRecord> {
    const response = await api.put(`/lms/scorm-packages/${scormPackageId}`, request)
    return response.data
  },

  async listLmsScormRegistrations(filters?: {
    portalId?: string
    programId?: string
    enrollmentId?: string
    scormPackageId?: string
    status?: LmsScormRegistrationStatus
  }): Promise<LmsScormRegistrationsResponse> {
    const response = await api.get('/lms/scorm-registrations', {
      params: {
        portal_id: filters?.portalId,
        program_id: filters?.programId,
        enrollment_id: filters?.enrollmentId,
        scorm_package_id: filters?.scormPackageId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsScormRegistration(request: CreateLmsScormRegistrationRequest): Promise<LmsScormRegistrationRecord> {
    const response = await api.post('/lms/scorm-registrations', request)
    return response.data
  },

  async updateLmsScormRegistration(scormRegistrationId: string, request: UpdateLmsScormRegistrationRequest): Promise<LmsScormRegistrationRecord> {
    const response = await api.put(`/lms/scorm-registrations/${scormRegistrationId}`, request)
    return response.data
  },

  async listLmsXapiProviders(filters?: {
    portalId?: string
    status?: LmsXapiProviderStatus
  }): Promise<LmsXapiProvidersResponse> {
    const response = await api.get('/lms/xapi-providers', {
      params: {
        portal_id: filters?.portalId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsXapiProvider(request: CreateLmsXapiProviderRequest): Promise<LmsXapiProviderRecord> {
    const response = await api.post('/lms/xapi-providers', request)
    return response.data
  },

  async updateLmsXapiProvider(providerId: string, request: UpdateLmsXapiProviderRequest): Promise<LmsXapiProviderRecord> {
    const response = await api.put(`/lms/xapi-providers/${providerId}`, request)
    return response.data
  },

  async listLmsXapiStatements(filters?: {
    portalId?: string
    providerId?: string
    programId?: string
    enrollmentId?: string
    status?: LmsXapiStatementStatus
  }): Promise<LmsXapiStatementsResponse> {
    const response = await api.get('/lms/xapi-statements', {
      params: {
        portal_id: filters?.portalId,
        provider_id: filters?.providerId,
        program_id: filters?.programId,
        enrollment_id: filters?.enrollmentId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async ingestLmsXapiStatement(request: IngestLmsXapiStatementRequest): Promise<LmsXapiStatementRecord> {
    const response = await api.post('/lms/xapi-statements', request)
    return response.data
  },

  async listLmsCmi5Packages(filters?: {
    portalId?: string
    programId?: string
    status?: LmsCmi5PackageStatus
  }): Promise<LmsCmi5PackagesResponse> {
    const response = await api.get('/lms/cmi5-packages', {
      params: {
        portal_id: filters?.portalId,
        program_id: filters?.programId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsCmi5Package(request: CreateLmsCmi5PackageRequest): Promise<LmsCmi5PackageRecord> {
    const response = await api.post('/lms/cmi5-packages', request)
    return response.data
  },

  async updateLmsCmi5Package(cmi5PackageId: string, request: UpdateLmsCmi5PackageRequest): Promise<LmsCmi5PackageRecord> {
    const response = await api.put(`/lms/cmi5-packages/${cmi5PackageId}`, request)
    return response.data
  },

  async listLmsCmi5Registrations(filters?: {
    portalId?: string
    programId?: string
    enrollmentId?: string
    cmi5PackageId?: string
    status?: LmsCmi5RegistrationStatus
  }): Promise<LmsCmi5RegistrationsResponse> {
    const response = await api.get('/lms/cmi5-registrations', {
      params: {
        portal_id: filters?.portalId,
        program_id: filters?.programId,
        enrollment_id: filters?.enrollmentId,
        cmi5_package_id: filters?.cmi5PackageId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsCmi5Registration(request: CreateLmsCmi5RegistrationRequest): Promise<LmsCmi5RegistrationRecord> {
    const response = await api.post('/lms/cmi5-registrations', request)
    return response.data
  },

  async updateLmsCmi5Registration(cmi5RegistrationId: string, request: UpdateLmsCmi5RegistrationRequest): Promise<LmsCmi5RegistrationRecord> {
    const response = await api.put(`/lms/cmi5-registrations/${cmi5RegistrationId}`, request)
    return response.data
  },

  async listLmsLtiTools(filters?: {
    portalId?: string
    status?: LmsLtiToolStatus
  }): Promise<LmsLtiToolsResponse> {
    const response = await api.get('/lms/lti-tools', {
      params: {
        portal_id: filters?.portalId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsLtiTool(request: CreateLmsLtiToolRequest): Promise<LmsLtiToolRecord> {
    const response = await api.post('/lms/lti-tools', request)
    return response.data
  },

  async updateLmsLtiTool(toolId: string, request: UpdateLmsLtiToolRequest): Promise<LmsLtiToolRecord> {
    const response = await api.put(`/lms/lti-tools/${toolId}`, request)
    return response.data
  },

  async listLmsLtiDeployments(filters?: {
    portalId?: string
    toolId?: string
    programId?: string
    status?: LmsLtiDeploymentStatus
  }): Promise<LmsLtiDeploymentsResponse> {
    const response = await api.get('/lms/lti-deployments', {
      params: {
        portal_id: filters?.portalId,
        tool_id: filters?.toolId,
        program_id: filters?.programId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsLtiDeployment(request: CreateLmsLtiDeploymentRequest): Promise<LmsLtiDeploymentRecord> {
    const response = await api.post('/lms/lti-deployments', request)
    return response.data
  },

  async updateLmsLtiDeployment(deploymentId: string, request: UpdateLmsLtiDeploymentRequest): Promise<LmsLtiDeploymentRecord> {
    const response = await api.put(`/lms/lti-deployments/${deploymentId}`, request)
    return response.data
  },

  async listLmsLtiLaunches(filters?: {
    portalId?: string
    deploymentId?: string
    enrollmentId?: string
    status?: LmsLtiLaunchStatus
  }): Promise<LmsLtiLaunchesResponse> {
    const response = await api.get('/lms/lti-launches', {
      params: {
        portal_id: filters?.portalId,
        deployment_id: filters?.deploymentId,
        enrollment_id: filters?.enrollmentId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsLtiLaunch(request: CreateLmsLtiLaunchRequest): Promise<LmsLtiLaunchRecord> {
    const response = await api.post('/lms/lti-launches', request)
    return response.data
  },

  async updateLmsLtiLaunch(launchId: string, request: UpdateLmsLtiLaunchRequest): Promise<LmsLtiLaunchRecord> {
    const response = await api.put(`/lms/lti-launches/${launchId}`, request)
    return response.data
  },

  async listLmsRosterExports(filters?: {
    portalId?: string
    courseRunId?: string
    targetKind?: LmsRosterExportTargetKind
    status?: LmsRosterExportStatus
  }): Promise<LmsRosterExportsResponse> {
    const response = await api.get('/lms/roster-exports', {
      params: {
        portal_id: filters?.portalId,
        course_run_id: filters?.courseRunId,
        target_kind: filters?.targetKind,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsRosterExport(request: CreateLmsRosterExportRequest): Promise<LmsRosterExportRecord> {
    const response = await api.post('/lms/roster-exports', request)
    return response.data
  },

  async updateLmsRosterExport(rosterExportId: string, request: UpdateLmsRosterExportRequest): Promise<LmsRosterExportRecord> {
    const response = await api.put(`/lms/roster-exports/${rosterExportId}`, request)
    return response.data
  },

  async listLmsDiscussionThreads(filters?: {
    portalId?: string
    programId?: string
    courseRunId?: string
    assignmentId?: string
    status?: LmsDiscussionThreadStatus
  }): Promise<LmsDiscussionThreadsResponse> {
    const response = await api.get('/lms/discussion-threads', {
      params: {
        portal_id: filters?.portalId,
        program_id: filters?.programId,
        course_run_id: filters?.courseRunId,
        assignment_id: filters?.assignmentId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsDiscussionThread(request: CreateLmsDiscussionThreadRequest): Promise<LmsDiscussionThreadRecord> {
    const response = await api.post('/lms/discussion-threads', request)
    return response.data
  },

  async updateLmsDiscussionThread(threadId: string, request: UpdateLmsDiscussionThreadRequest): Promise<LmsDiscussionThreadRecord> {
    const response = await api.put(`/lms/discussion-threads/${threadId}`, request)
    return response.data
  },

  async listLmsDiscussionPosts(filters?: {
    threadId?: string
    portalId?: string
  }): Promise<LmsDiscussionPostsResponse> {
    const response = await api.get('/lms/discussion-posts', {
      params: {
        thread_id: filters?.threadId,
        portal_id: filters?.portalId,
      },
    })
    return response.data
  },

  async createLmsDiscussionPost(request: CreateLmsDiscussionPostRequest): Promise<LmsDiscussionPostRecord> {
    const response = await api.post('/lms/discussion-posts', request)
    return response.data
  },

  async updateLmsDiscussionPost(postId: string, request: UpdateLmsDiscussionPostRequest): Promise<LmsDiscussionPostRecord> {
    const response = await api.put(`/lms/discussion-posts/${postId}`, request)
    return response.data
  },

  async listLmsNotificationCampaigns(filters?: {
    portalId?: string
    status?: LmsNotificationCampaignStatus
  }): Promise<LmsNotificationCampaignsResponse> {
    const response = await api.get('/lms/notification-campaigns', {
      params: {
        portal_id: filters?.portalId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsNotificationCampaign(request: CreateLmsNotificationCampaignRequest): Promise<LmsNotificationCampaignRecord> {
    const response = await api.post('/lms/notification-campaigns', request)
    return response.data
  },

  async updateLmsNotificationCampaign(campaignId: string, request: UpdateLmsNotificationCampaignRequest): Promise<LmsNotificationCampaignRecord> {
    const response = await api.put(`/lms/notification-campaigns/${campaignId}`, request)
    return response.data
  },

  async listLmsLearnerRisk(filters?: {
    portalId?: string
    programId?: string
    riskLevel?: LmsLearnerRiskLevel
  }): Promise<LmsLearnerRiskResponse> {
    const response = await api.get('/lms/analytics/learner-risk', {
      params: {
        portal_id: filters?.portalId,
        program_id: filters?.programId,
        risk_level: filters?.riskLevel,
      },
    })
    return response.data
  },

  async listLmsInstructorConsole(filters?: {
    portalId?: string
    instructorPrincipalId?: string
  }): Promise<LmsInstructorConsoleResponse> {
    const response = await api.get('/lms/analytics/instructor-console', {
      params: {
        portal_id: filters?.portalId,
        instructor_principal_id: filters?.instructorPrincipalId,
      },
    })
    return response.data
  },

  async listLmsManagerConsole(filters?: {
    portalId?: string
    managerPrincipalId?: string
  }): Promise<LmsManagerConsoleResponse> {
    const response = await api.get('/lms/analytics/manager-console', {
      params: {
        portal_id: filters?.portalId,
        manager_principal_id: filters?.managerPrincipalId,
      },
    })
    return response.data
  },

  async listLmsAutomationRules(filters?: {
    portalId?: string
    status?: LmsAutomationRuleStatus
  }): Promise<LmsAutomationRulesResponse> {
    const response = await api.get('/lms/automation-rules', {
      params: {
        portal_id: filters?.portalId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsAutomationRule(request: CreateLmsAutomationRuleRequest): Promise<LmsAutomationRuleRecord> {
    const response = await api.post('/lms/automation-rules', request)
    return response.data
  },

  async updateLmsAutomationRule(ruleId: string, request: UpdateLmsAutomationRuleRequest): Promise<LmsAutomationRuleRecord> {
    const response = await api.put(`/lms/automation-rules/${ruleId}`, request)
    return response.data
  },

  async listLmsAutomationRuns(filters?: {
    portalId?: string
    ruleId?: string
  }): Promise<LmsAutomationRunsResponse> {
    const response = await api.get('/lms/automation-runs', {
      params: {
        portal_id: filters?.portalId,
        rule_id: filters?.ruleId,
      },
    })
    return response.data
  },

  async runLmsAutomationRule(ruleId: string): Promise<LmsAutomationRunRecord> {
    const response = await api.post(`/lms/automation-rules/${ruleId}/run`)
    return response.data
  },

  async listLmsIdentityBindings(filters?: {
    portalId?: string
    status?: LmsIdentityBindingStatus
  }): Promise<LmsIdentityBindingsResponse> {
    const response = await api.get('/iam/external-identity-bindings', {
      params: {
        consumer_application: 'lms',
        portal_id: filters?.portalId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsIdentityBinding(request: CreateLmsIdentityBindingRequest): Promise<LmsIdentityBindingRecord> {
    const response = await api.post('/iam/external-identity-bindings', {
      ...request,
      consumer_application: 'lms',
    })
    return response.data
  },

  async updateLmsIdentityBinding(
    bindingId: string,
    request: UpdateLmsIdentityBindingRequest
  ): Promise<LmsIdentityBindingRecord> {
    const response = await api.put(`/iam/external-identity-bindings/${bindingId}`, {
      ...request,
      consumer_application: 'lms',
    })
    return response.data
  },

  async listLmsCommerceBindings(filters?: {
    portalId?: string
    catalogId?: string
    status?: LmsCommerceBindingStatus
  }): Promise<LmsCommerceBindingsResponse> {
    const response = await api.get('/lms/commerce-bindings', {
      params: {
        portal_id: filters?.portalId,
        catalog_id: filters?.catalogId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsCommerceBinding(request: CreateLmsCommerceBindingRequest): Promise<LmsCommerceBindingRecord> {
    const response = await api.post('/lms/commerce-bindings', request)
    return response.data
  },

  async updateLmsCommerceBinding(
    bindingId: string,
    request: UpdateLmsCommerceBindingRequest
  ): Promise<LmsCommerceBindingRecord> {
    const response = await api.put(`/lms/commerce-bindings/${bindingId}`, request)
    return response.data
  },

  async listLmsConsumerBindings(filters?: {
    portalId?: string
    consumerApplicationId?: string
    status?: LmsConsumerBindingStatus
  }): Promise<LmsConsumerBindingsResponse> {
    const response = await api.get('/lms/consumer-bindings', {
      params: {
        portal_id: filters?.portalId,
        consumer_application_id: filters?.consumerApplicationId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsConsumerBinding(request: CreateLmsConsumerBindingRequest): Promise<LmsConsumerBindingRecord> {
    const response = await api.post('/lms/consumer-bindings', request)
    return response.data
  },

  async updateLmsConsumerBinding(
    bindingId: string,
    request: UpdateLmsConsumerBindingRequest
  ): Promise<LmsConsumerBindingRecord> {
    const response = await api.put(`/lms/consumer-bindings/${bindingId}`, request)
    return response.data
  },

  async listLmsCommerceActivations(filters?: {
    portalId?: string
    consumerBindingId?: string
    learnerPrincipalId?: string
    status?: LmsCommerceActivationStatus
  }): Promise<LmsCommerceActivationsResponse> {
    const response = await api.get('/lms/commerce-activations', {
      params: {
        portal_id: filters?.portalId,
        consumer_binding_id: filters?.consumerBindingId,
        learner_principal_id: filters?.learnerPrincipalId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsCommerceActivation(request: CreateLmsCommerceActivationRequest): Promise<LmsCommerceActivationRecord> {
    const response = await api.post('/lms/commerce-activations', request)
    return response.data
  },

  async updateLmsCommerceActivation(
    activationId: string,
    request: UpdateLmsCommerceActivationRequest
  ): Promise<LmsCommerceActivationRecord> {
    const response = await api.put(`/lms/commerce-activations/${activationId}`, request)
    return response.data
  },

  async listLmsAccessResolutions(filters?: {
    portalId?: string
    learnerPrincipalId?: string
    consumerBindingId?: string
  }): Promise<LmsAccessResolutionsResponse> {
    const response = await api.get('/lms/access-resolutions', {
      params: {
        portal_id: filters?.portalId,
        learner_principal_id: filters?.learnerPrincipalId,
        consumer_binding_id: filters?.consumerBindingId,
      },
    })
    return response.data
  },

  async resolveLmsAccess(request: ResolveLmsAccessRequest): Promise<LmsAccessResolutionsResponse> {
    const response = await api.post('/lms/access-resolutions/resolve', request)
    return response.data
  },

  async listLmsEnrollments(filters?: {
    portalId?: string
    programId?: string
    cohortId?: string
    learnerPrincipalId?: string
    status?: LmsEnrollmentStatus
  }): Promise<LmsEnrollmentsResponse> {
    const response = await api.get('/lms/enrollments', {
      params: {
        portal_id: filters?.portalId,
        program_id: filters?.programId,
        cohort_id: filters?.cohortId,
        learner_principal_id: filters?.learnerPrincipalId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsEnrollment(request: CreateLmsEnrollmentRequest): Promise<LmsEnrollmentRecord> {
    const response = await api.post('/lms/enrollments', request)
    return response.data
  },

  async updateLmsEnrollment(enrollmentId: string, request: UpdateLmsEnrollmentRequest): Promise<LmsEnrollmentRecord> {
    const response = await api.put(`/lms/enrollments/${enrollmentId}`, request)
    return response.data
  },

  async listLmsCohorts(filters?: {
    portalId?: string
    programId?: string
    status?: LmsCohortStatus
  }): Promise<LmsCohortsResponse> {
    const response = await api.get('/lms/cohorts', {
      params: {
        portal_id: filters?.portalId,
        program_id: filters?.programId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsCohort(request: CreateLmsCohortRequest): Promise<LmsCohortRecord> {
    const response = await api.post('/lms/cohorts', request)
    return response.data
  },

  async updateLmsCohort(cohortId: string, request: UpdateLmsCohortRequest): Promise<LmsCohortRecord> {
    const response = await api.put(`/lms/cohorts/${cohortId}`, request)
    return response.data
  },

  async listLmsCourseRuns(filters?: {
    portalId?: string
    programId?: string
    cohortId?: string
    status?: LmsCourseRunStatus
  }): Promise<LmsCourseRunsResponse> {
    const response = await api.get('/lms/course-runs', {
      params: {
        portal_id: filters?.portalId,
        program_id: filters?.programId,
        cohort_id: filters?.cohortId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsCourseRun(request: CreateLmsCourseRunRequest): Promise<LmsCourseRunRecord> {
    const response = await api.post('/lms/course-runs', request)
    return response.data
  },

  async updateLmsCourseRun(courseRunId: string, request: UpdateLmsCourseRunRequest): Promise<LmsCourseRunRecord> {
    const response = await api.put(`/lms/course-runs/${courseRunId}`, request)
    return response.data
  },

  async launchLmsCourseRun(courseRunId: string): Promise<LaunchLmsCourseRunResponse> {
    const response = await api.post(`/lms/course-runs/${courseRunId}/launch`, {})
    return response.data
  },

  async listLmsSessions(filters?: {
    portalId?: string
    courseRunId?: string
    status?: LmsSessionStatus
  }): Promise<LmsSessionsResponse> {
    const response = await api.get('/lms/sessions', {
      params: {
        portal_id: filters?.portalId,
        course_run_id: filters?.courseRunId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsSession(request: CreateLmsSessionRequest): Promise<LmsSessionRecord> {
    const response = await api.post('/lms/sessions', request)
    return response.data
  },

  async updateLmsSession(sessionId: string, request: UpdateLmsSessionRequest): Promise<LmsSessionRecord> {
    const response = await api.put(`/lms/sessions/${sessionId}`, request)
    return response.data
  },

  async listLmsAttendance(filters?: {
    portalId?: string
    courseRunId?: string
    sessionId?: string
    enrollmentId?: string
    status?: LmsAttendanceStatus
  }): Promise<LmsAttendanceResponse> {
    const response = await api.get('/lms/attendance', {
      params: {
        portal_id: filters?.portalId,
        course_run_id: filters?.courseRunId,
        session_id: filters?.sessionId,
        enrollment_id: filters?.enrollmentId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsAttendance(request: CreateLmsAttendanceRequest): Promise<LmsAttendanceRecord> {
    const response = await api.post('/lms/attendance', request)
    return response.data
  },

  async updateLmsAttendance(attendanceId: string, request: UpdateLmsAttendanceRequest): Promise<LmsAttendanceRecord> {
    const response = await api.put(`/lms/attendance/${attendanceId}`, request)
    return response.data
  },

  async listLmsAssignments(filters?: {
    portalId?: string
    programId?: string
    courseRunId?: string
    status?: LmsAssignmentStatus
    assignmentType?: LmsAssignmentType
  }): Promise<LmsAssignmentsResponse> {
    const response = await api.get('/lms/assignments', {
      params: {
        portal_id: filters?.portalId,
        program_id: filters?.programId,
        course_run_id: filters?.courseRunId,
        status: filters?.status,
        assignment_type: filters?.assignmentType,
      },
    })
    return response.data
  },

  async createLmsAssignment(request: CreateLmsAssignmentRequest): Promise<LmsAssignmentRecord> {
    const response = await api.post('/lms/assignments', request)
    return response.data
  },

  async updateLmsAssignment(assignmentId: string, request: UpdateLmsAssignmentRequest): Promise<LmsAssignmentRecord> {
    const response = await api.put(`/lms/assignments/${assignmentId}`, request)
    return response.data
  },

  async listLmsAttempts(filters?: {
    portalId?: string
    programId?: string
    assignmentId?: string
    enrollmentId?: string
    status?: LmsAttemptStatus
  }): Promise<LmsAttemptsResponse> {
    const response = await api.get('/lms/attempts', {
      params: {
        portal_id: filters?.portalId,
        program_id: filters?.programId,
        assignment_id: filters?.assignmentId,
        enrollment_id: filters?.enrollmentId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsAttempt(request: CreateLmsAttemptRequest): Promise<LmsAttemptRecord> {
    const response = await api.post('/lms/attempts', request)
    return response.data
  },

  async submitLmsAttempt(attemptId: string, request: SubmitLmsAttemptRequest): Promise<LmsAttemptRecord> {
    const response = await api.post(`/lms/attempts/${attemptId}/submit`, request)
    return response.data
  },

  async gradeLmsAttempt(attemptId: string, request: GradeLmsAttemptRequest): Promise<LmsAttemptRecord> {
    const response = await api.post(`/lms/attempts/${attemptId}/grade`, request)
    return response.data
  },

  async listLmsGradingQueue(filters?: {
    portalId?: string
    programId?: string
    status?: LmsGradingQueueStatus
    graderPrincipalId?: string
  }): Promise<LmsGradingQueueResponse> {
    const response = await api.get('/lms/grading-queue', {
      params: {
        portal_id: filters?.portalId,
        program_id: filters?.programId,
        status: filters?.status,
        grader_principal_id: filters?.graderPrincipalId,
      },
    })
    return response.data
  },

  async updateLmsGradingQueue(queueId: string, request: UpdateLmsGradingQueueRequest): Promise<LmsGradingQueueRecord> {
    const response = await api.put(`/lms/grading-queue/${queueId}`, request)
    return response.data
  },

  async listLmsRubrics(filters?: {
    portalId?: string
    programId?: string
    status?: LmsRubricStatus
  }): Promise<LmsRubricsResponse> {
    const response = await api.get('/lms/rubrics', {
      params: {
        portal_id: filters?.portalId,
        program_id: filters?.programId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsRubric(request: CreateLmsRubricRequest): Promise<LmsRubricRecord> {
    const response = await api.post('/lms/rubrics', request)
    return response.data
  },

  async updateLmsRubric(rubricId: string, request: UpdateLmsRubricRequest): Promise<LmsRubricRecord> {
    const response = await api.put(`/lms/rubrics/${rubricId}`, request)
    return response.data
  },

  async listLmsGradebook(filters?: {
    portalId?: string
    programId?: string
    enrollmentId?: string
    passState?: LmsGradebookPassState
  }): Promise<LmsGradebookResponse> {
    const response = await api.get('/lms/gradebook', {
      params: {
        portal_id: filters?.portalId,
        program_id: filters?.programId,
        enrollment_id: filters?.enrollmentId,
        pass_state: filters?.passState,
      },
    })
    return response.data
  },

  async listLmsCompetencyFrameworks(filters?: {
    portalId?: string
    status?: LmsCompetencyFrameworkStatus
  }): Promise<LmsCompetencyFrameworksResponse> {
    const response = await api.get('/lms/competency-frameworks', {
      params: {
        portal_id: filters?.portalId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsCompetencyFramework(request: CreateLmsCompetencyFrameworkRequest): Promise<LmsCompetencyFrameworkRecord> {
    const response = await api.post('/lms/competency-frameworks', request)
    return response.data
  },

  async updateLmsCompetencyFramework(frameworkId: string, request: UpdateLmsCompetencyFrameworkRequest): Promise<LmsCompetencyFrameworkRecord> {
    const response = await api.put(`/lms/competency-frameworks/${frameworkId}`, request)
    return response.data
  },

  async listLmsCompetencies(filters?: {
    portalId?: string
    frameworkId?: string
    programId?: string
    status?: LmsCompetencyStatus
  }): Promise<LmsCompetenciesResponse> {
    const response = await api.get('/lms/competencies', {
      params: {
        portal_id: filters?.portalId,
        framework_id: filters?.frameworkId,
        program_id: filters?.programId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsCompetency(request: CreateLmsCompetencyRequest): Promise<LmsCompetencyRecord> {
    const response = await api.post('/lms/competencies', request)
    return response.data
  },

  async updateLmsCompetency(competencyId: string, request: UpdateLmsCompetencyRequest): Promise<LmsCompetencyRecord> {
    const response = await api.put(`/lms/competencies/${competencyId}`, request)
    return response.data
  },

  async listLmsCompetencyAwards(filters?: {
    portalId?: string
    programId?: string
    competencyId?: string
    learnerPrincipalId?: string
  }): Promise<LmsCompetencyAwardsResponse> {
    const response = await api.get('/lms/competency-awards', {
      params: {
        portal_id: filters?.portalId,
        program_id: filters?.programId,
        competency_id: filters?.competencyId,
        learner_principal_id: filters?.learnerPrincipalId,
      },
    })
    return response.data
  },

  async createLmsCompetencyAward(request: CreateLmsCompetencyAwardRequest): Promise<LmsCompetencyAwardRecord> {
    const response = await api.post('/lms/competency-awards', request)
    return response.data
  },

  async listLmsBadges(filters?: {
    portalId?: string
    certificationId?: string
    learnerPrincipalId?: string
    status?: LmsBadgeAwardStatus
  }): Promise<LmsBadgesResponse> {
    const response = await api.get('/lms/badges', {
      params: {
        portal_id: filters?.portalId,
        certification_id: filters?.certificationId,
        learner_principal_id: filters?.learnerPrincipalId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsBadgeAward(request: CreateLmsBadgeAwardRequest): Promise<LmsBadgeAwardRecord> {
    const response = await api.post('/lms/badges', request)
    return response.data
  },

  async updateLmsBadgeAward(badgeAwardId: string, request: UpdateLmsBadgeAwardRequest): Promise<LmsBadgeAwardRecord> {
    const response = await api.put(`/lms/badges/${badgeAwardId}`, request)
    return response.data
  },

  async listLmsCertificates(filters?: {
    portalId?: string
    certificationId?: string
    learnerPrincipalId?: string
    status?: LmsCertificateStatus
  }): Promise<LmsCertificatesResponse> {
    const response = await api.get('/lms/certificates', {
      params: {
        portal_id: filters?.portalId,
        certification_id: filters?.certificationId,
        learner_principal_id: filters?.learnerPrincipalId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async issueLmsCertificate(request: IssueLmsCertificateRequest): Promise<LmsCertificateRecord> {
    const response = await api.post('/lms/certificates', request)
    return response.data
  },

  async updateLmsCertificate(certificateId: string, request: UpdateLmsCertificateRequest): Promise<LmsCertificateRecord> {
    const response = await api.put(`/lms/certificates/${certificateId}`, request)
    return response.data
  },

  async listLmsTranscripts(filters?: {
    portalId?: string
    learnerPrincipalId?: string
  }): Promise<LmsTranscriptsResponse> {
    const response = await api.get('/lms/transcripts', {
      params: {
        portal_id: filters?.portalId,
        learner_principal_id: filters?.learnerPrincipalId,
      },
    })
    return response.data
  },

  async listLmsRecertification(filters?: {
    portalId?: string
    certificationId?: string
    learnerPrincipalId?: string
    status?: LmsRecertificationStatus
  }): Promise<LmsRecertificationResponse> {
    const response = await api.get('/lms/recertification', {
      params: {
        portal_id: filters?.portalId,
        certification_id: filters?.certificationId,
        learner_principal_id: filters?.learnerPrincipalId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createLmsRecertification(request: CreateLmsRecertificationRequest): Promise<LmsRecertificationRecord> {
    const response = await api.post('/lms/recertification', request)
    return response.data
  },

  async updateLmsRecertification(recertificationRecordId: string, request: UpdateLmsRecertificationRequest): Promise<LmsRecertificationRecord> {
    const response = await api.put(`/lms/recertification/${recertificationRecordId}`, request)
    return response.data
  },
}
