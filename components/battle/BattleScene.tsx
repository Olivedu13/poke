
import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { QuizOverlay } from './QuizOverlay';
import { InventoryBar } from './InventoryBar';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import confetti from 'canvas-confetti';
import axios from 'axios';
import { Item, Pokemon } from '../../types';
import { ASSETS_BASE_URL, API_BASE_URL } from '../../config';

// --- COMPONENTS INTERNES ---

const FloatingText = ({ text, color, x, y }: { text: string, color: string, x: number, y: number }) => (
    <motion.div
        initial={{ opacity: 0, y: y, x: x, scale: 0.5 }}
        animate={{ opacity: 1, y: y - 100, scale: 1.5 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`absolute z-50 font-display font-black text-4xl md:text-6xl ${color} drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] stroke-black`}
        style={{ left: '50%', top: '50%', textShadow: '2px 2px 0px #000' }}
    >
        {text}
    </motion.div>
);

const BattleHud = ({ pokemon, isEnemy }: { pokemon: Pokemon, isEnemy?: boolean }) => {
    const hpPercent = Math.min(100, Math.max(0, (pokemon.current_hp / pokemon.max_hp) * 100));
    const isLow = hpPercent < 25;
    
    return (
        <div className={`absolute z-30 w-[160px] md:w-[240px] flex flex-col gap-1 
            ${isEnemy ? 'top-4 right-4 items-end' : 'bottom-28 left-4 items-start'}
        `}>
            <div className="flex items-baseline gap-2 px-2 py-0.5 rounded-full backdrop-blur-[0px]">
                <span className="font-display font-bold text-white text-xs md:text-sm uppercase tracking-wider drop-shadow-[0_2px_2px_rgba(0,0,0,1)] shadow-black">{pokemon.name}</span>
                <span className={`font-mono text-[10px] font-bold drop-shadow-[0_2px_2px_rgba(0,0,0,1)] shadow-black ${isEnemy ? 'text-red-400' : 'text-cyan-400'}`}>Lv.{pokemon.level}</span>
            </div>
            <div className="w-full h-3 md:h-4 bg-black/20 rounded-full border border-white/10 p-0.5 relative overflow-hidden backdrop-blur-[1px]">
                 <motion.div 
                    className={`h-full rounded-full opacity-90 shadow-[0_0_10px_rgba(0,0,0,0.5)] ${isLow ? 'bg-red-500 animate-pulse' : isEnemy ? 'bg-red-500' : 'bg-gradient-to-r from-cyan-400 to-blue-500'}`}
                    initial={{ width: '100%' }}
                    animate={{ width: `${hpPercent}%` }}
                    transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                 />
            </div>
            <div className="px-1 text-[10px] md:text-xs font-mono font-bold text-white drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,1)] opacity-100 tracking-wide">
                {pokemon.current_hp} / {pokemon.max_hp} PV
            </div>
        </div>
    );
};

const ActionButton = ({ onClick, disabled, label, color }: any) => {
    const colors = {
        red: "from-red-600 to-red-800 border-red-500 shadow-red-900/40",
        blue: "from-cyan-600 to-blue-800 border-cyan-500 shadow-cyan-900/40",
        yellow: "from-yellow-500 to-orange-700 border-yellow-400 shadow-yellow-900/40",
        purple: "from-purple-600 to-purple-800 border-purple-500 shadow-purple-900/40"
    };
    
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                relative w-full h-16 md:h-20 rounded-2xl border-t-2 border-b-4 
                bg-gradient-to-b ${colors[color as keyof typeof colors]}
                shadow-lg active:border-b-0 active:translate-y-1 transition-all
                flex flex-col items-center justify-center gap-1 group overflow-hidden
                disabled:opacity-50 disabled:grayscale
            `}
        >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity"></div>
            <span className="font-display font-black text-white text-sm md:text-base tracking-widest uppercase drop-shadow-sm">
                {label}
            </span>
        </button>
    );
};

// --- PREVIEW SCREEN ---
const PreviewScreen = ({ enemy, player, onStart, onChangePokemon }: any) => {
    if(!enemy || !player) return null;

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 overflow-hidden p-6 animate-in fade-in duration-700">
             {/* Background Effects */}
             <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542259681-d3d64687e382?q=80&w=1000')] bg-cover bg-center opacity-20 blur-sm"></div>
             <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900/80 to-slate-950"></div>
             
             {/* VS Badge */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                 <div className="text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-pulse">
                     VS
                 </div>
             </div>

             <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                 
                 {/* PLAYER SIDE */}
                 <div className="flex flex-col items-center gap-4 order-2 md:order-1">
                     <div className="relative group">
                         <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full group-hover:bg-cyan-500/30 transition-all"></div>
                         <img src={player.sprite_url} className="w-48 h-48 md:w-64 md:h-64 object-contain drop-shadow-2xl relative z-10" />
                     </div>
                     <div className="text-center">
                         <h2 className="text-2xl font-display font-bold text-white">{player.name}</h2>
                         <div className="text-cyan-400 font-mono">Niveau {player.level}</div>
                     </div>
                     <button 
                        onClick={onChangePokemon}
                        className="px-6 py-2 bg-slate-800 border border-slate-600 rounded-full text-slate-300 hover:text-white hover:bg-slate-700 transition-colors text-sm font-bold uppercase tracking-wider"
                     >
                        Changer de Pokémon
                     </button>
                 </div>

                 {/* ENEMY SIDE */}
                 <div className="flex flex-col items-center gap-4 order-1 md:order-2">
                     <div className="relative">
                         <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full"></div>
                         <img src={enemy.sprite_url} className="w-48 h-48 md:w-64 md:h-64 object-contain drop-shadow-2xl grayscale-[0.2] brightness-75" />
                     </div>
                     <div className="text-center">
                         <h2 className="text-2xl font-display font-bold text-red-400">{enemy.name}</h2>
                         <div className="text-red-600 font-mono font-bold">MENACE DÉTECTÉE</div>
                     </div>
                 </div>
             </div>

             <div className="relative z-20 mt-12 w-full max-w-md">
                 <button 
                    onClick={onStart}
                    className="w-full py-5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-display font-black text-2xl tracking-widest rounded-xl shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:shadow-[0_0_50px_rgba(239,68,68,0.6)] hover:scale-[1.02] transition-all"
                 >
                     LANCER LE COMBAT
                 </button>
             </div>
        </div>
    );
};

const TeamSwitcher = ({ team, currentId, onSelect, onClose }: any) => (
    <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-xl p-6 flex flex-col animate-in fade-in slide-in-from-bottom-10">
        <h3 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-2">
            <img src={`${ASSETS_BASE_URL}/pokeball.webp`} className="w-6 h-6"/>
            CHOISIR UN POKÉMON
        </h3>
        <div className="grid grid-cols-1 gap-4 overflow-y-auto flex-1 pb-4">
            {team.map((p: Pokemon) => (
                <button 
                    key={p.id}
                    disabled={p.id === currentId || p.current_hp <= 0}
                    onClick={() => onSelect(p)}
                    className={`
                        flex items-center gap-4 p-4 rounded-xl border-2 transition-all relative overflow-hidden
                        ${p.id === currentId 
                            ? 'border-cyan-500 bg-cyan-900/20 opacity-50 cursor-default' 
                            : p.current_hp <= 0 
                                ? 'border-slate-800 bg-slate-900 opacity-50 grayscale cursor-not-allowed'
                                : 'border-slate-700 bg-slate-800 hover:border-white hover:bg-slate-700 active:scale-[0.98]'}
                    `}
                >
                    <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center border border-slate-700">
                         <img src={p.sprite_url} className="w-14 h-14 object-contain" />
                    </div>
                    
                    <div className="text-left flex-1">
                        <div className="flex justify-between items-center">
                             <div className="font-bold text-white text-lg">{p.name}</div>
                             <div className="text-xs font-mono text-slate-400">Niv. {p.level}</div>
                        </div>
                        
                        <div className="w-full h-3 bg-slate-950 rounded-full mt-2 overflow-hidden border border-slate-800">
                            <div 
                                className={`h-full ${p.current_hp < p.max_hp/4 ? 'bg-red-500' : 'bg-green-500'}`} 
                                style={{ width: `${Math.min(100, (p.current_hp / p.max_hp) * 100)}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between mt-1">
                             <span className="text-[10px] text-slate-500">PV</span>
                             <span className="text-[10px] text-white font-mono">{p.current_hp}/{p.max_hp}</span>
                        </div>
                    </div>
                </button>
            ))}
        </div>
        <button onClick={onClose} className="mt-4 w-full py-4 bg-slate-800 rounded-xl font-bold text-slate-400 hover:text-white border border-slate-700">
            ANNULER
        </button>
    </div>
);


