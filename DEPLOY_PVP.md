# 🚀 Guide de Déploiement PVP

## 📦 Nouveaux Fichiers à Déployer

Les fichiers suivants doivent être présents sur le serveur :

### Backend
- ✅ `backend/install_pvp_tables.php` - Script d'installation des tables
- ✅ `backend/test_pvp_status.php` - API de test et diagnostic
- ✅ `backend/pvp_lobby.php` - API du lobby PVP (déjà existant, modifié)

### Assets
- ✅ `assets/test_pvp.html` - Interface de test complète
- ✅ `assets/install_pvp.html` - Page d'installation guidée

---

## 🎯 Méthodes de Déploiement

### Option 1 : Déploiement Rapide PVP (Recommandé)

Déploie uniquement les 4 nouveaux fichiers PVP :

```bash
npm run deploy:pvp
```

**Avantages :**
- ⚡ Rapide (< 10 secondes)
- 🎯 Déploie uniquement les fichiers PVP
- 🔒 N'affecte pas le reste de l'application

---

### Option 2 : Déploiement Backend Complet

Déploie tout le backend (sans rebuild du frontend) :

```bash
npm run deploy:backend
```

**Avantages :**
- 📦 Déploie tous les fichiers PHP
- ⏭️ Pas de rebuild React (plus rapide)

---

### Option 3 : Déploiement Complet

Build React + Backend + Assets :

```bash
npm run deploy
```

**Avantages :**
- 🌐 Déploie l'application complète
- 🔨 Build React inclus

---

## 🔍 Vérification du Déploiement

### 1. Vérifier que les fichiers sont présents

Connectez-vous en SFTP et vérifiez :

```
/backend/install_pvp_tables.php
/backend/test_pvp_status.php
/assets/test_pvp.html
/assets/install_pvp.html
```

### 2. Tester l'installation

Ouvrez dans votre navigateur :

```
https://poke.sarlatc.com/backend/install_pvp_tables.php
```

Vous devriez voir :
```json
{
  "success": true,
  "message": "Tables PVP créées avec succès !",
  "tables": ["online_players", "pvp_challenges", "pvp_matches"]
}
```

### 3. Tester la page d'installation

```
https://poke.sarlatc.com/assets/install_pvp.html
```

Vous devriez voir une page avec un gros bouton "Installer les Tables PVP".

---

## 🛠️ Déploiement Manuel (Si Automatique Échoue)

### Via SFTP Client (FileZilla, WinSCP, etc.)

1. **Connectez-vous** avec vos identifiants SFTP
2. **Naviguez** vers le dossier `/backend/`
3. **Uploadez** les 2 fichiers PHP :
   - `install_pvp_tables.php`
   - `test_pvp_status.php`
4. **Naviguez** vers le dossier `/assets/`
5. **Uploadez** les 2 fichiers HTML :
   - `test_pvp.html`
   - `install_pvp.html`

### Via Ligne de Commande (SCP)

```bash
# Backend files
scp backend/install_pvp_tables.php user@host:/path/to/backend/
scp backend/test_pvp_status.php user@host:/path/to/backend/

# Assets files
scp assets/test_pvp.html user@host:/path/to/assets/
scp assets/install_pvp.html user@host:/path/to/assets/
```

---

## 📋 Checklist de Déploiement

- [ ] Fichiers locaux vérifiés (présents dans workspace)
- [ ] Variables d'environnement configurées (.env)
- [ ] Déploiement exécuté (`npm run deploy:pvp`)
- [ ] Fichiers vérifiés sur le serveur (SFTP)
- [ ] Test URL install_pvp_tables.php
- [ ] Test URL install_pvp.html
- [ ] Installation des tables réussie
- [ ] Test avec 2 comptes en PVP

---

## 🐛 Problèmes Courants

### "Les fichiers ne sont pas sur le serveur"

**Causes possibles :**
1. Le déploiement n'a pas été exécuté
2. Les identifiants SFTP sont incorrects
3. Les permissions du dossier distant sont incorrectes

**Solutions :**
```bash
# 1. Vérifier les variables d'environnement
cat .env | grep SFTP

# 2. Tester la connexion SFTP
sftp $SFTP_USER@$SFTP_HOST

# 3. Déployer manuellement les fichiers
npm run deploy:pvp

# 4. Si échec, déploiement manuel via FileZilla/WinSCP
```

### "Access Denied" ou "Permission Denied"

**Solution :**
1. Vérifiez les permissions SFTP
2. Essayez de créer les dossiers manuellement
3. Contactez votre hébergeur

### "File Not Found" après déploiement

**Solution :**
1. Vérifiez le chemin distant (`REMOTE_ROOT` dans .env)
2. Vérifiez que les dossiers `backend/` et `assets/` existent
3. Uploadez manuellement via SFTP

---

## 📝 Commandes Utiles

```bash
# Déployer uniquement les fichiers PVP (rapide)
npm run deploy:pvp

# Déployer tout le backend
npm run deploy:backend

# Déploiement complet avec build
npm run deploy

# Vérifier que les fichiers existent localement
ls -la backend/install_pvp_tables.php
ls -la backend/test_pvp_status.php
ls -la assets/test_pvp.html
ls -la assets/install_pvp.html

# Tester la connexion SFTP
sftp -P 22 $SFTP_USER@$SFTP_HOST
```

---

## ✅ Après le Déploiement

1. **Testez l'installation** :
   ```
   https://poke.sarlatc.com/backend/install_pvp_tables.php
   ```

2. **Ouvrez la page guidée** :
   ```
   https://poke.sarlatc.com/assets/install_pvp.html
   ```

3. **Testez le PVP** :
   - 2 onglets, 2 comptes
   - Bataille → PVP
   - Les joueurs doivent se voir

---

**Besoin d'aide ?** Consultez [INSTALL_PVP.md](./INSTALL_PVP.md) pour plus de détails.
