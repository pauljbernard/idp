import { api } from './iamHttpClient'
import type {
  AcknowledgeCommunicationsFormSubmissionRequest,
  CloseCommunicationsFormSubmissionRequest,
  CommunicationsAdoptionPlanRecord,
  CommunicationsAdoptionPlansResponse,
  CommunicationsAudienceResolutionRecord,
  CommunicationsAudienceResolutionStatus,
  CommunicationsAudienceResolutionsResponse,
  CommunicationsBackupRecord,
  CommunicationsBackupStatus,
  CommunicationsBackupsResponse,
  CommunicationsBenchmarkCheckRecord,
  CommunicationsBenchmarkCheckStatus,
  CommunicationsBenchmarkChecksResponse,
  CommunicationsChannelKind,
  CommunicationsChannelProfileRecord,
  CommunicationsChannelProfilesResponse,
  CommunicationsChannelStatus,
  CommunicationsConsentRecord,
  CommunicationsConsentRecordsResponse,
  CommunicationsConsentStatus,
  CommunicationsDeadLetterReason,
  CommunicationsDeadLetterRecord,
  CommunicationsDeadLetterStatus,
  CommunicationsDeadLettersResponse,
  CommunicationsDeliveryAttemptRecord,
  CommunicationsDeliveryAttemptStatus,
  CommunicationsDeliveryAttemptsResponse,
  CommunicationsDiagnosticsRecord,
  CommunicationsDiagnosticsResponse,
  CommunicationsDiagnosticsStatus,
  CommunicationsDispatchRecord,
  CommunicationsDispatchStatus,
  CommunicationsDispatchesResponse,
  CommunicationsEmbeddedBindingRecord,
  CommunicationsEmbeddedBindingStatus,
  CommunicationsEmbeddedBindingsResponse,
  CommunicationsExportArtifactRecord,
  CommunicationsExportArtifactStatus,
  CommunicationsExportArtifactsResponse,
  CommunicationsFormSubmissionRecord,
  CommunicationsFormSubmissionSource,
  CommunicationsFormSubmissionStatus,
  CommunicationsFormSubmissionsResponse,
  CommunicationsFormalReviewRecord,
  CommunicationsFormalReviewsResponse,
  CommunicationsImportValidationRecord,
  CommunicationsImportValidationStatus,
  CommunicationsImportValidationsResponse,
  CommunicationsIntentBindingRecord,
  CommunicationsIntentBindingStatus,
  CommunicationsIntentBindingsResponse,
  CommunicationsIntentEventRecord,
  CommunicationsIntentEventStatus,
  CommunicationsIntentEventsResponse,
  CommunicationsIntentKey,
  CommunicationsIntentSourceSubsystem,
  CommunicationsMessageRequestRecord,
  CommunicationsMessageRequestStatus,
  CommunicationsMessageRequestsResponse,
  CommunicationsNotificationFeedItemRecord,
  CommunicationsNotificationFeedItemStatus,
  CommunicationsNotificationFeedResponse,
  CommunicationsOperationsSummaryResponse,
  CommunicationsOperatorFollowUpRecord,
  CommunicationsOperatorFollowUpStatus,
  CommunicationsOperatorFollowUpsResponse,
  CommunicationsPreferenceProfileRecord,
  CommunicationsPreferenceProfileStatus,
  CommunicationsPreferenceProfilesResponse,
  CommunicationsPreferenceScope,
  CommunicationsProviderBindingRecord,
  CommunicationsProviderBindingStatus,
  CommunicationsProviderBindingsResponse,
  CommunicationsProviderCallbackNormalizationStatus,
  CommunicationsProviderCallbackRecord,
  CommunicationsProviderCallbackStatus,
  CommunicationsProviderCallbackType,
  CommunicationsProviderCallbacksResponse,
  CommunicationsResilienceCheckRecord,
  CommunicationsResilienceCheckStatus,
  CommunicationsResilienceChecksResponse,
  CommunicationsRestoreDrillRecord,
  CommunicationsRestoreDrillsResponse,
  CommunicationsRestoreStatus,
  CommunicationsReviewSummaryResponse,
  CommunicationsSummaryResponse,
  CommunicationsSuppressionEntriesResponse,
  CommunicationsSuppressionEntryRecord,
  CommunicationsSuppressionReason,
  CommunicationsSuppressionStatus,
  CommunicationsTemplateBindingRecord,
  CommunicationsTemplateBindingStatus,
  CommunicationsTemplateBindingsResponse,
  CommunicationsTemplateRenderStatus,
  CommunicationsTemplateRendersResponse,
  CommunicationsValidationDomainsResponse,
  CreateCommunicationsAdoptionPlanRequest,
  CreateCommunicationsAudienceResolutionRequest,
  CreateCommunicationsBackupRequest,
  CreateCommunicationsBenchmarkCheckRequest,
  CreateCommunicationsChannelProfileRequest,
  CreateCommunicationsConsentRecordRequest,
  CreateCommunicationsDeliveryAttemptRequest,
  CreateCommunicationsDiagnosticsRequest,
  CreateCommunicationsDispatchRequest,
  CreateCommunicationsEmbeddedBindingRequest,
  CreateCommunicationsExportArtifactRequest,
  CreateCommunicationsFormSubmissionRequest,
  CreateCommunicationsFormalReviewRequest,
  CreateCommunicationsImportValidationRequest,
  CreateCommunicationsIntentBindingRequest,
  CreateCommunicationsIntentEventRequest,
  CreateCommunicationsMessageRequestRequest,
  CreateCommunicationsNotificationFeedItemRequest,
  CreateCommunicationsOperatorFollowUpRequest,
  CreateCommunicationsPreferenceProfileRequest,
  CreateCommunicationsProviderBindingRequest,
  CreateCommunicationsProviderCallbackRequest,
  CreateCommunicationsResilienceCheckRequest,
  CreateCommunicationsRestoreDrillRequest,
  CreateCommunicationsSuppressionEntryRequest,
  CreateCommunicationsTemplateBindingRequest,
  NormalizeCommunicationsProviderCallbackRequest,
  ProcessCommunicationsDispatchAttemptRequest,
  RedriveCommunicationsDeadLetterRequest,
  RouteCommunicationsFormSubmissionRequest,
  TransitionCommunicationsNotificationFeedItemRequest,
  UpdateCommunicationsAudienceResolutionRequest,
  UpdateCommunicationsBackupRequest,
  UpdateCommunicationsBenchmarkCheckRequest,
  UpdateCommunicationsChannelProfileRequest,
  UpdateCommunicationsConsentRecordRequest,
  UpdateCommunicationsDeadLetterRequest,
  UpdateCommunicationsDeliveryAttemptRequest,
  UpdateCommunicationsDiagnosticsRequest,
  UpdateCommunicationsDispatchRequest,
  UpdateCommunicationsEmbeddedBindingRequest,
  UpdateCommunicationsExportArtifactRequest,
  UpdateCommunicationsFormSubmissionRequest,
  UpdateCommunicationsImportValidationRequest,
  UpdateCommunicationsIntentBindingRequest,
  UpdateCommunicationsIntentEventRequest,
  UpdateCommunicationsMessageRequestRequest,
  UpdateCommunicationsNotificationFeedItemRequest,
  UpdateCommunicationsOperatorFollowUpRequest,
  UpdateCommunicationsPreferenceProfileRequest,
  UpdateCommunicationsProviderBindingRequest,
  UpdateCommunicationsProviderCallbackRequest,
  UpdateCommunicationsResilienceCheckRequest,
  UpdateCommunicationsRestoreDrillRequest,
  UpdateCommunicationsSuppressionEntryRequest,
  UpdateCommunicationsTemplateBindingRequest,
} from './legacyCommunicationsTypes'

