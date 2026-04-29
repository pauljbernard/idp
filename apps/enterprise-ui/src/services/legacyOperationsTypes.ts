// Operations-oriented compatibility types extracted from the broad legacy client surface.
// The standalone UI does not import this module directly; it exists to decouple legacyOperationsApi from legacyApi.
import type { Workflow as Mission, WorkflowTemplate as MissionTemplate } from './workflowService'

export interface MissionEnvelope {
  mission_type: 'POINT' | 'AREA' | 'ROUTE'
  geometry: GeoJSON.Geometry
  altitude_profile: {
    takeoff_altitude: number
    max_altitude: number
    landing_altitude: number
  }
  time_window: {
    start: string
    end: string
  }
  tenant_id?: string
  pilot_id?: string
  aircraft_id?: string
}

export interface DecisionResponse {
  decision: {
    decision_class: string
    confidence: number
    explanation: string
    advisories: string[]
    authorization_requirements: string[]
    alternative_suggestions: string[]
    source_coverage: {
      complete: boolean
      missing_sources: string[]
    }
  }
  decision_artifact_id: string
  correlation_id: string
  evaluation_time: string
  performance?: {
    response_time_ms: number
    compliance_percent: number
  }
  principle_scores?: Array<{
    id: string
    name: string
    score: number
    violations: number
    status: 'excellent' | 'good' | 'warning'
  }>
  mission_summary?: {
    mission_type: 'POINT' | 'AREA' | 'ROUTE'
    altitude_ft: number
    location_label: string
    pilot_id?: string
    aircraft_id?: string
  }
}

export interface DecisionArtifact {
  id: string
  tenant_id: string
  user_id: string
  source: 'mission_planner' | 'partner_intelligence' | 'seeded'
  source_label: string
  requesting_platform?: string
  created_at: string
  correlation_id?: string
  mission_envelope: MissionEnvelope
  mission_summary: {
    mission_type: 'POINT' | 'AREA' | 'ROUTE'
    altitude_ft: number
    location_label: string
    pilot_id?: string
    aircraft_id?: string
  }
  decision: DecisionResponse['decision']
  performance: NonNullable<DecisionResponse['performance']>
  principle_scores: NonNullable<DecisionResponse['principle_scores']>
}

export interface DecisionListResponse {
  decisions: DecisionArtifact[]
  count: number
}

export interface PlatformEvent {
  id: string
  tenant_id: string
  event_type: string
  entity_type: string
  entity_id?: string
  event_data: Record<string, unknown>
  correlation_id?: string
  source: string
  severity: 'success' | 'info' | 'warning' | 'error'
  created_at: string
}

export interface PlatformEventsResponse {
  events: PlatformEvent[]
  count: number
}

export interface ConstitutionalAiSummary {
  generated_at: string
  tenant_id: string
  metrics: {
    compliance_percent: number
    decisions_today: number
    success_rate_percent: number
    avg_response_time_ms: number
    avg_confidence_percent: number
  }
  confidence_trend: Array<{
    time: string
    confidence: number
  }>
  decision_distribution: Array<{
    name: string
    value: number
    color: string
  }>
  principle_metrics: Array<{
    id: string
    name: string
    compliance: number
    violations: number
    status: 'excellent' | 'good' | 'warning'
  }>
  recent_decisions: Array<{
    id: string
    decision_class: 'ALLOWED' | 'AUTHORIZATION_REQUIRED' | 'BLOCKED'
    confidence: number
    created_at: string
    explanation: string
    source_label: string
  }>
  recent_events: Array<{
    id: string
    event_type: string
    severity: 'success' | 'info' | 'warning' | 'error'
    title: string
    detail: string
    created_at: string
  }>
}

export interface LaancResult {
  tenant_id?: string
  mission_id: string
  authorization_status: 'APPROVED' | 'DENIED' | 'PENDING' | 'EXPIRED'
  provider: string
  result_data?: {
    authorization_id?: string
    valid_from?: string
    valid_until?: string
    altitude_ceiling?: number
    special_conditions?: string[]
  }
}

export type AuthorizationConnectorResult = LaancResult

export interface IntelligenceRequest {
  requesting_platform: string
  mission_envelope: MissionEnvelope
  intelligence_options?: {
    include_alternatives?: boolean
    detailed_source_analysis?: boolean
    risk_assessment_level?: 'basic' | 'detailed' | 'comprehensive'
  }
}

