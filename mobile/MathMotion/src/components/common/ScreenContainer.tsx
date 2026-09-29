import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { makeStyles, spacing } from '../../theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function ScreenContainer({
  children,
  scroll = false,
  contentStyle,
  onRefresh,
  refreshing = false,
}: ScreenContainerProps) {
  const styles = useStyles();
  if (scroll) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          // Taps on buttons (e.g. ProblemInput's math keypad) work while
          // the keyboard is open instead of only dismissing it.
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined
          }
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={[styles.content, styles.flexOne, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  flexOne: {
    flex: 1,
  },
}));
