import type { ImageSourcePropType } from 'react-native';

import type { CurriculumGrade } from '../curriculum';

// «نکات کنکوری و تست‌زنی»: short test-taking tips, each tied to a
// textbook chapter (content/curriculum.ts ids), plus multiple-choice
// questions tagged with the tips they use. Like the curriculum, this
// content only exists in Persian, so it isn't routed through i18n.

// One line of rich text: Persian prose, or a math line rendered
// left-to-right by MathExpression (inline math inside RTL prose would
// be reordered, so math always gets its own line).
export type KonkurLine = string | { math: string };

export interface KonkurTip {
  id: string;
  // null = a general test-taking tip, shown for every grade.
  grade: CurriculumGrade | null;
  chapterId?: string;
  title: string;
  body: KonkurLine[];
  // Optional long-form explanation («توضیح کامل»), collapsed by default;
  // `body` stays the short summary.
  details?: KonkurLine[];
  example?: {
    question: KonkurLine[];
    solution: KonkurLine[];
  };
}

export type KonkurTrack = 'riazi' | 'tajrobi';

// 'authored' questions are written for the app in the style of the
// exam; 'konkur' ones are transcribed from the official Sanjesh booklets
// and must match them exactly (year, track, question number, key).
export type KonkurSource =
  | { kind: 'authored' }
  | {
      kind: 'konkur';
      year: number;
      track: KonkurTrack;
      number?: number;
      abroad?: boolean;
      // 1398 ran two curricula side by side; this marks the new one.
      newSystem?: boolean;
      // Since 1402 the exam runs twice a year (نوبت اول / نوبت دوم).
      round?: 1 | 2;
    };

// «مسیر حل»: how to approach a question before reading its solution —
// what it gives, what it asks, hints revealed one at a time (general to
// specific, never the answer), and the trap most students fall into.
// Every part is optional; a question without a guide still gets the tip
// hint and the step-by-step solution.
export interface KonkurGuide {
  given?: KonkurLine[];
  asked?: KonkurLine[];
  hints?: KonkurLine[][];
  trap?: KonkurLine[];
}

export interface KonkurQuestion {
  id: string;
  // The tips this question is solved with — the first is the main one.
  tipIds: string[];
  text: string;
  expression?: string;
  // The figure the question refers to, cropped from the booklet page
  // (content/konkur/figures/). The text says what is drawn, so the
  // question stays answerable if the image can't be shown.
  figure?: ImageSourcePropType;
  // Server content: the figure as a path relative to the API host
  // (/uploads/x.png) or an absolute URL. The UI shows `figure` first.
  figureUrl?: string;
  choices: [string, string, string, string];
  // Choices are math (rendered left-to-right) unless set to false.
  choicesMath?: boolean;
  answer: 0 | 1 | 2 | 3;
  solution: KonkurLine[];
  guide?: KonkurGuide;
  source: KonkurSource;
}
