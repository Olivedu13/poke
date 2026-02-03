import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { api } from '../../services/api'; // USE API
import { API_BASE_URL, ASSETS_BASE_URL } from '../../config';
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

const FALLBACK_POKEMONS: ShopPokemon[] = [
  { id: '1', pokedexId: 1, name: { fr: 'Bulbizarre' }, types: [{ name: 'Plante' }, { name: 'Poison' }], sprites: { regular: 'https://raw.githubusercontent.com/Yarkis01/TyraDex/images/pokemon/1.png' }, stats: { hp: 45, atk: 49, def: 49, spe: 65, vit: 45 }, computedPrice: 500, rarityLabel: 'COMMUN', ownedCount: 0 },
  { id: '4', pokedexId: 4, name: { fr: 'Salamèche' }, types: [{ name: 'Feu' }], sprites: { regular: 'https://raw.githubusercontent.com/Yarkis01/TyraDex/images/pokemon/4.png' }, stats: { hp: 39, atk: 52, def: 43, spe: 60, vit: 65 }, computedPrice: 500, rarityLabel: 'COMMUN', ownedCount: 0 },
  { id: '7', pokedexId: 7, name: { fr: 'Carapuce' }, types: [{ name: 'Eau' }], sprites: { regular: 'https://raw.githubusercontent.com/Yarkis01/TyraDex/images/pokemon/7.png' }, stats: { hp: 44, atk: 48, def: 65, spe: 50, vit: 43 }, computedPrice: 500, rarityLabel: 'COMMUN', ownedCount: 0 },
  { id: '25', pokedexId: 25, name: { fr: 'Pikachu' }, types: [{ name: 'Électrik' }], sprites: { regular: 'https://raw.githubusercontent.com/Yarkis01/TyraDex/images/pokemon/25.png' }, stats: { hp: 35, atk: 55, def: 40, spe: 50, vit: 90 }, computedPrice: 500, rarityLabel: 'COMMUN', ownedCount: 0 },
];

