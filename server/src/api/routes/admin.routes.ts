import { Router, type IRouter, type Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../../config/database.js';
import { getIO } from '../../socket/server.js';
import { getAdminCode, getSettings, updateSettings } from '../../config/settings.js';

export const adminRouter: IRouter = Router();

// Middleware admin - vérifie le code secret (dynamique depuis settings.json)
const adminMiddleware = (req: AuthRequest, res: Response, next: () => void) => {
  const adminCode = req.headers['x-admin-code'] || req.body?.admin_code;
  if (adminCode !== getAdminCode()) {
    return res.status(403).json({ success: false, message: 'Accès non autorisé' });
  }
  next();
};

// POST /api/admin/verify-parental - Vérifier le code parental (accessible à tout utilisateur connecté)
adminRouter.post('/verify-parental', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    const settings = getSettings();
    if (code === settings.parentalCode) {
      res.json({ success: true, message: 'Code parental vérifié' });
    } else {
      res.json({ success: false, message: 'Code incorrect' });
    }
  } catch (error) {
    console.error('Verify parental error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

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

    // Emit real-time update to user
    const io = getIO();
    if (io) {
      io.to(`user_${userId}`).emit('user:updated', {
        gold: user.gold,
        tokens: user.tokens,
        global_xp: user.globalXp,
        grade_level: user.gradeLevel,
      });
    }

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

// DELETE /api/admin/user/:id - Supprimer un utilisateur et toutes ses données
adminRouter.delete('/user/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    // Supprimer toutes les données liées à l'utilisateur (cascade gère la plupart)
    await prisma.$transaction([
      prisma.pvpTurn.deleteMany({ where: { playerId: userId } }),
      prisma.pvpMatch.deleteMany({ where: { OR: [{ player1Id: userId }, { player2Id: userId }] } }),
      prisma.pvpChallenge.deleteMany({ where: { OR: [{ challengerId: userId }, { challengedId: userId }] } }),
      prisma.onlinePlayer.deleteMany({ where: { userId } }),
      prisma.userPokemon.deleteMany({ where: { userId } }),
      prisma.inventory.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    res.json({ success: true, message: 'Utilisateur supprimé avec toutes ses données' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/admin/user/:id/reset-password - Réinitialiser le mot de passe
adminRouter.put('/user/:id/reset-password', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { password } = req.body;

    if (!password || password.length < 4) {
      return res.status(400).json({ success: false, message: 'Mot de passe requis (min 4 caractères)' });
    }

    // Import bcrypt dynamiquement
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    res.json({ success: true, message: 'Mot de passe réinitialisé' });
  } catch (error) {
    console.error('Admin reset password error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/admin/settings - Récupérer les paramètres (codes)
adminRouter.get('/settings', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const settings = getSettings();
    res.json({
      success: true,
      data: {
        admin_code: settings.adminCode,
        parental_code: settings.parentalCode,
      },
    });
  } catch (error) {
    console.error('Admin get settings error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/admin/settings - Modifier les paramètres (codes)
adminRouter.put('/settings', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { admin_code, parental_code } = req.body;
    const updates: Record<string, string> = {};

    if (admin_code !== undefined) {
      if (typeof admin_code !== 'string' || admin_code.length !== 4 || !/^\d{4}$/.test(admin_code)) {
        return res.status(400).json({ success: false, message: 'Le code admin doit être un code à 4 chiffres' });
      }
      updates.adminCode = admin_code;
    }

    if (parental_code !== undefined) {
      if (typeof parental_code !== 'string' || parental_code.length !== 4 || !/^\d{4}$/.test(parental_code)) {
        return res.status(400).json({ success: false, message: 'Le code parental doit être un code à 4 chiffres' });
      }
      updates.parentalCode = parental_code;
    }

    const updated = updateSettings(updates);
    res.json({
      success: true,
      message: 'Paramètres mis à jour',
      data: {
        admin_code: updated.adminCode,
        parental_code: updated.parentalCode,
      },
    });
  } catch (error) {
    console.error('Admin update settings error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});
