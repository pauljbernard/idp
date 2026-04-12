import { loadOrCreatePersistedState, savePersistedState } from './persistence';

export type ApplicationIdentityProviderKind = 'STANDALONE_IAM' | 'EXTERNAL_OIDC';
export type ApplicationIdentityTransportMode = 'REST_SERVICE' | 'INTERNAL_SDK';

export interface ApplicationIdentityConfigurationRecord {
  provider_kind: ApplicationIdentityProviderKind;
  transport_mode: ApplicationIdentityTransportMode;
  rest_service_base_url: string | null;
  sdk_package_name: string | null;
  sdk_package_version: string | null;
  realm_id: string | null;
  client_id: string;
  authorization_profile_id: string | null;
  oidc_issuer_url: string | null;
  oidc_authorization_endpoint: string | null;
  oidc_token_endpoint: string | null;
  oidc_userinfo_endpoint: string | null;
  oidc_jwks_uri: string | null;
  requested_scopes: string[];
  notes: string[];
  updated_at: string;
  updated_by_user_id: string;
}

export interface UpdateApplicationIdentityConfigurationRequest {
  provider_kind?: ApplicationIdentityProviderKind;
  transport_mode?: ApplicationIdentityTransportMode;
  rest_service_base_url?: string | null;
  sdk_package_name?: string | null;
  sdk_package_version?: string | null;
  realm_id?: string | null;
  client_id?: string;
  authorization_profile_id?: string | null;
  oidc_issuer_url?: string | null;
  oidc_authorization_endpoint?: string | null;
  oidc_token_endpoint?: string | null;
  oidc_userinfo_endpoint?: string | null;
  oidc_jwks_uri?: string | null;
  requested_scopes?: string[];
  notes?: string[];
}

interface ApplicationIdentityState {
  configuration: ApplicationIdentityConfigurationRecord;
}

const APPLICATION_IDENTITY_STATE_FILE = 'application-identity-state.json';
const APPLICATION_IDENTITY_DEFAULT_REALM_ID = 'realm-idp-default';
const APPLICATION_IDENTITY_DEFAULT_CLIENT_ID = 'admin-console-demo';
const APPLICATION_IDENTITY_DEFAULT_REST_SERVICE_BASE_URL = '/api/v1/iam';
const APPLICATION_IDENTITY_DEFAULT_SDK_PACKAGE_NAME = '@idp/sdk-iam';
const APPLICATION_IDENTITY_DEFAULT_SDK_PACKAGE_VERSION = 'local-dev';

const state = loadOrCreatePersistedState<ApplicationIdentityState>(APPLICATION_IDENTITY_STATE_FILE, () => ({
  configuration: {
    provider_kind: 'STANDALONE_IAM',
    transport_mode: 'REST_SERVICE',
    rest_service_base_url: APPLICATION_IDENTITY_DEFAULT_REST_SERVICE_BASE_URL,
    sdk_package_name: null,
    sdk_package_version: null,
    realm_id: APPLICATION_IDENTITY_DEFAULT_REALM_ID,
    client_id: APPLICATION_IDENTITY_DEFAULT_CLIENT_ID,
    authorization_profile_id: 'idp-enterprise-admin-console',
    oidc_issuer_url: null,
    oidc_authorization_endpoint: null,
    oidc_token_endpoint: null,
    oidc_userinfo_endpoint: null,
    oidc_jwks_uri: null,
    requested_scopes: ['openid', 'profile', 'email', 'roles', 'groups'],
    notes: [
      'Standalone application-owned identity integration configuration.',
      'This configuration is intentionally decoupled from IAM realm bindings.',
    ],
    updated_at: new Date().toISOString(),
    updated_by_user_id: 'system-seed',
  },
}));

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

function persistState(): void {
  savePersistedState(APPLICATION_IDENTITY_STATE_FILE, state);
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeProviderKind(value: unknown): ApplicationIdentityProviderKind | null {
  if (value === 'STANDALONE_IAM' || value === 'EXTERNAL_OIDC') {
    return value;
  }
  return null;
}

function normalizeTransportMode(value: unknown): ApplicationIdentityTransportMode | null {
  if (value === 'REST_SERVICE' || value === 'INTERNAL_SDK') {
    return value;
  }
  return null;
}

function normalizeStringList(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return Array.from(new Set(
    values
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean),
  ));
}

