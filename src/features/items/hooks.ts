import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteItem,
  fetchActiveItems,
  fetchItem,
  insertItem,
  searchShelfLife,
  updateItem,
} from './api';
import type { Item, ItemChanges, NewItem, StorageLocation } from './types';

export const itemKeys = {
  active: ['items', 'active'] as const,
  detail: (id: string) => ['items', 'detail', id] as const,
};

export function useActiveItems() {
  return useQuery({ queryKey: itemKeys.active, queryFn: fetchActiveItems });
}

export function useItem(id: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: itemKeys.detail(id),
    queryFn: () => fetchItem(id),
    // Show the copy from the list instantly while the fresh one loads.
    initialData: () =>
      queryClient.getQueryData<Item[]>(itemKeys.active)?.find((item) => item.id === id),
  });
}

export function useShelfLifeSearch(query: string, storage: StorageLocation | null) {
  const term = query.trim();
  return useQuery({
    queryKey: ['shelf_life', 'search', term.toLowerCase(), storage],
    queryFn: () => searchShelfLife(term, storage),
    enabled: term.length >= 2,
    staleTime: 24 * 60 * 60 * 1000, // reference data rarely changes
    placeholderData: keepPreviousData,
  });
}

export function useAddItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: NewItem) => insertItem(item),
    onSuccess: (created) => {
      queryClient.setQueryData<Item[]>(itemKeys.active, (old) => [...(old ?? []), created]);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: itemKeys.active }),
  });
}

/**
 * Updates an item, applying the change to the cached list right away and rolling back
 * if the server rejects it. Items that stop being active drop out of the list.
 */
export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: ItemChanges }) => updateItem(id, changes),
    onMutate: async ({ id, changes }) => {
      await queryClient.cancelQueries({ queryKey: itemKeys.active });
      const previous = queryClient.getQueryData<Item[]>(itemKeys.active);
      queryClient.setQueryData<Item[]>(itemKeys.active, (old) =>
        (old ?? [])
          .map((item) => (item.id === id ? { ...item, ...changes } : item))
          .filter((item) => item.status === 'active'),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(itemKeys.active, context.previous);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(itemKeys.detail(updated.id), updated);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: itemKeys.active }),
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteItem(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: itemKeys.active });
      const previous = queryClient.getQueryData<Item[]>(itemKeys.active);
      queryClient.setQueryData<Item[]>(itemKeys.active, (old) =>
        (old ?? []).filter((item) => item.id !== id),
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(itemKeys.active, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: itemKeys.active }),
  });
}

/** One-tap quantity change: decreasing from 1 marks the item as used up (consumed). */
export function quantityChange(item: Item, delta: 1 | -1): ItemChanges {
  if (delta === -1 && item.quantity <= 1) return { status: 'consumed' };
  return { quantity: Math.min(999, item.quantity + delta) };
}
