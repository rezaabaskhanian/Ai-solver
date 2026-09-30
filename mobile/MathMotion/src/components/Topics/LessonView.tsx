import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Lesson } from '../../content/lessons';
import type { TopicId } from '../../content/topics';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { AppText } from '../common/AppText';
import { Icon } from '../common/Icon';
import { MathExpression } from '../MathExpression/MathExpression';

interface Props {
  topicId: TopicId;
  lesson: Lesson;
}

// «درسنامه» on a Topic screen (content/lessons.ts): the idea with its
// formulas, worked examples step by step, and common mistakes shown as a
// wrong line next to the right one. Sentences come from i18n; math is
// always its own MathExpression line so RTL text never reorders it.
export function LessonView({ topicId, lesson }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [open, setOpen] = useState(true);
  const row = [styles.row, isRTL && styles.rowRTL];
  const k = (key: string) => `lessons.${topicId}.${key}`;

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={open ? t('lessons.ui.hide') : t('lessons.ui.show')}
        onPress={() => setOpen(o => !o)}
        style={row}
      >
        <View style={styles.headerIcon}>
          <Icon name="school" color={colors.primaryText} />
        </View>
        <AppText weight="bold" size="lg" style={styles.flexOne}>
          {t('lessons.ui.title')}
        </AppText>
        <Icon name={open ? 'expand-less' : 'expand-more'} color={colors.textSecondary} />
      </Pressable>

      {open && (
        <>
          {lesson.intro ? <AppText size="sm">{t(k('intro'))}</AppText> : null}

          <SectionTitle icon="lightbulb-outline" label={t('lessons.ui.concepts')} />
          {lesson.concepts.map(concept => (
            <View key={concept.key} style={styles.block}>
              <AppText size="sm">{t(k(`concepts.${concept.key}`))}</AppText>
              {concept.formula ? (
                <View style={styles.formula}>
                  <MathExpression expression={concept.formula} size="md" />
                </View>
              ) : null}
            </View>
          ))}

          <SectionTitle icon="edit-note" label={t('lessons.ui.examples')} />
          {lesson.examples.map(example => (
            <View key={example.key} style={styles.example}>
              <AppText size="sm" weight="bold">
                {t(k(`examples.${example.key}`))}
              </AppText>
              <View style={styles.formula}>
                <MathExpression expression={example.problem} size="md" emphasize />
              </View>
              {example.steps.map((step, i) => (
                <View key={step.math} style={[row, styles.alignStart]}>
                  <View style={styles.stepNumber}>
                    <AppText size="xs" weight="bold" color={colors.primaryText}>
                      {i + 1}
                    </AppText>
                  </View>
                  <View style={styles.flexOne}>
                    <MathExpression expression={step.math} size="md" />
                    {step.key ? (
                      <AppText size="sm" color={colors.textSecondary}>
                        {t(k(`steps.${step.key}`))}
                      </AppText>
                    ) : null}
                  </View>
                </View>
              ))}
              <View style={[row, styles.answer]}>
                <AppText size="sm" weight="bold" color={colors.success}>
                  {t('lessons.ui.answer')}
                </AppText>
                <View style={styles.flexOne}>
                  <MathExpression expression={example.answer} size="md" emphasize />
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('ProblemInput', { initialProblem: example.problem })}
                  style={({ pressed }) => [styles.tryIt, isRTL && styles.rowRTL, pressed && styles.pressed]}
                >
                  <Icon name="play-arrow" size={16} color={colors.primaryText} />
                  <AppText size="xs" weight="medium" color={colors.primaryText}>
                    {t('lessons.ui.tryIt')}
                  </AppText>
                </Pressable>
              </View>
            </View>
          ))}

          <SectionTitle icon="report-problem" label={t('lessons.ui.mistakes')} />
          {lesson.mistakes.map(mistake => (
            <View key={mistake.key} style={styles.mistake}>
              <AppText size="sm">{t(k(`mistakes.${mistake.key}`))}</AppText>
              {mistake.wrong ? (
                <View style={[row, styles.wrong]}>
                  <Icon name="close" size={18} color={colors.danger} />
                  <View style={styles.flexOne}>
                    <MathExpression expression={mistake.wrong} size="md" />
                  </View>
                </View>
              ) : null}
              {mistake.right ? (
                <View style={[row, styles.right]}>
                  <Icon name="check" size={18} color={colors.success} />
                  <View style={styles.flexOne}>
                    <MathExpression expression={mistake.right} size="md" />
                  </View>
                </View>
              ) : null}
            </View>
          ))}
        </>
      )}
    </View>
  );
}

function SectionTitle({ icon, label }: { icon: 'lightbulb-outline' | 'edit-note' | 'report-problem'; label: string }) {
  const colors = useColors();
  const styles = useStyles();
  const isRTL = useIsRTL();
  return (
    <View style={[styles.row, isRTL && styles.rowRTL, styles.sectionTitle]}>
      <Icon name={icon} size={18} color={colors.primaryText} />
      <AppText weight="bold" color={colors.primaryText}>
        {label}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
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
  alignStart: {
    alignItems: 'flex-start',
  },
  flexOne: {
    flex: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    marginTop: spacing.sm,
  },
  block: {
    gap: spacing.xs,
  },
  formula: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  example: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepNumber: {
    width: 24,
    height: 24,
    marginTop: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answer: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tryIt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
  },
  pressed: {
    opacity: 0.7,
  },
  mistake: {
    gap: spacing.xs,
  },
  wrong: {
    padding: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.dangerMuted,
  },
  right: {
    padding: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.successMuted,
  },
}));
