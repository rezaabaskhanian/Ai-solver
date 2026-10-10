// Pure scoring + timing helpers for the exam: no React, no storage.
// Konkur-style marking: +3 for a correct answer, -1 for a wrong one,
// 0 for a blank (skipped) question.

export const POINTS_CORRECT = 3;
export const POINTS_WRONG = -1;

// Default time budget per question when the exam doesn't set its own.
export const DEFAULT_SECONDS_PER_QUESTION = 60;
// Full konkur-year mode: 1.5 minutes per question (editable).
export const KONKUR_SECONDS_PER_QUESTION = 90;
// The clock turns to the warning colour in the last minute.
export const WARNING_SECONDS = 60;

export interface Tally {
  correct: number;
  wrong: number;
  blank: number;
  total: number;
  // 3*correct - wrong.
  points: number;
  // points / (3*total) * 100, rounded to one decimal; can be negative.
  percent: number;
}

// answers[i] is the chosen choice index for answerKeys[i]; null (or a
// missing entry) = left blank.
export function tally(answerKeys: number[], answers: (number | null | undefined)[]): Tally {
  let correct = 0;
  let wrong = 0;
  let blank = 0;
  answerKeys.forEach((key, i) => {
    const a = answers[i];
    if (a === null || a === undefined) {
      blank += 1;
    } else if (a === key) {
      correct += 1;
    } else {
      wrong += 1;
    }
  });
  const total = answerKeys.length;
  const points = POINTS_CORRECT * correct + POINTS_WRONG * wrong;
  const percent = total ? Math.round((points / (POINTS_CORRECT * total)) * 1000) / 10 : 0;
  return { correct, wrong, blank, total, points, percent };
}

export interface GroupScore {
  key: string;
  correct: number;
  wrong: number;
  blank: number;
  total: number;
  // Plain share of correct answers in the group, 0-100, rounded.
  correctPercent: number;
}

// Per-group (chapter / topic) counts, weakest group first. Items with an
// empty key are ignored.
export function groupScores(
  items: { key: string; answerIndex: number }[],
  answers: (number | null | undefined)[],
): GroupScore[] {
  const map = new Map<string, GroupScore>();
  items.forEach((item, i) => {
    if (!item.key) {
      return;
    }
    const entry =
      map.get(item.key) ?? { key: item.key, correct: 0, wrong: 0, blank: 0, total: 0, correctPercent: 0 };
    const a = answers[i];
    entry.total += 1;
    if (a === null || a === undefined) {
      entry.blank += 1;
    } else if (a === item.answerIndex) {
      entry.correct += 1;
    } else {
      entry.wrong += 1;
    }
    map.set(item.key, entry);
  });
  return [...map.values()]
    .map(g => ({ ...g, correctPercent: Math.round((g.correct / g.total) * 100) }))
    .sort((a, b) => a.correctPercent - b.correctPercent);
}

// ---------- timing ----------

// Whole seconds left until the deadline (a timestamp in ms), never negative.
export function remainingSeconds(deadlineMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
}

// Seconds spent, clamped to [0, durationSec].
export function elapsedSeconds(startedAtMs: number, nowMs: number, durationSec: number): number {
  const spent = Math.round((nowMs - startedAtMs) / 1000);
  return Math.min(Math.max(0, spent), durationSec);
}

export function isWarning(remaining: number): boolean {
  return remaining <= WARNING_SECONDS;
}

// 75 -> "01:15", 3600 -> "60:00".
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

// Average seconds per question, one decimal; 0 for an empty exam.
export function averageSecondsPerQuestion(elapsedSec: number, totalQuestions: number): number {
  return totalQuestions > 0 ? Math.round((elapsedSec / totalQuestions) * 10) / 10 : 0;
}

export function defaultDurationSec(questionCount: number, secondsPerQuestion = DEFAULT_SECONDS_PER_QUESTION): number {
  return Math.max(1, questionCount) * secondsPerQuestion;
}

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

// "12:05" -> "۱۲:۰۵" (and Latin digits unchanged) for Persian UI.
export function localizeDigits(value: number | string, persian: boolean): string {
  const text = String(value).replace('-', persian ? '−' : '-');
  return persian ? text.replace(/\d/g, d => PERSIAN_DIGITS[Number(d)]) : text;
}
