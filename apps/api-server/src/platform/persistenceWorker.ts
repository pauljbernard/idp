import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { writeFile } from 'fs/promises';
import { parentPort } from 'worker_threads';

interface PersistedEnvelope<T> {
  version: number;
  saved_at: string;
  state: T;
}

interface PersistedEnvelopeWriteConditions {
  createOnly?: boolean;
  expectedSavedAt?: string | null;
  expectedVersion?: number | null;
  requireExisting?: boolean;
}

interface RemotePersistenceWorkerRequest {
  type: 'read-envelope' | 'write-envelope' | 'read-text' | 'write-text';
  locator: string;
  envelope?: PersistedEnvelope<unknown>;
  conditions?: PersistedEnvelopeWriteConditions;
  content?: string;
}

interface RemotePersistenceWorkerResponse<T> {
  ok: boolean;
  result?: T;
  error?: {
    message: string;
    name?: string;
    stack?: string;
  };
}

interface WorkerMessage {
  request: RemotePersistenceWorkerRequest;
  signalBuffer: SharedArrayBuffer;
  responseFilePath: string;
}

function readFirstConfiguredEnv(names: string[]): string | null {
  for (const name of names) {
    const rawValue = process.env[name]?.trim();
    if (rawValue) {
      return rawValue;
    }
  }
  return null;
}

function resolveAwsRegion(): string {
  return process.env.AWS_REGION?.trim() || process.env.AWS_DEFAULT_REGION?.trim() || 'us-east-1';
}

function resolveDynamoEndpoint(): string | undefined {
  return readFirstConfiguredEnv([
    'IDP_PLATFORM_DYNAMODB_ENDPOINT',
    'IDP_DYNAMODB_ENDPOINT',
    'AWS_DYNAMODB_ENDPOINT',
    'AWS_ENDPOINT',
  ]) || undefined;
}

function resolveS3Endpoint(): string | undefined {
  return readFirstConfiguredEnv([
    'IDP_PLATFORM_S3_ENDPOINT',
    'IDP_S3_ENDPOINT',
    'AWS_S3_ENDPOINT',
    'AWS_ENDPOINT',
  ]) || undefined;
}

function isLocalAwsEndpoint(endpoint: string | undefined): boolean {
  if (!endpoint) {
    return false;
  }
  return /^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?/i.test(endpoint);
}

function createDynamoDocumentClient(): DynamoDBDocumentClient {
  const endpoint = resolveDynamoEndpoint();
  const client = new DynamoDBClient({
    region: resolveAwsRegion(),
    endpoint,
    ...(isLocalAwsEndpoint(endpoint)
      && !process.env.AWS_ACCESS_KEY_ID
      && !process.env.AWS_SECRET_ACCESS_KEY
      ? {
          credentials: {
            accessKeyId: 'local',
            secretAccessKey: 'local',
          },
        }
      : {}),
  });

  return DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  });
}

function createS3Client(): S3Client {
  const endpoint = resolveS3Endpoint();
  return new S3Client({
    region: resolveAwsRegion(),
    endpoint,
    forcePathStyle: isLocalAwsEndpoint(endpoint),
    ...(isLocalAwsEndpoint(endpoint)
      && !process.env.AWS_ACCESS_KEY_ID
      && !process.env.AWS_SECRET_ACCESS_KEY
      ? {
          credentials: {
            accessKeyId: 'local',
            secretAccessKey: 'local',
          },
        }
      : {}),
  });
}

const dynamoClient = createDynamoDocumentClient();
const s3Client = createS3Client();

function parseDynamoLocator(locator: string): { tableName: string; stateKey: string } {
  const match = /^dynamodb:\/\/([^/]+)\/(.+)$/.exec(locator);
  if (!match) {
    throw new Error(`Invalid DynamoDB persistence locator: ${locator}`);
  }
  return {
    tableName: decodeURIComponent(match[1]),
    stateKey: decodeURIComponent(match[2]),
  };
}

function parseS3Locator(locator: string): { bucket: string; objectKey: string } {
  const match = /^s3:\/\/([^/]+)\/(.+)$/.exec(locator);
  if (!match) {
    throw new Error(`Invalid S3 persistence locator: ${locator}`);
  }
  return {
    bucket: decodeURIComponent(match[1]),
    objectKey: decodeURIComponent(match[2]),
  };
}

function isConditionalCheckFailure(error: unknown): boolean {
  return Boolean(
    error
    && typeof error === 'object'
    && 'name' in error
    && (error as { name?: string }).name === 'ConditionalCheckFailedException',
  );
}

function isMissingS3Object(error: unknown): boolean {
  return Boolean(
    error
    && typeof error === 'object'
    && 'name' in error
    && ((error as { name?: string }).name === 'NoSuchKey' || (error as { name?: string }).name === 'NotFound'),
  );
}

