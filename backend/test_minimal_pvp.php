<?php
// Test minimal sans error handlers
ob_start();
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "START\n";

try {
    require_once __DIR__ . '/protected_setup.php';
    echo "protected_setup OK\n";
    
    header('Content-Type: application/json');
    
    $user_id = $userId;
    echo "userId = $user_id\n";
    
    // Test simple requête
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM online_players WHERE status='online'");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'count' => $result['count']]);
    
} catch (Exception $e) {
    echo "EXCEPTION: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . " Line: " . $e->getLine() . "\n";
} catch (Error $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . " Line: " . $e->getLine() . "\n";
}

ob_end_flush();
