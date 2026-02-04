# Changelog - Correction Système PVP

## Version 1.1 - Correction PVP (2026-02-04)

### 🐛 Bugs Corrigés

#### **Joueurs invisibles dans le lobby PVP**
- **Problème** : Les joueurs connectés ne se voyaient pas mutuellement dans le lobby PVP
- **Cause** : Tables de base de données manquantes (`online_players`, `pvp_challenges`, `pvp_matches`)
- **Solution** : Ajout des tables dans `database.sql` et création d'un script d'installation

#### **Erreur SQL dans pvp_lobby.php**
- **Problème** : Requête SQL référençait des colonnes inexistantes
- **Erreurs** :
  - `u.level` n'existe pas → Changé en `u.global_xp as level`
  - `u.grade` n'existe pas → Changé en `u.grade_level as grade`
  - Table `pokemon` n'existe pas → Changé en `user_pokemon`
- **Solution** : Correction des noms de colonnes et tables

#### **Gestion des erreurs dans PvPLobby.tsx**
- **Problème** : Les erreurs persistaient après un fetch réussi
- **Solution** : Réinitialisation de l'état `error` à `null` lors d'un fetch réussi

---

### ✨ Nouvelles Fonctionnalités

#### **Bouton Rafraîchir**
Ajout d'un bouton manuel de rafraîchissement dans le lobby PVP
- Emplacement : En haut à droite du lobby, à côté du bouton "RETOUR"
- Apparence : Bouton bleu avec icône 🔄
- Fonctionnalité :
  - Rafraîchit immédiatement la liste des joueurs
  - Affiche une animation de rotation pendant le chargement
  - Se désactive automatiquement pendant le chargement
- Code : Nouvelle fonction `handleRefresh()` dans `PvPLobby.tsx`

#### **Interface de Test PVP**
Nouvelle page de test et diagnostic : `/assets/test_pvp.html`
- Installation en un clic des tables PVP
- Visualisation en temps réel :
  - Joueurs en ligne
  - Défis en cours
  - Matches PVP
- Outils de nettoyage :
  - Supprimer les joueurs inactifs
  - Supprimer les vieux défis
- Interface graphique moderne avec tableaux et couleurs

#### **API de Test**
Nouveau endpoint de test : `/backend/test_pvp_status.php`
- Actions disponibles :
  - `online_players` : Liste tous les joueurs en ligne
  - `challenges` : Liste tous les défis
  - `matches` : Liste tous les matches
  - `clean_players` : Nettoie les joueurs inactifs
  - `clean_challenges` : Nettoie les vieux défis
  - `tables_exist` : Vérifie l'existence des tables
- Accessible sans authentification pour faciliter le debugging

---

### 📦 Fichiers Ajoutés

```
backend/
  ├── install_pvp_tables.php    (Nouveau) Script d'installation des tables PVP
  └── test_pvp_status.php       (Nouveau) API de test et diagnostic

assets/
  └── test_pvp.html              (Nouveau) Interface de test PVP

/
  ├── INSTALL_PVP.md             (Nouveau) Guide d'installation complet
  ├── QUICKSTART_PVP.md          (Nouveau) Guide rapide
  └── check_pvp_install.sh       (Nouveau) Script de vérification
```

### 📝 Fichiers Modifiés

```
database.sql
  ├── + Ajout table online_players
  ├── + Ajout table pvp_challenges
  └── + Ajout table pvp_matches

backend/pvp_lobby.php
  ├── ✓ Correction: u.level → u.global_xp as level
  ├── ✓ Correction: u.grade → u.grade_level as grade
  └── ✓ Correction: pokemon → user_pokemon

components/battle/PvPLobby.tsx
  ├── + Ajout du bouton "RAFRAÎCHIR"
  ├── + Ajout fonction handleRefresh()
  └── ✓ Réinitialisation de l'erreur après fetch réussi
```

---

### 🗄️ Schéma des Tables

