import type { KonkurContent, KonkurQuestion } from './index';
import { dayIndexOf } from './dayIndex';
import type { KonkurProgress } from './progress';

// «مرور امروز»: spaced review of wrong answers. A mistake comes back
// after 1, 3, 7 and then 14 days. Reviewing it right moves it one step up
// the ladder; getting it wrong again sends it back to the first step.
// After the last step answered right it is considered learned and leaves
// the schedule. Pure logic — the store (store/useKonkurStudyStore.ts)
// only persists it.
//
// TODO(reminders): push notifications are out of scope for now (they
// need a native dependency). When added, schedule one local reminder per
// day at `nextDueDay(review, progress)` from a single place — hook into
// the store's recordAnswer / app foreground — and nowhere else.

export const REVIEW_VERSION = 1;
export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14] as const;

export interface ReviewItem {
  // Index into REVIEW_INTERVAL_DAYS: the step this item is waiting on.
  level: number;
  // Local day index (dayIndexOf) on which the item becomes due.
  dueDay: number;
}

export interface ReviewState {
  version: typeof REVIEW_VERSION;
  items: Record<string, ReviewItem>;
}

export function emptyReview(): ReviewState {
  return { version: REVIEW_VERSION, items: {} };
}

// Called for every answer. Wrong: (re)start the ladder, due tomorrow.
// Right: only counts when the item is due — practicing early changes
// nothing — then moves up one step or, past the last step, is dropped.
export function reviewAfterAnswer(
  review: ReviewState,
  questionId: string,
  correct: boolean,
  today: number,
): ReviewState {
  const current = review.items[questionId];
  if (!correct) {
    return {
      ...review,
      items: { ...review.items, [questionId]: { level: 0, dueDay: today + REVIEW_INTERVAL_DAYS[0] } },
    };
  }
  if (!current || current.dueDay > today) {
    return review;
  }
  const level = current.level + 1;
  const items = { ...review.items };
  if (level >= REVIEW_INTERVAL_DAYS.length) {
    delete items[questionId];
  } else {
    items[questionId] = { level, dueDay: today + REVIEW_INTERVAL_DAYS[level] };
  }
  return { ...review, items };
}

// Mistakes made before this feature existed have no schedule: treat
// the latest wrong answer as the start of the ladder.
function effectiveItems(review: ReviewState, progress: KonkurProgress): Record<string, ReviewItem> {
  const items: Record<string, ReviewItem> = { ...review.items };
  for (const [id, p] of Object.entries(progress.questions)) {
    if (!p.lastCorrect && !items[id]) {
      items[id] = { level: 0, dueDay: dayIndexOf(p.lastAt) + REVIEW_INTERVAL_DAYS[0] };
    }
  }
  return items;
}

export interface DueReview {
  question: KonkurQuestion;
  level: number;
  // Days past the due date (0 = due today).
  overdueDays: number;
}

// Questions waiting for review today, most overdue first. Ids that
// vanished from the content are skipped (but kept in the schedule).
export function dueReviews(
  review: ReviewState,
  progress: KonkurProgress,
  content: KonkurContent,
  today: number,
): DueReview[] {
  const byId = new Map(content.questions.map(q => [q.id, q]));
  const items = effectiveItems(review, progress);
  const due: DueReview[] = [];
  for (const [id, item] of Object.entries(items)) {
    const question = byId.get(id);
    if (question && item.dueDay <= today) {
      due.push({ question, level: item.level, overdueDays: today - item.dueDay });
    }
  }
  return due.sort((a, b) => b.overdueDays - a.overdueDays || a.question.id.localeCompare(b.question.id));
}

// The earliest day anything is due (null when nothing is scheduled) —
// for the future reminder hook.
export function nextDueDay(review: ReviewState, progress: KonkurProgress): number | null {
  const days = Object.values(effectiveItems(review, progress)).map(i => i.dueDay);
  return days.length > 0 ? Math.min(...days) : null;
}

function parseItem(raw: unknown): ReviewItem | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const r = raw as Record<string, unknown>;
  if (
    typeof r.level !== 'number' ||
    !Number.isInteger(r.level) ||
    r.level < 0 ||
    r.level >= REVIEW_INTERVAL_DAYS.length ||
    typeof r.dueDay !== 'number' ||
    !Number.isInteger(r.dueDay)
  ) {
    return null;
  }
  return { level: r.level, dueDay: r.dueDay };
}

// Stored data is untrusted: bad items are dropped one by one, anything
// else (or another version) gives an empty schedule.
export function parseReview(raw: unknown): ReviewState {
  if (!raw || typeof raw !== 'object') {
    return emptyReview();
  }
  const r = raw as Record<string, unknown>;
  if (r.version !== REVIEW_VERSION || !r.items || typeof r.items !== 'object' || Array.isArray(r.items)) {
    return emptyReview();
  }
  const items: Record<string, ReviewItem> = {};
  for (const [id, value] of Object.entries(r.items as Record<string, unknown>)) {
    const item = parseItem(value);
    if (item) {
      items[id] = item;
    }
  }
  return { version: REVIEW_VERSION, items };
}
