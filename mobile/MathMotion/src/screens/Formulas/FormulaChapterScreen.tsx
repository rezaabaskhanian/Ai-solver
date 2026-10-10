import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { Icon } from '../../components/common/Icon';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { KonkurLines } from '../../components/Konkur/KonkurLines';
import { findFormulaChapter } from '../../content/formulas';
import { tipsForChapter } from '../../content/konkur';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { useTrackKonkurContent } from '../../store/useKonkurContentStore';
import { useKonkurStudyStore } from '../../store/useKonkurStudyStore';
import { makeStyles, spacing, useColors } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'FormulaChapter'>;

// One chapter's formula sheet: a card per rule, with a one-line caption.
export function FormulaChapterScreen({ route, navigation }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const { chapterId } = route.params;
  const ref = findFormulaChapter(chapterId);
  const content = useTrackKonkurContent();
  const marked = useKonkurStudyStore(s => s.formulaBookmarks.includes(chapterId));
  const toggle = useKonkurStudyStore(s => s.toggleFormulaBookmark);

  if (!ref) {
    return null;
  }
  const tips = tipsForChapter(chapterId, content);

  return (
    <ScreenContainer scroll>
      <View style={[styles.titleRow, isRTL && styles.titleRowRTL]}>
        <View style={styles.flexOne}>
          <AppText size="xs" color={colors.primaryText} weight="medium">
            {`${t('topics.gradeChip', { grade: ref.grade })} · ${ref.bookTitle}`}
          </AppText>
          <AppText weight="bold" size="xl">
            {ref.chapter.title}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={marked ? t('konkur.formulas.unbookmark') : t('konkur.formulas.bookmark')}
          accessibilityState={{ selected: marked }}
          hitSlop={8}
          onPress={() => toggle(chapterId)}
          style={styles.star}
        >
          <Icon name={marked ? 'star' : 'star-border'} color={marked ? colors.warning : colors.textSecondary} />
        </Pressable>
      </View>

      {ref.formulas.items.map((item, i) => (
        <Card key={i} style={styles.card}>
          <AppText weight="bold" size="sm" color={colors.primaryText}>
            {item.caption}
          </AppText>
          <KonkurLines lines={item.lines} />
        </Card>
      ))}

      {tips.length > 0 && (
        <AppButton
          label={t('konkur.formulas.tipsLink')}
          variant="secondary"
          icon="lightbulb"
          onPress={() => navigation.navigate('KonkurTip', { tipId: tips[0].id })}
        />
      )}
    </ScreenContainer>
  );
}

const useStyles = makeStyles(() => StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  titleRowRTL: {
    flexDirection: 'row-reverse',
  },
  flexOne: {
    flex: 1,
    gap: spacing.xs,
  },
  star: {
    padding: spacing.xs,
  },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
  },
}));
