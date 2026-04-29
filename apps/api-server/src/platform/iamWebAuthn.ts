import { AsyncLocalStorage } from 'async_hooks';
import { createPublicKey, randomBytes, randomUUID, verify as verifySignature } from 'crypto';
import { LocalIamFoundationStore, type IamUserRecord } from './iamFoundation';
import { readPersistedStateSnapshot, reloadOrCreatePersistedStateAsync } from './persistence';
import {
  createPersistedAsyncIamStateRepository,
  createPersistedIamStateRepository,
  type IamAsyncStateRepository,
  type IamStateRepository,
} from './iamStateRepository';

const LEGACY_IAM_WEBAUTHN_FILE = 'iam-webauthn-state.json';
const IAM_WEBAUTHN_CREDENTIALS_FILE = 'iam-webauthn-credentials-state.json';
const IAM_WEBAUTHN_TRANSIENT_FILE = 'iam-webauthn-transient-state.json';
const WEBAUTHN_CHALLENGE_TTL_MS = 1000 * 60 * 10;

export type IamWebAuthnAlgorithm = 'ES256';
export type IamWebAuthnTransport = 'SOFTWARE' | 'INTERNAL' | 'HYBRID' | 'USB' | 'NFC' | 'BLE';
type IamSupportedWebAuthnTransport = Exclude<IamWebAuthnTransport, 'SOFTWARE'>;
export type IamWebAuthnAuthenticatorAttachment = 'PLATFORM' | 'CROSS_PLATFORM';
export type IamWebAuthnUserVerification = 'REQUIRED' | 'PREFERRED' | 'DISCOURAGED';
export type IamWebAuthnResidentKeyRequirement = 'REQUIRED' | 'PREFERRED' | 'DISCOURAGED';
export type IamWebAuthnAttestationConveyance = 'NONE' | 'DIRECT' | 'INDIRECT';

const SUPPORTED_WEBAUTHN_TRANSPORTS: IamSupportedWebAuthnTransport[] = ['INTERNAL', 'HYBRID', 'USB', 'NFC', 'BLE'];
const SUPPORTED_WEBAUTHN_AUTHENTICATOR_ATTACHMENTS: IamWebAuthnAuthenticatorAttachment[] = ['PLATFORM'];
const SUPPORTED_WEBAUTHN_USER_VERIFICATION: IamWebAuthnUserVerification = 'REQUIRED';
const SUPPORTED_WEBAUTHN_RESIDENT_KEY: IamWebAuthnResidentKeyRequirement = 'REQUIRED';
const SUPPORTED_WEBAUTHN_ATTESTATION: IamWebAuthnAttestationConveyance = 'NONE';

interface StoredIamWebAuthnCredential {
  id: string;
  realm_id: string;
  user_id: string;
  credential_id: string;
  device_label: string;
  public_key_jwk: Record<string, unknown>;
  algorithm: IamWebAuthnAlgorithm;
  transports: IamWebAuthnTransport[];
  authenticator_attachment: IamWebAuthnAuthenticatorAttachment;
  user_verification: IamWebAuthnUserVerification;
  created_at: string;
  last_used_at: string | null;
  disabled_at: string | null;
  sign_count: number;
  synthetic: boolean;
}

interface StoredIamWebAuthnRegistrationChallenge {
  id: string;
  realm_id: string;
  user_id: string;
  challenge: string;
  rp_id: string;
  rp_name: string;
  supported_origins: string[];
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
}

interface StoredIamWebAuthnAuthenticationChallenge {
  id: string;
  realm_id: string;
  user_id: string;
  username_or_email: string;
  client_id: string | null;
  requested_scope_names: string[];
  challenge: string;
  rp_id: string;
  rp_name: string;
  supported_origins: string[];
  allowed_credential_ids: string[];
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
}

interface IamWebAuthnState {
  credentials: StoredIamWebAuthnCredential[];
  registration_challenges: StoredIamWebAuthnRegistrationChallenge[];
  authentication_challenges: StoredIamWebAuthnAuthenticationChallenge[];
}

interface IamWebAuthnCredentialsState {
  credentials: StoredIamWebAuthnCredential[];
}

interface IamWebAuthnTransientState {
  registration_challenges: StoredIamWebAuthnRegistrationChallenge[];
  authentication_challenges: StoredIamWebAuthnAuthenticationChallenge[];
}

export interface IamWebAuthnSummary {
  credential_count: number;
  active_credential_count: number;
  registration_challenge_count: number;
  active_registration_challenge_count: number;
  authentication_challenge_count: number;
  active_authentication_challenge_count: number;
}

export interface IamWebAuthnTransientStateMaintenanceResult {
  expired_registration_challenge_count: number;
  expired_authentication_challenge_count: number;
  total_mutated_count: number;
}

