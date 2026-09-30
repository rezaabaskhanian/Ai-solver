import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { useOpenPremium } from '../../hooks/useOpenPremium';
import { useEntitlementStore } from '../../store/useEntitlementStore';
import { spacing, useColors } from '../../theme';
import { AppButton } from '../common/AppButton';
import { AppText } from '../common/AppText';
import { Card } from '../common/Card';

// Replaces the Solve button on ProblemInputScreen (and Scan/Check/...) once
// the free-tier quota is used up (see useEntitlementStore) — explains the
// benefit and opens the plan picker (screens/Premium).
export function PaywallCard() {
  const colors = useColors();
  const { t } = useTranslation();
  const openPremium = useOpenPremium();
  const quotaPeriod = useEntitlementStore(state => state.quotaPeriod);

  return (
    <Card style={styles.card}>
      <AppText weight="bold" size="lg" align="center">
        {t(quotaPeriod === 'daily' ? 'billing.paywallTitleDaily' : 'billing.paywallTitle')}
      </AppText>
      <AppText color={colors.textSecondary} align="center">
        {t('billing.paywallBody')}
      </AppText>
      <AppButton label={t('billing.seePlans')} icon="workspace-premium" onPress={openPremium} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    alignItems: 'center',
  },
});
