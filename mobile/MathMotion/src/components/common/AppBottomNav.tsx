import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { radius, spacing } from '../../theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

export type BottomNavTab = 'Home' | 'Topics' | 'Konkur' | 'Profile';

interface Props {
  activeTab: BottomNavTab;
}

export function AppBottomNav({ activeTab }: Props) {
  const isRTL = useIsRTL();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Balanced bottom inset so icons don't sit too high up in the bar
  const bottomPadding = insets.bottom > 0 ? Math.min(insets.bottom, 16) : 6;

  const tabs: Array<{
    id: BottomNavTab;
    label: string;
    icon: 'home' | 'menu-book' | 'assignment' | 'account-circle';
  }> = [
    { id: 'Home', label: 'خانه', icon: 'home' },
    { id: 'Topics', label: 'مباحث', icon: 'menu-book' },
    { id: 'Konkur', label: 'تمرین‌ها', icon: 'assignment' },
    { id: 'Profile', label: 'پروفایل', icon: 'account-circle' },
  ];

  return (
    <View
      style={[
        styles.bottomBar,
        isRTL && styles.rowRTL,
        { paddingBottom: bottomPadding },
      ]}
    >
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;

        return (
          <Pressable
            key={tab.id}
            accessibilityRole="button"
            onPress={() => {
              if (!isActive) {
                navigation.navigate(tab.id);
              }
            }}
            style={styles.navItem}
          >
            {isActive ? (
              <View style={styles.activePill}>
                <Icon name={tab.icon} size={20} color="#0F1F05" />
              </View>
            ) : (
              <Icon name={tab.icon} size={22} color="#6B7280" />
            )}
            <AppText
              size="xs"
              weight={isActive ? 'bold' : 'regular'}
              color={isActive ? '#0F1F05' : '#6B7280'}
            >
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.md,
    paddingTop: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minWidth: 55,
    paddingVertical: 2,
  },
  activePill: {
    backgroundColor: '#76E000',
    paddingHorizontal: 14,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
});

