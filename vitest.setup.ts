import { vi } from 'vitest';

// Stub AudioContext to avoid jsdom audio errors
// Minimal implementation used by utils/soundEngine
class FakeAudioContext {
  resume() { return Promise.resolve(); }
  createBufferSource() { return { connect: () => {}, start: () => {}, stop: () => {} }; }
}
// @ts-ignore
globalThis.AudioContext = FakeAudioContext;

// Safe no-op playSfx to prevent side-effects during tests
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sound = require('./utils/soundEngine');
  if (sound && typeof sound.playSfx === 'function') {
    sound.playSfx = vi.fn();
  }
} catch (e) {}

// Stub socketService to prevent network calls
try {
  const socket = require('./services/socket');
  if (socket) {
    socket.socketService = { emit: () => {}, on: () => {}, off: () => {} };
  }
} catch (e) {}

// Stub canvas-confetti to avoid canvas dependencies in jsdom
try {
  vi.mock('canvas-confetti', () => ({ default: () => {} }));
} catch (e) {}

// Stub API client
try {
  // Mock axios so services/api uses a safe instance
  vi.mock('axios', () => ({ default: {
    create: () => ({
      interceptors: { request: { use: () => {} }, response: { use: () => {} } },
      get: vi.fn(() => Promise.resolve({ data: { success: true, data: [] } })),
      post: vi.fn(() => Promise.resolve({})),
      put: vi.fn(() => Promise.resolve({})),
    })
  } }));
  // Also try to override services/api if already loaded
  try {
    const apiMod = require('./services/api');
    if (apiMod && apiMod.api) {
      apiMod.api.get = vi.fn(() => Promise.resolve({ data: { success: true, data: [] } }));
      apiMod.api.post = vi.fn(() => Promise.resolve({}));
      apiMod.api.put = vi.fn(() => Promise.resolve({}));
    }
  } catch (e) {}
} catch (e) {}

// Prevent console noise
vi.stubGlobal('console', { log: () => {}, warn: () => {}, error: () => {} });

// Stub location.reload to avoid jsdom navigation errors
if (typeof globalThis.location === 'undefined') {
  // @ts-ignore
  globalThis.location = { reload: () => {} };
} else if (typeof globalThis.location.reload !== 'function') {
  // @ts-ignore
  globalThis.location.reload = () => {};
}

// Global mock for useGameStore to isolate hook tests
const MOCKS = {
  addLog: vi.fn(),
  damageEntity: vi.fn(),
  endTurn: vi.fn(),
  fetchCollection: vi.fn(),
  fetchInventory: vi.fn(),
  claimBattleRewards: vi.fn(),
  updateGradeProgress: vi.fn(() => Promise.resolve(false)),
  consumeSpecial: vi.fn(),
  setBattlePhase: vi.fn(),
  setPreviewEnemy: vi.fn(),
  setPreviewEnemyTeam: vi.fn(),
  setSelectedPlayer: vi.fn(),
  setTrainerOpponent: vi.fn()
};

// expose mocks for tests
// @ts-ignore
globalThis.__TEST_MOCKS__ = MOCKS;

vi.mock('./store/gameStore', () => {
  const state: any = {
    user: { id: 1, grade_level: 'CP', global_xp: 0, gold: 0, streak: 0 },
    initBattle: vi.fn(),
    playerPokemon: { id: 'p1', level: 5, name: 'P1', current_hp: 100, max_hp: 100 },
    enemyPokemon: { id: 'e1', level: 3, name: 'E1', current_hp: 50, max_hp: 50, tyradex_id: 10 },
    battleLogs: [],
    addLog: MOCKS.addLog,
    isPlayerTurn: true,
    damageEntity: MOCKS.damageEntity,
    healEntity: vi.fn(),
    endTurn: MOCKS.endTurn,
    battleOver: false,
    collection: [],
    fetchCollection: MOCKS.fetchCollection,
    inventory: [],
    fetchInventory: MOCKS.fetchInventory,
    claimBattleRewards: MOCKS.claimBattleRewards,
    gradeGauge: 0,
    updateGradeProgress: MOCKS.updateGradeProgress,
    combo: 0,
    specialGauge: 0,
    consumeSpecial: MOCKS.consumeSpecial,
    battlePhase: 'NONE',
    setBattlePhase: MOCKS.setBattlePhase,
    previewEnemy: null,
    selectedPlayer: null,
    setPreviewEnemy: MOCKS.setPreviewEnemy,
    setPreviewEnemyTeam: MOCKS.setPreviewEnemyTeam,
    setSelectedPlayer: MOCKS.setSelectedPlayer,
    battleMode: 'WILD',
    trainerOpponent: null,
    setTrainerOpponent: MOCKS.setTrainerOpponent
  };

  const useGameStore = () => state;
  useGameStore.getState = () => state;
  useGameStore.setState = (patch: any) => {
    if (typeof patch === 'function') {
      Object.assign(state, patch(state));
    } else {
      Object.assign(state, patch);
    }
  };
  return { useGameStore };
});
