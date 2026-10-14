import LottieView from 'lottie-react-native';
import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { LOTTIE_SOURCES, type CelebrationKind } from '../../assets/lottie';
import { useColors, type AppColors } from '../../theme';
import { Icon, type IconName } from './Icon';

interface CelebrationProps {
  kind: CelebrationKind;
  size?: number;
  // Loop forever (the streak flame); otherwise play once.
  loop?: boolean;
  // After a one-shot animation ends (right away with reduced motion).
  onFinish?: () => void;
  style?: StyleProp<ViewStyle>;
}

// Shown when a kind has no Lottie file (assets/lottie sets it to null).
const FALLBACK: Record<CelebrationKind, { icon: IconName; color: (c: AppColors) => string }> = {
  courseDone: { icon: 'celebration', color: c => c.primaryText },
  streak: { icon: 'local-fire-department', color: c => c.warning },
  correct: { icon: 'check-circle', color: c => c.success },
  wrong: { icon: 'cancel', color: c => c.danger },
  reviewDone: { icon: 'task-alt', color: c => c.success },
};

// One of the app's Lottie animations (assets/lottie). With the system's
// reduced-motion setting it shows the last frame, standing still.
export function Celebration({ kind, size = 120, loop = false, onFinish, style }: CelebrationProps) {
  const colors = useColors();
  const reduceMotion = useReducedMotion();
  const source = LOTTIE_SOURCES[kind];
  const pop = useSharedValue(reduceMotion ? 1 : 0.4);

  useEffect(() => {
    if (!reduceMotion) {
      pop.value = withSpring(1, { damping: 10, stiffness: 180 });
    }
    // Nothing plays, so nothing would ever report the end.
    if ((reduceMotion || !source) && onFinish && !loop) {
      const timer = setTimeout(onFinish, source ? 0 : 700);
      return () => clearTimeout(timer);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  if (!source) {
    const fb = FALLBACK[kind];
    return (
      <Animated.View style={[styles.center, { width: size, height: size }, popStyle, style]}>
        <Icon name={fb.icon} size={size * 0.7} color={fb.color(colors)} />
      </Animated.View>
    );
  }

  return (
    <View style={[{ width: size, height: size }, style]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LottieView
        source={source}
        autoPlay={!reduceMotion}
        loop={loop && !reduceMotion}
        progress={reduceMotion ? 1 : undefined}
        onAnimationFinish={reduceMotion ? undefined : () => onFinish?.()}
        style={StyleSheet.absoluteFill}
        resizeMode="contain"
      />
    </View>
  );
}

interface OverlayProps {
  kind: CelebrationKind;
  visible: boolean;
  // Called once the animation has played; the parent hides the overlay.
  onDone: () => void;
  size?: number;
}

// A one-shot animation over the whole screen (e.g. confetti) that never
// blocks touches and removes itself when done.
export function CelebrationOverlay({ kind, visible, onDone, size = 280 }: OverlayProps) {
  if (!visible) {
    return null;
  }
  return (
    <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
      <Celebration kind={kind} size={size} onFinish={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
