import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BattleModeSelector } from '../BattleModeSelector';
import { useGameStore } from '../../../store/gameStore';

// Uses the global mock from vitest.setup.ts
const MOCKS = (globalThis as any).__TEST_MOCKS__;

describe('BattleModeSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure setBattleMode is available in the mock state
    const state = useGameStore() as any;
    state.setBattleMode = vi.fn();
    state.setView = vi.fn();
  });

  it('renders all three battle mode buttons', () => {
    const { getByText } = render(<BattleModeSelector />);
    expect(getByText(/POKÉMON SAUVAGE/i)).toBeTruthy();
    expect(getByText(/DRESSEUR/i)).toBeTruthy();
    expect(getByText(/PVP/i)).toBeTruthy();
  });

  it('renders back button', () => {
    const { getByText } = render(<BattleModeSelector />);
    expect(getByText('RETOUR')).toBeTruthy();
  });

  it('selects WILD mode and sets phase to LOADING', () => {
    const state = useGameStore() as any;
    const { getByText } = render(<BattleModeSelector />);
    fireEvent.click(getByText(/POKÉMON SAUVAGE/i));
    expect(state.setBattleMode).toHaveBeenCalledWith('WILD');
    expect(MOCKS.setBattlePhase).toHaveBeenCalledWith('LOADING');
  });

  it('selects TRAINER mode and sets phase to LOADING', () => {
    const state = useGameStore() as any;
    const { getByText } = render(<BattleModeSelector />);
    fireEvent.click(getByText(/DRESSEUR/i));
    expect(state.setBattleMode).toHaveBeenCalledWith('TRAINER');
    expect(MOCKS.setBattlePhase).toHaveBeenCalledWith('LOADING');
  });

  it('selects PVP mode and sets phase to PVP_LOBBY', () => {
    const { getByText } = render(<BattleModeSelector />);
    fireEvent.click(getByText(/PVP/i));
    expect(MOCKS.setBattlePhase).toHaveBeenCalledWith('PVP_LOBBY');
  });

  it('renders description text for each mode', () => {
    const { getByText } = render(<BattleModeSelector />);
    expect(getByText(/Capture possible/i)).toBeTruthy();
    expect(getByText(/Combat 3v3/i)).toBeTruthy();
  });
});
