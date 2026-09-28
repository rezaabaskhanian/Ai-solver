import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AUTOPLAY_STEP_MS } from '../components/StepViewer/animationTiming';
import { useStepNavigation } from './useStepNavigation';

// Minimal stand-in for @testing-library/react-hooks (not a project
// dependency): a host component re-runs `callback` on every render and
// stashes its latest return value on `result.current`, which `act()`
// keeps in sync since it flushes state updates synchronously.
function renderHook<T>(callback: () => T) {
  const result = {} as { current: T };
  function TestComponent() {
    result.current = callback();
    return null;
  }
  act(() => {
    ReactTestRenderer.create(<TestComponent />);
  });
  return result;
}

describe('useStepNavigation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts at the first step, not playing', () => {
    const result = renderHook(() => useStepNavigation(3));
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.isFirst).toBe(true);
    expect(result.current.isLast).toBe(false);
    expect(result.current.isPlaying).toBe(false);
  });

  it('goToPrevious/goToNext clamp at the ends instead of going out of range', () => {
    const result = renderHook(() => useStepNavigation(2));

    act(() => result.current.goToPrevious());
    expect(result.current.currentIndex).toBe(0);

    act(() => result.current.goToNext());
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.isLast).toBe(true);

    act(() => result.current.goToNext());
    expect(result.current.currentIndex).toBe(1);
  });

  it('play advances one step per AUTOPLAY_STEP_MS and stops itself at the end', () => {
    const result = renderHook(() => useStepNavigation(3));

    act(() => result.current.play());
    expect(result.current.isPlaying).toBe(true);

    act(() => {
      jest.advanceTimersByTime(AUTOPLAY_STEP_MS);
    });
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.isPlaying).toBe(true);

    act(() => {
      jest.advanceTimersByTime(AUTOPLAY_STEP_MS);
    });
    expect(result.current.currentIndex).toBe(2);
    // Play means "watch what's left", not loop forever -- reaching the
    // last step pauses itself rather than idly re-firing the timer.
    expect(result.current.isPlaying).toBe(false);
  });

  it('a manual Next/Previous while playing does not also leave the autoplay timer running', () => {
    const result = renderHook(() => useStepNavigation(3));

    act(() => result.current.play());
    act(() => result.current.goToNext());
    expect(result.current.currentIndex).toBe(1);

    // If the old timer from step 0 were still pending, this would silently
    // advance past step 1 without ever reading it.
    act(() => {
      jest.advanceTimersByTime(AUTOPLAY_STEP_MS - 1);
    });
    expect(result.current.currentIndex).toBe(1);
  });

  it('replay jumps back to the first step and resumes playing', () => {
    const result = renderHook(() => useStepNavigation(2));

    act(() => result.current.goToNext());
    expect(result.current.currentIndex).toBe(1);

    act(() => result.current.replay());
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.isPlaying).toBe(true);
  });

  it('bumps playToken on every transition, even one that replays the same index', () => {
    const result = renderHook(() => useStepNavigation(2));
    const initialToken = result.current.playToken;

    // Already at index 0 -- a naive "did the index change" check would
    // miss this, which is exactly why StepCard keys its animation off
    // playToken instead of the step id.
    act(() => result.current.replay());
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.playToken).not.toBe(initialToken);
  });
});
