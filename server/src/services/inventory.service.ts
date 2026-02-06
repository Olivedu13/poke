import { prisma } from '../config/database.js';
import type { Item, Inventory } from '@prisma/client';
import { displayNameForItem } from './itemDisplay.service.js';

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  effectType: string;
  value: number;
  quantity: number;
  price: number;
  rarity: string | null;
  image: string;
}

export interface ItemEffect {
  type: string;
  value: number;
  targetType: 'SELF' | 'ENEMY' | 'TEAM' | 'ENEMY_TEAM';
  message: string;
}

/**
 * Récupère l'inventaire complet d'un utilisateur
 */
export async function getUserInventory(userId: number): Promise<InventoryItem[]> {
  const inventory = await prisma.inventory.findMany({
    where: { userId, quantity: { gt: 0 } },
    include: { item: true },
  });

  return inventory.map((inv) => ({
    id: inv.item.id,
    name: displayNameForItem(inv.item),
    description: inv.item.description,
    effectType: inv.item.effectType,
    value: inv.item.value,
    quantity: inv.quantity,
    price: inv.item.price,
    rarity: inv.item.rarity,
    image: inv.item.image,
  }));
}

/**
 * Récupère tous les items disponibles dans le shop
 */
export async function getShopItems(): Promise<Item[]> {
  return prisma.item.findMany({
    orderBy: [{ rarity: 'asc' }, { price: 'asc' }],
  });
}

/**
 * Achète un item pour un utilisateur
 */
export async function buyItem(
  userId: number,
  itemId: string,
  quantity: number = 1,
): Promise<{ success: boolean; message: string; newGold?: number }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, message: 'Utilisateur non trouvé' };

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) return { success: false, message: 'Item non trouvé' };

  const totalCost = item.price * quantity;
  if ((user.gold ?? 0) < totalCost) {
    return { success: false, message: 'Pas assez d\'or' };
  }

  // Transaction: déduire l'or et ajouter l'item
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { gold: { decrement: totalCost } },
    }),
    prisma.inventory.upsert({
      where: { userId_itemId: { userId, itemId } },
      update: { quantity: { increment: quantity } },
      create: { userId, itemId, quantity },
    }),
  ]);

  const updatedUser = await prisma.user.findUnique({ where: { id: userId } });
  return { success: true, message: 'Achat réussi', newGold: updatedUser?.gold ?? 0 };
}

/**
 * Utilise un item et retourne son effet
 */
