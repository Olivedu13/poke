
import { create } from 'zustand';
import { User, Pokemon, Item, CombatLog, ViewState } from '../types';
import axios from 'axios';
import { API_BASE_URL } from '../config';

// --- FALLBACK DATA (Si le backend ne répond pas ou renvoie l'ancienne version) ---
const FULL_MOCK_INVENTORY: Item[] = [
    // Soin
    { id: 'heal_r1', name: 'Potion de Soin (R1)', description: '+20% PV (1 Allié)', price: 50, effect_type: 'HEAL', value: 20, quantity: 0, rarity: 'COMMON', image: 'soin.webp' } as any,
    { id: 'heal_r2', name: 'Potion de Soin (R2)', description: '+40% PV (1 Allié)', price: 150, effect_type: 'HEAL', value: 40, quantity: 0, rarity: 'UNCOMMON', image: 'soin.webp' } as any,
    { id: 'heal_r3', name: 'Potion de Soin (R3)', description: '+60% PV (1 Allié)', price: 300, effect_type: 'HEAL', value: 60, quantity: 0, rarity: 'RARE', image: 'soin.webp' } as any,
    { id: 'heal_r4', name: 'Potion de Soin (R4)', description: '+80% PV (1 Allié)', price: 600, effect_type: 'HEAL', value: 80, quantity: 0, rarity: 'EPIC', image: 'soin.webp' } as any,
    { id: 'heal_r5', name: 'Potion de Soin (R5)', description: '+100% PV (Total)', price: 1000, effect_type: 'HEAL', value: 100, quantity: 0, rarity: 'LEGENDARY', image: 'soin.webp' } as any,
    
    // Soin Ultime
    { id: 'team_r1', name: 'Soin Ultime (R1)', description: '+20% PV Équipe', price: 200, effect_type: 'HEAL_TEAM', value: 20, quantity: 0, rarity: 'UNCOMMON', image: 'soin_ultime.webp' } as any,
    { id: 'team_r2', name: 'Soin Ultime (R2)', description: '+40% PV Équipe', price: 400, effect_type: 'HEAL_TEAM', value: 40, quantity: 0, rarity: 'RARE', image: 'soin_ultime.webp' } as any,
    { id: 'team_r3', name: 'Soin Ultime (R3)', description: '+60% PV Équipe', price: 800, effect_type: 'HEAL_TEAM', value: 60, quantity: 0, rarity: 'EPIC', image: 'soin_ultime.webp' } as any,
    { id: 'team_r4', name: 'Soin Ultime (R4)', description: '+80% PV Équipe', price: 1500, effect_type: 'HEAL_TEAM', value: 80, quantity: 0, rarity: 'LEGENDARY', image: 'soin_ultime.webp' } as any,
    { id: 'team_r5', name: 'Soin Ultime (R5)', description: '+100% PV Équipe', price: 3000, effect_type: 'HEAL_TEAM', value: 100, quantity: 0, rarity: 'LEGENDARY', image: 'soin_ultime.webp' } as any,

    // Attaque
    { id: 'atk_r1', name: 'Potion Attaque (R1)', description: '+20% Dégâts', price: 100, effect_type: 'BUFF_ATK', value: 20, quantity: 0, rarity: 'COMMON', image: 'attaque.webp' } as any,
    { id: 'atk_r2', name: 'Potion Attaque (R2)', description: '+40% Dégâts', price: 250, effect_type: 'BUFF_ATK', value: 40, quantity: 0, rarity: 'UNCOMMON', image: 'attaque.webp' } as any,
    { id: 'atk_r3', name: 'Potion Attaque (R3)', description: '+60% Dégâts', price: 500, effect_type: 'BUFF_ATK', value: 60, quantity: 0, rarity: 'RARE', image: 'attaque.webp' } as any,
    { id: 'atk_r4', name: 'Potion Attaque (R4)', description: '+80% Dégâts', price: 900, effect_type: 'BUFF_ATK', value: 80, quantity: 0, rarity: 'EPIC', image: 'attaque.webp' } as any,
    { id: 'atk_r5', name: 'Potion Attaque (R5)', description: '+100% Dégâts', price: 1500, effect_type: 'BUFF_ATK', value: 100, quantity: 0, rarity: 'LEGENDARY', image: 'attaque.webp' } as any,

    // Défense
    { id: 'def_r1', name: 'Potion Défense (R1)', description: 'Bloque 20% Dégâts', price: 100, effect_type: 'BUFF_DEF', value: 20, quantity: 0, rarity: 'COMMON', image: 'defense.webp' } as any,
    { id: 'def_r2', name: 'Potion Défense (R2)', description: 'Bloque 40% Dégâts', price: 250, effect_type: 'BUFF_DEF', value: 40, quantity: 0, rarity: 'UNCOMMON', image: 'defense.webp' } as any,
    { id: 'def_r3', name: 'Potion Défense (R3)', description: 'Bloque 60% Dégâts', price: 500, effect_type: 'BUFF_DEF', value: 60, quantity: 0, rarity: 'RARE', image: 'defense.webp' } as any,
    { id: 'def_r4', name: 'Potion Défense (R4)', description: 'Bloque 80% Dégâts', price: 1000, effect_type: 'BUFF_DEF', value: 80, quantity: 0, rarity: 'EPIC', image: 'defense.webp' } as any,
    { id: 'def_r5', name: 'Potion Défense (R5)', description: 'Immunité (1 tour)', price: 1500, effect_type: 'BUFF_DEF', value: 100, quantity: 0, rarity: 'LEGENDARY', image: 'defense.webp' } as any,

    // Dégâts
    { id: 'dmg_r1', name: 'Coup de Poing (R1)', description: '20% PV Ennemi', price: 150, effect_type: 'DMG_FLAT', value: 20, quantity: 0, rarity: 'COMMON', image: 'coup_poing.webp' } as any,
    { id: 'dmg_r2', name: 'Coup de Poing (R2)', description: '40% PV Ennemi', price: 350, effect_type: 'DMG_FLAT', value: 40, quantity: 0, rarity: 'UNCOMMON', image: 'coup_poing.webp' } as any,
    { id: 'dmg_r3', name: 'Coup de Poing (R3)', description: '60% PV Ennemi', price: 600, effect_type: 'DMG_FLAT', value: 60, quantity: 0, rarity: 'RARE', image: 'coup_poing.webp' } as any,
    { id: 'dmg_r4', name: 'Coup de Poing (R4)', description: '80% PV Ennemi', price: 1500, effect_type: 'DMG_FLAT', value: 80, quantity: 0, rarity: 'EPIC', image: 'coup_poing.webp' } as any,
    { id: 'dmg_r5', name: 'K.O Instantané', description: '100% PV Ennemi', price: 2500, effect_type: 'DMG_FLAT', value: 100, quantity: 0, rarity: 'LEGENDARY', image: 'coup_poing.webp' } as any,

    // Evolution
    { id: 'evolution', name: 'Potion Évolution', description: 'Évolue au stade suivant', price: 2500, effect_type: 'EVOLUTION', value: 1, quantity: 0, rarity: 'EPIC', image: 'xp.webp' } as any,
    { id: 'evolution_ultime', name: 'Potion Ultime', 'description': 'Évolution Finale', price: 5000, effect_type: 'EVOLUTION_MAX', value: 1, quantity: 0, rarity: 'LEGENDARY', image: 'xp.webp' } as any,

    // Statut
    { id: 'sleep_r1', name: 'Poudre Dodo', description: 'Sommeil (1 tour)', price: 200, effect_type: 'STATUS_SLEEP', value: 1, quantity: 0, rarity: 'UNCOMMON', image: 'dodo.webp' } as any,
    { id: 'poison_r4', name: 'Venin Mortel', description: '-30% PV par tour', price: 800, effect_type: 'STATUS_POISON', value: 30, quantity: 0, rarity: 'EPIC', image: 'poison.webp' } as any,

    // Spécial & Utils
    { id: 'mirror_r5', name: 'Miroir Magique', description: 'Renvoie 100% Attaque', price: 2000, effect_type: 'SPECIAL_MIRROR', value: 100, quantity: 0, rarity: 'LEGENDARY', image: 'miroir.webp' } as any,
    { id: 'joker', name: 'Joker Savant', description: 'Passe une question', price: 300, effect_type: 'JOKER', value: 1, quantity: 0, rarity: 'COMMON', image: 'joker.webp' } as any,
    { id: 'xp_pack', name: 'Pack XP', description: '+500 XP Global', price: 500, effect_type: 'XP_BOOST', value: 500, quantity: 0, rarity: 'RARE', image: 'xp.webp' } as any,
    { id: 'tokens', name: 'Sac de Jetons', description: '10 Jetons Roue', price: 1000, effect_type: 'TOKEN_PACK', value: 10, quantity: 0, rarity: 'UNCOMMON', image: 'jetons.webp' } as any,
    { id: 'masterball', name: 'Master Ball', description: 'Capture Garantie', price: 2500, effect_type: 'CAPTURE', value: 100, quantity: 0, rarity: 'LEGENDARY', image: 'pokeball.webp' } as any,
];

