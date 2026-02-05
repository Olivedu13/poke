import { prisma } from '../config/database.js';
import type { GradeLevelType, DifficultyType } from '@prisma/client';

// Interface pour les questions générées par IA
export interface AIGeneratedQuestion {
  question_text: string;
  options_json: string[];
  correct_index: number;
  explanation: string;
  subject: string;
  difficulty: DifficultyType;
  category: string;
  grade_level: GradeLevelType;
}

// Mapping des niveaux vers les descriptions
const GRADE_DESCRIPTIONS: Record<string, string> = {
  CP: 'un élève de CP (6 ans, niveau très simple)',
  CE1: 'un élève de CE1 (7 ans, niveau simple)',
  CE2: 'un élève de CE2 (8 ans, niveau élémentaire)',
  CM1: 'un élève de CM1 (9 ans, niveau intermédiaire)',
  CM2: 'un élève de CM2 (10 ans, niveau avancé élémentaire)',
  '6EME': 'un élève de 6ème (11 ans, début collège)',
  '5EME': 'un élève de 5ème (12 ans, collège)',
  '4EME': 'un élève de 4ème (13 ans, collège)',
  '3EME': 'un élève de 3ème (14 ans, fin collège)',
};

// Générer le prompt pour l'IA
export function generateAIPrompt(
  customPrompt: string,
  gradeLevel: string,
  difficulty: string = 'MEDIUM',
  count: number = 5
): string {
  const gradeDesc = GRADE_DESCRIPTIONS[gradeLevel] || GRADE_DESCRIPTIONS['CE1'];
  const difficultyDesc = difficulty === 'EASY' ? 'facile' : difficulty === 'HARD' ? 'difficile' : 'moyenne';

  return `Tu es un professeur créant des quiz éducatifs pour ${gradeDesc}.

THÈME DEMANDÉ: ${customPrompt}

Génère exactement ${count} questions de difficulté ${difficultyDesc} au format JSON.
Chaque question doit avoir:
- Une question claire et adaptée à l'âge
- 4 options de réponse (une seule correcte)
- L'index de la bonne réponse (0-3)
- Une explication pédagogique courte
- La matière (MATHS, FRANCAIS, ANGLAIS, HISTOIRE, GEOGRAPHIE, SCIENCES)
- Une catégorie précise
- Le niveau de difficulté (EASY, MEDIUM, HARD)

Réponds UNIQUEMENT avec un tableau JSON valide sans commentaires:
[
  {
    "question_text": "...",
    "options_json": ["option1", "option2", "option3", "option4"],
    "correct_index": 0,
    "explanation": "...",
    "subject": "MATHS",
    "difficulty": "MEDIUM",
    "category": "...",
    "grade_level": "${gradeLevel}"
  }
]`;
}

// Parser la réponse de l'IA
export function parseAIResponse(response: string): AIGeneratedQuestion[] {
  try {
    // Essayer de trouver un tableau JSON dans la réponse
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON array found in AI response');
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((q: any) => ({
      question_text: q.question_text || q.questionText || '',
      options_json: Array.isArray(q.options_json) ? q.options_json : (q.options || []),
      correct_index: typeof q.correct_index === 'number' ? q.correct_index : (q.correctIndex || 0),
      explanation: q.explanation || '',
      subject: (q.subject || 'MATHS').toUpperCase(),
      difficulty: (['EASY', 'MEDIUM', 'HARD'].includes(q.difficulty?.toUpperCase()) ? q.difficulty.toUpperCase() : 'MEDIUM') as DifficultyType,
      category: q.category || 'Général',
      grade_level: q.grade_level || q.gradeLevel || 'CE1',
    }));
  } catch (e) {
    console.error('Error parsing AI response:', e);
    return [];
  }
}

