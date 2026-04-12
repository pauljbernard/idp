#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${ENV_FILE:-${SCRIPT_DIR}/bootstrap.env.example}"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

AWS_ENDPOINT="${AWS_ENDPOINT:-http://localhost:4566}"
IDP_IAM_RUNTIME_DDB_TABLE="${IDP_IAM_RUNTIME_DDB_TABLE:-}"
IDP_DDB_RUNTIME_DUAL_WRITE="${IDP_DDB_RUNTIME_DUAL_WRITE:-false}"
IDP_DDB_RUNTIME_READ_V2="${IDP_DDB_RUNTIME_READ_V2:-false}"

if [[ -z "${IDP_IAM_RUNTIME_DDB_TABLE}" ]]; then
  echo "Missing IDP_IAM_RUNTIME_DDB_TABLE." >&2
  exit 1
fi

if command -v awslocal >/dev/null 2>&1; then
  AWS_CMD=(awslocal)
else
  AWS_CMD=(aws --endpoint-url "${AWS_ENDPOINT}")
fi

describe_table() {
  "${AWS_CMD[@]}" dynamodb describe-table --table-name "${IDP_IAM_RUNTIME_DDB_TABLE}"
}

if ! describe_table >/dev/null 2>&1; then
  echo "Runtime entity table not found: ${IDP_IAM_RUNTIME_DDB_TABLE}" >&2
  exit 1
fi

gsi_names="$("${AWS_CMD[@]}" dynamodb describe-table \
  --table-name "${IDP_IAM_RUNTIME_DDB_TABLE}" \
  --query 'Table.GlobalSecondaryIndexes[].IndexName' \
  --output text)"

ttl_state="$("${AWS_CMD[@]}" dynamodb describe-time-to-live \
  --table-name "${IDP_IAM_RUNTIME_DDB_TABLE}" \
  --query 'TimeToLiveDescription.[AttributeName,TimeToLiveStatus]' \
  --output text)"

require_gsi() {
  local index_name="$1"
  if [[ " ${gsi_names} " != *" ${index_name} "* ]]; then
    echo "Missing required runtime-table index: ${index_name}" >&2
    exit 1
  fi
}

require_gsi "gsi1"
require_gsi "gsi2"

cat <<SUMMARY
Runtime DynamoDB cutover status:
  Table: ${IDP_IAM_RUNTIME_DDB_TABLE}
  Endpoint: ${AWS_ENDPOINT}
  GSIs: ${gsi_names}
  TTL: ${ttl_state}
  IDP_DDB_RUNTIME_DUAL_WRITE=${IDP_DDB_RUNTIME_DUAL_WRITE}
  IDP_DDB_RUNTIME_READ_V2=${IDP_DDB_RUNTIME_READ_V2}

Recommended rollout:
  1. Keep IDP_DDB_RUNTIME_READ_V2=false.
  2. Enable IDP_DDB_RUNTIME_DUAL_WRITE=true and observe writes.
  3. Enable IDP_DDB_RUNTIME_READ_V2=true only after the runtime table is populated and stable.
SUMMARY
