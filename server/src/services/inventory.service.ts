import { prisma } from '../config/database.js';
import type { Item, Inventory } from '@prisma/client';

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
    name: inv.item.name,
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
): Promise<{ success: boolean; effect?: ItemEffect; message: string }> {
  const inventory = await prisma.inventory.findUnique({
    where: { userId_itemId: { userId, itemId } },
    include: { item: true },
  });

  if (!inventory || inventory.quantity <= 0) {
    return { success: false, message: 'Item non disponible' };
  }

  // Décrémente la quantité
  await prisma.inventory.update({
    where: { userId_itemId: { userId, itemId } },
    data: { quantity: { decrement: 1 } },
  });

  const effect = getItemEffect(inventory.item);
  return { success: true, effect, message: `${inventory.item.name} utilisé!` };
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
