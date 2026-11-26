# X-Pire

Fridge inventory app: scan a grocery receipt, get suggested expiry dates, and get reminded before food goes bad.

> **Status:** being rebuilt with Expo (React Native + TypeScript) and Supabase.
> See [docs/redesign-plan.md](docs/redesign-plan.md) for the plan.
> The previous Flutter + Firebase app is preserved at the git tag [`flutter-final`](../../tree/flutter-final).

## Stack

- **App:** Expo, TypeScript, Expo Router
- **Backend:** Supabase (Postgres, Auth, Row Level Security, Edge Functions)
- **Receipt reading:** on-device ML Kit text recognition
- **Expiry estimates:** Gemini Flash-Lite (server-side), USDA FoodKeeper as fallback
- **Reminders:** local notifications (expo-notifications)

Setup instructions will be added as each phase lands.
