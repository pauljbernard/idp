#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
APP_ORIGIN="${APP_ORIGIN:-http://localhost:3004}"
LOGIN_HINT="${LOGIN_HINT:-invite.activation.20260321@example.com}"
FLOW_CONTEXT="invite_activation"
SCOPE="openid profile email roles groups"

CONFIG_JSON="$(curl -fsS "${BASE_URL}/api/v1/auth/iam/config")"
REALM_ID="$(printf '%s' "${CONFIG_JSON}" | jq -r '.realm_id')"
CLIENT_ID="$(printf '%s' "${CONFIG_JSON}" | jq -r '.client_id')"

if [[ -z "${REALM_ID}" || "${REALM_ID}" == "null" || -z "${CLIENT_ID}" || "${CLIENT_ID}" == "null" ]]; then
  echo "Failed to resolve IDP config" >&2
  exit 1
fi

REDIRECT_URI="${APP_ORIGIN}/login/callback"

LOCATION="$(
  curl -fsS -i -G \
    --data-urlencode "response_type=code" \
    --data-urlencode "client_id=${CLIENT_ID}" \
    --data-urlencode "redirect_uri=${REDIRECT_URI}" \
    --data-urlencode "scope=${SCOPE}" \
    --data-urlencode "state=invite-activation-state" \
    --data-urlencode "nonce=invite-activation-nonce" \
    --data-urlencode "code_challenge=invite-activation-challenge" \
    --data-urlencode "code_challenge_method=S256" \
    --data-urlencode "login_hint=${LOGIN_HINT}" \
    --data-urlencode "flow_context=${FLOW_CONTEXT}" \
    "${BASE_URL}/api/v1/iam/realms/${REALM_ID}/protocol/openid-connect/auth" \
    | tr -d '\r' \
    | awk '/^Location: / { print substr($0, 11) }'
)"

if [[ -z "${LOCATION}" ]]; then
  echo "Authorization redirect did not return a Location header" >&2
  exit 1
fi

if [[ "${LOCATION}" != *"/iam/login?"* ]]; then
  echo "Authorization redirect did not target the IAM login surface: ${LOCATION}" >&2
  exit 1
fi

if [[ "${LOCATION}" != *"authorization_request_id="* ]]; then
  echo "Authorization redirect did not include an authorization_request_id: ${LOCATION}" >&2
  exit 1
fi

if [[ "${LOCATION}" != *"login_hint=$(printf '%s' "${LOGIN_HINT}" | jq -sRr @uri)"* ]]; then
  echo "Authorization redirect did not preserve login_hint: ${LOCATION}" >&2
  exit 1
fi

if [[ "${LOCATION}" != *"flow_context=${FLOW_CONTEXT}"* ]]; then
  echo "Authorization redirect did not preserve flow_context: ${LOCATION}" >&2
  exit 1
fi

printf '%s\n' "$(jq -n \
  --arg realm_id "${REALM_ID}" \
  --arg client_id "${CLIENT_ID}" \
  --arg login_hint "${LOGIN_HINT}" \
  --arg flow_context "${FLOW_CONTEXT}" \
  --arg redirect_location "${LOCATION}" \
  '{
    realm_id: $realm_id,
    client_id: $client_id,
    login_hint: $login_hint,
    flow_context: $flow_context,
    redirect_location: $redirect_location
  }'
)"
