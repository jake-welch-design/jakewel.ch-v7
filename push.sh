#!/bin/bash
git add -A
git commit -m "Update site - $(date '+%Y-%m-%d %H:%M:%S')"
git push origin main
echo "Changes pushed to GitHub"
node scripts/arena-backup.js
