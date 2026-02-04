# 🚀 GUIDE RAPIDE - Correction PVP

## Le Problème
❌ Les joueurs ne se voyaient pas dans le lobby PVP

## La Cause
Les tables de base de données nécessaires n'existaient pas

## La Solution (3 étapes simples)

### 1️⃣ Installer les Tables (1 minute)

**Option A : Installation Directe (Recommandée)**

Ouvrez cette URL dans votre navigateur :
```
http://votre-domaine/backend/install_pvp_tables.php
```

Vous devriez voir : ✅ **"Tables créées avec succès !"**

**Option B : Interface de Test**

Si vous préférez une interface graphique, ouvrez :
```
http://votre-domaine/assets/test_pvp.html
```

Puis cliquez sur le bouton **"📦 Installer les Tables PVP"**

---

### 2️⃣ Tester avec 2 Comptes (2 minutes)

**Onglet 1** :
- Connectez-vous avec le compte A
- Allez dans **Bataille → PVP**

**Onglet 2** :
- Connectez-vous avec le compte B  
- Allez dans **Bataille → PVP**

**✨ Résultat** : Les deux joueurs se voient maintenant dans la liste !

---

### 3️⃣ Utiliser le Bouton Rafraîchir

Un nouveau bouton **🔄 RAFRAÎCHIR** est maintenant disponible en haut du lobby :
- Cliquez dessus pour actualiser la liste immédiatement
- Utile si vous ne voyez pas tout de suite les nouveaux joueurs

---

## ✅ C'est Tout !

Le système fonctionne maintenant avec :
- ✓ Détection automatique des joueurs en ligne
- ✓ Bouton de rafraîchissement manuel
- ✓ Nettoyage automatique des joueurs inactifs (> 30 secondes)
- ✓ Système de défis entre joueurs

---

## 🐛 Ça ne marche toujours pas ?

Consultez le guide complet : **[INSTALL_PVP.md](./INSTALL_PVP.md)**

Ou testez l'API directement :
```
http://votre-domaine/backend/test_pvp_status.php?action=tables_exist
```

Interface de test (nécessite connexion) :
```
http://votre-domaine/assets/test_pvp.html
```

Cette page vous permet de :
- Voir tous les joueurs en ligne
- Voir tous les défis en cours
- Nettoyer les données obsolètes
- Diagnostiquer les problèmes

---

## 📊 Statistiques du Système

Après installation, le système PVP dispose de :
- **3 nouvelles tables** : `online_players`, `pvp_challenges`, `pvp_matches`
- **1 interface de test** : test_pvp.html
- **2 scripts PHP** : install_pvp_tables.php, test_pvp_status.php
- **1 composant amélioré** : PvPLobby.tsx avec bouton rafraîchir

---

**Temps total d'installation** : ~3 minutes ⚡
