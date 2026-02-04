<?php
/**
 * Migration pour ajouter current_question_id à pvp_matches
 */

header('Content-Type: application/json');

// Connexion directe à la base de données
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

    // Vérifier si la colonne existe déjà
    $stmt = $pdo->query("SHOW COLUMNS FROM pvp_matches LIKE 'current_question_id'");
    $columnExists = $stmt->rowCount() > 0;

    if ($columnExists) {
        echo json_encode([
            'success' => true,
            'message' => 'La colonne current_question_id existe déjà'
        ]);
        exit;
    }

    // Ajouter la colonne current_question_id
    $pdo->exec("
        ALTER TABLE pvp_matches 
        ADD COLUMN current_question_id INT(11) DEFAULT NULL AFTER current_turn,
        ADD CONSTRAINT fk_match_current_question 
        FOREIGN KEY (current_question_id) REFERENCES question_bank(id) ON DELETE SET NULL
    ");

    echo json_encode([
        'success' => true,
        'message' => 'Migration réussie ! Colonne current_question_id ajoutée',
        'changes' => [
            'pvp_matches.current_question_id' => 'Ajoutée'
        ]
    ]);

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erreur lors de la migration',
        'error' => $e->getMessage()
    ]);
}
