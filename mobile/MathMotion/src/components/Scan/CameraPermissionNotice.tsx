import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../common/AppButton';
import { AppText } from '../common/AppText';
import { makeStyles, spacing, useColors } from '../../theme';
import { Icon } from '../common/Icon';

interface CameraPermissionNoticeProps {
  canRequestPermission: boolean;
  onRequestPermission: () => void;
}

// Shown instead of the camera preview until permission is granted —
// distinguishes "not asked yet" (show the request button) from "denied"
// (must be granted from system Settings, per useCameraPermission's docs).
export function CameraPermissionNotice({
  canRequestPermission,
  onRequestPermission,
}: CameraPermissionNoticeProps) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Icon name="photo-camera" size={48} color={colors.primaryText} />
      <AppText weight="bold" size="lg" align="center">
        {t('scan.permissionTitle')}
      </AppText>
      <AppText color={colors.textSecondary} align="center">
        {canRequestPermission ? t('scan.permissionBody') : t('scan.permissionDeniedBody')}
      </AppText>
      {canRequestPermission && (
        <AppButton label={t('scan.grantPermission')} onPress={onRequestPermission} />
      )}
    </View>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
}));
