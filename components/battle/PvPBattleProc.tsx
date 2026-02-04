import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { playSfx } from '../../utils/soundEngine';
import { useGameStore } from '../../store/gameStore';

interface PokemonData {
    id: number;
    tyradex_id: number;
    level: number;
    name: string;
    sprite_url: string;
    current_hp: number;
    max_hp: number;
}

interface MatchState {
    id: number;
    player1_id: number;
    player2_id: number;
    player1_name: string;
    player2_name: string;
    player1_team: PokemonData[];
    player2_team: PokemonData[];
    player1_team_hp: number[];
    player2_team_hp: number[];
    player1_active_pokemon: number;
    player2_active_pokemon: number;
    current_turn: number;
    status: string;
    winner_id?: number;
    xp_reward?: number;
}

interface Question {
    id: number;
    question_text: string;
    options: string[];
    correct_index: number;
    difficulty: string;
}

interface TurnHistory {
    id: number;
    turn_number: number;
    player_id: number;
    player_name: string;
    question_text: string;
    question_options: string[];
    correct_index: number;
    answer_index: number;
    is_correct: boolean;
    damage_dealt: number;
}

export const PvPBattleProc: React.FC = () => {
    const { user, setBattlePhase } = useGameStore();
    const [matchState, setMatchState] = useState<MatchState | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [history, setHistory] = useState<TurnHistory[]>([]);
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [waitingForOpponent, setWaitingForOpponent] = useState(false);

    // Récupérer les infos du match depuis localStorage
    const matchInfo = JSON.parse(localStorage.getItem('pvp_match') || '{}');
    const matchId = matchInfo.match_id;

    // Initialiser le combat (tirage au sort)
    const initBattle = async () => {
        try {
            const res = await api.get(`/pvp_battle_procedural.php?action=init_battle&match_id=${matchId}`);
            if (res.data.success) {
                playSfx(res.data.is_my_turn ? 'victory' : 'buttonClick');
                await fetchState();
            }
        } catch (e) {
            console.error('Erreur init combat:', e);
        }
    };

    // Récupérer l'état du match
    const fetchState = async () => {
        try {
            const res = await api.get(`/pvp_battle_procedural.php?action=get_state&match_id=${matchId}`);
            if (res.data.success) {
                setMatchState(res.data.match);
                setHistory(res.data.history);
                setIsMyTurn(res.data.is_my_turn);
                setCurrentQuestion(res.data.current_question);
                setLoading(false);
                setError(null);
                
                // Si c'est mon tour et qu'il n'y a pas de question, en demander une
                if (res.data.is_my_turn && !res.data.current_question && res.data.match.status === 'IN_PROGRESS') {
                    await fetchQuestion();
                } else if (!res.data.is_my_turn) {
                    setWaitingForOpponent(true);
                }
            }
        } catch (e) {
            console.error('Erreur récupération état:', e);
            setError('Erreur lors de la récupération de l\'état du combat');
            setLoading(false);
        }
    };

    // Récupérer une nouvelle question
    const fetchQuestion = async () => {
        try {
            const res = await api.get(`/pvp_battle_procedural.php?action=get_question&match_id=${matchId}`);
            if (res.data.success) {
                setCurrentQuestion(res.data.question);
                setSelectedAnswer(null);
            }
        } catch (e) {
            console.error('Erreur récupération question:', e);
        }
    };

    // Soumettre une réponse
    const submitAnswer = async () => {
        if (selectedAnswer === null) return;
        
        try {
            const res = await api.post('/pvp_battle_procedural.php', {
                action: 'submit_answer',
                match_id: matchId,
                answer_index: selectedAnswer
            });
            
            if (res.data.success) {
                playSfx(res.data.is_correct ? 'hit' : 'miss');
                
                if (res.data.game_over) {
                    // Partie terminée
                    playSfx(res.data.winner_id === user?.id ? 'victory' : 'defeat');
                    await fetchState(); // Recharger l'état final
                } else {
                    // Passer au tour suivant
                    setWaitingForOpponent(true);
                    setCurrentQuestion(null);
                    setSelectedAnswer(null);
                    await fetchState();
                }
            }
        } catch (e) {
            console.error('Erreur soumission réponse:', e);
        }
    };

    // Abandonner
    const forfeit = async () => {
        if (!confirm('Es-tu sûr de vouloir abandonner ?')) return;
        
        try {
            const res = await api.get(`/pvp_battle_procedural.php?action=forfeit&match_id=${matchId}`);
            if (res.data.success) {
                playSfx('defeat');
                await fetchState();
            }
        } catch (e) {
            console.error('Erreur abandon:', e);
        }
    };

    // Polling pour mettre à jour l'état
    useEffect(() => {
        if (!matchId) {
            setError('Aucun match en cours');
            setLoading(false);
            return;
        }

        initBattle();

        const interval = setInterval(() => {
            fetchState();
        }, 2000); // Rafraîchir toutes les 2 secondes

        return () => clearInterval(interval);
    }, [matchId]);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center bg-slate-950">
                <div className="text-purple-500 font-display animate-pulse text-2xl">
                    ⚔️ CHARGEMENT DU COMBAT...
                </div>
            </div>
        );
    }

    if (error || !matchState) {
        return (
            <div className="flex h-full items-center justify-center bg-slate-950 flex-col gap-4">
                <div className="text-red-500 font-display text-xl">❌ {error}</div>
                <button 
                    onClick={() => setBattlePhase('LOBBY')}
                    className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold"
                >
                    RETOUR AU LOBBY
                </button>
            </div>
        );
    }

    const amPlayer1 = matchState.player1_id === user?.id;
    const myTeam = amPlayer1 ? matchState.player1_team : matchState.player2_team;
    const opponentTeam = amPlayer1 ? matchState.player2_team : matchState.player1_team;
    const myTeamHp = amPlayer1 ? matchState.player1_team_hp : matchState.player2_team_hp;
    const opponentTeamHp = amPlayer1 ? matchState.player2_team_hp : matchState.player1_team_hp;
    const myActivePokemon = amPlayer1 ? matchState.player1_active_pokemon : matchState.player2_active_pokemon;
    const opponentActivePokemon = amPlayer1 ? matchState.player2_active_pokemon : matchState.player1_active_pokemon;
    const myName = amPlayer1 ? matchState.player1_name : matchState.player2_name;
    const opponentName = amPlayer1 ? matchState.player2_name : matchState.player1_name;

    // Partie terminée
    if (matchState.status === 'COMPLETED' || matchState.status === 'ABANDONED') {
        const iWon = matchState.winner_id === user?.id;
        return (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex-col gap-6 p-8">
                <div className={`text-6xl mb-4 animate-bounce`}>
                    {iWon ? '🏆' : '😢'}
                </div>
                <h1 className={`text-5xl font-display font-black ${iWon ? 'text-yellow-400' : 'text-slate-400'}`}>
                    {iWon ? 'VICTOIRE !' : 'DÉFAITE'}
                </h1>
                {iWon && matchState.xp_reward && (
                    <div className="text-2xl text-green-400 font-bold">
                        +{matchState.xp_reward} XP
                    </div>
                )}
                <button 
                    onClick={() => {
                        localStorage.removeItem('pvp_match');
                        setBattlePhase('LOBBY');
                    }}
                    className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-display font-bold text-xl"
                >
                    RETOUR AU LOBBY
                </button>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full flex flex-col bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-slate-900/80 border-b border-purple-500/30">
                <div className="text-white font-display font-bold">
                    {myName} <span className="text-cyan-400">VS</span> {opponentName}
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setShowHistory(!showHistory)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-sm"
                    >
                        📜 HISTORIQUE
                    </button>
                    <button 
                        onClick={forfeit}
                        className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded font-bold text-sm"
                    >
                        🏳️ ABANDON
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Zone de combat */}
                <div className="flex-1 flex flex-col justify-between p-4 md:p-8">
                    {/* Équipe adverse */}
                    <div className="flex justify-center gap-4">
                        {opponentTeam.map((pokemon, idx) => {
                            const hp = opponentTeamHp[idx];
                            const maxHp = pokemon.max_hp;
                            const hpPercent = (hp / maxHp) * 100;
                            const isActive = idx === opponentActivePokemon;
                            
                            return (
                                <motion.div 
                                    key={idx}
                                    className={`relative bg-slate-900/60 rounded-xl p-3 border-2 ${isActive ? 'border-red-500 ring-2 ring-red-500/50 scale-110' : 'border-slate-700 opacity-60'} transition-all`}
                                    animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                >
                                    {isActive && <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">ACTIF</div>}
                                    <img 
                                        src={pokemon.sprite_url}
                                        className={`w-16 h-16 md:w-20 md:h-20 object-contain ${hp <= 0 ? 'grayscale opacity-30' : ''}`}
                                        alt={pokemon.name}
                                    />
                                    <div className="text-center mt-2">
                                        <p className="text-white text-sm font-bold">{pokemon.name}</p>
                                        <p className="text-slate-400 text-xs">Niv. {pokemon.level}</p>
                                        {/* Barre HP */}
                                        <div className="w-full h-2 bg-slate-800 rounded-full mt-1 overflow-hidden">
                                            <div 
                                                className={`h-full ${hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                style={{ width: `${hpPercent}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">{hp}/{maxHp}</p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Zone centrale - Question ou Attente */}
                    <div className="flex-1 flex items-center justify-center">
                        {isMyTurn && currentQuestion ? (
                            <div className="w-full max-w-2xl bg-slate-900/80 rounded-xl p-6 border-2 border-cyan-500">
                                <h2 className="text-2xl text-white font-bold mb-4">{currentQuestion.question_text}</h2>
                                <div className="space-y-2">
                                    {currentQuestion.options.map((option, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedAnswer(idx)}
                                            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                                                selectedAnswer === idx
                                                    ? 'bg-cyan-600 border-cyan-400 text-white'
                                                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                            }`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={submitAnswer}
                                    disabled={selectedAnswer === null}
                                    className="w-full mt-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
                                >
                                    VALIDER
                                </button>
                            </div>
                        ) : waitingForOpponent ? (
                            <div className="text-center">
                                <div className="text-4xl mb-4 animate-pulse">⏳</div>
                                <p className="text-slate-400 text-xl">En attente de {opponentName}...</p>
                            </div>
                        ) : (
                            <div className="text-center">
                                <div className="text-4xl mb-4">⚔️</div>
                                <p className="text-slate-400 text-xl">Combat en cours...</p>
                            </div>
                        )}
                    </div>

                    {/* Mon équipe */}
                    <div className="flex justify-center gap-4">
                        {myTeam.map((pokemon, idx) => {
                            const hp = myTeamHp[idx];
                            const maxHp = pokemon.max_hp;
                            const hpPercent = (hp / maxHp) * 100;
                            const isActive = idx === myActivePokemon;
                            
                            return (
                                <motion.div 
                                    key={idx}
                                    className={`relative bg-slate-900/60 rounded-xl p-3 border-2 ${isActive ? 'border-cyan-500 ring-2 ring-cyan-500/50 scale-110' : 'border-slate-700 opacity-60'} transition-all`}
                                    animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                >
                                    {isActive && <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-cyan-600 text-white text-xs px-2 py-0.5 rounded-full">ACTIF</div>}
                                    <img 
                                        src={pokemon.sprite_url}
                                        className={`w-16 h-16 md:w-20 md:h-20 object-contain ${hp <= 0 ? 'grayscale opacity-30' : ''}`}
                                        alt={pokemon.name}
                                    />
                                    <div className="text-center mt-2">
                                        <p className="text-white text-sm font-bold">{pokemon.name}</p>
                                        <p className="text-slate-400 text-xs">Niv. {pokemon.level}</p>
                                        {/* Barre HP */}
                                        <div className="w-full h-2 bg-slate-800 rounded-full mt-1 overflow-hidden">
                                            <div 
                                                className={`h-full ${hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                style={{ width: `${hpPercent}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">{hp}/{maxHp}</p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Panneau d'historique */}
                <AnimatePresence>
                    {showHistory && (
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            className="w-full md:w-96 bg-slate-900/95 border-l border-purple-500/30 p-4 overflow-y-auto"
                        >
                            <h3 className="text-xl font-display font-bold text-purple-400 mb-4">📜 HISTORIQUE</h3>
                            {history.length === 0 ? (
                                <p className="text-slate-500 text-center">Aucun tour joué</p>
                            ) : (
                                <div className="space-y-3">
                                    {history.map((turn) => (
                                        <div key={turn.id} className={`p-3 rounded-lg border ${turn.player_id === user?.id ? 'bg-cyan-900/20 border-cyan-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`font-bold text-sm ${turn.player_id === user?.id ? 'text-cyan-400' : 'text-red-400'}`}>
                                                    {turn.player_name}
                                                </span>
                                                <span className="text-xs text-slate-500">Tour #{turn.turn_number}</span>
                                            </div>
                                            <p className="text-white text-sm mb-2">{turn.question_text}</p>
                                            <div className="space-y-1">
                                                {turn.question_options.map((option, idx) => (
                                                    <div 
                                                        key={idx}
                                                        className={`text-xs p-2 rounded ${
                                                            idx === turn.correct_index 
                                                                ? 'bg-green-900/30 text-green-400 border border-green-500/30' 
                                                                : idx === turn.answer_index
                                                                    ? 'bg-red-900/30 text-red-400 border border-red-500/30'
                                                                    : 'bg-slate-800/50 text-slate-400'
                                                        }`}
                                                    >
                                                        {idx === turn.answer_index && '➤ '}
                                                        {option}
                                                        {idx === turn.correct_index && ' ✓'}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-2 text-xs">
                                                <span className={turn.is_correct ? 'text-green-400' : 'text-red-400'}>
                                                    {turn.is_correct ? `✓ Correct - ${turn.damage_dealt} dégâts` : '✗ Incorrect - 0 dégât'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
