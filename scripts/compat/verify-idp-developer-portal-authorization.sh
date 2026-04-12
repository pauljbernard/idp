#!/bin/bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
REALM_ID=""
CLIENT_ID=""
CLIENT_SECRET=""
ADMIN_TENANT_ID="${ADMIN_TENANT_ID:-northstar-holdings}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@idp.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-StandaloneIAM!SuperAdmin2026}"
MACHINE_CLIENT_ID="${MACHINE_CLIENT_ID:-machine-api-demo}"
MACHINE_CLIENT_SECRET="${MACHINE_CLIENT_SECRET:-StandaloneIAM!machine-api-demo!Secret2026}"
OPERATOR_ROLE_ID="${OPERATOR_ROLE_ID:-role-default-service-operator}"
RUN_ID="${RUN_ID:-$(date +%s)}"

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

forbidden_put_json() {
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
  assert_status "${status}" "403" "PUT ${path}"
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
ADMIN_TOKEN="$(issue_password_grant_token "developer-portal-admin" "${ADMIN_EMAIL}" "${ADMIN_PASSWORD}")"

SERVICE_ACCOUNTS_JSON="${TMP_DIR}/service-accounts.json"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/iam/service-accounts?realm_id=${REALM_ID}" "${SERVICE_ACCOUNTS_JSON}"
SERVICE_ACCOUNT_ID="$(jq -r --arg client_id "${MACHINE_CLIENT_ID}" '.service_accounts[] | select(.client_id == $client_id) | .id' "${SERVICE_ACCOUNTS_JSON}" | head -n 1)"
if [[ -z "${SERVICE_ACCOUNT_ID}" ]]; then
  echo "Unable to resolve machine service account for ${MACHINE_CLIENT_ID}" >&2
  exit 1
fi
ORIGINAL_SERVICE_ACCOUNT_ROLE_IDS_JSON="$(jq -c --arg client_id "${MACHINE_CLIENT_ID}" '.service_accounts[] | select(.client_id == $client_id) | .role_ids' "${SERVICE_ACCOUNTS_JSON}" | head -n 1)"
ORIGINAL_SERVICE_ACCOUNT_STATUS="$(jq -r --arg client_id "${MACHINE_CLIENT_ID}" '.service_accounts[] | select(.client_id == $client_id) | .status' "${SERVICE_ACCOUNTS_JSON}" | head -n 1)"

OPERATOR_ASSIGNMENT_REQUEST_JSON="${TMP_DIR}/service-account-operator-request.json"
jq -n \
  --arg operator_role_id "${OPERATOR_ROLE_ID}" \
  '{
    role_ids: [$operator_role_id],
    status: "ACTIVE"
  }' > "${OPERATOR_ASSIGNMENT_REQUEST_JSON}"

OPERATOR_ASSIGNMENT_RESPONSE_JSON="${TMP_DIR}/service-account-operator-response.json"
authorized_put_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/iam/service-accounts/${SERVICE_ACCOUNT_ID}" "${OPERATOR_ASSIGNMENT_REQUEST_JSON}" "${OPERATOR_ASSIGNMENT_RESPONSE_JSON}"

OPERATOR_MACHINE_TOKEN="$(issue_client_credentials_token "developer-portal-operator-machine" "${MACHINE_CLIENT_ID}" "${MACHINE_CLIENT_SECRET}")"

ADMIN_SUMMARY_JSON="${TMP_DIR}/admin-summary.json"
ADMIN_APPS_JSON="${TMP_DIR}/admin-apps.json"
ADMIN_SUBSCRIPTIONS_JSON="${TMP_DIR}/admin-subscriptions.json"
ADMIN_DELIVERIES_JSON="${TMP_DIR}/admin-deliveries.json"
ADMIN_CONTRACTS_JSON="${TMP_DIR}/admin-contracts.json"

authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/developer-portal/summary' "${ADMIN_SUMMARY_JSON}"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/developer-portal/apps' "${ADMIN_APPS_JSON}"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/developer-portal/subscriptions' "${ADMIN_SUBSCRIPTIONS_JSON}"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/developer-portal/deliveries' "${ADMIN_DELIVERIES_JSON}"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/developer-portal/contracts' "${ADMIN_CONTRACTS_JSON}"

