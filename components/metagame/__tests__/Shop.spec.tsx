import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Shop } from '../Shop';
import { useGameStore } from '../../../store/gameStore';

describe('Shop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const state = useGameStore() as any;
    state.user = { id: 1, grade_level: 'CP', global_xp: 500, gold: 1000, tokens: 10 };
    state.inventory = [];
    state.fetchInventory = vi.fn();
    state.spendCurrency = vi.fn();
  });

  it('renders MARKETPLACE header', () => {
    const { getByText } = render(<Shop />);
    expect(getByText('MARKETPLACE')).toBeTruthy();
  });

  it('shows user gold balance', () => {
    const { getByText } = render(<Shop />);
    expect(getByText('1000')).toBeTruthy();
  });

  it('renders ITEMS tab by default', () => {
    const { getByText } = render(<Shop />);
    expect(getByText('OBJETS')).toBeTruthy();
    expect(getByText('POKÉMON')).toBeTruthy();
  });

  it('shows empty items message when no items loaded', async () => {
    const { findByText } = render(<Shop />);
    // The async load resolves with empty data by default (from global mock)
    const msg = await findByText(/Aucun objet disponible/i);
    expect(msg).toBeTruthy();
  });

  it('can switch to POKEMON tab', async () => {
    const { getByText, findByText } = render(<Shop />);
    fireEvent.click(getByText('POKÉMON'));
    const msg = await findByText(/Aucun Pokémon disponible/i);
    expect(msg).toBeTruthy();
  });

  it('renders search and filter controls on POKEMON tab', () => {
    const { getByText, getByPlaceholderText } = render(<Shop />);
    fireEvent.click(getByText('POKÉMON'));
    expect(getByPlaceholderText('Rechercher...')).toBeTruthy();
  });

  it('renders subtitle text', () => {
    const { getByText } = render(<Shop />);
    expect(getByText(/Équipez-vous pour l'aventure/i)).toBeTruthy();
  });
});
