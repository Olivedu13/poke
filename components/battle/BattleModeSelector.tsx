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
            // Stats PvP désactivées temporairement
            setPvpStats({ active: 0, max: 6, available: 6 });
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
        <div className="relative w-full h-full flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(6,182,212,0.05)_50%,transparent_75%)] bg-[size:3rem_3rem] pointer-events-none"></div>
            
            {/* Header compact */}
            <div className="relative z-20 shrink-0 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm">
                <div className="max-w-4xl mx-auto px-3 py-2 lg:py-4">
                    <button 
                        onClick={handleBack}
                        className="mb-1 text-slate-400 hover:text-white flex items-center gap-1 text-xs lg:text-sm transition-colors"
                    >
                        <span>←</span> RETOUR
                    </button>
                    <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-display font-black bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                        CHOISIS TON ADVERSAIRE
                    </h1>
                </div>
            </div>

            {/* Contenu scrollable - full height */}
            <div className="relative z-10 flex-1 overflow-y-auto flex flex-col justify-center">
                <div className="max-w-4xl mx-auto px-3 py-4 lg:py-8 space-y-3 sm:space-y-4 lg:space-y-6 w-full">
                    {/* Combat Pokémon Sauvage */}
                    <button
                        onClick={() => handleSelectMode('WILD')}
                        className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-900/40 to-emerald-800/40 border-2 border-green-500/30 hover:border-green-400 p-4 sm:p-5 lg:p-6 transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] w-full active:scale-[0.98]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="relative z-10 flex items-center gap-4">
                            <img 
                                src={`${ASSETS_BASE_URL}/pokeball.webp`} 
                                className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 drop-shadow-2xl group-hover:scale-110 transition-transform shrink-0" 
                                alt="Pokémon Sauvage"
                            />
                            <div className="flex-1 text-left">
                                <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-display font-bold text-green-400 group-hover:text-green-300">
                                    POKÉMON SAUVAGE
                                </h2>
                                <p className="text-slate-300 text-xs sm:text-sm lg:text-base">
                                    Lancement détecteur pokémon
                                </p>
                            </div>
                        </div>
                    </button>

                    {/* Combat Dresseur */}
                    <button
                        onClick={() => handleSelectMode('TRAINER')}
                        className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-red-900/40 to-orange-800/40 border-2 border-red-500/30 hover:border-red-400 p-4 sm:p-5 lg:p-6 transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(239,68,68,0.3)] w-full active:scale-[0.98]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-3xl sm:text-4xl lg:text-5xl drop-shadow-2xl group-hover:scale-110 transition-transform shrink-0">
                                👤
                            </div>
                            <div className="flex-1 text-left">
                                <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-display font-bold text-red-400 group-hover:text-red-300">
                                    DRESSEUR (ROBOT)
                                </h2>
                                <p className="text-slate-300 text-xs sm:text-sm lg:text-base">
                                    Attente Adversaire
                                </p>
                            </div>
                        </div>
                    </button>

                    {/* Combat PvP */}
                    <button
                        onClick={() => handleSelectMode('PVP')}
                        className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-900/40 to-pink-800/40 border-2 border-purple-500/30 hover:border-purple-400 p-4 sm:p-5 lg:p-6 transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] w-full active:scale-[0.98]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl sm:text-4xl lg:text-5xl drop-shadow-2xl group-hover:scale-110 transition-transform shrink-0">
                                ⚔️
                            </div>
                            <div className="flex-1 text-left">
                                <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-display font-bold text-purple-400 group-hover:text-purple-300">
                                    PVP EN LIGNE
                                </h2>
                                <p className="text-slate-300 text-xs sm:text-sm lg:text-base">
                                    Défiez des joueurs • Mode compétitif
                                </p>
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};