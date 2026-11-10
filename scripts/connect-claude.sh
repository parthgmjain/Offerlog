#!/usr/bin/env bash
# Connects Claude Desktop to the hosted Pipeline server.
# Asks for your API key (hidden), backs up your config, and adds the "pipeline" entry.
# Run it with Claude Desktop fully quit (Cmd+Q).
set -euo pipefail

SERVER_URL="${SERVER_URL:-https://offerlog.onrender.com/mcp}"
CONFIG="${CONFIG:-$HOME/Library/Application Support/Claude/claude_desktop_config.json}"

# Claude Desktop reads its config at startup and can overwrite it on exit, so refuse to run while it is open.
if [[ "${SKIP_APP_CHECK:-0}" != "1" ]] && pgrep -x Claude >/dev/null; then
  echo "Claude Desktop is still running. Quit it with Cmd+Q, then run this script again." >&2
  exit 1
fi

NPX_PATH="$(command -v npx || true)"
if [[ -z "$NPX_PATH" ]]; then
  echo "Node.js is not installed. Install it from https://nodejs.org, then run this script again." >&2
  exit 1
fi

if [[ -z "${PIPELINE_KEY:-}" ]]; then
  read -rsp "Paste your Pipeline API key (input is hidden), then press Enter: " PIPELINE_KEY
  echo
fi
# Remove any stray spaces or line breaks from the paste.
PIPELINE_KEY="$(printf '%s' "$PIPELINE_KEY" | tr -d '[:space:]')"
if [[ "$PIPELINE_KEY" != pl_* ]]; then
  echo "That doesn't look like a Pipeline key. Keys start with pl_. Create one at your dashboard's API keys page." >&2
  exit 1
fi

mkdir -p "$(dirname "$CONFIG")"
if [[ -f "$CONFIG" ]]; then
  # -p keeps the file's private permissions on the backup, which also holds the old key.
  BACKUP="$CONFIG.bak-$(date +%Y%m%d-%H%M%S)"
  cp -p "$CONFIG" "$BACKUP"
  echo "Saved your previous config to $BACKUP"
fi

# Values go in through the environment, not the command line, so they don't show in process lists.
NPX_PATH="$NPX_PATH" SERVER_URL="$SERVER_URL" PIPELINE_KEY="$PIPELINE_KEY" CONFIG="$CONFIG" node -e '
const fs = require("fs");
const file = process.env.CONFIG;
const cfg = fs.existsSync(file) && fs.readFileSync(file, "utf8").trim() ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
cfg.mcpServers = cfg.mcpServers || {};
cfg.mcpServers.pipeline = {
  command: process.env.NPX_PATH,
  args: ["-y", "mcp-remote", process.env.SERVER_URL, "--header", "Authorization:${AUTH_HEADER}"],
  env: { AUTH_HEADER: "Bearer " + process.env.PIPELINE_KEY },
};
fs.writeFileSync(file, JSON.stringify(cfg, null, 2) + "\n", { mode: 0o600 });
'

echo "Connected. Next steps:"
echo "  1. Open Claude Desktop."
echo "  2. Start a new chat and ask: list my applications."
echo "  If the tools don't appear, run this script again to re-enter the key."
