<?php
// backend/pvp_system.php - Système PvP avec Long Polling
require_once 'protected_setup.php';
require_once 'battle_session.php';

header('Content-Type: application/json');

$action = $input['action'] ?? null;

/**
 * MATCHMAKING - Rejoindre la file d'attente PvP
 */
if ($action === 'join_queue') {
    try {
        // Vérifier si on peut lancer un PvP
        if (!canStartPvPBattle($pdo)) {
            send_json(['success' => false, 'message' => 'Serveur PvP plein (6/6)']);
        }
        
        $team = $input['team'] ?? []; // IDs des 3 Pokemon
        $gradeLevel = $user['grade_level'];
        
        // Nettoyer la vieille file (> 5 minutes)
        $pdo->exec("DELETE FROM pvp_queue WHERE queued_at < NOW() - INTERVAL 5 MINUTE");
        
        // Chercher un adversaire de niveau similaire
        $stmt = $pdo->prepare("SELECT * FROM pvp_queue WHERE grade_level = ? AND user_id != ? LIMIT 1");
        $stmt->execute([$gradeLevel, $userId]);
        $opponent = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($opponent) {
            // Match trouvé ! Créer la bataille
            $matchId = bin2hex(random_bytes(16));
            
            $pdo->beginTransaction();
            
            // Créer le match PvP
            $stmtMatch = $pdo->prepare("INSERT INTO pvp_matches (id, player1_id, player2_id, player1_team, player2_team, current_turn, status) VALUES (?, ?, ?, ?, ?, 1, 'ACTIVE')");
            $stmtMatch->execute([
                $matchId,
                $userId,
                $opponent['user_id'],
                json_encode($team),
                $opponent['team_json']
            ]);
            
            // Retirer les joueurs de la file
            $pdo->prepare("DELETE FROM pvp_queue WHERE user_id IN (?, ?)")->execute([$userId, $opponent['user_id']]);
            
            // Enregistrer les sessions
            startBattleSession($userId, 'PVP', $pdo);
            startBattleSession($opponent['user_id'], 'PVP', $pdo);
            
            $pdo->commit();
            
            // Récupérer les infos de l'adversaire
            $stmtUser = $pdo->prepare("SELECT id, username, grade_level FROM users WHERE id = ?");
            $stmtUser->execute([$opponent['user_id']]);
            $opponentUser = $stmtUser->fetch(PDO::FETCH_ASSOC);
            
            send_json([
                'success' => true,
                'matched' => true,
                'match_id' => $matchId,
                'is_player1' => true,
                'opponent' => [
                    'id' => $opponentUser['id'],
                    'username' => $opponentUser['username'],
                    'grade_level' => $opponentUser['grade_level']
                ]
            ]);
        } else {
            // Pas d'adversaire, ajouter à la file
            $stmtQueue = $pdo->prepare("INSERT INTO pvp_queue (user_id, grade_level, team_json) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE queued_at = NOW(), team_json = ?");
            $teamJson = json_encode($team);
            $stmtQueue->execute([$userId, $gradeLevel, $teamJson, $teamJson]);
            
            send_json([
                'success' => true,
                'matched' => false,
                'waiting' => true,
                'queue_position' => 1
            ]);
        }
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        send_json(['success' => false, 'message' => $e->getMessage()]);
    }
}

/**
 * CHECK MATCH - Vérifier si un match a été trouvé pendant l'attente
 */
elseif ($action === 'check_match') {
    try {
        // Vérifier si le joueur est dans un match
        $stmt = $pdo->prepare("SELECT * FROM pvp_matches WHERE (player1_id = ? OR player2_id = ?) AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1");
        $stmt->execute([$userId, $userId]);
        $match = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($match) {
            $isPlayer1 = ($match['player1_id'] == $userId);
            $opponentId = $isPlayer1 ? $match['player2_id'] : $match['player1_id'];
            
            // Récupérer l'adversaire
            $stmtOpp = $pdo->prepare("SELECT id, username, grade_level FROM users WHERE id = ?");
            $stmtOpp->execute([$opponentId]);
            $opponent = $stmtOpp->fetch(PDO::FETCH_ASSOC);
            
            // Retirer de la file
            $pdo->prepare("DELETE FROM pvp_queue WHERE user_id = ?")->execute([$userId]);
            
            send_json([
                'success' => true,
                'matched' => true,
                'match_id' => $match['id'],
                'is_player1' => $isPlayer1,
                'opponent' => $opponent
            ]);
        } else {
            send_json(['success' => true, 'matched' => false]);
        }
    } catch (Exception $e) {
        send_json(['success' => false, 'message' => $e->getMessage()]);
    }
}

/**
 * LEAVE QUEUE - Quitter la file d'attente
 */
elseif ($action === 'leave_queue') {
    try {
        $pdo->prepare("DELETE FROM pvp_queue WHERE user_id = ?")->execute([$userId]);
        send_json(['success' => true]);
    } catch (Exception $e) {
        send_json(['success' => false, 'message' => $e->getMessage()]);
    }
}

/**
 * POLL STATE - Récupérer l'état du match (Long Polling)
 */
