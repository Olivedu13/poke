import { Router, type IRouter, type Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware.js';
import * as BattleService from '../../services/battle.service.js';
import { prisma } from '../../config/database.js';

export const battleRouter: IRouter = Router();

// Démarrer un combat PvE
battleRouter.post('/start', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { pokemonId, wildLevel } = req.body;

    if (!pokemonId) {
      return res.status(400).json({ success: false, message: 'Pokemon ID required' });
    }

    const battleState = await BattleService.startBattle(userId, pokemonId, wildLevel);
    
    res.json({
      success: true,
      battle: {
        sessionId: battleState.sessionId,
        userPokemon: battleState.userPokemon,
        enemyPokemon: battleState.enemyPokemon,
        currentQuestion: battleState.currentQuestion,
        turn: battleState.turn,
        phase: battleState.phase,
        log: battleState.log
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start battle';
    res.status(400).json({ success: false, message });
  }
});

// Obtenir l'état actuel du combat
battleRouter.get('/state/:sessionId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const battle = BattleService.getBattleState(sessionId);

    if (!battle) {
      return res.status(404).json({ success: false, message: 'Battle not found' });
    }

    if (battle.userId !== req.userId) {
      return res.status(403).json({ success: false, message: 'Not your battle' });
    }

    res.json({
      success: true,
      battle: {
        sessionId: battle.sessionId,
        userPokemon: battle.userPokemon,
        enemyPokemon: battle.enemyPokemon,
        currentQuestion: battle.currentQuestion,
        turn: battle.turn,
        phase: battle.phase,
        log: battle.log
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get battle state';
    res.status(400).json({ success: false, message });
  }
});

// Soumettre une réponse
battleRouter.post('/answer', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId, answerId } = req.body;

    if (!sessionId || answerId === undefined) {
      return res.status(400).json({ success: false, message: 'Session ID and answer ID required' });
    }

    const battle = BattleService.getBattleState(sessionId);
    if (!battle || battle.userId !== req.userId) {
      return res.status(403).json({ success: false, message: 'Invalid battle session' });
    }

    const { battleState, result } = await BattleService.submitAnswer(sessionId, answerId);

    res.json({
      success: true,
      result,
      battle: {
        sessionId: battleState.sessionId,
        userPokemon: battleState.userPokemon,
        enemyPokemon: battleState.enemyPokemon,
        currentQuestion: battleState.currentQuestion,
        turn: battleState.turn,
        phase: battleState.phase,
        log: battleState.log
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit answer';
    res.status(400).json({ success: false, message });
  }
});

// Utiliser un item en combat
battleRouter.post('/use-item', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId, itemId } = req.body;

    if (!sessionId || !itemId) {
      return res.status(400).json({ success: false, message: 'Session ID and item ID required' });
    }

    const battle = BattleService.getBattleState(sessionId);
    if (!battle || battle.userId !== req.userId) {
      return res.status(403).json({ success: false, message: 'Invalid battle session' });
    }

    const { battleState, effect } = await BattleService.useItemInBattle(sessionId, itemId);

    res.json({
      success: true,
      effect,
      battle: {
        sessionId: battleState.sessionId,
        userPokemon: battleState.userPokemon,
        enemyPokemon: battleState.enemyPokemon,
        currentQuestion: battleState.currentQuestion,
        turn: battleState.turn,
        phase: battleState.phase,
        log: battleState.log
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to use item';
    res.status(400).json({ success: false, message });
  }
});

// Réclamer les récompenses de combat (XP, or, loot)
battleRouter.post('/rewards', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { xp, gold, tokens, item_drop } = req.body;

    const safeXp = Math.max(0, Math.floor(Number(xp) || 0));
    const safeGold = Math.max(0, Math.floor(Number(gold) || 0));
    const safeTokens = Math.max(0, Math.floor(Number(tokens) || 0));

    // Update user XP, gold, tokens, and streak
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        globalXp: { increment: safeXp },
        gold: { increment: safeGold },
        tokens: { increment: safeTokens },
        streak: { increment: 1 },
      },
    });

    // If loot item, add to inventory
    if (item_drop && typeof item_drop === 'string') {
      const itemExists = await prisma.item.findUnique({ where: { id: item_drop } });
      if (itemExists) {
        await prisma.inventory.upsert({
          where: { userId_itemId: { userId, itemId: item_drop } },
          update: { quantity: { increment: 1 } },
          create: { userId, itemId: item_drop, quantity: 1 },
        });
      }
    }

    res.json({
      success: true,
      data: {
        gold: updatedUser.gold,
        globalXp: updatedUser.globalXp,
        tokens: updatedUser.tokens,
        streak: updatedUser.streak,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to claim rewards';
    res.status(400).json({ success: false, message });
  }
});

// Fuir le combat
battleRouter.post('/flee', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID required' });
    }

    const battle = BattleService.getBattleState(sessionId);
    if (!battle || battle.userId !== req.userId) {
      return res.status(403).json({ success: false, message: 'Invalid battle session' });
    }

    const result = await BattleService.fleeBattle(sessionId);

    if (result.escaped) {
      res.json({
        success: true,
        escaped: true,
        message: 'Vous avez fui le combat!'
      });
    } else {
      const updatedBattle = BattleService.getBattleState(sessionId);
      res.json({
        success: true,
        escaped: false,
        message: 'Fuite échouée!',
        battle: updatedBattle ? {
          sessionId: updatedBattle.sessionId,
          userPokemon: updatedBattle.userPokemon,
          enemyPokemon: updatedBattle.enemyPokemon,
          turn: updatedBattle.turn,
          phase: updatedBattle.phase,
          log: updatedBattle.log
        } : null
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to flee';
    res.status(400).json({ success: false, message });
  }
});
