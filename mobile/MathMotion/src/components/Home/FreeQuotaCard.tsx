import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useIsRTL } from '../../hooks/useIsRTL';
import { useEntitlementStore } from '../../store/useEntitlementStore';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { AppText } from '../common/AppText';
import { Icon } from '../common/Icon';

// Remaining free solves with a small progress bar (replaces the old
// FreeSolvesBadge on Home). For Premium users it shows a short
// "unlimited" line instead.
export function FreeQuotaCard() {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const { isPremium, freeSolvesUsed, freeSolvesLimit, quotaPeriod, premiumScansUsed, premiumScanLimit, loading } =
    useEntitlementStore();
  const daily = quotaPeriod === 'daily';

  if (loading) {
    return null;
  }

  const remaining = Math.max(freeSolvesLimit - freeSolvesUsed, 0);
  const ratio = freeSolvesLimit > 0 ? remaining / freeSolvesLimit : 0;
  const barColor = remaining === 0 ? '#EF4444' : '#76E000';

  return (
    <View style={[styles.card, isRTL && styles.rowRTL]}>
      <View style={[styles.row, isRTL && styles.rowRTL]}>
        <View style={styles.icon}>
          <Icon name={isPremium ? 'star' : 'bolt'} size={20} color="#15803D" />
        </View>
        <View>
          <AppText size="sm" weight="bold" color="#111827">
            {isPremium ? t('home.premiumTitle') : t(daily ? 'home.quotaTitleDaily' : 'home.quotaTitle')}
          </AppText>
          <AppText size="xs" color={remaining === 0 && !isPremium ? '#EF4444' : '#6B7280'}>
            {isPremium
              ? premiumScanLimit > 0
                ? t('home.premiumScans', { used: premiumScansUsed, limit: premiumScanLimit })
                : t('home.premiumBody')
              : t(daily ? 'home.quotaBodyDaily' : 'home.quotaBody', { remaining, limit: freeSolvesLimit })}
          </AppText>
        </View>
      </View>
      {!isPremium && (
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              isRTL && styles.fillRTL,
              { width: `${Math.round(ratio * 100)}%` as const, backgroundColor: barColor },
            ]}
          />
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
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
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    width: 100,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  fillRTL: {
    alignSelf: 'flex-end',
  },
}));
