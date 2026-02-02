
<?php
require_once 'db_connect.php';
require_once 'jwt_utils.php';

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

function send_auth_json($data) {
    echo json_encode($data);
    exit;
}

if ($action === 'register') {
    $username = trim($input['username'] ?? '');
    $password = $input['password'] ?? '';
    $grade    = $input['grade_level'] ?? 'CE1';

    if (empty($username) || empty($password)) {
        send_auth_json(['success' => false, 'message' => 'Champs manquants']);
    }

    $defaultSubjects = json_encode(['MATHS', 'FRANCAIS']);
    $hash = password_hash($password, PASSWORD_DEFAULT);

    try {
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
        $pdo->prepare("INSERT INTO inventory (user_id, item_id, quantity) VALUES (?, 'heal_r1', 1)")->execute([$userId]);
        $pdo->commit();
        
        $token = generate_jwt($userId);
        
        // On renvoie User ET Token
        $user = [
            'id' => $userId, 'username' => $username, 'grade_level' => $grade,
            'gold' => 100, 'tokens' => 5, 'active_subjects' => ['MATHS', 'FRANCAIS']
        ];
        send_auth_json(['success' => true, 'token' => $token, 'user' => $user]);

    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        send_auth_json(['success' => false, 'message' => 'Erreur: ' . $e->getMessage()]);
    }

} elseif ($action === 'login') {
    $username = trim($input['username'] ?? '');
    $password = $input['password'] ?? '';

    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        unset($user['password_hash']);
        $token = generate_jwt($user['id']);
        send_auth_json(['success' => true, 'token' => $token, 'user' => $user]);
    } else {
        send_auth_json(['success' => false, 'message' => 'Identifiants incorrects']);
    }
}
?>
