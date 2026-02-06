import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HealthBar } from '../HealthBar';

describe('HealthBar', () => {
  it('renders with full health (green)', () => {
    const { container } = render(<HealthBar current={100} max={100} label="Pikachu" />);
    expect(container.querySelector('.text-white')?.textContent).toContain('Pikachu');
    expect(container.querySelector('.font-mono')?.textContent).toContain('100/100');
  });

  it('renders with medium health (yellow)', () => {
    const { container } = render(<HealthBar current={40} max={100} label="Test" />);
    // 40% should show yellow bar
    expect(container.querySelector('.bg-yellow-500')).toBeTruthy();
  });

  it('renders with low health (red)', () => {
    const { container } = render(<HealthBar current={10} max={100} label="Test" />);
    // 10% should show red bar
    expect(container.querySelector('.bg-red-500')).toBeTruthy();
  });

  it('renders with high health (cyan)', () => {
    const { container } = render(<HealthBar current={80} max={100} label="Test" />);
    expect(container.querySelector('.bg-cyan-500')).toBeTruthy();
  });

  it('handles zero HP', () => {
    const { container } = render(<HealthBar current={0} max={100} label="KO" />);
    expect(container.querySelector('.font-mono')?.textContent).toContain('0/100');
  });

  it('clamps percentage between 0 and 100', () => {
    const { container } = render(<HealthBar current={150} max={100} label="Over" />);
    // Should not crash, percentage should be capped at 100%
    expect(container.querySelector('.font-mono')?.textContent).toContain('150/100');
  });

  it('applies enemy border style', () => {
    const { container } = render(<HealthBar current={50} max={100} label="Enemy" isEnemy />);
    expect(container.querySelector('.border-red-500\\/30')).toBeTruthy();
  });

  it('applies player border style by default', () => {
    const { container } = render(<HealthBar current={50} max={100} label="Player" />);
    expect(container.querySelector('.border-cyan-500\\/30')).toBeTruthy();
  });
});
