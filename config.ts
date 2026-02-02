
// Detects if we are running in development (localhost) or production
// Use optional chaining and nullish coalescing for safety to avoid crash on startup
const isDev = (import.meta as any)?.env?.DEV ?? false;

// ------------------------------------------------------------------
// CONFIGURATION DU BACKEND
// ------------------------------------------------------------------

// URL du Backend en Ligne (Production)
const PROD_URL = 'https://poke.sarlatc.com/backend';

// URL du Backend Local (Développement)
const LOCAL_URL = 'http://localhost/backend';

// ------------------------------------------------------------------

// API : On force la PROD pour avoir la BDD partagée même en local
export const API_BASE_URL = PROD_URL;

// ASSETS : 
// - En DEV (localhost) : on utilise '/assets' pour charger vos fichiers MP3 locaux (dossier public/assets)
// - En PROD : on utilise l'URL absolue du serveur
export const ASSETS_BASE_URL = isDev ? '/assets' : 'https://poke.sarlatc.com/assets';
