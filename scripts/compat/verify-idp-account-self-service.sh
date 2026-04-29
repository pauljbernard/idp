#!/bin/bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
UI_BASE_URL="${UI_BASE_URL:-http://localhost:3004}"
REALM_ID="${REALM_ID:-realm-idp-default}"
CLIENT_ID="${CLIENT_ID:-admin-console-demo}"
CLIENT_SECRET="${CLIENT_SECRET:-StandaloneIAM!${CLIENT_ID}!Secret2026}"
REDIRECT_URI="${REDIRECT_URI:-${UI_BASE_URL}/login/callback}"
REQUESTED_TENANT_ID="${REQUESTED_TENANT_ID:-civic-services}"
EMAIL="${EMAIL:-jordan.lee@civic.example}"
ORIGINAL_PASSWORD="${ORIGINAL_PASSWORD:-StandaloneIAM!ServiceOperator2026}"
UPDATED_PASSWORD="${UPDATED_PASSWORD:-StandaloneIAM!ServiceOperator2026-Rotated1}"
UPDATED_PHONE="${UPDATED_PHONE:-+1-202-555-0199}"
BEARER_UPDATED_PHONE="${BEARER_UPDATED_PHONE:-+1-202-555-0177}"
UPDATED_LANGUAGE="${UPDATED_LANGUAGE:-en-GB}"
UPDATED_TIMEZONE="${UPDATED_TIMEZONE:-Europe/London}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

TMP_DIR="$(mktemp -d)"
trap 'cleanup' EXIT

PRIMARY_PROVIDER_SESSION_ID=""
PRIMARY_ACCOUNT_SESSION_ID=""
PRIMARY_ACCESS_TOKEN=""
MFA_SHARED_SECRET=""
MFA_ENABLED=0
PASSWORD_CHANGED=0
PHONE_CHANGED=0
PREFERENCES_CHANGED=0
ORIGINAL_PHONE=""
ORIGINAL_PREFERENCES_FILE=""
PRIMARY_AUTH_HEADERS=()
PRIMARY_JSON_AUTH_HEADERS=()

cleanup() {
  local exit_status=$?
  set +e

  if [[ "${MFA_ENABLED}" -eq 1 && -n "${PRIMARY_ACCESS_TOKEN}" && -n "${MFA_SHARED_SECRET}" ]]; then
    local disable_request_json="${TMP_DIR}/cleanup-mfa-disable-request.json"
    jq -n --arg code "$(generate_totp_code "${MFA_SHARED_SECRET}")" '{code: $code}' > "${disable_request_json}"
    curl -sS -o /dev/null \
      -X POST "${API_BASE_URL}/api/v1/user/2fa/disable" \
      "${PRIMARY_JSON_AUTH_HEADERS[@]}" \
      --data @"${disable_request_json}" || true
  fi

  if [[ "${PASSWORD_CHANGED}" -eq 1 && -n "${PRIMARY_ACCESS_TOKEN}" ]]; then
    local password_restore_json="${TMP_DIR}/cleanup-password-restore.json"
    jq -n \
      --arg currentPassword "${UPDATED_PASSWORD}" \
      --arg newPassword "${ORIGINAL_PASSWORD}" \
      '{currentPassword: $currentPassword, newPassword: $newPassword}' \
      > "${password_restore_json}"
    curl -sS -o /dev/null \
      -X PUT "${API_BASE_URL}/api/v1/user/password" \
      "${PRIMARY_JSON_AUTH_HEADERS[@]}" \
      --data @"${password_restore_json}" || true
  fi

  if [[ "${PREFERENCES_CHANGED}" -eq 1 && -n "${PRIMARY_ACCESS_TOKEN}" && -f "${ORIGINAL_PREFERENCES_FILE}" ]]; then
    curl -sS -o /dev/null \
      -X PUT "${API_BASE_URL}/api/v1/user/preferences" \
      "${PRIMARY_JSON_AUTH_HEADERS[@]}" \
      --data @"${ORIGINAL_PREFERENCES_FILE}" || true
  fi

  if [[ "${PHONE_CHANGED}" -eq 1 && -n "${PRIMARY_ACCESS_TOKEN}" ]]; then
    local profile_restore_json="${TMP_DIR}/cleanup-profile-restore.json"
    jq -n --arg phone "${ORIGINAL_PHONE}" '{phone: $phone}' > "${profile_restore_json}"
    curl -sS -o /dev/null \
      -X PUT "${API_BASE_URL}/api/v1/user/profile" \
      "${PRIMARY_JSON_AUTH_HEADERS[@]}" \
      --data @"${profile_restore_json}" || true
  fi

  if [[ "${KEEP_TMP_DIR:-0}" == "1" || "${exit_status}" -ne 0 ]]; then
    echo "KEEP_TMP_DIR=${TMP_DIR}" >&2
    return
  fi

  rm -rf "${TMP_DIR}"
}

