#!/bin/bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
REALM_ID=""
CLIENT_ID=""
CLIENT_SECRET=""
ADMIN_CONNECTOR_TENANT_ID="${ADMIN_CONNECTOR_TENANT_ID:-civic-services}"
ADMIN_PARTNER_TENANT_ID="${ADMIN_PARTNER_TENANT_ID:-northstar-holdings}"
ADMIN_EMAIL="${ADMIN_EMAIL:-alex.morgan@northstar.example}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-StandaloneIAM!TenantAdmin2026}"
OPERATOR_TENANT_ID="${OPERATOR_TENANT_ID:-civic-services}"
OPERATOR_EMAIL="${OPERATOR_EMAIL:-jordan.lee@civic.example}"
OPERATOR_PASSWORD="${OPERATOR_PASSWORD:-StandaloneIAM!ServiceOperator2026}"

TMP_DIR="$(mktemp -d)"
cleanup() {
  if [[ "${KEEP_TMP_DIR:-0}" == "1" ]]; then
    echo "Keeping tmp dir: ${TMP_DIR}" >&2
    return
  fi
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

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

assert_status() {
  local actual="$1"
  local expected="$2"
  local label="$3"
  if [[ "${actual}" != "${expected}" ]]; then
    echo "${label} expected HTTP ${expected}, got ${actual}" >&2
    exit 1
  fi
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

authorized_patch_json() {
  local token="$1"
  local tenant_id="$2"
  local path="$3"
  local request_json="$4"
  local output_json="$5"
  local status
  status="$(curl -sS -o "${output_json}" -w '%{http_code}' \
    -X PATCH "${API_BASE_URL}${path}" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${token}" \
    -H "X-Tenant-ID: ${tenant_id}" \
    --data @"${request_json}")"
  assert_status "${status}" "200" "PATCH ${path}"
}

forbidden_patch_json() {
  local token="$1"
  local tenant_id="$2"
  local path="$3"
  local request_json="$4"
  local output_json="$5"
  local status
  status="$(curl -sS -o "${output_json}" -w '%{http_code}' \
    -X PATCH "${API_BASE_URL}${path}" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${token}" \
    -H "X-Tenant-ID: ${tenant_id}" \
    --data @"${request_json}")"
  assert_status "${status}" "403" "PATCH ${path}"
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

resolve_auth_config

ADMIN_TOKEN="$(issue_password_grant_token "connector-governance-admin" "${ADMIN_EMAIL}" "${ADMIN_PASSWORD}")"
OPERATOR_TOKEN="$(issue_password_grant_token "connector-governance-operator" "${OPERATOR_EMAIL}" "${OPERATOR_PASSWORD}")"

ADMIN_CONNECTOR_SUMMARY_JSON="${TMP_DIR}/admin-connector-summary.json"
ADMIN_CONNECTOR_LIST_JSON="${TMP_DIR}/admin-connector-list.json"
ADMIN_CONNECTOR_RUNS_JSON="${TMP_DIR}/admin-connector-runs.json"
ADMIN_INGESTIONS_JSON="${TMP_DIR}/admin-ingestions.json"
ADMIN_INGESTIONS_GOVERNANCE_JSON="${TMP_DIR}/admin-ingestions-governance.json"
ADMIN_INTEGRATION_ADAPTER_CATALOG_JSON="${TMP_DIR}/admin-integration-adapter-catalog.json"
ADMIN_INTEGRATION_ADAPTER_CONFIG_JSON="${TMP_DIR}/admin-integration-adapter-config.json"

authorized_get "${ADMIN_TOKEN}" "${ADMIN_CONNECTOR_TENANT_ID}" '/api/v1/connectors/summary' "${ADMIN_CONNECTOR_SUMMARY_JSON}"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_CONNECTOR_TENANT_ID}" '/api/v1/connectors' "${ADMIN_CONNECTOR_LIST_JSON}"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_CONNECTOR_TENANT_ID}" '/api/v1/connectors/runs' "${ADMIN_CONNECTOR_RUNS_JSON}"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_CONNECTOR_TENANT_ID}" '/api/v1/ingestions' "${ADMIN_INGESTIONS_JSON}"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_CONNECTOR_TENANT_ID}" '/api/v1/ingestions/governance' "${ADMIN_INGESTIONS_GOVERNANCE_JSON}"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_CONNECTOR_TENANT_ID}" '/api/v1/faa-integration/catalog' "${ADMIN_INTEGRATION_ADAPTER_CATALOG_JSON}"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_CONNECTOR_TENANT_ID}" '/api/v1/faa-integration/config' "${ADMIN_INTEGRATION_ADAPTER_CONFIG_JSON}"

