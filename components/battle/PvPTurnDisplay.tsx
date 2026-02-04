import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface PvPTurn {
    id: number;
    player_id: number;
    player_name: string;
    turn_number: number;
    question_id: number | null;
    answer_index: number | null;
    is_correct: boolean;
    damage_dealt: number;
    created_at: string;
}

interface PvPMatchState {
    match_id: number;
    player1_id: number;
    player2_id: number;
    player1_name: string;
    player2_name: string;
    current_turn: number;
    status: string;
}

interface Props {
    matchId: number;
    onMatchEnd: () => void;
}

export const PvPTurnDisplay: React.FC<Props> = ({ matchId, onMatchEnd }) => {
    const [matchState, setMatchState] = useState<PvPMatchState | null>(null);
    const [turns, setTurns] = useState<PvPTurn[]>([]);
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [myId, setMyId] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    const fetchMatchState = async () => {
        try {
            const res = await api.get(`/pvp_battle.php?action=get_match_state&match_id=${matchId}`);
            if (res.data.success) {
                setMatchState(res.data.match);
                setTurns(res.data.turns);
                setIsMyTurn(res.data.is_my_turn);
                setMyId(res.data.my_id);
                
                // Si le match est terminé
                if (res.data.match.status === 'COMPLETED') {
                    onMatchEnd();
                }
            }
            setLoading(false);
        } catch (e) {
            console.error('Erreur récupération état match:', e);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMatchState();
        
        // Polling toutes les 2 secondes
        const interval = setInterval(fetchMatchState, 2000);
        
        return () => clearInterval(interval);
    }, [matchId]);

    if (loading || !matchState) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-purple-500 font-display animate-pulse text-2xl">
                    ⚔️ CHARGEMENT DU COMBAT...
                </div>
            </div>
        );
    }

    const lastTurn = turns[turns.length - 1];
    const opponentId = myId === matchState.player1_id ? matchState.player2_id : matchState.player1_id;
    const opponentName = myId === matchState.player1_id ? matchState.player2_name : matchState.player1_name;

    return (
        <div className="absolute top-4 right-4 z-50 max-w-md">
            {/* Indicateur de tour */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-4 p-4 rounded-xl border-2 ${
                    isMyTurn 
                        ? 'bg-green-900/40 border-green-500' 
                        : 'bg-orange-900/40 border-orange-500'
                }`}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-white font-bold text-lg">
                            {isMyTurn ? '🎯 À Votre Tour' : '⏳ Tour de l\'Adversaire'}
                        </div>
                        <div className="text-slate-300 text-sm">
                            {isMyTurn ? 'Répondez à la question' : `${opponentName} joue...`}
                        </div>
                    </div>
                    <div className={`text-4xl ${isMyTurn ? 'animate-pulse' : 'animate-spin'}`}>
                        {isMyTurn ? '⚡' : '⏰'}
                    </div>
                </div>
            </motion.div>

            {/* Dernier tour de l'adversaire */}
            <AnimatePresence>
                {lastTurn && lastTurn.player_id === opponentId && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-slate-800/90 rounded-xl p-4 border border-purple-500/50"
                    >
                        <div className="flex items-start gap-3">
                            <div className="text-3xl">
                                {lastTurn.is_correct ? '✅' : '❌'}
                            </div>
                            <div className="flex-1">
                                <div className="text-white font-bold mb-1">
                                    {opponentName}
                                </div>
                                <div className="text-slate-300 text-sm mb-2">
                                    {lastTurn.is_correct ? 'Bonne réponse !' : 'Mauvaise réponse'}
                                </div>
                                {lastTurn.damage_dealt > 0 && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-red-400 font-bold">
                                            -{lastTurn.damage_dealt} HP
                                        </span>
                                        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: '100%' }}
                                                className="h-full bg-gradient-to-r from-red-500 to-orange-500"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Historique des tours */}
            {turns.length > 1 && (
                <div className="mt-4 bg-slate-900/50 rounded-xl p-3 max-h-48 overflow-y-auto">
                    <div className="text-slate-400 text-xs font-bold mb-2">
                        HISTORIQUE (Tour {turns.length})
                    </div>
                    <div className="space-y-2">
                        {turns.slice(0, -1).reverse().slice(0, 5).map(turn => (
                            <div key={turn.id} className="flex items-center gap-2 text-xs">
                                <span className={turn.player_id === myId ? 'text-blue-400' : 'text-purple-400'}>
                                    {turn.player_name}
                                </span>
                                <span className="text-slate-500">→</span>
                                <span className={turn.is_correct ? 'text-green-400' : 'text-red-400'}>
                                    {turn.is_correct ? '✓' : '✗'}
                                </span>
                                {turn.damage_dealt > 0 && (
                                    <span className="text-red-400">-{turn.damage_dealt}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