source "$SCRIPT_DIR/lib/idp-auth.sh"

compute_pkce_challenge() {
  printf '%s' "$1" \
    | openssl dgst -binary -sha256 \
    | openssl base64 -A \
    | tr '+/' '-_' \
    | tr -d '='
}

extract_query_param() {
  local url="$1"
  local param_name="$2"
  printf '%s' "${url}" | sed -n "s/.*[?&]${param_name}=\([^&]*\).*/\1/p"
}

generate_totp_code() {
  node - "${1}" <<'NODE'
const crypto = require('crypto');

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const secret = process.argv[2];

function base32Decode(input) {
  const sanitized = input.toUpperCase().replace(/=+$/g, '');
  let bits = '';
  for (const char of sanitized) {
    const value = alphabet.indexOf(char);
    if (value === -1) {
      throw new Error(`Invalid base32 character: ${char}`);
    }
    bits += value.toString(2).padStart(5, '0');
  }

  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

function generateTotpCode(sharedSecret, timestampMs) {
  const counter = Math.floor(timestampMs / 30000);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter), 0);
  const digest = crypto.createHmac('sha1', base32Decode(sharedSecret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, '0');
}

process.stdout.write(generateTotpCode(secret, Date.now()));
NODE
}

perform_exchange_flow() {
  local label="$1"
  local password="$2"
  local login_response_json="${TMP_DIR}/${label}-login-response.json"

  idp_login_json "${API_BASE_URL}" "${EMAIL}" "${password}" "${REQUESTED_TENANT_ID}" "standalone_iam" "${UI_BASE_URL}" > "${login_response_json}"
  printf '%s\n' "${login_response_json}"
}

issue_password_grant_token() {
  local label="$1"
  local password="$2"
  local token_response_json="${TMP_DIR}/${label}-password-grant-token.json"
  local basic_auth
  basic_auth="$(printf '%s' "${CLIENT_ID}:${CLIENT_SECRET}" | base64 | tr -d '\n')"

  curl -sS -o "${token_response_json}" \
    -X POST "${API_BASE_URL}/api/v1/iam/realms/${REALM_ID}/protocol/openid-connect/token" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    -H "Authorization: Basic ${basic_auth}" \
    --data-urlencode 'grant_type=password' \
    --data-urlencode "client_id=${CLIENT_ID}" \
    --data-urlencode "username=${EMAIL}" \
    --data-urlencode "password=${password}" \
    --data-urlencode 'scope=openid profile email roles groups'

  jq -e '.access_token != null and .token_type == "Bearer"' "${token_response_json}" > /dev/null
  printf '%s\n' "${token_response_json}"
}

