import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { api } from '../../services/api';
import { ASSETS_BASE_URL } from '../../config';
import { motion, AnimatePresence } from 'framer-motion';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  effect_type: string;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  image?: string;
}

interface ShopPokemon {
  id: string; 
  pokedexId: number;
  name: { fr: string };
  types: { name: string }[];
  sprites: { regular: string };
  stats: { hp: number; atk: number; def: number; spe: number; vit: number };
  computedPrice: number;
  rarityLabel: string;
  ownedCount: number;
}

const getRarityColor = (rarity: string) => {
    switch(rarity.toUpperCase()) {
        case 'COMMON': case 'COMMUN': return 'border-slate-600 text-slate-400';
        case 'UNCOMMON': case 'PEU COMMUN': return 'border-green-500 text-green-400';
        case 'RARE': return 'border-blue-500 text-blue-400';
        case 'EPIC': case 'ÉPIQUE': return 'border-purple-500 text-purple-400';
        case 'LEGENDARY': case 'LÉGENDAIRE': return 'border-yellow-500 text-yellow-400';
        default: return 'border-slate-600';
    }
};

export const Shop: React.FC = () => {
  const { user, spendCurrency, fetchInventory, inventory } = useGameStore();
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'POKEMON'>('ITEMS');
  const [items, setItems] = useState<ShopItem[]>([]);
  const [pokemons, setPokemons] = useState<ShopPokemon[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (user) loadShopData();
  }, [activeTab, user?.id]); 

  const loadShopData = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
        if (activeTab === 'ITEMS') {
             const res = await api.get('/shop/items');
             if (res.data.success) {
                 setItems(Array.isArray(res.data.data) ? res.data.data : []);
             }
        } else {
             const res = await api.get('/shop/pokemons');
             if (res.data && res.data.success && Array.isArray(res.data.data)) {
                 setPokemons(res.data.data);
             } else {
                 setPokemons([]);
             }
        }
    } catch (e: any) {
        console.error('Shop load error:', e);
    } finally { setLoading(false); }
  };

  const handleTransaction = async (action: 'buy' | 'sell', type: 'item' | 'pokemon', id: string, price: number) => {
      if (!user) return;
      setFeedback('Traitement...');
      
      try {
          const res = await api.post(`/shop/${action}-${type}`, { 
            item_id: type === 'item' ? id : undefined,
            pokemon_id: type === 'pokemon' ? id : undefined,
            price: type === 'pokemon' ? price : undefined
          });
          
          if (res.data && res.data.success) {
              setFeedback(res.data.message || 'Succès !');
              if (action === 'buy') spendCurrency('GOLD', price);
              else spendCurrency('GOLD', -Math.floor(price * 0.5));
              await loadShopData();
              if (type === 'item') fetchInventory(); 
          } else {
              setFeedback(`Erreur: ${res.data?.message || 'Inconnue'}`);
          }
      } catch (e) { setFeedback("Erreur de communication."); }
      setTimeout(() => setFeedback(''), 3000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto min-h-[80vh] pb-20">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-slate-900/80 p-4 md:p-6 rounded-2xl border border-slate-700 shadow-xl backdrop-blur-sm">
            <div>
                <h2 className="text-2xl md:text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600">MARKETPLACE</h2>
                <p className="text-slate-400 font-mono text-xs md:text-sm">Équipez-vous pour l'aventure</p>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-slate-950 px-3 md:px-4 py-2 rounded-xl border border-yellow-600/30">
                    <img src={`${ASSETS_BASE_URL}/credits.webp`} className="w-6 h-6 md:w-8 md:h-8 object-contain" />
                    <span className="text-xl md:text-2xl font-mono text-yellow-400 font-bold">{user?.gold}</span>
                </div>
                {feedback && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-cyan-400 text-xs md:text-sm font-bold bg-cyan-900/20 px-2 md:px-3 py-1 rounded border border-cyan-500/30">{feedback}</motion.div>
                )}
            </div>
        </div>

        <div className="flex justify-center mb-6 gap-2 md:gap-4">
            <button onClick={() => setActiveTab('ITEMS')} className={`flex-1 md:flex-none px-4 md:px-8 py-2 md:py-3 rounded-t-xl font-display font-bold text-sm md:text-lg transition-all border-b-4 ${activeTab === 'ITEMS' ? 'bg-slate-800 text-white border-cyan-500 shadow-[0_-5px_20px_rgba(6,182,212,0.1)]' : 'bg-slate-950 text-slate-500 border-transparent hover:text-slate-300'}`}>OBJETS</button>
            <button onClick={() => setActiveTab('POKEMON')} className={`flex-1 md:flex-none px-4 md:px-8 py-2 md:py-3 rounded-t-xl font-display font-bold text-sm md:text-lg transition-all border-b-4 ${activeTab === 'POKEMON' ? 'bg-slate-800 text-white border-purple-500 shadow-[0_-5px_20px_rgba(168,85,247,0.1)]' : 'bg-slate-950 text-slate-500 border-transparent hover:text-slate-300'}`}>POKÉMON</button>
        </div>

        <AnimatePresence mode="wait">
            {activeTab === 'ITEMS' && (
                <motion.div key="items" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                    {(!items || items.length === 0) && !loading && (<div className="col-span-full text-center text-slate-500 py-10 text-sm">Aucun objet disponible.</div>)}
                    {Array.isArray(items) && items.map(item => (
                        <div key={item.id} className={`bg-slate-900 border-2 ${getRarityColor(item.rarity)} p-3 md:p-4 rounded-xl flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
                            <div className="absolute top-2 right-2 text-[8px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 bg-slate-950 rounded border border-slate-700 text-slate-400">x{item.stock}</div>
                            <div className="flex justify-center my-2 md:my-4">
                                <img src={item.image ? `${ASSETS_BASE_URL}/${item.image}` : `${ASSETS_BASE_URL}/pokeball.webp`} alt={item.name} className="w-16 h-16 md:w-24 md:h-24 object-contain drop-shadow-lg" />
                            </div>
                            <div className="mb-3 md:mb-4 text-center">
                                <h3 className="font-bold text-sm md:text-lg text-white font-display uppercase truncate">{item.name}</h3>
                                <p className="text-[10px] md:text-xs text-slate-400 h-6 md:h-8 leading-tight mt-1 line-clamp-2">{item.description}</p>
                            </div>
                            <div className="space-y-1.5 md:space-y-2">
                                <button onClick={() => handleTransaction('buy', 'item', item.id, item.price)} disabled={(user?.gold || 0) < item.price} className="w-full bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 disabled:grayscale text-white font-bold py-1.5 md:py-2 rounded flex justify-center items-center gap-1 md:gap-2 text-xs md:text-sm">ACHETER <span className="text-yellow-300">{item.price}₵</span></button>
                                {item.stock > 0 && (<button onClick={() => handleTransaction('sell', 'item', item.id, item.price)} className="w-full bg-slate-800 hover:bg-red-900/50 border border-slate-700 hover:border-red-500 text-slate-300 hover:text-red-300 font-bold py-1 md:py-1.5 rounded text-[10px] md:text-xs transition-colors">VENDRE ({Math.floor(item.price * 0.5)}₵)</button>)}
                            </div>
                        </div>
                    ))}
                </motion.div>
            )}

            {activeTab === 'POKEMON' && (
                <motion.div key="pokemon" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                        {(!pokemons || pokemons.length === 0) && !loading && (<div className="col-span-full text-center text-slate-500 py-10 text-sm">Aucun Pokémon disponible.</div>)}
                        {Array.isArray(pokemons) && pokemons.map(poke => (
                            <div key={poke.id} className={`bg-slate-900/80 border-2 ${getRarityColor(poke.rarityLabel)} p-3 md:p-4 rounded-xl relative group`}>
                                <div className="absolute top-2 left-2 z-10">
                                    <span className="text-[8px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 rounded bg-slate-950 text-white border border-slate-700">{poke.types && poke.types[0] ? poke.types[0].name : '???'}</span>
                                </div>
                                {poke.ownedCount > 0 && (
                                    <div className="absolute top-2 right-2 z-10">
                                        <span className="bg-green-600 text-white text-[8px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 rounded shadow-lg">x{poke.ownedCount}</span>
                                    </div>
                                )}
                                <div className="h-32 md:h-48 flex items-center justify-center bg-slate-800/50 rounded-lg mb-2 md:mb-4 opacity-90 group-hover:opacity-100 transition-opacity overflow-hidden">
                                    <img src={poke.sprites.regular} alt={poke.name.fr} loading="lazy" className="w-full h-full object-contain drop-shadow-2xl scale-90 group-hover:scale-105 transition-transform duration-300" />
                                </div>
                                <h3 className="text-base md:text-xl font-bold text-center text-white font-display mb-1 truncate">{poke.name.fr}</h3>
                                <div className="text-center text-[10px] md:text-xs font-mono text-slate-400 mb-2 md:mb-4">{poke.rarityLabel}</div>
                                <div className="space-y-1.5 md:space-y-2">
                                    <button onClick={() => handleTransaction('buy', 'pokemon', poke.id, poke.computedPrice)} disabled={(user?.gold || 0) < poke.computedPrice} className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:grayscale text-black font-bold py-1.5 md:py-2 rounded flex justify-center items-center gap-1 md:gap-2 font-display text-xs md:text-sm">RECRUTER <span className="bg-black/20 px-1 rounded text-white">{poke.computedPrice}₵</span></button>
                                    {poke.ownedCount > 0 && ![1, 4, 7].includes(poke.pokedexId) && (
                                        <button onClick={() => handleTransaction('sell', 'pokemon', poke.id, 500)} className="w-full bg-slate-950 hover:bg-red-900/40 border border-slate-800 hover:border-red-500 text-slate-500 hover:text-red-400 font-bold py-1 md:py-1.5 rounded text-[10px] md:text-xs transition-colors">LIBÉRER (+500₵)</button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {loading && (
            <div className="absolute inset-0 bg-slate-950/50 flex items-center justify-center z-50">
                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )}
    </div>
  );
};
