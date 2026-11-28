import { supabase } from '@/lib/supabase';

import type { Item, ItemChanges, NewItem, ShelfLife, StorageLocation } from './types';

/** Active items for the signed-in user (RLS limits rows to their own). */
export async function fetchActiveItems(): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('status', 'active')
    .order('expires_on', { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchItem(id: string): Promise<Item | null> {
  const { data, error } = await supabase.from('items').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertItem(item: NewItem): Promise<Item> {
  const { data, error } = await supabase.from('items').insert(item).select().single();
  if (error) throw error;
  return data;
}

export async function updateItem(id: string, changes: ItemChanges): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .update(changes)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', id);
  if (error) throw error;
}

export async function searchShelfLife(
  query: string,
  storage: StorageLocation | null,
): Promise<ShelfLife[]> {
  const { data, error } = await supabase.rpc('search_shelf_life', {
    query,
    ...(storage ? { storage_filter: storage } : {}),
    max_results: 8,
  });
  if (error) throw error;
  return data;
}

/** The FoodKeeper entry for one product in one storage location, if it exists. */
export async function fetchShelfLifeFor(
  sourceId: number,
  storage: StorageLocation,
): Promise<ShelfLife | null> {
  const { data, error } = await supabase
    .from('shelf_life')
    .select('*')
    .eq('source_id', sourceId)
    .eq('storage', storage)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertItems(items: NewItem[]): Promise<Item[]> {
  const { data, error } = await supabase.from('items').insert(items).select();
  if (error) throw error;
  return data;
}
