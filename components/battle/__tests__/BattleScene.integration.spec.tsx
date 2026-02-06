import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { BattleScene } from '../BattleScene';
import { useGameStore } from '../../../store/gameStore';

describe('BattleScene integration', () => {
  const TEST_MOCKS = (globalThis as any).__TEST_MOCKS__ as any;

  beforeEach(() => {
    vi.clearAllMocks();
    if (TEST_MOCKS) Object.values(TEST_MOCKS).forEach((m: any) => { if (typeof m === 'function' && m.mockReset) m.mockReset(); });
  });

  it('shows preview and starts battle when clicking LANCER LE COMBAT', async () => {
    // Prepare preview state
    useGameStore.setState({
      battlePhase: 'PREVIEW',
      selectedPlayer: { id: 'p1', name: 'P1', level: 5, current_hp: 100, max_hp: 100, sprite_url: '/img/p1.png' },
      previewEnemy: { id: 'e1', name: 'E1', level: 3, current_hp: 50, max_hp: 50, sprite_url: '/img/e1.png' },
      previewEnemyTeam: [{ id: 'e1', name: 'E1', level: 3, current_hp: 50, max_hp: 50, sprite_url: '/img/e1.png' }],
      collection: [{ id: 'p1', name: 'P1', level: 5, current_hp: 100, max_hp: 100, is_team: true, sprite_url: '/img/p1.png' }]
    });

    const { getByText } = render(<BattleScene />);

    // Preview UI present
    expect(getByText(/ADVERSAIRE/i)).toBeTruthy();
    const startBtn = getByText('LANCER LE COMBAT');

    await act(async () => {
      fireEvent.click(startBtn);
    });

    // initBattle should have been called and setBattlePhase invoked
    const state = useGameStore.getState();
    expect(state.initBattle).toHaveBeenCalled();
    expect(TEST_MOCKS.setBattlePhase).toHaveBeenCalledWith('FIGHTING');
  });

  it('in FIGHTING opens inventory and flee resets battle', async () => {
    useGameStore.setState({
      battlePhase: 'FIGHTING',
      battleMode: 'WILD',
      playerPokemon: { id: 'p1', name: 'P1', level: 5, current_hp: 100, max_hp: 100, sprite_url: '/img/p1.png' },
      enemyPokemon: { id: 'e1', name: 'E1', level: 3, current_hp: 50, max_hp: 50, sprite_url: '/img/e1.png' },
      isPlayerTurn: true,
      inventory: [],
    });

    const { getByText, queryByText } = render(<BattleScene />);

    // Open inventory
    const sacBtn = getByText('Sac');
    await act(async () => { fireEvent.click(sacBtn); });

    // Inventory overlay shows empty state
    expect(getByText(/AUCUN OBJET EN STOCK/i)).toBeTruthy();

    // Click Fuite
    const fuite = getByText('Fuite');
    await act(async () => { fireEvent.click(fuite); });

    const state = useGameStore.getState();
    expect(state.battlePhase).toBe('NONE');
  });
});
