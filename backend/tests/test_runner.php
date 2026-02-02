
<?php
// backend/tests/test_runner.php
// Ce script permet de tester le backend sur un serveur mutualisé sans accès SSH/Composer.

ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "<html><body style='background:#111; color:#eee; font-family:monospace; padding:20px;'>";
echo "<h1>🛡️ Poke-Edu Self-Diagnostic Tool (V3)</h1>";

function assertTest($condition, $name) {
    if ($condition) {
        echo "<div style='color:#4ade80; margin-bottom:5px;'>[PASS] $name</div>";
        return true;
    } else {
        echo "<div style='color:#f87171; margin-bottom:5px;'>[FAIL] $name</div>";
        return false;
    }
}

// 1. DATABASE CONNECT
echo "<h3>1. Database Connectivity</h3>";
require_once '../db_connect.php'; // inclut aussi cors.php
assertTest(isset($pdo), "PDO Object Created");
try {
    $stmt = $pdo->query("SELECT 1");
    assertTest($stmt !== false, "Simple SELECT 1 Query");
} catch (Exception $e) {
    assertTest(false, "DB Connection: " . $e->getMessage());
}

// 2. JWT UTILS
echo "<h3>2. JWT Security System</h3>";
require_once '../jwt_utils.php';
$testUserId = 99999;
$token = generate_jwt($testUserId);
assertTest(!empty($token), "Token Generation");
$decodedId = verify_jwt($token);
assertTest($decodedId == $testUserId, "Token Verification (Decoded ID matches)");
$fakeToken = $token . "fake";
assertTest(verify_jwt($fakeToken) === false, "Fake Token Rejection");

// 3. COMBAT ENGINE LOGIC
echo "<h3>3. Combat Math Logic</h3>";
// On mock l'input pour tester combat_engine (qui lit php://input)
// Note: Difficile de tester un fichier procédural qui fait echo json_encode sans buffer.
// On va tester la fonction getTypeMultiplier si on l'extrait, sinon on fait un test HTTP simulé.

// Simulation Appel HTTP Local vers combat_engine
$url = "http://" . $_SERVER['HTTP_HOST'] . str_replace('tests/test_runner.php', 'combat_engine.php', $_SERVER['REQUEST_URI']);
$payload = json_encode([
    'is_correct' => true,
    'attacker_type' => 'FIRE',
    'enemy_type' => 'PLANTE',
    'attacker_level' => 10
]);

$opts = [
    'http' => [
        'method'  => 'POST',
        'header'  => 'Content-type: application/json',
        'content' => $payload
    ]
];
$context  = stream_context_create($opts);
$result = @file_get_contents($url, false, $context);
$json = json_decode($result, true);

if ($json) {
    assertTest($json['hit'] === true, "Attack Hit Logic");
    assertTest($json['effectiveness'] === 'SUPER', "Type Advantage (Fire vs Plant)");
    assertTest($json['damage'] > 12, "Damage Calculation (> Base)");
} else {
    echo "<div style='color:orange'>[WARN] Could not reach combat_engine.php via HTTP loopback. Check server config.</div>";
}

// 4. PROTECTED ROUTES
echo "<h3>4. Protected Routes (Middleware)</h3>";
// On teste get_question.php sans token
$urlQ = "http://" . $_SERVER['HTTP_HOST'] . str_replace('tests/test_runner.php', 'get_question.php', $_SERVER['REQUEST_URI']);
$resQ = @file_get_contents($urlQ, false, stream_context_create(['http' => ['ignore_errors' => true]]));
// On attend un 401 ou une erreur JSON
assertTest(strpos($resQ, 'Unauthorized') !== false || strpos($resQ, 'token') !== false, "Access Denied without Token");

echo "<hr><p>End of Diagnostic.</p>";
echo "</body></html>";
?>
