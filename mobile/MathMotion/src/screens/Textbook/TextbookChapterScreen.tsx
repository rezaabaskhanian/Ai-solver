import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useLayoutEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../../components/common/AppText';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { Icon } from '../../components/common/Icon';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { toPersianDigits } from '../../content/konkur';
import {
  exercisesForChapter,
  findChapter,
  groupByLesson,
  isExerciseFree,
  type TextbookExercise,
} from '../../content/textbook';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { useEntitlementStore } from '../../store/useEntitlementStore';
import { refreshTextbook, useTextbookProgressStore, useTextbookStore } from '../../store/useTextbookStore';
import { makeStyles, radius, spacing, useColors } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'TextbookChapter'>;

// One textbook chapter's exercises, grouped by lesson, in book order. The
// first lesson is free; the rest open with Premium (a lock otherwise).
export function TextbookChapterScreen({ route, navigation }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const { chapterId } = route.params;
  const location = findChapter(chapterId);
  const all = useTextbookStore(s => s.exercises);
  const status = useTextbookStore(s => s.status);
  const done = useTextbookProgressStore(s => s.done);
  const isPremium = useEntitlementStore(s => s.isPremium);

  const exercises = useMemo(() => exercisesForChapter(all, chapterId), [all, chapterId]);
  const groups = useMemo(() => groupByLesson(exercises, location?.chapter), [exercises, location]);
  const doneCount = exercises.filter(e => done[e.id]).length;

  useLayoutEffect(() => {
    if (location) {
      navigation.setOptions({ title: location.chapter.title });
    }
  }, [navigation, location]);

  useEffect(() => {
    refreshTextbook();
  }, []);

  const open = (e: TextbookExercise) => {
    if (!isPremium && !isExerciseFree(e, location?.chapter)) {
      navigation.navigate('Premium');
      return;
    }
    navigation.navigate('TextbookExercise', { exerciseId: e.id });
  };

  if (exercises.length === 0) {
    return (
      <ScreenContainer>
        {status === 'loading' || status === 'idle' ? (
          <ActivityIndicator color={colors.primaryText} style={styles.loader} />
        ) : (
          <EmptyState
            icon={status === 'error' ? 'cloud-off' : 'menu-book'}
            title={t(status === 'error' ? 'textbook.offlineTitle' : 'textbook.emptyTitle')}
            body={t(status === 'error' ? 'textbook.offlineBody' : 'textbook.emptyBody')}
            actionLabel={status === 'error' ? t('textbook.retry') : undefined}
            onAction={status === 'error' ? () => refreshTextbook(true) : undefined}
          />
        )}
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      {location && (
        <Card style={styles.header}>
          <AppText size="sm" color={colors.textSecondary}>
            {t('textbook.chapterOf', {
              book: location.book.title,
              n: toPersianDigits(location.number),
            })}
          </AppText>
          <AppText weight="bold" size="lg">
            {location.chapter.title}
          </AppText>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                isRTL && styles.fillRTL,
                { width: `${Math.round((doneCount / exercises.length) * 100)}%` },
              ]}
            />
          </View>
          <AppText size="xs" color={colors.textSecondary}>
            {t('textbook.progress', {
              done: toPersianDigits(doneCount),
              total: toPersianDigits(exercises.length),
            })}
          </AppText>
        </Card>
      )}

      {groups.map(group => (
        <View key={group.lesson} style={styles.group}>
          <View style={[styles.groupHeader, isRTL && styles.rowRTL]}>
            <AppText weight="bold">
              {group.lesson > 0
                ? t('textbook.lessonTitle', { n: toPersianDigits(group.lesson), title: group.title ?? '' })
                : t('textbook.otherExercises')}
            </AppText>
            {group.lesson === 1 && !isPremium && <Badge label={t('textbook.free')} tone="success" />}
          </View>
          {group.exercises.map(e => {
            const locked = !isPremium && !isExerciseFree(e, location?.chapter);
            const preview = e.text.find((l): l is string => typeof l === 'string') ?? e.parts?.[0]?.label ?? '';
            return (
              <Pressable
                key={e.id}
                accessibilityRole="button"
                accessibilityLabel={`${t(`textbook.section.${e.section}`)} ${e.number}`}
                onPress={() => open(e)}
                style={({ pressed }) => [styles.row, isRTL && styles.rowRTL, pressed && styles.pressed]}
              >
                <View style={[styles.number, done[e.id] && styles.numberDone]}>
                  {done[e.id] ? (
                    <Icon name="check" size={18} color={colors.onPrimary} />
                  ) : (
                    <AppText weight="bold" color={colors.primaryText}>
                      {toPersianDigits(e.number)}
                    </AppText>
                  )}
                </View>
                <View style={styles.flexOne}>
                  <AppText size="xs" color={colors.textSecondary}>
                    {t(`textbook.section.${e.section}`)} · {t('textbook.page', { n: toPersianDigits(e.page) })}
                  </AppText>
                  <AppText size="sm" numberOfLines={2}>
                    {preview}
                  </AppText>
                </View>
                <Icon
                  name={locked ? 'lock' : 'chevron-right'}
                  size={20}
                  color={colors.textSecondary}
                  directional={!locked}
                />
              </Pressable>
            );
          })}
        </View>
      ))}
    </ScreenContainer>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  loader: {
    marginTop: spacing.xl,
  },
  header: {
    gap: spacing.sm,
  },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.success,
  },
  fillRTL: {
    alignSelf: 'flex-end',
  },
  group: {
    gap: spacing.sm,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  number: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryMuted,
  },
  numberDone: {
    backgroundColor: colors.success,
  },
  flexOne: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
}));