export interface FleetStatusUpdate {
  tenant_id: string
  aircraft_id: string
  status: 'READY' | 'IN_FLIGHT' | 'LANDING' | 'MAINTENANCE' | 'OFFLINE' | 'ERROR'
  location?: {
    latitude: number
    longitude: number
    altitude?: number
  }
  timestamp?: string
  additional_data?: {
    battery_percentage?: number
    mission_id?: string
    flight_time_minutes?: number
  }
}

export interface SourceIngestionRequest {
  source_system: string
  source_type: string
  source_identifier: string
  tenant_id?: string
  scheduled_ingest?: boolean
  acquisition_mechanism?: 'manual' | 'schedule' | 'event' | 'webhook'
  source_url?: string
  authoritative_source?: boolean
  provenance?: {
    official_source?: string
    intermediary_source?: string
    acquired_at?: string
    effective_from?: string
    effective_to?: string
    freshness_expires_at?: string
    freshness_evidence?: string
    parser_version?: string
    transform_version?: string
    dataset_version?: string
    max_age_minutes?: number
  }
  raw_payload?: unknown
  metadata?: Record<string, unknown>
}

export interface SourceIngestionRun {
  ingestion_id: string
  tenant_id: string
  requested_by: string
  status: 'completed' | 'warning' | 'failed'
  message: string
  source_system: string
  source_type: string
  source_identifier: string
  dataset_category: string
  scheduled_ingest: boolean
  created_at: string
  correlation_id?: string
  acquisition: {
    mechanism: 'manual' | 'schedule' | 'event' | 'webhook'
    requested_at: string
    acquired_at: string
  }
  provenance: {
    authoritative_source: boolean
    source_identity: string
    official_source: string | null
    intermediary_source: string | null
    source_url: string | null
    effective_interval: {
      start: string | null
      end: string | null
    }
    freshness: {
      max_age_minutes: number
      expires_at: string
      stale: boolean
      evidence: string
    }
    parser_version: string
    transform_version: string
    dataset_version: string
    raw_object_uri: string
    raw_manifest_uri: string | null
    raw_checksum: string
    raw_bytes: number
    raw_storage_mode: 'LOCAL_IMMUTABLE_CONTENT_ADDRESSED_OBJECT_STORE' | 'LOCAL_PREVIEW_FILE' | 'SEED_PREVIEW_FILE'
    raw_content_type: string
    raw_immutable: boolean
  }
  processing: {
    record_count: number
    normalized_record_count: number
    change_detected: boolean
    replay_supported: boolean
    replay_count: number
    warnings: string[]
  }
  metadata: Record<string, unknown>
  regulatory_dataset_update?: {
    applied: boolean
    grids_upserted: number
    notices_upserted: number
    touched_records: number
    warnings: string[]
  }
  timestamp?: string
}

export interface SourceIngestionListResponse {
  runs: SourceIngestionRun[]
  count: number
}

export type SourceGovernanceHealth = 'healthy' | 'stale' | 'warning' | 'failed' | 'missing'

export interface SourceGovernanceAlert {
  id: string
  severity: 'critical' | 'warning' | 'info'
  source_system: string
  source_label: string
  title: string
  detail: string
  detected_at: string
}

export interface SourceGovernanceSourceStatus {
  source_system: string
  source_label: string
  source_type: string
  dataset_category: string
  authoritative_expected: boolean
  required_for_regulatory: boolean
  active_identifiers: string[]
  freshness_sla_minutes: number
  health: SourceGovernanceHealth
  last_ingested_at: string | null
  expires_at: string | null
  regulatory_coverage: {
    grids: number
    notices: number
    last_updated_at: string | null
    dataset_versions: string[]
  }
  latest_run: SourceIngestionRun | null
  alerts: string[]
}

export interface SourceGovernanceSummary {
  generated_at: string
  tenant_id: string
  storage_boundary: {
    mode: 'LOCAL_IMMUTABLE_CONTENT_ADDRESSED_OBJECT_STORE'
    immutable_raw_payloads: true
    content_addressed: true
    root_uri: string
    object_count: number
    manifest_count: number
    total_bytes: number
  }
  orchestration: {
    mode: 'LOCAL_GOVERNED_EXECUTION'
    replay_supported: true
    authoritative_connectors: false
  }
  summary: {
    total_sources: number
    authoritative_sources: number
    healthy_sources: number
    stale_sources: number
    warning_sources: number
    failed_sources: number
    missing_sources: number
    regulatory_grids: number
    regulatory_notices: number
    latest_ingested_at: string | null
  }
  sources: SourceGovernanceSourceStatus[]
  alerts: SourceGovernanceAlert[]
}

