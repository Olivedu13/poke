
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

### Étape 1 : Configuration des Variables d'Environnement
Créez un fichier `.env` à la racine du projet avec toutes les informations nécessaires :

```env
# SFTP (Déploiement)
SFTP_HOST=home210120109.1and1-data.host
SFTP_PORT=22
SFTP_USER=acc1680067949
SFTP_PASSWORD=poke7452!!7452pokKE
REMOTE_ROOT=/

# Base de données MySQL (Production IONOS)
DB_HOST=db5019487862.hosting-data.io
DB_NAME=dbs15241915
DB_USER=dbu5468595
DB_PASSWORD=Atc13001!!7452!!
DB_CHARSET=utf8mb4

# Clé API Gemini pour l'IA (si utilisée)
GEMINI_API_KEY=votre_cle_gemini_ici

# JWT Secret pour l'authentification
JWT_SECRET=poke_edu_super_secret_key_2026_secure
```

**⚠️ IMPORTANT :** Ne committez jamais ce fichier ! Il est déjà dans `.gitignore`.

**Configuration du Backend sur le Serveur :**

Le fichier `backend/config.php` a été créé avec vos credentials. Il sera automatiquement déployé et contient :
- Paramètres de connexion à la base de données
- Clé secrète JWT pour l'authentification
- Configuration CORS et environnement
- Mode debug (désactivé en production)

Les fichiers `db_connect.php` et `jwt_utils.php` utilisent maintenant ce fichier de configuration centralisé.

### Étape 2 : Build du Frontend
Cette commande compile le TypeScript et React en fichiers HTML/JS/CSS statiques optimisés dans le dossier `dist/`.

```bash
npm run build
```

### Étape 3 : Déploiement Automatisé
Lancez le script Node.js qui va uploader le dossier `dist` (frontend) et le dossier `backend` (API PHP).

```bash
node deploy.js
```

**Options disponibles :**
- `node deploy.js` : Déploie frontend + backend
- `node deploy.js --backend-only` ou `-b` : Déploie uniquement le backend (plus rapide pour les modifications PHP)

### Étape 4 : Connexion Base de Données (Production)
La configuration de la base de données est maintenant centralisée dans `backend/config.php` qui a été déployé automatiquement.

**Vérification :**
1. Le fichier `backend/config.php` sur le serveur contient vos credentials
2. Les fichiers `db_connect.php` et `jwt_utils.php` chargent automatiquement cette configuration
3. Si `config.php` n'existe pas, ils utilisent les valeurs en dur comme fallback

**Structure du fichier config.php :**
```php
<?php
define('DB_HOST', 'db5019487862.hosting-data.io');
define('DB_NAME', 'dbs15241915');
define('DB_USER', 'dbu5468595');
define('DB_PASSWORD', 'Atc13001!!7452!!');
define('JWT_SECRET', 'poke_edu_super_secret_key_2026_secure');
define('GEMINI_API_KEY', 'votre_cle_gemini_ici');
?>
```

**⚠️ SÉCURITÉ :** Le fichier `config.php` est dans `.gitignore` et ne sera jamais commité. Un fichier `config.example.php` est fourni comme template.

### Étape 5 : Installation de la Base de Données
Si c'est un nouveau déploiement, initialisez la base de données :

1. Accédez à `https://poke.sarlatc.com/backend/install_db.php` dans votre navigateur
2. Ce script créera automatiquement toutes les tables nécessaires
3. Ensuite, accédez à `https://poke.sarlatc.com/backend/seed_questions.php` pour charger les questions
4. Enfin, accédez à `https://poke.sarlatc.com/backend/admin_seed.php` pour créer un compte administrateur

**⚠️ IMPORTANT :** Supprimez ou protégez ces fichiers après l'installation initiale pour des raisons de sécurité.

### Étape 6 : Vérification Post-Déploiement
Testez les points suivants :

1. **Frontend :** `https://poke.sarlatc.com` doit afficher l'écran de connexion
2. **API Backend :** `https://poke.sarlatc.com/backend/test_api.php` doit retourner un message de succès
3. **Authentification :** Créez un compte utilisateur et connectez-vous
4. **Combat :** Testez un combat complet avec quiz
5. **Boutique & Collection :** Vérifiez l'achat de Pokéballs et la collection

---

## 4. 🔧 Dépannage & Erreurs Courantes

### Problème : "CORS Error" ou "Blocked by CORS policy"
**Solution :**
- Vérifiez que `backend/cors.php` est bien inclus dans tous les fichiers API PHP
- Assurez-vous que le domaine `https://poke.sarlatc.com` est autorisé dans les headers CORS
- Le fichier `cors.php` doit contenir :
```php
<?php
header('Access-Control-Allow-Origin: https://poke.sarlatc.com');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
?>
```

