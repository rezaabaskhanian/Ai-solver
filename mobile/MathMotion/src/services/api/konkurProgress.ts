import { apiClient } from './client';

// Device/account authenticated — backend GET/PUT /api/v1/konkur/progress.
export interface ProgressDoc {
  revision: number;
  updated_at: string;
  data: unknown;
}

export async function fetchProgress(): Promise<ProgressDoc> {
  const { data } = await apiClient.get<ProgressDoc>('/api/v1/konkur/progress');
  return data;
}

export type PushResult = { conflict: false; doc: ProgressDoc } | { conflict: true; doc: ProgressDoc };

// Stores `data` if the server is still at `revision`; a 409 returns the
// server's current document instead of throwing.
export async function pushProgress(revision: number, data: unknown): Promise<PushResult> {
  const response = await apiClient.put<ProgressDoc>(
    '/api/v1/konkur/progress',
    { revision, data },
    { validateStatus: status => (status >= 200 && status < 300) || status === 409 },
  );
  return { conflict: response.status === 409, doc: response.data };
}

export interface ExamResultPayload {
  paper_key: string;
  percent: number;
  correct: number;
  wrong: number;
  blank: number;
  seconds: number;
}

export interface PaperStats {
  count: number;
  // Share (0-100) of the other participants with a lower percent; null if
  // the server has no result of yours for this paper.
  percentile: number | null;
  median: number;
  p25: number;
  p75: number;
  // Average percent of the paper's participants.
  // Optional: the deployed server may predate these fields.
  mean?: number;
  // Sanjesh-style taraz (5000 + 1000×z against the participants);
  // null without enough participants, without spread, or without your result.
  taraz?: number | null;
}

// One row of GET /api/v1/konkur/exam-results/stats without a paper_key:
// the server only lists papers with enough participants (>= 5).
export interface PaperSummary {
  paper_key: string;
  count: number;
  mean: number;
}

export async function submitExamResult(payload: ExamResultPayload): Promise<void> {
  await apiClient.post('/api/v1/konkur/exam-results', payload);
}

export async function fetchPaperStats(paperKey: string): Promise<PaperStats> {
  const { data } = await apiClient.get<PaperStats>('/api/v1/konkur/exam-results/stats', {
    params: { paper_key: paperKey },
  });
  return data;
}

export async function fetchAllPaperStats(): Promise<PaperSummary[]> {
  const { data } = await apiClient.get<PaperSummary[]>('/api/v1/konkur/exam-results/stats');
  return data;
}
