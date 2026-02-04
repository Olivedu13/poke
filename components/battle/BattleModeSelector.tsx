import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { BattleMode } from '../../types';
import { ASSETS_BASE_URL } from '../../config';
import { api } from '../../services/api';

export const BattleModeSelector: React.FC = () => {
    const { setBattleMode, setBattlePhase } = useGameStore();
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
        if (mode === 'PVP' && pvpStats.available <= 0) {
            alert(`Serveur PvP plein (${pvpStats.active}/${pvpStats.max} combats actifs). Réessayez dans quelques instants.`);
            return;
        }
        setBattleMode(mode);
        setBattlePhase('LOADING');
    };

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(6,182,212,0.05)_50%,transparent_75%)] bg-[size:3rem_3rem]"></div>
            
            <div className="relative z-10 max-w-5xl w-full">
                <h1 className="text-4xl md:text-6xl font-display font-black text-center mb-4 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent drop-shadow-2xl">
                    CHOISIS TON COMBAT
                </h1>
                <p className="text-center text-slate-400 mb-4 text-sm md:text-base">
                    Sélectionne le type de combat que tu souhaites affronter
                </p>
                
                {/* Indicateur de slots PvP disponibles */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className={`px-4 py-2 rounded-full border-2 font-bold text-sm ${
                        pvpStats.available > 0 
                            ? 'bg-purple-900/30 border-purple-500/50 text-purple-400' 
                            : 'bg-red-900/30 border-red-500/50 text-red-400'
                    }`}>
                        <span className="animate-pulse">●</span> PvP : {pvpStats.available}/{pvpStats.max} slots libres
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    {/* Combat Pokémon Sauvage */}
                    <button
                        onClick={() => handleSelectMode('WILD')}
                        className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-900/40 to-emerald-800/40 border-2 border-green-500/30 hover:border-green-400 p-8 transition-all hover:scale-105 hover:shadow-[0_0_50px_rgba(34,197,94,0.3)]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="relative z-10 flex flex-col items-center gap-4">
                            <img 
                                src={`${ASSETS_BASE_URL}/pokeball.webp`} 
                                className="w-24 h-24 md:w-32 md:h-32 drop-shadow-2xl group-hover:scale-110 transition-transform" 
                                alt="Pokémon Sauvage"
                            />
                            <h2 className="text-2xl md:text-3xl font-display font-bold text-green-400 group-hover:text-green-300">
                                POKÉMON SAUVAGE
                            </h2>
                            <p className="text-slate-300 text-sm md:text-base text-center">
                                Affronte un Pokémon sauvage aléatoire. Possibilité de capture !
                            </p>
                            <div className="flex gap-2 mt-2">
                                <span className="px-3 py-1 bg-green-500/20 rounded-full text-green-400 text-xs font-bold">CAPTURE</span>
                                <span className="px-3 py-1 bg-yellow-500/20 rounded-full text-yellow-400 text-xs font-bold">FACILE</span>
                            </div>
                        </div>
                    </button>

                    {/* Combat Dresseur */}
                    <button
                        onClick={() => handleSelectMode('TRAINER')}
                        className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-900/40 to-orange-800/40 border-2 border-red-500/30 hover:border-red-400 p-8 transition-all hover:scale-105 hover:shadow-[0_0_50px_rgba(239,68,68,0.3)]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="relative z-10 flex flex-col items-center gap-4">
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-6xl drop-shadow-2xl group-hover:scale-110 transition-transform">
                                👤
                            </div>
                            <h2 className="text-2xl md:text-3xl font-display font-bold text-red-400 group-hover:text-red-300">
                                DRESSEUR
                            </h2>
                            <p className="text-slate-300 text-sm md:text-base text-center">
                                Affronte un dresseur avec 3 Pokémon. Potions traîtres disponibles !
                            </p>
                            <div className="flex gap-2 mt-2">
                                <span className="px-3 py-1 bg-red-500/20 rounded-full text-red-400 text-xs font-bold">3v3</span>
                                <span className="px-3 py-1 bg-orange-500/20 rounded-full text-orange-400 text-xs font-bold">DIFFICILE</span>
                            </div>
                        </div>
                    </button>

                    {/* Combat PvP (À venir) */}
                    <button
                        onClick={() => handleSelectMode('PVP')}
                        disabled={pvpStats.available <= 0}
                        className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/40 to-pink-800/40 border-2 border-purple-500/30 hover:border-purple-400 p-8 transition-all hover:scale-105 hover:shadow-[0_0_50px_rgba(168,85,247,0.3)] md:col-span-2 ${
                            pvpStats.available <= 0 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="relative z-10 flex flex-col items-center gap-4">
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-6xl drop-shadow-2xl group-hover:scale-110 transition-transform">
                                ⚔️
                            </div>
                            <h2 className="text-2xl md:text-3xl font-display font-bold text-purple-400 group-hover:text-purple-300">
                                JOUEUR EN LIGNE
                            </h2>
                            <p className="text-slate-300 text-sm md:text-base text-center">
                                {pvpStats.available > 0 
                                    ? 'Affronte de vrais joueurs en temps réel ! Tour par tour.'
                                    : 'Serveur PvP plein. Réessaye dans quelques instants.'}
                            </p>
                            <div className="flex gap-2 mt-2">
                                <span className="px-3 py-1 bg-purple-500/20 rounded-full text-purple-400 text-xs font-bold">
                                    {pvpStats.available > 0 ? `✅ ${pvpStats.available} SLOTS` : '🔒 PLEIN'}
                                </span>
                                <span className="px-3 py-1 bg-pink-500/20 rounded-full text-pink-400 text-xs font-bold">BETA</span>
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};
