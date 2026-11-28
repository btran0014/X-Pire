import { AuthError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

/**
 * Email accounts with an emailed one-time code (no links, so it works in Expo Go).
 * Requires {{ .Token }} in the "Change email address" and "Magic link" email templates.
 */

export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

/** Supabase codes are 6–10 digits depending on project settings (this project: 8). */
export const cleanCode = (code: string) => code.replace(/\D/g, '').slice(0, 10);
export const isValidCode = (code: string) => /^\d{6,10}$/.test(cleanCode(code));

export class AccountError extends Error {}

function friendly(error: AuthError | Error): AccountError {
  const message = error.message ?? '';
  if (/rate limit|too many|security purposes/i.test(message)) {
    return new AccountError('Too many emails requested. Wait a minute and try again.');
  }
  if (/expired|invalid.*(otp|token)|token.*invalid/i.test(message)) {
    return new AccountError('That code is wrong or has expired. Request a new one.');
  }
  if (/already.*(registered|exists|been registered)/i.test(message)) {
    return new AccountError(
      'That email already has an account. Use “Sign in” instead to switch to it.',
    );
  }
  if (/signups not allowed|user not found|no user/i.test(message)) {
    return new AccountError('No account uses that email yet. Save your data to it first.');
  }
  if (/network|fetch/i.test(message)) {
    return new AccountError("Can't reach the server. Check your connection.");
  }
  return new AccountError(message || 'Something went wrong.');
}

/** Step 1 of saving a guest account: email a code to the new address. */
export async function sendLinkCode(email: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email: email.trim().toLowerCase() });
  if (error) throw friendly(error);
}

/** Step 2: the code confirms the address; the same user (and all items) keeps going. */
export async function confirmLinkCode(email: string, code: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: cleanCode(code),
    type: 'email_change',
  });
  if (error) throw friendly(error);
}

/** Sign in to an existing account on this phone: email a code. */
export async function sendSignInCode(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: false },
  });
  if (error) throw friendly(error);
}

export async function confirmSignInCode(email: string, code: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: cleanCode(code),
    type: 'email',
  });
  if (error) throw friendly(error);
}

/** Signs out; the app then starts a fresh guest account on this phone. */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw friendly(error);
}
