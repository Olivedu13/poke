<?php
/**
 * API PVP - Combat Procédural (Tour par Tour)
 * 
 * Logique :
 * 1. Défi envoyé avec aperçu de l'équipe
 * 2. Si accepté, tirage au sort pour le premier joueur
 * 3. Tour par tour :
 *    - Le joueur actif reçoit une question
 *    - Il répond
 *    - La question ET la réponse sont stockées et visibles par les 2 joueurs
 *    - Si bonne réponse : dégâts au Pokémon adverse
 *    - Changement de tour
 * 4. Le vainqueur gagne de l'XP, le perdant rien
 */

require_once __DIR__ . '/protected_setup.php';

header('Content-Type: application/json');

$user_id = $userId;
$action = $_GET['action'] ?? $_POST['action'] ?? null;

if (!$action && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $jsonInput = json_decode(file_get_contents('php://input'), true);
    $action = $jsonInput['action'] ?? null;
}

/**
 * Initialiser le combat : tirage au sort du premier joueur
 */
if ($action === 'init_battle') {
    $match_id = $_GET['match_id'] ?? $_POST['match_id'] ?? null;
    
    if (!$match_id) {
        echo json_encode(['success' => false, 'message' => 'ID match manquant']);
        exit;
    }
    
    // Récupérer le match
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
    
    // Si le tour est déjà défini, retourner l'état actuel
    if ($match['current_turn']) {
        echo json_encode([
            'success' => true,
            'already_initialized' => true,
            'first_player' => $match['current_turn'],
            'is_my_turn' => ($match['current_turn'] == $user_id)
        ]);
        exit;
    }
    
    // Tirage au sort (50/50)
    $first_player = (rand(0, 1) === 0) ? $match['player1_id'] : $match['player2_id'];
    
    // Choisir une question pour le premier joueur
    $stmt = $pdo->prepare("SELECT grade_level FROM users WHERE id = ?");
    $stmt->execute([$first_player]);
    $userData = $stmt->fetch(PDO::FETCH_ASSOC);
    $grade = $userData['grade_level'] ?? 'CE1';
    
    $stmt = $pdo->prepare("
        SELECT id FROM question_bank 
        WHERE grade_level = ? 
        ORDER BY RAND() 
        LIMIT 1
    ");
    $stmt->execute([$grade]);
    $question = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$question) {
        // Fallback : n'importe quelle question
        $stmt = $pdo->prepare("
            SELECT id FROM question_bank 
            ORDER BY RAND() 
            LIMIT 1
        ");
        $stmt->execute();
        $question = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    if (!$question) {
        echo json_encode(['success' => false, 'message' => 'Aucune question disponible']);
        exit;
    }
    
    // Définir le joueur qui commence ET la première question (éviter race condition)
    $stmt = $pdo->prepare("
        UPDATE pvp_matches 
        SET current_turn = ?, current_question_id = ?, waiting_for_answer = 1
        WHERE id = ? AND current_turn IS NULL
    ");
    $stmt->execute([$first_player, $question['id'], $match_id]);
    
    // Vérifier si c'est bien nous qui avons défini le tour
    if ($stmt->rowCount() === 0) {
        // L'adversaire l'a déjà fait, récupérer le tour actuel
        $stmt = $pdo->prepare("SELECT current_turn FROM pvp_matches WHERE id = ?");
        $stmt->execute([$match_id]);
        $first_player = $stmt->fetchColumn();
    }
    
    echo json_encode([
        'success' => true,
        'first_player' => $first_player,
        'is_my_turn' => ($first_player == $user_id),
        'message' => $first_player == $user_id ? 'C\'est ton tour !' : 'L\'adversaire commence !'
    ]);
    exit;
}

/**
 * Récupérer l'état complet du match
 */
if ($action === 'get_state') {
    $match_id = $_GET['match_id'] ?? null;
    
    if (!$match_id) {
        echo json_encode(['success' => false, 'message' => 'ID match manquant']);
        exit;
    }
    
    // Récupérer le match avec les noms des joueurs
    $stmt = $pdo->prepare("
        SELECT 
            m.*,
            u1.username as player1_name,
            u2.username as player2_name,
            q.id as question_id,
            q.question_text,
            q.options_json,
            q.difficulty,
            q.correct_index
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
    
    // Décoder les JSON
    $match['player1_team'] = json_decode($match['player1_team'], true);
    $match['player2_team'] = json_decode($match['player2_team'], true);
    $match['player1_team_hp'] = json_decode($match['player1_team_hp'], true);
    $match['player2_team_hp'] = json_decode($match['player2_team_hp'], true);
    
    // Déterminer si c'est mon tour
    $is_my_turn = ($match['current_turn'] == $user_id);
    $am_player1 = ($match['player1_id'] == $user_id);
    
    // Récupérer l'historique des tours (VISIBLE PAR LES 2 JOUEURS)
    $stmt = $pdo->prepare("
        SELECT 
            t.*,
            u.username as player_name
        FROM pvp_turns t
        JOIN users u ON t.player_id = u.id
        WHERE t.match_id = ?
        ORDER BY t.turn_number ASC
    ");
    $stmt->execute([$match_id]);
    $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Décoder les options JSON
    foreach ($history as &$turn) {
        if ($turn['question_options']) {
            $turn['question_options'] = json_decode($turn['question_options'], true);
        }
    }
    
    // Préparer la question actuelle (seulement si c'est mon tour)
    $current_question = null;
    if ($is_my_turn && $match['question_id'] && $match['waiting_for_answer']) {
        $options = json_decode($match['options_json'], true);
        $current_question = [
            'id' => $match['question_id'],
            'question_text' => $match['question_text'],
            'options' => $options,
            'difficulty' => $match['difficulty'],
            'correct_index' => (int)$match['correct_index'] // Envoyé pour validation côté client
        ];
    }
    
    echo json_encode([
        'success' => true,
        'match' => $match,
        'is_my_turn' => $is_my_turn,
        'am_player1' => $am_player1,
        'current_question' => $current_question,
        'history' => $history,
        'my_id' => $user_id
    ]);
    exit;
}

/**
 * Générer une nouvelle question pour le joueur actif
 */
if ($action === 'get_question') {
    $match_id = $_GET['match_id'] ?? $_POST['match_id'] ?? null;
    
    if (!$match_id) {
        echo json_encode(['success' => false, 'message' => 'ID match manquant']);
        exit;
    }
    
    // Vérifier que c'est bien mon tour
    $stmt = $pdo->prepare("
        SELECT current_turn, current_question_id, waiting_for_answer
        FROM pvp_matches 
        WHERE id = ? AND (player1_id = ? OR player2_id = ?)
    ");
    $stmt->execute([$match_id, $user_id, $user_id]);
    $match = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$match) {
        echo json_encode(['success' => false, 'message' => 'Match introuvable']);
        exit;
    }
    
    if ($match['current_turn'] != $user_id) {
        echo json_encode(['success' => false, 'message' => 'Ce n\'est pas ton tour']);
        exit;
    }
    
    // Si une question existe déjà et que le joueur attend de répondre, la retourner
    if ($match['current_question_id'] && $match['waiting_for_answer']) {
        $stmt = $pdo->prepare("
            SELECT id, question_text, options_json, difficulty, correct_index
            FROM question_bank 
            WHERE id = ?
        ");
        $stmt->execute([$match['current_question_id']]);
        $question = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($question) {
            $question['options'] = json_decode($question['options_json'], true);
            echo json_encode([
                'success' => true,
                'question' => $question
            ]);
            exit;
        }
    }
    
    // Récupérer le niveau du joueur
    $stmt = $pdo->prepare("SELECT grade_level FROM users WHERE id = ?");
    $stmt->execute([$user_id]);
    $userData = $stmt->fetch(PDO::FETCH_ASSOC);
    $grade = $userData['grade_level'] ?? 'CE1';
    
    // Choisir une question aléatoire pour ce niveau
    $stmt = $pdo->prepare("
        SELECT id, question_text, options_json, difficulty, correct_index
        FROM question_bank 
        WHERE grade_level = ? 
        ORDER BY RAND() 
        LIMIT 1
    ");
    $stmt->execute([$grade]);
    $question = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$question) {
        // Fallback : n'importe quelle question
        $stmt = $pdo->prepare("
            SELECT id, question_text, options_json, difficulty, correct_index
            FROM question_bank 
            ORDER BY RAND() 
            LIMIT 1
        ");
        $stmt->execute();
        $question = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    if (!$question) {
        echo json_encode(['success' => false, 'message' => 'Aucune question disponible']);
        exit;
    }
    
    // Assigner la question au match
    $stmt = $pdo->prepare("
        UPDATE pvp_matches 
        SET current_question_id = ?, waiting_for_answer = 1
        WHERE id = ?
    ");
    $stmt->execute([$question['id'], $match_id]);
    
    $question['options'] = json_decode($question['options_json'], true);
    
    echo json_encode([
        'success' => true,
        'question' => $question
    ]);
    exit;
}

/**
 * Soumettre une réponse
 */
if ($action === 'submit_answer') {
    $input = json_decode(file_get_contents('php://input'), true);
    $match_id = $input['match_id'] ?? null;
    $answer_index = $input['answer_index'] ?? null;
    
    if (!$match_id || $answer_index === null) {
        echo json_encode(['success' => false, 'message' => 'Données manquantes']);
        exit;
    }
    
    // Récupérer le match complet
    $stmt = $pdo->prepare("
        SELECT 
            m.*,
            q.id as question_id,
            q.question_text,
            q.options_json,
            q.correct_index,
            q.difficulty
        FROM pvp_matches m
        LEFT JOIN question_bank q ON m.current_question_id = q.id
        WHERE m.id = ? AND m.current_turn = ?
    ");
    $stmt->execute([$match_id, $user_id]);
    $match = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$match) {
        echo json_encode(['success' => false, 'message' => 'Match introuvable ou ce n\'est pas ton tour']);
        exit;
    }
    
    if (!$match['waiting_for_answer']) {
        echo json_encode(['success' => false, 'message' => 'Aucune question en attente']);
        exit;
    }
    
    // Vérifier si la réponse est correcte
    $is_correct = ((int)$answer_index === (int)$match['correct_index']);
    
    // Calculer les dégâts si correct
    $damage = 0;
    if ($is_correct) {
        // Dégâts basés sur la difficulté
        $damage_map = ['FACILE' => 20, 'MOYEN' => 30, 'DIFFICILE' => 40];
        $damage = $damage_map[strtoupper($match['difficulty'])] ?? 25;
    }
    
    // Décoder les HP actuels
    $player1_hp = json_decode($match['player1_team_hp'], true);
    $player2_hp = json_decode($match['player2_team_hp'], true);
    
    // Déterminer qui attaque qui
    $am_player1 = ($match['player1_id'] == $user_id);
    $attacker_hp = $am_player1 ? $player1_hp : $player2_hp;
    $defender_hp = $am_player1 ? $player2_hp : $player1_hp;
    $defender_active = (int)($am_player1 ? $match['player2_active_pokemon'] : $match['player1_active_pokemon']);
    
    // Appliquer les dégâts au Pokémon actif de l'adversaire
    if ($is_correct && $damage > 0) {
        $defender_hp[$defender_active] = max(0, $defender_hp[$defender_active] - $damage);
        
        // Si le Pokémon adverse est KO, passer au suivant
        if ($defender_hp[$defender_active] <= 0) {
            // Chercher le prochain Pokémon vivant
            $next_pokemon = null;
            for ($i = 0; $i < count($defender_hp); $i++) {
                if ($defender_hp[$i] > 0) {
                    $next_pokemon = $i;
                    break;
                }
            }
            
            // Si plus de Pokémon vivants, la partie est terminée
            if ($next_pokemon === null) {
                // Victoire !
                $winner_id = $user_id;
                $xp_reward = 50;
                
                // Mettre à jour le match
                $stmt = $pdo->prepare("
                    UPDATE pvp_matches 
                    SET status = 'COMPLETED',
                        winner_id = ?,
                        xp_reward = ?,
                        ended_at = NOW(),
                        player1_team_hp = ?,
                        player2_team_hp = ?,
                        waiting_for_answer = 0
                    WHERE id = ?
                ");
                $stmt->execute([
                    $winner_id,
                    $xp_reward,
                    json_encode($am_player1 ? $attacker_hp : $defender_hp),
                    json_encode($am_player1 ? $defender_hp : $attacker_hp),
                    $match_id
                ]);
                
                // Enregistrer le tour dans l'historique
                $turn_number = $pdo->query("SELECT COALESCE(MAX(turn_number), 0) + 1 FROM pvp_turns WHERE match_id = $match_id")->fetchColumn();
                $stmt = $pdo->prepare("
                    INSERT INTO pvp_turns (
                        match_id, player_id, turn_number, 
                        question_id, question_text, question_options, correct_index,
                        answer_index, is_correct, damage_dealt, target_pokemon_index
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $match_id, $user_id, $turn_number,
                    $match['question_id'], $match['question_text'], $match['options_json'], $match['correct_index'],
                    $answer_index, $is_correct ? 1 : 0, $damage, $defender_active
                ]);
                
                // Donner l'XP au vainqueur
                $stmt = $pdo->prepare("UPDATE users SET global_xp = global_xp + ? WHERE id = ?");
                $stmt->execute([$xp_reward, $winner_id]);
                
                echo json_encode([
                    'success' => true,
                    'is_correct' => $is_correct,
                    'damage' => $damage,
                    'game_over' => true,
                    'winner_id' => $winner_id,
                    'xp_reward' => $xp_reward,
                    'message' => 'Victoire ! Tu as vaincu ton adversaire !'
                ]);
                exit;
            } else {
                // Passer au Pokémon suivant
                if ($am_player1) {
                    $stmt = $pdo->prepare("UPDATE pvp_matches SET player2_active_pokemon = ? WHERE id = ?");
                    $stmt->execute([$next_pokemon, $match_id]);
                } else {
                    $stmt = $pdo->prepare("UPDATE pvp_matches SET player1_active_pokemon = ? WHERE id = ?");
                    $stmt->execute([$next_pokemon, $match_id]);
                }
            }
        }
    }
    
    // Enregistrer le tour dans l'historique
    $turn_number = $pdo->query("SELECT COALESCE(MAX(turn_number), 0) + 1 FROM pvp_turns WHERE match_id = $match_id")->fetchColumn();
    $stmt = $pdo->prepare("
        INSERT INTO pvp_turns (
            match_id, player_id, turn_number, 
            question_id, question_text, question_options, correct_index,
            answer_index, is_correct, damage_dealt, target_pokemon_index
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $match_id, $user_id, $turn_number,
        $match['question_id'], $match['question_text'], $match['options_json'], $match['correct_index'],
        $answer_index, $is_correct ? 1 : 0, $damage, $defender_active
    ]);
    
    // Changer de joueur
    $next_player = ($match['current_turn'] == $match['player1_id']) ? $match['player2_id'] : $match['player1_id'];
    
    // Générer une nouvelle question pour le joueur suivant
    $stmt = $pdo->prepare("SELECT grade_level FROM users WHERE id = ?");
    $stmt->execute([$next_player]);
    $userData = $stmt->fetch(PDO::FETCH_ASSOC);
    $grade = $userData['grade_level'] ?? 'CE1';
    
    $stmt = $pdo->prepare("
        SELECT id FROM question_bank 
        WHERE grade_level = ? 
        ORDER BY RAND() 
        LIMIT 1
    ");
    $stmt->execute([$grade]);
    $next_question = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$next_question) {
        // Fallback : n'importe quelle question
        $stmt = $pdo->prepare("
            SELECT id FROM question_bank 
            ORDER BY RAND() 
            LIMIT 1
        ");
        $stmt->execute();
        $next_question = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    // Mettre à jour le match avec le nouveau joueur ET sa question
    $stmt = $pdo->prepare("
        UPDATE pvp_matches 
        SET current_turn = ?,
            current_question_id = ?,
            waiting_for_answer = 1,
            player1_team_hp = ?,
            player2_team_hp = ?
        WHERE id = ?
    ");
    $stmt->execute([
        $next_player,
        $next_question['id'] ?? null,
        json_encode($am_player1 ? $attacker_hp : $defender_hp),
        json_encode($am_player1 ? $defender_hp : $attacker_hp),
        $match_id
    ]);
    
    echo json_encode([
        'success' => true,
        'is_correct' => $is_correct,
        'damage' => $damage,
        'next_turn' => $next_player,
        'message' => $is_correct ? 'Bonne réponse ! Dégâts infligés !' : 'Mauvaise réponse... Aucun dégât.'
    ]);
    exit;
}

/**
 * Abandonner le match
 */
if ($action === 'forfeit') {
    $match_id = $_GET['match_id'] ?? $_POST['match_id'] ?? null;
    
    if (!$match_id) {
        echo json_encode(['success' => false, 'message' => 'ID match manquant']);
        exit;
    }
    
    // Récupérer le match
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
    
    // L'adversaire gagne
    $winner_id = ($match['player1_id'] == $user_id) ? $match['player2_id'] : $match['player1_id'];
    $xp_reward = 25; // XP réduite pour victoire par abandon
    
    // Mettre à jour le match
    $stmt = $pdo->prepare("
        UPDATE pvp_matches 
        SET status = 'ABANDONED',
            winner_id = ?,
            xp_reward = ?,
            ended_at = NOW()
        WHERE id = ?
    ");
    $stmt->execute([$winner_id, $xp_reward, $match_id]);
    
    // Donner l'XP au vainqueur
    $stmt = $pdo->prepare("UPDATE users SET global_xp = global_xp + ? WHERE id = ?");
    $stmt->execute([$xp_reward, $winner_id]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Tu as abandonné le combat.',
        'winner_id' => $winner_id
    ]);
    exit;
}

echo json_encode(['success' => false, 'message' => 'Action invalide']);
