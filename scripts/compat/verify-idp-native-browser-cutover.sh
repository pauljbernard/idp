#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_BASE="${IDP_API_BASE:-http://127.0.0.1:3000/api/v1}"
REALM_ID="${IDP_IAM_REALM_ID:-realm-idp-default}"
CLIENT_ID="${IDP_IAM_CLIENT_ID:-admin-console-demo}"
TMP_DIR="${KEEP_TMP_DIR:+$(mktemp -d)}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -z "${TMP_DIR:-}" ]; then
  TMP_DIR="$(mktemp -d)"
  trap 'rm -rf "$TMP_DIR"' EXIT
fi

ADMIN_TOKEN_JSON="$TMP_DIR/admin-token.json"
ADMIN_REFRESH_JSON="$TMP_DIR/admin-refresh.json"
ADMIN_AUTH_HEADER="$TMP_DIR/admin-auth.header"
ADMIN_REFRESH_AUTH_HEADER="$TMP_DIR/admin-refresh-auth.header"
ADMIN_AUTH_SESSION_JSON="$TMP_DIR/admin-auth-session.json"
ADMIN_OLD_ACCESS_AFTER_REVOKE_JSON="$TMP_DIR/admin-old-access-after-revoke.json"
ADMIN_COMPAT_SESSION_JSON="$TMP_DIR/admin-compat-session.json"
ADMIN_REVOKE_ACCESS_JSON="$TMP_DIR/admin-revoke-access.json"
ADMIN_REVOKE_REFRESH_JSON="$TMP_DIR/admin-revoke-refresh.json"
ADMIN_REFRESH_AFTER_REVOKE_JSON="$TMP_DIR/admin-refresh-after-revoke.json"
MIGUEL_TOKEN_JSON="$TMP_DIR/miguel-token.json"
MIGUEL_AUTH_HEADER="$TMP_DIR/miguel-auth.header"
MIGUEL_AUTH_SESSION_JSON="$TMP_DIR/miguel-auth-session.json"
MIGUEL_TENANT_CONTEXT_JSON="$TMP_DIR/miguel-tenant-context.json"
IAM_CONFIG_JSON="$TMP_DIR/auth-iam-config.json"
DOCS_SUMMARY_JSON="$TMP_DIR/docs-summary.json"

token_endpoint="$API_BASE/iam/realms/$REALM_ID/protocol/openid-connect/token"
revoke_endpoint="$API_BASE/iam/realms/$REALM_ID/protocol/openid-connect/revoke"

source "$SCRIPT_DIR/lib/idp-auth.sh"

idp_issue_iam_browser_token_json "${API_BASE%/api/v1}" "admin@idp.local" "StandaloneIAM!SuperAdmin2026" > "$ADMIN_TOKEN_JSON"
idp_issue_iam_browser_token_json "${API_BASE%/api/v1}" "jordan.lee@civic.example" "StandaloneIAM!ServiceOperator2026" > "$MIGUEL_TOKEN_JSON"

admin_access="$(jq -e -r '.access_token' "$ADMIN_TOKEN_JSON")"
admin_refresh="$(jq -e -r '.refresh_token' "$ADMIN_TOKEN_JSON")"
miguel_access="$(jq -e -r '.access_token' "$MIGUEL_TOKEN_JSON")"

printf 'Authorization: Bearer %s\n' "$admin_access" > "$ADMIN_AUTH_HEADER"
printf 'Authorization: Bearer %s\n' "$miguel_access" > "$MIGUEL_AUTH_HEADER"

miguel_auth_session_status="$(
  curl -sS -o "$MIGUEL_AUTH_SESSION_JSON" -w '%{http_code}' \
    -H @"$MIGUEL_AUTH_HEADER" \
    -H 'X-Tenant-ID: civic-services' \
    "$API_BASE/auth/session"
)"

miguel_tenant_context_status="$(
  curl -sS -o "$MIGUEL_TENANT_CONTEXT_JSON" -w '%{http_code}' \
    -H @"$MIGUEL_AUTH_HEADER" \
    -H 'X-Tenant-ID: civic-services' \
    "$API_BASE/tenant-context"
)"

curl -sS -X POST "$token_endpoint" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode grant_type=refresh_token \
  --data-urlencode client_id="$CLIENT_ID" \
  --data-urlencode refresh_token="$admin_refresh" \
  > "$ADMIN_REFRESH_JSON"

refreshed_access="$(jq -e -r '.access_token' "$ADMIN_REFRESH_JSON")"
refreshed_refresh="$(jq -r '.refresh_token // empty' "$ADMIN_REFRESH_JSON")"
if [ -z "$refreshed_refresh" ]; then
  refreshed_refresh="$admin_refresh"
fi

printf 'Authorization: Bearer %s\n' "$refreshed_access" > "$ADMIN_REFRESH_AUTH_HEADER"

admin_refreshed_auth_session_status="$(
  curl -sS -o "$ADMIN_AUTH_SESSION_JSON" -w '%{http_code}' \
    -H @"$ADMIN_REFRESH_AUTH_HEADER" \
    -H 'X-Tenant-ID: northstar-holdings' \
    "$API_BASE/auth/session"
)"

