import { Router, type IRouter, type Request, type Response } from 'express';
import * as pvpService from '../../services/pvp.service.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware.js';

export const pvpRouter: IRouter = Router();

// Middleware d'authentification pour toutes les routes PvP
pvpRouter.use(authMiddleware);

// ============ LOBBY ============

// GET /api/pvp/lobby/players - Liste des joueurs en ligne
pvpRouter.get('/lobby/players', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    await pvpService.goOnline(userId);
    const players = await pvpService.getOnlinePlayers(userId);
    res.json({ success: true, players });
  } catch (error) {
    console.error('Error getting online players:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/pvp/lobby/heartbeat - Garder la connexion active
pvpRouter.post('/lobby/heartbeat', async (req: AuthRequest, res: Response) => {
  try {
    await pvpService.heartbeat(req.userId!);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/pvp/lobby/leave - Quitter le lobby
pvpRouter.post('/lobby/leave', async (req: AuthRequest, res: Response) => {
  try {
    await pvpService.goOffline(req.userId!);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ============ CHALLENGES ============

// POST /api/pvp/challenge/send - Envoyer un défi
pvpRouter.post('/challenge/send', async (req: AuthRequest, res: Response) => {
  try {
    const { challengedId } = req.body;
    if (!challengedId) {
      return res.status(400).json({ success: false, message: 'challengedId requis' });
    }
    
    const result = await pvpService.sendChallenge(req.userId!, challengedId);
    res.json(result);
  } catch (error) {
    console.error('Error sending challenge:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/pvp/challenge/incoming - Défis reçus
pvpRouter.get('/challenge/incoming', async (req: AuthRequest, res: Response) => {
  try {
    const challenges = await pvpService.getIncomingChallenges(req.userId!);
    res.json({ success: true, challenges });
  } catch (error) {
    console.error('Error getting challenges:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/pvp/challenge/accept - Accepter un défi
pvpRouter.post('/challenge/accept', async (req: AuthRequest, res: Response) => {
  try {
    const { challengeId } = req.body;
    if (!challengeId) {
      return res.status(400).json({ success: false, message: 'challengeId requis' });
    }
    
    const result = await pvpService.acceptChallenge(challengeId, req.userId!);
    res.json({
      success: result.success,
      match_id: result.matchId,
      player1_id: result.matchId ? (await pvpService.getMatchState(result.matchId, req.userId!)).match?.player1Id : undefined,
      player2_id: result.matchId ? (await pvpService.getMatchState(result.matchId, req.userId!)).match?.player2Id : undefined,
      message: result.message,
    });
  } catch (error) {
    console.error('Error accepting challenge:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/pvp/challenge/decline - Refuser un défi
pvpRouter.post('/challenge/decline', async (req: AuthRequest, res: Response) => {
  try {
    const { challengeId } = req.body;
    if (!challengeId) {
      return res.status(400).json({ success: false, message: 'challengeId requis' });
    }
    
    const result = await pvpService.declineChallenge(challengeId, req.userId!);
    res.json(result);
  } catch (error) {
    console.error('Error declining challenge:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/pvp/challenge/sent - Vérifier si un défi envoyé a été accepté
pvpRouter.get('/challenge/sent', async (req: AuthRequest, res: Response) => {
  try {
    const acceptedMatch = await pvpService.checkSentChallenges(req.userId!);
    res.json({ 
      success: true, 
      accepted_match: acceptedMatch ? {
        match_id: acceptedMatch.matchId,
        player1_id: acceptedMatch.player1Id,
        player2_id: acceptedMatch.player2Id,
      } : null,
    });
  } catch (error) {
    console.error('Error checking sent challenges:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ============ BATTLE ============

// POST /api/pvp/battle/init - Initialiser le combat
pvpRouter.post('/battle/init', async (req: AuthRequest, res: Response) => {
  try {
    const { matchId } = req.body;
    if (!matchId) {
      return res.status(400).json({ success: false, message: 'matchId requis' });
    }
    
    const result = await pvpService.initBattle(matchId, req.userId!);
    res.json({
      success: result.success,
      is_my_turn: result.isMyTurn,
      message: result.message,
    });
  } catch (error) {
    console.error('Error initializing battle:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/pvp/battle/state - État du match
pvpRouter.get('/battle/state', async (req: AuthRequest, res: Response) => {
  try {
    const matchId = parseInt(req.query.matchId as string);
    if (!matchId) {
      return res.status(400).json({ success: false, message: 'matchId requis' });
    }
    
    const state = await pvpService.getMatchState(matchId, req.userId!);
    
    if (!state.success) {
      return res.status(400).json(state);
    }
    
    // Formater la réponse pour correspondre au format PHP existant
    res.json({
      success: true,
      match: state.match ? {
        id: state.match.id,
        player1_id: state.match.player1Id,
        player2_id: state.match.player2Id,
        player1_name: state.match.player1Name,
        player2_name: state.match.player2Name,
        player1_team: state.match.player1Team,
        player2_team: state.match.player2Team,
        player1_team_hp: state.match.player1TeamHp,
        player2_team_hp: state.match.player2TeamHp,
        player1_active_pokemon: state.match.player1ActivePokemon,
        player2_active_pokemon: state.match.player2ActivePokemon,
        current_turn: state.match.currentTurnId,
        status: state.match.status,
        winner_id: state.match.winnerId,
        xp_reward: state.match.xpReward,
        turn_number: state.match.turnNumber,
      } : null,
      history: state.history?.map(t => ({
        id: t.id,
        turn_number: t.turnNumber,
        player_id: t.playerId,
        player_name: t.playerName,
        question_text: t.questionText,
        question_options: t.questionOptions,
        correct_index: t.correctIndex,
        answer_index: t.answerIndex,
        is_correct: t.isCorrect,
        damage_dealt: t.damageDealt,
        item_used: t.itemUsed,
        item_effect: t.itemEffect,
      })),
      current_question: state.currentQuestion ? {
        id: state.currentQuestion.id,
        question_text: state.currentQuestion.questionText,
        options: state.currentQuestion.options,
        correct_index: state.currentQuestion.correctIndex,
        difficulty: state.currentQuestion.difficulty,
      } : null,
      is_my_turn: state.isMyTurn,
      my_id: req.userId!,
      message: state.message,
    });
  } catch (error) {
    console.error('Error getting battle state:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/pvp/battle/answer - Soumettre une réponse
pvpRouter.post('/battle/answer', async (req: AuthRequest, res: Response) => {
  try {
    const { matchId, answerIndex } = req.body;
    if (matchId === undefined || answerIndex === undefined) {
      return res.status(400).json({ success: false, message: 'matchId et answerIndex requis' });
    }
    
    const result = await pvpService.submitAnswer(matchId, req.userId!, answerIndex);
    res.json({
      success: result.success,
      is_correct: result.isCorrect,
      damage_dealt: result.damageDealt,
      game_over: result.gameOver,
      winner_id: result.winnerId,
      next_turn: result.nextTurnId,
      message: result.message,
    });
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/pvp/battle/use-item - Utiliser un item
pvpRouter.post('/battle/use-item', async (req: AuthRequest, res: Response) => {
  try {
    const { matchId, itemId } = req.body;
    if (!matchId || !itemId) {
      return res.status(400).json({ success: false, message: 'matchId et itemId requis' });
    }
    
    const result = await pvpService.useItemInBattle(matchId, req.userId!, itemId);
    res.json({
      success: result.success,
      effect: result.effect,
      skip_turn: result.skipTurn,
      message: result.message,
    });
  } catch (error) {
    console.error('Error using item:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/pvp/battle/forfeit - Abandonner
pvpRouter.post('/battle/forfeit', async (req: AuthRequest, res: Response) => {
  try {
    const { matchId } = req.body;
    if (!matchId) {
      return res.status(400).json({ success: false, message: 'matchId requis' });
    }
    
    const result = await pvpService.forfeitMatch(matchId, req.userId!);
    res.json({
      success: result.success,
      winner_id: result.winnerId,
      message: result.message,
    });
  } catch (error) {
    console.error('Error forfeiting:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});
