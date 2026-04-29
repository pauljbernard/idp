import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

function readFirstConfiguredEnv(names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }
  return undefined;
}

export function resolveAwsRegion(): string {
  return process.env.AWS_REGION?.trim() || process.env.AWS_DEFAULT_REGION?.trim() || 'us-east-1';
}

export function resolveDynamoEndpoint(): string | undefined {
  return readFirstConfiguredEnv([
    'IDP_DYNAMODB_ENDPOINT',
    'AWS_DYNAMODB_ENDPOINT',
    'AWS_ENDPOINT',
  ]);
}

export function isLocalAwsEndpoint(endpoint: string | undefined): boolean {
  if (!endpoint) {
    return false;
  }
  return /^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?/i.test(endpoint);
}

export function createDynamoDocumentClient(): DynamoDBDocumentClient {
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
