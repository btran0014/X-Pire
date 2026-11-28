import { Linking, Pressable } from 'react-native';

import { ThemedText } from './themed-text';

/** Attribution Open Food Facts asks for wherever its data or photos are shown. */
export function OffCredit({
  label = 'Product data and photos: Open Food Facts (ODbL / CC BY-SA)',
}) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => void Linking.openURL('https://world.openfoodfacts.org')}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </Pressable>
  );
}
