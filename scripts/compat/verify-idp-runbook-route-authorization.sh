#!/bin/bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
REALM_ID=""
CLIENT_ID=""
CLIENT_SECRET=""
ADMIN_TENANT_ID="${ADMIN_TENANT_ID:-northstar-holdings}"
ADMIN_EMAIL="${ADMIN_EMAIL:-alex.morgan@northstar.example}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-StandaloneIAM!TenantAdmin2026}"
MACHINE_CLIENT_ID="${MACHINE_CLIENT_ID:-machine-api-demo}"
MACHINE_CLIENT_SECRET="${MACHINE_CLIENT_SECRET:-StandaloneIAM!machine-api-demo!Secret2026}"
VIEWER_ROLE_ID="${VIEWER_ROLE_ID:-role-default-service-viewer}"
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
SERVICE_ACCOUNT_ID=''
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
  local tenant_id="$2"
  local path="$3"
  local request_json="$4"
  local output_json="$5"
  local status
  status="$(curl -sS -o "${output_json}" -w '%{http_code}' \
    -X PUT "${API_BASE_URL}${path}" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${token}" \
    -H "X-Tenant-ID: ${tenant_id}" \
    --data @"${request_json}")"
  assert_status "${status}" "200" "PUT ${path}"
}

restore_service_account() {
  if [[ -z "${SERVICE_ACCOUNT_ID}" || -z "${ADMIN_TOKEN}" ]]; then
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

resolve_auth_config
ADMIN_TOKEN="$(issue_password_grant_token "runbook-admin" "${ADMIN_EMAIL}" "${ADMIN_PASSWORD}")"

SERVICE_ACCOUNTS_JSON="${TMP_DIR}/service-accounts.json"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/iam/service-accounts?realm_id=${REALM_ID}" "${SERVICE_ACCOUNTS_JSON}"
SERVICE_ACCOUNT_ID="$(jq -r --arg client_id "${MACHINE_CLIENT_ID}" '.service_accounts[] | select(.client_id == $client_id) | .id' "${SERVICE_ACCOUNTS_JSON}" | head -n 1)"
if [[ -z "${SERVICE_ACCOUNT_ID}" ]]; then
  echo "Unable to resolve machine service account for ${MACHINE_CLIENT_ID}" >&2
  exit 1
fi
ORIGINAL_SERVICE_ACCOUNT_ROLE_IDS_JSON="$(jq -c --arg client_id "${MACHINE_CLIENT_ID}" '.service_accounts[] | select(.client_id == $client_id) | .role_ids' "${SERVICE_ACCOUNTS_JSON}" | head -n 1)"
ORIGINAL_SERVICE_ACCOUNT_STATUS="$(jq -r --arg client_id "${MACHINE_CLIENT_ID}" '.service_accounts[] | select(.client_id == $client_id) | .status' "${SERVICE_ACCOUNTS_JSON}" | head -n 1)"

VIEWER_ASSIGNMENT_REQUEST_JSON="${TMP_DIR}/service-account-viewer-request.json"
jq -n \
  --arg viewer_role_id "${VIEWER_ROLE_ID}" \
  '{
    role_ids: [$viewer_role_id],
    status: "ACTIVE"
  }' > "${VIEWER_ASSIGNMENT_REQUEST_JSON}"

VIEWER_ASSIGNMENT_RESPONSE_JSON="${TMP_DIR}/service-account-viewer-response.json"
authorized_put_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/iam/service-accounts/${SERVICE_ACCOUNT_ID}" "${VIEWER_ASSIGNMENT_REQUEST_JSON}" "${VIEWER_ASSIGNMENT_RESPONSE_JSON}"

VIEWER_MACHINE_TOKEN="$(issue_client_credentials_token "runbook-viewer-machine" "${MACHINE_CLIENT_ID}" "${MACHINE_CLIENT_SECRET}")"

MISSION_LIST_JSON="${TMP_DIR}/mission-list.json"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/missions' "${MISSION_LIST_JSON}"
MISSION_ID="$(jq -r '.missions[0].id' "${MISSION_LIST_JSON}")"
if [[ -z "${MISSION_ID}" || "${MISSION_ID}" == "null" ]]; then
  echo "Unable to resolve workflow id for runbook verification" >&2
  exit 1
fi

GENERATE_REQUEST_JSON="${TMP_DIR}/checklist-generate-request.json"
jq -n \
  --arg mission_id "${MISSION_ID}" \
  '{
    mission_id: $mission_id,
    pilot_category: "commercial",
    aircraft_type: "multirotor"
  }' > "${GENERATE_REQUEST_JSON}"

