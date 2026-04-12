import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import {
  readPersistedStateSnapshot,
} from './persistence';
import {
  createPersistedAsyncIamStateRepository,
  createPersistedIamStateRepository,
  type IamAsyncStateRepository,
  type IamStateRepository,
} from './iamStateRepository';
import {
  normalizeBindingTargetKind as normalizeStoredBindingTargetKind,
  normalizeIamIdentifier,
  normalizeRealmScopeKind as normalizeStoredRealmScopeKind,
  rewriteIamIdentifiers,
} from './iamIdentifiers';
export { IAM_PLATFORM_SCOPE_ID } from './iamIdentifiers';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

interface IamListPagination {
  limit?: number | null;
  offset?: number | null;
}

interface IamListPaginationResult<T> {
  data: T[];
  limit: number;
  offset: number;
  count: number;
  has_more: boolean;
}

const DEFAULT_LIST_LIMIT = 200;
const MAX_LIST_LIMIT = 1000;

function normalizeListPagination(input: IamListPagination | undefined): { limit: number; offset: number } {
  const limit = Math.max(1, Math.min(
    Number.parseInt(String(input?.limit ?? `${DEFAULT_LIST_LIMIT}`), 10) || DEFAULT_LIST_LIMIT,
    MAX_LIST_LIMIT,
  ));
  const offset = Math.max(0, Number.parseInt(String(input?.offset ?? '0'), 10) || 0);
  return { limit, offset };
}

