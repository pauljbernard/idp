#!/bin/bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
REALM_ID=""
ADMIN_CLIENT_ID=""
ADMIN_CLIENT_SECRET=""
MACHINE_CLIENT_ID="${MACHINE_CLIENT_ID:-machine-api-demo}"
MACHINE_CLIENT_SECRET="${MACHINE_CLIENT_SECRET:-StandaloneIAM!machine-api-demo!Secret2026}"
ADMIN_TENANT_ID="${ADMIN_TENANT_ID:-northstar-holdings}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@idp.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-StandaloneIAM!SuperAdmin2026}"
VIEWER_ROLE_ID="${VIEWER_ROLE_ID:-role-default-service-viewer}"
RUN_ID="${RUN_ID:-$(date +%s)}"

TMP_DIR="$(mktemp -d)"
cleanup() {
  if [[ "${KEEP_TMP_DIR:-0}" == "1" ]]; then
    echo "Keeping tmp dir: ${TMP_DIR}" >&2
    return
  fi
  rm -rf "${TMP_DIR}"
}

ORIGINAL_SERVICE_ACCOUNT_ROLE_IDS_JSON='[]'
ORIGINAL_SERVICE_ACCOUNT_STATUS='ACTIVE'
SERVICE_ACCOUNT_ID=''
ADMIN_TOKEN=''

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
  curl -sS -o "${auth_config_json}" "${API_BASE_URL}/api/v1/auth/iam/config"
  REALM_ID="$(jq -r '.realm_id' "${auth_config_json}")"
  ADMIN_CLIENT_ID="$(jq -r '.client_id' "${auth_config_json}")"
  ADMIN_CLIENT_SECRET="StandaloneIAM!${ADMIN_CLIENT_ID}!Secret2026"
}

issue_password_grant_token() {
  local label="$1"
  local email="$2"
  local password="$3"
  local token_response_json="${TMP_DIR}/${label}-token.json"
  local basic_auth
  basic_auth="$(printf '%s' "${ADMIN_CLIENT_ID}:${ADMIN_CLIENT_SECRET}" | base64 | tr -d '\n')"

  curl -sS -o "${token_response_json}" \
    -X POST "${API_BASE_URL}/api/v1/iam/realms/${REALM_ID}/protocol/openid-connect/token" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    -H "Authorization: Basic ${basic_auth}" \
    --data-urlencode 'grant_type=password' \
    --data-urlencode "client_id=${ADMIN_CLIENT_ID}" \
    --data-urlencode "username=${email}" \
    --data-urlencode "password=${password}" \
    --data-urlencode 'scope=openid profile email roles groups'

  jq -e '.access_token != null and .token_type == "Bearer"' "${token_response_json}" > /dev/null
  jq -r '.access_token' "${token_response_json}"
}

issue_client_credentials_token() {
  local label="$1"
  local client_id="$2"
  local client_secret="$3"
  local token_response_json="${TMP_DIR}/${label}-token.json"
  local basic_auth
  basic_auth="$(printf '%s' "${client_id}:${client_secret}" | base64 | tr -d '\n')"

  curl -sS -o "${token_response_json}" \
    -X POST "${API_BASE_URL}/api/v1/iam/realms/${REALM_ID}/protocol/openid-connect/token" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    -H "Authorization: Basic ${basic_auth}" \
    --data-urlencode 'grant_type=client_credentials' \
    --data-urlencode "client_id=${client_id}" \
    --data-urlencode 'scope=roles groups'

  jq -e '.access_token != null and .token_type == "Bearer"' "${token_response_json}" > /dev/null
  jq -r '.access_token' "${token_response_json}"
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

authorized_post_json() {
  local token="$1"
  local tenant_id="$2"
  local path="$3"
  local request_json="$4"
  local output_json="$5"
  local expected_status="${6:-200}"
  local status
  status="$(curl -sS -o "${output_json}" -w '%{http_code}' \
    -X POST "${API_BASE_URL}${path}" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${token}" \
    -H "X-Tenant-ID: ${tenant_id}" \
    --data @"${request_json}")"
  assert_status "${status}" "${expected_status}" "POST ${path}"
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

forbidden_post_json() {
  local token="$1"
  local tenant_id="$2"
  local path="$3"
  local request_json="$4"
  local output_json="$5"
  local status
  status="$(curl -sS -o "${output_json}" -w '%{http_code}' \
    -X POST "${API_BASE_URL}${path}" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${token}" \
    -H "X-Tenant-ID: ${tenant_id}" \
    --data @"${request_json}")"
  assert_status "${status}" "403" "POST ${path}"
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

restore_service_account() {
  if [[ -z "${SERVICE_ACCOUNT_ID}" || -z "${ADMIN_TOKEN}" ]]; then
    return
  fi

  local restore_request_json="${TMP_DIR}/service-account-restore-request.json"
  jq -n \
    --argjson role_ids "${ORIGINAL_SERVICE_ACCOUNT_ROLE_IDS_JSON}" \
    --arg status "${ORIGINAL_SERVICE_ACCOUNT_STATUS}" \
    '{
      role_ids: $role_ids,
      status: $status
    }' > "${restore_request_json}"

  curl -sS -o /dev/null \
    -X PUT "${API_BASE_URL}/api/v1/iam/service-accounts/${SERVICE_ACCOUNT_ID}" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    --data @"${restore_request_json}" || true
}

