<?php
// backend/test_api.php
require_once 'db_connect.php';

// Si le script arrive ici sans erreur fatale, c'est que la connexion BDD est OK.
// db_connect.php gère déjà les headers CORS.

echo json_encode([
    'status' => 'ONLINE',
    'message' => '🚀 Le Backend répond parfaitement et la base de données est connectée !',
    'server_time' => date('Y-m-d H:i:s'),
    'php_version' => phpversion()
]);
?>