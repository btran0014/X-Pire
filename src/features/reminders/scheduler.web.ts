// Web preview: local notifications aren't supported, so reminders are a no-op.
import type { Item } from '../items/types';
import type { ReminderSettings } from './plan';

export type PermissionState = 'granted' | 'undetermined' | 'denied';

export const remindersSupported = false;

export async function configureNotifications(): Promise<void> {}
export async function getPermissionState(): Promise<PermissionState> {
  return 'denied';
}
export async function requestPermission(): Promise<PermissionState> {
  return 'denied';
}
export async function syncReminders(
  _items: readonly Item[],
  _settings: ReminderSettings,
): Promise<number> {
  return 0;
}
export async function countScheduled(): Promise<number> {
  return 0;
}
export async function sendTestNotification(): Promise<void> {}
export function onReminderTapped(_handler: () => void): () => void {
  return () => {};
}
