import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { getPokemonName } from './pokemon.service.js';

export interface WheelPrize {
  type: 'GOLD' | 'XP' | 'ITEM' | 'POKEMON';
  value: number | string;
  id?: number | string;
  name: string;
  label: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  color: string;
}

// Multiplicateurs par palier de mise
const BET_MULTIPLIERS: Record<number, number> = {
  1: 1,
  5: 5,
  10: 15
};

// Configuration des prix de la roue par palier
function generateWheelPrizes(bet: number = 1): WheelPrize[] {
  const mult = BET_MULTIPLIERS[bet] || 1;
  
  return [
    { type: 'GOLD', value: 50 * mult, name: `${50 * mult} Or`, label: `${50 * mult} OR`, rarity: 'common', color: '#fbbf24' },
    { type: 'GOLD', value: 100 * mult, name: `${100 * mult} Or`, label: `${100 * mult} OR`, rarity: 'common', color: '#fbbf24' },
    { type: 'GOLD', value: 200 * mult, name: `${200 * mult} Or`, label: `${200 * mult} OR`, rarity: 'uncommon', color: '#fbbf24' },
    { type: 'XP', value: 100 * mult, name: `${100 * mult} XP`, label: `${100 * mult} XP`, rarity: 'common', color: '#3b82f6' },
    { type: 'XP', value: 250 * mult, name: `${250 * mult} XP`, label: `${250 * mult} XP`, rarity: 'uncommon', color: '#3b82f6' },
    { type: 'ITEM', value: 'heal_r1', id: 'heal_r1', name: 'Potion', label: 'OBJET', rarity: 'common', color: '#a855f7' },
    { type: 'ITEM', value: bet >= 5 ? 'heal_r2' : 'pokeball', id: bet >= 5 ? 'heal_r2' : 'pokeball', name: bet >= 5 ? 'Super Potion' : 'Poké Ball', label: 'OBJET', rarity: 'uncommon', color: '#a855f7' },
    { type: 'POKEMON', value: 'random', name: 'Pokémon Mystère', label: 'POKEMON', rarity: bet >= 10 ? 'uncommon' : 'rare', color: '#ef4444' },
    { type: 'GOLD', value: 10000 * (bet === 10 ? 3 : bet === 5 ? 1.5 : 1), name: 'JACKPOT', label: 'JACKPOT 💰', rarity: 'legendary', color: '#10b981' },
  ];
}

// Probabilités basées sur la rareté
const RARITY_WEIGHTS: Record<string, number> = {
  common: 40,
  uncommon: 25,
  rare: 15,
  epic: 8,
  legendary: 2
};

// Stockage en mémoire du dernier spin (en production, utiliser Redis ou la DB)
const lastSpinTimes = new Map<number, Date>();

export async function canSpin(userId: number): Promise<{ canSpin: boolean; nextSpinAt?: Date; freeSpins: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const now = new Date();
  // Utiliser le stockage en mémoire ou DB si lastSpinAt existe
  const lastSpin = lastSpinTimes.get(userId);
  
  // Un spin gratuit toutes les 4 heures
  const spinCooldown = 4 * 60 * 60 * 1000; // 4 heures en ms
  
  if (!lastSpin) {
    return { canSpin: true, freeSpins: 1 };
  }

  const timeSinceLastSpin = now.getTime() - lastSpin.getTime();
  const accumulatedSpins = Math.floor(timeSinceLastSpin / spinCooldown);
  const freeSpins = Math.min(3, accumulatedSpins); // Max 3 spins accumulés

  if (freeSpins > 0) {
    return { canSpin: true, freeSpins };
  }

  const nextSpinAt = new Date(lastSpin.getTime() + spinCooldown);
  return { canSpin: false, nextSpinAt, freeSpins: 0 };
}

