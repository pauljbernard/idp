#!/bin/bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
REALM_ID=""
CLIENT_ID=""
CLIENT_SECRET=""
ADMIN_EMAIL="${ADMIN_EMAIL:-alex.morgan@northstar.example}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-StandaloneIAM!TenantAdmin2026}"
TENANT_ID="${TENANT_ID:-northstar-holdings}"
MACHINE_CLIENT_ID="${MACHINE_CLIENT_ID:-machine-api-demo}"
MACHINE_CLIENT_SECRET="${MACHINE_CLIENT_SECRET:-StandaloneIAM!machine-api-demo!Secret2026}"
SERVICE_ACCOUNT_ID="realm-idp-default-machine-api-demo-service-account"

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "${TMP_DIR}"
}

restore_service_account() {
  if [[ ! -f "${TMP_DIR}/admin-auth-header.txt" || ! -f "${TMP_DIR}/service-account-restore-request.json" ]]; then
    return
  fi

  curl -sS -o /dev/null \
    -X PUT "${API_BASE_URL}/api/v1/iam/service-accounts/${SERVICE_ACCOUNT_ID}" \
    -H @"${TMP_DIR}/admin-auth-header.txt" \
    -H 'Content-Type: application/json' \
    --data @"${TMP_DIR}/service-account-restore-request.json" || true
}

on_exit() {
  restore_service_account
  cleanup
}
trap on_exit EXIT

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
  jq -r '"Authorization: Bearer " + .access_token' "${token_response_json}" > "${TMP_DIR}/${label}-auth-header.txt"
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
  jq -r '"Authorization: Bearer " + .access_token' "${token_response_json}" > "${TMP_DIR}/${label}-auth-header.txt"
}

authorized_get() {
  local auth_header_file="$1"
  local path="$2"
  local output_json="$3"
  local status
  status="$(curl -sS -o "${output_json}" -w '%{http_code}' \
    -H @"${auth_header_file}" \
    -H "X-Tenant-ID: ${TENANT_ID}" \
    "${API_BASE_URL}${path}")"
  assert_status "${status}" "200" "GET ${path}"
}

authorized_post_json() {
  local auth_header_file="$1"
  local path="$2"
  local request_json="$3"
  local output_json="$4"
  local expected_status="${5:-200}"
  local status
  status="$(curl -sS -o "${output_json}" -w '%{http_code}' \
    -X POST "${API_BASE_URL}${path}" \
    -H @"${auth_header_file}" \
    -H "X-Tenant-ID: ${TENANT_ID}" \
    -H 'Content-Type: application/json' \
    --data @"${request_json}")"
  assert_status "${status}" "${expected_status}" "POST ${path}"
}

forbidden_post_json() {
  local auth_header_file="$1"
  local path="$2"
  local request_json="$3"
  local output_json="$4"
  local status
  status="$(curl -sS -o "${output_json}" -w '%{http_code}' \
    -X POST "${API_BASE_URL}${path}" \
    -H @"${auth_header_file}" \
    -H "X-Tenant-ID: ${TENANT_ID}" \
    -H 'Content-Type: application/json' \
    --data @"${request_json}")"
  assert_status "${status}" "403" "POST ${path}"
}

resolve_auth_config
issue_password_grant_token "admin" "${ADMIN_EMAIL}" "${ADMIN_PASSWORD}"

curl -sS -o "${TMP_DIR}/service-accounts.json" \
  -H @"${TMP_DIR}/admin-auth-header.txt" \
  -H "X-Tenant-ID: ${TENANT_ID}" \
  "${API_BASE_URL}/api/v1/iam/service-accounts?realm_id=${REALM_ID}"

jq -c --arg client_id "${MACHINE_CLIENT_ID}" '.service_accounts[] | select(.client_id == $client_id) | {role_ids, status}' "${TMP_DIR}/service-accounts.json" \
  | jq '{role_ids: .role_ids, status: .status}' > "${TMP_DIR}/service-account-restore-request.json"

