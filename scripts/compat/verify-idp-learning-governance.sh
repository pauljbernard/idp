#!/usr/bin/env bash

set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@idp.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-StandaloneIAM!SuperAdmin2026}"
EDUCATION_REALM_ID="${EDUCATION_REALM_ID:-realm-education-validation}"
EDUCATION_ADMIN_USERNAME="${EDUCATION_ADMIN_USERNAME:-education.admin}"
EDUCATION_ADMIN_PASSWORD="${EDUCATION_ADMIN_PASSWORD:-StandaloneIAM!education-admin!2026}"
LEARNER_USERNAME="${LEARNER_USERNAME:-education.learner}"
LEARNER_PASSWORD="${LEARNER_PASSWORD:-StandaloneIAM!education-learner!2026}"
GUARDIAN_USERNAME="${GUARDIAN_USERNAME:-education.guardian}"
GUARDIAN_PASSWORD="${GUARDIAN_PASSWORD:-StandaloneIAM!education-guardian!2026}"
EDUCATION_OIDC_CLIENT_ID="${EDUCATION_OIDC_CLIENT_ID:-admin-console-demo}"
EDUCATION_BROKER_ALIAS="${EDUCATION_BROKER_ALIAS:-north-county-oidc}"
EDUCATION_BROKER_EXTERNAL_USERNAME="${EDUCATION_BROKER_EXTERNAL_USERNAME:-guardian.portal}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

AUTH_CONFIG_JSON="${TMP_DIR}/auth-config.json"
TOKEN_RESPONSE_JSON="${TMP_DIR}/admin-token.json"

resolve_auth_config() {
  curl -sS -o "${AUTH_CONFIG_JSON}" "${API_BASE_URL}/api/v1/auth/iam/config"
  REALM_ID="$(jq -r '.realm_id' "${AUTH_CONFIG_JSON}")"
  CLIENT_ID="$(jq -r '.client_id' "${AUTH_CONFIG_JSON}")"
  CLIENT_SECRET="StandaloneIAM!${CLIENT_ID}!Secret2026"
}

issue_admin_token() {
  local basic_auth
  basic_auth="$(printf '%s' "${CLIENT_ID}:${CLIENT_SECRET}" | base64 | tr -d '\n')"

  curl -sS -o "${TOKEN_RESPONSE_JSON}" \
    -X POST "${API_BASE_URL}/api/v1/iam/realms/${REALM_ID}/protocol/openid-connect/token" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    -H "Authorization: Basic ${basic_auth}" \
    --data-urlencode 'grant_type=password' \
    --data-urlencode "client_id=${CLIENT_ID}" \
    --data-urlencode "username=${ADMIN_EMAIL}" \
    --data-urlencode "password=${ADMIN_PASSWORD}" \
    --data-urlencode 'scope=openid profile email roles groups'

  jq -e '.access_token != null and .token_type == "Bearer"' "${TOKEN_RESPONSE_JSON}" > /dev/null
  ADMIN_ACCESS_TOKEN="$(jq -r '.access_token' "${TOKEN_RESPONSE_JSON}")"
}

authorized_get() {
  local path="$1"
  local output_json="$2"

  local status
  status="$(
    curl -sS -o "${output_json}" -w '%{http_code}' \
      "${API_BASE_URL}${path}" \
      -H "Authorization: Bearer ${ADMIN_ACCESS_TOKEN}"
  )"

  if [[ "${status}" != "200" ]]; then
    echo "GET ${path} failed with status ${status}" >&2
    cat "${output_json}" >&2
    exit 1
  fi
}

authorized_post_json() {
  local path="$1"
  local request_json="$2"
  local output_json="$3"

  local status
  status="$(
    curl -sS -o "${output_json}" -w '%{http_code}' \
      -X POST "${API_BASE_URL}${path}" \
      -H "Authorization: Bearer ${ADMIN_ACCESS_TOKEN}" \
      -H 'Content-Type: application/json' \
      --data-raw "${request_json}"
  )"

  if [[ "${status}" != "200" ]]; then
    echo "POST ${path} failed with status ${status}" >&2
    cat "${output_json}" >&2
    exit 1
  fi
}

authorized_post_json_created() {
  local path="$1"
  local request_json="$2"
  local output_json="$3"

  local status
  status="$(
    curl -sS -o "${output_json}" -w '%{http_code}' \
      -X POST "${API_BASE_URL}${path}" \
      -H "Authorization: Bearer ${ADMIN_ACCESS_TOKEN}" \
      -H 'Content-Type: application/json' \
      --data-raw "${request_json}"
  )"

  if [[ "${status}" != "201" ]]; then
    echo "POST ${path} failed with status ${status}" >&2
    cat "${output_json}" >&2
    exit 1
  fi
}

