import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { api } from '../../services/api'; // USE API
import axios from 'axios'; // For External
import { API_BASE_URL, ASSETS_BASE_URL } from '../../config';
import { motion, AnimatePresence } from 'framer-motion';
import { Pokemon, Item } from '../../types';
import { playSfx } from '../../utils/soundEngine';

const EvolutionOverlay = ({ sequence, onClose }: { sequence: number[], onClose: () => void }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [flash, setFlash] = useState(false);

    useEffect(() => {
        if (currentIndex < sequence.length - 1) {
            const timeout = setTimeout(() => {
                setFlash(true); playSfx('EVOLVE');
                setTimeout(() => { setCurrentIndex(prev => prev + 1); setFlash(false); }, 500);
            }, 2500);
            return () => clearTimeout(timeout);
        } else {
            playSfx('LEVEL_UP');
            const timeout = setTimeout(onClose, 3000);
            return () => clearTimeout(timeout);
        }
    }, [currentIndex]);

    const currentId = sequence[currentIndex];
    const isEvolving = currentIndex < sequence.length - 1;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
            <AnimatePresence>{flash && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white z-[110]" transition={{ duration: 0.5 }} />)}</AnimatePresence>
            <div className="absolute inset-0 overflow-hidden"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200vmax] h-[200vmax] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0.1)_20deg,transparent_40deg)] animate-[spin_4s_linear_infinite]"></div></div>
            <h2 className="text-4xl md:text-6xl font-display font-black text-white mb-10 z-10 text-center animate-pulse">{isEvolving ? 'QUOI ?!' : 'ÉVOLUTION RÉUSSIE !'}</h2>
            <div className="relative w-80 h-80 md:w-96 md:h-96 z-10">
                <motion.img key={currentId} src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${currentId}.png`} className="w-full h-full object-contain filter drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]" animate={isEvolving ? { scale: [1, 1.1, 1], filter: ["brightness(1)", "brightness(0)", "brightness(1)"], } : { scale: [0.8, 1.2, 1], filter: "brightness(1)", rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: isEvolving ? Infinity : 0 }} />
            </div>
            {!isEvolving && (<motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-10 text-center z-10"><p className="text-slate-300 font-mono mb-4">Votre Pokémon est devenu plus puissant !</p><button onClick={onClose} className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform">CONTINUER</button></motion.div>)}
        </motion.div>
    );
};

const PokemonDetailModal = ({ pokemon, user, inventory, onClose, onAction, onToggleTeam, collectionSize }: any) => {
    const [tab, setTab] = useState<'STATS' | 'ITEMS'>('STATS');
    const [showLevelUp, setShowLevelUp] = useState(false);
    const prevLevel = useRef(pokemon.level);
    const usableItems = inventory.filter((i: Item) => ['HEAL', 'HEAL_TEAM', 'TEAM_HEAL', 'EVOLUTION', 'EVOLUTION_MAX'].includes(i.effect_type) && i.quantity > 0);
    const isMaxLevel = pokemon.level >= 100;
    const statLabels: Record<string, string> = { HP: 'SANTÉ', ATK: 'ATTAQUE', DEF: 'DÉFENSE', SPE: 'VITESSE' };

    // Hold-to-repeat XP
    const holdRef = useRef({ timer: null as ReturnType<typeof setTimeout> | null, active: false, start: 0, accumulated: 0, action: '', pokemonId: '', sending: false });
    const [holdAccumulated, setHoldAccumulated] = useState(0);
    const [holdAction, setHoldAction] = useState('');
    const onActionRef = useRef(onAction);
    onActionRef.current = onAction;

    const startHold = useCallback((action: string, pokemonId: string) => {
        if (holdRef.current.sending) return; // API en cours, pas de nouveau hold
        // Pour feed, vérifier que le joueur a assez d'XP globale
        const availableXp = user?.global_xp ?? 0;
        if (action === 'feed' && availableXp < 100) return; // pas assez d'XP
        holdRef.current.active = false;
        if (holdRef.current.timer) { clearTimeout(holdRef.current.timer); holdRef.current.timer = null; }
        const initialChunk = action === 'feed' ? Math.min(100, availableXp) : 100;
        holdRef.current = { ...holdRef.current, timer: null, active: true, start: Date.now(), accumulated: initialChunk, action, pokemonId };
        setHoldAccumulated(initialChunk);
        setHoldAction(action);

        const tick = () => {
            if (!holdRef.current.active) return;
            // Pour feed, plafonner au global_xp du joueur
            if (action === 'feed') {
                const maxXp = user?.global_xp ?? 0;
                if (holdRef.current.accumulated >= maxXp) {
                    holdRef.current.accumulated = maxXp;
                    setHoldAccumulated(maxXp);
                    return; // stop auto-increment
                }
                holdRef.current.accumulated = Math.min(holdRef.current.accumulated + 100, maxXp);
            } else {
                holdRef.current.accumulated += 100;
            }
            setHoldAccumulated(holdRef.current.accumulated);
            const elapsed = Date.now() - holdRef.current.start;
            const delay = elapsed < 1000 ? 500 : elapsed < 2000 ? 200 : elapsed < 3000 ? 80 : 30;
            holdRef.current.timer = setTimeout(tick, delay);
        };
        holdRef.current.timer = setTimeout(tick, 500);
    }, [user?.global_xp]);

    const releaseHold = useCallback(() => {
        if (!holdRef.current.active) return;
        const total = holdRef.current.accumulated;
        const action = holdRef.current.action;
        const pokeId = holdRef.current.pokemonId;
        // Stopper le timer
        holdRef.current.active = false;
        if (holdRef.current.timer) { clearTimeout(holdRef.current.timer); holdRef.current.timer = null; }
        // NE PAS reset holdAccumulated ici — on le garde affiché
        // C'est le useEffect sur pokemon.current_xp qui le reset quand les données arrivent
        if (total > 0 && pokeId) {
            holdRef.current.sending = true;
            // Appeler handleAction du parent (met à jour selectedPokemon avec les données fraîches)
            onActionRef.current(action, pokeId, undefined, total)
                .finally(() => { holdRef.current.sending = false; });
        }
    }, []);

    // Quand les données du pokemon changent (après fetchCollection + setSelectedPokemon),
    // reset l'offset visuel — les vraies valeurs sont maintenant dans pokemon.current_xp
    const prevXpRef = useRef(pokemon.current_xp);
    const prevLvlRef = useRef(pokemon.level);
    useEffect(() => {
        if (pokemon.current_xp !== prevXpRef.current || pokemon.level !== prevLvlRef.current) {
            prevXpRef.current = pokemon.current_xp;
            prevLvlRef.current = pokemon.level;
            holdRef.current.accumulated = 0;
            setHoldAccumulated(0);
            setHoldAction('');
        }
    }, [pokemon.current_xp, pokemon.level]);

    // Cleanup on unmount
    useEffect(() => () => {
        if (holdRef.current.timer) clearTimeout(holdRef.current.timer);
        holdRef.current.active = false;
    }, []);

    // XP affichée en temps réel = XP réel + offset accumulé pendant le hold
    const feedOffset = holdAccumulated > 0 && holdAction === 'feed' ? holdAccumulated : 0;
    const unfeedOffset = holdAccumulated > 0 && holdAction === 'unfeed' ? holdAccumulated : 0;
    const liveXp = Math.max(0, pokemon.current_xp + feedOffset - unfeedOffset);
    const nextLvl = pokemon.next_level_xp || 100;
    const xpPercent = isMaxLevel ? 100 : Math.min(100, (liveXp / nextLvl) * 100);

    // Détecte le gain de niveau
    useEffect(() => {
        if (pokemon.level > prevLevel.current) {
            setShowLevelUp(true);
            prevLevel.current = pokemon.level;
            playSfx && playSfx('LEVEL_UP');
            setTimeout(() => setShowLevelUp(false), 2000);
        }
    }, [pokemon.level]);

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 sm:bg-black/80 sm:backdrop-blur-sm sm:flex sm:items-center sm:justify-center" onClick={onClose}>
            <div className="absolute inset-0 sm:relative sm:inset-auto sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-2xl sm:rounded-2xl bg-slate-900 sm:border sm:border-cyan-500/50 flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
                {/* ── HEADER (sticky, never scrolls away) ── */}
                <div className="shrink-0 flex items-center justify-center px-3 pb-3 sm:px-4 sm:py-3 bg-slate-950 border-b border-slate-700" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
                    <div className="text-center">
                        <h2 className="text-base sm:text-xl font-display font-bold text-white uppercase truncate">{pokemon.name}</h2>
                        <div className="text-[10px] sm:text-xs font-mono text-cyan-400">NIV {pokemon.level} | #{pokemon.tyradex_id}</div>
                    </div>
                </div>
                {/* Animation/message de gain de niveau */}
                                <AnimatePresence>
                                    {showLevelUp && (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.7 }} 
                                            animate={{ opacity: 1, scale: 1 }} 
                                            exit={{ opacity: 0, scale: 0.7 }} 
                                            transition={{ duration: 0.4 }}
                                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[120] bg-gradient-to-r from-yellow-400 to-cyan-400 text-black px-6 py-4 sm:px-8 sm:py-5 rounded-2xl shadow-2xl border-2 sm:border-4 border-yellow-300 font-display font-black text-xl sm:text-3xl flex items-center gap-2 sm:gap-3 animate-bounce w-[90vw] max-w-sm sm:max-w-md justify-center"
                                        >
                                            <span className="text-2xl sm:text-3xl">⭐</span> NIVEAU SUPÉRIEUR !
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 sm:p-6 flex flex-col md:grid md:grid-cols-2 gap-3 sm:gap-4">
                    <div className="flex flex-col items-center p-3 sm:p-4 bg-slate-950/50 rounded-xl">
                         <img src={pokemon.sprite_url} className="w-24 h-24 sm:w-48 sm:h-48 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] mb-3 sm:mb-4" />
                         <div className="w-full mb-1"><div className="flex justify-between text-[10px] text-slate-400 mb-1 font-bold"><span>EXPÉRIENCE</span><span>{isMaxLevel ? 'MAX' : `${liveXp} / ${nextLvl}`}</span></div><div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700"><motion.div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 relative" initial={{ width: 0 }} animate={{ width: `${xpPercent}%` }} transition={{ duration: 0.8, ease: "easeOut" }}><div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[size:1rem_1rem] opacity-30"></div></motion.div></div></div>
                         <div className="text-[10px] text-slate-500 font-mono text-right mb-3">XP dispo : {user?.global_xp ?? 0}</div>
                         <button
                            onTouchStart={(e) => { e.preventDefault(); startHold('feed', pokemon.id); }}
                            onTouchEnd={() => releaseHold()}
                            onTouchCancel={() => releaseHold()}
                            onMouseDown={() => startHold('feed', pokemon.id)}
                            onMouseUp={() => releaseHold()}
                            onMouseLeave={() => { if (holdRef.current.active) releaseHold(); }}
                            onContextMenu={(e) => e.preventDefault()}
                            disabled={isMaxLevel || (user?.global_xp ?? 0) < 100}
                            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white py-3 rounded-lg font-bold shadow-lg disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-2 group active:scale-[0.98] select-none"
                         >
                            <img src={`${ASSETS_BASE_URL}/xp.webp`} className="w-5 h-5 group-hover:scale-110 transition-transform" draggable={false}/> {holdAccumulated > 0 && holdAction === 'feed' ? `+${holdAccumulated} EXP...` : 'DONNER 100 EXP'}
                            <span className="text-[10px] opacity-60 ml-1">(maintenir)</span>
                         </button>
                         <button
                            onTouchStart={(e) => { e.preventDefault(); startHold('unfeed', pokemon.id); }}
                            onTouchEnd={() => releaseHold()}
                            onTouchCancel={() => releaseHold()}
                            onMouseDown={() => startHold('unfeed', pokemon.id)}
                            onMouseUp={() => releaseHold()}
                            onMouseLeave={() => { if (holdRef.current.active) releaseHold(); }}
                            onContextMenu={(e) => e.preventDefault()}
                            disabled={pokemon.level <= 1 && pokemon.current_xp < 100}
                            className="w-full mt-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg font-bold text-sm disabled:opacity-30 transition-all flex items-center justify-center gap-2 active:scale-[0.98] border border-slate-700 select-none"
                         >
                            ↩ {holdAccumulated > 0 && holdAction === 'unfeed' ? `-${holdAccumulated} EXP...` : 'REPRENDRE 100 EXP'} <span className="text-[10px] opacity-60 ml-1">(maintenir)</span>
                         </button>
                    </div>
                    <div className="p-2">
                        <div className="flex gap-2 mb-4 bg-slate-800 p-1 rounded-lg">
                            <button onClick={()=>setTab('STATS')} className={`flex-1 py-1 rounded text-xs font-bold ${tab === 'STATS' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}>CARACTÉRISTIQUES</button>
                            <button onClick={()=>setTab('ITEMS')} className={`flex-1 py-1 rounded text-xs font-bold ${tab === 'ITEMS' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}>OBJETS</button>
                        </div>
                        {tab === 'STATS' && (
                            <div className="space-y-3">
                                {['HP', 'ATK', 'DEF', 'SPE'].map(stat => {
                                    let val = 0; let max = 150;
                                    if(stat === 'HP') { val = pokemon.current_hp; max = pokemon.max_hp; }
                                    if(stat === 'ATK') val = pokemon.stats?.atk || 0;
                                    if(stat === 'DEF') val = pokemon.stats?.def || 0;
                                    if(stat === 'SPE') val = pokemon.stats?.spe || 0;
                                    return (
                                        <div key={stat}><div className="flex justify-between text-xs font-bold text-slate-300 mb-1"><span>{statLabels[stat]}</span><span>{val} {stat === 'HP' ? `/ ${max}` : ''}</span></div><div className="h-2 bg-slate-800 rounded-full overflow-hidden"><motion.div className={`h-full ${stat==='HP'?'bg-green-500':'bg-yellow-500'}`} initial={{ width: 0 }} animate={{ width: `${Math.min(100, (val/max)*100)}%` }} transition={{ duration: 0.5 }}></motion.div></div></div>
                                    );
                                })}
                            </div>
                        )}
                        {tab === 'ITEMS' && (
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                {usableItems.length === 0 && <div className="text-slate-500 text-center py-4 text-xs">Aucun objet compatible.</div>}
                                {usableItems.map((item: Item) => (
                                    <div key={item.id} className="flex justify-between items-center bg-slate-800 p-2 rounded border border-slate-700">
                                        <div className="flex items-center gap-2">
                                            <img src={`${ASSETS_BASE_URL}/${item.image || 'pokeball.webp'}`} className="w-8 h-8" />
                                            <div><div className="text-xs font-bold text-white">{item.name}</div><div className="text-[10px] text-slate-400">x{item.quantity}</div></div>
                                        </div>
                                        <button onClick={() => onAction('use_item', pokemon.id, item.id)} className="bg-slate-700 hover:bg-cyan-600 text-white text-[10px] font-bold px-3 py-1.5 rounded active:scale-95 transition-transform">UTILISER</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                {/* Fixed bottom action bar for team toggle */}
                <div className="shrink-0 p-3 sm:p-4 border-t border-slate-700 bg-slate-950 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    {collectionSize > 3 ? (
                        <button 
                            onClick={() => onToggleTeam(pokemon.id)} 
                            className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all active:scale-[0.98] ${
                                pokemon.is_team 
                                    ? 'bg-red-900/50 border-2 border-red-500 text-red-400 hover:bg-red-900/70' 
                                    : 'bg-green-900/50 border-2 border-green-500 text-green-400 hover:bg-green-900/70'
                            }`}
                        >
                            {pokemon.is_team ? '− RETIRER DE L\'ÉQUIPE' : '+ AJOUTER À L\'ÉQUIPE'}
                        </button>
                    ) : (
                        <div className="text-center text-slate-500 text-xs py-2">Tous tes Pokémon sont automatiquement dans l'équipe</div>
                    )}
                    <button onClick={onClose} className="w-full mt-2 bg-cyan-600 active:bg-cyan-500 text-white font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg">
                        ← RETOUR
                    </button>
                </div>
            </div>
        </div>
    );
};

