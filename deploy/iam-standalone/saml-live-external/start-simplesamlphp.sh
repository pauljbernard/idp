#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
EXAMPLE_ENV_FILE="${SCRIPT_DIR}/simplesamlphp.env.example"
CONTAINER_NAME="idp-simplesamlphp-live-external"
IMAGE="cirrusid/simplesamlphp:latest"

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

: "${SIMPLESAMLPHP_HOST_PORT:=19443}"
: "${SIMPLESAMLPHP_ADMIN_PASSWORD:=StandaloneIAM!SimpleSAMLAdmin2026}"
: "${SIMPLESAMLPHP_SP_ENTITY_ID:=https://127.0.0.1:19443/simplesaml/module.php/saml/sp/metadata.php/default-sp}"
: "${IDP_SAML_SP_METADATA_URL:=https://127.0.0.1:19443/simplesaml/module.php/saml/sp/metadata.php/default-sp}"

docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true

docker run -d \
  --name "${CONTAINER_NAME}" \
  -p "${SIMPLESAMLPHP_HOST_PORT}:443" \
  -e "SIMPLESAMLPHP_ADMIN_PASSWORD=${SIMPLESAMLPHP_ADMIN_PASSWORD}" \
  -e "SIMPLESAMLPHP_SP_ENTITY_ID=${SIMPLESAMLPHP_SP_ENTITY_ID}" \
  -v "${SCRIPT_DIR}/simplesamlphp-authsources.php:/var/simplesamlphp/config/authsources.php:ro" \
  -v "${SCRIPT_DIR}/simplesamlphp-saml20-idp-remote.php:/var/simplesamlphp/metadata/saml20-idp-remote.php:ro" \
  "${IMAGE}"

echo "started_container=${CONTAINER_NAME}"
echo "metadata_url=${IDP_SAML_SP_METADATA_URL}"
