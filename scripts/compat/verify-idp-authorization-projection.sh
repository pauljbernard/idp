#!/bin/bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
UI_BASE_URL="${UI_BASE_URL:-http://localhost:3004}"
REQUESTED_REALM_ID="${REALM_ID:-}"
REQUESTED_CLIENT_ID="${CLIENT_ID:-}"
REDIRECT_URI="${REDIRECT_URI:-${UI_BASE_URL}/login/callback}"
LOCAL_DIRECTORY_STATE_PATH="${LOCAL_DIRECTORY_STATE_PATH:-apps/api-server/local-data/platform/local-directory-state.json}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

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

REQUIRED_CORE_TENANTS_JSON='["civic-services","northstar-holdings","innovation-lab"]'
IDP_IAM_CONFIG_JSON="${TMP_DIR}/idp-iam-config.json"

curl -sS -o "${IDP_IAM_CONFIG_JSON}" \
  "${API_BASE_URL}/api/v1/auth/iam/config"

CONFIG_REALM_ID="$(jq -r '.realm_id' "${IDP_IAM_CONFIG_JSON}")"
CONFIG_CLIENT_ID="$(jq -r '.client_id' "${IDP_IAM_CONFIG_JSON}")"
REALM_ID="${REQUESTED_REALM_ID:-${CONFIG_REALM_ID}}"
CLIENT_ID="${REQUESTED_CLIENT_ID:-${CONFIG_CLIENT_ID}}"

jq -e '
  .realm_id == $expected_realm_id and
  .client_id == $expected_client_id and
  .authorization_profile_id == "idp-enterprise-admin-console" and
  .authorization_projection_mode == "APPLICATION_BINDING_CLAIM_MAPPING" and
  .tenant_membership_strategy == "PLATFORM_ADMIN_ALL_TENANTS_OR_EXPLICIT_IDENTITY_MEMBERSHIP"
' \
  --arg expected_realm_id "${CONFIG_REALM_ID}" \
  --arg expected_client_id "${CONFIG_CLIENT_ID}" \
  "${IDP_IAM_CONFIG_JSON}" > /dev/null

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

perform_exchange_flow() {
  local label="$1"
  local email="$2"
  local password="$3"
  local requested_tenant_id="$4"
  local login_response_json="${TMP_DIR}/${label}-login-response.json"

  idp_login_json "${API_BASE_URL}" "${email}" "${password}" "${requested_tenant_id}" "standalone_iam" "${UI_BASE_URL}" > "${login_response_json}"
  printf '%s\n' "${login_response_json}"
}

ADMIN_EXCHANGE_JSON="$(perform_exchange_flow "admin" "admin@idp.local" "StandaloneIAM!SuperAdmin2026" "civic-services")"
SARAH_EXCHANGE_JSON="$(perform_exchange_flow "sarah" "alex.morgan@northstar.example" "StandaloneIAM!TenantAdmin2026" "innovation-lab")"
MIGUEL_EXCHANGE_JSON="$(perform_exchange_flow "miguel" "jordan.lee@civic.example" "StandaloneIAM!ServiceOperator2026" "northstar-holdings")"

ADMIN_AUTH_HEADER_FILE="${TMP_DIR}/admin-auth.headers"
SARAH_AUTH_HEADER_FILE="${TMP_DIR}/sarah-auth.headers"
MIGUEL_AUTH_HEADER_FILE="${TMP_DIR}/miguel-auth.headers"

idp_emit_auth_headers "${ADMIN_EXCHANGE_JSON}" > "${ADMIN_AUTH_HEADER_FILE}"
idp_emit_auth_headers "${SARAH_EXCHANGE_JSON}" > "${SARAH_AUTH_HEADER_FILE}"
idp_emit_auth_headers "${MIGUEL_EXCHANGE_JSON}" > "${MIGUEL_AUTH_HEADER_FILE}"

SARAH_SESSION_JSON="${TMP_DIR}/sarah-session.json"
SARAH_TENANT_SWITCH_JSON="${TMP_DIR}/sarah-tenant-switch.json"
MIGUEL_SESSION_JSON="${TMP_DIR}/miguel-session.json"

