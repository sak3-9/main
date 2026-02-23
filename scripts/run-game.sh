#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-4173}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$REPO_ROOT"

echo "Launching local server for futon mini-game..."
echo "Open this URL in your browser:"
echo "  http://127.0.0.1:${PORT}/index.html"
echo

echo "Press Ctrl+C to stop."
python3 -m http.server "$PORT"
