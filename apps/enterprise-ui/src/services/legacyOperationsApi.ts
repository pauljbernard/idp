import type { Workflow as Mission, WorkflowTemplate as MissionTemplate } from './workflowService'
import { api } from './iamHttpClient'
import type {
  AuthorizationConnectorResult,
  CommandCenterSummary,
  ConstitutionalAiSummary,
  DashboardSummary,
  DecisionResponse,
  DecisionArtifact,
  DecisionListResponse,
  FleetAircraft,
  FleetAircraftCreateRequest,
  FleetCatalogMake,
  FleetCatalogModel,
  FleetCatalogResponse,
  FleetExportResult,
  FleetGroup,
  FleetGroupCreateRequest,
  FleetGroupListRequest,
  FleetGroupListResponse,
  FleetGroupUpdateRequest,
  FleetListRequest,
  FleetListResponse,
  FleetMakeCreateRequest,
  FleetModelCreateRequest,
  FleetStatusUpdate,
  IntelligenceRequest,
  LaancResult,
  LiveOperationsReplayResponse,
  LiveOperationsTimelineResponse,
  LiveTelemetryRecord,
  MissionCreateRequest,
  MissionCreateResponse,
  MissionLifecycleResponse,
  MissionListResponse,
  MissionRevisionResponse,
  MissionSeriesResponse,
  MissionSeriesSummary,
  MissionTemplateCreateRequest,
  MissionTemplateListResponse,
  MunicipalAdvisory,
  MunicipalAdvisoryListResponse,
  MunicipalLayerListResponse,
  MunicipalOperationsSummary,
  MunicipalWorkOrder,
  MunicipalWorkOrderListResponse,
  MunicipalWorkOrderRouteTarget,
  PartnerEventsResponse,
  PartnerListResponse,
  PartnerSummary,
  PlatformEventsResponse,
  PlatformRuntimeMetricsQuery,
  PlatformRuntimeMetricsResponse,
  PublicProgramAdvisory,
  PublicProgramAdvisoryListResponse,
  PublicProgramLayerListResponse,
  PublicProgramOperationsSummary,
  PublicProgramWorkOrder,
  PublicProgramWorkOrderListResponse,
  PublicProgramWorkOrderRouteTarget,
  Resource,
  ResourceCreateRequest,
  ResourceExportResult,
  ResourceGroup,
  ResourceGroupCreateRequest,
  ResourceGroupListRequest,
  ResourceGroupListResponse,
  ResourceGroupUpdateRequest,
  ResourceListRequest,
  ResourceListResponse,
  SourceGovernanceSummary,
  SourceIngestionListResponse,
  SourceIngestionRequest,
  SourceIngestionRun,
  TelemetryIngestRequest,
  Workflow,
  WorkflowCreateRequest,
  WorkflowCreateResponse,
  WorkflowLifecycleResponse,
  WorkflowListResponse,
  WorkflowRevisionResponse,
  WorkflowSeriesResponse,
  WorkflowTemplate,
  WorkflowTemplateCreateRequest,
  WorkflowTemplateListResponse,
} from './legacyOperationsTypes'

function syncMissionAliases(mission: Mission): Mission {
  return {
    ...mission,
    assigned_specialist: mission.assigned_specialist ?? mission.assigned_pilot,
    assigned_resource: mission.assigned_resource ?? mission.assigned_aircraft,
  }
}

function syncMissionListAliases(missions: Mission[]): Mission[] {
  return missions.map((mission) => syncMissionAliases(mission))
}

function syncMissionSeriesAliases(summary: MissionSeriesSummary): MissionSeriesSummary {
  return {
    ...summary,
    assigned_specialist: summary.assigned_specialist ?? summary.assigned_pilot,
    assigned_resource: summary.assigned_resource ?? summary.assigned_aircraft,
  }
}

function normalizeFleetAircraftCreateRequest(request: FleetAircraftCreateRequest): FleetAircraftCreateRequest {
  return {
    ...request,
    aircraft_name: request.resource_name ?? request.aircraft_name,
    aircraft_type: request.resource_type ?? request.aircraft_type,
    assigned_pilot: request.assigned_specialist ?? request.assigned_pilot,
  }
}

