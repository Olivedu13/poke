<?php
require_once 'db_connect.php';

// Force JSON Header
header('Content-Type: application/json');

// --- 1. LECTURE DES ENTRÉES ROBUSTE ---
$input = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true) ?? [];
}

// Récupération ID Utilisateur (GET ou POST)
$userId = $_GET['user_id'] ?? $input['user_id'] ?? null;

if (!$userId) {
    echo json_encode(['success' => false, 'message' => 'User ID manquant']);
    exit;
}

// --- HELPER EVOLUTION ---
function getEvolutionSequence($currentId, $isMax = false) {
    $currentId = (int)$currentId;
    
    // Chaines Spécifiques (Gen 1)
    $chains = [
        1 => [2, 3], 2 => [3], // Bulbizarre
        4 => [5, 6], 5 => [6], // Salamèche
        7 => [8, 9], 8 => [9], // Carapuce
        10 => [11, 12], 11 => [12], // Chenipan
        13 => [14, 15], 14 => [15], // Aspicot
        16 => [17, 18], 17 => [18], // Roucool
        19 => [20], // Rattata
        21 => [22], // Piafabec
        23 => [24], // Abo
        25 => [26], // Pikachu
        27 => [28], // Sabelette
        29 => [30, 31], 30 => [31], // Nidoran F
        32 => [33, 34], 33 => [34], // Nidoran M
        35 => [36], // Melofee
        37 => [38], // Goupix
        39 => [40], // Rondoudou
        41 => [42], // Nosferapti
        43 => [44, 45], 44 => [45], // Mystherbe
        46 => [47], // Paras
        48 => [49], // Mimitoss
        50 => [51], // Taupiqueur
        52 => [53], // Miaouss
        54 => [55], // Psykokwak
        56 => [57], // Ferosinge
        58 => [59], // Caninos
        60 => [61, 62], 61 => [62], // Ptitard
        63 => [64, 65], 64 => [65], // Abra
        66 => [67, 68], 67 => [68], // Machoc
        69 => [70, 71], 70 => [71], // Chetiflor
        72 => [73], // Tentacool
        74 => [75, 76], 75 => [76], // Racaillou
        77 => [78], // Ponyta
        79 => [80], // Ramoloss
        81 => [82], // Magneti
        83 => [84], // Canarticho (Pas d'evo gen 1)
        84 => [85], // Doduo
        86 => [87], // Otaria
        88 => [89], // Tadmorv
        90 => [91], // Kokiyas
        92 => [93, 94], 93 => [94], // Fantominus
        95 => [96], // Onix (Pas d'evo gen 1, mais pour le fun)
        96 => [97], // Soporifik
        98 => [99], // Krabby
        100 => [101], // Voltorbe
        102 => [103], // Noeunoeuf
        104 => [105], // Osselait
        109 => [110], // Smogo
        111 => [112], // Rhinocorne
        116 => [117], // Hypotrempe
        118 => [119], // Poissirene
        120 => [121], // Stari
        129 => [130], // Magicarpe
        133 => [134], // Eevee (Vaporeon default)
        147 => [148, 149], 148 => [149], // Minidraco
    ];

    if ($isMax) {
        // Evolution Ultime (Pierre Ultime)
        if (isset($chains[$currentId])) {
            return $chains[$currentId];
        }
        // Fallback générique : +1 puis +2 si < 149 (Safe limit)
        if ($currentId < 149) return [$currentId + 1, $currentId + 2]; 
        return [];
    } else {
        // Evolution Simple (Pierre Évolution)
        if (isset($chains[$currentId])) {
            return [$chains[$currentId][0]];
        }
        // Fallback Force: ID + 1 (pour que ça marche toujours si < 151)
        if ($currentId < 151) return [$currentId + 1];
        return [];
    }
}

