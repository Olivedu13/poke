
import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { QuizOverlay } from './QuizOverlay';
import { InventoryBar } from './InventoryBar';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import confetti from 'canvas-confetti';
import axios from 'axios';
import { Item, Pokemon } from '../../types';
import { ASSETS_BASE_URL, API_BASE_URL } from '../../config';
import { playSfx } from '../../utils/soundEngine'; // Ensure import

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
                <span className="font-display font-bold text-white text-xs md:text-sm uppercase tracking-wider drop-shadow-[0_2px_2px_rgba(0,0,0,1)] shadow-black flex items-center gap-2">
                    {pokemon.name}
                    {pokemon.isBoss && <span className="bg-red-600 text-white px-1 rounded text-[10px] animate-pulse">BOSS</span>}
                </span>
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

const GradeGauge = ({ current, max = 20, grade }: { current: number, max?: number, grade: string }) => {
    const percent = Math.min(100, Math.max(0, (current / max) * 100));
    
    return (
        <div className="absolute top-4 left-4 z-40 flex flex-col items-start gap-1">
            <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-purple-500/50 shadow-lg flex items-center gap-2">
                <span className="text-xs text-purple-300 font-mono uppercase tracking-widest">Niveau</span>
                <span className="text-lg font-display font-bold text-white">{grade}</span>
            </div>
            <div className="w-48 h-3 bg-slate-900 rounded-full border border-slate-700 overflow-hidden relative shadow-inner">
                 {[0.25, 0.5, 0.75].map(s => (
                     <div key={s} className="absolute top-0 bottom-0 w-[1px] bg-slate-600 z-10 opacity-50" style={{ left: `${s*100}%` }}></div>
                 ))}
                 <motion.div 
                    className="h-full bg-gradient-to-r from-purple-700 via-purple-500 to-pink-500"
                    initial={{ width: '0%' }}
                    animate={{ width: `${percent}%` }}
                    transition={{ type: "spring", stiffness: 50 }}
                 />
            </div>
            {/* Indicateur explicite quand on descend */}
            <div className="pl-2 flex gap-2 items-center">
                 <span className="text-[10px] text-purple-400 font-mono opacity-80">{current} / {max} pts</span>
                 {current < 5 && <span className="text-[10px] text-red-500 font-bold animate-pulse">DANGER !</span>}
            </div>
        </div>
    );
};

