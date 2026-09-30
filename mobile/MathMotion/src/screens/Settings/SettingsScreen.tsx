import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { SubscriptionStatusCard } from '../../components/Billing/SubscriptionStatusCard';
import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { MathExpression } from '../../components/MathExpression/MathExpression';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/useAuthStore';
import { useEntitlementStore } from '../../store/useEntitlementStore';
import { useThemeStore } from '../../store/useThemeStore';
import {
  ACCENTS,
  ACCENT_IDS,
  makeStyles,
  radius,
  spacing,
  TEXT_TONES,
  TEXT_TONE_IDS,
  useColors,
  type ThemeMode,
} from '../../theme';
import { Icon } from '../../components/common/Icon';

const MODES: ThemeMode[] = ['light', 'dark', 'system'];

// Appearance: light/dark mode, the app's main (accent) color and the text
// color. Every choice applies instantly and is saved (useThemeStore).
export function SettingsScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const { mode, accent, textTone, setMode, setAccent, setTextTone, reset } =
    useThemeStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isPremium = useEntitlementStore(state => state.isPremium);
  const { user, logout } = useAuthStore();

  const confirmLogout = () =>
    Alert.alert(t('auth.logoutConfirmTitle'), t('auth.logoutConfirmBody'), [
      { text: t('auth.cancel'), style: 'cancel' },
      { text: t('auth.logout'), style: 'destructive', onPress: () => logout() },
    ]);
  const rowStyle = [styles.row, isRTL && styles.rowRTL];

  return (
    <ScreenContainer scroll>
      {user && (
        <Card style={styles.section}>
          <View style={[styles.accountRow, isRTL && styles.rowRTL]}>
            <Icon name="account-circle" size={40} color={colors.primaryText} />
            <View style={styles.flexOne}>
              <AppText weight="bold">{user.nickname}</AppText>
              <AppText size="sm" color={colors.textSecondary} style={styles.ltr}>
                {user.phone}
              </AppText>
            </View>
          </View>
          <AppButton label={t('auth.logout')} icon="logout" variant="secondary" onPress={confirmLogout} />
        </Card>
      )}
      <SubscriptionStatusCard />
      <AppButton
        label={t(isPremium ? 'premium.extend' : 'premium.getPremium')}
        icon="workspace-premium"
        variant="secondary"
        onPress={() => navigation.navigate('Premium')}
      />

      <Card style={styles.section}>
        <AppText weight="bold" size="lg">
          {t('settings.modeTitle')}
        </AppText>
        <View style={[styles.segment, isRTL && styles.rowRTL]}>
          {MODES.map(option => {
            const active = option === mode;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setMode(option)}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
              >
                <AppText
                  size="sm"
                  weight="medium"
                  align="center"
                  color={active ? colors.onPrimary : colors.textSecondary}
                >
                  {t(`settings.mode.${option}`)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={styles.section}>
        <AppText weight="bold" size="lg">
          {t('settings.accentTitle')}
        </AppText>
        <AppText size="sm" color={colors.textSecondary}>
          {t('settings.accentHint')}
        </AppText>
        <View style={rowStyle}>
          {ACCENT_IDS.map(id => {
            const active = id === accent;
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={t(`settings.accent.${id}`)}
                accessibilityState={{ selected: active }}
                onPress={() => setAccent(id)}
                style={styles.option}
              >
                <View
                  style={[
                    styles.swatch,
                    { backgroundColor: ACCENTS[id][colors.scheme].primary },
                    active && styles.swatchActive,
                  ]}
                >
                  {active && (
                    <Icon name="check" color={ACCENTS[id][colors.scheme].onPrimary ?? '#FFFFFF'} />
                  )}
                </View>
                <AppText size="xs" align="center" color={colors.textSecondary}>
                  {t(`settings.accent.${id}`)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={styles.section}>
        <AppText weight="bold" size="lg">
          {t('settings.textTitle')}
        </AppText>
        <AppText size="sm" color={colors.textSecondary}>
          {t('settings.textHint')}
        </AppText>
        <View style={rowStyle}>
          {TEXT_TONE_IDS.map(id => {
            const active = id === textTone;
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={t(`settings.text.${id}`)}
                accessibilityState={{ selected: active }}
                onPress={() => setTextTone(id)}
                style={styles.option}
              >
                <View
                  style={[
                    styles.swatch,
                    styles.textSwatch,
                    active && styles.swatchActive,
                  ]}
                >
                  <AppText
                    weight="bold"
                    size="lg"
                    color={TEXT_TONES[id][colors.scheme].textPrimary}
                  >
                    {t('settings.textSample')}
                  </AppText>
                </View>
                <AppText size="xs" align="center" color={colors.textSecondary}>
                  {t(`settings.text.${id}`)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={styles.section}>
        <AppText weight="bold" size="lg">
          {t('settings.previewTitle')}
        </AppText>
        <AppText>{t('settings.previewBody')}</AppText>
        <AppText size="sm" color={colors.textSecondary}>
          {t('settings.previewSecondary')}
        </AppText>
        <View style={styles.previewMath}>
          <MathExpression expression="2x + 5 = 17" />
        </View>
        <AppButton label={t('settings.previewButton')} onPress={() => {}} />
      </Card>

      <AppButton label={t('settings.reset')} variant="ghost" onPress={reset} />
    </ScreenContainer>
  );
}

const useStyles = makeStyles(colors =>
  StyleSheet.create({
    section: {
      gap: spacing.md,
    },
    ltr: {
      writingDirection: 'ltr',
    },
    flexOne: {
      flex: 1,
    },
    accountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
    rowRTL: {
      flexDirection: 'row-reverse',
    },
    segment: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.pill,
      padding: 4,
    },
    segmentItem: {
      flex: 1,
      minHeight: 44,
      justifyContent: 'center',
      borderRadius: radius.pill,
    },
    segmentItemActive: {
      backgroundColor: colors.primary,
    },
    option: {
      width: 64,
      alignItems: 'center',
      gap: spacing.xs,
    },
    swatch: {
      width: 48,
      height: 48,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: 'transparent',
    },
    swatchActive: {
      borderColor: colors.textPrimary,
    },
    textSwatch: {
      backgroundColor: colors.surfaceMuted,
    },
    previewMath: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      padding: spacing.md,
    },
  }),
);
