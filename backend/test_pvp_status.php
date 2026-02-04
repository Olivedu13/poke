<?php
/**
 * Script de test pour vérifier l'état du système PVP
 * Accessible sans authentification pour le debugging
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
} catch (\PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Connexion DB échouée: ' . $e->getMessage()]);
    exit;
}

$action = $_GET['action'] ?? null;

try {
    switch ($action) {
        case 'online_players':
            $stmt = $pdo->query("
                SELECT op.*, u.username
                FROM online_players op
                JOIN users u ON op.user_id = u.id
                ORDER BY op.last_seen DESC
            ");
            $players = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'count' => count($players),
                'players' => $players
            ]);
            break;

        case 'challenges':
            $stmt = $pdo->query("
                SELECT 
                    c.*,
                    u1.username as challenger_name,
                    u2.username as challenged_name
                FROM pvp_challenges c
                JOIN users u1 ON c.challenger_id = u1.id
                JOIN users u2 ON c.challenged_id = u2.id
                ORDER BY c.created_at DESC
                LIMIT 50
            ");
            $challenges = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'count' => count($challenges),
                'challenges' => $challenges
            ]);
            break;

        case 'matches':
            $stmt = $pdo->query("
                SELECT 
                    m.*,
                    u1.username as player1_name,
                    u2.username as player2_name,
                    u3.username as winner_name
                FROM pvp_matches m
                JOIN users u1 ON m.player1_id = u1.id
                JOIN users u2 ON m.player2_id = u2.id
                LEFT JOIN users u3 ON m.winner_id = u3.id
                ORDER BY m.created_at DESC
                LIMIT 50
            ");
            $matches = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'count' => count($matches),
                'matches' => $matches
            ]);
            break;

        case 'clean_players':
            $stmt = $pdo->exec("
                DELETE FROM online_players 
                WHERE last_seen < DATE_SUB(NOW(), INTERVAL 30 SECOND)
            ");
            
            echo json_encode([
                'success' => true,
                'message' => "Joueurs inactifs supprimés : $stmt"
            ]);
            break;

        case 'clean_challenges':
            $stmt = $pdo->exec("
                DELETE FROM pvp_challenges 
                WHERE created_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)
                AND status = 'pending'
            ");
            
            echo json_encode([
                'success' => true,
                'message' => "Vieux défis supprimés : $stmt"
            ]);
            break;

        case 'tables_exist':
            $tables = ['online_players', 'pvp_challenges', 'pvp_matches'];
            $results = [];
            
            foreach ($tables as $table) {
                $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
                $results[$table] = $stmt->rowCount() > 0;
            }
            
            echo json_encode([
                'success' => true,
                'tables' => $results,
                'all_exist' => !in_array(false, $results)
            ]);
            break;

        default:
            echo json_encode([
                'success' => false,
                'message' => 'Action invalide',
                'available_actions' => [
                    'online_players',
                    'challenges',
                    'matches',
                    'clean_players',
                    'clean_challenges',
                    'tables_exist'
                ]
            ]);
    }

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erreur de base de données',
        'error' => $e->getMessage()
    ]);
}