PRIMARY_EXCHANGE_JSON="$(perform_exchange_flow "primary" "${ORIGINAL_PASSWORD}")"
SECONDARY_EXCHANGE_JSON="$(perform_exchange_flow "secondary" "${ORIGINAL_PASSWORD}")"
PRIMARY_ACCOUNT_SESSION_ID="$(jq -r '.iam.account_session_id // empty' "${PRIMARY_EXCHANGE_JSON}")"
PRIMARY_ACCESS_TOKEN="$(jq -r '.iam.access_token // empty' "${PRIMARY_EXCHANGE_JSON}")"
PRIMARY_AUTH_HEADERS=(-H "Authorization: Bearer ${PRIMARY_ACCESS_TOKEN}" -H "X-Tenant-ID: ${REQUESTED_TENANT_ID}")
PRIMARY_JSON_AUTH_HEADERS=("${PRIMARY_AUTH_HEADERS[@]}" -H 'Content-Type: application/json')

SECURITY_CONTEXT_JSON="${TMP_DIR}/security-context.json"
SECURITY_SESSIONS_BEFORE_JSON="${TMP_DIR}/security-sessions-before.json"
SECURITY_SESSIONS_AFTER_JSON="${TMP_DIR}/security-sessions-after.json"
PROFILE_BEFORE_JSON="${TMP_DIR}/profile-before.json"
PROFILE_AFTER_JSON="${TMP_DIR}/profile-after.json"
PREFERENCES_UPDATE_JSON="${TMP_DIR}/preferences-update.json"
PREFERENCES_AFTER_JSON="${TMP_DIR}/preferences-after.json"
IAM_PROFILE_AFTER_PHONE_JSON="${TMP_DIR}/iam-profile-after-phone.json"
IAM_PROFILE_AFTER_PREFERENCES_JSON="${TMP_DIR}/iam-profile-after-preferences.json"
PASSWORD_ROTATE_JSON="${TMP_DIR}/password-rotate.json"
MFA_BEGIN_JSON="${TMP_DIR}/mfa-begin.json"
MFA_VERIFY_REQUEST_JSON="${TMP_DIR}/mfa-verify-request.json"
MFA_VERIFY_JSON="${TMP_DIR}/mfa-verify.json"
SECURITY_CONTEXT_MFA_JSON="${TMP_DIR}/security-context-mfa.json"
MFA_DISABLE_REQUEST_JSON="${TMP_DIR}/mfa-disable-request.json"
MFA_DISABLE_JSON="${TMP_DIR}/mfa-disable.json"
BEARER_TOKEN_JSON=""
BEARER_SECURITY_CONTEXT_JSON="${TMP_DIR}/bearer-security-context.json"
BEARER_SECURITY_SESSIONS_JSON="${TMP_DIR}/bearer-security-sessions.json"
BEARER_PROFILE_JSON="${TMP_DIR}/bearer-profile.json"
BEARER_PROFILE_UPDATE_JSON="${TMP_DIR}/bearer-profile-update.json"
BEARER_PROFILE_AFTER_JSON="${TMP_DIR}/bearer-profile-after.json"

curl -sS -o "${SECURITY_CONTEXT_JSON}" \
  "${PRIMARY_AUTH_HEADERS[@]}" \
  "${API_BASE_URL}/api/v1/security/context"

jq -e '
  .provider.provider_id == "standalone-iam" and
  .provider.provider_mode == "CONTROL_PLANE_BRIDGE" and
  .provider.mfa_status == "provider_managed" and
  .session.session_transport == "bearer_session" and
  .session.provider_session_id != null and
  .session.auth_entrypoint == "provider_token_exchange" and
  .session.identity_source == "control_plane_provider" and
  .user_security.password_managed == true
' "${SECURITY_CONTEXT_JSON}" > /dev/null

PRIMARY_PROVIDER_SESSION_ID="$(jq -r '.session.provider_session_id' "${SECURITY_CONTEXT_JSON}")"

curl -sS -o "${SECURITY_SESSIONS_BEFORE_JSON}" \
  "${PRIMARY_AUTH_HEADERS[@]}" \
  "${API_BASE_URL}/api/v1/security/sessions"

