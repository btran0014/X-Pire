import type { IsoDate } from '@/lib/dates';

import { itemFormSchema } from '../items/form-schema';
import type { ExpirySource, NewItem, StorageLocation } from '../items/types';
import type { ScanResult } from './api';

export type ReviewRow = {
  key: string;
  include: boolean;
  name: string;
  quantity: number;
  storage: StorageLocation;
  expiresOn: IsoDate | null;
  expirySource: ExpirySource;
  confidence: number;
  note: string | null;
};

export const scanKey = (receiptId: string) => ['scan', receiptId] as const;

export function toReviewRows(result: ScanResult): ReviewRow[] {
  return result.items.map((item, index) => ({
    key: `${index}`,
    include: true,
    name: item.name,
    quantity: item.quantity,
    storage: item.storage,
    expiresOn: item.expiresOn,
    expirySource: item.expirySource,
    confidence: item.confidence,
    note: item.note,
  }));
}

/**
 * Validates the included rows with the same rules as the add-item form.
 * Returns the items to insert, or a message per invalid row (keyed by row key).
 */
export function rowsToItems(
  rows: readonly ReviewRow[],
  purchasedOn: IsoDate,
  receiptId: string,
): { items: NewItem[]; errors: Record<string, string> } {
  const items: NewItem[] = [];
  const errors: Record<string, string> = {};

  for (const row of rows) {
    if (!row.include) continue;
    if (!row.expiresOn) {
      errors[row.key] = 'Pick an expiry date';
      continue;
    }
    const parsed = itemFormSchema.safeParse({
      name: row.name,
      quantity: row.quantity,
      storage: row.storage,
      purchasedOn,
      expiresOn: row.expiresOn,
      expirySource: row.expirySource,
    });
    if (!parsed.success) {
      errors[row.key] = parsed.error.issues[0]?.message ?? 'Check this item';
      continue;
    }
    const v = parsed.data;
    items.push({
      name: v.name.trim(),
      quantity: v.quantity,
      storage: v.storage,
      purchased_on: v.purchasedOn,
      expires_on: v.expiresOn,
      expiry_source: v.expirySource,
      confidence: row.expirySource === 'manual' ? null : row.confidence,
      receipt_id: receiptId,
    });
  }

  return { items, errors };
}
