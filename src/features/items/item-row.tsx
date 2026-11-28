import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ItemAvatar } from '@/components/item-avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { expiryLabel, expiryStatus, type ExpiryStatus } from '@/lib/dates';

import { quantityChange, useUpdateItem } from './hooks';
import { STORAGE_LABELS, type Item } from './types';

const STATUS_COLOR: Record<ExpiryStatus, ThemeColor> = {
  expired: 'expired',
  expiringSoon: 'expiringSoon',
  fresh: 'fresh',
};

export function ItemRow({ item }: { item: Item }) {
  const theme = useTheme();
  const update = useUpdateItem();
  const status = expiryStatus(item.expires_on);

  const change = (delta: 1 | -1) =>
    update.mutate({ id: item.id, changes: quantityChange(item, delta) });

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <View style={[styles.statusBar, { backgroundColor: theme[STATUS_COLOR[status]] }]} />
      <Link href={{ pathname: '/item/[id]', params: { id: item.id } }} asChild>
        <Pressable
          style={styles.main}
          accessibilityRole="button"
          accessibilityLabel={`${item.name}, ${expiryLabel(item.expires_on)}. Edit`}>
          <ItemAvatar name={item.name} imageUrl={item.image_url} emoji={item.emoji} />
          <View style={styles.text}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {item.name}
            </ThemedText>
            <ThemedText type="small" themeColor={STATUS_COLOR[status]}>
              {expiryLabel(item.expires_on)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {STORAGE_LABELS[item.storage]}
            </ThemedText>
          </View>
        </Pressable>
      </Link>
      <View style={styles.stepper}>
        <StepButton
          label="−"
          accessibilityLabel={
            item.quantity <= 1 ? `Mark ${item.name} as used up` : `Remove one ${item.name}`
          }
          onPress={() => change(-1)}
        />
        <ThemedText type="smallBold" style={styles.quantity} accessibilityLabel="Quantity">
          {item.quantity}
        </ThemedText>
        <StepButton
          label="+"
          accessibilityLabel={`Add one ${item.name}`}
          onPress={() => change(1)}
        />
      </View>
    </ThemedView>
  );
}

function StepButton({
  label,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.stepButton,
        { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.7 : 1 },
      ]}>
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    overflow: 'hidden',
    minHeight: 72,
  },
  statusBar: {
    width: 5,
    alignSelf: 'stretch',
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingRight: Spacing.three,
  },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    minWidth: 20,
    textAlign: 'center',
  },
});
