import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import * as QuestionService from './question.service.js';
import * as PokemonService from './pokemon.service.js';
import type { GradeLevelType } from '@prisma/client';

export interface BattleState {
  sessionId: string;
  userId: number;
  userPokemon: {
    id: string;
    tyradexId: number;
    name: string;
    currentHp: number;
    maxHp: number;
    attack: number;
    defense: number;
    buffs: { atk: number; def: number };
  };
  enemyPokemon: {
    id: number;
    name: string;
    currentHp: number;
    maxHp: number;
    attack: number;
    defense: number;
    level: number;
    isWild: boolean;
    debuffs: { atk: number; def: number };
  };
  currentQuestion?: {
    id: number;
    text: string;
    options: string[];
    difficulty: number;
  };
  turn: number;
  phase: 'question' | 'result' | 'ended';
  log: string[];
}

// Stockage temporaire des sessions de combat (en production, utiliser Redis)
const activeBattles = new Map<string, BattleState>();

export function generateSessionId(): string {
  return `battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function startBattle(
  userId: number,
  userPokemonId: string,
  wildPokemonLevel?: number
): Promise<BattleState> {
  const userPokemon = await prisma.userPokemon.findFirst({
    where: { id: userPokemonId, userId }
  });

  if (!userPokemon) {
    throw new Error('Pokemon not found in your collection');
  }

  // Récupérer le niveau/subjects de l'utilisateur pour les questions
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  // Générer un Pokémon sauvage
  const level = wildPokemonLevel || Math.max(1, userPokemon.level - 2 + Math.floor(Math.random() * 5));
  const wildPokemonId = Math.floor(Math.random() * 151) + 1; // Pokémon 1-151
  
  const wildNames = ['Pikachu', 'Salamèche', 'Bulbizarre', 'Carapuce', 'Roucool', 'Rattata', 'Chenipan', 'Papilusion'];
  const wildName = wildNames[Math.floor(Math.random() * wildNames.length)];

  const baseHp = 30 + level * 5;
  const baseAtk = 10 + level * 2;
  const baseDef = 8 + level * 2;

  const sessionId = generateSessionId();
  
  // Calculer les stats du Pokémon utilisateur
  const userMaxHp = 20 + userPokemon.level * 5;
  const userAtk = 10 + userPokemon.level * 2;
  const userDef = 8 + userPokemon.level * 2;

  const battleState: BattleState = {
    sessionId,
    userId,
    userPokemon: {
      id: userPokemon.id,
      tyradexId: userPokemon.tyradexId,
      name: userPokemon.nickname || `Pokémon #${userPokemon.tyradexId}`,
      currentHp: userPokemon.currentHp,
      maxHp: userMaxHp,
      attack: userAtk,
      defense: userDef,
      buffs: { atk: 0, def: 0 }
    },
    enemyPokemon: {
      id: wildPokemonId,
      name: wildName,
      currentHp: baseHp,
      maxHp: baseHp,
      attack: baseAtk,
      defense: baseDef,
      level,
      isWild: true,
      debuffs: { atk: 0, def: 0 }
    },
    turn: 1,
    phase: 'question',
    log: [`Combat démarré contre ${wildName} sauvage (Nv.${level})!`]
  };

  // Obtenir la première question
  const question = await QuestionService.getRandomQuestion(
    user.gradeLevel,
    (user.activeSubjects as string[]) || ['MATHS', 'FRANCAIS']
  );
  if (question) {
    battleState.currentQuestion = {
      id: question.id,
      text: question.questionText,
      options: question.options,
      difficulty: question.difficulty === 'HARD' ? 3 : question.difficulty === 'MEDIUM' ? 2 : 1
    };
  }

  activeBattles.set(sessionId, battleState);
  return battleState;
}

export function getBattleState(sessionId: string): BattleState | null {
  return activeBattles.get(sessionId) || null;
}

