<?php
require_once __DIR__ . '/protected_setup.php';

header('Content-Type: application/json');

// Alias pour compatibilité (protected_setup.php définit $userId)
$user_id = $userId;

// Lire l'action depuis GET ou depuis le body JSON
$action = $_GET['action'] ?? null;

if (!$action && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $jsonInput = json_decode(file_get_contents('php://input'), true);
    $action = $jsonInput['action'] ?? null;
}

// Mettre à jour la présence en ligne du joueur
function updatePlayerPresence($userId, $status = 'available') {
    global $pdo;
    $stmt = $pdo->prepare("
        INSERT INTO online_players (user_id, status, last_seen)
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE status = ?, last_seen = NOW()
    ");
    $stmt->execute([$userId, $status, $status]);
}

// Nettoyer les joueurs inactifs (> 30 secondes)
function cleanInactivePlayers() {
    global $pdo;
    $pdo->exec("DELETE FROM online_players WHERE last_seen < DATE_SUB(NOW(), INTERVAL 30 SECOND)");
}

// Récupérer la liste des joueurs en ligne
if ($action === 'get_online_players') {
    // Mettre à jour la présence du joueur actuel
    updatePlayerPresence($user_id);
    
    // Nettoyer les joueurs inactifs
    cleanInactivePlayers();
    
    // Récupérer les joueurs en ligne
    $stmt = $pdo->prepare("
        SELECT 
            u.id, 
            u.username, 
            u.global_xp as level,
            u.grade_level as grade,
            op.status,
            (SELECT tyradex_id FROM user_pokemon WHERE user_id = u.id AND is_team = 1 ORDER BY id LIMIT 1) as avatar_pokemon_id
        FROM online_players op
        JOIN users u ON op.user_id = u.id
        WHERE op.last_seen >= DATE_SUB(NOW(), INTERVAL 30 SECOND)
        ORDER BY op.last_seen DESC
    ");
    $stmt->execute();
    $players = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'players' => $players
    ]);
    exit;
}

// Récupérer les défis reçus
if ($action === 'get_challenges') {
    $stmt = $pdo->prepare("
        SELECT 
            c.id,
            c.challenger_id,
            u.username as challenger_name,
            c.challenged_id,
            c.status,
            c.created_at
        FROM pvp_challenges c
        JOIN users u ON c.challenger_id = u.id
        WHERE c.challenged_id = ? AND c.status = 'pending'
        AND c.created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
        ORDER BY c.created_at DESC
    ");
    $stmt->execute([$user_id]);
    $challenges = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'challenges' => $challenges
    ]);
    exit;
}

