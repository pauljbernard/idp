import { GetCommand, QueryCommand, TransactWriteCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { describe, expect, it, vi } from 'vitest'
import { DynamoDbTokenRepository } from '../src/platform/dynamo/repositories/dynamoDbTokenRepository'

describe('DynamoDbTokenRepository', () => {
  it('writes the main token item plus access and refresh lookup rows in one transaction', async () => {
    const send = vi.fn().mockResolvedValue({})
    const repository = new DynamoDbTokenRepository({ send } as unknown as DynamoDBDocumentClient, 'idp-iam-runtime-local')

    await repository.put({
      id: 'iam-issued-token-a',
      realm_id: 'realm-a',
      client_id: 'client-a',
      subject_kind: 'USER',
      subject_id: 'user-a',
      browser_session_id: 'browser-session-a',
      grant_type: 'authorization_code',
      scope: 'openid profile',
      scope_ids: ['scope-openid', 'scope-profile'],
      issued_at: '2026-04-11T15:00:00.000Z',
      expires_at: '2026-04-11T16:00:00.000Z',
      refresh_expires_at: '2026-04-12T16:00:00.000Z',
      status: 'ACTIVE',
      revoked_at: null,
      requested_purpose: null,
      access_token_hash: 'access-hash-a',
      refresh_token_hash: 'refresh-hash-a',
      claims: { sub: 'user-a' },
      id_token_claims: { sub: 'user-a' },
      userinfo_claims: { sub: 'user-a' },
      client_scope_names: ['openid', 'profile'],
    })

    expect(send).toHaveBeenCalledWith(expect.any(TransactWriteCommand))
    const transact = send.mock.calls[0][0]
    expect(transact.input.TransactItems).toHaveLength(3)
    expect(transact.input.TransactItems[0]).toMatchObject({
      Put: {
        TableName: 'idp-iam-runtime-local',
        Item: expect.objectContaining({
          pk: 'TOKEN#iam-issued-token-a',
          sk: 'TOKEN',
          entity_type: 'ISSUED_TOKEN',
          gsi1pk: 'SUBJECT#USER#user-a',
          gsi2pk: 'BROWSERSESSION#browser-session-a',
          token_id: 'iam-issued-token-a',
        }),
      },
    })
    expect(transact.input.TransactItems[1]).toMatchObject({
      Put: {
        TableName: 'idp-iam-runtime-local',
        Item: expect.objectContaining({
          pk: 'TOKENLOOKUP#realm-a#access-hash-a',
          sk: 'ACCESS_TOKEN',
          entity_type: 'ISSUED_TOKEN_LOOKUP',
          token_id: 'iam-issued-token-a',
          token_use: 'access_token',
        }),
      },
    })
    expect(transact.input.TransactItems[2]).toMatchObject({
      Put: {
        TableName: 'idp-iam-runtime-local',
        Item: expect.objectContaining({
          pk: 'TOKENLOOKUP#realm-a#refresh-hash-a',
          sk: 'REFRESH_TOKEN',
          entity_type: 'ISSUED_TOKEN_LOOKUP',
          token_id: 'iam-issued-token-a',
          token_use: 'refresh_token',
        }),
      },
    })
  })

  it('resolves an access-token lookup through the lookup item and then the token item', async () => {
    const send = vi.fn()
      .mockResolvedValueOnce({
        Item: {
          pk: 'TOKENLOOKUP#realm-a#access-hash-a',
          sk: 'ACCESS_TOKEN',
          entity_type: 'ISSUED_TOKEN_LOOKUP',
          realm_id: 'realm-a',
          token_id: 'iam-issued-token-a',
          token_use: 'access_token',
          created_at: '2026-04-11T15:00:00.000Z',
          updated_at: '2026-04-11T15:00:00.000Z',
          version: 1,
          expires_at_epoch: 1775923200,
        },
      })
      .mockResolvedValueOnce({
        Item: {
          pk: 'TOKEN#iam-issued-token-a',
          sk: 'TOKEN',
          entity_type: 'ISSUED_TOKEN',
          realm_id: 'realm-a',
          token_id: 'iam-issued-token-a',
          client_id: 'client-a',
          subject_kind: 'USER',
          subject_id: 'user-a',
          browser_session_id: 'browser-session-a',
          grant_type: 'authorization_code',
          scope: 'openid profile',
          scope_ids: ['scope-openid'],
          issued_at: '2026-04-11T15:00:00.000Z',
          expires_at: '2026-04-11T16:00:00.000Z',
          refresh_expires_at: null,
          status: 'ACTIVE',
          revoked_at: null,
          requested_purpose: null,
          access_token_hash: 'access-hash-a',
          refresh_token_hash: null,
          claims: { sub: 'user-a' },
          id_token_claims: { sub: 'user-a' },
          userinfo_claims: { sub: 'user-a' },
          client_scope_names: ['openid'],
          created_at: '2026-04-11T15:00:00.000Z',
          updated_at: '2026-04-11T15:00:00.000Z',
          version: 1,
          gsi1pk: 'SUBJECT#USER#user-a',
          gsi1sk: 'TOKEN#2026-04-11T15:00:00.000Z#iam-issued-token-a',
          gsi2pk: 'BROWSERSESSION#browser-session-a',
          gsi2sk: 'TOKEN#2026-04-11T15:00:00.000Z#iam-issued-token-a',
          expires_at_epoch: 1775923200,
        },
      })

    const repository = new DynamoDbTokenRepository({ send } as unknown as DynamoDBDocumentClient, 'idp-iam-runtime-local')
    const result = await repository.getByAccessHash('realm-a', 'access-hash-a')

    expect(result).toMatchObject({
      id: 'iam-issued-token-a',
      realm_id: 'realm-a',
      access_token_hash: 'access-hash-a',
      subject_id: 'user-a',
    })
    expect(send).toHaveBeenNthCalledWith(1, expect.any(GetCommand))
    expect(send).toHaveBeenNthCalledWith(2, expect.any(GetCommand))
  })

  it('lists active token ids by browser session across paginated gsi2 queries', async () => {
    const send = vi.fn()
      .mockResolvedValueOnce({
        Items: [
          {
            token_id: 'iam-issued-token-a',
            realm_id: 'realm-a',
            status: 'ACTIVE',
          },
          {
            token_id: 'iam-issued-token-b',
            realm_id: 'realm-a',
            status: 'REVOKED',
          },
        ],
        LastEvaluatedKey: {
          pk: 'TOKEN#cursor-a',
          sk: 'TOKEN',
        },
      })
      .mockResolvedValueOnce({
        Items: [
          {
            token_id: 'iam-issued-token-c',
            realm_id: 'realm-a',
            status: 'ACTIVE',
          },
          {
            token_id: 'iam-issued-token-d',
            realm_id: 'realm-b',
            status: 'ACTIVE',
          },
        ],
      })

    const repository = new DynamoDbTokenRepository({ send } as unknown as DynamoDBDocumentClient, 'idp-iam-runtime-local')
    const tokenIds = await repository.listActiveIdsByBrowserSession('realm-a', 'browser-session-a')

    expect(tokenIds).toEqual(['iam-issued-token-a', 'iam-issued-token-c'])
    expect(send).toHaveBeenCalledTimes(2)
    expect(send.mock.calls[0][0]).toBeInstanceOf(QueryCommand)
    expect(send.mock.calls[0][0].input).toMatchObject({
      TableName: 'idp-iam-runtime-local',
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :pk AND begins_with(gsi2sk, :prefix)',
      ExpressionAttributeValues: {
        ':pk': 'BROWSERSESSION#browser-session-a',
        ':prefix': 'TOKEN#',
      },
    })
    expect(send.mock.calls[1][0].input.ExclusiveStartKey).toMatchObject({
      pk: 'TOKEN#cursor-a',
      sk: 'TOKEN',
    })
  })
})
