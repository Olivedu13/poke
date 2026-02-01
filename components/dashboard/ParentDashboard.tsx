
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useGameStore } from '../../store/gameStore';
import { GradeLevel, Subject } from '../../types';
import { API_BASE_URL } from '../../config';

const GRADES: GradeLevel[] = ['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6EME', '5EME', '4EME', '3EME'];
const SUBJECTS: Subject[] = ['MATHS', 'FRANCAIS', 'ANGLAIS', 'HISTOIRE', 'GEO', 'PHYSIQUE', 'SVT'];

export const ParentDashboard: React.FC = () => {
  const { user, updateUserConfig } = useGameStore();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Local state for form handling before save
  const [grade, setGrade] = useState<GradeLevel>(user?.grade_level || 'CE1');
  const [activeSubjects, setActiveSubjects] = useState<Subject[]>(user?.active_subjects || []);
  const [customPromptActive, setCustomPromptActive] = useState(user?.custom_prompt_active || false);
  const [customPromptText, setCustomPromptText] = useState(user?.custom_prompt_text || '');

  useEffect(() => {
    if (user) {
      setGrade(user.grade_level);
      setActiveSubjects(user.active_subjects);
      setCustomPromptActive(user.custom_prompt_active);
      setCustomPromptText(user.custom_prompt_text || '');
    }
  }, [user]);

  const toggleSubject = (sub: Subject) => {
    if (activeSubjects.includes(sub)) {
      setActiveSubjects(activeSubjects.filter(s => s !== sub));
    } else {
      setActiveSubjects([...activeSubjects, sub]);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setMessage('');

    try {
      const payload = {
        user_id: user.id,
        grade_level: grade,
        active_subjects: activeSubjects,
        custom_prompt_active: customPromptActive ? 1 : 0,
        custom_prompt_text: customPromptText
      };

      await axios.post(`${API_BASE_URL}/update_config.php`, payload);
      
      // Update global store
      updateUserConfig({
        grade_level: grade,
        active_subjects: activeSubjects,
        custom_prompt_active: customPromptActive,
        custom_prompt_text: customPromptText
      });

      setMessage('Configuration Sauvegardée !');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Erreur lors de la sauvegarde.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-display font-bold text-white">
          CONTRÔLE <span className="text-cyan-500">PARENTAL</span>
        </h2>
        <div className="bg-slate-900 border border-slate-700 px-4 py-1 rounded-full text-xs font-mono text-slate-400">
          UTILISATEUR: {user?.username}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Col: Standard Config */}
        <div className="space-y-6">
          
          {/* Grade Selector */}
          <div className="bg-slate-900/50 border border-cyan-500/30 p-6 rounded-xl relative group hover:border-cyan-500/60 transition-colors">
            <h3 className="text-sm font-display text-cyan-400 mb-4 uppercase tracking-wider">Niveau Scolaire</h3>
            <div className="grid grid-cols-3 gap-2">
              {GRADES.map((g) => (
                <button
                  key={g}
                  onClick={() => setGrade(g)}
                  className={`py-2 px-3 text-sm font-bold rounded border transition-all ${
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

          {/* Subject Toggles */}
          <div className="bg-slate-900/50 border border-cyan-500/30 p-6 rounded-xl">
            <h3 className="text-sm font-display text-cyan-400 mb-4 uppercase tracking-wider">Matières Actives</h3>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map((sub) => (
                <button
                  key={sub}
                  onClick={() => toggleSubject(sub)}
                  className={`flex-1 min-w-[30%] py-3 rounded-lg border-2 font-display font-bold text-sm transition-all ${
                    activeSubjects.includes(sub)
                      ? 'border-green-500 bg-green-500/10 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                      : 'border-slate-800 bg-slate-950 text-slate-600 grayscale'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right Col: AI Config */}
        <div className="bg-slate-900/80 border border-purple-500/30 p-6 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.1)] relative overflow-hidden">
          {/* AI Decor */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/20 blur-[50px] pointer-events-none"></div>
          
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-display text-purple-400 uppercase tracking-wider flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Mode IA Personnalisé
            </h3>
            
            {/* Toggle Switch */}
            <button 
              onClick={() => setCustomPromptActive(!customPromptActive)}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${customPromptActive ? 'bg-purple-500' : 'bg-slate-700'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${customPromptActive ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
          </div>

          <div className={`space-y-4 transition-opacity duration-300 ${customPromptActive ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <p className="text-xs text-slate-300 leading-relaxed">
              Activez l'IA pour générer des questions sur des sujets spécifiques.
              <br/><span className="italic text-slate-500">Ex: "Table de 9", "Dinosaures", "Verbes du 2e groupe"</span>
            </p>
            
            <textarea
              value={customPromptText}
              onChange={(e) => setCustomPromptText(e.target.value)}
              placeholder="Entrez le sujet spécifique ici..."
              rows={4}
              className="w-full bg-slate-950 border border-purple-500/30 rounded-lg p-3 text-purple-100 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 outline-none placeholder-slate-700 resize-none"
            />
            
            <div className="flex items-center gap-2 text-[10px] text-purple-400/60 uppercase font-mono border border-purple-500/20 p-2 rounded">
              <span>Propulsé par Gemini 2.5</span>
              <div className="h-1 w-1 bg-purple-500 rounded-full animate-ping"></div>
            </div>
          </div>
        </div>

      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-800">
        {message && (
          <span className="text-green-400 font-mono text-sm animate-pulse">{message}</span>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-cyan-600 hover:bg-cyan-500 text-black font-display font-bold py-3 px-8 rounded-lg transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] disabled:opacity-50"
        >
          {isSaving ? 'ENREGISTREMENT...' : 'SAUVEGARDER CONFIG'}
        </button>
      </div>
      
    </div>
  );
};
