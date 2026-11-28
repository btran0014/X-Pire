import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { supabase, supabaseConfigError } from '@/lib/supabase';

type AuthState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'signedIn'; session: Session };

type AuthContextValue = {
  state: AuthState;
  retry: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Makes sure there is always a signed-in user. On first launch this creates an anonymous
 * Supabase user (no login screen); the session is saved, so the same user comes back next time.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(
    supabaseConfigError ? { status: 'error', message: supabaseConfigError } : { status: 'loading' },
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (supabaseConfigError) return;
    let cancelled = false;

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (session) {
        setState({ status: 'signedIn', session });
      } else if (event === 'SIGNED_OUT') {
        // Signed out (or account deleted): start a fresh guest account on this phone.
        // Deferred so no Supabase call runs inside the auth callback.
        setTimeout(() => {
          setState({ status: 'loading' });
          setAttempt((n) => n + 1);
        }, 0);
      }
    });

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        setState({ status: 'signedIn', session: data.session });
        return;
      }
      if (error) {
        setState({ status: 'error', message: friendlyAuthError(error.message) });
        return;
      }
      const anon = await supabase.auth.signInAnonymously();
      if (cancelled) return;
      if (anon.error || !anon.data.session) {
        setState({
          status: 'error',
          message: friendlyAuthError(anon.error?.message ?? 'No session returned'),
        });
      }
      // On success, onAuthStateChange delivers the session.
    })();

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [attempt]);

  // Different user (sign in / sign out / delete): drop everything cached for the previous one.
  const queryClient = useQueryClient();
  const userId = state.status === 'signedIn' ? state.session.user.id : null;
  const lastUserId = useRef<string | null>(null);
  useEffect(() => {
    if (!userId) return;
    if (lastUserId.current && lastUserId.current !== userId) queryClient.clear();
    lastUserId.current = userId;
  }, [userId, queryClient]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return <AuthContext value={{ state, retry }}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** The signed-in user's id. Only call inside screens rendered after sign-in. */
export function useUserId(): string {
  const { state } = useAuth();
  if (state.status !== 'signedIn') throw new Error('useUserId called before sign-in finished');
  return state.session.user.id;
}

function friendlyAuthError(message: string): string {
  if (/anonymous sign-ins are disabled/i.test(message)) {
    return 'Anonymous sign-ins are turned off in Supabase (Authentication → Sign In / Providers).';
  }
  if (/network|fetch|timed out/i.test(message)) {
    return "Can't reach the server. Check your connection. If the Supabase project was paused, restore it in the dashboard.";
  }
  return `Couldn't sign in: ${message}`;
}
