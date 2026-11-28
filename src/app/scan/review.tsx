import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { DateField } from '@/components/date-field';
import { ItemAvatar } from '@/components/item-avatar';
import { OffCredit } from '@/components/off-credit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAddItems } from '@/features/items/hooks';
import { STORAGE_LABELS, STORAGE_LOCATIONS } from '@/features/items/types';
import type { ScanResult } from '@/features/scan/api';
import { useBarcodeProduct } from '@/features/products/lookup';
import { openBarcodeScanner, openProductSearch } from '@/features/products/picker';
import {
  clearedProduct,
  productChanges,
  rowsToItems,
  scanKey,
  toReviewRows,
  type ReviewRow,
} from '@/features/scan/review';
import { useTheme } from '@/hooks/use-theme';
import { addDaysIso } from '@/lib/dates';

export default function ReviewScreen() {
  const { receiptId } = useLocalSearchParams<{ receiptId: string }>();
  const queryClient = useQueryClient();
  const [result] = useState(() => queryClient.getQueryData<ScanResult>(scanKey(receiptId)));
  const [rows, setRows] = useState<ReviewRow[]>(() => (result ? toReviewRows(result) : []));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const add = useAddItems();

  if (!result) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText style={styles.centerText}>
          This scan is no longer available. Please scan the receipt again.
        </ThemedText>
        <Button label="Back to scan" variant="secondary" onPress={() => router.replace('/scan')} />
      </ThemedView>
    );
  }

  const update = (key: string, changes: Partial<ReviewRow>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...changes } : row)));
    setErrors(({ [key]: _removed, ...rest }) => rest);
  };

  const included = rows.filter((r) => r.include).length;

  const save = () => {
    const { items, errors: rowErrors } = rowsToItems(rows, result.purchasedOn, result.receiptId);
    setErrors(rowErrors);
    if (Object.keys(rowErrors).length > 0 || items.length === 0) return;
    add.mutate(items, {
      onSuccess: () => {
        queryClient.removeQueries({ queryKey: scanKey(result.receiptId) });
        router.dismissTo('/');
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ThemedView style={styles.flex}>
        <FlatList
          data={rows}
          keyExtractor={(row) => row.key}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <ThemedText type="small" themeColor="textSecondary">
              Found {rows.length} item{rows.length === 1 ? '' : 's'}. Check names and dates, untick
              anything you don&apos;t want, then add them.
            </ThemedText>
          }
          renderItem={({ item: row }) => (
            <ReviewCard
              row={row}
              purchasedOn={result.purchasedOn}
              error={errors[row.key]}
              onChange={(changes) => update(row.key, changes)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListFooterComponent={
            rows.some((r) => r.imageUrl) ? (
              <View style={styles.footerCredit}>
                <OffCredit />
              </View>
            ) : undefined
          }
        />
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          {add.isError ? (
            <ThemedText type="small" themeColor="expired">
              Couldn&apos;t save: {add.error.message}
            </ThemedText>
          ) : null}
          {Object.keys(errors).length > 0 ? (
            <ThemedText type="small" themeColor="expired">
              Fix the highlighted items first.
            </ThemedText>
          ) : null}
          <Button
            label={
              included === 0
                ? 'Nothing selected'
                : `Add ${included} item${included === 1 ? '' : 's'}`
            }
            disabled={included === 0}
            loading={add.isPending}
            onPress={save}
          />
        </SafeAreaView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

function ReviewCard({
  row,
  purchasedOn,
  error,
  onChange,
}: {
  row: ReviewRow;
  purchasedOn: string;
  error?: string;
  onChange: (changes: Partial<ReviewRow>) => void;
}) {
  const theme = useTheme();
  const dim = row.include ? 1 : 0.5;

  // A barcode printed on the receipt resolves to the exact product (photo, brand, name).
  const printed = useBarcodeProduct(row.barcode && !row.imageUrl ? row.barcode : null);
  useEffect(() => {
    if (printed.data) onChange(productChanges(printed.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply once when the lookup lands
  }, [printed.data]);

  const searchQuery = [row.brand, row.name].filter(Boolean).join(' ');

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.card, error ? { borderColor: theme.expired, borderWidth: 2 } : null]}>
      <View style={styles.cardTop}>
        <ItemAvatar name={row.name} imageUrl={row.imageUrl} emoji={row.emoji} size={48} />
        <TextInput
          value={row.name}
          onChangeText={(name) => onChange({ name })}
          editable={row.include}
          maxLength={100}
          accessibilityLabel="Item name"
          style={[styles.name, { color: theme.text, opacity: dim }]}
        />
        <Chip
          label={row.include ? '✓ Add' : 'Skip'}
          selected={row.include}
          onPress={() => onChange({ include: !row.include })}
        />
      </View>

      {row.include ? (
        <>
          <View style={styles.inline}>
            {row.barcode && printed.isFetching ? (
              <ThemedText type="small" themeColor="textSecondary">
                Finding product…
              </ThemedText>
            ) : null}
            <Chip
              label="Scan barcode"
              selected={false}
              onPress={() => openBarcodeScanner((product) => onChange(productChanges(product)))}
            />
            <Chip
              label={row.imageUrl ? 'Change product' : 'Find product'}
              selected={false}
              onPress={() =>
                openProductSearch(searchQuery, (product) => onChange(productChanges(product)))
              }
            />
            {row.barcode || row.imageUrl ? (
              <Chip label="Use generic" selected={false} onPress={() => onChange(clearedProduct)} />
            ) : null}
          </View>

          <View style={styles.inline}>
            {STORAGE_LOCATIONS.map((loc) => (
              <Chip
                key={loc}
                label={STORAGE_LABELS[loc]}
                selected={row.storage === loc}
                onPress={() => onChange({ storage: loc })}
              />
            ))}
          </View>

          <View style={styles.rowBetween}>
            <ThemedText type="smallBold">Quantity</ThemedText>
            <View style={styles.inline}>
              <Chip
                label="−"
                selected={false}
                onPress={() => onChange({ quantity: Math.max(1, row.quantity - 1) })}
              />
              <ThemedText type="smallBold" style={styles.qty}>
                {row.quantity}
              </ThemedText>
              <Chip
                label="+"
                selected={false}
                onPress={() => onChange({ quantity: Math.min(999, row.quantity + 1) })}
              />
            </View>
          </View>

          {row.expiresOn ? (
            <DateField
              label="Expires on"
              value={row.expiresOn}
              minimumDate={purchasedOn}
              onChange={(expiresOn) => onChange({ expiresOn, expirySource: 'manual' })}
            />
          ) : (
            <View style={styles.rowBetween}>
              <ThemedText type="smallBold">Expires on</ThemedText>
              <Chip
                label="Set date"
                selected={false}
                onPress={() =>
                  onChange({ expiresOn: addDaysIso(purchasedOn, 7), expirySource: 'manual' })
                }
              />
            </View>
          )}

          <ThemedText type="small" themeColor="textSecondary">
            {sourceLabel(row)}
          </ThemedText>
          {error ? (
            <ThemedText type="small" themeColor="expired">
              {error}
            </ThemedText>
          ) : null}
        </>
      ) : null}
    </ThemedView>
  );
}

function sourceLabel(row: ReviewRow): string {
  if (row.expirySource === 'manual')
    return row.note && !row.expiresOn ? row.note : 'Date set by you';
  const base =
    row.expirySource === 'foodkeeper' ? 'Estimated from USDA FoodKeeper' : 'Estimated by AI';
  return row.note ? `${base} · ${row.note}` : base;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
  },
  list: {
    gap: Spacing.three,
    padding: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  separator: {
    height: Spacing.three,
  },
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    minHeight: 40,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerCredit: {
    marginTop: Spacing.three,
  },
  qty: {
    minWidth: 24,
    textAlign: 'center',
  },
  footer: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});
