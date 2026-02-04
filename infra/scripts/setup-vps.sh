#!/bin/bash
# ================================================================
# SCRIPT D'INSTALLATION AUTOMATIQUE VPS - POKE-EDU
# ================================================================
# Usage: curl -sSL https://raw.githubusercontent.com/.../setup-vps.sh | bash
# Ou: wget -O - https://raw.githubusercontent.com/.../setup-vps.sh | bash
# ================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
POSTGRES_VERSION=16
NODE_VERSION=20
PROJECT_DIR="/opt/poke-edu"
NGINX_SITES="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"

echo -e "${BLUE}
╔══════════════════════════════════════════════════════════╗
║         POKE-EDU VPS - INSTALLATION AUTOMATIQUE          ║
║                     Ubuntu 24.04 LTS                     ║
╚══════════════════════════════════════════════════════════╝
${NC}"

# ================================================================
# FONCTIONS UTILITAIRES
# ================================================================

log_info() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Ce script doit être exécuté en tant que root (sudo)"
        exit 1
    fi
}

# ================================================================
# ÉTAPE 1: SYSTÈME DE BASE
# ================================================================

step1_system_update() {
    log_info "Mise à jour du système..."
    apt update -qq
    apt upgrade -y -qq
    apt install -y -qq curl wget git unzip software-properties-common ufw
    log_info "Système mis à jour"
}

# ================================================================
# ÉTAPE 2: NGINX
# ================================================================

step2_install_nginx() {
    log_info "Installation de Nginx..."
    apt install -y -qq nginx
    systemctl enable nginx
    systemctl start nginx
    log_info "Nginx installé et démarré"
}

# ================================================================
# ÉTAPE 3: POSTGRESQL 16
# ================================================================

step3_install_postgresql() {
    log_info "Installation de PostgreSQL $POSTGRES_VERSION..."
    
    # Ajouter le repo officiel PostgreSQL
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg
    echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
    
    apt update -qq
    apt install -y -qq postgresql-$POSTGRES_VERSION postgresql-contrib-$POSTGRES_VERSION
    
    systemctl enable postgresql
    systemctl start postgresql
    
    log_info "PostgreSQL $POSTGRES_VERSION installé"
}

setup_postgresql_database() {
    log_info "Configuration de la base de données..."
    
    # Générer mot de passe sécurisé
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    # Créer utilisateur et base de données
    sudo -u postgres psql <<EOF
CREATE USER poke_edu WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE poke_edu_db OWNER poke_edu;
GRANT ALL PRIVILEGES ON DATABASE poke_edu_db TO poke_edu;
\c poke_edu_db
GRANT ALL ON SCHEMA public TO poke_edu;
EOF
    
    # Sauvegarder les credentials
    echo "DB_HOST=localhost" > $PROJECT_DIR/.env.database
    echo "DB_PORT=5432" >> $PROJECT_DIR/.env.database
    echo "DB_NAME=poke_edu_db" >> $PROJECT_DIR/.env.database
    echo "DB_USER=poke_edu" >> $PROJECT_DIR/.env.database
    echo "DB_PASSWORD=$DB_PASSWORD" >> $PROJECT_DIR/.env.database
    
    chmod 600 $PROJECT_DIR/.env.database
    
    log_info "Base de données configurée (credentials dans $PROJECT_DIR/.env.database)"
}

# ================================================================
# ÉTAPE 4: REDIS
# ================================================================

step4_install_redis() {
    log_info "Installation de Redis..."
    apt install -y -qq redis-server
    
    # Configurer Redis pour systemd
    sed -i 's/^supervised no/supervised systemd/' /etc/redis/redis.conf
    
    systemctl enable redis-server
    systemctl restart redis-server
    
    log_info "Redis installé et configuré"
}

# ================================================================
# ÉTAPE 5: NODE.JS 20
# ================================================================

step5_install_nodejs() {
    log_info "Installation de Node.js $NODE_VERSION..."
    
    # NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_$NODE_VERSION.x | bash -
    apt install -y -qq nodejs
    
    # Installer pnpm et PM2
    npm install -g pnpm pm2 --silent
    
    log_info "Node.js $(node -v), pnpm $(pnpm -v), PM2 installés"
}

# ================================================================
# ÉTAPE 6: FIREWALL
# ================================================================

