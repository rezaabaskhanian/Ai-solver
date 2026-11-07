import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppText } from '../../components/common/AppText';
import { AppBottomNav } from '../../components/common/AppBottomNav';
import { Icon } from '../../components/common/Icon';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import {
  fetchAcademicProfile,
  updateAcademicProfile,
  type AcademicProfile,
} from '../../services/api/academicProfile';
import { localizeDigits } from '../../services/exam/scoring';
import { useAuthStore } from '../../store/useAuthStore';
import { useKonkurContentStore } from '../../store/useKonkurContentStore';
import { useKonkurProgressStore } from '../../store/useKonkurProgressStore';
import { makeStyles, radius, spacing, useColors } from '../../theme';

const WEEKDAYS = [
  { key: 'sat', label: 'ش', done: true },
  { key: 'sun', label: 'ی', done: true },
  { key: 'mon', label: 'د', done: true },
  { key: 'tue', label: 'س', done: true },
  { key: 'wed', label: 'چ', done: true },
  { key: 'thu', label: 'پ', done: true, special: true },
  { key: 'fri', label: 'ج', done: false, locked: true },
];

const PRESET_GOALS = [
  'پزشکی دانشگاه علوم پزشکی تهران',
  'مهندسی برق دانشگاه صنعتی شریف',
  'مهندسی کامپیوتر دانشگاه تهران',
  'دندانپزشکی شهید بهشتی',
  'داروسازی دانشگاه تهران',
  'رتبه ۲ رقمی کنکور سراسری',
];