export function calculateDamage(
  attackerAtk: number,
  defenderDef: number,
  atkBuff: number = 0,
  defDebuff: number = 0,
  isCorrect: boolean = true,
  difficulty: number = 1
): number {
  const effectiveAtk = attackerAtk * (1 + atkBuff * 0.2);
  const effectiveDef = defenderDef * (1 - defDebuff * 0.1);
  
  // Base damage formula
  let damage = Math.max(1, Math.floor((effectiveAtk * 2 - effectiveDef) / 2));
  
  // Bonus pour réponse correcte avec multiplicateur selon difficulté
  if (isCorrect) {
    const difficultyMultiplier = 1 + (difficulty - 1) * 0.25;
    damage = Math.floor(damage * difficultyMultiplier);
  } else {
    // Dégâts réduits pour réponse incorrecte
    damage = Math.floor(damage * 0.3);
  }
  
  // Variation aléatoire ±15%
  const variation = 0.85 + Math.random() * 0.3;
  damage = Math.floor(damage * variation);
  
  return Math.max(1, damage);
}

export async function submitAnswer(
  sessionId: string,
  answerId: number
): Promise<{ success: boolean; battleState: BattleState; result: any }> {
  const battle = activeBattles.get(sessionId);
  
  if (!battle) {
    throw new Error('Battle session not found');
  }

  if (battle.phase !== 'question' || !battle.currentQuestion) {
    throw new Error('Not in question phase');
  }

  // Vérifier la réponse
  const question = await QuestionService.getQuestionById(battle.currentQuestion.id);
  if (!question) {
    throw new Error('Question not found');
  }

  const correctAnswer = question.correctIndex;
  const isCorrect = answerId === correctAnswer;
  const difficultyNum = question.difficulty === 'HARD' ? 3 : question.difficulty === 'MEDIUM' ? 2 : 1;

  let result: any = {
    isCorrect,
    correctAnswer,
    yourAnswer: answerId
  };

  if (isCorrect) {
    // Le joueur attaque l'ennemi
    const damage = calculateDamage(
      battle.userPokemon.attack,
      battle.enemyPokemon.defense,
      battle.userPokemon.buffs.atk,
      battle.enemyPokemon.debuffs.def,
      true,
      difficultyNum
    );
    
    battle.enemyPokemon.currentHp = Math.max(0, battle.enemyPokemon.currentHp - damage);
    battle.log.push(`Bonne réponse! ${battle.userPokemon.name} inflige ${damage} dégâts à ${battle.enemyPokemon.name}!`);
    
    result.damage = damage;
    result.target = 'enemy';
    
    if (battle.enemyPokemon.currentHp <= 0) {
      // Victoire!
      battle.phase = 'ended';
      result.victory = true;
      
      // Donner XP et récompenses
      const xpGained = battle.enemyPokemon.level * 15 + Math.floor(Math.random() * 10);
      const tokensGained = battle.enemyPokemon.level * 5 + Math.floor(Math.random() * 5);
      
      await PokemonService.addPokemonXp(battle.userPokemon.id, xpGained);
      await prisma.user.update({
        where: { id: battle.userId },
        data: { tokens: { increment: tokensGained } }
      });
      
      result.rewards = { xp: xpGained, tokens: tokensGained };
      battle.log.push(`Victoire! ${battle.userPokemon.name} gagne ${xpGained} XP! Vous gagnez ${tokensGained} tokens!`);
      
      // Mettre à jour les HP du Pokémon du joueur dans la base
      await PokemonService.updatePokemonHp(battle.userPokemon.id, battle.userPokemon.currentHp);
      
      activeBattles.delete(sessionId);
    }
  } else {
    // L'ennemi attaque le joueur
    const damage = calculateDamage(
      battle.enemyPokemon.attack,
      battle.userPokemon.defense,
      -battle.enemyPokemon.debuffs.atk,
      -battle.userPokemon.buffs.def,
      true,
      1
    );
    
    battle.userPokemon.currentHp = Math.max(0, battle.userPokemon.currentHp - damage);
    battle.log.push(`Mauvaise réponse! ${battle.enemyPokemon.name} inflige ${damage} dégâts à ${battle.userPokemon.name}!`);
    
    result.damage = damage;
    result.target = 'player';
    
    if (battle.userPokemon.currentHp <= 0) {
      // Défaite
      battle.phase = 'ended';
      result.defeat = true;
      battle.log.push(`${battle.userPokemon.name} est K.O.! Défaite...`);
      
      // Mettre à jour les HP à 0
      await PokemonService.updatePokemonHp(battle.userPokemon.id, 0);
      
      activeBattles.delete(sessionId);
    }
  }

  // Si le combat continue, obtenir une nouvelle question
  if (battle.phase !== 'ended') {
    battle.turn++;
    battle.phase = 'question';
    
    // Récupérer l'utilisateur pour ses préférences
    const user = await prisma.user.findUnique({ where: { id: battle.userId } });
    const newQuestion = await QuestionService.getRandomQuestion(
      user?.gradeLevel || 'CE1',
      (user?.activeSubjects as string[]) || ['MATHS', 'FRANCAIS']
    );
    if (newQuestion) {
      battle.currentQuestion = {
        id: newQuestion.id,
        text: newQuestion.questionText,
        options: newQuestion.options,
        difficulty: newQuestion.difficulty === 'HARD' ? 3 : newQuestion.difficulty === 'MEDIUM' ? 2 : 1
      };
    }
  }

  return { success: true, battleState: battle, result };
}

