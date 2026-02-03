<?php
// backend/debug_headers.php
// Script pour voir TOUS les headers reçus par le serveur

header('Content-Type: application/json');
require_once 'cors.php';

$debug = [
    'all_server_vars' => [],
    'apache_request_headers' => null,
    'getallheaders' => null,
    'auth_detection' => []
];

// 1. Toutes les variables $_SERVER commençant par HTTP_
foreach ($_SERVER as $key => $value) {
    if (strpos($key, 'HTTP_') === 0 || strpos($key, 'REDIRECT_') === 0 || $key === 'Authorization') {
        $debug['all_server_vars'][$key] = $value;
    }
}

// 2. apache_request_headers si disponible
if (function_exists('apache_request_headers')) {
    $debug['apache_request_headers'] = apache_request_headers();
}

// 3. getallheaders si disponible
if (function_exists('getallheaders')) {
    $debug['getallheaders'] = getallheaders();
}

// 4. Tests de détection du header Authorization
$checks = [
    'HTTP_AUTHORIZATION' => $_SERVER['HTTP_AUTHORIZATION'] ?? null,
    'Authorization' => $_SERVER['Authorization'] ?? null,
    'REDIRECT_HTTP_AUTHORIZATION' => $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null,
];

foreach ($checks as $method => $value) {
    $debug['auth_detection'][$method] = [
        'exists' => !empty($value),
        'value_preview' => $value ? substr($value, 0, 30) . '...' : null
    ];
}

$debug['instructions'] = [
    'message' => 'Envoyez une requête avec le header: Authorization: Bearer test123',
    'test_command' => 'curl -H "Authorization: Bearer test123" https://poke.sarlatc.com/backend/debug_headers.php'
];

echo json_encode($debug, JSON_PRETTY_PRINT);
?>
