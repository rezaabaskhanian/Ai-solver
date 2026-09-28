import { DrawerActions, useNavigation } from '@react-navigation/native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { colors, spacing } from '../../theme';
import { AppText } from '../common/AppText';

// Opens the side drawer from inside the stack (DrawerActions bubbles up
// to the enclosing drawer navigator).
export function MenuButton() {
  const { t } = useTranslation();
  const navigation = useNavigation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('drawer.open')}
      hitSlop={spacing.sm}
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <AppText size="xl" color={colors.textPrimary}>
        ☰
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
});
