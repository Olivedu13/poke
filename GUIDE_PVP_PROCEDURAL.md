# 🎮 SYSTÈME PVP PROCÉDURAL - DOCUMENTATION COMPLÈTE

## 📋 Vue d'ensemble

Le système de combat PVP a été entièrement refactorisé pour implémenter un **combat procédural tour par tour** avec un objectif pédagogique : permettre aux deux joueurs de voir toutes les questions et réponses posées pendant le combat.

---

## ✨ Fonctionnalités

### 1. 🤝 Demande de combat
- **Affichage de l'équipe adverse** : Quand un joueur envoie un défi, l'autre joueur voit les 3 Pokémon de son adversaire (nom, niveau, HP)
- Validation que les deux joueurs ont bien 3 Pokémon dans leur équipe

### 2. 🎲 Tirage au sort
- Si le défi est accepté, le système tire au sort qui commence (50/50)
- Les deux joueurs sont informés de qui joue en premier

### 3. ⚔️ Combat procédural
Le combat est **strictement tour par tour** :

#### Tour d'un joueur :
1. Le joueur actif reçoit une **question** adaptée à son niveau
2. Il choisit une réponse parmi les options proposées
3. Il valide sa réponse
4. **La question ET la réponse sont enregistrées** dans l'historique
5. Si la réponse est correcte → **Dégâts au Pokémon actif de l'adversaire**
6. Si la réponse est incorrecte → **Aucun dégât**
7. Le tour passe à l'adversaire

#### Dégâts :
- **Facile** : 20 HP
- **Moyen** : 30 HP
- **Difficile** : 40 HP

#### KO d'un Pokémon :
- Si les HP d'un Pokémon tombent à 0, il passe automatiquement au suivant
- Si tous les Pokémon d'un joueur sont KO → **Fin du combat**

### 4. 📜 Historique pédagogique
- **Les deux joueurs voient TOUTES les questions posées** (même celles qui ne leur étaient pas destinées)
- L'historique affiche :
  - Quel joueur a répondu
  - La question posée
  - Les 4 options
  - La réponse choisie par le joueur
  - La bonne réponse (visible après validation)
  - Les dégâts infligés

**Objectif pédagogique** : Les joueurs peuvent apprendre des questions posées à leur adversaire et mémoriser les bonnes réponses.

### 5. 🏆 Récompenses
- **Vainqueur** : +50 XP
- **Perdant** : 0 XP (pas de récompense)
- En cas d'abandon : Le vainqueur reçoit 25 XP (récompense réduite)

---

## 🗂️ Architecture technique

### Backend

#### 1. `backend/pvp_lobby.php` (modifié)
**Fonctionnalités** :
- `send_challenge` : Envoie un défi avec l'équipe du challenger (3 Pokémon)
- `get_challenges` : Récupère les défis reçus avec les équipes adverses
- `accept_challenge` : Accepte un défi et crée le match avec les équipes complètes

#### 2. `backend/pvp_battle_procedural.php` (nouveau)
**API complète du combat procédural** :

| Action | Description |
|--------|-------------|
| `init_battle` | Initialise le combat avec tirage au sort du premier joueur |
| `get_state` | Récupère l'état complet du match (équipes, HP, tours, historique) |
| `get_question` | Génère une nouvelle question pour le joueur actif |
| `submit_answer` | Soumet une réponse, calcule les dégâts, change de tour |
| `forfeit` | Abandonne le match |

#### 3. `backend/upgrade_pvp_procedural.php` (migration)
**Modifications de la base de données** :

**Table `pvp_matches` :**
```sql
- player1_team JSON          -- Équipe complète du joueur 1 (3 Pokémon)
- player2_team JSON          -- Équipe complète du joueur 2 (3 Pokémon)
- player1_team_hp JSON       -- HP actuels de l'équipe 1 [HP1, HP2, HP3]
- player2_team_hp JSON       -- HP actuels de l'équipe 2 [HP1, HP2, HP3]
- player1_active_pokemon INT -- Index du Pokémon actif (0-2)
- player2_active_pokemon INT -- Index du Pokémon actif (0-2)
- xp_reward INT              -- XP gagnée par le vainqueur
- waiting_for_answer BOOL    -- En attente de réponse du joueur actif
```

