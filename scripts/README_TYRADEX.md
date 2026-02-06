Usage rapide pour récupérer Tyradex

- Script: `scripts/download_tyradex.sh`
- But: ce script utilise `wget` pour mirror le contenu du domaine `tyradex.app` dans `assets/tyradex`.
- Il télécharge images, JSON, JS, CSS et pages HTML et n'écrase pas les fichiers déjà présents (`--no-clobber`).

Prérequis:

- `wget` installé

Exemple d'utilisation:

```bash
chmod +x scripts/download_tyradex.sh
./scripts/download_tyradex.sh
# ou (recommandé pour le JSON + images):
node scripts/fetch_tyradex_pokemon.js
```

Remarques légales et pratiques:

- Assurez-vous d'avoir le droit de récupérer et stocker ces données et images localement.
- Respectez les règles du site (robots.txt) et la charge serveur (ajouter `--wait` et `--limit-rate` si besoin).
- Pour mises à jour incrémentales, relancer le script; il ne réécrira pas les fichiers existants par défaut.
