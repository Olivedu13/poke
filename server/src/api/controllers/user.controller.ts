import { Request, Response } from 'express';
import { getUserById } from '../../services/user.service.js';

type AuthenticatedRequest = Request & { user?: { id: number } };

export async function getUserProfile(req: AuthenticatedRequest, res: Response) {
  // TODO: Auth middleware to set req.userId
  const userId = req.user?.id || 1; // fallback for demo
  const user = await getUserById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
}
