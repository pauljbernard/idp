import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { loadOrCreatePersistedState, reloadOrCreatePersistedStateAsync, savePersistedState, savePersistedStateAsync } from './persistence';
import { LocalIamFoundationStore, type IamRealmRecord } from './iamFoundation';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

function nextId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

function uniqueStrings(values: string[] | undefined): string[] {
  return Array.from(new Set((values ?? []).map((value) => value.trim()).filter(Boolean)));
}

const IAM_EXTENSION_REGISTRY_FILE = 'iam-extension-registry-state.json';
const deferredPersistenceContext = new AsyncLocalStorage<{ dirty: boolean }>();

export type IamExtensionPhase = 'FULL_IDP_PHASE_I';
export type IamExtensionStatus = 'EXTENSIBILITY_AND_PROVIDER_FRAMEWORK_IMPLEMENTED';
export type IamExtensionNextPhase = 'FULL_IDP_PHASE_J_PRODUCT_NEUTRAL_REFOUNDATION';
export type IamExtensionInterfaceKind =
  | 'AUTHENTICATOR'
  | 'FEDERATION'
  | 'STORAGE'
  | 'POLICY'
  | 'EVENT_LISTENER'
  | 'THEME_PACKAGE';
export type IamExtensionPackageStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
export type IamExtensionProviderStatus = 'ACTIVE' | 'DRAFT' | 'DISABLED' | 'ARCHIVED';
export type IamExtensionBindingStatus = 'ACTIVE' | 'DISABLED';
export type IamExtensionSourceType = 'BUILT_IN' | 'VALIDATION_PACKAGE' | 'THIRD_PARTY_PREPARED';
export type IamExtensionDeliveryModel =
  | 'INLINE_RUNTIME'
  | 'AWS_LAMBDA'
  | 'EVENTBRIDGE_CONSUMER'
  | 'S3_THEME_PACKAGE'
  | 'DYNAMODB_STORAGE_ADAPTER';
export type IamProviderImplementationMode = 'BUILT_IN' | 'MANIFEST_BOUND';

type PrimitiveBindingValue = string | number | boolean;

export interface IamProviderInterfaceRecord {
  id: string;
  kind: IamExtensionInterfaceKind;
  name: string;
  summary: string;
  contract_version: string;
  binding_slots: string[];
  configuration_fields: string[];
  runtime_expectations: string[];
}