jq -e --arg currentSessionId "${PRIMARY_PROVIDER_SESSION_ID}" '
  .count >= 2 and
  .current_session_id == null and
  ([.sessions[] | select(.session_id != $currentSessionId)] | length) >= 1 and
  ([.sessions[] | select(.provider_session_id != null)] | length) == .count
' "${SECURITY_SESSIONS_BEFORE_JSON}" > /dev/null

NON_CURRENT_PROVIDER_SESSION_ID="$(jq -r --arg currentSessionId "${PRIMARY_PROVIDER_SESSION_ID}" '.sessions[] | select(.session_id != $currentSessionId) | .session_id' "${SECURITY_SESSIONS_BEFORE_JSON}" | head -n 1)"

curl -sS -o /dev/null \
  -X POST \
  "${PRIMARY_AUTH_HEADERS[@]}" \
  "${API_BASE_URL}/api/v1/security/sessions/${NON_CURRENT_PROVIDER_SESSION_ID}/revoke"

curl -sS -o "${SECURITY_SESSIONS_AFTER_JSON}" \
  "${PRIMARY_AUTH_HEADERS[@]}" \
  "${API_BASE_URL}/api/v1/security/sessions"

jq -e --arg revokedSessionId "${NON_CURRENT_PROVIDER_SESSION_ID}" '
  ([.sessions[] | select(.session_id == $revokedSessionId)] | length) == 0
' "${SECURITY_SESSIONS_AFTER_JSON}" > /dev/null

curl -sS -o "${PROFILE_BEFORE_JSON}" \
  "${PRIMARY_AUTH_HEADERS[@]}" \
  "${API_BASE_URL}/api/v1/user/profile"

ORIGINAL_PHONE="$(jq -r '.phone // ""' "${PROFILE_BEFORE_JSON}")"
ORIGINAL_PREFERENCES_FILE="${TMP_DIR}/preferences-original.json"
jq '.preferences' "${PROFILE_BEFORE_JSON}" > "${ORIGINAL_PREFERENCES_FILE}"

PROFILE_UPDATE_JSON="${TMP_DIR}/profile-update.json"
jq -n --arg phone "${UPDATED_PHONE}" '{phone: $phone}' > "${PROFILE_UPDATE_JSON}"

curl -sS -o "${PROFILE_AFTER_JSON}" \
  -X PUT "${API_BASE_URL}/api/v1/user/profile" \
  "${PRIMARY_JSON_AUTH_HEADERS[@]}" \
  --data @"${PROFILE_UPDATE_JSON}"

PHONE_CHANGED=1

jq -e --arg phone "${UPDATED_PHONE}" '
  .email == "jordan.lee@civic.example" and
  .phone == $phone
' "${PROFILE_AFTER_JSON}" > /dev/null

curl -sS -o "${IAM_PROFILE_AFTER_PHONE_JSON}" \
  -H "x-iam-session-id: ${PRIMARY_ACCOUNT_SESSION_ID}" \
  "${API_BASE_URL}/api/v1/iam/realms/${REALM_ID}/account/profile"

jq -e --arg phone "${UPDATED_PHONE}" '
  .user.email == "jordan.lee@civic.example" and
  .profile_attributes.phone_number == $phone
' "${IAM_PROFILE_AFTER_PHONE_JSON}" > /dev/null

jq \
  --arg language "${UPDATED_LANGUAGE}" \
  --arg timezone "${UPDATED_TIMEZONE}" \
  '.preferences | .language = $language | .timezone = $timezone' \
  "${PROFILE_BEFORE_JSON}" \
  > "${PREFERENCES_UPDATE_JSON}"

curl -sS -o "${PREFERENCES_AFTER_JSON}" \
  -X PUT "${API_BASE_URL}/api/v1/user/preferences" \
  "${PRIMARY_JSON_AUTH_HEADERS[@]}" \
  --data @"${PREFERENCES_UPDATE_JSON}"

PREFERENCES_CHANGED=1

jq -e --arg language "${UPDATED_LANGUAGE}" --arg timezone "${UPDATED_TIMEZONE}" '
  .language == $language and
  .timezone == $timezone
