# X-Pire v3 Redesign Plan

Rebuild X-Pire (fridge inventory with receipt scanning and expiry tracking) as an
Expo / React Native app backed by Supabase, replacing the Flutter + Firebase app.

**Legend:** 🧑 = manual step for you · 🤖 = done in code

---

## 1. Goals

- One TypeScript codebase that runs on Android and iOS.
- Developed and tested entirely in **Expo Go** on your own phone: no Android Studio, no Xcode, no custom native builds.
- Each user's data is private (enforced by the database, not the app).
- No secret keys in the app; AI calls happen server-side.
- Receipt scanning that costs ~$0 to run.
- Expiry reminders that work without a server.
- $0/month running cost at personal scale.

## 2. Stack

Every library below runs in Expo Go (no custom native code).

| Layer               | Choice                                                                | Notes                                               |
| ------------------- | --------------------------------------------------------------------- | --------------------------------------------------- |
| App framework       | Expo (latest SDK), TypeScript strict                                  | Tested in Expo Go                                   |
| Navigation          | Expo Router                                                           | File-based routes in `app/`                         |
| Server state        | TanStack Query                                                        | Caching, optimistic updates, refetch                |
| Forms / validation  | react-hook-form + zod                                                 | zod schemas shared with the edge function           |
| Styling             | React Native `StyleSheet` + small theme file                          | Light/dark via `useColorScheme`                     |
| Dates               | date-fns                                                              | Expiry stored as a calendar date, no time zone bugs |
| Camera / photos     | expo-image-picker                                                     | Camera and gallery in one API                       |
| Image shrinking     | expo-image-manipulator                                                | Resize to ~1600 px JPEG before upload               |
| Receipt reading     | Gemini Flash-Lite (image input) via Supabase Edge Function            | One call reads the receipt and estimates shelf life |
| Shelf-life fallback | USDA FoodKeeper dataset                                               | Seeded into a Postgres reference table              |
| Notifications       | expo-notifications (local, scheduled)                                 | No push server needed                               |
| Backend             | Supabase (free tier)                                                  | Postgres, Auth, Row Level Security, Edge Functions  |
| Tests               | Jest + React Native Testing Library; Deno tests for the edge function |                                                     |

**Why not on-device OCR?** ML Kit text recognition needs a custom development build, which Expo Go
can't run (and on iPhone that needs a $99/year Apple account). Sending a shrunken photo to Gemini
replaces OCR + text cleanup with a single call that's still inside the free tier. If you later move
to development builds, on-device OCR can be added back without changing the rest of the app.

## 3. Architecture

```
Phone (Expo Go)
  ├─ expo-image-picker ──> photo
  ├─ expo-image-manipulator ──> ~1600 px JPEG (a few hundred KB)
  ├─ supabase-js ──> Edge Function `parse-receipt` (with user's JWT)
  │                    ├─ Gemini Flash-Lite: image -> [{name, qty, storage, shelf_life_days, confidence}]
  │                    ├─ FoodKeeper lookup for missing / low-confidence shelf life
  │                    └─ returns suggestions (does not save items or the photo)
  ├─ Review screen ──> user edits ──> insert into `items` (RLS: own rows only)
  └─ expo-notifications: schedules local reminders from `items`
```

The photo is sent to the edge function and on to Gemini for reading, then discarded. It is never stored
in Supabase. (On Gemini's free tier, Google may use inputs to improve its products; the paid tier doesn't.)

## 4. Data model (Postgres)

```sql
create type storage_location as enum ('fridge', 'freezer', 'pantry');
create type item_status      as enum ('active', 'consumed', 'discarded');
create type expiry_source    as enum ('ai', 'foodkeeper', 'manual');

create table receipts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  scanned_at  timestamptz not null default now(),
  item_count  int not null default 0
);

create table items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users on delete cascade,
  name          text not null check (length(name) between 1 and 100),
  quantity      int  not null default 1 check (quantity > 0),
  storage       storage_location not null default 'fridge',
  purchased_on  date not null,          -- sent by the app in the user's local date (server current_date is UTC)
  expires_on    date not null,
  expiry_source expiry_source not null default 'manual',
  confidence    real,
  status        item_status not null default 'active',
  receipt_id    uuid references receipts on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on items (user_id, status, expires_on);
-- plus a trigger that sets updated_at = now() on every update

create table shelf_life (          -- FoodKeeper reference data, read-only
  id        serial primary key,
  name      text not null,
  keywords  text[] not null,
  storage   storage_location not null,
  min_days  int,                   -- FoodKeeper gives days/weeks/months; the seed script converts to days
  max_days  int
);
```

**Row Level Security**

- `items`: enable RLS; select/insert/update/delete only where `user_id = auth.uid()`.
- `receipts`: enable RLS; clients may only **select** their own rows. Inserts come from the edge function
  with the service role, so a user can't delete rows to get around the rate limit.
- `shelf_life`: enable RLS; select for `authenticated`; no writes from clients.
- RLS is tested with `supabase test db` (pgTAP): user A can't read, change or delete user B's rows.