// Sauvegarder les questions générées en base
export async function saveGeneratedQuestions(
  questions: AIGeneratedQuestion[],
  userId: number,
  source: string = 'AI'
): Promise<number[]> {
  const savedIds: number[] = [];

  for (const q of questions) {
    try {
      const saved = await prisma.questionBank.create({
        data: {
          questionText: q.question_text,
          optionsJson: q.options_json,
          correctIndex: q.correct_index,
          explanation: q.explanation,
          subject: q.subject,
          difficulty: q.difficulty as DifficultyType,
          category: q.category,
          gradeLevel: q.grade_level as GradeLevelType,
        },
      });
      savedIds.push(saved.id);
    } catch (e) {
      console.error('Error saving question:', e);
    }
  }

  return savedIds;
}

// Récupérer les questions AI préparées pour un utilisateur (avant combat)
export async function getAIPreparedQuestions(
  userId: number,
  count: number = 10
): Promise<any[]> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return [];

  // Chercher des questions qui correspondent au prompt et niveau de l'utilisateur
  const questions = await prisma.questionBank.findMany({
    where: {
      gradeLevel: user.gradeLevel,
      subject: { in: (user.activeSubjects as string[]) || ['MATHS', 'FRANCAIS'] },
    },
    take: count,
    orderBy: { id: 'desc' },
  });

  return questions.map((q) => ({
    id: q.id,
    source: 'DB',
    subject: q.subject,
    difficulty: q.difficulty,
    category: q.category,
    question_text: q.questionText,
    options: q.optionsJson,
    correct_index: q.correctIndex,
    explanation: q.explanation,
  }));
}

// Générer des questions mock (fallback si pas d'API OpenAI)
export function generateMockQuestions(
  prompt: string,
  gradeLevel: string,
  count: number = 5
): AIGeneratedQuestion[] {
  const questions: AIGeneratedQuestion[] = [];
  
  // Questions basiques par thème
  const mathsQuestions = [
    { q: 'Combien font 3 + 4 ?', o: ['6', '7', '8', '5'], c: 1, e: '3 + 4 = 7' },
    { q: 'Combien font 5 × 2 ?', o: ['7', '8', '10', '12'], c: 2, e: '5 × 2 = 10' },
    { q: 'Quel est le double de 6 ?', o: ['10', '8', '12', '14'], c: 2, e: 'Le double de 6 est 12' },
    { q: 'Combien font 15 - 8 ?', o: ['5', '6', '7', '8'], c: 2, e: '15 - 8 = 7' },
    { q: 'Combien font 4 × 3 ?', o: ['10', '11', '12', '13'], c: 2, e: '4 × 3 = 12' },
  ];

  const francaisQuestions = [
    { q: 'Quel est le pluriel de "cheval" ?', o: ['chevals', 'chevaux', 'chevales', 'chevauxs'], c: 1, e: 'Le pluriel de cheval est chevaux' },
    { q: 'Dans "Je mange une pomme", quel est le verbe ?', o: ['Je', 'mange', 'une', 'pomme'], c: 1, e: 'Le verbe est "mange"' },
    { q: 'Quel mot est un adjectif ?', o: ['courir', 'maison', 'grand', 'et'], c: 2, e: 'Grand est un adjectif' },
    { q: 'Comment s\'écrit le son "o" dans bateau ?', o: ['o', 'au', 'eau', 'ô'], c: 2, e: 'Dans bateau, le son "o" s\'écrit "eau"' },
    { q: 'Quel est le féminin de "acteur" ?', o: ['acteuse', 'actrice', 'acteure', 'actresse'], c: 1, e: 'Le féminin de acteur est actrice' },
  ];

  const baseQuestions = prompt.toLowerCase().includes('math') ? mathsQuestions : francaisQuestions;
  
  for (let i = 0; i < Math.min(count, baseQuestions.length); i++) {
    const bq = baseQuestions[i];
    questions.push({
      question_text: bq.q,
      options_json: bq.o,
      correct_index: bq.c,
      explanation: bq.e,
      subject: prompt.toLowerCase().includes('math') ? 'MATHS' : 'FRANCAIS',
      difficulty: 'MEDIUM' as DifficultyType,
      category: prompt,
      grade_level: gradeLevel as GradeLevelType,
    });
  }

  return questions;
}
