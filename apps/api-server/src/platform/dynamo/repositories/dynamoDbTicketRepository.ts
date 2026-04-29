import { DeleteCommand, GetCommand, PutCommand, QueryCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type {
  StoredIamEmailVerificationTicket,
  StoredIamPasswordResetTicket,
  StoredPendingIamMfaEnrollment,
} from '../../iamAuthenticationRuntime';
import {
  fromEmailVerificationTicketItem,
  fromPasswordResetTicketItem,
  fromPendingMfaEnrollmentItem,
  toEmailVerificationTicketItem,
  toPasswordResetTicketItem,
  toPendingMfaEnrollmentItem,
} from '../runtimeMappers';
import type {
  EmailVerificationTicketItem,
  PasswordResetTicketItem,
  PendingMfaEnrollmentItem,
} from '../runtimeItems';
import { runtimeKeys } from '../runtimeKeys';
import type { TicketRepository } from './ticketRepository';

export class DynamoDbTicketRepository implements TicketRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async getPasswordResetTicket(realmId: string, ticketId: string): Promise<StoredIamPasswordResetTicket | null> {
    const response = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: runtimeKeys.passwordResetTicket(ticketId),
    }));
    const item = response.Item as PasswordResetTicketItem | undefined;
    if (!item || item.realm_id !== realmId) {
      return null;
    }
    return fromPasswordResetTicketItem(item);
  }

  async putPasswordResetTicket(ticket: StoredIamPasswordResetTicket): Promise<void> {
    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: toPasswordResetTicketItem(ticket),
    }));
  }

  async getEmailVerificationTicket(realmId: string, ticketId: string): Promise<StoredIamEmailVerificationTicket | null> {
    const response = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: runtimeKeys.emailVerificationTicket(ticketId),
    }));
    const item = response.Item as EmailVerificationTicketItem | undefined;
    if (!item || item.realm_id !== realmId) {
      return null;
    }
    return fromEmailVerificationTicketItem(item);
  }

  async putEmailVerificationTicket(ticket: StoredIamEmailVerificationTicket): Promise<void> {
    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: toEmailVerificationTicketItem(ticket),
    }));
  }

  async getPendingMfaEnrollment(
    realmId: string,
    userId: string,
    enrollmentId: string,
  ): Promise<StoredPendingIamMfaEnrollment | null> {
    const response = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: runtimeKeys.pendingMfaEnrollment(enrollmentId),
    }));
    const item = response.Item as PendingMfaEnrollmentItem | undefined;
    if (!item || item.realm_id !== realmId || item.user_id !== userId) {
      return null;
    }
    return fromPendingMfaEnrollmentItem(item);
  }

  async replacePendingMfaEnrollmentForUser(
    realmId: string,
    userId: string,
    enrollment: StoredPendingIamMfaEnrollment,
  ): Promise<void> {
    const activeEnrollments = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :userPk AND begins_with(gsi1sk, :ticketPrefix)',
      ExpressionAttributeValues: {
        ':userPk': `USER#${userId}`,
        ':ticketPrefix': 'PENDINGMFA#',
      },
    }));

    const staleActiveRows = (activeEnrollments.Items as PendingMfaEnrollmentItem[] | undefined ?? []).filter(
      (candidate) => candidate.realm_id === realmId && !candidate.consumed_at && candidate.enrollment_id !== enrollment.id,
    );

    await Promise.all(staleActiveRows.map((candidate) => this.client.send(new DeleteCommand({
      TableName: this.tableName,
      Key: runtimeKeys.pendingMfaEnrollment(candidate.enrollment_id),
    }))));

    await this.putPendingMfaEnrollment(enrollment);
  }

  async putPendingMfaEnrollment(enrollment: StoredPendingIamMfaEnrollment): Promise<void> {
    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: toPendingMfaEnrollmentItem(enrollment),
    }));
  }
}
