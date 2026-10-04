import { RIAZI_1396 } from './riazi1396';
import { RIAZI_1398 } from './riazi1398';
import { RIAZI_1399 } from './riazi1399';
import { RIAZI_1399_ABROAD } from './riazi1399abroad';
import { RIAZI_1400 } from './riazi1400';
import { RIAZI_1402A } from './riazi1402a';
import { RIAZI_1402B } from './riazi1402b';
import { RIAZI_1403A } from './riazi1403a';
import { RIAZI_1404A } from './riazi1404a';
import { RIAZI_1404B } from './riazi1404b';
import { RIAZI_1405 } from './riazi1405';
import type { KonkurQuestion } from './types';

// Real Konkur questions, one file per exam, transcribed from the
// booklets in mobile/MathMotion/.source_kunkor. Question text and
// choices are as printed (an equation may move to the `expression`
// line); solutions are our own, written around the tip they use. Every
// key is checked against the published worked solution and re-derived;
// questions that need a figure, come from books the app doesn't cover
// yet (هندسه), or couldn't be verified are left out and listed in each
// file's header.
export const PAST_QUESTIONS: KonkurQuestion[] = [...RIAZI_1405, ...RIAZI_1404B, ...RIAZI_1404A, ...RIAZI_1403A, ...RIAZI_1402B, ...RIAZI_1402A, ...RIAZI_1400, ...RIAZI_1399, ...RIAZI_1399_ABROAD,...RIAZI_1398, ...RIAZI_1396];
