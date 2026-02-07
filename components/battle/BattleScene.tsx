import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { useBattleLogic } from './useBattleLogic';
import { BattleModeSelector } from './BattleModeSelector';
import { PvPLobby } from './PvPLobby';
import { PvPBattleProc } from './PvPBattleProc';
import { QuizOverlay } from './QuizOverlay';
import { InventoryBar } from './InventoryBar';
import { CaptureAnimation } from './CaptureAnimation';
import { motion, AnimatePresence } from 'framer-motion';
import { Pokemon, Item } from '../../types';
import { ASSETS_BASE_URL } from '../../config';
import { playSfx } from '../../utils/soundEngine';

/* ─────────────────── SMALL UI HELPERS ─────────────────── */

/** HP bar with color gradient based on remaining percentage */
const HpBar: React.FC<{ current: number; max: number }> = ({ current, max }) => {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const color = pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-0.5">
        <span>PV</span>
        <span>{current}/{max}</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${color} rounded-full`}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 15 }}
        />
      </div>
    </div>
  );
};

/** Pokemon sprite card used in the battle arena */
const BattlePokemonCard: React.FC<{
  pokemon: Pokemon;
  isEnemy?: boolean;
  controls?: any;
  statusEffect?: 'sleep' | 'poison' | null;
}> = ({ pokemon, isEnemy = false, controls, statusEffect }) => (
  <motion.div
    animate={controls}
    className={`relative flex flex-col items-center px-3 py-2 rounded-xl border ${
      isEnemy
        ? 'border-red-500/30 bg-gradient-to-b from-red-950/30 to-slate-900/50'
        : 'border-cyan-500/30 bg-gradient-to-b from-cyan-950/30 to-slate-900/50'
    }`}
  >
    {/* Status effect overlay */}
    <AnimatePresence>
      {statusEffect === 'sleep' && (
        <motion.div
          key="sleep-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 rounded-xl bg-indigo-900/30 z-10 pointer-events-none flex items-center justify-center"
        >
          <motion.span
            className="text-3xl"
            animate={{ y: [0, -8, 0], opacity: [0.6, 1, 0.6], scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >💤</motion.span>
        </motion.div>
      )}
      {statusEffect === 'poison' && (
        <motion.div
          key="poison-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 rounded-xl bg-green-900/25 z-10 pointer-events-none flex items-center justify-center"
        >
          <motion.span
            className="text-3xl"
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >☠️</motion.span>
        </motion.div>
      )}
    </AnimatePresence>

    <motion.img
      src={pokemon.sprite_url}
      alt={pokemon.name}
      className={`w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 object-contain drop-shadow-lg ${
        statusEffect === 'poison' ? 'hue-rotate-[90deg] brightness-90' : statusEffect === 'sleep' ? 'brightness-75 saturate-50' : ''
      }`}
      draggable={false}
    />
    <div className="w-full mt-1 text-center">
      <div className="text-white font-display font-bold text-xs sm:text-sm truncate">
        {pokemon.name}{' '}
        <span className="text-slate-400 font-mono text-[10px]">Nv.{pokemon.level}</span>
      </div>
      {statusEffect && (
        <span className={`text-[9px] font-bold uppercase tracking-wider ${
          statusEffect === 'sleep' ? 'text-indigo-400' : 'text-green-400'
        }`}>
          {statusEffect === 'sleep' ? '💤 ENDORMI' : '☠️ EMPOISONNÉ'}
        </span>
      )}
      {pokemon.isBoss && (
        <span className="text-[9px] font-bold text-yellow-400 uppercase tracking-wider">★ BOSS</span>
      )}
      <div className="mt-1 w-32 sm:w-40 mx-auto">
        <HpBar current={pokemon.current_hp} max={pokemon.max_hp} />
      </div>
    </div>
  </motion.div>
);

/** Compact action button for the battle controls row */
const ActionButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  label: string;
  icon: string;
  color?: string;
}> = ({ onClick, disabled, label, icon, color = 'bg-slate-800 hover:bg-slate-700' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex-1 py-2.5 sm:py-3 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${color} border border-slate-700`}
  >
    <div className="text-xl sm:text-2xl">{icon}</div>
    <div className="text-[10px] sm:text-xs text-white uppercase tracking-wider mt-0.5">{label}</div>
  </button>
);

