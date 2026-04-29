import { createDynamoDocumentClient } from './dynamo/ddbClient';
import { DynamoDbRateLimitRepository } from './dynamo/repositories/dynamoDbRateLimitRepository';
import type { DynamoDbRateLimitRecord } from './dynamo/repositories/rateLimitRepository';

export interface RateLimitPolicy {
  name: string;
  limit: number;
  windowMs: number;
  blockMs: number;
  cleanupIntervalMs?: number;
}

export interface RateLimitEvaluation {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number | null;
}

export interface RateLimitBackend {
  kind: string;
  evaluate(scopeKey: string, clientKey: string, policy: RateLimitPolicy, now: number): Promise<RateLimitEvaluation>;
}

interface InMemoryRateLimitBucket {
  windowStart: number;
  count: number;
  blockedUntil: number;
}

const DEFAULT_CLEANUP_INTERVAL_MS = 30_000;
const MAX_DYNAMODB_WRITE_RETRIES = 6;
const DYNAMODB_WRITE_RETRY_BACKOFF_MS = 10;

function normalizeBackendName(value: string | undefined): string {
  const normalized = value?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : 'memory';
}

function nowIso(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

function computeWindowStart(now: number, windowMs: number): number {
  return now - (now % windowMs);
}

function computeRetryAfterSeconds(targetTimestamp: number, now: number): number {
  return Math.max(1, Math.ceil((targetTimestamp - now) / 1000));
}

function buildAllowedEvaluation(limit: number, count: number, resetAt: number): RateLimitEvaluation {
  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - count),
    resetAt,
    retryAfterSeconds: null,
  };
}

function buildBlockedEvaluation(limit: number, blockedUntil: number, now: number): RateLimitEvaluation {
  return {
    allowed: false,
    limit,
    remaining: 0,
    resetAt: blockedUntil,
    retryAfterSeconds: computeRetryAfterSeconds(blockedUntil, now),
  };
}