ADMIN_PARTNERS_JSON="${TMP_DIR}/admin-partners.json"
ADMIN_PARTNERS_SUMMARY_JSON="${TMP_DIR}/admin-partners-summary.json"
ADMIN_PARTNERS_EVENTS_JSON="${TMP_DIR}/admin-partners-events.json"

authorized_get "${ADMIN_TOKEN}" "${ADMIN_PARTNER_TENANT_ID}" '/api/v1/partners' "${ADMIN_PARTNERS_JSON}"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_PARTNER_TENANT_ID}" '/api/v1/partners/summary' "${ADMIN_PARTNERS_SUMMARY_JSON}"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_PARTNER_TENANT_ID}" '/api/v1/partners/events' "${ADMIN_PARTNERS_EVENTS_JSON}"

CONNECTOR_ID="$(jq -r '.connectors[0].id' "${ADMIN_CONNECTOR_LIST_JSON}")"
CONNECTOR_STATUS="$(jq -r '.connectors[0].status' "${ADMIN_CONNECTOR_LIST_JSON}")"

if [[ -z "${CONNECTOR_ID}" || "${CONNECTOR_ID}" == "null" ]]; then
  echo "Unable to resolve connector id for admin connector governance verification" >&2
  exit 1
fi

ADMIN_CONNECTOR_STATUS_UPDATE_REQUEST_JSON="${TMP_DIR}/admin-connector-status-update-request.json"
jq -n --arg status "${CONNECTOR_STATUS}" '{status: $status}' > "${ADMIN_CONNECTOR_STATUS_UPDATE_REQUEST_JSON}"

ADMIN_CONNECTOR_STATUS_UPDATE_RESPONSE_JSON="${TMP_DIR}/admin-connector-status-update-response.json"
authorized_patch_json "${ADMIN_TOKEN}" "${ADMIN_CONNECTOR_TENANT_ID}" "/api/v1/connectors/${CONNECTOR_ID}/status" "${ADMIN_CONNECTOR_STATUS_UPDATE_REQUEST_JSON}" "${ADMIN_CONNECTOR_STATUS_UPDATE_RESPONSE_JSON}"

ADMIN_CONNECTOR_RUN_REQUEST_JSON="${TMP_DIR}/admin-connector-run-request.json"
jq -n '{}' > "${ADMIN_CONNECTOR_RUN_REQUEST_JSON}"

ADMIN_CONNECTOR_RUN_RESPONSE_JSON="${TMP_DIR}/admin-connector-run-response.json"
authorized_post_json "${ADMIN_TOKEN}" "${ADMIN_CONNECTOR_TENANT_ID}" "/api/v1/connectors/${CONNECTOR_ID}/run" "${ADMIN_CONNECTOR_RUN_REQUEST_JSON}" "${ADMIN_CONNECTOR_RUN_RESPONSE_JSON}" "201"

ADMIN_INTEGRATION_BINDING_UPDATE_REQUEST_JSON="${TMP_DIR}/admin-integration-binding-update-request.json"
jq -n '{}' > "${ADMIN_INTEGRATION_BINDING_UPDATE_REQUEST_JSON}"

ADMIN_INTEGRATION_BINDING_UPDATE_RESPONSE_JSON="${TMP_DIR}/admin-integration-binding-update-response.json"
authorized_put_json "${ADMIN_TOKEN}" "${ADMIN_CONNECTOR_TENANT_ID}" '/api/v1/faa-integration/laanc/simulated' "${ADMIN_INTEGRATION_BINDING_UPDATE_REQUEST_JSON}" "${ADMIN_INTEGRATION_BINDING_UPDATE_RESPONSE_JSON}"

ADMIN_INTEGRATION_BINDING_VERIFY_REQUEST_JSON="${TMP_DIR}/admin-integration-binding-verify-request.json"
jq -n '{runtime_mode: "simulated"}' > "${ADMIN_INTEGRATION_BINDING_VERIFY_REQUEST_JSON}"

ADMIN_INTEGRATION_BINDING_VERIFY_RESPONSE_JSON="${TMP_DIR}/admin-integration-binding-verify-response.json"
authorized_post_json "${ADMIN_TOKEN}" "${ADMIN_CONNECTOR_TENANT_ID}" '/api/v1/faa-integration/laanc/verify' "${ADMIN_INTEGRATION_BINDING_VERIFY_REQUEST_JSON}" "${ADMIN_INTEGRATION_BINDING_VERIFY_RESPONSE_JSON}"

