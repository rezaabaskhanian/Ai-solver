import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Share from 'react-native-share';

import { useIsRTL } from '../../hooks/useIsRTL';
import { useEntitlementStore } from '../../store/useEntitlementStore';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { AppText } from '../common/AppText';
import { Card } from '../common/Card';
import { Icon } from '../common/Icon';

// «اشتراک من»: which Premium this device has, and its user code — what a
// user sends the operator (there's no login) so the admin panel can find
// them to grant days or move a subscription after a reinstall.
export function SubscriptionStatusCard() {
  const colors = useColors();
  const styles = useStyles();
  const { t, i18n } = useTranslation();
  const isRTL = useIsRTL();
  const { isPremium, premiumUntil, premiumLifetime, isUnlimited, userCode } = useEntitlementStore();

  const locale = i18n.language.startsWith('fa') ? 'fa-IR' : 'en-US';
  let status: string;
  if (isUnlimited) {
    status = t('premium.status.unlimited');
  } else if (premiumUntil) {
    status = t('premium.status.until', { date: new Date(premiumUntil).toLocaleDateString(locale) });
  } else if (premiumLifetime || isPremium) {
    status = t('premium.status.lifetime');
  } else {
    status = t('premium.status.free');
  }

  const shareCode = () => {
    if (userCode) {
      Share.open({ message: t('premium.shareMessage', { code: userCode }) }).catch(() => {});
    }
  };

  return (
    <Card style={styles.card}>
      <View style={[styles.row, isRTL && styles.rowRTL]}>
        <Icon
          name="workspace-premium"
          size={26}
          color={isPremium ? colors.success : colors.textSecondary}
        />
        <View style={styles.flexOne}>
          <AppText size="sm" color={colors.textSecondary}>
            {t('premium.status.title')}
          </AppText>
          <AppText weight="bold">{status}</AppText>
        </View>
      </View>

      {userCode && (
        <View style={[styles.row, styles.codeBox, isRTL && styles.rowRTL]}>
          <View style={styles.flexOne}>
            <AppText size="xs" color={colors.textSecondary}>
              {t('premium.userCode')}
            </AppText>
            {/* selectable: long-press to copy. */}
            <AppText weight="bold" size="lg" selectable style={styles.code}>
              {userCode}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('premium.shareCode')}
            onPress={shareCode}
            style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}
          >
            <Icon name="share" size={20} color={colors.primaryText} />
          </Pressable>
        </View>
      )}
      {userCode && (
        <AppText size="xs" color={colors.textSecondary}>
          {t('premium.userCodeHint')}
        </AppText>
      )}
    </Card>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  card: {
    gap: spacing.sm,
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
  codeBox: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  code: {
    letterSpacing: 2,
    writingDirection: 'ltr',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.7,
  },
}));
