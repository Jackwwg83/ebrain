#!/usr/bin/env bash
set -euo pipefail

echo "[ebrain:smoke] running K1 PGLite fixture smoke..."

if bun test tests/e2e/ebrain-pglite-smoke.test.ts; then
  echo "[ebrain:smoke] PASS: fixtures imported, facts extracted, aliases refreshed"
else
  status=$?
  echo "[ebrain:smoke] FAIL: K1 PGLite fixture smoke exited ${status}" >&2
  exit "${status}"
fi
