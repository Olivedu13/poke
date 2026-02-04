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

// Fonction utilitaire pour assigner une nouvelle question
function assign_new_question($pdo, $match_id, $player_id) {
    // Récupérer le niveau du joueur
    $stmt = $pdo->prepare("SELECT grade_level FROM users WHERE id = ?");
    $stmt->execute([$player_id]);
    $uData = $stmt->fetch();
    $grade = $uData['grade_level'] ?? 'CE1';
    
    // Choisir une question aléatoire pour ce niveau
    // On essaie d'abord une question non vue si possible (en théorie faudrait checker pvp_turns mais bon faisons simple)
    $stmt = $pdo->prepare("SELECT id FROM question_bank WHERE grade_level = ? ORDER BY RAND() LIMIT 1");
    $stmt->execute([$grade]);
    $qId = $stmt->fetchColumn();
    
    if (!$qId) {
        // Fallback: n'importe quelle question
        $stmt = $pdo->prepare("SELECT id FROM question_bank ORDER BY RAND() LIMIT 1");
        $stmt->execute();
        $qId = $stmt->fetchColumn();
    }
    
    if ($qId) {
        $stmt = $pdo->prepare("UPDATE pvp_matches SET current_question_id = ? WHERE id = ?");
        $stmt->execute([$qId, $match_id]);
    }
}

