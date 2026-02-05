#!/bin/bash

###############################################################################
# SCRIPT DE DÉPLOIEMENT AUTOMATIQUE VPS - POKE-EDU
# Serveur: 87.106.1.134
# Domaine: jeu.sarlatc.com
# Stack: Node.js (Backend) + React (Frontend) + PostgreSQL + Nginx
###############################################################################

set -e  # Arrêt immédiat en cas d'erreur

# ========== CONFIGURATION ==========
VPS_USER="root"
VPS_HOST="87.106.1.134"
VPS_DOMAIN="jeu.sarlatc.com"
REMOTE_DIR="/var/www/poke-edu"
DB_NAME="poke_edu"
DB_USER="pokeedu"

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ========== FONCTIONS ==========
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ========== VÉRIFICATIONS PRÉALABLES ==========
log_info "Vérification des prérequis..."

if [ ! -f "package.json" ]; then
    log_error "Erreur: package.json introuvable. Exécutez ce script depuis la racine du projet."
    exit 1
fi

if ! command -v rsync &> /dev/null; then
    log_error "rsync n'est pas installé. Installation requise: sudo apt install rsync"
    exit 1
fi

log_success "Prérequis validés"

# ========== BUILD DU FRONTEND ==========
log_info "🏗️ Build du frontend React..."

# Installation des dépendances
npm install

# Build de production
VITE_API_URL="https://${VPS_DOMAIN}/api" \
VITE_SOCKET_URL="https://${VPS_DOMAIN}" \
npm run build

if [ ! -d "dist" ]; then
    log_error "Build du frontend échoué (dossier dist introuvable)"
    exit 1
fi

log_success "Frontend buildé avec succès"

# ========== SYNCHRONISATION VERS LE VPS ==========
log_info "📦 Synchronisation des fichiers vers le VPS..."

# Créer la structure de dossiers sur le VPS
ssh ${VPS_USER}@${VPS_HOST} "mkdir -p ${REMOTE_DIR}/{frontend,backend,logs}"

# Sync du frontend (build React)
log_info "Upload du frontend..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    dist/ ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/frontend/

# Sync des assets (images, sons, etc.) - sans --delete pour ne pas supprimer les fichiers build
log_info "Upload des assets..."
rsync -avz \
    --exclude '.htaccess' \
    --exclude '*.html' \
    --exclude 'README.md' \
    assets/ ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/frontend/assets/

# Sync du backend (Node.js)
log_info "Upload du backend..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.git' \
    --exclude '.env' \
    server/ ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/backend/

log_success "Fichiers synchronisés"

# ========== CONFIGURATION DU BACKEND SUR LE VPS ==========
log_info "⚙️ Configuration et démarrage du backend..."

ssh ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
set -e

cd /var/www/poke-edu/backend

# Vérifier/Installer Node.js
if ! command -v node &> /dev/null; then
    echo "Installation de Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Installer PM2 si non présent
if ! command -v pm2 &> /dev/null; then
    echo "Installation de PM2..."
    npm install -g pm2
fi

# Installer pnpm si non présent
if ! command -v pnpm &> /dev/null; then
    echo "Installation de pnpm..."
    npm install -g pnpm
fi

# Installer les dépendances du backend
echo "Installation des dépendances Node.js..."
pnpm install

# Créer/Mettre à jour le fichier .env
if [ ! -f ".env" ]; then
    echo "Création du fichier .env..."
    cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
SOCKET_PORT=3001

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=poke_edu
DB_USER=pokeedu
DB_PASSWORD=PokeEdu2024Secure!

# JWT
JWT_SECRET=$(openssl rand -base64 32)

# CORS
CORS_ORIGIN=https://jeu.sarlatc.com
EOF
fi

# Build TypeScript
echo "Compilation du backend TypeScript..."
pnpm run build

# Générer Prisma client
echo "Génération du client Prisma..."
npx prisma generate

# Arrêter les anciens processus PM2
pm2 delete poke-api 2>/dev/null || true
pm2 delete poke-socket 2>/dev/null || true

# Démarrer les services avec PM2
echo "Démarrage de l'API Node.js..."
pm2 start dist/index.js --name poke-api --env production

# Sauvegarder la configuration PM2
pm2 save

# Configurer PM2 pour démarrer au boot
pm2 startup systemd -u root --hp /root || true

echo "Backend démarré avec succès"
ENDSSH

log_success "Backend configuré et démarré"

# ========== CONFIGURATION NGINX ==========
log_info "🌐 Configuration de Nginx..."

