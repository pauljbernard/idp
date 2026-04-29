import {
  DescribeTableCommand,
  DescribeTimeToLiveCommand,
} from "@aws-sdk/client-dynamodb";
import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { createDynamoClient, createS3Client, runtimeEnv } from "./aws-clone-client.mjs";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}.`);
    process.exit(1);
  }
  return value;
}

const stateTable = requireEnv("IDP_PLATFORM_STATE_DYNAMODB_TABLE");
const runtimeTable = requireEnv("IDP_IAM_RUNTIME_DDB_TABLE");
const rateLimitTable = requireEnv("IDP_RATE_LIMIT_DYNAMODB_TABLE");
const durableBucket = requireEnv("IDP_PLATFORM_DURABLE_S3_BUCKET");
const runtimeDualWrite = process.env.IDP_DDB_RUNTIME_DUAL_WRITE || "false";
const runtimeReadV2 = process.env.IDP_DDB_RUNTIME_READ_V2 || "false";

const dynamo = createDynamoClient();
const s3 = createS3Client();

async function requireTable(tableName) {
  try {
    const response = await dynamo.send(
      new DescribeTableCommand({ TableName: tableName }),
    );
    const resolvedName = response.Table?.TableName;
    if (resolvedName !== tableName) {
      throw new Error(`expected ${tableName}, got ${resolvedName ?? "unknown"}`);
    }
    return response.Table;
  } catch (error) {
    console.error(`Required DynamoDB table not found: ${tableName}`);
    if (error instanceof Error && error.message) {
      console.error(error.message);
    }
    process.exit(1);
  }
}

async function requireBucket(bucketName) {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucketName }));
  } catch (error) {
    console.error(`Required S3 bucket not found or not reachable: ${bucketName}`);
    if (error instanceof Error && error.message) {
      console.error(error.message);
    }
    process.exit(1);
  }
}

const stateTableInfo = await requireTable(stateTable);
const runtimeTableInfo = await requireTable(runtimeTable);
await requireTable(rateLimitTable);

const ttl = await dynamo.send(
  new DescribeTimeToLiveCommand({ TableName: runtimeTable }),
);
await requireBucket(durableBucket);

const runtimeGsiNames = (runtimeTableInfo.GlobalSecondaryIndexes || [])
  .map((index) => index.IndexName)
  .filter(Boolean);

for (const indexName of ["gsi1", "gsi2"]) {
  if (!runtimeGsiNames.includes(indexName)) {
    console.error(`Missing required runtime-table index: ${indexName}`);
    process.exit(1);
  }
}

const ttlAttribute = ttl.TimeToLiveDescription?.AttributeName || "unknown";
const ttlStatus = ttl.TimeToLiveDescription?.TimeToLiveStatus || "unknown";

console.log(`Distributed runtime test environment status:
  AWS endpoint: ${runtimeEnv.awsEndpoint}
  State table: ${stateTableInfo.TableName}
  Runtime table: ${runtimeTableInfo.TableName}
  Runtime GSIs: ${runtimeGsiNames.join(" ")}
  Runtime TTL: ${ttlAttribute} ${ttlStatus}
  Rate-limit table: ${rateLimitTable}
  Durable bucket: ${durableBucket}
  IDP_DDB_RUNTIME_DUAL_WRITE=${runtimeDualWrite}
  IDP_DDB_RUNTIME_READ_V2=${runtimeReadV2}

Validated requirements:
  - shared state table reachable
  - runtime entity table reachable with required indexes and TTL
  - distributed rate-limit table reachable
  - durable S3 bucket reachable`);