**Table `pvp_turns` :**
```sql
- question_text TEXT         -- Texte de la question
- question_options JSON      -- Options de réponse [opt1, opt2, opt3, opt4]
- correct_index INT          -- Index de la bonne réponse (0-3)
- answer_index INT           -- Index de la réponse choisie
- is_correct BOOL            -- La réponse était-elle correcte ?
- damage_dealt INT           -- Dégâts infligés
- target_pokemon_index INT   -- Pokémon ciblé (0-2)
```

**Table `pvp_challenges` :**
```sql
- challenger_team JSON       -- Équipe du challenger pour preview
```

### Frontend

#### 1. `components/battle/PvPLobby.tsx` (modifié)
**Affichage des défis avec équipes adverses** :
- Liste des défis reçus
- Aperçu de l'équipe adverse (3 Pokémon avec sprites, noms, niveaux, HP)
- Boutons Accepter/Refuser

#### 2. `components/battle/PvPBattleProc.tsx` (nouveau)
**Interface complète du combat procédural** :

**Structure** :
```
┌─────────────────────────────────────────┐
│  [Mon Nom] VS [Nom Adversaire]          │
│  [📜 Historique] [🏳️ Abandon]           │
├─────────────────────────────────────────┤
│  Équipe adverse (3 Pokémon + HP)        │
│                                          │
│  ┌───────────────────────────┐          │
│  │   QUESTION + RÉPONSES     │          │
│  │   (si c'est mon tour)     │          │
│  └───────────────────────────┘          │
│                                          │
│  Mon équipe (3 Pokémon + HP)            │
├─────────────────────────────────────────┤
│  📜 PANNEAU HISTORIQUE (glissant)       │
│     - Tour 1: Question + Réponses       │
│     - Tour 2: Question + Réponses       │
│     - ...                                │
└─────────────────────────────────────────┘
```