on_exit() {
  restore_service_account
  cleanup
}
trap on_exit EXIT

resolve_auth_config
ADMIN_TOKEN="$(issue_password_grant_token "workflow-admin" "${ADMIN_EMAIL}" "${ADMIN_PASSWORD}")"

SERVICE_ACCOUNTS_JSON="${TMP_DIR}/service-accounts.json"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/iam/service-accounts?realm_id=${REALM_ID}" "${SERVICE_ACCOUNTS_JSON}"
SERVICE_ACCOUNT_ID="$(jq -r --arg client_id "${MACHINE_CLIENT_ID}" '.service_accounts[] | select(.client_id == $client_id) | .id' "${SERVICE_ACCOUNTS_JSON}" | head -n 1)"
if [[ -z "${SERVICE_ACCOUNT_ID}" ]]; then
  echo "Unable to resolve machine service account for ${MACHINE_CLIENT_ID}" >&2
  exit 1
fi
ORIGINAL_SERVICE_ACCOUNT_ROLE_IDS_JSON="$(jq -c --arg client_id "${MACHINE_CLIENT_ID}" '.service_accounts[] | select(.client_id == $client_id) | .role_ids' "${SERVICE_ACCOUNTS_JSON}" | head -n 1)"
ORIGINAL_SERVICE_ACCOUNT_STATUS="$(jq -r --arg client_id "${MACHINE_CLIENT_ID}" '.service_accounts[] | select(.client_id == $client_id) | .status' "${SERVICE_ACCOUNTS_JSON}" | head -n 1)"

VIEWER_ASSIGNMENT_REQUEST_JSON="${TMP_DIR}/service-account-viewer-request.json"
jq -n \
  --arg viewer_role_id "${VIEWER_ROLE_ID}" \
  '{
    role_ids: [$viewer_role_id],
    status: "ACTIVE"
  }' > "${VIEWER_ASSIGNMENT_REQUEST_JSON}"

VIEWER_ASSIGNMENT_RESPONSE_JSON="${TMP_DIR}/service-account-viewer-response.json"
authorized_put_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/iam/service-accounts/${SERVICE_ACCOUNT_ID}" "${VIEWER_ASSIGNMENT_REQUEST_JSON}" "${VIEWER_ASSIGNMENT_RESPONSE_JSON}"

VIEWER_MACHINE_TOKEN="$(issue_client_credentials_token "workflow-viewer-machine" "${MACHINE_CLIENT_ID}" "${MACHINE_CLIENT_SECRET}")"

ADMIN_CLIENT_CREATE_REQUEST_JSON="${TMP_DIR}/admin-client-create-request.json"
jq -n \
  --arg name "IAM Workflow Client ${RUN_ID}" \
  '{
    name: $name,
    status: "ACTIVE",
    vertical: "INSPECTION",
    preferred_pack_id: "INSPECTION",
    primary_contact_name: "Workflow Admin",
    primary_contact_email: "workflow-admin@example.com",
    billing_city: "San Francisco, CA",
    tags: ["iam", "workflow", "verification"]
  }' > "${ADMIN_CLIENT_CREATE_REQUEST_JSON}"

