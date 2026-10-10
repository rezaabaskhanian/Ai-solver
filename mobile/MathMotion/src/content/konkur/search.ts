import { sourceLabel } from './index';
import type { KonkurContent, KonkurLine, KonkurQuestion, KonkurTip } from './types';

// Search over tips and questions. Persian text has many spellings of the
// same word, so both the query and the content are normalized first:
// Arabic ي/ك -> ی/ک, no ZWNJ / diacritics / tatweel, and Persian, Arabic
// and English digits all count as the same digits.

const DIGIT_MAP: Record<string, string> = {};
'۰۱۲۳۴۵۶۷۸۹'.split('').forEach((ch, i) => {
  DIGIT_MAP[ch] = String(i);
});
'٠١٢٣٤٥٦٧٨٩'.split('').forEach((ch, i) => {
  DIGIT_MAP[ch] = String(i);
});

export function normalizeSearchText(value: string): string {
  return value
    .replace(/[۰-۹٠-٩]/g, d => DIGIT_MAP[d] ?? d)
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ۀ/g, 'ه')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ی')
    .replace(/[‌‍‎‏ً-ٰٟـ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function tokensOf(query: string): string[] {
  const normalized = normalizeSearchText(query);
  return normalized ? normalized.split(' ') : [];
}

function linesText(lines: KonkurLine[] | undefined): string {
  return (lines ?? []).map(line => (typeof line === 'string' ? line : line.math)).join(' ');
}

function tipFields(tip: KonkurTip) {
  return {
    title: normalizeSearchText(tip.title),
    rest: normalizeSearchText(`${linesText(tip.body)} ${linesText(tip.details)}`),
  };
}

function questionFields(question: KonkurQuestion) {
  return {
    title: normalizeSearchText(`${sourceLabel(question.source)} ${question.source.kind === 'konkur' ? question.source.year : ''}`),
    rest: normalizeSearchText(`${question.text} ${question.expression ?? ''}`),
  };
}

// Every token must occur somewhere; a token in the title / source label
// scores higher, so «کنکور ۱۴۰۲» lists that year's questions first.
function scoreOf(fields: { title: string; rest: string }, tokens: string[]): number {
  let score = 0;
  for (const token of tokens) {
    if (fields.title.includes(token)) {
      score += 3;
    } else if (fields.rest.includes(token)) {
      score += 1;
    } else {
      return 0;
    }
  }
  return score;
}

export interface KonkurSearchResults {
  tips: KonkurTip[];
  questions: KonkurQuestion[];
}

export const MIN_SEARCH_LENGTH = 2;
const MAX_RESULTS = 30;

export function searchKonkur(content: KonkurContent, query: string, limit = MAX_RESULTS): KonkurSearchResults {
  const tokens = tokensOf(query);
  if (tokens.length === 0 || normalizeSearchText(query).length < MIN_SEARCH_LENGTH) {
    return { tips: [], questions: [] };
  }
  const ranked = <T>(items: T[], fields: (item: T) => { title: string; rest: string }): T[] =>
    items
      .map((item, index) => ({ item, index, score: scoreOf(fields(item), tokens) }))
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, limit)
      .map(entry => entry.item);
  return {
    tips: ranked(content.tips, tipFields),
    questions: ranked(content.questions, questionFields),
  };
}
