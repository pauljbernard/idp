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
CLIENT_ID="$("$JQ_BIN" -r '.client_id' "${IDP_IAM_CONFIG_JSON}")"
INVITE_EMAIL="idp-iam-invite-$(date +%s)@northstar.example"

perform_idp_login() {
  local email="$1"
  local password="$2"
  local requested_tenant_id="$3"
  local login_response_json="${TMP_DIR}/idp-login-response-${email//[^a-zA-Z0-9]/_}.json"

  idp_login_json "${API_BASE_URL}" "${email}" "${password}" "${requested_tenant_id}" "${LOGIN_AUTH_MODE}" > "${login_response_json}"
  printf '%s\n' "${login_response_json}"
}

ADMIN_LOGIN_JSON="$(perform_idp_login "admin@idp.local" "StandaloneIAM!SuperAdmin2026" "northstar-holdings")"
ADMIN_AUTH_HEADER_FILE="${TMP_DIR}/admin-auth.headers"
idp_emit_auth_headers "${ADMIN_LOGIN_JSON}" "northstar-holdings" > "${ADMIN_AUTH_HEADER_FILE}"

TEAM_INVITE_JSON="${TMP_DIR}/team-invite.json"
PUBLIC_INVITATION_JSON="${TMP_DIR}/public-invitation.json"
TEAM_MEMBERS_JSON="${TMP_DIR}/team-members.json"
IAM_USERS_JSON="${TMP_DIR}/iam-users.json"
IAM_LOGIN_JSON="${TMP_DIR}/iam-login.json"
IDENTITY_STATE_FILE="apps/api-server/local-data/platform/identity-control-plane-state.json"
IDENTITY_SECURITY_JSON="${TMP_DIR}/identity-security.json"

"$CURL_BIN" -sS -o "${TEAM_INVITE_JSON}" \
  -X POST "${API_BASE_URL}/api/v1/team/invite" \
  -H @"${ADMIN_AUTH_HEADER_FILE}" \
  -H 'Content-Type: application/json' \
  --data "{\"email\":\"${INVITE_EMAIL}\",\"role\":\"viewer\"}"

ISSUED_TEMP_PASSWORD="$("$JQ_BIN" -r '.provisioning.issued_temporary_password' "${TEAM_INVITE_JSON}")"
INVITATION_TOKEN="$("$JQ_BIN" -r '.invitation_delivery.invitation_token' "${TEAM_INVITE_JSON}")"

"$CURL_BIN" -sS -o "${PUBLIC_INVITATION_JSON}" \
  "${API_BASE_URL}/api/v1/team/invitations/${INVITATION_TOKEN}/public"

"$CURL_BIN" -sS -o "${TEAM_MEMBERS_JSON}" \
  "${API_BASE_URL}/api/v1/team/members" \
  -H @"${ADMIN_AUTH_HEADER_FILE}"

"$CURL_BIN" -sS -o "${IAM_USERS_JSON}" \
  "${API_BASE_URL}/api/v1/iam/users?realm_id=${REALM_ID}&search=${INVITE_EMAIL}" \
  -H @"${ADMIN_AUTH_HEADER_FILE}"

"$CURL_BIN" -sS -o "${IAM_LOGIN_JSON}" \
  -X POST "${API_BASE_URL}/api/v1/iam/realms/${REALM_ID}/login" \
  -H 'Content-Type: application/json' \
  --data "{\"username\":\"${INVITE_EMAIL}\",\"password\":\"${ISSUED_TEMP_PASSWORD}\",\"client_id\":\"${CLIENT_ID}\",\"scope\":[\"openid\",\"profile\",\"email\",\"roles\",\"groups\"]}"

INVITED_MEMBER_ID="$("$JQ_BIN" -r '.id' "${TEAM_INVITE_JSON}")"
"$JQ_BIN" -n \
  --arg user_id "${INVITED_MEMBER_ID}" \
  --slurpfile state "${IDENTITY_STATE_FILE}" \
  '$state[0].state.users_by_id[$user_id]' > "${IDENTITY_SECURITY_JSON}"

