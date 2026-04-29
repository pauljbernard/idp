import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { loadOrCreatePersistedState, savePersistedState } from './persistence';

export type ManagedSecretKind =
  | 'developer_api_key'
  | 'webhook_signing_secret'
  | 'totp_seed'
  | 'backup_code_bundle'
  | 'password_hash'
  | 'integration_credential';

export type SecretStoreProvider = 'LOCAL_ENCRYPTED_FILE';
export type SecretKeySource = 'ENV_CONFIGURED' | 'DEVELOPMENT_FALLBACK';

type SecretStatus = 'ACTIVE' | 'DISABLED';

interface StoredManagedSecret {
  id: string;
  tenant_id: string | null;
  subject_type: string;
  subject_id: string;
  kind: ManagedSecretKind;
  label: string;
  provider: SecretStoreProvider;
  preview: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  last_rotated_at: string;
  version: number;
  status: SecretStatus;
  key_source: SecretKeySource;
  algorithm: 'aes-256-gcm';
  checksum_sha256: string;
  iv_base64: string;
  auth_tag_base64: string;
  ciphertext_base64: string;
}

interface SecretStoreState {
  secrets_by_id: Record<string, StoredManagedSecret>;
}

export interface ManagedSecretReference {
  id: string;
  tenant_id: string | null;
  subject_type: string;
  subject_id: string;
  kind: ManagedSecretKind;
  label: string;
  provider: SecretStoreProvider;
  preview: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  last_rotated_at: string;
  version: number;
  status: SecretStatus;
  key_source: SecretKeySource;
}

export interface SecretStoreSummary {
  provider: SecretStoreProvider;
  encryption: 'AES-256-GCM';
  key_source: SecretKeySource;
  managed_secret_count: number;
  active_secret_count: number;
  disabled_secret_count: number;
}

interface StoreSecretInput {
  tenantId?: string | null;
  subjectType: string;
  subjectId: string;
  kind: ManagedSecretKind;
  label: string;
  value: string;
  createdByUserId: string;
  preview?: string | null;
  createdAt?: string;
}

interface GenerateSecretInput {
  tenantId?: string | null;
  subjectType: string;
  subjectId: string;
  kind: ManagedSecretKind;
  label: string;
  prefix: string;
  createdByUserId: string;
  createdAt?: string;
  lengthBytes?: number;
}

interface UpsertSecretInput extends StoreSecretInput {}

const SECRET_STORE_STATE_FILE = 'secret-store-state.json';

const secretStoreState = loadOrCreatePersistedState<SecretStoreState>(SECRET_STORE_STATE_FILE, () => ({
  secrets_by_id: {}
}));

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeTenantId(value?: string | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeNonEmptyString(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`Missing required field: ${fieldName}`);
  }

  return normalized;
}

function getKeyMaterial(): { key: Buffer; keySource: SecretKeySource } {
  const configuredSecret = process.env.IDP_LOCAL_SECRET_KEY ?? process.env.IDP_SECRET_KEY;
  if (!configuredSecret && process.env.NODE_ENV === 'production') {
    throw new Error(
      'Missing IDP_LOCAL_SECRET_KEY (or IDP_SECRET_KEY). Secret store encryption keys must be configured in production.',
    );
  }
  const keySource: SecretKeySource = configuredSecret ? 'ENV_CONFIGURED' : 'DEVELOPMENT_FALLBACK';
  const seed = configuredSecret ?? 'idp-local-secret-store-development-key';
  return {
    key: createHash('sha256').update(seed).digest(),
    keySource
  };
}

function checksumSha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function encryptValue(value: string): {
  ivBase64: string;
  authTagBase64: string;
  ciphertextBase64: string;
  checksum: string;
  keySource: SecretKeySource;
} {
  const { key, keySource } = getKeyMaterial();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ivBase64: iv.toString('base64'),
    authTagBase64: authTag.toString('base64'),
    ciphertextBase64: encrypted.toString('base64'),
    checksum: checksumSha256(value),
    keySource
  };
}

