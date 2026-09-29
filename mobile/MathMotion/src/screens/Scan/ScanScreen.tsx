import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, useCameraDevice, useCameraPermission, usePhotoOutput } from 'react-native-vision-camera';

import { PaywallCard } from '../../components/Billing/PaywallCard';
import { CameraPermissionNotice } from '../../components/Scan/CameraPermissionNotice';
import { CaptureButton } from '../../components/Scan/CaptureButton';
import { ScanFrameOverlay } from '../../components/Scan/ScanFrameOverlay';
import { AppText } from '../../components/common/AppText';
import { useIsRTL } from '../../hooks/useIsRTL';
import { useScanAndRecognize } from '../../hooks/useScanAndRecognize';
import type { RootStackParamList } from '../../navigation/types';
import { translationKeyForApiError } from '../../services/api/apiError';
import { useEntitlementStore } from '../../store/useEntitlementStore';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { Icon, type IconName } from '../../components/common/Icon';

// Dark translucent "glass" for pills drawn over the live camera image —
// fixed, not themed: it sits on a photo, not on the app background.
const GLASS = 'rgba(17, 24, 39, 0.55)';
const ON_GLASS = '#FFFFFF';

// Laid out after the Stitch "camera_scan" design: the preview in a rounded
// card (help / status / flash on top, corner-bracket frame, hint pill at
// the bottom), a controls card (Type · shutter · Guide) and a dismissible
// tips card. The design's live "detected: quadratic 98%" overlay, gallery
// import and mode chips have no backing feature yet and are left out.
export function ScanScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const device = useCameraDevice('back');
  const { hasPermission, canRequestPermission, requestPermission } = useCameraPermission();
  const photoOutput = usePhotoOutput();
  const { recognize, recognizeFromGallery, recognizing, error } = useScanAndRecognize(photoOutput);
  const { isPremium, freeSolvesUsed, freeSolvesLimit } = useEntitlementStore();
  const quotaExhausted = !isPremium && freeSolvesUsed >= freeSolvesLimit;
  const [torchOn, setTorchOn] = useState(false);
  const [showTips, setShowTips] = useState(true);

  useEffect(() => {
    if (!hasPermission && canRequestPermission) {
      requestPermission();
    }
  }, [hasPermission, canRequestPermission, requestPermission]);

  const handleCapture = async () => {
    const result = await recognize();
    if (result) {
      navigation.navigate('RecognizedProblems', result);
    }
  };

  const handleGallery = async () => {
    const result = await recognizeFromGallery();
    if (result) {
      navigation.navigate('RecognizedProblems', result);
    }
  };

  if (!hasPermission) {
    return (
      <CameraPermissionNotice
        canRequestPermission={canRequestPermission}
        onRequestPermission={requestPermission}
      />
    );
  }

  const row = [styles.row, isRTL && styles.rowRTL];

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={styles.cameraCard}>
        {device && (
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive
            outputs={[photoOutput]}
            torchMode={torchOn ? 'on' : 'off'}
            enableNativeTapToFocusGesture
            // TextureView on Android, so the preview clips to the card's
            // rounded corners (SurfaceView ignores clipping).
            implementationMode="compatible"
          />
        )}
        <ScanFrameOverlay />

        <View style={[styles.topBar, isRTL && styles.rowRTL]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('drawer.guide')}
            onPress={() => navigation.navigate('Guide')}
            style={({ pressed }) => [styles.glassButton, pressed && styles.pressed]}
          >
            <Icon name="help-outline" color={ON_GLASS} />
          </Pressable>
          <View style={[styles.glassPill, isRTL && styles.rowRTL]}>
            <View style={[styles.statusDot, recognizing && styles.statusDotBusy]} />
            <AppText size="xs" weight="medium" color={ON_GLASS}>
              {recognizing ? t('scan.reading') : t('scan.ready')}
            </AppText>
          </View>
          {device?.hasTorch ? (
            <Pressable
              accessibilityRole="switch"
              accessibilityLabel={t('scan.flash')}
              accessibilityState={{ checked: torchOn }}
              onPress={() => setTorchOn(on => !on)}
              style={({ pressed }) => [
                styles.glassButton,
                torchOn && styles.glassButtonOn,
                pressed && styles.pressed,
              ]}
            >
              <Icon name={torchOn ? 'flashlight-on' : 'flashlight-off'} color={ON_GLASS} />
            </Pressable>
          ) : (
            <View style={styles.glassButtonSpacer} />
          )}
        </View>

        {recognizing && (
          <View style={styles.readingOverlay} pointerEvents="none">
            <ActivityIndicator color={ON_GLASS} size="large" />
            <AppText weight="bold" color={ON_GLASS}>
              {t('scan.reading')}
            </AppText>
          </View>
        )}

        <View style={[styles.hint, isRTL && styles.rowRTL]} pointerEvents="none">
          <Icon name="lightbulb-outline" size={18} color={ON_GLASS} />
          <AppText size="xs" color={ON_GLASS} style={styles.flexOne}>
            {t('scan.instruction')}
          </AppText>
        </View>
      </View>

      {quotaExhausted ? (
        <PaywallCard />
      ) : (
        <View style={styles.controlsCard}>
          {error && (
            <AppText size="sm" color={colors.danger} align="center">
              {t(translationKeyForApiError(error), { defaultValue: error.message })}
            </AppText>
          )}
          <View style={[styles.controls, isRTL && styles.rowRTL]}>
            <SideAction icon="photo-library" label={t('scan.gallery')} onPress={handleGallery} disabled={recognizing} />
            <CaptureButton onPress={handleCapture} loading={recognizing} disabled={!device} />
            <SideAction icon="keyboard" label={t('scan.typeInstead')} onPress={() => navigation.navigate('ProblemInput')} />
          </View>
        </View>
      )}

      {showTips && !quotaExhausted && (
        <View style={[styles.tips, ...row]}>
          <Icon name="tips-and-updates" color={colors.primaryText} />
          <View style={styles.flexOne}>
            <AppText size="sm" weight="bold">
              {t('scan.tipsTitle')}
            </AppText>
            <AppText size="xs" color={colors.textSecondary}>
              {t('scan.tipsBody')}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('drawer.close')}
            hitSlop={spacing.sm}
            onPress={() => setShowTips(false)}
          >
            <Icon name="close" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

interface SideActionProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

function SideAction({ icon, label, onPress, disabled }: SideActionProps) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.sideAction, (pressed || disabled) && styles.pressed]}
    >
      <Icon name={icon} size={26} color={colors.primaryText} />
      <AppText size="xs" weight="medium" align="center">
        {label}
      </AppText>
    </Pressable>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.md,
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
  cameraCard: {
    flex: 1,
    minHeight: 280,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  topBar: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  glassButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: GLASS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassButtonOn: {
    backgroundColor: colors.warning,
  },
  glassButtonSpacer: {
    width: 44,
  },
  glassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: 36,
    borderRadius: radius.pill,
    backgroundColor: GLASS,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  statusDotBusy: {
    backgroundColor: colors.warning,
  },
  readingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  hint: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: GLASS,
  },
  controlsCard: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sideAction: {
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tips: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryMuted,
  },
  pressed: {
    opacity: 0.7,
  },
}));
