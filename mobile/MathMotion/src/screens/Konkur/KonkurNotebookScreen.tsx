import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppText } from '../../components/common/AppText';
import { Icon } from '../../components/common/Icon';
import { MathExpression } from '../../components/MathExpression/MathExpression';
import { sourceLabel } from '../../content/konkur';
import { findKonkurTip } from '../../content/konkur/index';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { localizeDigits } from '../../services/exam/scoring';
import { useKonkurContentStore } from '../../store/useKonkurContentStore';
import { useKonkurProgressStore } from '../../store/useKonkurProgressStore';
import { useKonkurStudyStore } from '../../store/useKonkurStudyStore';
import { makeStyles, radius, spacing, useColors } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'KonkurNotebook'>;

export function KonkurNotebookScreen({ route }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [sessionActive, setSessionActive] = useState(false);
  const [sessionCardIndex, setSessionCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [hintExpanded, setHintExpanded] = useState(false);
  const [topicFilter, setTopicFilter] = useState<'all' | 'quadratic' | 'trig'>('all');

  const content = useKonkurContentStore(s => s.content);
  const progressQuestions = useKonkurProgressStore(s => s.questions);
  const toggleQuestionBookmark = useKonkurProgressStore(s => s.toggleQuestionBookmark);
  const bookmarkedQuestions = useKonkurProgressStore(s => s.bookmarkedQuestions);
  const reviewState = useKonkurStudyStore(s => s.review);

  const num = (value: number | string) => localizeDigits(value, isRTL);

  // Wrong questions from local progress
  const wrongQuestions = useMemo(() => {
    const list = content.questions.filter(q => {
      const p = progressQuestions[q.id];
      return p && !p.lastCorrect;
    });
    // If user has not accumulated wrong questions yet, populate with real practice questions
    if (list.length === 0) {
      return content.questions.slice(0, 14);
    }
    return list;
  }, [content.questions, progressQuestions]);

  const filteredQuestions = useMemo(() => {
    if (topicFilter === 'quadratic') {
      return wrongQuestions.filter(q => q.tipIds.some(t => t.includes('quad') || t.includes('root') || t.includes('sign')));
    }
    if (topicFilter === 'trig') {
      return wrongQuestions.filter(q => q.tipIds.some(t => t.includes('trig')));
    }
    return wrongQuestions;
  }, [wrongQuestions, topicFilter]);

  const activeSessionQ = filteredQuestions[sessionCardIndex] ?? filteredQuestions[0];
  const activeTip = activeSessionQ?.tipIds?.[0] ? findKonkurTip(activeSessionQ.tipIds[0], content) : undefined;
  const isBookmarked = activeSessionQ ? bookmarkedQuestions.includes(activeSessionQ.id) : false;

  const handleLaunchComprehensiveExam = () => {
    navigation.navigate('Exam', {
      config: {
        grade: 10,
        chapterIds: ['g10_algebra', 'g10_trig'],
        count: Math.min(10, Math.max(5, wrongQuestions.length)),
      },
    });
  };

  const handleNextCard = () => {
    if (sessionCardIndex < filteredQuestions.length - 1) {
      setSessionCardIndex(s => s + 1);
      setFlipped(false);
      setHintExpanded(false);
    } else {
      Alert.alert('پایان جلسه مرور', 'آفرین! کارت‌های امروز با موفقیت مرور و تثبیت شدند.');
      setSessionActive(false);
      setSessionCardIndex(0);
      setFlipped(false);
    }
  };

  /* ============================================================== */
  /* VIEW 1: LEITNER REVIEW SESSION (Image 1)                       */
  /* ============================================================== */
  if (sessionActive && activeSessionQ) {
    return (
      <View style={styles.container}>
        {/* Top Header */}
        <View style={[styles.sessionHeader, isRTL && styles.rowRTL]}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setSessionActive(false)}
            style={styles.iconCircle}
          >
            <Icon name="close" size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
            <TouchableOpacity style={styles.iconCircle}>
              <Icon name="volume-up" size={18} color="#2563EB" />
            </TouchableOpacity>
            <AppText weight="bold" size="md">
              Leitner Review Session
            </AppText>
          </View>

          <TouchableOpacity style={styles.iconCircle}>
            <Icon name="tune" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Progress bar top */}
        <View style={styles.sessionProgressBar}>
          <View
            style={[
              styles.sessionProgressFill,
              isRTL && styles.fillRTL,
              { width: `${Math.round(((sessionCardIndex + 1) / filteredQuestions.length) * 100)}%` },
            ]}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.sessionScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Subheader info: Card count, timer, streak */}
          <View style={[styles.spaceRow, isRTL && styles.rowRTL]}>
            <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
              <AppText size="xs" weight="bold">
                کارت {num(sessionCardIndex + 1)} از {num(filteredQuestions.length)}
              </AppText>
              <View style={styles.percentBadge}>
                <AppText size="xs" color="#2563EB" weight="bold">
                  {num(Math.round(((sessionCardIndex + 1) / filteredQuestions.length) * 100))}٪ تکمیل
                </AppText>
              </View>
            </View>

            <View style={[styles.inlineRow, isRTL && styles.rowRTL, styles.timerPill]}>
              <Icon name="schedule" size={14} color="#D97706" />
              <AppText size="xs" weight="bold" color="#D97706">
                ۰۲:۴۵
              </AppText>
            </View>

            <View style={[styles.inlineRow, isRTL && styles.rowRTL, styles.streakPill]}>
              <Icon name="local-fire-department" size={14} color="#EA580C" />
              <AppText size="xs" weight="bold" color="#C2410C">
                استریک {num(7)} روز
              </AppText>
            </View>
          </View>

          {/* Leitner Box Level Callout */}
          <View style={[styles.spaceRow, isRTL && styles.rowRTL, styles.leitnerStageBox]}>
            <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
              <View style={styles.stageNumberCircle}>
                <AppText size="xs" weight="bold" color="#6D28D9">
                  {num(2)}
                </AppText>
              </View>
              <View style={isRTL ? styles.alignRTL : styles.alignLTR}>
                <AppText size="xs" weight="bold">
                  خانه ۲ جعبه لایتنر
                </AppText>
                <AppText size="xs" color={colors.textSecondary}>
                  دوره تناوب: مرور ۳ روزه
                </AppText>
              </View>
            </View>
            <View style={styles.upgradeStageBadge}>
              <AppText size="xs" color="#166534" weight="bold">
                صعود به خانه ۳ ↗
              </AppText>
            </View>
          </View>

          {/* Flashcard Box */}
          <View style={styles.flashcard}>
            <View style={[styles.spaceRow, isRTL && styles.rowRTL]}>
              <TouchableOpacity onPress={() => toggleQuestionBookmark(activeSessionQ.id)}>
                <Icon
                  name={isBookmarked ? 'bookmark' : 'bookmark-border'}
                  size={22}
                  color={isBookmarked ? '#D97706' : colors.textSecondary}
                />
              </TouchableOpacity>

              <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
                <View style={styles.badgeTopic}>
                  <AppText size="xs" color="#2563EB" weight="bold">
                    معادلات درجه ۲
                  </AppText>
                </View>
                <View style={styles.badgeOrigin}>
                  <AppText size="xs" color="#6D28D9" weight="medium">
                    {sourceLabel(activeSessionQ.source)}
                  </AppText>
                </View>
                <View style={styles.badgeTrap}>
                  <AppText size="xs" color="#DC2626" weight="bold">
                    ⚠️ تله منفی‌ها
                  </AppText>
                </View>
              </View>
            </View>

            <AppText size="xs" color={colors.textSecondary} weight="bold" style={styles.cardSectionLabel}>
              مسئله آزمون:
            </AppText>

            <AppText size="sm" weight="medium" style={styles.cardQuestionTitle}>
              {activeSessionQ.text || 'در معادله‌ی درجه‌دوم'}
            </AppText>

            {/* Formula Expression */}
            <View style={styles.flashcardFormulaBox}>
              <MathExpression
                expression={activeSessionQ.expression || '2x^2 + 5x + 3 = 0'}
                size="md"
              />
            </View>

            <AppText size="sm" weight="medium" style={styles.cardQuestionBody}>
              حاصل‌ضرب و مجموع ریشه‌ها با کدام تکنیک بدون محاسبه دلتا (Δ) در کمترین زمان مشخص می‌شود؟
            </AppText>

            {/* Previous Error Callout */}
            <View style={[styles.inlineRow, isRTL && styles.rowRTL, styles.previousErrorBox]}>
              <Icon name="history" size={15} color="#DC2626" />
              <AppText size="xs" color="#991B1B" weight="medium" style={styles.flexOne}>
                خطای پیشین شما: عجله در محاسبه علامت منفی و انتخاب x = 1 ✕
              </AppText>
            </View>

            {/* AI Smart Hint Accordion */}
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setHintExpanded(h => !h)}
              style={[styles.aiHintHeader, isRTL && styles.rowRTL]}
            >
              <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
                <Icon name="auto-awesome" size={16} color="#4338CA" />
                <AppText size="xs" weight="bold" color="#3730A3">
                  سرنخ هوشمند مجهول (AI)
                </AppText>
              </View>
              <Icon
                name={hintExpanded ? 'expand-less' : 'expand-more'}
                size={18}
                color="#4338CA"
              />
            </TouchableOpacity>

            {hintExpanded && (
              <View style={styles.aiHintContent}>
                <AppText size="xs" color="#3730A3" style={styles.aiHintText}>
                  {activeTip?.body?.[0]
                    ? typeof activeTip.body[0] === 'string'
                      ? activeTip.body[0]
                      : activeTip.body[0].math
                    : 'توجه کنید که در معادله ax² + bx + c = 0 اگر a + c = b باشد، ریشه‌ها ۱- و c/a- هستند.'}
                </AppText>
              </View>
            )}

            {/* Back of Card / Detailed Solution when Flipped */}
            {flipped && (
              <View style={styles.solutionRevealedBox}>
                <AppText size="xs" weight="bold" color="#166534">
                  📖 راه‌حل تشریحی کامل:
                </AppText>
                {activeSessionQ.solution.map((line, lIdx) => (
                  <View key={lIdx} style={styles.solutionLineWrap}>
                    {typeof line === 'string' ? (
                      <AppText size="xs" color={colors.textPrimary}>
                        {line}
                      </AppText>
                    ) : (
                      <MathExpression expression={line.math} size="sm" />
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Big Flip Button */}
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setFlipped(f => !f)}
            style={styles.limeFlipButton}
          >
            <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
              <Icon name="sync" size={18} color="#0F1F05" />
              <AppText weight="bold" size="sm" color="#0F1F05">
                {flipped ? 'پنهان کردن راه‌حل تشریحی' : 'چرخش کارت و مشاهده پاسخ تشریحی'}
              </AppText>
            </View>
          </TouchableOpacity>

          {/* Anki Spaced Repetition Buttons */}
          <View style={styles.ankiContainer}>
            <AppText size="xs" color={colors.textSecondary} align="center" style={styles.ankiSubtitle}>
              سطح تسلط و زمان‌بندی بازگشت به حافظه: الگوریتم Anki
            </AppText>

            <View style={[styles.ankiButtonsRow, isRTL && styles.rowRTL]}>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={handleNextCard}
                style={[styles.ankiBox, styles.ankiRed]}
              >
                <AppText size="xs" weight="bold" color="#DC2626">
                  فراموشی
                </AppText>
                <AppText size="xs" color="#EF4444">
                  ۱۰ دقیقه
                </AppText>
                <AppText size="xs" color="#9CA3AF">
                  خانه ۱
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                onPress={handleNextCard}
                style={[styles.ankiBox, styles.ankiOrange]}
              >
                <AppText size="xs" weight="bold" color="#D97706">
                  سخت بود
                </AppText>
                <AppText size="xs" color="#F59E0B">
                  ۱ روز بعد
                </AppText>
                <AppText size="xs" color="#9CA3AF">
                  خانه ۲
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                onPress={handleNextCard}
                style={[styles.ankiBox, styles.ankiBlue]}
              >
                <AppText size="xs" weight="bold" color="#2563EB">
                  خوب بود
                </AppText>
                <AppText size="xs" color="#3B82F6">
                  ۳ روز بعد
                </AppText>
                <AppText size="xs" color="#9CA3AF">
                  خانه ۳
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                onPress={handleNextCard}
                style={[styles.ankiBox, styles.ankiGreen]}
              >
                <AppText size="xs" weight="bold" color="#166534">
                  مسلط بودم
                </AppText>
                <AppText size="xs" color="#16A34A">
                  ۷ روز بعد
                </AppText>
                <AppText size="xs" color="#166534" weight="bold">
                  خانه ۴ ★
                </AppText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Utility Bar: Audio, Night mode */}
          <View style={[styles.spaceRow, isRTL && styles.rowRTL, styles.sessionUtilityBar]}>
            <TouchableOpacity
              onPress={() => Alert.alert('صوت استاد', 'فایل صوتی تحلیل ۱۵ ثانیه‌ای این تست در حال پخش است.')}
              style={[styles.inlineRow, isRTL && styles.rowRTL, styles.audioPill]}
            >
              <Icon name="graphic-eq" size={16} color="#16A34A" />
              <AppText size="xs" weight="bold" color="#166534">
                صوت استاد (۰۰:۱۵)
              </AppText>
            </TouchableOpacity>

            <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
              <TouchableOpacity style={styles.utilityIcon}>
                <Icon name="notes" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.utilityIcon}>
                <Icon name="dark-mode" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  /* ============================================================== */
  /* VIEW 2: LEITNER DASHBOARD & MISTAKE NOTEBOOK (Images 2 & 3)    */
  /* ============================================================== */
  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={[styles.header, isRTL && styles.rowRTL]}>
        <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => navigation.navigate('Profile')}
            style={styles.headerAvatarMini}
          >
            <Icon name="person" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => navigation.navigate('Settings')}
            style={styles.iconCircle}
          >
            <Icon name="settings" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconCircle}>
            <Icon name="tune" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <AppText weight="bold" size="md" align="center" style={styles.flexOne}>
          دفترچه غلط‌ها و جعبه لایتنر
        </AppText>

        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.iconCircle}
        >
          <Icon name="arrow-back" size={20} color={colors.textPrimary} directional />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Card 1: Today's Review Overview */}
        <View style={styles.todayReviewCard}>
          <View style={[styles.spaceRow, isRTL && styles.rowRTL]}>
            <View style={styles.memoryBadge}>
              <AppText size="xs" weight="bold" color="#166534">
                تثبیت حافظه بلندمدت
              </AppText>
            </View>
            <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
              <Icon name="schedule" size={14} color="#166534" />
              <AppText size="xs" color="#166534" weight="medium">
                ~ ۸ دقیقه تمرکز
              </AppText>
            </View>
          </View>

          <AppText weight="bold" size="lg" style={styles.todayReviewHeadline}>
            مرور امروز: {num(14)} تست در انتظار
          </AppText>

          <AppText size="xs" color="#166534" style={styles.todayReviewSubtext}>
            الگوریتم مجهول نقاط ضعف دیروز را برای جلوگیری از فراموشی آماده کرده است.
          </AppText>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setSessionActive(true)}
            style={styles.startReviewLimeButton}
          >
            <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
              <AppText weight="bold" size="sm" color="#0F1F05">
                شروع مرور سریع امروز ({num(14)} تست) ←
              </AppText>
            </View>
          </TouchableOpacity>
        </View>

        {/* Card 2: 5-Stage Leitner Box Status */}
        <View style={styles.card}>
          <View style={[styles.spaceRow, isRTL && styles.rowRTL]}>
            <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
              <Icon name="inventory-2" size={18} color={colors.textPrimary} />
              <AppText weight="bold" size="md">
                وضعیت جعبه ۵ مرحله‌ای
              </AppText>
            </View>
            <View style={styles.totalCardsBadge}>
              <AppText size="xs" color="#6D28D9" weight="bold">
                مجموع ۱۱۲ کارت
              </AppText>
            </View>
          </View>

          {/* 5 Stage Columns */}
          <View style={[styles.stagesRow, isRTL && styles.rowRTL]}>
            {/* Stage 1 */}
            <View style={styles.stageColumn}>
              <View style={[styles.stageDot, { backgroundColor: '#EF4444' }]} />
              <AppText size="xs" color={colors.textSecondary}>
                خانه ۱
              </AppText>
              <AppText weight="bold" size="md">
                {num(12)}
              </AppText>
              <AppText size="xs" color={colors.textSecondary}>
                ۲۴ ساعت
              </AppText>
            </View>

            {/* Stage 2 */}
            <View style={styles.stageColumn}>
              <View style={[styles.stageDot, { backgroundColor: '#F97316' }]} />
              <AppText size="xs" color={colors.textSecondary}>
                خانه ۲
              </AppText>
              <AppText weight="bold" size="md">
                {num(8)}
              </AppText>
              <AppText size="xs" color={colors.textSecondary}>
                ۳ روز
              </AppText>
            </View>

            {/* Stage 3 */}
            <View style={styles.stageColumn}>
              <View style={[styles.stageDot, { backgroundColor: '#EAB308' }]} />
              <AppText size="xs" color={colors.textSecondary}>
                خانه ۳
              </AppText>
              <AppText weight="bold" size="md">
                {num(15)}
              </AppText>
              <AppText size="xs" color={colors.textSecondary}>
                ۱ هفته
              </AppText>
            </View>

            {/* Stage 4 */}
            <View style={styles.stageColumn}>
              <View style={[styles.stageDot, { backgroundColor: '#3B82F6' }]} />
              <AppText size="xs" color={colors.textSecondary}>
                خانه ۴
              </AppText>
              <AppText weight="bold" size="md">
                {num(24)}
              </AppText>
              <AppText size="xs" color={colors.textSecondary}>
                ۲ هفته
              </AppText>
            </View>

            {/* Stage 5: Mastered */}
            <View style={[styles.stageColumn, styles.stageColumnMastered]}>
              <View style={[styles.stageDot, { backgroundColor: '#22C55E' }]} />
              <AppText size="xs" color="#166534" weight="bold">
                خانه ۵
              </AppText>
              <AppText weight="bold" size="md" color="#166534">
                {num(53)}
              </AppText>
              <AppText size="xs" color="#166534" weight="bold">
                تثبیت
              </AppText>
            </View>
          </View>

          {/* Subnote */}
          <View style={[styles.inlineRow, isRTL && styles.rowRTL, styles.leitnerRuleNotice]}>
            <Icon name="track-changes" size={16} color="#16A34A" />
            <AppText size="xs" color={colors.textSecondary} style={styles.flexOne}>
              تست‌هایی که ۲ بار متوالی درست پاسخ دهید به مرحله بعدی صعود می‌کنند.
            </AppText>
          </View>
        </View>

        {/* Card 3: Cognitive Error Diagnostics (AI) */}
        <View style={styles.aiDiagCard}>
          <View style={[styles.cardHeaderRow, isRTL && styles.rowRTL]}>
            <View style={styles.diagIconCircle}>
              <Icon name="psychology" size={18} color="#FFFFFF" />
            </View>
            <View style={isRTL ? styles.alignRTL : styles.alignLTR}>
              <AppText size="xs" color="#6D28D9" weight="medium">
                تحلیل هوش مصنوعی مجهول
              </AppText>
              <AppText weight="bold" size="sm" color="#4C1D95">
                ریشه‌یابی خطاهای شناختی
              </AppText>
            </View>
          </View>

          {/* Error Bars */}
          <View style={styles.diagBarsWrap}>
            <View style={styles.diagBarItem}>
              <View style={[styles.spaceRow, isRTL && styles.rowRTL]}>
                <AppText size="xs" weight="medium">
                  عجله در محاسبات علامت منفی (-)
                </AppText>
                <AppText size="xs" weight="bold" color="#DC2626">
                  {num(64)}٪
                </AppText>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, isRTL && styles.fillRTL, { width: '64%', backgroundColor: '#EF4444' }]} />
              </View>
            </View>

            <View style={styles.diagBarItem}>
              <View style={[styles.spaceRow, isRTL && styles.rowRTL]}>
                <AppText size="xs" weight="medium">
                  فراموشی روابط متقارن ریشه‌ها
                </AppText>
                <AppText size="xs" weight="bold" color="#2563EB">
                  {num(24)}٪
                </AppText>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, isRTL && styles.fillRTL, { width: '24%', backgroundColor: '#3B82F6' }]} />
              </View>
            </View>

            <View style={styles.diagBarItem}>
              <View style={[styles.spaceRow, isRTL && styles.rowRTL]}>
                <AppText size="xs" weight="medium">
                  بی‌دقتی در محدوده‌های دامنه سوال
                </AppText>
                <AppText size="xs" weight="bold" color="#6B7280">
                  {num(12)}٪
                </AppText>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, isRTL && styles.fillRTL, { width: '12%', backgroundColor: '#9CA3AF' }]} />
              </View>
            </View>
          </View>

          {/* Remedial Generator Button */}
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              navigation.navigate('Exam', {
                config: {
                  grade: 10,
                  chapterIds: ['g10_algebra'],
                  count: 10,
                },
              });
            }}
            style={styles.remedialButton}
          >
            <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
              <Icon name="bolt" size={16} color="#6D28D9" />
              <AppText size="xs" weight="bold" color="#5B21B6">
                تولید تمرین متمرکز روی تله منفی‌ها (۱۰ سوال)
              </AppText>
            </View>
          </TouchableOpacity>
        </View>

        {/* Topic Filter Chips */}
        <View style={styles.filterSection}>
          <View style={[styles.spaceRow, isRTL && styles.rowRTL]}>
            <AppText weight="bold" size="sm">
              دسته‌بندی موضوعی
            </AppText>
            <AppText size="xs" color={colors.textSecondary}>
              {num(wrongQuestions.length)} تست فعال
            </AppText>
          </View>

          <View style={[styles.filterChipsRow, isRTL && styles.rowRTL]}>
            <TouchableOpacity
              onPress={() => setTopicFilter('all')}
              style={[styles.filterChip, topicFilter === 'all' && styles.filterChipActive]}
            >
              <AppText
                size="xs"
                weight="bold"
                color={topicFilter === 'all' ? '#FFFFFF' : colors.textPrimary}
              >
                همه ({num(wrongQuestions.length)})
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setTopicFilter('quadratic')}
              style={[styles.filterChip, topicFilter === 'quadratic' && styles.filterChipActive]}
            >
              <AppText
                size="xs"
                weight="bold"
                color={topicFilter === 'quadratic' ? '#FFFFFF' : colors.textPrimary}
              >
                معادلات درجه ۲ ({num(12)})
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setTopicFilter('trig')}
              style={[styles.filterChip, topicFilter === 'trig' && styles.filterChipActive]}
            >
              <AppText
                size="xs"
                weight="bold"
                color={topicFilter === 'trig' ? '#FFFFFF' : colors.textPrimary}
              >
                مثلثات ({num(9)})
              </AppText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Question Cards List */}
        <View style={styles.questionsListWrap}>
          {filteredQuestions.map((q, idx) => {
            return (
              <View key={q.id || idx} style={styles.mistakeCard}>
                <View style={[styles.spaceRow, isRTL && styles.rowRTL]}>
                  <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
                    <TouchableOpacity>
                      <Icon name="more-vert" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <View style={isRTL ? styles.alignRTL : styles.alignLTR}>
                      <AppText size="xs" weight="bold">
                        {idx % 2 === 0 ? 'معادلات درجه دو • کنکور سراسری ۱۴۰۱' : 'مثلثات • آزمون سنجش مرحله سوم'}
                      </AppText>
                      <AppText size="xs" color={idx === 0 ? '#DC2626' : '#2563EB'} weight="medium">
                        {idx === 0 ? 'خانه ۱: نیاز به مرور فوری' : 'خانه ۳: در مسیر تثبیت'}
                      </AppText>
                    </View>
                  </View>
                </View>

                {/* Question Statement */}
                <AppText size="sm" weight="medium" style={styles.mistakeQuestionText}>
                  {q.text}
                </AppText>

                {q.expression && (
                  <View style={styles.mistakeExpressionBox}>
                    <MathExpression expression={q.expression} size="sm" />
                  </View>
                )}

                {/* Trap Warning Badge */}
                <View style={[styles.inlineRow, isRTL && styles.rowRTL, styles.trapCallout]}>
                  <Icon name="warning" size={14} color="#D97706" />
                  <AppText size="xs" color="#B45309" weight="medium">
                    {idx % 2 === 0 ? 'تله علامت در نسبت a + c = b' : 'عدم تبدیل کمان مضاعف به tan(x)'}
                  </AppText>
                </View>

                {/* User Pick vs Correct Answer */}
                <View style={[styles.picksRow, isRTL && styles.rowRTL]}>
                  <View style={[styles.pickBox, styles.pickBoxWrong]}>
                    <AppText size="xs" color="#DC2626" weight="medium">
                      ✕ پاسخ شما: گزینه {num(1)}
                    </AppText>
                  </View>
                  <View style={[styles.pickBox, styles.pickBoxCorrect]}>
                    <AppText size="xs" color="#166534" weight="bold">
                      ✓ پاسخ درست: گزینه {num(q.answer + 1)}
                    </AppText>
                  </View>
                </View>

                {/* Actions row: پاسخ تشریحی, نکته میانبر, دانستم */}
                <View style={[styles.spaceRow, isRTL && styles.rowRTL, styles.cardActionFooter]}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => {
                      setSessionCardIndex(idx);
                      setSessionActive(true);
                      setFlipped(true);
                    }}
                    style={[styles.inlineRow, isRTL && styles.rowRTL, styles.actionPill]}
                  >
                    <Icon name="menu-book" size={14} color={colors.textPrimary} />
                    <AppText size="xs" weight="medium">
                      پاسخ تشریحی
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => {
                      setSessionCardIndex(idx);
                      setSessionActive(true);
                      setHintExpanded(true);
                    }}
                    style={[styles.inlineRow, isRTL && styles.rowRTL, styles.actionPill]}
                  >
                    <Icon name="lightbulb" size={14} color="#7C3AED" />
                    <AppText size="xs" color="#7C3AED" weight="medium">
                      نکته میانبر
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => {
                      Alert.alert('ثبت موفق', 'این تست به مرحله بعدی جعبه لایتنر صعود کرد.');
                    }}
                    style={[styles.inlineRow, isRTL && styles.rowRTL, styles.actionPill]}
                  >
                    <Icon name="done-all" size={14} color="#16A34A" />
                    <AppText size="xs" color="#166534" weight="bold">
                      دانستم
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={[styles.stickyBottomBar, isRTL && styles.rowRTL]}>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => navigation.navigate('FormulaSheet')}
          style={styles.bottomIconPill}
        >
          <Icon name="bookmark" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          onPress={handleLaunchComprehensiveExam}
          style={styles.limeComprehensiveButton}
        >
          <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
            <Icon name="assignment" size={18} color="#0F1F05" />
            <AppText weight="bold" size="sm" color="#0F1F05">
              آزمون جامع از غلط‌ها
            </AppText>
          </View>
        </TouchableOpacity>
      </View>
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
    alignRTL: {
      alignItems: 'flex-end',
    },
    alignLTR: {
      alignItems: 'flex-start',
    },
    flexOne: {
      flex: 1,
    },
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: radius.pill,
      backgroundColor: '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerAvatarMini: {
      width: 28,
      height: 28,
      borderRadius: radius.pill,
      backgroundColor: '#16A34A',
      alignItems: 'center',
      justifyContent: 'center',
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
    scrollContent: {
      padding: spacing.md,
      paddingBottom: 95,
      gap: spacing.md,
    },
    todayReviewCard: {
      backgroundColor: '#F0FDF4',
      borderRadius: 24,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: '#BBF7D0',
      gap: spacing.xs,
    },
    memoryBadge: {
      backgroundColor: '#DCFCE7',
      borderRadius: radius.pill,
      paddingVertical: 3,
      paddingHorizontal: 10,
    },
    todayReviewHeadline: {
      marginTop: 4,
      color: '#14532D',
    },
    todayReviewSubtext: {
      lineHeight: 18,
    },
    startReviewLimeButton: {
      backgroundColor: '#76E000',
      borderRadius: 20,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 6,
    },
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 22,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: '#F3F4F6',
      gap: spacing.sm,
    },
    totalCardsBadge: {
      backgroundColor: '#EDE9FE',
      borderRadius: radius.pill,
      paddingVertical: 3,
      paddingHorizontal: 10,
    },
    stagesRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginVertical: spacing.xs,
    },
    stageColumn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 8,
      borderRadius: 14,
      gap: 3,
    },
    stageColumnMastered: {
      backgroundColor: '#DCFCE7',
    },
    stageDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    leitnerRuleNotice: {
      backgroundColor: '#F9FAFB',
      borderRadius: 12,
      padding: 10,
      marginTop: 4,
    },
    aiDiagCard: {
      backgroundColor: '#F5F3FF',
      borderRadius: 22,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: '#DDD6FE',
      gap: spacing.sm,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    diagIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#7C3AED',
      alignItems: 'center',
      justifyContent: 'center',
    },
    diagBarsWrap: {
      gap: 8,
      marginTop: spacing.xs,
    },
    diagBarItem: {
      gap: 4,
    },
    track: {
      height: 6,
      borderRadius: radius.pill,
      backgroundColor: '#EDE9FE',
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: radius.pill,
    },
    fillRTL: {
      alignSelf: 'flex-end',
    },
    remedialButton: {
      backgroundColor: '#EDE9FE',
      borderRadius: 16,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    filterSection: {
      gap: spacing.xs,
    },
    filterChipsRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginTop: 4,
    },
    filterChip: {
      paddingVertical: 7,
      paddingHorizontal: 14,
      borderRadius: radius.pill,
      backgroundColor: '#F3F4F6',
    },
    filterChipActive: {
      backgroundColor: '#16A34A',
    },
    questionsListWrap: {
      gap: spacing.sm,
    },
    mistakeCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: '#F3F4F6',
      gap: spacing.xs,
    },
    mistakeQuestionText: {
      lineHeight: 20,
      marginTop: 4,
    },
    mistakeExpressionBox: {
      alignItems: 'center',
      paddingVertical: 6,
      backgroundColor: '#F9FAFB',
      borderRadius: 10,
      marginVertical: 4,
    },
    trapCallout: {
      backgroundColor: '#FFFBEB',
      borderRadius: 10,
      paddingVertical: 5,
      paddingHorizontal: 8,
      alignSelf: 'flex-start',
      marginTop: 2,
    },
    picksRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginTop: 6,
    },
    pickBox: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 10,
      alignItems: 'center',
    },
    pickBoxWrong: {
      backgroundColor: '#FEF2F2',
      borderWidth: 1,
      borderColor: '#FECACA',
    },
    pickBoxCorrect: {
      backgroundColor: '#F0FDF4',
      borderWidth: 1,
      borderColor: '#BBF7D0',
    },
    cardActionFooter: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: '#F3F4F6',
    },
    actionPill: {
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: radius.pill,
      backgroundColor: '#F9FAFB',
    },
    stickyBottomBar: {
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
    bottomIconPill: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    limeComprehensiveButton: {
      flex: 1,
      backgroundColor: '#76E000',
      borderRadius: 16,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sessionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
      backgroundColor: '#FFFFFF',
    },
    sessionProgressBar: {
      height: 4,
      backgroundColor: '#F3F4F6',
    },
    sessionProgressFill: {
      height: '100%',
      backgroundColor: '#76E000',
    },
    sessionScrollContent: {
      padding: spacing.md,
      paddingBottom: 40,
      gap: spacing.md,
    },
    percentBadge: {
      backgroundColor: '#EFF6FF',
      borderRadius: radius.pill,
      paddingVertical: 2,
      paddingHorizontal: 8,
    },
    timerPill: {
      backgroundColor: '#FEF3C7',
      borderRadius: radius.pill,
      paddingVertical: 3,
      paddingHorizontal: 10,
    },
    streakPill: {
      backgroundColor: '#FFEDD5',
      borderRadius: radius.pill,
      paddingVertical: 3,
      paddingHorizontal: 10,
    },
    leitnerStageBox: {
      backgroundColor: '#F5F3FF',
      borderRadius: 18,
      padding: 12,
      borderWidth: 1,
      borderColor: '#EDE9FE',
    },
    stageNumberCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#EDE9FE',
      alignItems: 'center',
      justifyContent: 'center',
    },
    upgradeStageBadge: {
      backgroundColor: '#DCFCE7',
      borderRadius: radius.pill,
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    flashcard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 24,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: '#F3F4F6',
      gap: spacing.sm,
    },
    badgeTopic: {
      backgroundColor: '#EFF6FF',
      borderRadius: radius.pill,
      paddingVertical: 2,
      paddingHorizontal: 8,
    },
    badgeOrigin: {
      backgroundColor: '#F5F3FF',
      borderRadius: radius.pill,
      paddingVertical: 2,
      paddingHorizontal: 8,
    },
    badgeTrap: {
      backgroundColor: '#FEE2E2',
      borderRadius: radius.pill,
      paddingVertical: 2,
      paddingHorizontal: 8,
    },
    cardSectionLabel: {
      marginTop: 4,
    },
    cardQuestionTitle: {
      fontSize: 16,
    },
    flashcardFormulaBox: {
      alignItems: 'center',
      backgroundColor: '#EFF6FF',
      borderRadius: 14,
      paddingVertical: 14,
      marginVertical: 4,
    },
    cardQuestionBody: {
      lineHeight: 22,
    },
    previousErrorBox: {
      backgroundColor: '#FEF2F2',
      borderRadius: 12,
      padding: 10,
      marginTop: 2,
    },
    aiHintHeader: {
      backgroundColor: '#EEF2FF',
      borderRadius: 14,
      padding: 10,
      marginTop: 4,
    },
    aiHintContent: {
      backgroundColor: '#F5F3FF',
      borderRadius: 12,
      padding: 10,
      marginTop: -2,
    },
    aiHintText: {
      lineHeight: 18,
    },
    solutionRevealedBox: {
      backgroundColor: '#F0FDF4',
      borderRadius: 14,
      padding: 12,
      marginTop: 8,
      gap: 6,
      borderWidth: 1,
      borderColor: '#BBF7D0',
    },
    solutionLineWrap: {
      marginVertical: 2,
    },
    limeFlipButton: {
      backgroundColor: '#76E000',
      borderRadius: 20,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ankiContainer: {
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    ankiSubtitle: {
      marginBottom: 4,
    },
    ankiButtonsRow: {
      flexDirection: 'row',
      gap: 6,
    },
    ankiBox: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#F3F4F6',
      gap: 2,
    },
    ankiRed: {
      borderColor: '#FECACA',
    },
    ankiOrange: {
      borderColor: '#FED7AA',
    },
    ankiBlue: {
      borderColor: '#BFDBFE',
    },
    ankiGreen: {
      backgroundColor: '#DCFCE7',
      borderColor: '#86EFAC',
    },
    sessionUtilityBar: {
      marginTop: spacing.xs,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: '#F3F4F6',
    },
    audioPill: {
      backgroundColor: '#F0FDF4',
      borderRadius: radius.pill,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: '#BBF7D0',
    },
    utilityIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
    },
  }),
);
