
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
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Session expirée. Déconnexion.");
      localStorage.removeItem('poke_edu_token');
      // Force reload to reset store via Auth boundary
      window.location.reload();
    }
    return Promise.reject(error);
  }
);