const PokemonCard: React.FC<{ pokemon: Pokemon, onClick: () => void, onToggleTeam?: (id: string) => void, onSwapRequest?: (id: string) => void, teamCount?: number }> = ({ pokemon, onClick, onToggleTeam, onSwapRequest, teamCount = 0 }) => {
    const canAddToTeam = !pokemon.is_team && teamCount < 3;
    const canRemove = pokemon.is_team;
    const teamFull = !pokemon.is_team && teamCount >= 3;
    
    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (teamFull && onSwapRequest) {
            onSwapRequest(pokemon.id);
            return;
        }
        if (onToggleTeam && (canAddToTeam || canRemove)) {
            onToggleTeam(pokemon.id);
        }
    };
    
    return (
        <motion.div layoutId={`poke-${pokemon.id}`} className={`relative p-4 rounded-2xl cursor-pointer group transition-all hover:-translate-y-1 ${pokemon.is_team ? 'bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-slate-900 border border-slate-700 hover:border-slate-500'}`}>
            {pokemon.is_team && (<div className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)] animate-pulse"></div>)}
            <div onClick={onClick} className="flex justify-between items-start mb-2 opacity-50 text-[10px] font-mono"><span>NV {pokemon.level}</span><span>#{pokemon.tyradex_id}</span></div>
            <div onClick={onClick} className="flex justify-center my-2"><img src={pokemon.sprite_url} className="w-24 h-24 object-contain group-hover:scale-110 transition-transform drop-shadow-lg" /></div>
            <div onClick={onClick} className="text-center"><h3 className={`font-display font-bold text-sm truncate ${pokemon.is_team ? 'text-cyan-400' : 'text-white'}`}>{pokemon.name}</h3><div className="w-full h-1 bg-slate-800 rounded-full mt-2 overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${(pokemon.current_hp / pokemon.max_hp) * 100}%` }}></div></div><div className="w-full h-1 bg-slate-800 rounded-full mt-1 overflow-hidden"><div className="h-full bg-cyan-500" style={{ width: `${pokemon.level >= 100 ? 100 : ((pokemon.current_xp || 0) / (pokemon.next_level_xp || 100)) * 100}%` }}></div></div><div className="text-[9px] text-slate-500 font-mono mt-1">EXP {pokemon.current_xp || 0}/{pokemon.next_level_xp || 100}</div></div>
            {onToggleTeam && (
                <button 
                    onClick={handleToggle}
                    className={`w-full mt-3 py-2 rounded-lg font-bold text-xs transition-all ${
                        pokemon.is_team 
                            ? 'bg-red-900/50 border border-red-500/50 text-red-400 hover:bg-red-900/70' 
                            : canAddToTeam 
                                ? 'bg-green-900/50 border border-green-500/50 text-green-400 hover:bg-green-900/70'
                                : 'bg-amber-900/50 border border-amber-500/50 text-amber-400 hover:bg-amber-900/70'
                    }`}
                >
                    {pokemon.is_team ? '− RETIRER' : canAddToTeam ? '+ ÉQUIPE' : '⇄ ÉCHANGER'}
                </button>
            )}
        </motion.div>
    );
};