"$JQ_BIN" -e '
  .managementScope == "external_identity" and
  .status == "active" and
  .provisioning.mode == "STANDALONE_IAM" and
  (.provisioning.issued_temporary_password | type) == "string" and
  (.provisioning.required_actions | index("UPDATE_PASSWORD")) != null and
  (.invitation_delivery.invitation_token | type) == "string" and
  (.invitation_delivery.invitation_url | contains("/invite/")) and
  .activation_handoff.flow_context == "invite_activation" and
  (.activation_handoff.login_hint | test("@")) and
  (.activation_handoff.login_url | contains("flow_context=invite_activation")) and
  (.activation_handoff.login_url | contains("login_hint="))
' "${TEAM_INVITE_JSON}" > /dev/null

"$JQ_BIN" -e --arg invite_email "${INVITE_EMAIL}" --arg invite_token "${INVITATION_TOKEN}" '
  .invitation_token == $invite_token and
  .email == $invite_email and
  .status == "ACTIVATION_REQUIRED" and
  .provider_lifecycle_state == "PROVIDER_ACTION_REQUIRED" and
  (.provider_required_actions | index("UPDATE_PASSWORD")) != null and
  (.provider_required_actions | index("VERIFY_EMAIL")) != null and
  (.activation_handoff_url | contains("flow_context=invite_activation")) and
  (.invitation_url | contains("/invite/"))
' "${PUBLIC_INVITATION_JSON}" > /dev/null

"$JQ_BIN" -e --arg invite_email "${INVITE_EMAIL}" '
  (.members[] | select(.email == $invite_email) | .managementScope) == "external_identity" and
  (.members[] | select(.email == $invite_email) | .providerAccountStatus) == "ACTIVE" and
  (.members[] | select(.email == $invite_email) | .providerLifecycleState) == "PROVIDER_ACTION_REQUIRED" and
  ((.members[] | select(.email == $invite_email) | .providerRequiredActions) | index("UPDATE_PASSWORD")) != null and
  ((.members[] | select(.email == $invite_email) | .providerRequiredActions) | index("VERIFY_EMAIL")) != null
' "${TEAM_MEMBERS_JSON}" > /dev/null

"$JQ_BIN" -e '
  .count == 1 and
  (.users[0].status == "ACTIVE") and
  (.users[0].required_actions | index("UPDATE_PASSWORD")) != null and
  (.users[0].required_actions | index("VERIFY_EMAIL")) != null
' "${IAM_USERS_JSON}" > /dev/null

"$JQ_BIN" -e '
  .next_step == "REQUIRED_ACTIONS" and
  (.pending_required_actions | index("UPDATE_PASSWORD")) != null
' "${IAM_LOGIN_JSON}" > /dev/null

"$JQ_BIN" -e '
  .password_reference_id == null and
  (.local_password_disabled_at | type) == "string"
' "${IDENTITY_SECURITY_JSON}" > /dev/null

"$JQ_BIN" -n \
  --slurpfile config "${IDP_IAM_CONFIG_JSON}" \
  --slurpfile invite "${TEAM_INVITE_JSON}" \
  --slurpfile public_invite "${PUBLIC_INVITATION_JSON}" \
  --slurpfile team "${TEAM_MEMBERS_JSON}" \
  --slurpfile users "${IAM_USERS_JSON}" \
  --slurpfile login "${IAM_LOGIN_JSON}" \
  --slurpfile identity_security "${IDENTITY_SECURITY_JSON}" \
  '{
    iam_config: {
      realm_id: $config[0].realm_id,
      client_id: $config[0].client_id
    },
    invited_member: ($invite[0] | {
      id,
      email,
      role,
      status,
      managementScope,
      providerId,
      provisioning,
      invitation_delivery,
      activation_handoff
    }),
    public_invitation: ($public_invite[0] | {
      invitation_token,
      invitation_url,
      status,
      email,
      provider_lifecycle_state,
      provider_required_actions,
      activation_handoff_url
    }),
    roster_projection: ($team[0].members[] | select(.email == $invite[0].email) | {
      id,
      role,
      status,
      managementScope,
      providerAccountStatus,
      providerLifecycleState,
      providerRequiredActions
    }),
    iam_user: ($users[0].users[0] | {
      id,
      email,
      status,
      required_actions,
      role_ids
    }),
    first_login: ($login[0] | {
      next_step,
      pending_required_actions,
      post_login_destination
    }),
    idp_identity_state: ($identity_security[0] | {
      password_reference_id,
      local_password_disabled_at
    })
  }'
