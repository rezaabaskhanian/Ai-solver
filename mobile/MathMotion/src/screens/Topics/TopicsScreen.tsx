import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/common/AppText';
import { AppBottomNav } from '../../components/common/AppBottomNav';
import { Card } from '../../components/common/Card';
import { Icon, type IconName } from '../../components/common/Icon';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { CurriculumChapterCard } from '../../components/Topics/CurriculumChapterCard';
import { booksForTrack, CURRICULUM_GRADES, findCurriculumGrade } from '../../content/curriculum';
import { TOPICS, type TopicId } from '../../content/topics';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { usePreferencesStore, useTrack } from '../../store/usePreferencesStore';
import { refreshTextbook } from '../../store/useTextbookStore';
import { fontFamily, fontSize, makeStyles, radius, spacing, useColors } from '../../theme';

interface TopicMeta {
  title: string;
  summary: string;
  meta: string;
  badge?: { label: string; tone: 'success' | 'warning' };
  customIcon?: IconName;
}

const TOPIC_CUSTOM_DATA: Record<string, TopicMeta> = {
  arithmetic: {
    title: 'محاسبات عددی',
    summary: 'جمع، تفریق، ضرب، تقسیم و ترتیب انجام...',
    meta: '۶ درسنامه کوتاه • ۲۴ تست مفهومی',
    badge: { label: 'تکمیل شده', tone: 'success' },
    customIcon: 'calculate',
  },
  fractions: {
    title: 'کسرها و اعداد گویا',
    summary: 'جمع، تفریق، ضرب و ساده کردن انواع کسرها',
    meta: '۴ درسنامه • ۱۸ نمونه سؤال',
    customIcon: 'pie-chart',
  },
  powers: {
    title: 'توان‌ها و رادیکال‌ها',
    summary: 'قوانین توان: ضرب، تقسیم، توان منفی و جذر',
    meta: '۵ درسنامه • ۳۰ تست تثبیت',
    customIcon: 'superscript',
  },
  expressions: {
    title: 'ساده‌کردن عبارت‌های جبری',
    summary: 'باز کردن پرانتز، اتحادها، فاکتورگیری و متغیرها',
    meta: '۷ درسنامه • ۱۵ تمرین تشریحی',
    customIcon: 'edit-note',
  },
  linear: {
    title: 'معادله‌ی درجه‌یک',
    summary: 'پیدا کردن مجهول با انتقال طرفین و تعادل...',
    meta: '۳ درسنامه • ۲۱ تست ۴ گزینه‌ای',
    customIcon: 'balance',
  },
  quadratic: {
    title: 'معادله‌ی درجه‌دو',
    summary: 'حل با تجزیه، روش مربع کامل و فرمول دلتا (Δ)',
    meta: '۵ درسنامه • ۲۸ تست تشریحی و تستی',
    customIcon: 'show-chart',
  },
  trig: {
    title: 'مثلثات و دایره مثلثاتی',
    summary: 'سینوس، کسینوس، تانژانت و فرمول‌های تبدیل...',
    meta: '۸ درسنامه ویدیویی • ۴۰ تست برگزیده',
    badge: { label: 'ویژه کنکور', tone: 'warning' },
    customIcon: 'change-history',
  },
};