export interface IamWebAuthnCredentialRecord {
  id: string;
  realm_id: string;
  user_id: string;
  username: string;
  email: string;
  credential_id: string;
  device_label: string;
  algorithm: IamWebAuthnAlgorithm;
  transports: IamWebAuthnTransport[];
  authenticator_attachment: IamWebAuthnAuthenticatorAttachment;
  user_verification: IamWebAuthnUserVerification;
  created_at: string;
  last_used_at: string | null;
  disabled_at: string | null;
  sign_count: number;
  status: 'ACTIVE' | 'REVOKED';
  synthetic: boolean;
}

export interface IamWebAuthnCredentialsResponse {
  generated_at: string;
  credentials: IamWebAuthnCredentialRecord[];
  count: number;
}

export interface BeginIamWebAuthnRegistrationResponse {
  challenge_id: string;
  realm_id: string;
  user_id: string;
  username: string;
  display_name: string;
  challenge: string;
  rp_id: string;
  rp_name: string;
  supported_origins: string[];
  authenticator_attachment: IamWebAuthnAuthenticatorAttachment;
  user_verification: IamWebAuthnUserVerification;
  resident_key: IamWebAuthnResidentKeyRequirement;
  attestation: IamWebAuthnAttestationConveyance;
  supported_transport_classes: IamSupportedWebAuthnTransport[];
  unsupported_transport_classes: IamWebAuthnTransport[];
  expires_at: string;
}

export interface CompleteIamWebAuthnRegistrationInput {
  challenge_id: string;
  credential_id: string;
  device_label: string;
  public_key_jwk: Record<string, unknown>;
  algorithm: IamWebAuthnAlgorithm;
  transports?: IamWebAuthnTransport[];
  authenticator_attachment?: IamWebAuthnAuthenticatorAttachment | null;
  user_verification?: IamWebAuthnUserVerification | null;
  rp_id: string;
  origin: string;
  proof_signature: string;
}

export interface BeginIamWebAuthnAuthenticationInput {
  username_or_email: string;
  client_id?: string | null;
  scope?: string[] | null;
}

export interface BeginIamWebAuthnAuthenticationResponse {
  challenge_id: string;
  realm_id: string;
  user_id: string;
  username: string;
  display_name: string;
  challenge: string;
  rp_id: string;
  rp_name: string;
  supported_origins: string[];
  authenticator_attachment: IamWebAuthnAuthenticatorAttachment;
  user_verification: IamWebAuthnUserVerification;
  client_id: string | null;
  requested_scope_names: string[];
  allowed_credentials: Array<{
    credential_id: string;
    device_label: string;
    transports: IamWebAuthnTransport[];
    last_used_at: string | null;
  }>;
  supported_transport_classes: IamSupportedWebAuthnTransport[];
  expires_at: string;
}

export interface CompleteIamWebAuthnAuthenticationInput {
  challenge_id: string;
  credential_id: string;
  user_verification?: IamWebAuthnUserVerification | null;
  rp_id: string;
  origin: string;
  proof_signature: string;
}

export interface CompleteIamWebAuthnAuthenticationResult {
  realm_id: string;
  user_id: string;
  username: string;
  client_id: string | null;
  requested_scope_names: string[];
  credential_id: string;
  authenticated_at: string;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString('base64url');
}

function base64UrlDecode(value: string): Buffer {
  return Buffer.from(value, 'base64url');
}

function deriveWebAuthnRpId(baseUrl?: string | null): string {
  const normalizedBaseUrl = baseUrl?.trim();
  if (!normalizedBaseUrl) {
    return 'localhost';
  }
  try {
    return new URL(normalizedBaseUrl).hostname;
  } catch {
    return 'localhost';
  }
}

function deriveWebAuthnSupportedOrigins(baseUrl?: string | null): string[] {
  const normalizedBaseUrl = baseUrl?.trim();
  if (!normalizedBaseUrl) {
    return ['http://localhost'];
  }
  try {
    const url = new URL(normalizedBaseUrl);
    return [`${url.protocol}//${url.host}`];
  } catch {
    return ['http://localhost'];
  }
}

function normalizeSupportedRegistrationTransports(
  transports: IamWebAuthnTransport[] | null | undefined,
): IamSupportedWebAuthnTransport[] {
  const normalized = Array.isArray(transports)
    ? Array.from(new Set(transports.map((transport) => transport?.trim() as IamWebAuthnTransport).filter(Boolean)))
    : [];
  if (normalized.length === 0) {
    throw new Error('Passkey registration requires at least one declared supported transport');
  }
  if (normalized.includes('SOFTWARE')) {
    throw new Error('Software-backed passkey transports are not supported in the current bounded profile');
  }
  const unsupported = normalized.filter(
    (transport): transport is IamWebAuthnTransport => !SUPPORTED_WEBAUTHN_TRANSPORTS.includes(transport as IamSupportedWebAuthnTransport),
  );
  if (unsupported.length > 0) {
    throw new Error(`Unsupported passkey transport declaration: ${unsupported.join(', ')}`);
  }
  return normalized as IamSupportedWebAuthnTransport[];
}