Consumed/discarded items are kept (status column) so a "food saved vs wasted" stat is possible later.
Decreasing quantity from 1 marks the item `consumed` instead of deleting it.

## 5. Edge Function: `parse-receipt`

- **Input:** `{ image: base64 JPEG }`, requires a signed-in user's JWT.
- **Guards:** reject images over ~2 MB or that aren't JPEG/PNG; rate limit by counting the user's
  `receipts` rows in the last hour (e.g. max 20).
- **Global daily cap** (e.g. 200 calls/day across all users). Anonymous sign-in means anyone with the app
  can create new users, so a per-user limit alone doesn't protect the Gemini quota. Optionally add CAPTCHA
  (Cloudflare Turnstile, supported by Supabase Auth) to anonymous sign-in before any public release.
- **Gemini call:** one request with the image and a structured JSON output schema:
  `items: [{ raw_line, name, quantity, storage, shelf_life_days, confidence }]`.
  Prompt tells the model to read only purchased food lines, expand receipt abbreviations
  ("GV 2% MLK GAL" -> "Great Value 2% Milk, 1 gal"), and skip store info, totals, tax and payment lines.
- **Validate the model output** with the same zod schema before returning it; drop anything malformed.
  Receipt content is untrusted input, so the model's answer is treated as untrusted too.
- **Shelf-life fallback:** if `shelf_life_days` is missing or `confidence < 0.5`, match `name` against
  `shelf_life.keywords`; if still nothing, return the item with no date so the user picks one.
- **If Gemini fails** (quota, outage, unreadable photo): return a clear error; the app offers
  "Try again" or "Add items manually" (manual add still gets FoodKeeper suggestions).
- **Output:** suggestions with `expires_on` computed from `shelf_life_days`, plus `expiry_source`.
  Inserts one `receipts` row; does not insert items; never stores the image.
- **Secret:** `GEMINI_API_KEY` set with `supabase secrets set` (🧑).
- Model name is a constant in one file so switching providers is a one-line change.

## 5b. Edge Function: `delete-account`

The app can't delete its own `auth.users` row with the public key. This small function uses the service role
to delete the calling user; `on delete cascade` removes their items and receipts. Used by Settings → Delete my data.

## 6. Screens (Expo Router)

```
app/
  _layout.tsx              providers (Query, auth session), theme
  (tabs)/_layout.tsx
  (tabs)/index.tsx         Inventory: Expired / Expiring soon / Fresh sections, +/- qty,
                           swipe to mark consumed or discarded, filter by storage
  (tabs)/scan.tsx          Take photo / pick from gallery -> shrink -> parse-receipt
  (tabs)/settings.tsx      Reminder time and lead days, account, export/delete data
  scan/review.tsx          Editable suggestions: name, qty, storage, expiry date, include toggle
  item/new.tsx             Manual add with FoodKeeper autocomplete that pre-fills expiry
  item/[id].tsx            Edit / delete
```

## 7. Notifications

- Local scheduled notifications (these work in Expo Go; only remote push notifications need a development build).
- On app start and after any item change, cancel and reschedule local notifications.
- Default: a reminder at the user's chosen time (e.g. 9:00) N days before `expires_on` (default 2) and on the expiry day.
- iOS allows only 64 pending local notifications per app: schedule only the soonest ~60, and reschedule each time the app opens.

## 8. Auth

- At launch: Supabase **anonymous sign-in** on first launch, so there is no login screen.
- Later: "Save your data" in Settings links the anonymous account to email (magic link).
  Sign in with Apple / Google can come later; they need extra native setup.
  Until linked, data is lost if Expo Go's data is cleared or the app is reinstalled; Settings says so.

## 9. Repository layout

```
src/
  app/                     Expo Router routes (every file is a screen)
  components/
  constants/theme.ts       colors (incl. expired / expiring soon / fresh), spacing
  hooks/
  features/items/          queries, hooks, item card, item form
  features/scan/           pickImage.ts, shrinkImage.ts, parseReceipt.ts, review state
  lib/supabase.ts          client (session in AsyncStorage)
  lib/notifications.ts
  lib/dates.ts
  types/database.ts        generated by `supabase gen types`
supabase/
  config.toml
  migrations/              versioned SQL (tables, RLS, indexes)
  functions/parse-receipt/ index.ts, prompt.ts, schema.ts, foodkeeper.ts, tests
  functions/delete-account/
  tests/                   pgTAP tests for RLS
  seed.sql                 FoodKeeper data
scripts/build-foodkeeper-seed.ts
.github/workflows/ci.yml   typecheck, lint, Jest, Deno tests on every push
app.json, .env.example
```

## 10. Phases

### Phase 0: Prep ✅

- ✅ Tagged the Flutter app as `flutter-final`; created branch `redesign`; removed the Flutter code.
- ✅ Cleaned up stale `Alibranch`/`alibranch` refs (already gone from GitHub).
- ✅ Node 24 present; EAS CLI installed; Supabase CLI runs via `npx` (added as a dev dependency in Phase 1).
- 🧑 Install **Expo Go** on your phone (Play Store / App Store).
- 🧑 Create free accounts: Supabase, Expo, Google AI Studio (create a Gemini API key; keep it private).