export async function spin(userId: number, bet: number = 1): Promise<{ prize: WheelPrize; reward: any; segments: WheelPrize[]; result_index: number; new_gold?: number; new_xp?: number; new_tokens?: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Valider le bet (1, 5, ou 10)
  const validBets = [1, 5, 10];
  if (!validBets.includes(bet)) {
    throw new Error('Invalid bet amount');
  }

  // Vérifier les tokens
  const userTokens = user.tokens ?? 0;
  if (userTokens < bet) {
    throw new Error('Not enough tokens');
  }
  
  // Déduire les tokens
  await prisma.user.update({
    where: { id: userId },
    data: { tokens: { decrement: bet } }
  });

  // Générer les prix pour ce palier
  const segments = generateWheelPrizes(bet);
  
  // Sélectionner un prix basé sur les probabilités
  const resultIndex = selectPrizeIndex(segments);
  const prize = segments[resultIndex];
  let reward: any = {};

  // Mettre à jour le temps du dernier spin
  lastSpinTimes.set(userId, new Date());

  // Variables pour retourner l'état actuel
  let newGold = user.gold ?? 0;
  let newXp = user.globalXp ?? 0;
  let newTokens = (user.tokens ?? 0) - bet;

  // Appliquer le prix
  switch (prize.type) {
    case 'GOLD':
      const goldAmount = typeof prize.value === 'number' ? prize.value : parseInt(String(prize.value)) || 0;
      await prisma.user.update({
        where: { id: userId },
        data: { gold: { increment: goldAmount } }
      });
      newGold += goldAmount;
      reward = { gold: goldAmount };
      break;

    case 'XP':
      const xpAmount = typeof prize.value === 'number' ? prize.value : parseInt(String(prize.value)) || 0;
      await prisma.user.update({
        where: { id: userId },
        data: { globalXp: { increment: xpAmount } }
      });
      newXp += xpAmount;
      reward = { xp: xpAmount };
      break;

    case 'ITEM':
      const itemId = String(prize.id || prize.value);
      const item = await prisma.item.findFirst({
        where: { 
          OR: [
            { id: { contains: itemId, mode: 'insensitive' } },
            { name: { contains: prize.name, mode: 'insensitive' } }
          ]
        }
      });

      if (item) {
        const existingInventory = await prisma.inventory.findUnique({
          where: { userId_itemId: { userId, itemId: item.id } }
        });

        if (existingInventory) {
          await prisma.inventory.update({
            where: { userId_itemId: { userId, itemId: item.id } },
            data: { quantity: { increment: 1 } }
          });
        } else {
          await prisma.inventory.create({
            data: { userId, itemId: item.id, quantity: 1 }
          });
        }
        reward = { item: item.name };
      } else {
        // Item non trouvé, donner de l'or à la place
        const fallbackGold = 50 * (BET_MULTIPLIERS[bet] || 1);
        await prisma.user.update({
          where: { id: userId },
          data: { gold: { increment: fallbackGold } }
        });
        newGold += fallbackGold;
        reward = { gold: fallbackGold, fallback: true };
      }
      break;

    case 'POKEMON':
      // Donner un Pokémon aléatoire, niveau basé sur la mise
      const baseLevel = bet === 10 ? 10 : bet === 5 ? 7 : 5;
      const tyradexId = Math.floor(Math.random() * 151) + 1;
      const level = baseLevel + Math.floor(Math.random() * 6);
      const pokemonName = getPokemonName(tyradexId);

      const newPokemonId = `wheel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newPokemon = await prisma.userPokemon.create({
        data: {
          id: newPokemonId,
          userId,
          tyradexId,
          nickname: pokemonName,
          level,
          currentXp: 0,
          currentHp: 30 + level * 5,
          isTeam: false
        }
      });
      
      // Update prize with actual Pokemon id for frontend
      prize.id = tyradexId;
      reward = { pokemon: { id: newPokemon.id, tyradexId, name: pokemonName, level } };
      break;

    default:
      reward = { nothing: true };
      break;
  }

  logger.info(`User ${userId} spun the wheel (bet: ${bet}) and won: ${prize.name}`);
  
  return { 
    prize, 
    reward, 
    segments, 
    result_index: resultIndex,
    new_gold: newGold,
    new_xp: newXp,
    new_tokens: newTokens
  };
}

function selectPrizeIndex(segments: WheelPrize[]): number {
  // Calculer le poids total
  const totalWeight = segments.reduce((sum, prize) => sum + RARITY_WEIGHTS[prize.rarity], 0);
  
  // Sélection aléatoire pondérée
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < segments.length; i++) {
    random -= RARITY_WEIGHTS[segments[i].rarity];
    if (random <= 0) {
      return i;
    }
  }
  
  // Fallback
  return 0;
}

export function getWheelConfig(bet: number = 1): { prizes: WheelPrize[]; spinCost: number } {
  return {
    prizes: generateWheelPrizes(bet),
    spinCost: bet
  };
}