authorized_put_json() {
  local path="$1"
  local request_json="$2"
  local output_json="$3"

  local status
  status="$(
    curl -sS -o "${output_json}" -w '%{http_code}' \
      -X PUT "${API_BASE_URL}${path}" \
      -H "Authorization: Bearer ${ADMIN_ACCESS_TOKEN}" \
      -H 'Content-Type: application/json' \
      --data-raw "${request_json}"
  )"

  if [[ "${status}" != "200" ]]; then
    echo "PUT ${path} failed with status ${status}" >&2
    cat "${output_json}" >&2
    exit 1
  fi
}

login_account_session() {
  local username="$1"
  local password="$2"
  local output_json="$3"

  local status
  status="$(
    curl -sS -o "${output_json}" -w '%{http_code}' \
      -X POST "${API_BASE_URL}/api/v1/iam/realms/${EDUCATION_REALM_ID}/login" \
      -H 'Content-Type: application/json' \
      --data-raw "{\"username\":\"${username}\",\"password\":\"${password}\",\"scope\":[\"openid\",\"profile\",\"email\"]}"
  )"

  if [[ "${status}" != "200" ]]; then
    echo "Account login for ${username} failed with status ${status}" >&2
    cat "${output_json}" >&2
    exit 1
  fi

  jq -e '.next_step == "AUTHENTICATED" and .session_id != null' "${output_json}" > /dev/null
}

session_get() {
  local session_id="$1"
  local path="$2"
  local output_json="$3"

  local status
  status="$(
    curl -sS -o "${output_json}" -w '%{http_code}' \
      "${API_BASE_URL}${path}" \
      -H "x-iam-session-id: ${session_id}"
  )"

  if [[ "${status}" != "200" ]]; then
    echo "Session GET ${path} failed with status ${status}" >&2
    cat "${output_json}" >&2
    exit 1
  fi
}

session_post_json_created() {
  local session_id="$1"
  local path="$2"
  local request_json="$3"
  local output_json="$4"

  local status
  status="$(
    curl -sS -o "${output_json}" -w '%{http_code}' \
      -X POST "${API_BASE_URL}${path}" \
      -H "x-iam-session-id: ${session_id}" \
      -H 'Content-Type: application/json' \
      --data-raw "${request_json}"
  )"

  if [[ "${status}" != "201" ]]; then
    echo "Session POST ${path} failed with status ${status}" >&2
    cat "${output_json}" >&2
    exit 1
  fi
}

session_post_json() {
  local session_id="$1"
  local path="$2"
  local request_json="$3"
  local output_json="$4"

  local status
  status="$(
    curl -sS -o "${output_json}" -w '%{http_code}' \
      -X POST "${API_BASE_URL}${path}" \
      -H "x-iam-session-id: ${session_id}" \
      -H 'Content-Type: application/json' \
      --data-raw "${request_json}"
  )"

  if [[ "${status}" != "200" ]]; then
    echo "Session POST ${path} failed with status ${status}" >&2
    cat "${output_json}" >&2
    exit 1
  fi
}

verify_governance_endpoints() {
  local posture_json="${TMP_DIR}/realm-posture-presets.json"
  local privacy_json="${TMP_DIR}/identity-privacy-policies.json"
  local delegated_json="${TMP_DIR}/delegated-relationships.json"
  local delegated_consents_json="${TMP_DIR}/delegated-consents.json"
  local portable_json="${TMP_DIR}/portable-identities.json"

  authorized_get '/api/v1/iam/realm-posture-presets' "${posture_json}"
  authorized_get '/api/v1/iam/identity-privacy-policies' "${privacy_json}"
  authorized_get '/api/v1/iam/delegated-relationships' "${delegated_json}"
  authorized_get '/api/v1/iam/delegated-consents' "${delegated_consents_json}"
  authorized_get '/api/v1/iam/portable-identities' "${portable_json}"

  jq -e '
    (.realm_posture_presets | length) >= 5 and
    any(.realm_posture_presets[]; .id == "realm-posture-institutional-sso") and
    any(.realm_posture_presets[]; .id == "realm-posture-minor-serving")
  ' "${posture_json}" > /dev/null

  jq -e '
    (.identity_privacy_policies | length) >= 4 and
    any(.identity_privacy_policies[]; .id == "privacy-policy-protected" and .consent_required == true)
  ' "${privacy_json}" > /dev/null

  jq -e '
    (.delegated_relationships | length) >= 1 and
    any(.delegated_relationships[]; .relationship_kind == "GUARDIAN")
  ' "${delegated_json}" > /dev/null

  jq -e '
    (.delegated_consents | length) >= 1 and
    any(.delegated_consents[]; .relationship_id == "relationship-education-guardian" and (.scope_names | index("profile.read")) != null)
  ' "${delegated_consents_json}" > /dev/null

  jq -e '
    (.portable_identities | length) >= 1 and
    any(.portable_identities[]; .status == "ACTIVE")
  ' "${portable_json}" > /dev/null
}

