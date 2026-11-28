import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';

import { useActiveItems } from '../items/hooks';
import {
  configureNotifications,
  getPermissionState,
  onReminderTapped,
  remindersSupported,
  requestPermission,
  syncReminders,
} from './scheduler';
import { markPermissionAsked, useReminderSettings, wasPermissionAsked } from './settings';

export const reminderStatusKey = ['reminders', 'status'] as const;

/**
 * Keeps scheduled reminders in step with the user's items and settings. Mounted once
 * (after sign-in); renders nothing.
 */
export function ReminderSync() {
  const queryClient = useQueryClient();
  const items = useActiveItems();
  const settings = useReminderSettings();

  // Only the fields that affect reminders, so unrelated edits don't reschedule.
  const signature = useMemo(
    () =>
      JSON.stringify([
        settings.data,
        (items.data ?? []).map((i) => [i.id, i.name, i.expires_on, i.status]).sort(),
      ]),
    [items.data, settings.data],
  );

  useEffect(() => {
    if (!remindersSupported) return;
    void configureNotifications();
    return onReminderTapped(() => router.navigate('/'));
  }, []);

  useEffect(() => {
    if (!remindersSupported || !items.data || !settings.data) return;
    const currentItems = items.data;
    const currentSettings = settings.data;

    const sync = async () => {
      // Ask for permission once, when there's actually something to remind about.
      if (
        currentSettings.enabled &&
        currentItems.length > 0 &&
        (await getPermissionState()) === 'undetermined' &&
        !(await wasPermissionAsked())
      ) {
        await markPermissionAsked();
        await requestPermission();
      }
      const scheduled = await syncReminders(currentItems, currentSettings);
      queryClient.setQueryData(reminderStatusKey, {
        scheduled,
        permission: await getPermissionState(),
      });
    };

    const timer = setTimeout(() => void sync().catch(() => undefined), 800);
    // Re-plan when the app comes back (dates move on, permission may have changed).
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync().catch(() => undefined);
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- signature captures items/settings
  }, [signature, queryClient]);

  return null;
}
