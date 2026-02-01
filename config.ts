
// Detects if we are running in development (localhost) or production
// Use optional chaining and nullish coalescing for safety to avoid crash on startup
const isDev = (import.meta as any)?.env?.DEV ?? false;

// ------------------------------------------------------------------
// CONFIGURATION DU BACKEND
// ------------------------------------------------------------------

// URL du Backend en Ligne (Production)
const PROD_URL = 'https://poke.sarlatc.com/backend';

// URL du Backend Local (Développement)
// Assurez-vous que votre serveur PHP tourne sur le port 80 ou adaptez cette URL
const LOCAL_URL = 'http://localhost/backend';

// ------------------------------------------------------------------

// Si on est en dev, on tape sur localhost, sinon sur la prod.
export const API_BASE_URL = isDev ? LOCAL_URL : PROD_URL;

// URL pour les assets (images)
export const ASSETS_BASE_URL = 'https://poke.sarlatc.com/assets';
