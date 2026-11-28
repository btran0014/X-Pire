import { StyleSheet, View } from 'react-native';

import { PlaceholderCard } from '@/components/placeholder-card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing, type ThemeColor } from '@/constants/theme';

const SECTIONS: { label: string; color: ThemeColor }[] = [
  { label: 'Expired', color: 'expired' },
  { label: 'Expiring soon', color: 'expiringSoon' },
  { label: 'Fresh', color: 'fresh' },
];

export default function FridgeScreen() {
  return (
    <Screen title="Fridge" subtitle="Everything you have, soonest to expire first.">
      <View style={styles.legend}>
        {SECTIONS.map((section) => (
          <ThemedText key={section.label} type="smallBold" themeColor={section.color}>
            ● {section.label}
          </ThemedText>
        ))}
      </View>
      <PlaceholderCard
        title="Your items will appear here"
        body="Coming in Phase 3: add, edit and track items, grouped by how soon they expire."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
});
