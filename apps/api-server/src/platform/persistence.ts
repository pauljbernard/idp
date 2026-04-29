import { createHash, randomBytes } from 'crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { Worker } from 'worker_threads';
import { LEGACY_COMPAT_ENV, compatibilityEnvNames, readCompatibilityEnv } from './legacyEnvironment';

interface PersistedEnvelope<T> {
  version: number;
  saved_at: string;
  state: T;
}

export interface DurableArtifactWriteReceipt {
  durable_path: string;
  checksum_sha256: string;
  byte_size: number;
  written_at: string;
}

export interface DurableArtifactSnapshot extends DurableArtifactWriteReceipt {
  content: string;
}

type PlatformPersistenceBackendKind = 'filesystem' | 'dynamodb-s3';

interface PersistedEnvelopeWriteConditions {
  createOnly?: boolean;
  expectedSavedAt?: string | null;
  expectedVersion?: number | null;
  requireExisting?: boolean;
}

interface PlatformPersistenceAdapter {
  kind: PlatformPersistenceBackendKind;
  resolveStatePath(fileName: string): string;
  resolveDurableArtifactPath(objectKey: string): string;
  withLock<T>(targetPath: string, operation: () => T): T;
  withLockAsync<T>(targetPath: string, operation: () => Promise<T>): Promise<T>;
  readEnvelope<T>(filePath: string): PersistedEnvelope<T> | null;
  readEnvelopeAsync<T>(filePath: string): Promise<PersistedEnvelope<T> | null>;
  writeEnvelope<T>(filePath: string, envelope: PersistedEnvelope<T>, conditions?: PersistedEnvelopeWriteConditions): void;
  writeEnvelopeAsync<T>(filePath: string, envelope: PersistedEnvelope<T>, conditions?: PersistedEnvelopeWriteConditions): Promise<void>;
  readTextFile(filePath: string): string | null;
  readTextFileAsync(filePath: string): Promise<string | null>;
  writeTextFile(filePath: string, content: string): void;
  writeTextFileAsync(filePath: string, content: string): Promise<void>;
}

interface RemotePersistenceWorkerRequest {
  type: 'read-envelope' | 'write-envelope' | 'read-text' | 'write-text';
  locator: string;
  envelope?: PersistedEnvelope<unknown>;
  conditions?: PersistedEnvelopeWriteConditions;
  content?: string;
}

interface RemotePersistenceWorkerResponse<T> {
  ok: boolean;
  result?: T;
  error?: {
    message: string;
    name?: string;
    stack?: string;
  };
}

const stateCache = new Map<string, unknown>();
const stateVersionCache = new Map<string, { saved_at: string | null; version: number }>();
const DEFAULT_LOCK_TIMEOUT_MS = 5000;
const DEFAULT_LOCK_RETRY_MS = 25;
const DEFAULT_STALE_LOCK_MS = 30000;
const DEFAULT_REMOTE_IO_TIMEOUT_MS = 30000;
const REMOTE_WAIT_SLICE_MS = 100;

let platformPersistenceWorker: Worker | null = null;

interface FileLockHandle {
  lockPath: string;
  ownerFilePath: string;
  ownerToken: string;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function hashContent(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function trimErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }
  return String(error);
}

function readFirstConfiguredEnv(names: string[]): string | null {
  for (const name of names) {
    const rawValue = process.env[name]?.trim();
    if (rawValue) {
      return rawValue;
    }
  }
  return null;
}

function parsePositiveIntegerEnv(names: string[], fallback: number): number {
  for (const name of names) {
    const rawValue = process.env[name]?.trim();
    if (!rawValue) {
      continue;
    }

    const parsedValue = Number.parseInt(rawValue, 10);
    if (Number.isFinite(parsedValue) && parsedValue > 0) {
      return parsedValue;
    }
  }

  return fallback;
}

function sleepSync(milliseconds: number): void {
  if (milliseconds <= 0) {
    return;
  }

  const deadline = Date.now() + milliseconds;
  while (Date.now() < deadline) {
    // synchronous sleep for lock retries.
  }
}

