<?php
require_once 'db_connect.php';

$input = json_decode(file_get_contents('php://input'), true);
$userId = $input['user_id'] ?? null;
$bet = isset($input['bet']) ? (int)$input['bet'] : 1;

if (!$userId) { echo json_encode(['success'=>false, 'message'=>'User ID required']); exit; }

// --- 1. VERIFICATION SOLDE ---
$stmt = $pdo->prepare("SELECT tokens, gold, global_xp FROM users WHERE id = ?");
$stmt->execute([$userId]);
$user = $stmt->fetch();

if ($user['tokens'] < $bet) {
    echo json_encode(['success'=>false, 'message'=>'Pas assez de jetons']);
    exit;
}

// --- 2. CONFIGURATION DES TIERS (POOLS) ---
// Pools selon la mise
// On ne définit plus de liste de Pokémon fixe pour avoir plus de variété.
// On définit juste les ITEMS et l'OR/XP.

$tier = [];

if ($bet === 1) {
    $tier = [
        'items' => ['heal_r1', 'atk_r1', 'def_r1'],
        'gold_min' => 50, 'gold_max' => 200,
        'xp_val' => 100,
        // Gen 1 range for random pick
        'poke_min' => 10, 'poke_max' => 50 // Commons (Rattata, Pidgey...)
    ];
} elseif ($bet === 5) {
    $tier = [
        'items' => ['heal_r3', 'atk_r3', 'xp_pack', 'joker'],
        'gold_min' => 250, 'gold_max' => 600,
        'xp_val' => 500,
        'poke_min' => 1, 'poke_max' => 100 // Include starters etc
    ];
} else { // 10
    $tier = [
        'items' => ['heal_r5', 'masterball', 'mirror_r5', 'team_r5'],
        'gold_min' => 1000, 'gold_max' => 5000,
        'xp_val' => 2000,
        'poke_min' => 100, 'poke_max' => 151 // Rares & Legendaries
    ];
}

// Function to get a random Pokemon ID avoiding duplicates
function getRandomPokeId($min, $max, $exclude = []) {
    $id = rand($min, $max);
    while (in_array($id, $exclude)) {
        $id = rand($min, $max);
    }
    return $id;
}

// Helper pour image Pokemon (Frontend will use this)
function getPokeImg($id) { return "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/$id.png"; }

// --- 3. GENERATION DES 8 SEGMENTS DE LA ROUE ---
// Structure: [POKEMON, GOLD, ITEM, XP, POKEMON, GOLD, ITEM, GOLD/JACKPOT]
$segments = [];

// Slot 0: Pokemon A
$pId1 = getRandomPokeId($tier['poke_min'], $tier['poke_max']);
$segments[0] = ['type' => 'POKEMON', 'id' => $pId1, 'label' => 'POKEMON', 'img' => getPokeImg($pId1), 'color' => '#ef4444'];

// Slot 1: Gold Low
$g1 = $tier['gold_min'];
$segments[1] = ['type' => 'GOLD', 'value' => $g1, 'label' => "$g1 OR", 'color' => '#eab308'];

// Slot 2: Item A
$iId1 = $tier['items'][array_rand($tier['items'])];
$segments[2] = ['type' => 'ITEM', 'id' => $iId1, 'label' => 'OBJET', 'color' => '#a855f7'];

// Slot 3: XP
$xp = $tier['xp_val'];
$segments[3] = ['type' => 'XP', 'value' => $xp, 'label' => "$xp XP", 'color' => '#3b82f6'];

// Slot 4: Pokemon B (Different from A)
$pId2 = getRandomPokeId($tier['poke_min'], $tier['poke_max'], [$pId1]);
$segments[4] = ['type' => 'POKEMON', 'id' => $pId2, 'label' => 'POKEMON', 'img' => getPokeImg($pId2), 'color' => '#ef4444'];

// Slot 5: Gold Mid
$g2 = floor(($tier['gold_min'] + $tier['gold_max']) / 2);
$segments[5] = ['type' => 'GOLD', 'value' => $g2, 'label' => "$g2 OR", 'color' => '#eab308'];

// Slot 6: Item B
$iId2 = $tier['items'][array_rand($tier['items'])];
$segments[6] = ['type' => 'ITEM', 'id' => $iId2, 'label' => 'OBJET', 'color' => '#a855f7'];

// Slot 7: JACKPOT (Gold Max or High Tier Item)
$g3 = $tier['gold_max'];
$segments[7] = ['type' => 'GOLD', 'value' => $g3, 'label' => "JACKPOT", 'color' => '#10b981'];


// --- 4. CHOIX DU GAGNANT (Weighted) ---
// Index 0-7.
// On favorise Gold/XP (Index 1,3,5,7) légèrement sur les Pokemon/Items pour l'économie, sauf en mise 10
$weights = [
    0 => 10, // Pokemon A
    1 => 20, // Gold
    2 => 15, // Item
    3 => 15, // XP
    4 => 5,  // Pokemon B (Plus rare)
    5 => 20, // Gold Mid
    6 => 10, // Item
    7 => 5   // Jackpot
];

$rand = rand(1, 100);
$sum = 0;
$winningIndex = 1;

foreach ($weights as $idx => $w) {
    $sum += $w;
    if ($rand <= $sum) {
        $winningIndex = $idx;
        break;
    }
}

$winSegment = $segments[$winningIndex];

// --- 5. EXECUTION DB ---
$pdo->beginTransaction();

// Paiement
$pdo->prepare("UPDATE users SET tokens = tokens - ? WHERE id = ?")->execute([$bet, $userId]);

// Gain
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
    $stmt = $pdo->prepare("INSERT INTO inventory (user_id, item_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?");
    $stmt->execute([$userId, $winSegment['id'], 1, 1]);
    $rewardLog = "Objet";
}
elseif ($winSegment['type'] === 'POKEMON') {
    // Generate UUID and insert
    $uuid = uniqid('wheel_', true);
    
    // Use the exact ID from the winning segment to ensure the prize matches the image
    $tyraId = $winSegment['id'];
    $name = "Pokemon #$tyraId"; // Placeholder, front will handle correct name via ID
    $hp = 50 + ($bet * 10);
    
    $pdo->prepare("INSERT INTO user_pokemon (id, user_id, tyradex_id, nickname, level, current_hp) VALUES (?, ?, ?, ?, 5, ?)")
        ->execute([$uuid, $userId, $tyraId, $name, $hp]);
    
    $rewardLog = "Pokemon";
}

$pdo->commit();

// --- 6. REPONSE ---
echo json_encode([
    'success' => true,
    'new_tokens' => $user['tokens'] - $bet,
    'segments' => $segments,
    'result_index' => $winningIndex,
    'reward_text' => $rewardLog
]);