ssh ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
set -e

# Installer Nginx si non présent
if ! command -v nginx &> /dev/null; then
    echo "Installation de Nginx..."
    apt-get update
    apt-get install -y nginx
fi

# Créer la configuration Nginx
cat > /etc/nginx/sites-available/poke-edu << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name jeu.sarlatc.com;

    # Redirection HTTPS (décommenter après installation du certificat SSL)
    # return 301 https://$server_name$request_uri;

    # Frontend React
    root /var/www/poke-edu/frontend;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    # API Backend (Node.js)
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket (Socket.io)
    location /socket.io/ {
        proxy_pass http://localhost:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Assets statiques
    location /assets/ {
        alias /var/www/poke-edu/frontend/assets/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # React Router (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Logs
    access_log /var/log/nginx/poke-edu-access.log;
    error_log /var/log/nginx/poke-edu-error.log;
}
EOF

# Activer le site
ln -sf /etc/nginx/sites-available/poke-edu /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Tester la configuration
nginx -t

# Recharger Nginx
systemctl reload nginx
systemctl enable nginx

echo "Nginx configuré avec succès"
ENDSSH

log_success "Nginx configuré"

# ========== INSTALLATION SSL (OPTIONNEL) ==========
log_info "🔒 Configuration SSL (Let's Encrypt)..."

ssh ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
set -e

# Installer certbot si non présent
if ! command -v certbot &> /dev/null; then
    echo "Installation de Certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi

# Obtenir le certificat SSL (nécessite que le domaine pointe vers le VPS)
echo "Tentative d'obtention du certificat SSL..."
certbot --nginx -d jeu.sarlatc.com --non-interactive --agree-tos --email admin@sarlatc.com --redirect || echo "SSL non configuré (vérifier DNS)"

echo "SSL configuré (si DNS valide)"
ENDSSH

log_success "Configuration SSL terminée"

# ========== VÉRIFICATION DE LA CONNEXION DB ==========
log_info "🗄️ Vérification de la base de données PostgreSQL..."

ssh ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
set -e

# Installer PostgreSQL si non présent
if ! command -v psql &> /dev/null; then
    echo "Installation de PostgreSQL..."
    apt-get update
    apt-get install -y postgresql postgresql-contrib
    systemctl enable postgresql
    systemctl start postgresql
fi

# Vérifier que la DB et l'utilisateur existent
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'poke_edu'" | grep -q 1 || {
    echo "Création de la base de données..."
    sudo -u postgres psql << 'PSQL'
CREATE DATABASE poke_edu;
CREATE USER pokeedu WITH ENCRYPTED PASSWORD 'PokeEdu2024Secure!';
GRANT ALL PRIVILEGES ON DATABASE poke_edu TO pokeedu;
PSQL
}

echo "Base de données PostgreSQL prête"
ENDSSH

log_success "Base de données vérifiée"

# ========== LOGS ET STATUT FINAL ==========
log_info "📊 Vérification du statut des services..."

ssh ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
echo "========== STATUT DES SERVICES =========="
echo ""
echo "🟢 Node.js API:"
pm2 status poke-api

echo ""
echo "🟢 Socket.io:"
pm2 status poke-socket

echo ""
echo "🟢 Nginx:"
systemctl status nginx --no-pager | head -5

echo ""
echo "🟢 PostgreSQL:"
systemctl status postgresql --no-pager | head -5

echo ""
echo "=========================================="
ENDSSH

# ========== RÉSUMÉ ==========
echo ""
echo "========================================"
log_success "🎉 DÉPLOIEMENT TERMINÉ AVEC SUCCÈS"
echo "========================================"
echo ""
echo "📍 URL Frontend: https://${VPS_DOMAIN}"
echo "📍 URL API: https://${VPS_DOMAIN}/api"
echo "📍 WebSocket: wss://${VPS_DOMAIN}"
echo ""
echo "📝 Commandes utiles sur le VPS:"
echo "   - Logs API: ssh ${VPS_USER}@${VPS_HOST} 'pm2 logs poke-api'"
echo "   - Logs Socket: ssh ${VPS_USER}@${VPS_HOST} 'pm2 logs poke-socket'"
echo "   - Restart: ssh ${VPS_USER}@${VPS_HOST} 'pm2 restart all'"
echo "   - Status: ssh ${VPS_USER}@${VPS_HOST} 'pm2 status'"
echo ""
echo "========================================"

exit 0
