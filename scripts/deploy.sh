#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/deploy.sh [--dry-run]

Packages index.html and assets/, then uploads and extracts the package to
DEPLOY_REMOTE_DIR using SSH settings from .env.deploy.local.
USAGE
}

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
elif [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
elif [[ -n "${1:-}" ]]; then
  usage >&2
  exit 2
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${DEPLOY_ENV_FILE:-$ROOT_DIR/.env.deploy.local}"
PACKAGE_DIR="$ROOT_DIR/.deploy"
PACKAGE_NAME="snake-static.tar.gz"
PACKAGE_PATH="$PACKAGE_DIR/$PACKAGE_NAME"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing deploy env file: $ENV_FILE" >&2
  echo "Copy .env.deploy.example to .env.deploy.local and fill in the values." >&2
  exit 1
fi

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

required_vars=(
  DEPLOY_SSH_HOST
  DEPLOY_SSH_USER
  DEPLOY_SSH_PORT
  DEPLOY_SSH_KEY
  DEPLOY_REMOTE_DIR
)

for name in "${required_vars[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required deploy variable: $name" >&2
    exit 1
  fi
done

expand_path() {
  local value="$1"
  case "$value" in
    "~") printf '%s\n' "$HOME" ;;
    "~/"*) printf '%s/%s\n' "$HOME" "${value#~/}" ;;
    *) printf '%s\n' "$value" ;;
  esac
}

SSH_KEY="$(expand_path "$DEPLOY_SSH_KEY")"
if [[ ! -f "$SSH_KEY" ]]; then
  echo "SSH key not found: $SSH_KEY" >&2
  exit 1
fi

mkdir -p "$PACKAGE_DIR"
tar \
  --exclude='.DS_Store' \
  --exclude='assets/**/.DS_Store' \
  -czf "$PACKAGE_PATH" \
  -C "$ROOT_DIR" \
  index.html assets

REMOTE="$DEPLOY_SSH_USER@$DEPLOY_SSH_HOST"
REMOTE_PACKAGE="/tmp/$PACKAGE_NAME"
REMOTE_DIR_QUOTED="$(printf '%q' "$DEPLOY_REMOTE_DIR")"
REMOTE_PACKAGE_QUOTED="$(printf '%q' "$REMOTE_PACKAGE")"
SSH_OPTS=(-i "$SSH_KEY" -p "$DEPLOY_SSH_PORT" -o IdentitiesOnly=yes)
SCP_OPTS=(-i "$SSH_KEY" -P "$DEPLOY_SSH_PORT" -o IdentitiesOnly=yes)

echo "Created deploy package: $PACKAGE_PATH"
echo "Target: $REMOTE:$DEPLOY_REMOTE_DIR"

if [[ "$DRY_RUN" == "1" ]]; then
  echo "Dry run complete; upload skipped."
  exit 0
fi

ssh "${SSH_OPTS[@]}" "$REMOTE" "mkdir -p $REMOTE_DIR_QUOTED"
scp "${SCP_OPTS[@]}" "$PACKAGE_PATH" "$REMOTE:$REMOTE_PACKAGE"
ssh "${SSH_OPTS[@]}" "$REMOTE" "tar -xzf $REMOTE_PACKAGE_QUOTED -C $REMOTE_DIR_QUOTED && rm -f $REMOTE_PACKAGE_QUOTED"

echo "Deploy complete."
