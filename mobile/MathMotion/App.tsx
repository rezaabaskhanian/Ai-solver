/**
 * MathMotion — AI Math Visual Solver
 * @format
 */

import { NavigationContainer } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import './src/i18n';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useEntitlementStore } from './src/store/useEntitlementStore';
import { useLanguageStore } from './src/store/useLanguageStore';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const hasHydrated = useLanguageStore(state => state.hasHydrated);

  useEffect(() => {
    useEntitlementStore.getState().refresh();
  }, []);

  // Wait for the persisted language preference to load before rendering
  // any translated text, so the UI doesn't flash in the wrong language.
  if (!hasHydrated) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.flexOne}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
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