OPERATOR_CONNECTOR_SUMMARY_JSON="${TMP_DIR}/operator-connector-summary.json"
OPERATOR_CONNECTOR_LIST_JSON="${TMP_DIR}/operator-connector-list.json"
OPERATOR_CONNECTOR_RUNS_JSON="${TMP_DIR}/operator-connector-runs.json"
OPERATOR_INGESTIONS_JSON="${TMP_DIR}/operator-ingestions.json"
OPERATOR_INGESTIONS_GOVERNANCE_JSON="${TMP_DIR}/operator-ingestions-governance.json"
OPERATOR_INTEGRATION_ADAPTER_CATALOG_JSON="${TMP_DIR}/operator-integration-adapter-catalog.json"
OPERATOR_INTEGRATION_ADAPTER_CONFIG_JSON="${TMP_DIR}/operator-integration-adapter-config.json"

authorized_get "${OPERATOR_TOKEN}" "${OPERATOR_TENANT_ID}" '/api/v1/connectors/summary' "${OPERATOR_CONNECTOR_SUMMARY_JSON}"
authorized_get "${OPERATOR_TOKEN}" "${OPERATOR_TENANT_ID}" '/api/v1/connectors' "${OPERATOR_CONNECTOR_LIST_JSON}"
authorized_get "${OPERATOR_TOKEN}" "${OPERATOR_TENANT_ID}" '/api/v1/connectors/runs' "${OPERATOR_CONNECTOR_RUNS_JSON}"
authorized_get "${OPERATOR_TOKEN}" "${OPERATOR_TENANT_ID}" '/api/v1/ingestions' "${OPERATOR_INGESTIONS_JSON}"
authorized_get "${OPERATOR_TOKEN}" "${OPERATOR_TENANT_ID}" '/api/v1/ingestions/governance' "${OPERATOR_INGESTIONS_GOVERNANCE_JSON}"
authorized_get "${OPERATOR_TOKEN}" "${OPERATOR_TENANT_ID}" '/api/v1/faa-integration/catalog' "${OPERATOR_INTEGRATION_ADAPTER_CATALOG_JSON}"
authorized_get "${OPERATOR_TOKEN}" "${OPERATOR_TENANT_ID}" '/api/v1/faa-integration/config' "${OPERATOR_INTEGRATION_ADAPTER_CONFIG_JSON}"

OPERATOR_PARTNERS_DENIED_JSON="${TMP_DIR}/operator-partners-denied.json"
OPERATOR_PARTNERS_SUMMARY_DENIED_JSON="${TMP_DIR}/operator-partners-summary-denied.json"
OPERATOR_PARTNERS_EVENTS_DENIED_JSON="${TMP_DIR}/operator-partners-events-denied.json"

forbidden_get "${OPERATOR_TOKEN}" "${OPERATOR_TENANT_ID}" '/api/v1/partners' "${OPERATOR_PARTNERS_DENIED_JSON}"
forbidden_get "${OPERATOR_TOKEN}" "${OPERATOR_TENANT_ID}" '/api/v1/partners/summary' "${OPERATOR_PARTNERS_SUMMARY_DENIED_JSON}"
forbidden_get "${OPERATOR_TOKEN}" "${OPERATOR_TENANT_ID}" '/api/v1/partners/events' "${OPERATOR_PARTNERS_EVENTS_DENIED_JSON}"

OPERATOR_CONNECTOR_STATUS_DENIED_JSON="${TMP_DIR}/operator-connector-status-denied.json"
OPERATOR_CONNECTOR_RUN_DENIED_JSON="${TMP_DIR}/operator-connector-run-denied.json"
OPERATOR_INTEGRATION_BINDING_DENIED_JSON="${TMP_DIR}/operator-integration-binding-denied.json"
OPERATOR_INTEGRATION_VERIFY_DENIED_JSON="${TMP_DIR}/operator-integration-verify-denied.json"

forbidden_patch_json "${OPERATOR_TOKEN}" "${OPERATOR_TENANT_ID}" "/api/v1/connectors/${CONNECTOR_ID}/status" "${ADMIN_CONNECTOR_STATUS_UPDATE_REQUEST_JSON}" "${OPERATOR_CONNECTOR_STATUS_DENIED_JSON}"
forbidden_post_json "${OPERATOR_TOKEN}" "${OPERATOR_TENANT_ID}" "/api/v1/connectors/${CONNECTOR_ID}/run" "${ADMIN_CONNECTOR_RUN_REQUEST_JSON}" "${OPERATOR_CONNECTOR_RUN_DENIED_JSON}"
forbidden_put_json "${OPERATOR_TOKEN}" "${OPERATOR_TENANT_ID}" '/api/v1/faa-integration/laanc/simulated' "${ADMIN_INTEGRATION_BINDING_UPDATE_REQUEST_JSON}" "${OPERATOR_INTEGRATION_BINDING_DENIED_JSON}"
forbidden_post_json "${OPERATOR_TOKEN}" "${OPERATOR_TENANT_ID}" '/api/v1/faa-integration/laanc/verify' "${ADMIN_INTEGRATION_BINDING_VERIFY_REQUEST_JSON}" "${OPERATOR_INTEGRATION_VERIFY_DENIED_JSON}"