' "${PREFERENCES_AFTER_JSON}" > /dev/null

curl -sS -o "${IAM_PROFILE_AFTER_PREFERENCES_JSON}" \
  -H "x-iam-session-id: ${PRIMARY_ACCOUNT_SESSION_ID}" \
  "${API_BASE_URL}/api/v1/iam/realms/${REALM_ID}/account/profile"

jq -e --arg language "${UPDATED_LANGUAGE}" --arg timezone "${UPDATED_TIMEZONE}" '
  .profile_attributes.locale == $language and
  .profile_attributes.time_zone == $timezone
' "${IAM_PROFILE_AFTER_PREFERENCES_JSON}" > /dev/null

PASSWORD_UPDATE_REQUEST_JSON="${TMP_DIR}/password-update-request.json"
jq -n \
  --arg currentPassword "${ORIGINAL_PASSWORD}" \
  --arg newPassword "${UPDATED_PASSWORD}" \
  '{currentPassword: $currentPassword, newPassword: $newPassword}' \
  > "${PASSWORD_UPDATE_REQUEST_JSON}"

curl -sS -o "${PASSWORD_ROTATE_JSON}" \
  -X PUT "${API_BASE_URL}/api/v1/user/password" \
  "${PRIMARY_JSON_AUTH_HEADERS[@]}" \
  --data @"${PASSWORD_UPDATE_REQUEST_JSON}"

PASSWORD_CHANGED=1

jq -e '.security.passwordLastChanged != null' "${PASSWORD_ROTATE_JSON}" > /dev/null

UPDATED_PASSWORD_EXCHANGE_JSON="$(perform_exchange_flow "updated-password" "${UPDATED_PASSWORD}")"
jq -e '
  .authenticated == true and
  .current_user.email == "jordan.lee@civic.example" and
  .identity.provider.provider_id == "standalone-iam"
' "${UPDATED_PASSWORD_EXCHANGE_JSON}" > /dev/null

curl -sS -o "${MFA_BEGIN_JSON}" \
  -X POST "${API_BASE_URL}/api/v1/user/2fa/enable" \
  "${PRIMARY_JSON_AUTH_HEADERS[@]}" \
  --data '{}'

jq -e '
  .verificationRequired == true and
  .enrollmentId != null and
  .sharedSecret != null and
  (.backupCodes | length) >= 1 and
  .security.twoFactorEnabled == false
' "${MFA_BEGIN_JSON}" > /dev/null

MFA_SHARED_SECRET="$(jq -r '.sharedSecret' "${MFA_BEGIN_JSON}")"
MFA_ENROLLMENT_ID="$(jq -r '.enrollmentId' "${MFA_BEGIN_JSON}")"

jq -n \
  --arg enrollment_id "${MFA_ENROLLMENT_ID}" \
  --arg verification_code "$(generate_totp_code "${MFA_SHARED_SECRET}")" \
  '{enrollment_id: $enrollment_id, verification_code: $verification_code}' \
  > "${MFA_VERIFY_REQUEST_JSON}"

curl -sS -o "${MFA_VERIFY_JSON}" \
  -X POST "${API_BASE_URL}/api/v1/user/2fa/enable" \
  "${PRIMARY_JSON_AUTH_HEADERS[@]}" \
  --data @"${MFA_VERIFY_REQUEST_JSON}"

MFA_ENABLED=1

jq -e '
  .verificationRequired == false and
  .security.twoFactorEnabled == true
' "${MFA_VERIFY_JSON}" > /dev/null

curl -sS -o "${SECURITY_CONTEXT_MFA_JSON}" \
  "${PRIMARY_AUTH_HEADERS[@]}" \
  "${API_BASE_URL}/api/v1/security/context"

jq -e '
  .user_security.two_factor_enrolled == true and
  .provider.mfa_status == "provider_managed"
' "${SECURITY_CONTEXT_MFA_JSON}" > /dev/null

