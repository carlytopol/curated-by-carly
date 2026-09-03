-- Private Dress my Day, Style Archive, and Wardrobe History persistence.
-- Safe to run more than once in the Supabase SQL editor.

create table if not exists public.daily_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_date date not null,
  starts_at timestamptz,
  title text not null,
  location text,
  dress_code text,
  notes text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  occasion text,
  notes text,
  cover_path text,
  archived_at timestamptz,
  worn_at timestamptz,
  use_as_style_signal boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.outfit_items (
  outfit_id uuid not null references public.outfits(id) on delete cascade,
  clothing_item_id uuid not null references public.clothing_items(id) on delete cascade,
  position integer not null default 0,
  primary key (outfit_id, clothing_item_id)
);

create table if not exists public.outfit_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_event_id uuid not null references public.daily_events(id) on delete cascade,
  outfit_id uuid references public.outfits(id) on delete set null,
  summary text not null,
  rationale text,
  status text not null default 'suggested',
  created_at timestamptz not null default now(),
  selected_at timestamptz,
  worn_at timestamptz
);

create index if not exists daily_events_user_date_position_idx on public.daily_events (user_id, event_date, position);
create index if not exists outfits_user_worn_idx on public.outfits (user_id, worn_at desc);
create index if not exists outfits_user_archived_idx on public.outfits (user_id, archived_at desc);
create index if not exists outfit_recommendations_user_event_idx on public.outfit_recommendations (user_id, daily_event_id);

alter table public.daily_events enable row level security;
alter table public.outfits enable row level security;
alter table public.outfit_items enable row level security;
alter table public.outfit_recommendations enable row level security;

drop policy if exists "Users read their own daily events" on public.daily_events;
create policy "Users read their own daily events" on public.daily_events for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users add their own daily events" on public.daily_events;
create policy "Users add their own daily events" on public.daily_events for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their own daily events" on public.daily_events;
create policy "Users update their own daily events" on public.daily_events for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their own daily events" on public.daily_events;
create policy "Users delete their own daily events" on public.daily_events for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users read their own outfits" on public.outfits;
create policy "Users read their own outfits" on public.outfits for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users add their own outfits" on public.outfits;
create policy "Users add their own outfits" on public.outfits for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their own outfits" on public.outfits;
create policy "Users update their own outfits" on public.outfits for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their own outfits" on public.outfits;
create policy "Users delete their own outfits" on public.outfits for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users read links for their own outfits" on public.outfit_items;
create policy "Users read links for their own outfits" on public.outfit_items for select to authenticated
using (exists (select 1 from public.outfits where outfits.id = outfit_id and outfits.user_id = (select auth.uid())));

drop policy if exists "Users add links to their own outfits" on public.outfit_items;
create policy "Users add links to their own outfits" on public.outfit_items for insert to authenticated
with check (
  exists (select 1 from public.outfits where outfits.id = outfit_id and outfits.user_id = (select auth.uid()))
  and exists (select 1 from public.clothing_items where clothing_items.id = clothing_item_id and clothing_items.user_id = (select auth.uid()))
);

drop policy if exists "Users update links for their own outfits" on public.outfit_items;
create policy "Users update links for their own outfits" on public.outfit_items for update to authenticated
using (exists (select 1 from public.outfits where outfits.id = outfit_id and outfits.user_id = (select auth.uid())))
with check (
  exists (select 1 from public.outfits where outfits.id = outfit_id and outfits.user_id = (select auth.uid()))
  and exists (select 1 from public.clothing_items where clothing_items.id = clothing_item_id and clothing_items.user_id = (select auth.uid()))
);

drop policy if exists "Users delete links for their own outfits" on public.outfit_items;
create policy "Users delete links for their own outfits" on public.outfit_items for delete to authenticated
using (exists (select 1 from public.outfits where outfits.id = outfit_id and outfits.user_id = (select auth.uid())));

drop policy if exists "Users read their own recommendations" on public.outfit_recommendations;
create policy "Users read their own recommendations" on public.outfit_recommendations for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users add their own recommendations" on public.outfit_recommendations;
create policy "Users add their own recommendations" on public.outfit_recommendations for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.daily_events where daily_events.id = daily_event_id and daily_events.user_id = (select auth.uid()))
  and (outfit_id is null or exists (select 1 from public.outfits where outfits.id = outfit_id and outfits.user_id = (select auth.uid())))
);

drop policy if exists "Users update their own recommendations" on public.outfit_recommendations;
create policy "Users update their own recommendations" on public.outfit_recommendations for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.daily_events where daily_events.id = daily_event_id and daily_events.user_id = (select auth.uid()))
  and (outfit_id is null or exists (select 1 from public.outfits where outfits.id = outfit_id and outfits.user_id = (select auth.uid())))
);

drop policy if exists "Users delete their own recommendations" on public.outfit_recommendations;
create policy "Users delete their own recommendations" on public.outfit_recommendations for delete to authenticated
using ((select auth.uid()) = user_id);
