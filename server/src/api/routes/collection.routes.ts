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
        current_xp: p.currentXp,
        next_level_xp: p.nextLevelXp,
        stats: p.stats || { atk: 0, def: 0, spe: 0 },
        nickname: p.nickname,
        is_team: p.isTeam || false,
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
        current_xp: p.currentXp,
        next_level_xp: p.nextLevelXp,
        stats: p.stats || { atk: 0, def: 0, spe: 0 },
        nickname: p.nickname,
        is_team: p.isTeam || false,
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

    // Vérifier que le Pokémon n'est pas déjà au niveau max
    const targetPokemon = await prisma.userPokemon.findUnique({ where: { id: pokemonId } });
    if (targetPokemon && targetPokemon.level >= 100) {
      return res.status(400).json({ success: false, message: 'Ce Pokémon est déjà au niveau maximum !' });
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

// POST /api/collection/unfeed - Reprendre 100 XP d'un Pokémon (annuler un don d'XP)
collectionRouter.post('/unfeed', async (req: AuthRequest, res: Response) => {
  try {
    const { pokemonId, xpAmount = 100 } = req.body;
    if (!pokemonId) {
      return res.status(400).json({ success: false, message: 'pokemonId requis' });
    }

    const pokemon = await prisma.userPokemon.findUnique({ where: { id: pokemonId } });
    if (!pokemon) {
      return res.status(404).json({ success: false, message: 'Pokémon introuvable' });
    }

    // Cannot unfeed if pokemon has 0 xp and is level 1
    if (pokemon.level === 1 && pokemon.currentXp < xpAmount) {
      return res.status(400).json({ success: false, message: 'Ce Pokémon n\'a pas assez d\'XP à retirer' });
    }

    // Calculate new XP/level going backwards
    let newXp = pokemon.currentXp - xpAmount;
    let newLevel = pokemon.level;

    // Handle level down: if XP goes negative, go back levels
    while (newXp < 0 && newLevel > 1) {
      newLevel--;
      const xpForThisLevel = newLevel * 100;
      newXp += xpForThisLevel;
    }
    // Clamp to minimum
    if (newLevel <= 1 && newXp < 0) {
      newXp = 0;
      newLevel = 1;
    }

    const { calculateMaxHp } = await import('../../services/pokemon.service.js');
    const newMaxHp = calculateMaxHp(newLevel, pokemon.tyradexId);

    await prisma.userPokemon.update({
      where: { id: pokemonId },
      data: {
        currentXp: newXp,
        level: newLevel,
        currentHp: Math.min(pokemon.currentHp, newMaxHp),
      },
    });

    // Refund XP to user
    await prisma.user.update({
      where: { id: req.userId! },
      data: { globalXp: { increment: xpAmount } },
    });

    res.json({
      success: true,
      message: `${xpAmount} XP récupérées. Niveau ${newLevel}`,
      newLevel,
    });
  } catch (error) {
    console.error('Error unfeeding pokemon:', error);
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
