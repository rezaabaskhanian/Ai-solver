import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { STUDY_TRACKS, type StudyTrack } from '../../content/track';
import { useIsRTL } from '../../hooks/useIsRTL';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

const ICONS: Record<StudyTrack, IconName> = {
  riazi: 'functions',
  tajrobi: 'science',
};

interface Props {
  value: StudyTrack;
  onChange: (track: StudyTrack) => void;
}

// Two big cards to pick the study track («رشته»): ریاضی و فیزیک / علوم
// تجربی. Used by the onboarding intro and by Settings.
export function TrackPicker({ value, onChange }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();

  return (
    <View style={[styles.row, isRTL && styles.rowRTL]}>
      {STUDY_TRACKS.map(track => {
        const active = track === value;
        return (
          <Pressable
            key={track}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(track)}
            style={[styles.card, active && styles.cardActive]}
          >
            <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
              <Icon name={ICONS[track]} size={26} color={active ? colors.onPrimary : colors.primaryText} />
            </View>
            <AppText weight="bold" align="center" color={active ? colors.primaryText : colors.textPrimary}>
              {t(`track.${track}`)}
            </AppText>
            <AppText size="xs" align="center" color={colors.textSecondary}>
              {t(`track.${track}Sub`)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  card: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    minHeight: 120,
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  cardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryMuted,
  },
  iconWrapActive: {
    backgroundColor: colors.primary,
  },
}));
