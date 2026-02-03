
// Detects if we are running in development (localhost) or production
// Use optional chaining and nullish coalescing for safety to avoid crash on startup
const isDev = (import.meta as any)?.env?.DEV ?? false;

// ------------------------------------------------------------------
// CONFIGURATION DU BACKEND
// ------------------------------------------------------------------

// URL du Backend en Ligne (Production IONOS)
const PROD_URL = 'https://poke.sarlatc.com/backend';

// En mode "Cowboy Coding", on veut toujours taper sur la PROD pour la BDD.
// On ignore l'URL locale.
export const API_BASE_URL = PROD_URL;

// ASSETS : 
// - En DEV : on charge les assets depuis le dossier public local pour éviter les erreurs CORS sur les images/sons
// - En PROD : on utilise le chemin avec /assets/
export const ASSETS_BASE_URL = isDev ? '/assets' : 'https://poke.sarlatc.com/assets';