verify_federation_packaging_endpoints() {
  local trust_json="${TMP_DIR}/federation-trust-stores.json"
  local mapping_json="${TMP_DIR}/federation-mapping-profiles.json"

  authorized_get '/api/v1/iam/federation-trust-stores' "${trust_json}"
  authorized_get '/api/v1/iam/federation-mapping-profiles' "${mapping_json}"

  jq -e '
    (.federation_trust_stores | length) >= 3 and
    any(.federation_trust_stores[]; .id == "trust-store-institutional-oidc" and (.supported_protocols | index("OIDC")) != null) and
    any(.federation_trust_stores[]; .id == "trust-store-institutional-saml" and (.supported_protocols | index("SAML")) != null) and
    any(.federation_trust_stores[]; .id == "trust-store-education-district-oidc" and .realm_id == "realm-education-validation")
  ' "${trust_json}" > /dev/null

  jq -e '
    (.federation_mapping_profiles | length) >= 3 and
    any(.federation_mapping_profiles[]; .id == "mapping-profile-institutional-oidc" and .protocol == "OIDC") and
    any(.federation_mapping_profiles[]; .id == "mapping-profile-institutional-saml" and .protocol == "SAML") and
    any(.federation_mapping_profiles[]; .id == "mapping-profile-education-district-oidc" and (.attribute_release_policy_ids | index("privacy-policy-confidential")) != null)
  ' "${mapping_json}" > /dev/null
}

verify_federation_claim_preview() {
  local userinfo_preview_json="${TMP_DIR}/federation-claim-preview-userinfo.json"
  local access_token_preview_json="${TMP_DIR}/federation-claim-preview-access-token.json"

  authorized_post_json \
    '/api/v1/iam/federation-claim-preview' \
    '{"realm_id":"realm-education-validation","provider_alias":"north-county-oidc","mapping_profile_id":"mapping-profile-education-district-oidc","external_username_or_email":"guardian.portal","target":"USERINFO"}' \
    "${userinfo_preview_json}"

  authorized_post_json \
    '/api/v1/iam/federation-claim-preview' \
    '{"realm_id":"realm-education-validation","provider_alias":"north-county-oidc","mapping_profile_id":"mapping-profile-education-district-oidc","external_username_or_email":"guardian.portal","target":"ACCESS_TOKEN","requested_purpose":"education_support","consent_granted":true}' \
    "${access_token_preview_json}"

  jq -e '
    .provider_alias == "north-county-oidc" and
    .target == "USERINFO" and
    .consent_granted == false and
    (.resolved_release_policy_ids | index("privacy-policy-confidential")) != null and
    any(.released_claims[]; .target_claim == "preferred_username" and .value == "guardian.portal") and
    any(.suppressed_claims[]; .target_claim == "email" and .reason == "CONSENT_REQUIRED") and
    any(.suppressed_claims[]; .target_claim == "groups" and .reason == "USERINFO_EXCLUDED") and
    any(.suppressed_claims[]; .target_claim == "realm_roles" and .reason == "USERINFO_EXCLUDED")
  ' "${userinfo_preview_json}" > /dev/null

  jq -e '
    .provider_alias == "north-county-oidc" and
    .target == "ACCESS_TOKEN" and
    .requested_purpose == "education_support" and
    .consent_granted == true and
    any(.released_claims[]; .target_claim == "email" and .value == "guardian.portal@north-county-edu.example") and
    any(.released_claims[]; .target_claim == "groups" and (.value | index("family-guardians")) != null) and
    any(.released_claims[]; .target_claim == "realm_roles" and (.value | index("guardian")) != null)
  ' "${access_token_preview_json}" > /dev/null
}

