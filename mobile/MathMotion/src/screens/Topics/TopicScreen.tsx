import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { MathExpression } from '../../components/MathExpression/MathExpression';
import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { Icon } from '../../components/common/Icon';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { LessonView } from '../../components/Topics/LessonView';
import { chaptersForTopic } from '../../content/curriculum';
import { LESSONS } from '../../content/lessons';
import { openPractice } from '../../content/practice';
import { findTopic } from '../../content/topics';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { toApiError, translationKeyForApiError } from '../../services/api/apiError';
import { practiceProblem } from '../../services/api/problems';
import { useTrack } from '../../store/usePreferencesStore';
import { makeStyles, spacing, useColors } from '../../theme';

export function TopicScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const track = useTrack();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Topic'>>();
  const topic = findTopic(params.topicId);
  // Where this topic sits in the official textbooks (content/curriculum.ts).
  const bookRefs = chaptersForTopic(params.topicId, track);
  const lesson = LESSONS[params.topicId];

  const [generatingPractice, setGeneratingPractice] = useState(false);
  const [practiceError, setPracticeError] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t(`topics.${params.topicId}.title`) });
  }, [navigation, params.topicId, t]);

  if (!topic) {
    return null;
  }

  // Same flow as Solution's "practice similar": a fresh problem of this
  // type for the student to attempt (content/practice.ts decides where).
  const handlePractice = async () => {
    if (!topic.practiceType) {
      return;
    }
    setGeneratingPractice(true);
    setPracticeError(null);
    try {
      const practice = await practiceProblem(topic.practiceType);
      openPractice(navigation, topic.practiceType, practice.problem);
    } catch (err) {
      const apiError = toApiError(err);
      setPracticeError(t(translationKeyForApiError(apiError), { defaultValue: apiError.message }));
    } finally {
      setGeneratingPractice(false);
    }
  };

  return (
    <ScreenContainer scroll>
      <View style={styles.section}>
        <AppText>{t(`topics.${topic.id}.summary`)}</AppText>
        <Card style={styles.tip}>
          <View style={[styles.row, isRTL && styles.rowRTL]}>
            <Icon name="lightbulb-outline" size={18} color={colors.primaryText} />
            <AppText size="sm" weight="bold" color={colors.primaryText}>
              {t('topics.tipLabel')}
            </AppText>
          </View>
          <AppText size="sm">{t(`topics.${topic.id}.tip`)}</AppText>
        </Card>
      </View>

      {lesson ? <LessonView topicId={topic.id} lesson={lesson} /> : null}

      {bookRefs.length > 0 && (
        <View style={styles.section}>
          <AppText weight="bold">{t('topics.inBooks')}</AppText>
          {bookRefs.map(ref => (
            <View key={ref.chapter.id} style={[styles.row, isRTL && styles.rowRTL]}>
              <Icon name="auto-stories" size={18} color={colors.primaryText} />
              <AppText size="sm" style={styles.flexOne}>
                {t('topics.chapterRef', {
                  grade: ref.grade,
                  book: ref.book,
                  n: ref.number,
                  title: ref.chapter.title,
                })}
              </AppText>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <AppText weight="bold">{t('topics.examplesTitle')}</AppText>
        <AppText size="sm" color={colors.textSecondary}>
          {t('topics.examplesHint')}
        </AppText>
        {topic.examples.map(example => (
          <Card
            key={example}
            onPress={() => navigation.navigate('ProblemInput', { initialProblem: example })}
            style={[styles.example, styles.row, isRTL && styles.rowRTL]}
          >
            <View style={styles.flexOne}>
              <MathExpression expression={example} size="lg" />
            </View>
            <Icon name="play-circle-outline" color={colors.primaryText} />
          </Card>
        ))}
      </View>

      {topic.id === 'geometry' && (
        <AppButton
          label={t('geometry.openCalculator')}
          variant="primary"
          icon="square-foot"
          onPress={() => navigation.navigate('Geometry')}
        />
      )}

      {topic.practiceType && (
        <View style={styles.section}>
          {practiceError && (
            <AppText size="sm" color={colors.danger}>
              {practiceError}
            </AppText>
          )}
          <AppButton
            label={generatingPractice ? t('topics.generatingPractice') : t('topics.practice')}
            variant="primary"
            icon="refresh"
            onPress={handlePractice}
            loading={generatingPractice}
          />
        </View>
      )}
    </ScreenContainer>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  flexOne: {
    flex: 1,
  },
  section: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tip: {
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primaryMuted,
  },
  example: {
    padding: spacing.md,
  },
}));
