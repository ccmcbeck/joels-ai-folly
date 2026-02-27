#!/usr/bin/env bash
set -euo pipefail

# Install Homebrew if not present
if ! command -v brew &>/dev/null; then
  echo "Homebrew not found — installing..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  # Add brew to PATH for the rest of this script (Apple Silicon default path)
  if [[ -x /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [[ -x /usr/local/bin/brew ]]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi
else
  echo "Homebrew already installed: $(brew --version | head -1)"
fi

# Packages in alphabetical order
PACKAGES=(
  awscli
  bash
  coreutils
  curl
  diffutils
  findutils
  gawk
  gnu-sed
  gnu-time
  gnupg
  gnutls
  jq
  less
  node
  parallel
  moreutils
  the_silver_searcher
  watch
  wget
  yq
  zsh
)

echo ""
echo "Installing packages..."
brew install "${PACKAGES[@]}"

echo ""
echo "Done."