verify_delegated_authorization_enforcement() {
  local guardian_read_json="${TMP_DIR}/guardian-read.json"
  local guardian_manage_json="${TMP_DIR}/guardian-manage.json"
  local guardian_wrong_purpose_json="${TMP_DIR}/guardian-wrong-purpose.json"
  local guardian_manage_granted_json="${TMP_DIR}/guardian-manage-granted.json"
  local delegated_consent_created_json="${TMP_DIR}/delegated-consent-created.json"
  local delegated_consent_revoked_json="${TMP_DIR}/delegated-consent-revoked.json"
  local proxy_read_json="${TMP_DIR}/proxy-read.json"

  authorized_post_json \
    '/api/v1/iam/authz/evaluate' \
    '{"realm_id":"realm-education-validation","resource_server_id":"authz-rs-education-demo","subject_kind":"USER","subject_id":"iam-user-education-guardian","resource_id":"authz-resource-education-learner-profile","requested_purpose":"education_support","requested_scope_names":["profile.read"]}' \
    "${guardian_read_json}"

  authorized_post_json \
    '/api/v1/iam/authz/evaluate' \
    '{"realm_id":"realm-education-validation","resource_server_id":"authz-rs-education-demo","subject_kind":"USER","subject_id":"iam-user-education-guardian","resource_id":"authz-resource-education-learner-profile","requested_purpose":"education_support","requested_scope_names":["profile.manage"]}' \
    "${guardian_manage_json}"

  authorized_post_json \
    '/api/v1/iam/authz/evaluate' \
    '{"realm_id":"realm-education-validation","resource_server_id":"authz-rs-education-demo","subject_kind":"USER","subject_id":"iam-user-education-guardian","resource_id":"authz-resource-education-learner-profile","requested_purpose":"administration","requested_scope_names":["profile.read"]}' \
    "${guardian_wrong_purpose_json}"

  authorized_post_json \
    '/api/v1/iam/authz/evaluate' \
    '{"realm_id":"realm-education-validation","resource_server_id":"authz-rs-education-demo","subject_kind":"USER","subject_id":"iam-user-education-admin","resource_id":"authz-resource-education-admin-workspace","requested_purpose":"administration","requested_scope_names":["admin.read"]}' \
    "${proxy_read_json}"

  authorized_post_json_created \
    '/api/v1/iam/delegated-consents' \
    '{"realm_id":"realm-education-validation","relationship_id":"relationship-education-guardian","scope_names":["profile.manage"],"purpose_names":["education_support"],"notes":["Verifier grant for guardian manage validation."]}' \
    "${delegated_consent_created_json}"

  local delegated_consent_id
  delegated_consent_id="$(jq -r '.id' "${delegated_consent_created_json}")"
  if [[ -z "${delegated_consent_id}" || "${delegated_consent_id}" == "null" ]]; then
    echo "Delegated consent create response did not include an id" >&2
    cat "${delegated_consent_created_json}" >&2
    exit 1
  fi

  authorized_post_json \
    '/api/v1/iam/authz/evaluate' \
    '{"realm_id":"realm-education-validation","resource_server_id":"authz-rs-education-demo","subject_kind":"USER","subject_id":"iam-user-education-guardian","resource_id":"authz-resource-education-learner-profile","requested_purpose":"education_support","requested_scope_names":["profile.manage"]}' \
    "${guardian_manage_granted_json}"

  authorized_put_json \
    "/api/v1/iam/delegated-consents/${delegated_consent_id}" \
    '{"status":"REVOKED","notes":["Verifier revoke for guardian manage validation."]}' \
    "${delegated_consent_revoked_json}"

  authorized_post_json \
    '/api/v1/iam/authz/evaluate' \
    '{"realm_id":"realm-education-validation","resource_server_id":"authz-rs-education-demo","subject_kind":"USER","subject_id":"iam-user-education-guardian","resource_id":"authz-resource-education-learner-profile","requested_purpose":"education_support","requested_scope_names":["profile.manage"]}' \
    "${guardian_manage_json}"

  jq -e '
    .allowed == true and
    .requested_purpose == "education_support" and
    (.granted_scope_names | index("profile.read")) != null and
    (.matched_policy_ids | index("authz-policy-education-profile-owner")) != null and
    (.reason | contains("delegated relationship context"))
  ' "${guardian_read_json}" > /dev/null

  jq -e '
    .allowed == true and
    (.granted_scope_names | index("profile.manage")) != null and
    (.reason | contains("delegated relationship context"))
  ' "${guardian_manage_granted_json}" > /dev/null

  jq -e '
    .allowed == false and
    (.granted_scope_names | length) == 0
  ' "${guardian_manage_json}" > /dev/null

  jq -e '
    .allowed == false and
    .requested_purpose == "administration" and
    (.granted_scope_names | length) == 0
  ' "${guardian_wrong_purpose_json}" > /dev/null

  jq -e '
    .allowed == true and
    .requested_purpose == "administration" and
    (.granted_scope_names | index("admin.read")) != null and
    (.reason | contains("delegated relationship context"))
  ' "${proxy_read_json}" > /dev/null

  jq -e '
    .status == "REVOKED" and
    .revoked_at != null
  ' "${delegated_consent_revoked_json}" > /dev/null
}

