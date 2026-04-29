import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DynamoDbRateLimitBackend,
  InMemoryRateLimitBackend,
  createConfiguredRateLimitBackend,
  type RateLimitPolicy,
} from '../src/platform/rateLimiting'

const basePolicy: RateLimitPolicy = {
  name: 'auth',
  limit: 2,
  windowMs: 1_000,
  blockMs: 5_000,
  cleanupIntervalMs: 0,
}

describe('rateLimiting', () => {
  afterEach(() => {
    delete process.env.IDP_RATE_LIMIT_BACKEND
    delete process.env.IDP_RATE_LIMIT_DYNAMODB_TABLE
    delete process.env.IDP_RATE_LIMIT_TABLE_NAME
    delete process.env.IDP_DYNAMODB_ENDPOINT
  })

  it('allows requests until the limit is exceeded and then blocks the client', async () => {
    const backend = new InMemoryRateLimitBackend()
    const now = 1_000

    const first = await backend.evaluate('login', 'tenant-admin', basePolicy, now)
    const second = await backend.evaluate('login', 'tenant-admin', basePolicy, now + 10)
    const third = await backend.evaluate('login', 'tenant-admin', basePolicy, now + 20)

    expect(first.allowed).toBe(true)
    expect(first.remaining).toBe(1)
    expect(second.allowed).toBe(true)
    expect(second.remaining).toBe(0)
    expect(third.allowed).toBe(false)
    expect(third.retryAfterSeconds).toBe(5)
  })

  it('resets the bucket when the time window rolls over', async () => {
    const backend = new InMemoryRateLimitBackend()
    const now = 10_000

    await backend.evaluate('token', 'admin', basePolicy, now)
    await backend.evaluate('token', 'admin', basePolicy, now + 10)

    const reset = await backend.evaluate('token', 'admin', basePolicy, now + basePolicy.windowMs + 1)
    expect(reset.allowed).toBe(true)
    expect(reset.remaining).toBe(1)
    expect(reset.resetAt).toBe(now + (basePolicy.windowMs * 2) + 1)
  })

  it('uses the in-memory backend by default and rejects unsupported backends', () => {
    expect(createConfiguredRateLimitBackend()).toBeInstanceOf(InMemoryRateLimitBackend)

    process.env.IDP_RATE_LIMIT_BACKEND = 'in-memory'
    expect(createConfiguredRateLimitBackend()).toBeInstanceOf(InMemoryRateLimitBackend)

    process.env.IDP_RATE_LIMIT_BACKEND = 'unsupported'
    expect(() => createConfiguredRateLimitBackend()).toThrow(
      'Unsupported IDP rate limit backend "unsupported".',
    )
  })

  it('requires a table name when the distributed backend is selected', () => {
    process.env.IDP_RATE_LIMIT_BACKEND = 'dynamodb'
    expect(() => createConfiguredRateLimitBackend()).toThrow(
      'Missing IDP_RATE_LIMIT_DYNAMODB_TABLE. Configure a DynamoDB table before using IDP_RATE_LIMIT_BACKEND=dynamodb.',
    )

    process.env.IDP_RATE_LIMIT_DYNAMODB_TABLE = ''
    process.env.IDP_RATE_LIMIT_TABLE_NAME = 'fallback-rate-limit'
    expect(createConfiguredRateLimitBackend()).toBeInstanceOf(DynamoDbRateLimitBackend)
  })

  it('creates and evaluates a distributed bucket for a new client window', async () => {
    process.env.IDP_RATE_LIMIT_DYNAMODB_TABLE = 'idp-rate-limit'
    process.env.IDP_DYNAMODB_ENDPOINT = 'http://127.0.0.1:8000'

    const backend = new DynamoDbRateLimitBackend() as any
    backend.client.send = vi
      .fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})

    const evaluation = await backend.evaluate('login', 'tenant-admin', basePolicy, 12_345)

    expect(evaluation).toMatchObject({
      allowed: true,
      limit: 2,
      remaining: 1,
      retryAfterSeconds: null,
    })
    expect(backend.client.send).toHaveBeenCalledTimes(2)
  })

  it('returns a blocked evaluation when the existing distributed bucket is blocked', async () => {
    process.env.IDP_RATE_LIMIT_DYNAMODB_TABLE = 'idp-rate-limit'

    const backend = new DynamoDbRateLimitBackend() as any
    backend.client.send = vi.fn().mockResolvedValueOnce({
      Item: {
        bucket_key: 'login:tenant-admin',
        scope_key: 'login',
        client_key: 'tenant-admin',
        window_start: 12_000,
        count: 3,
        blocked_until: 16_000,
        expires_at: 20,
        updated_at: new Date().toISOString(),
        version: 2,
      },
    })

    const evaluation = await backend.evaluate('login', 'tenant-admin', basePolicy, 15_000)

    expect(evaluation.allowed).toBe(false)
    expect(evaluation.retryAfterSeconds).toBe(1)
    expect(backend.client.send).toHaveBeenCalledTimes(1)
  })

  it('updates the distributed bucket and blocks when the limit is exceeded', async () => {
    process.env.IDP_RATE_LIMIT_DYNAMODB_TABLE = 'idp-rate-limit'

    const backend = new DynamoDbRateLimitBackend() as any
    backend.client.send = vi
      .fn()
      .mockResolvedValueOnce({
        Item: {
          bucket_key: 'login:tenant-admin',
          scope_key: 'login',
          client_key: 'tenant-admin',
          window_start: 12_000,
          count: 2,
          blocked_until: 0,
          expires_at: 20,
          updated_at: new Date().toISOString(),
          version: 2,
        },
      })
      .mockResolvedValueOnce({})

    const evaluation = await backend.evaluate('login', 'tenant-admin', basePolicy, 12_500)

    expect(evaluation.allowed).toBe(false)
    expect(evaluation.retryAfterSeconds).toBe(5)
    expect(backend.client.send).toHaveBeenCalledTimes(2)
  })

  it('retries distributed writes after a conditional write conflict', async () => {
    process.env.IDP_RATE_LIMIT_DYNAMODB_TABLE = 'idp-rate-limit'
    process.env.IDP_RATE_LIMIT_BACKEND = 'dynamodb'

    const backend = createConfiguredRateLimitBackend() as DynamoDbRateLimitBackend & {
      client: { send: ReturnType<typeof vi.fn> }
    }

    backend.client.send = vi
      .fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce({ name: 'ConditionalCheckFailedException' })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})

    const evaluation = await backend.evaluate('login', 'tenant-admin', basePolicy, 12_345)

    expect(evaluation.allowed).toBe(true)
    expect(evaluation.remaining).toBe(1)
    expect(backend.client.send).toHaveBeenCalledTimes(4)
  })

  it('rethrows unexpected distributed write failures', async () => {
    process.env.IDP_RATE_LIMIT_DYNAMODB_TABLE = 'idp-rate-limit'

    const backend = new DynamoDbRateLimitBackend() as any
    backend.client.send = vi
      .fn()
      .mockResolvedValueOnce({
        Item: {
          bucket_key: 'login:tenant-admin',
          scope_key: 'login',
          client_key: 'tenant-admin',
          window_start: 12_000,
          count: 2,
          blocked_until: 0,
          expires_at: 20,
          updated_at: new Date().toISOString(),
          version: 2,
        },
      })
      .mockRejectedValueOnce(new Error('dynamodb unavailable'))

    await expect(backend.evaluate('login', 'tenant-admin', basePolicy, 12_500)).rejects.toThrow(
      'dynamodb unavailable',
    )
  })
})
