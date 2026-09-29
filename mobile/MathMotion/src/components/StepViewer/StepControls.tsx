import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { spacing, useColors } from '../../theme';
import { AppButton } from '../common/AppButton';
import { AppText } from '../common/AppText';

interface StepControlsProps {
  currentIndex: number;
  total: number;
  isFirst: boolean;
  isLast: boolean;
  isPlaying: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onTogglePlay: () => void;
  onReplay: () => void;
}

// PRD section 17: Play/Pause/Next/Previous/Replay, all driving the same
// step cursor the Animation Engine (StepCard) reveals from.
export function StepControls({
  currentIndex,
  total,
  isFirst,
  isLast,
  isPlaying,
  onPrevious,
  onNext,
  onTogglePlay,
  onReplay,
}: StepControlsProps) {
  const colors = useColors();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <AppText size="sm" color={colors.textSecondary} align="center">
        {t('solution.stepOf', { current: currentIndex + 1, total })}
      </AppText>
      <View style={styles.buttons}>
        <AppButton
          label={t('solution.previous')}
          variant="secondary"
          onPress={onPrevious}
          disabled={isFirst}
          style={styles.button}
        />
        <AppButton
          label={isPlaying ? t('solution.pause') : t('solution.play')}
          variant="primary"
          onPress={onTogglePlay}
          // At the last step there's nothing left to autoplay through —
          // Replay is the only way forward from here.
          disabled={isLast && !isPlaying}
          style={styles.button}
        />
        <AppButton
          label={t('solution.next')}
          variant="secondary"
          onPress={onNext}
          disabled={isLast}
          style={styles.button}
        />
      </View>
      <AppButton label={t('solution.replay')} variant="ghost" onPress={onReplay} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
  },
});
