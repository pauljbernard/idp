#!/bin/bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
ADMIN_TENANT_ID="${ADMIN_TENANT_ID:-northstar-holdings}"
ADMIN_EMAIL="${ADMIN_EMAIL:-alex.morgan@northstar.example}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-StandaloneIAM!TenantAdmin2026}"
MACHINE_CLIENT_ID="${MACHINE_CLIENT_ID:-machine-api-demo}"
MACHINE_CLIENT_SECRET="${MACHINE_CLIENT_SECRET:-StandaloneIAM!machine-api-demo!Secret2026}"
VIEWER_ROLE_ID="${VIEWER_ROLE_ID:-role-default-service-viewer}"
ADMIN_ROLE_ID="${ADMIN_ROLE_ID:-role-default-service-admin}"
SERVICE_ACCOUNT_ID="${SERVICE_ACCOUNT_ID:-realm-idp-default-machine-api-demo-service-account}"
RUN_ID="${RUN_ID:-$(date +%s)}"

TMP_DIR="$(mktemp -d)"
cleanup() {
  if [[ "${KEEP_TMP_DIR:-0}" == "1" ]]; then
    echo "Keeping tmp dir: ${TMP_DIR}" >&2
    return
  fi
  rm -rf "${TMP_DIR}"
}

ORIGINAL_SERVICE_ACCOUNT_ROLE_IDS_JSON='[]'
ORIGINAL_SERVICE_ACCOUNT_STATUS='ACTIVE'
ADMIN_TOKEN=''

assert_status() {
  local actual="$1"
  local expected="$2"
  local label="$3"
  if [[ "${actual}" != "${expected}" ]]; then
    echo "${label} expected HTTP ${expected}, got ${actual}" >&2
    exit 1
  fi
}

resolve_auth_config() {
  local auth_config_json="${TMP_DIR}/auth-config.json"
  curl -sS -o "${auth_config_json}" "${API_BASE_URL}/api/v1/auth/iam/config"
  REALM_ID="$(jq -r '.realm_id' "${auth_config_json}")"
  CLIENT_ID="$(jq -r '.client_id' "${auth_config_json}")"
  CLIENT_SECRET="StandaloneIAM!${CLIENT_ID}!Secret2026"
}

issue_password_grant_token() {
  local label="$1"
  local email="$2"
  local password="$3"
  local token_response_json="${TMP_DIR}/${label}-token.json"
  local basic_auth
  basic_auth="$(printf '%s' "${CLIENT_ID}:${CLIENT_SECRET}" | base64 | tr -d '\n')"

  curl -sS -o "${token_response_json}" \
    -X POST "${API_BASE_URL}/api/v1/iam/realms/${REALM_ID}/protocol/openid-connect/token" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    -H "Authorization: Basic ${basic_auth}" \
    --data-urlencode 'grant_type=password' \
    --data-urlencode "client_id=${CLIENT_ID}" \
    --data-urlencode "username=${email}" \
    --data-urlencode "password=${password}" \
    --data-urlencode 'scope=openid profile email roles groups'

  jq -e '.access_token != null and .token_type == "Bearer"' "${token_response_json}" > /dev/null
  jq -r '.access_token' "${token_response_json}"
}

issue_client_credentials_token() {
  local label="$1"
  local client_id="$2"
  local client_secret="$3"
  local token_response_json="${TMP_DIR}/${label}-token.json"
  local basic_auth
  basic_auth="$(printf '%s' "${client_id}:${client_secret}" | base64 | tr -d '\n')"

  curl -sS -o "${token_response_json}" \
    -X POST "${API_BASE_URL}/api/v1/iam/realms/${REALM_ID}/protocol/openid-connect/token" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    -H "Authorization: Basic ${basic_auth}" \
    --data-urlencode 'grant_type=client_credentials' \
    --data-urlencode "client_id=${client_id}" \
    --data-urlencode 'scope=roles groups'

  jq -e '.access_token != null and .token_type == "Bearer"' "${token_response_json}" > /dev/null
  jq -r '.access_token' "${token_response_json}"
}

