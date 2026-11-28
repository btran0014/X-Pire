import Constants from 'expo-constants';

import { PlaceholderCard } from '@/components/placeholder-card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';

export default function SettingsScreen() {
  const version = Constants.expoConfig?.version ?? 'dev';

  return (
    <Screen title="Settings">
      <PlaceholderCard
        title="Reminders"
        body="Coming in Phase 5: choose when you get notified before food expires."
      />
      <PlaceholderCard
        title="Account and data"
        body="Coming in Phase 6: save your data to an email account, export it, or delete it."
      />
      <ThemedText type="small" themeColor="textSecondary">
        X-Pire {version}
      </ThemedText>
    </Screen>
  );
}
