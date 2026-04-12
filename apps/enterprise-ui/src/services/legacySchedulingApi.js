import { api } from './iamHttpClient';
export const legacySchedulingApi = {
    async getSchedulingSummary() {
        const response = await api.get('/scheduling/summary');
        return response.data;
    },
    async getSchedulingReviewSummary() {
        const response = await api.get('/scheduling/review/summary');
        return response.data;
    },
    async getSchedulingStandardsMatrix() {
        const response = await api.get('/scheduling/review/standards-matrix');
        return response.data;
    },
    async getSchedulingInteroperabilityReview() {
        const response = await api.get('/scheduling/review/interoperability');
        return response.data;
    },
    async getSchedulingDifferentiationReview() {
        const response = await api.get('/scheduling/review/differentiation');
        return response.data;
    },
    async listSchedulingFormalReviews() {
        const response = await api.get('/scheduling/review/formal');
        return response.data;
    },
    async createSchedulingFormalReview(request) {
        const response = await api.post('/scheduling/review/formal', request ?? {});
        return response.data;
    },
    async listSchedulingAdoptionPlans() {
        const response = await api.get('/scheduling/review/adoption-plans');
        return response.data;
    },
    async createSchedulingAdoptionPlan(request) {
        const response = await api.post('/scheduling/review/adoption-plans', request ?? {});
        return response.data;
    },
    async listSchedulingValidationDomains() {
        const response = await api.get('/scheduling/validation-domains');
        return response.data;
    },
    async listSchedulingCalendars(filters) {
        const response = await api.get('/scheduling/calendars', {
            params: {
                status: filters?.status,
                owner_type: filters?.ownerType,
                validation_domain_id: filters?.validationDomainId,
            },
        });
        return response.data;
    },
    async createSchedulingCalendar(request) {
        const response = await api.post('/scheduling/calendars', request);
        return response.data;
    },
    async listSchedulingPolicies(filters) {
        const response = await api.get('/scheduling/policies', {
            params: {
                calendar_id: filters?.calendarId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createSchedulingPolicy(request) {
        const response = await api.post('/scheduling/policies', request);
        return response.data;
    },
    async listSchedulingAvailabilityWindows(filters) {
        const response = await api.get('/scheduling/availability', {
            params: {
                calendar_id: filters?.calendarId,
                policy_id: filters?.policyId,
                status: filters?.status,
                window_kind: filters?.windowKind,
                weekday: filters?.weekday,
            },
        });
        return response.data;
    },
    async createSchedulingAvailabilityWindow(request) {
        const response = await api.post('/scheduling/availability', request);
        return response.data;
    },
    async listSchedulingRecurrenceRules(filters) {
        const response = await api.get('/scheduling/recurrence', {
            params: {
                calendar_id: filters?.calendarId,
                policy_id: filters?.policyId,
                availability_window_id: filters?.availabilityWindowId,
                status: filters?.status,
                frequency: filters?.frequency,
                weekday: filters?.weekday,
            },
        });
        return response.data;
    },
    async createSchedulingRecurrenceRule(request) {
        const response = await api.post('/scheduling/recurrence', request);
        return response.data;
    },
    async generateSchedulingSlots(request) {
        const response = await api.post('/scheduling/slots/generate', request);
        return response.data;
    },
    async listSchedulingSlots(filters) {
        const response = await api.get('/scheduling/slots', {
            params: {
                calendar_id: filters?.calendarId,
                recurrence_rule_id: filters?.recurrenceRuleId,
                availability_window_id: filters?.availabilityWindowId,
                status: filters?.status,
                start_date: filters?.startDate,
                end_date: filters?.endDate,
            },
        });
        return response.data;
    },
    async listSchedulingHolds(filters) {
        const response = await api.get('/scheduling/holds', {
            params: {
                calendar_id: filters?.calendarId,
                slot_id: filters?.slotId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createSchedulingHold(request) {
        const response = await api.post('/scheduling/holds', request);
        return response.data;
    },
    async listSchedulingAppointments(filters) {
        const response = await api.get('/scheduling/appointments', {
            params: {
                calendar_id: filters?.calendarId,
                slot_id: filters?.slotId,
                status: filters?.status,
                lifecycle_stage: filters?.lifecycleStage,
            },
        });
        return response.data;
    },
    async createSchedulingAppointment(request) {
        const response = await api.post('/scheduling/appointments', request);
        return response.data;
    },
    async updateSchedulingAppointment(appointmentId, request) {
        const response = await api.put(`/scheduling/appointments/${appointmentId}`, request);
        return response.data;
    },
    async listSchedulingAppointmentParticipants(filters) {
        const response = await api.get('/scheduling/participants', {
            params: {
                appointment_id: filters?.appointmentId,
                status: filters?.status,
                role: filters?.role,
            },
        });
        return response.data;
    },
    async createSchedulingAppointmentParticipant(request) {
        const response = await api.post('/scheduling/participants', request);
        return response.data;
    },
    async listSchedulingWaitlists(filters) {
        const response = await api.get('/scheduling/waitlists', {
            params: {
                calendar_id: filters?.calendarId,
                slot_id: filters?.slotId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createSchedulingWaitlistEntry(request) {
        const response = await api.post('/scheduling/waitlists', request);
        return response.data;
    },
    async updateSchedulingWaitlistEntry(waitlistEntryId, request) {
        const response = await api.put(`/scheduling/waitlists/${waitlistEntryId}`, request);
        return response.data;
    },
    async listSchedulingReschedules(filters) {
        const response = await api.get('/scheduling/reschedules', {
            params: {
                calendar_id: filters?.calendarId,
                appointment_id: filters?.appointmentId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createSchedulingReschedule(request) {
        const response = await api.post('/scheduling/reschedules', request);
        return response.data;
    },
    async updateSchedulingReschedule(rescheduleId, request) {
        const response = await api.put(`/scheduling/reschedules/${rescheduleId}`, request);
        return response.data;
    },
    async listSchedulingCancellations(filters) {
        const response = await api.get('/scheduling/cancellations', {
            params: {
                calendar_id: filters?.calendarId,
                appointment_id: filters?.appointmentId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createSchedulingCancellation(request) {
        const response = await api.post('/scheduling/cancellations', request);
        return response.data;
    },
    async updateSchedulingCancellation(cancellationId, request) {
        const response = await api.put(`/scheduling/cancellations/${cancellationId}`, request);
        return response.data;
    },
    async listSchedulingConflicts(filters) {
        const response = await api.get('/scheduling/conflicts', {
            params: {
                calendar_id: filters?.calendarId,
                status: filters?.status,
                severity: filters?.severity,
                conflict_type: filters?.conflictType,
                include_resolved: filters?.includeResolved,
            },
        });
        return response.data;
    },
    async detectSchedulingConflicts(request) {
        const response = await api.post('/scheduling/conflicts/detect', request ?? {});
        return response.data;
    },
    async updateSchedulingConflict(conflictId, request) {
        const response = await api.put(`/scheduling/conflicts/${conflictId}`, request);
        return response.data;
    },
    async listSchedulingConcurrencyGuards(filters) {
        const response = await api.get('/scheduling/concurrency', {
            params: {
                resource_type: filters?.resourceType,
                resource_id: filters?.resourceId,
            },
        });
        return response.data;
    },
    async assertSchedulingConcurrency(request) {
        const response = await api.post('/scheduling/concurrency/assert', request);
        return response.data;
    },
    async listSchedulingReminders(filters) {
        const response = await api.get('/scheduling/reminders', {
            params: {
                calendar_id: filters?.calendarId,
                appointment_id: filters?.appointmentId,
                status: filters?.status,
                channel: filters?.channel,
            },
        });
        return response.data;
    },
    async createSchedulingReminder(request) {
        const response = await api.post('/scheduling/reminders', request);
        return response.data;
    },
    async updateSchedulingReminder(reminderId, request) {
        const response = await api.put(`/scheduling/reminders/${reminderId}`, request);
        return response.data;
    },
    async processSchedulingDueReminders(request) {
        const response = await api.post('/scheduling/reminders/process-due', request ?? {});
        return response.data;
    },
    async listSchedulingNotifications(filters) {
        const response = await api.get('/scheduling/notifications', {
            params: {
                calendar_id: filters?.calendarId,
                appointment_id: filters?.appointmentId,
                reminder_id: filters?.reminderId,
                status: filters?.status,
                channel: filters?.channel,
            },
        });
        return response.data;
    },
    async createSchedulingNotification(request) {
        const response = await api.post('/scheduling/notifications', request);
        return response.data;
    },
    async updateSchedulingNotification(notificationId, request) {
        const response = await api.put(`/scheduling/notifications/${notificationId}`, request);
        return response.data;
    },
    async listSchedulingEscalations(filters) {
        const response = await api.get('/scheduling/escalations', {
            params: {
                calendar_id: filters?.calendarId,
                appointment_id: filters?.appointmentId,
                status: filters?.status,
                severity: filters?.severity,
            },
        });
        return response.data;
    },
    async createSchedulingEscalation(request) {
        const response = await api.post('/scheduling/escalations', request);
        return response.data;
    },
    async updateSchedulingEscalation(escalationId, request) {
        const response = await api.put(`/scheduling/escalations/${escalationId}`, request);
        return response.data;
    },
    async listSchedulingIamBindings(filters) {
        const response = await api.get('/iam/external-identity-bindings', {
            params: {
                consumer_application: 'scheduling',
                calendar_id: filters?.calendarId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createSchedulingIamBinding(request) {
        const response = await api.post('/iam/external-identity-bindings', {
            ...request,
            consumer_application: 'scheduling',
        });
        return response.data;
    },
    async updateSchedulingIamBinding(iamBindingId, request) {
        const response = await api.put(`/iam/external-identity-bindings/${iamBindingId}`, {
            ...request,
            consumer_application: 'scheduling',
        });
        return response.data;
    },
    async listSchedulingCommerceBindings(filters) {
        const response = await api.get('/scheduling/commerce-bindings', {
            params: {
                calendar_id: filters?.calendarId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createSchedulingCommerceBinding(request) {
        const response = await api.post('/scheduling/commerce-bindings', request);
        return response.data;
    },
    async updateSchedulingCommerceBinding(commerceBindingId, request) {
        const response = await api.put(`/scheduling/commerce-bindings/${commerceBindingId}`, request);
        return response.data;
    },
    async listSchedulingLmsBindings(filters) {
        const response = await api.get('/scheduling/lms-bindings', {
            params: {
                calendar_id: filters?.calendarId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createSchedulingLmsBinding(request) {
        const response = await api.post('/scheduling/lms-bindings', request);
        return response.data;
    },
    async updateSchedulingLmsBinding(lmsBindingId, request) {
        const response = await api.put(`/scheduling/lms-bindings/${lmsBindingId}`, request);
        return response.data;
    },
    async listSchedulingWorkforceBindings(filters) {
        const response = await api.get('/scheduling/workforce-bindings', {
            params: {
                calendar_id: filters?.calendarId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createSchedulingWorkforceBinding(request) {
        const response = await api.post('/scheduling/workforce-bindings', request);
        return response.data;
    },
    async updateSchedulingWorkforceBinding(workforceBindingId, request) {
        const response = await api.put(`/scheduling/workforce-bindings/${workforceBindingId}`, request);
        return response.data;
    },
    async listSchedulingMissionBindings(filters) {
        const response = await api.get('/scheduling/mission-bindings', {
            params: {
                calendar_id: filters?.calendarId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createSchedulingMissionBinding(request) {
        const response = await api.post('/scheduling/mission-bindings', request);
        return response.data;
    },
    async updateSchedulingMissionBinding(missionBindingId, request) {
        const response = await api.put(`/scheduling/mission-bindings/${missionBindingId}`, request);
        return response.data;
    },
    async listSchedulingActivationEvents(filters) {
        const response = await api.get('/scheduling/activation-events', {
            params: {
                calendar_id: filters?.calendarId,
                binding_kind: filters?.bindingKind,
                binding_id: filters?.bindingId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createSchedulingActivationEvent(request) {
        const response = await api.post('/scheduling/activation-events', request);
        return response.data;
    },
    async updateSchedulingActivationEvent(activationEventId, request) {
        const response = await api.put(`/scheduling/activation-events/${activationEventId}`, request);
        return response.data;
    },
    async getSchedulingOperationsSummary() {
        const response = await api.get('/scheduling/operations/summary');
        return response.data;
    },
    async listSchedulingBackups(filters) {
        const response = await api.get('/scheduling/backups', {
            params: {
                status: filters?.status,
                backup_scope: filters?.backupScope,
                calendar_id: filters?.calendarId,
            },
        });
        return response.data;
    },
    async createSchedulingBackup(request) {
        const response = await api.post('/scheduling/backups', request);
        return response.data;
    },
    async updateSchedulingBackup(backupId, request) {
        const response = await api.put(`/scheduling/backups/${backupId}`, request);
        return response.data;
    },
    async listSchedulingRestoreDrills(filters) {
        const response = await api.get('/scheduling/restores', {
            params: {
                status: filters?.status,
                backup_id: filters?.backupId,
                calendar_id: filters?.calendarId,
            },
        });
        return response.data;
    },
    async createSchedulingRestoreDrill(request) {
        const response = await api.post('/scheduling/restores', request);
        return response.data;
    },
    async updateSchedulingRestoreDrill(restoreDrillId, request) {
        const response = await api.put(`/scheduling/restores/${restoreDrillId}`, request);
        return response.data;
    },
    async listSchedulingExportArtifacts(filters) {
        const response = await api.get('/scheduling/exports', {
            params: {
                status: filters?.status,
                format: filters?.format,
                calendar_id: filters?.calendarId,
            },
        });
        return response.data;
    },
    async createSchedulingExportArtifact(request) {
        const response = await api.post('/scheduling/exports', request);
        return response.data;
    },
    async updateSchedulingExportArtifact(exportArtifactId, request) {
        const response = await api.put(`/scheduling/exports/${exportArtifactId}`, request);
        return response.data;
    },
    async listSchedulingImportValidations(filters) {
        const response = await api.get('/scheduling/import-validations', {
            params: {
                status: filters?.status,
                artifact_reference: filters?.artifactReference,
                calendar_id: filters?.calendarId,
            },
        });
        return response.data;
    },
    async createSchedulingImportValidation(request) {
        const response = await api.post('/scheduling/import-validations', request);
        return response.data;
    },
    async updateSchedulingImportValidation(importValidationId, request) {
        const response = await api.put(`/scheduling/import-validations/${importValidationId}`, request);
        return response.data;
    },
    async listSchedulingResilienceChecks(filters) {
        const response = await api.get('/scheduling/resilience-checks', {
            params: {
                status: filters?.status,
                check_name: filters?.checkName,
                calendar_id: filters?.calendarId,
            },
        });
        return response.data;
    },
    async createSchedulingResilienceCheck(request) {
        const response = await api.post('/scheduling/resilience-checks', request);
        return response.data;
    },
    async updateSchedulingResilienceCheck(resilienceCheckId, request) {
        const response = await api.put(`/scheduling/resilience-checks/${resilienceCheckId}`, request);
        return response.data;
    },
    async listSchedulingBenchmarkChecks(filters) {
        const response = await api.get('/scheduling/benchmarks', {
            params: {
                status: filters?.status,
                benchmark_name: filters?.benchmarkName,
                calendar_id: filters?.calendarId,
            },
        });
        return response.data;
    },
    async createSchedulingBenchmarkCheck(request) {
        const response = await api.post('/scheduling/benchmarks', request);
        return response.data;
    },
    async updateSchedulingBenchmarkCheck(benchmarkCheckId, request) {
        const response = await api.put(`/scheduling/benchmarks/${benchmarkCheckId}`, request);
        return response.data;
    },
    async listSchedulingDiagnostics(filters) {
        const response = await api.get('/scheduling/diagnostics', {
            params: {
                status: filters?.status,
                diagnostic_name: filters?.diagnosticName,
                calendar_id: filters?.calendarId,
            },
        });
        return response.data;
    },
    async createSchedulingDiagnosticsRecord(request) {
        const response = await api.post('/scheduling/diagnostics', request);
        return response.data;
    },
    async updateSchedulingDiagnosticsRecord(diagnosticsRecordId, request) {
        const response = await api.put(`/scheduling/diagnostics/${diagnosticsRecordId}`, request);
        return response.data;
    },
};
