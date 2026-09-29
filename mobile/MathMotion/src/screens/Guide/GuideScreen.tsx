import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { MathExpression } from '../../components/MathExpression/MathExpression';
import { GUIDE_SECTIONS } from '../../content/guide';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { Icon } from '../../components/common/Icon';

// How to use the app: typing syntax (tap a row to try it), scan tips,
// what the solution screen offers, learning tools and the free quota.
export function GuideScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isRTL = useIsRTL();
  const rowStyle = [styles.row, isRTL && styles.rowRTL];

  return (
    <ScreenContainer scroll>
      <AppText color={colors.textSecondary}>{t('guide.intro')}</AppText>

      {GUIDE_SECTIONS.map(section => (
        <Card key={section.id} style={styles.section}>
          <View style={rowStyle}>
            <View style={styles.iconWrap}>
              <Icon name={section.icon} color={colors.primaryText} />
            </View>
            <AppText weight="bold" size="lg" style={styles.flexOne}>
              {t(`guide.${section.id}.title`)}
            </AppText>
          </View>

          {section.items?.map(item => (
            <View key={item} style={rowStyle}>
              <AppText color={colors.primaryText}>•</AppText>
              <AppText size="sm" style={styles.flexOne}>
                {t(`guide.${section.id}.items.${item}`)}
              </AppText>
            </View>
          ))}

          {section.typingRows && (
            <View style={styles.typingList}>
              <AppText size="sm" color={colors.textSecondary}>
                {t('guide.typing.tryHint')}
              </AppText>
              {section.typingRows.map(row => (
                <Card
                  key={row.id}
                  onPress={() => navigation.navigate('ProblemInput', { initialProblem: row.example })}
                  style={styles.typingRow}
                >
                  <View style={rowStyle}>
                    <View style={styles.symbol}>
                      <AppText weight="bold" align="center" color={colors.primaryText}>
                        {row.symbol}
                      </AppText>
                    </View>
                    <AppText size="sm" style={styles.flexOne}>
                      {t(`guide.typing.rows.${row.id}`)}
                    </AppText>
                  </View>
                  <View style={styles.example}>
                    <MathExpression expression={row.example} size="md" />
                  </View>
                </Card>
              ))}
            </View>
          )}
        </Card>
      ))}
    </ScreenContainer>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
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
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typingList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  typingRow: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  symbol: {
    minWidth: 44,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryMuted,
  },
  example: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
}));