verify_account_delegated_consent_management() {
  local learner_login_json="${TMP_DIR}/learner-login.json"
  local guardian_login_json="${TMP_DIR}/guardian-login.json"
  local learner_relationships_json="${TMP_DIR}/learner-relationships.json"
  local guardian_relationships_json="${TMP_DIR}/guardian-relationships.json"
  local learner_consents_before_json="${TMP_DIR}/learner-consents-before.json"
  local guardian_consents_json="${TMP_DIR}/guardian-consents.json"
  local learner_consent_created_json="${TMP_DIR}/learner-consent-created.json"
  local learner_consent_revoked_json="${TMP_DIR}/learner-consent-revoked.json"

  login_account_session "${LEARNER_USERNAME}" "${LEARNER_PASSWORD}" "${learner_login_json}"
  login_account_session "${GUARDIAN_USERNAME}" "${GUARDIAN_PASSWORD}" "${guardian_login_json}"

  local learner_session_id
  local guardian_session_id
  learner_session_id="$(jq -r '.session_id' "${learner_login_json}")"
  guardian_session_id="$(jq -r '.session_id' "${guardian_login_json}")"

  session_get "${learner_session_id}" "/api/v1/iam/realms/${EDUCATION_REALM_ID}/account/delegated-relationships" "${learner_relationships_json}"
  session_get "${guardian_session_id}" "/api/v1/iam/realms/${EDUCATION_REALM_ID}/account/delegated-relationships" "${guardian_relationships_json}"
  session_get "${learner_session_id}" "/api/v1/iam/realms/${EDUCATION_REALM_ID}/account/delegated-consents?relationship_id=relationship-education-guardian" "${learner_consents_before_json}"

  session_post_json_created \
    "${learner_session_id}" \
    "/api/v1/iam/realms/${EDUCATION_REALM_ID}/account/delegated-consents" \
    '{"relationship_id":"relationship-education-guardian","scope_names":["profile.manage"],"purpose_names":["education_support"],"notes":["Account-console verifier grant for guardian manage validation."]}' \
    "${learner_consent_created_json}"

  local learner_consent_id
  learner_consent_id="$(jq -r '.id' "${learner_consent_created_json}")"
  if [[ -z "${learner_consent_id}" || "${learner_consent_id}" == "null" ]]; then
    echo "Learner delegated consent create response did not include an id" >&2
    cat "${learner_consent_created_json}" >&2
    exit 1
  fi

  session_get "${guardian_session_id}" "/api/v1/iam/realms/${EDUCATION_REALM_ID}/account/delegated-consents?relationship_id=relationship-education-guardian" "${guardian_consents_json}"

  session_post_json \
    "${learner_session_id}" \
    "/api/v1/iam/realms/${EDUCATION_REALM_ID}/account/delegated-consents/${learner_consent_id}/revoke" \
    '{"notes":["Account-console verifier revoke for guardian manage validation."]}' \
    "${learner_consent_revoked_json}"

  jq -e '
    any(.delegated_relationships[]; .id == "relationship-education-guardian" and .current_party == "PRINCIPAL" and .can_manage_consents == true and .counterpart_user.id == "iam-user-education-guardian")
  ' "${learner_relationships_json}" > /dev/null

  jq -e '
    any(.delegated_relationships[]; .id == "relationship-education-guardian" and .current_party == "DELEGATE" and .can_manage_consents == false and .counterpart_user.id == "iam-user-education-learner")
  ' "${guardian_relationships_json}" > /dev/null

  jq -e '
    .current_party == "PRINCIPAL" and
    .can_manage == true and
    (.scope_names | index("profile.manage")) != null and
    .relationship_id == "relationship-education-guardian"
  ' "${learner_consent_created_json}" > /dev/null

  jq -e '
    any(.delegated_consents[]; .id == "'"${learner_consent_id}"'" and .current_party == "DELEGATE" and .can_manage == false and (.scope_names | index("profile.manage")) != null)
  ' "${guardian_consents_json}" > /dev/null

  jq -e '
    .status == "REVOKED" and
    .revoked_at != null and
    .current_party == "PRINCIPAL"
  ' "${learner_consent_revoked_json}" > /dev/null
}

