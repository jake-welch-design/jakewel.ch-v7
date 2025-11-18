#!/bin/bash

# Push changes to GitHub
# Stages all changes, commits with a timestamp, and pushes to main branch

git add -A
git commit -m "Update site - $(date '+%Y-%m-%d %H:%M:%S')"
git push origin main

echo "Changes pushed to GitHub"
