#!/usr/bin/env bash
set -euo pipefail

DEFAULT_REMOTE="upstream"
DEFAULT_BRANCH="master"
DEFAULT_URL="https://github.com/garrytan/gbrain.git"

REMOTE="$DEFAULT_REMOTE"
BRANCH="$DEFAULT_BRANCH"
QUIET=0

CORE_FILES=(
  "src/core/operations.ts"
  "src/core/operations-descriptions.ts"
  "src/core/oauth-provider.ts"
  "src/core/types.ts"
  "src/commands/serve-http.ts"
  "src/commands/auth.ts"
  "src/commands/jobs.ts"
  "src/cli.ts"
)

usage() {
  cat <<'EOF'
Usage: bash scripts/check-upstream-drift.sh [--remote=upstream] [--branch=master] [--quiet]

Detect whether upstream gbrain has new commits touching the files where the
ebrain fork intentionally extends gbrain core. The script only fetches and
reads git history; it never merges, rebases, stages, or edits files.

Options:
  --remote=NAME   Git remote to fetch and compare. Default: upstream
  --branch=NAME   Remote branch to compare. Default: master
  --quiet         Print the summary only.
  -h, --help      Show this help.

Exit codes:
  0  No upstream drift detected on tracked files.
  1  Drift detected on one or more tracked files.
  2  Usage, repository, remote, fetch, or revision error.
EOF
}

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 2
}

log() {
  if [[ "$QUIET" -eq 0 ]]; then
    printf '%s\n' "$*"
  fi
}

parse_args() {
  for arg in "$@"; do
    case "$arg" in
      --remote=*)
        REMOTE="${arg#--remote=}"
        ;;
      --branch=*)
        BRANCH="${arg#--branch=}"
        ;;
      --quiet)
        QUIET=1
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        usage >&2
        die "unknown argument: $arg"
        ;;
    esac
  done

  [[ -n "$REMOTE" ]] || die "--remote must not be empty"
  [[ -n "$BRANCH" ]] || die "--branch must not be empty"
}

require_git_repo() {
  git rev-parse --show-toplevel >/dev/null 2>&1 || die "not inside a git repository"
  local root
  root="$(git rev-parse --show-toplevel)"
  cd "$root"
}

require_remote() {
  if ! git remote get-url "$REMOTE" >/dev/null 2>&1; then
    cat >&2 <<EOF
ERROR: remote '$REMOTE' is not configured.

This script does not modify git remotes. Add the gbrain upstream remote
explicitly, then rerun:

  git remote add $REMOTE $DEFAULT_URL
  bash scripts/check-upstream-drift.sh --remote=$REMOTE --branch=$BRANCH
EOF
    exit 2
  fi
}

fetch_remote() {
  log "Fetching $REMOTE/$BRANCH without tags..."
  if ! git fetch "$REMOTE" "$BRANCH" --no-tags; then
    die "git fetch $REMOTE $BRANCH --no-tags failed"
  fi
}

require_ref() {
  local ref="$1"
  git rev-parse --verify "$ref" >/dev/null 2>&1 || die "revision not found: $ref"
}

file_exists_in_either_ref() {
  local file="$1"
  local upstream_ref="$2"

  if [[ -e "$file" ]]; then
    return 0
  fi

  if git cat-file -e "${upstream_ref}:${file}" >/dev/null 2>&1; then
    return 0
  fi

  return 1
}

risk_for_file() {
  local file="$1"
  local count="$2"
  local latest_subject="$3"

  if [[ "$count" -eq 0 ]]; then
    printf 'none'
    return
  fi

  case "$file" in
    src/core/oauth-provider.ts)
      printf 'HIGH: OAuth token verification path changed upstream; review verifyAccessToken joins and ebrain executive binding.'
      ;;
    src/commands/serve-http.ts)
      printf 'HIGH: HTTP/admin route surface changed upstream; review ebrain bridge and admin endpoints.'
      ;;
    src/core/operations.ts|src/core/operations-descriptions.ts)
      printf 'MEDIUM: append-only operation registry changed; keep ebrain entries after upstream entries.'
      ;;
    src/core/types.ts)
      printf 'MEDIUM: shared type contract changed; merge optional AuthInfo/OperationContext fields without breaking upstream callers.'
      ;;
    src/commands/jobs.ts)
      printf 'MEDIUM: job dispatch registration changed; keep ebrain lazy-import handlers additive.'
      ;;
    src/commands/auth.ts|src/cli.ts)
      printf 'MEDIUM: CLI dispatch changed; keep ebrain cases additive and preserve upstream command behavior.'
      ;;
    *)
      printf 'MEDIUM: upstream touched a tracked ebrain extension point.'
      ;;
  esac

  if [[ -n "$latest_subject" ]]; then
    printf ' Latest upstream touch: %s' "$latest_subject"
  fi
}

