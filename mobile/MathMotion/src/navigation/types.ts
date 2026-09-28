import type { SolveResult } from '../types/problem';

// The Solution screen receives an already-fetched SolveResult: the Solve
// button on ProblemInput calls POST /problems/solve itself (PRD section 5
// flow: Solve -> Math Engine -> Solution JSON happens before the Solution
// screen ever mounts), so there's no second network round trip or loading
// state to build here.
export type RootStackParamList = {
  Home: undefined;
  ProblemInput: undefined;
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
};
