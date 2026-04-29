import { GetCommand, PutCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { describe, expect, it, vi } from 'vitest'
import { DynamoDbLoginTransactionRepository } from '../src/platform/dynamo/repositories/dynamoDbLoginTransactionRepository'

describe('DynamoDbLoginTransactionRepository', () => {
  it('reads login transactions by id and rejects other-realm records', async () => {
    const send = vi.fn()
      .mockResolvedValueOnce({
        Item: {
          pk: 'TICKET#iam-login-transaction-a',
          sk: 'LOGINTRANSACTION',
          entity_type: 'LOGIN_TRANSACTION',
          realm_id: 'realm-a',
          transaction_id: 'iam-login-transaction-a',
          user_id: 'user-a',
          flow_id: 'flow-a',
          client_id: 'client-a',
          client_identifier: 'admin-console-demo',
          client_name: 'Admin Console',
          client_protocol: 'OIDC',
          requested_scope_names: ['openid'],
          pending_required_actions: [],
          pending_scope_consent: ['profile'],
          pending_mfa: false,
          federated_login_context: null,
          created_at: '2026-04-11T15:00:00.000Z',
          updated_at: '2026-04-11T15:00:00.000Z',
          expires_at: '2026-04-11T15:10:00.000Z',
          completed_at: null,
          cancelled_at: null,
          status: 'PENDING_CONSENT',
          version: 1,
          gsi1pk: 'USER#user-a',
          gsi1sk: 'LOGINTRANSACTION#2026-04-11T15:00:00.000Z#iam-login-transaction-a',
          expires_at_epoch: 1775920200,
        },
      })
      .mockResolvedValueOnce({
        Item: {
          pk: 'TICKET#iam-login-transaction-b',
          sk: 'LOGINTRANSACTION',
          entity_type: 'LOGIN_TRANSACTION',
          realm_id: 'realm-b',
          transaction_id: 'iam-login-transaction-b',
          user_id: 'user-a',
          flow_id: null,
          client_id: null,
          client_identifier: null,
          client_name: null,
          client_protocol: null,
          requested_scope_names: [],
          pending_required_actions: [],
          pending_scope_consent: [],
          pending_mfa: false,
          federated_login_context: null,
          created_at: '2026-04-11T15:00:00.000Z',
          updated_at: '2026-04-11T15:00:00.000Z',
          expires_at: '2026-04-11T15:10:00.000Z',
          completed_at: null,
          cancelled_at: null,
          status: 'PENDING_REQUIRED_ACTIONS',
          version: 1,
          gsi1pk: 'USER#user-a',
          gsi1sk: 'LOGINTRANSACTION#2026-04-11T15:00:00.000Z#iam-login-transaction-b',
          expires_at_epoch: 1775920200,
        },
      })

    const repository = new DynamoDbLoginTransactionRepository({ send } as unknown as DynamoDBDocumentClient, 'idp-iam-runtime-local')

    await expect(repository.getById('realm-a', 'iam-login-transaction-a')).resolves.toMatchObject({
      id: 'iam-login-transaction-a',
      realm_id: 'realm-a',
      pending_scope_consent: ['profile'],
      status: 'PENDING_CONSENT',
    })
    await expect(repository.getById('realm-a', 'iam-login-transaction-b')).resolves.toBeNull()

    expect(send).toHaveBeenNthCalledWith(1, expect.any(GetCommand))
    expect(send.mock.calls[0][0].input).toMatchObject({
      TableName: 'idp-iam-runtime-local',
      Key: {
        pk: 'TICKET#iam-login-transaction-a',
        sk: 'LOGINTRANSACTION',
      },
    })
  })

  it('writes mapped login transaction items', async () => {
    const send = vi.fn().mockResolvedValue({})
    const repository = new DynamoDbLoginTransactionRepository({ send } as unknown as DynamoDBDocumentClient, 'idp-iam-runtime-local')

    await repository.put({
      id: 'iam-login-transaction-a',
      realm_id: 'realm-a',
      user_id: 'user-a',
      flow_id: 'flow-a',
      client_id: 'client-a',
      client_identifier: 'admin-console-demo',
      client_name: 'Admin Console',
      client_protocol: 'OIDC',
      requested_scope_names: ['openid', 'profile'],
      pending_required_actions: ['VERIFY_EMAIL'],
      pending_scope_consent: ['profile'],
      pending_mfa: true,
      federated_login_context: null,
      created_at: '2026-04-11T15:00:00.000Z',
      expires_at: '2026-04-11T15:10:00.000Z',
      completed_at: null,
      cancelled_at: null,
      status: 'PENDING_MFA',
    })

    expect(send).toHaveBeenCalledWith(expect.any(PutCommand))
    expect(send.mock.calls[0][0].input).toMatchObject({
      TableName: 'idp-iam-runtime-local',
      Item: expect.objectContaining({
        pk: 'TICKET#iam-login-transaction-a',
        sk: 'LOGINTRANSACTION',
        entity_type: 'LOGIN_TRANSACTION',
        gsi1pk: 'USER#user-a',
        gsi1sk: 'LOGINTRANSACTION#2026-04-11T15:00:00.000Z#iam-login-transaction-a',
        pending_mfa: true,
        status: 'PENDING_MFA',
      }),
    })
  })
})
