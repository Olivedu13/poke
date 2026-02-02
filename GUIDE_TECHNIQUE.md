
# 📘 Poke-Edu : Guide Technique & Déploiement

Ce document sert de référence pour la configuration de l'environnement de développement (IDE) et la procédure de mise en production.

---

## 1. 🛠 Intégration VSCode

Pour garantir une qualité de code uniforme et faciliter le débogage, configurez votre espace de travail VSCode comme suit.

### A. Extensions Recommandées
Créez un fichier `.vscode/extensions.json` à la racine :

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",       // Linter JS/TS
    "esbenp.prettier-vscode",       // Formatteur de code
    "bradlc.vscode-tailwindcss",    // Autocomplétion CSS
    "bmewburn.vscode-intelephense-client", // Intelligence PHP
    "mikestead.dotenv"              // Support des fichiers .env
  ]
}
```

### B. Configuration de l'Espace de Travail
Créez un fichier `.vscode/settings.json` pour forcer le formatage à la sauvegarde :

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "[php]": {
    "editor.defaultFormatter": "bmewburn.vscode-intelephense-client"
  },
  "intelephense.environment.includePaths": [
    "backend/"
  ]
}
```

### C. Débogage (Launch Configuration)
Pour lancer le frontend via la touche F5, créez `.vscode/launch.json` :

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Lancer Poke-Edu (Localhost)",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}"
    }
  ]
}
```

---

## 2. ⚡ Optimisations & Performance

Avant de déployer, vérifiez les points suivants pour assurer une expérience fluide :

1.  **Compression des Assets :**
    *   Convertissez toutes les images (PNG/JPG) en **WebP** (déjà fait pour la plupart).
    *   Assurez-vous que les fichiers MP3 sont en bitrate 128kbps (suffisant pour le web) pour réduire leur poids.

2.  **Lazy Loading :**
    *   React charge tout le code au démarrage. Pour optimiser, utilisez `React.lazy` pour les vues lourdes comme `Shop` ou `Collection`.

3.  **Base de Données :**
    *   Ajoutez des index sur les colonnes souvent recherchées (`user_id` dans `user_pokemon` et `inventory`) pour accélérer les requêtes SQL.
    *   *SQL à exécuter :*
        ```sql
        ALTER TABLE user_pokemon ADD INDEX (user_id);
        ALTER TABLE inventory ADD INDEX (user_id);
        ```

---

## 3. 🚀 Procédure de Déploiement Complet

Nous utilisons un déploiement via SFTP combiné à un build React.

### Pré-requis Serveur
*   Hébergement PHP 8.0+ (IONOS, OVH, etc.).
*   Base de données MySQL/MariaDB.
*   Accès SSH/SFTP.

### Étape 1 : Build du Frontend
Cette commande compile le TypeScript et React en fichiers HTML/JS/CSS statiques optimisés dans le dossier `dist/`.

```bash
npm run build
```

### Étape 2 : Configuration d'Environnement (Production)
Assurez-vous que le fichier `.env` local contient les bons identifiants SFTP pour le script de déploiement :

```env
SFTP_HOST=poke.sarlatc.com
SFTP_USER=votre_user
SFTP_PASSWORD=votre_pass
SFTP_PORT=22
REMOTE_ROOT=/
```

### Étape 3 : Déploiement Automatisé
Lancez le script Node.js qui va uploader le dossier `dist` (frontend) et le dossier `backend` (API PHP).

```bash
node deploy.js
```

### Étape 4 : Connexion Base de Données (Production)
1.  Ouvrez le fichier `backend/db_connect.php` sur votre serveur (via FileZilla ou l'éditeur de l'hébergeur).
2.  Vérifiez que les variables `$host`, `$db`, `$user`, `$pass` correspondent bien à la base de données de **Production** (et non localhost).

### Étape 5 : Migration SQL
Si vous avez modifié la structure de la base de données :
1.  Exportez votre structure locale (sans les données).
2.  Importez-la via phpMyAdmin sur le serveur de production.
3.  Ou lancez le script d'auto-installation si vous l'avez uploadé : `https://poke.sarlatc.com/backend/install_db.php`.

---

## 4. 🔄 Cycle de Maintenance (Refactorisation Future)

Pour la version 2.0, voici la roadmap technique recommandée :

1.  **Sécuriser l'API :** Remplacer l'envoi de `user_id` par un header `Authorization: Bearer <token>`.
2.  **Dockeriser le projet :** Créer un `Dockerfile` et `docker-compose.yml` pour que tout développeur puisse lancer le projet avec une seule commande (`docker-compose up`).
3.  **Tests Unitaires :** Ajouter `Vitest` pour tester la logique de combat (`combat_engine.php` équivalent en JS ou tests PHPUnit pour le backend).

