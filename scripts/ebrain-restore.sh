#!/usr/bin/env bash
set -euo pipefail

log() { printf '[ebrain-restore] %s\n' "$*" >&2; }
fatal() { printf '[ebrain-restore] ERROR: %s\n' "$*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || fatal "required command not found: $1"; }

BACKUP_URI="${EBRAIN_RESTORE_BACKUP_URI:-${RESTORE_BACKUP_URI:-}}"
STAGING_DATABASE_URL="${STAGING_DATABASE_URL:-${EBRAIN_STAGING_DATABASE_URL:-}}"
STAGING_REPO_PATH="${STAGING_BRAIN_REPO_PATH:-${EBRAIN_STAGING_BRAIN_REPO_PATH:-}}"
WORKDIR="${EBRAIN_RESTORE_WORKDIR:-$(mktemp -d)}"
ARCHIVE="$WORKDIR/backup.tar.gz"

[[ -n "$BACKUP_URI" ]] || fatal 'EBRAIN_RESTORE_BACKUP_URI or RESTORE_BACKUP_URI is required'
[[ -n "$STAGING_DATABASE_URL" ]] || fatal 'STAGING_DATABASE_URL or EBRAIN_STAGING_DATABASE_URL is required'
need pg_restore
need tar
need git
trap 'rm -rf "$WORKDIR"' EXIT

fetch_file() {
  local uri="$1"
  local out="$2"
  case "$uri" in
    s3://*) need aws; aws s3 cp "$uri" "$out" ;;
    oss://*)
      if command -v ossutil >/dev/null 2>&1; then ossutil cp "$uri" "$out";
      elif command -v ossutil64 >/dev/null 2>&1; then ossutil64 cp "$uri" "$out";
      else fatal 'oss:// restore requires ossutil or ossutil64'; fi
      ;;
    rclone:*) need rclone; rclone copyto "${uri#rclone:}" "$out" ;;
    /*|.*|~*) cp "$uri" "$out" ;;
    *) fatal "unsupported restore URI: $uri" ;;
  esac
}

log "downloading backup $BACKUP_URI"
fetch_file "$BACKUP_URI" "$ARCHIVE"

tar -xzf "$ARCHIVE" -C "$WORKDIR"
BACKUP_ROOT="$(find "$WORKDIR" -maxdepth 1 -type d -name 'ebrain-backup-*' | head -1)"
[[ -n "$BACKUP_ROOT" ]] || fatal 'backup archive did not contain ebrain-backup-* root'
[[ -f "$BACKUP_ROOT/postgres.dump" ]] || fatal 'backup archive missing postgres.dump'

log 'restoring Postgres dump into staging database'
pg_restore --clean --if-exists --no-owner --no-privileges --dbname "$STAGING_DATABASE_URL" "$BACKUP_ROOT/postgres.dump"

if [[ -n "$STAGING_REPO_PATH" ]]; then
  [[ ! -e "$STAGING_REPO_PATH" ]] || fatal "staging repo path already exists; move it or set a new path: $STAGING_REPO_PATH"
  [[ -d "$BACKUP_ROOT/brain-repo.git" ]] || fatal 'backup archive missing brain-repo.git mirror'
  log "restoring brain repo working copy to $STAGING_REPO_PATH"
  git clone "$BACKUP_ROOT/brain-repo.git" "$STAGING_REPO_PATH"
  if [[ -f "$BACKUP_ROOT/brain-repo-working-tree.tar.gz" ]]; then
    tar -xzf "$BACKUP_ROOT/brain-repo-working-tree.tar.gz" -C "$STAGING_REPO_PATH"
  fi
  if [[ -f "$BACKUP_ROOT/brain-lfs-objects.tar.gz" ]]; then
    mkdir -p "$STAGING_REPO_PATH/.git/lfs"
    tar -xzf "$BACKUP_ROOT/brain-lfs-objects.tar.gz" -C "$STAGING_REPO_PATH/.git/lfs"
  fi
fi

log 'restore complete'
