import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

import { normalizeBarcode } from './barcode';
import { fetchProductByBarcode, OFF_IMAGE_PREFIX, type Product } from './openfoodfacts';

type HistoryRow = { name: string; brand: string | null; image_url: string | null };

/**
 * The user's earlier item for this barcode, if it was matched to a product (it has a photo or a
 * brand). An earlier item with neither was a barcode Open Food Facts didn't know, so it's worth
 * asking again: the product may have been added since.
 */
export function productFromHistory(row: HistoryRow | null, barcode: string): Product | null {
  if (!row) return null;
  const imageUrl = row.image_url?.startsWith(OFF_IMAGE_PREFIX) ? row.image_url : null;
  if (!imageUrl && !row.brand) return null;
  return { barcode, name: row.name, brand: row.brand, size: null, imageUrl };
}

/**
 * Product for a barcode: the user's own earlier matched item first (repeat purchases, no call
 * to Open Food Facts), then Open Food Facts.
 */
export async function lookupBarcode(raw: string): Promise<Product | null> {
  const barcode = normalizeBarcode(raw);
  if (!barcode) return null;

  const { data } = await supabase
    .from('items')
    .select('name, brand, image_url')
    .eq('barcode', barcode)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return productFromHistory(data, barcode) ?? fetchProductByBarcode(barcode);
}

export function useBarcodeProduct(barcode: string | null | undefined) {
  const code = normalizeBarcode(barcode);
  return useQuery({
    queryKey: ['product', 'barcode', code],
    queryFn: () => lookupBarcode(code!),
    enabled: code != null,
    staleTime: 7 * 24 * 60 * 60 * 1000,
    retry: 1,
  });
}
