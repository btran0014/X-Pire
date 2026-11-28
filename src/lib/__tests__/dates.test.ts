import { describe, expect, it } from '@jest/globals';

import { addDaysIso, daysUntil, expiryLabel, expiryStatus, todayIso } from '../dates';

const TODAY = '2026-11-27';

describe('daysUntil', () => {
  it('counts calendar days, not 24-hour periods', () => {
    expect(daysUntil('2026-11-27', TODAY)).toBe(0);
    expect(daysUntil('2026-11-28', TODAY)).toBe(1);
    expect(daysUntil('2026-11-25', TODAY)).toBe(-2);
  });

  it('crosses month and year boundaries', () => {
    expect(daysUntil('2027-01-01', '2026-12-31')).toBe(1);
    expect(daysUntil('2026-03-01', '2026-02-28')).toBe(1);
  });
});

describe('expiryStatus', () => {
  it.each([
    ['2026-11-26', 'expired'],
    ['2026-11-27', 'expiringSoon'],
    ['2026-11-30', 'expiringSoon'],
    ['2026-12-01', 'fresh'],
  ] as const)('%s is %s', (expiresOn, status) => {
    expect(expiryStatus(expiresOn, TODAY)).toBe(status);
  });
});

describe('expiryLabel', () => {
  it.each([
    ['2026-11-20', 'Expired 7 days ago'],
    ['2026-11-26', 'Expired yesterday'],
    ['2026-11-27', 'Expires today'],
    ['2026-11-28', 'Expires tomorrow'],
    ['2026-12-04', 'Expires in 7 days'],
  ])('%s -> %s', (expiresOn, label) => {
    expect(expiryLabel(expiresOn, TODAY)).toBe(label);
  });
});

describe('date helpers', () => {
  it('adds days to a calendar date', () => {
    expect(addDaysIso('2026-11-27', 7)).toBe('2026-12-04');
  });

  it('formats a local date as yyyy-MM-dd', () => {
    expect(todayIso(new Date(2026, 10, 27, 23, 59))).toBe('2026-11-27');
  });
});
