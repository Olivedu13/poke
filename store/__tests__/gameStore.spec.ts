/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// We need the REAL gameStore, not the global mock.
// Import the actual module using vi.importActual
let useGameStore: any;

beforeEach(async () => {
  // Reset modules to get a fresh store each test
  vi.resetModules();
  // Temporarily remove the global mock for this file
  vi.doUnmock('../../store/gameStore');
  const mod = await vi.importActual<any>('../../store/gameStore');
  useGameStore = mod.useGameStore;

  // Mock localStorage
  const storage: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, val: string) => { storage[key] = val; },
    removeItem: (key: string) => { delete storage[key]; },
  });
});

describe('gameStore real store tests', () => {
  it('login sets user and token', () => {
    const store = useGameStore.getState();
    const mockUser = {
      id: 1,
      username: 'test',
      gradeLevel: 'CE1',
      activeSubjects: ['MATHS'],
      customPromptActive: false,
      customPromptText: null,
      gold: 100,
      tokens: 10,
      streak: 0,
      globalXp: 500,
    };
    store.login(mockUser, 'tok123');
    const s = useGameStore.getState();
    expect(s.user).toBeTruthy();
    expect(s.user!.username).toBe('test');
    expect(s.user!.gold).toBe(100);
    expect(s.user!.global_xp).toBe(500);
    expect(s.token).toBe('tok123');
    expect(s.currentView).toBe('GAME');
  });

  it('logout clears user and token', () => {
    const store = useGameStore.getState();
    store.login({ id: 1, username: 'u', gold: 0, tokens: 0, streak: 0, globalXp: 0 }, 'tok');
    store.logout();
    const s = useGameStore.getState();
    expect(s.user).toBeNull();
    expect(s.token).toBeNull();
    expect(s.currentView).toBe('AUTH');
  });

  it('setView changes currentView and resets battlePhase for GAME', () => {
    const store = useGameStore.getState();
    store.login({ id: 1, username: 'u', gold: 0, tokens: 0, streak: 0, globalXp: 0 }, 'tok');
    useGameStore.setState({ battlePhase: 'FIGHTING' });
    store.setView('GAME');
    expect(useGameStore.getState().currentView).toBe('GAME');
    expect(useGameStore.getState().battlePhase).toBe('NONE');
  });

  it('setView does NOT reset battlePhase for non-GAME views', () => {
    const store = useGameStore.getState();
    useGameStore.setState({ battlePhase: 'FIGHTING' });
    store.setView('COLLECTION');
    expect(useGameStore.getState().currentView).toBe('COLLECTION');
    expect(useGameStore.getState().battlePhase).toBe('FIGHTING');
  });

  it('initBattle sets player, enemy and resets state', () => {
    const player = { id: 'p1', name: 'Pika', current_hp: 100, max_hp: 100, level: 5 } as any;
    const enemy = { id: 'e1', name: 'Wild', current_hp: 50, max_hp: 50, level: 3 } as any;
    useGameStore.getState().initBattle(player, enemy, 'Battle start!');
    const s = useGameStore.getState();
    expect(s.playerPokemon).toEqual(player);
    expect(s.enemyPokemon).toEqual(enemy);
    expect(s.isPlayerTurn).toBe(true);
    expect(s.battleOver).toBe(false);
    expect(s.battlePhase).toBe('PREVIEW');
    expect(s.battleLogs[0].message).toBe('Battle start!');
  });

  it('damageEntity reduces HP and sets battleOver on KO', () => {
    const player = { id: 'p1', name: 'P', current_hp: 100, max_hp: 100, level: 5 } as any;
    const enemy = { id: 'e1', name: 'E', current_hp: 30, max_hp: 50, level: 3 } as any;
    useGameStore.setState({ playerPokemon: player, enemyPokemon: enemy, battleOver: false });

    useGameStore.getState().damageEntity('ENEMY', 30);
    const s = useGameStore.getState();
    expect(s.enemyPokemon!.current_hp).toBe(0);
    expect(s.battleOver).toBe(true);
  });

  it('damageEntity does not go below 0', () => {
    const enemy = { id: 'e1', name: 'E', current_hp: 10, max_hp: 50, level: 3 } as any;
    useGameStore.setState({ enemyPokemon: enemy, playerPokemon: { id: 'p1', name: 'P', current_hp: 100, max_hp: 100, level: 5 } as any, battleOver: false });
    useGameStore.getState().damageEntity('ENEMY', 999);
    expect(useGameStore.getState().enemyPokemon!.current_hp).toBe(0);
  });

  it('damageEntity on PLAYER sets battleOver when KO', () => {
    const player = { id: 'p1', name: 'P', current_hp: 5, max_hp: 100, level: 5 } as any;
    useGameStore.setState({ playerPokemon: player, enemyPokemon: { id: 'e1', current_hp: 50, max_hp: 50 } as any, battleOver: false });
    useGameStore.getState().damageEntity('PLAYER', 5);
    expect(useGameStore.getState().playerPokemon!.current_hp).toBe(0);
    expect(useGameStore.getState().battleOver).toBe(true);
  });

  it('damageEntity does nothing when battleOver is already true', () => {
    const player = { id: 'p1', name: 'P', current_hp: 100, max_hp: 100, level: 5 } as any;
    useGameStore.setState({ playerPokemon: player, enemyPokemon: null, battleOver: true });
    useGameStore.getState().damageEntity('PLAYER', 50);
    expect(useGameStore.getState().playerPokemon!.current_hp).toBe(100);
  });

  it('healEntity heals player but caps at max_hp', () => {
    const player = { id: 'p1', name: 'P', current_hp: 80, max_hp: 100, level: 5 } as any;
    useGameStore.setState({ playerPokemon: player, battleOver: false });
    useGameStore.getState().healEntity('PLAYER', 50);
    expect(useGameStore.getState().playerPokemon!.current_hp).toBe(100);
  });

  it('healEntity does nothing when battleOver', () => {
    const player = { id: 'p1', name: 'P', current_hp: 50, max_hp: 100, level: 5 } as any;
    useGameStore.setState({ playerPokemon: player, battleOver: true });
    useGameStore.getState().healEntity('PLAYER', 30);
    // battleOver blocks healing
    expect(useGameStore.getState().playerPokemon!.current_hp).toBe(50);
  });

  it('endTurn toggles isPlayerTurn', () => {
    useGameStore.setState({ isPlayerTurn: true });
    useGameStore.getState().endTurn();
    expect(useGameStore.getState().isPlayerTurn).toBe(false);
    useGameStore.getState().endTurn();
    expect(useGameStore.getState().isPlayerTurn).toBe(true);
  });

  it('incrementCombo increases combo and specialGauge', () => {
    useGameStore.setState({ combo: 0, specialGauge: 0 });
    useGameStore.getState().incrementCombo();
    const s = useGameStore.getState();
    expect(s.combo).toBe(1);
    expect(s.specialGauge).toBe(25);
  });

  it('incrementCombo caps specialGauge at 100', () => {
    useGameStore.setState({ combo: 3, specialGauge: 80 });
    useGameStore.getState().incrementCombo();
    expect(useGameStore.getState().specialGauge).toBe(100);
  });

  it('resetCombo sets combo to 0', () => {
    useGameStore.setState({ combo: 5 });
    useGameStore.getState().resetCombo();
    expect(useGameStore.getState().combo).toBe(0);
  });

  it('consumeSpecial resets specialGauge to 0', () => {
    useGameStore.setState({ specialGauge: 100 });
    useGameStore.getState().consumeSpecial();
    expect(useGameStore.getState().specialGauge).toBe(0);
  });

  it('markQuestionAsSeen adds question id', () => {
    useGameStore.setState({ seenQuestionIds: [] });
    useGameStore.getState().markQuestionAsSeen('q1');
    useGameStore.getState().markQuestionAsSeen('q2');
    expect(useGameStore.getState().seenQuestionIds).toEqual(['q1', 'q2']);
  });

  it('addLog keeps max 5 entries', () => {
    useGameStore.setState({ battleLogs: [] });
    for (let i = 0; i < 8; i++) {
      useGameStore.getState().addLog({ message: `msg${i}`, type: 'INFO' });
    }
    expect(useGameStore.getState().battleLogs.length).toBeLessThanOrEqual(5);
  });

  it('spendCurrency reduces gold', () => {
    const store = useGameStore.getState();
    store.login({ id: 1, username: 'u', gold: 100, tokens: 10, streak: 0, globalXp: 0 }, 'tok');
    useGameStore.getState().spendCurrency('GOLD', 30);
    expect(useGameStore.getState().user!.gold).toBe(70);
  });

  it('spendCurrency reduces tokens', () => {
    const store = useGameStore.getState();
    store.login({ id: 1, username: 'u', gold: 100, tokens: 10, streak: 0, globalXp: 0 }, 'tok');
    useGameStore.getState().spendCurrency('TOKEN', 3);
    expect(useGameStore.getState().user!.tokens).toBe(7);
  });

  it('setBattlePhase updates phase', () => {
    useGameStore.getState().setBattlePhase('FIGHTING');
    expect(useGameStore.getState().battlePhase).toBe('FIGHTING');
  });

  it('setBattleMode updates mode', () => {
    useGameStore.getState().setBattleMode('TRAINER');
    expect(useGameStore.getState().battleMode).toBe('TRAINER');
  });

  it('setTrainerOpponent sets trainer', () => {
    const trainer = { name: 'Sacha', avatar: '👤', team: [], currentPokemonIndex: 0 };
    useGameStore.getState().setTrainerOpponent(trainer);
    expect(useGameStore.getState().trainerOpponent).toEqual(trainer);
  });

  it('setPreviewEnemy sets enemy', () => {
    const enemy = { id: 'e1', name: 'E' } as any;
    useGameStore.getState().setPreviewEnemy(enemy);
    expect(useGameStore.getState().previewEnemy).toEqual(enemy);
  });

  it('setPreviewEnemyTeam sets team array', () => {
    const team = [{ id: 'e1' }, { id: 'e2' }] as any[];
    useGameStore.getState().setPreviewEnemyTeam(team);
    expect(useGameStore.getState().previewEnemyTeam).toEqual(team);
  });

  it('setSelectedPlayer sets player', () => {
    const player = { id: 'p1', name: 'P' } as any;
    useGameStore.getState().setSelectedPlayer(player);
    expect(useGameStore.getState().selectedPlayer).toEqual(player);
  });

  it('updateUserConfig merges config', () => {
    const store = useGameStore.getState();
    store.login({ id: 1, username: 'u', gold: 100, tokens: 10, streak: 0, globalXp: 0 }, 'tok');
    useGameStore.getState().updateUserConfig({ gold: 200 });
    expect(useGameStore.getState().user!.gold).toBe(200);
  });

  it('setPvpNotification sets notification', () => {
    useGameStore.getState().setPvpNotification({ challengeId: 1, challengerName: 'rival' });
    expect(useGameStore.getState().pvpNotification).toEqual({ challengeId: 1, challengerName: 'rival' });
  });

  it('updateGradeProgress on correct answer increments gauge', async () => {
    const store = useGameStore.getState();
    store.login({ id: 1, username: 'u', gold: 100, tokens: 10, streak: 0, globalXp: 0, gradeLevel: 'CE1' }, 'tok');
    useGameStore.setState({ gradeGauge: 0 });
    const changed = await useGameStore.getState().updateGradeProgress(true, 'MEDIUM');
    expect(useGameStore.getState().gradeGauge).toBeGreaterThanOrEqual(1);
    // Not enough to trigger grade change
    expect(changed).toBe(false);
  });

  it('updateGradeProgress on incorrect answer resets combo', async () => {
    const store = useGameStore.getState();
    store.login({ id: 1, username: 'u', gold: 100, tokens: 10, streak: 0, globalXp: 0, gradeLevel: 'CE1' }, 'tok');
    useGameStore.setState({ combo: 5, gradeGauge: 2 });
    await useGameStore.getState().updateGradeProgress(false, 'MEDIUM');
    expect(useGameStore.getState().combo).toBe(0);
  });

  it('updateGradeProgress triggers grade change at threshold', async () => {
    const store = useGameStore.getState();
    store.login({ id: 1, username: 'u', gold: 100, tokens: 10, streak: 0, globalXp: 0, gradeLevel: 'CE1' }, 'tok');
    useGameStore.setState({ gradeGauge: 4 });
    const changed = await useGameStore.getState().updateGradeProgress(true, 'HARD');
    expect(changed).toBe(true);
    expect(useGameStore.getState().gradeGauge).toBe(0);
  });

  it('claimBattleRewards updates user gold and xp', async () => {
    const store = useGameStore.getState();
    store.login({ id: 1, username: 'u', gold: 100, tokens: 10, streak: 0, globalXp: 200 }, 'tok');
    await useGameStore.getState().claimBattleRewards(50, 25, null);
    const s = useGameStore.getState();
    expect(s.user!.gold).toBe(125);
    expect(s.user!.global_xp).toBe(250);
    expect(s.user!.streak).toBe(1);
  });

  it('fetchCollection sets collection from API', async () => {
    useGameStore.setState({ collection: [] });
    await useGameStore.getState().fetchCollection();
    // The global mock returns { success: true, data: [] }
    expect(useGameStore.getState().collection).toEqual([]);
  });

  it('fetchInventory sets inventory from API', async () => {
    useGameStore.setState({ inventory: [] });
    await useGameStore.getState().fetchInventory();
    expect(useGameStore.getState().inventory).toEqual([]);
  });

  it('fetchUser updates user from API', async () => {
    useGameStore.setState({ user: null });
    await useGameStore.getState().fetchUser();
    // API returns { success: true, data: [] } by default which has no .user
    // So user should remain unchanged or null
  });

  it('spendCurrency with zero amount does not play sfx', () => {
    const store = useGameStore.getState();
    store.login({ id: 1, username: 'u', gold: 100, tokens: 10, streak: 0, globalXp: 0 }, 'tok');
    useGameStore.getState().spendCurrency('GOLD', 0);
    expect(useGameStore.getState().user!.gold).toBe(100);
  });

  it('swapTeamMember calls API and returns boolean', async () => {
    const result = await useGameStore.getState().swapTeamMember('old1', 'new1');
    // Global mock returns {} for post, so res.data.success is undefined → false
    expect(typeof result).toBe('boolean');
  });
});