// Récupérer l'état du match
if ($action === 'get_match_state') {
    $match_id = $_GET['match_id'] ?? null;
    
    if (!$match_id) {
        echo json_encode(['success' => false, 'message' => 'ID match manquant']);
        exit;
    }
    
    // Récupérer les infos du match ET la question en cours
    $stmt = $pdo->prepare("
        SELECT 
            m.*,
            u1.username as player1_name,
            u2.username as player2_name,
            u1.global_xp as player1_xp,
            u2.global_xp as player2_xp,
            q.question_text as current_q_text,
            q.options_json as current_q_options,
            q.difficulty as current_q_difficulty,
            q.id as current_q_id,
            q.correct_index as current_q_correct
        FROM pvp_matches m
        JOIN users u1 ON m.player1_id = u1.id
        JOIN users u2 ON m.player2_id = u2.id
        LEFT JOIN question_bank q ON m.current_question_id = q.id
        WHERE m.id = ? AND (m.player1_id = ? OR m.player2_id = ?)
    ");
    $stmt->execute([$match_id, $user_id, $user_id]);
    $match = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$match) {
        echo json_encode(['success' => false, 'message' => 'Match introuvable']);
        exit;
    }

    // Si aucune question n'est assignée, en générer une pour le joueur dont c'est le tour
    if (!$match['current_q_id'] && $match['current_turn']) {
        assign_new_question($pdo, $match_id, $match['current_turn']);

        // Recharger le match avec la question
        $stmt = $pdo->prepare("
            SELECT 
                m.*,
                u1.username as player1_name,
                u2.username as player2_name,
                u1.global_xp as player1_xp,
                u2.global_xp as player2_xp,
                q.question_text as current_q_text,
                q.options_json as current_q_options,
                q.difficulty as current_q_difficulty,
                q.id as current_q_id,
                q.correct_index as current_q_correct
            FROM pvp_matches m
            JOIN users u1 ON m.player1_id = u1.id
            JOIN users u2 ON m.player2_id = u2.id
            LEFT JOIN question_bank q ON m.current_question_id = q.id
            WHERE m.id = ? AND (m.player1_id = ? OR m.player2_id = ?)
        ");
        $stmt->execute([$match_id, $user_id, $user_id]);
        $match = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Sécuriser les données de la question (ne pas envoyer la réponse si ce n'est pas mon tour)
    $current_question = null;
    if ($match['current_q_id']) {
        $is_my_turn = ($match['current_turn'] == $user_id);
        
        $opts = $match['current_q_options'];
        if (is_string($opts)) $opts = json_decode($opts);
        
        $current_question = [
            'id' => $match['current_q_id'],
            'question_text' => $match['current_q_text'],
            'options' => $opts,
            'difficulty' => $match['current_q_difficulty']
        ];
        
        // Si c'est mon tour, j'ai besoin de la réponse pour valider (ou le client valide via submit)
        // Pour sécurité, on envoie correct_index QUE si c'est mon tour, 
        // MAIS QuizOverlay a besoin de correct_index pour valider en local (architecture actuelle).
        // Donc on l'envoie.
        if ($is_my_turn) {
            $current_question['correct_index'] = $match['current_q_correct'];
        } else {
            // Si c'est pas mon tour, j'en ai besoin pour voir ce que l'autre fait ? Non, juste pour afficher.
            // On cache la réponse pour éviter triche via outils dev
            $current_question['correct_index'] = -1; 
        }
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
        'my_id' => $user_id,
        'current_question' => $current_question
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
            $is_my_turn = ($match['current_turn'] == $user_id);
            $current_question = null;

            // Si la question n'est pas encore assignée, la générer
            if (empty($match['current_question_id'])) {
                assign_new_question($pdo, $match_id, $match['current_turn']);
            }

            // Charger la question courante
            $stmtQ = $pdo->prepare("SELECT q.id, q.question_text, q.options_json, q.difficulty, q.correct_index
                                    FROM pvp_matches m
                                    LEFT JOIN question_bank q ON m.current_question_id = q.id
                                    WHERE m.id = ?");
            $stmtQ->execute([$match_id]);
            $q = $stmtQ->fetch(PDO::FETCH_ASSOC);
            if ($q && $q['id']) {
                $opts = $q['options_json'];
                if (is_string($opts)) $opts = json_decode($opts);
                $current_question = [
                    'id' => $q['id'],
                    'question_text' => $q['question_text'],
                    'options' => $opts,
                    'difficulty' => $q['difficulty'],
                    'correct_index' => $is_my_turn ? (int)$q['correct_index'] : -1
                ];
            }

            echo json_encode([
                'success' => true,
                'message' => 'Combat déjà initialisé',
                'first_player' => $match['current_turn'],
                'is_my_turn' => $is_my_turn,
                'current_question' => $current_question
            ]);
            exit;
        }
        
        echo json_encode(['success' => false, 'message' => 'Match introuvable']);
        exit;
    }
    
    // Tirage au sort : 50/50 entre player1 et player2
    $first_player = (rand(0, 1) === 0) ? $match['player1_id'] : $match['player2_id'];
    
    // Mettre à jour le match de manière sécurisée (éviter race condition)
    $stmt = $pdo->prepare("
        UPDATE pvp_matches SET current_turn = ? WHERE id = ? AND current_turn IS NULL
    ");
    $stmt->execute([$first_player, $match_id]);
    
    if ($stmt->rowCount() === 0) {
        // Si aucune ligne n'a été mise à jour, c'est que le tour a déjà été défini par l'adversaire
        $stmt = $pdo->prepare("SELECT current_turn FROM pvp_matches WHERE id = ?");
        $stmt->execute([$match_id]);
        $current = $stmt->fetchColumn();
        
        if ($current) {
            $first_player = $current;
        }
    } else {
        // C'est nous qui avons initialisé, on assigne la première question !
        assign_new_question($pdo, $match_id, $first_player);
    }
    
    $is_my_turn = ($first_player == $user_id);
    $current_question = null;

    // Charger la question courante après init
    $stmtQ = $pdo->prepare("SELECT q.id, q.question_text, q.options_json, q.difficulty, q.correct_index
                            FROM pvp_matches m
                            LEFT JOIN question_bank q ON m.current_question_id = q.id
                            WHERE m.id = ?");
    $stmtQ->execute([$match_id]);
    $q = $stmtQ->fetch(PDO::FETCH_ASSOC);
    if ($q && $q['id']) {
        $opts = $q['options_json'];
        if (is_string($opts)) $opts = json_decode($opts);
        $current_question = [
            'id' => $q['id'],
            'question_text' => $q['question_text'],
            'options' => $opts,
            'difficulty' => $q['difficulty'],
            'correct_index' => $is_my_turn ? (int)$q['correct_index'] : -1
        ];
    }

    echo json_encode([
        'success' => true,
        'message' => 'Combat initialisé',
        'first_player' => $first_player,
        'is_my_turn' => $is_my_turn,
        'current_question' => $current_question
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
    
    // Si question_id manquant, utiliser celui du match
    if (!$question_id && !empty($match['current_question_id'])) {
        $question_id = $match['current_question_id'];
    }

    if (!$question_id) {
        echo json_encode(['success' => false, 'message' => 'Question manquante']);
        exit;
    }

    // Valider la réponse côté serveur
    $stmt = $pdo->prepare("SELECT correct_index FROM question_bank WHERE id = ?");
    $stmt->execute([$question_id]);
    $correct_index = $stmt->fetchColumn();
    if ($correct_index === false) {
        echo json_encode(['success' => false, 'message' => 'Question introuvable']);
        exit;
    }
    $is_correct = ((int)$answer_index === (int)$correct_index);

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
    
    // Assigner la question pour le PROCHAIN joueur
    assign_new_question($pdo, $match_id, $next_player);
    
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
