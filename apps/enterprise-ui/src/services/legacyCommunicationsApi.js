import { api } from './iamHttpClient';
function syncCommunicationsChannelProfileAliases(record) {
    return record;
}
function syncCommunicationsChannelProfilesResponseAliases(response) {
    return {
        ...response,
        channel_profiles: response.channel_profiles.map((record) => syncCommunicationsChannelProfileAliases(record)),
    };
}
function normalizeCommunicationsChannelProfileRequest(request) {
    return request;
}
export const legacyCommunicationsApi = {
    async getCommunicationsSummary() {
        const response = await api.get('/communications/summary');
        return response.data;
    },
    async listCommunicationsValidationDomains() {
        const response = await api.get('/communications/validation-domains');
        return response.data;
    },
    async listCommunicationsChannelProfiles(filters) {
        const response = await api.get('/communications/channels', {
            params: {
                status: filters?.status,
                channel_kind: filters?.channelKind,
                validation_domain_id: filters?.validationDomainId,
            },
        });
        return syncCommunicationsChannelProfilesResponseAliases(response.data);
    },
    async createCommunicationsChannelProfile(request) {
        const response = await api.post('/communications/channels', normalizeCommunicationsChannelProfileRequest(request));
        return syncCommunicationsChannelProfileAliases(response.data);
    },
    async updateCommunicationsChannelProfile(channelProfileId, request) {
        const response = await api.put(`/communications/channels/${channelProfileId}`, normalizeCommunicationsChannelProfileRequest(request));
        return syncCommunicationsChannelProfileAliases(response.data);
    },
    async listCommunicationsProviderBindings(filters) {
        const response = await api.get('/communications/provider-bindings', {
            params: {
                status: filters?.status,
                channel_kind: filters?.channelKind,
                provider_id: filters?.providerId,
                validation_domain_id: filters?.validationDomainId,
            },
        });
        return response.data;
    },
    async createCommunicationsProviderBinding(request) {
        const response = await api.post('/communications/provider-bindings', request);
        return response.data;
    },
    async updateCommunicationsProviderBinding(providerBindingId, request) {
        const response = await api.put(`/communications/provider-bindings/${providerBindingId}`, request);
        return response.data;
    },
    async listCommunicationsProviderCallbacks(filters) {
        const response = await api.get('/communications/provider-callbacks', {
            params: {
                provider_binding_id: filters?.providerBindingId,
                status: filters?.status,
                callback_type: filters?.callbackType,
                normalization_status: filters?.normalizationStatus,
            },
        });
        return response.data;
    },
    async createCommunicationsProviderCallback(request) {
        const response = await api.post('/communications/provider-callbacks', request);
        return response.data;
    },
    async updateCommunicationsProviderCallback(providerCallbackId, request) {
        const response = await api.put(`/communications/provider-callbacks/${providerCallbackId}`, request);
        return response.data;
    },
    async normalizeCommunicationsProviderCallback(providerCallbackId, request) {
        const response = await api.post(`/communications/provider-callbacks/${providerCallbackId}/normalize`, request ?? {});
        return response.data;
    },
    async listCommunicationsTemplateBindings(filters) {
        const response = await api.get('/communications/template-bindings', {
            params: {
                status: filters?.status,
                validation_domain_id: filters?.validationDomainId,
                channel_kind: filters?.channelKind,
                template_key: filters?.templateKey,
                cms_release_id: filters?.cmsReleaseId,
            },
        });
        return response.data;
    },
    async createCommunicationsTemplateBinding(request) {
        const response = await api.post('/communications/template-bindings', request);
        return response.data;
    },
    async updateCommunicationsTemplateBinding(templateBindingId, request) {
        const response = await api.put(`/communications/template-bindings/${templateBindingId}`, request);
        return response.data;
    },
    async listCommunicationsTemplateRenders(filters) {
        const response = await api.get('/communications/template-renders', {
            params: {
                template_binding_id: filters?.templateBindingId,
                message_request_id: filters?.messageRequestId,
                status: filters?.status,
                channel_kind: filters?.channelKind,
            },
        });
        return response.data;
    },
    async listCommunicationsMessageRequests(filters) {
        const response = await api.get('/communications/message-requests', {
            params: {
                status: filters?.status,
                intent_source_subsystem: filters?.intentSourceSubsystem,
                channel_kind: filters?.channelKind,
                validation_domain_id: filters?.validationDomainId,
                provider_binding_id: filters?.providerBindingId,
                template_binding_id: filters?.templateBindingId,
            },
        });
        return response.data;
    },
    async createCommunicationsMessageRequest(request) {
        const response = await api.post('/communications/message-requests', request);
        return response.data;
    },
    async updateCommunicationsMessageRequest(messageRequestId, request) {
        const response = await api.put(`/communications/message-requests/${messageRequestId}`, request);
        return response.data;
    },
    async listCommunicationsDispatches(filters) {
        const response = await api.get('/communications/dispatches', {
            params: {
                message_request_id: filters?.messageRequestId,
                provider_binding_id: filters?.providerBindingId,
                channel_kind: filters?.channelKind,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommunicationsDispatch(request) {
        const response = await api.post('/communications/dispatches', request);
        return response.data;
    },
    async updateCommunicationsDispatch(dispatchId, request) {
        const response = await api.put(`/communications/dispatches/${dispatchId}`, request);
        return response.data;
    },
    async processCommunicationsDispatchAttempt(dispatchId, request) {
        const response = await api.post(`/communications/dispatches/${dispatchId}/process-attempt`, request);
        return response.data;
    },
    async listCommunicationsDeliveryAttempts(filters) {
        const response = await api.get('/communications/delivery-attempts', {
            params: {
                dispatch_id: filters?.dispatchId,
                message_request_id: filters?.messageRequestId,
                provider_binding_id: filters?.providerBindingId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommunicationsDeliveryAttempt(request) {
        const response = await api.post('/communications/delivery-attempts', request);
        return response.data;
    },
    async updateCommunicationsDeliveryAttempt(deliveryAttemptId, request) {
        const response = await api.put(`/communications/delivery-attempts/${deliveryAttemptId}`, request);
        return response.data;
    },
    async listCommunicationsDeadLetters(filters) {
        const response = await api.get('/communications/dead-letters', {
            params: {
                status: filters?.status,
                reason: filters?.reason,
                message_request_id: filters?.messageRequestId,
                dispatch_id: filters?.dispatchId,
            },
        });
        return response.data;
    },
    async updateCommunicationsDeadLetter(deadLetterId, request) {
        const response = await api.put(`/communications/dead-letters/${deadLetterId}`, request);
        return response.data;
    },
    async redriveCommunicationsDeadLetter(deadLetterId, request) {
        const response = await api.post(`/communications/dead-letters/${deadLetterId}/redrive`, request);
        return response.data;
    },
    async listCommunicationsAudienceResolutions(filters) {
        const response = await api.get('/communications/audience-resolutions', {
            params: {
                status: filters?.status,
                validation_domain_id: filters?.validationDomainId,
                intent_source_subsystem: filters?.intentSourceSubsystem,
                channel_kind: filters?.channelKind,
                message_request_id: filters?.messageRequestId,
            },
        });
        return response.data;
    },
    async createCommunicationsAudienceResolution(request) {
        const response = await api.post('/communications/audience-resolutions', request);
        return response.data;
    },
    async updateCommunicationsAudienceResolution(audienceResolutionId, request) {
        const response = await api.put(`/communications/audience-resolutions/${audienceResolutionId}`, request);
        return response.data;
    },
    async listCommunicationsPreferenceProfiles(filters) {
        const response = await api.get('/communications/preferences', {
            params: {
                status: filters?.status,
                validation_domain_id: filters?.validationDomainId,
                scope: filters?.scope,
                audience_reference: filters?.audienceReference,
            },
        });
        return response.data;
    },
    async createCommunicationsPreferenceProfile(request) {
        const response = await api.post('/communications/preferences', request);
        return response.data;
    },
    async updateCommunicationsPreferenceProfile(preferenceProfileId, request) {
        const response = await api.put(`/communications/preferences/${preferenceProfileId}`, request);
        return response.data;
    },
    async listCommunicationsConsentRecords(filters) {
        const response = await api.get('/communications/consent', {
            params: {
                status: filters?.status,
                validation_domain_id: filters?.validationDomainId,
                audience_reference: filters?.audienceReference,
                channel_kind: filters?.channelKind,
            },
        });
        return response.data;
    },
    async createCommunicationsConsentRecord(request) {
        const response = await api.post('/communications/consent', request);
        return response.data;
    },
    async updateCommunicationsConsentRecord(consentRecordId, request) {
        const response = await api.put(`/communications/consent/${consentRecordId}`, request);
        return response.data;
    },
    async listCommunicationsSuppressionEntries(filters) {
        const response = await api.get('/communications/suppressions', {
            params: {
                status: filters?.status,
                validation_domain_id: filters?.validationDomainId,
                audience_reference: filters?.audienceReference,
                recipient_address: filters?.recipientAddress,
                channel_kind: filters?.channelKind,
                reason: filters?.reason,
            },
        });
        return response.data;
    },
    async createCommunicationsSuppressionEntry(request) {
        const response = await api.post('/communications/suppressions', request);
        return response.data;
    },
    async updateCommunicationsSuppressionEntry(suppressionEntryId, request) {
        const response = await api.put(`/communications/suppressions/${suppressionEntryId}`, request);
        return response.data;
    },
    async listCommunicationsEmbeddedBindings(filters) {
        const response = await api.get('/communications/embedded-bindings', {
            params: {
                status: filters?.status,
                validation_domain_id: filters?.validationDomainId,
                consumer_application_id: filters?.consumerApplicationId,
            },
        });
        return response.data;
    },
    async createCommunicationsEmbeddedBinding(request) {
        const response = await api.post('/communications/embedded-bindings', request);
        return response.data;
    },
    async updateCommunicationsEmbeddedBinding(embeddedBindingId, request) {
        const response = await api.put(`/communications/embedded-bindings/${embeddedBindingId}`, request);
        return response.data;
    },
    async listCommunicationsEmbeddedBindingFeed(embeddedBindingId, filters) {
        const response = await api.get(`/communications/embedded-bindings/${embeddedBindingId}/feed`, {
            params: {
                status: filters?.status,
                recipient_address: filters?.recipientAddress,
                audience_reference: filters?.audienceReference,
            },
        });
        return response.data;
    },
    async listCommunicationsNotificationFeedItems(filters) {
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
        });
        return response.data;
    },
    async createCommunicationsNotificationFeedItem(request) {
        const response = await api.post('/communications/notification-feed', request);
        return response.data;
    },
    async updateCommunicationsNotificationFeedItem(notificationFeedItemId, request) {
        const response = await api.put(`/communications/notification-feed/${notificationFeedItemId}`, request);
        return response.data;
    },
    async transitionCommunicationsNotificationFeedItem(notificationFeedItemId, request) {
        const response = await api.post(`/communications/notification-feed/${notificationFeedItemId}/transition`, request);
        return response.data;
    },
    async listCommunicationsFormSubmissions(filters) {
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
        });
        return response.data;
    },
    async createCommunicationsFormSubmission(request) {
        const response = await api.post('/communications/form-submissions', request);
        return response.data;
    },
    async updateCommunicationsFormSubmission(formSubmissionId, request) {
        const response = await api.put(`/communications/form-submissions/${formSubmissionId}`, request);
        return response.data;
    },
    async acknowledgeCommunicationsFormSubmission(formSubmissionId, request) {
        const response = await api.post(`/communications/form-submissions/${formSubmissionId}/acknowledge`, request);
        return response.data;
    },
    async routeCommunicationsFormSubmission(formSubmissionId, request) {
        const response = await api.post(`/communications/form-submissions/${formSubmissionId}/route`, request);
        return response.data;
    },
    async closeCommunicationsFormSubmission(formSubmissionId, request) {
        const response = await api.post(`/communications/form-submissions/${formSubmissionId}/close`, request);
        return response.data;
    },
    async listCommunicationsOperatorFollowUps(filters) {
        const response = await api.get('/communications/operator-follow-ups', {
            params: {
                status: filters?.status,
                form_submission_id: filters?.formSubmissionId,
                validation_domain_id: filters?.validationDomainId,
                assigned_operator_id: filters?.assignedOperatorId,
                assigned_team: filters?.assignedTeam,
            },
        });
        return response.data;
    },
    async createCommunicationsOperatorFollowUp(request) {
        const response = await api.post('/communications/operator-follow-ups', request);
        return response.data;
    },
    async updateCommunicationsOperatorFollowUp(operatorFollowUpId, request) {
        const response = await api.put(`/communications/operator-follow-ups/${operatorFollowUpId}`, request);
        return response.data;
    },
    async listCommunicationsIntentBindings(filters) {
        const response = await api.get('/communications/intent-bindings', {
            params: {
                status: filters?.status,
                intent_source_subsystem: filters?.intentSourceSubsystem,
                validation_domain_id: filters?.validationDomainId,
                intent_key: filters?.intentKey,
                channel_profile_id: filters?.channelProfileId,
            },
        });
        return response.data;
    },
    async createCommunicationsIntentBinding(request) {
        const response = await api.post('/communications/intent-bindings', request);
        return response.data;
    },
    async updateCommunicationsIntentBinding(intentBindingId, request) {
        const response = await api.put(`/communications/intent-bindings/${intentBindingId}`, request);
        return response.data;
    },
    async listCommunicationsIntentEvents(filters) {
        const response = await api.get('/communications/intent-events', {
            params: {
                status: filters?.status,
                intent_source_subsystem: filters?.intentSourceSubsystem,
                intent_binding_id: filters?.intentBindingId,
                validation_domain_id: filters?.validationDomainId,
                message_request_id: filters?.messageRequestId,
            },
        });
        return response.data;
    },
    async createCommunicationsIntentEvent(request) {
        const response = await api.post('/communications/intent-events', request);
        return response.data;
    },
    async updateCommunicationsIntentEvent(intentEventId, request) {
        const response = await api.put(`/communications/intent-events/${intentEventId}`, request);
        return response.data;
    },
    async getCommunicationsOperationsSummary() {
        const response = await api.get('/communications/operations/summary');
        return response.data;
    },
    async listCommunicationsBackups(filters) {
        const response = await api.get('/communications/backups', {
            params: {
                status: filters?.status,
                validation_domain_id: filters?.validationDomainId,
                backup_scope: filters?.backupScope,
            },
        });
        return response.data;
    },
    async createCommunicationsBackup(request) {
        const response = await api.post('/communications/backups', request);
        return response.data;
    },
    async updateCommunicationsBackup(backupId, request) {
        const response = await api.put(`/communications/backups/${backupId}`, request);
        return response.data;
    },
    async listCommunicationsRestoreDrills(filters) {
        const response = await api.get('/communications/restores', {
            params: {
                status: filters?.status,
                validation_domain_id: filters?.validationDomainId,
                backup_id: filters?.backupId,
            },
        });
        return response.data;
    },
    async createCommunicationsRestoreDrill(request) {
        const response = await api.post('/communications/restores', request);
        return response.data;
    },
    async updateCommunicationsRestoreDrill(restoreDrillId, request) {
        const response = await api.put(`/communications/restores/${restoreDrillId}`, request);
        return response.data;
    },
    async listCommunicationsExportArtifacts(filters) {
        const response = await api.get('/communications/exports', {
            params: {
                status: filters?.status,
                validation_domain_id: filters?.validationDomainId,
                format: filters?.format,
            },
        });
        return response.data;
    },
    async createCommunicationsExportArtifact(request) {
        const response = await api.post('/communications/exports', request);
        return response.data;
    },
    async updateCommunicationsExportArtifact(exportArtifactId, request) {
        const response = await api.put(`/communications/exports/${exportArtifactId}`, request);
        return response.data;
    },
    async listCommunicationsImportValidations(filters) {
        const response = await api.get('/communications/import-validations', {
            params: {
                status: filters?.status,
                validation_domain_id: filters?.validationDomainId,
                artifact_reference: filters?.artifactReference,
            },
        });
        return response.data;
    },
    async createCommunicationsImportValidation(request) {
        const response = await api.post('/communications/import-validations', request);
        return response.data;
    },
    async updateCommunicationsImportValidation(importValidationId, request) {
        const response = await api.put(`/communications/import-validations/${importValidationId}`, request);
        return response.data;
    },
    async listCommunicationsResilienceChecks(filters) {
        const response = await api.get('/communications/resilience-checks', {
            params: {
                status: filters?.status,
                validation_domain_id: filters?.validationDomainId,
                check_name: filters?.checkName,
            },
        });
        return response.data;
    },
    async createCommunicationsResilienceCheck(request) {
        const response = await api.post('/communications/resilience-checks', request);
        return response.data;
    },
    async updateCommunicationsResilienceCheck(resilienceCheckId, request) {
        const response = await api.put(`/communications/resilience-checks/${resilienceCheckId}`, request);
        return response.data;
    },
    async listCommunicationsBenchmarkChecks(filters) {
        const response = await api.get('/communications/benchmarks', {
            params: {
                status: filters?.status,
                validation_domain_id: filters?.validationDomainId,
                benchmark_name: filters?.benchmarkName,
            },
        });
        return response.data;
    },
    async createCommunicationsBenchmarkCheck(request) {
        const response = await api.post('/communications/benchmarks', request);
        return response.data;
    },
    async updateCommunicationsBenchmarkCheck(benchmarkCheckId, request) {
        const response = await api.put(`/communications/benchmarks/${benchmarkCheckId}`, request);
        return response.data;
    },
    async listCommunicationsDiagnostics(filters) {
        const response = await api.get('/communications/diagnostics', {
            params: {
                status: filters?.status,
                validation_domain_id: filters?.validationDomainId,
                diagnostic_name: filters?.diagnosticName,
            },
        });
        return response.data;
    },
    async createCommunicationsDiagnosticsRecord(request) {
        const response = await api.post('/communications/diagnostics', request);
        return response.data;
    },
    async updateCommunicationsDiagnosticsRecord(diagnosticsRecordId, request) {
        const response = await api.put(`/communications/diagnostics/${diagnosticsRecordId}`, request);
        return response.data;
    },
    async getCommunicationsReviewSummary() {
        const response = await api.get('/communications/review/summary');
        return response.data;
    },
    async listCommunicationsFormalReviews() {
        const response = await api.get('/communications/review/formal');
        return response.data;
    },
    async createCommunicationsFormalReview(request) {
        const response = await api.post('/communications/review/formal', request ?? {});
        return response.data;
    },
    async listCommunicationsAdoptionPlans() {
        const response = await api.get('/communications/review/adoption-plans');
        return response.data;
    },
    async createCommunicationsAdoptionPlan(request) {
        const response = await api.post('/communications/review/adoption-plans', request ?? {});
        return response.data;
    },
};
