import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PvPNotification } from '../PvPNotification';
import { useGameStore } from '../../../store/gameStore';

const MOCKS = (globalThis as any).__TEST_MOCKS__;

describe('PvPNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no pvpNotification', () => {
    const state = useGameStore();
    state.pvpNotification = null;
    const { container } = render(<PvPNotification />);
    // The motion.div may still render but the component returns null
    expect(container.textContent).toBe('');
  });

  it('renders notification with challenger name', () => {
    const state = useGameStore() as any;
    state.pvpNotification = { challengeId: 42, challengerName: 'Sacha' };
    state.setPvpNotification = MOCKS.setPvpNotification ?? vi.fn();
    state.setBattleMode = MOCKS.setBattleMode ?? vi.fn();
    state.setBattlePhase = MOCKS.setBattlePhase;
    state.setView = vi.fn();

    const { getByText } = render(<PvPNotification />);
    expect(getByText('Sacha')).toBeTruthy();
    expect(getByText(/Défi PVP/i)).toBeTruthy();
  });

  it('renders accept and decline buttons', () => {
    const state = useGameStore() as any;
    state.pvpNotification = { challengeId: 42, challengerName: 'Sacha' };
    state.setPvpNotification = vi.fn();
    state.setView = vi.fn();

    const { getByText } = render(<PvPNotification />);
    expect(getByText(/ACCEPTER/)).toBeTruthy();
    expect(getByText(/REFUSER/)).toBeTruthy();
  });

  it('decline clears notification', () => {
    const setPvpNotification = vi.fn();
    const state = useGameStore() as any;
    state.pvpNotification = { challengeId: 42, challengerName: 'Rival' };
    state.setPvpNotification = setPvpNotification;
    state.setView = vi.fn();

    const { getByText } = render(<PvPNotification />);
    fireEvent.click(getByText(/REFUSER/));
    expect(setPvpNotification).toHaveBeenCalledWith(null);
  });
});
