import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock socketService
const emitMock = vi.fn();
const onMock = vi.fn();
const offMock = vi.fn();

vi.mock('../../services/socket', () => ({
  socketService: {
    emit: (...args: any[]) => emitMock(...args),
    on: (...args: any[]) => onMock(...args),
    off: (...args: any[]) => offMock(...args),
  }
}));

// Mock useGameStore
vi.mock('../../store/gameStore', () => ({
  useGameStore: () => ({
    user: { id: 42 },
    setBattlePhase: vi.fn(),
    setBattleMode: vi.fn(),
    setView: vi.fn()
  })
}));

import { PvPLobby } from '../PvPLobby';

describe('PvPLobby', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders lobby header and refresh button', () => {
    const { getByText } = render(<PvPLobby />);
    expect(getByText('⚔️ LOBBY PVP')).toBeTruthy();
    const refresh = getByText('🔄');
    fireEvent.click(refresh);
    expect(refresh).toBeTruthy();
  });
});
