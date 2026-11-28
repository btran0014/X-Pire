-- Row Level Security proofs: one user can never see or change another user's data.
-- Run with: npx supabase test db   (needs the local stack: npx supabase db start)
begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

-- Two users. Inserting into auth.users as postgres is how Supabase tests create users.
insert into auth.users (id, email, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.test', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.test', 'authenticated', 'authenticated');

-- A receipt for each user (receipts are written by the edge function, i.e. as postgres/service role).
insert into public.receipts (id, user_id)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222');

insert into public.shelf_life (source_id, name, keywords, storage, min_days, max_days)
values (999999, 'Test item', '{test}', 'fridge', 7, 7);

-- ---------------------------------------------------------------------------
-- Alice
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.items (name, purchased_on, expires_on, receipt_id)
     values ('Milk', '2026-11-27', '2026-12-04', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  'Alice can add an item linked to her own receipt'
);

select is(
  (select user_id from public.items where name = 'Milk'),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'user_id defaults to the signed-in user'
);

select is((select count(*)::int from public.items), 1, 'Alice sees her item');
select is((select count(*)::int from public.receipts), 1, 'Alice sees only her own receipt');
select ok((select count(*) from public.shelf_life) > 1000, 'Alice can read shelf life data (FoodKeeper rows present)');

select throws_ok(
  $$ insert into public.items (user_id, name, purchased_on, expires_on)
     values ('22222222-2222-2222-2222-222222222222', 'Sneaky', '2026-11-27', '2026-12-04') $$,
  '42501', null,
  'Alice cannot create an item owned by Bob'
);

select throws_ok(
  $$ insert into public.items (name, purchased_on, expires_on, receipt_id)
     values ('Eggs', '2026-11-27', '2026-12-20', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') $$,
  '23503', null,
  'Alice cannot link an item to Bob''s receipt'
);

select throws_ok(
  $$ insert into public.receipts default values $$,
  '42501', null,
  'Clients cannot insert receipts (rate limit cannot be bypassed)'
);

select throws_ok(
  $$ delete from public.receipts $$,
  '42501', null,
  'Clients cannot delete receipts'
);

select throws_ok(
  $$ insert into public.shelf_life (source_id, name, storage) values (999998, 'Fake', 'pantry') $$,
  '42501', null,
  'Clients cannot write shelf life data'
);

-- ---------------------------------------------------------------------------
-- Bob
-- ---------------------------------------------------------------------------
set local request.jwt.claims to '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select is((select count(*)::int from public.items), 0, 'Bob cannot see Alice''s items');

select ok(
  (select count(*) from public.search_shelf_life('test')) >= 1,
  'Signed-in users can search shelf life data'
);

-- RLS hides Alice's row from Bob, so these affect 0 rows instead of erroring.
update public.items set name = 'Hacked';
delete from public.items;

-- ---------------------------------------------------------------------------
-- Back to Alice: Bob's update and delete must have changed nothing.
-- ---------------------------------------------------------------------------
set local request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is((select name from public.items), 'Milk', 'Bob''s update did not touch Alice''s item');
select is((select count(*)::int from public.items), 1, 'Bob''s delete did not remove Alice''s item');

select throws_ok(
  $$ update public.items set user_id = '22222222-2222-2222-2222-222222222222' $$,
  '42501', null,
  'Alice cannot hand her item to Bob'
);

select lives_ok(
  $$ update public.items set quantity = 2 $$,
  'Alice can update her own item'
);

select has_trigger('public', 'items', 'items_set_updated_at', 'items has the updated_at trigger');

select throws_ok(
  $$ update public.items set quantity = 0 $$,
  '23514', null,
  'Quantity must be at least 1'
);

select throws_ok(
  $$ insert into public.items (name, purchased_on, expires_on) values ('   ', '2026-11-27', '2026-12-04') $$,
  '23514', null,
  'Blank names are rejected'
);

-- ---------------------------------------------------------------------------
-- Not signed in (anon role): no access at all.
-- ---------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims to '{"role": "anon"}';

select throws_ok($$ select * from public.items $$, '42501', null, 'anon cannot read items');
select throws_ok($$ select * from public.shelf_life $$, '42501', null, 'anon cannot read shelf life');
select throws_ok(
  $$ select * from public.search_shelf_life('milk') $$,
  '42501', null,
  'anon cannot call search_shelf_life'
);
select throws_ok(
  $$ insert into public.items (name, purchased_on, expires_on) values ('x', '2026-11-27', '2026-12-04') $$,
  '42501', null,
  'anon cannot add items'
);

-- ---------------------------------------------------------------------------
-- Account deletion cascades (what the delete-account function relies on).
-- ---------------------------------------------------------------------------
reset role;

delete from auth.users where id = '11111111-1111-1111-1111-111111111111';

select is(
  (select count(*)::int from public.items where user_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'Deleting a user deletes their items'
);

select * from finish();
rollback;
