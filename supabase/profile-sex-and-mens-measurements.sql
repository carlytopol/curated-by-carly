alter table public.user_profiles
  add column if not exists sex text not null default 'female',
  add column if not exists shoe_size_system text not null default 'US',
  add column if not exists male_measurements jsonb not null default '{}'::jsonb;

update public.user_profiles
set sex = 'female'
where sex not in ('female', 'male');

alter table public.user_profiles
  drop constraint if exists user_profiles_sex_check;
alter table public.user_profiles
  add constraint user_profiles_sex_check check (sex in ('female', 'male'));

alter table public.user_profiles
  drop constraint if exists user_profiles_shoe_size_system_check;
alter table public.user_profiles
  add constraint user_profiles_shoe_size_system_check check (shoe_size_system in ('US', 'EU'));
