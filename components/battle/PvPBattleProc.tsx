import React, { useState, useEffect, useRef } from 'react';
import { socketService } from '../../services/socket';
import { motion, AnimatePresence } from 'framer-motion';
import { playSfx } from '../../utils/soundEngine';
import { useGameStore } from '../../store/gameStore';

interface PokemonData {
  id: number;
  tyradexId: number;
  level: number;
  name: string;
  spriteUrl: string;
  currentHp: number;
  maxHp: number;
}

interface MatchState {
  id: number;
  player1Id: number;
  player2Id: number;
  player1Name: string;
  player2Name: string;
  player1Team: PokemonData[];
  player2Team: PokemonData[];
  player1TeamHp: number[];
  player2TeamHp: number[];
  player1ActivePokemon: number;
  player2ActivePokemon: number;
  currentTurnId: number | null;
  status: string;
  winnerId?: number;
  xpReward?: number;
  turnNumber: number;
}

interface Question {
  id: number;
  text: string;
  options: string[];
  difficulty: number;
}

interface TurnHistory {
  id: number;
  turnNumber: number;
  playerId: number;
  playerName: string;
  questionText: string;
  questionOptions: string[];
  correctIndex: number;
  answerIndex: number;
  isCorrect: boolean;
  damageDealt: number;
}

