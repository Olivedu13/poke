import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { BattleScene } from '../BattleScene';
import { useGameStore } from '../../../store/gameStore';

describe('BattleScene integration', () => {
  const TEST_MOCKS = (globalThis as any).__TEST_MOCKS__ as any;

  beforeEach(() => {
    vi.clearAllMocks();
    if (TEST_MOCKS) {
      Object.values(TEST_MOCKS).forEach((m: any) => {
        if (typeof m === 'function' && m.mockReset) m.mockReset();
      });
    }
  });

  it('renders BattleModeSelector when phase is NONE', () => {
    useGameStore.setState({ battlePhase: 'NONE' });
    const { getByText } = render(<BattleScene />);
    expect(getByText(/CHOISIS TON ADVERSAIRE/i)).toBeTruthy();
  });

  it('renders loading spinner when phase is LOADING', () => {
    useGameStore.setState({ battlePhase: 'LOADING' });
    const { getByText } = render(<BattleScene />);
    expect(getByText(/PRÉPARATION DU COMBAT/i)).toBeTruthy();
  });

  it('renders battle UI with action buttons in FIGHTING phase', () => {
    useGameStore.setState({
      battlePhase: 'FIGHTING',
      battleMode: 'WILD',
      playerPokemon: {
        id: 'p1', name: 'Pikachu', level: 5,
        current_hp: 100, max_hp: 100, sprite_url: '/img/p1.png',
        type: 'Electric', current_xp: 0, tyradex_id: 25,
      },
      enemyPokemon: {
        id: 'e1', name: 'Roucool', level: 3,
        current_hp: 50, max_hp: 50, sprite_url: '/img/e1.png',
        type: 'Normal', current_xp: 0, tyradex_id: 16,
      },
      isPlayerTurn: true,
      inventory: [],
    });

    const { getByText } = render(<BattleScene />);

    // Check action buttons exist
    expect(getByText('Attaque')).toBeTruthy();
    expect(getByText('Sac')).toBeTruthy();
    expect(getByText('Équipe')).toBeTruthy();
    expect(getByText('Fuite')).toBeTruthy();

    // Check Pokemon names displayed
    expect(getByText(/Pikachu/)).toBeTruthy();
    expect(getByText(/Roucool/)).toBeTruthy();
  });

  it('opens inventory overlay showing empty state', async () => {
    useGameStore.setState({
      battlePhase: 'FIGHTING',
      battleMode: 'WILD',
      playerPokemon: {
        id: 'p1', name: 'P1', level: 5,
        current_hp: 100, max_hp: 100, sprite_url: '/p1.png',
        type: 'Normal', current_xp: 0, tyradex_id: 1,
      },
      enemyPokemon: {
        id: 'e1', name: 'E1', level: 3,
        current_hp: 50, max_hp: 50, sprite_url: '/e1.png',
        type: 'Normal', current_xp: 0, tyradex_id: 2,
      },
      isPlayerTurn: true,
      inventory: [],
    });

    const { getByText } = render(<BattleScene />);

    // Open inventory
    await act(async () => {
      fireEvent.click(getByText('Sac'));
    });

    expect(getByText(/AUCUN OBJET EN STOCK/i)).toBeTruthy();
  });

  it('flee resets battle state', async () => {
    useGameStore.setState({
      battlePhase: 'FIGHTING',
      battleMode: 'WILD',
      playerPokemon: {
        id: 'p1', name: 'P1', level: 5,
        current_hp: 100, max_hp: 100, sprite_url: '/p1.png',
        type: 'Normal', current_xp: 0, tyradex_id: 1,
      },
      enemyPokemon: {
        id: 'e1', name: 'E1', level: 3,
        current_hp: 50, max_hp: 50, sprite_url: '/e1.png',
        type: 'Normal', current_xp: 0, tyradex_id: 2,
      },
      isPlayerTurn: true,
      inventory: [],
    });

    const { getByText } = render(<BattleScene />);

    // Click Fuite
    await act(async () => {
      fireEvent.click(getByText('Fuite'));
    });

    const state = useGameStore.getState();
    expect(state.battlePhase).toBe('NONE');
  });

  it('hides pokeball in TRAINER mode inventory', async () => {
    useGameStore.setState({
      battlePhase: 'FIGHTING',
      battleMode: 'TRAINER',
      playerPokemon: {
        id: 'p1', name: 'P1', level: 5,
        current_hp: 100, max_hp: 100, sprite_url: '/p1.png',
        type: 'Normal', current_xp: 0, tyradex_id: 1,
      },
      enemyPokemon: {
        id: 'e1', name: 'E1', level: 3,
        current_hp: 50, max_hp: 50, sprite_url: '/e1.png',
        type: 'Normal', current_xp: 0, tyradex_id: 2,
      },
      isPlayerTurn: true,
      inventory: [
        {
          id: 'pokeball', name: 'Pokéball', description: 'Capture',
          effect_type: 'CAPTURE', value: 0, quantity: 3,
        },
        {
          id: 'potion', name: 'Potion', description: '+20 PV',
          effect_type: 'HEAL', value: 20, quantity: 2,
        },
      ],
    });

    const { getByText, queryByText } = render(<BattleScene />);

    // Open inventory
    await act(async () => {
      fireEvent.click(getByText('Sac'));
    });

    // Potion should be visible, Pokéball should NOT
    expect(getByText('Potion')).toBeTruthy();
    expect(queryByText('Pokéball')).toBeNull();
  });

  it('hides pokeball from battle inventory (capture handled via CAPTURE phase)', async () => {
    useGameStore.setState({
      battlePhase: 'FIGHTING',
      battleMode: 'WILD',
      playerPokemon: {
        id: 'p1', name: 'P1', level: 5,
        current_hp: 100, max_hp: 100, sprite_url: '/p1.png',
        type: 'Normal', current_xp: 0, tyradex_id: 1,
      },
      enemyPokemon: {
        id: 'e1', name: 'E1', level: 3,
        current_hp: 50, max_hp: 50, sprite_url: '/e1.png',
        type: 'Normal', current_xp: 0, tyradex_id: 2,
      },
      isPlayerTurn: true,
      inventory: [
        {
          id: 'pokeball', name: 'Pokéball', description: 'Capture',
          effect_type: 'CAPTURE', value: 0, quantity: 3,
        },
        {
          id: 'potion', name: 'Potion', description: '+20 PV',
          effect_type: 'HEAL', value: 20, quantity: 2,
        },
      ],
    });

    const { getByText, queryByText } = render(<BattleScene />);

    // Open inventory
    await act(async () => {
      fireEvent.click(getByText('Sac'));
    });

    // Pokeball should NOT be in battle inventory (capture handled by CAPTURE phase screen)
    expect(queryByText('Pokéball')).toBeNull();
    expect(getByText('Potion')).toBeTruthy();
  });

  it('shows FINISHED screen with victory text', () => {
    useGameStore.setState({
      battlePhase: 'FINISHED',
      battleMode: 'WILD',
      playerPokemon: {
        id: 'p1', name: 'P1', level: 5,
        current_hp: 80, max_hp: 100, sprite_url: '/p1.png',
        type: 'Normal', current_xp: 0, tyradex_id: 1,
      },
      enemyPokemon: {
        id: 'e1', name: 'E1', level: 3,
        current_hp: 0, max_hp: 50, sprite_url: '/e1.png',
        type: 'Normal', current_xp: 0, tyradex_id: 2,
      },
      isPlayerTurn: true,
      inventory: [],
    });

    const { getByText } = render(<BattleScene />);
    expect(getByText(/VICTOIRE/i)).toBeTruthy();
    expect(getByText('CONTINUER')).toBeTruthy();
  });

  it('shows FINISHED screen with defeat text', () => {
    useGameStore.setState({
      battlePhase: 'FINISHED',
      battleMode: 'WILD',
      playerPokemon: {
        id: 'p1', name: 'P1', level: 5,
        current_hp: 0, max_hp: 100, sprite_url: '/p1.png',
        type: 'Normal', current_xp: 0, tyradex_id: 1,
      },
      enemyPokemon: {
        id: 'e1', name: 'E1', level: 3,
        current_hp: 20, max_hp: 50, sprite_url: '/e1.png',
        type: 'Normal', current_xp: 0, tyradex_id: 2,
      },
      isPlayerTurn: true,
      inventory: [],
    });

    const { getByText } = render(<BattleScene />);
    expect(getByText(/DÉFAITE/i)).toBeTruthy();
  });

  it('shows turn indicator', () => {
    useGameStore.setState({
      battlePhase: 'FIGHTING',
      battleMode: 'WILD',
      playerPokemon: {
        id: 'p1', name: 'P1', level: 5,
        current_hp: 100, max_hp: 100, sprite_url: '/p1.png',
        type: 'Normal', current_xp: 0, tyradex_id: 1,
      },
      enemyPokemon: {
        id: 'e1', name: 'E1', level: 3,
        current_hp: 50, max_hp: 50, sprite_url: '/e1.png',
        type: 'Normal', current_xp: 0, tyradex_id: 2,
      },
      isPlayerTurn: true,
      inventory: [],
    });

    const { getByText } = render(<BattleScene />);
    expect(getByText('TON TOUR')).toBeTruthy();
  });
});
