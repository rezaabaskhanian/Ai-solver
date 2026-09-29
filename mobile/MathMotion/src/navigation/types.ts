import type { NavigatorScreenParams } from '@react-navigation/native';

import type { TopicId } from '../content/topics';
import type { ExamConfig, ExamQuestion } from '../services/exam/buildExam';
import type { SolveResult } from '../types/problem';

// The Solution screen receives an already-fetched SolveResult: the Solve
// button on ProblemInput calls POST /problems/solve itself (PRD section 5
// flow: Solve -> Math Engine -> Solution JSON happens before the Solution
// screen ever mounts), so there's no second network round trip or loading
// state to build here.
export type RootStackParamList = {
  Home: undefined;
  // initialProblem pre-fills the input (a topic's example) — the user
  // still taps Solve/Quiz/Check themselves, so quota/paywall stay in play.
  ProblemInput: { initialProblem?: string } | undefined;
  Solution: { problem: string; result: SolveResult };
  History: undefined;
  Scan: undefined;
  // Shown after Scan recognizes the photo, before anything is solved
  // (PRD section 8 confirmation step) — problems is one string per
  // distinct problem found in the photo.
  RecognizedProblems: { photoUri: string; problems: string[] };
  // photoUri is the local file path of the captured photo — registered
  // as the AR image-tracking target so the step animation can anchor to
  // it (see screens/ArSolution/ArSolutionScreen.tsx).
  ArSolution: { photoUri: string; problem: string; result: SolveResult };
  CheckSteps: { problem: string };
  // Interactive Learning (PRD section 20): same already-solved result as
  // Solution, but revealed one multiple-choice "what's next?" question at
  // a time instead of all at once.
  Quiz: { problem: string; result: SolveResult };
  // «مباحث درسی»: the topic list, and one topic's intro + examples.
  Topics: undefined;
  Topic: { topicId: TopicId };
  // «آمادگی برای امتحان»: pick grade + chapters, take a generated
  // multiple-choice exam, see the score. Questions travel in params so
  // the result screen shows exactly what was asked.
  // Optional preselection, e.g. from a textbook chapter on Topics.
  ExamSetup: { grade?: number; chapterIds?: string[] } | undefined;
  Exam: { config: ExamConfig };
  ExamResult: { config: ExamConfig; questions: ExamQuestion[]; answers: (number | null)[] };
  // «ماشین‌حساب هندسه»: pick a shape and measurements; solved like any
  // typed problem.
  Geometry: undefined;
  // «راهنمای استفاده»: typing syntax, scan tips and feature overview.
  Guide: undefined;
  // Appearance: light/dark mode, accent color and text color.
  Settings: undefined;
};

// The side drawer wraps the whole stack as a single "Main" screen, so
// opening History/Topics from it pushes onto the same stack (Back works
// as usual) instead of swapping in a separate drawer page.
export type DrawerParamList = {
  Main: NavigatorScreenParams<RootStackParamList> | undefined;
};