curl -sS -o "${SARAH_SESSION_JSON}" \
  "${API_BASE_URL}/api/v1/auth/session" \
  -H @"${SARAH_AUTH_HEADER_FILE}" \
  -H 'x-user-id: spoof-user' \
  -H 'x-tenant-id: spoof-tenant'

curl -sS -o "${SARAH_TENANT_SWITCH_JSON}" \
  -X POST "${API_BASE_URL}/api/v1/auth/session/tenant" \
  -H 'Content-Type: application/json' \
  -H @"${SARAH_AUTH_HEADER_FILE}" \
  --data '{"tenant_id":"northstar-holdings"}'

curl -sS -o "${MIGUEL_SESSION_JSON}" \
  "${API_BASE_URL}/api/v1/auth/session" \
  -H @"${MIGUEL_AUTH_HEADER_FILE}"

jq -e '
  .authenticated == true and
  .current_user.email == "admin@idp.local" and
  .selected_tenant.id == "civic-services" and
  (.available_tenants | map(.id) | contains($required_core_tenants)) and
  (.current_user.tenant_ids | contains($required_core_tenants)) and
  (.current_user.global_role_ids | index("super_administrator")) != null and
  (.current_user.global_permissions | index("iam.manage")) != null and
  (.current_user.global_permissions | index("commerce.manage")) != null and
  (.current_user.global_permissions | index("lms.manage")) != null and
  (.identity.provider.provider_id == "standalone-iam") and
  (.identity.provider.provider_mode == "CONTROL_PLANE_BRIDGE")
' --argjson required_core_tenants "${REQUIRED_CORE_TENANTS_JSON}" "${ADMIN_EXCHANGE_JSON}" > /dev/null

jq -e '
  .authenticated == true and
  .current_user.email == "alex.morgan@northstar.example" and
  .selected_tenant.id == "innovation-lab" and
  (.available_tenants | map(.id) | contains($required_core_tenants)) and
  (.current_user.tenant_ids | contains($required_core_tenants)) and
  (.current_user.global_role_ids | index("super_administrator")) != null and
  (.current_membership.role_label == "Research Program Lead") and
  (.current_user.global_accessible_surface_ids | index("iam")) != null and
  (.current_user.global_accessible_surface_ids | index("cms")) != null and
  (.current_user.global_accessible_surface_ids | index("commerce")) != null and
  (.current_user.global_accessible_surface_ids | index("lms")) != null
' --argjson required_core_tenants "${REQUIRED_CORE_TENANTS_JSON}" "${SARAH_EXCHANGE_JSON}" > /dev/null

jq -e '
  .authenticated == true and
  .current_user.email == "alex.morgan@northstar.example" and
  .auth.user_id == .current_user.id and
  .selected_tenant.id == "innovation-lab" and
  (.available_tenants | map(.id) | contains($required_core_tenants))
' --argjson required_core_tenants "${REQUIRED_CORE_TENANTS_JSON}" "${SARAH_SESSION_JSON}" > /dev/null

jq -e '
  .authenticated == true and
  .selected_tenant.id == "northstar-holdings" and
  .selection_source == "requested" and
  .auth.tenant_id == "northstar-holdings"
' "${SARAH_TENANT_SWITCH_JSON}" > /dev/null

jq -e '
  .authenticated == true and
  .current_user.email == "jordan.lee@civic.example" and
  .selected_tenant.id == "civic-services" and
  (.available_tenants | map(.id)) == ["civic-services"] and
  (.current_user.tenant_ids) == ["civic-services"] and
  (.current_membership.role_label == "Service Operations Operator") and
  ((.current_user.global_permissions | length) == 0)
' "${MIGUEL_EXCHANGE_JSON}" > /dev/null

jq -e '
  .authenticated == true and
  .selected_tenant.id == "civic-services" and
  (.available_tenants | map(.id)) == ["civic-services"]
' "${MIGUEL_SESSION_JSON}" > /dev/null