/** Grade gauge (0-5 pips) */
const GradeGauge: React.FC<{ value: number }> = ({ value }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <div
        key={i}
        className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-colors ${
          i < value ? 'bg-cyan-400 shadow-[0_0_4px_rgba(6,182,212,0.6)]' : 'bg-slate-700'
        }`}
      />
    ))}
  </div>
);

/** Floating damage / heal text */
const FloatingText: React.FC<{ text: string; color: string; x: number; y: number }> = ({
  text,
  color,
  x,
  y,
}) => (
  <motion.div
    initial={{ opacity: 1, y: 0, x }}
    animate={{ opacity: 0, y: y - 60 }}
    transition={{ duration: 0.8 }}
    className={`absolute pointer-events-none font-display font-black text-lg sm:text-xl ${color}`}
    style={{ left: '50%', top: '40%' }}
  >
    {text}
  </motion.div>
);

/* ───────────────── TEAM MANAGER OVERLAY ───────────────── */

const TeamManager: React.FC<{
  collection: Pokemon[];
  currentPokemon: Pokemon | null;
  onSwitch: (poke: Pokemon, fromTeam: boolean) => void;
  onClose: () => void;
}> = ({ collection, currentPokemon, onSwitch, onClose }) => {
  const available = collection.filter(
    (p) => p.current_hp > 0 && p.id !== currentPokemon?.id,
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-sm flex flex-col"
    >
      <div className="flex items-center justify-between p-3 border-b border-slate-800">
        <h3 className="font-display text-cyan-400 text-sm sm:text-base">CHANGER DE POKÉMON</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-sm font-bold px-3 py-1">
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {available.length === 0 && (
          <div className="col-span-full text-center text-slate-500 py-8 text-sm">
            Aucun Pokemon disponible
          </div>
        )}
        {available.map((poke) => (
          <button
            key={poke.id}
            onClick={() => onSwitch(poke, !!poke.is_team)}
            className="flex flex-col items-center p-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500 transition-all active:scale-95"
          >
            <img src={poke.sprite_url} alt={poke.name} className="w-16 h-16 object-contain" />
            <div className="text-white text-xs font-bold mt-1 truncate w-full text-center">
              {poke.name}
            </div>
            <div className="w-full mt-1">
              <HpBar current={poke.current_hp} max={poke.max_hp} />
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
};

/* ──────────────── CAPTURE PHASE SCREEN ──────────────── */

const CaptureScreen: React.FC<{
  enemy: Pokemon;
  hasPokeball: boolean;
  captureSuccess: boolean;
  captureAnimating: boolean;
  onCapture: (attempt: boolean) => void;
  onContinue: () => void;
  onAnimEnd: () => void;
  battleMode: string;
}> = ({ enemy, hasPokeball, captureSuccess, captureAnimating, onCapture, onContinue, onAnimEnd, battleMode }) => {
  // Non-wild modes: skip straight to result
  if (battleMode !== 'WILD') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute inset-0 z-50 bg-slate-950/95 flex items-center justify-center p-4"
      >
        <div className="text-center max-w-sm">
          <div className="text-xl font-display font-bold text-slate-400 mb-6">VICTOIRE !</div>
          <button
            onClick={onContinue}
            className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all active:scale-95"
          >
            CONTINUER →
          </button>
        </div>
      </motion.div>
    );
  }

  // Pokéball capture animation playing
  if (captureAnimating) {
    return (
      <CaptureAnimation
        enemySprite={enemy.sprite_url}
        enemyName={enemy.name}
        success={captureSuccess}
        onComplete={onAnimEnd}
      />
    );
  }

  // Show capture choice for wild mode
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-50 bg-slate-950/95 flex items-center justify-center p-4"
    >
      <div className="text-center max-w-sm">
        <motion.img
          src={enemy.sprite_url}
          alt={enemy.name}
          className="w-28 h-28 mx-auto mb-3 opacity-60"
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
        <div className="text-xl sm:text-2xl font-display font-bold text-white mb-1">
          {enemy.name} est K.O. !
        </div>
        <div className="text-slate-400 text-sm mb-6">Tenter la capture ?</div>

        <div className="flex gap-3 justify-center">
          {hasPokeball ? (
            <button
              onClick={() => onCapture(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg"
            >
              <img
                src={`${ASSETS_BASE_URL}/pokeball.webp`}
                alt="Pokéball"
                className="w-6 h-6"
              />
              CAPTURER
            </button>
          ) : (
            <div className="text-red-400 text-sm font-bold px-4 py-3 border border-red-500/30 rounded-xl bg-red-950/30">
              Aucune Pokéball !
            </div>
          )}
          <button
            onClick={() => onCapture(false)}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all active:scale-95 border border-slate-700"
          >
            PASSER
          </button>
        </div>
      </div>
    </motion.div>
  );
};

/* ─────────────── VICTORY / DEFEAT SCREEN ─────────────── */

const FinishedScreen: React.FC<{
  isVictory: boolean;
  rewards: { xp: number; gold: number; loot?: string } | null;
  onExit: () => void;
}> = ({ isVictory, rewards, onExit }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="absolute inset-0 z-50 bg-slate-950/95 flex items-center justify-center p-4"
  >
    <div className="text-center max-w-md w-full">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className={`text-4xl sm:text-5xl font-display font-black mb-4 ${
          isVictory ? 'text-yellow-400' : 'text-red-400'
        }`}
      >
        {isVictory ? 'VICTOIRE !' : 'DÉFAITE'}
      </motion.div>

      {isVictory && rewards && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-900/80 border border-slate-700 rounded-xl p-4 mb-6 space-y-2"
        >
          <div className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
            RÉCOMPENSES
          </div>
          <div className="flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <img src={`${ASSETS_BASE_URL}/xp.webp`} alt="XP" className="w-5 h-5" />
              <span className="text-cyan-400 font-mono font-bold">+{rewards.xp} XP</span>
            </div>
            <div className="flex items-center gap-2">
              <img src={`${ASSETS_BASE_URL}/credits.webp`} alt="Or" className="w-5 h-5" />
              <span className="text-yellow-400 font-mono font-bold">+{rewards.gold} Or</span>
            </div>
          </div>
          {rewards.loot && (() => {
            const lootId = rewards.loot!;
            let icon = `${ASSETS_BASE_URL}/pokeball.webp`;
            let label = lootId;
            if (lootId.includes('heal')) { icon = `${ASSETS_BASE_URL}/soin.webp`; label = lootId.includes('r2') ? 'Super Potion' : 'Potion'; }
            else if (lootId.includes('traitor')) { icon = `${ASSETS_BASE_URL}/traitre.webp`; label = 'Traître'; }
            else if (lootId.includes('atk')) { icon = `${ASSETS_BASE_URL}/attaque.webp`; label = 'Potion Attaque'; }
            else if (lootId.includes('def')) { icon = `${ASSETS_BASE_URL}/defense.webp`; label = 'Potion Défense'; }
            else if (lootId.includes('ball') || lootId.includes('pokeball')) { icon = `${ASSETS_BASE_URL}/pokeball.webp`; label = 'Pokéball'; }
            return (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                className="flex items-center justify-center gap-2 mt-3 bg-purple-900/40 border border-purple-500/40 rounded-lg px-4 py-2"
              >
                <img src={icon} alt={label} className="w-8 h-8 drop-shadow-lg" />
                <span className="text-purple-300 text-sm font-bold">+1 {label}</span>
              </motion.div>
            );
          })()}
        </motion.div>
      )}

      {!isVictory && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-slate-400 text-sm mb-6"
        >
          Entraîne-toi et reviens plus fort !
        </motion.div>
      )}

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={onExit}
        className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg"
      >
        CONTINUER
      </motion.button>
    </div>
  </motion.div>
);

/* ═══════════════════ MAIN BATTLE SCENE ═══════════════════ */

export const BattleScene: React.FC = () => {
  const {
    user,
    playerPokemon,
    enemyPokemon,
    battleLogs,
    inventory,
    isPlayerTurn,
    battleOver,
    gradeGauge,
    combo,
    specialGauge,
    collection,
    battleMode,
    trainerOpponent,
  } = useGameStore();

  const {
    phase,
    rewards,
    showQuiz,
    setShowQuiz,
    showInventory,
    setShowInventory,
    showTeam,
    setShowTeam,
    shake,
    flash,
    floatingTexts,
    controlsPlayer,
    controlsEnemy,
    captureSuccess,
    captureAnimating,
    enemyStatus,
    handleQuizComplete,
    handleUltimate,
    handleFlee,
    handleUseItem,
    handleSwitchPokemon,
    handleExitBattle,
    handleCapture,
    onCaptureAnimEnd,
  } = useBattleLogic();

  /* ── Routing by battle phase ── */

  // Mode selector (no battle started)
  if (phase === 'NONE') {
    return <BattleModeSelector />;
  }

  // PvP lobby
  if (phase === 'PVP_LOBBY') {
    return <PvPLobby />;
  }

  // PvP procedural battle
  if (battleMode === 'PVP' && phase === 'FIGHTING') {
    return <PvPBattleProc />;
  }

  // Loading spinner
  if (phase === 'LOADING') {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-cyan-400 font-display animate-pulse">PRÉPARATION DU COMBAT...</div>
        </div>
      </div>
    );
  }

  /* ── Derived state ── */
  const actionsDisabled = !isPlayerTurn || battleOver || showQuiz;
  const hasPokeball = inventory.some((i) => i.effect_type === 'CAPTURE' && i.quantity > 0);
  const isVictory = playerPokemon != null && playerPokemon.current_hp > 0;

  // Filter items for battle inventory
  // - CAPTURE (pokeball) is never shown here; capture is handled via the CAPTURE phase screen
  // - TRAITOR is only usable vs trainers/PVP, not wild pokemon
  const battleItems = (inventory ?? []).filter((item: Item) => {
    if (item.quantity <= 0) return false;
    if (item.effect_type === 'CAPTURE') return false;
    if (item.effect_type === 'TRAITOR' && battleMode === 'WILD') return false;
    return ['HEAL', 'HEAL_TEAM', 'BUFF_ATK', 'BUFF_DEF', 'DMG_FLAT', 'TRAITOR'].includes(
      item.effect_type,
    );
  });

  /* ── Main battle render ── */
  return (
    <div
      className={`relative flex-1 flex flex-col bg-slate-950 overflow-hidden ${
        shake ? 'animate-[shake_0.4s_ease-in-out]' : ''
      }`}
    >
      {/* Flash overlay */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-30 bg-red-500 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* ── TOP BAR ── */}
      <div className="relative z-10 flex items-center justify-between px-3 py-2 bg-slate-900/80 border-b border-slate-800/50 shrink-0">
        <button
          onClick={handleFlee}
          className="text-slate-400 hover:text-white text-xs sm:text-sm font-bold flex items-center gap-1 transition-colors"
        >
          ← <span className="hidden sm:inline">FUIR</span>
        </button>

        <div className="flex items-center gap-3">
          {/* Grade gauge */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">NIV</span>
            <GradeGauge value={gradeGauge} />
          </div>

          {/* Combo */}
          {combo > 0 && (
            <motion.div
              key={combo}
              initial={{ scale: 1.4 }}
              animate={{ scale: 1 }}
              className="text-yellow-400 font-mono font-bold text-xs sm:text-sm"
            >
              x{combo}
            </motion.div>
          )}

          {/* Special gauge */}
          {specialGauge > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-12 sm:w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  animate={{ width: `${specialGauge}%` }}
                />
              </div>
              {specialGauge >= 100 && (
                <span className="text-[9px] text-purple-400 font-bold animate-pulse">ULT</span>
              )}
            </div>
          )}
        </div>

        {/* Turn indicator */}
        <div
          className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full ${
            isPlayerTurn
              ? 'bg-cyan-600/20 text-cyan-400'
              : 'bg-red-600/20 text-red-400'
          }`}
        >
          {isPlayerTurn ? 'TON TOUR' : 'ENNEMI'}
        </div>
      </div>

      {/* ── BATTLE ARENA ── */}
      <div className="relative flex-1 flex flex-col items-center justify-center gap-3 sm:gap-4 p-3 sm:p-4 overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(6,182,212,0.03)_50%,transparent_75%)] bg-[size:3rem_3rem] pointer-events-none" />

        {/* Floating texts */}
        <AnimatePresence>
          {floatingTexts.map((ft) => (
            <FloatingText key={ft.id} text={ft.text} color={ft.color} x={ft.x} y={ft.y} />
          ))}
        </AnimatePresence>

        {/* Trainer team indicators */}
        {battleMode === 'TRAINER' && trainerOpponent && (
          <div className="flex items-center gap-2 mb-1 z-10">
            <span className="text-[10px] text-red-400 font-bold mr-1">VS {trainerOpponent.name}</span>
            {trainerOpponent.team.map((poke, idx) => {
              const isKo = poke.current_hp <= 0 || idx < trainerOpponent.currentPokemonIndex;
              const isActive = idx === trainerOpponent.currentPokemonIndex;
              return (
                <div key={idx} className={`flex flex-col items-center transition-all ${
                  isKo ? 'opacity-30 grayscale' : isActive ? 'scale-110' : 'opacity-60'
                }`}>
                  <img
                    src={poke.sprite_url}
                    alt={poke.name}
                    className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                  />
                  <div className="w-8 h-1 rounded-full mt-0.5 overflow-hidden bg-slate-800">
                    <div
                      className={`h-full rounded-full ${isKo ? 'bg-red-800 w-0' : isActive ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: isKo ? '0%' : `${Math.max(5, (poke.current_hp / poke.max_hp) * 100)}%` }}
                    />
                  </div>
                  {isKo && <span className="text-[8px] text-red-500 font-bold">K.O.</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Enemy Pokemon */}
        <div className="relative z-10">
          {enemyPokemon ? (
            <BattlePokemonCard pokemon={enemyPokemon} isEnemy controls={controlsEnemy} statusEffect={enemyStatus} />
          ) : (
            <div className="text-slate-600 text-sm">Aucun adversaire</div>
          )}
        </div>

        {/* Battle logs */}
        <div className="w-full max-w-md">
          <AnimatePresence mode="popLayout">
            {battleLogs.slice(-3).map((log, i) => (
              <motion.div
                key={`${log.message}-${i}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className={`text-[10px] sm:text-xs font-mono px-2 py-0.5 truncate ${
                  log.type === 'PLAYER'
                    ? 'text-cyan-400'
                    : log.type === 'ENEMY'
                      ? 'text-red-400'
                      : log.type === 'CRITICAL'
                        ? 'text-yellow-400'
                        : 'text-slate-500'
                }`}
              >
                {log.message}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Player Pokemon */}
        <div className="relative z-10">
          {playerPokemon ? (
            <BattlePokemonCard pokemon={playerPokemon} controls={controlsPlayer} />
          ) : (
            <div className="text-slate-600 text-sm">Aucun Pokemon</div>
          )}
        </div>
      </div>

      {/* ── BOTTOM ACTION BAR ── */}
      <div className="relative z-10 p-2 sm:p-3 bg-slate-900/80 border-t border-slate-800/50 shrink-0">
        <div className="flex gap-1.5 sm:gap-2">
          <ActionButton
            onClick={() => { playSfx('CLICK'); setShowQuiz(true); }}
            disabled={actionsDisabled}
            label="Attaque"
            icon="⚔️"
            color="bg-cyan-900/50 hover:bg-cyan-800/50 border-cyan-600/30"
          />
          {specialGauge >= 100 && (
            <ActionButton
              onClick={() => { playSfx('CLICK'); handleUltimate(); }}
              disabled={actionsDisabled}
              label="Ultime"
              icon="💥"
              color="bg-purple-900/50 hover:bg-purple-800/50 border-purple-500/30"
            />
          )}
          <ActionButton
            onClick={() => { playSfx('CLICK'); setShowInventory(true); }}
            disabled={actionsDisabled}
            label="Sac"
            icon="🎒"
          />
          <ActionButton
            onClick={() => { playSfx('CLICK'); setShowTeam(true); }}
            disabled={actionsDisabled}
            label="Équipe"
            icon="👥"
          />
          <ActionButton
            onClick={() => { playSfx('CLICK'); handleFlee(); }}
            disabled={false}
            label="Fuite"
            icon="🏃"
            color="bg-red-900/30 hover:bg-red-800/30 border-red-600/30"
          />
        </div>
      </div>

      {/* ── OVERLAYS ── */}

      {/* Quiz overlay */}
      {showQuiz && user && (
        <QuizOverlay
          user={user}
          onComplete={handleQuizComplete}
          onClose={() => setShowQuiz(false)}
        />
      )}

      {/* Inventory overlay */}
      <AnimatePresence>
        {showInventory && (
          <InventoryBar
            items={battleItems}
            onUse={handleUseItem}
            onClose={() => setShowInventory(false)}
          />
        )}
      </AnimatePresence>

      {/* Team manager overlay */}
      <AnimatePresence>
        {showTeam && (
          <TeamManager
            collection={collection}
            currentPokemon={playerPokemon}
            onSwitch={handleSwitchPokemon}
            onClose={() => setShowTeam(false)}
          />
        )}
      </AnimatePresence>

      {/* Capture phase */}
      <AnimatePresence>
        {phase === 'CAPTURE' && enemyPokemon && (
          <CaptureScreen
            enemy={enemyPokemon}
            hasPokeball={hasPokeball}
            captureSuccess={captureSuccess}
            captureAnimating={captureAnimating}
            onCapture={handleCapture}
            onContinue={() => handleCapture(false)}
            onAnimEnd={onCaptureAnimEnd}
            battleMode={battleMode}
          />
        )}
      </AnimatePresence>

      {/* Victory / Defeat */}
      <AnimatePresence>
        {phase === 'FINISHED' && (
          <FinishedScreen
            isVictory={isVictory}
            rewards={rewards}
            onExit={handleExitBattle}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default BattleScene;
