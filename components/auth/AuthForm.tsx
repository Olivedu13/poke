
import React, { useState } from 'react';
import { api } from '../../services/api';
import { useGameStore } from '../../store/gameStore';
import { ApiResponse, User } from '../../types';

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
      const action = isRegister ? 'register' : 'login';
      // Utilisation du service centralisé (BaseURL auto)
      const response = await api.post<ApiResponse<User> & { token?: string }>('/auth.php', {
        action, username, password
      });

      if (response.data.success && response.data.user && response.data.token) {
        const user = response.data.user;
        // Parsing JSON SQL
        if (typeof user.active_subjects === 'string') {
            try { user.active_subjects = JSON.parse(user.active_subjects); } catch (e) { user.active_subjects = ['MATHS']; }
        }
        user.custom_prompt_active = Boolean(Number(user.custom_prompt_active));
        
        login(user, response.data.token);
      } else {
        setError(response.data.message || 'Erreur inconnue');
      }
    } catch (err: any) {
      console.error(err);
      let msg = "Serveur indisponible";
      if(err.response?.data?.message) msg = err.response.data.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <div className="w-full max-w-md bg-slate-900/90 border border-cyan-500/50 p-8 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
        <h2 className="text-3xl font-display font-bold text-center text-white mb-8 tracking-widest">
          {isRegister ? 'INITIALISATION' : 'IDENTIFICATION'}
        </h2>
        {error && <div className="mb-4 p-3 bg-red-900/50 border border-red-500 text-red-200 text-sm rounded font-mono">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-display text-cyan-400">AGENT ID</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-slate-950 border border-slate-700 text-white p-3 rounded font-mono" required />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-display text-cyan-400">CODE SECRET</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-700 text-white p-3 rounded font-mono" required />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-cyan-600 hover:bg-cyan-500 text-black font-display font-bold py-4 rounded transition-all disabled:opacity-50">
            {loading ? 'CONNEXION...' : (isRegister ? 'CRÉER COMPTE' : 'ACCÉDER')}
          </button>
        </form>
        <div className="mt-6 text-center">
          <button onClick={() => setIsRegister(!isRegister)} className="text-slate-400 hover:text-white text-sm underline">
            {isRegister ? 'Retour à la connexion' : 'Créer un nouveau compte'}
          </button>
        </div>
      </div>
    </div>
  );
};
