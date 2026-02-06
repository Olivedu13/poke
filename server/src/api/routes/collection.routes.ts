import { Router, type IRouter, type Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware.js';
import * as pokemonService from '../../services/pokemon.service.js';
import { prisma } from '../../config/database.js';

export const collectionRouter: IRouter = Router();

// Middleware d'authentification
collectionRouter.use(authMiddleware);

// GET /api/collection - Récupère toute la collection
collectionRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const collection = await pokemonService.getUserCollection(req.userId!);
    res.json({ 
      success: true, 
      data: collection.map(p => ({
        id: p.id,
        tyradex_id: p.tyradexId,
        level: p.level,
        name: p.name,
        sprite_url: p.spriteUrl,
        current_hp: p.currentHp,
        max_hp: p.maxHp,
        nickname: p.nickname,
      })),
    });
  } catch (error) {
    console.error('Error getting collection:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/collection/team - Récupère l'équipe active
collectionRouter.get('/team', async (req: AuthRequest, res: Response) => {
  try {
    const team = await pokemonService.getUserTeam(req.userId!);
    res.json({ 
      success: true, 
      data: team.map(p => ({
        id: p.id,
        tyradex_id: p.tyradexId,
        level: p.level,
        name: p.name,
        sprite_url: p.spriteUrl,
        current_hp: p.currentHp,
        max_hp: p.maxHp,
        nickname: p.nickname,
      })),
    });
  } catch (error) {
    console.error('Error getting team:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/collection/toggle-team - Ajouter/retirer un Pokémon de l'équipe
collectionRouter.post('/toggle-team', async (req: AuthRequest, res: Response) => {
  try {
    const { pokemonId } = req.body;
    if (!pokemonId) {
      return res.status(400).json({ success: false, message: 'pokemonId requis' });
    }
    
    const pokemon = await prisma.userPokemon.findFirst({
      where: { id: pokemonId, userId: req.userId! },
    });
    
    if (!pokemon) {
      return res.status(404).json({ success: false, message: 'Pokémon non trouvé' });
    }
    
    // Vérifier la limite de 3 Pokémon dans l'équipe
    if (!pokemon.isTeam) {
      const teamCount = await prisma.userPokemon.count({
        where: { userId: req.userId!, isTeam: true },
      });
      if (teamCount >= 3) {
        return res.status(400).json({ success: false, message: 'Équipe complète (max 3)' });
      }
    }
    
    await prisma.userPokemon.update({
      where: { id: pokemonId },
      data: { isTeam: !pokemon.isTeam },
    });
    
    res.json({ 
      success: true, 
      message: pokemon.isTeam ? 'Pokémon retiré de l\'équipe' : 'Pokémon ajouté à l\'équipe',
      is_team: !pokemon.isTeam,
    });
  } catch (error) {
    console.error('Error toggling team:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/collection/feed - Donner de l'XP à un Pokémon
collectionRouter.post('/feed', async (req: AuthRequest, res: Response) => {
  try {
    const { pokemonId, xpAmount = 100 } = req.body;
    if (!pokemonId) {
      return res.status(400).json({ success: false, message: 'pokemonId requis' });
    }
    
    // Vérifier que l'utilisateur a assez de XP
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user || (user.globalXp || 0) < xpAmount) {
      return res.status(400).json({ success: false, message: 'XP insuffisante' });
    }
    
    // Transférer l'XP
    const result = await pokemonService.addPokemonXp(pokemonId, xpAmount);
    await prisma.user.update({
      where: { id: req.userId! },
      data: { globalXp: { decrement: xpAmount } },
    });
    res.json({ 
      success: true, 
      message: result.leveledUp ? `Level up ! Niveau ${result.newLevel}` : 'XP ajoutée',
      leveledUp: result.leveledUp,
      newLevel: result.newLevel,
      evolution: result.evolution,
      sequence: result.sequence,
    });
  } catch (error) {
    console.error('Error feeding pokemon:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/collection/capture - Capturer un Pokémon sauvage
collectionRouter.post('/capture', async (req: AuthRequest, res: Response) => {
  try {
    const { tyradexId, level, name } = req.body;
    if (!tyradexId) {
      return res.status(400).json({ success: false, message: 'tyradexId requis' });
    }
    
    const calculatedHp = 20 + (tyradexId % 30) + (level || 5) * 5;
    
    const newPokemon = await prisma.userPokemon.create({
      data: {
        id: `pokemon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: req.userId!,
        tyradexId: tyradexId,
        level: level || 5,
        nickname: name || null,
        currentHp: calculatedHp,
        currentXp: 0,
        isTeam: false,
      },
    });
    
    res.json({ 
      success: true, 
      message: `${name || 'Pokémon'} capturé !`,
      pokemon: newPokemon,
    });
  } catch (error) {
    console.error('Error capturing pokemon:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/collection/heal-all - Soigner tous les Pokémon
collectionRouter.post('/heal-all', async (req: AuthRequest, res: Response) => {
  try {
    await pokemonService.healAllPokemon(req.userId!);
    res.json({ success: true, message: 'Tous les Pokémon sont soignés' });
  } catch (error) {
    console.error('Error healing pokemon:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/collection/nickname - Renommer un Pokémon
collectionRouter.post('/nickname', async (req: AuthRequest, res: Response) => {
  try {
    const { pokemonId, nickname } = req.body;
    if (!pokemonId) {
      return res.status(400).json({ success: false, message: 'pokemonId requis' });
    }
    
    await prisma.userPokemon.updateMany({
      where: { id: pokemonId, userId: req.userId! },
      data: { nickname: nickname || null },
    });
    
    res.json({ success: true, message: 'Surnom mis à jour' });
  } catch (error) {
    console.error('Error renaming pokemon:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});
