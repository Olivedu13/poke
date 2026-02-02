<?php
require_once 'db_connect.php';

// Récupération sécurisée du JSON
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

if (!is_array($input)) {
    echo json_encode(['success' => false, 'message' => 'Invalid JSON Payload']);
    exit;
}

$userId = $input['user_id'] ?? null;
if (!$userId) {
    echo json_encode(['success' => false, 'message' => 'User ID required']);
    exit;
}

// Fields to update
$grade = $input['grade_level'] ?? null;
$subjects = $input['active_subjects'] ?? null; 
$focusCats = $input['focus_categories'] ?? null; // NEW

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
    $params[] = json_encode($subjects, JSON_UNESCAPED_UNICODE);
}
if ($focusCats !== null) {
    $fields[] = "focus_categories = ?";
    // Si le tableau est vide, on force un objet JSON "{}" au lieu de "[]"
    // Cela évite les confusions côté Frontend (Record<string, string>)
    $val = empty($focusCats) ? new stdClass() : $focusCats;
    $params[] = json_encode($val, JSON_UNESCAPED_UNICODE);
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
    // SYSTEME D'AUTO-RÉPARATION BDD
    // Si l'erreur est "Column not found" (Code 42S22 ou 1054) pour 'focus_categories'
    if (($e->getCode() == '42S22' || $e->errorInfo[1] == 1054) && strpos($e->getMessage(), 'focus_categories') !== false) {
        try {
            // On tente de créer la colonne manquante à la volée
            $pdo->exec("ALTER TABLE users ADD COLUMN `focus_categories` JSON DEFAULT NULL COMMENT 'Map Subject -> Category'");
            
            // On réessaie la requête originale
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            echo json_encode(['success' => true, 'message' => 'Configuration sauvegardée (Base de données mise à jour automatiquement)']);
            exit;
        } catch (Exception $ex) {
            // Si la réparation échoue, on laisse l'erreur d'origine s'afficher
        }
    }

    // Log l'erreur côté serveur si possible, renvoie une erreur propre
    http_response_code(500); 
    echo json_encode(['success' => false, 'message' => 'DB Error: ' . $e->getMessage()]);
}
?>