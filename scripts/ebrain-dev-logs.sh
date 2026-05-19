#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${EBRAIN_NAMESPACE:-ebrain-dev}"
DEPLOYMENT="${1:-mcp-api}"

kubectl logs -n "$NAMESPACE" "deploy/${DEPLOYMENT}" -f --tail="${TAIL:-100}"
