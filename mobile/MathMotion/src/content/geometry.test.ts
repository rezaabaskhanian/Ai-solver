import en from '../i18n/locales/en.json';
import fa from '../i18n/locales/fa.json';
import { buildGeometryProblem, findShape, GEOMETRY_SHAPES, isValidMeasurement } from './geometry';

describe('geometry calculator content', () => {
  it('builds the line the math engine parses', () => {
    expect(buildGeometryProblem(findShape('circle')!, 'area', { r: '3' })).toBe('area(circle, r=3)');
    expect(buildGeometryProblem(findShape('cone')!, 'volume', { r: '3', h: ' 4 ' })).toBe('volume(cone, r=3, h=4)');
    expect(buildGeometryProblem(findShape('pythagoras')!, 'pythagoras', { a: '3', b: '4' })).toBe(
      'pythagoras(a=3, b=4)',
    );
  });

  it('accepts positive numbers, Persian digits included', () => {
    ['3', '2.5', '۲', '۲٫۵', '0.5'].forEach(v => expect(isValidMeasurement(v)).toBe(true));
    ['', '0', '۰', '-3', 'abc', '1/2', '2.'].forEach(v => expect(isValidMeasurement(v)).toBe(false));
  });

  it('has a formula and translated labels for everything it offers', () => {
    GEOMETRY_SHAPES.forEach(shape => {
      expect(fa.geometry.shapes).toHaveProperty([shape.id]);
      expect(en.geometry.shapes).toHaveProperty([shape.id]);
      Object.entries(shape.quantities).forEach(([quantity, params]) => {
        expect(shape.formulas).toHaveProperty([quantity]);
        expect(fa.geometry.quantities).toHaveProperty([quantity]);
        params!.forEach(p => expect(fa.geometry.params).toHaveProperty([p]));
      });
    });
  });
});
