import Constants from 'expo-constants';

import { PlaceholderCard } from '@/components/placeholder-card';
import { Screen } from '@/components/screen';
import { OffCredit } from '@/components/off-credit';
import { ThemedText } from '@/components/themed-text';
import { AccountCard } from '@/features/account/account-card';
import { ReminderSettingsCard } from '@/features/reminders/reminder-settings-card';
import { useAuth } from '@/providers/auth-provider';

export default function SettingsScreen() {
  const version = Constants.expoConfig?.version ?? 'dev';
  const { state } = useAuth();
  const user = state.status === 'signedIn' ? state.session.user : null;

  return (
    <Screen title="Settings">
      <AccountCard />
      <ReminderSettingsCard />
      <PlaceholderCard
        title="Data sources"
        body="Shelf-life estimates: USDA FSIS FoodKeeper (public domain). Receipt reading: Google Gemini."
      />
      <OffCredit label="Product data and photos: Open Food Facts, under the Open Database License (ODbL); photos CC BY-SA." />
      <ThemedText type="small" themeColor="textSecondary">
        X-Pire {version}
        {user ? ` · user ${user.id.slice(0, 8)}` : ''}
      </ThemedText>
    </Screen>
  );
}
