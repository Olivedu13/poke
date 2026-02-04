import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useGameStore } from '../../store/gameStore';
import { GradeLevel, Subject } from '../../types';

const GRADES: GradeLevel[] = ['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6EME', '5EME', '4EME', '3EME'];
const SUBJECTS: Subject[] = ['MATHS', 'FRANCAIS', 'ANGLAIS', 'HISTOIRE', 'GEO', 'PHYSIQUE', 'SVT'];

const SUBJECT_CATEGORIES: Record<string, string[]> = {
    MATHS: ['Addition', 'Soustraction', 'Multiplication', 'Division', 'Géométrie', 'Numération', 'Problèmes'],
    FRANCAIS: ['Grammaire', 'Conjugaison', 'Orthographe', 'Vocabulaire', 'Lecture'],
    ANGLAIS: ['Vocabulaire', 'Verbes', 'Grammaire', 'Expression'],
    HISTOIRE: ['Antiquité', 'Moyen-Âge', 'Rois', 'Guerres', 'Contemporain'],
    GEO: ['France', 'Europe', 'Monde', 'Continents', 'Villes'],
    SVT: ['Corps humain', 'Animaux', 'Plantes', 'Matière'],
    PHYSIQUE: ['Atomes', 'Vitesse', 'Électricité', 'Énergie']
};

