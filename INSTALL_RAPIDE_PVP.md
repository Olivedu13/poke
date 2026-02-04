# ⚡ INSTALLATION RAPIDE PVP

## 🎯 Problème Résolu
Les joueurs ne se voyaient pas dans le lobby PVP → **Tables de base de données manquantes**

---

## ✅ Solution en 1 Clic

### Ouvrez cette URL dans votre navigateur :

```
http://votre-domaine/backend/install_pvp_tables.php
```

**Remplacez `votre-domaine` par votre URL réelle.**

Exemples :
- `https://poke.sarlatc.com/backend/install_pvp_tables.php`
- `http://localhost/poke/backend/install_pvp_tables.php`

---

## 📋 Résultat Attendu

Vous devriez voir ce JSON :

```json
{
  "success": true,
  "message": "Tables PVP créées avec succès !",
  "tables": ["online_players", "pvp_challenges", "pvp_matches"]
}
```

---

## 🧪 Tester

### ⚠️ Important : Utilisez des Navigateurs/Fenêtres Séparés

Pour tester le PVP, vous **devez utiliser** :

**Option 1 : Navigation Privée (Recommandé)** 🎭
1. **Fenêtre normale** : Connectez-vous avec le Compte A
2. **Fenêtre privée** (Ctrl+Shift+N sur Chrome) : Connectez-vous avec le Compte B

**Option 2 : Navigateurs Différents** 🌐
1. **Chrome** : Connectez-vous avec le Compte A
2. **Firefox/Edge** : Connectez-vous avec le Compte B

**⚠️ Ne PAS utiliser 2 onglets du même navigateur !**  
Raison : Les deux onglets partagent le même `localStorage`, donc se connecter dans l'onglet 2 déconnecte l'onglet 1.

### Test du PVP

1. **Ouvrez 2 fenêtres séparées** (voir options ci-dessus)
2. **Connectez-vous** avec 2 comptes différents dans chaque fenêtre
3. Allez dans **Bataille → PVP** sur chaque fenêtre
4. Cliquez sur **🔄 RAFRAÎCHIR** pour actualiser la liste
5. **Les joueurs se voient** maintenant ! 🎉
6. Cliquez sur **⚔️ DÉFIER** pour envoyer un défi

---

## 🔧 Alternative - Page Guidée

Si vous préférez une interface visuelle :

```
http://votre-domaine/assets/install_pvp.html
```

Cette page détecte automatiquement votre domaine et génère les bonnes URLs.

---

## 🆘 Problème ?

Si vous voyez `{"success": false, ...}`, vérifiez :

1. **Le fichier config.php existe** dans `/backend/`
2. **Les identifiants de BDD sont corrects** dans `config.php`
3. **L'utilisateur MySQL a les droits** CREATE TABLE

---

## ✨ Fonctionnalités Ajoutées

- ✓ **Détection automatique** des joueurs en ligne (toutes les 3s)
- ✓ **Bouton Rafraîchir** 🔄 dans le lobby
- ✓ **Nettoyage auto** des joueurs inactifs (> 30s)
- ✓ **Système de défis** entre joueurs

---

**Temps d'installation** : < 1 minute ⚡

**Documentation complète** : [INSTALL_PVP.md](./INSTALL_PVP.md)