jq -e '.stats.total_connectors >= 1' "${ADMIN_CONNECTOR_SUMMARY_JSON}" > /dev/null
jq -e '.count >= 1 and (.connectors | length >= 1)' "${ADMIN_CONNECTOR_LIST_JSON}" > /dev/null
jq -e '.count >= 1 and (.runs | length >= 1)' "${ADMIN_CONNECTOR_RUNS_JSON}" > /dev/null
jq -e '.count >= 1 and (.adapters | length >= 1)' "${ADMIN_INTEGRATION_ADAPTER_CATALOG_JSON}" > /dev/null
jq -e '.laanc != null and .b4ufly != null' "${ADMIN_INTEGRATION_ADAPTER_CONFIG_JSON}" > /dev/null
jq -e '.count >= 1 and (.partners | length >= 1)' "${ADMIN_PARTNERS_JSON}" > /dev/null
jq -e '.count >= 1 and (.events | length >= 1)' "${ADMIN_PARTNERS_EVENTS_JSON}" > /dev/null
jq -e '.id == $connector_id' --arg connector_id "${CONNECTOR_ID}" "${ADMIN_CONNECTOR_STATUS_UPDATE_RESPONSE_JSON}" > /dev/null
jq -e '.connector_id == $connector_id' --arg connector_id "${CONNECTOR_ID}" "${ADMIN_CONNECTOR_RUN_RESPONSE_JSON}" > /dev/null
jq -e '.adapter_id != null and .runtime_mode == "simulated"' "${ADMIN_INTEGRATION_BINDING_UPDATE_RESPONSE_JSON}" > /dev/null
jq -e '.ok == true and .service == "laanc"' "${ADMIN_INTEGRATION_BINDING_VERIFY_RESPONSE_JSON}" > /dev/null

jq -e '.stats.total_connectors >= 1' "${OPERATOR_CONNECTOR_SUMMARY_JSON}" > /dev/null
jq -e '.count >= 1 and (.connectors | length >= 1)' "${OPERATOR_CONNECTOR_LIST_JSON}" > /dev/null
jq -e '.count >= 1 and (.runs | length >= 1)' "${OPERATOR_CONNECTOR_RUNS_JSON}" > /dev/null
jq -e '.count >= 1' "${OPERATOR_INGESTIONS_JSON}" > /dev/null
jq -e '.summary.total_sources >= 1' "${OPERATOR_INGESTIONS_GOVERNANCE_JSON}" > /dev/null
jq -e '.count >= 1 and (.adapters | length >= 1)' "${OPERATOR_INTEGRATION_ADAPTER_CATALOG_JSON}" > /dev/null
jq -e '.laanc != null and .b4ufly != null' "${OPERATOR_INTEGRATION_ADAPTER_CONFIG_JSON}" > /dev/null

jq -n \
  --slurpfile adminConnectorSummary "${ADMIN_CONNECTOR_SUMMARY_JSON}" \
  --slurpfile adminConnectorRun "${ADMIN_CONNECTOR_RUN_RESPONSE_JSON}" \
  --slurpfile adminIntegrationVerify "${ADMIN_INTEGRATION_BINDING_VERIFY_RESPONSE_JSON}" \
  --slurpfile adminPartners "${ADMIN_PARTNERS_JSON}" \
  --slurpfile operatorConnectorSummary "${OPERATOR_CONNECTOR_SUMMARY_JSON}" \
  --slurpfile operatorIngestions "${OPERATOR_INGESTIONS_JSON}" \
  --slurpfile operatorPartnersDenied "${OPERATOR_PARTNERS_DENIED_JSON}" \
  --slurpfile operatorConnectorDenied "${OPERATOR_CONNECTOR_STATUS_DENIED_JSON}" \
  --slurpfile operatorIntegrationDenied "${OPERATOR_INTEGRATION_BINDING_DENIED_JSON}" \
  '{
    admin_token_access: {
      connector_count: $adminConnectorSummary[0].stats.total_connectors,
      connector_run_status: $adminConnectorRun[0].status,
      integration_adapter_verify_ok: $adminIntegrationVerify[0].ok,
      partner_count: $adminPartners[0].count
    },
    operator_token_access: {
      connector_count: $operatorConnectorSummary[0].stats.total_connectors,
      ingestion_count: $operatorIngestions[0].count,
      partners_error: $operatorPartnersDenied[0].error,
      connector_status_update_error: $operatorConnectorDenied[0].error,
      integration_binding_update_error: $operatorIntegrationDenied[0].error
    }
  }'
