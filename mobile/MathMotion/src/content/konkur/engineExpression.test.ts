import { engineExpressionFor } from './engineExpression';

const q = (expression?: string) => ({ expression });

describe('engineExpressionFor', () => {
  it('passes plain equations and expressions through', () => {
    expect(engineExpressionFor(q('3x^2 - 7x + 4 = 0'))).toBe('3x^2 - 7x + 4 = 0');
    expect(engineExpressionFor(q('sqrt(18) + sqrt(8)'))).toBe('sqrt(18) + sqrt(8)');
    expect(engineExpressionFor(q('(-1) × (-2) × (-3)'))).toBe('(-1) × (-2) × (-3)');
    expect(engineExpressionFor(q('lim(x→3) (x^2 - 9)/(x^2 - 5x + 6)'))).not.toBeNull();
    expect(engineExpressionFor(q('log₂(8) + log₃(9)'))).not.toBeNull();
  });

  it('returns null without an expression', () => {
    expect(engineExpressionFor(q())).toBeNull();
    expect(engineExpressionFor(q('   '))).toBeNull();
  });

  it('rejects set algebra, probability and lists', () => {
    expect(engineExpressionFor(q("(A - B) ∪ [(B ∩ C)' ∩ ((B' ∪ A) - B)]"))).toBeNull();
    expect(engineExpressionFor(q('P(A - B) = P(A)P(B\')   ,   P(A) = 1.6P(B)'))).toBeNull();
  });

  it('rejects function definitions, absolute values and inequalities', () => {
    expect(engineExpressionFor(q('y = x^2 - 4x + 7'))).toBeNull();
    expect(engineExpressionFor(q('f(x) = x^3 - 3x + 1'))).toBeNull();
    expect(engineExpressionFor(q('|x - 2| < 3'))).toBeNull();
    expect(engineExpressionFor(q('-2x + 3 > 7'))).toBeNull();
  });

  it('rejects unbalanced parentheses', () => {
    expect(engineExpressionFor(q('(x + 1'))).toBeNull();
  });
});
