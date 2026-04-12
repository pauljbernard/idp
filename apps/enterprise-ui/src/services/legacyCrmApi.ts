import { api } from './iamHttpClient'
import type {
  ConvertCrmLeadRequest,
  ConvertCrmLeadResponse,
  CreateCrmActivityRequest,
  CreateCrmApprovalPolicyRequest,
  CreateCrmApprovalRequestRequest,
  CreateCrmAutomationRuleRequest,
  CreateCrmCampaignCoordinationRequest,
  CreateCrmCaseEscalationRequest,
  CreateCrmCaseQueueRequest,
  CreateCrmCaseRequest,
  CreateCrmCaseSlaPolicyRequest,
  CreateCrmCommerceBindingRequest,
  CreateCrmCommunicationContextBindingRequest,
  CreateCrmCustomerProfileRequest,
  CreateCrmFieldGovernanceRuleRequest,
  CreateCrmIdentityBindingRequest,
  CreateCrmLeadRequest,
  CreateCrmLifecycleEventRequest,
  CreateCrmOperationJobRequest,
  CreateCrmOpportunityRequest,
  CreateCrmRelationshipRequest,
  CreateCrmSharingRuleRequest,
  CreateCrmTaskRequest,
  CreateCrmWebhookSubscriptionRequest,
  CrmActivitiesResponse,
  CrmActivityListFilters,
  CrmAdminSummaryResponse,
  CrmApprovalPoliciesResponse,
  CrmApprovalPolicyListFilters,
  CrmApprovalRequestListFilters,
  CrmApprovalRequestsResponse,
  CrmAutomationRuleListFilters,
  CrmAutomationRulesResponse,
  CrmCampaignCoordinationListFilters,
  CrmCampaignCoordinationRecord,
  CrmCampaignCoordinationsResponse,
  CrmCaseEscalationListFilters,
  CrmCaseEscalationsResponse,
  CrmCaseListFilters,
  CrmCaseQueuesResponse,
  CrmCaseSlaPoliciesResponse,
  CrmCaseSlaPolicyListFilters,
  CrmCasesResponse,
  CrmCommerceBindingsResponse,
  CrmCommunicationContextBindingsResponse,
  CrmCustomerActivityRecord,
  CrmCustomerApprovalPolicyRecord,
  CrmCustomerApprovalRequestRecord,
  CrmCustomerAutomationRuleRecord,
  CrmCustomerCaseEscalationRecord,
  CrmCustomerCaseQueueRecord,
  CrmCustomerCaseRecord,
  CrmCustomerCaseSlaPolicyRecord,
  CrmCustomerCommerceBindingRecord,
  CrmCustomerCommunicationContextBindingRecord,
  CrmCustomerFieldGovernanceRuleRecord,
  CrmCustomerIdentityBindingRecord,
  CrmCustomerLeadRecord,
  CrmCustomerLifecycleEventRecord,
  CrmCustomerOperationJobRecord,
  CrmCustomerOpportunityRecord,
  CrmCustomerProfileRecord,
  CrmCustomerRelationshipRecord,
  CrmCustomerSharingRuleRecord,
  CrmCustomerTaskRecord,
  CrmCustomersResponse,
  CrmCutoverActionRequest,
  CrmCutoverActionResponse,
  CrmFieldGovernanceRuleListFilters,
  CrmFieldGovernanceRulesResponse,
  CrmForecastProjectionListFilters,
  CrmForecastProjectionsResponse,
  CrmForecastPublicationRecord,
  CrmForecastPublicationsResponse,
  CrmGovernanceAuditEventListFilters,
  CrmGovernanceAuditEventsResponse,
  CrmHierarchyResponse,
  CrmIdentityBindingsResponse,
  CrmLeadListFilters,
  CrmLeadsResponse,
  CrmLifecycleEventsResponse,
  CrmMigrationStatusResponse,
  CrmOperationJobsResponse,
  CrmOpportunitiesResponse,
  CrmOpportunityListFilters,
  CrmOutboundEventListFilters,
  CrmOutboundEventRecord,
  CrmOutboundEventsResponse,
  CrmRelationshipsResponse,
  CrmSharingRuleListFilters,
  CrmSharingRulesResponse,
  CrmTaskListFilters,
  CrmTasksResponse,
  CrmWebhookSubscriptionListFilters,
  CrmWebhookSubscriptionRecord,
  CrmWebhookSubscriptionsResponse,
  HandoffCrmCampaignCoordinationRequest,
  PublishCrmForecastProjectionRequest,
  PublishCrmOutboundEventRequest,
  UpdateCrmApprovalPolicyRequest,
  UpdateCrmApprovalRequestRequest,
  UpdateCrmAutomationRuleRequest,
  UpdateCrmCampaignCoordinationRequest,
  UpdateCrmCaseEscalationRequest,
  UpdateCrmCaseQueueRequest,
  UpdateCrmCaseRequest,
  UpdateCrmCaseSlaPolicyRequest,
  UpdateCrmCustomerProfileRequest,
  UpdateCrmFieldGovernanceRuleRequest,
  UpdateCrmLeadRequest,
  UpdateCrmLifecycleStateRequest,
  UpdateCrmOpportunityRequest,
  UpdateCrmRelationshipRequest,
  UpdateCrmSharingRuleRequest,
  UpdateCrmTaskRequest,
  UpdateCrmWebhookSubscriptionRequest,
} from './legacyCrmTypes'

