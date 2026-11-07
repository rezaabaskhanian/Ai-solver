import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Image, Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppDialog } from '../../components/common/AppDialog';
import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { Icon } from '../../components/common/Icon';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { MathExpression } from '../../components/MathExpression/MathExpression';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { useKonkurContent, useTrackKonkurContent } from '../../store/useKonkurContentStore';
import { useKonkurProgressStore } from '../../store/useKonkurProgressStore';
import { buildExam } from '../../services/exam/buildExam';
import { chapterBankQuestions } from '../../services/exam/chapterBank';
import { buildKonkurExam } from '../../services/exam/konkurExam';
import { trackEvent } from '../../services/telemetry';
import { toPersianDigits } from '../../content/konkur';
import {
  defaultDurationSec,
  elapsedSeconds,
  formatClock,
  isWarning,
  localizeDigits,
  remainingSeconds,
} from '../../services/exam/scoring';
import { makeStyles, radius, spacing, useColors } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Exam'>;

export function ExamScreen({ route, navigation }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const { config } = route.params;

  const content = useKonkurContent();
  const trackContent = useTrackKonkurContent();

  const [questions] = useState(() =>
    config.konkur
      ? buildKonkurExam(content, config.konkur)
      : buildExam(config, Math.random, chapterBankQuestions(trackContent, config.chapterIds)),
  );
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [index, setIndex] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const durationSec = config.durationSec ?? defaultDurationSec(config.count);
  const [startedAt] = useState(() => Date.now());
  const deadline = startedAt + durationSec * 1000;
  const [remaining, setRemaining] = useState(durationSec);

  useEffect(() => {
    trackEvent('exam_started', { count: questions.length, konkur: !!config.konkur });
  }, []);

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const finishedRef = useRef(false);

  const finish = useCallback(
    (timedOut: boolean) => {
      if (finishedRef.current) {
        return;
      }
      finishedRef.current = true;
      const final = answersRef.current;
      trackEvent('exam_finished', {
        timedOut,
        total: final.length,
        answered: final.filter(c => c !== null).length,
      });
      final.forEach((choice, i) => {
        const q = questions[i];
        if (choice !== null && q.konkurId) {
          useKonkurProgressStore.getState().recordAttempt(q.konkurId, choice, choice === q.answerIndex);
        }
      });
      navigation.replace('ExamResult', {
        config,
        questions,
        answers: final,
        elapsedSec: elapsedSeconds(startedAt, Date.now(), durationSec),
        durationSec,
        timedOut,
      });
    },
    [config, durationSec, navigation, questions, startedAt],
  );

  useEffect(() => {
    if (questions.length === 0) {
      return undefined;
    }
    const tick = () => setRemaining(remainingSeconds(deadline, Date.now()));
    const interval = setInterval(tick, 500);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        tick();
      }
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [deadline, questions.length]);

  const [dialog, setDialog] = useState<'finish' | 'leave' | 'timeUp' | null>(null);
  const pendingLeaveRef = useRef<Parameters<typeof navigation.dispatch>[0] | null>(null);

  useEffect(() => {
    if (questions.length > 0 && remaining <= 0 && !finishedRef.current) {
      setDialog('timeUp');
    }
  }, [remaining, questions.length]);

  useEffect(() => {
    if (questions.length === 0) {
      return undefined;
    }
    return navigation.addListener('beforeRemove', e => {
      if (finishedRef.current) {
        return;
      }
      e.preventDefault();
      pendingLeaveRef.current = e.data.action;
      setDialog('leave');
    });
  }, [navigation, questions.length]);

  const leave = () => {
    const action = pendingLeaveRef.current;
    finishedRef.current = true;
    setDialog(null);
    if (action) {
      navigation.dispatch(action);
    }
  };

  if (questions.length === 0) {
    return (
      <ScreenContainer>
        <Card style={styles.card}>
          <AppText align="center">{t('exam.noQuestions')}</AppText>
          <AppButton label={t('exam.pickOther')} onPress={() => navigation.goBack()} />
        </Card>
      </ScreenContainer>
    );
  }

  const question = questions[index];
  const isLast = index === questions.length - 1;
  const answeredCount = answers.filter(a => a !== null).length;
  const progressPercent = Math.round(((index + 1) / questions.length) * 100);
  const warning = isWarning(remaining);

  const select = (choice: number) => {
    setAnswers(prev => prev.map((a, i) => (i === index ? choice : a)));
  };

  const unansweredCount = questions.length - answeredCount;

  const handleNextOrFinish = () => {
    if (isLast) {
      if (unansweredCount === 0) {
        finish(false);
      } else {
        setDialog('finish');
      }
    } else {
      setIndex(i => i + 1);
      setShowHint(false);
    }
  };

  const choiceNumbers = ['۱', '۲', '۳', '۴'];

  return (
    <ScreenContainer scroll>
      {/* Top Header */}
      <View style={[styles.topHeader, isRTL && styles.rowRTL]}>
        <View style={[styles.headerActions, isRTL && styles.rowRTL]}>
          <View style={styles.avatarButton}>
            <Icon name="person" size={20} color="#FFFFFF" />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="راهنما"
            style={styles.headerIconButton}
            onPress={() => navigation.navigate('Guide')}
          >
            <Icon name="lightbulb" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        <AppText weight="bold" size="md" color={colors.textPrimary}>
          Problem Solver Session
        </AppText>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="بازگشت"
          onPress={() => navigation.goBack()}
          style={styles.headerIconButton}
        >
          <Icon name="arrow-forward" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* Progress & Countdown Section */}
      <View style={styles.progressSection}>
        <View style={[styles.progressInfoRow, isRTL && styles.rowRTL]}>
          <AppText size="xs" weight="bold" color={colors.textPrimary}>
            پیشرفت مبحث: تست {toPersianDigits(index + 1)} از {toPersianDigits(questions.length)}
          </AppText>

          <View style={[styles.timerBadge, warning && styles.timerWarning, isRTL && styles.rowRTL]}>
            <Icon name="timer" size={16} color={warning ? colors.danger : colors.textPrimary} />
            <AppText weight="bold" size="xs" color={warning ? colors.danger : colors.textPrimary}>
              {localizeDigits(formatClock(remaining), isRTL)}
            </AppText>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      {/* Main Question Card */}
      <Card style={styles.questionCard}>
        {/* Card Header */}
        <View style={[styles.cardHeaderRow, isRTL && styles.rowRTL]}>
          <View style={[styles.tagsRow, isRTL && styles.rowRTL]}>
            <View style={styles.authorBadge}>
              <AppText size="xs" weight="medium" color="#15803D">
                {question.konkurId ? 'کنکور سراسری' : 'تست تالیفی'}
              </AppText>
            </View>
            <AppText size="xs" weight="bold" color={colors.textPrimary}>
              تست {toPersianDigits(index + 1)}
            </AppText>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="نشان کردن"
            hitSlop={8}
            onPress={() => setBookmarked(v => !v)}
          >
            <Icon
              name={bookmarked ? 'star' : 'star-border'}
              size={22}
              color={bookmarked ? '#F59E0B' : colors.textSecondary}
            />
          </Pressable>
        </View>

        {/* Question Text */}
        <AppText weight="bold" size="md" color={colors.textPrimary} style={styles.questionText}>
          {question.text ?? t(`exam.q.${question.textKey}`, question.params)}
        </AppText>

        {question.figure !== undefined && (
          <Image
            source={question.figure}
            style={styles.figure}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        )}

        {/* Centered Formula Display Box */}
        {question.expression && (
          <View style={styles.formulaBox}>
            <MathExpression expression={question.expression} size="lg" />
          </View>
        )}

        {/* Engine Solver Pill */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="حل گام‌به‌گام با موتور مجهول"
          onPress={() => {
            if (question.expression) {
              navigation.navigate('ProblemInput', { initialProblem: question.expression });
            }
          }}
          style={styles.enginePill}
        >
          <AppText size="xs" weight="bold" color="#4F46E5">
            Σ حل گام‌به‌گام با موتور مجهول ✦
          </AppText>
        </Pressable>

        {/* Hint Pill */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="راهنمایی"
          onPress={() => setShowHint(v => !v)}
          style={styles.hintPill}
        >
          <Icon name="lightbulb" size={16} color="#15803D" />
          <AppText size="xs" weight="medium" color="#15803D">
            {showHint ? 'نکته: روابط دلتا و فرمول ویت را بررسی کن' : 'گیر کردی؟ راهنمایی بگیر (۱ راهنمایی باقی‌مانده)'}
          </AppText>
        </Pressable>

        {/* 4 Choices */}
        <View style={styles.choicesList}>
          {question.choices.map((choice, i) => {
            const isSelected = answers[index] === i;
            return (
              <Pressable
                key={`${question.id}-${i}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => select(i)}
                style={[
                  styles.choiceItem,
                  isSelected && styles.choiceItemSelected,
                  isRTL && styles.rowRTL,
                ]}
              >
                <View style={styles.flexOne}>
                  {question.choicesMath !== false ? (
                    <MathExpression expression={choice} size="md" />
                  ) : (
                    <AppText size="sm" weight={isSelected ? 'bold' : 'regular'} color={colors.textPrimary}>
                      {choice}
                    </AppText>
                  )}
                </View>

                <View style={[styles.choiceNumberCircle, isSelected && styles.choiceNumberCircleSelected]}>
                  <AppText
                    size="xs"
                    weight="bold"
                    color={isSelected ? '#0F1F05' : colors.textSecondary}
                  >
                    {choiceNumbers[i] ?? toPersianDigits(i + 1)}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Step by step helper link */}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (question.expression) {
              navigation.navigate('ProblemInput', { initialProblem: question.expression });
            }
          }}
          style={[styles.stepLink, isRTL && styles.rowRTL]}
        >
          <Icon name="help-outline" size={16} color={colors.textSecondary} />
          <AppText size="xs" color={colors.textSecondary}>
            بلد نیستم؛ راه‌حل رو قدم‌به‌قدم نشونم بده
          </AppText>
        </Pressable>

        {/* Main CTA Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'ثبت پاسخ و مشاهده نتایج' : 'ثبت پاسخ و تست بعدی'}
          onPress={handleNextOrFinish}
          style={styles.primaryCtaButton}
        >
          <AppText size="sm" weight="bold" color="#0F1F05">
            {isLast ? 'ثبت پاسخ و مشاهده نتایج ←' : 'ثبت پاسخ و تست بعدی ←'}
          </AppText>
        </Pressable>

        {/* Footer info links */}
        <View style={[styles.footerLinksRow, isRTL && styles.rowRTL]}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Scan')}
            style={[styles.footerLink, isRTL && styles.rowRTL]}
          >
            <Icon name="calculate" size={16} color={colors.textSecondary} />
            <AppText size="xs" color={colors.textSecondary}>
              ماشین‌حساب کنکور
            </AppText>
          </Pressable>

          <AppText size="xs" color={colors.textSecondary}>•</AppText>

          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Guide')}
            style={[styles.footerLink, isRTL && styles.rowRTL]}
          >
            <Icon name="flag" size={16} color={colors.textSecondary} />
            <AppText size="xs" color={colors.textSecondary}>
              گزارش اشکال سؤال
            </AppText>
          </Pressable>
        </View>
      </Card>

      {/* Dialogs */}
      <AppDialog
        visible={dialog === 'finish'}
        icon="flag"
        title={t('exam.confirmTitle')}
        message={t('exam.confirmUnanswered', { count: localizeDigits(unansweredCount, isRTL) })}
        onDismiss={() => setDialog(null)}
        actions={[
          { label: t('exam.finish'), icon: 'flag', onPress: () => { setDialog(null); finish(false); } },
          { label: t('exam.keepGoing'), variant: 'secondary', onPress: () => setDialog(null) },
        ]}
      >
        <View style={[styles.dialogStats, isRTL && styles.rowRTL]}>
          <View style={[styles.dialogStat, { backgroundColor: colors.successMuted }]}>
            <AppText weight="bold" size="xl" color={colors.success} align="center">
              {localizeDigits(answeredCount, isRTL)}
            </AppText>
            <AppText size="xs" color={colors.textSecondary} align="center">
              {t('exam.answeredShort')}
            </AppText>
          </View>
          <View style={[styles.dialogStat, { backgroundColor: colors.warningMuted }]}>
            <AppText weight="bold" size="xl" color={colors.warning} align="center">
              {localizeDigits(unansweredCount, isRTL)}
            </AppText>
            <AppText size="xs" color={colors.textSecondary} align="center">
              {t('exam.blankCount')}
            </AppText>
          </View>
        </View>
      </AppDialog>

      <AppDialog
        visible={dialog === 'leave'}
        icon="logout"
        tone="danger"
        title={t('exam.leaveTitle')}
        message={t('exam.leaveBody')}
        onDismiss={() => setDialog(null)}
        actions={[
          { label: t('exam.keepGoing'), icon: 'edit', onPress: () => setDialog(null) },
          { label: t('exam.leave'), variant: 'danger', onPress: leave },
        ]}
      />

      <AppDialog
        visible={dialog === 'timeUp'}
        icon="timer-off"
        tone="warning"
        title={t('exam.timeUp')}
        message={t('exam.timedOutNote')}
        onDismiss={() => finish(true)}
        actions={[{ label: t('exam.seeResult'), icon: 'insights', onPress: () => finish(true) }]}
      />
    </ScreenContainer>
  );
}

const useStyles = makeStyles(colors =>
  StyleSheet.create({
    rowRTL: {
      flexDirection: 'row-reverse',
    },
    flexOne: {
      flex: 1,
    },
    topHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      marginBottom: spacing.xs,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    avatarButton: {
      width: 36,
      height: 36,
      borderRadius: radius.pill,
      backgroundColor: '#22C55E',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerIconButton: {
      width: 36,
      height: 36,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    progressSection: {
      marginVertical: spacing.sm,
      gap: spacing.xs,
    },
    progressInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    timerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#F1F5F9',
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    timerWarning: {
      backgroundColor: '#FEE2E2',
    },
    progressTrack: {
      height: 6,
      borderRadius: radius.pill,
      backgroundColor: '#F1F5F9',
      overflow: 'hidden',
      marginTop: 4,
    },
    progressFill: {
      height: 6,
      borderRadius: radius.pill,
      backgroundColor: '#76E000',
    },
    questionCard: {
      padding: spacing.md,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: '#EEF0F4',
      backgroundColor: '#FFFFFF',
      gap: spacing.md,
      marginVertical: spacing.xs,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    tagsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    authorBadge: {
      backgroundColor: '#DCFCE7',
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    questionText: {
      lineHeight: 24,
    },
    figure: {
      width: '100%',
      height: 160,
    },
    formulaBox: {
      backgroundColor: '#F0F4FF',
      borderRadius: radius.lg,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#E0E7FF',
    },
    enginePill: {
      backgroundColor: '#EEF2FF',
      borderRadius: radius.pill,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#C7D2FE',
    },
    hintPill: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: '#F0FDF4',
      borderRadius: radius.pill,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: '#BBF7D0',
    },
    choicesList: {
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    choiceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#F8FAFC',
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    choiceItemSelected: {
      backgroundColor: '#F7FEE7',
      borderColor: '#76E000',
      borderWidth: 2,
    },
    choiceNumberCircle: {
      width: 28,
      height: 28,
      borderRadius: radius.pill,
      backgroundColor: '#E2E8F0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    choiceNumberCircleSelected: {
      backgroundColor: '#76E000',
    },
    stepLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xs,
    },
    primaryCtaButton: {
      backgroundColor: '#76E000',
      borderRadius: radius.pill,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.xs,
    },
    footerLinksRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingTop: spacing.xs,
    },
    footerLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    dialogStats: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    dialogStat: {
      flex: 1,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
    },
    card: {
      gap: spacing.md,
    },
  }),
);
