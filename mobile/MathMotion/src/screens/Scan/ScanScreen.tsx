import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, usePhotoOutput } from 'react-native-vision-camera';

import { PaywallCard } from '../../components/Billing/PaywallCard';
import { CameraPermissionNotice } from '../../components/Scan/CameraPermissionNotice';
import { CaptureButton } from '../../components/Scan/CaptureButton';
import { ScanFrameOverlay } from '../../components/Scan/ScanFrameOverlay';
import { AppText } from '../../components/common/AppText';
import { useScanAndRecognize } from '../../hooks/useScanAndRecognize';
import type { RootStackParamList } from '../../navigation/types';
import { translationKeyForApiError } from '../../services/api/apiError';
import { useEntitlementStore } from '../../store/useEntitlementStore';
import { colors, spacing } from '../../theme';

export function ScanScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const device = useCameraDevice('back');
  const { hasPermission, canRequestPermission, requestPermission } = useCameraPermission();
  const photoOutput = usePhotoOutput();
  const { recognize, recognizing, error } = useScanAndRecognize(photoOutput);
  const { isPremium, freeSolvesUsed, freeSolvesLimit } = useEntitlementStore();
  const quotaExhausted = !isPremium && freeSolvesUsed >= freeSolvesLimit;

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

  if (!hasPermission) {
    return (
      <CameraPermissionNotice
        canRequestPermission={canRequestPermission}
        onRequestPermission={requestPermission}
      />
    );
  }

  return (
    <View style={styles.container}>
      {device && (
        <Camera style={StyleSheet.absoluteFill} device={device} isActive outputs={[photoOutput]} />
      )}
      <ScanFrameOverlay />

      {quotaExhausted ? (
        <View style={styles.paywall}>
          <PaywallCard />
        </View>
      ) : (
        <View style={styles.controls}>
          {error && (
            <AppText color={colors.danger} align="center" style={styles.error}>
              {t(translationKeyForApiError(error), { defaultValue: error.message })}
            </AppText>
          )}
          <CaptureButton onPress={handleCapture} loading={recognizing} disabled={!device} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  controls: {
    position: 'absolute',
    bottom: spacing.xxl,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: spacing.md,
  },
  paywall: {
    position: 'absolute',
    bottom: spacing.xxl,
    left: spacing.lg,
    right: spacing.lg,
  },
  error: {
    paddingHorizontal: spacing.lg,
  },
});
