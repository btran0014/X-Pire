/**
 * Open Food Facts client (read-only). Called from the phone so its rate limits apply per user:
 * 15 product reads and 10 searches per minute. Searches only run when the user asks.
 * Data: ODbL. Photos: CC BY-SA. The app credits "Open Food Facts" wherever photos are shown.
 */
import { normalizeBarcode } from './barcode';

const API = 'https://world.openfoodfacts.org';
const SEARCH = 'https://search.openfoodfacts.org';
const FIELDS = 'code,product_name,brands,quantity,image_front_small_url';
// Identifies the app as Open Food Facts asks. (Ignored by browsers in the web preview.)
const HEADERS = { 'User-Agent': 'X-Pire/3.0 (personal grocery app)' };

export type Product = {
  barcode: string;
  name: string;
  brand: string | null;
  size: string | null;
  imageUrl: string | null;
};

export const OFF_IMAGE_PREFIX = 'https://images.openfoodfacts.org/';

type RawProduct = {
  code?: unknown;
  product_name?: unknown;
  brands?: unknown;
  quantity?: unknown;
  image_front_small_url?: unknown;
};

const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** "Ferrero, Nutella" -> "Ferrero"; ["xx:hy-vee-inc"] -> "Hy Vee Inc". */
export function cleanBrand(brands: unknown): string | null {
  const first = Array.isArray(brands)
    ? brands[0]
    : typeof brands === 'string'
      ? brands.split(',')[0]
      : null;
  const raw = text(first);
  if (!raw) return null;
  if (!/^[a-z]{2}:/.test(raw)) {
    // Search results sometimes come back all lowercase ("chobani"); capitalise those.
    const cased =
      raw === raw.toLowerCase() ? raw.replace(/\b\p{L}/gu, (c) => c.toUpperCase()) : raw;
    return cased.slice(0, 100);
  }
  return raw
    .slice(3)
    .split('-')
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(' ')
    .slice(0, 100);
}

/** Normalizes one Open Food Facts product; null if it has no usable name or barcode. */
export function toProduct(raw: RawProduct | null | undefined): Product | null {
  if (!raw) return null;
  const barcode = normalizeBarcode(text(raw.code));
  const name = text(raw.product_name);
  if (!barcode || !name) return null;
  const image = text(raw.image_front_small_url);
  return {
    barcode,
    name: name.slice(0, 100),
    brand: cleanBrand(raw.brands),
    size: text(raw.quantity)?.slice(0, 40) ?? null,
    imageUrl: image?.startsWith(OFF_IMAGE_PREFIX) ? image : null,
  };
}

/** Display name for an item created from a product, e.g. "Chobani Greek Yogurt Nonfat Plain". */
export function productItemName(product: Product): string {
  const { name, brand } = product;
  const full =
    brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${name}` : name;
  return full.slice(0, 100);
}

// --- Throttling -------------------------------------------------------------------------------
/**
 * Runs tasks one at a time, at least `minGapMs` apart. Callers wait their turn instead of
 * failing, so a burst of taps can never exceed Open Food Facts' per-minute limits.
 */
export function makeThrottle(minGapMs: number) {
  let lastCall = -Infinity;
  let chain: Promise<unknown> = Promise.resolve();
  return function throttled<T>(task: () => Promise<T>): Promise<T> {
    const run = chain.then(async () => {
      const wait = lastCall + minGapMs - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastCall = Date.now();
      return task();
    });
    chain = run.catch(() => undefined);
    return run;
  };
}

/** Product reads: limit 15/min, so ~13/min. */
const throttledRead = makeThrottle(4_500);
/** Searches: limit 10/min, so ~9/min. */
const throttledSearch = makeThrottle(6_500);

export class ProductLookupError extends Error {}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: HEADERS });
  if (res.status === 429 || res.status === 503) {
    throw new ProductLookupError('Open Food Facts is busy. Try again in a minute.');
  }
  if (!res.ok && res.status !== 404) {
    throw new ProductLookupError(`Open Food Facts error (${res.status}).`);
  }
  return res.json();
}

/** Exact product for a barcode, or null if Open Food Facts doesn't know it. */
export function fetchProductByBarcode(barcode: string): Promise<Product | null> {
  const code = normalizeBarcode(barcode);
  if (!code) return Promise.resolve(null);
  return throttledRead(async () => {
    const body = (await getJson(`${API}/api/v2/product/${code}?fields=${FIELDS}`)) as {
      status?: number;
      product?: RawProduct;
    };
    return body.status === 1 ? toProduct({ ...body.product, code }) : null;
  });
}

/** Full-text product search (Search-a-licious). Only on an explicit user action; throttled. */
export async function searchProducts(query: string, limit = 8): Promise<Product[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `${SEARCH}/search?q=${encodeURIComponent(q)}&page_size=${limit}&fields=${FIELDS}`;
  const body = (await throttledSearch(() => getJson(url))) as { hits?: RawProduct[] };
  const seen = new Set<string>();
  const products: Product[] = [];
  for (const hit of body.hits ?? []) {
    const product = toProduct(hit);
    if (product && !seen.has(product.barcode)) {
      seen.add(product.barcode);
      products.push(product);
    }
  }
  return products;
}
