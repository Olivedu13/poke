<?php
require_once 'db_connect.php';

$input = json_decode(file_get_contents('php://input'), true);

// Inputs
$isCorrect   = $input['is_correct'] ?? false;
$attackerLvl = $input['attacker_level'] ?? 1;
$attackerType= strtoupper($input['attacker_type'] ?? 'NORMAL');
$enemyType   = strtoupper($input['enemy_type'] ?? 'NORMAL');
$combo       = isset($input['combo']) ? (int)$input['combo'] : 0;
$isUltimate  = isset($input['is_ultimate']) ? (bool)$input['is_ultimate'] : false;

// Constants
// NERF: Passage de 25 à 12 pour éviter le "One Shot" et forcer 4-5 questions
$BASE_DMG = 12;

function getTypeMultiplier($atk, $def) {
    $atkCore = mapType($atk);
    $defCore = mapType($def);

    if ($atkCore == 'FIRE' && $defCore == 'NATURE') return 1.5;
    if ($atkCore == 'NATURE' && $defCore == 'WATER') return 1.5;
    if ($atkCore == 'WATER' && $defCore == 'FIRE') return 1.5;
    
    if ($atkCore == 'FIRE' && $defCore == 'WATER') return 0.5;
    if ($atkCore == 'NATURE' && $defCore == 'FIRE') return 0.5;
    if ($atkCore == 'WATER' && $defCore == 'NATURE') return 0.5;

    return 1.0;
}

function mapType($t) {
    if (in_array($t, ['FEU', 'FIRE', 'DRAGON', 'COMBAT'])) return 'FIRE';
    if (in_array($t, ['EAU', 'WATER', 'GLACE', 'ICE', 'VOL', 'FLYING'])) return 'WATER';
    if (in_array($t, ['PLANTE', 'GRASS', 'INSECTE', 'BUG', 'SOL', 'GROUND'])) return 'NATURE';
    return 'NORMAL';
}

$response = [
    'hit' => false,
    'damage' => 0,
    'effectiveness' => 'NORMAL',
    'message' => ''
];

// Si c'est un ULTIME, on touche d'office avec gros dégâts
if ($isUltimate) {
    $isCorrect = true;
    $combo = 10; // Boost artificiel pour l'ultime
}

if ($isCorrect) {
    $mult = getTypeMultiplier($attackerType, $enemyType);
    $levelFactor = 1 + ($attackerLvl / 10); 
    
    // Combo Bonus: +10% par combo
    $comboBonus = 1 + ($combo * 0.1);
    
    // Ultimate Bonus: x2.5 flat
    $ultBonus = $isUltimate ? 2.5 : 1.0;

    $rawDmg = $BASE_DMG * $levelFactor * $comboBonus * $ultBonus;
    $finalDmg = ceil($rawDmg * $mult);

    $response['hit'] = true;
    $response['damage'] = $finalDmg;
    
    if ($isUltimate) {
        $response['effectiveness'] = 'CRITICAL';
        $response['message'] = "FRAPPE ULTIME DÉVASTATRICE !";
    } elseif ($mult > 1.0) {
        $response['effectiveness'] = 'SUPER';
        $response['message'] = "C'est super efficace !";
    } elseif ($mult < 1.0) {
        $response['effectiveness'] = 'WEAK';
        $response['message'] = "Ce n'est pas très efficace...";
    } else {
        $response['message'] = "Touché !";
    }
    
    // Ajout info combo dans le message
    if ($combo > 1 && !$isUltimate) {
        $response['message'] .= " (Combo x$combo)";
    }

} else {
    $response['hit'] = false;
    $response['message'] = "L'attaque a échoué...";
}

echo json_encode($response);
?>