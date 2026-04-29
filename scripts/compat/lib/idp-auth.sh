#!/usr/bin/env bash

set -euo pipefail

idp_compute_pkce_challenge() {
  printf '%s' "$1" \
    | openssl dgst -binary -sha256 \
    | openssl base64 -A \
    | tr '+/' '-_' \
    | tr -d '='
}

idp_extract_query_param() {
  local url="$1"
  local param_name="$2"
  printf '%s' "${url}" | sed -n "s/.*[?&]${param_name}=\([^&]*\).*/\1/p"
}

idp_issue_iam_browser_token_json() {
  local base_url="$1"
  local email="$2"
  local password="$3"
  local ui_base_url="${4:-http://localhost:3004}"
  local curl_bin="${CURL_BIN:-/usr/bin/curl}"
  local jq_bin="${JQ_BIN:-$(command -v jq)}"
  local redirect_uri="${ui_base_url%/}/login/callback"
  local tmp_dir

  tmp_dir="$(mktemp -d)"

  local auth_config_json="${tmp_dir}/auth-config.json"
  local auth_headers="${tmp_dir}/auth-headers.txt"
  local login_request_json="${tmp_dir}/login-request.json"
  local login_response_json="${tmp_dir}/login-response.json"
  local consent_request_json="${tmp_dir}/consent-request.json"
  local consent_response_json="${tmp_dir}/consent-response.json"
  local continue_request_json="${tmp_dir}/continue-request.json"
  local continue_response_json="${tmp_dir}/continue-response.json"
  local token_response_json="${tmp_dir}/token-response.json"

  "$curl_bin" -sS -o "${auth_config_json}" "${base_url}/api/v1/auth/iam/config"

  local realm_id
  local client_id
  realm_id="$("$jq_bin" -r '.realm_id' "${auth_config_json}")"
  client_id="$("$jq_bin" -r '.client_id' "${auth_config_json}")"

  local code_verifier="idp-verifier-$(date +%s%N)"
  local code_challenge
  code_challenge="$(idp_compute_pkce_challenge "${code_verifier}")"
  local state="idp-state-$(date +%s%N)"
  local nonce="idp-nonce-$(date +%s%N)"

  "$curl_bin" -sS -D "${auth_headers}" -o /dev/null -G \
    "${base_url}/api/v1/iam/realms/${realm_id}/protocol/openid-connect/auth" \
    --data-urlencode "response_type=code" \
    --data-urlencode "client_id=${client_id}" \
    --data-urlencode "redirect_uri=${redirect_uri}" \
    --data-urlencode "scope=openid profile email roles groups" \
    --data-urlencode "state=${state}" \
    --data-urlencode "nonce=${nonce}" \
    --data-urlencode "code_challenge=${code_challenge}" \
    --data-urlencode "code_challenge_method=S256"

  local authorization_redirect_url
  local authorization_request_id
  authorization_redirect_url="$(awk 'tolower($1) == "location:" { sub(/\r$/, "", $2); print $2 }' "${auth_headers}")"
  authorization_request_id="$(idp_extract_query_param "${authorization_redirect_url}" "authorization_request_id")"

  "$jq_bin" -n \
    --arg username "${email}" \
    --arg password "${password}" \
    --arg client_id "${client_id}" \
    '{username: $username, password: $password, client_id: $client_id, scope: ["openid", "profile", "email", "roles", "groups"]}' \
    > "${login_request_json}"

  "$curl_bin" -sS -o "${login_response_json}" \
    -X POST "${base_url}/api/v1/iam/realms/${realm_id}/login" \
    -H 'Content-Type: application/json' \
    --data @"${login_request_json}"

  local resolved_login_json="${login_response_json}"
  local next_step
  next_step="$("$jq_bin" -r '.next_step // empty' "${login_response_json}")"
  if [[ "${next_step}" == "CONSENT_REQUIRED" ]]; then
    "$jq_bin" -n \
      --arg login_transaction_id "$("$jq_bin" -r '.login_transaction_id' "${login_response_json}")" \
      '{login_transaction_id: $login_transaction_id, approve: true}' \
      > "${consent_request_json}"

    "$curl_bin" -sS -o "${consent_response_json}" \
      -X POST "${base_url}/api/v1/iam/realms/${realm_id}/login/consent" \
      -H 'Content-Type: application/json' \
      --data @"${consent_request_json}"

    resolved_login_json="${consent_response_json}"
  fi

  local provider_session_id
  provider_session_id="$("$jq_bin" -r '.session_id // empty' "${resolved_login_json}")"

  "$jq_bin" -n \
    --arg authorization_request_id "${authorization_request_id}" \
    '{authorization_request_id: $authorization_request_id}' \
    > "${continue_request_json}"

  "$curl_bin" -sS -o "${continue_response_json}" \
    -X POST "${base_url}/api/v1/iam/realms/${realm_id}/protocol/openid-connect/auth/continue" \
    -H 'Content-Type: application/json' \
    -H "x-iam-session-id: ${provider_session_id}" \
    --data @"${continue_request_json}"

  local authorization_code_redirect
  local authorization_code
  authorization_code_redirect="$("$jq_bin" -r '.redirect_url // empty' "${continue_response_json}")"
  authorization_code="$(idp_extract_query_param "${authorization_code_redirect}" "code")"

  "$curl_bin" -sS -o "${token_response_json}" \
    -X POST "${base_url}/api/v1/iam/realms/${realm_id}/protocol/openid-connect/token" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "grant_type=authorization_code" \
    --data-urlencode "client_id=${client_id}" \
    --data-urlencode "code=${authorization_code}" \
    --data-urlencode "redirect_uri=${redirect_uri}" \
    --data-urlencode "code_verifier=${code_verifier}"

  "$jq_bin" -n \
    --arg account_session_id "${provider_session_id}" \
    --slurpfile token "${token_response_json}" \
    '
      ($token[0] // {}) + {
        account_session_id: (if $account_session_id != "" then $account_session_id else null end)
      }
    '
  rm -rf "${tmp_dir}"
}

