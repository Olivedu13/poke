<?php
require_once 'protected_setup.php'; // Auth V3 (Définit $userId et $input)
require_once 'api_response.php';

// --- HELPER CUrl (Indispensable pour IONOS) ---
function fetchUrl($url) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_USERAGENT, 'PokeEdu-Backend/1.0');
    // Si SSL pose problème sur le mutualisé, décommenter la ligne suivante :
    // curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $data = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return ($httpCode === 200) ? $data : false;
}

// --- HELPER EVOLUTION (DYNAMIQUE) ---
function getEvolutionSequence($currentId, $isMax = false) {
    $currentId = (int)$currentId;
    $sequence = [];
    $loopGuard = 0; 

    do {
        $foundNext = false;
        $url = "https://tyradex.app/api/v1/pokemon/$currentId";
        
        $response = fetchUrl($url);
        
        if ($response) {
            $data = json_decode($response, true);
            
            if (isset($data['evolution']['next']) && is_array($data['evolution']['next']) && count($data['evolution']['next']) > 0) {
                $nextEvo = $data['evolution']['next'][0];
                $nextId = $nextEvo['pokedexId'];
                
                if ($nextId > 0 && $nextId != $currentId) {
                    $sequence[] = $nextId;
                    $currentId = $nextId;
                    $foundNext = true;
                }
            }
        }

        $loopGuard++;
        if (!$isMax) break;

    } while ($foundNext && $loopGuard < 3);

    return $sequence;
}

