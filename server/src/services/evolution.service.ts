import { TYRADEX_ASSETS_BASE } from '../config/assets.js';

let cachedTyradex: any[] | null = null;
let cacheAt = 0;
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

async function loadTyradexJson(): Promise<any[]> {
  const now = Date.now();
  if (cachedTyradex && (now - cacheAt) < CACHE_TTL) return cachedTyradex;
  try {
    const res = await fetch(`${TYRADEX_ASSETS_BASE}/pokemon.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: any = await res.json();
    cachedTyradex = Array.isArray(json) ? json : (json?.pokemon || []);
    cacheAt = now;
    return cachedTyradex || [];
  } catch (e) {
    console.error('Impossible de charger pokemon.json depuis assets:', e);
    return cachedTyradex || [];
  }
}

export async function getEvolutionChain(tyradexId: number): Promise<{ next: Array<{ pokedex_id: number, name: string, condition?: string }> } | null> {
  const list = await loadTyradexJson();
  const entry = list.find((p: any) => Number(p.pokedex_id) === Number(tyradexId) || Number(p.id) === Number(tyradexId));
  if (!entry) return null;
  return entry.evolution && entry.evolution.next ? { next: entry.evolution.next } : null;
}

export async function getPokemonData(tyradexId: number): Promise<any | null> {
  const list = await loadTyradexJson();
  const entry = list.find((p: any) => Number(p.pokedex_id) === Number(tyradexId) || Number(p.id) === Number(tyradexId));
  return entry || null;
}
