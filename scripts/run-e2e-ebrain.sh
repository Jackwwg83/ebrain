#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose -f docker-compose.ebrain-test.yml)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose -f docker-compose.ebrain-test.yml)
else
  echo "[ebrain:e2e] docker compose is required" >&2
  exit 1
fi

cleanup() {
  "${COMPOSE[@]}" down --volumes --remove-orphans >/dev/null 2>&1 || true
}
trap cleanup EXIT

cleanup

echo "[ebrain:e2e] starting pgvector Postgres on localhost:5434..."
"${COMPOSE[@]}" up -d postgres

echo "[ebrain:e2e] waiting for postgres readiness..."
for attempt in $(seq 1 90); do
  if "${COMPOSE[@]}" exec -T postgres pg_isready -U postgres -d ebrain_e2e >/dev/null 2>&1; then
    break
  fi
  if [ "$attempt" -eq 90 ]; then
    echo "[ebrain:e2e] postgres did not become ready" >&2
    "${COMPOSE[@]}" logs postgres >&2 || true
    exit 1
  fi
  sleep 1
done

export DATABASE_URL="postgresql://postgres:postgres@localhost:5434/ebrain_e2e"
export GBRAIN_DATABASE_URL="$DATABASE_URL"

echo "[ebrain:e2e] running K2 full-flow test against $DATABASE_URL"
status=0
bun test --timeout=180000 tests/e2e/ebrain-full-flow.test.ts || status=$?

if [ "$status" -eq 0 ]; then
  echo "[ebrain:e2e] PASS: K2 Postgres full flow completed"
else
  echo "[ebrain:e2e] FAIL: K2 full flow exited $status" >&2
fi
exit "$status"
