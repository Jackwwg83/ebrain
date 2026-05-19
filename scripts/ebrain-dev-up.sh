#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

NAMESPACE="${EBRAIN_NAMESPACE:-ebrain-dev}"
RELEASE="${EBRAIN_RELEASE:-ebrain-dev}"
VALUES_FILE="${EBRAIN_VALUES_FILE:-deploy/dev/helm/values.dev.yaml}"

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[ebrain-dev-up] missing required command: $1" >&2
    exit 1
  fi
}

need terraform
need kubectl
need helm

if [ "${EBRAIN_CONFIRM_APPLY:-}" != "yes" ]; then
  echo "[ebrain-dev-up] This script runs terraform apply and helm upgrade against the active Alibaba Cloud/Kubernetes context." >&2
  echo "[ebrain-dev-up] Set EBRAIN_CONFIRM_APPLY=yes to continue." >&2
  exit 2
fi

echo "[ebrain-dev-up] Terraform init/apply..."
terraform -chdir=deploy/dev/terraform init
terraform -chdir=deploy/dev/terraform apply

echo "[ebrain-dev-up] Ensuring namespace ${NAMESPACE}..."
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

echo "[ebrain-dev-up] Installing/upgrading Helm release ${RELEASE}..."
helm upgrade --install "$RELEASE" deploy/dev/helm \
  --namespace "$NAMESPACE" \
  --values "$VALUES_FILE" \
  --wait \
  --atomic

echo "[ebrain-dev-up] Waiting for mcp-api rollout..."
kubectl rollout status "deploy/mcp-api" -n "$NAMESPACE" --timeout=180s

cat <<EOF
[ebrain-dev-up] Done.

Next PM checks:
  kubectl get pods -n ${NAMESPACE}
  curl https://ebrain-dev.<your-company>.com/health
  kubectl exec -n ${NAMESPACE} deploy/mcp-api -- gbrain doctor
EOF
