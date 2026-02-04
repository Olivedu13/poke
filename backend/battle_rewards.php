<?php
require_once 'protected_setup.php'; // Auth V3 (Définit $userId et $input)
require_once 'battle_session.php';

// Si c'est une demande de fin de session
if (isset($input['action']) && $input['action'] === 'end_session') {
    endBattleSession($userId, $pdo);
    echo json_encode(['success' => true, 'message' => 'Session terminée']);
    exit;
}

$xp = isset($input['xp']) ? max(0, (int)$input['xp']) : 0;
$gold = isset($input['gold']) ? (int)$input['gold'] : 0;
$itemId = $input['item_drop'] ?? null;

try {
    $pdo->beginTransaction();

    // Update User
    $sql = "UPDATE users SET gold = gold + ?, global_xp = global_xp + ?, streak = streak + 1 WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$gold, $xp, $userId]);

    // Item Drop
    if ($itemId) {
        $stmtItem = $pdo->prepare("INSERT INTO inventory (user_id, item_id, quantity) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE quantity = quantity + 1");
        $stmtItem->execute([$userId, $itemId]);
    }

    $pdo->commit();

    // Libérer le slot de combat
    endBattleSession($userId, $pdo);

    echo json_encode(['success' => true, 'message' => 'Rewards claimed']);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>