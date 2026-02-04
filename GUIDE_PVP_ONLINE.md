# Guide PvP en Ligne - Architecture et Recommandations

## 🎯 Objectif
Permettre aux joueurs de s'affronter en temps réel dans des combats Pokémon éducatifs.

## 📋 Architecture Recommandée pour Serveur Mutualisé

### 1. **Technologies Backend**

#### Option A : WebSockets avec Ratchet (PHP)
```php
// Installation
composer require cboden/ratchet

// Structure
/backend/
  /websocket/
    server.php          // Serveur WebSocket
    BattleRoom.php      // Gestion des salles de combat
    MatchMaking.php     // Système de matchmaking
```

**Avantages** :
- Intégration native avec votre stack PHP existante
- Partage de la base de données et des sessions
- Pas besoin de serveur externe

**Inconvénients** :
- Performance limitée sur hébergement mutualisé
- Nécessite un port dédié (souvent bloqué)
- IONOS mutualisé ne supporte généralement pas les WebSockets

#### Option B : Long Polling (Recommandé pour Mutualisé)
```php
// backend/pvp_polling.php
// Les clients interrogent régulièrement le serveur

// Structure
/backend/
  pvp_matchmaking.php    // Trouve un adversaire
  pvp_send_action.php    // Envoie une action (attaque, item)
  pvp_poll_state.php     // Récupère l'état actuel du combat
  pvp_cleanup.php        // Nettoie les sessions expirées
```

**Avantages** :
- ✅ Compatible avec TOUS les hébergements mutualisés
- ✅ Pas de port spécial requis
- ✅ Utilise HTTP/HTTPS standard
- ✅ Fonctionne avec votre infrastructure actuelle

**Inconvénients** :
- Latence plus élevée (1-2 secondes)
- Plus de requêtes serveur
- Consommation bande passante supérieure

### 2. **Base de Données**

#### Nouvelles tables nécessaires

```sql
-- Table des combats PvP en cours
CREATE TABLE pvp_battles (
    id VARCHAR(36) PRIMARY KEY,
    player1_id INT NOT NULL,
    player2_id INT NOT NULL,
    current_turn INT DEFAULT 1,
    player1_team JSON,
    player2_team JSON,
    battle_state JSON,
    status ENUM('WAITING', 'ACTIVE', 'FINISHED') DEFAULT 'WAITING',
    winner_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (player1_id) REFERENCES users(id),
    FOREIGN KEY (player2_id) REFERENCES users(id)
);

-- Table des actions en attente
CREATE TABLE pvp_actions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    battle_id VARCHAR(36) NOT NULL,
    player_id INT NOT NULL,
    action_type ENUM('ATTACK', 'ITEM', 'SWITCH', 'SURRENDER'),
    action_data JSON,
    turn_number INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (battle_id) REFERENCES pvp_battles(id) ON DELETE CASCADE,
    INDEX idx_battle_turn (battle_id, turn_number)
);

-- Table de matchmaking
CREATE TABLE pvp_queue (
    user_id INT PRIMARY KEY,
    grade_level VARCHAR(10),
    team_json JSON,
    queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Classement PvP
CREATE TABLE pvp_ranking (
    user_id INT PRIMARY KEY,
    elo_rating INT DEFAULT 1000,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    draws INT DEFAULT 0,
    streak INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 3. **Flux PvP avec Long Polling**

#### 3.1 Matchmaking
```php
// backend/pvp_matchmaking.php
<?php
require_once 'protected_setup.php';

// Ajouter le joueur à la file
$team = $input['team']; // IDs des 3 Pokemon
$grade = $user['grade_level'];

// Vérifier si un adversaire est disponible
$opponent = findOpponentInQueue($grade, $pdo);

if ($opponent) {
    // Créer la bataille
    $battleId = createPvPBattle($userId, $opponent['user_id'], $team, $opponent['team'], $pdo);
    removeFromQueue($opponent['user_id'], $pdo);
    
    send_json([
        'success' => true,
        'matched' => true,
        'battle_id' => $battleId,
        'opponent' => $opponent
    ]);
} else {
    // Ajouter à la file d'attente
    addToQueue($userId, $grade, $team, $pdo);
    send_json(['success' => true, 'matched' => false, 'waiting' => true]);
}
```

#### 3.2 Polling de l'état du combat
```php
// backend/pvp_poll_state.php
<?php
require_once 'protected_setup.php';

