import type { KonkurGuide, KonkurLine } from '../konkur/types';

// «تمرین‌های کتاب»: the official textbooks' exercises, chapter by chapter.
// The statement is the book's own wording; every solution is written for
// the app. Served by the API (GET /api/v1/public/textbook, edited in the
// admin panel) — nothing is bundled, the last copy is cached offline.
// Like the curriculum this content only exists in Persian.

// «تمرین» at the end of a lesson, «کار در کلاس» or «فعالیت».
export type TextbookSection = 'exercise' | 'classwork' | 'activity';

// One lettered part («الف»، «ب»، ...) of an exercise.
export interface TextbookExercisePart {
  label: string;
  text: KonkurLine[];
  // The short final result, shown after the steps.
  answer?: KonkurLine[];
  solution: KonkurLine[];
}

export interface TextbookExercise {
  id: string;
  // content/curriculum.ts book and chapter ids.
  bookId: string;
  chapterId: string;
  // 1-based lesson («درس») inside the chapter.
  lesson?: number;
  section: TextbookSection;
  // The page and number printed in the book.
  page: number;
  number: number;
  text: KonkurLine[];
  // Relative to the API host (/uploads/x.png) or absolute.
  figureUrl?: string;
  parts?: TextbookExercisePart[];
  answer?: KonkurLine[];
  // May be empty when every part has its own solution.
  solution: KonkurLine[];
  guide?: KonkurGuide;
  // The study notes (konkur tips of this chapter, e.g. from an uploaded
  // booklet) the solution is built on; linked under the solution.
  tipIds?: string[];
  // Open without Premium (the first lesson of every chapter always is).
  free?: boolean;
}
