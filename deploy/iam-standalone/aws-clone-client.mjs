import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";

const awsRegion = process.env.AWS_REGION || "us-east-1";
const awsEndpoint = process.env.AWS_ENDPOINT || "http://127.0.0.1:4566";
const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID || "test";
const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || "test";

const credentials = {
  accessKeyId: awsAccessKeyId,
  secretAccessKey: awsSecretAccessKey,
};

const baseClientConfig = {
  region: awsRegion,
  endpoint: awsEndpoint,
  credentials,
  maxAttempts: 1,
};

export const runtimeEnv = {
  awsRegion,
  awsEndpoint,
};

export function createDynamoClient() {
  return new DynamoDBClient(baseClientConfig);
}

export function createS3Client() {
  return new S3Client({
    ...baseClientConfig,
    forcePathStyle: true,
  });
}