function normalizeRelativePath(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${fieldName} must not be empty.`);
  }

  const normalized = trimmed
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== '.');
  if (normalized.length === 0 || normalized.some((segment) => segment === '..')) {
    throw new Error(`${fieldName} must be a safe relative path.`);
  }

  return normalized.join('/');
}

function resolveStateRootPath(): string {
  const configuredRoot = readCompatibilityEnv(LEGACY_COMPAT_ENV.platformStateRoot);
  if (configuredRoot) {
    return configuredRoot;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Missing IDP_PLATFORM_STATE_ROOT. Production deployments must configure an explicit platform state root.'
    );
  }
  return path.join(__dirname, '..', '..', 'local-data', 'platform');
}

function resolveDurableRootPath(): string {
  const configuredRoot = readCompatibilityEnv(LEGACY_COMPAT_ENV.platformDurableRoot);
  if (configuredRoot) {
    return configuredRoot;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Missing IDP_PLATFORM_DURABLE_ROOT. Production deployments must configure an explicit durable artifact root.'
    );
  }
  return path.join(__dirname, '..', '..', 'durable-data', 'platform');
}

function resolveStateTableName(): string {
  const tableName = readFirstConfiguredEnv([
    'IDP_PLATFORM_STATE_DYNAMODB_TABLE',
    'IDP_PLATFORM_DYNAMODB_TABLE',
  ]);
  if (!tableName) {
    throw new Error(
      'Missing IDP_PLATFORM_STATE_DYNAMODB_TABLE. Configure a DynamoDB table for persisted platform state.'
    );
  }
  return tableName;
}

function resolveDurableBucketName(): string {
  const bucketName = readFirstConfiguredEnv([
    'IDP_PLATFORM_DURABLE_S3_BUCKET',
    'IDP_PLATFORM_S3_BUCKET',
  ]);
  if (!bucketName) {
    throw new Error(
      'Missing IDP_PLATFORM_DURABLE_S3_BUCKET. Configure an S3 bucket for durable platform artifacts.'
    );
  }
  return bucketName;
}

function resolvePersistenceBackendKind(): PlatformPersistenceBackendKind {
  const configured = readCompatibilityEnv(LEGACY_COMPAT_ENV.platformPersistenceBackend);
  const normalized = configured?.toLowerCase();
  if (!normalized || normalized === 'filesystem' || normalized === 'fs') {
    return 'filesystem';
  }
  if (
    normalized === 'dynamodb-s3'
    || normalized === 'dynamodb_s3'
    || normalized === 'aws'
    || normalized === 'aws-native'
  ) {
    return 'dynamodb-s3';
  }

  throw new Error(
    `Unsupported IDP platform persistence backend "${configured}". Supported values are "filesystem" and "dynamodb-s3".`
  );
}

function ensureDirectory(filePath: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function buildTemporaryPath(targetPath: string): string {
  const suffix = randomBytes(8).toString('hex');
  return `${targetPath}.${process.pid}.${Date.now()}.${suffix}.tmp`;
}

function removeDirectory(pathToRemove: string): void {
  rmSync(pathToRemove, { recursive: true, force: true });
}

function isStaleLock(lockPath: string, staleThresholdMs: number): boolean {
  try {
    const lockStats = statSync(lockPath);
    return Date.now() - lockStats.mtimeMs > staleThresholdMs;
  } catch {
    return false;
  }
}

function validateEnvelopeWriteConditions<T>(
  locator: string,
  currentEnvelope: PersistedEnvelope<T> | null,
  conditions?: PersistedEnvelopeWriteConditions,
): void {
  if (!conditions) {
    return;
  }

  if (conditions.createOnly && currentEnvelope) {
    throw new Error(`Refusing to overwrite existing persisted state for ${locator}.`);
  }

  if (conditions.requireExisting && !currentEnvelope) {
    throw new Error(`Refusing to recreate missing persisted state for ${locator}.`);
  }

  if (
    conditions.expectedSavedAt
    && currentEnvelope
    && currentEnvelope.saved_at !== conditions.expectedSavedAt
  ) {
    throw new Error(
      `Refusing to overwrite newer persisted state for ${locator}. Expected saved_at=${conditions.expectedSavedAt}, found saved_at=${currentEnvelope.saved_at}.`
    );
  }

  if (conditions.expectedSavedAt && !currentEnvelope) {
    throw new Error(
      `Refusing to recreate missing persisted state for ${locator}. Expected saved_at=${conditions.expectedSavedAt} but no current envelope exists.`
    );
  }

  if (
    conditions.expectedSavedAt
    && currentEnvelope
    && typeof currentEnvelope.version === 'number'
    && typeof conditions.expectedVersion === 'number'
    && currentEnvelope.version !== conditions.expectedVersion
  ) {
    throw new Error(
      `Refusing to overwrite persisted state for ${locator} due to version drift. Expected version=${conditions.expectedVersion}, found version=${currentEnvelope.version}.`
    );
  }
}

function acquireFileLock(targetPath: string): FileLockHandle {
  const timeoutMs = parsePositiveIntegerEnv(
    compatibilityEnvNames(LEGACY_COMPAT_ENV.platformLockTimeoutMs),
    DEFAULT_LOCK_TIMEOUT_MS,
  );
  const retryMs = parsePositiveIntegerEnv(
    compatibilityEnvNames(LEGACY_COMPAT_ENV.platformLockRetryMs),
    DEFAULT_LOCK_RETRY_MS,
  );
  const staleThresholdMs = parsePositiveIntegerEnv(
    compatibilityEnvNames(LEGACY_COMPAT_ENV.platformStaleLockMs),
    DEFAULT_STALE_LOCK_MS,
  );

  const lockPath = `${targetPath}.lock`;
  const ownerFilePath = path.join(lockPath, 'owner');
  const ownerToken = `${process.pid}:${Date.now()}:${randomBytes(8).toString('hex')}`;
  const deadline = Date.now() + timeoutMs;

  mkdirSync(path.dirname(lockPath), { recursive: true });

  while (true) {
    try {
      mkdirSync(lockPath);
      try {
        writeFileSync(ownerFilePath, ownerToken, { encoding: 'utf8', flag: 'wx' });
      } catch (error) {
        removeDirectory(lockPath);
        throw error;
      }
      return { lockPath, ownerFilePath, ownerToken };
    } catch (error) {
      const errno = error as NodeJS.ErrnoException;
      if (errno.code !== 'EEXIST') {
        throw new Error(
          `Failed to acquire persistence lock for ${targetPath}: ${trimErrorMessage(error)}`
        );
      }

      if (isStaleLock(lockPath, staleThresholdMs)) {
        removeDirectory(lockPath);
        continue;
      }

      if (Date.now() >= deadline) {
        throw new Error(`Timed out acquiring persistence lock for ${targetPath} after ${timeoutMs}ms.`);
      }

      sleepSync(retryMs);
    }
  }
}

async function acquireFileLockAsync(targetPath: string): Promise<FileLockHandle> {
  const timeoutMs = parsePositiveIntegerEnv(
    compatibilityEnvNames(LEGACY_COMPAT_ENV.platformLockTimeoutMs),
    DEFAULT_LOCK_TIMEOUT_MS,
  );
  const retryMs = parsePositiveIntegerEnv(
    compatibilityEnvNames(LEGACY_COMPAT_ENV.platformLockRetryMs),
    DEFAULT_LOCK_RETRY_MS,
  );
  const staleThresholdMs = parsePositiveIntegerEnv(
    compatibilityEnvNames(LEGACY_COMPAT_ENV.platformStaleLockMs),
    DEFAULT_STALE_LOCK_MS,
  );

  const lockPath = `${targetPath}.lock`;
  const ownerFilePath = path.join(lockPath, 'owner');
  const ownerToken = `${process.pid}:${Date.now()}:${randomBytes(8).toString('hex')}`;
  const deadline = Date.now() + timeoutMs;

  mkdirSync(path.dirname(lockPath), { recursive: true });

  while (true) {
    try {
      mkdirSync(lockPath);
      try {
        writeFileSync(ownerFilePath, ownerToken, { encoding: 'utf8', flag: 'wx' });
      } catch (error) {
        removeDirectory(lockPath);
        throw error;
      }
      return { lockPath, ownerFilePath, ownerToken };
    } catch (error) {
      const errno = error as NodeJS.ErrnoException;
      if (errno.code !== 'EEXIST') {
        throw new Error(
          `Failed to acquire persistence lock for ${targetPath}: ${trimErrorMessage(error)}`
        );
      }

      if (isStaleLock(lockPath, staleThresholdMs)) {
        removeDirectory(lockPath);
        continue;
      }

      if (Date.now() >= deadline) {
        throw new Error(`Timed out acquiring persistence lock for ${targetPath} after ${timeoutMs}ms.`);
      }

      await new Promise((resolve) => setTimeout(resolve, retryMs));
    }
  }
}

function releaseFileLock(lock: FileLockHandle): void {
  try {
    if (existsSync(lock.ownerFilePath)) {
      const currentOwnerToken = readFileSync(lock.ownerFilePath, 'utf8').trim();
      if (currentOwnerToken.length > 0 && currentOwnerToken !== lock.ownerToken) {
        return;
      }
    }

    removeDirectory(lock.lockPath);
  } catch (error) {
    console.error(`Failed to release persistence lock ${lock.lockPath}:`, error);
  }
}

function withFileLock<T>(targetPath: string, operation: () => T): T {
  const lock = acquireFileLock(targetPath);
  try {
    return operation();
  } finally {
    releaseFileLock(lock);
  }
}

function writeEnvelopeToFile<T>(filePath: string, envelope: PersistedEnvelope<T>): void {
  const tempFilePath = buildTemporaryPath(filePath);
  const serialized = JSON.stringify(envelope, null, 2);
  ensureDirectory(filePath);
  writeFileSync(tempFilePath, serialized, { encoding: 'utf8', flag: 'wx' });
  renameSync(tempFilePath, filePath);
}

function readEnvelopeFromFile<T>(filePath: string): PersistedEnvelope<T> | null {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as PersistedEnvelope<T>;
    if (!parsed || typeof parsed !== 'object' || !Object.prototype.hasOwnProperty.call(parsed, 'state')) {
      throw new Error('Missing required envelope "state" property.');
    }
    return parsed;
  } catch (error) {
    throw new Error(`Failed to read persisted platform state from ${filePath}: ${trimErrorMessage(error)}`);
  }
}

function resolvePersistenceWorkerPath(): string {
  const workerPath = path.join(__dirname, 'persistenceWorker.js');
  if (!existsSync(workerPath)) {
    throw new Error(`Missing persistence worker at ${workerPath}. Build the API server before using remote persistence.`);
  }
  return workerPath;
}

function ensurePlatformPersistenceWorker(): Worker {
  if (platformPersistenceWorker) {
    return platformPersistenceWorker;
  }

  platformPersistenceWorker = new Worker(resolvePersistenceWorkerPath());
  platformPersistenceWorker.on('exit', () => {
    platformPersistenceWorker = null;
  });
  platformPersistenceWorker.on('error', (error) => {
    console.error('Platform persistence worker error:', error);
  });
  return platformPersistenceWorker;
}

function syncRemoteWorkerRequest<T>(request: RemotePersistenceWorkerRequest): T {
  const worker = ensurePlatformPersistenceWorker();
  const signalBuffer = new SharedArrayBuffer(4);
  const signal = new Int32Array(signalBuffer);
  const responseFilePath = path.join(
    os.tmpdir(),
    `idp-persistence-${process.pid}-${Date.now()}-${randomBytes(6).toString('hex')}.json`,
  );

  worker.postMessage({
    request,
    signalBuffer,
    responseFilePath,
  });

  const timeoutMs = parsePositiveIntegerEnv(['IDP_PLATFORM_REMOTE_IO_TIMEOUT_MS'], DEFAULT_REMOTE_IO_TIMEOUT_MS);
  const deadline = Date.now() + timeoutMs;

  while (Atomics.load(signal, 0) === 0) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      rmSync(responseFilePath, { force: true });
      throw new Error(`Timed out waiting for remote persistence operation ${request.type} on ${request.locator}.`);
    }
    Atomics.wait(signal, 0, 0, Math.min(REMOTE_WAIT_SLICE_MS, remainingMs));
  }

  try {
    const raw = readFileSync(responseFilePath, 'utf8');
    const payload = JSON.parse(raw) as RemotePersistenceWorkerResponse<T>;
    if (!payload.ok) {
      throw new Error(payload.error?.message || `Remote persistence operation ${request.type} failed.`);
    }
    return payload.result as T;
  } catch (error) {
    throw new Error(`Remote persistence operation failed for ${request.locator}: ${trimErrorMessage(error)}`);
  } finally {
    rmSync(responseFilePath, { force: true });
  }
}

async function waitForRemoteSignalAsync(
  signal: Int32Array,
  request: RemotePersistenceWorkerRequest,
  locator: string,
  responseFilePath: string,
  deadline: number,
): Promise<void> {
  while (Atomics.load(signal, 0) === 0) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      rmSync(responseFilePath, { force: true });
      throw new Error(`Timed out waiting for remote persistence operation ${request.type} on ${locator}.`);
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(REMOTE_WAIT_SLICE_MS, remainingMs)));
  }
}

async function asyncRemoteWorkerRequest<T>(request: RemotePersistenceWorkerRequest): Promise<T> {
  const worker = ensurePlatformPersistenceWorker();
  const signalBuffer = new SharedArrayBuffer(4);
  const signal = new Int32Array(signalBuffer);
  const responseFilePath = path.join(
    os.tmpdir(),
    `idp-persistence-${process.pid}-${Date.now()}-${randomBytes(6).toString('hex')}.json`,
  );

  worker.postMessage({
    request,
    signalBuffer,
    responseFilePath,
  });

  const timeoutMs = parsePositiveIntegerEnv(['IDP_PLATFORM_REMOTE_IO_TIMEOUT_MS'], DEFAULT_REMOTE_IO_TIMEOUT_MS);
  const deadline = Date.now() + timeoutMs;

  await waitForRemoteSignalAsync(signal, request, request.locator, responseFilePath, deadline);

  try {
    const raw = readFileSync(responseFilePath, 'utf8');
    const payload = JSON.parse(raw) as RemotePersistenceWorkerResponse<T>;
    if (!payload.ok) {
      throw new Error(payload.error?.message || `Remote persistence operation ${request.type} failed.`);
    }
    return payload.result as T;
  } catch (error) {
    throw new Error(`Remote persistence operation failed for ${request.locator}: ${trimErrorMessage(error)}`);
  } finally {
    rmSync(responseFilePath, { force: true });
  }
}

class FileSystemPlatformPersistenceAdapter implements PlatformPersistenceAdapter {
  kind: PlatformPersistenceBackendKind = 'filesystem';

  resolveStatePath(fileName: string): string {
    return path.join(resolveStateRootPath(), normalizeRelativePath(fileName, 'fileName'));
  }

  resolveDurableArtifactPath(objectKey: string): string {
    return path.join(resolveDurableRootPath(), normalizeRelativePath(objectKey, 'objectKey'));
  }

  withLock<T>(targetPath: string, operation: () => T): T {
    return withFileLock(targetPath, operation);
  }

  async withLockAsync<T>(targetPath: string, operation: () => Promise<T>): Promise<T> {
    const lock = await acquireFileLockAsync(targetPath);
    try {
      return await operation();
    } finally {
      releaseFileLock(lock);
    }
  }

  readEnvelope<T>(filePath: string): PersistedEnvelope<T> | null {
    return readEnvelopeFromFile(filePath);
  }

  async readEnvelopeAsync<T>(filePath: string): Promise<PersistedEnvelope<T> | null> {
    return this.readEnvelope(filePath);
  }

  writeEnvelope<T>(filePath: string, envelope: PersistedEnvelope<T>, conditions?: PersistedEnvelopeWriteConditions): void {
    const currentEnvelope = readEnvelopeFromFile<T>(filePath);
    validateEnvelopeWriteConditions(filePath, currentEnvelope, conditions);
    writeEnvelopeToFile(filePath, envelope);
  }

  async writeEnvelopeAsync<T>(
    filePath: string,
    envelope: PersistedEnvelope<T>,
    conditions?: PersistedEnvelopeWriteConditions,
  ): Promise<void> {
    this.writeEnvelope(filePath, envelope, conditions);
  }

  readTextFile(filePath: string): string | null {
    if (!existsSync(filePath)) {
      return null;
    }

    try {
      return readFileSync(filePath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read durable artifact from ${filePath}: ${trimErrorMessage(error)}`);
    }
  }

  async readTextFileAsync(filePath: string): Promise<string | null> {
    return this.readTextFile(filePath);
  }

  writeTextFile(filePath: string, content: string): void {
    const tempFilePath = buildTemporaryPath(filePath);
    ensureDirectory(filePath);
    writeFileSync(tempFilePath, content, { encoding: 'utf8', flag: 'wx' });
    renameSync(tempFilePath, filePath);
  }

  async writeTextFileAsync(filePath: string, content: string): Promise<void> {
    this.writeTextFile(filePath, content);
  }
}

