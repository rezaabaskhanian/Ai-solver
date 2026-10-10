import React, { type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { recordCrash } from '../../services/telemetry';
import { fontFamily } from '../../theme';

// Wraps the navigation tree: an error while rendering is recorded to the
// self-hosted telemetry and replaced by a friendly screen with a retry
// button, instead of a white screen.

function Fallback({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  const dark = useColorScheme() === 'dark';
  // Plain colors on purpose: the theme itself may be what failed.
  const bg = dark ? '#111418' : '#FFFFFF';
  const fg = dark ? '#F2F4F7' : '#1B1F24';
  const sub = dark ? '#A8B0BA' : '#5B6470';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Text style={[styles.title, { color: fg }]}>{t('errorBoundary.title')}</Text>
      <Text style={[styles.body, { color: sub }]}>{t('errorBoundary.body')}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Text style={styles.buttonText}>{t('errorBoundary.retry')}</Text>
      </Pressable>
    </View>
  );
}

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    recordCrash(error, {
      boundary: 'app',
      // Component stack is code structure only, no user data; keep it short.
      componentStack: (info.componentStack ?? '').slice(0, 800),
    });
  }

  private retry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return <Fallback onRetry={this.retry} />;
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontFamily: fontFamily.fa.bold,
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontFamily: fontFamily.fa.regular,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#2F6FED',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  pressed: {
    opacity: 0.8,
  },
  buttonText: {
    fontFamily: fontFamily.fa.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
