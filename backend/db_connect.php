
<?php
// backend/db_connect.php
require_once 'cors.php';

$host = 'db5019487862.hosting-data.io';
$db   = 'dbs15241915';
$user = 'dbu5468595';
$pass = 'Atc13001!!7452!!';
$charset = 'utf8mb4';

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
