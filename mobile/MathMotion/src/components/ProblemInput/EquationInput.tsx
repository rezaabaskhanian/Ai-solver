import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { useIsRTL } from '../../hooks/useIsRTL';
import { fontFamily, fontSize, makeStyles, radius, spacing, useColors } from '../../theme';
import { AppText } from '../common/AppText';
import {
  applyMathKey,
  deleteBackward,
  EXAMPLE_PROBLEMS,
  MATH_KEY_TABS,
  mathKeyById,
  TAB_EXAMPLES,
  type MathKey,
  type Selection,
} from './mathKeys';
import { Icon } from '../common/Icon';

interface EquationInputProps {
  value: string;
  onChangeText: (text: string) => void;
  autoFocus?: boolean;
}

// Equations are typed in Latin letters/operators (the Math Engine also
// accepts Persian digits, √, ×, ÷ -- backend/math-engine/app/solver/
// normalize.py), so this field stays left-to-right regardless of the
// app's language. Laid out after the Stitch "type_problem" design: the
// input card (with length + backspace), tappable examples, and a tabbed
// keypad for the symbols a phone keyboard hides. Digits still come from
// the phone keyboard.
export function EquationInput({ value, onChangeText, autoFocus }: EquationInputProps) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const inputRef = useRef<TextInput>(null);
  const selectionRef = useRef<Selection>({ start: value.length, end: value.length });
  // Only set right after a key press, to move the cursor programmatically;
  // cleared on the next native selection change so typing stays uncontrolled.
  const [forcedSelection, setForcedSelection] = useState<Selection | undefined>();
  const [tab, setTab] = useState<(typeof MATH_KEY_TABS)[number]['id']>('general');
  const row = [styles.row, isRTL && styles.rowRTL];

  const apply = (next: { value: string; cursor: number }) => {
    selectionRef.current = { start: next.cursor, end: next.cursor };
    onChangeText(next.value);
    setForcedSelection({ start: next.cursor, end: next.cursor });
  };

  const handleKey = (key: MathKey) => {
    apply(applyMathKey(value, selectionRef.current, key));
    inputRef.current?.focus();
  };

  const handleExample = (example: string) => {
    apply({ value: example, cursor: example.length });
    inputRef.current?.focus();
  };

  const keys = (MATH_KEY_TABS.find(k => k.id === tab)?.keys ?? [])
    .map(mathKeyById)
    .filter((k): k is MathKey => Boolean(k));

  return (
    <View style={styles.container}>
      <View style={styles.inputCard}>
        <View style={row}>
          <AppText size="xs" color={colors.textSecondary} style={styles.flexOne}>
            {t('problemInput.fieldLabel')}
          </AppText>
          <AppText size="xs" color={colors.primaryText}>
            {t('problemInput.ltrHint')}
          </AppText>
        </View>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          selection={forcedSelection}
          onSelectionChange={e => {
            selectionRef.current = e.nativeEvent.selection;
            if (forcedSelection) {
              setForcedSelection(undefined);
            }
          }}
          placeholder={t('problemInput.placeholder')}
          placeholderTextColor={colors.textSecondary}
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="default"
          // Multiline only so long equations wrap; Enter still submits.
          multiline
          submitBehavior="blurAndSubmit"
          style={styles.input}
        />
        <View style={row}>
          <AppText size="xs" color={colors.textSecondary} style={styles.flexOne}>
            {t('problemInput.length', { count: value.length })}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('problemInput.backspace')}
            onPress={() => apply(deleteBackward(value, selectionRef.current))}
            disabled={!value}
            style={({ pressed }) => [styles.backspace, pressed && styles.pressed, !value && styles.disabled]}
          >
            <Icon name="backspace" />
          </Pressable>
        </View>
      </View>

      <View style={row}>
        <Icon name="lightbulb-outline" size={16} color={colors.primaryText} />
        <AppText size="xs" color={colors.textSecondary}>
          {t('problemInput.examples')}
        </AppText>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={styles.chips}
      >
        {EXAMPLE_PROBLEMS.map(example => (
          <Pressable
            key={example}
            onPress={() => handleExample(example)}
            style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <AppText size="sm" weight="medium" style={styles.ltrText}>
              {example}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.keypad}>
        <View style={row}>
          <AppText size="xs" color={colors.textSecondary} style={styles.flexOne}>
            {t('problemInput.keypadTitle')}
          </AppText>
        </View>
        {/* Own full-width row: five tabs don't fit beside the title. */}
        <View style={[styles.tabs, isRTL && styles.tabsRTL]}>
          {MATH_KEY_TABS.map(({ id }) => (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityState={{ selected: id === tab }}
              onPress={() => setTab(id)}
              style={[styles.tab, id === tab && styles.tabActive]}
            >
              <AppText
                size="xs"
                weight="medium"
                align="center"
                color={id === tab ? colors.primaryText : colors.textSecondary}
              >
                {t(`problemInput.tabs.${id}`)}
              </AppText>
            </Pressable>
          ))}
        </View>

        {/* How to write this tab's problems, with tappable examples. */}
        <View style={styles.hint}>
          <AppText size="xs" color={colors.textSecondary}>
            {t(`problemInput.tabHints.${tab}`)}
          </AppText>
          <View style={[styles.hintExamples, isRTL && styles.tabsRTL]}>
            {TAB_EXAMPLES[tab].map(example => (
              <Pressable
                key={example}
                onPress={() => handleExample(example)}
                style={({ pressed }) => [styles.hintChip, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <AppText size="sm" weight="medium" color={colors.primaryText} style={styles.ltrText}>
                  {example}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Always LTR: keys are math, laid out like a calculator. */}
        <View style={styles.grid}>
          {keys.map(key => (
            <Pressable
              key={`${tab}-${key.id}`}
              onPress={() => handleKey(key)}
              style={({ pressed }) => [
                styles.key,
                key.tone === 'operator' && styles.keyOperator,
                pressed && styles.keyPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={key.label}
            >
              <AppText
                size="lg"
                weight="bold"
                align="center"
                color={key.tone === 'calculus' ? colors.success : colors.primaryText}
                style={styles.ltrText}
              >
                {key.label}
              </AppText>
            </Pressable>
          ))}
          {/* Fill the last row so its keys keep the same width as the rest. */}
          {Array.from({ length: (KEYS_PER_ROW - (keys.length % KEYS_PER_ROW)) % KEYS_PER_ROW }, (_, i) => (
            <View key={`filler-${i}`} style={[styles.key, styles.keyFiller]} />
          ))}
        </View>
      </View>
    </View>
  );
}

const KEYS_PER_ROW = 4;

const useStyles = makeStyles(colors => StyleSheet.create({
  container: {
    gap: spacing.sm + 4,
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
  inputCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    minHeight: 56,
    paddingVertical: spacing.xs,
    // Vazirmatn covers Latin too, so the Persian placeholder and the
    // typed LTR math share one font; missing math glyphs fall back.
    fontFamily: fontFamily.fa.regular,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    textAlign: 'left',
    writingDirection: 'ltr',
    textAlignVertical: 'center',
  },
  backspace: {
    width: 48,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
  chips: {
    gap: spacing.sm,
  },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  ltrText: {
    writingDirection: 'ltr',
  },
  keypad: {
    gap: spacing.sm,
    padding: spacing.sm + 4,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryMuted,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    padding: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  tabsRTL: {
    flexDirection: 'row-reverse',
  },
  tab: {
    flexGrow: 1,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm - 2,
  },
  tabActive: {
    backgroundColor: colors.surface,
  },
  hint: {
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  hintExamples: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  hintChip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    direction: 'ltr',
  },
  key: {
    // 4 per row: (100% - 3 gaps) / 4
    width: '22.5%',
    flexGrow: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  keyFiller: {
    backgroundColor: 'transparent',
  },
  keyOperator: {
    backgroundColor: colors.surfaceMuted,
  },
  keyPressed: {
    opacity: 0.6,
  },
}));
