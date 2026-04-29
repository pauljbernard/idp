#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
DYNAMO_ENDPOINT="${DYNAMO_ENDPOINT:-http://127.0.0.1:8000}"
RUNTIME_TABLE_NAME="${IDP_IAM_RUNTIME_DDB_TABLE:-idp-iam-runtime-local}"
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"

curl_dynamo() {
  local target="$1"
  local payload="$2"

  curl --aws-sigv4 "aws:amz:${AWS_REGION}:dynamodb" \
    --user "${AWS_ACCESS_KEY_ID}:${AWS_SECRET_ACCESS_KEY}" \
    -sS "${DYNAMO_ENDPOINT}" \
    -H "x-amz-target: ${target}" \
    -H 'content-type: application/x-amz-json-1.0' \
    --data "${payload}"
}

describe_payload=$(printf '{"TableName":"%s"}' "${RUNTIME_TABLE_NAME}")

if curl_dynamo "DynamoDB_20120810.DescribeTable" "${describe_payload}" >/dev/null 2>&1; then
  echo "Runtime entity table already exists: ${RUNTIME_TABLE_NAME}"
else
  create_payload=$(cat <<EOF
{"TableName":"${RUNTIME_TABLE_NAME}","AttributeDefinitions":[{"AttributeName":"pk","AttributeType":"S"},{"AttributeName":"sk","AttributeType":"S"},{"AttributeName":"gsi1pk","AttributeType":"S"},{"AttributeName":"gsi1sk","AttributeType":"S"},{"AttributeName":"gsi2pk","AttributeType":"S"},{"AttributeName":"gsi2sk","AttributeType":"S"}],"KeySchema":[{"AttributeName":"pk","KeyType":"HASH"},{"AttributeName":"sk","KeyType":"RANGE"}],"GlobalSecondaryIndexes":[{"IndexName":"gsi1","KeySchema":[{"AttributeName":"gsi1pk","KeyType":"HASH"},{"AttributeName":"gsi1sk","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}},{"IndexName":"gsi2","KeySchema":[{"AttributeName":"gsi2pk","KeyType":"HASH"},{"AttributeName":"gsi2sk","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}],"BillingMode":"PAY_PER_REQUEST"}
EOF
)
  echo "Creating runtime entity table: ${RUNTIME_TABLE_NAME}"
  curl_dynamo "DynamoDB_20120810.CreateTable" "${create_payload}" >/dev/null
fi

ttl_payload=$(printf '{"TableName":"%s","TimeToLiveSpecification":{"Enabled":true,"AttributeName":"expires_at_epoch"}}' "${RUNTIME_TABLE_NAME}")
curl_dynamo "DynamoDB_20120810.UpdateTimeToLive" "${ttl_payload}" >/dev/null || true

describe_output="$(curl_dynamo "DynamoDB_20120810.DescribeTable" "${describe_payload}")"
ttl_output="$(curl_dynamo "DynamoDB_20120810.DescribeTimeToLive" "${describe_payload}")"

echo "Provisioned DynamoDB Local runtime table:"
echo "  Table: ${RUNTIME_TABLE_NAME}"
echo "  Endpoint: ${DYNAMO_ENDPOINT}"
echo "  Region: ${AWS_REGION}"
echo "  DescribeTable: ${describe_output}"
echo "  DescribeTimeToLive: ${ttl_output}"
