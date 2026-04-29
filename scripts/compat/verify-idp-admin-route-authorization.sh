#!/bin/bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
UI_BASE_URL="${UI_BASE_URL:-http://localhost:3004}"
REALM_ID=""
CLIENT_ID=""
CLIENT_SECRET=""
ADMIN_TENANT_ID="${ADMIN_TENANT_ID:-northstar-holdings}"
ADMIN_EMAIL="${ADMIN_EMAIL:-alex.morgan@northstar.example}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-StandaloneIAM!TenantAdmin2026}"
OPERATOR_TENANT_ID="${OPERATOR_TENANT_ID:-civic-services}"
OPERATOR_EMAIL="${OPERATOR_EMAIL:-jordan.lee@civic.example}"
OPERATOR_PASSWORD="${OPERATOR_PASSWORD:-StandaloneIAM!ServiceOperator2026}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

resolve_auth_config() {
  local auth_config_json="${TMP_DIR}/auth-config.json"
  curl -sS -o "${auth_config_json}" "${API_BASE_URL}/api/v1/auth/iam/config"
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

  curl -sS -o "${token_response_json}" \
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

assert_status() {
  local actual="$1"
  local expected="$2"
  local label="$3"
  if [[ "${actual}" != "${expected}" ]]; then
    echo "${label} expected HTTP ${expected}, got ${actual}" >&2
    exit 1
  fi
}

forbidden_get() {
  local token="$1"
  local tenant_id="$2"
  local path="$3"
  local output_json="$4"
  local status
  status="$(curl -sS -o "${output_json}" -w '%{http_code}' \
    -H "Authorization: Bearer ${token}" \
    -H "X-Tenant-ID: ${tenant_id}" \
    "${API_BASE_URL}${path}")"
  assert_status "${status}" "403" "GET ${path}"
}

authorized_get() {
  local token="$1"
  local tenant_id="$2"
  local path="$3"
  local output_json="$4"
  local status
  status="$(curl -sS -o "${output_json}" -w '%{http_code}' \
    -H "Authorization: Bearer ${token}" \
    -H "X-Tenant-ID: ${tenant_id}" \
    "${API_BASE_URL}${path}")"
  assert_status "${status}" "200" "GET ${path}"
}

authorized_put_json() {
  local token="$1"
  local tenant_id="$2"
  local path="$3"
  local request_json="$4"
  local output_json="$5"
  local status
  status="$(curl -sS -o "${output_json}" -w '%{http_code}' \
    -X PUT "${API_BASE_URL}${path}" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${token}" \
    -H "X-Tenant-ID: ${tenant_id}" \
    --data @"${request_json}")"
  assert_status "${status}" "200" "PUT ${path}"
}

forbidden_put_json() {
  local token="$1"
  local tenant_id="$2"
  local path="$3"
  local request_json="$4"
  local output_json="$5"
  local status
  status="$(curl -sS -o "${output_json}" -w '%{http_code}' \
    -X PUT "${API_BASE_URL}${path}" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${token}" \
    -H "X-Tenant-ID: ${tenant_id}" \
    --data @"${request_json}")"
  assert_status "${status}" "403" "PUT ${path}"
}

resolve_auth_config

ADMIN_TOKEN="$(issue_password_grant_token "admin" "${ADMIN_EMAIL}" "${ADMIN_PASSWORD}")"
OPERATOR_TOKEN="$(issue_password_grant_token "operator" "${OPERATOR_EMAIL}" "${OPERATOR_PASSWORD}")"

ADMIN_CONTROL_PLANE_CATALOG_JSON="${TMP_DIR}/admin-control-plane-catalog.json"
ADMIN_DEPLOYMENT_PROFILE_JSON="${TMP_DIR}/admin-deployment-profile.json"
ADMIN_OPERATING_PROFILE_JSON="${TMP_DIR}/admin-operating-profile.json"
ADMIN_SOLUTION_PACKS_JSON="${TMP_DIR}/admin-solution-packs.json"
ADMIN_FEATURE_FLAGS_JSON="${TMP_DIR}/admin-feature-flags.json"
ADMIN_ORGANIZATION_PROFILE_JSON="${TMP_DIR}/admin-organization-profile.json"
ADMIN_BILLING_PROFILE_JSON="${TMP_DIR}/admin-billing-profile.json"

authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/control-plane/catalog' "${ADMIN_CONTROL_PLANE_CATALOG_JSON}"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/configuration/deployment-profile' "${ADMIN_DEPLOYMENT_PROFILE_JSON}"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/operating-profile' "${ADMIN_OPERATING_PROFILE_JSON}"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/solution-packs' "${ADMIN_SOLUTION_PACKS_JSON}"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/feature-flags' "${ADMIN_FEATURE_FLAGS_JSON}"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/account/organization' "${ADMIN_ORGANIZATION_PROFILE_JSON}"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/billing/profile' "${ADMIN_BILLING_PROFILE_JSON}"

jq -e '.count >= 1 and (.providers | type == "array") and (.providers | length >= 1)' "${ADMIN_CONTROL_PLANE_CATALOG_JSON}" > /dev/null

ADMIN_DEPLOYMENT_PROFILE_UPDATE_JSON="${TMP_DIR}/admin-deployment-profile-update.json"
jq '{
  deployment_profile: .current.deployment_profile,
  assurance_mode: .current.assurance_mode,
  identity_mfa_requirement: .current.identity_mfa_requirement,
  data_residency_rule: .current.data_residency_rule,
  support_access_rule: .current.support_access_rule,
  integration_credential_ownership: .current.integration_credential_ownership,
  logging_retention_days: .current.logging_retention_days,
  evidence_retention_days: .current.evidence_retention_days,
  command_center_enabled: .current.command_center_enabled,
  public_program_enabled: .current.public_program_enabled,
  notes: .current.notes
}' "${ADMIN_DEPLOYMENT_PROFILE_JSON}" > "${ADMIN_DEPLOYMENT_PROFILE_UPDATE_JSON}"

ADMIN_OPERATING_PROFILE_UPDATE_JSON="${TMP_DIR}/admin-operating-profile-update.json"
jq '{
  segment_id: .current.segment_id,
  training_entitlement: .current.training_entitlement,
  training_addon_ids: .current.training_addon_ids
}' "${ADMIN_OPERATING_PROFILE_JSON}" > "${ADMIN_OPERATING_PROFILE_UPDATE_JSON}"

ADMIN_SOLUTION_PACK_ASSIGNMENTS_UPDATE_JSON="${TMP_DIR}/admin-solution-pack-assignments-update.json"
jq '{
  pack_ids: .assigned_pack_ids,
  primary_pack_id: .primary_pack_id
}' "${ADMIN_SOLUTION_PACKS_JSON}" > "${ADMIN_SOLUTION_PACK_ASSIGNMENTS_UPDATE_JSON}"

ADMIN_AUTHORIZATION_CONNECTOR_FEATURE_FLAG_UPDATE_JSON="${TMP_DIR}/admin-authorization-connector-feature-flag-update.json"
jq -r '.flags[] | select(.key == "integration.authorization_connector.mode") | .value' "${ADMIN_FEATURE_FLAGS_JSON}" \
  | jq -R '{value: .}' > "${ADMIN_AUTHORIZATION_CONNECTOR_FEATURE_FLAG_UPDATE_JSON}"

ADMIN_ORGANIZATION_PROFILE_UPDATE_JSON="${TMP_DIR}/admin-organization-profile-update.json"
jq '{
  legal_name: .legal_name,
  display_name: .display_name,
  domain: (.domain // null),
  company_size: .company_size
}' "${ADMIN_ORGANIZATION_PROFILE_JSON}" > "${ADMIN_ORGANIZATION_PROFILE_UPDATE_JSON}"

