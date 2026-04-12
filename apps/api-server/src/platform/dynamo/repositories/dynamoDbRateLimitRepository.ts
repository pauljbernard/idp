import { GetCommand, PutCommand, UpdateCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { DynamoDbRateLimitRecord, RateLimitRepository } from './rateLimitRepository';

function isConditionalCheckFailure(error: unknown): boolean {
  return Boolean(
    error
    && typeof error === 'object'
    && 'name' in error
    && (error as { name?: string }).name === 'ConditionalCheckFailedException',
  );
}

export class DynamoDbRateLimitRepository implements RateLimitRepository {
  constructor(
    public readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async getRecord(bucketKey: string): Promise<DynamoDbRateLimitRecord | null> {
    const response = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: {
        bucket_key: bucketKey,
      },
      ConsistentRead: true,
    }));

    return (response.Item as DynamoDbRateLimitRecord | undefined) ?? null;
  }

  async putRecord(record: DynamoDbRateLimitRecord): Promise<boolean> {
    try {
      await this.client.send(new PutCommand({
        TableName: this.tableName,
        Item: record,
        ConditionExpression: 'attribute_not_exists(#bucket_key)',
        ExpressionAttributeNames: {
          '#bucket_key': 'bucket_key',
        },
      }));
      return true;
    } catch (error) {
      if (isConditionalCheckFailure(error)) {
        return false;
      }
      throw error;
    }
  }

  async updateRecord(currentRecord: DynamoDbRateLimitRecord, nextRecord: DynamoDbRateLimitRecord): Promise<boolean> {
    const condition = typeof currentRecord.version === 'number'
      ? {
          expression: '#version = :expectedVersion',
          values: {
            ':expectedVersion': currentRecord.version,
          },
        }
      : {
          expression: 'attribute_not_exists(#version)',
          values: {},
        };

    try {
      await this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          bucket_key: currentRecord.bucket_key,
        },
        UpdateExpression: [
          'SET #scope_key = :scopeKey',
          '#client_key = :clientKey',
          '#window_start = :windowStart',
          '#count = :count',
          '#blocked_until = :blockedUntil',
          '#expires_at = :expiresAt',
          '#updated_at = :updatedAt',
          '#version = :nextVersion',
        ].join(', '),
        ConditionExpression: condition.expression,
        ExpressionAttributeNames: {
          '#scope_key': 'scope_key',
          '#client_key': 'client_key',
          '#window_start': 'window_start',
          '#count': 'count',
          '#blocked_until': 'blocked_until',
          '#expires_at': 'expires_at',
          '#updated_at': 'updated_at',
          '#version': 'version',
        },
        ExpressionAttributeValues: {
          ...condition.values,
          ':scopeKey': nextRecord.scope_key,
          ':clientKey': nextRecord.client_key,
          ':windowStart': nextRecord.window_start,
          ':count': nextRecord.count,
          ':blockedUntil': nextRecord.blocked_until,
          ':expiresAt': nextRecord.expires_at,
          ':updatedAt': nextRecord.updated_at,
          ':nextVersion': nextRecord.version ?? 1,
        },
      }));
      return true;
    } catch (error) {
      if (isConditionalCheckFailure(error)) {
        return false;
      }
      throw error;
    }
  }
}
