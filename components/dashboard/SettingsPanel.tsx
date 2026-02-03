import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';

interface SettingsPanelProps {
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const { user } = useGameStore();
  const [activeTab, setActiveTab] = useState<'CONFIG' | 'ACCOUNT'>('CONFIG');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // État config
  const [gradeLevel, setGradeLevel] = useState(user?.grade_level || 'CE1');
  const [subjects, setSubjects] = useState<string[]>(
    user?.active_subjects ? JSON.parse(user.active_subjects as any) : ['MATHS', 'FRANCAIS']
  );
  const [aiMode, setAiMode] = useState(user?.custom_prompt_active || false);
  const [aiTopic, setAiTopic] = useState(user?.custom_prompt_text || '');

  const availableSubjects = ['MATHS', 'FRANCAIS', 'ANGLAIS', 'HISTOIRE', 'GEOGRAPHIE', 'SCIENCES'];

  const toggleSubject = (subject: string) => {
    if (subjects.includes(subject)) {
      setSubjects(subjects.filter(s => s !== subject));
    } else {
      setSubjects([...subjects, subject]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    
    try {
      const res = await api.post('/update_config.php', {
        grade_level: gradeLevel,
        active_subjects: subjects,
        custom_prompt_active: aiMode ? 1 : 0,
        custom_prompt_text: aiTopic
      });

      if (res.data.success) {
        setMessage('✅ Configuration sauvegardée');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessage('❌ Erreur lors de la sauvegarde');
      }
    } catch (error) {
      setMessage('❌ Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl bg-slate-900 border-2 border-cyan-500/50 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-4 flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold text-white">⚙️ PARAMÈTRES</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-slate-200 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab('CONFIG')}
            className={`flex-1 py-3 font-display font-bold transition ${
              activeTab === 'CONFIG'
                ? 'bg-slate-800 text-cyan-400 border-b-2 border-cyan-500'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            CONFIGURATION
          </button>
          <button
            onClick={() => setActiveTab('ACCOUNT')}
            className={`flex-1 py-3 font-display font-bold transition ${
              activeTab === 'ACCOUNT'
                ? 'bg-slate-800 text-cyan-400 border-b-2 border-cyan-500'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            COMPTE
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'CONFIG' ? (
            <div className="space-y-6">
              {/* Niveau scolaire */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">
                  📚 Niveau scolaire
                </label>
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white font-mono focus:border-cyan-500 focus:outline-none"
                >
                  <option value="CP">CP</option>
                  <option value="CE1">CE1</option>
                  <option value="CE2">CE2</option>
                  <option value="CM1">CM1</option>
                  <option value="CM2">CM2</option>
                  <option value="6EME">6ÈME</option>
                </select>
              </div>

              {/* Matières */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-3 uppercase tracking-wide">
                  📖 Matières actives
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availableSubjects.map((subject) => (
                    <button
                      key={subject}
                      onClick={() => toggleSubject(subject)}
                      className={`px-4 py-3 rounded-lg font-bold text-sm transition ${
                        subjects.includes(subject)
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {subject}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode IA */}
              <div className="border-t border-slate-800 pt-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-slate-300 uppercase tracking-wide">
                    🤖 Questions personnalisées (IA)
                  </label>
                  <button
                    onClick={() => setAiMode(!aiMode)}
                    className={`relative w-14 h-7 rounded-full transition ${
                      aiMode ? 'bg-cyan-600' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                        aiMode ? 'translate-x-8' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {aiMode && (
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="Ex: table de 7, les mois en anglais..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                )}
                <p className="text-xs text-slate-500 mt-2">
                  Génère automatiquement des questions adaptées au niveau
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <h3 className="font-bold text-white mb-2">Informations du compte</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Nom d'utilisateur :</span>
                    <span className="text-cyan-400 font-mono">{user?.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Niveau global :</span>
                    <span className="text-purple-400 font-bold">
                      {Math.floor((user?.global_xp || 0) / 100) + 1}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Crédits :</span>
                    <span className="text-yellow-400 font-bold">{user?.gold} ₵</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Jetons :</span>
                    <span className="text-cyan-400 font-bold">{user?.tokens}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 p-4 bg-slate-900/50 flex items-center justify-between gap-4">
          {message && (
            <div className="text-sm font-mono text-cyan-400">{message}</div>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold transition"
            >
              ANNULER
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold transition disabled:opacity-50"
            >
              {saving ? 'SAUVEGARDE...' : 'SAUVEGARDER'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
