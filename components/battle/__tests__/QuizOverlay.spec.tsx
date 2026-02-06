import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { QuizOverlay } from '../QuizOverlay';

describe('QuizOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls onComplete with correct answer when user selects correct option', async () => {
    const onComplete = vi.fn();
    const onClose = vi.fn();
    const user = { id: 1, username: 'u', global_xp: 0, grade_level: 'CP', gold: 0 } as any;

    const question = {
      id: 'q1',
      subject: 'MATH',
      difficulty: 'EASY',
      question_text: 'Combien font 2+2 ?',
      options: ['3', '4', '5'],
      correct_index: 1,
      explanation: '2+2 = 4'
    } as any;

    vi.useFakeTimers();

    const { getByText } = render(
      <QuizOverlay user={user} onComplete={onComplete} onClose={onClose} preloadedQuestion={question} />
    );

    // Click the correct option (index 1 -> '4')
    await act(async () => {
      fireEvent.click(getByText('4'));
    });

    // advance timers to trigger onComplete
    await act(async () => {
      vi.advanceTimersByTime(1300);
    });

    expect(onComplete).toHaveBeenCalled();
    const call = onComplete.mock.calls[0];
    expect(call[0]).toBe(true);
    expect(typeof call[1]).toBe('number');
    expect(call[2]).toBe(question.difficulty);

    vi.useRealTimers();
  });
});
