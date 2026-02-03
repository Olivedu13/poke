<?php
// backend/test_protected.php
// Endpoint protégé pour tester l'authentification

// ON NE PEUT PAS inclure protected_setup normalement car il va exit
// On va faire manuellement pour le debug

header('Content-Type: application/json');
require_once 'cors.php';
require_once 'jwt_utils.php';

// Fonction pour récupérer le header Authorization
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

$authHeader = getAuthorizationHeader();
$token = get_bearer_token();
$userId = null;

if ($token) {
    $userId = verify_jwt($token);
}

$allHeaders = function_exists('getallheaders') ? getallheaders() : $_SERVER;

echo json_encode([
    'debug_info' => [
        'auth_header_raw' => $authHeader,
        'token_extracted' => $token ? substr($token, 0, 30) . '...' : null,
        'user_id_verified' => $userId,
        'all_headers' => $allHeaders
    ],
    'result' => $userId ? [
        'success' => true,
        'message' => 'Authentification réussie ✅',
        'user_id' => $userId
    ] : [
        'success' => false,
        'message' => 'Échec authentification ❌',
        'reason' => !$token ? 'Token non trouvé dans les headers' : 'Token invalide ou expiré'
    ]
], JSON_PRETTY_PRINT);
?>
