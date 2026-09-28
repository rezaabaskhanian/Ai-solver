import { useCallback, useEffect, useMemo, useState } from 'react';

import { AUTOPLAY_STEP_MS } from '../components/StepViewer/animationTiming';

// Step cursor + playback state for the Solution screen (PRD sections 14/
// 17: Play/Pause/Next/Previous/Replay on top of the Animation Engine).
// `playToken` increments on every transition -- tapped or autoplayed --
// so StepCard can re-run its reveal animation even when the destination
// index is one it already showed (Replay jumping back to step 0).
export function useStepNavigation(totalSteps: number) {
  const [currentIndex, setCurrentIndexRaw] = useState(0);
  const [playToken, setPlayToken] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const goTo = useCallback((next: number) => {
    setCurrentIndexRaw(next);
    setPlayToken(token => token + 1);
  }, []);

  const clampedIndex = Math.min(currentIndex, Math.max(totalSteps - 1, 0));
  const isFirst = clampedIndex === 0;
  const isLast = clampedIndex >= totalSteps - 1;

  // Auto-advance one step at a time while playing, pacing itself to the
  // same reveal timing StepCard actually animates on (see
  // animationTiming.ts) so autoplay never jumps ahead mid-reveal.
  useEffect(() => {
    if (!isPlaying || isLast) {
      return;
    }
    const timer = setTimeout(() => {
      goTo(Math.min(clampedIndex + 1, totalSteps - 1));
    }, AUTOPLAY_STEP_MS);
    return () => clearTimeout(timer);
  }, [isPlaying, isLast, clampedIndex, totalSteps, goTo]);

  // Play always means "watch what's left", not "loop forever" -- once the
  // last step is reached it stops itself, and Replay is the explicit way
  // to start over.
  useEffect(() => {
    if (isLast) {
      setIsPlaying(false);
    }
  }, [isLast]);

  return useMemo(
    () => ({
      currentIndex: clampedIndex,
      playToken,
      isFirst,
      isLast,
      isPlaying,
      goToNext: () => goTo(Math.min(clampedIndex + 1, totalSteps - 1)),
      goToPrevious: () => goTo(Math.max(clampedIndex - 1, 0)),
      play: () => setIsPlaying(true),
      pause: () => setIsPlaying(false),
      replay: () => {
        goTo(0);
        setIsPlaying(true);
      },
    }),
    [clampedIndex, playToken, isFirst, isLast, isPlaying, totalSteps, goTo],
  );
}