async function handleReadEnvelope<T>(locator: string): Promise<PersistedEnvelope<T> | null> {
  const { tableName, stateKey } = parseDynamoLocator(locator);
  const response = await dynamoClient.send(new GetCommand({
    TableName: tableName,
    Key: {
      state_key: stateKey,
    },
    ConsistentRead: true,
  }));

  if (!response.Item) {
    return null;
  }

  return {
    version: Number(response.Item.version ?? 1),
    saved_at: String(response.Item.saved_at),
    state: response.Item.state as T,
  };
}

async function handleWriteEnvelope<T>(
  locator: string,
  envelope: PersistedEnvelope<T>,
  conditions?: PersistedEnvelopeWriteConditions,
): Promise<void> {
  const { tableName, stateKey } = parseDynamoLocator(locator);
  const expressionNames: Record<string, string> = {
    '#state_key': 'state_key',
  };
  const expressionValues: Record<string, unknown> = {};
  const conditionExpressions: string[] = [];

  if (conditions?.createOnly) {
    conditionExpressions.push('attribute_not_exists(#state_key)');
  }

  if (conditions?.requireExisting) {
    conditionExpressions.push('attribute_exists(#state_key)');
  }

  if (conditions?.expectedSavedAt) {
    expressionNames['#saved_at'] = 'saved_at';
    expressionValues[':expectedSavedAt'] = conditions.expectedSavedAt;
    conditionExpressions.push('#saved_at = :expectedSavedAt');
  }

  if (typeof conditions?.expectedVersion === 'number') {
    expressionNames['#version'] = 'version';
    expressionValues[':expectedVersion'] = conditions.expectedVersion;
    conditionExpressions.push('#version = :expectedVersion');
  }

  try {
    const conditionalExpression = conditionExpressions.length > 0
      ? {
          ConditionExpression: conditionExpressions.join(' AND '),
          ExpressionAttributeNames: expressionNames,
          ...(Object.keys(expressionValues).length > 0
            ? {
                ExpressionAttributeValues: expressionValues,
              }
            : {}),
        }
      : {};

    await dynamoClient.send(new PutCommand({
      TableName: tableName,
      Item: {
        state_key: stateKey,
        version: envelope.version,
        saved_at: envelope.saved_at,
        state: envelope.state,
        updated_at: new Date().toISOString(),
      },
      ...conditionalExpression,
    }));
  } catch (error) {
    if (isConditionalCheckFailure(error)) {
      if (conditions?.createOnly) {
        throw new Error(`Refusing to overwrite existing persisted state for ${locator}.`);
      }
      if (conditions?.expectedSavedAt) {
        throw new Error(`Conditional write failed for ${locator}; persisted state changed concurrently.`);
      }
    }
    throw error;
  }
}

async function handleReadText(locator: string): Promise<string | null> {
  const { bucket, objectKey } = parseS3Locator(locator);
  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    }));
    if (!response.Body) {
      return '';
    }
    return await response.Body.transformToString();
  } catch (error) {
    if (isMissingS3Object(error)) {
      return null;
    }
    throw error;
  }
}

async function handleWriteText(locator: string, content: string): Promise<void> {
  const { bucket, objectKey } = parseS3Locator(locator);
  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    Body: content,
    ContentType: 'text/plain; charset=utf-8',
  }));
}

async function handleRequest(request: RemotePersistenceWorkerRequest): Promise<unknown> {
  switch (request.type) {
    case 'read-envelope':
      return handleReadEnvelope(request.locator);
    case 'write-envelope':
      return handleWriteEnvelope(request.locator, request.envelope as PersistedEnvelope<unknown>, request.conditions);
    case 'read-text':
      return handleReadText(request.locator);
    case 'write-text':
      return handleWriteText(request.locator, String(request.content ?? ''));
    default:
      throw new Error(`Unsupported persistence worker request type: ${(request as { type?: string }).type}`);
  }
}

async function writeResponse<T>(responseFilePath: string, response: RemotePersistenceWorkerResponse<T>): Promise<void> {
  await writeFile(responseFilePath, JSON.stringify(response), 'utf8');
}

if (!parentPort) {
  throw new Error('Persistence worker requires a parent port.');
}

parentPort.on('message', async (message: WorkerMessage) => {
  const signal = new Int32Array(message.signalBuffer);

  try {
    const result = await handleRequest(message.request);
    await writeResponse(message.responseFilePath, {
      ok: true,
      result,
    });
    Atomics.store(signal, 0, 1);
  } catch (error) {
    const normalizedError = error instanceof Error
      ? { message: error.message, name: error.name, stack: error.stack }
      : { message: String(error) };
    await writeResponse(message.responseFilePath, {
      ok: false,
      error: normalizedError,
    });
    Atomics.store(signal, 0, 2);
  }

  Atomics.notify(signal, 0);
});
