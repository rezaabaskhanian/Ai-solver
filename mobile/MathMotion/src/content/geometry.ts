import type { IconName } from '../components/common/Icon';

// «ماشین‌حساب هندسه»: the shapes and what can be computed for each, with
// the measurements each formula needs. Mirrors FORMULAS in
// backend/math-engine/app/solver/geometry.py — the screen builds a line
// like "area(circle, r=3)" and sends it through the normal Solve flow,
// so the engine does (and verifies) all the math.
//
// Names and formulas shown to the student are i18n keys under
// geometry.shapes.<id>, geometry.quantities.<id>, geometry.params.<id>.

export type GeometryQuantity =
  | 'area'
  | 'perimeter'
  | 'volume'
  | 'surface'
  | 'pythagoras'
  | 'angle_sum'
  | 'interior_angle'
  | 'exterior_angle';

export type GeometryGroup = 'plane' | 'solid' | 'other';

export interface GeometryShape {
  id: string;
  icon: IconName;
  group: GeometryGroup;
  // Quantity -> the measurements its formula needs, in input order.
  quantities: Partial<Record<GeometryQuantity, string[]>>;
  // The formula shown above the inputs (same text the engine's first step
  // shows), per quantity.
  formulas: Partial<Record<GeometryQuantity, string>>;
}

export const GEOMETRY_SHAPES: GeometryShape[] = [
  {
    id: 'square',
    icon: 'crop-square',
    group: 'plane',
    quantities: { area: ['a'], perimeter: ['a'] },
    formulas: { area: 'S = a × a', perimeter: 'P = 4 × a' },
  },
  {
    id: 'rectangle',
    icon: 'crop-landscape',
    group: 'plane',
    quantities: { area: ['a', 'b'], perimeter: ['a', 'b'] },
    formulas: { area: 'S = a × b', perimeter: 'P = 2 × (a + b)' },
  },
  {
    id: 'triangle',
    icon: 'change-history',
    group: 'plane',
    quantities: { area: ['b', 'h'], perimeter: ['a', 'b', 'c'] },
    formulas: { area: 'S = (b × h) / 2', perimeter: 'P = a + b + c' },
  },
  {
    id: 'parallelogram',
    icon: 'rectangle',
    group: 'plane',
    quantities: { area: ['b', 'h'] },
    formulas: { area: 'S = b × h' },
  },
  {
    id: 'trapezoid',
    icon: 'details',
    group: 'plane',
    quantities: { area: ['a', 'b', 'h'] },
    formulas: { area: 'S = ((a + b) × h) / 2' },
  },
  {
    id: 'rhombus',
    icon: 'diamond',
    group: 'plane',
    quantities: { area: ['d1', 'd2'], perimeter: ['a'] },
    formulas: { area: 'S = (d1 × d2) / 2', perimeter: 'P = 4 × a' },
  },
  {
    id: 'circle',
    icon: 'circle',
    group: 'plane',
    quantities: { area: ['r'], perimeter: ['r'] },
    formulas: { area: 'S = π × r^2', perimeter: 'P = 2 × π × r' },
  },
  {
    id: 'cube',
    icon: 'view-in-ar',
    group: 'solid',
    quantities: { volume: ['a'], surface: ['a'] },
    formulas: { volume: 'V = a^3', surface: 'S = 6 × a^2' },
  },
  {
    id: 'cuboid',
    icon: 'inventory-2',
    group: 'solid',
    quantities: { volume: ['a', 'b', 'c'], surface: ['a', 'b', 'c'] },
    formulas: { volume: 'V = a × b × c', surface: 'S = 2 × (a × b + b × c + a × c)' },
  },
  {
    id: 'cylinder',
    icon: 'storage',
    group: 'solid',
    quantities: { volume: ['r', 'h'], surface: ['r', 'h'] },
    formulas: { volume: 'V = π × r^2 × h', surface: 'S = 2 × π × r^2 + 2 × π × r × h' },
  },
  {
    id: 'cone',
    icon: 'signal-cellular-4-bar',
    group: 'solid',
    quantities: { volume: ['r', 'h'] },
    formulas: { volume: 'V = (π × r^2 × h) / 3' },
  },
  {
    id: 'sphere',
    icon: 'public',
    group: 'solid',
    quantities: { volume: ['r'], surface: ['r'] },
    formulas: { volume: 'V = (4 × π × r^3) / 3', surface: 'S = 4 × π × r^2' },
  },
  {
    id: 'pyramid',
    icon: 'architecture',
    group: 'solid',
    quantities: { volume: ['a', 'h'] },
    formulas: { volume: 'V = (a^2 × h) / 3' },
  },
  {
    id: 'pythagoras',
    icon: 'square-foot',
    group: 'other',
    // Any two of a, b, c — the screen asks which side is missing.
    quantities: { pythagoras: ['a', 'b', 'c'] },
    formulas: { pythagoras: 'c^2 = a^2 + b^2' },
  },
  {
    id: 'polygon',
    icon: 'hexagon',
    group: 'other',
    quantities: { angle_sum: ['n'], interior_angle: ['n'], exterior_angle: ['n'] },
    formulas: {
      angle_sum: '∑ = (n - 2) × 180',
      interior_angle: 'α = ((n - 2) × 180) / n',
      exterior_angle: 'β = 360 / n',
    },
  },
];

export function findShape(id: string): GeometryShape | undefined {
  return GEOMETRY_SHAPES.find(s => s.id === id);
}

// Persian/Arabic digits and the Persian decimal separator, as a phone
// keyboard types them, count as numbers ("۲٫۵" = 2.5).
const NUMBER = /^[0-9۰-۹٠-٩]+([.٫][0-9۰-۹٠-٩]+)?$/;

export function isValidMeasurement(value: string): boolean {
  const text = value.trim();
  return NUMBER.test(text) && !/^[0۰٠]+([.٫][0۰٠]+)?$/.test(text);
}

// The line sent to the engine, e.g. "area(circle, r=3)" or
// "pythagoras(a=3, b=4)". `values` holds only the measurements to send.
export function buildGeometryProblem(
  shape: GeometryShape,
  quantity: GeometryQuantity,
  values: Record<string, string>,
): string {
  const params = Object.entries(values).map(([name, v]) => `${name}=${v.trim()}`);
  const head = quantity === 'pythagoras' ? [] : [shape.id];
  return `${quantity}(${[...head, ...params].join(', ')})`;
}
