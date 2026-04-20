#!/bin/sh
set -e
# ─────────────────────────────────────────────────────────────────────────────
# Xcode Cloud — post-clone script
#
# Runs immediately after `git clone`, BEFORE Xcode resolves Swift packages.
# That ordering is what matters: SPM needs node_modules to exist so it can
# resolve the local @capacitor/* path dependencies in Package.swift.
# ─────────────────────────────────────────────────────────────────────────────

echo "=== ChoreMax post-clone ==="
echo "Node: $(node --version)"
echo "npm:  $(npm --version)"

cd "$CI_PRIMARY_REPOSITORY_PATH/frontend"

# 1. Install JS dependencies (provides node_modules for SPM path resolution)
echo "--- npm ci ---"
npm ci

# 2. Build the web app (dist/ is gitignored, so it must be built here)
echo "--- npm run build ---"
npm run build

# 3. Sync web assets + native config into the Xcode project
echo "--- cap sync ios ---"
npx cap sync ios --no-open

echo "=== Post-clone complete ==="