export interface MunicipalOperationsSummary {
  generated_at: string
  tenant_id: string
  stats: {
    open_work_orders: number
    route_ready: number
    linked_missions: number
    linked_workflows?: number
    active_advisories: number
    synced_layers: number
    dispatch_linked: number
  }
  workflow_blueprints: Array<{
    id: string
    name: string
    description: string
    enabled: boolean
    role_template: string
  }>
  integration_status: Array<{
    system: string
    status: 'Connected' | 'Setup Required' | 'Attention Required'
    last_sync: string | null
  }>
  recent_activity: Array<{
    id: string
    type: 'work_order' | 'advisory'
    title: string
    detail: string
    timestamp: string
  }>
}

export type PublicProgramOperationsSummary = MunicipalOperationsSummary

export type MunicipalWorkOrderStatus =
  | 'NEW'
  | 'TRIAGE'
  | 'PLANNING'
  | 'AUTHORIZATION'
  | 'FIELD_READY'
  | 'ACTIVE'
  | 'COMPLETED'

export type PublicProgramWorkOrderStatus = MunicipalWorkOrderStatus

export interface MunicipalWorkOrder {
  id: string
  tenant_id: string
  title: string
  summary: string
  source_system: string
  intake_channel: 'arcgis' | 'servicenow' | '311' | 'dispatch' | 'manual'
  status: MunicipalWorkOrderStatus
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  request_type: 'inspection' | 'event_response' | 'utility' | 'public_safety' | 'planning_review'
  requested_by: string
  submitted_at: string
  due_at: string | null
  updated_at: string
  location: {
    label: string
    lat: number
    lon: number
  }
  case_reference: string | null
  dispatch_reference: string | null
  mission_id: string | null
  workflow_id?: string | null
  linked_layer_ids: string[]
  advisory_ids: string[]
  workflow_stage_label: string
  next_action_label: string
  tags: string[]
}

export type PublicProgramWorkOrder = MunicipalWorkOrder

export interface MunicipalWorkOrderListResponse {
  work_orders: MunicipalWorkOrder[]
  count: number
}

export type PublicProgramWorkOrderListResponse = MunicipalWorkOrderListResponse

export interface MunicipalLayerReference {
  id: string
  tenant_id: string
  name: string
  source_system: string
  category: string
  status: 'ACTIVE' | 'STALE' | 'ERROR'
  visibility: 'internal' | 'public_sector' | 'shared_public'
  feature_count: number
  last_sync_at: string
  advisory_enabled: boolean
  geographic_scope: string
}

export type PublicProgramLayerReference = MunicipalLayerReference

export interface MunicipalLayerListResponse {
  layers: MunicipalLayerReference[]
  count: number
}

export type PublicProgramLayerListResponse = MunicipalLayerListResponse

export interface MunicipalAdvisory {
  id: string
  tenant_id: string
  title: string
  summary: string
  type: 'closure' | 'hazard' | 'operational'
  status: 'DRAFT' | 'PUBLISHED' | 'EXPIRED'
  audience: 'field_ops' | 'public_sector' | 'public'
  linked_work_order_id: string | null
  source_layer_ids: string[]
  geographic_scope: string
  created_at: string
  updated_at: string
  published_at: string | null
  expires_at: string | null
}

export type PublicProgramAdvisory = MunicipalAdvisory

export interface MunicipalAdvisoryListResponse {
  advisories: MunicipalAdvisory[]
  count: number
}

export type PublicProgramAdvisoryListResponse = MunicipalAdvisoryListResponse

export type MunicipalWorkOrderRouteTarget = 'planning' | 'authorization' | 'operations'
export type PublicProgramWorkOrderRouteTarget = MunicipalWorkOrderRouteTarget

