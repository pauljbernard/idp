#!/bin/bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
UI_BASE_URL="${UI_BASE_URL:-http://localhost:3004}"
REALM_ID="${REALM_ID:-realm-idp-default}"
CLIENT_ID="${CLIENT_ID:-admin-console-demo}"
REDIRECT_URI="${REDIRECT_URI:-${UI_BASE_URL}/login/callback}"
LOCAL_DIRECTORY_STATE_PATH="${LOCAL_DIRECTORY_STATE_PATH:-apps/api-server/local-data/platform/local-directory-state.json}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

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

perform_exchange_flow() {
  local label="$1"
  local email="$2"
  local password="$3"
  local requested_tenant_id="$4"
  local login_response_json="${TMP_DIR}/${label}-login-response.json"

  idp_login_json "${API_BASE_URL}" "${email}" "${password}" "${requested_tenant_id}" "standalone_iam" "${UI_BASE_URL}" > "${login_response_json}"
  printf '%s\n' "${login_response_json}"
}

ADMIN_EXCHANGE_JSON="$(perform_exchange_flow "admin" "admin@idp.local" "StandaloneIAM!SuperAdmin2026" "")"
CITY_EXCHANGE_JSON="$(perform_exchange_flow "city" "jordan.lee@civic.example" "StandaloneIAM!ServiceOperator2026" "civic-services")"

jq -e '
  .authenticated == true and
  .current_user.email == "admin@idp.local" and
  (.current_user.global_role_ids | index("super_administrator")) != null and
  (.current_user.global_permissions | index("iam.manage")) != null and
  .identity.provider.provider_id == "standalone-iam" and
  .identity.provider.provider_mode == "CONTROL_PLANE_BRIDGE"
' "${ADMIN_EXCHANGE_JSON}" > /dev/null

jq -e '
  .authenticated == true and
  .current_user.email == "jordan.lee@civic.example" and
  .selected_tenant.id == "civic-services" and
  (.current_user.global_permissions | length) == 0 and
  .identity.provider.provider_id == "standalone-iam" and
  .identity.provider.provider_mode == "CONTROL_PLANE_BRIDGE"
' "${CITY_EXCHANGE_JSON}" > /dev/null

jq -e '
  (.state.users[] | select(.email == "admin@idp.local") | .auth_source) == "external_identity" and
  (.state.users[] | select(.email == "admin@idp.local") | .provider_id) == "standalone-iam" and
  ((.state.users[] | select(.email == "admin@idp.local") | .global_role_ids) | index("super_administrator")) != null and
  (.state.users[] | select(.email == "jordan.lee@civic.example") | .auth_source) == "external_identity" and
  (.state.users[] | select(.email == "jordan.lee@civic.example") | .provider_id) == "standalone-iam" and
  (((.state.users[] | select(.email == "jordan.lee@civic.example") | .tenant_ids) | index("civic-services")) != null)
' "${LOCAL_DIRECTORY_STATE_PATH}" > /dev/null

jq -n \
  --slurpfile admin "${ADMIN_EXCHANGE_JSON}" \
  --slurpfile city "${CITY_EXCHANGE_JSON}" \
  --slurpfile directory "${LOCAL_DIRECTORY_STATE_PATH}" \
  '{
    admin_exchange: {
      user_id: $admin[0].auth.user_id,
      tenant_id: $admin[0].auth.tenant_id,
      provider_id: $admin[0].identity.provider.provider_id,
      provider_mode: $admin[0].identity.provider.provider_mode,
      global_role_ids: $admin[0].current_user.global_role_ids,
      global_permissions: $admin[0].current_user.global_permissions,
      global_accessible_surface_ids: $admin[0].current_user.global_accessible_surface_ids
    },
    city_exchange: {
      user_id: $city[0].auth.user_id,
      tenant_id: $city[0].auth.tenant_id,
      selected_tenant: $city[0].selected_tenant.id,
      provider_id: $city[0].identity.provider.provider_id,
      provider_mode: $city[0].identity.provider.provider_mode,
      membership_role: $city[0].current_membership.role_label,
      global_permissions: $city[0].current_user.global_permissions
    },
    synced_directory_users: [
      $directory[0].state.users[]
      | select(.email == "admin@idp.local" or .email == "jordan.lee@civic.example")
      | {
          email,
          auth_source,
          provider_id,
          external_user_id,
          tenant_ids,
          global_role_ids,
          global_permissions
        }
    ]
  }'
