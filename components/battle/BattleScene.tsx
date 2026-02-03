
import React, { useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useBattleLogic } from './useBattleLogic';
import { QuizOverlay } from './QuizOverlay';
import { InventoryBar } from './InventoryBar';
import { motion, AnimatePresence } from 'framer-motion';
import { Item, Pokemon } from '../../types';
import { ASSETS_BASE_URL } from '../../config';

// --- COMPONENTS INTERNES DE PRESENTATION ---
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
        <div className={`absolute z-30 w-[120px] md:w-[240px] flex flex-col gap-0.5 ${isEnemy ? 'top-2 right-2 items-end' : 'bottom-20 left-2 items-start'}`}>
            <div className="flex items-baseline gap-1 px-1 py-0.5 rounded-full backdrop-blur-[0px]">
                <span className="font-display font-bold text-white text-[10px] md:text-sm uppercase tracking-wider drop-shadow-[0_2px_2px_rgba(0,0,0,1)] shadow-black flex items-center gap-1 truncate">
                    {pokemon.name}
                    {pokemon.isBoss && <span className="bg-red-600 text-white px-1 rounded text-[8px] animate-pulse">BOSS</span>}
                </span>
                <span className={`font-mono text-[8px] font-bold drop-shadow-[0_2px_2px_rgba(0,0,0,1)] shadow-black ${isEnemy ? 'text-red-400' : 'text-cyan-400'}`}>Lv.{pokemon.level}</span>
            </div>
            <div className="w-full h-2 md:h-4 bg-black/20 rounded-full border border-white/10 p-0.5 relative overflow-hidden backdrop-blur-[1px]">
                 <motion.div 
                    className={`h-full rounded-full opacity-90 shadow-[0_0_10px_rgba(0,0,0,0.5)] ${isLow ? 'bg-red-500 animate-pulse' : isEnemy ? 'bg-red-500' : 'bg-gradient-to-r from-cyan-400 to-blue-500'}`}
                    initial={{ width: '100%' }}
                    animate={{ width: `${hpPercent}%` }}
                    transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                 />
            </div>
            <div className="px-0.5 text-[8px] md:text-xs font-mono font-bold text-white drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,1)] opacity-100 tracking-wide">
                {pokemon.current_hp} / {pokemon.max_hp} PV
            </div>
        </div>
    );
};

const GradeGauge = ({ current, max = 20, grade }: { current: number, max?: number, grade: string }) => {
    const percent = Math.min(100, Math.max(0, (current / max) * 100));
    return (
        <div className="absolute top-1 md:top-4 left-1 md:left-4 z-40 flex flex-col items-start gap-0.5">
            <div className="bg-slate-900/80 backdrop-blur-md px-1.5 md:px-3 py-0.5 md:py-1 rounded-full border border-purple-500/50 shadow-lg flex items-center gap-0.5 md:gap-2">
                <span className="text-[8px] md:text-xs text-purple-300 font-mono uppercase tracking-widest">Niv</span>
                <span className="text-xs md:text-lg font-display font-bold text-white">{grade}</span>
            </div>
            <div className="w-24 md:w-48 h-1.5 md:h-3 bg-slate-900 rounded-full border border-slate-700 overflow-hidden relative shadow-inner">
                 <motion.div 
                    className="h-full bg-gradient-to-r from-purple-700 via-purple-500 to-pink-500"
                    initial={{ width: '0%' }} animate={{ width: `${percent}%` }} transition={{ type: "spring", stiffness: 50 }}
                 />
            </div>
            <div className="pl-0.5 md:pl-2 flex gap-1 items-center">
                 <span className="text-[7px] md:text-[10px] text-purple-400 font-mono opacity-80">{current}/{max}</span>
            </div>
        </div>
    );
};

