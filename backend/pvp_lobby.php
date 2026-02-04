<?php
// Capturer toutes les erreurs pour debug
error_reporting(E_ALL);
ini_set('display_errors', 0); // Ne pas afficher les erreurs en HTML

// Démarrer l'output buffering pour capturer les erreurs sans bloquer les headers
ob_start();

require_once __DIR__ . '/protected_setup.php';

header('Content-Type: application/json');

// Définir les error handlers APRÈS l'inclusion (pour ne pas bloquer les headers de cors.php)
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    ob_clean(); // Nettoyer le buffer
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erreur serveur',
        'error' => $errstr,
        'file' => basename($errfile),
        'line' => $errline
    ]);
    exit;
});

set_exception_handler(function($e) {
    ob_clean(); // Nettoyer le buffer
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Exception non gérée',
        'error' => $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ]);
    exit;
});

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
    try {
        // Vérifier si la colonne challenger_team existe
        $stmt = $pdo->query("SHOW COLUMNS FROM pvp_challenges LIKE 'challenger_team'");
        $hasTeamColumn = $stmt->fetch();
        
        if ($hasTeamColumn) {
            // Nouvelle version avec équipe
            $stmt = $pdo->prepare("
                SELECT 
                    c.id,
                    c.challenger_id,
                    u.username as challenger_name,
                    c.challenged_id,
                    c.challenger_team,
                    c.status,
                    c.created_at
                FROM pvp_challenges c
                JOIN users u ON c.challenger_id = u.id
                WHERE c.challenged_id = ? AND c.status = 'pending'
                AND c.created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
                ORDER BY c.created_at DESC
            ");
        } else {
            // Ancienne version sans équipe
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
        }
        
        $stmt->execute([$user_id]);
        $challenges = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Décoder les équipes JSON si disponibles
        foreach ($challenges as &$challenge) {
            if (isset($challenge['challenger_team']) && $challenge['challenger_team']) {
                $challenge['challenger_team'] = json_decode($challenge['challenger_team'], true);
            }
        }
        
        echo json_encode([
            'success' => true,
            'challenges' => $challenges
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Erreur lors de la récupération des défis',
            'error' => $e->getMessage()
        ]);
    }
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
    
    // Récupérer l'équipe du challenger (3 Pokémon is_team=1)
    $stmt = $pdo->prepare("
        SELECT id, tyradex_id, level, current_hp, max_hp, name, sprite_url
        FROM user_pokemon 
        WHERE user_id = ? AND is_team = 1 
        ORDER BY id ASC 
        LIMIT 3
    ");
    $stmt->execute([$user_id]);
    $myTeam = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($myTeam) < 3) {
        echo json_encode(['success' => false, 'message' => 'Tu dois avoir 3 Pokémon dans ton équipe pour défier un adversaire']);
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
    
    // Créer le défi avec l'équipe du challenger
    try {
        // Vérifier d'abord si la colonne challenger_team existe
        $stmt = $pdo->query("SHOW COLUMNS FROM pvp_challenges LIKE 'challenger_team'");
        $hasTeamColumn = $stmt->fetch();
        
        if ($hasTeamColumn) {
            // Nouvelle version avec équipe
            $stmt = $pdo->prepare("
                INSERT INTO pvp_challenges (challenger_id, challenged_id, challenger_team, status, created_at)
                VALUES (?, ?, ?, 'pending', NOW())
            ");
            $stmt->execute([$user_id, $challenged_id, json_encode($myTeam)]);
        } else {
            // Ancienne version sans équipe (fallback)
            $stmt = $pdo->prepare("
                INSERT INTO pvp_challenges (challenger_id, challenged_id, status, created_at)
                VALUES (?, ?, 'pending', NOW())
            ");
            $stmt->execute([$user_id, $challenged_id]);
        }
        
        // Marquer le joueur comme défié
        updatePlayerPresence($user_id, 'available');
        
        echo json_encode([
            'success' => true,
            'message' => 'Défi envoyé !',
            'challenge_id' => $pdo->lastInsertId(),
            'team_included' => $hasTeamColumn ? true : false
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false, 
            'message' => 'Erreur lors de l\'envoi du défi',
            'error' => $e->getMessage()
        ]);
    }
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
    
    // Récupérer mon équipe (joueur qui accepte)
    $stmt = $pdo->prepare("
        SELECT id, tyradex_id, level, current_hp, max_hp, name, sprite_url
        FROM user_pokemon 
        WHERE user_id = ? AND is_team = 1 
        ORDER BY id ASC 
        LIMIT 3
    ");
    $stmt->execute([$user_id]);
    $myTeam = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($myTeam) < 3) {
        echo json_encode(['success' => false, 'message' => 'Tu dois avoir 3 Pokémon dans ton équipe pour accepter un défi']);
        exit;
    }
    
    // Récupérer le défi avec l'équipe du challenger
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
    
    $challengerTeam = json_decode($challenge['challenger_team'], true);
    
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
    
    // Créer les tableaux de HP initiaux
    $player1_hp = array_map(fn($p) => (int)$p['current_hp'], $challengerTeam);
    $player2_hp = array_map(fn($p) => (int)$p['current_hp'], $myTeam);
    
    // Créer le match PvP avec les équipes complètes
    $stmt = $pdo->prepare("
        INSERT INTO pvp_matches (
            player1_id, player2_id, 
            player1_team, player2_team,
            player1_team_hp, player2_team_hp,
            player1_active_pokemon, player2_active_pokemon,
            status, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 0, 0, 'IN_PROGRESS', NOW())
    ");
    $stmt->execute([
        $challenge['challenger_id'], 
        $user_id,
        $challenge['challenger_team'], 
        json_encode($myTeam),
        json_encode($player1_hp),
        json_encode($player2_hp)
    ]);
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
