import Constants from 'expo-constants';

import { PlaceholderCard } from '@/components/placeholder-card';
import { Screen } from '@/components/screen';
import { OffCredit } from '@/components/off-credit';
import { ThemedText } from '@/components/themed-text';
import { ReminderSettingsCard } from '@/features/reminders/reminder-settings-card';
import { useAuth } from '@/providers/auth-provider';

export default function SettingsScreen() {
  const version = Constants.expoConfig?.version ?? 'dev';
  const { state } = useAuth();
  const user = state.status === 'signedIn' ? state.session.user : null;

  return (
    <Screen title="Settings">
      <PlaceholderCard
        title={user?.is_anonymous ? 'Guest account' : 'Account'}
        body={
          user?.is_anonymous
            ? 'Your items are saved to this device’s guest account. If you uninstall the app or clear Expo Go’s data, they can’t be recovered. Saving them to an email account is coming soon.'
            : (user?.email ?? 'Signed in')
        }
      />
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
