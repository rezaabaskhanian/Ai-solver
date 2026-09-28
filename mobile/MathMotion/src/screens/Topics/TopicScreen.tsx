import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { MathExpression } from '../../components/MathExpression/MathExpression';
import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { findTopic } from '../../content/topics';
import type { RootStackParamList } from '../../navigation/types';
import { toApiError, translationKeyForApiError } from '../../services/api/apiError';
import { practiceProblem } from '../../services/api/problems';
import { colors, spacing } from '../../theme';

export function TopicScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Topic'>>();
  const topic = findTopic(params.topicId);

  const [generatingPractice, setGeneratingPractice] = useState(false);
  const [practiceError, setPracticeError] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t(`topics.${params.topicId}.title`) });
  }, [navigation, params.topicId, t]);

  if (!topic) {
    return null;
  }

  // Same flow as Solution's "practice similar": a fresh problem of this
  // type, attempted by the student on CheckSteps rather than just solved
  // for them.
  const handlePractice = async () => {
    if (!topic.practiceType) {
      return;
    }
    setGeneratingPractice(true);
    setPracticeError(null);
    try {
      const practice = await practiceProblem(topic.practiceType);
      navigation.navigate('CheckSteps', { problem: practice.problem });
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
          <AppText size="sm" weight="bold" color={colors.primary}>
            {t('topics.tipLabel')}
          </AppText>
          <AppText size="sm">{t(`topics.${topic.id}.tip`)}</AppText>
        </Card>
      </View>

      <View style={styles.section}>
        <AppText weight="bold">{t('topics.examplesTitle')}</AppText>
        <AppText size="sm" color={colors.textSecondary}>
          {t('topics.examplesHint')}
        </AppText>
        {topic.examples.map(example => (
          <Card
            key={example}
            onPress={() => navigation.navigate('ProblemInput', { initialProblem: example })}
            style={styles.example}
          >
            <MathExpression expression={example} size="lg" />
          </Card>
        ))}
      </View>

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
            onPress={handlePractice}
            loading={generatingPractice}
          />
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
});
