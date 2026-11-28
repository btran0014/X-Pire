import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { supabase } from '@/lib/supabase';
import { todayIso } from '@/lib/dates';

import type { Item } from '../items/types';
import { itemsToCsv } from './csv';

/** All of the user's items, including used-up and thrown-out ones. */
export async function fetchAllItems(): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

/** Writes a CSV of every item and opens the share sheet. */
export async function exportItemsCsv(): Promise<number> {
  const items = await fetchAllItems();
  const file = new File(Paths.cache, `x-pire-items-${todayIso()}.csv`);
  if (file.exists) file.delete();
  file.create();
  file.write(itemsToCsv(items));
  if (!(await Sharing.isAvailableAsync()))
    throw new Error('Sharing isn’t available on this device.');
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Export X-Pire items',
    UTI: 'public.comma-separated-values-text',
  });
  return items.length;
}
