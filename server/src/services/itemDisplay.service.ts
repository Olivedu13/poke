export function displayNameForItem(item: any): string {
  const id = (item.id || '').toString().toLowerCase();
  const name = (item.name || '').toString();
  const desc = (item.description || '').toString().toLowerCase();
  const val = Number(item.value || 0);

  // Evolution items
  if (item.effectType === 'EVOLUTION' || item.effectType === 'EVOLUTION_MAX') {
    if (id.includes('ult') || /ultim|maxim/i.test(name) || val >= 3 || /ultim|maxim/i.test(desc)) return "Potion Evolution Ultime";
    return "Potion Evolution";
  }

  // Heal items
  if (item.effectType === 'HEAL') {
    if (val >= 90 || /max|ultim/i.test(name) || /max|ultim/i.test(desc)) return "Soin Ultime";
    return "Potion de Soin";
  }
  if (item.effectType === 'HEAL_TEAM') {
    if (val >= 90) return "Soin Ultime (Équipe)";
    return "Potion Soin (Équipe)";
  }

  // Attack / Defense buffs
  if (item.effectType === 'BUFF_ATK') return "Potion Attaque";
  if (item.effectType === 'BUFF_DEF') return "Potion Défense";

  // Damage
  if (item.effectType === 'DMG_FLAT') return "Coup de Poing";

  // Status
  if (/(SLEEP|STATUS_SLEEP)/i.test(item.effectType)) return "Potion Dodo";
  if (/(POISON|STATUS_POISON)/i.test(item.effectType)) return "Potion Poison";

  // Special
  if (item.effectType === 'SPECIAL_MIRROR' || /MIRROR/i.test(name)) return "Miroir";
  if (item.effectType === 'TRAITOR' || /TRAIT/i.test(name)) return "Traître";
  if (item.effectType === 'JOKER' || /JOKER/i.test(name)) return "Joker";

  // Capture
  if (item.effectType === 'CAPTURE') return "Pokéball";

  // XP / tokens
  if (item.effectType === 'XP_BOOST') return "Pack XP";
  if (item.effectType === 'TOKEN_PACK') return "Pack Jetons";

  // Fallback: keep original name
  return item.name || id;
}

export default displayNameForItem;

export function categoryForItem(item: any): string {
  const id = (item.id || '').toString().toLowerCase();
  const name = (item.name || '').toString().toLowerCase();
  const desc = (item.description || '').toString().toLowerCase();
  const val = Number(item.value || 0);

  if (item.effectType === 'EVOLUTION' || item.effectType === 'EVOLUTION_MAX') return 'Evolution';
  if (item.effectType === 'HEAL') return 'Soin';
  if (item.effectType === 'HEAL_TEAM') return 'Soin';
  if (item.effectType === 'BUFF_ATK') return 'Attaque';
  if (item.effectType === 'BUFF_DEF') return 'Défense';
  if (item.effectType === 'DMG_FLAT') return 'Dégâts';
  if (/SLEEP|STATUS_SLEEP/i.test(item.effectType)) return 'Statut';
  if (/POISON|STATUS_POISON/i.test(item.effectType)) return 'Statut';
  if (item.effectType === 'SPECIAL_MIRROR' || item.effectType === 'TRAITOR' || item.effectType === 'JOKER' || /mirror|trait/i.test(name)) return 'Spécial';
  if (item.effectType === 'CAPTURE') return 'Capture';
  if (item.effectType === 'XP_BOOST' || item.effectType === 'TOKEN_PACK') return 'Ressources';
  return 'Autre';
}
