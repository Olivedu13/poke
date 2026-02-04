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
 */
export async function getRandomQuestion(
  gradeLevel: GradeLevelType,
  subjects: string[],
  excludeIds: number[] = [],
): Promise<Question | null> {
  const questions = await prisma.questionBank.findMany({
    where: {
      gradeLevel,
      subject: { in: subjects },
      id: { notIn: excludeIds },
    },
    take: 50,
  });

  if (questions.length === 0) {
    // Fallback: any question at this grade level
    const fallback = await prisma.questionBank.findMany({
      where: { gradeLevel, id: { notIn: excludeIds } },
      take: 20,
    });
    if (fallback.length === 0) return null;
    const q = fallback[Math.floor(Math.random() * fallback.length)];
    return formatQuestion(q);
  }

  const q = questions[Math.floor(Math.random() * questions.length)];
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