function validateSupportedWebAuthnAlgorithm(algorithm: IamWebAuthnAlgorithm): void {
  if (algorithm !== 'ES256') {
    throw new Error(`Unsupported passkey algorithm: ${algorithm}`);
  }
}

function normalizeSupportedAuthenticatorAttachment(
  attachment?: IamWebAuthnAuthenticatorAttachment | null,
): IamWebAuthnAuthenticatorAttachment {
  const normalized = attachment?.trim().toUpperCase() as IamWebAuthnAuthenticatorAttachment | undefined;
  if (!normalized) {
    return 'PLATFORM';
  }
  if (!SUPPORTED_WEBAUTHN_AUTHENTICATOR_ATTACHMENTS.includes(normalized)) {
    throw new Error(`Unsupported passkey authenticator attachment: ${attachment}`);
  }
  return normalized;
}

function normalizeSupportedUserVerification(
  userVerification?: IamWebAuthnUserVerification | null,
): IamWebAuthnUserVerification {
  const normalized = userVerification?.trim().toUpperCase() as IamWebAuthnUserVerification | undefined;
  if (!normalized) {
    return SUPPORTED_WEBAUTHN_USER_VERIFICATION;
  }
  if (normalized !== SUPPORTED_WEBAUTHN_USER_VERIFICATION) {
    throw new Error(`Unsupported passkey user verification policy: ${userVerification}`);
  }
  return normalized;
}

function normalizeOrigin(value: string | null | undefined): string {
  const normalizedValue = value?.trim();
  if (!normalizedValue) {
    return '';
  }
  try {
    const url = new URL(normalizedValue);
    return `${url.protocol}//${url.host}`;
  } catch {
    return '';
  }
}

function assertChallengeRpBinding(
  challenge: { rp_id: string; supported_origins: string[] },
  input: { rp_id: string; origin: string },
): void {
  const normalizedRpId = input.rp_id?.trim();
  if (!normalizedRpId) {
    throw new Error('rp_id is required');
  }
  if (normalizedRpId !== challenge.rp_id) {
    throw new Error('Passkey ceremony rp_id does not match the issued challenge');
  }
  const normalizedOrigin = normalizeOrigin(input.origin);
  if (!normalizedOrigin) {
    throw new Error('origin is required');
  }
  if (!challenge.supported_origins.includes(normalizedOrigin)) {
    throw new Error('Passkey ceremony origin is not allowed for the issued challenge');
  }
}

function normalizeState(input: Partial<IamWebAuthnState>): IamWebAuthnState {
  return {
    credentials: Array.isArray(input.credentials) ? input.credentials : [],
    registration_challenges: Array.isArray(input.registration_challenges) ? input.registration_challenges : [],
    authentication_challenges: Array.isArray(input.authentication_challenges) ? input.authentication_challenges : [],
  };
}

function normalizeCredentialsState(input: Partial<IamWebAuthnCredentialsState>): IamWebAuthnCredentialsState {
  return {
    credentials: Array.isArray(input.credentials) ? input.credentials : [],
  };
}

function normalizeTransientState(input: Partial<IamWebAuthnTransientState>): IamWebAuthnTransientState {
  return {
    registration_challenges: Array.isArray(input.registration_challenges) ? input.registration_challenges : [],
    authentication_challenges: Array.isArray(input.authentication_challenges) ? input.authentication_challenges : [],
  };
}

function combineState(
  credentialsState: IamWebAuthnCredentialsState,
  transientState: IamWebAuthnTransientState,
): IamWebAuthnState {
  return {
    credentials: clone(credentialsState.credentials),
    registration_challenges: clone(transientState.registration_challenges),
    authentication_challenges: clone(transientState.authentication_challenges),
  };
}

function splitCredentialsState(input: IamWebAuthnState): IamWebAuthnCredentialsState {
  return {
    credentials: clone(input.credentials),
  };
}

function splitTransientState(input: IamWebAuthnState): IamWebAuthnTransientState {
  return {
    registration_challenges: clone(input.registration_challenges),
    authentication_challenges: clone(input.authentication_challenges),
  };
}

function readLegacyWebAuthnStateSnapshot(): IamWebAuthnState {
  return normalizeState(
    readPersistedStateSnapshot<Partial<IamWebAuthnState>>(LEGACY_IAM_WEBAUTHN_FILE) ?? {},
  );
}

