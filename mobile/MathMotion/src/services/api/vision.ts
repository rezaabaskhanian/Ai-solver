import { apiClient } from './client';
import { trackEvent } from '../telemetry';
import { toApiError } from './apiError';

// The Go API's REQUEST_TIMEOUT_MS default (see client.ts) is sized for
// quick JSON calls — a vision model reading a photo takes noticeably
// longer, so this call gets its own longer timeout.
const RECOGNIZE_TIMEOUT_MS = 30000;

export async function recognizeEquations(imageBase64: string, mediaType = 'image/jpeg'): Promise<string[]> {
  trackEvent('scan_used');
  try {
    const { data } = await apiClient.post<{ recognized_problems: string[] }>(
      '/api/v1/problems/recognize',
      { image_base64: imageBase64, media_type: mediaType },
      { timeout: RECOGNIZE_TIMEOUT_MS },
    );
    return data.recognized_problems;
  } catch (error) {
    throw toApiError(error);
  }
}