try {
    // ==========================================
    // METHODE GET : RECUPERER L'EQUIPE
    // ==========================================
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $pdo->prepare("SELECT * FROM user_pokemon WHERE user_id = ? ORDER BY is_team DESC, level DESC");
        $stmt->execute([$userId]);
        $pokemons = $stmt->fetchAll();
        
        // --- AUTO-SEED FALLBACK (Si vide) ---
        if (count($pokemons) === 0) {
            $starters = [
                ['id' => 1, 'name' => 'Bulbizarre', 'hp' => 45],
                ['id' => 4, 'name' => 'Salamèche', 'hp' => 39],
                ['id' => 7, 'name' => 'Carapuce', 'hp' => 44]
            ];
            $sqlPoke = "INSERT INTO user_pokemon (id, user_id, tyradex_id, nickname, level, current_hp, current_xp, is_team) VALUES (?, ?, ?, ?, 1, ?, 0, 1)";
            $stmtPoke = $pdo->prepare($sqlPoke);
            
            foreach ($starters as $s) {
                $uuid = uniqid('starter_', true);
                $stmtPoke->execute([$uuid, $userId, $s['id'], $s['name'], $s['hp']]);
            }
            
            $stmt->execute([$userId]);
            $pokemons = $stmt->fetchAll();
        }

        foreach ($pokemons as &$p) {
            // Stats RPG Simplifiées
            $p['max_hp'] = 20 + ($p['level'] * 5) + ($p['tyradex_id'] % 10);
            if ($p['current_hp'] > $p['max_hp']) $p['current_hp'] = $p['max_hp'];

            $p['sprite_url'] = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{$p['tyradex_id']}.png";
            $p['name'] = $p['nickname'] ?: "Pokemon #{$p['tyradex_id']}";
            
            $p['is_team'] = (bool)$p['is_team'];
            $p['current_xp'] = (int)$p['current_xp'];
            $p['next_level_xp'] = 100 * $p['level'];
            
            // Stats Display
            $p['stats'] = [
                'atk' => 10 + $p['level'] * 2,
                'def' => 10 + $p['level'] * 1.5,
                'spe' => 10 + $p['level']
            ];
        }

        echo json_encode(['success' => true, 'data' => $pokemons]);
    }

    // ==========================================
    // METHODE POST : ACTIONS (FEED, USE_ITEM...)
    // ==========================================
    elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = $input['action'] ?? '';
        $pokeId = $input['pokemon_id'] ?? '';
        
        if (!$action || !$pokeId) {
            echo json_encode(['success' => false, 'message' => 'Action ou ID Pokemon manquant']);
            exit;
        }

        // --- NOURRIR (GLOBAL XP) ---
        if ($action === 'feed') {
            $xpCost = 100;
            
            $pdo->beginTransaction();
            
            $stmt = $pdo->prepare("SELECT global_xp FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $globalXp = $stmt->fetchColumn();

            if ($globalXp < $xpCost) {
                $pdo->rollBack();
                echo json_encode(['success' => false, 'message' => 'Pas assez d\'XP Global']);
                exit;
            }

            // Dépense XP
            $pdo->prepare("UPDATE users SET global_xp = global_xp - ? WHERE id = ?")->execute([$xpCost, $userId]);
            
            // Gain XP Pokemon
            $pdo->prepare("UPDATE user_pokemon SET current_xp = current_xp + 100 WHERE id = ?")->execute([$pokeId]);
            
            // Vérification Montée de Niveau
            $stmtP = $pdo->prepare("SELECT level, current_xp FROM user_pokemon WHERE id = ?");
            $stmtP->execute([$pokeId]);
            $pInfo = $stmtP->fetch();
            
            $newLvl = $pInfo['level'];
            $threshold = $newLvl * 100;
            $msg = "XP Gagnée !";

            if ($pInfo['current_xp'] >= $threshold) {
                 $pdo->prepare("UPDATE user_pokemon SET level = level + 1, current_xp = 0, current_hp = current_hp + 10 WHERE id = ?")->execute([$pokeId]);
                 $msg = "Niveau Supérieur !";
            }

            $pdo->commit();
            echo json_encode(['success' => true, 'message' => $msg]);
        }
        
        // --- UTILISER OBJET ---
        elseif ($action === 'use_item') {
            $itemId = $input['item_id'];
            
            // Vérifier Stock avec Jointure avec FORCAGE COLLATION
            $stmtInv = $pdo->prepare("SELECT i.quantity, it.effect_type, it.value FROM inventory i LEFT JOIN items it ON i.item_id = it.id COLLATE utf8mb4_unicode_ci WHERE i.user_id = ? AND i.item_id = ?");
            $stmtInv->execute([$userId, $itemId]);
            $itemData = $stmtInv->fetch(PDO::FETCH_ASSOC);
            
            if (!$itemData) {
                echo json_encode(['success' => false, 'message' => 'Objet introuvable dans votre inventaire']);
                exit;
            }

            if ($itemId === 'evolution') $itemData['effect_type'] = 'EVOLUTION';
            if ($itemId === 'evolution_ultime') $itemData['effect_type'] = 'EVOLUTION_MAX';

            // WHITELIST
            $allowedEffects = ['HEAL', 'EVOLUTION', 'EVOLUTION_MAX'];
            if (!in_array($itemData['effect_type'], $allowedEffects)) {
                echo json_encode(['success' => false, 'message' => "Cet objet ne peut être utilisé qu'en combat !"]);
                exit;
            }

            if ($itemData['quantity'] < 1) {
                echo json_encode(['success' => false, 'message' => 'Stock épuisé']);
                exit;
            }
            
            $pdo->beginTransaction();
            
            // Consommer Objet
            if ($itemData['quantity'] == 1) {
                $pdo->prepare("DELETE FROM inventory WHERE user_id = ? AND item_id = ?")->execute([$userId, $itemId]);
            } else {
                $pdo->prepare("UPDATE inventory SET quantity = quantity - 1 WHERE user_id = ? AND item_id = ?")->execute([$userId, $itemId]);
            }
            
            // Appliquer Effet
            $msg = "Objet utilisé.";
            $evolutionData = [];
            $evolded = false;
            $sequence = [];
            
            // --- LOGIQUE SOIN ---
            if ($itemData['effect_type'] === 'HEAL') {
                 $stmtStats = $pdo->prepare("SELECT level, current_hp, tyradex_id FROM user_pokemon WHERE id = ?");
                 $stmtStats->execute([$pokeId]);
                 $pStats = $stmtStats->fetch();
                 
                 if ($pStats) {
                     $maxHp = 20 + ($pStats['level'] * 5) + ($pStats['tyradex_id'] % 10);
                     $healAmount = $itemData['value'] ?? 20;
                     $newHp = min($maxHp, $pStats['current_hp'] + $healAmount);
                     
                     $pdo->prepare("UPDATE user_pokemon SET current_hp = ? WHERE id = ?")->execute([$newHp, $pokeId]);
                     $msg = "PV Restaurés (+{$healAmount}) !";
                 }
            }
            
            // --- LOGIQUE EVOLUTION ---
            elseif ($itemData['effect_type'] === 'EVOLUTION' || $itemData['effect_type'] === 'EVOLUTION_MAX') {
                 $stmtP = $pdo->prepare("SELECT tyradex_id, nickname FROM user_pokemon WHERE id = ?");
                 $stmtP->execute([$pokeId]);
                 $pData = $stmtP->fetch();
                 
                 $isMax = ($itemData['effect_type'] === 'EVOLUTION_MAX');
                 $sequence = getEvolutionSequence($pData['tyradex_id'], $isMax);
                 
                 if (!empty($sequence)) {
                     $finalId = end($sequence); // Dernier stade
                     $pdo->prepare("UPDATE user_pokemon SET tyradex_id = ? WHERE id = ?")->execute([$finalId, $pokeId]);
                     
                     // APPEL API POUR RECUPERER LE VRAI NOM (Car on n'a plus le tableau local)
                     $nameFr = "Pokemon #$finalId";
                     $apiJson = @file_get_contents("https://tyradex.app/api/v1/pokemon/$finalId");
                     if ($apiJson) {
                         $apiData = json_decode($apiJson, true);
                         if (isset($apiData['name']['fr'])) $nameFr = $apiData['name']['fr'];
                     }
                     
                     $pdo->prepare("UPDATE user_pokemon SET nickname = ? WHERE id = ?")->execute([$nameFr, $pokeId]);
                     
                     // Full Heal on Evolve
                     $stmtNewStats = $pdo->prepare("SELECT level FROM user_pokemon WHERE id = ?");
                     $stmtNewStats->execute([$pokeId]);
                     $lvl = $stmtNewStats->fetchColumn();
                     $newMaxHp = 20 + ($lvl * 5) + ($finalId % 10);
                     $pdo->prepare("UPDATE user_pokemon SET current_hp = ? WHERE id = ?")->execute([$newMaxHp, $pokeId]);

                     $msg = "Évolution réussie !";
                     $evolded = true;
                     
                     array_unshift($sequence, (int)$pData['tyradex_id']);
                 } else {
                     $msg = "Cela n'a aucun effet sur ce Pokémon.";
                 }
            }
            
            $pdo->commit();
            echo json_encode([
                'success' => true, 
                'message' => $msg, 
                'evolution' => $evolded, 
                'sequence' => $evolded ? $sequence : null
            ]);
        }

        // --- GESTION ÉQUIPE ---
        elseif ($action === 'toggle_team') {
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM user_pokemon WHERE user_id = ? AND is_team = 1");
            $stmt->execute([$userId]);
            $count = $stmt->fetchColumn();
            
            $stmtP = $pdo->prepare("SELECT is_team FROM user_pokemon WHERE id = ?");
            $stmtP->execute([$pokeId]);
            $isTeam = $stmtP->fetchColumn();
            
            if (!$isTeam && $count >= 3) {
                echo json_encode(['success' => false, 'message' => 'Équipe complète (3 max)']);
                exit;
            }
            
            $newState = $isTeam ? 0 : 1;
            $pdo->prepare("UPDATE user_pokemon SET is_team = ? WHERE id = ?")->execute([$newState, $pokeId]);
            
            echo json_encode(['success' => true, 'message' => $newState ? 'Ajouté à l\'équipe' : 'Envoyé au PC']);
        }
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo json_encode(['success' => false, 'message' => 'Erreur Serveur: ' . $e->getMessage()]);
}
?>