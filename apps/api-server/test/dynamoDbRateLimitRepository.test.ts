import { GetCommand, PutCommand, UpdateCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { describe, expect, it, vi } from 'vitest'
import { DynamoDbRateLimitRepository } from '../src/platform/dynamo/repositories/dynamoDbRateLimitRepository'

describe('DynamoDbRateLimitRepository', () => {
  it('reads rate-limit buckets with a strongly consistent keyed lookup', async () => {
    const send = vi.fn().mockResolvedValue({
      Item: {
        bucket_key: 'scope-a:client-a',
        scope_key: 'scope-a',
        client_key: 'client-a',
        window_start: 100,
        count: 2,
        blocked_until: 0,
        expires_at: 200,
        updated_at: '2026-04-11T15:00:00.000Z',
        version: 3,
      },
    })

    const repository = new DynamoDbRateLimitRepository({ send } as unknown as DynamoDBDocumentClient, 'idp-rate-limit-local')
    const result = await repository.getRecord('scope-a:client-a')

    expect(result).toMatchObject({
      bucket_key: 'scope-a:client-a',
      version: 3,
    })
    expect(send).toHaveBeenCalledWith(expect.any(GetCommand))
    expect(send.mock.calls[0][0].input).toMatchObject({
      TableName: 'idp-rate-limit-local',
      Key: {
        bucket_key: 'scope-a:client-a',
      },
      ConsistentRead: true,
    })
  })

  it('returns false when conditional put detects an existing bucket', async () => {
    const error = Object.assign(new Error('conditional failed'), {
      name: 'ConditionalCheckFailedException',
    })
    const send = vi.fn().mockRejectedValue(error)

    const repository = new DynamoDbRateLimitRepository({ send } as unknown as DynamoDBDocumentClient, 'idp-rate-limit-local')
    const inserted = await repository.putRecord({
      bucket_key: 'scope-a:client-a',
      scope_key: 'scope-a',
      client_key: 'client-a',
      window_start: 100,
      count: 1,
      blocked_until: 0,
      expires_at: 200,
      updated_at: '2026-04-11T15:00:00.000Z',
      version: 1,
    })

    expect(inserted).toBe(false)
    expect(send).toHaveBeenCalledWith(expect.any(PutCommand))
    expect(send.mock.calls[0][0].input).toMatchObject({
      TableName: 'idp-rate-limit-local',
      ConditionExpression: 'attribute_not_exists(#bucket_key)',
      ExpressionAttributeNames: {
        '#bucket_key': 'bucket_key',
      },
    })
  })

  it('uses optimistic version checks when updating an existing bucket', async () => {
    const send = vi.fn().mockResolvedValue({})
    const repository = new DynamoDbRateLimitRepository({ send } as unknown as DynamoDBDocumentClient, 'idp-rate-limit-local')

    const updated = await repository.updateRecord(
      {
        bucket_key: 'scope-a:client-a',
        scope_key: 'scope-a',
        client_key: 'client-a',
        window_start: 100,
        count: 1,
        blocked_until: 0,
        expires_at: 200,
        updated_at: '2026-04-11T15:00:00.000Z',
        version: 4,
      },
      {
        bucket_key: 'scope-a:client-a',
        scope_key: 'scope-a',
        client_key: 'client-a',
        window_start: 200,
        count: 3,
        blocked_until: 50,
        expires_at: 300,
        updated_at: '2026-04-11T15:01:00.000Z',
        version: 5,
      },
    )

    expect(updated).toBe(true)
    expect(send).toHaveBeenCalledWith(expect.any(UpdateCommand))
    expect(send.mock.calls[0][0].input).toMatchObject({
      TableName: 'idp-rate-limit-local',
      Key: {
        bucket_key: 'scope-a:client-a',
      },
      ConditionExpression: '#version = :expectedVersion',
      ExpressionAttributeValues: expect.objectContaining({
        ':expectedVersion': 4,
        ':count': 3,
        ':nextVersion': 5,
      }),
    })
  })

  it('uses an atomic increment for same-window bucket updates', async () => {
    const send = vi.fn().mockResolvedValue({
      Attributes: {
        bucket_key: 'scope-a:client-a',
        scope_key: 'scope-a',
        client_key: 'client-a',
        window_start: 100,
        count: 7,
        blocked_until: 0,
        expires_at: 200,
        updated_at: '2026-04-11T15:01:00.000Z',
        version: 5,
      },
    })

    const repository = new DynamoDbRateLimitRepository({ send } as unknown as DynamoDBDocumentClient, 'idp-rate-limit-local')
    const record = await repository.incrementSameWindow({
      bucket_key: 'scope-a:client-a',
      scope_key: 'scope-a',
      client_key: 'client-a',
      window_start: 100,
      blocked_until: 0,
      expires_at: 200,
      updated_at: '2026-04-11T15:01:00.000Z',
    }, 150)

    expect(record?.count).toBe(7)
    expect(send).toHaveBeenCalledWith(expect.any(UpdateCommand))
    expect(send.mock.calls[0][0].input).toMatchObject({
      TableName: 'idp-rate-limit-local',
      Key: {
        bucket_key: 'scope-a:client-a',
      },
      ConditionExpression: '#window_start = :windowStart AND (#blocked_until <= :now OR attribute_not_exists(#blocked_until))',
      ReturnValues: 'ALL_NEW',
      ExpressionAttributeValues: expect.objectContaining({
        ':windowStart': 100,
        ':now': 150,
        ':increment': 1,
      }),
    })
    expect(send.mock.calls[0][0].input.UpdateExpression).toContain('ADD #count :increment')
  })

  it('marks a bucket blocked with a monotonic blocked-until update', async () => {
    const send = vi.fn().mockResolvedValue({
      Attributes: {
        bucket_key: 'scope-a:client-a',
        scope_key: 'scope-a',
        client_key: 'client-a',
        window_start: 100,
        count: 8,
        blocked_until: 500,
        expires_at: 700,
        updated_at: '2026-04-11T15:02:00.000Z',
        version: 6,
      },
    })

    const repository = new DynamoDbRateLimitRepository({ send } as unknown as DynamoDBDocumentClient, 'idp-rate-limit-local')
    const record = await repository.markBlocked({
      bucket_key: 'scope-a:client-a',
      window_start: 100,
      blocked_until: 500,
      expires_at: 700,
      updated_at: '2026-04-11T15:02:00.000Z',
    })

    expect(record?.blocked_until).toBe(500)
    expect(send).toHaveBeenCalledWith(expect.any(UpdateCommand))
    expect(send.mock.calls[0][0].input).toMatchObject({
      TableName: 'idp-rate-limit-local',
      ConditionExpression: '#window_start = :windowStart AND (attribute_not_exists(#blocked_until) OR #blocked_until < :blockedUntil)',
      ReturnValues: 'ALL_NEW',
      ExpressionAttributeValues: expect.objectContaining({
        ':windowStart': 100,
        ':blockedUntil': 500,
      }),
    })
  })
})
