<?php
// backend/protected_setup.php
require_once 'db_connect.php'; // Inclut cors.php qui gère les OPTIONS
require_once 'jwt_utils.php';

// Fonction robuste pour récupérer le header Authorization
function getAuthorizationHeader(){
    $headers = null;
    
    // Méthode 1: Variable $_SERVER standard
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) { 
        $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
    }
    // Méthode 2: Variable Authorization sans préfixe HTTP_
    elseif (isset($_SERVER['Authorization'])) {
        $headers = trim($_SERVER["Authorization"]);
    }
    // Méthode 3: Variable REDIRECT_ (serveurs CGI/FastCGI)
    elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $headers = trim($_SERVER["REDIRECT_HTTP_AUTHORIZATION"]);
    }
    // Méthode 4: apache_request_headers (si disponible)
    elseif (function_exists('apache_request_headers')) {
        $requestHeaders = apache_request_headers();
        // Normalisation des clés (Authorization vs authorization)
        $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
        if (isset($requestHeaders['Authorization'])) {
            $headers = trim($requestHeaders['Authorization']);
        }
    }
    // Méthode 5: getallheaders (alias)
    elseif (function_exists('getallheaders')) {
        $allHeaders = getallheaders();
        if (isset($allHeaders['Authorization'])) {
            $headers = trim($allHeaders['Authorization']);
        } elseif (isset($allHeaders['authorization'])) {
            $headers = trim($allHeaders['authorization']);
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

$token = get_bearer_token();
$userId = null;

if ($token) {
    $userId = verify_jwt($token);
}

if (!$userId) {
    // Debug détaillé
    error_log("[AUTH DEBUG] Token reçu: " . ($token ? substr($token, 0, 30) . '...' : 'NULL'));
    error_log("[AUTH DEBUG] Headers: " . json_encode(getallheaders()));
    
    http_response_code(401);
    echo json_encode([
        'success' => false, 
        'message' => 'Unauthorized: Session expirée ou invalide',
        'debug' => [
            'token_received' => !empty($token),
            'token_preview' => $token ? substr($token, 0, 20) . '...' : null,
            'jwt_secret_defined' => defined('JWT_SECRET')
        ]
    ]);
    exit;
}

// Lecture centralisée du JSON input pour les requêtes POST/PUT
$input = [];
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true) ?? [];
}
?>