elseif ($action === 'poll_state') {
    try {
        $matchId = $input['match_id'];
        $lastTurn = $input['last_turn'] ?? 0;
        
        // Récupérer le match
        $stmt = $pdo->prepare("SELECT * FROM pvp_matches WHERE id = ?");
        $stmt->execute([$matchId]);
        $match = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$match) {
            send_json(['success' => false, 'message' => 'Match introuvable']);
        }
        
        // Vérifier si c'est le joueur du match
        if ($match['player1_id'] != $userId && $match['player2_id'] != $userId) {
            send_json(['success' => false, 'message' => 'Accès refusé']);
        }
        
        $isPlayer1 = ($match['player1_id'] == $userId);
        
        // Récupérer les nouvelles actions depuis le dernier tour
        $stmtActions = $pdo->prepare("SELECT * FROM pvp_actions WHERE match_id = ? AND turn_number > ? ORDER BY turn_number ASC");
        $stmtActions->execute([$matchId, $lastTurn]);
        $actions = $stmtActions->fetchAll(PDO::FETCH_ASSOC);
        
        send_json([
            'success' => true,
            'updated' => count($actions) > 0 || $match['current_turn'] > $lastTurn,
            'match' => [
                'id' => $match['id'],
                'current_turn' => $match['current_turn'],
                'status' => $match['status'],
                'winner_id' => $match['winner_id'],
                'battle_state' => json_decode($match['battle_state'], true),
                'is_my_turn' => $isPlayer1 ? ($match['current_turn'] % 2 == 1) : ($match['current_turn'] % 2 == 0)
            ],
            'actions' => $actions
        ]);
    } catch (Exception $e) {
        send_json(['success' => false, 'message' => $e->getMessage()]);
    }
}

/**
 * SEND ACTION - Envoyer une action (attaque, item, changement Pokemon)
 */
elseif ($action === 'send_action') {
    try {
        $matchId = $input['match_id'];
        $actionType = $input['action_type']; // 'ATTACK', 'ITEM', 'SWITCH', 'SURRENDER'
        $actionData = $input['action_data'];
        
        // Récupérer le match
        $stmt = $pdo->prepare("SELECT * FROM pvp_matches WHERE id = ? AND status = 'ACTIVE'");
        $stmt->execute([$matchId]);
        $match = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$match) {
            send_json(['success' => false, 'message' => 'Match introuvable ou terminé']);
        }
        
        $isPlayer1 = ($match['player1_id'] == $userId);
        $currentTurn = $match['current_turn'];
        
        // Vérifier que c'est le tour du joueur
        $isMyTurn = $isPlayer1 ? ($currentTurn % 2 == 1) : ($currentTurn % 2 == 0);
        if (!$isMyTurn) {
            send_json(['success' => false, 'message' => 'Pas votre tour']);
        }
        
        $pdo->beginTransaction();
        
        // Enregistrer l'action
        $stmtAction = $pdo->prepare("INSERT INTO pvp_actions (match_id, player_id, action_type, action_data, turn_number) VALUES (?, ?, ?, ?, ?)");
        $stmtAction->execute([
            $matchId,
            $userId,
            $actionType,
            json_encode($actionData),
            $currentTurn
        ]);
        
        // Incrémenter le tour
        $pdo->prepare("UPDATE pvp_matches SET current_turn = current_turn + 1, updated_at = NOW() WHERE id = ?")->execute([$matchId]);
        
        // Si c'est une reddition
        if ($actionType === 'SURRENDER') {
            $winnerId = $isPlayer1 ? $match['player2_id'] : $match['player1_id'];
            $pdo->prepare("UPDATE pvp_matches SET status = 'FINISHED', winner_id = ? WHERE id = ?")->execute([$winnerId, $matchId]);
            
            // Libérer les sessions
            endBattleSession($match['player1_id'], $pdo);
            endBattleSession($match['player2_id'], $pdo);
        }
        
        $pdo->commit();
        
        send_json(['success' => true, 'turn' => $currentTurn + 1]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        send_json(['success' => false, 'message' => $e->getMessage()]);
    }
}

/**
 * END MATCH - Terminer le match avec un gagnant
 */
elseif ($action === 'end_match') {
    try {
        $matchId = $input['match_id'];
        $winnerId = $input['winner_id'];
        
        $stmt = $pdo->prepare("SELECT * FROM pvp_matches WHERE id = ?");
        $stmt->execute([$matchId]);
        $match = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$match) {
            send_json(['success' => false, 'message' => 'Match introuvable']);
        }
        
        $pdo->beginTransaction();
        
        // Mettre à jour le match
        $pdo->prepare("UPDATE pvp_matches SET status = 'FINISHED', winner_id = ?, updated_at = NOW() WHERE id = ?")->execute([$winnerId, $matchId]);
        
        // Récompenses pour le gagnant
        $pdo->prepare("UPDATE users SET gold = gold + 500, global_xp = global_xp + 200 WHERE id = ?")->execute([$winnerId]);
        
        // Libérer les sessions
        endBattleSession($match['player1_id'], $pdo);
        endBattleSession($match['player2_id'], $pdo);
        
        $pdo->commit();
        
        send_json(['success' => true]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        send_json(['success' => false, 'message' => $e->getMessage()]);
    }
}

else {
    send_json(['success' => false, 'message' => 'Action inconnue']);
}
?>
