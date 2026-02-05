import { Router, type IRouter, type Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../../config/database.js';

export const adminRouter: IRouter = Router();

// Code secret admin (à changer en production !)
const ADMIN_SECRET = 'poke_admin_2024';

// Middleware admin - vérifie le code secret
const adminMiddleware = (req: AuthRequest, res: Response, next: () => void) => {
  const adminCode = req.headers['x-admin-code'] || req.body?.admin_code;
  if (adminCode !== ADMIN_SECRET) {
    return res.status(403).json({ success: false, message: 'Accès non autorisé' });
  }
  next();
};

// GET /api/admin/users - Liste tous les utilisateurs
adminRouter.get('/users', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        gradeLevel: true,
        gold: true,
        tokens: true,
        globalXp: true,
        streak: true,
        createdAt: true,
        _count: {
          select: { userPokemon: true, inventories: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: users.map((u) => ({
        id: u.id,
        username: u.username,
        grade_level: u.gradeLevel,
        gold: u.gold,
        tokens: u.tokens,
        global_xp: u.globalXp,
        streak: u.streak,
        created_at: u.createdAt,
        pokemon_count: u._count.userPokemon,
        inventory_count: u._count.inventories,
      })),
    });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/admin/user/:id - Détails d'un utilisateur
adminRouter.get('/user/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userPokemon: true,
        inventories: { include: { item: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        grade_level: user.gradeLevel,
        gold: user.gold,
        tokens: user.tokens,
        global_xp: user.globalXp,
        streak: user.streak,
        active_subjects: user.activeSubjects,
        custom_prompt_active: user.customPromptActive,
        custom_prompt_text: user.customPromptText,
        pokemons: user.userPokemon.map((p: any) => ({
          id: p.id,
          tyradex_id: p.tyradexId,
          nickname: p.nickname,
          level: p.level,
          current_hp: p.currentHp,
          is_team: p.isTeam,
        })),
        inventory: user.inventories.map((inv: any) => ({
          item_id: inv.item.id,
          item_name: inv.item.name,
          quantity: inv.quantity,
        })),
      },
    });
  } catch (error) {
    console.error('Admin get user error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/admin/user/:id - Modifier un utilisateur
adminRouter.put('/user/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { gold, tokens, global_xp, grade_level } = req.body;

    const updateData: any = {};
    if (gold !== undefined) updateData.gold = gold;
    if (tokens !== undefined) updateData.tokens = tokens;
    if (global_xp !== undefined) updateData.globalXp = global_xp;
    if (grade_level !== undefined) updateData.gradeLevel = grade_level;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    res.json({
      success: true,
      message: 'Utilisateur modifié',
      data: {
        id: user.id,
        username: user.username,
        gold: user.gold,
        tokens: user.tokens,
        global_xp: user.globalXp,
        grade_level: user.gradeLevel,
      },
    });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/admin/user/:id/add-pokemon - Ajouter un Pokémon à un utilisateur
adminRouter.post('/user/:id/add-pokemon', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { tyradex_id, level, nickname } = req.body;

    if (!tyradex_id) {
      return res.status(400).json({ success: false, message: 'tyradex_id requis' });
    }

    const baseHp = 30 + (tyradex_id % 30) + (level || 5) * 5;

    await prisma.userPokemon.create({
      data: {
        id: `admin_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        userId,
        tyradexId: tyradex_id,
        nickname: nickname || null,
        level: level || 5,
        currentHp: baseHp,
        currentXp: 0,
        isTeam: false,
      },
    });

    res.json({ success: true, message: 'Pokémon ajouté' });
  } catch (error) {
    console.error('Admin add pokemon error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/admin/user/:id/add-item - Ajouter un item à un utilisateur
adminRouter.post('/user/:id/add-item', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { item_id, quantity } = req.body;

    if (!item_id) {
      return res.status(400).json({ success: false, message: 'item_id requis' });
    }

    await prisma.inventory.upsert({
      where: { userId_itemId: { userId, itemId: item_id } },
      update: { quantity: { increment: quantity || 1 } },
      create: { userId, itemId: item_id, quantity: quantity || 1 },
    });

    res.json({ success: true, message: 'Item ajouté' });
  } catch (error) {
    console.error('Admin add item error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/admin/items - Liste tous les items disponibles
adminRouter.get('/items', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const items = await prisma.item.findMany({
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: items.map((i) => ({
        id: i.id,
        name: i.name,
        effect_type: i.effectType,
        price: i.price,
      })),
    });
  } catch (error) {
    console.error('Admin get items error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// DELETE /api/admin/user/:userId/pokemon/:pokemonId - Supprimer un Pokémon
adminRouter.delete('/user/:userId/pokemon/:pokemonId', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const pokemonId = req.params.pokemonId;

    await prisma.userPokemon.deleteMany({
      where: { id: pokemonId, userId },
    });

    res.json({ success: true, message: 'Pokémon supprimé' });
  } catch (error) {
    console.error('Admin delete pokemon error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});
