import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useIsRTL } from '../../hooks/useIsRTL';
import type { ApiError } from '../../services/api/apiError';
import { translationKeyForApiError } from '../../services/api/apiError';
import type { ParseResult } from '../../types/problem';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { AppText } from '../common/AppText';
import { Icon } from '../common/Icon';

const LOW_CONFIDENCE_THRESHOLD = 0.9;

interface ParsePreviewBannerProps {
  result: ParseResult | null;
  error: ApiError | null;
  loading: boolean;
}

// PRD section 7/30: preview the detected problem type before Solve, and
// surface a low-confidence hint (section 30: "Please check the detected
// equation") when normalization had to guess at the input. Styled as the
// Stitch "type_problem" detected-type pill (● ✦ Linear equation).
export function ParsePreviewBanner({ result, error, loading }: ParsePreviewBannerProps) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();

  if (loading) {
    return (
      <View style={[styles.pill, isRTL && styles.rowRTL]}>
        <ActivityIndicator size="small" color={colors.primaryText} />
        <AppText size="sm" color={colors.textSecondary}>
          {t('problemInput.detecting')}
        </AppText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.pill, styles.pillError, isRTL && styles.rowRTL]}>
        <AppText size="sm" color={colors.danger}>
          {t(translationKeyForApiError(error), { defaultValue: error.message })}
        </AppText>
      </View>
    );
  }

  if (!result) {
    return (
      <View style={[styles.pill, styles.pillIdle, isRTL && styles.rowRTL]}>
        <Icon name="auto-awesome" size={16} color={colors.textSecondary} />
        <AppText size="sm" color={colors.textSecondary}>
          {t('problemInput.typeHint')}
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.column}>
      <View style={[styles.pill, isRTL && styles.rowRTL]}>
        <View style={styles.dot} />
        <Icon name="auto-awesome" size={16} color={colors.primaryText} />
        <AppText size="sm" weight="bold" color={colors.primaryText}>
          {t(`problemTypes.${result.type}`, result.type)}
        </AppText>
      </View>
      {result.confidence < LOW_CONFIDENCE_THRESHOLD && (
        <AppText size="xs" color={colors.warning}>
          {t('problemInput.checkEquation')}
        </AppText>
      )}
    </View>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  column: {
    flex: 1,
    gap: spacing.xs,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
  },
  pillIdle: {
    backgroundColor: colors.surfaceMuted,
  },
  pillError: {
    backgroundColor: colors.dangerMuted,
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryText,
  },
}));