ADMIN_APP_CREATE_REQUEST_JSON="${TMP_DIR}/admin-app-create-request.json"
jq -n \
  --arg name "IAM Developer App ${RUN_ID}" \
  '{
    name: $name,
    environment: "SANDBOX",
    webhook_base_url: "https://example.com/webhooks",
    redirect_uris: ["https://example.com/callback"],
    token_access_enabled: true,
    delegated_user_access_enabled: true,
    allow_localhost: true,
    approval_notes: "Created by IAM developer portal verifier."
  }' > "${ADMIN_APP_CREATE_REQUEST_JSON}"

ADMIN_APP_CREATE_RESPONSE_JSON="${TMP_DIR}/admin-app-create-response.json"
authorized_post_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/developer-portal/apps' "${ADMIN_APP_CREATE_REQUEST_JSON}" "${ADMIN_APP_CREATE_RESPONSE_JSON}" "201"
APP_ID="$(jq -r '.id' "${ADMIN_APP_CREATE_RESPONSE_JSON}")"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/developer-portal/apps' "${ADMIN_APPS_JSON}"

ADMIN_APP_CONTROLS_REQUEST_JSON="${TMP_DIR}/admin-app-controls-request.json"
jq -n \
  --arg webhook_base_url "https://example.com/webhooks/updated" \
  --arg approval_notes "Updated by IAM developer portal verifier." \
  '{
    webhook_base_url: $webhook_base_url,
    allow_localhost: true,
    approval_notes: $approval_notes,
    redirect_uris: ["https://example.com/callback"],
    token_access_enabled: true,
    delegated_user_access_enabled: true
  }' > "${ADMIN_APP_CONTROLS_REQUEST_JSON}"

ADMIN_APP_CONTROLS_RESPONSE_JSON="${TMP_DIR}/admin-app-controls-response.json"
authorized_put_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/developer-portal/apps/${APP_ID}/controls" "${ADMIN_APP_CONTROLS_REQUEST_JSON}" "${ADMIN_APP_CONTROLS_RESPONSE_JSON}"

ADMIN_APP_ROTATE_RESPONSE_JSON="${TMP_DIR}/admin-app-rotate-response.json"
EMPTY_JSON="${TMP_DIR}/empty.json"
jq -n '{}' > "${EMPTY_JSON}"
authorized_post_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/developer-portal/apps/${APP_ID}/rotate-key" "${EMPTY_JSON}" "${ADMIN_APP_ROTATE_RESPONSE_JSON}"

ADMIN_SUBSCRIPTION_CREATE_REQUEST_JSON="${TMP_DIR}/admin-subscription-create-request.json"
jq -n \
  --arg app_id "${APP_ID}" \
  '{
    app_id: $app_id,
    name: "IAM Delivery Feed",
    event_type: "DECISION_EVALUATED",
    endpoint_url: "https://example.com/webhooks/decision-evaluated"
  }' > "${ADMIN_SUBSCRIPTION_CREATE_REQUEST_JSON}"

ADMIN_SUBSCRIPTION_CREATE_RESPONSE_JSON="${TMP_DIR}/admin-subscription-create-response.json"
authorized_post_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/developer-portal/subscriptions' "${ADMIN_SUBSCRIPTION_CREATE_REQUEST_JSON}" "${ADMIN_SUBSCRIPTION_CREATE_RESPONSE_JSON}" "201"
SUBSCRIPTION_ID="$(jq -r '.id' "${ADMIN_SUBSCRIPTION_CREATE_RESPONSE_JSON}")"

ADMIN_SUBSCRIPTION_TOGGLE_RESPONSE_JSON="${TMP_DIR}/admin-subscription-toggle-response.json"
authorized_post_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/developer-portal/subscriptions/${SUBSCRIPTION_ID}/toggle" "${EMPTY_JSON}" "${ADMIN_SUBSCRIPTION_TOGGLE_RESPONSE_JSON}"

ADMIN_PROMOTION_REQUEST_RESPONSE_JSON="${TMP_DIR}/admin-promotion-request-response.json"
authorized_post_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/developer-portal/apps/${APP_ID}/request-promotion" "${EMPTY_JSON}" "${ADMIN_PROMOTION_REQUEST_RESPONSE_JSON}"
PRODUCTION_APP_ID="$(jq -r '.id' "${ADMIN_PROMOTION_REQUEST_RESPONSE_JSON}")"

ADMIN_PROMOTION_APPROVE_REQUEST_JSON="${TMP_DIR}/admin-promotion-approve-request.json"
jq -n '{notes: "Approved by IAM developer portal verifier."}' > "${ADMIN_PROMOTION_APPROVE_REQUEST_JSON}"
ADMIN_PROMOTION_APPROVE_RESPONSE_JSON="${TMP_DIR}/admin-promotion-approve-response.json"
authorized_post_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/developer-portal/apps/${PRODUCTION_APP_ID}/approve-promotion" "${ADMIN_PROMOTION_APPROVE_REQUEST_JSON}" "${ADMIN_PROMOTION_APPROVE_RESPONSE_JSON}"

