# Architecture PvP - Solution Long Polling pour IONOS Mutualisé

## 🎯 Architecture Choisie : Long Polling

### Pourquoi Long Polling ?

✅ **Compatible IONOS Mutualisé** :
- Pas de port spécial requis (utilise HTTP/HTTPS standard)
- Pas besoin de Node.js ou serveur externe
- Fonctionne avec PHP + MySQL uniquement
- Aucune modification d'hébergement nécessaire

❌ **Alternatives NON compatibles** :
- **WebSockets** : Ports bloqués sur mutualisé
- **Server-Sent Events (SSE)** : Timeout 30s sur PHP mutualisé
- **Node.js + Socket.io** : Pas de runtime Node.js disponible

## 📊 Architecture Technique

### 1. Base de Données (MySQL)

```sql
-- Matches PvP en cours (6 max simultanés)
CREATE TABLE pvp_matches (
    id VARCHAR(36) PRIMARY KEY,
    player1_id INT NOT NULL,
    player2_id INT NOT NULL,
    player1_team JSON,           -- [pokemonId1, pokemonId2, pokemonId3]
    player2_team JSON,
    current_turn INT DEFAULT 1,  -- Tour actuel
    battle_state JSON,            -- État complet (HP, Pokemon actifs, etc.)
    status ENUM('WAITING', 'ACTIVE', 'FINISHED'),
    winner_id INT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Actions des joueurs (attaques, items, changements)
CREATE TABLE pvp_actions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    match_id VARCHAR(36),
    player_id INT,
    action_type ENUM('ATTACK', 'ITEM', 'SWITCH', 'SURRENDER'),
    action_data JSON,             -- {damage: 50, pokemonId: 1, ...}
    turn_number INT,
    created_at TIMESTAMP
);

-- File d'attente matchmaking
CREATE TABLE pvp_queue (
    user_id INT PRIMARY KEY,
    grade_level VARCHAR(10),      -- Matchmaking par niveau
    team_json JSON,
    queued_at TIMESTAMP
);
```

### 2. Flux Long Polling

#### Phase 1 : Matchmaking
```
Client → POST /pvp_system.php?action=join_queue
         {team: [poke1, poke2, poke3], grade: "CM1"}

Serveur → Recherche adversaire même niveau
       ↓ Si trouvé :
         - Crée pvp_match
         - Retire les 2 joueurs de la queue
         - Retourne match_id

Client → Reçoit {matched: true, match_id: "abc123", opponent: {...}}
```

#### Phase 2 : Combat (Polling)
```
Client → Toutes les 2 secondes : POST /pvp_system.php?action=poll_state
         {match_id: "abc123", last_turn: 5}

Serveur → Compare current_turn avec last_turn
       ↓ Si changement :
         - Récupère nouvelles actions
         - Retourne état mis à jour

Client → Reçoit {updated: true, actions: [...], is_my_turn: true}
       ↓ Si c'est mon tour :
         - Affiche question
         - Joueur répond
         
Client → POST /pvp_system.php?action=send_action
         {match_id: "abc123", action_type: "ATTACK", data: {damage: 50}}

Serveur → Enregistre action
       ↓ Incrémente current_turn
       ↓ L'autre joueur récupère l'action au prochain poll
```

#### Phase 3 : Fin du combat
```
Client → POST /pvp_system.php?action=end_match
         {match_id: "abc123", winner_id: 42}

Serveur → Marque status = 'FINISHED'
       ↓ Donne récompenses (500 gold, 200 XP)
       ↓ Libère les 2 slots PvP
```

### 3. Frontend React/TypeScript

