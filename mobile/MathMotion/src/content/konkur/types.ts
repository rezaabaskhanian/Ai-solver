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
  choices: [string, string, string, string];
  // Choices are math (rendered left-to-right) unless set to false.
  choicesMath?: boolean;
  answer: 0 | 1 | 2 | 3;
  solution: KonkurLine[];
  source: KonkurSource;
}
