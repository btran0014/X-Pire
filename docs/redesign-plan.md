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

## 5c. Product matching and pictures (Phase 6)

A receipt line like "GV 2% MLK GAL" tells us the kind of product, often the brand and size, but rarely the
exact product. Accuracy comes in three levels, and every item gets the best one available:

| Level              | How                                                                             | Result                                                                  |
| ------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1. Exact product   | Barcode scanned with the camera, or a UPC printed on the receipt line           | Exact name, brand, size and the real product photo                      |
| 2. Chosen product  | "Find product": one Open Food Facts search when you tap it, results with photos | You pick the right one                                                  |
| 3. Generic picture | No product                                                                      | A food emoji (from Gemini for receipts, from the name for manual items) |

**Product database: Open Food Facts** (data ODbL, photos CC BY-SA; credited in the app). Facts checked
against the docs and the live API on 2026-11-28:

- Limits: 15 product reads and 10 searches per minute **per IP**; "per user" when calls come from the app.
  So all Open Food Facts calls are made **from the phone**, never from a Supabase function (shared IP).
- Product by barcode: `/api/v2/product/{code}?fields=…` (`status: 1` = found). Full-text search is not in the
  v2/v3 API; it uses Search-a-licious (`search.openfoodfacts.org/search?q=…`), only on an explicit tap.
- Product reads are queued about 4.5 s apart (~13/min). Your own earlier items with the same barcode are
  checked first, so repeat purchases don't call Open Food Facts at all.

**Data model:** product details live on each item (`barcode`, `brand`, `image_url`, `emoji`), not in a shared
cache table, so one user can never change what another sees. The database only accepts photo URLs from
`https://images.openfoodfacts.org/` and barcodes of 8 to 14 digits.

**Flow:** `parse-receipt` also returns `brand`, `size`, `upc` (validated; a dropped check digit is rebuilt) and
`emoji` per line → the review screen looks up printed barcodes (exact match: photo, brand and name filled in)
and offers Scan barcode / Find product / Use generic on every card.

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
- Phase 7: "Save your data" in Settings links the anonymous account to an email address using an emailed
  8-digit code typed into the app (magic links that open the app are unreliable in Expo Go).
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

### Phase 2: Backend ✅

- ✅ Project `X-pire` (us-east-2) created and linked; `.env` filled in.
- ✅ `supabase init` (CLI 3.x writes `supabase/config.jsonc`), schema migration with RLS + `updated_at` trigger,
  pushed with `npm run db:push`; `supabase db lint` clean.
- ✅ pgTAP tests proving one user can't touch another's data (need Docker, so they run in CI).
- ✅ `src/types/database.ts` generated from the live schema (`npm run db:types`).
- 🧑 Enable anonymous sign-ins in the dashboard: Authentication → Sign In / Providers → "Allow anonymous sign-ins".
  (Later, in Phase 7, `config.jsonc` was synced to mirror the hosted project, so `config push` is safe after
  checking `config diff`.)
- ✅ FoodKeeper loaded: `scripts/build-foodkeeper-migration.mjs` turns the USDA JSON (downloaded in a browser;
  the server blocks scripts) into a migration. 1,070 rows / 661 products; 57 rows are advice only
  (e.g. milk: "use the package date"). The raw file is not committed.
- ✅ Supabase MCP connected (not read-only; used for reads only, changes go through migrations).

### Phase 3: Inventory ✅

- ✅ Anonymous sign-in on first launch (session saved in AsyncStorage); retry screen if Supabase is unreachable.
- ✅ Fridge list grouped Expired / Expiring soon / Fresh, storage filter, +/− quantity (− at 1 marks it used up),
  pull to refresh, empty and error states.
- ✅ Add / edit screens: USDA FoodKeeper autocomplete (`search_shelf_life` database function) fills the expiry date
  and keeps it in sync with storage and purchase date until you pick a date yourself; used up / threw out / delete.
- ✅ Tests: date logic, grouping, shelf-life formatting, form validation, quantity rule; pgTAP for the search function;
  live end-to-end check against the project (anonymous sign-in, add, isolation, update, delete).
- 🧑 Try it on your phone in Expo Go.

### Phase 4: Receipt scanning ✅

- ✅ Scan tab: camera / gallery, shrink to 1600 px JPEG, call `parse-receipt`, review screen, batch insert
  linked to the receipt.
- ✅ `parse-receipt` deployed (`npm run functions:deploy`): Gemini `gemini-3.5-flash-lite` via `generateContent`
  (model overridable with the `GEMINI_MODEL` secret), JSON validated, 20 scans/user/hour, 200/day overall,
  FoodKeeper fallback for missing or low-confidence (< 0.5) estimates. Tested live on a sample receipt
  (8/8 items, non-food skipped, ~2.4 s).
- ✅ `GEMINI_API_KEY` set as a Supabase secret.
- ✅ Real receipts scanned on your phone: results look good.

### Phase 5: Reminders ✅

- ✅ Local notifications (work in Expo Go; only remote push needs a development build).
- ✅ Heads-up N days before (default 2) and on the expiry day at a chosen time (default 9:00); items firing
  at the same time are merged into one notification; soonest 60 scheduled (iOS limit is 64).
- ✅ Rescheduled when items or settings change and whenever the app comes to the foreground.
- ✅ Permission asked once, when there are items to remind about; Settings shows status and offers
  "Allow notifications" / "Open phone settings", plus a 10-second test notification.
- ✅ Settings are stored on the device (each phone schedules its own reminders). Web preview: no-op.
- ✅ Test notification arrived on your phone.

