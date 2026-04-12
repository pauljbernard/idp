#!/bin/bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
REALM_ID=""
CLIENT_ID=""
CLIENT_SECRET=""
CONTROL_TENANT_ID="${CONTROL_TENANT_ID:-northstar-holdings}"
PUBLIC_PROGRAM_TENANT_ID="${PUBLIC_PROGRAM_TENANT_ID:-civic-services}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@idp.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-StandaloneIAM!SuperAdmin2026}"
MACHINE_CLIENT_ID="${MACHINE_CLIENT_ID:-machine-api-demo}"
MACHINE_CLIENT_SECRET="${MACHINE_CLIENT_SECRET:-StandaloneIAM!machine-api-demo!Secret2026}"
VIEWER_ROLE_ID="${VIEWER_ROLE_ID:-role-default-service-viewer}"

TMP_DIR="$(mktemp -d)"
cleanup() {
  if [[ "${KEEP_TMP_DIR:-0}" == "1" ]]; then
    echo "Keeping tmp dir: ${TMP_DIR}" >&2
    return
  fi
  rm -rf "${TMP_DIR}"
}

SERVICE_ACCOUNT_ID=''
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
ADMIN_TOKEN="$(issue_password_grant_token "public-program-admin" "${ADMIN_EMAIL}" "${ADMIN_PASSWORD}")"

SERVICE_ACCOUNTS_JSON="${TMP_DIR}/service-accounts.json"
authorized_get "${ADMIN_TOKEN}" "${CONTROL_TENANT_ID}" "/api/v1/iam/service-accounts?realm_id=${REALM_ID}" "${SERVICE_ACCOUNTS_JSON}"
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
authorized_put_json "${ADMIN_TOKEN}" "${CONTROL_TENANT_ID}" "/api/v1/iam/service-accounts/${SERVICE_ACCOUNT_ID}" "${VIEWER_ASSIGNMENT_REQUEST_JSON}" "${VIEWER_ASSIGNMENT_RESPONSE_JSON}"

VIEWER_MACHINE_TOKEN="$(issue_client_credentials_token "public-program-viewer-machine" "${MACHINE_CLIENT_ID}" "${MACHINE_CLIENT_SECRET}")"

ADMIN_SUMMARY_JSON="${TMP_DIR}/admin-summary.json"
ADMIN_WORK_ORDERS_JSON="${TMP_DIR}/admin-work-orders.json"
ADMIN_LAYERS_JSON="${TMP_DIR}/admin-layers.json"
ADMIN_ADVISORIES_JSON="${TMP_DIR}/admin-advisories.json"

authorized_get "${ADMIN_TOKEN}" "${PUBLIC_PROGRAM_TENANT_ID}" '/api/v1/municipal-operations/summary' "${ADMIN_SUMMARY_JSON}"
authorized_get "${ADMIN_TOKEN}" "${PUBLIC_PROGRAM_TENANT_ID}" '/api/v1/municipal-operations/work-orders' "${ADMIN_WORK_ORDERS_JSON}"
authorized_get "${ADMIN_TOKEN}" "${PUBLIC_PROGRAM_TENANT_ID}" '/api/v1/municipal-operations/layers' "${ADMIN_LAYERS_JSON}"
authorized_get "${ADMIN_TOKEN}" "${PUBLIC_PROGRAM_TENANT_ID}" '/api/v1/municipal-operations/advisories' "${ADMIN_ADVISORIES_JSON}"

WORK_ORDER_ID="$(jq -r '.work_orders[0].id // empty' "${ADMIN_WORK_ORDERS_JSON}")"
if [[ -z "${WORK_ORDER_ID}" ]]; then
  echo "No public program work order available for verification" >&2
  exit 1
fi

ADMIN_ROUTE_REQUEST_JSON="${TMP_DIR}/admin-route-request.json"
jq -n '{target: "planning"}' > "${ADMIN_ROUTE_REQUEST_JSON}"
ADMIN_ROUTE_RESPONSE_JSON="${TMP_DIR}/admin-route-response.json"
authorized_post_json "${ADMIN_TOKEN}" "${PUBLIC_PROGRAM_TENANT_ID}" "/api/v1/municipal-operations/work-orders/${WORK_ORDER_ID}/route" "${ADMIN_ROUTE_REQUEST_JSON}" "${ADMIN_ROUTE_RESPONSE_JSON}"

ADMIN_ADVISORY_CREATE_REQUEST_JSON="${TMP_DIR}/admin-advisory-create-request.json"
jq -n '{title: "IAM Municipal Advisory"}' > "${ADMIN_ADVISORY_CREATE_REQUEST_JSON}"
ADMIN_ADVISORY_CREATE_RESPONSE_JSON="${TMP_DIR}/admin-advisory-create-response.json"
authorized_post_json "${ADMIN_TOKEN}" "${PUBLIC_PROGRAM_TENANT_ID}" "/api/v1/municipal-operations/work-orders/${WORK_ORDER_ID}/advisories" "${ADMIN_ADVISORY_CREATE_REQUEST_JSON}" "${ADMIN_ADVISORY_CREATE_RESPONSE_JSON}" "201"
ADVISORY_ID="$(jq -r '.id' "${ADMIN_ADVISORY_CREATE_RESPONSE_JSON}")"

EMPTY_JSON="${TMP_DIR}/empty.json"
jq -n '{}' > "${EMPTY_JSON}"
ADMIN_ADVISORY_PUBLISH_RESPONSE_JSON="${TMP_DIR}/admin-advisory-publish-response.json"
authorized_post_json "${ADMIN_TOKEN}" "${PUBLIC_PROGRAM_TENANT_ID}" "/api/v1/municipal-operations/advisories/${ADVISORY_ID}/publish" "${EMPTY_JSON}" "${ADMIN_ADVISORY_PUBLISH_RESPONSE_JSON}"

