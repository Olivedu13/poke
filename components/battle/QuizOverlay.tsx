
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Question, ApiResponse, User } from '../../types';
import { API_BASE_URL, ASSETS_BASE_URL } from '../../config';
import { useGameStore } from '../../store/gameStore';

interface QuizOverlayProps {
  user: User;
  onComplete: (isCorrect: boolean, dmgDealt: number, difficulty: string) => void;
  onClose: () => void;
}

export const QuizOverlay: React.FC<QuizOverlayProps> = ({ user, onComplete, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [result, setResult] = useState<{correct: boolean, explanation: string} | null>(null);
  const [error, setError] = useState<string>('');
  
  // Hooks Store
  const { seenQuestionIds, markQuestionAsSeen, inventory, fetchInventory, playerPokemon } = useGameStore();
  
  const submitting = useRef(false);
  const [isUsingJoker, setIsUsingJoker] = useState(false);

  // Recherche d'un item JOKER dans l'inventaire
  const jokerItem = inventory.find(i => i.effect_type === 'JOKER' || (i.id && i.id.includes('joker')));

  const getOfflineQuestion = (): Question => {
      return {
          id: 'offline_' + Date.now(),
          source: 'LOCAL',
          subject: 'MATHS',
          difficulty: 'EASY',
          category: 'OFFLINE',
          question_text: 'CONNEXION QG PERDUE. Question de secours : Combien font 5 + 5 ?',
          options: ['8', '10', '12', '55'],
          correct_index: 1,
          explanation: '5 + 5 font 10. Le serveur est injoignable mais le combat continue !'
      };
  };

  const fetchQuestion = useCallback(async () => {
      setLoading(true);
      setError('');
      submitting.current = false;
      
      const excludedIdsParam = seenQuestionIds.join(',');

      try {
        const res = await axios.get<ApiResponse<Question>>(`${API_BASE_URL}/get_question.php`, {
            params: {
                user_id: user.id,
                exclude_ids: excludedIdsParam
            },
            timeout: 8000 
        });
        
        let data = res.data;
        if (typeof data === 'string') {
            try {
                const jsonStart = (data as string).indexOf('{');
                if (jsonStart > -1) {
                    data = JSON.parse((data as string).substring(jsonStart));
                } else {
                    data = JSON.parse(data);
                }
            } catch (e) { console.warn("Parse error", e); }
        }

        if (data && data.success && data.data) {
          setQuestion(data.data);
          markQuestionAsSeen(data.data.id); // Add to seen list immediately
        } else {
            console.warn("Invalid API data, switching to offline.", data);
            setQuestion(getOfflineQuestion());
        }
      } catch (err: any) {
        console.error("Network Error, switching to offline mode.", err);
        setQuestion(getOfflineQuestion());
      } finally {
        setLoading(false);
      }
  }, [user.id, seenQuestionIds]);

  useEffect(() => {
    fetchQuestion();
  }, []);

  const handleAnswer = async (index: number) => {
    // LOCK immediately to prevent double submissions
    if (submitting.current || selectedOption !== null || !question) return;
    submitting.current = true;
    
    setSelectedOption(index);

    const isCorrect = index === question.correct_index;
    
    // Combat Calc (Optimiste)
    let damage = isCorrect ? 25 : 0;
    
    try {
        const combatRes = await axios.post(`${API_BASE_URL}/combat_engine.php`, {
            is_correct: isCorrect,
            attacker_level: Math.floor(user.global_xp / 100) + 1,
            attacker_type: 'FIRE', 
            enemy_type: 'PLANTE'
        }, { timeout: 2000 });
        if(combatRes.data && combatRes.data.damage) damage = combatRes.data.damage;
    } catch (e) {
        // Mode déconnecté : dégâts standards
    }

    setResult({
        correct: isCorrect,
        explanation: question.explanation
    });

    setTimeout(() => {
        onComplete(isCorrect, damage, question.difficulty);
    }, 2500); 
  };

  // Gestion du Joker
  const handleJokerUse = async () => {
      if (isUsingJoker || submitting.current || !jokerItem || !question) return;
      setIsUsingJoker(true);
      submitting.current = true; // Block manual answers while processing

      try {
          // Appel API pour consommer l'item
          await axios.post(`${API_BASE_URL}/collection.php`, {
              action: 'use_item',
              user_id: user.id,
              item_id: jokerItem.id,
              pokemon_id: playerPokemon?.id || 0 // Requis par l'API même si ignoré pour Joker
          });
          
          await fetchInventory(); // Mise à jour stock

          // On libère le lock pour permettre à handleAnswer de s'exécuter
          submitting.current = false;
          
          // On simule le clic sur la bonne réponse
          handleAnswer(question.correct_index);

      } catch (e) {
          console.error("Erreur lors de l'utilisation du Joker", e);
          setIsUsingJoker(false);
          submitting.current = false;
      }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end md:items-center justify-center bg-slate-950/80 backdrop-blur-xl p-0 md:p-4 animate-in fade-in duration-300">
      <AnimatePresence>
        {loading ? (
            <div className="flex flex-col items-center justify-center h-full pb-20">
                <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <div className="text-cyan-400 font-display text-xl animate-pulse">DÉCRYPTAGE...</div>
                {user.custom_prompt_active && (
                    <div className="text-xs text-purple-400 mt-2 font-mono">
                        GENERATION SUJET: {user.custom_prompt_text}
                    </div>
                )}
            </div>
        ) : error ? (
            <div className="bg-red-900/80 border border-red-500 p-6 rounded-xl text-center max-w-sm m-auto">
                <div className="text-4xl mb-2">📡⚠️</div>
                <h3 className="text-white font-bold mb-2">ERREUR CRITIQUE</h3>
                <p className="text-red-200 text-sm mb-6">{error}</p>
                <button onClick={fetchQuestion} className="bg-cyan-600 hover:bg-cyan-500 text-black px-6 py-2 rounded font-bold">RÉESSAYER</button>
            </div>
        ) : question ? (
            <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="w-full h-[90%] md:h-auto md:max-w-2xl bg-slate-900/90 border-t-2 md:border border-cyan-500 md:rounded-2xl shadow-2xl overflow-y-auto flex flex-col relative"
            >
                {/* Header Question */}
                <div className="p-6 border-b border-cyan-900/50 bg-slate-950/50 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                        <div className="flex flex-wrap gap-2">
                            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest border border-cyan-900 px-2 py-0.5 rounded">
                                {question.subject}
                            </span>
                             <span className={`text-xs font-mono uppercase tracking-widest border px-2 py-0.5 rounded ${question.difficulty === 'HARD' ? 'text-red-400 border-red-900' : question.difficulty === 'MEDIUM' ? 'text-yellow-400 border-yellow-900' : 'text-green-400 border-green-900'}`}>
                                {question.difficulty}
                            </span>
                            {question.source === 'AI' && (
                                <span className="text-xs font-mono text-purple-400 border border-purple-900 px-2 py-0.5 rounded animate-pulse">
                                    CIBLE IA
                                </span>
                            )}
                        </div>
                        <button onClick={onClose} className="text-slate-500 hover:text-white px-2">✕</button>
                    </div>
                    
                    <h3 className="text-xl md:text-2xl font-bold text-white leading-snug mt-2">
                        {question.question_text}
                    </h3>
                </div>

                {/* BOUTON JOKER (Si disponible et pas encore répondu) */}
                {jokerItem && jokerItem.quantity > 0 && selectedOption === null && (
                    <div className="px-6 pt-4 flex justify-end">
                         <button 
                            onClick={handleJokerUse}
                            disabled={isUsingJoker}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/50 bg-purple-900/20 text-purple-300 font-bold text-xs uppercase hover:bg-purple-900/40 hover:scale-105 transition-all ${isUsingJoker ? 'opacity-50 cursor-wait' : ''}`}
                         >
                             <img src={`${ASSETS_BASE_URL}/joker.webp`} className="w-5 h-5 object-contain" onError={(e) => e.currentTarget.style.display='none'}/>
                             <span>UTILISER JOKER (x{jokerItem.quantity})</span>
                         </button>
                    </div>
                )}

                {/* Options Grid */}
                <div className="flex-1 p-6 flex flex-col justify-center gap-3">
                    {Array.isArray(question.options) && question.options.map((opt, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleAnswer(idx)}
                            disabled={selectedOption !== null || isUsingJoker}
                            className={`
                                w-full p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden active:scale-[0.98]
                                flex items-center gap-4
                                ${selectedOption === null 
                                    ? 'border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-cyan-500/50' 
                                    : idx === question.correct_index 
                                        ? 'border-green-500 bg-green-900/40 text-green-100 shadow-[0_0_20px_rgba(34,197,94,0.3)]' 
                                        : selectedOption === idx 
                                            ? 'border-red-500 bg-red-900/40 text-red-100' 
                                            : 'border-slate-800 opacity-30'
                                }
                            `}
                        >
                            <div className={`
                                w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0
                                ${idx === question.correct_index && selectedOption !== null ? 'bg-green-500 text-black' : 'bg-slate-700 text-slate-300'}
                            `}>
                                {['A', 'B', 'C', 'D'][idx]}
                            </div>
                            <span className="font-bold text-md md:text-lg">{opt}</span>
                        </button>
                    ))}
                </div>

                {/* Footer Feedback */}
                <AnimatePresence>
                    {result && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className={`p-4 border-t ${result.correct ? 'bg-green-900/30 border-green-500/30' : 'bg-red-900/30 border-red-500/30'}`}
                        >
                             <div className="flex items-center gap-3 mb-1">
                                <span className="text-2xl">{result.correct ? '🎯' : '⚠️'}</span>
                                <span className={`font-display font-black text-lg ${result.correct ? 'text-green-400' : 'text-red-400'}`}>
                                    {result.correct ? 'EXCELLENT !' : 'ERREUR'}
                                </span>
                             </div>
                             <p className="text-sm text-slate-300 pl-10 leading-relaxed">
                                {result.explanation}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
