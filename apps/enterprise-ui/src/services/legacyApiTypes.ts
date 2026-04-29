import type { Workflow as WorkflowModel, WorkflowTemplate as WorkflowTemplateModel } from './workflowService'

type Mission = WorkflowModel
type MissionTemplate = WorkflowTemplateModel
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

export type PublicAwarenessOperatorMode = 'part_107' | 'recreational'
export type PublicAwarenessStatus = 'GREEN' | 'AMBER' | 'RED'
export type PublicAwarenessDecisionClass =
  | 'ALLOWED'
  | 'ALLOWED_WITH_ADVISORIES'
  | 'AUTHORIZATION_REQUIRED'
  | 'BLOCKED'
export type PublicAwarenessNoticeSeverity = 'blocking' | 'advisory' | 'informational'

export interface PublicAwarenessSourceStatus {
  source_label: string
  freshness_status: 'fresh' | 'stale'
  last_updated: string | null
  expires_at: string | null
}

export interface PublicAwarenessSummary {
  generated_at: string
  mode: 'ANONYMOUS_PUBLIC_AWARENESS'
  login_required: false
  pii_required: false
  notice_radius_nm: number
  current_month_pin_drops: number
  last_24h_pin_drops: number
  dataset_status: PublicAwarenessSourceStatus[]
  service_mode?: FaaServiceMode
  service_status?: FaaServiceStatus
  active_adapter?: string | null
  guidance: string[]
  disclaimers: string[]
}

export interface PublicAwarenessRequest {
  latitude?: number
  longitude?: number
  altitude_ft?: number
  operator_mode?: PublicAwarenessOperatorMode
  planned_time?: string
}

export interface PublicAwarenessNotice {
  id: string
  title: string
  severity: PublicAwarenessNoticeSeverity
  summary: string
  source_label: string
  source_system: string
  action_label?: string
  action_url?: string
}

export interface PublicAwarenessEvaluation {
  evaluation_id: string
  evaluated_at: string
  location_label: string
  operator_mode: PublicAwarenessOperatorMode
  notice_radius_nm: number
  status_indicator: PublicAwarenessStatus
  decision_class: PublicAwarenessDecisionClass
  summary: string
  notices: PublicAwarenessNotice[]
  next_steps: Array<{
    type: 'review' | 'laanc' | 'faadronezone' | 'mission-planning'
    label: string
    detail: string
    href?: string
    requires_login: boolean
  }>
  source_status: PublicAwarenessSourceStatus[]
  telemetry: {
    anonymous: true
    monthly_pin_drops: number
    reporting_month: string
    coarse_location: string
  }
  disclaimers: string[]
}

export interface PublicAwarenessRecentChecksResponse {
  checks: Array<{
    evaluation_id: string
    evaluated_at: string
    status_indicator: PublicAwarenessStatus
    decision_class: PublicAwarenessDecisionClass
    location_label: string
    operator_mode: PublicAwarenessOperatorMode
    notice_count: number
  }>
  count: number
}

export interface PlanningLocationSearchResult {
  id: string
  name: string
  coordinates: [number, number]
  type: 'address' | 'landmark' | 'airport' | 'city' | 'facility'
  source: 'platform' | 'provider'
  provider_label?: string
  detail?: string
}

export interface PlanningLocationSearchResponse {
  query: string
  results: PlanningLocationSearchResult[]
  count: number
}

export interface PlanningAirspaceRestriction {
  id: string
  type: 'TFR' | 'CONTROLLED' | 'RESTRICTED' | 'PROHIBITED' | 'ADVISORY' | 'CLASS_B' | 'CLASS_C' | 'CLASS_D' | 'NATIONAL_PARK'
  geometry: {
    type: 'Circle' | 'Polygon'
    coordinates: number[][][]
    center?: [number, number]
    radius?: number
  }
  altitude_floor: number
  altitude_ceiling: number
  effective_time?: {
    start: string
    end: string
  }
  authority: string
  description: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  laanc_enabled?: boolean
  b4ufly_status: 'CLEAR' | 'AUTHORIZATION_REQUIRED' | 'RESTRICTED' | 'PROHIBITED'
}

export interface PlanningWeatherStation {
  location: {
    lat: number
    lon: number
    name?: string
  }
  current: {
    temperature: number
    wind: {
      speed: number
      direction: number
      gusts?: number
    }
    visibility: number
    cloud_coverage: number
    cloud_ceiling?: number
    precipitation: {
      active: boolean
      type?: 'rain' | 'snow' | 'sleet' | 'hail'
      intensity: number
    }
    conditions: string
    pressure: number
    humidity: number
  }
  wind_layers: {
    surface: {
      speed: number
      direction: number
      gusts?: number
    }
    altitude_30ft: {
      speed: number
      direction: number
      gusts?: number
    }
    altitude_300ft: {
      speed: number
      direction: number
      gusts?: number
    }
  }
  hourly_forecast: Array<{
    time: string
    temperature: number
    wind: {
      speed: number
      direction: number
    }
    precipitation_probability: number
    conditions: string
  }>
  daily_forecast: Array<{
    date: string
    high_temp: number
    low_temp: number
    wind: {
      speed: number
      direction: number
    }
    precipitation_probability: number
    conditions: string
  }>
  advisories: Array<{
    type: 'wind' | 'precipitation' | 'visibility' | 'temperature'
    severity: 'LOW' | 'MODERATE' | 'HIGH'
    message: string
    valid_until: string
  }>
  last_updated: string
}

export interface PlanningContextResponse {
  generated_at: string
  tenant_id: string
  location: {
    lat: number
    lon: number
    label: string
  }
  operator_mode: PublicAwarenessOperatorMode
  provider_context: {
    b4ufly: {
      surface_enabled: boolean
      backend_mode: 'disabled' | 'simulated' | 'real'
      adapter_label: string | null
    }
    laanc: {
      surface_enabled: boolean
      backend_mode: 'disabled' | 'simulated' | 'real'
      adapter_label: string | null
    }
    planning_backend: 'platform' | 'provider'
  }
  awareness_evaluation: PublicAwarenessEvaluation | null
  authorization_requirement: {
    required: boolean
    blocked?: boolean
    reason?: string
    grid_id?: string
    facility?: string
    maximum_allowed_altitude?: number
    auto_approval_available?: boolean
    processing_time_estimate?: string
    matched_notice_titles?: string[]
  } | null
  airspace_restrictions: PlanningAirspaceRestriction[]
  weather_stations: PlanningWeatherStation[]
  regulatory_assessment: {
    grid: {
      grid_id: string
      facility: string
      maximum_altitude: number
      authorization_required: boolean
      auto_approval_available: boolean
      source_label: string
    } | null
    notices: Array<{
      id: string
      title: string
      severity: 'blocking' | 'advisory' | 'informational'
      summary: string
      source_label: string
    }>
  }
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

export interface DeveloperPortalSummary {
  generated_at: string
  tenant_id: string
  sandbox_apps: number
  production_apps: number
  pending_production_approvals: number
  approved_production_apps: number
  allowlisted_apps: number
  active_subscriptions: number
  recent_deliveries: number
  delivery_success_rate_percent: number
  docs_assets: number
  sandbox_ready: boolean
  token_enabled_apps: number
  delegated_user_apps: number
  platform_admin_apps: number
}

export type DeveloperAppApprovalStatus = 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED'
export type DeveloperAppAllowlistMode = 'OPEN' | 'ALLOWLIST'
export type DeveloperAppChannel = 'WEB' | 'MOBILE' | 'SERVER_TO_SERVER' | 'B2B' | 'B2C'
export type DeveloperAdminScope = 'SELF_SERVICE' | 'TENANT_ADMIN' | 'PLATFORM_ADMIN'
export type DeveloperTenantAccessPolicy = 'SINGLE_TENANT' | 'MULTI_TENANT'
export type DeveloperAuthProtocol =
  | 'API_KEY'
  | 'OAUTH2_CLIENT_CREDENTIALS'
  | 'OAUTH2_AUTHORIZATION_CODE_PKCE'
  | 'OIDC'
  | 'LOCAL_SESSION'

export interface DeveloperApp {
  id: string
  tenant_id: string
  tenant_name: string
  name: string
  environment: 'SANDBOX' | 'PRODUCTION'
  status: 'ACTIVE' | 'PENDING' | 'DISABLED'
  owner_user_id: string
  owner_name: string
  owner_email: string
  scopes: string[]
  key_preview: string
  key_reference_id: string
  key_storage_mode: 'LOCAL_ENCRYPTED_FILE'
  webhook_base_url: string | null
  created_at: string
  updated_at: string
  last_rotated_at: string
  sandbox_dataset: string
  promotion_source_app_id: string | null
  promotion_source_app_name: string | null
  promoted_at: string | null
  approval: {
    approval_required: boolean
    approval_status: DeveloperAppApprovalStatus
    requested_at: string | null
    requested_by_user_id: string | null
    requested_by_name: string | null
    decided_at: string | null
    decided_by_user_id: string | null
    decided_by_name: string | null
    notes: string | null
  }
  network_policy: {
    ip_allowlist_mode: DeveloperAppAllowlistMode
    allowed_cidrs: string[]
    allow_localhost: boolean
    last_validated_at: string | null
  }
  access_profile: {
    client_channel: DeveloperAppChannel
    admin_scope: DeveloperAdminScope
    tenant_access_policy: DeveloperTenantAccessPolicy
  }
  auth_profile: {
    token_access_enabled: boolean
    delegated_user_access_enabled: boolean
    supported_protocols: DeveloperAuthProtocol[]
    default_protocol: DeveloperAuthProtocol
    oauth_client_type: 'CONFIDENTIAL' | 'PUBLIC'
    redirect_uris: string[]
    issuer_url: string | null
  }
  production_ready: boolean
}

export interface DeveloperAppListResponse {
  apps: DeveloperApp[]
  count: number
}

export interface DeveloperPortalTenantAdminSummary {
  tenant_id: string
  tenant_name: string
  deployment_profile: string
  subscription_tier: string
  apps: number
  production_apps: number
  pending_production_approvals: number
  active_subscriptions: number
}

export interface DeveloperPortalAdminOverview {
  generated_at: string
  current_user: {
    id: string
    name: string
    email: string
  }
  current_tenant_id: string
  owned_apps: number
  tenant_apps: number
  platform_apps: number
  accessible_tenants: number
  pending_approvals: number
  production_apps: number
  active_subscriptions: number
  token_enabled_apps: number
  delegated_user_apps: number
  platform_admin_apps: number
  tenants: DeveloperPortalTenantAdminSummary[]
}

export interface CreateDeveloperAppRequest {
  name?: string
  environment?: 'SANDBOX' | 'PRODUCTION'
  scopes?: string[]
  webhook_base_url?: string
  client_channel?: DeveloperAppChannel
  admin_scope?: DeveloperAdminScope
  tenant_access_policy?: DeveloperTenantAccessPolicy
  token_access_enabled?: boolean
  delegated_user_access_enabled?: boolean
  supported_protocols?: DeveloperAuthProtocol[]
  default_protocol?: DeveloperAuthProtocol
  oauth_client_type?: 'CONFIDENTIAL' | 'PUBLIC'
  redirect_uris?: string[]
  issuer_url?: string
  ip_allowlist_mode?: DeveloperAppAllowlistMode
  allowed_cidrs?: string[]
  allow_localhost?: boolean
  approval_notes?: string
}

export interface UpdateDeveloperAppControlsRequest {
  webhook_base_url?: string | null
  scopes?: string[]
  client_channel?: DeveloperAppChannel
  admin_scope?: DeveloperAdminScope
  tenant_access_policy?: DeveloperTenantAccessPolicy
  token_access_enabled?: boolean
  delegated_user_access_enabled?: boolean
  supported_protocols?: DeveloperAuthProtocol[]
  default_protocol?: DeveloperAuthProtocol
  oauth_client_type?: 'CONFIDENTIAL' | 'PUBLIC'
  redirect_uris?: string[]
  issuer_url?: string | null
  ip_allowlist_mode?: DeveloperAppAllowlistMode
  allowed_cidrs?: string[]
  allow_localhost?: boolean
  approval_notes?: string | null
}

export interface DeveloperAppPromotionRequest extends UpdateDeveloperAppControlsRequest {
  name?: string
}

export interface DeveloperAppPromotionDecisionRequest {
  notes?: string | null
}

export interface WebhookSubscription {
  id: string
  tenant_id: string
  app_id: string
  app_name: string
  name: string
  event_type: string
  endpoint_url: string
  status: 'ACTIVE' | 'PAUSED' | 'ERROR'
  secret_preview: string
  secret_reference_id: string
  secret_storage_mode: 'LOCAL_ENCRYPTED_FILE'
  created_at: string
  updated_at: string
  last_delivery_at: string | null
  last_delivery_status: 'DELIVERED' | 'RETRYING' | 'FAILED' | null
}

export interface WebhookSubscriptionListResponse {
  subscriptions: WebhookSubscription[]
  count: number
}

export interface CreateWebhookSubscriptionRequest {
  app_id: string
  name?: string
  event_type?: string
  endpoint_url?: string
}

export interface WebhookDelivery {
  id: string
  tenant_id: string
  app_id: string
  app_name: string
  subscription_id: string
  subscription_name: string
  event_type: string
  entity_type: string
  entity_id?: string
  status: 'DELIVERED' | 'RETRYING' | 'FAILED'
  attempted_at: string
  response_code: number
  latency_ms: number
  correlation_id?: string
  destination: string
  payload_excerpt: string
}

export interface WebhookDeliveryListResponse {
  deliveries: WebhookDelivery[]
  count: number
}

export interface DeveloperContractAsset {
  id: string
  name: string
  type: 'openapi' | 'guide'
  route: string
  description: string
  updated_at: string
}

export interface DeveloperContractAssetListResponse {
  assets: DeveloperContractAsset[]
  count: number
}

export type HelpAudience = 'ALL' | 'OPERATOR' | 'ADMIN' | 'DEVELOPER'

export interface HelpCategory {
  id: string
  name: string
  audience: HelpAudience
  summary: string
}

export interface HelpArticleSection {
  heading: string
  paragraphs: string[]
  bullets?: string[]
}

export interface HelpArticle {
  id: string
  slug: string
  title: string
  audience: HelpAudience
  category_id: string
  summary: string
  tags: string[]
  related_routes: string[]
  related_contracts: string[]
  updated_at: string
  sections: HelpArticleSection[]
}

export interface HelpSummary {
  generated_at: string
  categories: HelpCategory[]
  featured_articles: Array<Pick<HelpArticle, 'id' | 'slug' | 'title' | 'audience' | 'summary' | 'updated_at'>>
  counts: {
    total_articles: number
    developer_articles: number
    operator_articles: number
    admin_articles: number
  }
}

export interface HelpCategoryListResponse {
  categories: HelpCategory[]
  count: number
}

export interface HelpArticleListResponse {
  articles: HelpArticle[]
  count: number
}

export interface DeveloperDocsIndex {
  generated_at: string
  title: string
  version: string
  openapi_url: string
  contract_count: number
  path_count: number
  operation_count: number
  documented_operation_count: number
  undocumented_operation_count: number
  documentation_complete: boolean
  tag_count: number
  contracts: Array<{
    id: string
    title: string
    version: string
    path_count: number
    operation_count: number
  }>
  undocumented_routes: Array<{
    method: string
    path: string
  }>
}

export interface OpenApiSpec {
  openapi: string
  info: {
    title: string
    version: string
    description?: string
  }
  paths: Record<string, Record<string, any>>
  components?: Record<string, Record<string, any>>
  tags?: Array<{ name: string; description?: string }>
}

export type ConnectorCategory = 'GIS_WORK_ORDER' | 'WORK_ORDER_CASE' | 'OEM_TELEMETRY' | 'PARTNER_EVENT'
export type ConnectorDirection = 'INBOUND' | 'OUTBOUND' | 'BIDIRECTIONAL'
export type ConnectorStatus = 'ACTIVE' | 'PAUSED' | 'ERROR'
export type ConnectorTriggerMode = 'MANUAL' | 'WEBHOOK' | 'EVENT'
export type ConnectorRunStatus = 'SUCCEEDED' | 'WARNING' | 'FAILED'

export interface ConnectorDefinition {
  id: string
  tenant_id: string
  name: string
  category: ConnectorCategory
  direction: ConnectorDirection
  status: ConnectorStatus
  trigger_mode: ConnectorTriggerMode
  source_system: string
  target_entity: 'WORK_ORDER' | 'TELEMETRY_TRACK' | 'PLATFORM_EVENT'
  summary: string
  mapping_version: string
  sandbox_ready: boolean
  supported_actions: string[]
  last_run_at: string | null
  last_run_status: ConnectorRunStatus | null
}

export interface ConnectorListResponse {
  connectors: ConnectorDefinition[]
  count: number
}

export interface ConnectorRun {
  id: string
  tenant_id: string
  connector_id: string
  connector_name: string
  connector_category: ConnectorCategory
  status: ConnectorRunStatus
  action: string
  trigger_mode: ConnectorTriggerMode
  source_system: string
  started_at: string
  completed_at: string
  duration_ms: number
  input_summary: string
  output_summary: string
  result_entity_type: string | null
  result_entity_id: string | null
  warnings: string[]
  correlation_id?: string
  payload_excerpt: Record<string, unknown>
}

export interface ConnectorRunListResponse {
  runs: ConnectorRun[]
  count: number
}

export interface ConnectorRunRequest {
  [key: string]: unknown
}

export interface UpdateConnectorStatusRequest {
  status: ConnectorStatus
}

export interface ConnectorSummary {
  generated_at: string
  tenant_id: string
  stats: {
    total_connectors: number
    active_connectors: number
    paused_connectors: number
    sandbox_ready_connectors: number
    successful_runs_24h: number
    warning_runs_24h: number
    failed_runs_24h: number
  }
  category_breakdown: Array<{
    category: ConnectorCategory
    connectors: number
    last_run_at: string | null
  }>
  recent_sources: Array<{
    connector_id: string
    connector_name: string
    source_system: string
    last_run_at: string | null
    last_run_status: ConnectorRunStatus | null
  }>
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

export type CapabilityStatus = 'real' | 'partial' | 'mock' | 'planned'

export interface PresentationCapability {
  id: string
  name: string
  href: string | null
  surface_type: 'enterprise_route' | 'required_surface'
  status: CapabilityStatus
  source_of_truth: 'platform_api' | 'mixed' | 'ui_local' | 'static' | 'absent'
  surface_enabled: boolean
  summary: string
  blockers: string[]
}

export interface ApiEndpointCapability {
  id: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  status: CapabilityStatus
  source_of_truth: 'server_persisted' | 'server_mock' | 'server_static'
  summary: string
  blockers: string[]
}

export interface PlatformCapabilitiesResponse {
  generated_at: string
  remediation_phase: string
  surfaces: PresentationCapability[]
  api_endpoints: ApiEndpointCapability[]
  summary: {
    surfaces: Record<CapabilityStatus, number>
    api_endpoints: Record<CapabilityStatus, number>
  }
}

export interface CmsSummaryResponse {
  generated_at: string
  phase: 'PHASE_1' | 'PHASE_2' | 'PHASE_3' | 'PHASE_4' | 'PHASE_5' | 'PHASE_6' | 'PHASE_7' | 'PHASE_8' | 'PHASE_9' | 'PHASE_10' | 'PHASE_11'
  subsystem_status:
    | 'SCHEMA_CORE_IMPLEMENTED'
    | 'EDITORIAL_RUNTIME_IMPLEMENTED'
    | 'WORKFLOW_RELEASE_PREVIEW_IMPLEMENTED'
    | 'DELIVERY_MEDIA_QUERY_IMPLEMENTED'
    | 'LOCALIZATION_GRAPHQL_BLUEPRINTS_IMPLEMENTED'
    | 'VISUAL_AUTHORING_RBAC_OPERATIONS_IMPLEMENTED'
    | 'TARGETED_PREVIEW_PERSONALIZATION_IMPLEMENTED'
    | 'EXTENSION_MARKETPLACE_CURRICULUM_IMPLEMENTED'
    | 'ASSESSMENT_AUTHORING_IMPLEMENTED'
    | 'INSTRUCTIONAL_REGULATED_WORKFLOW_IMPLEMENTED'
    | 'STANDALONE_PRODUCTION_HARDENING_AND_REVIEW_IMPLEMENTED'
  migration_state:
    | 'BLOCKED_UNTIL_PHASE_6'
    | 'BLOCKED_PENDING_STANDALONE_VALIDATION'
    | 'BLOCKED_PENDING_STANDALONE_ADOPTION'
  admin_surface_route: string
  scope_model: 'STANDALONE_DEFAULT_WITH_CONSUMER_BINDINGS'
  global_admin_role: 'super_administrator'
  spaces_count: number
  validation_domain_count: number
  schema_count: number
  schema_version_count: number
  entry_count: number
  draft_count: number
  revision_count?: number
  workflow_count?: number
  preview_session_count?: number
  release_count?: number
  media_folder_count?: number
  media_asset_count?: number
  media_rendition_count?: number
  delivery_entry_count?: number
  localization_entry_count?: number
  localized_field_count?: number
  blueprint_count?: number
  blueprint_installation_count?: number
  graphql_root_field_count?: number
  cms_role_count?: number
  cms_role_assignment_count?: number
  cms_api_token_count?: number
  cms_visual_binding_count?: number
  cms_visual_session_count?: number
  cms_operations_environment_count?: number
  cms_webhook_count?: number
  cms_promotion_count?: number
  cms_persona_count?: number
  cms_audience_branch_count?: number
  cms_extension_package_count?: number
  cms_extension_installation_count?: number
  cms_curriculum_course_count?: number
  cms_curriculum_release_bundle_count?: number
  cms_assessment_count?: number
  cms_question_pool_count?: number
  cms_assessment_package_count?: number
  cms_academic_framework_count?: number
  cms_academic_standard_count?: number
  cms_academic_taxonomy_axis_count?: number
  cms_accommodation_profile_count?: number
  cms_differentiation_profile_count?: number
  cms_instructional_workflow_count?: number
  cms_regulated_no_go_count?: number
  cms_backup_count?: number
  cms_restore_count?: number
  cms_benchmark_run_count?: number
  cms_resilience_run_count?: number
  cms_security_review_count?: number
  cms_readiness_review_count?: number
  cms_formal_review_count?: number
  latest_readiness_decision?: 'APPROVED' | 'BLOCKED' | null
  latest_market_position?: 'CRAFTER_CLASS_PLUS_EDUCATION_DIFFERENTIATED' | 'STRAPI_CLASS_PLUS_DIFFERENTIATED' | 'NOT_YET_COMPETITIVE' | null
  tenant_binding_count: number
  first_contract_ids: string[]
  next_recommended_phase:
    | 'PHASE_2_EDITORIAL_RUNTIME'
    | 'PHASE_3_WORKFLOW_RELEASE_PREVIEW'
    | 'PHASE_4_DELIVERY_MEDIA_QUERY'
    | 'PHASE_5_LOCALIZATION_GRAPHQL_BLUEPRINTS'
    | 'PHASE_6_VISUAL_AUTHORING_RBAC_OPERATIONS'
    | 'PHASE_7_TARGETED_PREVIEW_PERSONALIZATION_CURRICULUM'
    | 'PHASE_8_EXTENSION_MARKETPLACE_CURRICULUM'
    | 'PHASE_9_ASSESSMENT_AUTHORING'
    | 'PHASE_10_INSTRUCTIONAL_REGULATED_WORKFLOW'
    | 'PHASE_11_STANDALONE_PRODUCTION_HARDENING'
    | 'PHASE_12_ADOPTION_PLANNING_ONLY'
}

export interface IamSummaryResponse {
  generated_at: string
  phase:
    | 'PHASE_0'
    | 'PHASE_1'
    | 'PHASE_2'
    | 'PHASE_3'
    | 'PHASE_4'
    | 'PHASE_5'
    | 'PHASE_6'
    | 'FULL_IDP_PHASE_A'
    | 'FULL_IDP_PHASE_B'
    | 'FULL_IDP_PHASE_C'
    | 'FULL_IDP_PHASE_D'
    | 'FULL_IDP_PHASE_E'
    | 'FULL_IDP_PHASE_F'
    | 'FULL_IDP_PHASE_G'
    | 'FULL_IDP_PHASE_H'
    | 'FULL_IDP_PHASE_I'
    | 'FULL_IDP_PHASE_J'
    | 'FULL_IDP_PHASE_K'
    | 'FULL_IDP_PHASE_L'
  subsystem_status:
    | 'CAPABILITY_SURFACE_IMPLEMENTED'
    | 'REALM_RBAC_FOUNDATION_IMPLEMENTED'
    | 'CLIENT_PROTOCOL_RUNTIME_IMPLEMENTED'
    | 'AUTHENTICATION_FLOW_RUNTIME_IMPLEMENTED'
    | 'FEDERATION_AND_BROKERING_IMPLEMENTED'
    | 'ADMIN_CONSOLE_AND_THEME_COMPLETION_IMPLEMENTED'
    | 'OPERATIONS_HARDENING_IN_PROGRESS'
    | 'OIDC_AUTHORIZATION_CODE_AND_PKCE_IMPLEMENTED'
    | 'ADVANCED_OAUTH_AND_CLIENT_GOVERNANCE_IMPLEMENTED'
    | 'FULL_SAML_IDP_RUNTIME_IMPLEMENTED'
    | 'CONFIGURABLE_AUTH_FLOW_ENGINE_IMPLEMENTED'
    | 'WEBAUTHN_AND_PASSKEYS_IMPLEMENTED'
    | 'ORGANIZATIONS_AND_PROFILE_SCHEMA_IMPLEMENTED'
    | 'FINE_GRAINED_ADMIN_AUTHORIZATION_IMPLEMENTED'
    | 'AUTHORIZATION_SERVICES_AND_UMA_IMPLEMENTED'
    | 'EXTENSIBILITY_AND_PROVIDER_FRAMEWORK_IMPLEMENTED'
    | 'PRODUCT_NEUTRAL_REFOUNDATION_IMPLEMENTED'
    | 'AWS_NATIVE_STANDALONE_PRODUCTIONIZATION_IMPLEMENTED'
    | 'STANDALONE_READINESS_AND_MARKET_POSITION_REVIEW_IMPLEMENTED'
  migration_state: 'BLOCKED_UNTIL_PHASE_6'
  admin_surface_route: string
  scope_model: 'STANDALONE_MULTI_REALM_WITH_CONSUMER_BINDINGS'
  global_admin_role: 'super_administrator'
  realm_count: number
  realm_template_count: number
  realm_binding_count: number
  validation_domain_count: number
  user_count: number
  group_count: number
  role_count: number
  delegated_admin_count: number
  realm_export_count: number
  auth_flow_count?: number
  auth_execution_count?: number
  realm_auth_flow_binding_count?: number
  client_auth_flow_binding_count?: number
  client_count?: number
  client_scope_count?: number
  protocol_mapper_count?: number
  service_account_count?: number
  issued_token_count?: number
  active_signing_key_count?: number
  saml_auth_request_count?: number
  active_saml_auth_request_count?: number
  saml_session_count?: number
  active_saml_session_count?: number
  browser_session_count?: number
  active_browser_session_count?: number
  consent_record_count?: number
  active_consent_record_count?: number
  login_transaction_count?: number
  active_login_transaction_count?: number
  mfa_enrollment_count?: number
  active_mfa_enrollment_count?: number
  password_reset_ticket_count?: number
  email_verification_ticket_count?: number
  failed_login_attempt_count?: number
  active_lockout_count?: number
  profile_schema_count?: number
  profile_record_count?: number
  organization_count?: number
  organization_membership_count?: number
  organization_invitation_count?: number
  admin_permission_count?: number
  admin_policy_count?: number
  admin_evaluation_count?: number
  resource_server_count?: number
  protected_scope_count?: number
  protected_resource_count?: number
  authorization_policy_count?: number
  authorization_permission_count?: number
  authorization_evaluation_count?: number
  permission_ticket_count?: number
  active_permission_ticket_count?: number
  extension_interface_count?: number
  extension_package_count?: number
  extension_provider_count?: number
  active_extension_provider_count?: number
  extension_binding_count?: number
  active_extension_binding_count?: number
  theme_package_provider_count?: number
  deployment_profile_count?: number
  active_deployment_topology_mode?: IamDeploymentTopologyMode
  bootstrap_package_count?: number
  benchmark_suite_count?: number
  benchmark_run_count?: number
  recovery_profile_count?: number
  recovery_drill_count?: number
  standalone_health_check_count?: number
  standards_matrix_count?: number
  interoperability_check_count?: number
  differentiation_area_count?: number
  formal_review_count?: number
  latest_market_position?: IamMarketPosition | null
  latest_adoption_recommendation?: IamAdoptionRecommendation | null
  passkey_credential_count?: number
  active_passkey_credential_count?: number
  webauthn_registration_challenge_count?: number
  active_webauthn_registration_challenge_count?: number
  webauthn_authentication_challenge_count?: number
  active_webauthn_authentication_challenge_count?: number
  identity_provider_count?: number
  active_identity_provider_count?: number
  user_federation_provider_count?: number
  active_user_federation_provider_count?: number
  linked_identity_count?: number
  federation_sync_job_count?: number
  federation_event_count?: number
  realm_theme_count?: number
  localization_bundle_count?: number
  notification_template_count?: number
  notification_delivery_count?: number
  backup_count?: number
  restore_count?: number
  key_rotation_count?: number
  resilience_run_count?: number
  readiness_review_count?: number
  operations_health?: 'HEALTHY' | 'DEGRADED' | 'FAILED'
  latest_readiness_decision?: 'APPROVED' | 'BLOCKED' | null
  security_audit_request_count?: number
  security_audit_failure_count?: number
  first_contract_ids: string[]
  next_recommended_phase:
    | 'PHASE_1_REALM_RBAC_FOUNDATION'
    | 'PHASE_2_CLIENT_PROTOCOL_RUNTIME'
    | 'PHASE_3_AUTHENTICATION_FLOW_RUNTIME'
    | 'PHASE_4_FEDERATION_AND_BROKERING'
    | 'PHASE_5_ADMIN_CONSOLE_AND_THEME_COMPLETION'
    | 'PHASE_6_OPERATIONS_HARDENING'
    | 'FULL_IDP_PHASE_B_ADVANCED_OAUTH_AND_CLIENT_GOVERNANCE'
    | 'FULL_IDP_PHASE_C_SAML_COMPLETION'
    | 'FULL_IDP_PHASE_D_AUTHENTICATION_FLOW_ENGINE'
    | 'FULL_IDP_PHASE_E_WEBAUTHN_AND_PASSKEYS'
    | 'FULL_IDP_PHASE_F_ORGANIZATIONS_AND_PROFILE_SCHEMA'
    | 'FULL_IDP_PHASE_G_FINE_GRAINED_ADMIN_AUTHORIZATION'
    | 'FULL_IDP_PHASE_H_AUTHORIZATION_SERVICES_AND_UMA'
    | 'FULL_IDP_PHASE_I_EXTENSIBILITY_AND_PROVIDER_FRAMEWORK'
    | 'FULL_IDP_PHASE_J_PRODUCT_NEUTRAL_REFOUNDATION'
    | 'FULL_IDP_PHASE_K_AWS_NATIVE_STANDALONE_PRODUCTIONIZATION'
    | 'FULL_IDP_PHASE_L_STANDALONE_READINESS_AND_MARKET_POSITION_REVIEW'
    | 'FULL_IDP_PHASE_M_ADOPTION_PLANNING_ONLY'
}

export type IamRealmScopeKind = 'PLATFORM_DEFAULT' | 'STANDALONE_VALIDATION' | 'TENANT_OVERRIDE'
export type IamRealmStatus = 'STANDALONE_VALIDATION' | 'READY_FOR_FOUNDATION_PHASE' | 'ACTIVE' | 'ARCHIVED'
export type IamRealmTemplateKind = 'FOUNDATION' | 'FIRST_PARTY' | 'EMBEDDED_PARTNER' | 'TENANT_OVERRIDE'
export type IamRealmTemplateStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
export type IamBindingTargetKind = 'APPLICATION' | 'TENANT_SPACE'
export type IamRealmBindingMode = 'DIRECT' | 'DEFAULT' | 'OVERRIDE'
export type IamTenantRealmRole = 'PRIMARY' | 'EXCEPTION'
export type IamUserStatus = 'STAGED' | 'ACTIVE' | 'DISABLED'
export type IamGroupStatus = 'ACTIVE' | 'ARCHIVED'
export type IamRoleKind = 'REALM_ROLE' | 'CLIENT_ROLE' | 'COMPOSITE_ROLE'
export type IamRoleStatus = 'ACTIVE' | 'ARCHIVED'
export type IamDeploymentTopologyMode =
  | 'AWS_SINGLE_REGION_COST_OPTIMIZED'
  | 'AWS_SINGLE_REGION_HA'
  | 'AWS_MULTI_REGION_WARM_STANDBY'
export type IamReviewStatus = 'PASS' | 'WARN' | 'FAIL'
export type IamMarketPosition = 'KEYCLOAK_COMPETITIVE' | 'KEYCLOAK_PLUS_DIFFERENTIATED' | 'NOT_YET_COMPETITIVE'
export type IamAdoptionRecommendation = 'PROCEED_TO_PHASE_M_ADOPTION_PLANNING' | 'HOLD_FOR_REMEDIATION'
export type IamDelegatedAdminPrincipalKind = 'USER' | 'GROUP'
export type IamDelegatedAdminStatus = 'ACTIVE' | 'DISABLED'
export type IamRealmExportStatus = 'READY'
export type IamAuthFlowKind = 'BROWSER' | 'DIRECT_GRANT' | 'ACCOUNT_CONSOLE' | 'SUBFLOW'
export type IamAuthFlowStatus = 'ACTIVE' | 'ARCHIVED'
export type IamAuthExecutionKind = 'AUTHENTICATOR' | 'SUBFLOW'
export type IamAuthExecutionRequirement = 'REQUIRED' | 'ALTERNATIVE' | 'CONDITIONAL' | 'DISABLED'
export type IamAuthenticatorKind = 'USERNAME_PASSWORD' | 'PASSKEY_WEBAUTHN' | 'REQUIRED_ACTIONS' | 'CONSENT' | 'TOTP_MFA' | 'ALLOW'
export type IamFlowConditionKind =
  | 'ALWAYS'
  | 'USER_HAS_REQUIRED_ACTIONS'
  | 'USER_HAS_PASSKEY_ENABLED'
  | 'CONSENT_REQUIRED'
  | 'USER_HAS_MFA_ENABLED'
  | 'CLIENT_PROTOCOL_IS_OIDC'
  | 'CLIENT_PROTOCOL_IS_SAML'
export type IamClientProtocol = 'OIDC' | 'SAML'
export type IamClientAccessType = 'PUBLIC' | 'CONFIDENTIAL' | 'BEARER_ONLY'
export type IamClientStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED'
export type IamClientScopeStatus = 'ACTIVE' | 'ARCHIVED'
export type IamMapperStatus = 'ACTIVE' | 'DISABLED'
export type IamMapperSourceKind =
  | 'USER_PROPERTY'
  | 'USERNAME'
  | 'SUBJECT_ID'
  | 'REALM_ROLE_NAMES'
  | 'GROUP_NAMES'
  | 'STATIC_VALUE'
  | 'CLIENT_ID'
  | 'SERVICE_ACCOUNT'
export type IamScopeAssignmentType = 'DEFAULT' | 'OPTIONAL'
export type IamSubjectKind = 'USER' | 'SERVICE_ACCOUNT'
export type IamTokenStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED'
export type IamLoginNextStep = 'AUTHENTICATED' | 'REQUIRED_ACTIONS' | 'CONSENT_REQUIRED' | 'MFA_REQUIRED'
export type IamAccountAssuranceLevel = 'PASSWORD' | 'MFA' | 'PASSKEY'
export type IamSessionStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED'
export type IamIdentityProviderProtocol = 'OIDC' | 'SAML'
export type IamIdentityProviderStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED'
export type IamIdentityProviderLinkPolicy = 'EMAIL_MATCH' | 'AUTO_CREATE' | 'MANUAL'
export type IamIdentityProviderLoginMode = 'BROKER_ONLY' | 'OPTIONAL'
export type IamIdentityProviderSyncMode = 'LOGIN_ONLY' | 'IMPORT'
export type IamUserFederationProviderKind = 'LDAP' | 'SCIM' | 'AWS_IDENTITY_CENTER' | 'COGNITO_USER_POOL'
export type IamUserFederationProviderStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED'
export type IamUserFederationImportStrategy = 'IMPORT' | 'READ_ONLY'
export type IamLinkedIdentitySourceType = 'BROKER' | 'FEDERATION'
export type IamFederationSyncJobStatus = 'COMPLETED' | 'FAILED'
export type IamFederationEventKind =
  | 'BROKER_LINK_CREATED'
  | 'BROKER_USER_CREATED'
  | 'BROKER_LOGIN_COMPLETED'
  | 'FEDERATION_USER_IMPORTED'
  | 'FEDERATION_USER_LINKED'
  | 'FEDERATION_SYNC_COMPLETED'
export type IamRealmThemePreset = 'PLATFORM_DEFAULT' | 'OCEAN' | 'FOREST' | 'SUNSET' | 'SLATE'
export type IamRealmLocalizationMode = 'REALM_DEFAULT' | 'CUSTOM'
export type IamNotificationTemplateKey = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' | 'MFA_ENROLLMENT' | 'TEST_NOTIFICATION'
export type IamNotificationChannel = 'EMAIL'
export type IamNotificationDeliveryMode = 'LOCAL_DELIVERY_LEDGER'
export type IamNotificationDeliveryStatus = 'DELIVERED'
export type IamUserProfileSchemaStatus = 'ACTIVE' | 'ARCHIVED'
export type IamUserProfileAttributeType =
  | 'STRING'
  | 'TEXT'
  | 'EMAIL'
  | 'PHONE'
  | 'URL'
  | 'BOOLEAN'
  | 'NUMBER'
  | 'DATE'
  | 'ENUM'
export type IamUserProfileActorScope = 'SELF' | 'ADMIN'
export type IamUserProfilePrimitive = string | boolean | number | null
export type IamUserProfileAttributeValue = IamUserProfilePrimitive | IamUserProfilePrimitive[]
export type IamOrganizationKind = 'COMPANY' | 'PARTNER' | 'PUBLIC_SECTOR' | 'TEAM' | 'EDUCATION'
export type IamOrganizationStatus = 'ACTIVE' | 'ARCHIVED'
export type IamOrganizationMembershipRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
export type IamOrganizationMembershipStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'REVOKED'
export type IamOrganizationInvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED'
export type IamAdminPermissionDomain = 'USERS' | 'GROUPS' | 'ROLES' | 'CLIENTS'
export type IamAdminPermissionAction = 'READ' | 'MANAGE' | 'IMPERSONATE'
export type IamAdminPermissionScopeKind = 'REALM' | 'SCOPED'
export type IamAdminPolicyPrincipalKind = 'USER' | 'GROUP' | 'ROLE'
export type IamAdminPolicyStatus = 'ACTIVE' | 'DISABLED'
export type IamAuthzResourceServerStatus = 'ACTIVE' | 'ARCHIVED'
export type IamAuthzScopeStatus = 'ACTIVE' | 'DISABLED'
export type IamAuthzResourceStatus = 'ACTIVE' | 'DISABLED'
export type IamAuthzPolicyStatus = 'ACTIVE' | 'DISABLED'
export type IamAuthzPermissionStatus = 'ACTIVE' | 'DISABLED'
export type IamAuthzEnforcementMode = 'ENFORCING' | 'PERMISSIVE' | 'DISABLED'
export type IamAuthzDecisionStrategy = 'AFFIRMATIVE' | 'UNANIMOUS'
export type IamAuthzPolicyKind = 'ANY' | 'USER' | 'GROUP' | 'ROLE' | 'CLIENT' | 'OWNER'
export type IamPermissionTicketStatus = 'GRANTED' | 'DENIED' | 'EXCHANGED' | 'EXPIRED'
export type IamExtensionInterfaceKind = 'AUTHENTICATOR' | 'FEDERATION' | 'STORAGE' | 'POLICY' | 'EVENT_LISTENER' | 'THEME_PACKAGE'
export type IamExtensionPackageStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
export type IamExtensionProviderStatus = 'ACTIVE' | 'DRAFT' | 'DISABLED' | 'ARCHIVED'
export type IamExtensionBindingStatus = 'ACTIVE' | 'DISABLED'
export type IamExtensionSourceType = 'BUILT_IN' | 'VALIDATION_PACKAGE' | 'THIRD_PARTY_PREPARED'
export type IamExtensionDeliveryModel = 'INLINE_RUNTIME' | 'AWS_LAMBDA' | 'EVENTBRIDGE_CONSUMER' | 'S3_THEME_PACKAGE' | 'DYNAMODB_STORAGE_ADAPTER'
export type IamProviderImplementationMode = 'BUILT_IN' | 'MANIFEST_BOUND'
export type IamSecurityRequestCategory =
  | 'PUBLIC_AUTH'
  | 'ACCOUNT'
  | 'ADMIN'
  | 'PROTOCOL'
  | 'FEDERATION'
  | 'EXPERIENCE'
  | 'REALM_ADMIN'
export type IamSecurityRequestOutcome = 'SUCCESS' | 'FAILURE'
export type IamValidationCheckStatus = 'PASS' | 'WARN'

export interface IamPublicRealmCatalogClient {
  id: string
  client_id: string
  name: string
  protocol: IamClientProtocol
  base_url: string | null
  root_url: string | null
}

export interface IamPublicRealmCatalogRealm {
  id: string
  name: string
  summary: string
  supported_protocols: Array<'OIDC' | 'OAUTH2' | 'SAML'>
  clients: IamPublicRealmCatalogClient[]
}

export interface IamPublicRealmCatalogResponse {
  generated_at: string
  realms: IamPublicRealmCatalogRealm[]
  count: number
}

export interface IamAuthenticationSummary {
  browser_session_count: number
  active_browser_session_count: number
  consent_record_count: number
  active_consent_record_count: number
  login_transaction_count: number
  active_login_transaction_count: number
  mfa_enrollment_count: number
  active_mfa_enrollment_count: number
  password_reset_ticket_count: number
  email_verification_ticket_count: number
}

export interface IamLoginFlowUser {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
}

export interface IamLoginFlowClient {
  id: string
  client_id: string
  name: string
  protocol: IamClientProtocol
}

export interface IamLoginResponse {
  realm_id: string
  next_step: IamLoginNextStep
  login_transaction_id: string | null
  session_id: string | null
  user: IamLoginFlowUser
  client: IamLoginFlowClient | null
  pending_required_actions: string[]
  pending_scope_consent: string[]
  pending_mfa: boolean
  post_login_destination: string
}

export interface IamAuthorizationRequestRecord {
  id: string
  realm_id: string
  client_id: string
  client_name: string
  redirect_uri: string
  response_type: 'code'
  response_mode: 'query'
  requested_scope_names: string[]
  state: string | null
  nonce: string | null
  prompt_values: string[]
  code_challenge: string | null
  code_challenge_method: 'plain' | 'S256' | null
  created_at: string
  expires_at: string
  status: 'PENDING' | 'AUTHORIZED' | 'CANCELLED' | 'EXPIRED'
}

export interface IamAuthorizationRequestDetailResponse {
  request: IamAuthorizationRequestRecord
  can_auto_continue: boolean
}

export interface IamAuthorizationContinuationResponse {
  status: 'AUTHORIZED' | 'ERROR' | 'INTERACTION_REQUIRED'
  request: IamAuthorizationRequestRecord
  redirect_url?: string
  error?: string
  error_description?: string
  authorization_code_id?: string
  expires_at?: string
  login_response?: IamLoginResponse
}

export interface IamPasswordResetTicketResponse {
  ticket_id: string
  realm_id: string
  user_id: string
  delivery_mode: 'LOCAL_VALIDATION_PREVIEW'
  code_preview: string
  expires_at: string
}

export interface IamEmailVerificationTicketResponse {
  ticket_id: string
  realm_id: string
  user_id: string
  delivery_mode: 'LOCAL_VALIDATION_PREVIEW'
  code_preview: string
  expires_at: string
}

export interface IamAccountSessionSummary {
  session_id: string
  realm_id: string
  user_id: string
  client_id: string | null
  client_identifier: string | null
  client_name: string | null
  client_protocol: IamClientProtocol | null
  scope_names: string[]
  assurance_level: IamAccountAssuranceLevel
  authenticated_at: string
  issued_at: string
  last_seen_at: string
  expires_at: string
  status: IamSessionStatus
  is_current: boolean
}

export interface IamAccountSessionContextResponse {
  realm_id: string
  session: IamAccountSessionSummary
  user: IamLoginFlowUser
  email_verified_at: string | null
  pending_required_actions: string[]
  mfa_enabled: boolean
}

export interface IamAccountProfileResponse {
  realm_id: string
  user: IamLoginFlowUser
  email_verified_at: string | null
  pending_required_actions: string[]
  profile_schema: IamUserProfileSchemaRecord
  profile_attributes: Record<string, IamUserProfileAttributeValue>
}

export interface IamAccountSecurityResponse {
  realm_id: string
  user_id: string
  email_verified_at: string | null
  pending_required_actions: string[]
  mfa_enabled: boolean
  passkey_count: number
  passwordless_ready: boolean
  totp_reference_id: string | null
  backup_codes_reference_id: string | null
  last_login_at: string | null
  last_password_updated_at: string | null
  last_mfa_authenticated_at: string | null
  last_passkey_authenticated_at: string | null
  failed_login_attempt_count: number
  last_failed_login_at: string | null
  lockout_until: string | null
}

export interface BeginIamMfaEnrollmentResponse {
  enrollment_id: string
  realm_id: string
  user_id: string
  otpauth_uri: string
  shared_secret: string
  backup_codes: string[]
  expires_at: string
}

export type IamWebAuthnTransport = 'SOFTWARE' | 'INTERNAL' | 'HYBRID' | 'USB' | 'NFC' | 'BLE'
export type IamWebAuthnAlgorithm = 'ES256'

export interface IamUserProfileAttributeDefinition {
  id: string
  key: string
  label: string
  type: IamUserProfileAttributeType
  required: boolean
  multivalued: boolean
  placeholder: string | null
  help_text: string | null
  allowed_values: string[]
  regex_pattern: string | null
  view_scopes: IamUserProfileActorScope[]
  edit_scopes: IamUserProfileActorScope[]
  synthetic: boolean
  order_index: number
}

export interface IamUserProfileSchemaRecord {
  id: string
  realm_id: string
  display_name: string
  summary: string
  status: IamUserProfileSchemaStatus
  synthetic: boolean
  attributes: IamUserProfileAttributeDefinition[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamUserProfileRecord {
  id: string
  realm_id: string
  user_id: string
  attributes: Record<string, IamUserProfileAttributeValue>
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamUserProfileSchemasResponse {
  generated_at: string
  schemas: IamUserProfileSchemaRecord[]
  count: number
}

export interface IamOrganizationRecord {
  id: string
  realm_id: string
  name: string
  slug: string
  summary: string
  kind: IamOrganizationKind
  status: IamOrganizationStatus
  domain_hint: string | null
  linked_identity_provider_aliases: string[]
  synthetic: boolean
  source_organization_id: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamOrganizationMembershipRecord {
  id: string
  realm_id: string
  organization_id: string
  user_id: string
  role: IamOrganizationMembershipRole
  status: IamOrganizationMembershipStatus
  synthetic: boolean
  invited_at: string | null
  joined_at: string | null
  suspended_at: string | null
  revoked_at: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamOrganizationInvitationRecord {
  id: string
  realm_id: string
  organization_id: string
  email: string
  role: IamOrganizationMembershipRole
  status: IamOrganizationInvitationStatus
  linked_identity_provider_aliases: string[]
  invited_user_id: string | null
  accepted_membership_id: string | null
  expires_at: string
  accepted_at: string | null
  revoked_at: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamOrganizationsResponse {
  generated_at: string
  organizations: IamOrganizationRecord[]
  count: number
}

export interface IamOrganizationMembershipsResponse {
  generated_at: string
  memberships: Array<IamOrganizationMembershipRecord & {
    organization_name: string
    username: string
    email: string
  }>
  count: number
}

export interface IamOrganizationInvitationsResponse {
  generated_at: string
  invitations: Array<IamOrganizationInvitationRecord & {
    organization_name: string
  }>
  count: number
}

export interface IamAccountOrganizationsResponse {
  generated_at: string
  organizations: Array<{
    organization: IamOrganizationRecord
    membership: IamOrganizationMembershipRecord | null
    pending_invitations: IamOrganizationInvitationRecord[]
  }>
  count: number
}

export interface UpdateIamUserProfileSchemaRequest {
  display_name?: string
  summary?: string
  status?: IamUserProfileSchemaStatus
  attributes?: IamUserProfileAttributeDefinition[]
}

export interface UpdateIamUserProfileRequest {
  attributes?: Record<string, IamUserProfileAttributeValue>
}

export interface CreateIamOrganizationRequest {
  realm_id: string
  name: string
  summary: string
  kind?: IamOrganizationKind
  status?: IamOrganizationStatus
  domain_hint?: string | null
  linked_identity_provider_aliases?: string[]
  source_organization_id?: string | null
}

export interface UpdateIamOrganizationRequest {
  name?: string
  summary?: string
  kind?: IamOrganizationKind
  status?: IamOrganizationStatus
  domain_hint?: string | null
  linked_identity_provider_aliases?: string[]
}

export interface CreateIamOrganizationMembershipRequest {
  realm_id: string
  organization_id: string
  user_id: string
  role?: IamOrganizationMembershipRole
  status?: IamOrganizationMembershipStatus
}

export interface UpdateIamOrganizationMembershipRequest {
  role?: IamOrganizationMembershipRole
  status?: IamOrganizationMembershipStatus
}

export interface CreateIamOrganizationInvitationRequest {
  realm_id: string
  organization_id: string
  email: string
  role?: IamOrganizationMembershipRole
  linked_identity_provider_aliases?: string[]
}

export interface IamAdminPermissionRecord {
  id: string
  realm_id: string
  name: string
  summary: string
  domain: IamAdminPermissionDomain
  actions: IamAdminPermissionAction[]
  scope_kind: IamAdminPermissionScopeKind
  managed_user_ids: string[]
  managed_group_ids: string[]
  managed_role_ids: string[]
  managed_client_ids: string[]
  synthetic: boolean
  source_delegated_admin_id: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamAdminPermissionsResponse {
  generated_at: string
  permissions: IamAdminPermissionRecord[]
  count: number
}

export interface CreateIamAdminPermissionRequest {
  realm_id: string
  name: string
  summary: string
  domain: IamAdminPermissionDomain
  actions: IamAdminPermissionAction[]
  scope_kind?: IamAdminPermissionScopeKind
  managed_user_ids?: string[]
  managed_group_ids?: string[]
  managed_role_ids?: string[]
  managed_client_ids?: string[]
}

export interface UpdateIamAdminPermissionRequest {
  name?: string
  summary?: string
  actions?: IamAdminPermissionAction[]
  scope_kind?: IamAdminPermissionScopeKind
  managed_user_ids?: string[]
  managed_group_ids?: string[]
  managed_role_ids?: string[]
  managed_client_ids?: string[]
}

export interface IamAdminPolicyRecord {
  id: string
  realm_id: string
  name: string
  summary: string
  principal_kind: IamAdminPolicyPrincipalKind
  principal_id: string
  principal_label: string
  permission_ids: string[]
  status: IamAdminPolicyStatus
  synthetic: boolean
  source_delegated_admin_id: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamAdminPoliciesResponse {
  generated_at: string
  policies: IamAdminPolicyRecord[]
  count: number
}

export interface CreateIamAdminPolicyRequest {
  realm_id: string
  name: string
  summary: string
  principal_kind: IamAdminPolicyPrincipalKind
  principal_id: string
  principal_label: string
  permission_ids: string[]
  status?: IamAdminPolicyStatus
}

export interface UpdateIamAdminPolicyRequest {
  name?: string
  summary?: string
  principal_label?: string
  permission_ids?: string[]
  status?: IamAdminPolicyStatus
}

export interface IamAdminEvaluationRecord {
  id: string
  realm_id: string
  actor_user_id: string
  actor_username: string
  actor_group_ids: string[]
  actor_role_ids: string[]
  domain: IamAdminPermissionDomain
  action: IamAdminPermissionAction
  target_resource_id: string | null
  target_resource_label: string | null
  allowed: boolean
  reason: string
  route: string
  method: string
  created_at: string
}

export interface IamAdminEvaluationsResponse {
  generated_at: string
  evaluations: IamAdminEvaluationRecord[]
  count: number
}

export interface IamResourceServerRecord {
  id: string
  realm_id: string
  client_id: string
  client_record_id: string
  name: string
  summary: string
  status: IamAuthzResourceServerStatus
  enforcement_mode: IamAuthzEnforcementMode
  decision_strategy: IamAuthzDecisionStrategy
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamResourceServersResponse {
  generated_at: string
  resource_servers: IamResourceServerRecord[]
  count: number
}

export interface CreateIamResourceServerRequest {
  realm_id: string
  client_id: string
  name: string
  summary: string
  status?: IamAuthzResourceServerStatus
  enforcement_mode?: IamAuthzEnforcementMode
  decision_strategy?: IamAuthzDecisionStrategy
}

export interface UpdateIamResourceServerRequest {
  name?: string
  summary?: string
  status?: IamAuthzResourceServerStatus
  enforcement_mode?: IamAuthzEnforcementMode
  decision_strategy?: IamAuthzDecisionStrategy
}

export interface IamProtectedScopeRecord {
  id: string
  realm_id: string
  resource_server_id: string
  name: string
  summary: string
  status: IamAuthzScopeStatus
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamProtectedScopesResponse {
  generated_at: string
  scopes: IamProtectedScopeRecord[]
  count: number
}

export interface CreateIamProtectedScopeRequest {
  realm_id: string
  resource_server_id: string
  name: string
  summary: string
  status?: IamAuthzScopeStatus
}

export interface UpdateIamProtectedScopeRequest {
  name?: string
  summary?: string
  status?: IamAuthzScopeStatus
}

export interface IamProtectedResourceRecord {
  id: string
  realm_id: string
  resource_server_id: string
  name: string
  summary: string
  uri: string | null
  type_label: string | null
  status: IamAuthzResourceStatus
  owner_user_ids: string[]
  scope_ids: string[]
  attributes: Record<string, string[]>
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamProtectedResourcesResponse {
  generated_at: string
  resources: IamProtectedResourceRecord[]
  count: number
}

export interface CreateIamProtectedResourceRequest {
  realm_id: string
  resource_server_id: string
  name: string
  summary: string
  uri?: string | null
  type_label?: string | null
  status?: IamAuthzResourceStatus
  owner_user_ids?: string[]
  scope_ids?: string[]
  attributes?: Record<string, string[]>
}

export interface UpdateIamProtectedResourceRequest {
  name?: string
  summary?: string
  uri?: string | null
  type_label?: string | null
  status?: IamAuthzResourceStatus
  owner_user_ids?: string[]
  scope_ids?: string[]
  attributes?: Record<string, string[]>
}

export interface IamAuthorizationPolicyRecord {
  id: string
  realm_id: string
  resource_server_id: string
  name: string
  summary: string
  kind: IamAuthzPolicyKind
  status: IamAuthzPolicyStatus
  principal_user_ids: string[]
  principal_group_ids: string[]
  principal_role_ids: string[]
  principal_client_ids: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamAuthorizationPoliciesResponse {
  generated_at: string
  policies: IamAuthorizationPolicyRecord[]
  count: number
}

export interface CreateIamAuthorizationPolicyRequest {
  realm_id: string
  resource_server_id: string
  name: string
  summary: string
  kind: IamAuthzPolicyKind
  status?: IamAuthzPolicyStatus
  principal_user_ids?: string[]
  principal_group_ids?: string[]
  principal_role_ids?: string[]
  principal_client_ids?: string[]
}

export interface UpdateIamAuthorizationPolicyRequest {
  name?: string
  summary?: string
  status?: IamAuthzPolicyStatus
  principal_user_ids?: string[]
  principal_group_ids?: string[]
  principal_role_ids?: string[]
  principal_client_ids?: string[]
}

export interface IamAuthorizationPermissionRecord {
  id: string
  realm_id: string
  resource_server_id: string
  name: string
  summary: string
  status: IamAuthzPermissionStatus
  resource_ids: string[]
  scope_ids: string[]
  policy_ids: string[]
  decision_strategy: IamAuthzDecisionStrategy
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamAuthorizationPermissionsResponse {
  generated_at: string
  permissions: IamAuthorizationPermissionRecord[]
  count: number
}

export interface CreateIamAuthorizationPermissionRequest {
  realm_id: string
  resource_server_id: string
  name: string
  summary: string
  status?: IamAuthzPermissionStatus
  resource_ids: string[]
  scope_ids: string[]
  policy_ids: string[]
  decision_strategy?: IamAuthzDecisionStrategy
}

export interface UpdateIamAuthorizationPermissionRequest {
  name?: string
  summary?: string
  status?: IamAuthzPermissionStatus
  resource_ids?: string[]
  scope_ids?: string[]
  policy_ids?: string[]
  decision_strategy?: IamAuthzDecisionStrategy
}

export interface IamAuthorizationEvaluationRecord {
  id: string
  realm_id: string
  resource_server_id: string
  requester_client_id: string | null
  subject_kind: IamSubjectKind
  subject_id: string
  resource_id: string
  requested_scope_names: string[]
  granted_scope_names: string[]
  allowed: boolean
  reason: string
  matched_policy_ids: string[]
  matched_permission_ids: string[]
  created_at: string
}

export interface IamAuthorizationEvaluationsResponse {
  generated_at: string
  evaluations: IamAuthorizationEvaluationRecord[]
  count: number
}

export interface EvaluateIamAuthorizationRequest {
  realm_id: string
  resource_server_id: string
  subject_kind: IamSubjectKind
  subject_id: string
  requester_client_id?: string | null
  resource_id: string
  requested_scope_names: string[] | string
}

export interface IamAuthorizationEvaluationResponse {
  realm_id: string
  resource_server_id: string
  subject_kind: IamSubjectKind
  subject_id: string
  requester_client_id: string | null
  resource_id: string
  requested_scope_names: string[]
  granted_scope_names: string[]
  allowed: boolean
  reason: string
  matched_policy_ids: string[]
  matched_permission_ids: string[]
  evaluation: IamAuthorizationEvaluationRecord
}

export interface IamPermissionTicketRecord {
  id: string
  realm_id: string
  resource_server_id: string
  resource_server_client_id: string
  requester_client_id: string | null
  subject_kind: IamSubjectKind
  subject_id: string
  resource_id: string
  requested_scope_names: string[]
  granted_scope_names: string[]
  status: IamPermissionTicketStatus
  reason: string
  created_at: string
  expires_at: string
  exchanged_at: string | null
  evaluation_id: string | null
  rpt_token_id: string | null
  resource_name?: string
}

export interface IamPermissionTicketsResponse {
  generated_at: string
  permission_tickets: IamPermissionTicketRecord[]
  count: number
}

export interface CreateIamPermissionTicketRequest {
  resource_server_client_id?: string | null
  resource_id: string
  scope_names: string[] | string
  subject_token: string
}

export interface IamExtensionRegistrySummaryResponse {
  generated_at: string
  phase: 'FULL_IDP_PHASE_I'
  subsystem_status: 'EXTENSIBILITY_AND_PROVIDER_FRAMEWORK_IMPLEMENTED'
  extension_interface_count: number
  extension_package_count: number
  extension_provider_count: number
  active_extension_provider_count: number
  extension_binding_count: number
  active_extension_binding_count: number
  theme_package_provider_count: number
  next_recommended_phase: 'FULL_IDP_PHASE_J_PRODUCT_NEUTRAL_REFOUNDATION'
}

export interface IamProviderInterfaceRecord {
  id: string
  kind: IamExtensionInterfaceKind
  name: string
  summary: string
  contract_version: string
  binding_slots: string[]
  configuration_fields: string[]
  runtime_expectations: string[]
}

export interface IamProviderInterfacesResponse {
  generated_at: string
  interfaces: IamProviderInterfaceRecord[]
  count: number
}

export interface IamExtensionPackageRecord {
  id: string
  key: string
  name: string
  summary: string
  publisher: string
  version: string
  source_type: IamExtensionSourceType
  delivery_model: IamExtensionDeliveryModel
  status: IamExtensionPackageStatus
  interface_kinds: IamExtensionInterfaceKind[]
  provider_ids: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamExtensionPackagesResponse {
  generated_at: string
  extensions: IamExtensionPackageRecord[]
  count: number
}

export interface CreateIamExtensionPackageRequest {
  key: string
  name: string
  summary: string
  publisher?: string
  version?: string
  source_type?: IamExtensionSourceType
  delivery_model?: IamExtensionDeliveryModel
  status?: IamExtensionPackageStatus
  interface_kinds: IamExtensionInterfaceKind[]
}

export interface UpdateIamExtensionPackageRequest {
  name?: string
  summary?: string
  publisher?: string
  version?: string
  source_type?: IamExtensionSourceType
  delivery_model?: IamExtensionDeliveryModel
  status?: IamExtensionPackageStatus
  interface_kinds?: IamExtensionInterfaceKind[]
}

export interface IamExtensionProviderRecord {
  id: string
  extension_id: string
  key: string
  name: string
  summary: string
  interface_kind: IamExtensionInterfaceKind
  status: IamExtensionProviderStatus
  implementation_mode: IamProviderImplementationMode
  runtime_reference: string
  supported_protocols: Array<'OIDC' | 'OAUTH2' | 'SAML'>
  binding_slots: string[]
  configuration_fields: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamExtensionProvidersResponse {
  generated_at: string
  providers: IamExtensionProviderRecord[]
  count: number
}

export interface CreateIamExtensionProviderRequest {
  extension_id: string
  key: string
  name: string
  summary: string
  interface_kind: IamExtensionInterfaceKind
  status?: IamExtensionProviderStatus
  implementation_mode?: IamProviderImplementationMode
  runtime_reference?: string
  supported_protocols?: Array<'OIDC' | 'OAUTH2' | 'SAML'>
  binding_slots?: string[]
  configuration_fields?: string[]
}

export interface UpdateIamExtensionProviderRequest {
  name?: string
  summary?: string
  status?: IamExtensionProviderStatus
  implementation_mode?: IamProviderImplementationMode
  runtime_reference?: string
  supported_protocols?: Array<'OIDC' | 'OAUTH2' | 'SAML'>
  binding_slots?: string[]
  configuration_fields?: string[]
}

export interface IamExtensionBindingRecord {
  id: string
  realm_id: string
  provider_id: string
  interface_kind: IamExtensionInterfaceKind
  binding_slot: string
  priority: number
  status: IamExtensionBindingStatus
  configuration: Record<string, string | number | boolean>
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamExtensionBindingsResponse {
  generated_at: string
  bindings: IamExtensionBindingRecord[]
  count: number
}

export interface CreateIamExtensionBindingRequest {
  realm_id: string
  provider_id: string
  binding_slot: string
  priority?: number
  status?: IamExtensionBindingStatus
  configuration?: Record<string, string | number | boolean>
}

export interface UpdateIamExtensionBindingRequest {
  provider_id?: string
  binding_slot?: string
  priority?: number
  status?: IamExtensionBindingStatus
  configuration?: Record<string, string | number | boolean>
}

export interface IamWebAuthnCredentialRecord {
  id: string
  realm_id: string
  user_id: string
  username: string
  email: string
  credential_id: string
  device_label: string
  algorithm: IamWebAuthnAlgorithm
  transports: IamWebAuthnTransport[]
  created_at: string
  last_used_at: string | null
  disabled_at: string | null
  sign_count: number
  status: 'ACTIVE' | 'REVOKED'
  synthetic: boolean
}

export interface IamWebAuthnCredentialsResponse {
  generated_at: string
  credentials: IamWebAuthnCredentialRecord[]
  count: number
}

export interface BeginIamWebAuthnRegistrationResponse {
  challenge_id: string
  realm_id: string
  user_id: string
  username: string
  display_name: string
  challenge: string
  rp_id: string
  rp_name: string
  expires_at: string
}

export interface BeginIamWebAuthnAuthenticationResponse {
  challenge_id: string
  realm_id: string
  user_id: string
  username: string
  display_name: string
  challenge: string
  client_id: string | null
  requested_scope_names: string[]
  allowed_credentials: Array<{
    credential_id: string
    device_label: string
    transports: IamWebAuthnTransport[]
    last_used_at: string | null
  }>
  expires_at: string
}

export interface IamAccountConsentRecord {
  id: string
  realm_id: string
  user_id: string
  client_id: string
  client_identifier: string
  client_name: string
  scope_names: string[]
  granted_at: string
  revoked_at: string | null
}

export interface IamAccountConsentsResponse {
  generated_at: string
  consents: IamAccountConsentRecord[]
  count: number
}

export type IamDelegatedRelationshipKind = 'GUARDIAN' | 'PARENT' | 'CAREGIVER' | 'SPONSOR' | 'AUTHORIZED_PROXY' | 'LEGAL_REPRESENTATIVE'
export type IamDelegatedRelationshipStatus = 'ACTIVE' | 'PAUSED' | 'REVOKED' | 'EXPIRED'
export type IamDelegatedConsentStatus = 'ACTIVE' | 'REVOKED'
export type IamDelegatedConsentRequestStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'CANCELLED' | 'EXPIRED'
export type IamAccountDelegatedParty = 'PRINCIPAL' | 'DELEGATE'

export interface IamAccountDelegatedRelationshipRecord {
  id: string
  realm_id: string
  relationship_kind: IamDelegatedRelationshipKind
  status: IamDelegatedRelationshipStatus
  principal_user_id: string
  delegate_user_id: string
  start_at: string | null
  end_at: string | null
  allowed_scopes: string[]
  allowed_purposes?: string[]
  consent_required: boolean
  consented_scope_names?: string[]
  consented_purpose_names?: string[]
  notes: string[]
  synthetic: boolean
  current_party: IamAccountDelegatedParty
  counterpart_user: IamLoginFlowUser
  can_manage_consents: boolean
}

export interface IamAccountDelegatedRelationshipsResponse {
  generated_at: string
  delegated_relationships: IamAccountDelegatedRelationshipRecord[]
  count: number
}

export interface IamAccountDelegatedConsentRecord {
  id: string
  realm_id: string
  relationship_id: string
  principal_user_id: string
  delegate_user_id: string
  status: IamDelegatedConsentStatus
  scope_names: string[]
  purpose_names: string[]
  granted_at: string
  expires_at: string | null
  revoked_at: string | null
  granted_by_user_id: string
  revoked_by_user_id: string | null
  notes: string[]
  synthetic: boolean
  current_party: IamAccountDelegatedParty
  counterpart_user: IamLoginFlowUser
  can_manage: boolean
  relationship_kind: IamDelegatedRelationshipKind
  relationship_status: IamDelegatedRelationshipStatus
}

export interface IamAccountDelegatedConsentsResponse {
  generated_at: string
  delegated_consents: IamAccountDelegatedConsentRecord[]
  count: number
}

export interface IamAccountDelegatedConsentRequestRecord {
  id: string
  realm_id: string
  relationship_id: string
  principal_user_id: string
  delegate_user_id: string
  requested_by_user_id: string
  status: IamDelegatedConsentRequestStatus
  requested_scope_names: string[]
  requested_purpose_names: string[]
  requested_at: string
  expires_at: string | null
  responded_at: string | null
  decided_by_user_id: string | null
  delegated_consent_id: string | null
  request_notes: string[]
  decision_notes: string[]
  synthetic: boolean
  current_party: IamAccountDelegatedParty
  counterpart_user: IamLoginFlowUser
  can_approve: boolean
  can_deny: boolean
  can_cancel: boolean
  relationship_kind: IamDelegatedRelationshipKind
  relationship_status: IamDelegatedRelationshipStatus
}

export interface IamAccountDelegatedConsentRequestsResponse {
  generated_at: string
  delegated_consent_requests: IamAccountDelegatedConsentRequestRecord[]
  count: number
}

export interface IamAccountDelegatedConsentDecisionResponse {
  request: IamAccountDelegatedConsentRequestRecord
  delegated_consent: IamAccountDelegatedConsentRecord | null
}

export interface IamSecurityAuditEvent {
  id: string
  occurred_at: string
  method: string
  path: string
  realm_id: string | null
  actor_user_id: string | null
  iam_session_id: string | null
  correlation_id: string | null
  status_code: number
  outcome: IamSecurityRequestOutcome
  category: IamSecurityRequestCategory
}

export interface IamSecurityAuditSummary {
  generated_at: string
  request_count: number
  success_count: number
  failure_count: number
  last_24h_request_count: number
  last_24h_failure_count: number
  category_counts: Record<IamSecurityRequestCategory, number>
}

export interface IamSecuritySummaryResponse {
  generated_at: string
  failed_login_attempt_count: number
  active_lockout_count: number
  request_audit: IamSecurityAuditSummary
  admin_security_actions: number
}

export interface IamUserLoginHistoryRecord {
  id: string
  realm_id: string
  user_id: string | null
  username_or_email: string
  client_identifier: string | null
  outcome: 'SUCCESS' | 'FAILED_CREDENTIALS' | 'FAILED_MFA' | 'LOCKED'
  summary: string
  occurred_at: string
}

export interface IamUserLoginHistoryResponse {
  generated_at: string
  realm_id: string
  user_id: string
  login_attempts: IamUserLoginHistoryRecord[]
  count: number
}

export interface IamUserSecuritySummaryResponse {
  generated_at: string
  realm_id: string
  user: IamLoginFlowUser
  status: IamUserStatus
  mfa_enabled: boolean
  email_verified_at: string | null
  last_login_at: string | null
  last_password_updated_at: string | null
  last_mfa_authenticated_at: string | null
  failed_login_attempt_count: number
  last_failed_login_at: string | null
  lockout_until: string | null
  active_session_count: number
  active_token_count: number
}

export interface IamAdminPasswordResetResponse {
  realm_id: string
  user_id: string
  password_updated_at: string
  issued_temporary_password: string | null
  requires_update_password: boolean
  revoked_session_count: number
  revoked_token_count: number
  lockout_cleared: boolean
}

export interface IamAdminRevokeUserSessionsResponse {
  realm_id: string
  user_id: string
  revoked_session_count: number
  revoked_token_count: number
  revoked_at: string | null
}

export interface IamValidationCheck {
  id: string
  name: string
  status: IamValidationCheckStatus
  summary: string
}

export interface IamValidationSummaryResponse {
  generated_at: string
  review_state: 'READY_FOR_REVIEW'
  integration_state: 'NOT_INTEGRATED_WITH_DOWNSTREAM_APPLICATIONS'
  migration_state: 'BLOCKED_PENDING_REVIEW_AND_STANDALONE_ADOPTION'
  checks: IamValidationCheck[]
  agentic_development_notes: string[]
  count: number
}

export interface IamOperationsSummaryResponse {
  generated_at: string
  health: 'HEALTHY' | 'DEGRADED' | 'FAILED'
  backup_count: number
  restore_count: number
  key_rotation_count: number
  resilience_run_count: number
  readiness_review_count: number
  latest_readiness_decision: 'APPROVED' | 'BLOCKED' | null
  deployment_profile_count?: number
  active_deployment_topology_mode?: IamDeploymentTopologyMode
  bootstrap_package_count?: number
  benchmark_suite_count?: number
  benchmark_run_count?: number
  recovery_profile_count?: number
  recovery_drill_count?: number
  standalone_health_check_count?: number
}

export interface IamRunbookRecord {
  id: string
  title: string
  summary: string
}

export interface IamSloDefinition {
  id: string
  name: string
  target: string
  summary: string
}

export interface IamOperationsDiagnosticsResponse {
  generated_at: string
  health: 'HEALTHY' | 'DEGRADED' | 'FAILED'
  subsystem_scope_model: string
  counts: Record<string, number>
  runbooks: IamRunbookRecord[]
  slo_definitions: IamSloDefinition[]
  advisories?: string[]
}

export interface IamBackupArtifactRecord {
  id: string
  label: string
  status: 'READY'
  checksum_sha256: string
  object_key: string
  created_at: string
  created_by_user_id: string
  summary: {
    realm_count: number
    user_count: number
    client_count: number
    active_session_count: number
    active_signing_key_count: number
  }
}

export interface IamRestoreRecord {
  id: string
  backup_id: string
  mode: 'DRY_RUN' | 'EXECUTE'
  status: 'VALIDATED' | 'APPLIED'
  created_at: string
  created_by_user_id: string
  summary: {
    realm_count: number
    user_count: number
    client_count: number
    active_session_count: number
  }
  checksum_sha256: string
}

export interface IamSigningKeyRecord {
  id: string
  realm_id: string | null
  key_id: string
  algorithm: 'RS256'
  created_at: string
  status: 'ACTIVE' | 'RETIRED'
}

export interface IamSigningKeyRotationRecord {
  id: string
  realm_id: string | null
  retired_key_ids: string[]
  activated_key_id: string
  created_at: string
  created_by_user_id: string
}

export interface IamResilienceCheck {
  id: string
  name: string
  status: 'PASS' | 'WARN' | 'FAIL'
  summary: string
  evidence_mode: 'MODELED_RUNTIME_STATE' | 'RECORDED_VALIDATION_OPERATION'
  evidence_summary: string
}

export interface IamResilienceRunRecord {
  id: string
  executed_at: string
  executed_by_user_id: string
  overall_status: 'PASS' | 'WARN' | 'FAIL'
  checks: IamResilienceCheck[]
  count: number
  evidence_mode: 'MODELED_RUNTIME_STATE' | 'RECORDED_VALIDATION_OPERATION'
  evidence_summary: string
  market_claim_ready: boolean
}

export interface IamReadinessCheck {
  id: string
  name: string
  status: 'PASS' | 'WARN' | 'FAIL'
  summary: string
  evidence_mode: 'MODELED_RUNTIME_STATE' | 'RECORDED_VALIDATION_OPERATION'
  evidence_summary: string
}

export interface IamReadinessReviewRecord {
  id: string
  created_at: string
  created_by_user_id: string
  decision: 'APPROVED' | 'BLOCKED'
  notes: string[]
  checks: IamReadinessCheck[]
  count: number
  evidence_mode: 'MODELED_RUNTIME_STATE' | 'RECORDED_VALIDATION_OPERATION'
  evidence_summary: string
  market_claim_ready: boolean
}

export interface IamReadinessReviewResponse {
  generated_at: string
  checks: IamReadinessCheck[]
  latest_review: IamReadinessReviewRecord | null
  evidence_mode: 'MODELED_RUNTIME_STATE' | 'RECORDED_VALIDATION_OPERATION'
  evidence_summary: string
  market_claim_ready: boolean
  runbooks: IamRunbookRecord[]
  slo_definitions: IamSloDefinition[]
  agentic_development_notes: string[]
  claim_boundary_notes: string[]
  count: number
}

export interface IamDeploymentResourceRecord {
  id: string
  label: string
  service: string
  category: 'EDGE' | 'EXECUTION' | 'DATA' | 'SECURITY' | 'ORCHESTRATION' | 'NOTIFICATION' | 'OBSERVABILITY'
  status: 'READY' | 'PLANNED'
  summary: string
}

export interface IamDeploymentChangeRecord {
  id: string
  changed_at: string
  changed_by_user_id: string
  summary: string
}

export interface IamDeploymentProfileRecord {
  id: string
  name: string
  summary: string
  topology_mode: IamDeploymentTopologyMode
  readiness_status: 'READY_FOR_STANDALONE_DEPLOYMENT' | 'NEEDS_REVIEW'
  regions: string[]
  data_plane: 'DYNAMODB_AND_S3'
  secret_plane: 'AWS_KMS_AND_SECRETS_MANAGER'
  orchestration_plane: 'STEP_FUNCTIONS_AND_EVENTBRIDGE'
  edge_plane: 'CLOUDFRONT_WAF_ROUTE53'
  notification_plane: 'SES_AND_SNS'
  observability_plane: 'CLOUDWATCH_XRAY_EVENTBRIDGE'
  estimated_monthly_cost_band: string
  operator_notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamDeploymentProfileResponse {
  generated_at: string
  active_profile: IamDeploymentProfileRecord
  resources: IamDeploymentResourceRecord[]
  supported_topology_modes: IamDeploymentTopologyMode[]
  change_history: IamDeploymentChangeRecord[]
  count: number
}

export interface IamBootstrapEnvironmentVariable {
  key: string
  required: boolean
  summary: string
}

export interface IamBootstrapArtifactRecord {
  path: string
  summary: string
}

export interface IamBootstrapPackageRecord {
  id: string
  version_label: string
  summary: string
  generated_at: string
  generated_by_user_id: string
  topology_mode: string
  environment_variables: IamBootstrapEnvironmentVariable[]
  artifacts: IamBootstrapArtifactRecord[]
  aws_service_dependencies: string[]
  bootstrap_steps: string[]
  validation_steps: string[]
}

export interface IamBootstrapPackageResponse {
  generated_at: string
  latest_package: IamBootstrapPackageRecord
  packages: IamBootstrapPackageRecord[]
  count: number
}

export interface IamStandaloneHealthCheck {
  id: string
  name: string
  status: 'PASS' | 'WARN' | 'FAIL'
  summary: string
}

export interface IamStandaloneHealthResponse {
  generated_at: string
  overall_status: 'HEALTHY' | 'DEGRADED' | 'FAILED'
  checks: IamStandaloneHealthCheck[]
  advisories: string[]
  count: number
}

export interface IamBenchmarkSuiteRecord {
  id: string
  name: string
  category: 'ADMIN' | 'BROWSER' | 'TOKEN' | 'FEDERATION' | 'RECOVERY' | 'STANDALONE'
  summary: string
  target: string
  evidence_mode: 'SYNTHETIC_MODELED' | 'MEASURED_RUNTIME'
  evidence_summary: string
  market_claim_ready: boolean
}

export interface IamBenchmarkMetricRecord {
  id: string
  name: string
  unit: 'ms' | 'percent' | 'seconds' | 'count'
  value: number
  target: string
  status: 'PASS' | 'WARN' | 'FAIL'
}

export interface IamBenchmarkRunRecord {
  id: string
  suite_id: string
  suite_name: string
  executed_at: string
  executed_by_user_id: string
  overall_status: 'PASS' | 'WARN' | 'FAIL'
  metrics: IamBenchmarkMetricRecord[]
  observations: string[]
  count: number
  evidence_mode: 'SYNTHETIC_MODELED' | 'MEASURED_RUNTIME'
  evidence_summary: string
  market_claim_ready: boolean
}

export interface IamBenchmarkCatalogResponse {
  generated_at: string
  suites: IamBenchmarkSuiteRecord[]
  runs: IamBenchmarkRunRecord[]
  count: number
  evidence_mode: 'SYNTHETIC_MODELED' | 'MEASURED_RUNTIME'
  market_claim_ready: boolean
  evidence_summary: string
}

export interface IamRecoveryProfileRecord {
  id: string
  name: string
  backup_storage_mode: 'S3_VERSIONED_OBJECT_LOCK'
  database_recovery_mode: 'DYNAMODB_PITR'
  replication_mode: 'SAME_REGION_VERSIONED' | 'CROSS_REGION_WARM_STANDBY'
  rpo_target_minutes: number
  rto_target_minutes: number
  immutability_enabled: boolean
  operator_notes: string[]
  updated_at: string
}

export interface IamRecoveryDrillRecord {
  id: string
  backup_id: string
  restore_record_id: string
  resilience_run_id: string
  executed_at: string
  executed_by_user_id: string
  status: 'PASS' | 'WARN' | 'FAIL'
  measured_recovery_minutes: number
  rpo_target_minutes: number
  rto_target_minutes: number
  integrity_validated: boolean
  notes: string[]
}

export interface IamRecoveryProfileResponse {
  generated_at: string
  profile: IamRecoveryProfileRecord
  latest_drill: IamRecoveryDrillRecord | null
  drills: IamRecoveryDrillRecord[]
  count: number
}

export interface IamStandardsMatrixItem {
  id: string
  family: string
  capability: string
  status: IamReviewStatus
  summary: string
  evidence_mode: 'MODELED_RUNTIME_STATE' | 'EXTERNAL_TEST_EVIDENCE'
  evidence_summary: string
}

export interface IamStandardsMatrixResponse {
  generated_at: string
  overall_status: IamReviewStatus
  items: IamStandardsMatrixItem[]
  count: number
  evidence_mode: 'MODELED_RUNTIME_STATE' | 'EXTERNAL_TEST_EVIDENCE'
  market_claim_ready: boolean
  evidence_summary: string
}

export interface IamInteroperabilityCheck {
  id: string
  protocol_family: string
  name: string
  status: IamReviewStatus
  summary: string
  evidence: string
  evidence_mode: 'MODELED_RUNTIME_STATE' | 'EXTERNAL_TEST_EVIDENCE'
  evidence_summary: string
}

export interface IamInteroperabilityReviewResponse {
  generated_at: string
  overall_status: IamReviewStatus
  checks: IamInteroperabilityCheck[]
  count: number
  evidence_mode: 'MODELED_RUNTIME_STATE' | 'EXTERNAL_TEST_EVIDENCE'
  market_claim_ready: boolean
  evidence_summary: string
}

export interface IamDifferentiationArea {
  id: string
  name: string
  status: IamReviewStatus
  comparative_position: string
  summary: string
  evidence_mode: 'MODELED_RUNTIME_STATE' | 'EXTERNAL_TEST_EVIDENCE'
  evidence_summary: string
}

export interface IamDifferentiationReviewResponse {
  generated_at: string
  overall_status: IamReviewStatus
  areas: IamDifferentiationArea[]
  count: number
  evidence_mode: 'MODELED_RUNTIME_STATE' | 'EXTERNAL_TEST_EVIDENCE'
  market_claim_ready: boolean
  evidence_summary: string
}

export interface IamFormalReviewRecord {
  id: string
  created_at: string
  created_by_user_id: string
  overall_status: IamReviewStatus
  market_position: IamMarketPosition
  adoption_recommendation: IamAdoptionRecommendation
  standalone_validation_complete: boolean
  standalone_production_ready: boolean
  keycloak_competitive: boolean
  strategically_differentiated: boolean
  notes: string[]
  standards_status: IamReviewStatus
  interoperability_status: IamReviewStatus
  security_operations_status: IamReviewStatus
  differentiation_status: IamReviewStatus
  evidence_mode: 'MODELED_RUNTIME_STATE' | 'EXTERNAL_TEST_EVIDENCE'
  market_claim_ready: boolean
  claim_scope: 'INTERNAL_MODELED_REVIEW_ONLY' | 'EXTERNALLY_VALIDATED_MARKET_CLAIM'
}

export interface IamReviewSummaryResponse {
  generated_at: string
  standards_matrix_count: number
  interoperability_check_count: number
  differentiation_area_count: number
  formal_review_count: number
  latest_market_position: IamMarketPosition | null
  latest_adoption_recommendation: IamAdoptionRecommendation | null
  latest_overall_status: IamReviewStatus | null
  evidence_mode: 'MODELED_RUNTIME_STATE' | 'EXTERNAL_TEST_EVIDENCE'
  market_claim_ready: boolean
  evidence_summary: string
  claim_boundary_notes: string[]
}

export interface IamFormalReviewResponse {
  generated_at: string
  latest_review: IamFormalReviewRecord | null
  reviews: IamFormalReviewRecord[]
  count: number
  evidence_mode: 'MODELED_RUNTIME_STATE' | 'EXTERNAL_TEST_EVIDENCE'
  market_claim_ready: boolean
  evidence_summary: string
  claim_boundary_notes: string[]
}

export interface IamExternalIdentityProfile {
  subject: string
  username: string
  email: string
  first_name: string
  last_name: string
  group_names: string[]
  role_names: string[]
}

export interface IamIdentityProviderRecord {
  id: string
  realm_id: string
  alias: string
  name: string
  summary: string
  protocol: IamIdentityProviderProtocol
  status: IamIdentityProviderStatus
  login_mode: IamIdentityProviderLoginMode
  link_policy: IamIdentityProviderLinkPolicy
  sync_mode: IamIdentityProviderSyncMode
  issuer_url: string | null
  allowed_scopes: string[]
  default_role_ids: string[]
  default_group_ids: string[]
  synthetic: boolean
  external_identities: IamExternalIdentityProfile[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamIdentityProvidersResponse {
  generated_at: string
  identity_providers: IamIdentityProviderRecord[]
  count: number
}

export interface IamPublicBrokerRecord {
  id: string
  alias: string
  name: string
  summary: string
  protocol: IamIdentityProviderProtocol
  login_mode: IamIdentityProviderLoginMode
}

export interface IamRealmBrokersResponse {
  generated_at: string
  realm_id: string
  brokers: IamPublicBrokerRecord[]
  count: number
}

export interface IamUserFederationProviderRecord {
  id: string
  realm_id: string
  name: string
  summary: string
  kind: IamUserFederationProviderKind
  status: IamUserFederationProviderStatus
  import_strategy: IamUserFederationImportStrategy
  connection_label: string
  default_role_ids: string[]
  default_group_ids: string[]
  synthetic: boolean
  external_identities: IamExternalIdentityProfile[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamUserFederationProvidersResponse {
  generated_at: string
  user_federation_providers: IamUserFederationProviderRecord[]
  count: number
}

export interface IamLinkedIdentityRecord {
  id: string
  realm_id: string
  user_id: string
  source_type: IamLinkedIdentitySourceType
  provider_id: string
  provider_name: string
  provider_alias: string | null
  provider_kind: string
  external_subject: string
  external_username: string
  external_email: string
  linked_at: string
  imported_at: string | null
  last_authenticated_at: string | null
  synthetic: boolean
}

export interface IamLinkedIdentitiesResponse {
  generated_at: string
  linked_identities: IamLinkedIdentityRecord[]
  count: number
}

export interface IamFederationSyncJobRecord {
  id: string
  realm_id: string
  provider_id: string
  provider_name: string
  status: IamFederationSyncJobStatus
  started_at: string
  completed_at: string
  imported_count: number
  linked_count: number
  updated_count: number
  error_message: string | null
  created_by_user_id: string
}

export interface IamFederationSyncJobsResponse {
  generated_at: string
  sync_jobs: IamFederationSyncJobRecord[]
  count: number
}

export interface IamFederationEventRecord {
  id: string
  realm_id: string
  kind: IamFederationEventKind
  provider_id: string
  provider_name: string
  user_id: string | null
  linked_identity_id: string | null
  occurred_at: string
  summary: string
  metadata: Record<string, unknown>
}

export interface IamFederationEventsResponse {
  generated_at: string
  events: IamFederationEventRecord[]
  count: number
}

export interface IamRealmThemeRecord {
  realm_id: string
  realm_name: string
  preset: IamRealmThemePreset
  brand_name: string
  logo_label: string
  support_email: string
  support_url: string | null
  docs_url: string | null
  primary_color: string
  accent_color: string
  surface_tint: string
  login_title: string
  login_subtitle: string
  account_title: string
  account_subtitle: string
  admin_title: string
  admin_subtitle: string
  footer_note: string
  updated_at: string
  updated_by_user_id: string
}

export interface IamRealmLocalizationRecord {
  realm_id: string
  default_locale: string
  supported_locales: string[]
  mode: IamRealmLocalizationMode
  translations: Record<string, Record<string, string>>
  updated_at: string
  updated_by_user_id: string
}

export interface IamRealmExperienceResponse {
  generated_at: string
  realm: {
    id: string
    name: string
    summary: string
  }
  public_links: {
    signup_url: string | null
  }
  theme: IamRealmThemeRecord
  localization: IamRealmLocalizationRecord
}

export interface IamNotificationTemplateRecord {
  id: string
  realm_id: string
  key: IamNotificationTemplateKey
  channel: IamNotificationChannel
  name: string
  subject_template: string
  body_template: string
  cta_label: string | null
  updated_at: string
  updated_by_user_id: string
}

export interface IamNotificationTemplatesResponse {
  generated_at: string
  notification_templates: IamNotificationTemplateRecord[]
  count: number
}

export interface IamNotificationTemplatePreviewResponse {
  template: IamNotificationTemplateRecord
  subject: string
  body: string
}

export interface IamNotificationDeliveryRecord {
  id: string
  realm_id: string
  template_key: IamNotificationTemplateKey
  channel: IamNotificationChannel
  delivery_mode: IamNotificationDeliveryMode
  status: IamNotificationDeliveryStatus
  recipient_user_id: string | null
  recipient_email: string
  subject: string
  body: string
  sent_at: string
  created_by_user_id: string
}

export interface IamNotificationDeliveriesResponse {
  generated_at: string
  notification_deliveries: IamNotificationDeliveryRecord[]
  count: number
}

export interface IamRealmRecord {
  id: string
  name: string
  summary: string
  scope_kind: IamRealmScopeKind
  status: IamRealmStatus
  synthetic: boolean
  intended_consumers: string[]
  supported_protocols: Array<'OIDC' | 'OAUTH2' | 'SAML'>
  template_id: string | null
  source_realm_id: string | null
  owner_tenant_id: string | null
  tenant_realm_role: IamTenantRealmRole | null
  exception_reason: string | null
  exception_purpose: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamRealmsResponse {
  generated_at: string
  realms: IamRealmRecord[]
  count: number
}

export interface IamRealmTemplateRecord {
  id: string
  name: string
  summary: string
  kind: IamRealmTemplateKind
  status: IamRealmTemplateStatus
  baseline_roles: string[]
  baseline_clients: string[]
  supported_protocols: Array<'OIDC' | 'OAUTH2' | 'SAML'>
  synthetic: boolean
}

export interface IamRealmTemplatesResponse {
  generated_at: string
  realm_templates: IamRealmTemplateRecord[]
  count: number
}

export interface IamRealmBindingRecord {
  id: string
  binding_target_kind: IamBindingTargetKind
  binding_target_id: string
  binding_target_name: string
  binding_target_tenant_id: string | null
  binding_mode: IamRealmBindingMode
  realm_id: string
  realm_name: string
  source_realm_id: string | null
  override_reason: string | null
  override_purpose: string | null
  override_approved_by_user_id: string | null
  override_approved_at: string | null
  notes: string[]
  created_at: string
  updated_at: string
  updated_by_user_id: string
}

export interface IamRealmBindingsResponse {
  generated_at: string
  realm_bindings: IamRealmBindingRecord[]
  count: number
}

export interface IamValidationDomain {
  id: string
  name: string
  summary: string
  proves: string[]
  migration_blocked: boolean
}

export interface IamValidationDomainsResponse {
  generated_at: string
  validation_domains: IamValidationDomain[]
  count: number
}

export interface IamUserRecord {
  id: string
  realm_id: string
  username: string
  email: string
  first_name: string
  last_name: string
  status: IamUserStatus
  synthetic: boolean
  required_actions: string[]
  role_ids: string[]
  group_ids: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamUsersResponse {
  generated_at: string
  users: IamUserRecord[]
  count: number
}

export interface IamGroupRecord {
  id: string
  realm_id: string
  name: string
  summary: string
  status: IamGroupStatus
  synthetic: boolean
  parent_group_id: string | null
  role_ids: string[]
  member_user_ids: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamGroupsResponse {
  generated_at: string
  groups: IamGroupRecord[]
  count: number
}

export interface IamRoleRecord {
  id: string
  realm_id: string
  name: string
  summary: string
  kind: IamRoleKind
  status: IamRoleStatus
  synthetic: boolean
  client_id: string | null
  composite_role_ids: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamRolesResponse {
  generated_at: string
  roles: IamRoleRecord[]
  count: number
}

export interface IamDelegatedAdminRecord {
  id: string
  realm_id: string
  principal_kind: IamDelegatedAdminPrincipalKind
  principal_id: string
  principal_label: string
  status: IamDelegatedAdminStatus
  managed_role_ids: string[]
  managed_group_ids: string[]
  managed_client_ids: string[]
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamDelegatedAdminsResponse {
  generated_at: string
  delegated_admins: IamDelegatedAdminRecord[]
  count: number
}

export interface IamRealmExportRecord {
  id: string
  realm_id: string
  realm_name: string
  status: IamRealmExportStatus
  exported_at: string
  created_by_user_id: string
  object_key: string
  summary: {
    user_count: number
    group_count: number
    role_count: number
    delegated_admin_count: number
  }
}

export interface IamRealmExportsResponse {
  generated_at: string
  realm_exports: IamRealmExportRecord[]
  count: number
}

export interface IamAuthFlowRecord {
  id: string
  realm_id: string
  name: string
  description: string
  kind: IamAuthFlowKind
  status: IamAuthFlowStatus
  synthetic: boolean
  top_level: boolean
  built_in: boolean
  execution_ids: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamAuthExecutionRecord {
  id: string
  realm_id: string
  flow_id: string
  display_name: string
  execution_kind: IamAuthExecutionKind
  authenticator_kind: IamAuthenticatorKind | null
  subflow_id: string | null
  requirement: IamAuthExecutionRequirement
  condition_kind: IamFlowConditionKind
  priority: number
  synthetic: boolean
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamRealmAuthFlowBindingRecord {
  realm_id: string
  browser_flow_id: string
  direct_grant_flow_id: string
  account_console_flow_id: string
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamClientAuthFlowBindingRecord {
  id: string
  realm_id: string
  client_id: string
  browser_flow_id: string | null
  direct_grant_flow_id: string | null
  account_console_flow_id: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamAuthFlowsResponse {
  generated_at: string
  flows: IamAuthFlowRecord[]
  count: number
}

export interface IamAuthExecutionsResponse {
  generated_at: string
  executions: IamAuthExecutionRecord[]
  count: number
}

export interface IamAuthFlowBindingsResponse {
  generated_at: string
  realm_bindings: IamRealmAuthFlowBindingRecord[]
  client_bindings: IamClientAuthFlowBindingRecord[]
  count: number
}

export interface CreateIamAuthFlowRequest {
  realm_id: string
  name: string
  description?: string
  kind: IamAuthFlowKind
  status?: IamAuthFlowStatus
  top_level?: boolean
}

export interface UpdateIamAuthFlowRequest {
  name?: string
  description?: string
  status?: IamAuthFlowStatus
}

export interface CreateIamAuthExecutionRequest {
  realm_id: string
  flow_id: string
  display_name: string
  execution_kind: IamAuthExecutionKind
  authenticator_kind?: IamAuthenticatorKind | null
  subflow_id?: string | null
  requirement?: IamAuthExecutionRequirement
  condition_kind?: IamFlowConditionKind
  priority?: number
}

export interface UpdateIamAuthExecutionRequest {
  display_name?: string
  authenticator_kind?: IamAuthenticatorKind | null
  subflow_id?: string | null
  requirement?: IamAuthExecutionRequirement
  condition_kind?: IamFlowConditionKind
  priority?: number
}

export interface UpdateIamRealmAuthFlowBindingsRequest {
  browser_flow_id?: string
  direct_grant_flow_id?: string
  account_console_flow_id?: string
}

export interface UpdateIamClientAuthFlowBindingsRequest {
  browser_flow_id?: string | null
  direct_grant_flow_id?: string | null
  account_console_flow_id?: string | null
}

export interface IamClientRecord {
  id: string
  realm_id: string
  client_id: string
  name: string
  summary: string
  protocol: IamClientProtocol
  access_type: IamClientAccessType
  status: IamClientStatus
  synthetic: boolean
  redirect_uris: string[]
  base_url: string | null
  root_url: string | null
  default_scope_ids: string[]
  optional_scope_ids: string[]
  direct_protocol_mapper_ids: string[]
  standard_flow_enabled: boolean
  direct_access_grants_enabled: boolean
  service_account_enabled: boolean
  secret_preview: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamClientsResponse {
  generated_at: string
  clients: IamClientRecord[]
  count: number
}

export interface IamClientSecretResponse {
  client: IamClientRecord
  issued_client_secret: string | null
}

export interface IamClientScopeRecord {
  id: string
  realm_id: string
  name: string
  description: string
  protocol: IamClientProtocol
  assignment_type: IamScopeAssignmentType
  status: IamClientScopeStatus
  synthetic: boolean
  protocol_mapper_ids: string[]
  assigned_client_ids: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamClientScopesResponse {
  generated_at: string
  client_scopes: IamClientScopeRecord[]
  count: number
}

export interface IamProtocolMapperRecord {
  id: string
  realm_id: string
  name: string
  protocol: IamClientProtocol
  target_kind: 'CLIENT' | 'CLIENT_SCOPE'
  target_id: string
  source_kind: IamMapperSourceKind
  claim_name: string
  user_property: string | null
  static_value: string | null
  multivalued: boolean
  include_in_access_token: boolean
  include_in_id_token: boolean
  include_in_userinfo: boolean
  status: IamMapperStatus
  synthetic: boolean
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamProtocolMappersResponse {
  generated_at: string
  protocol_mappers: IamProtocolMapperRecord[]
  count: number
}

export interface IamServiceAccountRecord {
  id: string
  realm_id: string
  client_id: string
  username: string
  role_ids: string[]
  status: 'ACTIVE' | 'DISABLED'
  synthetic: boolean
  created_at: string
  updated_at: string
}

export interface IamServiceAccountsResponse {
  generated_at: string
  service_accounts: IamServiceAccountRecord[]
  count: number
}

export interface IamIssuedTokenRecord {
  id: string
  realm_id: string
  client_id: string
  subject_kind: IamSubjectKind
  subject_id: string
  grant_type:
    | 'authorization_code'
    | 'client_credentials'
    | 'password'
    | 'refresh_token'
    | 'urn:ietf:params:oauth:grant-type:device_code'
    | 'urn:ietf:params:oauth:grant-type:token-exchange'
  scope: string
  scope_ids: string[]
  issued_at: string
  expires_at: string
  refresh_expires_at: string | null
  status: IamTokenStatus
  revoked_at: string | null
}

export interface IamIssuedTokensResponse {
  generated_at: string
  issued_tokens: IamIssuedTokenRecord[]
  count: number
}

export interface IamOidcDiscoveryDocument {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  userinfo_endpoint: string
  revocation_endpoint: string
  introspection_endpoint: string
  jwks_uri: string
  registration_endpoint?: string
  device_authorization_endpoint?: string
  pushed_authorization_request_endpoint?: string
  grant_types_supported: Array<
    | 'authorization_code'
    | 'client_credentials'
    | 'password'
    | 'refresh_token'
    | 'urn:ietf:params:oauth:grant-type:device_code'
    | 'urn:ietf:params:oauth:grant-type:token-exchange'
  >
  response_types_supported: string[]
  code_challenge_methods_supported: Array<'S256'>
  subject_types_supported: Array<'public'>
  id_token_signing_alg_values_supported: Array<'RS256'>
  scopes_supported: string[]
  token_endpoint_auth_methods_supported: Array<'client_secret_basic' | 'client_secret_post' | 'none'>
}

export interface IamJwksResponse {
  keys: Array<{
    kid: string
    kty: 'RSA'
    alg: 'RS256'
    use: 'sig'
    n: string
    e: string
  }>
}

export interface IamTokenEndpointResponse {
  access_token: string
  expires_in: number
  token_type: 'Bearer'
  scope: string
  refresh_token?: string
  refresh_expires_in?: number
  id_token?: string
}

export interface IamTokenIntrospectionResponse {
  active: boolean
  client_id?: string
  username?: string
  sub?: string
  scope?: string
  token_type?: 'Bearer'
  exp?: number
  iat?: number
  aud?: string | string[]
  iss?: string
  realm_id?: string
}

export interface IamUserInfoResponse {
  sub: string
  preferred_username?: string
  email?: string
  given_name?: string
  family_name?: string
  [key: string]: unknown
}

export interface IamSamlLoginResponse {
  realm_id: string
  client_id: string
  relay_state: string | null
  session_index: string
  acs_url: string
  saml_response: string
  attributes: Record<string, unknown>
}

export interface IamSamlAuthRequestRecord {
  id: string
  realm_id: string
  client_id: string
  client_name: string
  acs_url: string
  relay_state: string | null
  request_binding: 'POST' | 'REDIRECT'
  request_id: string | null
  force_authn: boolean
  created_at: string
  expires_at: string
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED'
}

export interface IamSamlAuthRequestDetailResponse {
  request: IamSamlAuthRequestRecord
  can_auto_continue: boolean
}

export interface IamSamlSessionRecord {
  id: string
  realm_id: string
  client_id: string
  user_id: string
  browser_session_id: string
  session_index: string
  relay_state: string | null
  acs_url: string
  created_at: string
  last_seen_at: string
  terminated_at: string | null
  status: 'ACTIVE' | 'TERMINATED' | 'EXPIRED'
}

export interface IamSamlContinuationResponse {
  status: 'AUTHORIZED' | 'ERROR' | 'INTERACTION_REQUIRED'
  request: IamSamlAuthRequestRecord
  session?: IamSamlSessionRecord
  acs_url?: string
  relay_state?: string | null
  session_index?: string
  saml_response?: string
  attributes?: Record<string, unknown>
  error?: string
  error_description?: string
  login_response?: IamLoginResponse
}

export interface IamSamlSessionsResponse {
  generated_at: string
  sessions: IamSamlSessionRecord[]
  count: number
}

export interface IamSamlLogoutResponse {
  realm_id: string
  client_id: string
  relay_state: string | null
  session_index: string
  logout_destination: string
  saml_logout_response: string
  terminated_at: string | null
  browser_session_id: string
  browser_session_revoked: boolean
}

export type IamClientPolicyStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED'
export type IamInitialAccessTokenStatus = 'ACTIVE' | 'CONSUMED' | 'EXPIRED' | 'REVOKED'
export type IamPushedAuthorizationRequestStatus = 'ACTIVE' | 'CONSUMED' | 'EXPIRED'
export type IamDeviceAuthorizationStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'CONSUMED' | 'EXPIRED'
export type IamTokenExchangeStatus = 'ISSUED' | 'DENIED'

export interface IamClientPolicyRecord {
  id: string
  realm_id: string
  name: string
  description: string
  status: IamClientPolicyStatus
  synthetic: boolean
  allow_dynamic_registration: boolean
  allow_device_authorization: boolean
  allow_token_exchange: boolean
  allow_pushed_authorization_requests: boolean
  require_par_for_public_clients: boolean
  require_pkce_for_public_clients: boolean
  allow_wildcard_redirect_uris: boolean
  allowed_protocols: IamClientProtocol[]
  allowed_access_types: IamClientAccessType[]
  default_scope_ids: string[]
  assigned_client_ids: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface IamClientPoliciesResponse {
  generated_at: string
  client_policies: IamClientPolicyRecord[]
  count: number
}

export interface IamInitialAccessTokenRecord {
  id: string
  realm_id: string
  policy_id: string
  label: string
  status: IamInitialAccessTokenStatus
  remaining_uses: number | null
  expires_at: string | null
  created_at: string
  created_by_user_id: string
}

export interface IamInitialAccessTokenIssueResponse {
  token: IamInitialAccessTokenRecord
  issued_token: string
}

export interface IamInitialAccessTokensResponse {
  generated_at: string
  tokens: IamInitialAccessTokenRecord[]
  count: number
}

export interface IamPushedAuthorizationRequestRecord {
  id: string
  request_uri: string
  realm_id: string
  client_id: string
  redirect_uri: string
  scope: string | null
  state: string | null
  nonce: string | null
  prompt: string | null
  code_challenge_method: 'plain' | 'S256' | null
  status: IamPushedAuthorizationRequestStatus
  expires_at: string
  created_at: string
}

export interface IamPushedAuthorizationRequestResponse {
  request_uri: string
  expires_in: number
  request: IamPushedAuthorizationRequestRecord
}

export interface IamPushedAuthorizationRequestsResponse {
  generated_at: string
  requests: IamPushedAuthorizationRequestRecord[]
  count: number
}

export interface IamDeviceAuthorizationRecord {
  id: string
  realm_id: string
  client_id: string
  device_code: string
  user_code: string
  scope: string
  verification_uri: string
  verification_uri_complete: string
  interval: number
  expires_at: string
  status: IamDeviceAuthorizationStatus
  user_id: string | null
  approved_at: string | null
  denied_at: string | null
  consumed_at: string | null
  created_at: string
}

export interface IamDeviceAuthorizationResponse {
  device_code: string
  user_code: string
  verification_uri: string
  verification_uri_complete: string
  expires_in: number
  interval: number
  request: IamDeviceAuthorizationRecord
}

export interface IamDeviceAuthorizationsResponse {
  generated_at: string
  device_authorizations: IamDeviceAuthorizationRecord[]
  count: number
}

export interface IamTokenExchangeRecord {
  id: string
  realm_id: string
  requesting_client_id: string
  audience_client_id: string
  subject_kind: IamSubjectKind
  subject_id: string
  subject_token_id: string
  exchanged_token_id: string | null
  requested_scope_names: string[]
  status: IamTokenExchangeStatus
  created_at: string
}

export interface IamTokenExchangesResponse {
  generated_at: string
  token_exchanges: IamTokenExchangeRecord[]
  count: number
}

export interface CreateIamClientPolicyRequest {
  realm_id: string
  name: string
  description?: string
  status?: IamClientPolicyStatus
  allow_dynamic_registration?: boolean
  allow_device_authorization?: boolean
  allow_token_exchange?: boolean
  allow_pushed_authorization_requests?: boolean
  require_par_for_public_clients?: boolean
  require_pkce_for_public_clients?: boolean
  allow_wildcard_redirect_uris?: boolean
  allowed_protocols?: IamClientProtocol[]
  allowed_access_types?: IamClientAccessType[]
  default_scope_ids?: string[]
  assigned_client_ids?: string[]
}

export interface UpdateIamClientPolicyRequest {
  name?: string
  description?: string
  status?: IamClientPolicyStatus
  allow_dynamic_registration?: boolean
  allow_device_authorization?: boolean
  allow_token_exchange?: boolean
  allow_pushed_authorization_requests?: boolean
  require_par_for_public_clients?: boolean
  require_pkce_for_public_clients?: boolean
  allow_wildcard_redirect_uris?: boolean
  allowed_protocols?: IamClientProtocol[]
  allowed_access_types?: IamClientAccessType[]
  default_scope_ids?: string[]
  assigned_client_ids?: string[]
}

export interface CreateIamInitialAccessTokenRequest {
  realm_id: string
  policy_id: string
  label: string
  max_uses?: number | null
  expires_in_hours?: number | null
}

export interface IamDynamicClientRegistrationRequest {
  client_name: string
  client_id?: string
  redirect_uris?: string[]
  grant_types?: string[]
  token_endpoint_auth_method?: 'none' | 'client_secret_basic' | 'client_secret_post'
  response_types?: string[]
  scope?: string | null
  client_uri?: string | null
  policy_id?: string | null
}

export interface IamDynamicClientRegistrationResponse {
  client: IamClientRecord
  client_secret: string | null
  registration_access_token: string
  registration_client_uri: string
  token_endpoint_auth_method: 'none' | 'client_secret_basic' | 'client_secret_post'
  grant_types: string[]
  assigned_policy_ids: string[]
}

export interface CreateIamRealmRequest {
  name: string
  summary: string
  scope_kind?: IamRealmScopeKind
  status?: IamRealmStatus
  intended_consumers?: string[]
  supported_protocols?: Array<'OIDC' | 'OAUTH2' | 'SAML'>
  template_id?: string | null
  owner_tenant_id?: string | null
  tenant_realm_role?: IamTenantRealmRole
  exception_reason?: string | null
  exception_purpose?: string | null
  clone_from_realm_id?: string | null
}

export interface UpdateIamRealmRequest {
  name?: string
  summary?: string
  status?: IamRealmStatus
  intended_consumers?: string[]
  supported_protocols?: Array<'OIDC' | 'OAUTH2' | 'SAML'>
  owner_tenant_id?: string | null
  tenant_realm_role?: IamTenantRealmRole
  exception_reason?: string | null
  exception_purpose?: string | null
}

export interface UpdateIamRealmBindingRequest {
  binding_mode?: IamRealmBindingMode
  realm_id?: string
  override_reason?: string | null
  override_purpose?: string | null
  notes?: string[]
}

export interface CreateIamUserRequest {
  realm_id: string
  username: string
  email: string
  first_name: string
  last_name: string
  status?: IamUserStatus
  required_actions?: string[]
  role_ids?: string[]
  group_ids?: string[]
}

export interface UpdateIamUserRequest {
  email?: string
  first_name?: string
  last_name?: string
  status?: IamUserStatus
  required_actions?: string[]
  role_ids?: string[]
  group_ids?: string[]
}

export interface CreateIamGroupRequest {
  realm_id: string
  name: string
  summary?: string
  status?: IamGroupStatus
  parent_group_id?: string | null
  role_ids?: string[]
  member_user_ids?: string[]
}

export interface UpdateIamGroupRequest {
  name?: string
  summary?: string
  status?: IamGroupStatus
  parent_group_id?: string | null
  role_ids?: string[]
  member_user_ids?: string[]
}

export interface CreateIamRoleRequest {
  realm_id: string
  name: string
  summary?: string
  kind?: IamRoleKind
  client_id?: string | null
  composite_role_ids?: string[]
  status?: IamRoleStatus
}

export interface UpdateIamRoleRequest {
  name?: string
  summary?: string
  client_id?: string | null
  composite_role_ids?: string[]
  status?: IamRoleStatus
}

export interface CreateIamDelegatedAdminRequest {
  realm_id: string
  principal_kind: IamDelegatedAdminPrincipalKind
  principal_id: string
  principal_label: string
  managed_role_ids?: string[]
  managed_group_ids?: string[]
  managed_client_ids?: string[]
  notes?: string[]
  status?: IamDelegatedAdminStatus
}

export interface UpdateIamDelegatedAdminRequest {
  principal_label?: string
  managed_role_ids?: string[]
  managed_group_ids?: string[]
  managed_client_ids?: string[]
  notes?: string[]
  status?: IamDelegatedAdminStatus
}

export interface CreateIamClientRequest {
  realm_id: string
  client_id: string
  name: string
  summary?: string
  protocol?: IamClientProtocol
  access_type?: IamClientAccessType
  status?: IamClientStatus
  redirect_uris?: string[]
  base_url?: string | null
  root_url?: string | null
  default_scope_ids?: string[]
  optional_scope_ids?: string[]
  direct_protocol_mapper_ids?: string[]
  standard_flow_enabled?: boolean
  direct_access_grants_enabled?: boolean
  service_account_enabled?: boolean
}

export interface UpdateIamClientRequest {
  name?: string
  summary?: string
  status?: IamClientStatus
  redirect_uris?: string[]
  base_url?: string | null
  root_url?: string | null
  default_scope_ids?: string[]
  optional_scope_ids?: string[]
  direct_protocol_mapper_ids?: string[]
  standard_flow_enabled?: boolean
  direct_access_grants_enabled?: boolean
  service_account_enabled?: boolean
}

export interface CreateIamClientScopeRequest {
  realm_id: string
  name: string
  description?: string
  protocol?: IamClientProtocol
  assignment_type?: IamScopeAssignmentType
  status?: IamClientScopeStatus
  protocol_mapper_ids?: string[]
  assigned_client_ids?: string[]
}

export interface UpdateIamClientScopeRequest {
  description?: string
  status?: IamClientScopeStatus
  protocol_mapper_ids?: string[]
  assigned_client_ids?: string[]
}

export interface CreateIamProtocolMapperRequest {
  realm_id: string
  name: string
  protocol?: IamClientProtocol
  target_kind: 'CLIENT' | 'CLIENT_SCOPE'
  target_id: string
  source_kind: IamMapperSourceKind
  claim_name: string
  user_property?: string | null
  static_value?: string | null
  multivalued?: boolean
  include_in_access_token?: boolean
  include_in_id_token?: boolean
  include_in_userinfo?: boolean
  status?: IamMapperStatus
}

export interface UpdateIamProtocolMapperRequest {
  name?: string
  claim_name?: string
  user_property?: string | null
  static_value?: string | null
  multivalued?: boolean
  include_in_access_token?: boolean
  include_in_id_token?: boolean
  include_in_userinfo?: boolean
  status?: IamMapperStatus
}

export type CmsScopeKind = 'IDP_DEFAULT' | 'TENANT_OVERRIDE'
export type CmsInheritanceMode = 'ROOT' | 'CLONED_FROM_TEMPLATE'
export type CmsSpaceStatus = 'STANDALONE_VALIDATION' | 'READY_FOR_SCHEMA_PHASE' | 'ACTIVE' | 'ARCHIVED'
export type CmsSchemaKind =
  | 'COLLECTION_TYPE'
  | 'SINGLE_TYPE'
  | 'COMPONENT'
  | 'REPEATABLE_COMPONENT'
  | 'DYNAMIC_ZONE_TEMPLATE'
  | 'CUSTOM_FIELD_TEMPLATE'
export type CmsSchemaStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
export type CmsFieldKind =
  | 'TEXT'
  | 'RICH_TEXT'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'DATE_TIME'
  | 'ENUM'
  | 'JSON'
  | 'RELATION'
  | 'COMPONENT'
  | 'DYNAMIC_ZONE'
  | 'MEDIA'

export interface CmsSpaceRecord {
  id: string
  name: string
  summary: string
  intended_consumers: string[]
  supported_channels: string[]
  supported_locales: string[]
  synthetic: boolean
  status: CmsSpaceStatus
  scope_kind: CmsScopeKind
  owner_tenant_id: string | null
  source_space_id: string | null
  inheritance_mode: CmsInheritanceMode
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CmsSpacesResponse {
  generated_at: string
  spaces: CmsSpaceRecord[]
  count: number
}

export interface CmsReferenceContentType {
  id: string
  space_id: string
  name: string
  kind: CmsSchemaKind
  summary: string
  field_highlights: string[]
  intended_uses: string[]
  version: number
  status: CmsSchemaStatus
  scope_kind: CmsScopeKind
  owner_tenant_id: string | null
  source_schema_id: string | null
}

export interface CmsContentTypesResponse {
  generated_at: string
  content_types: CmsReferenceContentType[]
  count: number
}

export interface CmsValidationDomain {
  id: string
  name: string
  space_id: string
  summary: string
  proves: string[]
  migration_blocked: boolean
}

export interface CmsValidationDomainsResponse {
  generated_at: string
  validation_domains: CmsValidationDomain[]
  count: number
}

export interface CmsFieldDefinition {
  id: string
  label: string
  api_name: string
  field_kind: CmsFieldKind
  required: boolean
  localized: boolean
  repeatable: boolean
  validations: Record<string, unknown>
  relation?: {
    target_schema_id: string
    mode: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany'
  } | null
  component?: {
    target_schema_id: string
  } | null
  dynamic_zone?: {
    allowed_schema_ids: string[]
  } | null
}

export interface CmsSchemaRecord {
  id: string
  space_id: string
  name: string
  api_name: string
  kind: CmsSchemaKind
  status: CmsSchemaStatus
  summary: string
  synthetic: boolean
  fields: CmsFieldDefinition[]
  template_members: string[]
  compatibility_notes: string[]
  version: number
  scope_kind: CmsScopeKind
  owner_tenant_id: string | null
  source_schema_id: string | null
  inheritance_mode: CmsInheritanceMode
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CmsSchemasResponse {
  generated_at: string
  schemas: CmsSchemaRecord[]
  count: number
}

export interface CmsSchemaVersionRecord {
  id: string
  schema_id: string
  version: number
  change_summary: string
  snapshot: CmsSchemaRecord
  created_at: string
  created_by_user_id: string
}

export interface CmsSchemaVersionsResponse {
  generated_at: string
  schema_id: string
  versions: CmsSchemaVersionRecord[]
  count: number
}

export interface CmsTenantBindingRecord {
  tenant_id: string
  tenant_name: string
  binding_mode: 'DEFAULT' | 'OVERRIDE'
  active_space_ids: string[]
  override_space_ids: string[]
  created_at: string
  updated_at: string
  updated_by_user_id: string
}

export interface CmsTenantBindingsResponse {
  generated_at: string
  tenant_bindings: CmsTenantBindingRecord[]
  count: number
}

export type CmsEntryStatus = 'DRAFT' | 'PUBLISHED' | 'CHANGED' | 'ARCHIVED'

export interface CmsEntryRecord {
  id: string
  space_id: string
  space_name: string
  schema_id: string
  schema_name: string
  status: CmsEntryStatus
  title: string
  slug: string | null
  synthetic: boolean
  scope_kind: CmsScopeKind
  owner_tenant_id: string | null
  source_entry_id: string | null
  inheritance_mode: CmsInheritanceMode
  locale_codes: string[]
  has_unpublished_changes: boolean
  published_at: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CmsEntryDraftRecord {
  id: string
  entry_id: string
  schema_id: string
  space_id: string
  version: number
  payload: Record<string, unknown>
  summary_text: string
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CmsEntriesResponse {
  generated_at: string
  entries: CmsEntryRecord[]
  count: number
  page: number
  page_size: number
  total_pages: number
  total_count: number
  summary: {
    draft: number
    published: number
    changed: number
    archived: number
  }
}

export interface CmsEntryDetailResponse {
  generated_at: string
  entry: CmsEntryRecord
  draft: CmsEntryDraftRecord | null
  published_payload: Record<string, unknown> | null
}

export interface CreateCmsEntryRequest {
  schema_id: string
  title?: string
  slug?: string | null
  clone_from_entry_id?: string | null
  draft_payload?: Record<string, unknown>
}

export interface UpdateCmsEntryDraftRequest {
  title?: string
  slug?: string | null
  draft_payload: Record<string, unknown>
}

export type CmsWorkflowStage =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'RELEASED'
  | 'ARCHIVED'

export type CmsWorkflowEventAction =
  | 'ENTRY_CREATED'
  | 'DRAFT_UPDATED'
  | 'SUBMITTED_FOR_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'RESTORED'
  | 'PUBLISHED'
  | 'RELEASE_ATTACHED'
  | 'RELEASE_PUBLISHED'
  | 'RELEASE_ROLLED_BACK'
  | 'ARCHIVED'

export interface CmsWorkflowRecord {
  entry_id: string
  entry_title: string
  entry_status: CmsEntryStatus
  stage: CmsWorkflowStage
  reviewer_notes: string | null
  approval_notes: string | null
  scheduled_publish_at: string | null
  current_release_id: string | null
  last_action_at: string
  last_action_by_user_id: string
}

export interface CmsWorkflowEventRecord {
  id: string
  entry_id: string
  action: CmsWorkflowEventAction
  stage: CmsWorkflowStage
  notes: string | null
  actor_user_id: string
  created_at: string
}

export interface CmsWorkflowListItem {
  entry_id: string
  entry_title: string
  schema_id: string
  schema_name: string
  space_id: string
  space_name: string
  entry_status: CmsEntryStatus
  workflow_stage: CmsWorkflowStage
  current_release_id: string | null
  scheduled_publish_at: string | null
  last_action_at: string
}

export interface CmsWorkflowListResponse {
  generated_at: string
  workflows: CmsWorkflowListItem[]
  count: number
}

export interface CmsEntryWorkflowDetailResponse {
  generated_at: string
  entry: CmsEntryRecord
  workflow: CmsWorkflowRecord
  events: CmsWorkflowEventRecord[]
}

export interface CmsRevisionRecord {
  id: string
  entry_id: string
  revision_number: number
  revision_kind: string
  title: string
  slug: string | null
  payload: Record<string, unknown> | null
  published_payload: Record<string, unknown> | null
  created_at: string
  created_by_user_id: string
  summary: string
}

export interface CmsRevisionsResponse {
  generated_at: string
  entry: CmsEntryRecord
  revisions: CmsRevisionRecord[]
  count: number
}

export interface CmsWorkflowDecisionRequest {
  notes?: string
  scheduled_publish_at?: string | null
}

export interface CmsPreviewSessionRecord {
  id: string
  entry_id: string
  entry_title: string
  schema_id: string
  preview_token: string
  channel: string
  audience: string
  locale: string | null
  source: 'DRAFT' | 'PUBLISHED'
  expires_at: string
  created_at: string
  created_by_user_id: string
  payload_snapshot: Record<string, unknown> | null
  published_payload_snapshot: Record<string, unknown> | null
}

export interface CmsPreviewSessionsResponse {
  generated_at: string
  sessions: CmsPreviewSessionRecord[]
  count: number
}

export interface CreateCmsPreviewSessionRequest {
  entry_id: string
  channel?: string
  audience?: string
  locale?: string | null
}

export type CmsReleaseStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ROLLED_BACK'

export interface CmsReleaseItemRecord {
  entry_id: string
  entry_title: string
  schema_id: string
  space_id: string
  revision_id: string | null
  payload_snapshot: Record<string, unknown> | null
  previous_published_payload: Record<string, unknown> | null
  slug: string | null
}

export interface CmsReleaseRecord {
  id: string
  name: string
  summary: string
  channel: string
  audience: string
  entry_ids: string[]
  item_snapshots: CmsReleaseItemRecord[]
  status: CmsReleaseStatus
  scheduled_publish_at: string | null
  published_at: string | null
  rolled_back_at: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CmsReleasesResponse {
  generated_at: string
  releases: CmsReleaseRecord[]
  count: number
}

export interface CreateCmsReleaseRequest {
  name: string
  summary?: string
  channel?: string
  audience?: string
  entry_ids: string[]
  scheduled_publish_at?: string | null
}

export type CmsMediaFolderStatus = 'ACTIVE' | 'ARCHIVED'
export type CmsMediaAssetStatus = 'ACTIVE' | 'ARCHIVED'
export type CmsMediaAssetKind = 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'AUDIO' | 'ARCHIVE' | 'OTHER'

export interface CmsMediaFolderRecord {
  id: string
  name: string
  path: string
  parent_folder_id: string | null
  description: string
  synthetic: boolean
  status: CmsMediaFolderStatus
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CmsMediaFoldersResponse {
  generated_at: string
  folders: CmsMediaFolderRecord[]
  count: number
}

export interface CreateCmsMediaFolderRequest {
  name: string
  parent_folder_id?: string | null
  description?: string
}

export interface CmsMediaRenditionRecord {
  id: string
  media_asset_id: string
  name: string
  format: string
  width: number | null
  height: number | null
  size_bytes: number
  delivery_url: string
  preview_url: string
}

export interface CmsMediaAssetRecord {
  id: string
  folder_id: string
  folder_path: string
  name: string
  file_name: string
  asset_kind: CmsMediaAssetKind
  mime_type: string
  size_bytes: number
  status: CmsMediaAssetStatus
  source_uri: string | null
  storage_key: string
  alt_text: string | null
  caption: string | null
  tags: string[]
  metadata: Record<string, unknown>
  synthetic: boolean
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CmsResolvedMediaAssetRecord extends CmsMediaAssetRecord {
  delivery_url: string
  preview_url: string
  renditions: CmsMediaRenditionRecord[]
}

export interface CmsMediaAssetsResponse {
  generated_at: string
  assets: CmsMediaAssetRecord[]
  count: number
  page: number
  page_size: number
  total_pages: number
  total_count: number
}

export interface CmsMediaAssetDetailResponse {
  generated_at: string
  asset: CmsResolvedMediaAssetRecord
}

export interface CmsMediaRenditionDetailResponse {
  generated_at: string
  asset_id: string
  rendition: CmsMediaRenditionRecord
}

export interface CreateCmsMediaAssetRequest {
  folder_id: string
  name: string
  file_name: string
  mime_type: string
  size_bytes?: number
  source_uri?: string | null
  alt_text?: string | null
  caption?: string | null
  tags?: string[]
  metadata?: Record<string, unknown>
}

export interface UpdateCmsMediaAssetRequest {
  folder_id?: string
  name?: string
  alt_text?: string | null
  caption?: string | null
  tags?: string[]
  metadata?: Record<string, unknown>
  status?: CmsMediaAssetStatus
}

export interface CmsDeliveryItemRecord {
  entry_id: string
  title: string
  slug: string | null
  path: string
  schema_id: string
  schema_name: string
  space_id: string
  space_name: string
  status: string
  locale_codes: string[]
  published_at: string | null
  updated_at: string
  source_release_ids: string[]
  applied_branch_ids: string[]
  academic_delivery: CmsDeliveryAcademicContextRecord | null
  payload: Record<string, unknown> | null
  resolved_payload: Record<string, unknown> | null
}

export type CmsAcademicReleaseArtifactKind = 'CURRICULUM_RELEASE_BUNDLE' | 'ASSESSMENT_PACKAGE'

export interface CmsAcademicReleaseArtifactRecord {
  artifact_kind: CmsAcademicReleaseArtifactKind
  artifact_id: string
  version_tag: string
  release_id: string
  release_name: string
  created_at: string
  academic_snapshot: CmsAcademicContentSnapshotRecord
}

export interface CmsDeliveryAcademicContextRecord {
  content_kind: 'CURRICULUM_COURSE' | 'ASSESSMENT'
  latest_release_artifact_id: string | null
  latest_release_artifact_kind: CmsAcademicReleaseArtifactKind | null
  academic_snapshot: CmsAcademicContentSnapshotRecord
  selection: CmsAcademicDeliverySelectionRecord
  release_artifacts: CmsAcademicReleaseArtifactRecord[]
}

export interface CmsDeliveryResponse {
  generated_at: string
  items: CmsDeliveryItemRecord[]
  count: number
  page: number
  page_size: number
  total_pages: number
  total_count: number
}

export interface CmsDeliveryDetailResponse {
  generated_at: string
  item: CmsDeliveryItemRecord
}

export interface CmsDeliveryPathResolutionResponse {
  generated_at: string
  resolved: boolean
  path: string
  item: CmsDeliveryItemRecord | null
}

export interface CmsPreviewDeliveryResponse {
  generated_at: string
  preview_session: CmsPreviewSessionRecord
  item: CmsDeliveryItemRecord
}

export type CmsQueryKind = 'ENTRY' | 'MEDIA'

export interface CmsQueryHit {
  id: string
  kind: CmsQueryKind
  title: string
  summary: string
  path: string | null
  schema_id: string | null
  schema_name: string | null
  space_id: string | null
  folder_id: string | null
  matched_fields: string[]
  score: number
}

export interface CmsQueryResponse {
  generated_at: string
  query: string
  hits: CmsQueryHit[]
  count: number
  page: number
  page_size: number
  total_pages: number
  total_count: number
}

export interface CmsLocalizationFieldCoverageRecord {
  path: string
  label: string
  present_locales: string[]
  missing_locales: string[]
}

export interface CmsLocalizationLocaleBranchRecord {
  locale: string
  status: 'COMPLETE' | 'PARTIAL' | 'MISSING'
  completed_fields: number
  total_fields: number
}

export interface CmsLocalizationEntryRecord {
  entry_id: string
  title: string
  schema_id: string
  schema_name: string
  space_id: string
  space_name: string
  status: CmsEntryStatus
  supported_locales: string[]
  locale_codes: string[]
  branch_count: number
  complete_locale_codes: string[]
  partial_locale_codes: string[]
  missing_locale_codes: string[]
  completeness_percent: number
}

export interface CmsLocalizationEntriesResponse {
  generated_at: string
  entries: CmsLocalizationEntryRecord[]
  count: number
}

export interface CmsLocalizationEntryDetailResponse {
  generated_at: string
  entry: CmsEntryRecord
  supported_locales: string[]
  locale_matrix: CmsLocalizationLocaleBranchRecord[]
  localized_fields: CmsLocalizationFieldCoverageRecord[]
  draft_payload: Record<string, unknown> | null
  published_payload: Record<string, unknown> | null
}

export interface UpsertCmsLocaleBranchRequest {
  localized_patch: Record<string, unknown>
}

export type CmsBlueprintStatus = 'ACTIVE' | 'ARCHIVED'
export type CmsBlueprintContentMode = 'STRUCTURE_ONLY' | 'WITH_CONTENT'

export interface CmsBlueprintRecord {
  id: string
  name: string
  summary: string
  source_space_ids: string[]
  source_schema_ids: string[]
  source_entry_ids: string[]
  supported_locales: string[]
  site_mount_path: string
  synthetic: boolean
  status: CmsBlueprintStatus
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CmsBlueprintInstallationRecord {
  id: string
  blueprint_id: string
  blueprint_name: string
  installation_name: string
  owner_tenant_id: string | null
  content_mode: CmsBlueprintContentMode
  installed_space_ids: string[]
  installed_schema_ids: string[]
  installed_entry_ids: string[]
  installed_at: string
  installed_by_user_id: string
}

export interface CmsBlueprintsResponse {
  generated_at: string
  blueprints: CmsBlueprintRecord[]
  count: number
}

export interface CmsBlueprintInstallationsResponse {
  generated_at: string
  installations: CmsBlueprintInstallationRecord[]
  count: number
}

export interface CreateCmsBlueprintRequest {
  name: string
  summary?: string
  source_space_ids: string[]
  source_schema_ids?: string[]
  source_entry_ids?: string[]
  supported_locales?: string[]
  site_mount_path?: string
}

export interface InstallCmsBlueprintRequest {
  installation_name?: string
  owner_tenant_id?: string | null
  content_mode?: CmsBlueprintContentMode
}

export interface CmsGraphqlSchemaField {
  name: string
  description: string
  arguments: Array<{
    name: string
    type: string
    required?: boolean
  }>
  returns: string
  example_query: string
}

export interface CmsGraphqlSchemaResponse {
  generated_at: string
  endpoint: string
  root_fields: CmsGraphqlSchemaField[]
}

export interface ExecuteCmsGraphqlRequest {
  query: string
  variables?: Record<string, unknown>
}

export interface CmsGraphqlQueryError {
  message: string
}

export interface CmsGraphqlQueryResponse {
  generated_at: string
  data: Record<string, unknown> | null
  errors: CmsGraphqlQueryError[]
}

export type CmsAccessPermission =
  | 'spaces.read'
  | 'spaces.write'
  | 'schemas.read'
  | 'schemas.write'
  | 'entries.read'
  | 'entries.write'
  | 'media.read'
  | 'media.write'
  | 'workflow.read'
  | 'workflow.write'
  | 'delivery.read'
  | 'delivery.write'
  | 'localization.read'
  | 'localization.write'
  | 'blueprints.read'
  | 'blueprints.write'
  | 'experience.read'
  | 'experience.write'
  | 'operations.read'
  | 'operations.write'
  | 'tokens.manage'

export type CmsRoleStatus = 'ACTIVE' | 'ARCHIVED'
export type CmsRoleScope = 'GLOBAL' | 'SPACE_SCOPED'
export type CmsAssignmentStatus = 'ACTIVE' | 'INACTIVE'
export type CmsPrincipalType = 'USER' | 'GROUP' | 'SERVICE' | 'EXTERNAL_IDENTITY'
export type CmsApiTokenStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED'

export interface CmsAccessSummaryResponse {
  generated_at: string
  role_count: number
  active_role_count: number
  role_assignment_count: number
  api_token_count: number
  active_api_token_count: number
  permission_catalog: CmsAccessPermission[]
}

export interface CmsRoleRecord {
  id: string
  name: string
  summary: string
  status: CmsRoleStatus
  system_role: boolean
  scope: CmsRoleScope
  permission_ids: CmsAccessPermission[]
  allowed_space_ids: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CmsRoleAssignmentRecord {
  id: string
  role_id: string
  principal_type: CmsPrincipalType
  principal_id: string
  principal_label: string
  status: CmsAssignmentStatus
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CmsApiTokenRecord {
  id: string
  name: string
  summary: string
  status: CmsApiTokenStatus
  token_prefix: string
  permission_ids: CmsAccessPermission[]
  allowed_space_ids: string[]
  expires_at: string | null
  last_used_at: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CmsRolesResponse {
  generated_at: string
  roles: CmsRoleRecord[]
  count: number
}

export interface CmsRoleAssignmentsResponse {
  generated_at: string
  assignments: CmsRoleAssignmentRecord[]
  count: number
}

export interface CmsApiTokensResponse {
  generated_at: string
  tokens: CmsApiTokenRecord[]
  count: number
}

export interface CreateCmsRoleRequest {
  name: string
  summary?: string
  scope?: CmsRoleScope
  permission_ids?: CmsAccessPermission[]
  allowed_space_ids?: string[]
}

export interface UpdateCmsRoleRequest {
  name?: string
  summary?: string
  status?: CmsRoleStatus
  scope?: CmsRoleScope
  permission_ids?: CmsAccessPermission[]
  allowed_space_ids?: string[]
}

export interface CreateCmsRoleAssignmentRequest {
  role_id: string
  principal_type: CmsPrincipalType
  principal_id: string
  principal_label: string
}

export interface UpdateCmsRoleAssignmentRequest {
  principal_label?: string
  status?: CmsAssignmentStatus
}

export interface CreateCmsApiTokenRequest {
  name: string
  summary?: string
  permission_ids?: CmsAccessPermission[]
  allowed_space_ids?: string[]
  expires_at?: string | null
}

export interface UpdateCmsApiTokenRequest {
  name?: string
  summary?: string
  status?: CmsApiTokenStatus
  permission_ids?: CmsAccessPermission[]
  allowed_space_ids?: string[]
  expires_at?: string | null
}

export interface CmsApiTokenCreateResponse {
  generated_at: string
  token: CmsApiTokenRecord
  issued_secret: string
}

export interface CmsExperienceBindingRecord {
  id: string
  schema_id: string
  schema_name: string
  experience_name: string
  channel: string
  route_pattern: string
  summary: string
  binding_paths: string[]
  created_at: string
  updated_at: string
}

export interface CmsVisualBindingRecord {
  id: string
  field_path: string
  label: string
  editor: 'TEXT' | 'RICH_TEXT' | 'NUMBER' | 'BOOLEAN' | 'MEDIA' | 'JSON'
  locale_aware: boolean
  preview_value: string
  component_key: string
}

export interface CmsVisualCanvasSection {
  id: string
  label: string
  component_key: string
  binding_ids: string[]
  summary: string
}

export interface CmsVisualAuthoringSessionRecord {
  id: string
  entry_id: string
  entry_title: string
  schema_id: string
  schema_name: string
  channel: string
  locale: string | null
  mode: 'DRAFT'
  route: string
  preview_token: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CmsExperienceBindingsResponse {
  generated_at: string
  bindings: CmsExperienceBindingRecord[]
  count: number
}

export interface CmsVisualAuthoringSessionsResponse {
  generated_at: string
  sessions: CmsVisualAuthoringSessionRecord[]
  count: number
}

export interface CmsVisualAuthoringSummaryResponse {
  generated_at: string
  binding_count: number
  session_count: number
  bindings: CmsExperienceBindingRecord[]
  sessions: CmsVisualAuthoringSessionRecord[]
}

export interface CmsVisualAuthoringSessionDetailResponse {
  generated_at: string
  session: CmsVisualAuthoringSessionRecord
  experience_binding: CmsExperienceBindingRecord
  canvas: {
    route: string
    sections: CmsVisualCanvasSection[]
  }
  bindings: CmsVisualBindingRecord[]
  entry: CmsEntryRecord
  draft: CmsEntryDraftRecord | null
}

export interface CreateCmsVisualAuthoringSessionRequest {
  entry_id: string
  locale?: string | null
  channel?: string
}

export interface UpdateCmsVisualBindingRequest {
  value: string | number | boolean | Record<string, unknown> | null
  locale?: string | null
}

export type CmsEnvironmentStatus = 'ACTIVE' | 'DEGRADED' | 'ARCHIVED'
export type CmsWebhookStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
export type CmsPromotionStatus = 'QUEUED' | 'COMPLETED' | 'FAILED'
export type CmsOperationsHealth = 'HEALTHY' | 'DEGRADED' | 'FAILED'
export type CmsBackupStatus = 'READY'
export type CmsRestoreMode = 'DRY_RUN' | 'EXECUTE'
export type CmsRestoreStatus = 'VALIDATED' | 'APPLIED'
export type CmsEvidenceStatus = 'PASS' | 'WARN' | 'FAIL'
export type CmsReadinessDecision = 'APPROVED' | 'BLOCKED'
export type CmsMarketPosition = 'CRAFTER_CLASS_PLUS_EDUCATION_DIFFERENTIATED' | 'STRAPI_CLASS_PLUS_DIFFERENTIATED' | 'NOT_YET_COMPETITIVE'
export type CmsAdoptionRecommendation = 'PROCEED_TO_PHASE_12_ADOPTION_PLANNING' | 'HOLD_FOR_REMEDIATION'

export interface CmsEnvironmentRecord {
  id: string
  name: string
  kind: 'AUTHORING' | 'PREVIEW' | 'PUBLISHED'
  status: CmsEnvironmentStatus
  channel: string
  endpoint: string
  description: string
  last_promotion_at: string | null
}

export interface CmsWebhookRecord {
  id: string
  name: string
  url: string
  status: CmsWebhookStatus
  event_types: string[]
  last_delivery_at: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CmsPromotionRecord {
  id: string
  release_id: string
  release_name: string
  source_environment_id: string
  target_environment_id: string
  status: CmsPromotionStatus
  summary: string
  created_at: string
  completed_at: string | null
  created_by_user_id: string
}

export interface CmsOperationsSummaryResponse {
  generated_at: string
  environment_count: number
  webhook_count: number
  promotion_count: number
  latest_promotion_status: CmsPromotionStatus | null
  backup_count: number
  restore_count: number
  export_artifact_count: number
  import_validation_count: number
  benchmark_run_count: number
  resilience_run_count: number
  security_review_count: number
  readiness_review_count: number
  latest_readiness_decision: CmsReadinessDecision | null
  latest_benchmark_status: CmsEvidenceStatus | null
  latest_resilience_status: CmsEvidenceStatus | null
  latest_security_review_status: CmsEvidenceStatus | null
  latest_formal_review_status: CmsEvidenceStatus | null
  formal_review_count: number
  operations_health: CmsOperationsHealth
}

export interface CmsEnvironmentsResponse {
  generated_at: string
  environments: CmsEnvironmentRecord[]
  count: number
}

export interface CmsWebhooksResponse {
  generated_at: string
  webhooks: CmsWebhookRecord[]
  count: number
}

export interface CmsPromotionsResponse {
  generated_at: string
  promotions: CmsPromotionRecord[]
  count: number
}

export interface CmsManagedFileSummary {
  file_name: string
  persisted_path: string
  checksum_sha256: string
  byte_size: number
}

export interface CmsRunbookRecord {
  id: string
  title: string
  summary: string
}

export interface CmsSloDefinition {
  id: string
  name: string
  target: string
  summary: string
}

export interface CmsOperationsDiagnosticsResponse {
  generated_at: string
  health: CmsOperationsHealth
  scope_model: string
  counts: Record<string, number>
  runbooks: CmsRunbookRecord[]
  slo_definitions: CmsSloDefinition[]
  managed_files: CmsManagedFileSummary[]
}

export interface CmsHealthCheck {
  id: string
  name: string
  status: CmsEvidenceStatus
  summary: string
}

export interface CmsOperationsHealthResponse {
  generated_at: string
  overall_status: CmsOperationsHealth
  checks: CmsHealthCheck[]
  count: number
}

export interface CmsBackupArtifactRecord {
  id: string
  label: string
  status: CmsBackupStatus
  checksum_sha256: string
  object_key: string
  created_at: string
  created_by_user_id: string
  summary: {
    file_count: number
    total_bytes: number
    space_count: number
    schema_count: number
    entry_count: number
    release_count: number
    curriculum_course_count: number
    assessment_count: number
  }
}

export interface CmsBackupsResponse {
  generated_at: string
  backups: CmsBackupArtifactRecord[]
  count: number
}

export interface CmsRestoreRecord {
  id: string
  backup_id: string
  mode: CmsRestoreMode
  status: CmsRestoreStatus
  created_at: string
  created_by_user_id: string
  restart_required: boolean
  summary: {
    restored_file_count: number
    restored_bytes: number
    entry_count: number
    release_count: number
    curriculum_course_count: number
    assessment_count: number
  }
  checksum_sha256: string
}

export interface CmsRestoresResponse {
  generated_at: string
  restores: CmsRestoreRecord[]
  count: number
}

export type CmsExportArtifactStatus = 'READY'
export type CmsImportValidationStatus = 'VALIDATED' | 'FAILED'
export type CmsImportValidationTargetProfile =
  | 'IDP_LMS'
  | 'ACADEMIC_TUTORING'
  | 'K12_DISTRICT'
  | 'HIGHER_ED'
export type CmsExportArtifactTargetProfile = CmsImportValidationTargetProfile | 'GENERAL'

export interface CmsExportArtifactRecord {
  id: string
  label: string
  status: CmsExportArtifactStatus
  target_profile: CmsExportArtifactTargetProfile
  checksum_sha256: string
  object_key: string
  created_at: string
  created_by_user_id: string
  summary: {
    file_count: number
    total_bytes: number
    curriculum_bundle_count: number
    assessment_package_count: number
    standards_alignment_count: number
    accommodation_profile_count: number
    differentiated_variant_count: number
  }
}

export interface CmsExportsResponse {
  generated_at: string
  exports: CmsExportArtifactRecord[]
  count: number
}

export interface CmsImportValidationRecord {
  id: string
  export_artifact_id: string
  target_profile: CmsImportValidationTargetProfile
  status: CmsImportValidationStatus
  created_at: string
  created_by_user_id: string
  checksum_sha256: string
  summary: {
    validated_file_count: number
    validated_bytes: number
    curriculum_bundle_count: number
    assessment_package_count: number
    standards_alignment_count: number
    accommodation_profile_count: number
    differentiated_variant_count: number
    consumer_readiness: CmsAcademicConsumerReadinessSummary
    execution_plan: CmsAcademicImportExecutionPlanRecord
  }
  notes: string[]
}

export interface CmsAcademicConsumerReadinessSummary {
  manifest_count: number
  standards_framework_count: number
  dependency_graph_node_count: number
  dependency_graph_edge_count: number
  alternate_format_tag_count: number
  delivery_audience_count: number
  standards_framework_ids: string[]
  delivery_audiences: string[]
  dependency_graph_ready: boolean
  standards_ready: boolean
  accommodation_ready: boolean
  differentiated_delivery_ready: boolean
}

export type CmsAcademicImportExecutionPhaseStatus = 'READY' | 'BLOCKED'

export interface CmsAcademicImportExecutionPhaseRecord {
  id: string
  label: string
  status: CmsAcademicImportExecutionPhaseStatus
  actions: string[]
}

export interface CmsAcademicImportExecutionPlanRecord {
  execution_ready: boolean
  target_profile: CmsImportValidationTargetProfile
  required_standards_framework_ids: string[]
  required_grade_bands: string[]
  required_institution_tags: string[]
  required_delivery_audiences: string[]
  required_accommodation_profile_ids: string[]
  required_differentiation_profile_ids: string[]
  required_alternate_format_tags: string[]
  phases: CmsAcademicImportExecutionPhaseRecord[]
  activation_gates: string[]
  blocked_reasons: string[]
}

export interface CmsImportValidationsResponse {
  generated_at: string
  validations: CmsImportValidationRecord[]
  count: number
}

export interface CmsBenchmarkCheck {
  id: string
  name: string
  status: CmsEvidenceStatus
  target: string
  observed: string
  summary: string
}

export interface CmsBenchmarkRunRecord {
  id: string
  executed_at: string
  executed_by_user_id: string
  overall_status: CmsEvidenceStatus
  checks: CmsBenchmarkCheck[]
  count: number
}

export interface CmsBenchmarkRunsResponse {
  generated_at: string
  runs: CmsBenchmarkRunRecord[]
  count: number
}

export interface CmsResilienceCheck {
  id: string
  name: string
  status: CmsEvidenceStatus
  summary: string
}

export interface CmsResilienceRunRecord {
  id: string
  executed_at: string
  executed_by_user_id: string
  overall_status: CmsEvidenceStatus
  checks: CmsResilienceCheck[]
  count: number
}

export interface CmsResilienceRunsResponse {
  generated_at: string
  runs: CmsResilienceRunRecord[]
  count: number
}

export interface CmsSecurityReviewCheck {
  id: string
  name: string
  status: CmsEvidenceStatus
  summary: string
}

export interface CmsSecurityReviewRecord {
  id: string
  created_at: string
  created_by_user_id: string
  overall_status: CmsEvidenceStatus
  notes: string[]
  checks: CmsSecurityReviewCheck[]
  count: number
}

export interface CmsSecurityReviewSummaryResponse {
  generated_at: string
  overall_status: CmsEvidenceStatus
  latest_review: CmsSecurityReviewRecord | null
  checks: CmsSecurityReviewCheck[]
  count: number
}

export interface CmsSecurityReviewsResponse {
  generated_at: string
  reviews: CmsSecurityReviewRecord[]
  count: number
}

export interface CmsReadinessCheck {
  id: string
  name: string
  status: CmsEvidenceStatus
  summary: string
}

export interface CmsReadinessReviewRecord {
  id: string
  created_at: string
  created_by_user_id: string
  decision: CmsReadinessDecision
  notes: string[]
  checks: CmsReadinessCheck[]
  count: number
}

export interface CmsReadinessReviewSummaryResponse {
  generated_at: string
  latest_review: CmsReadinessReviewRecord | null
  reviews: CmsReadinessReviewRecord[]
  count: number
}

export interface CmsStandardsMatrixItem {
  id: string
  family: string
  capability: string
  status: CmsEvidenceStatus
  summary: string
}

export interface CmsInteroperabilityCheck {
  id: string
  delivery_family: string
  name: string
  status: CmsEvidenceStatus
  summary: string
  evidence: string
}

export interface CmsDifferentiationArea {
  id: string
  name: string
  status: CmsEvidenceStatus
  comparative_position: string
  summary: string
}

export interface CmsFormalReviewRecord {
  id: string
  created_at: string
  created_by_user_id: string
  overall_status: CmsEvidenceStatus
  market_position: CmsMarketPosition
  adoption_recommendation: CmsAdoptionRecommendation
  standalone_validation_complete: boolean
  standalone_production_ready: boolean
  crew_parity_complete: boolean
  strapi_class_complete: boolean
  crafter_class_complete: boolean
  education_differentiated: boolean
  notes: string[]
  standards_status: CmsEvidenceStatus
  interoperability_status: CmsEvidenceStatus
  operations_status: CmsEvidenceStatus
  differentiation_status: CmsEvidenceStatus
}

export interface CmsReviewSummaryResponse {
  generated_at: string
  standards_matrix_count: number
  interoperability_check_count: number
  differentiation_area_count: number
  portability_profile_count: number
  portability_overall_status: CmsEvidenceStatus
  portability_profiles: CmsPortabilityProfileStatus[]
  formal_review_count: number
  latest_market_position: CmsMarketPosition | null
  latest_adoption_recommendation: CmsAdoptionRecommendation | null
  latest_review: CmsFormalReviewRecord | null
}

export interface CmsPortabilityProfileStatus {
  target_profile: CmsImportValidationTargetProfile
  readiness_status: CmsEvidenceStatus
  latest_validation_status: CmsImportValidationStatus | null
  latest_validation_id: string | null
  latest_validation_at: string | null
  latest_export_artifact_id: string | null
  validation_count: number
  consumer_execution_count: number
  latest_consumer_execution_status: 'EXECUTED' | 'BLOCKED' | null
  latest_consumer_execution_id: string | null
  latest_consumer_execution_at: string | null
  standards_alignment_count: number
  accommodation_profile_count: number
  differentiated_variant_count: number
  consumer_readiness: CmsAcademicConsumerReadinessSummary | null
  execution_plan: CmsAcademicImportExecutionPlanRecord | null
  summary: string
  notes: string[]
}

export interface CmsStandardsMatrixResponse {
  generated_at: string
  items: CmsStandardsMatrixItem[]
  count: number
  overall_status: CmsEvidenceStatus
}

export interface CmsInteroperabilityResponse {
  generated_at: string
  checks: CmsInteroperabilityCheck[]
  portability_profiles: CmsPortabilityProfileStatus[]
  count: number
  overall_status: CmsEvidenceStatus
}

export interface CmsDifferentiationResponse {
  generated_at: string
  areas: CmsDifferentiationArea[]
  count: number
  overall_status: CmsEvidenceStatus
}

export interface CmsFormalReviewsResponse {
  generated_at: string
  latest_review: CmsFormalReviewRecord | null
  reviews: CmsFormalReviewRecord[]
  count: number
}

export type CmsAudienceBranchStatus = 'ACTIVE' | 'ARCHIVED'

export interface CmsAudiencePersonaRecord {
  id: string
  name: string
  summary: string
  taxonomy_tags: string[]
  default_audiences: string[]
  synthetic: boolean
  created_at: string
  updated_at: string
}

export interface CmsAudienceBranchRecord {
  id: string
  entry_id: string
  entry_title: string
  schema_id: string
  schema_name: string
  channel: string
  locale: string | null
  audience_key: string
  persona_ids: string[]
  summary: string
  status: CmsAudienceBranchStatus
  patch_payload: Record<string, unknown>
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CmsPersonalizationSummaryResponse {
  generated_at: string
  persona_count: number
  branch_count: number
  active_branch_count: number
  targeted_preview_ready: boolean
  author_assistance_ready: boolean
}

export interface CmsAudiencePersonasResponse {
  generated_at: string
  personas: CmsAudiencePersonaRecord[]
  count: number
}

export interface CmsAudienceBranchesResponse {
  generated_at: string
  branches: CmsAudienceBranchRecord[]
  count: number
}

export interface CreateCmsAudienceBranchRequest {
  entry_id: string
  audience_key: string
  persona_ids?: string[]
  channel?: string
  locale?: string | null
  summary?: string
  patch_payload?: Record<string, unknown>
}

export interface UpdateCmsAudienceBranchRequest {
  audience_key?: string
  persona_ids?: string[]
  channel?: string
  locale?: string | null
  summary?: string
  status?: CmsAudienceBranchStatus
  patch_payload?: Record<string, unknown>
}

export type CmsAuthorSuggestionKind = 'SEO' | 'LOCALIZATION' | 'TARGETING' | 'STRUCTURE' | 'CTA' | 'AI_DRAFT'

export interface CmsAuthorSuggestionRecord {
  id: string
  kind: CmsAuthorSuggestionKind
  title: string
  summary: string
  suggested_patch?: Record<string, unknown>
}

export interface CmsAuthorAssistanceRequest {
  entry_id: string
  locale?: string | null
  audience?: string | null
  branch_id?: string | null
}

export interface CmsAuthorAssistanceResponse {
  generated_at: string
  entry_id: string
  entry_title: string
  locale: string | null
  audience: string | null
  branch_id: string | null
  overall_score: number
  seo: {
    title_present: boolean
    summary_present: boolean
    title_length: number
    summary_length: number
    findings: string[]
  }
  localization: {
    available_locales: string[]
    locale_complete: boolean
    findings: string[]
  }
  content_quality: {
    word_count: number
    estimated_reading_time_minutes: number
    findings: string[]
  }
  suggestions: CmsAuthorSuggestionRecord[]
}

export type CmsExtensionPackageCategory =
  | 'SITE_BLUEPRINT'
  | 'DELIVERY_EXPERIENCE'
  | 'CURRICULUM'
  | 'ASSESSMENT'
  | 'AUTHORING_TOOLING'
  | 'TAXONOMY'
export type CmsExtensionPackageStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
export type CmsExtensionPackageSource = 'BUILT_IN' | 'VALIDATION_PACKAGE' | 'THIRD_PARTY_PREPARED'
export type CmsExtensionInstallationStatus = 'ACTIVE' | 'DISABLED'

export interface CmsExtensionPackageRecord {
  id: string
  key: string
  name: string
  summary: string
  category: CmsExtensionPackageCategory
  publisher: string
  version: string
  source: CmsExtensionPackageSource
  status: CmsExtensionPackageStatus
  blueprint_ids: string[]
  provided_schema_ids: string[]
  supported_channels: string[]
  synthetic: boolean
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CmsExtensionInstallationRecord {
  id: string
  package_id: string
  package_name: string
  package_version: string
  installation_name: string
  target_environment_id: string
  owner_tenant_id: string | null
  content_mode: CmsBlueprintContentMode
  status: CmsExtensionInstallationStatus
  blueprint_installation_ids: string[]
  installed_space_ids: string[]
  installed_schema_ids: string[]
  installed_entry_ids: string[]
  installed_at: string
  installed_by_user_id: string
}

export interface CmsExtensionMarketplaceSummaryResponse {
  generated_at: string
  package_count: number
  active_package_count: number
  installation_count: number
  active_installation_count: number
  blueprint_backed_package_count: number
  curriculum_package_count: number
  assessment_package_count: number
}

export interface CmsExtensionPackagesResponse {
  generated_at: string
  packages: CmsExtensionPackageRecord[]
  count: number
}

export interface CmsExtensionInstallationsResponse {
  generated_at: string
  installations: CmsExtensionInstallationRecord[]
  count: number
}

export interface CreateCmsExtensionPackageRequest {
  key: string
  name: string
  summary: string
  category: CmsExtensionPackageCategory
  publisher?: string
  version?: string
  source?: CmsExtensionPackageSource
  status?: CmsExtensionPackageStatus
  blueprint_ids?: string[]
  provided_schema_ids?: string[]
  supported_channels?: string[]
}

export interface UpdateCmsExtensionPackageRequest {
  name?: string
  summary?: string
  category?: CmsExtensionPackageCategory
  publisher?: string
  version?: string
  source?: CmsExtensionPackageSource
  status?: CmsExtensionPackageStatus
  blueprint_ids?: string[]
  provided_schema_ids?: string[]
  supported_channels?: string[]
}

export interface InstallCmsExtensionPackageRequest {
  installation_name?: string
  target_environment_id: string
  owner_tenant_id?: string | null
  content_mode?: CmsBlueprintContentMode
}

export interface CmsAcademicSummaryResponse {
  generated_at: string
  standards_framework_count: number
  standard_count: number
  taxonomy_axis_count: number
  accommodation_profile_count: number
  differentiation_profile_count: number
  academic_metadata_ready: boolean
}

export interface CmsAcademicStandardsFrameworkRecord {
  id: string
  code: string
  name: string
  issuing_body: string
  jurisdiction: string
  subject_areas: string[]
  grade_bands: string[]
  version_tag: string
  summary: string
  synthetic: boolean
  created_at: string
  updated_at: string
}

export interface CmsAcademicStandardsFrameworksResponse {
  generated_at: string
  frameworks: CmsAcademicStandardsFrameworkRecord[]
  count: number
}

export interface CmsAcademicStandardRecord {
  id: string
  framework_id: string
  code: string
  title: string
  summary: string
  subject_area: string
  grade_bands: string[]
  strand: string | null
  topic: string | null
  parent_standard_id: string | null
  objective_ids: string[]
  synthetic: boolean
  created_at: string
  updated_at: string
}

export interface CmsAcademicStandardsResponse {
  generated_at: string
  standards: CmsAcademicStandardRecord[]
  count: number
}

export interface CmsAcademicTaxonomyAxisRecord {
  id: string
  key: string
  label: string
  summary: string
  allowed_values: string[]
  synthetic: boolean
  created_at: string
  updated_at: string
}

export interface CmsAcademicTaxonomyAxesResponse {
  generated_at: string
  axes: CmsAcademicTaxonomyAxisRecord[]
  count: number
}

export interface CmsAccommodationProfileRecord {
  id: string
  key: string
  name: string
  summary: string
  supported_features: string[]
  intended_audiences: string[]
  synthetic: boolean
  created_at: string
  updated_at: string
}

export interface CmsAccommodationProfilesResponse {
  generated_at: string
  profiles: CmsAccommodationProfileRecord[]
  count: number
}

export interface CmsDifferentiationProfileRecord {
  id: string
  key: string
  name: string
  summary: string
  intended_roles: string[]
  delivery_modes: string[]
  synthetic: boolean
  created_at: string
  updated_at: string
}

export interface CmsDifferentiationProfilesResponse {
  generated_at: string
  profiles: CmsDifferentiationProfileRecord[]
  count: number
}

export interface CmsAcademicStandardsAlignmentRecord {
  standard_id: string
  alignment_strength: 'PRIMARY' | 'SECONDARY' | 'SUPPLEMENTAL'
  objective_ids: string[]
  notes?: string
}

export interface CmsAcademicTaxonomyAssignmentRecord {
  subject_tags: string[]
  grade_bands: string[]
  program_tags: string[]
  syllabus_family_tags: string[]
  institution_tags: string[]
  course_level_tags: string[]
}

export interface CmsAccommodationAssignmentRecord {
  profile_ids: string[]
  alternate_format_tags: string[]
  notes?: string
}

export interface CmsDifferentiatedVariantRecord {
  id: string
  profile_id: string
  title: string
  summary: string
  audience_label?: string
  delivery_mode?: string
  asset_entry_ids: string[]
  notes?: string
}

export interface CmsAcademicReleaseValidationRecord {
  ready_for_release: boolean
  blocking_count: number
  advisory_count: number
}

export interface CmsAcademicContentSnapshotRecord {
  delivery_mode: string | null
  academic_taxonomy: CmsAcademicTaxonomyAssignmentRecord
  standards_alignments: CmsAcademicStandardsAlignmentRecord[]
  standards_alignment_count: number
  accommodation_assignment: CmsAccommodationAssignmentRecord
  accommodation_profile_count: number
  alternate_format_tag_count: number
  differentiated_variants: CmsDifferentiatedVariantRecord[]
  differentiated_variant_count: number
  release_validation: CmsAcademicReleaseValidationRecord
}

export interface CmsAcademicCatalogFilters {
  subjectTag?: string
  gradeBand?: string
  programTag?: string
  standardId?: string
  accommodationProfileId?: string
  differentiationProfileId?: string
}

export interface CmsAcademicDeliverySelectionRecord {
  accommodation_profile_id: string | null
  alternate_format_tag: string | null
  differentiation_profile_id: string | null
  selected_differentiated_variant: CmsDifferentiatedVariantRecord | null
}

export interface CmsAcademicAccommodationExportRecord {
  supported_profiles: CmsAccommodationProfileRecord[]
  selected_profile: CmsAccommodationProfileRecord | null
  supported_alternate_format_tags: string[]
  selected_alternate_format_tag: string | null
  selected_differentiation_profile: CmsDifferentiationProfileRecord | null
  export_mode: 'STANDARD' | 'ACCOMMODATED' | 'DIFFERENTIATED' | 'ACCOMMODATED_DIFFERENTIATED'
  delivery_audiences: string[]
  notes: string[]
}

export interface CmsAcademicDeliverySelectionOptions {
  accommodationProfileId?: string
  alternateFormatTag?: string
  differentiationProfileId?: string
}

export type CmsCurriculumDeliveryMode = 'SELF_PACED' | 'INSTRUCTOR_LED' | 'BLENDED'

export interface CmsCurriculumModuleRecord {
  id: string
  title: string
  summary: string
  lesson_ids: string[]
  learning_outcomes: string[]
  prerequisite_module_ids: string[]
  standards_alignments: CmsAcademicStandardsAlignmentRecord[]
}

export interface CmsFlashcardRecord {
  prompt: string
  answer: string
  hint?: string
}

export interface CmsFlashcardSetRecord {
  id: string
  title: string
  summary: string
  cards: CmsFlashcardRecord[]
}

export interface CmsCurriculumAssetRecord {
  id: string
  title: string
  format?: string
  summary: string
  asset_uri?: string
  asset_uris?: string[]
  delivery_notes?: string
}

export interface CmsCurriculumCourseRecord {
  entry_id: string
  course_code: string
  title: string
  status: string
  delivery_mode: CmsCurriculumDeliveryMode
  estimated_duration_hours: number | null
  lesson_ids: string[]
  lesson_count: number
  module_count: number
  flashcard_count: number
  study_guide_count: number
  worksheet_count: number
  instructor_guide_count: number
  asset_set_count: number
  release_bundle_count: number
  latest_release_bundle_id: string | null
  standards_alignment_count: number
  prerequisite_reference_count: number
  differentiated_variant_count: number
  accommodation_profile_count: number
  updated_at: string
}

export interface CmsCurriculumReleaseBundleRecord {
  id: string
  course_entry_id: string
  course_title: string
  version_tag: string
  summary: string
  release_id: string
  release_name: string
  entry_ids: string[]
  lesson_entry_ids: string[]
  pinned_asset_count: number
  academic_snapshot: CmsAcademicContentSnapshotRecord
  created_at: string
  created_by_user_id: string
}

export interface CmsCurriculumSummaryResponse {
  generated_at: string
  course_count: number
  lesson_count: number
  module_count: number
  flashcard_count: number
  study_guide_count: number
  worksheet_count: number
  instructor_guide_count: number
  downloadable_asset_set_count: number
  release_bundle_count: number
  standards_alignment_count: number
  prerequisite_reference_count: number
  differentiated_variant_count: number
  accommodation_profile_assignment_count: number
  curriculum_authoring_ready: boolean
  curriculum_release_ready: boolean
}

export interface CmsCurriculumCoursesResponse {
  generated_at: string
  courses: CmsCurriculumCourseRecord[]
  count: number
}

export interface CmsCurriculumCourseDetailResponse {
  generated_at: string
  course: CmsCurriculumCourseRecord
  entry: CmsEntryRecord
  draft: CmsEntryDraftRecord | null
  published_payload: Record<string, unknown> | null
  modules: CmsCurriculumModuleRecord[]
  flashcard_sets: CmsFlashcardSetRecord[]
  study_guides: CmsCurriculumAssetRecord[]
  worksheets: CmsCurriculumAssetRecord[]
  instructor_guides: CmsCurriculumAssetRecord[]
  downloadable_asset_sets: CmsCurriculumAssetRecord[]
  academic_taxonomy: CmsAcademicTaxonomyAssignmentRecord
  standards_alignments: CmsAcademicStandardsAlignmentRecord[]
  prerequisite_course_entry_ids: string[]
  prerequisite_lesson_entry_ids: string[]
  accommodation_assignment: CmsAccommodationAssignmentRecord
  differentiated_variants: CmsDifferentiatedVariantRecord[]
  lessons: CmsEntryDetailResponse[]
  release_bundles: CmsCurriculumReleaseBundleRecord[]
}

export interface CmsCurriculumReleaseBundlesResponse {
  generated_at: string
  release_bundles: CmsCurriculumReleaseBundleRecord[]
  count: number
}

export interface CmsCurriculumExportManifestRecord {
  manifest_id: string
  portability_format: 'IDP_CMS_ACADEMIC_CURRICULUM_V1'
  artifact_kind: 'CURRICULUM_RELEASE_BUNDLE'
  artifact_id: string
  release_id: string
  release_name: string
  version_tag: string
  course_entry_id: string
  course_title: string
  entry_ids: string[]
  lesson_entry_ids: string[]
  selected_variant_entry_ids: string[]
  study_guide_asset_uris: string[]
  worksheet_asset_uris: string[]
  instructor_guide_asset_uris: string[]
  downloadable_asset_uris: string[]
  standard_ids: string[]
  academic_snapshot: CmsAcademicContentSnapshotRecord
  selection: CmsAcademicDeliverySelectionRecord
}

export interface CmsCurriculumExportManifestResponse {
  generated_at: string
  bundle: CmsCurriculumReleaseBundleRecord
  manifest: CmsCurriculumExportManifestRecord
}

export interface UpdateCmsCurriculumCourseRequest {
  delivery_mode?: CmsCurriculumDeliveryMode
  estimated_duration_hours?: number | null
  modules?: CmsCurriculumModuleRecord[]
  flashcard_sets?: CmsFlashcardSetRecord[]
  study_guides?: CmsCurriculumAssetRecord[]
  worksheets?: CmsCurriculumAssetRecord[]
  instructor_guides?: CmsCurriculumAssetRecord[]
  downloadable_asset_sets?: CmsCurriculumAssetRecord[]
  academic_taxonomy?: CmsAcademicTaxonomyAssignmentRecord
  standards_alignments?: CmsAcademicStandardsAlignmentRecord[]
  prerequisite_course_entry_ids?: string[]
  prerequisite_lesson_entry_ids?: string[]
  accommodation_assignment?: CmsAccommodationAssignmentRecord
  differentiated_variants?: CmsDifferentiatedVariantRecord[]
  release_notes?: Record<string, unknown> | string
}

export interface CreateCmsCurriculumReleaseBundleRequest {
  version_tag: string
  summary?: string
  lesson_entry_ids?: string[]
}

export type CmsAssessmentDeliveryMode = 'PRACTICE_EXAM' | 'QUIZ' | 'KNOWLEDGE_CHECK' | 'CERTIFICATION_PREP'

export interface CmsAssessmentAnswerChoiceRecord {
  id: string
  text: string
}

export interface CmsAssessmentRemediationNoteRecord {
  miss_reason: string
  corrective_guidance: string
  study_asset_references: string[]
}

export interface CmsAssessmentQuestionItemRecord {
  id: string
  prompt: string
  answer_choices: CmsAssessmentAnswerChoiceRecord[]
  correct_answer_id: string
  rationale: string
  difficulty_band?: string
  remediation_mapping: string[]
  question_pool_entry_id?: string
  question_pool_title?: string
  domain?: string
  standards_alignments?: CmsAcademicStandardsAlignmentRecord[]
}

export interface CmsAssessmentVariantRecord {
  id: string
  title: string
  question_pool_ids: string[]
  assembly_policy: Record<string, unknown>
}

export interface CmsAssessmentScoringBandRecord {
  id: string
  minimum_score: number
  label: string
  guidance?: string
}

export interface CmsAssessmentAssetRecord {
  id: string
  title: string
  format?: string
  summary: string
  asset_uri?: string
  asset_uris?: string[]
  delivery_notes?: string
}

export interface CmsQuestionPoolRecord {
  entry_id: string
  title: string
  domain: string
  difficulty: string | null
  question_item_count: number
  taxonomy_tags: string[]
  remediation_note_count: number
  standards_alignment_count: number
  accommodation_profile_count: number
  updated_at: string
}

export interface CmsAssessmentRecord {
  entry_id: string
  assessment_code: string
  title: string
  status: string
  delivery_mode: CmsAssessmentDeliveryMode
  estimated_duration_minutes: number | null
  question_pool_ids: string[]
  question_pool_count: number
  question_count: number
  variant_count: number
  remediation_asset_set_count: number
  package_count: number
  latest_package_id: string | null
  standards_alignment_count: number
  differentiated_variant_count: number
  accommodation_profile_count: number
  updated_at: string
}

export interface CmsAssessmentFormRecord {
  variant_id: string
  title: string
  question_pool_ids: string[]
  question_pool_titles: string[]
  question_item_ids: string[]
  question_count: number
  estimated_duration_minutes: number
  scoring_model: {
    passing_score: number
    scoring_bands: CmsAssessmentScoringBandRecord[]
  }
  questions: CmsAssessmentQuestionItemRecord[]
}

export interface CmsAssessmentPackageRecord {
  id: string
  assessment_entry_id: string
  assessment_title: string
  variant_id: string
  variant_title: string
  version_tag: string
  summary: string
  release_id: string
  release_name: string
  entry_ids: string[]
  question_pool_entry_ids: string[]
  question_item_ids: string[]
  question_count: number
  taxonomy_tags: string[]
  remediation_note_count: number
  academic_snapshot: CmsAcademicContentSnapshotRecord
  created_at: string
  created_by_user_id: string
}

export interface CmsAssessmentSummaryResponse {
  generated_at: string
  assessment_count: number
  question_pool_count: number
  question_item_count: number
  remediation_note_count: number
  variant_count: number
  package_count: number
  taxonomy_tag_count: number
  standards_alignment_count: number
  accommodation_profile_assignment_count: number
  differentiated_variant_count: number
  assessment_authoring_ready: boolean
  package_release_ready: boolean
}

export interface CmsAssessmentsResponse {
  generated_at: string
  assessments: CmsAssessmentRecord[]
  count: number
}

export interface CmsQuestionPoolsResponse {
  generated_at: string
  question_pools: CmsQuestionPoolRecord[]
  count: number
}

export interface CmsQuestionPoolDetailResponse {
  generated_at: string
  question_pool: CmsQuestionPoolRecord
  entry: CmsEntryRecord
  draft: CmsEntryDraftRecord | null
  published_payload: Record<string, unknown> | null
  learning_objectives: string[]
  source_references: Array<Record<string, unknown>>
  variant_policy: Record<string, unknown>
  academic_taxonomy: CmsAcademicTaxonomyAssignmentRecord
  standards_alignments: CmsAcademicStandardsAlignmentRecord[]
  accommodation_assignment: CmsAccommodationAssignmentRecord
  remediation_notes: CmsAssessmentRemediationNoteRecord[]
  question_items: CmsAssessmentQuestionItemRecord[]
}

export interface CmsAssessmentDetailResponse {
  generated_at: string
  assessment: CmsAssessmentRecord
  entry: CmsEntryRecord
  draft: CmsEntryDraftRecord | null
  published_payload: Record<string, unknown> | null
  instructions: string
  scoring_bands: CmsAssessmentScoringBandRecord[]
  remediation_asset_sets: CmsAssessmentAssetRecord[]
  academic_taxonomy: CmsAcademicTaxonomyAssignmentRecord
  standards_alignments: CmsAcademicStandardsAlignmentRecord[]
  accommodation_assignment: CmsAccommodationAssignmentRecord
  differentiated_variants: CmsDifferentiatedVariantRecord[]
  variants: CmsAssessmentVariantRecord[]
  question_pools: CmsQuestionPoolDetailResponse[]
  forms: CmsAssessmentFormRecord[]
  packages: CmsAssessmentPackageRecord[]
}

export interface CmsAssessmentPackagesResponse {
  generated_at: string
  packages: CmsAssessmentPackageRecord[]
  count: number
}

export interface CmsAssessmentExportManifestRecord {
  manifest_id: string
  portability_format: 'IDP_CMS_ACADEMIC_ASSESSMENT_V1'
  artifact_kind: 'ASSESSMENT_PACKAGE'
  artifact_id: string
  release_id: string
  release_name: string
  version_tag: string
  assessment_entry_id: string
  assessment_title: string
  variant_id: string
  variant_title: string
  entry_ids: string[]
  question_pool_entry_ids: string[]
  question_item_ids: string[]
  remediation_asset_uris: string[]
  standard_ids: string[]
  academic_snapshot: CmsAcademicContentSnapshotRecord
  selection: CmsAcademicDeliverySelectionRecord
}

export interface CmsAssessmentExportManifestResponse {
  generated_at: string
  package: CmsAssessmentPackageRecord
  manifest: CmsAssessmentExportManifestRecord
}

export interface UpdateCmsQuestionPoolRequest {
  domain?: string
  difficulty?: string | null
  learning_objectives?: string[] | Record<string, unknown>
  source_references?: Array<Record<string, unknown>>
  variant_policy?: Record<string, unknown>
  academic_taxonomy?: CmsAcademicTaxonomyAssignmentRecord
  standards_alignments?: CmsAcademicStandardsAlignmentRecord[]
  accommodation_assignment?: CmsAccommodationAssignmentRecord
  remediation_notes?: CmsAssessmentRemediationNoteRecord[]
  question_items?: CmsAssessmentQuestionItemRecord[]
  taxonomy_tags?: string[]
}

export interface UpdateCmsAssessmentRequest {
  passing_score?: number
  instructions?: string | Record<string, unknown>
  delivery_mode?: CmsAssessmentDeliveryMode
  estimated_duration_minutes?: number | null
  question_pool_ids?: string[]
  scoring_bands?: CmsAssessmentScoringBandRecord[]
  remediation_asset_sets?: CmsAssessmentAssetRecord[]
  academic_taxonomy?: CmsAcademicTaxonomyAssignmentRecord
  standards_alignments?: CmsAcademicStandardsAlignmentRecord[]
  accommodation_assignment?: CmsAccommodationAssignmentRecord
  differentiated_variants?: CmsDifferentiatedVariantRecord[]
  variants?: CmsAssessmentVariantRecord[]
  release_pinning_policy?: Record<string, unknown>
}

export interface CreateCmsAssessmentPackageRequest {
  variant_id?: string
  version_tag: string
  summary?: string
}

export type CmsGovernedContentKind = 'CURRICULUM_COURSE' | 'ASSESSMENT'
export type CmsGovernanceStageId =
  | 'INSTRUCTIONAL_DESIGN_REVIEW'
  | 'SME_REVIEW'
  | 'ASSESSMENT_REVIEW'
  | 'CERTIFICATION_COMPLIANCE_REVIEW'
export type CmsGovernanceWorkflowStatus =
  | 'NOT_SUBMITTED'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED_FOR_RELEASE'
  | 'RELEASED'
export type CmsGovernanceStageStatus = 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED'
export type CmsReleaseSafetyDecision = 'SAFE' | 'CONTROLLED_RELEASE_REQUIRED' | 'NO_GO'
export type CmsReleaseChangeSeverity = 'UNCHANGED' | 'EDITORIAL' | 'STRUCTURAL'
export type CmsAcademicValidationSeverity = 'BLOCKING' | 'ADVISORY'
export type CmsAcademicValidationCategory =
  | 'ACADEMIC_TAXONOMY'
  | 'STANDARDS_ALIGNMENT'
  | 'ACCOMMODATION'
  | 'DIFFERENTIATION'
  | 'DEPENDENCY_COVERAGE'

export interface CmsAcademicValidationFinding {
  id: string
  severity: CmsAcademicValidationSeverity
  category: CmsAcademicValidationCategory
  title: string
  message: string
  field_paths: string[]
  remediation: string
}

export interface CmsAcademicValidationSummary {
  ready_for_release: boolean
  blocking_count: number
  advisory_count: number
  findings: CmsAcademicValidationFinding[]
}

export interface CmsGovernanceStageRecord {
  stage_id: CmsGovernanceStageId
  label: string
  status: CmsGovernanceStageStatus
  decided_at: string | null
  decided_by_user_id: string | null
  notes: string | null
}

export interface CmsGovernedItemRecord {
  content_entry_id: string
  title: string
  content_kind: CmsGovernedContentKind
  schema_id: 'course' | 'assessment'
  dependency_entry_ids: string[]
  release_count: number
  workflow_status: CmsGovernanceWorkflowStatus
  current_stage_id: CmsGovernanceStageId | null
  release_safety: CmsReleaseSafetyDecision
  change_severity: CmsReleaseChangeSeverity
  changed_entry_ids: string[]
  changed_fields: string[]
  blocking_reason: string | null
  academic_validation: CmsAcademicValidationSummary
  latest_workflow_id: string | null
  approved_for_release_at: string | null
  updated_at: string
}

export interface CmsGovernanceWorkflowRecord {
  id: string
  content_entry_id: string
  title: string
  content_kind: CmsGovernedContentKind
  schema_id: 'course' | 'assessment'
  workflow_status: CmsGovernanceWorkflowStatus
  current_stage_id: CmsGovernanceStageId | null
  stages: CmsGovernanceStageRecord[]
  release_safety: CmsReleaseSafetyDecision
  change_severity: CmsReleaseChangeSeverity
  changed_entry_ids: string[]
  changed_fields: string[]
  blocking_reason: string | null
  academic_validation: CmsAcademicValidationSummary
  dependency_entry_ids: string[]
  release_count: number
  draft_fingerprint: string
  published_fingerprint: string
  submitted_at: string | null
  submitted_by_user_id: string | null
  updated_at: string
  approved_for_release_at: string | null
  released_at: string | null
}

export interface CmsInstructionalWorkflowSummaryResponse {
  generated_at: string
  governed_item_count: number
  course_count: number
  assessment_count: number
  workflow_count: number
  in_review_count: number
  changes_requested_count: number
  approved_for_release_count: number
  released_count: number
  controlled_release_count: number
  no_go_count: number
  instructional_review_ready: boolean
  learner_safe_release_ready: boolean
}

export interface CmsInstructionalWorkflowsResponse {
  generated_at: string
  items: CmsGovernedItemRecord[]
  count: number
}

export interface CmsInstructionalWorkflowDetailResponse {
  generated_at: string
  item: CmsGovernedItemRecord
  workflow: CmsGovernanceWorkflowRecord
  entry: CmsEntryRecord
  draft: CmsEntryDraftRecord | null
  published_payload: Record<string, unknown> | null
  dependency_entries: Array<{
    entry_id: string
    title: string
    schema_id: string
    draft_fingerprint: string
    published_fingerprint: string
    changed: boolean
  }>
}

export interface CmsReleaseSafetyResponse {
  generated_at: string
  content_entry_id: string
  title: string
  content_kind: CmsGovernedContentKind
  release_safety: CmsReleaseSafetyDecision
  change_severity: CmsReleaseChangeSeverity
  changed_entry_ids: string[]
  changed_fields: string[]
  blocking_reason: string | null
  required_stage_ids: CmsGovernanceStageId[]
  approved_for_current_draft: boolean
  academic_validation: CmsAcademicValidationSummary
}

export interface SubmitCmsInstructionalWorkflowRequest {
  notes?: string
}

export interface DecideCmsInstructionalWorkflowStageRequest {
  decision: 'APPROVE' | 'REQUEST_CHANGES'
  notes?: string
}

export interface CreateCmsWebhookRequest {
  name: string
  url: string
  event_types?: string[]
}

export interface UpdateCmsWebhookRequest {
  name?: string
  url?: string
  status?: CmsWebhookStatus
  event_types?: string[]
}

export interface CreateCmsPromotionRequest {
  release_id: string
  source_environment_id: string
  target_environment_id: string
  summary?: string
}

export interface CreateCmsExportArtifactRequest {
  label?: string | null
  target_profile?: CmsExportArtifactTargetProfile
}

export interface CreateCmsImportValidationRequest {
  export_artifact_id: string
  target_profile?: CmsImportValidationTargetProfile
  notes?: string[]
}

export interface CreateCmsSpaceRequest {
  name: string
  summary: string
  intended_consumers?: string[]
  supported_channels?: string[]
  supported_locales?: string[]
  status?: CmsSpaceStatus
  owner_tenant_id?: string | null
  clone_from_space_id?: string | null
}

export interface UpdateCmsSpaceRequest {
  name?: string
  summary?: string
  intended_consumers?: string[]
  supported_channels?: string[]
  supported_locales?: string[]
  status?: CmsSpaceStatus
}

export interface CreateCmsSchemaRequest {
  space_id: string
  name: string
  api_name?: string
  kind?: CmsSchemaKind
  summary?: string
  status?: CmsSchemaStatus
  fields?: CmsFieldDefinition[]
  template_members?: string[]
  compatibility_notes?: string[]
  owner_tenant_id?: string | null
  clone_from_schema_id?: string | null
}

export interface UpdateCmsSchemaRequest {
  name?: string
  api_name?: string
  kind?: CmsSchemaKind
  summary?: string
  status?: CmsSchemaStatus
  fields?: CmsFieldDefinition[]
  template_members?: string[]
  compatibility_notes?: string[]
}

export interface UpdateCmsTenantBindingRequest {
  active_space_ids: string[]
}

export interface HealthResponse {
  status: string
  service: string
  version: string
  timestamp: string
  environment: string
  runtime?: {
    generated_at: string
    process_started_at: string
    process_uptime_seconds: number
    active_requests: number
    requests_last_hour: number
    average_response_time_ms: number
    p95_response_time_ms: number
    availability_percent: number
  }
}

export type ApiDocsResponse = DeveloperDocsIndex

export type CommercePhase = 'PHASE_1' | 'PHASE_2' | 'PHASE_3' | 'PHASE_4' | 'PHASE_5' | 'PHASE_6' | 'PHASE_7' | 'PHASE_8' | 'PHASE_9' | 'PHASE_10'
export type CommerceSubsystemStatus =
  | 'PRODUCT_MASTER_AND_PRICING_IMPLEMENTED'
  | 'COMMERCIAL_ACCOUNTS_AND_B2B_IMPLEMENTED'
  | 'CHECKOUT_AND_ORDER_RUNTIME_IMPLEMENTED'
  | 'OMS_RUNTIME_IMPLEMENTED'
  | 'SUBSCRIPTIONS_BILLING_AND_USAGE_IMPLEMENTED'
  | 'PAYMENT_ORCHESTRATION_AND_PROVIDER_FRAMEWORK_IMPLEMENTED'
  | 'FINANCE_OPERATIONS_AND_RECONCILIATION_IMPLEMENTED'
  | 'ENTITLEMENT_AND_PROVISIONING_HANDOFF_IMPLEMENTED'
  | 'STANDALONE_PRODUCTIONIZATION_IMPLEMENTED'
  | 'STANDALONE_REVIEW_AND_ADOPTION_PLANNING_IMPLEMENTED'
export type CommerceMigrationState = 'BLOCKED_PENDING_STANDALONE_VALIDATION' | 'BLOCKED_PENDING_STANDALONE_ADOPTION'
export type CommerceNextPhase =
  | 'PHASE_2_ACCOUNTS_AND_B2B'
  | 'PHASE_3_CHECKOUT_AND_ORDER_RUNTIME'
  | 'PHASE_4_OMS_RUNTIME'
  | 'PHASE_5_SUBSCRIPTIONS_BILLING_AND_USAGE'
  | 'PHASE_6_PAYMENT_ORCHESTRATION_AND_PROVIDER_FRAMEWORK'
  | 'PHASE_7_FINANCE_OPERATIONS_AND_RECONCILIATION'
  | 'PHASE_8_ENTITLEMENT_AND_PROVISIONING_HANDOFF'
  | 'PHASE_9_STANDALONE_PRODUCTIONIZATION'
  | 'PHASE_10_STANDALONE_REVIEW_AND_ADOPTION_PLANNING'
  | 'PHASE_11_ADOPTION_PLANNING_ONLY'
export type CommerceScopeKind = 'PLATFORM_DEFAULT' | 'STANDALONE_VALIDATION' | 'CONSUMER_OVERRIDE'
export type CommerceCatalogStatus = 'STANDALONE_VALIDATION' | 'ACTIVE' | 'ARCHIVED'
export type CommerceProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
export type CommerceProductType = 'SUBSCRIPTION' | 'SERVICE' | 'DIGITAL' | 'PHYSICAL'
export type CommercePricingModel = 'SUBSCRIPTION' | 'ONE_TIME' | 'METERED' | 'QUOTE_REQUIRED'
export type CommerceBillingInterval = 'MONTHLY' | 'ANNUAL' | 'ONE_TIME' | 'USAGE'
export type CommerceOfferStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
export type CommercePriceBookStatus = 'ACTIVE' | 'ARCHIVED'
export type CommerceCommercialAccountStatus = 'ACTIVE' | 'ARCHIVED'
export type CommerceCommercialAccountKind = 'INDIVIDUAL' | 'COMMERCIAL_ORGANIZATION' | 'PUBLIC_SECTOR' | 'TRAINING_PROVIDER'
export type CommerceBillingAccountStatus = 'ACTIVE' | 'ON_HOLD' | 'ARCHIVED'
export type CommerceInvoiceDeliveryMode = 'EMAIL' | 'PORTAL'
export type CommercePaymentTerms = 'DUE_ON_RECEIPT' | 'NET_15' | 'NET_30' | 'NET_45'
export type CommerceCompanyNodeType = 'ROOT' | 'DIVISION' | 'DEPARTMENT' | 'TEAM'
export type CommerceBuyerRole = 'ACCOUNT_OWNER' | 'BUYER' | 'APPROVER' | 'BILLING_ADMIN' | 'VIEWER'
export type CommerceBuyerAssignmentStatus = 'ACTIVE' | 'DISABLED'
export type CommerceApprovalTriggerKind = 'QUOTE_REQUIRED' | 'ORDER_THRESHOLD' | 'CREDIT_EXCEPTION'
export type CommerceApprovalChainStatus = 'ACTIVE' | 'ARCHIVED'
export type CommerceCreditStatus = 'OPEN' | 'REVIEW' | 'ON_HOLD'
export type CommerceQuoteStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CONVERTED'
export type CommerceCartStatus = 'ACTIVE' | 'CHECKOUT_READY' | 'CONVERTED' | 'ABANDONED'
export type CommerceCheckoutKind = 'SELF_SERVICE' | 'QUOTE_CONVERSION'
export type CommerceCheckoutSessionStatus = 'OPEN' | 'COMPLETED' | 'ABANDONED' | 'FAILED'
export type CommerceOrderStatus = 'PLACED' | 'CONFIRMED' | 'CANCELLED'
export type CommerceInventoryLocationStatus = 'ACTIVE' | 'HOLD' | 'ARCHIVED'
export type CommerceInventoryBalanceStatus = 'ACTIVE' | 'HOLD' | 'ARCHIVED'
export type CommerceReservationStatus = 'ACTIVE' | 'ALLOCATED' | 'RELEASED' | 'EXPIRED'
export type CommerceAllocationStatus = 'ALLOCATED' | 'RELEASED' | 'SHIPPED' | 'CANCELLED'
export type CommerceRoutingStatus = 'PLANNED' | 'CONFIRMED' | 'RELEASED'
export type CommerceRoutingMode = 'SINGLE_LOCATION' | 'SPLIT_SHIPMENT'
export type CommerceShipmentStatus = 'PENDING' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'RETURNED' | 'CANCELLED'
export type CommerceShipmentMethod = 'GROUND' | 'AIR' | 'DIGITAL' | 'SERVICE_DISPATCH' | 'PICKUP'
export type CommerceReturnStatus = 'REQUESTED' | 'AUTHORIZED' | 'RECEIVED' | 'REFUNDED' | 'EXCHANGED' | 'REJECTED'
export type CommerceReturnKind = 'RETURN' | 'EXCHANGE'
export type CommerceClaimType = 'DAMAGE' | 'LOSS' | 'SHORT_SHIP' | 'SERVICE_EXCEPTION'
export type CommerceClaimStatus = 'OPEN' | 'INVESTIGATING' | 'APPROVED' | 'REJECTED' | 'RESOLVED'
export type CommerceSubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED'
export type CommerceBillingScheduleStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
export type CommerceBillingScheduleCadence = 'MONTHLY' | 'ANNUAL' | 'ON_DEMAND'
export type CommerceUsageMeterStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
export type CommerceUsageAggregation = 'SUM' | 'MAX'
export type CommerceInvoiceStatus = 'DRAFT' | 'OPEN' | 'PAST_DUE' | 'PAID' | 'VOID'
export type CommerceInvoiceLineKind = 'BASE_SUBSCRIPTION' | 'USAGE_CHARGE' | 'ONE_TIME_ADJUSTMENT'
export type CommerceDunningStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'WRITEOFF'
export type CommerceAccountsReceivableStatus = 'CURRENT' | 'ATTENTION' | 'PAST_DUE' | 'COLLECTIONS'
export type CommerceProviderKind = 'PAYMENT' | 'TAX' | 'SHIPPING' | 'FRAUD'
export type CommerceProviderStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED'
export type CommercePaymentMethodKind = 'CARD' | 'ACH' | 'APPLE_PAY' | 'GOOGLE_PAY' | 'PAYPAL' | 'BANK_REDIRECT' | 'PURCHASE_ORDER'
export type CommercePaymentIntentStatus = 'REQUIRES_CONFIRMATION' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'
export type CommercePaymentAttemptStatus = 'ROUTED' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'REFUNDED' | 'DISPUTED'
export type CommerceWebhookEventStatus = 'RECEIVED' | 'PROCESSED' | 'IGNORED' | 'FAILED'
export type CommerceRefundStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'
export type CommerceDisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'WON' | 'LOST'
export type CommerceFraudDecision = 'APPROVE' | 'REVIEW' | 'BLOCK'
export type CommerceReconciliationJobStatus = 'RUNNING' | 'PASSED' | 'ATTENTION' | 'FAILED'
export type CommerceSettlementReferenceStatus = 'OPEN' | 'RECONCILED' | 'EXPORTED'
export type CommerceRevenueExportKind = 'GL_SUMMARY' | 'REVENUE_RECOGNITION' | 'PAYOUT_DETAIL'
export type CommerceRevenueExportStatus = 'READY' | 'EXPORTED' | 'ARCHIVED'
export type CommerceSupportCaseKind =
  | 'ORDER_EXCEPTION'
  | 'PAYMENT_EXCEPTION'
  | 'REFUND_REQUEST'
  | 'DISPUTE_RESPONSE'
  | 'POST_PURCHASE_SUPPORT'
  | 'BILLING_REVIEW'
export type CommerceSupportCaseStatus = 'OPEN' | 'IN_PROGRESS' | 'ESCALATED' | 'RESOLVED'
export type CommerceSupportInterventionAction =
  | 'ADD_NOTE'
  | 'MARK_INVOICE_PAID'
  | 'CANCEL_ORDER'
  | 'RESOLVE_REFUND'
  | 'ESCALATE_DISPUTE'
  | 'CLOSE_DISPUTE_WON'
  | 'AUTHORIZE_RETURN'
  | 'RESOLVE_CLAIM'
export type CommerceOrderEventType =
  | 'CART_CREATED'
  | 'CHECKOUT_STARTED'
  | 'CHECKOUT_COMPLETED'
  | 'QUOTE_CONVERTED'
  | 'ORDER_PLACED'
  | 'ORDER_CANCELLED'
export type CommerceConsumerApplicationKind =
  | 'IAM'
  | 'CMS'
  | 'TRAINING'
  | 'IDP_PLATFORM'
  | 'PARTNER_EMBEDDED'
export type CommerceApplicationBindingStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED'
export type CommerceOfferOverrideStatus = 'ACTIVE' | 'ARCHIVED'
export type CommerceProvisioningTargetKind =
  | 'REALM_MEMBERSHIP'
  | 'CMS_SPACE_ACCESS'
  | 'TRAINING_COURSE_ACCESS'
  | 'APPLICATION_FEATURE_SET'
  | 'SERVICE_ENGAGEMENT'
export type CommerceEntitlementGrantStatus = 'PENDING' | 'ACTIVE' | 'REVOKED' | 'EXPIRED'
export type CommerceProvisioningGrantStatus = 'PENDING' | 'READY' | 'PROVISIONED' | 'FAILED' | 'REVOKED'
export type CommerceHandoffEventType =
  | 'ENTITLEMENT_GRANTED'
  | 'ENTITLEMENT_REVOKED'
  | 'PROVISIONING_REQUESTED'
  | 'PROVISIONING_COMPLETED'
  | 'PROVISIONING_REVOKED'
export type CommerceHandoffEventDeliveryStatus = 'READY' | 'DELIVERED' | 'ACKNOWLEDGED' | 'FAILED'
export type CommerceOperationsHealth = 'HEALTHY' | 'DEGRADED' | 'FAILED'
export type CommerceBackupStatus = 'READY'
export type CommerceRestoreMode = 'DRY_RUN' | 'EXECUTE'
export type CommerceRestoreStatus = 'VALIDATED' | 'APPLIED'
export type CommerceExportArtifactStatus = 'READY'
export type CommerceImportValidationStatus = 'VALIDATED' | 'FAILED'
export type CommerceEvidenceStatus = 'PASS' | 'WARN' | 'FAIL'
export type CommerceReadinessDecision = 'APPROVED' | 'BLOCKED'
export type CommerceReviewStatus = 'PASS' | 'WARN' | 'FAIL'
export type CommerceMarketPosition = 'COMPOSABLE_COMMERCE_PLUS_DIFFERENTIATED' | 'HEADLESS_COMMERCE_COMPETITIVE' | 'NOT_YET_COMPETITIVE'
export type CommerceAdoptionRecommendation = 'PROCEED_TO_PHASE_11_ADOPTION_PLANNING' | 'HOLD_FOR_REMEDIATION'

export interface CommerceSummaryResponse {
  generated_at: string
  phase: CommercePhase
  subsystem_status: CommerceSubsystemStatus
  migration_state: CommerceMigrationState
  admin_surface_route: '/commerce'
  scope_model: 'STANDALONE_COMMERCE_WITH_CONSUMER_BINDINGS'
  global_admin_role: 'super_administrator'
  validation_domain_count: number
  catalog_count: number
  product_count: number
  variant_count: number
  price_book_count: number
  offer_count: number
  active_offer_count: number
  commercial_account_count: number
  billing_account_count: number
  company_hierarchy_node_count: number
  buyer_role_assignment_count: number
  approval_chain_count: number
  active_approval_chain_count: number
  credit_profile_count: number
  quote_count: number
  open_quote_count: number
  cart_count: number
  active_cart_count: number
  checkout_session_count: number
  open_checkout_session_count: number
  order_count: number
  open_order_count: number
  order_event_count: number
  inventory_location_count: number
  inventory_balance_count: number
  atp_ready_record_count: number
  reservation_count: number
  active_reservation_count: number
  allocation_count: number
  active_allocation_count: number
  routing_record_count: number
  shipment_count: number
  open_shipment_count: number
  return_count: number
  open_return_count: number
  claim_count: number
  open_claim_count: number
  subscription_count: number
  active_subscription_count: number
  billing_schedule_count: number
  active_billing_schedule_count: number
  usage_meter_count: number
  active_usage_meter_count: number
  usage_entry_count: number
  invoice_count: number
  open_invoice_count: number
  paid_invoice_count: number
  dunning_event_count: number
  open_dunning_event_count: number
  accounts_receivable_count: number
  payment_provider_count: number
  active_payment_provider_count: number
  tax_provider_count: number
  shipping_provider_count: number
  fraud_provider_count: number
  payment_intent_count: number
  payment_attempt_count: number
  successful_payment_attempt_count: number
  payment_webhook_event_count: number
  refund_count: number
  open_refund_count: number
  dispute_count: number
  open_dispute_count: number
  tax_quote_count: number
  shipping_quote_count: number
  fraud_screening_count: number
  reconciliation_job_count: number
  open_reconciliation_job_count: number
  settlement_reference_count: number
  pending_export_settlement_count: number
  revenue_export_count: number
  exported_revenue_export_count: number
  support_case_count: number
  open_support_case_count: number
  application_binding_count: number
  active_application_binding_count: number
  offer_override_count: number
  active_offer_override_count: number
  entitlement_grant_count: number
  active_entitlement_grant_count: number
  provisioning_grant_count: number
  active_provisioning_grant_count: number
  handoff_event_count: number
  ready_handoff_event_count: number
  backup_count: number
  restore_count: number
  export_artifact_count: number
  import_validation_count: number
  benchmark_run_count: number
  resilience_run_count: number
  readiness_review_count: number
  formal_review_count: number
  operations_health: CommerceOperationsHealth
  latest_market_position: CommerceMarketPosition | null
  first_contract_ids: string[]
  next_recommended_phase: CommerceNextPhase
}

export interface CommerceFinanceSummaryResponse {
  generated_at: string
  phase: CommercePhase
  reconciliation_job_count: number
  open_reconciliation_job_count: number
  settlement_reference_count: number
  pending_export_settlement_count: number
  revenue_export_count: number
  exported_revenue_export_count: number
  support_case_count: number
  open_support_case_count: number
  captured_amount_minor: number
  refunded_amount_minor: number
  disputed_amount_minor: number
  net_cash_amount_minor: number
  currency: string
}

export interface CommerceHandoffSummaryResponse {
  generated_at: string
  phase: CommercePhase
  application_binding_count: number
  active_application_binding_count: number
  offer_override_count: number
  active_offer_override_count: number
  entitlement_grant_count: number
  active_entitlement_grant_count: number
  provisioning_grant_count: number
  active_provisioning_grant_count: number
  handoff_event_count: number
  ready_handoff_event_count: number
  delivered_handoff_event_count: number
  bound_consumer_kinds: CommerceConsumerApplicationKind[]
}

export interface CommerceManagedFileSummary {
  file_name: string
  persisted_path: string
  checksum_sha256: string
  byte_size: number
}

export interface CommerceBackupArtifactRecord {
  id: string
  label: string
  status: CommerceBackupStatus
  checksum_sha256: string
  object_key: string
  created_at: string
  created_by_user_id: string
  summary: {
    file_count: number
    total_bytes: number
    catalog_count: number
    product_count: number
    offer_count: number
    order_count: number
    invoice_count: number
    handoff_event_count: number
  }
}

export interface CommerceRestoreRecord {
  id: string
  backup_id: string
  mode: CommerceRestoreMode
  status: CommerceRestoreStatus
  created_at: string
  created_by_user_id: string
  restart_required: boolean
  summary: {
    restored_file_count: number
    restored_bytes: number
    order_count: number
    invoice_count: number
    handoff_event_count: number
  }
  checksum_sha256: string
}

export interface CommerceExportArtifactRecord {
  id: string
  label: string
  status: CommerceExportArtifactStatus
  checksum_sha256: string
  object_key: string
  created_at: string
  created_by_user_id: string
  summary: {
    file_count: number
    total_bytes: number
    catalog_count: number
    price_book_count: number
    offer_count: number
    commercial_account_count: number
    subscription_count: number
    handoff_event_count: number
  }
}

export interface CommerceImportValidationRecord {
  id: string
  export_artifact_id: string
  status: CommerceImportValidationStatus
  created_at: string
  created_by_user_id: string
  checksum_sha256: string
  summary: {
    validated_file_count: number
    validated_bytes: number
    offer_count: number
    subscription_count: number
    handoff_event_count: number
  }
  notes: string[]
}

export interface CommerceBenchmarkCheck {
  id: string
  name: string
  status: CommerceEvidenceStatus
  target: string
  observed: string
  summary: string
}

export interface CommerceBenchmarkRunRecord {
  id: string
  executed_at: string
  executed_by_user_id: string
  overall_status: CommerceEvidenceStatus
  checks: CommerceBenchmarkCheck[]
  count: number
}

export interface CommerceResilienceCheck {
  id: string
  name: string
  status: CommerceEvidenceStatus
  summary: string
}

export interface CommerceResilienceRunRecord {
  id: string
  executed_at: string
  executed_by_user_id: string
  overall_status: CommerceEvidenceStatus
  checks: CommerceResilienceCheck[]
  count: number
}

export interface CommerceReadinessCheck {
  id: string
  name: string
  status: CommerceEvidenceStatus
  summary: string
}

export interface CommerceReadinessReviewRecord {
  id: string
  created_at: string
  created_by_user_id: string
  decision: CommerceReadinessDecision
  notes: string[]
  checks: CommerceReadinessCheck[]
  count: number
}

export interface CommerceRunbookRecord {
  id: string
  title: string
  summary: string
}

export interface CommerceSloDefinition {
  id: string
  name: string
  target: string
  summary: string
}

export interface CommerceOperationsSummaryResponse {
  generated_at: string
  backup_count: number
  restore_count: number
  export_artifact_count: number
  import_validation_count: number
  benchmark_run_count: number
  resilience_run_count: number
  readiness_review_count: number
  latest_benchmark_status: CommerceEvidenceStatus | null
  latest_resilience_status: CommerceEvidenceStatus | null
  latest_readiness_decision: CommerceReadinessDecision | null
  operations_health: CommerceOperationsHealth
}

export interface CommerceDiagnosticsCheck {
  id: string
  name: string
  status: CommerceEvidenceStatus
  summary: string
}

export interface CommerceOperationsDiagnosticsResponse {
  generated_at: string
  operations_health: CommerceOperationsHealth
  managed_files: CommerceManagedFileSummary[]
  runbooks: CommerceRunbookRecord[]
  slos: CommerceSloDefinition[]
  checks: CommerceDiagnosticsCheck[]
  commerce_metrics: {
    order_count: number
    invoice_count: number
    revenue_export_count: number
    payment_intent_count: number
    handoff_event_count: number
  }
}

export interface CommerceOperationsHealthResponse {
  generated_at: string
  operations_health: CommerceOperationsHealth
  checks: CommerceDiagnosticsCheck[]
}

export interface CommerceRunbooksResponse {
  generated_at: string
  runbooks: CommerceRunbookRecord[]
  count: number
}

export interface CommerceBackupsResponse {
  generated_at: string
  backups: CommerceBackupArtifactRecord[]
  count: number
}

export interface CommerceRestoresResponse {
  generated_at: string
  restores: CommerceRestoreRecord[]
  count: number
}

export interface CommerceExportArtifactsResponse {
  generated_at: string
  exports: CommerceExportArtifactRecord[]
  count: number
}

export interface CommerceImportValidationsResponse {
  generated_at: string
  validations: CommerceImportValidationRecord[]
  count: number
}

export interface CommerceBenchmarksResponse {
  generated_at: string
  benchmarks: CommerceBenchmarkRunRecord[]
  count: number
}

export interface CommerceResilienceRunsResponse {
  generated_at: string
  runs: CommerceResilienceRunRecord[]
  count: number
}

export interface CommerceReadinessReviewsResponse {
  generated_at: string
  latest_review: CommerceReadinessReviewRecord | null
  reviews: CommerceReadinessReviewRecord[]
  count: number
}

export interface CommerceStandardsMatrixItem {
  id: string
  family: string
  capability: string
  status: CommerceReviewStatus
  summary: string
}

export interface CommerceStandardsMatrixResponse {
  generated_at: string
  overall_status: CommerceReviewStatus
  items: CommerceStandardsMatrixItem[]
  count: number
}

export interface CommerceInteroperabilityCheck {
  id: string
  workflow_family: string
  name: string
  status: CommerceReviewStatus
  summary: string
  evidence: string
}

export interface CommerceInteroperabilityResponse {
  generated_at: string
  overall_status: CommerceReviewStatus
  checks: CommerceInteroperabilityCheck[]
  count: number
}

export interface CommerceDifferentiationArea {
  id: string
  name: string
  status: CommerceReviewStatus
  comparative_position: string
  summary: string
}

export interface CommerceDifferentiationResponse {
  generated_at: string
  overall_status: CommerceReviewStatus
  areas: CommerceDifferentiationArea[]
  count: number
}

export interface CommerceFormalReviewRecord {
  id: string
  created_at: string
  created_by_user_id: string
  overall_status: CommerceReviewStatus
  market_position: CommerceMarketPosition
  adoption_recommendation: CommerceAdoptionRecommendation
  standalone_validation_complete: boolean
  standalone_production_ready: boolean
  headless_commerce_competitive: boolean
  composable_commerce_plus_differentiated: boolean
  notes: string[]
  standards_status: CommerceReviewStatus
  interoperability_status: CommerceReviewStatus
  operations_status: CommerceReviewStatus
  differentiation_status: CommerceReviewStatus
}

export interface CommerceReviewSummaryResponse {
  generated_at: string
  standards_matrix_count: number
  interoperability_check_count: number
  differentiation_area_count: number
  formal_review_count: number
  latest_market_position: CommerceMarketPosition | null
  latest_adoption_recommendation: CommerceAdoptionRecommendation | null
  latest_review: CommerceFormalReviewRecord | null
}

export interface CommerceFormalReviewsResponse {
  generated_at: string
  latest_review: CommerceFormalReviewRecord | null
  reviews: CommerceFormalReviewRecord[]
  count: number
}

export interface CommerceValidationDomain {
  id: string
  name: string
  summary: string
  proves: string[]
  migration_blocked: boolean
}

export interface CommerceProductAttributeRecord {
  id: string
  name: string
}

export interface CommerceProductVariantRecord {
  id: string
  label: string
  sku: string
}

export interface CommerceCatalogRecord {
  id: string
  name: string
  summary: string
  scope_kind: CommerceScopeKind
  status: CommerceCatalogStatus
  validation_domain_id: string
  default_currency: string
  supported_currencies: string[]
  intended_channels: string[]
  owner_consumer_id: string | null
  source_catalog_id: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceProductRecord {
  id: string
  name: string
  summary: string
  product_type: CommerceProductType
  status: CommerceProductStatus
  sku: string
  catalog_ids: string[]
  merchandising_tags: string[]
  entitlement_keys: string[]
  attributes: CommerceProductAttributeRecord[]
  variants: CommerceProductVariantRecord[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommercePriceBookRecord {
  id: string
  name: string
  summary: string
  status: CommercePriceBookStatus
  currency: string
  target_catalog_ids: string[]
  pricing_notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceOfferRecord {
  id: string
  name: string
  summary: string
  status: CommerceOfferStatus
  catalog_id: string
  product_id: string
  price_book_id: string
  pricing_model: CommercePricingModel
  billing_interval: CommerceBillingInterval
  amount_minor: number
  currency: string
  entitlement_keys: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceCommercialAccountRecord {
  id: string
  name: string
  summary: string
  kind: CommerceCommercialAccountKind
  status: CommerceCommercialAccountStatus
  validation_domain_id: string
  primary_catalog_ids: string[]
  default_currency: string
  root_company_node_id: string | null
  billing_account_id: string | null
  credit_profile_id: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceBillingAccountRecord {
  id: string
  commercial_account_id: string
  name: string
  status: CommerceBillingAccountStatus
  billing_contact_email: string
  currency: string
  invoice_delivery_mode: CommerceInvoiceDeliveryMode
  payment_terms: CommercePaymentTerms
  tax_region: string
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceCompanyHierarchyNodeRecord {
  id: string
  commercial_account_id: string
  name: string
  node_type: CommerceCompanyNodeType
  parent_node_id: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceBuyerRoleAssignmentRecord {
  id: string
  commercial_account_id: string
  scope_node_id: string | null
  principal_label: string
  principal_email: string
  role: CommerceBuyerRole
  status: CommerceBuyerAssignmentStatus
  spending_limit_minor: number | null
  approval_threshold_minor: number | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceApprovalChainRecord {
  id: string
  commercial_account_id: string
  name: string
  status: CommerceApprovalChainStatus
  trigger_kind: CommerceApprovalTriggerKind
  scope_node_id: string | null
  threshold_minor: number | null
  approver_role_ids: string[]
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceCreditProfileRecord {
  id: string
  commercial_account_id: string
  status: CommerceCreditStatus
  credit_limit_minor: number
  available_credit_minor: number
  payment_terms: CommercePaymentTerms
  risk_notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceQuoteLineItemRecord {
  id: string
  product_id: string
  offer_id: string
  quantity: number
  unit_amount_minor: number
  summary: string
}

export interface CommerceQuoteRecord {
  id: string
  commercial_account_id: string
  billing_account_id: string
  catalog_id: string
  requested_by_buyer_role_id: string
  status: CommerceQuoteStatus
  currency: string
  line_items: CommerceQuoteLineItemRecord[]
  total_amount_minor: number
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceCartLineItemRecord {
  id: string
  product_id: string
  offer_id: string
  quantity: number
  unit_amount_minor: number
  summary: string
}

export interface CommerceCartRecord {
  id: string
  commercial_account_id: string
  billing_account_id: string
  catalog_id: string
  requested_by_buyer_role_id: string | null
  source_quote_id: string | null
  status: CommerceCartStatus
  currency: string
  line_items: CommerceCartLineItemRecord[]
  total_amount_minor: number
  notes: string[]
  checkout_session_id: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceCheckoutSessionRecord {
  id: string
  cart_id: string
  commercial_account_id: string
  source_quote_id: string | null
  checkout_kind: CommerceCheckoutKind
  status: CommerceCheckoutSessionStatus
  checkout_reference: string
  return_url: string | null
  order_id: string | null
  started_at: string
  completed_at: string | null
  abandoned_at: string | null
  failed_at: string | null
  failure_reason: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceOrderLineItemRecord {
  id: string
  product_id: string
  offer_id: string
  quantity: number
  unit_amount_minor: number
  summary: string
}

export interface CommerceOrderRecord {
  id: string
  order_number: string
  commercial_account_id: string
  billing_account_id: string
  catalog_id: string
  placed_by_buyer_role_id: string | null
  source_cart_id: string
  source_quote_id: string | null
  checkout_session_id: string | null
  status: CommerceOrderStatus
  currency: string
  line_items: CommerceOrderLineItemRecord[]
  total_amount_minor: number
  notes: string[]
  placed_at: string
  cancelled_at: string | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceOrderEventRecord {
  id: string
  order_id: string
  event_type: CommerceOrderEventType
  summary: string
  detail: string | null
  source_cart_id: string | null
  source_quote_id: string | null
  checkout_session_id: string | null
  actor_user_id: string
  occurred_at: string
}

export interface CommerceInventoryLocationRecord {
  id: string
  name: string
  summary: string
  validation_domain_id: string
  status: CommerceInventoryLocationStatus
  region_code: string
  supported_methods: CommerceShipmentMethod[]
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceInventoryBalanceRecord {
  id: string
  location_id: string
  product_id: string
  sku: string
  status: CommerceInventoryBalanceStatus
  on_hand_quantity: number
  reserved_quantity: number
  allocated_quantity: number
  safety_stock_quantity: number
  reorder_point_quantity: number
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceAtpRecord {
  product_id: string
  sku: string
  total_on_hand_quantity: number
  total_reserved_quantity: number
  total_allocated_quantity: number
  total_available_to_promise_quantity: number
  location_breakdown: Array<{
    location_id: string
    available_to_promise_quantity: number
  }>
}

export interface CommerceReservationRecord {
  id: string
  order_id: string
  order_line_id: string
  product_id: string
  requested_quantity: number
  preferred_location_id: string | null
  status: CommerceReservationStatus
  expires_at: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceAllocationRecord {
  id: string
  reservation_id: string
  order_id: string
  order_line_id: string
  product_id: string
  location_id: string
  allocated_quantity: number
  route_group: string
  shipment_id: string | null
  status: CommerceAllocationStatus
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceRoutingRecord {
  id: string
  order_id: string
  allocation_ids: string[]
  shipment_ids: string[]
  routing_mode: CommerceRoutingMode
  status: CommerceRoutingStatus
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceShipmentRecord {
  id: string
  order_id: string
  routing_id: string | null
  location_id: string
  allocation_ids: string[]
  shipment_number: string
  shipment_method: CommerceShipmentMethod
  carrier: string
  tracking_number: string | null
  status: CommerceShipmentStatus
  notes: string[]
  shipped_at: string | null
  delivered_at: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceReturnRecord {
  id: string
  order_id: string
  shipment_id: string | null
  order_line_id: string | null
  return_kind: CommerceReturnKind
  requested_quantity: number
  reason: string
  status: CommerceReturnStatus
  claim_id: string | null
  resolution_summary: string | null
  notes: string[]
  requested_at: string
  received_at: string | null
  completed_at: string | null
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceClaimRecord {
  id: string
  order_id: string
  shipment_id: string | null
  return_id: string | null
  claim_type: CommerceClaimType
  summary: string
  status: CommerceClaimStatus
  resolution_notes: string | null
  notes: string[]
  opened_at: string
  resolved_at: string | null
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceSubscriptionRecord {
  id: string
  commercial_account_id: string
  billing_account_id: string
  product_id: string
  offer_id: string
  source_order_id: string | null
  status: CommerceSubscriptionStatus
  quantity: number
  currency: string
  unit_amount_minor: number
  billing_interval: CommerceBillingInterval
  current_period_started_at: string
  current_period_ends_at: string
  next_billing_at: string
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceBillingScheduleRecord {
  id: string
  commercial_account_id: string
  billing_account_id: string
  subscription_id: string | null
  name: string
  status: CommerceBillingScheduleStatus
  cadence: CommerceBillingScheduleCadence
  currency: string
  run_day_of_month: number | null
  usage_meter_ids: string[]
  next_run_at: string
  last_run_at: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceUsageMeterRecord {
  id: string
  commercial_account_id: string
  billing_account_id: string
  subscription_id: string | null
  product_id: string | null
  name: string
  status: CommerceUsageMeterStatus
  unit_label: string
  aggregation: CommerceUsageAggregation
  included_quantity: number
  overage_amount_minor: number
  currency: string
  current_period_started_at: string
  current_period_ends_at: string
  total_recorded_quantity: number
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceUsageEntryRecord {
  id: string
  usage_meter_id: string
  quantity: number
  occurred_at: string
  source_key: string | null
  summary: string
  created_at: string
  created_by_user_id: string
}

export interface CommerceInvoiceLineItemRecord {
  id: string
  line_kind: CommerceInvoiceLineKind
  subscription_id: string | null
  usage_meter_id: string | null
  summary: string
  quantity: number
  unit_amount_minor: number
  amount_minor: number
}

export interface CommerceInvoiceRecord {
  id: string
  invoice_number: string
  commercial_account_id: string
  billing_account_id: string
  subscription_id: string | null
  billing_schedule_id: string | null
  status: CommerceInvoiceStatus
  currency: string
  line_items: CommerceInvoiceLineItemRecord[]
  total_amount_minor: number
  outstanding_amount_minor: number
  due_at: string
  issued_at: string
  paid_at: string | null
  voided_at: string | null
  payment_reference: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceDunningEventRecord {
  id: string
  invoice_id: string
  commercial_account_id: string
  billing_account_id: string
  status: CommerceDunningStatus
  stage: string
  attempt_count: number
  summary: string
  last_attempt_at: string | null
  next_attempt_at: string | null
  resolved_at: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceAccountsReceivableRecord {
  commercial_account_id: string
  billing_account_id: string
  currency: string
  status: CommerceAccountsReceivableStatus
  open_invoice_count: number
  past_due_invoice_count: number
  total_outstanding_amount_minor: number
  oldest_due_at: string | null
  active_dunning_event_ids: string[]
}

export interface CommerceValidationDomainsResponse {
  generated_at: string
  validation_domains: CommerceValidationDomain[]
  count: number
}

export interface CommerceCatalogsResponse {
  generated_at: string
  catalogs: CommerceCatalogRecord[]
  count: number
}

export interface CommerceProductsResponse {
  generated_at: string
  products: CommerceProductRecord[]
  count: number
}

export interface CommercePriceBooksResponse {
  generated_at: string
  price_books: CommercePriceBookRecord[]
  count: number
}

export interface CommerceOffersResponse {
  generated_at: string
  offers: CommerceOfferRecord[]
  count: number
}

export interface CommerceCommercialAccountsResponse {
  generated_at: string
  commercial_accounts: CommerceCommercialAccountRecord[]
  count: number
}

export interface CommerceBillingAccountsResponse {
  generated_at: string
  billing_accounts: CommerceBillingAccountRecord[]
  count: number
}

export interface CommerceCompanyHierarchyResponse {
  generated_at: string
  nodes: CommerceCompanyHierarchyNodeRecord[]
  count: number
}

export interface CommerceBuyerRoleAssignmentsResponse {
  generated_at: string
  buyer_role_assignments: CommerceBuyerRoleAssignmentRecord[]
  count: number
}

export interface CommerceApprovalChainsResponse {
  generated_at: string
  approval_chains: CommerceApprovalChainRecord[]
  count: number
}

export interface CommerceCreditProfilesResponse {
  generated_at: string
  credit_profiles: CommerceCreditProfileRecord[]
  count: number
}

export interface CommerceQuotesResponse {
  generated_at: string
  quotes: CommerceQuoteRecord[]
  count: number
}

export interface CommerceCartsResponse {
  generated_at: string
  carts: CommerceCartRecord[]
  count: number
}

export interface CommerceCheckoutSessionsResponse {
  generated_at: string
  checkout_sessions: CommerceCheckoutSessionRecord[]
  count: number
}

export interface CommerceOrdersResponse {
  generated_at: string
  orders: CommerceOrderRecord[]
  count: number
}

export interface CommerceOrderEventsResponse {
  generated_at: string
  order_events: CommerceOrderEventRecord[]
  count: number
}

export interface CommerceInventoryLocationsResponse {
  generated_at: string
  inventory_locations: CommerceInventoryLocationRecord[]
  count: number
}

export interface CommerceInventoryBalancesResponse {
  generated_at: string
  inventory_balances: CommerceInventoryBalanceRecord[]
  count: number
}

export interface CommerceAtpResponse {
  generated_at: string
  atp_records: CommerceAtpRecord[]
  count: number
}

export interface CommerceReservationsResponse {
  generated_at: string
  reservations: CommerceReservationRecord[]
  count: number
}

export interface CommerceAllocationsResponse {
  generated_at: string
  allocations: CommerceAllocationRecord[]
  count: number
}

export interface CommerceRoutingResponse {
  generated_at: string
  routing_records: CommerceRoutingRecord[]
  count: number
}

export interface CommerceShipmentsResponse {
  generated_at: string
  shipments: CommerceShipmentRecord[]
  count: number
}

export interface CommerceReturnsResponse {
  generated_at: string
  returns: CommerceReturnRecord[]
  count: number
}

export interface CommerceClaimsResponse {
  generated_at: string
  claims: CommerceClaimRecord[]
  count: number
}

export interface CommerceSubscriptionsResponse {
  generated_at: string
  subscriptions: CommerceSubscriptionRecord[]
  count: number
}

export interface CommerceBillingSchedulesResponse {
  generated_at: string
  billing_schedules: CommerceBillingScheduleRecord[]
  count: number
}

export interface CommerceUsageMetersResponse {
  generated_at: string
  usage_meters: CommerceUsageMeterRecord[]
  count: number
}

export interface CommerceUsageEntriesResponse {
  generated_at: string
  usage_entries: CommerceUsageEntryRecord[]
  count: number
}

export interface CommerceInvoicesResponse {
  generated_at: string
  invoices: CommerceInvoiceRecord[]
  count: number
}

export interface CommerceDunningEventsResponse {
  generated_at: string
  dunning_events: CommerceDunningEventRecord[]
  count: number
}

export interface CommerceAccountsReceivableResponse {
  generated_at: string
  accounts_receivable: CommerceAccountsReceivableRecord[]
  count: number
}

export interface CommerceProviderRecord {
  id: string
  provider_kind: CommerceProviderKind
  name: string
  provider_code: string
  summary: string
  status: CommerceProviderStatus
  routing_priority: number
  supported_currencies: string[]
  supported_payment_method_kinds: CommercePaymentMethodKind[]
  supported_regions: string[]
  capability_keys: string[]
  validation_domain_ids: string[]
  webhook_path: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommercePaymentIntentRecord {
  id: string
  commercial_account_id: string
  billing_account_id: string
  order_id: string | null
  invoice_id: string | null
  checkout_session_id: string | null
  payment_method_kind: CommercePaymentMethodKind
  status: CommercePaymentIntentStatus
  amount_minor: number
  currency: string
  provider_id: string | null
  provider_selection_reason: string | null
  payment_attempt_id: string | null
  fraud_screening_id: string | null
  client_reference: string
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommercePaymentAttemptRecord {
  id: string
  payment_intent_id: string
  provider_id: string
  status: CommercePaymentAttemptStatus
  payment_method_kind: CommercePaymentMethodKind
  amount_minor: number
  currency: string
  attempt_number: number
  processor_reference: string
  failure_reason: string | null
  refunded_amount_minor: number
  disputed_amount_minor: number
  authorized_at: string | null
  captured_at: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceWebhookEventRecord {
  id: string
  provider_id: string
  event_type: string
  status: CommerceWebhookEventStatus
  payment_intent_id: string | null
  payment_attempt_id: string | null
  refund_id: string | null
  dispute_id: string | null
  summary: string
  received_at: string
  processed_at: string | null
  notes: string[]
}

export interface CommerceRefundRecord {
  id: string
  payment_attempt_id: string
  provider_id: string
  order_id: string | null
  invoice_id: string | null
  status: CommerceRefundStatus
  amount_minor: number
  currency: string
  reason: string
  processor_reference: string | null
  requested_at: string
  completed_at: string | null
  notes: string[]
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceDisputeRecord {
  id: string
  payment_attempt_id: string
  provider_id: string
  order_id: string | null
  invoice_id: string | null
  status: CommerceDisputeStatus
  amount_minor: number
  currency: string
  reason: string
  summary: string
  opened_at: string
  resolved_at: string | null
  notes: string[]
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceTaxQuoteRecord {
  id: string
  provider_id: string
  billing_account_id: string
  order_id: string | null
  currency: string
  tax_region: string
  subtotal_amount_minor: number
  tax_amount_minor: number
  total_amount_minor: number
  created_at: string
  created_by_user_id: string
}

export interface CommerceShippingQuoteRecord {
  id: string
  provider_id: string
  order_id: string | null
  currency: string
  shipment_method: CommerceShipmentMethod
  destination_region: string
  amount_minor: number
  estimated_delivery_days: number
  created_at: string
  created_by_user_id: string
}

export interface CommerceFraudScreeningRecord {
  id: string
  provider_id: string
  commercial_account_id: string
  billing_account_id: string
  order_id: string | null
  payment_intent_id: string | null
  decision: CommerceFraudDecision
  risk_score: number
  summary: string
  created_at: string
  created_by_user_id: string
}

export interface CommerceReconciliationJobRecord {
  id: string
  status: CommerceReconciliationJobStatus
  summary: string
  provider_id: string | null
  currency: string
  captured_amount_minor: number
  refunded_amount_minor: number
  disputed_amount_minor: number
  net_settlement_amount_minor: number
  matched_invoice_count: number
  mismatch_count: number
  settlement_reference_ids: string[]
  unmatched_invoice_ids: string[]
  unmatched_payment_attempt_ids: string[]
  notes: string[]
  started_at: string
  completed_at: string | null
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceSettlementReferenceRecord {
  id: string
  provider_id: string
  settlement_reference: string
  status: CommerceSettlementReferenceStatus
  currency: string
  gross_amount_minor: number
  fee_amount_minor: number
  refund_amount_minor: number
  dispute_hold_amount_minor: number
  net_amount_minor: number
  payment_attempt_ids: string[]
  refund_ids: string[]
  dispute_ids: string[]
  payout_date: string
  exported_at: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceRevenueExportRecord {
  id: string
  export_kind: CommerceRevenueExportKind
  status: CommerceRevenueExportStatus
  summary: string
  currency: string
  settlement_reference_ids: string[]
  invoice_ids: string[]
  refund_ids: string[]
  dispute_ids: string[]
  exported_record_count: number
  gross_amount_minor: number
  net_amount_minor: number
  artifact_key: string
  exported_at: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceSupportCaseInterventionRecord {
  id: string
  action: CommerceSupportInterventionAction
  summary: string
  executed_at: string
  actor_user_id: string
}

export interface CommerceSupportCaseRecord {
  id: string
  case_number: string
  case_kind: CommerceSupportCaseKind
  status: CommerceSupportCaseStatus
  commercial_account_id: string
  billing_account_id: string
  order_id: string | null
  invoice_id: string | null
  payment_intent_id: string | null
  payment_attempt_id: string | null
  refund_id: string | null
  dispute_id: string | null
  return_id: string | null
  claim_id: string | null
  summary: string
  owner_user_id: string | null
  notes: string[]
  intervention_history: CommerceSupportCaseInterventionRecord[]
  created_at: string
  updated_at: string
  resolved_at: string | null
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceApplicationBindingRecord {
  id: string
  name: string
  consumer_kind: CommerceConsumerApplicationKind
  status: CommerceApplicationBindingStatus
  target_consumer_id: string
  target_consumer_name: string
  default_catalog_id: string | null
  default_offer_ids: string[]
  provisioning_target_kind: CommerceProvisioningTargetKind
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceOfferOverrideRecord {
  id: string
  application_binding_id: string
  base_offer_id: string
  name: string
  summary: string
  status: CommerceOfferOverrideStatus
  override_entitlement_keys: string[]
  provisioning_template_key: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceEntitlementGrantRecord {
  id: string
  grant_reference: string
  status: CommerceEntitlementGrantStatus
  application_binding_id: string
  consumer_kind: CommerceConsumerApplicationKind
  commercial_account_id: string
  billing_account_id: string
  source_order_id: string | null
  source_subscription_id: string | null
  offer_id: string
  offer_override_id: string | null
  target_subject_id: string
  target_subject_label: string
  entitlement_keys: string[]
  starts_at: string
  ends_at: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceProvisioningGrantRecord {
  id: string
  status: CommerceProvisioningGrantStatus
  application_binding_id: string
  entitlement_grant_id: string
  target_resource_id: string
  target_resource_label: string
  provisioning_key: string
  payload_summary: string
  notes: string[]
  provisioned_at: string | null
  revoked_at: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommerceHandoffEventRecord {
  id: string
  event_type: CommerceHandoffEventType
  delivery_status: CommerceHandoffEventDeliveryStatus
  application_binding_id: string
  entitlement_grant_id: string | null
  provisioning_grant_id: string | null
  consumer_kind: CommerceConsumerApplicationKind
  payload_summary: string
  artifact_key: string
  occurred_at: string
  delivered_at: string | null
  created_by_user_id: string
}

export interface CommerceProvidersResponse {
  generated_at: string
  providers: CommerceProviderRecord[]
  count: number
}

export interface CommercePaymentIntentsResponse {
  generated_at: string
  payment_intents: CommercePaymentIntentRecord[]
  count: number
}

export interface CommercePaymentAttemptsResponse {
  generated_at: string
  payment_attempts: CommercePaymentAttemptRecord[]
  count: number
}

export interface CommerceWebhookEventsResponse {
  generated_at: string
  webhook_events: CommerceWebhookEventRecord[]
  count: number
}

export interface CommerceRefundsResponse {
  generated_at: string
  refunds: CommerceRefundRecord[]
  count: number
}

export interface CommerceDisputesResponse {
  generated_at: string
  disputes: CommerceDisputeRecord[]
  count: number
}

export interface CommerceTaxQuotesResponse {
  generated_at: string
  tax_quotes: CommerceTaxQuoteRecord[]
  count: number
}

export interface CommerceShippingQuotesResponse {
  generated_at: string
  shipping_quotes: CommerceShippingQuoteRecord[]
  count: number
}

export interface CommerceFraudScreeningsResponse {
  generated_at: string
  fraud_screenings: CommerceFraudScreeningRecord[]
  count: number
}

export interface CommerceReconciliationJobsResponse {
  generated_at: string
  reconciliation_jobs: CommerceReconciliationJobRecord[]
  count: number
}

export interface CommerceSettlementReferencesResponse {
  generated_at: string
  settlement_references: CommerceSettlementReferenceRecord[]
  count: number
}

export interface CommerceRevenueExportsResponse {
  generated_at: string
  revenue_exports: CommerceRevenueExportRecord[]
  count: number
}

export interface CommerceSupportCasesResponse {
  generated_at: string
  support_cases: CommerceSupportCaseRecord[]
  count: number
}

export interface CommerceApplicationBindingsResponse {
  generated_at: string
  application_bindings: CommerceApplicationBindingRecord[]
  count: number
}

export interface CommerceOfferOverridesResponse {
  generated_at: string
  offer_overrides: CommerceOfferOverrideRecord[]
  count: number
}

export interface CommerceEntitlementGrantsResponse {
  generated_at: string
  entitlement_grants: CommerceEntitlementGrantRecord[]
  count: number
}

export interface CommerceProvisioningGrantsResponse {
  generated_at: string
  provisioning_grants: CommerceProvisioningGrantRecord[]
  count: number
}

export interface CommerceHandoffEventsResponse {
  generated_at: string
  handoff_events: CommerceHandoffEventRecord[]
  count: number
}

export interface CreateCommerceCatalogRequest {
  name: string
  summary: string
  scope_kind?: CommerceScopeKind
  status?: CommerceCatalogStatus
  validation_domain_id: string
  default_currency?: string
  supported_currencies?: string[]
  intended_channels?: string[]
  owner_consumer_id?: string | null
  clone_from_catalog_id?: string | null
}

export interface UpdateCommerceCatalogRequest {
  name?: string
  summary?: string
  scope_kind?: CommerceScopeKind
  status?: CommerceCatalogStatus
  validation_domain_id?: string
  default_currency?: string
  supported_currencies?: string[]
  intended_channels?: string[]
  owner_consumer_id?: string | null
}

export interface CreateCommerceProductRequest {
  name: string
  summary: string
  product_type?: CommerceProductType
  status?: CommerceProductStatus
  sku: string
  catalog_ids?: string[]
  merchandising_tags?: string[]
  entitlement_keys?: string[]
  attribute_names?: string[]
  variant_labels?: string[]
}

export interface UpdateCommerceProductRequest {
  name?: string
  summary?: string
  product_type?: CommerceProductType
  status?: CommerceProductStatus
  sku?: string
  catalog_ids?: string[]
  merchandising_tags?: string[]
  entitlement_keys?: string[]
  attribute_names?: string[]
  variant_labels?: string[]
}

export interface CreateCommercePriceBookRequest {
  name: string
  summary: string
  status?: CommercePriceBookStatus
  currency: string
  target_catalog_ids?: string[]
  pricing_notes?: string[]
}

export interface UpdateCommercePriceBookRequest {
  name?: string
  summary?: string
  status?: CommercePriceBookStatus
  currency?: string
  target_catalog_ids?: string[]
  pricing_notes?: string[]
}

export interface CreateCommerceOfferRequest {
  name: string
  summary: string
  status?: CommerceOfferStatus
  catalog_id: string
  product_id: string
  price_book_id: string
  pricing_model?: CommercePricingModel
  billing_interval?: CommerceBillingInterval
  amount_minor: number
  currency: string
  entitlement_keys?: string[]
}

export interface UpdateCommerceOfferRequest {
  name?: string
  summary?: string
  status?: CommerceOfferStatus
  catalog_id?: string
  product_id?: string
  price_book_id?: string
  pricing_model?: CommercePricingModel
  billing_interval?: CommerceBillingInterval
  amount_minor?: number
  currency?: string
  entitlement_keys?: string[]
}

export interface CreateCommerceCommercialAccountRequest {
  name: string
  summary: string
  kind?: CommerceCommercialAccountKind
  status?: CommerceCommercialAccountStatus
  validation_domain_id: string
  primary_catalog_ids?: string[]
  default_currency?: string
}

export interface UpdateCommerceCommercialAccountRequest {
  name?: string
  summary?: string
  kind?: CommerceCommercialAccountKind
  status?: CommerceCommercialAccountStatus
  validation_domain_id?: string
  primary_catalog_ids?: string[]
  default_currency?: string
  billing_account_id?: string | null
  credit_profile_id?: string | null
}

export interface CreateCommerceBillingAccountRequest {
  commercial_account_id: string
  name: string
  status?: CommerceBillingAccountStatus
  billing_contact_email: string
  currency: string
  invoice_delivery_mode?: CommerceInvoiceDeliveryMode
  payment_terms?: CommercePaymentTerms
  tax_region: string
}

export interface UpdateCommerceBillingAccountRequest {
  name?: string
  status?: CommerceBillingAccountStatus
  billing_contact_email?: string
  currency?: string
  invoice_delivery_mode?: CommerceInvoiceDeliveryMode
  payment_terms?: CommercePaymentTerms
  tax_region?: string
}

export interface CreateCommerceCompanyHierarchyNodeRequest {
  commercial_account_id: string
  name: string
  node_type?: CommerceCompanyNodeType
  parent_node_id?: string | null
  notes?: string[]
}

export interface UpdateCommerceCompanyHierarchyNodeRequest {
  name?: string
  node_type?: CommerceCompanyNodeType
  parent_node_id?: string | null
  notes?: string[]
}

export interface CreateCommerceBuyerRoleAssignmentRequest {
  commercial_account_id: string
  scope_node_id?: string | null
  principal_label: string
  principal_email: string
  role: CommerceBuyerRole
  status?: CommerceBuyerAssignmentStatus
  spending_limit_minor?: number | null
  approval_threshold_minor?: number | null
}

export interface UpdateCommerceBuyerRoleAssignmentRequest {
  scope_node_id?: string | null
  principal_label?: string
  principal_email?: string
  role?: CommerceBuyerRole
  status?: CommerceBuyerAssignmentStatus
  spending_limit_minor?: number | null
  approval_threshold_minor?: number | null
}

export interface CreateCommerceApprovalChainRequest {
  commercial_account_id: string
  name: string
  status?: CommerceApprovalChainStatus
  trigger_kind: CommerceApprovalTriggerKind
  scope_node_id?: string | null
  threshold_minor?: number | null
  approver_role_ids?: string[]
  notes?: string[]
}

export interface UpdateCommerceApprovalChainRequest {
  name?: string
  status?: CommerceApprovalChainStatus
  trigger_kind?: CommerceApprovalTriggerKind
  scope_node_id?: string | null
  threshold_minor?: number | null
  approver_role_ids?: string[]
  notes?: string[]
}

export interface CreateCommerceCreditProfileRequest {
  commercial_account_id: string
  status?: CommerceCreditStatus
  credit_limit_minor: number
  available_credit_minor: number
  payment_terms?: CommercePaymentTerms
  risk_notes?: string[]
}

export interface UpdateCommerceCreditProfileRequest {
  status?: CommerceCreditStatus
  credit_limit_minor?: number
  available_credit_minor?: number
  payment_terms?: CommercePaymentTerms
  risk_notes?: string[]
}

export interface CreateCommerceQuoteLineItemRequest {
  product_id: string
  offer_id: string
  quantity: number
  summary: string
}

export interface CreateCommerceQuoteRequest {
  commercial_account_id: string
  billing_account_id: string
  catalog_id: string
  requested_by_buyer_role_id: string
  status?: CommerceQuoteStatus
  currency: string
  line_items: CreateCommerceQuoteLineItemRequest[]
  notes?: string[]
}

export interface UpdateCommerceQuoteRequest {
  billing_account_id?: string
  catalog_id?: string
  requested_by_buyer_role_id?: string
  status?: CommerceQuoteStatus
  currency?: string
  line_items?: CreateCommerceQuoteLineItemRequest[]
  notes?: string[]
}

export interface CreateCommerceCartRequest {
  commercial_account_id: string
  billing_account_id: string
  catalog_id: string
  requested_by_buyer_role_id?: string | null
  source_quote_id?: string | null
  status?: CommerceCartStatus
  currency: string
  line_items?: CreateCommerceQuoteLineItemRequest[]
  notes?: string[]
}

export interface UpdateCommerceCartRequest {
  billing_account_id?: string
  requested_by_buyer_role_id?: string | null
  status?: CommerceCartStatus
  currency?: string
  line_items?: CreateCommerceQuoteLineItemRequest[]
  notes?: string[]
}

export interface CreateCommerceCheckoutSessionRequest {
  cart_id: string
  checkout_kind?: CommerceCheckoutKind
  return_url?: string | null
}

export interface CompleteCommerceCheckoutSessionRequest {
  notes?: string[]
}

export interface CommerceQuoteConversionResponse {
  cart: CommerceCartRecord
  checkout_session: CommerceCheckoutSessionRecord
  order: CommerceOrderRecord
}

export interface CommerceCheckoutCompletionResponse {
  checkout_session: CommerceCheckoutSessionRecord
  order: CommerceOrderRecord
}

export interface UpdateCommerceOrderRequest {
  status?: CommerceOrderStatus
  notes?: string[]
}

export interface CancelCommerceOrderRequest {
  reason: string
}

export interface CreateCommerceInventoryLocationRequest {
  name: string
  summary: string
  validation_domain_id: string
  status?: CommerceInventoryLocationStatus
  region_code: string
  supported_methods?: CommerceShipmentMethod[]
  notes?: string[]
}

export interface UpdateCommerceInventoryLocationRequest {
  name?: string
  summary?: string
  validation_domain_id?: string
  status?: CommerceInventoryLocationStatus
  region_code?: string
  supported_methods?: CommerceShipmentMethod[]
  notes?: string[]
}

export interface CreateCommerceInventoryBalanceRequest {
  location_id: string
  product_id: string
  sku?: string
  status?: CommerceInventoryBalanceStatus
  on_hand_quantity: number
  reserved_quantity?: number
  allocated_quantity?: number
  safety_stock_quantity?: number
  reorder_point_quantity?: number
}

export interface UpdateCommerceInventoryBalanceRequest {
  status?: CommerceInventoryBalanceStatus
  on_hand_quantity?: number
  reserved_quantity?: number
  allocated_quantity?: number
  safety_stock_quantity?: number
  reorder_point_quantity?: number
}

export interface CreateCommerceReservationRequest {
  order_id: string
  order_line_id: string
  product_id?: string
  requested_quantity: number
  preferred_location_id?: string | null
  status?: CommerceReservationStatus
  expires_at?: string | null
  notes?: string[]
}

export interface UpdateCommerceReservationRequest {
  preferred_location_id?: string | null
  status?: CommerceReservationStatus
  expires_at?: string | null
  notes?: string[]
}

export interface CreateCommerceAllocationRequest {
  reservation_id: string
  location_id: string
  allocated_quantity: number
  route_group?: string
  notes?: string[]
}

export interface UpdateCommerceAllocationRequest {
  status?: CommerceAllocationStatus
  route_group?: string
  shipment_id?: string | null
  notes?: string[]
}

export interface CreateCommerceRoutingRequest {
  order_id: string
  allocation_ids: string[]
  shipment_ids?: string[]
  routing_mode?: CommerceRoutingMode
  status?: CommerceRoutingStatus
  notes?: string[]
}

export interface UpdateCommerceRoutingRequest {
  allocation_ids?: string[]
  shipment_ids?: string[]
  routing_mode?: CommerceRoutingMode
  status?: CommerceRoutingStatus
  notes?: string[]
}

export interface CreateCommerceShipmentRequest {
  order_id: string
  routing_id?: string | null
  location_id: string
  allocation_ids?: string[]
  shipment_method?: CommerceShipmentMethod
  carrier: string
  tracking_number?: string | null
  status?: CommerceShipmentStatus
  notes?: string[]
}

export interface UpdateCommerceShipmentRequest {
  routing_id?: string | null
  shipment_method?: CommerceShipmentMethod
  carrier?: string
  tracking_number?: string | null
  status?: CommerceShipmentStatus
  notes?: string[]
}

export interface CreateCommerceReturnRequest {
  order_id: string
  shipment_id?: string | null
  order_line_id?: string | null
  return_kind?: CommerceReturnKind
  requested_quantity: number
  reason: string
  status?: CommerceReturnStatus
  claim_id?: string | null
  resolution_summary?: string | null
  notes?: string[]
}

export interface UpdateCommerceReturnRequest {
  status?: CommerceReturnStatus
  claim_id?: string | null
  resolution_summary?: string | null
  notes?: string[]
}

export interface CreateCommerceClaimRequest {
  order_id: string
  shipment_id?: string | null
  return_id?: string | null
  claim_type: CommerceClaimType
  summary: string
  status?: CommerceClaimStatus
  resolution_notes?: string | null
  notes?: string[]
}

export interface UpdateCommerceClaimRequest {
  status?: CommerceClaimStatus
  summary?: string
  resolution_notes?: string | null
  notes?: string[]
}

export interface CreateCommerceSubscriptionRequest {
  commercial_account_id: string
  billing_account_id: string
  product_id: string
  offer_id: string
  source_order_id?: string | null
  status?: CommerceSubscriptionStatus
  quantity?: number
  currency?: string
  unit_amount_minor?: number
  billing_interval?: CommerceBillingInterval
  current_period_started_at?: string
  current_period_ends_at?: string
  next_billing_at?: string
  notes?: string[]
}

export interface UpdateCommerceSubscriptionRequest {
  status?: CommerceSubscriptionStatus
  quantity?: number
  current_period_started_at?: string
  current_period_ends_at?: string
  next_billing_at?: string
  notes?: string[]
}

export interface CreateCommerceBillingScheduleRequest {
  commercial_account_id: string
  billing_account_id: string
  subscription_id?: string | null
  name: string
  status?: CommerceBillingScheduleStatus
  cadence?: CommerceBillingScheduleCadence
  currency?: string
  run_day_of_month?: number | null
  usage_meter_ids?: string[]
  next_run_at?: string
  notes?: string[]
}

export interface UpdateCommerceBillingScheduleRequest {
  name?: string
  status?: CommerceBillingScheduleStatus
  cadence?: CommerceBillingScheduleCadence
  currency?: string
  run_day_of_month?: number | null
  usage_meter_ids?: string[]
  next_run_at?: string
  notes?: string[]
}

export interface RunCommerceBillingScheduleRequest {
  due_at?: string
  notes?: string[]
}

export interface CreateCommerceUsageMeterRequest {
  commercial_account_id: string
  billing_account_id: string
  subscription_id?: string | null
  product_id?: string | null
  name: string
  status?: CommerceUsageMeterStatus
  unit_label: string
  aggregation?: CommerceUsageAggregation
  included_quantity?: number
  overage_amount_minor: number
  currency?: string
  current_period_started_at?: string
  current_period_ends_at?: string
  notes?: string[]
}

export interface UpdateCommerceUsageMeterRequest {
  name?: string
  status?: CommerceUsageMeterStatus
  unit_label?: string
  aggregation?: CommerceUsageAggregation
  included_quantity?: number
  overage_amount_minor?: number
  current_period_started_at?: string
  current_period_ends_at?: string
  notes?: string[]
}

export interface RecordCommerceUsageEntryRequest {
  quantity: number
  occurred_at?: string
  source_key?: string | null
  summary: string
}

export interface UpdateCommerceInvoiceRequest {
  status?: CommerceInvoiceStatus
  due_at?: string
  notes?: string[]
}

export interface MarkCommerceInvoicePaidRequest {
  payment_reference?: string | null
  notes?: string[]
}

export interface CreateCommerceDunningEventRequest {
  stage: string
  summary: string
  next_attempt_at?: string | null
  notes?: string[]
}

export interface UpdateCommerceDunningEventRequest {
  status?: CommerceDunningStatus
  stage?: string
  summary?: string
  next_attempt_at?: string | null
  resolved_at?: string | null
  notes?: string[]
  record_attempt?: boolean
}

export interface CreateCommerceProviderRequest {
  name: string
  provider_code: string
  summary: string
  status?: CommerceProviderStatus
  routing_priority?: number
  supported_currencies?: string[]
  supported_payment_method_kinds?: CommercePaymentMethodKind[]
  supported_regions?: string[]
  capability_keys?: string[]
  validation_domain_ids?: string[]
  webhook_path?: string | null
  notes?: string[]
}

export interface UpdateCommerceProviderRequest {
  name?: string
  summary?: string
  status?: CommerceProviderStatus
  routing_priority?: number
  supported_currencies?: string[]
  supported_payment_method_kinds?: CommercePaymentMethodKind[]
  supported_regions?: string[]
  capability_keys?: string[]
  validation_domain_ids?: string[]
  webhook_path?: string | null
  notes?: string[]
}

export interface CreateCommercePaymentIntentRequest {
  commercial_account_id?: string
  billing_account_id?: string
  order_id?: string | null
  invoice_id?: string | null
  checkout_session_id?: string | null
  payment_method_kind: CommercePaymentMethodKind
  amount_minor?: number
  currency?: string
  preferred_provider_id?: string | null
  client_reference?: string
  notes?: string[]
}

export interface ConfirmCommercePaymentIntentRequest {
  notes?: string[]
}

export interface CreateCommerceProviderWebhookRequest {
  event_type: string
  payment_intent_id?: string | null
  payment_attempt_id?: string | null
  refund_id?: string | null
  dispute_id?: string | null
  status?: CommerceWebhookEventStatus
  summary: string
  notes?: string[]
}

export interface CreateCommerceRefundRequest {
  payment_attempt_id: string
  amount_minor: number
  reason: string
  notes?: string[]
}

export interface UpdateCommerceRefundRequest {
  status?: CommerceRefundStatus
  processor_reference?: string | null
  notes?: string[]
}

export interface CreateCommerceDisputeRequest {
  payment_attempt_id: string
  amount_minor: number
  reason: string
  summary: string
  notes?: string[]
}

export interface UpdateCommerceDisputeRequest {
  status?: CommerceDisputeStatus
  summary?: string
  notes?: string[]
}

export interface CreateCommerceTaxQuoteRequest {
  billing_account_id: string
  order_id?: string | null
  subtotal_amount_minor: number
  currency?: string
}

export interface CreateCommerceShippingQuoteRequest {
  order_id?: string | null
  shipment_method?: CommerceShipmentMethod
  destination_region: string
  currency: string
}

export interface CreateCommerceFraudScreeningRequest {
  commercial_account_id: string
  billing_account_id: string
  order_id?: string | null
  payment_intent_id?: string | null
  summary: string
}

export interface CreateCommerceReconciliationJobRequest {
  provider_id?: string | null
  currency?: string
  summary?: string
  notes?: string[]
}

export interface UpdateCommerceSettlementReferenceRequest {
  status?: CommerceSettlementReferenceStatus
  notes?: string[]
}

export interface CreateCommerceRevenueExportRequest {
  export_kind: CommerceRevenueExportKind
  summary: string
  currency?: string
  settlement_reference_ids?: string[]
  invoice_ids?: string[]
  notes?: string[]
}

export interface CreateCommerceSupportCaseRequest {
  case_kind: CommerceSupportCaseKind
  commercial_account_id?: string
  billing_account_id?: string
  order_id?: string | null
  invoice_id?: string | null
  payment_intent_id?: string | null
  payment_attempt_id?: string | null
  refund_id?: string | null
  dispute_id?: string | null
  return_id?: string | null
  claim_id?: string | null
  summary: string
  owner_user_id?: string | null
  notes?: string[]
}

export interface UpdateCommerceSupportCaseRequest {
  status?: CommerceSupportCaseStatus
  owner_user_id?: string | null
  summary?: string
  notes?: string[]
}

export interface CreateCommerceSupportInterventionRequest {
  action: CommerceSupportInterventionAction
  summary: string
  case_status?: CommerceSupportCaseStatus
  payment_reference?: string | null
  notes?: string[]
}

export interface CreateCommerceApplicationBindingRequest {
  name: string
  consumer_kind: CommerceConsumerApplicationKind
  status?: CommerceApplicationBindingStatus
  target_consumer_id: string
  target_consumer_name: string
  default_catalog_id?: string | null
  default_offer_ids?: string[]
  provisioning_target_kind: CommerceProvisioningTargetKind
  notes?: string[]
}

export interface UpdateCommerceApplicationBindingRequest {
  name?: string
  status?: CommerceApplicationBindingStatus
  target_consumer_name?: string
  default_catalog_id?: string | null
  default_offer_ids?: string[]
  provisioning_target_kind?: CommerceProvisioningTargetKind
  notes?: string[]
}

export interface CreateCommerceOfferOverrideRequest {
  application_binding_id: string
  base_offer_id: string
  name: string
  summary: string
  status?: CommerceOfferOverrideStatus
  override_entitlement_keys?: string[]
  provisioning_template_key?: string | null
  notes?: string[]
}

export interface UpdateCommerceOfferOverrideRequest {
  name?: string
  summary?: string
  status?: CommerceOfferOverrideStatus
  override_entitlement_keys?: string[]
  provisioning_template_key?: string | null
  notes?: string[]
}

export interface CreateCommerceEntitlementGrantRequest {
  application_binding_id: string
  commercial_account_id?: string
  billing_account_id?: string
  source_order_id?: string | null
  source_subscription_id?: string | null
  offer_id?: string
  offer_override_id?: string | null
  target_subject_id: string
  target_subject_label: string
  status?: CommerceEntitlementGrantStatus
  starts_at?: string
  ends_at?: string | null
  notes?: string[]
}

export interface UpdateCommerceEntitlementGrantRequest {
  status?: CommerceEntitlementGrantStatus
  starts_at?: string
  ends_at?: string | null
  notes?: string[]
}

export interface CreateCommerceProvisioningGrantRequest {
  application_binding_id: string
  entitlement_grant_id: string
  target_resource_id: string
  target_resource_label: string
  provisioning_key: string
  status?: CommerceProvisioningGrantStatus
  notes?: string[]
}

export interface UpdateCommerceProvisioningGrantRequest {
  status?: CommerceProvisioningGrantStatus
  notes?: string[]
}

export interface CreateCommerceBackupRequest {
  label?: string
}

export interface CreateCommerceRestoreRequest {
  backup_id: string
  mode?: CommerceRestoreMode
}

export interface CreateCommerceExportArtifactRequest {
  label?: string
}

export interface CreateCommerceImportValidationRequest {
  export_artifact_id: string
  notes?: string[]
}

export interface CreateCommerceReadinessReviewRequest {
  decision?: CommerceReadinessDecision
  notes?: string[]
}

export interface CreateCommerceFormalReviewRequest {
  notes?: string[]
}

export type LmsPhase =
  | 'PHASE_1'
  | 'PHASE_2'
  | 'PHASE_3'
  | 'PHASE_4'
  | 'PHASE_5'
  | 'PHASE_6'
  | 'PHASE_7'
  | 'PHASE_8'
  | 'PHASE_9'
  | 'PHASE_10'
export type LmsSubsystemStatus =
  | 'PORTALS_CATALOGS_PROGRAMS_PATHWAYS_CERTIFICATIONS_AND_BINDINGS_IMPLEMENTED'
  | 'ENROLLMENTS_COHORTS_RUNS_SESSIONS_AND_ATTENDANCE_IMPLEMENTED'
  | 'ASSIGNMENTS_ASSESSMENT_DELIVERY_AND_GRADEBOOK_IMPLEMENTED'
  | 'COMPETENCIES_CERTIFICATES_AND_RECERTIFICATION_IMPLEMENTED'
  | 'CMS_CONTENT_AND_ASSESSMENT_PACKAGE_BINDINGS_IMPLEMENTED'
  | 'INTEROPERABILITY_IMPLEMENTED'
  | 'INSTRUCTOR_MANAGER_ANALYTICS_AND_AUTOMATION_IMPLEMENTED'
  | 'IAM_AND_COMMERCE_BINDINGS_IMPLEMENTED'
  | 'STANDALONE_PRODUCTIONIZATION_IMPLEMENTED'
  | 'FORMAL_REVIEW_AND_ADOPTION_PLANNING_IMPLEMENTED'
export type LmsMarketPosition =
  | 'OPEN_LMS_CLASS_PLUS_DIFFERENTIATED'
  | 'FULL_LMS_COMPETITIVE'
  | 'NOT_YET_COMPETITIVE'
export type LmsAdoptionRecommendation = 'PROCEED_TO_PHASE_11_ADOPTION_PLANNING' | 'HOLD_FOR_REMEDIATION'
export type LmsReviewStatus = 'PASS' | 'WARN' | 'FAIL'
export type LmsMigrationState = 'BLOCKED_PENDING_STANDALONE_VALIDATION' | 'BLOCKED_PENDING_STANDALONE_ADOPTION'
export type LmsDeliveryMode = 'STANDALONE' | 'EMBEDDED' | 'DUAL_MODE'
export type LmsPortalStatus = 'ACTIVE' | 'STANDALONE_VALIDATION' | 'ARCHIVED'
export type LmsPortalAudience = 'PUBLIC_ACADEMY' | 'ENTERPRISE_LMS' | 'PARTNER_EMBEDDED' | 'REGULATED_CERTIFICATION'
export type LmsCatalogVisibility = 'PUBLIC' | 'AUTHENTICATED' | 'ASSIGNED' | 'INVITE_ONLY'
export type LmsCatalogStatus = 'ACTIVE' | 'STANDALONE_VALIDATION' | 'ARCHIVED'
export type LmsProgramStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
export type LmsProgramDeliveryModel = 'SELF_PACED' | 'INSTRUCTOR_LED' | 'BLENDED'
export type LmsProgramModality = 'DIGITAL_ONLY' | 'DIGITAL_PLUS_LIVE' | 'LIVE_ONLY'
export type LmsPathwayStatus = 'ACTIVE' | 'ARCHIVED'
export type LmsCertificationStatus = 'ACTIVE' | 'ARCHIVED'
export type LmsEmbeddedLaunchMode = 'IFRAME' | 'DEEPLINK' | 'API_WIDGET'
export type LmsEmbeddedBindingStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED'
export type LmsCmsBindingStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED'
export type LmsIdentityBindingStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED'
export type LmsCommerceBindingStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED'
export type LmsConsumerBindingStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED'
export type LmsConsumerAccessPolicy = 'OPEN_ENROLLMENT' | 'PAID_ACTIVATION' | 'ASSIGNED_SEAT' | 'SUBSCRIPTION_REQUIRED'
export type LmsConsumerProvisioningMode = 'JIT' | 'EVENT_DRIVEN'
export type LmsCommerceActivationKind = 'SEAT' | 'CERTIFICATION' | 'SUBSCRIPTION' | 'BUNDLE'
export type LmsCommerceActivationStatus = 'ACTIVE' | 'REVOKED'
export type LmsAccessDecision = 'ALLOW' | 'DENY'
export type LmsEnrollmentStatus = 'INVITED' | 'ENROLLED' | 'IN_PROGRESS' | 'COMPLETED' | 'WITHDRAWN'
export type LmsEnrollmentSource = 'SELF_SERVICE' | 'MANAGER_ASSIGNMENT' | 'COHORT_ASSIGNMENT' | 'COMMERCE_ACTIVATION'
export type LmsCohortStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
export type LmsCourseRunStatus = 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED'
export type LmsCourseRunChannel = 'VIRTUAL_CLASSROOM' | 'IN_PERSON' | 'HYBRID'
export type LmsSessionStatus = 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED'
export type LmsSessionType = 'LECTURE' | 'LAB' | 'WORKSHOP' | 'OFFICE_HOURS' | 'ASSESSMENT_REVIEW'
export type LmsAttendanceStatus = 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE' | 'LEFT_EARLY'
export type LmsAttendanceCaptureMode = 'MANUAL' | 'SELF_CHECK_IN' | 'HOST_REPORTED'
export type LmsAssignmentType = 'QUIZ' | 'EXAM' | 'PROJECT' | 'PRACTICUM' | 'DISCUSSION_PROMPT'
export type LmsAssignmentStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED'
export type LmsGradingMode = 'AUTO' | 'MANUAL' | 'RUBRIC'
export type LmsAttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'RETURNED'
export type LmsGradingQueueStatus = 'PENDING_REVIEW' | 'IN_REVIEW' | 'GRADED' | 'RETURNED'
export type LmsQueuePriority = 'NORMAL' | 'HIGH'
export type LmsRubricStatus = 'ACTIVE' | 'ARCHIVED'
export type LmsGradebookPassState = 'IN_PROGRESS' | 'PASS' | 'FAIL'
export type LmsCompetencyStatus = 'ACTIVE' | 'ARCHIVED'
export type LmsCompetencyFrameworkStatus = 'ACTIVE' | 'ARCHIVED'
export type LmsCompetencyEvidenceType = 'GRADEBOOK_PASS' | 'ASSIGNMENT_PASS' | 'MANUAL_REVIEW'
export type LmsCompetencyAwardSource = 'GRADEBOOK' | 'ATTEMPT' | 'MANUAL'
export type LmsBadgeAwardStatus = 'ACTIVE' | 'REVOKED'
export type LmsCertificateStatus = 'ISSUED' | 'REVOKED' | 'EXPIRED'
export type LmsRecertificationStatus = 'CURRENT' | 'DUE_SOON' | 'OVERDUE' | 'RENEWED' | 'REVOKED'
export type LmsReminderState = 'NOT_SCHEDULED' | 'SCHEDULED' | 'SENT'
export type LmsContentBindingTriggerKind = 'GRADEBOOK_FAIL' | 'ATTEMPT_FAIL' | 'COMPETENCY_GAP' | 'MANUAL_ASSIGNMENT'
export type LmsScormPackageStatus = 'ACTIVE' | 'ARCHIVED'
export type LmsScormRegistrationStatus = 'REGISTERED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'ARCHIVED'
export type LmsXapiProviderStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED'
export type LmsXapiStatementStatus = 'RECEIVED' | 'PROCESSED' | 'ARCHIVED'
export type LmsCmi5PackageStatus = 'ACTIVE' | 'ARCHIVED'
export type LmsCmi5RegistrationStatus = 'REGISTERED' | 'LAUNCHED' | 'COMPLETED' | 'ARCHIVED'
export type LmsLtiToolStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED'
export type LmsLtiDeploymentStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED'
export type LmsLtiLaunchStatus = 'ISSUED' | 'CONSUMED' | 'FAILED' | 'ARCHIVED'
export type LmsRosterExportTargetKind = 'LTI_DEPLOYMENT' | 'XAPI_PROVIDER'
export type LmsRosterExportStatus = 'GENERATED' | 'DELIVERED' | 'ARCHIVED'
export type LmsDiscussionThreadStatus = 'OPEN' | 'RESOLVED' | 'ARCHIVED'
export type LmsDiscussionContextKind = 'PORTAL' | 'PROGRAM' | 'COURSE_RUN' | 'ASSIGNMENT'
export type LmsDiscussionPostVisibility = 'PARTICIPANTS' | 'INSTRUCTORS' | 'MANAGERS'
export type LmsNotificationChannel = 'IN_APP' | 'EMAIL'
export type LmsNotificationCampaignStatus = 'DRAFT' | 'SCHEDULED' | 'SENT' | 'ARCHIVED'
export type LmsLearnerRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'
export type LmsAutomationTriggerKind = 'AT_RISK' | 'SESSION_REMINDER' | 'RECERTIFICATION_DUE' | 'GRADING_BACKLOG'
export type LmsAutomationTargetKind = 'LEARNER' | 'INSTRUCTOR' | 'MANAGER'
export type LmsAutomationActionKind = 'SEND_NOTIFICATION' | 'QUEUE_REVIEW' | 'ASSIGN_REMEDIATION'
export type LmsAutomationRuleStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
export type LmsAutomationRunStatus = 'COMPLETED' | 'SKIPPED' | 'FAILED'
export type LmsOperationsHealth = 'HEALTHY' | 'DEGRADED' | 'FAILED'
export type LmsEvidenceStatus = 'PASS' | 'WARN' | 'FAIL'
export type LmsReadinessDecision = 'APPROVED' | 'BLOCKED'

export interface LmsValidationDomain {
  id: string
  name: string
  summary: string
  proves: string[]
  migration_blocked: boolean
}

export type SchedulingOwnerType = 'USER' | 'TEAM' | 'ORGANIZATION' | 'ASSET' | 'FACILITY' | 'SERVICE' | 'COURSE_DELIVERY'
export type SchedulingCalendarStatus = 'ACTIVE' | 'STANDALONE_VALIDATION' | 'ARCHIVED'
export type SchedulingPolicyStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED'
export type SchedulingAvailabilityWindowStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED'
export type SchedulingAvailabilityWindowKind = 'WORKING_HOURS' | 'BLACKOUT' | 'SPECIAL_OPENING'
export type SchedulingWeekday = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
export type SchedulingRecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY'
export type SchedulingRecurrenceStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED'
export type SchedulingSlotStatus = 'OPEN' | 'HELD' | 'BOOKED' | 'CANCELLED'
export type SchedulingHoldStatus = 'ACTIVE' | 'RELEASED' | 'EXPIRED' | 'CONVERTED'
export type SchedulingAppointmentStatus = 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
export type SchedulingAppointmentLifecycleStage = 'BOOKED' | 'IN_SERVICE' | 'FINISHED' | 'CANCELLED'
export type SchedulingParticipantType = 'CLIENT' | 'COACH' | 'INSTRUCTOR' | 'OPERATOR' | 'OBSERVER'
export type SchedulingAppointmentParticipantRole = 'PRIMARY' | 'SECONDARY' | 'FACILITATOR'
export type SchedulingAppointmentParticipantStatus = 'INVITED' | 'CONFIRMED' | 'DECLINED' | 'ATTENDED' | 'NO_SHOW'
export type SchedulingWaitlistStatus = 'ACTIVE' | 'PROMOTED' | 'REMOVED' | 'EXPIRED'
export type SchedulingRescheduleStatus = 'REQUESTED' | 'COMPLETED' | 'DECLINED'
export type SchedulingCancellationStatus = 'REQUESTED' | 'CONFIRMED' | 'REJECTED'
export type SchedulingConflictType =
  | 'PARTICIPANT_DOUBLE_BOOKING'
  | 'SLOT_CAPACITY_EXCEEDED'
  | 'STALE_ACTIVE_HOLD'
  | 'RESCHEDULE_TARGET_SATURATED'
export type SchedulingConflictSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type SchedulingConflictStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'
export type SchedulingCommunicationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP' | 'WEBHOOK'
export type SchedulingReminderStatus = 'SCHEDULED' | 'DISPATCHED' | 'DELIVERED' | 'FAILED' | 'CANCELLED'
export type SchedulingNotificationStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'RETRYING' | 'DLQ'
export type SchedulingEscalationStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED'
export type SchedulingEscalationSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type SchedulingBindingStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
export type SchedulingActivationBindingKind = 'IAM' | 'COMMERCE' | 'LMS' | 'WORKFORCE' | 'MISSION'
export type SchedulingActivationEventType = 'BINDING_CREATED' | 'BINDING_UPDATED' | 'BINDING_STATUS_CHANGED'
export type SchedulingActivationEventStatus = 'EMITTED' | 'ACKNOWLEDGED' | 'FAILED'
export type SchedulingBackupStatus = 'QUEUED' | 'COMPLETED' | 'FAILED'
export type SchedulingRestoreStatus = 'PLANNED' | 'RUNNING' | 'COMPLETED' | 'FAILED'
export type SchedulingExportArtifactStatus = 'GENERATED' | 'DELIVERED' | 'FAILED'
export type SchedulingImportValidationStatus = 'PENDING' | 'PASSED' | 'FAILED'
export type SchedulingResilienceCheckStatus = 'PASSED' | 'WARN' | 'FAILED'
export type SchedulingBenchmarkCheckStatus = 'PASSED' | 'WARN' | 'FAILED'
export type SchedulingDiagnosticsStatus = 'HEALTHY' | 'DEGRADED' | 'FAILED'
export type SchedulingOperationsStatus = 'PASS' | 'WARN' | 'FAIL'
export type SchedulingReviewStatus = 'PASS' | 'WARN' | 'FAIL'
export type SchedulingMarketPosition =
  | 'HEADLESS_SCHEDULING_CALENDAR_DIFFERENTIATED'
  | 'HEADLESS_SCHEDULING_COMPETITIVE'
  | 'NOT_YET_COMPETITIVE'
export type SchedulingAdoptionRecommendation = 'PROCEED_TO_PHASE_11_ADOPTION_PLANNING' | 'HOLD_FOR_REMEDIATION'
export type SchedulingWorkforceProfileType = 'COACHING' | 'DISPATCH' | 'CONTRACT_SERVICES'
export type SchedulingMissionWorkflowType = 'MISSION' | 'WORK_ORDER' | 'INSPECTION'
export type SchedulingConcurrencyResourceType =
  | 'CALENDAR'
  | 'POLICY'
  | 'AVAILABILITY_WINDOW'
  | 'RECURRENCE_RULE'
  | 'SLOT'
  | 'HOLD'
  | 'APPOINTMENT'
  | 'WAITLIST'
  | 'RESCHEDULE'
  | 'CANCELLATION'
export type SchedulingConcurrencyAssertionOutcome = 'MATCHED' | 'MISMATCH' | 'MISSING'

export type CommunicationsPhase = 'PHASE_10'
export type CommunicationsSubsystemStatus = 'FORMAL_REVIEW_AND_ADOPTION_PLANNING_IMPLEMENTED'
export type CommunicationsMigrationState = 'BLOCKED_PENDING_STANDALONE_VALIDATION' | 'BLOCKED_PENDING_STANDALONE_ADOPTION'
export type CommunicationsNextPhase = 'PHASE_11_ADOPTION_PLANNING_ONLY'
export type CommunicationsChannelKind =
  | 'EMAIL'
  | 'SMS'
  | 'BROWSER_PUSH'
  | 'DEVICE_PUSH'
  | 'IN_APP'
  | 'EMBEDDED'
  | 'FORM_INTAKE'
export type CommunicationsChannelStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
export type CommunicationsProviderBindingStatus = 'ACTIVE' | 'DEGRADED' | 'DISABLED' | 'ARCHIVED'
export type CommunicationsProviderCallbackType =
  | 'DELIVERY_STATUS'
  | 'SUPPRESSION'
  | 'BOUNCE'
  | 'COMPLAINT'
  | 'INBOUND_MESSAGE'
  | 'INBOUND_FORM_SUBMISSION'
export type CommunicationsProviderCallbackStatus = 'RECEIVED' | 'PROCESSED' | 'IGNORED' | 'FAILED'
export type CommunicationsProviderCallbackNormalizationStatus = 'PENDING' | 'APPLIED' | 'UNMATCHED' | 'IGNORED' | 'FAILED'
export type CommunicationsIntentSourceSubsystem =
  | 'IDP_PLATFORM'
  | 'IAM'
  | 'CMS'
  | 'COMMERCE'
  | 'LMS'
  | 'WORKFORCE'
  | 'SCHEDULING'
  | 'READINESS'
  | 'CUSTOMER_MANAGEMENT'
  | 'EXTERNAL_APPLICATION'
export type CommunicationsMessageRequestStatus =
  | 'QUEUED'
  | 'SCHEDULED'
  | 'DISPATCHING'
  | 'DISPATCHED'
  | 'FAILED'
  | 'CANCELLED'
export type CommunicationsDispatchStatus =
  | 'PENDING'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
export type CommunicationsDeliveryAttemptStatus =
  | 'PENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'OPENED'
  | 'CLICKED'
  | 'BOUNCED'
  | 'DEFERRED'
  | 'EXPIRED'
  | 'FAILED'
  | 'SUPPRESSED'
export type CommunicationsDispatchAttemptOutcome = 'DELIVERED' | 'FAILED' | 'SUPPRESSED'
export type CommunicationsAudienceResolutionStatus = 'PENDING' | 'RESOLVED' | 'REJECTED'
export type CommunicationsPreferenceScope = 'TENANT_DEFAULT' | 'AUDIENCE' | 'APPLICATION'
export type CommunicationsPreferenceProfileStatus = 'ACTIVE' | 'ARCHIVED'
export type CommunicationsConsentStatus = 'PENDING' | 'GRANTED' | 'REVOKED'
export type CommunicationsSuppressionStatus = 'ACTIVE' | 'LIFTED'
export type CommunicationsSuppressionReason =
  | 'USER_UNSUBSCRIBE'
  | 'PROVIDER_BOUNCE'
  | 'PROVIDER_COMPLAINT'
  | 'OPERATOR_POLICY'
  | 'LEGAL_REQUEST'
  | 'DUPLICATE_RECIPIENT'
export type CommunicationsSuppressionSource = 'PROVIDER_CALLBACK' | 'USER_REQUEST' | 'OPERATOR_POLICY' | 'SYSTEM_POLICY'
export type CommunicationsTemplateBindingStatus = 'ACTIVE' | 'ARCHIVED'
export type CommunicationsTemplateRenderStatus = 'RENDERED' | 'FALLBACK_RENDERED' | 'FAILED'
export type CommunicationsTemplateResolutionSource = 'CMS_RELEASE_PIN' | 'FALLBACK_CONTENT' | 'INLINE_OVERRIDE'
export type CommunicationsDeadLetterStatus = 'ACTIVE' | 'REDRIVEN' | 'DISMISSED'
export type CommunicationsDeadLetterReason =
  | 'RETRY_EXHAUSTED'
  | 'FALLBACK_CHAIN_EXHAUSTED'
  | 'POLICY_BLOCKED'
  | 'MANUAL_FAILURE'
export type CommunicationsNotificationFeedItemStatus = 'UNREAD' | 'READ' | 'DISMISSED' | 'ARCHIVED'
export type CommunicationsEmbeddedBindingStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
export type CommunicationsFormSubmissionStatus =
  | 'RECEIVED'
  | 'ACKNOWLEDGED'
  | 'ROUTED'
  | 'FOLLOW_UP_PENDING'
  | 'CLOSED'
  | 'ARCHIVED'
export type CommunicationsFormSubmissionSource = 'WEB_FORM' | 'PROVIDER_CALLBACK' | 'EMBEDDED_WIDGET' | 'MANUAL'
export type CommunicationsOperatorFollowUpStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type CommunicationsIntentBindingStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
export type CommunicationsIntentEventStatus = 'RECEIVED' | 'MAPPED' | 'DISPATCH_QUEUED' | 'FAILED' | 'IGNORED'
export type CommunicationsBackupStatus = 'QUEUED' | 'COMPLETED' | 'FAILED'
export type CommunicationsRestoreStatus = 'PLANNED' | 'RUNNING' | 'COMPLETED' | 'FAILED'
export type CommunicationsExportArtifactStatus = 'GENERATED' | 'DELIVERED' | 'FAILED'
export type CommunicationsImportValidationStatus = 'PENDING' | 'PASSED' | 'FAILED'
export type CommunicationsResilienceCheckStatus = 'PASSED' | 'WARN' | 'FAILED'
export type CommunicationsBenchmarkCheckStatus = 'PASSED' | 'WARN' | 'FAILED'
export type CommunicationsDiagnosticsStatus = 'HEALTHY' | 'DEGRADED' | 'FAILED'
export type CommunicationsOperationsStatus = 'PASS' | 'WARN' | 'FAIL'
export type CommunicationsReviewStatus = 'PASS' | 'WARN' | 'FAIL'
export type CommunicationsMarketPosition =
  | 'HEADLESS_COMMUNICATIONS_DIFFERENTIATED'
  | 'HEADLESS_COMMUNICATIONS_COMPETITIVE'
  | 'NOT_YET_COMPETITIVE'
export type CommunicationsAdoptionRecommendation = 'PROCEED_TO_PHASE_11_ADOPTION_PLANNING' | 'HOLD_FOR_REMEDIATION'
export type CommunicationsIntentKey =
  | 'IAM_VERIFICATION'
  | 'IAM_PASSWORD_RECOVERY'
  | 'IAM_MFA_CHALLENGE'
  | 'COMMERCE_RECEIPT'
  | 'COMMERCE_INVOICE_NOTICE'
  | 'LMS_ANNOUNCEMENT'
  | 'WORKFORCE_RECRUITING_UPDATE'
  | 'SCHEDULING_REMINDER'
  | 'MISSION_ALERT'
  | 'READINESS_ALERT'
  | 'CUSTOM'

export interface CommunicationsValidationDomain {
  id: string
  name: string
  summary: string
  proves: string[]
  migration_blocked: boolean
}

export interface CommunicationsSummaryResponse {
  generated_at: string
  phase: CommunicationsPhase
  subsystem_status: CommunicationsSubsystemStatus
  migration_state: CommunicationsMigrationState
  next_recommended_phase: CommunicationsNextPhase
  validation_domain_count: number
  channel_profile_count: number
  active_channel_profile_count: number
  provider_binding_count: number
  active_provider_binding_count: number
  provider_callback_count: number
  failed_provider_callback_count: number
  normalized_provider_callback_count: number
  unmatched_provider_callback_count: number
  message_request_count: number
  dispatch_count: number
  delivery_attempt_count: number
  suppression_entry_count: number
  preference_profile_count: number
  template_binding_count: number
  template_render_count: number
  retry_queue_count: number
  dead_letter_count: number
  embedded_binding_count: number
  embedded_feed_item_count: number
  in_app_feed_item_count: number
  form_submission_count: number
  open_form_submission_count: number
  operator_follow_up_count: number
  open_operator_follow_up_count: number
  intent_binding_count: number
  active_intent_binding_count: number
  intent_event_count: number
  dispatch_queued_intent_event_count: number
  backup_count: number
  completed_backup_count: number
  restore_drill_count: number
  completed_restore_drill_count: number
  export_artifact_count: number
  delivered_export_artifact_count: number
  import_validation_count: number
  passed_import_validation_count: number
  resilience_check_count: number
  passed_resilience_check_count: number
  benchmark_check_count: number
  passed_benchmark_check_count: number
  diagnostics_record_count: number
  degraded_diagnostics_record_count: number
  formal_review_count: number
  adoption_plan_count: number
  latest_market_position: CommunicationsMarketPosition | null
  latest_adoption_recommendation: CommunicationsAdoptionRecommendation | null
  latest_formal_review_status: CommunicationsReviewStatus | null
  first_contract_ids: string[]
}

export interface CommunicationsChannelProfileRecord {
  id: string
  name: string
  summary: string
  channel_kind: CommunicationsChannelKind
  status: CommunicationsChannelStatus
  validation_domain_id: string
  enabled_for_idp: boolean
  target_application_ids: string[]
  tags: string[]
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommunicationsProviderBindingRecord {
  id: string
  name: string
  summary: string
  channel_kind: CommunicationsChannelKind
  provider_id: string
  provider_label: string
  status: CommunicationsProviderBindingStatus
  validation_domain_id: string
  callback_path: string
  secret_reference_id: string | null
  supports_delivery_receipts: boolean
  supports_status_webhooks: boolean
  fallback_binding_id: string | null
  bound_channel_profile_ids: string[]
  tags: string[]
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommunicationsProviderCallbackRecord {
  id: string
  provider_binding_id: string
  external_event_id: string
  callback_type: CommunicationsProviderCallbackType
  status: CommunicationsProviderCallbackStatus
  normalization_status: CommunicationsProviderCallbackNormalizationStatus
  provider_message_id: string | null
  provider_status_code: string | null
  normalized_delivery_attempt_status: CommunicationsDeliveryAttemptStatus | null
  correlated_delivery_attempt_id: string | null
  correlated_dispatch_id: string | null
  correlated_message_request_id: string | null
  normalization_error_message: string | null
  received_at: string
  processed_at: string | null
  payload_digest: string
  error_message: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommunicationsMessageRequestRecord {
  id: string
  idempotency_key: string
  validation_domain_id: string
  intent_source_subsystem: CommunicationsIntentSourceSubsystem
  intent_source_reference: string | null
  channel_profile_id: string
  channel_kind: CommunicationsChannelKind
  provider_binding_id: string | null
  template_binding_id: string | null
  requested_locale: string | null
  resolved_locale: string | null
  template_render_id: string | null
  cms_release_id: string | null
  recipient_address: string
  subject: string
  body: string
  payload_digest: string
  scheduled_for: string | null
  status: CommunicationsMessageRequestStatus
  latest_dispatch_id: string | null
  dispatch_count: number
  idempotency_hit_count: number
  error_message: string | null
  tags: string[]
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommunicationsDispatchRecord {
  id: string
  message_request_id: string
  channel_profile_id: string
  provider_binding_id: string
  channel_kind: CommunicationsChannelKind
  dispatch_sequence: number
  status: CommunicationsDispatchStatus
  scheduled_for: string | null
  dispatched_at: string | null
  completed_at: string | null
  latest_delivery_attempt_id: string | null
  attempt_count: number
  max_attempts: number
  retry_backoff_seconds: number
  retry_count: number
  next_retry_at: string | null
  retry_exhausted: boolean
  fallback_binding_id: string | null
  fallback_dispatch_id: string | null
  previous_dispatch_id: string | null
  dead_letter_id: string | null
  fallback_triggered_at: string | null
  error_message: string | null
  tags: string[]
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommunicationsDeliveryAttemptRecord {
  id: string
  dispatch_id: string
  message_request_id: string
  provider_binding_id: string
  channel_kind: CommunicationsChannelKind
  attempt_number: number
  status: CommunicationsDeliveryAttemptStatus
  provider_message_id: string | null
  provider_status_code: string | null
  payload_digest: string
  dispatched_at: string | null
  delivered_at: string | null
  failed_at: string | null
  suppressed_at: string | null
  error_message: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommunicationsAudienceResolutionRecord {
  id: string
  validation_domain_id: string
  intent_source_subsystem: CommunicationsIntentSourceSubsystem
  message_request_id: string | null
  channel_kind: CommunicationsChannelKind
  requested_audience_references: string[]
  resolved_recipient_addresses: string[]
  filtered_recipient_addresses: string[]
  applied_preference_profile_ids: string[]
  applied_consent_record_ids: string[]
  applied_suppression_entry_ids: string[]
  status: CommunicationsAudienceResolutionStatus
  resolution_notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommunicationsPreferenceProfileRecord {
  id: string
  validation_domain_id: string
  scope: CommunicationsPreferenceScope
  scope_reference_id: string
  audience_reference: string | null
  status: CommunicationsPreferenceProfileStatus
  default_channel_opt_in: boolean
  enforce_consent_gate: boolean
  allowed_channel_kinds: CommunicationsChannelKind[]
  quiet_hours_start_local: string | null
  quiet_hours_end_local: string | null
  timezone: string | null
  tags: string[]
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommunicationsConsentRecord {
  id: string
  validation_domain_id: string
  audience_reference: string
  channel_kind: CommunicationsChannelKind
  status: CommunicationsConsentStatus
  lawful_basis: string
  source_reference_id: string | null
  effective_at: string
  expires_at: string | null
  revoked_at: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommunicationsSuppressionEntryRecord {
  id: string
  validation_domain_id: string
  audience_reference: string
  recipient_address: string
  channel_kind: CommunicationsChannelKind
  status: CommunicationsSuppressionStatus
  reason: CommunicationsSuppressionReason
  source: CommunicationsSuppressionSource
  activated_at: string
  lifted_at: string | null
  expires_at: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommunicationsTemplateBindingRecord {
  id: string
  validation_domain_id: string
  channel_kind: CommunicationsChannelKind
  template_key: string
  cms_space_id: string
  cms_entry_id: string
  cms_release_id: string
  cms_release_label: string | null
  status: CommunicationsTemplateBindingStatus
  default_locale: string
  supported_locales: string[]
  locale_fallback_chain: string[]
  fallback_subject: string | null
  fallback_body: string | null
  tags: string[]
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommunicationsTemplateRenderRecord {
  id: string
  template_binding_id: string
  message_request_id: string | null
  validation_domain_id: string
  channel_kind: CommunicationsChannelKind
  requested_locale: string | null
  resolved_locale: string
  resolution_source: CommunicationsTemplateResolutionSource
  status: CommunicationsTemplateRenderStatus
  cms_release_id: string
  payload_digest: string
  rendered_subject: string
  rendered_body: string
  error_message: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommunicationsDeadLetterRecord {
  id: string
  message_request_id: string
  dispatch_id: string
  channel_kind: CommunicationsChannelKind
  provider_binding_id: string
  status: CommunicationsDeadLetterStatus
  reason: CommunicationsDeadLetterReason
  failure_count: number
  first_failed_at: string
  last_failed_at: string
  latest_error_message: string | null
  redrive_dispatch_id: string | null
  resolved_at: string | null
  tags: string[]
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommunicationsNotificationFeedItemRecord {
  id: string
  validation_domain_id: string
  message_request_id: string
  channel_kind: 'IN_APP' | 'EMBEDDED'
  recipient_address: string
  audience_reference: string
  embedded_binding_id: string | null
  status: CommunicationsNotificationFeedItemStatus
  subject: string
  body_preview: string
  latest_dispatch_id: string | null
  latest_delivery_attempt_id: string | null
  latest_delivery_attempt_status: CommunicationsDeliveryAttemptStatus | null
  visible_from: string
  visible_until: string | null
  read_at: string | null
  dismissed_at: string | null
  archived_at: string | null
  retention_expires_at: string | null
  tags: string[]
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommunicationsEmbeddedBindingRecord {
  id: string
  validation_domain_id: string
  name: string
  summary: string
  status: CommunicationsEmbeddedBindingStatus
  consumer_application_id: string
  consumer_label: string
  route_pattern: string
  default_recipient_scope: string
  default_visibility_ttl_days: number
  tags: string[]
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommunicationsFormSubmissionRecord {
  id: string
  validation_domain_id: string
  source: CommunicationsFormSubmissionSource
  source_reference_id: string | null
  provider_callback_id: string | null
  inbound_provider_binding_id: string | null
  requester_contact: string
  requester_display_name: string | null
  subject: string
  body: string
  payload_digest: string
  submitted_at: string
  acknowledged_at: string | null
  routed_at: string | null
  closed_at: string | null
  archived_at: string | null
  status: CommunicationsFormSubmissionStatus
  routing_key: string | null
  assigned_queue: string | null
  acknowledgement_message_request_id: string | null
  latest_follow_up_id: string | null
  tags: string[]
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommunicationsOperatorFollowUpRecord {
  id: string
  form_submission_id: string
  validation_domain_id: string
  status: CommunicationsOperatorFollowUpStatus
  assigned_operator_id: string | null
  assigned_team: string | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  due_at: string | null
  started_at: string | null
  completed_at: string | null
  closed_message_request_id: string | null
  tags: string[]
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommunicationsIntentBindingRecord {
  id: string
  validation_domain_id: string
  name: string
  summary: string
  intent_source_subsystem: CommunicationsIntentSourceSubsystem
  intent_key: CommunicationsIntentKey
  status: CommunicationsIntentBindingStatus
  channel_profile_id: string
  provider_binding_id: string | null
  template_binding_id: string | null
  default_recipient_address: string | null
  default_requested_locale: string | null
  auto_dispatch: boolean
  tags: string[]
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommunicationsIntentEventRecord {
  id: string
  intent_binding_id: string
  validation_domain_id: string
  intent_source_subsystem: CommunicationsIntentSourceSubsystem
  intent_key: CommunicationsIntentKey
  intent_reference_id: string
  status: CommunicationsIntentEventStatus
  recipient_address: string | null
  requested_locale: string | null
  subject: string | null
  body: string | null
  payload_digest: string
  message_request_id: string | null
  error_message: string | null
  occurred_at: string
  processed_at: string | null
  tags: string[]
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommunicationsBackupRecord {
  id: string
  validation_domain_id: string | null
  backup_scope: string
  storage_reference: string
  status: CommunicationsBackupStatus
  started_at: string
  completed_at: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommunicationsRestoreDrillRecord {
  id: string
  validation_domain_id: string | null
  backup_id: string | null
  drill_name: string
  status: CommunicationsRestoreStatus
  started_at: string
  completed_at: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommunicationsExportArtifactRecord {
  id: string
  validation_domain_id: string | null
  artifact_name: string
  format: string
  storage_reference: string
  status: CommunicationsExportArtifactStatus
  generated_at: string
  delivered_at: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommunicationsImportValidationRecord {
  id: string
  validation_domain_id: string | null
  artifact_reference: string
  status: CommunicationsImportValidationStatus
  validated_at: string
  findings: string[]
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommunicationsResilienceCheckRecord {
  id: string
  validation_domain_id: string | null
  check_name: string
  status: CommunicationsResilienceCheckStatus
  executed_at: string
  latency_ms: number | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommunicationsBenchmarkCheckRecord {
  id: string
  validation_domain_id: string | null
  benchmark_name: string
  status: CommunicationsBenchmarkCheckStatus
  measured_at: string
  score: number | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommunicationsDiagnosticsRecord {
  id: string
  validation_domain_id: string | null
  diagnostic_name: string
  status: CommunicationsDiagnosticsStatus
  observed_at: string
  details: string
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommunicationsFormalReviewRecord {
  id: string
  created_at: string
  created_by_user_id: string
  overall_status: CommunicationsReviewStatus
  market_position: CommunicationsMarketPosition
  adoption_recommendation: CommunicationsAdoptionRecommendation
  standalone_validation_complete: boolean
  standalone_production_ready: boolean
  operations_status: CommunicationsReviewStatus
  intent_binding_status: CommunicationsReviewStatus
  notes: string[]
}

export interface CommunicationsAdoptionPlanRecord {
  id: string
  created_at: string
  created_by_user_id: string
  formal_review_id: string | null
  recommendation: CommunicationsAdoptionRecommendation
  target_phase: 'PHASE_11_ADOPTION_PLANNING_ONLY'
  scope: string
  prerequisites: string[]
  risks: string[]
  milestones: string[]
  notes: string[]
}

export interface SchedulingValidationDomain {
  id: string
  name: string
  summary: string
  proves: string[]
  migration_blocked: boolean
}

export interface SchedulingSummaryResponse {
  generated_at: string
  phase: string
  subsystem_status: string
  migration_state: string
  next_recommended_phase: string
  validation_domain_count: number
  calendar_count: number
  active_calendar_count: number
  ownership_record_count: number
  active_ownership_record_count: number
  policy_count: number
  active_policy_count: number
  availability_window_count: number
  active_availability_window_count: number
  recurrence_rule_count: number
  active_recurrence_rule_count: number
  slot_count: number
  open_slot_count: number
  hold_count: number
  active_hold_count: number
  appointment_count: number
  active_appointment_count: number
  waitlist_entry_count: number
  active_waitlist_entry_count: number
  reschedule_count: number
  cancellation_count: number
  conflict_count: number
  active_conflict_count: number
  concurrency_guard_count: number
  formal_review_count: number
  adoption_plan_count: number
  latest_market_position: SchedulingMarketPosition | null
  latest_adoption_recommendation: SchedulingAdoptionRecommendation | null
  latest_formal_review_status: SchedulingReviewStatus | null
  first_contract_ids: string[]
}

export interface SchedulingCalendarRecord {
  id: string
  name: string
  summary: string
  owner_type: SchedulingOwnerType
  owner_reference_id: string
  timezone: string
  visibility: 'PRIVATE' | 'INTERNAL' | 'SHARED' | 'PUBLIC'
  status: SchedulingCalendarStatus
  validation_domain_id: string
  default_policy_id: string | null
  tags: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface SchedulingPolicyRecord {
  id: string
  calendar_id: string
  name: string
  summary: string
  status: SchedulingPolicyStatus
  timezone: string
  default_duration_minutes: number
  slot_interval_minutes: number
  min_notice_minutes: number
  max_advance_days: number
  buffer_before_minutes: number
  buffer_after_minutes: number
  daily_capacity: number
  overbooking_allowed: boolean
  waitlist_allowed: boolean
  cancellation_window_minutes: number
  reschedule_window_minutes: number
  no_show_grace_minutes: number
  reminder_offsets_minutes: number[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface SchedulingAvailabilityWindowRecord {
  id: string
  calendar_id: string
  policy_id: string | null
  name: string
  summary: string
  window_kind: SchedulingAvailabilityWindowKind
  status: SchedulingAvailabilityWindowStatus
  timezone: string
  weekdays: SchedulingWeekday[]
  start_local_time: string
  end_local_time: string
  effective_start_date: string
  effective_end_date: string | null
  capacity_override: number | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface SchedulingRecurrenceRuleRecord {
  id: string
  calendar_id: string
  policy_id: string | null
  availability_window_id: string | null
  name: string
  summary: string
  status: SchedulingRecurrenceStatus
  timezone: string
  frequency: SchedulingRecurrenceFrequency
  interval: number
  by_weekdays: SchedulingWeekday[]
  by_month_days: number[]
  start_date: string
  until_date: string | null
  start_local_time: string
  duration_minutes: number
  exception_dates: string[]
  override_dates: string[]
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface SchedulingSlotRecord {
  id: string
  calendar_id: string
  policy_id: string | null
  availability_window_id: string | null
  recurrence_rule_id: string | null
  status: SchedulingSlotStatus
  timezone: string
  local_start: string
  local_end: string
  starts_at: string
  ends_at: string
  capacity_total: number
  capacity_reserved: number
  capacity_remaining: number
  generated_from_source: 'RECURRENCE' | 'MANUAL'
  generated_for_date: string
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface SchedulingHoldRecord {
  id: string
  slot_id: string
  calendar_id: string
  status: SchedulingHoldStatus
  hold_token: string
  hold_reason: string
  hold_duration_minutes: number
  expires_at: string
  released_at: string | null
  converted_at: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface SchedulingAppointmentRecord {
  id: string
  calendar_id: string
  slot_id: string
  hold_id: string | null
  service_reference_id: string | null
  status: SchedulingAppointmentStatus
  lifecycle_stage: SchedulingAppointmentLifecycleStage
  timezone: string
  local_start: string
  local_end: string
  starts_at: string
  ends_at: string
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface SchedulingAppointmentParticipantRecord {
  id: string
  appointment_id: string
  participant_type: SchedulingParticipantType
  participant_reference_id: string
  role: SchedulingAppointmentParticipantRole
  status: SchedulingAppointmentParticipantStatus
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface SchedulingWaitlistEntryRecord {
  id: string
  calendar_id: string
  slot_id: string
  appointment_id: string | null
  participant_type: SchedulingParticipantType
  participant_reference_id: string
  priority: number
  status: SchedulingWaitlistStatus
  promoted_at: string | null
  expires_at: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface SchedulingRescheduleRecord {
  id: string
  appointment_id: string
  calendar_id: string
  from_slot_id: string
  requested_slot_id: string
  approved_slot_id: string | null
  status: SchedulingRescheduleStatus
  reason: string
  requested_by_user_id: string
  decided_by_user_id: string | null
  decided_at: string | null
  completed_at: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface SchedulingCancellationRecord {
  id: string
  appointment_id: string
  calendar_id: string
  status: SchedulingCancellationStatus
  reason: string
  cancelled_by_user_id: string | null
  cancelled_at: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface SchedulingConflictRecord {
  id: string
  fingerprint: string
  conflict_type: SchedulingConflictType
  severity: SchedulingConflictSeverity
  status: SchedulingConflictStatus
  calendar_id: string | null
  slot_id: string | null
  appointment_ids: string[]
  participant_type: SchedulingParticipantType | null
  participant_reference_id: string | null
  summary: string
  details: string
  first_detected_at: string
  last_seen_at: string
  resolved_at: string | null
  resolved_by_user_id: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface SchedulingConcurrencyGuardRecord {
  id: string
  resource_type: SchedulingConcurrencyResourceType
  resource_id: string
  version: number
  last_event: string
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface SchedulingReminderRecord {
  id: string
  appointment_id: string
  calendar_id: string
  channel: SchedulingCommunicationChannel
  status: SchedulingReminderStatus
  schedule_source: 'POLICY_DEFAULT' | 'MANUAL'
  scheduled_for: string
  scheduled_offset_minutes: number
  policy_reference_id: string | null
  dispatched_at: string | null
  delivered_at: string | null
  failed_at: string | null
  cancelled_at: string | null
  retry_count: number
  max_retries: number
  last_error: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface SchedulingNotificationRecord {
  id: string
  reminder_id: string | null
  appointment_id: string | null
  calendar_id: string | null
  channel: SchedulingCommunicationChannel
  status: SchedulingNotificationStatus
  template_key: string
  subject: string | null
  message_preview: string
  dispatch_at: string
  sent_at: string | null
  delivered_at: string | null
  failed_at: string | null
  retry_count: number
  max_retries: number
  next_retry_at: string | null
  dlq_at: string | null
  lane: 'EVENTBRIDGE_SCHEDULER' | 'EVENTBRIDGE_EVENT_BUS' | 'SQS_RETRY_QUEUE' | 'SQS_DLQ'
  provider_reference_id: string | null
  last_error: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface SchedulingEscalationRecord {
  id: string
  calendar_id: string | null
  appointment_id: string | null
  reminder_id: string | null
  notification_id: string | null
  status: SchedulingEscalationStatus
  severity: SchedulingEscalationSeverity
  escalation_policy_key: string
  reason: string
  lane: 'EVENTBRIDGE_SCHEDULER' | 'EVENTBRIDGE_EVENT_BUS' | 'SQS_RETRY_QUEUE' | 'SQS_DLQ'
  assigned_to_user_id: string | null
  opened_at: string
  acknowledged_at: string | null
  resolved_at: string | null
  dismissed_at: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface SchedulingIamBindingRecord {
  id: string
  calendar_id: string
  realm_id: string
  organization_scope_id: string | null
  principal_scope_reference: string | null
  role_keys: string[]
  status: SchedulingBindingStatus
  last_synced_at: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface SchedulingCommerceBindingRecord {
  id: string
  calendar_id: string
  commerce_application_binding_id: string
  offer_reference_id: string | null
  pricing_profile_reference_id: string | null
  cancellation_policy_reference_id: string | null
  status: SchedulingBindingStatus
  last_synced_at: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface SchedulingLmsBindingRecord {
  id: string
  calendar_id: string
  lms_portal_id: string
  lms_program_id: string | null
  lms_course_run_id: string | null
  lms_session_template_id: string | null
  status: SchedulingBindingStatus
  last_synced_at: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface SchedulingWorkforceBindingRecord {
  id: string
  calendar_id: string
  workforce_profile_type: SchedulingWorkforceProfileType
  workforce_profile_reference_id: string
  engagement_template_reference_id: string | null
  status: SchedulingBindingStatus
  last_synced_at: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface SchedulingMissionBindingRecord {
  id: string
  calendar_id: string
  mission_workflow_type: SchedulingMissionWorkflowType
  mission_workflow_reference_id: string
  dispatch_policy_reference_id: string | null
  status: SchedulingBindingStatus
  last_synced_at: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface SchedulingActivationEventRecord {
  id: string
  binding_kind: SchedulingActivationBindingKind
  binding_id: string
  calendar_id: string
  event_type: SchedulingActivationEventType
  status: SchedulingActivationEventStatus
  external_reference_id: string | null
  message: string
  occurred_at: string
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface SchedulingBackupRecord {
  id: string
  calendar_id: string | null
  backup_scope: string
  storage_reference: string
  status: SchedulingBackupStatus
  started_at: string
  completed_at: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface SchedulingRestoreDrillRecord {
  id: string
  calendar_id: string | null
  backup_id: string | null
  drill_name: string
  status: SchedulingRestoreStatus
  started_at: string
  completed_at: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface SchedulingExportArtifactRecord {
  id: string
  calendar_id: string | null
  artifact_name: string
  format: string
  storage_reference: string
  status: SchedulingExportArtifactStatus
  generated_at: string
  delivered_at: string | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface SchedulingImportValidationRecord {
  id: string
  calendar_id: string | null
  artifact_reference: string
  status: SchedulingImportValidationStatus
  validated_at: string
  findings: string[]
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface SchedulingResilienceCheckRecord {
  id: string
  calendar_id: string | null
  check_name: string
  status: SchedulingResilienceCheckStatus
  executed_at: string
  latency_ms: number | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface SchedulingBenchmarkCheckRecord {
  id: string
  calendar_id: string | null
  benchmark_name: string
  status: SchedulingBenchmarkCheckStatus
  measured_at: string
  score: number | null
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface SchedulingDiagnosticsRecord {
  id: string
  calendar_id: string | null
  diagnostic_name: string
  status: SchedulingDiagnosticsStatus
  observed_at: string
  details: string
  notes: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CommunicationsValidationDomainsResponse {
  generated_at: string
  validation_domains: CommunicationsValidationDomain[]
  count: number
}

export interface CommunicationsChannelProfilesResponse {
  generated_at: string
  channel_profiles: CommunicationsChannelProfileRecord[]
  count: number
}

export interface CommunicationsProviderBindingsResponse {
  generated_at: string
  provider_bindings: CommunicationsProviderBindingRecord[]
  count: number
}

export interface CommunicationsProviderCallbacksResponse {
  generated_at: string
  provider_callbacks: CommunicationsProviderCallbackRecord[]
  count: number
}

export interface CommunicationsTemplateBindingsResponse {
  generated_at: string
  template_bindings: CommunicationsTemplateBindingRecord[]
  count: number
}

export interface CommunicationsTemplateRendersResponse {
  generated_at: string
  template_renders: CommunicationsTemplateRenderRecord[]
  count: number
}

export interface CommunicationsDeadLettersResponse {
  generated_at: string
  dead_letters: CommunicationsDeadLetterRecord[]
  count: number
}

export interface CommunicationsMessageRequestsResponse {
  generated_at: string
  message_requests: CommunicationsMessageRequestRecord[]
  count: number
}

export interface CommunicationsDispatchesResponse {
  generated_at: string
  dispatches: CommunicationsDispatchRecord[]
  count: number
}

export interface CommunicationsDeliveryAttemptsResponse {
  generated_at: string
  delivery_attempts: CommunicationsDeliveryAttemptRecord[]
  count: number
}

export interface CommunicationsAudienceResolutionsResponse {
  generated_at: string
  audience_resolutions: CommunicationsAudienceResolutionRecord[]
  count: number
}

export interface CommunicationsPreferenceProfilesResponse {
  generated_at: string
  preference_profiles: CommunicationsPreferenceProfileRecord[]
  count: number
}

export interface CommunicationsConsentRecordsResponse {
  generated_at: string
  consent_records: CommunicationsConsentRecord[]
  count: number
}

export interface CommunicationsSuppressionEntriesResponse {
  generated_at: string
  suppression_entries: CommunicationsSuppressionEntryRecord[]
  count: number
}

export interface CommunicationsNotificationFeedResponse {
  generated_at: string
  notification_feed_items: CommunicationsNotificationFeedItemRecord[]
  count: number
}

export interface CommunicationsEmbeddedBindingsResponse {
  generated_at: string
  embedded_bindings: CommunicationsEmbeddedBindingRecord[]
  count: number
}

export interface CommunicationsFormSubmissionsResponse {
  generated_at: string
  form_submissions: CommunicationsFormSubmissionRecord[]
  count: number
}

export interface CommunicationsOperatorFollowUpsResponse {
  generated_at: string
  operator_follow_ups: CommunicationsOperatorFollowUpRecord[]
  count: number
}

export interface CommunicationsIntentBindingsResponse {
  generated_at: string
  intent_bindings: CommunicationsIntentBindingRecord[]
  count: number
}

export interface CommunicationsIntentEventsResponse {
  generated_at: string
  intent_events: CommunicationsIntentEventRecord[]
  count: number
}

export interface CommunicationsOperationsSummaryResponse {
  generated_at: string
  operations_status: CommunicationsOperationsStatus
  backup_count: number
  completed_backup_count: number
  restore_drill_count: number
  completed_restore_drill_count: number
  export_artifact_count: number
  delivered_export_artifact_count: number
  import_validation_count: number
  passed_import_validation_count: number
  resilience_check_count: number
  passed_resilience_check_count: number
  benchmark_check_count: number
  passed_benchmark_check_count: number
  diagnostics_record_count: number
  degraded_diagnostics_record_count: number
  first_contract_ids: string[]
}

export interface CommunicationsBackupsResponse {
  generated_at: string
  backups: CommunicationsBackupRecord[]
  count: number
}

export interface CommunicationsRestoreDrillsResponse {
  generated_at: string
  restore_drills: CommunicationsRestoreDrillRecord[]
  count: number
}

export interface CommunicationsExportArtifactsResponse {
  generated_at: string
  export_artifacts: CommunicationsExportArtifactRecord[]
  count: number
}

export interface CommunicationsImportValidationsResponse {
  generated_at: string
  import_validations: CommunicationsImportValidationRecord[]
  count: number
}

export interface CommunicationsResilienceChecksResponse {
  generated_at: string
  resilience_checks: CommunicationsResilienceCheckRecord[]
  count: number
}

export interface CommunicationsBenchmarkChecksResponse {
  generated_at: string
  benchmark_checks: CommunicationsBenchmarkCheckRecord[]
  count: number
}

export interface CommunicationsDiagnosticsResponse {
  generated_at: string
  diagnostics: CommunicationsDiagnosticsRecord[]
  count: number
}

export interface CommunicationsReviewSummaryResponse {
  generated_at: string
  formal_review_count: number
  adoption_plan_count: number
  latest_market_position: CommunicationsMarketPosition | null
  latest_adoption_recommendation: CommunicationsAdoptionRecommendation | null
  latest_formal_review_status: CommunicationsReviewStatus | null
  latest_review: CommunicationsFormalReviewRecord | null
  latest_adoption_plan: CommunicationsAdoptionPlanRecord | null
}

export interface CommunicationsFormalReviewsResponse {
  generated_at: string
  latest_review: CommunicationsFormalReviewRecord | null
  reviews: CommunicationsFormalReviewRecord[]
  count: number
}

export interface CommunicationsAdoptionPlansResponse {
  generated_at: string
  latest_plan: CommunicationsAdoptionPlanRecord | null
  plans: CommunicationsAdoptionPlanRecord[]
  count: number
}

export interface CreateCommunicationsChannelProfileRequest {
  name: string
  summary: string
  channel_kind: CommunicationsChannelKind
  validation_domain_id: string
  status?: CommunicationsChannelStatus
  enabled_for_idp?: boolean
  target_application_ids?: string[]
  tags?: string[]
  notes?: string[]
}

export interface UpdateCommunicationsChannelProfileRequest {
  name?: string
  summary?: string
  channel_kind?: CommunicationsChannelKind
  validation_domain_id?: string
  status?: CommunicationsChannelStatus
  enabled_for_idp?: boolean
  target_application_ids?: string[]
  tags?: string[]
  notes?: string[]
}

export interface CreateCommunicationsProviderBindingRequest {
  name: string
  summary: string
  channel_kind: CommunicationsChannelKind
  provider_id: string
  provider_label: string
  validation_domain_id: string
  status?: CommunicationsProviderBindingStatus
  callback_path?: string
  secret_reference_id?: string | null
  supports_delivery_receipts?: boolean
  supports_status_webhooks?: boolean
  fallback_binding_id?: string | null
  bound_channel_profile_ids?: string[]
  tags?: string[]
  notes?: string[]
}

export interface UpdateCommunicationsProviderBindingRequest {
  name?: string
  summary?: string
  channel_kind?: CommunicationsChannelKind
  provider_id?: string
  provider_label?: string
  validation_domain_id?: string
  status?: CommunicationsProviderBindingStatus
  callback_path?: string
  secret_reference_id?: string | null
  supports_delivery_receipts?: boolean
  supports_status_webhooks?: boolean
  fallback_binding_id?: string | null
  bound_channel_profile_ids?: string[]
  tags?: string[]
  notes?: string[]
}

export interface CreateCommunicationsProviderCallbackRequest {
  provider_binding_id: string
  external_event_id: string
  callback_type: CommunicationsProviderCallbackType
  status?: CommunicationsProviderCallbackStatus
  normalization_status?: CommunicationsProviderCallbackNormalizationStatus
  provider_message_id?: string | null
  provider_status_code?: string | null
  correlated_delivery_attempt_id?: string | null
  correlated_dispatch_id?: string | null
  correlated_message_request_id?: string | null
  received_at?: string
  processed_at?: string | null
  payload_digest: string
  error_message?: string | null
  normalization_error_message?: string | null
  notes?: string[]
}

export interface UpdateCommunicationsProviderCallbackRequest {
  status?: CommunicationsProviderCallbackStatus
  normalization_status?: CommunicationsProviderCallbackNormalizationStatus
  provider_message_id?: string | null
  provider_status_code?: string | null
  normalized_delivery_attempt_status?: CommunicationsDeliveryAttemptStatus | null
  correlated_delivery_attempt_id?: string | null
  correlated_dispatch_id?: string | null
  correlated_message_request_id?: string | null
  processed_at?: string | null
  error_message?: string | null
  normalization_error_message?: string | null
  notes?: string[]
}

export interface NormalizeCommunicationsProviderCallbackRequest {
  provider_message_id?: string | null
  provider_status_code?: string | null
  correlated_delivery_attempt_id?: string | null
  correlated_dispatch_id?: string | null
  correlated_message_request_id?: string | null
  error_message?: string | null
  notes?: string[]
}

export interface CreateCommunicationsMessageRequestRequest {
  idempotency_key: string
  validation_domain_id: string
  intent_source_subsystem: CommunicationsIntentSourceSubsystem
  intent_source_reference?: string | null
  channel_profile_id: string
  provider_binding_id?: string | null
  template_binding_id?: string | null
  requested_locale?: string | null
  recipient_address: string
  subject?: string | null
  body?: string | null
  payload_digest: string
  scheduled_for?: string | null
  status?: CommunicationsMessageRequestStatus
  tags?: string[]
  notes?: string[]
}

export interface UpdateCommunicationsMessageRequestRequest {
  provider_binding_id?: string | null
  template_binding_id?: string | null
  requested_locale?: string | null
  recipient_address?: string
  subject?: string | null
  body?: string | null
  payload_digest?: string
  scheduled_for?: string | null
  status?: CommunicationsMessageRequestStatus
  error_message?: string | null
  tags?: string[]
  notes?: string[]
}

export interface CreateCommunicationsTemplateBindingRequest {
  validation_domain_id: string
  channel_kind: CommunicationsChannelKind
  template_key: string
  cms_space_id: string
  cms_entry_id: string
  cms_release_id: string
  cms_release_label?: string | null
  status?: CommunicationsTemplateBindingStatus
  default_locale?: string
  supported_locales?: string[]
  locale_fallback_chain?: string[]
  fallback_subject?: string | null
  fallback_body?: string | null
  tags?: string[]
  notes?: string[]
}

export interface UpdateCommunicationsTemplateBindingRequest {
  channel_kind?: CommunicationsChannelKind
  cms_space_id?: string
  cms_entry_id?: string
  cms_release_id?: string
  cms_release_label?: string | null
  status?: CommunicationsTemplateBindingStatus
  default_locale?: string
  supported_locales?: string[]
  locale_fallback_chain?: string[]
  fallback_subject?: string | null
  fallback_body?: string | null
  tags?: string[]
  notes?: string[]
}

export interface CreateCommunicationsDispatchRequest {
  message_request_id: string
  provider_binding_id?: string | null
  fallback_binding_id?: string | null
  scheduled_for?: string | null
  status?: CommunicationsDispatchStatus
  error_message?: string | null
  max_attempts?: number
  retry_backoff_seconds?: number
  auto_create_delivery_attempt?: boolean
  tags?: string[]
  notes?: string[]
}

export interface UpdateCommunicationsDispatchRequest {
  provider_binding_id?: string
  fallback_binding_id?: string | null
  scheduled_for?: string | null
  status?: CommunicationsDispatchStatus
  error_message?: string | null
  max_attempts?: number
  retry_backoff_seconds?: number
  next_retry_at?: string | null
  tags?: string[]
  notes?: string[]
}

export interface ProcessCommunicationsDispatchAttemptRequest {
  outcome: CommunicationsDispatchAttemptOutcome
  provider_message_id?: string | null
  provider_status_code?: string | null
  payload_digest?: string
  error_message?: string | null
  notes?: string[]
}

export interface CreateCommunicationsDeliveryAttemptRequest {
  dispatch_id: string
  status?: CommunicationsDeliveryAttemptStatus
  provider_message_id?: string | null
  provider_status_code?: string | null
  payload_digest?: string
  error_message?: string | null
  notes?: string[]
}

export interface UpdateCommunicationsDeliveryAttemptRequest {
  status?: CommunicationsDeliveryAttemptStatus
  provider_message_id?: string | null
  provider_status_code?: string | null
  payload_digest?: string
  error_message?: string | null
  notes?: string[]
}

export interface CreateCommunicationsAudienceResolutionRequest {
  validation_domain_id: string
  intent_source_subsystem: CommunicationsIntentSourceSubsystem
  message_request_id?: string | null
  channel_kind: CommunicationsChannelKind
  requested_audience_references: string[]
  status?: CommunicationsAudienceResolutionStatus
  resolution_notes?: string[]
}

export interface UpdateCommunicationsAudienceResolutionRequest {
  status?: CommunicationsAudienceResolutionStatus
  resolved_recipient_addresses?: string[]
  filtered_recipient_addresses?: string[]
  resolution_notes?: string[]
}

export interface CreateCommunicationsPreferenceProfileRequest {
  validation_domain_id: string
  scope: CommunicationsPreferenceScope
  scope_reference_id: string
  audience_reference?: string | null
  status?: CommunicationsPreferenceProfileStatus
  default_channel_opt_in?: boolean
  enforce_consent_gate?: boolean
  allowed_channel_kinds?: CommunicationsChannelKind[]
  quiet_hours_start_local?: string | null
  quiet_hours_end_local?: string | null
  timezone?: string | null
  tags?: string[]
  notes?: string[]
}

export interface UpdateCommunicationsPreferenceProfileRequest {
  status?: CommunicationsPreferenceProfileStatus
  default_channel_opt_in?: boolean
  enforce_consent_gate?: boolean
  allowed_channel_kinds?: CommunicationsChannelKind[]
  quiet_hours_start_local?: string | null
  quiet_hours_end_local?: string | null
  timezone?: string | null
  tags?: string[]
  notes?: string[]
}

export interface CreateCommunicationsConsentRecordRequest {
  validation_domain_id: string
  audience_reference: string
  channel_kind: CommunicationsChannelKind
  status: CommunicationsConsentStatus
  lawful_basis: string
  source_reference_id?: string | null
  effective_at?: string
  expires_at?: string | null
  revoked_at?: string | null
  notes?: string[]
}

export interface UpdateCommunicationsConsentRecordRequest {
  status?: CommunicationsConsentStatus
  lawful_basis?: string
  source_reference_id?: string | null
  effective_at?: string
  expires_at?: string | null
  revoked_at?: string | null
  notes?: string[]
}

export interface CreateCommunicationsSuppressionEntryRequest {
  validation_domain_id: string
  audience_reference: string
  recipient_address: string
  channel_kind: CommunicationsChannelKind
  status?: CommunicationsSuppressionStatus
  reason: CommunicationsSuppressionReason
  source: CommunicationsSuppressionSource
  activated_at?: string
  lifted_at?: string | null
  expires_at?: string | null
  notes?: string[]
}

export interface UpdateCommunicationsSuppressionEntryRequest {
  status?: CommunicationsSuppressionStatus
  reason?: CommunicationsSuppressionReason
  source?: CommunicationsSuppressionSource
  lifted_at?: string | null
  expires_at?: string | null
  notes?: string[]
}

export interface UpdateCommunicationsDeadLetterRequest {
  status?: CommunicationsDeadLetterStatus
  reason?: CommunicationsDeadLetterReason
  latest_error_message?: string | null
  redrive_dispatch_id?: string | null
  resolved_at?: string | null
  tags?: string[]
  notes?: string[]
}

export interface RedriveCommunicationsDeadLetterRequest {
  provider_binding_id?: string | null
  scheduled_for?: string | null
  tags?: string[]
  notes?: string[]
}

export interface CreateCommunicationsEmbeddedBindingRequest {
  validation_domain_id: string
  name: string
  summary: string
  status?: CommunicationsEmbeddedBindingStatus
  consumer_application_id: string
  consumer_label: string
  route_pattern: string
  default_recipient_scope?: string
  default_visibility_ttl_days?: number
  tags?: string[]
  notes?: string[]
}

export interface UpdateCommunicationsEmbeddedBindingRequest {
  name?: string
  summary?: string
  status?: CommunicationsEmbeddedBindingStatus
  consumer_application_id?: string
  consumer_label?: string
  route_pattern?: string
  default_recipient_scope?: string
  default_visibility_ttl_days?: number
  tags?: string[]
  notes?: string[]
}

export interface CreateCommunicationsNotificationFeedItemRequest {
  message_request_id: string
  embedded_binding_id?: string | null
  status?: CommunicationsNotificationFeedItemStatus
  visible_from?: string
  visible_until?: string | null
  retention_expires_at?: string | null
  tags?: string[]
  notes?: string[]
}

export interface UpdateCommunicationsNotificationFeedItemRequest {
  embedded_binding_id?: string | null
  status?: CommunicationsNotificationFeedItemStatus
  visible_from?: string
  visible_until?: string | null
  retention_expires_at?: string | null
  tags?: string[]
  notes?: string[]
}

export interface TransitionCommunicationsNotificationFeedItemRequest {
  status: CommunicationsNotificationFeedItemStatus
  note?: string | null
}

export interface CreateCommunicationsFormSubmissionRequest {
  validation_domain_id: string
  source?: CommunicationsFormSubmissionSource
  source_reference_id?: string | null
  provider_callback_id?: string | null
  inbound_provider_binding_id?: string | null
  requester_contact: string
  requester_display_name?: string | null
  subject: string
  body: string
  payload_digest: string
  submitted_at?: string
  status?: CommunicationsFormSubmissionStatus
  routing_key?: string | null
  assigned_queue?: string | null
  acknowledgement_message_request_id?: string | null
  tags?: string[]
  notes?: string[]
}

export interface UpdateCommunicationsFormSubmissionRequest {
  requester_display_name?: string | null
  subject?: string
  body?: string
  status?: CommunicationsFormSubmissionStatus
  routing_key?: string | null
  assigned_queue?: string | null
  acknowledgement_message_request_id?: string | null
  tags?: string[]
  notes?: string[]
}

export interface AcknowledgeCommunicationsFormSubmissionRequest {
  acknowledgement_message_request_id?: string | null
  note?: string | null
}

export interface RouteCommunicationsFormSubmissionRequest {
  routing_key: string
  assigned_queue?: string | null
  auto_create_follow_up?: boolean
  follow_up_priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  follow_up_due_at?: string | null
  follow_up_assigned_operator_id?: string | null
  follow_up_assigned_team?: string | null
  note?: string | null
}

export interface CloseCommunicationsFormSubmissionRequest {
  archive?: boolean
  closed_message_request_id?: string | null
  note?: string | null
}

export interface CreateCommunicationsOperatorFollowUpRequest {
  form_submission_id: string
  status?: CommunicationsOperatorFollowUpStatus
  assigned_operator_id?: string | null
  assigned_team?: string | null
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  due_at?: string | null
  closed_message_request_id?: string | null
  tags?: string[]
  notes?: string[]
}

export interface UpdateCommunicationsOperatorFollowUpRequest {
  status?: CommunicationsOperatorFollowUpStatus
  assigned_operator_id?: string | null
  assigned_team?: string | null
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  due_at?: string | null
  closed_message_request_id?: string | null
  tags?: string[]
  notes?: string[]
}

export interface CreateCommunicationsIntentBindingRequest {
  validation_domain_id: string
  name: string
  summary: string
  intent_source_subsystem: CommunicationsIntentSourceSubsystem
  intent_key?: CommunicationsIntentKey
  status?: CommunicationsIntentBindingStatus
  channel_profile_id: string
  provider_binding_id?: string | null
  template_binding_id?: string | null
  default_recipient_address?: string | null
  default_requested_locale?: string | null
  auto_dispatch?: boolean
  tags?: string[]
  notes?: string[]
}

export interface UpdateCommunicationsIntentBindingRequest {
  name?: string
  summary?: string
  intent_key?: CommunicationsIntentKey
  status?: CommunicationsIntentBindingStatus
  channel_profile_id?: string
  provider_binding_id?: string | null
  template_binding_id?: string | null
  default_recipient_address?: string | null
  default_requested_locale?: string | null
  auto_dispatch?: boolean
  tags?: string[]
  notes?: string[]
}

export interface CreateCommunicationsIntentEventRequest {
  intent_binding_id: string
  intent_reference_id: string
  recipient_address?: string | null
  requested_locale?: string | null
  subject?: string | null
  body?: string | null
  payload_digest: string
  provider_binding_id?: string | null
  template_binding_id?: string | null
  auto_dispatch?: boolean
  occurred_at?: string
  tags?: string[]
  notes?: string[]
}

export interface UpdateCommunicationsIntentEventRequest {
  status?: CommunicationsIntentEventStatus
  message_request_id?: string | null
  error_message?: string | null
  processed_at?: string | null
  notes?: string[]
  tags?: string[]
}

export interface CreateCommunicationsBackupRequest {
  validation_domain_id?: string | null
  backup_scope: string
  storage_reference: string
  status?: CommunicationsBackupStatus
  started_at?: string
  completed_at?: string | null
  notes?: string[]
}

export interface UpdateCommunicationsBackupRequest {
  validation_domain_id?: string | null
  backup_scope?: string
  storage_reference?: string
  status?: CommunicationsBackupStatus
  started_at?: string
  completed_at?: string | null
  notes?: string[]
}

export interface CreateCommunicationsRestoreDrillRequest {
  validation_domain_id?: string | null
  backup_id?: string | null
  drill_name: string
  status?: CommunicationsRestoreStatus
  started_at?: string
  completed_at?: string | null
  notes?: string[]
}

export interface UpdateCommunicationsRestoreDrillRequest {
  validation_domain_id?: string | null
  backup_id?: string | null
  drill_name?: string
  status?: CommunicationsRestoreStatus
  started_at?: string
  completed_at?: string | null
  notes?: string[]
}

export interface CreateCommunicationsExportArtifactRequest {
  validation_domain_id?: string | null
  artifact_name: string
  format?: string
  storage_reference: string
  status?: CommunicationsExportArtifactStatus
  generated_at?: string
  delivered_at?: string | null
  notes?: string[]
}

export interface UpdateCommunicationsExportArtifactRequest {
  validation_domain_id?: string | null
  artifact_name?: string
  format?: string
  storage_reference?: string
  status?: CommunicationsExportArtifactStatus
  generated_at?: string
  delivered_at?: string | null
  notes?: string[]
}

export interface CreateCommunicationsImportValidationRequest {
  validation_domain_id?: string | null
  artifact_reference: string
  status?: CommunicationsImportValidationStatus
  validated_at?: string
  findings?: string[]
  notes?: string[]
}

export interface UpdateCommunicationsImportValidationRequest {
  validation_domain_id?: string | null
  artifact_reference?: string
  status?: CommunicationsImportValidationStatus
  validated_at?: string
  findings?: string[]
  notes?: string[]
}

export interface CreateCommunicationsResilienceCheckRequest {
  validation_domain_id?: string | null
  check_name: string
  status?: CommunicationsResilienceCheckStatus
  executed_at?: string
  latency_ms?: number | null
  notes?: string[]
}

export interface UpdateCommunicationsResilienceCheckRequest {
  validation_domain_id?: string | null
  check_name?: string
  status?: CommunicationsResilienceCheckStatus
  executed_at?: string
  latency_ms?: number | null
  notes?: string[]
}

export interface CreateCommunicationsBenchmarkCheckRequest {
  validation_domain_id?: string | null
  benchmark_name: string
  status?: CommunicationsBenchmarkCheckStatus
  measured_at?: string
  score?: number | null
  notes?: string[]
}

export interface UpdateCommunicationsBenchmarkCheckRequest {
  validation_domain_id?: string | null
  benchmark_name?: string
  status?: CommunicationsBenchmarkCheckStatus
  measured_at?: string
  score?: number | null
  notes?: string[]
}

export interface CreateCommunicationsDiagnosticsRequest {
  validation_domain_id?: string | null
  diagnostic_name: string
  status?: CommunicationsDiagnosticsStatus
  observed_at?: string
  details: string
  notes?: string[]
}

export interface UpdateCommunicationsDiagnosticsRequest {
  validation_domain_id?: string | null
  diagnostic_name?: string
  status?: CommunicationsDiagnosticsStatus
  observed_at?: string
  details?: string
  notes?: string[]
}

export interface CreateCommunicationsFormalReviewRequest {
  notes?: string[]
}

export interface CreateCommunicationsAdoptionPlanRequest {
  formal_review_id?: string | null
  recommendation?: CommunicationsAdoptionRecommendation
  scope?: string
  prerequisites?: string[]
  risks?: string[]
  milestones?: string[]
  notes?: string[]
}

export interface SchedulingValidationDomainsResponse {
  generated_at: string
  validation_domains: SchedulingValidationDomain[]
  count: number
}

export interface SchedulingCalendarsResponse {
  generated_at: string
  calendars: SchedulingCalendarRecord[]
  count: number
}

export interface SchedulingPoliciesResponse {
  generated_at: string
  policies: SchedulingPolicyRecord[]
  count: number
}

export interface SchedulingAvailabilityWindowsResponse {
  generated_at: string
  availability_windows: SchedulingAvailabilityWindowRecord[]
  count: number
}

export interface SchedulingRecurrenceRulesResponse {
  generated_at: string
  recurrence_rules: SchedulingRecurrenceRuleRecord[]
  count: number
}

export interface SchedulingSlotsResponse {
  generated_at: string
  slots: SchedulingSlotRecord[]
  count: number
}

export interface SchedulingSlotGenerationResponse {
  generated_at: string
  calendar_id: string
  horizon_start_date: string
  horizon_end_date: string
  recurrence_rule_id: string | null
  generated_slot_ids: string[]
  generated_count: number
  total_slot_count: number
}

export interface SchedulingHoldsResponse {
  generated_at: string
  holds: SchedulingHoldRecord[]
  count: number
}

export interface SchedulingAppointmentsResponse {
  generated_at: string
  appointments: SchedulingAppointmentRecord[]
  count: number
}

export interface SchedulingAppointmentParticipantsResponse {
  generated_at: string
  participants: SchedulingAppointmentParticipantRecord[]
  count: number
}

export interface SchedulingWaitlistsResponse {
  generated_at: string
  waitlists: SchedulingWaitlistEntryRecord[]
  count: number
}

export interface SchedulingReschedulesResponse {
  generated_at: string
  reschedules: SchedulingRescheduleRecord[]
  count: number
}

export interface SchedulingCancellationsResponse {
  generated_at: string
  cancellations: SchedulingCancellationRecord[]
  count: number
}

export interface SchedulingConflictsResponse {
  generated_at: string
  conflicts: SchedulingConflictRecord[]
  count: number
  open_count: number
}

export interface SchedulingConflictDetectionResponse {
  generated_at: string
  created_count: number
  reopened_count: number
  resolved_count: number
  active_conflict_count: number
  conflicts: SchedulingConflictRecord[]
  count: number
}

export interface SchedulingConcurrencyGuardsResponse {
  generated_at: string
  guards: SchedulingConcurrencyGuardRecord[]
  count: number
}

export interface SchedulingConcurrencyAssertionResponse {
  generated_at: string
  resource_type: SchedulingConcurrencyResourceType
  resource_id: string
  expected_version: number
  current_version: number
  next_version: number
  matched: boolean
  outcome: SchedulingConcurrencyAssertionOutcome
  context: string | null
}

export interface SchedulingRemindersResponse {
  generated_at: string
  reminders: SchedulingReminderRecord[]
  count: number
}

export interface SchedulingNotificationsResponse {
  generated_at: string
  notifications: SchedulingNotificationRecord[]
  count: number
}

export interface SchedulingEscalationsResponse {
  generated_at: string
  escalations: SchedulingEscalationRecord[]
  count: number
  open_count: number
}

export interface SchedulingIamBindingsResponse {
  generated_at: string
  iam_bindings: SchedulingIamBindingRecord[]
  count: number
}

export interface SchedulingCommerceBindingsResponse {
  generated_at: string
  commerce_bindings: SchedulingCommerceBindingRecord[]
  count: number
}

export interface SchedulingLmsBindingsResponse {
  generated_at: string
  lms_bindings: SchedulingLmsBindingRecord[]
  count: number
}

export interface SchedulingWorkforceBindingsResponse {
  generated_at: string
  workforce_bindings: SchedulingWorkforceBindingRecord[]
  count: number
}

export interface SchedulingMissionBindingsResponse {
  generated_at: string
  mission_bindings: SchedulingMissionBindingRecord[]
  count: number
}

export interface SchedulingActivationEventsResponse {
  generated_at: string
  activation_events: SchedulingActivationEventRecord[]
  count: number
}

export interface SchedulingOperationsSummaryResponse {
  generated_at: string
  operations_status: SchedulingOperationsStatus
  backup_count: number
  completed_backup_count: number
  restore_drill_count: number
  completed_restore_drill_count: number
  export_artifact_count: number
  delivered_export_artifact_count: number
  import_validation_count: number
  passed_import_validation_count: number
  resilience_check_count: number
  passed_resilience_check_count: number
  benchmark_check_count: number
  passed_benchmark_check_count: number
  diagnostics_record_count: number
  degraded_diagnostics_record_count: number
  first_contract_ids: string[]
}

export interface SchedulingBackupsResponse {
  generated_at: string
  backups: SchedulingBackupRecord[]
  count: number
}

export interface SchedulingRestoreDrillsResponse {
  generated_at: string
  restore_drills: SchedulingRestoreDrillRecord[]
  count: number
}

export interface SchedulingExportArtifactsResponse {
  generated_at: string
  export_artifacts: SchedulingExportArtifactRecord[]
  count: number
}

export interface SchedulingImportValidationsResponse {
  generated_at: string
  import_validations: SchedulingImportValidationRecord[]
  count: number
}

export interface SchedulingResilienceChecksResponse {
  generated_at: string
  resilience_checks: SchedulingResilienceCheckRecord[]
  count: number
}

export interface SchedulingBenchmarkChecksResponse {
  generated_at: string
  benchmark_checks: SchedulingBenchmarkCheckRecord[]
  count: number
}

export interface SchedulingDiagnosticsResponse {
  generated_at: string
  diagnostics: SchedulingDiagnosticsRecord[]
  count: number
}

export interface SchedulingStandardsMatrixItem {
  id: string
  family: string
  capability: string
  status: SchedulingReviewStatus
  summary: string
}

export interface SchedulingInteroperabilityCheck {
  id: string
  integration_domain: string
  name: string
  status: SchedulingReviewStatus
  summary: string
  evidence: string
}

export interface SchedulingDifferentiationArea {
  id: string
  name: string
  status: SchedulingReviewStatus
  comparative_position: string
  summary: string
}

export interface SchedulingFormalReviewRecord {
  id: string
  created_at: string
  created_by_user_id: string
  overall_status: SchedulingReviewStatus
  market_position: SchedulingMarketPosition
  adoption_recommendation: SchedulingAdoptionRecommendation
  standalone_validation_complete: boolean
  standalone_production_ready: boolean
  communications_posture_complete: boolean
  interoperability_bindings_complete: boolean
  notes: string[]
  standards_status: SchedulingReviewStatus
  interoperability_status: SchedulingReviewStatus
  operations_status: SchedulingReviewStatus
  differentiation_status: SchedulingReviewStatus
}

export interface SchedulingAdoptionPlanRecord {
  id: string
  created_at: string
  created_by_user_id: string
  formal_review_id: string | null
  recommendation: SchedulingAdoptionRecommendation
  target_phase: 'PHASE_11_ADOPTION_PLANNING_ONLY'
  scope: string
  prerequisites: string[]
  risks: string[]
  milestones: string[]
  notes: string[]
}

export interface SchedulingReviewSummaryResponse {
  generated_at: string
  standards_matrix_count: number
  interoperability_check_count: number
  differentiation_area_count: number
  formal_review_count: number
  adoption_plan_count: number
  latest_market_position: SchedulingMarketPosition | null
  latest_adoption_recommendation: SchedulingAdoptionRecommendation | null
  latest_formal_review_status: SchedulingReviewStatus | null
  latest_review: SchedulingFormalReviewRecord | null
  latest_adoption_plan: SchedulingAdoptionPlanRecord | null
}

export interface SchedulingStandardsMatrixResponse {
  generated_at: string
  overall_status: SchedulingReviewStatus
  items: SchedulingStandardsMatrixItem[]
  count: number
}

export interface SchedulingInteroperabilityResponse {
  generated_at: string
  overall_status: SchedulingReviewStatus
  checks: SchedulingInteroperabilityCheck[]
  count: number
}

export interface SchedulingDifferentiationResponse {
  generated_at: string
  overall_status: SchedulingReviewStatus
  areas: SchedulingDifferentiationArea[]
  count: number
}

export interface SchedulingFormalReviewsResponse {
  generated_at: string
  latest_review: SchedulingFormalReviewRecord | null
  reviews: SchedulingFormalReviewRecord[]
  count: number
}

export interface SchedulingAdoptionPlansResponse {
  generated_at: string
  latest_plan: SchedulingAdoptionPlanRecord | null
  plans: SchedulingAdoptionPlanRecord[]
  count: number
}

export interface SchedulingReminderDispatchRunResponse {
  generated_at: string
  reference_time: string
  processed_count: number
  dispatched_count: number
  delivered_count: number
  created_notification_count: number
  retry_queue_count: number
  dlq_count: number
  reminder_ids: string[]
  notification_ids: string[]
}

export interface CreateSchedulingCalendarRequest {
  name: string
  summary: string
  owner_type: SchedulingOwnerType
  owner_reference_id: string
  timezone: string
  visibility?: 'PRIVATE' | 'INTERNAL' | 'SHARED' | 'PUBLIC'
  status?: SchedulingCalendarStatus
  validation_domain_id: string
  default_policy_id?: string | null
  tags?: string[]
}

export interface CreateSchedulingPolicyRequest {
  calendar_id: string
  name: string
  summary: string
  status?: SchedulingPolicyStatus
  timezone?: string
  default_duration_minutes?: number
  slot_interval_minutes?: number
  min_notice_minutes?: number
  max_advance_days?: number
  buffer_before_minutes?: number
  buffer_after_minutes?: number
  daily_capacity?: number
  overbooking_allowed?: boolean
  waitlist_allowed?: boolean
  cancellation_window_minutes?: number
  reschedule_window_minutes?: number
  no_show_grace_minutes?: number
  reminder_offsets_minutes?: number[]
}

export interface CreateSchedulingAvailabilityWindowRequest {
  calendar_id: string
  policy_id?: string | null
  name: string
  summary: string
  window_kind?: SchedulingAvailabilityWindowKind
  status?: SchedulingAvailabilityWindowStatus
  timezone?: string
  weekdays: SchedulingWeekday[]
  start_local_time: string
  end_local_time: string
  effective_start_date: string
  effective_end_date?: string | null
  capacity_override?: number | null
  notes?: string[]
}

export interface CreateSchedulingRecurrenceRuleRequest {
  calendar_id: string
  policy_id?: string | null
  availability_window_id?: string | null
  name: string
  summary: string
  status?: SchedulingRecurrenceStatus
  timezone?: string
  frequency: SchedulingRecurrenceFrequency
  interval?: number
  by_weekdays?: SchedulingWeekday[]
  by_month_days?: number[]
  start_date: string
  until_date?: string | null
  start_local_time: string
  duration_minutes?: number
  exception_dates?: string[]
  override_dates?: string[]
  notes?: string[]
}

export interface GenerateSchedulingSlotsRequest {
  calendar_id: string
  horizon_start_date: string
  horizon_end_date: string
  recurrence_rule_id?: string
  max_occurrences_per_rule?: number
}

export interface CreateSchedulingHoldRequest {
  slot_id: string
  hold_reason: string
  hold_duration_minutes?: number
  notes?: string[]
}

export interface CreateSchedulingAppointmentRequest {
  slot_id: string
  hold_id?: string | null
  service_reference_id?: string | null
  primary_participant_type: SchedulingParticipantType
  primary_participant_reference_id: string
  notes?: string[]
}

export interface UpdateSchedulingAppointmentRequest {
  status?: SchedulingAppointmentStatus
  lifecycle_stage?: SchedulingAppointmentLifecycleStage
  notes?: string[]
}

export interface CreateSchedulingAppointmentParticipantRequest {
  appointment_id: string
  participant_type: SchedulingParticipantType
  participant_reference_id: string
  role?: SchedulingAppointmentParticipantRole
  status?: SchedulingAppointmentParticipantStatus
  notes?: string[]
}

export interface CreateSchedulingWaitlistRequest {
  slot_id: string
  participant_type: SchedulingParticipantType
  participant_reference_id: string
  priority?: number
  expires_at?: string | null
  notes?: string[]
}

export interface UpdateSchedulingWaitlistRequest {
  priority?: number
  status?: SchedulingWaitlistStatus
  expires_at?: string | null
  notes?: string[]
}

export interface CreateSchedulingRescheduleRequest {
  appointment_id: string
  requested_slot_id: string
  reason: string
  notes?: string[]
}

export interface UpdateSchedulingRescheduleRequest {
  status: 'COMPLETED' | 'DECLINED'
  approved_slot_id?: string
  notes?: string[]
}

export interface CreateSchedulingCancellationRequest {
  appointment_id: string
  reason: string
  notes?: string[]
}

export interface UpdateSchedulingCancellationRequest {
  status: 'CONFIRMED' | 'REJECTED'
  notes?: string[]
}

export interface DetectSchedulingConflictsRequest {
  calendar_id?: string
  include_resolved?: boolean
}

export interface UpdateSchedulingConflictRequest {
  status?: SchedulingConflictStatus
  notes?: string[]
}

export interface AssertSchedulingConcurrencyRequest {
  resource_type: SchedulingConcurrencyResourceType
  resource_id: string
  expected_version: number
  increment_on_match?: boolean
  context?: string | null
}

export interface CreateSchedulingReminderRequest {
  appointment_id: string
  channel?: SchedulingCommunicationChannel
  scheduled_for?: string
  scheduled_offset_minutes?: number
  max_retries?: number
  notes?: string[]
}

export interface UpdateSchedulingReminderRequest {
  status?: SchedulingReminderStatus
  scheduled_for?: string
  last_error?: string | null
  notes?: string[]
}

export interface ProcessDueSchedulingRemindersRequest {
  reference_time?: string
  limit?: number
}

export interface CreateSchedulingNotificationRequest {
  reminder_id?: string
  appointment_id?: string
  channel?: SchedulingCommunicationChannel
  status?: SchedulingNotificationStatus
  template_key?: string
  subject?: string | null
  message_preview: string
  dispatch_at?: string
  max_retries?: number
  notes?: string[]
}

export interface UpdateSchedulingNotificationRequest {
  status?: SchedulingNotificationStatus
  provider_reference_id?: string | null
  next_retry_at?: string | null
  last_error?: string | null
  notes?: string[]
}

export interface CreateSchedulingEscalationRequest {
  appointment_id?: string
  reminder_id?: string
  notification_id?: string
  severity?: SchedulingEscalationSeverity
  escalation_policy_key?: string
  reason: string
  assigned_to_user_id?: string | null
  notes?: string[]
}

export interface UpdateSchedulingEscalationRequest {
  status?: SchedulingEscalationStatus
  assigned_to_user_id?: string | null
  notes?: string[]
}

export interface CreateSchedulingIamBindingRequest {
  calendar_id: string
  realm_id: string
  organization_scope_id?: string | null
  principal_scope_reference?: string | null
  role_keys?: string[]
  status?: SchedulingBindingStatus
  last_synced_at?: string | null
  notes?: string[]
}

export interface UpdateSchedulingIamBindingRequest {
  realm_id?: string
  organization_scope_id?: string | null
  principal_scope_reference?: string | null
  role_keys?: string[]
  status?: SchedulingBindingStatus
  last_synced_at?: string | null
  notes?: string[]
}

export interface CreateSchedulingCommerceBindingRequest {
  calendar_id: string
  commerce_application_binding_id: string
  offer_reference_id?: string | null
  pricing_profile_reference_id?: string | null
  cancellation_policy_reference_id?: string | null
  status?: SchedulingBindingStatus
  last_synced_at?: string | null
  notes?: string[]
}

export interface UpdateSchedulingCommerceBindingRequest {
  commerce_application_binding_id?: string
  offer_reference_id?: string | null
  pricing_profile_reference_id?: string | null
  cancellation_policy_reference_id?: string | null
  status?: SchedulingBindingStatus
  last_synced_at?: string | null
  notes?: string[]
}

export interface CreateSchedulingLmsBindingRequest {
  calendar_id: string
  lms_portal_id: string
  lms_program_id?: string | null
  lms_course_run_id?: string | null
  lms_session_template_id?: string | null
  status?: SchedulingBindingStatus
  last_synced_at?: string | null
  notes?: string[]
}

export interface UpdateSchedulingLmsBindingRequest {
  lms_portal_id?: string
  lms_program_id?: string | null
  lms_course_run_id?: string | null
  lms_session_template_id?: string | null
  status?: SchedulingBindingStatus
  last_synced_at?: string | null
  notes?: string[]
}

export interface CreateSchedulingWorkforceBindingRequest {
  calendar_id: string
  workforce_profile_type?: SchedulingWorkforceProfileType
  workforce_profile_reference_id: string
  engagement_template_reference_id?: string | null
  status?: SchedulingBindingStatus
  last_synced_at?: string | null
  notes?: string[]
}

export interface UpdateSchedulingWorkforceBindingRequest {
  workforce_profile_type?: SchedulingWorkforceProfileType
  workforce_profile_reference_id?: string
  engagement_template_reference_id?: string | null
  status?: SchedulingBindingStatus
  last_synced_at?: string | null
  notes?: string[]
}

export interface CreateSchedulingMissionBindingRequest {
  calendar_id: string
  mission_workflow_type?: SchedulingMissionWorkflowType
  mission_workflow_reference_id: string
  dispatch_policy_reference_id?: string | null
  status?: SchedulingBindingStatus
  last_synced_at?: string | null
  notes?: string[]
}

export interface UpdateSchedulingMissionBindingRequest {
  mission_workflow_type?: SchedulingMissionWorkflowType
  mission_workflow_reference_id?: string
  dispatch_policy_reference_id?: string | null
  status?: SchedulingBindingStatus
  last_synced_at?: string | null
  notes?: string[]
}

export interface CreateSchedulingActivationEventRequest {
  binding_kind: SchedulingActivationBindingKind
  binding_id: string
  calendar_id?: string
  event_type?: SchedulingActivationEventType
  status?: SchedulingActivationEventStatus
  external_reference_id?: string | null
  message?: string
  occurred_at?: string
  notes?: string[]
}

export interface UpdateSchedulingActivationEventRequest {
  event_type?: SchedulingActivationEventType
  status?: SchedulingActivationEventStatus
  external_reference_id?: string | null
  message?: string
  occurred_at?: string
  notes?: string[]
}

export interface CreateSchedulingBackupRequest {
  calendar_id?: string | null
  backup_scope: string
  storage_reference: string
  status?: SchedulingBackupStatus
  started_at?: string
  completed_at?: string | null
  notes?: string[]
}

export interface UpdateSchedulingBackupRequest {
  calendar_id?: string | null
  backup_scope?: string
  storage_reference?: string
  status?: SchedulingBackupStatus
  started_at?: string
  completed_at?: string | null
  notes?: string[]
}

export interface CreateSchedulingRestoreDrillRequest {
  calendar_id?: string | null
  backup_id?: string | null
  drill_name: string
  status?: SchedulingRestoreStatus
  started_at?: string
  completed_at?: string | null
  notes?: string[]
}

export interface UpdateSchedulingRestoreDrillRequest {
  calendar_id?: string | null
  backup_id?: string | null
  drill_name?: string
  status?: SchedulingRestoreStatus
  started_at?: string
  completed_at?: string | null
  notes?: string[]
}

export interface CreateSchedulingExportArtifactRequest {
  calendar_id?: string | null
  artifact_name: string
  format?: string
  storage_reference: string
  status?: SchedulingExportArtifactStatus
  generated_at?: string
  delivered_at?: string | null
  notes?: string[]
}

export interface UpdateSchedulingExportArtifactRequest {
  calendar_id?: string | null
  artifact_name?: string
  format?: string
  storage_reference?: string
  status?: SchedulingExportArtifactStatus
  generated_at?: string
  delivered_at?: string | null
  notes?: string[]
}

export interface CreateSchedulingImportValidationRequest {
  calendar_id?: string | null
  artifact_reference: string
  status?: SchedulingImportValidationStatus
  validated_at?: string
  findings?: string[]
  notes?: string[]
}

export interface UpdateSchedulingImportValidationRequest {
  calendar_id?: string | null
  artifact_reference?: string
  status?: SchedulingImportValidationStatus
  validated_at?: string
  findings?: string[]
  notes?: string[]
}

export interface CreateSchedulingResilienceCheckRequest {
  calendar_id?: string | null
  check_name: string
  status?: SchedulingResilienceCheckStatus
  executed_at?: string
  latency_ms?: number | null
  notes?: string[]
}

export interface UpdateSchedulingResilienceCheckRequest {
  calendar_id?: string | null
  check_name?: string
  status?: SchedulingResilienceCheckStatus
  executed_at?: string
  latency_ms?: number | null
  notes?: string[]
}

export interface CreateSchedulingBenchmarkCheckRequest {
  calendar_id?: string | null
  benchmark_name: string
  status?: SchedulingBenchmarkCheckStatus
  measured_at?: string
  score?: number | null
  notes?: string[]
}

export interface UpdateSchedulingBenchmarkCheckRequest {
  calendar_id?: string | null
  benchmark_name?: string
  status?: SchedulingBenchmarkCheckStatus
  measured_at?: string
  score?: number | null
  notes?: string[]
}

export interface CreateSchedulingDiagnosticsRequest {
  calendar_id?: string | null
  diagnostic_name: string
  status?: SchedulingDiagnosticsStatus
  observed_at?: string
  details: string
  notes?: string[]
}

export interface UpdateSchedulingDiagnosticsRequest {
  calendar_id?: string | null
  diagnostic_name?: string
  status?: SchedulingDiagnosticsStatus
  observed_at?: string
  details?: string
  notes?: string[]
}

export interface CreateSchedulingFormalReviewRequest {
  notes?: string[]
}

export interface CreateSchedulingAdoptionPlanRequest {
  formal_review_id?: string | null
  scope?: string
  prerequisites?: string[]
  risks?: string[]
  milestones?: string[]
  notes?: string[]
}

export type WorkforceRequisitionStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'POSTED' | 'FILLED' | 'CLOSED'
export type WorkforceEmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'SUBCONTRACT'
export type WorkforceWorkplaceType = 'ONSITE' | 'HYBRID' | 'REMOTE'
export type WorkforceApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN'
export type WorkforcePostingStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED'
export type WorkforcePostingChannelType =
  | 'INTERNAL_CAREERS'
  | 'PUBLIC_CAREERS'
  | 'RECRUITING_NETWORK'
  | 'CUSTOMER_SUBCONTRACT_PORTAL'
  | 'PARTNER_TALENT_EXCHANGE'
export type WorkforcePostingChannelStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED'
export type WorkforceCandidateStatus = 'NEW' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED' | 'WITHDRAWN'
export type WorkforceCandidateSource = 'DIRECT' | 'REFERRAL' | 'RECRUITER' | 'PARTNER_NETWORK' | 'CUSTOMER_REQUEST'
export type WorkforceApplicationStatus = 'ACTIVE' | 'WITHDRAWN' | 'REJECTED' | 'OFFERED' | 'HIRED'
export type WorkforceInterviewStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
export type WorkforceInterviewMode = 'VIRTUAL' | 'ONSITE' | 'PHONE' | 'ASYNC'
export type WorkforceOfferStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'EXTENDED' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN'
export type WorkforceInternalMobilityStatus = 'REQUESTED' | 'MANAGER_REVIEW' | 'HR_REVIEW' | 'APPROVED' | 'REJECTED' | 'COMPLETED'
export type WorkforceTalentPoolStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
export type WorkforceProviderCompanyStatus = 'ONBOARDING' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'
export type WorkforceProviderPersonStatus = 'ONBOARDING' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
export type WorkforceProviderQualificationType =
  | 'CERTIFICATION'
  | 'LICENSE'
  | 'INSURANCE'
  | 'BACKGROUND_CHECK'
  | 'COMPLIANCE_TRAINING'
export type WorkforceProviderQualificationStatus = 'PENDING' | 'VERIFIED' | 'EXPIRED' | 'REJECTED'
export type WorkforceEngagementStatus = 'PLANNING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
export type WorkforceSowStatus = 'DRAFT' | 'ACTIVE' | 'REVISED' | 'COMPLETED' | 'ARCHIVED'
export type WorkforceAssignmentStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
export type WorkforceMilestoneStatus = 'PLANNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED'
export type WorkforceTimesheetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID'
export type WorkforceCustomerRequestStatus = 'OPEN' | 'MATCHING' | 'DISPATCHED' | 'FULFILLED' | 'CANCELLED'
export type WorkforceProviderMatchStatus = 'CANDIDATE' | 'SHORTLISTED' | 'SELECTED' | 'REJECTED'
export type WorkforceDispatchStatus = 'PENDING' | 'DISPATCHED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED'
export type WorkforceAssignmentExceptionStatus = 'OPEN' | 'ACKNOWLEDGED' | 'ESCALATED' | 'RESOLVED'
export type WorkforceCoachingSubjectKind = 'CANDIDATE' | 'INTERNAL_EMPLOYEE' | 'PROVIDER_PERSON'
export type WorkforceCoachingProfileStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
export type WorkforceCoachingRelationshipStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED'
export type WorkforceDevelopmentPlanStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
export type WorkforceCoachingSessionStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
export type WorkforceCoachingActionStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type WorkforceCoachingParityStatus = 'ALIGNED' | 'PARTIAL' | 'MISSING' | 'DEFERRED'
export type WorkforceInteropBindingStatus = 'ACTIVE' | 'PAUSED' | 'DEGRADED' | 'ARCHIVED'
export type WorkforceLmsReadinessRequirement = 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL'
export type WorkforceSkillReferenceKind = 'CERTIFICATION' | 'TRAINING_PATHWAY' | 'READINESS_RULE' | 'EXTERNAL_CREDENTIAL'
export type WorkforceSkillReferenceSourceSystem = 'LMS' | 'READINESS' | 'EXTERNAL'
export type WorkforceSkillReferenceStatus = 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED'
export type WorkforceActivationBindingKind = 'IAM' | 'COMMERCE' | 'LMS_READINESS'
export type WorkforceActivationEventStatus = 'PENDING' | 'DISPATCHED' | 'ACKNOWLEDGED' | 'FAILED'
export type WorkforceBackupStatus = 'QUEUED' | 'COMPLETED' | 'FAILED'
export type WorkforceRestoreStatus = 'PLANNED' | 'COMPLETED' | 'FAILED'
export type WorkforceExportArtifactStatus = 'GENERATED' | 'DELIVERED' | 'FAILED'
export type WorkforceImportValidationStatus = 'PENDING' | 'PASSED' | 'FAILED'
export type WorkforceResilienceCheckStatus = 'PASSED' | 'WARN' | 'FAILED'
export type WorkforceBenchmarkCheckStatus = 'PASSED' | 'WARN' | 'FAILED'
export type WorkforceDiagnosticsStatus = 'HEALTHY' | 'DEGRADED' | 'FAILED'
export type WorkforceReviewStatus = 'PASS' | 'WARN' | 'FAIL'
export type WorkforceMarketPosition =
  | 'HEADLESS_WORKFORCE_PLUS_COACHING_DIFFERENTIATED'
  | 'HEADLESS_WORKFORCE_COMPETITIVE'
  | 'NOT_YET_COMPETITIVE'
export type WorkforceAdoptionRecommendation = 'PROCEED_TO_PHASE_11_ADOPTION_PLANNING' | 'HOLD_FOR_REMEDIATION'

export interface WorkforceValidationDomain {
  id: string
  name: string
  summary: string
  proves: string[]
  migration_blocked: boolean
}

export interface WorkforceSummaryResponse {
  generated_at: string
  phase: string
  subsystem_status: string
  migration_state: string
  next_recommended_phase: string
  validation_domain_count: number
  requisition_count: number
  approved_requisition_count: number
  posting_count: number
  active_posting_count: number
  approval_count: number
  posting_channel_count: number
  candidate_count: number
  active_candidate_count: number
  application_count: number
  active_application_count: number
  interview_count: number
  offer_count: number
  active_offer_count: number
  internal_mobility_count: number
  open_internal_mobility_count: number
  talent_pool_count: number
  provider_company_count: number
  active_provider_company_count: number
  provider_person_count: number
  active_provider_person_count: number
  provider_qualification_count: number
  verified_provider_qualification_count: number
  engagement_count: number
  active_engagement_count: number
  sow_count: number
  active_sow_count: number
  assignment_count: number
  active_assignment_count: number
  milestone_count: number
  accepted_milestone_count: number
  timesheet_count: number
  approved_timesheet_count: number
  customer_request_count: number
  open_customer_request_count: number
  provider_match_count: number
  selected_provider_match_count: number
  dispatch_count: number
  active_dispatch_count: number
  assignment_exception_count: number
  open_assignment_exception_count: number
  coaching_profile_count: number
  active_coaching_profile_count: number
  coaching_relationship_count: number
  active_coaching_relationship_count: number
  development_plan_count: number
  active_development_plan_count: number
  coaching_session_count: number
  completed_coaching_session_count: number
  coaching_action_count: number
  open_coaching_action_count: number
  coaching_parity_mapping_count: number
  aligned_coaching_parity_mapping_count: number
  iam_binding_count: number
  active_iam_binding_count: number
  commerce_binding_count: number
  active_commerce_binding_count: number
  lms_readiness_binding_count: number
  active_lms_readiness_binding_count: number
  skill_reference_count: number
  active_skill_reference_count: number
  activation_event_count: number
  pending_activation_event_count: number
  backup_count: number
  completed_backup_count: number
  restore_drill_count: number
  completed_restore_drill_count: number
  export_artifact_count: number
  delivered_export_artifact_count: number
  import_validation_count: number
  passed_import_validation_count: number
  resilience_check_count: number
  passed_resilience_check_count: number
  benchmark_check_count: number
  passed_benchmark_check_count: number
  diagnostics_record_count: number
  degraded_diagnostics_record_count: number
  formal_review_count: number
  adoption_plan_count: number
  latest_market_position: WorkforceMarketPosition | null
  latest_adoption_recommendation: WorkforceAdoptionRecommendation | null
  latest_formal_review_status: WorkforceReviewStatus | null
  first_contract_ids: string[]
}

export interface WorkforceRequisitionRecord {
  id: string
  title: string
  summary: string
  department: string
  employment_type: WorkforceEmploymentType
  workplace_type: WorkforceWorkplaceType
  location: string
  headcount: number
  status: WorkforceRequisitionStatus
  validation_domain_id: string
  hiring_manager_user_id: string
  target_start_date: string | null
  skills: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceApprovalRecord {
  id: string
  requisition_id: string
  stage: string
  approver_user_id: string
  status: WorkforceApprovalStatus
  decision_notes: string | null
  decided_at: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforcePostingRecord {
  id: string
  requisition_id: string
  title: string
  summary: string
  status: WorkforcePostingStatus
  internal_visible: boolean
  public_visible: boolean
  third_party_visible: boolean
  compensation_summary: string | null
  posted_at: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforcePostingChannelRecord {
  id: string
  posting_id: string
  channel_type: WorkforcePostingChannelType
  channel_name: string
  external_reference: string | null
  status: WorkforcePostingChannelStatus
  last_synced_at: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceCandidateRecord {
  id: string
  full_name: string
  email: string
  phone: string | null
  source: WorkforceCandidateSource
  status: WorkforceCandidateStatus
  skills: string[]
  coaching_profile_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceApplicationRecord {
  id: string
  candidate_id: string
  requisition_id: string
  status: WorkforceApplicationStatus
  stage: string
  score: number | null
  submitted_at: string
  updated_at: string
  notes: string | null
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceInterviewRecord {
  id: string
  application_id: string
  interviewer_user_id: string
  scheduled_at: string
  mode: WorkforceInterviewMode
  status: WorkforceInterviewStatus
  feedback_summary: string | null
  score: number | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceOfferRecord {
  id: string
  application_id: string
  status: WorkforceOfferStatus
  compensation_summary: string
  employment_terms: string
  expires_at: string | null
  decision_at: string | null
  decision_notes: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceInternalMobilityRecord {
  id: string
  employee_user_id: string
  source_requisition_id: string | null
  target_requisition_id: string
  target_application_id: string | null
  status: WorkforceInternalMobilityStatus
  requested_at: string
  approved_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceTalentPoolRecord {
  id: string
  name: string
  summary: string
  status: WorkforceTalentPoolStatus
  candidate_ids: string[]
  focus_skills: string[]
  owner_user_id: string
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceProviderCompanyRecord {
  id: string
  name: string
  legal_name: string
  onboarding_stage: string
  status: WorkforceProviderCompanyStatus
  service_regions: string[]
  capability_tags: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceProviderPersonRecord {
  id: string
  provider_company_id: string
  full_name: string
  email: string
  role_title: string
  status: WorkforceProviderPersonStatus
  skills: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceProviderQualificationRecord {
  id: string
  provider_company_id: string
  provider_person_id: string | null
  qualification_type: WorkforceProviderQualificationType
  status: WorkforceProviderQualificationStatus
  reference_id: string
  issued_at: string | null
  expires_at: string | null
  verified_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceEngagementRecord {
  id: string
  provider_company_id: string
  customer_account_name: string
  title: string
  summary: string
  status: WorkforceEngagementStatus
  start_at: string | null
  target_end_at: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceSowRecord {
  id: string
  engagement_id: string
  version: string
  status: WorkforceSowStatus
  scope_summary: string
  currency: string
  not_to_exceed_amount_minor: number
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceAssignmentRecord {
  id: string
  engagement_id: string
  sow_id: string | null
  provider_person_id: string
  role_title: string
  status: WorkforceAssignmentStatus
  allocation_percent: number
  start_at: string | null
  end_at: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceMilestoneRecord {
  id: string
  engagement_id: string
  sow_id: string | null
  name: string
  due_at: string | null
  status: WorkforceMilestoneStatus
  acceptance_notes: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceTimesheetRecord {
  id: string
  assignment_id: string
  period_start: string
  period_end: string
  hours: number
  status: WorkforceTimesheetStatus
  submitted_at: string | null
  approved_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceCustomerRequestRecord {
  id: string
  customer_account_name: string
  title: string
  summary: string
  service_region: string
  required_capability_tags: string[]
  requested_start_at: string | null
  status: WorkforceCustomerRequestStatus
  linked_engagement_id: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceProviderMatchRecord {
  id: string
  customer_request_id: string
  provider_company_id: string
  provider_person_id: string | null
  score: number
  rationale: string | null
  status: WorkforceProviderMatchStatus
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceDispatchRecord {
  id: string
  customer_request_id: string
  provider_match_id: string | null
  assignment_id: string | null
  status: WorkforceDispatchStatus
  dispatched_at: string | null
  response_due_at: string | null
  response_notes: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceAssignmentExceptionRecord {
  id: string
  assignment_id: string
  dispatch_id: string | null
  exception_category: string
  summary: string
  status: WorkforceAssignmentExceptionStatus
  reported_at: string
  resolved_at: string | null
  resolution_notes: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceCoachingProfileRecord {
  id: string
  subject_kind: WorkforceCoachingSubjectKind
  candidate_id: string | null
  provider_person_id: string | null
  internal_employee_user_id: string | null
  focus_areas: string[]
  status: WorkforceCoachingProfileStatus
  crew_reference_id: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceCoachingRelationshipRecord {
  id: string
  coaching_profile_id: string
  coach_user_id: string
  coachee_user_id: string
  cadence: string
  status: WorkforceCoachingRelationshipStatus
  started_at: string
  ended_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceDevelopmentPlanRecord {
  id: string
  coaching_profile_id: string
  title: string
  summary: string
  goal_summary: string
  status: WorkforceDevelopmentPlanStatus
  target_completion_at: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceCoachingSessionRecord {
  id: string
  coaching_relationship_id: string
  development_plan_id: string | null
  scheduled_at: string
  status: WorkforceCoachingSessionStatus
  feedback_summary: string | null
  outcome_score: number | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceCoachingActionRecord {
  id: string
  coaching_profile_id: string
  coaching_session_id: string | null
  development_plan_id: string | null
  title: string
  owner_user_id: string
  status: WorkforceCoachingActionStatus
  due_at: string | null
  completed_at: string | null
  outcome_notes: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceCoachingParityRecord {
  id: string
  parity_area: string
  platform_capability: string
  crew_reference: string
  parity_status: WorkforceCoachingParityStatus
  evidence_links: string[]
  last_reviewed_at: string
  notes: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceIamBindingRecord {
  id: string
  binding_name: string
  realm_id: string
  role_keys: string[]
  claim_mappings: string[]
  status: WorkforceInteropBindingStatus
  last_synced_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceCommerceBindingRecord {
  id: string
  binding_name: string
  commerce_account_id: string
  payout_profile_id: string | null
  billing_schedule_id: string | null
  settlement_mode: string
  status: WorkforceInteropBindingStatus
  last_synced_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceLmsReadinessBindingRecord {
  id: string
  binding_name: string
  lms_portal_id: string
  readiness_rule_id: string
  requirement: WorkforceLmsReadinessRequirement
  status: WorkforceInteropBindingStatus
  last_synced_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceSkillReferenceRecord {
  id: string
  reference_kind: WorkforceSkillReferenceKind
  reference_id: string
  source_system: WorkforceSkillReferenceSourceSystem
  title: string
  status: WorkforceSkillReferenceStatus
  notes: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceActivationEventRecord {
  id: string
  event_name: string
  source_binding_kind: WorkforceActivationBindingKind
  source_binding_id: string
  status: WorkforceActivationEventStatus
  occurred_at: string
  correlation_id: string | null
  payload_reference: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceBackupRecord {
  id: string
  backup_scope: string
  storage_reference: string
  status: WorkforceBackupStatus
  started_at: string
  completed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceRestoreDrillRecord {
  id: string
  backup_id: string | null
  drill_name: string
  status: WorkforceRestoreStatus
  started_at: string
  completed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceExportArtifactRecord {
  id: string
  artifact_name: string
  format: string
  storage_reference: string
  status: WorkforceExportArtifactStatus
  generated_at: string
  delivered_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceImportValidationRecord {
  id: string
  artifact_reference: string
  status: WorkforceImportValidationStatus
  validated_at: string
  findings: string[]
  notes: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceResilienceCheckRecord {
  id: string
  check_name: string
  status: WorkforceResilienceCheckStatus
  executed_at: string
  latency_ms: number | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceBenchmarkCheckRecord {
  id: string
  benchmark_name: string
  status: WorkforceBenchmarkCheckStatus
  measured_at: string
  score: number | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceDiagnosticsRecord {
  id: string
  diagnostic_name: string
  status: WorkforceDiagnosticsStatus
  observed_at: string
  details: string
  notes: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface WorkforceStandardsMatrixItem {
  id: string
  family: string
  capability: string
  status: WorkforceReviewStatus
  summary: string
}

export interface WorkforceInteroperabilityCheck {
  id: string
  integration_domain: string
  name: string
  status: WorkforceReviewStatus
  summary: string
  evidence: string
}

export interface WorkforceDifferentiationArea {
  id: string
  name: string
  status: WorkforceReviewStatus
  comparative_position: string
  summary: string
}

export interface WorkforceFormalReviewRecord {
  id: string
  created_at: string
  created_by_user_id: string
  overall_status: WorkforceReviewStatus
  market_position: WorkforceMarketPosition
  adoption_recommendation: WorkforceAdoptionRecommendation
  standalone_validation_complete: boolean
  standalone_production_ready: boolean
  coaching_parity_complete: boolean
  interoperability_bindings_complete: boolean
  notes: string[]
  standards_status: WorkforceReviewStatus
  interoperability_status: WorkforceReviewStatus
  operations_status: WorkforceReviewStatus
  differentiation_status: WorkforceReviewStatus
}

export interface WorkforceAdoptionPlanRecord {
  id: string
  created_at: string
  created_by_user_id: string
  formal_review_id: string | null
  recommendation: WorkforceAdoptionRecommendation
  target_phase: 'PHASE_11_ADOPTION_PLANNING_ONLY'
  scope: string
  prerequisites: string[]
  risks: string[]
  milestones: string[]
  notes: string[]
}

export interface WorkforceReviewSummaryResponse {
  generated_at: string
  standards_matrix_count: number
  interoperability_check_count: number
  differentiation_area_count: number
  formal_review_count: number
  adoption_plan_count: number
  latest_market_position: WorkforceMarketPosition | null
  latest_adoption_recommendation: WorkforceAdoptionRecommendation | null
  latest_formal_review_status: WorkforceReviewStatus | null
  latest_review: WorkforceFormalReviewRecord | null
  latest_adoption_plan: WorkforceAdoptionPlanRecord | null
}

export interface WorkforceStandardsMatrixResponse {
  generated_at: string
  overall_status: WorkforceReviewStatus
  items: WorkforceStandardsMatrixItem[]
  count: number
}

export interface WorkforceInteroperabilityResponse {
  generated_at: string
  overall_status: WorkforceReviewStatus
  checks: WorkforceInteroperabilityCheck[]
  count: number
}

export interface WorkforceDifferentiationResponse {
  generated_at: string
  overall_status: WorkforceReviewStatus
  areas: WorkforceDifferentiationArea[]
  count: number
}

export interface WorkforceFormalReviewsResponse {
  generated_at: string
  latest_review: WorkforceFormalReviewRecord | null
  reviews: WorkforceFormalReviewRecord[]
  count: number
}

export interface WorkforceAdoptionPlansResponse {
  generated_at: string
  latest_plan: WorkforceAdoptionPlanRecord | null
  plans: WorkforceAdoptionPlanRecord[]
  count: number
}

export interface WorkforceValidationDomainsResponse {
  generated_at: string
  validation_domains: WorkforceValidationDomain[]
  count: number
}

export interface WorkforceRequisitionsResponse {
  generated_at: string
  requisitions: WorkforceRequisitionRecord[]
  count: number
}

export interface WorkforceApprovalsResponse {
  generated_at: string
  approvals: WorkforceApprovalRecord[]
  count: number
}

export interface WorkforcePostingsResponse {
  generated_at: string
  postings: WorkforcePostingRecord[]
  count: number
}

export interface WorkforcePostingChannelsResponse {
  generated_at: string
  posting_channels: WorkforcePostingChannelRecord[]
  count: number
}

export interface WorkforceCandidatesResponse {
  generated_at: string
  candidates: WorkforceCandidateRecord[]
  count: number
}

export interface WorkforceApplicationsResponse {
  generated_at: string
  applications: WorkforceApplicationRecord[]
  count: number
}

export interface WorkforceInterviewsResponse {
  generated_at: string
  interviews: WorkforceInterviewRecord[]
  count: number
}

export interface WorkforceOffersResponse {
  generated_at: string
  offers: WorkforceOfferRecord[]
  count: number
}

export interface WorkforceInternalMobilityResponse {
  generated_at: string
  internal_mobility_cases: WorkforceInternalMobilityRecord[]
  count: number
}

export interface WorkforceTalentPoolsResponse {
  generated_at: string
  talent_pools: WorkforceTalentPoolRecord[]
  count: number
}

export interface WorkforceProviderCompaniesResponse {
  generated_at: string
  provider_companies: WorkforceProviderCompanyRecord[]
  count: number
}

export interface WorkforceProviderPeopleResponse {
  generated_at: string
  provider_people: WorkforceProviderPersonRecord[]
  count: number
}

export interface WorkforceProviderQualificationsResponse {
  generated_at: string
  provider_qualifications: WorkforceProviderQualificationRecord[]
  count: number
}

export interface WorkforceEngagementsResponse {
  generated_at: string
  engagements: WorkforceEngagementRecord[]
  count: number
}

export interface WorkforceSowsResponse {
  generated_at: string
  sows: WorkforceSowRecord[]
  count: number
}

export interface WorkforceAssignmentsResponse {
  generated_at: string
  assignments: WorkforceAssignmentRecord[]
  count: number
}

export interface WorkforceMilestonesResponse {
  generated_at: string
  milestones: WorkforceMilestoneRecord[]
  count: number
}

export interface WorkforceTimesheetsResponse {
  generated_at: string
  timesheets: WorkforceTimesheetRecord[]
  count: number
}

export interface WorkforceCustomerRequestsResponse {
  generated_at: string
  customer_requests: WorkforceCustomerRequestRecord[]
  count: number
}

export interface WorkforceProviderMatchesResponse {
  generated_at: string
  provider_matches: WorkforceProviderMatchRecord[]
  count: number
}

export interface WorkforceDispatchResponse {
  generated_at: string
  dispatches: WorkforceDispatchRecord[]
  count: number
}

export interface WorkforceAssignmentExceptionsResponse {
  generated_at: string
  assignment_exceptions: WorkforceAssignmentExceptionRecord[]
  count: number
}

export interface WorkforceCoachingProfilesResponse {
  generated_at: string
  coaching_profiles: WorkforceCoachingProfileRecord[]
  count: number
}

export interface WorkforceCoachingRelationshipsResponse {
  generated_at: string
  coaching_relationships: WorkforceCoachingRelationshipRecord[]
  count: number
}

export interface WorkforceDevelopmentPlansResponse {
  generated_at: string
  development_plans: WorkforceDevelopmentPlanRecord[]
  count: number
}

export interface WorkforceCoachingSessionsResponse {
  generated_at: string
  coaching_sessions: WorkforceCoachingSessionRecord[]
  count: number
}

export interface WorkforceCoachingActionsResponse {
  generated_at: string
  coaching_actions: WorkforceCoachingActionRecord[]
  count: number
}

export interface WorkforceCoachingParityResponse {
  generated_at: string
  parity_mappings: WorkforceCoachingParityRecord[]
  count: number
}

export interface WorkforceIamBindingsResponse {
  generated_at: string
  iam_bindings: WorkforceIamBindingRecord[]
  count: number
}

export interface WorkforceCommerceBindingsResponse {
  generated_at: string
  commerce_bindings: WorkforceCommerceBindingRecord[]
  count: number
}

export interface WorkforceLmsReadinessBindingsResponse {
  generated_at: string
  lms_readiness_bindings: WorkforceLmsReadinessBindingRecord[]
  count: number
}

export interface WorkforceSkillReferencesResponse {
  generated_at: string
  skill_references: WorkforceSkillReferenceRecord[]
  count: number
}

export interface WorkforceActivationEventsResponse {
  generated_at: string
  activation_events: WorkforceActivationEventRecord[]
  count: number
}

export interface WorkforceBackupsResponse {
  generated_at: string
  backups: WorkforceBackupRecord[]
  count: number
}

export interface WorkforceRestoreDrillsResponse {
  generated_at: string
  restore_drills: WorkforceRestoreDrillRecord[]
  count: number
}

export interface WorkforceExportArtifactsResponse {
  generated_at: string
  export_artifacts: WorkforceExportArtifactRecord[]
  count: number
}

export interface WorkforceImportValidationsResponse {
  generated_at: string
  import_validations: WorkforceImportValidationRecord[]
  count: number
}

export interface WorkforceResilienceChecksResponse {
  generated_at: string
  resilience_checks: WorkforceResilienceCheckRecord[]
  count: number
}

export interface WorkforceBenchmarkChecksResponse {
  generated_at: string
  benchmark_checks: WorkforceBenchmarkCheckRecord[]
  count: number
}

export interface WorkforceDiagnosticsResponse {
  generated_at: string
  diagnostics: WorkforceDiagnosticsRecord[]
  count: number
}

export interface CreateWorkforceRequisitionRequest {
  title: string
  summary: string
  department: string
  employment_type?: WorkforceEmploymentType
  workplace_type?: WorkforceWorkplaceType
  location: string
  headcount?: number
  status?: WorkforceRequisitionStatus
  validation_domain_id: string
  hiring_manager_user_id: string
  target_start_date?: string | null
  skills?: string[]
}

export interface UpdateWorkforceRequisitionRequest {
  title?: string
  summary?: string
  department?: string
  employment_type?: WorkforceEmploymentType
  workplace_type?: WorkforceWorkplaceType
  location?: string
  headcount?: number
  status?: WorkforceRequisitionStatus
  validation_domain_id?: string
  hiring_manager_user_id?: string
  target_start_date?: string | null
  skills?: string[]
}

export interface CreateWorkforceApprovalRequest {
  requisition_id: string
  stage: string
  approver_user_id: string
  status?: WorkforceApprovalStatus
  decision_notes?: string | null
  decided_at?: string | null
}

export interface UpdateWorkforceApprovalRequest {
  stage?: string
  approver_user_id?: string
  status?: WorkforceApprovalStatus
  decision_notes?: string | null
  decided_at?: string | null
}

export interface CreateWorkforcePostingRequest {
  requisition_id: string
  title?: string
  summary?: string
  status?: WorkforcePostingStatus
  internal_visible?: boolean
  public_visible?: boolean
  third_party_visible?: boolean
  compensation_summary?: string | null
  posted_at?: string | null
  closed_at?: string | null
}

export interface UpdateWorkforcePostingRequest {
  title?: string
  summary?: string
  status?: WorkforcePostingStatus
  internal_visible?: boolean
  public_visible?: boolean
  third_party_visible?: boolean
  compensation_summary?: string | null
  posted_at?: string | null
  closed_at?: string | null
}

export interface CreateWorkforcePostingChannelRequest {
  posting_id: string
  channel_type: WorkforcePostingChannelType
  channel_name: string
  external_reference?: string | null
  status?: WorkforcePostingChannelStatus
  last_synced_at?: string | null
}

export interface UpdateWorkforcePostingChannelRequest {
  channel_type?: WorkforcePostingChannelType
  channel_name?: string
  external_reference?: string | null
  status?: WorkforcePostingChannelStatus
  last_synced_at?: string | null
}

export interface CreateWorkforceCandidateRequest {
  full_name: string
  email: string
  phone?: string | null
  source?: WorkforceCandidateSource
  status?: WorkforceCandidateStatus
  skills?: string[]
  coaching_profile_id?: string | null
  notes?: string | null
}

export interface UpdateWorkforceCandidateRequest {
  full_name?: string
  email?: string
  phone?: string | null
  source?: WorkforceCandidateSource
  status?: WorkforceCandidateStatus
  skills?: string[]
  coaching_profile_id?: string | null
  notes?: string | null
}

export interface CreateWorkforceApplicationRequest {
  candidate_id: string
  requisition_id: string
  status?: WorkforceApplicationStatus
  stage?: string
  score?: number | null
  submitted_at?: string
  notes?: string | null
}

export interface UpdateWorkforceApplicationRequest {
  status?: WorkforceApplicationStatus
  stage?: string
  score?: number | null
  notes?: string | null
}

export interface CreateWorkforceInterviewRequest {
  application_id: string
  interviewer_user_id: string
  scheduled_at: string
  mode?: WorkforceInterviewMode
  status?: WorkforceInterviewStatus
  feedback_summary?: string | null
  score?: number | null
}

export interface UpdateWorkforceInterviewRequest {
  interviewer_user_id?: string
  scheduled_at?: string
  mode?: WorkforceInterviewMode
  status?: WorkforceInterviewStatus
  feedback_summary?: string | null
  score?: number | null
}

export interface CreateWorkforceOfferRequest {
  application_id: string
  status?: WorkforceOfferStatus
  compensation_summary: string
  employment_terms: string
  expires_at?: string | null
  decision_at?: string | null
  decision_notes?: string | null
}

export interface UpdateWorkforceOfferRequest {
  status?: WorkforceOfferStatus
  compensation_summary?: string
  employment_terms?: string
  expires_at?: string | null
  decision_at?: string | null
  decision_notes?: string | null
}

export interface CreateWorkforceInternalMobilityRequest {
  employee_user_id: string
  source_requisition_id?: string | null
  target_requisition_id: string
  target_application_id?: string | null
  status?: WorkforceInternalMobilityStatus
  requested_at?: string
  approved_at?: string | null
  notes?: string | null
}

export interface UpdateWorkforceInternalMobilityRequest {
  source_requisition_id?: string | null
  target_requisition_id?: string
  target_application_id?: string | null
  status?: WorkforceInternalMobilityStatus
  approved_at?: string | null
  notes?: string | null
}

export interface CreateWorkforceTalentPoolRequest {
  name: string
  summary: string
  status?: WorkforceTalentPoolStatus
  candidate_ids?: string[]
  focus_skills?: string[]
  owner_user_id: string
}

export interface UpdateWorkforceTalentPoolRequest {
  name?: string
  summary?: string
  status?: WorkforceTalentPoolStatus
  candidate_ids?: string[]
  focus_skills?: string[]
  owner_user_id?: string
}

export interface CreateWorkforceProviderCompanyRequest {
  name: string
  legal_name: string
  onboarding_stage?: string
  status?: WorkforceProviderCompanyStatus
  service_regions?: string[]
  capability_tags?: string[]
}

export interface UpdateWorkforceProviderCompanyRequest {
  name?: string
  legal_name?: string
  onboarding_stage?: string
  status?: WorkforceProviderCompanyStatus
  service_regions?: string[]
  capability_tags?: string[]
}

export interface CreateWorkforceProviderPersonRequest {
  provider_company_id: string
  full_name: string
  email: string
  role_title: string
  status?: WorkforceProviderPersonStatus
  skills?: string[]
}

export interface UpdateWorkforceProviderPersonRequest {
  full_name?: string
  email?: string
  role_title?: string
  status?: WorkforceProviderPersonStatus
  skills?: string[]
}

export interface CreateWorkforceProviderQualificationRequest {
  provider_company_id: string
  provider_person_id?: string | null
  qualification_type: WorkforceProviderQualificationType
  status?: WorkforceProviderQualificationStatus
  reference_id: string
  issued_at?: string | null
  expires_at?: string | null
  verified_at?: string | null
  notes?: string | null
}

export interface UpdateWorkforceProviderQualificationRequest {
  provider_person_id?: string | null
  qualification_type?: WorkforceProviderQualificationType
  status?: WorkforceProviderQualificationStatus
  reference_id?: string
  issued_at?: string | null
  expires_at?: string | null
  verified_at?: string | null
  notes?: string | null
}

export interface CreateWorkforceEngagementRequest {
  provider_company_id: string
  customer_account_name: string
  title: string
  summary: string
  status?: WorkforceEngagementStatus
  start_at?: string | null
  target_end_at?: string | null
  closed_at?: string | null
}

export interface UpdateWorkforceEngagementRequest {
  customer_account_name?: string
  title?: string
  summary?: string
  status?: WorkforceEngagementStatus
  start_at?: string | null
  target_end_at?: string | null
  closed_at?: string | null
}

export interface CreateWorkforceSowRequest {
  engagement_id: string
  version?: string
  status?: WorkforceSowStatus
  scope_summary: string
  currency?: string
  not_to_exceed_amount_minor: number
}

export interface UpdateWorkforceSowRequest {
  version?: string
  status?: WorkforceSowStatus
  scope_summary?: string
  currency?: string
  not_to_exceed_amount_minor?: number
}

export interface CreateWorkforceAssignmentRequest {
  engagement_id: string
  sow_id?: string | null
  provider_person_id: string
  role_title: string
  status?: WorkforceAssignmentStatus
  allocation_percent?: number
  start_at?: string | null
  end_at?: string | null
}

export interface UpdateWorkforceAssignmentRequest {
  sow_id?: string | null
  provider_person_id?: string
  role_title?: string
  status?: WorkforceAssignmentStatus
  allocation_percent?: number
  start_at?: string | null
  end_at?: string | null
}

export interface CreateWorkforceMilestoneRequest {
  engagement_id: string
  sow_id?: string | null
  name: string
  due_at?: string | null
  status?: WorkforceMilestoneStatus
  acceptance_notes?: string | null
  completed_at?: string | null
}

export interface UpdateWorkforceMilestoneRequest {
  sow_id?: string | null
  name?: string
  due_at?: string | null
  status?: WorkforceMilestoneStatus
  acceptance_notes?: string | null
  completed_at?: string | null
}

export interface CreateWorkforceTimesheetRequest {
  assignment_id: string
  period_start: string
  period_end: string
  hours: number
  status?: WorkforceTimesheetStatus
  submitted_at?: string | null
  approved_at?: string | null
  notes?: string | null
}

export interface UpdateWorkforceTimesheetRequest {
  period_start?: string
  period_end?: string
  hours?: number
  status?: WorkforceTimesheetStatus
  submitted_at?: string | null
  approved_at?: string | null
  notes?: string | null
}

export interface CreateWorkforceCustomerRequestRequest {
  customer_account_name: string
  title: string
  summary: string
  service_region: string
  required_capability_tags?: string[]
  requested_start_at?: string | null
  status?: WorkforceCustomerRequestStatus
  linked_engagement_id?: string | null
}

export interface UpdateWorkforceCustomerRequestRequest {
  customer_account_name?: string
  title?: string
  summary?: string
  service_region?: string
  required_capability_tags?: string[]
  requested_start_at?: string | null
  status?: WorkforceCustomerRequestStatus
  linked_engagement_id?: string | null
}

export interface CreateWorkforceProviderMatchRequest {
  customer_request_id: string
  provider_company_id: string
  provider_person_id?: string | null
  score?: number
  rationale?: string | null
  status?: WorkforceProviderMatchStatus
}

export interface UpdateWorkforceProviderMatchRequest {
  provider_company_id?: string
  provider_person_id?: string | null
  score?: number
  rationale?: string | null
  status?: WorkforceProviderMatchStatus
}

export interface CreateWorkforceDispatchRequest {
  customer_request_id: string
  provider_match_id?: string | null
  assignment_id?: string | null
  status?: WorkforceDispatchStatus
  dispatched_at?: string | null
  response_due_at?: string | null
  response_notes?: string | null
}

export interface UpdateWorkforceDispatchRequest {
  provider_match_id?: string | null
  assignment_id?: string | null
  status?: WorkforceDispatchStatus
  dispatched_at?: string | null
  response_due_at?: string | null
  response_notes?: string | null
}

export interface CreateWorkforceAssignmentExceptionRequest {
  assignment_id: string
  dispatch_id?: string | null
  exception_category: string
  summary: string
  status?: WorkforceAssignmentExceptionStatus
  reported_at?: string
  resolved_at?: string | null
  resolution_notes?: string | null
}

export interface UpdateWorkforceAssignmentExceptionRequest {
  assignment_id?: string
  dispatch_id?: string | null
  exception_category?: string
  summary?: string
  status?: WorkforceAssignmentExceptionStatus
  reported_at?: string
  resolved_at?: string | null
  resolution_notes?: string | null
}

export interface CreateWorkforceCoachingProfileRequest {
  subject_kind: WorkforceCoachingSubjectKind
  candidate_id?: string | null
  provider_person_id?: string | null
  internal_employee_user_id?: string | null
  focus_areas?: string[]
  status?: WorkforceCoachingProfileStatus
  crew_reference_id?: string | null
}

export interface UpdateWorkforceCoachingProfileRequest {
  candidate_id?: string | null
  provider_person_id?: string | null
  internal_employee_user_id?: string | null
  focus_areas?: string[]
  status?: WorkforceCoachingProfileStatus
  crew_reference_id?: string | null
}

export interface CreateWorkforceCoachingRelationshipRequest {
  coaching_profile_id: string
  coach_user_id: string
  coachee_user_id: string
  cadence?: string
  status?: WorkforceCoachingRelationshipStatus
  started_at?: string
  ended_at?: string | null
  notes?: string | null
}

export interface UpdateWorkforceCoachingRelationshipRequest {
  coach_user_id?: string
  coachee_user_id?: string
  cadence?: string
  status?: WorkforceCoachingRelationshipStatus
  started_at?: string
  ended_at?: string | null
  notes?: string | null
}

export interface CreateWorkforceDevelopmentPlanRequest {
  coaching_profile_id: string
  title: string
  summary: string
  goal_summary: string
  status?: WorkforceDevelopmentPlanStatus
  target_completion_at?: string | null
}

export interface UpdateWorkforceDevelopmentPlanRequest {
  title?: string
  summary?: string
  goal_summary?: string
  status?: WorkforceDevelopmentPlanStatus
  target_completion_at?: string | null
}

export interface CreateWorkforceCoachingSessionRequest {
  coaching_relationship_id: string
  development_plan_id?: string | null
  scheduled_at: string
  status?: WorkforceCoachingSessionStatus
  feedback_summary?: string | null
  outcome_score?: number | null
}

export interface UpdateWorkforceCoachingSessionRequest {
  development_plan_id?: string | null
  scheduled_at?: string
  status?: WorkforceCoachingSessionStatus
  feedback_summary?: string | null
  outcome_score?: number | null
}

export interface CreateWorkforceCoachingActionRequest {
  coaching_profile_id: string
  coaching_session_id?: string | null
  development_plan_id?: string | null
  title: string
  owner_user_id: string
  status?: WorkforceCoachingActionStatus
  due_at?: string | null
  completed_at?: string | null
  outcome_notes?: string | null
}

export interface UpdateWorkforceCoachingActionRequest {
  coaching_session_id?: string | null
  development_plan_id?: string | null
  title?: string
  owner_user_id?: string
  status?: WorkforceCoachingActionStatus
  due_at?: string | null
  completed_at?: string | null
  outcome_notes?: string | null
}

export interface CreateWorkforceCoachingParityRequest {
  parity_area: string
  platform_capability: string
  crew_reference: string
  parity_status?: WorkforceCoachingParityStatus
  evidence_links?: string[]
  last_reviewed_at?: string
  notes?: string | null
}

export interface UpdateWorkforceCoachingParityRequest {
  parity_area?: string
  platform_capability?: string
  crew_reference?: string
  parity_status?: WorkforceCoachingParityStatus
  evidence_links?: string[]
  last_reviewed_at?: string
  notes?: string | null
}

export interface CreateWorkforceIamBindingRequest {
  binding_name: string
  realm_id: string
  role_keys?: string[]
  claim_mappings?: string[]
  status?: WorkforceInteropBindingStatus
  last_synced_at?: string | null
  notes?: string | null
}

export interface UpdateWorkforceIamBindingRequest {
  binding_name?: string
  realm_id?: string
  role_keys?: string[]
  claim_mappings?: string[]
  status?: WorkforceInteropBindingStatus
  last_synced_at?: string | null
  notes?: string | null
}

export interface CreateWorkforceCommerceBindingRequest {
  binding_name: string
  commerce_account_id: string
  payout_profile_id?: string | null
  billing_schedule_id?: string | null
  settlement_mode?: string
  status?: WorkforceInteropBindingStatus
  last_synced_at?: string | null
  notes?: string | null
}

export interface UpdateWorkforceCommerceBindingRequest {
  binding_name?: string
  commerce_account_id?: string
  payout_profile_id?: string | null
  billing_schedule_id?: string | null
  settlement_mode?: string
  status?: WorkforceInteropBindingStatus
  last_synced_at?: string | null
  notes?: string | null
}

export interface CreateWorkforceLmsReadinessBindingRequest {
  binding_name: string
  lms_portal_id: string
  readiness_rule_id: string
  requirement?: WorkforceLmsReadinessRequirement
  status?: WorkforceInteropBindingStatus
  last_synced_at?: string | null
  notes?: string | null
}

export interface UpdateWorkforceLmsReadinessBindingRequest {
  binding_name?: string
  lms_portal_id?: string
  readiness_rule_id?: string
  requirement?: WorkforceLmsReadinessRequirement
  status?: WorkforceInteropBindingStatus
  last_synced_at?: string | null
  notes?: string | null
}

export interface CreateWorkforceSkillReferenceRequest {
  reference_kind: WorkforceSkillReferenceKind
  reference_id: string
  source_system: WorkforceSkillReferenceSourceSystem
  title: string
  status?: WorkforceSkillReferenceStatus
  notes?: string | null
}

export interface UpdateWorkforceSkillReferenceRequest {
  reference_kind?: WorkforceSkillReferenceKind
  reference_id?: string
  source_system?: WorkforceSkillReferenceSourceSystem
  title?: string
  status?: WorkforceSkillReferenceStatus
  notes?: string | null
}

export interface CreateWorkforceActivationEventRequest {
  event_name: string
  source_binding_kind: WorkforceActivationBindingKind
  source_binding_id: string
  status?: WorkforceActivationEventStatus
  occurred_at?: string
  correlation_id?: string | null
  payload_reference?: string | null
  notes?: string | null
}

export interface UpdateWorkforceActivationEventRequest {
  event_name?: string
  source_binding_kind?: WorkforceActivationBindingKind
  source_binding_id?: string
  status?: WorkforceActivationEventStatus
  occurred_at?: string
  correlation_id?: string | null
  payload_reference?: string | null
  notes?: string | null
}

export interface CreateWorkforceBackupRequest {
  backup_scope: string
  storage_reference: string
  status?: WorkforceBackupStatus
  started_at?: string
  completed_at?: string | null
  notes?: string | null
}

export interface UpdateWorkforceBackupRequest {
  backup_scope?: string
  storage_reference?: string
  status?: WorkforceBackupStatus
  started_at?: string
  completed_at?: string | null
  notes?: string | null
}

export interface CreateWorkforceRestoreDrillRequest {
  backup_id?: string | null
  drill_name: string
  status?: WorkforceRestoreStatus
  started_at?: string
  completed_at?: string | null
  notes?: string | null
}

export interface UpdateWorkforceRestoreDrillRequest {
  backup_id?: string | null
  drill_name?: string
  status?: WorkforceRestoreStatus
  started_at?: string
  completed_at?: string | null
  notes?: string | null
}

export interface CreateWorkforceExportArtifactRequest {
  artifact_name: string
  format?: string
  storage_reference: string
  status?: WorkforceExportArtifactStatus
  generated_at?: string
  delivered_at?: string | null
  notes?: string | null
}

export interface UpdateWorkforceExportArtifactRequest {
  artifact_name?: string
  format?: string
  storage_reference?: string
  status?: WorkforceExportArtifactStatus
  generated_at?: string
  delivered_at?: string | null
  notes?: string | null
}

export interface CreateWorkforceImportValidationRequest {
  artifact_reference: string
  status?: WorkforceImportValidationStatus
  validated_at?: string
  findings?: string[]
  notes?: string | null
}

export interface UpdateWorkforceImportValidationRequest {
  artifact_reference?: string
  status?: WorkforceImportValidationStatus
  validated_at?: string
  findings?: string[]
  notes?: string | null
}

export interface CreateWorkforceResilienceCheckRequest {
  check_name: string
  status?: WorkforceResilienceCheckStatus
  executed_at?: string
  latency_ms?: number | null
  notes?: string | null
}

export interface UpdateWorkforceResilienceCheckRequest {
  check_name?: string
  status?: WorkforceResilienceCheckStatus
  executed_at?: string
  latency_ms?: number | null
  notes?: string | null
}

export interface CreateWorkforceBenchmarkCheckRequest {
  benchmark_name: string
  status?: WorkforceBenchmarkCheckStatus
  measured_at?: string
  score?: number | null
  notes?: string | null
}

export interface UpdateWorkforceBenchmarkCheckRequest {
  benchmark_name?: string
  status?: WorkforceBenchmarkCheckStatus
  measured_at?: string
  score?: number | null
  notes?: string | null
}

export interface CreateWorkforceDiagnosticsRequest {
  diagnostic_name: string
  status?: WorkforceDiagnosticsStatus
  observed_at?: string
  details: string
  notes?: string | null
}

export interface UpdateWorkforceDiagnosticsRequest {
  diagnostic_name?: string
  status?: WorkforceDiagnosticsStatus
  observed_at?: string
  details?: string
  notes?: string | null
}

export interface CreateWorkforceFormalReviewRequest {
  notes?: string[]
}

export interface CreateWorkforceAdoptionPlanRequest {
  formal_review_id?: string | null
  scope?: string
  prerequisites?: string[]
  risks?: string[]
  milestones?: string[]
  notes?: string[]
}

export interface LmsSummaryResponse {
  generated_at: string
  phase: LmsPhase
  subsystem_status: LmsSubsystemStatus
  migration_state: LmsMigrationState
  admin_surface_route: '/lms'
  scope_model: 'STANDALONE_AND_EMBEDDED_LMS_WITH_SUBSYSTEM_BINDINGS'
  global_admin_role: 'super_administrator'
  validation_domain_count: number
  portal_count: number
  standalone_portal_count: number
  embedded_portal_count: number
  dual_mode_portal_count: number
  catalog_count: number
  public_catalog_count: number
  program_count: number
  active_program_count: number
  pathway_count: number
  certification_count: number
  embedded_binding_count: number
  cms_binding_count: number
  lesson_package_binding_count: number
  assessment_package_binding_count: number
  remediation_binding_count: number
  identity_binding_count: number
  commerce_binding_count: number
  consumer_binding_count: number
  commerce_activation_count: number
  active_commerce_activation_count: number
  enrollment_count: number
  active_enrollment_count: number
  cohort_count: number
  active_cohort_count: number
  course_run_count: number
  live_course_run_count: number
  session_count: number
  scheduled_session_count: number
  attendance_record_count: number
  assignment_count: number
  active_assignment_count: number
  attempt_count: number
  submitted_attempt_count: number
  grading_queue_count: number
  pending_grading_queue_count: number
  rubric_count: number
  gradebook_entry_count: number
  competency_framework_count: number
  competency_count: number
  competency_award_count: number
  badge_award_count: number
  certificate_record_count: number
  active_certificate_record_count: number
  transcript_count: number
  recertification_record_count: number
  open_recertification_count: number
  content_manifest_count: number
  scorm_package_count: number
  scorm_registration_count: number
  xapi_provider_count: number
  xapi_statement_count: number
  cmi5_package_count: number
  cmi5_registration_count: number
  lti_tool_count: number
  lti_deployment_count: number
  lti_launch_count: number
  roster_export_count: number
  discussion_thread_count: number
  discussion_post_count: number
  notification_campaign_count: number
  learner_risk_count: number
  instructor_console_count: number
  manager_console_count: number
  access_resolution_count: number
  automation_rule_count: number
  automation_run_count: number
  operations_health: LmsOperationsHealth
  backup_count: number
  restore_count: number
  export_artifact_count: number
  import_validation_count: number
  benchmark_run_count: number
  resilience_run_count: number
  readiness_review_count: number
  latest_readiness_decision: LmsReadinessDecision | null
  formal_review_count: number
  latest_market_position: LmsMarketPosition | null
  first_contract_ids: string[]
  next_recommended_phase: string
}

export interface LmsManagedFileSummary {
  file_name: string
  persisted_path: string
  checksum_sha256: string
  byte_size: number
}

export interface LmsRunbookRecord {
  id: string
  title: string
  summary: string
}

export interface LmsDiagnosticsCheck {
  id: string
  name: string
  status: LmsEvidenceStatus
  summary: string
}

export interface LmsBackupArtifactRecord {
  id: string
  label: string
  status: 'READY'
  checksum_sha256: string
  object_key: string
  created_at: string
  created_by_user_id: string
  summary: {
    file_count: number
    total_bytes: number
    portal_count: number
    program_count: number
    enrollment_count: number
    gradebook_entry_count: number
    certificate_count: number
  }
}

export interface LmsRestoreRecord {
  id: string
  backup_id: string
  mode: 'DRY_RUN' | 'EXECUTE'
  status: 'VALIDATED' | 'APPLIED'
  created_at: string
  created_by_user_id: string
  restart_required: boolean
  checksum_sha256: string
  summary: {
    restored_file_count: number
    restored_bytes: number
    portal_count: number
    enrollment_count: number
    gradebook_entry_count: number
    certificate_count: number
  }
}

export interface LmsExportArtifactRecord {
  id: string
  label: string
  status: 'READY'
  checksum_sha256: string
  object_key: string
  created_at: string
  created_by_user_id: string
  summary: {
    file_count: number
    total_bytes: number
    program_count: number
    content_manifest_count: number
    certificate_count: number
    consumer_binding_count: number
    commerce_activation_count: number
  }
}

export interface LmsImportValidationRecord {
  id: string
  source_kind: 'LMS_EXPORT' | 'CMS_BINDING'
  export_artifact_id: string | null
  cms_binding_id: string | null
  target_profile: CmsImportValidationTargetProfile | null
  status: 'VALIDATED' | 'FAILED'
  checksum_sha256: string
  created_at: string
  created_by_user_id: string
  notes: string[]
  summary: {
    validated_file_count: number
    validated_bytes: number
    program_count: number
    content_manifest_count: number
    certificate_count: number
    consumer_binding_count: number
    cms_execution: LmsCmsImportExecutionRecord | null
  }
}

export interface LmsCmsImportExecutionRecord {
  cms_binding_id: string
  target_profile: CmsImportValidationTargetProfile
  validation_status: CmsImportValidationStatus
  status: 'EXECUTED' | 'BLOCKED'
  consumer_readiness: CmsAcademicConsumerReadinessSummary
  execution_plan: CmsAcademicImportExecutionPlanRecord
  bound_program_ids: string[]
  skipped_program_ids: string[]
  lesson_package_binding_ids: string[]
  assessment_package_binding_ids: string[]
  remediation_binding_ids: string[]
  competency_framework_ids: string[]
  competency_ids: string[]
  assignment_ids: string[]
  content_manifest_ids: string[]
  consumer_binding_count: number
  notes: string[]
}

export interface LmsBenchmarkCheck {
  id: string
  name: string
  status: LmsEvidenceStatus
  summary: string
}

export interface LmsBenchmarkRunRecord {
  id: string
  overall_status: LmsEvidenceStatus
  count: number
  executed_at: string
  executed_by_user_id: string
  checks: LmsBenchmarkCheck[]
}

export interface LmsResilienceRunRecord {
  id: string
  overall_status: LmsEvidenceStatus
  count: number
  executed_at: string
  executed_by_user_id: string
  checks: LmsBenchmarkCheck[]
}

export interface LmsReadinessReviewRecord {
  id: string
  decision: LmsReadinessDecision
  count: number
  created_at: string
  created_by_user_id: string
  notes: string[]
  checks: LmsBenchmarkCheck[]
}

export interface LmsOperationsSummaryResponse {
  generated_at: string
  operations_health: LmsOperationsHealth
  backup_count: number
  restore_count: number
  export_artifact_count: number
  import_validation_count: number
  benchmark_run_count: number
  resilience_run_count: number
  readiness_review_count: number
  latest_benchmark_status: LmsEvidenceStatus | null
  latest_resilience_status: LmsEvidenceStatus | null
  latest_readiness_decision: LmsReadinessDecision | null
}

export interface LmsOperationsDiagnosticsResponse {
  generated_at: string
  operations_health: LmsOperationsHealth
  managed_files: LmsManagedFileSummary[]
  runbooks: LmsRunbookRecord[]
  checks: LmsDiagnosticsCheck[]
  lms_metrics: {
    portal_count: number
    program_count: number
    enrollment_count: number
    gradebook_entry_count: number
    certificate_count: number
    content_manifest_count: number
    commerce_activation_count: number
    automation_run_count: number
  }
}

export interface LmsOperationsHealthResponse {
  generated_at: string
  operations_health: LmsOperationsHealth
  checks: LmsDiagnosticsCheck[]
}

export interface LmsRunbooksResponse {
  generated_at: string
  runbooks: LmsRunbookRecord[]
  count: number
}

export interface LmsBackupsResponse {
  generated_at: string
  backups: LmsBackupArtifactRecord[]
  count: number
}

export interface LmsRestoresResponse {
  generated_at: string
  restores: LmsRestoreRecord[]
  count: number
}

export interface LmsExportArtifactsResponse {
  generated_at: string
  exports: LmsExportArtifactRecord[]
  count: number
}

export interface LmsImportValidationsResponse {
  generated_at: string
  validations: LmsImportValidationRecord[]
  count: number
}

export interface LmsBenchmarksResponse {
  generated_at: string
  benchmarks: LmsBenchmarkRunRecord[]
  count: number
}

export interface LmsResilienceRunsResponse {
  generated_at: string
  runs: LmsResilienceRunRecord[]
  count: number
}

export interface LmsReadinessReviewsResponse {
  generated_at: string
  latest_review: LmsReadinessReviewRecord | null
  reviews: LmsReadinessReviewRecord[]
  count: number
}

export interface LmsStandardsMatrixItem {
  id: string
  family: string
  capability: string
  status: LmsReviewStatus
  summary: string
}

export interface LmsInteroperabilityCheck {
  id: string
  workflow_family: string
  name: string
  status: LmsReviewStatus
  summary: string
  evidence: string
}

export interface LmsDifferentiationArea {
  id: string
  name: string
  status: LmsReviewStatus
  comparative_position: string
  summary: string
}

export interface LmsFormalReviewRecord {
  id: string
  created_at: string
  created_by_user_id: string
  overall_status: LmsReviewStatus
  market_position: LmsMarketPosition
  adoption_recommendation: LmsAdoptionRecommendation
  standalone_validation_complete: boolean
  standalone_production_ready: boolean
  dual_mode_delivery_complete: boolean
  interoperability_complete: boolean
  education_differentiated: boolean
  notes: string[]
  standards_status: LmsReviewStatus
  interoperability_status: LmsReviewStatus
  operations_status: LmsReviewStatus
  differentiation_status: LmsReviewStatus
}

export interface LmsStandardsMatrixResponse {
  generated_at: string
  overall_status: LmsReviewStatus
  items: LmsStandardsMatrixItem[]
  count: number
}

export interface LmsInteroperabilityResponse {
  generated_at: string
  overall_status: LmsReviewStatus
  checks: LmsInteroperabilityCheck[]
  count: number
}

export interface LmsDifferentiationResponse {
  generated_at: string
  overall_status: LmsReviewStatus
  areas: LmsDifferentiationArea[]
  count: number
}

export interface LmsReviewSummaryResponse {
  generated_at: string
  latest_review: LmsFormalReviewRecord | null
  latest_market_position: LmsMarketPosition | null
  latest_adoption_recommendation: LmsAdoptionRecommendation | null
  formal_review_count: number
  standards_matrix_count: number
  interoperability_check_count: number
  differentiation_area_count: number
}

export interface LmsFormalReviewsResponse {
  generated_at: string
  latest_review: LmsFormalReviewRecord | null
  reviews: LmsFormalReviewRecord[]
  count: number
}

export interface CreateLmsBackupRequest {
  label?: string
}

export interface CreateLmsRestoreRequest {
  backup_id: string
  mode?: 'DRY_RUN' | 'EXECUTE'
}

export interface CreateLmsExportArtifactRequest {
  label?: string
}

export interface CreateLmsImportValidationRequest {
  export_artifact_id?: string | null
  cms_binding_id?: string | null
  target_profile?: CmsImportValidationTargetProfile
  notes?: string[]
}

export interface CreateLmsReadinessReviewRequest {
  decision?: LmsReadinessDecision
  notes?: string[]
}

export interface CreateLmsFormalReviewRequest {
  notes?: string[]
}

export interface LmsPortalsResponse {
  generated_at: string
  portals: LmsPortalRecord[]
  count: number
}

export interface LmsCatalogsResponse {
  generated_at: string
  catalogs: LmsCatalogRecord[]
  count: number
}

export interface LmsProgramsResponse {
  generated_at: string
  programs: LmsProgramRecord[]
  count: number
}

export interface LmsPathwaysResponse {
  generated_at: string
  pathways: LmsPathwayRecord[]
  count: number
}

export interface LmsCertificationsResponse {
  generated_at: string
  certifications: LmsCertificationRecord[]
  count: number
}

export interface LmsEmbeddedBindingsResponse {
  generated_at: string
  bindings: LmsEmbeddedBindingRecord[]
  count: number
}

export interface LmsCmsBindingsResponse {
  generated_at: string
  bindings: LmsCmsBindingRecord[]
  count: number
}

export interface LmsLessonPackageBindingsResponse {
  generated_at: string
  bindings: LmsLessonPackageBindingRecord[]
  count: number
}

export interface LmsAssessmentPackageBindingsResponse {
  generated_at: string
  bindings: LmsAssessmentPackageBindingRecord[]
  count: number
}

export interface LmsRemediationBindingsResponse {
  generated_at: string
  bindings: LmsRemediationBindingRecord[]
  count: number
}

export interface LmsIdentityBindingsResponse {
  generated_at: string
  bindings: LmsIdentityBindingRecord[]
  count: number
}

export interface LmsCommerceBindingsResponse {
  generated_at: string
  bindings: LmsCommerceBindingRecord[]
  count: number
}

export interface LmsConsumerBindingsResponse {
  generated_at: string
  bindings: LmsConsumerBindingRecord[]
  count: number
}

export interface LmsCommerceActivationsResponse {
  generated_at: string
  activations: LmsCommerceActivationRecord[]
  count: number
}

export interface LmsAccessResolutionsResponse {
  generated_at: string
  resolutions: LmsAccessResolutionRecord[]
  count: number
}

export interface LmsEnrollmentsResponse {
  generated_at: string
  enrollments: LmsEnrollmentRecord[]
  count: number
}

export interface LmsCohortsResponse {
  generated_at: string
  cohorts: LmsCohortRecord[]
  count: number
}

export interface LmsCourseRunsResponse {
  generated_at: string
  course_runs: LmsCourseRunRecord[]
  count: number
}

export interface LmsSessionsResponse {
  generated_at: string
  sessions: LmsSessionRecord[]
  count: number
}

export interface LmsAttendanceResponse {
  generated_at: string
  attendance_records: LmsAttendanceRecord[]
  count: number
}

export interface LmsAssignmentsResponse {
  generated_at: string
  assignments: LmsAssignmentRecord[]
  count: number
}

export interface LmsAttemptsResponse {
  generated_at: string
  attempts: LmsAttemptRecord[]
  count: number
}

export interface LmsGradingQueueResponse {
  generated_at: string
  queue_items: LmsGradingQueueRecord[]
  count: number
}

export interface LmsRubricsResponse {
  generated_at: string
  rubrics: LmsRubricRecord[]
  count: number
}

export interface LmsGradebookResponse {
  generated_at: string
  gradebook: LmsGradebookRecord[]
  count: number
}

export interface LmsCompetencyFrameworksResponse {
  generated_at: string
  competency_frameworks: LmsCompetencyFrameworkRecord[]
  count: number
}

export interface LmsCompetenciesResponse {
  generated_at: string
  competencies: LmsCompetencyRecord[]
  count: number
}

export interface LmsCompetencyAwardsResponse {
  generated_at: string
  competency_awards: LmsCompetencyAwardRecord[]
  count: number
}

export interface LmsBadgesResponse {
  generated_at: string
  badge_awards: LmsBadgeAwardRecord[]
  count: number
}

export interface LmsCertificatesResponse {
  generated_at: string
  certificates: LmsCertificateRecord[]
  count: number
}

export interface LmsTranscriptsResponse {
  generated_at: string
  transcripts: LmsTranscriptRecord[]
  count: number
}

export interface LmsRecertificationResponse {
  generated_at: string
  recertification_records: LmsRecertificationRecord[]
  count: number
}

export interface LmsContentManifestsResponse {
  generated_at: string
  content_manifests: LmsContentManifestRecord[]
  count: number
}

export interface LmsScormPackagesResponse {
  generated_at: string
  packages: LmsScormPackageRecord[]
  count: number
}

export interface LmsScormRegistrationsResponse {
  generated_at: string
  registrations: LmsScormRegistrationRecord[]
  count: number
}

export interface LmsXapiProvidersResponse {
  generated_at: string
  providers: LmsXapiProviderRecord[]
  count: number
}

export interface LmsXapiStatementsResponse {
  generated_at: string
  statements: LmsXapiStatementRecord[]
  count: number
}

export interface LmsCmi5PackagesResponse {
  generated_at: string
  packages: LmsCmi5PackageRecord[]
  count: number
}

export interface LmsCmi5RegistrationsResponse {
  generated_at: string
  registrations: LmsCmi5RegistrationRecord[]
  count: number
}

export interface LmsLtiToolsResponse {
  generated_at: string
  tools: LmsLtiToolRecord[]
  count: number
}

export interface LmsLtiDeploymentsResponse {
  generated_at: string
  deployments: LmsLtiDeploymentRecord[]
  count: number
}

export interface LmsLtiLaunchesResponse {
  generated_at: string
  launches: LmsLtiLaunchRecord[]
  count: number
}

export interface LmsRosterExportsResponse {
  generated_at: string
  exports: LmsRosterExportRecord[]
  count: number
}

export interface LmsDiscussionThreadsResponse {
  generated_at: string
  threads: LmsDiscussionThreadRecord[]
  count: number
}

export interface LmsDiscussionPostsResponse {
  generated_at: string
  posts: LmsDiscussionPostRecord[]
  count: number
}

export interface LmsNotificationCampaignsResponse {
  generated_at: string
  campaigns: LmsNotificationCampaignRecord[]
  count: number
}

export interface LmsLearnerRiskResponse {
  generated_at: string
  risks: LmsLearnerRiskRecord[]
  count: number
}

export interface LmsInstructorConsoleResponse {
  generated_at: string
  workspaces: LmsInstructorConsoleRecord[]
  count: number
}

export interface LmsManagerConsoleResponse {
  generated_at: string
  workspaces: LmsManagerConsoleRecord[]
  count: number
}

export interface LmsAutomationRulesResponse {
  generated_at: string
  rules: LmsAutomationRuleRecord[]
  count: number
}

export interface LmsAutomationRunsResponse {
  generated_at: string
  runs: LmsAutomationRunRecord[]
  count: number
}

export interface LmsValidationDomainsResponse {
  generated_at: string
  validation_domains: LmsValidationDomain[]
  count: number
}

export interface LmsPortalRecord {
  id: string
  name: string
  summary: string
  delivery_mode: LmsDeliveryMode
  status: LmsPortalStatus
  audience: LmsPortalAudience
  validation_domain_id: string
  default_locale: string
  supported_locales: string[]
  route_base: string
  white_label_key: string
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsCatalogRecord {
  id: string
  portal_id: string
  name: string
  summary: string
  visibility: LmsCatalogVisibility
  status: LmsCatalogStatus
  cms_space_binding_id: string | null
  commerce_binding_id: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsProgramRecord {
  id: string
  portal_id: string
  catalog_id: string
  name: string
  summary: string
  status: LmsProgramStatus
  delivery_model: LmsProgramDeliveryModel
  modality: LmsProgramModality
  cms_course_ref: string | null
  commerce_offer_ref: string | null
  estimated_duration_hours: number
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsPathwayRecord {
  id: string
  portal_id: string
  name: string
  summary: string
  status: LmsPathwayStatus
  program_ids: string[]
  completion_rule: string
  recertification_window_days: number
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsCertificationRecord {
  id: string
  portal_id: string
  pathway_id: string
  name: string
  summary: string
  status: LmsCertificationStatus
  validity_period_days: number
  certificate_template_key: string
  badge_template_key: string
  recertification_pathway_id: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsEmbeddedBindingRecord {
  id: string
  portal_id: string
  consumer_application_id: string
  consumer_application_name: string
  launch_mode: LmsEmbeddedLaunchMode
  route_base: string
  status: LmsEmbeddedBindingStatus
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsCmsBindingRecord {
  id: string
  portal_id: string
  catalog_id: string
  cms_space_id: string
  curriculum_release_id: string | null
  assessment_package_id: string | null
  status: LmsCmsBindingStatus
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsLessonPackageBindingRecord {
  id: string
  portal_id: string
  program_id: string
  cms_binding_id: string
  course_entry_id: string
  course_title: string
  curriculum_release_id: string
  release_id: string
  release_name: string
  version_tag: string
  lesson_entry_ids: string[]
  status: LmsCmsBindingStatus
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsAssessmentPackageBindingRecord {
  id: string
  portal_id: string
  program_id: string
  assignment_id: string | null
  cms_binding_id: string
  assessment_entry_id: string
  assessment_title: string
  assessment_package_id: string
  release_id: string
  release_name: string
  variant_id: string
  variant_title: string
  question_count: number
  status: LmsCmsBindingStatus
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsRemediationBindingRecord {
  id: string
  portal_id: string
  program_id: string
  cms_binding_id: string
  curriculum_release_id: string
  release_id: string
  release_name: string
  course_entry_id: string
  course_title: string
  lesson_entry_ids: string[]
  assignment_id: string | null
  competency_id: string | null
  trigger_kind: LmsContentBindingTriggerKind
  summary: string
  status: LmsCmsBindingStatus
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsContentManifestLessonPackageRef {
  binding_id: string
  course_entry_id: string
  course_title: string
  curriculum_release_id: string
  release_id: string
  release_name: string
  version_tag: string
  lesson_entry_ids: string[]
}

export interface LmsContentManifestAssessmentPackageRef {
  binding_id: string
  assignment_id: string | null
  assessment_entry_id: string
  assessment_title: string
  assessment_package_id: string
  release_id: string
  release_name: string
  variant_id: string
  variant_title: string
  question_count: number
}

export interface LmsContentManifestRemediationRef {
  binding_id: string
  curriculum_release_id: string
  release_id: string
  release_name: string
  course_entry_id: string
  course_title: string
  lesson_entry_ids: string[]
  assignment_id: string | null
  competency_id: string | null
  trigger_kind: LmsContentBindingTriggerKind
  summary: string
}

export interface LmsContentManifestRecord {
  id: string
  portal_id: string
  enrollment_id: string
  program_id: string
  learner_principal_id: string
  learner_label: string
  cms_binding_id: string
  curriculum_release_id: string | null
  lesson_packages: LmsContentManifestLessonPackageRef[]
  assessment_packages: LmsContentManifestAssessmentPackageRef[]
  remediation_packages: LmsContentManifestRemediationRef[]
  academic_snapshot: CmsAcademicContentSnapshotRecord | null
  academic_delivery: {
    delivery_mode: string | null
    standards_framework_ids: string[]
    standard_ids: string[]
    supported_accommodation_profile_ids: string[]
    supported_alternate_format_tags: string[]
    supported_differentiation_profile_ids: string[]
    delivery_audiences: string[]
    export_mode: 'STANDARD' | 'ACCOMMODATED' | 'DIFFERENTIATED' | 'ACCOMMODATED_DIFFERENTIATED'
    selection: CmsAcademicDeliverySelectionRecord
  } | null
  resolved_at: string
  resolved_by_user_id: string
}

export interface LmsScormPackageRecord {
  id: string
  portal_id: string
  program_id: string
  cms_binding_id: string | null
  lesson_package_binding_id: string | null
  title: string
  summary: string
  manifest_url: string
  package_url: string
  launch_url: string
  version_tag: string
  status: LmsScormPackageStatus
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsScormRegistrationRecord {
  id: string
  portal_id: string
  program_id: string
  scorm_package_id: string
  enrollment_id: string
  learner_principal_id: string
  learner_label: string
  registration_key: string
  launch_url: string
  status: LmsScormRegistrationStatus
  progress_percent: number
  score_percent: number | null
  registered_at: string
  completed_at: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsXapiProviderRecord {
  id: string
  portal_id: string
  name: string
  summary: string
  endpoint_url: string
  auth_mode: 'BASIC' | 'TOKEN' | 'NONE'
  bound_program_ids: string[]
  status: LmsXapiProviderStatus
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsXapiStatementRecord {
  id: string
  portal_id: string
  provider_id: string | null
  program_id: string
  enrollment_id: string | null
  learner_principal_id: string | null
  actor_identifier: string
  verb_id: string
  object_id: string
  object_definition: string
  statement_ref: string
  result_score_scaled: number | null
  status: LmsXapiStatementStatus
  received_at: string
  processed_at: string
  created_by_user_id: string
}

export interface LmsCmi5PackageRecord {
  id: string
  portal_id: string
  program_id: string
  cms_binding_id: string | null
  lesson_package_binding_id: string | null
  title: string
  summary: string
  package_url: string
  launch_url: string
  course_structure_ref: string
  move_on_rule: string
  status: LmsCmi5PackageStatus
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsCmi5RegistrationRecord {
  id: string
  portal_id: string
  program_id: string
  cmi5_package_id: string
  enrollment_id: string
  learner_principal_id: string
  learner_label: string
  registration_id: string
  launch_url: string
  status: LmsCmi5RegistrationStatus
  launched_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsLtiToolRecord {
  id: string
  portal_id: string
  name: string
  summary: string
  issuer: string
  client_id: string
  launch_url: string
  jwks_url: string
  lineitem_scope_names: string[]
  status: LmsLtiToolStatus
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsLtiDeploymentRecord {
  id: string
  portal_id: string
  tool_id: string
  catalog_id: string | null
  program_id: string | null
  deployment_id: string
  platform_issuer: string
  target_link_uri: string
  status: LmsLtiDeploymentStatus
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsLtiLaunchRecord {
  id: string
  portal_id: string
  tool_id: string
  deployment_id: string
  enrollment_id: string
  assignment_id: string | null
  learner_principal_id: string
  learner_label: string
  launch_token: string
  return_url: string | null
  status: LmsLtiLaunchStatus
  issued_at: string
  consumed_at: string | null
  created_by_user_id: string
  updated_at: string
  updated_by_user_id: string
}

export interface LmsRosterExportRecord {
  id: string
  portal_id: string
  course_run_id: string
  cohort_id: string | null
  target_kind: LmsRosterExportTargetKind
  target_ref: string
  status: LmsRosterExportStatus
  learner_count: number
  payload_ref: string
  generated_at: string
  delivered_at: string | null
  created_by_user_id: string
  updated_at: string
  updated_by_user_id: string
}

export interface LmsDiscussionThreadRecord {
  id: string
  portal_id: string
  program_id: string | null
  course_run_id: string | null
  assignment_id: string | null
  context_kind: LmsDiscussionContextKind
  title: string
  summary: string
  status: LmsDiscussionThreadStatus
  participant_principal_ids: string[]
  post_count: number
  last_activity_at: string
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsDiscussionPostRecord {
  id: string
  thread_id: string
  portal_id: string
  author_principal_id: string
  author_label: string
  body: string
  visibility: LmsDiscussionPostVisibility
  posted_at: string
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsNotificationCampaignRecord {
  id: string
  portal_id: string
  target_kind: 'PORTAL' | 'COHORT' | 'COURSE_RUN' | 'ENROLLMENT'
  target_ref: string
  channel: LmsNotificationChannel
  title: string
  body: string
  status: LmsNotificationCampaignStatus
  recipient_count: number
  scheduled_at: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsLearnerRiskRecord {
  id: string
  portal_id: string
  program_id: string
  enrollment_id: string
  learner_principal_id: string
  learner_label: string
  progress_percent: number
  grade_percent: number | null
  attendance_percent: number | null
  recertification_status: LmsRecertificationStatus | null
  risk_level: LmsLearnerRiskLevel
  rationale: string[]
  competency_award_count: number
  competency_target_count: number
  missing_competency_count: number
  content_manifest_id: string | null
  standards_framework_count: number
  standards_count: number
  selected_accommodation_profile_id: string | null
  selected_alternate_format_tag: string | null
  selected_differentiation_profile_id: string | null
  instructor_principal_ids: string[]
  manager_principal_ids: string[]
  updated_at: string
}

export interface LmsInstructorConsoleRecord {
  id: string
  portal_id: string
  instructor_principal_id: string
  assigned_course_run_ids: string[]
  assigned_cohort_ids: string[]
  active_learner_count: number
  at_risk_learner_count: number
  upcoming_session_count: number
  grading_queue_count: number
  average_grade_percent: number | null
  competency_award_count: number
  competency_target_count: number
  missing_competency_count: number
  content_manifest_count: number
  personalized_delivery_count: number
  standards_framework_count: number
  updated_at: string
}

export interface LmsManagerConsoleRecord {
  id: string
  portal_id: string
  manager_principal_id: string
  scoped_program_ids: string[]
  learner_count: number
  at_risk_learner_count: number
  overdue_recertification_count: number
  completion_rate_percent: number
  competency_award_count: number
  competency_target_count: number
  competency_completion_rate_percent: number
  content_manifest_count: number
  personalized_delivery_count: number
  standards_framework_count: number
  updated_at: string
}

export interface LmsAutomationRuleRecord {
  id: string
  portal_id: string
  name: string
  summary: string
  trigger_kind: LmsAutomationTriggerKind
  target_kind: LmsAutomationTargetKind
  action_kind: LmsAutomationActionKind
  notification_campaign_id: string | null
  remediation_binding_id: string | null
  status: LmsAutomationRuleStatus
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsAutomationRunRecord {
  id: string
  rule_id: string
  portal_id: string
  status: LmsAutomationRunStatus
  target_ref: string
  result_summary: string
  affected_enrollment_ids: string[]
  remediation_binding_ids: string[]
  content_manifest_ids: string[]
  triggered_at: string
  created_by_user_id: string
}

export interface LmsIdentityBindingRecord {
  id: string
  portal_id: string
  realm_id: string
  organization_scope_id: string | null
  default_role_keys: string[]
  status: LmsIdentityBindingStatus
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsCommerceBindingRecord {
  id: string
  portal_id: string
  catalog_id: string
  commerce_application_binding_id: string
  seat_offer_ids: string[]
  certification_offer_ids: string[]
  subscription_required: boolean
  status: LmsCommerceBindingStatus
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsConsumerBindingRecord {
  id: string
  portal_id: string
  embedded_binding_id: string | null
  identity_binding_id: string
  commerce_binding_id: string
  commerce_application_binding_id: string
  consumer_application_id: string
  consumer_application_name: string
  access_policy: LmsConsumerAccessPolicy
  provisioning_mode: LmsConsumerProvisioningMode
  status: LmsConsumerBindingStatus
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsCommerceActivationRecord {
  id: string
  portal_id: string
  catalog_id: string
  consumer_binding_id: string
  commerce_binding_id: string
  entitlement_grant_id: string
  provisioning_grant_id: string | null
  learner_principal_id: string
  learner_label: string
  offer_id: string
  activation_kind: LmsCommerceActivationKind
  activated_program_ids: string[]
  enrollment_ids: string[]
  activation_ref: string
  status: LmsCommerceActivationStatus
  activated_at: string
  revoked_at: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsAccessResolutionRecord {
  id: string
  portal_id: string
  learner_principal_id: string
  learner_label: string
  consumer_binding_id: string | null
  identity_binding_id: string | null
  commerce_binding_id: string | null
  realm_id: string | null
  organization_scope_id: string | null
  organization_ids: string[]
  role_keys: string[]
  active_entitlement_grant_ids: string[]
  active_provisioning_grant_ids: string[]
  active_activation_ids: string[]
  active_enrollment_ids: string[]
  accessible_program_ids: string[]
  access_decision: LmsAccessDecision
  rationale: string[]
  resolved_at: string
}

export interface LmsEnrollmentRecord {
  id: string
  portal_id: string
  catalog_id: string
  program_id: string
  cohort_id: string | null
  identity_binding_id: string | null
  learner_principal_id: string
  learner_label: string
  source: LmsEnrollmentSource
  status: LmsEnrollmentStatus
  progress_percent: number
  due_at: string | null
  started_at: string | null
  completed_at: string | null
  commerce_activation_ref: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsCohortRecord {
  id: string
  portal_id: string
  name: string
  summary: string
  status: LmsCohortStatus
  program_ids: string[]
  learner_principal_ids: string[]
  instructor_principal_ids: string[]
  identity_binding_id: string | null
  starts_at: string | null
  ends_at: string | null
  max_seats: number | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsCourseRunRecord {
  id: string
  portal_id: string
  program_id: string
  title: string
  summary: string
  status: LmsCourseRunStatus
  delivery_channel: LmsCourseRunChannel
  cohort_ids: string[]
  enrollment_ids: string[]
  instructor_principal_ids: string[]
  scheduled_start_at: string | null
  scheduled_end_at: string | null
  launched_at: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsSessionRecord {
  id: string
  portal_id: string
  course_run_id: string
  title: string
  summary: string
  session_type: LmsSessionType
  status: LmsSessionStatus
  scheduled_start_at: string | null
  scheduled_end_at: string | null
  facilitator_principal_ids: string[]
  attendance_capture_mode: LmsAttendanceCaptureMode
  join_url: string | null
  location_label: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsAttendanceRecord {
  id: string
  portal_id: string
  course_run_id: string
  session_id: string
  enrollment_id: string
  learner_principal_id: string
  status: LmsAttendanceStatus
  minutes_attended: number
  note: string
  marked_at: string
  marked_by_user_id: string
  created_at: string
  updated_at: string
}

export interface LmsRubricCriterionRecord {
  id: string
  label: string
  description: string
  max_points: number
}

export interface LmsRubricScoreRecord {
  criterion_id: string
  criterion_label: string
  points_awarded: number
  max_points: number
  note: string
}

export interface LmsAssignmentRecord {
  id: string
  portal_id: string
  program_id: string
  course_run_id: string | null
  title: string
  summary: string
  assignment_type: LmsAssignmentType
  status: LmsAssignmentStatus
  grading_mode: LmsGradingMode
  rubric_id: string | null
  assessment_package_ref: string | null
  standards_framework_ids: string[]
  standard_ids: string[]
  accommodation_profile_ids: string[]
  differentiation_profile_ids: string[]
  max_attempts: number
  max_points: number
  passing_percent: number
  available_from_at: string | null
  due_at: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsAttemptRecord {
  id: string
  portal_id: string
  program_id: string
  course_run_id: string | null
  assignment_id: string
  enrollment_id: string
  learner_principal_id: string
  attempt_number: number
  status: LmsAttemptStatus
  response_summary: string
  submitted_at: string | null
  graded_at: string | null
  score_percent: number | null
  earned_points: number | null
  grading_mode: LmsGradingMode
  feedback: string
  rubric_id: string | null
  rubric_scores: LmsRubricScoreRecord[]
  graded_by_user_id: string | null
  created_at: string
  updated_at: string
}

export interface LmsGradingQueueRecord {
  id: string
  portal_id: string
  program_id: string
  course_run_id: string | null
  assignment_id: string
  attempt_id: string
  enrollment_id: string
  learner_principal_id: string
  assignment_title: string
  status: LmsGradingQueueStatus
  priority: LmsQueuePriority
  grader_principal_id: string | null
  submitted_at: string
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface LmsRubricRecord {
  id: string
  portal_id: string
  program_id: string
  title: string
  summary: string
  status: LmsRubricStatus
  criteria: LmsRubricCriterionRecord[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsGradebookAssignmentScore {
  assignment_id: string
  assignment_title: string
  best_attempt_id: string | null
  earned_points: number
  possible_points: number
  percentage: number | null
  pass_state: LmsGradebookPassState
}

export interface LmsGradebookRecord {
  id: string
  portal_id: string
  program_id: string
  course_run_id: string | null
  enrollment_id: string
  learner_principal_id: string
  learner_label: string
  total_points_earned: number
  total_points_possible: number
  percentage: number
  letter_grade: string
  pass_state: LmsGradebookPassState
  assignment_count: number
  graded_assignment_count: number
  attempt_ids: string[]
  assignment_scores: LmsGradebookAssignmentScore[]
  last_graded_at: string | null
  created_at: string
  updated_at: string
}

export interface LmsCompetencyFrameworkRecord {
  id: string
  portal_id: string
  cms_framework_ref: string | null
  framework_code: string | null
  title: string
  summary: string
  status: LmsCompetencyFrameworkStatus
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsCompetencyRecord {
  id: string
  portal_id: string
  framework_id: string
  program_id: string
  cms_standard_ref: string | null
  standard_code: string | null
  title: string
  summary: string
  status: LmsCompetencyStatus
  evidence_type: LmsCompetencyEvidenceType
  assignment_id: string | null
  threshold_percent: number
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface LmsCompetencyAwardRecord {
  id: string
  portal_id: string
  program_id: string
  competency_id: string
  enrollment_id: string
  learner_principal_id: string
  learner_label: string
  source_type: LmsCompetencyAwardSource
  source_ref: string | null
  note: string
  awarded_at: string
  awarded_by_user_id: string
  created_at: string
  updated_at: string
}

export interface LmsBadgeAwardRecord {
  id: string
  portal_id: string
  certification_id: string | null
  certificate_id: string | null
  learner_principal_id: string
  learner_label: string
  badge_template_key: string
  status: LmsBadgeAwardStatus
  note: string
  awarded_at: string
  revoked_at: string | null
  awarded_by_user_id: string
  created_at: string
  updated_at: string
}

export interface LmsCertificateRecord {
  id: string
  portal_id: string
  program_id: string
  pathway_id: string
  certification_id: string
  enrollment_id: string
  learner_principal_id: string
  learner_label: string
  certificate_template_key: string
  certificate_code: string
  status: LmsCertificateStatus
  note: string
  issued_at: string
  expires_at: string | null
  revoked_at: string | null
  issued_by_user_id: string
  created_at: string
  updated_at: string
}

export interface LmsTranscriptRecord {
  id: string
  portal_id: string
  learner_principal_id: string
  learner_label: string
  enrollment_ids: string[]
  program_ids: string[]
  competency_award_ids: string[]
  badge_award_ids: string[]
  certificate_ids: string[]
  completion_count: number
  competency_count: number
  badge_count: number
  certificate_count: number
  active_certificate_count: number
  last_activity_at: string | null
  next_recertification_due_at: string | null
  created_at: string
  updated_at: string
}

export interface LmsRecertificationRecord {
  id: string
  portal_id: string
  pathway_id: string
  certification_id: string
  certificate_id: string
  learner_principal_id: string
  learner_label: string
  recertification_pathway_id: string | null
  due_at: string
  status: LmsRecertificationStatus
  reminder_state: LmsReminderState
  last_notified_at: string | null
  renewed_certificate_id: string | null
  created_at: string
  updated_at: string
}

export interface CreateLmsPortalRequest {
  name: string
  summary: string
  delivery_mode?: LmsDeliveryMode
  status?: LmsPortalStatus
  audience?: LmsPortalAudience
  validation_domain_id: string
  default_locale?: string
  supported_locales?: string[]
  route_base?: string
  white_label_key?: string
}

export interface UpdateLmsPortalRequest {
  name?: string
  summary?: string
  delivery_mode?: LmsDeliveryMode
  status?: LmsPortalStatus
  audience?: LmsPortalAudience
  validation_domain_id?: string
  default_locale?: string
  supported_locales?: string[]
  route_base?: string
  white_label_key?: string
}

export interface CreateLmsCatalogRequest {
  portal_id: string
  name: string
  summary: string
  visibility?: LmsCatalogVisibility
  status?: LmsCatalogStatus
  cms_space_binding_id?: string | null
  commerce_binding_id?: string | null
}

export interface UpdateLmsCatalogRequest {
  name?: string
  summary?: string
  visibility?: LmsCatalogVisibility
  status?: LmsCatalogStatus
  cms_space_binding_id?: string | null
  commerce_binding_id?: string | null
}

export interface CreateLmsProgramRequest {
  portal_id: string
  catalog_id: string
  name: string
  summary: string
  status?: LmsProgramStatus
  delivery_model?: LmsProgramDeliveryModel
  modality?: LmsProgramModality
  cms_course_ref?: string | null
  commerce_offer_ref?: string | null
  estimated_duration_hours?: number
}

export interface UpdateLmsProgramRequest {
  name?: string
  summary?: string
  status?: LmsProgramStatus
  delivery_model?: LmsProgramDeliveryModel
  modality?: LmsProgramModality
  cms_course_ref?: string | null
  commerce_offer_ref?: string | null
  estimated_duration_hours?: number
}

export interface CreateLmsPathwayRequest {
  portal_id: string
  name: string
  summary: string
  status?: LmsPathwayStatus
  program_ids: string[]
  completion_rule: string
  recertification_window_days?: number
}

export interface UpdateLmsPathwayRequest {
  name?: string
  summary?: string
  status?: LmsPathwayStatus
  program_ids?: string[]
  completion_rule?: string
  recertification_window_days?: number
}

export interface CreateLmsCertificationRequest {
  portal_id: string
  pathway_id: string
  name: string
  summary: string
  status?: LmsCertificationStatus
  validity_period_days?: number
  certificate_template_key?: string
  badge_template_key?: string
  recertification_pathway_id?: string | null
}

export interface UpdateLmsCertificationRequest {
  name?: string
  summary?: string
  status?: LmsCertificationStatus
  validity_period_days?: number
  certificate_template_key?: string
  badge_template_key?: string
  recertification_pathway_id?: string | null
}

export interface CreateLmsEmbeddedBindingRequest {
  portal_id: string
  consumer_application_id: string
  consumer_application_name: string
  launch_mode?: LmsEmbeddedLaunchMode
  route_base: string
  status?: LmsEmbeddedBindingStatus
}

export interface UpdateLmsEmbeddedBindingRequest {
  consumer_application_name?: string
  launch_mode?: LmsEmbeddedLaunchMode
  route_base?: string
  status?: LmsEmbeddedBindingStatus
}

export interface CreateLmsCmsBindingRequest {
  portal_id: string
  catalog_id: string
  cms_space_id: string
  curriculum_release_id?: string | null
  assessment_package_id?: string | null
  status?: LmsCmsBindingStatus
}

export interface UpdateLmsCmsBindingRequest {
  cms_space_id?: string
  curriculum_release_id?: string | null
  assessment_package_id?: string | null
  status?: LmsCmsBindingStatus
}

export interface CreateLmsLessonPackageBindingRequest {
  program_id: string
  cms_binding_id: string
  course_entry_id: string
  curriculum_release_id: string
  lesson_entry_ids?: string[]
  status?: LmsCmsBindingStatus
}

export interface UpdateLmsLessonPackageBindingRequest {
  lesson_entry_ids?: string[]
  status?: LmsCmsBindingStatus
}

export interface CreateLmsAssessmentPackageBindingRequest {
  program_id: string
  cms_binding_id: string
  assessment_entry_id: string
  assessment_package_id: string
  assignment_id?: string | null
  status?: LmsCmsBindingStatus
}

export interface UpdateLmsAssessmentPackageBindingRequest {
  assignment_id?: string | null
  status?: LmsCmsBindingStatus
}

export interface CreateLmsRemediationBindingRequest {
  program_id: string
  cms_binding_id: string
  curriculum_release_id: string
  course_entry_id: string
  lesson_entry_ids?: string[]
  assignment_id?: string | null
  competency_id?: string | null
  trigger_kind: LmsContentBindingTriggerKind
  summary: string
  status?: LmsCmsBindingStatus
}

export interface UpdateLmsRemediationBindingRequest {
  lesson_entry_ids?: string[]
  assignment_id?: string | null
  competency_id?: string | null
  trigger_kind?: LmsContentBindingTriggerKind
  summary?: string
  status?: LmsCmsBindingStatus
}

export interface ResolveLmsContentManifestRequest {
  enrollment_id: string
  include_remediation?: boolean
  accommodation_profile_id?: string | null
  alternate_format_tag?: string | null
  differentiation_profile_id?: string | null
}

export interface CreateLmsScormPackageRequest {
  program_id: string
  cms_binding_id?: string | null
  lesson_package_binding_id?: string | null
  title: string
  summary: string
  manifest_url: string
  package_url: string
  version_tag: string
  status?: LmsScormPackageStatus
}

export interface UpdateLmsScormPackageRequest {
  title?: string
  summary?: string
  manifest_url?: string
  package_url?: string
  version_tag?: string
  status?: LmsScormPackageStatus
}

export interface CreateLmsScormRegistrationRequest {
  scorm_package_id: string
  enrollment_id: string
  status?: LmsScormRegistrationStatus
  progress_percent?: number
  score_percent?: number | null
}

export interface UpdateLmsScormRegistrationRequest {
  status?: LmsScormRegistrationStatus
  progress_percent?: number
  score_percent?: number | null
  completed_at?: string | null
}

export interface CreateLmsXapiProviderRequest {
  portal_id: string
  name: string
  summary: string
  endpoint_url: string
  auth_mode?: 'BASIC' | 'TOKEN' | 'NONE'
  bound_program_ids?: string[]
  status?: LmsXapiProviderStatus
}

export interface UpdateLmsXapiProviderRequest {
  name?: string
  summary?: string
  endpoint_url?: string
  auth_mode?: 'BASIC' | 'TOKEN' | 'NONE'
  bound_program_ids?: string[]
  status?: LmsXapiProviderStatus
}

export interface IngestLmsXapiStatementRequest {
  portal_id: string
  program_id: string
  provider_id?: string | null
  enrollment_id?: string | null
  learner_principal_id?: string | null
  actor_identifier: string
  verb_id: string
  object_id: string
  object_definition: string
  statement_ref?: string
  result_score_scaled?: number | null
}

export interface CreateLmsCmi5PackageRequest {
  program_id: string
  cms_binding_id?: string | null
  lesson_package_binding_id?: string | null
  title: string
  summary: string
  package_url: string
  course_structure_ref: string
  move_on_rule: string
  status?: LmsCmi5PackageStatus
}

export interface UpdateLmsCmi5PackageRequest {
  title?: string
  summary?: string
  package_url?: string
  course_structure_ref?: string
  move_on_rule?: string
  status?: LmsCmi5PackageStatus
}

export interface CreateLmsCmi5RegistrationRequest {
  cmi5_package_id: string
  enrollment_id: string
  status?: LmsCmi5RegistrationStatus
}

export interface UpdateLmsCmi5RegistrationRequest {
  status?: LmsCmi5RegistrationStatus
  launched_at?: string | null
  completed_at?: string | null
}

export interface CreateLmsLtiToolRequest {
  portal_id: string
  name: string
  summary: string
  issuer: string
  client_id: string
  launch_url: string
  jwks_url: string
  lineitem_scope_names?: string[]
  status?: LmsLtiToolStatus
}

export interface UpdateLmsLtiToolRequest {
  name?: string
  summary?: string
  issuer?: string
  client_id?: string
  launch_url?: string
  jwks_url?: string
  lineitem_scope_names?: string[]
  status?: LmsLtiToolStatus
}

export interface CreateLmsLtiDeploymentRequest {
  tool_id: string
  catalog_id?: string | null
  program_id?: string | null
  deployment_id: string
  platform_issuer: string
  target_link_uri: string
  status?: LmsLtiDeploymentStatus
}

export interface UpdateLmsLtiDeploymentRequest {
  catalog_id?: string | null
  program_id?: string | null
  deployment_id?: string
  platform_issuer?: string
  target_link_uri?: string
  status?: LmsLtiDeploymentStatus
}

export interface CreateLmsLtiLaunchRequest {
  deployment_id: string
  enrollment_id: string
  assignment_id?: string | null
  return_url?: string | null
  status?: LmsLtiLaunchStatus
}

export interface UpdateLmsLtiLaunchRequest {
  status?: LmsLtiLaunchStatus
  return_url?: string | null
  consumed_at?: string | null
}

export interface CreateLmsRosterExportRequest {
  course_run_id: string
  cohort_id?: string | null
  target_kind: LmsRosterExportTargetKind
  target_ref: string
  status?: LmsRosterExportStatus
}

export interface UpdateLmsRosterExportRequest {
  status?: LmsRosterExportStatus
  delivered_at?: string | null
}

export interface CreateLmsDiscussionThreadRequest {
  portal_id: string
  program_id?: string | null
  course_run_id?: string | null
  assignment_id?: string | null
  context_kind: LmsDiscussionContextKind
  title: string
  summary: string
  participant_principal_ids?: string[]
  status?: LmsDiscussionThreadStatus
}

export interface UpdateLmsDiscussionThreadRequest {
  title?: string
  summary?: string
  participant_principal_ids?: string[]
  status?: LmsDiscussionThreadStatus
}

export interface CreateLmsDiscussionPostRequest {
  thread_id: string
  author_principal_id: string
  author_label: string
  body: string
  visibility?: LmsDiscussionPostVisibility
}

export interface UpdateLmsDiscussionPostRequest {
  body?: string
  visibility?: LmsDiscussionPostVisibility
}

export interface CreateLmsNotificationCampaignRequest {
  portal_id: string
  target_kind: 'PORTAL' | 'COHORT' | 'COURSE_RUN' | 'ENROLLMENT'
  target_ref: string
  channel?: LmsNotificationChannel
  title: string
  body: string
  status?: LmsNotificationCampaignStatus
  scheduled_at?: string | null
}

export interface UpdateLmsNotificationCampaignRequest {
  title?: string
  body?: string
  channel?: LmsNotificationChannel
  status?: LmsNotificationCampaignStatus
  scheduled_at?: string | null
  sent_at?: string | null
}

export interface CreateLmsAutomationRuleRequest {
  portal_id: string
  name: string
  summary: string
  trigger_kind: LmsAutomationTriggerKind
  target_kind: LmsAutomationTargetKind
  action_kind: LmsAutomationActionKind
  notification_campaign_id?: string | null
  remediation_binding_id?: string | null
  status?: LmsAutomationRuleStatus
}

export interface UpdateLmsAutomationRuleRequest {
  name?: string
  summary?: string
  trigger_kind?: LmsAutomationTriggerKind
  target_kind?: LmsAutomationTargetKind
  action_kind?: LmsAutomationActionKind
  notification_campaign_id?: string | null
  remediation_binding_id?: string | null
  status?: LmsAutomationRuleStatus
}

export interface CreateLmsIdentityBindingRequest {
  portal_id: string
  realm_id: string
  organization_scope_id?: string | null
  default_role_keys?: string[]
  status?: LmsIdentityBindingStatus
}

export interface UpdateLmsIdentityBindingRequest {
  realm_id?: string
  organization_scope_id?: string | null
  default_role_keys?: string[]
  status?: LmsIdentityBindingStatus
}

export interface CreateLmsCommerceBindingRequest {
  portal_id: string
  catalog_id: string
  commerce_application_binding_id: string
  seat_offer_ids?: string[]
  certification_offer_ids?: string[]
  subscription_required?: boolean
  status?: LmsCommerceBindingStatus
}

export interface UpdateLmsCommerceBindingRequest {
  commerce_application_binding_id?: string
  seat_offer_ids?: string[]
  certification_offer_ids?: string[]
  subscription_required?: boolean
  status?: LmsCommerceBindingStatus
}

export interface CreateLmsConsumerBindingRequest {
  portal_id: string
  identity_binding_id: string
  commerce_binding_id: string
  embedded_binding_id?: string | null
  access_policy?: LmsConsumerAccessPolicy
  provisioning_mode?: LmsConsumerProvisioningMode
  status?: LmsConsumerBindingStatus
}

export interface UpdateLmsConsumerBindingRequest {
  identity_binding_id?: string
  commerce_binding_id?: string
  embedded_binding_id?: string | null
  access_policy?: LmsConsumerAccessPolicy
  provisioning_mode?: LmsConsumerProvisioningMode
  status?: LmsConsumerBindingStatus
}

export interface CreateLmsCommerceActivationRequest {
  consumer_binding_id: string
  entitlement_grant_id: string
  provisioning_grant_id?: string | null
  learner_principal_id?: string
  learner_label?: string
  program_ids?: string[]
  activation_kind?: LmsCommerceActivationKind
}

export interface UpdateLmsCommerceActivationRequest {
  status?: LmsCommerceActivationStatus
  revoked_at?: string | null
}

export interface ResolveLmsAccessRequest {
  portal_id: string
  learner_principal_id?: string | null
  learner_label?: string | null
  consumer_application_id?: string | null
}

export interface CreateLmsEnrollmentRequest {
  program_id: string
  learner_principal_id: string
  learner_label: string
  cohort_id?: string | null
  identity_binding_id?: string | null
  source?: LmsEnrollmentSource
  status?: LmsEnrollmentStatus
  progress_percent?: number
  due_at?: string | null
  started_at?: string | null
  completed_at?: string | null
  commerce_activation_ref?: string | null
}

export interface UpdateLmsEnrollmentRequest {
  learner_label?: string
  cohort_id?: string | null
  identity_binding_id?: string | null
  source?: LmsEnrollmentSource
  status?: LmsEnrollmentStatus
  progress_percent?: number
  due_at?: string | null
  started_at?: string | null
  completed_at?: string | null
  commerce_activation_ref?: string | null
}

export interface CreateLmsCohortRequest {
  portal_id: string
  name: string
  summary: string
  status?: LmsCohortStatus
  program_ids?: string[]
  learner_principal_ids?: string[]
  instructor_principal_ids?: string[]
  identity_binding_id?: string | null
  starts_at?: string | null
  ends_at?: string | null
  max_seats?: number | null
}

export interface UpdateLmsCohortRequest {
  name?: string
  summary?: string
  status?: LmsCohortStatus
  program_ids?: string[]
  learner_principal_ids?: string[]
  instructor_principal_ids?: string[]
  identity_binding_id?: string | null
  starts_at?: string | null
  ends_at?: string | null
  max_seats?: number | null
}

export interface CreateLmsCourseRunRequest {
  portal_id: string
  program_id: string
  title: string
  summary: string
  status?: LmsCourseRunStatus
  delivery_channel?: LmsCourseRunChannel
  cohort_ids?: string[]
  enrollment_ids?: string[]
  instructor_principal_ids?: string[]
  scheduled_start_at?: string | null
  scheduled_end_at?: string | null
}

export interface UpdateLmsCourseRunRequest {
  title?: string
  summary?: string
  status?: LmsCourseRunStatus
  delivery_channel?: LmsCourseRunChannel
  cohort_ids?: string[]
  enrollment_ids?: string[]
  instructor_principal_ids?: string[]
  scheduled_start_at?: string | null
  scheduled_end_at?: string | null
}

export interface LaunchLmsCourseRunResponse {
  generated_at: string
  course_run: LmsCourseRunRecord
  enrollments: LmsEnrollmentRecord[]
  created_count: number
  targeted_learner_count: number
}

export interface CreateLmsSessionRequest {
  course_run_id: string
  title: string
  summary: string
  session_type?: LmsSessionType
  status?: LmsSessionStatus
  scheduled_start_at?: string | null
  scheduled_end_at?: string | null
  facilitator_principal_ids?: string[]
  attendance_capture_mode?: LmsAttendanceCaptureMode
  join_url?: string | null
  location_label?: string | null
}

export interface UpdateLmsSessionRequest {
  title?: string
  summary?: string
  session_type?: LmsSessionType
  status?: LmsSessionStatus
  scheduled_start_at?: string | null
  scheduled_end_at?: string | null
  facilitator_principal_ids?: string[]
  attendance_capture_mode?: LmsAttendanceCaptureMode
  join_url?: string | null
  location_label?: string | null
}

export interface CreateLmsAttendanceRequest {
  session_id: string
  enrollment_id: string
  status?: LmsAttendanceStatus
  minutes_attended?: number
  note?: string
}

export interface UpdateLmsAttendanceRequest {
  status?: LmsAttendanceStatus
  minutes_attended?: number
  note?: string
}

export interface CreateLmsAssignmentRequest {
  program_id: string
  course_run_id?: string | null
  title: string
  summary: string
  assignment_type?: LmsAssignmentType
  status?: LmsAssignmentStatus
  grading_mode?: LmsGradingMode
  rubric_id?: string | null
  assessment_package_ref?: string | null
  max_attempts?: number
  max_points?: number
  passing_percent?: number
  available_from_at?: string | null
  due_at?: string | null
}

export interface UpdateLmsAssignmentRequest {
  title?: string
  summary?: string
  assignment_type?: LmsAssignmentType
  status?: LmsAssignmentStatus
  grading_mode?: LmsGradingMode
  rubric_id?: string | null
  assessment_package_ref?: string | null
  max_attempts?: number
  max_points?: number
  passing_percent?: number
  available_from_at?: string | null
  due_at?: string | null
  course_run_id?: string | null
}

export interface CreateLmsAttemptRequest {
  assignment_id: string
  enrollment_id: string
  response_summary?: string
}

export interface SubmitLmsAttemptRequest {
  response_summary?: string
  auto_score_percent?: number | null
}

export interface GradeLmsAttemptRequest {
  grader_principal_id?: string | null
  feedback?: string
  score_percent?: number | null
  rubric_id?: string | null
  rubric_scores?: Array<{
    criterion_id: string
    points_awarded: number
    note?: string
  }>
}

export interface UpdateLmsGradingQueueRequest {
  status?: LmsGradingQueueStatus
  priority?: LmsQueuePriority
  grader_principal_id?: string | null
}

export interface CreateLmsRubricRequest {
  program_id: string
  title: string
  summary: string
  status?: LmsRubricStatus
  criteria: Array<{
    label: string
    description?: string
    max_points: number
  }>
}

export interface UpdateLmsRubricRequest {
  title?: string
  summary?: string
  status?: LmsRubricStatus
  criteria?: Array<{
    id?: string
    label: string
    description?: string
    max_points: number
  }>
}

export interface CreateLmsCompetencyFrameworkRequest {
  portal_id: string
  title: string
  summary: string
  status?: LmsCompetencyFrameworkStatus
}

export interface UpdateLmsCompetencyFrameworkRequest {
  title?: string
  summary?: string
  status?: LmsCompetencyFrameworkStatus
}

export interface CreateLmsCompetencyRequest {
  framework_id: string
  program_id: string
  title: string
  summary: string
  status?: LmsCompetencyStatus
  evidence_type?: LmsCompetencyEvidenceType
  assignment_id?: string | null
  threshold_percent?: number
}

export interface UpdateLmsCompetencyRequest {
  title?: string
  summary?: string
  status?: LmsCompetencyStatus
  evidence_type?: LmsCompetencyEvidenceType
  assignment_id?: string | null
  threshold_percent?: number
}

export interface CreateLmsCompetencyAwardRequest {
  competency_id: string
  enrollment_id: string
  source_type?: LmsCompetencyAwardSource
  source_ref?: string | null
  note?: string
}

export interface CreateLmsBadgeAwardRequest {
  certification_id?: string | null
  certificate_id?: string | null
  enrollment_id: string
  badge_template_key?: string
  note?: string
}

export interface UpdateLmsBadgeAwardRequest {
  status?: LmsBadgeAwardStatus
  note?: string
  revoked_at?: string | null
}

export interface IssueLmsCertificateRequest {
  certification_id: string
  enrollment_id: string
  issued_at?: string | null
  note?: string
}

export interface UpdateLmsCertificateRequest {
  status?: LmsCertificateStatus
  note?: string
  revoked_at?: string | null
  expires_at?: string | null
}

export interface CreateLmsRecertificationRequest {
  certificate_id: string
  due_at?: string | null
  reminder_state?: LmsReminderState
}

export interface UpdateLmsRecertificationRequest {
  status?: LmsRecertificationStatus
  reminder_state?: LmsReminderState
  last_notified_at?: string | null
  renewed_certificate_id?: string | null
}

export type ServiceEntitlement = 'INTEGRATION_DISABLED' | 'INTEGRATION_ENABLED'

export interface TenantContextTenant {
  id: string
  name: string
  account_type: 'INDIVIDUAL' | 'ORGANIZATION'
  organization_kind?: 'GROUP' | 'COMPANY' | 'PUBLIC_SECTOR' | 'RESEARCH'
  domain?: string
  owner_user_id?: string
  subscription_tier: 'BASIC' | 'PRO' | 'ENTERPRISE' | 'GOVERNMENT'
  service_entitlement: ServiceEntitlement
  deployment_profile: 'SHARED_SAAS' | 'US_ENTERPRISE' | 'GOVERNMENT_SENSITIVE'
  assurance_mode: 'STANDARD' | 'HARDENED' | 'GOVERNMENT'
  features: string[]
  feature_aliases?: string[]
  max_users: number
  max_aircraft: number
  max_managed_assets?: number
  status: 'ACTIVE' | 'INACTIVE'
}

export interface TenantContextMembership {
  tenant_id: string
  role_id:
    | 'enterprise_admin'
    | 'government_program_admin'
    | 'service_operations_operator'
    | 'research_planner'
    | 'tenant_owner'
    | 'tenant_admin'
    | 'tenant_operator'
    | 'tenant_specialist'
    | 'tenant_viewer'
  role_alias_id?: string
  role_label: string
  permissions: string[]
  permission_aliases?: string[]
  accessible_surface_ids: string[]
  accessible_surface_aliases?: string[]
}

export interface CmsTenantAccessSummary {
  can_access_surface: boolean
  effective_permissions: CmsAccessPermission[]
  matched_role_ids: string[]
  matched_assignment_ids: string[]
  allowed_space_ids: string[]
  has_unrestricted_space_access: boolean
}

export interface TenantContextUser {
  id: string
  name: string
  email: string
  role: string
  tenant_ids: string[]
  default_tenant_id: string
  memberships: TenantContextMembership[]
  global_role_ids: Array<'super_administrator'>
  global_permissions: Array<'cms.read' | 'cms.manage' | 'iam.read' | 'iam.manage' | 'commerce.read' | 'commerce.manage' | 'lms.read' | 'lms.manage' | 'workforce.read' | 'workforce.manage' | 'scheduling.read' | 'scheduling.manage' | 'communications.read' | 'communications.manage'>
  global_accessible_surface_ids: string[]
  global_accessible_surface_aliases?: string[]
}

export interface IdentitySessionContext {
  provider_id: string
  provider_display_name: string
  provider_mode: 'LOCAL_DIRECTORY' | 'CONTROL_PLANE_BRIDGE'
  session_id: string
  user_id: string
  tenant_id: string | null
  tenant_selection_source: 'header' | 'default'
  authenticated_at: string
  assurance_level: 'STANDARD' | 'MFA' | 'HARDENED' | 'GOVERNMENT'
  session_transport: 'header_session' | 'bearer_session'
  auth_entrypoint: 'email_password' | 'oidc_authorization_code_pkce' | 'provider_token_exchange' | 'trusted_header_gateway'
  identity_source: 'local_credentials' | 'control_plane_provider' | 'trusted_request_headers'
  directory_source: 'local_directory' | 'external_identity_sync'
  provider_deployment: 'local' | 'aws_native' | 'commercial' | 'open_source'
  external_user_id: string | null
  provider_session_id: string | null
  trusted_header_keys: string[]
}

export interface SecretStoreSummary {
  provider: 'LOCAL_ENCRYPTED_FILE'
  encryption: 'AES-256-GCM'
  key_source: 'ENV_CONFIGURED' | 'DEVELOPMENT_FALLBACK'
  managed_secret_count: number
  active_secret_count: number
  disabled_secret_count: number
}

export interface IdentityProviderSummary {
  provider_id: string
  provider_display_name: string
  provider_mode: 'LOCAL_DIRECTORY' | 'CONTROL_PLANE_BRIDGE'
  auth_entrypoint: 'email_password' | 'oidc_authorization_code_pkce' | 'provider_token_exchange' | 'trusted_header_gateway'
  session_transport: 'header_session' | 'bearer_session'
  directory_source: 'local_directory' | 'external_identity_sync'
  sso_status: 'local_ready' | 'provider_connected' | 'provider_sync_required' | 'not_configured'
  mfa_status: 'local_secret_store' | 'provider_managed'
  provisioning_status: 'local_directory' | 'external_identity_sync' | 'sync_required'
  secret_store_provider: 'LOCAL_ENCRYPTED_FILE'
  secret_store_key_source: 'ENV_CONFIGURED' | 'DEVELOPMENT_FALLBACK'
  production_gap: string
}

export interface UserSecurityControlState {
  user_id: string
  password_managed: boolean
  password_reference_id: string | null
  password_last_rotated_at: string | null
  two_factor_enrolled: boolean
  totp_reference_id: string | null
  backup_codes_reference_id: string | null
  two_factor_enrolled_at: string | null
  two_factor_disabled_at: string | null
}

export interface SecurityControlPlaneSummary {
  generated_at: string
  provider: IdentityProviderSummary
  session: IdentitySessionContext
  secret_store: SecretStoreSummary
  user_security: UserSecurityControlState
}

export interface SecuritySessionSummary {
  session_id: string
  user_id: string
  tenant_id: string | null
  authenticated_at: string
  issued_at: string
  last_seen_at: string
  expires_at: string
  assurance_level: 'STANDARD' | 'MFA' | 'HARDENED' | 'GOVERNMENT'
  provider_id: string
  provider_display_name: string
  provider_mode: 'LOCAL_DIRECTORY' | 'CONTROL_PLANE_BRIDGE'
  provider_deployment: 'local' | 'aws_native' | 'commercial' | 'open_source'
  session_transport: 'header_session' | 'bearer_session'
  auth_entrypoint: 'email_password' | 'oidc_authorization_code_pkce' | 'provider_token_exchange' | 'trusted_header_gateway'
  identity_source: 'local_credentials' | 'control_plane_provider' | 'trusted_request_headers'
  directory_source: 'local_directory' | 'external_identity_sync'
  external_user_id: string | null
  provider_session_id: string | null
  is_current: boolean
}

export interface SecuritySessionListResponse {
  sessions: SecuritySessionSummary[]
  count: number
  current_session_id: string | null
}

export type ControlPlaneDomain = 'identity' | 'billing' | 'organization'
export type ControlPlaneMode = 'local' | 'hybrid' | 'external'
export type ControlPlaneStatus = 'connected' | 'not_configured' | 'needs_attention' | 'sync_required'
export type ProviderDeployment = 'local' | 'aws_native' | 'commercial' | 'open_source'
export type ManagedTenantRole = 'admin' | 'operator' | 'specialist' | 'viewer'
export type ManagedTenantRoleAlias = ManagedTenantRole
export type ManagedTenantRoleReference = ManagedTenantRole
export type StandaloneRoleTarget = ManagedTenantRoleReference | 'developer'

export interface ControlPlaneConfigurationField {
  id: string
  label: string
  type: 'text' | 'password' | 'boolean' | 'number' | 'select'
  required: boolean
  secret?: boolean
  placeholder?: string
  options?: string[]
  help_text?: string
}

export interface ControlPlaneProviderDefinition {
  id: string
  domain: ControlPlaneDomain
  label: string
  vendor: string
  deployment: ProviderDeployment
  summary: string
  capabilities: string[]
  configuration_fields: ControlPlaneConfigurationField[]
}

export interface ControlPlaneSecretFieldReference {
  field_id: string
  reference_id: string
  preview: string
  last_rotated_at: string
}

export interface TenantControlPlaneDomainConfiguration {
  tenant_id: string
  domain: ControlPlaneDomain
  mode: ControlPlaneMode
  status: ControlPlaneStatus
  provider_id: string
  provider_label: string
  vendor: string
  deployment: ProviderDeployment
  sync_enabled: boolean
  last_sync_at: string | null
  external_reference_id: string | null
  notes: string | null
  configuration: Record<string, string | number | boolean>
  secret_fields: ControlPlaneSecretFieldReference[]
  capabilities: string[]
}

export interface TenantControlPlaneConfiguration {
  generated_at: string
  tenant_id: string
  identity: TenantControlPlaneDomainConfiguration
  billing: TenantControlPlaneDomainConfiguration
  organization: TenantControlPlaneDomainConfiguration
}

export interface ControlPlaneCatalogResponse {
  generated_at: string
  providers: ControlPlaneProviderDefinition[]
  count: number
}

export interface UpdateControlPlaneDomainRequest {
  mode?: ControlPlaneMode
  provider_id?: string
  sync_enabled?: boolean
  external_reference_id?: string | null
  notes?: string | null
  configuration?: Record<string, string | number | boolean>
}

export interface ExternalIdentityMember {
  id: string
  tenant_id: string
  external_user_id: string
  email: string
  firstName: string
  lastName: string
  role: ManagedTenantRole
  role_alias?: ManagedTenantRoleAlias
  status: 'active' | 'inactive' | 'suspended'
  lastLogin: string
  managementScope: 'external_identity'
  provider_id: string
  provider_label: string
  provider_deployment: ProviderDeployment
  source_groups: string[]
  last_sync_at: string
}

export interface ExternalIdentityMemberListResponse {
  members: ExternalIdentityMember[]
  count: number
}

export interface SyncExternalIdentityMembersRequest {
  members?: Array<{
    external_user_id?: string
    email: string
    firstName?: string
    lastName?: string
    role?: ManagedTenantRole | ManagedTenantRoleAlias
    status?: 'active' | 'inactive' | 'suspended'
    lastLogin?: string
    source_groups?: string[]
  }>
}

export type FeatureFlagCategory = 'integration' | 'product'
export type FeatureFlagScope = 'global' | 'tenant' | 'hybrid'
export type FeatureFlagValueType = 'boolean' | 'variant'
export type FaaServiceMode = 'disabled' | 'simulated' | 'real'
export type FaaIntegrationService = 'laanc' | 'b4ufly'
export type FaaAdapterRuntimeMode = 'simulated' | 'real'
export type FaaAdapterDeployment = 'local' | 'aws_native' | 'commercial' | 'open_source' | 'faa_direct'
export type FaaAdapterProvider = 'idp' | 'faa' | 'airspace_link' | 'aloft' | 'custom'
export type FaaAdapterContractStatus = 'built_in' | 'published_api' | 'partner_private' | 'faa_program'
export type FaaAdapterAuthProfile =
  | 'none'
  | 'api_key'
  | 'bearer_token'
  | 'oauth2_client_credentials'
  | 'custom_partner'
export type FaaAdapterConnectionStrategy =
  | 'internal_simulation'
  | 'external_proxy_contract'
  | 'native_provider_api'
  | 'faa_program_adapter'
export type FaaServiceStatus = 'disabled' | 'ready' | 'configuration_required' | 'degraded'
export type IntegrationServiceMode = FaaServiceMode
export type IntegrationAdapterService = FaaIntegrationService
export type IntegrationAdapterRuntimeMode = FaaAdapterRuntimeMode
export type IntegrationAdapterDeployment = FaaAdapterDeployment
export type IntegrationAdapterProvider = FaaAdapterProvider
export type IntegrationAdapterContractStatus = FaaAdapterContractStatus
export type IntegrationAdapterAuthProfile = FaaAdapterAuthProfile
export type IntegrationAdapterConnectionStrategy = FaaAdapterConnectionStrategy
export type IntegrationServiceStatus = FaaServiceStatus

export interface FeatureFlagDefinition {
  key: string
  name: string
  description: string
  category: FeatureFlagCategory
  scope: FeatureFlagScope
  value_type: FeatureFlagValueType
  default_value: boolean | string
  options?: string[]
  impacts: string[]
}

export interface ResolvedFeatureFlag extends FeatureFlagDefinition {
  value: boolean | string
  source: 'default' | 'global_override' | 'tenant_override'
  updated_at: string | null
  updated_by: string | null
}

export interface FeatureFlagListResponse {
  generated_at: string
  tenant_id: string | null
  flags: ResolvedFeatureFlag[]
  count: number
}

export interface FaaAdapterConfigurationField {
  id: string
  label: string
  type: 'text' | 'password' | 'number' | 'boolean' | 'select'
  required: boolean
  secret?: boolean
  placeholder?: string
  options?: string[]
  help_text?: string
}
export type IntegrationAdapterConfigurationField = FaaAdapterConfigurationField

export interface FaaAdapterEndpointFamily {
  id: string
  label: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'MULTI'
  path: string | null
  coverage: 'simulated' | 'published' | 'private'
  summary: string
}
export type IntegrationAdapterEndpointFamily = FaaAdapterEndpointFamily

export interface FaaAdapterDefinition {
  id: string
  service: FaaIntegrationService
  runtime_mode: FaaAdapterRuntimeMode
  label: string
  provider: FaaAdapterProvider
  provider_label: string
  deployment: FaaAdapterDeployment
  connection_strategy: FaaAdapterConnectionStrategy
  contract_status: FaaAdapterContractStatus
  auth_profile: FaaAdapterAuthProfile
  summary: string
  supports_offline: boolean
  capabilities: string[]
  docs_url: string | null
  endpoint_families: FaaAdapterEndpointFamily[]
  configuration_fields: FaaAdapterConfigurationField[]
}
export type IntegrationAdapterDefinition = FaaAdapterDefinition

export interface FaaSecretFieldReference {
  field_id: string
  reference_id: string
  preview: string
  last_rotated_at: string
}
export type IntegrationSecretFieldReference = FaaSecretFieldReference

export interface FaaServiceBindingConfiguration {
  runtime_mode: FaaAdapterRuntimeMode
  adapter_id: string
  adapter_label: string
  provider: FaaAdapterProvider
  provider_label: string
  deployment: FaaAdapterDeployment
  connection_strategy: FaaAdapterConnectionStrategy
  contract_status: FaaAdapterContractStatus
  auth_profile: FaaAdapterAuthProfile
  summary: string
  supports_offline: boolean
  capabilities: string[]
  docs_url: string | null
  endpoint_families: FaaAdapterEndpointFamily[]
  configuration_fields: FaaAdapterConfigurationField[]
  configuration: Record<string, string | number | boolean>
  secret_fields: FaaSecretFieldReference[]
  external_reference_id: string | null
  notes: string | null
  last_verified_at: string | null
  status: FaaServiceStatus
}
export type IntegrationServiceBindingConfiguration = FaaServiceBindingConfiguration

export interface FaaServiceConfiguration {
  service: FaaIntegrationService
  tenant_id: string | null
  feature_flag: ResolvedFeatureFlag
  entitled: boolean
  backend_mode: FaaServiceMode
  surface_enabled: boolean
  status: FaaServiceStatus
  active_runtime_mode: FaaAdapterRuntimeMode | null
  active_binding: FaaServiceBindingConfiguration | null
  simulated_binding: FaaServiceBindingConfiguration
  real_binding: FaaServiceBindingConfiguration
  availability_reason: string | null
}
export type IntegrationServiceConfiguration = FaaServiceConfiguration

export interface FaaIntegrationCatalogResponse {
  generated_at: string
  adapters: FaaAdapterDefinition[]
  count: number
}
export type IntegrationAdapterCatalogResponse = FaaIntegrationCatalogResponse

export interface FaaIntegrationConfigurationResponse {
  generated_at: string
  tenant_id: string | null
  laanc: FaaServiceConfiguration
  b4ufly: FaaServiceConfiguration
}
export type IntegrationAdapterConfigurationResponse = FaaIntegrationConfigurationResponse

export interface UpdateFaaBindingRequest {
  adapter_id?: string
  external_reference_id?: string | null
  notes?: string | null
  configuration?: Record<string, unknown>
}
export type UpdateIntegrationBindingRequest = UpdateFaaBindingRequest

export interface FaaIntegrationVerificationResult {
  checked_at: string
  service: FaaIntegrationService
  runtime_mode: FaaAdapterRuntimeMode | null
  status: FaaServiceStatus
  ok: boolean
  adapter_id: string | null
  adapter_label: string | null
  detail: string
}
export type IntegrationVerificationResult = FaaIntegrationVerificationResult

export type DeploymentIdentityMfaRequirement = 'OPTIONAL' | 'REQUIRED' | 'HARDWARE_PREFERRED'
export type DeploymentDataResidencyRule = 'US_ONLY' | 'US_GOV_CLOUD' | 'CUSTOMER_CONTROLLED_US'
export type DeploymentSupportAccessRule = 'STANDARD' | 'CUSTOMER_APPROVAL_REQUIRED' | 'RESTRICTED_EMERGENCY_ONLY'
export type DeploymentCredentialOwnershipRule = 'PLATFORM_MANAGED' | 'CUSTOMER_MANAGED' | 'HYBRID'

export interface DeploymentProfileConfigurationRecord {
  tenant_id: string
  deployment_profile: TenantContextTenant['deployment_profile']
  assurance_mode: TenantContextTenant['assurance_mode']
  identity_mfa_requirement: DeploymentIdentityMfaRequirement
  data_residency_rule: DeploymentDataResidencyRule
  support_access_rule: DeploymentSupportAccessRule
  integration_credential_ownership: DeploymentCredentialOwnershipRule
  logging_retention_days: number
  evidence_retention_days: number
  command_center_enabled: boolean
  public_program_enabled: boolean
  public_sector_ops_enabled?: boolean
  notes: string | null
  updated_at: string
  updated_by: string
}

export interface DeploymentProfileConfigurationResponse {
  generated_at: string
  tenant_id: string
  tenant_name: string
  account_type: TenantContextTenant['account_type']
  organization_kind: TenantContextTenant['organization_kind'] | null
  subscription_tier: TenantContextTenant['subscription_tier']
  service_entitlement: TenantContextTenant['service_entitlement']
  current: DeploymentProfileConfigurationRecord
  available: {
    deployment_profiles: TenantContextTenant['deployment_profile'][]
    assurance_modes: TenantContextTenant['assurance_mode'][]
    identity_mfa_requirements: DeploymentIdentityMfaRequirement[]
    data_residency_rules: DeploymentDataResidencyRule[]
    support_access_rules: DeploymentSupportAccessRule[]
    integration_credential_ownership_options: DeploymentCredentialOwnershipRule[]
  }
}

export interface UpdateDeploymentProfileConfigurationRequest {
  deployment_profile?: TenantContextTenant['deployment_profile']
  assurance_mode?: TenantContextTenant['assurance_mode']
  identity_mfa_requirement?: DeploymentIdentityMfaRequirement
  data_residency_rule?: DeploymentDataResidencyRule
  support_access_rule?: DeploymentSupportAccessRule
  integration_credential_ownership?: DeploymentCredentialOwnershipRule
  logging_retention_days?: number
  evidence_retention_days?: number
  command_center_enabled?: boolean
  public_sector_ops_enabled?: boolean
  public_program_enabled?: boolean
  notes?: string | null
}

export interface AdminAuditEvent {
  id: string
  sequence: number
  tenant_id: string
  actor_user_id: string
  actor_name: string
  actor_email: string
  action:
    | 'ACCOUNT_REGISTERED'
    | 'OPERATING_PROFILE_UPDATED'
    | 'SOLUTION_PACK_ASSIGNMENTS_UPDATED'
    | 'TRAINING_ENROLLMENT_CREATED'
    | 'TRAINING_COMPLETION_RECORDED'
    | 'TRAINING_LESSON_COMPLETED'
    | 'TRAINING_ASSESSMENT_RECORDED'
    | 'TRAINING_ASSESSMENT_SESSION_SUBMITTED'
    | 'QUALIFICATIONS_IMPORTED'
    | 'CLIENT_CREATED'
    | 'CLIENT_UPDATED'
    | 'PROJECT_CREATED'
    | 'PROJECT_UPDATED'
    | 'PROJECT_ARTIFACT_UPDATED'
    | 'WORKFLOW_ASSET_CREATED'
    | 'WORKFLOW_ASSET_UPDATED'
    | 'DELIVERABLE_CREATED'
    | 'DELIVERABLE_PUBLISHED'
    | 'PASSWORD_ROTATED'
    | 'TWO_FACTOR_ENABLED'
    | 'TWO_FACTOR_DISABLED'
    | 'CERTIFICATION_CREATED'
    | 'CERTIFICATION_UPDATED'
    | 'CERTIFICATION_DELETED'
    | 'TEAM_MEMBER_INVITED'
    | 'TEAM_MEMBER_UPDATED'
    | 'TEAM_MEMBER_REMOVED'
    | 'DEVELOPER_APP_CREATED'
    | 'DEVELOPER_APP_CONTROLS_UPDATED'
    | 'DEVELOPER_APP_PROMOTION_REQUESTED'
    | 'DEVELOPER_APP_PROMOTION_APPROVED'
    | 'DEVELOPER_APP_PROMOTION_REJECTED'
    | 'DEVELOPER_APP_KEY_ROTATED'
    | 'WEBHOOK_SUBSCRIPTION_CREATED'
    | 'WEBHOOK_SUBSCRIPTION_TOGGLED'
    | 'ORGANIZATION_PROFILE_UPDATED'
    | 'BILLING_PROFILE_UPDATED'
    | 'CONTROL_PLANE_CONFIG_UPDATED'
    | 'IDENTITY_DIRECTORY_SYNCED'
  entity_type: string
  entity_id: string
  source_route: string
  correlation_id?: string
  outcome: 'SUCCESS'
  occurred_at: string
  summary: string
  metadata: Record<string, unknown>
  previous_hash: string | null
  entry_hash: string
}

export interface AdminAuditLogResponse {
  events: AdminAuditEvent[]
  count: number
}

export interface TenantContextResponse {
  current_user: TenantContextUser
  current_membership: TenantContextMembership | null
  selected_tenant: TenantContextTenant | null
  available_tenants: TenantContextTenant[]
  operating_profile: OperatingProfileResponse | null
  cms_access?: CmsTenantAccessSummary | null
  selection_source: 'requested' | 'default' | 'fallback'
  warnings: string[]
  identity: SecurityControlPlaneSummary
  correlation_id: string
  timestamp: string
}

export type SegmentId =
  | 'RECREATIONAL_PERSONAL'
  | 'SOLO_COMMERCIAL'
  | 'ENTERPRISE_OPERATIONS'
  | 'MUNICIPAL_PROGRAM'
  | 'PUBLIC_SAFETY'
  | 'DEVELOPER_PARTNER'
  | 'TRAINING_EDUCATION'

export type SolutionPackId =
  | 'RECREATIONAL_STARTER'
  | 'SOLO_COMMERCIAL'
  | 'INSPECTION'
  | 'SURVEY_MAPPING'
  | 'MUNICIPAL_PROGRAM'
  | 'PUBLIC_SAFETY'
  | 'DEVELOPER_PLATFORM'
  | 'TRAINING_ACADEMY'

export type TrainingEntitlement =
  | 'TRAINING_DISABLED'
  | 'CERTIFICATION_PREP'
  | 'COMMERCIAL_READINESS'
  | 'ORGANIZATION_READINESS'

export type TrainingCatalogMode =
  | 'NONE'
  | 'CERTIFICATION_CORE'
  | 'INDIVIDUAL_ALL_ACCESS'
  | 'ORGANIZATION_ALL_ACCESS'

export type TrainingAddOnId =
  | 'ADDON_COMMERCIAL_CORE'
  | 'ADDON_REAL_ESTATE_MEDIA'
  | 'ADDON_AGRICULTURE_FIELD'
  | 'ADDON_INSPECTION_READINESS'
  | 'ADDON_SURVEY_MAPPING'
  | 'ADDON_MUNICIPAL_PROGRAM'
  | 'ADDON_MUNICIPAL_FIELD'
  | 'ADDON_PUBLIC_SAFETY_UAS'
  | 'ADDON_PUBLIC_SAFETY_COMMAND'
  | 'ADDON_DEVELOPER_PLATFORM'

export interface SegmentDefinition {
  id: SegmentId
  name: string
  buyer_type: 'individual' | 'team' | 'organization' | 'public_sector' | 'developer' | 'education'
  summary: string
  supported_account_types: Array<'INDIVIDUAL' | 'ORGANIZATION'>
  docs_entry_route: string
  onboarding_route: string
  primary_use_cases: string[]
}

export interface SegmentCatalogResponse {
  generated_at: string
  segments: SegmentDefinition[]
  count: number
}

export interface SolutionPackDefinition {
  id: SolutionPackId
  name: string
  category: 'core' | 'vertical' | 'public_sector' | 'developer' | 'training'
  target_segments: SegmentId[]
  summary: string
  default_docs_route: string
  onboarding_route: string
  template_bundle_ids: string[]
  deliverable_profiles: string[]
  training_focus: string[]
  required_features: string[]
}

export interface SolutionPackCatalogResponse {
  generated_at: string
  packs: SolutionPackDefinition[]
  count: number
  tenant_id: string
  segment_id: SegmentId
  assigned_pack_ids: SolutionPackId[]
  primary_pack_id: SolutionPackId | null
  assigned_packs: SolutionPackDefinition[]
  available_packs: SolutionPackDefinition[]
}

export interface TrainingEntitlementDefinition {
  id: TrainingEntitlement
  name: string
  summary: string
  audience: 'individual' | 'team' | 'organization'
  available_subscription_tiers: Array<'BASIC' | 'PRO' | 'ENTERPRISE' | 'GOVERNMENT'>
}

export interface TrainingAddOnDefinition {
  id: TrainingAddOnId
  name: string
  summary: string
  audience: 'individual' | 'team' | 'organization'
  available_subscription_tiers: Array<'BASIC' | 'PRO' | 'ENTERPRISE' | 'GOVERNMENT'>
  price_monthly_cents: number
  price_annual_cents: number
}

export interface TrainingEntitlementsResponse {
  generated_at: string
  tenant_id: string
  subscription_tier: TenantContextTenant['subscription_tier']
  service_entitlement: TenantContextTenant['service_entitlement']
  current_training_entitlement: TrainingEntitlement
  catalog_mode: TrainingCatalogMode
  purchased_training_addon_ids: TrainingAddOnId[]
  available_training_entitlements: TrainingEntitlementDefinition[]
  available_training_addons: TrainingAddOnDefinition[]
}

export interface OperatingProfileRecord {
  tenant_id: string
  segment_id: SegmentId
  training_entitlement: TrainingEntitlement
  training_catalog_mode: TrainingCatalogMode
  training_addon_ids: TrainingAddOnId[]
  assigned_pack_ids: SolutionPackId[]
  primary_pack_id: SolutionPackId | null
  updated_at: string
  updated_by: string
}

export interface OperatingProfileResponse {
  generated_at: string
  tenant_id: string
  tenant_name: string
  current: OperatingProfileRecord
  segment: SegmentDefinition
  available_segments: SegmentDefinition[]
  assigned_packs: SolutionPackDefinition[]
  available_packs: SolutionPackDefinition[]
  available_training_entitlements: TrainingEntitlementDefinition[]
  available_training_addons: TrainingAddOnDefinition[]
  resolved_docs_route: string
  resolved_onboarding_route: string
  runtime_posture: {
    integration_enabled: boolean
    service_entitlement_enabled: boolean
    training_enabled: boolean
    command_center_enabled: boolean
    public_program_enabled: boolean
    public_sector_ops_enabled?: boolean
    developer_portal_enabled: boolean
  }
  warnings: string[]
}

export interface UpdateOperatingProfileRequest {
  segment_id?: SegmentId
  training_entitlement?: TrainingEntitlement
  training_addon_ids?: TrainingAddOnId[]
}

export interface UpdateSolutionPackAssignmentsRequest {
  pack_ids: SolutionPackId[]
  primary_pack_id?: SolutionPackId | null
}

export interface SolutionPackAssignmentsResponse {
  generated_at: string
  tenant_id: string
  segment_id: SegmentId
  assigned_pack_ids: SolutionPackId[]
  primary_pack_id: SolutionPackId | null
  assigned_packs: SolutionPackDefinition[]
  available_packs: SolutionPackDefinition[]
}

export type ClientVertical =
  | 'GENERAL_COMMERCIAL'
  | 'INSPECTION'
  | 'SURVEY_MAPPING'
  | 'MUNICIPAL'
  | 'PUBLIC_SAFETY'
  | 'DEVELOPER'
  | 'TRAINING'

export type ClientStatus = 'PROSPECT' | 'ACTIVE' | 'INACTIVE'

export interface ClientRecord {
  id: string
  tenant_id: string
  name: string
  status: ClientStatus
  vertical: ClientVertical
  preferred_pack_id: SolutionPackId | null
  primary_contact_name: string
  primary_contact_email: string
  primary_contact_phone: string | null
  billing_city: string | null
  notes: string | null
  tags: string[]
  created_at: string
  updated_at: string
  last_activity_at: string
}

export interface ClientListParams {
  search?: string
  status?: ClientStatus | 'ALL'
  vertical?: ClientVertical | 'ALL'
  sort_field?: 'name' | 'status' | 'vertical' | 'last_activity_at' | 'updated_at'
  sort_direction?: 'asc' | 'desc'
  page?: number
  page_size?: number
}

export interface ClientListResponse {
  generated_at: string
  tenant_id: string
  clients: ClientRecord[]
  count: number
  page: number
  page_size: number
  total_pages: number
  total_count: number
  summary: {
    active: number
    prospects: number
    inactive: number
  }
}

export interface CreateClientRequest {
  name: string
  status?: ClientStatus
  vertical?: ClientVertical
  preferred_pack_id?: SolutionPackId | null
  primary_contact_name?: string
  primary_contact_email?: string
  primary_contact_phone?: string | null
  billing_city?: string | null
  notes?: string | null
  tags?: string[]
}

export interface UpdateClientRequest extends Partial<CreateClientRequest> {}

export type CrmCustomerProfileKind = 'INDIVIDUAL' | 'BUSINESS' | 'INSTITUTION' | 'AGENCY' | 'STAKEHOLDER'
export type CrmCustomerLifecycleState = 'PROSPECT' | 'ACTIVE' | 'PAUSED' | 'INACTIVE' | 'ARCHIVED'
export type CrmCustomerRelationshipType = 'PARENT_CHILD' | 'STAKEHOLDER_OF' | 'MANAGED_ENTITY_OF' | 'ACCOUNT_TEAM_MEMBER'
export type CrmLeadStatus = 'NEW' | 'QUALIFYING' | 'NURTURING' | 'QUALIFIED' | 'CONVERTED' | 'DISQUALIFIED'
export type CrmLeadSource = 'WEB' | 'REFERRAL' | 'PARTNER' | 'INBOUND_CALL' | 'EVENT' | 'MANUAL'
export type CrmOpportunityStage = 'QUALIFICATION' | 'DISCOVERY' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST'
export type CrmActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'DEMO' | 'TASK_EVENT' | 'STAGE_CHANGE'
export type CrmTaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type CrmTaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type CrmCaseStatus = 'NEW' | 'TRIAGE' | 'IN_PROGRESS' | 'PENDING_CUSTOMER' | 'RESOLVED' | 'CLOSED'
export type CrmCasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type CrmCaseSeverity = 'S1' | 'S2' | 'S3' | 'S4'
export type CrmCaseSource = 'PORTAL' | 'EMAIL' | 'PHONE' | 'CHAT' | 'INTERNAL'
export type CrmCaseQueueAssignmentMode = 'ROUND_ROBIN' | 'OWNER_PREFERRED' | 'MANUAL'
export type CrmCaseSlaPolicyStatus = 'ACTIVE' | 'INACTIVE'
export type CrmCaseEscalationStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'
export type CrmAutomationObjectType = 'CUSTOMER' | 'LEAD' | 'OPPORTUNITY' | 'CASE' | 'TASK'
export type CrmAutomationTriggerEvent = 'CREATED' | 'UPDATED' | 'STATUS_CHANGED' | 'STAGE_CHANGED' | 'ESCALATED'
export type CrmAutomationRuleStatus = 'ACTIVE' | 'INACTIVE'
export type CrmApprovalActionType = 'UPDATE' | 'ASSIGN' | 'CLOSE' | 'MERGE' | 'DISCOUNT'
export type CrmApprovalPolicyStatus = 'ACTIVE' | 'INACTIVE'
export type CrmApprovalRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
export type CrmSharingPrincipalType = 'ROLE' | 'TEAM' | 'USER'
export type CrmSharingAccessLevel = 'READ' | 'WRITE' | 'ADMIN'
export type CrmSharingRuleStatus = 'ACTIVE' | 'INACTIVE'
export type CrmFieldClassification = 'PII' | 'SENSITIVE' | 'FINANCIAL' | 'OPERATIONAL' | 'PUBLIC'
export type CrmFieldWritePolicy = 'OWNER_ONLY' | 'ROLE_RESTRICTED' | 'APPROVAL_REQUIRED' | 'OPEN'
export type CrmFieldMaskingStrategy = 'NONE' | 'PARTIAL' | 'FULL'
export type CrmFieldGovernanceRuleStatus = 'ACTIVE' | 'INACTIVE'
export type CrmGovernanceAuditDomain = 'AUTOMATION' | 'APPROVAL' | 'SHARING' | 'FIELD_GOVERNANCE'
export type CrmForecastBucket = 'PIPELINE' | 'COMMIT' | 'WON'
export type CrmForecastPublicationStatus = 'PUBLISHED'
export type CrmWebhookSubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
export type CrmOutboundEventStatus = 'READY' | 'DISPATCHED'
export type CrmCampaignCoordinationStatus = 'DRAFT' | 'READY_FOR_HANDOFF' | 'HANDED_OFF' | 'COMPLETED' | 'CANCELLED'
export type CrmCustomerRecordStatus = 'ACTIVE' | 'ARCHIVED'
export type CrmCustomerBindingStatus = 'ACTIVE' | 'STALE' | 'ARCHIVED'
export type CrmCustomerOperationJobKind = 'IMPORT' | 'EXPORT' | 'MERGE' | 'RECONCILE'
export type CrmCustomerOperationJobStatus = 'REQUESTED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'ARCHIVED'

export interface CrmValidationDomain {
  id: string
  name: string
  summary: string
  proves: string[]
  migration_blocked: boolean
}

export interface CrmCustomerProfileRecord {
  id: string
  tenant_id: string
  external_key: string | null
  kind: CrmCustomerProfileKind
  name: string
  lifecycle_state: CrmCustomerLifecycleState
  record_status: CrmCustomerRecordStatus
  preferred_pack_id: string | null
  primary_contact_name: string
  primary_contact_email: string
  primary_contact_phone: string | null
  service_city: string | null
  notes: string | null
  tags: string[]
  created_at: string
  updated_at: string
  last_activity_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CrmCustomerRelationshipRecord {
  id: string
  tenant_id: string
  source_customer_id: string
  target_customer_id: string
  relationship_type: CrmCustomerRelationshipType
  status: CrmCustomerRecordStatus
  notes: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CrmCustomerLeadRecord {
  id: string
  tenant_id: string
  external_key: string | null
  full_name: string
  company_name: string | null
  email: string
  phone: string | null
  status: CrmLeadStatus
  source: CrmLeadSource
  owner_user_id: string | null
  score: number | null
  notes: string | null
  tags: string[]
  converted_customer_id: string | null
  converted_opportunity_id: string | null
  disqualification_reason: string | null
  converted_at: string | null
  created_at: string
  updated_at: string
  last_activity_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CrmCustomerOpportunityRecord {
  id: string
  tenant_id: string
  customer_id: string
  lead_id: string | null
  name: string
  stage: CrmOpportunityStage
  owner_user_id: string | null
  amount: number | null
  currency: string | null
  probability_percent: number | null
  expected_close_at: string | null
  close_reason: string | null
  next_step: string | null
  notes: string | null
  tags: string[]
  created_at: string
  updated_at: string
  closed_at: string | null
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CrmCustomerActivityRecord {
  id: string
  tenant_id: string
  customer_id: string | null
  lead_id: string | null
  opportunity_id: string | null
  activity_type: CrmActivityType
  subject: string
  details: string | null
  occurred_at: string
  created_at: string
  created_by_user_id: string
}

export interface CrmCustomerTaskRecord {
  id: string
  tenant_id: string
  customer_id: string | null
  lead_id: string | null
  opportunity_id: string | null
  title: string
  description: string | null
  status: CrmTaskStatus
  priority: CrmTaskPriority
  due_at: string | null
  assignee_user_id: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CrmCustomerCaseQueueRecord {
  id: string
  tenant_id: string
  name: string
  description: string | null
  assignment_mode: CrmCaseQueueAssignmentMode
  default_owner_user_id: string | null
  status: CrmCustomerRecordStatus
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CrmCustomerCaseRecord {
  id: string
  tenant_id: string
  customer_id: string
  lead_id: string | null
  opportunity_id: string | null
  title: string
  description: string | null
  status: CrmCaseStatus
  priority: CrmCasePriority
  severity: CrmCaseSeverity
  source: CrmCaseSource
  queue_id: string | null
  owner_user_id: string | null
  sla_policy_id: string | null
  first_response_due_at: string | null
  resolution_due_at: string | null
  first_response_at: string | null
  opened_at: string
  resolved_at: string | null
  closed_at: string | null
  last_activity_at: string
  tags: string[]
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CrmCustomerCaseSlaPolicyRecord {
  id: string
  tenant_id: string
  name: string
  queue_id: string | null
  priority_scope: CrmCasePriority | 'ALL'
  severity_scope: CrmCaseSeverity | 'ALL'
  first_response_target_minutes: number
  resolution_target_minutes: number
  status: CrmCaseSlaPolicyStatus
  notes: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CrmCustomerCaseEscalationRecord {
  id: string
  tenant_id: string
  case_id: string
  escalation_level: number
  reason: string
  status: CrmCaseEscalationStatus
  queue_id: string | null
  assigned_user_id: string | null
  triggered_at: string
  acknowledged_at: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CrmCustomerAutomationRuleRecord {
  id: string
  tenant_id: string
  object_type: CrmAutomationObjectType
  trigger_event: CrmAutomationTriggerEvent
  name: string
  condition_summary: string
  action_summary: string
  status: CrmAutomationRuleStatus
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CrmCustomerApprovalPolicyRecord {
  id: string
  tenant_id: string
  object_type: CrmAutomationObjectType
  action_type: CrmApprovalActionType
  name: string
  criteria_summary: string
  approver_role: string
  status: CrmApprovalPolicyStatus
  notes: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CrmCustomerApprovalRequestRecord {
  id: string
  tenant_id: string
  policy_id: string
  object_type: CrmAutomationObjectType
  object_id: string
  action_type: CrmApprovalActionType
  reason: string
  status: CrmApprovalRequestStatus
  requested_by_user_id: string
  decided_by_user_id: string | null
  decision_reason: string | null
  requested_at: string
  decided_at: string | null
  created_at: string
  updated_at: string
}

export interface CrmCustomerSharingRuleRecord {
  id: string
  tenant_id: string
  object_type: CrmAutomationObjectType
  principal_type: CrmSharingPrincipalType
  principal_id: string
  access_level: CrmSharingAccessLevel
  condition_summary: string
  status: CrmSharingRuleStatus
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CrmCustomerFieldGovernanceRuleRecord {
  id: string
  tenant_id: string
  object_type: CrmAutomationObjectType
  field_name: string
  classification: CrmFieldClassification
  write_policy: CrmFieldWritePolicy
  masking_strategy: CrmFieldMaskingStrategy
  status: CrmFieldGovernanceRuleStatus
  rationale: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CrmCustomerGovernanceAuditEventRecord {
  id: string
  tenant_id: string
  domain: CrmGovernanceAuditDomain
  entity_type: string
  entity_id: string
  action: string
  summary: string
  metadata: Record<string, string | number | boolean | null>
  created_at: string
  actor_user_id: string
}

export interface CrmCustomerLifecycleEventRecord {
  id: string
  tenant_id: string
  customer_id: string
  previous_state: CrmCustomerLifecycleState | null
  new_state: CrmCustomerLifecycleState
  reason: string
  changed_at: string
  created_at: string
  created_by_user_id: string
}

export interface CrmCustomerIdentityBindingRecord {
  id: string
  tenant_id: string
  customer_id: string
  realm_id: string
  organization_id: string | null
  group_id: string | null
  user_id: string | null
  status: CrmCustomerBindingStatus
  notes: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CrmCustomerCommerceBindingRecord {
  id: string
  tenant_id: string
  customer_id: string
  commercial_account_id: string
  billing_account_id: string | null
  status: CrmCustomerBindingStatus
  notes: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CrmCustomerCommunicationContextBindingRecord {
  id: string
  tenant_id: string
  customer_id: string
  preferred_channel: 'EMAIL' | 'SMS' | 'IN_APP' | 'NONE'
  consent_reference_id: string | null
  suppression_reference_id: string | null
  status: CrmCustomerBindingStatus
  notes: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CrmCustomerOperationJobRecord {
  id: string
  tenant_id: string
  job_kind: CrmCustomerOperationJobKind
  status: CrmCustomerOperationJobStatus
  summary: string
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CrmForecastProjectionRecord {
  opportunity_id: string
  tenant_id: string
  customer_id: string
  owner_user_id: string | null
  stage: CrmOpportunityStage
  forecast_bucket: CrmForecastBucket
  amount: number
  currency: string
  probability_percent: number
  weighted_amount: number
  expected_close_at: string | null
  updated_at: string
}

export interface CrmForecastPublicationRecord {
  id: string
  tenant_id: string
  publication_status: CrmForecastPublicationStatus
  analytics_contract_id: string
  summary: string
  currency: string
  opportunity_count: number
  weighted_total_amount: number
  commit_weighted_amount: number
  won_amount: number
  published_at: string
  created_at: string
  created_by_user_id: string
}

export interface CrmWebhookSubscriptionRecord {
  id: string
  tenant_id: string
  name: string
  event_types: string[]
  target_url: string
  signing_secret_reference: string | null
  status: CrmWebhookSubscriptionStatus
  last_delivery_at: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CrmOutboundEventRecord {
  id: string
  tenant_id: string
  event_type: string
  entity_type: string
  entity_id: string
  event_status: CrmOutboundEventStatus
  payload: Record<string, string | number | boolean | null>
  delivered_subscription_ids: string[]
  triggered_at: string
  created_at: string
  created_by_user_id: string
}

export interface CrmCampaignCoordinationRecord {
  id: string
  tenant_id: string
  name: string
  audience_segment_summary: string
  objective: string
  communications_intent_key: string
  status: CrmCampaignCoordinationStatus
  dispatch_owner_subsystem: 'communications'
  communications_request_reference: string | null
  communications_campaign_id: string | null
  handoff_requested_at: string | null
  handoff_completed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
}

export interface CrmAdminSummaryResponse {
  generated_at: string
  phase: string
  subsystem_status: string
  migration_state: string
  next_recommended_phase: string
  validation_domain_count: number
  profile_count: number
  active_profile_count: number
  relationship_count: number
  lead_count: number
  active_lead_count: number
  opportunity_count: number
  open_opportunity_count: number
  activity_count: number
  open_task_count: number
  case_count: number
  open_case_count: number
  breached_case_count: number
  active_case_sla_policy_count: number
  open_case_escalation_count: number
  automation_rule_count: number
  pending_approval_request_count: number
  sharing_rule_count: number
  field_governance_rule_count: number
  governance_audit_event_count: number
  lifecycle_event_count: number
  identity_binding_count: number
  commerce_binding_count: number
  communication_context_binding_count: number
  operation_job_count: number
  forecast_publication_count: number
  active_webhook_subscription_count: number
  outbound_event_count: number
  campaign_coordination_count: number
  first_contract_ids: string[]
}

export type CrmCutoverReadiness =
  | 'BLOCKED_PARITY_MISMATCH'
  | 'READY_ENABLE_DUAL_READ'
  | 'READY_ENABLE_ADAPTER'
  | 'ADAPTER_ENABLED'

export type CrmCutoverAction =
  | 'ENABLE_DUAL_READ'
  | 'ENABLE_ADAPTER'
  | 'DISABLE_ADAPTER'
  | 'DISABLE_DUAL_READ'

export type CrmCutoverActionOutcome = 'APPLIED' | 'NOOP'

export interface CrmMigrationStatusResponse {
  generated_at: string
  tenant_id: string
  cutover_readiness: CrmCutoverReadiness
  recommended_action: CrmCutoverAction | null
  next_step: string
  legacy_clients: {
    total_count: number
    summary: {
      active: number
      prospects: number
      inactive: number
    }
  }
  crm_customers: {
    profile_count: number
    active_profile_count: number
  }
  feature_flags: {
    clients_adapter: ResolvedFeatureFlag
    clients_dual_read: ResolvedFeatureFlag
  }
  parity: {
    matches: boolean
    legacy_total_count: number
    customer_total_count: number
    missing_in_customer_count: number
    missing_in_legacy_count: number
    missing_in_customer_sample: string[]
    missing_in_legacy_sample: string[]
  }
  integration_telemetry: {
    total_requests_last_hour: number
    east_west_requests_last_hour: number
    east_west_http_requests_last_hour: number
    fallback_requests_last_hour: number
    fallback_rate_percent: number
    estimated_api_gateway_request_cost_last_hour_usd: number
    projected_api_gateway_request_cost_30d_usd: number
    average_response_time_ms: number
    p95_response_time_ms: number
    top_adapter: {
      adapter: 'local' | 'invoke' | 'http' | 'event' | 'unknown'
      count: number
      error_rate_percent: number
      p95_response_time_ms: number
    } | null
    by_adapter: Array<{
      adapter: 'local' | 'invoke' | 'http' | 'event' | 'unknown'
      count: number
      error_rate_percent: number
      p95_response_time_ms: number
    }>
  }
}

export interface CrmCutoverActionRequest {
  action: CrmCutoverAction
  force?: boolean
}

export interface CrmCutoverActionResponse {
  generated_at: string
  tenant_id: string
  action: CrmCutoverAction
  force: boolean
  outcome: CrmCutoverActionOutcome
  message: string
  updates: Array<{
    key: string
    previous_value: boolean | string
    next_value: boolean | string
    changed: boolean
  }>
  migration_status: CrmMigrationStatusResponse
}

export type TrainingLmsMigrationState =
  | 'SDK_DISABLED'
  | 'SDK_LOCAL_ACTIVE'
  | 'SDK_HTTP_FALLBACK_ACTIVE'

export type TrainingLmsCutoverAction =
  | 'ENABLE_SDK'
  | 'DISABLE_SDK'
  | 'ENABLE_HTTP_FALLBACK'
  | 'DISABLE_HTTP_FALLBACK'

export type TrainingLmsCutoverActionOutcome = 'APPLIED' | 'NOOP'

export interface TrainingLmsMigrationStatusResponse {
  generated_at: string
  tenant_id: string
  migration_state: TrainingLmsMigrationState
  recommended_action: TrainingLmsCutoverAction | null
  next_step: string
  feature_flags: {
    lms_sdk_enabled: ResolvedFeatureFlag
    lms_sdk_http_fallback_enabled: ResolvedFeatureFlag
  }
  integration_telemetry: {
    total_requests_last_hour: number
    east_west_requests_last_hour: number
    east_west_http_requests_last_hour: number
    fallback_requests_last_hour: number
    fallback_rate_percent: number
    estimated_api_gateway_request_cost_last_hour_usd: number
    projected_api_gateway_request_cost_30d_usd: number
    average_response_time_ms: number
    p95_response_time_ms: number
    top_adapter: {
      adapter: 'local' | 'invoke' | 'http' | 'event' | 'unknown'
      count: number
      error_rate_percent: number
      p95_response_time_ms: number
    } | null
    by_adapter: Array<{
      adapter: 'local' | 'invoke' | 'http' | 'event' | 'unknown'
      count: number
      error_rate_percent: number
      p95_response_time_ms: number
    }>
  }
}

export interface TrainingLmsCutoverActionRequest {
  action: TrainingLmsCutoverAction
  force?: boolean
}

export interface TrainingLmsCutoverActionResponse {
  generated_at: string
  tenant_id: string
  action: TrainingLmsCutoverAction
  force: boolean
  outcome: TrainingLmsCutoverActionOutcome
  message: string
  updates: Array<{
    key: string
    previous_value: boolean | string
    next_value: boolean | string
    changed: boolean
  }>
  migration_status: TrainingLmsMigrationStatusResponse
}

export type TrainingCmsMigrationState =
  | 'SDK_DISABLED'
  | 'SDK_LOCAL_ACTIVE'

export type TrainingCmsCutoverAction =
  | 'ENABLE_SDK'
  | 'DISABLE_SDK'

export type TrainingCmsCutoverActionOutcome = 'APPLIED' | 'NOOP'

export interface TrainingCmsMigrationStatusResponse {
  generated_at: string
  tenant_id: string
  migration_state: TrainingCmsMigrationState
  recommended_action: TrainingCmsCutoverAction | null
  next_step: string
  feature_flags: {
    cms_sdk_enabled: ResolvedFeatureFlag
  }
  integration_telemetry: {
    total_requests_last_hour: number
    east_west_requests_last_hour: number
    east_west_http_requests_last_hour: number
    fallback_requests_last_hour: number
    fallback_rate_percent: number
    estimated_api_gateway_request_cost_last_hour_usd: number
    projected_api_gateway_request_cost_30d_usd: number
    average_response_time_ms: number
    p95_response_time_ms: number
    top_adapter: {
      adapter: 'local' | 'invoke' | 'http' | 'event' | 'unknown'
      count: number
      error_rate_percent: number
      p95_response_time_ms: number
    } | null
    by_adapter: Array<{
      adapter: 'local' | 'invoke' | 'http' | 'event' | 'unknown'
      count: number
      error_rate_percent: number
      p95_response_time_ms: number
    }>
  }
}

export interface TrainingCmsCutoverActionRequest {
  action: TrainingCmsCutoverAction
  force?: boolean
}

export interface TrainingCmsCutoverActionResponse {
  generated_at: string
  tenant_id: string
  action: TrainingCmsCutoverAction
  force: boolean
  outcome: TrainingCmsCutoverActionOutcome
  message: string
  updates: Array<{
    key: string
    previous_value: boolean | string
    next_value: boolean | string
    changed: boolean
  }>
  migration_status: TrainingCmsMigrationStatusResponse
}

export type LmsIamMigrationState =
  | 'SDK_DISABLED'
  | 'SDK_LOCAL_ACTIVE'
  | 'SDK_HTTP_FALLBACK_ACTIVE'

export type LmsIamCutoverAction =
  | 'ENABLE_SDK'
  | 'DISABLE_SDK'
  | 'ENABLE_HTTP_FALLBACK'
  | 'DISABLE_HTTP_FALLBACK'

export type LmsIamCutoverActionOutcome = 'APPLIED' | 'NOOP'

export interface LmsIamMigrationStatusResponse {
  generated_at: string
  tenant_id: string
  migration_state: LmsIamMigrationState
  recommended_action: LmsIamCutoverAction | null
  next_step: string
  feature_flags: {
    iam_sdk_enabled: ResolvedFeatureFlag
    iam_sdk_http_fallback_enabled: ResolvedFeatureFlag
  }
  integration_telemetry: {
    total_requests_last_hour: number
    east_west_requests_last_hour: number
    east_west_http_requests_last_hour: number
    fallback_requests_last_hour: number
    fallback_rate_percent: number
    estimated_api_gateway_request_cost_last_hour_usd: number
    projected_api_gateway_request_cost_30d_usd: number
    average_response_time_ms: number
    p95_response_time_ms: number
    top_adapter: {
      adapter: 'local' | 'invoke' | 'http' | 'event' | 'unknown'
      count: number
      error_rate_percent: number
      p95_response_time_ms: number
    } | null
    by_adapter: Array<{
      adapter: 'local' | 'invoke' | 'http' | 'event' | 'unknown'
      count: number
      error_rate_percent: number
      p95_response_time_ms: number
    }>
  }
}

export interface LmsIamCutoverActionRequest {
  action: LmsIamCutoverAction
  force?: boolean
}

export interface LmsIamCutoverActionResponse {
  generated_at: string
  tenant_id: string
  action: LmsIamCutoverAction
  force: boolean
  outcome: LmsIamCutoverActionOutcome
  message: string
  updates: Array<{
    key: string
    previous_value: boolean | string
    next_value: boolean | string
    changed: boolean
  }>
  migration_status: LmsIamMigrationStatusResponse
}

export type LmsCommerceMigrationState =
  | 'SDK_DISABLED'
  | 'SDK_LOCAL_ACTIVE'

export type LmsCommerceCutoverAction =
  | 'ENABLE_SDK'
  | 'DISABLE_SDK'

export type LmsCommerceCutoverActionOutcome = 'APPLIED' | 'NOOP'

export interface LmsCommerceMigrationStatusResponse {
  generated_at: string
  tenant_id: string
  migration_state: LmsCommerceMigrationState
  recommended_action: LmsCommerceCutoverAction | null
  next_step: string
  feature_flags: {
    commerce_sdk_enabled: ResolvedFeatureFlag
  }
  integration_telemetry: {
    total_requests_last_hour: number
    east_west_requests_last_hour: number
    east_west_http_requests_last_hour: number
    fallback_requests_last_hour: number
    fallback_rate_percent: number
    estimated_api_gateway_request_cost_last_hour_usd: number
    projected_api_gateway_request_cost_30d_usd: number
    average_response_time_ms: number
    p95_response_time_ms: number
    top_adapter: {
      adapter: 'local' | 'invoke' | 'http' | 'event' | 'unknown'
      count: number
      error_rate_percent: number
      p95_response_time_ms: number
    } | null
    by_adapter: Array<{
      adapter: 'local' | 'invoke' | 'http' | 'event' | 'unknown'
      count: number
      error_rate_percent: number
      p95_response_time_ms: number
    }>
  }
}

export interface LmsCommerceCutoverActionRequest {
  action: LmsCommerceCutoverAction
  force?: boolean
}

export interface LmsCommerceCutoverActionResponse {
  generated_at: string
  tenant_id: string
  action: LmsCommerceCutoverAction
  force: boolean
  outcome: LmsCommerceCutoverActionOutcome
  message: string
  updates: Array<{
    key: string
    previous_value: boolean | string
    next_value: boolean | string
    changed: boolean
  }>
  migration_status: LmsCommerceMigrationStatusResponse
}

export type WorkforceIamMigrationState =
  | 'SDK_DISABLED'
  | 'SDK_LOCAL_ACTIVE'
  | 'SDK_HTTP_FALLBACK_ACTIVE'

export type WorkforceIamCutoverAction =
  | 'ENABLE_SDK'
  | 'DISABLE_SDK'
  | 'ENABLE_HTTP_FALLBACK'
  | 'DISABLE_HTTP_FALLBACK'

export type WorkforceIamCutoverActionOutcome = 'APPLIED' | 'NOOP'

export interface WorkforceIamMigrationStatusResponse {
  generated_at: string
  tenant_id: string
  migration_state: WorkforceIamMigrationState
  recommended_action: WorkforceIamCutoverAction | null
  next_step: string
  feature_flags: {
    iam_sdk_enabled: ResolvedFeatureFlag
    iam_sdk_http_fallback_enabled: ResolvedFeatureFlag
  }
  integration_telemetry: {
    total_requests_last_hour: number
    east_west_requests_last_hour: number
    east_west_http_requests_last_hour: number
    fallback_requests_last_hour: number
    fallback_rate_percent: number
    estimated_api_gateway_request_cost_last_hour_usd: number
    projected_api_gateway_request_cost_30d_usd: number
    average_response_time_ms: number
    p95_response_time_ms: number
    top_adapter: {
      adapter: 'local' | 'invoke' | 'http' | 'event' | 'unknown'
      count: number
      error_rate_percent: number
      p95_response_time_ms: number
    } | null
    by_adapter: Array<{
      adapter: 'local' | 'invoke' | 'http' | 'event' | 'unknown'
      count: number
      error_rate_percent: number
      p95_response_time_ms: number
    }>
  }
}

export interface WorkforceIamCutoverActionRequest {
  action: WorkforceIamCutoverAction
  force?: boolean
}

export interface WorkforceIamCutoverActionResponse {
  generated_at: string
  tenant_id: string
  action: WorkforceIamCutoverAction
  force: boolean
  outcome: WorkforceIamCutoverActionOutcome
  message: string
  updates: Array<{
    key: string
    previous_value: boolean | string
    next_value: boolean | string
    changed: boolean
  }>
  migration_status: WorkforceIamMigrationStatusResponse
}

export type WorkforceReadinessMigrationState =
  | 'SDK_DISABLED'
  | 'SDK_LOCAL_ACTIVE'

export type WorkforceReadinessCutoverAction =
  | 'ENABLE_SDK'
  | 'DISABLE_SDK'

export type WorkforceReadinessCutoverActionOutcome = 'APPLIED' | 'NOOP'

export interface WorkforceReadinessMigrationStatusResponse {
  generated_at: string
  tenant_id: string
  migration_state: WorkforceReadinessMigrationState
  recommended_action: WorkforceReadinessCutoverAction | null
  next_step: string
  feature_flags: {
    readiness_sdk_enabled: ResolvedFeatureFlag
  }
  integration_telemetry: {
    total_requests_last_hour: number
    east_west_requests_last_hour: number
    east_west_http_requests_last_hour: number
    fallback_requests_last_hour: number
    fallback_rate_percent: number
    estimated_api_gateway_request_cost_last_hour_usd: number
    projected_api_gateway_request_cost_30d_usd: number
    average_response_time_ms: number
    p95_response_time_ms: number
    top_adapter: {
      adapter: 'local' | 'invoke' | 'http' | 'event' | 'unknown'
      count: number
      error_rate_percent: number
      p95_response_time_ms: number
    } | null
    by_adapter: Array<{
      adapter: 'local' | 'invoke' | 'http' | 'event' | 'unknown'
      count: number
      error_rate_percent: number
      p95_response_time_ms: number
    }>
  }
}

export interface WorkforceReadinessCutoverActionRequest {
  action: WorkforceReadinessCutoverAction
  force?: boolean
}

export interface WorkforceReadinessCutoverActionResponse {
  generated_at: string
  tenant_id: string
  action: WorkforceReadinessCutoverAction
  force: boolean
  outcome: WorkforceReadinessCutoverActionOutcome
  message: string
  updates: Array<{
    key: string
    previous_value: boolean | string
    next_value: boolean | string
    changed: boolean
  }>
  migration_status: WorkforceReadinessMigrationStatusResponse
}

export type SchedulingWorkforceMigrationState =
  | 'SDK_DISABLED'
  | 'SDK_LOCAL_ACTIVE'

export type SchedulingWorkforceCutoverAction =
  | 'ENABLE_SDK'
  | 'DISABLE_SDK'

export type SchedulingWorkforceCutoverActionOutcome = 'APPLIED' | 'NOOP'

export interface SchedulingWorkforceMigrationStatusResponse {
  generated_at: string
  tenant_id: string
  migration_state: SchedulingWorkforceMigrationState
  recommended_action: SchedulingWorkforceCutoverAction | null
  next_step: string
  feature_flags: {
    workforce_sdk_enabled: ResolvedFeatureFlag
  }
  integration_telemetry: {
    total_requests_last_hour: number
    east_west_requests_last_hour: number
    east_west_http_requests_last_hour: number
    fallback_requests_last_hour: number
    fallback_rate_percent: number
    estimated_api_gateway_request_cost_last_hour_usd: number
    projected_api_gateway_request_cost_30d_usd: number
    average_response_time_ms: number
    p95_response_time_ms: number
    top_adapter: {
      adapter: 'local' | 'invoke' | 'http' | 'event' | 'unknown'
      count: number
      error_rate_percent: number
      p95_response_time_ms: number
    } | null
    by_adapter: Array<{
      adapter: 'local' | 'invoke' | 'http' | 'event' | 'unknown'
      count: number
      error_rate_percent: number
      p95_response_time_ms: number
    }>
  }
}

export interface SchedulingWorkforceCutoverActionRequest {
  action: SchedulingWorkforceCutoverAction
  force?: boolean
}

export interface SchedulingWorkforceCutoverActionResponse {
  generated_at: string
  tenant_id: string
  action: SchedulingWorkforceCutoverAction
  force: boolean
  outcome: SchedulingWorkforceCutoverActionOutcome
  message: string
  updates: Array<{
    key: string
    previous_value: boolean | string
    next_value: boolean | string
    changed: boolean
  }>
  migration_status: SchedulingWorkforceMigrationStatusResponse
}

export type CommunicationsCmsMigrationState =
  | 'SDK_DISABLED'
  | 'SDK_LOCAL_ACTIVE'

export type CommunicationsCmsCutoverAction =
  | 'ENABLE_SDK'
  | 'DISABLE_SDK'

export type CommunicationsCmsCutoverActionOutcome = 'APPLIED' | 'NOOP'

export interface CommunicationsCmsMigrationStatusResponse {
  generated_at: string
  tenant_id: string
  migration_state: CommunicationsCmsMigrationState
  recommended_action: CommunicationsCmsCutoverAction | null
  next_step: string
  feature_flags: {
    cms_sdk_enabled: ResolvedFeatureFlag
  }
  integration_telemetry: {
    total_requests_last_hour: number
    east_west_requests_last_hour: number
    east_west_http_requests_last_hour: number
    fallback_requests_last_hour: number
    fallback_rate_percent: number
    estimated_api_gateway_request_cost_last_hour_usd: number
    projected_api_gateway_request_cost_30d_usd: number
    average_response_time_ms: number
    p95_response_time_ms: number
    top_adapter: {
      adapter: 'local' | 'invoke' | 'http' | 'event' | 'unknown'
      count: number
      error_rate_percent: number
      p95_response_time_ms: number
    } | null
    by_adapter: Array<{
      adapter: 'local' | 'invoke' | 'http' | 'event' | 'unknown'
      count: number
      error_rate_percent: number
      p95_response_time_ms: number
    }>
  }
}

export interface CommunicationsCmsCutoverActionRequest {
  action: CommunicationsCmsCutoverAction
  force?: boolean
}

export interface CommunicationsCmsCutoverActionResponse {
  generated_at: string
  tenant_id: string
  action: CommunicationsCmsCutoverAction
  force: boolean
  outcome: CommunicationsCmsCutoverActionOutcome
  message: string
  updates: Array<{
    key: string
    previous_value: boolean | string
    next_value: boolean | string
    changed: boolean
  }>
  migration_status: CommunicationsCmsMigrationStatusResponse
}

export type CommunicationsIamMigrationState =
  | 'SDK_DISABLED'
  | 'SDK_LOCAL_ACTIVE'

export type CommunicationsIamCutoverAction =
  | 'ENABLE_SDK'
  | 'DISABLE_SDK'

export type CommunicationsIamCutoverActionOutcome = 'APPLIED' | 'NOOP'

export interface CommunicationsIamMigrationStatusResponse {
  generated_at: string
  tenant_id: string
  migration_state: CommunicationsIamMigrationState
  recommended_action: CommunicationsIamCutoverAction | null
  next_step: string
  feature_flags: {
    iam_sdk_enabled: ResolvedFeatureFlag
  }
  integration_telemetry: {
    total_requests_last_hour: number
    east_west_requests_last_hour: number
    east_west_http_requests_last_hour: number
    fallback_requests_last_hour: number
    fallback_rate_percent: number
    estimated_api_gateway_request_cost_last_hour_usd: number
    projected_api_gateway_request_cost_30d_usd: number
    average_response_time_ms: number
    p95_response_time_ms: number
    top_adapter: {
      adapter: 'local' | 'invoke' | 'http' | 'event' | 'unknown'
      count: number
      error_rate_percent: number
      p95_response_time_ms: number
    } | null
    by_adapter: Array<{
      adapter: 'local' | 'invoke' | 'http' | 'event' | 'unknown'
      count: number
      error_rate_percent: number
      p95_response_time_ms: number
    }>
  }
}

export interface CommunicationsIamCutoverActionRequest {
  action: CommunicationsIamCutoverAction
  force?: boolean
}

export interface CommunicationsIamCutoverActionResponse {
  generated_at: string
  tenant_id: string
  action: CommunicationsIamCutoverAction
  force: boolean
  outcome: CommunicationsIamCutoverActionOutcome
  message: string
  updates: Array<{
    key: string
    previous_value: boolean | string
    next_value: boolean | string
    changed: boolean
  }>
  migration_status: CommunicationsIamMigrationStatusResponse
}

export interface CrmValidationDomainsResponse {
  generated_at: string
  validation_domains: CrmValidationDomain[]
  count: number
}

export interface CrmCustomersResponse {
  generated_at: string
  customers: CrmCustomerProfileRecord[]
  count: number
}

export interface CrmRelationshipsResponse {
  generated_at: string
  relationships: CrmCustomerRelationshipRecord[]
  count: number
}

export interface CrmLeadsResponse {
  generated_at: string
  leads: CrmCustomerLeadRecord[]
  count: number
}

export interface CrmOpportunitiesResponse {
  generated_at: string
  opportunities: CrmCustomerOpportunityRecord[]
  count: number
}

export interface CrmActivitiesResponse {
  generated_at: string
  activities: CrmCustomerActivityRecord[]
  count: number
}

export interface CrmTasksResponse {
  generated_at: string
  tasks: CrmCustomerTaskRecord[]
  count: number
}

export interface CrmCaseQueuesResponse {
  generated_at: string
  case_queues: CrmCustomerCaseQueueRecord[]
  count: number
}

export interface CrmCasesResponse {
  generated_at: string
  cases: CrmCustomerCaseRecord[]
  count: number
}

export interface CrmCaseSlaPoliciesResponse {
  generated_at: string
  case_sla_policies: CrmCustomerCaseSlaPolicyRecord[]
  count: number
}

export interface CrmCaseEscalationsResponse {
  generated_at: string
  case_escalations: CrmCustomerCaseEscalationRecord[]
  count: number
}

export interface CrmAutomationRulesResponse {
  generated_at: string
  automation_rules: CrmCustomerAutomationRuleRecord[]
  count: number
}

export interface CrmApprovalPoliciesResponse {
  generated_at: string
  approval_policies: CrmCustomerApprovalPolicyRecord[]
  count: number
}

export interface CrmApprovalRequestsResponse {
  generated_at: string
  approval_requests: CrmCustomerApprovalRequestRecord[]
  count: number
}

export interface CrmSharingRulesResponse {
  generated_at: string
  sharing_rules: CrmCustomerSharingRuleRecord[]
  count: number
}

export interface CrmFieldGovernanceRulesResponse {
  generated_at: string
  field_governance_rules: CrmCustomerFieldGovernanceRuleRecord[]
  count: number
}

export interface CrmGovernanceAuditEventsResponse {
  generated_at: string
  governance_audit_events: CrmCustomerGovernanceAuditEventRecord[]
  count: number
}

export interface CrmHierarchyResponse {
  generated_at: string
  tenant_id: string
  customer: CrmCustomerProfileRecord
  outbound_relationships: CrmCustomerRelationshipRecord[]
  inbound_relationships: CrmCustomerRelationshipRecord[]
  related_customers: CrmCustomerProfileRecord[]
  relationship_count: number
}

export interface CrmLifecycleEventsResponse {
  generated_at: string
  lifecycle_events: CrmCustomerLifecycleEventRecord[]
  count: number
}

export interface CrmIdentityBindingsResponse {
  generated_at: string
  identity_bindings: CrmCustomerIdentityBindingRecord[]
  count: number
}

export interface CrmCommerceBindingsResponse {
  generated_at: string
  commerce_bindings: CrmCustomerCommerceBindingRecord[]
  count: number
}

export interface CrmCommunicationContextBindingsResponse {
  generated_at: string
  communication_context_bindings: CrmCustomerCommunicationContextBindingRecord[]
  count: number
}

export interface CrmOperationJobsResponse {
  generated_at: string
  operation_jobs: CrmCustomerOperationJobRecord[]
  count: number
}

export interface CrmForecastProjectionsResponse {
  generated_at: string
  forecast_projections: CrmForecastProjectionRecord[]
  count: number
  summary: {
    opportunity_count: number
    total_amount: number
    weighted_total_amount: number
    commit_weighted_amount: number
    won_amount: number
    currency: string
  }
}

export interface CrmForecastPublicationsResponse {
  generated_at: string
  forecast_publications: CrmForecastPublicationRecord[]
  count: number
}

export interface CrmWebhookSubscriptionsResponse {
  generated_at: string
  webhook_subscriptions: CrmWebhookSubscriptionRecord[]
  count: number
}

export interface CrmOutboundEventsResponse {
  generated_at: string
  outbound_events: CrmOutboundEventRecord[]
  count: number
}

export interface CrmCampaignCoordinationsResponse {
  generated_at: string
  campaign_coordinations: CrmCampaignCoordinationRecord[]
  count: number
}

export interface CreateCrmCustomerProfileRequest {
  kind: CrmCustomerProfileKind
  name: string
  lifecycle_state?: CrmCustomerLifecycleState
  preferred_pack_id?: string | null
  primary_contact_name?: string
  primary_contact_email?: string
  primary_contact_phone?: string | null
  service_city?: string | null
  notes?: string | null
  tags?: string[]
}

export interface UpdateCrmCustomerProfileRequest {
  kind?: CrmCustomerProfileKind
  name?: string
  lifecycle_state?: CrmCustomerLifecycleState
  preferred_pack_id?: string | null
  primary_contact_name?: string
  primary_contact_email?: string
  primary_contact_phone?: string | null
  service_city?: string | null
  notes?: string | null
  tags?: string[]
  record_status?: CrmCustomerRecordStatus
}

export interface CreateCrmRelationshipRequest {
  source_customer_id: string
  target_customer_id: string
  relationship_type: CrmCustomerRelationshipType
  notes?: string | null
}

export interface UpdateCrmRelationshipRequest {
  relationship_type?: CrmCustomerRelationshipType
  status?: CrmCustomerRecordStatus
  notes?: string | null
}

export interface CrmLeadListFilters {
  status?: CrmLeadStatus
  source?: CrmLeadSource
  ownerUserId?: string
}

export interface CreateCrmLeadRequest {
  full_name: string
  company_name?: string | null
  email: string
  phone?: string | null
  source?: CrmLeadSource
  owner_user_id?: string | null
  score?: number | null
  notes?: string | null
  tags?: string[]
}

export interface UpdateCrmLeadRequest {
  full_name?: string
  company_name?: string | null
  email?: string
  phone?: string | null
  source?: CrmLeadSource
  owner_user_id?: string | null
  score?: number | null
  status?: CrmLeadStatus
  disqualification_reason?: string | null
  notes?: string | null
  tags?: string[]
}

export interface ConvertCrmLeadRequest {
  customer_name?: string
  customer_kind?: CrmCustomerProfileKind
  customer_lifecycle_state?: CrmCustomerLifecycleState
  create_opportunity?: boolean
  opportunity_name?: string
  opportunity_stage?: CrmOpportunityStage
  opportunity_amount?: number | null
  opportunity_currency?: string | null
}

export interface ConvertCrmLeadResponse {
  lead: CrmCustomerLeadRecord
  customer: CrmCustomerProfileRecord
  opportunity: CrmCustomerOpportunityRecord | null
}

export interface CrmOpportunityListFilters {
  customerId?: string
  leadId?: string
  stage?: CrmOpportunityStage
  ownerUserId?: string
}

export interface CreateCrmOpportunityRequest {
  customer_id: string
  lead_id?: string | null
  name: string
  stage?: CrmOpportunityStage
  owner_user_id?: string | null
  amount?: number | null
  currency?: string | null
  probability_percent?: number | null
  expected_close_at?: string | null
  close_reason?: string | null
  next_step?: string | null
  notes?: string | null
  tags?: string[]
}

export interface UpdateCrmOpportunityRequest {
  customer_id?: string
  lead_id?: string | null
  name?: string
  stage?: CrmOpportunityStage
  owner_user_id?: string | null
  amount?: number | null
  currency?: string | null
  probability_percent?: number | null
  expected_close_at?: string | null
  close_reason?: string | null
  next_step?: string | null
  notes?: string | null
  tags?: string[]
}

export interface CrmActivityListFilters {
  customerId?: string
  leadId?: string
  opportunityId?: string
}

export interface CreateCrmActivityRequest {
  customer_id?: string | null
  lead_id?: string | null
  opportunity_id?: string | null
  activity_type: CrmActivityType
  subject: string
  details?: string | null
  occurred_at?: string | null
}

export interface CrmTaskListFilters {
  status?: CrmTaskStatus
  assigneeUserId?: string
  customerId?: string
  leadId?: string
  opportunityId?: string
}

export interface CreateCrmTaskRequest {
  customer_id?: string | null
  lead_id?: string | null
  opportunity_id?: string | null
  title: string
  description?: string | null
  status?: CrmTaskStatus
  priority?: CrmTaskPriority
  due_at?: string | null
  assignee_user_id?: string | null
}

export interface UpdateCrmTaskRequest {
  customer_id?: string | null
  lead_id?: string | null
  opportunity_id?: string | null
  title?: string
  description?: string | null
  status?: CrmTaskStatus
  priority?: CrmTaskPriority
  due_at?: string | null
  assignee_user_id?: string | null
}

export interface CreateCrmCaseQueueRequest {
  name: string
  description?: string | null
  assignment_mode?: CrmCaseQueueAssignmentMode
  default_owner_user_id?: string | null
}

export interface UpdateCrmCaseQueueRequest {
  name?: string
  description?: string | null
  assignment_mode?: CrmCaseQueueAssignmentMode
  default_owner_user_id?: string | null
  status?: CrmCustomerRecordStatus
}

export interface CrmCaseListFilters {
  status?: CrmCaseStatus
  priority?: CrmCasePriority
  severity?: CrmCaseSeverity
  queueId?: string
  ownerUserId?: string
  customerId?: string
  breachedOnly?: boolean
}

export interface CreateCrmCaseRequest {
  customer_id: string
  lead_id?: string | null
  opportunity_id?: string | null
  title: string
  description?: string | null
  status?: CrmCaseStatus
  priority?: CrmCasePriority
  severity?: CrmCaseSeverity
  source?: CrmCaseSource
  queue_id?: string | null
  owner_user_id?: string | null
  sla_policy_id?: string | null
  tags?: string[]
  opened_at?: string | null
}

export interface UpdateCrmCaseRequest {
  customer_id?: string
  lead_id?: string | null
  opportunity_id?: string | null
  title?: string
  description?: string | null
  status?: CrmCaseStatus
  priority?: CrmCasePriority
  severity?: CrmCaseSeverity
  source?: CrmCaseSource
  queue_id?: string | null
  owner_user_id?: string | null
  sla_policy_id?: string | null
  first_response_at?: string | null
  tags?: string[]
}

export interface CrmCaseSlaPolicyListFilters {
  status?: CrmCaseSlaPolicyStatus
  queueId?: string
}

export interface CreateCrmCaseSlaPolicyRequest {
  name: string
  queue_id?: string | null
  priority_scope?: CrmCasePriority | 'ALL'
  severity_scope?: CrmCaseSeverity | 'ALL'
  first_response_target_minutes: number
  resolution_target_minutes: number
  status?: CrmCaseSlaPolicyStatus
  notes?: string | null
}

export interface UpdateCrmCaseSlaPolicyRequest {
  name?: string
  queue_id?: string | null
  priority_scope?: CrmCasePriority | 'ALL'
  severity_scope?: CrmCaseSeverity | 'ALL'
  first_response_target_minutes?: number
  resolution_target_minutes?: number
  status?: CrmCaseSlaPolicyStatus
  notes?: string | null
}

export interface CrmCaseEscalationListFilters {
  caseId?: string
  status?: CrmCaseEscalationStatus
}

export interface CreateCrmCaseEscalationRequest {
  case_id: string
  escalation_level?: number
  reason: string
  queue_id?: string | null
  assigned_user_id?: string | null
}

export interface UpdateCrmCaseEscalationRequest {
  escalation_level?: number
  reason?: string
  status?: CrmCaseEscalationStatus
  queue_id?: string | null
  assigned_user_id?: string | null
}

export interface CrmAutomationRuleListFilters {
  objectType?: CrmAutomationObjectType
  status?: CrmAutomationRuleStatus
}

export interface CreateCrmAutomationRuleRequest {
  object_type: CrmAutomationObjectType
  trigger_event: CrmAutomationTriggerEvent
  name: string
  condition_summary: string
  action_summary: string
  status?: CrmAutomationRuleStatus
}

export interface UpdateCrmAutomationRuleRequest {
  object_type?: CrmAutomationObjectType
  trigger_event?: CrmAutomationTriggerEvent
  name?: string
  condition_summary?: string
  action_summary?: string
  status?: CrmAutomationRuleStatus
}

export interface CrmApprovalPolicyListFilters {
  objectType?: CrmAutomationObjectType
  status?: CrmApprovalPolicyStatus
}

export interface CreateCrmApprovalPolicyRequest {
  object_type: CrmAutomationObjectType
  action_type: CrmApprovalActionType
  name: string
  criteria_summary: string
  approver_role: string
  status?: CrmApprovalPolicyStatus
  notes?: string | null
}

export interface UpdateCrmApprovalPolicyRequest {
  object_type?: CrmAutomationObjectType
  action_type?: CrmApprovalActionType
  name?: string
  criteria_summary?: string
  approver_role?: string
  status?: CrmApprovalPolicyStatus
  notes?: string | null
}

export interface CrmApprovalRequestListFilters {
  status?: CrmApprovalRequestStatus
  policyId?: string
  objectType?: CrmAutomationObjectType
  objectId?: string
}

export interface CreateCrmApprovalRequestRequest {
  policy_id: string
  object_type: CrmAutomationObjectType
  object_id: string
  action_type: CrmApprovalActionType
  reason: string
}

export interface UpdateCrmApprovalRequestRequest {
  status?: CrmApprovalRequestStatus
  decision_reason?: string | null
}

export interface CrmSharingRuleListFilters {
  objectType?: CrmAutomationObjectType
  status?: CrmSharingRuleStatus
  principalType?: CrmSharingPrincipalType
  principalId?: string
}

export interface CreateCrmSharingRuleRequest {
  object_type: CrmAutomationObjectType
  principal_type: CrmSharingPrincipalType
  principal_id: string
  access_level: CrmSharingAccessLevel
  condition_summary: string
  status?: CrmSharingRuleStatus
}

export interface UpdateCrmSharingRuleRequest {
  object_type?: CrmAutomationObjectType
  principal_type?: CrmSharingPrincipalType
  principal_id?: string
  access_level?: CrmSharingAccessLevel
  condition_summary?: string
  status?: CrmSharingRuleStatus
}

export interface CrmFieldGovernanceRuleListFilters {
  objectType?: CrmAutomationObjectType
  status?: CrmFieldGovernanceRuleStatus
  classification?: CrmFieldClassification
  fieldName?: string
}

export interface CreateCrmFieldGovernanceRuleRequest {
  object_type: CrmAutomationObjectType
  field_name: string
  classification: CrmFieldClassification
  write_policy: CrmFieldWritePolicy
  masking_strategy: CrmFieldMaskingStrategy
  status?: CrmFieldGovernanceRuleStatus
  rationale?: string | null
}

export interface UpdateCrmFieldGovernanceRuleRequest {
  object_type?: CrmAutomationObjectType
  field_name?: string
  classification?: CrmFieldClassification
  write_policy?: CrmFieldWritePolicy
  masking_strategy?: CrmFieldMaskingStrategy
  status?: CrmFieldGovernanceRuleStatus
  rationale?: string | null
}

export interface CrmGovernanceAuditEventListFilters {
  domain?: CrmGovernanceAuditDomain
  entityType?: string
  entityId?: string
  limit?: number
}

export interface CrmForecastProjectionListFilters {
  ownerUserId?: string
  stage?: CrmOpportunityStage
  currency?: string
  includeClosed?: boolean
}

export interface PublishCrmForecastProjectionRequest {
  analytics_contract_id?: string | null
  summary?: string | null
  owner_user_id?: string | null
  stage?: CrmOpportunityStage | null
  currency?: string | null
  include_closed?: boolean
}

export interface CrmWebhookSubscriptionListFilters {
  status?: CrmWebhookSubscriptionStatus
  eventType?: string
}

export interface CreateCrmWebhookSubscriptionRequest {
  name: string
  event_types: string[]
  target_url: string
  signing_secret_reference?: string | null
  status?: CrmWebhookSubscriptionStatus
}

export interface UpdateCrmWebhookSubscriptionRequest {
  name?: string
  event_types?: string[]
  target_url?: string
  signing_secret_reference?: string | null
  status?: CrmWebhookSubscriptionStatus
}

export interface CrmOutboundEventListFilters {
  eventType?: string
  entityType?: string
  entityId?: string
  subscriptionId?: string
  limit?: number
}

export interface PublishCrmOutboundEventRequest {
  event_type: string
  entity_type: string
  entity_id: string
  payload?: Record<string, string | number | boolean | null>
}

export interface CrmCampaignCoordinationListFilters {
  status?: CrmCampaignCoordinationStatus
  communicationsIntentKey?: string
}

export interface CreateCrmCampaignCoordinationRequest {
  name: string
  audience_segment_summary: string
  objective: string
  communications_intent_key: string
  status?: CrmCampaignCoordinationStatus
  notes?: string | null
}

export interface UpdateCrmCampaignCoordinationRequest {
  name?: string
  audience_segment_summary?: string
  objective?: string
  communications_intent_key?: string
  status?: CrmCampaignCoordinationStatus
  notes?: string | null
}

export interface HandoffCrmCampaignCoordinationRequest {
  communications_request_reference?: string | null
  communications_campaign_id?: string | null
  notes?: string | null
}

export interface CreateCrmLifecycleEventRequest {
  customer_id: string
  new_state: CrmCustomerLifecycleState
  reason: string
}

export interface UpdateCrmLifecycleStateRequest {
  new_state: CrmCustomerLifecycleState
  reason?: string
}

export interface CreateCrmIdentityBindingRequest {
  customer_id: string
  realm_id: string
  organization_id?: string | null
  group_id?: string | null
  user_id?: string | null
  notes?: string | null
}

export interface CreateCrmCommerceBindingRequest {
  customer_id: string
  commercial_account_id: string
  billing_account_id?: string | null
  notes?: string | null
}

export interface CreateCrmCommunicationContextBindingRequest {
  customer_id: string
  preferred_channel: 'EMAIL' | 'SMS' | 'IN_APP' | 'NONE'
  consent_reference_id?: string | null
  suppression_reference_id?: string | null
  notes?: string | null
}

export interface CreateCrmOperationJobRequest {
  summary?: string
}

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'REVIEW' | 'COMPLETED' | 'ON_HOLD'
export type WorkflowArtifactStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'READY'

export interface WorkflowArtifact {
  id: string
  type: string
  title: string
  status: WorkflowArtifactStatus
  summary: string
}

export interface ProjectRecord {
  id: string
  tenant_id: string
  client_id: string
  client_name: string
  name: string
  status: ProjectStatus
  pack_id: SolutionPackId
  pack_name: string
  deliverable_profile: string
  objective: string | null
  location_name: string | null
  location_address: string | null
  scheduled_start: string | null
  scheduled_end: string | null
  mission_ids: string[]
  tags: string[]
  workflow_artifacts: WorkflowArtifact[]
  created_at: string
  updated_at: string
  last_activity_at: string
}

export interface ProjectListParams {
  search?: string
  status?: ProjectStatus | 'ALL'
  pack_id?: SolutionPackId | 'ALL'
  client_id?: string | 'ALL'
  sort_field?: 'name' | 'status' | 'client_name' | 'last_activity_at' | 'updated_at'
  sort_direction?: 'asc' | 'desc'
  page?: number
  page_size?: number
}

export interface ProjectListResponse {
  generated_at: string
  tenant_id: string
  projects: ProjectRecord[]
  count: number
  page: number
  page_size: number
  total_pages: number
  total_count: number
  summary: {
    planning: number
    active: number
    review: number
    completed: number
    on_hold: number
  }
}

export interface CreateProjectRequest {
  client_id: string
  name: string
  pack_id: SolutionPackId
  deliverable_profile?: string
  objective?: string | null
  location_name?: string | null
  location_address?: string | null
  scheduled_start?: string | null
  scheduled_end?: string | null
  mission_ids?: string[]
  tags?: string[]
}

export interface UpdateProjectRequest {
  name?: string
  status?: ProjectStatus
  deliverable_profile?: string
  objective?: string | null
  location_name?: string | null
  location_address?: string | null
  scheduled_start?: string | null
  scheduled_end?: string | null
  mission_ids?: string[]
  tags?: string[]
}

export interface UpdateProjectArtifactStatusRequest {
  status: WorkflowArtifactStatus
}

export type WorkflowAssetKind =
  | 'PROPERTY_LISTING'
  | 'INSPECTION_TARGET'
  | 'FACILITY_COMPONENT'
  | 'SURVEY_AREA'
  | 'FIELD_BLOCK'
  | 'CASE_RECORD'

export type WorkflowAssetStatus = 'ACTIVE' | 'NEEDS_REVIEW' | 'READY' | 'ARCHIVED'

export interface WorkflowAssetRecord {
  id: string
  tenant_id: string
  project_id: string
  project_name: string
  client_id: string
  client_name: string
  pack_id: SolutionPackId
  kind: WorkflowAssetKind
  name: string
  status: WorkflowAssetStatus
  summary: string | null
  external_reference: string | null
  location_name: string | null
  tags: string[]
  attributes: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface WorkflowAssetListParams {
  search?: string
  project_id?: string | 'ALL'
  kind?: WorkflowAssetKind | 'ALL'
  status?: WorkflowAssetStatus | 'ALL'
  sort_field?: 'name' | 'kind' | 'status' | 'project_name' | 'updated_at'
  sort_direction?: 'asc' | 'desc'
  page?: number
  page_size?: number
}

export interface WorkflowAssetListResponse {
  generated_at: string
  tenant_id: string
  workflow_assets: WorkflowAssetRecord[]
  count: number
  page: number
  page_size: number
  total_pages: number
  total_count: number
  summary: {
    active: number
    needs_review: number
    ready: number
    archived: number
  }
}

export interface CreateWorkflowAssetRequest {
  project_id: string
  kind: WorkflowAssetKind
  name: string
  status?: WorkflowAssetStatus
  summary?: string | null
  external_reference?: string | null
  location_name?: string | null
  tags?: string[]
  attributes?: Record<string, unknown>
}

export interface UpdateWorkflowAssetRequest {
  kind?: WorkflowAssetKind
  name?: string
  status?: WorkflowAssetStatus
  summary?: string | null
  external_reference?: string | null
  location_name?: string | null
  tags?: string[]
  attributes?: Record<string, unknown>
}

export type DeliverableStatus = 'DRAFT' | 'GENERATED' | 'PUBLISHED'
export type DeliverableFormat = 'PDF' | 'CSV' | 'GEOJSON' | 'ZIP' | 'JSON'
export type DeliverableAudience = 'CLIENT' | 'INTERNAL' | 'PUBLIC'

export interface DeliverableRecord {
  id: string
  tenant_id: string
  project_id: string
  project_name: string
  client_id: string
  client_name: string
  pack_id: string
  title: string
  deliverable_profile: string
  status: DeliverableStatus
  format: DeliverableFormat
  audience: DeliverableAudience
  summary: string | null
  artifact_reference: string
  mission_ids: string[]
  created_at: string
  updated_at: string
  generated_at: string | null
  published_at: string | null
}

export interface DeliverableListParams {
  search?: string
  status?: DeliverableStatus | 'ALL'
  pack_id?: string | 'ALL'
  project_id?: string | 'ALL'
  sort_field?: 'title' | 'status' | 'project_name' | 'updated_at' | 'published_at'
  sort_direction?: 'asc' | 'desc'
  page?: number
  page_size?: number
}

export interface DeliverableListResponse {
  generated_at: string
  tenant_id: string
  deliverables: DeliverableRecord[]
  count: number
  page: number
  page_size: number
  total_pages: number
  total_count: number
  summary: {
    draft: number
    generated: number
    published: number
  }
}

export interface CreateDeliverableRequest {
  project_id: string
  title?: string
  deliverable_profile?: string
  format?: DeliverableFormat
  audience?: DeliverableAudience
  summary?: string | null
}

export interface DeliverableTemplateDefinition {
  id: string
  pack_id: SolutionPackId
  name: string
  deliverable_profile: string
  summary: string
  default_format: DeliverableFormat
  default_audience: DeliverableAudience
  required_workflow_artifact_types: string[]
  required_asset_kinds: WorkflowAssetKind[]
  recommended_sections: string[]
  title_template: string
}

export interface DeliverableTemplateCatalogResponse {
  generated_at: string
  tenant_id: string
  templates: DeliverableTemplateDefinition[]
  count: number
}

export interface ProjectDeliverableTemplateResponse extends DeliverableTemplateCatalogResponse {
  project_id: string
  project_name: string
  recommended_template_id: string | null
}

export type AdapterRegistryDomain =
  | 'faa'
  | 'control_plane'
  | 'connector'
  | 'training_provider'
  | 'readiness_provider'
  | 'pack_asset'
  | 'deliverable_provider'
  | 'business_system'

export type AdapterRegistryStatus =
  | 'ready'
  | 'disabled'
  | 'not_configured'
  | 'paused'
  | 'needs_attention'
  | 'sync_required'
  | 'degraded'

export type AdapterHealthState = 'healthy' | 'warning' | 'error' | 'unknown'

export interface AdapterRegistryEntry {
  id: string
  tenant_id: string
  domain: AdapterRegistryDomain
  domain_key: string
  source_type: 'faa_adapter' | 'control_plane_provider' | 'connector_runtime'
  label: string
  provider_label: string
  vendor: string
  deployment: string
  summary: string
  docs_url: string | null
  capability_tags: string[]
  selected: boolean
  status: AdapterRegistryStatus
  health_state: AdapterHealthState
  supports_verify: boolean
  supports_sync: boolean
  runtime_mode?: string
  binding: {
    mode: string
    external_reference_id: string | null
    notes: string | null
    last_verified_at: string | null
    last_sync_at: string | null
  }
}

export interface AdapterRegistryResponse {
  generated_at: string
  tenant_id: string
  adapters: AdapterRegistryEntry[]
  count: number
  domains: Array<{
    domain: AdapterRegistryDomain
    count: number
    selected_count: number
  }>
}

export interface AdapterHealthResponse {
  generated_at: string
  tenant_id: string
  adapters: Array<{
    adapter_id: string
    label: string
    domain: AdapterRegistryDomain
    status: AdapterRegistryStatus
    health_state: AdapterHealthState
    detail: string
    checked_at: string
  }>
  count: number
}

export interface UpdateAdapterBindingRequest {
  mode?: string
  status?: 'ACTIVE' | 'PAUSED' | 'ERROR'
  sync_enabled?: boolean
  external_reference_id?: string | null
  notes?: string | null
  configuration?: Record<string, unknown>
}

export interface AdapterActionResult {
  checked_at: string
  adapter_id: string
  ok: boolean
  status: AdapterRegistryStatus
  detail: string
}

export type TrainingAudience =
  | 'all'
  | 'recreational'
  | 'commercial'
  | 'enterprise'
  | 'public_sector'
  | 'developer'
  | 'education'

export type TrainingCourseId =
  | 'TRUST_BASICS'
  | 'PART_107_FOUNDATIONS'
  | 'PART_107_RECURRENT_CURRENCY'
  | 'COMMERCIAL_OPERATIONS'
  | 'REAL_ESTATE_MEDIA_OPERATIONS'
  | 'AGRICULTURE_FIELD_OPERATIONS'
  | 'INSPECTION_MISSION_EXECUTION'
  | 'SURVEY_MAPPING_OPERATIONS'
  | 'MUNICIPAL_PROGRAM_FOUNDATIONS'
  | 'MUNICIPAL_FIELD_OPERATIONS'
  | 'PUBLIC_SAFETY_UAS_OPERATIONS'
  | 'PUBLIC_SAFETY_COMMAND_COORDINATION'
  | 'DEVELOPER_PLATFORM_ONBOARDING'
  | 'ORGANIZATION_READINESS_ADMIN'

export type TrainingPathwayId =
  | 'TRUST_STARTER'
  | 'PART_107_CERTIFICATION'
  | 'PART_107_RECURRENCY_PATHWAY'
  | 'COMMERCIAL_READINESS_PATHWAY'
  | 'REAL_ESTATE_MEDIA_PATHWAY'
  | 'AGRICULTURE_OPERATIONS_PATHWAY'
  | 'INSPECTION_READINESS_PATHWAY'
  | 'SURVEY_MAPPING_PATHWAY'
  | 'MUNICIPAL_PROGRAM_PATHWAY'
  | 'MUNICIPAL_FIELD_OPERATIONS_PATHWAY'
  | 'PUBLIC_SAFETY_PATHWAY'
  | 'PUBLIC_SAFETY_COMMAND_PATHWAY'
  | 'DEVELOPER_PLATFORM_PATHWAY'
  | 'ORGANIZATION_READINESS_PATHWAY'

export interface TrainingCourseDefinition {
  id: TrainingCourseId
  title: string
  summary: string
  audience: TrainingAudience
  duration_minutes: number
  modality: 'self_paced' | 'instructor_led' | 'assessment'
  tags: string[]
}

export interface TrainingPathwayDefinition {
  id: TrainingPathwayId
  title: string
  summary: string
  audience: TrainingAudience
  segment_ids: SegmentId[]
  training_entitlements: TrainingEntitlement[]
  required_pack_ids: SolutionPackId[]
  target_roles: Array<StandaloneRoleTarget>
  course_ids: TrainingCourseId[]
  qualification_outcomes: string[]
}

export interface TrainingCatalogResponse {
  generated_at: string
  tenant_id: string
  segment_id: SegmentId
  training_entitlement: TrainingEntitlement
  training_catalog_mode: TrainingCatalogMode
  purchased_training_addon_ids: TrainingAddOnId[]
  courses: TrainingCourseDefinition[]
  pathways: TrainingPathwayDefinition[]
  recommended_pathway_ids: TrainingPathwayId[]
}

export interface TrainingPathwayListResponse {
  generated_at: string
  tenant_id: string
  segment_id: SegmentId
  training_entitlement: TrainingEntitlement
  training_catalog_mode: TrainingCatalogMode
  pathways: TrainingPathwayDefinition[]
  count: number
}

export type TrainingEnrollmentStatus = 'ENROLLED' | 'IN_PROGRESS' | 'COMPLETED'

export interface TrainingEnrollment {
  id: string
  tenant_id: string
  user_id: string
  pathway_id: TrainingPathwayId
  pathway_title: string
  status: TrainingEnrollmentStatus
  assigned_by_user_id: string
  assigned_by_label: string
  enrolled_at: string
  started_at: string | null
  completed_at: string | null
  due_at: string | null
  completed_course_ids: TrainingCourseId[]
  remaining_course_ids: TrainingCourseId[]
  progress_percent: number
}

export interface TrainingEnrollmentListResponse {
  generated_at: string
  tenant_id: string
  enrollments: TrainingEnrollment[]
  count: number
}

export interface CreateTrainingEnrollmentRequest {
  pathway_id: TrainingPathwayId
  user_id?: string
  due_at?: string | null
}

export interface RecordTrainingCompletionRequest {
  enrollment_id: string
  course_id: TrainingCourseId
}

export interface TrainingCohort {
  id: string
  tenant_id: string
  name: string
  description: string
  lms_cohort_id: string | null
  lms_active_enrollment_count: number
  lms_completed_enrollment_count: number
  lms_at_risk_learner_count: number
  member_user_ids: string[]
  pathway_ids: TrainingPathwayId[]
  due_at: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string
}

export interface TrainingCohortListResponse {
  generated_at: string
  tenant_id: string
  cohorts: TrainingCohort[]
  count: number
}

export interface TrainingLearnerAdminSummary {
  user_id: string
  name: string
  email: string
  role: string
  readiness_status: 'READY' | 'WARNING' | 'BLOCKED'
  outstanding_requirements: number
  expiring_qualifications: number
  completed_pathways: number
  completed_courses: number
  passed_assessments: number
  total_learning_minutes: number
  active_enrollments: number
  completed_enrollments: number
  lms_risk_level: 'LOW' | 'MEDIUM' | 'HIGH'
  lms_average_progress_percent: number
  lms_average_grade_percent: number | null
  lms_missing_competency_count: number
  lms_content_manifest_count: number
  lms_personalized_delivery_count: number
}

export interface TrainingAdminOverviewResponse {
  generated_at: string
  tenant_id: string
  summary: {
    tracked_learners: number
    ready_learners: number
    warning_learners: number
    blocked_learners: number
    cohorts: number
    active_enrollments: number
    lms_operator_summary: {
      portal_id: string
      bound_cohort_count: number
      bound_course_run_count: number
      bound_session_count: number
      active_lms_enrollment_count: number
      live_course_run_count: number
      learner_risk_count: number
      high_risk_learner_count: number
      instructor_workspace_count: number
      manager_workspace_count: number
    }
  }
  learners: TrainingLearnerAdminSummary[]
  cohorts: TrainingCohort[]
}

export interface CreateTrainingCohortRequest {
  name: string
  description?: string | null
  member_user_ids?: string[]
  pathway_ids?: TrainingPathwayId[]
  due_at?: string | null
}

export interface UpdateTrainingCohortRequest {
  name?: string
  description?: string | null
  member_user_ids?: string[]
  pathway_ids?: TrainingPathwayId[]
  due_at?: string | null
}

export interface AssignTrainingCohortResponse {
  generated_at: string
  tenant_id: string
  cohort: TrainingCohort
  enrollments: TrainingEnrollment[]
  created_count: number
}

export type CourseStudioDraftStatus = 'DRAFT' | 'PUBLISHED'

export interface CourseStudioDraft {
  id: string
  tenant_id: string
  course_id: TrainingCourseId
  title_override: string | null
  summary_override: string | null
  instructor_note: string
  authored_modules: TrainingModuleDefinition[]
  additional_reference_assets: TrainingStudyAsset[]
  status: CourseStudioDraftStatus
  created_at: string
  updated_at: string
  published_at: string | null
  created_by_user_id: string
}

export interface CourseStudioDraftListResponse {
  generated_at: string
  tenant_id: string
  drafts: CourseStudioDraft[]
  count: number
}

export interface CreateCourseStudioDraftRequest {
  course_id: TrainingCourseId
  title_override?: string | null
  summary_override?: string | null
  instructor_note?: string | null
  authored_modules?: TrainingModuleDefinition[]
  additional_reference_assets?: TrainingStudyAsset[]
}

export interface UpdateCourseStudioDraftRequest {
  title_override?: string | null
  summary_override?: string | null
  instructor_note?: string | null
  authored_modules?: TrainingModuleDefinition[]
  additional_reference_assets?: TrainingStudyAsset[]
  status?: CourseStudioDraftStatus
}

export interface PublishCourseStudioDraftResponse {
  generated_at: string
  tenant_id: string
  draft: CourseStudioDraft
}

export type InstructorCourseRunStatus = 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'COMPLETED'

export interface InstructorCourseRun {
  id: string
  tenant_id: string
  title: string
  course_id: TrainingCourseId
  lms_course_run_id: string | null
  lms_session_ids: string[]
  lms_active_learner_count: number
  lms_at_risk_learner_count: number
  lms_upcoming_session_count: number
  lms_grading_queue_count: number
  lms_assignment_count: number
  pathway_ids: TrainingPathwayId[]
  cohort_ids: string[]
  instructor_user_ids: string[]
  learner_user_ids: string[]
  scheduled_start_at: string | null
  scheduled_end_at: string | null
  session_count: number
  status: InstructorCourseRunStatus
  session_outline: string[]
  notes: string
  created_at: string
  updated_at: string
  launched_at: string | null
  created_by_user_id: string
}

export interface InstructorCourseRunListResponse {
  generated_at: string
  tenant_id: string
  runs: InstructorCourseRun[]
  count: number
}

export interface CreateInstructorCourseRunRequest {
  title: string
  course_id: TrainingCourseId
  pathway_ids?: TrainingPathwayId[]
  cohort_ids?: string[]
  instructor_user_ids?: string[]
  learner_user_ids?: string[]
  scheduled_start_at?: string | null
  scheduled_end_at?: string | null
  session_count?: number
  session_outline?: string[]
  notes?: string | null
}

export interface UpdateInstructorCourseRunRequest {
  title?: string
  pathway_ids?: TrainingPathwayId[]
  cohort_ids?: string[]
  instructor_user_ids?: string[]
  learner_user_ids?: string[]
  scheduled_start_at?: string | null
  scheduled_end_at?: string | null
  session_count?: number
  session_outline?: string[]
  notes?: string | null
  status?: InstructorCourseRunStatus
}

export interface LaunchInstructorCourseRunResponse {
  generated_at: string
  tenant_id: string
  run: InstructorCourseRun
  enrollments: TrainingEnrollment[]
  created_count: number
  targeted_learner_count: number
}

export interface TrainingInstructorRunRuntimeSessionSummary {
  session_id: string
  title: string
  status: string
  scheduled_start_at: string | null
  scheduled_end_at: string | null
  facilitator_principal_ids: string[]
  attendance_record_count: number
  present_count: number
  late_count: number
  absent_count: number
}

export interface TrainingInstructorRunRuntimeAssignmentSummary {
  assignment_id: string
  title: string
  status: string
  assignment_type: string
  grading_mode: string
  due_at: string | null
  max_points: number
  passing_percent: number
  attempt_count: number
  pending_grading_count: number
  in_review_grading_count: number
}

export interface TrainingInstructorRunRuntimeAttemptSummary {
  attempt_id: string
  assignment_id: string
  assignment_title: string
  enrollment_id: string
  learner_principal_id: string
  learner_label: string
  status: string
  submitted_at: string | null
  graded_at: string | null
  score_percent: number | null
  earned_points: number | null
  grading_mode: string
  feedback: string
  graded_by_user_id: string | null
  queue_item_id: string | null
}

export interface TrainingInstructorRunRuntimeGradingQueueSummary {
  queue_id: string
  attempt_id: string
  assignment_id: string
  assignment_title: string
  enrollment_id: string
  learner_principal_id: string
  learner_label: string
  status: LmsGradingQueueStatus
  priority: LmsQueuePriority
  grader_principal_id: string | null
  submitted_at: string
  resolved_at: string | null
}

export interface TrainingInstructorRunRuntimeEnrollmentSummary {
  enrollment_id: string
  learner_principal_id: string
  learner_label: string
  status: string
  progress_percent: number
  latest_grade_percent: number | null
  attendance_percent: number | null
}

export interface TrainingInstructorRunRuntimeDetailResponse {
  generated_at: string
  tenant_id: string
  run: InstructorCourseRun
  runtime_summary: {
    session_count: number
    scheduled_session_count: number
    live_session_count: number
    completed_session_count: number
    attendance_record_count: number
    present_attendance_count: number
    late_attendance_count: number
    absent_attendance_count: number
    assignment_count: number
    attempt_count: number
    pending_grading_queue_count: number
    in_review_grading_queue_count: number
  }
  enrollments: TrainingInstructorRunRuntimeEnrollmentSummary[]
  sessions: TrainingInstructorRunRuntimeSessionSummary[]
  assignments: TrainingInstructorRunRuntimeAssignmentSummary[]
  attempts: TrainingInstructorRunRuntimeAttemptSummary[]
  grading_queue: TrainingInstructorRunRuntimeGradingQueueSummary[]
}

export interface CreateTrainingInstructorRunAttendanceRequest {
  enrollment_id: string
  status: LmsAttendanceStatus
  minutes_attended?: number
  note?: string
}

export interface RecordTrainingInstructorRunAttendanceResponse {
  generated_at: string
  tenant_id: string
  attendance_record: LmsAttendanceRecord
  runtime: TrainingInstructorRunRuntimeDetailResponse
}

export interface CreateTrainingInstructorRunSessionRequest {
  title: string
  summary?: string
  session_type?: LmsSessionType
  status?: LmsSessionStatus
  scheduled_start_at?: string | null
  scheduled_end_at?: string | null
  facilitator_principal_ids?: string[]
  attendance_capture_mode?: LmsAttendanceCaptureMode
  join_url?: string | null
  location_label?: string | null
}

export interface UpdateTrainingInstructorRunSessionRequest {
  title?: string
  summary?: string
  session_type?: LmsSessionType
  status?: LmsSessionStatus
  scheduled_start_at?: string | null
  scheduled_end_at?: string | null
  facilitator_principal_ids?: string[]
  attendance_capture_mode?: LmsAttendanceCaptureMode
  join_url?: string | null
  location_label?: string | null
}

export interface CreateTrainingInstructorRunSessionResponse {
  generated_at: string
  tenant_id: string
  session: LmsSessionRecord
  runtime: TrainingInstructorRunRuntimeDetailResponse
}

export interface UpdateTrainingInstructorRunSessionResponse {
  generated_at: string
  tenant_id: string
  session: LmsSessionRecord
  runtime: TrainingInstructorRunRuntimeDetailResponse
}

export interface CreateTrainingInstructorRunAssignmentRequest {
  title: string
  summary?: string
  assignment_type?: LmsAssignmentType
  status?: LmsAssignmentStatus
  grading_mode?: LmsGradingMode
  rubric_id?: string | null
  assessment_package_ref?: string | null
  max_attempts?: number
  max_points?: number
  passing_percent?: number
  available_from_at?: string | null
  due_at?: string | null
}

export interface UpdateTrainingInstructorRunAssignmentRequest {
  title?: string
  summary?: string
  assignment_type?: LmsAssignmentType
  status?: LmsAssignmentStatus
  grading_mode?: LmsGradingMode
  rubric_id?: string | null
  assessment_package_ref?: string | null
  max_attempts?: number
  max_points?: number
  passing_percent?: number
  available_from_at?: string | null
  due_at?: string | null
}

export interface CreateTrainingInstructorRunAssignmentResponse {
  generated_at: string
  tenant_id: string
  assignment: LmsAssignmentRecord
  runtime: TrainingInstructorRunRuntimeDetailResponse
}

export interface UpdateTrainingInstructorRunAssignmentResponse {
  generated_at: string
  tenant_id: string
  assignment: LmsAssignmentRecord
  runtime: TrainingInstructorRunRuntimeDetailResponse
}

export interface UpdateTrainingInstructorRunGradingQueueRequest {
  status?: LmsGradingQueueStatus
  priority?: LmsQueuePriority
  grader_principal_id?: string | null
}

export interface UpdateTrainingInstructorRunGradingQueueResponse {
  generated_at: string
  tenant_id: string
  queue_item: LmsGradingQueueRecord
  runtime: TrainingInstructorRunRuntimeDetailResponse
}

export interface GradeTrainingInstructorRunAttemptRequest {
  grader_principal_id?: string | null
  feedback?: string
  score_percent?: number | null
  rubric_id?: string | null
  rubric_scores?: Array<{
    criterion_id: string
    points_awarded: number
    note?: string
  }>
}

export interface GradeTrainingInstructorRunAttemptResponse {
  generated_at: string
  tenant_id: string
  attempt: LmsAttemptRecord
  runtime: TrainingInstructorRunRuntimeDetailResponse
}

export type TrainingAssessmentType = 'QUIZ' | 'PRACTICE_EXAM'

export type TrainingKnowledgeAreaId =
  | 'PART107_REGULATIONS'
  | 'AIRSPACE_AUTHORIZATION'
  | 'WEATHER'
  | 'PERFORMANCE_AND_EMERGENCIES'
  | 'AIRPORT_OPERATIONS'
  | 'ADM_AND_HUMAN_FACTORS'

export interface TrainingExamBlueprintDomain {
  id: TrainingKnowledgeAreaId
  title: string
  summary: string
  emphasis: 'FOUNDATIONAL' | 'CORE' | 'HIGH_PRIORITY'
  recommended_study_minutes: number
  objectives: string[]
}

export type TrainingLessonSectionType = 'CONCEPT' | 'PROCEDURE' | 'EXAM_TRAP' | 'FIELD_APPLICATION'
export type TrainingStudyAssetType =
  | 'GUIDE'
  | 'CHECKLIST'
  | 'WORKSHEET'
  | 'REFERENCE'
  | 'JOB_AID'
  | 'TRANSCRIPT'
  | 'STUDY_PLAN'
  | 'DOWNLOADABLE'
export type TrainingStudyAssetFormat = 'TEXT' | 'CHECKLIST' | 'TABLE'
export type TrainingFlashcardDifficulty = 'FOUNDATIONAL' | 'CORE' | 'CHALLENGE'
export type TrainingTranscriptSegmentType = 'INTRODUCTION' | 'LECTURE' | 'EXAMPLE' | 'REVIEW'

export interface TrainingTranscriptSegment {
  id: string
  heading: string
  segment_type: TrainingTranscriptSegmentType
  speaker_label: string
  content: string[]
}

export interface TrainingLessonTranscript {
  summary: string
  estimated_read_minutes: number
  downloadable_asset_title: string
  segments: TrainingTranscriptSegment[]
}

export interface TrainingStudyPlanPhase {
  id: string
  title: string
  focus: string
  recommended_days: number
  lesson_ids: string[]
  actions: string[]
}

export interface TrainingLessonSection {
  id: string
  title: string
  section_type: TrainingLessonSectionType
  content: string[]
}

export interface TrainingStudyAsset {
  id: string
  title: string
  asset_type: TrainingStudyAssetType
  format: TrainingStudyAssetFormat
  summary: string
  content: string[]
  downloadable: boolean
  file_name: string | null
}

export interface TrainingFlashcard {
  id: string
  prompt: string
  answer: string
  knowledge_area_id: TrainingKnowledgeAreaId
  difficulty: TrainingFlashcardDifficulty
}

export interface TrainingLessonDefinition {
  id: string
  title: string
  summary: string
  estimated_minutes: number
  objectives: string[]
  study_points: string[]
  knowledge_area_ids: TrainingKnowledgeAreaId[]
  overview: string
  sections: TrainingLessonSection[]
  exam_tips: string[]
  common_misconceptions: string[]
  scenario_prompt: string
  study_assets: TrainingStudyAsset[]
  flashcards: TrainingFlashcard[]
  transcript: TrainingLessonTranscript
}

export interface TrainingModuleDefinition {
  id: string
  title: string
  summary: string
  knowledge_area_ids: TrainingKnowledgeAreaId[]
  lessons: TrainingLessonDefinition[]
}

export interface TrainingAssessmentDefinition {
  id: string
  title: string
  summary: string
  type: TrainingAssessmentType
  related_pathway_ids: TrainingPathwayId[]
  related_pack_ids: SolutionPackId[]
  estimated_minutes: number
  passing_score_percent: number
}

export interface TrainingAssessmentAttempt {
  id: string
  tenant_id: string
  user_id: string
  assessment_id: string
  assessment_title: string
  assessment_type: TrainingAssessmentType
  score_percent: number
  passed: boolean
  completed_at: string
}

export interface TrainingAssessmentCatalogResponse {
  generated_at: string
  tenant_id: string
  user_id: string
  assessments: Array<TrainingAssessmentDefinition & { latest_attempt: TrainingAssessmentAttempt | null }>
  count: number
}

export interface PracticeExamCatalogResponse {
  generated_at: string
  tenant_id: string
  user_id: string
  practice_exams: Array<TrainingAssessmentDefinition & { latest_attempt: TrainingAssessmentAttempt | null }>
  count: number
}

export interface TrainingAssessmentAttemptListResponse {
  generated_at: string
  tenant_id: string
  user_id: string
  attempts: TrainingAssessmentAttempt[]
  count: number
}

export interface RecordTrainingAssessmentAttemptRequest {
  assessment_id: string
  score_percent: number
}

export interface TrainingCourseCurriculumResponse {
  generated_at: string
  tenant_id: string
  user_id: string
  course: TrainingCourseDefinition
  curriculum: {
    course_id: TrainingCourseId
    syllabus_version: string
    certification_target: 'PART_107' | null
    summary: string
    study_advice: string[]
    practical_tasks: string[]
    study_plan: TrainingStudyPlanPhase[]
    reference_library: TrainingStudyAsset[]
    blueprint: TrainingExamBlueprintDomain[]
    modules: TrainingModuleDefinition[]
  }
  progress: {
    completed_lesson_ids: string[]
    total_lessons: number
    completed_lessons: number
    total_modules: number
    completed_modules: number
    completion_percent: number
    estimated_minutes_completed: number
    course_completed: boolean
  }
}

export interface TrainingAssessmentDetailResponse {
  generated_at: string
  tenant_id: string
  user_id: string
  assessment: TrainingAssessmentDefinition & { latest_attempt: TrainingAssessmentAttempt | null }
  blueprint: {
    certification_target: 'PART_107' | null
    domains: TrainingExamBlueprintDomain[]
  }
  available_question_count: number
  question_pool: {
    total_questions: number
    recommended_session_length: number
    randomized_session_support: boolean
    estimated_variant_count: number
    domains: Array<{
      domain_id: TrainingKnowledgeAreaId
      title: string
      available_question_count: number
    }>
  }
}

export interface CreateAssessmentSessionRequest {
  question_count?: number
}

export interface TrainingAssessmentSessionQuestion {
  id: string
  domain_id: TrainingKnowledgeAreaId
  prompt: string
  learning_objective: string
  choices: Array<{
    id: string
    text: string
  }>
}

export interface TrainingAssessmentDomainResult {
  domain_id: TrainingKnowledgeAreaId
  correct_answers: number
  total_questions: number
  score_percent: number
}

export interface TrainingAssessmentReviewItem {
  question_id: string
  domain_id: TrainingKnowledgeAreaId
  prompt: string
  learning_objective: string
  choices: Array<{
    id: string
    text: string
  }>
  selected_choice_id: string | null
  correct_choice_id: string
  correct: boolean
  explanation: string
}

export interface TrainingAssessmentSessionResponse {
  generated_at: string
  tenant_id: string
  user_id: string
  session: {
    id: string
    assessment_id: string
    assessment_title: string
    assessment_type: TrainingAssessmentType
    created_at: string
    expires_at: string
    status: 'IN_PROGRESS' | 'SUBMITTED'
    question_count: number
    questions: TrainingAssessmentSessionQuestion[]
  }
}

export interface SubmitAssessmentSessionRequest {
  answers: Array<{
    question_id: string
    choice_id: string
  }>
}

export interface TrainingAssessmentSessionResultResponse {
  generated_at: string
  tenant_id: string
  user_id: string
  session: {
    id: string
    assessment_id: string
    assessment_title: string
    assessment_type: TrainingAssessmentType
    created_at: string
    submitted_at: string
    status: 'SUBMITTED'
    question_count: number
    score_percent: number
    passed: boolean
    domain_results: TrainingAssessmentDomainResult[]
    review: TrainingAssessmentReviewItem[]
  }
  attempt: TrainingAssessmentAttempt
}

export type QualificationType =
  | 'TRUST'
  | 'PART_107'
  | 'PART_107_RECURRENT'
  | 'COMMERCIAL_OPERATIONS'
  | 'REAL_ESTATE_MEDIA_READY'
  | 'AGRICULTURE_READY'
  | 'INSPECTION_READY'
  | 'SURVEY_MAPPING_READY'
  | 'MUNICIPAL_PROGRAM_READY'
  | 'MUNICIPAL_FIELD_READY'
  | 'PUBLIC_SAFETY_READY'
  | 'PUBLIC_SAFETY_COMMAND_READY'
  | 'DEVELOPER_PLATFORM_READY'
  | 'READINESS_ADMIN'

export interface QualificationRecord {
  id: string
  tenant_id: string
  user_id: string
  qualification_type: QualificationType
  issuer: string
  source: 'seed' | 'manual_import'
  reference_id: string | null
  issued_at: string
  expires_at: string | null
  evidence_note: string | null
  imported_at: string
}

export interface QualificationListResponse {
  generated_at: string
  tenant_id: string
  qualifications: QualificationRecord[]
  count: number
}

export interface ImportQualificationsRequest {
  user_id?: string
  qualifications: Array<{
    qualification_type: QualificationType
    issuer: string
    reference_id?: string | null
    issued_at: string
    expires_at?: string | null
    evidence_note?: string | null
  }>
}

export interface ReadinessRequirement {
  id: string
  requirement_type: 'training_pathway' | 'qualification'
  label: string
  summary: string
  pathway_id?: TrainingPathwayId
  qualification_type?: QualificationType
  satisfied: boolean
  blocking: boolean
  satisfied_by?: string
  expires_at?: string | null
}

export interface ReadinessRequirementsResponse {
  generated_at: string
  tenant_id: string
  user_id: string
  segment_id: SegmentId
  requirements: ReadinessRequirement[]
  count: number
}

export type ReadinessActionType =
  | 'RECERTIFICATION_DUE'
  | 'REMEDIATION_RECOMMENDED'
  | 'QUALIFICATION_EXPIRING'

export type ReadinessActionPriority = 'HIGH' | 'MEDIUM' | 'LOW'

export type ReadinessActionStatus = 'OPEN' | 'DUE_SOON' | 'OVERDUE'

export interface ReadinessAction {
  id: string
  tenant_id: string
  user_id: string
  action_type: ReadinessActionType
  priority: ReadinessActionPriority
  status: ReadinessActionStatus
  title: string
  summary: string
  due_at: string | null
  pathway_id: TrainingPathwayId | null
  pathway_title: string | null
  qualification_type: QualificationType | null
  related_enrollment_id: string | null
  related_program_id: string | null
  content_manifest_id: string | null
  remediation_binding_ids: string[]
  automation_run_id: string | null
  automation_summary: string | null
  notification_campaign_id: string | null
  notification_status: 'NOT_SCHEDULED' | 'SCHEDULED' | 'SENT' | null
  last_notified_at: string | null
  assigned_manager_ids: string[]
  approval_required: boolean
  approval_id: string | null
  approval_status: 'NOT_REQUIRED' | 'NOT_REQUESTED' | 'PENDING' | 'APPROVED' | 'DECLINED'
  approval_requested_at: string | null
  approved_at: string | null
  approved_by_user_id: string | null
}

export interface ReadinessActionsResponse {
  generated_at: string
  tenant_id: string
  user_id: string
  actions: ReadinessAction[]
  count: number
  summary: {
    overdue_actions: number
    high_priority_actions: number
    recertification_due_actions: number
    remediation_actions: number
    expiring_qualification_actions: number
  }
}

export interface EnrollReadinessActionRequest {
  user_id?: string
}

export interface AssignReadinessActionRemediationRequest {
  user_id?: string
}

export interface DispatchReadinessActionNotificationRequest {
  user_id?: string
  channel?: LmsNotificationChannel
  scheduled_at?: string | null
}

export interface RequestReadinessActionApprovalRequest {
  user_id?: string
  note?: string
}

export interface ApproveReadinessActionRequest {
  user_id?: string
  approved?: boolean
  note?: string
}

export interface RenewReadinessActionRequest {
  user_id?: string
}

export interface ReadinessActionEnrollmentResponse {
  generated_at: string
  tenant_id: string
  user_id: string
  action: ReadinessAction
  enrollment: TrainingEnrollment
}

export interface ReadinessActionRemediationResponse {
  generated_at: string
  tenant_id: string
  user_id: string
  action: ReadinessAction
  content_manifest: {
    id: string
    enrollment_id: string
    program_id: string
    remediation_package_count: number
    remediation_packages: Array<{
      binding_id: string
      course_entry_id: string
      course_title: string
      trigger_kind: string
      assignment_id: string | null
      competency_id: string | null
    }>
    resolved_at: string
  }
}

export interface ReadinessActionDispatchResponse {
  generated_at: string
  tenant_id: string
  user_id: string
  action: ReadinessAction
  notification_campaign: {
    id: string
    target_kind: 'PORTAL' | 'COHORT' | 'COURSE_RUN' | 'ENROLLMENT' | 'LEARNER'
    target_ref: string
    channel: LmsNotificationChannel
    status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'ARCHIVED'
    scheduled_at: string | null
    sent_at: string | null
  }
}

export interface ReadinessApprovalRecord {
  id: string
  tenant_id: string
  action_id: string
  user_id: string
  manager_principal_ids: string[]
  status: 'PENDING' | 'APPROVED' | 'DECLINED'
  requested_at: string
  requested_by_user_id: string
  request_note: string | null
  decided_at: string | null
  decided_by_user_id: string | null
  decision_note: string | null
}

export interface ReadinessActionApprovalResponse {
  generated_at: string
  tenant_id: string
  user_id: string
  action: ReadinessAction
  approval: ReadinessApprovalRecord
}

export interface ReadinessActionRenewalResponse {
  generated_at: string
  tenant_id: string
  user_id: string
  action: ReadinessAction
  approval: ReadinessApprovalRecord | null
  enrollment: TrainingEnrollment
  renewal_status: 'IN_PROGRESS' | 'COMPLETED'
  renewed_certificate_id: string | null
}

export interface ReadinessRuleDefinition {
  id: string
  label: string
  summary: string
  requirement_type: 'training_pathway' | 'qualification'
  qualification_type?: QualificationType
  pathway_id?: TrainingPathwayId
  blocking: boolean
  segment_ids: SegmentId[]
  pack_ids: SolutionPackId[]
  target_roles: Array<StandaloneRoleTarget>
}

export interface ReadinessRuleListResponse {
  generated_at: string
  tenant_id: string
  segment_id: SegmentId
  pack_ids: SolutionPackId[]
  rules: ReadinessRuleDefinition[]
  count: number
}

export interface ReadinessDecisionRecord {
  id: string
  tenant_id: string
  user_id: string
  segment_id: SegmentId
  pack_ids: SolutionPackId[]
  overall_status: 'READY' | 'WARNING' | 'BLOCKED'
  ok: boolean
  source: 'READINESS_AUTHORITY'
  requirement_count: number
  satisfied_requirement_count: number
  outstanding_requirement_count: number
  blocking_count: number
  warning_count: number
  blockers: string[]
  warnings: string[]
  requirement_signature: string
  created_at: string
  created_by_user_id: string
  requirements: ReadinessRequirement[]
}

export interface ReadinessDecisionListResponse {
  generated_at: string
  tenant_id: string
  user_id: string | null
  latest_decision: ReadinessDecisionRecord | null
  decisions: ReadinessDecisionRecord[]
  count: number
}

export interface ReadinessStatusResponse {
  generated_at: string
  tenant_id: string
  user_id: string
  overall_status: 'READY' | 'WARNING' | 'BLOCKED'
  satisfied_requirements: number
  outstanding_requirements: number
  expiring_qualifications: number
  recommendations: string[]
  requirements: ReadinessRequirement[]
  decision_id: string | null
  decision_source: 'READINESS_AUTHORITY' | null
  evaluated_at: string | null
  organization_summary: {
    tracked_users: number
    ready_users: number
    warning_users: number
    blocked_users: number
  }
}

export interface ReadinessEvaluationRequest {
  user_id?: string
  segment_id?: SegmentId
  pack_ids?: SolutionPackId[]
}

export interface ReadinessEvaluationResponse {
  checked_at: string
  tenant_id: string
  user_id: string
  ok: boolean
  overall_status: 'READY' | 'WARNING' | 'BLOCKED'
  decision_id: string
  decision_source: 'READINESS_AUTHORITY'
  blockers: string[]
  warnings: string[]
  requirements: ReadinessRequirement[]
}

export interface TrainingTranscriptResponse {
  generated_at: string
  tenant_id: string
  user_id: string
  learner: {
    name: string
    email: string
  }
  summary: {
    completed_pathways: number
    completed_courses: number
    qualifications: number
    passed_assessments: number
    total_learning_minutes: number
  }
  pathways: Array<{
    pathway_id: string
    pathway_title: string
    status: string
    enrolled_at: string
    completed_at: string | null
    completed_course_ids: string[]
    progress_percent: number
  }>
  qualifications: QualificationRecord[]
  assessments: TrainingAssessmentAttempt[]
}

export type BillingCycle = 'monthly' | 'annual'
export type BillingStatus = 'trialing' | 'active' | 'past_due'
export type CompanySizeBand = 'solo' | '2-10' | '11-50' | '51-200' | '201+'

export interface BillingAddress {
  line1: string
  line2?: string
  city: string
  state: string
  postal_code: string
  country: string
}

export interface BillingPaymentMethodInput {
  cardholder_name: string
  card_number: string
  expiry_month: number
  expiry_year: number
  postal_code: string
}

export interface BillingPaymentMethod {
  brand: 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown'
  last4: string
  expiry_month: number
  expiry_year: number
  postal_code: string
  cardholder_name: string
  token_reference: string
  added_at: string
}

export interface BillingInvoice {
  id: string
  issued_at: string
  status: 'paid' | 'open'
  description: string
  amount_cents: number
  currency: 'USD'
}

export interface AccountPlan {
  id: 'INDIVIDUAL_BASIC' | 'INDIVIDUAL_PRO' | 'ENTERPRISE'
  name: string
  account_type: 'INDIVIDUAL' | 'ORGANIZATION'
  organization_kind?: 'GROUP' | 'COMPANY'
  subscription_tier: 'BASIC' | 'PRO' | 'ENTERPRISE' | 'GOVERNMENT'
  deployment_profile: 'SHARED_SAAS' | 'US_ENTERPRISE' | 'GOVERNMENT_SENSITIVE'
  assurance_mode: 'STANDARD' | 'HARDENED' | 'GOVERNMENT'
  price_monthly_cents: number
  price_annual_cents: number
  included_seats: number
  max_users: number
  max_aircraft: number
  max_managed_assets?: number
  default_service_entitlement: ServiceEntitlement
  available_service_entitlements: ServiceEntitlement[]
  included_training_entitlement: TrainingEntitlement
  training_catalog_mode: TrainingCatalogMode
  available_training_addon_ids: TrainingAddOnId[]
  features: string[]
  training_summary: string
  summary: string
}

export interface BillingProfile {
  tenant_id: string
  account_type: 'INDIVIDUAL' | 'ORGANIZATION'
  organization_kind?: 'GROUP' | 'COMPANY'
  organization_name: string
  subscription_tier: 'BASIC' | 'PRO' | 'ENTERPRISE' | 'GOVERNMENT'
  service_entitlement: ServiceEntitlement
  plan_id: AccountPlan['id']
  plan_name: string
  training_entitlement: TrainingEntitlement
  training_catalog_mode: TrainingCatalogMode
  purchased_training_addon_ids: TrainingAddOnId[]
  billing_cycle: BillingCycle
  status: BillingStatus
  billing_email: string
  billing_contact_name: string
  tax_id?: string
  seats_included: number
  seats_in_use: number
  max_aircraft: number
  max_managed_assets?: number
  currency: 'USD'
  amount_cents: number
  training_addon_amount_cents: number
  address: BillingAddress
  payment_method: BillingPaymentMethod | null
  invoices: BillingInvoice[]
  created_at: string
  updated_at: string
}

export interface BillingProfileUpdateRequest extends Partial<Omit<BillingProfile, 'payment_method'>> {
  payment_method?: BillingPaymentMethodInput | BillingPaymentMethod | null
}

export interface OrganizationProfile {
  tenant_id: string
  account_type: 'INDIVIDUAL' | 'ORGANIZATION'
  organization_kind?: 'GROUP' | 'COMPANY'
  legal_name: string
  display_name: string
  domain?: string
  company_size: CompanySizeBand
  owner_user_id: string
  owner_name: string
  owner_email: string
  seat_limit: number
  active_user_count: number
  role_templates: Array<{
    id: ManagedTenantRole
    role_alias?: ManagedTenantRoleAlias
    label: string
    description: string
  }>
  created_at: string
  updated_at: string
}

export interface AccountRegistrationRequest {
  account_type: 'INDIVIDUAL' | 'ORGANIZATION'
  organization_kind?: 'GROUP' | 'COMPANY'
  organization_name: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  password: string
  plan_id: AccountPlan['id']
  service_entitlement?: ServiceEntitlement
  billing_cycle: BillingCycle
  billing_email: string
  billing_contact_name: string
  company_size?: CompanySizeBand
  tax_id?: string
  domain?: string
  address: BillingAddress
  payment_method: BillingPaymentMethodInput
}

export interface AccountRegistrationResponse {
  registration_id: string
  tenant: TenantContextTenant
  current_membership: TenantContextMembership
  user: {
    id: string
    name: string
    email: string
  }
  billing_profile: BillingProfile
  organization_profile: OrganizationProfile
  identity: {
    user_id: string
    tenant_id: string
    session_id: string | null
    next_route: string
  }
  provisioning?: {
    mode: 'STANDALONE_IAM'
    realm_id: string
    client_id: string
    provider_user_id: string
    existing_provider_user: boolean
    required_actions: string[]
  }
  activation_handoff?: {
    login_url: string
    login_hint: string
    flow_context: 'account_activation'
  }
  correlation_id: string
  timestamp: string
}

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

export interface AuthLoginRequest {
  email: string
  password: string
  tenant_id?: string
  login_mode?: 'customer_portal'
}

export interface ProviderLoginRequest {
  tenant_id: string
  provider_id?: string
  assertion: string
}

export interface AuthIamCodeExchangeRequest {
  realm_id?: string
  client_id?: string
  code: string
  code_verifier: string
  redirect_uri: string
  tenant_id?: string
}

export interface IdpIamAuthorizationRequestCreateRequest {
  realm_id?: string
  redirect_uri: string
  state: string
  nonce: string
  scope?: string
  login_hint?: string
  flow_context?: string
  code_challenge: string
  code_challenge_method: 'plain' | 'S256'
}

export interface IdpIamAuthorizationRequestCreateResponse {
  realm_id: string
  client_id: string
  authorization_request_id: string
  redirect_url: string
  expires_at: string
}

export type IdpApplicationIdentityProviderKind = 'STANDALONE_IAM' | 'EXTERNAL_OIDC'

export type IdpApplicationIdentityTransportMode = 'REST_SERVICE' | 'INTERNAL_SDK'

export interface IdpIamConfigResponse {
  client_id: string
  realm_id: string
  realm_name: string
  binding_id: string | null
  binding_mode: 'DIRECT' | 'DEFAULT' | 'OVERRIDE'
  fallback_binding_used: boolean
  authorization_profile_id: string
  authorization_projection_mode: 'APPLICATION_BINDING_CLAIM_MAPPING'
  tenant_membership_strategy:
    'PLATFORM_ADMIN_ALL_TENANTS_OR_EXPLICIT_IDENTITY_MEMBERSHIP_WITH_LOCAL_USER_FALLBACK'
  provider_kind: IdpApplicationIdentityProviderKind
  application_identity_source: 'IDP_APPLICATION_CONFIGURATION'
  managed_role_assignment_candidates: {
    admin: string[]
    operator: string[]
    specialist?: string[]
    viewer: string[]
  }
  notes: string[]
  configuration_warning: string | null
  timestamp: string
}

export interface IdpApplicationIdentityConfigurationResponse {
  provider_kind: IdpApplicationIdentityProviderKind
  transport_mode: IdpApplicationIdentityTransportMode
  rest_service_base_url: string | null
  sdk_package_name: string | null
  sdk_package_version: string | null
  realm_id: string | null
  realm_name: string | null
  realm_exists: boolean
  client_id: string
  authorization_profile_id: string | null
  oidc_issuer_url: string | null
  oidc_authorization_endpoint: string | null
  oidc_token_endpoint: string | null
  oidc_userinfo_endpoint: string | null
  oidc_jwks_uri: string | null
  requested_scopes: string[]
  notes: string[]
  updated_at: string
  updated_by_user_id: string
  provider_kind_options: IdpApplicationIdentityProviderKind[]
  transport_mode_options: IdpApplicationIdentityTransportMode[]
  warnings: string[]
  timestamp: string
}

export interface UpdateIdpApplicationIdentityConfigurationRequest {
  provider_kind?: IdpApplicationIdentityProviderKind
  transport_mode?: IdpApplicationIdentityTransportMode
  rest_service_base_url?: string | null
  sdk_package_name?: string | null
  sdk_package_version?: string | null
  realm_id?: string | null
  client_id?: string
  authorization_profile_id?: string | null
  oidc_issuer_url?: string | null
  oidc_authorization_endpoint?: string | null
  oidc_token_endpoint?: string | null
  oidc_userinfo_endpoint?: string | null
  oidc_jwks_uri?: string | null
  requested_scopes?: string[]
  notes?: string[]
}

export interface PublicTeamInvitationResponse {
  invitation_token: string
  tenant_id: string
  tenant_name: string
  email: string
  role: ManagedTenantRole
  role_alias?: ManagedTenantRoleAlias
  invited_by: string
  invited_at: string
  expires_at: string
  status:
    | 'PENDING'
    | 'ACTIVATION_REQUIRED'
    | 'ACTIVATED'
    | 'REVOKED'
    | 'EXPIRED'
    | 'PROVIDER_DISABLED'
    | 'PROVIDER_USER_MISSING'
  activation_handoff_url: string
  invitation_url: string
  provider_lifecycle_state: 'PROVIDER_READY' | 'PROVIDER_ACTION_REQUIRED' | 'PROVIDER_DISABLED' | 'PROVIDER_USER_MISSING' | null
  provider_required_actions: string[]
}

export interface AuthSessionTenantSelectionRequest {
  tenant_id: string
}

export interface AuthBootstrapResponse extends TenantContextResponse {
  authenticated: true
  auth: {
    user_id: string
    tenant_id: string | null
    session_id: string
    next_route: string
  }
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