function applyConfigurationDefaults(
  input: ApplicationIdentityConfigurationRecord,
): ApplicationIdentityConfigurationRecord {
  const providerKind = normalizeProviderKind(input.provider_kind) ?? 'STANDALONE_IAM';
  const transportMode = normalizeTransportMode(input.transport_mode) ?? 'REST_SERVICE';
  const realmId = normalizeText(input.realm_id);
  const clientId = normalizeText(input.client_id) ?? APPLICATION_IDENTITY_DEFAULT_CLIENT_ID;
  const requestedScopes = normalizeStringList(input.requested_scopes);
  const notes = normalizeStringList(input.notes);
  const restServiceBaseUrl = normalizeText(input.rest_service_base_url)
    ?? APPLICATION_IDENTITY_DEFAULT_REST_SERVICE_BASE_URL;
  const sdkPackageName = normalizeText(input.sdk_package_name)
    ?? APPLICATION_IDENTITY_DEFAULT_SDK_PACKAGE_NAME;
  const sdkPackageVersion = normalizeText(input.sdk_package_version)
    ?? APPLICATION_IDENTITY_DEFAULT_SDK_PACKAGE_VERSION;

  const normalized: ApplicationIdentityConfigurationRecord = {
    provider_kind: providerKind,
    transport_mode: transportMode,
    rest_service_base_url: transportMode === 'REST_SERVICE' ? restServiceBaseUrl : null,
    sdk_package_name: transportMode === 'INTERNAL_SDK' ? sdkPackageName : null,
    sdk_package_version: transportMode === 'INTERNAL_SDK' ? sdkPackageVersion : null,
    realm_id: providerKind === 'STANDALONE_IAM'
      ? (realmId ?? APPLICATION_IDENTITY_DEFAULT_REALM_ID)
      : null,
    client_id: clientId,
    authorization_profile_id: normalizeText(input.authorization_profile_id),
    oidc_issuer_url: normalizeText(input.oidc_issuer_url),
    oidc_authorization_endpoint: normalizeText(input.oidc_authorization_endpoint),
    oidc_token_endpoint: normalizeText(input.oidc_token_endpoint),
    oidc_userinfo_endpoint: normalizeText(input.oidc_userinfo_endpoint),
    oidc_jwks_uri: normalizeText(input.oidc_jwks_uri),
    requested_scopes: requestedScopes.length > 0 ? requestedScopes : ['openid', 'profile', 'email'],
    notes,
    updated_at: normalizeText(input.updated_at) ?? nowIso(),
    updated_by_user_id: normalizeText(input.updated_by_user_id) ?? 'system',
  };

  return normalized;
}

state.configuration = applyConfigurationDefaults(state.configuration);
persistState();

export class LocalApplicationIdentityStore {
  static getConfiguration(): ApplicationIdentityConfigurationRecord {
    return clone(state.configuration);
  }