**Fonctionnalités** :
- Affichage temps réel des équipes et HP
- Mise en évidence du Pokémon actif
- Question avec 4 options (si c'est mon tour)
- Message "En attente de [Adversaire]..." (si ce n'est pas mon tour)
- Panneau d'historique glissant avec toutes les questions/réponses
- Auto-refresh toutes les 2 secondes

#### 3. `components/battle/BattleScene.tsx` (modifié)
**Intégration du nouveau système** :
```typescript
// Combat PvP procédural
if (battleMode === 'PVP' && (phase === 'BATTLE' || phase === 'ACTIVE')) {
    return <PvPBattleProc />;
}
```

---

## 🚀 Installation

### Méthode 1 : Interface Web (Recommandé)

Ouvrez dans votre navigateur :
```
http://votre-domaine/assets/upgrade_pvp_procedural.html
```

Cliquez sur **"LANCER LA MIGRATION"**

### Méthode 2 : Accès direct

Ouvrez dans votre navigateur :
```
http://votre-domaine/backend/upgrade_pvp_procedural.php
```

### Vérification

Vous devriez voir :
```json
{
  "success": true,
  "message": "Migration PVP procédural effectuée avec succès !",
  "changes": [
    "Colonne player1_team ajoutée",
    "Colonne player2_team ajoutée",
    ...
  ]
}
```

---

## 🧪 Test du système

### Prérequis
- 2 comptes utilisateurs avec chacun **3 Pokémon dans leur équipe**
- 2 fenêtres de navigation privée (ou 2 navigateurs différents)

⚠️ **Important** : Ne pas utiliser 2 onglets du même navigateur (ils partagent le localStorage)

### Scénario de test

1. **Connexion**
   - Fenêtre 1 : Connectez-vous avec le Compte A
   - Fenêtre 2 : Connectez-vous avec le Compte B

2. **Accès au lobby PVP**
   - Les 2 joueurs vont dans **Bataille → PVP**
   - Vérifiez que les deux joueurs se voient dans la liste

3. **Envoi du défi**
   - Compte A clique sur **"⚔️ DÉFIER"** (Compte B)
   - Compte A voit **"⏳ EN ATTENTE"**

4. **Réception du défi**
   - Compte B voit une notification de défi reçu
   - Compte B voit **l'équipe de Compte A** (3 Pokémon avec noms, niveaux, HP)
   - Compte B clique sur **"✓ ACCEPTER"**

5. **Tirage au sort**
   - Le système tire au sort qui commence
   - Les 2 joueurs voient un message indiquant qui joue en premier

6. **Combat procédural**
   - **Joueur actif** :
     - Reçoit une question
     - Sélectionne une réponse
     - Clique sur "VALIDER"
     - Voit si sa réponse était correcte et les dégâts infligés
   
   - **Joueur en attente** :
     - Voit "En attente de [Adversaire]..."
     - L'interface se rafraîchit automatiquement

7. **Historique**
   - Les 2 joueurs cliquent sur **"📜 HISTORIQUE"**
   - Vérifiez que toutes les questions apparaissent
   - Vérifiez que les bonnes réponses sont marquées en vert
   - Vérifiez que les réponses incorrectes sont marquées en rouge

8. **Fin du combat**
   - Combat jusqu'à KO de tous les Pokémon d'un joueur
   - Le vainqueur voit **"🏆 VICTOIRE ! +50 XP"**
   - Le perdant voit **"😢 DÉFAITE"**

---

## 🔧 Dépannage

### Problème : "Tu dois avoir 3 Pokémon dans ton équipe"
**Solution** : Allez dans Collection → Équipe et ajoutez 3 Pokémon à votre équipe active

### Problème : "Les joueurs ne se voient pas dans le lobby"
**Solution** : Cliquez sur le bouton **"🔄 RAFRAÎCHIR"** ou attendez 3 secondes (auto-refresh)

### Problème : "Match introuvable"
**Solution** : 
1. Vérifiez que la migration a été exécutée
2. Videz le localStorage : `localStorage.clear()`
3. Reconnectez-vous

### Problème : "L'historique ne s'affiche pas"
**Solution** : Vérifiez que la colonne `question_text` existe dans `pvp_turns` :
```sql
SHOW COLUMNS FROM pvp_turns LIKE 'question_text';
```

---

## 📊 Différences avec l'ancien système

| Fonctionnalité | Ancien système | Nouveau système |
|----------------|----------------|-----------------|
| Combat | Simultané | Procédural (tour par tour) |
| Équipe visible | Non | Oui (lors du défi) |
| Historique | Non | Oui (visible par les 2 joueurs) |
| Questions visibles | Seulement les miennes | Toutes (objectif pédagogique) |
| Premier joueur | Toujours player1 | Tirage au sort |
| XP pour perdant | Oui | Non |
| Gestion Pokémon KO | Manuelle | Automatique |

---

## 🎯 Avantages pédagogiques

1. **Apprentissage passif** : Les joueurs apprennent même pendant le tour de leur adversaire
2. **Mémorisation** : Voir les questions et réponses plusieurs fois aide à mémoriser
3. **Motivation** : Le combat est plus engageant car il faut attendre son tour
4. **Fairplay** : Le système procédural évite la triche (impossible de répondre en même temps)

---

## 📝 Notes techniques

### Polling
Le système utilise un polling de **2 secondes** pour rafraîchir l'état du match côté frontend :
```typescript
useEffect(() => {
    const interval = setInterval(() => {
        fetchState();
    }, 2000);
    return () => clearInterval(interval);
}, [matchId]);
```

### Sécurité
- La bonne réponse est envoyée au client uniquement pendant son tour
- Les tours sont validés côté serveur (impossible de répondre quand ce n'est pas son tour)
- Les HP sont calculés côté serveur (impossible de tricher)

### Performance
- Les équipes sont stockées en JSON pour éviter les jointures multiples
- L'historique est chargé une seule fois puis mis à jour par polling
- Les images Pokémon sont mises en cache par le navigateur

---

## 🚀 Améliorations futures possibles

- [ ] WebSocket pour mise à jour en temps réel (au lieu de polling)
- [ ] Animations de dégâts plus visuelles
- [ ] Système de replay pour revoir les combats
- [ ] Classement PVP avec ELO
- [ ] Tournois automatiques
- [ ] Chat entre joueurs pendant le combat

---

## 📞 Support

En cas de problème, vérifiez :
1. La migration a été exécutée avec succès
2. Les deux joueurs ont 3 Pokémon dans leur équipe
3. Le localStorage n'est pas partagé entre les fenêtres de test
4. La console JavaScript pour les erreurs

---

**Développé avec ❤️ pour l'apprentissage par le jeu**
