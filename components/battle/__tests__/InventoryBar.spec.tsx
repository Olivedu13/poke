import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { InventoryBar } from '../InventoryBar';
import { Item } from '../../../types';

const createItem = (overrides: Partial<Item> = {}): Item => ({
  id: 'item1',
  name: 'Potion',
  description: 'Heals 20 HP',
  effect_type: 'HEAL',
  value: 20,
  quantity: 3,
  ...overrides,
});

describe('InventoryBar', () => {
  it('renders items list', () => {
    const items = [createItem(), createItem({ id: 'item2', name: 'Super Potion', quantity: 1 })];
    const onUse = vi.fn();
    const onClose = vi.fn();

    const { getByText } = render(
      <InventoryBar items={items} onUse={onUse} onClose={onClose} />,
    );

    expect(getByText('Potion')).toBeTruthy();
    expect(getByText('Super Potion')).toBeTruthy();
    expect(getByText('x3')).toBeTruthy();
    expect(getByText('x1')).toBeTruthy();
  });

  it('renders empty state when no items', () => {
    const { getByText } = render(
      <InventoryBar items={[]} onUse={vi.fn()} onClose={vi.fn()} />,
    );
    expect(getByText(/AUCUN OBJET EN STOCK/i)).toBeTruthy();
  });

  it('calls onUse when item is clicked', () => {
    const item = createItem();
    const onUse = vi.fn();

    const { getByText } = render(
      <InventoryBar items={[item]} onUse={onUse} onClose={vi.fn()} />,
    );

    fireEvent.click(getByText('Potion'));
    expect(onUse).toHaveBeenCalledWith(item);
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    const { getByText } = render(
      <InventoryBar items={[createItem()]} onUse={vi.fn()} onClose={onClose} />,
    );

    fireEvent.click(getByText('✕'));
    expect(onClose).toHaveBeenCalled();
  });

  it('disables items with zero quantity', () => {
    const item = createItem({ quantity: 0 });
    const onUse = vi.fn();

    const { container } = render(
      <InventoryBar items={[item]} onUse={onUse} onClose={vi.fn()} />,
    );

    const button = container.querySelector('button[disabled]');
    expect(button).toBeTruthy();
  });

  it('renders header with title', () => {
    const { getByText } = render(
      <InventoryBar items={[]} onUse={vi.fn()} onClose={vi.fn()} />,
    );
    expect(getByText('INVENTAIRE')).toBeTruthy();
  });
});
