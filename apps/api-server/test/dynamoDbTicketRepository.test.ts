import { DeleteCommand, PutCommand, QueryCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { describe, expect, it, vi } from 'vitest'
import { DynamoDbTicketRepository } from '../src/platform/dynamo/repositories/dynamoDbTicketRepository'

describe('DynamoDbTicketRepository', () => {
  it('replaces active pending MFA enrollments for a user before writing the new enrollment', async () => {
    const send = vi.fn()
      .mockResolvedValueOnce({
        Items: [
          {
            pk: 'TICKET#iam-mfa-enrollment-stale-active',
            sk: 'PENDINGMFA',
            entity_type: 'PENDING_MFA_ENROLLMENT',
            realm_id: 'realm-a',
            enrollment_id: 'iam-mfa-enrollment-stale-active',
            user_id: 'user-a',
            secret: 'OLDSECRET',
            backup_codes: ['AAAA-BBBB'],
            expires_at: '2026-04-11T15:10:00.000Z',
            consumed_at: null,
            created_at: '2026-04-11T15:00:00.000Z',
            updated_at: '2026-04-11T15:00:00.000Z',
            version: 1,
            gsi1pk: 'USER#user-a',
            gsi1sk: 'PENDINGMFA#2026-04-11T15:00:00.000Z#iam-mfa-enrollment-stale-active',
            expires_at_epoch: 1775920200,
          },
          {
            pk: 'TICKET#iam-mfa-enrollment-consumed',
            sk: 'PENDINGMFA',
            entity_type: 'PENDING_MFA_ENROLLMENT',
            realm_id: 'realm-a',
            enrollment_id: 'iam-mfa-enrollment-consumed',
            user_id: 'user-a',
            secret: 'OLDSECRET2',
            backup_codes: ['CCCC-DDDD'],
            expires_at: '2026-04-11T15:12:00.000Z',
            consumed_at: '2026-04-11T15:01:00.000Z',
            created_at: '2026-04-11T15:00:30.000Z',
            updated_at: '2026-04-11T15:01:00.000Z',
            version: 1,
            gsi1pk: 'USER#user-a',
            gsi1sk: 'PENDINGMFA#2026-04-11T15:00:30.000Z#iam-mfa-enrollment-consumed',
            expires_at_epoch: 1775920320,
          },
          {
            pk: 'TICKET#iam-mfa-enrollment-other-realm',
            sk: 'PENDINGMFA',
            entity_type: 'PENDING_MFA_ENROLLMENT',
            realm_id: 'realm-b',
            enrollment_id: 'iam-mfa-enrollment-other-realm',
            user_id: 'user-a',
            secret: 'OTHERREALM',
            backup_codes: ['EEEE-FFFF'],
            expires_at: '2026-04-11T15:14:00.000Z',
            consumed_at: null,
            created_at: '2026-04-11T15:01:00.000Z',
            updated_at: '2026-04-11T15:01:00.000Z',
            version: 1,
            gsi1pk: 'USER#user-a',
            gsi1sk: 'PENDINGMFA#2026-04-11T15:01:00.000Z#iam-mfa-enrollment-other-realm',
            expires_at_epoch: 1775920440,
          },
        ],
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})

    const client = { send } as unknown as DynamoDBDocumentClient
    const repository = new DynamoDbTicketRepository(client, 'idp-iam-runtime-local')

    await repository.replacePendingMfaEnrollmentForUser('realm-a', 'user-a', {
      id: 'iam-mfa-enrollment-new',
      realm_id: 'realm-a',
      user_id: 'user-a',
      secret: 'NEWSECRET',
      backup_codes: ['1111-2222'],
      created_at: '2026-04-11T15:02:00.000Z',
      expires_at: '2026-04-11T15:12:00.000Z',
      consumed_at: null,
    })

    expect(send).toHaveBeenCalledTimes(3)
    expect(send.mock.calls[0][0]).toBeInstanceOf(QueryCommand)
    expect(send.mock.calls[1][0]).toBeInstanceOf(DeleteCommand)
    expect(send.mock.calls[2][0]).toBeInstanceOf(PutCommand)
    expect(send.mock.calls[1][0].input).toMatchObject({
      TableName: 'idp-iam-runtime-local',
      Key: {
        pk: 'TICKET#iam-mfa-enrollment-stale-active',
        sk: 'PENDINGMFA',
      },
    })
    expect(send.mock.calls[2][0].input).toMatchObject({
      TableName: 'idp-iam-runtime-local',
      Item: expect.objectContaining({
        pk: 'TICKET#iam-mfa-enrollment-new',
        sk: 'PENDINGMFA',
        enrollment_id: 'iam-mfa-enrollment-new',
        user_id: 'user-a',
        realm_id: 'realm-a',
      }),
    })
  })
})
