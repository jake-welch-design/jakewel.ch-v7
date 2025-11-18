#!/bin/bash

# Start editing session
# Launches local server and watches for file changes

echo "🌱 Starting jakewel.ch editing session..."

# Start local server in background
echo "📡 Starting local server on http://localhost:8000"
npx http-server -p 8000 &
SERVER_PID=$!

# Start file watcher
echo "👀 Watching for file changes..."
bash watch.sh

# Cleanup: kill the server when watch.sh is stopped (Ctrl+C)
kill $SERVER_PID 2>/dev/null
echo "🛑 Editing session ended"