ADMIN_BILLING_PROFILE_UPDATE_JSON="${TMP_DIR}/admin-billing-profile-update.json"
jq '{
  organization_name: .organization_name,
  billing_email: .billing_email,
  billing_contact_name: .billing_contact_name,
  tax_id: (.tax_id // null),
  address: .address
}' "${ADMIN_BILLING_PROFILE_JSON}" > "${ADMIN_BILLING_PROFILE_UPDATE_JSON}"

ADMIN_DEPLOYMENT_PROFILE_UPDATE_RESPONSE_JSON="${TMP_DIR}/admin-deployment-profile-update-response.json"
ADMIN_OPERATING_PROFILE_UPDATE_RESPONSE_JSON="${TMP_DIR}/admin-operating-profile-update-response.json"
ADMIN_SOLUTION_PACK_ASSIGNMENTS_UPDATE_RESPONSE_JSON="${TMP_DIR}/admin-solution-pack-assignments-update-response.json"
ADMIN_AUTHORIZATION_CONNECTOR_FEATURE_FLAG_UPDATE_RESPONSE_JSON="${TMP_DIR}/admin-authorization-connector-feature-flag-update-response.json"
ADMIN_ORGANIZATION_PROFILE_UPDATE_RESPONSE_JSON="${TMP_DIR}/admin-organization-profile-update-response.json"
ADMIN_BILLING_PROFILE_UPDATE_RESPONSE_JSON="${TMP_DIR}/admin-billing-profile-update-response.json"

authorized_put_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/configuration/deployment-profile' "${ADMIN_DEPLOYMENT_PROFILE_UPDATE_JSON}" "${ADMIN_DEPLOYMENT_PROFILE_UPDATE_RESPONSE_JSON}"
authorized_put_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/operating-profile' "${ADMIN_OPERATING_PROFILE_UPDATE_JSON}" "${ADMIN_OPERATING_PROFILE_UPDATE_RESPONSE_JSON}"
authorized_put_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/solution-packs/assignments' "${ADMIN_SOLUTION_PACK_ASSIGNMENTS_UPDATE_JSON}" "${ADMIN_SOLUTION_PACK_ASSIGNMENTS_UPDATE_RESPONSE_JSON}"
authorized_put_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/feature-flags/integration.authorization_connector.mode' "${ADMIN_AUTHORIZATION_CONNECTOR_FEATURE_FLAG_UPDATE_JSON}" "${ADMIN_AUTHORIZATION_CONNECTOR_FEATURE_FLAG_UPDATE_RESPONSE_JSON}"
authorized_put_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/account/organization' "${ADMIN_ORGANIZATION_PROFILE_UPDATE_JSON}" "${ADMIN_ORGANIZATION_PROFILE_UPDATE_RESPONSE_JSON}"
authorized_put_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/billing/profile' "${ADMIN_BILLING_PROFILE_UPDATE_JSON}" "${ADMIN_BILLING_PROFILE_UPDATE_RESPONSE_JSON}"

OPERATOR_DEPLOYMENT_PROFILE_JSON="${TMP_DIR}/operator-deployment-profile.json"
OPERATOR_OPERATING_PROFILE_JSON="${TMP_DIR}/operator-operating-profile.json"
OPERATOR_SOLUTION_PACKS_JSON="${TMP_DIR}/operator-solution-packs.json"
OPERATOR_FEATURE_FLAGS_JSON="${TMP_DIR}/operator-feature-flags.json"
OPERATOR_CONTROL_PLANE_CATALOG_JSON="${TMP_DIR}/operator-control-plane-catalog.json"
OPERATOR_ORGANIZATION_PROFILE_DENIED_JSON="${TMP_DIR}/operator-organization-profile-denied.json"
OPERATOR_BILLING_PROFILE_DENIED_JSON="${TMP_DIR}/operator-billing-profile-denied.json"

