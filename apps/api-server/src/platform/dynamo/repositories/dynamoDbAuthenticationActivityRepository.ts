import { GetCommand, PutCommand, QueryCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type {
  StoredIamAccountSecurityState,
  StoredIamLoginAttempt,
  StoredIamUserLockoutState,
} from '../../iamAuthenticationRuntime';
import type {
  AccountSecurityStateItem,
  LoginAttemptItem,
  UserLockoutStateItem,
} from '../runtimeItems';
import {
  fromAccountSecurityStateItem,
  fromLoginAttemptItem,
  fromUserLockoutStateItem,
  toAccountSecurityStateItem,
  toLoginAttemptItem,
  toUserLockoutStateItem,
} from '../runtimeMappers';
import { runtimeKeys } from '../runtimeKeys';
import type { AuthenticationActivityRepository } from './authenticationActivityRepository';

export class DynamoDbAuthenticationActivityRepository implements AuthenticationActivityRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async getAccountSecurityState(realmId: string, userId: string): Promise<StoredIamAccountSecurityState | null> {
    const response = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: runtimeKeys.accountSecurityState(realmId, userId),
      ConsistentRead: true,
    }));
    const item = response.Item as AccountSecurityStateItem | undefined;
    return item ? fromAccountSecurityStateItem(item) : null;
  }

  async putAccountSecurityState(record: StoredIamAccountSecurityState): Promise<void> {
    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: toAccountSecurityStateItem(record),
    }));
  }

  async getUserLockoutState(realmId: string, userId: string): Promise<StoredIamUserLockoutState | null> {
    const response = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: runtimeKeys.userLockoutState(realmId, userId),
      ConsistentRead: true,
    }));
    const item = response.Item as UserLockoutStateItem | undefined;
    return item ? fromUserLockoutStateItem(item) : null;
  }

  async putUserLockoutState(record: StoredIamUserLockoutState): Promise<void> {
    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: toUserLockoutStateItem(record),
    }));
  }

  async putLoginAttempt(record: StoredIamLoginAttempt): Promise<void> {
    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: toLoginAttemptItem(record),
    }));
  }

  async listLoginAttemptsByUser(realmId: string, userId: string, limit: number = 50): Promise<StoredIamLoginAttempt[]> {
    const response = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :pk AND begins_with(gsi1sk, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':prefix': 'LOGINATTEMPT#',
      },
      ScanIndexForward: false,
      Limit: Math.max(1, Math.min(limit, 200)),
    }));

    return (response.Items ?? [])
      .map((item) => fromLoginAttemptItem(item as LoginAttemptItem))
      .filter((item) => item.realm_id === realmId);
  }
}