function decryptValue(secret: StoredManagedSecret): string {
  const { key } = getKeyMaterial();
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(secret.iv_base64, 'base64')
  );
  decipher.setAuthTag(Buffer.from(secret.auth_tag_base64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(secret.ciphertext_base64, 'base64')),
    decipher.final()
  ]).toString('utf8');
}

function makePreview(value: string, fallbackLabel: string): string {
  const normalizedLabel = fallbackLabel
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'secret';

  const lastFragment = value.slice(-6) || 'xxxxxx';
  return `${normalizedLabel}_${lastFragment}_****`;
}

function persistSecretStoreState(): void {
  savePersistedState(SECRET_STORE_STATE_FILE, secretStoreState);
}

function toReference(secret: StoredManagedSecret): ManagedSecretReference {
  const {
    id,
    tenant_id,
    subject_type,
    subject_id,
    kind,
    label,
    provider,
    preview,
    created_by_user_id,
    created_at,
    updated_at,
    last_rotated_at,
    version,
    status,
    key_source
  } = secret;

  return {
    id,
    tenant_id,
    subject_type,
    subject_id,
    kind,
    label,
    provider,
    preview,
    created_by_user_id,
    created_at,
    updated_at,
    last_rotated_at,
    version,
    status,
    key_source
  };
}

function buildGeneratedSecretValue(prefix: string, lengthBytes: number = 24): string {
  const normalizedPrefix = normalizeNonEmptyString(prefix, 'prefix').replace(/[^a-zA-Z0-9_]/g, '_');
  return `${normalizedPrefix}_${randomBytes(Math.max(12, lengthBytes)).toString('base64url')}`;
}

function createStoredSecret(input: StoreSecretInput): StoredManagedSecret {
  const createdAt = input.createdAt ?? nowIso();
  const value = normalizeNonEmptyString(input.value, 'value');
  const encrypted = encryptValue(value);

  return {
    id: `secret-${randomBytes(8).toString('hex')}`,
    tenant_id: normalizeTenantId(input.tenantId),
    subject_type: normalizeNonEmptyString(input.subjectType, 'subjectType'),
    subject_id: normalizeNonEmptyString(input.subjectId, 'subjectId'),
    kind: input.kind,
    label: normalizeNonEmptyString(input.label, 'label'),
    provider: 'LOCAL_ENCRYPTED_FILE',
    preview: input.preview ?? makePreview(value, input.label),
    created_by_user_id: normalizeNonEmptyString(input.createdByUserId, 'createdByUserId'),
    created_at: createdAt,
    updated_at: createdAt,
    last_rotated_at: createdAt,
    version: 1,
    status: 'ACTIVE',
    key_source: encrypted.keySource,
    algorithm: 'aes-256-gcm',
    checksum_sha256: encrypted.checksum,
    iv_base64: encrypted.ivBase64,
    auth_tag_base64: encrypted.authTagBase64,
    ciphertext_base64: encrypted.ciphertextBase64
  };
}

function listStoredSecrets(): StoredManagedSecret[] {
  return Object.values(secretStoreState.secrets_by_id);
}

function findActiveSecretBySubject(subjectType: string, subjectId: string, kind: ManagedSecretKind): StoredManagedSecret | null {
  return (
    listStoredSecrets()
      .filter((secret) => secret.status === 'ACTIVE')
      .find(
        (secret) => secret.subject_type === subjectType && secret.subject_id === subjectId && secret.kind === kind
      ) ?? null
  );
}

