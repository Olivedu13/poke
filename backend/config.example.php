<?php
// backend/config.example.php
// Exemple de configuration - À COPIER vers config.php et ADAPTER à votre environnement

// === CONFIGURATION BASE DE DONNÉES ===
define('DB_HOST', 'db5019487862.hosting-data.io');
define('DB_NAME', 'dbs15241915');
define('DB_USER', 'dbu5468595');
define('DB_PASSWORD', 'votre_mot_de_passe_ici');
define('DB_CHARSET', 'utf8mb4');

// === CONFIGURATION JWT ===
define('JWT_SECRET', 'changez_cette_cle_secrete_unique');
define('JWT_ALGORITHM', 'HS256');
define('JWT_EXPIRATION', 86400); // 24 heures en secondes

// === CONFIGURATION GEMINI API (optionnel) ===
define('GEMINI_API_KEY', 'votre_cle_gemini_ici');

// === CONFIGURATION ENVIRONNEMENT ===
define('ENVIRONMENT', 'production'); // 'development' ou 'production'
define('DEBUG_MODE', false); // Mettre à false en production

// === CONFIGURATION CORS ===
define('ALLOWED_ORIGINS', 'https://poke.sarlatc.com');

// Activer l'affichage des erreurs en mode debug uniquement
if (DEBUG_MODE) {
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', 0);
    error_reporting(0);
}
?>
