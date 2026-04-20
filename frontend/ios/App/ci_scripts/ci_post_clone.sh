#!/bin/sh
set -e
# ─────────────────────────────────────────────────────────────────────────────
# Xcode Cloud — post-clone script
#
# Runs immediately after `git clone`, BEFORE Xcode resolves Swift packages.
# That timing is critical: SPM needs node_modules to exist so it can resolve
# the local @capacitor/* path dependencies declared in Package.swift.
# ─────────────────────────────────────────────────────────────────────────────

echo "=== ChoreMax ci_post_clone ==="

# Xcode Cloud does not ship Node.js — install it via Homebrew.
# Make sure both Intel and Apple Silicon brew paths are on PATH.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

if command -v node >/dev/null 2>&1; then
  echo "Node already available: $(node --version)"
else
  echo "Installing Node.js via Homebrew..."
  brew install node
fi

echo "Node: $(node --version)"
echo "npm:  $(npm --version)"

# 1. Install JS dependencies (provides node_modules for SPM path resolution)
echo "--- npm ci ---"
cd "$CI_PRIMARY_REPOSITORY_PATH/frontend"
npm ci

# 2. Build the web app (dist/ is gitignored so it must be produced here)
echo "--- npm run build ---"
npm run build

# 3. Sync Capacitor + patch packageClassList (cap sync strips unknown keys)
echo "--- npm run cap:sync ---"
npm run cap:sync

echo "=== ci_post_clone complete ==="
