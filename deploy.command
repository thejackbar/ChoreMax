#!/bin/bash
# ChoreMax Deploy Launcher
# Double-click or trigger via Stream Deck to deploy everything.

cd "$(dirname "$0")"
python3 deploy.py

echo ""
echo "Press any key to close this window..."
read -n 1