export const Collection: React.FC = () => {
  const { user, collection, inventory, fetchCollection, fetchInventory } = useGameStore();
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null);
  const [evolutionSeq, setEvolutionSeq] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [nameMap, setNameMap] = useState<Record<number, string>>({});
  const [swapCandidate, setSwapCandidate] = useState<string | null>(null);
  const [teamOrder, setTeamOrder] = useState<string[]>([]);

  useEffect(() => {
    fetchCollection();
    fetchInventory(); 
    const fetchNames = async () => {
        try {
            const res = await axios.get('https://tyradex.app/api/v1/pokemon');
            if(Array.isArray(res.data)) {
                const map: Record<number, string> = {};
                res.data.forEach((p: any) => { map[p.pokedexId] = p.name.fr; });
                setNameMap(map);
            }
        } catch (e) {}
    };
    fetchNames();
  }, []);

  // Auto-select all pokemon to team if collection <= 3
  useEffect(() => {
    if (collection.length > 0 && collection.length <= 3) {
      const notInTeam = collection.filter(p => !p.is_team);
      notInTeam.forEach(async (p) => {
        try {
          await api.post(`/collection/toggle-team`, { pokemonId: p.id });
        } catch (e) {}
      });
      if (notInTeam.length > 0) fetchCollection();
    }
  }, [collection.length]);

  const correctedCollection = collection.map(p => ({
      ...p,
      name: nameMap[p.tyradex_id] || p.name || `Pokémon #${p.tyradex_id}`
  }));

    const handleAction = async (action: string, pokeId: string, itemId?: string, xpAmount?: number) => {
        setLoading(true);
        try {
            // Router vers le bon endpoint selon l'action
            let res;
            if (action === 'feed') {
                res = await api.post(`/collection/feed`, { pokemonId: pokeId, xpAmount: xpAmount || 100 });
            } else if (action === 'unfeed') {
                res = await api.post(`/collection/unfeed`, { pokemonId: pokeId, xpAmount: xpAmount || 100 });
            } else if (action === 'toggle_team') {
                res = await api.post(`/collection/toggle-team`, { pokemonId: pokeId });
            } else if (action === 'use_item') {
                res = await api.post(`/shop/use-item`, { itemId: itemId, pokemonId: pokeId });
            } else {
                res = { data: { success: false, message: 'Action inconnue' } };
            }

            if (res.data.success) {
                await fetchCollection();
                await fetchInventory();
                // Rafraîchir l'utilisateur pour mettre à jour l'XP globale
                if (action === 'feed' || action === 'unfeed' || (res.data.evolution && res.data.sequence)) {
                    if (useGameStore.getState().fetchUser) await useGameStore.getState().fetchUser();
                }
                if (res.data.evolution && res.data.sequence) {
                    setSelectedPokemon(null); setEvolutionSeq(res.data.sequence); 
                } else if (action !== 'toggle_team') {
                    if (itemId && (itemId.includes('heal') || itemId.includes('potion'))) playSfx('POTION');
                    else playSfx('CLICK');
                    const updatedCollection = useGameStore.getState().collection;
                    let updatedP = updatedCollection.find(p => p.id === pokeId);
                    if (updatedP) {
                        updatedP = { ...updatedP, name: nameMap[updatedP.tyradex_id] || updatedP.name || `Pokémon #${updatedP.tyradex_id}` };
                        setSelectedPokemon(updatedP);
                    }
                } else {
                    playSfx('CLICK');
                }
            } else {
                // Affichage d'un message d'erreur si le Pokémon ne peut pas évoluer
                if (action === 'use_item' && res.data.message && res.data.message.includes('ne peut pas évoluer')) {
                    alert('Ce Pokémon ne peut pas évoluer. La potion n\'a pas été consommée.');
                } else {
                    // Revert optimistic update on failure
                    if (action === 'toggle_team') await fetchCollection();
                    alert(res.data.message);
                }
            }
        } catch (e) { 
            console.error(e); 
            // Revert optimistic update on error
            if (action === 'toggle_team') await fetchCollection();
        } finally { setLoading(false); }
    };

    const handleSwap = async (removeId: string) => {
        if (!swapCandidate) return;
        setLoading(true);
        try {
            // Remove old team member
            await api.post(`/collection/toggle-team`, { pokemonId: removeId });
            // Add new Pokemon to team
            await api.post(`/collection/toggle-team`, { pokemonId: swapCandidate });
            await fetchCollection();
            playSfx('CLICK');
        } catch (e) {
            console.error(e);
            await fetchCollection();
        } finally {
            setSwapCandidate(null);
            setLoading(false);
        }
    };

  const rawTeam = correctedCollection.filter(p => p.is_team);
  const boxPokemon = correctedCollection.filter(p => !p.is_team);

  // Sync team order when composition changes
  const teamIdsKey = rawTeam.map(p => p.id).join(',');
  useEffect(() => {
      const currentIds = teamIdsKey.split(',').filter(Boolean);
      setTeamOrder(prev => {
          const kept = prev.filter(id => currentIds.includes(id));
          const newIds = currentIds.filter(id => !kept.includes(id));
          return [...kept, ...newIds];
      });
  }, [teamIdsKey]);

  const activeTeam = [...rawTeam].sort((a, b) => {
      const ai = teamOrder.indexOf(a.id);
      const bi = teamOrder.indexOf(b.id);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const moveTeamMember = (pokemonId: string, direction: -1 | 1) => {
      setTeamOrder(prev => {
          const idx = prev.indexOf(pokemonId);
          if (idx === -1) return prev;
          const newIdx = idx + direction;
          if (newIdx < 0 || newIdx >= prev.length) return prev;
          const arr = [...prev];
          [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
          return arr;
      });
      playSfx('CLICK');
  };

    return (
        <div className="w-full pb-20 px-2 sm:px-4 lg:px-6">
            <AnimatePresence>{evolutionSeq && (<EvolutionOverlay sequence={evolutionSeq} onClose={() => setEvolutionSeq(null)} />)}</AnimatePresence>
            <AnimatePresence>{selectedPokemon && (<PokemonDetailModal pokemon={selectedPokemon} user={user} inventory={inventory} onClose={() => setSelectedPokemon(null)} onAction={handleAction} onToggleTeam={(id: string) => handleAction('toggle_team', id)} collectionSize={correctedCollection.length} />)}</AnimatePresence>

            {/* Swap picker overlay */}
            <AnimatePresence>
                {swapCandidate && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setSwapCandidate(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-slate-900 border border-cyan-500/50 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-display font-bold text-white mb-1 text-center">⇄ ÉCHANGER</h3>
                            <p className="text-xs text-slate-400 text-center mb-4">
                                Remplacer qui par <span className="text-cyan-400 font-bold">{correctedCollection.find(p => p.id === swapCandidate)?.name}</span> ?
                            </p>
                            <div className="space-y-2">
                                {activeTeam.map(poke => (
                                    <button
                                        key={poke.id}
                                        onClick={() => handleSwap(poke.id)}
                                        disabled={loading}
                                        className="w-full flex items-center gap-3 p-3 bg-slate-800 hover:bg-red-900/50 border border-slate-700 hover:border-red-500/50 rounded-xl transition-all group disabled:opacity-50"
                                    >
                                        <img src={poke.sprite_url} className="w-12 h-12 object-contain" />
                                        <div className="text-left flex-1">
                                            <div className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">{poke.name}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">NV {poke.level}</div>
                                        </div>
                                        <span className="text-red-400 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">RETIRER</span>
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setSwapCandidate(null)}
                                className="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-xs font-bold transition-colors"
                            >
                                ANNULER
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Responsive grid fix: use flex-wrap and min-w-0 for children */}
            <div className="mb-12">
                <h3 className="text-xl font-display font-bold text-cyan-400 mb-4 flex items-center gap-2"><span className="w-2 h-8 bg-cyan-500 rounded-full"></span> ÉQUIPE ACTIVE ({activeTeam.length}/3)</h3>
                {activeTeam.length === 0 ? (
                    <div className="border-2 border-dashed border-slate-800 rounded-2xl p-8 text-center text-slate-500">Votre équipe est vide. Cliquez sur "+ ÉQUIPE" sur un Pokémon ci-dessous.</div>
                ) : (
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        {activeTeam.map((poke, idx) => (
                            <div key={poke.id} className="relative bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-cyan-500 rounded-2xl p-2 sm:p-4 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                                <div className="absolute top-1 left-1 sm:top-2 sm:left-2 w-5 h-5 sm:w-6 sm:h-6 bg-cyan-600 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold text-white z-10 shadow">{idx + 1}</div>
                                <div className="absolute top-1 right-1 sm:top-2 sm:right-2 flex gap-0.5 z-10">
                                    {idx > 0 && <button onClick={() => moveTeamMember(poke.id, -1)} className="w-5 h-5 sm:w-6 sm:h-6 bg-slate-700/80 rounded text-[10px] text-slate-300 hover:bg-cyan-600 hover:text-white transition-colors flex items-center justify-center">←</button>}
                                    {idx < activeTeam.length - 1 && <button onClick={() => moveTeamMember(poke.id, 1)} className="w-5 h-5 sm:w-6 sm:h-6 bg-slate-700/80 rounded text-[10px] text-slate-300 hover:bg-cyan-600 hover:text-white transition-colors flex items-center justify-center">→</button>}
                                </div>
                                <div onClick={() => setSelectedPokemon(poke)} className="cursor-pointer pt-4 sm:pt-2">
                                    <div className="flex justify-center"><img src={poke.sprite_url} className="w-14 h-14 sm:w-24 sm:h-24 object-contain drop-shadow-lg" /></div>
                                    <div className="text-center mt-1">
                                        <h3 className="font-display font-bold text-[10px] sm:text-sm text-cyan-400 truncate">{poke.name}</h3>
                                        <div className="text-[9px] text-slate-400 font-mono">NV {poke.level}</div>
                                        <div className="w-full h-1 bg-slate-800 rounded-full mt-1 overflow-hidden"><div className="h-full bg-green-500 transition-all" style={{ width: `${(poke.current_hp / poke.max_hp) * 100}%` }}></div></div>
                                    </div>
                                </div>
                                <button onClick={() => handleAction('toggle_team', poke.id)} className="w-full mt-2 py-1 sm:py-2 rounded-lg font-bold text-[9px] sm:text-xs bg-red-900/50 border border-red-500/50 text-red-400 hover:bg-red-900/70 transition-all active:scale-95">− RETIRER</button>
                            </div>
                        ))}
                        {[...Array(3 - activeTeam.length)].map((_, i) => (
                            <div key={i} className="bg-slate-900/30 border border-slate-800 border-dashed rounded-2xl flex items-center justify-center opacity-30 min-h-[120px] sm:min-h-[200px]">
                                <span className="font-display font-bold text-slate-600 text-[10px] sm:text-base">VIDE</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <h3 className="text-xl font-display font-bold text-slate-400 mb-4 flex items-center gap-2"><span className="w-2 h-8 bg-slate-700 rounded-full"></span> RÉSERVE ({boxPokemon.length})</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
                    {boxPokemon.map(poke => (
                        <PokemonCard key={poke.id} pokemon={poke} onClick={() => setSelectedPokemon(poke)} onToggleTeam={(id) => handleAction('toggle_team', id)} onSwapRequest={(id) => setSwapCandidate(id)} teamCount={activeTeam.length} />
                    ))}
                    <div className="border-2 border-dashed border-slate-800 bg-slate-900/20 rounded-2xl flex flex-col items-center justify-center p-4 text-slate-600 hover:border-cyan-500/30 hover:text-cyan-500 cursor-pointer transition-colors min-h-[120px] sm:min-h-[180px]">
                        <span className="text-4xl font-light mb-2">+</span>
                        <span className="text-xs font-bold text-center">CAPTURER PLUS</span>
                    </div>
                </div>
            </div>
        </div>
    );
};