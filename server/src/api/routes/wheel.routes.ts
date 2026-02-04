import { Router, type IRouter, type Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware.js';
import * as WheelService from '../../services/wheel.service.js';

export const wheelRouter: IRouter = Router();

// Obtenir la configuration de la roue
wheelRouter.get('/config', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const config = WheelService.getWheelConfig();
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

// Faire tourner la roue
wheelRouter.post('/spin', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { usePaidSpin } = req.body;
    
    const result = await WheelService.spin(userId, usePaidSpin === true);
    
    res.json({
      success: true,
      prize: result.prize,
      reward: result.reward
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to spin';
    res.status(400).json({ success: false, message });
  }
});
