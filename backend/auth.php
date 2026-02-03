<?php
require_once 'db_connect.php';
require_once 'jwt_utils.php';

// Lecture input déjà faite dans protected_setup.php si inclus, mais auth.php est public.
// On le refait ici proprement pour les endpoints publics.
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

// Fallback si json_decode échoue
if (!is_array($input)) {
    $input = [];
}

$action = $input['action'] ?? '';

function send_auth_json($data) {
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

if ($action === 'register') {
    $username = trim($input['username'] ?? '');
    $password = $input['password'] ?? '';
    $grade    = $input['grade_level'] ?? 'CE1';

    // Validation
    if (empty($username) || strlen($username) < 3) {
        send_auth_json(['success' => false, 'message' => 'Le pseudo doit faire au moins 3 caractères']);
    }
    if (empty($password) || strlen($password) < 4) {
        send_auth_json(['success' => false, 'message' => 'Le mot de passe est trop court']);
    }

    $defaultSubjects = json_encode(['MATHS', 'FRANCAIS']);
    $hash = password_hash($password, PASSWORD_DEFAULT);

    try {
        // Vérification doublon avant transaction (pour éviter incrément ID inutile)
        $stmtCheck = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $stmtCheck->execute([$username]);
        if ($stmtCheck->fetch()) {
            send_auth_json(['success' => false, 'message' => 'Ce pseudo est déjà pris']);
        }

        $pdo->beginTransaction();
        $stmt = $pdo->prepare("INSERT INTO users (username, password_hash, grade_level, active_subjects, gold, tokens) VALUES (?, ?, ?, ?, 100, 5)");
        $stmt->execute([$username, $hash, $grade, $defaultSubjects]);
        $userId = $pdo->lastInsertId();

        // Starters
        $starters = [
            ['id' => 1, 'name' => 'Bulbizarre', 'hp' => 45],
            ['id' => 4, 'name' => 'Salamèche', 'hp' => 39],
            ['id' => 7, 'name' => 'Carapuce', 'hp' => 44]
        ];
        $stmtPoke = $pdo->prepare("INSERT INTO user_pokemon (id, user_id, tyradex_id, nickname, level, current_hp, is_team) VALUES (?, ?, ?, ?, 1, ?, 1)");
        foreach ($starters as $s) {
            $stmtPoke->execute([uniqid('starter_', true), $userId, $s['id'], $s['name'], $s['hp']]);
        }
        // Cadeau de bienvenue
        $pdo->prepare("INSERT INTO inventory (user_id, item_id, quantity) VALUES (?, 'heal_r1', 1)")->execute([$userId]);
        
        $pdo->commit();
        
        $token = generate_jwt($userId);
        
        $user = [
            'id' => $userId, 'username' => $username, 'grade_level' => $grade,
            'gold' => 100, 'tokens' => 5, 'active_subjects' => ['MATHS', 'FRANCAIS']
        ];
        send_auth_json(['success' => true, 'token' => $token, 'user' => $user]);

    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log("Register Error: " . $e->getMessage());
        send_auth_json(['success' => false, 'message' => 'Erreur serveur lors de l\'inscription']);
    }

} elseif ($action === 'login') {
    $username = trim($input['username'] ?? '');
    $password = $input['password'] ?? '';

    if (empty($username) || empty($password)) {
        send_auth_json(['success' => false, 'message' => 'Identifiants manquants']);
    }

    try {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password_hash'])) {
            unset($user['password_hash']);
            
            // Reformatage des champs JSON pour le front
            if (is_string($user['active_subjects'])) {
                $decoded = json_decode($user['active_subjects'], true);
                $user['active_subjects'] = is_array($decoded) ? $decoded : ['MATHS'];
            }
            
            $token = generate_jwt($user['id']);
            send_auth_json(['success' => true, 'token' => $token, 'user' => $user]);
        } else {
            send_auth_json(['success' => false, 'message' => 'Identifiants incorrects']);
        }
    } catch (Exception $e) {
        send_auth_json(['success' => false, 'message' => 'Erreur de connexion']);
    }
} else {
    send_auth_json(['success' => false, 'message' => 'Action inconnue']);
}
?>