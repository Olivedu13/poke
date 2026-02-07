import { Router, type IRouter, type Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../../config/database.js';
import {
  generateQuestionsWithAI,
  saveGeneratedQuestions,
  getAIPreparedQuestions,
  prepareBattleQuestions,
} from '../../services/ai.service.js';

export const aiRouter: IRouter = Router();

// POST /api/ai/generate - Générer des questions avec IA (ou mock)
aiRouter.post('/generate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { prompt, count = 5, grade_level, difficulty } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt requis' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    const gradeLevel = grade_level || user.gradeLevel || 'CE1';

    // Générer des questions via Gemini AI (fallback automatique vers mock)
    const questions = await generateQuestionsWithAI(prompt, gradeLevel, difficulty || 'MEDIUM', count);

    // Sauvegarder en base si des questions ont été générées
    if (questions.length > 0) {
      const savedIds = await saveGeneratedQuestions(questions, req.userId!);
      res.json({
        success: true,
        message: `${questions.length} questions générées`,
        data: {
          count: questions.length,
          saved_ids: savedIds,
          questions: questions.map((q, idx) => ({
            id: savedIds[idx],
            ...q,
          })),
        },
      });
    } else {
      res.json({
        success: false,
        message: 'Aucune question générée',
      });
    }
  } catch (error) {
    console.error('Error generating AI questions:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/ai/questions - Récupérer les questions préparées
aiRouter.get('/questions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const count = parseInt(req.query.count as string) || 10;
    const questions = await getAIPreparedQuestions(req.userId!, count);

    res.json({
      success: true,
      data: questions,
    });
  } catch (error) {
    console.error('Error getting AI questions:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/ai/prepare-battle - Préparer des questions avant un combat
aiRouter.post('/prepare-battle', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    const result = await prepareBattleQuestions(req.userId!, 10);

    res.json({
      success: true,
      message: `Questions préparées (source: ${result.source})`,
      source: result.source,
      question_ids: result.questionIds,
    });
  } catch (error) {
    console.error('Error preparing battle questions:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/ai/config - Mettre à jour la config IA de l'utilisateur
aiRouter.put('/config', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { custom_prompt_active, custom_prompt_text } = req.body;

    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: {
        customPromptActive: custom_prompt_active ?? false,
        customPromptText: custom_prompt_text || null,
      },
    });

    res.json({
      success: true,
      message: 'Configuration IA mise à jour',
      data: {
        custom_prompt_active: user.customPromptActive,
        custom_prompt_text: user.customPromptText,
      },
    });
  } catch (error) {
    console.error('Error updating AI config:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});