class DynamoDbS3PlatformPersistenceAdapter implements PlatformPersistenceAdapter {
  kind: PlatformPersistenceBackendKind = 'dynamodb-s3';

  resolveStatePath(fileName: string): string {
    return `dynamodb://${resolveStateTableName()}/${normalizeRelativePath(fileName, 'fileName')}`;
  }

  resolveDurableArtifactPath(objectKey: string): string {
    return `s3://${resolveDurableBucketName()}/${normalizeRelativePath(objectKey, 'objectKey')}`;
  }

  withLock<T>(_targetPath: string, operation: () => T): T {
    return operation();
  }

  async withLockAsync<T>(_targetPath: string, operation: () => Promise<T>): Promise<T> {
    return operation();
  }

  readEnvelope<T>(filePath: string): PersistedEnvelope<T> | null {
    return syncRemoteWorkerRequest<PersistedEnvelope<T> | null>({
      type: 'read-envelope',
      locator: filePath,
    });
  }

  async readEnvelopeAsync<T>(filePath: string): Promise<PersistedEnvelope<T> | null> {
    return asyncRemoteWorkerRequest<PersistedEnvelope<T> | null>({
      type: 'read-envelope',
      locator: filePath,
    });
  }

  writeEnvelope<T>(filePath: string, envelope: PersistedEnvelope<T>, conditions?: PersistedEnvelopeWriteConditions): void {
    syncRemoteWorkerRequest<void>({
      type: 'write-envelope',
      locator: filePath,
      envelope: envelope as PersistedEnvelope<unknown>,
      conditions,
    });
  }

