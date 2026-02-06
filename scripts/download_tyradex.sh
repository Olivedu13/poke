#!/usr/bin/env bash
set -euo pipefail

# Télécharge une copie locale du site https://tyradex.app/ dans assets/tyradex
# Utilise wget en mode miroir limité au domaine et ne supprime pas les fichiers existants.

OUT_DIR="assets/tyradex"
mkdir -p "$OUT_DIR"

echo "Démarrage du miroir Tyradex -> $OUT_DIR"

# Options importantes:
# -r : récursif
# -l 5 : profondeur maximale (ajuster si besoin)
# -k : convertir les liens pour usage local
# -p : télécharger les ressources nécessaires (images, css, js)
# -nH --cut-dirs=0 : ne pas créer l'arborescence du host
# --domains : limiter au domaine
# --accept : types de fichiers à récupérer
# --no-clobber : ne pas écraser les fichiers déjà présents

wget \
  --mirror \
  --level=5 \
  --convert-links \
  --page-requisites \
  --adjust-extension \
  --no-parent \
  --domains=tyradex.app \
  --accept jpg,jpeg,png,gif,svg,webp,json,js,css,html \
  --directory-prefix="$OUT_DIR" \
  --no-clobber \
  https://tyradex.app/

echo "Téléchargement terminé. Vérifiez $OUT_DIR"

echo "Conseil: relancer ce script périodiquement pour mettre à jour les données." 

exit 0