export interface IamExtensionPackageRecord {
  id: string;
  key: string;
  name: string;
  summary: string;
  publisher: string;
  version: string;
  source_type: IamExtensionSourceType;
  delivery_model: IamExtensionDeliveryModel;
  status: IamExtensionPackageStatus;
  interface_kinds: IamExtensionInterfaceKind[];
  provider_ids: string[];
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamExtensionProviderRecord {
  id: string;
  extension_id: string;
  key: string;
  name: string;
  summary: string;
  interface_kind: IamExtensionInterfaceKind;
  status: IamExtensionProviderStatus;
  implementation_mode: IamProviderImplementationMode;
  runtime_reference: string;
  supported_protocols: Array<'OIDC' | 'OAUTH2' | 'SAML'>;
  binding_slots: string[];
  configuration_fields: string[];
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamExtensionBindingRecord {
  id: string;
  realm_id: string;
  provider_id: string;
  interface_kind: IamExtensionInterfaceKind;
  binding_slot: string;
  priority: number;
  status: IamExtensionBindingStatus;
  configuration: Record<string, PrimitiveBindingValue>;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

interface IamExtensionRegistryState {
  version: number;
  extensions: IamExtensionPackageRecord[];
  providers: IamExtensionProviderRecord[];
  bindings: IamExtensionBindingRecord[];
}

export interface IamExtensionRegistrySummaryResponse {
  generated_at: string;
  phase: IamExtensionPhase;
  subsystem_status: IamExtensionStatus;
  extension_interface_count: number;
  extension_package_count: number;
  extension_provider_count: number;
  active_extension_provider_count: number;
  extension_binding_count: number;
  active_extension_binding_count: number;
  theme_package_provider_count: number;
  next_recommended_phase: IamExtensionNextPhase;
}

export interface IamProviderInterfacesResponse {
  generated_at: string;
  interfaces: IamProviderInterfaceRecord[];
  count: number;
}

export interface IamExtensionPackagesResponse {
  generated_at: string;
  extensions: IamExtensionPackageRecord[];
  count: number;
}

export interface IamExtensionProvidersResponse {
  generated_at: string;
  providers: IamExtensionProviderRecord[];
  count: number;
}

export interface IamExtensionBindingsResponse {
  generated_at: string;
  bindings: IamExtensionBindingRecord[];
  count: number;
}

export interface CreateIamExtensionPackageRequest {
  key: string;
  name: string;
  summary: string;
  publisher?: string;
  version?: string;
  source_type?: IamExtensionSourceType;
  delivery_model?: IamExtensionDeliveryModel;
  status?: IamExtensionPackageStatus;
  interface_kinds?: IamExtensionInterfaceKind[];
}

export interface UpdateIamExtensionPackageRequest {
  name?: string;
  summary?: string;
  publisher?: string;
  version?: string;
  source_type?: IamExtensionSourceType;
  delivery_model?: IamExtensionDeliveryModel;
  status?: IamExtensionPackageStatus;
  interface_kinds?: IamExtensionInterfaceKind[];
}

export interface CreateIamExtensionProviderRequest {
  extension_id: string;
  key: string;
  name: string;
  summary: string;
  interface_kind: IamExtensionInterfaceKind;
  status?: IamExtensionProviderStatus;
  implementation_mode?: IamProviderImplementationMode;
  runtime_reference?: string;
  supported_protocols?: Array<'OIDC' | 'OAUTH2' | 'SAML'>;
  binding_slots?: string[];
  configuration_fields?: string[];
}

export interface UpdateIamExtensionProviderRequest {
  name?: string;
  summary?: string;
  status?: IamExtensionProviderStatus;
  implementation_mode?: IamProviderImplementationMode;
  runtime_reference?: string;
  supported_protocols?: Array<'OIDC' | 'OAUTH2' | 'SAML'>;
  binding_slots?: string[];
  configuration_fields?: string[];
}

export interface CreateIamExtensionBindingRequest {
  realm_id: string;
  provider_id: string;
  binding_slot: string;
  priority?: number;
  status?: IamExtensionBindingStatus;
  configuration?: Record<string, PrimitiveBindingValue>;
}

export interface UpdateIamExtensionBindingRequest {
  provider_id?: string;
  binding_slot?: string;
  priority?: number;
  status?: IamExtensionBindingStatus;
  configuration?: Record<string, PrimitiveBindingValue>;
}

const PROVIDER_INTERFACES: IamProviderInterfaceRecord[] = [
  {
    id: 'iam-interface-authenticator',
    kind: 'AUTHENTICATOR',
    name: 'Authenticator Provider',
    summary: 'Contributes login-flow executions such as password forms, TOTP, passkeys, consent gates, and required-action handlers.',
    contract_version: '1.0.0',
    binding_slots: ['browser-primary', 'browser-secondary', 'browser-passwordless', 'browser-consent', 'browser-required-actions'],
    configuration_fields: ['display_name', 'allow_passwordless', 'assurance_level'],
    runtime_expectations: ['Participates in the auth-flow execution graph', 'Emits browser-auth events', 'Can be bound per realm or client flow'],
  },
  {
    id: 'iam-interface-federation',
    kind: 'FEDERATION',
    name: 'Federation Provider',
    summary: 'Contributes identity brokering and external-user federation behaviors for OIDC, SAML, LDAP, SCIM, and directory-style adapters.',
    contract_version: '1.0.0',
    binding_slots: ['oidc-broker', 'saml-broker', 'user-federation-primary', 'user-federation-secondary'],
    configuration_fields: ['provider_alias', 'link_policy', 'import_strategy'],
    runtime_expectations: ['Participates in broker login or federation sync', 'Publishes sync events', 'Can be bound per realm'],
  },
  {
    id: 'iam-interface-storage',
    kind: 'STORAGE',
    name: 'Storage Provider',
    summary: 'Contributes persistence backplanes for identities, realm assets, configuration artifacts, and large theme packages.',
    contract_version: '1.0.0',
    binding_slots: ['identity-store', 'theme-asset-store', 'audit-archive-store'],
    configuration_fields: ['table_name', 'bucket_name', 'kms_key_id'],
    runtime_expectations: ['Backs persisted realm state', 'Supports export and restore participation', 'Declares recovery posture'],
  },
  {
    id: 'iam-interface-policy',
    kind: 'POLICY',
    name: 'Policy Provider',
    summary: 'Contributes evaluators for authorization services, admin policies, and client-governance decisions.',
    contract_version: '1.0.0',
    binding_slots: ['resource-policy-primary', 'resource-policy-secondary', 'client-governance', 'admin-governance'],
    configuration_fields: ['effect', 'conditions', 'claim_mappings'],
    runtime_expectations: ['Evaluates requested resources and scopes', 'Produces policy audit context', 'Can be layered by priority'],
  },
  {
    id: 'iam-interface-event-listener',
    kind: 'EVENT_LISTENER',
    name: 'Event Listener Provider',
    summary: 'Contributes listeners for security audit, admin audit, notifications, and external event fan-out.',
    contract_version: '1.0.0',
    binding_slots: ['security-events', 'admin-events', 'notification-events', 'external-fanout'],
    configuration_fields: ['event_bus_name', 'delivery_channel', 'retention_days'],
    runtime_expectations: ['Subscribes to auth and admin lifecycle events', 'Can operate inline or asynchronously', 'Declares delivery semantics'],
  },
  {
    id: 'iam-interface-theme-package',
    kind: 'THEME_PACKAGE',
    name: 'Theme Package Provider',
    summary: 'Contributes branded login, account, and admin presentation packages with bundled assets and localized strings.',
    contract_version: '1.0.0',
    binding_slots: ['realm-theme'],
    configuration_fields: ['package_key', 'asset_manifest', 'default_locale'],
    runtime_expectations: ['Supplies packaged experience assets', 'Participates in theme preview and delivery', 'Can be rebound per realm'],
  },
];

const BUILTIN_PACKAGES: Array<Omit<IamExtensionPackageRecord, 'created_at' | 'updated_at' | 'created_by_user_id' | 'updated_by_user_id'>> = [
  {
    id: 'iam-extension-core-authenticators',
    key: 'builtin.core.authenticators',
    name: 'Built-in Core Authenticators',
    summary: 'Default browser-login, required-action, MFA, and passkey authenticators for the standalone IAM runtime.',
    publisher: 'Standalone IAM',
    version: '1.0.0',
    source_type: 'BUILT_IN',
    delivery_model: 'INLINE_RUNTIME',
    status: 'ACTIVE',
    interface_kinds: ['AUTHENTICATOR'],
    provider_ids: [
      'iam-provider-auth-password-form',
      'iam-provider-auth-required-actions',
      'iam-provider-auth-consent-screen',
      'iam-provider-auth-totp',
      'iam-provider-auth-passkey-webauthn',
    ],
  },
  {
    id: 'iam-extension-federation-bridges',
    key: 'builtin.federation.bridges',
    name: 'Built-in Federation Bridges',
    summary: 'Default OIDC, SAML, LDAP, and SCIM federation adapters used by the standalone IAM runtime.',
    publisher: 'Standalone IAM',
    version: '1.0.0',
    source_type: 'BUILT_IN',
    delivery_model: 'INLINE_RUNTIME',
    status: 'ACTIVE',
    interface_kinds: ['FEDERATION'],
    provider_ids: [
      'iam-provider-fed-oidc-broker',
      'iam-provider-fed-saml-broker',
      'iam-provider-fed-ldap-directory',
      'iam-provider-fed-scim-directory',
    ],
  },
  {
    id: 'iam-extension-storage-backplane',
    key: 'builtin.storage.backplane',
    name: 'Built-in Storage Backplane',
    summary: 'Default identity, theme-asset, and archive storage adapters used for standalone validation and AWS-native packaging.',
    publisher: 'Standalone IAM',
    version: '1.0.0',
    source_type: 'BUILT_IN',
    delivery_model: 'DYNAMODB_STORAGE_ADAPTER',
    status: 'ACTIVE',
    interface_kinds: ['STORAGE'],
    provider_ids: [
      'iam-provider-storage-identity-dynamodb',
      'iam-provider-storage-theme-s3',
      'iam-provider-storage-audit-archive',
    ],
  },
  {
    id: 'iam-extension-policy-engine',
    key: 'builtin.policy.engine',
    name: 'Built-in Policy Engine',
    summary: 'Default authorization-service, admin-governance, and client-governance evaluators for the standalone IAM subsystem.',
    publisher: 'Standalone IAM',
    version: '1.0.0',
    source_type: 'BUILT_IN',
    delivery_model: 'INLINE_RUNTIME',
    status: 'ACTIVE',
    interface_kinds: ['POLICY'],
    provider_ids: [
      'iam-provider-policy-user-match',
      'iam-provider-policy-role-membership',
      'iam-provider-policy-group-membership',
      'iam-provider-policy-inline-script',
    ],
  },
  {
    id: 'iam-extension-event-listeners',
    key: 'builtin.event.listeners',
    name: 'Built-in Event Listeners',
    summary: 'Default security-audit, admin-audit, notification-delivery, and EventBridge fan-out listeners.',
    publisher: 'Standalone IAM',
    version: '1.0.0',
    source_type: 'BUILT_IN',
    delivery_model: 'EVENTBRIDGE_CONSUMER',
    status: 'ACTIVE',
    interface_kinds: ['EVENT_LISTENER'],
    provider_ids: [
      'iam-provider-event-security-audit',
      'iam-provider-event-admin-audit',
      'iam-provider-event-notification-delivery',
      'iam-provider-event-external-fanout',
    ],
  },
  {
    id: 'iam-extension-theme-packages',
    key: 'builtin.theme.packages',
    name: 'Built-in Theme Packages',
    summary: 'Default branded and neutral theme packages for standalone realm login, account, and admin surfaces.',
    publisher: 'Standalone IAM',
    version: '1.0.0',
    source_type: 'BUILT_IN',
    delivery_model: 'S3_THEME_PACKAGE',
    status: 'ACTIVE',
    interface_kinds: ['THEME_PACKAGE'],
    provider_ids: [
      'iam-provider-theme-platform-default',
      'iam-provider-theme-neutral-enterprise',
    ],
  },
];

const BUILTIN_PROVIDERS: Array<Omit<IamExtensionProviderRecord, 'created_at' | 'updated_at' | 'created_by_user_id' | 'updated_by_user_id'>> = [
  {
    id: 'iam-provider-auth-password-form',
    extension_id: 'iam-extension-core-authenticators',
    key: 'builtin.auth.password_form',
    name: 'Password Form Authenticator',
    summary: 'Primary browser authenticator for username and password credential validation.',
    interface_kind: 'AUTHENTICATOR',
    status: 'ACTIVE',
    implementation_mode: 'BUILT_IN',
    runtime_reference: 'iamAuthenticationRuntime:password-form',
    supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
    binding_slots: ['browser-primary'],
    configuration_fields: ['display_name', 'remember_username'],
  },
  {
    id: 'iam-provider-auth-required-actions',
    extension_id: 'iam-extension-core-authenticators',
    key: 'builtin.auth.required_actions',
    name: 'Required Actions Gate',
    summary: 'Runs profile updates, password rotation, and email verification gates inside the browser login flow.',
    interface_kind: 'AUTHENTICATOR',
    status: 'ACTIVE',
    implementation_mode: 'BUILT_IN',
    runtime_reference: 'iamAuthenticationRuntime:required-actions',
    supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
    binding_slots: ['browser-required-actions'],
    configuration_fields: ['enforced_actions'],
  },
  {
    id: 'iam-provider-auth-consent-screen',
    extension_id: 'iam-extension-core-authenticators',
    key: 'builtin.auth.consent_screen',
    name: 'Consent Screen',
    summary: 'Collects scope consent decisions for browser-login-capable clients.',
    interface_kind: 'AUTHENTICATOR',
    status: 'ACTIVE',
    implementation_mode: 'BUILT_IN',
    runtime_reference: 'iamAuthenticationRuntime:consent',
    supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
    binding_slots: ['browser-consent'],
    configuration_fields: ['display_scope_descriptions'],
  },
  {
    id: 'iam-provider-auth-totp',
    extension_id: 'iam-extension-core-authenticators',
    key: 'builtin.auth.totp',
    name: 'TOTP Second Factor',
    summary: 'Provides TOTP and backup-code second-factor challenge handling.',
    interface_kind: 'AUTHENTICATOR',
    status: 'ACTIVE',
    implementation_mode: 'BUILT_IN',
    runtime_reference: 'iamAuthenticationRuntime:totp',
    supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
    binding_slots: ['browser-secondary'],
    configuration_fields: ['allow_backup_codes'],
  },
  {
    id: 'iam-provider-auth-passkey-webauthn',
    extension_id: 'iam-extension-core-authenticators',
    key: 'builtin.auth.passkey_webauthn',
    name: 'Passkey and WebAuthn',
    summary: 'Provides passkey registration and browser passwordless authentication challenges.',
    interface_kind: 'AUTHENTICATOR',
    status: 'ACTIVE',
    implementation_mode: 'BUILT_IN',
    runtime_reference: 'iamWebAuthn:passkey',
    supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
    binding_slots: ['browser-passwordless', 'browser-secondary'],
    configuration_fields: ['attestation_preference', 'user_verification'],
  },
  {
    id: 'iam-provider-fed-oidc-broker',
    extension_id: 'iam-extension-federation-bridges',
    key: 'builtin.federation.oidc_broker',
    name: 'OIDC Broker',
    summary: 'Handles OIDC identity brokering and broker-first login flows.',
    interface_kind: 'FEDERATION',
    status: 'ACTIVE',
    implementation_mode: 'BUILT_IN',
    runtime_reference: 'iamFederationRuntime:oidc-broker',
    supported_protocols: ['OIDC', 'OAUTH2'],
    binding_slots: ['oidc-broker'],
    configuration_fields: ['provider_alias', 'link_policy'],
  },
  {
    id: 'iam-provider-fed-saml-broker',
    extension_id: 'iam-extension-federation-bridges',
    key: 'builtin.federation.saml_broker',
    name: 'SAML Broker',
    summary: 'Handles SAML identity brokering and linked-identity establishment.',
    interface_kind: 'FEDERATION',
    status: 'ACTIVE',
    implementation_mode: 'BUILT_IN',
    runtime_reference: 'iamFederationRuntime:saml-broker',
    supported_protocols: ['SAML'],
    binding_slots: ['saml-broker'],
    configuration_fields: ['provider_alias', 'link_policy'],
  },
  {
    id: 'iam-provider-fed-ldap-directory',
    extension_id: 'iam-extension-federation-bridges',
    key: 'builtin.federation.ldap_directory',
    name: 'LDAP Directory',
    summary: 'Handles LDAP-style user federation and import workflows.',
    interface_kind: 'FEDERATION',
    status: 'ACTIVE',
    implementation_mode: 'BUILT_IN',
    runtime_reference: 'iamFederationRuntime:ldap',
    supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
    binding_slots: ['user-federation-primary'],
    configuration_fields: ['directory_url', 'bind_dn', 'import_strategy'],
  },
  {
    id: 'iam-provider-fed-scim-directory',
    extension_id: 'iam-extension-federation-bridges',
    key: 'builtin.federation.scim_directory',
    name: 'SCIM Directory',
    summary: 'Handles SCIM-style user federation and sync workflows.',
    interface_kind: 'FEDERATION',
    status: 'ACTIVE',
    implementation_mode: 'BUILT_IN',
    runtime_reference: 'iamFederationRuntime:scim',
    supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
    binding_slots: ['user-federation-secondary'],
    configuration_fields: ['api_base_url', 'import_strategy'],
  },
  {
    id: 'iam-provider-storage-identity-dynamodb',
    extension_id: 'iam-extension-storage-backplane',
    key: 'builtin.storage.identity_dynamodb',
    name: 'Identity Store (DynamoDB Pattern)',
    summary: 'Provides the default standalone realm and identity persistence model aligned to the AWS-native architecture.',
    interface_kind: 'STORAGE',
    status: 'ACTIVE',
    implementation_mode: 'BUILT_IN',
    runtime_reference: 'persistence:dynamodb-pattern',
    supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
    binding_slots: ['identity-store'],
    configuration_fields: ['table_name', 'kms_key_id'],
  },
  {
    id: 'iam-provider-storage-theme-s3',
    extension_id: 'iam-extension-storage-backplane',
    key: 'builtin.storage.theme_s3',
    name: 'Theme Asset Store (S3 Pattern)',
    summary: 'Stores theme-package assets and manifests for realm presentation delivery.',
    interface_kind: 'STORAGE',
    status: 'ACTIVE',
    implementation_mode: 'BUILT_IN',
    runtime_reference: 'persistence:s3-theme-pattern',
    supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
    binding_slots: ['theme-asset-store'],
    configuration_fields: ['bucket_name', 'prefix'],
  },
  {
    id: 'iam-provider-storage-audit-archive',
    extension_id: 'iam-extension-storage-backplane',
    key: 'builtin.storage.audit_archive',
    name: 'Audit Archive Store',
    summary: 'Stores long-horizon audit and event export artifacts.',
    interface_kind: 'STORAGE',
    status: 'ACTIVE',
    implementation_mode: 'BUILT_IN',
    runtime_reference: 'persistence:audit-archive-pattern',
    supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
    binding_slots: ['audit-archive-store'],
    configuration_fields: ['bucket_name', 'retention_days'],
  },
  {
    id: 'iam-provider-policy-user-match',
    extension_id: 'iam-extension-policy-engine',
    key: 'builtin.policy.user_match',
    name: 'User Match Policy',
    summary: 'Evaluates resource and admin permissions against direct-user identity conditions.',
    interface_kind: 'POLICY',
    status: 'ACTIVE',
    implementation_mode: 'BUILT_IN',
    runtime_reference: 'iamAuthorizationServices:user-match',
    supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
    binding_slots: ['resource-policy-primary', 'admin-governance'],
    configuration_fields: ['subject_claim'],
  },
  {
    id: 'iam-provider-policy-role-membership',
    extension_id: 'iam-extension-policy-engine',
    key: 'builtin.policy.role_membership',
    name: 'Role Membership Policy',
    summary: 'Evaluates resource and admin permissions against realm and client-role assignments.',
    interface_kind: 'POLICY',
    status: 'ACTIVE',
    implementation_mode: 'BUILT_IN',
    runtime_reference: 'iamAuthorizationServices:role-membership',
    supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
    binding_slots: ['resource-policy-primary', 'admin-governance'],
    configuration_fields: ['required_roles'],
  },
  {
    id: 'iam-provider-policy-group-membership',
    extension_id: 'iam-extension-policy-engine',
    key: 'builtin.policy.group_membership',
    name: 'Group Membership Policy',
    summary: 'Evaluates permissions using direct or inherited group membership.',
    interface_kind: 'POLICY',
    status: 'ACTIVE',
    implementation_mode: 'BUILT_IN',
    runtime_reference: 'iamAuthorizationServices:group-membership',
    supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
    binding_slots: ['resource-policy-secondary', 'admin-governance'],
    configuration_fields: ['required_groups'],
  },
  {
    id: 'iam-provider-policy-inline-script',
    extension_id: 'iam-extension-policy-engine',
    key: 'builtin.policy.inline_script',
    name: 'Inline Script Policy',
    summary: 'Provides inline expression-style evaluation for advanced authorization-service policy decisions.',
    interface_kind: 'POLICY',
    status: 'ACTIVE',
    implementation_mode: 'BUILT_IN',
    runtime_reference: 'iamAuthorizationServices:inline-script',
    supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
    binding_slots: ['resource-policy-secondary', 'client-governance'],
    configuration_fields: ['expression', 'effect'],
  },
  {
    id: 'iam-provider-event-security-audit',
    extension_id: 'iam-extension-event-listeners',
    key: 'builtin.events.security_audit',
    name: 'Security Audit Listener',
    summary: 'Captures request-level security audit events for standalone validation and later production packaging.',
    interface_kind: 'EVENT_LISTENER',
    status: 'ACTIVE',
    implementation_mode: 'BUILT_IN',
    runtime_reference: 'iamSecurityAudit:security-events',
    supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
    binding_slots: ['security-events'],
    configuration_fields: ['retention_days'],
  },
  {
    id: 'iam-provider-event-admin-audit',
    extension_id: 'iam-extension-event-listeners',
    key: 'builtin.events.admin_audit',
    name: 'Admin Audit Listener',
    summary: 'Captures administrative mutations and governance activity.',
    interface_kind: 'EVENT_LISTENER',
    status: 'ACTIVE',
    implementation_mode: 'BUILT_IN',
    runtime_reference: 'adminAudit:iam-events',
    supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
    binding_slots: ['admin-events'],
    configuration_fields: ['retention_days'],
  },
  {
    id: 'iam-provider-event-notification-delivery',
    extension_id: 'iam-extension-event-listeners',
    key: 'builtin.events.notification_delivery',
    name: 'Notification Delivery Listener',
    summary: 'Captures branded notification deliveries and delivery status changes.',
    interface_kind: 'EVENT_LISTENER',
    status: 'ACTIVE',
    implementation_mode: 'BUILT_IN',
    runtime_reference: 'iamExperienceRuntime:notification-events',
    supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
    binding_slots: ['notification-events'],
    configuration_fields: ['delivery_channel'],
  },
  {
    id: 'iam-provider-event-external-fanout',
    extension_id: 'iam-extension-event-listeners',
    key: 'builtin.events.external_fanout',
    name: 'External Event Fan-out',
    summary: 'Declares the event fan-out contract for later EventBridge or downstream webhook packaging.',
    interface_kind: 'EVENT_LISTENER',
    status: 'ACTIVE',
    implementation_mode: 'MANIFEST_BOUND',
    runtime_reference: 'eventbridge:fanout',
    supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
    binding_slots: ['external-fanout'],
    configuration_fields: ['event_bus_name', 'detail_type_prefix'],
  },
  {
    id: 'iam-provider-theme-platform-default',
    extension_id: 'iam-extension-theme-packages',
    key: 'builtin.theme.platform_default',
    name: 'Platform Default Theme',
    summary: 'Provides the default standalone IAM login, account, and admin experience package.',
    interface_kind: 'THEME_PACKAGE',
    status: 'ACTIVE',
    implementation_mode: 'BUILT_IN',
    runtime_reference: 'iamExperienceRuntime:platform-default',
    supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
    binding_slots: ['realm-theme'],
    configuration_fields: ['brand_name', 'default_locale'],
  },
  {
    id: 'iam-provider-theme-neutral-enterprise',
    extension_id: 'iam-extension-theme-packages',
    key: 'builtin.theme.neutral_enterprise',
    name: 'Neutral Enterprise Theme',
    summary: 'Provides a product-neutral theme package suitable for standalone external deployments.',
    interface_kind: 'THEME_PACKAGE',
    status: 'ACTIVE',
    implementation_mode: 'MANIFEST_BOUND',
    runtime_reference: 'theme-package:neutral-enterprise',
    supported_protocols: ['OIDC', 'OAUTH2', 'SAML'],
    binding_slots: ['realm-theme'],
    configuration_fields: ['brand_name', 'default_locale'],
  },
];

const DEFAULT_BINDINGS: Array<{
  provider_id: string;
  interface_kind: IamExtensionInterfaceKind;
  binding_slot: string;
  priority: number;
}> = [
  { provider_id: 'iam-provider-auth-password-form', interface_kind: 'AUTHENTICATOR', binding_slot: 'browser-primary', priority: 100 },
  { provider_id: 'iam-provider-auth-required-actions', interface_kind: 'AUTHENTICATOR', binding_slot: 'browser-required-actions', priority: 90 },
  { provider_id: 'iam-provider-auth-consent-screen', interface_kind: 'AUTHENTICATOR', binding_slot: 'browser-consent', priority: 80 },
  { provider_id: 'iam-provider-auth-totp', interface_kind: 'AUTHENTICATOR', binding_slot: 'browser-secondary', priority: 70 },
  { provider_id: 'iam-provider-auth-passkey-webauthn', interface_kind: 'AUTHENTICATOR', binding_slot: 'browser-passwordless', priority: 60 },
  { provider_id: 'iam-provider-fed-oidc-broker', interface_kind: 'FEDERATION', binding_slot: 'oidc-broker', priority: 100 },
  { provider_id: 'iam-provider-fed-saml-broker', interface_kind: 'FEDERATION', binding_slot: 'saml-broker', priority: 100 },
  { provider_id: 'iam-provider-fed-ldap-directory', interface_kind: 'FEDERATION', binding_slot: 'user-federation-primary', priority: 90 },
  { provider_id: 'iam-provider-fed-scim-directory', interface_kind: 'FEDERATION', binding_slot: 'user-federation-secondary', priority: 80 },
  { provider_id: 'iam-provider-storage-identity-dynamodb', interface_kind: 'STORAGE', binding_slot: 'identity-store', priority: 100 },
  { provider_id: 'iam-provider-storage-theme-s3', interface_kind: 'STORAGE', binding_slot: 'theme-asset-store', priority: 90 },
  { provider_id: 'iam-provider-storage-audit-archive', interface_kind: 'STORAGE', binding_slot: 'audit-archive-store', priority: 80 },
  { provider_id: 'iam-provider-policy-role-membership', interface_kind: 'POLICY', binding_slot: 'resource-policy-primary', priority: 100 },
  { provider_id: 'iam-provider-policy-group-membership', interface_kind: 'POLICY', binding_slot: 'resource-policy-secondary', priority: 90 },
  { provider_id: 'iam-provider-policy-inline-script', interface_kind: 'POLICY', binding_slot: 'client-governance', priority: 80 },
  { provider_id: 'iam-provider-policy-user-match', interface_kind: 'POLICY', binding_slot: 'admin-governance', priority: 70 },
  { provider_id: 'iam-provider-event-security-audit', interface_kind: 'EVENT_LISTENER', binding_slot: 'security-events', priority: 100 },
  { provider_id: 'iam-provider-event-admin-audit', interface_kind: 'EVENT_LISTENER', binding_slot: 'admin-events', priority: 90 },
  { provider_id: 'iam-provider-event-notification-delivery', interface_kind: 'EVENT_LISTENER', binding_slot: 'notification-events', priority: 80 },
  { provider_id: 'iam-provider-event-external-fanout', interface_kind: 'EVENT_LISTENER', binding_slot: 'external-fanout', priority: 70 },
  { provider_id: 'iam-provider-theme-platform-default', interface_kind: 'THEME_PACKAGE', binding_slot: 'realm-theme', priority: 100 },
];

function normalizeState(input: Partial<IamExtensionRegistryState>): IamExtensionRegistryState {
  return {
    version: 1,
    extensions: Array.isArray(input.extensions) ? input.extensions : [],
    providers: Array.isArray(input.providers) ? input.providers : [],
    bindings: Array.isArray(input.bindings) ? input.bindings : [],
  };
}

const state = normalizeState(loadOrCreatePersistedState<Partial<IamExtensionRegistryState>>(IAM_EXTENSION_REGISTRY_FILE, () => normalizeState({})));

async function loadStateAsync(): Promise<IamExtensionRegistryState> {
  return normalizeState(
    await reloadOrCreatePersistedStateAsync<Partial<IamExtensionRegistryState>>(
      IAM_EXTENSION_REGISTRY_FILE,
      () => normalizeState({}),
    ),
  );
}

function syncInMemoryState(nextState: IamExtensionRegistryState): void {
  state.version = nextState.version;
  state.extensions = clone(nextState.extensions);
  state.providers = clone(nextState.providers);
  state.bindings = clone(nextState.bindings);
}

function persistStateSyncOnly(): void {
  const deferredContext = deferredPersistenceContext.getStore();
  if (deferredContext) {
    deferredContext.dirty = true;
    return;
  }
  savePersistedState(IAM_EXTENSION_REGISTRY_FILE, state);
}

async function persistStateAsync(): Promise<void> {
  await savePersistedStateAsync(IAM_EXTENSION_REGISTRY_FILE, state);
}

async function runWithDeferredPersistence<T>(operation: () => T | Promise<T>): Promise<T> {
  const existingContext = deferredPersistenceContext.getStore();
  if (existingContext) {
    return operation();
  }

  syncInMemoryState(await loadStateAsync());
  return await deferredPersistenceContext.run({ dirty: false }, async () => {
    const context = deferredPersistenceContext.getStore()!;
    try {
      const result = await operation();
      if (context.dirty) {
        await persistStateAsync();
      }
      return result;
    } catch (error) {
      if (context.dirty) {
        await persistStateAsync();
      }
      throw error;
    }
  });
}

function assertRealmExists(realmId: string): IamRealmRecord {
  return LocalIamFoundationStore.getRealm(realmId);
}

function assertExtensionExists(extensionId: string): IamExtensionPackageRecord {
  const extension = state.extensions.find((candidate) => candidate.id === extensionId);
  if (!extension) {
    throw new Error(`Unknown IAM extension package: ${extensionId}`);
  }
  return extension;
}

function assertProviderExists(providerId: string): IamExtensionProviderRecord {
  const provider = state.providers.find((candidate) => candidate.id === providerId);
  if (!provider) {
    throw new Error(`Unknown IAM extension provider: ${providerId}`);
  }
  return provider;
}

function assertBindingExists(bindingId: string): IamExtensionBindingRecord {
  const binding = state.bindings.find((candidate) => candidate.id === bindingId);
  if (!binding) {
    throw new Error(`Unknown IAM extension binding: ${bindingId}`);
  }
  return binding;
}

function validateUniqueExtensionKey(key: string, existingId?: string): void {
  const collision = state.extensions.find((candidate) => candidate.key === key && candidate.id !== existingId);
  if (collision) {
    throw new Error(`IAM extension package key already exists: ${key}`);
  }
}

function validateUniqueProviderKey(key: string, existingId?: string): void {
  const collision = state.providers.find((candidate) => candidate.key === key && candidate.id !== existingId);
  if (collision) {
    throw new Error(`IAM extension provider key already exists: ${key}`);
  }
}

function ensureSeedData(): void {
  let mutated = false;
  const timestamp = nowIso();

  BUILTIN_PACKAGES.forEach((seed) => {
    if (!state.extensions.some((candidate) => candidate.id === seed.id)) {
      state.extensions.push({
        ...seed,
        created_at: timestamp,
        updated_at: timestamp,
        created_by_user_id: 'idp-super-admin',
        updated_by_user_id: 'idp-super-admin',
      });
      mutated = true;
    }
  });

  BUILTIN_PROVIDERS.forEach((seed) => {
    if (!state.providers.some((candidate) => candidate.id === seed.id)) {
      state.providers.push({
        ...seed,
        created_at: timestamp,
        updated_at: timestamp,
        created_by_user_id: 'idp-super-admin',
        updated_by_user_id: 'idp-super-admin',
      });
      mutated = true;
    }
  });

  state.extensions.forEach((extension) => {
    const derivedProviderIds = state.providers
      .filter((candidate) => candidate.extension_id === extension.id)
      .map((candidate) => candidate.id);
    const nextProviderIds = uniqueStrings([...extension.provider_ids, ...derivedProviderIds]);
    if (nextProviderIds.length !== extension.provider_ids.length) {
      extension.provider_ids = nextProviderIds;
      extension.updated_at = timestamp;
      extension.updated_by_user_id = 'idp-super-admin';
      mutated = true;
    }
  });

  const realms = LocalIamFoundationStore.listRealms().realms;
  realms.forEach((realm) => {
    DEFAULT_BINDINGS.forEach((bindingSeed) => {
      if (state.bindings.some((candidate) => candidate.realm_id === realm.id && candidate.binding_slot === bindingSeed.binding_slot && candidate.provider_id === bindingSeed.provider_id)) {
        return;
      }
      state.bindings.push({
        id: nextId('iam-extension-binding'),
        realm_id: realm.id,
        provider_id: bindingSeed.provider_id,
        interface_kind: bindingSeed.interface_kind,
        binding_slot: bindingSeed.binding_slot,
        priority: bindingSeed.priority,
        status: 'ACTIVE',
        configuration: {},
        created_at: timestamp,
        updated_at: timestamp,
        created_by_user_id: 'idp-super-admin',
        updated_by_user_id: 'idp-super-admin',
      });
      mutated = true;
    });
  });

  if (mutated) {
    persistStateSyncOnly();
  }
}

function normalizeBindingConfiguration(input: Record<string, unknown> | undefined): Record<string, PrimitiveBindingValue> {
  if (!input) {
    return {};
  }
  return Object.entries(input).reduce<Record<string, PrimitiveBindingValue>>((accumulator, [key, value]) => {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      accumulator[key] = value;
    }
    return accumulator;
  }, {});
}

export const LocalIamExtensionRegistryStore = {
  getSummary(): IamExtensionRegistrySummaryResponse {
    ensureSeedData();
    const activeProviders = state.providers.filter((candidate) => candidate.status === 'ACTIVE');
    const activeBindings = state.bindings.filter((candidate) => candidate.status === 'ACTIVE');
    return {
      generated_at: nowIso(),
      phase: 'FULL_IDP_PHASE_I',
      subsystem_status: 'EXTENSIBILITY_AND_PROVIDER_FRAMEWORK_IMPLEMENTED',
      extension_interface_count: PROVIDER_INTERFACES.length,
      extension_package_count: state.extensions.length,
      extension_provider_count: state.providers.length,
      active_extension_provider_count: activeProviders.length,
      extension_binding_count: state.bindings.length,
      active_extension_binding_count: activeBindings.length,
      theme_package_provider_count: state.providers.filter((candidate) => candidate.interface_kind === 'THEME_PACKAGE').length,
      next_recommended_phase: 'FULL_IDP_PHASE_J_PRODUCT_NEUTRAL_REFOUNDATION',
    };
  },

  listInterfaces(): IamProviderInterfacesResponse {
    ensureSeedData();
    return {
      generated_at: nowIso(),
      interfaces: clone(PROVIDER_INTERFACES),
      count: PROVIDER_INTERFACES.length,
    };
  },

  listExtensions(filters?: {
    status?: IamExtensionPackageStatus | null;
    interface_kind?: IamExtensionInterfaceKind | null;
  }): IamExtensionPackagesResponse {
    ensureSeedData();
    let extensions = [...state.extensions];
    if (filters?.status) {
      extensions = extensions.filter((candidate) => candidate.status === filters.status);
    }
    if (filters?.interface_kind) {
      extensions = extensions.filter((candidate) => candidate.interface_kinds.includes(filters.interface_kind as IamExtensionInterfaceKind));
    }
    return {
      generated_at: nowIso(),
      extensions: clone(extensions),
      count: extensions.length,
    };
  },

  createExtension(actorUserId: string, input: CreateIamExtensionPackageRequest): IamExtensionPackageRecord {
    ensureSeedData();
    const key = input.key?.trim();
    if (!key) {
      throw new Error('Missing required field: key');
    }
    const name = input.name?.trim();
    if (!name) {
      throw new Error('Missing required field: name');
    }
    const summary = input.summary?.trim();
    if (!summary) {
      throw new Error('Missing required field: summary');
    }
    validateUniqueExtensionKey(key);
    const interfaceKinds = uniqueStrings(input.interface_kinds as string[]).filter((value): value is IamExtensionInterfaceKind =>
      PROVIDER_INTERFACES.some((candidate) => candidate.kind === value),
    );
    if (interfaceKinds.length === 0) {
      throw new Error('At least one valid interface_kind is required');
    }
    const timestamp = nowIso();
    const record: IamExtensionPackageRecord = {
      id: nextId('iam-extension'),
      key,
      name,
      summary,
      publisher: input.publisher?.trim() || 'Standalone IAM',
      version: input.version?.trim() || '1.0.0',
      source_type: input.source_type ?? 'VALIDATION_PACKAGE',
      delivery_model: input.delivery_model ?? 'AWS_LAMBDA',
      status: input.status ?? 'DRAFT',
      interface_kinds: interfaceKinds,
      provider_ids: [],
      created_at: timestamp,
      updated_at: timestamp,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    };
    state.extensions.unshift(record);
    persistStateSyncOnly();
    return clone(record);
  },

  async createExtensionAsync(actorUserId: string, input: CreateIamExtensionPackageRequest): Promise<IamExtensionPackageRecord> {
    return await runWithDeferredPersistence(() => this.createExtension(actorUserId, input));
  },

  updateExtension(extensionId: string, actorUserId: string, input: UpdateIamExtensionPackageRequest): IamExtensionPackageRecord {
    ensureSeedData();
    const extension = assertExtensionExists(extensionId);
    if (typeof input.name === 'string') {
      extension.name = input.name.trim() || extension.name;
    }
    if (typeof input.summary === 'string') {
      extension.summary = input.summary.trim() || extension.summary;
    }
    if (typeof input.publisher === 'string') {
      extension.publisher = input.publisher.trim() || extension.publisher;
    }
    if (typeof input.version === 'string') {
      extension.version = input.version.trim() || extension.version;
    }
    if (input.source_type) {
      extension.source_type = input.source_type;
    }
    if (input.delivery_model) {
      extension.delivery_model = input.delivery_model;
    }
    if (input.status) {
      extension.status = input.status;
    }
    if (input.interface_kinds?.length) {
      const interfaceKinds = uniqueStrings(input.interface_kinds as string[]).filter((value): value is IamExtensionInterfaceKind =>
        PROVIDER_INTERFACES.some((candidate) => candidate.kind === value),
      );
      if (interfaceKinds.length === 0) {
        throw new Error('At least one valid interface_kind is required');
      }
      extension.interface_kinds = interfaceKinds;
    }
    extension.updated_at = nowIso();
    extension.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return clone(extension);
  },

  async updateExtensionAsync(extensionId: string, actorUserId: string, input: UpdateIamExtensionPackageRequest): Promise<IamExtensionPackageRecord> {
    return await runWithDeferredPersistence(() => this.updateExtension(extensionId, actorUserId, input));
  },

  listProviders(filters?: {
    interface_kind?: IamExtensionInterfaceKind | null;
    extension_id?: string | null;
    status?: IamExtensionProviderStatus | null;
  }): IamExtensionProvidersResponse {
    ensureSeedData();
    let providers = [...state.providers];
    if (filters?.interface_kind) {
      providers = providers.filter((candidate) => candidate.interface_kind === filters.interface_kind);
    }
    if (filters?.extension_id) {
      providers = providers.filter((candidate) => candidate.extension_id === filters.extension_id);
    }
    if (filters?.status) {
      providers = providers.filter((candidate) => candidate.status === filters.status);
    }
    return {
      generated_at: nowIso(),
      providers: clone(providers),
      count: providers.length,
    };
  },

  createProvider(actorUserId: string, input: CreateIamExtensionProviderRequest): IamExtensionProviderRecord {
    ensureSeedData();
    const extension = assertExtensionExists(input.extension_id);
    const key = input.key?.trim();
    if (!key) {
      throw new Error('Missing required field: key');
    }
    validateUniqueProviderKey(key);
    const name = input.name?.trim();
    if (!name) {
      throw new Error('Missing required field: name');
    }
    const summary = input.summary?.trim();
    if (!summary) {
      throw new Error('Missing required field: summary');
    }
    if (!extension.interface_kinds.includes(input.interface_kind)) {
      throw new Error(`Extension package ${extension.id} does not declare interface ${input.interface_kind}`);
    }
    const timestamp = nowIso();
    const record: IamExtensionProviderRecord = {
      id: nextId('iam-extension-provider'),
      extension_id: extension.id,
      key,
      name,
      summary,
      interface_kind: input.interface_kind,
      status: input.status ?? 'DRAFT',
      implementation_mode: input.implementation_mode ?? 'MANIFEST_BOUND',
      runtime_reference: input.runtime_reference?.trim() || 'provider:external',
      supported_protocols: input.supported_protocols?.length ? Array.from(new Set(input.supported_protocols)) : ['OIDC', 'OAUTH2', 'SAML'],
      binding_slots: uniqueStrings(input.binding_slots),
      configuration_fields: uniqueStrings(input.configuration_fields),
      created_at: timestamp,
      updated_at: timestamp,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    };
    state.providers.unshift(record);
    extension.provider_ids = uniqueStrings([record.id, ...extension.provider_ids]);
    extension.updated_at = timestamp;
    extension.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return clone(record);
  },

  async createProviderAsync(actorUserId: string, input: CreateIamExtensionProviderRequest): Promise<IamExtensionProviderRecord> {
    return await runWithDeferredPersistence(() => this.createProvider(actorUserId, input));
  },

  updateProvider(providerId: string, actorUserId: string, input: UpdateIamExtensionProviderRequest): IamExtensionProviderRecord {
    ensureSeedData();
    const provider = assertProviderExists(providerId);
    if (typeof input.name === 'string') {
      provider.name = input.name.trim() || provider.name;
    }
    if (typeof input.summary === 'string') {
      provider.summary = input.summary.trim() || provider.summary;
    }
    if (input.status) {
      provider.status = input.status;
    }
    if (input.implementation_mode) {
      provider.implementation_mode = input.implementation_mode;
    }
    if (typeof input.runtime_reference === 'string') {
      provider.runtime_reference = input.runtime_reference.trim() || provider.runtime_reference;
    }
    if (input.supported_protocols?.length) {
      provider.supported_protocols = Array.from(new Set(input.supported_protocols));
    }
    if (input.binding_slots) {
      provider.binding_slots = uniqueStrings(input.binding_slots);
    }
    if (input.configuration_fields) {
      provider.configuration_fields = uniqueStrings(input.configuration_fields);
    }
    provider.updated_at = nowIso();
    provider.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return clone(provider);
  },

  async updateProviderAsync(providerId: string, actorUserId: string, input: UpdateIamExtensionProviderRequest): Promise<IamExtensionProviderRecord> {
    return await runWithDeferredPersistence(() => this.updateProvider(providerId, actorUserId, input));
  },

  listBindings(filters?: {
    realm_id?: string | null;
    interface_kind?: IamExtensionInterfaceKind | null;
    provider_id?: string | null;
    status?: IamExtensionBindingStatus | null;
  }): IamExtensionBindingsResponse {
    ensureSeedData();
    let bindings = [...state.bindings];
    if (filters?.realm_id) {
      bindings = bindings.filter((candidate) => candidate.realm_id === filters.realm_id);
    }
    if (filters?.interface_kind) {
      bindings = bindings.filter((candidate) => candidate.interface_kind === filters.interface_kind);
    }
    if (filters?.provider_id) {
      bindings = bindings.filter((candidate) => candidate.provider_id === filters.provider_id);
    }
    if (filters?.status) {
      bindings = bindings.filter((candidate) => candidate.status === filters.status);
    }
    bindings.sort((left, right) => {
      if (left.realm_id !== right.realm_id) {
        return left.realm_id.localeCompare(right.realm_id);
      }
      if (left.binding_slot !== right.binding_slot) {
        return left.binding_slot.localeCompare(right.binding_slot);
      }
      return right.priority - left.priority;
    });
    return {
      generated_at: nowIso(),
      bindings: clone(bindings),
      count: bindings.length,
    };
  },

  createBinding(actorUserId: string, input: CreateIamExtensionBindingRequest): IamExtensionBindingRecord {
    ensureSeedData();
    assertRealmExists(input.realm_id);
    const provider = assertProviderExists(input.provider_id);
    const bindingSlot = input.binding_slot?.trim();
    if (!bindingSlot) {
      throw new Error('Missing required field: binding_slot');
    }
    if (!provider.binding_slots.includes(bindingSlot)) {
      throw new Error(`Provider ${provider.id} does not support binding slot ${bindingSlot}`);
    }
    if (state.bindings.some((candidate) => candidate.realm_id === input.realm_id && candidate.binding_slot === bindingSlot && candidate.provider_id === provider.id)) {
      throw new Error('IAM extension binding already exists for that realm, slot, and provider');
    }
    const timestamp = nowIso();
    const record: IamExtensionBindingRecord = {
      id: nextId('iam-extension-binding'),
      realm_id: input.realm_id,
      provider_id: provider.id,
      interface_kind: provider.interface_kind,
      binding_slot: bindingSlot,
      priority: input.priority ?? 50,
      status: input.status ?? 'ACTIVE',
      configuration: normalizeBindingConfiguration(input.configuration),
      created_at: timestamp,
      updated_at: timestamp,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    };
    state.bindings.unshift(record);
    persistStateSyncOnly();
    return clone(record);
  },

  async createBindingAsync(actorUserId: string, input: CreateIamExtensionBindingRequest): Promise<IamExtensionBindingRecord> {
    return await runWithDeferredPersistence(() => this.createBinding(actorUserId, input));
  },

  updateBinding(bindingId: string, actorUserId: string, input: UpdateIamExtensionBindingRequest): IamExtensionBindingRecord {
    ensureSeedData();
    const binding = assertBindingExists(bindingId);
    let provider = assertProviderExists(binding.provider_id);
    if (input.provider_id) {
      provider = assertProviderExists(input.provider_id);
      binding.provider_id = provider.id;
      binding.interface_kind = provider.interface_kind;
    }
    if (typeof input.binding_slot === 'string' && input.binding_slot.trim()) {
      if (!provider.binding_slots.includes(input.binding_slot.trim())) {
        throw new Error(`Provider ${provider.id} does not support binding slot ${input.binding_slot.trim()}`);
      }
      binding.binding_slot = input.binding_slot.trim();
    }
    if (typeof input.priority === 'number') {
      binding.priority = input.priority;
    }
    if (input.status) {
      binding.status = input.status;
    }
    if (input.configuration) {
      binding.configuration = normalizeBindingConfiguration(input.configuration);
    }
    binding.updated_at = nowIso();
    binding.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return clone(binding);
  },

  async updateBindingAsync(bindingId: string, actorUserId: string, input: UpdateIamExtensionBindingRequest): Promise<IamExtensionBindingRecord> {
    return await runWithDeferredPersistence(() => this.updateBinding(bindingId, actorUserId, input));
  },
};
