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

// Pokémon rares (évolutions finales, puissants)
const RARE_POKEMON_IDS = [
  3, 6, 9, // Starters finaux
  59, 65, 68, 94, // Arcanin, Alakazam, Mackogneur, Ectoplasma
  112, 115, 128, 130, 131, // Rhinoféros, Kangourex, Tauros, Léviator, Lokhlass
  132, 134, 135, 136, 137, 142, 143, // Métamorph, Évolitions, Porygon, Ptéra, Ronflex
  73, 76, 91, 103, 110, 121, 141, // Tentacruel, Grolem, Crustabri, Noadkoko, Smogogo, Staross, Kabutops
];

// Pokémon épiques (légendaires + pseudo-légendaires)
const EPIC_POKEMON_IDS = [
  144, 145, 146, // Oiseaux légendaires
  147, 148, 149, // Ligne Dracolosse
  150, 151,       // Mewtwo, Mew
];

// Multiplicateurs par palier de mise — proportionnels au coût
const BET_MULTIPLIERS: Record<number, number> = {
  1: 1,
  5: 8,
  10: 20
};

// Configuration des prix de la roue par palier
// Alternance stricte : GOLD → POKEMON → ITEM → XP → GOLD → ITEM → POKEMON → XP
// Aucun type adjacent identique (y compris wrap-around)
function generateWheelPrizes(bet: number = 1): WheelPrize[] {
  const mult = BET_MULTIPLIERS[bet] || 1;

  // Plus le bet est élevé, plus les pokémon sont probables
  const pokemonRarity: WheelPrize['rarity'] =
    bet >= 10 ? 'common' : bet >= 5 ? 'uncommon' : 'epic';

  // Items varient selon le palier de mise
  const item1 = bet >= 5
    ? { value: 'heal_r2' as string | number, id: 'heal_r2', name: 'Super Potion', label: 'SUPER POTION' }
    : { value: 'heal_r1' as string | number, id: 'heal_r1', name: 'Potion', label: 'POTION' };

  const item2 = bet >= 10
    ? { value: 'traitor_r1' as string | number, id: 'traitor_r1', name: 'Traître', label: 'TRAÎTRE' }
    : bet >= 5
      ? { value: 'atk_r1' as string | number, id: 'atk_r1', name: 'Boost Attaque', label: 'BOOST ATK' }
      : { value: 'pokeball' as string | number, id: 'pokeball', name: 'Poké Ball', label: 'POKÉBALL' };

  const segments: WheelPrize[] = [
    // 0: GOLD
    { type: 'GOLD', value: 100 * mult, name: `${100 * mult} Or`, label: `${100 * mult} OR`, rarity: 'common', color: '#fbbf24' },
    // 1: POKEMON (normal)
    { type: 'POKEMON', value: 'random', name: 'Pokémon Mystère', label: 'POKÉMON', rarity: pokemonRarity, color: '#ef4444' },
    // 2: ITEM (basique)
    { type: 'ITEM', ...item1, rarity: 'common', color: '#a855f7' },
    // 3: XP
    { type: 'XP', value: 200 * mult, name: `${200 * mult} XP`, label: `${200 * mult} XP`, rarity: 'common', color: '#3b82f6' },
    // 4: GOLD (JACKPOT)
    { type: 'GOLD', value: 10000 * (bet === 10 ? 5 : bet === 5 ? 2 : 1), name: 'JACKPOT', label: 'JACKPOT 💰', rarity: 'legendary', color: '#10b981' },
    // 5: ITEM (meilleur)
    { type: 'ITEM', ...item2, rarity: 'uncommon', color: '#a855f7' },
    // 6: POKEMON (rare/épique pour bet=10, sinon normal)
    { type: 'POKEMON', value: bet >= 10 ? 'rare_or_epic' : 'random', name: bet >= 10 ? 'Pokémon Rare ★' : 'Pokémon Mystère', label: bet >= 10 ? 'RARE ★' : 'POKÉMON', rarity: bet >= 10 ? 'rare' : pokemonRarity, color: bet >= 10 ? '#f59e0b' : '#ef4444' },
    // 7: XP
    { type: 'XP', value: 500 * mult, name: `${500 * mult} XP`, label: `${500 * mult} XP`, rarity: 'uncommon', color: '#3b82f6' },
  ];

  return segments;
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
      // Choisir le Pokémon selon la rareté du segment
      let tyradexId: number;
      let baseLevel: number;

      if (prize.value === 'rare_or_epic') {
        // 60% rare, 40% épique
        const isEpic = Math.random() < 0.4;
        const pool = isEpic ? EPIC_POKEMON_IDS : RARE_POKEMON_IDS;
        tyradexId = pool[Math.floor(Math.random() * pool.length)];
        baseLevel = isEpic ? 25 : 18;
        // Mettre à jour la rareté du prix pour le log
        prize.rarity = isEpic ? 'epic' : 'rare';
        prize.name = isEpic ? 'Pokémon Épique ★★' : 'Pokémon Rare ★';
      } else {
        tyradexId = Math.floor(Math.random() * 151) + 1;
        baseLevel = bet === 10 ? 15 : bet === 5 ? 10 : 5;
      }

      const level = baseLevel + Math.floor(Math.random() * (bet === 10 ? 10 : bet === 5 ? 6 : 3));
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
