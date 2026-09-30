import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import * as authApi from '../services/api/auth';
import { setOnSessionExpired } from '../services/api/client';
import { clearTokens, getAccessToken } from '../services/api/tokens';
import { useEntitlementStore } from './useEntitlementStore';

// Login is required, as in LingoFlow (App.tsx shows AuthScreen until
// signed in). Mirrors LingoFlow's data/AuthContext.tsx:
// - the last profile is cached, so opening the app offline doesn't drop
//   the user on the login screen — the token is on the device and valid;
// - only a definite "session over" from the server (a refresh that got a
//   401) signs out; a network error never does.
const PROFILE_KEY = 'mathmotion.profile';

type Status = 'restoring' | 'signedOut' | 'signedIn';

interface AuthState {
  status: Status;
  user: authApi.UserProfile | null;
  restore: () => Promise<void>;
  login: (phone: string, password: string) => Promise<void>;
  register: (nickname: string, phone: string, password: string, otpToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

async function cacheProfile(user: authApi.UserProfile) {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(user)).catch(() => {});
}

async function readCachedProfile(): Promise<authApi.UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as authApi.UserProfile) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>(set => {
  const signedIn = async (user: authApi.UserProfile) => {
    set({ status: 'signedIn', user });
    await cacheProfile(user);
    // The account may have a different subscription than the device had.
    useEntitlementStore.getState().refresh();
  };

  const signOutLocally = async () => {
    await clearTokens();
    await AsyncStorage.removeItem(PROFILE_KEY).catch(() => {});
    set({ status: 'signedOut', user: null });
  };

  setOnSessionExpired(() => {
    signOutLocally();
  });

  return {
    status: 'restoring',
    user: null,

    restore: async () => {
      if (!(await getAccessToken())) {
        set({ status: 'signedOut' });
        return;
      }
      const cached = await readCachedProfile();
      if (cached) {
        set({ status: 'signedIn', user: cached });
      }
      try {
        const user = await authApi.fetchProfile();
        set({ status: 'signedIn', user });
        await cacheProfile(user);
      } catch (error) {
        // The client already tried refreshing; a 401 here means the
        // session is really over. Anything else (offline) keeps the cache.
        // Offline with no cached profile has nothing to show: log in again.
        if ((error as { code?: string }).code === 'unauthorized' || !cached) {
          await signOutLocally();
        }
      }
    },

    login: async (phone, password) => {
      await signedIn(await authApi.login(phone, password));
    },

    register: async (nickname, phone, password, otpToken) => {
      await signedIn(await authApi.register(nickname, phone, password, otpToken));
    },

    logout: async () => {
      await signOutLocally();
    },
  };
});
