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

future_date_utc() {
  local days="$1"
  if date -u -v+"${days}"d '+%Y-%m-%d' >/dev/null 2>&1; then
    date -u -v+"${days}"d '+%Y-%m-%d'
    return
  fi

  date -u -d "+${days} day" '+%Y-%m-%d'
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
ADMIN_TOKEN="$(issue_password_grant_token "authorization-admin" "${ADMIN_EMAIL}" "${ADMIN_PASSWORD}")"

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

VIEWER_MACHINE_TOKEN="$(issue_client_credentials_token "authorization-viewer-machine" "${MACHINE_CLIENT_ID}" "${MACHINE_CLIENT_SECRET}")"

START_DATE_UTC="$(future_date_utc 1)"
RENEW_DATE_UTC="$(future_date_utc 2)"
ADVISORY_START_TIME="${START_DATE_UTC}T15:00:00Z"
ADVISORY_END_TIME="${START_DATE_UTC}T16:00:00Z"
CONTROLLED_START_TIME="${START_DATE_UTC}T18:00:00Z"
CONTROLLED_END_TIME="${START_DATE_UTC}T19:00:00Z"
RENEW_END_TIME="${RENEW_DATE_UTC}T16:30:00Z"

AUTHORIZATION_CHECK_REQUEST_JSON="${TMP_DIR}/authorization-check-request.json"
jq -n \
  --arg start_time "${ADVISORY_START_TIME}" \
  --arg end_time "${ADVISORY_END_TIME}" \
  '{
    lat: 39.328,
    lon: -117.001,
    altitude: 120,
    start_time: $start_time,
    end_time: $end_time
  }' > "${AUTHORIZATION_CHECK_REQUEST_JSON}"

ADVISORY_REQUEST_JSON="${TMP_DIR}/authorization-advisory-request.json"
jq -n \
  --arg run_id "${RUN_ID}" \
  --arg start_time "${ADVISORY_START_TIME}" \
  --arg end_time "${ADVISORY_END_TIME}" \
  '{
    pilot_certificate: {
      number: "UAS-IAM-\($run_id)",
      type: "part_107",
      expiration_date: "2027-12-31"
    },
    aircraft: {
      registration_number: "FA\($run_id)",
      make_model: "DJI Mini 4 Pro",
      serial_number: "IAM-ADVISORY-\($run_id)",
      weight_kg: 0.75
    },
    operation: {
      location: {
        lat: 39.328,
        lon: -117.001,
        address: "Central Nevada Test Range",
        facility_name: "Remote Operating Area"
      },
      altitude_agl: 120,
      start_time: $start_time,
      end_time: $end_time,
      operation_type: "commercial",
      purpose: "Authorization workbench IAM verification advisory flight",
      participant_count: 1
    },
    airspace_authorization: {
      facility: "UNCONTROLLED",
      grid_id: "NONE",
      authorization_type: "near_airport",
      requested_altitude: 120,
      maximum_allowed_altitude: 400
    },
    contact_info: {
      name: "Sarah Chen",
      phone: "+1-555-123-4567",
      email: "alex.morgan@northstar.example"
    }
  }' > "${ADVISORY_REQUEST_JSON}"