export async function useItem(
  userId: number,
  itemId: string,
  pokemonId?: string,
): Promise<{ success: boolean; effect?: ItemEffect; message: string; evolution?: boolean; sequence?: number[] }> {
  const inventory = await prisma.inventory.findUnique({
    where: { userId_itemId: { userId, itemId } },
    include: { item: true },
  });

  if (!inventory || inventory.quantity <= 0) {
    return { success: false, message: 'Item non disponible' };
  }

  const item = inventory.item;
  const effect = getItemEffect(item);

  // Apply HEAL effect to Pokemon
  if (item.effectType === 'HEAL' && pokemonId) {
    const pokemon = await prisma.userPokemon.findFirst({
      where: { id: pokemonId, userId },
    });
    if (!pokemon) {
      return { success: false, message: 'Pokémon non trouvé' };
    }
    // Calculate max HP based on level (same formula as elsewhere)
    const maxHp = 30 + (pokemon.tyradexId % 30) + pokemon.level * 5;
    // Heal based on percentage (value is percentage)
    const healAmount = Math.floor(maxHp * (item.value / 100));
    const newHp = Math.min(maxHp, pokemon.currentHp + healAmount);
    
    await prisma.$transaction([
      prisma.inventory.update({
        where: { userId_itemId: { userId, itemId } },
        data: { quantity: { decrement: 1 } },
      }),
      prisma.userPokemon.update({
        where: { id: pokemonId },
        data: { currentHp: newHp },
      }),
    ]);
    
    return { 
      success: true, 
      effect: { ...effect, message: `+${healAmount} PV` }, 
      message: `${item.name} utilisé! +${healAmount} PV` 
    };
  }

  // Apply HEAL_TEAM effect to all team Pokemon
  if (item.effectType === 'HEAL_TEAM') {
    const teamPokemon = await prisma.userPokemon.findMany({
      where: { userId, isTeam: true },
    });
    
    if (teamPokemon.length === 0) {
      return { success: false, message: 'Aucun Pokémon dans l\'équipe' };
    }

    const updates = teamPokemon.map(pokemon => {
      const maxHp = 30 + (pokemon.tyradexId % 30) + pokemon.level * 5;
      const healAmount = Math.floor(maxHp * (item.value / 100));
      const newHp = Math.min(maxHp, pokemon.currentHp + healAmount);
      return prisma.userPokemon.update({
        where: { id: pokemon.id },
        data: { currentHp: newHp },
      });
    });

    await prisma.$transaction([
      prisma.inventory.update({
        where: { userId_itemId: { userId, itemId } },
        data: { quantity: { decrement: 1 } },
      }),
      ...updates,
    ]);

    return { 
      success: true, 
      effect, 
      message: `${item.name} utilisé! Équipe soignée (${item.value}%)` 
    };
  }

  // Apply EVOLUTION effect (normal or ultimate)
  if ((item.effectType === 'EVOLUTION' || item.effectType === 'EVOLUTION_MAX') && pokemonId) {
    const pokemon = await prisma.userPokemon.findFirst({
      where: { id: pokemonId, userId },
    });
    if (!pokemon) {
      return { success: false, message: 'Pokémon non trouvé' };
    }

    // Get evolution chain from local Tyradex JSON
    try {
      const { getPokemonData } = await import('./evolution.service.js');
      const pokeData = await getPokemonData(pokemon.tyradexId);
      if (!pokeData || !pokeData.evolution || !pokeData.evolution.next || pokeData.evolution.next.length === 0) {
        return { success: false, message: 'Ce Pokémon ne peut pas évoluer' };
      }

      let newTyradexId: number;
      let sequence: number[];
      let newLevel = pokemon.level;

      // detect ultimate even when DB stores as EVOLUTION with value or naming
      const idStr = (item.id || '').toString().toLowerCase();
      const nameStr = (item.name || '').toString();
      const descStr = (item.description || '')?.toString().toLowerCase() || '';
      const looksUltimate = item.effectType === 'EVOLUTION_MAX' || idStr.includes('ult') || /ultim|maxim/i.test(nameStr) || /ultim|maxim/i.test(descStr) || (typeof item.value === 'number' && item.value >= 3);

      if (looksUltimate) {
        // Build full evolution chain (follow first branch at each step)
        sequence = [pokemon.tyradexId];
        let curId = pokemon.tyradexId;
        // follow successive next evolutions until none
        // use evolution.service.getEvolutionChain for each step
        // Note: choose the first available next evolution at each step
        // to produce a deterministic full-chain
        // (covers multi-stage evolutions)
        // We already have pokeData for the starting pokemon
        let stepData = pokeData;
        while (stepData && stepData.evolution && Array.isArray(stepData.evolution.next) && stepData.evolution.next.length > 0) {
          const next = stepData.evolution.next[0];
          const nextId = next.pokedex_id;
          sequence.push(nextId);
          // load next step data
          try {
            const { getPokemonData } = await import('./evolution.service.js');
            stepData = await getPokemonData(nextId);
          } catch (e) {
            stepData = null;
          }
          curId = nextId;
        }
        newTyradexId = sequence[sequence.length - 1];
        newLevel = 100;
        // determine max XP from final form if available
        const finalData = await (async () => {
          try { const { getPokemonData } = await import('./evolution.service.js'); return await getPokemonData(newTyradexId); } catch (e) { return null; }
        })();
        const maxXp = finalData?.level_100 ?? pokeData.level_100 ?? 1250000;
        // will include currentXp in the final update
        var finalCurrentXp = maxXp;
      } else {
        const nextEvo = pokeData.evolution.next[0];
        newTyradexId = nextEvo.pokedex_id;
        sequence = [pokemon.tyradexId, newTyradexId];
      }

      // Recalculate HP for new evolution
      const newMaxHp = 30 + (newTyradexId % 30) + newLevel * 5;
      const oldMaxHp = 30 + (pokemon.tyradexId % 30) + pokemon.level * 5;
      let newHp: number;
      if (item.effectType === 'EVOLUTION_MAX') {
        // keep at full HP after ultimate evolution
        newHp = newMaxHp;
      } else {
        const hpRatio = pokemon.currentHp / oldMaxHp;
        newHp = Math.floor(newMaxHp * hpRatio);
      }

      // Update nickname to evolved Pokémon's name
      const { getPokemonName } = await import('./pokemon.service.js');
      const newNickname = getPokemonName(newTyradexId);

      const updateData: any = { tyradexId: newTyradexId, currentHp: newHp, level: newLevel, nickname: newNickname };
      if (typeof finalCurrentXp !== 'undefined') updateData.currentXp = finalCurrentXp;

      await prisma.$transaction([
        prisma.inventory.update({
          where: { userId_itemId: { userId, itemId } },
          data: { quantity: { decrement: 1 } },
        }),
        prisma.userPokemon.update({
          where: { id: pokemonId },
          data: updateData,
        }),
      ]);

      return {
        success: true,
        effect,
        message: `${item.name} utilisé! Évolution réussie!`,
        evolution: true,
        sequence,
      };
    } catch (error) {
      console.error('Evolution error:', error);
      return { success: false, message: 'Erreur lors de l\'évolution' };
    }
  }

  // Default: just decrement item (for battle-only items like buffs)
  await prisma.inventory.update({
    where: { userId_itemId: { userId, itemId } },
    data: { quantity: { decrement: 1 } },
  });

  return { success: true, effect, message: `${item.name} utilisé!` };
}

