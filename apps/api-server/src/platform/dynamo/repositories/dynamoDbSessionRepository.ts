import { GetCommand, PutCommand, QueryCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { StoredIamAccountSession } from '../../iamAuthenticationRuntime';
import { fromAccountSessionItem, toAccountSessionItem } from '../runtimeMappers';
import { decodeCursor, encodeCursor, runtimeKeys } from '../runtimeKeys';
import type { AccountSessionItem } from '../runtimeItems';
import type { SessionRepository } from './sessionRepository';

export class DynamoDbSessionRepository implements SessionRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async getById(realmId: string, sessionId: string): Promise<StoredIamAccountSession | null> {
    const response = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: runtimeKeys.session(sessionId),
    }));
    const item = response.Item as AccountSessionItem | undefined;
    if (!item || item.realm_id !== realmId) {
      return null;
    }
    return fromAccountSessionItem(item);
  }

  async listByUser(realmId: string, userId: string, limit: number = 100, cursor?: string | null): Promise<{
    items: StoredIamAccountSession[];
    nextCursor: string | null;
  }> {
    const response = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :pk AND begins_with(gsi1sk, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':prefix': 'SESSION#',
      },
      ScanIndexForward: false,
      Limit: Math.max(1, Math.min(limit, 200)),
      ExclusiveStartKey: decodeCursor(cursor),
    }));

    const items = (response.Items ?? [])
      .map((item) => fromAccountSessionItem(item as AccountSessionItem))
      .filter((item) => item.realm_id === realmId);

    return {
      items,
      nextCursor: encodeCursor(response.LastEvaluatedKey as Record<string, unknown> | undefined),
    };
  }

  async put(session: StoredIamAccountSession): Promise<void> {
    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: toAccountSessionItem(session),
    }));
  }
}
