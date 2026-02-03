<?php
require_once 'protected_setup.php'; // Auth V3 (Définit $userId et $input)

// $userId est déjà sécurisé via le token. Pas besoin de lire $input['user_id'] qui est falsifiable.

// Fields to update
$grade = $input['grade_level'] ?? null;
$subjects = $input['active_subjects'] ?? null; 
$focusCats = $input['focus_categories'] ?? null; 

$promptActive = isset($input['custom_prompt_active']) ? (int)$input['custom_prompt_active'] : null;
$promptText = $input['custom_prompt_text'] ?? null;

$fields = [];
$params = [];

if ($grade) { $fields[] = "grade_level = ?"; $params[] = $grade; }
if ($subjects !== null) { $fields[] = "active_subjects = ?"; $params[] = json_encode($subjects, JSON_UNESCAPED_UNICODE); }
if ($focusCats !== null) {
    $fields[] = "focus_categories = ?";
    $val = empty($focusCats) ? new stdClass() : $focusCats;
    $params[] = json_encode($val, JSON_UNESCAPED_UNICODE);
}
if ($promptActive !== null) { $fields[] = "custom_prompt_active = ?"; $params[] = $promptActive; }
if ($promptText !== null) { $fields[] = "custom_prompt_text = ?"; $params[] = $promptText; }

if (empty($fields)) {
    echo json_encode(['success' => true, 'message' => 'No changes']);
    exit;
}

$params[] = $userId;
$sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";

try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    echo json_encode(['success' => true, 'message' => 'Configuration updated']);
} catch (PDOException $e) {
    // Auto-Repair Column
    if (($e->getCode() == '42S22' || $e->errorInfo[1] == 1054) && strpos($e->getMessage(), 'focus_categories') !== false) {
        try {
            $pdo->exec("ALTER TABLE users ADD COLUMN `focus_categories` JSON DEFAULT NULL COMMENT 'Map Subject -> Category'");
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode(['success' => true, 'message' => 'Configuration sauvegardée (Auto-Repair)']);
            exit;
        } catch (Exception $ex) {}
    }
    http_response_code(500); 
    echo json_encode(['success' => false, 'message' => 'DB Error: ' . $e->getMessage()]);
}
?>