### Problème : "Connection refused" ou erreur 500
**Solution :**
- Vérifiez les logs du serveur PHP (via le panneau d'administration de votre hébergeur)
- Testez la connexion à la base de données avec `backend/test_api.php`
- Assurez-vous que les permissions des fichiers sont correctes (644 pour les fichiers, 755 pour les dossiers)

### Problème : Assets (images/sons) ne chargent pas
**Solution :**
- Vérifiez que le dossier `assets/` a bien été déployé
- Assurez-vous que `ASSETS_BASE_URL` dans `config.ts` pointe vers la bonne URL
- Testez l'accès direct : `https://poke.sarlatc.com/assets/music/battle.mp3`

### Problème : JWT Token invalide / Session expire immédiatement
**Solution :**
- Vérifiez que la clé secrète JWT dans `backend/jwt_utils.php` est la même sur dev et prod
- Assurez-vous que l'heure du serveur est correctement configurée (timezone)
- Vérifiez les cookies du navigateur (ils doivent accepter les cookies cross-site si nécessaire)

### Problème : Le déploiement SFTP échoue
**Solution :**
- Vérifiez que le fichier `.env` existe et contient les bonnes informations
- Testez la connexion SFTP manuellement avec FileZilla pour confirmer les credentials
- Vérifiez que le port 22 (SSH) est bien ouvert sur votre réseau
- Assurez-vous que `REMOTE_ROOT` pointe vers le bon dossier sur le serveur

---

## 5. 📊 Architecture & Technologies

### Stack Technique
- **Frontend :** React 18 + TypeScript + Vite + TailwindCSS
- **State Management :** Zustand (store global)
- **Animations :** Framer Motion
- **Backend :** PHP 8+ (API RESTful)
- **Base de Données :** MySQL/MariaDB
- **Authentification :** JWT (JSON Web Tokens)
- **Déploiement :** SFTP automatisé via Node.js

### Structure du Projet
```
poke/
├── components/       # Composants React (Auth, Battle, Dashboard, Metagame)
├── services/         # Appels API (axios)
├── store/            # State management (Zustand)
├── utils/            # Utilitaires (soundEngine, etc.)
├── assets/           # Images, sons, sprites
├── backend/          # API PHP
│   ├── auth.php            # Inscription/Connexion
│   ├── combat_engine.php   # Logique de combat
│   ├── get_question.php    # Questions quiz
│   ├── collection.php      # Gestion Pokémon capturés
│   ├── shop.php            # Boutique (achats)
│   ├── spin.php            # Roue de la fortune
│   ├── db_connect.php      # Connexion BDD
│   ├── jwt_utils.php       # Génération/validation JWT
│   └── cors.php            # Headers CORS
├── dist/             # Build production (généré par `npm run build`)
├── deploy.js         # Script de déploiement SFTP
├── config.ts         # Configuration URLs API/Assets
└── database.sql      # Schéma de la base de données
```

### Base de Données
**Tables principales :**
- `users` : Comptes utilisateurs
- `user_pokemon` : Pokémon capturés par utilisateur
- `inventory` : Objets possédés (Pokéballs, potions)
- `battle_rewards` : Récompenses temporaires après combat
- `questions` : Banque de questions quiz

---

## 6. 🎯 Roadmap & Améliorations Futures

### Fonctionnalités Prévues
- [ ] Mode multijoueur (combats PvP en temps réel)
- [ ] Leaderboard global avec classements
- [ ] Évolution des Pokémon (système de niveau/XP)
- [ ] Achievements et badges
- [ ] Sauvegarde cloud avec synchronisation multi-devices
- [ ] Mode sombre (Dark mode)
- [ ] Notifications push pour événements spéciaux
- [ ] Internationalisation (i18n) pour support multi-langues

### Optimisations Techniques
- [ ] Migration vers React Server Components (Next.js)
- [ ] Cache Redis pour les requêtes fréquentes
- [ ] CDN pour les assets statiques
- [ ] Compression Brotli pour les fichiers JS/CSS
- [ ] Service Worker pour le mode offline
- [ ] Tests E2E avec Playwright
- [ ] CI/CD avec GitHub Actions
- [ ] Dockerisation du projet (Dockerfile + docker-compose)
- [ ] Sécurisation API avec rate limiting
- [ ] Tests unitaires (Vitest + PHPUnit)

---

## 7. 📞 Support & Contact

**Développeur :** Olivedu13  
**Repository GitHub :** https://github.com/Olivedu13/poke  
**URL Production :** https://poke.sarlatc.com

Pour toute question technique, ouvrez une issue sur GitHub ou contactez l'équipe de développement.

---

**Dernière mise à jour :** 3 février 2026  
**Version du Guide :** 2.0