export function ProfileScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const user = useAuthStore(s => s.user);
  const bookmarkedQuestions = useKonkurProgressStore(s => s.bookmarkedQuestions);
  const bookmarkedTips = useKonkurProgressStore(s => s.bookmarkedTips);
  const progressQuestions = useKonkurProgressStore(s => s.questions);
  const konkurContent = useKonkurContentStore(s => s.content);

  const [academic, setAcademic] = useState<AcademicProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [customGoalText, setCustomGoalText] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  const num = (value: number | string) => localizeDigits(value, isRTL);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchAcademicProfile();
      setAcademic(data);
    } catch {
      // Offline fallback: keep default/local state
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleSelectGoal = async (target: string) => {
    const trimmed = target.trim();
    if (!trimmed) return;
    try {
      setSavingGoal(true);
      const updated = await updateAcademicProfile({ target_goal: trimmed });
      setAcademic(updated);
      setIsEditingGoal(false);
      setCustomGoalText('');
    } catch {
      Alert.alert('خطا', 'امکان ذخیره هدف در حال حاضر وجود ندارد');
    } finally {
      setSavingGoal(false);
    }
  };

  const mistakesCount = useMemo(() => {
    return Object.values(progressQuestions).filter(q => !q.lastCorrect).length;
  }, [progressQuestions]);

  const solvedCount = useMemo(() => {
    return Object.values(progressQuestions).length;
  }, [progressQuestions]);

  const correctCount = useMemo(() => {
    return Object.values(progressQuestions).filter(q => q.lastCorrect).length;
  }, [progressQuestions]);

  const accuracyPercent = solvedCount > 0 ? Math.round((correctCount / solvedCount) * 100) : 78;

  const handleStartRemedialQuiz = () => {
    // Launches a focused exam on trigonometry
    const gradeId = (academic?.grade && [7, 8, 9, 10, 11, 12].includes(academic.grade)
      ? academic.grade
      : 10) as 7 | 8 | 9 | 10 | 11 | 12;
    navigation.navigate('Exam', {
      config: {
        grade: gradeId,
        chapterIds: ['g10_trig'],
        count: 10,
      },
    });
  };

  const targetGoal = academic?.target_goal || 'پزشکی دانشگاه تهران';
  const nickname = academic?.nickname || user?.nickname || 'رضا کریمی';
  const gradeTrackLabel = `حل‌کننده مشتاق • پایه ${num(academic?.grade || 10)} ${
    academic?.track === 'math' ? 'ریاضی و فیزیک' : 'علوم تجربی'
  }`;
  const currentLevel = academic?.level || 14;
  const currentXP = academic?.xp || 2450;
  const nextXP = academic?.next_level_xp || 3000;
  const levelPercent = Math.min(100, Math.max(5, Math.round((currentXP / nextXP) * 100)));

  const streakDays = academic?.streak_days || 12;
  const streakRecord = academic?.streak_record || 18;

  const weekdayItems = useMemo(() => {
    if (academic?.weekly_streak && academic.weekly_streak.length === 7) {
      return academic.weekly_streak.map((item, idx) => ({
        key: `day_${idx}`,
        label: item.day_name,
        done: item.completed,
        special: item.is_today,
        locked: !item.completed && !item.is_today,
      }));
    }
    return WEEKDAYS;
  }, [academic?.weekly_streak]);

  const league = academic?.league || {
    name: 'الماس',
    rank: 5,
    total_in_tier: 100,
    days_left: 3,
    icon: 'diamond',
  };

  const monthlyHours = academic?.monthly_stats?.hours_studied
    ? `${academic.monthly_stats.hours_studied}`
    : '24:30';
  const monthlySolved = academic?.monthly_stats?.solved_count || (solvedCount > 0 ? solvedCount : 428);
  const monthlyAccuracy = academic?.monthly_stats?.accuracy_rate || accuracyPercent;
  const monthlySpeed = academic?.monthly_stats?.avg_speed_sec || 48;

  const topicsList = academic?.topics && academic.topics.length > 0 ? academic.topics : [
    { id: 't1', title: 'محاسبات جبری و اتحادها', book_title: 'ریاضی ۱', progress: 95, color: '#22C55E' },
    { id: 't2', title: 'معادلات و نامعادلات درجه دو', book_title: 'ریاضی ۱', progress: 92, color: '#22C55E' },
    { id: 't3', title: 'توان گویا و عبارات جبری', book_title: 'ریاضی ۱', progress: 88, color: '#0EA5E9' },
    { id: 't4', title: 'مثلثات و روابط دایره مثلثاتی', book_title: 'ریاضی ۱', progress: 65, color: '#EF4444' },
  ];

  const aiInsight = academic?.ai_insights?.[0] || {
    id: 'ai-trig',
    title: 'پیشنهاد هوش مصنوعی مجهول:',
    reason: `${nickname} جان، در آزمون اخیر ۳ تست از نسبت‌های مثلثاتی زاویه‌های مکمل را اشتباه زدی. یک بسته تمرینی ۱۰ تستی متمرکز برای امروز تو چیدیم.`,
    action: 'شروع کوییز جبرانی مثلثات ←',
  };

  const vaultMistakes = academic?.vault?.mistakes_count || (mistakesCount > 0 ? mistakesCount : 34);
  const vaultFavorites = academic?.vault?.favorites_count || (bookmarkedTips.length > 0 ? bookmarkedTips.length : 18);

  const sub = academic?.subscription || {
    is_active: true,
    plan_name: 'مجهول پرو',
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.header, isRTL && styles.rowRTL]}>
        <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => navigation.navigate('Settings')}
            style={styles.headerIconButton}
          >
            <Icon name="settings" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerAvatarMini}>
            <Icon name="person" size={18} color="#FFFFFF" />
          </View>
        </View>

        <AppText weight="bold" size="lg" align="center" style={styles.headerTitle}>
          Profile
        </AppText>

        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.headerIconButton}
        >
          <Icon name="arrow-back" size={20} color={colors.textPrimary} directional />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* User Identity Card */}
        <View style={styles.profileCard}>
          <View style={[styles.profileTopRow, isRTL && styles.rowRTL]}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarCircle}>
                <Icon name="person" size={38} color="#FFFFFF" />
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => setIsEditingGoal(true)}
                style={styles.avatarEditBadge}
              >
                <Icon name="edit" size={12} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={[styles.userInfoColumn, isRTL ? styles.alignRTL : styles.alignLTR]}>
              <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
                <AppText weight="bold" size="md">
                  {nickname}
                </AppText>
                <View style={styles.verifiedCheckBadge}>
                  <Icon name="check" size={12} color="#166534" />
                </View>
              </View>

              <AppText size="xs" color={colors.textSecondary} weight="medium">
                {gradeTrackLabel}
              </AppText>

              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => setIsEditingGoal(true)}
                style={[styles.inlineRow, isRTL && styles.rowRTL, styles.goalBox]}
              >
                <AppText size="xs" color="#1E40AF" weight="medium">
                  🎯 هدف: {targetGoal}
                </AppText>
                <Icon name="edit" size={10} color="#1E40AF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Progress Bar to next level */}
          <View style={styles.levelProgressContainer}>
            <View style={[styles.spaceRow, isRTL && styles.rowRTL]}>
              <AppText size="xs" color={colors.textSecondary} weight="medium">
                پیشرفت تا لول {num(currentLevel + 1)} (استاد جبر)
              </AppText>
              <AppText size="xs" weight="bold" color="#166534">
                {num(levelPercent)}٪
              </AppText>
            </View>
            <View style={styles.levelTrack}>
              <View style={[styles.levelFill, isRTL && styles.fillRTL, { width: `${levelPercent}%` }]} />
            </View>
          </View>
        </View>

        {/* Streak & Consecutive Study Card */}
        <View style={styles.streakCard}>
          <View style={[styles.spaceRow, isRTL && styles.rowRTL]}>
            <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
              <Icon name="local-fire-department" size={24} color="#EA580C" />
              <View style={isRTL ? styles.alignRTL : styles.alignLTR}>
                <AppText weight="bold" size="md">
                  {num(streakDays)} روز مطالعه متوالی
                </AppText>
                <AppText size="xs" color={colors.textSecondary}>
                  رکورد شخصی: {num(streakRecord)} روز
                </AppText>
              </View>
            </View>

            <View style={styles.todayXpPill}>
              <AppText size="xs" weight="bold" color="#166534">
                {num(500)} XP امروز
              </AppText>
            </View>
          </View>

          {/* Weekday check circles */}
          <View style={[styles.weekdayRow, isRTL && styles.rowRTL]}>
            {weekdayItems.map(day => (
              <View key={day.key} style={styles.weekdayItem}>
                <AppText size="xs" color={colors.textSecondary} weight="bold">
                  {day.label}
                </AppText>
                <View
                  style={[
                    styles.dayCircle,
                    day.done && styles.dayCircleDone,
                    day.special && styles.dayCircleSpecial,
                    day.locked && styles.dayCircleLocked,
                  ]}
                >
                  {day.done ? (
                    <Icon name="check" size={14} color="#FFFFFF" />
                  ) : day.locked ? (
                    <Icon name="lock" size={12} color="#9CA3AF" />
                  ) : (
                    <Icon name="radio-button-unchecked" size={14} color="#D1D5DB" />
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Experience & League Row */}
        <View style={[styles.statTwoColumnRow, isRTL && styles.rowRTL]}>
          {/* Card 1: League */}
          <View style={styles.halfCard}>
            <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
              <View style={styles.diamondBadge}>
                <Icon name="diamond" size={16} color="#7C3AED" />
              </View>
              <AppText size="xs" color={colors.textSecondary} weight="medium">
                لیگ {league.name}
              </AppText>
            </View>
            <AppText weight="bold" size="md" style={styles.statLargeValue}>
              رتبه {num(league.rank)} از {num(league.total_in_tier)}
            </AppText>
            <AppText size="xs" color="#16A34A" weight="bold">
              {num(league.days_left)} روز تا ترفیع به لیگ برتر ↑
            </AppText>
          </View>

          {/* Card 2: Total XP */}
          <View style={styles.halfCard}>
            <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
              <View style={styles.lightningBadge}>
                <Icon name="bolt" size={16} color="#16A34A" />
              </View>
              <AppText size="xs" color={colors.textSecondary} weight="medium">
                کل تجربه
              </AppText>
            </View>
            <AppText weight="bold" size="md" style={styles.statLargeValue}>
              {num(currentXP.toLocaleString())} XP
            </AppText>
            <AppText size="xs" color="#D97706" weight="bold">
              {num(academic?.gems || 320)} جم ذخیره 💎
            </AppText>
          </View>
        </View>

        {/* Academic Performance Analysis */}
        <View style={styles.card}>
          <View style={[styles.spaceRow, isRTL && styles.rowRTL]}>
            <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
              <Icon name="insights" size={18} color="#2563EB" />
              <AppText weight="bold" size="md">
                تحلیل عملکرد تحصیلی
              </AppText>
            </View>
            <View style={styles.monthBadge}>
              <AppText size="xs" color="#2563EB" weight="medium">
                این ماه
              </AppText>
            </View>
          </View>

          {/* 2x2 Performance Grid */}
          <View style={styles.perfGrid}>
            <View style={[styles.perfGridRow, isRTL && styles.rowRTL]}>
              <View style={styles.perfBox}>
                <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
                  <Icon name="schedule" size={16} color={colors.textSecondary} />
                  <AppText size="xs" color={colors.textSecondary}>
                    ساعات مطالعه
                  </AppText>
                </View>
                <AppText weight="bold" size="md">
                  {num(monthlyHours)}
                </AppText>
                <AppText size="xs" color={colors.textSecondary}>
                  ساعت مفید
                </AppText>
              </View>

              <View style={styles.perfBox}>
                <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
                  <Icon name="check-circle" size={16} color="#16A34A" />
                  <AppText size="xs" color={colors.textSecondary}>
                    تست‌های حل شده
                  </AppText>
                </View>
                <AppText weight="bold" size="md">
                  {num(monthlySolved)}
                </AppText>
                <AppText size="xs" color="#16A34A" weight="medium">
                  {num(monthlyAccuracy)}٪ پاسخ صحیح
                </AppText>
              </View>
            </View>

            <View style={[styles.perfGridRow, isRTL && styles.rowRTL]}>
              <View style={styles.perfBox}>
                <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
                  <Icon name="speed" size={16} color="#D97706" />
                  <AppText size="xs" color={colors.textSecondary}>
                    سرعت هر تست
                  </AppText>
                </View>
                <AppText weight="bold" size="md">
                  {num(monthlySpeed)} ثانیه
                </AppText>
                <AppText size="xs" color="#D97706" weight="medium">
                  سریع‌تر از {num(72)}٪ رقبا
                </AppText>
              </View>

              <View style={styles.perfBox}>
                <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
                  <Icon name="school" size={16} color="#7C3AED" />
                  <AppText size="xs" color={colors.textSecondary}>
                    تسلط فصل‌ها
                  </AppText>
                </View>
                <AppText weight="bold" size="md">
                  {num(`${topicsList.length} / ${topicsList.length + 4}`)}
                </AppText>
                <AppText size="xs" color="#7C3AED" weight="medium">
                  مبحث تثبیت شده
                </AppText>
              </View>
            </View>
          </View>
        </View>

        {/* Grade 10 Topic Mastery Section */}
        <View style={styles.card}>
          <View style={[styles.spaceRow, isRTL && styles.rowRTL]}>
            <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
              <Icon name="pie-chart" size={18} color="#16A34A" />
              <AppText weight="bold" size="md">
                میزان تسلط بر مباحث پایه {num(academic?.grade || 10)}
              </AppText>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Topics')}>
              <AppText size="xs" color="#2563EB" weight="medium">
                مشاهده ریزنمرات
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Topics Bars */}
          <View style={styles.topicsMasteryWrap}>
            {topicsList.map(topic => (
              <View key={topic.id} style={styles.masteryItem}>
                <View style={[styles.spaceRow, isRTL && styles.rowRTL]}>
                  <AppText size="xs" weight="medium">
                    {topic.title}
                  </AppText>
                  <AppText size="xs" weight="bold" color={topic.color || '#16A34A'}>
                    {num(topic.progress)}٪ • {topic.progress >= 90 ? 'مسلط کامل' : topic.progress >= 80 ? 'مسلط' : 'نیازمند تمرین'}
                  </AppText>
                </View>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      isRTL && styles.fillRTL,
                      { width: `${topic.progress}%`, backgroundColor: topic.color || '#22C55E' },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* AI Recommendation Card */}
        <View style={styles.aiRecommendBox}>
          <View style={[styles.cardHeaderRow, isRTL && styles.rowRTL]}>
            <View style={styles.robotIconCircle}>
              <Icon name="smart-toy" size={18} color="#FFFFFF" />
            </View>
            <AppText weight="bold" size="sm" color="#4338CA">
              {aiInsight.title}
            </AppText>
          </View>
          <AppText size="xs" color="#3730A3" style={styles.aiRecommendText}>
            {aiInsight.reason}
          </AppText>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={handleStartRemedialQuiz}
            style={styles.remedialLimeButton}
          >
            <AppText weight="bold" size="sm" color="#0F1F05">
              {aiInsight.action}
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Learning Archive & Vault */}
        <View style={styles.card}>
          <View style={[styles.cardHeaderRow, isRTL && styles.rowRTL]}>
            <Icon name="inventory-2" size={18} color={colors.textPrimary} />
            <AppText weight="bold" size="md">
              صندوق یادگیری و آرشیو من
            </AppText>
          </View>

          <View style={styles.vaultRowsWrap}>
            {/* Row 1: Mistake Notebook */}
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => navigation.navigate('KonkurNotebook', { tab: 'mistakes' })}
              style={[styles.vaultRow, isRTL && styles.rowRTL]}
            >
              <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
                <View style={[styles.vaultIconBadge, { backgroundColor: '#FEE2E2' }]}>
                  <Icon name="auto-stories" size={18} color="#DC2626" />
                </View>
                <View style={isRTL ? styles.alignRTL : styles.alignLTR}>
                  <AppText weight="bold" size="sm">
                    دفترچه غلط‌های من
                  </AppText>
                  <AppText size="xs" color={colors.textSecondary}>
                    {num(vaultMistakes)} تست برچسب‌خورده در لایتنر
                  </AppText>
                </View>
              </View>
              <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
                <AppText size="xs" color={colors.textSecondary}>
                  مرور
                </AppText>
                <Icon name={isRTL ? 'chevron-left' : 'chevron-right'} size={18} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>

            {/* Row 2: Starred Formulas */}
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => navigation.navigate('FormulaSheet')}
              style={[styles.vaultRow, isRTL && styles.rowRTL]}
            >
              <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
                <View style={[styles.vaultIconBadge, { backgroundColor: '#DCFCE7' }]}>
                  <Icon name="star" size={18} color="#16A34A" />
                </View>
                <View style={isRTL ? styles.alignRTL : styles.alignLTR}>
                  <AppText weight="bold" size="sm">
                    فرمول‌های ستاره‌دار
                  </AppText>
                  <AppText size="xs" color={colors.textSecondary}>
                    {num(vaultFavorites)} رابطه طلایی هندسه و اتحادها
                  </AppText>
                </View>
              </View>
              <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
                <AppText size="xs" color={colors.textSecondary}>
                  مشاهده
                </AppText>
                <Icon name={isRTL ? 'chevron-left' : 'chevron-right'} size={18} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>

            {/* Row 3: Report Cards Archive */}
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => navigation.navigate('KonkurNotebook', { tab: 'stats' })}
              style={[styles.vaultRow, isRTL && styles.rowRTL]}
            >
              <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
                <View style={[styles.vaultIconBadge, { backgroundColor: '#EDE9FE' }]}>
                  <Icon name="assignment" size={18} color="#7C3AED" />
                </View>
                <View style={isRTL ? styles.alignRTL : styles.alignLTR}>
                  <AppText weight="bold" size="sm">
                    کارنامه‌ها و نتایج آزمون
                  </AppText>
                  <AppText size="xs" color={colors.textSecondary}>
                    آرشیو {num(6)} آزمون جامع تستی
                  </AppText>
                </View>
              </View>
              <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
                <AppText size="xs" color={colors.textSecondary}>
                  آرشیو
                </AppText>
                <Icon name={isRTL ? 'chevron-left' : 'chevron-right'} size={18} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>

            {/* Row 4: Downloaded Pamphlets */}
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => Alert.alert('جزوات دانلود شده', 'خلاصه درسنامه‌ها به صورت آفلاین در دسترس هستند.')}
              style={[styles.vaultRow, isRTL && styles.rowRTL]}
            >
              <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
                <View style={[styles.vaultIconBadge, { backgroundColor: '#E0F2FE' }]}>
                  <Icon name="file-download" size={18} color="#0284C7" />
                </View>
                <View style={isRTL ? styles.alignRTL : styles.alignLTR}>
                  <AppText weight="bold" size="sm">
                    جزوات دانلود شده
                  </AppText>
                  <AppText size="xs" color={colors.textSecondary}>
                    خلاصه درسنامه {num(5)} مبحث پرسوال
                  </AppText>
                </View>
              </View>
              <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
                <AppText size="xs" color={colors.textSecondary}>
                  دانلودها
                </AppText>
                <Icon name={isRTL ? 'chevron-left' : 'chevron-right'} size={18} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Majhoul Pro Subscription Card */}
        <View style={styles.proCard}>
          <View style={[styles.spaceRow, isRTL && styles.rowRTL]}>
            <View style={[styles.inlineRow, isRTL && styles.rowRTL]}>
              <View style={styles.proStarBadge}>
                <Icon name="auto-awesome" size={16} color="#76E000" />
              </View>
              <AppText weight="bold" size="sm" color="#FFFFFF">
                اشتراک {sub.plan_name} {sub.is_active ? 'فعال است' : 'غیرفعال'}
              </AppText>
            </View>
            <View style={styles.proExpiryBadge}>
              <AppText size="xs" weight="bold" color="#76E000">
                اعتبار: آبان ۱۴۰۴
              </AppText>
            </View>
          </View>

          <AppText size="xs" color="#94A3B8" style={styles.proDescription}>
            دسترسی نامحدود به تحلیل گام‌به‌گام هوش مصنوعی، آزمون‌ساز تطبیقی و ویدیوهای کنکوری اساتید برتر تا ۳۱۵ روز دیگر برقرار است.
          </AppText>

          <View style={[styles.proActionRow, isRTL && styles.rowRTL]}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => navigation.navigate('Premium')}
              style={styles.proManageButton}
            >
              <AppText size="xs" weight="bold" color="#FFFFFF">
                مدیریت اشتراک و فاکتورها
              </AppText>
            </TouchableOpacity>

            <View style={styles.pdfBadge}>
              <AppText size="xs" weight="bold" color="#0F1F05">
                PDF 4K AI
              </AppText>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Target Goal Edit Modal */}
      <Modal
        visible={isEditingGoal}
        animationType="fade"
        transparent
        onRequestClose={() => setIsEditingGoal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={[styles.spaceRow, isRTL && styles.rowRTL]}>
              <AppText weight="bold" size="md">
                🎯 انتخاب یا تغییر هدف کنکور
              </AppText>
              <TouchableOpacity onPress={() => setIsEditingGoal(false)}>
                <Icon name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <AppText size="xs" color={colors.textSecondary} style={{ marginTop: 6, marginBottom: 12 }}>
              هدف تحصیلی خود را برای برنامه‌ریزی هوشمند انتخاب کن:
            </AppText>

            <View style={styles.presetGoalList}>
              {PRESET_GOALS.map((goal, idx) => (
                <TouchableOpacity
                  key={idx}
                  disabled={savingGoal}
                  onPress={() => handleSelectGoal(goal)}
                  style={[
                    styles.presetGoalItem,
                    targetGoal === goal && styles.presetGoalItemSelected,
                    isRTL && styles.rowRTL,
                  ]}
                >
                  <Icon
                    name={targetGoal === goal ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={16}
                    color={targetGoal === goal ? '#16A34A' : colors.textSecondary}
                  />
                  <AppText
                    size="xs"
                    weight={targetGoal === goal ? 'bold' : 'medium'}
                    color={targetGoal === goal ? '#166534' : colors.textPrimary}
                  >
                    {goal}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.customGoalInputWrap, isRTL && styles.rowRTL]}>
              <TextInput
                value={customGoalText}
                onChangeText={setCustomGoalText}
                placeholder="یا هدف دلخواه خود را بنویس..."
                placeholderTextColor="#94A3B8"
                style={[styles.customGoalInput, isRTL && { textAlign: 'right' }]}
              />
              <TouchableOpacity
                disabled={savingGoal || !customGoalText.trim()}
                onPress={() => handleSelectGoal(customGoalText)}
                style={[
                  styles.saveGoalBtn,
                  (!customGoalText.trim() || savingGoal) && styles.saveGoalBtnDisabled,
                ]}
              >
                <AppText size="xs" weight="bold" color="#0F1F05">
                  ثبت
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Tabs Bar */}
      <AppBottomNav activeTab="Profile" />
    </View>
  );
}