step6_configure_firewall() {
    log_info "Configuration du pare-feu UFW..."
    
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    
    # Ports nécessaires
    ufw allow 22/tcp comment "SSH"
    ufw allow 80/tcp comment "HTTP"
    ufw allow 443/tcp comment "HTTPS"
    
    # Activer UFW
    ufw --force enable
    
    log_info "Pare-feu configuré"
}

# ================================================================
# ÉTAPE 7: STRUCTURE PROJET
# ================================================================

step7_create_project_structure() {
    log_info "Création de la structure du projet..."
    
    mkdir -p $PROJECT_DIR/{server,client,database,logs,backups}
    mkdir -p $PROJECT_DIR/server/{src,dist}
    mkdir -p $PROJECT_DIR/client/dist
    
    # Fichier .env principal
    cat > $PROJECT_DIR/.env <<EOF
NODE_ENV=production
PORT=3000
SOCKET_PORT=3001

# JWT
JWT_SECRET=$(openssl rand -base64 64 | tr -d "\n")
JWT_EXPIRES_IN=24h

# Database (voir .env.database pour credentials)
DATABASE_URL=postgresql://poke_edu:PASSWORD@localhost:5432/poke_edu_db

# Redis
REDIS_URL=redis://localhost:6379

# API externe (à configurer)
GEMINI_API_KEY=your_gemini_api_key_here

# CORS
ALLOWED_ORIGINS=https://poke.sarlatc.com,http://localhost:5173

# Logs
LOG_LEVEL=info
EOF

    chmod 600 $PROJECT_DIR/.env
    
    log_info "Structure projet créée"
}

# ================================================================
# ÉTAPE 8: NGINX CONFIGURATION
# ================================================================

