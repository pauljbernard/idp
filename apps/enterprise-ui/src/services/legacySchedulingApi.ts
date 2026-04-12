import { api } from './iamHttpClient'
import type {
  AssertSchedulingConcurrencyRequest,
  CreateSchedulingActivationEventRequest,
  CreateSchedulingAdoptionPlanRequest,
  CreateSchedulingAppointmentParticipantRequest,
  CreateSchedulingAppointmentRequest,
  CreateSchedulingAvailabilityWindowRequest,
  CreateSchedulingBackupRequest,
  CreateSchedulingBenchmarkCheckRequest,
  CreateSchedulingCalendarRequest,
  CreateSchedulingCancellationRequest,
  CreateSchedulingCommerceBindingRequest,
  CreateSchedulingDiagnosticsRequest,
  CreateSchedulingEscalationRequest,
  CreateSchedulingExportArtifactRequest,
  CreateSchedulingFormalReviewRequest,
  CreateSchedulingHoldRequest,
  CreateSchedulingIamBindingRequest,
  CreateSchedulingImportValidationRequest,
  CreateSchedulingLmsBindingRequest,
  CreateSchedulingMissionBindingRequest,
  CreateSchedulingNotificationRequest,
  CreateSchedulingPolicyRequest,
  CreateSchedulingRecurrenceRuleRequest,
  CreateSchedulingReminderRequest,
  CreateSchedulingRescheduleRequest,
  CreateSchedulingResilienceCheckRequest,
  CreateSchedulingRestoreDrillRequest,
  CreateSchedulingWaitlistRequest,
  CreateSchedulingWorkforceBindingRequest,
  DetectSchedulingConflictsRequest,
  GenerateSchedulingSlotsRequest,
  ProcessDueSchedulingRemindersRequest,
  SchedulingActivationBindingKind,
  SchedulingActivationEventRecord,
  SchedulingActivationEventStatus,
  SchedulingActivationEventsResponse,
  SchedulingAdoptionPlanRecord,
  SchedulingAdoptionPlansResponse,
  SchedulingAppointmentLifecycleStage,
  SchedulingAppointmentParticipantRecord,
  SchedulingAppointmentParticipantRole,
  SchedulingAppointmentParticipantStatus,
  SchedulingAppointmentParticipantsResponse,
  SchedulingAppointmentRecord,
  SchedulingAppointmentStatus,
  SchedulingAppointmentsResponse,
  SchedulingAvailabilityWindowKind,
  SchedulingAvailabilityWindowRecord,
  SchedulingAvailabilityWindowStatus,
  SchedulingAvailabilityWindowsResponse,
  SchedulingBackupRecord,
  SchedulingBackupStatus,
  SchedulingBackupsResponse,
  SchedulingBenchmarkCheckRecord,
  SchedulingBenchmarkCheckStatus,
  SchedulingBenchmarkChecksResponse,
  SchedulingBindingStatus,
  SchedulingCalendarRecord,
  SchedulingCalendarStatus,
  SchedulingCalendarsResponse,
  SchedulingCancellationRecord,
  SchedulingCancellationStatus,
  SchedulingCancellationsResponse,
  SchedulingCommerceBindingRecord,
  SchedulingCommerceBindingsResponse,
  SchedulingCommunicationChannel,
  SchedulingConcurrencyAssertionResponse,
  SchedulingConcurrencyGuardsResponse,
  SchedulingConcurrencyResourceType,
  SchedulingConflictDetectionResponse,
  SchedulingConflictRecord,
  SchedulingConflictSeverity,
  SchedulingConflictStatus,
  SchedulingConflictType,
  SchedulingConflictsResponse,
  SchedulingDiagnosticsRecord,
  SchedulingDiagnosticsResponse,
  SchedulingDiagnosticsStatus,
  SchedulingDifferentiationResponse,
  SchedulingEscalationRecord,
  SchedulingEscalationSeverity,
  SchedulingEscalationStatus,
  SchedulingEscalationsResponse,
  SchedulingExportArtifactRecord,
  SchedulingExportArtifactStatus,
  SchedulingExportArtifactsResponse,
  SchedulingFormalReviewRecord,
  SchedulingFormalReviewsResponse,
  SchedulingHoldRecord,
  SchedulingHoldStatus,
  SchedulingHoldsResponse,
  SchedulingIamBindingRecord,
  SchedulingIamBindingsResponse,
  SchedulingImportValidationRecord,
  SchedulingImportValidationStatus,
  SchedulingImportValidationsResponse,
  SchedulingInteroperabilityResponse,
  SchedulingLmsBindingRecord,
  SchedulingLmsBindingsResponse,
  SchedulingMissionBindingRecord,
  SchedulingMissionBindingsResponse,
  SchedulingNotificationRecord,
  SchedulingNotificationStatus,
  SchedulingNotificationsResponse,
  SchedulingOperationsSummaryResponse,
  SchedulingOwnerType,
  SchedulingPoliciesResponse,
  SchedulingPolicyRecord,
  SchedulingPolicyStatus,
  SchedulingRecurrenceFrequency,
  SchedulingRecurrenceRuleRecord,
  SchedulingRecurrenceRulesResponse,
  SchedulingRecurrenceStatus,
  SchedulingReminderDispatchRunResponse,
  SchedulingReminderRecord,
  SchedulingReminderStatus,
  SchedulingRemindersResponse,
  SchedulingRescheduleRecord,
  SchedulingRescheduleStatus,
  SchedulingReschedulesResponse,
  SchedulingResilienceCheckRecord,
  SchedulingResilienceCheckStatus,
  SchedulingResilienceChecksResponse,
  SchedulingRestoreDrillRecord,
  SchedulingRestoreDrillsResponse,
  SchedulingRestoreStatus,
  SchedulingReviewSummaryResponse,
  SchedulingSlotGenerationResponse,
  SchedulingSlotStatus,
  SchedulingSlotsResponse,
  SchedulingStandardsMatrixResponse,
  SchedulingSummaryResponse,
  SchedulingValidationDomainsResponse,
  SchedulingWaitlistEntryRecord,
  SchedulingWaitlistStatus,
  SchedulingWaitlistsResponse,
  SchedulingWeekday,
  SchedulingWorkforceBindingRecord,
  SchedulingWorkforceBindingsResponse,
  UpdateSchedulingActivationEventRequest,
  UpdateSchedulingAppointmentRequest,
  UpdateSchedulingBackupRequest,
  UpdateSchedulingBenchmarkCheckRequest,
  UpdateSchedulingCancellationRequest,
  UpdateSchedulingCommerceBindingRequest,
  UpdateSchedulingConflictRequest,
  UpdateSchedulingDiagnosticsRequest,
  UpdateSchedulingEscalationRequest,
  UpdateSchedulingExportArtifactRequest,
  UpdateSchedulingIamBindingRequest,
  UpdateSchedulingImportValidationRequest,
  UpdateSchedulingLmsBindingRequest,
  UpdateSchedulingMissionBindingRequest,
  UpdateSchedulingNotificationRequest,
  UpdateSchedulingReminderRequest,
  UpdateSchedulingRescheduleRequest,
  UpdateSchedulingResilienceCheckRequest,
  UpdateSchedulingRestoreDrillRequest,
  UpdateSchedulingWaitlistRequest,
  UpdateSchedulingWorkforceBindingRequest,
} from './legacySchedulingTypes'

