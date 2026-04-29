import {
  DescribeTableCommand,
  DescribeTimeToLiveCommand,
} from "@aws-sdk/client-dynamodb";
import { createDynamoClient, runtimeEnv } from "./aws-clone-client.mjs";

const runtimeTable = process.env.IDP_IAM_RUNTIME_DDB_TABLE;

if (!runtimeTable) {
  console.error("Missing IDP_IAM_RUNTIME_DDB_TABLE.");
  process.exit(1);
}

const runtimeDualWrite = process.env.IDP_DDB_RUNTIME_DUAL_WRITE || "false";
const runtimeReadV2 = process.env.IDP_DDB_RUNTIME_READ_V2 || "false";
const dynamo = createDynamoClient();

let table;
try {
  const response = await dynamo.send(
    new DescribeTableCommand({ TableName: runtimeTable }),
  );
  table = response.Table;
} catch (error) {
  console.error(`Runtime entity table not found: ${runtimeTable}`);
  if (error instanceof Error && error.message) {
    console.error(error.message);
  }
  process.exit(1);
}

const gsiNames = (table?.GlobalSecondaryIndexes || [])
  .map((index) => index.IndexName)
  .filter(Boolean);

for (const indexName of ["gsi1", "gsi2"]) {
  if (!gsiNames.includes(indexName)) {
    console.error(`Missing required runtime-table index: ${indexName}`);
    process.exit(1);
  }
}

const ttl = await dynamo.send(
  new DescribeTimeToLiveCommand({ TableName: runtimeTable }),
);
const ttlAttribute = ttl.TimeToLiveDescription?.AttributeName || "unknown";
const ttlStatus = ttl.TimeToLiveDescription?.TimeToLiveStatus || "unknown";

console.log(`Runtime DynamoDB cutover status:
  Table: ${runtimeTable}
  Endpoint: ${runtimeEnv.awsEndpoint}
  GSIs: ${gsiNames.join(" ")}
  TTL: ${ttlAttribute} ${ttlStatus}
  IDP_DDB_RUNTIME_DUAL_WRITE=${runtimeDualWrite}
  IDP_DDB_RUNTIME_READ_V2=${runtimeReadV2}

Recommended rollout:
  1. Keep IDP_DDB_RUNTIME_READ_V2=false.
  2. Enable IDP_DDB_RUNTIME_DUAL_WRITE=true and observe writes.
  3. Enable IDP_DDB_RUNTIME_READ_V2=true only after the runtime table is populated and stable.`);
