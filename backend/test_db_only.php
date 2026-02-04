<?php
// Test sans authentification - juste la DB
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    require_once __DIR__ . '/db_connect.php';
    echo "db_connect OK\n";
    
    header('Content-Type: application/json');
    
    // Test simple requête
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM online_players WHERE status='online'");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'count' => $result['count'], 'players' => 'test']);
    
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()]);
} catch (Error $e) {
    echo json_encode(['error' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()]);
}
