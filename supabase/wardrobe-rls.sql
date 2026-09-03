-- Authenticated wardrobe access for the Supabase Data API.
-- Safe to run more than once in the Supabase SQL editor.

alter table public.clothing_items enable row level security;
alter table public.clothing_photos enable row level security;

drop policy if exists "Users read their own wardrobe items" on public.clothing_items;
create policy "Users read their own wardrobe items"
on public.clothing_items for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users add their own wardrobe items" on public.clothing_items;
create policy "Users add their own wardrobe items"
on public.clothing_items for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their own wardrobe items" on public.clothing_items;
create policy "Users update their own wardrobe items"
on public.clothing_items for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their own wardrobe items" on public.clothing_items;
create policy "Users delete their own wardrobe items"
on public.clothing_items for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users read their own wardrobe photos" on public.clothing_photos;
create policy "Users read their own wardrobe photos"
on public.clothing_photos for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users add their own wardrobe photos" on public.clothing_photos;
create policy "Users add their own wardrobe photos"
on public.clothing_photos for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.clothing_items
    where clothing_items.id = clothing_item_id
      and clothing_items.user_id = (select auth.uid())
  )
);

drop policy if exists "Users update their own wardrobe photos" on public.clothing_photos;
create policy "Users update their own wardrobe photos"
on public.clothing_photos for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.clothing_items
    where clothing_items.id = clothing_item_id
      and clothing_items.user_id = (select auth.uid())
  )
);

drop policy if exists "Users delete their own wardrobe photos" on public.clothing_photos;
create policy "Users delete their own wardrobe photos"
on public.clothing_photos for delete to authenticated
using ((select auth.uid()) = user_id);
