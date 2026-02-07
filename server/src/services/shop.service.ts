import { getPokemonName } from './pokemon.service.js';
import { prisma } from '../config/database.js';

export interface ShopPokemon {
  id: string;
  pokedexId: number;
  name: { fr: string };
  types: { name: string }[];
  sprites: { regular: string };
  stats: { hp: number; atk: number; def: number; spe: number; vit: number };
  computedPrice: number;
  rarityLabel: string;
  ownedCount: number;
}

// Rareté basée sur l'ID du Pokémon
function getRarity(id: number): { label: string; priceMultiplier: number } {
  // Légendaires
  if ([144, 145, 146, 150, 151].includes(id)) return { label: 'LÉGENDAIRE', priceMultiplier: 40 };
  // Épiques (starters évolutions finales, pseudo-légendaires)
  if ([3, 6, 9, 131, 143, 149].includes(id)) return { label: 'ÉPIQUE', priceMultiplier: 16 };
  // Rares (évolutions intermédiaires, populaires)
  if ([2, 5, 8, 25, 26, 133, 134, 135, 136].includes(id) || id > 100) return { label: 'RARE', priceMultiplier: 6 };
  // Peu communs
  if (id > 50) return { label: 'PEU COMMUN', priceMultiplier: 3 };
  // Communs
  return { label: 'COMMUN', priceMultiplier: 1 };
}

// Types Pokémon approximatifs (simplifié)
const POKEMON_TYPES: Record<number, string[]> = {
  1: ['Plante', 'Poison'], 2: ['Plante', 'Poison'], 3: ['Plante', 'Poison'],
  4: ['Feu'], 5: ['Feu'], 6: ['Feu', 'Vol'],
  7: ['Eau'], 8: ['Eau'], 9: ['Eau'],
  25: ['Électrik'], 26: ['Électrik'],
  133: ['Normal'], 134: ['Eau'], 135: ['Électrik'], 136: ['Feu'],
};

// Stats de base approximatives
function getBaseStats(id: number): { hp: number; atk: number; def: number; spe: number; vit: number } {
  const base = 40 + (id % 30);
  return { hp: base + 20, atk: base + 10, def: base + 5, spe: base, vit: base + 15 };
}

// Génère la liste complète des 151 Pokémon à vendre
export function getShopPokemons(): ShopPokemon[] {
  const pokemons: ShopPokemon[] = [];
  
  for (let id = 1; id <= 151; id++) {
    const rarity = getRarity(id);
    const basePrice = 500;
    const types = POKEMON_TYPES[id] || ['Normal'];
    
    pokemons.push({
      id: `shop-${id}`,
      pokedexId: id,
      name: { fr: getPokemonName(id) },
      types: types.map(t => ({ name: t })),
      sprites: { regular: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png` },
      stats: getBaseStats(id),
      computedPrice: Math.floor(basePrice * rarity.priceMultiplier),
      rarityLabel: rarity.label,
      ownedCount: 0, // Sera mis à jour côté route si auth
    });
  }
  return pokemons;
}

// Génère des Pokémon pour un utilisateur (avec count owned)
export async function getShopPokemonsForUser(userId: number): Promise<ShopPokemon[]> {
  const pokemons = getShopPokemons();

  // Récupérer les Pokémon que l'utilisateur possède déjà
  const userPokemons = await prisma.userPokemon.findMany({
    where: { userId },
    select: { tyradexId: true, nickname: true },
  });

  const ownedMap = new Map<number, number>();
  userPokemons.forEach(p => {
    ownedMap.set(p.tyradexId, (ownedMap.get(p.tyradexId) || 0) + 1);
  });

  // Enrichir le mapping pour garantir nom FR, sprite, rareté, stats corrects
  return pokemons.map(p => {
    const ownedCount = ownedMap.get(p.pokedexId) || 0;
    return {
      ...p,
      name: { fr: p.name.fr },
      sprites: { regular: p.sprites.regular },
      rarityLabel: p.rarityLabel,
      stats: p.stats,
      ownedCount,
    };
  });
}

// Acheter un Pokémon
export async function buyPokemon(userId: number, pokedexId: number, price: number): Promise<{ success: boolean; message: string; newGold?: number }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, message: 'Utilisateur non trouvé' };
  if ((user.gold || 0) < price) return { success: false, message: 'Pas assez d\'or' };
  
  // Déduire l'or
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { gold: { decrement: price } },
  });
  
  // Ajouter le Pokémon
  const baseHp = 30 + (pokedexId % 30) + 5 * 5; // level 5
  await prisma.userPokemon.create({
    data: {
      id: `shop_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      userId,
      tyradexId: pokedexId,
      nickname: getPokemonName(pokedexId),
      level: 5,
      currentHp: baseHp,
      currentXp: 0,
      isTeam: false,
    },
  });
  
  return { success: true, message: `${getPokemonName(pokedexId)} recruté !`, newGold: updatedUser.gold ?? 0 };
}

// Vendre un Pokémon
export async function sellPokemon(userId: number, pokemonId: string): Promise<{ success: boolean; message: string; newGold?: number }> {
  const pokemon = await prisma.userPokemon.findFirst({
    where: { id: pokemonId, userId },
  });
  
  if (!pokemon) return { success: false, message: 'Pokémon non trouvé' };
  
  // Prix de vente = 50% du prix de base
  const rarity = getRarity(pokemon.tyradexId);
  const sellPrice = Math.floor(500 * rarity.priceMultiplier * 0.5);
  
  // Supprimer le Pokémon
  await prisma.userPokemon.delete({ where: { id: pokemonId } });
  
  // Ajouter l'or
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { gold: { increment: sellPrice } },
  });
  
  return { success: true, message: `+${sellPrice} pièces`, newGold: updatedUser.gold ?? 0 };
}
