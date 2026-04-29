#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
EXAMPLE_ENV_FILE="${SCRIPT_DIR}/simplesamlphp.env.example"
CONTAINER_NAME="idp-simplesamlphp-live-external"

load_env_defaults() {
  local file="$1"
  while IFS= read -r line || [[ -n "${line}" ]]; do
    [[ -z "${line}" || "${line}" == \#* ]] && continue
    local key="${line%%=*}"
    local value="${line#*=}"
    if [[ -z "${!key:-}" ]]; then
      export "${key}=${value}"
    fi
  done < "${file}"
}

if [[ -f "${ENV_FILE}" ]]; then
  load_env_defaults "${ENV_FILE}"
else
  load_env_defaults "${EXAMPLE_ENV_FILE}"
fi

docker inspect "${CONTAINER_NAME}" >/dev/null
curl --fail --silent --show-error --insecure "${IDP_SAML_SP_METADATA_URL:-https://127.0.0.1:19443/simplesaml/module.php/saml/sp/metadata.php/default-sp}" >/dev/null

echo "verified_container=${CONTAINER_NAME}"
echo "verified_metadata_url=${IDP_SAML_SP_METADATA_URL:-https://127.0.0.1:19443/simplesaml/module.php/saml/sp/metadata.php/default-sp}"
