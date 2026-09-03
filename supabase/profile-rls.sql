-- Private measurements and style profile for the Supabase Data API.
-- Safe to run more than once in the Supabase SQL editor.

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text,
  location_name text,
  latitude double precision,
  longitude double precision,
  measurement_unit text not null default 'imperial',
  height_cm double precision,
  weight_kg double precision,
  bust_cm double precision,
  underbust_cm double precision,
  waist_cm double precision,
  hips_cm double precision,
  thigh_cm double precision,
  bodice_length_front_cm double precision,
  sleeve_length_cm double precision,
  pant_length_cm double precision,
  inseam_cm double precision,
  shoulder_width_cm double precision,
  top_size text,
  bottom_size text,
  dress_size text,
  shoe_size text,
  proportions text,
  fit_notes text,
  style_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_measurement_unit_check
    check (measurement_unit in ('imperial', 'metric'))
);

-- Bring an existing profile table forward if it predates detailed measurements.
alter table public.user_profiles add column if not exists display_name text;
alter table public.user_profiles add column if not exists timezone text;
alter table public.user_profiles add column if not exists location_name text;
alter table public.user_profiles add column if not exists latitude double precision;
alter table public.user_profiles add column if not exists longitude double precision;
alter table public.user_profiles add column if not exists measurement_unit text not null default 'imperial';
alter table public.user_profiles add column if not exists height_cm double precision;
alter table public.user_profiles add column if not exists weight_kg double precision;
alter table public.user_profiles add column if not exists bust_cm double precision;
alter table public.user_profiles add column if not exists underbust_cm double precision;
alter table public.user_profiles add column if not exists waist_cm double precision;
alter table public.user_profiles add column if not exists hips_cm double precision;
alter table public.user_profiles add column if not exists thigh_cm double precision;
alter table public.user_profiles add column if not exists bodice_length_front_cm double precision;
alter table public.user_profiles add column if not exists sleeve_length_cm double precision;
alter table public.user_profiles add column if not exists pant_length_cm double precision;
alter table public.user_profiles add column if not exists inseam_cm double precision;
alter table public.user_profiles add column if not exists shoulder_width_cm double precision;
alter table public.user_profiles add column if not exists top_size text;
alter table public.user_profiles add column if not exists bottom_size text;
alter table public.user_profiles add column if not exists dress_size text;
alter table public.user_profiles add column if not exists shoe_size text;
alter table public.user_profiles add column if not exists proportions text;
alter table public.user_profiles add column if not exists fit_notes text;
alter table public.user_profiles add column if not exists style_notes text;
alter table public.user_profiles add column if not exists created_at timestamptz not null default now();
alter table public.user_profiles add column if not exists updated_at timestamptz not null default now();

alter table public.user_profiles enable row level security;

drop policy if exists "Users read their own profile" on public.user_profiles;
create policy "Users read their own profile"
on public.user_profiles for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users add their own profile" on public.user_profiles;
create policy "Users add their own profile"
on public.user_profiles for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their own profile" on public.user_profiles;
create policy "Users update their own profile"
on public.user_profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their own profile" on public.user_profiles;
create policy "Users delete their own profile"
on public.user_profiles for delete to authenticated
using ((select auth.uid()) = user_id);
