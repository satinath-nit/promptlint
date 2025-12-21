#!/bin/bash
# PromptLint Scan Script
# Scans prompt files for policy violations

set -e

# Default values
PATH_TO_SCAN="${1:-.}"
POLICY_FILE="${2:-prompt-policy.yml}"
FORMAT="${3:-text}"
FAIL_ON="${4:-error}"

# Check if promptlint is installed
if ! command -v promptlint &> /dev/null; then
    echo "PromptLint is not installed. Installing..."
    npm install -g promptlint
fi

# Check if policy file exists
if [ ! -f "$POLICY_FILE" ]; then
    echo "Policy file not found. Creating default policy..."
    promptlint init --output "$POLICY_FILE"
fi

# Run the scan
echo "Scanning $PATH_TO_SCAN with policy $POLICY_FILE..."
promptlint scan "$PATH_TO_SCAN" --policy "$POLICY_FILE" --format "$FORMAT" --fail-on "$FAIL_ON"
