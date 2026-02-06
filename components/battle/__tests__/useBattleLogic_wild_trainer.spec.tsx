import React from 'react';
import { render, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { useBattleLogic } from '../useBattleLogic';
import { useGameStore } from '../../../store/gameStore';

function TestHarness({ onReady }: { onReady: (api: any) => void }) {
  const api = useBattleLogic();
  React.useEffect(() => { onReady(api); }, []);
  return null;
}

describe('useBattleLogic WILD/TRAINER flows', () => {
  const TEST_MOCKS = (globalThis as any).__TEST_MOCKS__ as any;

  beforeEach(() => {
    vi.clearAllMocks();
    if (TEST_MOCKS) Object.values(TEST_MOCKS).forEach((m: any) => { if (typeof m === 'function' && m.mockReset) m.mockReset(); });
  });

  it('startBattle calls initBattle and sets phase to FIGHTING', async () => {
    let api: any;
    // prepare store state so startBattle has selectedPlayer and previewEnemy
    useGameStore.setState({ selectedPlayer: { id: 'p1', level: 5, name: 'P1', current_hp: 100, max_hp: 100 }, previewEnemy: { id: 'e2', level: 3, name: 'E2', current_hp: 50, max_hp: 50 } });
    render(<TestHarness onReady={(a) => (api = a)} />);

    await act(async () => {
      await api.startBattle();
    });

    const state = useGameStore.getState();
    // initBattle is a mock in the test setup
    expect(state.initBattle).toHaveBeenCalled();
    // our mocked setBattlePhase doesn't mutate state, assert it was called
    expect(TEST_MOCKS.setBattlePhase).toHaveBeenCalledWith('FIGHTING');
  });

  it('handleUseItem (TRAITOR) deals flat damage and ends turn', async () => {
    let api: any;
    render(<TestHarness onReady={(a) => (api = a)} />);

    const traitor = { id: 't1', name: 'Traitor', effect_type: 'TRAITOR', value: 15 } as any;

    await act(async () => {
      await api.handleUseItem(traitor);
    });

    // damageEntity is mocked in the global test mocks
    expect(TEST_MOCKS.damageEntity).toHaveBeenCalledWith('ENEMY', 15);
    expect(TEST_MOCKS.endTurn).toHaveBeenCalled();
  });

  it('handleQuizComplete: correct triggers attack, incorrect logs miss', async () => {
    let api: any;
    render(<TestHarness onReady={(a) => (api = a)} />);

    // Correct answer
    await act(async () => { await api.handleQuizComplete(true, 0, 'HARD'); });
    expect(TEST_MOCKS.damageEntity).toHaveBeenCalled();

    vi.clearAllMocks();

    // Incorrect answer
    await act(async () => { await api.handleQuizComplete(false, 0, 'MEDIUM'); });
    expect(TEST_MOCKS.addLog).toHaveBeenCalled();
  });

  it('handleCapture without pokeball logs info', async () => {
    let api: any;
    // ensure no pokeball in inventory
    useGameStore.setState({ inventory: [] });
    // ensure enemy exists
    useGameStore.setState({ enemyPokemon: { id: 'e1', name: 'Wild', level: 3, current_hp: 10, max_hp: 50, tyradex_id: 10 } });
    render(<TestHarness onReady={(a) => (api = a)} />);

    await act(async () => { await api.handleCapture(true); });
    expect(TEST_MOCKS.addLog).toHaveBeenCalled();
  });
});
