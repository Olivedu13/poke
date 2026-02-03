<?php
require_once 'protected_setup.php'; // Auth V3 (Définit $userId et $input)
require_once 'api_response.php';

ini_set('memory_limit', '256M'); 
set_time_limit(60);
ini_set('display_errors', 0);

$action = $_GET['action'] ?? $input['action'] ?? 'list_items';

// Helper cURL pour Tyradex
function fetchUrl($url) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_TIMEOUT, 8); // Un peu plus long pour le gros JSON
    curl_setopt($ch, CURLOPT_USERAGENT, 'PokeEdu-Backend/1.0');
    // curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // A activer seulement si erreur SSL
    $data = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ($httpCode === 200) ? $data : false;
}

function calculatePriceAndRarity($stats) {
    if (!is_array($stats)) return ['price' => 500, 'rarity' => 'COMMUN'];
    $total = array_sum($stats);
    if ($total < 350) return ['price' => 500, 'rarity' => 'COMMUN'];
    if ($total < 450) return ['price' => 1500, 'rarity' => 'PEU COMMUN'];
    if ($total < 550) return ['price' => 4000, 'rarity' => 'RARE'];
    if ($total < 600) return ['price' => 9000, 'rarity' => 'ÉPIQUE'];
    return ['price' => 25000, 'rarity' => 'LÉGENDAIRE'];
}

// CATALOGUE ITEMS (Cache BDD)
$catalogItems = [];
try {
    $stmt = $pdo->query("SELECT * FROM items");
    $dbItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($dbItems as $item) {
        $catalogItems[$item['id']] = $item;
    }
} catch (Exception $e) {}

