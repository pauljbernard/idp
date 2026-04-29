#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

exec bash "${ROOT_DIR}/scripts/prepare-idp-runtime-cutover-evidence.sh" \
  "login-transactions" \
  "1" \
  "Login transactions" \
  "docs/spec/plans/Headless_IAM_Login_Transaction_Cutover_Checklist.md" \
  "${1:-}"
