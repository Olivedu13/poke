import React, { useEffect, useState, useRef } from 'react';
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
    const usableItems = inventory.filter((i: Item) => ['HEAL', 'HEAL_TEAM', 'TEAM_HEAL', 'EVOLUTION', 'EVOLUTION_MAX'].includes(i.effect_type) && i.quantity > 0);
    const xpPercent = Math.min(100, (pokemon.current_xp / (pokemon.next_level_xp || 100)) * 100);
    const statLabels: Record<string, string> = { HP: 'SANTÉ', ATK: 'ATTAQUE', DEF: 'DÉFENSE', SPE: 'VITESSE' };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200" onClick={onClose}>
            <div className="bg-slate-900 border border-cyan-500/50 rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="pt-4 pb-3 px-4 border-b border-slate-700 bg-slate-950 flex justify-between items-center">
                    <button onClick={onClose} className="text-slate-400 hover:text-white px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded flex items-center gap-2 transition-colors">← RETOUR</button>
                    <div className="text-center flex-1"><h2 className="text-xl font-display font-bold text-white uppercase">{pokemon.name}</h2><div className="flex justify-center gap-2 text-xs font-mono mt-1"><span className="text-cyan-400">NIV {pokemon.level}</span><span className="text-slate-500">|</span><span className="text-slate-400">ID #{pokemon.tyradex_id}</span></div></div>
                    <div className="w-20"></div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col items-center p-4 bg-slate-950/50 rounded-xl">
                         <img src={pokemon.sprite_url} className="w-32 h-32 sm:w-48 sm:h-48 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] mb-4" />
                         <div className="w-full mb-4"><div className="flex justify-between text-[10px] text-slate-400 mb-1 font-bold"><span>EXPÉRIENCE</span><span>{pokemon.current_xp} / {pokemon.next_level_xp || 100}</span></div><div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700"><motion.div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 relative" initial={{ width: 0 }} animate={{ width: `${xpPercent}%` }} transition={{ duration: 0.8, ease: "easeOut" }}><div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[size:1rem_1rem] opacity-30"></div></motion.div></div></div>
                         <button onClick={() => onAction('feed', pokemon.id)} disabled={(user?.global_xp || 0) < 100} className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white py-3 rounded-lg font-bold shadow-lg disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-2 group active:scale-[0.98]">
                            <img src={`${ASSETS_BASE_URL}/xp.webp`} className="w-5 h-5 group-hover:scale-110 transition-transform"/> DONNER 100 XP
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
                <div className="p-4 border-t border-slate-700 bg-slate-950 pb-8">
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
                </div>
            </div>
        </div>
    );
};