print_header() {
  local head_ref="$1"
  local upstream_ref="$2"
  local merge_base="$3"
  local total_new="$4"

  cat <<EOF
Ebrain upstream drift check
Repository: $(git rev-parse --show-toplevel)
HEAD:       $(git rev-parse --short "$head_ref") ($(git branch --show-current 2>/dev/null || true))
Upstream:   $REMOTE/$BRANCH ($(git rev-parse --short "$upstream_ref"))
Merge base: $(git rev-parse --short "$merge_base")
New upstream commits since merge-base: $total_new
Tracked files: ${#CORE_FILES[@]}
EOF
}

print_file_report() {
  local file="$1"
  local upstream_ref="$2"
  local merge_base="$3"

  if ! file_exists_in_either_ref "$file" "$upstream_ref"; then
    printf '\n- %s\n' "$file"
    printf '  status: missing locally and upstream; check tracked file list\n'
    printf '  upstream commits: 0\n'
    printf '  risk: UNKNOWN\n'
    return 0
  fi

  local count
  count="$(git log --format='%H' "${merge_base}..${upstream_ref}" -- "$file" | wc -l | tr -d '[:space:]')"

  local latest_hash=""
  local latest_subject=""
  if [[ "$count" -gt 0 ]]; then
    latest_hash="$(git log --format='%h' -n 1 "${merge_base}..${upstream_ref}" -- "$file")"
    latest_subject="$(git log --format='%s' -n 1 "${merge_base}..${upstream_ref}" -- "$file")"
  fi

  printf '\n- %s\n' "$file"
  printf '  upstream commits: %s\n' "$count"
  if [[ "$count" -gt 0 ]]; then
    printf '  latest: %s %s\n' "$latest_hash" "$latest_subject"
    printf '  risk: '
    risk_for_file "$file" "$count" "$latest_subject"
    printf '\n'
    if [[ "$QUIET" -eq 0 ]]; then
      printf '  commits:\n'
      git log --oneline --decorate=no "${merge_base}..${upstream_ref}" -- "$file" |
        sed 's/^/    /'
    fi
  else
    printf '  risk: none\n'
  fi

  if [[ "$count" -gt 0 ]]; then
    return 1
  fi
  return 0
}

main() {
  parse_args "$@"
  require_git_repo
  require_remote
  fetch_remote

  local head_ref="HEAD"
  local upstream_ref="refs/remotes/${REMOTE}/${BRANCH}"
  require_ref "$head_ref"
  require_ref "$upstream_ref"

  local merge_base
  merge_base="$(git merge-base "$head_ref" "$upstream_ref")"
  [[ -n "$merge_base" ]] || die "could not determine merge-base for HEAD and $upstream_ref"

  local total_new
  total_new="$(git rev-list --count "${merge_base}..${upstream_ref}")"

  print_header "$head_ref" "$upstream_ref" "$merge_base" "$total_new"

  local drift_count=0
  local file
  for file in "${CORE_FILES[@]}"; do
    if ! print_file_report "$file" "$upstream_ref" "$merge_base"; then
      drift_count=$((drift_count + 1))
    fi
  done

  printf '\nSummary: '
  if [[ "$drift_count" -eq 0 ]]; then
    printf 'PASS - no upstream drift detected on tracked ebrain/gbrain overlap files.\n'
    exit 0
  fi

  printf 'DRIFT - upstream touched %s tracked file(s). Review docs/UPGRADING_FROM_GBRAIN.md before merge.\n' "$drift_count"
  exit 1
}

main "$@"
