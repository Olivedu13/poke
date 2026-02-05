import React, { useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useBattleLogic } from './useBattleLogic';
import { QuizOverlay } from './QuizOverlay';
import { InventoryBar } from './InventoryBar';
import { BattleModeSelector } from './BattleModeSelector';
import { PvPLobby } from './PvPLobby';
import { PvPBattleProc } from './PvPBattleProc';
import { motion, AnimatePresence } from 'framer-motion';
import { Item, Pokemon } from '../../types';
import { ASSETS_BASE_URL } from '../../config';

// HP Bar Component - Mobile Optimized
const HpBar = ({ current, max, isEnemy = false }: { current: number; max: number; isEnemy?: boolean }) => {
  const percent = Math.min(100, Math.max(0, (current / max) * 100));
  const isLow = percent < 25;
  const isMedium = percent < 50 && percent >= 25;
  
  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
        <span className="font-bold">PV</span>
        <span className="font-mono">{current}/{max}</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${
            isLow ? 'bg-red-500' : isMedium ? 'bg-yellow-500' : isEnemy ? 'bg-red-400' : 'bg-green-500'
          }`}
          initial={{ width: '100%' }}
          animate={{ width: `${percent}%` }}
          transition={{ type: 'spring', duration: 0.5 }}
        />
      </div>
    </div>
  );
};

// Pokemon Card - Mobile
const PokemonCard = ({ pokemon, isEnemy = false, isActive = true }: { pokemon: Pokemon; isEnemy?: boolean; isActive?: boolean }) => (
  <div className={`relative bg-slate-900/60 rounded-xl p-3 border ${isActive ? (isEnemy ? 'border-red-500/50' : 'border-cyan-500/50') : 'border-slate-700/50 opacity-60'}`}>
    <div className="flex flex-col items-center">
      <div className="flex items-baseline gap-2 mb-2">
        <span className="font-bold text-base sm:text-lg text-white">{pokemon.name}</span>
        <span className={`text-xs font-mono ${isEnemy ? 'text-red-400' : 'text-cyan-400'}`}>Nv.{pokemon.level}</span>
      </div>
      <img 
        src={pokemon.sprite_url} 
        alt={pokemon.name} 
        className={`w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 object-contain ${pokemon.current_hp <= 0 ? 'grayscale opacity-30' : ''}`}
      />
      <div className="w-full mt-2">
        <HpBar current={pokemon.current_hp} max={pokemon.max_hp} isEnemy={isEnemy} />
      </div>
    </div>
  </div>
);

// Grade Gauge - Mobile
const GradeGauge = ({ current, max = 5, grade }: { current: number; max?: number; grade: string }) => {
  const percent = Math.min(100, (current / max) * 100);
  return (
    <div className="flex items-center gap-2 bg-slate-900/80 px-2 py-1 rounded-full border border-purple-500/30">
      <span className="text-[10px] text-purple-400 font-mono">NIV</span>
      <span className="text-sm font-display font-bold text-white">{grade}</span>
      <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-purple-600 to-pink-500"
          animate={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-[10px] text-purple-400 font-mono">{current}/{max}</span>
    </div>
  );
};

// Team Manager Modal - Mobile Optimized
const TeamManager = ({ team, box, currentId, onSelect, onClose, onStartBattle }: any) => {
  const [tab, setTab] = React.useState<'TEAM' | 'BOX'>('TEAM');
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
    <div className="fixed inset-0 z-50 bg-slate-950/98 backdrop-blur-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800">
        <h3 className="font-display font-bold text-white flex items-center gap-2">
          <img src={`${ASSETS_BASE_URL}/pokeball.webp`} className="w-5 h-5" /> GESTION
        </h3>
        <button onClick={onClose} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-sm font-bold">
          RETOUR
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-2 gap-2 bg-slate-900">
        <button
          onClick={() => setTab('TEAM')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
            tab === 'TEAM' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'
          }`}
        >
          ÉQUIPE ({team.length}/3)
        </button>
        <button
          onClick={() => setTab('BOX')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
            tab === 'BOX' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'
          }`}
        >
          RÉSERVE
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'TEAM' ? (
          <div className="space-y-2">
            {team.map((p: Pokemon) => (
              <div
                key={p.id}
                onClick={() => setSelected(p)}
                className={`p-3 rounded-xl border bg-slate-900 flex items-center gap-3 cursor-pointer transition-all ${
                  selected?.id === p.id ? 'border-cyan-500 bg-cyan-900/20' : 'border-slate-700'
                }`}
              >
                <img src={p.sprite_url} className="w-12 h-12" />
                <div className="flex-1">
                  <div className="font-bold text-white text-sm">{p.name}</div>
                  <div className="text-xs text-slate-400">Niv. {p.level} • {p.current_hp}/{p.max_hp} PV</div>
                </div>
                {selected?.id === p.id && <span className="text-cyan-400">✓</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {box.map((p: Pokemon) => (
              <div
                key={p.id}
                onClick={() => setSelected(p)}
                className={`p-2 rounded-lg border bg-slate-900 flex flex-col items-center cursor-pointer transition-all ${
                  selected?.id === p.id ? 'border-cyan-500 bg-cyan-900/20' : 'border-slate-700'
                }`}
              >
                <img src={p.sprite_url} className="w-10 h-10" />
                <span className="text-[10px] text-slate-300 truncate w-full text-center">{p.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-3 pb-24 border-t border-slate-800 space-y-2 bg-slate-950">
        {onStartBattle && team.length > 0 && (
          <button
            onClick={onStartBattle}
            className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-display font-bold rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.3)]"
          >
            ⚔️ LANCER LE COMBAT
          </button>
        )}
        <button
          onClick={handleConfirm}
          disabled={!selected}
          className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:opacity-50 text-white font-bold rounded-xl"
        >
          {selected ? (team.some((p: Pokemon) => p.id === selected.id) ? 'DÉFINIR LEADER' : 'ÉCHANGER') : 'SÉLECTIONNER'}
        </button>
      </div>
    </div>
  );
};

// Preview Screen - Mobile Optimized
const PreviewScreen = ({ enemy, enemyTeam, player, onStart, onManageTeam, onBack }: any) => {
  if (!enemy || !player) return null;
  const team = enemyTeam?.length > 0 ? enemyTeam : [enemy];

  return (
    <div className="flex-1 flex flex-col p-4 overflow-y-auto">
      {/* Back button */}
      <button 
        onClick={onBack}
        className="mb-3 text-slate-400 hover:text-white flex items-center gap-1 text-xs self-start"
      >
        <span>←</span> RETOUR
      </button>
      
      {/* Enemy Section */}
      <div className="mb-4">
        <h3 className="text-sm font-display font-bold text-red-400 mb-2 text-center">ADVERSAIRE{team.length > 1 ? `S (${team.length})` : ''}</h3>
        <div className="flex justify-center gap-2 flex-wrap">
          {team.map((poke: Pokemon, idx: number) => (
            <div
              key={idx}
              className={`bg-slate-900/60 border ${idx === 0 ? 'border-red-500' : 'border-slate-700'} rounded-xl p-2 flex flex-col items-center min-w-[80px]`}
            >
              {idx === 0 && <span className="text-[8px] bg-red-600 text-white px-1.5 rounded-full mb-1">LEADER</span>}
              <img src={poke.sprite_url} className="w-16 h-16 object-contain" />
              <span className="text-xs font-bold text-red-400 truncate w-full text-center">{poke.name}</span>
              <span className="text-[10px] text-slate-500">Niv.{poke.level}</span>
            </div>
          ))}
        </div>
      </div>

      {/* VS */}
      <div className="flex items-center justify-center gap-3 my-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
        <span className="text-xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-red-400">VS</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
      </div>

      {/* Player Section */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <img src={player.sprite_url} className="w-32 h-32 object-contain drop-shadow-2xl" />
        <h2 className="text-lg font-display font-bold text-white mt-2">{player.name}</h2>
        <span className="text-xs text-cyan-400 mb-3">Votre Leader • Niv.{player.level}</span>
        <button
          onClick={onManageTeam}
          className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-full text-slate-300 text-xs font-bold flex items-center gap-2"
        >
          <img src={`${ASSETS_BASE_URL}/pokeball.webp`} className="w-4 h-4" />
          Gérer l'équipe
        </button>
      </div>

      {/* Start Button */}
      <button
        onClick={onStart}
        className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-display font-black text-lg rounded-xl shadow-[0_0_30px_rgba(239,68,68,0.4)] active:scale-[0.98] transition-transform"
      >
        LANCER LE COMBAT
      </button>
    </div>
  );
};

// Action Buttons - Mobile
const ActionButton = ({ onClick, disabled, label, color, icon }: any) => {
  const colors: Record<string, string> = {
    red: 'from-red-600 to-red-700 border-red-500',
    blue: 'from-cyan-600 to-blue-700 border-cyan-500',
    yellow: 'from-yellow-500 to-orange-600 border-yellow-400',
    purple: 'from-purple-600 to-purple-700 border-purple-500',
    green: 'from-green-600 to-green-700 border-green-500',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 py-3 rounded-xl border-t-2 border-b-4 bg-gradient-to-b ${colors[color]} shadow-lg active:border-b-2 active:translate-y-0.5 transition-all disabled:opacity-40 disabled:grayscale flex flex-col items-center justify-center gap-0.5`}
    >
      {icon && <span className="text-lg">{icon}</span>}
      <span className="text-[10px] font-display font-bold text-white uppercase">{label}</span>
    </button>
  );
};