CONTROLLED_REQUEST_JSON="${TMP_DIR}/authorization-controlled-request.json"
jq -n \
  --arg run_id "${RUN_ID}" \
  --arg start_time "${CONTROLLED_START_TIME}" \
  --arg end_time "${CONTROLLED_END_TIME}" \
  '{
    pilot_certificate: {
      number: "UAS-SFO-\($run_id)",
      type: "part_107",
      expiration_date: "2027-12-31"
    },
    aircraft: {
      registration_number: "SFO\($run_id)",
      make_model: "DJI Matrice 30",
      serial_number: "IAM-CONTROLLED-\($run_id)",
      weight_kg: 3.8
    },
    operation: {
      location: {
        lat: 37.6213,
        lon: -122.3758,
        address: "Near SFO Airport",
        facility_name: "San Francisco International Airport"
      },
      altitude_agl: 150,
      start_time: $start_time,
      end_time: $end_time,
      operation_type: "commercial",
      purpose: "Authorization workbench IAM verification controlled flight",
      participant_count: 2
    },
    airspace_authorization: {
      facility: "SFO",
      grid_id: "SFO_001",
      authorization_type: "near_airport",
      requested_altitude: 150,
      maximum_allowed_altitude: 200
    },
    contact_info: {
      name: "Sarah Chen",
      phone: "+1-555-123-4567",
      email: "alex.morgan@northstar.example"
    }
  }' > "${CONTROLLED_REQUEST_JSON}"

RENEW_REQUEST_JSON="${TMP_DIR}/authorization-renew-request.json"
jq -n \
  --arg new_end_time "${RENEW_END_TIME}" \
  '{ new_end_time: $new_end_time }' > "${RENEW_REQUEST_JSON}"

CANCEL_REQUEST_JSON="${TMP_DIR}/authorization-cancel-request.json"
jq -n \
  --arg run_id "${RUN_ID}" \
  '{ reason: ("IAM authorization verifier cancellation " + $run_id) }' > "${CANCEL_REQUEST_JSON}"

ESCALATE_REQUEST_JSON="${TMP_DIR}/authorization-escalate-request.json"
jq -n \
  --arg run_id "${RUN_ID}" \
  '{
    reason: ("IAM authorization verifier escalation " + $run_id),
    urgency: "high"
  }' > "${ESCALATE_REQUEST_JSON}"

ADMIN_CHECK_RESPONSE_JSON="${TMP_DIR}/admin-authorization-check.json"
authorized_post_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/authorization/check' "${AUTHORIZATION_CHECK_REQUEST_JSON}" "${ADMIN_CHECK_RESPONSE_JSON}" "200"

ADMIN_ADVISORY_CREATE_RESPONSE_JSON="${TMP_DIR}/admin-authorization-advisory-create.json"
authorized_post_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/authorization/requests' "${ADVISORY_REQUEST_JSON}" "${ADMIN_ADVISORY_CREATE_RESPONSE_JSON}" "201"
ADVISORY_REQUEST_ID="$(jq -r '.id' "${ADMIN_ADVISORY_CREATE_RESPONSE_JSON}")"
jq -e '.status == "approved"' "${ADMIN_ADVISORY_CREATE_RESPONSE_JSON}" > /dev/null

ADMIN_CONTROLLED_CREATE_RESPONSE_JSON="${TMP_DIR}/admin-authorization-controlled-create.json"
authorized_post_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/authorization/requests' "${CONTROLLED_REQUEST_JSON}" "${ADMIN_CONTROLLED_CREATE_RESPONSE_JSON}" "201"
CONTROLLED_REQUEST_ID="$(jq -r '.id' "${ADMIN_CONTROLLED_CREATE_RESPONSE_JSON}")"
jq -e '.status == "processing" or .status == "submitted"' "${ADMIN_CONTROLLED_CREATE_RESPONSE_JSON}" > /dev/null

VIEWER_PROVIDERS_JSON="${TMP_DIR}/viewer-authorization-providers.json"
VIEWER_REQUEST_LIST_JSON="${TMP_DIR}/viewer-authorization-request-list.json"
VIEWER_ADVISORY_DETAIL_JSON="${TMP_DIR}/viewer-authorization-advisory-detail.json"
VIEWER_ADVISORY_STATUS_JSON="${TMP_DIR}/viewer-authorization-advisory-status.json"
VIEWER_GRIDS_JSON="${TMP_DIR}/viewer-authorization-grids.json"

