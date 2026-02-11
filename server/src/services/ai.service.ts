import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
  const minCount = Math.max(5, count); // Toujours au moins 5 questions

  return `Tu es un professeur expert créant des quiz éducatifs pour ${gradeDesc}.

THÈME DEMANDÉ: ${customPrompt}

Génère exactement ${minCount} questions UNIQUES et ORIGINALES de difficulté ${difficultyDesc} au format JSON.

CATÉGORIES POSSIBLES PAR MATIÈRE:
- MATHS: NUMERATION, CALCUL, ADDITION, SOUSTRACTION, MULTIPLICATION, DIVISION, GEOMETRIE, MESURES, FRACTIONS, DECIMAUX, PROBLEMES
- FRANCAIS: CONJUGAISON, GRAMMAIRE, ORTHOGRAPHE, VOCABULAIRE, LECTURE, EXPRESSION
- ANGLAIS: VOCABULAIRE, GRAMMAIRE, NOMBRES, COULEURS, ANIMAUX, CORPS HUMAIN, FAMILLE, SALUTATIONS, VERBES, TEMPS, METEO, NOURRITURE
- HISTOIRE: ANTIQUITE, MOYEN AGE, TEMPS MODERNES, REVOLUTION, XIX SIECLE, XX SIECLE, GUERRES
- GEOGRAPHIE: FRANCE, MONDE, PAYSAGE, CLIMAT, CONTINENTS, TRANSPORTS, POPULATION
- GEO: FRANCE, MONDE, PAYSAGE, CLIMAT, CONTINENTS, TRANSPORTS, POPULATION
- SCIENCES: CORPS HUMAIN, ANIMAUX, PLANTES, MATERIAUX, ENERGIE, ESPACE

Chaque question DOIT avoir:
- question_text: question claire, originale et adaptée à l'âge (NE JAMAIS répéter une question classique type "combien font 3+4")
- options_json: tableau de EXACTEMENT 4 réponses (une seule correcte), sous forme de strings
- correct_index: index (0-3) de la bonne réponse
- explanation: explication pédagogique courte (1-2 phrases)
- subject: la matière parmi UNIQUEMENT: MATHS, FRANCAIS, ANGLAIS, HISTOIRE, GEO, SCIENCES
- difficulty: EXACTEMENT "${difficulty}" pour toutes les questions
- category: une catégorie parmi celles listées ci-dessus (EN MAJUSCULES)
- grade_level: "${gradeLevel}"

RÈGLES STRICTES:
- Les 4 options doivent être plausibles (pas de réponses évidemment fausses)
- Chaque question doit être DIFFÉRENTE et ORIGINALE (pas de questions basiques récurrentes)
- Varie les catégories au maximum (ne pas mettre 5 questions de la même catégorie)
- Adapte le vocabulaire et la complexité au niveau ${gradeDesc}
- EASY = connaissance directe, MEDIUM = réflexion simple, HARD = raisonnement nécessaire
- La catégorie DOIT être en MAJUSCULES et correspondre à la liste ci-dessus

Réponds UNIQUEMENT avec un tableau JSON valide, sans markdown, sans commentaires, sans backticks:
[{"question_text":"...","options_json":["a","b","c","d"],"correct_index":0,"explanation":"...","subject":"MATHS","difficulty":"${difficulty}","category":"CALCUL","grade_level":"${gradeLevel}"}]`;
}

// Parser la réponse de l'IA
export function parseAIResponse(response: string): AIGeneratedQuestion[] {
  try {
    // Nettoyer la réponse: enlever les backticks markdown si présents
    let cleaned = response.trim();
    cleaned = cleaned.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');

    // Essayer de trouver un tableau JSON dans la réponse
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      logger.error('No JSON array found in AI response');
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((q: any) => q.question_text && Array.isArray(q.options_json) && q.options_json.length === 4)
      .map((q: any) => ({
        question_text: String(q.question_text),
        options_json: q.options_json.map(String),
        correct_index: typeof q.correct_index === 'number' ? Math.min(3, Math.max(0, q.correct_index)) : 0,
        explanation: String(q.explanation || ''),
        subject: validateSubject(q.subject),
        difficulty: validateDifficulty(q.difficulty),
        category: String(q.category || 'Général'),
        grade_level: q.grade_level || q.gradeLevel || 'CE1',
      }));
  } catch (e) {
    logger.error('Error parsing AI response:', e);
    return [];
  }
}

