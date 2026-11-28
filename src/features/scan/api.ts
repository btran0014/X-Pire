import { FunctionsHttpError } from '@supabase/supabase-js';

import type { IsoDate } from '@/lib/dates';
import { supabase } from '@/lib/supabase';

import type { ExpirySource, StorageLocation } from '../items/types';
import type { ReceiptImage } from './image';

/** One line the server read from the receipt (mirrors supabase/functions/parse-receipt/logic.ts). */
export type ScannedItem = {
  name: string;
  quantity: number;
  storage: StorageLocation;
  expiresOn: IsoDate | null;
  expirySource: ExpirySource;
  confidence: number;
  note: string | null;
};

export type ScanResult = {
  receiptId: string;
  purchasedOn: IsoDate;
  isReceipt: boolean;
  items: ScannedItem[];
};

export class ScanError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
  }
}

export async function parseReceipt(image: ReceiptImage, purchasedOn: IsoDate): Promise<ScanResult> {
  const { data, error } = await supabase.functions.invoke<ScanResult>('parse-receipt', {
    body: { image: image.base64, mimeType: image.mimeType, purchasedOn },
  });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;
      throw new ScanError(body?.message ?? 'Could not read the receipt.', body?.error ?? 'http');
    }
    throw new ScanError("Can't reach the server. Check your connection and try again.", 'network');
  }
  if (!data) throw new ScanError('Empty response from the server.', 'empty');
  return data;
}
