#!/bin/bash
echo "Starting editing session..."
echo "Starting local server on http://localhost:8000"
npx http-server -p 8000 &
SERVER_PID=$!
echo "Watching for changes..."
bash watch.sh
kill $SERVER_PID 2>/dev/null
echo "Editing session ended"