export function TopicsScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const isRTL = useIsRTL();
  const grade = usePreferencesStore(s => s.grade);
  const setGrade = usePreferencesStore(s => s.setGrade);
  const track = useTrack();
  const curriculum = grade ? findCurriculumGrade(grade) : undefined;
  const books = curriculum ? booksForTrack(curriculum, track) : [];

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    refreshTextbook();
  }, []);

  const tabs: { key: string; label: string; value: typeof grade }[] = [
    { key: 'all', label: 'همه مباحث', value: null },
    ...CURRICULUM_GRADES.map(g => ({ key: String(g), label: `پایه ${g}`, value: g })),
  ];

  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return TOPICS;
    const q = searchQuery.trim().toLowerCase();
    return TOPICS.filter(item => {
      const custom = TOPIC_CUSTOM_DATA[item.id];
      const title = custom?.title ?? t(`topics.${item.id}.title`);
      const summary = custom?.summary ?? t(`topics.${item.id}.summary`);
      return title.toLowerCase().includes(q) || summary.toLowerCase().includes(q);
    });
  }, [searchQuery, t]);

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
          <View style={[styles.titleWithDot, isRTL && styles.rowRTL]}>
            <View style={styles.greenDot} />
            <AppText weight="bold" size="lg" color="#111827">
              {t('topics.title', { defaultValue: 'مباحث درسی' })}
            </AppText>
          </View>
          <AppText size="xs" color="#6B7280">
            {t('topics.subtitle', { defaultValue: 'ریاضیات دوره متوسطه' })}
          </AppText>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => {}}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        >
          <Icon name="search" size={22} color="#374151" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Grade Chips Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.tabs, isRTL && styles.tabsRTL]}
        >
          {tabs.map(tab => {
            const active = tab.value === grade;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setGrade(tab.value)}
                style={[styles.tab, active && styles.tabActive]}
              >
                {active && <View style={styles.activeTabDot} />}
                <AppText
                  size="sm"
                  weight={active ? 'bold' : 'medium'}
                  color={active ? '#0F1F05' : '#4B5563'}
                >
                  {tab.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Search Bar */}
        <View style={[styles.searchBox, isRTL && styles.rowRTL]}>
          <Icon name="search" size={20} color="#9CA3AF" />
          <TextInput
            placeholder="جستجو در سرفصل‌ها، فرمول‌ها یا تمرین‌ها..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, isRTL && styles.textRTL]}
          />
        </View>

        {/* Learning Path Banner */}
        <View style={styles.bannerCard}>
          <View style={[styles.bannerHeader, isRTL && styles.rowRTL]}>
            <View style={styles.bannerIconCircle}>
              <Icon name="priority-high" size={14} color="#15803D" />
            </View>
            <AppText weight="bold" size="sm" color="#166534">
              مسیر یادگیری هوشمند مجهول
            </AppText>
          </View>
          <AppText size="xs" color="#15803D" style={styles.bannerText}>
            یک مبحث را انتخاب کن تا درسنامه کوتاه، راه‌حل‌های تستی و تمرین‌های تشریحی را ببینی.
          </AppText>
        </View>

        {/* Content Section */}
        {curriculum ? (
          <View style={styles.curriculumSection}>
            <AppText size="sm" color="#6B7280">
              {t('topics.gradeIntro')}
            </AppText>
            {books.length === 0 && (
              <Card style={styles.soon}>
                <Icon name="hourglass-empty" color={colors.primaryText} />
                <AppText style={styles.flexOne} color={colors.textSecondary}>
                  {t('track.comingSoon')}
                </AppText>
              </Card>
            )}
            {books.map(({ book, chapters }) => (
              <View key={book.id} style={styles.book}>
                <View style={[styles.bookHeader, isRTL && styles.rowRTL]}>
                  <Icon name="auto-stories" color="#16A34A" />
                  <View style={styles.flexOne}>
                    <AppText weight="bold" size="lg">
                      {book.title}
                    </AppText>
                    {book.track ? (
                      <AppText size="xs" color="#6B7280">
                        {book.track}
                      </AppText>
                    ) : null}
                  </View>
                </View>
                {chapters.map(({ chapter, number }) => (
                  <CurriculumChapterCard
                    key={chapter.id}
                    grade={curriculum.grade}
                    number={number}
                    chapter={chapter}
                  />
                ))}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.topicList}>
            {filteredTopics.map(item => {
              const custom = TOPIC_CUSTOM_DATA[item.id];
              const title = custom?.title ?? t(`topics.${item.id}.title`);
              const summary = custom?.summary ?? t(`topics.${item.id}.summary`);
              const meta = custom?.meta ?? 'درسنامه‌ها و تمرین‌های تشریحی';
              const badge = custom?.badge;
              const iconName = custom?.customIcon ?? item.icon;

              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('Topic', { topicId: item.id })}
                  style={({ pressed }) => [styles.topicCard, pressed && styles.pressed, isRTL && styles.rowRTL]}
                >
                  <View style={styles.topicIconContainer}>
                    <Icon name={iconName} size={22} color="#15803D" />
                  </View>

                  <View style={styles.topicCenterCol}>
                    <View style={[styles.topicTitleRow, isRTL && styles.rowRTL]}>
                      <AppText weight="bold" size="md" color="#111827">
                        {title}
                      </AppText>
                      {badge && (
                        <View
                          style={[
                            styles.topicBadge,
                            badge.tone === 'warning' ? styles.topicBadgeWarning : styles.topicBadgeSuccess,
                          ]}
                        >
                          <AppText
                            size="xs"
                            weight="bold"
                            color={badge.tone === 'warning' ? '#B45309' : '#15803D'}
                          >
                            {badge.label}
                          </AppText>
                        </View>
                      )}
                    </View>
                    <AppText size="xs" color="#6B7280" numberOfLines={1}>
                      {summary}
                    </AppText>
                    <AppText size="xs" color="#9CA3AF" style={styles.metaLine}>
                      {meta}
                    </AppText>
                  </View>

                  <Icon name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color="#9CA3AF" />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <AppBottomNav activeTab="Topics" />
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
    },
    titleWithDot: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    greenDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: '#76E000',
    },
    scrollContent: {
      padding: spacing.md,
      gap: spacing.md,
      paddingBottom: 90,
    },
    tabs: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    tabsRTL: {
      flexDirection: 'row-reverse',
    },
    tab: {
      minHeight: 38,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
    },
    tabActive: {
      backgroundColor: '#76E000',
      borderColor: '#76E000',
      shadowColor: '#76E000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 2,
    },
    activeTabDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#0F1F05',
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 14,
      paddingHorizontal: spacing.md,
      height: 48,
    },
    searchInput: {
      flex: 1,
      fontFamily: fontFamily.fa.regular,
      fontSize: fontSize.xs,
      color: '#111827',
      textAlign: 'right',
      paddingVertical: 0,
    },
    textRTL: {
      textAlign: 'right',
    },
    bannerCard: {
      backgroundColor: '#F0FDF4',
      borderWidth: 1,
      borderColor: '#BBF7D0',
      borderRadius: 16,
      padding: spacing.md,
      gap: 6,
    },
    bannerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    bannerIconCircle: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: '#DCFCE7',
      alignItems: 'center',
      justifyContent: 'center',
    },
    bannerText: {
      lineHeight: 18,
    },
    topicList: {
      gap: spacing.sm,
    },
    topicCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#EEF0F4',
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1,
    },
    topicIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: '#DCFCE7',
      alignItems: 'center',
      justifyContent: 'center',
    },
    topicCenterCol: {
      flex: 1,
      gap: 2,
    },
    topicTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    topicBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    topicBadgeSuccess: {
      backgroundColor: '#DCFCE7',
    },
    topicBadgeWarning: {
      backgroundColor: '#FEF3C7',
    },
    metaLine: {
      marginTop: 2,
    },
    curriculumSection: {
      gap: spacing.md,
    },
    book: {
      gap: spacing.sm,
    },
    bookHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    flexOne: {
      flex: 1,
    },
    rowRTL: {
      flexDirection: 'row-reverse',
    },
    soon: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
    },
    pressed: {
      opacity: 0.75,
    },
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 64,
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingHorizontal: spacing.md,
    },
    navItem: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      minWidth: 50,
    },
    activePill: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#76E000',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#76E000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.35,
      shadowRadius: 4,
      elevation: 2,
    },
  }),
);
