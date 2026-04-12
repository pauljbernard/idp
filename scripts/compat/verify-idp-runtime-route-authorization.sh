#!/bin/bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
REALM_ID=""
CLIENT_ID=""
CLIENT_SECRET=""
ADMIN_EMAIL="${ADMIN_EMAIL:-alex.morgan@northstar.example}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-StandaloneIAM!TenantAdmin2026}"
ADMIN_COMMERCIAL_TENANT_ID="${ADMIN_COMMERCIAL_TENANT_ID:-northstar-holdings}"
ADMIN_OPERATIONS_TENANT_ID="${ADMIN_OPERATIONS_TENANT_ID:-civic-services}"
MACHINE_CLIENT_ID="${MACHINE_CLIENT_ID:-machine-api-demo}"
MACHINE_CLIENT_SECRET="${MACHINE_CLIENT_SECRET:-StandaloneIAM!machine-api-demo!Secret2026}"
VIEWER_ROLE_ID="${VIEWER_ROLE_ID:-role-default-service-viewer}"
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
    -H @${TMP_DIR}/admin-auth-header.txt \
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
  local tenant_id="$2"
  local path="$3"
  local output_json="$4"
  local status
  status="$(curl -sS -o "${output_json}" -w '%{http_code}' \
    -H @"${auth_header_file}" \
    -H "X-Tenant-ID: ${tenant_id}" \
    "${API_BASE_URL}${path}")"
  assert_status "${status}" "200" "GET ${path}"
}

authorized_post_json() {
  local auth_header_file="$1"
  local tenant_id="$2"
  local path="$3"
  local request_json="$4"
  local output_json="$5"
  local expected_status="${6:-200}"
  local status
  status="$(curl -sS -o "${output_json}" -w '%{http_code}' \
    -X POST "${API_BASE_URL}${path}" \
    -H @"${auth_header_file}" \
    -H "X-Tenant-ID: ${tenant_id}" \
    -H 'Content-Type: application/json' \
    --data @"${request_json}")"
  assert_status "${status}" "${expected_status}" "POST ${path}"
}

forbidden_get() {
  local auth_header_file="$1"
  local tenant_id="$2"
  local path="$3"
  local output_json="$4"
  local status
  status="$(curl -sS -o "${output_json}" -w '%{http_code}' \
    -H @"${auth_header_file}" \
    -H "X-Tenant-ID: ${tenant_id}" \
    "${API_BASE_URL}${path}")"
  assert_status "${status}" "403" "GET ${path}"
}

forbidden_post_json() {
  local auth_header_file="$1"
  local tenant_id="$2"
  local path="$3"
  local request_json="$4"
  local output_json="$5"
  local status
  status="$(curl -sS -o "${output_json}" -w '%{http_code}' \
    -X POST "${API_BASE_URL}${path}" \
    -H @"${auth_header_file}" \
    -H "X-Tenant-ID: ${tenant_id}" \
    -H 'Content-Type: application/json' \
    --data @"${request_json}")"
  assert_status "${status}" "403" "POST ${path}"
}

resolve_auth_config
issue_password_grant_token "admin" "${ADMIN_EMAIL}" "${ADMIN_PASSWORD}"

curl -sS -o "${TMP_DIR}/service-accounts.json" \
  -H @"${TMP_DIR}/admin-auth-header.txt" \
  -H "X-Tenant-ID: ${ADMIN_COMMERCIAL_TENANT_ID}" \
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

printf '%s' '{"aircraft_id":"ac-cityops-001","status":"ON_STATION","position":{"lat":39.9526,"lon":-75.1652},"source":"iam-runtime-verifier","battery_percent":81,"groundspeed_kts":22,"heading_degrees":105}' > "${TMP_DIR}/telemetry-request.json"

authorized_get "${TMP_DIR}/admin-auth-header.txt" "${ADMIN_OPERATIONS_TENANT_ID}" '/api/v1/command-center/summary' "${TMP_DIR}/admin-command-center-summary.json"
authorized_post_json "${TMP_DIR}/admin-auth-header.txt" "${ADMIN_OPERATIONS_TENANT_ID}" '/api/v1/live-operations/telemetry' "${TMP_DIR}/telemetry-request.json" "${TMP_DIR}/admin-live-telemetry.json" "201"
authorized_get "${TMP_DIR}/admin-auth-header.txt" "${ADMIN_OPERATIONS_TENANT_ID}" '/api/v1/live-operations/timeline' "${TMP_DIR}/admin-live-timeline.json"
authorized_get "${TMP_DIR}/admin-auth-header.txt" "${ADMIN_OPERATIONS_TENANT_ID}" '/api/v1/live-operations/replay' "${TMP_DIR}/admin-live-replay.json"

authorized_get "${TMP_DIR}/viewer-machine-auth-header.txt" "${ADMIN_OPERATIONS_TENANT_ID}" '/api/v1/command-center/summary' "${TMP_DIR}/viewer-command-center-summary.json"
authorized_get "${TMP_DIR}/viewer-machine-auth-header.txt" "${ADMIN_OPERATIONS_TENANT_ID}" '/api/v1/live-operations/timeline' "${TMP_DIR}/viewer-live-timeline.json"
authorized_get "${TMP_DIR}/viewer-machine-auth-header.txt" "${ADMIN_OPERATIONS_TENANT_ID}" '/api/v1/live-operations/replay' "${TMP_DIR}/viewer-live-replay.json"
forbidden_post_json "${TMP_DIR}/viewer-machine-auth-header.txt" "${ADMIN_OPERATIONS_TENANT_ID}" '/api/v1/live-operations/telemetry' "${TMP_DIR}/telemetry-request.json" "${TMP_DIR}/viewer-live-telemetry-denied.json"