### Phase 1: App skeleton ✅

- ✅ Expo SDK 58 app (TypeScript strict, Expo Router native tabs: Fridge / Scan / Settings), green theme with light/dark.
- ✅ ESLint (eslint-config-expo) + Prettier, Jest (jest-expo) with tests for the expiry date logic (`src/lib/dates.ts`).
- ✅ Supabase CLI as a dev dependency; `.env.example`.
- ✅ GitHub Actions CI: typecheck, lint, format check, tests. `npm run check` runs the same locally.
- 🧑 Run `npm start`, scan the QR code with Expo Go (same Wi-Fi as the PC, or `npx expo start --tunnel`).

### Phase 2: Backend

- ✅ Project `X-pire` (us-east-2) created and linked; `.env` filled in.
- ✅ `supabase init` (CLI 3.x writes `supabase/config.jsonc`), schema migration with RLS + `updated_at` trigger,
  pushed with `npm run db:push`; `supabase db lint` clean.
- ✅ pgTAP tests proving one user can't touch another's data (need Docker, so they run in CI).
- ✅ `src/types/database.ts` generated from the live schema (`npm run db:types`).
- 🧑 Enable anonymous sign-ins in the dashboard: Authentication → Sign In / Providers → "Allow anonymous sign-ins".
  **Don't run `supabase config push`:** `config.jsonc` holds local-dev defaults, and pushing it would turn off
  email confirmations and MFA on the hosted project.
- 🤖 Build FoodKeeper seed (downloads the public USDA dataset; asks first) and load it.

### Phase 3: Inventory

- 🤖 Anonymous auth bootstrap, items list with sections, add/edit/delete, quantity, consumed/discarded, FoodKeeper autocomplete.
- 🤖 Unit tests for date logic and item grouping.
- 🧑 Try it on your phone.

### Phase 4: Receipt scanning

- 🤖 Scan tab: camera / gallery, shrink image, call `parse-receipt`, review screen, batch insert.
- 🤖 Write and deploy `parse-receipt` with tests (size limit, rate limit, daily cap, output validation).
- 🧑 `npx supabase secrets set GEMINI_API_KEY=...`
- 🧑 Scan 5–10 real receipts; tell me which ones come out wrong so I can tune the prompt.

### Phase 5: Reminders

- 🤖 expo-notifications scheduling, settings for time and lead days.
- 🧑 Allow notifications on your phone and confirm one arrives (a debug button fires one in 10 seconds).

### Phase 6: Polish

- 🤖 Empty/error/offline states, app icon and splash, dark mode check, export (CSV) and delete-my-data (`delete-account` function).
- 🤖 Account linking (email magic link).
- 🤖 README rewrite.

### Phase 7: Cleanup and release (optional)

- 🧑 Delete the old Firebase project `x-pire-2e0c5` (its data is not migrated).
- Publishing needs real builds (EAS Build, free tier) and store accounts:
  Google Play ($25 one-time), Apple Developer ($99/year). Not needed for personal use in Expo Go.

## 11. Costs

| Item                        | Cost                                                      |
| --------------------------- | --------------------------------------------------------- |
| Expo Go on your phone       | $0                                                        |
| Supabase free tier          | $0 (project pauses after ~7 days idle; one-click restore) |
| Gemini Flash-Lite free tier | $0 at personal volume                                     |
| Expo / EAS free tier        | $0 (only needed for Phase 7)                              |
| Store publishing (optional) | Google Play $25 one-time; Apple $99/year                  |

## 12. Risks

| Risk                                                                                      | Mitigation                                                                                                |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Expo Go only supports the newest Expo SDK; a new SDK release can stop the project opening | Upgrade the project when Expo Go updates (`npx expo install --fix`); usually a short task                 |
| Gemini misreads blurry or long receipts                                                   | Image shrink keeps text legible (~1600 px); review screen lets you fix anything; prompt tuning in Phase 4 |
| Free Supabase project pauses after ~7 days idle, app shows errors                         | Clear "server asleep" error state; one-click restore; upgrade only if it becomes annoying                 |
| Someone abuses anonymous sign-in to burn the Gemini quota                                 | Per-user rate limit + global daily cap; CAPTCHA before public release                                     |
| Gemini free-tier terms or model names change                                              | Model name in one constant; manual add with FoodKeeper keeps the app usable without AI                    |
| Anonymous users lose data on reinstall                                                    | Account linking in Phase 6; warning in Settings until linked                                              |
| iOS 64 pending-notification limit                                                         | Schedule soonest ~60, reschedule on app open                                                              |

## 13. Decisions

1. **Testing: Expo Go on your own phone.** No Android Studio, emulator, Xcode or custom builds.
   This is why receipt reading happens server-side with Gemini instead of on-device ML Kit.
   UI work can also be previewed in a browser with `npx expo start --web` (scanning and notifications won't work there).
2. **Old data: discarded.** No Firestore migration; the Firebase project is deleted in Phase 7.
3. **Receipt photos: not stored.** The shrunken photo is sent to the edge function and Gemini for reading, then discarded.
