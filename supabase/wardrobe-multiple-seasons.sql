-- Allow a wardrobe piece to be tagged for as many as three distinct seasons.
alter table public.clothing_items
  add column if not exists season_2 text,
  add column if not exists season_3 text;