function normalizeMissionCreateRequest(request: MissionCreateRequest): MissionCreateRequest {
  return {
    ...request,
    pilot_id: request.specialist_id ?? request.pilot_id,
    aircraft_id: request.resource_id ?? request.aircraft_id,
  }
}

function syncFleetAircraftAliases(aircraft: FleetAircraft): FleetAircraft {
  return {
    ...aircraft,
    assignedSpecialist: aircraft.assignedSpecialist ?? aircraft.assignedPilot,
  }
}

function syncFleetAircraftListAliases(aircraft: FleetAircraft[]): FleetAircraft[] {
  return aircraft.map((entry) => syncFleetAircraftAliases(entry))
}

function normalizeFleetGroupRequest(request: FleetGroupCreateRequest): FleetGroupCreateRequest {
  return {
    ...request,
    aircraft_ids: request.resource_ids ?? request.aircraft_ids,
  }
}

function normalizeFleetListRequest(request: FleetListRequest): FleetListRequest {
  return {
    ...request,
    group_id: request.resource_group_id ?? request.group_id,
  }
}

function syncFleetGroupAliases(group: FleetGroup): FleetGroup {
  return {
    ...group,
    resource_ids: group.resource_ids ?? group.aircraft_ids,
    resource_count: group.resource_count ?? group.aircraft_count,
    operational_resource_count: group.operational_resource_count ?? group.operational_aircraft_count,
  }
}

function syncFleetGroupListAliases(response: FleetGroupListResponse): FleetGroupListResponse {
  return {
    ...response,
    groups: response.groups.map((group) => syncFleetGroupAliases(group)),
    summary: {
      ...response.summary,
      total_resources_in_groups:
        response.summary.total_resources_in_groups ?? response.summary.total_aircraft_in_groups,
      operational_resources_in_groups:
        response.summary.operational_resources_in_groups ?? response.summary.operational_aircraft_in_groups,
      groups_with_unavailable_resources:
        response.summary.groups_with_unavailable_resources ?? response.summary.groups_with_inactive_aircraft,
    },
  }
}

function syncFleetListAliases(response: FleetListResponse): FleetListResponse {
  const aircraft = syncFleetAircraftListAliases(response.aircraft)
  return {
    ...response,
    aircraft,
    resources: response.resources ?? aircraft,
    summary: {
      ...response.summary,
      total_resources: response.summary.total_resources ?? response.summary.total_aircraft,
      operational_resources: response.summary.operational_resources ?? response.summary.operational_aircraft,
      service_or_unavailable_resources:
        response.summary.service_or_unavailable_resources ?? response.summary.service_or_grounded_aircraft,
      grouped_resources: response.summary.grouped_resources ?? response.summary.grouped_aircraft,
      ungrouped_resources: response.summary.ungrouped_resources ?? response.summary.ungrouped_aircraft,
      groups_with_unavailable_resources:
        response.summary.groups_with_unavailable_resources ?? response.summary.groups_with_inactive_aircraft,
    },
  }
}

function syncMissionListResponseAliases(response: MissionListResponse): MissionListResponse {
  const missions = syncMissionListAliases(response.missions)
  return {
    ...response,
    missions,
    workflows: response.workflows ?? missions,
  }
}

function syncMissionRevisionResponseAliases(response: MissionRevisionResponse): MissionRevisionResponse {
  return {
    ...response,
    workflow_id: response.workflow_id ?? response.mission_id,
  }
}

function syncMissionLifecycleResponseAliases(response: MissionLifecycleResponse): MissionLifecycleResponse {
  return {
    ...response,
    workflow_id: response.workflow_id ?? response.mission_id,
  }
}

function normalizeTelemetryIngestRequest(request: TelemetryIngestRequest): TelemetryIngestRequest {
  return {
    ...request,
    aircraft_id: request.resource_id ?? request.aircraft_id,
    mission_id: request.workflow_id ?? request.mission_id,
  }
}

function syncMunicipalOperationsSummaryAliases(summary: MunicipalOperationsSummary): MunicipalOperationsSummary {
  return {
    ...summary,
    stats: {
      ...summary.stats,
      linked_workflows: summary.stats.linked_workflows ?? summary.stats.linked_missions,
    },
  }
}

