import React, { useState } from 'react';
import { api } from '../../services/api';
import { useGameStore } from '../../store/gameStore';
import { ApiResponse, User } from '../../types';
import { ASSETS_BASE_URL } from '../../config';

export const AuthForm: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useGameStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const response = await api.post<ApiResponse<User> & { token?: string }>(endpoint, {
        username, 
        password
      });

      if (response.data.success && response.data.user && response.data.token) {
        const user = response.data.user;
        // Parse active_subjects if it's a string
        if (typeof user.active_subjects === 'string') {
          try { 
            user.active_subjects = JSON.parse(user.active_subjects); 
          } catch { 
            user.active_subjects = ['MATHS', 'FRANCAIS']; 
          }
        }
        login(user, response.data.token);
      } else {
        setError(response.data.message || 'Erreur de connexion');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = 'Serveur indisponible';
      if (err.response?.data?.message) {
        msg = err.response.data.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.3)]">
          <img 
            src={`${ASSETS_BASE_URL}/pokeball.webp`} 
            alt="Poke-Edu" 
            className="w-12 h-12 object-contain animate-pulse" 
          />
        </div>
        <h1 className="font-display font-black text-2xl sm:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wider">
          POKE-EDU
        </h1>
        <p className="text-slate-500 text-sm mt-1">Apprends en t'amusant</p>
      </div>

      {/* Form Card */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-6 shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        {/* Tabs */}
        <div className="flex mb-6 bg-slate-800 rounded-lg p-1">
          <button
            onClick={() => setIsRegister(false)}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
              !isRegister 
                ? 'bg-cyan-600 text-white' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Connexion
          </button>
          <button
            onClick={() => setIsRegister(true)}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
              isRegister 
                ? 'bg-cyan-600 text-white' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Inscription
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
              Pseudo
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ton pseudo..."
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
              required
              autoComplete="username"
              minLength={3}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
              required
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              minLength={4}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-display font-bold text-base rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Chargement...
              </span>
            ) : (
              isRegister ? 'CRÉER MON COMPTE' : 'CONNEXION'
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p className="text-center text-slate-600 text-xs mt-4">
        v2.0.0 • Serveur Node.js
      </p>
    </div>
  );
};
