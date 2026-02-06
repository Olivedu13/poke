import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PvPTurnDisplay } from '../PvPTurnDisplay';

// api is globally mocked in vitest.setup.ts

describe('PvPTurnDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('renders loading state initially', () => {
    const onMatchEnd = vi.fn();
    const { getByText } = render(<PvPTurnDisplay matchId={1} onMatchEnd={onMatchEnd} />);
    expect(getByText(/CHARGEMENT DU COMBAT/i)).toBeTruthy();
  });

  it('does not call onMatchEnd during loading', () => {
    const onMatchEnd = vi.fn();
    render(<PvPTurnDisplay matchId={1} onMatchEnd={onMatchEnd} />);
    expect(onMatchEnd).not.toHaveBeenCalled();
  });
});