idp_emit_auth_headers() {
  local login_json_source="$1"
  local tenant_id="${2:-}"
  local jq_bin="${JQ_BIN:-$(command -v jq)}"
  local login_json

  if [[ -f "${login_json_source}" ]]; then
    login_json="$(cat "${login_json_source}")"
  else
    login_json="${login_json_source}"
  fi

  local access_token
  access_token="$(printf '%s' "${login_json}" | "${jq_bin}" -r '.iam.access_token // empty')"
  if [[ -n "${access_token}" && "${access_token}" != "null" ]]; then
    printf 'Authorization: Bearer %s\n' "${access_token}"
    if [[ -n "${tenant_id}" ]]; then
      printf 'X-Tenant-ID: %s\n' "${tenant_id}"
    fi
    return 0
  fi

  local session_id
  local user_id
  session_id="$(printf '%s' "${login_json}" | "${jq_bin}" -r '.auth.session_id // empty')"
  user_id="$(printf '%s' "${login_json}" | "${jq_bin}" -r '.auth.user_id // empty')"

  if [[ -n "${session_id}" && "${session_id}" != "null" ]]; then
    printf 'X-Session-ID: %s\n' "${session_id}"
  fi
  if [[ -n "${user_id}" && "${user_id}" != "null" ]]; then
    printf 'X-User-ID: %s\n' "${user_id}"
  fi
  if [[ -n "${tenant_id}" ]]; then
    printf 'X-Tenant-ID: %s\n' "${tenant_id}"
  fi
}

idp_login_json() {
  local base_url="$1"
  local email="$2"
  local password="$3"
  local requested_tenant_id="${4:-}"
  local auth_mode="${5:-standalone_iam}"
  local ui_base_url="${6:-http://localhost:3004}"
  local curl_bin="${CURL_BIN:-/usr/bin/curl}"
  local jq_bin="${JQ_BIN:-$(command -v jq)}"
  local redirect_uri="${ui_base_url%/}/login/callback"
  local tmp_dir

  tmp_dir="$(mktemp -d)"

  if [[ "${auth_mode}" == "local" ]]; then
    local login_request_json="${tmp_dir}/login-request.json"
    local login_response_json="${tmp_dir}/login-response.json"

    "$jq_bin" -n \
      --arg email "${email}" \
      --arg password "${password}" \
      --arg tenant_id "${requested_tenant_id}" \
      '{
        email: $email,
        password: $password
      } + (if $tenant_id != "" then {tenant_id: $tenant_id} else {} end)' \
      > "${login_request_json}"

    "$curl_bin" -sS -o "${login_response_json}" \
      -X POST "${base_url}/api/v1/auth/login" \
      -H 'Content-Type: application/json' \
      --data @"${login_request_json}"

    cat "${login_response_json}"
    rm -rf "${tmp_dir}"
    return
  fi

  local auth_config_json="${tmp_dir}/auth-config.json"
  local token_response_json="${tmp_dir}/token-response.json"
  local auth_session_json="${tmp_dir}/auth-session.json"

  "$curl_bin" -sS -o "${auth_config_json}" "${base_url}/api/v1/auth/iam/config"

  local realm_id
  local client_id
  realm_id="$("$jq_bin" -r '.realm_id' "${auth_config_json}")"
  client_id="$("$jq_bin" -r '.client_id' "${auth_config_json}")"

  idp_issue_iam_browser_token_json "${base_url}" "${email}" "${password}" "${ui_base_url}" > "${token_response_json}"

  local access_token
  access_token="$("$jq_bin" -r '.access_token // empty' "${token_response_json}")"
  if [[ -z "${access_token}" ]]; then
    cat "${token_response_json}" >&2
    rm -rf "${tmp_dir}"
    return 1
  fi

  local auth_session_status
  if [[ -n "${requested_tenant_id}" ]]; then
    auth_session_status="$("$curl_bin" -sS -o "${auth_session_json}" -w '%{http_code}' \
      "${base_url}/api/v1/auth/session" \
      -H "Authorization: Bearer ${access_token}" \
      -H "X-Tenant-ID: ${requested_tenant_id}")"
  else
    auth_session_status="$("$curl_bin" -sS -o "${auth_session_json}" -w '%{http_code}' \
      "${base_url}/api/v1/auth/session" \
      -H "Authorization: Bearer ${access_token}")"
  fi

  if [[ "${auth_session_status}" != "200" ]]; then
    cat "${auth_session_json}" >&2
    rm -rf "${tmp_dir}"
    return 1
  fi

  "$jq_bin" -n \
    --arg realm_id "${realm_id}" \
    --arg client_id "${client_id}" \
    --slurpfile auth "${auth_session_json}" \
    --slurpfile token "${token_response_json}" \
    '
      ($auth[0] // {}) as $bootstrap
      | ($token[0] // {}) as $issued
      | $bootstrap
      | .iam = {
          realm_id: $realm_id,
          client_id: $client_id,
          account_session_id: ($issued.account_session_id // null),
          token_type: ($issued.token_type // "Bearer"),
          access_token: ($issued.access_token // null),
          refresh_token: ($issued.refresh_token // null),
          expires_in: ($issued.expires_in // null)
        }
    '
  rm -rf "${tmp_dir}"
}
