import { describe, expect, it } from '@jest/globals';

import type { Item } from '../../items/types';
import { DEFAULT_REMINDER_SETTINGS, MAX_SCHEDULED, planReminders } from '../plan';

// Local time: 28 Nov 2026, 08:00 (before the default 09:00 reminder time).
const NOW = new Date(2026, 10, 28, 8, 0);

function item(name: string, expiresOn: string, over: Partial<Item> = {}): Item {
  return {
    id: name,
    user_id: 'u',
    name,
    quantity: 1,
    storage: 'fridge',
    purchased_on: '2026-11-20',
    expires_on: expiresOn,
    expiry_source: 'manual',
    confidence: null,
    status: 'active',
    receipt_id: null,
    created_at: '',
    updated_at: '',
    ...over,
  };
}

const at = (y: number, m: number, d: number, h = 9, min = 0) => new Date(y, m - 1, d, h, min);

describe('planReminders', () => {
  it('schedules a heads-up and an expiry-day reminder at the chosen time', () => {
    const plan = planReminders([item('Milk', '2026-12-03')], DEFAULT_REMINDER_SETTINGS, NOW);
    expect(plan.map((r) => [r.fireAt, r.title])).toEqual([
      [at(2026, 12, 1), 'Milk expires in 2 days'],
      [at(2026, 12, 3), 'Milk expires today'],
    ]);
  });

  it('merges items that fire at the same time', () => {
    const plan = planReminders(
      [item('Milk', '2026-12-03'), item('Eggs', '2026-12-03'), item('Spinach', '2026-12-01')],
      DEFAULT_REMINDER_SETTINGS,
      NOW,
    );
    expect(plan[0]).toMatchObject({ fireAt: at(2026, 11, 29), title: 'Spinach expires in 2 days' });
    const first = plan.find((r) => r.fireAt.getTime() === at(2026, 12, 1).getTime())!;
    // Spinach expires that day, Milk and Eggs in 2 days.
    expect(first.title).toBe('3 items expiring soon');
    expect(first.body).toBe('1 today: Spinach, Eggs, Milk');
    expect(first.itemIds.sort()).toEqual(['Eggs', 'Milk', 'Spinach']);
    expect(plan.at(-1)).toMatchObject({ title: '2 items expire today', body: 'Eggs, Milk' });
  });

  it('skips times that have passed, inactive items and disabled settings', () => {
    const items = [
      item('Today', '2026-11-28'), // 09:00 today is still ahead
      item('Yesterday', '2026-11-27'),
      item('Used', '2026-12-10', { status: 'consumed' }),
    ];
    expect(planReminders(items, DEFAULT_REMINDER_SETTINGS, NOW).map((r) => r.title)).toEqual([
      'Today expires today',
    ]);
    const later = new Date(2026, 10, 28, 10, 0);
    expect(planReminders(items, DEFAULT_REMINDER_SETTINGS, later)).toEqual([]);
    expect(planReminders(items, { ...DEFAULT_REMINDER_SETTINGS, enabled: false }, NOW)).toEqual([]);
  });

  it('uses "tomorrow" and supports expiry-day-only reminders', () => {
    const milk = [item('Milk', '2026-12-03')];
    expect(
      planReminders(milk, { ...DEFAULT_REMINDER_SETTINGS, daysBefore: 1 }, NOW)[0]?.title,
    ).toBe('Milk expires tomorrow');
    expect(planReminders(milk, { ...DEFAULT_REMINDER_SETTINGS, daysBefore: 0 }, NOW)).toHaveLength(
      1,
    );
  });

  it('honours the chosen time of day and stays under the iOS limit', () => {
    const many = Array.from({ length: 100 }, (_, i) =>
      item(`Item ${i}`, `2027-01-${String((i % 28) + 1).padStart(2, '0')}`),
    );
    const plan = planReminders(many, { ...DEFAULT_REMINDER_SETTINGS, hour: 18, minute: 30 }, NOW);
    expect(plan.length).toBeLessThanOrEqual(MAX_SCHEDULED);
    expect(plan.every((r) => r.fireAt.getHours() === 18 && r.fireAt.getMinutes() === 30)).toBe(
      true,
    );
    expect(new Set(plan.map((r) => r.id)).size).toBe(plan.length);
  });

  it('shortens long name lists', () => {
    const six = ['A', 'B', 'C', 'D', 'E', 'F'].map((n) => item(n, '2026-12-03'));
    const today = planReminders(six, { ...DEFAULT_REMINDER_SETTINGS, daysBefore: 0 }, NOW)[0];
    expect(today?.body).toBe('A, B, C, D +2 more');
  });
});
