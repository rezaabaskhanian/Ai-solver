import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useIsRTL } from '../../hooks/useIsRTL';
import { useStepNavigation } from '../../hooks/useStepNavigation';
import type { SolutionStep } from '../../types/problem';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { AppButton } from '../common/AppButton';
import { AppText } from '../common/AppText';
import { Card } from '../common/Card';
import { StepCard } from './StepCard';
import { Icon } from '../common/Icon';

interface StepViewerProps {
  steps: SolutionStep[];
}

// Stitch "solution_steps_1" player: a controls card ("step 2 of 3",
// restart link, segmented progress, Previous / Autoplay / Next) above
// the animated StepCard. Playback logic is useStepNavigation's.
export function StepViewer({ steps }: StepViewerProps) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const {
    currentIndex,
    playToken,
    isFirst,
    isLast,
    isPlaying,
    goToNext,
    goToPrevious,
    play,
    pause,
    replay,
  } = useStepNavigation(steps.length);

  if (steps.length === 0) {
    return null;
  }

  const row = [styles.row, isRTL && styles.rowRTL];
  // Past ~12 steps the segments get too thin — fall back to one bar.
  const segmented = steps.length <= 12;

  return (
    <View style={styles.container}>
      <Card style={styles.player}>
        <View style={row}>
          <View style={[row, styles.flexOne]}>
            <AppText weight="bold">{t('solution.stepsTitle')}</AppText>
            <View style={styles.counter}>
              <AppText size="xs" weight="bold" color={colors.onPrimary}>
                {t('solution.stepOf', { current: currentIndex + 1, total: steps.length })}
              </AppText>
            </View>
          </View>
          <Pressable accessibilityRole="button" hitSlop={spacing.sm} onPress={replay} style={row}>
            <Icon name="replay" size={18} color={colors.primaryText} />
            <AppText size="sm" weight="medium" color={colors.primaryText}>
              {t('solution.replay')}
            </AppText>
          </Pressable>
        </View>

        <View style={[styles.progress, isRTL && styles.rowRTL]}>
          {segmented ? (
            steps.map((step, i) => (
              <View key={step.id} style={[styles.segment, i <= currentIndex && styles.segmentDone]} />
            ))
          ) : (
            <View style={styles.segment}>
              <View
                style={[
                  styles.segmentDone,
                  styles.fill,
                  isRTL && styles.fillRTL,
                  { width: `${((currentIndex + 1) / steps.length) * 100}%` as const },
                ]}
              />
            </View>
          )}
        </View>

        <View style={[styles.controls, isRTL && styles.rowRTL]}>
          <AppButton
            size="sm"
            label={t('solution.previous')}
            variant="secondary"
            onPress={goToPrevious}
            disabled={isFirst}
            style={styles.sideButton}
          />
          <AppButton
            size="sm"
            label={isPlaying ? t('solution.pause') : t('solution.play')}
            icon={isPlaying ? 'pause' : 'play-arrow'}
            variant="primary"
            onPress={isPlaying ? pause : play}
            // At the last step there's nothing left to autoplay through —
            // Restart is the only way forward from here.
            disabled={isLast && !isPlaying}
            style={styles.playButton}
          />
          <AppButton
            size="sm"
            label={t('solution.next')}
            variant="secondary"
            onPress={goToNext}
            disabled={isLast}
            style={styles.sideButton}
          />
        </View>
      </Card>

      <StepCard step={steps[currentIndex]} index={currentIndex + 1} playToken={playToken} />
    </View>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  player: {
    gap: spacing.md,
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  flexOne: {
    flex: 1,
  },
  counter: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  progress: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  segmentDone: {
    backgroundColor: colors.primary,
  },
  fill: {
    height: '100%',
  },
  fillRTL: {
    alignSelf: 'flex-end',
  },
  controls: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sideButton: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  playButton: {
    flex: 1.4,
    paddingHorizontal: spacing.sm,
  },
}));
