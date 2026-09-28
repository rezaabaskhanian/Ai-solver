import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { ApiError } from '../../services/api/apiError';
import { translationKeyForApiError } from '../../services/api/apiError';
import type { ParseResult } from '../../types/problem';
import { colors, spacing } from '../../theme';
import { AppText } from '../common/AppText';
import { Badge } from '../common/Badge';

const LOW_CONFIDENCE_THRESHOLD = 0.9;

interface ParsePreviewBannerProps {
  result: ParseResult | null;
  error: ApiError | null;
  loading: boolean;
}

// PRD section 7/30: preview the detected problem type before Solve, and
// surface a low-confidence hint (section 30: "Please check the detected
// equation") when normalization had to guess at the input.
export function ParsePreviewBanner({ result, error, loading }: ParsePreviewBannerProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <View style={styles.row}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <AppText size="sm" color={colors.danger}>
        {t(translationKeyForApiError(error), { defaultValue: error.message })}
      </AppText>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <View style={styles.row}>
      <Badge label={t(`problemTypes.${result.type}`, result.type)} tone="primary" />
      {result.confidence < LOW_CONFIDENCE_THRESHOLD && (
        <AppText size="xs" color={colors.warning}>
          {t('problemInput.checkEquation')}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 24,
  },
});
