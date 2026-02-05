import { Server, Socket } from 'socket.io';
import { logger } from '../../config/logger.js';
import * as pvpService from '../../services/pvp.service.js';

// Types pour Socket.io
interface ServerToClientEvents {
  'pvp:lobby_players': (data: { players: any[] }) => void;
  'pvp:player_joined': (data: { id: number; username: string }) => void;
  'pvp:player_left': (data: { id: number }) => void;
  'pvp:challenge_sent': (data: { challengeId: number; challengerId: number; challengerName: string }) => void;
  'pvp:challenge_received': (data: { challengeId: number; challengerId: number; challengerName: string }) => void;
  'pvp:challenge_declined': (data: { challengeId: number }) => void;
  'pvp:challenges_list': (data: { challenges: any[] }) => void;
  'pvp:match_created': (data: { matchId: number; player1Id: number; player2Id: number }) => void;
  'pvp:match_state': (data: any) => void;
  'pvp:battle_initialized': (data: { matchId: number; isMyTurn: boolean }) => void;
  'pvp:answer_result': (data: any) => void;
  'pvp:item_used': (data: any) => void;
  'pvp:forfeit_result': (data: any) => void;
  'pvp:error': (data: { message: string }) => void;
}

interface ClientToServerEvents {
  'pvp:join_lobby': () => void;
  'pvp:leave_lobby': () => void;
  'pvp:heartbeat': () => void;
  'pvp:get_players': () => void;
  'pvp:send_challenge': (data: { challengedId: number }) => void;
  'pvp:get_challenges': () => void;
  'pvp:accept_challenge': (data: { challengeId: number }) => void;
  'pvp:decline_challenge': (data: { challengeId: number }) => void;
  'pvp:join_match': (data: { matchId: number }) => void;
  'pvp:init_battle': (data: { matchId: number }) => void;
  'pvp:get_state': (data: { matchId: number }) => void;
  'pvp:submit_answer': (data: { matchId: number; answerIndex: number }) => void;
  'pvp:use_item': (data: { matchId: number; itemId: string }) => void;
  'pvp:forfeit': (data: { matchId: number }) => void;
}

interface SocketData {
  userId: number;
  username: string;
}

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

// Map des connexions: matchId -> Set<socketId>
const matchRooms = new Map<number, Set<string>>();
// Map inverse: socketId -> matchId
const socketToMatch = new Map<string, number>();
// Map des utilisateurs connectés: userId -> socketId
const userSockets = new Map<number, string>();

