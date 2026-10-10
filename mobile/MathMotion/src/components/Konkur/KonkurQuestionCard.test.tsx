import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { KONKUR_QUESTIONS } from '../../content/konkur';
import '../../i18n';
import { KonkurQuestionCard } from './KonkurQuestionCard';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), push: jest.fn() }),
}));

const question = KONKUR_QUESTIONS.find(q => q.id === 'r1405_q2')!;

const texts = (root: ReactTestRenderer.ReactTestInstance) =>
  root.findAllByType(Text).map(n => [n.props.children].flat().join(''));

const press = (root: ReactTestRenderer.ReactTestInstance, label: string) => {
  const node = root.findAll(n => typeof n.props.onPress === 'function' && texts(n).some(t => t.includes(label)))[0];
  act(() => node.props.onPress());
};

describe('KonkurQuestionCard solving path', () => {
  it('walks understand → hints → give up → step-by-step solution → trap', () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(<KonkurQuestionCard question={question} index={0} />);
    });
    const root = renderer.root;
    const has = (s: string) => texts(root).some(t => t.includes(s));

    expect(has(question.guide!.asked![0] as string)).toBe(false);
    press(root, 'اول سؤال رو بفهم');
    expect(has(question.guide!.asked![0] as string)).toBe(true);

    press(root, 'راهنمایی بگیر');
    expect(has('راهنمایی 1')).toBe(true);
    expect(has('راهنمایی 2')).toBe(false);
    press(root, 'راهنمایی بعدی');
    expect(has('راهنمایی 2')).toBe(true);

    press(root, 'بلد نیستم');
    expect(has('قدم 1 از')).toBe(true);
    expect(has('دام این تست')).toBe(false);
    press(root, 'نمایش همه‌ی قدم‌ها');
    expect(has('دام این تست')).toBe(true);

    press(root, 'دوباره امتحان کن');
    expect(has('بلد نیستم')).toBe(true);
    expect(has('راهنمایی 1')).toBe(false);
  });
});
