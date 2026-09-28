import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { PREMIUM_PRODUCT_ID } from '../../config/env';
import { usePurchasePremium } from '../../hooks/usePurchasePremium';
import { getProductPrice, isPurchaseSupported } from '../../services/billing/poolakey';
import { translationKeyForApiError } from '../../services/api/apiError';
import { colors, spacing } from '../../theme';
import { AppButton } from '../common/AppButton';
import { AppText } from '../common/AppText';
import { Card } from '../common/Card';

// Replaces the Solve button on ProblemInputScreen once the free-tier
// quota is used up (see useEntitlementStore) — explains the benefit
// and, on Android, triggers the real Cafe Bazaar purchase flow.
export function PaywallCard() {
  const { t } = useTranslation();
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

  return (
    <Card style={styles.card}>
      <AppText weight="bold" size="lg" align="center">
        {t('billing.paywallTitle')}
      </AppText>
      <AppText color={colors.textSecondary} align="center">
        {t('billing.paywallBody')}
      </AppText>

      {isPurchaseSupported() ? (
        <AppButton
          label={
            purchasing
              ? t('billing.purchasing')
              : t(price ? 'billing.upgradeButton' : 'billing.upgradeButtonNoPrice', { price })
          }
          onPress={purchase}
          loading={purchasing}
        />
      ) : (
        <AppText size="sm" color={colors.textSecondary} align="center">
          {t('billing.androidOnly')}
        </AppText>
      )}

      {error && (
        <AppText size="sm" color={colors.danger} align="center">
          {t(translationKeyForApiError(error), { defaultValue: error.message })}
        </AppText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    alignItems: 'center',
  },
});
