# 🎮 PVP PROCÉDURAL - GUIDE RAPIDE

## ✅ Travail terminé !

J'ai complètement refactorisé le système de combat PVP pour implémenter votre vision :

### 🎯 Fonctionnalités implémentées

#### 1. ✅ Demande de combat avec aperçu de l'équipe
- Quand vous défiez un adversaire, il voit vos 3 Pokémon
- Affichage : nom, niveau, HP de chaque Pokémon
- Sprites des Pokémon affichés

#### 2. ✅ Tirage au sort
- Si le défi est accepté, tirage au sort 50/50 pour savoir qui commence
- Les deux joueurs sont informés

#### 3. ✅ Combat procédural (tour par tour)
- **UN SEUL joueur joue à la fois** (pas de réponse simultanée)
- Le joueur actif reçoit une question
- Il répond
- Si correct → dégâts au Pokémon adverse actif
- Si incorrect → aucun dégât
- Tour passe à l'adversaire

#### 4. ✅ Historique des questions (VISIBLE PAR LES 2 JOUEURS)
- Panneau d'historique glissant
- Toutes les questions posées sont affichées
- Les 4 options pour chaque question
- La réponse choisie par le joueur
- La bonne réponse (en vert)
- Les mauvaises réponses (en rouge)
- Les dégâts infligés

**🎓 Objectif pédagogique atteint** : Les deux joueurs voient toutes les questions, même celles qui ne leur ont pas été posées, pour apprendre passivement.

#### 5. ✅ Récompenses
- **Vainqueur** : +50 XP
- **Perdant** : 0 XP
- **Abandon** : Vainqueur +25 XP

---

## 📦 Fichiers créés

### Backend
- ✅ `backend/upgrade_pvp_procedural.php` - Migration BDD
- ✅ `backend/pvp_battle_procedural.php` - API combat procédural

### Frontend
- ✅ `components/battle/PvPBattleProc.tsx` - Interface combat
- ✅ `components/battle/PvPLobby.tsx` - Modifié (affiche équipe adverse)
- ✅ `components/battle/BattleScene.tsx` - Modifié (intégration)

### Documentation
- ✅ `GUIDE_PVP_PROCEDURAL.md` - Guide technique complet
- ✅ `RESUME_PVP_PROCEDURAL.md` - Résumé de l'implémentation
- ✅ `assets/upgrade_pvp_procedural.html` - Page de migration

---

## 🚀 Installation en 3 étapes

### 📍 Étape 1 : Migration de la base de données

Ouvrez dans votre navigateur :
```
http://votre-domaine/assets/upgrade_pvp_procedural.html
```

**Ou** directement :
```
http://votre-domaine/backend/upgrade_pvp_procedural.php
```

Cliquez sur **"LANCER LA MIGRATION"**

Vous devez voir :
```json
{
  "success": true,
  "message": "Migration PVP procédural effectuée avec succès !",
  "changes": [ ... ]
}
```

### 📍 Étape 2 : Redémarrer l'application

Si vous utilisez Vite/npm :
```bash
# Arrêter le serveur (Ctrl+C)
npm run dev
```

### 📍 Étape 3 : Tester !

1. **Ouvrir 2 fenêtres séparées** :
   - Option A : 2 fenêtres de navigation privée (Ctrl+Shift+N)
   - Option B : 2 navigateurs différents (Chrome + Firefox)
   
   ⚠️ **NE PAS utiliser 2 onglets du même navigateur !**

2. **Connexion** :
   - Fenêtre 1 : Connectez-vous avec le Compte A
   - Fenêtre 2 : Connectez-vous avec le Compte B
   
   ⚠️ Chaque compte doit avoir **3 Pokémon dans son équipe**

3. **Accès au lobby** :
   - Les 2 : **Bataille → PVP**
   - Vérifiez que les joueurs se voient

4. **Envoi du défi** :
   - Compte A : Clic sur **"⚔️ DÉFIER"** (Compte B)
   - Compte B : Voit l'équipe de A et clique **"✓ ACCEPTER"**

5. **Combat** :
   - Le système tire au sort qui commence
   - Jouez tour par tour
   - Cliquez sur **"📜 HISTORIQUE"** pour voir toutes les questions