function paginateList<T>(items: T[], pagination?: IamListPagination): IamListPaginationResult<T> {
  if (pagination === undefined) {
    return {
      limit: items.length,
      offset: 0,
      data: items,
      count: items.length,
      has_more: false,
    };
  }

  const { limit, offset } = normalizeListPagination(pagination);
  const start = Math.min(offset, items.length);
  const end = Math.min(start + limit, items.length);
  return {
    limit,
    offset,
    data: items.slice(start, end),
    count: items.length,
    has_more: end < items.length,
  };
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

function nextUniqueId(label: string, existingIds: Set<string>, fallbackPrefix: string): string {
  const base = slugify(label) || `${fallbackPrefix}-${randomUUID().slice(0, 8)}`;
  if (!existingIds.has(base)) {
    return base;
  }

  let suffix = 2;
  while (existingIds.has(`${base}-${suffix}`)) {
    suffix += 1;
  }

  return `${base}-${suffix}`;
}

export type IamPhase =
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
  | 'FULL_IDP_PHASE_L';
export type IamSubsystemStatus =
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
  | 'STANDALONE_READINESS_AND_MARKET_POSITION_REVIEW_IMPLEMENTED';
export type IamMigrationState = 'BLOCKED_UNTIL_PHASE_6' | 'BLOCKED_PENDING_STANDALONE_ADOPTION';
export type IamNextPhase =
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
  | 'FULL_IDP_PHASE_M_ADOPTION_PLANNING_ONLY';
export type IamRealmScopeKind = 'PLATFORM_DEFAULT' | 'STANDALONE_VALIDATION' | 'TENANT_OVERRIDE';
export type IamRealmStatus = 'STANDALONE_VALIDATION' | 'READY_FOR_FOUNDATION_PHASE' | 'ACTIVE' | 'ARCHIVED';
export type IamRealmTemplateKind = 'FOUNDATION' | 'FIRST_PARTY' | 'EMBEDDED_PARTNER' | 'TENANT_OVERRIDE';
export type IamRealmTemplateStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type IamRealmPosturePresetKind =
  | 'INSTITUTIONAL_SSO'
  | 'PRIVACY_SENSITIVE'
  | 'GUARDIAN_PROXY'
  | 'MINOR_SERVING'
  | 'PORTABLE_IDENTITY';
export type IamRealmPosturePresetStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type IamIdentityPrivacyClassification = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED' | 'PROTECTED';
export type IamDelegatedRelationshipKind = 'GUARDIAN' | 'PARENT' | 'CAREGIVER' | 'SPONSOR' | 'AUTHORIZED_PROXY' | 'LEGAL_REPRESENTATIVE';
export type IamDelegatedRelationshipStatus = 'ACTIVE' | 'PAUSED' | 'REVOKED' | 'EXPIRED';
export type IamDelegatedConsentStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';
export type IamDelegatedConsentRequestStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'CANCELLED' | 'EXPIRED';
export type IamPortableIdentityStatus = 'ACTIVE' | 'PROVISIONING' | 'DISABLED';
export type IamBindingTargetKind = 'APPLICATION' | 'TENANT_SPACE';
export type IamRealmBindingMode = 'DIRECT' | 'DEFAULT' | 'OVERRIDE';
export type IamTenantRealmRole = 'PRIMARY' | 'EXCEPTION';
export type IamUserStatus = 'STAGED' | 'ACTIVE' | 'DISABLED';
export type IamGroupStatus = 'ACTIVE' | 'ARCHIVED';
export type IamRoleKind = 'REALM_ROLE' | 'CLIENT_ROLE' | 'COMPOSITE_ROLE';
export type IamRoleStatus = 'ACTIVE' | 'ARCHIVED';
export type IamAuthorizationPlaneKind = 'INFORMATIVE' | 'ENFORCEMENT';
export type IamConsumerDeliveryStatus = 'PLANNED' | 'AVAILABLE' | 'ENABLED';
export type IamApplicationAuthenticationMode =
  | 'browser_authorization_code_pkce'
  | 'browser_authorization_code'
  | 'browser_direct_login';
export type IamApplicationMembershipProjectionStrategy =
  | 'EXPLICIT_MEMBERSHIP_ONLY'
  | 'PLATFORM_ADMIN_OR_EXPLICIT_MEMBERSHIP'
  | 'CLAIMS_ONLY'
  | 'CLAIMS_AND_EXPLICIT_MEMBERSHIP';
export type IamDelegatedAdminPrincipalKind = 'USER' | 'GROUP';
export type IamDelegatedAdminStatus = 'ACTIVE' | 'DISABLED';
export type IamRealmExportStatus = 'READY';

const LEGACY_IAM_FOUNDATION_FILE = 'iam-foundation-state.json';
const IAM_FOUNDATION_DIRECTORY_FILE = 'iam-foundation-directory-state.json';
const IAM_FOUNDATION_DELEGATED_CONSENT_REQUESTS_FILE = 'iam-foundation-delegated-consent-requests-state.json';

export interface IamRealmRecord {
  id: string;
  name: string;
  summary: string;
  attributes?: Record<string, string>;
  scope_kind: IamRealmScopeKind;
  status: IamRealmStatus;
  synthetic: boolean;
  intended_consumers: string[];
  supported_protocols: Array<'OIDC' | 'OAUTH2' | 'SAML'>;
  template_id: string | null;
  posture_preset_ids?: string[];
  source_realm_id: string | null;
  owner_tenant_id: string | null;
  tenant_realm_role: IamTenantRealmRole | null;
  exception_reason: string | null;
  exception_purpose: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamRealmTemplateRecord {
  id: string;
  name: string;
  summary: string;
  kind: IamRealmTemplateKind;
  status: IamRealmTemplateStatus;
  baseline_roles: string[];
  baseline_clients: string[];
  supported_protocols: Array<'OIDC' | 'OAUTH2' | 'SAML'>;
  posture_preset_ids?: string[];
  synthetic: boolean;
}

export interface IamRealmPosturePresetRecord {
  id: string;
  name: string;
  summary: string;
  kind: IamRealmPosturePresetKind;
  status: IamRealmPosturePresetStatus;
  realm_template_id: string;
  privacy_classification: IamIdentityPrivacyClassification;
  consent_required: boolean;
  delegated_relationships_enabled: boolean;
  portable_identity_enabled: boolean;
  supported_protocols: Array<'OIDC' | 'OAUTH2' | 'SAML'>;
  synthetic: boolean;
}

export interface IamIdentityPrivacyPolicyRecord {
  id: string;
  realm_id: string;
  name: string;
  summary: string;
  classification: IamIdentityPrivacyClassification;
  consent_required: boolean;
  data_minimization_enabled: boolean;
  protected_record_access: boolean;
  attribute_release_tags: string[];
  synthetic: boolean;
}

export interface IamDelegatedRelationshipRecord {
  id: string;
  realm_id: string;
  relationship_kind: IamDelegatedRelationshipKind;
  status: IamDelegatedRelationshipStatus;
  principal_user_id: string;
  delegate_user_id: string;
  start_at: string | null;
  end_at: string | null;
  allowed_scopes: string[];
  allowed_purposes?: string[];
  consent_required: boolean;
  consented_scope_names?: string[];
  consented_purpose_names?: string[];
  notes: string[];
  synthetic: boolean;
}

export interface IamDelegatedConsentRecord {
  id: string;
  realm_id: string;
  relationship_id: string;
  principal_user_id: string;
  delegate_user_id: string;
  status: IamDelegatedConsentStatus;
  scope_names: string[];
  purpose_names: string[];
  granted_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  granted_by_user_id: string;
  revoked_by_user_id: string | null;
  notes: string[];
  synthetic: boolean;
}

export interface IamDelegatedConsentRequestRecord {
  id: string;
  realm_id: string;
  relationship_id: string;
  principal_user_id: string;
  delegate_user_id: string;
  requested_by_user_id: string;
  status: IamDelegatedConsentRequestStatus;
  requested_scope_names: string[];
  requested_purpose_names: string[];
  requested_at: string;
  expires_at: string | null;
  responded_at: string | null;
  decided_by_user_id: string | null;
  delegated_consent_id: string | null;
  request_notes: string[];
  decision_notes: string[];
  synthetic: boolean;
}

export interface IamPortableIdentityRecord {
  id: string;
  realm_id: string;
  user_id: string;
  external_subject_id: string;
  issuer: string;
  home_organization_name: string;
  portable_identifier: string;
  relationship_id: string | null;
  status: IamPortableIdentityStatus;
  attribute_release_policy_ids: string[];
  synthetic: boolean;
}

export interface IamFoundationTransientStateMaintenanceResult {
  expired_delegated_consent_count: number;
  expired_delegated_consent_request_count: number;
  total_mutated_count: number;
}

export interface IamRealmBindingRecord {
  id: string;
  binding_target_kind: IamBindingTargetKind;
  binding_target_id: string;
  binding_target_name: string;
  binding_target_tenant_id: string | null;
  binding_mode: IamRealmBindingMode;
  realm_id: string;
  realm_name: string;
  source_realm_id: string | null;
  override_reason: string | null;
  override_purpose: string | null;
  override_approved_by_user_id: string | null;
  override_approved_at: string | null;
  notes: string[];
  consumer_contract: IamConsumerContractDescriptor | null;
  auth_binding: IamApplicationAuthBindingDescriptor | null;
  projection_policy: IamApplicationProjectionPolicyDescriptor | null;
  created_at: string;
  updated_at: string;
  updated_by_user_id: string;
}

export interface IamApplicationAuthBindingDescriptor {
  client_id: string;
  preferred_authentication_mode: IamApplicationAuthenticationMode;
  supported_authentication_modes: IamApplicationAuthenticationMode[];
  summary: string;
}

export interface IamApplicationProjectionMatchRule {
  role_names: string[];
  group_names: string[];
}

export interface IamApplicationProjectionManagedRoleMapping {
  managed_role_id: string;
  summary: string;
  match: IamApplicationProjectionMatchRule;
}

export interface IamApplicationProjectionPolicyDescriptor {
  policy_id: string;
  summary: string;
  membership_projection_strategy: IamApplicationMembershipProjectionStrategy;
  platform_administrator_rule: IamApplicationProjectionMatchRule | null;
  managed_role_mappings: IamApplicationProjectionManagedRoleMapping[];
  projection_sources: string[];
}

export interface IamConsumerContractDescriptor {
  application_id: string;
  application_name: string;
  contract_version: string;
  informative_authorization_plane: IamAuthorizationPlaneKind;
  enforcement_plane: IamAuthorizationPlaneKind;
  enforcement_owner: string;
  principal_context_source: 'IDP';
  tenant_context_source: 'IDP';
  identity_access_facts_source: 'IDP';
  business_policy_source: 'EXTERNAL_APPLICATIONS';
  summary: string;
  migration_scope: string[];
  external_policy_sources: string[];
  identity_bootstrap_delivery: IamConsumerDeliveryStatus;
  principal_context_delivery: IamConsumerDeliveryStatus;
  tenant_context_delivery: IamConsumerDeliveryStatus;
  identity_access_facts_delivery: IamConsumerDeliveryStatus;
  account_self_service_delivery: IamConsumerDeliveryStatus;
}

export interface IamValidationDomain {
  id: string;
  name: string;
  summary: string;
  proves: string[];
  migration_blocked: boolean;
}

export interface IamUserRecord {
  id: string;
  realm_id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  status: IamUserStatus;
  synthetic: boolean;
  privacy_classification?: IamIdentityPrivacyClassification | null;
  home_organization_name?: string | null;
  external_subject_id?: string | null;
  required_actions: string[];
  role_ids: string[];
  group_ids: string[];
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamGroupRecord {
  id: string;
  realm_id: string;
  name: string;
  summary: string;
  status: IamGroupStatus;
  synthetic: boolean;
  parent_group_id: string | null;
  role_ids: string[];
  member_user_ids: string[];
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamRoleRecord {
  id: string;
  realm_id: string;
  name: string;
  summary: string;
  kind: IamRoleKind;
  status: IamRoleStatus;
  synthetic: boolean;
  client_id: string | null;
  composite_role_ids: string[];
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamDelegatedAdminRecord {
  id: string;
  realm_id: string;
  principal_kind: IamDelegatedAdminPrincipalKind;
  principal_id: string;
  principal_label: string;
  status: IamDelegatedAdminStatus;
  managed_role_ids: string[];
  managed_group_ids: string[];
  managed_client_ids: string[];
  notes: string[];
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamRealmExportRecord {
  id: string;
  realm_id: string;
  realm_name: string;
  status: IamRealmExportStatus;
  exported_at: string;
  created_by_user_id: string;
  object_key: string;
  summary: {
    user_count: number;
    group_count: number;
    role_count: number;
    delegated_admin_count: number;
  };
}

export interface IamSummaryResponse {
  generated_at: string;
  phase: IamPhase;
  subsystem_status: IamSubsystemStatus;
  migration_state: IamMigrationState;
  admin_surface_route: string;
  scope_model: 'STANDALONE_MULTI_REALM_WITH_CONSUMER_BINDINGS';
  global_admin_role: 'super_administrator';
  realm_count: number;
  realm_template_count: number;
  realm_binding_count: number;
  validation_domain_count: number;
  user_count: number;
  group_count: number;
  role_count: number;
  delegated_admin_count: number;
  realm_export_count: number;
  auth_flow_count?: number;
  auth_execution_count?: number;
  realm_auth_flow_binding_count?: number;
  client_auth_flow_binding_count?: number;
  client_count?: number;
  client_scope_count?: number;
  protocol_mapper_count?: number;
  service_account_count?: number;
  issued_token_count?: number;
  active_signing_key_count?: number;
  saml_auth_request_count?: number;
  active_saml_auth_request_count?: number;
  saml_session_count?: number;
  active_saml_session_count?: number;
  browser_session_count?: number;
  active_browser_session_count?: number;
  consent_record_count?: number;
  active_consent_record_count?: number;
  login_transaction_count?: number;
  active_login_transaction_count?: number;
  mfa_enrollment_count?: number;
  active_mfa_enrollment_count?: number;
  password_reset_ticket_count?: number;
  email_verification_ticket_count?: number;
  failed_login_attempt_count?: number;
  active_lockout_count?: number;
  profile_schema_count?: number;
  profile_record_count?: number;
  realm_posture_preset_count?: number;
  identity_privacy_policy_count?: number;
  delegated_relationship_count?: number;
  delegated_consent_count?: number;
  delegated_consent_request_count?: number;
  portable_identity_count?: number;
  organization_count?: number;
  organization_membership_count?: number;
  organization_invitation_count?: number;
  admin_permission_count?: number;
  admin_policy_count?: number;
  admin_evaluation_count?: number;
  resource_server_count?: number;
  protected_scope_count?: number;
  protected_resource_count?: number;
  authorization_policy_count?: number;
  authorization_permission_count?: number;
  authorization_evaluation_count?: number;
  permission_ticket_count?: number;
  active_permission_ticket_count?: number;
  extension_interface_count?: number;
  extension_package_count?: number;
  extension_provider_count?: number;
  active_extension_provider_count?: number;
  extension_binding_count?: number;
  active_extension_binding_count?: number;
  theme_package_provider_count?: number;
  identity_provider_count?: number;
  active_identity_provider_count?: number;
  user_federation_provider_count?: number;
  active_user_federation_provider_count?: number;
  linked_identity_count?: number;
  federation_sync_job_count?: number;
  federation_event_count?: number;
  realm_theme_count?: number;
  localization_bundle_count?: number;
  notification_template_count?: number;
  notification_delivery_count?: number;
  backup_count?: number;
  restore_count?: number;
  key_rotation_count?: number;
  resilience_run_count?: number;
  readiness_review_count?: number;
  operations_health?: 'HEALTHY' | 'DEGRADED' | 'FAILED';
  latest_readiness_decision?: 'APPROVED' | 'BLOCKED' | null;
  security_audit_request_count?: number;
  security_audit_failure_count?: number;
  first_contract_ids: string[];
  next_recommended_phase: IamNextPhase;
}

export interface IamRealmsResponse {
  generated_at: string;
  realms: IamRealmRecord[];
  count: number;
  offset?: number;
  limit?: number;
  has_more?: boolean;
}

export interface IamRealmTemplatesResponse {
  generated_at: string;
  realm_templates: IamRealmTemplateRecord[];
  count: number;
}

export interface IamRealmPosturePresetsResponse {
  generated_at: string;
  realm_posture_presets: IamRealmPosturePresetRecord[];
  count: number;
}

export interface IamIdentityPrivacyPoliciesResponse {
  generated_at: string;
  identity_privacy_policies: IamIdentityPrivacyPolicyRecord[];
  count: number;
}

export interface IamDelegatedRelationshipsResponse {
  generated_at: string;
  delegated_relationships: IamDelegatedRelationshipRecord[];
  count: number;
}

export interface IamDelegatedConsentsResponse {
  generated_at: string;
  delegated_consents: IamDelegatedConsentRecord[];
  count: number;
}

export interface IamDelegatedConsentRequestsResponse {
  generated_at: string;
  delegated_consent_requests: IamDelegatedConsentRequestRecord[];
  count: number;
}

export interface IamPortableIdentitiesResponse {
  generated_at: string;
  portable_identities: IamPortableIdentityRecord[];
  count: number;
}

export interface IamRealmBindingsResponse {
  generated_at: string;
  realm_bindings: IamRealmBindingRecord[];
  count: number;
}

export interface IamConsumerContractResponse {
  generated_at: string;
  binding_id: string;
  binding_target_kind: IamBindingTargetKind;
  binding_target_id: string;
  binding_target_name: string;
  consumer_contract: IamConsumerContractDescriptor | null;
}

export interface IamValidationDomainsResponse {
  generated_at: string;
  validation_domains: IamValidationDomain[];
  count: number;
}

export interface IamUsersResponse {
  generated_at: string;
  users: IamUserRecord[];
  count: number;
  offset?: number;
  limit?: number;
  has_more?: boolean;
}

export interface IamGroupsResponse {
  generated_at: string;
  groups: IamGroupRecord[];
  count: number;
  offset?: number;
  limit?: number;
  has_more?: boolean;
}

export interface IamRolesResponse {
  generated_at: string;
  roles: IamRoleRecord[];
  count: number;
  offset?: number;
  limit?: number;
  has_more?: boolean;
}

export interface IamDelegatedAdminsResponse {
  generated_at: string;
  delegated_admins: IamDelegatedAdminRecord[];
  count: number;
}

export interface IamRealmExportsResponse {
  generated_at: string;
  realm_exports: IamRealmExportRecord[];
  count: number;
}

export interface CreateIamRealmRequest {
  name: string;
  summary: string;
  scope_kind?: IamRealmScopeKind;
  status?: IamRealmStatus;
  intended_consumers?: string[];
  supported_protocols?: Array<'OIDC' | 'OAUTH2' | 'SAML'>;
  template_id?: string | null;
  posture_preset_ids?: string[];
  owner_tenant_id?: string | null;
  tenant_realm_role?: IamTenantRealmRole;
  exception_reason?: string | null;
  exception_purpose?: string | null;
  clone_from_realm_id?: string | null;
}

export interface UpdateIamRealmRequest {
  name?: string;
  summary?: string;
  status?: IamRealmStatus;
  intended_consumers?: string[];
  supported_protocols?: Array<'OIDC' | 'OAUTH2' | 'SAML'>;
  posture_preset_ids?: string[] | null;
  owner_tenant_id?: string | null;
  tenant_realm_role?: IamTenantRealmRole;
  exception_reason?: string | null;
  exception_purpose?: string | null;
}

export interface IamRealmAttributeRecord {
  id: string;
  realm_id: string;
  key: string;
  value: string;
  updated_at: string;
  updated_by_user_id: string;
}

export interface IamRealmAttributesResponse {
  generated_at: string;
  realm_id: string;
  attributes: IamRealmAttributeRecord[];
  count: number;
}

export interface CreateIamRealmAttributeRequest {
  key: string;
  value: string;
}

export interface UpdateIamRealmAttributeRequest {
  key?: string;
  value?: string;
}

export interface UpdateIamRealmBindingRequest {
  binding_mode?: IamRealmBindingMode;
  realm_id?: string;
  override_reason?: string | null;
  override_purpose?: string | null;
  notes?: string[];
  consumer_contract?: IamConsumerContractDescriptor | null;
  auth_binding?: IamApplicationAuthBindingDescriptor | null;
  projection_policy?: IamApplicationProjectionPolicyDescriptor | null;
}

export interface CreateIamUserRequest {
  realm_id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  status?: IamUserStatus;
  privacy_classification?: IamIdentityPrivacyClassification | null;
  home_organization_name?: string | null;
  external_subject_id?: string | null;
  required_actions?: string[];
  role_ids?: string[];
  group_ids?: string[];
}

export interface UpdateIamUserRequest {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  status?: IamUserStatus;
  privacy_classification?: IamIdentityPrivacyClassification | null;
  home_organization_name?: string | null;
  external_subject_id?: string | null;
  required_actions?: string[];
  role_ids?: string[];
  group_ids?: string[];
}

export interface CreateIamGroupRequest {
  realm_id: string;
  name: string;
  summary?: string;
  status?: IamGroupStatus;
  parent_group_id?: string | null;
  role_ids?: string[];
  member_user_ids?: string[];
}

export interface UpdateIamGroupRequest {
  name?: string;
  summary?: string;
  status?: IamGroupStatus;
  parent_group_id?: string | null;
  role_ids?: string[];
  member_user_ids?: string[];
}

export interface CreateIamRoleRequest {
  realm_id: string;
  name: string;
  summary?: string;
  kind?: IamRoleKind;
  client_id?: string | null;
  composite_role_ids?: string[];
  status?: IamRoleStatus;
}

export interface UpdateIamRoleRequest {
  name?: string;
  summary?: string;
  client_id?: string | null;
  composite_role_ids?: string[];
  status?: IamRoleStatus;
}

export interface CreateIamDelegatedAdminRequest {
  realm_id: string;
  principal_kind: IamDelegatedAdminPrincipalKind;
  principal_id: string;
  principal_label: string;
  managed_role_ids?: string[];
  managed_group_ids?: string[];
  managed_client_ids?: string[];
  notes?: string[];
  status?: IamDelegatedAdminStatus;
}

export interface UpdateIamDelegatedAdminRequest {
  principal_label?: string;
  managed_role_ids?: string[];
  managed_group_ids?: string[];
  managed_client_ids?: string[];
  notes?: string[];
  status?: IamDelegatedAdminStatus;
}

export interface CreateIamDelegatedConsentRequest {
  realm_id: string;
  relationship_id: string;
  scope_names: string[];
  purpose_names?: string[];
  expires_at?: string | null;
  notes?: string[];
}

export interface UpdateIamDelegatedConsentRequest {
  status?: IamDelegatedConsentStatus;
  expires_at?: string | null;
  notes?: string[];
}

export interface CreateIamDelegatedConsentRequestRequest {
  realm_id: string;
  relationship_id: string;
  requested_scope_names: string[];
  requested_purpose_names?: string[];
  expires_at?: string | null;
  request_notes?: string[];
}

export interface UpdateIamDelegatedConsentRequestRequest {
  status?: IamDelegatedConsentRequestStatus;
  expires_at?: string | null;
  decision_notes?: string[];
  delegated_consent_id?: string | null;
}

interface IamFoundationState {
  realms: IamRealmRecord[];
  realm_templates: IamRealmTemplateRecord[];
  realm_posture_presets: IamRealmPosturePresetRecord[];
  identity_privacy_policies: IamIdentityPrivacyPolicyRecord[];
  delegated_relationships: IamDelegatedRelationshipRecord[];
  delegated_consents: IamDelegatedConsentRecord[];
  delegated_consent_requests: IamDelegatedConsentRequestRecord[];
  portable_identities: IamPortableIdentityRecord[];
  realm_bindings: IamRealmBindingRecord[];
  validation_domains: IamValidationDomain[];
  users: IamUserRecord[];
  groups: IamGroupRecord[];
  roles: IamRoleRecord[];
  delegated_admins: IamDelegatedAdminRecord[];
  realm_exports: IamRealmExportRecord[];
}

interface IamFoundationDirectoryState {
  realms: IamRealmRecord[];
  realm_templates: IamRealmTemplateRecord[];
  realm_posture_presets: IamRealmPosturePresetRecord[];
  identity_privacy_policies: IamIdentityPrivacyPolicyRecord[];
  delegated_relationships: IamDelegatedRelationshipRecord[];
  delegated_consents: IamDelegatedConsentRecord[];
  portable_identities: IamPortableIdentityRecord[];
  realm_bindings: IamRealmBindingRecord[];
  validation_domains: IamValidationDomain[];
  users: IamUserRecord[];
  groups: IamGroupRecord[];
  roles: IamRoleRecord[];
  delegated_admins: IamDelegatedAdminRecord[];
  realm_exports: IamRealmExportRecord[];
}

interface IamFoundationDelegatedConsentRequestsState {
  delegated_consent_requests: IamDelegatedConsentRequestRecord[];
}

interface IamFoundationDirectoryRepository extends IamStateRepository<IamFoundationDirectoryState> {}
interface IamAsyncFoundationDirectoryRepository extends IamAsyncStateRepository<IamFoundationDirectoryState> {}
interface IamFoundationDelegatedConsentRequestsRepository extends IamStateRepository<IamFoundationDelegatedConsentRequestsState> {}
interface IamAsyncFoundationDelegatedConsentRequestsRepository extends IamAsyncStateRepository<IamFoundationDelegatedConsentRequestsState> {}

function normalizeRealmScopeKind(value: unknown): IamRealmScopeKind {
  if (value === 'PLATFORM_DEFAULT' || value === 'STANDALONE_VALIDATION' || value === 'TENANT_OVERRIDE') {
    return value;
  }
  const legacyScopeKind = normalizeStoredRealmScopeKind(value);
  if (legacyScopeKind) {
    return legacyScopeKind;
  }
  return 'STANDALONE_VALIDATION';
}

function normalizeBindingTargetKind(value: unknown): IamBindingTargetKind {
  if (value === 'APPLICATION' || value === 'TENANT_SPACE') {
    return value;
  }
  const legacyBindingTargetKind = normalizeStoredBindingTargetKind(value);
  if (legacyBindingTargetKind) {
    return legacyBindingTargetKind;
  }
  return 'APPLICATION';
}

function normalizeTenantRealmRole(value: unknown): IamTenantRealmRole | null {
  if (value === 'PRIMARY' || value === 'EXCEPTION') {
    return value;
  }
  return null;
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeAuthorizationPlaneKind(value: unknown, fallback: IamAuthorizationPlaneKind): IamAuthorizationPlaneKind {
  return value === 'INFORMATIVE' || value === 'ENFORCEMENT' ? value : fallback;
}

function normalizeConsumerDeliveryStatus(value: unknown, fallback: IamConsumerDeliveryStatus): IamConsumerDeliveryStatus {
  return value === 'PLANNED' || value === 'AVAILABLE' || value === 'ENABLED' ? value : fallback;
}

function normalizeApplicationAuthenticationMode(
  value: unknown,
  fallback: IamApplicationAuthenticationMode,
): IamApplicationAuthenticationMode {
  return (
    value === 'browser_authorization_code_pkce'
    || value === 'browser_authorization_code'
    || value === 'browser_direct_login'
  )
    ? value
    : fallback;
}

function normalizeApplicationAuthBindingDescriptor(value: unknown): IamApplicationAuthBindingDescriptor | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Partial<IamApplicationAuthBindingDescriptor>;
  const clientId = normalizeOptionalText(record.client_id);
  const summary = normalizeOptionalText(record.summary);
  if (!clientId || !summary) {
    return null;
  }

  const supportedAuthenticationModes = Array.isArray(record.supported_authentication_modes)
    ? Array.from(new Set(
      record.supported_authentication_modes.map((entry) =>
        normalizeApplicationAuthenticationMode(entry, 'browser_authorization_code'),
      ),
    ))
    : [];
  const preferredAuthenticationMode = normalizeApplicationAuthenticationMode(
    record.preferred_authentication_mode,
    supportedAuthenticationModes[0] ?? 'browser_authorization_code',
  );

  if (!supportedAuthenticationModes.includes(preferredAuthenticationMode)) {
    supportedAuthenticationModes.unshift(preferredAuthenticationMode);
  }

  return {
    client_id: clientId,
    preferred_authentication_mode: preferredAuthenticationMode,
    supported_authentication_modes: supportedAuthenticationModes,
    summary,
  };
}

function normalizeApplicationMembershipProjectionStrategy(
  value: unknown,
  fallback: IamApplicationMembershipProjectionStrategy,
): IamApplicationMembershipProjectionStrategy {
  return (
    value === 'EXPLICIT_MEMBERSHIP_ONLY'
    || value === 'PLATFORM_ADMIN_OR_EXPLICIT_MEMBERSHIP'
    || value === 'CLAIMS_ONLY'
    || value === 'CLAIMS_AND_EXPLICIT_MEMBERSHIP'
  )
    ? value
    : fallback;
}

function normalizeProjectionMatchRule(value: unknown): IamApplicationProjectionMatchRule {
  const record = value && typeof value === 'object'
    ? value as Partial<IamApplicationProjectionMatchRule>
    : {};
  const roleNames = Array.isArray(record.role_names)
    ? record.role_names.map((entry) => `${entry}`.trim()).filter(Boolean)
    : [];
  const groupNames = Array.isArray(record.group_names)
    ? record.group_names.map((entry) => `${entry}`.trim()).filter(Boolean)
    : [];
  return {
    role_names: roleNames,
    group_names: groupNames,
  };
}

function normalizeProjectionManagedRoleMapping(
  value: unknown,
): IamApplicationProjectionManagedRoleMapping | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Partial<IamApplicationProjectionManagedRoleMapping>;
  const managedRoleId = normalizeOptionalText(record.managed_role_id);
  const summary = normalizeOptionalText(record.summary);
  if (!managedRoleId || !summary) {
    return null;
  }

  return {
    managed_role_id: managedRoleId,
    summary,
    match: normalizeProjectionMatchRule(record.match),
  };
}

function normalizeProjectionPolicyDescriptor(value: unknown): IamApplicationProjectionPolicyDescriptor | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Partial<IamApplicationProjectionPolicyDescriptor>;
  const policyId = normalizeOptionalText(record.policy_id);
  const summary = normalizeOptionalText(record.summary);
  if (!policyId || !summary) {
    return null;
  }

  const managedRoleMappings = Array.isArray(record.managed_role_mappings)
    ? record.managed_role_mappings
      .map((entry) => normalizeProjectionManagedRoleMapping(entry))
      .filter((entry): entry is IamApplicationProjectionManagedRoleMapping => Boolean(entry))
    : [];
  const projectionSources = Array.isArray(record.projection_sources)
    ? Array.from(new Set(record.projection_sources.map((entry) => `${entry}`.trim()).filter(Boolean)))
    : [];
  const platformAdministratorRule = record.platform_administrator_rule
    ? normalizeProjectionMatchRule(record.platform_administrator_rule)
    : null;

  return {
    policy_id: policyId,
    summary,
    membership_projection_strategy: normalizeApplicationMembershipProjectionStrategy(
      record.membership_projection_strategy,
      'EXPLICIT_MEMBERSHIP_ONLY',
    ),
    platform_administrator_rule: platformAdministratorRule,
    managed_role_mappings: managedRoleMappings,
    projection_sources: projectionSources,
  };
}

function normalizeConsumerContractDescriptor(value: unknown): IamConsumerContractDescriptor | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Partial<IamConsumerContractDescriptor>;
  const applicationId = normalizeOptionalText(record.application_id);
  const applicationName = normalizeOptionalText(record.application_name);
  const contractVersion = normalizeOptionalText(record.contract_version);
  const enforcementOwner = normalizeOptionalText(record.enforcement_owner);
  const summary = normalizeOptionalText(record.summary);

  if (!applicationId || !applicationName || !contractVersion || !enforcementOwner || !summary) {
    return null;
  }

  const migrationScope = Array.isArray(record.migration_scope)
    ? record.migration_scope.map((entry) => `${entry}`.trim()).filter(Boolean)
    : [];
  const externalPolicySources = Array.isArray(record.external_policy_sources)
    ? record.external_policy_sources.map((entry) => `${entry}`.trim()).filter(Boolean)
    : [];

  return {
    application_id: applicationId,
    application_name: applicationName,
    contract_version: contractVersion,
    informative_authorization_plane: normalizeAuthorizationPlaneKind(record.informative_authorization_plane, 'INFORMATIVE'),
    enforcement_plane: normalizeAuthorizationPlaneKind(record.enforcement_plane, 'ENFORCEMENT'),
    enforcement_owner: enforcementOwner,
    principal_context_source: 'IDP',
    tenant_context_source: 'IDP',
    identity_access_facts_source: 'IDP',
    business_policy_source: 'EXTERNAL_APPLICATIONS',
    summary,
    migration_scope: migrationScope,
    external_policy_sources: externalPolicySources,
    identity_bootstrap_delivery: normalizeConsumerDeliveryStatus(record.identity_bootstrap_delivery, 'PLANNED'),
    principal_context_delivery: normalizeConsumerDeliveryStatus(record.principal_context_delivery, 'PLANNED'),
    tenant_context_delivery: normalizeConsumerDeliveryStatus(record.tenant_context_delivery, 'PLANNED'),
    identity_access_facts_delivery: normalizeConsumerDeliveryStatus(record.identity_access_facts_delivery, 'PLANNED'),
    account_self_service_delivery: normalizeConsumerDeliveryStatus(record.account_self_service_delivery, 'PLANNED'),
  };
}

function chooseTenantPrimaryRealm(realms: IamRealmRecord[]): IamRealmRecord | null {
  if (realms.length === 0) {
    return null;
  }

  const explicitPrimary = realms.find((realm) => realm.tenant_realm_role === 'PRIMARY') ?? null;
  if (explicitPrimary) {
    return explicitPrimary;
  }

  const activeRealm = realms.find((realm) => realm.status !== 'ARCHIVED') ?? null;
  return activeRealm ?? realms[0];
}

function applyTenantRealmPolicyDefaults(realms: IamRealmRecord[]): IamRealmRecord[] {
  const nextRealms = realms.map((realm) => ({
    ...realm,
    owner_tenant_id: normalizeOptionalText(realm.owner_tenant_id),
    tenant_realm_role: normalizeTenantRealmRole(realm.tenant_realm_role),
    exception_reason: normalizeOptionalText(realm.exception_reason),
    exception_purpose: normalizeOptionalText(realm.exception_purpose),
  }));

  const tenantIds = Array.from(
    new Set(
      nextRealms
        .map((realm) => realm.owner_tenant_id)
        .filter((tenantId): tenantId is string => typeof tenantId === 'string' && tenantId.length > 0),
    ),
  );

  tenantIds.forEach((tenantId) => {
    const tenantRealms = nextRealms.filter((realm) => realm.owner_tenant_id === tenantId);
    const primaryRealm = chooseTenantPrimaryRealm(tenantRealms);
    if (!primaryRealm) {
      return;
    }

    tenantRealms.forEach((realm) => {
      if (realm.id === primaryRealm.id) {
        realm.tenant_realm_role = 'PRIMARY';
        realm.exception_reason = null;
        realm.exception_purpose = null;
      } else {
        realm.tenant_realm_role = 'EXCEPTION';
        realm.exception_reason = realm.exception_reason ?? 'Legacy tenant realm exception retained after policy normalization.';
        realm.exception_purpose = realm.exception_purpose ?? 'Legacy multi-realm tenant posture.';
      }
    });
  });

  nextRealms.forEach((realm) => {
    if (!realm.owner_tenant_id) {
      realm.tenant_realm_role = null;
      realm.exception_reason = null;
      realm.exception_purpose = null;
    }
  });

  return nextRealms;
}

function normalizeState(input: Partial<IamFoundationState>): IamFoundationState {
  input = rewriteIamIdentifiers(input);
  const seed = createSeedState();
  const normalizedRealms = Array.isArray(input.realms)
    ? [
      ...input.realms.map((realm) => {
        const seedRealm = seed.realms.find((candidate) => candidate.id === realm.id);
        return {
          ...(seedRealm ? clone(seedRealm) : {}),
          ...realm,
          scope_kind: normalizeRealmScopeKind(realm.scope_kind ?? seedRealm?.scope_kind),
          owner_tenant_id: normalizeOptionalText(realm.owner_tenant_id ?? seedRealm?.owner_tenant_id),
          tenant_realm_role: normalizeTenantRealmRole(realm.tenant_realm_role ?? seedRealm?.tenant_realm_role),
          exception_reason: normalizeOptionalText(realm.exception_reason ?? seedRealm?.exception_reason),
          exception_purpose: normalizeOptionalText(realm.exception_purpose ?? seedRealm?.exception_purpose),
        };
      }),
      ...seed.realms.filter((seedRealm) => !input.realms!.some((realm) => realm.id === seedRealm.id)),
    ]
    : seed.realms;
  const realms = applyTenantRealmPolicyDefaults(normalizedRealms);

  const realmBindings = Array.isArray(input.realm_bindings)
    ? input.realm_bindings.map((binding) => ({
      ...binding,
      binding_target_kind: normalizeBindingTargetKind(binding.binding_target_kind),
      binding_target_tenant_id: normalizeOptionalText(binding.binding_target_tenant_id),
      override_reason: normalizeOptionalText(binding.override_reason),
      override_purpose: normalizeOptionalText(binding.override_purpose),
      override_approved_by_user_id: normalizeOptionalText(binding.override_approved_by_user_id),
      override_approved_at: normalizeOptionalText(binding.override_approved_at),
      consumer_contract: normalizeConsumerContractDescriptor(binding.consumer_contract),
      auth_binding: normalizeApplicationAuthBindingDescriptor(binding.auth_binding),
      projection_policy: normalizeProjectionPolicyDescriptor(binding.projection_policy),
    }))
    : seed.realm_bindings;

  return {
    realms,
    realm_templates: Array.isArray(input.realm_templates)
      ? [
        ...input.realm_templates.map((template) => {
          const seedTemplate = seed.realm_templates.find((candidate) => candidate.id === template.id);
          return {
            ...(seedTemplate ? clone(seedTemplate) : {}),
            ...template,
          };
        }),
        ...seed.realm_templates.filter((seedTemplate) => !input.realm_templates!.some((template) => template.id === seedTemplate.id)),
      ]
      : seed.realm_templates,
    realm_posture_presets: Array.isArray(input.realm_posture_presets)
      ? [
        ...input.realm_posture_presets,
        ...seed.realm_posture_presets.filter((seedPreset) => !input.realm_posture_presets!.some((preset) => preset.id === seedPreset.id)),
      ]
      : seed.realm_posture_presets,
    identity_privacy_policies: Array.isArray(input.identity_privacy_policies)
      ? [
        ...input.identity_privacy_policies,
        ...seed.identity_privacy_policies.filter((seedPolicy) => !input.identity_privacy_policies!.some((policy) => policy.id === seedPolicy.id)),
      ]
      : seed.identity_privacy_policies,
    delegated_relationships: Array.isArray(input.delegated_relationships)
      ? [
        ...input.delegated_relationships.map((relationship) => {
          const seedRelationship = seed.delegated_relationships.find((candidate) => candidate.id === relationship.id);
          if (seedRelationship && (seedRelationship.synthetic || relationship.synthetic)) {
            return {
              ...relationship,
              ...clone(seedRelationship),
            };
          }
          return {
            ...(seedRelationship ? clone(seedRelationship) : {}),
            ...relationship,
          };
        }),
        ...seed.delegated_relationships.filter((seedRelationship) => !input.delegated_relationships!.some((relationship) => relationship.id === seedRelationship.id)),
      ]
      : seed.delegated_relationships,
    delegated_consents: Array.isArray(input.delegated_consents)
      ? [
        ...input.delegated_consents.map((consent) => {
          const seedConsent = seed.delegated_consents.find((candidate) => candidate.id === consent.id);
          if (seedConsent && (seedConsent.synthetic || consent.synthetic)) {
            return {
              ...consent,
              ...clone(seedConsent),
            };
          }
          return {
            ...(seedConsent ? clone(seedConsent) : {}),
            ...consent,
          };
        }),
        ...seed.delegated_consents.filter((seedConsent) => !input.delegated_consents!.some((consent) => consent.id === seedConsent.id)),
      ]
      : seed.delegated_consents,
    delegated_consent_requests: Array.isArray(input.delegated_consent_requests)
      ? [
        ...input.delegated_consent_requests.map((request) => {
          const seedRequest = seed.delegated_consent_requests.find((candidate) => candidate.id === request.id);
          if (seedRequest && (seedRequest.synthetic || request.synthetic)) {
            return {
              ...request,
              ...clone(seedRequest),
            };
          }
          return {
            ...(seedRequest ? clone(seedRequest) : {}),
            ...request,
          };
        }),
        ...seed.delegated_consent_requests.filter((seedRequest) => !input.delegated_consent_requests!.some((request) => request.id === seedRequest.id)),
      ]
      : seed.delegated_consent_requests,
    portable_identities: Array.isArray(input.portable_identities)
      ? [
        ...input.portable_identities,
        ...seed.portable_identities.filter((seedIdentity) => !input.portable_identities!.some((identity) => identity.id === seedIdentity.id)),
      ]
      : seed.portable_identities,
    realm_bindings: realmBindings,
    validation_domains: Array.isArray(input.validation_domains)
      ? [
        ...input.validation_domains,
        ...seed.validation_domains.filter((seedDomain) => !input.validation_domains!.some((domain) => domain.id === seedDomain.id)),
      ]
      : seed.validation_domains,
    users: Array.isArray(input.users)
      ? [
        ...input.users.map((user) => {
          const seedUser = seed.users.find((candidate) => candidate.id === user.id);
          if (seedUser && (seedUser.synthetic || user.synthetic)) {
            return {
              ...user,
              ...clone(seedUser),
            };
          }
          return {
            ...(seedUser ? clone(seedUser) : {}),
            ...user,
          };
        }),
        ...seed.users.filter((seedUser) => !input.users!.some((user) => user.id === seedUser.id)),
      ]
      : seed.users,
    groups: Array.isArray(input.groups)
      ? [
        ...input.groups,
        ...seed.groups.filter((seedGroup) => !input.groups!.some((group) => group.id === seedGroup.id)),
      ]
      : seed.groups,
    roles: Array.isArray(input.roles)
      ? [
        ...input.roles,
        ...seed.roles.filter((seedRole) => !input.roles!.some((role) => role.id === seedRole.id)),
      ]
      : seed.roles,
    delegated_admins: Array.isArray(input.delegated_admins) ? input.delegated_admins : seed.delegated_admins,
    realm_exports: Array.isArray(input.realm_exports) ? input.realm_exports : seed.realm_exports,
  };
}

function combineState(
  directoryState: IamFoundationDirectoryState,
  delegatedConsentRequestsState: IamFoundationDelegatedConsentRequestsState,
): IamFoundationState {
  return {
    realms: clone(directoryState.realms),
    realm_templates: clone(directoryState.realm_templates),
    realm_posture_presets: clone(directoryState.realm_posture_presets),
    identity_privacy_policies: clone(directoryState.identity_privacy_policies),
    delegated_relationships: clone(directoryState.delegated_relationships),
    delegated_consents: clone(directoryState.delegated_consents),
    delegated_consent_requests: clone(delegatedConsentRequestsState.delegated_consent_requests),
    portable_identities: clone(directoryState.portable_identities),
    realm_bindings: clone(directoryState.realm_bindings),
    validation_domains: clone(directoryState.validation_domains),
    users: clone(directoryState.users),
    groups: clone(directoryState.groups),
    roles: clone(directoryState.roles),
    delegated_admins: clone(directoryState.delegated_admins),
    realm_exports: clone(directoryState.realm_exports),
  };
}

function splitDirectoryState(input: IamFoundationState): IamFoundationDirectoryState {
  return {
    realms: clone(input.realms),
    realm_templates: clone(input.realm_templates),
    realm_posture_presets: clone(input.realm_posture_presets),
    identity_privacy_policies: clone(input.identity_privacy_policies),
    delegated_relationships: clone(input.delegated_relationships),
    delegated_consents: clone(input.delegated_consents),
    portable_identities: clone(input.portable_identities),
    realm_bindings: clone(input.realm_bindings),
    validation_domains: clone(input.validation_domains),
    users: clone(input.users),
    groups: clone(input.groups),
    roles: clone(input.roles),
    delegated_admins: clone(input.delegated_admins),
    realm_exports: clone(input.realm_exports),
  };
}

function splitDelegatedConsentRequestsState(
  input: IamFoundationState,
): IamFoundationDelegatedConsentRequestsState {
  return {
    delegated_consent_requests: clone(input.delegated_consent_requests),
  };
}

function normalizeDirectoryState(input: Partial<IamFoundationDirectoryState>): IamFoundationDirectoryState {
  return splitDirectoryState(normalizeState(input as Partial<IamFoundationState>));
}

function normalizeDelegatedConsentRequestsState(
  input: Partial<IamFoundationDelegatedConsentRequestsState>,
): IamFoundationDelegatedConsentRequestsState {
  return splitDelegatedConsentRequestsState(
    normalizeState(input as Partial<IamFoundationState>),
  );
}

function readLegacyFoundationStateSnapshot(): IamFoundationState {
  return normalizeState(
    readPersistedStateSnapshot<Partial<IamFoundationState>>(LEGACY_IAM_FOUNDATION_FILE) ?? {},
  );
}

const foundationDirectoryRepository: IamFoundationDirectoryRepository = createPersistedIamStateRepository<
  Partial<IamFoundationDirectoryState>,
  IamFoundationDirectoryState
>({
  fileName: IAM_FOUNDATION_DIRECTORY_FILE,
  seedFactory: () => normalizeDirectoryState(readLegacyFoundationStateSnapshot()),
  normalize: normalizeDirectoryState,
});

const foundationDirectoryAsyncRepository: IamAsyncFoundationDirectoryRepository = createPersistedAsyncIamStateRepository<
  Partial<IamFoundationDirectoryState>,
  IamFoundationDirectoryState
>({
  fileName: IAM_FOUNDATION_DIRECTORY_FILE,
  seedFactory: () => normalizeDirectoryState(readLegacyFoundationStateSnapshot()),
  normalize: normalizeDirectoryState,
});

const foundationDelegatedConsentRequestsRepository: IamFoundationDelegatedConsentRequestsRepository = createPersistedIamStateRepository<
  Partial<IamFoundationDelegatedConsentRequestsState>,
  IamFoundationDelegatedConsentRequestsState
>({
  fileName: IAM_FOUNDATION_DELEGATED_CONSENT_REQUESTS_FILE,
  seedFactory: () => normalizeDelegatedConsentRequestsState(readLegacyFoundationStateSnapshot()),
  normalize: normalizeDelegatedConsentRequestsState,
});

const foundationDelegatedConsentRequestsAsyncRepository: IamAsyncFoundationDelegatedConsentRequestsRepository = createPersistedAsyncIamStateRepository<
  Partial<IamFoundationDelegatedConsentRequestsState>,
  IamFoundationDelegatedConsentRequestsState
>({
  fileName: IAM_FOUNDATION_DELEGATED_CONSENT_REQUESTS_FILE,
  seedFactory: () => normalizeDelegatedConsentRequestsState(readLegacyFoundationStateSnapshot()),
  normalize: normalizeDelegatedConsentRequestsState,
});

function assertRealmExists(realmId: string): IamRealmRecord {
  const normalizedRealmId = normalizeIamIdentifier(realmId);
  const realm = state.realms.find((candidate) => candidate.id === normalizedRealmId);
  if (!realm) {
    throw new Error(`Unknown IAM realm: ${normalizedRealmId}`);
  }
  return realm;
}

function normalizeRealmAttributeKey(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error('Realm attribute key is required.');
  }
  if (normalized.length > 120) {
    throw new Error('Realm attribute key must be 120 characters or fewer.');
  }
  return normalized;
}

function normalizeRealmAttributeValue(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error('Realm attribute value is required.');
  }
  if (normalized.length > 4000) {
    throw new Error('Realm attribute value must be 4000 characters or fewer.');
  }
  return normalized;
}

function listRealmAttributeRecords(realm: IamRealmRecord): IamRealmAttributeRecord[] {
  return Object.entries(realm.attributes ?? {})
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => ({
      id: `${realm.id}:${key}`,
      realm_id: realm.id,
      key,
      value,
      updated_at: realm.updated_at,
      updated_by_user_id: realm.updated_by_user_id,
    }));
}

