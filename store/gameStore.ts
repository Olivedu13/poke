
import { create } from 'zustand';
import { User, Pokemon, Item, CombatLog, ViewState, GradeLevel, BattleMode, TrainerOpponent, BattlePhase } from '../types';
import { api } from '../services/api'; // V3 API
import { playSfx } from '../utils/soundEngine';

export const GRADES_ORDER: GradeLevel[] = ['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6EME', '5EME', '4EME', '3EME'];

const MOCK_INV: Item[] = [
    { id: 'heal_r1', name: 'Potion (R1)', description: '+20 PV', price: 50, effect_type: 'HEAL', value: 20, quantity: 0, rarity: 'COMMON' } as any
];

interface GameState {
  user: User | null;
  token: string | null;
  currentView: ViewState;
  
  playerPokemon: Pokemon | null;
  enemyPokemon: Pokemon | null;
  previewEnemy: Pokemon | null;
  previewEnemyTeam: Pokemon[];
  selectedPlayer: Pokemon | null;
  battleMode: BattleMode;
  trainerOpponent: TrainerOpponent | null;
  battleLogs: CombatLog[];
  isPlayerTurn: boolean;
  battleOver: boolean;
  battlePhase: BattlePhase;
  combo: number;         
  specialGauge: number;  
  seenQuestionIds: (string | number)[]; 
  gradeGauge: number; 
  collection: Pokemon[];
  inventory: Item[];
  
  // Actions
  login: (user: User, token: string) => void;
  logout: () => void;
  setView: (view: ViewState) => void;
  updateUserConfig: (config: Partial<User>) => void;
  
  initBattle: (player: Pokemon, enemy: Pokemon) => void;
  setBattlePhase: (phase: BattlePhase) => void;
  setBattleMode: (mode: BattleMode) => void;
  setTrainerOpponent: (trainer: TrainerOpponent | null) => void;
  setPreviewEnemy: (enemy: Pokemon | null) => void;
  setPreviewEnemyTeam: (team: Pokemon[]) => void;
  setSelectedPlayer: (player: Pokemon | null) => void;
  addLog: (log: CombatLog) => void;
  damageEntity: (target: 'PLAYER' | 'ENEMY', amount: number) => void;
  healEntity: (target: 'PLAYER' | 'ENEMY', amount: number) => void;
  endTurn: () => void;
  claimBattleRewards: (xp: number, gold: number, itemDrop?: string) => Promise<void>;
  resetCombo: () => void; 
  incrementCombo: () => void; 
  consumeSpecial: () => void; 
  markQuestionAsSeen: (id: string | number) => void;
  updateGradeProgress: (correct: boolean, difficulty?: string) => Promise<boolean>;
  fetchCollection: () => Promise<void>;
  fetchInventory: () => Promise<void>;
  fetchUser: () => Promise<void>;
  spendCurrency: (type: 'GOLD' | 'TOKEN', amount: number) => void;
  swapTeamMember: (outId: string, inId: string) => Promise<boolean>;
}

