<?php
// backend/debug_token.php
require_once 'cors.php'; // Gère les headers CORS (OPTIONS)
require_once 'jwt_utils.php';

// Fonction brute pour voir tous les headers reçus
function getAllHeadersDebug() {
    $headers = [];
    foreach ($_SERVER as $name => $value) {
        if (substr($name, 0, 5) == 'HTTP_') {
            $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
        }
    }
    // Fallback Apache
    if (function_exists('apache_request_headers')) {
        $apacheHeaders = apache_request_headers();
        if ($apacheHeaders) {
            $headers = array_merge($headers, $apacheHeaders);
        }
    }
    return $headers;
}

$receivedHeaders = getAllHeadersDebug();
$authHeader = null;

// Chercher le header Authorization (insensible à la casse)
foreach ($receivedHeaders as $key => $val) {
    if (strtolower($key) === 'authorization') {
        $authHeader = $val;
        break;
    }
}

$status = [
    'step_1_headers_received' => !empty($receivedHeaders),
    'step_2_auth_header_found' => !empty($authHeader),
    'step_3_token_extracted' => null,
    'step_4_token_valid' => false,
    'user_id_found' => null,
    'raw_auth_header' => $authHeader
];

if ($authHeader) {
    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $token = $matches[1];
        $status['step_3_token_extracted'] = "Oui (Longueur: " . strlen($token) . ")";
        
        $userId = verify_jwt($token);
        if ($userId) {
            $status['step_4_token_valid'] = true;
            $status['user_id_found'] = $userId;
            $status['message'] = "SUCCÈS : Token valide, User ID $userId récupéré.";
        } else {
            $status['message'] = "ECHEC : Token présent mais invalide ou expiré.";
        }
    } else {
        $status['message'] = "ECHEC : Header trouvé mais pas de format 'Bearer <token>'";
    }
} else {
    $status['message'] = "CRITIQUE : Aucun header Authorization reçu. Vérifiez le .htaccess.";
}

echo json_encode($status);
?>