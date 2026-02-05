import { prisma } from '../config/database.js';
import { getUserTeam, type PokemonData } from './pokemon.service.js';
import { getRandomQuestion, getQuestionById, type Question } from './question.service.js';
import { useItem, type ItemEffect } from './inventory.service.js';
import type { MatchStatusType, GradeLevelType, User } from '@prisma/client';

// ============ TYPES ============

export interface OnlinePlayerInfo {
  id: number;
  username: string;
  gradeLevel: string;
  avatarPokemonId: number | null;
  status: 'available' | 'in_battle' | 'challenged';
}

export interface ChallengeInfo {
  id: number;
  challengerId: number;
  challengerName: string;
  challengedId: number;
  challengerTeam: PokemonData[] | null;
  status: string;
  createdAt: Date;
}

export interface MatchState {
  id: number;
  player1Id: number;
  player2Id: number;
  player1Name: string;
  player2Name: string;
  player1Team: PokemonData[];
  player2Team: PokemonData[];
  player1TeamHp: number[];
  player2TeamHp: number[];
  player1ActivePokemon: number;
  player2ActivePokemon: number;
  currentTurnId: number | null;
  status: MatchStatusType;
  winnerId: number | null;
  xpReward: number;
  turnNumber: number;
}

export interface TurnHistory {
  id: number;
  turnNumber: number;
  playerId: number;
  playerName: string;
  questionText: string | null;
  questionOptions: string[];
  correctIndex: number | null;
  answerIndex: number | null;
  isCorrect: boolean | null;
  damageDealt: number;
  itemUsed: string | null;
  itemEffect: ItemEffect | null;
}

// ============ LOBBY ============

/**
 * Marque un utilisateur comme en ligne
 */
export async function goOnline(userId: number): Promise<void> {
  await prisma.onlinePlayer.upsert({
    where: { userId },
    update: { status: 'available', lastSeen: new Date() },
    create: { userId, status: 'available' },
  });
}

/**
 * Marque un utilisateur comme hors ligne
 */
export async function goOffline(userId: number): Promise<void> {
  await prisma.onlinePlayer.delete({ where: { userId } }).catch(() => {});
}

/**
 * Met à jour le heartbeat d'un joueur en ligne
 */
export async function heartbeat(userId: number): Promise<void> {
  await prisma.onlinePlayer.update({
    where: { userId },
    data: { lastSeen: new Date() },
  }).catch(() => {});
}

/**
 * Récupère la liste des joueurs en ligne
 */
export async function getOnlinePlayers(excludeUserId?: number): Promise<OnlinePlayerInfo[]> {
  // Nettoyer les joueurs inactifs (> 30 secondes)
  const threshold = new Date(Date.now() - 30000);
  await prisma.onlinePlayer.deleteMany({
    where: { lastSeen: { lt: threshold } },
  });

  const players = await prisma.onlinePlayer.findMany({
    where: excludeUserId ? { userId: { not: excludeUserId } } : {},
    include: {
      user: {
        select: {
          id: true,
          username: true,
          gradeLevel: true,
          userPokemon: { where: { isTeam: true }, take: 1, select: { tyradexId: true } },
        },
      },
    },
  });

  return players.map((p) => ({
    id: p.user.id,
    username: p.user.username,
    gradeLevel: p.user.gradeLevel,
    avatarPokemonId: p.user.userPokemon[0]?.tyradexId || null,
    status: p.status as 'available' | 'in_battle' | 'challenged',
  }));
}

// ============ CHALLENGES ============

/**
 * Envoie un défi à un autre joueur
 */
export async function sendChallenge(
  challengerId: number,
  challengedId: number,
): Promise<{ success: boolean; challengeId?: number; message: string }> {
  // Vérifier que les deux joueurs sont disponibles
  const [challenger, challenged] = await Promise.all([
    prisma.onlinePlayer.findUnique({ where: { userId: challengerId } }),
    prisma.onlinePlayer.findUnique({ where: { userId: challengedId } }),
  ]);

  if (!challenger || challenger.status !== 'available') {
    return { success: false, message: 'Tu n\'es pas disponible' };
  }
  if (!challenged || challenged.status !== 'available') {
    return { success: false, message: 'Ce joueur n\'est pas disponible' };
  }

  // Récupérer l'équipe du challenger
  const challengerTeam = await getUserTeam(challengerId);
  if (challengerTeam.length === 0) {
    return { success: false, message: 'Tu n\'as pas d\'équipe' };
  }

  // Créer le défi
  const challenge = await prisma.pvpChallenge.create({
    data: {
      challengerId,
      challengedId,
      challengerTeam: challengerTeam as unknown as object,
      status: 'pending',
    },
  });

  // Mettre à jour les statuts
  await prisma.onlinePlayer.updateMany({
    where: { userId: { in: [challengerId, challengedId] } },
    data: { status: 'challenged' },
  });

  return { success: true, challengeId: challenge.id, message: 'Défi envoyé!' };
}

