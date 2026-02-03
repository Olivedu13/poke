<?php
// backend/test_auth_flow.php
// Test complet du flux d'authentification

header('Content-Type: application/json');
require_once 'cors.php';

$results = [];

// Test 1: Vérifier config.php
$results['config_exists'] = file_exists(__DIR__ . '/config.php');

if ($results['config_exists']) {
    require_once __DIR__ . '/config.php';
    $results['jwt_secret_defined'] = defined('JWT_SECRET');
    $results['jwt_secret_preview'] = defined('JWT_SECRET') ? substr(JWT_SECRET, 0, 15) . '...' : 'NOT DEFINED';
}

// Test 2: Générer un token
require_once 'jwt_utils.php';
$testUserId = 123;
$token = generate_jwt($testUserId);
$results['token_generated'] = !empty($token);
$results['token_preview'] = substr($token, 0, 50) . '...';

// Test 3: Vérifier le token
$verifiedId = verify_jwt($token);
$results['token_verified'] = ($verifiedId === $testUserId);
$results['verified_user_id'] = $verifiedId;

// Test 4: Simuler une requête avec Authorization header
$_SERVER['HTTP_AUTHORIZATION'] = "Bearer $token";

// Charger protected_setup pour tester l'extraction du token
ob_start();
try {
    // On doit capturer l'output car protected_setup va exit si échec
    $tempToken = null;
    $tempUserId = null;
    
    // Fonction de test (copie de protected_setup)
    function getAuthorizationHeader(){
        $headers = null;
        if (isset($_SERVER['Authorization'])) {
            $headers = trim($_SERVER["Authorization"]);
        }
        else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { 
            $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
        } 
        elseif (function_exists('apache_request_headers')) {
            $requestHeaders = apache_request_headers();
            $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
            if (isset($requestHeaders['Authorization'])) {
                $headers = trim($requestHeaders['Authorization']);
            }
        }
        return $headers;
    }

    function get_bearer_token() {
        $headers = getAuthorizationHeader();
        if (!empty($headers)) {
            if (preg_match('/Bearer\s(\S+)/', $headers, $matches)) {
                return $matches[1];
            }
        }
        return null;
    }
    
    $extractedToken = get_bearer_token();
    $results['token_extracted_from_header'] = !empty($extractedToken);
    $results['extracted_token_preview'] = $extractedToken ? substr($extractedToken, 0, 50) . '...' : 'NULL';
    $results['tokens_match'] = ($extractedToken === $token);
    
    if ($extractedToken) {
        $extractedUserId = verify_jwt($extractedToken);
        $results['extracted_token_verified'] = ($extractedUserId === $testUserId);
        $results['extracted_user_id'] = $extractedUserId;
    }
    
} catch (Exception $e) {
    $results['error'] = $e->getMessage();
}
$output = ob_get_clean();

$results['overall_status'] = (
    $results['token_generated'] && 
    $results['token_verified'] && 
    $results['token_extracted_from_header'] &&
    $results['tokens_match']
) ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED';

echo json_encode($results, JSON_PRETTY_PRINT);
?>
