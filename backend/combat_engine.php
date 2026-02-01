
<?php
require_once 'db_connect.php';

$input = json_decode(file_get_contents('php://input'), true);

// Inputs
$isCorrect   = $input['is_correct'] ?? false;
$attackerLvl = $input['attacker_level'] ?? 1;
$attackerType= strtoupper($input['attacker_type'] ?? 'NORMAL'); // FIRE, WATER, PLANT
$enemyType   = strtoupper($input['enemy_type'] ?? 'NORMAL');

// Constants
// Base 25 dégâts (vs environ 70-80 PV pour un ennemi -> ~3 coups)
$BASE_DMG = 25;

// Type Chart Logic (Simplified)
// FEU > NATURE (PLANTE/INSECTE)
// NATURE > EAU
// EAU > FEU
function getTypeMultiplier($atk, $def) {
    // Map broader types to Core 3
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
    'effectiveness' => 'NORMAL', // WEAK, NORMAL, SUPER
    'message' => ''
];

if ($isCorrect) {
    $mult = getTypeMultiplier($attackerType, $enemyType);
    
    // Formula: (Base * (1 + Lvl/10)) * Mult
    // Scaling ralenti : on divise par 10 au lieu de 5 pour lisser la courbe de puissance
    $levelFactor = 1 + ($attackerLvl / 10); 
    
    $rawDmg = $BASE_DMG * $levelFactor;
    $finalDmg = ceil($rawDmg * $mult);

    $response['hit'] = true;
    $response['damage'] = $finalDmg;
    
    if ($mult > 1.0) {
        $response['effectiveness'] = 'SUPER';
        $response['message'] = "C'est super efficace !";
    } elseif ($mult < 1.0) {
        $response['effectiveness'] = 'WEAK';
        $response['message'] = "Ce n'est pas très efficace...";
    } else {
        $response['message'] = "Touché !";
    }

} else {
    $response['hit'] = false;
    $response['message'] = "L'attaque a échoué...";
}

echo json_encode($response);
?>
