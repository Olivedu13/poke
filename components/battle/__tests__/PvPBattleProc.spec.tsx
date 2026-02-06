import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { PvPBattleProc } from '../PvPBattleProc';
import { useGameStore } from '../../../store/gameStore';

describe('PvPBattleProc socket flows', () => {
  let callbacks: Record<string, Function> = {};
  const mockSocket = {
    on: vi.fn((event: string, cb: Function) => { callbacks[event] = cb; }),
    off: vi.fn(() => {}),
    emit: vi.fn(() => {}),
  } as any;

  beforeEach(async () => {
    vi.clearAllMocks();
    callbacks = {};
    // dynamically import socket module and replace exported socketService with our mock
    const socketMod = await import('../../../services/socket');
    // Replace methods on the exported instance so listeners register to our mocks
    // @ts-ignore
    socketMod.socketService.on = mockSocket.on;
    // @ts-ignore
    socketMod.socketService.off = mockSocket.off;
    // @ts-ignore
    socketMod.socketService.emit = mockSocket.emit;

    // set a logged user and a match id
    useGameStore.setState({ user: { id: 10, username: 'me', grade_level: 'CP', global_xp: 0 } });
    localStorage.setItem('pvp_match_id', '1');
  });

  it('registers listeners and reacts to match_state then allows answer submission', async () => {
    const { findByText, getByText } = render(<PvPBattleProc />);

    // should register listeners
    expect(mockSocket.on).toHaveBeenCalled();
    // simulate server sending initial match_state
    const matchState = {
      id: 1,
      player1Id: 10,
      player2Id: 20,
      player1Name: 'Me',
      player2Name: 'Opp',
      player1Team: [{ id: 1, tyradexId: 1, level: 5, name: 'P', spriteUrl: '/p.png', currentHp: 50, maxHp: 50 }],
      player2Team: [{ id: 2, tyradexId: 2, level: 4, name: 'O', spriteUrl: '/o.png', currentHp: 50, maxHp: 50 }],
      player1TeamHp: [50], player2TeamHp: [50],
      player1ActivePokemon: 0, player2ActivePokemon: 0,
      currentTurnId: 10, status: 'ONGOING', turnNumber: 1
    };

    const data = {
      match: { ...matchState, turnNumber: 2 },
      history: [],
      isMyTurn: true,
      currentQuestion: { id: 99, text: 'Quelle est 1+1?', options: ['1','2'], difficulty: 1 }
    };

    // invoke the registered match_state callback
    await act(async () => {
      callbacks['pvp:match_state']?.(data);
    });

    // question should be visible
    expect(await findByText(/Quelle est 1\+1\?/i)).toBeTruthy();

    // click second option (index 1)
    const option = getByText('2');
    await act(async () => { fireEvent.click(option); });

    // click VALIDER
    const submit = getByText('VALIDER');
    await act(async () => { fireEvent.click(submit); });

    // ensure submit emitted to socket
    expect(mockSocket.emit).toHaveBeenCalledWith('pvp:submit_answer', { matchId: 1, answerIndex: 1 });
  });
});