interface IamWebAuthnCredentialsRepository extends IamStateRepository<IamWebAuthnCredentialsState> {}
interface IamWebAuthnTransientRepository extends IamStateRepository<IamWebAuthnTransientState> {}

const webAuthnCredentialsRepository: IamWebAuthnCredentialsRepository = createPersistedIamStateRepository<
  Partial<IamWebAuthnCredentialsState>,
  IamWebAuthnCredentialsState
>({
  fileName: IAM_WEBAUTHN_CREDENTIALS_FILE,
  seedFactory: () => normalizeCredentialsState(readLegacyWebAuthnStateSnapshot()),
  normalize: normalizeCredentialsState,
});

const webAuthnTransientRepository: IamWebAuthnTransientRepository = createPersistedIamStateRepository<
  Partial<IamWebAuthnTransientState>,
  IamWebAuthnTransientState
>({
  fileName: IAM_WEBAUTHN_TRANSIENT_FILE,
  seedFactory: () => normalizeTransientState(readLegacyWebAuthnStateSnapshot()),
  normalize: normalizeTransientState,
});

const webAuthnCredentialsAsyncStateRepository: IamAsyncStateRepository<IamWebAuthnCredentialsState> = createPersistedAsyncIamStateRepository<
  Partial<IamWebAuthnCredentialsState>,
  IamWebAuthnCredentialsState
>({
  fileName: IAM_WEBAUTHN_CREDENTIALS_FILE,
  seedFactory: () => normalizeCredentialsState(readLegacyWebAuthnStateSnapshot()),
  normalize: normalizeCredentialsState,
});

const webAuthnTransientAsyncStateRepository: IamAsyncStateRepository<IamWebAuthnTransientState> = createPersistedAsyncIamStateRepository<
  Partial<IamWebAuthnTransientState>,
  IamWebAuthnTransientState
>({
  fileName: IAM_WEBAUTHN_TRANSIENT_FILE,
  seedFactory: () => normalizeTransientState(readLegacyWebAuthnStateSnapshot()),
  normalize: normalizeTransientState,
});

const state = combineState(
  webAuthnCredentialsRepository.load(),
  webAuthnTransientRepository.load(),
);
const deferredPersistenceContext = new AsyncLocalStorage<{ dirty: boolean }>();

async function loadStateAsync(): Promise<IamWebAuthnState> {
  const [credentialsState, transientState] = await Promise.all([
    reloadOrCreatePersistedStateAsync<Partial<IamWebAuthnCredentialsState>>(
      IAM_WEBAUTHN_CREDENTIALS_FILE,
      () => normalizeCredentialsState(readLegacyWebAuthnStateSnapshot()),
    ),
    reloadOrCreatePersistedStateAsync<Partial<IamWebAuthnTransientState>>(
      IAM_WEBAUTHN_TRANSIENT_FILE,
      () => normalizeTransientState(readLegacyWebAuthnStateSnapshot()),
    ),
  ]);
  return combineState(
    normalizeCredentialsState(credentialsState),
    normalizeTransientState(transientState),
  );
}

function syncInMemoryState(nextState: IamWebAuthnState): void {
  state.credentials = clone(nextState.credentials);
  state.registration_challenges = clone(nextState.registration_challenges);
  state.authentication_challenges = clone(nextState.authentication_challenges);
}

function persistStateSyncOnly(): void {
  const deferredContext = deferredPersistenceContext.getStore();
  if (deferredContext) {
    deferredContext.dirty = true;
    return;
  }
  webAuthnCredentialsRepository.save(splitCredentialsState(state));
  webAuthnTransientRepository.save(splitTransientState(state));
}

