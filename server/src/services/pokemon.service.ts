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
  currentXp?: number;
  nextLevelXp?: number;
  isTeam?: boolean;
  stats?: { hp: number; atk: number; def: number; spe: number };
  type?: string;
}

// Noms français des 151 premiers Pokémon (Génération 1)
const POKEMON_NAMES: Record<number, string> = {
  1: 'Bulbizarre', 2: 'Herbizarre', 3: 'Florizarre', 4: 'Salamèche', 5: 'Reptincel',
  6: 'Dracaufeu', 7: 'Carapuce', 8: 'Carabaffe', 9: 'Tortank', 10: 'Chenipan',
  11: 'Chrysacier', 12: 'Papilusion', 13: 'Aspicot', 14: 'Coconfort', 15: 'Dardargnan',
  16: 'Roucool', 17: 'Roucoups', 18: 'Roucarnage', 19: 'Rattata', 20: 'Rattatac',
  21: 'Piafabec', 22: 'Rapasdepic', 23: 'Abo', 24: 'Arbok', 25: 'Pikachu',
  26: 'Raichu', 27: 'Sabelette', 28: 'Sablaireau', 29: 'Nidoran♀', 30: 'Nidorina',
  31: 'Nidoqueen', 32: 'Nidoran♂', 33: 'Nidorino', 34: 'Nidoking', 35: 'Mélofée',
  36: 'Mélodelfe', 37: 'Goupix', 38: 'Feunard', 39: 'Rondoudou', 40: 'Grodoudou',
  41: 'Nosferapti', 42: 'Nosferalto', 43: 'Mystherbe', 44: 'Ortide', 45: 'Rafflesia',
  46: 'Paras', 47: 'Parasect', 48: 'Mimitoss', 49: 'Aéromite', 50: 'Taupiqueur',
  51: 'Triopikeur', 52: 'Miaouss', 53: 'Persian', 54: 'Psykokwak', 55: 'Akwakwak',
  56: 'Férosinge', 57: 'Colossinge', 58: 'Caninos', 59: 'Arcanin', 60: 'Ptitard',
  61: 'Têtarte', 62: 'Tartard', 63: 'Abra', 64: 'Kadabra', 65: 'Alakazam',
  66: 'Machoc', 67: 'Machopeur', 68: 'Mackogneur', 69: 'Chétiflor', 70: 'Boustiflor',
  71: 'Empiflor', 72: 'Tentacool', 73: 'Tentacruel', 74: 'Racaillou', 75: 'Gravalanch',
  76: 'Grolem', 77: 'Ponyta', 78: 'Galopa', 79: 'Ramoloss', 80: 'Flagadoss',
  81: 'Magnéti', 82: 'Magnéton', 83: 'Canarticho', 84: 'Doduo', 85: 'Dodrio',
  86: 'Otaria', 87: 'Lamantine', 88: 'Tadmorv', 89: 'Grotadmorv', 90: 'Kokiyas',
  91: 'Crustabri', 92: 'Fantominus', 93: 'Spectrum', 94: 'Ectoplasma', 95: 'Onix',
  96: 'Soporifik', 97: 'Hypnomade', 98: 'Krabby', 99: 'Krabboss', 100: 'Voltorbe',
  101: 'Électrode', 102: 'Noeunoeuf', 103: 'Noadkoko', 104: 'Osselait', 105: 'Ossatueur',
  106: 'Kicklee', 107: 'Tygnon', 108: 'Excelangue', 109: 'Smogo', 110: 'Smogogo',
  111: 'Rhinocorne', 112: 'Rhinoféros', 113: 'Leveinard', 114: 'Saquedeneu', 115: 'Kangourex',
  116: 'Hypotrempe', 117: 'Hypocéan', 118: 'Poissirène', 119: 'Poissoroy', 120: 'Stari',
  121: 'Staross', 122: 'M. Mime', 123: 'Insécateur', 124: 'Lippoutou', 125: 'Élektek',
  126: 'Magmar', 127: 'Scarabrute', 128: 'Tauros', 129: 'Magicarpe', 130: 'Léviator',
  131: 'Lokhlass', 132: 'Métamorph', 133: 'Évoli', 134: 'Aquali', 135: 'Voltali',
  136: 'Pyroli', 137: 'Porygon', 138: 'Amonita', 139: 'Amonistar', 140: 'Kabuto',
  141: 'Kabutops', 142: 'Ptéra', 143: 'Ronflex', 144: 'Artikodin', 145: 'Électhor',
  146: 'Sulfura', 147: 'Minidraco', 148: 'Draco', 149: 'Dracolosse', 150: 'Mewtwo', 151: 'Mew',
};

