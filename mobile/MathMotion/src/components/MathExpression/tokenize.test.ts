import { tokenizeExpression } from './tokenize';

describe('tokenizeExpression', () => {
  it('splits numbers, letters, and operators into separate tokens', () => {
    expect(tokenizeExpression('2x + 5 = 17')).toEqual(['2', 'x', '+', '5', '=', '17']);
  });

  it('keeps decimal numbers as a single token', () => {
    expect(tokenizeExpression('0.5x')).toEqual(['0.5', 'x']);
  });

  it('keeps multi-letter function names as a single token', () => {
    expect(tokenizeExpression('sin(x)')).toEqual(['sin', '(', 'x', ')']);
  });

  it('splits exponents into base, caret, and exponent tokens', () => {
    expect(tokenizeExpression('x^2')).toEqual(['x', '^', '2']);
  });

  it('falls back to the whole string when nothing matches', () => {
    expect(tokenizeExpression('∫')).toEqual(['∫']);
  });
});
