import { AsyncLocalStorage } from 'async_hooks';
import { createHash, randomUUID } from 'crypto';
import { createPersistedIamStateRepository, type IamStateRepository } from './iamStateRepository';
import {
  LocalIamAuthenticationRuntimeStore,
  type IamLoginResponse,
} from './iamAuthenticationRuntime';
import {
  LocalIamProtocolRuntimeStore,
  type IamClientRecord,
  type IamTokenEndpointResponse,
} from './iamProtocolRuntime';
import { reloadOrCreatePersistedStateAsync, savePersistedStateAsync } from './persistence';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

function encodeBase64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function normalizeOptionalString(value?: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function parseSpaceSeparatedValues(value?: string | null): string[] {
  return Array.from(new Set((value ?? '').split(/\s+/).map((item) => item.trim()).filter(Boolean)));
}

function buildUrlWithQuery(baseUrl: string, params: Record<string, string | null | undefined>): string {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

function matchesRegisteredRedirectUri(registeredUri: string, redirectUri: string): boolean {
  const normalizedRegistered = registeredUri.trim();
  const normalizedRedirect = redirectUri.trim();
  if (!normalizedRegistered || !normalizedRedirect) {
    return false;
  }
  if (!normalizedRegistered.includes('*')) {
    return normalizedRegistered === normalizedRedirect;
  }
  const escaped = normalizedRegistered
    .split('*')
    .map((segment) => segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${escaped}$`).test(normalizedRedirect);
}

function computePkceChallenge(codeVerifier: string, method: IamPkceChallengeMethod): string {
  if (method === 'plain') {
    return codeVerifier;
  }
  return encodeBase64Url(createHash('sha256').update(codeVerifier).digest());
}

const IAM_AUTHORIZATION_RUNTIME_FILE = 'iam-authorization-runtime-state.json';
const AUTHORIZATION_REQUEST_TTL_MS = 1000 * 60 * 15;
const AUTHORIZATION_CODE_TTL_MS = 1000 * 60 * 5;
const AUTHORIZATION_REQUEST_RETENTION_MS = 1000 * 60 * 15;
const AUTHORIZATION_CODE_RETENTION_MS = 1000 * 60 * 15;

export type IamAuthorizationRequestStatus = 'PENDING' | 'AUTHORIZED' | 'CANCELLED' | 'EXPIRED';
export type IamAuthorizationCodeStatus = 'ACTIVE' | 'CONSUMED' | 'EXPIRED';
export type IamPkceChallengeMethod = 'plain' | 'S256';

interface StoredIamAuthorizationRequest {
  id: string;
  realm_id: string;
  client_id: string;
  client_name: string;
  redirect_uri: string;
  response_type: 'code';
  response_mode: 'query';
  requested_scope_names: string[];
  requested_purpose: string | null;
  state: string | null;
  nonce: string | null;
  prompt_values: string[];
  code_challenge: string | null;
  code_challenge_method: IamPkceChallengeMethod | null;
  created_at: string;
  expires_at: string;
  authorized_at: string | null;
  cancelled_at: string | null;
  status: IamAuthorizationRequestStatus;
}

interface StoredIamAuthorizationCode {
  id: string;
  authorization_request_id: string;
  realm_id: string;
  client_id: string;
  user_id: string;
  session_id: string;
  redirect_uri: string;
  code: string;
  requested_scope_names: string[];
  requested_purpose: string | null;
  state: string | null;
  nonce: string | null;
  code_challenge: string | null;
  code_challenge_method: IamPkceChallengeMethod | null;
  issued_at: string;
  expires_at: string;
  consumed_at: string | null;
  status: IamAuthorizationCodeStatus;
}

interface IamAuthorizationRuntimeState {
  authorization_requests: StoredIamAuthorizationRequest[];
  authorization_codes: StoredIamAuthorizationCode[];
}

export interface IamAuthorizationSummary {
  authorization_request_count: number;
  active_authorization_request_count: number;
  authorization_code_count: number;
  active_authorization_code_count: number;
}

export interface IamAuthorizationTransientStateMaintenanceResult {
  expired_authorization_request_count: number;
  expired_authorization_code_count: number;
  pruned_authorization_request_count: number;
  pruned_authorization_code_count: number;
  total_mutated_count: number;
}

function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isRetainedAuthorizationRequest(
  request: StoredIamAuthorizationRequest,
  now: number,
): boolean {
  if (request.status === 'PENDING') {
    return true;
  }
  const retentionAnchor =
    parseTimestamp(request.authorized_at)
    ?? parseTimestamp(request.cancelled_at)
    ?? parseTimestamp(request.expires_at)
    ?? parseTimestamp(request.created_at);
  return retentionAnchor === null || retentionAnchor + AUTHORIZATION_REQUEST_RETENTION_MS > now;
}

function isRetainedAuthorizationCode(
  code: StoredIamAuthorizationCode,
  now: number,
): boolean {
  if (code.status === 'ACTIVE') {
    return true;
  }
  const retentionAnchor =
    parseTimestamp(code.consumed_at)
    ?? parseTimestamp(code.expires_at)
    ?? parseTimestamp(code.issued_at);
  return retentionAnchor === null || retentionAnchor + AUTHORIZATION_CODE_RETENTION_MS > now;
}

export interface IamAuthorizationRequestRecord {
  id: string;
  realm_id: string;
  client_id: string;
  client_name: string;
  redirect_uri: string;
  response_type: 'code';
  response_mode: 'query';
  requested_scope_names: string[];
  requested_purpose: string | null;
  state: string | null;
  nonce: string | null;
  prompt_values: string[];
  code_challenge: string | null;
  code_challenge_method: IamPkceChallengeMethod | null;
  created_at: string;
  expires_at: string;
  status: IamAuthorizationRequestStatus;
}

export interface CreateIamAuthorizationRequestInput {
  client_id: string;
  redirect_uri: string;
  response_type?: string | null;
  response_mode?: string | null;
  scope?: string | null;
  requested_purpose?: string | null;
  state?: string | null;
  nonce?: string | null;
  prompt?: string | null;
  login_hint?: string | null;
  flow_context?: string | null;
  code_challenge?: string | null;
  code_challenge_method?: IamPkceChallengeMethod | null;
}

export interface IamAuthorizationRedirectResponse {
  authorization_request_id: string;
  redirect_url: string;
  request: IamAuthorizationRequestRecord;
}

export interface IamAuthorizationRequestDetailResponse {
  request: IamAuthorizationRequestRecord;
  can_auto_continue: boolean;
}

export interface IamAuthorizationContinuationResponse {
  status: 'AUTHORIZED' | 'ERROR' | 'INTERACTION_REQUIRED';
  request: IamAuthorizationRequestRecord;
  redirect_url?: string;
  error?: string;
  error_description?: string;
  authorization_code_id?: string;
  expires_at?: string;
  login_response?: IamLoginResponse;
}

export interface IamAuthorizationCodeSessionContext {
  authorization_request_id: string;
  client_id: string;
  user_id: string;
  session_id: string;
  redirect_uri: string;
  requested_scope_names: string[];
  requested_purpose: string | null;
  nonce: string | null;
}

function normalizeState(input: Partial<IamAuthorizationRuntimeState>): IamAuthorizationRuntimeState {
  return {
    authorization_requests: Array.isArray(input.authorization_requests)
      ? input.authorization_requests.map((record) => ({
        ...record,
        requested_purpose: typeof record.requested_purpose === 'string' && record.requested_purpose.trim()
          ? record.requested_purpose.trim()
          : null,
      }))
      : [],
    authorization_codes: Array.isArray(input.authorization_codes)
      ? input.authorization_codes.map((record) => ({
        ...record,
        requested_purpose: typeof record.requested_purpose === 'string' && record.requested_purpose.trim()
          ? record.requested_purpose.trim()
          : null,
      }))
      : [],
  };
}

interface IamAuthorizationRuntimeStateRepository extends IamStateRepository<IamAuthorizationRuntimeState> {}

const authorizationRuntimeStateRepository: IamAuthorizationRuntimeStateRepository = createPersistedIamStateRepository<
  IamAuthorizationRuntimeState,
  IamAuthorizationRuntimeState
>({
  fileName: IAM_AUTHORIZATION_RUNTIME_FILE,
  seedFactory: () => normalizeState({}),
  normalize: normalizeState,
});

let state = authorizationRuntimeStateRepository.load();
const deferredPersistenceContext = new AsyncLocalStorage<{ dirty: boolean }>();
const DEFERRED_PERSISTENCE_RETRIES = 8;
const DEFERRED_PERSISTENCE_RETRY_BACKOFF_MS = 20;

function isDeferredPersistenceConflict(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Refusing to overwrite newer persisted state')
    || message.includes('Conditional write failed for dynamodb://');
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function loadStateAsync(): Promise<IamAuthorizationRuntimeState> {
  return normalizeState(
    await reloadOrCreatePersistedStateAsync<IamAuthorizationRuntimeState>(
      IAM_AUTHORIZATION_RUNTIME_FILE,
      () => normalizeState({}),
    ),
  );
}

function syncInMemoryState(nextState: IamAuthorizationRuntimeState): void {
  state.authorization_requests = clone(nextState.authorization_requests);
  state.authorization_codes = clone(nextState.authorization_codes);
}

function persistStateSyncOnly(): void {
  const deferredPersistence = deferredPersistenceContext.getStore();
  if (deferredPersistence) {
    deferredPersistence.dirty = true;
    return;
  }
  authorizationRuntimeStateRepository.save(state);
}

async function persistStateAsync(): Promise<void> {
  await savePersistedStateAsync(IAM_AUTHORIZATION_RUNTIME_FILE, state);
}

async function runWithDeferredPersistence<T>(operation: () => T | Promise<T>): Promise<T> {
  const existingContext = deferredPersistenceContext.getStore();
  if (existingContext) {
    return operation();
  }

  let lastError: unknown = null;

  for (let attempt = 0; attempt < DEFERRED_PERSISTENCE_RETRIES; attempt += 1) {
    syncInMemoryState(await loadStateAsync());
    try {
      return await deferredPersistenceContext.run({ dirty: false }, async () => {
        try {
          const result = await operation();
          if (deferredPersistenceContext.getStore()?.dirty) {
            await persistStateAsync();
          }
          return result;
        } catch (error) {
          if (deferredPersistenceContext.getStore()?.dirty) {
            await persistStateAsync();
          }
          throw error;
        }
      });
    } catch (error) {
      lastError = error;
      if (!isDeferredPersistenceConflict(error)) {
        throw error;
      }
      await sleep(DEFERRED_PERSISTENCE_RETRY_BACKOFF_MS * (attempt + 1));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function toPublicRequest(record: StoredIamAuthorizationRequest): IamAuthorizationRequestRecord {
  return {
    id: record.id,
    realm_id: record.realm_id,
    client_id: record.client_id,
    client_name: record.client_name,
    redirect_uri: record.redirect_uri,
    response_type: record.response_type,
    response_mode: record.response_mode,
    requested_scope_names: clone(record.requested_scope_names),
    requested_purpose: record.requested_purpose,
    state: record.state,
    nonce: record.nonce,
    prompt_values: clone(record.prompt_values),
    code_challenge: record.code_challenge,
    code_challenge_method: record.code_challenge_method,
    created_at: record.created_at,
    expires_at: record.expires_at,
    status: record.status,
  };
}

function expireAuthorizationState(): IamAuthorizationTransientStateMaintenanceResult {
  const now = Date.now();
  let expiredAuthorizationRequestCount = 0;
  let expiredAuthorizationCodeCount = 0;

  for (const request of state.authorization_requests) {
    if (request.status === 'PENDING' && Date.parse(request.expires_at) <= now) {
      request.status = 'EXPIRED';
      expiredAuthorizationRequestCount += 1;
    }
  }

  for (const code of state.authorization_codes) {
    if (code.status !== 'ACTIVE') {
      continue;
    }
    const sessionActive = LocalIamAuthenticationRuntimeStore.isAccountSessionActiveForRuntime(code.realm_id, code.session_id);
    if (Date.parse(code.expires_at) <= now || !sessionActive) {
      code.status = 'EXPIRED';
      expiredAuthorizationCodeCount += 1;
    }
  }

  const originalAuthorizationRequestCount = state.authorization_requests.length;
  const originalAuthorizationCodeCount = state.authorization_codes.length;
  state.authorization_requests = state.authorization_requests.filter((request) => isRetainedAuthorizationRequest(request, now));
  state.authorization_codes = state.authorization_codes.filter((code) => isRetainedAuthorizationCode(code, now));
  const prunedAuthorizationRequestCount = originalAuthorizationRequestCount - state.authorization_requests.length;
  const prunedAuthorizationCodeCount = originalAuthorizationCodeCount - state.authorization_codes.length;

  if (
    expiredAuthorizationRequestCount > 0
    || expiredAuthorizationCodeCount > 0
    || prunedAuthorizationRequestCount > 0
    || prunedAuthorizationCodeCount > 0
  ) {
    persistStateSyncOnly();
  }

  return {
    expired_authorization_request_count: expiredAuthorizationRequestCount,
    expired_authorization_code_count: expiredAuthorizationCodeCount,
    pruned_authorization_request_count: prunedAuthorizationRequestCount,
    pruned_authorization_code_count: prunedAuthorizationCodeCount,
    total_mutated_count:
      expiredAuthorizationRequestCount
      + expiredAuthorizationCodeCount
      + prunedAuthorizationRequestCount
      + prunedAuthorizationCodeCount,
  };
}

function assertActiveRequest(realmId: string, requestId: string): StoredIamAuthorizationRequest {
  expireAuthorizationState();
  const request = state.authorization_requests.find(
    (candidate) => candidate.id === requestId && candidate.realm_id === realmId,
  );
  if (!request) {
    throw new Error('Unknown authorization request');
  }
  if (request.status !== 'PENDING') {
    throw new Error('Authorization request is no longer active');
  }
  if (Date.parse(request.expires_at) <= Date.now()) {
    request.status = 'EXPIRED';
    persistStateSyncOnly();
    throw new Error('Authorization request has expired');
  }
  return request;
}

function buildSuccessRedirect(request: StoredIamAuthorizationRequest, code: string): string {
  return buildUrlWithQuery(request.redirect_uri, {
    code,
    state: request.state,
  });
}

function buildErrorRedirect(request: StoredIamAuthorizationRequest, error: string, description?: string | null): string {
  return buildUrlWithQuery(request.redirect_uri, {
    error,
    error_description: description ?? null,
    state: request.state,
  });
}

function createAuthorizationCode(request: StoredIamAuthorizationRequest, userId: string, sessionId: string): StoredIamAuthorizationCode {
  const code: StoredIamAuthorizationCode = {
    id: `iam-authorization-code-${randomUUID()}`,
    authorization_request_id: request.id,
    realm_id: request.realm_id,
    client_id: request.client_id,
    user_id: userId,
    session_id: sessionId,
    redirect_uri: request.redirect_uri,
    code: randomUUID().replace(/-/g, ''),
    requested_scope_names: clone(request.requested_scope_names),
    requested_purpose: request.requested_purpose,
    state: request.state,
    nonce: request.nonce,
    code_challenge: request.code_challenge,
    code_challenge_method: request.code_challenge_method,
    issued_at: nowIso(),
    expires_at: new Date(Date.now() + AUTHORIZATION_CODE_TTL_MS).toISOString(),
    consumed_at: null,
    status: 'ACTIVE',
  };
  state.authorization_codes.unshift(code);
  request.status = 'AUTHORIZED';
  request.authorized_at = nowIso();
  persistStateSyncOnly();
  return code;
}

function validateAuthorizationRequestInput(realmId: string, input: CreateIamAuthorizationRequestInput): IamClientRecord {
  const clientId = input.client_id.trim();
  const redirectUri = input.redirect_uri.trim();
  const client = LocalIamProtocolRuntimeStore.getClientByIdentifier(realmId, clientId);
  if (client.protocol !== 'OIDC') {
    throw new Error('Authorization endpoint only supports OIDC clients');
  }
  if (!client.standard_flow_enabled) {
    throw new Error('Client does not allow standard browser flow');
  }
  if (!client.redirect_uris.some((registeredUri) => matchesRegisteredRedirectUri(registeredUri, redirectUri))) {
    throw new Error('Redirect URI is not registered for this client');
  }
  const responseType = normalizeOptionalString(input.response_type) ?? 'code';
  if (responseType !== 'code') {
    throw new Error('Only response_type=code is supported');
  }
  const responseMode = normalizeOptionalString(input.response_mode) ?? 'query';
  if (responseMode !== 'query') {
    throw new Error('Only response_mode=query is supported');
  }
  const codeChallenge = normalizeOptionalString(input.code_challenge);
  const codeChallengeMethod = (normalizeOptionalString(input.code_challenge_method) as IamPkceChallengeMethod | null) ?? null;
  if (client.access_type === 'PUBLIC') {
    const plainPkceAllowed = process.env.NODE_ENV !== 'production';
    if (
      !codeChallenge ||
      !codeChallengeMethod ||
      (codeChallengeMethod !== 'S256' && !(plainPkceAllowed && codeChallengeMethod === 'plain'))
    ) {
      throw new Error(plainPkceAllowed
        ? 'Public clients require PKCE with code_challenge_method=S256 (plain is allowed in non-production local development)'
        : 'Public clients require PKCE with code_challenge_method=S256');
    }
  }
  if (codeChallenge && !codeChallengeMethod) {
    throw new Error('code_challenge_method is required when code_challenge is provided');
  }
  if (codeChallengeMethod && !['plain', 'S256'].includes(codeChallengeMethod)) {
    throw new Error('Unsupported code_challenge_method');
  }
  return client;
}

function issueErrorForPromptNone(request: StoredIamAuthorizationRequest, nextStep: IamLoginResponse['next_step']): IamAuthorizationContinuationResponse {
  const error = nextStep === 'CONSENT_REQUIRED'
    ? 'consent_required'
    : nextStep === 'REQUIRED_ACTIONS'
      ? 'interaction_required'
      : 'login_required';
  return {
    status: 'ERROR',
    request: toPublicRequest(request),
    error,
    error_description: 'The authorization request could not be completed without interactive user input.',
    redirect_url: buildErrorRedirect(request, error, 'Interactive user input is required'),
  };
}

function createAuthorizationRedirectRecord(
  realmId: string,
  input: CreateIamAuthorizationRequestInput,
  uiBaseUrl: string,
): IamAuthorizationRedirectResponse {
  const client = validateAuthorizationRequestInput(realmId, input);
  const request: StoredIamAuthorizationRequest = {
    id: `iam-auth-request-${randomUUID()}`,
    realm_id: realmId,
    client_id: client.client_id,
    client_name: client.name,
    redirect_uri: input.redirect_uri.trim(),
    response_type: 'code',
    response_mode: 'query',
    requested_scope_names: parseSpaceSeparatedValues(input.scope),
    requested_purpose: normalizeOptionalString(input.requested_purpose),
    state: normalizeOptionalString(input.state),
    nonce: normalizeOptionalString(input.nonce),
    prompt_values: parseSpaceSeparatedValues(input.prompt),
    code_challenge: normalizeOptionalString(input.code_challenge),
    code_challenge_method: (normalizeOptionalString(input.code_challenge_method) as IamPkceChallengeMethod | null) ?? null,
    created_at: nowIso(),
    expires_at: new Date(Date.now() + AUTHORIZATION_REQUEST_TTL_MS).toISOString(),
    authorized_at: null,
    cancelled_at: null,
    status: 'PENDING',
  };
  state.authorization_requests.unshift(request);
  persistStateSyncOnly();
  return {
    authorization_request_id: request.id,
    redirect_url: buildUrlWithQuery(`${uiBaseUrl.replace(/\/+$/, '')}/iam/login`, {
      realm: realmId,
      client_id: client.client_id,
      authorization_request_id: request.id,
      login_hint: normalizeOptionalString(input.login_hint),
      flow_context: normalizeOptionalString(input.flow_context),
    }),
    request: toPublicRequest(request),
  };
}

async function continueAuthorizationRequestRecordAsync(
  realmId: string,
  requestId: string,
  sessionId: string,
): Promise<IamAuthorizationContinuationResponse> {
  const request = assertActiveRequest(realmId, requestId);
  const sessionContext = await LocalIamAuthenticationRuntimeStore.resolveAccountSessionAsync(realmId, sessionId);
  const promptValues = new Set(request.prompt_values);

  const interaction = LocalIamAuthenticationRuntimeStore.evaluateSessionInteraction(realmId, sessionId, {
    client_id: request.client_id,
    scope: request.requested_scope_names,
    skip_mfa: true,
  });

  if (interaction.next_step !== 'AUTHENTICATED') {
    if (promptValues.has('none')) {
      return issueErrorForPromptNone(request, interaction.next_step);
    }

    const resumedLogin = await LocalIamAuthenticationRuntimeStore.loginResolvedUserAsync(
      realmId,
      sessionContext.session.user_id,
      {
        client_id: request.client_id,
        scope: request.requested_scope_names,
        skip_mfa: true,
      },
    );

    if (resumedLogin.next_step === 'AUTHENTICATED' && resumedLogin.session_id) {
      const code = createAuthorizationCode(request, sessionContext.session.user_id, resumedLogin.session_id);
      return {
        status: 'AUTHORIZED',
        request: toPublicRequest(request),
        redirect_url: buildSuccessRedirect(request, code.code),
        authorization_code_id: code.id,
        expires_at: code.expires_at,
      };
    }

    return {
      status: 'INTERACTION_REQUIRED',
      request: toPublicRequest(request),
      login_response: resumedLogin,
    };
  }

  const code = createAuthorizationCode(request, sessionContext.session.user_id, sessionContext.session.session_id);
  return {
    status: 'AUTHORIZED',
    request: toPublicRequest(request),
    redirect_url: buildSuccessRedirect(request, code.code),
    authorization_code_id: code.id,
    expires_at: code.expires_at,
  };
}

async function exchangeAuthorizationCodeRecordAsync(
  realmId: string,
  payload: Record<string, unknown>,
  authorizationHeader: string | null,
  baseUrl: string,
): Promise<IamTokenEndpointResponse> {
  expireAuthorizationState();
  const client = LocalIamProtocolRuntimeStore.resolveAuthenticatedClient(realmId, payload, authorizationHeader);
  if (client.protocol !== 'OIDC') {
    throw new Error('Authorization code exchange only supports OIDC clients');
  }
  if (!client.standard_flow_enabled) {
    throw new Error('Client does not allow standard browser flow');
  }

  const codeValue = typeof payload.code === 'string' ? payload.code.trim() : '';
  const redirectUri = typeof payload.redirect_uri === 'string' ? payload.redirect_uri.trim() : '';
  const codeVerifier = typeof payload.code_verifier === 'string' ? payload.code_verifier.trim() : '';
  if (!codeValue || !redirectUri) {
    throw new Error('Missing authorization_code grant fields');
  }

  const code = state.authorization_codes.find(
    (candidate) => candidate.realm_id === realmId && candidate.code === codeValue,
  );
  if (!code || code.status !== 'ACTIVE') {
    throw new Error('Invalid authorization code');
  }
  if (Date.parse(code.expires_at) <= Date.now()) {
    code.status = 'EXPIRED';
    throw new Error('Authorization code has expired');
  }
  if (!LocalIamAuthenticationRuntimeStore.isAccountSessionActiveForRuntime(realmId, code.session_id)) {
    code.status = 'EXPIRED';
    throw new Error('Authorization code is bound to an inactive browser session');
  }
  if (code.client_id !== client.client_id) {
    throw new Error('Authorization code was not issued to this client');
  }
  if (code.redirect_uri !== redirectUri) {
    throw new Error('Redirect URI does not match the original authorization request');
  }
  if (code.code_challenge) {
    if (!codeVerifier) {
      throw new Error('code_verifier is required for this authorization code');
    }
    const expectedChallenge = computePkceChallenge(codeVerifier, code.code_challenge_method ?? 'plain');
    if (expectedChallenge !== code.code_challenge) {
      throw new Error('Invalid code_verifier');
    }
  } else if (client.access_type === 'PUBLIC') {
    throw new Error('Public clients require PKCE-bound authorization codes');
  }

  const response = await LocalIamProtocolRuntimeStore.issueAuthorizationCodeTokensAsync({
    realm_id: realmId,
    client_id: client.client_id,
    user_id: code.user_id,
    browser_session_id: code.session_id,
    requested_scope_names: code.requested_scope_names,
    requested_purpose: code.requested_purpose,
    base_url: baseUrl,
    nonce: code.nonce,
  });

  code.status = 'CONSUMED';
  code.consumed_at = nowIso();
  const request = state.authorization_requests.find((candidate) => candidate.id === code.authorization_request_id);
  if (request) {
    request.status = 'AUTHORIZED';
  }
  return response;
}

export const LocalIamAuthorizationRuntimeStore = {
  getSummary(): IamAuthorizationSummary {
    expireAuthorizationState();
    return {
      authorization_request_count: state.authorization_requests.length,
      active_authorization_request_count: state.authorization_requests.filter((record) => record.status === 'PENDING').length,
      authorization_code_count: state.authorization_codes.length,
      active_authorization_code_count: state.authorization_codes.filter((record) => record.status === 'ACTIVE').length,
    };
  },

  async createAuthorizationRedirectAsync(
    realmId: string,
    input: CreateIamAuthorizationRequestInput,
    uiBaseUrl: string,
  ): Promise<IamAuthorizationRedirectResponse> {
    return runWithDeferredPersistence(() => createAuthorizationRedirectRecord(realmId, input, uiBaseUrl));
  },

  getAuthorizationRequest(realmId: string, requestId: string): IamAuthorizationRequestDetailResponse {
    const request = assertActiveRequest(realmId, requestId);
    return {
      request: toPublicRequest(request),
      can_auto_continue: !request.prompt_values.includes('login'),
    };
  },

  async continueAuthorizationRequestAsync(
    realmId: string,
    requestId: string,
    sessionId: string,
  ): Promise<IamAuthorizationContinuationResponse> {
    return runWithDeferredPersistence(() => continueAuthorizationRequestRecordAsync(realmId, requestId, sessionId));
  },

  getAuthorizationCodeSessionContext(
    realmId: string,
    codeValue: string,
  ): IamAuthorizationCodeSessionContext {
    expireAuthorizationState();
    const normalizedCode = codeValue.trim();
    const code = state.authorization_codes.find(
      (candidate) => candidate.realm_id === realmId && candidate.code === normalizedCode,
    );
    if (!code) {
      throw new Error('Invalid authorization code');
    }
    return {
      authorization_request_id: code.authorization_request_id,
      client_id: code.client_id,
      user_id: code.user_id,
      session_id: code.session_id,
      redirect_uri: code.redirect_uri,
      requested_scope_names: clone(code.requested_scope_names),
      requested_purpose: code.requested_purpose,
      nonce: code.nonce,
    };
  },

  async exchangeAuthorizationCodeAsync(
    realmId: string,
    payload: Record<string, unknown>,
    authorizationHeader: string | null,
    baseUrl: string,
  ): Promise<IamTokenEndpointResponse> {
    return runWithDeferredPersistence(() => exchangeAuthorizationCodeRecordAsync(
      realmId,
      payload,
      authorizationHeader,
      baseUrl,
    ));
  },

  runTransientStateMaintenance(): IamAuthorizationTransientStateMaintenanceResult {
    return expireAuthorizationState();
  },

  async runTransientStateMaintenanceAsync(): Promise<IamAuthorizationTransientStateMaintenanceResult> {
    return runWithDeferredPersistence(() => this.runTransientStateMaintenance());
  },

  exportState(): Record<string, unknown> {
    expireAuthorizationState();
    return clone(state) as unknown as Record<string, unknown>;
  },

  importState(input: Record<string, unknown>): void {
    state = normalizeState(input as Partial<IamAuthorizationRuntimeState>);
    expireAuthorizationState();
    persistStateSyncOnly();
  },
};
