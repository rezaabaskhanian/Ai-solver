import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { Icon } from '../../components/common/Icon';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { toPersianDigits } from '../../content/konkur';
import { formulaChaptersForTrack, type FormulaChapterRef } from '../../content/formulas';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { useTrack } from '../../store/usePreferencesStore';
import { useKonkurStudyStore } from '../../store/useKonkurStudyStore';
import { makeStyles, radius, spacing, useColors } from '../../theme';

// «برگه‌ی فرمول»: the chapters that have a formula sheet, by grade, for
// the student's track. Bookmarked sheets come first.
export function FormulaSheetScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const track = useTrack();
  const bookmarks = useKonkurStudyStore(s => s.formulaBookmarks);
  const refs = useMemo(() => formulaChaptersForTrack(track), [track]);
  const marked = useMemo(() => refs.filter(ref => bookmarks.includes(ref.chapter.id)), [refs, bookmarks]);
  const grades = useMemo(() => Array.from(new Set(refs.map(ref => ref.grade))).sort((a, b) => a - b), [refs]);
  const row = [styles.row, isRTL && styles.rowRTL];

  const renderRef = (ref: FormulaChapterRef, keyPrefix: string) => (
    <Card
      key={`${keyPrefix}${ref.chapter.id}`}
      onPress={() => navigation.navigate('FormulaChapter', { chapterId: ref.chapter.id })}
      style={[...row, styles.item]}
    >
      <View style={styles.icon}>
        <Icon name="functions" size={20} color={colors.primaryText} />
      </View>
      <View style={styles.flexOne}>
        <AppText weight="bold" size="sm">
          {ref.chapter.title}
        </AppText>
        <AppText size="xs" color={colors.textSecondary}>
          {ref.bookTitle} · {t('konkur.formulas.count', { n: toPersianDigits(ref.formulas.items.length) })}
        </AppText>
      </View>
      {bookmarks.includes(ref.chapter.id) && <Icon name="star" size={18} color={colors.warning} />}
      <Icon name="chevron-right" color={colors.textSecondary} directional />
    </Card>
  );

  return (
    <ScreenContainer scroll>
      <AppText color={colors.textSecondary}>{t('konkur.formulas.intro')}</AppText>
      {refs.length === 0 && <AppText color={colors.textSecondary}>{t('konkur.formulas.empty')}</AppText>}
      {marked.length > 0 && (
        <View style={styles.section}>
          <AppText weight="bold" size="lg">
            {t('konkur.formulas.marked')}
          </AppText>
          {marked.map(ref => renderRef(ref, 'm-'))}
        </View>
      )}
      {grades.map(grade => (
        <View key={grade} style={styles.section}>
          <AppText weight="bold" size="lg">
            {t('topics.gradeChip', { grade })}
          </AppText>
          {refs.filter(ref => ref.grade === grade).map(ref => renderRef(ref, 'g-'))}
        </View>
      ))}
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
  item: {
    padding: spacing.md,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