verify_purpose_aware_oidc_claim_release() {
  local token_json="${TMP_DIR}/education-purpose-token.json"
  local userinfo_json="${TMP_DIR}/education-purpose-userinfo.json"
  local introspect_json="${TMP_DIR}/education-purpose-introspect.json"
  local refresh_json="${TMP_DIR}/education-purpose-refresh.json"
  local refreshed_introspect_json="${TMP_DIR}/education-purpose-refreshed-introspect.json"

  local status
  status="$(
    curl -sS -o "${token_json}" -w '%{http_code}' \
      -X POST "${API_BASE_URL}/api/v1/iam/realms/${EDUCATION_REALM_ID}/protocol/openid-connect/token" \
      -H 'Content-Type: application/x-www-form-urlencoded' \
      --data-urlencode 'grant_type=password' \
      --data-urlencode "client_id=${EDUCATION_OIDC_CLIENT_ID}" \
      --data-urlencode "username=${EDUCATION_ADMIN_USERNAME}" \
      --data-urlencode "password=${EDUCATION_ADMIN_PASSWORD}" \
      --data-urlencode 'scope=openid profile email education_profile' \
      --data-urlencode 'requested_purpose=operations'
  )"

  if [[ "${status}" != "200" ]]; then
    echo "Purpose-aware token issue failed with status ${status}" >&2
    cat "${token_json}" >&2
    exit 1
  fi

  local access_token
  local refresh_token
  access_token="$(jq -r '.access_token' "${token_json}")"
  refresh_token="$(jq -r '.refresh_token' "${token_json}")"
  if [[ -z "${access_token}" || "${access_token}" == "null" || -z "${refresh_token}" || "${refresh_token}" == "null" ]]; then
    echo "Purpose-aware token issue did not return both access and refresh tokens" >&2
    cat "${token_json}" >&2
    exit 1
  fi

  status="$(
    curl -sS -o "${userinfo_json}" -w '%{http_code}' \
      "${API_BASE_URL}/api/v1/iam/realms/${EDUCATION_REALM_ID}/protocol/openid-connect/userinfo" \
      -H "Authorization: Bearer ${access_token}"
  )"

  if [[ "${status}" != "200" ]]; then
    echo "Purpose-aware userinfo failed with status ${status}" >&2
    cat "${userinfo_json}" >&2
    exit 1
  fi

  status="$(
    curl -sS -o "${introspect_json}" -w '%{http_code}' \
      -X POST "${API_BASE_URL}/api/v1/iam/realms/${EDUCATION_REALM_ID}/protocol/openid-connect/token/introspect" \
      -H 'Content-Type: application/x-www-form-urlencoded' \
      --data-urlencode "client_id=${EDUCATION_OIDC_CLIENT_ID}" \
      --data-urlencode "token=${access_token}"
  )"

  if [[ "${status}" != "200" ]]; then
    echo "Purpose-aware token introspection failed with status ${status}" >&2
    cat "${introspect_json}" >&2
    exit 1
  fi

  status="$(
    curl -sS -o "${refresh_json}" -w '%{http_code}' \
      -X POST "${API_BASE_URL}/api/v1/iam/realms/${EDUCATION_REALM_ID}/protocol/openid-connect/token" \
      -H 'Content-Type: application/x-www-form-urlencoded' \
      --data-urlencode 'grant_type=refresh_token' \
      --data-urlencode "client_id=${EDUCATION_OIDC_CLIENT_ID}" \
      --data-urlencode "refresh_token=${refresh_token}"
  )"

  if [[ "${status}" != "200" ]]; then
    echo "Purpose-aware refresh-token issue failed with status ${status}" >&2
    cat "${refresh_json}" >&2
    exit 1
  fi

  local refreshed_access_token
  refreshed_access_token="$(jq -r '.access_token' "${refresh_json}")"
  if [[ -z "${refreshed_access_token}" || "${refreshed_access_token}" == "null" ]]; then
    echo "Purpose-aware refresh response did not include an access token" >&2
    cat "${refresh_json}" >&2
    exit 1
  fi

  status="$(
    curl -sS -o "${refreshed_introspect_json}" -w '%{http_code}' \
      -X POST "${API_BASE_URL}/api/v1/iam/realms/${EDUCATION_REALM_ID}/protocol/openid-connect/token/introspect" \
      -H 'Content-Type: application/x-www-form-urlencoded' \
      --data-urlencode "client_id=${EDUCATION_OIDC_CLIENT_ID}" \
      --data-urlencode "token=${refreshed_access_token}"
  )"

  if [[ "${status}" != "200" ]]; then
    echo "Purpose-aware refreshed-token introspection failed with status ${status}" >&2
    cat "${refreshed_introspect_json}" >&2
    exit 1
  fi

  jq -e '
    .job_title == "Registrar" and
    .phone_number == null and
    .realm_roles == null and
    .email == "education.admin@iam.local"
  ' "${userinfo_json}" > /dev/null

  jq -e '
    .active == true and
    .requested_purpose == "operations" and
    .username == "education.admin"
  ' "${introspect_json}" > /dev/null

  jq -e '
    .active == true and
    .requested_purpose == "operations"
  ' "${refreshed_introspect_json}" > /dev/null
}