export interface CommandCenterSummary {
  generated_at: string
  tenant_id: string
  posture: {
    active_missions: number
    active_workflows?: number
    in_flight_aircraft: number
    active_resources?: number
    processing_authorizations: number
    open_incidents: number
    active_advisories: number
  }
  live_board: Array<{
    id: string
    type: 'mission' | 'aircraft' | 'incident' | 'authorization'
    title: string
    detail: string
    status: string
    location_label: string
    updated_at: string
    href: string | null
  }>
  alerts: Array<{
    id: string
    severity: 'info' | 'warning' | 'critical'
    title: string
    detail: string
    source: string
    updated_at: string
    href: string | null
  }>
  watch_zones: Array<{
    id: string
    name: string
    status: 'monitor' | 'deconflict' | 'restricted'
    detail: string
    location_label: string
  }>
  integration_health: Array<{
    name: string
    status: 'Connected' | 'Setup Required' | 'Attention Required'
    last_sync: string
  }>
}

export interface LiveTelemetryRecord {
  id: string
  tenant_id: string
  aircraft_id: string
  resource_id?: string
  mission_id?: string
  workflow_id?: string
  source: 'fleet_webhook' | 'mobile_app' | 'oem' | 'remote_id' | 'manual_seed' | 'command_api'
  status: 'READY' | 'IN_FLIGHT' | 'MAINTENANCE' | 'CHARGING' | 'LANDING' | 'OFFLINE' | 'ERROR'
  position: {
    lat: number
    lon: number
    altitude_ft?: number
  }
  battery_percent: number | null
  groundspeed_kts: number | null
  heading_degrees: number | null
  event_time: string
  received_at: string
  correlation_id?: string
  replay_key: string
}

export interface LiveOperationsTimelineItem {
  id: string
  kind: 'telemetry' | 'event' | 'alert'
  severity: 'info' | 'warning' | 'critical'
  title: string
  detail: string
  source: string
  timestamp: string
  href: string | null
  location_label: string | null
  related_aircraft_id: string | null
  related_resource_id?: string | null
  related_mission_id: string | null
  related_workflow_id?: string | null
  replay_key: string
}

export interface LiveOperationsTimelineResponse {
  generated_at: string
  tenant_id: string
  items: LiveOperationsTimelineItem[]
  count: number
  replay_window: {
    from: string
    to: string
  }
}

export interface LiveOperationsReplayBucket {
  bucket_start: string
  bucket_end: string
  telemetry_updates: number
  alert_count: number
  event_count: number
  active_aircraft: number
  active_resources?: number
  active_missions: number
  active_workflows?: number
}

export interface LiveOperationsReplayResponse {
  generated_at: string
  tenant_id: string
  from: string
  to: string
  interval_minutes: number
  buckets: LiveOperationsReplayBucket[]
  count: number
}

export interface TelemetryIngestRequest {
  aircraft_id: string
  resource_id?: string
  mission_id?: string
  workflow_id?: string
  source?: 'fleet_webhook' | 'mobile_app' | 'oem' | 'remote_id' | 'manual_seed' | 'command_api'
  status: 'READY' | 'IN_FLIGHT' | 'MAINTENANCE' | 'CHARGING' | 'LANDING' | 'OFFLINE' | 'ERROR'
  position: {
    lat: number
    lon: number
    altitude_ft?: number
  }
  battery_percent?: number
  groundspeed_kts?: number
  heading_degrees?: number
  timestamp?: string
}

export interface FleetAircraft {
  id: string
  tenant_id: string
  name: string
  model: string
  manufacturer: string
  serialNumber: string
  status: 'READY' | 'IN_FLIGHT' | 'MAINTENANCE' | 'CHARGING'
  location: {
    name: string
    lat: number
    lon: number
  }
  battery: number
  flightTime: number
  lastMission: string
  lastMaintenance: string
  nextMaintenance: string
  assignedPilot: string
  assignedSpecialist?: string
  tenant: string
  registration?: string
  asset_profile: {
    drone_type: 'MULTI_ROTOR' | 'FIXED_WING' | 'OTHER'
    drone_type_other?: string
    asset_status: 'OPERATIONAL' | 'UNDER_SERVICE' | 'GROUNDED' | 'RETIRED' | 'OTHER'
    asset_status_other?: string
    weight_category: 'UNDER_250G' | 'BETWEEN_250G_AND_55_LBS' | 'OVER_55_LBS'
    make_id?: string
    make_name: string
    make_other?: string
    model_id?: string
    model_name: string
    model_other?: string
    drone_value_usd?: number
    faa_registration_number?: string
    faa_registration_date?: string
    available_capabilities: string[]
    default_mission_capabilities: string[]
    group_ids: string[]
    group_names: string[]
  }
  specifications: {
    maxAltitude: number
    maxRange: number
    maxSpeed: number
    maxPayload: number
    flightTime: number
  }
  sensors: {
    camera: boolean
    lidar: boolean
    thermal: boolean
    multispectral: boolean
  }
  metrics: {
    totalFlights: number
    totalFlightTime: number
    totalDistance: number
    averageFlightTime: number
  }
}

