-- Autocomplete for manual item entry: find FoodKeeper products by name or keyword.
-- Runs with the caller's permissions (security invoker), so RLS on shelf_life still applies.
create function public.search_shelf_life(
  query text,
  storage_filter public.storage_location default null,
  max_results int default 8
)
returns setof public.shelf_life
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    -- Escape LIKE wildcards so user input is matched literally.
    select lower(replace(replace(replace(btrim(query), '\', '\\'), '%', '\%'), '_', '\_')) as term
  )
  select s.*
  from public.shelf_life s, q
  where char_length(q.term) >= 2
    and (storage_filter is null or s.storage = storage_filter)
    and (
      lower(s.name) like '%' || q.term || '%'
      or exists (select 1 from unnest(s.keywords) k where k like q.term || '%')
    )
  order by
    lower(s.name) = q.term desc,              -- exact name first
    lower(s.name) like q.term || '%' desc,    -- then names starting with the term
    char_length(s.name),
    s.name,
    s.subtitle nulls first
  limit least(greatest(max_results, 1), 25);
$$;

revoke execute on function public.search_shelf_life(text, public.storage_location, int) from public, anon;
grant execute on function public.search_shelf_life(text, public.storage_location, int) to authenticated;