  async writeEnvelopeAsync<T>(
    filePath: string,
    envelope: PersistedEnvelope<T>,
    conditions?: PersistedEnvelopeWriteConditions,
  ): Promise<void> {
    await asyncRemoteWorkerRequest<void>({
      type: 'write-envelope',
      locator: filePath,
      envelope: envelope as PersistedEnvelope<unknown>,
      conditions,
    });
  }

  readTextFile(filePath: string): string | null {
    return syncRemoteWorkerRequest<string | null>({
      type: 'read-text',
      locator: filePath,
    });
  }

  async readTextFileAsync(filePath: string): Promise<string | null> {
    return asyncRemoteWorkerRequest<string | null>({
      type: 'read-text',
      locator: filePath,
    });
  }

  writeTextFile(filePath: string, content: string): void {
    syncRemoteWorkerRequest<void>({
      type: 'write-text',
      locator: filePath,
      content,
    });
  }

  async writeTextFileAsync(filePath: string, content: string): Promise<void> {
    await asyncRemoteWorkerRequest<void>({
      type: 'write-text',
      locator: filePath,
      content,
    });
  }
}

const platformPersistenceAdapter: PlatformPersistenceAdapter = (() => {
  switch (resolvePersistenceBackendKind()) {
    case 'filesystem':
      return new FileSystemPlatformPersistenceAdapter();
    case 'dynamodb-s3':
      return new DynamoDbS3PlatformPersistenceAdapter();
  }
})();