$battleId = $input['battle_id'];
$lastTurn = $input['last_turn'] ?? 0;

// Récupérer l'état actuel
$battle = getBattleState($battleId, $pdo);

// Vérifier si de nouvelles actions sont disponibles
$newActions = getActionsSinceTurn($battleId, $lastTurn, $pdo);

if ($newActions || $battle['current_turn'] > $lastTurn) {
    send_json([
        'success' => true,
        'updated' => true,
        'battle' => $battle,
        'actions' => $newActions
    ]);
} else {
    send_json(['success' => true, 'updated' => false]);
}
```

#### 3.3 Envoi d'une action
```php
// backend/pvp_send_action.php
<?php
require_once 'protected_setup.php';

$battleId = $input['battle_id'];
$action = $input['action']; // 'ATTACK', 'ITEM', 'SWITCH'
$actionData = $input['data'];

// Vérifier que c'est le tour du joueur
$battle = getBattleState($battleId, $pdo);
if (!isPlayerTurn($battle, $userId)) {
    send_json(['success' => false, 'message' => 'Pas votre tour']);
}

// Enregistrer l'action
registerAction($battleId, $userId, $action, $actionData, $battle['current_turn'], $pdo);

// Passer au tour suivant
incrementTurn($battleId, $pdo);

send_json(['success' => true]);
```

### 4. **Frontend - Intégration React**

```typescript
// services/pvpService.ts
export class PvPService {
    private pollingInterval: NodeJS.Timeout | null = null;
    private battleId: string | null = null;
    private lastTurn: number = 0;

    // Rejoindre la file d'attente
    async joinQueue(team: Pokemon[]) {
        const res = await api.post('/pvp_matchmaking.php', { team });
        if (res.data.matched) {
            this.battleId = res.data.battle_id;
            this.startPolling();
            return res.data;
        }
        return null;
    }

    // Démarrer le polling
    private startPolling() {
        this.pollingInterval = setInterval(async () => {
            try {
                const res = await api.post('/pvp_poll_state.php', {
                    battle_id: this.battleId,
                    last_turn: this.lastTurn
                });
                
                if (res.data.updated) {
                    this.lastTurn = res.data.battle.current_turn;
                    // Mettre à jour l'UI
                    this.onBattleUpdate(res.data);
                }
            } catch (e) {
                console.error('Polling error:', e);
            }
        }, 1500); // Poll toutes les 1.5 secondes
    }

    // Envoyer une action
    async sendAction(action: string, data: any) {
        return await api.post('/pvp_send_action.php', {
            battle_id: this.battleId,
            action,
            data
        });
    }

    // Arrêter le polling
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }
}
```

### 5. **Optimisations pour Serveur Mutualisé**

#### 5.1 Gestion de la charge
```php
// Limiter le nombre de combats simultanés
$maxConcurrentBattles = 50;
$activeBattles = countActiveBattles($pdo);
if ($activeBattles >= $maxConcurrentBattles) {
    send_json(['success' => false, 'message' => 'Serveur plein, réessayez']);
}
```

#### 5.2 Nettoyage automatique
```php
// backend/pvp_cleanup.php (Cron job toutes les 5 minutes)
<?php
require_once 'db_connect.php';

// Supprimer les batailles inactives depuis 10 minutes
$pdo->exec("DELETE FROM pvp_battles WHERE status = 'ACTIVE' AND updated_at < NOW() - INTERVAL 10 MINUTE");

// Vider la file d'attente ancienne
$pdo->exec("DELETE FROM pvp_queue WHERE queued_at < NOW() - INTERVAL 5 MINUTE");

// Supprimer les actions anciennes
$pdo->exec("DELETE FROM pvp_actions WHERE created_at < NOW() - INTERVAL 1 HOUR");

