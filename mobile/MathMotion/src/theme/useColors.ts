import { useColorScheme } from 'react-native';

import { useThemeStore } from '../store/useThemeStore';
import { buildColors, type AppColors } from './colors';

// The current palette, from the user's Appearance choices ('system' mode
// follows the phone's light/dark setting).
export function useColors(): AppColors {
  const systemScheme = useColorScheme();
  const mode = useThemeStore(state => state.mode);
  const accent = useThemeStore(state => state.accent);
  const textTone = useThemeStore(state => state.textTone);
  const scheme =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  return buildColors(scheme, accent, textTone);
}

// Themed replacement for a module-level StyleSheet.create:
//   const useStyles = makeStyles(colors => StyleSheet.create({ ... }));
//   ... const styles = useStyles();  (inside the component)
// Styles are built once per palette and reused.
export function makeStyles<T>(factory: (colors: AppColors) => T): () => T {
  const cache = new WeakMap<AppColors, T>();
  return function useStyles() {
    const colors = useColors();
    let styles = cache.get(colors);
    if (!styles) {
      styles = factory(colors);
      cache.set(colors, styles);
    }
    return styles;
  };
}
