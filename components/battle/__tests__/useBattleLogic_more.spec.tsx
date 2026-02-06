import React from 'react';
import { render, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { useBattleLogic } from '../useBattleLogic';
import { useGameStore } from '../../../store/gameStore';
import { api as apiClient } from '../../../services/api';

function TestHarness({ onReady }: { onReady: (api: any) => void }) {
  const api = useBattleLogic();
  React.useEffect(() => { onReady(api); }, []);
  return null;
}

describe('useBattleLogic additional flows', () => {
  const TEST_MOCKS = (globalThis as any).__TEST_MOCKS__ as any;

  beforeEach(() => {
    vi.clearAllMocks();
    if (TEST_MOCKS) Object.values(TEST_MOCKS).forEach((m: any) => { if (typeof m === 'function' && m.mockReset) m.mockReset(); });
  });

  it('handleUseItem heals and consumes item', async () => {
    let api: any;
    render(<TestHarness onReady={(a) => (api = a)} />);

    const healItem = { id: 'heal_r1', name: 'Potion', effect_type: 'HEAL', value: 10 } as any;

    await act(async () => {
      await api.handleUseItem(healItem);
    });

    expect(TEST_MOCKS.fetchInventory).toHaveBeenCalled();
    expect(TEST_MOCKS.endTurn).toHaveBeenCalled();
  });

  it('handleCapture success path calls collection API when pokeball present', async () => {
    let api: any;
    // ensure inventory has a pokeball BEFORE initializing the hook
    useGameStore.setState({ inventory: [{ id: 'pokeball', effect_type: 'CAPTURE', quantity: 1 }] });
    // Ensure enemy low HP
    useGameStore.setState({ enemyPokemon: { id: 'e1', name: 'Wild', level: 3, current_hp: 1, max_hp: 50, tyradex_id: 10 } });
    render(<TestHarness onReady={(a) => (api = a)} />);

    // Force success
    const rand = Math.random;
    Math.random = () => 0;

    await act(async () => {
      await api.handleCapture(true);
    });

    Math.random = rand;

    // the api.post for collection/capture is invoked by the hook via api
    expect(apiClient.post).toHaveBeenCalled();
  });

  it('handleExitBattle resets the battle state', async () => {
    let api: any;
    // set a non-default state
    useGameStore.setState({ battlePhase: 'FIGHTING', playerPokemon: { id: 'p1' } });

    render(<TestHarness onReady={(a) => (api = a)} />);

    await act(async () => {
      await api.handleExitBattle();
    });

    const state = useGameStore.getState();
    expect(state.battlePhase).toBe('NONE');
    expect(state.playerPokemon).toBeNull();
  });
});
