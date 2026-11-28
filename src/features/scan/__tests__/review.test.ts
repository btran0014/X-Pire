import { describe, expect, it } from '@jest/globals';

import { rowsToItems, toReviewRows, type ReviewRow } from '../review';

const RECEIPT = 'r1';
const PURCHASED = '2026-11-28';

const rows: ReviewRow[] = toReviewRows({
  receiptId: RECEIPT,
  purchasedOn: PURCHASED,
  isReceipt: true,
  items: [
    {
      name: 'Milk',
      quantity: 1,
      storage: 'fridge',
      expiresOn: '2026-12-05',
      expirySource: 'ai',
      confidence: 0.9,
      note: null,
    },
    {
      name: 'Chicken',
      quantity: 2,
      storage: 'fridge',
      expiresOn: '2026-11-29',
      expirySource: 'foodkeeper',
      confidence: 0.3,
      note: 'USDA',
    },
    {
      name: 'Mystery',
      quantity: 1,
      storage: 'pantry',
      expiresOn: null,
      expirySource: 'manual',
      confidence: 0,
      note: 'Pick a date',
    },
  ],
});

describe('toReviewRows', () => {
  it('includes every scanned item by default with stable keys', () => {
    expect(rows.map((r) => [r.key, r.include, r.name])).toEqual([
      ['0', true, 'Milk'],
      ['1', true, 'Chicken'],
      ['2', true, 'Mystery'],
    ]);
  });
});

describe('rowsToItems', () => {
  it('turns included rows into items linked to the receipt', () => {
    const { items, errors } = rowsToItems(rows.slice(0, 2), PURCHASED, RECEIPT);
    expect(errors).toEqual({});
    expect(items).toEqual([
      expect.objectContaining({
        name: 'Milk',
        expires_on: '2026-12-05',
        expiry_source: 'ai',
        confidence: 0.9,
        receipt_id: RECEIPT,
        purchased_on: PURCHASED,
      }),
      expect.objectContaining({
        name: 'Chicken',
        quantity: 2,
        expiry_source: 'foodkeeper',
        receipt_id: RECEIPT,
      }),
    ]);
  });

  it('asks for a date when there is no estimate', () => {
    expect(rowsToItems(rows, PURCHASED, RECEIPT).errors).toEqual({ '2': 'Pick an expiry date' });
  });

  it('skips excluded rows and validates names and dates', () => {
    const edited: ReviewRow[] = [
      { ...rows[0]!, name: '   ' },
      { ...rows[1]!, expiresOn: '2026-11-01' },
      { ...rows[2]!, include: false },
    ];
    const { items, errors } = rowsToItems(edited, PURCHASED, RECEIPT);
    expect(items).toEqual([]);
    expect(Object.keys(errors)).toEqual(['0', '1']);
  });

  it('drops the AI confidence once the user sets the date themselves', () => {
    const { items } = rowsToItems([{ ...rows[0]!, expirySource: 'manual' }], PURCHASED, RECEIPT);
    expect(items[0]?.confidence).toBeNull();
  });
});
