#!/bin/zsh

# Resolve relative to this launcher so the project can be moved without
# embedding a machine-specific path in source control.
set -euo pipefail
PROJECT_DIR="${0:A:h}"
SEWING_PORT=3000

cd "$PROJECT_DIR"

if ! command -v mise >/dev/null 2>&1; then
  echo "Sewing Studio uses mise to install its exact Node.js and pnpm versions."
  echo "Install mise from https://mise.jdx.dev, then double-click this file again."
  echo
  read "?Press Return to close…"
  exit 1
fi

echo "Checking the pinned development tools…"
mise install
mise run setup-dev

# A stale preview should not make the launcher look broken. Choose the next
# predictable loopback port and explain the storage boundary before opening it.
while lsof -nP -iTCP:"${SEWING_PORT}" -sTCP:LISTEN >/dev/null 2>&1; do
  SEWING_PORT=$((SEWING_PORT + 100))
done

echo
if [[ "${SEWING_PORT}" -ne 3000 ]]; then
  echo "Port 3000 is already in use, so this session will use ${SEWING_PORT}."
  echo "Browser data is stored separately for each address and port."
fi
echo "Starting Sewing Studio at http://localhost:${SEWING_PORT}"
echo "Keep this window open while you use the site. Press Control-C to stop it."
echo

mise exec -- pnpm dev --port "${SEWING_PORT}" &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

# Wait for the local server instead of opening a half-loaded browser tab.
for _ in {1..60}; do
  if curl --silent --fail "http://localhost:${SEWING_PORT}" >/dev/null 2>&1; then
    open "http://localhost:${SEWING_PORT}"
    wait "$SERVER_PID"
    exit $?
  fi
  if ! kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    wait "$SERVER_PID"
  fi
  sleep 0.5
done

echo "The local server did not become ready. Review the messages above."
exit 1
