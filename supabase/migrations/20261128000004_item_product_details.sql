-- Product details for items (Phase 6): exact product from a barcode / Open Food Facts,
-- or just an emoji when the product isn't known. Stored per item (no shared product cache),
-- so one user can never change what another user sees.
alter table public.items
  add column barcode text check (barcode is null or barcode ~ '^[0-9]{8,14}$'),
  add column brand text check (brand is null or char_length(brand) <= 100),
  add column image_url text check (
    image_url is null
    or (char_length(image_url) <= 500 and image_url like 'https://images.openfoodfacts.org/%')
  ),
  add column emoji text check (emoji is null or char_length(emoji) <= 16);

comment on column public.items.barcode is 'GTIN/UPC/EAN of the exact product, when known.';
comment on column public.items.image_url is 'Open Food Facts product photo (CC BY-SA), when known.';
comment on column public.items.emoji is 'Generic picture when there is no product photo.';

-- Repeat purchases: find the user's earlier item with the same barcode quickly.
create index items_user_barcode_idx on public.items (user_id, barcode) where barcode is not null;
