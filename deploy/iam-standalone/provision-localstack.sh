#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${ENV_FILE:-${SCRIPT_DIR}/bootstrap.env.example}"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ENDPOINT="${AWS_ENDPOINT:-http://localhost:4566}"
IDP_PLATFORM_STATE_DYNAMODB_TABLE="${IDP_PLATFORM_STATE_DYNAMODB_TABLE:-idp-platform-state-local}"
IDP_IAM_RUNTIME_DDB_TABLE="${IDP_IAM_RUNTIME_DDB_TABLE:-idp-iam-runtime-local}"
IDP_RATE_LIMIT_DYNAMODB_TABLE="${IDP_RATE_LIMIT_DYNAMODB_TABLE:-idp-rate-limit-local}"
IDP_PLATFORM_DURABLE_S3_BUCKET="${IDP_PLATFORM_DURABLE_S3_BUCKET:-idp-durable-local}"
IAM_ARTIFACT_BUCKET="${IAM_ARTIFACT_BUCKET:-idp-iam-artifact-local}"

if command -v awslocal >/dev/null 2>&1; then
  AWS_CMD=(awslocal)
else
  AWS_CMD=(aws --endpoint-url "${AWS_ENDPOINT}")
fi

table_exists() {
  local table_name="$1"
  "${AWS_CMD[@]}" dynamodb describe-table --table-name "${table_name}" >/dev/null 2>&1
}

bucket_exists() {
  local bucket_name="$1"
  "${AWS_CMD[@]}" s3api head-bucket --bucket "${bucket_name}" >/dev/null 2>&1
}

create_string_hash_table() {
  local table_name="$1"
  local hash_key="$2"

  if table_exists "${table_name}"; then
    echo "DynamoDB table already exists: ${table_name}"
    return
  fi

  echo "Creating DynamoDB table: ${table_name}"
  "${AWS_CMD[@]}" dynamodb create-table \
    --table-name "${table_name}" \
    --attribute-definitions "AttributeName=${hash_key},AttributeType=S" \
    --key-schema "AttributeName=${hash_key},KeyType=HASH" \
    --billing-mode PAY_PER_REQUEST >/dev/null
}

create_runtime_entity_table() {
  local table_name="$1"

  if table_exists "${table_name}"; then
    echo "DynamoDB table already exists: ${table_name}"
    return
  fi

  echo "Creating DynamoDB runtime entity table: ${table_name}"
  "${AWS_CMD[@]}" dynamodb create-table \
    --table-name "${table_name}" \
    --attribute-definitions \
      "AttributeName=pk,AttributeType=S" \
      "AttributeName=sk,AttributeType=S" \
      "AttributeName=gsi1pk,AttributeType=S" \
      "AttributeName=gsi1sk,AttributeType=S" \
      "AttributeName=gsi2pk,AttributeType=S" \
      "AttributeName=gsi2sk,AttributeType=S" \
    --key-schema \
      "AttributeName=pk,KeyType=HASH" \
      "AttributeName=sk,KeyType=RANGE" \
    --global-secondary-indexes \
      "IndexName=gsi1,KeySchema=[{AttributeName=gsi1pk,KeyType=HASH},{AttributeName=gsi1sk,KeyType=RANGE}],Projection={ProjectionType=ALL}" \
      "IndexName=gsi2,KeySchema=[{AttributeName=gsi2pk,KeyType=HASH},{AttributeName=gsi2sk,KeyType=RANGE}],Projection={ProjectionType=ALL}" \
    --billing-mode PAY_PER_REQUEST >/dev/null
}

enable_ttl() {
  local table_name="$1"
  local ttl_attribute="$2"

  echo "Enabling TTL on ${table_name}.${ttl_attribute}"
  "${AWS_CMD[@]}" dynamodb update-time-to-live \
    --table-name "${table_name}" \
    --time-to-live-specification "Enabled=true,AttributeName=${ttl_attribute}" >/dev/null
}

create_bucket() {
  local bucket_name="$1"

  if bucket_exists "${bucket_name}"; then
    echo "S3 bucket already exists: ${bucket_name}"
    return
  fi

  echo "Creating S3 bucket: ${bucket_name}"
  "${AWS_CMD[@]}" s3api create-bucket --bucket "${bucket_name}" >/dev/null
}

create_string_hash_table "${IDP_PLATFORM_STATE_DYNAMODB_TABLE}" "state_key"
create_runtime_entity_table "${IDP_IAM_RUNTIME_DDB_TABLE}"
create_string_hash_table "${IDP_RATE_LIMIT_DYNAMODB_TABLE}" "bucket_key"
enable_ttl "${IDP_IAM_RUNTIME_DDB_TABLE}" "expires_at_epoch"
enable_ttl "${IDP_RATE_LIMIT_DYNAMODB_TABLE}" "expires_at"
create_bucket "${IDP_PLATFORM_DURABLE_S3_BUCKET}"
create_bucket "${IAM_ARTIFACT_BUCKET}"

cat <<SUMMARY
Provisioned standalone IDP local AWS clone resources:
  State table: ${IDP_PLATFORM_STATE_DYNAMODB_TABLE}
  Runtime entity table: ${IDP_IAM_RUNTIME_DDB_TABLE}
  Rate-limit table: ${IDP_RATE_LIMIT_DYNAMODB_TABLE}
  Durable bucket: ${IDP_PLATFORM_DURABLE_S3_BUCKET}
  Artifact bucket: ${IAM_ARTIFACT_BUCKET}
  Region: ${AWS_REGION}
  Endpoint: ${AWS_ENDPOINT}
SUMMARY
