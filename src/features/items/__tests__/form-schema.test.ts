import { describe, expect, it } from '@jest/globals';

import { emptyItemForm, formToItem, itemFormSchema } from '../form-schema';

const valid = { ...emptyItemForm('2026-11-28'), name: '  Milk  ' };

describe('itemFormSchema', () => {
  it('accepts a valid item and trims the name', () => {
    const parsed = itemFormSchema.parse(valid);
    expect(formToItem(parsed)).toEqual({
      name: 'Milk',
      quantity: 1,
      storage: 'fridge',
      purchased_on: '2026-11-28',
      expires_on: '2026-12-05',
      expiry_source: 'manual',
    });
  });

  it.each([
    [{ name: '   ' }, 'name'],
    [{ quantity: 0 }, 'quantity'],
    [{ quantity: 1000 }, 'quantity'],
    [{ expiresOn: '2026-11-27' }, 'expiresOn'],
    [{ purchasedOn: 'tomorrow' }, 'purchasedOn'],
  ])('rejects %o', (override, field) => {
    const result = itemFormSchema.safeParse({ ...valid, ...override });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path[0])).toContain(field);
  });
});
