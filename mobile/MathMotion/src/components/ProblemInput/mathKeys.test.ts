import { applyMathKey, deleteBackward, MATH_KEY_TABS, MATH_KEYS, type MathKey } from './mathKeys';

function key(id: string): MathKey {
  const found = MATH_KEYS.find(k => k.id === id);
  if (!found) {
    throw new Error(`no key ${id}`);
  }
  return found;
}

describe('applyMathKey', () => {
  it('inserts at the cursor and moves the cursor past the inserted text', () => {
    expect(applyMathKey('3x+5', { start: 2, end: 2 }, key('square'))).toEqual({
      value: '3x^2+5',
      cursor: 4,
    });
  });

  it('places the cursor inside the parentheses of a function key', () => {
    expect(applyMathKey('', { start: 0, end: 0 }, key('sin'))).toEqual({ value: 'sin()', cursor: 4 });
  });

  it('replaces a selected range', () => {
    expect(applyMathKey('a*b', { start: 1, end: 2 }, key('divide'))).toEqual({ value: 'a/b', cursor: 2 });
  });

  it('clamps a stale selection that is past the end of the value', () => {
    expect(applyMathKey('x', { start: 9, end: 9 }, key('equals'))).toEqual({ value: 'x=', cursor: 2 });
  });

  it('leaves the cursor between the integral sign and dx', () => {
    expect(applyMathKey('', { start: 0, end: 0 }, key('integral'))).toEqual({ value: '∫ dx', cursor: 1 });
  });
});

describe('deleteBackward', () => {
  it('removes the character before the cursor', () => {
    expect(deleteBackward('3x+5', { start: 2, end: 2 })).toEqual({ value: '3+5', cursor: 1 });
  });

  it('removes a selected range', () => {
    expect(deleteBackward('3x+5', { start: 1, end: 3 })).toEqual({ value: '35', cursor: 1 });
  });

  it('does nothing at the start', () => {
    expect(deleteBackward('3x', { start: 0, end: 0 })).toEqual({ value: '3x', cursor: 0 });
  });
});

describe('MATH_KEY_TABS', () => {
  it('only references keys that exist', () => {
    MATH_KEY_TABS.flatMap(tab => tab.keys).forEach(id => expect(MATH_KEYS.map(k => k.id)).toContain(id));
  });
});
