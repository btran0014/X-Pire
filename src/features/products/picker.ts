import { router } from 'expo-router';

import type { Product } from './openfoodfacts';

/**
 * Lets a screen ask for a product (scan or search) and get the choice back.
 * The caller registers a callback, opens the picker route with the returned id,
 * and the picker resolves it before navigating back.
 */
type Callback = (product: Product) => void;

const pending = new Map<string, Callback>();
let counter = 0;

function register(callback: Callback): string {
  const id = `pick-${Date.now()}-${counter++}`;
  pending.set(id, callback);
  return id;
}

export function resolvePick(id: string | undefined, product: Product): void {
  if (!id) return;
  const callback = pending.get(id);
  pending.delete(id);
  callback?.(product);
}

export function openBarcodeScanner(onPick: Callback): void {
  router.push({ pathname: '/product/scan', params: { pickId: register(onPick) } });
}

export function openProductSearch(query: string, onPick: Callback): void {
  router.push({ pathname: '/product/find', params: { pickId: register(onPick), q: query } });
}
