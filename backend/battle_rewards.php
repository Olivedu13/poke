<?php
require_once 'db_connect.php';

$input = json_decode(file_get_contents('php://input'), true);
$userId = $input['user_id'] ?? null;
$xp = isset($input['xp']) ? (int)$input['xp'] : 0;
$gold = isset($input['gold'] ?? 0) ? (int)$input['gold'] : 0;
$itemId = $input['item_drop'] ?? null; // ID de l'item gagné (optionnel)

if (!$userId) {
    echo json_encode(['success' => false, 'message' => 'User ID required']);
    exit;
}

try {
    $pdo->beginTransaction();

    // 1. Update User Gold & XP & Streak
    // On incrémente le streak ici pour simplifier
    $sql = "UPDATE users SET gold = gold + ?, global_xp = global_xp + ?, streak = streak + 1 WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$gold, $xp, $userId]);

    // 2. Add Item Drop if exists
    $lootMsg = "";
    if ($itemId) {
        $stmtItem = $pdo->prepare("INSERT INTO inventory (user_id, item_id, quantity) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE quantity = quantity + 1");
        $stmtItem->execute([$userId, $itemId]);
        $lootMsg = "Objet obtenu !";
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Rewards claimed',
        'gains' => ['xp' => $xp, 'gold' => $gold, 'loot' => $itemId]
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>