authorized_get "${TMP_DIR}/viewer-machine-auth-header.txt" "${ADMIN_COMMERCIAL_TENANT_ID}" '/api/v1/analytics/flight-metrics' "${TMP_DIR}/viewer-analytics-flight-metrics.json"
authorized_get "${TMP_DIR}/viewer-machine-auth-header.txt" "${ADMIN_COMMERCIAL_TENANT_ID}" '/api/v1/analytics/weather' "${TMP_DIR}/viewer-analytics-weather.json"
authorized_get "${TMP_DIR}/viewer-machine-auth-header.txt" "${ADMIN_COMMERCIAL_TENANT_ID}" '/api/v1/analytics/compliance' "${TMP_DIR}/viewer-analytics-compliance.json"
authorized_get "${TMP_DIR}/viewer-machine-auth-header.txt" "${ADMIN_COMMERCIAL_TENANT_ID}" '/api/v1/analytics/operational' "${TMP_DIR}/viewer-analytics-operational.json"
authorized_get "${TMP_DIR}/viewer-machine-auth-header.txt" "${ADMIN_COMMERCIAL_TENANT_ID}" '/api/v1/analytics/tenant-benchmarks' "${TMP_DIR}/viewer-analytics-benchmarks.json"
forbidden_get "${TMP_DIR}/viewer-machine-auth-header.txt" "${ADMIN_COMMERCIAL_TENANT_ID}" '/api/v1/partners' "${TMP_DIR}/viewer-partners-denied.json"

authorized_get "${TMP_DIR}/admin-auth-header.txt" "${ADMIN_COMMERCIAL_TENANT_ID}" '/api/v1/partners' "${TMP_DIR}/admin-partners.json"
authorized_get "${TMP_DIR}/admin-auth-header.txt" "${ADMIN_COMMERCIAL_TENANT_ID}" '/api/v1/partners/summary' "${TMP_DIR}/admin-partners-summary.json"
authorized_get "${TMP_DIR}/admin-auth-header.txt" "${ADMIN_COMMERCIAL_TENANT_ID}" '/api/v1/partners/events' "${TMP_DIR}/admin-partners-events.json"

jq -e 'type == "object" and (.alerts | type == "array") and (.watch_zones | type == "array")' "${TMP_DIR}/admin-command-center-summary.json" > /dev/null
jq -e '.id != null and .aircraft_id == "ac-cityops-001"' "${TMP_DIR}/admin-live-telemetry.json" > /dev/null
jq -e '(.events | type == "array") or (.timeline | type == "array")' "${TMP_DIR}/admin-live-timeline.json" > /dev/null
jq -e '(.frames | type == "array") or (.buckets | type == "array")' "${TMP_DIR}/admin-live-replay.json" > /dev/null

jq -e 'type == "object" and (.alerts | type == "array") and (.watch_zones | type == "array")' "${TMP_DIR}/viewer-command-center-summary.json" > /dev/null
jq -e '(.events | type == "array") or (.timeline | type == "array")' "${TMP_DIR}/viewer-live-timeline.json" > /dev/null
jq -e '(.frames | type == "array") or (.buckets | type == "array")' "${TMP_DIR}/viewer-live-replay.json" > /dev/null
jq -e '.error != null' "${TMP_DIR}/viewer-live-telemetry-denied.json" > /dev/null

jq -e 'type == "object"' "${TMP_DIR}/viewer-analytics-flight-metrics.json" > /dev/null
jq -e 'type == "object"' "${TMP_DIR}/viewer-analytics-weather.json" > /dev/null
jq -e 'type == "object"' "${TMP_DIR}/viewer-analytics-compliance.json" > /dev/null
jq -e 'type == "object"' "${TMP_DIR}/viewer-analytics-operational.json" > /dev/null
jq -e '(.benchmarks | type == "array") and (.count >= 0)' "${TMP_DIR}/viewer-analytics-benchmarks.json" > /dev/null
jq -e '.error != null' "${TMP_DIR}/viewer-partners-denied.json" > /dev/null

jq -e '(.partners | type == "array") and (.count >= 1)' "${TMP_DIR}/admin-partners.json" > /dev/null
jq -e 'type == "object" and (.totals != null or .count != null)' "${TMP_DIR}/admin-partners-summary.json" > /dev/null
jq -e '(.events | type == "array") and (.count >= 0)' "${TMP_DIR}/admin-partners-events.json" > /dev/null

jq -n \
  --slurpfile adminCommandCenter "${TMP_DIR}/admin-command-center-summary.json" \
  --slurpfile viewerTimeline "${TMP_DIR}/viewer-live-timeline.json" \
  --slurpfile viewerTelemetryDenied "${TMP_DIR}/viewer-live-telemetry-denied.json" \
  --slurpfile adminPartners "${TMP_DIR}/admin-partners.json" \
  --slurpfile viewerBenchmarks "${TMP_DIR}/viewer-analytics-benchmarks.json" \
  --slurpfile viewerPartnersDenied "${TMP_DIR}/viewer-partners-denied.json" \
  '{
    command_center_and_live_ops: {
      admin_alert_count: ($adminCommandCenter[0].alerts | length),
      viewer_timeline_items: (($viewerTimeline[0].events // $viewerTimeline[0].timeline) | length),
      viewer_telemetry_error: $viewerTelemetryDenied[0].error
    },
    partners_and_analytics: {
      admin_partner_count: $adminPartners[0].count,
      viewer_benchmark_count: $viewerBenchmarks[0].count,
      viewer_partners_error: $viewerPartnersDenied[0].error
    }
  }'
