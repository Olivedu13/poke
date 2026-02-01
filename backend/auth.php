<?php
ob_start();
require_once 'db_connect.php';

// Force JSON header if db_connect failed to send it
if (!headers_sent()) {
    header('Content-Type: application/json');
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

// Output Clean Buffer Function
function send_auth_json($data) {
    ob_clean();
    echo json_encode($data);
    exit;
}

if ($action === 'register') {
    $username = trim($input['username'] ?? '');
    $password = $input['password'] ?? '';
    $grade    = $input['grade_level'] ?? 'CE1';

    if (empty($username) || empty($password)) {
        send_auth_json(['success' => false, 'message' => 'Username and password required']);
    }

    $defaultSubjects = json_encode(['MATHS', 'FRANCAIS']);
    $hash = password_hash($password, PASSWORD_DEFAULT);

    try {
        $pdo->beginTransaction();

        // 1. Create User
        $stmt = $pdo->prepare("INSERT INTO users (username, password_hash, grade_level, active_subjects, gold, tokens) VALUES (?, ?, ?, ?, 100, 5)");
        $stmt->execute([$username, $hash, $grade, $defaultSubjects]);
        $userId = $pdo->lastInsertId();

        // 2. Insert Starters (Level 1)
        // Bulbizarre (1), Salamèche (4), Carapuce (7)
        $starters = [
            ['id' => 1, 'name' => 'Bulbizarre', 'hp' => 45],
            ['id' => 4, 'name' => 'Salamèche', 'hp' => 39],
            ['id' => 7, 'name' => 'Carapuce', 'hp' => 44]
        ];

        $sqlPoke = "INSERT INTO user_pokemon (id, user_id, tyradex_id, nickname, level, current_hp, current_xp, is_team) VALUES (?, ?, ?, ?, 1, ?, 0, 1)";
        $stmtPoke = $pdo->prepare($sqlPoke);

        foreach ($starters as $s) {
            $uuid = uniqid('starter_', true);
            $stmtPoke->execute([$uuid, $userId, $s['id'], $s['name'], $s['hp']]);
        }

        // 3. BONUS: Give 1 Free Potion (Heal R1)
        $pdo->prepare("INSERT INTO inventory (user_id, item_id, quantity) VALUES (?, 'heal_r1', 1)")->execute([$userId]);

        $pdo->commit();
        
        send_auth_json([
            'success' => true, 
            'user' => [
                'id' => $userId,
                'username' => $username,
                'grade_level' => $grade,
                'gold' => 100,
                'tokens' => 5
            ]
        ]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        if ($e->getCode() == 23000) {
            send_auth_json(['success' => false, 'message' => 'Username already exists']);
        } else {
            send_auth_json(['success' => false, 'message' => 'DB Error: ' . $e->getMessage()]);
        }
    }

} elseif ($action === 'login') {
    $username = trim($input['username'] ?? '');
    $password = $input['password'] ?? '';

    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        unset($user['password_hash']);
        send_auth_json(['success' => true, 'user' => $user]);
    } else {
        send_auth_json(['success' => false, 'message' => 'Invalid credentials']);
    }

} else {
    send_auth_json(['success' => false, 'message' => 'Invalid action']);
}