// Vérifier si mes défis envoyés ont été acceptés
if ($action === 'check_sent_challenges') {
    // Chercher si j'ai un défi accepté et un match créé
    $stmt = $pdo->prepare("
        SELECT 
            c.id as challenge_id,
            m.id as match_id,
            m.player1_id,
            m.player2_id,
            m.status
        FROM pvp_challenges c
        JOIN pvp_matches m ON (
            (c.challenger_id = m.player1_id AND c.challenged_id = m.player2_id)
            OR (c.challenger_id = m.player2_id AND c.challenged_id = m.player1_id)
        )
        WHERE c.challenger_id = ? 
        AND c.status = 'accepted'
        AND m.status = 'IN_PROGRESS'
        AND c.created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
        LIMIT 1
    ");
    $stmt->execute([$user_id]);
    $match = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($match) {
        // Marquer le défi comme vu
        $stmt = $pdo->prepare("UPDATE pvp_challenges SET status = 'seen' WHERE id = ?");
        $stmt->execute([$match['challenge_id']]);
        
        echo json_encode([
            'success' => true,
            'accepted_match' => [
                'match_id' => $match['match_id'],
                'player1_id' => $match['player1_id'],
                'player2_id' => $match['player2_id']
            ]
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'accepted_match' => null
        ]);
    }
    exit;
}

// Envoyer un défi
if ($action === 'send_challenge') {
    $input = json_decode(file_get_contents('php://input'), true);
    $challenged_id = $input['challenged_id'] ?? null;
    
    if (!$challenged_id) {
        echo json_encode(['success' => false, 'message' => 'ID joueur manquant']);
        exit;
    }
    
    // Vérifier que le joueur cible existe et est en ligne
    $stmt = $pdo->prepare("
        SELECT u.id, op.status 
        FROM users u
        LEFT JOIN online_players op ON u.id = op.user_id
        WHERE u.id = ?
    ");
    $stmt->execute([$challenged_id]);
    $target = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$target) {
        echo json_encode(['success' => false, 'message' => 'Joueur introuvable']);
        exit;
    }
    
    if ($target['status'] !== 'available') {
        echo json_encode(['success' => false, 'message' => 'Ce joueur n\'est pas disponible']);
        exit;
    }
    
    // Vérifier qu'il n'y a pas déjà un défi en cours
    $stmt = $pdo->prepare("
        SELECT id FROM pvp_challenges 
        WHERE challenger_id = ? AND challenged_id = ? 
        AND status = 'pending'
        AND created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
    ");
    $stmt->execute([$user_id, $challenged_id]);
    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Tu as déjà envoyé un défi à ce joueur']);
        exit;
    }
    
    // Créer le défi
    $stmt = $pdo->prepare("
        INSERT INTO pvp_challenges (challenger_id, challenged_id, status, created_at)
        VALUES (?, ?, 'pending', NOW())
    ");
    $stmt->execute([$user_id, $challenged_id]);
    
    // Marquer le joueur comme défié
    updatePlayerPresence($user_id, 'available');
    
    echo json_encode([
        'success' => true,
        'message' => 'Défi envoyé !',
        'challenge_id' => $pdo->lastInsertId()
    ]);
    exit;
}

// Accepter un défi
if ($action === 'accept_challenge') {
    $input = json_decode(file_get_contents('php://input'), true);
    $challenge_id = $input['challenge_id'] ?? null;
    
    if (!$challenge_id) {
        echo json_encode(['success' => false, 'message' => 'ID défi manquant']);
        exit;
    }
    
    // Récupérer le défi
    $stmt = $pdo->prepare("
        SELECT * FROM pvp_challenges 
        WHERE id = ? AND challenged_id = ? AND status = 'pending'
    ");
    $stmt->execute([$challenge_id, $user_id]);
    $challenge = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$challenge) {
        echo json_encode(['success' => false, 'message' => 'Défi introuvable ou expiré']);
        exit;
    }
    
    // Accepter le défi
    $stmt = $pdo->prepare("UPDATE pvp_challenges SET status = 'accepted' WHERE id = ?");
    $stmt->execute([$challenge_id]);
    
    // Supprimer/décliner tous les autres défis entre ces 2 joueurs
    $stmt = $pdo->prepare("
        UPDATE pvp_challenges 
        SET status = 'expired'
        WHERE id != ?
        AND (
            (challenger_id = ? AND challenged_id = ?)
            OR (challenger_id = ? AND challenged_id = ?)
        )
        AND status = 'pending'
    ");
    $stmt->execute([
        $challenge_id,
        $challenge['challenger_id'], $user_id,
        $user_id, $challenge['challenger_id']
    ]);
    
    // Créer le match PvP (sans current_turn pour l'instant)
    $stmt = $pdo->prepare("
        INSERT INTO pvp_matches (player1_id, player2_id, status, created_at)
        VALUES (?, ?, 'IN_PROGRESS', NOW())
    ");
    $stmt->execute([$challenge['challenger_id'], $user_id]);
    $match_id = $pdo->lastInsertId();
    
    // Marquer les deux joueurs comme en combat
    updatePlayerPresence($challenge['challenger_id'], 'in_battle');
    updatePlayerPresence($user_id, 'in_battle');
    
    echo json_encode([
        'success' => true,
        'message' => 'Défi accepté ! Le combat commence.',
        'match_id' => $match_id,
        'player1_id' => $challenge['challenger_id'],
        'player2_id' => $user_id
    ]);
    exit;
}

// Refuser un défi
if ($action === 'decline_challenge') {
    $input = json_decode(file_get_contents('php://input'), true);
    $challenge_id = $input['challenge_id'] ?? null;
    
    if (!$challenge_id) {
        echo json_encode(['success' => false, 'message' => 'ID défi manquant']);
        exit;
    }
    
    // Marquer le défi comme refusé
    $stmt = $pdo->prepare("
        UPDATE pvp_challenges 
        SET status = 'declined' 
        WHERE id = ? AND challenged_id = ?
    ");
    $stmt->execute([$challenge_id, $user_id]);
    
    echo json_encode(['success' => true, 'message' => 'Défi refusé']);
    exit;
}

// Récupérer l'équipe d'un adversaire PVP
if ($action === 'get_opponent_team') {
    $opponent_id = $_GET['opponent_id'] ?? null;
    
    if (!$opponent_id) {
        echo json_encode(['success' => false, 'message' => 'ID adversaire manquant']);
        exit;
    }
    
    // Récupérer l'équipe de l'adversaire
    $stmt = $pdo->prepare("SELECT * FROM user_pokemon WHERE user_id = ? ORDER BY is_team DESC, level DESC");
    $stmt->execute([$opponent_id]);
    $collection = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Récupérer le nom de l'adversaire
    $stmt = $pdo->prepare("SELECT username FROM users WHERE id = ?");
    $stmt->execute([$opponent_id]);
    $opponent = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'collection' => $collection,
        'opponent_name' => $opponent['username'] ?? 'Adversaire'
    ]);
    exit;
}

echo json_encode(['success' => false, 'message' => 'Action invalide']);