const PokemonCard: React.FC<{ pokemon: Pokemon, onClick: () => void, onToggleTeam?: (id: string) => void, teamCount?: number }> = ({ pokemon, onClick, onToggleTeam, teamCount = 0 }) => {
    const canAddToTeam = !pokemon.is_team && teamCount < 3;
    const canRemove = pokemon.is_team;
    
    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onToggleTeam && (canAddToTeam || canRemove)) {
            onToggleTeam(pokemon.id);
        }
    };
    
    return (
        <motion.div layoutId={`poke-${pokemon.id}`} className={`relative p-4 rounded-2xl cursor-pointer group transition-all hover:-translate-y-1 ${pokemon.is_team ? 'bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-slate-900 border border-slate-700 hover:border-slate-500'}`}>
            {pokemon.is_team && (<div className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)] animate-pulse"></div>)}
            <div onClick={onClick} className="flex justify-between items-start mb-2 opacity-50 text-[10px] font-mono"><span>NV {pokemon.level}</span><span>#{pokemon.tyradex_id}</span></div>
            <div onClick={onClick} className="flex justify-center my-2"><img src={pokemon.sprite_url} className="w-24 h-24 object-contain group-hover:scale-110 transition-transform drop-shadow-lg" /></div>
            <div onClick={onClick} className="text-center"><h3 className={`font-display font-bold text-sm truncate ${pokemon.is_team ? 'text-cyan-400' : 'text-white'}`}>{pokemon.name}</h3><div className="w-full h-1 bg-slate-800 rounded-full mt-2 overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${(pokemon.current_hp / pokemon.max_hp) * 100}%` }}></div></div></div>
            {onToggleTeam && (
                <button 
                    onClick={handleToggle}
                    disabled={!canAddToTeam && !canRemove}
                    className={`w-full mt-3 py-2 rounded-lg font-bold text-xs transition-all ${
                        pokemon.is_team 
                            ? 'bg-red-900/50 border border-red-500/50 text-red-400 hover:bg-red-900/70' 
                            : canAddToTeam 
                                ? 'bg-green-900/50 border border-green-500/50 text-green-400 hover:bg-green-900/70'
                                : 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                >
                    {pokemon.is_team ? '− RETIRER' : canAddToTeam ? '+ ÉQUIPE' : 'ÉQUIPE PLEINE'}
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
      name: (p.name && p.name.includes('Pokemon #') && nameMap[p.tyradex_id]) ? nameMap[p.tyradex_id] : (p.name || `Pokémon #${p.tyradex_id}`)
  }));

  const handleAction = async (action: string, pokeId: string, itemId?: string) => {
      setLoading(true);
      try {
          // Router vers le bon endpoint selon l'action
          let res;
          if (action === 'feed') {
              res = await api.post(`/collection/feed`, { pokemonId: pokeId, xpAmount: 100 });
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
              if (action === 'feed' || (res.data.evolution && res.data.sequence)) {
                  if (useGameStore.getState().fetchUser) await useGameStore.getState().fetchUser();
              }
              if (res.data.evolution && res.data.sequence) {
                  setSelectedPokemon(null); setEvolutionSeq(res.data.sequence); 
              } else if (action !== 'toggle_team') {
                  if (itemId && (itemId.includes('heal') || itemId.includes('potion'))) playSfx('POTION');
                  else playSfx('CLICK');
                  const updatedCollection = useGameStore.getState().collection;
                  let updatedP = updatedCollection.find(p => p.id === pokeId);
                  if (updatedP && updatedP.name && updatedP.name.includes('Pokemon #') && nameMap[updatedP.tyradex_id]) {
                      updatedP = { ...updatedP, name: nameMap[updatedP.tyradex_id] };
                  }
                  if (updatedP) setSelectedPokemon(updatedP);
              } else {
                  playSfx('CLICK');
              }
          } else {
              // Revert optimistic update on failure
              if (action === 'toggle_team') await fetchCollection();
              alert(res.data.message);
          }
      } catch (e) { 
          console.error(e); 
          // Revert optimistic update on error
          if (action === 'toggle_team') await fetchCollection();
      } finally { setLoading(false); }
  };

  const activeTeam = correctedCollection.filter(p => p.is_team);
  const boxPokemon = correctedCollection.filter(p => !p.is_team);

  return (
    <div className="w-full max-w-6xl mx-auto pb-20">
            {/* HEADER XP + LOGOUT */}
            <div className="flex justify-between items-center px-4 py-3 mb-6 bg-slate-900/90 rounded-2xl border border-slate-700 shadow-lg">
                <div className="flex items-center gap-3">
                    <img src="/pokeball.png" className="w-8 h-8" />
                    <h1 className="text-2xl font-display font-bold text-white">MA COLLECTION</h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 bg-slate-800 px-3 py-1 rounded-full text-cyan-300 font-mono text-sm">
                        <img src="/assets/xp.webp" className="w-5 h-5 mr-1" />
                        {user?.global_xp ?? 0} XP
                    </div>
                    <button onClick={() => { useGameStore.getState().logout(); }} className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-full font-bold text-xs ml-2">Déconnexion</button>
                </div>
            </div>
      <AnimatePresence>{evolutionSeq && (<EvolutionOverlay sequence={evolutionSeq} onClose={() => setEvolutionSeq(null)} />)}</AnimatePresence>
      <AnimatePresence>{selectedPokemon && (<PokemonDetailModal pokemon={selectedPokemon} user={user} inventory={inventory} onClose={() => setSelectedPokemon(null)} onAction={handleAction} onToggleTeam={(id: string) => handleAction('toggle_team', id)} collectionSize={correctedCollection.length} />)}</AnimatePresence>

      <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-slate-900/80 p-6 rounded-2xl border border-slate-700 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-4">
             <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center border-4 border-slate-800 shadow-lg"><img src={`${ASSETS_BASE_URL}/pokeball.webp`} className="w-10 h-10 animate-pulse-fast" /></div>
             <div><h2 className="text-3xl font-display font-bold text-white tracking-wide">CENTRE POKÉMON</h2><p className="text-slate-400 font-mono text-sm">Gérez votre équipe et vos évolutions</p></div>
        </div>
        <div className="mt-4 md:mt-0 bg-slate-950 px-6 py-3 rounded-xl border border-cyan-500/30 flex items-center gap-4"><div className="text-right"><div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">RÉSERVE XP</div><div className="text-2xl font-mono text-cyan-400 font-bold drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">{user?.global_xp} XP</div></div><img src={`${ASSETS_BASE_URL}/xp.webp`} className="w-8 h-8" /></div>
      </div>

      <div className="mb-12">
          <h3 className="text-xl font-display font-bold text-cyan-400 mb-4 flex items-center gap-2"><span className="w-2 h-8 bg-cyan-500 rounded-full"></span> ÉQUIPE ACTIVE ({activeTeam.length}/3)</h3>
          {activeTeam.length === 0 ? (<div className="border-2 border-dashed border-slate-800 rounded-2xl p-8 text-center text-slate-500">Votre équipe est vide. Cliquez sur "+ ÉQUIPE" sur un Pokémon ci-dessous.</div>) : (<div className="grid grid-cols-1 md:grid-cols-3 gap-6">{activeTeam.map(poke => (<PokemonCard key={poke.id} pokemon={poke} onClick={() => setSelectedPokemon(poke)} onToggleTeam={(id) => handleAction('toggle_team', id)} teamCount={activeTeam.length} />))}{[...Array(3 - activeTeam.length)].map((_, i) => (<div key={i} className="bg-slate-900/30 border border-slate-800 rounded-2xl flex items-center justify-center opacity-30 min-h-[200px]"><span className="font-display font-bold text-slate-600">EMPLACEMENT VIDE</span></div>))}</div>)}
      </div>

      <div>
          <h3 className="text-xl font-display font-bold text-slate-400 mb-4 flex items-center gap-2"><span className="w-2 h-8 bg-slate-700 rounded-full"></span> RÉSERVE ({boxPokemon.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">{boxPokemon.map(poke => (<PokemonCard key={poke.id} pokemon={poke} onClick={() => setSelectedPokemon(poke)} onToggleTeam={(id) => handleAction('toggle_team', id)} teamCount={activeTeam.length} />))}<div className="border-2 border-dashed border-slate-800 bg-slate-900/20 rounded-2xl flex flex-col items-center justify-center p-4 text-slate-600 hover:border-cyan-500/30 hover:text-cyan-500 cursor-pointer transition-colors min-h-[180px]"><span className="text-4xl font-light mb-2">+</span><span className="text-xs font-bold text-center">CAPTURER PLUS</span></div></div>
      </div>
    </div>
  );
};