import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Linking, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TimeField } from '@/components/time-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { DAYS_BEFORE_OPTIONS } from './plan';
import { reminderStatusKey } from './reminder-sync';
import {
  countScheduled,
  getPermissionState,
  remindersSupported,
  requestPermission,
  sendTestNotification,
  type PermissionState,
} from './scheduler';
import { useReminderSettings, useSaveReminderSettings } from './settings';

type Status = { scheduled: number; permission: PermissionState };

const daysLabel = (d: number) => (d === 0 ? 'Day of' : d === 1 ? '1 day' : `${d} days`);

export function ReminderSettingsCard() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const settings = useReminderSettings();
  const save = useSaveReminderSettings();
  const [testSent, setTestSent] = useState(false);

  const status = useQuery<Status>({
    queryKey: reminderStatusKey,
    queryFn: async () => ({
      scheduled: await countScheduled(),
      permission: await getPermissionState(),
    }),
    enabled: remindersSupported,
  });

  if (!remindersSupported) {
    return (
      <Card title="Reminders">
        <ThemedText type="small" themeColor="textSecondary">
          Expiry reminders work in the phone app. They aren&apos;t available in the web preview.
        </ThemedText>
      </Card>
    );
  }
  if (!settings.data) return null;
  const current = settings.data;
  const update = (changes: Partial<typeof current>) => save.mutate({ ...current, ...changes });

  const permission = status.data?.permission;
  const askPermission = async () => {
    const result = await requestPermission();
    if (result === 'denied') await Linking.openSettings();
    void queryClient.invalidateQueries({ queryKey: reminderStatusKey });
  };

  return (
    <Card title="Reminders">
      <View style={styles.rowBetween}>
        <ThemedText type="smallBold">Remind me before food expires</ThemedText>
        <Switch
          value={current.enabled}
          onValueChange={(enabled) => update({ enabled })}
          trackColor={{ true: theme.tint, false: theme.backgroundSelected }}
          accessibilityLabel="Expiry reminders"
        />
      </View>

      {current.enabled ? (
        <>
          <TimeField
            label="At"
            hour={current.hour}
            minute={current.minute}
            onChange={(hour, minute) => update({ hour, minute })}
          />
          <View style={styles.field}>
            <ThemedText type="smallBold">Heads-up before the expiry day</ThemedText>
            <View style={styles.chips}>
              {DAYS_BEFORE_OPTIONS.map((d) => (
                <Chip
                  key={d}
                  label={daysLabel(d)}
                  selected={current.daysBefore === d}
                  onPress={() => update({ daysBefore: d })}
                />
              ))}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {current.daysBefore === 0
                ? 'You’ll get one reminder, on the day each item expires.'
                : `You’ll get a reminder ${daysLabel(current.daysBefore).toLowerCase()} before, and again on the day.`}
            </ThemedText>
          </View>

          {permission && permission !== 'granted' ? (
            <View style={styles.field}>
              <ThemedText type="small" themeColor="expiringSoon">
                {permission === 'denied'
                  ? 'Notifications are turned off for this app in your phone’s settings.'
                  : 'X-Pire needs permission to send notifications.'}
              </ThemedText>
              <Button
                label={permission === 'denied' ? 'Open phone settings' : 'Allow notifications'}
                variant="secondary"
                onPress={() => void askPermission()}
              />
            </View>
          ) : null}

          {permission === 'granted' ? (
            <ThemedText type="small" themeColor="textSecondary">
              {status.data?.scheduled
                ? `${status.data.scheduled} upcoming reminder${status.data.scheduled === 1 ? '' : 's'} scheduled.`
                : 'No reminders due yet. Add items to get reminders.'}
            </ThemedText>
          ) : null}

          <Button
            label={testSent ? 'Test sent: check in 10 seconds' : 'Send a test notification'}
            variant="secondary"
            disabled={permission !== 'granted' || testSent}
            onPress={() => {
              void sendTestNotification().then(() => {
                setTestSent(true);
                setTimeout(() => setTestSent(false), 12_000);
              });
            }}
          />
        </>
      ) : null}
    </Card>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
