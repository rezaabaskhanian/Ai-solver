import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { AppText } from '../../components/common/AppText';
import { CelebrationOverlay } from '../../components/common/Celebration';
import { Icon } from '../../components/common/Icon';
import { MathExpression } from '../../components/MathExpression/MathExpression';
import { engineExpressionFor } from '../../content/konkur/engineExpression';
import { findKonkurTip } from '../../content/konkur/index';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { scoreExam } from '../../services/exam/buildExam';
import { paperKeyOf } from '../../services/exam/konkurExam';
import { averageSecondsPerQuestion, localizeDigits } from '../../services/exam/scoring';
import { useKonkurContentStore } from '../../store/useKonkurContentStore';
import { useKonkurProgressStore } from '../../store/useKonkurProgressStore';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { ExamRankCard } from './ExamRankCard';

type Props = NativeStackScreenProps<RootStackParamList, 'ExamResult'>;

export function ExamResultScreen({ route, navigation }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const { config, questions, answers, elapsedSec, durationSec, timedOut } = route.params;

  const score = useMemo(() => scoreExam(questions, answers), [questions, answers]);
  const [celebrate, setCelebrate] = useState(() => score.percent >= 70);

  // 'overview' = Report Card, 'detail' = Deep Question Analysis
  const [mode, setMode] = useState<'overview' | 'detail'>('overview');
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);

  const bookmarkedQuestions = useKonkurProgressStore(s => s.bookmarkedQuestions);
  const toggleQuestionBookmark = useKonkurProgressStore(s => s.toggleQuestionBookmark);
  const konkurContent = useKonkurContentStore(s => s.content);

  const num = (value: number | string) => localizeDigits(value, isRTL);
  const average = averageSecondsPerQuestion(elapsedSec, score.total);

  const masteryLevel = useMemo(() => {
    if (score.percent >= 80) return 'سطح تسلط: پیشرفته و عالی ★';
    if (score.percent >= 50) return 'سطح تسلط: متوسط به بالا ★';
    return 'سطح تسلط: نیازمند تمرین و تکرار ✦';
  }, [score.percent]);

  const activeQuestion = questions[selectedQuestionIndex] ?? questions[0];
  const activeChosen = answers[selectedQuestionIndex];
  const isActiveCorrect = activeChosen === activeQuestion?.answerIndex;
  const isActiveBlank = activeChosen === null;

  const activeKonkurQ = useMemo(() => {
    if (!activeQuestion) return undefined;
    return konkurContent.questions.find(
      kq => kq.id === activeQuestion.konkurId || kq.id === activeQuestion.id,
    );
  }, [activeQuestion, konkurContent.questions]);

  const activeTip = useMemo(() => {
    if (!activeKonkurQ && !activeQuestion?.topicId) return undefined;
    const tipId = activeKonkurQ?.tipIds?.[0] || activeQuestion?.topicId;
    return tipId ? findKonkurTip(tipId, konkurContent) : undefined;
  }, [activeKonkurQ, activeQuestion, konkurContent]);

  const isCurrentBookmarked = activeQuestion
    ? bookmarkedQuestions.includes(activeQuestion.konkurId || activeQuestion.id)
    : false;

  const handleOpenDetail = (index: number) => {
    setSelectedQuestionIndex(index);
    setMode('detail');
  };

  const handlePracticeWeakSpots = () => {
    navigation.replace('Exam', {
      config: {
        ...config,
        count: Math.min(5, Math.max(3, questions.length)),
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.header, isRTL && styles.rowRTL]}>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => {
            if (mode === 'detail') {
              setMode('overview');
            } else {
              navigation.goBack();
            }
          }}
          style={styles.iconCircle}
        >
          <Icon name={mode === 'detail' ? (isRTL ? 'arrow-forward' : 'arrow-back') : 'close'} size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <AppText weight="bold" size="md" align="center" style={styles.flexOne}>
          {mode === 'overview' ? 'کارنامه و تحلیل هوشمند آزمون' : `تست ${num(selectedQuestionIndex + 1)} از ${num(questions.length)}`}
        </AppText>

        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => navigation.replace('Exam', { config })}
          style={styles.iconCircle}
        >
          <Icon name="refresh" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {mode === 'overview' ? (
          /* ============================================================== */
          /* OVERVIEW MODE: Report Card & AI Analytics                      */
          /* ============================================================== */
          <View style={styles.overviewContainer}>
            {/* Circular Gauge Card */}
            <View style={styles.gaugeCard}>
              <View style={styles.circleProgressWrapper}>
                <View style={[styles.circleProgressOuter, { borderColor: score.percent >= 50 ? colors.success : colors.danger }]}>
                  <AppText size="xxl" weight="bold" color={score.percent >= 50 ? colors.success : colors.danger}>
                    {num(score.percent)}٪
                  </AppText>
                  <AppText size="xs" color={colors.textSecondary} weight="medium">
                    {num(score.correct)} از {num(score.total)} درست
                  </AppText>
                </View>
              </View>

              {/* Mastery Level Badge */}
              <View style={styles.masteryBadge}>
                <AppText size="xs" weight="bold" color="#854D0E">
                  {masteryLevel}
                </AppText>
              </View>

              {timedOut && (
                <AppText size="xs" color={colors.danger} align="center">
                  {t('exam.timedOutNote')}
                </AppText>
              )}

              {/* 3 Stat Boxes */}
              <View style={[styles.statRow, isRTL && styles.rowRTL]}>
                <View style={[styles.statBox, styles.statCorrect]}>
                  <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
                    <Icon name="check-circle" size={16} color="#166534" />
                    <AppText weight="bold" size="sm" color="#166534">
                      {num(score.correct)} درست
                    </AppText>
                  </View>
                </View>

                <View style={[styles.statBox, styles.statWrong]}>
                  <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
                    <Icon name="cancel" size={16} color="#991B1B" />
                    <AppText weight="bold" size="sm" color="#991B1B">
                      {num(score.wrong)} غلط
                    </AppText>
                  </View>
                </View>

                <View style={[styles.statBox, styles.statBlank]}>
                  <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
                    <Icon name="remove-circle-outline" size={16} color="#4B5563" />
                    <AppText weight="bold" size="sm" color="#4B5563">
                      {num(score.blank)} نزده
                    </AppText>
                  </View>
                </View>
              </View>

              {/* Speed / Pace Metric */}
              <View style={[styles.speedBox, isRTL && styles.rowRTL]}>
                <Icon name="bolt" size={18} color="#2563EB" />
                <AppText size="xs" weight="medium" color="#1E40AF">
                  {`${num(average)} ثانیه برای هر تست • سریع‌تر از ۶۵٪ داوطلبان ⚡`}
                </AppText>
              </View>
            </View>

            {/* Konkur Percentile Card */}
            {config.konkur && (
              <ExamRankCard
                paperKey={paperKeyOf(config.konkur)}
                percent={score.percent}
                correct={score.correct}
                wrong={score.wrong}
                blank={score.blank}
                seconds={elapsedSec}
              />
            )}

            {/* Interactive Question Matrix */}
            <View style={styles.card}>
              <View style={[styles.cardHeaderRow, isRTL && styles.rowRTL]}>
                <Icon name="grid-view" size={18} color={colors.textPrimary} />
                <AppText weight="bold" size="md">
                  ماتریس بررسی تک‌تک سوالات
                </AppText>
              </View>
              <AppText size="xs" color={colors.textSecondary} style={styles.cardSubText}>
                برای مشاهده پاسخ تشریحی و تحلیل هوشمند روی هر تست بزنید:
              </AppText>

              <View style={[styles.matrixWrap, isRTL && styles.rowRTL]}>
                {questions.map((q, idx) => {
                  const ans = answers[idx];
                  const isCorrect = ans === q.answerIndex;
                  const isBlank = ans === null;

                  return (
                    <Pressable
                      key={q.id || idx}
                      accessibilityRole="button"
                      onPress={() => handleOpenDetail(idx)}
                      style={[
                        styles.matrixPill,
                        isCorrect && styles.matrixPillCorrect,
                        !isCorrect && !isBlank && styles.matrixPillWrong,
                        isBlank && styles.matrixPillBlank,
                      ]}
                    >
                      <AppText
                        size="sm"
                        weight="bold"
                        color={isCorrect ? '#166534' : !isBlank ? '#991B1B' : '#4B5563'}
                      >
                        {num(idx + 1)}
                      </AppText>
                      <Icon
                        name={isCorrect ? 'check-circle' : !isBlank ? 'cancel' : 'remove-circle-outline'}
                        size={15}
                        color={isCorrect ? '#166534' : !isBlank ? '#991B1B' : '#6B7280'}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* AI Topic Breakdown */}
            <View style={styles.card}>
              <View style={[styles.cardHeaderRow, isRTL && styles.rowRTL]}>
                <Icon name="psychology" size={20} color="#6366F1" />
                <AppText weight="bold" size="md">
                  تحلیل هوشمند مباحث (مجهول AI)
                </AppText>
              </View>

              {score.byTopic.length > 0 ? (
                score.byTopic.map(topic => {
                  const barColor =
                    topic.correctPercent >= 70
                      ? colors.success
                      : topic.correctPercent >= 40
                      ? colors.warning
                      : colors.danger;

                  return (
                    <View key={topic.key} style={styles.topicRow}>
                      <View style={[styles.spaceRow, isRTL && styles.rowRTL]}>
                        <AppText size="sm" weight="medium">
                          {topic.label}
                        </AppText>
                        <AppText size="xs" weight="bold" color={barColor}>
                          {num(topic.correctPercent)}٪ ({num(topic.correct)} از {num(topic.total)})
                        </AppText>
                      </View>
                      <View style={styles.track}>
                        <View
                          style={[
                            styles.fill,
                            isRTL && styles.fillRTL,
                            { width: `${topic.correctPercent}%`, backgroundColor: barColor },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.topicRow}>
                  <View style={[styles.spaceRow, isRTL && styles.rowRTL]}>
                    <AppText size="sm" weight="medium">
                      معادلات و محاسبات جبری
                    </AppText>
                    <AppText size="xs" weight="bold" color={colors.success}>
                      {num(score.percent)}٪
                    </AppText>
                  </View>
                  <View style={styles.track}>
                    <View
                      style={[
                        styles.fill,
                        isRTL && styles.fillRTL,
                        { width: `${score.percent}%`, backgroundColor: colors.success },
                      ]}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* AI Recommendation Card */}
            <View style={styles.aiRecommendCard}>
              <View style={[styles.cardHeaderRow, isRTL && styles.rowRTL]}>
                <Icon name="auto-awesome" size={20} color="#0D9488" />
                <AppText weight="bold" size="sm" color="#0F766E">
                  پیشنهاد اختصاصی موتور مجهول:
                </AppText>
              </View>
              <AppText size="xs" color="#115E59" style={styles.recommendText}>
                {score.percent < 70
                  ? 'تمرکز روی تکنیک‌های میانبر جمع ضرایب و روابط ریشه‌ها، درصد ریاضی شما را تا بیش از ۲۰٪ در آزمون بعدی ارتقا می‌دهد.'
                  : 'تسلط کلی شما بسیار خوب است! برای رسیدن به ۱۰۰٪ روی سوالات چالشی‌تر و کاهش زمان حل تست‌ها تمرکز کنید.'}
              </AppText>
            </View>

            {/* XP and Streak Card */}
            <View style={[styles.streakCard, isRTL && styles.rowRTL]}>
              <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
                <Icon name="star" size={20} color="#EAB308" />
                <AppText size="xs" weight="bold" color="#854D0E">
                  +۳۵ امتیاز XP ثبت شد
                </AppText>
              </View>
              <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
                <Icon name="bolt" size={20} color="#F97316" />
                <AppText size="xs" weight="bold" color="#C2410C">
                  ۳ روز متوالی مطالعه 🔥
                </AppText>
              </View>
            </View>

            {/* Overview Bottom Action Buttons */}
            <View style={styles.actionColumn}>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={handlePracticeWeakSpots}
                style={styles.limePrimaryButton}
              >
                <AppText weight="bold" size="md" color="#0F1F05">
                  تمرین نقاط ضعف ←
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => {
                  const firstWrong = answers.findIndex((ans, i) => ans !== questions[i]?.answerIndex);
                  handleOpenDetail(firstWrong !== -1 ? firstWrong : 0);
                }}
                style={styles.secondaryButton}
              >
                <Icon name="menu-book" size={18} color={colors.textPrimary} />
                <AppText weight="bold" size="sm" color={colors.textPrimary}>
                  📖 پاسخ تشریحی و تحلیل عمیق
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ============================================================== */
          /* DETAIL MODE: Deep Question Analysis & Solutions                 */
          /* ============================================================== */
          <View style={styles.detailContainer}>
            {/* Subheader and Question status */}
            <View style={[styles.detailSubheader, isRTL && styles.rowRTL]}>
              <AppText size="xs" weight="bold" color={colors.textSecondary}>
                تست {num(selectedQuestionIndex + 1)} از {num(questions.length)} • {activeQuestion?.topicLabel || 'معادلات درجه دوم'}
              </AppText>
              <View
                style={[
                  styles.statusBadge,
                  isActiveCorrect && styles.statusBadgeCorrect,
                  !isActiveCorrect && !isActiveBlank && styles.statusBadgeWrong,
                  isActiveBlank && styles.statusBadgeBlank,
                ]}
              >
                <AppText
                  size="xs"
                  weight="bold"
                  color={isActiveCorrect ? '#166534' : !isActiveBlank ? '#991B1B' : '#4B5563'}
                >
                  {isActiveCorrect
                    ? '✓ پاسخ شما درست بود'
                    : !isActiveBlank
                    ? '✕ پاسخ شما نادرست بود'
                    : '- پاسخی ثبت نشد'}
                </AppText>
              </View>
            </View>

            {/* Question Card */}
            <View style={styles.card}>
              <AppText size="sm" weight="medium" style={styles.questionText}>
                {activeQuestion?.text || t(`exam.q.${activeQuestion?.textKey}`, activeQuestion?.params)}
              </AppText>

              {activeQuestion?.expression && (
                <View style={styles.expressionBox}>
                  <MathExpression expression={activeQuestion.expression} size="md" />
                </View>
              )}

              {/* Choices with red (wrong chosen) and green (correct) badges */}
              <View style={styles.choicesWrap}>
                {activeQuestion?.choices.map((choice, cIdx) => {
                  const isUserPick = activeChosen === cIdx;
                  const isAnswer = cIdx === activeQuestion.answerIndex;

                  let choiceStyle = styles.choiceBoxNeutral;
                  let badgeText: string | null = null;
                  let badgeColor = colors.textSecondary;

                  if (isAnswer) {
                    choiceStyle = styles.choiceBoxCorrect;
                    badgeText = `گزینه ${num(cIdx + 1)} (پاسخ صحیح تستی) ✓`;
                    badgeColor = '#166534';
                  } else if (isUserPick) {
                    choiceStyle = styles.choiceBoxWrong;
                    badgeText = `گزینه ${num(cIdx + 1)} (انتخاب اشتباه شما) ✕`;
                    badgeColor = '#991B1B';
                  }

                  return (
                    <View key={cIdx} style={[styles.choiceBox, choiceStyle]}>
                      {badgeText && (
                        <View style={[styles.choiceBadgeRow, isRTL && styles.rowRTL]}>
                          <AppText size="xs" weight="bold" color={badgeColor}>
                            {badgeText}
                          </AppText>
                        </View>
                      )}
                      <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
                        <AppText size="xs" color={colors.textSecondary} weight="bold">
                          {num(cIdx + 1)}){' '}
                        </AppText>
                        {activeQuestion.choicesMath === false ? (
                          <AppText size="sm">{choice}</AppText>
                        ) : (
                          <MathExpression expression={choice} size="sm" />
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* AI Diagnostic Card */}
            <View style={styles.aiDiagnosticCard}>
              <View style={[styles.cardHeaderRow, isRTL && styles.rowRTL]}>
                <Icon name="auto-awesome" size={20} color="#7C3AED" />
                <AppText weight="bold" size="sm" color="#6D28D9">
                  تحلیل هوشمند موتور مجهول ✦
                </AppText>
              </View>

              <View style={styles.trapPill}>
                <AppText size="xs" weight="bold" color="#7C3AED">
                  تشخیص خودکار تله‌های شناختی
                </AppText>
              </View>

              <AppText size="xs" color="#4C1D95" style={styles.trapDescription}>
                {activeKonkurQ?.guide?.trap
                  ? activeKonkurQ.guide.trap
                      .map(l => (typeof l === 'string' ? l : l.math))
                      .join(' ')
                  : 'تله شناختی علامت منفی در محاسبه ریشه. داوطلب به دلیل شتاب‌زدگی علامت ضریب را معکوس اعمال می‌کند. در این الگو توجه به علامت ضرایب از اشتباهات پرتکرار جلوگیری می‌کند.'}
              </AppText>

              {/* Golden Test Trick Box */}
              <View style={styles.goldenTrickBox}>
                <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
                  <Icon name="lightbulb" size={18} color="#D97706" />
                  <AppText size="xs" weight="bold" color="#B45309">
                    نکته طلایی تستی:
                  </AppText>
                </View>
                <AppText size="xs" color="#92400E" style={styles.goldenTrickText}>
                  {activeTip
                    ? activeTip.title
                    : 'هرگاه در معادله درجه دوم ax² + bx + c = 0 مجموع ضرایب صفر باشد (a+b+c=0)، یکی از ریشه‌ها ۱ و دیگری c/a است؛ و اگر a+c=b باشد، ریشه‌ها ۱- و c/a- هستند.'}
                </AppText>
              </View>
            </View>

            {/* Step-by-Step Solutions (2 Methods) */}
            <View style={styles.card}>
              <View style={[styles.cardHeaderRow, isRTL && styles.rowRTL]}>
                <Icon name="menu-book" size={20} color={colors.textPrimary} />
                <AppText weight="bold" size="md">
                  📖 راه‌حل گام‌به‌گام و تشریحی (۲ روش حل)
                </AppText>
              </View>

              {/* Method 1: Shortcut */}
              <View style={styles.methodCard}>
                <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
                  <View style={styles.methodBadge}>
                    <AppText size="xs" weight="bold" color="#15803D">
                      روش اول: میانبر ۱۰ ثانیه‌ای مجهول
                    </AppText>
                  </View>
                </View>
                <AppText size="xs" color={colors.textPrimary} style={styles.methodText}>
                  با بررسی ضرایب معادله متوجه می‌شویم که شرط جمع ضرایب برقرار است. بنابراین بدون نیاز به تشکیل دلتا ریشه‌ها مستقیماً به دست می‌آیند:
                </AppText>
                <View style={styles.solutionMathBox}>
                  <MathExpression expression="a + c = b \implies x_1 = -1,\quad x_2 = -\frac{c}{a}" size="sm" />
                </View>
              </View>

              {/* Method 2: Standard Discriminant Solution */}
              <View style={styles.methodCard}>
                <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
                  <View style={[styles.methodBadge, styles.methodBadgeSecondary]}>
                    <AppText size="xs" weight="bold" color="#1E40AF">
                      روش دوم: روش رسمی با فرمول مبین (Δ)
                    </AppText>
                  </View>
                </View>
                <AppText size="xs" color={colors.textPrimary} style={styles.methodText}>
                  محاسبه به روش استاندارد کتاب درسی با استفاده از فرمول کلی دلتا:
                </AppText>
                <View style={styles.solutionMathBox}>
                  <MathExpression expression="\Delta = b^2 - 4ac \implies x = \frac{-b \pm \sqrt{\Delta}}{2a}" size="sm" />
                </View>
              </View>
            </View>

            {/* Deep Learning Tools */}
            <View style={styles.card}>
              <AppText weight="bold" size="sm" style={styles.learningToolsTitle}>
                ابزارهای یادگیری عمیق این تست:
              </AppText>

              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => Alert.alert('ویدئوی تحلیل ۶۰ ثانیه‌ای', 'ویدئوی اختصاصی تحلیل این تست به زودی فعال می‌شود.')}
                style={[styles.toolRow, isRTL && styles.rowRTL]}
              >
                <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
                  <Icon name="play-circle" size={20} color="#2563EB" />
                  <AppText size="xs" weight="bold" color="#1E40AF">
                    ویدئوی تحلیل ۶۰ ثانیه‌ای این تست
                  </AppText>
                </View>
                <Icon name={isRTL ? 'chevron-left' : 'chevron-right'} size={18} color="#93C5FD" />
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => {
                  toggleQuestionBookmark(activeQuestion.konkurId || activeQuestion.id);
                }}
                style={[styles.toolRow, isRTL && styles.rowRTL]}
              >
                <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
                  <Icon
                    name={isCurrentBookmarked ? 'bookmark' : 'bookmark-border'}
                    size={20}
                    color="#D97706"
                  />
                  <AppText size="xs" weight="bold" color="#B45309">
                    {isCurrentBookmarked ? 'در دفترچه غلط‌های مجهول ذخیره شد ★' : 'افزودن به دفترچه غلط‌های مجهول'}
                  </AppText>
                </View>
                <Icon name={isRTL ? 'chevron-left' : 'chevron-right'} size={18} color="#FDE68A" />
              </TouchableOpacity>

              {engineExpressionFor(activeQuestion) && (
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() =>
                    navigation.navigate('ProblemInput', {
                      initialProblem: engineExpressionFor(activeQuestion) ?? undefined,
                    })
                  }
                  style={[styles.toolRow, isRTL && styles.rowRTL]}
                >
                  <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
                    <Icon name="functions" size={20} color="#0D9488" />
                    <AppText size="xs" weight="bold" color="#0F766E">
                      حل گام‌به‌گام در موتور هوشمند مجهول
                    </AppText>
                  </View>
                  <Icon name={isRTL ? 'chevron-left' : 'chevron-right'} size={18} color="#99F6E4" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Bar in Detail Mode */}
      {mode === 'detail' && (
        <View style={[styles.bottomBar, isRTL && styles.rowRTL]}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setMode('overview')}
            style={styles.gridNavButton}
          >
            <Icon name="grid-view" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          {selectedQuestionIndex > 0 && (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setSelectedQuestionIndex(s => s - 1)}
              style={styles.navSubButton}
            >
              <AppText size="xs" weight="bold">
                تست قبلی
              </AppText>
            </TouchableOpacity>
          )}

          {selectedQuestionIndex < questions.length - 1 ? (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setSelectedQuestionIndex(s => s + 1)}
              style={styles.navNextLimeButton}
            >
              <AppText size="xs" weight="bold" color="#0F1F05">
                تست بعدی ({num(selectedQuestionIndex + 2)} از {num(questions.length)}) ←
              </AppText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setMode('overview')}
              style={styles.navNextLimeButton}
            >
              <AppText size="xs" weight="bold" color="#0F1F05">
                مشاهده کارنامه نهایی ←
              </AppText>
            </TouchableOpacity>
          )}
        </View>
      )}

      <CelebrationOverlay kind="courseDone" visible={celebrate} onDone={() => setCelebrate(false)} />
    </View>
  );
}

const useStyles = makeStyles(colors =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FAFAFB',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
    },
    rowRTL: {
      flexDirection: 'row-reverse',
    },
    flexOne: {
      flex: 1,
    },
    iconCircle: {
      width: 38,
      height: 38,
      borderRadius: radius.pill,
      backgroundColor: '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: {
      padding: spacing.md,
      paddingBottom: 90,
      gap: spacing.md,
    },
    overviewContainer: {
      gap: spacing.md,
    },
    gaugeCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 24,
      padding: spacing.lg,
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: '#F3F4F6',
    },
    circleProgressWrapper: {
      marginVertical: spacing.xs,
    },
    circleProgressOuter: {
      width: 130,
      height: 130,
      borderRadius: 65,
      borderWidth: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
    },
    masteryBadge: {
      backgroundColor: '#FEF9C3',
      borderColor: '#FDE047',
      borderWidth: 1,
      borderRadius: radius.pill,
      paddingVertical: 5,
      paddingHorizontal: 16,
    },
    statRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      width: '100%',
      marginTop: spacing.xs,
    },
    statBox: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    statCorrect: {
      backgroundColor: '#F0FDF4',
      borderColor: '#BBF7D0',
    },
    statWrong: {
      backgroundColor: '#FEF2F2',
      borderColor: '#FECACA',
    },
    statBlank: {
      backgroundColor: '#F3F4F6',
      borderColor: '#E5E7EB',
    },
    inlineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    spaceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    speedBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#EFF6FF',
      borderColor: '#DBEAFE',
      borderWidth: 1,
      borderRadius: 14,
      paddingVertical: 8,
      paddingHorizontal: 12,
      width: '100%',
      justifyContent: 'center',
    },
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      padding: spacing.md,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: '#F3F4F6',
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cardSubText: {
      marginTop: -2,
    },
    matrixWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    matrixPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: 1.5,
    },
    matrixPillCorrect: {
      backgroundColor: '#F0FDF4',
      borderColor: '#22C55E',
    },
    matrixPillWrong: {
      backgroundColor: '#FEF2F2',
      borderColor: '#EF4444',
    },
    matrixPillBlank: {
      backgroundColor: '#F9FAFB',
      borderColor: '#D1D5DB',
    },
    topicRow: {
      gap: 6,
      marginVertical: 4,
    },
    track: {
      height: 8,
      borderRadius: radius.pill,
      backgroundColor: '#F3F4F6',
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: radius.pill,
    },
    fillRTL: {
      alignSelf: 'flex-end',
    },
    aiRecommendCard: {
      backgroundColor: '#F0FDFA',
      borderRadius: 20,
      padding: spacing.md,
      gap: spacing.xs,
      borderWidth: 1,
      borderColor: '#CCFBF1',
    },
    recommendText: {
      lineHeight: 18,
    },
    streakCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#FEFCE8',
      borderRadius: 18,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: '#FEF08A',
    },
    actionColumn: {
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    limePrimaryButton: {
      backgroundColor: '#76E000',
      borderRadius: 24,
      paddingVertical: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButton: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 24,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    detailContainer: {
      gap: spacing.md,
    },
    detailSubheader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    statusBadge: {
      paddingVertical: 4,
      paddingHorizontal: 12,
      borderRadius: radius.pill,
    },
    statusBadgeCorrect: {
      backgroundColor: '#DCFCE7',
    },
    statusBadgeWrong: {
      backgroundColor: '#FEE2E2',
    },
    statusBadgeBlank: {
      backgroundColor: '#F3F4F6',
    },
    questionText: {
      lineHeight: 22,
    },
    expressionBox: {
      alignItems: 'center',
      paddingVertical: spacing.sm,
      backgroundColor: '#F9FAFB',
      borderRadius: 12,
    },
    choicesWrap: {
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    choiceBox: {
      borderRadius: 14,
      padding: 12,
      borderWidth: 1.5,
      gap: 6,
    },
    choiceBoxNeutral: {
      backgroundColor: '#FFFFFF',
      borderColor: '#E5E7EB',
    },
    choiceBoxCorrect: {
      backgroundColor: '#F0FDF4',
      borderColor: '#22C55E',
    },
    choiceBoxWrong: {
      backgroundColor: '#FEF2F2',
      borderColor: '#EF4444',
    },
    choiceBadgeRow: {
      flexDirection: 'row',
    },
    aiDiagnosticCard: {
      backgroundColor: '#F5F3FF',
      borderRadius: 20,
      padding: spacing.md,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: '#DDD6FE',
    },
    trapPill: {
      backgroundColor: '#EDE9FE',
      alignSelf: 'flex-start',
      borderRadius: radius.pill,
      paddingVertical: 3,
      paddingHorizontal: 10,
    },
    trapDescription: {
      lineHeight: 18,
    },
    goldenTrickBox: {
      backgroundColor: '#FFFBEB',
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: '#FDE68A',
      gap: 4,
    },
    goldenTrickText: {
      lineHeight: 18,
    },
    methodCard: {
      backgroundColor: '#F9FAFB',
      borderRadius: 14,
      padding: 12,
      gap: 8,
      borderWidth: 1,
      borderColor: '#F3F4F6',
    },
    methodBadge: {
      backgroundColor: '#DCFCE7',
      borderRadius: radius.pill,
      paddingVertical: 3,
      paddingHorizontal: 10,
    },
    methodBadgeSecondary: {
      backgroundColor: '#DBEAFE',
    },
    methodText: {
      lineHeight: 18,
    },
    solutionMathBox: {
      alignItems: 'center',
      paddingVertical: 6,
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
    },
    learningToolsTitle: {
      marginBottom: 2,
    },
    toolRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#F9FAFB',
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: '#F3F4F6',
    },
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#F3F4F6',
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    gridNavButton: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    navSubButton: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 16,
      backgroundColor: '#F3F4F6',
    },
    navNextLimeButton: {
      flex: 1,
      backgroundColor: '#76E000',
      borderRadius: 16,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
  }),
);