function validateSubject(subject: string): string {
  const valid = ['MATHS', 'FRANCAIS', 'ANGLAIS', 'HISTOIRE', 'GEOGRAPHIE', 'GEO', 'SCIENCES'];
  const upper = String(subject || '').toUpperCase();
  // Normaliser GEOGRAPHIE → GEO pour consistance avec la DB
  if (upper === 'GEOGRAPHIE') return 'GEO';
  return valid.includes(upper) ? upper : 'MATHS';
}

function validateDifficulty(diff: string): DifficultyType {
  const valid = ['EASY', 'MEDIUM', 'HARD'];
  const upper = String(diff || '').toUpperCase();
  return (valid.includes(upper) ? upper : 'MEDIUM') as DifficultyType;
}

// ============================================================
// MULTI-PROVIDER AI CHAIN: Gemini → Groq → Mistral → Mock
// Chaque provider est tenté dans l'ordre. Si l'un échoue
// (quota, erreur, pas de clé), on passe au suivant.
// ============================================================

interface AIProvider {
  name: string;
  call: (prompt: string) => Promise<string>;
  isConfigured: () => boolean;
}

// --- PROVIDER 1: Google Gemini ---
async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// --- PROVIDER 2: Groq (Llama 3.3 70B - gratuit: 30 req/min, 14400/jour) ---
async function callGroq(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Tu es un générateur de quiz éducatif JSON. Réponds UNIQUEMENT avec du JSON valide, sans markdown.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API ${res.status}: ${errText.substring(0, 200)}`);
  }

  const data = await res.json() as any;
  return data.choices?.[0]?.message?.content || '';
}

// --- PROVIDER 3: Mistral (mistral-small-latest - gratuit avec API key) ---
async function callMistral(prompt: string): Promise<string> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error('MISTRAL_API_KEY not configured');

  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages: [
        { role: 'system', content: 'Tu es un générateur de quiz éducatif JSON. Réponds UNIQUEMENT avec du JSON valide, sans markdown.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Mistral API ${res.status}: ${errText.substring(0, 200)}`);
  }

  const data = await res.json() as any;
  return data.choices?.[0]?.message?.content || '';
}

// Liste ordonnée des providers
function getProviders(): AIProvider[] {
  return [
    {
      name: 'Gemini',
      call: callGemini,
      isConfigured: () => !!process.env.GEMINI_API_KEY,
    },
    {
      name: 'Groq',
      call: callGroq,
      isConfigured: () => !!process.env.GROQ_API_KEY,
    },
    {
      name: 'Mistral',
      call: callMistral,
      isConfigured: () => !!process.env.MISTRAL_API_KEY,
    },
  ];
}

// Générer des questions via la chaîne de providers IA
export async function generateQuestionsWithAI(
  customPrompt: string,
  gradeLevel: string,
  difficulty: string = 'MEDIUM',
  count: number = 5
): Promise<AIGeneratedQuestion[]> {
  const minCount = Math.max(5, count); // Toujours au moins 5
  const prompt = generateAIPrompt(customPrompt, gradeLevel, difficulty, minCount);
  const providers = getProviders().filter(p => p.isConfigured());

  if (providers.length === 0) {
    logger.warn('No AI provider configured, using mock questions');
    return generateMockQuestions(customPrompt, gradeLevel, count);
  }

  for (const provider of providers) {
    try {
      logger.info(`[AI] Trying ${provider.name} for ${count} questions (grade ${gradeLevel}, diff ${difficulty})`);
      const rawResponse = await provider.call(prompt);
      const questions = parseAIResponse(rawResponse);

      if (questions.length === 0) {
        logger.warn(`[AI] ${provider.name} returned 0 parseable questions, trying next provider...`);
        continue;
      }

      logger.info(`[AI] ✓ ${provider.name} generated ${questions.length} questions successfully`);
      return questions;
    } catch (error: any) {
      logger.warn(`[AI] ✗ ${provider.name} failed: ${error.message?.substring(0, 150)}`);
      continue;
    }
  }

  logger.warn('[AI] All providers failed, falling back to mock questions');
  return generateMockQuestions(customPrompt, gradeLevel, minCount);
}

