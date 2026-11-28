import { todayIso } from '@/lib/dates';
import { supabase } from '@/lib/supabase';

import type { Item } from '../items/types';
import { itemsToCsv } from './csv';

export async function fetchAllItems(): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

/** Web preview: download the CSV through the browser. */
export async function exportItemsCsv(): Promise<number> {
  const items = await fetchAllItems();
  const url = URL.createObjectURL(new Blob([itemsToCsv(items)], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `x-pire-items-${todayIso()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  return items.length;
}
