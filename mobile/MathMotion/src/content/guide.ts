// The «راهنمای استفاده» (how to use the app) screen in the side drawer.
// Texts live in i18n under guide.<section>.<item>; this file only fixes
// the order, icons and — for the typing section — the exact syntax.
//
// Every `example` is sent through the normal Solve flow when tapped, so it
// must be something the math engine parses (same syntax as mathKeys.ts).
import type { IconName } from '../components/common/Icon';

export interface GuideTypingRow {
  id: string;
  symbol: string;
  example: string;
}

export interface GuideSection {
  id: 'typing' | 'scan' | 'solution' | 'learn' | 'quota';
  icon: IconName;
  // i18n keys under guide.<section id>.items.<item>
  items?: string[];
  typingRows?: GuideTypingRow[];
}

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'typing',
    icon: 'keyboard',
    items: ['keys', 'digits', 'multiply'],
    typingRows: [
      { id: 'power', symbol: 'x²', example: 'x^2 - 4 = 0' },
      { id: 'sqrt', symbol: '√', example: 'sqrt(16) + 2' },
      { id: 'times', symbol: '× ÷', example: '3*4/2' },
      { id: 'fraction', symbol: '½', example: '1/2 + 1/3' },
      { id: 'pi', symbol: 'π', example: 'sin(pi/6)' },
      { id: 'derivative', symbol: 'd/dx', example: 'd/dx(x^3 + 2x)' },
      { id: 'integral', symbol: '∫', example: '∫ 2x dx' },
      { id: 'limit', symbol: 'lim', example: 'lim(x→2) (x^2 - 4)/(x - 2)' },
      { id: 'log', symbol: 'log', example: 'log_2(x) + log_2(x - 2) = 3' },
      { id: 'sets', symbol: '∪ ∩', example: 'A={1,2,3}, B={2,3,4}, A∩B' },
      { id: 'vectors', symbol: '[ , ]', example: 'A(1, 2), B(4, 6), AB' },
      { id: 'graphs', symbol: 'K₆', example: 'degree_sequence(3, 3, 2, 2, 2)' },
    ],
  },
  {
    id: 'scan',
    icon: 'photo-camera',
    items: ['light', 'frame', 'flat', 'review'],
  },
  {
    id: 'solution',
    icon: 'format-list-numbered',
    items: ['steps', 'play', 'verified', 'share'],
  },
  {
    id: 'learn',
    icon: 'school',
    items: ['check', 'quiz', 'practice', 'topics'],
  },
  {
    id: 'quota',
    icon: 'star',
    items: ['free', 'premium'],
  },
];
