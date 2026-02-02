
<?php
// backend/protected_setup.php
require_once 'db_connect.php';
require_once 'jwt_utils.php';

// Fonction robuste pour récupérer le header Authorization sur serveur mutualisé
function getAuthorizationHeader(){
    $headers = null;
    if (isset($_SERVER['Authorization'])) {
        $headers = trim($_SERVER["Authorization"]);
    }
    else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { // Souvent ici sur Apache/CGI
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

$token = get_bearer_token();
$userId = null;

if ($token) {
    $userId = verify_jwt($token);
}

if (!$userId) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized: Invalid or expired token']);
    exit;
}

// Préparation des entrées JSON pour les scripts suivants
$input = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true) ?? [];
}
