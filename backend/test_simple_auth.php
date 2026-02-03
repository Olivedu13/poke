<?php
// backend/test_simple_auth.php
// Test simplifié pour identifier le problème JWT

header('Content-Type: application/json');
require_once 'cors.php';
require_once 'db_connect.php';
require_once 'jwt_utils.php';

// Simulation : créer un utilisateur test et générer un token
$testUser = [
    'id' => 999,
    'username' => 'test_user'
];

$token = generate_jwt($testUser['id']);

echo json_encode([
    'step_1_generate_token' => [
        'status' => 'OK',
        'token' => $token
    ],
    'step_2_verify_token' => [
        'status' => verify_jwt($token) === $testUser['id'] ? 'OK' : 'FAIL',
        'verified_user_id' => verify_jwt($token)
    ],
    'step_3_instructions' => [
        'message' => 'Copiez le token ci-dessus',
        'test_url' => 'https://poke.sarlatc.com/backend/test_protected.php',
        'method' => 'GET',
        'header' => 'Authorization: Bearer ' . substr($token, 0, 30) . '...'
    ],
    'jwt_secret_check' => [
        'defined' => defined('JWT_SECRET'),
        'preview' => defined('JWT_SECRET') ? substr(JWT_SECRET, 0, 10) . '***' : 'NOT DEFINED'
    ]
], JSON_PRETTY_PRINT);
?>
