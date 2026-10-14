import { CURRICULUM, type CurriculumBook, type CurriculumChapter, type CurriculumGrade } from '../curriculum';
import { cleanGuide, validLines } from '../konkur/validate';
import type { KonkurLine } from '../konkur/types';
import type { TextbookExercise, TextbookExercisePart, TextbookSection } from './types';

export type { TextbookExercise, TextbookExercisePart, TextbookSection } from './types';

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isPositiveInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0;

const SECTIONS: TextbookSection[] = ['exercise', 'classwork', 'activity'];

const nonEmptyLines = (v: unknown): KonkurLine[] | undefined =>
  validLines(v) && v.length > 0 ? v : undefined;

function cleanPart(v: unknown): TextbookExercisePart | null {
  if (!isObj(v) || !isStr(v.label) || !validLines(v.text) || !validLines(v.solution)) {
    return null;
  }
  const part: TextbookExercisePart = { label: v.label, text: v.text, solution: v.solution };
  const answer = nonEmptyLines(v.answer);
  if (answer) {
    part.answer = answer;
  }
  return part;
}

// One exercise from the server, or null when it can't be shown. Optional
// extras (answer, guide, figure) are dropped when malformed instead of
// losing the exercise.
export function cleanExercise(v: unknown): TextbookExercise | null {
  if (
    !isObj(v) ||
    !isStr(v.id) ||
    !v.id ||
    !isStr(v.bookId) ||
    !isStr(v.chapterId) ||
    !isPositiveInt(v.page) ||
    !isPositiveInt(v.number) ||
    !validLines(v.text) ||
    !validLines(v.solution)
  ) {
    return null;
  }
  const parts = Array.isArray(v.parts) ? v.parts.map(cleanPart) : [];
  if (parts.some(p => p === null)) {
    return null;
  }
  const ex: TextbookExercise = {
    id: v.id,
    bookId: v.bookId,
    chapterId: v.chapterId,
    section: SECTIONS.includes(v.section as TextbookSection) ? (v.section as TextbookSection) : 'exercise',
    page: v.page,
    number: v.number,
    text: v.text,
    solution: v.solution,
  };
  if (isPositiveInt(v.lesson)) {
    ex.lesson = v.lesson;
  }
  if (parts.length > 0) {
    ex.parts = parts as TextbookExercisePart[];
  }
  if (ex.text.length === 0 && !ex.parts) {
    return null;
  }
  const answer = nonEmptyLines(v.answer);
  if (answer) {
    ex.answer = answer;
  }
  if (isStr(v.figureUrl) && v.figureUrl) {
    ex.figureUrl = v.figureUrl;
  }
  const guide = cleanGuide(v.guide);
  if (guide) {
    ex.guide = guide;
  }
  if (Array.isArray(v.tipIds)) {
    const tipIds = v.tipIds.filter((id): id is string => isStr(id) && id !== '');
    if (tipIds.length > 0) {
      ex.tipIds = tipIds;
    }
  }
  if (v.free === true) {
    ex.free = true;
  }
  return ex;
}

// The GET /api/v1/public/textbook envelope; null when it isn't one.
export function parseTextbookPayload(payload: unknown): TextbookExercise[] | null {
  if (!isObj(payload) || !Array.isArray(payload.exercises)) {
    return null;
  }
  return payload.exercises.map(cleanExercise).filter((e): e is TextbookExercise => e !== null);
}

// Book order: by page, then «فعالیت» / «کار در کلاس» / «تمرین» as they
// appear on the page, then number.
const SECTION_ORDER: Record<TextbookSection, number> = { activity: 0, classwork: 1, exercise: 2 };

export function compareExercises(a: TextbookExercise, b: TextbookExercise): number {
  return a.page - b.page || SECTION_ORDER[a.section] - SECTION_ORDER[b.section] || a.number - b.number;
}

export function exercisesForChapter(exercises: TextbookExercise[], chapterId: string): TextbookExercise[] {
  return exercises.filter(e => e.chapterId === chapterId).sort(compareExercises);
}

export interface ExerciseLessonGroup {
  // 0 = not tied to a lesson.
  lesson: number;
  title: string | null;
  exercises: TextbookExercise[];
}

// A chapter's exercises, one group per lesson (in lesson order; exercises
// without a lesson come last).
export function groupByLesson(exercises: TextbookExercise[], chapter: CurriculumChapter | undefined): ExerciseLessonGroup[] {
  const groups = new Map<number, TextbookExercise[]>();
  for (const e of exercises) {
    const key = e.lesson ?? 0;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === 0 ? 1 : b === 0 ? -1 : a - b))
    .map(([lesson, list]) => ({
      lesson,
      title: lesson > 0 ? chapter?.lessons[lesson - 1] ?? null : null,
      exercises: list,
    }));
}

// Free without Premium: marked free, or in a chapter's first lesson (a
// chapter without lessons is free as a whole).
export function isExerciseFree(e: TextbookExercise, chapter: CurriculumChapter | undefined): boolean {
  if (e.free || e.lesson === 1) {
    return true;
  }
  return chapter !== undefined && chapter.lessons.length === 0;
}

export interface ChapterLocation {
  grade: CurriculumGrade;
  book: CurriculumBook;
  chapter: CurriculumChapter;
  // 1-based chapter number inside the book.
  number: number;
}

export function findChapter(chapterId: string): ChapterLocation | undefined {
  for (const g of CURRICULUM) {
    for (const book of g.books) {
      const i = book.chapters.findIndex(c => c.id === chapterId);
      if (i >= 0) {
        return { grade: g.grade, book, chapter: book.chapters[i], number: i + 1 };
      }
    }
  }
  return undefined;
}

// A single math line the engine can take as the whole problem (e.g. an
// equation to solve), for the «حل با موتور» shortcut.
export function engineCandidates(e: TextbookExercise): string[] {
  const lines = [...e.text, ...(e.parts ?? []).flatMap(p => p.text)];
  return lines.filter((l): l is { math: string } => typeof l !== 'string').map(l => l.math);
}
