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
