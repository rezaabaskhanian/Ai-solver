import { prettifyMath, splitRoots, tokenizeExpression } from './tokenize';

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

  it('keeps commas in point notation', () => {
    expect(tokenizeExpression('A(1, -2)')).toEqual(['A', '(', '1', ',', '-', '2', ')']);
  });

  it('keeps math symbols the engine prints', () => {
    expect(tokenizeExpression('∫2x dx')).toEqual(['∫', '2', 'x', 'dx']);
    expect(tokenizeExpression('lim(x→∞) 1/x')).toEqual(['lim', '(', 'x', '→', '∞', ')', '1', '/', 'x']);
  });

  it('keeps a log base on the log', () => {
    expect(tokenizeExpression('log₂(x) = 3')).toEqual(['log₂', '(', 'x', ')', '=', '3']);
  });

  it('falls back to the whole string when nothing matches', () => {
    expect(tokenizeExpression('   ')).toEqual(['   ']);
  });
});

describe('prettifyMath / splitRoots', () => {
  it('writes square roots with the radical sign', () => {
    expect(prettifyMath('(3 + sqrt(7))/2')).toBe('(3 + √7)/2');
    expect(prettifyMath('sqrt(x + 1)')).toBe('√(x + 1)');
  });

  it('numbers several roots x₁, x₂', () => {
    expect(splitRoots('x = 2 or x = 3')).toEqual(['x₁ = 2', 'x₂ = 3']);
    expect(splitRoots('x = 6')).toEqual(['x = 6']);
  });
});
