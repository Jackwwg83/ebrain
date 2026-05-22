#!/usr/bin/env bash
set -euo pipefail

log() { printf '[ebrain-export] %s\n' "$*" >&2; }
fatal() { printf '[ebrain-export] ERROR: %s\n' "$*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || fatal "required command not found: $1"; }

DATABASE_URL_VALUE="${DATABASE_URL:-${GBRAIN_DATABASE_URL:-}}"
BRAIN_REPO_PATH="${BRAIN_REPO_PATH:-${EBRAIN_BRAIN_REPO_PATH:-${GBRAIN_HOME:-}}}"
EXECUTIVE_ID="${EXECUTIVE_ID:-${EBRAIN_EXPORT_EXECUTIVE_ID:-}}"
EXPORT_DIR="${EBRAIN_EXPORT_DIR:-$(pwd)/ebrain-export-$(date -u +%Y%m%dT%H%M%SZ)}"
ARCHIVE="${EBRAIN_EXPORT_ARCHIVE:-$EXPORT_DIR.tar.gz}"

[[ -n "$DATABASE_URL_VALUE" ]] || fatal 'DATABASE_URL or GBRAIN_DATABASE_URL is required'
[[ -d "$BRAIN_REPO_PATH" ]] || fatal "brain repo path does not exist: $BRAIN_REPO_PATH"
if [[ -n "$EXECUTIVE_ID" && ! "$EXECUTIVE_ID" =~ ^[A-Za-z0-9._:-]+$ ]]; then
  fatal 'EXECUTIVE_ID may contain only letters, numbers, dot, underscore, colon, or dash'
fi
need psql
need tar
mkdir -p "$EXPORT_DIR/db" "$EXPORT_DIR/briefs"

copy_query() {
  local name="$1"
  local sql="$2"
  log "exporting $name"
  psql "$DATABASE_URL_VALUE" -v ON_ERROR_STOP=1 -c "\\copy ($sql) TO '$EXPORT_DIR/db/$name.csv' CSV HEADER"
}

if [[ -n "$EXECUTIVE_ID" ]]; then
  copy_query executives "SELECT * FROM executives WHERE executive_id = '$EXECUTIVE_ID'"
  copy_query mcp_request_log "SELECT * FROM mcp_request_log WHERE executive_id = '$EXECUTIVE_ID' ORDER BY created_at"
  find "$BRAIN_REPO_PATH" -path "*/briefs/daily/*${EXECUTIVE_ID}*.md" -type f -print0 | xargs -0 -I{} cp {} "$EXPORT_DIR/briefs/" || true
else
  copy_query executives "SELECT * FROM executives ORDER BY executive_id"
  copy_query mcp_request_log "SELECT * FROM mcp_request_log ORDER BY created_at"
  find "$BRAIN_REPO_PATH" -path '*/briefs/daily/*.md' -type f -print0 | xargs -0 -I{} cp {} "$EXPORT_DIR/briefs/" || true
fi

copy_query enterprise_ingest_sources "SELECT * FROM enterprise_ingest_sources ORDER BY ingest_source_id"
copy_query enterprise_ingest_objects "SELECT * FROM enterprise_ingest_objects ORDER BY ingest_source_id, external_id"
copy_query enterprise_fact_conflicts "SELECT * FROM enterprise_fact_conflicts ORDER BY detected_at, id"

cat > "$EXPORT_DIR/README.md" <<README
# Ebrain Export

Generated at: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Executive filter: ${EXECUTIVE_ID:-all}

Contents:
- db/*.csv: exported Ebrain enterprise tables
- briefs/*.md: daily brief markdown files found in the brain repo
README

tar -czf "$ARCHIVE" -C "$(dirname "$EXPORT_DIR")" "$(basename "$EXPORT_DIR")"
log "export complete: $ARCHIVE"