ADMIN_CLIENT_CREATE_RESPONSE_JSON="${TMP_DIR}/admin-client-create-response.json"
authorized_post_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/clients' "${ADMIN_CLIENT_CREATE_REQUEST_JSON}" "${ADMIN_CLIENT_CREATE_RESPONSE_JSON}" "201"
CLIENT_ID_CREATED="$(jq -r '.id' "${ADMIN_CLIENT_CREATE_RESPONSE_JSON}")"

ADMIN_CLIENT_LIST_JSON="${TMP_DIR}/admin-client-list.json"
ADMIN_CLIENT_DETAIL_JSON="${TMP_DIR}/admin-client-detail.json"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/clients' "${ADMIN_CLIENT_LIST_JSON}"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/clients/${CLIENT_ID_CREATED}" "${ADMIN_CLIENT_DETAIL_JSON}"

ADMIN_CLIENT_UPDATE_REQUEST_JSON="${TMP_DIR}/admin-client-update-request.json"
jq -n \
  --arg name "IAM Workflow Client ${RUN_ID} Updated" \
  '{
    name: $name,
    status: "ACTIVE",
    notes: "Updated through IAM workflow verifier."
  }' > "${ADMIN_CLIENT_UPDATE_REQUEST_JSON}"

ADMIN_CLIENT_UPDATE_RESPONSE_JSON="${TMP_DIR}/admin-client-update-response.json"
authorized_put_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/clients/${CLIENT_ID_CREATED}" "${ADMIN_CLIENT_UPDATE_REQUEST_JSON}" "${ADMIN_CLIENT_UPDATE_RESPONSE_JSON}"

ADMIN_PROJECT_CREATE_REQUEST_JSON="${TMP_DIR}/admin-project-create-request.json"
jq -n \
  --arg client_id "${CLIENT_ID_CREATED}" \
  --arg name "IAM Workflow Project ${RUN_ID}" \
  '{
    client_id: $client_id,
    name: $name,
    pack_id: "INSPECTION",
    deliverable_profile: "inspection-report",
    objective: "Validate missions.read and missions.write on workflow routes.",
    location_name: "Verification Site",
    location_address: "123 Validation Way",
    tags: ["iam", "workflow", "verification"]
  }' > "${ADMIN_PROJECT_CREATE_REQUEST_JSON}"

ADMIN_PROJECT_CREATE_RESPONSE_JSON="${TMP_DIR}/admin-project-create-response.json"
authorized_post_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/projects' "${ADMIN_PROJECT_CREATE_REQUEST_JSON}" "${ADMIN_PROJECT_CREATE_RESPONSE_JSON}" "201"
PROJECT_ID_CREATED="$(jq -r '.id' "${ADMIN_PROJECT_CREATE_RESPONSE_JSON}")"
PROJECT_ARTIFACT_ID="$(jq -r '.workflow_artifacts[0].id' "${ADMIN_PROJECT_CREATE_RESPONSE_JSON}")"

ADMIN_PROJECT_LIST_JSON="${TMP_DIR}/admin-project-list.json"
ADMIN_PROJECT_DETAIL_JSON="${TMP_DIR}/admin-project-detail.json"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/projects' "${ADMIN_PROJECT_LIST_JSON}"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/projects/${PROJECT_ID_CREATED}" "${ADMIN_PROJECT_DETAIL_JSON}"

ADMIN_PROJECT_UPDATE_REQUEST_JSON="${TMP_DIR}/admin-project-update-request.json"
jq -n \
  --arg name "IAM Workflow Project ${RUN_ID} Active" \
  '{
    name: $name,
    status: "ACTIVE",
    objective: "Workflow authorization verified against standalone IAM bearer tokens."
  }' > "${ADMIN_PROJECT_UPDATE_REQUEST_JSON}"

ADMIN_PROJECT_UPDATE_RESPONSE_JSON="${TMP_DIR}/admin-project-update-response.json"
authorized_put_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/projects/${PROJECT_ID_CREATED}" "${ADMIN_PROJECT_UPDATE_REQUEST_JSON}" "${ADMIN_PROJECT_UPDATE_RESPONSE_JSON}"

ADMIN_PROJECT_ARTIFACT_UPDATE_REQUEST_JSON="${TMP_DIR}/admin-project-artifact-update-request.json"
jq -n '{status: "IN_PROGRESS"}' > "${ADMIN_PROJECT_ARTIFACT_UPDATE_REQUEST_JSON}"