ADMIN_GENERATE_RESPONSE_JSON="${TMP_DIR}/admin-checklist-generate.json"
authorized_post_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/checklists/generate' "${GENERATE_REQUEST_JSON}" "${ADMIN_GENERATE_RESPONSE_JSON}" "201"
EXECUTION_ID="$(jq -r '.id' "${ADMIN_GENERATE_RESPONSE_JSON}")"
ITEM_ID="$(jq -r '.items[0].id' "${ADMIN_GENERATE_RESPONSE_JSON}")"
if [[ -z "${EXECUTION_ID}" || "${EXECUTION_ID}" == "null" || -z "${ITEM_ID}" || "${ITEM_ID}" == "null" ]]; then
  echo "Unable to resolve generated checklist execution or item id" >&2
  exit 1
fi

ITEM_UPDATE_REQUEST_JSON="${TMP_DIR}/checklist-item-update-request.json"
jq -n \
  --arg run_id "${RUN_ID}" \
  '{
    completed: true,
    notes: ("IAM runbook verifier item completion " + $run_id)
  }' > "${ITEM_UPDATE_REQUEST_JSON}"

VIEWER_TEMPLATES_JSON="${TMP_DIR}/viewer-checklist-templates.json"
VIEWER_EXECUTIONS_JSON="${TMP_DIR}/viewer-checklist-executions.json"
VIEWER_DETAIL_JSON="${TMP_DIR}/viewer-checklist-detail.json"
VIEWER_EXPORT_JSON="${TMP_DIR}/viewer-checklist-export.json"

authorized_get "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/checklists/templates' "${VIEWER_TEMPLATES_JSON}"
authorized_get "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/checklists/executions' "${VIEWER_EXECUTIONS_JSON}"
authorized_get "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/checklists/executions/${EXECUTION_ID}" "${VIEWER_DETAIL_JSON}"
authorized_get "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/checklists/executions/${EXECUTION_ID}/export?format=json" "${VIEWER_EXPORT_JSON}"

jq -e '.templates | length > 0' "${VIEWER_TEMPLATES_JSON}" > /dev/null
jq -e '.executions | length > 0' "${VIEWER_EXECUTIONS_JSON}" > /dev/null
jq -e --arg execution_id "${EXECUTION_ID}" '.id == $execution_id' "${VIEWER_DETAIL_JSON}" > /dev/null
jq -e '.format == "json" or .content_type != null' "${VIEWER_EXPORT_JSON}" > /dev/null

VIEWER_GENERATE_DENY_JSON="${TMP_DIR}/viewer-checklist-generate-deny.json"
VIEWER_ITEM_UPDATE_DENY_JSON="${TMP_DIR}/viewer-checklist-item-update-deny.json"
VIEWER_VALIDATE_DENY_JSON="${TMP_DIR}/viewer-checklist-validate-deny.json"

forbidden_post_json "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/checklists/generate' "${GENERATE_REQUEST_JSON}" "${VIEWER_GENERATE_DENY_JSON}"
forbidden_post_json "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/checklists/executions/${EXECUTION_ID}/items/${ITEM_ID}" "${ITEM_UPDATE_REQUEST_JSON}" "${VIEWER_ITEM_UPDATE_DENY_JSON}"
forbidden_post_json "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/checklists/executions/${EXECUTION_ID}/validate" /dev/null "${VIEWER_VALIDATE_DENY_JSON}"

ADMIN_ITEM_UPDATE_RESPONSE_JSON="${TMP_DIR}/admin-checklist-item-update.json"
authorized_post_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/checklists/executions/${EXECUTION_ID}/items/${ITEM_ID}" "${ITEM_UPDATE_REQUEST_JSON}" "${ADMIN_ITEM_UPDATE_RESPONSE_JSON}" "200"
jq -e --arg item_id "${ITEM_ID}" '.items[] | select(.id == $item_id) | .completed == true' "${ADMIN_ITEM_UPDATE_RESPONSE_JSON}" > /dev/null

EMPTY_JSON="${TMP_DIR}/empty.json"
printf '{}' > "${EMPTY_JSON}"

ADMIN_VALIDATE_RESPONSE_JSON="${TMP_DIR}/admin-checklist-validate.json"
authorized_post_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/checklists/executions/${EXECUTION_ID}/validate" "${EMPTY_JSON}" "${ADMIN_VALIDATE_RESPONSE_JSON}" "200"
jq -e '.passed != null and .completion_rate != null' "${ADMIN_VALIDATE_RESPONSE_JSON}" > /dev/null

echo "IDP runbook route verification passed."