async function persistStateAsync(): Promise<void> {
  await webAuthnCredentialsAsyncStateRepository.save(splitCredentialsState(state));
  await webAuthnTransientAsyncStateRepository.save(splitTransientState(state));
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

function getUserById(realmId: string, userId: string): IamUserRecord {
  const user = LocalIamFoundationStore.listUsers({ realm_id: realmId }).users.find((candidate) => candidate.id === userId);
  if (!user) {
    throw new Error(`Unknown IAM user in realm ${realmId}: ${userId}`);
  }
  return user;
}

function getUserByIdentifier(realmId: string, identifier: string): IamUserRecord {
  const normalized = identifier.trim().toLowerCase();
  const user = LocalIamFoundationStore.listUsers({ realm_id: realmId }).users.find(
    (candidate) =>
      candidate.username.toLowerCase() === normalized
      || candidate.email.toLowerCase() === normalized,
  );
  if (!user) {
    throw new Error('Unknown IAM user');
  }
  return user;
}

function credentialStatus(credential: StoredIamWebAuthnCredential): 'ACTIVE' | 'REVOKED' {
  return credential.disabled_at ? 'REVOKED' : 'ACTIVE';
}

function isChallengeActive(record: { expires_at: string; consumed_at: string | null }): boolean {
  return !record.consumed_at && Date.parse(record.expires_at) > Date.now();
}

function cleanupExpiredChallenges(): IamWebAuthnTransientStateMaintenanceResult {
  let expiredRegistrationChallengeCount = 0;
  let expiredAuthenticationChallengeCount = 0;
  for (const challenge of state.registration_challenges) {
    if (!challenge.consumed_at && Date.parse(challenge.expires_at) <= Date.now()) {
      challenge.consumed_at = challenge.expires_at;
      expiredRegistrationChallengeCount += 1;
    }
  }
  for (const challenge of state.authentication_challenges) {
    if (!challenge.consumed_at && Date.parse(challenge.expires_at) <= Date.now()) {
      challenge.consumed_at = challenge.expires_at;
      expiredAuthenticationChallengeCount += 1;
    }
  }
  if (expiredRegistrationChallengeCount > 0 || expiredAuthenticationChallengeCount > 0) {
    persistStateSyncOnly();
  }
  return {
    expired_registration_challenge_count: expiredRegistrationChallengeCount,
    expired_authentication_challenge_count: expiredAuthenticationChallengeCount,
    total_mutated_count: expiredRegistrationChallengeCount + expiredAuthenticationChallengeCount,
  };
}

function buildRegistrationPayload(realmId: string, userId: string, challengeId: string, challenge: string, credentialId: string): string {
  return `idp-iam-passkey:register:${realmId}:${userId}:${challengeId}:${challenge}:${credentialId}`;
}

function buildAuthenticationPayload(realmId: string, userId: string, challengeId: string, challenge: string, credentialId: string): string {
  return `idp-iam-passkey:authenticate:${realmId}:${userId}:${challengeId}:${challenge}:${credentialId}`;
}

function assertValidSignature(publicKeyJwk: Record<string, unknown>, payload: string, signature: string): void {
  const key = createPublicKey({ key: publicKeyJwk, format: 'jwk' });
  const signatureBuffer = base64UrlDecode(signature);
  const payloadBuffer = Buffer.from(payload, 'utf8');
  const verifiedDer = verifySignature('sha256', payloadBuffer, key, signatureBuffer);
  const verifiedP1363 = verifySignature('sha256', payloadBuffer, { key, dsaEncoding: 'ieee-p1363' }, signatureBuffer);
  if (!verifiedDer && !verifiedP1363) {
    throw new Error('Invalid passkey signature');
  }
}

function assertRegistrationChallenge(realmId: string, userId: string, challengeId: string): StoredIamWebAuthnRegistrationChallenge {
  cleanupExpiredChallenges();
  const challenge = state.registration_challenges.find(
    (candidate) => candidate.id === challengeId && candidate.realm_id === realmId && candidate.user_id === userId,
  );
  if (!challenge || !isChallengeActive(challenge)) {
    throw new Error('Passkey registration challenge is not active');
  }
  return challenge;
}

function assertAuthenticationChallenge(realmId: string, challengeId: string): StoredIamWebAuthnAuthenticationChallenge {
  cleanupExpiredChallenges();
  const challenge = state.authentication_challenges.find(
    (candidate) => candidate.id === challengeId && candidate.realm_id === realmId,
  );
  if (!challenge || !isChallengeActive(challenge)) {
    throw new Error('Passkey authentication challenge is not active');
  }
  return challenge;
}

function toPublicCredential(credential: StoredIamWebAuthnCredential): IamWebAuthnCredentialRecord {
  const user = getUserById(credential.realm_id, credential.user_id);
  return {
    id: credential.id,
    realm_id: credential.realm_id,
    user_id: credential.user_id,
    username: user.username,
    email: user.email,
    credential_id: credential.credential_id,
    device_label: credential.device_label,
    algorithm: credential.algorithm,
    transports: [...credential.transports],
    authenticator_attachment: credential.authenticator_attachment,
    user_verification: credential.user_verification,
    created_at: credential.created_at,
    last_used_at: credential.last_used_at,
    disabled_at: credential.disabled_at,
    sign_count: credential.sign_count,
    status: credentialStatus(credential),
    synthetic: credential.synthetic,
  };
}

export const LocalIamWebAuthnStore = {
  getSummary(): IamWebAuthnSummary {
    cleanupExpiredChallenges();
    return {
      credential_count: state.credentials.length,
      active_credential_count: state.credentials.filter((candidate) => !candidate.disabled_at).length,
      registration_challenge_count: state.registration_challenges.length,
      active_registration_challenge_count: state.registration_challenges.filter(isChallengeActive).length,
      authentication_challenge_count: state.authentication_challenges.length,
      active_authentication_challenge_count: state.authentication_challenges.filter(isChallengeActive).length,
    };
  },

  listCredentials(filters?: { realm_id?: string | null; user_id?: string | null }): IamWebAuthnCredentialsResponse {
    cleanupExpiredChallenges();
    let credentials = [...state.credentials];
    if (filters?.realm_id) {
      credentials = credentials.filter((candidate) => candidate.realm_id === filters.realm_id);
    }
    if (filters?.user_id) {
      credentials = credentials.filter((candidate) => candidate.user_id === filters.user_id);
    }
    credentials.sort((left, right) => right.created_at.localeCompare(left.created_at));
    return {
      generated_at: nowIso(),
      credentials: credentials.map(toPublicCredential),
      count: credentials.length,
    };
  },

  getActiveCredentialCount(realmId: string, userId: string): number {
    cleanupExpiredChallenges();
    return state.credentials.filter(
      (candidate) => candidate.realm_id === realmId && candidate.user_id === userId && !candidate.disabled_at,
    ).length;
  },

  beginRegistration(
    realmId: string,
    userId: string,
    options?: {
      rp_id?: string | null;
      rp_name?: string | null;
      supported_origins?: string[] | null;
    },
  ): BeginIamWebAuthnRegistrationResponse {
    const user = getUserById(realmId, userId);
    const challenge: StoredIamWebAuthnRegistrationChallenge = {
      id: `iam-passkey-register-${randomUUID()}`,
      realm_id: realmId,
      user_id: userId,
      challenge: base64UrlEncode(randomBytes(32)),
      rp_id: options?.rp_id?.trim() || 'localhost',
      rp_name: options?.rp_name?.trim() || 'Standalone Identity Platform',
      supported_origins: Array.isArray(options?.supported_origins) && options!.supported_origins!.length > 0
        ? Array.from(new Set(options!.supported_origins!.map((origin) => origin.trim()).filter(Boolean)))
        : ['http://localhost'],
      created_at: nowIso(),
      expires_at: new Date(Date.now() + WEBAUTHN_CHALLENGE_TTL_MS).toISOString(),
      consumed_at: null,
    };
    state.registration_challenges = state.registration_challenges.filter(
      (candidate) => !(candidate.realm_id === realmId && candidate.user_id === userId && isChallengeActive(candidate)),
    );
    state.registration_challenges.push(challenge);
    persistStateSyncOnly();
    return {
      challenge_id: challenge.id,
      realm_id: realmId,
      user_id: user.id,
      username: user.username,
      display_name: `${user.first_name} ${user.last_name}`.trim() || user.username,
      challenge: challenge.challenge,
      rp_id: challenge.rp_id,
      rp_name: challenge.rp_name,
      supported_origins: [...challenge.supported_origins],
      authenticator_attachment: 'PLATFORM',
      user_verification: SUPPORTED_WEBAUTHN_USER_VERIFICATION,
      resident_key: SUPPORTED_WEBAUTHN_RESIDENT_KEY,
      attestation: SUPPORTED_WEBAUTHN_ATTESTATION,
      supported_transport_classes: [...SUPPORTED_WEBAUTHN_TRANSPORTS],
      unsupported_transport_classes: ['SOFTWARE'],
      expires_at: challenge.expires_at,
    };
  },

  async beginRegistrationAsync(
    realmId: string,
    userId: string,
    options?: {
      rp_id?: string | null;
      rp_name?: string | null;
      supported_origins?: string[] | null;
    },
  ): Promise<BeginIamWebAuthnRegistrationResponse> {
    return runWithDeferredPersistence(() => this.beginRegistration(realmId, userId, options));
  },

  completeRegistration(realmId: string, userId: string, input: CompleteIamWebAuthnRegistrationInput): IamWebAuthnCredentialRecord {
    const challenge = assertRegistrationChallenge(realmId, userId, input.challenge_id);
    const deviceLabel = input.device_label?.trim();
    if (!input.credential_id?.trim()) {
      throw new Error('credential_id is required');
    }
    if (!deviceLabel) {
      throw new Error('device_label is required');
    }
    if (!input.public_key_jwk || typeof input.public_key_jwk !== 'object') {
      throw new Error('public_key_jwk is required');
    }
    if (!input.proof_signature?.trim()) {
      throw new Error('proof_signature is required');
    }
    assertChallengeRpBinding(challenge, {
      rp_id: input.rp_id,
      origin: input.origin,
    });
    validateSupportedWebAuthnAlgorithm(input.algorithm);
    const supportedTransports = normalizeSupportedRegistrationTransports(input.transports);
    const authenticatorAttachment = normalizeSupportedAuthenticatorAttachment(input.authenticator_attachment);
    const userVerification = normalizeSupportedUserVerification(input.user_verification);
    const existing = state.credentials.find(
      (candidate) => candidate.realm_id === realmId && candidate.credential_id === input.credential_id.trim() && !candidate.disabled_at,
    );
    if (existing) {
      throw new Error('Passkey credential already exists in this realm');
    }
    const payload = buildRegistrationPayload(realmId, userId, challenge.id, challenge.challenge, input.credential_id.trim());
    assertValidSignature(input.public_key_jwk, payload, input.proof_signature);

    const record: StoredIamWebAuthnCredential = {
      id: `iam-passkey-${randomUUID()}`,
      realm_id: realmId,
      user_id: userId,
      credential_id: input.credential_id.trim(),
      device_label: deviceLabel,
      public_key_jwk: clone(input.public_key_jwk),
      algorithm: input.algorithm,
      transports: [...supportedTransports],
      authenticator_attachment: authenticatorAttachment,
      user_verification: userVerification,
      created_at: nowIso(),
      last_used_at: null,
      disabled_at: null,
      sign_count: 0,
      synthetic: true,
    };
    state.credentials.push(record);
    challenge.consumed_at = nowIso();
    persistStateSyncOnly();
    return toPublicCredential(record);
  },

  async completeRegistrationAsync(
    realmId: string,
    userId: string,
    input: CompleteIamWebAuthnRegistrationInput,
  ): Promise<IamWebAuthnCredentialRecord> {
    return runWithDeferredPersistence(() => this.completeRegistration(realmId, userId, input));
  },

  beginAuthentication(
    realmId: string,
    input: BeginIamWebAuthnAuthenticationInput,
    options?: {
      rp_id?: string | null;
      rp_name?: string | null;
      supported_origins?: string[] | null;
    },
  ): BeginIamWebAuthnAuthenticationResponse {
    if (!input.username_or_email?.trim()) {
      throw new Error('username_or_email is required');
    }
    const user = getUserByIdentifier(realmId, input.username_or_email);
    if (user.status !== 'ACTIVE') {
      throw new Error('User is not active');
    }
    const credentials = state.credentials.filter(
      (candidate) =>
        candidate.realm_id === realmId
        && candidate.user_id === user.id
        && !candidate.disabled_at
        && candidate.transports.every((transport) => SUPPORTED_WEBAUTHN_TRANSPORTS.includes(transport as IamSupportedWebAuthnTransport)),
    );
    if (credentials.length === 0) {
      throw new Error('No active passkeys are registered for this account');
    }
    const requestedScopeNames = Array.from(new Set((input.scope ?? []).map((scope) => scope.trim()).filter(Boolean))).sort();
    const challenge: StoredIamWebAuthnAuthenticationChallenge = {
      id: `iam-passkey-auth-${randomUUID()}`,
      realm_id: realmId,
      user_id: user.id,
      username_or_email: input.username_or_email.trim(),
      client_id: input.client_id?.trim() || null,
      requested_scope_names: requestedScopeNames,
      challenge: base64UrlEncode(randomBytes(32)),
      rp_id: options?.rp_id?.trim() || 'localhost',
      rp_name: options?.rp_name?.trim() || 'Standalone Identity Platform',
      supported_origins: Array.isArray(options?.supported_origins) && options!.supported_origins!.length > 0
        ? Array.from(new Set(options!.supported_origins!.map((origin) => origin.trim()).filter(Boolean)))
        : ['http://localhost'],
      allowed_credential_ids: credentials.map((credential) => credential.credential_id),
      created_at: nowIso(),
      expires_at: new Date(Date.now() + WEBAUTHN_CHALLENGE_TTL_MS).toISOString(),
      consumed_at: null,
    };
    state.authentication_challenges.push(challenge);
    persistStateSyncOnly();
    return {
      challenge_id: challenge.id,
      realm_id: realmId,
      user_id: user.id,
      username: user.username,
      display_name: `${user.first_name} ${user.last_name}`.trim() || user.username,
      challenge: challenge.challenge,
      rp_id: challenge.rp_id,
      rp_name: challenge.rp_name,
      supported_origins: [...challenge.supported_origins],
      authenticator_attachment: 'PLATFORM',
      user_verification: SUPPORTED_WEBAUTHN_USER_VERIFICATION,
      client_id: challenge.client_id,
      requested_scope_names: [...challenge.requested_scope_names],
      allowed_credentials: credentials.map((credential) => ({
        credential_id: credential.credential_id,
        device_label: credential.device_label,
        transports: [...credential.transports],
        last_used_at: credential.last_used_at,
      })),
      supported_transport_classes: [...SUPPORTED_WEBAUTHN_TRANSPORTS],
      expires_at: challenge.expires_at,
    };
  },

  async beginAuthenticationAsync(
    realmId: string,
    input: BeginIamWebAuthnAuthenticationInput,
    options?: {
      rp_id?: string | null;
      rp_name?: string | null;
      supported_origins?: string[] | null;
    },
  ): Promise<BeginIamWebAuthnAuthenticationResponse> {
    return runWithDeferredPersistence(() => this.beginAuthentication(realmId, input, options));
  },

  getAuthenticationChallengeContext(realmId: string, challengeId: string): {
    user_id: string;
    username_or_email: string;
    client_id: string | null;
  } | null {
    cleanupExpiredChallenges();
    const challenge = state.authentication_challenges.find(
      (candidate) => candidate.id === challengeId && candidate.realm_id === realmId && isChallengeActive(candidate),
    );
    if (!challenge) {
      return null;
    }
    return {
      user_id: challenge.user_id,
      username_or_email: challenge.username_or_email,
      client_id: challenge.client_id,
    };
  },

  completeAuthentication(realmId: string, input: CompleteIamWebAuthnAuthenticationInput): CompleteIamWebAuthnAuthenticationResult {
    const challenge = assertAuthenticationChallenge(realmId, input.challenge_id);
    if (!input.credential_id?.trim()) {
      throw new Error('credential_id is required');
    }
    if (!input.proof_signature?.trim()) {
      throw new Error('proof_signature is required');
    }
    normalizeSupportedUserVerification(input.user_verification);
    assertChallengeRpBinding(challenge, {
      rp_id: input.rp_id,
      origin: input.origin,
    });
    if (!challenge.allowed_credential_ids.includes(input.credential_id.trim())) {
      throw new Error('Passkey credential is not allowed for this challenge');
    }
    const credential = state.credentials.find(
      (candidate) =>
        candidate.realm_id === realmId
        && candidate.user_id === challenge.user_id
        && candidate.credential_id === input.credential_id.trim()
        && !candidate.disabled_at,
    );
    if (!credential) {
      throw new Error('Unknown active passkey credential');
    }
    const payload = buildAuthenticationPayload(realmId, challenge.user_id, challenge.id, challenge.challenge, credential.credential_id);
    assertValidSignature(credential.public_key_jwk, payload, input.proof_signature);
    credential.last_used_at = nowIso();
    credential.sign_count += 1;
    challenge.consumed_at = nowIso();
    persistStateSyncOnly();
    const user = getUserById(realmId, challenge.user_id);
    return {
      realm_id: realmId,
      user_id: user.id,
      username: user.username,
      client_id: challenge.client_id,
      requested_scope_names: [...challenge.requested_scope_names],
      credential_id: credential.credential_id,
      authenticated_at: credential.last_used_at,
    };
  },

  async completeAuthenticationAsync(
    realmId: string,
    input: CompleteIamWebAuthnAuthenticationInput,
  ): Promise<CompleteIamWebAuthnAuthenticationResult> {
    return runWithDeferredPersistence(() => this.completeAuthentication(realmId, input));
  },

  revokeCredential(realmId: string, userId: string, credentialId: string): IamWebAuthnCredentialRecord {
    const credential = state.credentials.find(
      (candidate) => candidate.realm_id === realmId && candidate.user_id === userId && candidate.id === credentialId,
    );
    if (!credential) {
      throw new Error('Unknown passkey credential');
    }
    credential.disabled_at = credential.disabled_at ?? nowIso();
    persistStateSyncOnly();
    return toPublicCredential(credential);
  },

  async revokeCredentialAsync(realmId: string, userId: string, credentialId: string): Promise<IamWebAuthnCredentialRecord> {
    return runWithDeferredPersistence(() => this.revokeCredential(realmId, userId, credentialId));
  },

  runTransientStateMaintenance(): IamWebAuthnTransientStateMaintenanceResult {
    return cleanupExpiredChallenges();
  },

  async runTransientStateMaintenanceAsync(): Promise<IamWebAuthnTransientStateMaintenanceResult> {
    return runWithDeferredPersistence(() => this.runTransientStateMaintenance());
  },

  exportState(): Record<string, unknown> {
    cleanupExpiredChallenges();
    return clone(state) as unknown as Record<string, unknown>;
  },

  importState(input: Record<string, unknown>): void {
    const nextState = normalizeState(input as Partial<IamWebAuthnState>);
    state.credentials = nextState.credentials;
    state.registration_challenges = nextState.registration_challenges;
    state.authentication_challenges = nextState.authentication_challenges;
    persistStateSyncOnly();
  },

  deriveRpProfile(baseUrl?: string | null): {
    rp_id: string;
    rp_name: string;
    supported_origins: string[];
  } {
    return {
      rp_id: deriveWebAuthnRpId(baseUrl),
      rp_name: 'Standalone Identity Platform',
      supported_origins: deriveWebAuthnSupportedOrigins(baseUrl),
    };
  },
};