// Sauvegarder les questions générées en base (avec vérification doublon)
export async function saveGeneratedQuestions(
  questions: AIGeneratedQuestion[],
  userId: number,
  source: string = 'AI'
): Promise<number[]> {
  const savedIds: number[] = [];

  for (const q of questions) {
    try {
      // Vérifier si une question identique existe déjà
      const existing = await prisma.questionBank.findFirst({
        where: {
          questionText: q.question_text,
          gradeLevel: q.grade_level as GradeLevelType,
        },
        select: { id: true },
      });
      
      if (existing) {
        // La question existe déjà, on réutilise son ID
        logger.info(`[AI Save] Question "${q.question_text.substring(0, 40)}..." déjà en DB (id=${existing.id}), réutilisée`);
        savedIds.push(existing.id);
        continue;
      }

      // Tenter la création, avec retry si conflit de séquence
      let retries = 3;
      let saved = null;
      while (retries > 0) {
        try {
          saved = await prisma.questionBank.create({
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
          break;
        } catch (createErr: any) {
          if (createErr.code === 'P2002' && retries > 1) {
            // Conflit de séquence: recaler la séquence et réessayer
            logger.warn('[AI Save] Sequence conflict, resetting sequence...');
            await prisma.$executeRawUnsafe(
              `SELECT setval('question_bank_id_seq', (SELECT COALESCE(MAX(id), 0) FROM question_bank))`
            );
            retries--;
          } else {
            throw createErr;
          }
        }
      }
      if (saved) savedIds.push(saved.id);
    } catch (e) {
      logger.error('Error saving question:', e);
    }
  }

  return savedIds;
}

// Préparer les questions avant un combat: TOUJOURS générer de nouvelles questions IA
export async function prepareBattleQuestions(
  userId: number,
  count: number = 5
): Promise<{ questionIds: number[]; source: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  // Si aucune matière sélectionnée, utiliser toutes les matières disponibles
  const subjects = ((user.activeSubjects as string[]) && (user.activeSubjects as string[]).length > 0)
    ? (user.activeSubjects as string[])
    : ['MATHS', 'FRANCAIS', 'ANGLAIS', 'HISTOIRE', 'GEOGRAPHIE', 'SCIENCES'];
  const focusCategories = (user.focusCategories as Record<string, string>) || {};
  const minCount = Math.max(5, count); // Toujours au moins 5 questions

  // Construire un prompt automatique basé sur les matières de l'utilisateur
  let prompt: string;
  if (user.customPromptActive && user.customPromptText) {
    prompt = user.customPromptText;
    // Ajouter les catégories focus au prompt personnalisé si disponibles
    const categoryHints = Object.entries(focusCategories)
      .filter(([_, cat]) => cat && cat.length > 0)
      .map(([subj, cat]) => `${subj}: concentre-toi sur ${cat}`)
      .join(', ');
    if (categoryHints) {
      prompt += `\nFocus catégories: ${categoryHints}`;
    }
  } else {
    // Génération automatique: mélanger les matières actives
    const subjectDescriptions: Record<string, string> = {
      MATHS: 'Mathématiques (numération, calcul, géométrie, mesures, problèmes, fractions)',
      FRANCAIS: 'Français (conjugaison, grammaire, orthographe, vocabulaire, lecture)',
      ANGLAIS: 'Anglais (vocabulaire, grammaire simple, expressions courantes)',
      HISTOIRE: 'Histoire (événements, personnages, chronologie)',
      GEOGRAPHIE: 'Géographie (pays, continents, paysages, climat)',
      GEO: 'Géographie (pays, continents, paysages, climat)',
      SCIENCES: 'Sciences (nature, corps humain, expériences, animaux)',
    };
    // Appliquer les catégories focus dans les descriptions
    const subjectsList = subjects.map(s => {
      const base = subjectDescriptions[s] || s;
      const cat = focusCategories[s];
      if (cat) return `${base} — FOCUS SUR: ${cat}`;
      return base;
    }).join(', ');
    prompt = `Génère des questions variées couvrant ces matières: ${subjectsList}. 
Assure-toi de bien varier les catégories au sein de chaque matière. 
Ne répète jamais la même question. Sois créatif et original dans tes formulations.`;
  }

  // Varier la difficulté aléatoirement
  const difficulties = ['EASY', 'MEDIUM', 'HARD'];
  const randomDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)];

  try {
    const questions = await generateQuestionsWithAI(
      prompt,
      user.gradeLevel,
      randomDifficulty,
      minCount
    );

    if (questions.length > 0) {
      // saveGeneratedQuestions gère la déduplication: réutilise les IDs existants si doublon
      const savedIds = await saveGeneratedQuestions(questions, userId, 'AI');
      if (savedIds.length > 0) {
        logger.info(`[Battle Prep] Prepared ${savedIds.length} questions for user ${userId} (grade ${user.gradeLevel})`);
        return { questionIds: savedIds, source: 'AI' };
      }
    }
  } catch (error: any) {
    logger.warn(`[Battle Prep] AI generation failed, using existing DB questions: ${error.message}`);
  }

  // Fallback: vérifier qu'on a assez de questions en base
  const existingCount = await prisma.questionBank.count({
    where: {
      gradeLevel: user.gradeLevel,
      subject: { in: subjects },
    },
  });

  return { questionIds: [], source: existingCount > 0 ? 'DB' : 'NONE' };
}

