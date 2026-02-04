import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { api } from '../../services/api';
import { playSfx } from '../../utils/soundEngine';

export const PvPNotification: React.FC = () => {
    const { pvpNotification, setPvpNotification, setBattleMode, setBattlePhase, setView } = useGameStore();

    if (!pvpNotification) return null;

    const handleAccept = async () => {
        try {
            const res = await api.post('/pvp_lobby.php', { 
                action: 'accept_challenge', 
                challenge_id: pvpNotification.challengeId 
            });
            if (res.data.success) {
                playSfx('victory');
                // Stocker les infos du match
                localStorage.setItem('pvp_match', JSON.stringify({
                    match_id: res.data.match_id,
                    player1_id: res.data.player1_id,
                    player2_id: res.data.player2_id
                }));
                setPvpNotification(null);
                // Changer la vue vers Combat puis lancer le combat
                setView('GAME');
                setBattleMode('PVP');
                setBattlePhase('LOADING');
            } else {
                alert(res.data.message || 'Impossible d\'accepter le défi');
                setPvpNotification(null);
            }
        } catch (e) {
            console.error('Erreur acceptation défi:', e);
            alert('Erreur lors de l\'acceptation');
            setPvpNotification(null);
        }
    };

    const handleDecline = async () => {
        try {
            await api.post('/pvp_lobby.php', { 
                action: 'decline_challenge', 
                challenge_id: pvpNotification.challengeId 
            });
            playSfx('buttonClick');
        } catch (e) {
            console.error('Erreur refus défi:', e);
        }
        setPvpNotification(null);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -100 }}
                className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] max-w-md w-full px-4"
            >
                <div className="bg-gradient-to-br from-purple-900 to-indigo-900 border-2 border-purple-500 rounded-xl shadow-2xl p-4 backdrop-blur-lg">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="text-4xl animate-bounce">⚔️</span>
                        <div>
                            <h3 className="font-display font-bold text-lg text-white">Défi PVP !</h3>
                            <p className="text-purple-200 text-sm">
                                <span className="font-bold">{pvpNotification.challengerName}</span> vous défie !
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <button
                            onClick={handleAccept}
                            className="flex-1 bg-green-600 hover:bg-green-500 text-white font-display font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg"
                        >
                            ✅ ACCEPTER
                        </button>
                        <button
                            onClick={handleDecline}
                            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-display font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg"
                        >
                            ❌ REFUSER
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