admin_compat_session_status="$(
  curl -sS -o "$ADMIN_COMPAT_SESSION_JSON" -w '%{http_code}' \
    -H "X-Session-ID: iam-bearer:${refreshed_access}" \
    -H 'X-Tenant-ID: northstar-holdings' \
    "$API_BASE/auth/session"
)"

revoke_old_access_status="$(
  curl -sS -o "$ADMIN_REVOKE_ACCESS_JSON" -w '%{http_code}' \
    -X POST "$revoke_endpoint" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode client_id="$CLIENT_ID" \
    --data-urlencode token="$admin_access"
)"

old_access_after_revoke_status="$(
  curl -sS -o "$ADMIN_OLD_ACCESS_AFTER_REVOKE_JSON" -w '%{http_code}' \
    -H @"$ADMIN_AUTH_HEADER" \
    -H 'X-Tenant-ID: northstar-holdings' \
    "$API_BASE/auth/session"
)"

revoke_refreshed_refresh_status="$(
  curl -sS -o "$ADMIN_REVOKE_REFRESH_JSON" -w '%{http_code}' \
    -X POST "$revoke_endpoint" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode client_id="$CLIENT_ID" \
    --data-urlencode token="$refreshed_refresh"
)"

refresh_after_revoke_status="$(
  curl -sS -o "$ADMIN_REFRESH_AFTER_REVOKE_JSON" -w '%{http_code}' \
    -X POST "$token_endpoint" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode grant_type=refresh_token \
    --data-urlencode client_id="$CLIENT_ID" \
    --data-urlencode refresh_token="$refreshed_refresh"
)"

curl -sS "$API_BASE/auth/iam/config" > "$IAM_CONFIG_JSON"
curl -sS "${API_BASE%/api/v1}/docs/index.json" | jq '{contract_count, path_count, operation_count, undocumented_operation_count, documentation_complete}' > "$DOCS_SUMMARY_JSON"

jq -e '.tenant_membership_strategy == "PLATFORM_ADMIN_ALL_TENANTS_OR_EXPLICIT_IDENTITY_MEMBERSHIP"' "$IAM_CONFIG_JSON" >/dev/null
jq -e '.authenticated == true and .auth.tenant_id == "civic-services" and .identity.session.session_transport == "bearer_session"' "$MIGUEL_AUTH_SESSION_JSON" >/dev/null
jq -e '.selected_tenant.id == "civic-services" and .current_membership.role_label == "Service Operations Operator"' "$MIGUEL_TENANT_CONTEXT_JSON" >/dev/null
jq -e '.authenticated == true and .identity.session.session_transport == "bearer_session"' "$ADMIN_AUTH_SESSION_JSON" >/dev/null
jq -e '.error == "Authentication required"' "$ADMIN_COMPAT_SESSION_JSON" >/dev/null
jq -e '.error == "Authentication required"' "$ADMIN_OLD_ACCESS_AFTER_REVOKE_JSON" >/dev/null
jq -e '.error == "invalid_grant"' "$ADMIN_REFRESH_AFTER_REVOKE_JSON" >/dev/null
jq -e '.contract_count == 202 and .path_count == 747 and .operation_count == 943 and .undocumented_operation_count == 0 and .documentation_complete == true' "$DOCS_SUMMARY_JSON" >/dev/null

if [ "$miguel_auth_session_status" != "200" ]; then
  echo "Expected miguel auth/session 200, got $miguel_auth_session_status" >&2
  exit 1
fi

if [ "$miguel_tenant_context_status" != "200" ]; then
  echo "Expected miguel tenant-context 200, got $miguel_tenant_context_status" >&2
  exit 1
fi

if [ "$admin_refreshed_auth_session_status" != "200" ]; then
  echo "Expected refreshed admin auth/session 200, got $admin_refreshed_auth_session_status" >&2
  exit 1
fi

if [ "$admin_compat_session_status" != "401" ]; then
  echo "Expected legacy iam-bearer session compatibility header to fail with 401, got $admin_compat_session_status" >&2
  exit 1
fi

if [ "$revoke_old_access_status" != "200" ]; then
  echo "Expected revoke old access 200, got $revoke_old_access_status" >&2
  exit 1
fi

if [ "$old_access_after_revoke_status" != "401" ]; then
  echo "Expected old access token to fail with 401 after revoke, got $old_access_after_revoke_status" >&2
  exit 1
fi

if [ "$revoke_refreshed_refresh_status" != "200" ]; then
  echo "Expected revoke refreshed refresh token 200, got $revoke_refreshed_refresh_status" >&2
  exit 1
fi

if [ "$refresh_after_revoke_status" != "400" ]; then
  echo "Expected refresh after revoke 400, got $refresh_after_revoke_status" >&2
  exit 1
fi

cat <<EOF
miguel_auth_session=$miguel_auth_session_status
miguel_tenant_context=$miguel_tenant_context_status
admin_refreshed_auth_session=$admin_refreshed_auth_session_status
admin_compat_session=$admin_compat_session_status
revoke_old_access=$revoke_old_access_status
old_access_after_revoke=$old_access_after_revoke_status
revoke_refreshed_refresh=$revoke_refreshed_refresh_status
refresh_after_revoke=$refresh_after_revoke_status
tmp_dir=$TMP_DIR
EOF
