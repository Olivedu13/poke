<?php
/**
 * Migration pour ajouter current_turn à pvp_matches
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
    $stmt = $pdo->query("SHOW COLUMNS FROM pvp_matches LIKE 'current_turn'");
    $columnExists = $stmt->rowCount() > 0;
    
    if ($columnExists) {
        echo json_encode([
            'success' => true,
            'message' => 'La colonne current_turn existe déjà'
        ]);
        exit;
    }
    
    // Ajouter la colonne current_turn
    $pdo->exec("
        ALTER TABLE pvp_matches 
        ADD COLUMN current_turn INT(11) DEFAULT NULL AFTER status,
        ADD CONSTRAINT fk_match_current_turn 
        FOREIGN KEY (current_turn) REFERENCES users(id) ON DELETE SET NULL
    ");
    
    // Créer la table pour les tours de jeu
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS pvp_turns (
            id INT(11) NOT NULL AUTO_INCREMENT,
            match_id INT(11) NOT NULL,
            player_id INT(11) NOT NULL,
            turn_number INT(11) NOT NULL,
            question_id INT(11) DEFAULT NULL,
            answer_index TINYINT(4) DEFAULT NULL,
            is_correct TINYINT(1) DEFAULT NULL,
            damage_dealt INT(11) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_match (match_id),
            CONSTRAINT fk_turn_match FOREIGN KEY (match_id) REFERENCES pvp_matches(id) ON DELETE CASCADE,
            CONSTRAINT fk_turn_player FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    
    echo json_encode([
        'success' => true,
        'message' => 'Migration réussie ! Colonne current_turn et table pvp_turns créées',
        'changes' => [
            'pvp_matches.current_turn' => 'Ajoutée',
            'pvp_turns' => 'Créée'
        ]
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erreur lors de la migration',
        'error' => $e->getMessage()
    ]);
}