export async function useItemInBattle(
  sessionId: string,
  itemId: string
): Promise<{ success: boolean; battleState: BattleState; effect: any }> {
  const battle = activeBattles.get(sessionId);
  
  if (!battle) {
    throw new Error('Battle session not found');
  }

  // Vérifier que le joueur possède l'item
  const inventory = await prisma.inventory.findUnique({
    where: { userId_itemId: { userId: battle.userId, itemId } },
    include: { item: true }
  });

  if (!inventory || inventory.quantity <= 0) {
    throw new Error('Item not found in inventory');
  }

  const item = inventory.item;
  let effect: any = { itemName: item.name };

  // Appliquer l'effet selon le type
  switch (item.effectType) {
    case 'HEAL':
      const healAmount = item.value || 30;
      const oldHp = battle.userPokemon.currentHp;
      battle.userPokemon.currentHp = Math.min(battle.userPokemon.maxHp, battle.userPokemon.currentHp + healAmount);
      effect.healed = battle.userPokemon.currentHp - oldHp;
      battle.log.push(`${item.name} utilisé! ${battle.userPokemon.name} récupère ${effect.healed} HP!`);
      break;

    case 'BUFF_ATK':
      battle.userPokemon.buffs.atk = Math.min(3, battle.userPokemon.buffs.atk + 1);
      effect.buffType = 'attack';
      battle.log.push(`${item.name} utilisé! L'attaque de ${battle.userPokemon.name} augmente!`);
      break;

    case 'BUFF_DEF':
      battle.userPokemon.buffs.def = Math.min(3, battle.userPokemon.buffs.def + 1);
      effect.buffType = 'defense';
      battle.log.push(`${item.name} utilisé! La défense de ${battle.userPokemon.name} augmente!`);
      break;

    case 'DMG_FLAT':
    case 'TRAITOR':
      const damage = item.value || 20;
      battle.enemyPokemon.currentHp = Math.max(0, battle.enemyPokemon.currentHp - damage);
      effect.damage = damage;
      battle.log.push(`${item.name} utilisé! ${battle.enemyPokemon.name} subit ${damage} dégâts!`);
      
      if (battle.enemyPokemon.currentHp <= 0) {
        battle.phase = 'ended';
        effect.victory = true;
        
        const xpGained = battle.enemyPokemon.level * 10;
        const tokensGained = battle.enemyPokemon.level * 3;
        
        await PokemonService.addPokemonXp(battle.userPokemon.id, xpGained);
        await prisma.user.update({
          where: { id: battle.userId },
          data: { tokens: { increment: tokensGained } }
        });
        
        effect.rewards = { xp: xpGained, tokens: tokensGained };
        await PokemonService.updatePokemonHp(battle.userPokemon.id, battle.userPokemon.currentHp);
        activeBattles.delete(sessionId);
      }
      break;

    case 'CAPTURE':
      if (battle.enemyPokemon.isWild) {
        const hpPercent = battle.enemyPokemon.currentHp / battle.enemyPokemon.maxHp;
        const captureRate = (item.value || 50) / 100;
        const chance = captureRate * (1 - hpPercent * 0.5);
        
        if (Math.random() < chance) {
          // Capture réussie! Générer un UUID pour le nouveau Pokémon
          const newPokemonId = `poke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const capturedPokemon = await prisma.userPokemon.create({
            data: {
              id: newPokemonId,
              userId: battle.userId,
              tyradexId: battle.enemyPokemon.id,
              nickname: battle.enemyPokemon.name,
              level: battle.enemyPokemon.level,
              currentHp: battle.enemyPokemon.currentHp,
              currentXp: 0,
              isTeam: false
            }
          });
          
          effect.captured = true;
          effect.pokemon = capturedPokemon;
          battle.phase = 'ended';
          battle.log.push(`${battle.enemyPokemon.name} capturé!`);
          await PokemonService.updatePokemonHp(battle.userPokemon.id, battle.userPokemon.currentHp);
          activeBattles.delete(sessionId);
        } else {
          effect.captured = false;
          battle.log.push(`${battle.enemyPokemon.name} s'est échappé de la ${item.name}!`);
        }
      } else {
        throw new Error('Cannot capture non-wild Pokemon');
      }
      break;

    case 'JOKER':
      // Révèle la bonne réponse
      if (battle.currentQuestion) {
        const question = await QuestionService.getQuestionById(battle.currentQuestion.id);
        if (question) {
          effect.correctAnswer = question.correctIndex;
          effect.hint = 'La bonne réponse a été révélée!';
          battle.log.push(`${item.name} utilisé! La réponse correcte est révélée.`);
        }
      }
      break;

    case 'STATUS_POISON':
      battle.enemyPokemon.debuffs.atk = Math.min(3, battle.enemyPokemon.debuffs.atk + 1);
      effect.statusApplied = 'poison';
      battle.log.push(`${item.name} utilisé! ${battle.enemyPokemon.name} est empoisonné!`);
      break;

    case 'STATUS_SLEEP':
      // Effet: l'ennemi passe un tour (implémenté via un flag)
      effect.statusApplied = 'sleep';
      battle.log.push(`${item.name} utilisé! ${battle.enemyPokemon.name} s'endort!`);
      break;

    default:
      battle.log.push(`${item.name} utilisé!`);
      effect.message = `Effet ${item.effectType} appliqué`;
  }

  // Consommer l'item
  await prisma.inventory.update({
    where: { userId_itemId: { userId: battle.userId, itemId } },
    data: { quantity: { decrement: 1 } }
  });

  return { success: true, battleState: battle, effect };
}