jq -n --arg code "$(generate_totp_code "${MFA_SHARED_SECRET}")" '{code: $code}' > "${MFA_DISABLE_REQUEST_JSON}"

curl -sS -o "${MFA_DISABLE_JSON}" \
  -X POST "${API_BASE_URL}/api/v1/user/2fa/disable" \
  "${PRIMARY_JSON_AUTH_HEADERS[@]}" \
  --data @"${MFA_DISABLE_REQUEST_JSON}"

MFA_ENABLED=0

jq -e '.security.twoFactorEnabled == false' "${MFA_DISABLE_JSON}" > /dev/null

PASSWORD_RESTORE_REQUEST_JSON="${TMP_DIR}/password-restore-request.json"
jq -n \
  --arg currentPassword "${UPDATED_PASSWORD}" \
  --arg newPassword "${ORIGINAL_PASSWORD}" \
  '{currentPassword: $currentPassword, newPassword: $newPassword}' \
  > "${PASSWORD_RESTORE_REQUEST_JSON}"

curl -sS -o /dev/null \
  -X PUT "${API_BASE_URL}/api/v1/user/password" \
  "${PRIMARY_JSON_AUTH_HEADERS[@]}" \
  --data @"${PASSWORD_RESTORE_REQUEST_JSON}"

PASSWORD_CHANGED=0

curl -sS -o /dev/null \
  -X PUT "${API_BASE_URL}/api/v1/user/preferences" \
  "${PRIMARY_JSON_AUTH_HEADERS[@]}" \
  --data @"${ORIGINAL_PREFERENCES_FILE}"

PREFERENCES_CHANGED=0

PROFILE_RESTORE_JSON="${TMP_DIR}/profile-restore.json"
jq -n --arg phone "${ORIGINAL_PHONE}" '{phone: $phone}' > "${PROFILE_RESTORE_JSON}"

curl -sS -o /dev/null \
  -X PUT "${API_BASE_URL}/api/v1/user/profile" \
  "${PRIMARY_JSON_AUTH_HEADERS[@]}" \
  --data @"${PROFILE_RESTORE_JSON}"

PHONE_CHANGED=0

RESTORED_PASSWORD_EXCHANGE_JSON="$(perform_exchange_flow "restored-password" "${ORIGINAL_PASSWORD}")"
jq -e '
  .authenticated == true and
  .current_user.email == "jordan.lee@civic.example" and
  .identity.provider.provider_id == "standalone-iam"
' "${RESTORED_PASSWORD_EXCHANGE_JSON}" > /dev/null

BEARER_TOKEN_JSON="$(issue_password_grant_token "bearer" "${ORIGINAL_PASSWORD}")"
BEARER_ACCESS_TOKEN="$(jq -r '.access_token' "${BEARER_TOKEN_JSON}")"

curl -sS -o "${BEARER_SECURITY_CONTEXT_JSON}" \
  -H "Authorization: Bearer ${BEARER_ACCESS_TOKEN}" \
  -H "X-Tenant-ID: ${REQUESTED_TENANT_ID}" \
  "${API_BASE_URL}/api/v1/security/context"

jq -e '
  .provider.provider_id == "standalone-iam" and
  .provider.provider_mode == "CONTROL_PLANE_BRIDGE" and
  .session.session_transport == "bearer_session" and
  .session.auth_entrypoint == "provider_token_exchange" and
  .session.provider_session_id != null and
  .user_security.password_managed == true
' "${BEARER_SECURITY_CONTEXT_JSON}" > /dev/null

curl -sS -o "${BEARER_SECURITY_SESSIONS_JSON}" \
  -H "Authorization: Bearer ${BEARER_ACCESS_TOKEN}" \
  -H "X-Tenant-ID: ${REQUESTED_TENANT_ID}" \
  "${API_BASE_URL}/api/v1/security/sessions"

jq -e '
  .count >= 1 and
  .current_session_id == null and
  ([.sessions[] | select(.provider_session_id != null)] | length) == .count
