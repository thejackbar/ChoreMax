#!/bin/bash
# ChoreMax Server Deploy Script
# Runs on the host when the webhook is triggered.
set -e

PROJECT="/srv/docker/choremax"
echo "[$(date)] Starting deploy..."

cd "$PROJECT"
git pull origin main
echo "[$(date)] Git pull complete"

docker compose up -d --build nginx
echo "[$(date)] nginx rebuilt"

docker compose up -d --build backend
echo "[$(date)] backend rebuilt"

echo "[$(date)] Deploy complete ✅"
