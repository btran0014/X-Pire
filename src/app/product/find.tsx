import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { ItemAvatar } from '@/components/item-avatar';
import { OffCredit } from '@/components/off-credit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
  ProductLookupError,
  productItemName,
  searchProducts,
  type Product,
} from '@/features/products/openfoodfacts';
import { openBarcodeScanner, resolvePick } from '@/features/products/picker';
import { useTheme } from '@/hooks/use-theme';

/** Search Open Food Facts by name. Searches run only when the user taps Search (rate limits). */
export default function FindProductScreen() {
  const { pickId, q } = useLocalSearchParams<{ pickId?: string; q?: string }>();
  const theme = useTheme();
  const [query, setQuery] = useState(q ?? '');
  const search = useMutation({ mutationFn: (text: string) => searchProducts(text) });

  // Run the prefilled search once when the screen opens.
  useEffect(() => {
    if (q && q.trim().length >= 2) search.mutate(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = (product: Product) => {
    resolvePick(pickId, product);
    router.back();
  };

  const submit = () => {
    if (query.trim().length >= 2 && !search.isPending) search.mutate(query);
  };

  return (
    <ThemedView style={styles.flex}>
      <FlatList
        data={search.data ?? []}
        keyExtractor={(p) => p.barcode}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.searchRow}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={submit}
                returnKeyType="search"
                placeholder="Product name and brand"
                placeholderTextColor={theme.textSecondary}
                autoCorrect={false}
                accessibilityLabel="Search products"
                style={[
                  styles.input,
                  { backgroundColor: theme.backgroundElement, color: theme.text },
                ]}
              />
              <Button label="Search" onPress={submit} loading={search.isPending} />
            </View>
            <Button
              label="Scan the barcode instead"
              variant="secondary"
              onPress={() => {
                router.back();
                if (pickId) openBarcodeScanner((product) => resolvePick(pickId, product));
              }}
            />
            {search.isError ? (
              <ThemedText themeColor="expired">
                {search.error instanceof ProductLookupError
                  ? search.error.message
                  : 'Search failed. Check your connection.'}
              </ThemedText>
            ) : null}
            {search.isSuccess && search.data.length === 0 ? (
              <ThemedText themeColor="textSecondary">
                No matches. Try fewer words, or scan the barcode.
              </ThemedText>
            ) : null}
            {search.isPending && !search.data ? <ActivityIndicator color={theme.tint} /> : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => choose(item)}
            style={({ pressed }) => [
              styles.result,
              { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
            ]}>
            <ItemAvatar name={item.name} imageUrl={item.imageUrl} size={56} />
            <View style={styles.flex}>
              <ThemedText type="smallBold" numberOfLines={2}>
                {productItemName(item)}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {[item.size, item.barcode].filter(Boolean).join(' · ')}
              </ThemedText>
            </View>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={search.data?.length ? <OffCredit /> : undefined}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: {
    padding: Spacing.four,
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: { gap: Spacing.three, marginBottom: Spacing.three },
  searchRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  input: {
    flex: 1,
    minHeight: 48,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Spacing.three,
  },
  separator: { height: Spacing.two },
});
