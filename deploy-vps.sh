#!/bin/bash
# Script de déploiement automatique vers VPS
set -e

VPS_IP="87.106.1.134"
VPS_USER="root"
SSH_KEY=".ssh_vps"
PROJECT_DIR="/opt/poke-edu"

echo "🚀 Déploiement Poke-Edu vers VPS..."

# 1. Build backend
echo "📦 Build backend..."
cd server
pnpm install --prod
pnpm build
cd ..

# 2. Build frontend  
echo "📦 Build frontend..."
cd client
pnpm install
pnpm build
cd ..

# 3. Upload backend
echo "📤 Upload backend..."
rsync -avz --delete \
  -e "ssh -i $SSH_KEY" \
  --exclude 'node_modules' \
  --exclude 'src' \
  --exclude '.env' \
  server/ $VPS_USER@$VPS_IP:$PROJECT_DIR/server/

# 4. Upload frontend
echo "📤 Upload frontend..."
rsync -avz --delete \
  -e "ssh -i $SSH_KEY" \
  client/dist/ $VPS_USER@$VPS_IP:$PROJECT_DIR/client/dist/

# 5. Install dependencies et restart sur VPS
echo "🔄 Install dependencies et restart..."
ssh -i $SSH_KEY $VPS_USER@$VPS_IP << 'ENDSSH'
cd /opt/poke-edu/server
pnpm install --prod
npx prisma generate
pm2 reload ecosystem.config.js --update-env || pm2 start ecosystem.config.js
pm2 save
ENDSSH

echo "✅ Déploiement terminé!"
echo "🌐 Application disponible sur: https://jeu.sarlatc.com"
