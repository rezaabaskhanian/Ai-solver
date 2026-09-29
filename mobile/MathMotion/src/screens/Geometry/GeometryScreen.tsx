import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { PaywallCard } from '../../components/Billing/PaywallCard';
import { MathExpression } from '../../components/MathExpression/MathExpression';
import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { Icon } from '../../components/common/Icon';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import {
  buildGeometryProblem,
  GEOMETRY_SHAPES,
  isValidMeasurement,
  type GeometryGroup,
  type GeometryQuantity,
  type GeometryShape,
} from '../../content/geometry';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { toApiError, translationKeyForApiError } from '../../services/api/apiError';
import { solveProblem } from '../../services/api/problems';
import { useEntitlementStore } from '../../store/useEntitlementStore';
import { fontFamily, fontSize, makeStyles, radius, spacing, useColors } from '../../theme';

const GROUPS: GeometryGroup[] = ['plane', 'solid', 'other'];
type Side = 'a' | 'b' | 'c';

// «ماشین‌حساب هندسه»: pick a shape, what to compute, type the
// measurements. The screen only builds a line like "area(circle, r=3)"
// (content/geometry.ts) and sends it through the normal Solve flow — the
// engine computes, explains and verifies it, and the free quota applies
// exactly as for a typed problem.
export function GeometryScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [group, setGroup] = useState<GeometryGroup>('plane');
  const [shape, setShape] = useState<GeometryShape>(GEOMETRY_SHAPES[0]);
  const [quantity, setQuantity] = useState<GeometryQuantity>('area');
  const [missing, setMissing] = useState<Side>('c');
  const [values, setValues] = useState<Record<string, string>>({});
  const [solving, setSolving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const { isPremium, freeSolvesUsed, freeSolvesLimit, refresh: refreshEntitlement } =
    useEntitlementStore();
  const quotaExhausted = !isPremium && freeSolvesUsed >= freeSolvesLimit;

  const quantities = Object.keys(shape.quantities) as GeometryQuantity[];
  const allParams = shape.quantities[quantity] ?? [];
  const params = quantity === 'pythagoras' ? allParams.filter(p => p !== missing) : allParams;
  const complete = params.every(p => isValidMeasurement(values[p] ?? ''));
  const row = [styles.row, isRTL && styles.rowRTL];

  const selectShape = (next: GeometryShape) => {
    setShape(next);
    setQuantity(Object.keys(next.quantities)[0] as GeometryQuantity);
    setValues({});
    setErrorText(null);
  };

  const selectGroup = (next: GeometryGroup) => {
    setGroup(next);
    selectShape(GEOMETRY_SHAPES.find(s => s.group === next)!);
  };

  const handleSolve = async () => {
    if (!complete) {
      return;
    }
    const sent = Object.fromEntries(params.map(p => [p, values[p]]));
    const problem = buildGeometryProblem(shape, quantity, sent);
    setSolving(true);
    setErrorText(null);
    try {
      const result = await solveProblem(problem);
      refreshEntitlement();
      navigation.navigate('Solution', { problem, result });
    } catch (err) {
      const apiError = toApiError(err);
      if (apiError.code === 'quota_exceeded') {
        refreshEntitlement();
      } else {
        // The engine's message names the actual problem (e.g. the
        // triangle inequality), so it's more useful than a generic line.
        setErrorText(t(translationKeyForApiError(apiError), { defaultValue: apiError.message }));
      }
    } finally {
      setSolving(false);
    }
  };

  return (
    <ScreenContainer scroll>
      <AppText color={colors.textSecondary}>{t('geometry.intro')}</AppText>

      <View style={[styles.segment, isRTL && styles.rowRTL]}>
        {GROUPS.map(g => (
          <Pressable
            key={g}
            accessibilityRole="button"
            accessibilityState={{ selected: g === group }}
            onPress={() => selectGroup(g)}
            style={[styles.segmentItem, g === group && styles.segmentActive]}
          >
            <AppText size="sm" weight="medium" color={g === group ? colors.onPrimary : colors.textPrimary}>
              {t(`geometry.groups.${g}`)}
            </AppText>
          </Pressable>
        ))}
      </View>

      <View style={[styles.grid, isRTL && styles.rowRTL]}>
        {GEOMETRY_SHAPES.filter(s => s.group === group).map(s => {
          const active = s.id === shape.id;
          return (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => selectShape(s)}
              style={({ pressed }) => [styles.tile, active && styles.tileActive, pressed && styles.pressed]}
            >
              <Icon name={s.icon} size={28} color={active ? colors.primaryText : colors.textSecondary} />
              <AppText size="xs" weight={active ? 'bold' : 'regular'} align="center">
                {t(`geometry.shapes.${s.id}`)}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {quantities.length > 1 && (
        <View style={[styles.chips, isRTL && styles.rowRTL]}>
          {quantities.map(q => (
            <Pressable
              key={q}
              accessibilityRole="button"
              accessibilityState={{ selected: q === quantity }}
              onPress={() => {
                setQuantity(q);
                setErrorText(null);
              }}
              style={[styles.chip, q === quantity && styles.chipActive]}
            >
              <AppText size="sm" weight="medium" color={q === quantity ? colors.primaryText : colors.textPrimary}>
                {t(`geometry.quantities.${q}`)}
              </AppText>
            </Pressable>
          ))}
        </View>
      )}

      {quantity === 'pythagoras' && (
        <View style={styles.block}>
          <AppText size="sm" weight="bold">
            {t('geometry.whichSide')}
          </AppText>
          <View style={[styles.chips, isRTL && styles.rowRTL]}>
            {(['a', 'b', 'c'] as Side[]).map(side => (
              <Pressable
                key={side}
                accessibilityRole="button"
                accessibilityState={{ selected: side === missing }}
                onPress={() => setMissing(side)}
                style={[styles.chip, side === missing && styles.chipActive]}
              >
                <AppText size="sm" weight="medium" color={side === missing ? colors.primaryText : colors.textPrimary}>
                  {t(`geometry.params.${side}`)}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={styles.card}>
        <View style={row}>
          <Icon name="functions" size={20} color={colors.primaryText} />
          <AppText size="sm" weight="bold" style={styles.flexOne}>
            {t('geometry.formula', {
              what: t(`geometry.quantities.${quantity}`),
              shape: t(`geometry.shapes.${shape.id}`),
            })}
          </AppText>
        </View>
        <View style={styles.formula}>
          <MathExpression expression={shape.formulas[quantity] ?? ''} size="lg" emphasize />
        </View>

        {params.map(p => (
          <View key={p} style={styles.block}>
            <AppText size="sm" color={colors.textSecondary}>
              {t(`geometry.params.${p}`)}
            </AppText>
            <TextInput
              value={values[p] ?? ''}
              onChangeText={text => setValues(v => ({ ...v, [p]: text }))}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel={t(`geometry.params.${p}`)}
              style={[
                styles.input,
                values[p] && !isValidMeasurement(values[p]) ? styles.inputError : null,
              ]}
            />
          </View>
        ))}
        <AppText size="xs" color={colors.textSecondary}>
          {quantity === 'angle_sum' || quantity === 'interior_angle' || quantity === 'exterior_angle'
            ? t('geometry.degreesNote')
            : t('geometry.unitsNote')}
        </AppText>
      </View>

      {errorText ? (
        <AppText size="sm" color={colors.danger}>
          {errorText}
        </AppText>
      ) : null}

      {quotaExhausted ? (
        <PaywallCard />
      ) : (
        <AppButton
          label={solving ? t('problemInput.solving') : t('geometry.solve')}
          icon="calculate"
          iconEnd="arrow-forward"
          variant="primary"
          onPress={handleSolve}
          disabled={!complete}
          loading={solving}
          style={styles.solve}
        />
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
  segment: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  segmentItem: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    width: '31%',
    minHeight: 84,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tileActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  pressed: {
    opacity: 0.7,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  block: {
    gap: spacing.xs,
  },
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  formula: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    fontFamily: fontFamily.fa.regular,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  inputError: {
    borderColor: colors.danger,
  },
  solve: {
    minHeight: 56,
    borderRadius: radius.lg,
  },
}));
