import type { CurriculumGrade } from '../curriculum';
import { GENERAL_QUESTIONS, GENERAL_TIPS } from './general';
import { GRADE10_QUESTIONS, GRADE10_TIPS } from './grade10';
import { GRADE11_QUESTIONS, GRADE11_TIPS } from './grade11';
import { GRADE12_QUESTIONS, GRADE12_TIPS } from './grade12';
import { GRADE7_QUESTIONS, GRADE7_TIPS } from './grade7';
import { GRADE8_QUESTIONS, GRADE8_TIPS } from './grade8';
import { GRADE9_QUESTIONS, GRADE9_TIPS } from './grade9';
import { PAST_QUESTIONS } from './past';
import type { KonkurQuestion, KonkurSource, KonkurTip } from './types';

export type { KonkurLine, KonkurQuestion, KonkurSource, KonkurTip, KonkurTrack } from './types';

export const KONKUR_TIPS: KonkurTip[] = [
  ...GENERAL_TIPS,
  ...GRADE7_TIPS,
  ...GRADE8_TIPS,
  ...GRADE9_TIPS,
  ...GRADE10_TIPS,
  ...GRADE11_TIPS,
  ...GRADE12_TIPS,
];

export const KONKUR_QUESTIONS: KonkurQuestion[] = [
  ...GENERAL_QUESTIONS,
  ...GRADE7_QUESTIONS,
  ...GRADE8_QUESTIONS,
  ...GRADE9_QUESTIONS,
  ...GRADE10_QUESTIONS,
  ...GRADE11_QUESTIONS,
  ...GRADE12_QUESTIONS,
  ...PAST_QUESTIONS,
];

export function findKonkurTip(id: string): KonkurTip | undefined {
  return KONKUR_TIPS.find(tip => tip.id === id);
}

export function tipsForGrade(grade: CurriculumGrade): KonkurTip[] {
  return KONKUR_TIPS.filter(tip => tip.grade === grade);
}

export function tipsForChapter(chapterId: string): KonkurTip[] {
  return KONKUR_TIPS.filter(tip => tip.chapterId === chapterId);
}

export const GENERAL_KONKUR_TIPS = KONKUR_TIPS.filter(tip => tip.grade === null);

// Real exam questions first, newest year first — they're what students
// came for; authored ones follow in file order.
export function questionsForTip(tipId: string): KonkurQuestion[] {
  const year = (q: KonkurQuestion) => (q.source.kind === 'konkur' ? q.source.year : 0);
  return KONKUR_QUESTIONS.filter(q => q.tipIds.includes(tipId)).sort((a, b) => year(b) - year(a));
}

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function toPersianDigits(value: number | string): string {
  return String(value).replace(/\d/g, d => PERSIAN_DIGITS[Number(d)]);
}

// «کنکور ریاضی ۱۴۰۲ — سؤال ۱۲۳» or «تست تألیفی».
export function sourceLabel(source: KonkurSource): string {
  if (source.kind === 'authored') {
    return 'تست تألیفی';
  }
  const track = source.track === 'riazi' ? 'ریاضی' : 'تجربی';
  const abroad = source.abroad ? ' خارج از کشور' : '';
  const system = source.newSystem ? ' نظام جدید' : '';
  const round = source.round ? ` نوبت ${source.round === 1 ? 'اول' : 'دوم'}` : '';
  const number = source.number ? ` — سؤال ${toPersianDigits(source.number)}` : '';
  return `کنکور ${track}${abroad}${system} ${toPersianDigits(source.year)}${round}${number}`;
}