  static updateConfiguration(
    actorUserId: string,
    updates: UpdateApplicationIdentityConfigurationRequest,
  ): ApplicationIdentityConfigurationRecord {
    const current = state.configuration;
    if (updates.provider_kind !== undefined && !normalizeProviderKind(updates.provider_kind)) {
      throw new Error('provider_kind must be STANDALONE_IAM or EXTERNAL_OIDC');
    }
    if (updates.transport_mode !== undefined && !normalizeTransportMode(updates.transport_mode)) {
      throw new Error('transport_mode must be REST_SERVICE or INTERNAL_SDK');
    }
    const nextProviderKind = normalizeProviderKind(updates.provider_kind) ?? current.provider_kind;
    const nextTransportMode = normalizeTransportMode(updates.transport_mode) ?? current.transport_mode;
    const nextRealmId = updates.realm_id !== undefined
      ? normalizeText(updates.realm_id)
      : current.realm_id;
    const nextClientId = updates.client_id !== undefined
      ? normalizeText(updates.client_id)
      : current.client_id;
    const nextRestServiceBaseUrl = updates.rest_service_base_url !== undefined
      ? normalizeText(updates.rest_service_base_url)
      : current.rest_service_base_url;
    const nextSdkPackageName = updates.sdk_package_name !== undefined
      ? normalizeText(updates.sdk_package_name)
      : current.sdk_package_name;
    const nextSdkPackageVersion = updates.sdk_package_version !== undefined
      ? normalizeText(updates.sdk_package_version)
      : current.sdk_package_version;

    if (!nextClientId) {
      throw new Error('client_id is required');
    }
    if (nextTransportMode === 'REST_SERVICE' && !nextRestServiceBaseUrl) {
      throw new Error('rest_service_base_url is required when transport_mode is REST_SERVICE');
    }
    if (nextTransportMode === 'INTERNAL_SDK' && !nextSdkPackageName) {
      throw new Error('sdk_package_name is required when transport_mode is INTERNAL_SDK');
    }
    if (nextProviderKind === 'STANDALONE_IAM' && !nextRealmId) {
      throw new Error('realm_id is required when provider_kind is STANDALONE_IAM');
    }
    if (
      nextProviderKind === 'EXTERNAL_OIDC'
      && updates.oidc_issuer_url === undefined
      && updates.oidc_authorization_endpoint === undefined
      && updates.oidc_token_endpoint === undefined
      && !current.oidc_issuer_url
      && !current.oidc_authorization_endpoint
      && !current.oidc_token_endpoint
    ) {
      throw new Error('Configure oidc_issuer_url or explicit OIDC endpoints before selecting EXTERNAL_OIDC.');
    }

    state.configuration = {
      ...current,
      provider_kind: nextProviderKind,
      transport_mode: nextTransportMode,
      rest_service_base_url: nextTransportMode === 'REST_SERVICE'
        ? (nextRestServiceBaseUrl ?? APPLICATION_IDENTITY_DEFAULT_REST_SERVICE_BASE_URL)
        : null,
      sdk_package_name: nextTransportMode === 'INTERNAL_SDK'
        ? (nextSdkPackageName ?? APPLICATION_IDENTITY_DEFAULT_SDK_PACKAGE_NAME)
        : null,
      sdk_package_version: nextTransportMode === 'INTERNAL_SDK'
        ? (nextSdkPackageVersion ?? APPLICATION_IDENTITY_DEFAULT_SDK_PACKAGE_VERSION)
        : null,
      realm_id: nextProviderKind === 'STANDALONE_IAM' ? nextRealmId : null,
      client_id: nextClientId,
      authorization_profile_id: updates.authorization_profile_id !== undefined
        ? normalizeText(updates.authorization_profile_id)
        : current.authorization_profile_id,
      oidc_issuer_url: updates.oidc_issuer_url !== undefined
        ? normalizeText(updates.oidc_issuer_url)
        : current.oidc_issuer_url,
      oidc_authorization_endpoint: updates.oidc_authorization_endpoint !== undefined
        ? normalizeText(updates.oidc_authorization_endpoint)
        : current.oidc_authorization_endpoint,
      oidc_token_endpoint: updates.oidc_token_endpoint !== undefined
        ? normalizeText(updates.oidc_token_endpoint)
        : current.oidc_token_endpoint,
      oidc_userinfo_endpoint: updates.oidc_userinfo_endpoint !== undefined
        ? normalizeText(updates.oidc_userinfo_endpoint)
        : current.oidc_userinfo_endpoint,
      oidc_jwks_uri: updates.oidc_jwks_uri !== undefined
        ? normalizeText(updates.oidc_jwks_uri)
        : current.oidc_jwks_uri,
      requested_scopes: updates.requested_scopes !== undefined
        ? (normalizeStringList(updates.requested_scopes).length > 0
          ? normalizeStringList(updates.requested_scopes)
          : ['openid', 'profile', 'email'])
        : current.requested_scopes,
      notes: updates.notes !== undefined
        ? normalizeStringList(updates.notes)
        : current.notes,
      updated_at: nowIso(),
      updated_by_user_id: actorUserId,
    };

    persistState();
    return clone(state.configuration);
  }
}