export const legacyCrmApi = {
  async getCrmAdminSummary(): Promise<CrmAdminSummaryResponse> {
    const response = await api.get('/crm/admin/summary')
    return response.data
  },

  async getCrmMigrationStatus(): Promise<CrmMigrationStatusResponse> {
    const response = await api.get('/crm/admin/migration-status')
    return response.data
  },

  async executeCrmCutoverAction(payload: CrmCutoverActionRequest): Promise<CrmCutoverActionResponse> {
    const response = await api.post('/crm/admin/cutover-actions', payload)
    return response.data
  },

  async listCrmOperationJobs(): Promise<CrmOperationJobsResponse> {
    const response = await api.get('/crm/admin/operation-jobs')
    return response.data
  },

  async listCrmCustomers(): Promise<CrmCustomersResponse> {
    const response = await api.get('/crm/customers')
    return response.data
  },

  async getCrmCustomer(customerId: string): Promise<CrmCustomerProfileRecord> {
    const response = await api.get(`/crm/customers/${customerId}`)
    return response.data
  },

  async createCrmCustomer(payload: CreateCrmCustomerProfileRequest): Promise<CrmCustomerProfileRecord> {
    const response = await api.post('/crm/customers', payload)
    return response.data
  },

  async updateCrmCustomer(customerId: string, payload: UpdateCrmCustomerProfileRequest): Promise<CrmCustomerProfileRecord> {
    const response = await api.put(`/crm/customers/${customerId}`, payload)
    return response.data
  },

  async listCrmRelationships(): Promise<CrmRelationshipsResponse> {
    const response = await api.get('/crm/relationships')
    return response.data
  },

  async createCrmRelationship(payload: CreateCrmRelationshipRequest): Promise<CrmCustomerRelationshipRecord> {
    const response = await api.post('/crm/relationships', payload)
    return response.data
  },

  async updateCrmRelationship(
    relationshipId: string,
    payload: UpdateCrmRelationshipRequest,
  ): Promise<CrmCustomerRelationshipRecord> {
    const response = await api.put(`/crm/relationships/${relationshipId}`, payload)
    return response.data
  },

  async getCrmHierarchy(customerId: string): Promise<CrmHierarchyResponse> {
    const response = await api.get(`/crm/hierarchy/${customerId}`)
    return response.data
  },

  async listCrmLeads(filters: CrmLeadListFilters = {}): Promise<CrmLeadsResponse> {
    const response = await api.get('/crm/leads', {
      params: {
        status: filters.status,
        source: filters.source,
        owner_user_id: filters.ownerUserId,
      },
    })
    return response.data
  },

  async getCrmLead(leadId: string): Promise<CrmCustomerLeadRecord> {
    const response = await api.get(`/crm/leads/${leadId}`)
    return response.data
  },

  async createCrmLead(payload: CreateCrmLeadRequest): Promise<CrmCustomerLeadRecord> {
    const response = await api.post('/crm/leads', payload)
    return response.data
  },

  async updateCrmLead(leadId: string, payload: UpdateCrmLeadRequest): Promise<CrmCustomerLeadRecord> {
    const response = await api.put(`/crm/leads/${leadId}`, payload)
    return response.data
  },

  async convertCrmLead(leadId: string, payload: ConvertCrmLeadRequest = {}): Promise<ConvertCrmLeadResponse> {
    const response = await api.post(`/crm/leads/${leadId}/convert`, payload)
    return response.data
  },

  async listCrmOpportunities(filters: CrmOpportunityListFilters = {}): Promise<CrmOpportunitiesResponse> {
    const response = await api.get('/crm/opportunities', {
      params: {
        customer_id: filters.customerId,
        lead_id: filters.leadId,
        stage: filters.stage,
        owner_user_id: filters.ownerUserId,
      },
    })
    return response.data
  },

  async getCrmOpportunity(opportunityId: string): Promise<CrmCustomerOpportunityRecord> {
    const response = await api.get(`/crm/opportunities/${opportunityId}`)
    return response.data
  },

  async createCrmOpportunity(payload: CreateCrmOpportunityRequest): Promise<CrmCustomerOpportunityRecord> {
    const response = await api.post('/crm/opportunities', payload)
    return response.data
  },

  async updateCrmOpportunity(
    opportunityId: string,
    payload: UpdateCrmOpportunityRequest,
  ): Promise<CrmCustomerOpportunityRecord> {
    const response = await api.put(`/crm/opportunities/${opportunityId}`, payload)
    return response.data
  },

  async listCrmActivities(filters: CrmActivityListFilters = {}): Promise<CrmActivitiesResponse> {
    const response = await api.get('/crm/activities', {
      params: {
        customer_id: filters.customerId,
        lead_id: filters.leadId,
        opportunity_id: filters.opportunityId,
      },
    })
    return response.data
  },

  async createCrmActivity(payload: CreateCrmActivityRequest): Promise<CrmCustomerActivityRecord> {
    const response = await api.post('/crm/activities', payload)
    return response.data
  },

  async listCrmTasks(filters: CrmTaskListFilters = {}): Promise<CrmTasksResponse> {
    const response = await api.get('/crm/tasks', {
      params: {
        status: filters.status,
        assignee_user_id: filters.assigneeUserId,
        customer_id: filters.customerId,
        lead_id: filters.leadId,
        opportunity_id: filters.opportunityId,
      },
    })
    return response.data
  },

  async getCrmTask(taskId: string): Promise<CrmCustomerTaskRecord> {
    const response = await api.get(`/crm/tasks/${taskId}`)
    return response.data
  },

  async createCrmTask(payload: CreateCrmTaskRequest): Promise<CrmCustomerTaskRecord> {
    const response = await api.post('/crm/tasks', payload)
    return response.data
  },

  async updateCrmTask(taskId: string, payload: UpdateCrmTaskRequest): Promise<CrmCustomerTaskRecord> {
    const response = await api.put(`/crm/tasks/${taskId}`, payload)
    return response.data
  },

  async listCrmCaseQueues(): Promise<CrmCaseQueuesResponse> {
    const response = await api.get('/crm/case-queues')
    return response.data
  },

  async createCrmCaseQueue(payload: CreateCrmCaseQueueRequest): Promise<CrmCustomerCaseQueueRecord> {
    const response = await api.post('/crm/case-queues', payload)
    return response.data
  },

  async updateCrmCaseQueue(
    queueId: string,
    payload: UpdateCrmCaseQueueRequest,
  ): Promise<CrmCustomerCaseQueueRecord> {
    const response = await api.put(`/crm/case-queues/${queueId}`, payload)
    return response.data
  },

  async listCrmCases(filters: CrmCaseListFilters = {}): Promise<CrmCasesResponse> {
    const response = await api.get('/crm/cases', {
      params: {
        status: filters.status,
        priority: filters.priority,
        severity: filters.severity,
        queue_id: filters.queueId,
        owner_user_id: filters.ownerUserId,
        customer_id: filters.customerId,
        breached_only: filters.breachedOnly,
      },
    })
    return response.data
  },

  async getCrmCase(caseId: string): Promise<CrmCustomerCaseRecord> {
    const response = await api.get(`/crm/cases/${caseId}`)
    return response.data
  },

  async createCrmCase(payload: CreateCrmCaseRequest): Promise<CrmCustomerCaseRecord> {
    const response = await api.post('/crm/cases', payload)
    return response.data
  },

  async updateCrmCase(caseId: string, payload: UpdateCrmCaseRequest): Promise<CrmCustomerCaseRecord> {
    const response = await api.put(`/crm/cases/${caseId}`, payload)
    return response.data
  },

  async listCrmCaseSlaPolicies(filters: CrmCaseSlaPolicyListFilters = {}): Promise<CrmCaseSlaPoliciesResponse> {
    const response = await api.get('/crm/case-sla-policies', {
      params: {
        status: filters.status,
        queue_id: filters.queueId,
      },
    })
    return response.data
  },

  async createCrmCaseSlaPolicy(payload: CreateCrmCaseSlaPolicyRequest): Promise<CrmCustomerCaseSlaPolicyRecord> {
    const response = await api.post('/crm/case-sla-policies', payload)
    return response.data
  },

  async updateCrmCaseSlaPolicy(
    policyId: string,
    payload: UpdateCrmCaseSlaPolicyRequest,
  ): Promise<CrmCustomerCaseSlaPolicyRecord> {
    const response = await api.put(`/crm/case-sla-policies/${policyId}`, payload)
    return response.data
  },

  async listCrmCaseEscalations(filters: CrmCaseEscalationListFilters = {}): Promise<CrmCaseEscalationsResponse> {
    const response = await api.get('/crm/case-escalations', {
      params: {
        case_id: filters.caseId,
        status: filters.status,
      },
    })
    return response.data
  },

  async createCrmCaseEscalation(payload: CreateCrmCaseEscalationRequest): Promise<CrmCustomerCaseEscalationRecord> {
    const response = await api.post('/crm/case-escalations', payload)
    return response.data
  },

  async updateCrmCaseEscalation(
    escalationId: string,
    payload: UpdateCrmCaseEscalationRequest,
  ): Promise<CrmCustomerCaseEscalationRecord> {
    const response = await api.put(`/crm/case-escalations/${escalationId}`, payload)
    return response.data
  },

  async listCrmAutomationRules(filters: CrmAutomationRuleListFilters = {}): Promise<CrmAutomationRulesResponse> {
    const response = await api.get('/crm/automation-rules', {
      params: {
        object_type: filters.objectType,
        status: filters.status,
      },
    })
    return response.data
  },

  async createCrmAutomationRule(payload: CreateCrmAutomationRuleRequest): Promise<CrmCustomerAutomationRuleRecord> {
    const response = await api.post('/crm/automation-rules', payload)
    return response.data
  },

  async updateCrmAutomationRule(
    ruleId: string,
    payload: UpdateCrmAutomationRuleRequest,
  ): Promise<CrmCustomerAutomationRuleRecord> {
    const response = await api.put(`/crm/automation-rules/${ruleId}`, payload)
    return response.data
  },

  async listCrmApprovalPolicies(filters: CrmApprovalPolicyListFilters = {}): Promise<CrmApprovalPoliciesResponse> {
    const response = await api.get('/crm/approval-policies', {
      params: {
        object_type: filters.objectType,
        status: filters.status,
      },
    })
    return response.data
  },

  async createCrmApprovalPolicy(payload: CreateCrmApprovalPolicyRequest): Promise<CrmCustomerApprovalPolicyRecord> {
    const response = await api.post('/crm/approval-policies', payload)
    return response.data
  },

  async updateCrmApprovalPolicy(
    policyId: string,
    payload: UpdateCrmApprovalPolicyRequest,
  ): Promise<CrmCustomerApprovalPolicyRecord> {
    const response = await api.put(`/crm/approval-policies/${policyId}`, payload)
    return response.data
  },

  async listCrmApprovalRequests(filters: CrmApprovalRequestListFilters = {}): Promise<CrmApprovalRequestsResponse> {
    const response = await api.get('/crm/approval-requests', {
      params: {
        status: filters.status,
        policy_id: filters.policyId,
        object_type: filters.objectType,
        object_id: filters.objectId,
      },
    })
    return response.data
  },

  async createCrmApprovalRequest(payload: CreateCrmApprovalRequestRequest): Promise<CrmCustomerApprovalRequestRecord> {
    const response = await api.post('/crm/approval-requests', payload)
    return response.data
  },

  async updateCrmApprovalRequest(
    requestId: string,
    payload: UpdateCrmApprovalRequestRequest,
  ): Promise<CrmCustomerApprovalRequestRecord> {
    const response = await api.put(`/crm/approval-requests/${requestId}`, payload)
    return response.data
  },

  async listCrmSharingRules(filters: CrmSharingRuleListFilters = {}): Promise<CrmSharingRulesResponse> {
    const response = await api.get('/crm/sharing-rules', {
      params: {
        object_type: filters.objectType,
        status: filters.status,
        principal_type: filters.principalType,
        principal_id: filters.principalId,
      },
    })
    return response.data
  },

  async createCrmSharingRule(payload: CreateCrmSharingRuleRequest): Promise<CrmCustomerSharingRuleRecord> {
    const response = await api.post('/crm/sharing-rules', payload)
    return response.data
  },

  async updateCrmSharingRule(ruleId: string, payload: UpdateCrmSharingRuleRequest): Promise<CrmCustomerSharingRuleRecord> {
    const response = await api.put(`/crm/sharing-rules/${ruleId}`, payload)
    return response.data
  },

  async listCrmFieldGovernanceRules(
    filters: CrmFieldGovernanceRuleListFilters = {},
  ): Promise<CrmFieldGovernanceRulesResponse> {
    const response = await api.get('/crm/field-governance-rules', {
      params: {
        object_type: filters.objectType,
        status: filters.status,
        classification: filters.classification,
        field_name: filters.fieldName,
      },
    })
    return response.data
  },

  async createCrmFieldGovernanceRule(
    payload: CreateCrmFieldGovernanceRuleRequest,
  ): Promise<CrmCustomerFieldGovernanceRuleRecord> {
    const response = await api.post('/crm/field-governance-rules', payload)
    return response.data
  },

  async updateCrmFieldGovernanceRule(
    ruleId: string,
    payload: UpdateCrmFieldGovernanceRuleRequest,
  ): Promise<CrmCustomerFieldGovernanceRuleRecord> {
    const response = await api.put(`/crm/field-governance-rules/${ruleId}`, payload)
    return response.data
  },

  async listCrmGovernanceAuditEvents(
    filters: CrmGovernanceAuditEventListFilters = {},
  ): Promise<CrmGovernanceAuditEventsResponse> {
    const response = await api.get('/crm/governance-audit-events', {
      params: {
        domain: filters.domain,
        entity_type: filters.entityType,
        entity_id: filters.entityId,
        limit: filters.limit,
      },
    })
    return response.data
  },

  async listCrmForecastProjections(
    filters: CrmForecastProjectionListFilters = {},
  ): Promise<CrmForecastProjectionsResponse> {
    const response = await api.get('/crm/forecast-projections', {
      params: {
        owner_user_id: filters.ownerUserId,
        stage: filters.stage,
        currency: filters.currency,
        include_closed: filters.includeClosed,
      },
    })
    return response.data
  },

  async publishCrmForecastProjection(
    payload: PublishCrmForecastProjectionRequest = {},
  ): Promise<CrmForecastPublicationRecord> {
    const response = await api.post('/crm/forecast-projections/publish', payload)
    return response.data
  },

  async listCrmForecastPublications(): Promise<CrmForecastPublicationsResponse> {
    const response = await api.get('/crm/forecast-publications')
    return response.data
  },

  async listCrmWebhookSubscriptions(
    filters: CrmWebhookSubscriptionListFilters = {},
  ): Promise<CrmWebhookSubscriptionsResponse> {
    const response = await api.get('/crm/webhook-subscriptions', {
      params: {
        status: filters.status,
        event_type: filters.eventType,
      },
    })
    return response.data
  },

  async createCrmWebhookSubscription(
    payload: CreateCrmWebhookSubscriptionRequest,
  ): Promise<CrmWebhookSubscriptionRecord> {
    const response = await api.post('/crm/webhook-subscriptions', payload)
    return response.data
  },

  async updateCrmWebhookSubscription(
    subscriptionId: string,
    payload: UpdateCrmWebhookSubscriptionRequest,
  ): Promise<CrmWebhookSubscriptionRecord> {
    const response = await api.put(`/crm/webhook-subscriptions/${subscriptionId}`, payload)
    return response.data
  },

  async listCrmOutboundEvents(filters: CrmOutboundEventListFilters = {}): Promise<CrmOutboundEventsResponse> {
    const response = await api.get('/crm/outbound-events', {
      params: {
        event_type: filters.eventType,
        entity_type: filters.entityType,
        entity_id: filters.entityId,
        subscription_id: filters.subscriptionId,
        limit: filters.limit,
      },
    })
    return response.data
  },

  async publishCrmOutboundEvent(payload: PublishCrmOutboundEventRequest): Promise<CrmOutboundEventRecord> {
    const response = await api.post('/crm/outbound-events', payload)
    return response.data
  },

  async listCrmCampaignCoordinations(
    filters: CrmCampaignCoordinationListFilters = {},
  ): Promise<CrmCampaignCoordinationsResponse> {
    const response = await api.get('/crm/campaign-coordinations', {
      params: {
        status: filters.status,
        communications_intent_key: filters.communicationsIntentKey,
      },
    })
    return response.data
  },

  async createCrmCampaignCoordination(
    payload: CreateCrmCampaignCoordinationRequest,
  ): Promise<CrmCampaignCoordinationRecord> {
    const response = await api.post('/crm/campaign-coordinations', payload)
    return response.data
  },

  async updateCrmCampaignCoordination(
    coordinationId: string,
    payload: UpdateCrmCampaignCoordinationRequest,
  ): Promise<CrmCampaignCoordinationRecord> {
    const response = await api.put(`/crm/campaign-coordinations/${coordinationId}`, payload)
    return response.data
  },

  async handoffCrmCampaignCoordination(
    coordinationId: string,
    payload: HandoffCrmCampaignCoordinationRequest = {},
  ): Promise<CrmCampaignCoordinationRecord> {
    const response = await api.post(`/crm/campaign-coordinations/${coordinationId}/handoff`, payload)
    return response.data
  },

  async listCrmLifecycleEvents(filters?: { customerId?: string }): Promise<CrmLifecycleEventsResponse> {
    const response = await api.get('/crm/lifecycle-events', {
      params: {
        customer_id: filters?.customerId,
      },
    })
    return response.data
  },

  async createCrmLifecycleEvent(payload: CreateCrmLifecycleEventRequest): Promise<CrmCustomerLifecycleEventRecord> {
    const response = await api.post('/crm/lifecycle-events', payload)
    return response.data
  },

  async updateCrmCustomerLifecycleState(
    customerId: string,
    payload: UpdateCrmLifecycleStateRequest,
  ): Promise<CrmCustomerLifecycleEventRecord> {
    const response = await api.put(`/crm/customers/${customerId}/lifecycle-state`, payload)
    return response.data
  },

  async listCrmIdentityBindings(): Promise<CrmIdentityBindingsResponse> {
    const response = await api.get('/crm/identity-bindings')
    return response.data
  },

  async createCrmIdentityBinding(payload: CreateCrmIdentityBindingRequest): Promise<CrmCustomerIdentityBindingRecord> {
    const response = await api.post('/crm/identity-bindings', payload)
    return response.data
  },

  async listCrmCommerceBindings(): Promise<CrmCommerceBindingsResponse> {
    const response = await api.get('/crm/commerce-bindings')
    return response.data
  },

  async createCrmCommerceBinding(payload: CreateCrmCommerceBindingRequest): Promise<CrmCustomerCommerceBindingRecord> {
    const response = await api.post('/crm/commerce-bindings', payload)
    return response.data
  },

  async listCrmCommunicationContextBindings(): Promise<CrmCommunicationContextBindingsResponse> {
    const response = await api.get('/crm/communication-context-bindings')
    return response.data
  },

  async createCrmCommunicationContextBinding(
    payload: CreateCrmCommunicationContextBindingRequest,
  ): Promise<CrmCustomerCommunicationContextBindingRecord> {
    const response = await api.post('/crm/communication-context-bindings', payload)
    return response.data
  },

  async reconcileCrmBindings(): Promise<CrmCustomerOperationJobRecord> {
    const response = await api.post('/crm/bindings/reconcile')
    return response.data
  },

  async createCrmImportJob(payload: CreateCrmOperationJobRequest = {}): Promise<CrmCustomerOperationJobRecord> {
    const response = await api.post('/crm/admin/imports', payload)
    return response.data
  },

  async createCrmExportJob(payload: CreateCrmOperationJobRequest = {}): Promise<CrmCustomerOperationJobRecord> {
    const response = await api.post('/crm/admin/exports', payload)
    return response.data
  },

  async createCrmMergeJob(payload: CreateCrmOperationJobRequest = {}): Promise<CrmCustomerOperationJobRecord> {
    const response = await api.post('/crm/admin/merge-jobs', payload)
    return response.data
  },

  async getCrmMergeJob(jobId: string): Promise<CrmCustomerOperationJobRecord> {
    const response = await api.get(`/crm/admin/merge-jobs/${jobId}`)
    return response.data
  },
}
