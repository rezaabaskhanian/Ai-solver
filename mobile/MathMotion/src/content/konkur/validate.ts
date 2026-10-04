import type { KonkurContent } from './index';
import type { KonkurLine, KonkurQuestion, KonkurTip } from './types';

// Defensive parsing of the server payload: anything malformed is dropped
// instead of crashing a screen. Returns null when the payload isn't even
// the right envelope or nothing valid is left (caller keeps what it has).

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';

function validLines(v: unknown): v is KonkurLine[] {
  return (
    Array.isArray(v) && v.every(l => isStr(l) || (isObj(l) && isStr(l.math)))
  );
}

function validTip(v: unknown): v is KonkurTip {
  if (!isObj(v) || !isStr(v.id) || !v.id || !isStr(v.title) || !validLines(v.body)) {
    return false;
  }
  if (v.grade !== null && !(typeof v.grade === 'number' && Number.isInteger(v.grade))) {
    return false;
  }
  if (v.chapterId !== undefined && v.chapterId !== null && !isStr(v.chapterId)) {
    return false;
  }
  if (v.example !== undefined && v.example !== null) {
    if (!isObj(v.example) || !validLines(v.example.question) || !validLines(v.example.solution)) {
      return false;
    }
  }
  return true;
}

function validSource(v: unknown): boolean {
  if (!isObj(v)) {
    return false;
  }
  if (v.kind === 'authored') {
    return true;
  }
  return (
    v.kind === 'konkur' &&
    typeof v.year === 'number' &&
    (v.track === 'riazi' || v.track === 'tajrobi')
  );
}

function validQuestion(v: unknown): v is KonkurQuestion {
  if (!isObj(v) || !isStr(v.id) || !v.id || !isStr(v.text)) {
    return false;
  }
  if (!Array.isArray(v.tipIds) || v.tipIds.length === 0 || !v.tipIds.every(isStr)) {
    return false;
  }
  if (!Array.isArray(v.choices) || v.choices.length !== 4 || !v.choices.every(isStr)) {
    return false;
  }
  if (typeof v.answer !== 'number' || !Number.isInteger(v.answer) || v.answer < 0 || v.answer > 3) {
    return false;
  }
  if (!validLines(v.solution) || !validSource(v.source)) {
    return false;
  }
  if (v.expression !== undefined && v.expression !== null && !isStr(v.expression)) {
    return false;
  }
  if (v.figureUrl !== undefined && v.figureUrl !== null && !isStr(v.figureUrl)) {
    return false;
  }
  return true;
}

// Optional fields may arrive as null (Go omits nothing by default); turn
// them into undefined so the UI's `?.`/`&&` checks behave.
function clean<T extends object>(item: T): T {
  const out: Record<string, unknown> = {};
  Object.entries(item).forEach(([k, val]) => {
    if (val !== null || k === 'grade') {
      out[k] = val;
    }
  });
  return out as T;
}

export function parseKonkurContent(payload: unknown): KonkurContent | null {
  if (!isObj(payload) || !Array.isArray(payload.tips) || !Array.isArray(payload.questions)) {
    return null;
  }
  const tips = payload.tips.filter(validTip).map(clean);
  const tipIds = new Set(tips.map(t => t.id));
  const questions = payload.questions
    .filter(validQuestion)
    .map(clean)
    .filter(q => q.tipIds.some(id => tipIds.has(id)));
  if (tips.length === 0) {
    return null;
  }
  return { tips, questions };
}