step8_configure_nginx() {
    log_info "Configuration de Nginx..."
    
    # Domaine à configurer
    read -p "Entrez votre domaine (ex: poke.sarlatc.com): " DOMAIN
    
    # Configuration Nginx avec WebSocket
    cat > $NGINX_SITES/poke-edu <<EOF
# Poke-Edu VPS Configuration
# WebSocket + API REST + Frontend Static

upstream api_backend {
    server localhost:3000;
    keepalive 64;
}

upstream socket_backend {
    server localhost:3001;
    keepalive 64;
}

# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS Main Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;
    
    # SSL Configuration (Let's Encrypt)
    # ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    # ssl_trusted_certificate /etc/letsencrypt/live/$DOMAIN/chain.pem;
    
    # SSL Best Practices
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Logs
    access_log /var/log/nginx/poke-edu.access.log;
    error_log /var/log/nginx/poke-edu.error.log;
    
    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;
    
    # Frontend Static Files
    root $PROJECT_DIR/client/dist;
    index index.html;
    
    location / {
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API REST
    location /api/ {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        proxy_set_header Connection "";
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # WebSocket pour PvP temps-réel
    location /socket.io/ {
        proxy_pass http://socket_backend;
        proxy_http_version 1.1;
        
        # WebSocket upgrade
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Timeouts longs pour WebSocket
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
    
    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF
    
    # Activer le site
    ln -sf $NGINX_SITES/poke-edu $NGINX_ENABLED/poke-edu
    rm -f $NGINX_ENABLED/default
    
    # Test configuration
    nginx -t
    systemctl reload nginx
    
    log_info "Nginx configuré pour $DOMAIN"
    log_warn "N'oubliez pas de configurer SSL avec: certbot --nginx -d $DOMAIN"
}

# ================================================================
# ÉTAPE 9: PM2 ECOSYSTEM
# ================================================================

step9_configure_pm2() {
    log_info "Configuration de PM2..."
    
    cat > $PROJECT_DIR/ecosystem.config.js <<'EOF'
module.exports = {
  apps: [
    {
      name: 'poke-api',
      script: './server/dist/api.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '500M',
      autorestart: true,
      watch: false
    },
    {
      name: 'poke-socket',
      script: './server/dist/socket.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/socket-error.log',
      out_file: './logs/socket-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '500M',
      autorestart: true,
      watch: false
    }
  ]
};
EOF
    
    # Installer PM2 logrotate
    pm2 install pm2-logrotate
    pm2 set pm2-logrotate:max_size 10M
    pm2 set pm2-logrotate:retain 7
    
    log_info "PM2 configuré (ecosystem.config.js créé)"
}

# ================================================================
# ÉTAPE 10: SCRIPTS UTILITAIRES
# ================================================================

step10_create_utility_scripts() {
    log_info "Création des scripts utilitaires..."
    
    # Script de backup
    cat > /usr/local/bin/poke-backup <<'EOF'
#!/bin/bash
BACKUP_DIR="/opt/poke-edu/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup PostgreSQL
pg_dump -U poke_edu poke_edu_db | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup Redis (optionnel)
redis-cli --rdb $BACKUP_DIR/redis_$DATE.rdb

# Nettoyer anciens backups (> 7 jours)
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.rdb" -mtime +7 -delete

echo "[$(date)] Backup completed: $DATE"
EOF
    chmod +x /usr/local/bin/poke-backup
    
    # Ajouter au cron (2h du matin chaque jour)
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/poke-backup >> /opt/poke-edu/logs/backup.log 2>&1") | crontab -
    
    # Script de déploiement
    cat > /usr/local/bin/poke-deploy <<'EOF'
#!/bin/bash
PROJECT_DIR="/opt/poke-edu"

cd $PROJECT_DIR

# Pull code
git pull origin main

# Build server
cd server
pnpm install --prod
pnpm build
cd ..

# Build client
cd client
pnpm install
pnpm build
cd ..

# Reload PM2 (zero-downtime)
pm2 reload ecosystem.config.js --update-env

echo "[$(date)] Deployment completed"
EOF
    chmod +x /usr/local/bin/poke-deploy
    
    # Script de monitoring
    cat > /usr/local/bin/poke-status <<'EOF'
#!/bin/bash
echo "=== Poke-Edu Status ==="
echo ""
echo "PM2 Processes:"
pm2 list
echo ""
echo "Database:"
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname='poke_edu_db';" -d poke_edu_db
echo ""
echo "Redis:"
redis-cli ping
echo ""
echo "Disk Usage:"
df -h /opt/poke-edu
echo ""
echo "Memory:"
free -h
EOF
    chmod +x /usr/local/bin/poke-status
    
    log_info "Scripts créés: poke-backup, poke-deploy, poke-status"
}

# ================================================================
# ÉTAPE 11: SSL LET'S ENCRYPT
# ================================================================

step11_install_certbot() {
    log_info "Installation de Certbot (Let's Encrypt)..."
    
    apt install -y -qq certbot python3-certbot-nginx
    
    log_warn "Pour obtenir un certificat SSL, exécutez:"
    log_warn "  certbot --nginx -d votre-domaine.com"
    log_warn "Le renouvellement automatique est déjà configuré"
}

# ================================================================
# RÉSUMÉ FINAL
# ================================================================

show_summary() {
    echo -e "${GREEN}
╔══════════════════════════════════════════════════════════╗
║              INSTALLATION TERMINÉE AVEC SUCCÈS !          ║
╚══════════════════════════════════════════════════════════╝
${NC}"

    echo -e "${BLUE}📁 Répertoire projet:${NC} $PROJECT_DIR"
    echo -e "${BLUE}🗄️  Base de données:${NC} PostgreSQL 16 (poke_edu_db)"
    echo -e "${BLUE}🔐 Credentials DB:${NC} $PROJECT_DIR/.env.database"
    echo -e "${BLUE}🌐 Nginx config:${NC} /etc/nginx/sites-available/poke-edu"
    echo ""
    
    echo -e "${YELLOW}📝 PROCHAINES ÉTAPES:${NC}"
    echo "1. Configurer DNS pour pointer vers cette IP"
    echo "2. Obtenir certificat SSL: certbot --nginx -d votre-domaine.com"
    echo "3. Cloner votre repo: cd $PROJECT_DIR && git clone ..."
    echo "4. Migrer la base de données"
    echo "5. Build et démarrer: poke-deploy"
    echo ""
    
    echo -e "${YELLOW}🔧 COMMANDES UTILES:${NC}"
    echo "  poke-status    # Voir l'état des services"
    echo "  poke-backup    # Backup manuel"
    echo "  poke-deploy    # Déployer nouvelle version"
    echo "  pm2 monit      # Monitoring temps-réel"
    echo "  pm2 logs       # Voir les logs"
    echo ""
    
    echo -e "${GREEN}✓ Tous les services sont installés et démarrés !${NC}"
}

# ================================================================
# EXÉCUTION PRINCIPALE
# ================================================================

main() {
    check_root
    
    step1_system_update
    step2_install_nginx
    step3_install_postgresql
    setup_postgresql_database
    step4_install_redis
    step5_install_nodejs
    step6_configure_firewall
    step7_create_project_structure
    step8_configure_nginx
    step9_configure_pm2
    step10_create_utility_scripts
    step11_install_certbot
    
    show_summary
}

# Lancer l'installation
main