const getRarityColor = (rarity: string) => {
    switch(rarity) {
        case 'COMMUN': return 'border-slate-600 text-slate-400';
        case 'PEU COMMUN': return 'border-green-500 text-green-400';
        case 'RARE': return 'border-blue-500 text-blue-400';
        case 'ÉPIQUE': return 'border-purple-500 text-purple-400';
        case 'LÉGENDAIRE': return 'border-yellow-500 text-yellow-400';
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
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterRarity, setFilterRarity] = useState('ALL');

  useEffect(() => {
    if (user) { loadShopData(); if (activeTab === 'ITEMS') fetchInventory(); }
  }, [activeTab, user?.id]); 

  useEffect(() => {
     if (inventory && inventory.length > 0 && activeTab === 'ITEMS') {
         setItems(inventory as unknown as ShopItem[]);
     }
  }, [inventory, activeTab]);

  const loadShopData = async () => {
    if (!user) return;
    setLoading(true); setError('');
    
    try {
        if (activeTab === 'ITEMS') {
             // Token handles auth
             const res = await api.get(`/shop.php?action=list_items&_t=${Date.now()}`);
             if (res.data.success) {
                 setItems(Array.isArray(res.data.data) ? res.data.data : []);
             }
        } else {
             const res = await api.get(`/shop.php?action=fetch_external_pokemons`);
             if (res.data && res.data.success && Array.isArray(res.data.data)) {
                 setPokemons(res.data.data);
             } else {
                 setPokemons(FALLBACK_POKEMONS);
             }
        }
    } catch (e: any) {
        if (activeTab === 'POKEMON') setPokemons(FALLBACK_POKEMONS);
        else setError("Impossible de charger la boutique.");
    } finally { setLoading(false); }
  };

  const handleTransaction = async (action: 'buy' | 'sell', type: 'item' | 'pokemon', id: string, price: number) => {
      if (!user) return;
      setFeedback('Traitement...');
      
      const endpoint = `/shop.php?action=${action}_${type}`;
      const payload = type === 'item' ? { item_id: id } : { pokemon_id: id, price: price };
      
      try {
          const res = await api.post(endpoint, payload);
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

  const filteredPokemons = (pokemons || []).filter(p => {
      let match = true;
      if (filterType !== 'ALL' && p.types && Array.isArray(p.types)) { match = match && p.types.some(t => t.name.toUpperCase() === filterType); }
      if (filterRarity !== 'ALL') { match = match && p.rarityLabel === filterRarity; }
      return match;
  });

  return (
    <div className="w-full max-w-6xl mx-auto min-h-[80vh]">
        {error && (<div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg text-center animate-pulse"><p className="text-red-200 font-bold mb-2">{error}</p><button onClick={loadShopData} className="text-xs underline hover:text-white">Réessayer</button></div>)}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-slate-900/80 p-6 rounded-2xl border border-slate-700 shadow-xl backdrop-blur-sm">
            <div><h2 className="text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600">MARKETPLACE</h2><p className="text-slate-400 font-mono text-sm">Équipez-vous pour l'aventure</p></div>
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-xl border border-yellow-600/30"><img src={`${ASSETS_BASE_URL}/credits.webp`} className="w-8 h-8 object-contain" /><span className="text-2xl font-mono text-yellow-400 font-bold">{user?.gold}</span></div>
                {feedback && (<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-cyan-400 text-sm font-bold bg-cyan-900/20 px-3 py-1 rounded border border-cyan-500/30">{feedback}</motion.div>)}
            </div>
        </div>
        <div className="flex justify-center mb-8 gap-4">
            <button onClick={() => setActiveTab('ITEMS')} className={`px-8 py-3 rounded-t-xl font-display font-bold text-lg transition-all border-b-4 ${activeTab === 'ITEMS' ? 'bg-slate-800 text-white border-cyan-500 shadow-[0_-5px_20px_rgba(6,182,212,0.1)]' : 'bg-slate-950 text-slate-500 border-transparent hover:text-slate-300'}`}>OBJETS & BONUS</button>
            <button onClick={() => setActiveTab('POKEMON')} className={`px-8 py-3 rounded-t-xl font-display font-bold text-lg transition-all border-b-4 ${activeTab === 'POKEMON' ? 'bg-slate-800 text-white border-purple-500 shadow-[0_-5px_20px_rgba(168,85,247,0.1)]' : 'bg-slate-950 text-slate-500 border-transparent hover:text-slate-300'}`}>POKÉMON</button>
        </div>
        <AnimatePresence mode="wait">
            {activeTab === 'ITEMS' && (
                <motion.div key="items" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {(!items || items.length === 0) && !loading && (<div className="col-span-full text-center text-slate-500 py-10">Aucun objet disponible.</div>)}
                    {Array.isArray(items) && items.map(item => (
                        <div key={item.id} className={`bg-slate-900 border-2 ${getRarityColor(item.rarity)} p-4 rounded-xl flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
                            <div className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 bg-slate-950 rounded border border-slate-700 text-slate-400">STOCK: {item.stock}</div>
                            <div className="flex justify-center my-4"><img src={item.image ? `${ASSETS_BASE_URL}/${item.image}` : `${ASSETS_BASE_URL}/pokeball.webp`} alt={item.name} className="w-24 h-24 object-contain drop-shadow-lg" /></div>
                            <div className="mb-4 text-center"><h3 className="font-bold text-lg text-white font-display uppercase truncate">{item.name}</h3><p className="text-xs text-slate-400 h-8 leading-tight mt-1">{item.description}</p></div>
                            <div className="space-y-2">
                                <button onClick={() => handleTransaction('buy', 'item', item.id, item.price)} disabled={(user?.gold || 0) < item.price} className="w-full bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 disabled:grayscale text-white font-bold py-2 rounded flex justify-center items-center gap-2 text-sm">ACHETER <span className="text-yellow-300">{item.price} ₵</span></button>
                                {item.stock > 0 && (<button onClick={() => handleTransaction('sell', 'item', item.id, item.price)} className="w-full bg-slate-800 hover:bg-red-900/50 border border-slate-700 hover:border-red-500 text-slate-300 hover:text-red-300 font-bold py-1.5 rounded text-xs transition-colors">VENDRE ({Math.floor(item.price * 0.5)} ₵)</button>)}
                            </div>
                        </div>
                    ))}
                </motion.div>
            )}
            {activeTab === 'POKEMON' && (
                <motion.div key="pokemon" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div className="flex flex-wrap gap-4 mb-6 justify-center bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-slate-900 text-white border border-slate-700 px-4 py-2 rounded-lg outline-none focus:border-cyan-500 hover:border-cyan-500/50 transition-colors"><option value="ALL">Tous les Types</option><option value="FEU">Feu</option><option value="EAU">Eau</option><option value="PLANTE">Plante</option><option value="ÉLECTRIK">Electrik</option><option value="PSY">Psy</option><option value="DRAGON">Dragon</option><option value="SPECTRE">Spectre</option><option value="NORMAL">Normal</option></select>
                        <select value={filterRarity} onChange={(e) => setFilterRarity(e.target.value)} className="bg-slate-900 text-white border border-slate-700 px-4 py-2 rounded-lg outline-none focus:border-purple-500 hover:border-purple-500/50 transition-colors"><option value="ALL">Toutes Raretés</option><option value="COMMUN">Commun</option><option value="PEU COMMUN">Peu Commun</option><option value="RARE">Rare</option><option value="ÉPIQUE">Épique</option><option value="LÉGENDAIRE">Légendaire</option></select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {Array.isArray(filteredPokemons) && filteredPokemons.map(poke => (
                            <div key={poke.id} className={`bg-slate-900/80 border-2 ${getRarityColor(poke.rarityLabel)} p-4 rounded-xl relative group`}>
                                <div className="absolute top-2 left-2 z-10"><span className={`text-[10px] font-bold px-2 py-0.5 rounded bg-slate-950 text-white border border-slate-700`}>{poke.types && poke.types[0] ? poke.types[0].name : '???'}</span></div>
                                <div className="absolute top-2 right-2 z-10">{poke.ownedCount > 0 && (<span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg">POSSÉDÉ x{poke.ownedCount}</span>)}</div>
                                <div className="h-48 flex items-center justify-center bg-[url('/assets/wheel_background.webp')] bg-cover bg-center rounded-lg mb-4 opacity-90 group-hover:opacity-100 transition-opacity overflow-hidden"><img src={poke.sprites.regular} alt={poke.name.fr} loading="lazy" className="w-full h-full object-contain drop-shadow-2xl scale-90 group-hover:scale-105 transition-transform duration-300" /></div>
                                <h3 className="text-xl font-bold text-center text-white font-display mb-1">{poke.name.fr}</h3>
                                <div className="text-center text-xs font-mono text-slate-400 mb-4">{poke.rarityLabel}</div>
                                <div className="space-y-2">
                                    <button onClick={() => handleTransaction('buy', 'pokemon', poke.id, poke.computedPrice)} disabled={(user?.gold || 0) < poke.computedPrice} className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:grayscale text-black font-bold py-2 rounded flex justify-center items-center gap-2 font-display">RECRUTER <span className="bg-black/20 px-1 rounded text-white">{poke.computedPrice} ₵</span></button>
                                    {poke.ownedCount > 0 && (<button onClick={() => handleTransaction('sell', 'pokemon', poke.id, 500)} className="w-full bg-slate-950 hover:bg-red-900/40 border border-slate-800 hover:border-red-500 text-slate-500 hover:text-red-400 font-bold py-1.5 rounded text-xs transition-colors">LIBÉRER (+500 ₵)</button>)}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
        {loading && (<div className="absolute inset-0 bg-slate-950/50 flex items-center justify-center z-50"><div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div></div>)}
    </div>
  );
};