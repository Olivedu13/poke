import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

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

const ADMIN_CODE = 'poke_admin_2024';

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ gold: 0, tokens: 0, global_xp: 0, grade_level: 'CE1' });
  const [addPokemonData, setAddPokemonData] = useState({ tyradex_id: 25, level: 5 });

  const handleAuth = () => {
    if (codeInput === ADMIN_CODE) {
      setAuthenticated(true);
      fetchUsers();
    } else {
      setMessage('Code incorrect');
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users', { headers: { 'x-admin-code': ADMIN_CODE } });
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
      const res = await api.get(`/admin/user/${userId}`, { headers: { 'x-admin-code': ADMIN_CODE } });
      if (res.data.success) {
        setSelectedUser(res.data.data);
        setEditData({
          gold: res.data.data.gold,
          tokens: res.data.data.tokens,
          global_xp: res.data.data.global_xp,
          grade_level: res.data.data.grade_level,
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
        admin_code: ADMIN_CODE,
      }, { headers: { 'x-admin-code': ADMIN_CODE } });
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
        admin_code: ADMIN_CODE,
      }, { headers: { 'x-admin-code': ADMIN_CODE } });
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
        headers: { 'x-admin-code': ADMIN_CODE },
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

  if (!authenticated) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-xl flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-slate-900 border-2 border-red-500/50 rounded-2xl p-6 max-w-sm w-full"
        >
          <h2 className="text-2xl font-display font-bold text-red-400 mb-4 text-center">🔐 ACCÈS ADMIN</h2>
          <input
            type="password"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
            placeholder="Code secret..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white font-mono text-center focus:border-red-500 outline-none mb-4"
          />
          <button
            onClick={handleAuth}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl"
          >
            ENTRER
          </button>
          <button
            onClick={onClose}
            className="w-full mt-2 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold py-2 rounded-xl text-sm"
          >
            ANNULER
          </button>
          {message && <p className="text-red-400 text-center mt-3 text-sm">{message}</p>}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 p-4 flex items-center justify-between shrink-0">
        <h2 className="text-xl font-display font-bold text-white">👑 PANNEAU ADMIN</h2>
        <button onClick={onClose} className="text-white hover:text-slate-200 text-2xl">✕</button>
      </div>

      {message && (
        <div className="bg-yellow-600/20 text-yellow-400 text-sm p-2 text-center">{message}</div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Liste utilisateurs */}
        <div className="w-1/3 border-r border-slate-800 overflow-y-auto p-3 space-y-2">
          <h3 className="text-sm font-bold text-slate-400 mb-2">UTILISATEURS ({users.length})</h3>
          {users.map((user) => (
            <div
              key={user.id}
              onClick={() => fetchUserDetails(user.id)}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                selectedUser?.id === user.id ? 'bg-cyan-900/50 border border-cyan-500' : 'bg-slate-900 hover:bg-slate-800 border border-slate-700'
              }`}
            >
              <div className="font-bold text-white text-sm">{user.username}</div>
              <div className="text-xs text-slate-400">
                {user.grade_level} • {user.gold}💰 • {user.tokens}🎟️ • {user.pokemon_count}📦
              </div>
            </div>
          ))}
        </div>

        {/* Détails utilisateur */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedUser ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-display font-bold text-white">{selectedUser.username}</h3>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className={`px-4 py-2 rounded-lg font-bold text-sm ${
                    editMode ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {editMode ? 'MODE ÉDITION' : 'MODIFIER'}
                </button>
              </div>

              {/* Stats modifiables */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
                  <label className="text-xs text-slate-400 block mb-1">OR 💰</label>
                  {editMode ? (
                    <input
                      type="number"
                      value={editData.gold}
                      onChange={(e) => setEditData({ ...editData, gold: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-800 text-yellow-400 font-mono text-lg px-2 py-1 rounded"
                    />
                  ) : (
                    <div className="text-yellow-400 font-mono text-lg">{selectedUser.gold}</div>
                  )}
                </div>
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
                  <label className="text-xs text-slate-400 block mb-1">TOKENS 🎟️</label>
                  {editMode ? (
                    <input
                      type="number"
                      value={editData.tokens}
                      onChange={(e) => setEditData({ ...editData, tokens: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-800 text-cyan-400 font-mono text-lg px-2 py-1 rounded"
                    />
                  ) : (
                    <div className="text-cyan-400 font-mono text-lg">{selectedUser.tokens}</div>
                  )}
                </div>
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
                  <label className="text-xs text-slate-400 block mb-1">XP ⭐</label>
                  {editMode ? (
                    <input
                      type="number"
                      value={editData.global_xp}
                      onChange={(e) => setEditData({ ...editData, global_xp: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-800 text-purple-400 font-mono text-lg px-2 py-1 rounded"
                    />
                  ) : (
                    <div className="text-purple-400 font-mono text-lg">{selectedUser.global_xp}</div>
                  )}
                </div>
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
                  <label className="text-xs text-slate-400 block mb-1">NIVEAU 📚</label>
                  {editMode ? (
                    <select
                      value={editData.grade_level}
                      onChange={(e) => setEditData({ ...editData, grade_level: e.target.value })}
                      className="w-full bg-slate-800 text-green-400 font-mono px-2 py-1 rounded"
                    >
                      {['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6EME'].map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-green-400 font-mono text-lg">{selectedUser.grade_level}</div>
                  )}
                </div>
              </div>

              {editMode && (
                <button
                  onClick={handleSaveEdit}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl"
                >
                  💾 SAUVEGARDER
                </button>
              )}

              {/* Ajouter Pokémon */}
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                <h4 className="font-bold text-white mb-3">➕ AJOUTER UN POKÉMON</h4>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 block mb-1">ID Pokédex</label>
                    <input
                      type="number"
                      value={addPokemonData.tyradex_id}
                      onChange={(e) => setAddPokemonData({ ...addPokemonData, tyradex_id: parseInt(e.target.value) || 1 })}
                      min={1}
                      max={151}
                      className="w-full bg-slate-800 text-white px-3 py-2 rounded"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 block mb-1">Niveau</label>
                    <input
                      type="number"
                      value={addPokemonData.level}
                      onChange={(e) => setAddPokemonData({ ...addPokemonData, level: parseInt(e.target.value) || 1 })}
                      min={1}
                      max={100}
                      className="w-full bg-slate-800 text-white px-3 py-2 rounded"
                    />
                  </div>
                  <button
                    onClick={handleAddPokemon}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded"
                  >
                    AJOUTER
                  </button>
                </div>
              </div>

              {/* Liste Pokémon */}
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                <h4 className="font-bold text-white mb-3">📦 POKÉMON ({selectedUser.pokemons.length})</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {selectedUser.pokemons.map((poke) => (
                    <div key={poke.id} className="bg-slate-800 rounded p-2 text-center relative group">
                      <img
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${poke.tyradex_id}.png`}
                        className="w-12 h-12 mx-auto"
                      />
                      <div className="text-xs text-white truncate">{poke.nickname || `#${poke.tyradex_id}`}</div>
                      <div className="text-[10px] text-slate-400">Nv.{poke.level}</div>
                      <button
                        onClick={() => handleDeletePokemon(poke.id)}
                        className="absolute top-1 right-1 bg-red-600 text-white text-xs w-5 h-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              Sélectionnez un utilisateur
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
