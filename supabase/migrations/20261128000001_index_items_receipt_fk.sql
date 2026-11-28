-- The items -> receipts foreign key is on (receipt_id, user_id); index both columns so
-- deleting a receipt or user doesn't scan items (flagged by Supabase's performance advisor).
drop index if exists public.items_receipt_idx;

create index items_receipt_user_idx on public.items (receipt_id, user_id)
  where receipt_id is not null;