### Phase 6: Product matching and pictures ✅

- ✅ Migration: `items.barcode`, `brand`, `image_url` (Open Food Facts images only), `emoji`; pgTAP tests.
- ✅ Open Food Facts client in the app: barcode lookup (own history first, then Open Food Facts, throttled),
  search on tap; barcode check-digit validation and repair; brand clean-up.
- ✅ `parse-receipt` returns brand, size, printed UPC and emoji; Gemini overload (503) retried twice.
  Live: a receipt with 3 printed UPCs (Diet Coke, Chobani, Nutella) came back with all 3 barcodes right.
- ✅ Barcode scanner screen (expo-camera, works in Expo Go) and Find product screen with photos.
- ✅ Review cards, add/edit form and Fridge rows show the product photo or emoji; Open Food Facts credited
  where photos appear and in Settings → Data sources.
- 🧑 Scan a few real barcodes and receipts; tell me which products are missing or wrongly matched.

### Phase 7: Polish ✅

- ✅ Save a guest account to an email (`updateUser` + 8-digit code, `verifyOtp` type `email_change`) so items
  carry over; sign in on another phone (`signInWithOtp`, `shouldCreateUser: false`); sign out starts a fresh
  guest; cached data is cleared whenever the user changes.
- ✅ Delete my data: `delete-account` function deletes only the caller (tested live); items cascade.
- ✅ Export all items to CSV via the share sheet (browser download on web), formula-safe.
- ✅ Friendlier errors for offline / paused server / expired session; dark mode check (no hard-coded colours
  except the white tile behind product photos).
- ✅ App icon, Android adaptive + monochrome icons and splash from the chosen Gemini design
  (visible in real builds; Expo Go shows its own icon).
- ✅ README with setup, run, develop and data-source notes.
- ✅ Deleted 9 empty test guest accounts (your account kept).
- ✅ Custom SMTP (Resend) set up by you; 8-digit code templates pushed with `supabase config push` (the free
  default email provider rejects template edits). `config.jsonc` now mirrors the hosted project.
- 🧑 Try "Save my data to an email" with your Resend sign-up email.

### Phase 8: Cleanup and release (optional)

- 🤖 Merge `redesign` into `main` (with your OK).
- 🧑 Delete the old Firebase project `x-pire-2e0c5` (its data is not migrated).
- Only if other people will use it: custom SMTP for sign-in emails (Supabase's built-in sender allows only a
  few per hour), CAPTCHA on anonymous sign-in, and paid Gemini so receipt photos aren't used for training.
- Only if publishing to stores: real builds (EAS Build, free tier) and store accounts,
  Google Play ($25 one-time) and Apple Developer ($99/year). Not needed for personal use in Expo Go.

## 11. Costs

| Item                        | Cost                                                      |
| --------------------------- | --------------------------------------------------------- |
| Expo Go on your phone       | $0                                                        |
| Supabase free tier          | $0 (project pauses after ~7 days idle; one-click restore) |
| Gemini Flash-Lite free tier | $0 at personal volume                                     |
| Open Food Facts             | $0 (open data; credit photos)                             |
| Expo / EAS free tier        | $0 (only needed for Phase 8)                              |
| Store publishing (optional) | Google Play $25 one-time; Apple $99/year                  |

## 12. Risks

| Risk                                                                                      | Mitigation                                                                                                        |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Expo Go only supports the newest Expo SDK; a new SDK release can stop the project opening | Upgrade the project when Expo Go updates (`npx expo install --fix`); usually a short task                         |
| Gemini misreads blurry or long receipts                                                   | Image shrink keeps text legible (~1600 px); review screen lets you fix anything; prompt tuning in Phase 4         |
| Free Supabase project pauses after ~7 days idle, app shows errors                         | Clear "server asleep" error state; one-click restore; upgrade only if it becomes annoying                         |
| Someone abuses anonymous sign-in to burn the Gemini quota                                 | Per-user rate limit + global daily cap; CAPTCHA before public release                                             |
| Gemini free-tier terms or model names change                                              | Model name in one constant; manual add with FoodKeeper keeps the app usable without AI                            |
| Anonymous users lose data on reinstall                                                    | Account linking in Phase 7; warning in Settings until linked                                                      |
| Product not in Open Food Facts, or no photo                                               | Emoji fallback for every item; barcode scan for exact matches; USDA FoodData Central later if needed              |
| Wrong product auto-matched from a receipt                                                 | Auto-select only on a clear winner; review screen shows the photo and lets you pick or scan instead               |
| Open Food Facts rate limits or downtime                                                   | Calls from the phone (per-user limits), queued ~4.5 s apart, own history checked first; scanning works without it |
| iOS 64 pending-notification limit                                                         | Schedule soonest ~60, reschedule on app open                                                                      |

## 13. Decisions

1. **Testing: Expo Go on your own phone.** No Android Studio, emulator, Xcode or custom builds.
   This is why receipt reading happens server-side with Gemini instead of on-device ML Kit.
   UI work can also be previewed in a browser with `npx expo start --web` (scanning and notifications won't work there).
2. **Old data: discarded.** No Firestore migration; the Firebase project is deleted in Phase 8.
3. **Receipt photos: not stored.** The shrunken photo is sent to the edge function and Gemini for reading, then discarded.
4. **Product data: Open Food Facts**, called from the phone and stored on each item; barcode scan is the only exact path,
   receipt text gives likely matches, emoji is the fallback.
5. **App icon:** generated as several options with Gemini; you pick one in Phase 7.