// Main Battle Scene Component
export const BattleScene: React.FC = () => {
  const {
    user, playerPokemon, enemyPokemon, battleLogs,
    isPlayerTurn, battleOver, collection, inventory,
    gradeGauge, combo, specialGauge, previewEnemy, previewEnemyTeam, selectedPlayer,
    battleMode, battlePhase
  } = useGameStore();

  const {
    phase, rewards, lootRevealed,
    showQuiz, setShowQuiz,
    showInventory, setShowInventory,
    showTeam, setShowTeam,
    shake, flash, floatingTexts,
    captureSuccess,
    isPvpMyTurn,
    startBattle,
    handleQuizComplete,
    handleUltimate,
    handleFlee,
    handleUseItem,
    handleSwitchPokemon,
    handleExitBattle,
    revealLoot,
    handleCapture
  } = useBattleLogic();

  const teamPokemon = collection.filter(p => p.is_team);
  const boxPokemon = collection.filter(p => !p.is_team);
  const allowedItems = battleMode === 'TRAINER'
    ? ['HEAL', 'BUFF_ATK', 'BUFF_DEF', 'REVIVE', 'TRAITOR', 'JOKER']
    : ['HEAL', 'BUFF_ATK', 'BUFF_DEF', 'REVIVE', 'CAPTURE', 'JOKER'];
  const battleItems = inventory.filter(i => i.quantity > 0 && allowedItems.includes(i.effect_type));
  const actionsDisabled = battleMode === 'PVP' ? !isPvpMyTurn : !isPlayerTurn;

  // Mode Selection
  if (phase === 'NONE') {
    return <BattleModeSelector />;
  }

  // PvP Lobby
  if (phase === 'PVP_LOBBY') {
    return <PvPLobby />;
  }

  // PvP Battle
  if (battleMode === 'PVP' && phase === 'FIGHTING') {
    return <PvPBattleProc />;
  }

  // Loading
  if (phase === 'LOADING') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-cyan-400 font-display">RECHERCHE...</p>
        </div>
      </div>
    );
  }

  // Preview
  if (phase === 'PREVIEW') {
    return (
      <>
        <PreviewScreen
          enemy={previewEnemy}
          enemyTeam={previewEnemyTeam}
          player={selectedPlayer}
          onStart={startBattle}
          onManageTeam={() => setShowTeam(true)}
          onBack={handleExitBattle}
        />
        {showTeam && (
          <TeamManager
            team={teamPokemon}
            box={boxPokemon}
            currentId={selectedPlayer?.id}
            onSelect={handleSwitchPokemon}
            onClose={() => setShowTeam(false)}
            onStartBattle={() => { setShowTeam(false); startBattle(); }}
          />
        )}
      </>
    );
  }

  const activePla = playerPokemon || selectedPlayer;
  const activeEnemy = enemyPokemon || previewEnemy;

  if (!activePla || !activeEnemy) return null;

  return (
    <div className={`flex-1 flex flex-col bg-slate-950 overflow-hidden ${shake ? 'animate-shake' : ''}`}>
      {/* Top Bar */}
      <div className="flex items-center justify-between p-2 bg-slate-900/80">
        <button 
          onClick={handleExitBattle}
          className="text-slate-400 hover:text-red-400 text-xs flex items-center gap-1"
        >
          ← Fuir
        </button>
        {user && <GradeGauge current={gradeGauge} grade={user.grade_level} />}
        {combo > 1 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="font-display font-black text-xl text-yellow-400 animate-bounce"
          >
            x{combo}
          </motion.div>
        )}
      </div>

      {/* Battle Arena */}
      <div className="flex-1 flex flex-col justify-between p-3 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 pointer-events-none" />
        
        {/* Enemy Team Indicators (Trainer mode) */}
        {battleMode === 'TRAINER' && previewEnemyTeam && previewEnemyTeam.length > 1 && (
          <div className="relative z-10 flex justify-center gap-1.5 mb-2">
            {previewEnemyTeam.map((poke: Pokemon, idx: number) => {
              const isActive = poke.id === activeEnemy?.id;
              const isKO = poke.current_hp <= 0;
              return (
                <div
                  key={idx}
                  className={`flex flex-col items-center p-1.5 rounded-lg border transition-all ${
                    isActive ? 'bg-red-900/40 border-red-500 scale-110' : 
                    isKO ? 'bg-slate-900/40 border-slate-700 opacity-40' : 
                    'bg-slate-900/40 border-slate-700'
                  }`}
                >
                  <img 
                    src={poke.sprite_url} 
                    className={`w-10 h-10 sm:w-12 sm:h-12 object-contain ${isKO ? 'grayscale' : ''}`} 
                    alt={poke.name} 
                  />
                  <div className="w-full h-1 bg-slate-800 rounded-full mt-0.5 overflow-hidden">
                    <div 
                      className={`h-full ${isKO ? 'bg-slate-600' : 'bg-red-500'}`} 
                      style={{ width: `${Math.max(0, (poke.current_hp / poke.max_hp) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Enemy */}
        <div className="relative z-10 mb-4">
          <PokemonCard pokemon={activeEnemy} isEnemy />
        </div>

        {/* Battle Log */}
        <div className="relative z-10 flex-1 flex items-center justify-center">
          <div className="text-center">
            {battleLogs.slice(-1).map((log, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-sm font-medium ${
                  log.type === 'CRITICAL' ? 'text-yellow-400' :
                  log.type === 'PLAYER' ? 'text-cyan-400' :
                  log.type === 'ENEMY' ? 'text-red-400' : 'text-slate-400'
                }`}
              >
                {log.message}
              </motion.p>
            ))}
          </div>
        </div>

        {/* Floating Texts */}
        <AnimatePresence>
          {floatingTexts.map((ft) => (
            <motion.div
              key={ft.id}
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: 1, y: -50, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 font-display font-black text-2xl ${ft.color}`}
            >
              {ft.text}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Player */}
        <div className="relative z-10 mt-4">
          <PokemonCard pokemon={activePla} />
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 bg-slate-900/80 border-t border-slate-800">
        <div className="flex gap-2">
          <ActionButton
            onClick={() => setShowQuiz(true)}
            disabled={actionsDisabled || battleOver}
            label="Attaque"
            color="red"
            icon="⚔️"
          />
          <ActionButton
            onClick={() => setShowInventory(true)}
            disabled={actionsDisabled || battleOver}
            label="Sac"
            color="blue"
            icon="🎒"
          />
          <ActionButton
            onClick={() => setShowTeam(true)}
            disabled={actionsDisabled || battleOver}
            label="Équipe"
            color="yellow"
            icon="👥"
          />
          <ActionButton
            onClick={handleFlee}
            disabled={actionsDisabled || battleOver}
            label="Fuite"
            color="purple"
            icon="🏃"
          />
        </div>
      </div>

      {/* Overlays */}
      {showQuiz && user && (
        <QuizOverlay user={user} onComplete={handleQuizComplete} onClose={() => setShowQuiz(false)} />
      )}

      {showInventory && (
        <InventoryBar
          items={battleItems}
          onUseItem={handleUseItem}
          onClose={() => setShowInventory(false)}
        />
      )}

      {showTeam && (
        <TeamManager
          team={teamPokemon}
          box={boxPokemon}
          currentId={activePla?.id}
          onSelect={handleSwitchPokemon}
          onClose={() => setShowTeam(false)}
        />
      )}

      {/* Victory/Defeat */}
      <AnimatePresence>
        {battleOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-6xl mb-4"
            >
              {playerPokemon && playerPokemon.current_hp > 0 ? '🎉' : '😢'}
            </motion.div>
            <h2 className="text-3xl font-display font-black text-white mb-2">
              {playerPokemon && playerPokemon.current_hp > 0 ? 'VICTOIRE !' : 'DÉFAITE'}
            </h2>
            {rewards && (
              <div className="flex gap-4 mb-6">
                <div className="text-center">
                  <span className="text-2xl font-bold text-yellow-400">+{rewards.gold}</span>
                  <p className="text-xs text-slate-400">Or</p>
                </div>
                <div className="text-center">
                  <span className="text-2xl font-bold text-cyan-400">+{rewards.xp}</span>
                  <p className="text-xs text-slate-400">XP</p>
                </div>
              </div>
            )}
            <button
              onClick={handleExitBattle}
              className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-display font-bold rounded-xl"
            >
              CONTINUER
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
