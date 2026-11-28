# X-Pire

Fridge inventory app: scan a grocery receipt, get suggested expiry dates, see each product's photo, and get
reminded before food goes bad.

Built with Expo (React Native + TypeScript) and Supabase. The previous Flutter + Firebase app is preserved at
the git tag [`flutter-final`](../../tree/flutter-final). Design notes and history: [docs/redesign-plan.md](docs/redesign-plan.md).

## Features

- **Fridge list** grouped into Expired / Expiring soon / Fresh, with storage filters and quick +/− quantity.
- **Receipt scanning:** photo → Google Gemini reads the items, brands, sizes and printed barcodes → USDA
  FoodKeeper fills in shelf life when the AI isn't sure → review and add everything in one tap.
- **Exact products and photos** from Open Food Facts: scan a product barcode, or search by name; every other
  item gets a food emoji.
- **Expiry reminders** as local notifications (a heads-up N days before and on the day, at a time you choose).
- **Accounts:** starts as a private guest account; save it to your email with an emailed code and sign in on
  other phones. Export to CSV, or delete everything.

## Stack

| Part                | Choice                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------- |
| App                 | Expo SDK 58, TypeScript, Expo Router, TanStack Query, react-hook-form + zod               |
| Backend             | Supabase: Postgres with Row Level Security, Auth (anonymous + email code), Edge Functions |
| Receipt reading     | Gemini `gemini-3.5-flash-lite` in the `parse-receipt` edge function                       |
| Shelf life          | USDA FSIS FoodKeeper (public domain), seeded into `shelf_life`                            |
| Products and photos | Open Food Facts (ODbL / CC BY-SA), called from the phone                                  |
| Reminders           | expo-notifications (local, scheduled on the device)                                       |

## Run it

Requires Node 20+ and the **Expo Go** app on your phone.

```bash
npm install
cp .env.example .env   # then fill in the two values (see below)
npm start              # scan the QR code with Expo Go (phone and PC on the same Wi-Fi)
```

If your phone can't reach the PC, use `npx expo start --tunnel`. `npm run web` previews in a browser
(scanning, barcodes and reminders only work on a phone).

## Set up your own Supabase project

1. Create a project at [supabase.com](https://supabase.com), then in this folder:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npm run db:push            # tables, security rules, FoodKeeper data
   ```
2. Copy the project URL and the **publishable** key (Project Settings → API Keys) into `.env`.
3. Dashboard → **Authentication → Sign In / Providers**: turn on **Allow anonymous sign-ins**.
4. Dashboard → **Authentication → Email Templates**: add `{{ .Token }}` to two templates so emails contain a
   code (links don't open the app in Expo Go):
   - **Magic link**: e.g. `<h2>Your X-Pire code</h2><p>Enter this code in the app: <strong>{{ .Token }}</strong></p>`
   - **Change email address**: e.g. `<h2>Save your X-Pire data</h2><p>Enter this code in the app to confirm {{ .NewEmail }}: <strong>{{ .Token }}</strong></p>`
5. Receipt scanning: create a Gemini API key in [Google AI Studio](https://aistudio.google.com), then
   ```bash
   npx supabase secrets set GEMINI_API_KEY=your-key
   npm run functions:deploy
   ```

Don't run `supabase config push`: `supabase/config.jsonc` holds local-development defaults and would weaken
the hosted project's auth settings.

## Develop

```bash
npm run check            # typecheck, Deno check of edge functions, lint, format, tests (same as CI)
npm test                 # unit tests
npm run db:push          # apply new migrations to the linked project
npm run db:types         # regenerate src/types/database.ts after schema changes
npm run functions:deploy # deploy parse-receipt and delete-account
```

Database security tests (pgTAP) live in `supabase/tests` and run in CI against a real Supabase Postgres.

## Project layout

```
src/app/                 screens (Expo Router)
src/features/items/      fridge items: data, form, list rows
src/features/scan/       receipt photo, upload, review
src/features/products/   Open Food Facts, barcodes, emoji, product picker
src/features/reminders/  notification planning and scheduling
src/features/account/    email account, export, delete
supabase/migrations/     database schema, security rules, FoodKeeper data
supabase/functions/      parse-receipt, delete-account
scripts/                 FoodKeeper → migration converter
```

## Data sources and privacy

- Receipt photos are sent to the `parse-receipt` function and Google Gemini to be read, and are never stored.
  On Gemini's free tier, Google may use inputs to improve its products.
- Shelf-life data: USDA FSIS FoodKeeper (public domain).
- Product data and photos: [Open Food Facts](https://world.openfoodfacts.org), Open Database License; photos
  CC BY-SA.
