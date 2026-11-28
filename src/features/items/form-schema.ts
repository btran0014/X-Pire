import { z } from 'zod';

import { addDaysIso, todayIso, type IsoDate } from '@/lib/dates';

import type { Item, NewItem } from './types';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date');

export const itemFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter a name').max(100, 'Keep it under 100 characters'),
    quantity: z.number().int().min(1, 'At least 1').max(999, 'At most 999'),
    storage: z.enum(['fridge', 'freezer', 'pantry']),
    purchasedOn: isoDate,
    expiresOn: isoDate,
    expirySource: z.enum(['ai', 'foodkeeper', 'manual']),
  })
  .refine((v) => v.expiresOn >= v.purchasedOn, {
    path: ['expiresOn'],
    message: 'Expiry can’t be before the purchase date',
  });

export type ItemFormValues = z.infer<typeof itemFormSchema>;

export function emptyItemForm(today: IsoDate = todayIso()): ItemFormValues {
  return {
    name: '',
    quantity: 1,
    storage: 'fridge',
    purchasedOn: today,
    expiresOn: addDaysIso(today, 7),
    expirySource: 'manual',
  };
}

export function itemToForm(item: Item): ItemFormValues {
  return {
    name: item.name,
    quantity: item.quantity,
    storage: item.storage,
    purchasedOn: item.purchased_on,
    expiresOn: item.expires_on,
    expirySource: item.expiry_source,
  };
}

export function formToItem(values: ItemFormValues): NewItem {
  return {
    name: values.name.trim(),
    quantity: values.quantity,
    storage: values.storage,
    purchased_on: values.purchasedOn,
    expires_on: values.expiresOn,
    expiry_source: values.expirySource,
  };
}