```typescript
// services/pvpService.ts
export class PvPService {
    private matchId: string | null = null;
    private pollingInterval: NodeJS.Timeout | null = null;
    private lastTurn: number = 0;

    // Rejoindre la file d'attente
    async joinQueue(team: Pokemon[]): Promise<MatchResult> {
        const res = await api.post('/pvp_system.php', {
            action: 'join_queue',
            team: team.map(p => p.id)
        });

        if (res.data.matched) {
            this.matchId = res.data.match_id;
            this.startPolling();
        } else {
            // Pas d'adversaire, attendre avec check périodique
            this.waitForMatch();
        }

        return res.data;
    }

    // Attendre qu'un adversaire rejoigne
    private waitForMatch() {
        const checkInterval = setInterval(async () => {
            const res = await api.post('/pvp_system.php', {
                action: 'check_match'
            });

            if (res.data.matched) {
                clearInterval(checkInterval);
                this.matchId = res.data.match_id;
                this.startPolling();
                this.onMatchFound(res.data);
            }
        }, 3000); // Vérifier toutes les 3 secondes
    }

    // Démarrer le polling du combat
    private startPolling() {
        this.pollingInterval = setInterval(async () => {
            const res = await api.post('/pvp_system.php', {
                action: 'poll_state',
                match_id: this.matchId,
                last_turn: this.lastTurn
            });

            if (res.data.updated) {
                this.lastTurn = res.data.match.current_turn;
                this.onStateUpdate(res.data);
            }
        }, 2000); // Poll toutes les 2 secondes
    }

    // Envoyer une action (attaque)
    async sendAction(actionType: string, data: any) {
        await api.post('/pvp_system.php', {
            action: 'send_action',
            match_id: this.matchId,
            action_type: actionType,
            action_data: data
        });
    }

    // Arrêter le polling
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
    }

    // Callbacks (à override)
    onMatchFound(data: any) {}
    onStateUpdate(data: any) {}
}
```

### 4. Composant PvP React

```typescript
// components/pvp/PvPBattle.tsx
import { useState, useEffect } from 'react';
import { PvPService } from '../../services/pvpService';

export const PvPBattle = () => {
    const [pvpService] = useState(() => new PvPService());
    const [matchState, setMatchState] = useState(null);
    const [isMyTurn, setIsMyTurn] = useState(false);

    useEffect(() => {
        // Callbacks
        pvpService.onMatchFound = (data) => {
            console.log('Match trouvé !', data.opponent);
        };

        pvpService.onStateUpdate = (data) => {
            setMatchState(data.match);
            setIsMyTurn(data.match.is_my_turn);

            // Traiter les actions adverses
            data.actions.forEach(action => {
                processOpponentAction(action);
            });
        };

        // Rejoindre la queue
        const team = getMyTeam(); // [3 Pokemon]
        pvpService.joinQueue(team);

        return () => pvpService.stopPolling();
    }, []);

    const handleAttack = async (isCorrect: boolean, damage: number) => {
        await pvpService.sendAction('ATTACK', {
            correct: isCorrect,
            damage: damage
        });
        setIsMyTurn(false);
    };

    return (
        <div>
            {isMyTurn ? (
                <QuizOverlay onComplete={handleAttack} />
            ) : (
                <div>En attente de l'adversaire...</div>
            )}
        </div>
    );
};
```

## 🚀 Performance & Limites

### Avec Long Polling (2s)

**6 combats PvP simultanés** :
- Requêtes/seconde : 6 joueurs × 2 players × 0.5 req/s = **6 req/s**
- Latence tour par tour : **2-4 secondes** (acceptable pour tour par tour)
- Bande passante : ~10 KB/req × 6 req/s = **60 KB/s** (~5 MB/min)

**Compatible IONOS Mutualisé** :
- ✅ CPU : Faible (requêtes MySQL simples)
- ✅ RAM : ~50 MB pour 6 combats
- ✅ Connexions DB : ~12 simultanées (bien en dessous des 100 autorisées)
- ✅ Bande passante : Négligeable

### Optimisations Possibles

1. **Cache Redis** (si disponible) :
   - Stocker battle_state en Redis au lieu de JSON dans MySQL
   - Réduire latence de 50%

