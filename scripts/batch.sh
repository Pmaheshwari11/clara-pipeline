#!/bin/bash
# Usage: ./scripts/batch.sh transcripts/
# Runs pipeline on all .txt files in a folder

FOLDER=${1:-transcripts}
WEBHOOK="http://localhost:5678/webhook/0001a8e0-b7d3-4ede-ae2f-231af02017c0"

for f in $FOLDER/*.txt; do
  echo "▶ Processing: $f"
  curl -s -X POST $WEBHOOK \
    -H "Content-Type: application/json" \
    -d "{\"transcriptPath\": \"/transcripts/$(basename $f)\"}"
  echo ""
  sleep 3
done

echo "✅ Batch complete"