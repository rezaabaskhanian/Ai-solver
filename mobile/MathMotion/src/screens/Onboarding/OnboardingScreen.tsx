import React from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { Logo } from '../../components/common/Logo';
import { MathExpression } from '../../components/MathExpression/MathExpression';
import { useIsRTL } from '../../hooks/useIsRTL';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { Icon } from '../../components/common/Icon';

const FEATURES = ['scan', 'steps', 'exam'] as const;
const PRIVACY_URL = 'https://mathmotion.ir/privacy';
// The hero's faint "graph paper" texture: GRID_LINES lines each way.
const GRID_STEP = 22;
const GRID_LINES = 24;

// First-launch intro, after the Stitch "onboarding" design: brand line,
// an illustration, the headline with the accented second line, feature
// chips and a start button. Rendered by App.tsx instead of the navigator
// until dismissed, so it uses no navigation hooks. The design's photos
// are replaced by math cards drawn in the app's own style. «شروع» opens
// sign-up and «ورود به حساب» opens login (App.tsx → AuthScreen).
export function OnboardingScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const complete = useOnboardingStore(s => s.complete);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} bounces={false}>
        <View style={styles.hero}>
          <View style={styles.grid} pointerEvents="none">
            {Array.from({ length: GRID_LINES }, (_, i) => (
              <React.Fragment key={i}>
                <View style={[styles.gridLineV, { left: i * GRID_STEP }]} />
                <View style={[styles.gridLineH, { top: i * GRID_STEP }]} />
              </React.Fragment>
            ))}
          </View>
          <View style={[styles.brand, isRTL && styles.rowRTL]}>
            <Logo size={36} />
            <AppText size="xl" weight="bold">
              MathMotion
            </AppText>
            <View style={styles.brandPill}>
              <AppText size="xs" weight="bold" color={colors.onPrimary}>
                {t('common.appName')}
              </AppText>
            </View>
          </View>
          <AppText size="sm" align="center" color={colors.textSecondary}>
            {t('onboarding.tagline')}
          </AppText>

          <View style={styles.cards}>
            <View style={[styles.sideCard, styles.leftCard]}>
              <AppText size="xxl" weight="bold" color={colors.primaryText}>
                x²
              </AppText>
            </View>
            <View style={styles.centerCard}>
              <MathExpression expression="2x + 5 = 17" size="md" emphasize />
              <AppText color={colors.textSecondary}>↓</AppText>
              <View style={styles.stepPill}>
                <AppText size="xs" weight="bold" color={colors.primaryText}>
                  − 5
                </AppText>
              </View>
              <AppText color={colors.textSecondary}>↓</AppText>
              <MathExpression expression="x = 6" size="lg" emphasize />
              <View style={styles.sparkle}>
                <Icon name="auto-awesome" size={26} color={colors.onPrimary} />
              </View>
            </View>
            <View style={[styles.sideCard, styles.rightCard]}>
              <AppText size="xxl" weight="bold" color={colors.success}>
                ∫
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.sheet}>
          <View style={styles.handle} />
          <AppText size="xxl" weight="bold" align="center">
            {t('onboarding.title')}
          </AppText>
          <View style={styles.accentLine}>
            <AppText size="xxl" weight="bold" align="center" color={colors.primaryText}>
              {t('onboarding.titleAccent')}
            </AppText>
            <View style={styles.underline} />
          </View>
          <AppText align="center" color={colors.textSecondary} style={styles.body}>
            {t('onboarding.body')}
          </AppText>

          <View style={[styles.chips, isRTL && styles.rowRTL]}>
            {FEATURES.map(feature => (
              <View key={feature} style={[styles.chip, isRTL && styles.rowRTL]}>
                <View style={styles.chipDot} />
                <AppText size="xs" weight="medium">
                  {t(`onboarding.features.${feature}`)}
                </AppText>
              </View>
            ))}
          </View>

          <AppButton
            label={t('onboarding.start')}
            iconEnd="arrow-forward"
            onPress={() => complete('register')}
            style={styles.start}
          />
          <AppButton
            label={t('onboarding.login')}
            variant="secondary"
            onPress={() => complete('login')}
            style={styles.login}
          />
          <AppText size="xs" align="center" color={colors.textSecondary} style={styles.legal}>
            {t('onboarding.legalPrefix')}
            <AppText
              size="xs"
              color={colors.textSecondary}
              style={styles.link}
              onPress={() => Linking.openURL(PRIVACY_URL)}
            >
              {t('onboarding.legalLink')}
            </AppText>
            {t('onboarding.legalSuffix')}
          </AppText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flexGrow: 1,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  hero: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  cards: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    height: 250,
    // LTR on purpose: the illustration is math, and the tilts assume it.
    direction: 'ltr',
  },
  sideCard: {
    width: 104,
    height: 150,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 4,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  leftCard: {
    marginRight: -20,
    transform: [{ rotate: '-8deg' }],
  },
  rightCard: {
    marginLeft: -20,
    transform: [{ rotate: '8deg' }],
  },
  centerCard: {
    zIndex: 1,
    width: 170,
    minHeight: 210,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 6,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    elevation: 6,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  stepPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
  },
  sparkle: {
    position: 'absolute',
    bottom: -26,
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    flex: 1,
    gap: spacing.sm,
    marginTop: -spacing.md,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.md,
    backgroundColor: colors.border,
  },
  accentLine: {
    alignSelf: 'center',
  },
  underline: {
    height: 4,
    marginTop: -4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  body: {
    marginTop: spacing.sm,
    lineHeight: 26,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  start: {
    minHeight: 56,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  login: {
    minHeight: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
  },
  legal: {
    marginTop: spacing.xs,
  },
  link: {
    textDecorationLine: 'underline',
  },
}));
