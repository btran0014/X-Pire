import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useState } from 'react';
import { useColorScheme } from 'react-native';

import { AuthGate } from '@/components/auth-gate';
import { AuthProvider } from '@/providers/auth-provider';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
          mutations: { retry: 0 },
        },
      }),
  );

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthGate>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="item/new"
                options={{ title: 'Add item', headerBackTitle: 'Fridge' }}
              />
              <Stack.Screen
                name="item/[id]"
                options={{ title: 'Edit item', headerBackTitle: 'Fridge' }}
              />
              <Stack.Screen
                name="scan/review"
                options={{ title: 'Review items', headerBackTitle: 'Scan' }}
              />
            </Stack>
          </AuthGate>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
