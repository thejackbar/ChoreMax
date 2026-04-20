#!/bin/bash
# ChoreMax Deploy Launcher

cd "$(dirname "$0")"

# Step 1: Push to GitHub + deploy server + trigger Xcode Cloud
python3 deploy.py

# Step 2: Rebuild the web app and sync latest changes into the iOS project
echo ""
echo "▶  Building frontend and syncing to Xcode..."
cd frontend
npm run build && npx cap sync ios
cd ..

# Step 3: Open Xcode with the iOS project
echo ""
echo "▶  Opening Xcode..."
open frontend/ios/App/App.xcodeproj

echo ""
echo "Press any key to close this window..."
read -n 1
