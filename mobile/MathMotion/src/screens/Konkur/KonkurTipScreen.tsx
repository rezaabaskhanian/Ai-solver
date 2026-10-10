import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { Icon } from '../../components/common/Icon';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { KonkurBookmarkButton } from '../../components/Konkur/KonkurBookmarkButton';
import { KonkurLines } from '../../components/Konkur/KonkurLines';
import { KonkurQuestionCard } from '../../components/Konkur/KonkurQuestionCard';
import { CURRICULUM } from '../../content/curriculum';
import { formulasForChapter } from '../../content/formulas';
import { findKonkurTip, questionsForTip } from '../../content/konkur';
import { useIsRTL } from '../../hooks/useIsRTL';
import { useKonkurContent, useTrackKonkurContent } from '../../store/useKonkurContentStore';
import type { RootStackParamList } from '../../navigation/types';
import { makeStyles, radius, spacing, useColors } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'KonkurTip'>;

// One tip: the explanation, an optional worked example (solution behind a
// button, so the student can try first), then every question tagged with it.
export function KonkurTipScreen({ route, navigation }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const content = useKonkurContent();
  const trackContent = useTrackKonkurContent();
  const tip = findKonkurTip(route.params.tipId, content);
  const isRTL = useIsRTL();
  const [showExample, setShowExample] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('konkur.tipTitle') });
  }, [navigation, t]);

  if (!tip) {
    return null;
  }

  // Opened from the notebook: just that one question, with a way back to all.
  const onlyId = route.params.questionId;
  // Questions of the student's track; a saved question of the other track
  // (kept from before a track change) still opens on its own.
  const trackQuestions = questionsForTip(tip.id, trackContent);
  const allQuestions =
    onlyId && !trackQuestions.some(q => q.id === onlyId) ? questionsForTip(tip.id, content) : trackQuestions;
  const visible = onlyId ? allQuestions.filter(q => q.id === onlyId) : allQuestions;
  const questions = visible.length > 0 ? visible : allQuestions;
  const filtered = !!onlyId && visible.length > 0;
  const chapter = tip.chapterId
    ? CURRICULUM.flatMap(g => g.books.flatMap(b => b.chapters.map(c => ({ grade: g.grade, chapter: c }))))
        .find(entry => entry.chapter.id === tip.chapterId)
    : undefined;

  return (
    <ScreenContainer scroll>
      <View style={[styles.titleRow, isRTL && styles.titleRowRTL]}>
        <View style={styles.header}>
          <AppText size="xs" color={colors.primaryText} weight="medium">
            {chapter
              ? `${t('topics.gradeChip', { grade: chapter.grade })} · ${chapter.chapter.title}`
              : t('konkur.general')}
          </AppText>
          <AppText weight="bold" size="xl">
            {tip.title}
          </AppText>
        </View>
        <KonkurBookmarkButton kind="tip" id={tip.id} />
      </View>

      <Card style={styles.card}>
        <KonkurLines lines={tip.body} />
      </Card>

      {tip.details && tip.details.length > 0 && (
        <Card style={styles.card}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('konkur.details')}
            accessibilityState={{ expanded: showDetails }}
            onPress={() => setShowDetails(v => !v)}
            style={[styles.detailsHeader, isRTL && styles.detailsHeaderRTL]}
          >
            <AppText weight="bold" style={styles.detailsTitle}>
              {t('konkur.details')}
            </AppText>
            <Icon name={showDetails ? 'expand-less' : 'expand-more'} color={colors.textSecondary} />
          </Pressable>
          {showDetails && <KonkurLines lines={tip.details} />}
        </Card>
      )}

      {tip.chapterId && formulasForChapter(tip.chapterId) && (
        <AppButton
          label={t('konkur.formulas.chapterLink')}
          variant="secondary"
          size="sm"
          icon="functions"
          onPress={() => navigation.navigate('FormulaChapter', { chapterId: tip.chapterId! })}
        />
      )}

      {tip.example && (
        <Card style={styles.card}>
          <AppText weight="bold">{t('konkur.example')}</AppText>
          <KonkurLines lines={tip.example.question} />
          {showExample ? (
            <View style={styles.solution}>
              <KonkurLines lines={tip.example.solution} />
            </View>
          ) : (
            <AppButton
              label={t('konkur.showSolution')}
              variant="secondary"
              size="sm"
              icon="visibility"
              onPress={() => setShowExample(true)}
            />
          )}
        </Card>
      )}

      <AppText weight="bold" size="lg">
        {t('konkur.tests', { count: questions.length })}
      </AppText>
      {questions.length === 0 ? (
        <AppText color={colors.textSecondary}>{t('konkur.noTests')}</AppText>
      ) : (
        questions.map(question => (
          <KonkurQuestionCard
            key={question.id}
            question={question}
            index={allQuestions.indexOf(question)}
            currentTipId={tip.id}
          />
        ))
      )}
      {filtered && (
        <AppButton
          label={t('konkur.progress.showAllTests', { count: allQuestions.length })}
          variant="secondary"
          size="sm"
          icon="list"
          onPress={() => navigation.setParams({ questionId: undefined })}
        />
      )}
    </ScreenContainer>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  titleRowRTL: {
    flexDirection: 'row-reverse',
  },
  header: {
    flex: 1,
    gap: spacing.xs,
  },
  card: {
    gap: spacing.md,
    padding: spacing.md,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailsHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  detailsTitle: {
    flex: 1,
  },
  solution: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
  },
}));