function replaceSecretValue(secret: StoredManagedSecret, value: string, preview?: string | null): StoredManagedSecret {
  const rotatedAt = nowIso();
  const encrypted = encryptValue(value);

  secret.preview = preview ?? makePreview(value, secret.label);
  secret.updated_at = rotatedAt;
  secret.last_rotated_at = rotatedAt;
  secret.version += 1;
  secret.key_source = encrypted.keySource;
  secret.checksum_sha256 = encrypted.checksum;
  secret.iv_base64 = encrypted.ivBase64;
  secret.auth_tag_base64 = encrypted.authTagBase64;
  secret.ciphertext_base64 = encrypted.ciphertextBase64;
  secret.status = 'ACTIVE';

  persistSecretStoreState();
  return secret;
}

export class LocalSecretStore {
  static getSummary(): SecretStoreSummary {
    const secrets = listStoredSecrets();
    const activeSecrets = secrets.filter((secret) => secret.status === 'ACTIVE');
    const keySource = activeSecrets[0]?.key_source ?? getKeyMaterial().keySource;

    return {
      provider: 'LOCAL_ENCRYPTED_FILE',
      encryption: 'AES-256-GCM',
      key_source: keySource,
      managed_secret_count: secrets.length,
      active_secret_count: activeSecrets.length,
      disabled_secret_count: secrets.length - activeSecrets.length
    };
  }

  static createGeneratedSecret(input: GenerateSecretInput): { reference: ManagedSecretReference; value: string } {
    const value = buildGeneratedSecretValue(input.prefix, input.lengthBytes);
    const secret = createStoredSecret({
      tenantId: input.tenantId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      kind: input.kind,
      label: input.label,
      value,
      createdByUserId: input.createdByUserId,
      createdAt: input.createdAt
    });

    secretStoreState.secrets_by_id[secret.id] = secret;
    persistSecretStoreState();

    return {
      reference: toReference(secret),
      value
    };
  }

  static storeOpaqueSecret(input: StoreSecretInput): ManagedSecretReference {
    const secret = createStoredSecret(input);
    secretStoreState.secrets_by_id[secret.id] = secret;
    persistSecretStoreState();
    return toReference(secret);
  }

  static upsertOpaqueSecret(input: UpsertSecretInput): ManagedSecretReference {
    const existing = findActiveSecretBySubject(input.subjectType, input.subjectId, input.kind);
    if (!existing) {
      return this.storeOpaqueSecret(input);
    }

    replaceSecretValue(existing, normalizeNonEmptyString(input.value, 'value'), input.preview);
    return toReference(existing);
  }

  static rotateGeneratedSecret(
    secretId: string,
    prefix: string,
    _rotatedByUserId: string,
    lengthBytes?: number
  ): { reference: ManagedSecretReference; value: string } | null {
    const secret = secretStoreState.secrets_by_id[secretId];
    if (!secret) {
      return null;
    }

    const value = buildGeneratedSecretValue(prefix, lengthBytes);
    replaceSecretValue(secret, value);

    return {
      reference: toReference(secret),
      value
    };
  }

  static disableSecret(secretId: string): ManagedSecretReference | null {
    const secret = secretStoreState.secrets_by_id[secretId];
    if (!secret) {
      return null;
    }

    secret.status = 'DISABLED';
    secret.updated_at = nowIso();
    persistSecretStoreState();
    return toReference(secret);
  }

  static getSecretValue(secretId: string): string | null {
    const secret = secretStoreState.secrets_by_id[secretId];
    if (!secret || secret.status !== 'ACTIVE') {
      return null;
    }

    return decryptValue(secret);
  }

  static getSecretReference(secretId: string): ManagedSecretReference | null {
    const secret = secretStoreState.secrets_by_id[secretId];
    return secret ? toReference(secret) : null;
  }

  static listReferencesForSubject(subjectType: string, subjectId: string): ManagedSecretReference[] {
    return listStoredSecrets()
      .filter((secret) => secret.subject_type === subjectType && secret.subject_id === subjectId)
      .sort((leftItem, rightItem) => rightItem.updated_at.localeCompare(leftItem.updated_at))
      .map((secret) => toReference(clone(secret)));
  }
}
