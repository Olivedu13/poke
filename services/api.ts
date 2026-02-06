
import axios from 'axios';
import { API_BASE_URL } from '../config';

// Instance Axios dédiée
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Callback de logout — sera enregistré par le store au boot
let _logoutFn: (() => void) | null = null;
export function registerLogoutCallback(fn: () => void) { _logoutFn = fn; }

// Intercepteur REQUEST : Injecter le token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('poke_edu_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur RESPONSE : Gérer l'expiration
// Ne logout QUE pour les requêtes d'authentification (verify), pas pour les
// appels API normaux (battle/rewards, shop, etc.) qui peuvent échouer sans
// que la session soit réellement expirée.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || '';
      // Seulement logout si c'est un appel critique de vérification d'auth
      const isCriticalAuth = url.includes('/auth/verify') || url.includes('/auth/login');
      if (isCriticalAuth) {
        console.warn('Session expirée. Déconnexion.');
        localStorage.removeItem('poke_edu_token');
        if (_logoutFn) _logoutFn();
        else window.location.reload();
      } else {
        console.warn(`401 sur ${url} — ignoré (pas un endpoint auth critique)`);
      }
    }
    return Promise.reject(error);
  }
);
