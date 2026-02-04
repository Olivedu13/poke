<?php
/**
 * Script de migration pour créer les tables PVP
 * À exécuter une seule fois pour mettre à jour la base de données
 * Accessible sans authentification
 */

// Pas de redirection - accès direct
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
} catch (\PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Connexion DB échouée: ' . $e->getMessage()]);
    exit;
}

try {
    // Créer la table online_players
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `online_players` (
          `user_id` INT(11) NOT NULL,
          `status` ENUM('available', 'in_battle', 'challenged') DEFAULT 'available',
          `last_seen` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (`user_id`),
          CONSTRAINT `fk_online_player` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    
    // Créer la table pvp_challenges
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `pvp_challenges` (
          `id` INT(11) NOT NULL AUTO_INCREMENT,
          `challenger_id` INT(11) NOT NULL,
          `challenged_id` INT(11) NOT NULL,
          `status` ENUM('pending', 'accepted', 'declined', 'expired') DEFAULT 'pending',
          `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`),
          KEY `idx_challenger` (`challenger_id`),
          KEY `idx_challenged` (`challenged_id`),
          CONSTRAINT `fk_challenger` FOREIGN KEY (`challenger_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
          CONSTRAINT `fk_challenged` FOREIGN KEY (`challenged_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    
    // Créer la table pvp_matches
        $pdo->exec("
                CREATE TABLE IF NOT EXISTS `pvp_matches` (
                    `id` INT(11) NOT NULL AUTO_INCREMENT,
                    `player1_id` INT(11) NOT NULL,
                    `player2_id` INT(11) NOT NULL,
                    `status` ENUM('WAITING', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED') DEFAULT 'WAITING',
                    `current_turn` INT(11) DEFAULT NULL,
                    `current_question_id` INT(11) DEFAULT NULL,
                    `winner_id` INT(11) DEFAULT NULL,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    `ended_at` TIMESTAMP NULL DEFAULT NULL,
                    PRIMARY KEY (`id`),
                    KEY `idx_player1` (`player1_id`),
                    KEY `idx_player2` (`player2_id`),
                    CONSTRAINT `fk_match_player1` FOREIGN KEY (`player1_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
                    CONSTRAINT `fk_match_player2` FOREIGN KEY (`player2_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
                    CONSTRAINT `fk_match_winner` FOREIGN KEY (`winner_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
                    CONSTRAINT `fk_match_current_turn` FOREIGN KEY (`current_turn`) REFERENCES `users` (`id`) ON DELETE SET NULL,
                    CONSTRAINT `fk_match_current_question` FOREIGN KEY (`current_question_id`) REFERENCES `question_bank` (`id`) ON DELETE SET NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        // Créer la table pvp_turns
        $pdo->exec("
                CREATE TABLE IF NOT EXISTS `pvp_turns` (
                    `id` INT(11) NOT NULL AUTO_INCREMENT,
                    `match_id` INT(11) NOT NULL,
                    `player_id` INT(11) NOT NULL,
                    `turn_number` INT(11) NOT NULL,
                    `question_id` INT(11) DEFAULT NULL,
                    `answer_index` TINYINT(4) DEFAULT NULL,
                    `is_correct` TINYINT(1) DEFAULT NULL,
                    `damage_dealt` INT(11) DEFAULT 0,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (`id`),
                    KEY `idx_match` (`match_id`),
                    CONSTRAINT `fk_turn_match` FOREIGN KEY (`match_id`) REFERENCES `pvp_matches` (`id`) ON DELETE CASCADE,
                    CONSTRAINT `fk_turn_player` FOREIGN KEY (`player_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
    
    echo json_encode([
        'success' => true,
        'message' => 'Tables PVP créées avec succès !',
        'tables' => ['online_players', 'pvp_challenges', 'pvp_matches', 'pvp_turns']
    ]);

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erreur lors de la création des tables PVP',
        'error' => $e->getMessage()
    ]);
}