// Types principaux des 151 Pokémon (Gen 1, noms français Tyradex)
const POKEMON_TYPES: Record<number, string> = {
  1:'Plante',2:'Plante',3:'Plante',4:'Feu',5:'Feu',6:'Feu',7:'Eau',8:'Eau',9:'Eau',
  10:'Insecte',11:'Insecte',12:'Insecte',13:'Insecte',14:'Insecte',15:'Insecte',
  16:'Normal',17:'Normal',18:'Normal',19:'Normal',20:'Normal',
  21:'Normal',22:'Normal',23:'Poison',24:'Poison',25:'Électrik',26:'Électrik',
  27:'Sol',28:'Sol',29:'Poison',30:'Poison',31:'Poison',32:'Poison',33:'Poison',34:'Poison',
  35:'Fée',36:'Fée',37:'Feu',38:'Feu',39:'Normal',40:'Normal',
  41:'Poison',42:'Poison',43:'Plante',44:'Plante',45:'Plante',46:'Insecte',47:'Insecte',
  48:'Insecte',49:'Insecte',50:'Sol',51:'Sol',52:'Normal',53:'Normal',
  54:'Eau',55:'Eau',56:'Combat',57:'Combat',58:'Feu',59:'Feu',60:'Eau',
  61:'Eau',62:'Eau',63:'Psy',64:'Psy',65:'Psy',66:'Combat',67:'Combat',68:'Combat',
  69:'Plante',70:'Plante',71:'Plante',72:'Eau',73:'Eau',74:'Roche',75:'Roche',76:'Roche',
  77:'Feu',78:'Feu',79:'Eau',80:'Eau',81:'Électrik',82:'Électrik',83:'Normal',
  84:'Normal',85:'Normal',86:'Eau',87:'Eau',88:'Poison',89:'Poison',90:'Eau',
  91:'Eau',92:'Spectre',93:'Spectre',94:'Spectre',95:'Roche',96:'Psy',97:'Psy',
  98:'Eau',99:'Eau',100:'Électrik',101:'Électrik',102:'Plante',103:'Plante',
  104:'Sol',105:'Sol',106:'Combat',107:'Combat',108:'Normal',109:'Poison',110:'Poison',
  111:'Sol',112:'Sol',113:'Normal',114:'Plante',115:'Normal',116:'Eau',117:'Eau',
  118:'Eau',119:'Eau',120:'Eau',121:'Eau',122:'Psy',123:'Insecte',124:'Glace',
  125:'Électrik',126:'Feu',127:'Insecte',128:'Normal',129:'Eau',130:'Eau',
  131:'Eau',132:'Normal',133:'Normal',134:'Eau',135:'Électrik',136:'Feu',
  137:'Normal',138:'Roche',139:'Roche',140:'Roche',141:'Roche',142:'Roche',
  143:'Normal',144:'Glace',145:'Électrik',146:'Feu',147:'Dragon',148:'Dragon',149:'Dragon',
  150:'Psy',151:'Psy',
};

export function getPokemonType(tyradexId: number): string {
  return POKEMON_TYPES[tyradexId] || 'Normal';
}

export function getPokemonName(tyradexId: number): string {
  return POKEMON_NAMES[tyradexId] || `Pokémon #${tyradexId}`;
}

import { TYRADEX_ASSETS_BASE } from '../config/assets.js';

function getSpriteUrl(tyradexId: number): string {
  return `${TYRADEX_ASSETS_BASE}/images/${tyradexId}/regular.png`;
}

export function calculateMaxHp(level: number, tyradexId: number): number {
  const baseHp = 20 + tyradexId % 30;
  return baseHp + level * 5;
}

// Stats de base approximatives (réutilise la logique du shop)
function getBaseStats(id: number): { hp: number; atk: number; def: number; spe: number } {
  const base = 40 + (id % 30);
  return { hp: base + 20, atk: base + 10, def: base + 5, spe: base };
}

