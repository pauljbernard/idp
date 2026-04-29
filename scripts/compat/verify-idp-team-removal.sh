#!/bin/bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
CURL_BIN="${CURL_BIN:-/usr/bin/curl}"
JQ_BIN="${JQ_BIN:-$(command -v jq)}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOGIN_AUTH_MODE="${IDP_AUTH_MODE:-standalone_iam}"

TMP_DIR="$(mktemp -d)"
cleanup() {
  if [[ "${KEEP_TMP_DIR:-0}" == "1" ]]; then
    echo "Preserving verifier temp directory: ${TMP_DIR}" >&2
    return
  fi
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

source "$SCRIPT_DIR/lib/idp-auth.sh"

IDP_IAM_CONFIG_JSON="${TMP_DIR}/idp-iam-config.json"
"$CURL_BIN" -sS -o "${IDP_IAM_CONFIG_JSON}" "${API_BASE_URL}/api/v1/auth/iam/config"

REALM_ID="$("$JQ_BIN" -r '.realm_id' "${IDP_IAM_CONFIG_JSON}")"
INVITE_EMAIL="idp-iam-removal-$(date +%s)@northstar.example"

perform_idp_login() {
  local email="$1"
  local password="$2"
  local requested_tenant_id="$3"
  local login_response_json="${TMP_DIR}/idp-login-response-${requested_tenant_id}-${email//[^a-zA-Z0-9]/_}.json"

  idp_login_json "${API_BASE_URL}" "${email}" "${password}" "${requested_tenant_id}" "${LOGIN_AUTH_MODE}" > "${login_response_json}"
  printf '%s\n' "${login_response_json}"
}

DEMO_LOGIN_JSON="$(perform_idp_login "admin@idp.local" "StandaloneIAM!SuperAdmin2026" "northstar-holdings")"
CITY_LOGIN_JSON="$(perform_idp_login "admin@idp.local" "StandaloneIAM!SuperAdmin2026" "civic-services")"
DEMO_AUTH_HEADER_FILE="${TMP_DIR}/demo-auth.headers"
CITY_AUTH_HEADER_FILE="${TMP_DIR}/city-auth.headers"
idp_emit_auth_headers "${DEMO_LOGIN_JSON}" "northstar-holdings" > "${DEMO_AUTH_HEADER_FILE}"
idp_emit_auth_headers "${CITY_LOGIN_JSON}" "civic-services" > "${CITY_AUTH_HEADER_FILE}"

DEMO_INVITE_JSON="${TMP_DIR}/demo-invite.json"
CITY_INVITE_JSON="${TMP_DIR}/city-invite.json"
IAM_AFTER_CITY_INVITE_JSON="${TMP_DIR}/iam-after-city-invite.json"
CITY_MEMBERS_AFTER_DELETE_JSON="${TMP_DIR}/city-members-after-delete.json"
DEMO_MEMBERS_AFTER_CITY_DELETE_JSON="${TMP_DIR}/demo-members-after-city-delete.json"
IAM_AFTER_CITY_DELETE_JSON="${TMP_DIR}/iam-after-city-delete.json"
DEMO_MEMBERS_AFTER_FINAL_DELETE_JSON="${TMP_DIR}/demo-members-after-final-delete.json"
IAM_AFTER_FINAL_DELETE_JSON="${TMP_DIR}/iam-after-final-delete.json"

"$CURL_BIN" -sS -o "${DEMO_INVITE_JSON}" \
  -X POST "${API_BASE_URL}/api/v1/team/invite" \
  -H @"${DEMO_AUTH_HEADER_FILE}" \
  -H 'Content-Type: application/json' \
  --data "{\"email\":\"${INVITE_EMAIL}\",\"role\":\"viewer\"}"

"$CURL_BIN" -sS -o "${CITY_INVITE_JSON}" \
  -X POST "${API_BASE_URL}/api/v1/team/invite" \
  -H @"${CITY_AUTH_HEADER_FILE}" \
  -H 'Content-Type: application/json' \
  --data "{\"email\":\"${INVITE_EMAIL}\",\"role\":\"operator\"}"

"$CURL_BIN" -sS -o "${IAM_AFTER_CITY_INVITE_JSON}" \
  "${API_BASE_URL}/api/v1/iam/users?realm_id=${REALM_ID}&search=${INVITE_EMAIL}" \
  -H @"${DEMO_AUTH_HEADER_FILE}"

CITY_MEMBER_ID="$("$JQ_BIN" -r '.id' "${CITY_INVITE_JSON}")"
DEMO_MEMBER_ID="$("$JQ_BIN" -r '.id' "${DEMO_INVITE_JSON}")"

"$CURL_BIN" -sS -o /dev/null \
  -X DELETE "${API_BASE_URL}/api/v1/team/members/${CITY_MEMBER_ID}" \
  -H @"${CITY_AUTH_HEADER_FILE}"

"$CURL_BIN" -sS -o "${CITY_MEMBERS_AFTER_DELETE_JSON}" \
  "${API_BASE_URL}/api/v1/team/members" \
  -H @"${CITY_AUTH_HEADER_FILE}"

"$CURL_BIN" -sS -o "${DEMO_MEMBERS_AFTER_CITY_DELETE_JSON}" \
  "${API_BASE_URL}/api/v1/team/members" \
  -H @"${DEMO_AUTH_HEADER_FILE}"

"$CURL_BIN" -sS -o "${IAM_AFTER_CITY_DELETE_JSON}" \
  "${API_BASE_URL}/api/v1/iam/users?realm_id=${REALM_ID}&search=${INVITE_EMAIL}" \
  -H @"${DEMO_AUTH_HEADER_FILE}"

"$CURL_BIN" -sS -o /dev/null \
  -X DELETE "${API_BASE_URL}/api/v1/team/members/${DEMO_MEMBER_ID}" \
  -H @"${DEMO_AUTH_HEADER_FILE}"

"$CURL_BIN" -sS -o "${DEMO_MEMBERS_AFTER_FINAL_DELETE_JSON}" \
  "${API_BASE_URL}/api/v1/team/members" \
  -H @"${DEMO_AUTH_HEADER_FILE}"

"$CURL_BIN" -sS -o "${IAM_AFTER_FINAL_DELETE_JSON}" \
  "${API_BASE_URL}/api/v1/iam/users?realm_id=${REALM_ID}&search=${INVITE_EMAIL}" \
  -H @"${DEMO_AUTH_HEADER_FILE}"

"$JQ_BIN" -e '
  .managementScope == "external_identity" and
  .provisioning.mode == "STANDALONE_IAM"
' "${DEMO_INVITE_JSON}" > /dev/null

"$JQ_BIN" -e --slurpfile demo "${DEMO_INVITE_JSON}" '
  .managementScope == "external_identity" and
  .provisioning.mode == "STANDALONE_IAM" and
  .provisioning.existing_provider_user == true and
  .provisioning.provider_user_id == $demo[0].provisioning.provider_user_id
' "${CITY_INVITE_JSON}" > /dev/null

"$JQ_BIN" -e '
  .count == 1 and
  (.users[0].status == "ACTIVE") and
  (.users[0].role_ids | index("role-default-member")) != null
' "${IAM_AFTER_CITY_INVITE_JSON}" > /dev/null

"$JQ_BIN" -e --arg invite_email "${INVITE_EMAIL}" '
  ([.members[] | select(.email == $invite_email)] | length) == 0
' "${CITY_MEMBERS_AFTER_DELETE_JSON}" > /dev/null

"$JQ_BIN" -e --arg invite_email "${INVITE_EMAIL}" '
  (.members[] | select(.email == $invite_email) | .managementScope) == "external_identity" and
  (.members[] | select(.email == $invite_email) | .role) == "viewer"
' "${DEMO_MEMBERS_AFTER_CITY_DELETE_JSON}" > /dev/null

"$JQ_BIN" -e '
  .count == 1 and
  (.users[0].status == "ACTIVE") and
  (.users[0].role_ids | index("role-default-auditor")) != null and
  ((.users[0].role_ids | index("role-default-member")) == null)
' "${IAM_AFTER_CITY_DELETE_JSON}" > /dev/null

"$JQ_BIN" -e --arg invite_email "${INVITE_EMAIL}" '
  ([.members[] | select(.email == $invite_email)] | length) == 0
' "${DEMO_MEMBERS_AFTER_FINAL_DELETE_JSON}" > /dev/null

"$JQ_BIN" -e '
  .count == 1 and
  (.users[0].status == "DISABLED")
' "${IAM_AFTER_FINAL_DELETE_JSON}" > /dev/null

"$JQ_BIN" -n \
  --slurpfile demo "${DEMO_INVITE_JSON}" \
  --slurpfile city "${CITY_INVITE_JSON}" \
  --slurpfile city_invite_iam "${IAM_AFTER_CITY_INVITE_JSON}" \
  --slurpfile city_delete_iam "${IAM_AFTER_CITY_DELETE_JSON}" \
  --slurpfile final_iam "${IAM_AFTER_FINAL_DELETE_JSON}" \
  '{
    demo_invite: ($demo[0] | {
      id,
      email,
      role,
      managementScope,
      provisioning
    }),
    city_invite: ($city[0] | {
      id,
      email,
      role,
      managementScope,
      provisioning
    }),
    after_second_tenant_invite: ($city_invite_iam[0].users[0] | {
      status,
      role_ids
    }),
    after_city_membership_removal: ($city_delete_iam[0].users[0] | {
      status,
      role_ids
    }),
    after_final_membership_removal: ($final_iam[0].users[0] | {
      status,
      role_ids
    })
  }'
