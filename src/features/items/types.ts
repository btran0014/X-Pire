import type { Enums, Tables, TablesInsert, TablesUpdate } from '@/types/database';

export type Item = Tables<'items'>;
export type NewItem = TablesInsert<'items'>;
export type ItemChanges = TablesUpdate<'items'>;
export type ShelfLife = Tables<'shelf_life'>;

export type StorageLocation = Enums<'storage_location'>;
export type ItemStatus = Enums<'item_status'>;
export type ExpirySource = Enums<'expiry_source'>;

export const STORAGE_LOCATIONS: readonly StorageLocation[] = ['fridge', 'freezer', 'pantry'];

export const STORAGE_LABELS: Record<StorageLocation, string> = {
  fridge: 'Fridge',
  freezer: 'Freezer',
  pantry: 'Pantry',
};
