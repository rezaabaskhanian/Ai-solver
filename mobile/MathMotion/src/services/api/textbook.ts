import { apiClient } from './client';

// Public (no login needed) — see backend GET /api/v1/public/textbook. Its
// version is the konkur content version (fetchKonkurVersion).
export async function fetchTextbookPayload(): Promise<{ version: number; exercises: unknown }> {
  const { data } = await apiClient.get('/api/v1/public/textbook');
  return data;
}
