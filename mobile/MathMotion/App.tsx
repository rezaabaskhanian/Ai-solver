/**
 * MathMotion — AI Math Visual Solver
 * @format
 */

import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  useNavigationContainerRef,
  type Theme,
} from '@react-navigation/native';
import React, { useEffect, useMemo } from 'react';
import { AppState, StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import './src/i18n';
import { AppErrorBoundary } from './src/components/ErrorBoundary/AppErrorBoundary';
import { AppDrawer } from './src/navigation/AppDrawer';
import { AuthScreen } from './src/screens/Auth/AuthScreen';
import { OnboardingScreen } from './src/screens/Onboarding/OnboardingScreen';
import { initTelemetry, trackNavigationState } from './src/services/telemetry';
import { startKonkurProgressSync } from './src/services/konkurProgressSync';
import { useAuthStore } from './src/store/useAuthStore';
import { refreshKonkurContent } from './src/store/useKonkurContentStore';
import { useEntitlementStore } from './src/store/useEntitlementStore';
import { useLanguageStore } from './src/store/useLanguageStore';
import { useOnboardingStore } from './src/store/useOnboardingStore';
import { useThemeStore } from './src/store/useThemeStore';
import { fontFamily, useColors } from './src/theme';

// Self-hosted crash / usage reporting: global error handlers + flush timers.
initTelemetry();

function App() {
  const colors = useColors();
  const navigationRef = useNavigationContainerRef();
  const languageHydrated = useLanguageStore(state => state.hasHydrated);
  const themeHydrated = useThemeStore(state => state.hasHydrated);
  const onboardingHydrated = useOnboardingStore(state => state.hasHydrated);
  const onboardingSeen = useOnboardingStore(state => state.seen);
  const authMode = useOnboardingStore(state => state.authMode);
  const authStatus = useAuthStore(state => state.status);
  const isDarkMode = colors.scheme === 'dark';

  // Konkur content comes from the server; recheck when the app returns
  // to the foreground (throttled inside the store).
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refreshKonkurContent();
      }
    });
    return () => sub.remove();
  }, []);

  // Navigation's own backgrounds (screen transitions, drawer scrim) and
  // header font follow the app theme too, so a theme switch leaves no
  // white flashes or system-font titles.
  const navigationTheme = useMemo<Theme>(() => {
    const baseTheme = isDarkMode ? DarkTheme : DefaultTheme;
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: colors.primaryText,
        background: colors.background,
        card: colors.surface,
        text: colors.textPrimary,
        border: colors.border,
      },
      fonts: {
        regular: { fontFamily: fontFamily.fa.regular, fontWeight: 'normal' },
        medium: { fontFamily: fontFamily.fa.medium, fontWeight: 'normal' },
        bold: { fontFamily: fontFamily.fa.bold, fontWeight: 'normal' },
        heavy: { fontFamily: fontFamily.fa.bold, fontWeight: 'normal' },
      },
    };
  }, [colors, isDarkMode]);

  useEffect(() => {
    useAuthStore.getState().restore();
    startKonkurProgressSync();
    useEntitlementStore.getState().refresh();
  }, []);

  // Wait for the persisted language, theme and onboarding flags to load
  // before rendering, so the UI doesn't flash in the wrong language or
  // colors, or show the intro to someone who already dismissed it.
  // Also wait for a saved login to be restored, so a signed-in user
  // doesn't see the login screen flash by.
  if (!languageHydrated || !themeHydrated || !onboardingHydrated || authStatus === 'restoring') {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.flexOne}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={colors.surface}
        />
        {!onboardingSeen ? (
          // First launch only; its Start button flips `seen`.
          <OnboardingScreen />
        ) : authStatus !== 'signedIn' ? (
          // Login is required, as in LingoFlow: onboarding → login → app.
          <AuthScreen initialMode={authMode} />
        ) : (
          <AppErrorBoundary>
            <NavigationContainer
              ref={navigationRef}
              theme={navigationTheme}
              onReady={() => trackNavigationState(navigationRef.getRootState())}
              onStateChange={state => trackNavigationState(state)}>
              <AppDrawer />
            </NavigationContainer>
          </AppErrorBoundary>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
});

export default App;
