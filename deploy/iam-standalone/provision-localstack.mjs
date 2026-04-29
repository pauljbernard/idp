import {
  CreateTableCommand,
  DescribeTableCommand,
  DescribeTimeToLiveCommand,
  UpdateTimeToLiveCommand,
} from "@aws-sdk/client-dynamodb";
import {
  CreateBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { createDynamoClient, createS3Client, runtimeEnv } from "./aws-clone-client.mjs";

const stateTable = process.env.IDP_PLATFORM_STATE_DYNAMODB_TABLE || "idp-platform-state-local";
const runtimeTable = process.env.IDP_IAM_RUNTIME_DDB_TABLE || "idp-iam-runtime-local";
const rateLimitTable = process.env.IDP_RATE_LIMIT_DYNAMODB_TABLE || "idp-rate-limit-local";
const durableBucket = process.env.IDP_PLATFORM_DURABLE_S3_BUCKET || "idp-durable-local";
const artifactBucket = process.env.IAM_ARTIFACT_BUCKET || "idp-iam-artifact-local";

const dynamo = createDynamoClient();
const s3 = createS3Client();

async function tableExists(tableName) {
  try {
    await dynamo.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch {
    return false;
  }
}

async function bucketExists(bucketName) {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucketName }));
    return true;
  } catch {
    return false;
  }
}

async function createStringHashTable(tableName, hashKey) {
  if (await tableExists(tableName)) {
    console.log(`DynamoDB table already exists: ${tableName}`);
    return;
  }

  console.log(`Creating DynamoDB table: ${tableName}`);
  await dynamo.send(
    new CreateTableCommand({
      TableName: tableName,
      AttributeDefinitions: [{ AttributeName: hashKey, AttributeType: "S" }],
      KeySchema: [{ AttributeName: hashKey, KeyType: "HASH" }],
      BillingMode: "PAY_PER_REQUEST",
    }),
  );
}

async function createRuntimeEntityTable(tableName) {
  if (await tableExists(tableName)) {
    console.log(`DynamoDB table already exists: ${tableName}`);
    return;
  }

  console.log(`Creating DynamoDB runtime entity table: ${tableName}`);
  await dynamo.send(
    new CreateTableCommand({
      TableName: tableName,
      AttributeDefinitions: [
        { AttributeName: "pk", AttributeType: "S" },
        { AttributeName: "sk", AttributeType: "S" },
        { AttributeName: "gsi1pk", AttributeType: "S" },
        { AttributeName: "gsi1sk", AttributeType: "S" },
        { AttributeName: "gsi2pk", AttributeType: "S" },
        { AttributeName: "gsi2sk", AttributeType: "S" },
      ],
      KeySchema: [
        { AttributeName: "pk", KeyType: "HASH" },
        { AttributeName: "sk", KeyType: "RANGE" },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "gsi1",
          KeySchema: [
            { AttributeName: "gsi1pk", KeyType: "HASH" },
            { AttributeName: "gsi1sk", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
        },
        {
          IndexName: "gsi2",
          KeySchema: [
            { AttributeName: "gsi2pk", KeyType: "HASH" },
            { AttributeName: "gsi2sk", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
        },
      ],
      BillingMode: "PAY_PER_REQUEST",
    }),
  );
}

async function enableTtl(tableName, ttlAttribute) {
  const ttl = await dynamo.send(
    new DescribeTimeToLiveCommand({ TableName: tableName }),
  );

  if (
    ttl.TimeToLiveDescription?.AttributeName === ttlAttribute &&
    ttl.TimeToLiveDescription?.TimeToLiveStatus === "ENABLED"
  ) {
    console.log(`TTL already enabled on ${tableName}.${ttlAttribute}`);
    return;
  }

  console.log(`Enabling TTL on ${tableName}.${ttlAttribute}`);
  await dynamo.send(
    new UpdateTimeToLiveCommand({
      TableName: tableName,
      TimeToLiveSpecification: {
        Enabled: true,
        AttributeName: ttlAttribute,
      },
    }),
  );
}

async function createBucket(bucketName) {
  if (await bucketExists(bucketName)) {
    console.log(`S3 bucket already exists: ${bucketName}`);
    return;
  }

  console.log(`Creating S3 bucket: ${bucketName}`);
  await s3.send(new CreateBucketCommand({ Bucket: bucketName }));
}

await createStringHashTable(stateTable, "state_key");
await createRuntimeEntityTable(runtimeTable);
await createStringHashTable(rateLimitTable, "bucket_key");
await enableTtl(runtimeTable, "expires_at_epoch");
await enableTtl(rateLimitTable, "expires_at");
await createBucket(durableBucket);
await createBucket(artifactBucket);

console.log(`Provisioned standalone IDP local AWS clone resources:
  State table: ${stateTable}
  Runtime entity table: ${runtimeTable}
  Rate-limit table: ${rateLimitTable}
  Durable bucket: ${durableBucket}
  Artifact bucket: ${artifactBucket}
  Region: ${runtimeEnv.awsRegion}
  Endpoint: ${runtimeEnv.awsEndpoint}`);