authorized_get "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/authorization/providers' "${VIEWER_PROVIDERS_JSON}"
authorized_get "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/authorization/requests' "${VIEWER_REQUEST_LIST_JSON}"
authorized_get "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/authorization/requests/${ADVISORY_REQUEST_ID}" "${VIEWER_ADVISORY_DETAIL_JSON}"
authorized_get "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/authorization/requests/${ADVISORY_REQUEST_ID}/status" "${VIEWER_ADVISORY_STATUS_JSON}"
authorized_get "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/authorization/grids?facility=SFO' "${VIEWER_GRIDS_JSON}"

jq -e '.providers | length > 0' "${VIEWER_PROVIDERS_JSON}" > /dev/null
jq -e --arg request_id "${ADVISORY_REQUEST_ID}" '.id == $request_id' "${VIEWER_ADVISORY_DETAIL_JSON}" > /dev/null
jq -e '.status != null' "${VIEWER_ADVISORY_STATUS_JSON}" > /dev/null
jq -e '.grids | length > 0' "${VIEWER_GRIDS_JSON}" > /dev/null

VIEWER_CHECK_DENY_JSON="${TMP_DIR}/viewer-authorization-check-deny.json"
VIEWER_CREATE_DENY_JSON="${TMP_DIR}/viewer-authorization-create-deny.json"
VIEWER_CANCEL_DENY_JSON="${TMP_DIR}/viewer-authorization-cancel-deny.json"
VIEWER_RENEW_DENY_JSON="${TMP_DIR}/viewer-authorization-renew-deny.json"
VIEWER_ESCALATE_DENY_JSON="${TMP_DIR}/viewer-authorization-escalate-deny.json"

forbidden_post_json "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/authorization/check' "${AUTHORIZATION_CHECK_REQUEST_JSON}" "${VIEWER_CHECK_DENY_JSON}"
forbidden_post_json "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/authorization/requests' "${ADVISORY_REQUEST_JSON}" "${VIEWER_CREATE_DENY_JSON}"
forbidden_post_json "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/authorization/requests/${CONTROLLED_REQUEST_ID}/cancel" "${CANCEL_REQUEST_JSON}" "${VIEWER_CANCEL_DENY_JSON}"
forbidden_post_json "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/authorization/requests/${ADVISORY_REQUEST_ID}/renew" "${RENEW_REQUEST_JSON}" "${VIEWER_RENEW_DENY_JSON}"
forbidden_post_json "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/authorization/requests/${CONTROLLED_REQUEST_ID}/escalate" "${ESCALATE_REQUEST_JSON}" "${VIEWER_ESCALATE_DENY_JSON}"

ADMIN_RENEW_RESPONSE_JSON="${TMP_DIR}/admin-authorization-renew.json"
authorized_post_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/authorization/requests/${ADVISORY_REQUEST_ID}/renew" "${RENEW_REQUEST_JSON}" "${ADMIN_RENEW_RESPONSE_JSON}" "201"
jq -e '.status != null and .id != null and .supersedes_request_id != null' "${ADMIN_RENEW_RESPONSE_JSON}" > /dev/null

ADMIN_ESCALATE_RESPONSE_JSON="${TMP_DIR}/admin-authorization-escalate.json"
authorized_post_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/authorization/requests/${CONTROLLED_REQUEST_ID}/escalate" "${ESCALATE_REQUEST_JSON}" "${ADMIN_ESCALATE_RESPONSE_JSON}" "200"
jq -e '.status != null and .messages != null' "${ADMIN_ESCALATE_RESPONSE_JSON}" > /dev/null

ADMIN_CANCEL_RESPONSE_JSON="${TMP_DIR}/admin-authorization-cancel.json"
authorized_post_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/authorization/requests/${CONTROLLED_REQUEST_ID}/cancel" "${CANCEL_REQUEST_JSON}" "${ADMIN_CANCEL_RESPONSE_JSON}" "200"
jq -e '.status == "cancelled"' "${ADMIN_CANCEL_RESPONSE_JSON}" > /dev/null

echo "IDP authorization workbench route verification passed."
