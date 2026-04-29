import { api } from './iamHttpClient';
function syncMissionAliases(mission) {
    return {
        ...mission,
        assigned_specialist: mission.assigned_specialist ?? mission.assigned_pilot,
        assigned_resource: mission.assigned_resource ?? mission.assigned_aircraft,
    };
}
function syncMissionListAliases(missions) {
    return missions.map((mission) => syncMissionAliases(mission));
}
function syncMissionSeriesAliases(summary) {
    return {
        ...summary,
        assigned_specialist: summary.assigned_specialist ?? summary.assigned_pilot,
        assigned_resource: summary.assigned_resource ?? summary.assigned_aircraft,
    };
}
function normalizeFleetAircraftCreateRequest(request) {
    return {
        ...request,
        aircraft_name: request.resource_name ?? request.aircraft_name,
        aircraft_type: request.resource_type ?? request.aircraft_type,
        assigned_pilot: request.assigned_specialist ?? request.assigned_pilot,
    };
}
function normalizeMissionCreateRequest(request) {
    return {
        ...request,
        pilot_id: request.specialist_id ?? request.pilot_id,
        aircraft_id: request.resource_id ?? request.aircraft_id,
    };
}
function syncFleetAircraftAliases(aircraft) {
    return {
        ...aircraft,
        assignedSpecialist: aircraft.assignedSpecialist ?? aircraft.assignedPilot,
    };
}
function syncFleetAircraftListAliases(aircraft) {
    return aircraft.map((entry) => syncFleetAircraftAliases(entry));
}
function normalizeFleetGroupRequest(request) {
    return {
        ...request,
        aircraft_ids: request.resource_ids ?? request.aircraft_ids,
    };
}
function normalizeFleetListRequest(request) {
    return {
        ...request,
        group_id: request.resource_group_id ?? request.group_id,
    };
}
function syncFleetGroupAliases(group) {
    return {
        ...group,
        resource_ids: group.resource_ids ?? group.aircraft_ids,
        resource_count: group.resource_count ?? group.aircraft_count,
        operational_resource_count: group.operational_resource_count ?? group.operational_aircraft_count,
    };
}
function syncFleetGroupListAliases(response) {
    return {
        ...response,
        groups: response.groups.map((group) => syncFleetGroupAliases(group)),
        summary: {
            ...response.summary,
            total_resources_in_groups: response.summary.total_resources_in_groups ?? response.summary.total_aircraft_in_groups,
            operational_resources_in_groups: response.summary.operational_resources_in_groups ?? response.summary.operational_aircraft_in_groups,
            groups_with_unavailable_resources: response.summary.groups_with_unavailable_resources ?? response.summary.groups_with_inactive_aircraft,
        },
    };
}
function syncFleetListAliases(response) {
    const aircraft = syncFleetAircraftListAliases(response.aircraft);
    return {
        ...response,
        aircraft,
        resources: response.resources ?? aircraft,
        summary: {
            ...response.summary,
            total_resources: response.summary.total_resources ?? response.summary.total_aircraft,
            operational_resources: response.summary.operational_resources ?? response.summary.operational_aircraft,
            service_or_unavailable_resources: response.summary.service_or_unavailable_resources ?? response.summary.service_or_grounded_aircraft,
            grouped_resources: response.summary.grouped_resources ?? response.summary.grouped_aircraft,
            ungrouped_resources: response.summary.ungrouped_resources ?? response.summary.ungrouped_aircraft,
            groups_with_unavailable_resources: response.summary.groups_with_unavailable_resources ?? response.summary.groups_with_inactive_aircraft,
        },
    };
}
function syncMissionListResponseAliases(response) {
    const missions = syncMissionListAliases(response.missions);
    return {
        ...response,
        missions,
        workflows: response.workflows ?? missions,
    };
}
function syncMissionRevisionResponseAliases(response) {
    return {
        ...response,
        workflow_id: response.workflow_id ?? response.mission_id,
    };
}
function syncMissionLifecycleResponseAliases(response) {
    return {
        ...response,
        workflow_id: response.workflow_id ?? response.mission_id,
    };
}
function normalizeTelemetryIngestRequest(request) {
    return {
        ...request,
        aircraft_id: request.resource_id ?? request.aircraft_id,
        mission_id: request.workflow_id ?? request.mission_id,
    };
}
function syncMunicipalOperationsSummaryAliases(summary) {
    return {
        ...summary,
        stats: {
            ...summary.stats,
            linked_workflows: summary.stats.linked_workflows ?? summary.stats.linked_missions,
        },
    };
}
function syncMunicipalWorkOrderAliases(workOrder) {
    return {
        ...workOrder,
        workflow_id: workOrder.workflow_id ?? workOrder.mission_id,
    };
}
function syncMunicipalWorkOrderListAliases(response) {
    return {
        ...response,
        work_orders: response.work_orders.map((workOrder) => syncMunicipalWorkOrderAliases(workOrder)),
    };
}
function syncCommandCenterSummaryAliases(summary) {
    return {
        ...summary,
        posture: {
            ...summary.posture,
            active_workflows: summary.posture.active_workflows ?? summary.posture.active_missions,
            active_resources: summary.posture.active_resources ?? summary.posture.in_flight_aircraft,
        },
    };
}
function syncLiveTelemetryAliases(record) {
    return {
        ...record,
        resource_id: record.resource_id ?? record.aircraft_id,
        workflow_id: record.workflow_id ?? record.mission_id,
    };
}
function syncLiveOperationsTimelineAliases(response) {
    return {
        ...response,
        items: response.items.map((item) => ({
            ...item,
            related_resource_id: item.related_resource_id ?? item.related_aircraft_id,
            related_workflow_id: item.related_workflow_id ?? item.related_mission_id,
        })),
    };
}
function syncLiveOperationsReplayAliases(response) {
    return {
        ...response,
        buckets: response.buckets.map((bucket) => ({
            ...bucket,
            active_resources: bucket.active_resources ?? bucket.active_aircraft,
            active_workflows: bucket.active_workflows ?? bucket.active_missions,
        })),
    };
}
function syncDashboardSummaryAliases(summary) {
    return {
        ...summary,
        stats: {
            ...summary.stats,
            active_workflows: summary.stats.active_workflows ?? summary.stats.active_missions,
            ready_resources: summary.stats.ready_resources ?? summary.stats.ready_aircraft,
            total_resources: summary.stats.total_resources ?? summary.stats.total_aircraft,
        },
    };
}
export const legacyOperationsApi = {
    async getDashboardSummary() {
        const response = await api.get('/dashboard/summary');
        return syncDashboardSummaryAliases(response.data);
    },
    async getPlatformRuntimeMetrics(query = {}) {
        const response = await api.get('/platform/runtime-metrics', {
            params: {
                tenant_id: query.tenantId,
                source_subsystem: query.sourceSubsystem,
                target_subsystem: query.targetSubsystem,
                path_prefix: query.pathPrefix,
            },
        });
        return response.data;
    },
    async getCommandCenterSummary() {
        const response = await api.get('/command-center/summary');
        return syncCommandCenterSummaryAliases(response.data);
    },
    async ingestLiveTelemetry(payload) {
        const response = await api.post('/live-operations/telemetry', normalizeTelemetryIngestRequest(payload));
        return syncLiveTelemetryAliases(response.data);
    },
    async getLiveOperationsTimeline(params = {}) {
        const response = await api.get('/live-operations/timeline', { params });
        return syncLiveOperationsTimelineAliases(response.data);
    },
    async getLiveOperationsReplay(params = {}) {
        const response = await api.get('/live-operations/replay', { params });
        return syncLiveOperationsReplayAliases(response.data);
    },
    async getConstitutionalAiSummary() {
        const response = await api.get('/constitutional-ai/summary');
        return response.data;
    },
    async listDecisions(limit = 50) {
        const response = await api.get('/decisions', { params: { limit } });
        return response.data;
    },
    async getDecision(decisionId) {
        const response = await api.get(`/decisions/${decisionId}`);
        return response.data;
    },
    async listEvents(limit = 100) {
        const response = await api.get('/events', { params: { limit } });
        return response.data;
    },
    async listPartners() {
        const response = await api.get('/partners');
        return response.data;
    },
    async getPartnerSummary() {
        const response = await api.get('/partners/summary');
        return response.data;
    },
    async listPartnerEvents(limit = 10) {
        const response = await api.get('/partners/events', { params: { limit } });
        return response.data;
    },
    async listFleet(params = {}) {
        const response = await api.get('/fleet', { params: normalizeFleetListRequest(params) });
        return syncFleetListAliases(response.data);
    },
    async getFleetCatalog() {
        const response = await api.get('/fleet/catalog');
        return response.data;
    },
    async listFleetGroups(params = {}) {
        const response = await api.get('/fleet/groups', { params });
        return syncFleetGroupListAliases(response.data);
    },
    async createFleetGroup(request) {
        const response = await api.post('/fleet/groups', normalizeFleetGroupRequest(request));
        return syncFleetGroupAliases(response.data);
    },
    async updateFleetGroup(groupId, request) {
        const response = await api.patch(`/fleet/groups/${groupId}`, normalizeFleetGroupRequest(request));
        return syncFleetGroupAliases(response.data);
    },
    async addFleetMake(request) {
        const response = await api.post('/fleet/catalog/makes', request);
        return response.data;
    },
    async addFleetModel(request) {
        const response = await api.post('/fleet/catalog/models', request);
        return response.data;
    },
    async getAircraft(aircraftId) {
        const response = await api.get(`/fleet/${aircraftId}`);
        return syncFleetAircraftAliases(response.data);
    },
    async createAircraft(request) {
        const response = await api.post('/fleet', normalizeFleetAircraftCreateRequest(request));
        return syncFleetAircraftAliases(response.data);
    },
    async exportFleet(format = 'csv') {
        const response = await api.get('/fleet/export', { params: { format } });
        return response.data;
    },
    async listMissions() {
        const response = await api.get('/missions');
        return syncMissionListResponseAliases(response.data);
    },
    async listMissionTemplates(category) {
        const response = await api.get('/missions/templates', {
            params: category ? { category } : undefined,
        });
        return response.data;
    },
    async getMissionTemplate(templateId) {
        const response = await api.get(`/missions/templates/${templateId}`);
        return response.data;
    },
    async createMissionTemplate(request) {
        const response = await api.post('/missions/templates', request);
        return response.data;
    },
    async listMissionSeries() {
        const response = await api.get('/missions/series');
        return {
            ...response.data,
            series: response.data.series.map((summary) => syncMissionSeriesAliases(summary)),
        };
    },
    async createMission(request) {
        const response = await api.post('/missions', normalizeMissionCreateRequest(request));
        return {
            ...response.data,
            mission: syncMissionAliases(response.data.mission),
            generated_instances: syncMissionListAliases(response.data.generated_instances),
            recurrence_series: response.data.recurrence_series
                ? syncMissionSeriesAliases(response.data.recurrence_series)
                : null,
        };
    },
    async getMission(missionId) {
        const response = await api.get(`/missions/${missionId}`);
        return syncMissionAliases(response.data);
    },
    async listMissionRevisions(missionId) {
        const response = await api.get(`/missions/${missionId}/revisions`);
        return syncMissionRevisionResponseAliases(response.data);
    },
    async listMissionLifecycle(missionId) {
        const response = await api.get(`/missions/${missionId}/lifecycle`);
        return syncMissionLifecycleResponseAliases(response.data);
    },
    async updateMissionStatus(missionId, status, detail) {
        const response = await api.patch(`/missions/${missionId}/status`, { status, detail });
        return syncMissionAliases(response.data);
    },
    async duplicateMission(missionId) {
        const response = await api.post(`/missions/${missionId}/duplicate`);
        return syncMissionAliases(response.data);
    },
    async listResources(params = {}) {
        return this.listFleet(params);
    },
    async getResource(resourceId) {
        return this.getAircraft(resourceId);
    },
    async createResource(request) {
        return this.createAircraft(request);
    },
    async exportResources(format = 'csv') {
        return this.exportFleet(format);
    },
    async listResourceGroups(params = {}) {
        return this.listFleetGroups(params);
    },
    async createResourceGroup(request) {
        return this.createFleetGroup(request);
    },
    async updateResourceGroup(groupId, request) {
        return this.updateFleetGroup(groupId, request);
    },
    async listWorkflows() {
        return this.listMissions();
    },
    async listWorkflowTemplates(category) {
        return this.listMissionTemplates(category);
    },
    async getWorkflowTemplate(templateId) {
        return this.getMissionTemplate(templateId);
    },
    async createWorkflowTemplate(request) {
        return this.createMissionTemplate(request);
    },
    async listWorkflowSeries() {
        return this.listMissionSeries();
    },
    async createWorkflow(request) {
        return this.createMission(request);
    },
    async getWorkflow(workflowId) {
        return this.getMission(workflowId);
    },
    async listWorkflowRevisions(workflowId) {
        return this.listMissionRevisions(workflowId);
    },
    async listWorkflowLifecycle(workflowId) {
        return this.listMissionLifecycle(workflowId);
    },
    async updateWorkflowStatus(workflowId, status, detail) {
        return this.updateMissionStatus(workflowId, status, detail);
    },
    async duplicateWorkflow(workflowId) {
        return this.duplicateMission(workflowId);
    },
    async deleteWorkflow(workflowId) {
        return this.deleteMission(workflowId);
    },
    async deleteMission(missionId) {
        await api.delete(`/missions/${missionId}`);
    },
    // Integration APIs
    async sendLaancResult(result) {
        const response = await api.post('/integration/laanc-result', result);
        return response.data;
    },
    async sendAuthorizationConnectorResult(result) {
        return this.sendLaancResult(result);
    },
    async sendWeatherData(weatherData) {
        const response = await api.post('/integration/weather-data', weatherData);
        return response.data;
    },
    async requestIntelligence(request) {
        const response = await api.post('/integration/request-intelligence', request);
        return response.data;
    },
    async sendFleetStatus(status) {
        const response = await api.post('/webhooks/fleet-status', status);
        return response.data;
    },
    async triggerSourceIngestion(request) {
        const response = await api.post('/ingest', request);
        return response.data;
    },
    async listSourceIngestions(limit = 10) {
        const response = await api.get('/ingestions', { params: { limit } });
        return response.data;
    },
    async getSourceIngestionGovernance() {
        const response = await api.get('/ingestions/governance');
        return response.data;
    },
    async getMunicipalOperationsSummary() {
        const response = await api.get('/municipal-operations/summary');
        return syncMunicipalOperationsSummaryAliases(response.data);
    },
    async getPublicProgramOperationsSummary() {
        return this.getMunicipalOperationsSummary();
    },
    async listMunicipalWorkOrders() {
        const response = await api.get('/municipal-operations/work-orders');
        return syncMunicipalWorkOrderListAliases(response.data);
    },
    async listPublicProgramWorkOrders() {
        return this.listMunicipalWorkOrders();
    },
    async routeMunicipalWorkOrder(workOrderId, target) {
        const response = await api.post(`/municipal-operations/work-orders/${workOrderId}/route`, { target });
        return syncMunicipalWorkOrderAliases(response.data);
    },
    async routePublicProgramWorkOrder(workOrderId, target) {
        return this.routeMunicipalWorkOrder(workOrderId, target);
    },
    async draftMunicipalAdvisory(workOrderId, title) {
        const response = await api.post(`/municipal-operations/work-orders/${workOrderId}/advisories`, { title });
        return response.data;
    },
    async draftPublicProgramAdvisory(workOrderId, title) {
        return this.draftMunicipalAdvisory(workOrderId, title);
    },
    async listMunicipalLayers() {
        const response = await api.get('/municipal-operations/layers');
        return response.data;
    },
    async listPublicProgramLayers() {
        return this.listMunicipalLayers();
    },
    async listMunicipalAdvisories() {
        const response = await api.get('/municipal-operations/advisories');
        return response.data;
    },
    async listPublicProgramAdvisories() {
        return this.listMunicipalAdvisories();
    },
    async publishMunicipalAdvisory(advisoryId) {
        const response = await api.post(`/municipal-operations/advisories/${advisoryId}/publish`);
        return response.data;
    },
    async publishPublicProgramAdvisory(advisoryId) {
        return this.publishMunicipalAdvisory(advisoryId);
    },
};
