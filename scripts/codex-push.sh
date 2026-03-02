#!/usr/bin/env bash
set -euo pipefail

# codex-push.sh
# Purpose:
#   Configure remote "origin" and push the current branch.
# Usage examples:
#   GIT_REMOTE_URL="https://github.com/owner/repo.git" ./scripts/codex-push.sh
#   GIT_REMOTE_URL="https://github.com/owner/repo.git" GIT_USERNAME="owner" GIT_TOKEN="ghp_xxx" ./scripts/codex-push.sh

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Error: required command '$1' is not installed." >&2
    exit 1
  }
}

require_cmd git

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: current directory is not a git repository." >&2
  echo "Run this script from your cloned repository folder." >&2
  exit 1
fi

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

if [[ -z "${GIT_REMOTE_URL:-}" ]]; then
  echo "Error: GIT_REMOTE_URL is required." >&2
  echo "Example: GIT_REMOTE_URL='https://github.com/owner/repo.git' ./scripts/codex-push.sh" >&2
  exit 1
fi

branch="$(git rev-parse --abbrev-ref HEAD)"

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$GIT_REMOTE_URL"
else
  git remote add origin "$GIT_REMOTE_URL"
fi

# If token auth is provided for HTTPS, use a one-time authenticated URL so
# secrets are not permanently written to git config.
if [[ -n "${GIT_TOKEN:-}" ]]; then
  if [[ -z "${GIT_USERNAME:-}" ]]; then
    echo "Error: GIT_USERNAME is required when GIT_TOKEN is set." >&2
    exit 1
  fi

  require_cmd python3

  auth_url="$(python3 - <<'PY'
import os
import urllib.parse

url = os.environ['GIT_REMOTE_URL']
username = urllib.parse.quote(os.environ['GIT_USERNAME'], safe='')
token = urllib.parse.quote(os.environ['GIT_TOKEN'], safe='')

parsed = urllib.parse.urlsplit(url)
if parsed.scheme not in ('http', 'https'):
    raise SystemExit('Error: token auth mode requires an HTTP/HTTPS remote URL.')

netloc = f"{username}:{token}@{parsed.hostname or ''}"
if parsed.port:
    netloc += f":{parsed.port}"

print(urllib.parse.urlunsplit((parsed.scheme, netloc, parsed.path, parsed.query, parsed.fragment)))
PY
)"

  git push "$auth_url" "HEAD:${branch}" --set-upstream
else
  git push --set-upstream origin "$branch"
fi

printf "Pushed branch '%s' successfully.\n" "$branch"
