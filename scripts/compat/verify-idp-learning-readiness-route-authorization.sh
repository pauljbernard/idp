#!/bin/bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
ADMIN_TENANT_ID="${ADMIN_TENANT_ID:-northstar-holdings}"
ADMIN_EMAIL="${ADMIN_EMAIL:-alex.morgan@northstar.example}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-StandaloneIAM!TenantAdmin2026}"
MACHINE_CLIENT_ID="${MACHINE_CLIENT_ID:-machine-api-demo}"
MACHINE_CLIENT_SECRET="${MACHINE_CLIENT_SECRET:-StandaloneIAM!machine-api-demo!Secret2026}"
ADMIN_ROLE_ID="${ADMIN_ROLE_ID:-role-default-service-admin}"
SERVICE_ACCOUNT_ID="${SERVICE_ACCOUNT_ID:-realm-idp-default-machine-api-demo-service-account}"

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

forbidden_get() {
  local token="$1"
  local tenant_id="$2"
  local path="$3"
  local output_json="$4"
  local status
  status="$(curl -sS -o "${output_json}" -w '%{http_code}' \
    -H "Authorization: Bearer ${token}" \
    -H "X-Tenant-ID: ${tenant_id}" \
    "${API_BASE_URL}${path}")"
  assert_status "${status}" "403" "GET ${path}"
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
ADMIN_TOKEN="$(issue_password_grant_token "learning-readiness-admin" "${ADMIN_EMAIL}" "${ADMIN_PASSWORD}")"
SERVICE_ACCOUNTS_JSON="${TMP_DIR}/service-accounts.json"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/iam/service-accounts?realm_id=${REALM_ID}" "${SERVICE_ACCOUNTS_JSON}"
ORIGINAL_SERVICE_ACCOUNT_ROLE_IDS_JSON="$(jq -c --arg client_id "${MACHINE_CLIENT_ID}" '.service_accounts[] | select(.client_id == $client_id) | .role_ids' "${SERVICE_ACCOUNTS_JSON}" | head -n 1)"
ORIGINAL_SERVICE_ACCOUNT_STATUS="$(jq -r --arg client_id "${MACHINE_CLIENT_ID}" '.service_accounts[] | select(.client_id == $client_id) | .status' "${SERVICE_ACCOUNTS_JSON}" | head -n 1)"
VIEWER_MACHINE_TOKEN="$(issue_client_credentials_token "learning-readiness-viewer" "${MACHINE_CLIENT_ID}" "${MACHINE_CLIENT_SECRET}")"

VIEWER_CATALOG_JSON="${TMP_DIR}/viewer-catalog.json"
VIEWER_PATHWAYS_JSON="${TMP_DIR}/viewer-pathways.json"
VIEWER_RULES_JSON="${TMP_DIR}/viewer-rules.json"
VIEWER_ADMIN_OVERVIEW_DENY_JSON="${TMP_DIR}/viewer-admin-overview-deny.json"
VIEWER_ADMIN_COHORTS_DENY_JSON="${TMP_DIR}/viewer-admin-cohorts-deny.json"
VIEWER_ADMIN_INSTRUCTOR_RUNS_DENY_JSON="${TMP_DIR}/viewer-admin-instructor-runs-deny.json"
VIEWER_CROSS_USER_READINESS_DENY_JSON="${TMP_DIR}/viewer-cross-user-readiness-deny.json"
ADMIN_OVERVIEW_JSON="${TMP_DIR}/admin-overview.json"
ADMIN_COHORTS_JSON="${TMP_DIR}/admin-cohorts.json"
ADMIN_INSTRUCTOR_RUNS_JSON="${TMP_DIR}/admin-instructor-runs.json"
ADMIN_READINESS_EVALUATE_REQUEST_JSON="${TMP_DIR}/admin-readiness-evaluate-request.json"
ADMIN_READINESS_EVALUATE_JSON="${TMP_DIR}/admin-readiness-evaluate.json"
ADMIN_MACHINE_ASSIGNMENT_REQUEST_JSON="${TMP_DIR}/service-account-admin-request.json"
ADMIN_MACHINE_READINESS_STATUS_JSON="${TMP_DIR}/admin-machine-cross-user-readiness-status.json"
ADMIN_MACHINE_TRANSCRIPT_JSON="${TMP_DIR}/admin-machine-cross-user-transcript.json"

authorized_get "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/training/catalog' "${VIEWER_CATALOG_JSON}"
authorized_get "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/training/pathways' "${VIEWER_PATHWAYS_JSON}"
authorized_get "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/readiness/rules' "${VIEWER_RULES_JSON}"
forbidden_get "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/training/admin/overview' "${VIEWER_ADMIN_OVERVIEW_DENY_JSON}"
forbidden_get "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/training/admin/cohorts' "${VIEWER_ADMIN_COHORTS_DENY_JSON}"
forbidden_get "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/training/admin/instructor-runs' "${VIEWER_ADMIN_INSTRUCTOR_RUNS_DENY_JSON}"
forbidden_get "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/readiness/status?user_id=tenant-admin' "${VIEWER_CROSS_USER_READINESS_DENY_JSON}"

authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/training/admin/overview' "${ADMIN_OVERVIEW_JSON}"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/training/admin/cohorts' "${ADMIN_COHORTS_JSON}"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/training/admin/instructor-runs' "${ADMIN_INSTRUCTOR_RUNS_JSON}"

printf '{}\n' > "${ADMIN_READINESS_EVALUATE_REQUEST_JSON}"
authorized_post_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/readiness/evaluate' "${ADMIN_READINESS_EVALUATE_REQUEST_JSON}" "${ADMIN_READINESS_EVALUATE_JSON}" "200"

jq -n \
  --arg admin_role_id "${ADMIN_ROLE_ID}" \
  '{
    role_ids: [$admin_role_id],
    status: "ACTIVE"
  }' > "${ADMIN_MACHINE_ASSIGNMENT_REQUEST_JSON}"