ADMIN_PROMOTION_REJECT_REQUEST_JSON="${TMP_DIR}/admin-promotion-reject-request.json"
jq -n '{notes: "Rejected by IAM developer portal verifier after approval proof."}' > "${ADMIN_PROMOTION_REJECT_REQUEST_JSON}"
ADMIN_PROMOTION_REJECT_RESPONSE_JSON="${TMP_DIR}/admin-promotion-reject-response.json"
authorized_post_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/developer-portal/apps/${PRODUCTION_APP_ID}/reject-promotion" "${ADMIN_PROMOTION_REJECT_REQUEST_JSON}" "${ADMIN_PROMOTION_REJECT_RESPONSE_JSON}"

OPERATOR_SUMMARY_JSON="${TMP_DIR}/operator-summary.json"
OPERATOR_APPS_JSON="${TMP_DIR}/operator-apps.json"
OPERATOR_SUBSCRIPTIONS_JSON="${TMP_DIR}/operator-subscriptions.json"
OPERATOR_DELIVERIES_JSON="${TMP_DIR}/operator-deliveries.json"
OPERATOR_CONTRACTS_JSON="${TMP_DIR}/operator-contracts.json"

authorized_get "${OPERATOR_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/developer-portal/summary' "${OPERATOR_SUMMARY_JSON}"
authorized_get "${OPERATOR_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/developer-portal/apps' "${OPERATOR_APPS_JSON}"
authorized_get "${OPERATOR_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/developer-portal/subscriptions' "${OPERATOR_SUBSCRIPTIONS_JSON}"
authorized_get "${OPERATOR_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/developer-portal/deliveries' "${OPERATOR_DELIVERIES_JSON}"
authorized_get "${OPERATOR_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/developer-portal/contracts' "${OPERATOR_CONTRACTS_JSON}"

OPERATOR_APP_CREATE_DENIED_JSON="${TMP_DIR}/operator-app-create-denied.json"
OPERATOR_APP_CONTROLS_DENIED_JSON="${TMP_DIR}/operator-app-controls-denied.json"
OPERATOR_APP_ROTATE_DENIED_JSON="${TMP_DIR}/operator-app-rotate-denied.json"
OPERATOR_SUBSCRIPTION_CREATE_DENIED_JSON="${TMP_DIR}/operator-subscription-create-denied.json"
OPERATOR_SUBSCRIPTION_TOGGLE_DENIED_JSON="${TMP_DIR}/operator-subscription-toggle-denied.json"
OPERATOR_PROMOTION_REQUEST_DENIED_JSON="${TMP_DIR}/operator-promotion-request-denied.json"
OPERATOR_PROMOTION_APPROVE_DENIED_JSON="${TMP_DIR}/operator-promotion-approve-denied.json"
OPERATOR_PROMOTION_REJECT_DENIED_JSON="${TMP_DIR}/operator-promotion-reject-denied.json"

forbidden_post_json "${OPERATOR_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/developer-portal/apps' "${ADMIN_APP_CREATE_REQUEST_JSON}" "${OPERATOR_APP_CREATE_DENIED_JSON}"
forbidden_put_json "${OPERATOR_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/developer-portal/apps/${APP_ID}/controls" "${ADMIN_APP_CONTROLS_REQUEST_JSON}" "${OPERATOR_APP_CONTROLS_DENIED_JSON}"
forbidden_post_json "${OPERATOR_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/developer-portal/apps/${APP_ID}/rotate-key" "${EMPTY_JSON}" "${OPERATOR_APP_ROTATE_DENIED_JSON}"
forbidden_post_json "${OPERATOR_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/developer-portal/subscriptions' "${ADMIN_SUBSCRIPTION_CREATE_REQUEST_JSON}" "${OPERATOR_SUBSCRIPTION_CREATE_DENIED_JSON}"
forbidden_post_json "${OPERATOR_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/developer-portal/subscriptions/${SUBSCRIPTION_ID}/toggle" "${EMPTY_JSON}" "${OPERATOR_SUBSCRIPTION_TOGGLE_DENIED_JSON}"
forbidden_post_json "${OPERATOR_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/developer-portal/apps/${APP_ID}/request-promotion" "${EMPTY_JSON}" "${OPERATOR_PROMOTION_REQUEST_DENIED_JSON}"
forbidden_post_json "${OPERATOR_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/developer-portal/apps/${PRODUCTION_APP_ID}/approve-promotion" "${ADMIN_PROMOTION_APPROVE_REQUEST_JSON}" "${OPERATOR_PROMOTION_APPROVE_DENIED_JSON}"
forbidden_post_json "${OPERATOR_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/developer-portal/apps/${PRODUCTION_APP_ID}/reject-promotion" "${ADMIN_PROMOTION_REJECT_REQUEST_JSON}" "${OPERATOR_PROMOTION_REJECT_DENIED_JSON}"

