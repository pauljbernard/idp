#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Provisioning LocalStack resources required for distributed runtime tests..."
bash "${SCRIPT_DIR}/provision-localstack.sh"

echo "Verifying distributed runtime test environment..."
bash "${SCRIPT_DIR}/verify-distributed-test-env.sh"
