#!/bin/bash
set -e
git add -A
git commit -m "Update site - $(date '+%Y-%m-%d %H:%M:%S')"
git push origin main
echo "Changes pushed to GitHub"
node scripts/arena-backup.js

wait_for_pages_build() {
  local sha=$(git rev-parse HEAD)
  local repo="jake-welch-design/jakewel.ch-v7"
  echo "Waiting for GitHub Pages to build ${sha:0:7}..."
  for i in {1..60}; do
    local status=$(gh api "repos/$repo/pages/builds/latest" --jq '"\(.commit) \(.status)"' 2>/dev/null || echo "")
    local build_sha="${status%% *}"
    local build_status="${status##* }"
    if [[ "$build_sha" == "$sha" && "$build_status" == "built" ]]; then
      echo "Pages built. Waiting 10s for CDN to settle..."
      sleep 10
      return 0
    fi
    if [[ "$build_status" == "errored" && "$build_sha" == "$sha" ]]; then
      echo "Pages build ERRORED for $sha. Aborting notify."
      return 1
    fi
    sleep 5
  done
  echo "Timed out waiting for Pages build after 5 minutes. Aborting notify."
  return 1
}

read -p "Send notification emails? (y/n) " SEND_EMAIL
if [[ "$SEND_EMAIL" == "y" || "$SEND_EMAIL" == "Y" ]]; then
  if wait_for_pages_build; then
    node scripts/notify.js
  else
    echo "Skipped email — fix Pages build, then run: node scripts/notify.js"
    exit 1
  fi
else
  echo "Skipped email notifications."
fi
