#!/bin/sh
set -e

# Xcode Cloud pre-build script for Capacitor
# Installs Node.js and npm dependencies so Swift Package Manager
# can resolve the local @capacitor/* packages from node_modules.

echo "--- Installing Node.js via Homebrew ---"
brew install node

echo "--- Installing npm dependencies ---"
cd "$CI_PRIMARY_REPOSITORY_PATH/frontend"
npm install

echo "--- Syncing Capacitor iOS project ---"
npx cap sync ios

echo "--- Pre-build complete ---"
