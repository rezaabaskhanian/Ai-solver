import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { AppText } from '../common/AppText';
import { Icon, type IconName } from '../common/Icon';

interface Tool {
  icon: IconName;
  labelKey: string;
  screen: 'Scan' | 'ExamSetup' | 'Topics' | 'Geometry';
  highlight?: boolean;
}

// Square shortcuts under the quota card; the exam one is highlighted
// like the design's active card.
const TOOLS: Tool[] = [
  { icon: 'photo-camera', labelKey: 'home.toolScan', screen: 'Scan' },
  { icon: 'assignment', labelKey: 'home.toolExam', screen: 'ExamSetup', highlight: true },
  { icon: 'menu-book', labelKey: 'home.toolTopics', screen: 'Topics' },
  { icon: 'square-foot', labelKey: 'home.toolGeometry', screen: 'Geometry' },
];

export function HomeToolCards() {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={[styles.row, isRTL && styles.rowRTL]}>
      {TOOLS.map(tool => (
        <Pressable
          key={tool.screen}
          accessibilityRole="button"
          onPress={() => navigation.navigate(tool.screen)}
          style={({ pressed }) => [
            styles.card,
            tool.highlight && styles.cardHighlight,
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.icon, tool.highlight && styles.iconHighlight]}>
            <Icon name={tool.icon} size={24} color={tool.highlight ? colors.primaryText : colors.textPrimary} />
          </View>
          <AppText
            size="sm"
            weight="bold"
            align="center"
            color={tool.highlight ? colors.primaryText : colors.textPrimary}
          >
            {t(tool.labelKey)}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  card: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0F2A12',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  cardHighlight: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primaryMuted,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconHighlight: {
    backgroundColor: colors.surface,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
}));
