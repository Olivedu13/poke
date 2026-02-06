// Centralise la récupération de la chaîne d'évolution depuis Tyradex
export async function getEvolutionChain(tyradexId: number): Promise<{ next: Array<{ pokedex_id: number, name: string, condition?: string }> } | null> {
  try {
    const response = await fetch(`https://tyradex.app/api/v1/pokemon/${tyradexId}`);
    const pokeData = await response.json() as { evolution?: { next?: Array<{ pokedex_id: number, name: string, condition?: string }> } };
    if (pokeData && pokeData.evolution && pokeData.evolution.next) {
      return { next: pokeData.evolution.next };
    }
    return null;
  } catch (e) {
    console.error('Erreur Tyradex:', e);
    return null;
  }
}