export async function fleeBattle(sessionId: string): Promise<{ success: boolean; escaped: boolean }> {
  const battle = activeBattles.get(sessionId);
  
  if (!battle) {
    throw new Error('Battle session not found');
  }

  // 70% de chance de fuir (augmente si HP bas)
  const hpPercent = battle.userPokemon.currentHp / battle.userPokemon.maxHp;
  const fleeChance = 0.7 + (1 - hpPercent) * 0.2;
  
  if (Math.random() < fleeChance) {
    // Fuite réussie
    await PokemonService.updatePokemonHp(battle.userPokemon.id, battle.userPokemon.currentHp);
    activeBattles.delete(sessionId);
    return { success: true, escaped: true };
  } else {
    // Fuite échouée - l'ennemi attaque
    const damage = calculateDamage(
      battle.enemyPokemon.attack,
      battle.userPokemon.defense,
      0, 0, true, 1
    );
    
    battle.userPokemon.currentHp = Math.max(0, battle.userPokemon.currentHp - damage);
    battle.log.push(`Fuite échouée! ${battle.enemyPokemon.name} inflige ${damage} dégâts!`);
    
    if (battle.userPokemon.currentHp <= 0) {
      battle.phase = 'ended';
      await PokemonService.updatePokemonHp(battle.userPokemon.id, 0);
      activeBattles.delete(sessionId);
    }
    
    return { success: true, escaped: false };
  }
}

// Nettoyer les sessions expirées (appelé périodiquement)
export function cleanupExpiredSessions(): void {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes
  
  for (const [sessionId, battle] of activeBattles.entries()) {
    const sessionTime = parseInt(sessionId.split('_')[1]);
    if (now - sessionTime > maxAge) {
      activeBattles.delete(sessionId);
      logger.info(`Cleaned up expired battle session: ${sessionId}`);
    }
  }
}
