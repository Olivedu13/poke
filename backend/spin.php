<?php
require_once 'protected_setup.php'; // Auth V3 (Définit $userId et $input)

$bet = isset($input['bet']) ? (int)$input['bet'] : 1;

// --- 1. VERIFICATION SOLDE ---
$stmt = $pdo->prepare("SELECT tokens, gold, global_xp FROM users WHERE id = ?");
$stmt->execute([$userId]);
$user = $stmt->fetch();

if ($user['tokens'] < $bet) {
    echo json_encode(['success'=>false, 'message'=>'Pas assez de jetons']);
    exit;
}

// --- 2. CONFIGURATION DES TIERS (POOLS) ---
$tier = [];
if ($bet === 1) {
    $tier = ['items' => ['heal_r1', 'atk_r1', 'def_r1'], 'gold_min' => 50, 'gold_max' => 200, 'xp_val' => 100, 'poke_min' => 10, 'poke_max' => 50];
} elseif ($bet === 5) {
    $tier = ['items' => ['heal_r3', 'atk_r3', 'xp_pack', 'joker'], 'gold_min' => 250, 'gold_max' => 600, 'xp_val' => 500, 'poke_min' => 1, 'poke_max' => 100];
} else { 
    $tier = ['items' => ['heal_r5', 'masterball', 'mirror_r5', 'team_r5'], 'gold_min' => 1000, 'gold_max' => 5000, 'xp_val' => 2000, 'poke_min' => 100, 'poke_max' => 151];
}

function getRandomPokeId($min, $max, $exclude = []) {
    $id = rand($min, $max);
    while (in_array($id, $exclude)) $id = rand($min, $max);
    return $id;
}
function getPokeImg($id) { return "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/$id.png"; }

// --- 3. GENERATION DES SEGMENTS ---
$segments = [];
$pId1 = getRandomPokeId($tier['poke_min'], $tier['poke_max']);
$segments[0] = ['type' => 'POKEMON', 'id' => $pId1, 'label' => 'POKEMON', 'img' => getPokeImg($pId1), 'color' => '#ef4444'];
$g1 = $tier['gold_min'];
$segments[1] = ['type' => 'GOLD', 'value' => $g1, 'label' => "$g1 OR", 'color' => '#eab308'];
$iId1 = $tier['items'][array_rand($tier['items'])];
$segments[2] = ['type' => 'ITEM', 'id' => $iId1, 'label' => 'OBJET', 'color' => '#a855f7'];
$xp = $tier['xp_val'];
$segments[3] = ['type' => 'XP', 'value' => $xp, 'label' => "$xp XP", 'color' => '#3b82f6'];
$pId2 = getRandomPokeId($tier['poke_min'], $tier['poke_max'], [$pId1]);
$segments[4] = ['type' => 'POKEMON', 'id' => $pId2, 'label' => 'POKEMON', 'img' => getPokeImg($pId2), 'color' => '#ef4444'];
$g2 = floor(($tier['gold_min'] + $tier['gold_max']) / 2);
$segments[5] = ['type' => 'GOLD', 'value' => $g2, 'label' => "$g2 OR", 'color' => '#eab308'];
$iId2 = $tier['items'][array_rand($tier['items'])];
$segments[6] = ['type' => 'ITEM', 'id' => $iId2, 'label' => 'OBJET', 'color' => '#a855f7'];
$g3 = $tier['gold_max'];
$segments[7] = ['type' => 'GOLD', 'value' => $g3, 'label' => "JACKPOT", 'color' => '#10b981'];

// --- 4. CHOIX DU GAGNANT ---
$weights = [0 => 10, 1 => 20, 2 => 15, 3 => 15, 4 => 5, 5 => 20, 6 => 10, 7 => 5];
$rand = rand(1, 100);
$sum = 0; $winningIndex = 1;
foreach ($weights as $idx => $w) {
    $sum += $w;
    if ($rand <= $sum) { $winningIndex = $idx; break; }
}
$winSegment = $segments[$winningIndex];

// --- 5. EXECUTION DB ---
$pdo->beginTransaction();
$pdo->prepare("UPDATE users SET tokens = tokens - ? WHERE id = ?")->execute([$bet, $userId]);

$rewardLog = "";
if ($winSegment['type'] === 'GOLD') {
    $pdo->prepare("UPDATE users SET gold = gold + ? WHERE id = ?")->execute([$winSegment['value'], $userId]);
    $rewardLog = $winSegment['value'] . " Or";
} 
elseif ($winSegment['type'] === 'XP') {
    $pdo->prepare("UPDATE users SET global_xp = global_xp + ? WHERE id = ?")->execute([$winSegment['value'], $userId]);
    $rewardLog = $winSegment['value'] . " XP";
}
elseif ($winSegment['type'] === 'ITEM') {
    $pdo->prepare("INSERT INTO inventory (user_id, item_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?")->execute([$userId, $winSegment['id'], 1, 1]);
    $rewardLog = "Objet";
}
elseif ($winSegment['type'] === 'POKEMON') {
    $uuid = uniqid('wheel_', true);
    $tyraId = $winSegment['id'];
    $name = "Pokemon #$tyraId"; 
    $hp = 50 + ($bet * 10);
    $pdo->prepare("INSERT INTO user_pokemon (id, user_id, tyradex_id, nickname, level, current_hp) VALUES (?, ?, ?, ?, 5, ?)")->execute([$uuid, $userId, $tyraId, $name, $hp]);
    $rewardLog = "Pokemon";
}
$pdo->commit();

echo json_encode([
    'success' => true,
    'new_tokens' => $user['tokens'] - $bet,
    'segments' => $segments,
    'result_index' => $winningIndex,
    'reward_text' => $rewardLog
]);
?>