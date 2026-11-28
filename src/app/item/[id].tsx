import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { formToItem, itemToForm, itemToProduct } from '@/features/items/form-schema';
import { useDeleteItem, useItem, useUpdateItem } from '@/features/items/hooks';
import { ItemForm } from '@/features/items/item-form';
import type { ItemStatus } from '@/features/items/types';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';

const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const item = useItem(id);
  const update = useUpdateItem();
  const remove = useDeleteItem();

  if (item.isPending) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={theme.tint} />
      </ThemedView>
    );
  }

  if (!item.data) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>
          {item.isError ? "Couldn't load this item." : 'This item no longer exists.'}
        </ThemedText>
        <Button label="Back to fridge" variant="secondary" onPress={close} />
      </ThemedView>
    );
  }

  const current = item.data;
  const setStatus = (status: ItemStatus) =>
    update.mutate({ id: current.id, changes: { status } }, { onSuccess: close });

  const onDelete = async () => {
    const ok = await confirm(
      'Delete item?',
      `"${current.name}" will be removed permanently. To keep it in your history, use "Used it up" or "Threw it out" instead.`,
      'Delete',
    );
    if (ok) remove.mutate(current.id, { onSuccess: close });
  };

  const busy = update.isPending || remove.isPending;
  const error = update.error ?? remove.error;

  return (
    <ItemForm
      key={current.id}
      initialValues={itemToForm(current)}
      initialProduct={itemToProduct(current)}
      submitLabel="Save changes"
      submitting={update.isPending}
      errorMessage={error ? `Couldn't save: ${error.message}` : null}
      onSubmit={(values, product) =>
        update.mutate(
          { id: current.id, changes: formToItem(values, product) },
          { onSuccess: close },
        )
      }
      footer={
        <View style={styles.footer}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button
                label="Used it up"
                variant="secondary"
                disabled={busy}
                onPress={() => setStatus('consumed')}
              />
            </View>
            <View style={styles.flex}>
              <Button
                label="Threw it out"
                variant="secondary"
                disabled={busy}
                onPress={() => setStatus('discarded')}
              />
            </View>
          </View>
          <Button label="Delete" variant="danger" disabled={busy} onPress={onDelete} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  footer: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
  },
});
