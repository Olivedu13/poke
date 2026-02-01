
# 📘 Poke-Edu : Guide de Développement & Déploiement

Ce document détaille la procédure pour configurer l'environnement de travail, intégrer vos propres assets (graphismes/sons) et déployer la solution sur le serveur de production (`poke.sarlatc.com`).

---

## 1. 🛠 Configuration VSCode (Recommandée)

Pour travailler efficacement sur ce stack (React + PHP + Tailwind), installez les extensions suivantes dans VSCode :

1.  **ESLint** (dbaeumer.vscode-eslint) : Pour la qualité du code JS/TS.
2.  **Prettier - Code formatter** (esbenp.prettier-vscode) : Pour le formatage automatique.
3.  **Tailwind CSS IntelliSense** (bradlc.vscode-tailwindcss) : Autocomplétion des classes CSS.
4.  **PHP Intelephense** (bmewburn.vscode-intelephense-client) : Intelligence pour la partie Backend.
5.  **DotENV** (mikestead.dotenv) : Pour la coloration syntaxique des fichiers `.env`.

---

## 2. 🎨 Intégration des Assets (Vos fichiers)

Il y a deux endroits où placer vos fichiers images, sons ou vidéos selon leur usage.

### A. Dossier `public/` (Assets Statiques)
**Usage :** Pour les fichiers qui ne changent jamais et qui doivent être accessibles via une URL directe (ex: `/sprites/pikachu.png`) ou chargés dynamiquement par le code (comme les sprites Pokémon depuis une base de données).

*   **Où mettre les fichiers ?** : À la racine du projet, dans le dossier `public/`.
*   **Exemple :** Si vous mettez `public/sounds/battle.mp3`.
*   **Accès dans le code :** `<audio src="/sounds/battle.mp3" />`.
*   **Au déploiement :** Ils seront copiés à la racine de votre site (`https://poke.sarlatc.com/sounds/battle.mp3`).

### B. Dossier `src/assets/` (Assets UI & Bundled)
**Usage :** Pour les icônes de l'interface, les logos du site, les images de fond qui font partie du design. Ces fichiers sont optimisés et compressés par Vite.

*   **Où mettre les fichiers ?** : Dans `src/assets/`.
*   **Accès dans le code :** Vous devez les importer en haut de vos fichiers TypeScript.
    ```typescript
    import logoImg from '../../assets/logo.png';
    // ...
    <img src={logoImg} alt="Logo" />
    ```

---

## 3. 🚀 Installation & Développement Local

### Pré-requis
*   Node.js (v18+)
*   Un serveur local PHP (XAMPP, WAMP, Laragon) ou Docker.

### Installation des dépendances
Ouvrez le terminal dans VSCode (`Ctrl + ù`) et lancez :
```bash
npm install
npm install ssh2-sftp-client dotenv --save-dev
```

### Lancer le Frontend (React)
```bash
npm run dev
```
Cela ouvre le site sur `http://localhost:5173`.
*Note : Si le Backend PHP n'est pas lancé, le jeu utilisera automatiquement le "Mode Mock" (données fictives) pour que vous puissiez quand même coder l'interface.*

### Lancer le Backend (PHP)
Le dossier `backend/` doit être servi par un serveur PHP.
*   **Option Simple :** Déplacer le dossier `backend` dans votre dossier `htdocs` ou `www`.
*   **Option Avancée :** Configurer un VirtualHost pointant vers le dossier `backend` du projet.
*   **URL attendue :** Le code s'attend à trouver l'API sur `http://localhost/backend`. Si votre URL locale est différente, modifiez `config.ts`.

---

## 4. 🌍 Déploiement Automatisé (SFTP)

Nous avons mis en place un script qui se connecte au serveur FTP et envoie les fichiers.

### Étape 1 : Configuration Sécurisée
Créez un fichier nommé `.env` à la racine du projet (si ce n'est pas déjà fait) :

```env
# Configuration SFTP
SFTP_HOST=poke.sarlatc.com
SFTP_USER=votre_utilisateur
SFTP_PASSWORD=votre_mot_de_passe
SFTP_PORT=22
REMOTE_ROOT=/
```
*⚠️ Ne commitez jamais ce fichier sur GitHub/GitLab.*

### Étape 2 : Commandes de Déploiement

**Option A : Déploiement Complet (Frontend + Backend)**
Compile le site React et envoie tout. À faire quand vous modifiez l'interface.
```bash
node deploy.js
```

**Option B : Déploiement Backend Uniquement (Rapide)**
N'envoie que les fichiers PHP du dossier `backend/`. Utile pour corriger l'API sans attendre la compilation React.
```bash
node deploy.js --backend-only
# ou
node deploy.js -b
```

### Vérification
Allez sur `https://poke.sarlatc.com`. Pensez à vider votre cache navigateur (`Ctrl + Shift + R`) si les changements n'apparaissent pas immédiatement.
