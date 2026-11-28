import { format, parseISO, subDays } from 'date-fns';

import type { Item } from '../items/types';

export type ReminderSettings = {
  enabled: boolean;
  /** Local time of day reminders fire at. */
  hour: number;
  minute: number;
  /** Extra heads-up this many days before the expiry day (0 = only on the day). */
  daysBefore: number;
};

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: true,
  hour: 9,
  minute: 0,
  daysBefore: 2,
};

export const DAYS_BEFORE_OPTIONS = [0, 1, 2, 3, 5] as const;

/** iOS keeps at most 64 pending local notifications per app; stay under it. */
export const MAX_SCHEDULED = 60;

export type PlannedReminder = {
  id: string;
  fireAt: Date;
  title: string;
  body: string;
  itemIds: string[];
};

type Entry = { item: Item; daysLeft: number };

/**
 * Works out which notifications to schedule: one at the chosen time `daysBefore` days ahead
 * and one on the expiry day, for every active item, merging items that fire at the same
 * moment into a single notification. Past times are skipped; only the soonest
 * MAX_SCHEDULED are returned.
 */
export function planReminders(
  items: readonly Item[],
  settings: ReminderSettings,
  now: Date = new Date(),
): PlannedReminder[] {
  if (!settings.enabled) return [];

  const offsets = [...new Set([Math.max(0, settings.daysBefore), 0])];
  const groups = new Map<number, Entry[]>();

  for (const item of items) {
    if (item.status !== 'active') continue;
    const expiry = parseISO(item.expires_on);
    for (const daysLeft of offsets) {
      const day = subDays(expiry, daysLeft);
      const fireAt = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        settings.hour,
        settings.minute,
      );
      if (fireAt.getTime() <= now.getTime()) continue;
      const list = groups.get(fireAt.getTime()) ?? [];
      list.push({ item, daysLeft });
      groups.set(fireAt.getTime(), list);
    }
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .slice(0, MAX_SCHEDULED)
    .map(([time, entries]) => {
      const fireAt = new Date(time);
      return {
        id: `xpire-${format(fireAt, 'yyyyMMdd-HHmm')}`,
        fireAt,
        ...describe(entries),
        itemIds: entries.map((e) => e.item.id),
      };
    });
}

function whenLabel(daysLeft: number): string {
  if (daysLeft === 0) return 'today';
  if (daysLeft === 1) return 'tomorrow';
  return `in ${daysLeft} days`;
}

function nameList(entries: Entry[], max = 4): string {
  const names = entries
    .slice()
    .sort((a, b) => a.daysLeft - b.daysLeft || a.item.name.localeCompare(b.item.name))
    .map((e) => e.item.name);
  const shown = names.slice(0, max).join(', ');
  return names.length > max ? `${shown} +${names.length - max} more` : shown;
}

function describe(entries: Entry[]): { title: string; body: string } {
  const days = [...new Set(entries.map((e) => e.daysLeft))];
  if (entries.length === 1) {
    const [{ item, daysLeft }] = entries as [Entry];
    return {
      title: `${item.name} expires ${whenLabel(daysLeft)}`,
      body: daysLeft === 0 ? 'Use it today or freeze it if you can.' : 'Plan to use it soon.',
    };
  }
  if (days.length === 1) {
    return {
      title: `${entries.length} items expire ${whenLabel(days[0]!)}`,
      body: nameList(entries),
    };
  }
  const today = entries.filter((e) => e.daysLeft === 0).length;
  return {
    title: `${entries.length} items expiring soon`,
    body: `${today} today: ${nameList(entries)}`,
  };
}
