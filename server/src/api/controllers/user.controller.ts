import { Response } from 'express';
import { getUserById, updateUserConfig } from '../../services/user.service.js';
import { type AuthRequest } from '../middleware/auth.middleware.js';

export async function getUserProfile(req: AuthRequest, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Non authentifié' });
  const user = await getUserById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
}

export async function updateConfig(req: AuthRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Non authentifié' });
  }
  
  try {
    const { grade_level, active_subjects, focus_categories, custom_prompt_active, custom_prompt_text } = req.body;
    
    const updatedUser = await updateUserConfig(userId, {
      gradeLevel: grade_level,
      activeSubjects: active_subjects,
      focusCategories: focus_categories,
      customPromptActive: custom_prompt_active === 1 || custom_prompt_active === true,
      customPromptText: custom_prompt_text,
    });
    
    res.json({ 
      success: true, 
      message: 'Configuration mise à jour',
      user: updatedUser 
    });
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
}
