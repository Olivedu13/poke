<?php
// backend/api_response.php

class ApiResponse {
    
    public static function send($data, $success = true, $message = null) {
        // Nettoyer le buffer de sortie pour éviter que des warnings PHP ne cassent le JSON
        if (ob_get_length()) ob_clean();
        
        header('Content-Type: application/json; charset=utf-8');
        
        $payload = [
            'success' => $success,
            'data' => $data
        ];
        
        if ($message) {
            $payload['message'] = $message;
        }
        
        echo json_encode($payload, JSON_PARTIAL_OUTPUT_ON_ERROR | JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function error($message, $code = 400) {
        if (ob_get_length()) ob_clean();
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'message' => $message]);
        exit;
    }
}
?>