function syncMunicipalWorkOrderAliases(workOrder: MunicipalWorkOrder): MunicipalWorkOrder {
  return {
    ...workOrder,
    workflow_id: workOrder.workflow_id ?? workOrder.mission_id,
  }
}

function syncMunicipalWorkOrderListAliases(
  response: MunicipalWorkOrderListResponse,
): MunicipalWorkOrderListResponse {
  return {
    ...response,
    work_orders: response.work_orders.map((workOrder) => syncMunicipalWorkOrderAliases(workOrder)),
  }
}

function syncCommandCenterSummaryAliases(summary: CommandCenterSummary): CommandCenterSummary {
  return {
    ...summary,
    posture: {
      ...summary.posture,
      active_workflows: summary.posture.active_workflows ?? summary.posture.active_missions,
      active_resources: summary.posture.active_resources ?? summary.posture.in_flight_aircraft,
    },
  }
}

function syncLiveTelemetryAliases(record: LiveTelemetryRecord): LiveTelemetryRecord {
  return {
    ...record,
    resource_id: record.resource_id ?? record.aircraft_id,
    workflow_id: record.workflow_id ?? record.mission_id,
  }
}

function syncLiveOperationsTimelineAliases(
  response: LiveOperationsTimelineResponse,
): LiveOperationsTimelineResponse {
  return {
    ...response,
    items: response.items.map((item) => ({
      ...item,
      related_resource_id: item.related_resource_id ?? item.related_aircraft_id,
      related_workflow_id: item.related_workflow_id ?? item.related_mission_id,
    })),
  }
}

function syncLiveOperationsReplayAliases(
  response: LiveOperationsReplayResponse,
): LiveOperationsReplayResponse {
  return {
    ...response,
    buckets: response.buckets.map((bucket) => ({
      ...bucket,
      active_resources: bucket.active_resources ?? bucket.active_aircraft,
      active_workflows: bucket.active_workflows ?? bucket.active_missions,
    })),
  }
}

function syncDashboardSummaryAliases(summary: DashboardSummary): DashboardSummary {
  return {
    ...summary,
    stats: {
      ...summary.stats,
      active_workflows: summary.stats.active_workflows ?? summary.stats.active_missions,
      ready_resources: summary.stats.ready_resources ?? summary.stats.ready_aircraft,
      total_resources: summary.stats.total_resources ?? summary.stats.total_aircraft,
    },
  }
}

