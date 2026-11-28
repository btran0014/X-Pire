import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

// eslint-disable-next-line import/first
import type { Item } from '../../items/types';
// eslint-disable-next-line import/first
import { cleanCode, isValidCode, isValidEmail } from '../account';
// eslint-disable-next-line import/first
import { csvField, itemsToCsv } from '../csv';

describe('account input checks', () => {
  it('validates emails', () => {
    expect(isValidEmail('me@example.com')).toBe(true);
    expect(isValidEmail(' me@example.com ')).toBe(true);
    expect(isValidEmail('me@example')).toBe(false);
    expect(isValidEmail('not an email')).toBe(false);
  });

  it('cleans and validates codes', () => {
    expect(cleanCode('1234 5678')).toBe('12345678');
    expect(isValidCode('12345678')).toBe(true);
    expect(isValidCode('123456')).toBe(true);
    expect(isValidCode('12345')).toBe(false);
  });
});

describe('CSV export', () => {
  it('quotes commas, quotes and newlines and blocks spreadsheet formulas', () => {
    expect(csvField('Milk, 2%')).toBe('"Milk, 2%"');
    expect(csvField('Say "hi"')).toBe('"Say ""hi"""');
    expect(csvField('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvField(null)).toBe('');
    expect(csvField(3)).toBe('3');
    expect(csvField(-3)).toBe('-3'); // numbers aren't treated as formulas
  });

  it('writes a header and one row per item', () => {
    const item = {
      name: 'Greek yogurt, plain',
      brand: 'Chobani',
      quantity: 2,
      storage: 'fridge',
      purchased_on: '2026-11-28',
      expires_on: '2026-12-12',
      status: 'active',
      expiry_source: 'ai',
      barcode: '0894700010137',
      created_at: '2026-11-28T05:00:00Z',
    } as Item;
    expect(itemsToCsv([item]).split('\r\n')).toEqual([
      'name,brand,quantity,storage,purchased_on,expires_on,status,expiry_source,barcode,added_at',
      '"Greek yogurt, plain",Chobani,2,fridge,2026-11-28,2026-12-12,active,ai,0894700010137,2026-11-28T05:00:00Z',
      '',
    ]);
  });
});
