import AsyncStorage from '@react-native-async-storage/async-storage';

// Login tokens (backend/go-api/internal/service/auth), stored like
// LingoFlow's app/src/api/client.ts: the access token goes on every
// request; the refresh token only to POST /api/v1/auth/refresh.
const ACCESS_KEY = 'mathmotion.access_token';
const REFRESH_KEY = 'mathmotion.refresh_token';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

let cachedAccess: string | null | undefined;
let cachedRefresh: string | null | undefined;

export async function getAccessToken(): Promise<string | null> {
  if (cachedAccess === undefined) {
    cachedAccess = await AsyncStorage.getItem(ACCESS_KEY);
  }
  return cachedAccess;
}

export async function getRefreshToken(): Promise<string | null> {
  if (cachedRefresh === undefined) {
    cachedRefresh = await AsyncStorage.getItem(REFRESH_KEY);
  }
  return cachedRefresh;
}

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  cachedAccess = tokens.access_token;
  cachedRefresh = tokens.refresh_token;
  await AsyncStorage.multiSet([
    [ACCESS_KEY, tokens.access_token],
    [REFRESH_KEY, tokens.refresh_token],
  ]);
}

export async function clearTokens(): Promise<void> {
  cachedAccess = null;
  cachedRefresh = null;
  await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
}