function assertTemplateExists(templateId: string): IamRealmTemplateRecord {
  const template = state.realm_templates.find((candidate) => candidate.id === templateId);
  if (!template) {
    throw new Error(`Unknown IAM realm template: ${templateId}`);
  }
  return template;
}

function assertRealmPosturePresetExists(presetId: string): IamRealmPosturePresetRecord {
  const preset = state.realm_posture_presets.find((candidate) => candidate.id === presetId);
  if (!preset) {
    throw new Error(`Unknown IAM realm posture preset: ${presetId}`);
  }
  return preset;
}

function validateRealmPosturePresetIds(presetIds: string[]): void {
  presetIds.forEach((presetId) => {
    assertRealmPosturePresetExists(presetId);
  });
}

function assertUserExists(userId: string): IamUserRecord {
  const normalizedUserId = normalizeIamIdentifier(userId);
  const user = state.users.find((candidate) => candidate.id === normalizedUserId);
  if (!user) {
    throw new Error(`Unknown IAM user: ${normalizedUserId}`);
  }
  return user;
}

function assertGroupExists(groupId: string): IamGroupRecord {
  const normalizedGroupId = normalizeIamIdentifier(groupId);
  const group = state.groups.find((candidate) => candidate.id === normalizedGroupId);
  if (!group) {
    throw new Error(`Unknown IAM group: ${normalizedGroupId}`);
  }
  return group;
}

function assertRoleExists(roleId: string): IamRoleRecord {
  const normalizedRoleId = normalizeIamIdentifier(roleId);
  const role = state.roles.find((candidate) => candidate.id === normalizedRoleId);
  if (!role) {
    throw new Error(`Unknown IAM role: ${normalizedRoleId}`);
  }
  return role;
}

function assertDelegatedAdminExists(id: string): IamDelegatedAdminRecord {
  const assignment = state.delegated_admins.find((candidate) => candidate.id === id);
  if (!assignment) {
    throw new Error(`Unknown delegated admin assignment: ${id}`);
  }
  return assignment;
}

function assertDelegatedRelationshipExists(relationshipId: string): IamDelegatedRelationshipRecord {
  const relationship = state.delegated_relationships.find((candidate) => candidate.id === relationshipId);
  if (!relationship) {
    throw new Error(`Unknown delegated relationship: ${relationshipId}`);
  }
  return relationship;
}

function assertDelegatedConsentExists(consentId: string): IamDelegatedConsentRecord {
  const consent = state.delegated_consents.find((candidate) => candidate.id === consentId);
  if (!consent) {
    throw new Error(`Unknown delegated consent: ${consentId}`);
  }
  return consent;
}

function assertDelegatedConsentRequestExists(requestId: string): IamDelegatedConsentRequestRecord {
  const request = state.delegated_consent_requests.find((candidate) => candidate.id === requestId);
  if (!request) {
    throw new Error(`Unknown delegated consent request: ${requestId}`);
  }
  return request;
}

function validateRoleIdsForRealm(realmId: string, roleIds: string[]): void {
  roleIds.forEach((roleId) => {
    const role = assertRoleExists(roleId);
    if (role.realm_id !== realmId) {
      throw new Error(`Role ${roleId} does not belong to realm ${realmId}`);
    }
  });
}

function validateGroupIdsForRealm(realmId: string, groupIds: string[]): void {
  groupIds.forEach((groupId) => {
    const group = assertGroupExists(groupId);
    if (group.realm_id !== realmId) {
      throw new Error(`Group ${groupId} does not belong to realm ${realmId}`);
    }
  });
}

function validateUserIdsForRealm(realmId: string, userIds: string[]): void {
  userIds.forEach((userId) => {
    const user = assertUserExists(userId);
    if (user.realm_id !== realmId) {
      throw new Error(`User ${userId} does not belong to realm ${realmId}`);
    }
  });
}