verify_brokered_oidc_claim_enforcement() {
  local auth_headers="${TMP_DIR}/broker-auth.headers"
  local broker_login_json="${TMP_DIR}/broker-login.json"
  local broker_consent_json="${TMP_DIR}/broker-consent.json"
  local broker_continue_json="${TMP_DIR}/broker-continue.json"
  local broker_token_json="${TMP_DIR}/broker-token.json"
  local broker_access_claims_json="${TMP_DIR}/broker-access-claims.json"
  local broker_userinfo_json="${TMP_DIR}/broker-userinfo.json"
  local broker_introspect_json="${TMP_DIR}/broker-introspect.json"
  local code_verifier='education-broker-verifier-20260322'
  local redirect_uri='http://localhost:3004/iam/callback'
  local code_challenge
  code_challenge="$(python3 - <<'PY'
import base64
import hashlib
verifier = 'education-broker-verifier-20260322'
print(base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip('='))
PY
)"

  local status
  status="$(
    curl -sS -D "${auth_headers}" -o /dev/null -w '%{http_code}' \
      "${API_BASE_URL}/api/v1/iam/realms/${EDUCATION_REALM_ID}/protocol/openid-connect/auth?client_id=${EDUCATION_OIDC_CLIENT_ID}&redirect_uri=http%3A%2F%2Flocalhost%3A3004%2Fiam%2Fcallback&response_type=code&scope=openid%20profile%20email%20groups&requested_purpose=education_support&state=education-broker-state&nonce=education-broker-nonce&code_challenge=${code_challenge}&code_challenge_method=S256"
  )"

  if [[ "${status}" != "302" ]]; then
    echo "Brokered authorization redirect failed with status ${status}" >&2
    cat "${auth_headers}" >&2
    exit 1
  fi

  local authorization_request_id
  authorization_request_id="$(sed -n 's/^Location: .*authorization_request_id=\([^&]*\).*/\1/p' "${auth_headers}" | tr -d '\r')"
  if [[ -z "${authorization_request_id}" ]]; then
    echo "Brokered authorization redirect did not include an authorization request id" >&2
    cat "${auth_headers}" >&2
    exit 1
  fi

  status="$(
    curl -sS -o "${broker_login_json}" -w '%{http_code}' \
      -X POST "${API_BASE_URL}/api/v1/iam/realms/${EDUCATION_REALM_ID}/brokers/${EDUCATION_BROKER_ALIAS}/login" \
      -H 'Content-Type: application/json' \
      --data-raw "{\"external_username_or_email\":\"${EDUCATION_BROKER_EXTERNAL_USERNAME}\",\"client_id\":\"${EDUCATION_OIDC_CLIENT_ID}\",\"scope\":[\"openid\",\"profile\",\"email\",\"groups\"]}"
  )"

  if [[ "${status}" != "200" ]]; then
    echo "Brokered login failed with status ${status}" >&2
    cat "${broker_login_json}" >&2
    exit 1
  fi

  local session_id
  local login_next_step
  login_next_step="$(jq -r '.next_step' "${broker_login_json}")"
  if [[ "${login_next_step}" == "CONSENT_REQUIRED" ]]; then
    local login_transaction_id
    login_transaction_id="$(jq -r '.login_transaction_id' "${broker_login_json}")"
    status="$(
      curl -sS -o "${broker_consent_json}" -w '%{http_code}' \
        -X POST "${API_BASE_URL}/api/v1/iam/realms/${EDUCATION_REALM_ID}/login/consent" \
        -H 'Content-Type: application/json' \
        --data-raw "{\"login_transaction_id\":\"${login_transaction_id}\",\"approve\":true}"
    )"

    if [[ "${status}" != "200" ]]; then
      echo "Brokered consent approval failed with status ${status}" >&2
      cat "${broker_consent_json}" >&2
      exit 1
    fi

    jq -e '.next_step == "AUTHENTICATED" and .session_id != null' "${broker_consent_json}" > /dev/null
    session_id="$(jq -r '.session_id' "${broker_consent_json}")"
  else
    jq -e '.next_step == "AUTHENTICATED" and .session_id != null' "${broker_login_json}" > /dev/null
    session_id="$(jq -r '.session_id' "${broker_login_json}")"
  fi

  status="$(
    curl -sS -o "${broker_continue_json}" -w '%{http_code}' \
      -X POST "${API_BASE_URL}/api/v1/iam/realms/${EDUCATION_REALM_ID}/protocol/openid-connect/auth/continue" \
      -H "x-iam-session-id: ${session_id}" \
      -H 'Content-Type: application/json' \
      --data-raw "{\"authorization_request_id\":\"${authorization_request_id}\"}"
  )"

  if [[ "${status}" != "200" ]]; then
    echo "Brokered authorization continue failed with status ${status}" >&2
    cat "${broker_continue_json}" >&2
    exit 1
  fi

  local authorization_code
  authorization_code="$(jq -r '.redirect_url' "${broker_continue_json}" | sed -n 's/.*[?&]code=\([^&]*\).*/\1/p')"
  if [[ -z "${authorization_code}" ]]; then
    echo "Brokered authorization continue did not include an authorization code" >&2
    cat "${broker_continue_json}" >&2
    exit 1
  fi

  status="$(
    curl -sS -o "${broker_token_json}" -w '%{http_code}' \
      -X POST "${API_BASE_URL}/api/v1/iam/realms/${EDUCATION_REALM_ID}/protocol/openid-connect/token" \
      -H 'Content-Type: application/x-www-form-urlencoded' \
      --data-urlencode 'grant_type=authorization_code' \
      --data-urlencode "client_id=${EDUCATION_OIDC_CLIENT_ID}" \
      --data-urlencode "code=${authorization_code}" \
      --data-urlencode "redirect_uri=${redirect_uri}" \
      --data-urlencode "code_verifier=${code_verifier}"
  )"

  if [[ "${status}" != "200" ]]; then
    echo "Brokered authorization-code exchange failed with status ${status}" >&2
    cat "${broker_token_json}" >&2
    exit 1
  fi

  local broker_access_token
  broker_access_token="$(jq -r '.access_token' "${broker_token_json}")"
  if [[ -z "${broker_access_token}" || "${broker_access_token}" == "null" ]]; then
    echo "Brokered authorization-code exchange did not include an access token" >&2
    cat "${broker_token_json}" >&2
    exit 1
  fi

  python3 - "${broker_access_token}" "${broker_access_claims_json}" <<'PY'
