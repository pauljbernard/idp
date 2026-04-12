import { api } from './iamHttpClient';
export const legacyCrmApi = {
    async getCrmAdminSummary() {
        const response = await api.get('/crm/admin/summary');
        return response.data;
    },
    async getCrmMigrationStatus() {
        const response = await api.get('/crm/admin/migration-status');
        return response.data;
    },
    async executeCrmCutoverAction(payload) {
        const response = await api.post('/crm/admin/cutover-actions', payload);
        return response.data;
    },
    async listCrmOperationJobs() {
        const response = await api.get('/crm/admin/operation-jobs');
        return response.data;
    },
    async listCrmCustomers() {
        const response = await api.get('/crm/customers');
        return response.data;
    },
    async getCrmCustomer(customerId) {
        const response = await api.get(`/crm/customers/${customerId}`);
        return response.data;
    },
    async createCrmCustomer(payload) {
        const response = await api.post('/crm/customers', payload);
        return response.data;
    },
    async updateCrmCustomer(customerId, payload) {
        const response = await api.put(`/crm/customers/${customerId}`, payload);
        return response.data;
    },
    async listCrmRelationships() {
        const response = await api.get('/crm/relationships');
        return response.data;
    },
    async createCrmRelationship(payload) {
        const response = await api.post('/crm/relationships', payload);
        return response.data;
    },
    async updateCrmRelationship(relationshipId, payload) {
        const response = await api.put(`/crm/relationships/${relationshipId}`, payload);
        return response.data;
    },
    async getCrmHierarchy(customerId) {
        const response = await api.get(`/crm/hierarchy/${customerId}`);
        return response.data;
    },
    async listCrmLeads(filters = {}) {
        const response = await api.get('/crm/leads', {
            params: {
                status: filters.status,
                source: filters.source,
                owner_user_id: filters.ownerUserId,
            },
        });
        return response.data;
    },
    async getCrmLead(leadId) {
        const response = await api.get(`/crm/leads/${leadId}`);
        return response.data;
    },
    async createCrmLead(payload) {
        const response = await api.post('/crm/leads', payload);
        return response.data;
    },
    async updateCrmLead(leadId, payload) {
        const response = await api.put(`/crm/leads/${leadId}`, payload);
        return response.data;
    },
    async convertCrmLead(leadId, payload = {}) {
        const response = await api.post(`/crm/leads/${leadId}/convert`, payload);
        return response.data;
    },
    async listCrmOpportunities(filters = {}) {
        const response = await api.get('/crm/opportunities', {
            params: {
                customer_id: filters.customerId,
                lead_id: filters.leadId,
                stage: filters.stage,
                owner_user_id: filters.ownerUserId,
            },
        });
        return response.data;
    },
    async getCrmOpportunity(opportunityId) {
        const response = await api.get(`/crm/opportunities/${opportunityId}`);
        return response.data;
    },
    async createCrmOpportunity(payload) {
        const response = await api.post('/crm/opportunities', payload);
        return response.data;
    },
    async updateCrmOpportunity(opportunityId, payload) {
        const response = await api.put(`/crm/opportunities/${opportunityId}`, payload);
        return response.data;
    },
    async listCrmActivities(filters = {}) {
        const response = await api.get('/crm/activities', {
            params: {
                customer_id: filters.customerId,
                lead_id: filters.leadId,
                opportunity_id: filters.opportunityId,
            },
        });
        return response.data;
    },
    async createCrmActivity(payload) {
        const response = await api.post('/crm/activities', payload);
        return response.data;
    },
    async listCrmTasks(filters = {}) {
        const response = await api.get('/crm/tasks', {
            params: {
                status: filters.status,
                assignee_user_id: filters.assigneeUserId,
                customer_id: filters.customerId,
                lead_id: filters.leadId,
                opportunity_id: filters.opportunityId,
            },
        });
        return response.data;
    },
    async getCrmTask(taskId) {
        const response = await api.get(`/crm/tasks/${taskId}`);
        return response.data;
    },
    async createCrmTask(payload) {
        const response = await api.post('/crm/tasks', payload);
        return response.data;
    },
    async updateCrmTask(taskId, payload) {
        const response = await api.put(`/crm/tasks/${taskId}`, payload);
        return response.data;
    },
    async listCrmCaseQueues() {
        const response = await api.get('/crm/case-queues');
        return response.data;
    },
    async createCrmCaseQueue(payload) {
        const response = await api.post('/crm/case-queues', payload);
        return response.data;
    },
    async updateCrmCaseQueue(queueId, payload) {
        const response = await api.put(`/crm/case-queues/${queueId}`, payload);
        return response.data;
    },
    async listCrmCases(filters = {}) {
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
        });
        return response.data;
    },
    async getCrmCase(caseId) {
        const response = await api.get(`/crm/cases/${caseId}`);
        return response.data;
    },
    async createCrmCase(payload) {
        const response = await api.post('/crm/cases', payload);
        return response.data;
    },
    async updateCrmCase(caseId, payload) {
        const response = await api.put(`/crm/cases/${caseId}`, payload);
        return response.data;
    },
    async listCrmCaseSlaPolicies(filters = {}) {
        const response = await api.get('/crm/case-sla-policies', {
            params: {
                status: filters.status,
                queue_id: filters.queueId,
            },
        });
        return response.data;
    },
    async createCrmCaseSlaPolicy(payload) {
        const response = await api.post('/crm/case-sla-policies', payload);
        return response.data;
    },
    async updateCrmCaseSlaPolicy(policyId, payload) {
        const response = await api.put(`/crm/case-sla-policies/${policyId}`, payload);
        return response.data;
    },
    async listCrmCaseEscalations(filters = {}) {
        const response = await api.get('/crm/case-escalations', {
            params: {
                case_id: filters.caseId,
                status: filters.status,
            },
        });
        return response.data;
    },
    async createCrmCaseEscalation(payload) {
        const response = await api.post('/crm/case-escalations', payload);
        return response.data;
    },
    async updateCrmCaseEscalation(escalationId, payload) {
        const response = await api.put(`/crm/case-escalations/${escalationId}`, payload);
        return response.data;
    },
    async listCrmAutomationRules(filters = {}) {
        const response = await api.get('/crm/automation-rules', {
            params: {
                object_type: filters.objectType,
                status: filters.status,
            },
        });
        return response.data;
    },
    async createCrmAutomationRule(payload) {
        const response = await api.post('/crm/automation-rules', payload);
        return response.data;
    },
    async updateCrmAutomationRule(ruleId, payload) {
        const response = await api.put(`/crm/automation-rules/${ruleId}`, payload);
        return response.data;
    },
    async listCrmApprovalPolicies(filters = {}) {
        const response = await api.get('/crm/approval-policies', {
            params: {
                object_type: filters.objectType,
                status: filters.status,
            },
        });
        return response.data;
    },
    async createCrmApprovalPolicy(payload) {
        const response = await api.post('/crm/approval-policies', payload);
        return response.data;
    },
    async updateCrmApprovalPolicy(policyId, payload) {
        const response = await api.put(`/crm/approval-policies/${policyId}`, payload);
        return response.data;
    },
    async listCrmApprovalRequests(filters = {}) {
        const response = await api.get('/crm/approval-requests', {
            params: {
                status: filters.status,
                policy_id: filters.policyId,
                object_type: filters.objectType,
                object_id: filters.objectId,
            },
        });
        return response.data;
    },
    async createCrmApprovalRequest(payload) {
        const response = await api.post('/crm/approval-requests', payload);
        return response.data;
    },
    async updateCrmApprovalRequest(requestId, payload) {
        const response = await api.put(`/crm/approval-requests/${requestId}`, payload);
        return response.data;
    },
    async listCrmSharingRules(filters = {}) {
        const response = await api.get('/crm/sharing-rules', {
            params: {
                object_type: filters.objectType,
                status: filters.status,
                principal_type: filters.principalType,
                principal_id: filters.principalId,
            },
        });
        return response.data;
    },
    async createCrmSharingRule(payload) {
        const response = await api.post('/crm/sharing-rules', payload);
        return response.data;
    },
    async updateCrmSharingRule(ruleId, payload) {
        const response = await api.put(`/crm/sharing-rules/${ruleId}`, payload);
        return response.data;
    },
    async listCrmFieldGovernanceRules(filters = {}) {
        const response = await api.get('/crm/field-governance-rules', {
            params: {
                object_type: filters.objectType,
                status: filters.status,
                classification: filters.classification,
                field_name: filters.fieldName,
            },
        });
        return response.data;
    },
    async createCrmFieldGovernanceRule(payload) {
        const response = await api.post('/crm/field-governance-rules', payload);
        return response.data;
    },
    async updateCrmFieldGovernanceRule(ruleId, payload) {
        const response = await api.put(`/crm/field-governance-rules/${ruleId}`, payload);
        return response.data;
    },
    async listCrmGovernanceAuditEvents(filters = {}) {
        const response = await api.get('/crm/governance-audit-events', {
            params: {
                domain: filters.domain,
                entity_type: filters.entityType,
                entity_id: filters.entityId,
                limit: filters.limit,
            },
        });
        return response.data;
    },
    async listCrmForecastProjections(filters = {}) {
        const response = await api.get('/crm/forecast-projections', {
            params: {
                owner_user_id: filters.ownerUserId,
                stage: filters.stage,
                currency: filters.currency,
                include_closed: filters.includeClosed,
            },
        });
        return response.data;
    },
    async publishCrmForecastProjection(payload = {}) {
        const response = await api.post('/crm/forecast-projections/publish', payload);
        return response.data;
    },
    async listCrmForecastPublications() {
        const response = await api.get('/crm/forecast-publications');
        return response.data;
    },
    async listCrmWebhookSubscriptions(filters = {}) {
        const response = await api.get('/crm/webhook-subscriptions', {
            params: {
                status: filters.status,
                event_type: filters.eventType,
            },
        });
        return response.data;
    },
    async createCrmWebhookSubscription(payload) {
        const response = await api.post('/crm/webhook-subscriptions', payload);
        return response.data;
    },
    async updateCrmWebhookSubscription(subscriptionId, payload) {
        const response = await api.put(`/crm/webhook-subscriptions/${subscriptionId}`, payload);
        return response.data;
    },
    async listCrmOutboundEvents(filters = {}) {
        const response = await api.get('/crm/outbound-events', {
            params: {
                event_type: filters.eventType,
                entity_type: filters.entityType,
                entity_id: filters.entityId,
                subscription_id: filters.subscriptionId,
                limit: filters.limit,
            },
        });
        return response.data;
    },
    async publishCrmOutboundEvent(payload) {
        const response = await api.post('/crm/outbound-events', payload);
        return response.data;
    },
    async listCrmCampaignCoordinations(filters = {}) {
        const response = await api.get('/crm/campaign-coordinations', {
            params: {
                status: filters.status,
                communications_intent_key: filters.communicationsIntentKey,
            },
        });
        return response.data;
    },
    async createCrmCampaignCoordination(payload) {
        const response = await api.post('/crm/campaign-coordinations', payload);
        return response.data;
    },
    async updateCrmCampaignCoordination(coordinationId, payload) {
        const response = await api.put(`/crm/campaign-coordinations/${coordinationId}`, payload);
        return response.data;
    },
    async handoffCrmCampaignCoordination(coordinationId, payload = {}) {
        const response = await api.post(`/crm/campaign-coordinations/${coordinationId}/handoff`, payload);
        return response.data;
    },
    async listCrmLifecycleEvents(filters) {
        const response = await api.get('/crm/lifecycle-events', {
            params: {
                customer_id: filters?.customerId,
            },
        });
        return response.data;
    },
    async createCrmLifecycleEvent(payload) {
        const response = await api.post('/crm/lifecycle-events', payload);
        return response.data;
    },
    async updateCrmCustomerLifecycleState(customerId, payload) {
        const response = await api.put(`/crm/customers/${customerId}/lifecycle-state`, payload);
        return response.data;
    },
    async listCrmIdentityBindings() {
        const response = await api.get('/crm/identity-bindings');
        return response.data;
    },
    async createCrmIdentityBinding(payload) {
        const response = await api.post('/crm/identity-bindings', payload);
        return response.data;
    },
    async listCrmCommerceBindings() {
        const response = await api.get('/crm/commerce-bindings');
        return response.data;
    },
    async createCrmCommerceBinding(payload) {
        const response = await api.post('/crm/commerce-bindings', payload);
        return response.data;
    },
    async listCrmCommunicationContextBindings() {
        const response = await api.get('/crm/communication-context-bindings');
        return response.data;
    },
    async createCrmCommunicationContextBinding(payload) {
        const response = await api.post('/crm/communication-context-bindings', payload);
        return response.data;
    },
    async reconcileCrmBindings() {
        const response = await api.post('/crm/bindings/reconcile');
        return response.data;
    },
    async createCrmImportJob(payload = {}) {
        const response = await api.post('/crm/admin/imports', payload);
        return response.data;
    },
    async createCrmExportJob(payload = {}) {
        const response = await api.post('/crm/admin/exports', payload);
        return response.data;
    },
    async createCrmMergeJob(payload = {}) {
        const response = await api.post('/crm/admin/merge-jobs', payload);
        return response.data;
    },
    async getCrmMergeJob(jobId) {
        const response = await api.get(`/crm/admin/merge-jobs/${jobId}`);
        return response.data;
    },
};
