import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { useKonkurProgressStore } from '../../store/useKonkurProgressStore';
import { spacing, useColors } from '../../theme';
import { Icon } from '../common/Icon';

interface Props {
  kind: 'question' | 'tip';
  id: string;
}

// The star that bookmarks a question or a tip («نشان‌شده‌ها»).
export function KonkurBookmarkButton({ kind, id }: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  const marked = useKonkurProgressStore(s =>
    (kind === 'question' ? s.bookmarkedQuestions : s.bookmarkedTips).includes(id),
  );
  const toggle = useKonkurProgressStore(s =>
    kind === 'question' ? s.toggleQuestionBookmark : s.toggleTipBookmark,
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={marked ? t('konkur.progress.unbookmark') : t('konkur.progress.bookmark')}
      accessibilityState={{ selected: marked }}
      hitSlop={8}
      onPress={() => toggle(id)}
      style={styles.button}
    >
      <Icon name={marked ? 'star' : 'star-border'} color={marked ? colors.warning : colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: spacing.xs,
  },
});