/**
 * Récupère les défis reçus par un joueur
 */
export async function getIncomingChallenges(userId: number): Promise<ChallengeInfo[]> {
  const challenges = await prisma.pvpChallenge.findMany({
    where: { challengedId: userId, status: 'pending' },
    include: { challenger: { select: { username: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return challenges.map((c) => ({
    id: c.id,
    challengerId: c.challengerId,
    challengerName: c.challenger.username,
    challengedId: c.challengedId,
    challengerTeam: c.challengerTeam as PokemonData[] | null,
    status: c.status,
    createdAt: c.createdAt,
  }));
}

/**
 * Accepte un défi et crée le match
 */
export async function acceptChallenge(
  challengeId: number,
  userId: number,
): Promise<{ success: boolean; matchId?: number; message: string }> {
  const challenge = await prisma.pvpChallenge.findUnique({
    where: { id: challengeId },
    include: { challenger: true, challenged: true },
  });

  if (!challenge) {
    return { success: false, message: 'Défi non trouvé' };
  }
  if (challenge.challengedId !== userId) {
    return { success: false, message: 'Ce défi ne t\'est pas destiné' };
  }
  if (challenge.status !== 'pending') {
    return { success: false, message: 'Ce défi a déjà été traité' };
  }

  // Récupérer les équipes
  const [team1, team2] = await Promise.all([
    getUserTeam(challenge.challengerId),
    getUserTeam(challenge.challengedId),
  ]);

  if (team1.length === 0 || team2.length === 0) {
    return { success: false, message: 'Équipe invalide' };
  }

  // Créer le match
  const match = await prisma.pvpMatch.create({
    data: {
      player1Id: challenge.challengerId,
      player2Id: challenge.challengedId,
      status: 'WAITING',
      player1Team: team1 as unknown as object,
      player2Team: team2 as unknown as object,
      player1TeamHp: team1.map((p) => p.currentHp),
      player2TeamHp: team2.map((p) => p.currentHp),
      player1ActivePokemon: 0,
      player2ActivePokemon: 0,
      xpReward: 50,
      turnNumber: 0,
    },
  });

  // Mettre à jour le défi et les statuts
  await Promise.all([
    prisma.pvpChallenge.update({
      where: { id: challengeId },
      data: { status: 'accepted' },
    }),
    prisma.onlinePlayer.updateMany({
      where: { userId: { in: [challenge.challengerId, challenge.challengedId] } },
      data: { status: 'in_battle' },
    }),
  ]);

  return { success: true, matchId: match.id, message: 'Match créé!' };
}

/**
 * Refuse un défi
 */
export async function declineChallenge(challengeId: number, userId: number): Promise<{ success: boolean; message: string }> {
  const challenge = await prisma.pvpChallenge.findUnique({ where: { id: challengeId } });

  if (!challenge || challenge.challengedId !== userId) {
    return { success: false, message: 'Défi non trouvé' };
  }

  await prisma.pvpChallenge.update({
    where: { id: challengeId },
    data: { status: 'declined' },
  });

  // Remettre les joueurs disponibles
  await prisma.onlinePlayer.updateMany({
    where: { userId: { in: [challenge.challengerId, challenge.challengedId] } },
    data: { status: 'available' },
  });

  return { success: true, message: 'Défi refusé' };
}

/**
 * Vérifie si un défi envoyé a été accepté
 */
export async function checkSentChallenges(userId: number): Promise<{ matchId: number; player1Id: number; player2Id: number } | null> {
  const challenge = await prisma.pvpChallenge.findFirst({
    where: { challengerId: userId, status: 'accepted' },
    orderBy: { createdAt: 'desc' },
  });

  if (!challenge) return null;

  const match = await prisma.pvpMatch.findFirst({
    where: {
      player1Id: challenge.challengerId,
      player2Id: challenge.challengedId,
      status: { in: ['WAITING', 'IN_PROGRESS'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!match) return null;

  // Marquer le défi comme vu
  await prisma.pvpChallenge.update({
    where: { id: challenge.id },
    data: { status: 'seen' },
  });

  return { matchId: match.id, player1Id: match.player1Id, player2Id: match.player2Id };
}

// ============ BATTLE ============

/**
 * Initialise un combat (tirage au sort du premier joueur)
 */
export async function initBattle(
  matchId: number,
  userId: number,
): Promise<{ success: boolean; isMyTurn: boolean; message: string }> {
  const match = await prisma.pvpMatch.findUnique({ where: { id: matchId } });

  if (!match) {
    return { success: false, isMyTurn: false, message: 'Match non trouvé' };
  }

  if (match.status === 'IN_PROGRESS') {
    const isMyTurn = match.currentTurnId === userId;
    return { success: true, isMyTurn, message: 'Combat déjà en cours' };
  }

  // Tirage au sort
  const firstPlayerId = Math.random() < 0.5 ? match.player1Id : match.player2Id;

  // Récupérer une première question
  const player = await prisma.user.findUnique({ where: { id: firstPlayerId } });
  const question = await getRandomQuestion(
    player?.gradeLevel || 'CE1',
    (player?.activeSubjects as string[]) || ['MATHS', 'FRANCAIS'],
  );

  await prisma.pvpMatch.update({
    where: { id: matchId },
    data: {
      status: 'IN_PROGRESS',
      currentTurnId: firstPlayerId,
      currentQuestionId: question?.id,
      turnNumber: 1,
      waitingForAnswer: true,
    },
  });

  return { success: true, isMyTurn: firstPlayerId === userId, message: 'Combat initialisé!' };
}

/**
 * Récupère l'état complet du match
 */
export async function getMatchState(
  matchId: number,
  userId: number,
): Promise<{ success: boolean; match?: MatchState; history?: TurnHistory[]; currentQuestion?: Question | null; isMyTurn?: boolean; message: string }> {
  const match = await prisma.pvpMatch.findUnique({
    where: { id: matchId },
    include: {
      player1: { select: { username: true } },
      player2: { select: { username: true } },
      turns: {
        include: { player: { select: { username: true } } },
        orderBy: { turnNumber: 'desc' },
        take: 20,
      },
    },
  });

  if (!match) {
    return { success: false, message: 'Match non trouvé' };
  }

  // Vérifier que l'utilisateur fait partie du match
  if (match.player1Id !== userId && match.player2Id !== userId) {
    return { success: false, message: 'Tu ne fais pas partie de ce match' };
  }

  const matchState: MatchState = {
    id: match.id,
    player1Id: match.player1Id,
    player2Id: match.player2Id,
    player1Name: match.player1.username,
    player2Name: match.player2.username,
    player1Team: match.player1Team as unknown as PokemonData[],
    player2Team: match.player2Team as unknown as PokemonData[],
    player1TeamHp: match.player1TeamHp as number[],
    player2TeamHp: match.player2TeamHp as number[],
    player1ActivePokemon: match.player1ActivePokemon ?? 0,
    player2ActivePokemon: match.player2ActivePokemon ?? 0,
    currentTurnId: match.currentTurnId,
    status: match.status,
    winnerId: match.winnerId,
    xpReward: match.xpReward ?? 50,
    turnNumber: match.turnNumber ?? 0,
  };

  const history: TurnHistory[] = match.turns.map((t) => ({
    id: t.id,
    turnNumber: t.turnNumber,
    playerId: t.playerId,
    playerName: t.player.username,
    questionText: t.questionText,
    questionOptions: (t.questionOptions as string[]) || [],
    correctIndex: t.correctIndex,
    answerIndex: t.answerIndex,
    isCorrect: t.isCorrect,
    damageDealt: t.damageDealt ?? 0,
    itemUsed: t.itemUsed,
    itemEffect: t.itemEffect as ItemEffect | null,
  }));

  // Récupérer la question courante (visible par les 2 joueurs)
  let currentQuestion: any = null;
  if (match.currentQuestionId && match.waitingForAnswer) {
    const q = await getQuestionById(match.currentQuestionId);
    if (q) {
      currentQuestion = {
        id: q.id,
        text: q.questionText,
        options: q.options,
        correctIndex: q.correctIndex,
        difficulty: q.difficulty,
      };
    }
  }

  return {
    success: true,
    match: matchState,
    history: history.reverse(),
    currentQuestion,
    isMyTurn: match.currentTurnId === userId,
    message: 'OK',
  };
}

/**
 * Soumet une réponse
 */
export async function submitAnswer(
  matchId: number,
  userId: number,
  answerIndex: number,
): Promise<{
  success: boolean;
  isCorrect?: boolean;
  damageDealt?: number;
  gameOver?: boolean;
  winnerId?: number;
  nextTurnId?: number;
  message: string;
}> {
  const match = await prisma.pvpMatch.findUnique({
    where: { id: matchId },
    include: { player1: true, player2: true },
  });

  if (!match) {
    return { success: false, message: 'Match non trouvé' };
  }
  if (match.currentTurnId !== userId) {
    return { success: false, message: 'Ce n\'est pas ton tour' };
  }
  if (!match.waitingForAnswer || !match.currentQuestionId) {
    return { success: false, message: 'Aucune question en attente' };
  }

  // Récupérer la question
  const question = await getQuestionById(match.currentQuestionId);
  if (!question) {
    return { success: false, message: 'Question non trouvée' };
  }

  const isCorrect = answerIndex === question.correctIndex;
  let damageDealt = 0;

  // Déterminer qui est l'attaquant et le défenseur
  const isPlayer1 = userId === match.player1Id;
  const defenderTeamHp = isPlayer1
    ? (match.player2TeamHp as number[])
    : (match.player1TeamHp as number[]);
  const defenderActiveIndex = isPlayer1
    ? (match.player2ActivePokemon ?? 0)
    : (match.player1ActivePokemon ?? 0);

  // Calculer les dégâts si bonne réponse
  if (isCorrect) {
    damageDealt = 20 + Math.floor(Math.random() * 10); // 20-30 dégâts
    defenderTeamHp[defenderActiveIndex] = Math.max(0, defenderTeamHp[defenderActiveIndex] - damageDealt);
  }

  // Vérifier si le Pokémon actif du défenseur est KO
  let newDefenderActive = defenderActiveIndex;
  if (defenderTeamHp[defenderActiveIndex] <= 0) {
    // Chercher le prochain Pokémon vivant
    const nextAlive = defenderTeamHp.findIndex((hp, i) => i > defenderActiveIndex && hp > 0);
    if (nextAlive !== -1) {
      newDefenderActive = nextAlive;
    } else {
      // Chercher depuis le début
      const firstAlive = defenderTeamHp.findIndex((hp) => hp > 0);
      newDefenderActive = firstAlive !== -1 ? firstAlive : defenderActiveIndex;
    }
  }

  // Vérifier si le match est terminé (tous les Pokémon du défenseur KO)
  const allDefenderKO = defenderTeamHp.every((hp) => hp <= 0);
  const gameOver = allDefenderKO;
  const winnerId = gameOver ? userId : undefined;

  // Préparer la mise à jour
  const updateData: Record<string, unknown> = {
    turnNumber: (match.turnNumber ?? 0) + 1,
    waitingForAnswer: false,
  };

  if (isPlayer1) {
    updateData.player2TeamHp = defenderTeamHp;
    updateData.player2ActivePokemon = newDefenderActive;
  } else {
    updateData.player1TeamHp = defenderTeamHp;
    updateData.player1ActivePokemon = newDefenderActive;
  }

  if (gameOver) {
    updateData.status = 'COMPLETED';
    updateData.winnerId = winnerId;
    updateData.endedAt = new Date();
  } else {
    // Passer au tour suivant (nouvelle question pour l'adversaire)
    const nextPlayerId = isPlayer1 ? match.player2Id : match.player1Id;
    const nextPlayer = isPlayer1 ? match.player2 : match.player1;
    const nextQuestion = await getRandomQuestion(
      nextPlayer.gradeLevel,
      (nextPlayer.activeSubjects as string[]) || ['MATHS', 'FRANCAIS'],
    );
    updateData.currentTurnId = nextPlayerId;
    updateData.currentQuestionId = nextQuestion?.id;
    updateData.waitingForAnswer = true;
  }

  // Mettre à jour le match
  await prisma.pvpMatch.update({
    where: { id: matchId },
    data: updateData,
  });

  // Enregistrer le tour
  await prisma.pvpTurn.create({
    data: {
      matchId,
      playerId: userId,
      turnNumber: (match.turnNumber ?? 0) + 1,
      questionId: question.id,
      answerIndex,
      isCorrect,
      damageDealt,
      questionText: question.questionText,
      questionOptions: question.options as unknown as object,
      correctIndex: question.correctIndex,
      targetPokemonIndex: defenderActiveIndex,
    },
  });

  // Donner l'XP au gagnant si terminé
  if (gameOver && winnerId) {
    await prisma.user.update({
      where: { id: winnerId },
      data: { globalXp: { increment: match.xpReward ?? 50 } },
    });

    // Remettre les joueurs disponibles
    await prisma.onlinePlayer.updateMany({
      where: { userId: { in: [match.player1Id, match.player2Id] } },
      data: { status: 'available' },
    });
  }

  return {
    success: true,
    isCorrect,
    damageDealt,
    gameOver,
    winnerId,
    nextTurnId: gameOver ? undefined : (isPlayer1 ? match.player2Id : match.player1Id),
    message: isCorrect ? 'Bonne réponse!' : 'Mauvaise réponse',
  };
}

/**
 * Utilise un item pendant le combat PvP
 */
export async function useItemInBattle(
  matchId: number,
  userId: number,
  itemId: string,
): Promise<{
  success: boolean;
  effect?: ItemEffect;
  skipTurn?: boolean;
  message: string;
}> {
  const match = await prisma.pvpMatch.findUnique({ where: { id: matchId } });

  if (!match) {
    return { success: false, message: 'Match non trouvé' };
  }
  if (match.currentTurnId !== userId) {
    return { success: false, message: 'Ce n\'est pas ton tour' };
  }

  // Utiliser l'item
  const result = await useItem(userId, itemId);
  if (!result.success || !result.effect) {
    return { success: false, message: result.message };
  }

  const effect = result.effect;
  const isPlayer1 = userId === match.player1Id;

  // Appliquer l'effet
  let teamHp = isPlayer1
    ? (match.player1TeamHp as number[])
    : (match.player2TeamHp as number[]);
  const activeIndex = isPlayer1
    ? (match.player1ActivePokemon ?? 0)
    : (match.player2ActivePokemon ?? 0);
  const team = isPlayer1
    ? (match.player1Team as unknown as PokemonData[])
    : (match.player2Team as unknown as PokemonData[]);

  let opponentTeamHp = isPlayer1
    ? (match.player2TeamHp as number[])
    : (match.player1TeamHp as number[]);
  const opponentActiveIndex = isPlayer1
    ? (match.player2ActivePokemon ?? 0)
    : (match.player1ActivePokemon ?? 0);

  switch (effect.type) {
    case 'HEAL':
      teamHp[activeIndex] = Math.min(team[activeIndex].maxHp, teamHp[activeIndex] + effect.value);
      break;
    case 'HEAL_TEAM':
      teamHp = teamHp.map((hp, i) => Math.min(team[i].maxHp, hp + effect.value));
      break;
    case 'DMG_FLAT':
    case 'TRAITOR':
      opponentTeamHp[opponentActiveIndex] = Math.max(0, opponentTeamHp[opponentActiveIndex] - effect.value);
      break;
    // Les autres effets (BUFF, STATUS) sont gérés côté frontend pour simplifier
  }

  // Mettre à jour les HPs
  const updateData: Record<string, unknown> = {};
  if (isPlayer1) {
    updateData.player1TeamHp = teamHp;
    updateData.player2TeamHp = opponentTeamHp;
  } else {
    updateData.player2TeamHp = teamHp;
    updateData.player1TeamHp = opponentTeamHp;
  }

  await prisma.pvpMatch.update({
    where: { id: matchId },
    data: updateData,
  });

  // Enregistrer l'action dans l'historique
  await prisma.pvpTurn.create({
    data: {
      matchId,
      playerId: userId,
      turnNumber: (match.turnNumber ?? 0) + 1,
      itemUsed: itemId,
      itemEffect: effect as unknown as object,
      damageDealt: effect.type === 'DMG_FLAT' || effect.type === 'TRAITOR' ? effect.value : 0,
    },
  });

  return {
    success: true,
    effect,
    skipTurn: false, // En PvP, utiliser un item ne fait pas passer le tour
    message: effect.message,
  };
}

/**
 * Abandonne un match
 */
export async function forfeitMatch(
  matchId: number,
  userId: number,
): Promise<{ success: boolean; winnerId?: number; message: string }> {
  const match = await prisma.pvpMatch.findUnique({ where: { id: matchId } });

  if (!match) {
    return { success: false, message: 'Match non trouvé' };
  }
  if (match.player1Id !== userId && match.player2Id !== userId) {
    return { success: false, message: 'Tu ne fais pas partie de ce match' };
  }
  if (match.status === 'COMPLETED' || match.status === 'ABANDONED') {
    return { success: false, message: 'Match déjà terminé' };
  }

  const winnerId = match.player1Id === userId ? match.player2Id : match.player1Id;

  await prisma.pvpMatch.update({
    where: { id: matchId },
    data: {
      status: 'ABANDONED',
      winnerId,
      endedAt: new Date(),
    },
  });

  // Donner l'XP au gagnant
  await prisma.user.update({
    where: { id: winnerId },
    data: { globalXp: { increment: match.xpReward ?? 50 } },
  });

  // Remettre les joueurs disponibles
  await prisma.onlinePlayer.updateMany({
    where: { userId: { in: [match.player1Id, match.player2Id] } },
    data: { status: 'available' },
  });

  return { success: true, winnerId, message: 'Match abandonné' };
}
