#!/bin/bash
set -euo pipefail

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title TinyFish Search
# @raycast.mode fullOutput

# Optional parameters:
# @raycast.icon 🔎
# @raycast.description Search the web with TinyFish and list result URLs
# @raycast.argument1 { "type": "text", "placeholder": "Search query" }

# Documentation:
# @raycast.author tinyfish
# @raycast.authorURL https://tinyfish.ai

export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.npm-global/bin:$HOME/.local/bin:$PATH"

query="${1:-}"

if [ -z "$query" ]; then
  echo "Usage: TinyFish Search <query>"
  exit 1
fi

TINYFISH_BIN="$(command -v tinyfish || true)"
if [ -z "$TINYFISH_BIN" ]; then
  echo "tinyfish not found in PATH"
  echo
  echo "Install and authenticate it first:"
  echo "  npm install -g @tiny-fish/cli"
  echo "  tinyfish auth login"
  exit 127
fi

raw_output="$("$TINYFISH_BIN" search query "$query")"

python3 - "$raw_output" <<'PY'
import json
import sys

raw = sys.argv[1].strip()
data = json.loads(raw)
query = data.get("query") or "Search"
results = data.get("results") or []

print(f"Results for: {query}")
print()

if not results:
    print("No results found.")
    sys.exit(1)

for result in results:
    position = result.get("position") or ""
    title = result.get("title") or "Untitled"
    site = result.get("site_name") or ""
    url = result.get("url") or ""
    snippet = (result.get("snippet") or "").strip()

    heading = f"{position}. {title}" if position else title
    if site:
        heading = f"{heading} ({site})"

    print(heading)
    if url:
        print(url)
    if snippet:
        print(snippet)
    print()
PY
