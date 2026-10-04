import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, type ImageSourcePropType, StyleSheet, View } from 'react-native';

import { findKonkurTip, sourceLabel, type KonkurQuestion } from '../../content/konkur';
import { API_BASE_URL } from '../../config/env';
import { useKonkurContent } from '../../store/useKonkurContentStore';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { AppButton } from '../common/AppButton';
import { AppText } from '../common/AppText';
import { Badge } from '../common/Badge';
import { Card } from '../common/Card';
import { Icon } from '../common/Icon';
import { MathExpression } from '../MathExpression/MathExpression';
import { QuizChoice } from '../Quiz/QuizChoice';
import { KonkurLines } from './KonkurLines';

// A choice like «وجود ندارد» is prose, not math, even in a math question.
const PERSIAN_LETTERS = /[\u0600-\u06FF]/;

interface Props {
  question: KonkurQuestion;
  index: number;
  // The tip page this card is on — its own chip isn't a link.
  currentTipId?: string;
}

// Bundled questions carry a require()d figure; server ones a URL that is
// relative to the API host (or already absolute).
function figureSourceOf(question: KonkurQuestion): ImageSourcePropType | undefined {
  if (question.figure) {
    return question.figure;
  }
  if (!question.figureUrl) {
    return undefined;
  }
  const url = /^https?:\/\//i.test(question.figureUrl)
    ? question.figureUrl
    : `${API_BASE_URL}${question.figureUrl.startsWith('/') ? '' : '/'}${question.figureUrl}`;
  return { uri: url };
}

// One multiple-choice question: answer once, then see right/wrong, the
// worked solution, and which tips it uses (each a link to that tip).
export function KonkurQuestionCard({ question, index, currentTipId }: Props) {
  const colors = useColors();
  const content = useKonkurContent();
  const figureSource = figureSourceOf(question);
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const row = [styles.row, isRTL && styles.rowRTL];

  const stateOf = (i: number) => {
    if (!answered) {
      return 'default' as const;
    }
    if (i === question.answer) {
      return 'correct' as const;
    }
    return i === picked ? ('incorrect' as const) : ('default' as const);
  };

  return (
    <Card style={styles.card}>
      <View style={[...row, styles.header]}>
        <AppText weight="bold" size="sm">
          {t('konkur.question', { n: index + 1 })}
        </AppText>
        <Badge label={sourceLabel(question.source)} tone={question.source.kind === 'konkur' ? 'primary' : 'neutral'} />
      </View>

      <AppText weight="medium">{question.text}</AppText>
      {question.expression && (
        <View style={styles.expression}>
          <MathExpression expression={question.expression} size="lg" />
        </View>
      )}

      {figureSource && (
        <View style={styles.figureBox}>
          <Image source={figureSource} style={styles.figure} resizeMode="contain" accessibilityIgnoresInvertColors />
        </View>
      )}

      <View style={styles.choices}>
        {question.choices.map((choice, i) => (
          <View key={`${question.id}-${i}`} style={row}>
            <AppText size="sm" weight="bold" color={colors.textSecondary} style={styles.choiceNo}>
              {i + 1}
            </AppText>
            <View style={styles.flexOne}>
              <QuizChoice
                label={choice}
                math={question.choicesMath !== false && !PERSIAN_LETTERS.test(choice)}
                disabled={answered}
                state={stateOf(i)}
                onPress={() => setPicked(i)}
              />
            </View>
          </View>
        ))}
      </View>

      {answered && (
        <View style={styles.result}>
          <View style={row}>
            <Icon
              name={picked === question.answer ? 'check-circle' : 'cancel'}
              color={picked === question.answer ? colors.success : colors.danger}
            />
            <AppText weight="bold" color={picked === question.answer ? colors.success : colors.danger} style={styles.flexOne}>
              {picked === question.answer
                ? t('konkur.correct')
                : t('konkur.incorrect', { n: question.answer + 1 })}
            </AppText>
          </View>

          <View style={styles.solution}>
            <AppText weight="bold" size="sm">
              {t('konkur.solution')}
            </AppText>
            <KonkurLines lines={question.solution} />
          </View>

          <AppText weight="bold" size="sm">
            {t('konkur.tipsUsed')}
          </AppText>
          <View style={[styles.chips, isRTL && styles.rowRTL]}>
            {question.tipIds.map(tipId => {
              const tip = findKonkurTip(tipId, content);
              if (!tip) {
                return null;
              }
              const isCurrent = tipId === currentTipId;
              return (
                <Pressable
                  key={tipId}
                  accessibilityRole="button"
                  disabled={isCurrent}
                  onPress={() => navigation.push('KonkurTip', { tipId })}
                  style={({ pressed }) => [styles.chip, isCurrent && styles.chipCurrent, pressed && styles.pressed]}
                >
                  <AppText size="xs" weight="medium" color={isCurrent ? colors.onPrimary : colors.primaryText}>
                    {tip.title}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <AppButton label={t('konkur.tryAgain')} variant="ghost" size="sm" icon="refresh" onPress={() => setPicked(null)} />
        </View>
      )}
    </Card>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.md,
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
  header: {
    justifyContent: 'space-between',
  },
  flexOne: {
    flex: 1,
  },
  expression: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  // Booklet figures are black on white, so they always sit on white.
  figureBox: {
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
  },
  figure: {
    width: '100%',
    height: 180,
  },
  choices: {
    gap: spacing.sm,
  },
  choiceNo: {
    width: 20,
    textAlign: 'center',
  },
  result: {
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  solution: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
  },
  chipCurrent: {
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
}));
