import { Router, type IRouter, type Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware.js';
import * as WheelService from '../../services/wheel.service.js';
import { prisma } from '../../config/database.js';

export const wheelRouter: IRouter = Router();

// Obtenir la configuration de la roue
wheelRouter.get('/config', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const bet = parseInt(req.query.bet as string) || 1;
    const config = WheelService.getWheelConfig(bet);
    res.json({ success: true, config });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get wheel config';
    res.status(400).json({ success: false, message });
  }
});

// Vérifier si le joueur peut spinner
wheelRouter.get('/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const status = await WheelService.canSpin(userId);
    res.json({ success: true, ...status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get spin status';
    res.status(400).json({ success: false, message });
  }
});

// Faire tourner la roue avec système de paliers (1, 5, 10 tokens)
wheelRouter.post('/spin', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { bet = 1 } = req.body;
    
    // Valider le montant du bet
    const validBets = [1, 5, 10];
    if (!validBets.includes(bet)) {
      return res.status(400).json({ success: false, message: 'Mise invalide (1, 5 ou 10 tokens)' });
    }
    
    // Le service gère la vérification des tokens et la déduction
    const result = await WheelService.spin(userId, bet);
    
    res.json({
      success: true,
      result_index: result.result_index,
      segments: result.segments,
      prize: result.prize,
      reward: result.reward,
      new_gold: result.new_gold,
      new_xp: result.new_xp,
      new_tokens: result.new_tokens
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to spin';
    res.status(400).json({ success: false, message });
  }
});
