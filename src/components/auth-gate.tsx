import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';

import { Button } from './button';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

/** Renders children only once there is a signed-in user; otherwise a spinner or an error with retry. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { state, retry } = useAuth();
  const theme = useTheme();

  if (state.status === 'signedIn') return children;

  return (
    <ThemedView style={styles.container}>
      {state.status === 'loading' ? (
        <ActivityIndicator size="large" color={theme.tint} accessibilityLabel="Signing in" />
      ) : (
        <>
          <ThemedText type="subtitle" style={styles.center}>
            Something went wrong
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.center}>
            {state.message}
          </ThemedText>
          <Button label="Try again" onPress={retry} />
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  center: {
    textAlign: 'center',
    maxWidth: 480,
  },
});