export interface FleetAircraftCreateRequest {
  aircraft_name: string
  resource_name?: string
  aircraft_type?: string
  resource_type?: string
  manufacturer?: string
  serial_number?: string
  registration?: string
  assigned_pilot?: string
  assigned_specialist?: string
  status?: FleetAircraft['status']
  drone_type?: FleetAircraft['asset_profile']['drone_type']
  drone_type_other?: string
  asset_status?: FleetAircraft['asset_profile']['asset_status']
  asset_status_other?: string
  make_id?: string
  make_name?: string
  make_other?: string
  model_id?: string
  model_name?: string
  model_other?: string
  drone_value_usd?: number
  weight_category?: FleetAircraft['asset_profile']['weight_category']
  faa_registration_number?: string
  faa_registration_date?: string
  available_capabilities?: string[]
  default_mission_capabilities?: string[]
  group_ids?: string[]
  location?: {
    name?: string
    lat?: number
    lon?: number
  }
  battery?: number
  specifications?: Partial<FleetAircraft['specifications']>
  sensors?: Partial<FleetAircraft['sensors']>
}

export interface FleetCatalogMake {
  id: string
  tenant_id: string
  name: string
  source: 'seed' | 'tenant_admin'
  created_at: string
  created_by: string
}

export interface FleetCatalogModel {
  id: string
  tenant_id: string
  make_id: string
  make_name: string
  name: string
  source: 'seed' | 'tenant_admin'
  created_at: string
  created_by: string
}

export interface FleetCatalogResponse {
  generated_at: string
  tenant_id: string
  makes: FleetCatalogMake[]
  models: FleetCatalogModel[]
  count: {
    makes: number
    models: number
  }
}

export interface FleetGroup {
  id: string
  tenant_id: string
  name: string
  description?: string
  group_type: 'STANDARD' | 'SWARM' | 'TASK_FORCE' | 'OTHER'
  group_type_other?: string
  status: 'ACTIVE' | 'STANDBY' | 'UNDER_SERVICE' | 'RETIRED' | 'OTHER'
  status_other?: string
  base_location_name?: string
  notes?: string
  available_capabilities: string[]
  default_mission_capabilities: string[]
  created_at: string
  updated_at: string
  created_by: string
  updated_by: string
  aircraft_ids: string[]
  resource_ids?: string[]
  aircraft_count: number
  resource_count?: number
  operational_aircraft_count: number
  operational_resource_count?: number
  asset_status_breakdown: Record<'OPERATIONAL' | 'UNDER_SERVICE' | 'GROUNDED' | 'RETIRED' | 'OTHER', number>
}

export interface FleetGroupListResponse {
  generated_at: string
  tenant_id: string
  groups: FleetGroup[]
  count: number
  total_count: number
  page: {
    current_page: number
    page_size: number
    total_pages: number
    returned_count: number
  }
  query: {
    search?: string
    status?: FleetGroup['status']
    group_type?: FleetGroup['group_type']
    sort_field: 'name' | 'group_type' | 'status' | 'aircraft_count' | 'operational_aircraft_count' | 'base_location_name' | 'updated_at'
    sort_direction: 'asc' | 'desc'
  }
  summary: {
    total_groups: number
    active_groups: number
    inactive_groups: number
    groups_with_inactive_aircraft: number
    groups_with_unavailable_resources?: number
    total_aircraft_in_groups: number
    total_resources_in_groups?: number
    operational_aircraft_in_groups: number
    operational_resources_in_groups?: number
  }
}

export interface FleetGroupListRequest {
  search?: string
  status?: FleetGroup['status']
  group_type?: FleetGroup['group_type']
  sort_field?: FleetGroupListResponse['query']['sort_field']
  sort_direction?: FleetGroupListResponse['query']['sort_direction']
  page?: number
  page_size?: number
}

