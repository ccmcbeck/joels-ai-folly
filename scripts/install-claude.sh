#!/usr/bin/env bash
set -euo pipefail

# Install Claude Code CLI
# Usage:
#   bash scripts/install-claude.sh
#   curl -fsSL https://raw.githubusercontent.com/ccmcbeck/joels-ai-folly/main/scripts/install-claude.sh | bash

# Check for Node / npm
if ! command -v npm &>/dev/null; then
  echo "Error: npm not found. Install Node.js first (see DEVELOPING.md)."
  exit 1
fi

echo "Installing Claude Code..."
npm install -g @anthropic/claude-code

# Verify
if command -v claude &>/dev/null; then
  echo ""
  echo "Claude Code installed: $(claude --version)"
  echo ""
  echo "Run 'claude' in the project directory to get started."
else
  echo ""
  echo "Installed, but 'claude' was not found on PATH."
  echo "Check that $(npm bin -g) is in your PATH (see CLAUDING.md)."
fi
