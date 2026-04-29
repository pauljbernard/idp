import { GetCommand, PutCommand, QueryCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { describe, expect, it, vi } from 'vitest'
import { DynamoDbSessionRepository } from '../src/platform/dynamo/repositories/dynamoDbSessionRepository'

describe('DynamoDbSessionRepository', () => {
  it('reads a session by id and filters out records from other realms', async () => {
    const send = vi.fn()
      .mockResolvedValueOnce({
        Item: {
          pk: 'SESSION#iam-session-a',
          sk: 'SESSION',
          entity_type: 'ACCOUNT_SESSION',
          realm_id: 'realm-a',
          session_id: 'iam-session-a',
          user_id: 'user-a',
          client_id: 'client-a',
          client_identifier: 'admin-console-demo',
          client_name: 'Admin Console',
          client_protocol: 'OIDC',
          scope_names: ['openid', 'profile'],
          assurance_level: 'PASSWORD',
          authenticated_at: '2026-04-11T15:00:00.000Z',
          issued_at: '2026-04-11T15:00:00.000Z',
          last_seen_at: '2026-04-11T15:01:00.000Z',
          expires_at: '2026-04-11T16:00:00.000Z',
          revoked_at: null,
          session_proof_hash: 'proof-hash',
          federated_login_context: null,
          synthetic: false,
          created_at: '2026-04-11T15:00:00.000Z',
          updated_at: '2026-04-11T15:01:00.000Z',
          version: 1,
          gsi1pk: 'USER#user-a',
          gsi1sk: 'SESSION#2026-04-11T15:00:00.000Z#iam-session-a',
          expires_at_epoch: 1775923200,
        },
      })
      .mockResolvedValueOnce({
        Item: {
          pk: 'SESSION#iam-session-b',
          sk: 'SESSION',
          entity_type: 'ACCOUNT_SESSION',
          realm_id: 'realm-b',
          session_id: 'iam-session-b',
          user_id: 'user-a',
          client_id: 'client-a',
          client_identifier: 'admin-console-demo',
          client_name: 'Admin Console',
          client_protocol: 'OIDC',
          scope_names: ['openid'],
          assurance_level: 'PASSWORD',
          authenticated_at: '2026-04-11T15:00:00.000Z',
          issued_at: '2026-04-11T15:00:00.000Z',
          last_seen_at: '2026-04-11T15:01:00.000Z',
          expires_at: '2026-04-11T16:00:00.000Z',
          revoked_at: null,
          session_proof_hash: null,
          federated_login_context: null,
          synthetic: false,
          created_at: '2026-04-11T15:00:00.000Z',
          updated_at: '2026-04-11T15:01:00.000Z',
          version: 1,
          gsi1pk: 'USER#user-a',
          gsi1sk: 'SESSION#2026-04-11T15:00:00.000Z#iam-session-b',
          expires_at_epoch: 1775923200,
        },
      })

    const repository = new DynamoDbSessionRepository({ send } as unknown as DynamoDBDocumentClient, 'idp-iam-runtime-local')

    await expect(repository.getById('realm-a', 'iam-session-a')).resolves.toMatchObject({
      id: 'iam-session-a',
      realm_id: 'realm-a',
      user_id: 'user-a',
      client_identifier: 'admin-console-demo',
    })
    await expect(repository.getById('realm-a', 'iam-session-b')).resolves.toBeNull()

    expect(send).toHaveBeenNthCalledWith(1, expect.any(GetCommand))
    expect(send.mock.calls[0][0].input).toMatchObject({
      TableName: 'idp-iam-runtime-local',
      Key: {
        pk: 'SESSION#iam-session-a',
        sk: 'SESSION',
      },
    })
  })

  it('lists sessions by user with gsi1, filters by realm, and returns an encoded cursor', async () => {
    const send = vi.fn().mockResolvedValue({
      Items: [
        {
          pk: 'SESSION#iam-session-a',
          sk: 'SESSION',
          entity_type: 'ACCOUNT_SESSION',
          realm_id: 'realm-a',
          session_id: 'iam-session-a',
          user_id: 'user-a',
          client_id: 'client-a',
          client_identifier: 'admin-console-demo',
          client_name: 'Admin Console',
          client_protocol: 'OIDC',
          scope_names: ['openid'],
          assurance_level: 'PASSWORD',
          authenticated_at: '2026-04-11T15:00:00.000Z',
          issued_at: '2026-04-11T15:00:00.000Z',
          last_seen_at: '2026-04-11T15:01:00.000Z',
          expires_at: '2026-04-11T16:00:00.000Z',
          revoked_at: null,
          session_proof_hash: null,
          federated_login_context: null,
          synthetic: false,
          created_at: '2026-04-11T15:00:00.000Z',
          updated_at: '2026-04-11T15:01:00.000Z',
          version: 1,
          gsi1pk: 'USER#user-a',
          gsi1sk: 'SESSION#2026-04-11T15:00:00.000Z#iam-session-a',
          expires_at_epoch: 1775923200,
        },
        {
          pk: 'SESSION#iam-session-b',
          sk: 'SESSION',
          entity_type: 'ACCOUNT_SESSION',
          realm_id: 'realm-b',
          session_id: 'iam-session-b',
          user_id: 'user-a',
          client_id: 'client-b',
          client_identifier: 'other-client',
          client_name: 'Other Client',
          client_protocol: 'OIDC',
          scope_names: ['openid'],
          assurance_level: 'PASSWORD',
          authenticated_at: '2026-04-11T15:02:00.000Z',
          issued_at: '2026-04-11T15:02:00.000Z',
          last_seen_at: '2026-04-11T15:03:00.000Z',
          expires_at: '2026-04-11T16:02:00.000Z',
          revoked_at: null,
          session_proof_hash: null,
          federated_login_context: null,
          synthetic: false,
          created_at: '2026-04-11T15:02:00.000Z',
          updated_at: '2026-04-11T15:03:00.000Z',
          version: 1,
          gsi1pk: 'USER#user-a',
          gsi1sk: 'SESSION#2026-04-11T15:02:00.000Z#iam-session-b',
          expires_at_epoch: 1775923320,
        },
      ],
      LastEvaluatedKey: {
        pk: 'SESSION#iam-session-a',
        sk: 'SESSION',
      },
    })

    const repository = new DynamoDbSessionRepository({ send } as unknown as DynamoDBDocumentClient, 'idp-iam-runtime-local')
    const cursor = Buffer.from(JSON.stringify({ pk: 'SESSION#cursor', sk: 'SESSION' }), 'utf8').toString('base64url')

    const result = await repository.listByUser('realm-a', 'user-a', 500, cursor)

    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      id: 'iam-session-a',
      realm_id: 'realm-a',
      user_id: 'user-a',
    })
    expect(result.nextCursor).toBe(Buffer.from(JSON.stringify({
      pk: 'SESSION#iam-session-a',
      sk: 'SESSION',
    }), 'utf8').toString('base64url'))

    expect(send).toHaveBeenCalledWith(expect.any(QueryCommand))
    expect(send.mock.calls[0][0].input).toMatchObject({
      TableName: 'idp-iam-runtime-local',
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :pk AND begins_with(gsi1sk, :prefix)',
      ExpressionAttributeValues: {
        ':pk': 'USER#user-a',
        ':prefix': 'SESSION#',
      },
      Limit: 200,
      ScanIndexForward: false,
      ExclusiveStartKey: {
        pk: 'SESSION#cursor',
        sk: 'SESSION',
      },
    })
  })

  it('writes a mapped session item to the runtime table', async () => {
    const send = vi.fn().mockResolvedValue({})
    const repository = new DynamoDbSessionRepository({ send } as unknown as DynamoDBDocumentClient, 'idp-iam-runtime-local')

    await repository.put({
      id: 'iam-session-a',
      realm_id: 'realm-a',
      user_id: 'user-a',
      client_id: 'client-a',
      client_identifier: 'admin-console-demo',
      client_name: 'Admin Console',
      client_protocol: 'OIDC',
      scope_names: ['openid', 'profile'],
      assurance_level: 'PASSWORD',
      authenticated_at: '2026-04-11T15:00:00.000Z',
      issued_at: '2026-04-11T15:00:00.000Z',
      last_seen_at: '2026-04-11T15:01:00.000Z',
      expires_at: '2026-04-11T16:00:00.000Z',
      revoked_at: null,
      session_proof_hash: 'proof-hash',
      federated_login_context: {
        source_type: 'BROKER',
        linked_identity_id: 'identity-a',
        provider_id: 'provider-a',
        provider_name: 'Provider A',
        provider_alias: 'alias-a',
        provider_kind: 'OIDC',
        external_subject: 'subject-a',
      },
      synthetic: false,
    })

    expect(send).toHaveBeenCalledWith(expect.any(PutCommand))
    expect(send.mock.calls[0][0].input).toMatchObject({
      TableName: 'idp-iam-runtime-local',
      Item: expect.objectContaining({
        pk: 'SESSION#iam-session-a',
        sk: 'SESSION',
        entity_type: 'ACCOUNT_SESSION',
        gsi1pk: 'USER#user-a',
        gsi1sk: 'SESSION#2026-04-11T15:00:00.000Z#iam-session-a',
        session_id: 'iam-session-a',
        federated_login_context: expect.objectContaining({
          provider_id: 'provider-a',
        }),
      }),
    })
  })
})