/**
 * Calcule l'effet d'un item
 */
function getItemEffect(item: Item): ItemEffect {
  const effectMap: Record<string, { targetType: ItemEffect['targetType']; message: string }> = {
    HEAL: { targetType: 'SELF', message: `Soigne ${item.value} PV` },
    HEAL_TEAM: { targetType: 'TEAM', message: `Soigne toute l'équipe de ${item.value} PV` },
    BUFF_ATK: { targetType: 'SELF', message: `Attaque +${item.value}% pour ce combat` },
    BUFF_DEF: { targetType: 'SELF', message: `Défense +${item.value}% pour ce combat` },
    DMG_FLAT: { targetType: 'ENEMY', message: `Inflige ${item.value} dégâts directs` },
    TRAITOR: { targetType: 'ENEMY', message: `Potion traître: ${item.value} dégâts à l'ennemi` },
    CAPTURE: { targetType: 'ENEMY', message: 'Tente de capturer le Pokémon' },
    JOKER: { targetType: 'SELF', message: 'Élimine 2 mauvaises réponses' },
    XP_BOOST: { targetType: 'SELF', message: `Gagne ${item.value} XP` },
    TOKEN_PACK: { targetType: 'SELF', message: `Gagne ${item.value} jetons` },
    EVOLUTION: { targetType: 'SELF', message: 'Fait évoluer le Pokémon' },
    EVOLUTION_MAX: { targetType: 'SELF', message: 'Évolution finale' },
    STATUS_SLEEP: { targetType: 'ENEMY', message: 'Endort l\'ennemi (passe 1 tour)' },
    STATUS_POISON: { targetType: 'ENEMY', message: `Empoisonne (-${item.value} PV/tour)` },
    SPECIAL_MIRROR: { targetType: 'ENEMY', message: 'Renvoie les dégâts' },
  };

  const config = effectMap[item.effectType] || { targetType: 'SELF' as const, message: 'Effet inconnu' };

  return {
    type: item.effectType,
    value: item.value,
    targetType: config.targetType,
    message: config.message,
  };
}

/**
 * Ajoute un item à l'inventaire (drop de combat, etc.)
 */
export async function addItemToInventory(userId: number, itemId: string, quantity: number = 1): Promise<void> {
  await prisma.inventory.upsert({
    where: { userId_itemId: { userId, itemId } },
    update: { quantity: { increment: quantity } },
    create: { userId, itemId, quantity },
  });
}

/**
 * Vend un item de l'inventaire
 */
export async function sellItem(
  userId: number,
  itemId: string,
  quantity: number = 1,
): Promise<{ success: boolean; message: string; newGold?: number }> {
  const inventory = await prisma.inventory.findUnique({
    where: { userId_itemId: { userId, itemId } },
    include: { item: true },
  });

  if (!inventory || inventory.quantity < quantity) {
    return { success: false, message: 'Quantité insuffisante' };
  }

  // Prix de vente = 50% du prix d'achat
  const sellPrice = Math.floor(inventory.item.price * 0.5 * quantity);

  // Transaction: réduire la quantité et ajouter l'or
  await prisma.$transaction([
    prisma.inventory.update({
      where: { userId_itemId: { userId, itemId } },
      data: { quantity: { decrement: quantity } },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { gold: { increment: sellPrice } },
    }),
  ]);

  const updatedUser = await prisma.user.findUnique({ where: { id: userId } });
  return { success: true, message: `+${sellPrice} pièces`, newGold: updatedUser?.gold ?? 0 };
}