jq -e '.tenant_id != null and .sandbox_apps >= 0 and .docs_assets >= 1' "${ADMIN_SUMMARY_JSON}" > /dev/null
jq -e --arg app_id "${APP_ID}" '.apps[] | select(.id == $app_id)' "${ADMIN_APPS_JSON}" > /dev/null
jq -e '.count >= 0' "${ADMIN_SUBSCRIPTIONS_JSON}" > /dev/null
jq -e '.count >= 1 and (.assets | length >= 1)' "${ADMIN_CONTRACTS_JSON}" > /dev/null
jq -e '.id == $app_id and .key_reference_id != null' --arg app_id "${APP_ID}" "${ADMIN_APP_ROTATE_RESPONSE_JSON}" > /dev/null
jq -e '.id == $subscription_id and (.status == "PAUSED" or .status == "ACTIVE")' --arg subscription_id "${SUBSCRIPTION_ID}" "${ADMIN_SUBSCRIPTION_TOGGLE_RESPONSE_JSON}" > /dev/null
jq -e '.environment == "PRODUCTION" and .approval.approval_status == "PENDING"' "${ADMIN_PROMOTION_REQUEST_RESPONSE_JSON}" > /dev/null
jq -e '.approval.approval_status == "APPROVED"' "${ADMIN_PROMOTION_APPROVE_RESPONSE_JSON}" > /dev/null
jq -e '.approval.approval_status == "REJECTED"' "${ADMIN_PROMOTION_REJECT_RESPONSE_JSON}" > /dev/null

jq -e '.tenant_id != null and .sandbox_apps >= 0 and .docs_assets >= 1' "${OPERATOR_SUMMARY_JSON}" > /dev/null
jq -e '.count >= 1' "${OPERATOR_APPS_JSON}" > /dev/null
jq -e '.count >= 0' "${OPERATOR_SUBSCRIPTIONS_JSON}" > /dev/null
jq -e '.count >= 0' "${OPERATOR_DELIVERIES_JSON}" > /dev/null
jq -e '.count >= 1 and (.assets | length >= 1)' "${OPERATOR_CONTRACTS_JSON}" > /dev/null

jq -n \
  --slurpfile operatorAssignment "${OPERATOR_ASSIGNMENT_RESPONSE_JSON}" \
  --slurpfile adminApps "${ADMIN_APPS_JSON}" \
  --slurpfile adminRotate "${ADMIN_APP_ROTATE_RESPONSE_JSON}" \
  --slurpfile adminPromotionApprove "${ADMIN_PROMOTION_APPROVE_RESPONSE_JSON}" \
  --slurpfile operatorApps "${OPERATOR_APPS_JSON}" \
  --slurpfile operatorCreateDenied "${OPERATOR_APP_CREATE_DENIED_JSON}" \
  --slurpfile operatorControlsDenied "${OPERATOR_APP_CONTROLS_DENIED_JSON}" \
  --slurpfile operatorRotateDenied "${OPERATOR_APP_ROTATE_DENIED_JSON}" \
  --slurpfile operatorPromotionDenied "${OPERATOR_PROMOTION_REQUEST_DENIED_JSON}" \
  '{
    admin_token_access: {
      service_account_role_ids: $operatorAssignment[0].role_ids,
      app_count: $adminApps[0].count,
      rotated_key_reference_id: $adminRotate[0].key_reference_id,
      production_approval_status: $adminPromotionApprove[0].approval.approval_status
    },
    operator_machine_access: {
      app_count: $operatorApps[0].count,
      app_create_error: $operatorCreateDenied[0].error,
      app_controls_error: $operatorControlsDenied[0].error,
      app_rotate_error: $operatorRotateDenied[0].error,
      promotion_request_error: $operatorPromotionDenied[0].error
    }
  }'
