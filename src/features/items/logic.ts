import { addDaysIso, expiryStatus, todayIso, type ExpiryStatus, type IsoDate } from '@/lib/dates';

import type { Item, ShelfLife, StorageLocation } from './types';

export type ItemSection = {
  status: ExpiryStatus;
  title: string;
  data: Item[];
};

const SECTION_TITLES: Record<ExpiryStatus, string> = {
  expired: 'Expired',
  expiringSoon: 'Expiring soon',
  fresh: 'Fresh',
};

const SECTION_ORDER: ExpiryStatus[] = ['expired', 'expiringSoon', 'fresh'];

/**
 * Groups active items into Expired / Expiring soon / Fresh, soonest expiry first,
 * optionally filtered to one storage location. Empty sections are left out.
 */
export function groupItems(
  items: readonly Item[],
  options: { today?: IsoDate; storage?: StorageLocation | null } = {},
): ItemSection[] {
  const today = options.today ?? todayIso();
  const buckets: Record<ExpiryStatus, Item[]> = { expired: [], expiringSoon: [], fresh: [] };

  for (const item of items) {
    if (item.status !== 'active') continue;
    if (options.storage && item.storage !== options.storage) continue;
    buckets[expiryStatus(item.expires_on, today)].push(item);
  }

  return SECTION_ORDER.filter((status) => buckets[status].length > 0).map((status) => ({
    status,
    title: SECTION_TITLES[status],
    data: buckets[status].sort(
      (a, b) => a.expires_on.localeCompare(b.expires_on) || a.name.localeCompare(b.name),
    ),
  }));
}

/** "Milk (plain or flavored)" */
export function shelfLifeDisplayName(entry: Pick<ShelfLife, 'name' | 'subtitle'>): string {
  return entry.subtitle ? `${entry.name} (${entry.subtitle})` : entry.name;
}

/** "7 days", "1–2 days", "3 months", "1 year" */
export function formatShelfLife(minDays: number, maxDays: number): string {
  const fmt = (days: number) => {
    if (days >= 365 && days % 365 === 0) return plural(days / 365, 'year');
    if (days >= 60 && days % 30 === 0) return plural(days / 30, 'month');
    if (days >= 14 && days % 7 === 0) return plural(days / 7, 'week');
    return plural(days, 'day');
  };
  if (minDays === maxDays) return fmt(minDays);
  const [lo, hi] = [fmt(minDays), fmt(maxDays)];
  // "1–2 days" instead of "1 day–2 days" when the unit matches.
  const loUnit = lo.split(' ')[1]?.replace(/s$/, '');
  const hiUnit = hi.split(' ')[1]?.replace(/s$/, '');
  return loUnit === hiUnit ? `${lo.split(' ')[0]}–${hi}` : `${lo}–${hi}`;
}

function plural(n: number, unit: string) {
  return `${n} ${unit}${n === 1 ? '' : 's'}`;
}

export type ExpirySuggestion =
  { kind: 'date'; expiresOn: IsoDate; label: string } | { kind: 'advice'; label: string };

/**
 * What the form should do with a FoodKeeper match: a concrete expiry date (using the
 * conservative minimum), or advice only (e.g. milk: "use the date on the package").
 */
export function suggestExpiry(
  entry: Pick<ShelfLife, 'min_days' | 'max_days' | 'tips'>,
  purchasedOn: IsoDate,
): ExpirySuggestion {
  if (entry.min_days == null || entry.max_days == null) {
    return { kind: 'advice', label: entry.tips ?? 'No typical storage time listed.' };
  }
  return {
    kind: 'date',
    expiresOn: addDaysIso(purchasedOn, entry.min_days),
    label: `Usually keeps ${formatShelfLife(entry.min_days, entry.max_days)} (USDA FoodKeeper)`,
  };
}
