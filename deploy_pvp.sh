#!/bin/bash

# Script de déploiement rapide des fichiers PVP
# Usage: ./deploy_pvp.sh

echo "🚀 Déploiement des fichiers PVP..."

# Charger les variables d'environnement
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ Fichier .env manquant"
    exit 1
fi

# Vérifier que les variables sont définies
if [ -z "$SFTP_HOST" ] || [ -z "$SFTP_USER" ] || [ -z "$SFTP_PASSWORD" ]; then
    echo "❌ Variables SFTP manquantes dans .env"
    exit 1
fi

echo "📦 Fichiers à déployer:"
echo "  - backend/install_pvp_tables.php"
echo "  - backend/test_pvp_status.php"
echo "  - assets/test_pvp.html"
echo "  - assets/install_pvp.html"
echo ""

# Créer un dossier temporaire
TMP_DIR=$(mktemp -d)
echo "📁 Dossier temporaire: $TMP_DIR"

# Copier les fichiers
mkdir -p "$TMP_DIR/backend"
mkdir -p "$TMP_DIR/assets"

cp backend/install_pvp_tables.php "$TMP_DIR/backend/"
cp backend/test_pvp_status.php "$TMP_DIR/backend/"
cp assets/test_pvp.html "$TMP_DIR/assets/"
cp assets/install_pvp.html "$TMP_DIR/assets/"

echo "✅ Fichiers copiés dans le dossier temporaire"
echo ""
echo "🔑 Utilisation de SFTP pour l'upload..."
echo "   Host: $SFTP_HOST"
echo "   User: $SFTP_USER"
echo ""

# Upload via SFTP en utilisant sshpass si disponible
if command -v sshpass &> /dev/null; then
    echo "📤 Upload des fichiers backend..."
    sshpass -p "$SFTP_PASSWORD" sftp -o StrictHostKeyChecking=no -P ${SFTP_PORT:-22} "$SFTP_USER@$SFTP_HOST" << EOF
cd ${REMOTE_ROOT:-/}/backend
put $TMP_DIR/backend/install_pvp_tables.php
put $TMP_DIR/backend/test_pvp_status.php
cd ${REMOTE_ROOT:-/}/assets
put $TMP_DIR/assets/test_pvp.html
put $TMP_DIR/assets/install_pvp.html
bye
EOF
    echo "✅ Upload terminé"
else
    echo "⚠️  sshpass non disponible. Utilisez plutôt:"
    echo ""
    echo "  node deploy.js --backend-only"
    echo ""
    echo "Ou installez sshpass:"
    echo "  sudo apt-get install sshpass"
fi

# Nettoyer
rm -rf "$TMP_DIR"

echo ""
echo "✨ Déploiement PVP terminé !"
echo ""
echo "🧪 Testez l'installation :"
echo "  https://poke.sarlatc.com/backend/install_pvp_tables.php"
echo ""
