import { Router, type IRouter } from 'express';
import bcrypt from 'bcrypt';
import { GradeLevelType, type Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { generateToken } from '../middleware/auth.middleware.js';

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
        activeSubjects: defaultSubjects
      }
    });
    
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
