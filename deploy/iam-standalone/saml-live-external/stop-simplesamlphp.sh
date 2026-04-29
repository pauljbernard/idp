#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="idp-simplesamlphp-live-external"

docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true

echo "stopped_container=${CONTAINER_NAME}"
