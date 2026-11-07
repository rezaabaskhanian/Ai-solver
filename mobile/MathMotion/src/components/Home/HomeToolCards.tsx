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
  screen: 'Scan' | 'ExamSetup' | 'Topics' | 'Konkur';
  bg: string;
  color: string;
  highlight?: boolean;
  badge?: string;
}

// 4 main feature hubs matching the design system
const TOOLS: Tool[] = [
  { icon: 'photo-camera', labelKey: 'home.toolScan', screen: 'Scan', bg: '#DCFCE7', color: '#15803D' },
  { icon: 'assignment', labelKey: 'home.toolExam', screen: 'ExamSetup', bg: '#DCFCE7', color: '#15803D', highlight: true, badge: 'هوشمند' },
  { icon: 'menu-book', labelKey: 'home.toolTopics', screen: 'Topics', bg: '#E0F2FE', color: '#0284C7' },
  { icon: 'lightbulb', labelKey: 'home.toolKonkur', screen: 'Konkur', bg: '#FEF3C7', color: '#D97706' },
];

export function HomeToolCards() {
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
          {tool.badge && (
            <View style={styles.badgePill}>
              <AppText size="xs" weight="bold" color="#0F1F05" style={{ fontSize: 9 }}>
                {tool.badge}
              </AppText>
            </View>
          )}
          <View style={[styles.icon, { backgroundColor: tool.bg }]}>
            <Icon name={tool.icon} size={22} color={tool.color} />
          </View>
          <AppText
            size="xs"
            weight="bold"
            align="center"
            color="#111827"
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
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    position: 'relative',
  },
  cardHighlight: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  badgePill: {
    position: 'absolute',
    top: -6,
    right: 8,
    backgroundColor: '#76E000',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    zIndex: 1,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
}));
