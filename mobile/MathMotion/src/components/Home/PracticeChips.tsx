import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { AppText } from '../common/AppText';
import { MathExpression } from '../MathExpression/MathExpression';
import { EXAMPLE_PROBLEMS } from '../ProblemInput/mathKeys';

// "Ready-to-practice formulas": a horizontal row of example problems
// (the same engine-checked list as ProblemInput's empty state). Tapping
// one pre-fills ProblemInput — the student still presses Solve.
export function PracticeChips() {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.section}>
      <View style={[styles.header, isRTL && styles.rowRTL]}>
        <View style={[styles.titleRow, isRTL && styles.rowRTL]}>
          <View style={styles.greenDot} />
          <AppText weight="bold" size="sm" color="#111827">
            {t('home.practiceTitle')}
          </AppText>
        </View>
        <AppText size="xs" color="#6B7280">
          {t('home.practiceHint')}
        </AppText>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // Not mirrored in RTL: a reversed horizontal ScrollView would open
        // scrolled to the wrong end, and the chips are LTR math anyway.
        contentContainerStyle={styles.chips}
      >
        {EXAMPLE_PROBLEMS.map(problem => (
          <Pressable
            key={problem}
            accessibilityRole="button"
            onPress={() => navigation.navigate('ProblemInput', { initialProblem: problem })}
            style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
          >
            <MathExpression expression={problem} size="sm" />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#76E000',
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  pressed: {
    borderColor: '#76E000',
    backgroundColor: '#F0FDF4',
  },
}));
