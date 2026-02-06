import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Collection } from '../Collection';
import { useGameStore } from '../../../store/gameStore';

describe('Collection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const state = useGameStore() as any;
    state.user = { id: 1, grade_level: 'CP', global_xp: 500, gold: 100 };
    state.collection = [];
    state.inventory = [];
    state.fetchCollection = vi.fn();
    state.fetchInventory = vi.fn();
  });

  it('renders empty team message when collection is empty', () => {
    const { getByText } = render(<Collection />);
    expect(getByText(/Votre équipe est vide/i)).toBeTruthy();
  });

  it('calls fetchCollection and fetchInventory on mount', () => {
    const state = useGameStore() as any;
    render(<Collection />);
    expect(state.fetchCollection).toHaveBeenCalled();
    expect(state.fetchInventory).toHaveBeenCalled();
  });

  it('renders active team header', () => {
    const { getByText } = render(<Collection />);
    expect(getByText(/ÉQUIPE ACTIVE/i)).toBeTruthy();
  });

  it('renders reserve section', () => {
    const { getByText } = render(<Collection />);
    expect(getByText(/RÉSERVE/i)).toBeTruthy();
  });

  it('renders pokemon cards when collection has data', () => {
    const state = useGameStore() as any;
    state.collection = [
      { id: 'pk1', name: 'Pikachu', tyradex_id: 25, level: 10, current_hp: 80, max_hp: 100, current_xp: 50, next_level_xp: 100, sprite_url: '', is_team: true, stats: { atk: 55, def: 40, spe: 90 } },
      { id: 'pk2', name: 'Bulbizarre', tyradex_id: 1, level: 5, current_hp: 60, max_hp: 60, current_xp: 20, next_level_xp: 80, sprite_url: '', is_team: false, stats: { atk: 49, def: 49, spe: 45 } },
    ];

    const { getByText } = render(<Collection />);
    expect(getByText('Pikachu')).toBeTruthy();
    expect(getByText('Bulbizarre')).toBeTruthy();
  });

  it('renders team slots including empty placeholders', () => {
    const state = useGameStore() as any;
    state.collection = [
      { id: 'pk1', name: 'Pikachu', tyradex_id: 25, level: 10, current_hp: 80, max_hp: 100, current_xp: 50, next_level_xp: 100, sprite_url: '', is_team: true, stats: {} },
    ];

    const { getAllByText } = render(<Collection />);
    expect(getAllByText(/EMPLACEMENT VIDE/i).length).toBe(2);
  });

  it('renders CAPTURER PLUS card', () => {
    const { getByText } = render(<Collection />);
    expect(getByText(/CAPTURER PLUS/i)).toBeTruthy();
  });

  it('renders team toggle buttons on pokemon cards when collection > 3', () => {
    const state = useGameStore() as any;
    state.collection = [
      { id: 'pk1', name: 'Pikachu', tyradex_id: 25, level: 10, current_hp: 80, max_hp: 100, current_xp: 50, next_level_xp: 100, sprite_url: '', is_team: true, stats: {} },
      { id: 'pk2', name: 'Salameche', tyradex_id: 4, level: 5, current_hp: 60, max_hp: 60, current_xp: 20, next_level_xp: 80, sprite_url: '', is_team: true, stats: {} },
      { id: 'pk3', name: 'Carapuce', tyradex_id: 7, level: 5, current_hp: 44, max_hp: 44, current_xp: 10, next_level_xp: 80, sprite_url: '', is_team: true, stats: {} },
      { id: 'pk4', name: 'Bulbizarre', tyradex_id: 1, level: 5, current_hp: 60, max_hp: 60, current_xp: 20, next_level_xp: 80, sprite_url: '', is_team: false, stats: {} },
    ];

    const { getAllByText } = render(<Collection />);
    // Team members should have "− RETIRER" button, non-team should have "+ ÉQUIPE"
    expect(getAllByText(/RETIRER/i).length).toBeGreaterThanOrEqual(1);
    expect(getAllByText(/ÉQUIPE/i).length).toBeGreaterThanOrEqual(1);
  });

  it('opens pokemon detail modal on card click', () => {
    const state = useGameStore() as any;
    state.collection = [
      { id: 'pk1', name: 'Pikachu', tyradex_id: 25, level: 10, current_hp: 80, max_hp: 100, current_xp: 50, next_level_xp: 100, sprite_url: '/pika.png', is_team: true, stats: { atk: 55, def: 40, spe: 90 } },
    ];

    const { getByText, getAllByText } = render(<Collection />);
    fireEvent.click(getByText('Pikachu'));
    // Modal should show the Pokemon name in the detail view and RETOUR button(s)
    expect(getAllByText('← RETOUR').length).toBeGreaterThanOrEqual(1);
  });
});
