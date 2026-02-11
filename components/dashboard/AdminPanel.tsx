import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

// Grade mapping: Prisma enum names ↔ frontend values
const PRISMA_TO_FRONT: Record<string, string> = {
  'SIXIEME': '6EME', 'CINQUIEME': '5EME', 'QUATRIEME': '4EME', 'TROISIEME': '3EME',
  'CP': 'CP', 'CE1': 'CE1', 'CE2': 'CE2', 'CM1': 'CM1', 'CM2': 'CM2',
  '6EME': '6EME', '5EME': '5EME', '4EME': '4EME', '3EME': '3EME',
};
const GRADE_DISPLAY: Record<string, string> = {
  'CP': 'CP', 'CE1': 'CE1', 'CE2': 'CE2', 'CM1': 'CM1', 'CM2': 'CM2',
  '6EME': '6ème', '5EME': '5ème', '4EME': '4ème', '3EME': '3ème',
};

// Explicit color classes for Tailwind JIT (dynamic class names don't work)
const COLOR_MAP: Record<string, { border: string; text: string; textLight: string; focusBorder: string; btnBorder: string }> = {
  yellow: { border: 'border-yellow-500/20', text: 'text-yellow-400', textLight: 'text-yellow-400/80', focusBorder: 'focus:border-yellow-500/50', btnBorder: 'border-yellow-500/30' },
  cyan:   { border: 'border-cyan-500/20',   text: 'text-cyan-400',   textLight: 'text-cyan-400/80',   focusBorder: 'focus:border-cyan-500/50',   btnBorder: 'border-cyan-500/30' },
  purple: { border: 'border-purple-500/20', text: 'text-purple-400', textLight: 'text-purple-400/80', focusBorder: 'focus:border-purple-500/50', btnBorder: 'border-purple-500/30' },
  green:  { border: 'border-green-500/20',  text: 'text-green-400',  textLight: 'text-green-400/80',  focusBorder: 'focus:border-green-500/50',  btnBorder: 'border-green-500/30' },
};

/**
 * Hook: press-and-hold → paliers fixes
 * 0-2s: +100 toutes les 500ms | 2-3s: +200 toutes les 500ms | 3s+: +500 toutes les 500ms
 */
function useHoldIncrement(callback: (step: number) => void) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  const start = useCallback((direction: 1 | -1) => {
    elapsedRef.current = 0;
    // Premier tick immédiat
    callback(100 * direction);
    timerRef.current = setInterval(() => {
      elapsedRef.current += 500;
      const step = elapsedRef.current < 2000 ? 100
                 : elapsedRef.current < 3000 ? 200
                 : 500;
      callback(step * direction);
    }, 500);
  }, [callback]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    elapsedRef.current = 0;
  }, []);

  useEffect(() => stop, [stop]);

  return { start, stop };
}

interface AdminUser {
  id: number;
  username: string;
  grade_level: string;
  gold: number;
  tokens: number;
  global_xp: number;
  streak: number;
  pokemon_count: number;
  inventory_count: number;
}

interface AdminUserDetails extends AdminUser {
  active_subjects: string[];
  pokemons: { id: string; tyradex_id: number; nickname: string; level: number; current_hp: number; is_team: boolean }[];
  inventory: { item_id: string; item_name: string; quantity: number }[];
}

interface AdminPanelProps {
  onClose: () => void;
}

