import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { PREMIUM_PRODUCT_ID } from '../../config/env';
import { useIsRTL } from '../../hooks/useIsRTL';
import { usePurchasePremium } from '../../hooks/usePurchasePremium';
import { translationKeyForApiError } from '../../services/api/apiError';
import { getProductPrice, isPurchaseSupported } from '../../services/billing/poolakey';
import { useEntitlementStore } from '../../store/useEntitlementStore';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { AppText } from '../common/AppText';
import { Icon } from '../common/Icon';

// The design's accent-colored "upgrade to Pro" hero card. Runs the same
// Cafe Bazaar purchase as PaywallCard; hidden for Premium users and where
// in-app purchase isn't available (iOS / no Bazaar build).
// `compact` is the side drawer's one-row version (text + small button).
export function PremiumBanner({ compact = false }: { compact?: boolean }) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const { isPremium, loading } = useEntitlementStore();
  const { purchase, purchasing, error } = usePurchasePremium();
  const [price, setPrice] = useState<string | null>(null);

  useEffect(() => {
    if (!isPurchaseSupported()) {
      return;
    }
    getProductPrice(PREMIUM_PRODUCT_ID).then(result => {
      if (result) {
        setPrice(result.price);
      }
    });
  }, []);

  if (loading || isPremium || !isPurchaseSupported()) {
    return null;
  }

  if (compact) {
    return (
      <View style={[styles.card, styles.compactCard, isRTL && styles.rowRTL]}>
        <View style={styles.flexOne}>
          <AppText weight="bold" color={colors.onPrimary}>
            {t('home.proTitle')}
          </AppText>
          <AppText size="xs" color={colors.onPrimary} style={styles.body}>
            {t('home.proBodyShort')}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={purchasing}
          onPress={purchase}
          style={({ pressed }) => [styles.button, styles.compactButton, pressed && styles.pressed]}
        >
          {purchasing ? (
            <ActivityIndicator color={DARK_TEXT} />
          ) : (
            <AppText size="sm" weight="bold" align="center" color={DARK_TEXT}>
              {t('home.proActivate')}
            </AppText>
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={[styles.row, isRTL && styles.rowRTL]}>
        <View style={styles.icon}>
          <Icon name="military-tech" size={26} color={colors.onPrimary} />
        </View>
        <View style={styles.flexOne}>
          <View style={[styles.titleRow, isRTL && styles.rowRTL]}>
            <AppText weight="bold" size="lg" color={colors.onPrimary}>
              {t('home.proTitle')}
            </AppText>
            <View style={styles.tag}>
              <AppText size="xs" weight="bold" color={colors.primary}>
                {t('home.proTag')}
              </AppText>
            </View>
          </View>
          <AppText size="sm" color={colors.onPrimary} style={styles.body}>
            {t('home.proBody')}
          </AppText>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={purchasing}
        onPress={purchase}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        {purchasing ? (
          <ActivityIndicator color={DARK_TEXT} />
        ) : (
          <AppText weight="bold" align="center" color={DARK_TEXT}>
            {price ? t('home.proButtonPrice', { price }) : t('home.proButton')}
          </AppText>
        )}
      </Pressable>

      {error && (
        <AppText size="sm" align="center" color={colors.onPrimary}>
          {t(translationKeyForApiError(error), { defaultValue: error.message })}
        </AppText>
      )}
    </View>
  );
}

// The banner's button is always white with dark text (as in the design),
// which reads well on every accent and in dark mode.
const DARK_TEXT = '#111827';

const useStyles = makeStyles(colors => StyleSheet.create({
  card: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    elevation: 3,
  },
  compactButton: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  flexOne: {
    flex: 1,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    backgroundColor: colors.onPrimary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  body: {
    marginTop: spacing.xs,
    opacity: 0.9,
  },
  button: {
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
  },
}));
