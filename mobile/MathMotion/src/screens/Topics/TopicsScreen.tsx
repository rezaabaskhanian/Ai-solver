import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';

import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { TOPICS, type Topic } from '../../content/topics';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

export function TopicsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isRTL = useIsRTL();

  return (
    <ScreenContainer contentStyle={styles.noPadding}>
      <FlatList<Topic>
        data={TOPICS}
        keyExtractor={topic => topic.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <AppText color={colors.textSecondary}>{t('topics.intro')}</AppText>
        }
        renderItem={({ item }) => (
          <Card
            onPress={() => navigation.navigate('Topic', { topicId: item.id })}
            style={[styles.card, isRTL && styles.cardRTL]}
          >
            <View style={styles.iconWrap}>
              <AppText size="lg">{item.icon}</AppText>
            </View>
            <View style={styles.text}>
              <AppText weight="bold">{t(`topics.${item.id}.title`)}</AppText>
              <AppText size="sm" color={colors.textSecondary} numberOfLines={2}>
                {t(`topics.${item.id}.summary`)}
              </AppText>
            </View>
          </Card>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  noPadding: {
    padding: 0,
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  cardRTL: {
    flexDirection: 'row-reverse',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
