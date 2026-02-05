import { Router, type IRouter, type Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware.js';
import * as inventoryService from '../../services/inventory.service.js';

export const shopRouter: IRouter = Router();

// GET /api/shop/items - Liste des items en vente
shopRouter.get('/items', async (req, res) => {
  try {
    const items = await inventoryService.getShopItems();
    res.json({ 
      success: true, 
      data: items.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        effect_type: item.effectType,
        value: item.value,
        rarity: item.rarity,
        image: item.image,
      })),
    });
  } catch (error) {
    console.error('Error getting shop items:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/shop/inventory - Inventaire du joueur
shopRouter.get('/inventory', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const inventory = await inventoryService.getUserInventory(req.userId!);
    res.json({ 
      success: true, 
      data: inventory.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        effect_type: item.effectType,
        value: item.value,
        quantity: item.quantity,
        price: item.price,
        rarity: item.rarity,
        image: item.image,
      })),
    });
  } catch (error) {
    console.error('Error getting inventory:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/shop/buy - Acheter un item
shopRouter.post('/buy', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { itemId, quantity } = req.body;
    if (!itemId) {
      return res.status(400).json({ success: false, message: 'itemId requis' });
    }
    
    const result = await inventoryService.buyItem(req.userId!, itemId, quantity || 1);
    res.json({
      success: result.success,
      message: result.message,
      new_gold: result.newGold,
    });
  } catch (error) {
    console.error('Error buying item:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/shop/use - Utiliser un item (hors combat)
shopRouter.post('/use', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { itemId } = req.body;
    if (!itemId) {
      return res.status(400).json({ success: false, message: 'itemId requis' });
    }
    
    const result = await inventoryService.useItem(req.userId!, itemId);
    res.json({
      success: result.success,
      effect: result.effect,
      message: result.message,
    });
  } catch (error) {
    console.error('Error using item:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/shop/use-item - Utiliser un item (en combat)
shopRouter.post('/use-item', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { itemId, pokemonId } = req.body;
    if (!itemId) {
      return res.status(400).json({ success: false, message: 'itemId requis' });
    }
    
    const result = await inventoryService.useItem(req.userId!, itemId, pokemonId);
    res.json({
      success: result.success,
      effect: result.effect,
      message: result.message,
    });
  } catch (error) {
    console.error('Error using item:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});