function createSeedState(): IamFoundationState {
  const createdAt = nowIso();

  const realmPosturePresets: IamRealmPosturePresetRecord[] = [
    {
      id: 'realm-posture-institutional-sso',
      name: 'Institutional SSO Posture',
      summary: 'Federated posture for institutional identity integration with governed attribute release and reusable SSO bindings.',
      kind: 'INSTITUTIONAL_SSO',
      status: 'ACTIVE',
      realm_template_id: 'realm-template-education-readiness',
      privacy_classification: 'CONFIDENTIAL',
      consent_required: true,
      delegated_relationships_enabled: false,
      portable_identity_enabled: true,
      supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
      synthetic: true,
    },
    {
      id: 'realm-posture-privacy-sensitive',
      name: 'Privacy-Sensitive Identity Posture',
      summary: 'Identity posture that classifies profile data, minimizes release, and enforces protected-record auditing.',
      kind: 'PRIVACY_SENSITIVE',
      status: 'ACTIVE',
      realm_template_id: 'realm-template-education-readiness',
      privacy_classification: 'PROTECTED',
      consent_required: true,
      delegated_relationships_enabled: true,
      portable_identity_enabled: true,
      supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
      synthetic: true,
    },
    {
      id: 'realm-posture-guardian-proxy',
      name: 'Guardian and Proxy Delegation Posture',
      summary: 'Delegation posture for guardian, parent, caregiver, sponsor, or proxy relationships with revocation and audit support.',
      kind: 'GUARDIAN_PROXY',
      status: 'ACTIVE',
      realm_template_id: 'realm-template-education-readiness',
      privacy_classification: 'PROTECTED',
      consent_required: true,
      delegated_relationships_enabled: true,
      portable_identity_enabled: false,
      supported_protocols: ['OIDC', 'OAUTH2'],
      synthetic: true,
    },
    {
      id: 'realm-posture-minor-serving',
      name: 'Minor-Serving Account Posture',
      summary: 'Posture for minor-serving identity flows with stricter privacy and consent handling.',
      kind: 'MINOR_SERVING',
      status: 'ACTIVE',
      realm_template_id: 'realm-template-education-readiness',
      privacy_classification: 'PROTECTED',
      consent_required: true,
      delegated_relationships_enabled: true,
      portable_identity_enabled: true,
      supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
      synthetic: true,
    },
    {
      id: 'realm-posture-portable-identity',
      name: 'Portable Identity Posture',
      summary: 'Portable external identity posture for cross-institution accounts and brokered identity linking.',
      kind: 'PORTABLE_IDENTITY',
      status: 'ACTIVE',
      realm_template_id: 'realm-template-education-readiness',
      privacy_classification: 'CONFIDENTIAL',
      consent_required: false,
      delegated_relationships_enabled: false,
      portable_identity_enabled: true,
      supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
      synthetic: true,
    },
  ];

  const identityPrivacyPolicies: IamIdentityPrivacyPolicyRecord[] = [
    {
      id: 'privacy-policy-public',
      realm_id: 'realm-education-validation',
      name: 'Public Identity Policy',
      summary: 'Identity attributes that can be released broadly without additional consent.',
      classification: 'PUBLIC',
      consent_required: false,
      data_minimization_enabled: true,
      protected_record_access: false,
      attribute_release_tags: ['directory', 'display'],
      synthetic: true,
    },
    {
      id: 'privacy-policy-internal',
      realm_id: 'realm-education-validation',
      name: 'Internal Identity Policy',
      summary: 'Institution-scoped attributes that remain inside the home organization by default.',
      classification: 'INTERNAL',
      consent_required: false,
      data_minimization_enabled: true,
      protected_record_access: false,
      attribute_release_tags: ['organization', 'membership'],
      synthetic: true,
    },
    {
      id: 'privacy-policy-confidential',
      realm_id: 'realm-education-validation',
      name: 'Confidential Identity Policy',
      summary: 'Identity attributes that require consent or role-aware justification before release.',
      classification: 'CONFIDENTIAL',
      consent_required: true,
      data_minimization_enabled: true,
      protected_record_access: true,
      attribute_release_tags: ['contact', 'relationship'],
      synthetic: true,
    },
    {
      id: 'privacy-policy-protected',
      realm_id: 'realm-education-validation',
      name: 'Protected Identity Policy',
      summary: 'Identity attributes that are subject to strict release control and audit.',
      classification: 'PROTECTED',
      consent_required: true,
      data_minimization_enabled: true,
      protected_record_access: true,
      attribute_release_tags: ['minor', 'delegate', 'protected-record'],
      synthetic: true,
    },
  ];

  const realmTemplates: IamRealmTemplateRecord[] = [
    {
      id: 'realm-template-foundation',
      name: 'Foundation Workforce Realm',
      summary: 'Default reusable realm template for workforce identity, delegated administration, and multi-client application access.',
      kind: 'FOUNDATION',
      status: 'ACTIVE',
      baseline_roles: ['realm-admin', 'group-admin', 'auditor', 'member', 'specialist', 'platform-supervisor'],
      baseline_clients: ['admin-console-demo', 'mobile-app-demo', 'machine-api-demo'],
      supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
      posture_preset_ids: ['realm-posture-institutional-sso', 'realm-posture-privacy-sensitive', 'realm-posture-portable-identity'],
      synthetic: true,
    },
    {
      id: 'realm-template-first-party-apps',
      name: 'First-Party Application Suite',
      summary: 'Realm template for first-party web and mobile applications using shared login, account, and admin surfaces.',
      kind: 'FIRST_PARTY',
      status: 'ACTIVE',
      baseline_roles: ['realm-admin', 'application-admin', 'operator', 'viewer'],
      baseline_clients: ['cms-admin-demo', 'training-portal-demo', 'developer-portal-demo', 'crew-web-demo', 'commercial-web-demo'],
      supported_protocols: ['OIDC', 'OAUTH2'],
      posture_preset_ids: ['realm-posture-privacy-sensitive'],
      synthetic: true,
    },
    {
      id: 'realm-template-rgp-workflow',
      name: 'Governed Workflow Suite',
      summary: 'Realm template for the Request Governance Platform with standalone browser login and service-to-service machine access.',
      kind: 'FIRST_PARTY',
      status: 'ACTIVE',
      baseline_roles: ['realm-admin', 'application-admin', 'operator', 'viewer'],
      baseline_clients: ['rgp-web-demo', 'rgp-api-demo', 'cms-rgp-service-demo'],
      supported_protocols: ['OIDC', 'OAUTH2'],
      posture_preset_ids: ['realm-posture-privacy-sensitive'],
      synthetic: true,
    },
    {
      id: 'realm-template-embedded-partner',
      name: 'Embedded Partner Realm',
      summary: 'Template for partner-embedded and B2B experiences requiring separate realm control and standards-based federation.',
      kind: 'EMBEDDED_PARTNER',
      status: 'ACTIVE',
      baseline_roles: ['realm-admin', 'partner-admin', 'embedded-user', 'embedded-auditor'],
      baseline_clients: ['partner-embedded-demo', 'machine-api-demo'],
      supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
      posture_preset_ids: ['realm-posture-institutional-sso', 'realm-posture-portable-identity'],
      synthetic: true,
    },
    {
      id: 'realm-template-tenant-override',
      name: 'Tenant Override Realm',
      summary: 'Template for tenant-specific override realms that clone the platform default authority model and specialize it through explicit bindings.',
      kind: 'TENANT_OVERRIDE',
      status: 'DRAFT',
      baseline_roles: ['realm-admin', 'tenant-admin', 'tenant-operator', 'tenant-viewer'],
      baseline_clients: ['admin-console-demo'],
      supported_protocols: ['OIDC', 'OAUTH2'],
      posture_preset_ids: ['realm-posture-privacy-sensitive'],
      synthetic: true,
    },
    {
      id: 'realm-template-education-readiness',
      name: 'Education Readiness Realm',
      summary: 'Domain-specific realm template for institutional identity, privacy-sensitive profile posture, delegated relationships, and portable identity.',
      kind: 'FOUNDATION',
      status: 'ACTIVE',
      baseline_roles: ['realm-admin', 'instructor', 'learner', 'guardian', 'proxy', 'auditor'],
      baseline_clients: ['education-admin-demo', 'education-portal-demo', 'machine-api-demo'],
      supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
      posture_preset_ids: [
        'realm-posture-institutional-sso',
        'realm-posture-privacy-sensitive',
        'realm-posture-guardian-proxy',
        'realm-posture-minor-serving',
        'realm-posture-portable-identity',
      ],
      synthetic: true,
    },
  ];

  const realms: IamRealmRecord[] = [
    {
      id: 'realm-idp-default',
      name: 'Platform Default Realm',
      summary: 'Primary default realm for standalone administration and downstream consumer bindings.',
      scope_kind: 'PLATFORM_DEFAULT',
      status: 'ACTIVE',
      synthetic: true,
      intended_consumers: ['Admin Console Demo', 'Machine API Demo'],
      supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
      template_id: 'realm-template-foundation',
      source_realm_id: null,
      owner_tenant_id: null,
      tenant_realm_role: null,
      exception_reason: null,
      exception_purpose: null,
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'realm-flightos-default',
      name: 'FlightOS Default Realm',
      summary: 'Shared identity realm backing the FlightOS application binding and public account bootstrap handoff.',
      scope_kind: 'STANDALONE_VALIDATION',
      status: 'READY_FOR_FOUNDATION_PHASE',
      synthetic: true,
      intended_consumers: ['FlightOS Application', 'FlightOS Admin Console'],
      supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
      template_id: 'realm-template-first-party-apps',
      source_realm_id: null,
      owner_tenant_id: null,
      tenant_realm_role: null,
      exception_reason: null,
      exception_purpose: null,
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'realm-training-validation',
      name: 'Training Portal Validation Realm',
      summary: 'Synthetic validation realm proving learner, instructor, and admin boundaries for the standalone IAM subsystem.',
      scope_kind: 'STANDALONE_VALIDATION',
      status: 'READY_FOR_FOUNDATION_PHASE',
      synthetic: true,
      intended_consumers: ['Training Portal Demo', 'OIDC Test Client'],
      supported_protocols: ['OIDC', 'OAUTH2'],
      template_id: 'realm-template-first-party-apps',
      source_realm_id: null,
      owner_tenant_id: null,
      tenant_realm_role: null,
      exception_reason: null,
      exception_purpose: null,
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'realm-developer-validation',
      name: 'Developer Portal Validation Realm',
      summary: 'Synthetic validation realm proving client registration, scopes, service accounts, and developer-facing access patterns.',
      scope_kind: 'STANDALONE_VALIDATION',
      status: 'READY_FOR_FOUNDATION_PHASE',
      synthetic: true,
      intended_consumers: ['Developer Portal Demo', 'Machine API Demo'],
      supported_protocols: ['OIDC', 'OAUTH2'],
      template_id: 'realm-template-first-party-apps',
      source_realm_id: null,
      owner_tenant_id: null,
      tenant_realm_role: null,
      exception_reason: null,
      exception_purpose: null,
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'realm-crew-validation',
      name: 'Crew Validation Realm',
      summary: 'Synthetic validation realm proving Crew can run on its own tenant-scoped branded login and consumer contracts.',
      scope_kind: 'STANDALONE_VALIDATION',
      status: 'READY_FOR_FOUNDATION_PHASE',
      synthetic: true,
      intended_consumers: ['Crew Application'],
      supported_protocols: ['OIDC', 'OAUTH2'],
      template_id: 'realm-template-first-party-apps',
      source_realm_id: null,
      owner_tenant_id: null,
      tenant_realm_role: null,
      exception_reason: null,
      exception_purpose: null,
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'realm-cms-validation',
      name: 'SaaS CMS Validation Realm',
      summary: 'Synthetic validation realm proving the standalone SaaS CMS runs on its own tenant-scoped identity configuration.',
      scope_kind: 'STANDALONE_VALIDATION',
      status: 'READY_FOR_FOUNDATION_PHASE',
      synthetic: true,
      intended_consumers: ['SaaS CMS Admin'],
      supported_protocols: ['OIDC', 'OAUTH2'],
      template_id: 'realm-template-first-party-apps',
      source_realm_id: null,
      owner_tenant_id: null,
      tenant_realm_role: null,
      exception_reason: null,
      exception_purpose: null,
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'realm-commercial-validation',
      name: 'Commercial Validation Realm',
      summary: 'Synthetic validation realm proving the standalone Commercial service can run on its own tenant-scoped branded login and bindings.',
      scope_kind: 'STANDALONE_VALIDATION',
      status: 'READY_FOR_FOUNDATION_PHASE',
      synthetic: true,
      intended_consumers: ['Commercial Platform'],
      supported_protocols: ['OIDC', 'OAUTH2'],
      template_id: 'realm-template-first-party-apps',
      source_realm_id: null,
      owner_tenant_id: null,
      tenant_realm_role: null,
      exception_reason: null,
      exception_purpose: null,
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'realm-rgp-validation',
      name: 'RGP Validation Realm',
      summary: 'Synthetic validation realm proving the Request Governance Platform can run on its own tenant-scoped login while supporting shared-IDP machine authorization.',
      scope_kind: 'STANDALONE_VALIDATION',
      status: 'READY_FOR_FOUNDATION_PHASE',
      synthetic: true,
      intended_consumers: ['RGP Workflow Platform'],
      supported_protocols: ['OIDC', 'OAUTH2'],
      template_id: 'realm-template-rgp-workflow',
      source_realm_id: null,
      owner_tenant_id: null,
      tenant_realm_role: null,
      exception_reason: null,
      exception_purpose: null,
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'realm-partner-embedded-validation',
      name: 'Partner Embedded Validation Realm',
      summary: 'Synthetic validation realm proving external embedded applications, brokered identity, and partner-isolated client boundaries.',
      scope_kind: 'STANDALONE_VALIDATION',
      status: 'READY_FOR_FOUNDATION_PHASE',
      synthetic: true,
      intended_consumers: ['Partner Embedded Demo', 'SAML Test Service Provider'],
      supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
      template_id: 'realm-template-embedded-partner',
      source_realm_id: null,
      owner_tenant_id: null,
      tenant_realm_role: null,
      exception_reason: null,
      exception_purpose: null,
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'realm-education-validation',
      name: 'Education Identity Validation Realm',
      summary: 'Synthetic validation realm proving privacy-sensitive identity posture, delegated relationships, and portable external identity behavior.',
      scope_kind: 'STANDALONE_VALIDATION',
      status: 'READY_FOR_FOUNDATION_PHASE',
      synthetic: true,
      intended_consumers: ['Education Admin Demo', 'Education Portal Demo'],
      supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
      template_id: 'realm-template-education-readiness',
      posture_preset_ids: [
        'realm-posture-institutional-sso',
        'realm-posture-privacy-sensitive',
        'realm-posture-guardian-proxy',
        'realm-posture-minor-serving',
        'realm-posture-portable-identity',
      ],
      source_realm_id: null,
      owner_tenant_id: null,
      tenant_realm_role: null,
      exception_reason: null,
      exception_purpose: null,
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
  ];

  const roles: IamRoleRecord[] = [
    {
      id: 'role-default-realm-admin',
      realm_id: 'realm-idp-default',
      name: 'realm-admin',
      summary: 'Full administration for the platform default realm.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-default-group-admin',
      realm_id: 'realm-idp-default',
      name: 'group-admin',
      summary: 'Administers groups and memberships in the platform default realm.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-default-auditor',
      realm_id: 'realm-idp-default',
      name: 'auditor',
      summary: 'Read-only audit posture across the platform default realm.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-default-member',
      realm_id: 'realm-idp-default',
      name: 'member',
      summary: 'General membership role in the platform default realm.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-default-specialist',
      realm_id: 'realm-idp-default',
      name: 'specialist',
      summary: 'Operational specialist role in the platform default realm.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-default-cms-admin',
      realm_id: 'realm-idp-default',
      name: 'cms-admin',
      summary: 'Client-scoped administrator for the CMS administration client.',
      kind: 'CLIENT_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: 'cms-admin-demo',
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-default-service-platform-admin',
      realm_id: 'realm-idp-default',
      name: 'service-account-platform-admin',
      summary: 'Platform-wide machine principal with full administrative authority for downstream API integrations.',
      kind: 'CLIENT_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: 'machine-api-demo',
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-default-service-admin',
      realm_id: 'realm-idp-default',
      name: 'service-account-admin',
      summary: 'Tenant-scoped machine principal with administrative permissions for downstream APIs.',
      kind: 'CLIENT_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: 'machine-api-demo',
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-default-service-operator',
      realm_id: 'realm-idp-default',
      name: 'service-account-operator',
      summary: 'Tenant-scoped machine principal with operational permissions for downstream APIs.',
      kind: 'CLIENT_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: 'machine-api-demo',
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-default-service-viewer',
      realm_id: 'realm-idp-default',
      name: 'service-account-viewer',
      summary: 'Tenant-scoped machine principal with read-only permissions for downstream APIs.',
      kind: 'CLIENT_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: 'machine-api-demo',
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-default-platform-supervisor',
      realm_id: 'realm-idp-default',
      name: 'platform-supervisor',
      summary: 'Composite role combining realm administration and audit visibility.',
      kind: 'COMPOSITE_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: ['role-default-realm-admin', 'role-default-auditor'],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-training-realm-admin',
      realm_id: 'realm-training-validation',
      name: 'realm-admin',
      summary: 'Realm administration for the training validation realm.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-training-instructor',
      realm_id: 'realm-training-validation',
      name: 'instructor',
      summary: 'Instructor role for training validation flows.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-training-learner',
      realm_id: 'realm-training-validation',
      name: 'learner',
      summary: 'Learner role for training validation flows.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-developer-realm-admin',
      realm_id: 'realm-developer-validation',
      name: 'realm-admin',
      summary: 'Realm administration for the developer validation realm.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-developer-service-operator',
      realm_id: 'realm-developer-validation',
      name: 'service-account-operator',
      summary: 'Client and service account operator role for developer runtime validation.',
      kind: 'CLIENT_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: 'machine-api-demo',
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-crew-realm-admin',
      realm_id: 'realm-crew-validation',
      name: 'realm-admin',
      summary: 'Realm administration for the Crew validation realm.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-crew-operator',
      realm_id: 'realm-crew-validation',
      name: 'tenant-operator',
      summary: 'Operational user role for Crew tenant administration and staff workflows.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-cms-realm-admin',
      realm_id: 'realm-cms-validation',
      name: 'realm-admin',
      summary: 'Realm administration for the CMS validation realm.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-cms-editor',
      realm_id: 'realm-cms-validation',
      name: 'content-editor',
      summary: 'Content editor role for CMS validation flows.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },

    {
      id: 'role-flightos-realm-admin',
      realm_id: 'realm-flightos-default',
      name: 'realm-admin',
      summary: 'Realm administration for the FlightOS validation realm.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-flightos-group-admin',
      realm_id: 'realm-flightos-default',
      name: 'group-admin',
      summary: 'Group administration role for the FlightOS validation realm.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-flightos-auditor',
      realm_id: 'realm-flightos-default',
      name: 'auditor',
      summary: 'Audit visibility role for the FlightOS validation realm.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-flightos-member',
      realm_id: 'realm-flightos-default',
      name: 'member',
      summary: 'Baseline member role for the FlightOS validation realm.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-flightos-specialist',
      realm_id: 'realm-flightos-default',
      name: 'specialist',
      summary: 'Specialist role for the FlightOS validation realm.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-flightos-platform-supervisor',
      realm_id: 'realm-flightos-default',
      name: 'platform-supervisor',
      summary: 'Composite platform administrator role for the FlightOS validation realm.',
      kind: 'COMPOSITE_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: ['role-flightos-realm-admin', 'role-flightos-auditor'],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-flightos-tenant-admin',
      realm_id: 'realm-flightos-default',
      name: 'tenant-admin',
      summary: 'Tenant administration role for FlightOS shared identity validation.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-flightos-tenant-operator',
      realm_id: 'realm-flightos-default',
      name: 'tenant-operator',
      summary: 'Operational role for FlightOS shared identity validation.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-flightos-tenant-viewer',
      realm_id: 'realm-flightos-default',
      name: 'tenant-viewer',
      summary: 'Read-only role for FlightOS shared identity validation.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-commercial-realm-admin',
      realm_id: 'realm-commercial-validation',
      name: 'realm-admin',
      summary: 'Realm administration for the Commercial validation realm.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-commercial-operator',
      realm_id: 'realm-commercial-validation',
      name: 'catalog-operator',
      summary: 'Catalog and billing operator role for Commercial validation flows.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-rgp-realm-admin',
      realm_id: 'realm-rgp-validation',
      name: 'realm-admin',
      summary: 'Realm administration for the RGP validation realm.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-rgp-operator',
      realm_id: 'realm-rgp-validation',
      name: 'workflow-operator',
      summary: 'Operational workflow role for RGP validation flows.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-rgp-service-admin',
      realm_id: 'realm-rgp-validation',
      name: 'workflow-service-admin',
      summary: 'Machine principal with administrative workflow authority for RGP downstream integrations.',
      kind: 'CLIENT_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: 'rgp-api-demo',
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-rgp-service-writer',
      realm_id: 'realm-rgp-validation',
      name: 'workflow-service-writer',
      summary: 'Machine principal with write-oriented workflow authority for RGP downstream integrations.',
      kind: 'CLIENT_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: 'rgp-api-demo',
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-rgp-service-reader',
      realm_id: 'realm-rgp-validation',
      name: 'workflow-service-reader',
      summary: 'Machine principal with read-only workflow authority for RGP downstream integrations.',
      kind: 'CLIENT_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: 'rgp-api-demo',
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-partner-realm-admin',
      realm_id: 'realm-partner-embedded-validation',
      name: 'realm-admin',
      summary: 'Realm administration for the partner-embedded validation realm.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-partner-embedded-user',
      realm_id: 'realm-partner-embedded-validation',
      name: 'embedded-user',
      summary: 'Standard embedded-user role for partner validation.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-education-realm-admin',
      realm_id: 'realm-education-validation',
      name: 'realm-admin',
      summary: 'Realm administration for the education validation realm.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-education-instructor',
      realm_id: 'realm-education-validation',
      name: 'instructor',
      summary: 'Instructor role for education validation flows.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-education-learner',
      realm_id: 'realm-education-validation',
      name: 'learner',
      summary: 'Learner role for education validation flows.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-education-guardian',
      realm_id: 'realm-education-validation',
      name: 'guardian',
      summary: 'Guardian and proxy access role for education validation flows.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'role-education-auditor',
      realm_id: 'realm-education-validation',
      name: 'auditor',
      summary: 'Read-only audit role for education validation flows.',
      kind: 'REALM_ROLE',
      status: 'ACTIVE',
      synthetic: true,
      client_id: null,
      composite_role_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
  ];

  const groups: IamGroupRecord[] = [
    {
      id: 'group-platform-admins',
      realm_id: 'realm-idp-default',
      name: 'platform-admins',
      summary: 'Global administrators for the platform default realm.',
      status: 'ACTIVE',
      synthetic: true,
      parent_group_id: null,
      role_ids: ['role-default-platform-supervisor', 'role-default-cms-admin'],
      member_user_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'group-flightos-platform-admins',
      realm_id: 'realm-flightos-default',
      name: 'platform-admins',
      summary: 'Global administrators for the FlightOS shared identity validation realm.',
      status: 'ACTIVE',
      synthetic: true,
      parent_group_id: null,
      role_ids: ['role-flightos-platform-supervisor'],
      member_user_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'group-training-instructors',
      realm_id: 'realm-training-validation',
      name: 'training-instructors',
      summary: 'Instructors used for standalone IAM validation against the training portal.',
      status: 'ACTIVE',
      synthetic: true,
      parent_group_id: null,
      role_ids: ['role-training-instructor'],
      member_user_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'group-training-learners',
      realm_id: 'realm-training-validation',
      name: 'training-learners',
      summary: 'Learners used for standalone IAM validation against the training portal.',
      status: 'ACTIVE',
      synthetic: true,
      parent_group_id: null,
      role_ids: ['role-training-learner'],
      member_user_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
  ];

  const users: IamUserRecord[] = [
    {
      id: 'iam-user-platform-admin',
      realm_id: 'realm-idp-default',
      username: 'platform.admin',
      email: 'platform.admin@iam.local',
      first_name: 'Platform',
      last_name: 'Admin',
      status: 'ACTIVE',
      synthetic: true,
      required_actions: ['VERIFY_EMAIL'],
      role_ids: ['role-default-platform-supervisor'],
      group_ids: ['group-platform-admins'],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'iam-user-idp-super-admin',
      realm_id: 'realm-idp-default',
      username: 'standalone.super.admin',
      email: 'admin@idp.local',
      first_name: 'Standalone',
      last_name: 'Administrator',
      status: 'ACTIVE',
      synthetic: true,
      required_actions: [],
      role_ids: ['role-default-platform-supervisor'],
      group_ids: ['group-platform-admins'],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'iam-user-tenant-admin',
      realm_id: 'realm-idp-default',
      username: 'alex.morgan',
      email: 'alex.morgan@northstar.example',
      first_name: 'Alex',
      last_name: 'Morgan',
      status: 'ACTIVE',
      synthetic: true,
      required_actions: [],
      role_ids: ['role-default-platform-supervisor'],
      group_ids: ['group-platform-admins'],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'iam-user-service-operator',
      realm_id: 'realm-idp-default',
      username: 'jordan.lee',
      email: 'jordan.lee@civic.example',
      first_name: 'Jordan',
      last_name: 'Lee',
      status: 'ACTIVE',
      synthetic: true,
      required_actions: [],
      role_ids: [],
      group_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'iam-user-research-lead',
      realm_id: 'realm-idp-default',
      username: 'samir.patel',
      email: 'samir.patel@innovation.example',
      first_name: 'Samir',
      last_name: 'Patel',
      status: 'ACTIVE',
      synthetic: true,
      required_actions: [],
      role_ids: [],
      group_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'iam-user-flightos-admin',
      realm_id: 'realm-flightos-default',
      username: 'flightos.admin',
      email: 'admin@flightos.local',
      first_name: 'FlightOS',
      last_name: 'Admin',
      status: 'ACTIVE',
      synthetic: true,
      required_actions: [],
      role_ids: ['role-flightos-platform-supervisor'],
      group_ids: ['group-flightos-platform-admins'],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'iam-user-flightos-city-ops',
      realm_id: 'realm-flightos-default',
      username: 'miguel.alvarez',
      email: 'miguel.alvarez@cityops.gov',
      first_name: 'Miguel',
      last_name: 'Alvarez',
      status: 'ACTIVE',
      synthetic: true,
      required_actions: [],
      role_ids: ['role-flightos-tenant-operator'],
      group_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'iam-user-flightos-demo-corp',
      realm_id: 'realm-flightos-default',
      username: 'sarah.chen',
      email: 'sarah.chen@democorp.com',
      first_name: 'Sarah',
      last_name: 'Chen',
      status: 'ACTIVE',
      synthetic: true,
      required_actions: [],
      role_ids: ['role-flightos-platform-supervisor'],
      group_ids: ['group-flightos-platform-admins'],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'iam-user-training-instructor',
      realm_id: 'realm-training-validation',
      username: 'training.instructor',
      email: 'training.instructor@iam.local',
      first_name: 'Taylor',
      last_name: 'Instructor',
      status: 'ACTIVE',
      synthetic: true,
      required_actions: [],
      role_ids: ['role-training-instructor'],
      group_ids: ['group-training-instructors'],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'iam-user-training-learner',
      realm_id: 'realm-training-validation',
      username: 'training.learner',
      email: 'training.learner@iam.local',
      first_name: 'Jordan',
      last_name: 'Learner',
      status: 'ACTIVE',
      synthetic: true,
      required_actions: ['UPDATE_PROFILE'],
      role_ids: ['role-training-learner'],
      group_ids: ['group-training-learners'],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'iam-user-developer-admin',
      realm_id: 'realm-developer-validation',
      username: 'developer.admin',
      email: 'developer.admin@iam.local',
      first_name: 'Devon',
      last_name: 'Administrator',
      status: 'ACTIVE',
      synthetic: true,
      required_actions: [],
      role_ids: ['role-developer-realm-admin'],
      group_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'iam-user-developer-operator',
      realm_id: 'realm-developer-validation',
      username: 'developer.operator',
      email: 'developer.operator@iam.local',
      first_name: 'Avery',
      last_name: 'Operator',
      status: 'ACTIVE',
      synthetic: true,
      required_actions: [],
      role_ids: ['role-developer-service-operator'],
      group_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'iam-user-crew-admin',
      realm_id: 'realm-crew-validation',
      username: 'crew.admin',
      email: 'crew.admin@iam.local',
      first_name: 'Crew',
      last_name: 'Administrator',
      status: 'ACTIVE',
      synthetic: true,
      required_actions: [],
      role_ids: ['role-crew-realm-admin'],
      group_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'iam-user-crew-operator',
      realm_id: 'realm-crew-validation',
      username: 'crew.operator',
      email: 'crew.operator@iam.local',
      first_name: 'Crew',
      last_name: 'Operator',
      status: 'ACTIVE',
      synthetic: true,
      required_actions: ['UPDATE_PROFILE'],
      role_ids: ['role-crew-operator'],
      group_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'iam-user-cms-admin',
      realm_id: 'realm-cms-validation',
      username: 'cms.admin',
      email: 'cms.admin@iam.local',
      first_name: 'Casey',
      last_name: 'Administrator',
      status: 'ACTIVE',
      synthetic: true,
      required_actions: [],
      role_ids: ['role-cms-realm-admin'],
      group_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'iam-user-cms-editor',
      realm_id: 'realm-cms-validation',
      username: 'cms.editor',
      email: 'cms.editor@iam.local',
      first_name: 'Morgan',
      last_name: 'Editor',
      status: 'ACTIVE',
      synthetic: true,
      required_actions: ['UPDATE_PROFILE'],
      role_ids: ['role-cms-editor'],
      group_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'iam-user-commercial-admin',
      realm_id: 'realm-commercial-validation',
      username: 'commercial.admin',
      email: 'commercial.admin@iam.local',
      first_name: 'Commercial',
      last_name: 'Administrator',
      status: 'ACTIVE',
      synthetic: true,
      required_actions: [],
      role_ids: ['role-commercial-realm-admin'],
      group_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'iam-user-commercial-operator',
      realm_id: 'realm-commercial-validation',
      username: 'commercial.operator',
      email: 'commercial.operator@iam.local',
      first_name: 'Commercial',
      last_name: 'Operator',
      status: 'ACTIVE',
      synthetic: true,
      required_actions: ['UPDATE_PROFILE'],
      role_ids: ['role-commercial-operator'],
      group_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'iam-user-rgp-admin',
      realm_id: 'realm-rgp-validation',
      username: 'rgp.admin',
      email: 'rgp.admin@iam.local',
      first_name: 'Riley',
      last_name: 'Governance',
      status: 'ACTIVE',
      synthetic: true,
      required_actions: [],
      role_ids: ['role-rgp-realm-admin'],
      group_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'iam-user-rgp-operator',
      realm_id: 'realm-rgp-validation',
      username: 'rgp.operator',
      email: 'rgp.operator@iam.local',
      first_name: 'Riley',
      last_name: 'Operator',
      status: 'ACTIVE',
      synthetic: true,
      required_actions: ['UPDATE_PROFILE'],
      role_ids: ['role-rgp-operator'],
      group_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'iam-user-partner-admin',
      realm_id: 'realm-partner-embedded-validation',
      username: 'partner.admin',
      email: 'partner.admin@iam.local',
      first_name: 'Riley',
      last_name: 'Administrator',
      status: 'ACTIVE',
      synthetic: true,
      required_actions: [],
      role_ids: ['role-partner-realm-admin'],
      group_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'iam-user-partner-embedded',
      realm_id: 'realm-partner-embedded-validation',
      username: 'partner.embedded',
      email: 'partner.embedded@iam.local',
      first_name: 'Jordan',
      last_name: 'Embedded',
      status: 'ACTIVE',
      synthetic: true,
      required_actions: [],
      role_ids: ['role-partner-embedded-user'],
      group_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'iam-user-education-admin',
      realm_id: 'realm-education-validation',
      username: 'education.admin',
      email: 'education.admin@iam.local',
      first_name: 'Evelyn',
      last_name: 'Administrator',
      status: 'ACTIVE',
      synthetic: true,
      privacy_classification: 'CONFIDENTIAL',
      home_organization_name: 'North County School District',
      external_subject_id: 'education-admin-001',
      required_actions: [],
      role_ids: ['role-education-realm-admin'],
      group_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'iam-user-education-instructor',
      realm_id: 'realm-education-validation',
      username: 'education.instructor',
      email: 'education.instructor@iam.local',
      first_name: 'Jordan',
      last_name: 'Instructor',
      status: 'ACTIVE',
      synthetic: true,
      privacy_classification: 'CONFIDENTIAL',
      home_organization_name: 'North County School District',
      external_subject_id: 'education-instructor-001',
      required_actions: [],
      role_ids: ['role-education-instructor'],
      group_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'iam-user-education-learner',
      realm_id: 'realm-education-validation',
      username: 'education.learner',
      email: 'education.learner@iam.local',
      first_name: 'Taylor',
      last_name: 'Learner',
      status: 'ACTIVE',
      synthetic: true,
      privacy_classification: 'PROTECTED',
      home_organization_name: 'North County School District',
      external_subject_id: 'education-learner-001',
      required_actions: ['UPDATE_PROFILE'],
      role_ids: ['role-education-learner'],
      group_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'iam-user-education-guardian',
      realm_id: 'realm-education-validation',
      username: 'education.guardian',
      email: 'education.guardian@iam.local',
      first_name: 'Morgan',
      last_name: 'Guardian',
      status: 'ACTIVE',
      synthetic: true,
      privacy_classification: 'INTERNAL',
      home_organization_name: 'North County School District',
      external_subject_id: 'education-guardian-001',
      required_actions: [],
      role_ids: ['role-education-guardian'],
      group_ids: [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
  ];

  groups.forEach((group) => {
    group.member_user_ids.forEach((userId) => {
      const user = users.find((candidate) => candidate.id === userId);
      if (user && !user.group_ids.includes(group.id)) {
        user.group_ids.push(group.id);
      }
    });
  });

  const delegatedAdmins: IamDelegatedAdminRecord[] = [
    {
      id: 'delegated-training-instructors',
      realm_id: 'realm-training-validation',
      principal_kind: 'GROUP',
      principal_id: 'group-training-instructors',
      principal_label: 'Training Instructors',
      status: 'ACTIVE',
      managed_role_ids: ['role-training-learner'],
      managed_group_ids: ['group-training-learners'],
      managed_client_ids: ['training-portal-demo'],
      notes: ['Standalone proof that delegated realm administration can be narrower than full realm-admin authority.'],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: 'idp-super-admin',
      updated_by_user_id: 'idp-super-admin',
    },
  ];

  const delegatedRelationships: IamDelegatedRelationshipRecord[] = [
    {
      id: 'relationship-education-guardian',
      realm_id: 'realm-education-validation',
      relationship_kind: 'GUARDIAN',
      status: 'ACTIVE',
      principal_user_id: 'iam-user-education-learner',
      delegate_user_id: 'iam-user-education-guardian',
      start_at: createdAt,
      end_at: null,
      allowed_scopes: ['account.read', 'profile.read', 'profile.manage'],
      allowed_purposes: ['education_support'],
      consent_required: true,
      consented_scope_names: [],
      consented_purpose_names: [],
      notes: ['Synthetic guardian relationship for education-domain delegation and revocation validation.'],
      synthetic: true,
    },
    {
      id: 'relationship-education-proxy',
      realm_id: 'realm-education-validation',
      relationship_kind: 'AUTHORIZED_PROXY',
      status: 'ACTIVE',
      principal_user_id: 'iam-user-education-instructor',
      delegate_user_id: 'iam-user-education-admin',
      start_at: createdAt,
      end_at: null,
      allowed_scopes: ['admin.read'],
      allowed_purposes: ['administration'],
      consent_required: false,
      consented_scope_names: [],
      consented_purpose_names: [],
      notes: ['Synthetic authorized-proxy relationship for education domain administration.'],
      synthetic: true,
    },
  ];

  const delegatedConsents: IamDelegatedConsentRecord[] = [
    {
      id: 'delegated-consent-education-guardian-profile-read',
      realm_id: 'realm-education-validation',
      relationship_id: 'relationship-education-guardian',
      principal_user_id: 'iam-user-education-learner',
      delegate_user_id: 'iam-user-education-guardian',
      status: 'ACTIVE',
      scope_names: ['profile.read'],
      purpose_names: ['education_support'],
      granted_at: createdAt,
      expires_at: null,
      revoked_at: null,
      granted_by_user_id: 'iam-user-education-learner',
      revoked_by_user_id: null,
      notes: ['Synthetic delegated consent for guardian profile-read access in the education validation realm.'],
      synthetic: true,
    },
  ];

  const delegatedConsentRequests: IamDelegatedConsentRequestRecord[] = [];

  const portableIdentities: IamPortableIdentityRecord[] = [
    {
      id: 'portable-identity-education-learner',
      realm_id: 'realm-education-validation',
      user_id: 'iam-user-education-learner',
      external_subject_id: 'north-county-student-001',
      issuer: 'https://identity.north-county-edu.example',
      home_organization_name: 'North County School District',
      portable_identifier: 'edu:NorthCounty:student:001',
      relationship_id: 'relationship-education-guardian',
      status: 'ACTIVE',
      attribute_release_policy_ids: ['privacy-policy-protected'],
      synthetic: true,
    },
    {
      id: 'portable-identity-education-guardian',
      realm_id: 'realm-education-validation',
      user_id: 'iam-user-education-guardian',
      external_subject_id: 'north-county-parent-014',
      issuer: 'https://identity.north-county-edu.example',
      home_organization_name: 'North County School District',
      portable_identifier: 'edu:NorthCounty:guardian:014',
      relationship_id: 'relationship-education-guardian',
      status: 'ACTIVE',
      attribute_release_policy_ids: ['privacy-policy-internal'],
      synthetic: true,
    },
  ];

  const realmById = new Map(realms.map((realm) => [realm.id, realm]));
  const realmBindings: IamRealmBindingRecord[] = [
    {
      id: 'binding-application-idp-admin-console',
      binding_target_kind: 'APPLICATION',
      binding_target_id: 'admin-console-demo',
      binding_target_name: 'Admin Console Demo',
      binding_target_tenant_id: null,
      binding_mode: 'DIRECT',
      realm_id: 'realm-idp-default',
      realm_name: realmById.get('realm-idp-default')!.name,
      source_realm_id: null,
      override_reason: null,
      override_purpose: null,
      override_approved_by_user_id: null,
      override_approved_at: null,
      notes: ['Standalone proving binding for the primary admin experience.'],
      consumer_contract: null,
      auth_binding: {
        client_id: 'admin-console-demo',
        preferred_authentication_mode: 'browser_authorization_code_pkce',
        supported_authentication_modes: ['browser_authorization_code_pkce', 'browser_direct_login'],
        summary: 'Primary public browser sign-in posture for the standalone admin console.',
      },
      projection_policy: null,
      created_at: createdAt,
      updated_at: createdAt,
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'binding-application-idp-cms',
      binding_target_kind: 'APPLICATION',
      binding_target_id: 'cms-admin-demo',
      binding_target_name: 'SaaS CMS Admin',
      binding_target_tenant_id: null,
      binding_mode: 'DIRECT',
      realm_id: 'realm-cms-validation',
      realm_name: realmById.get('realm-cms-validation')!.name,
      source_realm_id: null,
      override_reason: null,
      override_purpose: null,
      override_approved_by_user_id: null,
      override_approved_at: null,
      notes: ['Proves that downstream subsystems can consume the IAM plane through standards-based contracts.'],
      consumer_contract: null,
      auth_binding: {
        client_id: 'cms-admin-demo',
        preferred_authentication_mode: 'browser_authorization_code_pkce',
        supported_authentication_modes: ['browser_authorization_code_pkce', 'browser_direct_login'],
        summary: 'Public PKCE browser sign-in posture for the CMS admin consumer.',
      },
      projection_policy: null,
      created_at: createdAt,
      updated_at: createdAt,
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'binding-application-training-demo',
      binding_target_kind: 'APPLICATION',
      binding_target_id: 'training-portal-demo',
      binding_target_name: 'Training Portal Demo',
      binding_target_tenant_id: null,
      binding_mode: 'DIRECT',
      realm_id: 'realm-training-validation',
      realm_name: realmById.get('realm-training-validation')!.name,
      source_realm_id: null,
      override_reason: null,
      override_purpose: null,
      override_approved_by_user_id: null,
      override_approved_at: null,
      notes: ['Synthetic validation binding for learner, instructor, and administrator boundaries.'],
      consumer_contract: null,
      auth_binding: {
        client_id: 'training-portal-demo',
        preferred_authentication_mode: 'browser_authorization_code_pkce',
        supported_authentication_modes: ['browser_authorization_code_pkce', 'browser_direct_login'],
        summary: 'Public learner-facing browser sign-in posture for training validation.',
      },
      projection_policy: null,
      created_at: createdAt,
      updated_at: createdAt,
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'binding-application-developer-demo',
      binding_target_kind: 'APPLICATION',
      binding_target_id: 'developer-portal-demo',
      binding_target_name: 'Developer Portal Demo',
      binding_target_tenant_id: null,
      binding_mode: 'DIRECT',
      realm_id: 'realm-developer-validation',
      realm_name: realmById.get('realm-developer-validation')!.name,
      source_realm_id: null,
      override_reason: null,
      override_purpose: null,
      override_approved_by_user_id: null,
      override_approved_at: null,
      notes: ['Synthetic validation binding for client scopes, service accounts, and machine access.'],
      consumer_contract: null,
      auth_binding: {
        client_id: 'developer-portal-demo',
        preferred_authentication_mode: 'browser_authorization_code',
        supported_authentication_modes: ['browser_authorization_code'],
        summary: 'Confidential browser sign-in posture for the developer portal consumer.',
      },
      projection_policy: null,
      created_at: createdAt,
      updated_at: createdAt,
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'binding-application-partner-demo',
      binding_target_kind: 'APPLICATION',
      binding_target_id: 'partner-embedded-demo',
      binding_target_name: 'Partner Embedded Demo',
      binding_target_tenant_id: null,
      binding_mode: 'DIRECT',
      realm_id: 'realm-partner-embedded-validation',
      realm_name: realmById.get('realm-partner-embedded-validation')!.name,
      source_realm_id: null,
      override_reason: null,
      override_purpose: null,
      override_approved_by_user_id: null,
      override_approved_at: null,
      notes: ['Synthetic validation binding for partner-embedded OIDC and SAML scenarios.'],
      consumer_contract: null,
      auth_binding: null,
      projection_policy: null,
      created_at: createdAt,
      updated_at: createdAt,
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'binding-application-commercial-web',
      binding_target_kind: 'APPLICATION',
      binding_target_id: 'commercial-web',
      binding_target_name: 'Commercial Platform',
      binding_target_tenant_id: null,
      binding_mode: 'DIRECT',
      realm_id: 'realm-commercial-validation',
      realm_name: realmById.get('realm-commercial-validation')!.name,
      source_realm_id: null,
      override_reason: null,
      override_purpose: null,
      override_approved_by_user_id: null,
      override_approved_at: null,
      notes: ['Synthetic validation binding for the standalone Commercial platform.'],
      consumer_contract: null,
      auth_binding: {
        client_id: 'commercial-web-demo',
        preferred_authentication_mode: 'browser_authorization_code_pkce',
        supported_authentication_modes: ['browser_authorization_code_pkce', 'browser_direct_login'],
        summary: 'Public browser sign-in posture for the standalone Commercial platform.',
      },
      projection_policy: null,
      created_at: createdAt,
      updated_at: createdAt,
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'binding-application-rgp-web',
      binding_target_kind: 'APPLICATION',
      binding_target_id: 'rgp-web',
      binding_target_name: 'RGP Workflow Platform',
      binding_target_tenant_id: null,
      binding_mode: 'DIRECT',
      realm_id: 'realm-rgp-validation',
      realm_name: realmById.get('realm-rgp-validation')!.name,
      source_realm_id: null,
      override_reason: null,
      override_purpose: null,
      override_approved_by_user_id: null,
      override_approved_at: null,
      notes: [
        'Synthetic validation binding for the Request Governance Platform.',
        'RGP is expected to support standalone browser login and shared-IDP service-to-service authorization.',
      ],
      consumer_contract: {
        application_id: 'rgp',
        application_name: 'RGP',
        contract_version: '2026-04-07',
        informative_authorization_plane: 'INFORMATIVE',
        enforcement_plane: 'ENFORCEMENT',
        enforcement_owner: 'rgp',
        principal_context_source: 'IDP',
        tenant_context_source: 'IDP',
        identity_access_facts_source: 'IDP',
        business_policy_source: 'EXTERNAL_APPLICATIONS',
        summary: 'RGP consumes principal context, tenant context, and identity-side access facts from the shared IDP while enforcing workflow authorization locally.',
        migration_scope: [
          'authentication',
          'sessions',
          'principal_context',
          'tenant_context',
          'identity_access_facts',
          'account_self_service',
        ],
        external_policy_sources: [
          'rgp_domain_state',
          'rgp_workflow_authorization',
          'upstream_application_grants',
        ],
        identity_bootstrap_delivery: 'PLANNED',
        principal_context_delivery: 'PLANNED',
        tenant_context_delivery: 'PLANNED',
        identity_access_facts_delivery: 'PLANNED',
        account_self_service_delivery: 'PLANNED',
      },
      auth_binding: {
        client_id: 'rgp-web-demo',
        preferred_authentication_mode: 'browser_authorization_code_pkce',
        supported_authentication_modes: ['browser_authorization_code_pkce', 'browser_direct_login'],
        summary: 'Public browser sign-in posture for the standalone RGP workflow platform.',
      },
      projection_policy: null,
      created_at: createdAt,
      updated_at: createdAt,
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'binding-application-flightos-web',
      binding_target_kind: 'APPLICATION',
      binding_target_id: 'flightos-web',
      binding_target_name: 'FlightOS Application',
      binding_target_tenant_id: null,
      binding_mode: 'DIRECT',
      realm_id: 'realm-flightos-default',
      realm_name: realmById.get('realm-flightos-default')!.name,
      source_realm_id: null,
      override_reason: null,
      override_purpose: null,
      override_approved_by_user_id: null,
      override_approved_at: null,
      notes: [
        'Migration consumer binding for FlightOS.',
        'IDP is the informative identity plane for FlightOS while FlightOS continues to enforce product authorization locally.',
      ],
      consumer_contract: {
        application_id: 'flightos',
        application_name: 'FlightOS',
        contract_version: '2026-04-10',
        informative_authorization_plane: 'INFORMATIVE',
        enforcement_plane: 'ENFORCEMENT',
        enforcement_owner: 'flightos',
        principal_context_source: 'IDP',
        tenant_context_source: 'IDP',
        identity_access_facts_source: 'IDP',
        business_policy_source: 'EXTERNAL_APPLICATIONS',
        summary: 'FlightOS consumes IDP-owned authentication, bootstrap, tenant context, and identity access facts while continuing to enforce application authorization and domain policy locally.',
        migration_scope: [
          'authentication',
          'identity_bootstrap',
          'sessions',
          'tenant_context',
          'identity_access_facts',
          'account_self_service',
        ],
        external_policy_sources: [
          'flightos_domain_state',
          'flightos_business_rights',
          'commercial_entitlements',
        ],
        identity_bootstrap_delivery: 'PLANNED',
        principal_context_delivery: 'PLANNED',
        tenant_context_delivery: 'PLANNED',
        identity_access_facts_delivery: 'PLANNED',
        account_self_service_delivery: 'PLANNED',
      },
      auth_binding: {
        client_id: 'admin-console-demo',
        preferred_authentication_mode: 'browser_authorization_code_pkce',
        supported_authentication_modes: ['browser_authorization_code_pkce', 'browser_direct_login'],
        summary: 'Public browser sign-in posture for the FlightOS application through the shared IDP.',
      },
      projection_policy: null,
      created_at: createdAt,
      updated_at: createdAt,
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'binding-application-crew-web',
      binding_target_kind: 'APPLICATION',
      binding_target_id: 'crew-web',
      binding_target_name: 'Crew Application',
      binding_target_tenant_id: null,
      binding_mode: 'DIRECT',
      realm_id: 'realm-crew-validation',
      realm_name: realmById.get('realm-crew-validation')!.name,
      source_realm_id: null,
      override_reason: null,
      override_purpose: null,
      override_approved_by_user_id: null,
      override_approved_at: null,
      notes: [
        'Migration consumer binding for Crew.',
        'IDP is the informative authorization plane for Crew identity and access facts.',
        'Crew remains the runtime policy enforcement point and composes external business rights.',
      ],
      consumer_contract: {
        application_id: 'crew',
        application_name: 'Crew',
        contract_version: '2026-04-05',
        informative_authorization_plane: 'INFORMATIVE',
        enforcement_plane: 'ENFORCEMENT',
        enforcement_owner: 'crew',
        principal_context_source: 'IDP',
        tenant_context_source: 'IDP',
        identity_access_facts_source: 'IDP',
        business_policy_source: 'EXTERNAL_APPLICATIONS',
        summary: 'Crew consumes IDP principal context, tenant context, and identity-side access facts while continuing to enforce runtime authorization locally.',
        migration_scope: [
          'authentication',
          'identity_bootstrap',
          'sessions',
          'tenant_context',
          'identity_access_facts',
          'account_self_service',
        ],
        external_policy_sources: [
          'crew_domain_state',
          'crew_business_rights',
          'commercial_entitlements',
        ],
        identity_bootstrap_delivery: 'PLANNED',
        principal_context_delivery: 'PLANNED',
        tenant_context_delivery: 'PLANNED',
        identity_access_facts_delivery: 'PLANNED',
        account_self_service_delivery: 'PLANNED',
      },
      auth_binding: {
        client_id: 'crew-web-demo',
        preferred_authentication_mode: 'browser_authorization_code_pkce',
        supported_authentication_modes: ['browser_authorization_code_pkce', 'browser_direct_login'],
        summary: 'Public browser sign-in posture for the Crew application through the shared IDP.',
      },
      projection_policy: {
        policy_id: 'projection-policy-crew-default',
        summary: 'Crew consumes explicit identity membership as the primary tenant projection source while preserving application-side business-right composition.',
        membership_projection_strategy: 'EXPLICIT_MEMBERSHIP_ONLY',
        platform_administrator_rule: null,
        managed_role_mappings: [
          {
            managed_role_id: 'tenant_admin',
            summary: 'Maps administrative identity claims to Crew tenant administrator access facts.',
            match: {
              role_names: ['tenant_admin', 'application_admin', 'platform_administrator'],
              group_names: ['platform-admins', 'tenant-admins'],
            },
          },
          {
            managed_role_id: 'tenant_operator',
            summary: 'Maps operator identity claims to Crew operator access facts.',
            match: {
              role_names: ['tenant_operator', 'operator'],
              group_names: ['operators'],
            },
          },
          {
            managed_role_id: 'tenant_viewer',
            summary: 'Maps read-only identity claims to Crew viewer access facts.',
            match: {
              role_names: ['tenant_viewer', 'viewer'],
              group_names: ['viewers', 'auditors'],
            },
          },
        ],
        projection_sources: [
          'explicit_identity_membership',
          'claim_match',
          'external_business_policy',
        ],
      },
      created_at: createdAt,
      updated_at: createdAt,
      updated_by_user_id: 'idp-super-admin',
    },
  ];

  realmBindings.push(
    {
      id: 'binding-tenant-space-northstar-ops',
      binding_target_kind: 'TENANT_SPACE',
      binding_target_id: 'tenant-space-northstar-ops',
      binding_target_name: 'Northstar Operations Hub',
      binding_target_tenant_id: 'northstar-holdings',
      binding_mode: 'DEFAULT',
      realm_id: 'realm-idp-default',
      realm_name: realmById.get('realm-idp-default')!.name,
      source_realm_id: null,
      override_reason: null,
      override_purpose: null,
      override_approved_by_user_id: null,
      override_approved_at: null,
      notes: ['Synthetic tenant-space binding proving default clone-and-bind posture for downstream tenants.'],
      consumer_contract: null,
      auth_binding: null,
      projection_policy: null,
      created_at: createdAt,
      updated_at: createdAt,
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: 'binding-tenant-space-civic-services',
      binding_target_kind: 'TENANT_SPACE',
      binding_target_id: 'tenant-space-civic-services',
      binding_target_name: 'Civic Services Hub',
      binding_target_tenant_id: 'civic-services',
      binding_mode: 'DEFAULT',
      realm_id: 'realm-idp-default',
      realm_name: realmById.get('realm-idp-default')!.name,
      source_realm_id: null,
      override_reason: null,
      override_purpose: null,
      override_approved_by_user_id: null,
      override_approved_at: null,
      notes: ['Synthetic tenant-space binding proving that downstream tenants can later branch into override realms.'],
      consumer_contract: null,
      auth_binding: null,
      projection_policy: null,
      created_at: createdAt,
      updated_at: createdAt,
      updated_by_user_id: 'idp-super-admin',
    },
  );

  const validationDomains: IamValidationDomain[] = [
    {
      id: 'validation-idp-admin-console',
      name: 'Downstream Admin Console Validation',
      summary: 'Proves that downstream applications can consume the IAM subsystem as standards-based clients rather than acting as their own identity authority.',
      proves: ['realm isolation', 'downstream tenant binding model', 'standards-based client handoff'],
      migration_blocked: true,
    },
    {
      id: 'validation-training-portal',
      name: 'Training Portal Validation',
      summary: 'Proves learner, instructor, and admin separation before training migrates off the current local auth bridge.',
      proves: ['interactive login', 'account self-service', 'role separation'],
      migration_blocked: true,
    },
    {
      id: 'validation-developer-portal',
      name: 'Developer Portal Validation',
      summary: 'Proves client registration, scopes, service accounts, and machine-to-machine behavior.',
      proves: ['client lifecycle', 'service accounts', 'token semantics'],
      migration_blocked: true,
    },
    {
      id: 'validation-cms-adoption',
      name: 'CMS Adoption Validation',
      summary: 'Proves that a standalone CMS can later consume the IAM plane without keeping a separate global admin auth model.',
      proves: ['admin console reuse', 'global subsystem administration', 'future subsystem convergence'],
      migration_blocked: true,
    },
    {
      id: 'validation-crew-migration',
      name: 'Crew Migration Validation',
      summary: 'Proves that Crew can consume IDP as the informative authorization plane while preserving application-side enforcement and business-rights composition.',
      proves: [
        'principal context projection',
        'tenant context projection',
        'identity access fact projection',
        'application-side enforcement',
        'business-rights composition',
      ],
      migration_blocked: true,
    },
    {
      id: 'validation-commercial-migration',
      name: 'Commercial Migration Validation',
      summary: 'Proves that Commercial can run on its own tenant-scoped IDP realm and branded login posture.',
      proves: [
        'separate commercial realm',
        'commercial browser auth bootstrap',
        'consumer-specific login surface',
      ],
      migration_blocked: true,
    },
    {
      id: 'validation-rgp-migration',
      name: 'RGP Migration Validation',
      summary: 'Proves that RGP can run on its own tenant-scoped IDP realm while supporting downstream machine authorization for workflow integrations.',
      proves: [
        'separate RGP realm',
        'RGP browser auth bootstrap',
        'RGP service-account authorization',
        'tenant-context projection for workflow tenants',
      ],
      migration_blocked: true,
    },
    {
      id: 'validation-partner-embedded',
      name: 'Partner Embedded Validation',
      summary: 'Proves federated and embedded application paths before any partner-facing migration begins.',
      proves: ['brokered identity', 'SAML/OIDC support', 'embedded realm isolation'],
      migration_blocked: true,
    },
    {
      id: 'validation-education-identity',
      name: 'Education Identity Validation',
      summary: 'Proves privacy-sensitive identity posture, guardian delegation, and portable identity behavior.',
      proves: ['institutional federation', 'privacy classification', 'guardian delegation', 'portable identity'],
      migration_blocked: true,
    },
  ];

  const realmExports: IamRealmExportRecord[] = [];

  return {
    realms,
    realm_templates: realmTemplates,
    realm_bindings: realmBindings,
    validation_domains: validationDomains,
    users,
    groups,
    roles,
    delegated_admins: delegatedAdmins,
    realm_posture_presets: realmPosturePresets,
    identity_privacy_policies: identityPrivacyPolicies,
    delegated_relationships: delegatedRelationships,
    delegated_consents: delegatedConsents,
    delegated_consent_requests: delegatedConsentRequests,
    portable_identities: portableIdentities,
    realm_exports: realmExports,
  };
}

const state = combineState(
  foundationDirectoryRepository.load(),
  foundationDelegatedConsentRequestsRepository.load(),
);
const deferredPersistenceContext = new AsyncLocalStorage<{ dirty: boolean }>();
let foundationStateRevision = 0;

function bumpFoundationStateRevision(): void {
  foundationStateRevision += 1;
}

persistStateSyncOnly();

async function loadStateAsync(): Promise<IamFoundationState> {
  const [directoryState, delegatedConsentRequestsState] = await Promise.all([
    foundationDirectoryAsyncRepository.load(),
    foundationDelegatedConsentRequestsAsyncRepository.load(),
  ]);
  return combineState(
    directoryState,
    delegatedConsentRequestsState,
  );
}

function syncInMemoryState(nextState: IamFoundationState): void {
  state.realms = clone(nextState.realms);
  state.realm_templates = clone(nextState.realm_templates);
  state.realm_posture_presets = clone(nextState.realm_posture_presets);
  state.identity_privacy_policies = clone(nextState.identity_privacy_policies);
  state.delegated_relationships = clone(nextState.delegated_relationships);
  state.delegated_consents = clone(nextState.delegated_consents);
  state.delegated_consent_requests = clone(nextState.delegated_consent_requests);
  state.portable_identities = clone(nextState.portable_identities);
  state.realm_bindings = clone(nextState.realm_bindings);
  state.validation_domains = clone(nextState.validation_domains);
  state.users = clone(nextState.users);
  state.groups = clone(nextState.groups);
  state.roles = clone(nextState.roles);
  state.delegated_admins = clone(nextState.delegated_admins);
  state.realm_exports = clone(nextState.realm_exports);
  bumpFoundationStateRevision();
}

function persistStateSyncOnly(): void {
  bumpFoundationStateRevision();
  const deferredContext = deferredPersistenceContext.getStore();
  if (deferredContext) {
    deferredContext.dirty = true;
    return;
  }
  foundationDirectoryRepository.save(splitDirectoryState(state));
  foundationDelegatedConsentRequestsRepository.save(splitDelegatedConsentRequestsState(state));
}

async function persistStateAsync(): Promise<void> {
  await foundationDirectoryAsyncRepository.save(splitDirectoryState(state));
  await foundationDelegatedConsentRequestsAsyncRepository.save(splitDelegatedConsentRequestsState(state));
}

async function runWithDeferredPersistence<T>(operation: () => T | Promise<T>): Promise<T> {
  const existingContext = deferredPersistenceContext.getStore();
  if (existingContext) {
    return operation();
  }

  syncInMemoryState(await loadStateAsync());
  return deferredPersistenceContext.run({ dirty: false }, async () => {
    const deferredContext = deferredPersistenceContext.getStore()!;
    try {
      const result = await operation();
      if (deferredContext.dirty) {
        await persistStateAsync();
      }
      return result;
    } catch (error) {
      if (deferredContext.dirty) {
        await persistStateAsync();
      }
      throw error;
    }
  });
}

function listRealmUsers(realmId: string): IamUserRecord[] {
  return state.users.filter((user) => user.realm_id === realmId);
}

function listRealmGroups(realmId: string): IamGroupRecord[] {
  return state.groups.filter((group) => group.realm_id === realmId);
}

function listRealmRoles(realmId: string): IamRoleRecord[] {
  return state.roles.filter((role) => role.realm_id === realmId);
}

function listRealmDelegatedAdmins(realmId: string): IamDelegatedAdminRecord[] {
  return state.delegated_admins.filter((assignment) => assignment.realm_id === realmId);
}

function listRealmPosturePresets(realmTemplateId?: string | null): IamRealmPosturePresetRecord[] {
  return realmTemplateId
    ? state.realm_posture_presets.filter((preset) => preset.realm_template_id === realmTemplateId)
    : [...state.realm_posture_presets];
}

function listIdentityPrivacyPolicies(realmId?: string | null): IamIdentityPrivacyPolicyRecord[] {
  return realmId ? state.identity_privacy_policies.filter((policy) => policy.realm_id === realmId) : [...state.identity_privacy_policies];
}

function listDelegatedRelationships(realmId?: string | null): IamDelegatedRelationshipRecord[] {
  return realmId ? state.delegated_relationships.filter((relationship) => relationship.realm_id === realmId) : [...state.delegated_relationships];
}

function listDelegatedConsents(filters?: {
  realm_id?: string | null;
  relationship_id?: string | null;
  principal_user_id?: string | null;
  delegate_user_id?: string | null;
  status?: IamDelegatedConsentStatus | null;
}): IamDelegatedConsentRecord[] {
  refreshDelegatedConsentStatuses();
  let delegatedConsents = [...state.delegated_consents];
  if (filters?.realm_id) {
    delegatedConsents = delegatedConsents.filter((record) => record.realm_id === filters.realm_id);
  }
  if (filters?.relationship_id) {
    delegatedConsents = delegatedConsents.filter((record) => record.relationship_id === filters.relationship_id);
  }
  if (filters?.principal_user_id) {
    delegatedConsents = delegatedConsents.filter((record) => record.principal_user_id === filters.principal_user_id);
  }
  if (filters?.delegate_user_id) {
    delegatedConsents = delegatedConsents.filter((record) => record.delegate_user_id === filters.delegate_user_id);
  }
  if (filters?.status) {
    delegatedConsents = delegatedConsents.filter((record) => record.status === filters.status);
  }
  return delegatedConsents;
}

function refreshDelegatedConsentStatuses(): number {
  let changed = false;
  let expiredDelegatedConsentCount = 0;
  for (const consent of state.delegated_consents) {
    if (consent.status !== 'ACTIVE' || !consent.expires_at) {
      continue;
    }
    const expiresAt = Date.parse(consent.expires_at);
    if (!Number.isNaN(expiresAt) && expiresAt <= Date.now()) {
      consent.status = 'EXPIRED';
      consent.revoked_at = consent.revoked_at ?? consent.expires_at;
      changed = true;
      expiredDelegatedConsentCount += 1;
    }
  }
  if (changed) {
    persistStateSyncOnly();
  }
  return expiredDelegatedConsentCount;
}

function refreshDelegatedConsentRequestStatuses(): number {
  let changed = false;
  let expiredDelegatedConsentRequestCount = 0;
  for (const request of state.delegated_consent_requests) {
    if (request.status !== 'PENDING' || !request.expires_at) {
      continue;
    }
    const expiresAt = Date.parse(request.expires_at);
    if (!Number.isNaN(expiresAt) && expiresAt <= Date.now()) {
      request.status = 'EXPIRED';
      request.responded_at = request.responded_at ?? nowIso();
      changed = true;
      expiredDelegatedConsentRequestCount += 1;
    }
  }
  if (changed) {
    persistStateSyncOnly();
  }
  return expiredDelegatedConsentRequestCount;
}

function runTransientStateMaintenanceSyncOnly(): IamFoundationTransientStateMaintenanceResult {
  const expiredDelegatedConsentCount = refreshDelegatedConsentStatuses();
  const expiredDelegatedConsentRequestCount = refreshDelegatedConsentRequestStatuses();
  return {
    expired_delegated_consent_count: expiredDelegatedConsentCount,
    expired_delegated_consent_request_count: expiredDelegatedConsentRequestCount,
    total_mutated_count: expiredDelegatedConsentCount + expiredDelegatedConsentRequestCount,
  };
}

function listDelegatedConsentRequests(filters?: {
  realm_id?: string | null;
  relationship_id?: string | null;
  principal_user_id?: string | null;
  delegate_user_id?: string | null;
  requested_by_user_id?: string | null;
  status?: IamDelegatedConsentRequestStatus | null;
}): IamDelegatedConsentRequestRecord[] {
  refreshDelegatedConsentRequestStatuses();
  let delegatedConsentRequests = [...state.delegated_consent_requests];
  if (filters?.realm_id) {
    delegatedConsentRequests = delegatedConsentRequests.filter((record) => record.realm_id === filters.realm_id);
  }
  if (filters?.relationship_id) {
    delegatedConsentRequests = delegatedConsentRequests.filter((record) => record.relationship_id === filters.relationship_id);
  }
  if (filters?.principal_user_id) {
    delegatedConsentRequests = delegatedConsentRequests.filter((record) => record.principal_user_id === filters.principal_user_id);
  }
  if (filters?.delegate_user_id) {
    delegatedConsentRequests = delegatedConsentRequests.filter((record) => record.delegate_user_id === filters.delegate_user_id);
  }
  if (filters?.requested_by_user_id) {
    delegatedConsentRequests = delegatedConsentRequests.filter((record) => record.requested_by_user_id === filters.requested_by_user_id);
  }
  if (filters?.status) {
    delegatedConsentRequests = delegatedConsentRequests.filter((record) => record.status === filters.status);
  }
  return delegatedConsentRequests;
}

function listPortableIdentities(realmId?: string | null): IamPortableIdentityRecord[] {
  return realmId ? state.portable_identities.filter((identity) => identity.realm_id === realmId) : [...state.portable_identities];
}

function ensureRealmUniqueName(name: string, excludedRealmId?: string): void {
  const normalized = name.trim().toLowerCase();
  const conflict = state.realms.find((candidate) => candidate.id !== excludedRealmId && candidate.name.trim().toLowerCase() === normalized);
  if (conflict) {
    throw new Error(`An IAM realm named "${name}" already exists`);
  }
}

function listTenantOwnedRealms(tenantId: string, excludedRealmId?: string): IamRealmRecord[] {
  return state.realms.filter((realm) => realm.owner_tenant_id === tenantId && realm.id !== excludedRealmId);
}

function resolvePlatformPrimaryRealm(): IamRealmRecord | null {
  const activePlatformDefault = state.realms.find((realm) => realm.scope_kind === 'PLATFORM_DEFAULT' && realm.status !== 'ARCHIVED') ?? null;
  if (activePlatformDefault) {
    return activePlatformDefault;
  }
  return state.realms.find((realm) => realm.status !== 'ARCHIVED') ?? state.realms[0] ?? null;
}

function resolvePrimaryRealmForTenant(tenantId: string | null, excludedRealmId?: string): IamRealmRecord | null {
  if (!tenantId) {
    return resolvePlatformPrimaryRealm();
  }

  const tenantRealms = listTenantOwnedRealms(tenantId, excludedRealmId);
  const explicitPrimary = tenantRealms.find((realm) => realm.tenant_realm_role === 'PRIMARY' && realm.status !== 'ARCHIVED')
    ?? tenantRealms.find((realm) => realm.tenant_realm_role === 'PRIMARY')
    ?? null;
  if (explicitPrimary) {
    return explicitPrimary;
  }

  const firstActive = tenantRealms.find((realm) => realm.status !== 'ARCHIVED') ?? null;
  if (firstActive) {
    return firstActive;
  }

  return null;
}

function promotePrimaryRealmIfMissing(tenantId: string, actorUserId: string, updatedAt: string): void {
  const tenantRealms = listTenantOwnedRealms(tenantId);
  if (tenantRealms.length === 0) {
    return;
  }

  const currentPrimary = tenantRealms.find((realm) => realm.tenant_realm_role === 'PRIMARY') ?? null;
  if (currentPrimary) {
    return;
  }

  const promotedRealm = tenantRealms.find((realm) => realm.status !== 'ARCHIVED') ?? tenantRealms[0];
  promotedRealm.tenant_realm_role = 'PRIMARY';
  promotedRealm.exception_reason = null;
  promotedRealm.exception_purpose = null;
  promotedRealm.updated_at = updatedAt;
  promotedRealm.updated_by_user_id = actorUserId;
}

function collapseDuplicatePrimaryRealms(tenantId: string, actorUserId: string, updatedAt: string): void {
  const tenantRealms = listTenantOwnedRealms(tenantId).filter((realm) => realm.tenant_realm_role === 'PRIMARY');
  if (tenantRealms.length <= 1) {
    return;
  }

  const [primary, ...exceptions] = tenantRealms;
  primary.exception_reason = null;
  primary.exception_purpose = null;

  exceptions.forEach((realm) => {
    realm.tenant_realm_role = 'EXCEPTION';
    realm.exception_reason = realm.exception_reason ?? 'Primary designation adjusted to preserve one-primary-per-tenant policy.';
    realm.exception_purpose = realm.exception_purpose ?? 'Tenant requires additional isolated identity authority.';
    realm.updated_at = updatedAt;
    realm.updated_by_user_id = actorUserId;
  });
}

function synchronizeTenantRealmPolicyForTenant(tenantId: string, actorUserId: string, updatedAt: string): void {
  collapseDuplicatePrimaryRealms(tenantId, actorUserId, updatedAt);
  promotePrimaryRealmIfMissing(tenantId, actorUserId, updatedAt);
}

function synchronizeTenantSpaceBindingsToPrimaryRealm(tenantId: string, actorUserId: string, updatedAt: string): void {
  const primaryRealm = resolvePrimaryRealmForTenant(tenantId);
  if (!primaryRealm) {
    return;
  }

  state.realm_bindings
    .filter((binding) => binding.binding_target_kind === 'TENANT_SPACE' && binding.binding_target_tenant_id === tenantId && binding.binding_mode !== 'OVERRIDE')
    .forEach((binding) => {
      binding.binding_mode = 'DEFAULT';
      binding.realm_id = primaryRealm.id;
      binding.realm_name = primaryRealm.name;
      binding.source_realm_id = primaryRealm.source_realm_id;
      binding.override_reason = null;
      binding.override_purpose = null;
      binding.override_approved_by_user_id = null;
      binding.override_approved_at = null;
      binding.updated_at = updatedAt;
      binding.updated_by_user_id = actorUserId;
    });
}

function resolveRealmForBindingRecord(binding: IamRealmBindingRecord): IamRealmRecord | null {
  if (binding.binding_target_kind === 'TENANT_SPACE' && binding.binding_mode !== 'OVERRIDE') {
    const primaryRealm = resolvePrimaryRealmForTenant(binding.binding_target_tenant_id);
    if (primaryRealm) {
      return primaryRealm;
    }
  }

  return state.realms.find((realm) => realm.id === binding.realm_id) ?? null;
}

function projectRealmBindingWithResolvedRealm(binding: IamRealmBindingRecord): IamRealmBindingRecord {
  const resolvedRealm = resolveRealmForBindingRecord(binding);

  if (!resolvedRealm) {
    if (binding.binding_target_kind === 'TENANT_SPACE' && binding.binding_mode !== 'OVERRIDE') {
      return {
        ...binding,
        binding_mode: 'DEFAULT',
        override_reason: null,
        override_purpose: null,
        override_approved_by_user_id: null,
        override_approved_at: null,
      };
    }

    return { ...binding };
  }

  if (binding.binding_target_kind === 'TENANT_SPACE' && binding.binding_mode !== 'OVERRIDE') {
    return {
      ...binding,
      binding_mode: 'DEFAULT',
      realm_id: resolvedRealm.id,
      realm_name: resolvedRealm.name,
      source_realm_id: resolvedRealm.source_realm_id,
      override_reason: null,
      override_purpose: null,
      override_approved_by_user_id: null,
      override_approved_at: null,
    };
  }

  return {
    ...binding,
    realm_id: resolvedRealm.id,
    realm_name: resolvedRealm.name,
    source_realm_id: resolvedRealm.source_realm_id,
  };
}

function ensureRealmUniqueUsername(realmId: string, username: string, excludedUserId?: string): void {
  const normalized = username.trim().toLowerCase();
  const conflict = state.users.find((candidate) =>
    candidate.id !== excludedUserId &&
    candidate.realm_id === realmId &&
    candidate.username.trim().toLowerCase() === normalized
  );
  if (conflict) {
    throw new Error(`The username "${username}" already exists in realm ${realmId}`);
  }
}

function ensureRealmUniqueEmail(realmId: string, email: string, excludedUserId?: string): void {
  const normalized = email.trim().toLowerCase();
  const conflict = state.users.find((candidate) =>
    candidate.id !== excludedUserId &&
    candidate.realm_id === realmId &&
    candidate.email.trim().toLowerCase() === normalized
  );
  if (conflict) {
    throw new Error(`The email "${email}" already exists in realm ${realmId}`);
  }
}

function ensureRealmUniqueGroupName(realmId: string, name: string, excludedGroupId?: string): void {
  const normalized = name.trim().toLowerCase();
  const conflict = state.groups.find((candidate) =>
    candidate.id !== excludedGroupId &&
    candidate.realm_id === realmId &&
    candidate.name.trim().toLowerCase() === normalized
  );
  if (conflict) {
    throw new Error(`The group "${name}" already exists in realm ${realmId}`);
  }
}

function ensureRealmUniqueRoleName(realmId: string, name: string, kind: IamRoleKind, clientId?: string | null, excludedRoleId?: string): void {
  const normalized = name.trim().toLowerCase();
  const conflict = state.roles.find((candidate) =>
    candidate.id !== excludedRoleId &&
    candidate.realm_id === realmId &&
    candidate.kind === kind &&
    candidate.name.trim().toLowerCase() === normalized &&
    (kind !== 'CLIENT_ROLE' || candidate.client_id === (clientId ?? null))
  );
  if (conflict) {
    throw new Error(`The role "${name}" already exists in realm ${realmId} for the selected role kind`);
  }
}

function synchronizeMembershipsForUser(userId: string): void {
  const user = assertUserExists(userId);
  const groups = listRealmGroups(user.realm_id);
  const nextGroupIds = groups.filter((group) => group.member_user_ids.includes(user.id)).map((group) => group.id);
  user.group_ids = Array.from(new Set([...user.group_ids, ...nextGroupIds])).filter((groupId) => groups.some((group) => group.id === groupId));
}

function cloneRealmFoundation(actorUserId: string, sourceRealmId: string, nextRealmId: string, nextRealmName: string): void {
  const sourceRoles = listRealmRoles(sourceRealmId);
  const sourceGroups = listRealmGroups(sourceRealmId);

  const roleIdMap = new Map<string, string>();
  sourceRoles.forEach((role) => {
    const nextRoleId = `${nextRealmId}-role-${slugify(role.name) || randomUUID().slice(0, 8)}`;
    roleIdMap.set(role.id, nextRoleId);
  });

  sourceRoles.forEach((role) => {
    state.roles.push({
      ...clone(role),
      id: roleIdMap.get(role.id)!,
      realm_id: nextRealmId,
      synthetic: false,
      composite_role_ids: role.composite_role_ids.map((roleId) => roleIdMap.get(roleId) ?? roleId).filter(Boolean),
      created_at: nowIso(),
      updated_at: nowIso(),
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
      summary: `${role.summary} (cloned from ${nextRealmName})`,
    });
  });

  const groupIdMap = new Map<string, string>();
  sourceGroups.forEach((group) => {
    const nextGroupId = `${nextRealmId}-group-${slugify(group.name) || randomUUID().slice(0, 8)}`;
    groupIdMap.set(group.id, nextGroupId);
  });

  sourceGroups.forEach((group) => {
    state.groups.push({
      ...clone(group),
      id: groupIdMap.get(group.id)!,
      realm_id: nextRealmId,
      synthetic: false,
      parent_group_id: group.parent_group_id ? (groupIdMap.get(group.parent_group_id) ?? null) : null,
      role_ids: group.role_ids.map((roleId) => roleIdMap.get(roleId) ?? roleId).filter(Boolean),
      member_user_ids: [],
      created_at: nowIso(),
      updated_at: nowIso(),
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
      summary: `${group.summary} (cloned from ${nextRealmName})`,
    });
  });
}

export const LocalIamFoundationStore = {
  getSummary(): IamSummaryResponse {
    refreshDelegatedConsentStatuses();
    refreshDelegatedConsentRequestStatuses();
    return {
      generated_at: nowIso(),
      phase: 'PHASE_1',
      subsystem_status: 'REALM_RBAC_FOUNDATION_IMPLEMENTED',
      migration_state: 'BLOCKED_PENDING_STANDALONE_ADOPTION',
      admin_surface_route: '/iam',
      scope_model: 'STANDALONE_MULTI_REALM_WITH_CONSUMER_BINDINGS',
      global_admin_role: 'super_administrator',
      realm_count: state.realms.length,
      realm_template_count: state.realm_templates.length,
      realm_binding_count: state.realm_bindings.length,
      validation_domain_count: state.validation_domains.length,
      user_count: state.users.length,
      group_count: state.groups.length,
      role_count: state.roles.length,
      delegated_admin_count: state.delegated_admins.length,
      realm_posture_preset_count: state.realm_posture_presets.length,
      identity_privacy_policy_count: state.identity_privacy_policies.length,
      delegated_relationship_count: state.delegated_relationships.length,
      delegated_consent_count: state.delegated_consents.length,
      delegated_consent_request_count: state.delegated_consent_requests.length,
      portable_identity_count: state.portable_identities.length,
      realm_export_count: state.realm_exports.length,
      first_contract_ids: [
        'iam-realms-api',
        'iam-realm-templates-api',
        'iam-identity-governance-api',
        'iam-realm-bindings-api',
        'iam-users-api',
        'iam-groups-api',
        'iam-roles-api',
        'iam-delegated-admin-api',
        'iam-realm-exports-api'
      ],
      next_recommended_phase: 'PHASE_2_CLIENT_PROTOCOL_RUNTIME',
    };
  },

  getStateRevision(): number {
    return foundationStateRevision;
  },

  listRealms(filters?: {
    scope_kind?: IamRealmScopeKind | null;
    binding_target_kind?: IamBindingTargetKind | null;
    binding_target_id?: string | null;
  }, pagination?: IamListPagination): IamRealmsResponse {
    let realms = [...state.realms];

    if (filters?.scope_kind) {
      realms = realms.filter((realm) => realm.scope_kind === filters.scope_kind);
    }

    if (filters?.binding_target_kind && filters?.binding_target_id) {
      const binding = state.realm_bindings.find((candidate) =>
        candidate.binding_target_kind === filters.binding_target_kind &&
        candidate.binding_target_id === filters.binding_target_id
      );
      const resolvedBinding = binding ? projectRealmBindingWithResolvedRealm(binding) : null;
      realms = resolvedBinding ? realms.filter((realm) => realm.id === resolvedBinding.realm_id) : [];
    }

    const pagedRealms = paginateList(realms, pagination);
    return {
      generated_at: nowIso(),
      realms: clone(pagedRealms.data),
      count: pagedRealms.count,
      offset: pagedRealms.offset,
      limit: pagedRealms.limit,
      has_more: pagedRealms.has_more,
    };
  },

  getRealm(realmId: string): IamRealmRecord {
    return clone(assertRealmExists(realmId));
  },

  listRealmAttributes(realmId: string): IamRealmAttributesResponse {
    const realm = assertRealmExists(realmId);
    const attributes = listRealmAttributeRecords(realm);
    return {
      generated_at: nowIso(),
      realm_id: realm.id,
      attributes,
      count: attributes.length,
    };
  },

  createRealmAttribute(actorUserId: string, realmId: string, input: CreateIamRealmAttributeRequest): IamRealmAttributeRecord {
    const realm = assertRealmExists(realmId);
    const nextKey = normalizeRealmAttributeKey(input.key);
    const nextValue = normalizeRealmAttributeValue(input.value);
    const existingKey = Object.keys(realm.attributes ?? {}).find((candidate) => candidate.toLowerCase() === nextKey.toLowerCase());
    if (existingKey) {
      throw new Error(`Realm attribute ${existingKey} already exists.`);
    }
    realm.attributes = {
      ...(realm.attributes ?? {}),
      [nextKey]: nextValue,
    };
    realm.updated_at = nowIso();
    realm.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return {
      id: `${realm.id}:${nextKey}`,
      realm_id: realm.id,
      key: nextKey,
      value: nextValue,
      updated_at: realm.updated_at,
      updated_by_user_id: realm.updated_by_user_id,
    };
  },

  async createRealmAttributeAsync(
    actorUserId: string,
    realmId: string,
    input: CreateIamRealmAttributeRequest,
  ): Promise<IamRealmAttributeRecord> {
    return runWithDeferredPersistence(() => this.createRealmAttribute(actorUserId, realmId, input));
  },

  updateRealmAttribute(
    actorUserId: string,
    realmId: string,
    currentKey: string,
    input: UpdateIamRealmAttributeRequest,
  ): IamRealmAttributeRecord {
    const realm = assertRealmExists(realmId);
    const existingEntry = Object.entries(realm.attributes ?? {}).find(([candidate]) => candidate.toLowerCase() === currentKey.trim().toLowerCase());
    if (!existingEntry) {
      throw new Error(`Unknown realm attribute: ${currentKey}`);
    }

    const [existingKey, existingValue] = existingEntry;
    const nextKey = input.key !== undefined ? normalizeRealmAttributeKey(input.key) : existingKey;
    const nextValue = input.value !== undefined ? normalizeRealmAttributeValue(input.value) : existingValue;
    const conflictingKey = Object.keys(realm.attributes ?? {}).find(
      (candidate) => candidate !== existingKey && candidate.toLowerCase() === nextKey.toLowerCase(),
    );
    if (conflictingKey) {
      throw new Error(`Realm attribute ${conflictingKey} already exists.`);
    }

    const nextAttributes = { ...(realm.attributes ?? {}) };
    delete nextAttributes[existingKey];
    nextAttributes[nextKey] = nextValue;
    realm.attributes = nextAttributes;
    realm.updated_at = nowIso();
    realm.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return {
      id: `${realm.id}:${nextKey}`,
      realm_id: realm.id,
      key: nextKey,
      value: nextValue,
      updated_at: realm.updated_at,
      updated_by_user_id: realm.updated_by_user_id,
    };
  },

  async updateRealmAttributeAsync(
    actorUserId: string,
    realmId: string,
    currentKey: string,
    input: UpdateIamRealmAttributeRequest,
  ): Promise<IamRealmAttributeRecord> {
    return runWithDeferredPersistence(() => this.updateRealmAttribute(actorUserId, realmId, currentKey, input));
  },

  deleteRealmAttribute(actorUserId: string, realmId: string, key: string): void {
    const realm = assertRealmExists(realmId);
    const existingKey = Object.keys(realm.attributes ?? {}).find((candidate) => candidate.toLowerCase() === key.trim().toLowerCase());
    if (!existingKey) {
      throw new Error(`Unknown realm attribute: ${key}`);
    }
    const nextAttributes = { ...(realm.attributes ?? {}) };
    delete nextAttributes[existingKey];
    realm.attributes = nextAttributes;
    realm.updated_at = nowIso();
    realm.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
  },

  async deleteRealmAttributeAsync(actorUserId: string, realmId: string, key: string): Promise<void> {
    return runWithDeferredPersistence(() => this.deleteRealmAttribute(actorUserId, realmId, key));
  },

  createRealm(actorUserId: string, input: CreateIamRealmRequest): IamRealmRecord {
    const name = input.name?.trim();
    if (!name) {
      throw new Error('Missing required field: name');
    }

    const summary = input.summary?.trim();
    if (!summary) {
      throw new Error('Missing required field: summary');
    }

    ensureRealmUniqueName(name);

    const ownerTenantId = normalizeOptionalText(input.owner_tenant_id);
    const tenantRealmRoleProvided = Object.prototype.hasOwnProperty.call(input, 'tenant_realm_role');
    const normalizedTenantRealmRole = tenantRealmRoleProvided
      ? normalizeTenantRealmRole(input.tenant_realm_role)
      : null;
    if (tenantRealmRoleProvided && !normalizedTenantRealmRole) {
      throw new Error('tenant_realm_role must be PRIMARY or EXCEPTION');
    }

    let templateId = input.template_id ?? null;
    let sourceRealmId = input.clone_from_realm_id ?? null;
    let supportedProtocols: Array<'OIDC' | 'OAUTH2' | 'SAML'> = input.supported_protocols?.length
      ? Array.from(new Set(input.supported_protocols))
      : ['OIDC', 'OAUTH2'];
    let intendedConsumers = input.intended_consumers?.length ? Array.from(new Set(input.intended_consumers.map((value) => value.trim()).filter(Boolean))) : [];
    let posturePresetIds = input.posture_preset_ids?.length
      ? Array.from(new Set(input.posture_preset_ids.map((value) => value.trim()).filter(Boolean)))
      : [];

    if (templateId) {
      const template = assertTemplateExists(templateId);
      supportedProtocols = template.supported_protocols;
      posturePresetIds = posturePresetIds.length > 0
        ? posturePresetIds
        : Array.from(new Set((template.posture_preset_ids ?? []).map((value) => value.trim()).filter(Boolean)));
    }

    if (sourceRealmId) {
      const sourceRealm = assertRealmExists(sourceRealmId);
      templateId = templateId ?? sourceRealm.template_id;
      supportedProtocols = sourceRealm.supported_protocols;
      intendedConsumers = intendedConsumers.length > 0 ? intendedConsumers : sourceRealm.intended_consumers;
      posturePresetIds = posturePresetIds.length > 0
        ? posturePresetIds
        : Array.from(new Set((sourceRealm.posture_preset_ids ?? []).map((value) => value.trim()).filter(Boolean)));
    }

    const sourceRealmAttributes = sourceRealmId
      ? clone(assertRealmExists(sourceRealmId).attributes ?? {})
      : {};

    if (posturePresetIds.length > 0) {
      validateRealmPosturePresetIds(posturePresetIds);
    }

    let tenantRealmRole: IamTenantRealmRole | null = null;
    let exceptionReason: string | null = null;
    let exceptionPurpose: string | null = null;

    if (ownerTenantId) {
      const existingPrimaryRealm = resolvePrimaryRealmForTenant(ownerTenantId);
      if (!existingPrimaryRealm) {
        tenantRealmRole = normalizedTenantRealmRole ?? 'PRIMARY';
        if (tenantRealmRole === 'EXCEPTION') {
          throw new Error(`Tenant ${ownerTenantId} does not have a primary realm yet. The first tenant realm must be PRIMARY.`);
        }
      } else {
        if (!normalizedTenantRealmRole) {
          throw new Error(
            `Tenant ${ownerTenantId} already has primary realm ${existingPrimaryRealm.id}. Additional realms require tenant_realm_role="EXCEPTION" plus exception_reason and exception_purpose.`,
          );
        }
        tenantRealmRole = normalizedTenantRealmRole;
        if (tenantRealmRole === 'PRIMARY') {
          throw new Error(
            `Tenant ${ownerTenantId} already has primary realm ${existingPrimaryRealm.id}. Only one PRIMARY realm is allowed per tenant.`,
          );
        }
      }

      if (tenantRealmRole === 'EXCEPTION') {
        exceptionReason = normalizeOptionalText(input.exception_reason);
        exceptionPurpose = normalizeOptionalText(input.exception_purpose);
        if (!exceptionReason || !exceptionPurpose) {
          throw new Error('Additional tenant realms require explicit exception_reason and exception_purpose.');
        }
      }
    }

    const realmId = nextUniqueId(name, new Set(state.realms.map((realm) => realm.id)), 'realm');
    const createdAt = nowIso();
    const record: IamRealmRecord = {
      id: realmId,
      name,
      summary,
      attributes: sourceRealmAttributes,
      scope_kind: input.scope_kind ?? (ownerTenantId ? 'TENANT_OVERRIDE' : sourceRealmId ? 'TENANT_OVERRIDE' : 'STANDALONE_VALIDATION'),
      status: input.status ?? 'READY_FOR_FOUNDATION_PHASE',
      synthetic: false,
      intended_consumers: intendedConsumers,
      supported_protocols: supportedProtocols,
      template_id: templateId,
      posture_preset_ids: posturePresetIds,
      source_realm_id: sourceRealmId,
      owner_tenant_id: ownerTenantId,
      tenant_realm_role: tenantRealmRole,
      exception_reason: exceptionReason,
      exception_purpose: exceptionPurpose,
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    };

    state.realms.push(record);

    if (sourceRealmId) {
      cloneRealmFoundation(actorUserId, sourceRealmId, realmId, name);
    }

    if (ownerTenantId) {
      synchronizeTenantRealmPolicyForTenant(ownerTenantId, actorUserId, createdAt);
      synchronizeTenantSpaceBindingsToPrimaryRealm(ownerTenantId, actorUserId, createdAt);
    }

    persistStateSyncOnly();
    return clone(record);
  },

  async createRealmAsync(actorUserId: string, input: CreateIamRealmRequest): Promise<IamRealmRecord> {
    return runWithDeferredPersistence(() => this.createRealm(actorUserId, input));
  },

  updateRealm(actorUserId: string, realmId: string, input: UpdateIamRealmRequest): IamRealmRecord {
    const realm = assertRealmExists(realmId);
    const previousOwnerTenantId = realm.owner_tenant_id;
    const tenantRealmRoleProvided = Object.prototype.hasOwnProperty.call(input, 'tenant_realm_role');
    const normalizedTenantRealmRole = tenantRealmRoleProvided
      ? normalizeTenantRealmRole(input.tenant_realm_role)
      : null;
    if (tenantRealmRoleProvided && !normalizedTenantRealmRole) {
      throw new Error('tenant_realm_role must be PRIMARY or EXCEPTION');
    }
    const nextOwnerTenantId = input.owner_tenant_id !== undefined ? normalizeOptionalText(input.owner_tenant_id) : realm.owner_tenant_id;
    let nextTenantRealmRole = tenantRealmRoleProvided ? normalizedTenantRealmRole : realm.tenant_realm_role;
    const exceptionReasonProvided = Object.prototype.hasOwnProperty.call(input, 'exception_reason');
    const exceptionPurposeProvided = Object.prototype.hasOwnProperty.call(input, 'exception_purpose');
    let nextExceptionReason = exceptionReasonProvided ? normalizeOptionalText(input.exception_reason) : realm.exception_reason;
    let nextExceptionPurpose = exceptionPurposeProvided ? normalizeOptionalText(input.exception_purpose) : realm.exception_purpose;

    if (input.name !== undefined) {
      const nextName = input.name.trim();
      if (!nextName) {
        throw new Error('Realm name cannot be empty');
      }
      ensureRealmUniqueName(nextName, realm.id);
      realm.name = nextName;
    }

    if (input.summary !== undefined) {
      const nextSummary = input.summary.trim();
      if (!nextSummary) {
        throw new Error('Realm summary cannot be empty');
      }
      realm.summary = nextSummary;
    }

    if (input.status) {
      realm.status = input.status;
    }

    if (input.intended_consumers) {
      realm.intended_consumers = Array.from(new Set(input.intended_consumers.map((value) => value.trim()).filter(Boolean)));
    }

    if (input.supported_protocols) {
      const nextProtocols = Array.from(new Set(input.supported_protocols));
      if (nextProtocols.length === 0) {
        throw new Error('Realms must support at least one protocol');
      }
      realm.supported_protocols = nextProtocols;
    }

    if (input.posture_preset_ids !== undefined) {
      const nextPresetIds = input.posture_preset_ids === null
        ? []
        : Array.from(new Set(input.posture_preset_ids.map((value) => value.trim()).filter(Boolean)));
      if (nextPresetIds.length > 0) {
        validateRealmPosturePresetIds(nextPresetIds);
      }
      realm.posture_preset_ids = nextPresetIds;
    }

    if (!nextOwnerTenantId) {
      nextTenantRealmRole = null;
      nextExceptionReason = null;
      nextExceptionPurpose = null;
    } else {
      const existingPrimaryOther = resolvePrimaryRealmForTenant(nextOwnerTenantId, realm.id);
      if (!nextTenantRealmRole) {
        nextTenantRealmRole = existingPrimaryOther ? null : 'PRIMARY';
      }

      if (!nextTenantRealmRole) {
        throw new Error(
          `Tenant ${nextOwnerTenantId} already has primary realm ${existingPrimaryOther?.id}. Additional realms require tenant_realm_role="EXCEPTION" plus exception_reason and exception_purpose.`,
        );
      }

      if (nextTenantRealmRole === 'PRIMARY' && existingPrimaryOther) {
        throw new Error(
          `Tenant ${nextOwnerTenantId} already has primary realm ${existingPrimaryOther.id}. Only one PRIMARY realm is allowed per tenant.`,
        );
      }

      if (nextTenantRealmRole === 'EXCEPTION') {
        const siblingRealms = listTenantOwnedRealms(nextOwnerTenantId, realm.id);
        if (!existingPrimaryOther && siblingRealms.length === 0) {
          throw new Error(`Tenant ${nextOwnerTenantId} requires a PRIMARY realm. A tenant's only realm cannot be marked as EXCEPTION.`);
        }
        if (!nextExceptionReason || !nextExceptionPurpose) {
          throw new Error('Additional tenant realms require explicit exception_reason and exception_purpose.');
        }
      } else {
        nextExceptionReason = null;
        nextExceptionPurpose = null;
      }
    }

    realm.owner_tenant_id = nextOwnerTenantId;
    realm.tenant_realm_role = nextTenantRealmRole;
    realm.exception_reason = nextExceptionReason;
    realm.exception_purpose = nextExceptionPurpose;

    realm.updated_at = nowIso();
    realm.updated_by_user_id = actorUserId;

    state.realm_bindings
      .filter((binding) => binding.realm_id === realm.id)
      .forEach((binding) => {
        binding.realm_name = realm.name;
        binding.updated_at = realm.updated_at;
        binding.updated_by_user_id = actorUserId;
      });

    const touchedTenantIds = new Set<string>();
    if (previousOwnerTenantId) {
      touchedTenantIds.add(previousOwnerTenantId);
    }
    if (nextOwnerTenantId) {
      touchedTenantIds.add(nextOwnerTenantId);
    }
    touchedTenantIds.forEach((tenantId) => {
      synchronizeTenantRealmPolicyForTenant(tenantId, actorUserId, realm.updated_at);
      synchronizeTenantSpaceBindingsToPrimaryRealm(tenantId, actorUserId, realm.updated_at);
    });

    persistStateSyncOnly();
    return clone(realm);
  },

  async updateRealmAsync(
    actorUserId: string,
    realmId: string,
    input: UpdateIamRealmRequest,
  ): Promise<IamRealmRecord> {
    return runWithDeferredPersistence(() => this.updateRealm(actorUserId, realmId, input));
  },

  listRealmTemplates(): IamRealmTemplatesResponse {
    return {
      generated_at: nowIso(),
      realm_templates: clone(state.realm_templates),
      count: state.realm_templates.length,
    };
  },

  listRealmPosturePresets(filters?: {
    realm_template_id?: string | null;
  }): IamRealmPosturePresetsResponse {
    const realmPosturePresets = listRealmPosturePresets(filters?.realm_template_id ?? null);

    return {
      generated_at: nowIso(),
      realm_posture_presets: clone(realmPosturePresets),
      count: realmPosturePresets.length,
    };
  },

  listIdentityPrivacyPolicies(filters?: {
    realm_id?: string | null;
  }): IamIdentityPrivacyPoliciesResponse {
    const identityPrivacyPolicies = listIdentityPrivacyPolicies(filters?.realm_id ?? null);

    return {
      generated_at: nowIso(),
      identity_privacy_policies: clone(identityPrivacyPolicies),
      count: identityPrivacyPolicies.length,
    };
  },

  listDelegatedRelationships(filters?: {
    realm_id?: string | null;
  }): IamDelegatedRelationshipsResponse {
    const delegatedRelationships = listDelegatedRelationships(filters?.realm_id ?? null);

    return {
      generated_at: nowIso(),
      delegated_relationships: clone(delegatedRelationships),
      count: delegatedRelationships.length,
    };
  },

  listDelegatedConsents(filters?: {
    realm_id?: string | null;
    relationship_id?: string | null;
    principal_user_id?: string | null;
    delegate_user_id?: string | null;
    status?: IamDelegatedConsentStatus | null;
  }): IamDelegatedConsentsResponse {
    const delegatedConsents = listDelegatedConsents(filters);

    return {
      generated_at: nowIso(),
      delegated_consents: clone(delegatedConsents),
      count: delegatedConsents.length,
    };
  },

  listDelegatedConsentRequests(filters?: {
    realm_id?: string | null;
    relationship_id?: string | null;
    principal_user_id?: string | null;
    delegate_user_id?: string | null;
    requested_by_user_id?: string | null;
    status?: IamDelegatedConsentRequestStatus | null;
  }): IamDelegatedConsentRequestsResponse {
    const delegatedConsentRequests = listDelegatedConsentRequests(filters);

    return {
      generated_at: nowIso(),
      delegated_consent_requests: clone(delegatedConsentRequests),
      count: delegatedConsentRequests.length,
    };
  },

  createDelegatedConsent(actorUserId: string, input: CreateIamDelegatedConsentRequest): IamDelegatedConsentRecord {
    const relationship = assertDelegatedRelationshipExists(input.relationship_id);
    if (relationship.realm_id !== input.realm_id) {
      throw new Error(`Delegated relationship ${relationship.id} does not belong to realm ${input.realm_id}`);
    }
    validateUserIdsForRealm(input.realm_id, [relationship.principal_user_id, relationship.delegate_user_id]);

    const scopeNames = Array.from(new Set((input.scope_names ?? []).map((value) => value.trim()).filter(Boolean))).sort();
    if (scopeNames.length === 0) {
      throw new Error('Delegated consent requires at least one scope');
    }
    const invalidScopeNames = scopeNames.filter((scopeName) => !relationship.allowed_scopes.includes(scopeName));
    if (invalidScopeNames.length > 0) {
      throw new Error(`Delegated consent scopes are outside the relationship allowance: ${invalidScopeNames.join(', ')}`);
    }

    const purposeNames = Array.from(new Set((input.purpose_names ?? []).map((value) => value.trim()).filter(Boolean))).sort();
    const allowedPurposes = Array.from(new Set((relationship.allowed_purposes ?? []).map((value) => value.trim()).filter(Boolean)));
    if (allowedPurposes.length > 0 && purposeNames.some((purposeName) => !allowedPurposes.includes(purposeName))) {
      throw new Error('Delegated consent purposes must stay within the relationship purpose allowance');
    }

    if (input.expires_at) {
      const expiresAt = Date.parse(input.expires_at);
      if (Number.isNaN(expiresAt)) {
        throw new Error('Delegated consent expires_at must be a valid date-time');
      }
      if (expiresAt <= Date.now()) {
        throw new Error('Delegated consent expires_at must be in the future');
      }
    }

    const record: IamDelegatedConsentRecord = {
      id: nextUniqueId(
        `delegated-consent-${relationship.relationship_kind}-${relationship.delegate_user_id}-${scopeNames.join('-')}`,
        new Set(state.delegated_consents.map((consent) => consent.id)),
        'delegated-consent',
      ),
      realm_id: input.realm_id,
      relationship_id: relationship.id,
      principal_user_id: relationship.principal_user_id,
      delegate_user_id: relationship.delegate_user_id,
      status: 'ACTIVE',
      scope_names: scopeNames,
      purpose_names: purposeNames,
      granted_at: nowIso(),
      expires_at: input.expires_at?.trim() || null,
      revoked_at: null,
      granted_by_user_id: actorUserId,
      revoked_by_user_id: null,
      notes: Array.from(new Set((input.notes ?? []).map((value) => value.trim()).filter(Boolean))),
      synthetic: false,
    };
    state.delegated_consents.push(record);
    persistStateSyncOnly();
    return clone(record);
  },

  async createDelegatedConsentAsync(
    actorUserId: string,
    input: CreateIamDelegatedConsentRequest,
  ): Promise<IamDelegatedConsentRecord> {
    return runWithDeferredPersistence(() => this.createDelegatedConsent(actorUserId, input));
  },

  createDelegatedConsentRequest(actorUserId: string, input: CreateIamDelegatedConsentRequestRequest): IamDelegatedConsentRequestRecord {
    const relationship = assertDelegatedRelationshipExists(input.relationship_id);
    if (relationship.realm_id !== input.realm_id) {
      throw new Error(`Delegated relationship ${relationship.id} does not belong to realm ${input.realm_id}`);
    }
    if (actorUserId !== relationship.delegate_user_id) {
      throw new Error('Only the delegated relationship delegate can create delegated consent requests');
    }
    validateUserIdsForRealm(input.realm_id, [relationship.principal_user_id, relationship.delegate_user_id]);

    const requestedScopeNames = Array.from(new Set((input.requested_scope_names ?? []).map((value) => value.trim()).filter(Boolean))).sort();
    if (requestedScopeNames.length === 0) {
      throw new Error('Delegated consent request requires at least one scope');
    }
    const invalidScopeNames = requestedScopeNames.filter((scopeName) => !relationship.allowed_scopes.includes(scopeName));
    if (invalidScopeNames.length > 0) {
      throw new Error(`Delegated consent request scopes are outside the relationship allowance: ${invalidScopeNames.join(', ')}`);
    }

    const requestedPurposeNames = Array.from(new Set((input.requested_purpose_names ?? []).map((value) => value.trim()).filter(Boolean))).sort();
    const allowedPurposes = Array.from(new Set((relationship.allowed_purposes ?? []).map((value) => value.trim()).filter(Boolean)));
    if (allowedPurposes.length > 0 && requestedPurposeNames.some((purposeName) => !allowedPurposes.includes(purposeName))) {
      throw new Error('Delegated consent request purposes must stay within the relationship purpose allowance');
    }

    if (input.expires_at) {
      const expiresAt = Date.parse(input.expires_at);
      if (Number.isNaN(expiresAt)) {
        throw new Error('Delegated consent request expires_at must be a valid date-time');
      }
      if (expiresAt <= Date.now()) {
        throw new Error('Delegated consent request expires_at must be in the future');
      }
    }

    const duplicatePending = listDelegatedConsentRequests({
      realm_id: input.realm_id,
      relationship_id: relationship.id,
      requested_by_user_id: actorUserId,
      status: 'PENDING',
    }).find((candidate) =>
      JSON.stringify(candidate.requested_scope_names) === JSON.stringify(requestedScopeNames)
      && JSON.stringify(candidate.requested_purpose_names) === JSON.stringify(requestedPurposeNames),
    );
    if (duplicatePending) {
      throw new Error(`Matching delegated consent request ${duplicatePending.id} is already pending`);
    }

    const record: IamDelegatedConsentRequestRecord = {
      id: nextUniqueId(
        `delegated-consent-request-${relationship.relationship_kind}-${relationship.delegate_user_id}-${requestedScopeNames.join('-')}`,
        new Set(state.delegated_consent_requests.map((request) => request.id)),
        'delegated-consent-request',
      ),
      realm_id: input.realm_id,
      relationship_id: relationship.id,
      principal_user_id: relationship.principal_user_id,
      delegate_user_id: relationship.delegate_user_id,
      requested_by_user_id: actorUserId,
      status: 'PENDING',
      requested_scope_names: requestedScopeNames,
      requested_purpose_names: requestedPurposeNames,
      requested_at: nowIso(),
      expires_at: input.expires_at?.trim() || null,
      responded_at: null,
      decided_by_user_id: null,
      delegated_consent_id: null,
      request_notes: Array.from(new Set((input.request_notes ?? []).map((value) => value.trim()).filter(Boolean))),
      decision_notes: [],
      synthetic: false,
    };
    state.delegated_consent_requests.push(record);
    persistStateSyncOnly();
    return clone(record);
  },

  async createDelegatedConsentRequestAsync(
    actorUserId: string,
    input: CreateIamDelegatedConsentRequestRequest,
  ): Promise<IamDelegatedConsentRequestRecord> {
    return runWithDeferredPersistence(() => this.createDelegatedConsentRequest(actorUserId, input));
  },

  updateDelegatedConsent(actorUserId: string, consentId: string, input: UpdateIamDelegatedConsentRequest): IamDelegatedConsentRecord {
    const consent = assertDelegatedConsentExists(consentId);
    const relationship = assertDelegatedRelationshipExists(consent.relationship_id);

    if (input.status === 'REVOKED') {
      consent.status = 'REVOKED';
      consent.revoked_at = nowIso();
      consent.revoked_by_user_id = actorUserId;
    } else if (input.status === 'ACTIVE') {
      if (consent.revoked_at) {
        throw new Error('Revoked delegated consent records cannot be reactivated');
      }
      consent.status = 'ACTIVE';
    }

    if (input.expires_at !== undefined) {
      if (input.expires_at === null || input.expires_at.trim() === '') {
        consent.expires_at = null;
      } else {
        const expiresAt = Date.parse(input.expires_at);
        if (Number.isNaN(expiresAt)) {
          throw new Error('Delegated consent expires_at must be a valid date-time');
        }
        consent.expires_at = input.expires_at;
      }
    }

    if (input.notes !== undefined) {
      consent.notes = Array.from(new Set(input.notes.map((value) => value.trim()).filter(Boolean)));
    }

    if (consent.status === 'ACTIVE' && relationship.status !== 'ACTIVE') {
      throw new Error('Delegated consent cannot remain active when the relationship is not active');
    }

    persistStateSyncOnly();
    return clone(consent);
  },

  async updateDelegatedConsentAsync(
    actorUserId: string,
    consentId: string,
    input: UpdateIamDelegatedConsentRequest,
  ): Promise<IamDelegatedConsentRecord> {
    return runWithDeferredPersistence(() => this.updateDelegatedConsent(actorUserId, consentId, input));
  },

  updateDelegatedConsentRequest(actorUserId: string, requestId: string, input: UpdateIamDelegatedConsentRequestRequest): IamDelegatedConsentRequestRecord {
    refreshDelegatedConsentRequestStatuses();
    const request = assertDelegatedConsentRequestExists(requestId);
    const relationship = assertDelegatedRelationshipExists(request.relationship_id);

    if (request.status !== 'PENDING') {
      throw new Error('Only pending delegated consent requests can be updated');
    }

    if (input.status) {
      request.status = input.status;
      if (input.status !== 'PENDING') {
        request.responded_at = nowIso();
        request.decided_by_user_id = actorUserId;
      }
    }

    if (input.expires_at !== undefined) {
      if (input.expires_at === null || input.expires_at.trim() === '') {
        request.expires_at = null;
      } else {
        const expiresAt = Date.parse(input.expires_at);
        if (Number.isNaN(expiresAt)) {
          throw new Error('Delegated consent request expires_at must be a valid date-time');
        }
        request.expires_at = input.expires_at;
      }
    }

    if (input.decision_notes !== undefined) {
      request.decision_notes = Array.from(new Set(input.decision_notes.map((value) => value.trim()).filter(Boolean)));
    }

    if (input.delegated_consent_id !== undefined) {
      request.delegated_consent_id = input.delegated_consent_id;
    }

    if (request.status === 'APPROVED' && !request.delegated_consent_id) {
      throw new Error('Approved delegated consent requests must reference the granted delegated consent record');
    }

    if (request.status === 'PENDING' && relationship.status !== 'ACTIVE') {
      throw new Error('Delegated consent request cannot remain pending when the relationship is not active');
    }

    persistStateSyncOnly();
    return clone(request);
  },

  async updateDelegatedConsentRequestAsync(
    actorUserId: string,
    requestId: string,
    input: UpdateIamDelegatedConsentRequestRequest,
  ): Promise<IamDelegatedConsentRequestRecord> {
    return runWithDeferredPersistence(() => this.updateDelegatedConsentRequest(actorUserId, requestId, input));
  },

  listPortableIdentities(filters?: {
    realm_id?: string | null;
  }): IamPortableIdentitiesResponse {
    const portableIdentities = listPortableIdentities(filters?.realm_id ?? null);

    return {
      generated_at: nowIso(),
      portable_identities: clone(portableIdentities),
      count: portableIdentities.length,
    };
  },

  listRealmBindings(filters?: {
    binding_target_kind?: IamBindingTargetKind | null;
  }): IamRealmBindingsResponse {
    const realmBindings = (
      filters?.binding_target_kind
        ? state.realm_bindings.filter((binding) => binding.binding_target_kind === filters.binding_target_kind)
        : state.realm_bindings
    ).map((binding) => projectRealmBindingWithResolvedRealm(binding));

    return {
      generated_at: nowIso(),
      realm_bindings: clone(realmBindings),
      count: realmBindings.length,
    };
  },

  getRealmBinding(bindingId: string): IamRealmBindingRecord {
    const binding = state.realm_bindings.find((candidate) => candidate.id === bindingId);
    if (!binding) {
      throw new Error(`Unknown IAM realm binding: ${bindingId}`);
    }

    return clone(projectRealmBindingWithResolvedRealm(binding));
  },

  getApplicationBindingByRealmClient(realmId: string, clientId: string): IamRealmBindingRecord {
    const normalizedRealmId = normalizeOptionalText(realmId);
    const normalizedClientId = normalizeOptionalText(clientId);
    if (!normalizedRealmId || !normalizedClientId) {
      throw new Error('realm_id and client_id are required to resolve an application binding');
    }

    const matches = state.realm_bindings
      .filter((candidate) =>
        candidate.binding_target_kind === 'APPLICATION' &&
        candidate.realm_id === normalizedRealmId &&
        (
          candidate.auth_binding?.client_id === normalizedClientId ||
          candidate.binding_target_id === normalizedClientId
        ),
      )
      .map((binding) => projectRealmBindingWithResolvedRealm(binding));

    if (matches.length === 0) {
      throw new Error(`No IAM application binding matches realm ${normalizedRealmId} and client ${normalizedClientId}`);
    }
    if (matches.length > 1) {
      throw new Error(`Multiple IAM application bindings match realm ${normalizedRealmId} and client ${normalizedClientId}`);
    }

    return clone(matches[0]);
  },

  getConsumerContract(bindingId: string): IamConsumerContractResponse {
    const binding = this.getRealmBinding(bindingId);
    return {
      generated_at: nowIso(),
      binding_id: binding.id,
      binding_target_kind: binding.binding_target_kind,
      binding_target_id: binding.binding_target_id,
      binding_target_name: binding.binding_target_name,
      consumer_contract: binding.consumer_contract ? clone(binding.consumer_contract) : null,
    };
  },

  updateRealmBinding(actorUserId: string, bindingId: string, input: UpdateIamRealmBindingRequest): IamRealmBindingRecord {
    const binding = state.realm_bindings.find((candidate) => candidate.id === bindingId);
    if (!binding) {
      throw new Error(`Unknown IAM realm binding: ${bindingId}`);
    }

    const updatedAt = nowIso();
    const nextBindingMode = input.binding_mode ?? binding.binding_mode;
    const overrideReasonProvided = Object.prototype.hasOwnProperty.call(input, 'override_reason');
    const overridePurposeProvided = Object.prototype.hasOwnProperty.call(input, 'override_purpose');
    let overrideReason = overrideReasonProvided ? normalizeOptionalText(input.override_reason) : binding.override_reason;
    let overridePurpose = overridePurposeProvided ? normalizeOptionalText(input.override_purpose) : binding.override_purpose;

    if (binding.binding_target_kind === 'TENANT_SPACE') {
      const targetTenantId = normalizeOptionalText(binding.binding_target_tenant_id);
      if (!targetTenantId) {
        throw new Error(`Tenant-space binding ${binding.id} is missing binding_target_tenant_id and cannot resolve tenant primary realm.`);
      }

      if (nextBindingMode === 'DIRECT') {
        throw new Error('Tenant-space bindings do not support binding_mode="DIRECT". Use DEFAULT or OVERRIDE.');
      }

      if (nextBindingMode === 'OVERRIDE') {
        const overrideRealmId = normalizeOptionalText(input.realm_id) ?? binding.realm_id;
        if (!overrideRealmId) {
          throw new Error('Tenant-space override bindings require realm_id.');
        }
        if (!overrideReason || !overridePurpose) {
          throw new Error('Tenant-space override bindings require explicit override_reason and override_purpose.');
        }

        const overrideRealm = assertRealmExists(overrideRealmId);
        binding.binding_mode = 'OVERRIDE';
        binding.realm_id = overrideRealm.id;
        binding.realm_name = overrideRealm.name;
        binding.source_realm_id = overrideRealm.source_realm_id;
        binding.override_reason = overrideReason;
        binding.override_purpose = overridePurpose;
        binding.override_approved_by_user_id = actorUserId;
        binding.override_approved_at = updatedAt;
      } else {
        const primaryRealm = resolvePrimaryRealmForTenant(targetTenantId);
        if (!primaryRealm) {
          throw new Error(`Tenant ${targetTenantId} does not have a primary realm. Configure a PRIMARY realm before assigning DEFAULT tenant-space bindings.`);
        }
        binding.binding_mode = 'DEFAULT';
        binding.realm_id = primaryRealm.id;
        binding.realm_name = primaryRealm.name;
        binding.source_realm_id = primaryRealm.source_realm_id;
        binding.override_reason = null;
        binding.override_purpose = null;
        binding.override_approved_by_user_id = null;
        binding.override_approved_at = null;
      }
    } else {
      if (input.realm_id !== undefined) {
        const realmId = normalizeOptionalText(input.realm_id);
        if (!realmId) {
          throw new Error('realm_id is required when updating an application binding realm.');
        }
        const realm = assertRealmExists(realmId);
        binding.realm_id = realm.id;
        binding.realm_name = realm.name;
        binding.source_realm_id = realm.source_realm_id;
      }

      binding.binding_mode = nextBindingMode;

      if (binding.binding_mode === 'OVERRIDE') {
        if (overrideReasonProvided) {
          binding.override_reason = overrideReason;
        }
        if (overridePurposeProvided) {
          binding.override_purpose = overridePurpose;
        }
        if (overrideReasonProvided || overridePurposeProvided) {
          binding.override_approved_by_user_id = actorUserId;
          binding.override_approved_at = updatedAt;
        }
      } else {
        overrideReason = null;
        overridePurpose = null;
        binding.override_reason = null;
        binding.override_purpose = null;
        binding.override_approved_by_user_id = null;
        binding.override_approved_at = null;
      }
    }

    if (input.notes) {
      binding.notes = input.notes.map((note) => note.trim()).filter(Boolean);
    }

    if (Object.prototype.hasOwnProperty.call(input, 'consumer_contract')) {
      binding.consumer_contract = normalizeConsumerContractDescriptor(input.consumer_contract);
    }

    if (Object.prototype.hasOwnProperty.call(input, 'auth_binding')) {
      binding.auth_binding = normalizeApplicationAuthBindingDescriptor(input.auth_binding);
    }

    if (Object.prototype.hasOwnProperty.call(input, 'projection_policy')) {
      binding.projection_policy = normalizeProjectionPolicyDescriptor(input.projection_policy);
    }

    binding.updated_at = updatedAt;
    binding.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return clone(projectRealmBindingWithResolvedRealm(binding));
  },

  async updateRealmBindingAsync(
    actorUserId: string,
    bindingId: string,
    input: UpdateIamRealmBindingRequest,
  ): Promise<IamRealmBindingRecord> {
    return runWithDeferredPersistence(() => this.updateRealmBinding(actorUserId, bindingId, input));
  },

  listValidationDomains(): IamValidationDomainsResponse {
    return {
      generated_at: nowIso(),
      validation_domains: clone(state.validation_domains),
      count: state.validation_domains.length,
    };
  },

  listUsers(filters?: {
    realm_id?: string | null;
    search?: string | null;
  }, pagination?: IamListPagination): IamUsersResponse {
    let users = [...state.users];

    if (filters?.realm_id) {
      users = users.filter((user) => user.realm_id === filters.realm_id);
    }

    if (filters?.search) {
      const normalized = filters.search.trim().toLowerCase();
      users = users.filter((user) =>
        [user.username, user.email, user.first_name, user.last_name].some((value) => value.toLowerCase().includes(normalized))
      );
    }

    const pagedUsers = paginateList(users, pagination);
    return {
      generated_at: nowIso(),
      users: clone(pagedUsers.data),
      count: pagedUsers.count,
      offset: pagedUsers.offset,
      limit: pagedUsers.limit,
      has_more: pagedUsers.has_more,
    };
  },

  getUserById(userId: string): IamUserRecord {
    return clone(assertUserExists(userId));
  },

  getGroupById(groupId: string): IamGroupRecord {
    return clone(assertGroupExists(groupId));
  },

  getRoleById(roleId: string): IamRoleRecord {
    return clone(assertRoleExists(roleId));
  },

  createUser(actorUserId: string, input: CreateIamUserRequest): IamUserRecord {
    assertRealmExists(input.realm_id);
    const username = input.username?.trim();
    const email = input.email?.trim();
    const firstName = input.first_name?.trim();
    const lastName = input.last_name?.trim();

    if (!username || !email || !firstName || !lastName) {
      throw new Error('Missing required user fields');
    }

    ensureRealmUniqueUsername(input.realm_id, username);
    ensureRealmUniqueEmail(input.realm_id, email);
    validateRoleIdsForRealm(input.realm_id, input.role_ids ?? []);
    validateGroupIdsForRealm(input.realm_id, input.group_ids ?? []);

    const createdAt = nowIso();
    const userId = nextUniqueId(username, new Set(state.users.map((user) => user.id)), 'iam-user');
    const record: IamUserRecord = {
      id: userId,
      realm_id: input.realm_id,
      username,
      email,
      first_name: firstName,
      last_name: lastName,
      status: input.status ?? 'STAGED',
      synthetic: false,
      privacy_classification: input.privacy_classification ?? null,
      home_organization_name: input.home_organization_name?.trim() || null,
      external_subject_id: input.external_subject_id?.trim() || null,
      required_actions: Array.from(new Set((input.required_actions ?? []).map((action) => action.trim()).filter(Boolean))),
      role_ids: Array.from(new Set(input.role_ids ?? [])),
      group_ids: Array.from(new Set(input.group_ids ?? [])),
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    };

    state.users.push(record);
    state.groups
      .filter((group) => record.group_ids.includes(group.id))
      .forEach((group) => {
        if (!group.member_user_ids.includes(record.id)) {
          group.member_user_ids.push(record.id);
          group.updated_at = createdAt;
          group.updated_by_user_id = actorUserId;
        }
      });

    persistStateSyncOnly();
    return clone(record);
  },

  async createUserAsync(actorUserId: string, input: CreateIamUserRequest): Promise<IamUserRecord> {
    return runWithDeferredPersistence(() => this.createUser(actorUserId, input));
  },

  updateUser(actorUserId: string, userId: string, input: UpdateIamUserRequest): IamUserRecord {
    const user = assertUserExists(userId);

    if (input.username !== undefined) {
      const nextUsername = input.username.trim();
      if (!nextUsername) {
        throw new Error('Username cannot be empty');
      }
      ensureRealmUniqueUsername(user.realm_id, nextUsername, user.id);
      user.username = nextUsername;
    }

    if (input.email !== undefined) {
      const nextEmail = input.email.trim();
      if (!nextEmail) {
        throw new Error('User email cannot be empty');
      }
      ensureRealmUniqueEmail(user.realm_id, nextEmail, user.id);
      user.email = nextEmail;
    }

    if (input.first_name !== undefined) {
      user.first_name = input.first_name.trim();
    }

    if (input.last_name !== undefined) {
      user.last_name = input.last_name.trim();
    }

    if (input.status) {
      user.status = input.status;
    }

    if (input.privacy_classification !== undefined) {
      user.privacy_classification = input.privacy_classification;
    }

    if (input.home_organization_name !== undefined) {
      user.home_organization_name = input.home_organization_name?.trim() || null;
    }

    if (input.external_subject_id !== undefined) {
      user.external_subject_id = input.external_subject_id?.trim() || null;
    }

    if (input.required_actions) {
      user.required_actions = Array.from(new Set(input.required_actions.map((action) => action.trim()).filter(Boolean)));
    }

    if (input.role_ids) {
      validateRoleIdsForRealm(user.realm_id, input.role_ids);
      user.role_ids = Array.from(new Set(input.role_ids));
    }

    if (input.group_ids) {
      validateGroupIdsForRealm(user.realm_id, input.group_ids);
      const nextGroupIds = Array.from(new Set(input.group_ids));
      state.groups
        .filter((group) => group.realm_id === user.realm_id)
        .forEach((group) => {
          const shouldContain = nextGroupIds.includes(group.id);
          const contains = group.member_user_ids.includes(user.id);
          if (shouldContain && !contains) {
            group.member_user_ids.push(user.id);
            group.updated_at = nowIso();
            group.updated_by_user_id = actorUserId;
          }
          if (!shouldContain && contains) {
            group.member_user_ids = group.member_user_ids.filter((candidate) => candidate !== user.id);
            group.updated_at = nowIso();
            group.updated_by_user_id = actorUserId;
          }
        });
      user.group_ids = nextGroupIds;
    } else {
      synchronizeMembershipsForUser(user.id);
    }

    user.updated_at = nowIso();
    user.updated_by_user_id = actorUserId;

    persistStateSyncOnly();
    return clone(user);
  },

  async updateUserAsync(actorUserId: string, userId: string, input: UpdateIamUserRequest): Promise<IamUserRecord> {
    return runWithDeferredPersistence(() => this.updateUser(actorUserId, userId, input));
  },

  listGroups(filters?: {
    realm_id?: string | null;
  }, pagination?: IamListPagination): IamGroupsResponse {
    let groups = [...state.groups];
    if (filters?.realm_id) {
      groups = groups.filter((group) => group.realm_id === filters.realm_id);
    }

    const pagedGroups = paginateList(groups, pagination);
    return {
      generated_at: nowIso(),
      groups: clone(pagedGroups.data),
      count: pagedGroups.count,
      offset: pagedGroups.offset,
      limit: pagedGroups.limit,
      has_more: pagedGroups.has_more,
    };
  },

  createGroup(actorUserId: string, input: CreateIamGroupRequest): IamGroupRecord {
    assertRealmExists(input.realm_id);
    const name = input.name?.trim();
    if (!name) {
      throw new Error('Missing required field: name');
    }

    ensureRealmUniqueGroupName(input.realm_id, name);
    validateRoleIdsForRealm(input.realm_id, input.role_ids ?? []);
    validateUserIdsForRealm(input.realm_id, input.member_user_ids ?? []);

    if (input.parent_group_id) {
      const parent = assertGroupExists(input.parent_group_id);
      if (parent.realm_id !== input.realm_id) {
        throw new Error('Parent group must be in the same realm');
      }
    }

    const createdAt = nowIso();
    const groupId = nextUniqueId(name, new Set(state.groups.map((group) => group.id)), 'iam-group');
    const record: IamGroupRecord = {
      id: groupId,
      realm_id: input.realm_id,
      name,
      summary: input.summary?.trim() || '',
      status: input.status ?? 'ACTIVE',
      synthetic: false,
      parent_group_id: input.parent_group_id?.trim() || null,
      role_ids: Array.from(new Set(input.role_ids ?? [])),
      member_user_ids: Array.from(new Set(input.member_user_ids ?? [])),
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    };

    state.groups.push(record);
    state.users
      .filter((user) => record.member_user_ids.includes(user.id))
      .forEach((user) => {
        if (!user.group_ids.includes(record.id)) {
          user.group_ids.push(record.id);
          user.updated_at = createdAt;
          user.updated_by_user_id = actorUserId;
        }
      });

    persistStateSyncOnly();
    return clone(record);
  },

  async createGroupAsync(actorUserId: string, input: CreateIamGroupRequest): Promise<IamGroupRecord> {
    return runWithDeferredPersistence(() => this.createGroup(actorUserId, input));
  },

  updateGroup(actorUserId: string, groupId: string, input: UpdateIamGroupRequest): IamGroupRecord {
    const group = assertGroupExists(groupId);

    if (input.name !== undefined) {
      const nextName = input.name.trim();
      if (!nextName) {
        throw new Error('Group name cannot be empty');
      }
      ensureRealmUniqueGroupName(group.realm_id, nextName, group.id);
      group.name = nextName;
    }

    if (input.summary !== undefined) {
      group.summary = input.summary.trim();
    }

    if (input.status) {
      group.status = input.status;
    }

    if (input.parent_group_id !== undefined) {
      if (input.parent_group_id) {
        const parent = assertGroupExists(input.parent_group_id);
        if (parent.realm_id !== group.realm_id || parent.id === group.id) {
          throw new Error('Invalid parent group');
        }
      }
      group.parent_group_id = input.parent_group_id?.trim() || null;
    }

    if (input.role_ids) {
      validateRoleIdsForRealm(group.realm_id, input.role_ids);
      group.role_ids = Array.from(new Set(input.role_ids));
    }

    if (input.member_user_ids) {
      validateUserIdsForRealm(group.realm_id, input.member_user_ids);
      const nextMemberIds = Array.from(new Set(input.member_user_ids));
      state.users
        .filter((user) => user.realm_id === group.realm_id)
        .forEach((user) => {
          const shouldContain = nextMemberIds.includes(user.id);
          const contains = user.group_ids.includes(group.id);
          if (shouldContain && !contains) {
            user.group_ids.push(group.id);
            user.updated_at = nowIso();
            user.updated_by_user_id = actorUserId;
          }
          if (!shouldContain && contains) {
            user.group_ids = user.group_ids.filter((candidate) => candidate !== group.id);
            user.updated_at = nowIso();
            user.updated_by_user_id = actorUserId;
          }
        });
      group.member_user_ids = nextMemberIds;
    }

    group.updated_at = nowIso();
    group.updated_by_user_id = actorUserId;

    persistStateSyncOnly();
    return clone(group);
  },

  async updateGroupAsync(actorUserId: string, groupId: string, input: UpdateIamGroupRequest): Promise<IamGroupRecord> {
    return runWithDeferredPersistence(() => this.updateGroup(actorUserId, groupId, input));
  },

  listRoles(filters?: {
    realm_id?: string | null;
    kind?: IamRoleKind | null;
  }, pagination?: IamListPagination): IamRolesResponse {
    let roles = [...state.roles];
    if (filters?.realm_id) {
      roles = roles.filter((role) => role.realm_id === filters.realm_id);
    }
    if (filters?.kind) {
      roles = roles.filter((role) => role.kind === filters.kind);
    }

    const pagedRoles = paginateList(roles, pagination);
    return {
      generated_at: nowIso(),
      roles: clone(pagedRoles.data),
      count: pagedRoles.count,
      offset: pagedRoles.offset,
      limit: pagedRoles.limit,
      has_more: pagedRoles.has_more,
    };
  },

  createRole(actorUserId: string, input: CreateIamRoleRequest): IamRoleRecord {
    assertRealmExists(input.realm_id);
    const name = input.name?.trim();
    if (!name) {
      throw new Error('Missing required field: name');
    }

    const kind = input.kind ?? 'REALM_ROLE';
    ensureRealmUniqueRoleName(input.realm_id, name, kind, input.client_id ?? null);
    validateRoleIdsForRealm(input.realm_id, input.composite_role_ids ?? []);

    const createdAt = nowIso();
    const roleId = nextUniqueId(`${input.realm_id}-${name}`, new Set(state.roles.map((role) => role.id)), 'iam-role');
    const record: IamRoleRecord = {
      id: roleId,
      realm_id: input.realm_id,
      name,
      summary: input.summary?.trim() || '',
      kind,
      status: input.status ?? 'ACTIVE',
      synthetic: false,
      client_id: kind === 'CLIENT_ROLE' ? (input.client_id?.trim() || null) : null,
      composite_role_ids: kind === 'COMPOSITE_ROLE' ? Array.from(new Set(input.composite_role_ids ?? [])) : [],
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    };

    if (record.kind === 'CLIENT_ROLE' && !record.client_id) {
      throw new Error('Client roles require client_id');
    }

    state.roles.push(record);
    persistStateSyncOnly();
    return clone(record);
  },

  async createRoleAsync(actorUserId: string, input: CreateIamRoleRequest): Promise<IamRoleRecord> {
    return runWithDeferredPersistence(() => this.createRole(actorUserId, input));
  },

  updateRole(actorUserId: string, roleId: string, input: UpdateIamRoleRequest): IamRoleRecord {
    const role = assertRoleExists(roleId);

    if (input.name !== undefined) {
      const nextName = input.name.trim();
      if (!nextName) {
        throw new Error('Role name cannot be empty');
      }
      ensureRealmUniqueRoleName(role.realm_id, nextName, role.kind, input.client_id ?? role.client_id, role.id);
      role.name = nextName;
    }

    if (input.summary !== undefined) {
      role.summary = input.summary.trim();
    }

    if (input.status) {
      role.status = input.status;
    }

    if (role.kind === 'CLIENT_ROLE' && input.client_id !== undefined) {
      const nextClientId = input.client_id?.trim() || null;
      if (!nextClientId) {
        throw new Error('Client roles require client_id');
      }
      role.client_id = nextClientId;
    }

    if (role.kind === 'COMPOSITE_ROLE' && input.composite_role_ids) {
      validateRoleIdsForRealm(role.realm_id, input.composite_role_ids);
      if (input.composite_role_ids.includes(role.id)) {
        throw new Error('Composite role cannot include itself');
      }
      role.composite_role_ids = Array.from(new Set(input.composite_role_ids));
    }

    role.updated_at = nowIso();
    role.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return clone(role);
  },

  async updateRoleAsync(actorUserId: string, roleId: string, input: UpdateIamRoleRequest): Promise<IamRoleRecord> {
    return runWithDeferredPersistence(() => this.updateRole(actorUserId, roleId, input));
  },

  listDelegatedAdmins(filters?: {
    realm_id?: string | null;
  }): IamDelegatedAdminsResponse {
    let delegatedAdmins = [...state.delegated_admins];
    if (filters?.realm_id) {
      delegatedAdmins = delegatedAdmins.filter((assignment) => assignment.realm_id === filters.realm_id);
    }

    return {
      generated_at: nowIso(),
      delegated_admins: clone(delegatedAdmins),
      count: delegatedAdmins.length,
    };
  },

  createDelegatedAdmin(actorUserId: string, input: CreateIamDelegatedAdminRequest): IamDelegatedAdminRecord {
    assertRealmExists(input.realm_id);
    validateRoleIdsForRealm(input.realm_id, input.managed_role_ids ?? []);
    validateGroupIdsForRealm(input.realm_id, input.managed_group_ids ?? []);
    if (input.principal_kind === 'USER') {
      const user = assertUserExists(input.principal_id);
      if (user.realm_id !== input.realm_id) {
        throw new Error('Delegated admin principal user must belong to the selected realm');
      }
    } else {
      const group = assertGroupExists(input.principal_id);
      if (group.realm_id !== input.realm_id) {
        throw new Error('Delegated admin principal group must belong to the selected realm');
      }
    }

    const createdAt = nowIso();
    const assignment: IamDelegatedAdminRecord = {
      id: nextUniqueId(`${input.realm_id}-${input.principal_kind}-${input.principal_id}`, new Set(state.delegated_admins.map((record) => record.id)), 'iam-admin'),
      realm_id: input.realm_id,
      principal_kind: input.principal_kind,
      principal_id: input.principal_id,
      principal_label: input.principal_label.trim(),
      status: input.status ?? 'ACTIVE',
      managed_role_ids: Array.from(new Set(input.managed_role_ids ?? [])),
      managed_group_ids: Array.from(new Set(input.managed_group_ids ?? [])),
      managed_client_ids: Array.from(new Set((input.managed_client_ids ?? []).map((value) => value.trim()).filter(Boolean))),
      notes: Array.from(new Set((input.notes ?? []).map((note) => note.trim()).filter(Boolean))),
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    };

    state.delegated_admins.push(assignment);
    persistStateSyncOnly();
    return clone(assignment);
  },

  async createDelegatedAdminAsync(
    actorUserId: string,
    input: CreateIamDelegatedAdminRequest,
  ): Promise<IamDelegatedAdminRecord> {
    return runWithDeferredPersistence(() => this.createDelegatedAdmin(actorUserId, input));
  },

  updateDelegatedAdmin(actorUserId: string, id: string, input: UpdateIamDelegatedAdminRequest): IamDelegatedAdminRecord {
    const assignment = assertDelegatedAdminExists(id);

    if (input.principal_label !== undefined) {
      assignment.principal_label = input.principal_label.trim();
    }

    if (input.managed_role_ids) {
      validateRoleIdsForRealm(assignment.realm_id, input.managed_role_ids);
      assignment.managed_role_ids = Array.from(new Set(input.managed_role_ids));
    }

    if (input.managed_group_ids) {
      validateGroupIdsForRealm(assignment.realm_id, input.managed_group_ids);
      assignment.managed_group_ids = Array.from(new Set(input.managed_group_ids));
    }

    if (input.managed_client_ids) {
      assignment.managed_client_ids = Array.from(new Set(input.managed_client_ids.map((value) => value.trim()).filter(Boolean)));
    }

    if (input.notes) {
      assignment.notes = Array.from(new Set(input.notes.map((note) => note.trim()).filter(Boolean)));
    }

    if (input.status) {
      assignment.status = input.status;
    }

    assignment.updated_at = nowIso();
    assignment.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return clone(assignment);
  },

  async updateDelegatedAdminAsync(
    actorUserId: string,
    id: string,
    input: UpdateIamDelegatedAdminRequest,
  ): Promise<IamDelegatedAdminRecord> {
    return runWithDeferredPersistence(() => this.updateDelegatedAdmin(actorUserId, id, input));
  },

  listRealmExports(filters?: {
    realm_id?: string | null;
  }): IamRealmExportsResponse {
    let realmExports = [...state.realm_exports];
    if (filters?.realm_id) {
      realmExports = realmExports.filter((record) => record.realm_id === filters.realm_id);
    }

    return {
      generated_at: nowIso(),
      realm_exports: clone(realmExports),
      count: realmExports.length,
    };
  },

  exportRealm(actorUserId: string, realmId: string): IamRealmExportRecord {
    const realm = assertRealmExists(realmId);
    const exportRecord: IamRealmExportRecord = {
      id: `realm-export-${randomUUID()}`,
      realm_id: realm.id,
      realm_name: realm.name,
      status: 'READY',
      exported_at: nowIso(),
      created_by_user_id: actorUserId,
      object_key: `iam/realm-exports/${realm.id}/${Date.now()}.json`,
      summary: {
        user_count: listRealmUsers(realm.id).length,
        group_count: listRealmGroups(realm.id).length,
        role_count: listRealmRoles(realm.id).length,
        delegated_admin_count: listRealmDelegatedAdmins(realm.id).length,
      },
    };

    state.realm_exports.unshift(exportRecord);
    persistStateSyncOnly();
    return clone(exportRecord);
  },

  async exportRealmAsync(actorUserId: string, realmId: string): Promise<IamRealmExportRecord> {
    return runWithDeferredPersistence(() => this.exportRealm(actorUserId, realmId));
  },

  runTransientStateMaintenance(): IamFoundationTransientStateMaintenanceResult {
    return runTransientStateMaintenanceSyncOnly();
  },

  async runTransientStateMaintenanceAsync(): Promise<IamFoundationTransientStateMaintenanceResult> {
    return runWithDeferredPersistence(() => this.runTransientStateMaintenance());
  },

  exportState(): Record<string, unknown> {
    refreshDelegatedConsentStatuses();
    refreshDelegatedConsentRequestStatuses();
    return clone(state) as unknown as Record<string, unknown>;
  },

  importState(input: Record<string, unknown>): void {
    const nextState = normalizeState(input as Partial<IamFoundationState>);
    state.realms = nextState.realms;
    state.realm_templates = nextState.realm_templates;
    state.realm_posture_presets = nextState.realm_posture_presets;
    state.identity_privacy_policies = nextState.identity_privacy_policies;
    state.delegated_relationships = nextState.delegated_relationships;
    state.delegated_consents = nextState.delegated_consents;
    state.delegated_consent_requests = nextState.delegated_consent_requests;
    state.portable_identities = nextState.portable_identities;
    state.realm_bindings = nextState.realm_bindings;
    state.validation_domains = nextState.validation_domains;
    state.users = nextState.users;
    state.groups = nextState.groups;
    state.roles = nextState.roles;
    state.delegated_admins = nextState.delegated_admins;
    state.realm_exports = nextState.realm_exports;
    persistStateSyncOnly();
    refreshDelegatedConsentStatuses();
    refreshDelegatedConsentRequestStatuses();
  },
};
