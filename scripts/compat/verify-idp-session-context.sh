#!/bin/bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOGIN_EMAIL="${IDP_DEMO_ADMIN_EMAIL:-alex.morgan@northstar.example}"
LOGIN_PASSWORD="${IDP_DEMO_ADMIN_PASSWORD:-StandaloneIAM!TenantAdmin2026}"
LOGIN_TENANT_ID="${IDP_LOGIN_TENANT_ID:-northstar-holdings}"
LOGIN_AUTH_MODE="${IDP_AUTH_MODE:-standalone_iam}"

REQUEST_JSON=$(mktemp)
LOGIN_JSON=$(mktemp)
SESSION_BEFORE_JSON=$(mktemp)
SESSION_SWITCH_JSON=$(mktemp)
SESSION_AFTER_JSON=$(mktemp)
TENANT_CONTEXT_JSON=$(mktemp)
AUTH_HEADER_FILE=$(mktemp)

cleanup() {
  rm -f "${REQUEST_JSON}" "${LOGIN_JSON}" "${SESSION_BEFORE_JSON}" "${SESSION_SWITCH_JSON}" "${SESSION_AFTER_JSON}" "${TENANT_CONTEXT_JSON}" "${AUTH_HEADER_FILE}"
}
trap cleanup EXIT

source "$SCRIPT_DIR/lib/idp-auth.sh"

idp_login_json "${API_BASE_URL}" "${LOGIN_EMAIL}" "${LOGIN_PASSWORD}" "${LOGIN_TENANT_ID}" "${LOGIN_AUTH_MODE}" > "${LOGIN_JSON}"

SESSION_ID=$(jq -r '.auth.session_id' "${LOGIN_JSON}")
idp_emit_auth_headers "${LOGIN_JSON}" > "${AUTH_HEADER_FILE}"

if [[ ! -s "${AUTH_HEADER_FILE}" ]]; then
  echo "Login did not return usable authentication headers" >&2
  cat "${LOGIN_JSON}" >&2
  exit 1
fi

curl -s -o "${SESSION_BEFORE_JSON}" \
  "${API_BASE_URL}/api/v1/auth/session" \
  -H @"${AUTH_HEADER_FILE}" \
  -H 'X-User-ID: bogus-user' \
  -H 'X-Tenant-ID: civic-services'

curl -s -o "${SESSION_SWITCH_JSON}" \
  -X POST "${API_BASE_URL}/api/v1/auth/session/tenant" \
  -H 'Content-Type: application/json' \
  -H @"${AUTH_HEADER_FILE}" \
  --data '{"tenant_id":"civic-services"}'

curl -s -o "${SESSION_AFTER_JSON}" \
  "${API_BASE_URL}/api/v1/auth/session" \
  -H @"${AUTH_HEADER_FILE}"

curl -s -o "${TENANT_CONTEXT_JSON}" \
  "${API_BASE_URL}/api/v1/tenant-context" \
  -H @"${AUTH_HEADER_FILE}"

jq -n \
  --slurpfile login "${LOGIN_JSON}" \
  --slurpfile session_before "${SESSION_BEFORE_JSON}" \
  --slurpfile session_switch "${SESSION_SWITCH_JSON}" \
  --slurpfile session_after "${SESSION_AFTER_JSON}" \
  --slurpfile tenant_context "${TENANT_CONTEXT_JSON}" \
  '{
    login: {
      session_id: $login[0].auth.session_id,
      tenant_id: $login[0].auth.tenant_id,
      tenant_selection_source: $login[0].identity.session.tenant_selection_source
    },
    restored_with_spoofed_headers: {
      user_id: $session_before[0].auth.user_id,
      tenant_id: $session_before[0].auth.tenant_id,
      selected_tenant: $session_before[0].selected_tenant.id,
      tenant_selection_source: $session_before[0].identity.session.tenant_selection_source
    },
    switched_session: {
      tenant_id: $session_switch[0].auth.tenant_id,
      selected_tenant: $session_switch[0].selected_tenant.id,
      tenant_selection_source: $session_switch[0].identity.session.tenant_selection_source
    },
    restored_after_switch: {
      tenant_id: $session_after[0].auth.tenant_id,
      selected_tenant: $session_after[0].selected_tenant.id,
      tenant_selection_source: $session_after[0].identity.session.tenant_selection_source
    },
    tenant_context_after_switch: {
      selected_tenant: $tenant_context[0].selected_tenant.id,
      selection_source: $tenant_context[0].selection_source,
      identity_tenant_id: $tenant_context[0].identity.session.tenant_id,
      identity_selection_source: $tenant_context[0].identity.session.tenant_selection_source
    }
  }'