try {
    // ==========================================
    // METHODE GET : RECUPERER L'EQUIPE
    // ==========================================
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $pdo->prepare("SELECT * FROM user_pokemon WHERE user_id = ? ORDER BY is_team DESC, level DESC");
        $stmt->execute([$userId]);
        $pokemons = $stmt->fetchAll();
        
        // --- AUTO-SEED FALLBACK ---
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
            $p['max_hp'] = 20 + ($p['level'] * 5) + ($p['tyradex_id'] % 10);
            if ($p['current_hp'] > $p['max_hp']) $p['current_hp'] = $p['max_hp'];
            $p['sprite_url'] = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{$p['tyradex_id']}.png";
            $p['name'] = $p['nickname'] ?: "Pokemon #{$p['tyradex_id']}";
            $p['is_team'] = (bool)$p['is_team'];
            $p['current_xp'] = (int)$p['current_xp'];
            $p['next_level_xp'] = 100 * $p['level'];
            $p['stats'] = ['atk' => 10 + $p['level'] * 2, 'def' => 10 + $p['level'] * 1.5, 'spe' => 10 + $p['level']];
        }

        ApiResponse::send($pokemons);
    }

    // ==========================================
    // METHODE POST : ACTIONS
    // ==========================================
    elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = $input['action'] ?? '';
        $pokeId = $input['pokemon_id'] ?? '';
        
        if (!$action || !$pokeId) {
            ApiResponse::error('Action ou ID Pokemon manquant');
        }

        // --- FEED ---
        if ($action === 'feed') {
            $xpCost = 100;
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("SELECT global_xp FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $globalXp = $stmt->fetchColumn();

            if ($globalXp < $xpCost) {
                $pdo->rollBack();
                ApiResponse::error('Pas assez d\'XP Global');
            }

            $pdo->prepare("UPDATE users SET global_xp = global_xp - ? WHERE id = ?")->execute([$xpCost, $userId]);
            $pdo->prepare("UPDATE user_pokemon SET current_xp = current_xp + 100 WHERE id = ?")->execute([$pokeId]);
            $stmtP = $pdo->prepare("SELECT level, current_xp FROM user_pokemon WHERE id = ?");
            $stmtP->execute([$pokeId]);
            $pInfo = $stmtP->fetch();
            
            $msg = "XP Gagnée !";
            if ($pInfo && $pInfo['current_xp'] >= $pInfo['level'] * 100) {
                 $pdo->prepare("UPDATE user_pokemon SET level = level + 1, current_xp = 0, current_hp = current_hp + 10 WHERE id = ?")->execute([$pokeId]);
                 $msg = "Niveau Supérieur !";
            }
            $pdo->commit();
            ApiResponse::send(null, true, $msg);
        }
        
        // --- USE ITEM ---
        elseif ($action === 'use_item') {
            $itemId = $input['item_id'];
            
            // Verif Item
            $stmtInv = $pdo->prepare("SELECT i.quantity, it.effect_type, it.value FROM inventory i LEFT JOIN items it ON i.item_id = it.id COLLATE utf8mb4_unicode_ci WHERE i.user_id = ? AND i.item_id = ?");
            $stmtInv->execute([$userId, $itemId]);
            $itemData = $stmtInv->fetch(PDO::FETCH_ASSOC);
            
            if (!$itemData) {
                 // Fallback items sans table definition
                 $stmtRaw = $pdo->prepare("SELECT quantity FROM inventory WHERE user_id = ? AND item_id = ?");
                 $stmtRaw->execute([$userId, $itemId]);
                 $qty = $stmtRaw->fetchColumn();
                 if ($qty) {
                     $type = 'UNKNOWN';
                     if(strpos($itemId, 'heal') !== false) $type = 'HEAL';
                     if(strpos($itemId, 'evo') !== false) $type = 'EVOLUTION';
                     if(strpos($itemId, 'joker') !== false) $type = 'JOKER';
                     $itemData = ['quantity' => $qty, 'effect_type' => $type, 'value' => 20];
                 }
                 else { ApiResponse::error('Objet introuvable'); }
            }

            // Normalisation des types
            if ($itemId === 'evolution') $itemData['effect_type'] = 'EVOLUTION';
            if ($itemId === 'evolution_ultime') $itemData['effect_type'] = 'EVOLUTION_MAX';
            if (strpos($itemId, 'joker') !== false) $itemData['effect_type'] = 'JOKER';

            $allowedEffects = ['HEAL', 'EVOLUTION', 'EVOLUTION_MAX', 'JOKER'];
            if (!in_array($itemData['effect_type'], $allowedEffects)) {
                ApiResponse::error("Objet inutilisable ici !");
            }
            
            if ($itemData['quantity'] < 1) { ApiResponse::error('Stock épuisé'); }
            
            $pdo->beginTransaction();
            if ($itemData['quantity'] == 1) $pdo->prepare("DELETE FROM inventory WHERE user_id = ? AND item_id = ?")->execute([$userId, $itemId]);
            else $pdo->prepare("UPDATE inventory SET quantity = quantity - 1 WHERE user_id = ? AND item_id = ?")->execute([$userId, $itemId]);
            
            $msg = "Objet utilisé.";
            $evolded = false;
            $sequence = [];
            
            if ($itemData['effect_type'] === 'HEAL') {
                 $stmtStats = $pdo->prepare("SELECT level, current_hp, tyradex_id FROM user_pokemon WHERE id = ?");
                 $stmtStats->execute([$pokeId]);
                 $pStats = $stmtStats->fetch();
                 if ($pStats) {
                     $maxHp = 20 + ($pStats['level'] * 5) + ($pStats['tyradex_id'] % 10);
                     $healAmount = $itemData['value'] ?? 20;
                     $pdo->prepare("UPDATE user_pokemon SET current_hp = ? WHERE id = ?")->execute([min($maxHp, $pStats['current_hp'] + $healAmount), $pokeId]);
                     $msg = "PV Restaurés !";
                 }
            }
            elseif ($itemData['effect_type'] === 'JOKER') {
                $msg = "Joker utilisé !";
            }
            elseif (strpos($itemData['effect_type'], 'EVOLUTION') !== false) {
                 $stmtP = $pdo->prepare("SELECT tyradex_id, nickname, level FROM user_pokemon WHERE id = ?");
                 $stmtP->execute([$pokeId]);
                 $pData = $stmtP->fetch();
                 
                 $isMax = ($itemData['effect_type'] === 'EVOLUTION_MAX');
                 $sequence = getEvolutionSequence($pData['tyradex_id'], $isMax);
                 
                 if (!empty($sequence)) {
                     $finalId = end($sequence);
                     $pdo->prepare("UPDATE user_pokemon SET tyradex_id = ? WHERE id = ?")->execute([$finalId, $pokeId]);
                     
                     $nameFr = "Pokemon #$finalId";
                     $newMaxHp = 20 + ($pData['level'] * 5) + ($finalId % 10);
                     
                     if ($isMax) {
                         $pdo->prepare("UPDATE user_pokemon SET level = 100, current_xp = 0, current_hp = ? WHERE id = ?")->execute([$newMaxHp + 500, $pokeId]);
                     } else {
                         $pdo->prepare("UPDATE user_pokemon SET current_hp = ? WHERE id = ?")->execute([$newMaxHp, $pokeId]);
                     }
                     if (strpos($pData['nickname'], 'Pokemon #') !== false || $pData['nickname'] == '') {
                         $pdo->prepare("UPDATE user_pokemon SET nickname = ? WHERE id = ?")->execute([$nameFr, $pokeId]);
                     }

                     $msg = $isMax ? "METAMORPHOSE ULTIME !" : "Évolution réussie !";
                     $evolded = true;
                     array_unshift($sequence, (int)$pData['tyradex_id']);
                 } else {
                     $msg = "Ce Pokémon ne peut plus évoluer.";
                 }
            }
            $pdo->commit();
            
            // Format de réponse spécifique pour l'évolution
            $response = ['evolution' => $evolded, 'sequence' => $evolded ? $sequence : null];
            ApiResponse::send($response, true, $msg);
        }

        // --- TOGGLE TEAM ---
        elseif ($action === 'toggle_team') {
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM user_pokemon WHERE user_id = ? AND is_team = 1");
            $stmt->execute([$userId]);
            $count = $stmt->fetchColumn();
            
            $stmtP = $pdo->prepare("SELECT is_team FROM user_pokemon WHERE id = ?");
            $stmtP->execute([$pokeId]);
            $isTeam = $stmtP->fetchColumn();
            
            if (!$isTeam && $count >= 3) { ApiResponse::error('Équipe complète'); }
            
            $pdo->prepare("UPDATE user_pokemon SET is_team = ? WHERE id = ?")->execute([$isTeam ? 0 : 1, $pokeId]);
            ApiResponse::send(null, true, $isTeam ? 'Mis en réserve' : 'Rejoint l\'équipe');
        }
        
        // --- CAPTURE WILD ---
        elseif ($action === 'capture_wild') {
            $tyradexId = (int)($input['tyradex_id'] ?? 0);
            $level = (int)($input['level'] ?? 5);
            $name = $input['name'] ?? "Pokemon #$tyradexId";
            
            if ($tyradexId <= 0) {
                ApiResponse::error('ID Pokémon invalide');
            }
            
            $hp = 20 + ($level * 5) + ($tyradexId % 10);
            $uuid = uniqid('captured_', true);
            
            $pdo->prepare("INSERT INTO user_pokemon (id, user_id, tyradex_id, nickname, level, current_hp, current_xp, is_team) VALUES (?, ?, ?, ?, ?, ?, 0, 0)")
                ->execute([$uuid, $userId, $tyradexId, $name, $level, $hp]);
            
            ApiResponse::send(['pokemon_id' => $uuid], true, 'Pokémon capturé avec succès !');
        }
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    ApiResponse::error('Erreur: ' . $e->getMessage(), 500);
}
?>