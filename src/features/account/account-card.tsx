import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

import { itemKeys } from '../items/hooks';
import {
  AccountError,
  cleanCode,
  confirmLinkCode,
  confirmSignInCode,
  isValidCode,
  isValidEmail,
  sendLinkCode,
  sendSignInCode,
  signOut,
} from './account';
import { exportItemsCsv } from './export';

type Flow = 'save' | 'signIn';
type Step = { flow: Flow; stage: 'email' | 'code'; email: string };

export function AccountCard() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { state } = useAuth();
  const user = state.status === 'signedIn' ? state.session.user : null;
  const isGuest = !!user?.is_anonymous;

  const [step, setStep] = useState<Step | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const send = useMutation({
    mutationFn: ({ flow, address }: { flow: Flow; address: string }) =>
      flow === 'save' ? sendLinkCode(address) : sendSignInCode(address),
    onSuccess: (_d, { flow, address }) => {
      setStep({ flow, stage: 'code', email: address });
      setCode('');
    },
  });
  const verify = useMutation({
    mutationFn: ({ flow, address, token }: { flow: Flow; address: string; token: string }) =>
      flow === 'save' ? confirmLinkCode(address, token) : confirmSignInCode(address, token),
    onSuccess: (_d, { flow }) => {
      setStep(null);
      setMessage(flow === 'save' ? 'Saved. Your data is now in your email account.' : null);
      void queryClient.invalidateQueries({ queryKey: itemKeys.active });
    },
  });
  const exporter = useMutation({ mutationFn: exportItemsCsv });
  const remover = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('delete-account', { body: {} });
      if (error) throw new AccountError('Could not delete your data. Try again.');
      await supabase.auth.signOut({ scope: 'local' });
    },
  });

  const error = send.error ?? verify.error ?? exporter.error ?? remover.error;
  const busy = send.isPending || verify.isPending || remover.isPending;

  const start = async (flow: Flow) => {
    setMessage(null);
    send.reset();
    verify.reset();
    if (flow === 'signIn' && isGuest) {
      const ok = await confirm(
        'Sign in to another account?',
        'Items on this guest account stay with the guest and won’t be moved. To keep them, use “Save my data” instead.',
        'Continue',
      );
      if (!ok) return;
    }
    setStep({ flow, stage: 'email', email: '' });
  };

  const onSignOut = async () => {
    const ok = await confirm(
      'Sign out?',
      'Your items stay in your account. This phone will start a new empty guest account until you sign in again.',
      'Sign out',
    );
    if (ok) await signOut().catch((e: Error) => setMessage(e.message));
  };

  const onDelete = async () => {
    const ok = await confirm(
      'Delete all your data?',
      'This permanently deletes your account and every item, on all devices. It can’t be undone. Export a CSV first if you want a copy.',
      'Delete everything',
    );
    if (ok) remover.mutate();
  };

  const input = [styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }];

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">{isGuest ? 'Guest account' : 'Account'}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {isGuest
          ? 'Your items are saved to a guest account on this phone. If you uninstall the app or clear Expo Go’s data, they can’t be recovered. Save them to your email to keep them and use them on other phones.'
          : `Signed in as ${user?.email ?? 'your account'}.`}
      </ThemedText>

      {step?.stage === 'email' ? (
        <View style={styles.form}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={theme.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            accessibilityLabel="Email address"
            style={input}
          />
          <Button
            label="Email me a code"
            loading={send.isPending}
            disabled={!isValidEmail(email)}
            onPress={() => send.mutate({ flow: step.flow, address: email.trim() })}
          />
          <Button label="Cancel" variant="secondary" onPress={() => setStep(null)} />
        </View>
      ) : null}

      {step?.stage === 'code' ? (
        <View style={styles.form}>
          <ThemedText type="small">
            Enter the code we emailed to {step.email}. Check spam if it doesn’t arrive.
          </ThemedText>
          <TextInput
            value={code}
            onChangeText={(t) => setCode(cleanCode(t))}
            placeholder="12345678"
            placeholderTextColor={theme.textSecondary}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={10}
            accessibilityLabel="Code from the email"
            style={[input, styles.code]}
          />
          <Button
            label={step.flow === 'save' ? 'Save my data' : 'Sign in'}
            loading={verify.isPending}
            disabled={!isValidCode(code)}
            onPress={() => verify.mutate({ flow: step.flow, address: step.email, token: code })}
          />
          <Button
            label="Send a new code"
            variant="secondary"
            disabled={send.isPending}
            onPress={() => send.mutate({ flow: step.flow, address: step.email })}
          />
          <Button label="Cancel" variant="secondary" onPress={() => setStep(null)} />
        </View>
      ) : null}

      {!step ? (
        <View style={styles.form}>
          {isGuest ? (
            <>
              <Button label="Save my data to an email" onPress={() => void start('save')} />
              <Button
                label="Sign in to an existing account"
                variant="secondary"
                onPress={() => void start('signIn')}
              />
            </>
          ) : (
            <Button label="Sign out" variant="secondary" onPress={() => void onSignOut()} />
          )}
          <Button
            label="Export my items (CSV)"
            variant="secondary"
            loading={exporter.isPending}
            onPress={() => exporter.mutate()}
          />
          <Button
            label="Delete my data"
            variant="danger"
            disabled={busy}
            loading={remover.isPending}
            onPress={() => void onDelete()}
          />
        </View>
      ) : null}

      {message ? <ThemedText type="small">{message}</ThemedText> : null}
      {exporter.isSuccess && !step ? (
        <ThemedText type="small" themeColor="textSecondary">
          Exported {exporter.data} item{exporter.data === 1 ? '' : 's'}.
        </ThemedText>
      ) : null}
      {error ? (
        <ThemedText type="small" themeColor="expired">
          {error.message}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  form: {
    gap: Spacing.two,
  },
  input: {
    minHeight: 48,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  code: {
    letterSpacing: 4,
    fontSize: 20,
    textAlign: 'center',
  },
});
