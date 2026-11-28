import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

// eslint-disable-next-line import/first
import { productFromHistory } from '../lookup';

const PHOTO = 'https://images.openfoodfacts.org/images/products/x.jpg';

describe('productFromHistory', () => {
  it('reuses an earlier item that was matched to a product', () => {
    expect(
      productFromHistory({ name: 'Chobani Greek Yogurt', brand: 'Chobani', image_url: PHOTO }, '1'),
    ).toEqual({
      barcode: '1',
      name: 'Chobani Greek Yogurt',
      brand: 'Chobani',
      size: null,
      imageUrl: PHOTO,
    });
  });

  it('reuses a matched product even without a photo', () => {
    expect(
      productFromHistory({ name: 'Store milk', brand: 'Great Value', image_url: null }, '1'),
    ).toMatchObject({ brand: 'Great Value', imageUrl: null });
  });

  it('asks Open Food Facts again for barcodes it did not know before', () => {
    expect(productFromHistory({ name: 'Mystery', brand: null, image_url: null }, '1')).toBeNull();
    expect(productFromHistory(null, '1')).toBeNull();
  });

  it('never reuses a photo URL from anywhere but Open Food Facts', () => {
    expect(
      productFromHistory({ name: 'X', brand: 'B', image_url: 'https://evil.example/x.jpg' }, '1')
        ?.imageUrl,
    ).toBeNull();
  });
});
