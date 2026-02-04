#!/bin/bash

# Script de vérification de l'installation PVP
# Usage: ./check_pvp_install.sh

echo "🔍 Vérification de l'installation du système PVP..."
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier les fichiers
echo "📁 Vérification des fichiers..."

files=(
    "backend/install_pvp_tables.php"
    "backend/test_pvp_status.php"
    "backend/pvp_lobby.php"
    "components/battle/PvPLobby.tsx"
    "assets/test_pvp.html"
    "INSTALL_PVP.md"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file (manquant)"
    fi
done

echo ""
echo "📋 Instructions :"
echo "1. Ouvrez http://votre-domaine/assets/test_pvp.html"
echo "2. Cliquez sur '📦 Installer les Tables PVP'"
echo "3. Vérifiez que vous voyez '✅ Succès !'"
echo "4. Testez avec 2 onglets différents"
echo ""
echo "📖 Pour plus d'informations, consultez INSTALL_PVP.md"
