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

  async incrementSameWindow(record: {
    bucket_key: string;
    scope_key: string;
    client_key: string;
    window_start: number;
    blocked_until: number;
    expires_at: number;
    updated_at: string;
  }, now: number): Promise<DynamoDbRateLimitRecord | null> {
    try {
      const response = await this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          bucket_key: record.bucket_key,
        },
        UpdateExpression: [
          'SET #scope_key = :scopeKey',
          '#client_key = :clientKey',
          '#window_start = :windowStart',
          '#blocked_until = :blockedUntil',
          '#expires_at = :expiresAt',
          '#updated_at = :updatedAt',
          '#version = if_not_exists(#version, :zero) + :one',
        ].join(', ') + ' ADD #count :increment',
        ConditionExpression: '#window_start = :windowStart AND (#blocked_until <= :now OR attribute_not_exists(#blocked_until))',
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
          ':scopeKey': record.scope_key,
          ':clientKey': record.client_key,
          ':windowStart': record.window_start,
          ':blockedUntil': record.blocked_until,
          ':expiresAt': record.expires_at,
          ':updatedAt': record.updated_at,
          ':now': now,
          ':increment': 1,
          ':zero': 0,
          ':one': 1,
        },
        ReturnValues: 'ALL_NEW',
      }));

      return (response.Attributes as DynamoDbRateLimitRecord | undefined) ?? null;
    } catch (error) {
      if (isConditionalCheckFailure(error)) {
        return null;
      }
      throw error;
    }
  }

  async markBlocked(record: {
    bucket_key: string;
    window_start: number;
    blocked_until: number;
    expires_at: number;
    updated_at: string;
  }): Promise<DynamoDbRateLimitRecord | null> {
    try {
      const response = await this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          bucket_key: record.bucket_key,
        },
        UpdateExpression: [
          'SET #blocked_until = :blockedUntil',
          '#expires_at = :expiresAt',
          '#updated_at = :updatedAt',
          '#version = if_not_exists(#version, :zero) + :one',
        ].join(', '),
        ConditionExpression: '#window_start = :windowStart AND (attribute_not_exists(#blocked_until) OR #blocked_until < :blockedUntil)',
        ExpressionAttributeNames: {
          '#window_start': 'window_start',
          '#blocked_until': 'blocked_until',
          '#expires_at': 'expires_at',
          '#updated_at': 'updated_at',
          '#version': 'version',
        },
        ExpressionAttributeValues: {
          ':windowStart': record.window_start,
          ':blockedUntil': record.blocked_until,
          ':expiresAt': record.expires_at,
          ':updatedAt': record.updated_at,
          ':zero': 0,
          ':one': 1,
        },
        ReturnValues: 'ALL_NEW',
      }));

      return (response.Attributes as DynamoDbRateLimitRecord | undefined) ?? null;
    } catch (error) {
      if (isConditionalCheckFailure(error)) {
        return null;
      }
      throw error;
    }
  }
}
