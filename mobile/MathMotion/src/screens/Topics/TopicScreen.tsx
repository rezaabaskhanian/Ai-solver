import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Share from 'react-native-share';

import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { Icon } from '../../components/common/Icon';
import { MathExpression } from '../../components/MathExpression/MathExpression';
import { chaptersForTopic } from '../../content/curriculum';
import { LESSONS } from '../../content/lessons';
import { findTopic } from '../../content/topics';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { useTrack } from '../../store/usePreferencesStore';
import { fontFamily, fontSize, makeStyles, radius, spacing, useColors } from '../../theme';

interface TopicDetailedContent {
  keyNoteTitle: string;
  keyNoteBadge?: string;
  keyNotePrompt: string;
  keyNoteFormula: string;
  roadmapTitle: string;
  roadmapSubtitle: string;
  introText: string;
  roadmapSteps: string[];
  conceptsTitle: string;
  concepts: { title: string; subtitle: string }[];
  trapsTitle: string;
  trapsSubtitle: string;
  traps: {
    wrong: string;
    right: string;
    note?: string;
    caption?: string;
  }[];
  bookPages: { gradeText: string; page: string }[];
  exampleDetails: { formula: string; subtitle: string }[];
}

const TOPIC_DETAILS: Record<string, TopicDetailedContent> = {
  trig: {
    keyNoteTitle: 'نکته کلیدی و اتحاد مادر',
    keyNoteBadge: 'همیشه در کنکور',
    keyNotePrompt: 'اتحاد اصلی را همیشه در اولویت ساده‌سازی قرار دهید:',
    keyNoteFormula: 'sin²(x) + cos²(x) = 1',
    roadmapTitle: 'درسنامه و نقشه راه حل',
    roadmapSubtitle: 'مفاهیم پایه و تکنیک‌های ساده‌سازی',
    introText:
      'مثلثات رابطه‌ی بین زاویه‌ها و ضلع‌های مثلث را بررسی می‌کند. با آن می‌توان ارتفاع یک ساختمان را از روی سایه‌اش حساب کرد، حرکت موج‌ها را توصیف کرد و انبوهی از مسائل فیزیک را حل نمود. نسبت‌های اصلی مثلثاتی شامل سینوس، کسینوس و تانژانت هستند.',
    roadmapSteps: [
      'بررسی واحد زاویه: اگر زاویه برحسب رادیان (π) است، آن را به درجه تبدیل کن.',
      'زوایای معروف: مقدار نسبت‌های ۳۰، ۴۵ و ۶۰ درجه را فوراً جایگذاری کن.',
      'تبدیل به سینوس و کسینوس: تانژانت و کتانژانت را تبدیل کن (tan = sin/cos).',
      'شکار اتحاد: به دنبال ترکیب sin² + cos² = 1 یا فاکتورگیری بگرد.',
    ],
    conceptsTitle: 'مفهوم نسبت‌ها در مثلث قائم‌الزاویه',
    concepts: [
      { title: 'سینوس (Sin)', subtitle: 'ضلع مقابل ÷ وتر' },
      { title: 'کسینوس (Cos)', subtitle: 'ضلع مجاور ÷ وتر' },
      { title: 'تانژانت (Tan)', subtitle: 'ضلع مقابل ÷ مجاور' },
    ],
    trapsTitle: 'دام‌های تستی و اشتباهات رایج',
    trapsSubtitle: 'این خطاها نمره شما را می‌سوزانند!',
    traps: [
      {
        wrong: 'sin(2x) = 2 sin(x)',
        right: 'sin(2x) = 2 sin(x)cos(x)',
        note: 'ضریب زاویه را هرگز نمی‌توان از تابع مثلثاتی بیرون کشید. برای کمان دوبرابر حتماً باید از فرمول مضاعف استفاده کرد.',
      },
      {
        caption:
          'قاطی کردن درجه و رادیان: سینوس ۳۰ بدون علامت درجه یعنی ۳۰ رادیان (حدود منفی ۰/۹۹ است). این اشتباه در ماشین‌حساب هم زیاد رخ می‌دهد.',
        wrong: 'sin(30) = 1/2',
        right: 'sin(30°) = 1/2',
      },
    ],
    bookPages: [
      { gradeText: 'پایه‌ی ۱۰ — ریاضی (۱)، فصل ۲: مثلثات', page: 'ص ۳۰' },
      { gradeText: 'پایه‌ی ۱۱ — حسابان (۱)، فصل ۴: مثلثات', page: 'ص ۷۸' },
      { gradeText: 'پایه‌ی ۱۲ — حسابان (۲)، فصل ۲: مثلثات', page: 'ص ۴۵' },
    ],
    exampleDetails: [
      { formula: 'sin(x)² + cos(x)²', subtitle: 'ساده‌سازی مستقیم با اتحاد' },
      { formula: 'sin(pi / 6)', subtitle: 'محاسبه زاویه ۳۰ درجه' },
      { formula: 'tan(x) * cos(x)', subtitle: 'ساده‌سازی کسر تانژانت' },
    ],
  },
};

