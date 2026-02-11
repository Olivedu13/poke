/**
 * Table d'efficacité des types Pokémon (Gen 1 - noms français Tyradex)
 * 2 = Super efficace, 0.5 = Pas très efficace, 0 = Aucun effet, 1 = Normal
 * Clé: type attaquant → type défenseur → multiplicateur
 */
const TYPE_CHART: Record<string, Record<string, number>> = {
  Normal:    { Roche: 0.5, Spectre: 0, Acier: 0.5 },
  Feu:      { Feu: 0.5, Eau: 0.5, Plante: 2, Glace: 2, Insecte: 2, Roche: 0.5, Dragon: 0.5, Acier: 2 },
  Eau:      { Feu: 2, Eau: 0.5, Plante: 0.5, Sol: 2, Roche: 2, Dragon: 0.5 },
  Plante:   { Feu: 0.5, Eau: 2, Plante: 0.5, Poison: 0.5, Sol: 2, Vol: 0.5, Insecte: 0.5, Roche: 2, Dragon: 0.5, Acier: 0.5 },
  Électrik: { Eau: 2, Plante: 0.5, Électrik: 0.5, Sol: 0, Vol: 2, Dragon: 0.5 },
  Glace:    { Feu: 0.5, Eau: 0.5, Plante: 2, Glace: 0.5, Sol: 2, Vol: 2, Dragon: 2, Acier: 0.5 },
  Combat:   { Normal: 2, Glace: 2, Poison: 0.5, Vol: 0.5, Psy: 0.5, Insecte: 0.5, Roche: 2, Spectre: 0, Acier: 2, Fée: 0.5, Ténèbres: 2 },
  Poison:   { Plante: 2, Poison: 0.5, Sol: 0.5, Roche: 0.5, Spectre: 0.5, Acier: 0, Fée: 2 },
  Sol:      { Feu: 2, Plante: 0.5, Électrik: 2, Poison: 2, Vol: 0, Insecte: 0.5, Roche: 2, Acier: 2 },
  Vol:      { Plante: 2, Électrik: 0.5, Combat: 2, Insecte: 2, Roche: 0.5, Acier: 0.5 },
  Psy:      { Combat: 2, Poison: 2, Psy: 0.5, Ténèbres: 0, Acier: 0.5 },
  Insecte:  { Feu: 0.5, Plante: 2, Combat: 0.5, Poison: 0.5, Vol: 0.5, Psy: 2, Spectre: 0.5, Ténèbres: 2, Acier: 0.5, Fée: 0.5 },
  Roche:    { Feu: 2, Glace: 2, Combat: 0.5, Sol: 0.5, Vol: 2, Insecte: 2, Acier: 0.5 },
  Spectre:  { Normal: 0, Psy: 2, Spectre: 2, Ténèbres: 0.5 },
  Dragon:   { Dragon: 2, Acier: 0.5, Fée: 0 },
  Ténèbres: { Combat: 0.5, Psy: 2, Spectre: 2, Ténèbres: 0.5, Fée: 0.5 },
  Acier:    { Feu: 0.5, Eau: 0.5, Électrik: 0.5, Glace: 2, Roche: 2, Acier: 0.5, Fée: 2 },
  Fée:      { Feu: 0.5, Poison: 0.5, Combat: 2, Dragon: 2, Ténèbres: 2, Acier: 0.5 },
};

export interface TypeResult {
  multiplier: number;
  label: string;       // ex: "Super efficace !", "Pas très efficace..."
  emoji: string;       // ex: "🔥", "😐"
  color: string;       // Tailwind color for floating text
}

/**
 * Calcule le multiplicateur d'efficacité entre le type de l'attaquant et le(s) type(s) du défenseur
 * @param attackerType Type principal de l'attaquant (français) 
 * @param defenderType Type principal du défenseur (français)
 * @returns TypeResult avec multiplicateur et message
 */
export function getTypeEffectiveness(attackerType: string, defenderType: string): TypeResult {
  const atkType = normalizeTypeName(attackerType);
  const defType = normalizeTypeName(defenderType);
  
  const chart = TYPE_CHART[atkType];
  const multiplier = chart?.[defType] ?? 1;
  
  if (multiplier >= 2) {
    return { multiplier, label: 'Super efficace !', emoji: '💥', color: 'text-green-400' };
  } else if (multiplier === 0) {
    return { multiplier: 0.25, label: 'Aucun effet...', emoji: '🚫', color: 'text-gray-400' };
  } else if (multiplier <= 0.5) {
    return { multiplier, label: 'Pas très efficace...', emoji: '🛡️', color: 'text-orange-400' };
  }
  return { multiplier: 1, label: '', emoji: '', color: '' };
}