echo "Cleanup done";
```

#### 5.3 Index et performance
```sql
-- Index pour améliorer les performances
CREATE INDEX idx_battles_status ON pvp_battles(status, updated_at);
CREATE INDEX idx_queue_grade ON pvp_queue(grade_level, queued_at);
CREATE INDEX idx_actions_battle ON pvp_actions(battle_id, turn_number);
```

### 6. **Alternative : Serveur Externe (Avancé)**

Si le budget le permet, hébergez le PvP sur un serveur dédié :

#### Option 1 : VPS avec Node.js + Socket.io
- **Coût** : 5-10€/mois (Scaleway, OVH, DigitalOcean)
- **Avantages** : Vraie communication temps réel, meilleure performance
- **Stack** : Node.js + Express + Socket.io + MySQL

#### Option 2 : Service managé
- **Firebase Realtime Database** : 0-25€/mois selon usage
- **Pusher** : 0-50€/mois
- **Ably** : 0-30€/mois

### 7. **Sécurité PvP**

```php
// Vérifications obligatoires

// 1. Validation des actions
function validateAction($action, $battle, $userId, $pdo) {
    // Vérifier que c'est le tour du joueur
    if (!isPlayerTurn($battle, $userId)) return false;
    
    // Vérifier que l'action est légale
    if ($action['type'] === 'ITEM') {
        $hasItem = checkUserInventory($userId, $action['item_id'], $pdo);
        if (!$hasItem) return false;
    }
    
    // Empêcher le spam
    $lastAction = getLastUserAction($userId, $battle['id'], $pdo);
    if ($lastAction && time() - $lastAction['created_at'] < 2) {
        return false; // Minimum 2 secondes entre actions
    }
    
    return true;
}

// 2. Anti-cheat : vérifier les dégâts calculés côté client
function verifyDamage($clientDamage, $attacker, $defender, $isCorrect) {
    $serverDamage = calculateDamage($attacker, $defender, $isCorrect);
    $tolerance = 0.1; // 10% de tolérance
    
    if (abs($clientDamage - $serverDamage) / $serverDamage > $tolerance) {
        logCheatAttempt($attacker['user_id']);
        return $serverDamage; // Utiliser le calcul serveur
    }
    
    return $clientDamage;
}
```

### 8. **Système de Classement ELO**

```php
// Calcul ELO après chaque combat
function updateEloRatings($winnerId, $loserId, $pdo) {
    $K = 32; // Facteur K (sensibilité)
    
    $winner = getPlayerElo($winnerId, $pdo);
    $loser = getPlayerElo($loserId, $pdo);
    
    // Probabilité de victoire
    $expectedWin = 1 / (1 + pow(10, ($loser['elo'] - $winner['elo']) / 400));
    
    // Nouveau rating
    $newWinnerElo = $winner['elo'] + $K * (1 - $expectedWin);
    $newLoserElo = $loser['elo'] + $K * (0 - (1 - $expectedWin));
    
    // Mise à jour
    updatePlayerElo($winnerId, $newWinnerElo, $pdo);
    updatePlayerElo($loserId, $newLoserElo, $pdo);
}
```

## 📊 Estimation des Ressources

### Pour 100 joueurs simultanés en PvP (Long Polling)
- **Bande passante** : ~5-10 MB/s
- **Requêtes/seconde** : ~100-150
- **Connexions DB** : ~20-30
- **RAM** : ~512 MB (cache PHP)

### Limites Hébergement Mutualisé IONOS
- ⚠️ **Connexions simultanées** : 100-150 max
- ⚠️ **CPU** : Partagé, throttling possible
- ⚠️ **Timeout** : 30-60 secondes max par requête
- ✅ **Compatible** : Long Polling uniquement

## 🎮 Recommandation Finale

**Pour MVP (Phase 1)** :
1. ✅ Implémenter le mode Dresseur Bot (fait)
2. ✅ Tester la stabilité avec bots
3. ⏳ Ajouter Long Polling PvP (2-3 jours de dev)
4. ⏳ Tester avec 10-20 utilisateurs max

**Pour Production (Phase 2)** :
1. Migrer vers VPS dédié (10€/mois)
2. Implémenter WebSockets
3. Ajouter système anti-cheat robuste
4. Classement et saisons

## 📞 Support et Scalabilité

**Si succès et croissance** :
- VPS → Serveur dédié (50€/mois)
- Ajouter Redis pour cache temps réel
- CDN pour assets (Cloudflare gratuit)
- Load balancing multi-serveurs

---

**Conclusion** : Le mode PvP est faisable sur mutualisé avec Long Polling, mais limité à 20-30 combats simultanés. Pour une vraie expérience PvP, un VPS est recommandé dès 50+ joueurs actifs.
