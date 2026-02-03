<?php
// backend/test_jwt.php
// Script de test pour vérifier le système JWT

header('Content-Type: application/json');
require_once 'cors.php';
require_once 'jwt_utils.php';

$testUserId = 999;

// Test 1: Génération du token
$token = generate_jwt($testUserId);

// Test 2: Vérification du token
$verifiedUserId = verify_jwt($token);

// Test 3: Test avec un token invalide
$invalidVerification = verify_jwt('invalid.token.here');

// Test 4: Vérifier que JWT_SECRET est bien défini
$jwtSecretDefined = defined('JWT_SECRET');
$jwtSecretValue = $jwtSecretDefined ? substr(JWT_SECRET, 0, 10) . '...' : 'NOT DEFINED';

$result = [
    'success' => true,
    'tests' => [
        'token_generation' => [
            'status' => !empty($token) ? 'OK' : 'FAIL',
            'token_preview' => substr($token, 0, 30) . '...',
            'token_length' => strlen($token)
        ],
        'token_verification' => [
            'status' => ($verifiedUserId === $testUserId) ? 'OK' : 'FAIL',
            'expected_user_id' => $testUserId,
            'verified_user_id' => $verifiedUserId
        ],
        'invalid_token_handling' => [
            'status' => ($invalidVerification === false) ? 'OK' : 'FAIL',
            'result' => $invalidVerification
        ],
        'jwt_secret' => [
            'status' => $jwtSecretDefined ? 'OK' : 'FAIL',
            'defined' => $jwtSecretDefined,
            'value_preview' => $jwtSecretValue
        ]
    ],
    'config_loaded' => file_exists(__DIR__ . '/config.php'),
    'overall_status' => ($verifiedUserId === $testUserId && !$invalidVerification && $jwtSecretDefined) ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'
];

echo json_encode($result, JSON_PRETTY_PRINT);
?>