export const PvPBattleProc: React.FC = () => {
  const { user, setBattlePhase } = useGameStore();
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [history, setHistory] = useState<TurnHistory[]>([]);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showCoinFlip, setShowCoinFlip] = useState(false);
  const [coinFlipWinner, setCoinFlipWinner] = useState<string | null>(null);
  const [battleReady, setBattleReady] = useState(false);
  const coinFlipShownRef = useRef(false);
  const [lastOpponentTurn, setLastOpponentTurn] = useState<TurnHistory | null>(null);

  const matchId = localStorage.getItem('pvp_match_id');

  useEffect(() => {
    if (!matchId) {
      setError('Aucun match en cours');
      setLoading(false);
      return;
    }

    // Join match room
    socketService.emit('pvp:join_match', { matchId: parseInt(matchId) });

    // Init battle
    socketService.emit('pvp:init_battle', { matchId: parseInt(matchId) });

    // Listen for match state
    socketService.on('pvp:match_state', (data: any) => {
      const isFirstState = !matchState && data.match?.turnNumber === 1;
      setMatchState(data.match);
      setHistory(data.history || []);
      // Use server-computed isMyTurn which is correct for each player
      setIsMyTurn(data.isMyTurn === true);
      setCurrentQuestion(data.currentQuestion);
      setLoading(false);
      setError(null);
      
      // Find last opponent turn to display
      const historyList = data.history || [];
      const lastOppTurn = historyList.filter((t: TurnHistory) => t.playerId !== user?.id).slice(-1)[0];
      if (lastOppTurn && (!lastOpponentTurn || lastOppTurn.id !== lastOpponentTurn.id)) {
        setLastOpponentTurn(lastOppTurn);
      }
      
      // Show coin flip animation on first state (only once)
      if (isFirstState && !battleReady && !coinFlipShownRef.current) {
        coinFlipShownRef.current = true;
        const starterName = data.isMyTurn ? 'TOI' : (data.match?.player1Id === user?.id ? data.match?.player2Name : data.match?.player1Name);
        setShowCoinFlip(true);
        setCoinFlipWinner(starterName);
        playSfx('WIN');
        setTimeout(() => {
          setShowCoinFlip(false);
          setBattleReady(true);
        }, 3000);
      } else if (data.match?.turnNumber > 1 || coinFlipShownRef.current) {
        setBattleReady(true);
      }
    });

    socketService.on('pvp:battle_initialized', (data: { matchId: number; isMyTurn: boolean }) => {
      setIsMyTurn(data.isMyTurn);
    });

    socketService.on('pvp:answer_result', (data: any) => {
      playSfx(data.isCorrect ? 'CORRECT' : 'WRONG');
      setSelectedAnswer(null);
      
      // Request new state
      socketService.emit('pvp:get_state', { matchId: parseInt(matchId) });
    });

    socketService.on('pvp:forfeit_result', (data: any) => {
      playSfx('DAMAGE');
      socketService.emit('pvp:get_state', { matchId: parseInt(matchId) });
    });

    socketService.on('pvp:error', (data: { message: string }) => {
      setError(data.message);
      setLoading(false);
    });

    // Poll for state updates
    const pollInterval = setInterval(() => {
      socketService.emit('pvp:get_state', { matchId: parseInt(matchId) });
    }, 2000);

    return () => {
      socketService.off('pvp:match_state');
      socketService.off('pvp:battle_initialized');
      socketService.off('pvp:answer_result');
      socketService.off('pvp:forfeit_result');
      socketService.off('pvp:error');
      clearInterval(pollInterval);
    };
  }, [matchId, user?.id]);

  const submitAnswer = (answerIdx: number) => {
    if (answerIdx === null || !matchId) return;
    
    socketService.emit('pvp:submit_answer', {
      matchId: parseInt(matchId),
      answerIndex: answerIdx
    });
    setSelectedAnswer(answerIdx);
  };

  const forfeit = () => {
    if (!confirm('Abandonner le match ?')) return;
    if (!matchId) return;
    
    socketService.emit('pvp:forfeit', { matchId: parseInt(matchId) });
  };

  const exitMatch = () => {
    localStorage.removeItem('pvp_match_id');
    setBattlePhase('PVP_LOBBY');
  };

  // Loading
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-purple-400 font-display">CHARGEMENT DU COMBAT...</p>
        </div>
      </div>
    );
  }

  // Coin Flip Animation
  if (showCoinFlip) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950 p-4">
        <motion.div
          initial={{ rotateY: 0 }}
          animate={{ rotateY: 1080 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-[0_0_60px_rgba(234,179,8,0.5)] mb-8"
        >
          <span className="text-6xl sm:text-7xl">🪙</span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-display font-black text-white mb-2">TIRAGE AU SORT</h2>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 0.3 }}
            className="text-xl sm:text-2xl font-display font-bold text-yellow-400"
          >
            {coinFlipWinner === 'TOI' ? '✨ TU COMMENCES ! ✨' : `${coinFlipWinner} COMMENCE !`}
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // Error
  if (error || !matchState) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-4">
        <div className="text-5xl mb-4">❌</div>
        <p className="text-red-400 font-display mb-4">{error || 'Erreur'}</p>
        <button
          onClick={exitMatch}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold"
        >
          RETOUR AU LOBBY
        </button>
      </div>
    );
  }

  const amPlayer1 = matchState.player1Id === user?.id;
  const myTeam = amPlayer1 ? matchState.player1Team : matchState.player2Team;
  const opponentTeam = amPlayer1 ? matchState.player2Team : matchState.player1Team;
  const myTeamHp = amPlayer1 ? matchState.player1TeamHp : matchState.player2TeamHp;
  const opponentTeamHp = amPlayer1 ? matchState.player2TeamHp : matchState.player1TeamHp;
  const myActivePokemon = amPlayer1 ? matchState.player1ActivePokemon : matchState.player2ActivePokemon;
  const opponentActivePokemon = amPlayer1 ? matchState.player2ActivePokemon : matchState.player1ActivePokemon;
  const myName = amPlayer1 ? matchState.player1Name : matchState.player2Name;
  const opponentName = amPlayer1 ? matchState.player2Name : matchState.player1Name;

  // Match ended
  if (matchState.status === 'COMPLETED' || matchState.status === 'ABANDONED') {
    const iWon = matchState.winnerId === user?.id;
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-6xl mb-4"
        >
          {iWon ? '🏆' : '😢'}
        </motion.div>
        <h1 className={`text-4xl font-display font-black mb-4 ${iWon ? 'text-yellow-400' : 'text-slate-400'}`}>
          {iWon ? 'VICTOIRE !' : 'DÉFAITE'}
        </h1>
        {iWon && matchState.xpReward && (
          <div className="text-xl text-green-400 font-bold mb-6">
            +{matchState.xpReward} XP
          </div>
        )}
        <button
          onClick={exitMatch}
          className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-display font-bold text-lg"
        >
          RETOUR AU LOBBY
        </button>
      </div>
    );
  }

  // HP Bar Component
  const HpBar = ({ current, max }: { current: number; max: number }) => {
    const percent = Math.min(100, Math.max(0, (current / max) * 100));
    return (
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            percent > 50 ? 'bg-green-500' : percent > 25 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-slate-900/80 border-b border-purple-500/30">
        <div className="text-sm font-display text-white">
          <span className="text-cyan-400">{myName}</span>
          <span className="text-slate-500"> VS </span>
          <span className="text-red-400">{opponentName}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-bold"
          >
            📜
          </button>
          <button
            onClick={forfeit}
            className="px-2 py-1 bg-red-600 text-white rounded text-xs font-bold"
          >
            🏳️
          </button>
        </div>
      </div>

      {/* Battle Area */}
      <div className="flex-1 flex flex-col p-3 overflow-y-auto">
        {/* Opponent Team */}
        <div className="flex justify-center gap-2 sm:gap-3 mb-4">
          {opponentTeam.map((pokemon, idx) => {
            const hp = opponentTeamHp[idx];
            const isActive = idx === opponentActivePokemon;
            
            return (
              <div
                key={idx}
                className={`relative bg-slate-900/60 rounded-lg p-2 sm:p-3 border ${
                  isActive ? 'border-red-500 scale-105' : 'border-slate-700 opacity-60'
                } transition-all min-w-[80px] sm:min-w-[100px]`}
              >
                {isActive && (
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[8px] sm:text-[10px] px-1.5 rounded-full">
                    ACTIF
                  </div>
                )}
                <img
                  src={pokemon.spriteUrl}
                  className={`w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto ${hp <= 0 ? 'grayscale opacity-30' : ''}`}
                  alt={pokemon.name}
                />
                <p className="text-[10px] sm:text-xs text-center text-white font-bold truncate">{pokemon.name}</p>
                <HpBar current={hp} max={pokemon.maxHp} />
                <p className="text-[8px] sm:text-[10px] text-center text-slate-400">{hp}/{pokemon.maxHp}</p>
              </div>
            );
          })}
        </div>

        {/* Last Opponent Answer */}
        {lastOpponentTurn && (
          <div className="w-full max-w-md mx-auto mb-3">
            <div className={`bg-slate-900/80 rounded-xl p-3 border ${lastOpponentTurn.isCorrect ? 'border-green-500/50' : 'border-red-500/50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-bold ${lastOpponentTurn.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                  {lastOpponentTurn.isCorrect ? '✓' : '✗'} {opponentName}
                </span>
                <span className="text-[10px] text-slate-500">
                  {lastOpponentTurn.isCorrect ? 'Bonne réponse' : 'Mauvaise réponse'} ({lastOpponentTurn.damageDealt} dégâts)
                </span>
              </div>
              <p className="text-xs text-slate-300 mb-1">{lastOpponentTurn.questionText}</p>
              <p className="text-[10px] text-slate-400">
                <span className="text-slate-500">Réponse: </span>
                <span className={lastOpponentTurn.isCorrect ? 'text-green-400' : 'text-red-400'}>
                  {lastOpponentTurn.questionOptions[lastOpponentTurn.answerIndex]}
                </span>
                {!lastOpponentTurn.isCorrect && (
                  <span className="text-green-400 ml-2">(Bonne: {lastOpponentTurn.questionOptions[lastOpponentTurn.correctIndex]})</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Question Area */}
        <div className="flex-1 flex items-center justify-center">
          {currentQuestion ? (
            <div className={`w-full max-w-md bg-slate-900/80 rounded-xl p-4 border-2 ${
              isMyTurn ? 'border-cyan-500' : 'border-orange-500'
            }`}>
              {/* Turn Indicator */}
              <div className="text-center mb-3">
                {isMyTurn ? (
                  <span className="inline-block px-3 py-1 bg-cyan-600 text-white font-bold rounded-full text-xs">
                    ✨ TON TOUR
                  </span>
                ) : (
                  <span className="inline-block px-3 py-1 bg-orange-600 text-white font-bold rounded-full text-xs animate-pulse">
                    ⏳ TOUR DE {opponentName.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Question */}
              <h2 className="text-lg text-white font-bold mb-3">{currentQuestion.text}</h2>

              {/* Options */}
              <div className="space-y-2">
                {currentQuestion.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => isMyTurn && selectedAnswer === null && submitAnswer(idx)}
                    disabled={!isMyTurn || selectedAnswer !== null}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all text-sm ${
                      isMyTurn
                        ? selectedAnswer === idx
                          ? 'bg-cyan-600 border-cyan-400 text-white'
                          : selectedAnswer !== null
                            ? 'bg-slate-800/50 border-slate-700/50 text-slate-500'
                            : 'bg-slate-800 border-slate-700 text-slate-300 active:scale-[0.98]'
                        : 'bg-slate-800/50 border-slate-700/50 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-400">Chargement...</p>
            </div>
          )}
        </div>

        {/* My Team */}
        <div className="flex justify-center gap-2 sm:gap-3 mt-4">
          {myTeam.map((pokemon, idx) => {
            const hp = myTeamHp[idx];
            const isActive = idx === myActivePokemon;
            
            return (
              <div
                key={idx}
                className={`relative bg-slate-900/60 rounded-lg p-2 sm:p-3 border ${
                  isActive ? 'border-cyan-500 scale-105' : 'border-slate-700 opacity-60'
                } transition-all min-w-[80px] sm:min-w-[100px]`}
              >
                {isActive && (
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-cyan-600 text-white text-[8px] sm:text-[10px] px-1.5 rounded-full">
                    ACTIF
                  </div>
                )}
                <img
                  src={pokemon.spriteUrl}
                  className={`w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto ${hp <= 0 ? 'grayscale opacity-30' : ''}`}
                  alt={pokemon.name}
                />
                <p className="text-[10px] sm:text-xs text-center text-white font-bold truncate">{pokemon.name}</p>
                <HpBar current={hp} max={pokemon.maxHp} />
                <p className="text-[8px] sm:text-[10px] text-center text-slate-400">{hp}/{pokemon.maxHp}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* History Panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed right-0 top-0 bottom-0 w-80 max-w-full bg-slate-900/98 border-l border-purple-500/30 p-4 overflow-y-auto z-50"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display font-bold text-purple-400">📜 HISTORIQUE</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            {history.length === 0 ? (
              <p className="text-slate-500 text-center text-sm">Aucun tour joué</p>
            ) : (
              <div className="space-y-3">
                {history.map((turn) => (
                  <div
                    key={turn.id}
                    className={`p-3 rounded-lg border ${
                      turn.playerId === user?.id
                        ? 'bg-cyan-900/20 border-cyan-500/30'
                        : 'bg-red-900/20 border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-bold text-xs ${
                        turn.playerId === user?.id ? 'text-cyan-400' : 'text-red-400'
                      }`}>
                        {turn.playerName}
                      </span>
                      <span className="text-[10px] text-slate-500">Tour #{turn.turnNumber}</span>
                    </div>
                    <p className="text-white text-xs mb-2">{turn.questionText}</p>
                    <div className="space-y-1">
                      {turn.questionOptions.map((option, idx) => (
                        <div
                          key={idx}
                          className={`text-[10px] p-1.5 rounded ${
                            idx === turn.correctIndex
                              ? 'bg-green-900/30 text-green-400 border border-green-500/30'
                              : idx === turn.answerIndex
                                ? 'bg-red-900/30 text-red-400 border border-red-500/30'
                                : 'bg-slate-800/50 text-slate-400'
                          }`}
                        >
                          {idx === turn.answerIndex && '➤ '}
                          {option}
                          {idx === turn.correctIndex && ' ✓'}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-[10px]">
                      <span className={turn.isCorrect ? 'text-green-400' : 'text-red-400'}>
                        {turn.isCorrect ? `✓ ${turn.damageDealt} dégâts` : '✗ Raté'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
