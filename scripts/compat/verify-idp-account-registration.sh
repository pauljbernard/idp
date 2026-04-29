#!/bin/bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
CURL_BIN="${CURL_BIN:-/usr/bin/curl}"
JQ_BIN="${JQ_BIN:-$(command -v jq)}"

TMP_DIR="$(mktemp -d)"
cleanup() {
  if [[ "${KEEP_TMP_DIR:-0}" == "1" ]]; then
    echo "Preserving verifier temp directory: ${TMP_DIR}" >&2
    return
  fi
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

REGISTER_EMAIL="idp-register-$(date +%s)@example.com"
REGISTER_PASSWORD="StandaloneIAM!Register2026"
REGISTER_REQUEST_JSON="${TMP_DIR}/register-request.json"
REGISTER_RESPONSE_JSON="${TMP_DIR}/register-response.json"
LOCAL_LOGIN_JSON="${TMP_DIR}/local-login.json"
IAM_LOGIN_JSON="${TMP_DIR}/iam-login.json"
IDENTITY_STATE_FILE="apps/api-server/local-data/platform/identity-control-plane-state.json"
IDENTITY_SECURITY_JSON="${TMP_DIR}/identity-security.json"

"$JQ_BIN" -n \
  --arg email "${REGISTER_EMAIL}" \
  --arg password "${REGISTER_PASSWORD}" \
  '{
    account_type: "INDIVIDUAL",
    organization_name: "Registered Individual",
    first_name: "Standalone",
    last_name: "Registrant",
    email: $email,
    phone: "555-0100",
    password: $password,
    plan_id: "INDIVIDUAL_PRO",
    service_entitlement: "INTEGRATION_DISABLED",
    billing_cycle: "monthly",
    billing_email: $email,
    billing_contact_name: "Standalone Registrant",
    company_size: "solo",
    address: {
      line1: "100 Identity Avenue",
      city: "Boston",
      state: "MA",
      postal_code: "02110",
      country: "US"
    },
    payment_method: {
      cardholder_name: "Standalone Registrant",
      card_number: "4242424242424242",
      expiry_month: 12,
      expiry_year: 2032,
      postal_code: "02110"
    }
  }' > "${REGISTER_REQUEST_JSON}"

"$CURL_BIN" -sS -o "${REGISTER_RESPONSE_JSON}" \
  -X POST "${API_BASE_URL}/api/v1/account/register" \
  -H 'Content-Type: application/json' \
  --data @"${REGISTER_REQUEST_JSON}"

REALM_ID="$("$JQ_BIN" -r '.provisioning.realm_id' "${REGISTER_RESPONSE_JSON}")"
CLIENT_ID="$("$JQ_BIN" -r '.provisioning.client_id' "${REGISTER_RESPONSE_JSON}")"
REGISTERED_USER_ID="$("$JQ_BIN" -r '.user.id' "${REGISTER_RESPONSE_JSON}")"

"$CURL_BIN" -sS -o "${LOCAL_LOGIN_JSON}" \
  -X POST "${API_BASE_URL}/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  --data "{\"email\":\"${REGISTER_EMAIL}\",\"password\":\"${REGISTER_PASSWORD}\",\"login_mode\":\"customer_portal\"}"

"$CURL_BIN" -sS -o "${IAM_LOGIN_JSON}" \
  -X POST "${API_BASE_URL}/api/v1/iam/realms/${REALM_ID}/login" \
  -H 'Content-Type: application/json' \
  --data "{\"username\":\"${REGISTER_EMAIL}\",\"password\":\"${REGISTER_PASSWORD}\",\"client_id\":\"${CLIENT_ID}\",\"scope\":[\"openid\",\"profile\",\"email\",\"roles\",\"groups\"]}"

"$JQ_BIN" -n \
  --arg user_id "${REGISTERED_USER_ID}" \
  --slurpfile state "${IDENTITY_STATE_FILE}" \
  '$state[0].state.users_by_id[$user_id]' > "${IDENTITY_SECURITY_JSON}"

"$JQ_BIN" -e '
  .provisioning.mode == "STANDALONE_IAM" and
  .current_membership.role_id == "tenant_owner" and
  (.current_membership.permissions | index("settings.manage")) != null and
  (.provisioning.provider_user_id | type) == "string" and
  .identity.session_id == null and
  .activation_handoff.flow_context == "account_activation" and
  .activation_handoff.login_hint == .user.email and
  (.activation_handoff.login_url | contains("/login")) and
  (.activation_handoff.login_url | contains("flow_context=account_activation")) and
  (.activation_handoff.login_url | contains("login_hint="))
' "${REGISTER_RESPONSE_JSON}" > /dev/null

"$JQ_BIN" -e '
  .auth_mode == "STANDALONE_IAM_REQUIRED" and
  (.error | contains("standalone IAM"))
' "${LOCAL_LOGIN_JSON}" > /dev/null

"$JQ_BIN" -e '
  (
    .next_step == "AUTHENTICATED" and
    (.session_id | type) == "string"
  ) or (
    .next_step == "CONSENT_REQUIRED" and
    (.login_transaction_id | type) == "string" and
    ((.pending_scope_consent | type) == "array") and
    (.pending_scope_consent | length) > 0
  )
' "${IAM_LOGIN_JSON}" > /dev/null

"$JQ_BIN" -e '
  .password_reference_id == null and
  (.local_password_disabled_at | type) == "string"
' "${IDENTITY_SECURITY_JSON}" > /dev/null

"$JQ_BIN" -n \
  --slurpfile registration "${REGISTER_RESPONSE_JSON}" \
  --slurpfile local_login "${LOCAL_LOGIN_JSON}" \
  --slurpfile iam_login "${IAM_LOGIN_JSON}" \
  --slurpfile identity_security "${IDENTITY_SECURITY_JSON}" \
  '{
    registration: ($registration[0] | {
      registration_id,
      tenant: .tenant.name,
      tenant_id: .tenant.id,
      user,
      current_membership,
      identity,
      activation_handoff,
      provisioning
    }),
    customer_portal_login: ($local_login[0] | {
      error,
      auth_mode
    }),
    standalone_iam_login: ($iam_login[0] | {
      next_step,
      session_id,
      post_login_destination
    }),
    idp_identity_state: ($identity_security[0] | {
      password_reference_id,
      local_password_disabled_at
    })
  }'
