import { apiClient } from './client';

// Public (no login needed) — see backend GET /api/v1/public/konkur.
export async function fetchKonkurVersion(): Promise<number> {
  const { data } = await apiClient.get<{ version: number }>('/api/v1/public/konkur/version');
  return data.version;
}

export async function fetchKonkurPayload(): Promise<{ version: number; tips: unknown; questions: unknown }> {
  const { data } = await apiClient.get('/api/v1/public/konkur');
  return data;
}