ADMIN_PROJECT_ARTIFACT_UPDATE_RESPONSE_JSON="${TMP_DIR}/admin-project-artifact-update-response.json"
authorized_post_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/projects/${PROJECT_ID_CREATED}/artifacts/${PROJECT_ARTIFACT_ID}/status" "${ADMIN_PROJECT_ARTIFACT_UPDATE_REQUEST_JSON}" "${ADMIN_PROJECT_ARTIFACT_UPDATE_RESPONSE_JSON}"

ADMIN_WORKFLOW_ASSET_CREATE_REQUEST_JSON="${TMP_DIR}/admin-workflow-asset-create-request.json"
jq -n \
  --arg project_id "${PROJECT_ID_CREATED}" \
  --arg name "IAM Workflow Asset ${RUN_ID}" \
  '{
    project_id: $project_id,
    kind: "INSPECTION_TARGET",
    name: $name,
    status: "ACTIVE",
    summary: "Created to verify workflow asset authorization.",
    tags: ["iam", "workflow", "verification"],
    attributes: {
      verification: true
    }
  }' > "${ADMIN_WORKFLOW_ASSET_CREATE_REQUEST_JSON}"

ADMIN_WORKFLOW_ASSET_CREATE_RESPONSE_JSON="${TMP_DIR}/admin-workflow-asset-create-response.json"
authorized_post_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/workflow-assets' "${ADMIN_WORKFLOW_ASSET_CREATE_REQUEST_JSON}" "${ADMIN_WORKFLOW_ASSET_CREATE_RESPONSE_JSON}" "201"
WORKFLOW_ASSET_ID_CREATED="$(jq -r '.id' "${ADMIN_WORKFLOW_ASSET_CREATE_RESPONSE_JSON}")"

ADMIN_WORKFLOW_ASSET_LIST_JSON="${TMP_DIR}/admin-workflow-asset-list.json"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/workflow-assets?project_id=${PROJECT_ID_CREATED}" "${ADMIN_WORKFLOW_ASSET_LIST_JSON}"

ADMIN_WORKFLOW_ASSET_UPDATE_REQUEST_JSON="${TMP_DIR}/admin-workflow-asset-update-request.json"
jq -n \
  --arg name "IAM Workflow Asset ${RUN_ID} Ready" \
  '{
    name: $name,
    status: "READY",
    summary: "Updated through IAM workflow verifier."
  }' > "${ADMIN_WORKFLOW_ASSET_UPDATE_REQUEST_JSON}"

ADMIN_WORKFLOW_ASSET_UPDATE_RESPONSE_JSON="${TMP_DIR}/admin-workflow-asset-update-response.json"
authorized_put_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/workflow-assets/${WORKFLOW_ASSET_ID_CREATED}" "${ADMIN_WORKFLOW_ASSET_UPDATE_REQUEST_JSON}" "${ADMIN_WORKFLOW_ASSET_UPDATE_RESPONSE_JSON}"

ADMIN_DELIVERABLE_TEMPLATE_LIST_JSON="${TMP_DIR}/admin-deliverable-template-list.json"
ADMIN_PROJECT_DELIVERABLE_TEMPLATE_LIST_JSON="${TMP_DIR}/admin-project-deliverable-template-list.json"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/deliverable-templates' "${ADMIN_DELIVERABLE_TEMPLATE_LIST_JSON}"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/projects/${PROJECT_ID_CREATED}/deliverable-templates" "${ADMIN_PROJECT_DELIVERABLE_TEMPLATE_LIST_JSON}"

ADMIN_DELIVERABLE_CREATE_REQUEST_JSON="${TMP_DIR}/admin-deliverable-create-request.json"
jq -n \
  --arg project_id "${PROJECT_ID_CREATED}" \
  --arg title "IAM Workflow Deliverable ${RUN_ID}" \
  '{
    project_id: $project_id,
    title: $title,
    deliverable_profile: "inspection-report",
    format: "PDF",
    audience: "CLIENT",
    summary: "Deliverable created to verify IAM-backed missions.write."
  }' > "${ADMIN_DELIVERABLE_CREATE_REQUEST_JSON}"

