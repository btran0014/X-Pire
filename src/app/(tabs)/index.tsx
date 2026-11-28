import { router } from 'expo-router';
import { useMemo, useState, type ReactElement } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useActiveItems } from '@/features/items/hooks';
import { ItemRow } from '@/features/items/item-row';
import { groupItems } from '@/features/items/logic';
import { STORAGE_LABELS, STORAGE_LOCATIONS, type StorageLocation } from '@/features/items/types';

const SECTION_COLOR: Record<string, ThemeColor> = {
  expired: 'expired',
  expiringSoon: 'expiringSoon',
  fresh: 'fresh',
};

export default function FridgeScreen() {
  const theme = useTheme();
  const items = useActiveItems();
  const [storage, setStorage] = useState<StorageLocation | null>(null);
  const sections = useMemo(() => groupItems(items.data ?? [], { storage }), [items.data, storage]);
  const total = items.data?.length ?? 0;

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.titleText}>
          <ThemedText type="subtitle" accessibilityRole="header">
            Fridge
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {total === 0 ? 'Nothing tracked yet' : `${total} item${total === 1 ? '' : 's'}`}
          </ThemedText>
        </View>
        <Button label="+ Add" onPress={() => router.push('/item/new')} />
      </View>
      {total > 0 ? (
        <View style={styles.filters}>
          <Chip label="All" selected={storage === null} onPress={() => setStorage(null)} />
          {STORAGE_LOCATIONS.map((loc) => (
            <Chip
              key={loc}
              label={STORAGE_LABELS[loc]}
              selected={storage === loc}
              onPress={() => setStorage(loc)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );

  let empty: ReactElement | undefined;
  if (items.isPending) {
    empty = <ActivityIndicator color={theme.tint} style={styles.spinner} />;
  } else if (items.isError) {
    empty = (
      <View style={styles.empty}>
        <ThemedText themeColor="expired">Couldn&apos;t load your items.</ThemedText>
        <Button label="Try again" variant="secondary" onPress={() => items.refetch()} />
      </View>
    );
  } else if (total === 0) {
    empty = (
      <View style={styles.empty}>
        <ThemedText type="smallBold">Your fridge is empty</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
          Add items by hand, or scan a grocery receipt to add them all at once.
        </ThemedText>
        <Button label="Scan a receipt" variant="secondary" onPress={() => router.push('/scan')} />
      </View>
    );
  } else if (sections.length === 0) {
    empty = (
      <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
        Nothing in the {STORAGE_LABELS[storage ?? 'fridge'].toLowerCase()}.
      </ThemedText>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ItemRow item={item} />}
          renderSectionHeader={({ section }) => (
            <ThemedText
              type="smallBold"
              themeColor={SECTION_COLOR[section.status]}
              style={styles.sectionHeader}
              accessibilityRole="header">
              {section.title} · {section.data.length}
            </ThemedText>
          )}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={items.isRefetching}
              onRefresh={() => void items.refetch()}
              tintColor={theme.tint}
              colors={[theme.tint]}
            />
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Platform.OS === 'web' ? Spacing.six + Spacing.four : Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  header: {
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  titleText: {
    flex: 1,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  sectionHeader: {
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  separator: {
    height: Spacing.two,
  },
  spinner: {
    marginTop: Spacing.five,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.five,
  },
  centerText: {
    textAlign: 'center',
  },
});
