<?php
// backend/tests/test_suite.php
// SUITE DE TESTS COMPLÈTE (INTEGRATION TESTING)

// Configuration
$baseUrl = "http://" . $_SERVER['HTTP_HOST'] . dirname(dirname($_SERVER['SCRIPT_NAME']));
// Nettoyage URL si lancée depuis un sous-dossier tests/
$baseUrl = str_replace('/tests', '', $baseUrl);

$testUser = 'test_runner_' . rand(1000, 9999);
$testPass = 'password123';
$token = '';
$userId = 0;
$userPokemonId = '';

echo "<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'><title>Poke-Edu Test Suite</title>";
echo "<style>body{background:#111;color:#eee;font-family:monospace;padding:20px;line-height:1.5} .pass{color:#4ade80} .fail{color:#f87171} .info{color:#60a5fa} h2{border-bottom:1px solid #333;padding-bottom:5px;margin-top:20px}</style>";
echo "</head><body>";
echo "<h1>🚀 POKE-EDU TEST SUITE V1.0</h1>";
echo "<p class='info'>Target API: $baseUrl</p>";

function callAPI($method, $endpoint, $data = [], $authToken = null) {
    global $baseUrl;
    $url = $baseUrl . $endpoint;
    $ch = curl_init($url);
    
    $headers = ['Content-Type: application/json'];
    if ($authToken) $headers[] = "Authorization: Bearer $authToken";
    
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return ['code' => $httpCode, 'body' => json_decode($response, true), 'raw' => $response];
}

function assertStep($name, $condition, $details = '') {
    if ($condition) {
        echo "<div class='pass'>[PASS] $name</div>";
    } else {
        echo "<div class='fail'>[FAIL] $name - $details</div>";
        // On n'arrête pas le script pour voir les autres erreurs potentielles
    }
    flush();
}

// ----------------------------------------------------
// 1. AUTHENTIFICATION
// ----------------------------------------------------
echo "<h2>1. AUTHENTIFICATION</h2>";

// Register
$resReg = callAPI('POST', '/auth.php', ['action' => 'register', 'username' => $testUser, 'password' => $testPass, 'grade_level' => 'CM1']);
assertStep("Inscription User ($testUser)", $resReg['code'] == 200 && ($resReg['body']['success'] ?? false), json_encode($resReg['body']));

if (!empty($resReg['body']['token'])) {
    $token = $resReg['body']['token'];
    $userId = $resReg['body']['user']['id'];
} else {
    // Try Login if register failed (maybe user exists)
    $resLogin = callAPI('POST', '/auth.php', ['action' => 'login', 'username' => $testUser, 'password' => $testPass]);
    if (!empty($resLogin['body']['token'])) {
        $token = $resLogin['body']['token'];
        $userId = $resLogin['body']['user']['id'];
        assertStep("Login Fallback", true, "Utilisateur existant connecté");
    } else {
        die("<div class='fail'>CRITICAL: Impossible d'obtenir un token. Arrêt des tests.</div>");
    }
}
assertStep("Token JWT reçu", !empty($token));

// ----------------------------------------------------
// 2. CONFIGURATION & QUESTIONS
// ----------------------------------------------------
echo "<h2>2. GAME DATA</h2>";

// Update Config
$resConf = callAPI('POST', '/update_config.php', ['grade_level' => '5EME', 'active_subjects' => ['MATHS', 'ANGLAIS']], $token);
assertStep("Update Configuration", $resConf['body']['success'] ?? false, $resConf['raw']);

// Get Question
$resQ = callAPI('GET', '/get_question.php', [], $token);
assertStep("Fetch Question", !empty($resQ['body']['data']['question_text']), "ID: " . ($resQ['body']['data']['id'] ?? 'N/A'));

// ----------------------------------------------------
// 3. COMBAT ENGINE
// ----------------------------------------------------
echo "<h2>3. COMBAT ENGINE</h2>";

$resCombat = callAPI('POST', '/combat_engine.php', [
    'is_correct' => true,
    'attacker_type' => 'FIRE',
    'enemy_type' => 'PLANTE',
    'attacker_level' => 5
], $token);

assertStep("Damage Calculation", ($resCombat['body']['damage'] ?? 0) > 0, "Dmg: " . ($resCombat['body']['damage'] ?? 0));
assertStep("Type Effectiveness", ($resCombat['body']['effectiveness'] ?? '') === 'SUPER');

// Rewards
$resRew = callAPI('POST', '/battle_rewards.php', ['xp' => 500, 'gold' => 1000, 'item_drop' => 'heal_r1'], $token);
assertStep("Claim Rewards", $resRew['body']['success'] ?? false);

// ----------------------------------------------------
// 4. COLLECTION & INVENTORY
// ----------------------------------------------------
echo "<h2>4. COLLECTION & INVENTORY</h2>";

// Get Collection
$resCol = callAPI('GET', '/collection.php', [], $token);
$pokemons = $resCol['body']['data'] ?? [];
assertStep("Fetch Pokemon Team", count($pokemons) > 0);

if (count($pokemons) > 0) {
    $userPokemonId = $pokemons[0]['id'];
    // Toggle Team
    $resTog = callAPI('POST', '/collection.php', ['action' => 'toggle_team', 'pokemon_id' => $userPokemonId], $token);
    assertStep("Toggle Team Status", $resTog['body']['success'] ?? false);
}

// Get Inventory (via shop endpoint)
$resInv = callAPI('GET', '/shop.php?action=list_items', [], $token);
$items = $resInv['body']['data'] ?? [];
$hasPotion = false;
foreach($items as $i) {
    if ($i['id'] === 'heal_r1' && $i['quantity'] > 0) $hasPotion = true;
}
assertStep("Check Inventory (Potion)", $hasPotion);

// ----------------------------------------------------
// 5. SHOP & WHEEL
// ----------------------------------------------------
echo "<h2>5. SHOP & WHEEL</h2>";

// Spin Wheel
$resSpin = callAPI('POST', '/spin.php', ['bet' => 1], $token);
assertStep("Spin Wheel", $resSpin['body']['success'] ?? false, "Result: " . ($resSpin['body']['reward_text'] ?? 'Err'));

// Buy Item
$resBuy = callAPI('POST', '/shop.php?action=buy_item', ['item_id' => 'heal_r1'], $token);
assertStep("Buy Item", $resBuy['body']['success'] ?? false);

// Use Item (Si on a un pokemon et une potion)
if ($userPokemonId) {
    $resUse = callAPI('POST', '/collection.php', ['action' => 'use_item', 'pokemon_id' => $userPokemonId, 'item_id' => 'heal_r1'], $token);
    assertStep("Use Potion", $resUse['body']['success'] ?? false, $resUse['body']['message'] ?? '');
}

echo "<hr><h3>🎉 SUITE DE TESTS TERMINÉE</h3>";
echo "<p>Si tout est vert, le backend est opérationnel à 100%.</p>";
echo "</body></html>";
?>