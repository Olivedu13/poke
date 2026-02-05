import { Router, type IRouter } from 'express';
import bcrypt from 'bcryptjs';
import { GradeLevelType, type Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';

export const authRouter: IRouter = Router();

authRouter.post('/register', async (req, res) => {
  try {
    const { username, password, gradeLevel } = req.body as {
      username?: string;
      password?: string;
      gradeLevel?: GradeLevelType;
    };
    
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }
    
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    const defaultSubjects: Prisma.JsonValue = ['MATHS', 'FRANCAIS'];
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        gradeLevel: gradeLevel ?? GradeLevelType.CE1,
        activeSubjects: defaultSubjects,
        gold: 10000, // 1000 pièces de départ
        tokens: 15, // 15 tokens de départ
      }
    });
    
    // Créer 3 Pokémon starters (Bulbizarre, Salamèche, Carapuce)
    const starters = [
      { id: 1, name: 'Bulbizarre' },
      { id: 4, name: 'Salamèche' },
      { id: 7, name: 'Carapuce' },
    ];
    
    for (let i = 0; i < starters.length; i++) {
      const starter = starters[i];
      await prisma.userPokemon.create({
        data: {
          id: `starter-${user.id}-${Date.now()}-${i}`,
          userId: user.id,
          tyradexId: starter.id,
          level: 5,
          nickname: starter.name,
          currentHp: 50,
          currentXp: 0,
          isTeam: true, // Les 3 dans l'équipe
        },
      });
    }
    
    // Donner des items de départ
    const starterItems = ['heal_r1', 'pokeball'];
    for (const itemId of starterItems) {
      await prisma.inventory.upsert({
        where: { userId_itemId: { userId: user.id, itemId } },
        update: { quantity: { increment: 5 } },
        create: { userId: user.id, itemId, quantity: 5 },
      });
    }
    
    const token = generateToken(user.id, user.username);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        gradeLevel: user.gradeLevel,
        gold: user.gold,
        tokens: user.tokens
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }
    
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    const token = generateToken(user.id, user.username);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        gradeLevel: user.gradeLevel,
        gold: user.gold,
        tokens: user.tokens,
        globalXp: user.globalXp
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// Verify token and return user data
authRouter.get('/verify', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        gradeLevel: user.gradeLevel,
        gold: user.gold,
        tokens: user.tokens,
        globalXp: user.globalXp
      }
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});
