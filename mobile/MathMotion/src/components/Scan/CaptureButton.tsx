import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { makeStyles, useColors } from '../../theme';
import { Icon } from '../common/Icon';

interface CaptureButtonProps {
  onPress: () => void;
  loading: boolean;
  disabled?: boolean;
}

// The shutter from the Stitch "camera_scan" design: an accent-filled
// circle inside a soft ring, sitting in the controls card below the
// camera (no longer overlaid on the preview).
export function CaptureButton({ onPress, loading, disabled }: CaptureButtonProps) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('scan.capture')}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [styles.ring, isDisabled && styles.disabled, pressed && !isDisabled && styles.pressed]}
    >
      <View style={styles.inner}>
        {loading ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Icon name="photo-camera" size={30} color={colors.onPrimary} />
        )}
      </View>
    </Pressable>
  );
}

const SIZE = 88;
const INNER_SIZE = 68;

const useStyles = makeStyles(colors => StyleSheet.create({
  ring: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 5,
    borderColor: colors.primaryMuted,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: INNER_SIZE,
    height: INNER_SIZE,
    borderRadius: INNER_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    transform: [{ scale: 0.95 }],
  },
}));
