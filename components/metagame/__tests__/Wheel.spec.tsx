import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Wheel } from '../Wheel';
import { useGameStore } from '../../../store/gameStore';

describe('Wheel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const state = useGameStore() as any;
    state.user = { id: 1, grade_level: 'CP', global_xp: 500, gold: 1000, tokens: 10 };
    state.spendCurrency = vi.fn();
    state.fetchCollection = vi.fn();
    state.fetchInventory = vi.fn();
    state.fetchUser = vi.fn();
  });

  it('renders ROUE MYSTÈRE title', () => {
    const { getByText } = render(<Wheel />);
    expect(getByText(/ROUE MYSTÈRE/i)).toBeTruthy();
  });

  it('shows user token count', () => {
    const { getByText } = render(<Wheel />);
    expect(getByText('10')).toBeTruthy();
  });

  it('renders bet selection buttons', () => {
    const { getByText } = render(<Wheel />);
    expect(getByText('x1')).toBeTruthy();
    expect(getByText('x5')).toBeTruthy();
    expect(getByText('x10')).toBeTruthy();
  });

  it('renders spin button', () => {
    const { getByText } = render(<Wheel />);
    expect(getByText(/LANCER/i)).toBeTruthy();
  });

  it('renders segment labels on the wheel', () => {
    const { container } = render(<Wheel />);
    // Segments are rendered as images, not text labels in the visible wheel
    // The wheel has 8 segments with images
    const images = container.querySelectorAll('img[alt="Reward"]');
    expect(images.length).toBe(8);
  });

  it('changes bet on button click', () => {
    const { getByText } = render(<Wheel />);
    // Click x5 bet
    fireEvent.click(getByText('x5'));
    // Verify the x5 button is now highlighted (it has cyan-600 class)
    const x5btn = getByText('x5').closest('button');
    expect(x5btn?.className).toContain('cyan-600');
  });
});
