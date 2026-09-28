import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { colors } from '../../theme';

interface CaptureButtonProps {
  onPress: () => void;
  loading: boolean;
  disabled?: boolean;
}

// The classic circular shutter button, overlaid on the camera preview.
export function CaptureButton({ onPress, loading, disabled }: CaptureButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="capture"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.outer,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {loading ? <ActivityIndicator color={colors.textInverse} /> : <Pressable style={styles.inner} />}
    </Pressable>
  );
}

const SIZE = 76;
const INNER_SIZE = 60;

const styles = StyleSheet.create({
  outer: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 4,
    borderColor: colors.textInverse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: INNER_SIZE,
    height: INNER_SIZE,
    borderRadius: INNER_SIZE / 2,
    backgroundColor: colors.textInverse,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
});