jq -e '
  (.state.users[] | select(.email == "admin@idp.local") | .auth_source) == "external_identity" and
  (.state.users[] | select(.email == "admin@idp.local") | .provider_id) == "standalone-iam" and
  ((.state.users[] | select(.email == "admin@idp.local") | .tenant_ids) | contains($required_core_tenants)) and
  (.state.users[] | select(.email == "alex.morgan@northstar.example") | .auth_source) == "external_identity" and
  (.state.users[] | select(.email == "alex.morgan@northstar.example") | .provider_id) == "standalone-iam" and
  ((.state.users[] | select(.email == "alex.morgan@northstar.example") | .global_role_ids) | index("super_administrator")) != null and
  ((.state.users[] | select(.email == "alex.morgan@northstar.example") | .tenant_ids) | contains($required_core_tenants)) and
  (.state.users[] | select(.email == "jordan.lee@civic.example") | .auth_source) == "external_identity" and
  (.state.users[] | select(.email == "jordan.lee@civic.example") | .provider_id) == "standalone-iam" and
  ((.state.users[] | select(.email == "jordan.lee@civic.example") | .tenant_ids) == ["civic-services"])
' --argjson required_core_tenants "${REQUIRED_CORE_TENANTS_JSON}" "${LOCAL_DIRECTORY_STATE_PATH}" > /dev/null

jq -n \
  --slurpfile admin "${ADMIN_EXCHANGE_JSON}" \
  --slurpfile sarah "${SARAH_EXCHANGE_JSON}" \
  '
    ($admin[0].available_tenants | map(.id) | sort) ==
    ($sarah[0].available_tenants | map(.id) | sort) and
    ($admin[0].current_user.tenant_ids | sort) ==
    ($sarah[0].current_user.tenant_ids | sort)
  ' > /dev/null

jq -n \
  --slurpfile admin "${ADMIN_EXCHANGE_JSON}" \
  --slurpfile sarah "${SARAH_EXCHANGE_JSON}" \
  --slurpfile miguel "${MIGUEL_EXCHANGE_JSON}" \
  --slurpfile sarah_switch "${SARAH_TENANT_SWITCH_JSON}" \
  --slurpfile config "${IDP_IAM_CONFIG_JSON}" \
  --slurpfile directory "${LOCAL_DIRECTORY_STATE_PATH}" \
  --argjson required_core_tenants "${REQUIRED_CORE_TENANTS_JSON}" \
  '{
    iam_config: {
      realm_id: $config[0].realm_id,
      client_id: $config[0].client_id,
      authorization_profile_id: $config[0].authorization_profile_id,
      authorization_projection_mode: $config[0].authorization_projection_mode,
      tenant_membership_strategy: $config[0].tenant_membership_strategy
    },
    required_core_tenants: $required_core_tenants,
    admin_projection: {
      user_id: $admin[0].auth.user_id,
      selected_tenant: $admin[0].selected_tenant.id,
      tenant_ids: $admin[0].current_user.tenant_ids,
      global_role_ids: $admin[0].current_user.global_role_ids,
      global_permissions: $admin[0].current_user.global_permissions
    },
    sarah_projection: {
      user_id: $sarah[0].auth.user_id,
      selected_tenant: $sarah[0].selected_tenant.id,
      switched_tenant: $sarah_switch[0].selected_tenant.id,
      tenant_ids: $sarah[0].current_user.tenant_ids,
      global_role_ids: $sarah[0].current_user.global_role_ids,
      current_membership_role: $sarah[0].current_membership.role_label,
      global_accessible_surface_ids: $sarah[0].current_user.global_accessible_surface_ids
    },
    miguel_projection: {
      user_id: $miguel[0].auth.user_id,
      requested_tenant_resolved_to: $miguel[0].selected_tenant.id,
      selection_source: $miguel[0].selection_source,
      warnings: $miguel[0].warnings,
      tenant_ids: $miguel[0].current_user.tenant_ids,
      current_membership_role: $miguel[0].current_membership.role_label
    },
    synced_directory_users: [
      $directory[0].state.users[]
      | select(
          .email == "admin@idp.local" or
          .email == "alex.morgan@northstar.example" or
          .email == "jordan.lee@civic.example"
        )
      | {
          email,
          auth_source,
          provider_id,
          tenant_ids,
          global_role_ids,
          global_permissions
        }
    ]
  }'