ADMIN_DELIVERABLE_CREATE_RESPONSE_JSON="${TMP_DIR}/admin-deliverable-create-response.json"
authorized_post_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/deliverables' "${ADMIN_DELIVERABLE_CREATE_REQUEST_JSON}" "${ADMIN_DELIVERABLE_CREATE_RESPONSE_JSON}" "201"
DELIVERABLE_ID_CREATED="$(jq -r '.id' "${ADMIN_DELIVERABLE_CREATE_RESPONSE_JSON}")"

ADMIN_DELIVERABLE_LIST_JSON="${TMP_DIR}/admin-deliverable-list.json"
ADMIN_DELIVERABLE_DETAIL_JSON="${TMP_DIR}/admin-deliverable-detail.json"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/deliverables?project_id=${PROJECT_ID_CREATED}" "${ADMIN_DELIVERABLE_LIST_JSON}"
authorized_get "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/deliverables/${DELIVERABLE_ID_CREATED}" "${ADMIN_DELIVERABLE_DETAIL_JSON}"

ADMIN_DELIVERABLE_PUBLISH_REQUEST_JSON="${TMP_DIR}/admin-deliverable-publish-request.json"
jq -n '{}' > "${ADMIN_DELIVERABLE_PUBLISH_REQUEST_JSON}"

ADMIN_DELIVERABLE_PUBLISH_RESPONSE_JSON="${TMP_DIR}/admin-deliverable-publish-response.json"
authorized_post_json "${ADMIN_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/deliverables/${DELIVERABLE_ID_CREATED}/publish" "${ADMIN_DELIVERABLE_PUBLISH_REQUEST_JSON}" "${ADMIN_DELIVERABLE_PUBLISH_RESPONSE_JSON}"

VIEWER_CLIENT_LIST_JSON="${TMP_DIR}/viewer-client-list.json"
VIEWER_CLIENT_DETAIL_JSON="${TMP_DIR}/viewer-client-detail.json"
VIEWER_PROJECT_LIST_JSON="${TMP_DIR}/viewer-project-list.json"
VIEWER_PROJECT_DETAIL_JSON="${TMP_DIR}/viewer-project-detail.json"
VIEWER_WORKFLOW_ASSET_LIST_JSON="${TMP_DIR}/viewer-workflow-asset-list.json"
VIEWER_DELIVERABLE_TEMPLATE_LIST_JSON="${TMP_DIR}/viewer-deliverable-template-list.json"
VIEWER_PROJECT_DELIVERABLE_TEMPLATE_LIST_JSON="${TMP_DIR}/viewer-project-deliverable-template-list.json"
VIEWER_DELIVERABLE_LIST_JSON="${TMP_DIR}/viewer-deliverable-list.json"
VIEWER_DELIVERABLE_DETAIL_JSON="${TMP_DIR}/viewer-deliverable-detail.json"

authorized_get "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/clients' "${VIEWER_CLIENT_LIST_JSON}"
authorized_get "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/clients/${CLIENT_ID_CREATED}" "${VIEWER_CLIENT_DETAIL_JSON}"
authorized_get "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/projects' "${VIEWER_PROJECT_LIST_JSON}"
authorized_get "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/projects/${PROJECT_ID_CREATED}" "${VIEWER_PROJECT_DETAIL_JSON}"
authorized_get "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/workflow-assets?project_id=${PROJECT_ID_CREATED}" "${VIEWER_WORKFLOW_ASSET_LIST_JSON}"
authorized_get "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/deliverable-templates' "${VIEWER_DELIVERABLE_TEMPLATE_LIST_JSON}"
authorized_get "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/projects/${PROJECT_ID_CREATED}/deliverable-templates" "${VIEWER_PROJECT_DELIVERABLE_TEMPLATE_LIST_JSON}"
authorized_get "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/deliverables?project_id=${PROJECT_ID_CREATED}" "${VIEWER_DELIVERABLE_LIST_JSON}"
authorized_get "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/deliverables/${DELIVERABLE_ID_CREATED}" "${VIEWER_DELIVERABLE_DETAIL_JSON}"