2. **Polling Adaptatif** :
   - 1s pendant mon tour
   - 3s pendant le tour adverse
   - 5s si inactif

3. **Compression** :
   - Gzip sur réponses API (économise 70% bande passante)

4. **Cleanup automatique** :
   - Cron job toutes les 5 minutes : `DELETE FROM pvp_queue WHERE queued_at < NOW() - INTERVAL 5 MINUTE`
   - Suppression matches terminés : `DELETE FROM pvp_matches WHERE status = 'FINISHED' AND updated_at < NOW() - INTERVAL 1 HOUR`

## 🔒 Sécurité

### Anti-Cheat

```php
// Vérifier que le joueur ne triche pas sur les dégâts
function validateDamage($clientDamage, $attackerLevel, $isCorrect) {
    $baseDamage = $isCorrect ? ($attackerLevel * 2) : 0;
    $expectedMin = $baseDamage * 0.8;
    $expectedMax = $baseDamage * 1.2;
    
    if ($clientDamage < $expectedMin || $clientDamage > $expectedMax) {
        logCheatAttempt($playerId);
        return $baseDamage; // Utiliser la valeur serveur
    }
    
    return $clientDamage;
}

// Vérifier que c'est bien le tour du joueur
function validateTurn($match, $playerId) {
    $isPlayer1 = ($match['player1_id'] == $playerId);
    $isMyTurn = $isPlayer1 
        ? ($match['current_turn'] % 2 == 1) 
        : ($match['current_turn'] % 2 == 0);
    
    return $isMyTurn;
}

// Rate limiting
function checkRateLimit($userId, $pdo) {
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM pvp_actions WHERE player_id = ? AND created_at > NOW() - INTERVAL 10 SECOND");
    $stmt->execute([$userId]);
    $count = $stmt->fetchColumn();
    
    return $count < 3; // Max 3 actions / 10 secondes
}
```

## 📈 Évolution Future

### Si succès (>50 joueurs actifs)

**Option 1 : VPS avec WebSockets** (Recommandé)
- Coût : 10-15€/mois (Scaleway, OVH, DigitalOcean)
- Stack : Node.js + Express + Socket.io
- Latence : <100ms (temps réel)
- Capacité : 100+ combats simultanés

**Option 2 : Serveur dédié**
- Coût : 50€/mois
- Capacité : 500+ combats simultanés
- Load balancing possible

**Option 3 : Service managé**
- Firebase Realtime Database : 25€/mois
- Pusher : 30€/mois
- Ably : 30€/mois

### Migration Progressive

1. **Phase actuelle** : IONOS mutualisé + Long Polling (6 PvP max)
2. **Phase 2** (50+ joueurs) : VPS dédié PvP + IONOS pour le reste
3. **Phase 3** (500+ joueurs) : Serveur dédié + CDN + Redis

## ✅ Checklist Déploiement

- [x] Tables MySQL créées (pvp_matches, pvp_actions, pvp_queue)
- [x] Backend pvp_system.php avec toutes les actions
- [x] Limite 6 combats PvP (pas de limite pour bot/sauvage)
- [ ] Frontend PvPService et composant PvPBattle
- [ ] Tests avec 2-4 joueurs réels
- [ ] Monitoring : nombre de PvP actifs
- [ ] Cron job cleanup toutes les 5 minutes

## 🎮 Expérience Utilisateur

**Latence perçue** :
- Matchmaking : 5-30 secondes (selon affluence)
- Tour par tour : 2-4 secondes (acceptable)
- Réponse immédiate : Animations locales pendant l'attente

**Retour visuel** :
- Indicateur "Adversaire en train de jouer..."
- Animations de transition fluides
- Notification sonore quand c'est votre tour

---

**Conclusion** : Le système Long Polling avec 6 combats PvP max est parfaitement adapté à votre hébergement mutualisé IONOS. C'est une solution **stable, économique et scalable** qui vous permet de tester le PvP sans investissement supplémentaire.