export interface FleetGroupCreateRequest {
  name: string
  description?: string
  group_type?: FleetGroup['group_type']
  group_type_other?: string
  status?: FleetGroup['status']
  status_other?: string
  base_location_name?: string
  notes?: string
  available_capabilities?: string[]
  default_mission_capabilities?: string[]
  aircraft_ids?: string[]
  resource_ids?: string[]
}

export interface FleetGroupUpdateRequest extends FleetGroupCreateRequest {}

export interface FleetMakeCreateRequest {
  name: string
}

export interface FleetModelCreateRequest {
  make_id: string
  name: string
}

export interface FleetExportResult {
  generated_at: string
  tenant_id: string
  format: 'csv' | 'json'
  filename: string
  mime_type: string
  encoding: 'utf8'
  count: number
  content: string
  object_reference: {
    object_id: string
    object_uri: string
    manifest_uri: string
    checksum: string
    bytes: number
    content_type: string
    content_address: string
    storage_mode: 'LOCAL_IMMUTABLE_CONTENT_ADDRESSED_OBJECT_STORE'
    immutable: true
    created_at: string
  }
}

export type Resource = FleetAircraft
export type ResourceCreateRequest = FleetAircraftCreateRequest
export type ResourceCatalogMake = FleetCatalogMake
export type ResourceCatalogModel = FleetCatalogModel
export type ResourceCatalogResponse = FleetCatalogResponse
export type ResourceGroup = FleetGroup
export type ResourceGroupListResponse = FleetGroupListResponse
export type ResourceGroupListRequest = FleetGroupListRequest
export type ResourceGroupCreateRequest = FleetGroupCreateRequest
export type ResourceGroupUpdateRequest = FleetGroupUpdateRequest
export type ResourceExportResult = FleetExportResult

export interface FleetListResponse {
  generated_at: string
  tenant_id: string
  aircraft: FleetAircraft[]
  resources?: FleetAircraft[]
  count: number
  total_count: number
  page: {
    current_page: number
    page_size: number
    total_pages: number
    returned_count: number
  }
  query: {
    search?: string
    group_id?: string
    asset_status?: FleetAircraft['asset_profile']['asset_status']
    make_name?: string
    sort_field: 'name' | 'group' | 'asset_status' | 'make' | 'model' | 'max_altitude' | 'last_mission' | 'updated_at'
    sort_direction: 'asc' | 'desc'
  }
  summary: {
    total_aircraft: number
    total_resources?: number
    operational_aircraft: number
    operational_resources?: number
    service_or_grounded_aircraft: number
    service_or_unavailable_resources?: number
    grouped_aircraft: number
    grouped_resources?: number
    ungrouped_aircraft: number
    ungrouped_resources?: number
    active_groups: number
    inactive_groups: number
    groups_with_inactive_aircraft: number
    groups_with_unavailable_resources?: number
    registrations_expiring_in_30_days: number
    registrations_expired: number
  }
}

export interface FleetListRequest {
  search?: string
  group_id?: string
  resource_group_id?: string
  asset_status?: FleetAircraft['asset_profile']['asset_status']
  make_name?: string
  sort_field?: FleetListResponse['query']['sort_field']
  sort_direction?: FleetListResponse['query']['sort_direction']
  page?: number
  page_size?: number
}

export type ResourceListResponse = FleetListResponse
export type ResourceListRequest = FleetListRequest

export interface MissionListResponse {
  missions: Mission[]
  workflows?: Mission[]
  count: number
}

export type Workflow = Mission
export type WorkflowListResponse = MissionListResponse

export type MissionRecurrencePattern = NonNullable<Mission['recurrence_pattern']>

export interface MissionTemplateListResponse {
  templates: MissionTemplate[]
  count: number
}

export type WorkflowTemplate = MissionTemplate
export type WorkflowTemplateListResponse = MissionTemplateListResponse

export interface MissionSeriesSummary {
  tenant_id: string
  parent_mission_id: string
  mission_name: string
  parent_status: Mission['status']
  template_id?: string
  template_name?: string
  recurrence_pattern: MissionRecurrencePattern
  generated_instance_count: number
  upcoming_instance_count: number
  next_instance_start?: string
  last_instance_start?: string
  assigned_pilot: string
  assigned_specialist?: string
  assigned_aircraft: string
  assigned_resource?: string
}

