import { Router, type IRouter, type Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware.js';
import * as WheelService from '../../services/wheel.service.js';
import { prisma } from '../../config/database.js';

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
    const { bet = 1 } = req.body;
    
    // Vérifier que l'utilisateur a assez de tokens
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user || (user.tokens || 0) < bet) {
      return res.status(400).json({ success: false, message: 'Pas assez de tokens' });
    }
    
    // Déduire les tokens
    await prisma.user.update({
      where: { id: userId },
      data: { tokens: { decrement: bet } }
    });
    
    const result = await WheelService.spin(userId, false);
    
    // Générer les segments pour le frontend
    const segments = [
      { type: 'GOLD', label: '50 Or', color: '#FFD700', value: 50 * bet, img: 'jetons.webp' },
      { type: 'GOLD', label: '100 Or', color: '#FFA500', value: 100 * bet, img: 'jetons.webp' },
      { type: 'ITEM', label: 'Potion', color: '#FF69B4', value: 'heal_r1', img: 'soin.webp' },
      { type: 'GOLD', label: '200 Or', color: '#FFD700', value: 200 * bet, img: 'jetons.webp' },
      { type: 'XP', label: '100 XP', color: '#9370DB', value: 100 * bet, img: 'xp.webp' },
      { type: 'ITEM', label: 'Pokéball', color: '#FF6347', value: 'pokeball', img: 'pokeball.webp' },
      { type: 'POKEMON', label: 'Pokémon!', color: '#32CD32', id: Math.floor(Math.random() * 151) + 1, img: '' },
      { type: 'NOTHING', label: 'Perdu', color: '#808080', value: 0, img: 'traitre.webp' },
    ];
    
    // Déterminer l'index du résultat
    let resultIndex = 7; // Default: perdu
    if (result.prize.type === 'tokens') {
      const tokenValue = result.prize.value as number;
      resultIndex = tokenValue >= 100 ? 1 : (tokenValue >= 50 ? 0 : 3);
      segments[resultIndex].value = tokenValue;
    } else if (result.prize.type === 'item') {
      resultIndex = result.prize.name.includes('Potion') ? 2 : 5;
    } else if (result.prize.type === 'pokemon') {
      resultIndex = 6;
      if (result.reward.pokemon) {
        segments[6].id = result.reward.pokemon.level; // Utiliser comme ID temporaire
        segments[6].label = result.reward.pokemon.name;
      }
    } else if (result.prize.type === 'nothing') {
      resultIndex = 7;
    }
    
    res.json({
      success: true,
      result_index: resultIndex,
      segments: segments,
      prize: result.prize,
      reward: result.reward
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to spin';
    res.status(400).json({ success: false, message });
  }
});
