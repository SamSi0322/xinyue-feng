#!/usr/bin/env bash
# Assemble the static site in site/: copy the playable builds into site/play/.
# Usage: scripts/build-site.sh            (copies the two vanilla-JS games)
#        scripts/build-site.sh --recipe   (also rebuilds the React demo; needs npm)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

copy() { # copy <from> <to> [rsync excludes...]
  local from="$1" to="$2"; shift 2
  mkdir -p "$to"
  rsync -a --delete --exclude 'tests/' --exclude 'package.json' --exclude 'package-lock.json' \
    --exclude 'node_modules/' --exclude 'README.md' --exclude 'docs/' --exclude '.DS_Store' "$@" "$from/" "$to/"
}

copy "$ROOT/projects/edgeworth/web" "$ROOT/site/play/edgeworth"
copy "$ROOT/projects/tic-tac-toe" "$ROOT/site/play/tic-tac-toe" --exclude 'original/'

if [[ "${1:-}" == "--recipe" ]]; then
  (cd "$ROOT/projects/ai-recipe-remix" && npm ci && npm run build:portfolio)
fi

echo "site/ is ready. Preview with: python3 -m http.server 8000 --directory \"$ROOT/site\""
