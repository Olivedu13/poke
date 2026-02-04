<?php
// backend/db_connect.php
require_once 'cors.php';

// Charger la configuration
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
    $host = DB_HOST;
    $db   = DB_NAME;
    $user = DB_USER;
    $pass = DB_PASSWORD;
    $charset = DB_CHARSET;
} else {
    // Fallback sur les valeurs en dur si config.php n'existe pas
    $host = 'db5019487862.hosting-data.io';
    $db   = 'dbs15241915';
    $user = 'dbu5468595';
    $pass = 'Atc13001!!7452!!';
    $charset = 'utf8mb4';
}

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database Connection Failed']);
    exit();
}