function isCreateConflict(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.includes('already exists') || error.message.includes('Refusing to overwrite existing persisted state');
}

export function loadOrCreatePersistedState<T>(
  fileName: string,
  seedFactory: () => T,
  version: number = 1
): T {
  const filePath = platformPersistenceAdapter.resolveStatePath(fileName);
  if (stateCache.has(filePath)) {
    return stateCache.get(filePath) as T;
  }

  return platformPersistenceAdapter.withLock(filePath, () => {
    if (stateCache.has(filePath)) {
      return stateCache.get(filePath) as T;
    }

    const envelope = platformPersistenceAdapter.readEnvelope<T>(filePath);
    if (envelope?.state !== undefined) {
      const loadedState = clone(envelope.state);
      stateCache.set(filePath, loadedState);
      stateVersionCache.set(filePath, {
        saved_at: envelope.saved_at ?? null,
        version: envelope.version ?? version,
      });
      return loadedState;
    }

    const seededState = clone(seedFactory());
    const seededEnvelope: PersistedEnvelope<T> = {
      version,
      saved_at: new Date().toISOString(),
      state: seededState
    };

    try {
      platformPersistenceAdapter.writeEnvelope(filePath, seededEnvelope, { createOnly: true });
      stateCache.set(filePath, seededState);
      stateVersionCache.set(filePath, {
        saved_at: seededEnvelope.saved_at,
        version: seededEnvelope.version,
      });
      return seededState;
    } catch (error) {
      if (!isCreateConflict(error)) {
        throw error;
      }

      const racedEnvelope = platformPersistenceAdapter.readEnvelope<T>(filePath);
      if (racedEnvelope?.state === undefined) {
        throw error;
      }

      const loadedState = clone(racedEnvelope.state);
      stateCache.set(filePath, loadedState);
      stateVersionCache.set(filePath, {
        saved_at: racedEnvelope.saved_at ?? null,
        version: racedEnvelope.version ?? version,
      });
      return loadedState;
    }
  });
}