export const legacyOperationsApi = {
  async getDashboardSummary(): Promise<DashboardSummary> {

    const response = await api.get('/dashboard/summary')
    return syncDashboardSummaryAliases(response.data)
  },

  async getPlatformRuntimeMetrics(query: PlatformRuntimeMetricsQuery = {}): Promise<PlatformRuntimeMetricsResponse> {
    const response = await api.get('/platform/runtime-metrics', {
      params: {
        tenant_id: query.tenantId,
        source_subsystem: query.sourceSubsystem,
        target_subsystem: query.targetSubsystem,
        path_prefix: query.pathPrefix,
      },
    })
    return response.data
  },

  async getCommandCenterSummary(): Promise<CommandCenterSummary> {
    const response = await api.get('/command-center/summary')
    return syncCommandCenterSummaryAliases(response.data)
  },

  async ingestLiveTelemetry(payload: TelemetryIngestRequest): Promise<LiveTelemetryRecord> {
    const response = await api.post('/live-operations/telemetry', normalizeTelemetryIngestRequest(payload))
    return syncLiveTelemetryAliases(response.data)
  },

  async getLiveOperationsTimeline(params: {
    limit?: number
    from?: string
    to?: string
  } = {}): Promise<LiveOperationsTimelineResponse> {
    const response = await api.get('/live-operations/timeline', { params })
    return syncLiveOperationsTimelineAliases(response.data)
  },

  async getLiveOperationsReplay(params: {
    from?: string
    to?: string
    interval_minutes?: number
  } = {}): Promise<LiveOperationsReplayResponse> {
    const response = await api.get('/live-operations/replay', { params })
    return syncLiveOperationsReplayAliases(response.data)
  },

  async getConstitutionalAiSummary(): Promise<ConstitutionalAiSummary> {
    const response = await api.get('/constitutional-ai/summary')
    return response.data
  },

  async listDecisions(limit = 50): Promise<DecisionListResponse> {
    const response = await api.get('/decisions', { params: { limit } })
    return response.data
  },

  async getDecision(decisionId: string): Promise<DecisionArtifact> {
    const response = await api.get(`/decisions/${decisionId}`)
    return response.data
  },

  async listEvents(limit = 100): Promise<PlatformEventsResponse> {
    const response = await api.get('/events', { params: { limit } })
    return response.data
  },

  async listPartners(): Promise<PartnerListResponse> {
    const response = await api.get('/partners')
    return response.data
  },

  async getPartnerSummary(): Promise<PartnerSummary> {
    const response = await api.get('/partners/summary')
    return response.data
  },

  async listPartnerEvents(limit = 10): Promise<PartnerEventsResponse> {
    const response = await api.get('/partners/events', { params: { limit } })
    return response.data
  },

  async listFleet(params: FleetListRequest = {}): Promise<FleetListResponse> {
    const response = await api.get('/fleet', { params: normalizeFleetListRequest(params) })
    return syncFleetListAliases(response.data)
  },

  async getFleetCatalog(): Promise<FleetCatalogResponse> {
    const response = await api.get('/fleet/catalog')
    return response.data
  },

  async listFleetGroups(params: FleetGroupListRequest = {}): Promise<FleetGroupListResponse> {
    const response = await api.get('/fleet/groups', { params })
    return syncFleetGroupListAliases(response.data)
  },

  async createFleetGroup(request: FleetGroupCreateRequest): Promise<FleetGroup> {
    const response = await api.post('/fleet/groups', normalizeFleetGroupRequest(request))
    return syncFleetGroupAliases(response.data)
  },

  async updateFleetGroup(groupId: string, request: FleetGroupUpdateRequest): Promise<FleetGroup> {
    const response = await api.patch(`/fleet/groups/${groupId}`, normalizeFleetGroupRequest(request))
    return syncFleetGroupAliases(response.data)
  },

  async addFleetMake(request: FleetMakeCreateRequest): Promise<FleetCatalogMake> {
    const response = await api.post('/fleet/catalog/makes', request)
    return response.data
  },

  async addFleetModel(request: FleetModelCreateRequest): Promise<FleetCatalogModel> {
    const response = await api.post('/fleet/catalog/models', request)
    return response.data
  },

  async getAircraft(aircraftId: string): Promise<FleetAircraft> {
    const response = await api.get(`/fleet/${aircraftId}`)
    return syncFleetAircraftAliases(response.data)
  },

  async createAircraft(request: FleetAircraftCreateRequest): Promise<FleetAircraft> {
    const response = await api.post('/fleet', normalizeFleetAircraftCreateRequest(request))
    return syncFleetAircraftAliases(response.data)
  },

  async exportFleet(format: 'csv' | 'json' = 'csv'): Promise<FleetExportResult> {
    const response = await api.get('/fleet/export', { params: { format } })
    return response.data
  },

  async listMissions(): Promise<MissionListResponse> {
    const response = await api.get('/missions')
    return syncMissionListResponseAliases(response.data)
  },

  async listMissionTemplates(category?: Mission['type']): Promise<MissionTemplateListResponse> {
    const response = await api.get('/missions/templates', {
      params: category ? { category } : undefined,
    })
    return response.data
  },

  async getMissionTemplate(templateId: string): Promise<MissionTemplate> {
    const response = await api.get(`/missions/templates/${templateId}`)
    return response.data
  },

  async createMissionTemplate(request: MissionTemplateCreateRequest): Promise<MissionTemplate> {
    const response = await api.post('/missions/templates', request)
    return response.data
  },

  async listMissionSeries(): Promise<MissionSeriesResponse> {
    const response = await api.get('/missions/series')
    return {
      ...response.data,
      series: response.data.series.map((summary: MissionSeriesSummary) => syncMissionSeriesAliases(summary)),
    }
  },

  async createMission(request: MissionCreateRequest): Promise<MissionCreateResponse> {
    const response = await api.post('/missions', normalizeMissionCreateRequest(request))
    return {
      ...response.data,
      mission: syncMissionAliases(response.data.mission),
      generated_instances: syncMissionListAliases(response.data.generated_instances),
      recurrence_series: response.data.recurrence_series
        ? syncMissionSeriesAliases(response.data.recurrence_series)
        : null,
    }
  },

  async getMission(missionId: string): Promise<Mission> {
    const response = await api.get(`/missions/${missionId}`)
    return syncMissionAliases(response.data)
  },

  async listMissionRevisions(missionId: string): Promise<MissionRevisionResponse> {
    const response = await api.get(`/missions/${missionId}/revisions`)
    return syncMissionRevisionResponseAliases(response.data)
  },

  async listMissionLifecycle(missionId: string): Promise<MissionLifecycleResponse> {
    const response = await api.get(`/missions/${missionId}/lifecycle`)
    return syncMissionLifecycleResponseAliases(response.data)
  },

  async updateMissionStatus(
    missionId: string,
    status: Mission['status'],
    detail?: string
  ): Promise<Mission> {
    const response = await api.patch(`/missions/${missionId}/status`, { status, detail })
    return syncMissionAliases(response.data)
  },

  async duplicateMission(missionId: string): Promise<Mission> {
    const response = await api.post(`/missions/${missionId}/duplicate`)
    return syncMissionAliases(response.data)
  },

  async listResources(params: ResourceListRequest = {}): Promise<ResourceListResponse> {
    return this.listFleet(params)
  },

  async getResource(resourceId: string): Promise<Resource> {
    return this.getAircraft(resourceId)
  },

  async createResource(request: ResourceCreateRequest): Promise<Resource> {
    return this.createAircraft(request)
  },

  async exportResources(format: 'csv' | 'json' = 'csv'): Promise<ResourceExportResult> {
    return this.exportFleet(format)
  },

  async listResourceGroups(params: ResourceGroupListRequest = {}): Promise<ResourceGroupListResponse> {
    return this.listFleetGroups(params)
  },

  async createResourceGroup(request: ResourceGroupCreateRequest): Promise<ResourceGroup> {
    return this.createFleetGroup(request)
  },

  async updateResourceGroup(groupId: string, request: ResourceGroupUpdateRequest): Promise<ResourceGroup> {
    return this.updateFleetGroup(groupId, request)
  },

  async listWorkflows(): Promise<WorkflowListResponse> {
    return this.listMissions()
  },

  async listWorkflowTemplates(category?: Workflow['type']): Promise<WorkflowTemplateListResponse> {
    return this.listMissionTemplates(category)
  },

  async getWorkflowTemplate(templateId: string): Promise<WorkflowTemplate> {
    return this.getMissionTemplate(templateId)
  },

  async createWorkflowTemplate(request: WorkflowTemplateCreateRequest): Promise<WorkflowTemplate> {
    return this.createMissionTemplate(request)
  },

  async listWorkflowSeries(): Promise<WorkflowSeriesResponse> {
    return this.listMissionSeries()
  },

  async createWorkflow(request: WorkflowCreateRequest): Promise<WorkflowCreateResponse> {
    return this.createMission(request)
  },

  async getWorkflow(workflowId: string): Promise<Workflow> {
    return this.getMission(workflowId)
  },

  async listWorkflowRevisions(workflowId: string): Promise<WorkflowRevisionResponse> {
    return this.listMissionRevisions(workflowId)
  },

  async listWorkflowLifecycle(workflowId: string): Promise<WorkflowLifecycleResponse> {
    return this.listMissionLifecycle(workflowId)
  },

  async updateWorkflowStatus(workflowId: string, status: Workflow['status'], detail?: string): Promise<Workflow> {
    return this.updateMissionStatus(workflowId, status, detail)
  },

  async duplicateWorkflow(workflowId: string): Promise<Workflow> {
    return this.duplicateMission(workflowId)
  },

  async deleteWorkflow(workflowId: string): Promise<void> {
    return this.deleteMission(workflowId)
  },

  async deleteMission(missionId: string): Promise<void> {
    await api.delete(`/missions/${missionId}`)
  },

  // Integration APIs
  async sendLaancResult(result: LaancResult) {
    const response = await api.post('/integration/laanc-result', result)
    return response.data
  },

  async sendAuthorizationConnectorResult(result: AuthorizationConnectorResult) {
    return this.sendLaancResult(result)
  },

  async sendWeatherData(weatherData: any) {
    const response = await api.post('/integration/weather-data', weatherData)
    return response.data
  },

  async requestIntelligence(request: IntelligenceRequest): Promise<DecisionResponse> {
    const response = await api.post('/integration/request-intelligence', request)
    return response.data
  },

  async sendFleetStatus(status: FleetStatusUpdate) {
    const response = await api.post('/webhooks/fleet-status', status)
    return response.data
  },

  async triggerSourceIngestion(request: SourceIngestionRequest): Promise<SourceIngestionRun> {
    const response = await api.post('/ingest', request)
    return response.data
  },

  async listSourceIngestions(limit = 10): Promise<SourceIngestionListResponse> {
    const response = await api.get('/ingestions', { params: { limit } })
    return response.data
  },

  async getSourceIngestionGovernance(): Promise<SourceGovernanceSummary> {
    const response = await api.get('/ingestions/governance')
    return response.data
  },

  async getMunicipalOperationsSummary(): Promise<MunicipalOperationsSummary> {
    const response = await api.get('/municipal-operations/summary')
    return syncMunicipalOperationsSummaryAliases(response.data)
  },

  async getPublicProgramOperationsSummary(): Promise<PublicProgramOperationsSummary> {
    return this.getMunicipalOperationsSummary()
  },

  async listMunicipalWorkOrders(): Promise<MunicipalWorkOrderListResponse> {
    const response = await api.get('/municipal-operations/work-orders')
    return syncMunicipalWorkOrderListAliases(response.data)
  },

  async listPublicProgramWorkOrders(): Promise<PublicProgramWorkOrderListResponse> {
    return this.listMunicipalWorkOrders()
  },

  async routeMunicipalWorkOrder(
    workOrderId: string,
    target: MunicipalWorkOrderRouteTarget,
  ): Promise<MunicipalWorkOrder> {
    const response = await api.post(`/municipal-operations/work-orders/${workOrderId}/route`, { target })
    return syncMunicipalWorkOrderAliases(response.data)
  },

  async routePublicProgramWorkOrder(
    workOrderId: string,
    target: PublicProgramWorkOrderRouteTarget,
  ): Promise<PublicProgramWorkOrder> {
    return this.routeMunicipalWorkOrder(workOrderId, target)
  },

  async draftMunicipalAdvisory(workOrderId: string, title?: string): Promise<MunicipalAdvisory> {
    const response = await api.post(`/municipal-operations/work-orders/${workOrderId}/advisories`, { title })
    return response.data
  },

  async draftPublicProgramAdvisory(workOrderId: string, title?: string): Promise<PublicProgramAdvisory> {
    return this.draftMunicipalAdvisory(workOrderId, title)
  },

  async listMunicipalLayers(): Promise<MunicipalLayerListResponse> {
    const response = await api.get('/municipal-operations/layers')
    return response.data
  },

  async listPublicProgramLayers(): Promise<PublicProgramLayerListResponse> {
    return this.listMunicipalLayers()
  },

  async listMunicipalAdvisories(): Promise<MunicipalAdvisoryListResponse> {
    const response = await api.get('/municipal-operations/advisories')
    return response.data
  },

  async listPublicProgramAdvisories(): Promise<PublicProgramAdvisoryListResponse> {
    return this.listMunicipalAdvisories()
  },

  async publishMunicipalAdvisory(advisoryId: string): Promise<MunicipalAdvisory> {
    const response = await api.post(`/municipal-operations/advisories/${advisoryId}/publish`)
    return response.data
  },

  async publishPublicProgramAdvisory(advisoryId: string): Promise<PublicProgramAdvisory> {
    return this.publishMunicipalAdvisory(advisoryId)
  },


}
