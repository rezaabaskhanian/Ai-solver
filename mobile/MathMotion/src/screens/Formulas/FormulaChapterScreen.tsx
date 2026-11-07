import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { Icon } from '../../components/common/Icon';
import { KonkurLines } from '../../components/Konkur/KonkurLines';
import { findFormulaChapter } from '../../content/formulas';
import { tipsForChapter } from '../../content/konkur';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { useTrackKonkurContent } from '../../store/useKonkurContentStore';
import { useKonkurStudyStore } from '../../store/useKonkurStudyStore';
import { fontFamily, fontSize, makeStyles, radius, spacing, useColors } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'FormulaChapter'>;

export function FormulaChapterScreen({ route, navigation }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const { chapterId } = route.params;
  const ref = findFormulaChapter(chapterId);
  const content = useTrackKonkurContent();
  const marked = useKonkurStudyStore(s => s.formulaBookmarks.includes(chapterId));
  const toggle = useKonkurStudyStore(s => s.toggleFormulaBookmark);

  const [activeTab, setActiveTab] = useState<'all' | string>('all');

  if (!ref) {
    return null;
  }

  const tips = tipsForChapter(chapterId, content);
  const isEquationChapter = chapterId === 'g10_equations' || chapterId === 'g11c_algebra';

  const filterTabs = [
    { id: 'all', label: `همه فرمول‌ها (${ref.formulas.items.length})` },
    ...(isEquationChapter
      ? [
          { id: 'quadratic', label: 'معادلات درجه ۲' },
          { id: 'vieta', label: 'روابط ویت' },
          { id: 'tips', label: 'نکات تستی' },
        ]
      : ref.formulas.items.slice(0, 3).map((item, idx) => ({ id: `f-${idx}`, label: item.caption }))),
  ];

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
            برگه‌ی فرمول
          </AppText>
          <View style={[styles.titleWithDot, isRTL && styles.rowRTL]}>
            <View style={styles.greenDot} />
            <AppText size="xs" color="#6B7280">
              {ref.bookTitle} / ریاضی
            </AppText>
          </View>
        </View>

        <View style={[styles.headerActions, isRTL && styles.rowRTL]}>
          <Pressable
            accessibilityRole="button"
            onPress={() => toggle(chapterId)}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          >
            <Icon name={marked ? 'star' : 'star-border'} size={22} color={marked ? '#F59E0B' : '#9CA3AF'} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {}}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          >
            <Icon name="file-download" size={22} color="#374151" />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Intro subtitle */}
        <AppText size="xs" color="#6B7280" style={styles.introText}>
          فرمول‌های مهم هر فصل کتاب درسی، برای مرور سریع قبل از امتحان و آزمون‌های آزمایشی سنجش و کنکور.
        </AppText>

        {/* Chapter Selection Card */}
        <Card style={styles.chapterCard}>
          <View style={[styles.chapterCardRow, isRTL && styles.rowRTL]}>
            <View style={styles.sigmaIconBox}>
              <AppText size="xl" weight="bold" color="#15803D">
                Σ
              </AppText>
            </View>

            <View style={styles.chapterInfoCol}>
              <View style={[styles.gradeBadge, isRTL && styles.rowRTL]}>
                <AppText size="xs" weight="medium" color="#15803D">
                  {`پایه ${ref.grade} • ${ref.bookTitle}`}
                </AppText>
              </View>
              <AppText weight="bold" size="md" color="#111827">
                {ref.chapter.title}
              </AppText>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('FormulaSheet')}
              style={({ pressed }) => [styles.changeChapterBtn, pressed && styles.pressed]}
            >
              <AppText size="xs" color="#374151" weight="medium">
                تغییر فصل
              </AppText>
            </Pressable>
          </View>
        </Card>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filterPillsRow, isRTL && styles.pillsRTL]}
        >
          {filterTabs.map(tab => {
            const active = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                accessibilityRole="button"
                onPress={() => setActiveTab(tab.id)}
                style={[styles.filterPill, active && styles.filterPillActive]}
              >
                <AppText
                  size="xs"
                  weight={active ? 'bold' : 'medium'}
                  color={active ? '#0F1F05' : '#4B5563'}
                >
                  {tab.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* High-Fidelity Cards for Equations / Delta Chapter */}
        {isEquationChapter && (activeTab === 'all' || activeTab === 'quadratic') && (
          <>
            {/* Card 1: دلتا و تعیین وضعیت ریشه‌ها */}
            <View style={styles.formulaCard}>
              <View style={[styles.cardHeaderRow, isRTL && styles.rowRTL]}>
                <View style={styles.greenBullet} />
                <AppText weight="bold" size="sm" color="#111827">
                  دلتا و تعیین وضعیت ریشه‌ها
                </AppText>
              </View>

              <View style={styles.mathBox}>
                <AppText size="sm" weight="bold" color="#111827" align="center">
                  ax² + bx + c = 0 | Δ = b² - 4ac
                </AppText>
              </View>

              {/* Conditions Table */}
              <View style={styles.conditionsTable}>
                <View style={[styles.conditionRow, isRTL && styles.rowRTL]}>
                  <AppText size="xs" color="#374151">
                    دو ریشه حقیقی متمایز
                  </AppText>
                  <View style={[styles.statusTag, styles.tagGreen]}>
                    <AppText size="xs" weight="bold" color="#15803D">
                      Δ &gt; 0
                    </AppText>
                  </View>
                </View>

                <View style={[styles.conditionRow, isRTL && styles.rowRTL]}>
                  <AppText size="xs" color="#374151">
                    ریشه مضاعف (یک ریشه): x = -b/2a
                  </AppText>
                  <View style={[styles.statusTag, styles.tagAmber]}>
                    <AppText size="xs" weight="bold" color="#B45309">
                      Δ = 0
                    </AppText>
                  </View>
                </View>

                <View style={[styles.conditionRow, isRTL && styles.rowRTL]}>
                  <AppText size="xs" color="#374151">
                    فاقد ریشه حقیقی در ℝ
                  </AppText>
                  <View style={[styles.statusTag, styles.tagRed]}>
                    <AppText size="xs" weight="bold" color="#DC2626">
                      Δ &lt; 0
                    </AppText>
                  </View>
                </View>
              </View>
            </View>

            {/* Card 2: فرمول کلی ریشه‌ها */}
            <View style={styles.formulaCard}>
              <View style={[styles.cardHeaderRow, isRTL && styles.rowRTL]}>
                <View style={styles.greenBullet} />
                <AppText weight="bold" size="sm" color="#111827">
                  فرمول کلی ریشه‌ها
                </AppText>
              </View>

              <View style={styles.mathBox}>
                <AppText size="md" weight="bold" color="#111827" align="center">
                  x = (-b ± √Δ) / (2a)
                </AppText>
              </View>

              <View style={styles.tipCallout}>
                <Icon name="lightbulb" size={16} color="#B45309" />
                <AppText size="xs" color="#92400E" style={styles.tipText}>
                  نکته تستی: اگر b زوج باشد، استفاده از دلتا پریم (Δ&apos; = (b/2)² - ac) محاسبات را بسیار سریع‌تر می‌کند.
                </AppText>
              </View>
            </View>
          </>
        )}

        {/* Card 3: روابط ویت */}
        {isEquationChapter && (activeTab === 'all' || activeTab === 'vieta') && (
          <View style={styles.formulaCard}>
            <View style={[styles.cardHeaderRow, isRTL && styles.rowRTL]}>
              <View style={[styles.headerTitleWrap, isRTL && styles.rowRTL]}>
                <View style={styles.greenBullet} />
                <AppText weight="bold" size="sm" color="#111827">
                  مجموع و حاصل‌ضرب ریشه‌ها (روابط ویت)
                </AppText>
              </View>
              <View style={styles.frequentBadge}>
                <AppText size="xs" weight="bold" color="#0369A1">
                  بسیار پرتکرار
                </AppText>
              </View>
            </View>

            <View style={[styles.twoColBox, isRTL && styles.rowRTL]}>
              <View style={styles.colBox}>
                <AppText size="xs" color="#6B7280" align="center">
                  ضرب ریشه‌ها (P)
                </AppText>
                <AppText size="sm" weight="bold" color="#111827" align="center">
                  P = x₁ · x₂ = c/a
                </AppText>
              </View>

              <View style={styles.colBox}>
                <AppText size="xs" color="#6B7280" align="center">
                  مجموع ریشه‌ها (S)
                </AppText>
                <AppText size="sm" weight="bold" color="#111827" align="center">
                  S = x₁ + x₂ = -b/a
                </AppText>
              </View>
            </View>

            <View style={styles.formationBox}>
              <AppText size="xs" color="#374151" align="center">
                تشکیل معادله با داشتن S و P:
              </AppText>
              <AppText size="sm" weight="bold" color="#111827" align="center">
                x² - Sx + P = 0
              </AppText>
            </View>
          </View>
        )}

        {/* Card 4: روابط متقارن پرکاربرد در تست‌ها */}
        {isEquationChapter && (activeTab === 'all' || activeTab === 'tips') && (
          <View style={styles.formulaCard}>
            <View style={[styles.cardHeaderRow, isRTL && styles.rowRTL]}>
              <View style={styles.greenBullet} />
              <AppText weight="bold" size="sm" color="#111827">
                روابط متقارن پرکاربرد در تست‌ها
              </AppText>
            </View>

            <View style={styles.symmetricRows}>
              <View style={[styles.symmetricRow, isRTL && styles.rowRTL]}>
                <AppText size="sm" weight="bold" color="#111827">
                  x₁² + x₂² = S² - 2P
                </AppText>
                <AppText size="xs" color="#6B7280">
                  مجموع توان دو ریشه‌ها:
                </AppText>
              </View>

              <View style={[styles.symmetricRow, isRTL && styles.rowRTL]}>
                <AppText size="sm" weight="bold" color="#111827">
                  |x₁ - x₂| = √Δ / |a|
                </AppText>
                <AppText size="xs" color="#6B7280">
                  قدرمطلق تفاضل ریشه‌ها:
                </AppText>
              </View>

              <View style={[styles.symmetricRow, isRTL && styles.rowRTL]}>
                <AppText size="sm" weight="bold" color="#111827">
                  1/x₁ + 1/x₂ = S / P
                </AppText>
                <AppText size="xs" color="#6B7280">
                  مجموع معکوس ریشه‌ها:
                </AppText>
              </View>
            </View>
          </View>
        )}

        {/* Fallback / Other Chapters Cards */}
        {!isEquationChapter &&
          ref.formulas.items.map((item, i) => (
            <View key={i} style={styles.formulaCard}>
              <View style={[styles.cardHeaderRow, isRTL && styles.rowRTL]}>
                <View style={styles.greenBullet} />
                <AppText weight="bold" size="sm" color="#111827">
                  {item.caption}
                </AppText>
              </View>
              <View style={styles.mathBox}>
                <KonkurLines lines={item.lines} />
              </View>
            </View>
          ))}
      </ScrollView>

      {/* Floating Bottom Action Bar */}
      <View style={[styles.bottomFloatingBar, { paddingBottom: insets.bottom + spacing.xs }, isRTL && styles.rowRTL]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (tips.length > 0) {
              navigation.navigate('KonkurTip', { tipId: tips[0].id });
            } else {
              navigation.navigate('ExamSetup');
            }
          }}
          style={({ pressed }) => [styles.examCtaButton, pressed && styles.pressed, isRTL && styles.rowRTL]}
        >
          <Icon name="check-circle" size={18} color="#FFFFFF" />
          <AppText size="sm" weight="bold" color="#FFFFFF">
            تست‌های این فرمول‌ها (۱۲ تست)
          </AppText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => toggle(chapterId)}
          style={({ pressed }) => [styles.secondarySquareBtn, pressed && styles.pressed]}
        >
          <Icon name={marked ? 'bookmark' : 'bookmark-border'} size={22} color="#0D9488" />
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
    },
    titleWithDot: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    greenDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#76E000',
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
    introText: {
      lineHeight: 18,
      textAlign: 'center',
      paddingHorizontal: spacing.xs,
    },
    chapterCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#EEF0F4',
      padding: spacing.md,
    },
    chapterCardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    sigmaIconBox: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: '#DCFCE7',
      alignItems: 'center',
      justifyContent: 'center',
    },
    chapterInfoCol: {
      flex: 1,
      gap: 2,
    },
    gradeBadge: {
      alignSelf: 'flex-start',
      backgroundColor: '#DCFCE7',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    changeChapterBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
    },
    filterPillsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    pillsRTL: {
      flexDirection: 'row-reverse',
    },
    filterPill: {
      minHeight: 34,
      paddingHorizontal: 12,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterPillActive: {
      backgroundColor: '#76E000',
      borderColor: '#76E000',
    },
    formulaCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#EEF0F4',
      padding: spacing.md,
      gap: spacing.sm,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
    },
    headerTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    greenBullet: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: '#16A34A',
    },
    frequentBadge: {
      backgroundColor: '#E0F2FE',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    mathBox: {
      backgroundColor: '#F9FAFB',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#F3F4F6',
      padding: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    conditionsTable: {
      borderTopWidth: 1,
      borderTopColor: '#F3F4F6',
      paddingTop: spacing.xs,
      gap: spacing.xs,
    },
    conditionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    statusTag: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    tagGreen: {
      backgroundColor: '#DCFCE7',
    },
    tagAmber: {
      backgroundColor: '#FEF3C7',
    },
    tagRed: {
      backgroundColor: '#FEE2E2',
    },
    tipCallout: {
      backgroundColor: '#FEFCE8',
      borderWidth: 1,
      borderColor: '#FEF08A',
      borderRadius: 10,
      padding: spacing.sm,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.xs,
    },
    tipText: {
      flex: 1,
      lineHeight: 18,
    },
    twoColBox: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    colBox: {
      flex: 1,
      backgroundColor: '#F9FAFB',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#F3F4F6',
      padding: spacing.sm,
      gap: 2,
    },
    formationBox: {
      backgroundColor: '#F9FAFB',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#F3F4F6',
      padding: spacing.sm,
      gap: 2,
    },
    symmetricRows: {
      gap: spacing.sm,
    },
    symmetricRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
      borderBottomWidth: 1,
      borderBottomColor: '#F9FAFB',
    },
    bottomFloatingBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    examCtaButton: {
      flex: 1,
      height: 48,
      borderRadius: 14,
      backgroundColor: '#0D9488',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      shadowColor: '#0D9488',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 3,
    },
    secondarySquareBtn: {
      width: 48,
      height: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#CCFBF1',
      backgroundColor: '#F0FDFA',
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowRTL: {
      flexDirection: 'row-reverse',
    },
    pressed: {
      opacity: 0.75,
    },
  }),
);
