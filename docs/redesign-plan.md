# X-Pire v3 Redesign Plan

Rebuild X-Pire (fridge inventory with receipt scanning and expiry tracking) as an
Expo / React Native app backed by Supabase, replacing the Flutter + Firebase app.

**Legend:** 🧑 = manual step for you · 🤖 = done in code

---

## 1. Goals

- One TypeScript codebase that runs on Android and iOS.
- Each user's data is private (enforced by the database, not the app).
- No secret keys in the app; AI calls happen server-side.
- Receipt scanning that works offline for the OCR part and costs ~$0 to run.
- Expiry reminders that work without a server.
- $0/month running cost at personal scale.

## 2. Stack

| Layer | Choice | Notes |
|---|---|---|
| App framework | Expo (latest SDK), TypeScript strict | Development build (not Expo Go) once ML Kit is added |
| Navigation | Expo Router | File-based routes in `app/` |
| Server state | TanStack Query | Caching, optimistic updates, refetch |
| Forms / validation | react-hook-form + zod | zod schemas shared with the edge function |
| Styling | React Native `StyleSheet` + small theme file | Light/dark via `useColorScheme` |
| Dates | date-fns | Expiry stored as a calendar date, no time zone bugs |
| Camera / photos | expo-image-picker | Camera and gallery in one API |
| OCR | `@react-native-ml-kit/text-recognition` | On-device, free, offline |
| Notifications | expo-notifications (local, scheduled) | No push server needed |
| Backend | Supabase (free tier) | Postgres, Auth, Row Level Security, Edge Functions |
| AI | Gemini Flash-Lite via Supabase Edge Function | Text only, one call per receipt, JSON output |
| Shelf-life fallback | USDA FoodKeeper dataset | Seeded into a Postgres reference table |
| Builds | EAS Build (free tier) | |
| Tests | Jest + React Native Testing Library; Deno tests for the edge function | |

## 3. Architecture

```
Phone (Expo app)
  ├─ expo-image-picker ──> photo
  ├─ ML Kit OCR (on device) ──> raw receipt text
  ├─ supabase-js ──> Edge Function `parse-receipt` (with user's JWT)
  │                    ├─ Gemini Flash-Lite: text -> [{name, qty, storage, shelf_life_days, confidence}]
  │                    ├─ FoodKeeper lookup for missing / low-confidence items
  │                    └─ returns suggestions (does not save items)
  ├─ Review screen ──> user edits ──> insert into `items` (RLS: own rows only)
  └─ expo-notifications: schedules local reminders from `items`
```

The receipt photo never leaves the phone; only OCR text is sent to the server.

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

- **Input:** `{ text: string }`, requires a signed-in user's JWT.
- **Guards:** reject text over ~8,000 chars; rate limit by counting the user's `receipts` rows in the last hour (e.g. max 20).
- **Global daily cap** (e.g. 200 calls/day across all users). Anonymous sign-in means anyone with the app
  can create new users, so a per-user limit alone doesn't protect the Gemini quota. Optionally add CAPTCHA
  (Cloudflare Turnstile, supported by Supabase Auth) to anonymous sign-in before any public release.
- **Validate the model output** with the same zod schema before returning it; drop anything malformed.
  Receipt text is untrusted input, so the model's answer is treated as untrusted too.
- **Gemini call:** one request, structured JSON output with a schema:
  `items: [{ raw_line, name, quantity, storage, shelf_life_days, confidence, is_food }]`.
  Prompt tells the model to expand receipt abbreviations ("GV 2% MLK GAL" -> "Great Value 2% Milk, 1 gal") and drop non-food lines.
- **Fallback:** if Gemini fails or `confidence < 0.5`, match `name` against `shelf_life.keywords`; if still nothing, return the item with no date so the user picks one.
- **Output:** suggestions with `expires_on` computed from `shelf_life_days`, plus `expiry_source`. Inserts one `receipts` row; does not insert items.
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
  (tabs)/scan.tsx          Take photo / pick from gallery -> OCR -> parse-receipt
  (tabs)/settings.tsx      Reminder time and lead days, account, export/delete data
  scan/review.tsx          Editable suggestions: name, qty, storage, expiry date, include toggle
  item/new.tsx             Manual add with FoodKeeper autocomplete that pre-fills expiry
  item/[id].tsx            Edit / delete
