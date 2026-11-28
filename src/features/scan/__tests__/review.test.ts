import { describe, expect, it } from '@jest/globals';

import { productChanges, rowsToItems, toReviewRows, type ReviewRow } from '../review';

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
      brand: null,
      size: null,
      barcode: null,
      emoji: null,
    },
    {
      name: 'Chicken',
      quantity: 2,
      storage: 'fridge',
      expiresOn: '2026-11-29',
      expirySource: 'foodkeeper',
      confidence: 0.3,
      note: 'USDA',
      brand: null,
      size: null,
      barcode: null,
      emoji: null,
    },
    {
      name: 'Mystery',
      quantity: 1,
      storage: 'pantry',
      expiresOn: null,
      expirySource: 'manual',
      confidence: 0,
      note: 'Pick a date',
      brand: null,
      size: null,
      barcode: null,
      emoji: null,
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

describe('productChanges', () => {
  it('uses the exact product name, photo and brand', () => {
    expect(
      productChanges({
        barcode: '0894700010137',
        name: 'Greek Yogurt Nonfat Plain',
        brand: 'Chobani',
        size: '32 OZ',
        imageUrl: 'https://images.openfoodfacts.org/x.jpg',
      }),
    ).toEqual({
      barcode: '0894700010137',
      name: 'Chobani Greek Yogurt Nonfat Plain',
      brand: 'Chobani',
      imageUrl: 'https://images.openfoodfacts.org/x.jpg',
    });
  });

  it('keeps the current name when only the barcode is known', () => {
    const changes = productChanges({
      barcode: '0049000028911',
      name: '',
      brand: null,
      size: null,
      imageUrl: null,
    });
    expect(changes).not.toHaveProperty('name');
    expect(changes.barcode).toBe('0049000028911');
  });

  it('saves product details with the item', () => {
    const row = {
      ...rows[0]!,
      ...productChanges({
        barcode: '3017620422003',
        name: 'Nutella',
        brand: 'Ferrero',
        size: null,
        imageUrl: 'https://images.openfoodfacts.org/n.jpg',
      }),
    };
    const { items } = rowsToItems([row], PURCHASED, RECEIPT);
    expect(items[0]).toMatchObject({
      name: 'Ferrero Nutella',
      barcode: '3017620422003',
      brand: 'Ferrero',
      image_url: 'https://images.openfoodfacts.org/n.jpg',
    });
    expect(items[0]?.emoji).toBe('🍽️'); // generic fallback is still stored
  });
});