export const useGameStore = create<GameState>((set, get) => ({
  user: null,
  token: localStorage.getItem('poke_edu_token'),
  currentView: 'AUTH',

  playerPokemon: null,
  enemyPokemon: null,
  previewEnemy: null,
  previewEnemyTeam: [],
  selectedPlayer: null,
  battleMode: 'WILD',
  trainerOpponent: null,
  battleLogs: [],
  isPlayerTurn: true,
  battleOver: false,
  battlePhase: 'NONE',
  combo: 0,
  specialGauge: 0,
  seenQuestionIds: [],
  gradeGauge: 0,
  collection: [],
  inventory: [],

  login: (user, token) => {
      playSfx('CLICK');
      localStorage.setItem('poke_edu_token', token);
      set({ user, token, currentView: 'GAME' });
  },
  
  logout: () => {
      localStorage.removeItem('poke_edu_token');
      set({ user: null, token: null, currentView: 'AUTH' });
  },
  
  setView: (view) => {
      playSfx('CLICK');
      // Réinitialiser le battlePhase à 'NONE' quand on va sur la vue GAME
      if (view === 'GAME') {
          set({ currentView: view, battlePhase: 'NONE' });
      } else {
          set({ currentView: view });
      }
  },
  
  updateUserConfig: (config) => set((state) => ({
    user: state.user ? { ...state.user, ...config } : null
  })),

  initBattle: (player, enemy) => set({
    playerPokemon: player,
    enemyPokemon: enemy,
    battleLogs: [{ message: `Un ${enemy.name} sauvage !`, type: 'INFO' }],
    isPlayerTurn: true,
    battleOver: false,
    battlePhase: 'PREVIEW',
    combo: 0,
    specialGauge: 0
  }),

  setBattlePhase: (phase: 'NONE' | 'LOADING' | 'PREVIEW' | 'FIGHTING' | 'CAPTURE' | 'FINISHED') => set({ battlePhase: phase }),

  setBattleMode: (mode) => set({ battleMode: mode }),

  setTrainerOpponent: (trainer) => set({ trainerOpponent: trainer }),

  setPreviewEnemy: (enemy) => set({ previewEnemy: enemy }),

  setPreviewEnemyTeam: (team) => set({ previewEnemyTeam: team }),

  setSelectedPlayer: (player) => set({ selectedPlayer: player }),

  addLog: (log) => set((state) => ({
    battleLogs: [...state.battleLogs, log].slice(-5)
  })),

  damageEntity: (target, amount) => {
      if (target === 'PLAYER') playSfx('DAMAGE'); else playSfx('ATTACK');
      set((state) => {
        if (state.battleOver) return {};
        let newPlayer = state.playerPokemon;
        let newEnemy = state.enemyPokemon;
        let gameOver = false;

        if (target === 'ENEMY' && newEnemy) {
          const newHp = Math.max(0, newEnemy.current_hp - amount);
          newEnemy = { ...newEnemy, current_hp: newHp };
          if (newHp === 0) { gameOver = true; playSfx('WIN'); }
        } else if (target === 'PLAYER' && newPlayer) {
          const newHp = Math.max(0, newPlayer.current_hp - amount);
          newPlayer = { ...newPlayer, current_hp: newHp };
          if (newHp === 0) gameOver = true; 
        }
        return { playerPokemon: newPlayer, enemyPokemon: newEnemy, battleOver: gameOver };
      });
  },

  healEntity: (target, amount) => set((state) => {
    if (state.battleOver) return {};
    if (target === 'PLAYER' && state.playerPokemon) {
        const newHp = Math.min(state.playerPokemon.max_hp, state.playerPokemon.current_hp + amount);
        return { playerPokemon: { ...state.playerPokemon, current_hp: newHp } };
    }
    return {};
  }),

  endTurn: () => set((state) => ({ isPlayerTurn: !state.isPlayerTurn })),

  incrementCombo: () => set((state) => ({
      combo: state.combo + 1,
      specialGauge: Math.min(100, state.specialGauge + 25) 
  })),

  resetCombo: () => set({ combo: 0 }),
  consumeSpecial: () => set({ specialGauge: 0 }),
  markQuestionAsSeen: (id) => set((state) => ({ seenQuestionIds: [...state.seenQuestionIds, id] })),

  updateGradeProgress: async (correct, difficulty = 'MEDIUM') => {
      const state = get();
      if (!state.user) return false;
      if (correct) playSfx('CORRECT'); else playSfx('WRONG');

      let currentGauge = state.gradeGauge;
      let newGrade = state.user.grade_level;
      let gradeChanged = false;
      let points = correct ? (difficulty === 'HARD' ? 1 : 1) : 0;
      
      if(correct) state.incrementCombo(); 
      else { state.resetCombo(); set({ specialGauge: 0 }); }

      let newGauge = currentGauge + points;
      if (newGauge >= 5) {
          const idx = GRADES_ORDER.indexOf(newGrade);
          if (idx < GRADES_ORDER.length - 1) {
              newGrade = GRADES_ORDER[idx + 1];
              newGauge = 0; gradeChanged = true;
              playSfx('LEVEL_UP');
          } else newGauge = 5;
      } else if (newGauge < 0) {
          newGauge = 0;
      }

      set({ gradeGauge: newGauge });
      if (gradeChanged) {
          set((s) => ({ user: s.user ? { ...s.user, grade_level: newGrade } : null }));
          try { await api.post(`/update_config.php`, { grade_level: newGrade }); } catch (e) {}
      }
      return gradeChanged;
  },

  claimBattleRewards: async (xp, gold, itemDrop) => {
      try {
          const safeXp = Math.max(0, xp);
          const safeGold = gold;
          await api.post(`/battle_rewards.php`, { xp: safeXp, gold: safeGold, item_drop: itemDrop });
          set((s) => ({
              user: s.user ? { ...s.user, global_xp: s.user.global_xp + safeXp, gold: s.user.gold + safeGold, streak: s.user.streak + 1 } : null
          }));
          if(itemDrop) await get().fetchInventory(); 
      } catch (e) {}
  },

  fetchCollection: async () => {
    try {
      const res = await api.get(`/collection.php`);
      if (res.data.success) set({ collection: res.data.data });
    } catch (e) { set({ collection: [] }); }
  },

  fetchInventory: async () => {
    try {
      const res = await api.get(`/shop.php?action=list_items`);
      if (res.data.success) set({ inventory: Array.isArray(res.data.data) ? res.data.data : MOCK_INV });
    } catch (e) { set({ inventory: MOCK_INV }); }
  },
  
  fetchUser: async () => {
    try {
      const res = await api.get(`/auth.php?action=verify`);
      if (res.data.success && res.data.user) {
        set({ user: res.data.user });
      }
    } catch (e) {
      console.error('Erreur refresh user:', e);
    }
  },

  spendCurrency: (type, amount) => set((state) => {
    if (!state.user) return {};
    if (amount > 0) playSfx('CLICK'); 
    return {
      user: {
        ...state.user,
        gold: type === 'GOLD' ? state.user.gold - amount : state.user.gold,
        tokens: type === 'TOKEN' ? state.user.tokens - amount : state.user.tokens,
      }
    };
  }),

  swapTeamMember: async (outId, inId) => {
      playSfx('CLICK');
      try {
          if (outId) await api.post(`/collection.php`, { action: 'toggle_team', pokemon_id: outId });
          const res = await api.post(`/collection.php`, { action: 'toggle_team', pokemon_id: inId });
          if (res.data.success) { await get().fetchCollection(); return true; }
      } catch (e) {}
      return false;
  }
}));
