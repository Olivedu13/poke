<?php
// backend/jwt_utils.php

// Charger la configuration
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
    // JWT_SECRET est déjà défini dans config.php, pas besoin de le redéfinir
} else {
    // Fallback si config.php n'existe pas
    if (!defined('JWT_SECRET')) {
        define('JWT_SECRET', 'POKE_EDU_SECURE_KEY_X99');
    }
}

function base64UrlEncode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function generate_jwt($user_id) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload = json_encode([
        'sub' => $user_id,
        'iat' => time(),
        'exp' => time() + (86400 * 7) // 7 jours
    ]);
    
    $base64UrlHeader = base64UrlEncode($header);
    $base64UrlPayload = base64UrlEncode($payload);
    
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, JWT_SECRET, true);
    $base64UrlSignature = base64UrlEncode($signature);
    
    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

function verify_jwt($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return false;
    
    $header = $parts[0];
    $payload = $parts[1];
    $signature_provided = $parts[2];
    
    $signature = hash_hmac('sha256', $header . "." . $payload, JWT_SECRET, true);
    $base64UrlSignature = base64UrlEncode($signature);
    
    if ($base64UrlSignature !== $signature_provided) return false;
    
    $payloadObj = json_decode(base64_decode(strtr($payload, '-_', '+/')), true);
    
    if (isset($payloadObj['exp']) && $payloadObj['exp'] < time()) {
        return false;
    }
    
    return $payloadObj['sub'] ?? false;
}
