<?php
// backend/check_config.php
// Script de diagnostic pour vérifier la configuration du serveur

header('Content-Type: application/json');
require_once 'cors.php';

$checks = [
    'config_file_exists' => file_exists(__DIR__ . '/config.php'),
    'db_connect_exists' => file_exists(__DIR__ . '/db_connect.php'),
    'jwt_utils_exists' => file_exists(__DIR__ . '/jwt_utils.php'),
    'cors_exists' => file_exists(__DIR__ . '/cors.php'),
];

// Si config.php existe, charger les constantes
if ($checks['config_file_exists']) {
    require_once __DIR__ . '/config.php';
    $checks['db_host_defined'] = defined('DB_HOST');
    $checks['db_name_defined'] = defined('DB_NAME');
    $checks['jwt_secret_defined'] = defined('JWT_SECRET');
    $checks['environment'] = defined('ENVIRONMENT') ? ENVIRONMENT : 'undefined';
    
    // Tester la connexion à la base de données
    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $pdo = new PDO($dsn, DB_USER, DB_PASSWORD);
        $checks['database_connection'] = true;
        $checks['database_message'] = 'Connexion réussie';
    } catch (PDOException $e) {
        $checks['database_connection'] = false;
        $checks['database_message'] = 'Erreur: ' . $e->getMessage();
    }
} else {
    $checks['config_status'] = 'ERREUR: config.php n\'existe pas!';
    $checks['solution'] = 'Vérifiez que le fichier backend/config.php a bien été déployé';
}

// Informations serveur
$checks['php_version'] = phpversion();
$checks['server_time'] = date('Y-m-d H:i:s');
$checks['current_directory'] = __DIR__;

echo json_encode($checks, JSON_PRETTY_PRINT);
?>
