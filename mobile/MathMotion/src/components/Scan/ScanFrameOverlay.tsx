import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '../common/AppText';
import { colors, radius, spacing } from '../../theme';

// A framing guide over the live preview — purely visual guidance (no
// real-time detection in this pass), tells the user where to line up
// the paper before capturing.
export function ScanFrameOverlay() {
  const { t } = useTranslation();

  return (
    <View pointerEvents="none" style={styles.container}>
      <AppText color={colors.textInverse} align="center" style={styles.instruction}>
        {t('scan.instruction')}
      </AppText>
      <View style={styles.frame} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  instruction: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
  },
  frame: {
    width: '80%',
    aspectRatio: 1.2,
    borderWidth: 2,
    borderColor: colors.textInverse,
    borderRadius: radius.md,
  },
});
