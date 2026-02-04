#!/bin/bash

echo "🔍 Vérification des fichiers PVP Procédural..."
echo ""

files=(
    "backend/upgrade_pvp_procedural.php"
    "backend/pvp_battle_procedural.php"
    "components/battle/PvPBattleProc.tsx"
    "assets/upgrade_pvp_procedural.html"
    "GUIDE_PVP_PROCEDURAL.md"
    "RESUME_PVP_PROCEDURAL.md"
)

all_ok=true

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file - MANQUANT"
        all_ok=false
    fi
done

echo ""

if [ "$all_ok" = true ]; then
    echo "🎉 Tous les fichiers sont présents !"
    echo ""
    echo "📋 Prochaines étapes :"
    echo "1. Ouvrir http://votre-domaine/assets/upgrade_pvp_procedural.html"
    echo "2. Cliquer sur 'LANCER LA MIGRATION'"
    echo "3. Tester avec 2 comptes dans 2 fenêtres privées"
else
    echo "⚠️  Certains fichiers sont manquants"
fi