const TeamManager = ({ team, box, currentId, onSelect, onClose, onStartBattle }: any) => {
    const [mobileTab, setMobileTab] = React.useState<'TEAM' | 'BOX'>('TEAM');
    const [selected, setSelected] = React.useState<Pokemon | null>(
        team.find((p: Pokemon) => p.id === currentId) || null
    );

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
                    <img src={`${ASSETS_BASE_URL}/pokeball.webp`} className="w-6 h-6"/> GESTION
                </h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white font-bold px-3 py-1 bg-slate-800 rounded">RETOUR</button>
            </div>
            <div className="flex md:hidden gap-2 mb-4 bg-slate-900 p-1 rounded-lg shrink-0">
                <button onClick={() => setMobileTab('TEAM')} className={`flex-1 py-2 rounded font-bold text-sm ${mobileTab === 'TEAM' ? 'bg-cyan-600 text-white' : 'text-slate-500'}`}>ÉQUIPE ({team.length}/3)</button>
                <button onClick={() => setMobileTab('BOX')} className={`flex-1 py-2 rounded font-bold text-sm ${mobileTab === 'BOX' ? 'bg-cyan-600 text-white' : 'text-slate-500'}`}>RÉSERVE</button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-4 pb-32 md:pb-0">
                <div className={`flex-1 bg-slate-900/50 rounded-xl p-3 border border-cyan-500/30 overflow-y-auto ${mobileTab === 'BOX' ? 'hidden md:block' : ''}`}>
                    <div className="space-y-3">
                        {team.map((p: Pokemon) => (
                            <div key={p.id} onClick={() => setSelected(p)} 
                                className={`p-2 rounded-lg border bg-slate-800 flex items-center gap-3 cursor-pointer transition-colors ${selected?.id === p.id ? 'border-cyan-400 bg-cyan-900/30' : 'border-slate-700 hover:bg-cyan-900/20'} ${p.id === currentId ? 'shadow-[0_0_10px_rgba(34,211,238,0.1)]' : ''}`}
                            >
                                <img src={p.sprite_url} className="w-12 h-12" />
                                <div><div className="font-bold text-white">{p.name}</div><div className="text-xs text-slate-400">Pv: {p.current_hp}/{p.max_hp}</div></div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className={`flex-1 bg-slate-900/50 rounded-xl p-3 border border-slate-700 overflow-y-auto ${mobileTab === 'TEAM' ? 'hidden md:block' : ''}`}>
                    <div className="grid grid-cols-2 gap-2">
                        {box.map((p: Pokemon) => (
                                <div key={p.id} onClick={() => setSelected(p)} className={`p-2 rounded border bg-slate-800 cursor-pointer flex flex-col items-center text-center transition-all ${selected?.id === p.id ? 'border-cyan-400 bg-cyan-900/30' : 'border-slate-700 hover:border-cyan-500/50'}`}>
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
            <button onClick={onClick} disabled={disabled} className="relative w-full h-10 md:h-16 rounded-lg md:rounded-2xl border-2 border-white bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 shadow-[0_0_30px_rgba(79,70,229,0.8)] flex flex-col items-center justify-center overflow-hidden animate-pulse group active:scale-95 transition-transform">
                <span className="relative z-10 font-display font-black text-white text-[10px] md:text-lg tracking-widest italic drop-shadow-lg">ULTIME</span>
            </button>
        )
    }
    
    return (
        <button onClick={onClick} disabled={disabled} className={`relative w-full h-10 md:h-16 rounded-lg md:rounded-2xl border-t-2 border-b-4 bg-gradient-to-b ${colors[color as keyof typeof colors]} shadow-lg active:border-b-0 active:translate-y-1 transition-all flex flex-col items-center justify-center gap-1 group overflow-hidden disabled:opacity-50 disabled:grayscale`}>
            <span className="font-display font-black text-white text-[9px] md:text-base tracking-widest uppercase drop-shadow-sm">{label}</span>
        </button>
    );
};

const PreviewScreen = ({ enemy, player, onStart, onManageTeam }: any) => {
    if(!enemy || !player) return null;
    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 overflow-hidden p-6 animate-in fade-in duration-700">
             <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900/80 to-slate-950"></div>
             <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                 <div className="flex flex-col items-center gap-4 order-2 md:order-1">
                     <img src={player.sprite_url} className="w-48 h-48 md:w-64 md:h-64 object-contain drop-shadow-2xl relative z-10" />
                     <div className="text-center">
                         <h2 className="text-2xl font-display font-bold text-white">{player.name}</h2>
                         <button onClick={onManageTeam} className="mt-2 px-6 py-2 bg-slate-800 border border-slate-600 rounded-full text-slate-300 hover:text-white text-sm font-bold uppercase tracking-wider flex items-center gap-2 mx-auto">
                            <img src={`${ASSETS_BASE_URL}/pokeball.webp`} className="w-4 h-4"/> Gérer l'équipe
                         </button>
                     </div>
                 </div>
                 <div className="flex flex-col items-center gap-4 order-1 md:order-2">
                     <img src={enemy.sprite_url} className={`object-contain drop-shadow-2xl grayscale-[0.2] brightness-75 transition-all ${enemy.isBoss ? 'w-64 h-64 md:w-80 md:h-80 scale-110' : 'w-48 h-48 md:w-64 md:h-64'}`} />
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
        user, playerPokemon, enemyPokemon, battleLogs, 
        isPlayerTurn, battleOver, collection, inventory, 
        gradeGauge, combo, specialGauge 
    } = useGameStore();

    // UTILISATION DU NOUVEAU HOOK QUI GÈRE TOUTE LA LOGIQUE
    const {
        phase, previewEnemy, selectedPlayer, rewards, lootRevealed,
        showQuiz, setShowQuiz,
        showInventory, setShowInventory,
        showTeam, setShowTeam,
        shake, flash, floatingTexts,
        controlsPlayer, controlsEnemy,
        startBattle,
        handleQuizComplete,
        handleUltimate,
        handleUseItem,
        handleSwitchPokemon,
        handleExitBattle,
        revealLoot
    } = useBattleLogic();

    const containerRef = useRef<HTMLDivElement>(null);
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
        <div className={`relative w-full h-full max-h-screen bg-slate-950 overflow-hidden flex flex-col ${shake ? 'animate-shake' : ''}`}>
            {user && <GradeGauge current={gradeGauge} grade={user.grade_level} />}
            <div className="absolute top-1 md:top-4 right-1 md:right-4 z-40 flex flex-col items-end gap-1">
                 {combo > 1 && (
                     <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="font-display font-black text-base md:text-4xl text-yellow-400 italic drop-shadow-[0_4px_0_rgba(0,0,0,1)] animate-bounce">x{combo}</motion.div>
                 )}
            </div>
            <div className="relative flex-grow w-full overflow-hidden" ref={containerRef}>
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 opacity-100">
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(6,182,212,0.1)_50%,transparent_75%,transparent)] bg-[size:3rem_3rem] opacity-20"></div>
                </div>
                <AnimatePresence>
                    {flash && <motion.div initial={{ opacity: 0.5 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-red-600 z-40 mix-blend-overlay pointer-events-none" />}
                </AnimatePresence>
                <div className="absolute top-[8%] right-[8%] w-[35%] h-[25%] flex flex-col items-center justify-center z-10">
                    <BattleHud pokemon={enemyPokemon} isEnemy />
                    <motion.img src={enemyPokemon.sprite_url} animate={controlsEnemy} initial={{ y: 0 }} className={`object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] z-20 ${enemyPokemon.isBoss ? 'w-32 h-32 md:w-80 md:h-80 drop-shadow-[0_0_30px_rgba(255,0,0,0.6)]' : 'w-24 h-24 md:w-56 md:h-56'}`} style={{ filter: enemyPokemon.isBoss ? 'drop-shadow(0px 0px 10px rgba(255,0,0,0.8))' : 'drop-shadow(0px 0px 10px rgba(255,0,0,0.2))' }} />
                </div>
                <div className="absolute bottom-[3%] left-[8%] w-[40%] h-[35%] flex flex-col items-center justify-center z-20">
                    <motion.img src={playerPokemon.sprite_url} animate={controlsPlayer} className="w-28 h-28 md:w-72 md:h-72 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] z-20" style={{ filter: 'drop-shadow(0px 0px 15px rgba(6,182,212,0.3))' }} />
                    <BattleHud pokemon={playerPokemon} />
                </div>
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <AnimatePresence>
                        {floatingTexts.map(ft => (<FloatingText key={ft.id} {...ft} />))}
                    </AnimatePresence>
                </div>
            </div>
            <div className="relative z-30 bg-slate-900 border-t border-cyan-900/50 p-1.5 md:p-3 pb-safe shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                <div className="absolute -top-1.5 md:-top-3 left-0 right-0 h-1.5 md:h-3 bg-slate-950 flex justify-center overflow-hidden">
                    <motion.div className="h-full bg-gradient-to-r from-blue-600 via-purple-500 to-blue-600 bg-[length:200%_100%] animate-[shimmer_2s_linear_infinite]" initial={{ width: 0 }} animate={{ width: `${specialGauge}%` }} />
                </div>
                <div className="flex justify-between items-center mb-1.5 px-0.5">
                    <div className="text-[8px] md:text-xs text-slate-400 font-mono">VS <span className="text-white font-bold">{enemyPokemon.name}</span></div>
                    <div className="h-4 md:h-6 px-1.5 md:px-3 bg-slate-800 rounded flex items-center text-[8px] md:text-xs font-mono text-cyan-200 border border-slate-700 truncate max-w-[130px] md:max-w-[200px]">
                        {battleLogs.length > 0 ? `› ${battleLogs[battleLogs.length-1].message}` : "› Prêt"}
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5 md:gap-2">
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
                                <div className="flex justify-center gap-4 w-full">
                                     <div className="flex-1 bg-slate-900 border-2 border-slate-700 p-4 rounded-2xl flex flex-col items-center shadow-lg transform hover:scale-105 transition-transform"><img src={`${ASSETS_BASE_URL}/xp.webp`} className="w-12 h-12 mb-2 drop-shadow-md"/><span className="font-mono text-2xl text-white font-bold">+{rewards.xp} XP</span></div>
                                     <div className="flex-1 bg-slate-900 border-2 border-yellow-700 p-4 rounded-2xl flex flex-col items-center shadow-lg transform hover:scale-105 transition-transform"><img src={`${ASSETS_BASE_URL}/credits.webp`} className="w-12 h-12 mb-2 drop-shadow-md"/><span className="font-mono text-2xl text-yellow-400 font-bold">+{rewards.gold} ₵</span></div>
                                </div>
                                {rewards.loot && (
                                    <div className="w-full h-48 flex items-center justify-center relative">
                                        {!lootRevealed ? (
                                            <motion.button onClick={revealLoot} className="flex flex-col items-center gap-2 cursor-pointer group" animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                                                <div className="text-8xl filter drop-shadow-[0_0_30px_rgba(234,179,8,0.6)] group-hover:scale-110 transition-transform">🎁</div>
                                                <span className="font-display font-bold text-yellow-400 animate-pulse bg-black/50 px-4 py-1 rounded-full border border-yellow-500/50">CLIQUER POUR OUVRIR</span>
                                            </motion.button>
                                        ) : (
                                            <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} className="w-full bg-gradient-to-br from-purple-900 to-slate-900 border-2 border-purple-500 p-6 rounded-2xl flex flex-col items-center gap-4 shadow-[0_0_50px_rgba(168,85,247,0.5)] relative overflow-hidden">
                                                <div className="absolute -inset-20 bg-[conic-gradient(from_0deg,transparent_0deg,rgba(168,85,247,0.2)_20deg,transparent_40deg)] animate-[spin_4s_linear_infinite]"></div>
                                                <div className="text-purple-300 font-black font-display text-2xl tracking-widest z-10 drop-shadow-md">BUTIN OBTENU !</div>
                                                <img src={`${ASSETS_BASE_URL}/${rewards.loot.includes('potion') || rewards.loot.includes('heal') ? 'soin.webp' : 'pokeball.webp'}`} className="w-24 h-24 z-10 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]" />
                                            </motion.div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        <button onClick={handleExitBattle} className="mt-8 w-full max-w-xs bg-cyan-600 hover:bg-cyan-500 text-black font-display font-black text-xl py-4 rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:scale-105 active:scale-95">RETOUR BASE</button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