authorized_get "${OPERATOR_TOKEN}" "${OPERATOR_TENANT_ID}" '/api/v1/control-plane/catalog' "${OPERATOR_CONTROL_PLANE_CATALOG_JSON}"
authorized_get "${OPERATOR_TOKEN}" "${OPERATOR_TENANT_ID}" '/api/v1/configuration/deployment-profile' "${OPERATOR_DEPLOYMENT_PROFILE_JSON}"
authorized_get "${OPERATOR_TOKEN}" "${OPERATOR_TENANT_ID}" '/api/v1/operating-profile' "${OPERATOR_OPERATING_PROFILE_JSON}"
authorized_get "${OPERATOR_TOKEN}" "${OPERATOR_TENANT_ID}" '/api/v1/solution-packs' "${OPERATOR_SOLUTION_PACKS_JSON}"
authorized_get "${OPERATOR_TOKEN}" "${OPERATOR_TENANT_ID}" '/api/v1/feature-flags' "${OPERATOR_FEATURE_FLAGS_JSON}"
forbidden_get "${OPERATOR_TOKEN}" "${OPERATOR_TENANT_ID}" '/api/v1/account/organization' "${OPERATOR_ORGANIZATION_PROFILE_DENIED_JSON}"
forbidden_get "${OPERATOR_TOKEN}" "${OPERATOR_TENANT_ID}" '/api/v1/billing/profile' "${OPERATOR_BILLING_PROFILE_DENIED_JSON}"

OPERATOR_DEPLOYMENT_PROFILE_UPDATE_JSON="${TMP_DIR}/operator-deployment-profile-update.json"
jq '{
  deployment_profile: .current.deployment_profile,
  assurance_mode: .current.assurance_mode,
  identity_mfa_requirement: .current.identity_mfa_requirement,
  data_residency_rule: .current.data_residency_rule,
  support_access_rule: .current.support_access_rule,
  integration_credential_ownership: .current.integration_credential_ownership,
  logging_retention_days: .current.logging_retention_days,
  evidence_retention_days: .current.evidence_retention_days,
  command_center_enabled: .current.command_center_enabled,
  public_program_enabled: .current.public_program_enabled,
  notes: .current.notes
}' "${OPERATOR_DEPLOYMENT_PROFILE_JSON}" > "${OPERATOR_DEPLOYMENT_PROFILE_UPDATE_JSON}"

OPERATOR_OPERATING_PROFILE_UPDATE_JSON="${TMP_DIR}/operator-operating-profile-update.json"
jq '{
  segment_id: .current.segment_id,
  training_entitlement: .current.training_entitlement,
  training_addon_ids: .current.training_addon_ids
}' "${OPERATOR_OPERATING_PROFILE_JSON}" > "${OPERATOR_OPERATING_PROFILE_UPDATE_JSON}"

OPERATOR_SOLUTION_PACK_ASSIGNMENTS_UPDATE_JSON="${TMP_DIR}/operator-solution-pack-assignments-update.json"
jq '{
  pack_ids: .assigned_pack_ids,
  primary_pack_id: .primary_pack_id
}' "${OPERATOR_SOLUTION_PACKS_JSON}" > "${OPERATOR_SOLUTION_PACK_ASSIGNMENTS_UPDATE_JSON}"

OPERATOR_AUTHORIZATION_CONNECTOR_FEATURE_FLAG_UPDATE_JSON="${TMP_DIR}/operator-authorization-connector-feature-flag-update.json"
jq -r '.flags[] | select(.key == "integration.authorization_connector.mode") | .value' "${OPERATOR_FEATURE_FLAGS_JSON}" \
  | jq -R '{value: .}' > "${OPERATOR_AUTHORIZATION_CONNECTOR_FEATURE_FLAG_UPDATE_JSON}"

OPERATOR_ORGANIZATION_PROFILE_UPDATE_JSON="${TMP_DIR}/operator-organization-profile-update.json"
jq '{
  legal_name: "City Ops",
  display_name: "City Ops",
  domain: "civic.example",
  company_size: "11-50"
}' > "${OPERATOR_ORGANIZATION_PROFILE_UPDATE_JSON}"

