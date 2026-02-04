
import React, { useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useBattleLogic } from './useBattleLogic';
import { QuizOverlay } from './QuizOverlay';
import { InventoryBar } from './InventoryBar';
import { BattleModeSelector } from './BattleModeSelector';
import { PvPLobby } from './PvPLobby';
import { motion, AnimatePresence } from 'framer-motion';
import { Item, Pokemon } from '../../types';
import { ASSETS_BASE_URL } from '../../config';

// --- COMPONENTS INTERNES DE PRESENTATION ---
const FloatingText = ({ text, color, x, y }: { text: string, color: string, x: number, y: number }) => (
    <motion.div
        initial={{ opacity: 0, y: y, x: x, scale: 0.5 }}
        animate={{ opacity: 1, y: y - 50, scale: 1.2 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`absolute z-50 font-display font-black text-2xl md:text-4xl lg:text-6xl ${color} drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] stroke-black`}
        style={{ left: '50%', top: '50%', textShadow: '2px 2px 0px #000' }}
    >
        {text}
    </motion.div>
);

const BattleHud = ({ pokemon, isEnemy }: { pokemon: Pokemon, isEnemy?: boolean }) => {
    const hpPercent = Math.min(100, Math.max(0, (pokemon.current_hp / pokemon.max_hp) * 100));
    const isLow = hpPercent < 25;
    
    return (
        <div className={`absolute z-30 w-[100px] sm:w-[140px] md:w-[180px] lg:w-[240px] flex flex-col gap-0.5 ${isEnemy ? 'top-1 right-1 sm:top-2 sm:right-2 items-end' : 'bottom-16 sm:bottom-20 left-1 sm:left-2 items-start'}`}>
            <div className="flex items-baseline gap-0.5 sm:gap-1 px-0.5 sm:px-1 py-0.5 rounded-full backdrop-blur-[0px]">
                <span className="font-display font-bold text-white text-[8px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wide sm:tracking-wider drop-shadow-[0_2px_2px_rgba(0,0,0,1)] shadow-black flex items-center gap-0.5 sm:gap-1 truncate max-w-[60px] sm:max-w-none">
                    {pokemon.name}
                    {pokemon.isBoss && <span className="bg-red-600 text-white px-0.5 sm:px-1 rounded text-[6px] sm:text-[8px] animate-pulse">BOSS</span>}
                </span>
                <span className={`font-mono text-[7px] sm:text-[8px] font-bold drop-shadow-[0_2px_2px_rgba(0,0,0,1)] shadow-black ${isEnemy ? 'text-red-400' : 'text-cyan-400'}`}>Lv.{pokemon.level}</span>
            </div>
            <div className="w-full h-1.5 sm:h-2 md:h-3 lg:h-4 bg-black/20 rounded-full border border-white/10 p-0.5 relative overflow-hidden backdrop-blur-[1px]">
                 <motion.div 
                    className={`h-full rounded-full opacity-90 shadow-[0_0_10px_rgba(0,0,0,0.5)] ${isLow ? 'bg-red-500 animate-pulse' : isEnemy ? 'bg-red-500' : 'bg-gradient-to-r from-cyan-400 to-blue-500'}`}
                    initial={{ width: '100%' }}
                    animate={{ width: `${hpPercent}%` }}
                    transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                 />
            </div>
            <div className="px-0.5 text-[7px] sm:text-[8px] md:text-[10px] lg:text-xs font-mono font-bold text-white drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,1)] opacity-100 tracking-wide">
                {pokemon.current_hp} / {pokemon.max_hp} PV
            </div>
        </div>
    );
};

const GradeGauge = ({ current, max = 5, grade }: { current: number, max?: number, grade: string }) => {
    const percent = Math.min(100, Math.max(0, (current / max) * 100));
    const isNearLevel = percent >= 80;
    return (
        <div className="absolute top-0.5 sm:top-1 md:top-2 lg:top-4 left-0.5 sm:left-1 md:left-2 lg:left-4 z-40 flex flex-col items-start gap-0.5">
            <div className="bg-slate-900/80 backdrop-blur-md px-1 sm:px-1.5 md:px-2 lg:px-3 py-0.5 sm:py-0.5 md:py-1 rounded-full border border-purple-500/50 shadow-lg flex items-center gap-0.5 sm:gap-1 md:gap-2">
                <span className="text-[7px] sm:text-[8px] md:text-[10px] lg:text-xs text-purple-300 font-mono uppercase tracking-wider">Niv</span>
                <span className="text-[10px] sm:text-xs md:text-sm lg:text-lg font-display font-bold text-white">{grade}</span>
            </div>
            <div className={`w-16 sm:w-20 md:w-32 lg:w-48 h-1 sm:h-1.5 md:h-2 lg:h-3 bg-slate-900 rounded-full border border-slate-700 overflow-hidden relative shadow-inner ${isNearLevel ? 'animate-pulse shadow-[0_0_15px_rgba(168,85,247,0.8)]' : ''}`}>
                 <motion.div 
                    className={`h-full bg-gradient-to-r from-purple-700 via-purple-500 to-pink-500 ${isNearLevel ? 'shadow-[0_0_20px_rgba(168,85,247,1)] brightness-125' : ''}`}
                    initial={{ width: '0%' }} animate={{ width: `${percent}%` }} transition={{ type: "spring", stiffness: 50 }}
                 />
            </div>
            <div className="pl-0.5 sm:pl-0.5 md:pl-1 lg:pl-2 flex gap-1 items-center">
                 <span className="text-[6px] sm:text-[7px] md:text-[9px] lg:text-[10px] text-purple-400 font-mono opacity-80">{current}/{max}</span>
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
        <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-xl p-2 md:p-4 flex flex-col animate-in fade-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-2">
                 <h3 className="text-base md:text-xl font-display font-bold text-white flex items-center gap-1.5">
                    <img src={`${ASSETS_BASE_URL}/pokeball.webp`} className="w-4 h-4 md:w-6 md:h-6"/> GESTION
                </h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white font-bold px-2 py-1 bg-slate-800 rounded text-xs md:text-sm">RETOUR</button>
            </div>
            <div className="flex md:hidden gap-1.5 mb-2 bg-slate-900 p-0.5 rounded-lg shrink-0">
                <button onClick={() => setMobileTab('TEAM')} className={`flex-1 py-1.5 rounded font-bold text-xs ${mobileTab === 'TEAM' ? 'bg-cyan-600 text-white' : 'text-slate-500'}`}>ÉQUIPE ({team.length}/3)</button>
                <button onClick={() => setMobileTab('BOX')} className={`flex-1 py-1.5 rounded font-bold text-xs ${mobileTab === 'BOX' ? 'bg-cyan-600 text-white' : 'text-slate-500'}`}>RÉSERVE</button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-2 md:gap-4 pb-24 md:pb-0">
                <div className={`flex-1 bg-slate-900/50 rounded-lg md:rounded-xl p-1.5 md:p-3 border border-cyan-500/30 overflow-y-auto ${mobileTab === 'BOX' ? 'hidden md:block' : ''}`}>
                    <div className="space-y-1.5 md:space-y-3">
                        {team.map((p: Pokemon) => (
                            <div key={p.id} onClick={() => setSelected(p)} 
                                className={`p-1.5 md:p-2 rounded-lg border bg-slate-800 flex items-center gap-2 md:gap-3 cursor-pointer transition-colors ${selected?.id === p.id ? 'border-cyan-400 bg-cyan-900/30' : 'border-slate-700 hover:bg-cyan-900/20'} ${p.id === currentId ? 'shadow-[0_0_10px_rgba(34,211,238,0.1)]' : ''}`}
                            >
                                <img src={p.sprite_url} className="w-10 h-10 md:w-12 md:h-12" />
                                <div><div className="font-bold text-white text-xs md:text-sm">{p.name}</div><div className="text-[10px] md:text-xs text-slate-400">Pv: {p.current_hp}/{p.max_hp}</div></div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className={`flex-1 bg-slate-900/50 rounded-lg md:rounded-xl p-1.5 md:p-3 border border-slate-700 overflow-y-auto ${mobileTab === 'TEAM' ? 'hidden md:block' : ''}`}>
                    <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                        {box.map((p: Pokemon) => (
                                <div key={p.id} onClick={() => setSelected(p)} className={`p-1.5 md:p-2 rounded border bg-slate-800 cursor-pointer flex flex-col items-center text-center transition-all ${selected?.id === p.id ? 'border-cyan-400 bg-cyan-900/30' : 'border-slate-700 hover:border-cyan-500/50'}`}>
                                <img src={p.sprite_url} className="w-8 h-8 md:w-10 md:h-10 opacity-80" />
                                <div className="text-[10px] md:text-xs font-bold text-slate-300 truncate w-full">{p.name}</div>
                                </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-2 md:p-4 bg-slate-950 border-t border-slate-800 flex flex-col gap-2 md:gap-3 z-50">
                {onStartBattle && team.length > 0 && (
                     <button onClick={onStartBattle} className="w-full py-2.5 md:py-4 bg-green-600 hover:bg-green-500 text-white font-display font-black text-base md:text-xl rounded-lg md:rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.4)] animate-pulse">⚔️ LANCER LE COMBAT</button>
                )}
                <div className="flex gap-1.5 md:gap-2">
                    <button onClick={handleConfirm} disabled={!selected} className="flex-1 py-2 md:py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold rounded-lg md:rounded-xl border border-slate-600 text-[10px] md:text-sm">
                        {selected ? (team.some((p: Pokemon) => p.id === selected.id) ? 'DÉFINIR LEADER' : 'ÉCHANGER') : 'SÉLECTIONNER'}
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
            <button onClick={onClick} disabled={disabled} className="relative w-full h-10 sm:h-12 md:h-14 lg:h-16 rounded-md sm:rounded-lg md:rounded-xl lg:rounded-2xl border-2 border-white bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 shadow-[0_0_30px_rgba(79,70,229,0.8)] flex flex-col items-center justify-center overflow-hidden animate-pulse group active:scale-95 transition-transform">
                <span className="relative z-10 font-display font-black text-white text-[9px] sm:text-[10px] md:text-sm lg:text-lg tracking-widest italic drop-shadow-lg">ULTIME</span>
            </button>
        )
    }
    
    return (
        <button onClick={onClick} disabled={disabled} className={`relative w-full h-10 sm:h-12 md:h-14 lg:h-16 rounded-md sm:rounded-lg md:rounded-xl lg:rounded-2xl border-t-2 border-b-4 bg-gradient-to-b ${colors[color as keyof typeof colors]} shadow-lg active:border-b-0 active:translate-y-1 transition-all flex flex-col items-center justify-center gap-1 group overflow-hidden disabled:opacity-50 disabled:grayscale`}>
            <span className="font-display font-black text-white text-[8px] sm:text-[9px] md:text-sm lg:text-base tracking-widest uppercase drop-shadow-sm">{label}</span>
        </button>
    );
};

const PreviewScreen = ({ enemy, enemyTeam, player, onStart, onManageTeam }: any) => {
    if(!enemy || !player) return null;
    const team = enemyTeam && enemyTeam.length > 0 ? enemyTeam : [enemy];
    
    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 overflow-y-auto p-2 sm:p-4 md:p-6 animate-in fade-in duration-700">
             <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900/80 to-slate-950"></div>
             <div className="relative z-10 w-full max-w-5xl flex flex-col gap-4 sm:gap-6 md:gap-8 my-auto">
                 
                 {/* Section Équipe Ennemie */}
                 <div className="flex flex-col items-center gap-3 sm:gap-4 md:gap-6 order-1">
                     <div className="text-center">
                         <h3 className="text-base sm:text-lg md:text-xl font-display font-bold text-red-400 mb-2">ÉQUIPE ADVERSE</h3>
                         <div className="text-red-600 font-mono font-bold text-[10px] sm:text-xs md:text-sm">MENACE DÉTECTÉE</div>
                     </div>
                     <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4 w-full">
                         {team.map((poke: Pokemon, idx: number) => (
                             <div key={idx} className={`relative bg-slate-900/50 border ${idx === 0 ? 'border-red-500 ring-2 ring-red-500/50' : 'border-slate-700'} rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 flex flex-col items-center gap-1 sm:gap-2 min-w-[80px] sm:min-w-[100px] md:min-w-[120px]`}>
                                 {idx === 0 && <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[8px] sm:text-[9px] md:text-[10px] px-2 py-0.5 rounded-full font-bold">LEADER</div>}
                                 <img src={poke.sprite_url} className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 object-contain grayscale-[0.2] brightness-75" />
                                 <div className="text-center w-full">
                                     <div className={`text-[10px] sm:text-xs md:text-sm font-bold ${idx === 0 && poke.isBoss ? 'text-red-500' : 'text-red-400'} truncate`}>{poke.name}</div>
                                     <div className="text-[8px] sm:text-[9px] md:text-[10px] text-slate-400">Niv. {poke.level}</div>
                                     <div className="text-[7px] sm:text-[8px] md:text-[9px] text-slate-500">{poke.max_hp} PV</div>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>

                 {/* VS Divider */}
                 <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 order-2">
                     <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
                     <span className="text-xl sm:text-2xl md:text-3xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-red-400">VS</span>
                     <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
                 </div>

                 {/* Section Votre Équipe */}
                 <div className="flex flex-col items-center gap-2 sm:gap-3 md:gap-4 order-3">
                     <img src={player.sprite_url} className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 object-contain drop-shadow-2xl relative z-10" />
                     <div className="text-center">
                         <h2 className="text-lg sm:text-xl md:text-2xl font-display font-bold text-white mb-1">{player.name}</h2>
                         <div className="text-[10px] sm:text-xs text-cyan-400 mb-2">Votre Leader</div>
                         <button onClick={onManageTeam} className="mt-1 sm:mt-2 px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 bg-slate-800 border border-slate-600 rounded-full text-slate-300 hover:text-white text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-wider flex items-center gap-1 sm:gap-2 mx-auto transition-all hover:border-cyan-500">
                            <img src={`${ASSETS_BASE_URL}/pokeball.webp`} className="w-3 h-3 sm:w-4 sm:h-4"/> Constituer l'équipe
                         </button>
                     </div>
                 </div>
             </div>
             <div className="relative z-20 mt-4 sm:mt-6 md:mt-8 w-full max-w-md px-2 pb-2 sm:pb-4 order-4">
                 <button onClick={onStart} className="w-full py-3 sm:py-4 md:py-5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-display font-black text-base sm:text-xl md:text-2xl tracking-widest rounded-lg sm:rounded-xl shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:shadow-[0_0_50px_rgba(239,68,68,0.6)] hover:scale-[1.02] transition-all">LANCER LE COMBAT</button>
             </div>
        </div>
    );
};

export const BattleScene: React.FC = () => {
    const { 
        user, playerPokemon, enemyPokemon, battleLogs, 
        isPlayerTurn, battleOver, collection, inventory, 
        gradeGauge, combo, specialGauge, previewEnemy, previewEnemyTeam, selectedPlayer,
        battleMode, battlePhase
    } = useGameStore();

    // UTILISATION DU NOUVEAU HOOK QUI GÈRE TOUTE LA LOGIQUE
    const {
        phase, rewards, lootRevealed,
        showQuiz, setShowQuiz,
        showInventory, setShowInventory,
        showTeam, setShowTeam,
        shake, flash, floatingTexts,
        controlsPlayer, controlsEnemy,
        captureSuccess,
        startBattle,
        handleQuizComplete,
        handleUltimate,
        handleUseItem,
        handleSwitchPokemon,
        handleExitBattle,
        revealLoot,
        handleCapture
    } = useBattleLogic();

    const containerRef = useRef<HTMLDivElement>(null);
    const allowedItems = battleMode === 'TRAINER' 
        ? ['HEAL', 'BUFF_ATK', 'BUFF_DEF', 'REVIVE', 'TRAITOR', 'JOKER']
        : ['HEAL', 'BUFF_ATK', 'BUFF_DEF', 'REVIVE', 'CAPTURE', 'JOKER'];
    const battleItems = inventory.filter(i => i.quantity > 0 && allowedItems.includes(i.effect_type));
    const teamPokemon = collection.filter(p => p.is_team);
    const boxPokemon = collection.filter(p => !p.is_team);

    // DEBUG: Afficher la phase actuelle
    console.log('🎮 BattleScene - phase actuelle:', phase, 'battlePhase du store:', battlePhase);

    // Sélection du mode si battlePhase est NONE
    if (phase === 'NONE') {
        console.log('✅ Affichage du BattleModeSelector');
        return <BattleModeSelector />;
    }

    // Lobby PvP pour défier des joueurs
    if (phase === 'PVP_LOBBY') {
        return <PvPLobby />;
    }

    if (phase === 'LOADING') return <div className="flex h-full items-center justify-center text-cyan-500 font-display animate-pulse">RECHERCHE D'ADVERSAIRE...</div>;
    
    if (phase === 'PREVIEW') {
        return (
            <>
                <PreviewScreen enemy={previewEnemy} enemyTeam={previewEnemyTeam} player={selectedPlayer} onStart={startBattle} onManageTeam={() => setShowTeam(true)} />
                {showTeam && <TeamManager team={teamPokemon} box={boxPokemon} currentId={selectedPlayer?.id} onSelect={handleSwitchPokemon} onClose={() => setShowTeam(false)} onStartBattle={() => { setShowTeam(false); startBattle(); }} />}
            </>
        );
    }

    // Utiliser les données de preview si le store n'est pas encore synchronisé
    const activePla = playerPokemon || selectedPlayer;
    const activeEnemy = enemyPokemon || previewEnemy;

    if (!activePla || !activeEnemy) return null;

    return (
        <div className={`relative w-full h-full bg-slate-950 overflow-hidden flex flex-col ${shake ? 'animate-shake' : ''}`}>
            {user && <GradeGauge current={gradeGauge} grade={user.grade_level} />}
            <div className="absolute top-0.5 sm:top-1 md:top-2 lg:top-4 right-0.5 sm:right-1 md:right-2 lg:right-4 z-40 flex flex-col items-end gap-0.5 sm:gap-1">
                 {combo > 1 && (
                     <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="font-display font-black text-sm sm:text-base md:text-2xl lg:text-4xl text-yellow-400 italic drop-shadow-[0_4px_0_rgba(0,0,0,1)] animate-bounce">x{combo}</motion.div>
                 )}
            </div>
            <div className="relative flex-grow w-full overflow-hidden min-h-0" ref={containerRef}>
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 opacity-100">
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(6,182,212,0.1)_50%,transparent_75%,transparent)] bg-[size:3rem_3rem] opacity-20"></div>
                </div>
                <AnimatePresence>
                    {flash && <motion.div initial={{ opacity: 0.5 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-red-600 z-40 mix-blend-overlay pointer-events-none" />}
                </AnimatePresence>
                <div className="absolute top-[5%] sm:top-[8%] right-[5%] sm:right-[8%] w-[40%] sm:w-[35%] h-[20%] sm:h-[25%] flex flex-col items-center justify-center z-10">
                    <BattleHud pokemon={activeEnemy} isEnemy />
                    <motion.img src={activeEnemy.sprite_url} animate={controlsEnemy} initial={{ y: 0 }} className={`object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] z-20 ${activeEnemy.isBoss ? 'w-24 h-24 sm:w-32 sm:h-32 md:w-48 md:h-48 lg:w-64 lg:h-64 drop-shadow-[0_0_30px_rgba(255,0,0,0.6)]' : 'w-20 h-20 sm:w-28 sm:h-28 md:w-40 md:h-40 lg:w-56 lg:h-56'}`} style={{ filter: activeEnemy.isBoss ? 'drop-shadow(0px 0px 10px rgba(255,0,0,0.8))' : 'drop-shadow(0px 0px 10px rgba(255,0,0,0.2))' }} />
                </div>
                <div className="absolute bottom-[2%] sm:bottom-[3%] left-[5%] sm:left-[8%] w-[45%] sm:w-[40%] h-[30%] sm:h-[35%] flex flex-col items-center justify-center z-20">
                    <motion.img src={activePla.sprite_url} animate={controlsPlayer} className="w-20 h-20 sm:w-28 sm:h-28 md:w-40 md:h-40 lg:w-56 lg:h-56 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] z-20" style={{ filter: 'drop-shadow(0px 0px 15px rgba(6,182,212,0.3))' }} />
                    <BattleHud pokemon={activePla} />
                </div>
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <AnimatePresence>
                        {floatingTexts.map(ft => (<FloatingText key={ft.id} {...ft} />))}
                    </AnimatePresence>
                </div>
            </div>
            <div className="relative z-30 bg-slate-900 border-t border-cyan-900/50 p-1 sm:p-1.5 md:p-2 lg:p-3 pb-safe shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                <div className="absolute -top-1 sm:-top-1.5 md:-top-2 lg:-top-3 left-0 right-0 h-1 sm:h-1.5 md:h-2 lg:h-3 bg-slate-950 flex justify-center overflow-hidden">
                    <motion.div className="h-full bg-gradient-to-r from-blue-600 via-purple-500 to-blue-600 bg-[length:200%_100%] animate-[shimmer_2s_linear_infinite]" initial={{ width: 0 }} animate={{ width: `${specialGauge}%` }} />
                </div>
                <div className="flex justify-between items-center mb-1 sm:mb-1.5 px-0.5">
                    <div className="text-[7px] sm:text-[8px] md:text-[10px] lg:text-xs text-slate-400 font-mono truncate max-w-[80px] sm:max-w-none">VS <span className="text-white font-bold">{enemyPokemon.name}</span></div>
                    <div className="h-4 sm:h-4 md:h-5 lg:h-6 px-1 sm:px-1.5 md:px-2 lg:px-3 bg-slate-800 rounded flex items-center text-[7px] sm:text-[8px] md:text-[10px] lg:text-xs font-mono text-cyan-200 border border-slate-700 truncate max-w-[100px] sm:max-w-[130px] md:max-w-[180px] lg:max-w-[200px]">
                        {battleLogs.length > 0 ? `› ${battleLogs[battleLogs.length-1].message}` : "› Prêt"}
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-1 sm:gap-1.5 md:gap-2">
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
                {phase === 'CAPTURE' && enemyPokemon && (() => {
                    const hasPokeball = inventory.some(i => i.effect_type === 'CAPTURE' && i.quantity > 0);
                    return hasPokeball ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-4 md:p-6">
                        <motion.img src={enemyPokemon.sprite_url} className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-64 lg:h-64 object-contain mb-3 sm:mb-4 md:mb-6 drop-shadow-2xl" animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity }} />
                        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-display font-black text-yellow-400 mb-2 sm:mb-3 md:mb-4 drop-shadow-[0_4px_0_rgba(0,0,0,1)]">{enemyPokemon.name}</h2>
                        <p className="text-slate-300 text-sm sm:text-base md:text-lg lg:text-2xl mb-4 sm:mb-6 md:mb-8 text-center px-2">Voulez-vous tenter de capturer ce Pokémon ?</p>
                        <div className="flex gap-2 sm:gap-3 md:gap-4 w-full max-w-md px-2">
                            <button onClick={() => handleCapture(false)} className="flex-1 py-2.5 sm:py-3 md:py-4 bg-red-600 hover:bg-red-500 text-white font-display font-black text-sm sm:text-base md:text-lg lg:text-xl rounded-lg sm:rounded-xl shadow-lg transition-all hover:scale-105">NON</button>
                            <button onClick={() => handleCapture(true)} className="flex-1 py-2.5 sm:py-3 md:py-4 bg-green-600 hover:bg-green-500 text-white font-display font-black text-sm sm:text-base md:text-lg lg:text-xl rounded-lg sm:rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all hover:scale-105">CAPTURER</button>
                        </div>
                        {captureSuccess && (
                            <motion.div initial={{ scale: 0, y: 50 }} animate={{ scale: 1, y: 0 }} className="absolute inset-0 flex items-center justify-center bg-black/80">
                                <div className="text-center">
                                    <div className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl mb-2 sm:mb-3 md:mb-4">✨</div>
                                    <h3 className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-green-400 drop-shadow-[0_4px_0_rgba(0,0,0,1)]">CAPTURÉ !</h3>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                    ) : (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-4 md:p-6">
                            <div className="text-center px-2">
                                <div className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl mb-3 sm:mb-4 md:mb-6">🚫</div>
                                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-display font-black text-red-400 mb-2 sm:mb-3 md:mb-4 drop-shadow-[0_4px_0_rgba(0,0,0,1)]">PAS DE POKÉBALL !</h2>
                                <p className="text-slate-300 text-sm sm:text-base md:text-lg lg:text-2xl mb-4 sm:mb-6 md:mb-8">Vous devez acheter des Pokéballs dans le shop pour capturer des Pokémon sauvages.</p>
                                <button onClick={() => handleCapture(false)} className="py-2.5 sm:py-3 md:py-4 px-4 sm:px-6 md:px-8 bg-cyan-600 hover:bg-cyan-500 text-white font-display font-black text-sm sm:text-base md:text-lg lg:text-xl rounded-lg sm:rounded-xl shadow-lg transition-all hover:scale-105">CONTINUER</button>
                            </div>
                        </motion.div>
                    );
                })()}
                {phase === 'FINISHED' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
                        <h2 className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-black mb-4 sm:mb-6 md:mb-8 ${enemyPokemon.current_hp === 0 ? 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-[0_4px_0_rgba(0,0,0,1)]' : 'text-red-500'}`}>
                            {enemyPokemon.current_hp === 0 ? 'VICTOIRE' : 'DÉFAITE'}
                        </h2>
                        {rewards && (
                            <div className="flex flex-col items-center gap-4 sm:gap-6 md:gap-8 w-full max-w-md">
                                <div className="flex justify-center gap-2 sm:gap-3 md:gap-4 w-full">
                                     <div className="flex-1 bg-slate-900 border-2 border-slate-700 p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl flex flex-col items-center shadow-lg transform hover:scale-105 transition-transform"><img src={`${ASSETS_BASE_URL}/xp.webp`} className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 mb-1 sm:mb-2 drop-shadow-md"/><span className="font-mono text-base sm:text-xl md:text-2xl text-white font-bold">+{rewards.xp} XP</span></div>
                                     <div className="flex-1 bg-slate-900 border-2 border-yellow-700 p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl flex flex-col items-center shadow-lg transform hover:scale-105 transition-transform"><img src={`${ASSETS_BASE_URL}/credits.webp`} className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 mb-1 sm:mb-2 drop-shadow-md"/><span className="font-mono text-base sm:text-xl md:text-2xl text-yellow-400 font-bold">+{rewards.gold} ₵</span></div>
                                </div>
                                {rewards.loot && (
                                    <div className="w-full h-32 sm:h-40 md:h-48 flex items-center justify-center relative">
                                        {!lootRevealed ? (
                                            <motion.button onClick={revealLoot} className="flex flex-col items-center gap-1 sm:gap-2 cursor-pointer group" animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                                                <div className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl filter drop-shadow-[0_0_30px_rgba(234,179,8,0.6)] group-hover:scale-110 transition-transform">🎁</div>
                                                <span className="font-display font-bold text-yellow-400 animate-pulse bg-black/50 px-2 sm:px-3 md:px-4 py-0.5 sm:py-1 rounded-full border border-yellow-500/50 text-[10px] sm:text-xs md:text-sm">CLIQUER POUR OUVRIR</span>
                                            </motion.button>
                                        ) : (
                                            <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} className="w-full bg-gradient-to-br from-purple-900 to-slate-900 border-2 border-purple-500 p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl flex flex-col items-center gap-2 sm:gap-3 md:gap-4 shadow-[0_0_50px_rgba(168,85,247,0.5)] relative overflow-hidden">
                                                <div className="absolute -inset-20 bg-[conic-gradient(from_0deg,transparent_0deg,rgba(168,85,247,0.2)_20deg,transparent_40deg)] animate-[spin_4s_linear_infinite]"></div>
                                                <div className="text-purple-300 font-black font-display text-base sm:text-xl md:text-2xl tracking-widest z-10 drop-shadow-md">BUTIN OBTENU !</div>
                                                <img src={`${ASSETS_BASE_URL}/${rewards.loot.includes('potion') || rewards.loot.includes('heal') ? 'soin.webp' : 'pokeball.webp'}`} className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 z-10 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]" />
                                            </motion.div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        <button onClick={handleExitBattle} className="mt-4 sm:mt-6 md:mt-8 w-full max-w-xs bg-cyan-600 hover:bg-cyan-500 text-black font-display font-black text-base sm:text-lg md:text-xl py-3 sm:py-3.5 md:py-4 rounded-lg sm:rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:scale-105 active:scale-95">RETOUR BASE</button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
