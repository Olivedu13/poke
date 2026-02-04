<?php
require_once 'protected_setup.php';

try {
    $pdo->exec("ALTER TABLE pvp_matches ADD COLUMN current_question_id INT DEFAULT NULL");
    echo "Column current_question_id added successfully.";
} catch (PDOException $e) {
    echo "Error (might already exist): " . $e->getMessage();
}
?>