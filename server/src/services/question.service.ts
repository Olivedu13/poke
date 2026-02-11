import { prisma } from '../config/database.js';
import type { GradeLevelType, DifficultyType } from '@prisma/client';

export interface Question {
  id: number;
  subject: string;
  gradeLevel: GradeLevelType;
  difficulty: DifficultyType | null;
  category: string | null;
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

/**
 * Récupère une question aléatoire adaptée au niveau et aux matières
 * Utilise une requête SQL RANDOM() pour un vrai aléatoire sur tout le pool
 */
export async function getRandomQuestion(
  gradeLevel: GradeLevelType,
  subjects: string[],
  excludeIds: number[] = [],
  categories: Record<string, string> = {},
): Promise<Question | null> {
  // Construire le filtre de catégories par matière
  // categories = { MATHS: 'MULTIPLICATION', FRANCAIS: 'CONJUGAISON' }
  const categoryEntries = Object.entries(categories).filter(([_, v]) => v && v.length > 0);
  const hasCategories = categoryEntries.length > 0;

  // Si aucune matière sélectionnée, prendre n'importe quelle question du niveau
  const hasSubjects = subjects.length > 0;

  let whereClause: any;
  if (!hasSubjects) {
    // Pas de matière → toutes les questions du niveau
    whereClause = {
      gradeLevel,
      id: { notIn: excludeIds.length > 0 ? excludeIds : [-1] },
    };
  } else if (hasCategories) {
    // Construire un OR: pour chaque matière avec catégorie, filtrer par subject+category
    // Pour les matières SANS catégorie spécifique, prendre toutes les catégories
    const orConditions: any[] = [];
    for (const subj of subjects) {
      const cat = categories[subj];
      if (cat) {
        orConditions.push({ subject: subj, category: cat });
      } else {
        orConditions.push({ subject: subj });
      }
    }
    whereClause = {
      gradeLevel,
      OR: orConditions,
      id: { notIn: excludeIds.length > 0 ? excludeIds : [-1] },
    };
  } else {
    whereClause = {
      gradeLevel,
      subject: { in: subjects },
      id: { notIn: excludeIds.length > 0 ? excludeIds : [-1] },
    };
  }

  // D'abord essayer avec matières + catégories + exclusion
  const questions = await prisma.questionBank.findMany({ where: whereClause });

  if (questions.length > 0) {
    const q = questions[Math.floor(Math.random() * questions.length)];
    return formatQuestion(q);
  }

  // Si toutes les questions ont été vues, réinitialiser les exclusions
  if (excludeIds.length > 0) {
    const resetWhere = { ...whereClause };
    delete resetWhere.id;
    const withoutExclusion = await prisma.questionBank.findMany({ where: resetWhere });
    if (withoutExclusion.length > 0) {
      const q = withoutExclusion[Math.floor(Math.random() * withoutExclusion.length)];
      return formatQuestion(q);
    }
  }

  // Fallback: any question at this grade level with matching subjects (sans filtre catégories)
  const fallbackSubjects = await prisma.questionBank.findMany({
    where: { gradeLevel, subject: { in: subjects } },
  });
  if (fallbackSubjects.length > 0) {
    const q = fallbackSubjects[Math.floor(Math.random() * fallbackSubjects.length)];
    return formatQuestion(q);
  }

  // Dernier fallback: any question at this grade level
  const fallback = await prisma.questionBank.findMany({
    where: { gradeLevel },
  });
  if (fallback.length === 0) return null;
  const q = fallback[Math.floor(Math.random() * fallback.length)];
  return formatQuestion(q);
}

/**
 * Récupère une question par son ID
 */
export async function getQuestionById(id: number): Promise<Question | null> {
  const q = await prisma.questionBank.findUnique({ where: { id } });
  if (!q) return null;
  return formatQuestion(q);
}

function formatQuestion(q: {
  id: number;
  subject: string;
  gradeLevel: GradeLevelType;
  difficulty: DifficultyType | null;
  category: string | null;
  questionText: string;
  optionsJson: unknown;
  correctIndex: number;
  explanation: string;
}): Question {
  return {
    id: q.id,
    subject: q.subject,
    gradeLevel: q.gradeLevel,
    difficulty: q.difficulty,
    category: q.category,
    questionText: q.questionText,
    options: q.optionsJson as string[],
    correctIndex: q.correctIndex,
    explanation: q.explanation,
  };
}