try {
    // --- LISTING INVENTAIRE + ITEMS ---
    if ($action === 'list_items') {
        $inventory = [];
        try {
            $stmt = $pdo->prepare("SELECT item_id, quantity FROM inventory WHERE user_id = ?");
            $stmt->execute([$userId]);
            $inventory = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        } catch (Exception $e) {}

        $result = [];
        foreach ($catalogItems as $id => $item) {
            $qty = $inventory[$id] ?? 0;
            $item['stock'] = $qty; // Legacy
            $item['quantity'] = $qty; // Front V3
            $result[] = $item;
        }
        ApiResponse::send(array_values($result));
    }
    
    // --- LISTING POKEMONS (PROXY API) ---
    elseif ($action === 'fetch_external_pokemons') {
        $fallbackData = [
            ['pokedexId'=>1,'name'=>['fr'=>'Bulbizarre'],'sprites'=>['regular'=>'https://raw.githubusercontent.com/Yarkis01/TyraDex/images/pokemon/1.png'],'stats'=>['hp'=>45,'atk'=>49,'def'=>49,'spe_atk'=>65,'spe_def'=>65,'vit'=>45]],
            ['pokedexId'=>4,'name'=>['fr'=>'Salamèche'],'sprites'=>['regular'=>'https://raw.githubusercontent.com/Yarkis01/TyraDex/images/pokemon/4.png'],'stats'=>['hp'=>39,'atk'=>52,'def'=>43,'spe_atk'=>60,'spe_def'=>50,'vit'=>65]],
            ['pokedexId'=>7,'name'=>['fr'=>'Carapuce'],'sprites'=>['regular'=>'https://raw.githubusercontent.com/Yarkis01/TyraDex/images/pokemon/7.png'],'stats'=>['hp'=>44,'atk'=>48,'def'=>65,'spe_atk'=>50,'spe_def'=>64,'vit'=>43]],
            ['pokedexId'=>25,'name'=>['fr'=>'Pikachu'],'sprites'=>['regular'=>'https://raw.githubusercontent.com/Yarkis01/TyraDex/images/pokemon/25.png'],'stats'=>['hp'=>35,'atk'=>55,'def'=>40,'spe_atk'=>50,'spe_def'=>50,'vit'=>90]],
        ];
        
        $url = "https://tyradex.app/api/v1/gen/1";
        $data = null;
        try {
            // Utilisation de cURL au lieu de file_get_contents
            $response = fetchUrl($url);
            if ($response) $data = json_decode($response, true);
        } catch (Exception $e) {}
        
        if (!$data || !is_array($data)) $data = $fallbackData;

        // Compte des possessions
        $ownedCounts = [];
        try {
            $stmt = $pdo->prepare("SELECT tyradex_id, COUNT(*) as count FROM user_pokemon WHERE user_id = ? GROUP BY tyradex_id");
            $stmt->execute([$userId]);
            $ownedCounts = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        } catch (Exception $e) {}

        $formatted = [];
        foreach ($data as $p) {
            $pId = $p['pokedexId'] ?? $p['pokedex_id'] ?? 0;
            if ($pId <= 0 || $pId > 151) continue;
            
            $nameFr = $p['name']['fr'] ?? ($p['name'] ?? "Pokemon #$pId");
            $rawStats = $p['stats'] ?? [];
            $safeStats = [
                'hp' => $rawStats['hp'] ?? 10, 'atk' => $rawStats['atk'] ?? 10, 'def' => $rawStats['def'] ?? 10,
                'spe_atk' => $rawStats['spe_atk'] ?? 10, 'spe_def' => $rawStats['spe_def'] ?? 10, 'vit' => $rawStats['vit'] ?? 10
            ];
            $meta = calculatePriceAndRarity($safeStats);
            $cleanTypes = [];
            if (isset($p['types']) && is_array($p['types'])) {
                foreach($p['types'] as $t) $cleanTypes[] = ['name' => $t['name'] ?? 'Normal'];
            }
            if (empty($cleanTypes)) $cleanTypes[] = ['name' => 'Normal'];

            $formatted[] = [
                'id' => (string)$pId,
                'pokedexId' => $pId, 
                'name' => ['fr' => $nameFr],
                'types' => $cleanTypes,
                'sprites' => ['regular' => $p['sprites']['regular'] ?? ''],
                'stats' => $safeStats,
                'computedPrice' => $meta['price'],
                'rarityLabel' => $meta['rarity'],
                'ownedCount' => $ownedCounts[$pId] ?? 0
            ];
        }
        ApiResponse::send($formatted);
    }
    
    // --- ACHAT OBJET ---
    elseif ($action === 'buy_item') {
        $itemId = $input['item_id'] ?? '';
        
        if (!isset($catalogItems[$itemId])) throw new Exception('Item inconnu ou indisponible');
        
        $item = $catalogItems[$itemId];
        
        handleTransaction($pdo, $userId, $item['price'], function($pdo, $uid) use ($itemId, $item) {
            if ($item['effect_type'] === 'TOKEN_PACK') {
                $pdo->prepare("UPDATE users SET tokens = tokens + ? WHERE id = ?")->execute([$item['value'], $uid]);
            } elseif ($item['effect_type'] === 'XP_BOOST') {
                $pdo->prepare("UPDATE users SET global_xp = global_xp + ? WHERE id = ?")->execute([$item['value'], $uid]);
            } else {
                $pdo->prepare("INSERT INTO inventory (user_id, item_id, quantity) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE quantity = quantity + 1")->execute([$uid, $itemId]);
            }
        });
    }
    
    // --- ACHAT POKEMON ---
    elseif ($action === 'buy_pokemon') {
        $tyradexId = $input['pokemon_id'] ?? 0; 
        $cost = $input['price'] ?? 500; 

        if (!$tyradexId) throw new Exception('ID Pokemon manquant');
        
        handleTransaction($pdo, $userId, $cost, function($pdo, $uid) use ($tyradexId) {
            $uuid = uniqid('poke_', true);
            $name = "Pokemon #$tyradexId";
            $pdo->prepare("INSERT INTO user_pokemon (id, user_id, tyradex_id, nickname, level, current_hp) VALUES (?, ?, ?, ?, 5, 100)")
                ->execute([$uuid, $uid, $tyradexId, $name]);
        });
    }
    
    // --- VENTE OBJET ---
    elseif ($action === 'sell_item') {
        $itemId = $input['item_id'];
        if (!isset($catalogItems[$itemId])) throw new Exception('Item inconnu');
        
        $item = $catalogItems[$itemId];
        $sellPrice = floor($item['price'] * 0.5);
        
        $stmt = $pdo->prepare("SELECT quantity FROM inventory WHERE user_id = ? AND item_id = ?");
        $stmt->execute([$userId, $itemId]);
        $qty = $stmt->fetchColumn();
        
        if ($qty < 1) throw new Exception('Pas de stock');
        
        $pdo->beginTransaction();
        $pdo->prepare("UPDATE users SET gold = gold + ? WHERE id = ?")->execute([$sellPrice, $userId]);
        if ($qty == 1) {
            $pdo->prepare("DELETE FROM inventory WHERE user_id = ? AND item_id = ?")->execute([$userId, $itemId]);
        } else {
            $pdo->prepare("UPDATE inventory SET quantity = quantity - 1 WHERE user_id = ? AND item_id = ?")->execute([$userId, $itemId]);
        }
        $pdo->commit();
        ApiResponse::send(null, true, "Vendu +$sellPrice crédits");
    }
    
    // --- VENTE POKEMON ---
    elseif ($action === 'sell_pokemon') {
        $pokeTyraId = $input['pokemon_id'];
        $sellPrice = 500; 
        
        $stmt = $pdo->prepare("SELECT id FROM user_pokemon WHERE user_id = ? AND tyradex_id = ? LIMIT 1");
        $stmt->execute([$userId, $pokeTyraId]);
        $instanceId = $stmt->fetchColumn();
        
        if (!$instanceId) throw new Exception("Non possédé");
        
        $pdo->beginTransaction();
        $pdo->prepare("UPDATE users SET gold = gold + ? WHERE id = ?")->execute([$sellPrice, $userId]);
        $pdo->prepare("DELETE FROM user_pokemon WHERE id = ?")->execute([$instanceId]);
        $pdo->commit();
        ApiResponse::send(null, true, "Pokémon vendu +$sellPrice crédits");
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    ApiResponse::error($e->getMessage());
}

function handleTransaction($pdo, $userId, $cost, $callback) {
    $stmt = $pdo->prepare("SELECT gold FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $gold = $stmt->fetchColumn();
    
    if ($gold === false) throw new Exception("Utilisateur introuvable");
    if ($gold < $cost) throw new Exception('Crédits insuffisants');
    
    $pdo->beginTransaction();
    $pdo->prepare("UPDATE users SET gold = gold - ? WHERE id = ?")->execute([$cost, $userId]);
    $callback($pdo, $userId);
    $pdo->commit();
    ApiResponse::send(null, true, 'Transaction réussie !');
}
?>