interface GameState {
  user: User | null;
  currentView: ViewState;
  
  // Battle State
  playerPokemon: Pokemon | null;
  enemyPokemon: Pokemon | null;
  battleLogs: CombatLog[];
  isPlayerTurn: boolean;
  battleOver: boolean;

  // Meta State
  collection: Pokemon[];
  inventory: Item[];
  
  // Actions
  login: (user: User) => void;
  devLogin: () => void;
  logout: () => void;
  setView: (view: ViewState) => void;
  updateUserConfig: (config: Partial<User>) => void;
  
  // Battle Actions
  initBattle: (player: Pokemon, enemy: Pokemon) => void;
  addLog: (log: CombatLog) => void;
  damageEntity: (target: 'PLAYER' | 'ENEMY', amount: number) => void;
  healEntity: (target: 'PLAYER' | 'ENEMY', amount: number) => void;
  endTurn: () => void;
  claimBattleRewards: (xp: number, gold: number) => Promise<void>;

  // Meta Actions
  fetchCollection: () => Promise<void>;
  fetchInventory: () => Promise<void>;
  spendCurrency: (type: 'GOLD' | 'TOKEN', amount: number) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  user: null,
  currentView: 'AUTH',

  // Battle Initial State
  playerPokemon: null,
  enemyPokemon: null,
  battleLogs: [],
  isPlayerTurn: true,
  battleOver: false,

