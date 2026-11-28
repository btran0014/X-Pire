# X-Pire

Fridge inventory app: scan a grocery receipt, get suggested expiry dates, and get reminded before food goes bad.

> **Status:** being rebuilt with Expo (React Native + TypeScript) and Supabase.
> See [docs/redesign-plan.md](docs/redesign-plan.md) for the plan.
> The previous Flutter + Firebase app is preserved at the git tag [`flutter-final`](../../tree/flutter-final).

## Stack

- **App:** Expo SDK 58, TypeScript, Expo Router
- **Backend:** Supabase (Postgres, Auth, Row Level Security, Edge Functions)
- **Receipt reading + expiry estimates:** Gemini Flash-Lite (server-side), USDA FoodKeeper as fallback
- **Testing:** Expo Go on a phone
- **Reminders:** local notifications (expo-notifications)

## Run it

Requires Node 20+ and the **Expo Go** app on your phone.

```bash
npm install
npm start          # scan the QR code with Expo Go (phone and PC on the same Wi-Fi)
npm run web        # or preview in a browser
```

If your phone can't reach the PC, use `npx expo start --tunnel`.

## Develop

```bash
npm run check      # typecheck, lint, format check, tests (same as CI)
npm run format     # auto-format
npm test           # unit tests
```
