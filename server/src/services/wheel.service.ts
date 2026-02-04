import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';

export interface WheelPrize {
  type: 'tokens' | 'item' | 'pokemon' | 'nothing';
  value: number | string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

// Configuration des prix de la roue
const WHEEL_PRIZES: WheelPrize[] = [
  { type: 'tokens', value: 10, name: '10 Tokens', rarity: 'common' },
  { type: 'tokens', value: 25, name: '25 Tokens', rarity: 'common' },
  { type: 'tokens', value: 50, name: '50 Tokens', rarity: 'uncommon' },
  { type: 'tokens', value: 100, name: '100 Tokens', rarity: 'rare' },
  { type: 'tokens', value: 250, name: '250 Tokens', rarity: 'epic' },
  { type: 'nothing', value: 0, name: 'Rien...', rarity: 'common' },
  { type: 'item', value: 'potion', name: 'Potion', rarity: 'common' },
  { type: 'item', value: 'super_potion', name: 'Super Potion', rarity: 'uncommon' },
  { type: 'item', value: 'pokeball', name: 'Poké Ball', rarity: 'common' },
  { type: 'item', value: 'super_ball', name: 'Super Ball', rarity: 'uncommon' },
  { type: 'pokemon', value: 'random', name: 'Pokémon Mystère', rarity: 'rare' },
];

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

export async function spin(userId: number, usePaidSpin: boolean = false): Promise<{ prize: WheelPrize; reward: any }> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Vérifier si le joueur peut spinner
  const spinStatus = await canSpin(userId);
  
  if (!spinStatus.canSpin && !usePaidSpin) {
    throw new Error('No free spins available');
  }

  // Si spin payant (coûte 50 tokens)
  if (usePaidSpin && !spinStatus.canSpin) {
    const userTokens = user.tokens ?? 0;
    if (userTokens < 50) {
      throw new Error('Not enough tokens for paid spin');
    }
    
    await prisma.user.update({
      where: { id: userId },
      data: { tokens: { decrement: 50 } }
    });
  }

  // Sélectionner un prix basé sur les probabilités
  const prize = selectPrize();
  let reward: any = {};

  // Mettre à jour le temps du dernier spin
  lastSpinTimes.set(userId, new Date());

  // Appliquer le prix
  switch (prize.type) {
    case 'tokens':
      await prisma.user.update({
        where: { id: userId },
        data: { 
          tokens: { increment: prize.value as number }
        }
      });
      reward = { tokens: prize.value };
      break;

    case 'item':
      const item = await prisma.item.findFirst({
        where: { name: { contains: prize.name, mode: 'insensitive' } }
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
        // Item non trouvé, donner des tokens à la place
        await prisma.user.update({
          where: { id: userId },
          data: { tokens: { increment: 25 } }
        });
        reward = { tokens: 25, fallback: true };
      }
      break;

    case 'pokemon':
      // Donner un Pokémon aléatoire de niveau 5-15
      const tyradexId = Math.floor(Math.random() * 151) + 1;
      const level = 5 + Math.floor(Math.random() * 11);
      const pokemonNames: Record<number, string> = {
        1: 'Bulbizarre', 2: 'Herbizarre', 3: 'Florizarre', 4: 'Salamèche', 5: 'Reptincel',
        6: 'Dracaufeu', 7: 'Carapuce', 8: 'Carabaffe', 9: 'Tortank', 25: 'Pikachu',
        26: 'Raichu', 133: 'Évoli', 134: 'Aquali', 135: 'Voltali', 136: 'Pyroli',
      };
      const pokemonName = pokemonNames[tyradexId] || `Pokémon #${tyradexId}`;

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
      
      reward = { pokemon: { id: newPokemon.id, name: pokemonName, level } };
      break;

    case 'nothing':
    default:
      reward = { nothing: true };
      break;
  }

  logger.info(`User ${userId} spun the wheel and won: ${prize.name}`);
  
  return { prize, reward };
}

function selectPrize(): WheelPrize {
  // Calculer le poids total
  const totalWeight = WHEEL_PRIZES.reduce((sum, prize) => sum + RARITY_WEIGHTS[prize.rarity], 0);
  
  // Sélection aléatoire pondérée
  let random = Math.random() * totalWeight;
  
  for (const prize of WHEEL_PRIZES) {
    random -= RARITY_WEIGHTS[prize.rarity];
    if (random <= 0) {
      return prize;
    }
  }
  
  // Fallback
  return WHEEL_PRIZES[0];
}

export function getWheelConfig(): { prizes: WheelPrize[]; spinCost: number; cooldownHours: number } {
  return {
    prizes: WHEEL_PRIZES,
    spinCost: 50,
    cooldownHours: 4
  };
}
