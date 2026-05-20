#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

NAMESPACE="${EBRAIN_NAMESPACE:-ebrain-dev}"
RELEASE="${EBRAIN_RELEASE:-ebrain-dev}"
VALUES_FILE="${EBRAIN_VALUES_FILE:-deploy/dev/helm/values.dev.yaml}"
TF_VARS_FILE="${TF_VARS_FILE:-dev.tfvars}"
HTTPS_EGRESS_CIDRS="${HTTPS_EGRESS_CIDRS:-}"

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

case "$TF_VARS_FILE" in
  /*) TF_VARS_PATH="$TF_VARS_FILE" ;;
  *) TF_VARS_PATH="deploy/dev/terraform/$TF_VARS_FILE" ;;
esac

if [ ! -f "$TF_VARS_PATH" ]; then
  echo "[ebrain-dev-up] ERROR: $TF_VARS_PATH does not exist." >&2
  echo "  PM should run:" >&2
  echo "    cp deploy/dev/terraform/dev.tfvars.example deploy/dev/terraform/dev.tfvars" >&2
  echo "    # edit dev.tfvars with company-approved values" >&2
  echo "  Then rerun this script, or set TF_VARS_FILE=/path/to/your.tfvars." >&2
  exit 1
fi

TF_VARS_ABS="$(cd "$(dirname "$TF_VARS_PATH")" && pwd)/$(basename "$TF_VARS_PATH")"

if [ -z "$HTTPS_EGRESS_CIDRS" ]; then
  echo "[ebrain-dev-up] ERROR: set HTTPS_EGRESS_CIDRS before deploy." >&2
  echo "  Example: HTTPS_EGRESS_CIDRS=203.0.113.0/24,198.51.100.0/24" >&2
  exit 1
fi

IFS=',' read -r -a egress_cidrs <<< "$HTTPS_EGRESS_CIDRS"
egress_set_args=()
for index in "${!egress_cidrs[@]}"; do
  cidr="${egress_cidrs[$index]}"
  egress_set_args+=(--set "networkPolicy.httpsEgressCidrs[$index]=${cidr}")
done

echo "[ebrain-dev-up] Terraform init/apply..."
terraform -chdir=deploy/dev/terraform init
terraform -chdir=deploy/dev/terraform plan -var-file="$TF_VARS_ABS"
terraform -chdir=deploy/dev/terraform apply -var-file="$TF_VARS_ABS" -auto-approve

echo "[ebrain-dev-up] Ensuring namespace ${NAMESPACE}..."
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

echo "[ebrain-dev-up] Installing/upgrading Helm release ${RELEASE}..."
helm upgrade --install "$RELEASE" deploy/dev/helm \
  --namespace "$NAMESPACE" \
  --values "$VALUES_FILE" \
  "${egress_set_args[@]}" \
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
