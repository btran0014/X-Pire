import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

// eslint-disable-next-line import/first
import { quantityChange } from '../hooks';
// eslint-disable-next-line import/first
import type { Item } from '../types';

const base = { quantity: 1 } as Item;

describe('quantityChange', () => {
  it('increments and decrements quantity', () => {
    expect(quantityChange({ ...base, quantity: 2 }, 1)).toEqual({ quantity: 3 });
    expect(quantityChange({ ...base, quantity: 2 }, -1)).toEqual({ quantity: 1 });
  });

  it('marks the item as used up instead of going to 0', () => {
    expect(quantityChange(base, -1)).toEqual({ status: 'consumed' });
  });

  it('caps at 999', () => {
    expect(quantityChange({ ...base, quantity: 999 }, 1)).toEqual({ quantity: 999 });
  });
});
