import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { DateField } from '@/components/date-field';
import { PlaceholderCard } from '@/components/placeholder-card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { parseReceipt, ScanError } from '@/features/scan/api';
import { PermissionDeniedError, pickReceiptPhoto, shrinkForUpload } from '@/features/scan/image';
import { scanKey } from '@/features/scan/review';
import { useTheme } from '@/hooks/use-theme';
import { todayIso } from '@/lib/dates';

type Status =
  | { step: 'idle' }
  | { step: 'working'; label: string }
  | { step: 'error'; message: string }
  | { step: 'empty'; message: string };

export default function ScanScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [purchasedOn, setPurchasedOn] = useState(todayIso);
  const [status, setStatus] = useState<Status>({ step: 'idle' });
  const busy = status.step === 'working';

  const scan = async (source: 'camera' | 'library') => {
    try {
      const photo = await pickReceiptPhoto(source);
      if (!photo) return; // cancelled
      setStatus({ step: 'working', label: 'Preparing photo…' });
      const image = await shrinkForUpload(photo);
      setStatus({ step: 'working', label: 'Reading receipt…' });
      const result = await parseReceipt(image, purchasedOn);

      if (result.items.length === 0) {
        setStatus({
          step: 'empty',
          message: result.isReceipt
            ? 'No food or drink found on this receipt.'
            : "That doesn't look like a grocery receipt. Try a clearer, flatter photo.",
        });
        return;
      }
      queryClient.setQueryData(scanKey(result.receiptId), result);
      setStatus({ step: 'idle' });
      router.push({ pathname: '/scan/review', params: { receiptId: result.receiptId } });
    } catch (error) {
      const message =
        error instanceof PermissionDeniedError || error instanceof ScanError
          ? error.message
          : 'Something went wrong. Try again.';
      setStatus({ step: 'error', message });
    }
  };

  return (
    <Screen
      title="Scan receipt"
      subtitle="Photograph a grocery receipt to add its items in one go.">
      <PlaceholderCard
        title="Tips for a good scan"
        body="Lay the receipt flat in good light and fit all the item lines in the frame. Long receipts: scan them in two parts."
      />

      <DateField label="Bought on" value={purchasedOn} onChange={setPurchasedOn} />

      <View style={styles.actions}>
        <Button label="Take photo" disabled={busy} onPress={() => void scan('camera')} />
        <Button
          label="Choose from photos"
          variant="secondary"
          disabled={busy}
          onPress={() => void scan('library')}
        />
      </View>

      {status.step === 'working' ? (
        <View style={styles.status} accessibilityLiveRegion="polite">
          <ActivityIndicator color={theme.tint} />
          <ThemedText type="small" themeColor="textSecondary">
            {status.label}
          </ThemedText>
        </View>
      ) : null}
      {status.step === 'error' ? (
        <ThemedText themeColor="expired" accessibilityLiveRegion="polite">
          {status.message}
        </ThemedText>
      ) : null}
      {status.step === 'empty' ? (
        <ThemedText themeColor="textSecondary" accessibilityLiveRegion="polite">
          {status.message}
        </ThemedText>
      ) : null}

      <ThemedText type="small" themeColor="textSecondary">
        The photo is sent to Google Gemini to read it and is not stored.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: Spacing.three,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