import base64
import json
import sys

token = sys.argv[1]
output_path = sys.argv[2]
payload = token.split('.')[1]
payload += '=' * (-len(payload) % 4)
claims = json.loads(base64.urlsafe_b64decode(payload.encode()).decode())
with open(output_path, 'w', encoding='utf-8') as handle:
    json.dump(claims, handle)
PY

  status="$(
    curl -sS -o "${broker_userinfo_json}" -w '%{http_code}' \
      "${API_BASE_URL}/api/v1/iam/realms/${EDUCATION_REALM_ID}/protocol/openid-connect/userinfo" \
      -H "Authorization: Bearer ${broker_access_token}"
  )"

  if [[ "${status}" != "200" ]]; then
    echo "Brokered userinfo failed with status ${status}" >&2
    cat "${broker_userinfo_json}" >&2
    exit 1
  fi

  status="$(
    curl -sS -o "${broker_introspect_json}" -w '%{http_code}' \
      -X POST "${API_BASE_URL}/api/v1/iam/realms/${EDUCATION_REALM_ID}/protocol/openid-connect/token/introspect" \
      -H 'Content-Type: application/x-www-form-urlencoded' \
      --data-urlencode "client_id=${EDUCATION_OIDC_CLIENT_ID}" \
      --data-urlencode "token=${broker_access_token}"
  )"

  if [[ "${status}" != "200" ]]; then
    echo "Brokered token introspection failed with status ${status}" >&2
    cat "${broker_introspect_json}" >&2
    exit 1
  fi

  jq -e '
    .preferred_username == "guardian.portal" and
    .given_name == "Morgan" and
    .family_name == "Guardian" and
    .email == null and
    (.realm_roles | index("guardian")) != null and
    (.groups | index("family-guardians")) != null
  ' "${broker_access_claims_json}" > /dev/null

  jq -e '
    .preferred_username == "guardian.portal" and
    .given_name == "Morgan" and
    .family_name == "Guardian" and
    .email == null and
    .groups == null and
    .realm_roles == null
  ' "${broker_userinfo_json}" > /dev/null

  jq -e '
    .active == true and
    .requested_purpose == "education_support" and
    .username == "guardian.portal"
  ' "${broker_introspect_json}" > /dev/null
}

main() {
  resolve_auth_config
  issue_admin_token
  verify_governance_endpoints
  verify_federation_packaging_endpoints
  verify_federation_claim_preview
  verify_delegated_authorization_enforcement
  verify_account_delegated_consent_management
  verify_purpose_aware_oidc_claim_release
  verify_brokered_oidc_claim_enforcement
  echo "verify-idp-learning-governance.sh: PASS"
}

main "$@"
