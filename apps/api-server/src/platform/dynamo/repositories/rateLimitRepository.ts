import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export interface DynamoDbRateLimitRecord {
  bucket_key: string;
  scope_key: string;
  client_key: string;
  window_start: number;
  count: number;
  blocked_until: number;
  expires_at: number;
  updated_at: string;
  version?: number;
}

export interface RateLimitRepository {
  readonly client: DynamoDBDocumentClient;
  getRecord(bucketKey: string): Promise<DynamoDbRateLimitRecord | null>;
  putRecord(record: DynamoDbRateLimitRecord): Promise<boolean>;
  updateRecord(currentRecord: DynamoDbRateLimitRecord, nextRecord: DynamoDbRateLimitRecord): Promise<boolean>;
}
