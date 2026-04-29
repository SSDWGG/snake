#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -n "${OSS_MCP_ENV_FILE:-}" ]]; then
  ENV_FILE="$OSS_MCP_ENV_FILE"
elif [[ -f "$ROOT_DIR/.env.oss.local" ]]; then
  ENV_FILE="$ROOT_DIR/.env.oss.local"
elif [[ -f "$ROOT_DIR/.env.deploy.local" ]]; then
  ENV_FILE="$ROOT_DIR/.env.deploy.local"
else
  echo "Missing OSS MCP env file. Copy .env.oss.example to .env.oss.local and fill the OSS_POST_* values." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "OSS MCP env file not found: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

cd "$ROOT_DIR"
exec node "$ROOT_DIR/scripts/oss-post-mcp.mjs"
