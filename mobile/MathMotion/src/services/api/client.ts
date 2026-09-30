import axios, { type AxiosRequestConfig } from 'axios';

import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../../config/env';
import { useLanguageStore } from '../../store/useLanguageStore';
import { getDeviceId, saveDeviceId } from './deviceId';
import { clearTokens, getAccessToken, getRefreshToken, saveTokens, type AuthTokens } from './tokens';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

// Called when the login can't be renewed (refresh token expired or
// revoked) — the auth store signs out, which shows the login screen. Set
// by useAuthStore rather than imported, to avoid an import cycle.
let onSessionExpired: (() => void) | null = null;
export function setOnSessionExpired(callback: () => void) {
  onSessionExpired = callback;
}

apiClient.interceptors.request.use(async config => {
  const deviceId = await getDeviceId();
  if (deviceId) {
    config.headers['X-Device-Id'] = deviceId;
  }
  // The logged-in account (backend middleware.Device), wherever it logs in from.
  const accessToken = await getAccessToken();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  // The math engine words step explanations in this language (PRD
  // section 18). Read per request, so it follows the UI language.
  config.headers['Accept-Language'] = useLanguageStore.getState().language;
  return config;
});

// If several requests get a 401 at once they all wait for one refresh —
// with rotating refresh tokens, a second refresh would use an already
// replaced token and wrongly log the user out (same as LingoFlow).
let refreshInFlight: Promise<boolean> | null = null;

function refreshTokens(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight;
  }
  refreshInFlight = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      return false;
    }
    try {
      // Plain axios, not apiClient: this call must not go through the
      // interceptors (no stale Bearer header, no 401 → refresh loop).
      const { data } = await axios.post<{ tokens: AuthTokens }>(
        `${API_BASE_URL}/api/v1/auth/refresh`,
        { refresh_token: refreshToken },
        { timeout: REQUEST_TIMEOUT_MS },
      );
      await saveTokens(data.tokens);
      return true;
    } catch (error) {
      // Only a definite "no" from the server ends the session — a network
      // hiccup mustn't log the user out.
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        await clearTokens();
        onSessionExpired?.();
      }
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

apiClient.interceptors.response.use(
  async response => {
    const echoedDeviceId = response.headers['x-device-id'];
    if (typeof echoedDeviceId === 'string' && echoedDeviceId.length > 0) {
      await saveDeviceId(echoedDeviceId);
    }
    return response;
  },
  async error => {
    const config = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    // An expired access token: refresh once and replay the request.
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      config &&
      !config._retried &&
      !config.url?.startsWith('/api/v1/auth/') &&
      (await getAccessToken())
    ) {
      config._retried = true;
      if (await refreshTokens()) {
        return apiClient(config);
      }
    }
    throw error;
  },
);
