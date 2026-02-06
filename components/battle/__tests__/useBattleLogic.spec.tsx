import React from 'react';
import { render, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mocks
vi.mock('framer-motion', () => ({ useAnimation: () => ({ start: () => Promise.resolve() }) }));
vi.mock('../../services/api', () => ({ api: { post: vi.fn(() => Promise.resolve({})) } }));
vi.mock('../../utils/soundEngine', () => ({ playSfx: vi.fn() }));

// use shared mocks provided by vitest.setup.ts
const TEST_MOCKS = (globalThis as any).__TEST_MOCKS__ as any;

import { useBattleLogic } from '../useBattleLogic';

function TestHarness({ onReady }: { onReady: (api: any) => void }) {
  const api = useBattleLogic();
  React.useEffect(() => { onReady(api); }, []);
  return null;
}

describe('useBattleLogic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // reset shared mocks
    if (TEST_MOCKS) Object.values(TEST_MOCKS).forEach((m: any) => { if (typeof m === 'function' && m.mockReset) m.mockReset(); });
  });

  it('handleQuizComplete triggers attack on correct answer and ends turn', async () => {
    let api: any;
    render(<TestHarness onReady={(a) => (api = a)} />);

    await act(async () => {
      await api.handleQuizComplete(true, 0, 'MEDIUM');
    });

    expect(TEST_MOCKS.damageEntity).toHaveBeenCalled();
    expect(TEST_MOCKS.endTurn).toHaveBeenCalled();
    expect(TEST_MOCKS.addLog).toHaveBeenCalled();
  });

  it('handleQuizComplete on miss does not damage but ends turn', async () => {
    let api: any;
    render(<TestHarness onReady={(a) => (api = a)} />);

    await act(async () => {
      await api.handleQuizComplete(false, 0, 'MEDIUM');
    });

    expect(TEST_MOCKS.damageEntity).not.toHaveBeenCalled();
    expect(TEST_MOCKS.endTurn).toHaveBeenCalled();
    expect(TEST_MOCKS.addLog).toHaveBeenCalledWith(expect.objectContaining({ message: 'Raté...' }));
  });

  it('handleCapture without pokeball logs no pokeball', async () => {
    let api: any;
    render(<TestHarness onReady={(a) => (api = a)} />);

    await act(async () => {
      await api.handleCapture(true);
    });

    expect(TEST_MOCKS.addLog).toHaveBeenCalledWith(expect.objectContaining({ message: 'Pas de Pokéball !' }));
    expect(api.captureSuccess).toBe(false);
  });
});
