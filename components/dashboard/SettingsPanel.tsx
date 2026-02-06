import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { motion } from 'framer-motion';
import { api } from '../../services/api';

interface SettingsPanelProps {
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const { user } = useGameStore();
  const [activeTab, setActiveTab] = useState<'CONFIG' | 'ACCOUNT'>('CONFIG');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [gradeLevel, setGradeLevel] = useState<string>(user?.grade_level || 'CE1');
  const [subjects, setSubjects] = useState<string[]>(() => {
    try {
      if (user?.active_subjects && typeof user.active_subjects === 'string') {
        const parsed = JSON.parse(user.active_subjects);
        return Array.isArray(parsed) ? parsed : ['MATHS', 'FRANCAIS'];
      }
      return Array.isArray(user?.active_subjects) ? user.active_subjects : ['MATHS', 'FRANCAIS'];
    } catch (e) {
      return ['MATHS', 'FRANCAIS'];
    }
  });
  const [aiMode, setAiMode] = useState(user?.custom_prompt_active || false);
  const [aiTopic, setAiTopic] = useState(user?.custom_prompt_text || '');

  const availableSubjects = ['MATHS', 'FRANCAIS', 'ANGLAIS', 'HISTOIRE', 'GEOGRAPHIE', 'SCIENCES'];
  
  const [focusCategories, setFocusCategories] = useState<Record<string, string>>(() => {
    try {
      if (user?.focus_categories) {
        if (typeof user.focus_categories === 'string') {
          return JSON.parse(user.focus_categories);
        }
        return user.focus_categories as Record<string, string>;
      }
      return {};
    } catch (e) {
      return {};
    }
  });

  const SUBJECT_CATEGORIES: Record<string, string[]> = {
    MATHS: ['Addition', 'Soustraction', 'Multiplication', 'Division', 'Géométrie', 'Numération', 'Problèmes'],
    FRANCAIS: ['Grammaire', 'Conjugaison', 'Orthographe', 'Vocabulaire', 'Lecture'],
    ANGLAIS: ['Vocabulaire', 'Verbes', 'Grammaire', 'Expression'],
    HISTOIRE: ['Antiquité', 'Moyen-Âge', 'Rois', 'Guerres', 'Contemporain'],
    GEOGRAPHIE: ['France', 'Europe', 'Monde', 'Continents', 'Villes'],
    SCIENCES: ['Corps humain', 'Animaux', 'Plantes', 'Matière', 'Énergie']
  };

  const toggleSubject = (subject: string) => {
    if (subjects.includes(subject)) {
      setSubjects(subjects.filter(s => s !== subject));
      setFocusCategories(prev => {
        const next = { ...prev };
        delete next[subject];
        return next;
      });
    } else {
      setSubjects([...subjects, subject]);
    }
  };

