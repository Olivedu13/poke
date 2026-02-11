import { Router, type IRouter, type Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware.js';
import { getRandomQuestion, getQuestionById } from '../../services/question.service.js';
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

    // IDs préparés par l'IA (prioritaires si custom prompt actif)
    const preferIds = req.query.prefer
      ? (req.query.prefer as string).split(',').map(Number).filter(n => !isNaN(n))
      : [];

    let question = null;

    // Mode: 'ai_only' = uniquement les questions IA préparées (pas de mix avec la DB)
    const aiOnlyMode = req.query.mode === 'ai_only';

    // Si des IDs préférés sont fournis, piocher dedans en priorité
    if (preferIds.length > 0) {
      const availablePreferred = preferIds.filter(id => !seenIds.includes(id));
      if (availablePreferred.length > 0) {
        const pickId = availablePreferred[Math.floor(Math.random() * availablePreferred.length)];
        const candidate = await getQuestionById(pickId);
        // Vérifier que la question correspond au niveau actuel (la jauge peut avoir changé le niveau en cours de combat)
        if (candidate && candidate.gradeLevel === user.gradeLevel) {
          question = candidate;
        }
        // Si le niveau ne correspond plus, on tombe dans le fallback DB qui utilise le niveau actuel
      } else if (aiOnlyMode) {
        // En mode ai_only, si toutes les préférées ont été vues, recycler les préférées
        const pickId = preferIds[Math.floor(Math.random() * preferIds.length)];
        question = await getQuestionById(pickId);
      }
    }

    // Fallback: question aléatoire du pool (sauf en mode ai_only)
    if (!question && !aiOnlyMode) {
      // Récupérer les catégories focus de l'utilisateur (ex: { MATHS: "MULTIPLICATION" })
      const focusCategories = (user.focusCategories as Record<string, string>) || {};
      // Si aucune matière sélectionnée, passer un tableau vide → question.service prendra n'importe quelle question du niveau
      const subjects = (user.activeSubjects as string[]) || [];
      question = await getRandomQuestion(
        user.gradeLevel as GradeLevelType,
        subjects,
        seenIds,
        focusCategories,
      );
    }
    
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
