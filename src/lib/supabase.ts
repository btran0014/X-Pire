import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from '@/types/database';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

/** Message shown instead of the app when .env is missing. */
export const supabaseConfigError =
  !url || !key
    ? 'Supabase is not configured. Copy .env.example to .env, fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY, then restart `npm start`.'
    : null;

// Static web rendering runs in Node where there's no window/localStorage; skip storage there.
const isServerRender = Platform.OS === 'web' && typeof window === 'undefined';

export const supabase = createClient<Database>(
  url ?? 'http://localhost:54321',
  key ?? 'missing-key',
  {
    auth: {
      storage: isServerRender ? undefined : AsyncStorage,
      autoRefreshToken: !isServerRender,
      persistSession: !isServerRender,
      detectSessionInUrl: false,
      lock: processLock,
    },
  },
);

// Only refresh the session while the app is in the foreground (recommended for React Native).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
