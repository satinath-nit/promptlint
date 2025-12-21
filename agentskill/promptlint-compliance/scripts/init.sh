#!/bin/bash
# PromptLint Init Script
# Initializes a policy file with recommended rules

set -e

OUTPUT_FILE="${1:-prompt-policy.yml}"
FORCE="${2:-false}"

# Check if promptlint is installed
if ! command -v promptlint &> /dev/null; then
    echo "PromptLint is not installed. Installing..."
    npm install -g promptlint
fi

# Initialize policy file
if [ "$FORCE" = "true" ] || [ "$FORCE" = "--force" ]; then
    promptlint init --output "$OUTPUT_FILE" --force
else
    promptlint init --output "$OUTPUT_FILE"
fi

echo "Policy file created at $OUTPUT_FILE"
