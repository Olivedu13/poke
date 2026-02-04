import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { socketService } from '../../services/socket';
import { ASSETS_BASE_URL } from '../../config';
import { motion, AnimatePresence } from 'framer-motion';
import { playSfx } from '../../utils/soundEngine';

interface OnlinePlayer {
  id: number;
  username: string;
  gradeLevel: string;
  avatarPokemonId?: number;
  status: 'available' | 'in_battle' | 'challenged';
}

interface Challenge {
  id: number;
  challengerId: number;
  challengerName: string;
}

export const PvPLobby: React.FC = () => {
  const { user, setBattlePhase, setBattleMode, setView } = useGameStore();
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [incomingChallenges, setIncomingChallenges] = useState<Challenge[]>([]);
  const [sentChallenges, setSentChallenges] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Join lobby via socket
    socketService.emit('pvp:join_lobby');

    // Listen for events
    socketService.on('pvp:lobby_players', (data: { players: OnlinePlayer[] }) => {
      setOnlinePlayers(data.players.filter(p => p.id !== user?.id));
      setLoading(false);
    });

    socketService.on('pvp:player_joined', (data: { id: number; username: string }) => {
      setOnlinePlayers(prev => {
        if (prev.some(p => p.id === data.id)) return prev;
        return [...prev, { ...data, status: 'available', gradeLevel: '' }];
      });
    });

    socketService.on('pvp:player_left', (data: { id: number }) => {
      setOnlinePlayers(prev => prev.filter(p => p.id !== data.id));
    });

    socketService.on('pvp:challenge_received', (data: Challenge) => {
      setIncomingChallenges(prev => [...prev, data]);
      playSfx('WIN');
    });

    socketService.on('pvp:challenge_declined', (data: { challengeId: number }) => {
      setSentChallenges(prev => prev.filter(id => id !== data.challengeId));
    });

    socketService.on('pvp:match_created', (data: { matchId: number }) => {
      localStorage.setItem('pvp_match_id', String(data.matchId));
      playSfx('WIN');
      setBattleMode('PVP');
      setBattlePhase('FIGHTING');
    });

    socketService.on('pvp:error', (data: { message: string }) => {
      setError(data.message);
      setTimeout(() => setError(null), 3000);
    });

    // Heartbeat
    const heartbeatInterval = setInterval(() => {
      socketService.emit('pvp:heartbeat');
    }, 10000);

    return () => {
      socketService.emit('pvp:leave_lobby');
      socketService.off('pvp:lobby_players');
      socketService.off('pvp:player_joined');
      socketService.off('pvp:player_left');
      socketService.off('pvp:challenge_received');
      socketService.off('pvp:challenge_declined');
      socketService.off('pvp:match_created');
      socketService.off('pvp:error');
      clearInterval(heartbeatInterval);
    };
  }, [user, setBattleMode, setBattlePhase]);

  const handleChallenge = (playerId: number) => {
    setSentChallenges(prev => [...prev, playerId]);
    socketService.emit('pvp:send_challenge', { challengedId: playerId });
    playSfx('CLICK');
  };

  const handleAcceptChallenge = (challengeId: number) => {
    socketService.emit('pvp:accept_challenge', { challengeId });
    setIncomingChallenges(prev => prev.filter(c => c.id !== challengeId));
    playSfx('CLICK');
  };

  const handleDeclineChallenge = (challengeId: number) => {
    socketService.emit('pvp:decline_challenge', { challengeId });
    setIncomingChallenges(prev => prev.filter(c => c.id !== challengeId));
    playSfx('CLICK');
  };

  const handleBack = () => {
    setBattlePhase('NONE');
    playSfx('CLICK');
  };

  const handleRefresh = () => {
    setLoading(true);
    socketService.emit('pvp:get_players');
    playSfx('CLICK');
  };

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-purple-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-purple-500/30">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            ⚔️ LOBBY PVP
          </h1>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-bold active:scale-95"
            >
              🔄
            </button>
            <button
              onClick={handleBack}
              className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-sm font-bold active:scale-95"
            >
              ← Retour
            </button>
          </div>
        </div>
      </div>

      {/* Challenges */}
      <AnimatePresence>
        {incomingChallenges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="m-4 bg-gradient-to-r from-yellow-900/40 to-orange-900/40 border-2 border-yellow-500/50 rounded-xl p-4"
          >
            <h2 className="text-lg font-display font-bold text-yellow-400 mb-3 flex items-center gap-2">
              <span className="text-xl animate-pulse">⚡</span>
              DÉFIS REÇUS ({incomingChallenges.length})
            </h2>
            <div className="space-y-2">
              {incomingChallenges.map(challenge => (
                <div key={challenge.id} className="bg-slate-800/60 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold">{challenge.challengerName}</p>
                    <p className="text-slate-400 text-xs">t'a défié !</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptChallenge(challenge.id)}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-bold active:scale-95"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => handleDeclineChallenge(challenge.id)}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-bold active:scale-95"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="px-4 py-2">
        <div className="bg-slate-900/50 rounded-xl p-3 flex items-center justify-center gap-6">
          <div className="text-center">
            <div className="text-2xl font-display font-black text-purple-400">{onlinePlayers.length}</div>
            <div className="text-slate-400 text-xs">en ligne</div>
          </div>
          <div className="w-px h-8 bg-slate-700" />
          <div className="text-center">
            <div className="text-2xl font-display font-black text-green-400">
              {onlinePlayers.filter(p => p.status === 'available').length}
            </div>
            <div className="text-slate-400 text-xs">dispo</div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-sm text-center">
          {error}
        </div>
      )}

      {/* Players List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : onlinePlayers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">😴</div>
            <p className="text-slate-400">Aucun joueur en ligne</p>
            <p className="text-slate-500 text-sm">Reviens plus tard !</p>
          </div>
        ) : (
          <div className="space-y-3">
            {onlinePlayers.map(player => {
              const isChallenged = sentChallenges.includes(player.id);
              const isUnavailable = player.status !== 'available';

              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`bg-slate-800/60 rounded-xl p-4 border-2 ${
                    isUnavailable
                      ? 'border-slate-700 opacity-50'
                      : isChallenged
                        ? 'border-yellow-500/50 bg-yellow-900/20'
                        : 'border-purple-500/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
                        {player.avatarPokemonId ? (
                          <img
                            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${player.avatarPokemonId}.png`}
                            className="w-full h-full object-contain"
                            alt="Avatar"
                          />
                        ) : (
                          <span className="text-2xl">👤</span>
                        )}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-800 ${
                        player.status === 'available' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold truncate">{player.username}</h3>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-1.5 py-0.5 bg-purple-500/20 rounded text-purple-400 font-mono">
                          {player.gradeLevel || '?'}
                        </span>
                        <span className="text-slate-400">
                          {player.status === 'in_battle' ? '⚔️ Combat' : '✓ Dispo'}
                        </span>
                      </div>
                    </div>

                    {/* Action */}
                    {isChallenged ? (
                      <div className="px-3 py-1.5 bg-yellow-600/50 text-yellow-300 rounded-lg text-xs font-bold">
                        ⏳ Envoyé
                      </div>
                    ) : isUnavailable ? (
                      <div className="px-3 py-1.5 bg-slate-700 text-slate-500 rounded-lg text-xs font-bold">
                        Occupé
                      </div>
                    ) : (
                      <button
                        onClick={() => handleChallenge(player.id)}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg text-sm active:scale-95 shadow-lg"
                      >
                        ⚔️ Défier
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
