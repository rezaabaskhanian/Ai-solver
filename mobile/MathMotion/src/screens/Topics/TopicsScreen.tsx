import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { Icon } from '../../components/common/Icon';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { CurriculumChapterCard } from '../../components/Topics/CurriculumChapterCard';
import { booksForTrack, CURRICULUM_GRADES, findCurriculumGrade } from '../../content/curriculum';
import { TOPICS } from '../../content/topics';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { usePreferencesStore, useTrack } from '../../store/usePreferencesStore';
import { makeStyles, radius, spacing, useColors } from '../../theme';

// «مباحث درسی»: "all topics" (the app's own subject list) or one school
// grade's official textbook chapters (content/curriculum.ts). The chosen
// grade is remembered (usePreferencesStore) and also seeds Exam setup.
export function TopicsScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isRTL = useIsRTL();
  const grade = usePreferencesStore(s => s.grade);
  const setGrade = usePreferencesStore(s => s.setGrade);
  const track = useTrack();
  const curriculum = grade ? findCurriculumGrade(grade) : undefined;
  const books = curriculum ? booksForTrack(curriculum, track) : [];

  const tabs: { key: string; label: string; value: typeof grade }[] = [
    { key: 'all', label: t('topics.allTopics'), value: null },
    ...CURRICULUM_GRADES.map(g => ({ key: String(g), label: t('topics.gradeChip', { grade: g }), value: g })),
  ];

  return (
    <ScreenContainer scroll>
      {/* Not mirrored in RTL: a reversed horizontal ScrollView would open
          scrolled to the wrong end. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
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
              <AppText size="sm" weight="medium" color={active ? colors.onPrimary : colors.textPrimary}>
                {tab.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {curriculum ? (
        <>
          <AppText size="sm" color={colors.textSecondary}>
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
                <Icon name="auto-stories" color={colors.primaryText} />
                <View style={styles.flexOne}>
                  <AppText weight="bold" size="lg">
                    {book.title}
                  </AppText>
                  {book.track ? (
                    <AppText size="xs" color={colors.textSecondary}>
                      {book.track}
                    </AppText>
                  ) : null}
                </View>
              </View>
              {chapters.map(({ chapter, number }) => (
                <CurriculumChapterCard key={chapter.id} grade={curriculum.grade} number={number} chapter={chapter} />
              ))}
            </View>
          ))}
          {curriculum.grade >= 10 && (
            <AppText size="xs" color={colors.textSecondary}>
              {t(track === 'tajrobi' ? 'track.comingSoon' : 'topics.tracksNote')}
            </AppText>
          )}
        </>
      ) : (
        <>
          <AppText color={colors.textSecondary}>{t('topics.intro')}</AppText>
          <View style={styles.list}>
            {TOPICS.map(item => (
              <Card
                key={item.id}
                onPress={() => navigation.navigate('Topic', { topicId: item.id })}
                style={[styles.card, isRTL && styles.rowRTL]}
              >
                <View style={styles.iconWrap}>
                  <Icon name={item.icon} color={colors.primaryText} />
                </View>
                <View style={styles.text}>
                  <AppText weight="bold">{t(`topics.${item.id}.title`)}</AppText>
                  <AppText size="sm" color={colors.textSecondary} numberOfLines={2}>
                    {t(`topics.${item.id}.summary`)}
                  </AppText>
                </View>
                <Icon name="chevron-right" color={colors.textSecondary} directional />
              </Card>
            ))}
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  tabs: {
    gap: spacing.sm,
  },
  tab: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  flexOne: {
    flex: 1,
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
  list: {
    gap: spacing.sm,
  },
  soon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
}));