export const legacySchedulingApi = {
  async getSchedulingSummary(): Promise<SchedulingSummaryResponse> {
    const response = await api.get('/scheduling/summary')
    return response.data
  },

  async getSchedulingReviewSummary(): Promise<SchedulingReviewSummaryResponse> {
    const response = await api.get('/scheduling/review/summary')
    return response.data
  },

  async getSchedulingStandardsMatrix(): Promise<SchedulingStandardsMatrixResponse> {
    const response = await api.get('/scheduling/review/standards-matrix')
    return response.data
  },

  async getSchedulingInteroperabilityReview(): Promise<SchedulingInteroperabilityResponse> {
    const response = await api.get('/scheduling/review/interoperability')
    return response.data
  },

  async getSchedulingDifferentiationReview(): Promise<SchedulingDifferentiationResponse> {
    const response = await api.get('/scheduling/review/differentiation')
    return response.data
  },

  async listSchedulingFormalReviews(): Promise<SchedulingFormalReviewsResponse> {
    const response = await api.get('/scheduling/review/formal')
    return response.data
  },

  async createSchedulingFormalReview(
    request?: CreateSchedulingFormalReviewRequest,
  ): Promise<SchedulingFormalReviewRecord> {
    const response = await api.post('/scheduling/review/formal', request ?? {})
    return response.data
  },

  async listSchedulingAdoptionPlans(): Promise<SchedulingAdoptionPlansResponse> {
    const response = await api.get('/scheduling/review/adoption-plans')
    return response.data
  },

  async createSchedulingAdoptionPlan(
    request?: CreateSchedulingAdoptionPlanRequest,
  ): Promise<SchedulingAdoptionPlanRecord> {
    const response = await api.post('/scheduling/review/adoption-plans', request ?? {})
    return response.data
  },

  async listSchedulingValidationDomains(): Promise<SchedulingValidationDomainsResponse> {
    const response = await api.get('/scheduling/validation-domains')
    return response.data
  },

  async listSchedulingCalendars(filters?: {
    status?: SchedulingCalendarStatus
    ownerType?: SchedulingOwnerType
    validationDomainId?: string
  }): Promise<SchedulingCalendarsResponse> {
    const response = await api.get('/scheduling/calendars', {
      params: {
        status: filters?.status,
        owner_type: filters?.ownerType,
        validation_domain_id: filters?.validationDomainId,
      },
    })
    return response.data
  },

  async createSchedulingCalendar(request: CreateSchedulingCalendarRequest): Promise<SchedulingCalendarRecord> {
    const response = await api.post('/scheduling/calendars', request)
    return response.data
  },

  async listSchedulingPolicies(filters?: {
    calendarId?: string
    status?: SchedulingPolicyStatus
  }): Promise<SchedulingPoliciesResponse> {
    const response = await api.get('/scheduling/policies', {
      params: {
        calendar_id: filters?.calendarId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createSchedulingPolicy(request: CreateSchedulingPolicyRequest): Promise<SchedulingPolicyRecord> {
    const response = await api.post('/scheduling/policies', request)
    return response.data
  },

  async listSchedulingAvailabilityWindows(filters?: {
    calendarId?: string
    policyId?: string
    status?: SchedulingAvailabilityWindowStatus
    windowKind?: SchedulingAvailabilityWindowKind
    weekday?: SchedulingWeekday
  }): Promise<SchedulingAvailabilityWindowsResponse> {
    const response = await api.get('/scheduling/availability', {
      params: {
        calendar_id: filters?.calendarId,
        policy_id: filters?.policyId,
        status: filters?.status,
        window_kind: filters?.windowKind,
        weekday: filters?.weekday,
      },
    })
    return response.data
  },

  async createSchedulingAvailabilityWindow(
    request: CreateSchedulingAvailabilityWindowRequest,
  ): Promise<SchedulingAvailabilityWindowRecord> {
    const response = await api.post('/scheduling/availability', request)
    return response.data
  },

  async listSchedulingRecurrenceRules(filters?: {
    calendarId?: string
    policyId?: string
    availabilityWindowId?: string
    status?: SchedulingRecurrenceStatus
    frequency?: SchedulingRecurrenceFrequency
    weekday?: SchedulingWeekday
  }): Promise<SchedulingRecurrenceRulesResponse> {
    const response = await api.get('/scheduling/recurrence', {
      params: {
        calendar_id: filters?.calendarId,
        policy_id: filters?.policyId,
        availability_window_id: filters?.availabilityWindowId,
        status: filters?.status,
        frequency: filters?.frequency,
        weekday: filters?.weekday,
      },
    })
    return response.data
  },

  async createSchedulingRecurrenceRule(request: CreateSchedulingRecurrenceRuleRequest): Promise<SchedulingRecurrenceRuleRecord> {
    const response = await api.post('/scheduling/recurrence', request)
    return response.data
  },

  async generateSchedulingSlots(request: GenerateSchedulingSlotsRequest): Promise<SchedulingSlotGenerationResponse> {
    const response = await api.post('/scheduling/slots/generate', request)
    return response.data
  },

  async listSchedulingSlots(filters?: {
    calendarId?: string
    recurrenceRuleId?: string
    availabilityWindowId?: string
    status?: SchedulingSlotStatus
    startDate?: string
    endDate?: string
  }): Promise<SchedulingSlotsResponse> {
    const response = await api.get('/scheduling/slots', {
      params: {
        calendar_id: filters?.calendarId,
        recurrence_rule_id: filters?.recurrenceRuleId,
        availability_window_id: filters?.availabilityWindowId,
        status: filters?.status,
        start_date: filters?.startDate,
        end_date: filters?.endDate,
      },
    })
    return response.data
  },

  async listSchedulingHolds(filters?: {
    calendarId?: string
    slotId?: string
    status?: SchedulingHoldStatus
  }): Promise<SchedulingHoldsResponse> {
    const response = await api.get('/scheduling/holds', {
      params: {
        calendar_id: filters?.calendarId,
        slot_id: filters?.slotId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createSchedulingHold(request: CreateSchedulingHoldRequest): Promise<SchedulingHoldRecord> {
    const response = await api.post('/scheduling/holds', request)
    return response.data
  },

  async listSchedulingAppointments(filters?: {
    calendarId?: string
    slotId?: string
    status?: SchedulingAppointmentStatus
    lifecycleStage?: SchedulingAppointmentLifecycleStage
  }): Promise<SchedulingAppointmentsResponse> {
    const response = await api.get('/scheduling/appointments', {
      params: {
        calendar_id: filters?.calendarId,
        slot_id: filters?.slotId,
        status: filters?.status,
        lifecycle_stage: filters?.lifecycleStage,
      },
    })
    return response.data
  },

  async createSchedulingAppointment(request: CreateSchedulingAppointmentRequest): Promise<SchedulingAppointmentRecord> {
    const response = await api.post('/scheduling/appointments', request)
    return response.data
  },

  async updateSchedulingAppointment(
    appointmentId: string,
    request: UpdateSchedulingAppointmentRequest,
  ): Promise<SchedulingAppointmentRecord> {
    const response = await api.put(`/scheduling/appointments/${appointmentId}`, request)
    return response.data
  },

  async listSchedulingAppointmentParticipants(filters?: {
    appointmentId?: string
    status?: SchedulingAppointmentParticipantStatus
    role?: SchedulingAppointmentParticipantRole
  }): Promise<SchedulingAppointmentParticipantsResponse> {
    const response = await api.get('/scheduling/participants', {
      params: {
        appointment_id: filters?.appointmentId,
        status: filters?.status,
        role: filters?.role,
      },
    })
    return response.data
  },

  async createSchedulingAppointmentParticipant(
    request: CreateSchedulingAppointmentParticipantRequest,
  ): Promise<SchedulingAppointmentParticipantRecord> {
    const response = await api.post('/scheduling/participants', request)
    return response.data
  },

  async listSchedulingWaitlists(filters?: {
    calendarId?: string
    slotId?: string
    status?: SchedulingWaitlistStatus
  }): Promise<SchedulingWaitlistsResponse> {
    const response = await api.get('/scheduling/waitlists', {
      params: {
        calendar_id: filters?.calendarId,
        slot_id: filters?.slotId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createSchedulingWaitlistEntry(request: CreateSchedulingWaitlistRequest): Promise<SchedulingWaitlistEntryRecord> {
    const response = await api.post('/scheduling/waitlists', request)
    return response.data
  },

  async updateSchedulingWaitlistEntry(
    waitlistEntryId: string,
    request: UpdateSchedulingWaitlistRequest,
  ): Promise<SchedulingWaitlistEntryRecord> {
    const response = await api.put(`/scheduling/waitlists/${waitlistEntryId}`, request)
    return response.data
  },

  async listSchedulingReschedules(filters?: {
    calendarId?: string
    appointmentId?: string
    status?: SchedulingRescheduleStatus
  }): Promise<SchedulingReschedulesResponse> {
    const response = await api.get('/scheduling/reschedules', {
      params: {
        calendar_id: filters?.calendarId,
        appointment_id: filters?.appointmentId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createSchedulingReschedule(request: CreateSchedulingRescheduleRequest): Promise<SchedulingRescheduleRecord> {
    const response = await api.post('/scheduling/reschedules', request)
    return response.data
  },

  async updateSchedulingReschedule(
    rescheduleId: string,
    request: UpdateSchedulingRescheduleRequest,
  ): Promise<SchedulingRescheduleRecord> {
    const response = await api.put(`/scheduling/reschedules/${rescheduleId}`, request)
    return response.data
  },

  async listSchedulingCancellations(filters?: {
    calendarId?: string
    appointmentId?: string
    status?: SchedulingCancellationStatus
  }): Promise<SchedulingCancellationsResponse> {
    const response = await api.get('/scheduling/cancellations', {
      params: {
        calendar_id: filters?.calendarId,
        appointment_id: filters?.appointmentId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createSchedulingCancellation(request: CreateSchedulingCancellationRequest): Promise<SchedulingCancellationRecord> {
    const response = await api.post('/scheduling/cancellations', request)
    return response.data
  },

  async updateSchedulingCancellation(
    cancellationId: string,
    request: UpdateSchedulingCancellationRequest,
  ): Promise<SchedulingCancellationRecord> {
    const response = await api.put(`/scheduling/cancellations/${cancellationId}`, request)
    return response.data
  },

  async listSchedulingConflicts(filters?: {
    calendarId?: string
    status?: SchedulingConflictStatus
    severity?: SchedulingConflictSeverity
    conflictType?: SchedulingConflictType
    includeResolved?: boolean
  }): Promise<SchedulingConflictsResponse> {
    const response = await api.get('/scheduling/conflicts', {
      params: {
        calendar_id: filters?.calendarId,
        status: filters?.status,
        severity: filters?.severity,
        conflict_type: filters?.conflictType,
        include_resolved: filters?.includeResolved,
      },
    })
    return response.data
  },

  async detectSchedulingConflicts(
    request?: DetectSchedulingConflictsRequest,
  ): Promise<SchedulingConflictDetectionResponse> {
    const response = await api.post('/scheduling/conflicts/detect', request ?? {})
    return response.data
  },

  async updateSchedulingConflict(
    conflictId: string,
    request: UpdateSchedulingConflictRequest,
  ): Promise<SchedulingConflictRecord> {
    const response = await api.put(`/scheduling/conflicts/${conflictId}`, request)
    return response.data
  },

  async listSchedulingConcurrencyGuards(filters?: {
    resourceType?: SchedulingConcurrencyResourceType
    resourceId?: string
  }): Promise<SchedulingConcurrencyGuardsResponse> {
    const response = await api.get('/scheduling/concurrency', {
      params: {
        resource_type: filters?.resourceType,
        resource_id: filters?.resourceId,
      },
    })
    return response.data
  },

  async assertSchedulingConcurrency(
    request: AssertSchedulingConcurrencyRequest,
  ): Promise<SchedulingConcurrencyAssertionResponse> {
    const response = await api.post('/scheduling/concurrency/assert', request)
    return response.data
  },

  async listSchedulingReminders(filters?: {
    calendarId?: string
    appointmentId?: string
    status?: SchedulingReminderStatus
    channel?: SchedulingCommunicationChannel
  }): Promise<SchedulingRemindersResponse> {
    const response = await api.get('/scheduling/reminders', {
      params: {
        calendar_id: filters?.calendarId,
        appointment_id: filters?.appointmentId,
        status: filters?.status,
        channel: filters?.channel,
      },
    })
    return response.data
  },

  async createSchedulingReminder(request: CreateSchedulingReminderRequest): Promise<SchedulingReminderRecord> {
    const response = await api.post('/scheduling/reminders', request)
    return response.data
  },

  async updateSchedulingReminder(
    reminderId: string,
    request: UpdateSchedulingReminderRequest,
  ): Promise<SchedulingReminderRecord> {
    const response = await api.put(`/scheduling/reminders/${reminderId}`, request)
    return response.data
  },

  async processSchedulingDueReminders(
    request?: ProcessDueSchedulingRemindersRequest,
  ): Promise<SchedulingReminderDispatchRunResponse> {
    const response = await api.post('/scheduling/reminders/process-due', request ?? {})
    return response.data
  },

  async listSchedulingNotifications(filters?: {
    calendarId?: string
    appointmentId?: string
    reminderId?: string
    status?: SchedulingNotificationStatus
    channel?: SchedulingCommunicationChannel
  }): Promise<SchedulingNotificationsResponse> {
    const response = await api.get('/scheduling/notifications', {
      params: {
        calendar_id: filters?.calendarId,
        appointment_id: filters?.appointmentId,
        reminder_id: filters?.reminderId,
        status: filters?.status,
        channel: filters?.channel,
      },
    })
    return response.data
  },

  async createSchedulingNotification(request: CreateSchedulingNotificationRequest): Promise<SchedulingNotificationRecord> {
    const response = await api.post('/scheduling/notifications', request)
    return response.data
  },

  async updateSchedulingNotification(
    notificationId: string,
    request: UpdateSchedulingNotificationRequest,
  ): Promise<SchedulingNotificationRecord> {
    const response = await api.put(`/scheduling/notifications/${notificationId}`, request)
    return response.data
  },

  async listSchedulingEscalations(filters?: {
    calendarId?: string
    appointmentId?: string
    status?: SchedulingEscalationStatus
    severity?: SchedulingEscalationSeverity
  }): Promise<SchedulingEscalationsResponse> {
    const response = await api.get('/scheduling/escalations', {
      params: {
        calendar_id: filters?.calendarId,
        appointment_id: filters?.appointmentId,
        status: filters?.status,
        severity: filters?.severity,
      },
    })
    return response.data
  },

  async createSchedulingEscalation(request: CreateSchedulingEscalationRequest): Promise<SchedulingEscalationRecord> {
    const response = await api.post('/scheduling/escalations', request)
    return response.data
  },

  async updateSchedulingEscalation(
    escalationId: string,
    request: UpdateSchedulingEscalationRequest,
  ): Promise<SchedulingEscalationRecord> {
    const response = await api.put(`/scheduling/escalations/${escalationId}`, request)
    return response.data
  },

  async listSchedulingIamBindings(filters?: {
    calendarId?: string
    status?: SchedulingBindingStatus
  }): Promise<SchedulingIamBindingsResponse> {
    const response = await api.get('/iam/external-identity-bindings', {
      params: {
        consumer_application: 'scheduling',
        calendar_id: filters?.calendarId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createSchedulingIamBinding(request: CreateSchedulingIamBindingRequest): Promise<SchedulingIamBindingRecord> {
    const response = await api.post('/iam/external-identity-bindings', {
      ...request,
      consumer_application: 'scheduling',
    })
    return response.data
  },

  async updateSchedulingIamBinding(
    iamBindingId: string,
    request: UpdateSchedulingIamBindingRequest,
  ): Promise<SchedulingIamBindingRecord> {
    const response = await api.put(`/iam/external-identity-bindings/${iamBindingId}`, {
      ...request,
      consumer_application: 'scheduling',
    })
    return response.data
  },

  async listSchedulingCommerceBindings(filters?: {
    calendarId?: string
    status?: SchedulingBindingStatus
  }): Promise<SchedulingCommerceBindingsResponse> {
    const response = await api.get('/scheduling/commerce-bindings', {
      params: {
        calendar_id: filters?.calendarId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createSchedulingCommerceBinding(
    request: CreateSchedulingCommerceBindingRequest,
  ): Promise<SchedulingCommerceBindingRecord> {
    const response = await api.post('/scheduling/commerce-bindings', request)
    return response.data
  },

  async updateSchedulingCommerceBinding(
    commerceBindingId: string,
    request: UpdateSchedulingCommerceBindingRequest,
  ): Promise<SchedulingCommerceBindingRecord> {
    const response = await api.put(`/scheduling/commerce-bindings/${commerceBindingId}`, request)
    return response.data
  },

  async listSchedulingLmsBindings(filters?: {
    calendarId?: string
    status?: SchedulingBindingStatus
  }): Promise<SchedulingLmsBindingsResponse> {
    const response = await api.get('/scheduling/lms-bindings', {
      params: {
        calendar_id: filters?.calendarId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createSchedulingLmsBinding(request: CreateSchedulingLmsBindingRequest): Promise<SchedulingLmsBindingRecord> {
    const response = await api.post('/scheduling/lms-bindings', request)
    return response.data
  },

  async updateSchedulingLmsBinding(
    lmsBindingId: string,
    request: UpdateSchedulingLmsBindingRequest,
  ): Promise<SchedulingLmsBindingRecord> {
    const response = await api.put(`/scheduling/lms-bindings/${lmsBindingId}`, request)
    return response.data
  },

  async listSchedulingWorkforceBindings(filters?: {
    calendarId?: string
    status?: SchedulingBindingStatus
  }): Promise<SchedulingWorkforceBindingsResponse> {
    const response = await api.get('/scheduling/workforce-bindings', {
      params: {
        calendar_id: filters?.calendarId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createSchedulingWorkforceBinding(
    request: CreateSchedulingWorkforceBindingRequest,
  ): Promise<SchedulingWorkforceBindingRecord> {
    const response = await api.post('/scheduling/workforce-bindings', request)
    return response.data
  },

  async updateSchedulingWorkforceBinding(
    workforceBindingId: string,
    request: UpdateSchedulingWorkforceBindingRequest,
  ): Promise<SchedulingWorkforceBindingRecord> {
    const response = await api.put(`/scheduling/workforce-bindings/${workforceBindingId}`, request)
    return response.data
  },

  async listSchedulingMissionBindings(filters?: {
    calendarId?: string
    status?: SchedulingBindingStatus
  }): Promise<SchedulingMissionBindingsResponse> {
    const response = await api.get('/scheduling/mission-bindings', {
      params: {
        calendar_id: filters?.calendarId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createSchedulingMissionBinding(
    request: CreateSchedulingMissionBindingRequest,
  ): Promise<SchedulingMissionBindingRecord> {
    const response = await api.post('/scheduling/mission-bindings', request)
    return response.data
  },

  async updateSchedulingMissionBinding(
    missionBindingId: string,
    request: UpdateSchedulingMissionBindingRequest,
  ): Promise<SchedulingMissionBindingRecord> {
    const response = await api.put(`/scheduling/mission-bindings/${missionBindingId}`, request)
    return response.data
  },

  async listSchedulingActivationEvents(filters?: {
    calendarId?: string
    bindingKind?: SchedulingActivationBindingKind
    bindingId?: string
    status?: SchedulingActivationEventStatus
  }): Promise<SchedulingActivationEventsResponse> {
    const response = await api.get('/scheduling/activation-events', {
      params: {
        calendar_id: filters?.calendarId,
        binding_kind: filters?.bindingKind,
        binding_id: filters?.bindingId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createSchedulingActivationEvent(
    request: CreateSchedulingActivationEventRequest,
  ): Promise<SchedulingActivationEventRecord> {
    const response = await api.post('/scheduling/activation-events', request)
    return response.data
  },

  async updateSchedulingActivationEvent(
    activationEventId: string,
    request: UpdateSchedulingActivationEventRequest,
  ): Promise<SchedulingActivationEventRecord> {
    const response = await api.put(`/scheduling/activation-events/${activationEventId}`, request)
    return response.data
  },

  async getSchedulingOperationsSummary(): Promise<SchedulingOperationsSummaryResponse> {
    const response = await api.get('/scheduling/operations/summary')
    return response.data
  },

  async listSchedulingBackups(filters?: {
    status?: SchedulingBackupStatus
    backupScope?: string
    calendarId?: string
  }): Promise<SchedulingBackupsResponse> {
    const response = await api.get('/scheduling/backups', {
      params: {
        status: filters?.status,
        backup_scope: filters?.backupScope,
        calendar_id: filters?.calendarId,
      },
    })
    return response.data
  },

  async createSchedulingBackup(request: CreateSchedulingBackupRequest): Promise<SchedulingBackupRecord> {
    const response = await api.post('/scheduling/backups', request)
    return response.data
  },

  async updateSchedulingBackup(
    backupId: string,
    request: UpdateSchedulingBackupRequest,
  ): Promise<SchedulingBackupRecord> {
    const response = await api.put(`/scheduling/backups/${backupId}`, request)
    return response.data
  },

  async listSchedulingRestoreDrills(filters?: {
    status?: SchedulingRestoreStatus
    backupId?: string
    calendarId?: string
  }): Promise<SchedulingRestoreDrillsResponse> {
    const response = await api.get('/scheduling/restores', {
      params: {
        status: filters?.status,
        backup_id: filters?.backupId,
        calendar_id: filters?.calendarId,
      },
    })
    return response.data
  },

  async createSchedulingRestoreDrill(
    request: CreateSchedulingRestoreDrillRequest,
  ): Promise<SchedulingRestoreDrillRecord> {
    const response = await api.post('/scheduling/restores', request)
    return response.data
  },

  async updateSchedulingRestoreDrill(
    restoreDrillId: string,
    request: UpdateSchedulingRestoreDrillRequest,
  ): Promise<SchedulingRestoreDrillRecord> {
    const response = await api.put(`/scheduling/restores/${restoreDrillId}`, request)
    return response.data
  },

  async listSchedulingExportArtifacts(filters?: {
    status?: SchedulingExportArtifactStatus
    format?: string
    calendarId?: string
  }): Promise<SchedulingExportArtifactsResponse> {
    const response = await api.get('/scheduling/exports', {
      params: {
        status: filters?.status,
        format: filters?.format,
        calendar_id: filters?.calendarId,
      },
    })
    return response.data
  },

  async createSchedulingExportArtifact(
    request: CreateSchedulingExportArtifactRequest,
  ): Promise<SchedulingExportArtifactRecord> {
    const response = await api.post('/scheduling/exports', request)
    return response.data
  },

  async updateSchedulingExportArtifact(
    exportArtifactId: string,
    request: UpdateSchedulingExportArtifactRequest,
  ): Promise<SchedulingExportArtifactRecord> {
    const response = await api.put(`/scheduling/exports/${exportArtifactId}`, request)
    return response.data
  },

  async listSchedulingImportValidations(filters?: {
    status?: SchedulingImportValidationStatus
    artifactReference?: string
    calendarId?: string
  }): Promise<SchedulingImportValidationsResponse> {
    const response = await api.get('/scheduling/import-validations', {
      params: {
        status: filters?.status,
        artifact_reference: filters?.artifactReference,
        calendar_id: filters?.calendarId,
      },
    })
    return response.data
  },

  async createSchedulingImportValidation(
    request: CreateSchedulingImportValidationRequest,
  ): Promise<SchedulingImportValidationRecord> {
    const response = await api.post('/scheduling/import-validations', request)
    return response.data
  },

  async updateSchedulingImportValidation(
    importValidationId: string,
    request: UpdateSchedulingImportValidationRequest,
  ): Promise<SchedulingImportValidationRecord> {
    const response = await api.put(`/scheduling/import-validations/${importValidationId}`, request)
    return response.data
  },

  async listSchedulingResilienceChecks(filters?: {
    status?: SchedulingResilienceCheckStatus
    checkName?: string
    calendarId?: string
  }): Promise<SchedulingResilienceChecksResponse> {
    const response = await api.get('/scheduling/resilience-checks', {
      params: {
        status: filters?.status,
        check_name: filters?.checkName,
        calendar_id: filters?.calendarId,
      },
    })
    return response.data
  },

  async createSchedulingResilienceCheck(
    request: CreateSchedulingResilienceCheckRequest,
  ): Promise<SchedulingResilienceCheckRecord> {
    const response = await api.post('/scheduling/resilience-checks', request)
    return response.data
  },

  async updateSchedulingResilienceCheck(
    resilienceCheckId: string,
    request: UpdateSchedulingResilienceCheckRequest,
  ): Promise<SchedulingResilienceCheckRecord> {
    const response = await api.put(`/scheduling/resilience-checks/${resilienceCheckId}`, request)
    return response.data
  },

  async listSchedulingBenchmarkChecks(filters?: {
    status?: SchedulingBenchmarkCheckStatus
    benchmarkName?: string
    calendarId?: string
  }): Promise<SchedulingBenchmarkChecksResponse> {
    const response = await api.get('/scheduling/benchmarks', {
      params: {
        status: filters?.status,
        benchmark_name: filters?.benchmarkName,
        calendar_id: filters?.calendarId,
      },
    })
    return response.data
  },

  async createSchedulingBenchmarkCheck(
    request: CreateSchedulingBenchmarkCheckRequest,
  ): Promise<SchedulingBenchmarkCheckRecord> {
    const response = await api.post('/scheduling/benchmarks', request)
    return response.data
  },

  async updateSchedulingBenchmarkCheck(
    benchmarkCheckId: string,
    request: UpdateSchedulingBenchmarkCheckRequest,
  ): Promise<SchedulingBenchmarkCheckRecord> {
    const response = await api.put(`/scheduling/benchmarks/${benchmarkCheckId}`, request)
    return response.data
  },

  async listSchedulingDiagnostics(filters?: {
    status?: SchedulingDiagnosticsStatus
    diagnosticName?: string
    calendarId?: string
  }): Promise<SchedulingDiagnosticsResponse> {
    const response = await api.get('/scheduling/diagnostics', {
      params: {
        status: filters?.status,
        diagnostic_name: filters?.diagnosticName,
        calendar_id: filters?.calendarId,
      },
    })
    return response.data
  },

  async createSchedulingDiagnosticsRecord(
    request: CreateSchedulingDiagnosticsRequest,
  ): Promise<SchedulingDiagnosticsRecord> {
    const response = await api.post('/scheduling/diagnostics', request)
    return response.data
  },

  async updateSchedulingDiagnosticsRecord(
    diagnosticsRecordId: string,
    request: UpdateSchedulingDiagnosticsRequest,
  ): Promise<SchedulingDiagnosticsRecord> {
    const response = await api.put(`/scheduling/diagnostics/${diagnosticsRecordId}`, request)
    return response.data
  },
}
