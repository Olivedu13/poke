<?php
/**
 * Migration pour transformer le PVP en combat procédural
 * - Ajout des équipes complètes (3 Pokémon chacun)
 * - Ajout d'un historique visible des questions/réponses
 * - Ajout des stats de combat (HP actuels des Pokémon)
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

try {
    $changes = [];
    
    // 1. Ajouter les colonnes d'équipes dans pvp_matches
    $stmt = $pdo->query("SHOW COLUMNS FROM pvp_matches LIKE 'player1_team'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE pvp_matches ADD COLUMN player1_team JSON DEFAULT NULL COMMENT 'Équipe complète du joueur 1 (3 Pokémon)'");
        $changes[] = "Colonne player1_team ajoutée";
    }
    
    $stmt = $pdo->query("SHOW COLUMNS FROM pvp_matches LIKE 'player2_team'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE pvp_matches ADD COLUMN player2_team JSON DEFAULT NULL COMMENT 'Équipe complète du joueur 2 (3 Pokémon)'");
        $changes[] = "Colonne player2_team ajoutée";
    }
    
    // 2. Ajouter les stats de combat actuelles (HP des Pokémon)
    $stmt = $pdo->query("SHOW COLUMNS FROM pvp_matches LIKE 'player1_team_hp'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE pvp_matches ADD COLUMN player1_team_hp JSON DEFAULT NULL COMMENT 'HP actuels de l\\'équipe 1'");
        $changes[] = "Colonne player1_team_hp ajoutée";
    }
    
    $stmt = $pdo->query("SHOW COLUMNS FROM pvp_matches LIKE 'player2_team_hp'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE pvp_matches ADD COLUMN player2_team_hp JSON DEFAULT NULL COMMENT 'HP actuels de l\\'équipe 2'");
        $changes[] = "Colonne player2_team_hp ajoutée";
    }
    
    // 3. Ajouter l'index du Pokémon actif pour chaque joueur
    $stmt = $pdo->query("SHOW COLUMNS FROM pvp_matches LIKE 'player1_active_pokemon'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE pvp_matches ADD COLUMN player1_active_pokemon TINYINT DEFAULT 0 COMMENT 'Index du Pokémon actif (0-2)'");
        $changes[] = "Colonne player1_active_pokemon ajoutée";
    }
    
    $stmt = $pdo->query("SHOW COLUMNS FROM pvp_matches LIKE 'player2_active_pokemon'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE pvp_matches ADD COLUMN player2_active_pokemon TINYINT DEFAULT 0 COMMENT 'Index du Pokémon actif (0-2)'");
        $changes[] = "Colonne player2_active_pokemon ajoutée";
    }
    
    // 4. Modifier pvp_turns pour stocker toutes les infos de la question/réponse
    $stmt = $pdo->query("SHOW COLUMNS FROM pvp_turns LIKE 'question_text'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE pvp_turns ADD COLUMN question_text TEXT DEFAULT NULL COMMENT 'Texte de la question'");
        $changes[] = "Colonne question_text ajoutée à pvp_turns";
    }
    
    $stmt = $pdo->query("SHOW COLUMNS FROM pvp_turns LIKE 'question_options'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE pvp_turns ADD COLUMN question_options JSON DEFAULT NULL COMMENT 'Options de réponse'");
        $changes[] = "Colonne question_options ajoutée à pvp_turns";
    }
    
    $stmt = $pdo->query("SHOW COLUMNS FROM pvp_turns LIKE 'correct_index'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE pvp_turns ADD COLUMN correct_index TINYINT DEFAULT NULL COMMENT 'Index de la bonne réponse'");
        $changes[] = "Colonne correct_index ajoutée à pvp_turns";
    }
    
    $stmt = $pdo->query("SHOW COLUMNS FROM pvp_turns LIKE 'target_pokemon_index'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE pvp_turns ADD COLUMN target_pokemon_index TINYINT DEFAULT NULL COMMENT 'Index du Pokémon ciblé (0-2)'");
        $changes[] = "Colonne target_pokemon_index ajoutée à pvp_turns";
    }
    
    // 5. Ajouter une colonne pour les récompenses XP
    $stmt = $pdo->query("SHOW COLUMNS FROM pvp_matches LIKE 'xp_reward'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE pvp_matches ADD COLUMN xp_reward INT DEFAULT 50 COMMENT 'XP gagnée par le vainqueur'");
        $changes[] = "Colonne xp_reward ajoutée";
    }
    
    // 6. Ajouter une colonne pour suivre l'état d'attente de réponse
    $stmt = $pdo->query("SHOW COLUMNS FROM pvp_matches LIKE 'waiting_for_answer'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE pvp_matches ADD COLUMN waiting_for_answer TINYINT(1) DEFAULT 0 COMMENT 'En attente de réponse du joueur actif'");
        $changes[] = "Colonne waiting_for_answer ajoutée";
    }
    
    // 6b. Ajouter une colonne pour stocker la question actuelle
    $stmt = $pdo->query("SHOW COLUMNS FROM pvp_matches LIKE 'current_question_id'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE pvp_matches ADD COLUMN current_question_id INT DEFAULT NULL COMMENT 'ID de la question en cours'");
        $changes[] = "Colonne current_question_id ajoutée";
    }
    
    // 7. Ajouter les équipes dans pvp_challenges
    $stmt = $pdo->query("SHOW COLUMNS FROM pvp_challenges LIKE 'challenger_team'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE pvp_challenges ADD COLUMN challenger_team JSON DEFAULT NULL COMMENT 'Équipe du challenger pour preview'");
        $changes[] = "Colonne challenger_team ajoutée à pvp_challenges";
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Migration PVP procédural effectuée avec succès !',
        'changes' => $changes
    ]);

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erreur lors de la migration',
        'error' => $e->getMessage()
    ]);
}