  const handleCategoryChange = (subject: string, category: string) => {
    setFocusCategories(prev => {
      const next = { ...prev };
      if (category === "") delete next[subject];
      else next[subject] = category;
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    
    try {
      const res = await api.put('/user/config', {
        grade_level: gradeLevel,
        active_subjects: subjects,
        focus_categories: focusCategories,
        custom_prompt_active: aiMode ? 1 : 0,
        custom_prompt_text: aiTopic
      });

      if (res.data.success) {
        // Mettre à jour le store directement au lieu de recharger la page
        useGameStore.setState((state) => ({
          user: state.user ? {
            ...state.user,
            grade_level: gradeLevel,
            active_subjects: subjects,
          } : null,
        }));
        setMessage('✅ Configuration sauvegardée');
        setTimeout(() => onClose(), 1200);
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
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-2 md:p-4 animate-in fade-in">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl bg-slate-900 border-2 border-cyan-500/50 rounded-xl md:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-3 md:p-4 flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-display font-bold text-white">⚙️ PARAMÈTRES</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-slate-200 text-xl md:text-2xl w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition"
          >
            ✕
          </button>
        </div>

        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab('CONFIG')}
            className={`flex-1 py-2 md:py-3 font-display font-bold transition text-sm md:text-base ${
              activeTab === 'CONFIG'
                ? 'bg-slate-800 text-cyan-400 border-b-2 border-cyan-500'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            CONFIGURATION
          </button>
          <button
            onClick={() => setActiveTab('ACCOUNT')}
            className={`flex-1 py-2 md:py-3 font-display font-bold transition text-sm md:text-base ${
              activeTab === 'ACCOUNT'
                ? 'bg-slate-800 text-cyan-400 border-b-2 border-cyan-500'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            COMPTE
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {activeTab === 'CONFIG' ? (
            <div className="space-y-4 md:space-y-6">
              <div>
                <label className="block text-xs md:text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">
                  📚 Niveau scolaire
                </label>
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 md:px-4 py-2 md:py-3 text-sm md:text-base text-white font-mono focus:border-cyan-500 focus:outline-none"
                >
                  <option value="CP">CP</option>
                  <option value="CE1">CE1</option>
                  <option value="CE2">CE2</option>
                  <option value="CM1">CM1</option>
                  <option value="CM2">CM2</option>
                  <option value="6EME">6ÈME</option>
                </select>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-bold text-slate-300 mb-2 md:mb-3 uppercase tracking-wide">
                  📖 Matières actives
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                  {availableSubjects.map((subject) => {
                    const isActive = subjects.includes(subject);
                    const categories = SUBJECT_CATEGORIES[subject] || [];
                    const currentFocus = focusCategories[subject] || '';

                    return (
                      <div 
                        key={subject} 
                        className={`p-2 md:p-3 rounded-lg border-2 transition-all ${
                          isActive 
                            ? 'bg-slate-800 border-cyan-500/50' 
                            : 'bg-slate-900 border-slate-700 opacity-60'
                        }`}
                      >
                        <button
                          onClick={() => toggleSubject(subject)}
                          className={`w-full text-left font-bold mb-2 flex items-center gap-2 text-xs md:text-sm ${
                            isActive ? 'text-cyan-400' : 'text-slate-500'
                          }`}
                        >
                          <div className={`w-3 h-3 md:w-4 md:h-4 border rounded flex items-center justify-center ${
                            isActive ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600'
                          }`}>
                            {isActive && <span className="text-black text-[10px] md:text-xs">✓</span>}
                          </div>
                          {subject}
                        </button>
                        
                        {isActive && categories.length > 0 && (
                          <select 
                            value={currentFocus}
                            onChange={(e) => handleCategoryChange(subject, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 text-[10px] md:text-xs text-white rounded px-2 md:px-3 py-1.5 md:py-2 outline-none focus:border-cyan-500"
                          >
                            <option value="">-- Tout le programme --</option>
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4 md:pt-6">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <label className="text-xs md:text-sm font-bold text-slate-300 uppercase tracking-wide">
                    🤖 Questions personnalisées (IA)
                  </label>
                  <button
                    onClick={() => setAiMode(!aiMode)}
                    className={`relative w-12 h-6 md:w-14 md:h-7 rounded-full transition ${
                      aiMode ? 'bg-cyan-600' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 md:w-5 md:h-5 bg-white rounded-full transition-transform ${
                        aiMode ? 'translate-x-7 md:translate-x-8' : 'translate-x-1'
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
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                )}
                <p className="text-[10px] md:text-xs text-slate-500 mt-2">
                  Génère automatiquement des questions adaptées au niveau
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 md:space-y-6">
              <div className="bg-slate-800 rounded-lg p-3 md:p-4 border border-slate-700">
                <h3 className="font-bold text-white mb-2 text-sm md:text-base">Informations du compte</h3>
                <div className="space-y-2 text-xs md:text-sm">
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

        <div className="border-t border-slate-800 p-3 md:p-4 bg-slate-900/50 flex items-center justify-between gap-2 md:gap-4">
          {message && (
            <div className="text-xs md:text-sm font-mono text-cyan-400">{message}</div>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 md:px-6 py-1.5 md:py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold transition text-xs md:text-sm"
            >
              ANNULER
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 md:px-6 py-1.5 md:py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold transition disabled:opacity-50 text-xs md:text-sm"
            >
              {saving ? 'SAUVEGARDE...' : 'SAUVEGARDER'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
