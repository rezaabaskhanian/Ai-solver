// Mirrors the Go API's JSON shapes (backend/go-api/internal/service/problem/dto)
// so the mobile client and backend never drift silently.

export type ProblemType =
  | 'linear_equation'
  | 'quadratic_equation'
  | 'expression'
  | 'arithmetic'
  | 'arithmetic_equation'
  | 'derivative'
  | 'integral'
  | 'trig_expression'
  | 'limit'
  | 'log_equation'
  | 'exponential_equation'
  | 'set_operation'
  | 'vector'
  | 'geometry'
  | 'graph'
  | 'function_plot'
  | (string & {});

export interface ParseResult {
  problem: string;
  type: ProblemType;
  confidence: number;
}

export interface SolutionStep {
  id: number;
  before: string;
  after: string;
  operation: string;
  value?: string | null;
  target?: string | null;
  explanation: string;
}

// A "function_plot" answer's curve (backend/math-engine/app/solver/plot.py).
// `points` are [x, y] samples; y is null where the line must break (an
// asymptote, a jump, or where the function isn't defined).
export interface PlotFeature {
  kind: 'root' | 'y_intercept' | 'max' | 'min';
  x: number;
  y: number;
  label: string;
}

export interface PlotData {
  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;
  points: [number, number | null][];
  features: PlotFeature[];
  vertical_asymptotes: number[];
  horizontal_asymptotes: number[];
}

// Note: the backend's SolveResult (backend/go-api/internal/service/problem/dto)
// does not echo the problem string back — the caller already has the raw
// input it sent, so the Solution screen receives it via navigation params
// instead of expecting it here.
export interface SolveResult {
  problem_id: string;
  answer: string;
  verified: boolean;
  type: ProblemType;
  steps: SolutionStep[];
  plot?: PlotData | null;
}

// Includes the full step breakdown (not just the final answer) so
// tapping a history item can reopen the Solution screen directly,
// without re-calling the Math Engine for a problem that was already
// solved and verified.
export interface HistoryItem {
  problem_id: string;
  problem: string;
  problem_type: ProblemType;
  answer: string;
  verified: boolean;
  steps: SolutionStep[];
  plot?: PlotData | null;
  created_at: string;
}

export interface ApiErrorBody {
  error: string;
  message: string;
}

export type StepStatus = 'correct' | 'incorrect';

// Mirrors backend/go-api/internal/service/problem/dto.CheckResult, which
// mirrors backend/math-engine/app/solver/check.py's CheckOutcome.
export interface CheckResult {
  status: 'correct_and_solved' | 'correct_so_far' | 'incorrect';
  step_statuses: StepStatus[];
  first_error_index: number | null;
  next_step_hint: SolutionStep | null;
  correct_answer: string;
}

export interface PracticeResult {
  problem: string;
  type: ProblemType;
}
