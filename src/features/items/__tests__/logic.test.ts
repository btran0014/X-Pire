import { describe, expect, it } from '@jest/globals';

import { formatShelfLife, groupItems, shelfLifeDisplayName, suggestExpiry } from '../logic';
import type { Item } from '../types';

const TODAY = '2026-11-28';

function item(overrides: Partial<Item>): Item {
  return {
    id: overrides.name ?? 'id',
    user_id: 'u1',
    name: 'Thing',
    quantity: 1,
    storage: 'fridge',
    purchased_on: '2026-11-20',
    expires_on: '2026-12-10',
    expiry_source: 'manual',
    confidence: null,
    status: 'active',
    receipt_id: null,
    barcode: null,
    brand: null,
    image_url: null,
    emoji: null,
    created_at: '2026-11-20T00:00:00Z',
    updated_at: '2026-11-20T00:00:00Z',
    ...overrides,
  };
}

describe('groupItems', () => {
  const items = [
    item({ name: 'Yogurt', expires_on: '2026-12-01' }),
    item({ name: 'Milk', expires_on: '2026-11-27' }),
    item({ name: 'Peas', expires_on: '2027-03-01', storage: 'freezer' }),
    item({ name: 'Eggs', expires_on: '2026-11-28' }),
    item({ name: 'Old bread', expires_on: '2026-11-01', status: 'discarded' }),
  ];

  it('groups into expired / expiring soon / fresh in that order, soonest first', () => {
    const sections = groupItems(items, { today: TODAY });
    expect(sections.map((s) => [s.status, s.data.map((i) => i.name)])).toEqual([
      ['expired', ['Milk']],
      ['expiringSoon', ['Eggs', 'Yogurt']],
      ['fresh', ['Peas']],
    ]);
  });

  it('leaves out consumed and discarded items', () => {
    const names = groupItems(items, { today: TODAY }).flatMap((s) => s.data.map((i) => i.name));
    expect(names).not.toContain('Old bread');
  });

  it('filters by storage location and drops empty sections', () => {
    const sections = groupItems(items, { today: TODAY, storage: 'freezer' });
    expect(sections).toHaveLength(1);
    expect(sections[0]?.data.map((i) => i.name)).toEqual(['Peas']);
  });
});

describe('formatShelfLife', () => {
  it.each([
    [7, 7, '7 days'],
    [1, 2, '1–2 days'],
    [21, 35, '3–5 weeks'],
    [90, 90, '3 months'],
    [365, 365, '1 year'],
    [3, 14, '3 days–2 weeks'],
  ])('%i–%i days -> %s', (min, max, label) => {
    expect(formatShelfLife(min, max)).toBe(label);
  });
});

describe('suggestExpiry', () => {
  it('uses the conservative minimum to pick a date', () => {
    expect(suggestExpiry({ min_days: 21, max_days: 35, tips: null }, TODAY)).toEqual({
      kind: 'date',
      expiresOn: '2026-12-19',
      label: 'Usually keeps 3–5 weeks (USDA FoodKeeper)',
    });
  });

  it('returns advice when there is no duration (e.g. milk)', () => {
    expect(
      suggestExpiry(
        { min_days: null, max_days: null, tips: 'Use the use-by date on the package.' },
        TODAY,
      ),
    ).toEqual({ kind: 'advice', label: 'Use the use-by date on the package.' });
  });
});

describe('shelfLifeDisplayName', () => {
  it('adds the subtitle in brackets', () => {
    expect(shelfLifeDisplayName({ name: 'Milk', subtitle: 'lactose-free' })).toBe(
      'Milk (lactose-free)',
    );
    expect(shelfLifeDisplayName({ name: 'Butter', subtitle: null })).toBe('Butter');
  });
});