function computeStatsForLevel(level: number, id: number) {
  const base = getBaseStats(id);
  // Simple scaling par niveau
  return {
    hp: Math.max(1, Math.floor(base.hp + (level - 1) * 5)),
    atk: Math.max(0, Math.floor(base.atk + (level - 1) * 2)),
    def: Math.max(0, Math.floor(base.def + (level - 1) * 1)),
    spe: Math.max(0, Math.floor(base.spe + (level - 1) * 1)),
  };
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
    const correctName = getPokemonName(p.tyradexId);
    return {
      id: p.id,
      tyradexId: p.tyradexId,
      level: p.level,
      name: correctName,
      spriteUrl: getSpriteUrl(p.tyradexId),
      currentHp: Math.min(p.currentHp, maxHp),
      maxHp,
      nickname: p.nickname,
      isTeam: !!p.isTeam,
      currentXp: p.currentXp,
      nextLevelXp: p.level * 100,
      stats: computeStatsForLevel(p.level, p.tyradexId),
      type: getPokemonType(p.tyradexId),
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
    const correctName = getPokemonName(p.tyradexId);
    return {
      id: p.id,
      tyradexId: p.tyradexId,
      level: p.level,
      name: correctName,
      spriteUrl: getSpriteUrl(p.tyradexId),
      currentHp: Math.min(p.currentHp, maxHp),
      maxHp,
      nickname: p.nickname,
      isTeam: !!p.isTeam,
      currentXp: p.currentXp,
      nextLevelXp: p.level * 100,
      stats: computeStatsForLevel(p.level, p.tyradexId),
      type: getPokemonType(p.tyradexId),
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
export async function addPokemonXp(pokemonId: string, xpAmount: number): Promise<{ leveledUp: boolean; newLevel: number; evolution?: boolean; sequence?: number[] }> {
  const pokemon = await prisma.userPokemon.findUnique({ where: { id: pokemonId } });
  if (!pokemon) return { leveledUp: false, newLevel: 0 };

  let newXp = pokemon.currentXp + xpAmount;
  let newLevel = pokemon.level;
  let leveledUp = false;
  let tyradexId = pokemon.tyradexId;
  let sequence: number[] = [tyradexId];
  let evolutionHappened = false;

  // Si déjà au niveau max, pas d'XP supplémentaire
  if (newLevel >= 100) {
    return { leveledUp: false, newLevel: 100 };
  }

  while (newLevel < 100) {
    const xpForNextLevel = newLevel * 100;
    if (newXp < xpForNextLevel) break;
    newXp -= xpForNextLevel;
    newLevel++;
    leveledUp = true;

    // Vérifier l'évolution à ce niveau
    const { getEvolutionChain } = await import('./evolution.service.js');
    const evoChain = await getEvolutionChain(tyradexId);
    if (evoChain && evoChain.next && evoChain.next.length > 0) {
      // Cherche une évolution qui correspond à la condition de niveau
      const nextEvo = evoChain.next.find(e => {
        if (!e.condition) return false;
        const match = e.condition.match(/Niveau (\d+)/);
        if (match) {
          const evoLevel = parseInt(match[1], 10);
          return newLevel >= evoLevel;
        }
        return false;
      });
      if (nextEvo) {
        tyradexId = nextEvo.pokedex_id;
        sequence.push(tyradexId);
        evolutionHappened = true;
      }
    }
  }

  // Cap XP at max level
  if (newLevel >= 100) {
    newXp = 0;
  }

  // Calculer les PV max après le level-up / évolution et remettre les PV au maximum
  const newMaxHp = calculateMaxHp(newLevel, tyradexId);

  // Update nickname to evolved Pokémon's name if evolution happened
  const updateData: any = { currentXp: newXp, level: newLevel, tyradexId, currentHp: newMaxHp };
  if (evolutionHappened) {
    updateData.nickname = getPokemonName(tyradexId);
  }

  await prisma.userPokemon.update({
    where: { id: pokemonId },
    data: updateData,
  });

  return { leveledUp, newLevel, evolution: evolutionHappened, sequence: evolutionHappened ? sequence : undefined };
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