authorized_get() {
  local token="$1"
  local tenant_id="$2"
  local path="$3"
  local output_json="$4"
  local status
  status="$(curl -sS -o "${output_json}" -w '%{http_code}' \
    -H "Authorization: Bearer ${token}" \
    -H "X-Tenant-ID: ${tenant_id}" \
    "${API_BASE_URL}${path}")"
  assert_status "${status}" "200" "GET ${path}"
}

authorized_post_json() {
  local token="$1"
  local tenant_id="$2"
  local path="$3"
  local request_json="$4"
  local output_json="$5"
  local expected_status="${6:-200}"
  local status
  status="$(curl -sS -o "${output_json}" -w '%{http_code}' \
    -X POST "${API_BASE_URL}${path}" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${token}" \
    -H "X-Tenant-ID: ${tenant_id}" \
    --data @"${request_json}")"
  assert_status "${status}" "${expected_status}" "POST ${path}"
}

forbidden_post_json() {
  local token="$1"
  local tenant_id="$2"
  local path="$3"
  local request_json="$4"
  local output_json="$5"
  local status
  status="$(curl -sS -o "${output_json}" -w '%{http_code}' \
    -X POST "${API_BASE_URL}${path}" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${token}" \
    -H "X-Tenant-ID: ${tenant_id}" \
    --data @"${request_json}")"
  assert_status "${status}" "403" "POST ${path}"
}

authorized_put_json() {
  local token="$1"
  local path="$2"
  local request_json="$3"
  local output_json="$4"
  local status
  status="$(curl -sS -o "${output_json}" -w '%{http_code}' \
    -X PUT "${API_BASE_URL}${path}" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${token}" \
    --data @"${request_json}")"
  assert_status "${status}" "200" "PUT ${path}"
}

restore_service_account() {
  if [[ -z "${ADMIN_TOKEN}" ]]; then
    return
  fi

  local restore_request_json="${TMP_DIR}/service-account-restore-request.json"
  jq -n \
    --argjson role_ids "${ORIGINAL_SERVICE_ACCOUNT_ROLE_IDS_JSON}" \
    --arg status "${ORIGINAL_SERVICE_ACCOUNT_STATUS}" \
    '{
      role_ids: $role_ids,
      status: $status
    }' > "${restore_request_json}"

  curl -sS -o /dev/null \
    -X PUT "${API_BASE_URL}/api/v1/iam/service-accounts/${SERVICE_ACCOUNT_ID}" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    --data @"${restore_request_json}" || true
}

on_exit() {
  restore_service_account
  cleanup
}
trap on_exit EXIT

REALM_ID=""
CLIENT_ID=""
CLIENT_SECRET=""

resolve_auth_config
ADMIN_TOKEN="$(issue_password_grant_token "evaluate-ingest-admin" "${ADMIN_EMAIL}" "${ADMIN_PASSWORD}")"

SERVICE_ACCOUNTS_JSON="${TMP_DIR}/service-accounts.json"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/iam/service-accounts?realm_id=${REALM_ID}" "${SERVICE_ACCOUNTS_JSON}"
ORIGINAL_SERVICE_ACCOUNT_ROLE_IDS_JSON="$(jq -c --arg client_id "${MACHINE_CLIENT_ID}" '.service_accounts[] | select(.client_id == $client_id) | .role_ids' "${SERVICE_ACCOUNTS_JSON}" | head -n 1)"
ORIGINAL_SERVICE_ACCOUNT_STATUS="$(jq -r --arg client_id "${MACHINE_CLIENT_ID}" '.service_accounts[] | select(.client_id == $client_id) | .status' "${SERVICE_ACCOUNTS_JSON}" | head -n 1)"

