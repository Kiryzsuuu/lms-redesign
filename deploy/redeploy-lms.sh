#!/bin/bash
# Usage: redeploy-lms
# Jalankan dari mana saja — script otomatis masuk ke folder yang benar.

set -e
APP_DIR="/var/www/lms-redesign"
PM2_NAME="lms-api"

echo "==> [1/4] Pull latest code..."
cd "$APP_DIR"
git pull origin master

echo "==> [2/4] Install backend deps..."
npm install --prefix server --omit=dev

echo "==> [3/4] Build frontend..."
npm install --prefix client
npm run build --prefix client

echo "==> [4/4] Restart PM2..."
pm2 restart "$PM2_NAME"
pm2 status

echo ""
echo "✅  Deploy selesai! Cek log: pm2 logs $PM2_NAME"
