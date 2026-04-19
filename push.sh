#!/bin/bash
git add -A
git commit -m "Update site - $(date '+%Y-%m-%d %H:%M:%S')"
git push origin main
echo "Changes pushed to GitHub"
node scripts/arena-backup.js

read -p "Send notification emails? (y/n) " SEND_EMAIL
if [[ "$SEND_EMAIL" == "y" || "$SEND_EMAIL" == "Y" ]]; then
  node scripts/notify.js
else
  echo "Skipped email notifications."
fi
