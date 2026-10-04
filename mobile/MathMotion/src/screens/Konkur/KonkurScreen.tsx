import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { Icon } from '../../components/common/Icon';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { CURRICULUM_GRADES, findCurriculumGrade, type CurriculumGrade } from '../../content/curriculum';
import {
  generalKonkurTips,
  questionsForTip,
  tipsForChapter,
  type KonkurTip,
} from '../../content/konkur';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { usePreferencesStore } from '../../store/usePreferencesStore';
import { refreshKonkurContent, useKonkurContent } from '../../store/useKonkurContentStore';
import { makeStyles, radius, spacing, useColors } from '../../theme';

// «نکات کنکوری و تست‌زنی»: general test-taking tips, then one grade's
// tips grouped by textbook chapter (content/konkur). Shares the
// remembered grade with Topics and Exam setup.
export function KonkurScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const content = useKonkurContent();
  useEffect(() => {
    refreshKonkurContent();
  }, []);
  const savedGrade = usePreferencesStore(s => s.grade);
  const setGrade = usePreferencesStore(s => s.setGrade);
  const grade: CurriculumGrade = savedGrade ?? 10;
  const curriculum = findCurriculumGrade(grade);
  const row = [styles.row, isRTL && styles.rowRTL];

  const renderTip = (tip: KonkurTip) => {
    const count = questionsForTip(tip.id, content).length;
    return (
      <Card
        key={tip.id}
        onPress={() => navigation.navigate('KonkurTip', { tipId: tip.id })}
        style={[...row, styles.tipCard]}
      >
        <View style={styles.tipIcon}>
          <Icon name="lightbulb" size={20} color={colors.primaryText} />
        </View>
        <View style={styles.flexOne}>
          <AppText weight="bold" size="sm">
            {tip.title}
          </AppText>
          <AppText size="xs" color={colors.textSecondary}>
            {count > 0 ? t('konkur.testsCount', { count }) : t('konkur.tipOnly')}
          </AppText>
        </View>
        <Icon name="chevron-right" color={colors.textSecondary} directional />
      </Card>
    );
  };

  const chapters = (curriculum?.books ?? []).flatMap(book =>
    book.chapters
      .map(chapter => ({ book: book.title, chapter, tips: tipsForChapter(chapter.id, content) }))
      .filter(entry => entry.tips.length > 0),
  );

  return (
    <ScreenContainer scroll>
      <AppText color={colors.textSecondary}>{t('konkur.intro')}</AppText>

      <View style={styles.section}>
        <AppText weight="bold" size="lg">
          {t('konkur.general')}
        </AppText>
        {generalKonkurTips(content).map(renderTip)}
      </View>

      {/* Not mirrored in RTL: a reversed horizontal ScrollView would open
          scrolled to the wrong end (same as Topics). */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {CURRICULUM_GRADES.map(g => {
          const active = g === grade;
          return (
            <Pressable
              key={g}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setGrade(g)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <AppText size="sm" weight="medium" color={active ? colors.onPrimary : colors.textPrimary}>
                {t('topics.gradeChip', { grade: g })}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {chapters.length === 0 ? (
        <AppText color={colors.textSecondary}>{t('konkur.noTips')}</AppText>
      ) : (
        chapters.map(({ book, chapter, tips }) => (
          <View key={chapter.id} style={styles.section}>
            <View>
              <AppText weight="bold">{chapter.title}</AppText>
              <AppText size="xs" color={colors.textSecondary}>
                {book}
              </AppText>
            </View>
            {tips.map(renderTip)}
          </View>
        ))
      )}

      <View style={[...row, styles.note]}>
        <Icon name="info-outline" size={16} color={colors.textSecondary} />
        <AppText size="xs" color={colors.textSecondary} style={styles.flexOne}>
          {t('konkur.sourceNote')}
        </AppText>
      </View>
    </ScreenContainer>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  flexOne: {
    flex: 1,
  },
  section: {
    gap: spacing.sm,
  },
  tipCard: {
    padding: spacing.md,
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    gap: spacing.sm,
  },
  tab: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  note: {
    gap: spacing.xs,
  },
}));