/**
 * Message d'indication de matchup avant/pendant le combat
 */
export function getMatchupHint(playerType: string, enemyType: string): { text: string; color: string; icon: string } | null {
  const result = getTypeEffectiveness(playerType, enemyType);
  const reverseResult = getTypeEffectiveness(enemyType, playerType);
  
  // Avantage du joueur
  if (result.multiplier >= 2 && reverseResult.multiplier <= 0.5) {
    return { text: 'Avantage de type !', color: 'text-green-400', icon: '⚔️' };
  }
  if (result.multiplier >= 2) {
    return { text: 'Attaques super efficaces !', color: 'text-green-400', icon: '💪' };
  }
  // Désavantage du joueur
  if (result.multiplier <= 0.5 && reverseResult.multiplier >= 2) {
    return { text: 'Désavantage de type !', color: 'text-red-400', icon: '⚠️' };
  }
  if (result.multiplier <= 0.5) {
    return { text: 'Attaques peu efficaces...', color: 'text-orange-400', icon: '🛡️' };
  }
  // Ennemi avantagé
  if (reverseResult.multiplier >= 2) {
    return { text: 'L\'ennemi est avantagé !', color: 'text-red-400', icon: '⚠️' };
  }
  
  return null; // Matchup neutre, pas de hint
}

/**
 * Normalise un nom de type (gère les variantes français/anglais)
 */
function normalizeTypeName(type: string): string {
  if (!type) return 'Normal';
  
  // Mapping anglais → français (au cas où)
  const EN_TO_FR: Record<string, string> = {
    'Fire': 'Feu', 'Water': 'Eau', 'Grass': 'Plante', 'Electric': 'Électrik',
    'Ice': 'Glace', 'Fighting': 'Combat', 'Poison': 'Poison', 'Ground': 'Sol',
    'Flying': 'Vol', 'Psychic': 'Psy', 'Bug': 'Insecte', 'Rock': 'Roche',
    'Ghost': 'Spectre', 'Dragon': 'Dragon', 'Dark': 'Ténèbres', 'Steel': 'Acier',
    'Fairy': 'Fée', 'Normal': 'Normal',
  };
  
  // Essayer d'abord le mapping anglais
  if (EN_TO_FR[type]) return EN_TO_FR[type];
  
  // Corriger la casse pour les types français
  const normalized = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  
  // Cas spéciaux d'accents
  const SPECIAL: Record<string, string> = {
    'Electrik': 'Électrik', 'Électrik': 'Électrik', 'électrik': 'Électrik',
    'Tenebre': 'Ténèbres', 'Ténèbres': 'Ténèbres', 'ténèbres': 'Ténèbres',
    'Tenebres': 'Ténèbres',
    'Fee': 'Fée', 'Fée': 'Fée', 'fée': 'Fée',
  };
  
  return SPECIAL[type] || SPECIAL[normalized] || normalized;
}

/**
 * Couleur d'affichage par type
 */
export const TYPE_COLORS: Record<string, string> = {
  Normal: '#A8A878', Feu: '#F08030', Eau: '#6890F0', Plante: '#78C850',
  Électrik: '#F8D030', Glace: '#98D8D8', Combat: '#C03028', Poison: '#A040A0',
  Sol: '#E0C068', Vol: '#A890F0', Psy: '#F85888', Insecte: '#A8B820',
  Roche: '#B8A038', Spectre: '#705898', Dragon: '#7038F8', Ténèbres: '#705848',
  Acier: '#B8B8D0', Fée: '#EE99AC',
};

/**
 * Obtenir le badge de couleur Tailwind pour un type
 */
export function getTypeBadgeClass(type: string): string {
  const t = normalizeTypeName(type);
  const map: Record<string, string> = {
    Normal: 'bg-gray-500',  Feu: 'bg-orange-500', Eau: 'bg-blue-500', Plante: 'bg-green-500',
    Électrik: 'bg-yellow-400 text-black', Glace: 'bg-cyan-300 text-black', Combat: 'bg-red-700',
    Poison: 'bg-purple-600', Sol: 'bg-amber-600', Vol: 'bg-indigo-400', Psy: 'bg-pink-500',
    Insecte: 'bg-lime-600', Roche: 'bg-amber-800', Spectre: 'bg-purple-800', Dragon: 'bg-indigo-700',
    Ténèbres: 'bg-stone-700', Acier: 'bg-slate-400 text-black', Fée: 'bg-pink-300 text-black',
  };
  return map[t] || 'bg-gray-500';
}
