<?php
require_once 'db_connect.php';
try {
    $pdo->exec("ALTER TABLE pvp_matches ADD current_question_id INT DEFAULT NULL");
    echo "DONE";
} catch (Exception $e) {
    echo "EXISTS OR ERROR";
}
