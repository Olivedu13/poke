<?php
require_once 'db_connect.php';

$input = json_decode(file_get_contents('php://input'), true);
$userId = $input['user_id'] ?? null;
$xp = isset($input['xp']) ? (int)$input['xp'] : 0;
$gold = isset($input['gold'] ?? 0) ? (int)$input['gold'] : 0;

if (!$userId) {
    echo json_encode(['success' => false, 'message' => 'User ID required']);
    exit;
}

try {
    $pdo->beginTransaction();

    // Update User Gold & XP
    $sql = "UPDATE users SET gold = gold + ?, global_xp = global_xp + ? WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$gold, $xp, $userId]);

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Rewards claimed',
        'gains' => ['xp' => $xp, 'gold' => $gold]
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>