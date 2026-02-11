import { Router, type IRouter, type Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware.js';
import * as inventoryService from '../../services/inventory.service.js';
import { displayNameForItem, categoryForItem } from '../../services/itemDisplay.service.js';
import { getShopPokemons, getShopPokemonsForUser, buyPokemon, sellPokemon } from '../../services/shop.service.js';
import { prisma } from '../../config/database.js';

export const shopRouter: IRouter = Router();

// GET /api/shop/pokemons - Liste des Pokémon à vendre
shopRouter.get('/pokemons', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const pokemons = await getShopPokemonsForUser(req.userId!);
    res.json({ success: true, data: pokemons });
  } catch (error) {
    console.error('Error getting shop pokemons:', error);
    // Fallback sans authentification
    const pokemons = getShopPokemons();
    res.json({ success: true, data: pokemons });
  }
});

// POST /api/shop/buy-pokemon - Acheter un Pokémon
shopRouter.post('/buy-pokemon', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { pokemon_id, price } = req.body;
    // Extraire le pokedexId depuis l'ID (format: shop-{pokedexId}-{timestamp})
    const pokedexId = parseInt(pokemon_id?.split('-')[1] || '0');
    if (!pokedexId || !price) {
      return res.status(400).json({ success: false, message: 'pokemon_id et price requis' });
    }
    
    const result = await buyPokemon(req.userId!, pokedexId, price);
    res.json(result);
  } catch (error) {
    console.error('Error buying pokemon:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/shop/sell-pokemon - Vendre un Pokémon
shopRouter.post('/sell-pokemon', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { pokemon_id } = req.body;
    if (!pokemon_id) {
      return res.status(400).json({ success: false, message: 'pokemon_id requis' });
    }
    
    const result = await sellPokemon(req.userId!, pokemon_id);
    res.json(result);
  } catch (error) {
    console.error('Error selling pokemon:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/shop/items - Liste des items en vente (requires auth to show stock)
shopRouter.get('/items', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const items = await inventoryService.getShopItems();
    // compute user's stock for each item
    const userId = req.userId as number | undefined;
    let stockMap: Record<string, number> = {};
    if (userId) {
      const inv = await prisma.inventory.findMany({ where: { userId, quantity: { gt: 0 } } });
      inv.forEach(i => { stockMap[i.itemId] = i.quantity; });
    }

    const displayName = (item: any) => displayNameForItem(item);

    res.json({ 
      success: true, 
      data: items.map(item => ({
        id: item.id,
        name: displayName(item),
        description: item.description,
        price: item.price,
        effect_type: item.effectType,
        value: item.value,
        rarity: item.rarity,
        image: item.image,
        stock: stockMap[item.id] || 0,
        category: categoryForItem(item),
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

// POST /api/shop/buy - Acheter un item (legacy)
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
      newTokens: result.newTokens,
    });
  } catch (error) {
    console.error('Error buying item:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/shop/buy-item - Acheter un item (nouveau format)
shopRouter.post('/buy-item', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { item_id, quantity } = req.body;
    if (!item_id) {
      return res.status(400).json({ success: false, message: 'item_id requis' });
    }
    
    const result = await inventoryService.buyItem(req.userId!, item_id, quantity || 1);
    res.json({
      success: result.success,
      message: result.message,
      new_gold: result.newGold,
      newTokens: result.newTokens,
    });
  } catch (error) {
    console.error('Error buying item:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/shop/sell-item - Vendre un item
shopRouter.post('/sell-item', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { item_id, quantity } = req.body;
    if (!item_id) {
      return res.status(400).json({ success: false, message: 'item_id requis' });
    }
    
    const result = await inventoryService.sellItem(req.userId!, item_id, quantity || 1);
    res.json({
      success: result.success,
      message: result.message,
      new_gold: result.newGold,
    });
  } catch (error) {
    console.error('Error selling item:', error);
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
      evolution: result.evolution || false,
      sequence: result.sequence || undefined,
    });
  } catch (error) {
    console.error('Error using item:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});