export function savePersistedState<T>(
  fileName: string,
  state: T,
  version: number = 1
): void {
  const filePath = platformPersistenceAdapter.resolveStatePath(fileName);
  const snapshot = clone(state);
  const cachedVersion = stateVersionCache.get(filePath);
  const expectedSavedAt = cachedVersion?.saved_at ?? null;
  const expectedVersion = cachedVersion?.version ?? version;
  const envelope: PersistedEnvelope<T> = {
    version,
    saved_at: new Date().toISOString(),
    state: snapshot
  };

  platformPersistenceAdapter.withLock(filePath, () => {
    const currentEnvelope = platformPersistenceAdapter.readEnvelope<T>(filePath);
    validateEnvelopeWriteConditions(filePath, currentEnvelope, {
      expectedSavedAt,
      expectedVersion,
      requireExisting: Boolean(expectedSavedAt),
    });

    platformPersistenceAdapter.writeEnvelope(filePath, envelope, {
      expectedSavedAt,
      expectedVersion,
      requireExisting: Boolean(expectedSavedAt),
    });
    stateCache.set(filePath, snapshot);
    stateVersionCache.set(filePath, {
      saved_at: envelope.saved_at,
      version: envelope.version,
    });
  });
}

export async function loadOrCreatePersistedStateAsync<T>(
  fileName: string,
  seedFactory: () => T,
  version: number = 1
): Promise<T> {
  const filePath = platformPersistenceAdapter.resolveStatePath(fileName);
  if (stateCache.has(filePath)) {
    return stateCache.get(filePath) as T;
  }

  return platformPersistenceAdapter.withLockAsync(filePath, async () => {
    if (stateCache.has(filePath)) {
      return stateCache.get(filePath) as T;
    }

    const envelope = await platformPersistenceAdapter.readEnvelopeAsync<T>(filePath);
    if (envelope?.state !== undefined) {
      const loadedState = clone(envelope.state);
      stateCache.set(filePath, loadedState);
      stateVersionCache.set(filePath, {
        saved_at: envelope.saved_at ?? null,
        version: envelope.version ?? version,
      });
      return loadedState;
    }

    const seededState = clone(seedFactory());
    const seededEnvelope: PersistedEnvelope<T> = {
      version,
      saved_at: new Date().toISOString(),
      state: seededState,
    };

    try {
      await platformPersistenceAdapter.writeEnvelopeAsync(filePath, seededEnvelope, { createOnly: true });
      stateCache.set(filePath, seededState);
      stateVersionCache.set(filePath, {
        saved_at: seededEnvelope.saved_at,
        version: seededEnvelope.version,
      });
      return seededState;
    } catch (error) {
      if (!isCreateConflict(error)) {
        throw error;
      }

      const racedEnvelope = await platformPersistenceAdapter.readEnvelopeAsync<T>(filePath);
      if (racedEnvelope?.state === undefined) {
        throw error;
      }

      const loadedState = clone(racedEnvelope.state);
      stateCache.set(filePath, loadedState);
      stateVersionCache.set(filePath, {
        saved_at: racedEnvelope.saved_at ?? null,
        version: racedEnvelope.version ?? version,
      });
      return loadedState;
    }
  });
}

