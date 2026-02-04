# 🎮 MISE À JOUR PVP - Système de Tour par Tour

## 🎯 Nouvelles Fonctionnalités

### 1. Combat PVP en Tour par Tour ✅
- Chaque joueur joue à son tour
- Indication claire de qui doit jouer
- Affichage de la question et réponse de l'adversaire

### 2. Suppression des Invitations en Double ✅  
- Quand un défi est accepté, tous les autres défis entre ces 2 joueurs sont annulés

### 3. Affichage en Temps Réel ✅
- Voir les actions de l'adversaire
- Historique des tours
- Indicateur visuel du tour actuel

---

## 📦 INSTALLATION

### Étape 1 : Migrer la Base de Données

Ouvrez cette URL pour ajouter les colonnes nécessaires :

```
https://poke.sarlatc.com/backend/migrate_pvp_turns.php
```

**Résultat attendu :**
```json
{
  "success": true,
  "message": "Migration réussie ! Colonne current_turn et table pvp_turns créées",
  "changes": {
    "pvp_matches.current_turn": "Ajoutée",
    "pvp_turns": "Créée"
  }
}
```

### Étape 2 : Déployer les Fichiers

Les fichiers suivants ont été créés/modifiés :

**Backend (À déployer) :**
- ✅ `backend/migrate_pvp_turns.php` - Script de migration
- ✅ `backend/pvp_battle.php` - API pour gérer les tours
- ✅ `backend/pvp_lobby.php` - Corrections (suppression invitations)

**Frontend (À déployer) :**
- ✅ `components/battle/PvPTurnDisplay.tsx` - Affichage des tours
- ✅ `components/battle/PvPLobby.tsx` - Corrections (démarrage combat)

---

## 🚀 Déploiement

```bash
# Déployer tout (recommandé)
npm run deploy

# OU déployer séparément
npm run deploy:backend   # Backend uniquement
npm run build && npm run deploy  # Frontend + Backend
```

---

## 🧪 Test du Système

### 1. Exécuter la Migration
```
https://poke.sarlatc.com/backend/migrate_pvp_turns.php
```

### 2. Tester le Combat PVP

**Joueur A (Chrome) :**
1. Se connecter
2. Aller dans Bataille → PVP
3. Voir le Joueur B
4. Cliquer sur "⚔️ DÉFIER"

**Joueur B (Firefox/Chrome Privé) :**
1. Se connecter
2. Aller dans Bataille → PVP
3. Voir le défi du Joueur A
4. Cliquer sur "✓ ACCEPTER"
5. **Le combat démarre !**

### 3. Pendant le Combat

**Tour du Joueur A :**
- Voir "🎯 À Votre Tour"
- Répondre à la question
- Le Joueur B voit "⏳ Tour de l'Adversaire"

**Après la réponse :**
- Le tour passe au Joueur B
- Le Joueur A voit la réponse et les dégâts infligés

---

## 📊 Nouveau Schéma de Base de Données

### Table `pvp_matches` (Modifiée)
```sql
ALTER TABLE pvp_matches 
ADD COLUMN current_turn INT(11) DEFAULT NULL;
```

### Table `pvp_turns` (Nouvelle)
```sql
CREATE TABLE pvp_turns (
    id INT(11) AUTO_INCREMENT PRIMARY KEY,
    match_id INT(11) NOT NULL,
    player_id INT(11) NOT NULL,
    turn_number INT(11) NOT NULL,
    question_id INT(11) DEFAULT NULL,
    answer_index TINYINT(4) DEFAULT NULL,
    is_correct TINYINT(1) DEFAULT NULL,
    damage_dealt INT(11) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🎯 Fonctionnement du Système

### Flux de Combat

1. **Joueur A** envoie un défi → `pvp_challenges` (status: pending)
2. **Joueur B** accepte → `pvp_matches` (status: IN_PROGRESS, current_turn: player1_id)
3. **Tour de A** : Répond à une question → `pvp_turns` enregistré
4. **current_turn** passe à player2_id
5. **Tour de B** : Répond → `pvp_turns` enregistré
6. **current_turn** revient à player1_id
7. Répéter jusqu'à victoire
8. Match terminé → `pvp_matches` (status: COMPLETED, winner_id: ...)

### Polling en Temps Réel

- **Frontend** : Interroge `/pvp_battle.php?action=get_match_state` toutes les 2 secondes
- **Affiche** :
  - Qui doit jouer
  - Le dernier tour de l'adversaire
  - L'historique des tours

---

## 🐛 Debugging

### Vérifier l'État d'un Match

```
https://poke.sarlatc.com/backend/pvp_battle.php?action=get_match_state&match_id=1
```

### Vérifier les Tables

```sql
-- Voir les matches en cours
SELECT * FROM pvp_matches WHERE status = 'IN_PROGRESS';

-- Voir les tours d'un match
SELECT * FROM pvp_turns WHERE match_id = 1 ORDER BY turn_number;

-- Voir qui doit jouer
SELECT id, current_turn FROM pvp_matches WHERE id = 1;
```

---

## ✨ Prochaines Améliorations

- [ ] Intégration complète dans `useBattleLogic.ts`
- [ ] Affichage des questions de l'adversaire
- [ ] Chronomètre par tour
- [ ] Animations de dégâts
- [ ] Récapitulatif de fin de match
- [ ] Système de points/classement

---

**Date** : 2026-02-04  
**Version** : 1.2 - Tour par Tour  
**Statut** : ⚠️ En cours de déploiement
