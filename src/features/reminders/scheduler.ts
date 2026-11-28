import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Item } from '../items/types';
import { planReminders, type ReminderSettings } from './plan';

export type PermissionState = 'granted' | 'undetermined' | 'denied';

const CHANNEL_ID = 'expiry';
let configured = false;

/** Call once at startup: show notifications even while the app is open; Android channel. */
export async function configureNotifications(): Promise<void> {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Expiry reminders',
      // Re-exported via `export *`, which eslint-plugin-import can't follow; verified at runtime.
      // eslint-disable-next-line import/namespace
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

export async function getPermissionState(): Promise<PermissionState> {
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'granted';
  return status === 'undetermined' || canAskAgain ? 'undetermined' : 'denied';
}

export async function requestPermission(): Promise<PermissionState> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted' ? 'granted' : await getPermissionState();
}

// Serialize syncs so a cancel-all from one run can't wipe another run's schedule.
let queue: Promise<unknown> = Promise.resolve();

/**
 * Replaces all scheduled reminders with a fresh plan. Returns how many were scheduled.
 * Without permission it just clears everything.
 */
export function syncReminders(items: readonly Item[], settings: ReminderSettings): Promise<number> {
  const run = queue.then(async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if ((await getPermissionState()) !== 'granted') return 0;
    const plan = planReminders(items, settings);
    for (const reminder of plan) {
      await Notifications.scheduleNotificationAsync({
        identifier: reminder.id,
        content: {
          title: reminder.title,
          body: reminder.body,
          data: { itemIds: reminder.itemIds },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminder.fireAt,
          channelId: CHANNEL_ID,
        },
      });
    }
    return plan.length;
  });
  queue = run.catch(() => undefined);
  return run;
}

export async function countScheduled(): Promise<number> {
  return (await Notifications.getAllScheduledNotificationsAsync()).length;
}

/** Fires a sample reminder in 10 seconds so the user can check notifications work. */
export async function sendTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Milk expires tomorrow',
      body: 'This is a test reminder from X-Pire.',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 10,
      channelId: CHANNEL_ID,
    },
  });
}

/** Opens the Fridge tab when a reminder is tapped. Returns an unsubscribe function. */
export function onReminderTapped(handler: () => void): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(() => handler());
  return () => subscription.remove();
}

export const remindersSupported = true;