authorized_put_json "${ADMIN_TOKEN}" "/api/v1/iam/service-accounts/${SERVICE_ACCOUNT_ID}" "${ADMIN_MACHINE_ASSIGNMENT_REQUEST_JSON}" "${TMP_DIR}/service-account-admin-response.json"
ADMIN_MACHINE_TOKEN="$(issue_client_credentials_token "learning-readiness-admin-machine" "${MACHINE_CLIENT_ID}" "${MACHINE_CLIENT_SECRET}")"
authorized_get "${ADMIN_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/readiness/status?user_id=tenant-admin' "${ADMIN_MACHINE_READINESS_STATUS_JSON}"
authorized_get "${ADMIN_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/training/transcript?user_id=tenant-admin' "${ADMIN_MACHINE_TRANSCRIPT_JSON}"

jq -e '.count >= 0 and (.pathways | type) == "array" and (.courses | type) == "array"' "${VIEWER_CATALOG_JSON}" > /dev/null
jq -e '.count >= 0 and (.pathways | type) == "array"' "${VIEWER_PATHWAYS_JSON}" > /dev/null
jq -e '.count >= 0 and (.rules | type) == "array"' "${VIEWER_RULES_JSON}" > /dev/null
jq -e '.generated_at != null' "${ADMIN_OVERVIEW_JSON}" > /dev/null
jq -e 'type == "array"' "${ADMIN_COHORTS_JSON}" > /dev/null
jq -e 'type == "array"' "${ADMIN_INSTRUCTOR_RUNS_JSON}" > /dev/null
jq -e '.checked_at != null and .overall_status != null' "${ADMIN_READINESS_EVALUATE_JSON}" > /dev/null
jq -e '.overall_status != null and .user_id == "tenant-admin"' "${ADMIN_MACHINE_READINESS_STATUS_JSON}" > /dev/null
jq -e '.user_id == "tenant-admin" and .qualifications != null and .learning_hours_summary != null' "${ADMIN_MACHINE_TRANSCRIPT_JSON}" > /dev/null

echo "IDP learning/readiness route verification passed."
