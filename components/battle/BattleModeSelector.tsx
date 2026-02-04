import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { BattleMode } from '../../types';
import { ASSETS_BASE_URL } from '../../config';
import { api } from '../../services/api';

export const BattleModeSelector: React.FC = () => {
    const { setBattleMode, setBattlePhase, setView } = useGameStore();
    const [pvpStats, setPvpStats] = useState({ active: 0, max: 6, available: 6 });

    useEffect(() => {
        // Charger les stats PvP uniquement
        const loadStats = async () => {
            try {
                const res = await api.get('/battle_session.php?action=can_start');
                if (res.data.success) {
                    setPvpStats({
                        active: res.data.active_pvp || 0,
                        max: res.data.max_pvp || 6,
                        available: res.data.available_slots || 6
                    });
                }
            } catch (e) {
                console.warn('Impossible de charger les stats PvP:', e);
            }
        };
        loadStats();
        
        // Rafraîchir toutes les 5 secondes
        const interval = setInterval(loadStats, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleSelectMode = (mode: BattleMode) => {
        if (mode === 'PVP') {
            // Rediriger vers le lobby PvP au lieu du matchmaking automatique
            setBattlePhase('PVP_LOBBY');
            return;
        }
        setBattleMode(mode);
        setBattlePhase('LOADING');
    };

    const handleBack = () => {
        setView('COLLECTION');
    };

    return (
        <div className="relative w-full h-full flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-y-auto">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(6,182,212,0.05)_50%,transparent_75%)] bg-[size:3rem_3rem] pointer-events-none"></div>
            
            {/* Header fixe */}
            <div className="relative z-20 shrink-0 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm">
                <div className="max-w-4xl mx-auto p-3 sm:p-4 md:p-6">
                    <button 
                        onClick={handleBack}
                        className="mb-2 sm:mb-3 text-slate-400 hover:text-white flex items-center gap-1 sm:gap-2 text-xs sm:text-sm transition-colors"
                    >
                        <span>←</span> RETOUR
                    </button>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-black bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                        CHOISIS TON ADVERSAIRE
                    </h1>
                    <p className="text-slate-400 mt-1 sm:mt-2 text-xs sm:text-sm md:text-base">
                        Pokémon sauvage, dresseur robot ou joueur en ligne ?
                    </p>
                </div>
            </div>

            {/* Contenu scrollable */}
            <div className="relative z-10 flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6">
                    {/* Combat Pokémon Sauvage */}
                    <button
                        onClick={() => handleSelectMode('WILD')}
                        className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-green-900/40 to-emerald-800/40 border-2 border-green-500/30 hover:border-green-400 p-4 sm:p-6 md:p-8 transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] w-full active:scale-[0.98]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="relative z-10 flex items-center gap-3 sm:gap-4 md:gap-6">
                            <img 
                                src={`${ASSETS_BASE_URL}/pokeball.webp`} 
                                className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 drop-shadow-2xl group-hover:scale-110 transition-transform shrink-0" 
                                alt="Pokémon Sauvage"
                            />
                            <div className="flex-1 text-left">
                                <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-display font-bold text-green-400 group-hover:text-green-300 mb-1 sm:mb-2">
                                    POKÉMON SAUVAGE
                                </h2>
                                <p className="text-slate-300 text-xs sm:text-sm md:text-base mb-2">
                                    Affronte un Pokémon sauvage aléatoire. Possibilité de capture !
                                </p>
                                <div className="flex flex-wrap gap-1 sm:gap-2">
                                    <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-green-500/20 rounded-full text-green-400 text-[10px] sm:text-xs font-bold">CAPTURE</span>
                                    <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-yellow-500/20 rounded-full text-yellow-400 text-[10px] sm:text-xs font-bold">FACILE</span>
                                </div>
                            </div>
                        </div>
                    </button>

                    {/* Combat Dresseur */}
                    <button
                        onClick={() => handleSelectMode('TRAINER')}
                        className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-900/40 to-orange-800/40 border-2 border-red-500/30 hover:border-red-400 p-4 sm:p-6 md:p-8 transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(239,68,68,0.3)] w-full active:scale-[0.98]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="relative z-10 flex items-center gap-3 sm:gap-4 md:gap-6">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-4xl sm:text-5xl md:text-6xl drop-shadow-2xl group-hover:scale-110 transition-transform shrink-0">
                                👤
                            </div>
                            <div className="flex-1 text-left">
                                <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-display font-bold text-red-400 group-hover:text-red-300 mb-1 sm:mb-2">
                                    DRESSEUR (BOT)
                                </h2>
                                <p className="text-slate-300 text-xs sm:text-sm md:text-base mb-2">
                                    Combat contre un robot avec 3 Pokémon. Potions traîtres disponibles !
                                </p>
                                <div className="flex flex-wrap gap-1 sm:gap-2">
                                    <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-red-500/20 rounded-full text-red-400 text-[10px] sm:text-xs font-bold">3v3</span>
                                    <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-orange-500/20 rounded-full text-orange-400 text-[10px] sm:text-xs font-bold">DIFFICILE</span>
                                </div>
                            </div>
                        </div>
                    </button>

                    {/* Combat PvP */}
                    <button
                        onClick={() => handleSelectMode('PVP')}
                        className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-900/40 to-pink-800/40 border-2 border-purple-500/30 hover:border-purple-400 p-4 sm:p-6 md:p-8 transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] w-full active:scale-[0.98]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="relative z-10 flex items-center gap-3 sm:gap-4 md:gap-6">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-4xl sm:text-5xl md:text-6xl drop-shadow-2xl group-hover:scale-110 transition-transform shrink-0">
                                ⚔️
                            </div>
                            <div className="flex-1 text-left">
                                <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-display font-bold text-purple-400 group-hover:text-purple-300 mb-1 sm:mb-2">
                                    JOUEUR EN LIGNE (PVP)
                                </h2>
                                <p className="text-slate-300 text-xs sm:text-sm md:text-base mb-2">
                                    Défiez de vrais joueurs ! Sélectionnez votre adversaire dans le lobby.
                                </p>
                                <div className="flex flex-wrap gap-1 sm:gap-2">
                                    <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-purple-500/20 rounded-full text-purple-400 text-[10px] sm:text-xs font-bold">
                                        {pvpStats.available > 0 ? `✅ ${pvpStats.available} SLOTS` : '🔒 PLEIN'}
                                    </span>
                                    <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-pink-500/20 rounded-full text-pink-400 text-[10px] sm:text-xs font-bold">BETA</span>
                                </div>
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};