/** Champ stat avec boutons +/- et accélération au maintien */
const AdminStatField: React.FC<{
  label: string; icon: string; fieldKey: string; color: string;
  displayValue: number; editMode: boolean; editValue: number;
  onChange: (val: number) => void;
}> = ({ label, icon, color, displayValue, editMode, editValue, onChange }) => {
  const c = COLOR_MAP[color] || COLOR_MAP.cyan;
  // Ref pour toujours utiliser la dernière valeur dans le callback de hold
  const valueRef = useRef(editValue);
  useEffect(() => { valueRef.current = editValue; }, [editValue]);
  
  const holdRef = useHoldIncrement(useCallback((step: number) => {
    const newVal = Math.max(0, valueRef.current + step);
    valueRef.current = newVal;
    onChange(newVal);
  }, [onChange]));

  const diff = editValue - displayValue;

  return (
    <div className={`bg-slate-900/70 border ${c.border} rounded-xl p-3`}>
      <label className={`text-[10px] ${c.textLight} block mb-1 uppercase tracking-widest font-bold`}>{icon} {label}</label>
      {editMode ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <button
              onMouseDown={() => holdRef.start(-1)}
              onMouseUp={holdRef.stop}
              onMouseLeave={holdRef.stop}
              onTouchStart={() => holdRef.start(-1)}
              onTouchEnd={holdRef.stop}
              className={`w-8 h-8 rounded-lg bg-slate-800 border ${c.btnBorder} ${c.text} font-bold text-lg flex items-center justify-center hover:bg-slate-700 active:scale-90 transition-all select-none`}
            >−</button>
            <input
              type="number"
              value={editValue}
              onChange={(e) => onChange(parseInt(e.target.value) || 0)}
              className={`flex-1 min-w-0 bg-slate-800/80 ${c.text} font-mono text-lg px-2 py-1.5 rounded-lg border border-slate-700/50 ${c.focusBorder} focus:outline-none text-center`}
            />
            <button
              onMouseDown={() => holdRef.start(1)}
              onMouseUp={holdRef.stop}
              onMouseLeave={holdRef.stop}
              onTouchStart={() => holdRef.start(1)}
              onTouchEnd={holdRef.stop}
              className={`w-8 h-8 rounded-lg bg-slate-800 border ${c.btnBorder} ${c.text} font-bold text-lg flex items-center justify-center hover:bg-slate-700 active:scale-90 transition-all select-none`}
            >+</button>
          </div>
          {diff !== 0 && (
            <div className={`text-center text-xs font-bold ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {diff > 0 ? `+${diff}` : diff} (avant: {displayValue.toLocaleString()})
            </div>
          )}
        </div>
      ) : (
        <div className={`${c.text} font-mono text-xl font-bold`}>{displayValue.toLocaleString()}</div>
      )}
    </div>
  );
};

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ gold: 0, tokens: 0, global_xp: 0, grade_level: 'CE1' });
  const [addPokemonData, setAddPokemonData] = useState({ tyradex_id: 25, level: 5 });
  const [showSettings, setShowSettings] = useState(false);
  const [settingsData, setSettingsData] = useState({ admin_code: '', parental_code: '' });
  const [settingsLoading, setSettingsLoading] = useState(false);

  const handleDigit = (digit: string) => {
    if (codeInput.length < 4) {
      const newCode = codeInput + digit;
      setCodeInput(newCode);
      setCodeError(false);

      if (newCode.length === 4) {
        // Try to authenticate with entered code
        tryAuth(newCode);
      }
    }
  };

  const tryAuth = async (code: string) => {
    try {
      // Test the code by calling the users endpoint
      const res = await api.get('/admin/users', { headers: { 'x-admin-code': code } });
      if (res.data.success) {
        setAdminCode(code);
        setAuthenticated(true);
        setUsers(res.data.data);
      } else {
        setCodeError(true);
        setMessage('Code incorrect');
        setTimeout(() => setCodeInput(''), 500);
      }
    } catch (e: any) {
      if (e?.response?.status === 403) {
        setCodeError(true);
        setMessage('Code incorrect');
        setTimeout(() => setCodeInput(''), 500);
      } else {
        setCodeError(true);
        setMessage('Erreur de connexion');
        setTimeout(() => setCodeInput(''), 500);
      }
    }
  };

  const handleDelete = () => {
    setCodeInput(codeInput.slice(0, -1));
    setCodeError(false);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users', { headers: { 'x-admin-code': adminCode } });
      if (res.data.success) setUsers(res.data.data);
    } catch (e) {
      setMessage('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/user/${userId}`, { headers: { 'x-admin-code': adminCode } });
      if (res.data.success) {
        setSelectedUser(res.data.data);
        setEditData({
          gold: res.data.data.gold,
          tokens: res.data.data.tokens,
          global_xp: res.data.data.global_xp,
          grade_level: PRISMA_TO_FRONT[res.data.data.grade_level] || res.data.data.grade_level,
        });
      }
    } catch (e) {
      setMessage('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      const res = await api.put(`/admin/user/${selectedUser.id}`, {
        ...editData,
        admin_code: adminCode,
      }, { headers: { 'x-admin-code': adminCode } });
      if (res.data.success) {
        setMessage('Modifications enregistrées');
        fetchUserDetails(selectedUser.id);
        setEditMode(false);
      }
    } catch (e) {
      setMessage('Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPokemon = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      const res = await api.post(`/admin/user/${selectedUser.id}/add-pokemon`, {
        ...addPokemonData,
        admin_code: adminCode,
      }, { headers: { 'x-admin-code': adminCode } });
      if (res.data.success) {
        setMessage('Pokémon ajouté');
        fetchUserDetails(selectedUser.id);
      }
    } catch (e) {
      setMessage('Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePokemon = async (pokemonId: string) => {
    if (!selectedUser || !confirm('Supprimer ce Pokémon ?')) return;
    setLoading(true);
    try {
      const res = await api.delete(`/admin/user/${selectedUser.id}/pokemon/${pokemonId}`, {
        headers: { 'x-admin-code': adminCode },
      });
      if (res.data.success) {
        setMessage('Pokémon supprimé');
        fetchUserDetails(selectedUser.id);
      }
    } catch (e) {
      setMessage('Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('SUPPRIMER ce compte et TOUS ses Pokémon/items ? Cette action est irréversible !')) return;
    setLoading(true);
    try {
      const res = await api.delete(`/admin/user/${userId}`, {
        headers: { 'x-admin-code': adminCode },
      });
      if (res.data.success) {
        setMessage('Compte supprimé');
        setSelectedUser(null);
        fetchUsers();
      }
    } catch (e) {
      setMessage('Erreur suppression');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (userId: number) => {
    const newPassword = prompt('Nouveau mot de passe :');
    if (!newPassword) return;
    setLoading(true);
    try {
      const res = await api.put(`/admin/user/${userId}/reset-password`, {
        password: newPassword,
        admin_code: adminCode,
      }, { headers: { 'x-admin-code': adminCode } });
      if (res.data.success) setMessage('Mot de passe changé');
    } catch (e) {
      setMessage('Erreur');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await api.get('/admin/settings', { headers: { 'x-admin-code': adminCode } });
      if (res.data.success) {
        setSettingsData(res.data.data);
      }
    } catch (e) {
      setMessage('Erreur chargement paramètres');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!/^\d{4}$/.test(settingsData.admin_code) || !/^\d{4}$/.test(settingsData.parental_code)) {
      setMessage('Les codes doivent être des codes à 4 chiffres');
      return;
    }
    setSettingsLoading(true);
    try {
      const res = await api.put('/admin/settings', settingsData, { headers: { 'x-admin-code': adminCode } });
      if (res.data.success) {
        setMessage('Codes mis à jour ✓');
        // If admin code changed, update our local copy
        if (res.data.data.admin_code !== adminCode) {
          setAdminCode(res.data.data.admin_code);
        }
        setSettingsData(res.data.data);
      }
    } catch (e) {
      setMessage('Erreur sauvegarde');
    } finally {
      setSettingsLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-950 via-red-950/30 to-slate-950 backdrop-blur-xl flex items-center justify-center p-4">
        {/* Animated grid background */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(239,68,68,0.3) 40px, rgba(239,68,68,0.3) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(239,68,68,0.3) 40px, rgba(239,68,68,0.3) 41px)' }} />
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="relative bg-slate-900/95 border-2 border-red-500/60 rounded-2xl p-8 max-w-sm w-full shadow-2xl shadow-red-500/10"
        >
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-red-600/20 to-orange-600/20 rounded-2xl blur-xl -z-10" />
          
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🛡️</div>
            <h2 className="text-2xl font-display font-black bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">ACCÈS ADMINISTRATEUR</h2>
            <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest">Entrez le code secret</p>
          </div>

          {/* PIN Display */}
          <div className="flex justify-center gap-4 mb-6">
            {[0, 1, 2, 3].map((index) => (
              <motion.div
                key={index}
                animate={codeError ? { x: [0, -8, 8, -8, 0] } : {}}
                transition={{ duration: 0.4 }}
                className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold transition-all duration-200 ${
                  codeError
                    ? 'bg-red-900/60 border-2 border-red-500 shadow-lg shadow-red-500/30'
                    : codeInput.length > index
                    ? 'bg-gradient-to-br from-red-600 to-orange-600 border-2 border-red-400 shadow-lg shadow-red-500/20 scale-105'
                    : 'bg-slate-800/80 border-2 border-slate-700/50'
                }`}
              >
                {codeInput.length > index ? <span className="text-white">●</span> : ''}
              </motion.div>
            ))}
          </div>

          {codeError && (
            <motion.p 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-center text-xs mb-4 font-bold uppercase tracking-wider"
            >
              ❌ Code incorrect
            </motion.p>
          )}

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                onClick={() => handleDigit(digit)}
                className="bg-slate-800/80 hover:bg-slate-700 active:bg-red-600 active:scale-95 text-white font-bold text-xl h-14 rounded-xl transition-all border border-slate-700/50 hover:border-slate-600"
              >
                {digit}
              </button>
            ))}
            <button
              onClick={onClose}
              className="bg-slate-800/40 hover:bg-slate-700/50 text-slate-500 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all border border-slate-700/30"
            >
              FERMER
            </button>
            <button
              onClick={() => handleDigit('0')}
              className="bg-slate-800/80 hover:bg-slate-700 active:bg-red-600 active:scale-95 text-white font-bold text-xl h-14 rounded-xl transition-all border border-slate-700/50 hover:border-slate-600"
            >
              0
            </button>
            <button
              onClick={handleDelete}
              className="bg-slate-800/60 hover:bg-slate-700 text-slate-400 font-bold text-lg rounded-xl transition-all border border-slate-700/30"
            >
              ⌫
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col overflow-hidden">
      {/* Background grid + glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(239,68,68,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(239,68,68,0.06)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-red-600/15 blur-[120px] rounded-full pointer-events-none" />
      
      {/* Header */}
      <div className="relative bg-gradient-to-r from-red-900/80 via-red-800/60 to-orange-900/80 border-b border-red-500/30 p-4 flex items-center justify-between shrink-0 shadow-lg shadow-red-900/20">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <div>
            <h2 className="text-lg font-display font-black bg-gradient-to-r from-red-300 to-orange-300 bg-clip-text text-transparent uppercase tracking-wider">PANNEAU ADMINISTRATEUR</h2>
            <p className="text-[10px] text-red-400/60 uppercase tracking-widest">{users.length} comptes enregistrés</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowSettings(!showSettings); if (!showSettings) fetchSettings(); setSelectedUser(null); }}
            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${showSettings ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/50'}`}
          >
            ⚙ Codes d'accès
          </button>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800/50 text-slate-400 hover:text-white hover:bg-red-600 transition-all border border-slate-700/30 text-lg">✕</button>
        </div>
      </div>

      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-yellow-600/20 via-yellow-500/10 to-yellow-600/20 text-yellow-400 text-xs font-bold p-2.5 text-center border-b border-yellow-500/20 uppercase tracking-wider"
        >
          {message}
        </motion.div>
      )}

      {showSettings ? (
        <div className="flex-1 overflow-y-auto p-6 flex items-start justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/90 border border-red-500/30 rounded-2xl p-6 max-w-md w-full space-y-6 shadow-xl"
          >
            <div className="text-center">
              <span className="text-3xl">🔐</span>
              <h3 className="text-xl font-display font-black bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent mt-2">GESTION DES CODES</h3>
              <p className="text-slate-500 text-[10px] uppercase tracking-widest mt-1">Modifiez les codes d'accès (4 chiffres)</p>
            </div>

            {settingsLoading ? (
              <div className="text-center py-8">
                <div className="w-10 h-10 border-3 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <span className="text-slate-500 text-xs uppercase tracking-widest">Chargement...</span>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="bg-slate-800/60 border border-red-500/20 rounded-xl p-4">
                    <label className="text-xs font-bold text-red-400 block mb-1 uppercase tracking-wider">🛡️ Code administrateur</label>
                    <p className="text-[10px] text-slate-500 mb-3">Permet l'accès à ce panneau</p>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={settingsData.admin_code}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setSettingsData({ ...settingsData, admin_code: val });
                      }}
                      className="w-full bg-slate-900/80 text-red-400 font-mono text-2xl text-center tracking-[0.5em] px-4 py-3 rounded-lg border border-slate-700/50 focus:border-red-500 focus:outline-none focus:shadow-lg focus:shadow-red-500/10 transition-all"
                      placeholder="● ● ● ●"
                    />
                  </div>

                  <div className="bg-slate-800/60 border border-cyan-500/20 rounded-xl p-4">
                    <label className="text-xs font-bold text-cyan-400 block mb-1 uppercase tracking-wider">🔒 Code parental</label>
                    <p className="text-[10px] text-slate-500 mb-3">Permet l'accès aux paramètres du compte</p>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={settingsData.parental_code}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setSettingsData({ ...settingsData, parental_code: val });
                      }}
                      className="w-full bg-slate-900/80 text-cyan-400 font-mono text-2xl text-center tracking-[0.5em] px-4 py-3 rounded-lg border border-slate-700/50 focus:border-cyan-500 focus:outline-none focus:shadow-lg focus:shadow-cyan-500/10 transition-all"
                      placeholder="● ● ● ●"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={settingsLoading || settingsData.admin_code.length !== 4 || settingsData.parental_code.length !== 4}
                  className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-3 rounded-xl disabled:opacity-30 disabled:grayscale transition-all shadow-lg shadow-red-500/20 active:scale-[0.98] uppercase tracking-wider text-sm"
                >
                  💾 Sauvegarder les codes
                </button>

                <div className="text-[10px] text-slate-600 text-center uppercase tracking-wider">
                  ⚠ Notez bien le code admin si vous le changez
                </div>
              </>
            )}
          </motion.div>
        </div>
      ) : (
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden relative">
        {/* Liste utilisateurs */}
        <div className={`${selectedUser ? 'hidden md:block' : 'flex-1'} w-full md:w-1/3 border-b md:border-b-0 md:border-r border-red-500/10 overflow-y-auto p-3 space-y-1.5 bg-slate-950/90`}>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-[10px] font-bold text-red-400/80 uppercase tracking-widest">Joueurs</h3>
            <span className="text-[10px] text-red-400/60 font-mono bg-red-900/20 px-2 py-0.5 rounded-full">{users.length}</span>
          </div>
          {users.map((user) => (
            <motion.div
              key={user.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => fetchUserDetails(user.id)}
              className={`p-3 rounded-xl cursor-pointer transition-all ${
                selectedUser?.id === user.id 
                  ? 'bg-gradient-to-r from-red-900/40 to-orange-900/30 border border-red-500/50 shadow-lg shadow-red-500/10' 
                  : 'bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700/40 hover:border-slate-600/50'
              }`}
            >
              <div className="font-bold text-white text-sm truncate">{user.username}</div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[10px] text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded font-mono">{GRADE_DISPLAY[PRISMA_TO_FRONT[user.grade_level] || user.grade_level] || user.grade_level}</span>
                <span className="text-[10px] text-yellow-500 font-mono">{user.gold}💰</span>
                <span className="text-[10px] text-cyan-500 font-mono">{user.tokens}🎟️</span>
                <span className="text-[10px] text-purple-400 font-mono">{user.pokemon_count}📦</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Détails utilisateur */}
        <div className={`${!selectedUser ? 'hidden md:flex md:flex-col' : ''} flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950/60`}>
          {selectedUser ? (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="space-y-5 max-w-3xl mx-auto w-full"
            >
              {/* Retour mobile */}
              <button onClick={() => setSelectedUser(null)} className="md:hidden flex items-center gap-2 text-red-400 text-sm font-bold active:scale-95 transition-transform -mt-1 mb-1">← Retour à la liste</button>
              {/* Titre + actions */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-2xl font-display font-black bg-gradient-to-r from-white via-red-100 to-orange-200 bg-clip-text text-transparent">{selectedUser.username}</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Fiche joueur #{selectedUser.id}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setEditMode(!editMode)}
                    className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${editMode ? 'bg-green-600 text-white shadow-lg shadow-green-500/20' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/50'}`}
                  >
                    {editMode ? '✓ Édition' : '✏️ Modifier'}
                  </button>
                  <button
                    onClick={() => handleResetPassword(selectedUser.id)}
                    className="px-4 py-2 rounded-xl font-bold text-xs bg-yellow-600/80 hover:bg-yellow-500 text-white transition-all uppercase tracking-wider"
                  >
                    🔐 Mot de passe
                  </button>
                  <button
                    onClick={() => handleDeleteUser(selectedUser.id)}
                    className="px-4 py-2 rounded-xl font-bold text-xs bg-red-600/80 hover:bg-red-500 text-white transition-all uppercase tracking-wider"
                  >
                    🗑 Supprimer
                  </button>
                </div>
              </div>

              {/* Stats modifiables */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Or', icon: '💰', key: 'gold' as const, color: 'yellow', value: selectedUser.gold },
                  { label: 'Jetons', icon: '🎟️', key: 'tokens' as const, color: 'cyan', value: selectedUser.tokens },
                  { label: 'Expérience', icon: '⭐', key: 'global_xp' as const, color: 'purple', value: selectedUser.global_xp },
                ].map(({ label, icon, key, color, value }) => (
                  <AdminStatField
                    key={key}
                    label={label}
                    icon={icon}
                    fieldKey={key}
                    color={color}
                    displayValue={value}
                    editMode={editMode}
                    editValue={editData[key]}
                    onChange={(val) => setEditData({ ...editData, [key]: val })}
                  />
                ))}
                <div className="bg-slate-900/70 border border-green-500/20 rounded-xl p-3">
                  <label className="text-[10px] text-green-400/80 block mb-1 uppercase tracking-widest font-bold">📚 Niveau</label>
                  {editMode ? (
                    <select
                      value={editData.grade_level}
                      onChange={(e) => setEditData({ ...editData, grade_level: e.target.value })}
                      className="w-full bg-slate-800/80 text-green-400 font-mono px-2 py-1.5 rounded-lg border border-slate-700/50"
                    >
                      {['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6EME', '5EME', '4EME', '3EME'].map((g) => (
                        <option key={g} value={g}>{GRADE_DISPLAY[g] || g}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-green-400 font-mono text-xl font-bold">{GRADE_DISPLAY[PRISMA_TO_FRONT[selectedUser.grade_level] || selectedUser.grade_level] || selectedUser.grade_level}</div>
                  )}
                </div>
              </div>

              {editMode && (
                <motion.button
                  initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                  onClick={handleSaveEdit}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-3 rounded-xl active:scale-[0.98] transition-all shadow-lg shadow-green-500/20 uppercase tracking-wider text-sm"
                >
                  💾 Enregistrer les modifications
                </motion.button>
              )}

              {/* Ajouter Pokémon */}
              <div className="bg-slate-900/70 border border-purple-500/20 rounded-xl p-4">
                <h4 className="font-bold text-purple-400 mb-3 text-xs uppercase tracking-widest">➕ Ajouter un Pokémon</h4>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-500 block mb-1 uppercase tracking-widest">N° Pokédex</label>
                    <input
                      type="number"
                      value={addPokemonData.tyradex_id}
                      onChange={(e) => setAddPokemonData({ ...addPokemonData, tyradex_id: parseInt(e.target.value) || 1 })}
                      min={1}
                      max={151}
                      className="w-full bg-slate-800/80 text-white px-3 py-2.5 rounded-lg border border-slate-700/50 font-mono focus:border-purple-500/50 focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-500 block mb-1 uppercase tracking-widest">Niveau</label>
                    <input
                      type="number"
                      value={addPokemonData.level}
                      onChange={(e) => setAddPokemonData({ ...addPokemonData, level: parseInt(e.target.value) || 1 })}
                      min={1}
                      max={100}
                      className="w-full bg-slate-800/80 text-white px-3 py-2.5 rounded-lg border border-slate-700/50 font-mono focus:border-purple-500/50 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleAddPokemon}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2.5 rounded-lg transition-all active:scale-95 text-sm uppercase tracking-wider"
                  >
                    Ajouter
                  </button>
                </div>
              </div>

              {/* Liste Pokémon */}
              <div className="bg-slate-900/70 border border-slate-700/30 rounded-xl p-4">
                <h4 className="font-bold text-slate-300 mb-3 text-xs uppercase tracking-widest">📦 Pokémon <span className="text-slate-600">({selectedUser.pokemons.length})</span></h4>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2 max-h-56 overflow-y-auto pr-1">
                  {selectedUser.pokemons.map((poke) => (
                    <div key={poke.id} className={`bg-slate-800/60 rounded-xl p-2 text-center relative group border transition-all ${poke.is_team ? 'border-cyan-500/40' : 'border-transparent hover:border-slate-700/50'}`}>
                      <img
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${poke.tyradex_id}.png`}
                        className="w-12 h-12 mx-auto drop-shadow-lg"
                      />
                      <div className="text-[10px] text-white truncate font-bold">{poke.nickname || `#${poke.tyradex_id}`}</div>
                      <div className="text-[9px] text-slate-500 font-mono">Nv.{poke.level}</div>
                      {poke.is_team && <div className="text-[8px] text-cyan-400 font-bold mt-0.5">ÉQUIPE</div>}
                      <button
                        onClick={() => handleDeletePokemon(poke.id)}
                        className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-5 h-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-3">
              <span className="text-4xl opacity-30">👆</span>
              <p className="text-sm uppercase tracking-widest">Sélectionnez un joueur</p>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};
