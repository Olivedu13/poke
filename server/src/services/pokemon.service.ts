import { prisma } from '../config/database.js';

export interface PokemonData {
  id: string;
  tyradexId: number;
  level: number;
  name: string;
  spriteUrl: string;
  currentHp: number;
  maxHp: number;
  nickname: string | null;
}

const POKEMON_NAMES: Record<number, string> = {
  1: 'Bulbizarre', 2: 'Herbizarre', 3: 'Florizarre', 4: 'Salamèche', 5: 'Reptincel',
  6: 'Dracaufeu', 7: 'Carapuce', 8: 'Carabaffe', 9: 'Tortank', 25: 'Pikachu',
  26: 'Raichu', 133: 'Évoli', 134: 'Aquali', 135: 'Voltali', 136: 'Pyroli',
};

function getPokemonName(tyradexId: number): string {
  return POKEMON_NAMES[tyradexId] || `Pokémon #${tyradexId}`;
}

function getSpriteUrl(tyradexId: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${tyradexId}.png`;
}

function calculateMaxHp(level: number, tyradexId: number): number {
  const baseHp = 20 + tyradexId % 30;
  return baseHp + level * 5;
}

/**
 * Récupère l'équipe active d'un utilisateur (max 3 Pokémon avec is_team = true)
 */
export async function getUserTeam(userId: number): Promise<PokemonData[]> {
  const pokemons = await prisma.userPokemon.findMany({
    where: { userId, isTeam: true },
    orderBy: { obtainedAt: 'asc' },
    take: 3,
  });

  return pokemons.map((p) => {
    const maxHp = calculateMaxHp(p.level, p.tyradexId);
    return {
      id: p.id,
      tyradexId: p.tyradexId,
      level: p.level,
      name: p.nickname || getPokemonName(p.tyradexId),
      spriteUrl: getSpriteUrl(p.tyradexId),
      currentHp: Math.min(p.currentHp, maxHp),
      maxHp,
      nickname: p.nickname,
    };
  });
}

/**
 * Récupère toute la collection d'un utilisateur
 */
export async function getUserCollection(userId: number): Promise<PokemonData[]> {
  const pokemons = await prisma.userPokemon.findMany({
    where: { userId },
    orderBy: { obtainedAt: 'desc' },
  });

  return pokemons.map((p) => {
    const maxHp = calculateMaxHp(p.level, p.tyradexId);
    return {
      id: p.id,
      tyradexId: p.tyradexId,
      level: p.level,
      name: p.nickname || getPokemonName(p.tyradexId),
      spriteUrl: getSpriteUrl(p.tyradexId),
      currentHp: Math.min(p.currentHp, maxHp),
      maxHp,
      nickname: p.nickname,
    };
  });
}

/**
 * Met à jour les HP d'un Pokémon
 */
export async function updatePokemonHp(pokemonId: string, newHp: number): Promise<void> {
  await prisma.userPokemon.update({
    where: { id: pokemonId },
    data: { currentHp: Math.max(0, newHp) },
  });
}

/**
 * Ajoute de l'XP à un Pokémon et gère le level up
 */
export async function addPokemonXp(pokemonId: string, xpAmount: number): Promise<{ leveledUp: boolean; newLevel: number }> {
  const pokemon = await prisma.userPokemon.findUnique({ where: { id: pokemonId } });
  if (!pokemon) return { leveledUp: false, newLevel: 0 };

  const xpForNextLevel = pokemon.level * 100;
  let newXp = pokemon.currentXp + xpAmount;
  let newLevel = pokemon.level;
  let leveledUp = false;

  while (newXp >= xpForNextLevel && newLevel < 100) {
    newXp -= xpForNextLevel;
    newLevel++;
    leveledUp = true;
  }

  await prisma.userPokemon.update({
    where: { id: pokemonId },
    data: { currentXp: newXp, level: newLevel },
  });

  return { leveledUp, newLevel };
}

/**
 * Soigne tous les Pokémon d'un utilisateur
 */
export async function healAllPokemon(userId: number): Promise<void> {
  const pokemons = await prisma.userPokemon.findMany({ where: { userId } });
  
  for (const p of pokemons) {
    const maxHp = calculateMaxHp(p.level, p.tyradexId);
    await prisma.userPokemon.update({
      where: { id: p.id },
      data: { currentHp: maxHp },
    });
  }
}