OPERATOR_BILLING_PROFILE_UPDATE_JSON="${TMP_DIR}/operator-billing-profile-update.json"
jq '{
  organization_name: "Civic Services Office",
  billing_email: "billing@civic.example",
  billing_contact_name: "Civic Services Office",
  address: {
    line1: "1 Civic Plaza",
    city: "Cleveland",
    state: "OH",
    postal_code: "44114",
    country: "US"
  }
}' > "${OPERATOR_BILLING_PROFILE_UPDATE_JSON}"

OPERATOR_DEPLOYMENT_PROFILE_UPDATE_RESPONSE_JSON="${TMP_DIR}/operator-deployment-profile-update-response.json"
OPERATOR_OPERATING_PROFILE_UPDATE_RESPONSE_JSON="${TMP_DIR}/operator-operating-profile-update-response.json"
OPERATOR_SOLUTION_PACK_ASSIGNMENTS_UPDATE_RESPONSE_JSON="${TMP_DIR}/operator-solution-pack-assignments-update-response.json"
OPERATOR_AUTHORIZATION_CONNECTOR_FEATURE_FLAG_UPDATE_RESPONSE_JSON="${TMP_DIR}/operator-authorization-connector-feature-flag-update-response.json"
OPERATOR_ORGANIZATION_PROFILE_UPDATE_RESPONSE_JSON="${TMP_DIR}/operator-organization-profile-update-response.json"
OPERATOR_BILLING_PROFILE_UPDATE_RESPONSE_JSON="${TMP_DIR}/operator-billing-profile-update-response.json"

forbidden_put_json "${OPERATOR_TOKEN}" "${OPERATOR_TENANT_ID}" '/api/v1/configuration/deployment-profile' "${OPERATOR_DEPLOYMENT_PROFILE_UPDATE_JSON}" "${OPERATOR_DEPLOYMENT_PROFILE_UPDATE_RESPONSE_JSON}"
forbidden_put_json "${OPERATOR_TOKEN}" "${OPERATOR_TENANT_ID}" '/api/v1/operating-profile' "${OPERATOR_OPERATING_PROFILE_UPDATE_JSON}" "${OPERATOR_OPERATING_PROFILE_UPDATE_RESPONSE_JSON}"
forbidden_put_json "${OPERATOR_TOKEN}" "${OPERATOR_TENANT_ID}" '/api/v1/solution-packs/assignments' "${OPERATOR_SOLUTION_PACK_ASSIGNMENTS_UPDATE_JSON}" "${OPERATOR_SOLUTION_PACK_ASSIGNMENTS_UPDATE_RESPONSE_JSON}"
forbidden_put_json "${OPERATOR_TOKEN}" "${OPERATOR_TENANT_ID}" '/api/v1/feature-flags/integration.authorization_connector.mode' "${OPERATOR_AUTHORIZATION_CONNECTOR_FEATURE_FLAG_UPDATE_JSON}" "${OPERATOR_AUTHORIZATION_CONNECTOR_FEATURE_FLAG_UPDATE_RESPONSE_JSON}"
forbidden_put_json "${OPERATOR_TOKEN}" "${OPERATOR_TENANT_ID}" '/api/v1/account/organization' "${OPERATOR_ORGANIZATION_PROFILE_UPDATE_JSON}" "${OPERATOR_ORGANIZATION_PROFILE_UPDATE_RESPONSE_JSON}"
forbidden_put_json "${OPERATOR_TOKEN}" "${OPERATOR_TENANT_ID}" '/api/v1/billing/profile' "${OPERATOR_BILLING_PROFILE_UPDATE_JSON}" "${OPERATOR_BILLING_PROFILE_UPDATE_RESPONSE_JSON}"