#### **online_players**
```sql
user_id      INT(11) PRIMARY KEY
status       ENUM('available', 'in_battle', 'challenged')
last_seen    TIMESTAMP
```

#### **pvp_challenges**
```sql
id             INT(11) PRIMARY KEY AUTO_INCREMENT
challenger_id  INT(11) FOREIGN KEY → users.id
challenged_id  INT(11) FOREIGN KEY → users.id
status         ENUM('pending', 'accepted', 'declined', 'expired')
created_at     TIMESTAMP
```

#### **pvp_matches**
```sql
id          INT(11) PRIMARY KEY AUTO_INCREMENT
player1_id  INT(11) FOREIGN KEY → users.id
player2_id  INT(11) FOREIGN KEY → users.id
status      ENUM('WAITING', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED')
winner_id   INT(11) FOREIGN KEY → users.id
created_at  TIMESTAMP
ended_at    TIMESTAMP NULL
```

---

### 🔄 Flux de Données Amélioré

#### **Avant (Non Fonctionnel)**
```
Frontend → API pvp_lobby.php → ❌ Tables inexistantes
```

#### **Après (Fonctionnel)**
```
Frontend → API pvp_lobby.php → ✅ Tables PVP → Base de données
     ↓                                ↓
Polling 3s                      Update last_seen
     ↓                                ↓
Bouton Refresh               Auto-cleanup 30s
```

---

### 📊 Métriques de Performance

- **Polling Interval** : 3 secondes
- **Timeout Joueur** : 30 secondes d'inactivité
- **Timeout Défi** : 5 minutes
- **Limite Historique** : 50 derniers défis/matches

---

### 🧪 Tests Effectués

✅ **Installation des Tables**
- Installation via install_pvp_tables.php
- Installation via test_pvp.html
- Installation manuelle SQL

✅ **Détection des Joueurs**
- 2 joueurs dans 2 onglets différents
- Apparition dans la liste en < 3 secondes
- Disparition après 30 secondes d'inactivité

✅ **Bouton Rafraîchir**
- Rafraîchissement immédiat de la liste
- Animation de rotation
- Désactivation pendant le chargement

✅ **Gestion des Erreurs**
- Erreur si tables manquantes
- Message d'erreur clair
- Réinitialisation après succès

---

### 🔜 Améliorations Futures

#### **Court Terme**
- [ ] Ajouter des notifications sonores pour les défis reçus
- [ ] Améliorer l'UI du lobby (avatars plus gros, animations)
- [ ] Ajouter un indicateur de latence

#### **Moyen Terme**
- [ ] Remplacer le polling par WebSockets (temps réel)
- [ ] Ajouter un système de chat dans le lobby
- [ ] Implémenter un historique de matches

#### **Long Terme**
- [ ] Système de classement ELO
- [ ] Tournois automatiques
- [ ] Replays de matches

---

### 📚 Documentation Associée

- **[INSTALL_PVP.md](./INSTALL_PVP.md)** : Guide d'installation détaillé avec debugging
- **[QUICKSTART_PVP.md](./QUICKSTART_PVP.md)** : Guide rapide en 3 étapes
- **[GUIDE_PVP_ONLINE.md](./GUIDE_PVP_ONLINE.md)** : Documentation complète du système PVP
- **[ARCHITECTURE_PVP_LONGPOLLING.md](./ARCHITECTURE_PVP_LONGPOLLING.md)** : Architecture technique

---

### 👥 Contributeurs

- Correction du système PVP
- Ajout des tables manquantes
- Interface de test et diagnostic
- Documentation complète

---

### 📝 Notes de Migration

**Pour les installations existantes** :
1. Exécuter `backend/install_pvp_tables.php`
2. Ou importer manuellement les tables depuis `database.sql`
3. Vider le cache du navigateur
4. Tester avec 2 onglets différents

**Pas de perte de données** : Les nouvelles tables n'affectent pas les données existantes

---

**Date de Release** : 2026-02-04  
**Version** : 1.1  
**Statut** : ✅ Stable
