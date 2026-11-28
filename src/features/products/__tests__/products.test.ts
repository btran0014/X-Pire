import { describe, expect, it } from '@jest/globals';

import { gs1CheckDigit, hasValidCheckDigit, normalizeBarcode } from '../barcode';
import { cleanEmoji, DEFAULT_EMOJI, emojiFor } from '../emoji';
import { cleanBrand, makeThrottle, productItemName, toProduct } from '../openfoodfacts';

describe('barcodes', () => {
  it('computes GS1 check digits', () => {
    expect(gs1CheckDigit('301762042200')).toBe(3); // Nutella EAN-13
    expect(gs1CheckDigit('04900002891')).toBe(1); // Diet Coke UPC-A
  });

  it('normalizes scanned and printed codes', () => {
    expect(normalizeBarcode('3017620422003')).toBe('3017620422003');
    expect(normalizeBarcode('049000028911')).toBe('0049000028911'); // UPC-A -> EAN-13
    expect(normalizeBarcode('04900002891')).toBe('0049000028911'); // receipt dropped the check digit
    expect(normalizeBarcode(' 0 49000 02891 1 ')).toBe('0049000028911');
    expect(normalizeBarcode('301762042200')).toBe('3017620422003'); // EAN-13 printed without check digit
  });

  it('rejects junk and wrong check digits', () => {
    expect(normalizeBarcode('3017620422004')).toBeNull();
    expect(normalizeBarcode('12345')).toBeNull();
    expect(normalizeBarcode('')).toBeNull();
    expect(normalizeBarcode(null)).toBeNull();
    expect(hasValidCheckDigit('abc')).toBe(false);
  });
});

describe('Open Food Facts normalization', () => {
  it('cleans brand formats from both APIs', () => {
    expect(cleanBrand('Ferrero, Nutella')).toBe('Ferrero');
    expect(cleanBrand(['xx:hy-vee-inc'])).toBe('Hy Vee Inc');
    expect(cleanBrand(['chobani'])).toBe('Chobani');
    expect(cleanBrand('McCain')).toBe('McCain');
    expect(cleanBrand(undefined)).toBeNull();
  });

  it('turns API records into products and drops unusable ones', () => {
    expect(
      toProduct({
        code: '0049000028911',
        product_name: 'Diet Coke Soft Drink',
        brands: 'Coca-Cola',
        quantity: '144 fl oz',
        image_front_small_url:
          'https://images.openfoodfacts.org/images/products/004/900/002/8911/front_en.24.200.jpg',
      }),
    ).toEqual({
      barcode: '0049000028911',
      name: 'Diet Coke Soft Drink',
      brand: 'Coca-Cola',
      size: '144 fl oz',
      imageUrl:
        'https://images.openfoodfacts.org/images/products/004/900/002/8911/front_en.24.200.jpg',
    });
    expect(toProduct({ code: '0049000028911' })).toBeNull(); // no name
    expect(toProduct({ code: 'nope', product_name: 'x' })).toBeNull();
    expect(
      toProduct({
        code: '3017620422003',
        product_name: 'Nutella',
        image_front_small_url: 'https://evil.example/x.jpg',
      })?.imageUrl,
    ).toBeNull();
  });

  it('builds item names without repeating the brand', () => {
    const base = { barcode: '1', size: null, imageUrl: null };
    expect(productItemName({ ...base, name: 'Greek Yogurt Nonfat Plain', brand: 'Chobani' })).toBe(
      'Chobani Greek Yogurt Nonfat Plain',
    );
    expect(productItemName({ ...base, name: 'Coca-Cola Classic', brand: 'Coca-Cola' })).toBe(
      'Coca-Cola Classic',
    );
  });
});

describe('emoji', () => {
  it.each([
    ['2% milk, 1 gallon', '🥛'],
    ['Boneless skinless chicken breast', '🍗'],
    ['Baby spinach, 5 oz', '🥬'],
    ['Frozen peas, 12 oz', '🧊'],
    ['Large eggs, 12 count', '🥚'],
    ['Mystery item', DEFAULT_EMOJI],
  ])('%s -> %s', (name, emoji) => {
    expect(emojiFor(name)).toBe(emoji);
  });

  it('only accepts real emoji from the model', () => {
    expect(cleanEmoji('🥛')).toBe('🥛');
    expect(cleanEmoji('🍽️')).toBe('🍽️');
    expect(cleanEmoji('milk')).toBeNull();
    expect(cleanEmoji('🥛 milk')).toBeNull();
    expect(cleanEmoji(42)).toBeNull();
  });
});

describe('makeThrottle', () => {
  it('runs tasks in order, at least the gap apart, even when called in a burst', async () => {
    const throttled = makeThrottle(40);
    const started: number[] = [];
    const t0 = Date.now();
    const results = await Promise.all(
      [1, 2, 3].map((n) =>
        throttled(async () => {
          started.push(Date.now() - t0);
          return n;
        }),
      ),
    );
    expect(results).toEqual([1, 2, 3]);
    expect(started[0]).toBeLessThan(30); // first one runs immediately
    expect(started[1]! - started[0]!).toBeGreaterThanOrEqual(35);
    expect(started[2]! - started[1]!).toBeGreaterThanOrEqual(35);
  });

  it('keeps going after a failed task', async () => {
    const throttled = makeThrottle(1);
    await expect(throttled(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    await expect(throttled(async () => 'ok')).resolves.toBe('ok');
  });
});