VIEWER_CLIENT_CREATE_DENIED_JSON="${TMP_DIR}/viewer-client-create-denied.json"
VIEWER_CLIENT_UPDATE_DENIED_JSON="${TMP_DIR}/viewer-client-update-denied.json"
VIEWER_PROJECT_CREATE_DENIED_JSON="${TMP_DIR}/viewer-project-create-denied.json"
VIEWER_PROJECT_UPDATE_DENIED_JSON="${TMP_DIR}/viewer-project-update-denied.json"
VIEWER_PROJECT_ARTIFACT_UPDATE_DENIED_JSON="${TMP_DIR}/viewer-project-artifact-update-denied.json"
VIEWER_WORKFLOW_ASSET_CREATE_DENIED_JSON="${TMP_DIR}/viewer-workflow-asset-create-denied.json"
VIEWER_WORKFLOW_ASSET_UPDATE_DENIED_JSON="${TMP_DIR}/viewer-workflow-asset-update-denied.json"
VIEWER_DELIVERABLE_CREATE_DENIED_JSON="${TMP_DIR}/viewer-deliverable-create-denied.json"
VIEWER_DELIVERABLE_PUBLISH_DENIED_JSON="${TMP_DIR}/viewer-deliverable-publish-denied.json"

forbidden_post_json "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/clients' "${ADMIN_CLIENT_CREATE_REQUEST_JSON}" "${VIEWER_CLIENT_CREATE_DENIED_JSON}"
forbidden_put_json "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/clients/${CLIENT_ID_CREATED}" "${ADMIN_CLIENT_UPDATE_REQUEST_JSON}" "${VIEWER_CLIENT_UPDATE_DENIED_JSON}"
forbidden_post_json "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/projects' "${ADMIN_PROJECT_CREATE_REQUEST_JSON}" "${VIEWER_PROJECT_CREATE_DENIED_JSON}"
forbidden_put_json "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/projects/${PROJECT_ID_CREATED}" "${ADMIN_PROJECT_UPDATE_REQUEST_JSON}" "${VIEWER_PROJECT_UPDATE_DENIED_JSON}"
forbidden_post_json "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/projects/${PROJECT_ID_CREATED}/artifacts/${PROJECT_ARTIFACT_ID}/status" "${ADMIN_PROJECT_ARTIFACT_UPDATE_REQUEST_JSON}" "${VIEWER_PROJECT_ARTIFACT_UPDATE_DENIED_JSON}"
forbidden_post_json "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/workflow-assets' "${ADMIN_WORKFLOW_ASSET_CREATE_REQUEST_JSON}" "${VIEWER_WORKFLOW_ASSET_CREATE_DENIED_JSON}"
forbidden_put_json "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/workflow-assets/${WORKFLOW_ASSET_ID_CREATED}" "${ADMIN_WORKFLOW_ASSET_UPDATE_REQUEST_JSON}" "${VIEWER_WORKFLOW_ASSET_UPDATE_DENIED_JSON}"
forbidden_post_json "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" '/api/v1/deliverables' "${ADMIN_DELIVERABLE_CREATE_REQUEST_JSON}" "${VIEWER_DELIVERABLE_CREATE_DENIED_JSON}"
forbidden_post_json "${VIEWER_MACHINE_TOKEN}" "${ADMIN_TENANT_ID}" "/api/v1/deliverables/${DELIVERABLE_ID_CREATED}/publish" "${ADMIN_DELIVERABLE_PUBLISH_REQUEST_JSON}" "${VIEWER_DELIVERABLE_PUBLISH_DENIED_JSON}"

