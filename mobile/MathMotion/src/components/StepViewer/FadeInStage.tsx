import React, { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { STAGE_DURATION_MS } from './animationTiming';

interface FadeInStageProps {
  children: React.ReactNode;
  playToken: number;
  delayMs: number;
  reduceMotion: boolean;
  fromTranslateY?: number;
  fromScale?: number;
  style?: StyleProp<ViewStyle>;
}

// One reveal step in the Animation Engine's staged sequence (PRD section
// 14): fades and slides `children` in, delayed by `delayMs` past when the
// parent step started revealing. `playToken` (not `children`/`delayMs`) is
// what re-triggers the animation, since Replay can jump back to a step
// whose content is identical to what's already on screen.
export function FadeInStage({
  children,
  playToken,
  delayMs,
  reduceMotion,
  fromTranslateY = 8,
  fromScale = 1,
  style,
}: FadeInStageProps) {
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(
      delayMs,
      withTiming(1, { duration: STAGE_DURATION_MS, easing: Easing.out(Easing.quad) }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- delayMs/fromTranslateY/fromScale are per-usage constants, not runtime-changing props.
  }, [playToken, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * fromTranslateY },
      { scale: fromScale + (1 - fromScale) * progress.value },
    ],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