export async function reloadOrCreatePersistedStateAsync<T>(
  fileName: string,
  seedFactory: () => T,
  version: number = 1,
): Promise<T> {
  const filePath = platformPersistenceAdapter.resolveStatePath(fileName);

  return platformPersistenceAdapter.withLockAsync(filePath, async () => {
    const envelope = await platformPersistenceAdapter.readEnvelopeAsync<T>(filePath);
    if (envelope?.state !== undefined) {
      const loadedState = clone(envelope.state);
      stateCache.set(filePath, loadedState);
      stateVersionCache.set(filePath, {
        saved_at: envelope.saved_at ?? null,
        version: envelope.version ?? version,
      });
      return loadedState;
    }

    const seededState = clone(seedFactory());
    const seededEnvelope: PersistedEnvelope<T> = {
      version,
      saved_at: new Date().toISOString(),
      state: seededState,
    };

    try {
      await platformPersistenceAdapter.writeEnvelopeAsync(filePath, seededEnvelope, { createOnly: true });
      stateCache.set(filePath, seededState);
      stateVersionCache.set(filePath, {
        saved_at: seededEnvelope.saved_at,
        version: seededEnvelope.version,
      });
      return seededState;
    } catch (error) {
      if (!isCreateConflict(error)) {
        throw error;
      }

      const racedEnvelope = await platformPersistenceAdapter.readEnvelopeAsync<T>(filePath);
      if (racedEnvelope?.state === undefined) {
        throw error;
      }

      const loadedState = clone(racedEnvelope.state);
      stateCache.set(filePath, loadedState);
      stateVersionCache.set(filePath, {
        saved_at: racedEnvelope.saved_at ?? null,
        version: racedEnvelope.version ?? version,
      });
      return loadedState;
    }
  });
}

