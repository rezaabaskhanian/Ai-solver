import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { spacing, useColors } from '../../theme';
import { AppButton } from './AppButton';
import { AppText } from './AppText';

interface StatusNoticeProps {
  message?: string;
  loading?: boolean;
  onRetry?: () => void;
  retryLabel?: string;
}

// Shared loading / empty / error placeholder used by any list screen
// (Home's recent problems, History) so the three states stay visually
// consistent without each screen re-implementing them.
export function StatusNotice({ message, loading = false, onRetry, retryLabel }: StatusNoticeProps) {
  const colors = useColors();
  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator color={colors.primaryText} />
      ) : (
        <AppText color={colors.textSecondary} align="center">
          {message}
        </AppText>
      )}
      {onRetry && !loading && (
        <AppButton label={retryLabel ?? ''} variant="ghost" onPress={onRetry} style={styles.retry} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  retry: {
    paddingVertical: spacing.xs,
  },
});