jq -n \
  --slurpfile adminControlPlane "${ADMIN_CONTROL_PLANE_CATALOG_JSON}" \
  --slurpfile adminDeployment "${ADMIN_DEPLOYMENT_PROFILE_UPDATE_RESPONSE_JSON}" \
  --slurpfile adminOperating "${ADMIN_OPERATING_PROFILE_UPDATE_RESPONSE_JSON}" \
  --slurpfile adminPacks "${ADMIN_SOLUTION_PACK_ASSIGNMENTS_UPDATE_RESPONSE_JSON}" \
  --slurpfile adminFlag "${ADMIN_AUTHORIZATION_CONNECTOR_FEATURE_FLAG_UPDATE_RESPONSE_JSON}" \
  --slurpfile adminOrganization "${ADMIN_ORGANIZATION_PROFILE_UPDATE_RESPONSE_JSON}" \
  --slurpfile adminBilling "${ADMIN_BILLING_PROFILE_UPDATE_RESPONSE_JSON}" \
  --slurpfile operatorControlPlane "${OPERATOR_CONTROL_PLANE_CATALOG_JSON}" \
  --slurpfile operatorDeploymentRead "${OPERATOR_DEPLOYMENT_PROFILE_JSON}" \
  --slurpfile operatorOrganizationDenied "${OPERATOR_ORGANIZATION_PROFILE_DENIED_JSON}" \
  --slurpfile operatorBillingDenied "${OPERATOR_BILLING_PROFILE_DENIED_JSON}" \
  --slurpfile operatorDeploymentDenied "${OPERATOR_DEPLOYMENT_PROFILE_UPDATE_RESPONSE_JSON}" \
  --slurpfile operatorOperatingDenied "${OPERATOR_OPERATING_PROFILE_UPDATE_RESPONSE_JSON}" \
  --slurpfile operatorPacksDenied "${OPERATOR_SOLUTION_PACK_ASSIGNMENTS_UPDATE_RESPONSE_JSON}" \
  --slurpfile operatorFlagDenied "${OPERATOR_AUTHORIZATION_CONNECTOR_FEATURE_FLAG_UPDATE_RESPONSE_JSON}" \
  --slurpfile operatorOrganizationUpdateDenied "${OPERATOR_ORGANIZATION_PROFILE_UPDATE_RESPONSE_JSON}" \
  --slurpfile operatorBillingUpdateDenied "${OPERATOR_BILLING_PROFILE_UPDATE_RESPONSE_JSON}" \
  '{
    admin_token_access: {
      control_plane_catalog_count: $adminControlPlane[0].count,
      deployment_profile: {
        tenant_id: $adminDeployment[0].tenant_id,
        assurance_mode: $adminDeployment[0].current.assurance_mode
      },
      operating_profile: {
        tenant_id: $adminOperating[0].tenant_id,
        segment_id: $adminOperating[0].current.segment_id
      },
      solution_pack_assignments: {
        assigned_pack_ids: $adminPacks[0].assigned_pack_ids,
        primary_pack_id: $adminPacks[0].primary_pack_id
      },
      faa_flag: {
        key: $adminFlag[0].key,
        value: $adminFlag[0].value
      },
      organization_profile: {
        tenant_id: $adminOrganization[0].tenant_id,
        display_name: $adminOrganization[0].display_name
      },
      billing_profile: {
        tenant_id: $adminBilling[0].tenant_id,
        billing_email: $adminBilling[0].billing_email
      }
    },
    operator_token_access: {
      control_plane_catalog_count: $operatorControlPlane[0].count,
      deployment_profile_read_tenant_id: $operatorDeploymentRead[0].tenant_id,
      organization_profile_read_error: $operatorOrganizationDenied[0].error,
      billing_profile_read_error: $operatorBillingDenied[0].error,
      deployment_profile_update_error: $operatorDeploymentDenied[0].error,
      operating_profile_update_error: $operatorOperatingDenied[0].error,
      solution_pack_update_error: $operatorPacksDenied[0].error,
      faa_flag_update_error: $operatorFlagDenied[0].error,
      organization_profile_update_error: $operatorOrganizationUpdateDenied[0].error,
      billing_profile_update_error: $operatorBillingUpdateDenied[0].error
    }
  }'
