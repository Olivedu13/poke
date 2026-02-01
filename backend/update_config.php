<?php
require_once 'db_connect.php';

$input = json_decode(file_get_contents('php://input'), true);

$userId = $input['user_id'] ?? null;
if (!$userId) {
    echo json_encode(['success' => false, 'message' => 'User ID required']);
    exit;
}

// Fields to update
$grade = $input['grade_level'] ?? null;
$subjects = $input['active_subjects'] ?? null; // Expects Array
$promptActive = isset($input['custom_prompt_active']) ? (int)$input['custom_prompt_active'] : null;
$promptText = $input['custom_prompt_text'] ?? null;

// Build Dynamic Query
$fields = [];
$params = [];

if ($grade) {
    $fields[] = "grade_level = ?";
    $params[] = $grade;
}
if ($subjects !== null) {
    $fields[] = "active_subjects = ?";
    $params[] = json_encode($subjects);
}
if ($promptActive !== null) {
    $fields[] = "custom_prompt_active = ?";
    $params[] = $promptActive;
}
if ($promptText !== null) {
    $fields[] = "custom_prompt_text = ?";
    $params[] = $promptText;
}

if (empty($fields)) {
    echo json_encode(['success' => true, 'message' => 'No changes']);
    exit;
}

// Add ID to params
$params[] = $userId;

$sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";

try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    echo json_encode(['success' => true, 'message' => 'Configuration updated']);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'DB Error: ' . $e->getMessage()]);
}
?>