printf '%s' '{"role_ids":["role-default-service-viewer"],"status":"ACTIVE"}' > "${TMP_DIR}/service-account-viewer-request.json"

curl -sS -o "${TMP_DIR}/service-account-viewer-response.json" \
  -X PUT "${API_BASE_URL}/api/v1/iam/service-accounts/${SERVICE_ACCOUNT_ID}" \
  -H @"${TMP_DIR}/admin-auth-header.txt" \
  -H 'Content-Type: application/json' \
  --data @"${TMP_DIR}/service-account-viewer-request.json"

issue_client_credentials_token "viewer-machine" "${MACHINE_CLIENT_ID}" "${MACHINE_CLIENT_SECRET}"

authorized_get "${TMP_DIR}/viewer-machine-auth-header.txt" '/api/v1/fleet' "${TMP_DIR}/viewer-fleet-list.json"
authorized_get "${TMP_DIR}/viewer-machine-auth-header.txt" '/api/v1/fleet/export?format=json' "${TMP_DIR}/viewer-fleet-export.json"

AIRCRAFT_ID="$(jq -r '.aircraft[0].id // empty' "${TMP_DIR}/viewer-fleet-list.json")"
if [[ -z "${AIRCRAFT_ID}" ]]; then
  echo "No managed resource available for verification" >&2
  exit 1
fi

authorized_get "${TMP_DIR}/viewer-machine-auth-header.txt" "/api/v1/fleet/${AIRCRAFT_ID}" "${TMP_DIR}/viewer-fleet-detail.json"

printf '%s' '{"aircraft_name":"IAM Resource Viewer Denied","manufacturer":"Verifier","model_name":"ViewerDenied","serial_number":"IAM-RESOURCE-DENIED-001","status":"active","weight_category":"UNDER_250G"}' > "${TMP_DIR}/viewer-fleet-create-request.json"
forbidden_post_json "${TMP_DIR}/viewer-machine-auth-header.txt" '/api/v1/fleet' "${TMP_DIR}/viewer-fleet-create-request.json" "${TMP_DIR}/viewer-fleet-create-denied.json"

printf '%s' '{"aircraft_name":"IAM Resource Admin Created","manufacturer":"Verifier","model_name":"AdminCreated","serial_number":"IAM-RESOURCE-ADMIN-001","status":"active","weight_category":"UNDER_250G"}' > "${TMP_DIR}/admin-fleet-create-request.json"
authorized_post_json "${TMP_DIR}/admin-auth-header.txt" '/api/v1/fleet' "${TMP_DIR}/admin-fleet-create-request.json" "${TMP_DIR}/admin-fleet-create-response.json" "201"

jq -e '(.aircraft | type == "array") and (.count >= 1)' "${TMP_DIR}/viewer-fleet-list.json" > /dev/null
jq -e '.format == "json" and .count >= 1' "${TMP_DIR}/viewer-fleet-export.json" > /dev/null
jq -e --arg aircraft_id "${AIRCRAFT_ID}" '.id == $aircraft_id' "${TMP_DIR}/viewer-fleet-detail.json" > /dev/null
jq -e '.error != null' "${TMP_DIR}/viewer-fleet-create-denied.json" > /dev/null
jq -e '.id != null and .serial_number == "IAM-RESOURCE-ADMIN-001"' "${TMP_DIR}/admin-fleet-create-response.json" > /dev/null

jq -n \
  --slurpfile viewerList "${TMP_DIR}/viewer-fleet-list.json" \
  --slurpfile viewerDenied "${TMP_DIR}/viewer-fleet-create-denied.json" \
  --slurpfile adminCreate "${TMP_DIR}/admin-fleet-create-response.json" \
  '{
    viewer_access: {
      resource_count: $viewerList[0].count,
      create_error: $viewerDenied[0].error
    },
    admin_access: {
      created_resource_id: $adminCreate[0].id
    }
  }'
