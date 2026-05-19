#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

NAMESPACE="${EBRAIN_NAMESPACE:-ebrain-dev}"
RELEASE="${EBRAIN_RELEASE:-ebrain-dev}"
VALUES_FILE="${EBRAIN_VALUES_FILE:-deploy/dev/helm/values.dev.yaml}"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short=12 HEAD)}"
ACR_REGISTRY="${ACR_REGISTRY:?Set ACR_REGISTRY, for example registry.cn-shanghai.aliyuncs.com}"
ACR_REPOSITORY="${ACR_REPOSITORY:-your-acr-namespace/ebrain}"
IMAGE_REPOSITORY="${ACR_REGISTRY}/${ACR_REPOSITORY}"

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[ebrain-dev-deploy] missing required command: $1" >&2
    exit 1
  fi
}

need docker
need helm
need kubectl

if [ -n "${ACR_USER:-}" ] && [ -n "${ACR_PASS:-}" ]; then
  echo "$ACR_PASS" | docker login "$ACR_REGISTRY" --username "$ACR_USER" --password-stdin
fi

echo "[ebrain-dev-deploy] Building ${IMAGE_REPOSITORY}:${IMAGE_TAG}..."
docker build -f deploy/dev/Dockerfile -t "${IMAGE_REPOSITORY}:${IMAGE_TAG}" .

echo "[ebrain-dev-deploy] Pushing ${IMAGE_REPOSITORY}:${IMAGE_TAG}..."
docker push "${IMAGE_REPOSITORY}:${IMAGE_TAG}"

echo "[ebrain-dev-deploy] Helm upgrade ${RELEASE}..."
helm upgrade --install "$RELEASE" deploy/dev/helm \
  --namespace "$NAMESPACE" \
  --values "$VALUES_FILE" \
  --set "image.repository=${IMAGE_REPOSITORY}" \
  --set "image.tag=${IMAGE_TAG}" \
  --wait \
  --atomic

kubectl rollout status "deploy/mcp-api" -n "$NAMESPACE" --timeout=180s

echo "[ebrain-dev-deploy] Deployed ${IMAGE_REPOSITORY}:${IMAGE_TAG}"