const TeamManager = ({ team, box, currentId, onSelect, onClose, onStartBattle }: any) => {
    const [mobileTab, setMobileTab] = useState<'TEAM' | 'BOX'>('TEAM');
    const [selected, setSelected] = useState<Pokemon | null>(
        team.find((p: Pokemon) => p.id === currentId) || null
    );

    const handleCardClick = (p: Pokemon) => { setSelected(p); };

    const handleConfirm = () => {
        if (selected) {
            const isTeam = team.some((p: Pokemon) => p.id === selected.id);
            onSelect(selected, isTeam);
        }
    };

    return (
        <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-xl p-4 flex flex-col animate-in fade-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
                    <img src={`${ASSETS_BASE_URL}/pokeball.webp`} className="w-6 h-6"/>
                    GESTION
                </h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white font-bold px-3 py-1 bg-slate-800 rounded">RETOUR</button>
            </div>
            <div className="flex md:hidden gap-2 mb-4 bg-slate-900 p-1 rounded-lg shrink-0">
                <button onClick={() => setMobileTab('TEAM')} className={`flex-1 py-2 rounded font-bold text-sm ${mobileTab === 'TEAM' ? 'bg-cyan-600 text-white' : 'text-slate-500'}`}>ÉQUIPE ({team.length}/3)</button>
                <button onClick={() => setMobileTab('BOX')} className={`flex-1 py-2 rounded font-bold text-sm ${mobileTab === 'BOX' ? 'bg-cyan-600 text-white' : 'text-slate-500'}`}>RÉSERVE</button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-4 pb-32 md:pb-0">
                <div className={`flex-1 bg-slate-900/50 rounded-xl p-3 border border-cyan-500/30 overflow-y-auto ${mobileTab === 'BOX' ? 'hidden md:block' : ''}`}>
                    <h4 className="text-cyan-400 font-bold text-sm mb-3 uppercase tracking-wider hidden md:block">Équipe Active</h4>
                    <div className="space-y-3">
                        {team.map((p: Pokemon) => (
                            <div key={p.id} onClick={() => handleCardClick(p)} 
                                className={`p-2 rounded-lg border bg-slate-800 flex items-center gap-3 cursor-pointer transition-colors ${selected?.id === p.id ? 'border-cyan-400 bg-cyan-900/30' : 'border-slate-700 hover:bg-cyan-900/20'} ${p.id === currentId ? 'shadow-[0_0_10px_rgba(34,211,238,0.1)]' : ''}`}
                            >
                                <img src={p.sprite_url} className="w-12 h-12" />
                                <div>
                                    <div className="font-bold text-white">{p.name}</div>
                                    <div className="text-xs text-slate-400">Pv: {p.current_hp}/{p.max_hp}</div>
                                </div>
                                {p.id === currentId && <span className="ml-auto text-[10px] bg-cyan-500 text-black px-1 rounded font-bold">ACTUEL</span>}
                            </div>
                        ))}
                    </div>
                </div>
                <div className={`flex-1 bg-slate-900/50 rounded-xl p-3 border border-slate-700 overflow-y-auto ${mobileTab === 'TEAM' ? 'hidden md:block' : ''}`}>
                    <h4 className="text-slate-400 font-bold text-sm mb-3 uppercase tracking-wider hidden md:block">RÉSERVE</h4>
                    <div className="grid grid-cols-2 gap-2">
                        {box.map((p: Pokemon) => (
                                <div key={p.id} onClick={() => handleCardClick(p)} className={`p-2 rounded border bg-slate-800 cursor-pointer flex flex-col items-center text-center transition-all ${selected?.id === p.id ? 'border-cyan-400 bg-cyan-900/30' : 'border-slate-700 hover:border-cyan-500/50'}`}>
                                <img src={p.sprite_url} className="w-10 h-10 opacity-80" />
                                <div className="text-xs font-bold text-slate-300 truncate w-full">{p.name}</div>
                                </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-slate-950 border-t border-slate-800 flex flex-col gap-3 z-50">
                {onStartBattle && team.length > 0 && (
                     <button onClick={onStartBattle} className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-display font-black text-xl rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.4)] animate-pulse">⚔️ LANCER LE COMBAT</button>
                )}
                <div className="flex gap-2">
                    <button onClick={handleConfirm} disabled={!selected} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold rounded-xl border border-slate-600">
                        {selected ? (team.some((p: Pokemon) => p.id === selected.id) ? 'DÉFINIR COMME LEADER' : 'ÉCHANGER') : 'SÉLECTIONNER UN POKÉMON'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ActionButton = ({ onClick, disabled, label, color, isUltimate }: any) => {
    const colors = {
        red: "from-red-600 to-red-800 border-red-500 shadow-red-900/40",
        blue: "from-cyan-600 to-blue-800 border-cyan-500 shadow-cyan-900/40",
        yellow: "from-yellow-500 to-orange-700 border-yellow-400 shadow-yellow-900/40",
        purple: "from-purple-600 to-purple-800 border-purple-500 shadow-purple-900/40"
    };

    if (isUltimate) {
        return (
            <button
                onClick={onClick}
                disabled={disabled}
                className="relative w-full h-16 md:h-20 rounded-2xl border-2 border-white bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 shadow-[0_0_30px_rgba(79,70,229,0.8)] flex flex-col items-center justify-center overflow-hidden animate-pulse group active:scale-95 transition-transform"
            >
                <div className="absolute inset-0 bg-[url('https://media.giphy.com/media/26tOZ42Mg6pbTUPv2/giphy.gif')] opacity-20 bg-cover mix-blend-overlay"></div>
                <span className="relative z-10 font-display font-black text-white text-lg tracking-widest italic drop-shadow-lg">FRAPPE ULTIME</span>
                <span className="relative z-10 text-[10px] font-mono text-cyan-200">MAXIMUM POWER</span>
            </button>
        )
    }
    
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

const PreviewScreen = ({ enemy, player, onStart, onManageTeam }: any) => {
    if(!enemy || !player) return null;
    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 overflow-hidden p-6 animate-in fade-in duration-700">
             <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900/80 to-slate-950"></div>
             
             {/* VS Visual */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                 <div className="text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-pulse">VS</div>
             </div>
             
             {enemy.isBoss && (
                  <div className="absolute top-10 left-0 right-0 z-30 text-center animate-bounce">
                      <div className="inline-block px-8 py-2 bg-red-600 skew-x-[-12deg] shadow-[0_0_50px_rgba(220,38,38,0.8)]">
                          <h1 className="text-4xl md:text-6xl font-display font-black text-white uppercase tracking-widest skew-x-[12deg]">BOSS BATTLE</h1>
                      </div>
                  </div>
             )}

             <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                 <div className="flex flex-col items-center gap-4 order-2 md:order-1">
                     <div className="relative group">
                         <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full group-hover:bg-cyan-500/30 transition-all"></div>
                         <img src={player.sprite_url} className="w-48 h-48 md:w-64 md:h-64 object-contain drop-shadow-2xl relative z-10" />
                     </div>
                     <div className="text-center">
                         <h2 className="text-2xl font-display font-bold text-white">{player.name}</h2>
                         <button onClick={onManageTeam} className="mt-2 px-6 py-2 bg-slate-800 border border-slate-600 rounded-full text-slate-300 hover:text-white text-sm font-bold uppercase tracking-wider flex items-center gap-2 mx-auto">
                            <img src={`${ASSETS_BASE_URL}/pokeball.webp`} className="w-4 h-4"/> Gérer l'équipe
                         </button>
                     </div>
                 </div>
                 <div className="flex flex-col items-center gap-4 order-1 md:order-2">
                     <div className="relative">
                         <div className={`absolute inset-0 blur-xl rounded-full ${enemy.isBoss ? 'bg-red-600/40 animate-pulse' : 'bg-red-500/20'}`}></div>
                         <img 
                            src={enemy.sprite_url} 
                            className={`object-contain drop-shadow-2xl grayscale-[0.2] brightness-75 transition-all ${enemy.isBoss ? 'w-64 h-64 md:w-80 md:h-80 scale-110' : 'w-48 h-48 md:w-64 md:h-64'}`} 
                         />
                     </div>
                     <div className="text-center">
                         <h2 className={`text-2xl font-display font-bold ${enemy.isBoss ? 'text-red-500 text-3xl' : 'text-red-400'}`}>{enemy.name}</h2>
                         <div className="text-red-600 font-mono font-bold">MENACE DÉTECTÉE</div>
                     </div>
                 </div>
             </div>
             <div className="relative z-20 mt-12 w-full max-w-md">
                 <button onClick={onStart} className="w-full py-5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-display font-black text-2xl tracking-widest rounded-xl shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:shadow-[0_0_50px_rgba(239,68,68,0.6)] hover:scale-[1.02] transition-all">LANCER LE COMBAT</button>
             </div>
        </div>
    );
};

export const BattleScene: React.FC = () => {
    const { 
        user, initBattle, playerPokemon, enemyPokemon, battleLogs, 
        addLog, isPlayerTurn, damageEntity, healEntity, endTurn, battleOver,
        collection, fetchCollection, inventory, fetchInventory, claimBattleRewards,
        gradeGauge, updateGradeProgress, swapTeamMember,
        combo, specialGauge, consumeSpecial 
    } = useGameStore();

    const [phase, setPhase] = useState<'LOADING' | 'PREVIEW' | 'FIGHTING' | 'FINISHED'>('LOADING');
    const [previewEnemy, setPreviewEnemy] = useState<Pokemon|null>(null);
    const [selectedPlayer, setSelectedPlayer] = useState<Pokemon|null>(null);
    const [showQuiz, setShowQuiz] = useState(false);
    const [showInventory, setShowInventory] = useState(false);
    const [showTeam, setShowTeam] = useState(false);
    const [lootRevealed, setLootRevealed] = useState(false); // NEW STATE FOR CHEST
    
    const controlsPlayer = useAnimation();
    const controlsEnemy = useAnimation();
    const containerRef = useRef<HTMLDivElement>(null);
    const [shake, setShake] = useState(false);
    const [flash, setFlash] = useState(false);
    const [floatingTexts, setFloatingTexts] = useState<{id: number, text: string, color: string, x: number, y: number}[]>([]);
    const [rewards, setRewards] = useState<{xp: number, gold: number, loot?: string} | null>(null);

    const spawnFloatingText = (text: string, color: string, isPlayerTarget: boolean) => {
        const id = Date.now();
        const x = isPlayerTarget ? Math.random() * 40 - 20 : Math.random() * 40 - 20;
        const y = isPlayerTarget ? 50 : -50;
        setFloatingTexts(prev => [...prev, { id, text, color, x, y }]);
        setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.id !== id)), 1000);
    };

    const triggerShake = (intensity = 1) => {
        setShake(true);
        setTimeout(() => setShake(false), 500 * intensity);
    };

    const triggerFlash = (color = 'red') => {
        setFlash(true);
        setTimeout(() => setFlash(false), 200);
    };

    const fetchTyradexData = async (id: number, level: number = 5): Promise<Pokemon> => {
        const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
        
        // --- BOSS LOGIC (Every 3 fights) ---
        const streak = user?.streak || 0;
        const isBoss = (streak + 1) % 3 === 0;

        try {
            const response = await axios.get(`https://tyradex.vercel.app/api/v1/pokemon/${id}`, { timeout: 3000 });
            const data = response.data;
            const scale = (base: number) => Math.floor(base * (1 + level / 50));
            
            // HP SCALING : Normal x4 (vs x2 before), Boss x10 (vs x5 before) to prevent one-shot
            const hpMult = isBoss ? 10.0 : 4.0;
            const hp = Math.floor(scale(data.stats.hp) * hpMult);
            
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
                next_level_xp: 100,
                isBoss: isBoss
            };
        } catch (e) {
             const hpMult = isBoss ? 10.0 : 4.0;
             return { 
                id: `wild-fb-${id}`, name: `Pokemon #${id}`, sprite_url: spriteUrl, level: level, max_hp: 70 * hpMult, current_hp: 70 * hpMult, type: 'Normal',
                stats: { atk: 50, def: 50, spe: 50 }, current_xp: 0, tyradex_id: id, next_level_xp: 100, isBoss: isBoss
            };
        }
    };

    useEffect(() => {
        if (phase === 'LOADING') {
            const setup = async () => {
                await fetchCollection();
                await fetchInventory();
                const myTeam = useGameStore.getState().collection;
                const activeTeam = myTeam.filter(p => p.is_team && p.current_hp > 0);
                const starter = activeTeam[0] || myTeam[0]; 
                if (starter) setSelectedPlayer(starter);
                
                // Difficulty Scaling
                const baseLevel = (starter?.level || 1);
                const enemyLevel = Math.max(1, baseLevel + Math.floor(Math.random() * 3) - 1);
                
                const enemyId = Math.floor(Math.random() * 150) + 1;
                const enemy = await fetchTyradexData(enemyId, enemyLevel);
                
                setPreviewEnemy(enemy);
                setPhase('PREVIEW');
            };
            setup();
        }
    }, [phase]);

    const startBattle = () => {
        if(selectedPlayer && previewEnemy) {
            initBattle(selectedPlayer, previewEnemy);
            setPhase('FIGHTING');
        }
    };

    useEffect(() => {
        if (battleOver && enemyPokemon?.current_hp === 0 && phase === 'FIGHTING') {
            setPhase('FINISHED');
            confetti({ particleCount: 200, spread: 150, origin: { y: 0.6 } });
            
            // --- REWARDS CALCULATION ---
            const isBoss = enemyPokemon.isBoss || false;
            let xpGain = (enemyPokemon.level * 20) + 10;
            let goldGain = (enemyPokemon.level * 10) + 5;
            
            if (isBoss) {
                xpGain *= 3;
                goldGain *= 3;
            }
            
            // --- LOOT DROP SYSTEM (30% Chance) ---
            let loot: string | undefined = undefined;
            const roll = Math.random();
            if (roll < 0.30 || isBoss) { 
                // RARITÉ NIVEAU 1 UNIQUEMENT (Sauf Boss qui a un bonus)
                const items = ['heal_r1', 'pokeball'];
                loot = items[Math.floor(Math.random() * items.length)];
                
                // Le Boss donne une potion R2 (Uncommon) mais reste modeste
                if (isBoss) loot = 'heal_r2'; 
            }

            setRewards({ xp: xpGain, gold: goldGain, loot });
            claimBattleRewards(xpGain, goldGain, loot);
            addLog({ message: 'VICTOIRE !', type: 'INFO' });

        } else if (battleOver && playerPokemon?.current_hp === 0 && phase === 'FIGHTING') {
             setPhase('FINISHED');
             setRewards(null);
        }
    }, [battleOver, phase]);

    useEffect(() => {
        if (phase === 'FIGHTING' && !isPlayerTurn && !battleOver && enemyPokemon && playerPokemon) {
            const aiTurn = async () => {
                await new Promise(r => setTimeout(r, 1000));
                await controlsEnemy.start({ x: -100, y: 100, scale: 1.2, transition: { duration: 0.2 } });
                await controlsEnemy.start({ x: 0, y: 0, scale: 1, transition: { type: "spring", stiffness: 300 } });
                triggerShake();
                triggerFlash('red');
                const dmg = Math.max(1, Math.floor((enemyPokemon.stats?.atk || 10) / 6) + Math.floor(Math.random() * 3));
                damageEntity('PLAYER', dmg);
                spawnFloatingText(`-${dmg}`, 'text-red-500', true);
                addLog({ message: `${enemyPokemon.name} attaque !`, type: 'ENEMY' });
                endTurn();
            };
            aiTurn();
        }
    }, [isPlayerTurn, battleOver, phase]);

    // LOGIQUE DE CALCUL DE DÉGÂTS (Mutualisée)
    const executeAttack = async (isUltimate = false, isCorrect = true, difficulty = 'HARD') => {
        let damage = 0;
        try {
             const combatRes = await axios.post(`${API_BASE_URL}/combat_engine.php`, {
                is_correct: isCorrect,
                // CORRECTION CRITIQUE : Utiliser le niveau du POKEMON, pas celui du joueur global
                // Sinon un joueur haut niveau One-Shot tout avec un Pokemon niveau 1
                attacker_level: playerPokemon?.level || 1, 
                attacker_type: 'FIRE', 
                enemy_type: 'PLANTE',
                combo: combo,
                is_ultimate: isUltimate
            });
            if(combatRes.data && combatRes.data.damage) damage = combatRes.data.damage;
        } catch(e) { damage = isUltimate ? 50 : 12; }

        if (isCorrect) {
            await controlsPlayer.start({ x: 100, y: -100, scale: isUltimate ? 1.5 : 1.2, transition: { duration: 0.2 } });
            controlsPlayer.start({ x: 0, y: 0, scale: 1, transition: { type: "spring", stiffness: 300 } });
            controlsEnemy.start({ x: [0, 20, -20, 0], filter: ["brightness(1)", "brightness(3)", "brightness(1)"], transition: { duration: 0.3 } });

            damageEntity('ENEMY', damage);
            spawnFloatingText(`-${damage}`, isUltimate ? 'text-purple-400 text-6xl' : 'text-yellow-400', false);
            
            if (isUltimate) {
                spawnFloatingText("ULTIMATE!", "text-cyan-300", false);
                triggerShake(2);
            } else if (damage > 20) {
                spawnFloatingText("CRITIQUE!", "text-yellow-300", false);
            }
            addLog({ message: isUltimate ? `FRAPPE ULTIME -${damage}!` : `Coup réussi ! -${damage}`, type: 'PLAYER' });
            endTurn();
        } else {
            addLog({ message: `Raté...`, type: 'INFO' });
            triggerShake(0.5); // Petit shake punitif
            endTurn();
        }
    };

    const handleQuizComplete = async (isCorrect: boolean, dmgDealt: number, difficulty: string) => {
        setShowQuiz(false);
        const leveled = await updateGradeProgress(isCorrect, difficulty);
        if(!isCorrect) triggerFlash('red'); // Feedback erreur
        executeAttack(false, isCorrect, difficulty);
    };

    const handleUltimate = () => {
        consumeSpecial();
        // Pas de quiz pour l'ultime, c'est la récompense
        executeAttack(true, true, 'HARD');
    };

    const handleUseItem = async (item: Item) => {
        if (['HEAL', 'BUFF_ATK', 'BUFF_DEF'].includes(item.effect_type)) {
            playSfx('POTION'); // SOUND FX
            if (item.effect_type === 'HEAL') {
                 healEntity('PLAYER', item.value);
                 spawnFloatingText(`+${item.value}`, 'text-green-400', true);
            }
            try {
                 await axios.post(`${API_BASE_URL}/collection.php`, { action: 'use_item', user_id: user?.id, item_id: item.id, pokemon_id: playerPokemon?.id });
                 await fetchInventory();
            } catch(e) {}
            setShowInventory(false);
            endTurn();
        }
    };

    const handleTeamManage = async (poke: Pokemon, isFromTeam: boolean) => {
        if (phase === 'PREVIEW' && selectedPlayer) {
            if (isFromTeam) {
                setSelectedPlayer(poke);
            } else {
                const success = await swapTeamMember(selectedPlayer.id, poke.id);
                if (success) setSelectedPlayer(poke);
            }
        } 
    };

    const handleSwitchPokemon = (newPoke: Pokemon, isFromTeam: boolean) => {
        if (isFromTeam) {
            useGameStore.setState({ playerPokemon: newPoke, isPlayerTurn: false });
            setShowTeam(false);
            addLog({ message: `Go ${newPoke.name} !`, type: 'PLAYER' });
        }
    };

    const handleExitBattle = () => {
        setRewards(null);
        setLootRevealed(false); // RESET LOOT ANIMATION
        useGameStore.setState({ playerPokemon: null, enemyPokemon: null, battleOver: false, battleLogs: [], isPlayerTurn: true, gradeGauge: 0, combo: 0, specialGauge: 0 });
        setPhase('LOADING');
    };

    const battleItems = inventory.filter(i => i.quantity > 0 && ['HEAL', 'BUFF_ATK', 'BUFF_DEF'].includes(i.effect_type));
    const teamPokemon = collection.filter(p => p.is_team);
    const boxPokemon = collection.filter(p => !p.is_team);

    if (phase === 'LOADING') return <div className="flex h-full items-center justify-center text-cyan-500 font-display animate-pulse">RECHERCHE D'ADVERSAIRE...</div>;
    
    if (phase === 'PREVIEW') {
        return (
            <>
                <PreviewScreen enemy={previewEnemy} player={selectedPlayer} onStart={startBattle} onManageTeam={() => setShowTeam(true)} />
                {showTeam && <TeamManager team={teamPokemon} box={boxPokemon} currentId={selectedPlayer?.id} onSelect={handleSwitchPokemon} onClose={() => setShowTeam(false)} onStartBattle={() => { setShowTeam(false); startBattle(); }} />}
            </>
        );
    }

    if (!playerPokemon || !enemyPokemon) return null;

    return (
        <div className={`relative w-full h-[calc(100vh-140px)] bg-slate-950 overflow-hidden flex flex-col ${shake ? 'animate-shake' : ''}`}>
            
            {/* Jauge de Progression Scolaire */}
            {user && <GradeGauge current={gradeGauge} grade={user.grade_level} />}

            {/* Jauge ULTIME Circulaire et Combo */}
            <div className="absolute top-4 right-4 z-40 flex flex-col items-end gap-2">
                 {/* Combo Counter */}
                 {combo > 1 && (
                     <motion.div 
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="font-display font-black text-2xl md:text-4xl text-yellow-400 italic drop-shadow-[0_4px_0_rgba(0,0,0,1)] animate-bounce"
                     >
                         COMBO x{combo}
                     </motion.div>
                 )}
            </div>

            {/* SCÈNE DE COMBAT */}
            <div className="relative flex-grow w-full overflow-hidden" ref={containerRef}>
                {/* BACKROUND INTERNE (Pas d'image externe) */}
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 opacity-100">
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(6,182,212,0.1)_50%,transparent_75%,transparent)] bg-[size:3rem_3rem] opacity-20"></div>
                </div>

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
                        className={`object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] z-20 ${enemyPokemon.isBoss ? 'w-48 h-48 md:w-80 md:h-80 drop-shadow-[0_0_30px_rgba(255,0,0,0.6)]' : 'w-32 h-32 md:w-56 md:h-56'}`}
                        style={{ filter: enemyPokemon.isBoss ? 'drop-shadow(0px 0px 10px rgba(255,0,0,0.8))' : 'drop-shadow(0px 0px 10px rgba(255,0,0,0.2))' }}
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

            {/* ZONE DE CONTRÔLE */}
            <div className="relative z-30 bg-slate-900 border-t border-cyan-900/50 p-3 pb-6 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                
                {/* Ultimate Bar (Mini) */}
                <div className="absolute -top-3 left-0 right-0 h-3 bg-slate-950 flex justify-center overflow-hidden">
                    <motion.div 
                        className="h-full bg-gradient-to-r from-blue-600 via-purple-500 to-blue-600 bg-[length:200%_100%] animate-[shimmer_2s_linear_infinite]"
                        initial={{ width: 0 }}
                        animate={{ width: `${specialGauge}%` }}
                    />
                </div>

                <div className="flex justify-between items-center mb-3 px-1">
                    <div className="text-[10px] md:text-xs text-slate-400 font-mono">VS <span className="text-white font-bold">{enemyPokemon.name}</span></div>
                    <div className="h-6 px-3 bg-slate-800 rounded flex items-center text-[10px] md:text-xs font-mono text-cyan-200 border border-slate-700 truncate max-w-[200px]">
                        {battleLogs.length > 0 ? `› ${battleLogs[battleLogs.length-1].message}` : "› Prêt au combat"}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    {specialGauge >= 100 ? (
                        <ActionButton label="FRAPPE ULTIME" isUltimate onClick={handleUltimate} disabled={!isPlayerTurn || battleOver} />
                    ) : (
                        <ActionButton label="ATTAQUE" color="red" onClick={() => setShowQuiz(true)} disabled={!isPlayerTurn || battleOver} />
                    )}
                    
                    <ActionButton label="OBJETS" color="yellow" onClick={() => setShowInventory(true)} disabled={!isPlayerTurn || battleOver} />
                    <ActionButton label="ÉQUIPE" color="blue" onClick={() => setShowTeam(true)} disabled={!isPlayerTurn || battleOver} />
                </div>
            </div>

            <AnimatePresence>
                {showQuiz && user && <QuizOverlay user={user} onComplete={handleQuizComplete} onClose={() => setShowQuiz(false)} />}
                {showInventory && <InventoryBar items={battleItems} onUse={handleUseItem} onClose={() => setShowInventory(false)} />}
                {showTeam && <TeamManager team={teamPokemon} box={[]} currentId={playerPokemon.id} onSelect={handleSwitchPokemon} onClose={() => setShowTeam(false)} />}
                
                {phase === 'FINISHED' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6">
                        <h2 className={`text-6xl font-display font-black mb-8 ${enemyPokemon.current_hp === 0 ? 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-[0_4px_0_rgba(0,0,0,1)]' : 'text-red-500'}`}>
                            {enemyPokemon.current_hp === 0 ? 'VICTOIRE' : 'DÉFAITE'}
                        </h2>
                        
                        {rewards && (
                            <div className="flex flex-col items-center gap-8 w-full max-w-md">
                                
                                {/* XP & Gold Display - BIGGER */}
                                <div className="flex justify-center gap-4 w-full">
                                     <div className="flex-1 bg-slate-900 border-2 border-slate-700 p-4 rounded-2xl flex flex-col items-center shadow-lg transform hover:scale-105 transition-transform">
                                        <img src={`${ASSETS_BASE_URL}/xp.webp`} className="w-12 h-12 mb-2 drop-shadow-md"/>
                                        <span className="font-mono text-2xl text-white font-bold">+{rewards.xp} XP</span>
                                     </div>
                                     <div className="flex-1 bg-slate-900 border-2 border-yellow-700 p-4 rounded-2xl flex flex-col items-center shadow-lg transform hover:scale-105 transition-transform">
                                        <img src={`${ASSETS_BASE_URL}/credits.webp`} className="w-12 h-12 mb-2 drop-shadow-md"/>
                                        <span className="font-mono text-2xl text-yellow-400 font-bold">+{rewards.gold} ₵</span>
                                     </div>
                                </div>

                                {/* LOOT BOX MECHANIC */}
                                {rewards.loot && (
                                    <div className="w-full h-48 flex items-center justify-center relative">
                                        {!lootRevealed ? (
                                            <motion.button 
                                                onClick={() => { setLootRevealed(true); confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } }); }}
                                                className="flex flex-col items-center gap-2 cursor-pointer group"
                                                animate={{ y: [0, -10, 0] }}
                                                transition={{ repeat: Infinity, duration: 1.5 }}
                                            >
                                                <div className="text-8xl filter drop-shadow-[0_0_30px_rgba(234,179,8,0.6)] group-hover:scale-110 transition-transform">🎁</div>
                                                <span className="font-display font-bold text-yellow-400 animate-pulse bg-black/50 px-4 py-1 rounded-full border border-yellow-500/50">CLIQUER POUR OUVRIR</span>
                                            </motion.button>
                                        ) : (
                                            <motion.div 
                                                initial={{ scale: 0, rotate: -180 }} 
                                                animate={{ scale: 1, rotate: 0 }}
                                                className="w-full bg-gradient-to-br from-purple-900 to-slate-900 border-2 border-purple-500 p-6 rounded-2xl flex flex-col items-center gap-4 shadow-[0_0_50px_rgba(168,85,247,0.5)] relative overflow-hidden"
                                            >
                                                <div className="absolute -inset-20 bg-[conic-gradient(from_0deg,transparent_0deg,rgba(168,85,247,0.2)_20deg,transparent_40deg)] animate-[spin_4s_linear_infinite]"></div>
                                                <div className="text-purple-300 font-black font-display text-2xl tracking-widest z-10 drop-shadow-md">BUTIN OBTENU !</div>
                                                <img src={`${ASSETS_BASE_URL}/${rewards.loot.includes('potion') || rewards.loot.includes('heal') ? 'soin.webp' : 'pokeball.webp'}`} className="w-24 h-24 z-10 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]" />
                                            </motion.div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <button onClick={handleExitBattle} className="mt-8 w-full max-w-xs bg-cyan-600 hover:bg-cyan-500 text-black font-display font-black text-xl py-4 rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:scale-105 active:scale-95">
                            RETOUR BASE
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