jq -e --arg client_id "${CLIENT_ID_CREATED}" '.clients[] | select(.id == $client_id)' "${ADMIN_CLIENT_LIST_JSON}" > /dev/null
jq -e --arg client_id "${CLIENT_ID_CREATED}" '.id == $client_id and (.name | length > 0)' "${ADMIN_CLIENT_DETAIL_JSON}" > /dev/null
jq -e --arg project_id "${PROJECT_ID_CREATED}" '.projects[] | select(.id == $project_id)' "${ADMIN_PROJECT_LIST_JSON}" > /dev/null
jq -e --arg project_id "${PROJECT_ID_CREATED}" '.id == $project_id and (.workflow_artifacts | length >= 1)' "${ADMIN_PROJECT_DETAIL_JSON}" > /dev/null
jq -e --arg asset_id "${WORKFLOW_ASSET_ID_CREATED}" '.workflow_assets[] | select(.id == $asset_id)' "${ADMIN_WORKFLOW_ASSET_LIST_JSON}" > /dev/null
jq -e '.count >= 1 and (.templates | length >= 1)' "${ADMIN_DELIVERABLE_TEMPLATE_LIST_JSON}" > /dev/null
jq -e '.count >= 1 and .recommended_template_id != null' "${ADMIN_PROJECT_DELIVERABLE_TEMPLATE_LIST_JSON}" > /dev/null
jq -e --arg deliverable_id "${DELIVERABLE_ID_CREATED}" '.deliverables[] | select(.id == $deliverable_id)' "${ADMIN_DELIVERABLE_LIST_JSON}" > /dev/null
jq -e --arg deliverable_id "${DELIVERABLE_ID_CREATED}" '.id == $deliverable_id and (.status != null)' "${ADMIN_DELIVERABLE_DETAIL_JSON}" > /dev/null
jq -e '.status == "PUBLISHED" and .published_at != null' "${ADMIN_DELIVERABLE_PUBLISH_RESPONSE_JSON}" > /dev/null

jq -e --arg client_id "${CLIENT_ID_CREATED}" '.clients[] | select(.id == $client_id)' "${VIEWER_CLIENT_LIST_JSON}" > /dev/null
jq -e --arg project_id "${PROJECT_ID_CREATED}" '.projects[] | select(.id == $project_id)' "${VIEWER_PROJECT_LIST_JSON}" > /dev/null
jq -e --arg asset_id "${WORKFLOW_ASSET_ID_CREATED}" '.workflow_assets[] | select(.id == $asset_id)' "${VIEWER_WORKFLOW_ASSET_LIST_JSON}" > /dev/null
jq -e --arg deliverable_id "${DELIVERABLE_ID_CREATED}" '.deliverables[] | select(.id == $deliverable_id)' "${VIEWER_DELIVERABLE_LIST_JSON}" > /dev/null

jq -n \
  --slurpfile viewerAssignment "${VIEWER_ASSIGNMENT_RESPONSE_JSON}" \
  --slurpfile adminClient "${ADMIN_CLIENT_CREATE_RESPONSE_JSON}" \
  --slurpfile adminProject "${ADMIN_PROJECT_CREATE_RESPONSE_JSON}" \
  --slurpfile adminAsset "${ADMIN_WORKFLOW_ASSET_CREATE_RESPONSE_JSON}" \
  --slurpfile adminTemplate "${ADMIN_PROJECT_DELIVERABLE_TEMPLATE_LIST_JSON}" \
  --slurpfile adminDeliverable "${ADMIN_DELIVERABLE_PUBLISH_RESPONSE_JSON}" \
  --slurpfile viewerClientDenied "${VIEWER_CLIENT_CREATE_DENIED_JSON}" \
  --slurpfile viewerProjectDenied "${VIEWER_PROJECT_CREATE_DENIED_JSON}" \
  --slurpfile viewerArtifactDenied "${VIEWER_PROJECT_ARTIFACT_UPDATE_DENIED_JSON}" \
  --slurpfile viewerAssetDenied "${VIEWER_WORKFLOW_ASSET_CREATE_DENIED_JSON}" \
  --slurpfile viewerDeliverableDenied "${VIEWER_DELIVERABLE_CREATE_DENIED_JSON}" \
  --slurpfile viewerPublishDenied "${VIEWER_DELIVERABLE_PUBLISH_DENIED_JSON}" \
  '{
    admin_token_access: {
      service_account_role_ids: $viewerAssignment[0].role_ids,
      client_id: $adminClient[0].id,
      project_id: $adminProject[0].id,
      workflow_asset_id: $adminAsset[0].id,
      recommended_template_id: $adminTemplate[0].recommended_template_id,
      published_deliverable_status: $adminDeliverable[0].status
    },
    viewer_machine_access: {
      create_client_error: $viewerClientDenied[0].error,
      create_project_error: $viewerProjectDenied[0].error,
      update_artifact_error: $viewerArtifactDenied[0].error,
      create_workflow_asset_error: $viewerAssetDenied[0].error,
      create_deliverable_error: $viewerDeliverableDenied[0].error,
      publish_deliverable_error: $viewerPublishDenied[0].error
    }
  }'
