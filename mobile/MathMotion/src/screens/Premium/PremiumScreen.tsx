import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { SubscriptionStatusCard } from '../../components/Billing/SubscriptionStatusCard';
import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { Icon } from '../../components/common/Icon';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { useIsRTL } from '../../hooks/useIsRTL';
import { usePurchasePremium } from '../../hooks/usePurchasePremium';
import { translationKeyForApiError } from '../../services/api/apiError';
import { fetchPlans } from '../../services/api/billing';
import { getProductPrices, isPurchaseSupported } from '../../services/billing/poolakey';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import type { Plan, ProductPrice } from '../../types/billing';

const BENEFITS = ['solves', 'scans', 'checks', 'stack'] as const;

// «اشتراک پرمیوم»: the plans for sale (admin panel → «اشتراک‌ها»), each a
// Cafe Bazaar in-app product that adds its days of Premium; buying again
// before it runs out stacks the days. Opened from every paywall/banner.
export function PremiumScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const { purchase, purchasing, error } = usePurchasePremium();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [prices, setPrices] = useState<Record<string, ProductPrice>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [bought, setBought] = useState(false);

  const load = () => {
    setLoadFailed(false);
    fetchPlans()
      .then(list => {
        setPlans(list);
        setSelected(current => current ?? list[0]?.product_id ?? null);
        if (isPurchaseSupported() && list.length > 0) {
          getProductPrices(list.map(p => p.product_id)).then(setPrices);
        }
      })
      .catch(() => setLoadFailed(true));
  };

  useEffect(load, []);

  const plan = plans?.find(p => p.product_id === selected) ?? null;
  const priceOf = (p: Plan) =>
    prices[p.product_id]?.price ??
    (p.price_toman > 0 ? t('premium.toman', { price: p.price_toman.toLocaleString('fa-IR') }) : null);

  const buy = async () => {
    if (plan && (await purchase(plan))) {
      setBought(true);
    }
  };

  return (
    <ScreenContainer scroll>
      <SubscriptionStatusCard />

      {bought && (
        <Card style={[styles.success, { backgroundColor: colors.successMuted }]}>
          <Icon name="check-circle" size={26} color={colors.success} />
          <AppText weight="bold" align="center">
            {t('premium.success')}
          </AppText>
        </Card>
      )}

      <Card style={styles.section}>
        <AppText weight="bold" size="lg">
          {t('premium.benefitsTitle')}
        </AppText>
        {BENEFITS.map(b => (
          <View key={b} style={[styles.row, isRTL && styles.rowRTL]}>
            <Icon name="check" size={18} color={colors.success} />
            <AppText size="sm" style={styles.flexOne}>
              {t(`premium.benefits.${b}`)}
            </AppText>
          </View>
        ))}
      </Card>

      {!isPurchaseSupported() ? (
        <AppText size="sm" color={colors.textSecondary} align="center">
          {t('billing.androidOnly')}
        </AppText>
      ) : loadFailed ? (
        <Card style={styles.section}>
          <AppText color={colors.danger} align="center">
            {t('premium.loadError')}
          </AppText>
          <AppButton label={t('premium.retry')} variant="secondary" onPress={load} />
        </Card>
      ) : plans === null ? (
        <ActivityIndicator color={colors.primary} />
      ) : plans.length === 0 ? (
        <AppText size="sm" color={colors.textSecondary} align="center">
          {t('premium.noPlans')}
        </AppText>
      ) : (
        <>
          <AppText weight="bold" size="lg">
            {t('premium.choosePlan')}
          </AppText>
          {plans.map(p => {
            const active = p.product_id === selected;
            const price = priceOf(p);
            return (
              <Pressable
                key={p.product_id}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => setSelected(p.product_id)}
                style={[styles.plan, active && styles.planActive, isRTL && styles.rowRTL]}
              >
                <Icon
                  name={active ? 'radio-button-checked' : 'radio-button-unchecked'}
                  color={active ? colors.primary : colors.textSecondary}
                />
                <View style={styles.flexOne}>
                  <AppText weight="bold">{p.name}</AppText>
                  <AppText size="sm" color={colors.textSecondary}>
                    {t('premium.days', { count: p.duration_days })}
                  </AppText>
                </View>
                {price && (
                  <AppText weight="bold" color={active ? colors.primaryText : colors.textPrimary}>
                    {price}
                  </AppText>
                )}
              </Pressable>
            );
          })}

          <AppButton
            label={purchasing ? t('billing.purchasing') : t('premium.buy')}
            icon="workspace-premium"
            onPress={buy}
            loading={purchasing !== null}
            disabled={!plan || purchasing !== null}
          />
          {error && (
            <AppText size="sm" color={colors.danger} align="center">
              {t(translationKeyForApiError(error), { defaultValue: error.message })}
            </AppText>
          )}
          <AppText size="xs" color={colors.textSecondary} align="center">
            {t('premium.note')}
          </AppText>
        </>
      )}
    </ScreenContainer>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  success: {
    gap: spacing.sm,
    alignItems: 'center',
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
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  planActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
}));
