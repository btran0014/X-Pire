import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { DateField } from '@/components/date-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { fetchShelfLifeFor } from './api';
import { itemFormSchema, type ItemFormValues } from './form-schema';
import { useShelfLifeSearch } from './hooks';
import { shelfLifeDisplayName, suggestExpiry } from './logic';
import { STORAGE_LABELS, STORAGE_LOCATIONS, type ShelfLife } from './types';

type ItemFormProps = {
  initialValues: ItemFormValues;
  submitLabel: string;
  submitting: boolean;
  errorMessage?: string | null;
  onSubmit: (values: ItemFormValues) => void;
  /** Extra actions under the save button (edit screen: used up, thrown out, delete). */
  footer?: ReactNode;
};

type Picked = Pick<ShelfLife, 'source_id' | 'name' | 'subtitle'>;

export function ItemForm({
  initialValues,
  submitLabel,
  submitting,
  errorMessage,
  onSubmit,
  footer,
}: ItemFormProps) {
  const theme = useTheme();
  const { control, handleSubmit, setValue, formState } = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: initialValues,
  });
  const [name, storage, purchasedOn, expirySource] = useWatch({
    control,
    name: ['name', 'storage', 'purchasedOn', 'expirySource'],
  });

  // FoodKeeper suggestions while typing a name.
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);
  const search = useShelfLifeSearch(showSuggestions ? name : '', storage);

  // The picked product's entry for the current storage location (re-fetched when storage changes).
  const pickedEntry = useQuery({
    queryKey: ['shelf_life', 'entry', picked?.source_id, storage],
    queryFn: () => fetchShelfLifeFor(picked!.source_id, storage),
    enabled: picked != null,
    staleTime: Infinity,
  });

  const suggestion =
    picked && pickedEntry.data !== undefined
      ? pickedEntry.data
        ? suggestExpiry(pickedEntry.data, purchasedOn)
        : ({
            kind: 'advice',
            label: `No USDA guidance for ${STORAGE_LABELS[storage].toLowerCase()} storage.`,
          } as const)
      : null;

  // Keep the expiry date in step with the suggestion until the user sets a date themselves.
  const suggestedDate = suggestion?.kind === 'date' ? suggestion.expiresOn : null;
  useEffect(() => {
    if (expirySource !== 'foodkeeper' || !suggestedDate) return;
    setValue('expiresOn', suggestedDate, { shouldValidate: true });
  }, [expirySource, suggestedDate, setValue]);

  const choose = (entry: ShelfLife) => {
    setPicked({ source_id: entry.source_id, name: entry.name, subtitle: entry.subtitle });
    setValue('name', shelfLifeDisplayName(entry), { shouldValidate: true });
    setValue('expirySource', 'foodkeeper');
    setShowSuggestions(false);
  };

  const fieldStyle = [
    styles.input,
    { backgroundColor: theme.backgroundElement, color: theme.text },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ThemedView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Name + suggestions */}
          <View style={styles.field}>
            <ThemedText type="smallBold">Name</ThemedText>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <TextInput
                  value={field.value}
                  onChangeText={(text) => {
                    field.onChange(text);
                    setShowSuggestions(true);
                    if (picked) {
                      setPicked(null);
                      if (expirySource === 'foodkeeper') setValue('expirySource', 'manual');
                    }
                  }}
                  onBlur={field.onBlur}
                  placeholder="e.g. Milk, chicken breast, spinach"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="sentences"
                  autoCorrect={false}
                  returnKeyType="done"
                  maxLength={100}
                  accessibilityLabel="Item name"
                  style={fieldStyle}
                />
              )}
            />
            {formState.errors.name ? (
              <ThemedText type="small" themeColor="expired">
                {formState.errors.name.message}
              </ThemedText>
            ) : null}
            {showSuggestions && name.trim().length >= 2 ? (
              <Suggestions
                loading={search.isFetching}
                results={search.data ?? []}
                onChoose={choose}
              />
            ) : null}
          </View>

          {/* Storage */}
          <View style={styles.field}>
            <ThemedText type="smallBold">Stored in</ThemedText>
            <Controller
              control={control}
              name="storage"
              render={({ field }) => (
                <View style={styles.chips}>
                  {STORAGE_LOCATIONS.map((loc) => (
                    <Chip
                      key={loc}
                      label={STORAGE_LABELS[loc]}
                      selected={field.value === loc}
                      onPress={() => field.onChange(loc)}
                    />
                  ))}
                </View>
              )}
            />
          </View>

          {/* Quantity */}
          <Controller
            control={control}
            name="quantity"
            render={({ field }) => (
              <View style={styles.row}>
                <ThemedText type="smallBold">Quantity</ThemedText>
                <View style={styles.stepper}>
                  <Chip
                    label="−"
                    selected={false}
                    onPress={() => field.onChange(Math.max(1, field.value - 1))}
                  />
                  <ThemedText type="smallBold" style={styles.quantity}>
                    {field.value}
                  </ThemedText>
                  <Chip
                    label="+"
                    selected={false}
                    onPress={() => field.onChange(Math.min(999, field.value + 1))}
                  />
                </View>
              </View>
            )}
          />

          {/* Dates */}
          <Controller
            control={control}
            name="purchasedOn"
            render={({ field }) => (
              <DateField label="Bought on" value={field.value} onChange={field.onChange} />
            )}
          />
          <View style={styles.field}>
            <Controller
              control={control}
              name="expiresOn"
              render={({ field }) => (
                <DateField
                  label="Expires on"
                  value={field.value}
                  minimumDate={purchasedOn}
                  onChange={(value) => {
                    field.onChange(value);
                    setValue('expirySource', 'manual');
                  }}
                />
              )}
            />
            {formState.errors.expiresOn ? (
              <ThemedText type="small" themeColor="expired">
                {formState.errors.expiresOn.message}
              </ThemedText>
            ) : null}
            {suggestion ? (
              <ThemedText type="small" themeColor="textSecondary">
                {suggestion.label}
                {suggestion.kind === 'date' && expirySource === 'manual'
                  ? ' · you changed the date'
                  : ''}
              </ThemedText>
            ) : null}
          </View>

          {errorMessage ? <ThemedText themeColor="expired">{errorMessage}</ThemedText> : null}

          <Button
            label={submitLabel}
            loading={submitting}
            onPress={() => void handleSubmit(onSubmit)()}
          />
          {footer}
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

