import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '../common/AppText';
import { spacing, useColors } from '../../theme';

// Shown over the AR camera feed until ViroARImageMarker reports the
// captured photo's target found (see ArSolutionScreen's onTrackingChange).
// Same visual language as ScanFrameOverlay's instruction text.
export function ArTrackingHint() {
  const colors = useColors();
  const { t } = useTranslation();

  return (
    <View pointerEvents="none" style={styles.container}>
      <AppText color={colors.textInverse} align="center" weight="medium">
        {t('arSolution.pointCamera')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
  },
});