function syncCommunicationsChannelProfileAliases(
  record: CommunicationsChannelProfileRecord,
): CommunicationsChannelProfileRecord {
  return record
}

function syncCommunicationsChannelProfilesResponseAliases(
  response: CommunicationsChannelProfilesResponse,
): CommunicationsChannelProfilesResponse {
  return {
    ...response,
    channel_profiles: response.channel_profiles.map((record) => syncCommunicationsChannelProfileAliases(record)),
  }
}

function normalizeCommunicationsChannelProfileRequest<
  T extends CreateCommunicationsChannelProfileRequest | UpdateCommunicationsChannelProfileRequest,
>(request: T): T {
  return request
}

export const legacyCommunicationsApi = {
  async getCommunicationsSummary(): Promise<CommunicationsSummaryResponse> {
    const response = await api.get('/communications/summary')
    return response.data
  },

  async listCommunicationsValidationDomains(): Promise<CommunicationsValidationDomainsResponse> {
    const response = await api.get('/communications/validation-domains')
    return response.data
  },

  async listCommunicationsChannelProfiles(filters?: {
    status?: CommunicationsChannelStatus
    channelKind?: CommunicationsChannelKind
    validationDomainId?: string
  }): Promise<CommunicationsChannelProfilesResponse> {
    const response = await api.get('/communications/channels', {
      params: {
        status: filters?.status,
        channel_kind: filters?.channelKind,
        validation_domain_id: filters?.validationDomainId,
      },
    })
    return syncCommunicationsChannelProfilesResponseAliases(response.data)
  },

  async createCommunicationsChannelProfile(
    request: CreateCommunicationsChannelProfileRequest,
  ): Promise<CommunicationsChannelProfileRecord> {
    const response = await api.post(
      '/communications/channels',
      normalizeCommunicationsChannelProfileRequest(request),
    )
    return syncCommunicationsChannelProfileAliases(response.data)
  },

  async updateCommunicationsChannelProfile(
    channelProfileId: string,
    request: UpdateCommunicationsChannelProfileRequest,
  ): Promise<CommunicationsChannelProfileRecord> {
    const response = await api.put(
      `/communications/channels/${channelProfileId}`,
      normalizeCommunicationsChannelProfileRequest(request),
    )
    return syncCommunicationsChannelProfileAliases(response.data)
  },

  async listCommunicationsProviderBindings(filters?: {
    status?: CommunicationsProviderBindingStatus
    channelKind?: CommunicationsChannelKind
    providerId?: string
    validationDomainId?: string
  }): Promise<CommunicationsProviderBindingsResponse> {
    const response = await api.get('/communications/provider-bindings', {
      params: {
        status: filters?.status,
        channel_kind: filters?.channelKind,
        provider_id: filters?.providerId,
        validation_domain_id: filters?.validationDomainId,
      },
    })
    return response.data
  },

  async createCommunicationsProviderBinding(
    request: CreateCommunicationsProviderBindingRequest,
  ): Promise<CommunicationsProviderBindingRecord> {
    const response = await api.post('/communications/provider-bindings', request)
    return response.data
  },

  async updateCommunicationsProviderBinding(
    providerBindingId: string,
    request: UpdateCommunicationsProviderBindingRequest,
  ): Promise<CommunicationsProviderBindingRecord> {
    const response = await api.put(`/communications/provider-bindings/${providerBindingId}`, request)
    return response.data
  },

  async listCommunicationsProviderCallbacks(filters?: {
    providerBindingId?: string
    status?: CommunicationsProviderCallbackStatus
    callbackType?: CommunicationsProviderCallbackType
    normalizationStatus?: CommunicationsProviderCallbackNormalizationStatus
  }): Promise<CommunicationsProviderCallbacksResponse> {
    const response = await api.get('/communications/provider-callbacks', {
      params: {
        provider_binding_id: filters?.providerBindingId,
        status: filters?.status,
        callback_type: filters?.callbackType,
        normalization_status: filters?.normalizationStatus,
      },
    })
    return response.data
  },

  async createCommunicationsProviderCallback(
    request: CreateCommunicationsProviderCallbackRequest,
  ): Promise<CommunicationsProviderCallbackRecord> {
    const response = await api.post('/communications/provider-callbacks', request)
    return response.data
  },

  async updateCommunicationsProviderCallback(
    providerCallbackId: string,
    request: UpdateCommunicationsProviderCallbackRequest,
  ): Promise<CommunicationsProviderCallbackRecord> {
    const response = await api.put(`/communications/provider-callbacks/${providerCallbackId}`, request)
    return response.data
  },

  async normalizeCommunicationsProviderCallback(
    providerCallbackId: string,
    request?: NormalizeCommunicationsProviderCallbackRequest,
  ): Promise<CommunicationsProviderCallbackRecord> {
    const response = await api.post(`/communications/provider-callbacks/${providerCallbackId}/normalize`, request ?? {})
    return response.data
  },

  async listCommunicationsTemplateBindings(filters?: {
    status?: CommunicationsTemplateBindingStatus
    validationDomainId?: string
    channelKind?: CommunicationsChannelKind
    templateKey?: string
    cmsReleaseId?: string
  }): Promise<CommunicationsTemplateBindingsResponse> {
    const response = await api.get('/communications/template-bindings', {
      params: {
        status: filters?.status,
        validation_domain_id: filters?.validationDomainId,
        channel_kind: filters?.channelKind,
        template_key: filters?.templateKey,
        cms_release_id: filters?.cmsReleaseId,
      },
    })
    return response.data
  },

  async createCommunicationsTemplateBinding(
    request: CreateCommunicationsTemplateBindingRequest,
  ): Promise<CommunicationsTemplateBindingRecord> {
    const response = await api.post('/communications/template-bindings', request)
    return response.data
  },

  async updateCommunicationsTemplateBinding(
    templateBindingId: string,
    request: UpdateCommunicationsTemplateBindingRequest,
  ): Promise<CommunicationsTemplateBindingRecord> {
    const response = await api.put(`/communications/template-bindings/${templateBindingId}`, request)
    return response.data
  },

  async listCommunicationsTemplateRenders(filters?: {
    templateBindingId?: string
    messageRequestId?: string
    status?: CommunicationsTemplateRenderStatus
    channelKind?: CommunicationsChannelKind
  }): Promise<CommunicationsTemplateRendersResponse> {
    const response = await api.get('/communications/template-renders', {
      params: {
        template_binding_id: filters?.templateBindingId,
        message_request_id: filters?.messageRequestId,
        status: filters?.status,
        channel_kind: filters?.channelKind,
      },
    })
    return response.data
  },

  async listCommunicationsMessageRequests(filters?: {
    status?: CommunicationsMessageRequestStatus
    intentSourceSubsystem?: CommunicationsIntentSourceSubsystem
    channelKind?: CommunicationsChannelKind
    validationDomainId?: string
    providerBindingId?: string
    templateBindingId?: string
  }): Promise<CommunicationsMessageRequestsResponse> {
    const response = await api.get('/communications/message-requests', {
      params: {
        status: filters?.status,
        intent_source_subsystem: filters?.intentSourceSubsystem,
        channel_kind: filters?.channelKind,
        validation_domain_id: filters?.validationDomainId,
        provider_binding_id: filters?.providerBindingId,
        template_binding_id: filters?.templateBindingId,
      },
    })
    return response.data
  },

  async createCommunicationsMessageRequest(
    request: CreateCommunicationsMessageRequestRequest,
  ): Promise<CommunicationsMessageRequestRecord> {
    const response = await api.post('/communications/message-requests', request)
    return response.data
  },

  async updateCommunicationsMessageRequest(
    messageRequestId: string,
    request: UpdateCommunicationsMessageRequestRequest,
  ): Promise<CommunicationsMessageRequestRecord> {
    const response = await api.put(`/communications/message-requests/${messageRequestId}`, request)
    return response.data
  },

  async listCommunicationsDispatches(filters?: {
    messageRequestId?: string
    providerBindingId?: string
    channelKind?: CommunicationsChannelKind
    status?: CommunicationsDispatchStatus
  }): Promise<CommunicationsDispatchesResponse> {
    const response = await api.get('/communications/dispatches', {
      params: {
        message_request_id: filters?.messageRequestId,
        provider_binding_id: filters?.providerBindingId,
        channel_kind: filters?.channelKind,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommunicationsDispatch(request: CreateCommunicationsDispatchRequest): Promise<CommunicationsDispatchRecord> {
    const response = await api.post('/communications/dispatches', request)
    return response.data
  },

  async updateCommunicationsDispatch(
    dispatchId: string,
    request: UpdateCommunicationsDispatchRequest,
  ): Promise<CommunicationsDispatchRecord> {
    const response = await api.put(`/communications/dispatches/${dispatchId}`, request)
    return response.data
  },

  async processCommunicationsDispatchAttempt(
    dispatchId: string,
    request: ProcessCommunicationsDispatchAttemptRequest,
  ): Promise<CommunicationsDispatchRecord> {
    const response = await api.post(`/communications/dispatches/${dispatchId}/process-attempt`, request)
    return response.data
  },

  async listCommunicationsDeliveryAttempts(filters?: {
    dispatchId?: string
    messageRequestId?: string
    providerBindingId?: string
    status?: CommunicationsDeliveryAttemptStatus
  }): Promise<CommunicationsDeliveryAttemptsResponse> {
    const response = await api.get('/communications/delivery-attempts', {
      params: {
        dispatch_id: filters?.dispatchId,
        message_request_id: filters?.messageRequestId,
        provider_binding_id: filters?.providerBindingId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommunicationsDeliveryAttempt(
    request: CreateCommunicationsDeliveryAttemptRequest,
  ): Promise<CommunicationsDeliveryAttemptRecord> {
    const response = await api.post('/communications/delivery-attempts', request)
    return response.data
  },

  async updateCommunicationsDeliveryAttempt(
    deliveryAttemptId: string,
    request: UpdateCommunicationsDeliveryAttemptRequest,
  ): Promise<CommunicationsDeliveryAttemptRecord> {
    const response = await api.put(`/communications/delivery-attempts/${deliveryAttemptId}`, request)
    return response.data
  },

  async listCommunicationsDeadLetters(filters?: {
    status?: CommunicationsDeadLetterStatus
    reason?: CommunicationsDeadLetterReason
    messageRequestId?: string
    dispatchId?: string
  }): Promise<CommunicationsDeadLettersResponse> {
    const response = await api.get('/communications/dead-letters', {
      params: {
        status: filters?.status,
        reason: filters?.reason,
        message_request_id: filters?.messageRequestId,
        dispatch_id: filters?.dispatchId,
      },
    })
    return response.data
  },

  async updateCommunicationsDeadLetter(
    deadLetterId: string,
    request: UpdateCommunicationsDeadLetterRequest,
  ): Promise<CommunicationsDeadLetterRecord> {
    const response = await api.put(`/communications/dead-letters/${deadLetterId}`, request)
    return response.data
  },

  async redriveCommunicationsDeadLetter(
    deadLetterId: string,
    request: RedriveCommunicationsDeadLetterRequest,
  ): Promise<CommunicationsDispatchRecord> {
    const response = await api.post(`/communications/dead-letters/${deadLetterId}/redrive`, request)
    return response.data
  },

  async listCommunicationsAudienceResolutions(filters?: {
    status?: CommunicationsAudienceResolutionStatus
    validationDomainId?: string
    intentSourceSubsystem?: CommunicationsIntentSourceSubsystem
    channelKind?: CommunicationsChannelKind
    messageRequestId?: string
  }): Promise<CommunicationsAudienceResolutionsResponse> {
    const response = await api.get('/communications/audience-resolutions', {
      params: {
        status: filters?.status,
        validation_domain_id: filters?.validationDomainId,
        intent_source_subsystem: filters?.intentSourceSubsystem,
        channel_kind: filters?.channelKind,
        message_request_id: filters?.messageRequestId,
      },
    })
    return response.data
  },

  async createCommunicationsAudienceResolution(
    request: CreateCommunicationsAudienceResolutionRequest,
  ): Promise<CommunicationsAudienceResolutionRecord> {
    const response = await api.post('/communications/audience-resolutions', request)
    return response.data
  },

  async updateCommunicationsAudienceResolution(
    audienceResolutionId: string,
    request: UpdateCommunicationsAudienceResolutionRequest,
  ): Promise<CommunicationsAudienceResolutionRecord> {
    const response = await api.put(`/communications/audience-resolutions/${audienceResolutionId}`, request)
    return response.data
  },

  async listCommunicationsPreferenceProfiles(filters?: {
    status?: CommunicationsPreferenceProfileStatus
    validationDomainId?: string
    scope?: CommunicationsPreferenceScope
    audienceReference?: string
  }): Promise<CommunicationsPreferenceProfilesResponse> {
    const response = await api.get('/communications/preferences', {
      params: {
        status: filters?.status,
        validation_domain_id: filters?.validationDomainId,
        scope: filters?.scope,
        audience_reference: filters?.audienceReference,
      },
    })
    return response.data
  },

  async createCommunicationsPreferenceProfile(
    request: CreateCommunicationsPreferenceProfileRequest,
  ): Promise<CommunicationsPreferenceProfileRecord> {
    const response = await api.post('/communications/preferences', request)
    return response.data
  },

  async updateCommunicationsPreferenceProfile(
    preferenceProfileId: string,
    request: UpdateCommunicationsPreferenceProfileRequest,
  ): Promise<CommunicationsPreferenceProfileRecord> {
    const response = await api.put(`/communications/preferences/${preferenceProfileId}`, request)
    return response.data
  },

  async listCommunicationsConsentRecords(filters?: {
    status?: CommunicationsConsentStatus
    validationDomainId?: string
    audienceReference?: string
    channelKind?: CommunicationsChannelKind
  }): Promise<CommunicationsConsentRecordsResponse> {
    const response = await api.get('/communications/consent', {
      params: {
        status: filters?.status,
        validation_domain_id: filters?.validationDomainId,
        audience_reference: filters?.audienceReference,
        channel_kind: filters?.channelKind,
      },
    })
    return response.data
  },

  async createCommunicationsConsentRecord(
    request: CreateCommunicationsConsentRecordRequest,
  ): Promise<CommunicationsConsentRecord> {
    const response = await api.post('/communications/consent', request)
    return response.data
  },

  async updateCommunicationsConsentRecord(
    consentRecordId: string,
    request: UpdateCommunicationsConsentRecordRequest,
  ): Promise<CommunicationsConsentRecord> {
    const response = await api.put(`/communications/consent/${consentRecordId}`, request)
    return response.data
  },

  async listCommunicationsSuppressionEntries(filters?: {
    status?: CommunicationsSuppressionStatus
    validationDomainId?: string
    audienceReference?: string
    recipientAddress?: string
    channelKind?: CommunicationsChannelKind
    reason?: CommunicationsSuppressionReason
  }): Promise<CommunicationsSuppressionEntriesResponse> {
    const response = await api.get('/communications/suppressions', {
      params: {
        status: filters?.status,
        validation_domain_id: filters?.validationDomainId,
        audience_reference: filters?.audienceReference,
        recipient_address: filters?.recipientAddress,
        channel_kind: filters?.channelKind,
        reason: filters?.reason,
      },
    })
    return response.data
  },

  async createCommunicationsSuppressionEntry(
    request: CreateCommunicationsSuppressionEntryRequest,
  ): Promise<CommunicationsSuppressionEntryRecord> {
    const response = await api.post('/communications/suppressions', request)
    return response.data
  },

  async updateCommunicationsSuppressionEntry(
    suppressionEntryId: string,
    request: UpdateCommunicationsSuppressionEntryRequest,
  ): Promise<CommunicationsSuppressionEntryRecord> {
    const response = await api.put(`/communications/suppressions/${suppressionEntryId}`, request)
    return response.data
  },

  async listCommunicationsEmbeddedBindings(filters?: {
    status?: CommunicationsEmbeddedBindingStatus
    validationDomainId?: string
    consumerApplicationId?: string
  }): Promise<CommunicationsEmbeddedBindingsResponse> {
    const response = await api.get('/communications/embedded-bindings', {
      params: {
        status: filters?.status,
        validation_domain_id: filters?.validationDomainId,
        consumer_application_id: filters?.consumerApplicationId,
      },
    })
    return response.data
  },

  async createCommunicationsEmbeddedBinding(
    request: CreateCommunicationsEmbeddedBindingRequest,
  ): Promise<CommunicationsEmbeddedBindingRecord> {
    const response = await api.post('/communications/embedded-bindings', request)
    return response.data
  },

  async updateCommunicationsEmbeddedBinding(
    embeddedBindingId: string,
    request: UpdateCommunicationsEmbeddedBindingRequest,
  ): Promise<CommunicationsEmbeddedBindingRecord> {
    const response = await api.put(`/communications/embedded-bindings/${embeddedBindingId}`, request)
    return response.data
  },

  async listCommunicationsEmbeddedBindingFeed(
    embeddedBindingId: string,
    filters?: {
      status?: CommunicationsNotificationFeedItemStatus
      recipientAddress?: string
      audienceReference?: string
    },
  ): Promise<CommunicationsNotificationFeedResponse> {
    const response = await api.get(`/communications/embedded-bindings/${embeddedBindingId}/feed`, {
      params: {
        status: filters?.status,
        recipient_address: filters?.recipientAddress,
        audience_reference: filters?.audienceReference,
      },
    })
    return response.data
  },

  async listCommunicationsNotificationFeedItems(filters?: {
    status?: CommunicationsNotificationFeedItemStatus
    validationDomainId?: string
    channelKind?: 'IN_APP' | 'EMBEDDED'
    recipientAddress?: string
    audienceReference?: string
    embeddedBindingId?: string
    messageRequestId?: string
  }): Promise<CommunicationsNotificationFeedResponse> {
    const response = await api.get('/communications/notification-feed', {
      params: {
        status: filters?.status,
        validation_domain_id: filters?.validationDomainId,
        channel_kind: filters?.channelKind,
        recipient_address: filters?.recipientAddress,
        audience_reference: filters?.audienceReference,
        embedded_binding_id: filters?.embeddedBindingId,
        message_request_id: filters?.messageRequestId,
      },
    })
    return response.data
  },

  async createCommunicationsNotificationFeedItem(
    request: CreateCommunicationsNotificationFeedItemRequest,
  ): Promise<CommunicationsNotificationFeedItemRecord> {
    const response = await api.post('/communications/notification-feed', request)
    return response.data
  },

  async updateCommunicationsNotificationFeedItem(
    notificationFeedItemId: string,
    request: UpdateCommunicationsNotificationFeedItemRequest,
  ): Promise<CommunicationsNotificationFeedItemRecord> {
    const response = await api.put(`/communications/notification-feed/${notificationFeedItemId}`, request)
    return response.data
  },

  async transitionCommunicationsNotificationFeedItem(
    notificationFeedItemId: string,
    request: TransitionCommunicationsNotificationFeedItemRequest,
  ): Promise<CommunicationsNotificationFeedItemRecord> {
    const response = await api.post(`/communications/notification-feed/${notificationFeedItemId}/transition`, request)
    return response.data
  },

  async listCommunicationsFormSubmissions(filters?: {
    status?: CommunicationsFormSubmissionStatus
    source?: CommunicationsFormSubmissionSource
    validationDomainId?: string
    requesterContact?: string
    routingKey?: string
    assignedQueue?: string
    providerCallbackId?: string
  }): Promise<CommunicationsFormSubmissionsResponse> {
    const response = await api.get('/communications/form-submissions', {
      params: {
        status: filters?.status,
        source: filters?.source,
        validation_domain_id: filters?.validationDomainId,
        requester_contact: filters?.requesterContact,
        routing_key: filters?.routingKey,
        assigned_queue: filters?.assignedQueue,
        provider_callback_id: filters?.providerCallbackId,
      },
    })
    return response.data
  },

  async createCommunicationsFormSubmission(
    request: CreateCommunicationsFormSubmissionRequest,
  ): Promise<CommunicationsFormSubmissionRecord> {
    const response = await api.post('/communications/form-submissions', request)
    return response.data
  },

  async updateCommunicationsFormSubmission(
    formSubmissionId: string,
    request: UpdateCommunicationsFormSubmissionRequest,
  ): Promise<CommunicationsFormSubmissionRecord> {
    const response = await api.put(`/communications/form-submissions/${formSubmissionId}`, request)
    return response.data
  },

  async acknowledgeCommunicationsFormSubmission(
    formSubmissionId: string,
    request: AcknowledgeCommunicationsFormSubmissionRequest,
  ): Promise<CommunicationsFormSubmissionRecord> {
    const response = await api.post(`/communications/form-submissions/${formSubmissionId}/acknowledge`, request)
    return response.data
  },

  async routeCommunicationsFormSubmission(
    formSubmissionId: string,
    request: RouteCommunicationsFormSubmissionRequest,
  ): Promise<CommunicationsFormSubmissionRecord> {
    const response = await api.post(`/communications/form-submissions/${formSubmissionId}/route`, request)
    return response.data
  },

  async closeCommunicationsFormSubmission(
    formSubmissionId: string,
    request: CloseCommunicationsFormSubmissionRequest,
  ): Promise<CommunicationsFormSubmissionRecord> {
    const response = await api.post(`/communications/form-submissions/${formSubmissionId}/close`, request)
    return response.data
  },

  async listCommunicationsOperatorFollowUps(filters?: {
    status?: CommunicationsOperatorFollowUpStatus
    formSubmissionId?: string
    validationDomainId?: string
    assignedOperatorId?: string
    assignedTeam?: string
  }): Promise<CommunicationsOperatorFollowUpsResponse> {
    const response = await api.get('/communications/operator-follow-ups', {
      params: {
        status: filters?.status,
        form_submission_id: filters?.formSubmissionId,
        validation_domain_id: filters?.validationDomainId,
        assigned_operator_id: filters?.assignedOperatorId,
        assigned_team: filters?.assignedTeam,
      },
    })
    return response.data
  },

  async createCommunicationsOperatorFollowUp(
    request: CreateCommunicationsOperatorFollowUpRequest,
  ): Promise<CommunicationsOperatorFollowUpRecord> {
    const response = await api.post('/communications/operator-follow-ups', request)
    return response.data
  },

  async updateCommunicationsOperatorFollowUp(
    operatorFollowUpId: string,
    request: UpdateCommunicationsOperatorFollowUpRequest,
  ): Promise<CommunicationsOperatorFollowUpRecord> {
    const response = await api.put(`/communications/operator-follow-ups/${operatorFollowUpId}`, request)
    return response.data
  },

  async listCommunicationsIntentBindings(filters?: {
    status?: CommunicationsIntentBindingStatus
    intentSourceSubsystem?: CommunicationsIntentSourceSubsystem
    validationDomainId?: string
    intentKey?: CommunicationsIntentKey
    channelProfileId?: string
  }): Promise<CommunicationsIntentBindingsResponse> {
    const response = await api.get('/communications/intent-bindings', {
      params: {
        status: filters?.status,
        intent_source_subsystem: filters?.intentSourceSubsystem,
        validation_domain_id: filters?.validationDomainId,
        intent_key: filters?.intentKey,
        channel_profile_id: filters?.channelProfileId,
      },
    })
    return response.data
  },

  async createCommunicationsIntentBinding(
    request: CreateCommunicationsIntentBindingRequest,
  ): Promise<CommunicationsIntentBindingRecord> {
    const response = await api.post('/communications/intent-bindings', request)
    return response.data
  },

  async updateCommunicationsIntentBinding(
    intentBindingId: string,
    request: UpdateCommunicationsIntentBindingRequest,
  ): Promise<CommunicationsIntentBindingRecord> {
    const response = await api.put(`/communications/intent-bindings/${intentBindingId}`, request)
    return response.data
  },

  async listCommunicationsIntentEvents(filters?: {
    status?: CommunicationsIntentEventStatus
    intentSourceSubsystem?: CommunicationsIntentSourceSubsystem
    intentBindingId?: string
    validationDomainId?: string
    messageRequestId?: string
  }): Promise<CommunicationsIntentEventsResponse> {
    const response = await api.get('/communications/intent-events', {
      params: {
        status: filters?.status,
        intent_source_subsystem: filters?.intentSourceSubsystem,
        intent_binding_id: filters?.intentBindingId,
        validation_domain_id: filters?.validationDomainId,
        message_request_id: filters?.messageRequestId,
      },
    })
    return response.data
  },

  async createCommunicationsIntentEvent(
    request: CreateCommunicationsIntentEventRequest,
  ): Promise<CommunicationsIntentEventRecord> {
    const response = await api.post('/communications/intent-events', request)
    return response.data
  },

  async updateCommunicationsIntentEvent(
    intentEventId: string,
    request: UpdateCommunicationsIntentEventRequest,
  ): Promise<CommunicationsIntentEventRecord> {
    const response = await api.put(`/communications/intent-events/${intentEventId}`, request)
    return response.data
  },

  async getCommunicationsOperationsSummary(): Promise<CommunicationsOperationsSummaryResponse> {
    const response = await api.get('/communications/operations/summary')
    return response.data
  },

  async listCommunicationsBackups(filters?: {
    status?: CommunicationsBackupStatus
    validationDomainId?: string
    backupScope?: string
  }): Promise<CommunicationsBackupsResponse> {
    const response = await api.get('/communications/backups', {
      params: {
        status: filters?.status,
        validation_domain_id: filters?.validationDomainId,
        backup_scope: filters?.backupScope,
      },
    })
    return response.data
  },

  async createCommunicationsBackup(
    request: CreateCommunicationsBackupRequest,
  ): Promise<CommunicationsBackupRecord> {
    const response = await api.post('/communications/backups', request)
    return response.data
  },

  async updateCommunicationsBackup(
    backupId: string,
    request: UpdateCommunicationsBackupRequest,
  ): Promise<CommunicationsBackupRecord> {
    const response = await api.put(`/communications/backups/${backupId}`, request)
    return response.data
  },

  async listCommunicationsRestoreDrills(filters?: {
    status?: CommunicationsRestoreStatus
    validationDomainId?: string
    backupId?: string
  }): Promise<CommunicationsRestoreDrillsResponse> {
    const response = await api.get('/communications/restores', {
      params: {
        status: filters?.status,
        validation_domain_id: filters?.validationDomainId,
        backup_id: filters?.backupId,
      },
    })
    return response.data
  },

  async createCommunicationsRestoreDrill(
    request: CreateCommunicationsRestoreDrillRequest,
  ): Promise<CommunicationsRestoreDrillRecord> {
    const response = await api.post('/communications/restores', request)
    return response.data
  },

  async updateCommunicationsRestoreDrill(
    restoreDrillId: string,
    request: UpdateCommunicationsRestoreDrillRequest,
  ): Promise<CommunicationsRestoreDrillRecord> {
    const response = await api.put(`/communications/restores/${restoreDrillId}`, request)
    return response.data
  },

  async listCommunicationsExportArtifacts(filters?: {
    status?: CommunicationsExportArtifactStatus
    validationDomainId?: string
    format?: string
  }): Promise<CommunicationsExportArtifactsResponse> {
    const response = await api.get('/communications/exports', {
      params: {
        status: filters?.status,
        validation_domain_id: filters?.validationDomainId,
        format: filters?.format,
      },
    })
    return response.data
  },

  async createCommunicationsExportArtifact(
    request: CreateCommunicationsExportArtifactRequest,
  ): Promise<CommunicationsExportArtifactRecord> {
    const response = await api.post('/communications/exports', request)
    return response.data
  },

  async updateCommunicationsExportArtifact(
    exportArtifactId: string,
    request: UpdateCommunicationsExportArtifactRequest,
  ): Promise<CommunicationsExportArtifactRecord> {
    const response = await api.put(`/communications/exports/${exportArtifactId}`, request)
    return response.data
  },

  async listCommunicationsImportValidations(filters?: {
    status?: CommunicationsImportValidationStatus
    validationDomainId?: string
    artifactReference?: string
  }): Promise<CommunicationsImportValidationsResponse> {
    const response = await api.get('/communications/import-validations', {
      params: {
        status: filters?.status,
        validation_domain_id: filters?.validationDomainId,
        artifact_reference: filters?.artifactReference,
      },
    })
    return response.data
  },

  async createCommunicationsImportValidation(
    request: CreateCommunicationsImportValidationRequest,
  ): Promise<CommunicationsImportValidationRecord> {
    const response = await api.post('/communications/import-validations', request)
    return response.data
  },

  async updateCommunicationsImportValidation(
    importValidationId: string,
    request: UpdateCommunicationsImportValidationRequest,
  ): Promise<CommunicationsImportValidationRecord> {
    const response = await api.put(`/communications/import-validations/${importValidationId}`, request)
    return response.data
  },

  async listCommunicationsResilienceChecks(filters?: {
    status?: CommunicationsResilienceCheckStatus
    validationDomainId?: string
    checkName?: string
  }): Promise<CommunicationsResilienceChecksResponse> {
    const response = await api.get('/communications/resilience-checks', {
      params: {
        status: filters?.status,
        validation_domain_id: filters?.validationDomainId,
        check_name: filters?.checkName,
      },
    })
    return response.data
  },

  async createCommunicationsResilienceCheck(
    request: CreateCommunicationsResilienceCheckRequest,
  ): Promise<CommunicationsResilienceCheckRecord> {
    const response = await api.post('/communications/resilience-checks', request)
    return response.data
  },

  async updateCommunicationsResilienceCheck(
    resilienceCheckId: string,
    request: UpdateCommunicationsResilienceCheckRequest,
  ): Promise<CommunicationsResilienceCheckRecord> {
    const response = await api.put(`/communications/resilience-checks/${resilienceCheckId}`, request)
    return response.data
  },

  async listCommunicationsBenchmarkChecks(filters?: {
    status?: CommunicationsBenchmarkCheckStatus
    validationDomainId?: string
    benchmarkName?: string
  }): Promise<CommunicationsBenchmarkChecksResponse> {
    const response = await api.get('/communications/benchmarks', {
      params: {
        status: filters?.status,
        validation_domain_id: filters?.validationDomainId,
        benchmark_name: filters?.benchmarkName,
      },
    })
    return response.data
  },

  async createCommunicationsBenchmarkCheck(
    request: CreateCommunicationsBenchmarkCheckRequest,
  ): Promise<CommunicationsBenchmarkCheckRecord> {
    const response = await api.post('/communications/benchmarks', request)
    return response.data
  },

  async updateCommunicationsBenchmarkCheck(
    benchmarkCheckId: string,
    request: UpdateCommunicationsBenchmarkCheckRequest,
  ): Promise<CommunicationsBenchmarkCheckRecord> {
    const response = await api.put(`/communications/benchmarks/${benchmarkCheckId}`, request)
    return response.data
  },

  async listCommunicationsDiagnostics(filters?: {
    status?: CommunicationsDiagnosticsStatus
    validationDomainId?: string
    diagnosticName?: string
  }): Promise<CommunicationsDiagnosticsResponse> {
    const response = await api.get('/communications/diagnostics', {
      params: {
        status: filters?.status,
        validation_domain_id: filters?.validationDomainId,
        diagnostic_name: filters?.diagnosticName,
      },
    })
    return response.data
  },

  async createCommunicationsDiagnosticsRecord(
    request: CreateCommunicationsDiagnosticsRequest,
  ): Promise<CommunicationsDiagnosticsRecord> {
    const response = await api.post('/communications/diagnostics', request)
    return response.data
  },

  async updateCommunicationsDiagnosticsRecord(
    diagnosticsRecordId: string,
    request: UpdateCommunicationsDiagnosticsRequest,
  ): Promise<CommunicationsDiagnosticsRecord> {
    const response = await api.put(`/communications/diagnostics/${diagnosticsRecordId}`, request)
    return response.data
  },

  async getCommunicationsReviewSummary(): Promise<CommunicationsReviewSummaryResponse> {
    const response = await api.get('/communications/review/summary')
    return response.data
  },

  async listCommunicationsFormalReviews(): Promise<CommunicationsFormalReviewsResponse> {
    const response = await api.get('/communications/review/formal')
    return response.data
  },

  async createCommunicationsFormalReview(
    request?: CreateCommunicationsFormalReviewRequest,
  ): Promise<CommunicationsFormalReviewRecord> {
    const response = await api.post('/communications/review/formal', request ?? {})
    return response.data
  },

  async listCommunicationsAdoptionPlans(): Promise<CommunicationsAdoptionPlansResponse> {
    const response = await api.get('/communications/review/adoption-plans')
    return response.data
  },

  async createCommunicationsAdoptionPlan(
    request?: CreateCommunicationsAdoptionPlanRequest,
  ): Promise<CommunicationsAdoptionPlanRecord> {
    const response = await api.post('/communications/review/adoption-plans', request ?? {})
    return response.data
  },
}