VIEWER_SUMMARY_JSON="${TMP_DIR}/viewer-summary.json"
VIEWER_WORK_ORDERS_JSON="${TMP_DIR}/viewer-work-orders.json"
VIEWER_LAYERS_JSON="${TMP_DIR}/viewer-layers.json"
VIEWER_ADVISORIES_JSON="${TMP_DIR}/viewer-advisories.json"

authorized_get "${VIEWER_MACHINE_TOKEN}" "${PUBLIC_PROGRAM_TENANT_ID}" '/api/v1/municipal-operations/summary' "${VIEWER_SUMMARY_JSON}"
authorized_get "${VIEWER_MACHINE_TOKEN}" "${PUBLIC_PROGRAM_TENANT_ID}" '/api/v1/municipal-operations/work-orders' "${VIEWER_WORK_ORDERS_JSON}"
authorized_get "${VIEWER_MACHINE_TOKEN}" "${PUBLIC_PROGRAM_TENANT_ID}" '/api/v1/municipal-operations/layers' "${VIEWER_LAYERS_JSON}"
authorized_get "${VIEWER_MACHINE_TOKEN}" "${PUBLIC_PROGRAM_TENANT_ID}" '/api/v1/municipal-operations/advisories' "${VIEWER_ADVISORIES_JSON}"

VIEWER_ROUTE_DENIED_JSON="${TMP_DIR}/viewer-route-denied.json"
VIEWER_ADVISORY_CREATE_DENIED_JSON="${TMP_DIR}/viewer-advisory-create-denied.json"
VIEWER_ADVISORY_PUBLISH_DENIED_JSON="${TMP_DIR}/viewer-advisory-publish-denied.json"

forbidden_post_json "${VIEWER_MACHINE_TOKEN}" "${PUBLIC_PROGRAM_TENANT_ID}" "/api/v1/municipal-operations/work-orders/${WORK_ORDER_ID}/route" "${ADMIN_ROUTE_REQUEST_JSON}" "${VIEWER_ROUTE_DENIED_JSON}"
forbidden_post_json "${VIEWER_MACHINE_TOKEN}" "${PUBLIC_PROGRAM_TENANT_ID}" "/api/v1/municipal-operations/work-orders/${WORK_ORDER_ID}/advisories" "${ADMIN_ADVISORY_CREATE_REQUEST_JSON}" "${VIEWER_ADVISORY_CREATE_DENIED_JSON}"
forbidden_post_json "${VIEWER_MACHINE_TOKEN}" "${PUBLIC_PROGRAM_TENANT_ID}" "/api/v1/municipal-operations/advisories/${ADVISORY_ID}/publish" "${EMPTY_JSON}" "${VIEWER_ADVISORY_PUBLISH_DENIED_JSON}"

jq -e 'type == "object" and (keys | length) >= 1' "${ADMIN_SUMMARY_JSON}" > /dev/null
jq -e '.count >= 1 and (.work_orders | length >= 1)' "${ADMIN_WORK_ORDERS_JSON}" > /dev/null
jq -e '.count >= 1 and (.layers | length >= 1)' "${ADMIN_LAYERS_JSON}" > /dev/null
jq -e '.count >= 0 and (.advisories | type == "array")' "${ADMIN_ADVISORIES_JSON}" > /dev/null
jq -e --arg work_order_id "${WORK_ORDER_ID}" '.id == $work_order_id and .status != null' "${ADMIN_ROUTE_RESPONSE_JSON}" > /dev/null
jq -e --arg work_order_id "${WORK_ORDER_ID}" '.id != null and .linked_work_order_id == $work_order_id' "${ADMIN_ADVISORY_CREATE_RESPONSE_JSON}" > /dev/null
jq -e --arg advisory_id "${ADVISORY_ID}" '.id == $advisory_id and ((.status | tostring | ascii_upcase) == "PUBLISHED" or .published_at != null)' "${ADMIN_ADVISORY_PUBLISH_RESPONSE_JSON}" > /dev/null

jq -e 'type == "object" and (keys | length) >= 1' "${VIEWER_SUMMARY_JSON}" > /dev/null
jq -e '.count >= 1 and (.work_orders | length >= 1)' "${VIEWER_WORK_ORDERS_JSON}" > /dev/null
jq -e '.count >= 1 and (.layers | length >= 1)' "${VIEWER_LAYERS_JSON}" > /dev/null
jq -e '.count >= 0 and (.advisories | type == "array")' "${VIEWER_ADVISORIES_JSON}" > /dev/null

jq -n \
  --slurpfile adminWorkOrders "${ADMIN_WORK_ORDERS_JSON}" \
  --slurpfile adminPublish "${ADMIN_ADVISORY_PUBLISH_RESPONSE_JSON}" \
  --slurpfile viewerWorkOrders "${VIEWER_WORK_ORDERS_JSON}" \
  --slurpfile viewerRouteDenied "${VIEWER_ROUTE_DENIED_JSON}" \
  --slurpfile viewerPublishDenied "${VIEWER_ADVISORY_PUBLISH_DENIED_JSON}" \
  '{
    admin_token_access: {
      work_order_count: $adminWorkOrders[0].count,
      published_advisory_status: ($adminPublish[0].status // "UNKNOWN")
    },
    viewer_machine_access: {
      work_order_count: $viewerWorkOrders[0].count,
      route_error: $viewerRouteDenied[0].error,
      publish_error: $viewerPublishDenied[0].error
    }
  }'