function Suggestions({
  loading,
  results,
  onChoose,
}: {
  loading: boolean;
  results: ShelfLife[];
  onChoose: (entry: ShelfLife) => void;
}) {
  const theme = useTheme();
  if (results.length === 0) {
    return loading ? (
      <ActivityIndicator color={theme.tint} style={styles.suggestionSpinner} />
    ) : (
      <ThemedText type="small" themeColor="textSecondary">
        No USDA match. You can still pick an expiry date yourself.
      </ThemedText>
    );
  }
  return (
    <ThemedView type="backgroundElement" style={styles.suggestions}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.suggestionsTitle}>
        USDA FoodKeeper suggestions
      </ThemedText>
      {results.map((entry) => {
        const hint = suggestExpiry(entry, '2000-01-01');
        return (
          <Pressable
            key={entry.id}
            accessibilityRole="button"
            onPress={() => onChoose(entry)}
            style={({ pressed }) => [
              styles.suggestion,
              { backgroundColor: pressed ? theme.backgroundSelected : 'transparent' },
            ]}>
            <ThemedText type="smallBold">{shelfLifeDisplayName(entry)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {hint.kind === 'date' ? hint.label.replace(' (USDA FoodKeeper)', '') : hint.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    gap: Spacing.four,
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    minHeight: 48,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  quantity: {
    minWidth: 28,
    textAlign: 'center',
  },
  suggestions: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
  },
  suggestionsTitle: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.one,
  },
  suggestion: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: 2,
  },
  suggestionSpinner: {
    alignSelf: 'flex-start',
  },
});
