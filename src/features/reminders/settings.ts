import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { DEFAULT_REMINDER_SETTINGS, type ReminderSettings } from './plan';

const STORAGE_KEY = 'x-pire/reminder-settings';
const ASKED_KEY = 'x-pire/notification-permission-asked';
export const reminderSettingsKey = ['reminder-settings'] as const;

/** Reminder preferences live on the device (each phone schedules its own notifications). */
export async function loadReminderSettings(): Promise<ReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_REMINDER_SETTINGS, ...JSON.parse(raw) } : DEFAULT_REMINDER_SETTINGS;
  } catch {
    return DEFAULT_REMINDER_SETTINGS;
  }
}

export function useReminderSettings() {
  return useQuery({
    queryKey: reminderSettingsKey,
    queryFn: loadReminderSettings,
    staleTime: Infinity,
  });
}

export function useSaveReminderSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: ReminderSettings) => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      return settings;
    },
    onMutate: (settings) => {
      queryClient.setQueryData(reminderSettingsKey, settings);
    },
  });
}

/** Whether we've already shown the system permission prompt once (don't nag). */
export async function wasPermissionAsked(): Promise<boolean> {
  return (await AsyncStorage.getItem(ASKED_KEY)) === '1';
}

export async function markPermissionAsked(): Promise<void> {
  await AsyncStorage.setItem(ASKED_KEY, '1');
}