export const BattleScene: React.FC = () => {
    const { 
        user, initBattle, playerPokemon, enemyPokemon, battleLogs, 
        addLog, isPlayerTurn, damageEntity, healEntity, endTurn, battleOver,
        collection, fetchCollection, inventory, fetchInventory, claimBattleRewards
    } = useGameStore();

    // Battle Phase Logic
    const [phase, setPhase] = useState<'LOADING' | 'PREVIEW' | 'FIGHTING' | 'FINISHED'>('LOADING');
    const [previewEnemy, setPreviewEnemy] = useState<Pokemon|null>(null);
    const [selectedPlayer, setSelectedPlayer] = useState<Pokemon|null>(null);

    const [showQuiz, setShowQuiz] = useState(false);
    const [showInventory, setShowInventory] = useState(false);
    const [showTeam, setShowTeam] = useState(false);
    
    // Animation States
    const controlsPlayer = useAnimation();
    const controlsEnemy = useAnimation();
    const containerRef = useRef<HTMLDivElement>(null);
    const [shake, setShake] = useState(false);
    const [flash, setFlash] = useState(false);
    const [floatingTexts, setFloatingTexts] = useState<{id: number, text: string, color: string, x: number, y: number}[]>([]);
    const [rewards, setRewards] = useState<{xp: number, gold: number} | null>(null);

    // --- UTILS ---
    const spawnFloatingText = (text: string, color: string, isPlayerTarget: boolean) => {
        const id = Date.now();
        const x = isPlayerTarget ? Math.random() * 40 - 20 : Math.random() * 40 - 20;
        const y = isPlayerTarget ? 50 : -50;
        setFloatingTexts(prev => [...prev, { id, text, color, x, y }]);
        setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.id !== id)), 1000);
    };

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const triggerFlash = () => {
        setFlash(true);
        setTimeout(() => setFlash(false), 150);
    };

    const fetchTyradexData = async (id: number, level: number = 5): Promise<Pokemon> => {
        const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
        try {
            const response = await axios.get(`https://tyradex.vercel.app/api/v1/pokemon/${id}`, { timeout: 3000 });
            const data = response.data;
            const scale = (base: number) => Math.floor(base * (1 + level / 50));
            const hp = Math.floor(scale(data.stats.hp) * 1.4);
            return {
                id: `wild-${data.pokedexId}`,
                name: data.name.fr,
                sprite_url: spriteUrl,
                level: level,
                max_hp: hp, 
                current_hp: hp,
                type: data.types && data.types[0] ? data.types[0].name : 'Normal',
                stats: { atk: scale(data.stats.atk), def: scale(data.stats.def), spe: scale(data.stats.spe) },
                current_xp: 0,
                tyradex_id: data.pokedexId,
                next_level_xp: 100
            };
        } catch (e) {
             return { 
                id: `wild-fb-${id}`, name: `Pokemon #${id}`, sprite_url: spriteUrl, level: level, max_hp: 70, current_hp: 70, type: 'Normal',
                stats: { atk: 50, def: 50, spe: 50 }, current_xp: 0, tyradex_id: id, next_level_xp: 100
            };
        }
    };

    // --- SETUP BATTLE ---
    useEffect(() => {
        const setup = async () => {
            setPhase('LOADING');
            await fetchCollection();
            await fetchInventory();

            // 1. Select Player Leader
            const myTeam = useGameStore.getState().collection;
            const activeTeam = myTeam.filter(p => p.is_team && p.current_hp > 0);
            const starter = activeTeam[0] || myTeam[0]; // Fallback to first even if KO to show "Change Team"

            if (starter) setSelectedPlayer(starter);

            // 2. Generate Enemy
            const enemyId = Math.floor(Math.random() * 150) + 1;
            const enemyLevel = Math.max(1, (starter?.level || 1) + Math.floor(Math.random() * 3) - 1);
            const enemy = await fetchTyradexData(enemyId, enemyLevel);
            setPreviewEnemy(enemy);

            setPhase('PREVIEW');
        };
        setup();
    }, []);

    const startBattle = () => {
        if(selectedPlayer && previewEnemy) {
            initBattle(selectedPlayer, previewEnemy);
            setPhase('FIGHTING');
        }
    };

    // --- BATTLE LOGIC ---

    // Win Check
    useEffect(() => {
        if (battleOver && enemyPokemon?.current_hp === 0 && phase === 'FIGHTING') {
            setPhase('FINISHED');
            confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
            
            // Calculate Rewards
            const xpGain = (enemyPokemon.level * 20) + 10;
            const goldGain = (enemyPokemon.level * 10) + 5;
            setRewards({ xp: xpGain, gold: goldGain });
            
            // Secure Claim
            claimBattleRewards(xpGain, goldGain);
            addLog({ message: 'VICTOIRE !', type: 'INFO' });
        } else if (battleOver && playerPokemon?.current_hp === 0 && phase === 'FIGHTING') {
             setPhase('FINISHED');
             setRewards(null);
        }
    }, [battleOver, phase]);

    // AI Turn
    useEffect(() => {
        if (phase === 'FIGHTING' && !isPlayerTurn && !battleOver && enemyPokemon && playerPokemon) {
            const aiTurn = async () => {
                await new Promise(r => setTimeout(r, 1000));
                
                await controlsEnemy.start({ x: -100, y: 100, scale: 1.2, transition: { duration: 0.2 } });
                await controlsEnemy.start({ x: 0, y: 0, scale: 1, transition: { type: "spring", stiffness: 300 } });
                
                triggerShake();
                triggerFlash();
                
                const dmg = Math.max(1, Math.floor((enemyPokemon.stats?.atk || 10) / 6) + Math.floor(Math.random() * 3));
                damageEntity('PLAYER', dmg);
                spawnFloatingText(`-${dmg}`, 'text-red-500', true);
                addLog({ message: `${enemyPokemon.name} attaque !`, type: 'ENEMY' });
                
                endTurn();
            };
            aiTurn();
        }
    }, [isPlayerTurn, battleOver, phase]);


    const handleQuizComplete = async (isCorrect: boolean, damage: number) => {
        setShowQuiz(false);
        if (isCorrect) {
            await controlsPlayer.start({ x: 100, y: -100, scale: 1.2, transition: { duration: 0.2 } });
            controlsPlayer.start({ x: 0, y: 0, scale: 1, transition: { type: "spring", stiffness: 300 } });
            controlsEnemy.start({ x: [0, 10, -10, 0], filter: ["brightness(1)", "brightness(2)", "brightness(1)"], transition: { duration: 0.3 } });

            damageEntity('ENEMY', damage);
            spawnFloatingText(`-${damage}`, 'text-yellow-400', false);
            if (damage > 20) spawnFloatingText("CRITIQUE!", "text-yellow-300", false);
            addLog({ message: `Coup réussi ! -${damage} PV`, type: 'PLAYER' });
            endTurn();
        } else {
            addLog({ message: `Raté...`, type: 'INFO' });
            endTurn();
        }
    };

    const handleUseItem = async (item: Item) => {
        if (['HEAL', 'BUFF_ATK', 'BUFF_DEF'].includes(item.effect_type)) {
            // Apply visual effect
            if (item.effect_type === 'HEAL') {
                 healEntity('PLAYER', item.value);
                 spawnFloatingText(`+${item.value}`, 'text-green-400', true);
            }
            
            // Call API to consume item in DB
            try {
                 await axios.post(`${API_BASE_URL}/collection.php`, {
                     action: 'use_item',
                     user_id: user?.id,
                     item_id: item.id,
                     pokemon_id: playerPokemon?.id // Consumed on battle instance but technically syncs with DB id via use_item logic
                 });
                 // Refresh inventory to update count
                 await fetchInventory();
            } catch(e) { console.error("Item sync failed"); }

            setShowInventory(false);
            endTurn();
        }
    };

    const handleSwitchPokemon = (newPoke: Pokemon) => {
        if(phase === 'PREVIEW') {
            setSelectedPlayer(newPoke);
            setShowTeam(false);
        } else {
            useGameStore.setState({ 
                playerPokemon: newPoke,
                isPlayerTurn: false 
            });
            setShowTeam(false);
            addLog({ message: `Go ${newPoke.name} !`, type: 'PLAYER' });
        }
    };

    const handleExitBattle = () => {
        // Reset to preview for next fight
        setPhase('LOADING');
        useGameStore.setState({
            playerPokemon: null,
            enemyPokemon: null,
            battleOver: false,
            battleLogs: [],
            isPlayerTurn: true
        });
        // Trigger re-setup
        window.location.reload(); // Simple reload to restart clean for MVP or re-trigger useEffect
    };

    // Filter Inventory for Battle
    const battleItems = inventory.filter(i => i.quantity > 0 && ['HEAL', 'BUFF_ATK', 'BUFF_DEF'].includes(i.effect_type));

    // --- RENDERERS ---

    if (phase === 'LOADING') {
        return <div className="flex h-full items-center justify-center text-cyan-500 font-display animate-pulse">RECHERCHE D'ADVERSAIRE...</div>;
    }

    if (phase === 'PREVIEW') {
        return (
            <>
                <PreviewScreen 
                    enemy={previewEnemy} 
                    player={selectedPlayer} 
                    onStart={startBattle} 
                    onChangePokemon={() => setShowTeam(true)} 
                />
                {showTeam && (
                    <TeamSwitcher 
                        team={collection.filter(p => p.is_team)} 
                        currentId={selectedPlayer?.id}
                        onSelect={handleSwitchPokemon}
                        onClose={() => setShowTeam(false)}
                    />
                )}
            </>
        );
    }

    // FIGHTING / FINISHED PHASE
    if (!playerPokemon || !enemyPokemon) return null;

    return (
        <div className={`relative w-full h-[calc(100vh-140px)] bg-slate-950 overflow-hidden flex flex-col ${shake ? 'animate-shake' : ''}`}>
            
            {/* 1. SCÈNE DE COMBAT */}
            <div className="relative flex-grow w-full overflow-hidden" ref={containerRef}>
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542259681-d3d64687e382?q=80&w=1000')] bg-cover bg-center opacity-40"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-transparent to-slate-950"></div>
                
                <AnimatePresence>
                    {flash && <motion.div initial={{ opacity: 0.5 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-red-600 z-40 mix-blend-overlay pointer-events-none" />}
                </AnimatePresence>

                {/* ENNEMI */}
                <div className="absolute top-[10%] right-[10%] w-[40%] h-[30%] flex flex-col items-center justify-center z-10">
                    <BattleHud pokemon={enemyPokemon} isEnemy />
                    <motion.img 
                        src={enemyPokemon.sprite_url} 
                        animate={controlsEnemy}
                        initial={{ y: 0 }}
                        className="w-32 h-32 md:w-56 md:h-56 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] z-20"
                        style={{ filter: 'drop-shadow(0px 0px 10px rgba(255,0,0,0.2))' }}
                    />
                </div>

                {/* JOUEUR */}
                <div className="absolute bottom-[5%] left-[10%] w-[45%] h-[40%] flex flex-col items-center justify-center z-20">
                    <motion.img 
                        src={playerPokemon.sprite_url} 
                        animate={controlsPlayer}
                        className="w-40 h-40 md:w-72 md:h-72 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] z-20"
                        style={{ filter: 'drop-shadow(0px 0px 15px rgba(6,182,212,0.3))' }}
                    />
                    <BattleHud pokemon={playerPokemon} />
                </div>

                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <AnimatePresence>
                        {floatingTexts.map(ft => (
                             <FloatingText key={ft.id} {...ft} />
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* 2. ZONE DE CONTRÔLE */}
            <div className="relative z-30 bg-slate-900 border-t border-cyan-900/50 p-3 pb-6 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                <div className="flex justify-between items-center mb-3 px-1">
                    <div className="text-[10px] md:text-xs text-slate-400 font-mono">
                         VS <span className="text-white font-bold">{enemyPokemon.name}</span>
                    </div>
                    <div className="h-6 px-3 bg-slate-800 rounded flex items-center text-[10px] md:text-xs font-mono text-cyan-200 border border-slate-700 truncate max-w-[200px]">
                        {battleLogs.length > 0 ? `› ${battleLogs[battleLogs.length-1].message}` : "› Prêt au combat"}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <ActionButton 
                        label="ATTAQUE" 
                        color="red"
                        onClick={() => setShowQuiz(true)} 
                        disabled={!isPlayerTurn || battleOver}
                    />
                    <ActionButton 
                        label="OBJETS" 
                        color="yellow"
                        onClick={() => setShowInventory(true)} 
                        disabled={!isPlayerTurn || battleOver}
                    />
                    <ActionButton 
                        label="ÉQUIPE" 
                        color="blue"
                        onClick={() => setShowTeam(true)} 
                        disabled={!isPlayerTurn || battleOver}
                    />
                </div>
            </div>

            {/* --- MODALS --- */}
            <AnimatePresence>
                {showQuiz && user && (
                    <QuizOverlay user={user} onComplete={handleQuizComplete} onClose={() => setShowQuiz(false)} />
                )}
                {showInventory && (
                    <InventoryBar items={battleItems} onUse={handleUseItem} onClose={() => setShowInventory(false)} />
                )}
                {showTeam && (
                    <TeamSwitcher 
                        team={collection.filter(p => p.is_team)} 
                        currentId={playerPokemon.id}
                        onSelect={handleSwitchPokemon}
                        onClose={() => setShowTeam(false)}
                    />
                )}
                
                {phase === 'FINISHED' && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6"
                    >
                        <h2 className={`text-5xl font-display font-black mb-4 ${enemyPokemon.current_hp === 0 ? 'text-yellow-400' : 'text-red-500'}`}>
                            {enemyPokemon.current_hp === 0 ? 'VICTOIRE' : 'DÉFAITE'}
                        </h2>
                        
                        {rewards && (
                            <div className="flex gap-4 mb-8">
                                 <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl flex flex-col items-center min-w-[100px]">
                                    <img src={`${ASSETS_BASE_URL}/xp.webp`} className="w-8 h-8 mb-2"/>
                                    <span className="font-mono text-white font-bold">+{rewards.xp} XP</span>
                                 </div>
                                 <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl flex flex-col items-center min-w-[100px]">
                                    <img src={`${ASSETS_BASE_URL}/credits.webp`} className="w-8 h-8 mb-2"/>
                                    <span className="font-mono text-yellow-400 font-bold">+{rewards.gold} ₵</span>
                                 </div>
                            </div>
                        )}

                        <button 
                            onClick={handleExitBattle}
                            className="w-full max-w-xs bg-cyan-600 hover:bg-cyan-500 text-black font-display font-bold py-4 rounded-xl shadow-lg transition-transform hover:scale-105"
                        >
                            RETOUR BASE
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
