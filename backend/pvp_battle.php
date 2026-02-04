<?php
/**
 * API pour gérer le système de combat PVP en tour par tour
 */
require_once __DIR__ . '/protected_setup.php';

header('Content-Type: application/json');

$user_id = $userId;

// Lire l'action
$action = $_GET['action'] ?? null;
if (!$action && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $jsonInput = json_decode(file_get_contents('php://input'), true);
    $action = $jsonInput['action'] ?? null;
}

// Récupérer l'état du match
if ($action === 'get_match_state') {
    $match_id = $_GET['match_id'] ?? null;
    
    if (!$match_id) {
        echo json_encode(['success' => false, 'message' => 'ID match manquant']);
        exit;
    }
    
    // Récupérer les infos du match
    $stmt = $pdo->prepare("
        SELECT 
            m.*,
            u1.username as player1_name,
            u2.username as player2_name,
            u1.global_xp as player1_xp,
            u2.global_xp as player2_xp
        FROM pvp_matches m
        JOIN users u1 ON m.player1_id = u1.id
        JOIN users u2 ON m.player2_id = u2.id
        WHERE m.id = ? AND (m.player1_id = ? OR m.player2_id = ?)
    ");
    $stmt->execute([$match_id, $user_id, $user_id]);
    $match = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$match) {
        echo json_encode(['success' => false, 'message' => 'Match introuvable']);
        exit;
    }
    
    // Récupérer les tours précédents
    $stmt = $pdo->prepare("
        SELECT 
            t.*,
            u.username as player_name,
            qb.question_text,
            qb.options_json,
            qb.correct_index
        FROM pvp_turns t
        JOIN users u ON t.player_id = u.id
        LEFT JOIN question_bank qb ON t.question_id = qb.id
        WHERE t.match_id = ?
        ORDER BY t.turn_number ASC
    ");
    $stmt->execute([$match_id]);
    $turns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Déterminer si c'est mon tour
    $is_my_turn = ($match['current_turn'] == $user_id);
    
    echo json_encode([
        'success' => true,
        'match' => $match,
        'turns' => $turns,
        'is_my_turn' => $is_my_turn,
        'my_id' => $user_id
    ]);
    exit;
}

// Initialiser le combat (tirage au sort du premier joueur)
if ($action === 'init_battle') {
    $match_id = $_GET['match_id'] ?? $_POST['match_id'] ?? null;
    
    if (!$match_id) {
        echo json_encode(['success' => false, 'message' => 'ID match manquant']);
        exit;
    }
    
    // Vérifier que le match existe et n'a pas de current_turn
    $stmt = $pdo->prepare("
        SELECT * FROM pvp_matches 
        WHERE id = ? AND (player1_id = ? OR player2_id = ?) AND current_turn IS NULL
    ");
    $stmt->execute([$match_id, $user_id, $user_id]);
    $match = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$match) {
        // Peut-être déjà initialisé, récupérer les infos
        $stmt = $pdo->prepare("SELECT * FROM pvp_matches WHERE id = ?");
        $stmt->execute([$match_id]);
        $match = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($match && $match['current_turn']) {
            echo json_encode([
                'success' => true,
                'message' => 'Combat déjà initialisé',
                'first_player' => $match['current_turn'],
                'is_my_turn' => ($match['current_turn'] == $user_id)
            ]);
            exit;
        }
        
        echo json_encode(['success' => false, 'message' => 'Match introuvable']);
        exit;
    }
    
    // Tirage au sort : 50/50 entre player1 et player2
    $first_player = (rand(0, 1) === 0) ? $match['player1_id'] : $match['player2_id'];
    
    // Mettre à jour le match
    $stmt = $pdo->prepare("
        UPDATE pvp_matches SET current_turn = ? WHERE id = ?
    ");
    $stmt->execute([$first_player, $match_id]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Combat initialisé',
        'first_player' => $first_player,
        'is_my_turn' => ($first_player == $user_id)
    ]);
    exit;
}

// Soumettre une réponse
if ($action === 'submit_answer') {
    $input = json_decode(file_get_contents('php://input'), true);
    $match_id = $input['match_id'] ?? null;
    $question_id = $input['question_id'] ?? null;
    $answer_index = $input['answer_index'] ?? null;
    $is_correct = $input['is_correct'] ?? false;
    $damage_dealt = $input['damage_dealt'] ?? 0;
    
    if (!$match_id || $answer_index === null) {
        echo json_encode(['success' => false, 'message' => 'Données manquantes']);
        exit;
    }
    
    // Vérifier que c'est bien mon tour
    $stmt = $pdo->prepare("
        SELECT * FROM pvp_matches 
        WHERE id = ? AND current_turn = ? AND status = 'IN_PROGRESS'
    ");
    $stmt->execute([$match_id, $user_id]);
    $match = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$match) {
        echo json_encode(['success' => false, 'message' => 'Ce n\'est pas votre tour ou match invalide']);
        exit;
    }
    
    // Récupérer le numéro de tour actuel
    $stmt = $pdo->prepare("
        SELECT MAX(turn_number) as last_turn FROM pvp_turns WHERE match_id = ?
    ");
    $stmt->execute([$match_id]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $turn_number = ($result['last_turn'] ?? 0) + 1;
    
    // Enregistrer le tour
    $stmt = $pdo->prepare("
        INSERT INTO pvp_turns (match_id, player_id, turn_number, question_id, answer_index, is_correct, damage_dealt, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([$match_id, $user_id, $turn_number, $question_id, $answer_index, $is_correct, $damage_dealt]);
    
    // Passer au joueur suivant
    $next_player = ($match['current_turn'] == $match['player1_id']) ? $match['player2_id'] : $match['player1_id'];
    $stmt = $pdo->prepare("
        UPDATE pvp_matches SET current_turn = ? WHERE id = ?
    ");
    $stmt->execute([$next_player, $match_id]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Réponse enregistrée',
        'turn_number' => $turn_number,
        'next_player' => $next_player
    ]);
    exit;
}

// Terminer le match
if ($action === 'end_match') {
    $input = json_decode(file_get_contents('php://input'), true);
    $match_id = $input['match_id'] ?? null;
    $winner_id = $input['winner_id'] ?? null;
    
    if (!$match_id) {
        echo json_encode(['success' => false, 'message' => 'ID match manquant']);
        exit;
    }
    
    // Vérifier que je suis un participant
    $stmt = $pdo->prepare("
        SELECT * FROM pvp_matches 
        WHERE id = ? AND (player1_id = ? OR player2_id = ?)
    ");
    $stmt->execute([$match_id, $user_id, $user_id]);
    $match = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$match) {
        echo json_encode(['success' => false, 'message' => 'Match introuvable']);
        exit;
    }
    
    // Terminer le match
    $stmt = $pdo->prepare("
        UPDATE pvp_matches 
        SET status = 'COMPLETED', winner_id = ?, ended_at = NOW()
        WHERE id = ?
    ");
    $stmt->execute([$winner_id, $match_id]);
    
    // Remettre les joueurs disponibles
    updatePlayerPresence($match['player1_id'], 'available');
    updatePlayerPresence($match['player2_id'], 'available');
    
    echo json_encode([
        'success' => true,
        'message' => 'Match terminé',
        'winner_id' => $winner_id
    ]);
    exit;
}

function updatePlayerPresence($userId, $status = 'available') {
    global $pdo;
    $stmt = $pdo->prepare("
        INSERT INTO online_players (user_id, status, last_seen)
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE status = ?, last_seen = NOW()
    ");
    $stmt->execute([$userId, $status, $status]);
}

echo json_encode(['success' => false, 'message' => 'Action invalide']);