export async function savePersistedStateAsync<T>(
  fileName: string,
  state: T,
  version: number = 1
): Promise<void> {
  const filePath = platformPersistenceAdapter.resolveStatePath(fileName);
  const snapshot = clone(state);
  const cachedVersion = stateVersionCache.get(filePath);
  const expectedSavedAt = cachedVersion?.saved_at ?? null;
  const expectedVersion = cachedVersion?.version ?? version;
  const envelope: PersistedEnvelope<T> = {
    version,
    saved_at: new Date().toISOString(),
    state: snapshot,
  };

  await platformPersistenceAdapter.withLockAsync(filePath, async () => {
    const currentEnvelope = await platformPersistenceAdapter.readEnvelopeAsync<T>(filePath);
    validateEnvelopeWriteConditions(filePath, currentEnvelope, {
      expectedSavedAt,
      expectedVersion,
      requireExisting: Boolean(expectedSavedAt),
    });

    await platformPersistenceAdapter.writeEnvelopeAsync(filePath, envelope, {
      expectedSavedAt,
      expectedVersion,
      requireExisting: Boolean(expectedSavedAt),
    });
    stateCache.set(filePath, snapshot);
    stateVersionCache.set(filePath, {
      saved_at: envelope.saved_at,
      version: envelope.version,
    });
  });
}

export function getPersistedStatePath(fileName: string): string {
  return platformPersistenceAdapter.resolveStatePath(fileName);
}

export function readPersistedStateSnapshot<T>(fileName: string): T | null {
  const filePath = platformPersistenceAdapter.resolveStatePath(fileName);
  const envelope = platformPersistenceAdapter.readEnvelope<T>(filePath);
  if (envelope?.state === undefined) {
    return null;
  }
  return clone(envelope.state);
}

export function getDurableArtifactPath(objectKey: string): string {
  return platformPersistenceAdapter.resolveDurableArtifactPath(objectKey);
}

export function writeDurableArtifact(objectKey: string, content: string): DurableArtifactWriteReceipt {
  const durablePath = platformPersistenceAdapter.resolveDurableArtifactPath(objectKey);
  const normalizedContent = String(content);

  platformPersistenceAdapter.withLock(durablePath, () => {
    platformPersistenceAdapter.writeTextFile(durablePath, normalizedContent);
  });

  return {
    durable_path: durablePath,
    checksum_sha256: hashContent(normalizedContent),
    byte_size: Buffer.byteLength(normalizedContent, 'utf8'),
    written_at: new Date().toISOString(),
  };
}

export function readDurableArtifact(objectKey: string): DurableArtifactSnapshot | null {
  const durablePath = platformPersistenceAdapter.resolveDurableArtifactPath(objectKey);
  const content = platformPersistenceAdapter.readTextFile(durablePath);
  if (content === null) {
    return null;
  }

  try {
    return {
      durable_path: durablePath,
      content,
      checksum_sha256: hashContent(content),
      byte_size: Buffer.byteLength(content, 'utf8'),
      written_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Failed to read durable artifact from ${durablePath}:`, error);
    return null;
  }
}

export function getPlatformPersistenceBackendKind(): PlatformPersistenceBackendKind {
  return platformPersistenceAdapter.kind;
}
