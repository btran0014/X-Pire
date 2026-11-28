-- X-Pire core schema: items, receipts, shelf-life reference data.
-- Every user-owned table has Row Level Security; see supabase/tests for proofs.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.storage_location as enum ('fridge', 'freezer', 'pantry');
create type public.item_status as enum ('active', 'consumed', 'discarded');
create type public.expiry_source as enum ('ai', 'foodkeeper', 'manual');

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- receipts: one row per scan. Written only by the parse-receipt edge function
-- (service role); used for per-user rate limiting and to group items.
-- ---------------------------------------------------------------------------
create table public.receipts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  scanned_at timestamptz not null default now(),
  item_count int not null default 0 check (item_count >= 0),
  -- Lets items reference (receipt id, owner) so an item can only point at its owner's receipt.
  unique (id, user_id)
);

create index receipts_user_scanned_idx on public.receipts (user_id, scanned_at desc);

comment on table public.receipts is 'One row per receipt scan. Inserted by the parse-receipt edge function only.';

-- ---------------------------------------------------------------------------
-- items: what's in the user's fridge / freezer / pantry
-- ---------------------------------------------------------------------------
create table public.items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null check (char_length(btrim(name)) between 1 and 100),
  quantity      int not null default 1 check (quantity between 1 and 999),
  storage       public.storage_location not null default 'fridge',
  -- Calendar dates in the user's local time zone, sent by the app (server current_date is UTC).
  purchased_on  date not null,
  expires_on    date not null,
  expiry_source public.expiry_source not null default 'manual',
  confidence    real check (confidence is null or confidence between 0 and 1),
  status        public.item_status not null default 'active',
  receipt_id    uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  foreign key (receipt_id, user_id) references public.receipts (id, user_id)
    on delete set null (receipt_id)
);

create index items_user_status_expires_idx on public.items (user_id, status, expires_on);
create index items_receipt_idx on public.items (receipt_id) where receipt_id is not null;

create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

comment on table public.items is 'Food items a user is tracking. Consumed/discarded items are kept for stats.';

-- ---------------------------------------------------------------------------
-- shelf_life: USDA FoodKeeper reference data (read-only for clients).
-- One row per product per storage location.
-- ---------------------------------------------------------------------------
create table public.shelf_life (
  id         int generated always as identity primary key,
  source_id  int not null,                 -- FoodKeeper product id
  category   text,
  name       text not null,
  subtitle   text,
  keywords   text[] not null default '{}',
  storage    public.storage_location not null,
  min_days   int check (min_days is null or min_days >= 0),
  max_days   int check (max_days is null or max_days >= 0),
  tips       text,
  unique (source_id, storage)
);

create index shelf_life_keywords_idx on public.shelf_life using gin (keywords);

comment on table public.shelf_life is 'USDA FSIS FoodKeeper storage times (CC0). Durations converted to days.';

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.items enable row level security;
alter table public.receipts enable row level security;
alter table public.shelf_life enable row level security;

-- items: full CRUD on your own rows only. Signed-in users (including anonymous
-- sign-ins) have the `authenticated` role; `anon` (no session) gets nothing.
create policy "Users can read their own items"
  on public.items for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own items"
  on public.items for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own items"
  on public.items for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own items"
  on public.items for delete to authenticated
  using ((select auth.uid()) = user_id);

-- receipts: read your own; no client writes (the edge function uses the service role).
create policy "Users can read their own receipts"
  on public.receipts for select to authenticated
  using ((select auth.uid()) = user_id);

-- shelf_life: readable by any signed-in user; no client writes.
create policy "Signed-in users can read shelf life data"
  on public.shelf_life for select to authenticated
  using (true);

-- Belt and braces: remove table privileges clients should never use, so a future
-- permissive policy can't accidentally open writes.
revoke all on public.items, public.receipts, public.shelf_life from anon;
revoke insert, update, delete, truncate on public.receipts, public.shelf_life from authenticated;
revoke truncate on public.items from authenticated;
