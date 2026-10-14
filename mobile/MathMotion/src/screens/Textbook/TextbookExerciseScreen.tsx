import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { CelebrationOverlay } from '../../components/common/Celebration';
import { EmptyState } from '../../components/common/EmptyState';
import { Icon } from '../../components/common/Icon';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { KonkurLines } from '../../components/Konkur/KonkurLines';
import { API_BASE_URL } from '../../config/env';
import { findKonkurTip, toPersianDigits, type KonkurLine } from '../../content/konkur';
import { engineExpressionFor } from '../../content/konkur/engineExpression';
import { solutionSteps } from '../../content/konkur/solvingPath';
import {
  engineCandidates,
  exercisesForChapter,
  findChapter,
  isExerciseFree,
  type TextbookExercise,
} from '../../content/textbook';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { trackEvent } from '../../services/telemetry';
import { useEntitlementStore } from '../../store/useEntitlementStore';
import { useKonkurContent } from '../../store/useKonkurContentStore';
import { useTextbookProgressStore, useTextbookStore } from '../../store/useTextbookStore';
import { makeStyles, radius, spacing, useColors } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'TextbookExercise'>;

function figureUri(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

// A worked solution revealed one step at a time (or all at once), then
// its short final answer.
function SolutionSteps({ lines, answer, title }: { lines: KonkurLine[]; answer?: KonkurLine[]; title?: string }) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const steps = useMemo(() => solutionSteps(lines), [lines]);
  const [shown, setShown] = useState(1);
  const row = [styles.row, isRTL && styles.rowRTL];
  const allShown = shown >= steps.length;

  return (
    <View style={styles.solution}>
      <AppText weight="bold" size="sm">
        {title ??
          (steps.length > 1
            ? t('konkur.solutionSteps', { n: Math.min(shown, steps.length), total: steps.length })
            : t('konkur.solution'))}
      </AppText>
      {steps.slice(0, shown).map((step, i) => (
        <View key={i} style={[...row, styles.step]}>
          {steps.length > 1 && (
            <View style={styles.stepNo}>
              <AppText size="xs" weight="bold" color={colors.onPrimary}>
                {toPersianDigits(i + 1)}
              </AppText>
            </View>
          )}
          <View style={styles.flexOne}>
            <KonkurLines lines={step} />
          </View>
        </View>
      ))}
      {!allShown && (
        <View style={[...row, styles.wrap]}>
          <AppButton label={t('konkur.nextStep')} size="sm" icon="arrow-downward" onPress={() => setShown(n => n + 1)} />
          <AppButton label={t('konkur.showAllSteps')} variant="ghost" size="sm" onPress={() => setShown(steps.length)} />
        </View>
      )}
      {allShown && answer && answer.length > 0 && (
        <View style={styles.answer}>
          <View style={row}>
            <Icon name="check-circle" size={18} color={colors.success} />
            <AppText weight="bold" size="sm" color={colors.success}>
              {t('textbook.finalAnswer')}
            </AppText>
          </View>
          <KonkurLines lines={answer} />
        </View>
      )}
    </View>
  );
}

