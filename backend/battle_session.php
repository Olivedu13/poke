<?php
// backend/battle_session.php
require_once 'db_connect.php';

const MAX_CONCURRENT_PVP = 6; // Limite uniquement pour le PvP

/**
 * Vérifie si un combat PvP peut être lancé
 * Limite à 6 combats PvP simultanés maximum
 */
function canStartPvPBattle($pdo) {
    // Nettoyer les vieilles sessions (> 30 minutes)
    $pdo->exec("DELETE FROM active_battles WHERE started_at < NOW() - INTERVAL 30 MINUTE");
    
    // Compter uniquement les combats PvP actifs
    $stmt = $pdo->query("SELECT COUNT(*) FROM active_battles WHERE battle_type = 'PVP'");
    $count = (int)$stmt->fetchColumn();
    
    return $count < MAX_CONCURRENT_PVP;
}

/**
 * Obtenir le nombre de combats PvP actifs
 */
function getActivePvPCount($pdo) {
    $pdo->exec("DELETE FROM active_battles WHERE started_at < NOW() - INTERVAL 30 MINUTE");
    $stmt = $pdo->query("SELECT COUNT(*) FROM active_battles WHERE battle_type = 'PVP'");
    return (int)$stmt->fetchColumn();
}

/**
 * Enregistrer le début d'un combat
 */
function startBattleSession($userId, $battleType, $pdo) {
    try {
        $stmt = $pdo->prepare("INSERT INTO active_battles (user_id, battle_type) VALUES (?, ?) ON DUPLICATE KEY UPDATE battle_type = ?, started_at = NOW()");
        $stmt->execute([$userId, $battleType, $battleType]);
        return true;
    } catch (PDOException $e) {
        return false;
    }
}

/**
 * Terminer un combat
 */
function endBattleSession($userId, $pdo) {
    try {
        $stmt = $pdo->prepare("DELETE FROM active_battles WHERE user_id = ?");
        $stmt->execute([$userId]);
        return true;
    } catch (PDOException $e) {
        return false;
    }
}

/**
 * Vérifier si un utilisateur a déjà un combat actif
 */
function hasActiveBattle($userId, $pdo) {
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM active_battles WHERE user_id = ?");
    $stmt->execute([$userId]);
    return (int)$stmt->fetchColumn() > 0;
}

/**
 * API endpoint pour vérifier la disponibilité des combats
 */
if (isset($_GET['action']) || (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'POST')) {
    header('Content-Type: application/json');
    
    // Pour les requêtes POST, récupérer l'action depuis le body
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true);
        $action = $input['action'] ?? null;
        
        // Vérifier l'authentification pour les actions POST
        require_once 'jwt_utils.php';
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            echo json_encode(['success' => false, 'message' => 'Non authentifié']);
            exit;
        }
        $token = $matches[1];
        $decoded = verify_jwt($token);
        if (!$decoded) {
            echo json_encode(['success' => false, 'message' => 'Token invalide']);
            exit;
        }
        $userId = $decoded['user_id'];
    } else {
        $action = $_GET['action'] ?? null;
    }
    
    switch ($action) {
        case 'start':
            if (!isset($userId)) {
                echo json_encode(['success' => false, 'message' => 'Utilisateur non identifié']);
                break;
            }
            
            $battleType = $input['battle_type'] ?? 'WILD';
            
            // Vérifier la limite uniquement pour le PvP
            if ($battleType === 'PVP' && !canStartPvPBattle($pdo)) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Serveur PvP plein',
                    'active_pvp' => getActivePvPCount($pdo),
                    'max_pvp' => MAX_CONCURRENT_PVP
                ]);
                break;
            }
            
            $started = startBattleSession($userId, $battleType, $pdo);
            
            echo json_encode([
                'success' => $started,
                'message' => $started ? 'Combat démarré' : 'Erreur démarrage'
            ]);
            break;
            
        case 'can_start':
            $canStart = canStartPvPBattle($pdo);
            $activeCount = getActivePvPCount($pdo);
            $slots = MAX_CONCURRENT_PVP - $activeCount;
            
            echo json_encode([
                'success' => true,
                'can_start' => $canStart,
                'active_pvp' => $activeCount,
                'available_slots' => max(0, $slots),
                'max_pvp' => MAX_CONCURRENT_PVP
            ]);
            break;
            
        case 'stats':
            echo json_encode([
                'success' => true,
                'active_pvp' => getActivePvPCount($pdo),
                'max_pvp' => MAX_CONCURRENT_PVP
            ]);
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Action inconnue']);
    }
    exit;
}
?>
