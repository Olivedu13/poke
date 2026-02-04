import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { api } from '../../services/api';
import { ASSETS_BASE_URL } from '../../config';
import { motion, AnimatePresence } from 'framer-motion';
import { playSfx } from '../../utils/soundEngine';

interface OnlinePlayer {
    id: number;
    username: string;
    level: number;
    grade: string;
    avatar_pokemon_id?: number;
    status: 'available' | 'in_battle' | 'challenged';
}

interface Challenge {
    id: number;
    challenger_id: number;
    challenger_name: string;
    challenged_id: number;
    challenger_team?: Array<{
        id: number;
        tyradex_id: number;
        level: number;
        name: string;
        sprite_url: string;
        current_hp: number;
        max_hp: number;
    }>;
    status: 'pending' | 'accepted' | 'declined';
    created_at: string;
}

export const PvPLobby: React.FC = () => {
    const { user, setBattlePhase, setBattleMode, setView } = useGameStore();
    const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
    const [incomingChallenges, setIncomingChallenges] = useState<Challenge[]>([]);
    const [sentChallenges, setSentChallenges] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Récupérer la liste des joueurs en ligne
    const fetchOnlinePlayers = async () => {
        try {
            const res = await api.get('/pvp_lobby.php?action=get_online_players');
            if (res.data.success) {
                setOnlinePlayers(res.data.players.filter((p: OnlinePlayer) => p.id !== user?.id));
            }
            setLoading(false);
            setError(null);
        } catch (e) {
            console.error('Erreur récupération joueurs:', e);
            setError('Impossible de charger les joueurs en ligne');
            setLoading(false);
        }
    };

    // Récupérer les défis reçus
    const fetchIncomingChallenges = async () => {
        try {
            const res = await api.get('/pvp_lobby.php?action=get_challenges');
            if (res.data.success) {
                setIncomingChallenges(res.data.challenges);
            }
        } catch (e) {
            console.error('Erreur récupération défis:', e);
        }
    };

    // Vérifier si mes défis envoyés ont été acceptés
    const checkSentChallenges = async () => {
        try {
            const res = await api.get('/pvp_lobby.php?action=check_sent_challenges');
            if (res.data.success && res.data.accepted_match) {
                // Un défi a été accepté ! Lancer le combat
                const match = res.data.accepted_match;
                localStorage.setItem('pvp_match', JSON.stringify({
                    match_id: match.match_id,
                    player1_id: match.player1_id,
                    player2_id: match.player2_id
                }));
                playSfx('victory');
                setView('GAME');
                setBattleMode('PVP');
                setBattlePhase('BATTLE');
            }
        } catch (e) {
            console.error('Erreur vérification défis envoyés:', e);
        }
    };

    // Envoyer un défi
    const handleChallenge = async (playerId: number) => {
        try {
            setSentChallenges(prev => [...prev, playerId]);
            console.log('📤 Envoi du défi à:', playerId);
            const res = await api.post('/pvp_lobby.php', { 
                action: 'send_challenge', 
                challenged_id: playerId 
            });
            console.log('📥 Réponse du serveur:', res.data);
            if (res.data.success) {
                playSfx('buttonClick');
                console.log('✅ Défi envoyé avec succès!');
            } else {
                console.error('❌ Échec:', res.data.message);
                alert(res.data.message || 'Impossible d\'envoyer le défi');
                setSentChallenges(prev => prev.filter(id => id !== playerId));
            }
        } catch (e: any) {
            console.error('Erreur envoi défi:', e);
            console.error('Détails erreur:', e.response?.data);
            alert('Erreur lors de l\'envoi du défi: ' + (e.response?.data?.message || e.message));
            setSentChallenges(prev => prev.filter(id => id !== playerId));
        }
    };

    // Accepter un défi
    const handleAccept = async (challengeId: number) => {
        try {
            const res = await api.post('/pvp_lobby.php', { 
                action: 'accept_challenge', 
                challenge_id: challengeId 
            });
            if (res.data.success) {
                playSfx('victory');
                useGameStore.getState().setPvpNotification(null); // Nettoyer notif
                // Stocker les infos du match dans localStorage pour le combat
                localStorage.setItem('pvp_match', JSON.stringify({
                    match_id: res.data.match_id,
                    player1_id: res.data.player1_id,
                    player2_id: res.data.player2_id
                }));
                // Changer vers la vue Combat puis lancer en mode BATTLE (pas LOADING pour éviter useBattleLogic)
                setView('GAME');
                setBattleMode('PVP');
                setBattlePhase('BATTLE'); // ← Changé de LOADING à BATTLE pour utiliser PvPBattleProc directement
            } else {
                alert(res.data.message || 'Impossible d\'accepter le défi');
            }
        } catch (e) {
            console.error('Erreur acceptation défi:', e);
            alert('Erreur lors de l\'acceptation');
        }
    };

    // Refuser un défi
    const handleDecline = async (challengeId: number) => {
        try {
            const res = await api.post('/pvp_lobby.php', { 
                action: 'decline_challenge', 
                challenge_id: challengeId 
            });
            if (res.data.success) {
                setIncomingChallenges(prev => prev.filter(c => c.id !== challengeId));
            }
        } catch (e) {
            console.error('Erreur refus défi:', e);
        }
    };

    // Polling pour rafraîchir la liste
    useEffect(() => {
        fetchOnlinePlayers();
        fetchIncomingChallenges();
        checkSentChallenges();
        
        const interval = setInterval(() => {
            fetchOnlinePlayers();
            fetchIncomingChallenges();
            checkSentChallenges(); // Vérifier aussi les défis envoyés
        }, 3000);
        
        return () => clearInterval(interval);
    }, []);

    const handleBack = () => {
        setBattlePhase('NONE');
    };

    const handleRefresh = async () => {
        setLoading(true);
        await fetchOnlinePlayers();
        await fetchIncomingChallenges();
        playSfx('buttonClick');
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-purple-500 font-display animate-pulse text-2xl">
                    🔍 RECHERCHE DE JOUEURS...
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full flex flex-col bg-gradient-to-br from-purple-950 via-slate-900 to-slate-950 p-4 md:p-8 overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(168,85,247,0.05)_50%,transparent_75%)] bg-[size:3rem_3rem]"></div>
            
            <div className="relative z-10 max-w-6xl mx-auto w-full flex flex-col gap-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl md:text-5xl font-display font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                        ⚔️ LOBBY PVP
                    </h1>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleRefresh}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:opacity-50 text-white rounded-lg font-bold transition-colors flex items-center gap-2"
                        >
                            <span className={loading ? 'animate-spin' : ''}>🔄</span>
                            RAFRAÎCHIR
                        </button>
                        <button 
                            onClick={handleBack}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold transition-colors"
                        >
                            ← RETOUR
                        </button>
                    </div>
                </div>

                {/* Défis entrants */}
                <AnimatePresence>
                    {incomingChallenges.length > 0 && (
                        <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="bg-gradient-to-r from-yellow-900/40 to-orange-900/40 border-2 border-yellow-500/50 rounded-xl p-4"
                        >
                            <h2 className="text-xl font-display font-bold text-yellow-400 mb-3 flex items-center gap-2">
                                <span className="text-2xl animate-pulse">⚡</span>
                                DÉFIS REÇUS ({incomingChallenges.length})
                            </h2>
                            <div className="space-y-3">
                                {incomingChallenges.map(challenge => (
                                    <div key={challenge.id} className="bg-slate-800/60 rounded-lg p-4 border border-slate-700">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <p className="text-white font-bold text-lg">{challenge.challenger_name}</p>
                                                <p className="text-slate-400 text-sm">t'a défié en combat !</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleAccept(challenge.id)}
                                                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors"
                                                >
                                                    ✓ ACCEPTER
                                                </button>
                                                <button 
                                                    onClick={() => handleDecline(challenge.id)}
                                                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors"
                                                >
                                                    ✕ REFUSER
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Équipe de l'adversaire */}
                                        {challenge.challenger_team && challenge.challenger_team.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-slate-700">
                                                <p className="text-xs text-slate-500 mb-2 uppercase font-bold">Équipe adverse</p>
                                                <div className="flex gap-2">
                                                    {challenge.challenger_team.map((pokemon, idx) => (
                                                        <div 
                                                            key={idx} 
                                                            className="flex-1 bg-slate-900/60 border border-red-500/30 rounded-lg p-2 flex flex-col items-center"
                                                        >
                                                            <img 
                                                                src={pokemon.sprite_url || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.tyradex_id}.png`}
                                                                alt={pokemon.name}
                                                                className="w-12 h-12 object-contain"
                                                            />
                                                            <p className="text-white text-xs font-bold text-center truncate w-full">{pokemon.name}</p>
                                                            <p className="text-slate-400 text-[10px]">Niv. {pokemon.level}</p>
                                                            <p className="text-red-400 text-[10px]">{pokemon.current_hp}/{pokemon.max_hp} PV</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Stats */}
                <div className="bg-slate-900/50 rounded-xl p-4 border border-purple-500/30">
                    <div className="flex items-center justify-center gap-8">
                        <div className="text-center">
                            <div className="text-3xl font-display font-black text-purple-400">
                                {onlinePlayers.length}
                            </div>
                            <div className="text-slate-400 text-sm">joueurs en ligne</div>
                        </div>
                        <div className="w-px h-12 bg-slate-700"></div>
                        <div className="text-center">
                            <div className="text-3xl font-display font-black text-green-400">
                                {onlinePlayers.filter(p => p.status === 'available').length}
                            </div>
                            <div className="text-slate-400 text-sm">disponibles</div>
                        </div>
                    </div>
                </div>

                {/* Liste des joueurs */}
                <div className="flex-1 overflow-y-auto">
                    {error && (
                        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 text-red-400 text-center">
                            {error}
                        </div>
                    )}

                    {onlinePlayers.length === 0 && !error && (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">😴</div>
                            <p className="text-slate-400 text-lg">Aucun joueur en ligne pour le moment</p>
                            <p className="text-slate-500 text-sm mt-2">Reviens plus tard !</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {onlinePlayers.map(player => {
                            const isChallenged = sentChallenges.includes(player.id);
                            const isUnavailable = player.status !== 'available';

                            return (
                                <motion.div
                                    key={player.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={`bg-slate-800/60 rounded-xl p-4 border-2 transition-all ${
                                        isUnavailable 
                                            ? 'border-slate-700 opacity-50' 
                                            : isChallenged
                                                ? 'border-yellow-500/50 bg-yellow-900/20'
                                                : 'border-purple-500/30 hover:border-purple-400 hover:bg-slate-800/80'
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Avatar Pokémon */}
                                        <div className="relative">
                                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
                                                {player.avatar_pokemon_id ? (
                                                    <img 
                                                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${player.avatar_pokemon_id}.png`}
                                                        className="w-full h-full object-contain"
                                                        alt="Avatar"
                                                    />
                                                ) : (
                                                    <span className="text-3xl">👤</span>
                                                )}
                                            </div>
                                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-800 ${
                                                player.status === 'available' ? 'bg-green-500' : 'bg-red-500'
                                            }`}></div>
                                        </div>

                                        {/* Info joueur */}
                                        <div className="flex-1">
                                            <h3 className="text-white font-display font-bold text-lg">
                                                {player.username}
                                            </h3>
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="px-2 py-0.5 bg-purple-500/20 rounded text-purple-400 font-mono">
                                                    Niv. {player.grade}
                                                </span>
                                                <span className="text-slate-400">
                                                    {player.status === 'in_battle' ? '⚔️ En combat' : '✓ Disponible'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Bouton défi */}
                                        <div>
                                            {isChallenged ? (
                                                <div className="px-4 py-2 bg-yellow-600/50 text-yellow-300 rounded-lg font-bold text-sm">
                                                    ⏳ EN ATTENTE
                                                </div>
                                            ) : isUnavailable ? (
                                                <div className="px-4 py-2 bg-slate-700 text-slate-500 rounded-lg font-bold text-sm">
                                                    INDISPONIBLE
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleChallenge(player.id)}
                                                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg"
                                                >
                                                    ⚔️ DÉFIER
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper pour les sons (si disponible)
const playSfx = (sound: string) => {
    try {
        import('../../utils/soundEngine').then(({ playSfx }) => playSfx(sound));
    } catch (e) {
        // Ignore si soundEngine n'est pas disponible
    }
};