function computeExpiresAtSeconds(now: number, resetAt: number, blockedUntil: number, windowMs: number): number {
  const expiryTimestamp = Math.max(resetAt, blockedUntil) + (windowMs * 2);
  return Math.ceil(expiryTimestamp / 1000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function resolveRateLimitTableName(): string {
  const tableName = process.env.IDP_RATE_LIMIT_DYNAMODB_TABLE?.trim()
    || process.env.IDP_RATE_LIMIT_TABLE_NAME?.trim();
  if (!tableName) {
    throw new Error(
      'Missing IDP_RATE_LIMIT_DYNAMODB_TABLE. Configure a DynamoDB table before using IDP_RATE_LIMIT_BACKEND=dynamodb.'
    );
  }
  return tableName;
}

export class InMemoryRateLimitBackend implements RateLimitBackend {
  kind = 'memory';

  private readonly buckets = new Map<string, InMemoryRateLimitBucket>();
  private lastCleanup = 0;

  async evaluate(scopeKey: string, clientKey: string, policy: RateLimitPolicy, now: number): Promise<RateLimitEvaluation> {
    const cleanupIntervalMs = policy.cleanupIntervalMs ?? DEFAULT_CLEANUP_INTERVAL_MS;
    if (now - this.lastCleanup >= cleanupIntervalMs) {
      this.lastCleanup = now;
      const oldestAllowedWindowStart = now - policy.windowMs;
      for (const [key, bucket] of this.buckets) {
        if (bucket.blockedUntil <= now && bucket.windowStart <= oldestAllowedWindowStart) {
          this.buckets.delete(key);
        }
      }
    }

    const bucketKey = `${scopeKey}:${clientKey}`;
    const bucket = this.buckets.get(bucketKey);
    const windowStart = bucket?.windowStart ?? now;
    const blockedUntil = bucket?.blockedUntil ?? 0;
    const count = bucket?.count ?? 0;

    if (blockedUntil > now) {
      return buildBlockedEvaluation(policy.limit, blockedUntil, now);
    }

    const resetWindow = now - windowStart >= policy.windowMs;
    const nextBucket: InMemoryRateLimitBucket = resetWindow
      ? {
          windowStart: now,
          count: 1,
          blockedUntil: 0,
        }
      : {
          windowStart,
          count: count + 1,
          blockedUntil: 0,
        };

    if (!resetWindow && nextBucket.count > policy.limit) {
      nextBucket.blockedUntil = now + policy.blockMs;
      this.buckets.set(bucketKey, nextBucket);
      return buildBlockedEvaluation(policy.limit, nextBucket.blockedUntil, now);
    }

    this.buckets.set(bucketKey, nextBucket);
    return buildAllowedEvaluation(policy.limit, nextBucket.count, nextBucket.windowStart + policy.windowMs);
  }
}

export class DynamoDbRateLimitBackend implements RateLimitBackend {
  kind = 'dynamodb';

  private readonly repository = new DynamoDbRateLimitRepository(
    createDynamoDocumentClient(),
    resolveRateLimitTableName(),
  );

  get client() {
    return this.repository.client;
  }

  async evaluate(scopeKey: string, clientKey: string, policy: RateLimitPolicy, now: number): Promise<RateLimitEvaluation> {
    const bucketKey = `${scopeKey}:${clientKey}`;
    const currentWindowStart = computeWindowStart(now, policy.windowMs);
    const resetAt = currentWindowStart + policy.windowMs;

    for (let attempt = 0; attempt < MAX_DYNAMODB_WRITE_RETRIES; attempt += 1) {
      const record = await this.repository.getRecord(bucketKey);
      if (record?.blocked_until && record.blocked_until > now) {
        return buildBlockedEvaluation(policy.limit, record.blocked_until, now);
      }

      if (record?.window_start === currentWindowStart) {
        if (record.count >= policy.limit) {
          const blockedUntil = Math.max(record.blocked_until ?? 0, now + policy.blockMs);
          await this.repository.markBlocked({
            bucket_key: bucketKey,
            window_start: currentWindowStart,
            blocked_until: blockedUntil,
            expires_at: computeExpiresAtSeconds(now, resetAt, blockedUntil, policy.windowMs),
            updated_at: nowIso(now),
          });
          return buildBlockedEvaluation(policy.limit, blockedUntil, now);
        }

        const incrementedRecord = await this.repository.incrementSameWindow({
          bucket_key: bucketKey,
          scope_key: scopeKey,
          client_key: clientKey,
          window_start: currentWindowStart,
          blocked_until: 0,
          expires_at: computeExpiresAtSeconds(now, resetAt, 0, policy.windowMs),
          updated_at: nowIso(now),
        }, now);
        if (incrementedRecord) {
          if (incrementedRecord.count > policy.limit) {
            const blockedUntil = Math.max(incrementedRecord.blocked_until ?? 0, now + policy.blockMs);
            await this.repository.markBlocked({
              bucket_key: bucketKey,
              window_start: currentWindowStart,
              blocked_until: blockedUntil,
              expires_at: computeExpiresAtSeconds(now, resetAt, blockedUntil, policy.windowMs),
              updated_at: nowIso(now),
            });
            return buildBlockedEvaluation(policy.limit, blockedUntil, now);
          }

          return buildAllowedEvaluation(policy.limit, incrementedRecord.count, resetAt);
        }
      }

      if (!record || record.window_start !== currentWindowStart) {
        const nextRecord: DynamoDbRateLimitRecord = {
          bucket_key: bucketKey,
          scope_key: scopeKey,
          client_key: clientKey,
          window_start: currentWindowStart,
          count: 1,
          blocked_until: 0,
          expires_at: computeExpiresAtSeconds(now, resetAt, 0, policy.windowMs),
          updated_at: nowIso(now),
          version: (record?.version ?? 0) + 1,
        };

        const wrote = record
          ? await this.repository.updateRecord(record, nextRecord)
          : await this.repository.putRecord(nextRecord);
        if (wrote) {
          return buildAllowedEvaluation(policy.limit, 1, resetAt);
        }
        await sleep(DYNAMODB_WRITE_RETRY_BACKOFF_MS * (attempt + 1));
        continue;
      }
      await sleep(DYNAMODB_WRITE_RETRY_BACKOFF_MS * (attempt + 1));
    }

    throw new Error(
      `Unable to apply distributed rate limit for ${scopeKey} after ${MAX_DYNAMODB_WRITE_RETRIES} concurrent write retries.`
    );
  }
}

export function createConfiguredRateLimitBackend(): RateLimitBackend {
  const backendName = normalizeBackendName(process.env.IDP_RATE_LIMIT_BACKEND);
  switch (backendName) {
    case 'memory':
    case 'in-memory':
      return new InMemoryRateLimitBackend();
    case 'dynamodb':
      return new DynamoDbRateLimitBackend();
    default:
      throw new Error(`Unsupported IDP rate limit backend "${backendName}".`);
  }
}