// One textbook exercise: the statement as in the book, then (on request)
// what it gives / asks and hints, then the solution step by step — per
// part when it has «الف، ب، ...» — and the study notes it is built on.
export function TextbookExerciseScreen({ route, navigation }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const all = useTextbookStore(s => s.exercises);
  const isPremium = useEntitlementStore(s => s.isPremium);
  const done = useTextbookProgressStore(s => s.done);
  const toggleDone = useTextbookProgressStore(s => s.toggleDone);
  const konkurContent = useKonkurContent();
  const exercise = all.find(e => e.id === route.params.exerciseId);
  const location = exercise ? findChapter(exercise.chapterId) : undefined;

  const [showSolution, setShowSolution] = useState(false);
  const [showUnderstand, setShowUnderstand] = useState(false);
  const [hintsShown, setHintsShown] = useState(0);
  // Confetti when «فهمیدم» completes the whole chapter.
  const [chapterDone, setChapterDone] = useState(false);

  // A new exercise (prev / next) starts closed again.
  useEffect(() => {
    setShowSolution(false);
    setShowUnderstand(false);
    setHintsShown(0);
  }, [route.params.exerciseId]);

  useLayoutEffect(() => {
    if (exercise) {
      navigation.setOptions({
        title: t('textbook.exerciseTitle', {
          section: t(`textbook.section.${exercise.section}`),
          n: toPersianDigits(exercise.number),
        }),
      });
    }
  }, [navigation, exercise, t]);

  // Neighbours in book order, skipping locked ones.
  const siblings = useMemo(
    () => (exercise ? exercisesForChapter(all, exercise.chapterId) : []),
    [all, exercise],
  );
  const index = exercise ? siblings.findIndex(e => e.id === exercise.id) : -1;
  const openable = (e: TextbookExercise | undefined) =>
    !!e && (isPremium || isExerciseFree(e, location?.chapter));
  const prev = siblings.slice(0, Math.max(index, 0)).reverse().find(openable);
  const next = siblings.slice(index + 1).find(openable);

  if (!exercise) {
    return (
      <ScreenContainer>
        <EmptyState icon="menu-book" title={t('textbook.notFound')} />
      </ScreenContainer>
    );
  }

  const guide = exercise.guide;
  const hints = guide?.hints ?? [];
  const hasUnderstand = !!(guide?.given?.length || guide?.asked?.length);
  const engineExpression = engineCandidates(exercise)
    .map(expression => engineExpressionFor({ expression }))
    .find((e): e is string => e !== null);
  const tips = (exercise.tipIds ?? [])
    .map(id => findKonkurTip(id, konkurContent))
    .filter(tip => tip !== undefined);
  const parts = exercise.parts ?? [];
  const isDone = !!done[exercise.id];
  const row = [styles.row, isRTL && styles.rowRTL];

  const markUnderstood = () => {
    const finishing = !isDone && siblings.every(e => e.id === exercise.id || done[e.id]);
    toggleDone(exercise.id);
    if (finishing) {
      setChapterDone(true);
      trackEvent('textbook_chapter_done', { book: exercise.bookId, chapter: exercise.chapterId });
    }
  };

  const reveal = () => {
    setShowSolution(true);
    trackEvent('textbook_solution_opened', { book: exercise.bookId, chapter: exercise.chapterId });
  };

  return (
    <View style={styles.flexOne}>
      <ScreenContainer scroll>
        <Card style={styles.card}>
          <View style={[...row, styles.wrap]}>
            <Badge label={t(`textbook.section.${exercise.section}`)} tone="primary" />
            <Badge label={t('textbook.page', { n: toPersianDigits(exercise.page) })} />
            {location && exercise.lesson ? (
              <Badge label={t('textbook.lessonShort', { n: toPersianDigits(exercise.lesson) })} />
            ) : null}
          </View>

          <KonkurLines lines={exercise.text} />
          {exercise.figureUrl && (
            <View style={styles.figureBox}>
              <Image
                source={{ uri: figureUri(exercise.figureUrl) }}
                style={styles.figure}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            </View>
          )}
          {parts.map(part => (
            <View key={part.label} style={[...row, styles.step]}>
              <View style={styles.partLabel}>
                <AppText size="sm" weight="bold" color={colors.primaryText}>
                  {part.label}
                </AppText>
              </View>
              <View style={styles.flexOne}>
                <KonkurLines lines={part.text} />
              </View>
            </View>
          ))}

          {engineExpression && (
            <AppButton
              label={t('konkur.solveWithEngine')}
              variant="secondary"
              size="sm"
              icon="functions"
              onPress={() => navigation.navigate('ProblemInput', { initialProblem: engineExpression })}
            />
          )}
        </Card>

        {!showSolution && (hasUnderstand || hints.length > 0) && (
          <View style={styles.path}>
            {hasUnderstand &&
              (showUnderstand ? (
                <View style={styles.understand}>
                  {guide?.given && guide.given.length > 0 && (
                    <View style={styles.part}>
                      <AppText weight="bold" size="sm" color={colors.primaryText}>
                        {t('konkur.given')}
                      </AppText>
                      <KonkurLines lines={guide.given} />
                    </View>
                  )}
                  {guide?.asked && guide.asked.length > 0 && (
                    <View style={styles.part}>
                      <AppText weight="bold" size="sm" color={colors.primaryText}>
                        {t('konkur.asked')}
                      </AppText>
                      <KonkurLines lines={guide.asked} />
                    </View>
                  )}
                </View>
              ) : (
                <AppButton
                  label={t('konkur.understand')}
                  variant="secondary"
                  size="sm"
                  icon="psychology"
                  onPress={() => setShowUnderstand(true)}
                />
              ))}
            {hints.slice(0, hintsShown).map((hint, i) => (
              <View key={i} style={styles.hint}>
                <AppText weight="bold" size="xs" color={colors.warning}>
                  {t('konkur.hintN', { n: i + 1 })}
                </AppText>
                <KonkurLines lines={hint} />
              </View>
            ))}
            {hintsShown < hints.length && (
              <AppButton
                label={
                  hintsShown === 0
                    ? t('konkur.getHint', { total: hints.length })
                    : t('konkur.nextHint', { n: hintsShown + 1, total: hints.length })
                }
                variant="ghost"
                size="sm"
                icon="lightbulb"
                onPress={() => setHintsShown(n => n + 1)}
              />
            )}
          </View>
        )}

        {!showSolution ? (
          <AppButton label={t('textbook.showSolution')} icon="visibility" onPress={reveal} />
        ) : (
          <View style={styles.path}>
            {exercise.solution.length > 0 && (
              <SolutionSteps
                key={`${exercise.id}-main`}
                lines={exercise.solution}
                answer={parts.length === 0 ? exercise.answer : undefined}
              />
            )}
            {parts.map(part =>
              part.solution.length > 0 ? (
                <SolutionSteps
                  key={`${exercise.id}-${part.label}`}
                  title={t('textbook.partSolution', { label: part.label })}
                  lines={part.solution}
                  answer={part.answer}
                />
              ) : null,
            )}
            {parts.length > 0 && exercise.answer && exercise.answer.length > 0 && (
              <View style={styles.answer}>
                <AppText weight="bold" size="sm" color={colors.success}>
                  {t('textbook.finalAnswer')}
                </AppText>
                <KonkurLines lines={exercise.answer} />
              </View>
            )}

            {guide?.trap && guide.trap.length > 0 && (
              <View style={styles.trap}>
                <View style={row}>
                  <Icon name="warning-amber" size={18} color={colors.danger} />
                  <AppText weight="bold" size="sm" color={colors.danger}>
                    {t('textbook.trap')}
                  </AppText>
                </View>
                <KonkurLines lines={guide.trap} />
              </View>
            )}

            {tips.length > 0 && (
              <Card style={styles.card}>
                <View style={row}>
                  <Icon name="menu-book" size={20} color={colors.primaryText} />
                  <AppText weight="bold" size="sm">
                    {t('textbook.notesUsed')}
                  </AppText>
                </View>
                {tips.map(tip => (
                  <Pressable
                    key={tip.id}
                    accessibilityRole="button"
                    onPress={() => navigation.push('KonkurTip', { tipId: tip.id })}
                    style={({ pressed }) => [...row, styles.tipRow, pressed && styles.pressed]}
                  >
                    <Icon name="lightbulb" size={18} color={colors.primaryText} />
                    <AppText size="sm" weight="medium" color={colors.primaryText} style={styles.flexOne}>
                      {tip.title}
                    </AppText>
                    <Icon name="chevron-right" size={18} color={colors.textSecondary} directional />
                  </Pressable>
                ))}
              </Card>
            )}

            <AppButton
              label={isDone ? t('textbook.understood') : t('textbook.markUnderstood')}
              variant={isDone ? 'secondary' : 'primary'}
              icon={isDone ? 'check-circle' : 'done'}
              onPress={markUnderstood}
            />
          </View>
        )}

        <View style={[...row, styles.nav]}>
          <AppButton
            label={t('textbook.previous')}
            variant="secondary"
            size="sm"
            disabled={!prev}
            onPress={() => prev && navigation.setParams({ exerciseId: prev.id })}
            style={styles.flexOne}
          />
          <AppButton
            label={t('textbook.next')}
            variant="secondary"
            size="sm"
            disabled={!next}
            onPress={() => next && navigation.setParams({ exerciseId: next.id })}
            style={styles.flexOne}
          />
        </View>
      </ScreenContainer>
      <CelebrationOverlay kind="courseDone" visible={chapterDone} onDone={() => setChapterDone(false)} />
    </View>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  wrap: {
    flexWrap: 'wrap',
  },
  flexOne: {
    flex: 1,
  },
  // Book figures are black on white, so they always sit on white.
  figureBox: {
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
  },
  figure: {
    width: '100%',
    height: 200,
  },
  partLabel: {
    minWidth: 32,
    height: 28,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryMuted,
  },
  path: {
    gap: spacing.md,
  },
  understand: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
  },
  part: {
    gap: spacing.xs,
  },
  hint: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningMuted,
  },
  solution: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
  },
  step: {
    alignItems: 'flex-start',
  },
  stepNo: {
    width: 22,
    height: 22,
    marginTop: 1,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  answer: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.successMuted,
  },
  trap: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerMuted,
  },
  tipRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
  },
  nav: {
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
}));
