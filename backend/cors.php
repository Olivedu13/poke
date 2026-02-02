
<?php
// backend/cors.php

// Définition des headers standards
header("Access-Control-Allow-Origin: *"); // En prod, remplacer * par le domaine exact si possible
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Gestion immédiate du Preflight (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Gestionnaire d'arrêt critique (Catch Fatal Errors)
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && ($error['type'] === E_ERROR || $error['type'] === E_PARSE || $error['type'] === E_COMPILE_ERROR)) {
        if (!headers_sent()) {
            header("Content-Type: application/json");
            http_response_code(500);
        }
        echo json_encode(['success' => false, 'message' => 'Critical Server Error', 'debug' => $error['message']]);
    }
});
