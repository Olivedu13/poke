<?php
// Test minimal pour identifier le problème
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "1. Test de base OK\n";

try {
    require_once __DIR__ . '/protected_setup.php';
    echo "2. Protected setup OK\n";
    echo "3. userId = " . (isset($userId) ? $userId : 'NON DÉFINI') . "\n";
    echo "4. pdo = " . (isset($pdo) ? 'OK' : 'NON DÉFINI') . "\n";
} catch (Exception $e) {
    echo "ERREUR: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
}
