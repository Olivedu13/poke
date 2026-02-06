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

  it('shows EXCELLENT text for correct answer', async () => {
    const user = { id: 1, username: 'u', global_xp: 0, grade_level: 'CP', gold: 0 } as any;
    const question = {
      id: 'q2', subject: 'MATH', difficulty: 'EASY',
      question_text: 'Question?', options: ['Alpha', 'Beta'], correct_index: 0, explanation: 'Explication'
    } as any;

    vi.useFakeTimers();
    const { getByText } = render(
      <QuizOverlay user={user} onComplete={vi.fn()} onClose={vi.fn()} preloadedQuestion={question} />
    );
    await act(async () => { fireEvent.click(getByText('Alpha')); });
    expect(getByText('EXCELLENT !')).toBeTruthy();
    vi.useRealTimers();
  });

  it('shows ERREUR text for wrong answer', async () => {
    const user = { id: 1, username: 'u', global_xp: 0, grade_level: 'CP', gold: 0 } as any;
    const question = {
      id: 'q3', subject: 'MATH', difficulty: 'MEDIUM',
      question_text: 'Question?', options: ['Alpha', 'Beta'], correct_index: 0, explanation: 'Wrong!'
    } as any;

    vi.useFakeTimers();
    const { getByText } = render(
      <QuizOverlay user={user} onComplete={vi.fn()} onClose={vi.fn()} preloadedQuestion={question} />
    );
    await act(async () => { fireEvent.click(getByText('Beta')); });
    expect(getByText('ERREUR')).toBeTruthy();
    vi.useRealTimers();
  });

  it('calls onComplete with isCorrect=false for wrong answer', async () => {
    const onComplete = vi.fn();
    const user = { id: 1, username: 'u', global_xp: 100, grade_level: 'CP', gold: 0 } as any;
    const question = {
      id: 'q4', subject: 'FRENCH', difficulty: 'HARD',
      question_text: '?', options: ['X', 'Y', 'Z'], correct_index: 2, explanation: 'Z is right'
    } as any;

    vi.useFakeTimers();
    const { getByText } = render(
      <QuizOverlay user={user} onComplete={onComplete} onClose={vi.fn()} preloadedQuestion={question} />
    );
    await act(async () => { fireEvent.click(getByText('X')); });
    await act(async () => { vi.advanceTimersByTime(1300); });
    expect(onComplete).toHaveBeenCalled();
    expect(onComplete.mock.calls[0][0]).toBe(false);
    expect(onComplete.mock.calls[0][1]).toBe(0); // 0 damage on wrong
    vi.useRealTimers();
  });

  it('renders close button', () => {
    const user = { id: 1, username: 'u', global_xp: 0, grade_level: 'CP', gold: 0 } as any;
    const question = {
      id: 'q5', subject: 'MATH', difficulty: 'EASY',
      question_text: 'Close?', options: ['A'], correct_index: 0, explanation: ''
    } as any;

    const onClose = vi.fn();
    const { getByText } = render(
      <QuizOverlay user={user} onComplete={vi.fn()} onClose={onClose} preloadedQuestion={question} />
    );
    fireEvent.click(getByText('✕'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders question text and subject badge', () => {
    const user = { id: 1, username: 'u', global_xp: 0, grade_level: 'CP', gold: 0 } as any;
    const question = {
      id: 'q6', subject: 'MATHS', difficulty: 'HARD',
      question_text: 'Solve this equation', options: ['1', '2', '3', '4'], correct_index: 1, explanation: ''
    } as any;

    const { getByText } = render(
      <QuizOverlay user={user} onComplete={vi.fn()} onClose={vi.fn()} preloadedQuestion={question} />
    );
    expect(getByText('Solve this equation')).toBeTruthy();
    expect(getByText('MATHS')).toBeTruthy();
    expect(getByText('HARD')).toBeTruthy();
  });

  it('renders answer option letters A, B, C, D', () => {
    const user = { id: 1, username: 'u', global_xp: 0, grade_level: 'CP', gold: 0 } as any;
    const question = {
      id: 'q7', subject: 'MATH', difficulty: 'EASY',
      question_text: '?', options: ['un', 'deux', 'trois', 'quatre'], correct_index: 0, explanation: ''
    } as any;

    const { getByText } = render(
      <QuizOverlay user={user} onComplete={vi.fn()} onClose={vi.fn()} preloadedQuestion={question} />
    );
    expect(getByText('A')).toBeTruthy();
    expect(getByText('B')).toBeTruthy();
    expect(getByText('C')).toBeTruthy();
    expect(getByText('D')).toBeTruthy();
  });

  it('shows explanation text after answering', async () => {
    const user = { id: 1, username: 'u', global_xp: 0, grade_level: 'CP', gold: 0 } as any;
    const question = {
      id: 'q8', subject: 'SCIENCE', difficulty: 'MEDIUM',
      question_text: '?', options: ['Alpha', 'Beta'], correct_index: 0, explanation: 'Because science!'
    } as any;

    vi.useFakeTimers();
    const { getByText } = render(
      <QuizOverlay user={user} onComplete={vi.fn()} onClose={vi.fn()} preloadedQuestion={question} />
    );
    await act(async () => { fireEvent.click(getByText('Alpha')); });
    expect(getByText('Because science!')).toBeTruthy();
    vi.useRealTimers();
  });

  it('disables options after selecting one', async () => {
    const user = { id: 1, username: 'u', global_xp: 0, grade_level: 'CP', gold: 0 } as any;
    const question = {
      id: 'q9', subject: 'MATH', difficulty: 'EASY',
      question_text: '?', options: ['Alpha', 'Beta'], correct_index: 0, explanation: ''
    } as any;
    const onComplete = vi.fn();

    vi.useFakeTimers();
    const { getByText } = render(
      <QuizOverlay user={user} onComplete={onComplete} onClose={vi.fn()} preloadedQuestion={question} />
    );
    await act(async () => { fireEvent.click(getByText('Alpha')); });
    // Click second option after first - should not re-trigger
    await act(async () => { fireEvent.click(getByText('Beta')); });
    await act(async () => { vi.advanceTimersByTime(1300); });
    // onComplete should only be called once
    expect(onComplete).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
