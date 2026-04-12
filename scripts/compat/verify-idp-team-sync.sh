#!/bin/bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
CURL_BIN="${CURL_BIN:-/usr/bin/curl}"
JQ_BIN="${JQ_BIN:-$(command -v jq)}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOGIN_AUTH_MODE="${IDP_AUTH_MODE:-standalone_iam}"

TMP_DIR="$(mktemp -d)"
cleanup() {
  if [[ -n "${ADMIN_AUTH_HEADER_FILE:-}" && -n "${MIGUEL_MEMBER_ID:-}" && "${RESTORE_MIGUEL:-0}" == "1" ]]; then
    curl -sS -o /dev/null \
      -X PUT "${API_BASE_URL}/api/v1/team/members/${MIGUEL_MEMBER_ID}" \
      -H @"${ADMIN_AUTH_HEADER_FILE}" \
      -H 'Content-Type: application/json' \
      --data '{"role":"operator","status":"active"}' || true
  fi

  if [[ "${KEEP_TMP_DIR:-0}" == "1" ]]; then
    echo "Preserving verifier temp directory: ${TMP_DIR}" >&2
    return
  fi
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

IDP_IAM_CONFIG_JSON="${TMP_DIR}/idp-iam-config.json"
"$CURL_BIN" -sS -o "${IDP_IAM_CONFIG_JSON}" "${API_BASE_URL}/api/v1/auth/iam/config"

REALM_ID="$(jq -r '.realm_id' "${IDP_IAM_CONFIG_JSON}")"
CLIENT_ID="$(jq -r '.client_id' "${IDP_IAM_CONFIG_JSON}")"

jq -e '
  .authorization_profile_id == "idp-enterprise-admin-console" and
  .authorization_projection_mode == "APPLICATION_BINDING_CLAIM_MAPPING" and
  (.managed_role_assignment_candidates.specialist | index("specialist")) != null
' "${IDP_IAM_CONFIG_JSON}" > /dev/null

perform_idp_login() {
  local email="$1"
  local password="$2"
  local requested_tenant_id="$3"
  local login_response_json="${TMP_DIR}/idp-login-response-${email//[^a-zA-Z0-9]/_}.json"

  idp_login_json "${API_BASE_URL}" "${email}" "${password}" "${requested_tenant_id}" "${LOGIN_AUTH_MODE}" > "${login_response_json}"

  printf '%s\n' "${login_response_json}"
}

source "$SCRIPT_DIR/lib/idp-auth.sh"

ADMIN_LOGIN_JSON="$(perform_idp_login "admin@idp.local" "StandaloneIAM!SuperAdmin2026" "civic-services")"
ADMIN_AUTH_HEADER_FILE="${TMP_DIR}/admin-auth.headers"
idp_emit_auth_headers "${ADMIN_LOGIN_JSON}" "civic-services" > "${ADMIN_AUTH_HEADER_FILE}"
TEAM_MEMBERS_BEFORE_JSON="${TMP_DIR}/team-members-before.json"
TEAM_MEMBERS_AFTER_VIEWER_JSON="${TMP_DIR}/team-members-after-viewer.json"
TEAM_MEMBERS_AFTER_SPECIALIST_JSON="${TMP_DIR}/team-members-after-specialist.json"
TEAM_MEMBERS_AFTER_SUSPEND_JSON="${TMP_DIR}/team-members-after-suspend.json"
TEAM_MEMBERS_AFTER_RESTORE_JSON="${TMP_DIR}/team-members-after-restore.json"
MIGUEL_IAM_BEFORE_JSON="${TMP_DIR}/miguel-iam-before.json"
MIGUEL_IAM_AFTER_VIEWER_JSON="${TMP_DIR}/miguel-iam-after-viewer.json"
MIGUEL_IAM_AFTER_SPECIALIST_JSON="${TMP_DIR}/miguel-iam-after-specialist.json"
MIGUEL_IAM_AFTER_SUSPEND_JSON="${TMP_DIR}/miguel-iam-after-suspend.json"
MIGUEL_IAM_AFTER_RESTORE_JSON="${TMP_DIR}/miguel-iam-after-restore.json"
SARAH_DELETE_JSON="${TMP_DIR}/sarah-delete.json"

curl -sS -o "${TEAM_MEMBERS_BEFORE_JSON}" \
  "${API_BASE_URL}/api/v1/team/members" \
  -H @"${ADMIN_AUTH_HEADER_FILE}"

MIGUEL_MEMBER_ID="$(jq -r '.members[] | select(.email == "jordan.lee@civic.example") | .id' "${TEAM_MEMBERS_BEFORE_JSON}")"
SARAH_MEMBER_ID="$(jq -r '.members[] | select(.email == "alex.morgan@northstar.example") | .id' "${TEAM_MEMBERS_BEFORE_JSON}")"

if [[ -z "${MIGUEL_MEMBER_ID}" || "${MIGUEL_MEMBER_ID}" == "null" ]]; then
  echo "Unable to resolve the provider-linked Miguel roster record in civic-services" >&2
  exit 1
fi

curl -sS -o "${MIGUEL_IAM_BEFORE_JSON}" \
  "${API_BASE_URL}/api/v1/iam/users?realm_id=${REALM_ID}&search=jordan.lee@civic.example" \
  -H @"${ADMIN_AUTH_HEADER_FILE}"

curl -sS -o /dev/null \
  -X PUT "${API_BASE_URL}/api/v1/team/members/${MIGUEL_MEMBER_ID}" \
  -H @"${ADMIN_AUTH_HEADER_FILE}" \
  -H 'Content-Type: application/json' \
  --data '{"role":"viewer","status":"active"}'

RESTORE_MIGUEL=1

curl -sS -o "${TEAM_MEMBERS_AFTER_VIEWER_JSON}" \
  "${API_BASE_URL}/api/v1/team/members" \
  -H @"${ADMIN_AUTH_HEADER_FILE}"

curl -sS -o "${MIGUEL_IAM_AFTER_VIEWER_JSON}" \
  "${API_BASE_URL}/api/v1/iam/users?realm_id=${REALM_ID}&search=jordan.lee@civic.example" \
  -H @"${ADMIN_AUTH_HEADER_FILE}"

curl -sS -o /dev/null \
  -X PUT "${API_BASE_URL}/api/v1/team/members/${MIGUEL_MEMBER_ID}" \
  -H @"${ADMIN_AUTH_HEADER_FILE}" \
  -H 'Content-Type: application/json' \
  --data '{"role":"specialist","status":"active"}'

curl -sS -o "${TEAM_MEMBERS_AFTER_SPECIALIST_JSON}" \
  "${API_BASE_URL}/api/v1/team/members" \
  -H @"${ADMIN_AUTH_HEADER_FILE}"

curl -sS -o "${MIGUEL_IAM_AFTER_SPECIALIST_JSON}" \
  "${API_BASE_URL}/api/v1/iam/users?realm_id=${REALM_ID}&search=jordan.lee@civic.example" \
  -H @"${ADMIN_AUTH_HEADER_FILE}"

curl -sS -o /dev/null \
  -X PUT "${API_BASE_URL}/api/v1/team/members/${MIGUEL_MEMBER_ID}" \
  -H @"${ADMIN_AUTH_HEADER_FILE}" \
  -H 'Content-Type: application/json' \
  --data '{"role":"operator","status":"suspended"}'

curl -sS -o "${TEAM_MEMBERS_AFTER_SUSPEND_JSON}" \
  "${API_BASE_URL}/api/v1/team/members" \
  -H @"${ADMIN_AUTH_HEADER_FILE}"

curl -sS -o "${MIGUEL_IAM_AFTER_SUSPEND_JSON}" \
  "${API_BASE_URL}/api/v1/iam/users?realm_id=${REALM_ID}&search=jordan.lee@civic.example" \
  -H @"${ADMIN_AUTH_HEADER_FILE}"

curl -sS -o "${SARAH_DELETE_JSON}" \
  -X DELETE "${API_BASE_URL}/api/v1/team/members/${SARAH_MEMBER_ID}" \
  -H @"${ADMIN_AUTH_HEADER_FILE}"

curl -sS -o /dev/null \
  -X PUT "${API_BASE_URL}/api/v1/team/members/${MIGUEL_MEMBER_ID}" \
  -H @"${ADMIN_AUTH_HEADER_FILE}" \
  -H 'Content-Type: application/json' \
  --data '{"role":"operator","status":"active"}'

RESTORE_MIGUEL=0

curl -sS -o "${TEAM_MEMBERS_AFTER_RESTORE_JSON}" \
  "${API_BASE_URL}/api/v1/team/members" \
  -H @"${ADMIN_AUTH_HEADER_FILE}"

curl -sS -o "${MIGUEL_IAM_AFTER_RESTORE_JSON}" \
  "${API_BASE_URL}/api/v1/iam/users?realm_id=${REALM_ID}&search=jordan.lee@civic.example" \
  -H @"${ADMIN_AUTH_HEADER_FILE}"

jq -e '
  (.members[] | select(.email == "jordan.lee@civic.example") | .role) == "viewer" and
  (.members[] | select(.email == "jordan.lee@civic.example") | .status) == "active" and
  (.members[] | select(.email == "jordan.lee@civic.example") | .managementScope) == "external_identity"
' "${TEAM_MEMBERS_AFTER_VIEWER_JSON}" > /dev/null

jq -e '
  .count == 1 and
  (.users[0].status == "ACTIVE") and
  (.users[0].role_ids | index("role-default-auditor")) != null and
  ((.users[0].role_ids | index("role-default-member")) == null)
' "${MIGUEL_IAM_AFTER_VIEWER_JSON}" > /dev/null

jq -e '
  (.members[] | select(.email == "jordan.lee@civic.example") | .role) == "specialist" and
  (.members[] | select(.email == "jordan.lee@civic.example") | .status) == "active"
' "${TEAM_MEMBERS_AFTER_SPECIALIST_JSON}" > /dev/null

jq -e '
  .count == 1 and
  (.users[0].status == "ACTIVE") and
  (.users[0].role_ids | index("role-default-specialist")) != null and
  ((.users[0].role_ids | index("role-default-member")) == null) and
  ((.users[0].role_ids | index("role-default-auditor")) == null)
' "${MIGUEL_IAM_AFTER_SPECIALIST_JSON}" > /dev/null

jq -e '
  (.members[] | select(.email == "jordan.lee@civic.example") | .role) == "operator" and
  (.members[] | select(.email == "jordan.lee@civic.example") | .status) == "suspended"
' "${TEAM_MEMBERS_AFTER_SUSPEND_JSON}" > /dev/null

jq -e '
  .count == 1 and
  (.users[0].status == "DISABLED") and
  (.users[0].role_ids | index("role-default-member")) != null and
  ((.users[0].role_ids | index("role-default-auditor")) == null)
' "${MIGUEL_IAM_AFTER_SUSPEND_JSON}" > /dev/null

jq -e '
  .error == "Provider-linked platform administrators must be managed from the standalone IAM administration workspace"
' "${SARAH_DELETE_JSON}" > /dev/null

jq -e '
  (.members[] | select(.email == "jordan.lee@civic.example") | .role) == "operator" and
  (.members[] | select(.email == "jordan.lee@civic.example") | .status) == "active"
' "${TEAM_MEMBERS_AFTER_RESTORE_JSON}" > /dev/null

jq -e '
  .count == 1 and
  (.users[0].status == "ACTIVE") and
  (.users[0].role_ids | index("role-default-member")) != null
' "${MIGUEL_IAM_AFTER_RESTORE_JSON}" > /dev/null

jq -n \
  --slurpfile config "${IDP_IAM_CONFIG_JSON}" \
  --slurpfile before_team "${TEAM_MEMBERS_BEFORE_JSON}" \
  --slurpfile viewer_team "${TEAM_MEMBERS_AFTER_VIEWER_JSON}" \
  --slurpfile specialist_team "${TEAM_MEMBERS_AFTER_SPECIALIST_JSON}" \
  --slurpfile suspend_team "${TEAM_MEMBERS_AFTER_SUSPEND_JSON}" \
  --slurpfile restore_team "${TEAM_MEMBERS_AFTER_RESTORE_JSON}" \
  --slurpfile viewer_iam "${MIGUEL_IAM_AFTER_VIEWER_JSON}" \
  --slurpfile specialist_iam "${MIGUEL_IAM_AFTER_SPECIALIST_JSON}" \
  --slurpfile suspend_iam "${MIGUEL_IAM_AFTER_SUSPEND_JSON}" \
  --slurpfile restore_iam "${MIGUEL_IAM_AFTER_RESTORE_JSON}" \
  '{
    iam_config: {
      realm_id: $config[0].realm_id,
      client_id: $config[0].client_id,
      authorization_profile_id: $config[0].authorization_profile_id,
      managed_role_assignment_candidates: $config[0].managed_role_assignment_candidates
    },
    provider_linked_member_before: ($before_team[0].members[] | select(.email == "jordan.lee@civic.example") | {id, role, status, managementScope}),
    after_viewer_update: {
      team_member: ($viewer_team[0].members[] | select(.email == "jordan.lee@civic.example") | {role, status}),
      iam_user: ($viewer_iam[0].users[0] | {status, role_ids})
    },
    after_specialist_update: {
      team_member: ($specialist_team[0].members[] | select(.email == "jordan.lee@civic.example") | {role, status}),
      iam_user: ($specialist_iam[0].users[0] | {status, role_ids})
    },
    after_suspend_update: {
      team_member: ($suspend_team[0].members[] | select(.email == "jordan.lee@civic.example") | {role, status}),
      iam_user: ($suspend_iam[0].users[0] | {status, role_ids})
    },
    after_restore: {
      team_member: ($restore_team[0].members[] | select(.email == "jordan.lee@civic.example") | {role, status}),
      iam_user: ($restore_iam[0].users[0] | {status, role_ids})
    },
    platform_admin_delete_guard: "PASS"
  }'