```

## 7. Notifications

- On app start and after any item change, cancel and reschedule local notifications.
- Default: a reminder at the user's chosen time (e.g. 9:00) N days before `expires_on` (default 2) and on the expiry day.
- iOS allows only 64 pending local notifications per app: schedule only the soonest ~60, and reschedule each time the app opens.

## 8. Auth

- At launch: Supabase **anonymous sign-in** on first launch, so there is no login screen.
- Later: "Save your data" in Settings links the anonymous account to email (magic link) or Sign in with Apple / Google.
  Until linked, data is lost if the app is uninstalled; Settings says so.

## 9. Repository layout

```
app/                       Expo Router routes
src/
  components/
  features/items/          queries, hooks, item card, item form
  features/scan/           ocr.ts, parseReceipt.ts, review state
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
app.config.ts, eas.json, .env.example
```

## 10. Phases

### Phase 0: Prep
- 🤖 Tag the current Flutter app as `flutter-final`, create branch `redesign`, remove the Flutter code (it stays in git history).
- 🤖 Delete the duplicate `Alibranch`/`alibranch` remote branches (with your OK) to stop the Windows fetch error.
- 🧑 Install Node LTS and Android Studio; create an Android emulator (Google Play image). 🤖 Install Supabase CLI and EAS CLI.
- 🧑 Create free accounts: Supabase, Expo, Google AI Studio (create a Gemini API key).

### Phase 1: App skeleton (runs in Expo Go)
- 🤖 `create-expo-app` with TypeScript, Expo Router tabs, ESLint + Prettier, theme, `.env.example`.
- 🤖 GitHub Actions CI: typecheck, lint, tests.
- 🧑 Start the emulator and press `a` in the Expo terminal to open the app in it (Expo Go installs automatically).

### Phase 1b: OCR spike (de-risk early)
The riskiest piece is the ML Kit library: community React Native packages sometimes lag behind Expo's
New Architecture. Before building screens on top of it:
- 🤖 Add the OCR library to a throwaway screen and configure the development build.
- 🤖 Build and install the development build on the emulator with `npx expo run:android`
  (local build, free, no EAS queue). 🧑 `eas login` is only needed later for cloud builds.
- 🧑 Drag 2–3 receipt photos onto the emulator, pick them in the app, and confirm text comes out.
- If it doesn't work, switch to an alternative (e.g. a Vision Camera OCR plugin) now, not in Phase 4.

From here on you use the development build instead of Expo Go; JS changes still hot-reload.

### Phase 2: Backend
- 🧑 `supabase login` (browser). Create the project (dashboard, or 🤖 via CLI after login).
- 🤖 `supabase init`, write migrations + RLS + `updated_at` trigger, `supabase link`, `supabase db push`.
- 🤖 pgTAP tests proving one user can't touch another's data.
- 🤖 Build FoodKeeper seed (downloads the public USDA dataset; asks first) and load it.
- 🤖 Generate `src/types/database.ts`.
- 🤖 Enable anonymous sign-ins in `config.toml` and push it with `supabase config push`
  (🧑 toggle it in the dashboard if that fails); 🧑 copy URL + anon key into `.env`.

### Phase 3: Inventory
- 🤖 Anonymous auth bootstrap, items list with sections, add/edit/delete, quantity, consumed/discarded, FoodKeeper autocomplete.
- 🤖 Unit tests for date logic and item grouping.
- 🧑 Try it in the emulator.

### Phase 4: Receipt scanning
- 🤖 Turn the Phase 1b spike into the real scan flow with image picker.
- 🤖 Write and deploy `parse-receipt` with tests (rate limit, daily cap, output validation); review screen; batch insert.
- 🧑 `supabase secrets set GEMINI_API_KEY=...`
- 🧑 Scan 5–10 real receipts; send me the ones that parse badly so I can tune the prompt.

### Phase 5: Reminders
- 🤖 expo-notifications scheduling, settings for time and lead days.
- 🧑 Allow notifications in the emulator and confirm one arrives (a debug button fires one in 10 seconds).

### Phase 6: Polish
- 🤖 Empty/error/offline states, app icon and splash, dark mode check, export (CSV) and delete-my-data (`delete-account` function).
- 🤖 Account linking (email magic link first).
- 🤖 README rewrite.

### Phase 7: Cleanup and release (optional)
- 🧑 Delete the old Firebase project `x-pire-2e0c5` (its data is not migrated).
- 🧑 Store accounts if publishing: Google Play ($25 one-time), Apple Developer ($99/year).
- 🤖 EAS Submit config; EAS Update for over-the-air fixes.

## 11. Costs

| Item | Cost |
|---|---|
| Supabase free tier | $0 (project pauses after ~7 days idle; one-click restore) |
| Gemini Flash-Lite free tier | $0 at personal volume (free-tier prompts may be used by Google to improve products) |
| Expo / EAS free tier | $0 |
| Android Emulator (Android Studio) | $0 |
| iOS in a browser (Appetize.io free tier, limited minutes) | $0 |
| Real iPhone with the development build, no Mac | Apple Developer Program, $99/year |

## 12. Risks

| Risk | Mitigation |
|---|---|
| ML Kit library incompatible with current Expo / New Architecture | Phase 1b spike before building on it |
| Free Supabase project pauses after ~7 days idle, app shows errors | Clear "server asleep" error state; one-click restore; upgrade only if it becomes annoying |
| Someone abuses anonymous sign-in to burn the Gemini quota | Per-user rate limit + global daily cap; CAPTCHA before public release |
| Gemini free-tier terms or model names change | Model name in one constant; FoodKeeper fallback keeps scanning usable without AI |
| Anonymous users lose data on reinstall | Account linking in Phase 6; warning in Settings until linked |
| iOS 64 pending-notification limit | Schedule soonest ~60, reschedule on app open |

## 13. Decisions

1. **Testing device: Android Emulator first (free, runs on Windows).**
   - Install Android Studio and create an emulator with a **Google Play** system image (Pixel, recent Android).
   - The development build installs straight onto it (`npx expo run:android`, or the `.apk` from EAS).
   - Receipt scanning is tested with the gallery: drag receipt photos onto the emulator window to add them,
     then use "Pick from gallery". The emulator camera can also pass through your webcam.
   - iOS: the iOS Simulator only runs on macOS, and Expo has no hosted simulator. Options later:
     an EAS simulator build (no Apple account needed) run in a browser on Appetize.io's free tier,
     a borrowed Mac, or Expo Go on a real iPhone for the phases before ML Kit.
   - Real Android phone: optional, free, any time.
2. **Old data: discarded.** No Firestore migration; the Firebase project is deleted in Phase 7.
3. **Receipt photos: not stored.** Photos stay on the phone; only OCR text is sent to the server.
