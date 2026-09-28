import type {
  CheckResult,
  HistoryItem,
  ParseResult,
  PracticeResult,
  ProblemType,
  SolveResult,
} from '../../types/problem';
import { apiClient } from './client';
import { toApiError } from './apiError';

export async function parseProblem(input: string): Promise<ParseResult> {
  try {
    const { data } = await apiClient.post<ParseResult>('/api/v1/problems/parse', { input });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function solveProblem(problem: string): Promise<SolveResult> {
  try {
    const { data } = await apiClient.post<SolveResult>('/api/v1/problems/solve', { problem });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function checkSteps(problem: string, studentSteps: string[]): Promise<CheckResult> {
  try {
    const { data } = await apiClient.post<CheckResult>('/api/v1/problems/check', {
      problem,
      student_steps: studentSteps,
    });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function practiceProblem(type: ProblemType): Promise<PracticeResult> {
  try {
    const { data } = await apiClient.post<PracticeResult>('/api/v1/problems/practice', { type });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function fetchHistory(limit = 20, offset = 0): Promise<HistoryItem[]> {
  try {
    const { data } = await apiClient.get<{ items: HistoryItem[] }>('/api/v1/history', {
      params: { limit, offset },
    });
    return data.items;
  } catch (error) {
    throw toApiError(error);
  }
}
