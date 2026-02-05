import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { socketService } from '../../services/socket';
import { playSfx } from '../../utils/soundEngine';

export const PvPNotification: React.FC = () => {
    const { pvpNotification, setPvpNotification, setBattleMode, setBattlePhase, setView } = useGameStore();

    // Listen for match created after accept
    useEffect(() => {
        const handleMatchCreated = (data: { matchId: number }) => {
            playSfx('WIN');
            localStorage.setItem('pvp_match_id', String(data.matchId));
            setPvpNotification(null);
            setView('GAME');
            setBattleMode('PVP');
            setBattlePhase('FIGHTING');
        };

        socketService.on('pvp:match_created', handleMatchCreated);

        return () => {
            socketService.off('pvp:match_created', handleMatchCreated);
        };
    }, [setPvpNotification, setBattleMode, setBattlePhase, setView]);

    if (!pvpNotification) return null;

    const handleAccept = () => {
        playSfx('CLICK');
        socketService.emit('pvp:accept_challenge', { challengeId: pvpNotification.challengeId });
        // Match will be created via socket event pvp:match_created
    };

    const handleDecline = () => {
        playSfx('CLICK');
        socketService.emit('pvp:decline_challenge', { challengeId: pvpNotification.challengeId });
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
