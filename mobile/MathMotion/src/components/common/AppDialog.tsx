import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { makeStyles, radius, spacing, useColors, type AppColors } from '../../theme';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Tone = 'primary' | 'danger' | 'warning' | 'success';

export interface DialogAction {
  label: string;
  onPress: () => void;
  // 'primary' is the filled main button; 'danger' a filled red one for
  // throwing work away; 'secondary' the quiet outlined choice.
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: IconName;
}

interface AppDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  icon?: IconName;
  tone?: Tone;
  // Shown between the message and the buttons (e.g. a small summary).
  children?: React.ReactNode;
  // Stacked top to bottom; put the main action first.
  actions: DialogAction[];
  // Back button / tapping outside. Omit to make the dialog blocking.
  onDismiss?: () => void;
}

// The app's own replacement for Alert.alert: Android's native alert is a
// plain grey box that ignores the theme, fonts and RTL. This one is a
// rounded card with a tinted icon, Vazirmatn text and full-width pill
// buttons, and pops in with a small spring (skipped with reduced motion).
export function AppDialog({
  visible,
  title,
  message,
  icon,
  tone = 'primary',
  children,
  actions,
  onDismiss,
}: AppDialogProps) {
  const colors = useColors();
  const styles = useStyles();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      progress.value = 0;
      return;
    }
    progress.value = reduceMotion
      ? 1
      : withSpring(1, { damping: 16, stiffness: 220, mass: 0.8 });
  }, [visible, reduceMotion, progress]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 1.5),
    transform: [
      { scale: 0.88 + progress.value * 0.12 },
      { translateY: (1 - progress.value) * 16 },
    ],
  }));

  const toneColors = toneColorsOf(colors)[tone];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss ?? (() => {})}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onDismiss}
          disabled={!onDismiss}
          accessibilityRole="button"
          accessibilityLabel={actions.find(a => a.variant === 'secondary')?.label}
        />
        <Animated.View style={[styles.card, cardStyle]} accessibilityViewIsModal>
          {icon && (
            <View style={[styles.iconRing, { backgroundColor: toneColors.muted }]}>
              <View style={[styles.iconDot, { backgroundColor: toneColors.solid }]}>
                <Icon name={icon} size={30} color={colors.textInverse} />
              </View>
            </View>
          )}

          <AppText weight="bold" size="lg" align="center" accessibilityRole="header">
            {title}
          </AppText>
          {message ? (
            <AppText align="center" color={colors.textSecondary} style={styles.message}>
              {message}
            </AppText>
          ) : null}

          {children}

          <View style={styles.actions}>
            {actions.map(action => (
              <AppButton
                key={action.label}
                label={action.label}
                icon={action.icon}
                variant={action.variant ?? 'primary'}
                onPress={action.onPress}
              />
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const toneColorsOf = (colors: AppColors): Record<Tone, { solid: string; muted: string }> => ({
  primary: { solid: colors.primary, muted: colors.primaryMuted },
  danger: { solid: colors.danger, muted: colors.dangerMuted },
  warning: { solid: colors.warning, muted: colors.warningMuted },
  success: { solid: colors.success, muted: colors.successMuted },
});

const useStyles = makeStyles(colors => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'stretch',
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  iconRing: {
    alignSelf: 'center',
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  iconDot: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    lineHeight: 26,
  },
  actions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
}));