export function registerPvpSocketHandlers(io: TypedServer, socket: TypedSocket): void {
  const userId = socket.data.userId;
  const username = socket.data.username;

  // Enregistrer la connexion
  userSockets.set(userId, socket.id);

  // ============ LOBBY ============

  socket.on('pvp:join_lobby', async () => {
    try {
      await pvpService.goOnline(userId);
      socket.join('pvp_lobby');
      
      const players = await pvpService.getOnlinePlayers(userId);
      socket.emit('pvp:lobby_players', { players });
      
      // Notifier les autres joueurs
      socket.to('pvp_lobby').emit('pvp:player_joined', { 
        id: userId, 
        username,
      });
      
      logger.info(`[PvP] ${username} joined lobby`);
    } catch (error) {
      logger.error('[PvP] Error joining lobby:', error);
      socket.emit('pvp:error', { message: 'Erreur lors de la connexion au lobby' });
    }
  });

  socket.on('pvp:leave_lobby', async () => {
    try {
      await pvpService.goOffline(userId);
      socket.leave('pvp_lobby');
      
      // Notifier les autres joueurs
      socket.to('pvp_lobby').emit('pvp:player_left', { id: userId });
      
      logger.info(`[PvP] ${username} left lobby`);
    } catch (error) {
      logger.error('[PvP] Error leaving lobby:', error);
    }
  });

  socket.on('pvp:heartbeat', async () => {
    try {
      await pvpService.heartbeat(userId);
    } catch (error) {
      // Ignorer les erreurs de heartbeat
    }
  });

  socket.on('pvp:get_players', async () => {
    try {
      const players = await pvpService.getOnlinePlayers(userId);
      socket.emit('pvp:lobby_players', { players });
    } catch (error) {
      logger.error('[PvP] Error getting players:', error);
    }
  });

  // ============ CHALLENGES ============

  socket.on('pvp:send_challenge', async ({ challengedId }) => {
    try {
      const result = await pvpService.sendChallenge(userId, challengedId);
      
      if (result.success && result.challengeId) {
        socket.emit('pvp:challenge_sent', {
          challengeId: result.challengeId,
          challengerId: userId,
          challengerName: username,
        });
        
        // Notifier le joueur défié
        const challengedSocketId = userSockets.get(challengedId);
        if (challengedSocketId) {
          io.to(challengedSocketId).emit('pvp:challenge_received', {
            challengeId: result.challengeId,
            challengerId: userId,
            challengerName: username,
          });
        }
        
        logger.info(`[PvP] ${username} sent challenge to player ${challengedId}`);
      } else {
        socket.emit('pvp:error', { message: result.message });
      }
    } catch (error) {
      logger.error('[PvP] Error sending challenge:', error);
      socket.emit('pvp:error', { message: 'Erreur lors de l\'envoi du défi' });
    }
  });

  socket.on('pvp:get_challenges', async () => {
    try {
      const challenges = await pvpService.getIncomingChallenges(userId);
      socket.emit('pvp:challenges_list', { challenges });
    } catch (error) {
      logger.error('[PvP] Error getting challenges:', error);
    }
  });

  socket.on('pvp:accept_challenge', async ({ challengeId }) => {
    try {
      const result = await pvpService.acceptChallenge(challengeId, userId);
      
      if (result.success && result.matchId) {
        const matchState = await pvpService.getMatchState(result.matchId, userId);
        
        // Notifier les deux joueurs
        const player1SocketId = userSockets.get(matchState.match!.player1Id);
        const player2SocketId = userSockets.get(matchState.match!.player2Id);
        
        const matchData = {
          matchId: result.matchId,
          player1Id: matchState.match!.player1Id,
          player2Id: matchState.match!.player2Id,
        };
        
        if (player1SocketId) {
          io.to(player1SocketId).emit('pvp:match_created', matchData);
        }
        if (player2SocketId) {
          io.to(player2SocketId).emit('pvp:match_created', matchData);
        }
        
        logger.info(`[PvP] Challenge ${challengeId} accepted, match ${result.matchId} created`);
      } else {
        socket.emit('pvp:error', { message: result.message });
      }
    } catch (error) {
      logger.error('[PvP] Error accepting challenge:', error);
      socket.emit('pvp:error', { message: 'Erreur lors de l\'acceptation du défi' });
    }
  });

  socket.on('pvp:decline_challenge', async ({ challengeId }) => {
    try {
      await pvpService.declineChallenge(challengeId, userId);
      socket.emit('pvp:challenge_declined', { challengeId });
    } catch (error) {
      logger.error('[PvP] Error declining challenge:', error);
    }
  });

  // ============ MATCH ============

  socket.on('pvp:join_match', async ({ matchId }) => {
    try {
      // Rejoindre la room du match
      socket.join(`match_${matchId}`);
      
      // Enregistrer dans les maps
      if (!matchRooms.has(matchId)) {
        matchRooms.set(matchId, new Set());
      }
      matchRooms.get(matchId)!.add(socket.id);
      socketToMatch.set(socket.id, matchId);
      
      // Envoyer l'état actuel
      const state = await pvpService.getMatchState(matchId, userId);
      socket.emit('pvp:match_state', state);
      
      logger.info(`[PvP] ${username} joined match ${matchId}`);
    } catch (error) {
      logger.error('[PvP] Error joining match:', error);
      socket.emit('pvp:error', { message: 'Erreur lors de la connexion au match' });
    }
  });

  socket.on('pvp:init_battle', async ({ matchId }) => {
    try {
      const result = await pvpService.initBattle(matchId, userId);
      
      if (result.success) {
        // Notifier tous les joueurs du match
        const state = await pvpService.getMatchState(matchId, userId);
        io.to(`match_${matchId}`).emit('pvp:match_state', state);
        
        logger.info(`[PvP] Battle initialized for match ${matchId}`);
      } else {
        socket.emit('pvp:error', { message: result.message });
      }
    } catch (error) {
      logger.error('[PvP] Error initializing battle:', error);
      socket.emit('pvp:error', { message: 'Erreur lors de l\'initialisation du combat' });
    }
  });

  socket.on('pvp:get_state', async ({ matchId }) => {
    try {
      const state = await pvpService.getMatchState(matchId, userId);
      socket.emit('pvp:match_state', state);
    } catch (error) {
      logger.error('[PvP] Error getting state:', error);
    }
  });

  socket.on('pvp:submit_answer', async ({ matchId, answerIndex }) => {
    try {
      const result = await pvpService.submitAnswer(matchId, userId, answerIndex);
      
      // Broadcast le résultat et le nouvel état à tous les joueurs du match
      const state = await pvpService.getMatchState(matchId, userId);
      
      io.to(`match_${matchId}`).emit('pvp:answer_result', {
        playerId: userId,
        playerName: username,
        ...result,
      });
      io.to(`match_${matchId}`).emit('pvp:match_state', state);
      
      logger.info(`[PvP] ${username} submitted answer in match ${matchId}: ${result.isCorrect ? 'correct' : 'wrong'}`);
    } catch (error) {
      logger.error('[PvP] Error submitting answer:', error);
      socket.emit('pvp:error', { message: 'Erreur lors de la soumission de la réponse' });
    }
  });

  socket.on('pvp:use_item', async ({ matchId, itemId }) => {
    try {
      const result = await pvpService.useItemInBattle(matchId, userId, itemId);
      
      // Broadcast à tous les joueurs du match
      const state = await pvpService.getMatchState(matchId, userId);
      
      io.to(`match_${matchId}`).emit('pvp:item_used', {
        playerId: userId,
        playerName: username,
        ...result,
      });
      io.to(`match_${matchId}`).emit('pvp:match_state', state);
      
      logger.info(`[PvP] ${username} used item in match ${matchId}`);
    } catch (error) {
      logger.error('[PvP] Error using item:', error);
      socket.emit('pvp:error', { message: 'Erreur lors de l\'utilisation de l\'item' });
    }
  });

  socket.on('pvp:forfeit', async ({ matchId }) => {
    try {
      const result = await pvpService.forfeitMatch(matchId, userId);
      
      // Broadcast à tous les joueurs du match
      io.to(`match_${matchId}`).emit('pvp:forfeit_result', {
        forfeiterId: userId,
        forfeiterName: username,
        ...result,
      });
      
      logger.info(`[PvP] ${username} forfeited match ${matchId}`);
    } catch (error) {
      logger.error('[PvP] Error forfeiting:', error);
      socket.emit('pvp:error', { message: 'Erreur lors de l\'abandon' });
    }
  });

  // ============ CLEANUP ============

  socket.on('disconnect', async () => {
    try {
      // Quitter le lobby
      await pvpService.goOffline(userId);
      socket.to('pvp_lobby').emit('pvp:player_left', { id: userId });
      
      // Forfait automatique si dans un match en cours
      const matchId = socketToMatch.get(socket.id);
      if (matchId) {
        try {
          const result = await pvpService.forfeitMatch(matchId, userId);
          io.to(`match_${matchId}`).emit('pvp:forfeit_result', {
            forfeiterId: userId,
            forfeiterName: username,
            disconnected: true,
            ...result,
          });
          logger.info(`[PvP] ${username} auto-forfeited match ${matchId} due to disconnect`);
        } catch (e) {
          // Le match était probablement déjà terminé
        }
        matchRooms.get(matchId)?.delete(socket.id);
        socketToMatch.delete(socket.id);
      }
      
      // Supprimer de la map des utilisateurs
      userSockets.delete(userId);
      
      logger.info(`[PvP] ${username} disconnected`);
    } catch (error) {
      logger.error('[PvP] Error on disconnect:', error);
    }
  });
}

// Helper pour obtenir le socket d'un utilisateur
export function getUserSocket(userId: number): string | undefined {
  return userSockets.get(userId);
}

// Helper pour broadcast à un match
export function broadcastToMatch(io: TypedServer, matchId: number, event: keyof ServerToClientEvents, data: any): void {
  io.to(`match_${matchId}`).emit(event, data);
}
