<?php
/**
 * Ajouter le statut 'seen' aux défis PVP
 */

header('Content-Type: application/json');

if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
    $host = DB_HOST;
    $db   = DB_NAME;
    $user = DB_USER;
    $pass = DB_PASSWORD;
    $charset = DB_CHARSET;
} else {
    echo json_encode(['success' => false, 'message' => 'Fichier config.php manquant']);
    exit;
}

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    
    // Modifier la colonne status pour ajouter 'seen'
    $pdo->exec("
        ALTER TABLE pvp_challenges 
        MODIFY COLUMN status ENUM('pending', 'accepted', 'declined', 'expired', 'seen') DEFAULT 'pending'
    ");
    
    echo json_encode([
        'success' => true,
        'message' => 'Statut "seen" ajouté aux défis PVP'
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erreur lors de la modification',
        'error' => $e->getMessage()
    ]);
}
