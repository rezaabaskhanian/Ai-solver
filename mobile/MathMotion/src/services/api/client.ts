import axios from 'axios';

import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../../config/env';
import { useLanguageStore } from '../../store/useLanguageStore';
import { getDeviceId, saveDeviceId } from './deviceId';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async config => {
  const deviceId = await getDeviceId();
  if (deviceId) {
    config.headers['X-Device-Id'] = deviceId;
  }
  // The math engine words step explanations in this language (PRD
  // section 18). Read per request, so it follows the UI language.
  config.headers['Accept-Language'] = useLanguageStore.getState().language;
  return config;
});

apiClient.interceptors.response.use(async response => {
  const echoedDeviceId = response.headers['x-device-id'];
  if (typeof echoedDeviceId === 'string' && echoedDeviceId.length > 0) {
    await saveDeviceId(echoedDeviceId);
  }
  return response;
});
