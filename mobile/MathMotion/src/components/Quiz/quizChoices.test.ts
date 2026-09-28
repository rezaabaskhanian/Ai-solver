import { buildQuizChoices } from './quizChoices';
import type { SolutionStep } from '../../types/problem';

const t = (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key;

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

describe('buildQuizChoices', () => {
  it('reproduces PRD section 20\'s worked example', () => {
    const choices = buildQuizChoices(step({ operation: 'subtract', value: '5' }), t);
    const labels = new Set(choices.map(c => c.label));

    expect(labels).toEqual(new Set(['+ 5', '− 5', '× 5', '÷ 5']));
    expect(choices.filter(c => c.correct)).toEqual([{ label: '− 5', correct: true }]);
  });

  it('always produces exactly one correct choice out of four', () => {
    const steps: Array<Partial<SolutionStep>> = [
      { id: 2, operation: 'add', value: '3' },
      { id: 3, operation: 'divide', value: '2' },
      { id: 4, operation: 'multiply', value: '4' },
      { id: 5, operation: 'move_term', value: null },
      { id: 6, operation: 'factor', value: null },
      { id: 7, operation: 'power_rule', value: null },
    ];

    for (const overrides of steps) {
      const choices = buildQuizChoices(step(overrides), t);
      expect(choices).toHaveLength(4);
      expect(choices.filter(c => c.correct)).toHaveLength(1);
      // No accidental duplicate options -- a repeated label would make the
      // quiz have two "correct-looking" buttons or two identical wrong ones.
      expect(new Set(choices.map(c => c.label)).size).toBe(4);
    }
  });

  it('falls back to other operation labels when there is no arithmetic value', () => {
    const choices = buildQuizChoices(step({ operation: 'move_term', value: null }), t);
    const correct = choices.find(c => c.correct);

    // With this test's stub `t`, an untranslated key resolves to its own
    // `defaultValue` -- i.e. the raw operation string (see
    // translatedOperationLabel's `{ defaultValue: operation }`).
    expect(correct?.label).toBe('move_term');
    expect(choices.filter(c => !c.correct).every(c => c.label !== correct?.label)).toBe(true);
  });

  it('shuffles deterministically by step id', () => {
    const a = buildQuizChoices(step({ id: 42 }), t);
    const b = buildQuizChoices(step({ id: 42 }), t);
    expect(a).toEqual(b);
  });
});