export interface MissionSeriesResponse {
  series: MissionSeriesSummary[]
  count: number
}

export type WorkflowSeriesSummary = MissionSeriesSummary
export type WorkflowSeriesResponse = MissionSeriesResponse

export type MissionRevisionChangeType =
  | 'MISSION_CREATED'
  | 'MISSION_DUPLICATED'
  | 'MISSION_DELETED'
  | 'MISSION_STATUS_UPDATED'
  | 'MISSION_RECURRING_INSTANCE_GENERATED'
  | 'MISSION_SERVICE_MIGRATED'

export interface MissionRevisionSummary {
  id: string
  tenant_id: string
  mission_id: string
  revision_number: number
  change_type: MissionRevisionChangeType
  summary: string
  changed_by: string
  changed_at: string
  snapshot: {
    status: Mission['status']
    priority: Mission['priority']
    scheduled_start: string
    scheduled_end: string
    template_id?: string
    parent_mission_id?: string
    is_recurring: boolean
  }
}

export type MissionLifecycleAction =
  | 'created'
  | 'duplicated'
  | 'deleted'
  | 'status_updated'
  | 'recurring_instance_generated'
  | 'migrated'

export interface MissionLifecycleEvent {
  id: string
  tenant_id: string
  mission_id: string
  action: MissionLifecycleAction
  actor_id: string
  occurred_at: string
  detail: string
  previous_status?: Mission['status']
  next_status?: Mission['status']
  related_mission_id?: string
}

export interface MissionRevisionResponse {
  mission_id: string
  workflow_id?: string
  revisions: MissionRevisionSummary[]
  count: number
}

export interface MissionLifecycleResponse {
  mission_id: string
  workflow_id?: string
  events: MissionLifecycleEvent[]
  count: number
}

export type WorkflowRevisionSummary = MissionRevisionSummary
export type WorkflowRevisionResponse = MissionRevisionResponse
export type WorkflowLifecycleEvent = MissionLifecycleEvent
export type WorkflowLifecycleResponse = MissionLifecycleResponse

export interface MissionTemplateCreateRequest {
  name: string
  description: string
  category?: Mission['type']
  geometry_type?: Mission['geometry']['type']
  default_priority?: Mission['priority']
  default_altitude?: number
  estimated_duration?: number
  required_equipment?: string[]
  weather_requirements?: Mission['weather_requirements']
  regulatory_notes?: string
  checklist_items?: string[]
  tags?: string[]
  recommended_recurrence?: MissionRecurrencePattern
}

export interface MissionCreateRequest {
  mission_name: string
  mission_description?: string
  mission_type?: 'POINT' | 'AREA' | 'ROUTE'
  mission_geometry_type?: 'POINT' | 'AREA' | 'ROUTE'
  mission_category?: Mission['type']
  priority?: Mission['priority']
  geometry: GeoJSON.Geometry
  altitude_profile: {
    takeoff_altitude: number
    max_altitude: number
    landing_altitude: number
  }
  time_window: {
    start: string
    end: string
  }
  pilot_id?: string
  specialist_id?: string
  aircraft_id?: string
  resource_id?: string
  location_name?: string
  location_address?: string
  template_id?: string
  client_id?: string
  project_id?: string
  workflow_asset_id?: string
  required_equipment?: string[]
  weather_requirements?: Mission['weather_requirements']
  tags?: string[]
  custom_fields?: Record<string, unknown>
  is_recurring?: boolean
  recurrence_pattern?: MissionRecurrencePattern
}

export type WorkflowTemplateCreateRequest = MissionTemplateCreateRequest
export type WorkflowCreateRequest = MissionCreateRequest

export interface MissionCreateResponse {
  mission: Mission
  generated_instances: Mission[]
  generated_instances_count: number
  recurrence_series: MissionSeriesSummary | null
}

export type WorkflowCreateResponse = MissionCreateResponse