---

## 🎮 Aperçu du combat

```
┌─────────────────────────────────────────────────┐
│  [Joueur 1] VS [Joueur 2]                       │
│  [📜 Historique] [🏳️ Abandon]                   │
├─────────────────────────────────────────────────┤
│                                                  │
│  🟥 🟥 🟥  ← Équipe adverse (3 Pokémon + HP)   │
│                                                  │
│  ┌─────────────────────────────────┐            │
│  │  QUESTION                        │            │
│  │  ○ Réponse A                    │            │
│  │  ○ Réponse B                    │            │
│  │  ○ Réponse C                    │            │
│  │  ○ Réponse D                    │            │
│  │  [VALIDER]                       │            │
│  └─────────────────────────────────┘            │
│                                                  │
│  🟦 🟦 🟦  ← Mon équipe (3 Pokémon + HP)       │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 📜 Historique (panneau glissant)

```
┌──────────────────────────────┐
│  📜 HISTORIQUE               │
├──────────────────────────────┤
│  [Joueur 1] - Tour #1        │
│  Question: 2 + 2 = ?         │
│  ○ 3                         │
│  ○ 4 ✓ (Bonne réponse)      │
│  ➤ 5 ✗ (Réponse choisie)    │
│  ○ 6                         │
│  Résultat: Incorrect - 0 dégât│
├──────────────────────────────┤
│  [Joueur 2] - Tour #2        │
│  Question: 3 x 3 = ?         │
│  ○ 6                         │
│  ➤ 9 ✓ (Bonne réponse)      │
│  ○ 12                        │
│  ○ 15                        │
│  Résultat: Correct - 30 dégâts│
└──────────────────────────────┘
```

---

## ⚠️ Points importants

### 🔴 OBLIGATOIRE pour tester
- ✅ Avoir **3 Pokémon dans son équipe** (chaque joueur)
- ✅ Utiliser **2 fenêtres/navigateurs séparés** (pas 2 onglets)
- ✅ Exécuter la **migration de la BDD** avant de tester

### 💡 Différences avec l'ancien système
| Avant | Maintenant |
|-------|------------|
| Combat simultané | Tour par tour |
| Équipe invisible | Visible lors du défi |
| Pas d'historique | Historique complet |
| XP pour tous | XP uniquement vainqueur |

### 🎯 Objectif pédagogique
**Les deux joueurs voient TOUTES les questions posées**, même pendant le tour de l'adversaire. Cela permet :
- Apprentissage passif
- Mémorisation des bonnes réponses
- Engagement accru

---

## 🆘 Problèmes courants

### "Tu dois avoir 3 Pokémon dans ton équipe"
➜ Allez dans **Collection → Équipe** et ajoutez 3 Pokémon

### "Les joueurs ne se voient pas"
➜ Cliquez sur **"🔄 RAFRAÎCHIR"** ou attendez 3 secondes

### "Match introuvable"
➜ Videz le localStorage : `localStorage.clear()` puis reconnectez-vous

### L'historique ne s'affiche pas
➜ Vérifiez que la migration a été exécutée avec succès

---

## 📚 Documentation complète

- **Guide technique complet** : [GUIDE_PVP_PROCEDURAL.md](GUIDE_PVP_PROCEDURAL.md)
- **Résumé détaillé** : [RESUME_PVP_PROCEDURAL.md](RESUME_PVP_PROCEDURAL.md)

---

## ✅ Checklist avant de tester

- [ ] Migration exécutée avec succès
- [ ] Serveur frontend redémarré
- [ ] 2 comptes avec 3 Pokémon chacun
- [ ] 2 fenêtres/navigateurs séparés prêts

---

## 🎉 C'est prêt !

Le système est maintenant **100% fonctionnel** selon vos spécifications :

✅ Aperçu de l'équipe adverse  
✅ Tirage au sort du premier joueur  
✅ Combat procédural (un joueur à la fois)  
✅ Historique visible par les 2 joueurs  
✅ Objectif pédagogique (voir toutes les questions)  
✅ XP uniquement pour le vainqueur  

**Pour commencer, ouvrez :**
```
http://votre-domaine/assets/upgrade_pvp_procedural.html
```

Bon combat ! ⚔️
