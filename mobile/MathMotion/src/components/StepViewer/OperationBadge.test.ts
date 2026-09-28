import { arithmeticBadgeText, operationDisplayLabel, translatedOperationLabel } from './OperationBadge';
import type { SolutionStep } from '../../types/problem';

// Mimics i18next's `t(key, { defaultValue })` closely enough for these
// pure functions -- no real i18next instance needed since they never read
// anything besides the key/defaultValue they're called with: a known key
// resolves like a real translation would, an unknown one falls back to
// `defaultValue` exactly as `operationDisplayLabel` relies on.
const TRANSLATIONS: Record<string, string> = {
  'solution.operations.factor': 'Factor',
};
const t = (key: string, opts?: { defaultValue?: string }) => TRANSLATIONS[key] ?? opts?.defaultValue ?? key;

function step(overrides: Partial<SolutionStep>): SolutionStep {
  return {
    id: 1,
    before: '2x + 5 = 17',
    after: '2x = 12',
    operation: 'subtract',
    value: '5',
    target: 'both_sides',
    explanation: 'Subtract 5 from both sides.',
    ...overrides,
  };
}

describe('arithmeticBadgeText', () => {
  it('renders "− value" for subtract', () => {
    expect(arithmeticBadgeText(step({ operation: 'subtract', value: '5' }))).toBe('− 5');
  });

  it('renders "÷ value" for divide', () => {
    expect(arithmeticBadgeText(step({ operation: 'divide', value: '2' }))).toBe('÷ 2');
  });

  it('returns null when the operation has no arithmetic symbol', () => {
    expect(arithmeticBadgeText(step({ operation: 'move_term', value: null }))).toBeNull();
  });

  it('returns null when an arithmetic operation is missing a value', () => {
    expect(arithmeticBadgeText(step({ operation: 'subtract', value: null }))).toBeNull();
  });
});

describe('translatedOperationLabel', () => {
  it('returns the translated label for a known operation', () => {
    expect(translatedOperationLabel('factor', t)).toBe('Factor');
  });

  it('falls back to the raw operation string for an unknown key', () => {
    expect(translatedOperationLabel('made_up_operation', t)).toBe('made_up_operation');
  });
});

describe('operationDisplayLabel', () => {
  it('prefers the arithmetic badge text when available', () => {
    expect(operationDisplayLabel(step({ operation: 'multiply', value: '3' }), t)).toBe('× 3');
  });

  it('falls back to the translated operation label otherwise', () => {
    expect(operationDisplayLabel(step({ operation: 'factor', value: null }), t)).toBe('Factor');
  });
});