export interface DashboardSummary {
  generated_at: string
  tenant_id: string
  stats: {
    active_missions: number
    active_workflows?: number
    approved_authorizations: number
    processing_authorizations: number
    ready_aircraft: number
    ready_resources?: number
    total_aircraft: number
    total_resources?: number
    operational_efficiency_score: number
    compliance_rate: number
    authorization_success_rate: number
  }
  recent_activity: Array<{
    id: string
    entity_type: 'mission' | 'authorization'
    title: string
    subtitle: string
    status: string
    timestamp: string
  }>
  integrations: Array<{
    name: string
    status: 'Connected' | 'Setup Required' | 'Attention Required'
    lastSync: string
  }>
  system_metrics: {
    average_api_response_time_ms: number
    p95_api_response_time_ms: number
    availability_percent: number
    process_uptime_seconds: number
    requests_last_hour: number
    active_sessions: number
  }
  integration_metrics: {
    east_west_requests_last_hour: number
    east_west_http_requests_last_hour: number
    north_south_requests_last_hour: number
    fallback_requests_last_hour: number
    estimated_east_west_api_gateway_request_cost_last_hour_usd: number
    projected_east_west_api_gateway_request_cost_30d_usd: number
    average_east_west_response_time_ms: number
    p95_east_west_response_time_ms: number
    top_adapter: {
      adapter: string | null
      count: number
      error_rate_percent: number
      p95_response_time_ms: number
    }
    top_subsystem_pair: {
      source: string | null
      target: string | null
      count: number
      error_rate_percent: number
    }
  }
}

export interface PlatformRuntimeMetricsResponse {
  generated_at: string
  tenant_id: string | null
  runtime: {
    generated_at: string
    process_started_at: string
    process_uptime_seconds: number
    active_requests: number
    requests_last_hour: number
    average_response_time_ms: number
    p95_response_time_ms: number
    availability_percent: number
  }
  integration: {
    generated_at: string
    tenant_id: string | null
    total_requests_last_hour: number
    east_west_requests_last_hour: number
    east_west_http_requests_last_hour: number
    north_south_requests_last_hour: number
    fallback_requests_last_hour: number
    api_gateway_request_price_per_million_usd: number
    estimated_east_west_api_gateway_request_cost_last_hour_usd: number
    projected_east_west_api_gateway_request_cost_30d_usd: number
    average_east_west_response_time_ms: number
    p95_east_west_response_time_ms: number
    by_adapter: Array<{
      adapter: 'local' | 'invoke' | 'http' | 'event' | 'unknown'
      count: number
      error_rate_percent: number
      p95_response_time_ms: number
    }>
    by_subsystem_pair: Array<{
      source: string
      target: string
      count: number
      error_rate_percent: number
    }>
  }
}

export interface PlatformRuntimeMetricsQuery {
  tenantId?: string
  sourceSubsystem?: string
  targetSubsystem?: string
  pathPrefix?: string
}

export type PartnerType =
  | 'LAANC_PROVIDER'
  | 'WEATHER_SERVICE'
  | 'INTELLIGENCE_CONSUMER'
  | 'FLEET_TELEMETRY'
  | 'ENTERPRISE_WORKFLOW'

export type PartnerStatus = 'ACTIVE' | 'PENDING' | 'ERROR'
export type PartnerEventDirection = 'inbound' | 'outbound'
export type PartnerEventStatus = 'success' | 'warning' | 'error'
export type PartnerEventType =
  | 'laanc_result_received'
  | 'weather_update_received'
  | 'intelligence_response_delivered'
  | 'fleet_status_received'

export interface PartnerIntegration {
  id: string
  tenant_id: string
  name: string
  type: PartnerType
  status: PartnerStatus
  connectionHealth: number
  lastSync: string
  apiVersion: string
  requestsToday: number
  successRate: number
  avgResponseTime: number
  capabilities: string[]
  lastEventSummary: string | null
  lastEventStatus: PartnerEventStatus | null
}

export interface PartnerTelemetryEvent {
  id: string
  tenant_id: string
  partner_id: string
  partner_name: string
  event_type: PartnerEventType
  direction: PartnerEventDirection
  status: PartnerEventStatus
  summary: string
  occurred_at: string
  correlation_id?: string
  response_time_ms: number
  metadata: Record<string, unknown>
}

export interface PartnerSummary {
  generated_at: string
  tenant_id: string
  total_partners: number
  active_partners: number
  pending_partners: number
  error_partners: number
  requests_today: number
  success_rate_percent: number
  average_response_time_ms: number
  recent_events: number
}

export interface PartnerListResponse {
  partners: PartnerIntegration[]
  count: number
}

export interface PartnerEventsResponse {
  events: PartnerTelemetryEvent[]
  count: number
}
