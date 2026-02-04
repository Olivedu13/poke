
// Detects if we are running in development (localhost) or production
// Use optional chaining and nullish coalescing for safety to avoid crash on startup
const isDev = (import.meta as any)?.env?.DEV ?? false;

// ------------------------------------------------------------------
// CONFIGURATION DU BACKEND (VPS Node.js)
// ------------------------------------------------------------------

// URL du Backend (Node.js API)
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://jeu.sarlatc.com/api';

// URL WebSocket (Socket.io)
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://jeu.sarlatc.com';

// ASSETS : 
// - En DEV : on charge les assets depuis le dossier public local
// - En PROD : on utilise le chemin avec /assets/
export const ASSETS_BASE_URL = isDev ? '/assets' : 'https://jeu.sarlatc.com/assets';