VIEWER_ASSIGNMENT_REQUEST_JSON="${TMP_DIR}/service-account-viewer-request.json"
jq -n \
  --arg viewer_role_id "${VIEWER_ROLE_ID}" \
  '{
    role_ids: [$viewer_role_id],
    status: "ACTIVE"
  }' > "${VIEWER_ASSIGNMENT_REQUEST_JSON}"
authorized_put_json "${ADMIN_TOKEN}" "/api/v1/iam/service-accounts/${SERVICE_ACCOUNT_ID}" "${VIEWER_ASSIGNMENT_REQUEST_JSON}" "${TMP_DIR}/service-account-viewer-response.json"

VIEWER_MACHINE_TOKEN="$(issue_client_credentials_token "evaluate-ingest-viewer-machine" "${MACHINE_CLIENT_ID}" "${MACHINE_CLIENT_SECRET}")"

EVALUATE_REQUEST_JSON="${TMP_DIR}/evaluate-request.json"
cat > "${EVALUATE_REQUEST_JSON}" <<EOF
{
  "tenant_id": "${ADMIN_TENANT_ID}",
  "mission_name": "IAM Evaluate Verification ${RUN_ID}",
  "mission_geometry_type": "POINT",
  "geometry": {
    "type": "Point",
    "coordinates": [-122.3758, 37.6213]
  }
}
EOF

INGEST_REQUEST_JSON="${TMP_DIR}/ingest-request.json"
cat > "${INGEST_REQUEST_JSON}" <<EOF
{
  "tenant_id": "${ADMIN_TENANT_ID}",
  "source_system": "faa",
  "source_type": "notice",
  "source_identifier": "iam-evaluate-ingest-${RUN_ID}"
}
EOF

forbidden_post_json "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/evaluate' "${EVALUATE_REQUEST_JSON}" "${TMP_DIR}/viewer-evaluate-deny.json"
forbidden_post_json "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/ingest' "${INGEST_REQUEST_JSON}" "${TMP_DIR}/viewer-ingest-deny.json"

ADMIN_ASSIGNMENT_REQUEST_JSON="${TMP_DIR}/service-account-admin-request.json"
jq -n \
  --arg admin_role_id "${ADMIN_ROLE_ID}" \
  '{
    role_ids: [$admin_role_id],
    status: "ACTIVE"
  }' > "${ADMIN_ASSIGNMENT_REQUEST_JSON}"
authorized_put_json "${ADMIN_TOKEN}" "/api/v1/iam/service-accounts/${SERVICE_ACCOUNT_ID}" "${ADMIN_ASSIGNMENT_REQUEST_JSON}" "${TMP_DIR}/service-account-admin-response.json"

ADMIN_MACHINE_TOKEN="$(issue_client_credentials_token "evaluate-ingest-admin-machine" "${MACHINE_CLIENT_ID}" "${MACHINE_CLIENT_SECRET}")"

authorized_post_json "${ADMIN_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/evaluate' "${EVALUATE_REQUEST_JSON}" "${TMP_DIR}/admin-machine-evaluate.json" "200"
authorized_get "${ADMIN_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/ingestions' "${TMP_DIR}/admin-machine-ingestions.json"
authorized_get "${ADMIN_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/ingestions/governance' "${TMP_DIR}/admin-machine-ingestions-governance.json"
authorized_post_json "${ADMIN_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/ingest' "${INGEST_REQUEST_JSON}" "${TMP_DIR}/admin-machine-ingest.json" "200"

jq -e '.decision_artifact_id != null' "${TMP_DIR}/admin-machine-evaluate.json" > /dev/null
jq -e '.count >= 0 and (.runs | type) == "array"' "${TMP_DIR}/admin-machine-ingestions.json" > /dev/null
jq -e '.tenant_id == "'${ADMIN_TENANT_ID}'"' "${TMP_DIR}/admin-machine-ingestions-governance.json" > /dev/null
jq -e '.source_identifier == "iam-evaluate-ingest-'${RUN_ID}'"' "${TMP_DIR}/admin-machine-ingest.json" > /dev/null

echo "IDP evaluate/ingest route verification passed."