export const ParentDashboard: React.FC = () => {
  const { user, updateUserConfig } = useGameStore();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const [grade, setGrade] = useState<GradeLevel>(user?.grade_level || 'CE1');
  const [activeSubjects, setActiveSubjects] = useState<Subject[]>(user?.active_subjects || []);
  const [focusCategories, setFocusCategories] = useState<Record<string, string>>(user?.focus_categories || {});
  const [customPromptActive, setCustomPromptActive] = useState(user?.custom_prompt_active || false);
  const [customPromptText, setCustomPromptText] = useState(user?.custom_prompt_text || '');

  useEffect(() => {
    if (user) {
      setGrade(user.grade_level);
      setActiveSubjects(user.active_subjects);
      setCustomPromptActive(user.custom_prompt_active);
      setCustomPromptText(user.custom_prompt_text || '');
      if (typeof user.focus_categories === 'string') {
          try { setFocusCategories(JSON.parse(user.focus_categories)); } catch(e) { setFocusCategories({}); }
      } else {
          setFocusCategories(user.focus_categories || {});
      }
    }
  }, [user]);

  const toggleSubject = (sub: Subject) => {
    if (activeSubjects.includes(sub)) {
      setActiveSubjects(activeSubjects.filter(s => s !== sub));
      setFocusCategories(prev => {
          const next = { ...prev };
          delete next[sub];
          return next;
      });
    } else {
      setActiveSubjects([...activeSubjects, sub]);
    }
  };

  const handleCategoryChange = (sub: string, cat: string) => {
      setFocusCategories(prev => {
          const next = { ...prev };
          if (cat === "") delete next[sub];
          else next[sub] = cat;
          return next;
      });
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setMessage('');
    setIsError(false);

    try {
      const payload = {
        grade_level: grade,
        active_subjects: activeSubjects,
        focus_categories: focusCategories, 
        custom_prompt_active: customPromptActive ? 1 : 0,
        custom_prompt_text: customPromptText
      };

      const res = await api.put('/user/config', payload);
      
      if (res.data.success) {
          updateUserConfig({
            grade_level: grade,
            active_subjects: activeSubjects,
            focus_categories: focusCategories,
            custom_prompt_active: customPromptActive,
            custom_prompt_text: customPromptText
          });

          setMessage('✅ Configuration Sauvegardée');
          setTimeout(() => setMessage(''), 3000);
      } else {
          throw new Error(res.data.message || 'Erreur inconnue');
      }
    } catch (error: any) {
      console.error("Save Error:", error);
      setIsError(true);
      setMessage(`❌ Erreur: ${error.response?.data?.message || 'Échec de la sauvegarde'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 px-2 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-center border-b border-slate-800 pb-3 md:pb-4 gap-2">
        <h2 className="text-xl md:text-2xl font-display font-bold text-white">
          CONTRÔLE <span className="text-cyan-500">PARENTAL</span>
        </h2>
        <div className="bg-slate-900 border border-slate-700 px-3 md:px-4 py-1 rounded-full text-xs font-mono text-slate-400">
          UTILISATEUR: {user?.username}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:gap-8">
        <div className="bg-slate-900/50 border border-cyan-500/30 p-4 md:p-6 rounded-xl relative group hover:border-cyan-500/60 transition-colors">
            <h3 className="text-xs md:text-sm font-display text-cyan-400 mb-3 md:mb-4 uppercase tracking-wider">1. Niveau Scolaire</h3>
            <div className="grid grid-cols-3 md:grid-cols-9 gap-1.5 md:gap-2">
              {GRADES.map((g) => (
                <button
                  key={g}
                  onClick={() => setGrade(g)}
                  className={`py-2 px-2 text-xs md:text-sm font-bold rounded border transition-all ${
                    grade === g 
                      ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]' 
                      : 'bg-slate-950 text-slate-400 border-slate-700 hover:border-cyan-500/50'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
        </div>

        <div className="bg-slate-900/50 border border-cyan-500/30 p-4 md:p-6 rounded-xl">
            <h3 className="text-xs md:text-sm font-display text-cyan-400 mb-3 md:mb-4 uppercase tracking-wider">2. Programme de Révision</h3>
            <p className="text-[10px] md:text-xs text-slate-400 mb-3 md:mb-4">Sélectionnez les matières actives</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {SUBJECTS.map((sub) => {
                  const isActive = activeSubjects.includes(sub);
                  const cats = SUBJECT_CATEGORIES[sub] || [];
                  const currentFocus = focusCategories[sub] || '';

                  return (
                    <div key={sub} className={`p-2 md:p-3 rounded-lg border-2 transition-all ${isActive ? 'bg-slate-900 border-green-500/50' : 'bg-slate-950 border-slate-800 opacity-60'}`}>
                        <button
                          onClick={() => toggleSubject(sub)}
                          className={`w-full text-left font-display font-bold mb-2 flex items-center gap-2 text-xs md:text-sm ${isActive ? 'text-green-400' : 'text-slate-500'}`}
                        >
                          <div className={`w-4 h-4 border rounded flex items-center justify-center ${isActive ? 'bg-green-500 border-green-500' : 'border-slate-600'}`}>
                              {isActive && <span className="text-black text-xs">✓</span>}
                          </div>
                          {sub}
                        </button>
                        
                        {isActive && cats.length > 0 && (
                            <select 
                                value={currentFocus}
                                onChange={(e) => handleCategoryChange(sub, e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 text-[10px] md:text-xs text-white rounded p-1.5 md:p-2 outline-none focus:border-green-500"
                            >
                                <option value="">-- Tout --</option>
                                {cats.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        )}
                    </div>
                  );
              })}
            </div>
        </div>

        <div className="bg-slate-900/80 border border-purple-500/30 p-4 md:p-6 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.1)] relative overflow-hidden">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h3 className="text-xs md:text-sm font-display text-purple-400 uppercase tracking-wider flex items-center gap-2">
              Mode "Sujet Libre" (IA)
            </h3>
            <button 
              onClick={() => setCustomPromptActive(!customPromptActive)}
              className={`w-10 h-5 md:w-12 md:h-6 rounded-full p-0.5 md:p-1 transition-colors ${customPromptActive ? 'bg-purple-500' : 'bg-slate-700'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${customPromptActive ? 'translate-x-5 md:translate-x-6' : 'translate-x-0'}`}></div>
            </button>
          </div>
          <div className={`space-y-4 transition-opacity duration-300 ${customPromptActive ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <textarea
                value={customPromptText}
                onChange={(e) => setCustomPromptText(e.target.value)}
                placeholder="Ex: Les dinosaures, La Révolution Française..."
                rows={3}
                className="w-full bg-slate-950 border border-purple-500/30 rounded-lg p-2 md:p-3 text-xs md:text-sm text-purple-100 outline-none placeholder-slate-700 resize-none"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 pt-4 md:pt-6 border-t border-slate-800 sticky bottom-16 md:bottom-0 bg-slate-950/95 p-3 md:p-4 rounded-t-xl backdrop-blur-md z-40">
        {message && (
          <span className={`font-mono text-xs md:text-sm animate-pulse ${isError ? 'text-red-400' : 'text-green-400'}`}>
             {message}
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-cyan-600 hover:bg-cyan-500 text-black font-display font-bold py-2 md:py-3 px-6 md:px-8 rounded-lg transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50 text-sm md:text-base"
        >
          {isSaving ? 'SAUVEGARDE...' : 'SAUVEGARDER'}
        </button>
      </div>
    </div>
  );
};
