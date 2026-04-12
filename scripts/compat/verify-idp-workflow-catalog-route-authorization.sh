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
EXISTING_TEMPLATE_ID=''
CREATED_MISSION_ID=''

assert_status() {
  local actual="$1"
  local expected="$2"
  local label="$3"
  if [[ "${actual}" != "${expected}" ]]; then
    echo "${label} expected HTTP ${expected}, got ${actual}" >&2
    exit 1
  fi
}

future_iso() {
  local days="$1"
  local hour="$2"
  if date -u -v+"${days}"d "+%Y-%m-%dT${hour}:00:00Z" >/dev/null 2>&1; then
    date -u -v+"${days}"d "+%Y-%m-%dT${hour}:00:00Z"
    return
  fi

  date -u -d "+${days} day ${hour}:00:00" '+%Y-%m-%dT%H:%M:%SZ'
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

authorized_delete() {
  local token="$1"
  local tenant_id="$2"
  local path="$3"
  local expected_status="${4:-204}"
  local status
  status="$(curl -sS -o /dev/null -w '%{http_code}' \
    -X DELETE "${API_BASE_URL}${path}" \
    -H "Authorization: Bearer ${token}" \
    -H "X-Tenant-ID: ${tenant_id}")"
  assert_status "${status}" "${expected_status}" "DELETE ${path}"
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

cleanup_records() {
  if [[ -n "${CREATED_MISSION_ID}" && -n "${ADMIN_TOKEN}" ]]; then
    curl -sS -o /dev/null -X DELETE \
      -H "Authorization: Bearer ${ADMIN_TOKEN}" \
      -H "X-Tenant-ID: ${ADMIN_TENANT_ID}" \
      "${API_BASE_URL}/api/v1/missions/${CREATED_MISSION_ID}" || true
  fi
}

on_exit() {
  cleanup_records
  restore_service_account
  cleanup
}
trap on_exit EXIT

resolve_auth_config
ADMIN_TOKEN="$(issue_password_grant_token "mission-catalog-admin" "${ADMIN_EMAIL}" "${ADMIN_PASSWORD}")"

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

VIEWER_MACHINE_TOKEN="$(issue_client_credentials_token "mission-catalog-viewer-machine" "${MACHINE_CLIENT_ID}" "${MACHINE_CLIENT_SECRET}")"

MISSION_START="$(future_iso 1 10)"
MISSION_END="$(future_iso 1 11)"

MISSION_CREATE_REQUEST_JSON="${TMP_DIR}/mission-create-request.json"
jq -n \
  --arg run_id "${RUN_ID}" \
  --arg start "${MISSION_START}" \
  --arg end "${MISSION_END}" \
  '{
    mission_name: ("IAM Workflow Catalog Verification " + $run_id),
    mission_description: "Disposable workflow for workflow catalog route verification.",
    mission_geometry_type: "POINT",
    mission_category: "inspection",
    priority: "medium",
    geometry: {
      type: "Point",
      coordinates: [-122.3758, 37.6213]
    },
    altitude_profile: {
      takeoff_altitude: 0,
      max_altitude: 150,
      landing_altitude: 0
    },
    time_window: {
      start: $start,
      end: $end
    },
    location_name: "Near SFO Airport",
    location_address: "San Francisco International Airport",
    tags: ["iam", "verification", "workflows"]
  }' > "${MISSION_CREATE_REQUEST_JSON}"

TEMPLATE_CREATE_REQUEST_JSON="${TMP_DIR}/mission-template-create-request.json"
jq -n \
  --arg run_id "${RUN_ID}" \
  '{
    name: ("IAM Template Verification " + $run_id),
    description: "Disposable workflow template for IAM route verification.",
    category: "inspection",
    geometry_type: "point",
    default_priority: "medium",
    default_altitude: 150,
    estimated_duration: 45,
    required_equipment: ["rtk-gps"],
    regulatory_notes: "Maintain workflow verification discipline.",
    checklist_items: ["Confirm payload and launch site."],
    tags: ["iam", "verification"]
  }' > "${TEMPLATE_CREATE_REQUEST_JSON}"

VIEWER_MISSIONS_JSON="${TMP_DIR}/viewer-missions.json"
VIEWER_TEMPLATES_JSON="${TMP_DIR}/viewer-mission-templates.json"
VIEWER_SERIES_JSON="${TMP_DIR}/viewer-mission-series.json"

authorized_get "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/missions' "${VIEWER_MISSIONS_JSON}"
authorized_get "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/missions/templates' "${VIEWER_TEMPLATES_JSON}"
authorized_get "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/missions/series' "${VIEWER_SERIES_JSON}"

VIEWER_MISSION_CREATE_DENY_JSON="${TMP_DIR}/viewer-mission-create-deny.json"
VIEWER_TEMPLATE_CREATE_DENY_JSON="${TMP_DIR}/viewer-template-create-deny.json"

forbidden_post_json "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/missions' "${MISSION_CREATE_REQUEST_JSON}" "${VIEWER_MISSION_CREATE_DENY_JSON}"
forbidden_post_json "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/missions/templates' "${TEMPLATE_CREATE_REQUEST_JSON}" "${VIEWER_TEMPLATE_CREATE_DENY_JSON}"

EXISTING_TEMPLATE_ID="$(jq -r '.templates[0].id // empty' "${VIEWER_TEMPLATES_JSON}")"
if [[ -z "${EXISTING_TEMPLATE_ID}" ]]; then
  echo "Unable to resolve existing workflow template id for detail verification" >&2
  exit 1
fi

VIEWER_TEMPLATE_DETAIL_JSON="${TMP_DIR}/viewer-mission-template-detail.json"
authorized_get "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/missions/templates/${EXISTING_TEMPLATE_ID}" "${VIEWER_TEMPLATE_DETAIL_JSON}"

ADMIN_MISSION_CREATE_JSON="${TMP_DIR}/admin-mission-create.json"
authorized_post_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/missions' "${MISSION_CREATE_REQUEST_JSON}" "${ADMIN_MISSION_CREATE_JSON}" "201"
CREATED_MISSION_ID="$(jq -r '.mission.id' "${ADMIN_MISSION_CREATE_JSON}")"
if [[ -z "${CREATED_MISSION_ID}" || "${CREATED_MISSION_ID}" == "null" ]]; then
  echo "Unable to resolve created mission id" >&2
  exit 1
fi

jq -e '.count >= 0 and (.missions | type) == "array"' "${VIEWER_MISSIONS_JSON}" > /dev/null
jq -e '.count >= 0 and (.templates | type) == "array"' "${VIEWER_TEMPLATES_JSON}" > /dev/null
jq -e '.count >= 0 and (.series | type) == "array"' "${VIEWER_SERIES_JSON}" > /dev/null
jq -e '.id == "'${EXISTING_TEMPLATE_ID}'"' "${VIEWER_TEMPLATE_DETAIL_JSON}" > /dev/null
jq -e '.mission.id == "'${CREATED_MISSION_ID}'"' "${ADMIN_MISSION_CREATE_JSON}" > /dev/null

echo "IDP workflow catalog route verification passed."