// Dédoublonner les questions IA par rapport à la DB existante
async function deduplicateQuestions(
  questions: AIGeneratedQuestion[],
  gradeLevel: string
): Promise<AIGeneratedQuestion[]> {
  // Chercher les textes de questions existantes pour éviter les doublons
  const existing = await prisma.questionBank.findMany({
    where: { gradeLevel: gradeLevel as GradeLevelType },
    select: { questionText: true },
  });
  
  const existingTexts = new Set(
    existing.map(q => q.questionText.toLowerCase().trim().replace(/\s+/g, ' '))
  );

  return questions.filter(q => {
    const normalized = q.question_text.toLowerCase().trim().replace(/\s+/g, ' ');
    // Exclure si le texte exact existe déjà
    if (existingTexts.has(normalized)) return false;
    // Exclure si très similaire (80%+ des mots en commun)
    for (const existing of existingTexts) {
      if (textSimilarity(normalized, existing) > 0.8) return false;
    }
    return true;
  });
}

// Calcul simple de similarité entre deux textes
function textSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/));
  const wordsB = new Set(b.split(/\s+/));
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  return intersection / Math.max(wordsA.size, wordsB.size);
}

// Récupérer les questions AI préparées pour un utilisateur
export async function getAIPreparedQuestions(
  userId: number,
  count: number = 10
): Promise<any[]> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return [];

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