export function TopicScreen() {
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const track = useTrack();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Topic'>>();
  const topic = findTopic(params.topicId);
  const bookRefs = chaptersForTopic(params.topicId, track);
  const lesson = LESSONS[params.topicId];

  const [lessonExpanded, setLessonExpanded] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);

  if (!topic) {
    return null;
  }

  const topicTitle = t(`topics.${topic.id}.title`, { defaultValue: 'مثلثات' });
  const topicSummary = t(`topics.${topic.id}.summary`, { defaultValue: 'ساده‌سازی عبارت‌های مثلثاتی' });
  const details = TOPIC_DETAILS[topic.id] ?? {
    keyNoteTitle: 'نکته کلیدی و مفهوم اصلی',
    keyNotePrompt: t(`topics.${topic.id}.tip`),
    keyNoteFormula: topic.examples[0] ?? '',
    roadmapTitle: 'درسنامه و نقشه راه حل',
    roadmapSubtitle: 'مفاهیم پایه و تکنیک‌ها',
    introText: topicSummary,
    roadmapSteps: [
      'بررسی و ساده‌سازی اولیه عبارت',
      'یافتن الگوها و قوانین ریاضی مرتبط',
      'جایگذاری مقادیر و حل نهایی',
    ],
    conceptsTitle: 'مفاهیم پایه',
    concepts: [],
    trapsTitle: 'نکات و اشتباهات رایج',
    trapsSubtitle: 'به این نکات دقت کنید تا اشتباه نشود',
    traps: [],
    bookPages: bookRefs.map(r => ({
      gradeText: `پایه‌ی ${r.grade} — ${r.book}، فصل ${r.number}: ${r.chapter.title}`,
      page: 'کتاب درسی',
    })),
    exampleDetails: topic.examples.map(ex => ({ formula: ex, subtitle: 'تمرین حل گام‌به‌گام' })),
  };

  const handleShare = async () => {
    try {
      await Share.open({
        message: `${topicTitle}\n${topicSummary}\nحل با هوش مصنوعی در اپلیکیشن مجهول`,
      });
    } catch {
      // User cancelled share
    }
  };

  return (
    <View style={styles.screenWrapper}>
      {/* Top App Header */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }, isRTL && styles.rowRTL]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        >
          <Icon name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color="#374151" />
        </Pressable>

        <View style={styles.topTitleBox}>
          <AppText weight="bold" size="md" color="#111827">
            {topicTitle}
          </AppText>
          <AppText size="xs" color="#6B7280">
            {topicSummary}
          </AppText>
        </View>

        <View style={[styles.headerActions, isRTL && styles.rowRTL]}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setBookmarked(b => !b)}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          >
            <Icon
              name={bookmarked ? 'bookmark' : 'bookmark-border'}
              size={22}
              color={bookmarked ? '#15803D' : '#374151'}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={handleShare}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          >
            <Icon name="share" size={22} color="#374151" />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Badges Row */}
        <View style={[styles.badgesRow, isRTL && styles.rowRTL]}>
          <View style={[styles.gradePill, isRTL && styles.rowRTL]}>
            <View style={styles.greenDot} />
            <AppText size="xs" weight="medium" color="#15803D">
              پایه ۱۰ • ریاضی (۱) • فصل ۲
            </AppText>
          </View>

          <View style={[styles.timePill, isRTL && styles.rowRTL]}>
            <Icon name="schedule" size={14} color="#6B7280" />
            <AppText size="xs" color="#6B7280">
              مطالعه: ۷ دقیقه
            </AppText>
          </View>
        </View>

        {/* Card 1: نکته کلیدی و اتحاد مادر */}
        <View style={styles.keyNoteCard}>
          <View style={[styles.cardHeaderRow, isRTL && styles.rowRTL]}>
            <View style={[styles.keyNoteTitleWrap, isRTL && styles.rowRTL]}>
              <View style={styles.bulbIconCircle}>
                <Icon name="lightbulb" size={16} color="#FFFFFF" />
              </View>
              <AppText weight="bold" size="sm" color="#111827">
                {details.keyNoteTitle}
              </AppText>
            </View>

            {details.keyNoteBadge && (
              <View style={styles.konkurPill}>
                <AppText size="xs" weight="bold" color="#15803D">
                  {details.keyNoteBadge}
                </AppText>
              </View>
            )}
          </View>

          <AppText size="xs" color="#374151" style={styles.keyNotePrompt}>
            {details.keyNotePrompt}
          </AppText>

          <View style={styles.formulaWhiteBox}>
            <AppText size="md" weight="bold" color="#111827" align="center">
              {details.keyNoteFormula}
            </AppText>
          </View>
        </View>

        {/* Card 2: درسنامه و نقشه راه حل */}
        <View style={styles.lessonCard}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setLessonExpanded(e => !e)}
            style={[styles.lessonHeaderRow, isRTL && styles.rowRTL]}
          >
            <View style={styles.gradCapCircle}>
              <Icon name="school" size={20} color="#15803D" />
            </View>
            <View style={styles.lessonTitleCol}>
              <AppText weight="bold" size="sm" color="#111827">
                {details.roadmapTitle}
              </AppText>
              <AppText size="xs" color="#6B7280">
                {details.roadmapSubtitle}
              </AppText>
            </View>
            <Icon name={lessonExpanded ? 'expand-less' : 'expand-more'} size={22} color="#9CA3AF" />
          </Pressable>

          {lessonExpanded && (
            <View style={styles.lessonBody}>
              <AppText size="xs" color="#374151" style={styles.introParagraph}>
                {details.introText}
              </AppText>

              {/* Roadmap steps */}
              <View style={styles.roadmapBox}>
                <View style={[styles.roadmapTitleRow, isRTL && styles.rowRTL]}>
                  <View style={styles.greenBullet} />
                  <AppText weight="bold" size="xs" color="#166534">
                    نقشه‌ی راه حل مسئله‌های مثلثات:
                  </AppText>
                </View>

                {details.roadmapSteps.map((step, idx) => (
                  <View key={idx} style={[styles.stepRow, isRTL && styles.rowRTL]}>
                    <View style={styles.stepNumCircle}>
                      <AppText size="xs" weight="bold" color="#15803D">
                        {idx + 1}
                      </AppText>
                    </View>
                    <AppText size="xs" color="#374151" style={styles.stepText}>
                      {step}
                    </AppText>
                  </View>
                ))}
              </View>

              {/* Concepts list */}
              {details.concepts.length > 0 && (
                <View style={styles.conceptsSection}>
                  <View style={[styles.conceptTitleRow, isRTL && styles.rowRTL]}>
                    <Icon name="change-history" size={16} color="#15803D" />
                    <AppText weight="bold" size="xs" color="#111827">
                      {details.conceptsTitle}
                    </AppText>
                  </View>

                  {details.concepts.map((c, i) => (
                    <View key={i} style={styles.conceptItemCard}>
                      <AppText weight="bold" size="xs" color="#166534" align="center">
                        {c.title}
                      </AppText>
                      <AppText size="xs" color="#6B7280" align="center">
                        {c.subtitle}
                      </AppText>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Card 3: دام‌های تستی و اشتباهات رایج */}
        {details.traps.length > 0 && (
          <View style={styles.trapsCard}>
            <View style={[styles.trapsHeaderRow, isRTL && styles.rowRTL]}>
              <View style={styles.warningCircle}>
                <Icon name="priority-high" size={14} color="#B45309" />
              </View>
              <View style={styles.trapsTitleCol}>
                <AppText weight="bold" size="sm" color="#111827">
                  {details.trapsTitle}
                </AppText>
                <AppText size="xs" color="#6B7280">
                  {details.trapsSubtitle}
                </AppText>
              </View>
            </View>

            {details.traps.map((trap, idx) => (
              <View key={idx} style={styles.trapBlock}>
                {trap.caption && (
                  <AppText size="xs" color="#374151" style={styles.trapCaption}>
                    {trap.caption}
                  </AppText>
                )}

                {/* Wrong box */}
                <View style={[styles.wrongLine, isRTL && styles.rowRTL]}>
                  <View style={styles.crossCircle}>
                    <Icon name="close" size={14} color="#DC2626" />
                  </View>
                  <AppText size="sm" weight="bold" color="#991B1B">
                    {trap.wrong}
                  </AppText>
                </View>

                {/* Right box */}
                <View style={[styles.rightLine, isRTL && styles.rowRTL]}>
                  <View style={styles.checkCircle}>
                    <Icon name="check" size={14} color="#15803D" />
                  </View>
                  <AppText size="sm" weight="bold" color="#166534">
                    {trap.right}
                  </AppText>
                </View>

                {trap.note && (
                  <View style={[styles.trapNoteRow, isRTL && styles.rowRTL]}>
                    <Icon name="lightbulb" size={14} color="#F59E0B" />
                    <AppText size="xs" color="#4B5563" style={styles.trapNoteText}>
                      {trap.note}
                    </AppText>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Card 4: در کتاب‌های درسی رسمی */}
        {details.bookPages.length > 0 && (
          <View style={styles.booksCard}>
            <View style={[styles.booksHeaderRow, isRTL && styles.rowRTL]}>
              <Icon name="menu-book" size={20} color="#15803D" />
              <AppText weight="bold" size="sm" color="#111827">
                در کتاب‌های درسی رسمی
              </AppText>
            </View>

            {details.bookPages.map((bp, i) => (
              <View key={i} style={[styles.bookRowItem, isRTL && styles.rowRTL]}>
                <View style={[styles.bookNameCol, isRTL && styles.rowRTL]}>
                  <Icon name="auto-stories" size={18} color="#6B7280" />
                  <AppText size="xs" color="#374151" style={styles.bookTitleText}>
                    {bp.gradeText}
                  </AppText>
                </View>
                <View style={styles.pagePill}>
                  <AppText size="xs" weight="medium" color="#15803D">
                    {bp.page}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Card 5: نمونه مسئله‌ها و تمرین هوشمند */}
        <View style={styles.examplesCard}>
          <View style={[styles.examplesHeaderRow, isRTL && styles.rowRTL]}>
            <View style={styles.examplesTitleCol}>
              <AppText weight="bold" size="sm" color="#111827">
                نمونه مسئله‌ها و تمرین هوشمند
              </AppText>
              <AppText size="xs" color="#6B7280">
                روی هر نمونه بزن تا مراحل حل تفکیک‌شده را ببینی
              </AppText>
            </View>
            <View style={styles.countBadge}>
              <AppText size="xs" weight="bold" color="#15803D">
                {`${details.exampleDetails.length} مسئله`}
              </AppText>
            </View>
          </View>

          {details.exampleDetails.map((ex, i) => (
            <Pressable
              key={i}
              accessibilityRole="button"
              onPress={() => navigation.navigate('ProblemInput', { initialProblem: ex.formula })}
              style={({ pressed }) => [styles.exampleCardItem, pressed && styles.pressed, isRTL && styles.rowRTL]}
            >
              <View style={styles.playIconBox}>
                <Icon name="play-arrow" size={18} color="#15803D" />
              </View>

              <View style={styles.exampleCenterCol}>
                <AppText size="sm" weight="bold" color="#111827">
                  {ex.formula}
                </AppText>
                <AppText size="xs" color="#6B7280">
                  {ex.subtitle}
                </AppText>
              </View>

              <View style={[styles.seeSolveBtn, isRTL && styles.rowRTL]}>
                <AppText size="xs" weight="bold" color="#15803D">
                  دیدن حل
                </AppText>
                <Icon name={isRTL ? 'chevron-left' : 'chevron-right'} size={16} color="#15803D" />
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Floating Bottom Quiz Bar */}
      <View style={[styles.bottomFloatingBar, { paddingBottom: insets.bottom + spacing.xs }, isRTL && styles.rowRTL]}>
        <View style={styles.quizInfoCol}>
          <AppText size="xs" color="#6B7280">
            سنجش یادگیری این بخش
          </AppText>
          <AppText size="xs" weight="bold" color="#111827">
            آزمون کوتاه (۵ تست تالیفی)
          </AppText>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('ExamSetup')}
          style={({ pressed }) => [styles.quizBtn, pressed && styles.pressed, isRTL && styles.rowRTL]}
        >
          <AppText size="sm" weight="bold" color="#0F1F05">
            شروع کوئیز
          </AppText>
          <Icon name={isRTL ? 'keyboard-double-arrow-left' : 'keyboard-double-arrow-right'} size={18} color="#0F1F05" />
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles(() =>
  StyleSheet.create({
    screenWrapper: {
      flex: 1,
      backgroundColor: '#F8FAF9',
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#F0F2F5',
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
    },
    topTitleBox: {
      alignItems: 'center',
      gap: 2,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    scrollContent: {
      padding: spacing.md,
      gap: spacing.md,
      paddingBottom: 100,
    },
    badgesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    gradePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: radius.pill,
      backgroundColor: '#DCFCE7',
    },
    greenDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#16A34A',
    },
    timePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radius.pill,
      backgroundColor: '#F3F4F6',
    },
    keyNoteCard: {
      backgroundColor: '#F0FDF4',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#BBF7D0',
      padding: spacing.md,
      gap: spacing.sm,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    keyNoteTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    bulbIconCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#76E000',
      alignItems: 'center',
      justifyContent: 'center',
    },
    konkurPill: {
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: '#DCFCE7',
    },
    keyNotePrompt: {
      lineHeight: 18,
    },
    formulaWhiteBox: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#DCFCE7',
      padding: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    lessonCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#EEF0F4',
      padding: spacing.md,
      gap: spacing.md,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1,
    },
    lessonHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    gradCapCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#DCFCE7',
      alignItems: 'center',
      justifyContent: 'center',
    },
    lessonTitleCol: {
      flex: 1,
      gap: 2,
    },
    lessonBody: {
      gap: spacing.md,
      borderTopWidth: 1,
      borderTopColor: '#F3F4F6',
      paddingTop: spacing.md,
    },
    introParagraph: {
      lineHeight: 20,
    },
    roadmapBox: {
      backgroundColor: '#F0FDF4',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#DCFCE7',
      padding: spacing.md,
      gap: spacing.sm,
    },
    roadmapTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    greenBullet: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#16A34A',
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.xs,
    },
    stepNumCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#DCFCE7',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    stepText: {
      flex: 1,
      lineHeight: 18,
    },
    conceptsSection: {
      gap: spacing.xs,
    },
    conceptTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    conceptItemCard: {
      backgroundColor: '#F9FAFB',
      borderRadius: 10,
      padding: spacing.sm,
      gap: 2,
    },
    trapsCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#EEF0F4',
      padding: spacing.md,
      gap: spacing.md,
    },
    trapsHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    warningCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#FEF3C7',
      alignItems: 'center',
      justifyContent: 'center',
    },
    trapsTitleCol: {
      flex: 1,
      gap: 2,
    },
    trapBlock: {
      gap: spacing.xs,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
    },
    trapCaption: {
      lineHeight: 18,
      marginBottom: 4,
    },
    wrongLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: '#FEE2E2',
      borderRadius: 10,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
    },
    rightLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: '#DCFCE7',
      borderRadius: 10,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
    },
    crossCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    trapNoteRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
      marginTop: 4,
    },
    trapNoteText: {
      flex: 1,
      lineHeight: 18,
    },
    booksCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#EEF0F4',
      padding: spacing.md,
      gap: spacing.sm,
    },
    booksHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: 4,
    },
    bookRowItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: '#F9FAFB',
    },
    bookNameCol: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      flex: 1,
    },
    bookTitleText: {
      flex: 1,
    },
    pagePill: {
      backgroundColor: '#DCFCE7',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    examplesCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#EEF0F4',
      padding: spacing.md,
      gap: spacing.sm,
    },
    examplesHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    examplesTitleCol: {
      flex: 1,
      gap: 2,
    },
    countBadge: {
      backgroundColor: '#DCFCE7',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    exampleCardItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.sm,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#F3F4F6',
      backgroundColor: '#FAFAFA',
      gap: spacing.sm,
    },
    playIconBox: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: '#DCFCE7',
      alignItems: 'center',
      justifyContent: 'center',
    },
    exampleCenterCol: {
      flex: 1,
      gap: 2,
    },
    seeSolveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    bottomFloatingBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.96)',
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    quizInfoCol: {
      gap: 2,
    },
    quizBtn: {
      backgroundColor: '#76E000',
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      shadowColor: '#76E000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.35,
      shadowRadius: 4,
      elevation: 2,
    },
    rowRTL: {
      flexDirection: 'row-reverse',
    },
    pressed: {
      opacity: 0.75,
    },
  }),
);
