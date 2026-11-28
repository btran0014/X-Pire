import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

import { normalizeBarcode } from './barcode';
import { fetchProductByBarcode, OFF_IMAGE_PREFIX, type Product } from './openfoodfacts';

/**
 * Product for a barcode: the user's own earlier item with that barcode first (repeat
 * purchases, no network call to Open Food Facts), then Open Food Facts.
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
  if (data?.image_url?.startsWith(OFF_IMAGE_PREFIX)) {
    return { barcode, name: data.name, brand: data.brand, size: null, imageUrl: data.image_url };
  }
  return fetchProductByBarcode(barcode);
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
