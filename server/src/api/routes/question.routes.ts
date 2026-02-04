import { Router, type IRouter, type Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware.js';
import { getRandomQuestion } from '../../services/question.service.js';
import { prisma } from '../../config/database.js';
import type { GradeLevelType } from '@prisma/client';

export const questionRouter: IRouter = Router();

// GET /api/question - Récupère une question aléatoire
questionRouter.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }
    
    // Récupérer les IDs des questions déjà vues (passés en query param)
    const seenIds = req.query.seen 
      ? (req.query.seen as string).split(',').map(Number).filter(n => !isNaN(n))
      : [];
    
    const question = await getRandomQuestion(
      user.gradeLevel as GradeLevelType,
      (user.activeSubjects as string[]) || ['MATHS', 'FRANCAIS'],
      seenIds,
    );
    
    if (!question) {
      return res.status(404).json({ success: false, message: 'Aucune question disponible' });
    }
    
    res.json({
      success: true,
      question: {
        id: question.id,
        source: 'DB',
        subject: question.subject,
        difficulty: question.difficulty,
        category: question.category,
        question_text: question.questionText,
        options: question.options,
        correct_index: question.correctIndex,
        explanation: question.explanation,
      },
    });
  } catch (error) {
    console.error('Error getting question:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/question/answer - Soumettre une réponse (hors PvP)
questionRouter.post('/answer', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { questionId, answerIndex } = req.body;
    
    const question = await prisma.questionBank.findUnique({ where: { id: questionId } });
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question non trouvée' });
    }
    
    const isCorrect = answerIndex === question.correctIndex;
    
    // Mettre à jour les stats utilisateur
    if (isCorrect) {
      await prisma.user.update({
        where: { id: req.userId! },
        data: { 
          globalXp: { increment: 10 },
          streak: { increment: 1 },
        },
      });
    } else {
      await prisma.user.update({
        where: { id: req.userId! },
        data: { streak: 0 },
      });
    }
    
    res.json({
      success: true,
      is_correct: isCorrect,
      correct_index: question.correctIndex,
      explanation: question.explanation,
    });
  } catch (error) {
    console.error('Error answering question:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});
