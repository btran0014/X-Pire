import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';

/**
 * Expiry dates are calendar dates ("2026-12-01"), not timestamps, so there are no
 * time zone surprises: an item that expires today is "today" wherever the user is.
 */
export type IsoDate = string;

export type ExpiryStatus = 'expired' | 'expiringSoon' | 'fresh';

/** Items expiring within this many days (today included) count as "expiring soon". */
export const EXPIRING_SOON_DAYS = 3;

/** Today's date in the user's local time zone, as `yyyy-MM-dd`. */
export function todayIso(now: Date = new Date()): IsoDate {
  return toIsoDate(now);
}

export function toIsoDate(date: Date): IsoDate {
  return format(date, 'yyyy-MM-dd');
}

/** Adds whole days to a calendar date. */
export function addDaysIso(date: IsoDate, days: number): IsoDate {
  return toIsoDate(addDays(parseISO(date), days));
}

/** Calendar days from today until expiry: 0 = expires today, negative = already expired. */
export function daysUntil(expiresOn: IsoDate, today: IsoDate = todayIso()): number {
  return differenceInCalendarDays(parseISO(expiresOn), parseISO(today));
}

export function expiryStatus(expiresOn: IsoDate, today: IsoDate = todayIso()): ExpiryStatus {
  const days = daysUntil(expiresOn, today);
  if (days < 0) return 'expired';
  if (days <= EXPIRING_SOON_DAYS) return 'expiringSoon';
  return 'fresh';
}

/** Short human label, e.g. "Expired 2 days ago", "Expires today", "Expires in 5 days". */
export function expiryLabel(expiresOn: IsoDate, today: IsoDate = todayIso()): string {
  const days = daysUntil(expiresOn, today);
  if (days < -1) return `Expired ${-days} days ago`;
  if (days === -1) return 'Expired yesterday';
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  return `Expires in ${days} days`;
}
