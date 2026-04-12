#!/bin/bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://[::1]:3000}"
ADMIN_TENANT_ID="${ADMIN_TENANT_ID:-northstar-holdings}"
ADMIN_EMAIL="${ADMIN_EMAIL:-alex.morgan@northstar.example}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-StandaloneIAM!TenantAdmin2026}"

TMP_DIR="$(mktemp -d)"
cleanup() {
  if [[ "${KEEP_TMP_DIR:-0}" == "1" ]]; then
    echo "Keeping tmp dir: ${TMP_DIR}" >&2
    return
  fi
  rm -rf "${TMP_DIR}"
}

REALM_ID=""
CLIENT_ID=""
CLIENT_SECRET=""

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
  curl -g -sS -o "${auth_config_json}" "${API_BASE_URL}/api/v1/auth/iam/config"
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

  curl -g -sS -o "${token_response_json}" \
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

authorized_get() {
  local token="$1"
  local tenant_id="$2"
  local path="$3"
  local output_json="$4"
  local status
  status="$(curl -g -sS -o "${output_json}" -w '%{http_code}' \
    -H "Authorization: Bearer ${token}" \
    -H "X-Tenant-ID: ${tenant_id}" \
    "${API_BASE_URL}${path}")"
  assert_status "${status}" "200" "GET ${path}"
}

assert_count_at_least() {
  local file="$1"
  local jq_expr="$2"
  local minimum="$3"
  local label="$4"
  local count
  count="$(jq -r "${jq_expr}" "${file}")"
  if [[ "${count}" -lt "${minimum}" ]]; then
    echo "${label} expected count >= ${minimum}, got ${count}" >&2
    exit 1
  fi
}

trap cleanup EXIT

resolve_auth_config
ADMIN_TOKEN="$(issue_password_grant_token "learning-readiness-admin" "${ADMIN_EMAIL}" "${ADMIN_PASSWORD}")"

REALM_POSTURE_PRESETS_JSON="${TMP_DIR}/realm-posture-presets.json"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/iam/realm-posture-presets?realm_template_id=realm-template-education-readiness" "${REALM_POSTURE_PRESETS_JSON}"
assert_count_at_least "${REALM_POSTURE_PRESETS_JSON}" '.count' 1 'GET /api/v1/iam/realm-posture-presets'
jq -e '.realm_posture_presets[] | select(.kind == "INSTITUTIONAL_SSO")' "${REALM_POSTURE_PRESETS_JSON}" > /dev/null
jq -e '.realm_posture_presets[] | select(.kind == "GUARDIAN_PROXY")' "${REALM_POSTURE_PRESETS_JSON}" > /dev/null

IDENTITY_PRIVACY_POLICIES_JSON="${TMP_DIR}/identity-privacy-policies.json"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/iam/identity-privacy-policies?realm_id=realm-education-validation" "${IDENTITY_PRIVACY_POLICIES_JSON}"
assert_count_at_least "${IDENTITY_PRIVACY_POLICIES_JSON}" '.count' 1 'GET /api/v1/iam/identity-privacy-policies'
jq -e '.identity_privacy_policies[] | select(.classification == "PROTECTED")' "${IDENTITY_PRIVACY_POLICIES_JSON}" > /dev/null

DELEGATED_RELATIONSHIPS_JSON="${TMP_DIR}/delegated-relationships.json"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/iam/delegated-relationships?realm_id=realm-education-validation" "${DELEGATED_RELATIONSHIPS_JSON}"
assert_count_at_least "${DELEGATED_RELATIONSHIPS_JSON}" '.count' 1 'GET /api/v1/iam/delegated-relationships'

PORTABLE_IDENTITIES_JSON="${TMP_DIR}/portable-identities.json"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/iam/portable-identities?realm_id=realm-education-validation" "${PORTABLE_IDENTITIES_JSON}"
assert_count_at_least "${PORTABLE_IDENTITIES_JSON}" '.count' 1 'GET /api/v1/iam/portable-identities'

FEDERATION_TRUST_STORES_JSON="${TMP_DIR}/federation-trust-stores.json"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/iam/federation-trust-stores" "${FEDERATION_TRUST_STORES_JSON}"
assert_count_at_least "${FEDERATION_TRUST_STORES_JSON}" '.count' 2 'GET /api/v1/iam/federation-trust-stores'
jq -e '.federation_trust_stores[] | select(.supported_protocols | index("OIDC"))' "${FEDERATION_TRUST_STORES_JSON}" > /dev/null
jq -e '.federation_trust_stores[] | select(.supported_protocols | index("SAML"))' "${FEDERATION_TRUST_STORES_JSON}" > /dev/null

FEDERATION_MAPPING_PROFILES_JSON="${TMP_DIR}/federation-mapping-profiles.json"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/iam/federation-mapping-profiles" "${FEDERATION_MAPPING_PROFILES_JSON}"
assert_count_at_least "${FEDERATION_MAPPING_PROFILES_JSON}" '.count' 2 'GET /api/v1/iam/federation-mapping-profiles'
jq -e '.federation_mapping_profiles[] | select(.protocol == "OIDC")' "${FEDERATION_MAPPING_PROFILES_JSON}" > /dev/null
jq -e '.federation_mapping_profiles[] | select(.protocol == "SAML")' "${FEDERATION_MAPPING_PROFILES_JSON}" > /dev/null
