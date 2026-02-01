
import React, { useState } from 'react';
import axios from 'axios';
import { useGameStore } from '../../store/gameStore';
import { ApiResponse, User } from '../../types';
import { API_BASE_URL } from '../../config';

export const AuthForm: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, devLogin } = useGameStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = `${API_BASE_URL}/auth.php`; 
      const action = isRegister ? 'register' : 'login';
      
      const response = await axios.post<ApiResponse<User>>(endpoint, {
        action,
        username,
        password,
        grade_level: 'CE1' // Default for new users
      });

      if (response.data.success && response.data.user) {
        const user = response.data.user;
        if (typeof user.active_subjects === 'string') {
            try { user.active_subjects = JSON.parse(user.active_subjects); } catch (e) { user.active_subjects = ['MATHS']; }
        }
        user.custom_prompt_active = Boolean(Number(user.custom_prompt_active));
        login(user);
      } else {
        setError(response.data.message || 'Échec de l\'authentification');
      }
    } catch (err) {
      setError('Erreur réseau. Le serveur PHP est-il accessible ?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <div className="w-full max-w-md bg-slate-900/90 border border-cyan-500/50 p-8 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden">
        {/* Decor */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
        
        <h2 className="text-3xl font-display font-bold text-center text-white mb-8 tracking-widest">
          {isRegister ? 'INIT_PROFIL' : 'ACCÈS_TERMINAL'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 text-red-200 text-sm rounded font-mono">
            ⚠ ERREUR: {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-display text-cyan-400 tracking-wider">IDENTIFIANT AGENT</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 text-white p-3 rounded transition-all outline-none font-mono placeholder-slate-600"
              placeholder="Pseudo"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-display text-cyan-400 tracking-wider">CODE D'ACCÈS</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 text-white p-3 rounded transition-all outline-none font-mono placeholder-slate-600"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-black font-display font-bold py-4 rounded transition-all transform hover:scale-[1.02] shadow-[0_0_15px_rgba(34,211,238,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'TRAITEMENT...' : (isRegister ? 'CRÉER PROFIL' : 'CONNEXION')}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-4">
          <button 
            onClick={() => setIsRegister(!isRegister)}
            className="text-slate-400 hover:text-cyan-400 text-sm transition-colors"
          >
            {isRegister ? 'Déjà agent ? Connexion' : 'Nouvelle recrue ? S\'inscrire'}
          </button>
          
          <div className="w-full border-t border-slate-800"></div>

          <button 
             onClick={devLogin}
             className="text-xs bg-yellow-900/20 text-yellow-500 border border-yellow-700/50 px-4 py-2 rounded hover:bg-yellow-900/40 transition-colors font-mono uppercase"
          >
             ⚠ MODE DEV (Pas de Backend)
          </button>
        </div>
      </div>
    </div>
  );
};