// Générer des questions mock (fallback si pas d'API)
export function generateMockQuestions(
  prompt: string,
  gradeLevel: string,
  count: number = 5
): AIGeneratedQuestion[] {
  const lowerPrompt = prompt.toLowerCase();

  const mathsQuestions: AIGeneratedQuestion[] = [
    { question_text: 'Combien font 3 + 4 ?', options_json: ['6', '7', '8', '5'], correct_index: 1, explanation: '3 + 4 = 7', subject: 'MATHS', difficulty: 'EASY' as DifficultyType, category: 'Addition', grade_level: gradeLevel as GradeLevelType },
    { question_text: 'Combien font 5 × 2 ?', options_json: ['7', '8', '10', '12'], correct_index: 2, explanation: '5 × 2 = 10', subject: 'MATHS', difficulty: 'EASY' as DifficultyType, category: 'Multiplication', grade_level: gradeLevel as GradeLevelType },
    { question_text: 'Quel est le double de 6 ?', options_json: ['10', '8', '12', '14'], correct_index: 2, explanation: 'Le double de 6 est 12', subject: 'MATHS', difficulty: 'EASY' as DifficultyType, category: 'Doubles', grade_level: gradeLevel as GradeLevelType },
    { question_text: 'Combien font 15 - 8 ?', options_json: ['5', '6', '7', '8'], correct_index: 2, explanation: '15 - 8 = 7', subject: 'MATHS', difficulty: 'MEDIUM' as DifficultyType, category: 'Soustraction', grade_level: gradeLevel as GradeLevelType },
    { question_text: 'Combien font 4 × 3 ?', options_json: ['10', '11', '12', '13'], correct_index: 2, explanation: '4 × 3 = 12', subject: 'MATHS', difficulty: 'EASY' as DifficultyType, category: 'Multiplication', grade_level: gradeLevel as GradeLevelType },
    { question_text: 'Combien font 7 × 8 ?', options_json: ['56', '49', '55', '63'], correct_index: 0, explanation: '7 × 8 = 56', subject: 'MATHS', difficulty: 'MEDIUM' as DifficultyType, category: 'Table de multiplication', grade_level: gradeLevel as GradeLevelType },
    { question_text: 'Combien font 9 + 6 ?', options_json: ['13', '14', '15', '16'], correct_index: 2, explanation: '9 + 6 = 15', subject: 'MATHS', difficulty: 'EASY' as DifficultyType, category: 'Addition', grade_level: gradeLevel as GradeLevelType },
    { question_text: 'Combien font 20 - 13 ?', options_json: ['6', '7', '8', '9'], correct_index: 1, explanation: '20 - 13 = 7', subject: 'MATHS', difficulty: 'MEDIUM' as DifficultyType, category: 'Soustraction', grade_level: gradeLevel as GradeLevelType },
    { question_text: 'Quel est le triple de 4 ?', options_json: ['8', '10', '12', '16'], correct_index: 2, explanation: 'Le triple de 4 est 12', subject: 'MATHS', difficulty: 'MEDIUM' as DifficultyType, category: 'Triples', grade_level: gradeLevel as GradeLevelType },
    { question_text: 'Combien font 6 × 6 ?', options_json: ['30', '32', '36', '42'], correct_index: 2, explanation: '6 × 6 = 36', subject: 'MATHS', difficulty: 'MEDIUM' as DifficultyType, category: 'Table de multiplication', grade_level: gradeLevel as GradeLevelType },
  ];

  const francaisQuestions: AIGeneratedQuestion[] = [
    { question_text: 'Quel est le pluriel de "cheval" ?', options_json: ['chevals', 'chevaux', 'chevales', 'chevauxs'], correct_index: 1, explanation: 'Le pluriel de cheval est chevaux', subject: 'FRANCAIS', difficulty: 'EASY' as DifficultyType, category: 'Pluriel', grade_level: gradeLevel as GradeLevelType },
    { question_text: 'Dans "Je mange une pomme", quel est le verbe ?', options_json: ['Je', 'mange', 'une', 'pomme'], correct_index: 1, explanation: 'Le verbe est "mange"', subject: 'FRANCAIS', difficulty: 'EASY' as DifficultyType, category: 'Grammaire', grade_level: gradeLevel as GradeLevelType },
    { question_text: 'Quel mot est un adjectif ?', options_json: ['courir', 'maison', 'grand', 'et'], correct_index: 2, explanation: 'Grand est un adjectif', subject: 'FRANCAIS', difficulty: 'EASY' as DifficultyType, category: 'Nature des mots', grade_level: gradeLevel as GradeLevelType },
    { question_text: 'Comment s\'écrit le son "o" dans bateau ?', options_json: ['o', 'au', 'eau', 'ô'], correct_index: 2, explanation: 'Dans bateau, le son "o" s\'écrit "eau"', subject: 'FRANCAIS', difficulty: 'MEDIUM' as DifficultyType, category: 'Orthographe', grade_level: gradeLevel as GradeLevelType },
    { question_text: 'Quel est le féminin de "acteur" ?', options_json: ['acteuse', 'actrice', 'acteure', 'actresse'], correct_index: 1, explanation: 'Le féminin de acteur est actrice', subject: 'FRANCAIS', difficulty: 'EASY' as DifficultyType, category: 'Féminin', grade_level: gradeLevel as GradeLevelType },
    { question_text: 'Conjuguez "finir" au présent avec "nous" :', options_json: ['nous finons', 'nous finissons', 'nous finirons', 'nous finons'], correct_index: 1, explanation: 'Nous finissons (verbe du 2e groupe)', subject: 'FRANCAIS', difficulty: 'MEDIUM' as DifficultyType, category: 'Conjugaison', grade_level: gradeLevel as GradeLevelType },
    { question_text: 'Quel est le synonyme de "content" ?', options_json: ['triste', 'heureux', 'fatigué', 'fâché'], correct_index: 1, explanation: 'Content et heureux sont synonymes', subject: 'FRANCAIS', difficulty: 'EASY' as DifficultyType, category: 'Vocabulaire', grade_level: gradeLevel as GradeLevelType },
    { question_text: 'Quel est le contraire de "rapide" ?', options_json: ['vite', 'pressé', 'lent', 'fort'], correct_index: 2, explanation: 'Le contraire de rapide est lent', subject: 'FRANCAIS', difficulty: 'EASY' as DifficultyType, category: 'Contraires', grade_level: gradeLevel as GradeLevelType },
    { question_text: 'Trouvez l\'erreur : "Les enfant joue dans le jardin"', options_json: ['enfant → enfants', 'joue → jouent', 'Les deux sont faux', 'Pas d\'erreur'], correct_index: 2, explanation: 'Il faut écrire "Les enfants jouent"', subject: 'FRANCAIS', difficulty: 'HARD' as DifficultyType, category: 'Accord', grade_level: gradeLevel as GradeLevelType },
    { question_text: 'Dans "Le chat dort sur le canapé", quel est le sujet ?', options_json: ['dort', 'le canapé', 'le chat', 'sur'], correct_index: 2, explanation: 'Le sujet est "le chat" (qui fait l\'action)', subject: 'FRANCAIS', difficulty: 'EASY' as DifficultyType, category: 'Grammaire', grade_level: gradeLevel as GradeLevelType },
  ];

  const isMath = lowerPrompt.includes('math') || lowerPrompt.includes('calcul') || lowerPrompt.includes('multiplica')
    || lowerPrompt.includes('equation') || lowerPrompt.includes('nombre');
  const baseQuestions = isMath ? mathsQuestions : francaisQuestions;

  const shuffled = [...baseQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