const useStyles = makeStyles(colors =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8FAFC',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#F1F5F9',
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
    headerTitle: {
      flex: 1,
    },
    headerIconButton: {
      width: 36,
      height: 36,
      borderRadius: radius.pill,
      backgroundColor: '#F1F5F9',
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
      marginLeft: 4,
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
    profileCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 24,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: '#F1F5F9',
      gap: spacing.sm,
    },
    profileTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    avatarWrapper: {
      position: 'relative',
    },
    avatarCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#16A34A',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarEditBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#0F1F05',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: '#FFFFFF',
    },
    userInfoColumn: {
      flex: 1,
      gap: 2,
    },
    verifiedCheckBadge: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: '#DCFCE7',
      alignItems: 'center',
      justifyContent: 'center',
    },
    goalBox: {
      marginTop: 2,
    },
    levelProgressContainer: {
      gap: 4,
      marginTop: 4,
    },
    levelTrack: {
      height: 7,
      borderRadius: radius.pill,
      backgroundColor: '#F1F5F9',
      overflow: 'hidden',
    },
    levelFill: {
      height: '100%',
      borderRadius: radius.pill,
      backgroundColor: '#22C55E',
    },
    fillRTL: {
      alignSelf: 'flex-end',
    },
    streakCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 24,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: '#F1F5F9',
      gap: spacing.md,
    },
    todayXpPill: {
      backgroundColor: '#DCFCE7',
      borderRadius: radius.pill,
      paddingVertical: 4,
      paddingHorizontal: 12,
    },
    weekdayRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    weekdayItem: {
      alignItems: 'center',
      gap: 6,
    },
    dayCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F1F5F9',
    },
    dayCircleDone: {
      backgroundColor: '#22C55E',
    },
    dayCircleSpecial: {
      backgroundColor: '#15803D',
    },
    dayCircleLocked: {
      backgroundColor: '#F1F5F9',
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    statTwoColumnRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    halfCard: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: '#F1F5F9',
      gap: 4,
    },
    diamondBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#EDE9FE',
      alignItems: 'center',
      justifyContent: 'center',
    },
    lightningBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#DCFCE7',
      alignItems: 'center',
      justifyContent: 'center',
    },
    statLargeValue: {
      marginVertical: 2,
    },
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 22,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: '#F1F5F9',
      gap: spacing.sm,
    },
    monthBadge: {
      backgroundColor: '#EFF6FF',
      borderRadius: radius.pill,
      paddingVertical: 3,
      paddingHorizontal: 10,
    },
    perfGrid: {
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    perfGridRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    perfBox: {
      flex: 1,
      backgroundColor: '#F8FAFC',
      borderRadius: 16,
      padding: 12,
      gap: 4,
      borderWidth: 1,
      borderColor: '#F1F5F9',
    },
    topicsMasteryWrap: {
      gap: 10,
      marginTop: spacing.xs,
    },
    masteryItem: {
      gap: 4,
    },
    track: {
      height: 6,
      borderRadius: radius.pill,
      backgroundColor: '#F1F5F9',
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: radius.pill,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    aiRecommendBox: {
      backgroundColor: '#EEF2FF',
      borderRadius: 22,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: '#C7D2FE',
      gap: spacing.sm,
    },
    robotIconCircle: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: '#6366F1',
      alignItems: 'center',
      justifyContent: 'center',
    },
    aiRecommendText: {
      lineHeight: 19,
    },
    remedialLimeButton: {
      backgroundColor: '#76E000',
      borderRadius: radius.pill,
      paddingVertical: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    vaultRowsWrap: {
      gap: spacing.xs,
    },
    vaultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 14,
      backgroundColor: '#F8FAFC',
    },
    vaultIconBadge: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    proCard: {
      backgroundColor: '#0F172A',
      borderRadius: 22,
      padding: spacing.md,
      gap: spacing.sm,
    },
    proStarBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#1E293B',
      alignItems: 'center',
      justifyContent: 'center',
    },
    proExpiryBadge: {
      backgroundColor: '#1E293B',
      borderRadius: radius.pill,
      paddingVertical: 3,
      paddingHorizontal: 10,
    },
    proDescription: {
      lineHeight: 18,
    },
    proActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    proManageButton: {
      backgroundColor: '#1E293B',
      borderRadius: radius.pill,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    pdfBadge: {
      backgroundColor: '#76E000',
      borderRadius: radius.pill,
      paddingVertical: 6,
      paddingHorizontal: 14,
    },
    bottomTabs: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#F1F5F9',
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    tabItem: {
      alignItems: 'center',
      gap: 3,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    modalBox: {
      backgroundColor: '#FFFFFF',
      borderRadius: 24,
      padding: spacing.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 8,
    },
    presetGoalList: {
      gap: 8,
      marginBottom: 16,
    },
    presetGoalItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#F1F5F9',
    },
    presetGoalItemSelected: {
      backgroundColor: '#F0FDF4',
      borderColor: '#86EFAC',
    },
    customGoalInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#F1F5F9',
      borderRadius: radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    customGoalInput: {
      flex: 1,
      fontSize: 13,
      color: '#0F172A',
      paddingVertical: 6,
    },
    saveGoalBtn: {
      backgroundColor: '#76E000',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: radius.pill,
    },
    saveGoalBtnDisabled: {
      opacity: 0.4,
    },
  }),
);