' "${BEARER_SECURITY_SESSIONS_JSON}" > /dev/null

curl -sS -o "${BEARER_PROFILE_JSON}" \
  -H "Authorization: Bearer ${BEARER_ACCESS_TOKEN}" \
  -H "X-Tenant-ID: ${REQUESTED_TENANT_ID}" \
  "${API_BASE_URL}/api/v1/user/profile"

jq -e '
  .email == "jordan.lee@civic.example" and
  .role == "operator"
' "${BEARER_PROFILE_JSON}" > /dev/null

jq -n --arg phone "${BEARER_UPDATED_PHONE}" '{phone: $phone}' > "${BEARER_PROFILE_UPDATE_JSON}"

curl -sS -o "${BEARER_PROFILE_AFTER_JSON}" \
  -X PUT "${API_BASE_URL}/api/v1/user/profile" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${BEARER_ACCESS_TOKEN}" \
  -H "X-Tenant-ID: ${REQUESTED_TENANT_ID}" \
  --data @"${BEARER_PROFILE_UPDATE_JSON}"

PHONE_CHANGED=1

jq -e --arg phone "${BEARER_UPDATED_PHONE}" '
  .email == "jordan.lee@civic.example" and
  .phone == $phone and
  .role == "operator"
' "${BEARER_PROFILE_AFTER_JSON}" > /dev/null

curl -sS -o /dev/null \
  -X PUT "${API_BASE_URL}/api/v1/user/profile" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${BEARER_ACCESS_TOKEN}" \
  -H "X-Tenant-ID: ${REQUESTED_TENANT_ID}" \
  --data @"${PROFILE_RESTORE_JSON}"

PHONE_CHANGED=0

jq -n \
  --slurpfile securityContext "${SECURITY_CONTEXT_JSON}" \
  --slurpfile sessionsBefore "${SECURITY_SESSIONS_BEFORE_JSON}" \
  --slurpfile profileAfter "${PROFILE_AFTER_JSON}" \
  --slurpfile preferencesAfter "${PREFERENCES_AFTER_JSON}" \
  --slurpfile mfaBegin "${MFA_BEGIN_JSON}" \
  --slurpfile mfaVerify "${MFA_VERIFY_JSON}" \
  --slurpfile bearerSecurityContext "${BEARER_SECURITY_CONTEXT_JSON}" \
  --slurpfile bearerSecuritySessions "${BEARER_SECURITY_SESSIONS_JSON}" \
  --slurpfile bearerProfile "${BEARER_PROFILE_AFTER_JSON}" \
  '{
    provider_session_context: {
      auth_entrypoint: $securityContext[0].session.auth_entrypoint,
      provider_session_id: $securityContext[0].session.provider_session_id,
      identity_source: $securityContext[0].session.identity_source,
      session_transport: $securityContext[0].session.session_transport
    },
    provider_session_count_before_revoke: $sessionsBefore[0].count,
    updated_profile: {
      email: $profileAfter[0].email,
      phone: $profileAfter[0].phone
    },
    updated_preferences: {
      language: $preferencesAfter[0].language,
      timezone: $preferencesAfter[0].timezone
    },
    mfa_enrollment: {
      verification_required: $mfaBegin[0].verificationRequired,
      backup_code_count: ($mfaBegin[0].backupCodes | length),
      enabled_after_verify: $mfaVerify[0].security.twoFactorEnabled
    },
    bearer_token_access: {
      auth_entrypoint: $bearerSecurityContext[0].session.auth_entrypoint,
      session_transport: $bearerSecurityContext[0].session.session_transport,
      provider_session_id: $bearerSecurityContext[0].session.provider_session_id,
      visible_account_session_count: $bearerSecuritySessions[0].count,
      current_account_session_id: $bearerSecuritySessions[0].current_session_id,
      updated_profile: {
        email: $bearerProfile[0].email,
        phone: $bearerProfile[0].phone,
        role: $bearerProfile[0].role
      }
    }
  }'
