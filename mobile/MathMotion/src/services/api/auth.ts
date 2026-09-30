import { apiClient } from './client';
import { toApiError } from './apiError';
import { saveTokens, type AuthTokens } from './tokens';

// Sign-up / login, the same endpoints LingoFlow has (backend/go-api
// /api/v1/auth/*, internal/service/account).

export type OtpPurpose = 'register' | 'reset';

export interface UserProfile {
  id: string;
  nickname: string;
  phone: string;
  code: string;
}

interface AuthResponse {
  user: UserProfile;
  tokens: AuthTokens;
}

async function call<T>(request: () => Promise<{ data: T }>): Promise<T> {
  try {
    return (await request()).data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function sendOtp(phone: string, purpose: OtpPurpose): Promise<void> {
  await call(() => apiClient.post('/api/v1/auth/otp/send', { phone, purpose }));
}

// Returns the one-time token register / resetPassword need.
export async function verifyOtp(phone: string, code: string, purpose: OtpPurpose): Promise<string> {
  const data = await call(() =>
    apiClient.post<{ token: string }>('/api/v1/auth/otp/verify', { phone, code, purpose }),
  );
  return data.token;
}

export async function login(phone: string, password: string): Promise<UserProfile> {
  const data = await call(() => apiClient.post<AuthResponse>('/api/v1/auth/login', { phone, password }));
  await saveTokens(data.tokens);
  return data.user;
}

// Signing up turns this device's anonymous user into the account (the
// backend reads X-Device-Id), so history and subscription carry over.
export async function register(
  nickname: string,
  phone: string,
  password: string,
  otpToken: string,
): Promise<UserProfile> {
  const data = await call(() =>
    apiClient.post<AuthResponse>('/api/v1/auth/register', {
      nickname,
      phone,
      password,
      otp_token: otpToken,
    }),
  );
  await saveTokens(data.tokens);
  return data.user;
}

export async function resetPassword(phone: string, otpToken: string, password: string): Promise<void> {
  await call(() => apiClient.post('/api/v1/auth/reset-pass', { phone, otp_token: otpToken, password }));
}

export async function fetchProfile(): Promise<UserProfile> {
  const data = await call(() => apiClient.get<{ user: UserProfile }>('/api/v1/users/profile'));
  return data.user;
}
