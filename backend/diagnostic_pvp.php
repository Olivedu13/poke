<?php
/**
 * Script de diagnostic PVP
 * Vérifie l'état des tables et colonnes
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
} catch (\PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Connexion DB échouée: ' . $e->getMessage()]);
    exit;
}

$diagnostic = [
    'success' => true,
    'tables' => [],
    'columns' => []
];

// Vérifier les tables PVP
$tables = ['online_players', 'pvp_challenges', 'pvp_matches', 'pvp_turns'];
foreach ($tables as $table) {
    $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
    $exists = $stmt->fetch() ? true : false;
    $diagnostic['tables'][$table] = $exists;
    
    if ($exists) {
        // Récupérer les colonnes
        $stmt = $pdo->query("SHOW COLUMNS FROM $table");
        $diagnostic['columns'][$table] = $stmt->fetchAll(PDO::FETCH_COLUMN);
    }
}

// Compter les entrées
$diagnostic['counts'] = [
    'online_players' => $pdo->query("SELECT COUNT(*) FROM online_players")->fetchColumn(),
    'pvp_challenges' => $pdo->query("SELECT COUNT(*) FROM pvp_challenges")->fetchColumn(),
    'pvp_matches' => $pdo->query("SELECT COUNT(*) FROM pvp_matches")->fetchColumn(),
    'pvp_turns' => $pdo->query("SELECT COUNT(*) FROM pvp_turns")->fetchColumn()
];

echo json_encode($diagnostic, JSON_PRETTY_PRINT);
