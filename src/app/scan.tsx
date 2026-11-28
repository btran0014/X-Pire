import { PlaceholderCard } from '@/components/placeholder-card';
import { Screen } from '@/components/screen';

export default function ScanScreen() {
  return (
    <Screen title="Scan receipt" subtitle="Photograph a grocery receipt to add its items.">
      <PlaceholderCard
        title="Receipt scanning"
        body="Coming in Phase 4: take or pick a photo, review the items and suggested expiry dates, then add them in one tap."
      />
    </Screen>
  );
}