  // Meta Initial State
  collection: [],
  inventory: [],

  login: (user) => set({ user, currentView: 'GAME' }),
  
  devLogin: () => set({ 
      user: {
          id: 999,
          username: 'Agent_Dev',
          grade_level: 'CE1',
          active_subjects: ['MATHS', 'FRANCAIS'],
          custom_prompt_active: false,
          custom_prompt_text: null,
          gold: 5000,
          tokens: 50,
          streak: 5,
          global_xp: 1500
      }, 
      currentView: 'GAME' 
  }),

  logout: () => set({ user: null, currentView: 'AUTH' }),
  setView: (view) => set({ currentView: view }),
  
  updateUserConfig: (config) => set((state) => ({
    user: state.user ? { ...state.user, ...config } : null
  })),

  initBattle: (player, enemy) => set({
    playerPokemon: player,
    enemyPokemon: enemy,
    battleLogs: [{ message: `Un ${enemy.name} sauvage apparaît !`, type: 'INFO' }],
    isPlayerTurn: true,
    battleOver: false
  }),

  addLog: (log) => set((state) => ({
    battleLogs: [...state.battleLogs, log].slice(-5) // Keep last 5 logs
  })),

  damageEntity: (target, amount) => set((state) => {
    if (state.battleOver) return {};

    let newPlayer = state.playerPokemon;
    let newEnemy = state.enemyPokemon;
    let gameOver = false;

    if (target === 'ENEMY' && newEnemy) {
      const newHp = Math.max(0, newEnemy.current_hp - amount);
      newEnemy = { ...newEnemy, current_hp: newHp };
      if (newHp === 0) gameOver = true;
    } else if (target === 'PLAYER' && newPlayer) {
      const newHp = Math.max(0, newPlayer.current_hp - amount);
      newPlayer = { ...newPlayer, current_hp: newHp };
      if (newHp === 0) gameOver = true;
    }

    return {
      playerPokemon: newPlayer,
      enemyPokemon: newEnemy,
      battleOver: gameOver
    };
  }),

  healEntity: (target, amount) => set((state) => {
    if (state.battleOver) return {};
    
    if (target === 'PLAYER' && state.playerPokemon) {
        const newHp = Math.min(state.playerPokemon.max_hp, state.playerPokemon.current_hp + amount);
        return { playerPokemon: { ...state.playerPokemon, current_hp: newHp } };
    }
    return {};
  }),

  endTurn: () => set((state) => ({ isPlayerTurn: !state.isPlayerTurn })),

  claimBattleRewards: async (xp, gold) => {
      const user = get().user;
      if (!user) return;
      
      try {
          await axios.post(`${API_BASE_URL}/battle_rewards.php`, {
              user_id: user.id,
              xp,
              gold
          });
          
          set((state) => ({
              user: state.user ? { 
                  ...state.user, 
                  global_xp: state.user.global_xp + xp,
                  gold: state.user.gold + gold
              } : null
          }));
      } catch (e) {
          console.error("Failed to claim rewards", e);
      }
  },

  fetchCollection: async () => {
    const user = get().user;
    if (!user) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/collection.php?user_id=${user.id}`, { timeout: 3000 });
      if (res.data.success) {
        set({ collection: res.data.data });
      }
    } catch (e) {
      // Mock Data if backend fail
      set({ collection: [] }); 
    }
  },

  fetchInventory: async () => {
    const user = get().user;
    if (!user) return;
    try {
      // Timestamp to avoid cache
      const res = await axios.get(`${API_BASE_URL}/shop.php?action=list_items&user_id=${user.id}&_t=${Date.now()}`, { timeout: 3000 });
      
      if (res.data.success && Array.isArray(res.data.data)) {
        if (res.data.data.length < 15) {
            console.warn("Backend seems outdated. Using Full Mock Inventory.");
            set({ inventory: FULL_MOCK_INVENTORY });
        } else {
            set({ inventory: res.data.data });
        }
      } else {
        throw new Error("Invalid format");
      }
    } catch (e) {
      console.warn("Backend unavailable or error. Using Full Mock Inventory.");
      set({ inventory: FULL_MOCK_INVENTORY });
    }
  },

  spendCurrency: (type, amount) => set((state) => {
    if (!state.user) return {};
    return {
      user: {
        ...state.user,
        gold: type === 'GOLD' ? state.user.gold - amount : state.user.gold,
        tokens: type === 'TOKEN' ? state.user.tokens - amount : state.user.tokens,
      }
    };
  })

}));
