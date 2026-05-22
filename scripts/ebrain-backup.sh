#!/usr/bin/env bash
set -euo pipefail

log() { printf '[ebrain-backup] %s\n' "$*" >&2; }
fatal() { printf '[ebrain-backup] ERROR: %s\n' "$*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || fatal "required command not found: $1"; }

DATABASE_URL_VALUE="${DATABASE_URL:-${GBRAIN_DATABASE_URL:-}}"
BRAIN_REPO_PATH="${BRAIN_REPO_PATH:-${EBRAIN_BRAIN_REPO_PATH:-${GBRAIN_REPO_PATH:-${GBRAIN_HOME:-}}}}"
DESTINATION="${EBRAIN_BACKUP_DESTINATION:-${BACKUP_DESTINATION:-${S3_BACKUP_URI:-${OSS_BACKUP_URI:-}}}}"
RETENTION_DAYS="${EBRAIN_BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP="${EBRAIN_BACKUP_TIMESTAMP:-$(date -u +%Y%m%dT%H%M%SZ)}"
WORKDIR="${EBRAIN_BACKUP_WORKDIR:-$(mktemp -d)}"
BACKUP_ROOT="$WORKDIR/ebrain-backup-$TIMESTAMP"
ARCHIVE="$WORKDIR/ebrain-backup-$TIMESTAMP.tar.gz"
LOCAL_RETENTION_DIR="${EBRAIN_BACKUP_LOCAL_DIR:-}"

[[ -n "$DATABASE_URL_VALUE" ]] || fatal 'DATABASE_URL or GBRAIN_DATABASE_URL is required'
[[ -n "$BRAIN_REPO_PATH" ]] || fatal 'BRAIN_REPO_PATH, EBRAIN_BRAIN_REPO_PATH, GBRAIN_REPO_PATH, or GBRAIN_HOME is required'
[[ -d "$BRAIN_REPO_PATH" ]] || fatal "brain repo path does not exist: $BRAIN_REPO_PATH"
need pg_dump
need git
need tar
need gzip
mkdir -p "$BACKUP_ROOT"
trap 'rm -rf "$WORKDIR"' EXIT

log 'dumping Postgres logical backup'
pg_dump --format=custom --no-owner --no-privileges --file "$BACKUP_ROOT/postgres.dump" "$DATABASE_URL_VALUE"

if [[ -n "${AWS_RDS_INSTANCE_ID:-}" ]]; then
  need aws
  SNAPSHOT_ID="${AWS_RDS_SNAPSHOT_ID:-ebrain-$(printf '%s' "$TIMESTAMP" | tr '[:upper:]' '[:lower:]')}"
  log "requesting AWS RDS snapshot $SNAPSHOT_ID"
  aws rds create-db-snapshot --db-instance-identifier "$AWS_RDS_INSTANCE_ID" --db-snapshot-identifier "$SNAPSHOT_ID" >/dev/null
  printf '%s\n' "$SNAPSHOT_ID" > "$BACKUP_ROOT/aws-rds-snapshot-id.txt"
fi

if [[ -n "${ALIYUN_RDS_INSTANCE_ID:-}" ]]; then
  if command -v aliyun >/dev/null 2>&1; then
    log "requesting Aliyun RDS backup for $ALIYUN_RDS_INSTANCE_ID"
    aliyun rds CreateBackup --DBInstanceId "$ALIYUN_RDS_INSTANCE_ID" --BackupMethod Logical >/dev/null
    printf '%s\n' "$ALIYUN_RDS_INSTANCE_ID" > "$BACKUP_ROOT/aliyun-rds-instance-id.txt"
  else
    log 'aliyun CLI not found; skipping optional Aliyun RDS PITR backup request'
  fi
fi

log 'creating git mirror of brain repo'
git clone --mirror "$BRAIN_REPO_PATH" "$BACKUP_ROOT/brain-repo.git" >/dev/null 2>&1
tar -czf "$BACKUP_ROOT/brain-repo-working-tree.tar.gz" -C "$BRAIN_REPO_PATH" --exclude .git .

git -C "$BRAIN_REPO_PATH" rev-parse HEAD > "$BACKUP_ROOT/brain-repo-head.txt" 2>/dev/null || true
git -C "$BRAIN_REPO_PATH" remote -v > "$BACKUP_ROOT/brain-repo-remotes.txt" 2>/dev/null || true

if command -v git-lfs >/dev/null 2>&1 || git -C "$BRAIN_REPO_PATH" lfs version >/dev/null 2>&1; then
  log 'capturing git-lfs metadata and local objects'
  git -C "$BRAIN_REPO_PATH" lfs ls-files -l > "$BACKUP_ROOT/lfs-files.txt" 2>/dev/null || true
  if [[ "${EBRAIN_BACKUP_FETCH_LFS:-0}" == "1" ]]; then
    git -C "$BRAIN_REPO_PATH" lfs fetch --all || log 'git lfs fetch --all failed; continuing with local objects'
  fi
  if [[ -d "$BRAIN_REPO_PATH/.git/lfs/objects" ]]; then
    tar -czf "$BACKUP_ROOT/brain-lfs-objects.tar.gz" -C "$BRAIN_REPO_PATH/.git/lfs" objects
  fi
else
  log 'git-lfs not installed; writing empty LFS manifest'
  : > "$BACKUP_ROOT/lfs-files.txt"
fi

cat > "$BACKUP_ROOT/metadata.json" <<META
{
  "created_at": "$TIMESTAMP",
  "database_dump": "postgres.dump",
  "brain_repo_path": "$BRAIN_REPO_PATH",
  "retention_days": $RETENTION_DAYS,
  "format": "ebrain-backup-v1"
}
META

log 'packing backup archive'
tar -czf "$ARCHIVE" -C "$WORKDIR" "$(basename "$BACKUP_ROOT")"

upload_file() {
  local file="$1"
  local dest="$2"
  [[ -n "$dest" ]] || return 0
  case "$dest" in
    s3://*)
      need aws
      aws s3 cp "$file" "${dest%/}/$(basename "$file")"
      ;;
    oss://*)
      if command -v ossutil >/dev/null 2>&1; then
        ossutil cp "$file" "${dest%/}/$(basename "$file")"
      elif command -v ossutil64 >/dev/null 2>&1; then
        ossutil64 cp "$file" "${dest%/}/$(basename "$file")"
      else
        fatal 'oss:// destination requires ossutil or ossutil64'
      fi
      ;;
    rclone:*)
      need rclone
      rclone copyto "$file" "${dest#rclone:}/$(basename "$file")"
      ;;
    /*|.*|~*)
      mkdir -p "$dest"
      cp "$file" "$dest/$(basename "$file")"
      ;;
    *)
      fatal "unsupported EBRAIN_BACKUP_DESTINATION: $dest"
      ;;
  esac
}

if [[ -n "$DESTINATION" ]]; then
  log "uploading backup archive to $DESTINATION"
  upload_file "$ARCHIVE" "$DESTINATION"
elif [[ "${EBRAIN_BACKUP_LOCAL_ONLY:-0}" == "1" ]]; then
  LOCAL_RETENTION_DIR="${LOCAL_RETENTION_DIR:-$PWD/.ebrain-backups}"
  log "local-only backup enabled: $LOCAL_RETENTION_DIR"
  upload_file "$ARCHIVE" "$LOCAL_RETENTION_DIR"
else
  fatal 'set EBRAIN_BACKUP_DESTINATION (s3://, oss://, rclone:, or local path) or EBRAIN_BACKUP_LOCAL_ONLY=1'
fi

if [[ -n "$LOCAL_RETENTION_DIR" && -d "$LOCAL_RETENTION_DIR" ]]; then
  find "$LOCAL_RETENTION_DIR" -name 'ebrain-backup-*.tar.gz' -type f -mtime "+$RETENTION_DAYS" -print -delete
fi

log "backup complete: $(basename "$ARCHIVE")"
